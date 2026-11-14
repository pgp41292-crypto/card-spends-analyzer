import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CategoryId } from '../types';

/** What the F5 checkout sheet opens with (QR scan, deal "Pay at store"). */
export interface CheckoutInit {
  merchant: string; rawDescriptor: string; category: CategoryId; amount: number;
  preselectCardId?: string; discountPct?: number; dealLabel?: string;
}

export type ToastTone = 'info' | 'success' | 'warning' | 'danger';
export interface ToastMsg { id: number; title: string; body?: string; to?: string; tone?: ToastTone }

interface UIState {
  toasts: ToastMsg[];
  toast: (t: Omit<ToastMsg, 'id'>) => void;
  dismiss: (id: number) => void;
  comingSoon: (what?: string) => void;
  onboarded: boolean;
  setOnboarded: (v: boolean) => void;
  demoOpen: boolean;
  setDemoOpen: (v: boolean) => void;
  /** Onboarding choices (Flow A). */
  cardsLinked: boolean;
  sources: { sms: boolean; statement: boolean; manual: boolean };
  completeOnboarding: (cardsLinked: boolean, sources: UIState['sources']) => void;
  setSource: (k: keyof UIState['sources'], v: boolean) => void;
  checkout: CheckoutInit | null;
  openCheckout: (c: CheckoutInit) => void;
  closeCheckout: () => void;
  /** F6 per-tip state; F3 bill reminders by card id. */
  tipState: Record<string, 'tried' | 'reported'>;
  setTipState: (id: string, v: 'tried' | 'reported') => void;
  reminders: string[];
  toggleReminder: (cardId: string) => boolean;
}

let seq = 1;

/** UI-only state (toasts, panels, onboarding flag). Data state arrives in Phase 2. */
export const useUI = create<UIState>()(
  persist(
    (set, get) => ({
      toasts: [],
      toast: (t) => set((s) => ({ toasts: [...s.toasts.slice(-2), { ...t, id: seq++ }] })),
      dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
      comingSoon: (what) =>
        set((s) => ({ toasts: [...s.toasts.slice(-2), { id: seq++, title: 'Coming soon', body: what, tone: 'info' }] })),
      onboarded: false,
      setOnboarded: (v) => set({ onboarded: v }),
      demoOpen: false,
      setDemoOpen: (v) => set({ demoOpen: v }),
      cardsLinked: true,
      sources: { sms: false, statement: false, manual: false },
      completeOnboarding: (cardsLinked, sources) => set({ onboarded: true, cardsLinked, sources }),
      setSource: (k, v) => set((s) => ({ sources: { ...s.sources, [k]: v } })),
      checkout: null,
      openCheckout: (c) => set({ checkout: c, demoOpen: false }),
      closeCheckout: () => set({ checkout: null }),
      tipState: {},
      setTipState: (id, v) => set((s) => ({ tipState: { ...s.tipState, [id]: v } })),
      reminders: [],
      toggleReminder: (cardId) => {
        const on = !get().reminders.includes(cardId);
        set((s) => ({ reminders: on ? [...s.reminders, cardId] : s.reminders.filter((x) => x !== cardId) }));
        return on;
      },
    }),
    { name: 'csa-ui', partialize: (s) => ({ onboarded: s.onboarded, cardsLinked: s.cardsLinked, sources: s.sources, tipState: s.tipState, reminders: s.reminders }) },
  ),
);
