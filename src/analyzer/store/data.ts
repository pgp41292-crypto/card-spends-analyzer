/* The one shared data store (PRD: "One shared state store"). Seeds from /src/data/<persona>/*.json,
   persists edits to localStorage, and exposes actions that every screen and the Demo panel use. */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import personasJson from '../../data/personas.json';
import type { CategoryId, CategoryLimit, Persona, PersonaData, PersonaId, Transaction } from '../types';
import {
  applyAddDeal, applyCircleFlag, applyConfirmSplit, applyCorrection, applyCreateCircle, applyCreateSplit, applyLimit, applySettle, applyTransaction,
  type NewSplit, type NewTxnInput,
} from '../lib/ledger';
import { selfId } from '../lib/circles';
import type { Circle, Deal, MemberCardOffer } from '../types';
import { newLimitAlerts } from '../lib/alerts';
import { CATEGORIES } from '../lib/categories';
import { DAYS_LEFT } from '../lib/clock';
import { inr, p } from '../lib/paths';
import { useUI } from './ui';

export const PERSONAS = personasJson as Persona[];

/* Load all 8 files per persona at build time. */
const files = import.meta.glob('../../data/*/*.json', { eager: true, import: 'default' }) as Record<string, unknown>;
function seedFor(id: PersonaId): PersonaData {
  const get = (name: string) => structuredClone(files[`../../data/${id}/${name}.json`]);
  return {
    cards: get('cards'), transactions: get('transactions'), limits: get('limits'), benefits: get('benefits'),
    charges: get('charges'), tips: get('tips'), circles: get('circles'), offers: get('offers'),
  } as PersonaData;
}
const seedAll = (): Record<PersonaId, PersonaData> => ({ neha: seedFor('neha'), arjun: seedFor('arjun'), karan: seedFor('karan') });
/** Changes whenever the generated JSON changes, so stale localStorage is discarded after a regenerate. */
const SEED_SIG = String(JSON.stringify(files).length);

interface DataState {
  persona: PersonaId;
  byPersona: Record<PersonaId, PersonaData>;
  /** F4: alert keys already fired, `${persona}:${category}:${level}`, so thresholds fire once per level. */
  firedAlerts: string[];
  /** F1: id of the row to highlight for 1 second after a simulated payment (not persisted). */
  highlightId?: string;
  liveSeq: number;

  setPersona: (p: PersonaId) => void;
  resetData: () => void;
  addTransaction: (input: NewTxnInput) => Transaction;
  correctTransaction: (id: string, patch: { category?: CategoryId; merchantDisplayName?: string }) => void;
  setLimit: (category: CategoryId, patch: Partial<Omit<CategoryLimit, 'category'>>) => void;
  markAlert: (key: string) => void;
  createCircle: (c: Circle, offers?: MemberCardOffer[]) => void;
  createSplit: (circleId: string, s: NewSplit) => string;
  confirmSplit: (circleId: string, splitId: string) => void;
  settleShare: (circleId: string, splitId: string, memberId: string) => void;
  setCircleFlag: (circleId: string, paused: boolean) => void;
  addDeal: (deal: Deal) => void;
  clearHighlight: () => void;
}

export const useStore = create<DataState>()(
  persist(
    (set, get) => {
      /** Save new persona data, then fire any F4 limit alerts the change caused (once per level). */
      const commit = (prev: PersonaData, next: PersonaData, extra: Partial<DataState> = {}) => {
        const { persona, byPersona, firedAlerts } = get();
        const alerts = newLimitAlerts(persona, prev, next, firedAlerts);
        set({ ...extra, byPersona: { ...byPersona, [persona]: next }, firedAlerts: [...firedAlerts, ...alerts.map((a) => a.key)] });
        for (const a of alerts) {
          const name = CATEGORIES[a.category].short;
          useUI.getState().toast({
            tone: a.level === 100 ? 'danger' : 'warning',
            title: a.level === 100 ? `You've gone over your ${name} limit` : `You've used ${Math.round(a.pct)}% of your ${name} limit with ${DAYS_LEFT} days left`,
            body: `${inr(a.spent)} of ${inr(a.limit)} this month`,
            to: `${p('/spends/limits')}?cat=${a.category}`,
          });
        }
      };
      return {
      persona: 'neha',
      byPersona: seedAll(),
      firedAlerts: [],
      liveSeq: 1,

      setPersona: (persona) => set({ persona }),
      resetData: () => set({ byPersona: seedAll(), firedAlerts: [], liveSeq: 1, highlightId: undefined }),

      addTransaction: (input) => {
        const { persona, byPersona, liveSeq } = get();
        const { data, txn } = applyTransaction(byPersona[persona], input, `t_live_${liveSeq}`);
        commit(byPersona[persona], data, { liveSeq: liveSeq + 1, highlightId: txn.id });
        window.setTimeout(() => get().highlightId === txn.id && set({ highlightId: undefined }), 1000);
        return txn;
      },
      correctTransaction: (id, patch) => {
        const { persona, byPersona } = get();
        commit(byPersona[persona], applyCorrection(byPersona[persona], id, patch));
      },
      setLimit: (category, patch) => {
        const { persona, byPersona } = get();
        commit(byPersona[persona], applyLimit(byPersona[persona], category, patch));
      },
      createCircle: (c, offers) => {
        const { persona, byPersona } = get();
        commit(byPersona[persona], applyCreateCircle(byPersona[persona], c, offers));
      },
      createSplit: (circleId, sp) => {
        const { persona, byPersona, liveSeq } = get();
        const id = `t_live_${liveSeq}`;
        const { data, txn } = applyCreateSplit(byPersona[persona], circleId, selfId(persona), sp, id);
        commit(byPersona[persona], data, { liveSeq: liveSeq + 1, ...(txn ? { highlightId: txn.id } : {}) });
        if (txn) window.setTimeout(() => get().highlightId === txn.id && set({ highlightId: undefined }), 1000);
        return `s_${id}`;
      },
      confirmSplit: (circleId, splitId) => {
        const { persona, byPersona } = get();
        commit(byPersona[persona], applyConfirmSplit(byPersona[persona], circleId, splitId));
      },
      settleShare: (circleId, splitId, memberId) => {
        const { persona, byPersona } = get();
        commit(byPersona[persona], applySettle(byPersona[persona], circleId, splitId, memberId));
      },
      setCircleFlag: (circleId, paused) => {
        const { persona, byPersona } = get();
        commit(byPersona[persona], applyCircleFlag(byPersona[persona], circleId, paused));
      },
      addDeal: (deal) => {
        const { persona, byPersona } = get();
        commit(byPersona[persona], applyAddDeal(byPersona[persona], deal));
      },
      markAlert: (key) => set((s) => ({ firedAlerts: s.firedAlerts.includes(key) ? s.firedAlerts : [...s.firedAlerts, key] })),
      clearHighlight: () => set({ highlightId: undefined }),
    };
    },
    {
      name: 'csa-data',
      version: 1,
      partialize: ({ persona, byPersona, firedAlerts, liveSeq }) => ({ persona, byPersona, firedAlerts, liveSeq, seedSig: SEED_SIG }),
      merge: (persisted, current) => {
        const p = persisted as Partial<DataState> & { seedSig?: string };
        return p?.seedSig === SEED_SIG ? { ...current, ...p } : current;
      },
    },
  ),
);

/** Current persona's data. */
export const useData = () => useStore((s) => s.byPersona[s.persona]);
export const usePersona = () => {
  const id = useStore((s) => s.persona);
  return PERSONAS.find((p) => p.id === id)!;
};
