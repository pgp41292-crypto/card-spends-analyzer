/* Interfaces exactly as in PRD.md › "Mock data model". */
export type CategoryId =
  | 'food' | 'groceries' | 'shopping' | 'travel' | 'fuel'
  | 'bills' | 'entertainment' | 'health' | 'others';

export interface Card {
  id: string; issuer: string; name: string; last4: string;
  network: 'Visa' | 'Mastercard' | 'RuPay' | 'Amex';
  limit: number; outstanding: number; billDay: number; dueDay: number; color: string;
  rewardRules: { category: CategoryId | 'all'; ratePct: number; monthlyCap?: number; excluded?: boolean }[];
  pointsBalance: number; pointValueInr: number; isPaytmCobrand: boolean;
}

export interface Transaction {
  id: string; cardId: string; amount: number; timestamp: string;
  rawDescriptor: string;
  merchantDisplayName?: string;
  merchantSource: 'paytm_network' | 'user_corrected' | 'unresolved';
  confidence: number;
  category: CategoryId; source: 'sms' | 'paytm' | 'statement';
  isShared?: boolean; circleId?: string; recoverableAmount?: number;
  rewardEarned: number; bestCardId?: string; missedReward?: number;
}

export interface CategoryLimit { category: CategoryId; monthlyLimit: number; excludeShared: boolean }

export interface Benefit {
  id: string; cardId: string; title: string;
  type: 'automatic' | 'needs_action' | 'threshold';
  description: string; used?: number; total?: number;
  condition?: { spendRequired: number; spendSoFar: number; periodEnd: string };
}

export interface Milestone { id: string; cardId: string; title: string; target: number; progress: number; reward: string; deadline: string }
export interface Expiry { id: string; cardId: string; kind: 'points' | 'voucher'; value: number; expiresOn: string }
export interface Devaluation { id: string; cardId: string; date: string; change: string; impact: 'low' | 'medium' | 'high' }

export interface Charge {
  id: string; cardId: string; statementMonth: string;
  type: 'interest' | 'late_fee' | 'annual_fee' | 'forex_markup' | 'gst' | 'other';
  amount: number; reversible: boolean; note: string;
}

export interface Tip {
  id: string; title: string; cardIds: string[]; category: CategoryId | 'general';
  steps: string[]; estSavingInr: number; lastVerified: string;
  sources: { label: string; type: 'reddit' | 'youtube' | 'issuer' | 'forum' }[];
  status: 'verified' | 'needs_review';
}

export interface Circle {
  id: string; name: string; type: 'family' | 'trip' | 'friends';
  members: { id: string; name: string; cards: { issuer: string; name: string }[] }[];
  splits: {
    id: string; title: string; category: CategoryId; amount: number; payerId: string;
    shares: { memberId: string; amount: number; settled: boolean }[];
    date: string;
    /** Extension: member ids who confirmed the split (PRD: every split needs confirmation from all members). Absent = all confirmed. */
    confirmedBy?: string[];
  }[];
  monthlyPaidForOthers: number; monthlyCap: number;
  /** Extension: set by the one-way repayment guardrail. */
  pausedForReview?: boolean;
}

export interface CardSuggestion {
  id: string; issuer: string; name: string; annualFee: number; extraValuePerYear: number; reason: string; isPartner: boolean;
  /** Extension (not in PRD interface): needed so F9 can show the value calculation from the persona's transactions. */
  rewardRules?: Card['rewardRules'];
}
export interface Deal { id: string; merchant: string; distanceKm: number; item: string; discountPct: number; validUntil: string; requiresPaytmCobrand: true }

/* ---- File shapes for /src/data/<persona>/*.json (8 files per persona) ---- */
export type PersonaId = 'neha' | 'arjun' | 'karan';

export interface Persona {
  id: PersonaId; name: string; archetype: string; age: number; city: string;
  occupation: string; monthlySpend: string; features: string[];
}

/** Extension (not in PRD interface): sample card offers held by circle members, used by F7 "Who should pay?". */
export interface MemberCardOffer {
  memberId: string; cardName: string; category: CategoryId; ratePct: number; maxSaving?: number; note: string;
}

export interface BenefitsFile { benefits: Benefit[]; milestones: Milestone[]; expiries: Expiry[]; devaluations: Devaluation[] }
export interface CirclesFile { circles: Circle[]; memberCardOffers: MemberCardOffer[] }
export interface OffersFile { suggestions: CardSuggestion[]; deals: Deal[] }

export interface PersonaData {
  cards: Card[];
  transactions: Transaction[];
  limits: CategoryLimit[];
  benefits: BenefitsFile;
  charges: Charge[];
  tips: Tip[];
  circles: CirclesFile;
  offers: OffersFile;
}
