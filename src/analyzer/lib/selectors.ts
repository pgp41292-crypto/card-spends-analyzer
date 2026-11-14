/* Pure derivations. Every number on screen comes through here, from the store's persona data. */
import type { Card, CategoryId, CategoryLimit, PersonaData, Transaction } from '../types.ts';
import { DAYS_LEFT, DEMO_MONTH, PREV_MONTH, TODAY } from './clock.ts';
import { monthKey } from './rewards.ts';

export const sumAmount = (txns: Transaction[]) => txns.reduce((s, t) => s + t.amount, 0);

export const inMonth = (txns: Transaction[], month: string, cardId?: string) =>
  txns.filter((t) => monthKey(t.timestamp) === month && (!cardId || t.cardId === cardId));

export const cardById = (cards: Card[], id: string) => cards.find((c) => c.id === id);

export function spendByCategory(txns: Transaction[]) {
  const out: Partial<Record<CategoryId, number>> = {};
  for (const t of txns) out[t.category] = (out[t.category] ?? 0) + t.amount;
  return out;
}

/** F1 top summary: this month to date vs the same days of last month. */
export function monthSummary(txns: Transaction[], cardId?: string) {
  const thisMonth = sumAmount(inMonth(txns, DEMO_MONTH, cardId));
  const lastMonthSameDay = sumAmount(inMonth(txns, PREV_MONTH, cardId).filter((t) => Number(t.timestamp.slice(8, 10)) <= TODAY));
  return { thisMonth, lastMonthSameDay, diff: thisMonth - lastMonthSameDay };
}

/** F4: spend counted against a limit (shared spends I'll get back are excluded when the toggle is on). */
export function limitSpend(limit: CategoryLimit, txns: Transaction[]) {
  return inMonth(txns, DEMO_MONTH)
    .filter((t) => t.category === limit.category)
    .reduce((s, t) => s + t.amount - (limit.excludeShared ? t.recoverableAmount ?? 0 : 0), 0);
}

export function limitStatus(limit: CategoryLimit, txns: Transaction[]) {
  const spent = limitSpend(limit, txns);
  const pct = limit.monthlyLimit > 0 ? (spent / limit.monthlyLimit) * 100 : 0;
  const remaining = limit.monthlyLimit - spent;
  return {
    ...limit,
    spent,
    pct,
    remaining,
    daysLeft: DAYS_LEFT,
    dailyAllowance: Math.max(0, Math.floor(remaining / Math.max(1, DAYS_LEFT))),
    level: pct >= 100 ? 100 : pct >= 80 ? 80 : 0,
  };
}

export const limitsAtRisk = (d: PersonaData) =>
  d.limits.map((l) => limitStatus(l, d.transactions)).filter((s) => s.pct >= 80).sort((a, b) => b.pct - a.pct);

/** F8: total reward value across cards (points × value). */
export const totalRewardValue = (cards: Card[]) => Math.round(cards.reduce((s, c) => s + c.pointsBalance * c.pointValueInr, 0));

export function expiryValueInr(e: PersonaData['benefits']['expiries'][number], cards: Card[]) {
  if (e.kind === 'voucher') return e.value;
  const c = cardById(cards, e.cardId);
  return Math.round(e.value * (c?.pointValueInr ?? 0));
}

/** "HDFC Millennia (sample)" — without repeating the issuer when the name already starts with it. */
export const cardTitle = (c: Pick<Card, 'issuer' | 'name'>) => (c.name.startsWith(c.issuer) ? c.name : `${c.issuer} ${c.name}`);
