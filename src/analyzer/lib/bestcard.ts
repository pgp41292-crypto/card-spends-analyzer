/* F5: rank the persona's cards for one purchase, using each card's rewardRules and monthly caps. */
import type { Card, CategoryId, PersonaData } from '../types';
import { DEMO_MONTH, DEMO_NOW } from './clock';
import { inr } from './paths';
import { quote, ruleFor, type RewardQuote } from './rewards';

export const PHRASE: Record<CategoryId, string> = {
  food: 'food delivery', groceries: 'groceries', shopping: 'online shopping', travel: 'travel bookings', fuel: 'fuel',
  bills: 'bills', entertainment: 'movies and entertainment', health: 'health', others: 'other spends',
};

export interface Warning { tone: 'danger' | 'warning' | 'primary'; text: string }
export interface Ranked { card: Card; q: RewardQuote; reason: string; warnings: Warning[] }

export function rankForPurchase(d: PersonaData, category: CategoryId, amount: number): Ranked[] {
  const today = DEMO_NOW.slice(0, 10);
  return d.cards
    .map((card) => {
      const q = quote(card, category, amount, d.transactions, DEMO_MONTH);
      const rule = ruleFor(card, category);
      const warnings: Warning[] = [];
      let reason: string;
      if (q.excluded || !rule) {
        reason = `No rewards on ${PHRASE[category]}`;
        warnings.push({ tone: 'danger', text: 'Category excluded' });
      } else {
        reason = rule.category === 'all' ? `${rule.ratePct}% on all spends` : `${rule.ratePct}% on ${PHRASE[category]}`;
        if (q.capReached) warnings.push({ tone: 'danger', text: 'Monthly cap reached' });
        else if (q.capLimited) warnings.push({ tone: 'warning', text: `Monthly cap: only ${inr(q.capLeft ?? 0, 2)} left` });
      }
      const m = d.benefits.milestones.find((x) => x.cardId === card.id && x.deadline >= today && x.progress < x.target);
      if (m) warnings.push({ tone: 'primary', text: `Counts toward milestone: ${inr(m.target - m.progress)} left` });
      return { card, q, reason, warnings };
    })
    .sort((a, b) => b.q.reward - a.q.reward); // stable: ties keep card order
}
