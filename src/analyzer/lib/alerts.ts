/* F4: limit threshold alerts. Fire once per persona × category × level × month. */
import type { PersonaData, PersonaId } from '../types';
import { DEMO_MONTH } from './clock';
import { limitStatus } from './selectors';

export interface LimitAlert { key: string; category: PersonaData['limits'][number]['category']; level: 80 | 100; pct: number; spent: number; limit: number }

export const alertKey = (persona: PersonaId, category: string, level: number) => `${persona}:${category}:${level}:${DEMO_MONTH}`;

/** Thresholds newly crossed going from `prev` to `next` that have not fired before. */
export function newLimitAlerts(persona: PersonaId, prev: PersonaData, next: PersonaData, fired: string[]): LimitAlert[] {
  const out: LimitAlert[] = [];
  for (const l of next.limits) {
    const before = prev.limits.find((x) => x.category === l.category);
    const was = before ? limitStatus(before, prev.transactions) : undefined;
    const now = limitStatus(l, next.transactions);
    for (const level of [100, 80] as const) {
      const key = alertKey(persona, l.category, level);
      if (now.pct >= level && (!was || was.pct < level) && !fired.includes(key)) {
        out.push({ key, category: l.category, level, pct: now.pct, spent: now.spent, limit: l.monthlyLimit });
        break; // only the highest newly crossed level toasts
      }
    }
  }
  return out;
}
