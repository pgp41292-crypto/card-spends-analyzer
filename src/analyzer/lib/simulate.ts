/* Demo-panel payment simulator: random merchant + amount, paid with the persona's best card for it. */
import type { CategoryId, PersonaData } from '../types';
import { DEMO_MONTH } from './clock';
import type { NewTxnInput } from './ledger';
import { rankCards } from './rewards';

export const MERCHANTS: { category: CategoryId; raw: string; name: string; min: number; max: number }[] = [
  { category: 'food', raw: 'RAZ*SWIGGY', name: 'Swiggy', min: 180, max: 650 },
  { category: 'food', raw: 'ZOMATO LTD GURGAON', name: 'Zomato', min: 200, max: 700 },
  { category: 'groceries', raw: 'BLINKIT*GROFERS INDIA', name: 'Blinkit', min: 250, max: 1200 },
  { category: 'shopping', raw: 'AMAZON PAY INDIA PVT', name: 'Amazon', min: 400, max: 3500 },
  { category: 'travel', raw: 'UBER *TRIP HELP.UBER', name: 'Uber', min: 150, max: 600 },
  { category: 'fuel', raw: 'BPCL SAI PETROLEUM', name: 'BPCL – Sai Petroleum', min: 500, max: 2500 },
  { category: 'entertainment', raw: 'BIGTREE ENTERTAINMENT', name: 'BookMyShow (Bigtree Entertainment)', min: 300, max: 900 },
  { category: 'health', raw: 'APOLLO PHARMACIES', name: 'Apollo Pharmacy', min: 150, max: 1200 },
];

export function bestCardFor(d: PersonaData, category: CategoryId, amount: number) {
  return rankCards(d.cards, category, amount, d.transactions, DEMO_MONTH)[0].cardId;
}

export function randomPayment(d: PersonaData): NewTxnInput {
  const m = MERCHANTS[Math.floor(Math.random() * MERCHANTS.length)];
  const amount = Math.round((m.min + Math.random() * (m.max - m.min)) / 10) * 10;
  return { cardId: bestCardFor(d, m.category, amount), amount, category: m.category, rawDescriptor: m.raw, merchantDisplayName: m.name, source: 'sms' };
}

/** Flow B, step 1: a ₹640 food payment. */
export const flowBPayment = (d: PersonaData): NewTxnInput => ({
  cardId: bestCardFor(d, 'food', 640), amount: 640, category: 'food', rawDescriptor: 'RAZ*SWIGGY', merchantDisplayName: 'Swiggy', source: 'sms',
});
