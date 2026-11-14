/* Reward engine shared by the app store AND scripts/generate-mock-data.ts.
   Keep this file dependency-free (type-only imports) so Node can run it directly. */
import type { Card, CategoryId, Transaction } from '../types';

type Rule = Card['rewardRules'][number];

export const monthKey = (ts: string) => ts.slice(0, 7);
export const round2 = (n: number) => Math.round(n * 100) / 100;

/** The rule that applies to a category: an exact match wins over 'all'. */
export function ruleFor(card: Pick<Card, 'rewardRules'>, category: CategoryId): Rule | undefined {
  return card.rewardRules.find((r) => r.category === category) ?? card.rewardRules.find((r) => r.category === 'all');
}

/** Reward already earned this month under the same rule on the same card (for monthly caps). */
export function capUsed(card: Card, rule: Rule, txns: Transaction[], month: string) {
  return txns
    .filter((t) => t.cardId === card.id && monthKey(t.timestamp) === month && ruleFor(card, t.category) === rule)
    .reduce((s, t) => s + t.rewardEarned, 0);
}

export interface RewardQuote {
  cardId: string;
  reward: number;
  ratePct: number;          // nominal rule rate
  effectivePct: number;     // after caps
  excluded: boolean;
  capReached: boolean;      // nothing left under the cap before this purchase
  capLimited: boolean;      // cap cut this purchase's reward
  capLeft?: number;
}

export function quote(card: Card, category: CategoryId, amount: number, txns: Transaction[], month: string): RewardQuote {
  const rule = ruleFor(card, category);
  if (!rule || rule.excluded) {
    return { cardId: card.id, reward: 0, ratePct: 0, effectivePct: 0, excluded: true, capReached: false, capLimited: false };
  }
  const raw = (amount * rule.ratePct) / 100;
  let reward = raw;
  let capLeft: number | undefined;
  if (rule.monthlyCap != null) {
    capLeft = Math.max(0, rule.monthlyCap - capUsed(card, rule, txns, month));
    reward = Math.min(raw, capLeft);
  }
  reward = round2(reward);
  return {
    cardId: card.id,
    reward,
    ratePct: rule.ratePct,
    effectivePct: amount > 0 ? round2((reward / amount) * 100) : 0,
    excluded: false,
    capReached: capLeft !== undefined && capLeft <= 0,
    capLimited: reward < round2(raw),
    capLeft,
  };
}

/** Cards ranked best-first for a purchase. Ties keep card order. */
export function rankCards(cards: Card[], category: CategoryId, amount: number, txns: Transaction[], month: string) {
  return cards
    .map((c, i) => ({ q: quote(c, category, amount, txns, month), i }))
    .sort((a, b) => b.q.reward - a.q.reward || a.i - b.i)
    .map((x) => x.q);
}

/** Fill rewardEarned / bestCardId / missedReward for a new transaction, given prior history. */
export function scoreTransaction(
  t: Omit<Transaction, 'rewardEarned' | 'bestCardId' | 'missedReward'>,
  cards: Card[],
  history: Transaction[],
): Transaction {
  const month = monthKey(t.timestamp);
  const card = cards.find((c) => c.id === t.cardId)!;
  const earned = quote(card, t.category, t.amount, history, month).reward;
  const best = rankCards(cards, t.category, t.amount, history, month)[0];
  return { ...t, rewardEarned: earned, bestCardId: best.cardId, missedReward: round2(Math.max(0, best.reward - earned)) };
}

/* ---------- F9: suggested-card value (shared by generator and the /cards sheet) ---------- */
type RuleList = Card['rewardRules'];

/** Monthly reward for spending `spend` in one category under a rule list (monthly caps applied). */
export function monthlyReward(rules: RuleList, category: CategoryId, spend: number) {
  const rule = ruleFor({ rewardRules: rules }, category);
  if (!rule || rule.excluded) return 0;
  const raw = (spend * rule.ratePct) / 100;
  return round2(rule.monthlyCap != null ? Math.min(raw, rule.monthlyCap) : raw);
}

export interface SuggestionRow { category: CategoryId; monthlySpend: number; currentBest: number; currentCardId: string; suggested: number; gain: number }

/** Per-category comparison: best of the user's cards vs the suggested card, on average monthly spend. */
export function suggestionBreakdown(rules: RuleList, cards: Card[], txns: Transaction[], months: number): SuggestionRow[] {
  const spend = new Map<CategoryId, number>();
  for (const t of txns) spend.set(t.category, (spend.get(t.category) ?? 0) + t.amount - (t.recoverableAmount ?? 0));
  return [...spend.entries()]
    .map(([category, total]) => {
      const monthlySpend = Math.round(total / months);
      let currentBest = 0;
      let currentCardId = cards[0]?.id ?? '';
      for (const c of cards) {
        const r = monthlyReward(c.rewardRules, category, monthlySpend);
        if (r > currentBest) { currentBest = r; currentCardId = c.id; }
      }
      const suggested = monthlyReward(rules, category, monthlySpend);
      return { category, monthlySpend, currentBest, currentCardId, suggested, gain: round2(Math.max(0, suggested - currentBest)) };
    })
    .sort((a, b) => b.monthlySpend - a.monthlySpend);
}

/** Extra value a year = 12 × monthly gain (before annual fee). */
export const extraPerYear = (rows: SuggestionRow[]) => Math.round(rows.reduce((s, r) => s + r.gain, 0) * 12);
