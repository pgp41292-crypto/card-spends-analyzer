/* F7 Credit Circle helpers: balances, guardrails, "Who should pay?" ranking. */
import type { CategoryId, Circle, PersonaData, PersonaId } from '../types.ts';
import { DEMO_MONTH } from './clock.ts';
import { quote } from './rewards.ts';

export const selfId = (persona: PersonaId) => `m_${persona}`;
export type Split = Circle['splits'][number];

/** Split categories offered in the UI. Cash-like ones are blocked (guardrail). */
export const SPLIT_CATEGORIES: { id: string; label: string; category?: CategoryId; blocked?: boolean }[] = [
  { id: 'dining', label: 'Dining', category: 'food' },
  { id: 'travel', label: 'Travel', category: 'travel' },
  { id: 'bookings', label: 'Bookings', category: 'travel' },
  { id: 'events', label: 'Events', category: 'entertainment' },
  { id: 'electronics', label: 'Electronics', category: 'shopping' },
  { id: 'groceries', label: 'Groceries', category: 'groceries' },
  { id: 'household_bills', label: 'Household bills', category: 'bills' },
  { id: 'wallet', label: 'Wallet load', blocked: true },
  { id: 'gift_cards', label: 'Gift cards', blocked: true },
  { id: 'prepaid', label: 'Prepaid cards', blocked: true },
];

/** What the signed-in persona is owed / owes in a circle. */
export function balances(c: Circle, self: string) {
  let owed = 0, owe = 0;
  for (const s of c.splits)
    for (const sh of s.shares) {
      if (sh.settled) continue;
      if (s.payerId === self && sh.memberId !== self) owed += sh.amount;
      if (s.payerId !== self && sh.memberId === self) owe += sh.amount;
    }
  return { owed, owe };
}

export const memberName = (c: Circle, id: string) => c.members.find((m) => m.id === id)?.name.replace(' (you)', '') ?? id;

export interface PayerOption { memberId: string; name: string; cardName: string; saving: number; ratePct: number; note: string; isSelf: boolean; cardId?: string }

/** Rank members by the best reward or offer on their cards. Your own cards use their real reward rules and caps. */
export function whoShouldPay(c: Circle, d: PersonaData, persona: PersonaId, category: CategoryId, amount: number): PayerOption[] {
  const self = selfId(persona);
  const out: PayerOption[] = [];
  for (const m of c.members) {
    if (m.id === self) {
      for (const card of d.cards) {
        const q = quote(card, category, amount, d.transactions, DEMO_MONTH);
        out.push({ memberId: m.id, name: 'You', cardName: `${card.issuer} ${card.name.replace(' (sample)', '')}`, saving: q.reward, ratePct: q.effectivePct,
          note: q.excluded ? 'Category excluded' : q.capLimited ? 'Limited by your monthly cap' : `${q.ratePct}% rewards`, isSelf: true, cardId: card.id });
      }
      continue;
    }
    const offers = d.circles.memberCardOffers.filter((o) => o.memberId === m.id && o.category === category);
    if (!offers.length) {
      out.push({ memberId: m.id, name: memberName(c, m.id), cardName: m.cards.map((x) => `${x.issuer} ${x.name}`).join(', '), saving: 0, ratePct: 0, note: 'No offer for this category', isSelf: false });
    }
    for (const o of offers) {
      const saving = Math.round(Math.min((amount * o.ratePct) / 100, o.maxSaving ?? Infinity));
      out.push({ memberId: m.id, name: memberName(c, m.id), cardName: o.cardName, saving, ratePct: amount ? (saving / amount) * 100 : 0, note: o.note, isSelf: false });
    }
  }
  return out.sort((a, b) => b.saving - a.saving);
}

/** Family add-on nudge: someone paid 3+ family purchases this month. */
export function addOnNudge(c: Circle, self: string) {
  if (c.type !== 'family') return null;
  const counts = new Map<string, number>();
  for (const s of c.splits) if (s.date.startsWith(DEMO_MONTH)) counts.set(s.payerId, (counts.get(s.payerId) ?? 0) + 1);
  const top = [...counts.entries()].find(([id, n]) => n >= 3 && id !== self);
  return top ? memberName(c, top[0]) : null;
}

export const MOCK_CONTACTS = [
  { id: 'm_aditi', name: 'Aditi', cards: [{ issuer: 'HDFC', name: 'Millennia' }] },
  { id: 'm_rohan', name: 'Rohan', cards: [{ issuer: 'Axis', name: 'ACE' }] },
  { id: 'm_meera', name: 'Meera', cards: [{ issuer: 'ICICI', name: 'Amazon Pay' }] },
  { id: 'm_dev', name: 'Dev', cards: [{ issuer: 'SBI', name: 'Cashback' }] },
  { id: 'm_tara', name: 'Tara', cards: [{ issuer: 'IDFC FIRST', name: 'Select' }] },
];
