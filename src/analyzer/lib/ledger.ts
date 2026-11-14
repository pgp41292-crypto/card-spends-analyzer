/* Pure state transitions on one persona's data. The store calls these; scripts/check-ledger.ts tests them. */
import type { CategoryId, CategoryLimit, PersonaData, Transaction } from '../types.ts';
import { DEMO_NOW } from './clock.ts';
import { scoreTransaction } from './rewards.ts';

export interface NewTxnInput {
  cardId: string; amount: number; category: CategoryId; rawDescriptor: string;
  merchantDisplayName?: string; source?: Transaction['source'];
  isShared?: boolean; circleId?: string; recoverableAmount?: number;
}

const IST_MS = 5.5 * 3600 * 1000;
/** One minute after the later of the demo clock and the newest transaction, in IST. */
export function nextTimestamp(txns: Transaction[]) {
  const latest = Math.max(Date.parse(DEMO_NOW), ...txns.map((t) => Date.parse(t.timestamp)));
  return new Date(latest + 60_000 + IST_MS).toISOString().slice(0, 19) + '+05:30';
}

/** Add a payment: score rewards, then move every number that depends on it (balance, milestones, spend conditions). */
export function applyTransaction(d: PersonaData, input: NewTxnInput, id: string): { data: PersonaData; txn: Transaction } {
  const timestamp = nextTimestamp(d.transactions);
  const day = timestamp.slice(0, 10);
  const txn = scoreTransaction(
    {
      id, timestamp, source: 'paytm', merchantSource: input.merchantDisplayName ? 'paytm_network' : 'unresolved',
      confidence: input.merchantDisplayName ? 0.96 : 0.5, ...input,
    },
    d.cards,
    d.transactions,
  );
  const amt = txn.amount;
  return {
    txn,
    data: {
      ...d,
      transactions: [txn, ...d.transactions],
      cards: d.cards.map((c) => (c.id === txn.cardId ? { ...c, outstanding: c.outstanding + amt } : c)),
      benefits: {
        ...d.benefits,
        milestones: d.benefits.milestones.map((m) => (m.cardId === txn.cardId && m.deadline >= day ? { ...m, progress: m.progress + amt } : m)),
        benefits: d.benefits.benefits.map((b) =>
          b.cardId === txn.cardId && b.condition && b.condition.periodEnd >= day
            ? { ...b, condition: { ...b.condition, spendSoFar: b.condition.spendSoFar + amt } }
            : b,
        ),
      },
    },
  };
}

/** F2 "Fix category": user corrections are trusted and marked as such. */
export function applyCorrection(d: PersonaData, id: string, patch: { category?: CategoryId; merchantDisplayName?: string }): PersonaData {
  return {
    ...d,
    transactions: d.transactions.map((t) =>
      t.id === id
        ? {
            ...t,
            ...(patch.category ? { category: patch.category } : {}),
            ...(patch.merchantDisplayName?.trim() ? { merchantDisplayName: patch.merchantDisplayName.trim() } : {}),
            merchantSource: 'user_corrected',
            confidence: 1,
          }
        : t,
    ),
  };
}

export function applyLimit(d: PersonaData, category: CategoryId, patch: Partial<Omit<CategoryLimit, 'category'>>): PersonaData {
  const exists = d.limits.some((l) => l.category === category);
  return {
    ...d,
    limits: exists
      ? d.limits.map((l) => (l.category === category ? { ...l, ...patch } : l))
      : [...d.limits, { category, monthlyLimit: patch.monthlyLimit ?? 0, excludeShared: patch.excludeShared ?? true }],
  };
}

/* ---------- F7 Credit Circle ---------- */
type Circle = PersonaData['circles']['circles'][number];
const mapCircle = (d: PersonaData, id: string, f: (c: Circle) => Circle): PersonaData => ({
  ...d, circles: { ...d.circles, circles: d.circles.circles.map((c) => (c.id === id ? f(c) : c)) },
});

export function applyCreateCircle(d: PersonaData, circle: Circle, offers: PersonaData['circles']['memberCardOffers'] = []): PersonaData {
  return { ...d, circles: { circles: [circle, ...d.circles.circles], memberCardOffers: [...d.circles.memberCardOffers, ...offers] } };
}

export interface NewSplit {
  title: string; category: CategoryId; amount: number; payerId: string; memberIds: string[];
  cardId?: string;          // when you pay: which of your cards
  existingTxnId?: string;   // when tagging an existing spend as shared
}

/** Equal split. If you pay, your feed gets a Shared spend whose recoverable part F4 limits can exclude. */
export function applyCreateSplit(d: PersonaData, circleId: string, self: string, s: NewSplit, id: string): { data: PersonaData; txn?: Transaction } {
  const n = s.memberIds.length;
  const per = Math.floor(s.amount / n);
  const shares = s.memberIds.map((m) => ({ memberId: m, amount: per + (m === s.payerId ? s.amount - per * n : 0), settled: m === s.payerId }));
  const selfShare = shares.find((x) => x.memberId === self)?.amount ?? 0;
  const recoverable = s.payerId === self ? s.amount - selfShare : 0;
  const day = nextTimestamp(d.transactions).slice(0, 10);
  let data = mapCircle(d, circleId, (c) => ({
    ...c,
    monthlyPaidForOthers: c.monthlyPaidForOthers + recoverable,
    splits: [{ id: `s_${id}`, title: s.title, category: s.category, amount: s.amount, payerId: s.payerId, shares, date: day, confirmedBy: [self] }, ...c.splits],
  }));
  if (s.payerId !== self) return { data };
  if (s.existingTxnId) {
    data = { ...data, transactions: data.transactions.map((t) => (t.id === s.existingTxnId ? { ...t, isShared: true, circleId, recoverableAmount: recoverable } : t)) };
    return { data };
  }
  return applyTransaction(data, {
    cardId: s.cardId!, amount: s.amount, category: s.category, rawDescriptor: `PYTM*${s.title.toUpperCase().slice(0, 22)}`,
    merchantDisplayName: s.title, source: 'paytm', isShared: true, circleId, recoverableAmount: recoverable,
  }, id);
}

export const applyConfirmSplit = (d: PersonaData, circleId: string, splitId: string) =>
  mapCircle(d, circleId, (c) => ({ ...c, splits: c.splits.map((s) => (s.id === splitId ? { ...s, confirmedBy: s.shares.map((x) => x.memberId) } : s)) }));

export const applySettle = (d: PersonaData, circleId: string, splitId: string, memberId: string) =>
  mapCircle(d, circleId, (c) => ({
    ...c,
    splits: c.splits.map((s) => (s.id === splitId ? { ...s, shares: s.shares.map((x) => (x.memberId === memberId ? { ...x, settled: true } : x)) } : s)),
  }));

export const applyCircleFlag = (d: PersonaData, circleId: string, paused: boolean) => mapCircle(d, circleId, (c) => ({ ...c, pausedForReview: paused }));

/* ---------- F10 merchant preview ---------- */
export const applyAddDeal = (d: PersonaData, deal: PersonaData['offers']['deals'][number]): PersonaData =>
  ({ ...d, offers: { ...d.offers, deals: [deal, ...d.offers.deals] } });
