/* Generates /src/data/<persona>/*.json following PRD.md › "Rules for generating mock data".
   Run: node scripts/generate-mock-data.ts   (Node ≥ 22.18 strips types natively)
   Deterministic (seeded) — re-running produces identical files. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extraPerYear, monthKey, rankCards, round2, scoreTransaction, suggestionBreakdown } from '../src/analyzer/lib/rewards.ts';
import { DEMO_NOW, QUARTER_START, TRACKED_MONTHS, istStamp } from '../src/analyzer/lib/clock.ts';
import type {
  BenefitsFile, Card, CardSuggestion, CategoryId, CategoryLimit, Charge, CirclesFile, Deal, OffersFile, Persona, PersonaId, Tip, Transaction,
} from '../src/analyzer/types.ts';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data');

/* ---------- seeded PRNG ---------- */
const mulberry32 = (a: number) => () => {
  a |= 0; a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/* ---------- merchant pools: raw bank-SMS descriptor → Paytm-network display name ---------- */
type M = { raw: string; name: string };
const POOLS: Record<CategoryId, M[]> = {
  food: [
    { raw: 'TOWER 5IAND5J BUNDLTECHNO', name: 'Swiggy (legal name: Bundl Technologies)' },
    { raw: 'RAZ*SWIGGY {C}', name: 'Swiggy' },
    { raw: 'ZOMATO LTD GURGAON', name: 'Zomato' },
    { raw: 'PYU*ZOMATO ONLINE ORD', name: 'Zomato' },
    { raw: 'TATA STARBUCKS PVT LTD', name: 'Starbucks (Tata Starbucks)' },
    { raw: 'JUBILANT FOODWORKS LT', name: "Domino's Pizza (Jubilant FoodWorks)" },
  ],
  groceries: [
    { raw: 'PYTM*SHARMA GEN STORE', name: 'Sharma General Store' },
    { raw: 'BLINKIT*GROFERS INDIA', name: 'Blinkit' },
    { raw: 'SUPERMARKET GROCERY SUPPLI', name: 'BigBasket (Supermarket Grocery Supplies)' },
    { raw: 'AVENUE SUPERMARTS LTD', name: 'DMart (Avenue Supermarts)' },
    { raw: 'ZEPTO KIRANAKART TECH', name: 'Zepto (KiranaKart Technologies)' },
  ],
  shopping: [
    { raw: 'AMAZON PAY INDIA PVT', name: 'Amazon' },
    { raw: 'FLIPKART INTERNET PVT', name: 'Flipkart' },
    { raw: 'RAZ*MYNTRA DESIGNS', name: 'Myntra' },
    { raw: 'NYKAA E RETAIL PVT LTD', name: 'Nykaa' },
    { raw: 'PYTM*CROMA INFINITI RETAIL', name: 'Croma (Infiniti Retail)' },
    { raw: 'DECATHLON SPORTS INDIA', name: 'Decathlon' },
  ],
  travel: [
    { raw: 'MAKEMYTRIP INDIA PVT', name: 'MakeMyTrip' },
    { raw: 'INTERGLOBE AVIATION 6E', name: 'IndiGo (InterGlobe Aviation)' },
    { raw: 'IRCTC WWW IRCTC CO IN', name: 'IRCTC' },
    { raw: 'UBER *TRIP HELP.UBER', name: 'Uber' },
    { raw: 'ANI TECHNOLOGIES PVT', name: 'Ola (ANI Technologies)' },
  ],
  fuel: [
    { raw: 'BPCL SAI PETROLEUM {C}', name: 'BPCL – Sai Petroleum' },
    { raw: 'HPCL JAY AMBE FUELS', name: 'HPCL – Jay Ambe Fuels' },
    { raw: 'IOCL COCO OUTLET {C}', name: 'Indian Oil (COCO outlet)' },
  ],
  bills: [
    { raw: 'PYTM*ELECTRICITY BILL', name: 'Electricity bill (via Paytm)' },
    { raw: 'BHARTI AIRTEL LTD POSTPD', name: 'Airtel Postpaid' },
    { raw: 'ATRIA CONVERGENCE ACT', name: 'ACT Fibernet (Atria Convergence)' },
    { raw: 'PYTM*JIO PREPAID RCHG', name: 'Jio recharge (via Paytm)' },
    { raw: 'LIC OF INDIA PREM COLL', name: 'LIC premium' },
  ],
  entertainment: [
    { raw: 'BIGTREE ENTERTAINMENT', name: 'BookMyShow (Bigtree Entertainment)' },
    { raw: 'NETFLIX.COM MUMBAI', name: 'Netflix' },
    { raw: 'PVR INOX LIMITED', name: 'PVR INOX' },
    { raw: 'SPOTIFY INDIA LLP', name: 'Spotify' },
  ],
  health: [
    { raw: 'APOLLO PHARMACIES {C}', name: 'Apollo Pharmacy' },
    { raw: 'PYTM*1MG TECHNOLOGIES', name: 'Tata 1mg' },
    { raw: 'PRACTO TECHNOLOGIES', name: 'Practo' },
  ],
  others: [
    { raw: 'PYTM*URBAN COMPANY', name: 'Urban Company' },
    { raw: 'SQ *CHAI POINT', name: 'Chai Point' },
    { raw: 'PORTER LOGISTICS PVT', name: 'Porter' },
  ],
};
const UNRESOLVED = ['POS 4471 SHREE ENTERPRISES', 'UPI-CC 99XX8812 MERCHANT', 'VPS*KRISHNA TRADERS {C}', 'IMPS-CC SVC 4410 RETAIL'];

/* ---------- persona config ---------- */
type Spec = Partial<Record<CategoryId, [count: number, total: number]>>;
type Draft = Omit<Transaction, 'rewardEarned' | 'bestCardId' | 'missedReward'> & { fixed?: boolean };
interface Cfg {
  id: PersonaId; seed: number; prefix: number; city: string; local: Partial<Record<CategoryId, M[]>>;
  cards: Card[];
  months: { y: number; m: number; from: number; to: number; spec: Spec }[];
  fixed: Draft[];
  assign: (d: Draft, cards: Card[], hist: Transaction[]) => string;
  force?: (drafts: Draft[]) => Map<string, string>;     // txn id → card id (deliberately sub-optimal)
}

const prefer = (map: Partial<Record<CategoryId, string>>, fallback: string) => (d: Draft) => map[d.category] ?? fallback;
const best = (d: Draft, cards: Card[], hist: Transaction[]) => rankCards(cards, d.category, d.amount, hist, monthKey(d.timestamp))[0].cardId;

function split(total: number, count: number, rnd: () => number) {
  if (count <= 0) return [];
  const w = Array.from({ length: count }, () => 0.45 + rnd());
  const sw = w.reduce((a, b) => a + b, 0);
  const out = w.map((x) => Math.max(49, Math.round((total * x) / sw)));
  out[0] += total - out.reduce((a, b) => a + b, 0);
  return out;
}

function generate(cfg: Cfg): Transaction[] {
  const rnd = mulberry32(cfg.seed);
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
  const drafts: Draft[] = [];

  for (const mo of cfg.months) {
    for (const [cat, [count, total]] of Object.entries(mo.spec) as [CategoryId, [number, number]][]) {
      const fx = cfg.fixed.filter((f) => f.category === cat && f.timestamp.startsWith(`${mo.y}-${String(mo.m).padStart(2, '0')}`));
      const amounts = split(total - fx.reduce((s, f) => s + f.amount, 0), count - fx.length, rnd);
      const pool = [...POOLS[cat], ...(cfg.local[cat] ?? [])];
      for (const amount of amounts) {
        const m = pick(pool);
        const raw = m.raw.replace('{C}', cfg.city);
        const day = mo.from + Math.floor(rnd() * (mo.to - mo.from + 1));
        const isClockDay = istStamp(mo.y, mo.m, day, 0, 0).slice(0, 10) === DEMO_NOW.slice(0, 10);
        const hour = 8 + Math.floor(rnd() * (isClockDay ? 9 : 14)); // never after the 18:00 demo clock
        drafts.push({
          id: '', cardId: '', amount, category: cat,
          timestamp: istStamp(mo.y, mo.m, day, hour, Math.floor(rnd() * 60), Math.floor(rnd() * 60)),
          rawDescriptor: raw, merchantDisplayName: m.name, merchantSource: 'paytm_network',
          confidence: round2(0.82 + rnd() * 0.17),
          source: raw.startsWith('PYTM*') ? 'paytm' : rnd() < 0.08 ? 'statement' : 'sms',
        });
      }
    }
  }
  drafts.push(...cfg.fixed.map((f) => ({ ...f, fixed: true })));
  drafts.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  // Ids: chronological, skipping ids reserved by fixed transactions.
  const reserved = new Set(cfg.fixed.map((f) => f.id));
  let n = cfg.prefix + 1;
  for (const d of drafts) if (!d.fixed) { while (reserved.has(`t_${n}`)) n++; d.id = `t_${n++}`; }

  // Exactly 4 low-confidence, unresolved rows: 2 this month, 2 last month.
  const free = (mon: string) => drafts.filter((d) => !d.fixed && !d.isShared && d.timestamp.startsWith(mon));
  const nov = free('2026-11'), oct = free('2026-10');
  [nov[Math.floor(nov.length * 0.35)], nov[Math.floor(nov.length * 0.8)], oct[3], oct[Math.floor(oct.length * 0.6)]].forEach((d, i) => {
    d.rawDescriptor = UNRESOLVED[i].replace('{C}', cfg.city);
    delete d.merchantDisplayName;
    d.merchantSource = 'unresolved';
    d.confidence = round2(0.41 + i * 0.08);
    d.source = 'sms';
  });

  const forced = cfg.force?.(drafts) ?? new Map();
  const hist: Transaction[] = [];
  for (const d of drafts) {
    const { fixed: _f, ...base } = d;
    base.cardId = base.cardId || forced.get(d.id) || cfg.assign(d, cfg.cards, hist);
    hist.push(scoreTransaction(base, cfg.cards, hist));
  }
  return hist.reverse(); // newest first
}

/* ---------- helpers for derived fields ---------- */
const spendOn = (txns: Transaction[], cardId: string, since: string) =>
  txns.filter((t) => t.cardId === cardId && t.timestamp >= since).reduce((s, t) => s + t.amount, 0);

function withOutstanding(cards: Card[], txns: Transaction[]) {
  return cards.map((c) => {
    // Last statement date: this month if the bill day has passed, otherwise last month.
    const since = c.billDay <= Number(DEMO_NOW.slice(8, 10)) ? istStamp(2026, 11, c.billDay, 0, 0) : istStamp(2026, 10, c.billDay, 0, 0);
    return { ...c, outstanding: txns.filter((t) => t.cardId === c.id && t.timestamp > since).reduce((s, t) => s + t.amount, 0) };
  });
}

function suggestions(list: Omit<CardSuggestion, 'extraValuePerYear' | 'reason'>[], cards: Card[], txns: Transaction[]): CardSuggestion[] {
  return list.map((s) => {
    const rows = suggestionBreakdown(s.rewardRules!, cards, txns, TRACKED_MONTHS);
    const top = [...rows].sort((a, b) => b.gain - a.gain)[0];
    const label: Record<CategoryId, string> = {
      food: 'food delivery and dining', groceries: 'groceries', shopping: 'online shopping', travel: 'travel', fuel: 'fuel',
      bills: 'bills and recharges', entertainment: 'movies and streaming', health: 'health', others: 'other spends',
    };
    return { ...s, extraValuePerYear: extraPerYear(rows), reason: `You spend ₹${top.monthlySpend.toLocaleString('en-IN')} a month on ${label[top.category]}` };
  });
}

const DEALS: Deal[] = [
  { id: 'd_bakery', merchant: 'Sharma Bakery', distanceKm: 0.4, item: 'Fresh bread and buns', discountPct: 30, validUntil: '2026-11-15T21:00:00+05:30', requiresPaytmCobrand: true },
  { id: 'd_fruits', merchant: 'Green Basket Fruits', distanceKm: 1.2, item: 'Cut fruits and salads', discountPct: 25, validUntil: '2026-11-15T20:30:00+05:30', requiresPaytmCobrand: true },
  { id: 'd_dairy', merchant: 'Kulkarni Dairy', distanceKm: 0.8, item: 'Paneer and curd', discountPct: 20, validUntil: '2026-11-15T22:00:00+05:30', requiresPaytmCobrand: true },
  { id: 'd_sweets', merchant: 'Annapurna Sweets', distanceKm: 2.1, item: 'Fresh jalebi and samosa', discountPct: 15, validUntil: '2026-11-15T19:30:00+05:30', requiresPaytmCobrand: true },
];

const PAYTM_SELECT: Card = {
  id: 'c_paytm', issuer: 'Paytm SBI', name: 'Paytm SBI Card SELECT (sample)', last4: '7712', network: 'Visa',
  limit: 120000, outstanding: 0, billDay: 12, dueDay: 2, color: '#00BAF2',
  rewardRules: [{ category: 'bills', ratePct: 3 }, { category: 'entertainment', ratePct: 3 }, { category: 'all', ratePct: 1 }],
  pointsBalance: 640, pointValueInr: 1, isPaytmCobrand: true,
};

/* ================= NEHA ================= */
function neha() {
  const cards: Card[] = [
    { id: 'c_hdfc', issuer: 'HDFC', name: 'Millennia (sample)', last4: '6451', network: 'Visa', limit: 250000, outstanding: 0, billDay: 5, dueDay: 25, color: '#1D4ED8',
      rewardRules: [{ category: 'food', ratePct: 5, monthlyCap: 1000 }, { category: 'shopping', ratePct: 5, monthlyCap: 1000 }, { category: 'all', ratePct: 1 }],
      pointsBalance: 4800, pointValueInr: 0.25, isPaytmCobrand: false },
    { id: 'c_sbi', issuer: 'SBI', name: 'BPCL Octane (sample)', last4: '2290', network: 'Visa', limit: 150000, outstanding: 0, billDay: 18, dueDay: 8, color: '#7C3AED',
      rewardRules: [{ category: 'fuel', ratePct: 4, monthlyCap: 500 }, { category: 'groceries', ratePct: 2.5, monthlyCap: 300 }, { category: 'all', ratePct: 0.5 }],
      pointsBalance: 3200, pointValueInr: 0.25, isPaytmCobrand: false },
    PAYTM_SELECT,
  ];
  const txns = generate({
    id: 'neha', seed: 11, prefix: 1000, city: 'PNQ', cards,
    local: { food: [{ raw: 'PYTM*VAISHALI RESTAURANT', name: 'Vaishali Restaurant, FC Road' }] },
    months: [
      // October: 40 txns, ₹62,000
      { y: 2026, m: 10, from: 1, to: 31, spec: { food: [12, 8600], groceries: [6, 7400], shopping: [5, 14200], travel: [2, 9800], fuel: [4, 6000], bills: [5, 7900], entertainment: [3, 3100], health: [2, 2600], others: [1, 2400] } },
      // November to date: 20 txns. Food ₹5,920 = 74% of ₹8,000 → a ₹640 food payment lands on 82% (Flow B).
      { y: 2026, m: 11, from: 1, to: 15, spec: { food: [7, 5920], groceries: [3, 3600], shopping: [3, 8450], fuel: [2, 3000], bills: [3, 6250], entertainment: [2, 1780] } },
    ],
    fixed: [{
      id: 't_1042', cardId: 'c_hdfc', amount: 186, timestamp: '2026-11-13T14:55:19+05:30',
      rawDescriptor: 'TOWER 5IAND5J BUNDLTECHNO', merchantDisplayName: 'Swiggy (legal name: Bundl Technologies)',
      merchantSource: 'paytm_network', confidence: 0.92, category: 'food', source: 'sms',
    }],
    assign: prefer({ food: 'c_hdfc', shopping: 'c_hdfc', groceries: 'c_sbi', fuel: 'c_sbi', bills: 'c_paytm', entertainment: 'c_paytm', travel: 'c_paytm' }, 'c_hdfc'),
  });
  const q = (id: string) => spendOn(txns, id, QUARTER_START);
  const limits: CategoryLimit[] = [
    { category: 'food', monthlyLimit: 8000, excludeShared: true },
    { category: 'shopping', monthlyLimit: 12000, excludeShared: true },
    { category: 'entertainment', monthlyLimit: 3000, excludeShared: true },
  ];
  const benefits: BenefitsFile = {
    benefits: [
      { id: 'b_hdfc_cb', cardId: 'c_hdfc', title: '5% cashback on food delivery and shopping', type: 'automatic', description: 'Credited automatically on Swiggy, Zomato, Amazon and Flipkart. Capped at ₹1,000 a month for each.' },
      { id: 'b_hdfc_fuel', cardId: 'c_hdfc', title: '1% fuel surcharge waiver', type: 'automatic', description: 'On fuel spends between ₹400 and ₹5,000.' },
      { id: 'b_hdfc_lounge', cardId: 'c_hdfc', title: 'Lounge access', type: 'threshold', description: 'Spend ₹50,000 this quarter to unlock 2 domestic lounge visits.', condition: { spendRequired: 50000, spendSoFar: q('c_hdfc'), periodEnd: '2026-12-31' } },
      { id: 'b_sbi_fuel', cardId: 'c_sbi', title: 'Fuel surcharge waiver at BPCL', type: 'automatic', description: 'On ₹400–₹4,000 fills, up to ₹100 a month.' },
      { id: 'b_sbi_protect', cardId: 'c_sbi', title: 'Purchase protection on electronics', type: 'needs_action', description: 'Register a purchase within 30 days to cover theft or damage up to ₹50,000.', used: 0, total: 1 },
      { id: 'b_paytm_lounge', cardId: 'c_paytm', title: 'Domestic lounge visits', type: 'needs_action', description: '4 complimentary visits a quarter at partner lounges. Show the card at the lounge desk.', used: 2, total: 4 },
      { id: 'b_paytm_movie', cardId: 'c_paytm', title: 'Movie tickets: buy 1 get 1', type: 'needs_action', description: 'On BookMyShow, up to ₹250 off, twice a month. Use code SELECTBOGO at checkout.', used: 0, total: 2 },
    ],
    milestones: [
      { id: 'm_hdfc', cardId: 'c_hdfc', title: 'Spend milestone', target: 150000, progress: 64000 + q('c_hdfc'), reward: 'a ₹1,500 gift voucher', deadline: '2027-03-31' },
      { id: 'm_paytm', cardId: 'c_paytm', title: 'Annual fee waiver', target: 100000, progress: 38000 + q('c_paytm'), reward: 'an annual fee waiver worth ₹1,499', deadline: '2027-03-31' },
    ],
    expiries: [
      { id: 'e_hdfc_pts', cardId: 'c_hdfc', kind: 'points', value: 1200, expiresOn: '2026-11-22' },
      { id: 'e_paytm_vch', cardId: 'c_paytm', kind: 'voucher', value: 500, expiresOn: '2026-11-22' },
      { id: 'e_sbi_pts', cardId: 'c_sbi', kind: 'points', value: 800, expiresOn: '2027-01-31' },
    ],
    devaluations: [{ id: 'dv_hdfc', cardId: 'c_hdfc', date: '2026-08-01', change: 'Cashback on rent and wallet loads removed.', impact: 'low' }],
  };
  const tips: Tip[] = [
    { id: 'tip_n1', title: 'Pay electricity and phone bills with the Paytm card for 3% back', cardIds: ['c_paytm'], category: 'bills', estSavingInr: 190, lastVerified: '2026-11-12', status: 'verified',
      steps: ['Open Recharge & Bills in Paytm.', 'Choose your biller and amount.', 'Select Paytm SBI Card SELECT at checkout.', 'Cashback shows on your next statement.'],
      sources: [{ label: 'Card terms (issuer)', type: 'issuer' }, { label: 'r/CreditCardsIndia thread', type: 'reddit' }] },
    { id: 'tip_n2', title: 'Order food on HDFC Millennia to get 5% back', cardIds: ['c_hdfc'], category: 'food', estSavingInr: 420, lastVerified: '2026-11-10', status: 'verified',
      steps: ['Set HDFC Millennia as the default card in Swiggy and Zomato.', 'Keep monthly food spend under ₹20,000 to stay within the ₹1,000 cap.', 'Check cashback in the HDFC app after the statement.'],
      sources: [{ label: 'HDFC Millennia MITC', type: 'issuer' }, { label: 'TechnoFino forum', type: 'forum' }] },
    { id: 'tip_n3', title: 'Fill ₹4,000 at a time at BPCL to max out fuel rewards', cardIds: ['c_sbi'], category: 'fuel', estSavingInr: 120, lastVerified: '2026-10-28', status: 'needs_review',
      steps: ['Fill at BPCL outlets only.', 'Keep each fill between ₹400 and ₹4,000.', 'Rewards cap at ₹500 a month.'],
      sources: [{ label: 'YouTube review', type: 'youtube' }] },
    { id: 'tip_n4', title: 'SBI Cashback card gives 5% on all online spends', cardIds: ['ext_sbi_cashback'], category: 'shopping', estSavingInr: 600, lastVerified: '2026-11-09', status: 'verified',
      steps: ['Apply for the card.', 'Use it for online shopping.'], sources: [{ label: 'Issuer page', type: 'issuer' }] },
  ];
  const offers: OffersFile = {
    suggestions: suggestions([
      { id: 's_axis_ace', issuer: 'Axis', name: 'ACE (sample)', annualFee: 499, isPartner: true,
        rewardRules: [{ category: 'bills', ratePct: 5, monthlyCap: 500 }, { category: 'food', ratePct: 4, monthlyCap: 500 }, { category: 'all', ratePct: 1.5 }] },
      { id: 's_hsbc_live', issuer: 'HSBC', name: 'Live+ (sample)', annualFee: 999, isPartner: false,
        rewardRules: [{ category: 'food', ratePct: 10, monthlyCap: 1000 }, { category: 'groceries', ratePct: 10, monthlyCap: 1000 }, { category: 'all', ratePct: 1.5 }] },
    ], cards, txns),
    deals: DEALS,
  };
  return { cards: withOutstanding(cards, txns), transactions: txns, limits, benefits, charges: [] as Charge[], tips, circles: { circles: [], memberCardOffers: [] } as CirclesFile, offers };
}

/* ================= ARJUN ================= */
function arjun() {
  const cards: Card[] = [
    { id: 'c_hdfc', issuer: 'HDFC', name: 'Swiggy (sample)', last4: '6451', network: 'Mastercard', limit: 300000, outstanding: 0, billDay: 5, dueDay: 25, color: '#1D4ED8',
      rewardRules: [{ category: 'food', ratePct: 10, monthlyCap: 1500 }, { category: 'shopping', ratePct: 5, monthlyCap: 1500 }, { category: 'all', ratePct: 1 }],
      pointsBalance: 2400, pointValueInr: 1, isPaytmCobrand: false },
    { id: 'c_axis', issuer: 'Axis', name: 'Atlas (sample)', last4: '3308', network: 'Visa', limit: 500000, outstanding: 0, billDay: 20, dueDay: 10, color: '#9F1239',
      rewardRules: [{ category: 'travel', ratePct: 5, monthlyCap: 5000 }, { category: 'fuel', ratePct: 0, excluded: true }, { category: 'all', ratePct: 2 }],
      pointsBalance: 24000, pointValueInr: 0.5, isPaytmCobrand: false },
    { id: 'c_icici', issuer: 'ICICI', name: 'Amazon Pay (sample)', last4: '9021', network: 'Visa', limit: 400000, outstanding: 0, billDay: 15, dueDay: 3, color: '#B45309',
      rewardRules: [{ category: 'shopping', ratePct: 5, monthlyCap: 2000 }, { category: 'food', ratePct: 5, monthlyCap: 150 }, { category: 'all', ratePct: 1 }],
      pointsBalance: 1850, pointValueInr: 1, isPaytmCobrand: false },
    { id: 'c_amex', issuer: 'Amex', name: 'MRCC (sample)', last4: '1005', network: 'Amex', limit: 350000, outstanding: 0, billDay: 22, dueDay: 12, color: '#0F766E',
      rewardRules: [{ category: 'health', ratePct: 3 }, { category: 'others', ratePct: 3 }, { category: 'fuel', ratePct: 0, excluded: true }, { category: 'bills', ratePct: 0, excluded: true }, { category: 'all', ratePct: 1.5 }],
      pointsBalance: 32500, pointValueInr: 0.4, isPaytmCobrand: false },
    { ...PAYTM_SELECT, limit: 200000, pointsBalance: 1200,
      rewardRules: [{ category: 'bills', ratePct: 3 }, { category: 'entertainment', ratePct: 5, monthlyCap: 500 }, { category: 'all', ratePct: 1 }] },
  ];
  const txns = generate({
    id: 'arjun', seed: 23, prefix: 2000, city: 'BLR', cards,
    local: { food: [{ raw: 'PYTM*MTR 1924 LALBAGH', name: 'MTR 1924, Lalbagh' }] },
    months: [
      // October: 60 txns, ₹1,30,000
      { y: 2026, m: 10, from: 1, to: 31, spec: { food: [16, 14500], groceries: [6, 9800], shopping: [9, 28400], travel: [6, 34600], fuel: [5, 7200], bills: [8, 16300], entertainment: [5, 6900], health: [3, 5100], others: [2, 7200] } },
      // November to date: 30 txns, ₹66,500
      { y: 2026, m: 11, from: 1, to: 15, spec: { food: [8, 7400], groceries: [3, 4200], shopping: [5, 17600], travel: [3, 19800], fuel: [2, 3000], bills: [4, 8900], entertainment: [3, 3100], health: [1, 1400], others: [1, 1100] } },
    ],
    fixed: [],
    assign: best,
    // Exactly 3 sub-optimal rows: the 3 largest November food orders went on ICICI (also exhausts its ₹150 food cap → F5 cap warning).
    force: (drafts) => new Map(
      drafts.filter((d) => d.category === 'food' && d.timestamp.startsWith('2026-11') && d.merchantSource !== 'unresolved')
        .sort((a, b) => b.amount - a.amount).slice(0, 3).map((d) => [d.id, 'c_icici']),
    ),
  });
  const q = (id: string) => spendOn(txns, id, QUARTER_START);
  const hdfcFY = spendOn(txns, 'c_hdfc', QUARTER_START);
  const benefits: BenefitsFile = {
    benefits: [
      { id: 'b_hdfc_swiggy', cardId: 'c_hdfc', title: '10% back on Swiggy', type: 'automatic', description: 'On food delivery, Instamart and Dineout via Swiggy. Capped at ₹1,500 a month.' },
      { id: 'b_axis_lounge', cardId: 'c_axis', title: 'International lounge access', type: 'threshold', description: 'Spend ₹75,000 this quarter to unlock 4 international lounge visits.', condition: { spendRequired: 75000, spendSoFar: q('c_axis'), periodEnd: '2026-12-31' } },
      { id: 'b_axis_miles', cardId: 'c_axis', title: 'Transfer miles to airline partners', type: 'needs_action', description: 'Link your frequent-flyer number in the Axis app before transferring.' },
      { id: 'b_amex_bonus', cardId: 'c_amex', title: 'Monthly 1,000 bonus points', type: 'needs_action', description: 'Make 4 transactions of ₹1,500 or more in a calendar month. Enrol once in the Amex app.', used: 0, total: 1 },
      { id: 'b_paytm_lounge', cardId: 'c_paytm', title: 'Domestic lounge visits', type: 'needs_action', description: '4 complimentary visits a quarter at partner lounges.', used: 1, total: 4 },
      { id: 'b_icici_protect', cardId: 'c_icici', title: 'Purchase protection on electronics', type: 'automatic', description: 'Covers theft for 90 days on items bought with the card.' },
    ],
    milestones: [
      // 87,600 of 1,00,000 = 88%, "₹12,400 more by 31 Mar".
      { id: 'm_hdfc', cardId: 'c_hdfc', title: 'Annual spend milestone', target: 100000, progress: 87600, reward: 'a ₹1,500 voucher', deadline: '2027-03-31' },
      { id: 'm_axis', cardId: 'c_axis', title: 'Bonus miles milestone', target: 300000, progress: 95000 + q('c_axis'), reward: '5,000 bonus miles', deadline: '2027-01-31' },
    ],
    expiries: [
      { id: 'e_axis_pts', cardId: 'c_axis', kind: 'points', value: 4000, expiresOn: '2026-12-10' },
      { id: 'e_amex_pts', cardId: 'c_amex', kind: 'points', value: 2500, expiresOn: '2026-12-05' },
      { id: 'e_hdfc_vch', cardId: 'c_hdfc', kind: 'voucher', value: 500, expiresOn: '2027-01-15' },
    ],
    devaluations: [
      { id: 'dv_axis', cardId: 'c_axis', date: '2026-10-28', change: 'Accelerated 5X miles on travel now capped at ₹2 lakh a month; transfer ratio cut from 1:2 to 1:1 for 3 airline partners.', impact: 'high' },
      { id: 'dv_amex', cardId: 'c_amex', date: '2026-06-15', change: 'Rent and wallet loads no longer earn points.', impact: 'medium' },
    ],
  };
  if (hdfcFY > 87600) throw new Error('Arjun HDFC spend exceeds milestone progress');
  const charges: Charge[] = [
    { id: 'ch_late', cardId: 'c_hdfc', statementMonth: '2026-11', type: 'late_fee', amount: 600, reversible: true, note: 'Late fee: paid 2 days after due date (25 Oct).' },
    { id: 'ch_gst', cardId: 'c_hdfc', statementMonth: '2026-11', type: 'gst', amount: 108, reversible: true, note: 'GST at 18% on the late fee. Reversed together with the fee.' },
    { id: 'ch_int', cardId: 'c_icici', statementMonth: '2026-10', type: 'interest', amount: 412, reversible: false, note: 'Interest on ₹21,600 carried over for 9 days at 3.6% a month.' },
    { id: 'ch_fx', cardId: 'c_axis', statementMonth: '2026-10', type: 'forex_markup', amount: 120, reversible: false, note: '2% markup on a $72 international purchase.' },
    { id: 'ch_fee', cardId: 'c_amex', statementMonth: '2026-09', type: 'annual_fee', amount: 4500, reversible: false, note: 'Annual fee. Waived above ₹1.5 lakh yearly spend (not met).' },
  ];
  const tips: Tip[] = [
    { id: 'tip_a1', title: 'Book flights on Axis Travel EDGE for 5X miles', cardIds: ['c_axis'], category: 'travel', estSavingInr: 2400, lastVerified: '2026-11-12', status: 'verified',
      steps: ['Open Travel EDGE from the Axis app.', 'Search and book the same fare you found elsewhere.', 'Pay with Atlas to earn 5X miles (within the ₹2 lakh monthly cap).', 'Miles post within 7 days of travel.'],
      sources: [{ label: 'r/CreditCardsIndia: Atlas Travel EDGE', type: 'reddit' }, { label: 'Atlas in 2026 (video review)', type: 'youtube' }, { label: 'Axis Atlas MITC', type: 'issuer' }] },
    { id: 'tip_a2', title: 'Transfer Atlas miles before partner ratios change', cardIds: ['c_axis'], category: 'travel', estSavingInr: 3000, lastVerified: '2026-11-08', status: 'verified',
      steps: ['Check which partners still transfer at 1:2.', 'Link your frequent-flyer number.', 'Transfer in blocks of 1,000 miles.'],
      sources: [{ label: 'Axis devaluation notice', type: 'issuer' }, { label: 'TechnoFino forum', type: 'forum' }] },
    { id: 'tip_a3', title: 'Order Swiggy on the HDFC Swiggy card, not via Amazon Pay', cardIds: ['c_hdfc', 'c_icici'], category: 'food', estSavingInr: 900, lastVerified: '2026-11-11', status: 'verified',
      steps: ['Remove ICICI Amazon Pay as the saved card in Swiggy.', 'Set HDFC Swiggy as default.', '10% back credits as cashback, capped at ₹1,500 a month.'],
      sources: [{ label: 'HDFC Swiggy card terms', type: 'issuer' }, { label: 'r/CreditCardsIndia thread', type: 'reddit' }] },
    { id: 'tip_a4', title: 'Amex MRCC: 4 spends of ₹1,500 earn 1,000 bonus points', cardIds: ['c_amex'], category: 'general', estSavingInr: 400, lastVerified: '2026-10-20', status: 'needs_review',
      steps: ['Enrol in the bonus offer.', 'Make 4 separate ₹1,500+ spends in a calendar month.'],
      sources: [{ label: 'Forum post', type: 'forum' }] },
    { id: 'tip_a5', title: 'Plan big buys to hit the HDFC milestone by March', cardIds: ['c_hdfc'], category: 'general', estSavingInr: 1500, lastVerified: '2026-11-09', status: 'verified',
      steps: ['Check how much is left on the milestone in Rewards.', 'Move planned electronics or insurance payments to this card.', 'Avoid wallet loads; they do not count.'],
      sources: [{ label: 'HDFC milestone terms', type: 'issuer' }, { label: 'Milestone walkthrough', type: 'youtube' }] },
    { id: 'tip_a6', title: 'HSBC Live+ gives 10% on dining', cardIds: ['ext_hsbc_live'], category: 'food', estSavingInr: 1200, lastVerified: '2026-11-02', status: 'verified',
      steps: ['Apply for the card.', 'Use it at restaurants.'], sources: [{ label: 'Issuer page', type: 'issuer' }] },
  ];
  const offers: OffersFile = {
    suggestions: suggestions([
      { id: 's_hdfc_infinia', issuer: 'HDFC', name: 'Infinia (sample)', annualFee: 12500, isPartner: true,
        rewardRules: [{ category: 'all', ratePct: 3.3 }] },
      { id: 's_hsbc_live', issuer: 'HSBC', name: 'Live+ (sample)', annualFee: 999, isPartner: false,
        rewardRules: [{ category: 'food', ratePct: 10, monthlyCap: 1000 }, { category: 'groceries', ratePct: 10, monthlyCap: 1000 }, { category: 'all', ratePct: 1.5 }] },
    ], cards, txns),
    deals: DEALS,
  };
  const limits: CategoryLimit[] = [
    { category: 'food', monthlyLimit: 15000, excludeShared: true },
    { category: 'shopping', monthlyLimit: 30000, excludeShared: true },
  ];
  return { cards: withOutstanding(cards, txns), transactions: txns, limits, benefits, charges, tips, circles: { circles: [], memberCardOffers: [] } as CirclesFile, offers };
}

/* ================= KARAN ================= */
function karan() {
  const cards: Card[] = [
    { id: 'c_sbi', issuer: 'SBI', name: 'SimplyCLICK (sample)', last4: '5530', network: 'Visa', limit: 60000, outstanding: 0, billDay: 10, dueDay: 30, color: '#7C3AED',
      rewardRules: [{ category: 'shopping', ratePct: 5, monthlyCap: 500 }, { category: 'all', ratePct: 1 }],
      pointsBalance: 1450, pointValueInr: 0.25, isPaytmCobrand: false },
    { id: 'c_kotak', issuer: 'Kotak', name: '811 (sample)', last4: '1186', network: 'RuPay', limit: 40000, outstanding: 0, billDay: 3, dueDay: 23, color: '#DC2626',
      rewardRules: [{ category: 'food', ratePct: 2, monthlyCap: 200 }, { category: 'all', ratePct: 1 }],
      pointsBalance: 600, pointValueInr: 0.25, isPaytmCobrand: false },
  ];
  const txns = generate({
    id: 'karan', seed: 37, prefix: 3000, city: 'LKO', cards,
    local: { food: [{ raw: 'PYTM*TUNDAY KABABI AMN', name: 'Tunday Kababi, Aminabad' }] },
    months: [
      // October: 20 txns incl. the shared Goa hotel (₹12,500, ₹10,000 recoverable)
      { y: 2026, m: 10, from: 1, to: 31, spec: { food: [7, 4200], groceries: [3, 2600], shopping: [3, 5400], travel: [2, 14500], bills: [3, 3100], entertainment: [2, 1700] } },
      // November to date: 10 txns, ₹9,600
      { y: 2026, m: 11, from: 1, to: 15, spec: { food: [4, 2100], groceries: [2, 1500], shopping: [1, 3200], bills: [2, 2000], entertainment: [1, 800] } },
    ],
    fixed: [{
      id: 't_3500', cardId: 'c_sbi', amount: 12500, timestamp: '2026-10-18T21:10:00+05:30',
      rawDescriptor: 'MAKEMYTRIP INDIA PVT', merchantDisplayName: 'MakeMyTrip · Hotel, Baga (Goa trip)', merchantSource: 'paytm_network',
      confidence: 0.97, category: 'travel', source: 'sms', isShared: true, circleId: 'circle_goa', recoverableAmount: 10000,
    }],
    assign: prefer({ shopping: 'c_sbi', food: 'c_kotak', entertainment: 'c_sbi', travel: 'c_sbi' }, 'c_kotak'),
  });
  const q = (id: string) => spendOn(txns, id, QUARTER_START);
  const circles: CirclesFile = {
    circles: [
      { id: 'circle_family', name: 'Family', type: 'family',
        members: [
          { id: 'm_karan', name: 'Karan (you)', cards: [{ issuer: 'SBI', name: 'SimplyCLICK' }, { issuer: 'Kotak', name: '811' }] },
          { id: 'm_riya', name: 'Riya (sister)', cards: [{ issuer: 'ICICI', name: 'Amazon Pay' }] },
          { id: 'm_mom', name: 'Mom', cards: [{ issuer: 'HDFC', name: 'MoneyBack+' }] },
          { id: 'm_dad', name: 'Dad', cards: [{ issuer: 'Axis', name: 'ACE' }] },
        ],
        splits: [{ id: 's_diwali', title: 'Diwali groceries', category: 'groceries', amount: 4800, payerId: 'm_mom', date: '2026-10-28',
          shares: ['m_karan', 'm_riya', 'm_mom', 'm_dad'].map((memberId) => ({ memberId, amount: 1200, settled: true })) }],
        monthlyPaidForOthers: 18000, monthlyCap: 25000 },
      { id: 'circle_goa', name: 'Goa trip', type: 'trip',
        members: [
          { id: 'm_karan', name: 'Karan (you)', cards: [{ issuer: 'SBI', name: 'SimplyCLICK' }, { issuer: 'Kotak', name: '811' }] },
          { id: 'm_aman', name: 'Aman', cards: [{ issuer: 'HDFC', name: 'Regalia Gold' }] },
          { id: 'm_sneha', name: 'Sneha', cards: [{ issuer: 'SBI', name: 'Cashback' }] },
          { id: 'm_vikram', name: 'Vikram', cards: [{ issuer: 'Axis', name: 'Flipkart' }] },
          { id: 'm_pooja', name: 'Pooja', cards: [{ issuer: 'IDFC FIRST', name: 'Select' }] },
        ],
        splits: [
          { id: 's_hotel', title: 'Hotel booking, Baga', category: 'travel', amount: 12500, payerId: 'm_karan', date: '2026-10-18',
            shares: [
              { memberId: 'm_karan', amount: 2500, settled: true }, { memberId: 'm_aman', amount: 2500, settled: true },
              { memberId: 'm_sneha', amount: 2500, settled: false }, { memberId: 'm_vikram', amount: 2500, settled: false },
              { memberId: 'm_pooja', amount: 2500, settled: true },
            ] },
          { id: 's_scuba', title: 'Scuba diving', category: 'entertainment', amount: 6000, payerId: 'm_aman', date: '2026-10-20',
            shares: ['m_karan', 'm_aman', 'm_sneha', 'm_vikram', 'm_pooja'].map((memberId) => ({ memberId, amount: 1200, settled: true })) },
        ],
        monthlyPaidForOthers: 10000, monthlyCap: 25000 },
    ],
    memberCardOffers: [
      { memberId: 'm_riya', cardName: 'ICICI Amazon Pay', category: 'shopping', ratePct: 10, maxSaving: 3500, note: '10% instant discount on phones and electronics (sample offer)' },
      { memberId: 'm_karan', cardName: 'SBI SimplyCLICK', category: 'shopping', ratePct: 5, maxSaving: 500, note: '5X rewards online, capped at ₹500 a month' },
      { memberId: 'm_mom', cardName: 'HDFC MoneyBack+', category: 'groceries', ratePct: 5, maxSaving: 500, note: '10X points on BigBasket and Swiggy' },
      { memberId: 'm_dad', cardName: 'Axis ACE', category: 'bills', ratePct: 5, maxSaving: 500, note: '5% on bill payments via Google Pay' },
      { memberId: 'm_aman', cardName: 'HDFC Regalia Gold', category: 'travel', ratePct: 5, maxSaving: 2000, note: '5X on travel bookings via SmartBuy' },
      { memberId: 'm_sneha', cardName: 'SBI Cashback', category: 'shopping', ratePct: 5, maxSaving: 5000, note: '5% on online spends' },
      { memberId: 'm_vikram', cardName: 'Axis Flipkart', category: 'shopping', ratePct: 5, maxSaving: 4000, note: '5% on Flipkart' },
      { memberId: 'm_pooja', cardName: 'IDFC FIRST Select', category: 'travel', ratePct: 3, maxSaving: 1000, note: '3X on travel' },
    ],
  };
  const benefits: BenefitsFile = {
    benefits: [
      { id: 'b_sbi_online', cardId: 'c_sbi', title: '5X rewards online', type: 'automatic', description: 'On Amazon, Myntra, BookMyShow and other partner sites. Capped at ₹500 a month.' },
      { id: 'b_sbi_voucher', cardId: 'c_sbi', title: '₹500 travel voucher', type: 'threshold', description: 'Spend ₹40,000 this quarter to get a ₹500 travel voucher.', condition: { spendRequired: 40000, spendSoFar: q('c_sbi'), periodEnd: '2026-12-31' } },
      { id: 'b_kotak_movie', cardId: 'c_kotak', title: 'Free movie ticket each quarter', type: 'needs_action', description: 'Book on PVR INOX with the card to get 1 ticket free (up to ₹200).', used: 0, total: 1 },
    ],
    milestones: [{ id: 'm_sbi', cardId: 'c_sbi', title: 'Annual fee reversal', target: 100000, progress: 22000 + q('c_sbi'), reward: 'an annual fee reversal worth ₹499', deadline: '2027-03-31' }],
    expiries: [{ id: 'e_sbi_vch', cardId: 'c_sbi', kind: 'voucher', value: 500, expiresOn: '2026-12-31' }],
    devaluations: [],
  };
  const tips: Tip[] = [
    { id: 'tip_k1', title: 'Book movies on BookMyShow with SimplyCLICK for 5X', cardIds: ['c_sbi'], category: 'entertainment', estSavingInr: 120, lastVerified: '2026-11-13', status: 'verified',
      steps: ['Open BookMyShow and pick your show.', 'Pay with SBI SimplyCLICK.', 'Points credit on the next statement.'],
      sources: [{ label: 'SBI SimplyCLICK partners list', type: 'issuer' }, { label: 'r/CreditCardsIndia thread', type: 'reddit' }] },
    { id: 'tip_k2', title: 'Let the friend with the best card pay for group bookings', cardIds: ['c_sbi', 'c_kotak'], category: 'travel', estSavingInr: 1200, lastVerified: '2026-11-11', status: 'verified',
      steps: ['Open your circle and tap "Who should pay?".', 'Enter the merchant and amount.', 'The top-ranked member pays and the app splits it.', 'Settle your share over UPI.'],
      sources: [{ label: 'Group travel hacks (video)', type: 'youtube' }] },
    { id: 'tip_k3', title: 'Convert big buys to no-cost EMI on Kotak 811', cardIds: ['c_kotak'], category: 'shopping', estSavingInr: 300, lastVerified: '2026-10-15', status: 'needs_review',
      steps: ['Pick no-cost EMI at checkout.', 'Check the processing fee before confirming.'], sources: [{ label: 'Forum post', type: 'forum' }] },
  ];
  const offers: OffersFile = {
    suggestions: suggestions([
      { id: 's_paytm_select', issuer: 'Paytm SBI', name: 'Paytm SBI Card SELECT (sample)', annualFee: 1499, isPartner: true,
        rewardRules: [{ category: 'bills', ratePct: 3 }, { category: 'entertainment', ratePct: 5, monthlyCap: 500 }, { category: 'all', ratePct: 1 }] },
      { id: 's_hdfc_swiggy', issuer: 'HDFC', name: 'Swiggy (sample)', annualFee: 500, isPartner: false,
        rewardRules: [{ category: 'food', ratePct: 10, monthlyCap: 1500 }, { category: 'shopping', ratePct: 5, monthlyCap: 1500 }, { category: 'all', ratePct: 1 }] },
    ], cards, txns),
    deals: DEALS,
  };
  const limits: CategoryLimit[] = [
    { category: 'food', monthlyLimit: 5000, excludeShared: true },
    { category: 'shopping', monthlyLimit: 6000, excludeShared: true },
  ];
  return { cards: withOutstanding(cards, txns), transactions: txns, limits, benefits, charges: [
    { id: 'ch_k_int', cardId: 'c_kotak', statementMonth: '2026-10', type: 'interest', amount: 85, reversible: false, note: 'Interest on ₹1,900 carried over for 14 days.' },
  ] as Charge[], tips, circles, offers };
}

/* ---------- write + verify ---------- */
const personas: Persona[] = [
  { id: 'neha', name: 'Neha', archetype: 'Cautious Controller', age: 29, city: 'Pune', occupation: 'Salaried', monthlySpend: '₹50–70k a month', features: ['F1', 'F2', 'F4', 'F8'] },
  { id: 'arjun', name: 'Arjun', archetype: 'Reward Maximiser', age: 31, city: 'Bengaluru', occupation: 'IT professional', monthlySpend: '₹1.2–1.5 lakh a month', features: ['F3', 'F5', 'F6', 'F9', 'F10'] },
  { id: 'karan', name: 'Karan', archetype: 'Group Spender', age: 25, city: 'Lucknow', occupation: 'Early career', monthlySpend: '₹15–25k a month', features: ['F7', 'F9'] },
];
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'personas.json'), JSON.stringify(personas, null, 2) + '\n');

const all = { neha: neha(), arjun: arjun(), karan: karan() };
for (const [id, data] of Object.entries(all)) {
  const dir = join(OUT, id);
  mkdirSync(dir, { recursive: true });
  for (const [file, value] of Object.entries(data)) writeFileSync(join(dir, `${file}.json`), JSON.stringify(value, null, 2) + '\n');

  const t = data.transactions;
  const sum = (xs: Transaction[]) => xs.reduce((s, x) => s + x.amount, 0);
  const oct = t.filter((x) => x.timestamp.startsWith('2026-10'));
  const nov = t.filter((x) => x.timestamp.startsWith('2026-11'));
  const unresolved = t.filter((x) => x.merchantSource === 'unresolved' && x.confidence < 0.7).length;
  const noisy = t.filter((x) => x.merchantDisplayName && x.merchantDisplayName.toUpperCase() !== x.rawDescriptor).length;
  const missed = t.filter((x) => (x.missedReward ?? 0) > 0).length;
  const latest = t[0].timestamp;
  console.log(`\n${id}: ${t.length} txns · Oct ₹${sum(oct).toLocaleString('en-IN')} (${oct.length}) · Nov MTD ₹${sum(nov).toLocaleString('en-IN')} (${nov.length})`);
  console.log(`  unresolved<0.7: ${unresolved} · noisy+resolved: ${Math.round((noisy / t.length) * 100)}% · missed-reward rows: ${missed} · latest ${latest}`);
  for (const l of data.limits) {
    const s = nov.filter((x) => x.category === l.category).reduce((a, x) => a + x.amount - (l.excludeShared ? x.recoverableAmount ?? 0 : 0), 0);
    console.log(`  limit ${l.category}: ₹${s} / ₹${l.monthlyLimit} = ${((s / l.monthlyLimit) * 100).toFixed(1)}%`);
  }
  for (const m of data.benefits.milestones) console.log(`  milestone ${m.id}: ${m.progress}/${m.target} = ${((m.progress / m.target) * 100).toFixed(1)}%`);
  for (const s of data.offers.suggestions) console.log(`  suggestion ${s.name}: +₹${s.extraValuePerYear}/yr (fee ₹${s.annualFee}) — ${s.reason}`);
  if (unresolved !== 4) throw new Error(`${id}: expected 4 unresolved`);
  if (noisy / t.length < 0.2) throw new Error(`${id}: <20% noisy`);
  if (latest > DEMO_NOW) throw new Error(`${id}: txn after demo clock`);
  if (id === 'arjun' && missed !== 3) throw new Error('arjun: expected exactly 3 missed-reward transactions');
}
console.log('\n✓ mock data written to src/data/');
