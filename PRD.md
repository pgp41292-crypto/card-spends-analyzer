# Card Spends Analyzer Prototype PRD
Nov 15, 2026 · @Govind  — transcribed from "Card Spends Analyzer Prototype PRD.pdf"

## How to use this PRD
Build a clickable, mobile-first mockup of a credit card spends and benefits analyzer inside the Paytm app, covering 10 features for 3 personas, using mock data only and no backend.

**Product in one line:** One place to see every credit card spend as it happens, control category budgets, and capture the rewards and benefits users currently lose.

**Instructions for the coding agent**
1. Read the whole document before writing code.
2. Follow the build order in the last section, one phase at a time, and run the app after each phase.
3. Use only the mock data described in "Mock data model". Do not call real APIs, read real SMS or collect real card numbers.
4. Every number shown in the UI must come from the mock data files, so totals, progress bars and alerts stay consistent across screens.
5. Where a spec says "simulate", build a visible developer control (the Demo panel) that triggers the event.
6. All reward rates, card names and offers are illustrative for a case study. Show a small "Prototype · sample data" label in the app header.
7. Features 11 and 12 are not specified yet. Leave a "Coming soon" placeholder in the More menu.

## Personas and priorities
Neha drives the P1 build, Arjun sets the product's upper ceiling, and Karan drives group usage and card applications.

| Persona | Profile | Core need | Features |
|---|---|---|---|
| Neha, Cautious Controller (primary) | Salaried, 29, Pune; 3 cards; ₹50–70k a month | Control spend as it happens; see rewards and benefits without optimising | F1, F2, F4, F8 |
| Arjun, Reward Maximiser (secondary) | IT professional, 31, Bengaluru; 5+ cards; ₹1.2–1.5 lakh a month | Highest return per transaction; one trusted place for tips | F3, F5, F6, F9, F10 |
| Karan, Group Spender (third) | Early career, 25, Lucknow; 1–2 cards; ₹15–25k a month | Best card in his friend or family group for shared purchases; easy settling | F7, F9 |

| ID | Feature | Priority |
|---|---|---|
| F1 | Real-time spend tracking (SMS + Paytm merchant data) | P1 |
| F2 | Intelligent category breakdown (Paytm merchant network names) | P1 |
| F4 | Real-time category limits | P1 |
| F8 | Benefit catalogue and milestone tracking | P1 |
| F3 | Hidden charges and interest detector | P2 |
| F5 | Transaction-level card optimisation | P2 |
| F6 | Verified tips and tricks hub | P2 |
| F9 | Smart card suggestion | P2 |
| F7 | Credit Circle (group and family spends) | P3 |
| F10 | Dynamic discounting on Paytm co-branded cards | P3 |

The prototype opens as Neha. A persona switcher in the Demo panel loads Arjun's or Karan's data so every feature can be shown.

## Scope, stack and design system
The prototype is a front-end-only React app shown in a phone frame, with every event simulated from mock data.

**In scope:** all screens in "Information architecture", navigation between them, simulated live events (incoming payment, limit alert, expiry alert, split settled), consent screens for each data source, empty and loading states.

**Out of scope:** real SMS reading, real payments, login, backend, real issuer data, persistence beyond `localStorage`.

**Tech stack**
- React 18 + TypeScript + Vite
- Tailwind CSS for styling, with the tokens below set in `tailwind.config`
- React Router for navigation
- Recharts for donut, bar and line charts
- lucide-react for icons
- Zustand (or React context) for app state; mock data loaded from `/src/data/*.json`
- Layout: a 390 × 844 phone frame centred on a light grey desktop background; on screens under 430px wide, render full-screen without the frame

**Design tokens**

| Token | Value | Use |
|---|---|---|
| primary | #002970 | Headers, primary buttons, selected tab |
| accent | #00BAF2 | Highlights, links, progress fill |
| success | #27AE60 | Under limit, savings, settled |
| warning | #F2994A | 80% of limit, expiring soon |
| danger | #EB5757 | Over limit, charges, blocked |
| background | #F7F9FC | App background |
| surface | #FFFFFF | Cards and sheets |
| text | #101010 | Body text |
| muted | #707070 | Secondary text |
| border | #E0F5FD | Dividers, card outlines |

- **Font:** Inter; sizes 12 / 14 / 16 / 20 / 28; weights 400, 600, 700.
- **Shape:** card radius 16px, button radius 12px, chip radius 999px; spacing on a 4px grid; soft shadow `0 2px 8px rgba(0,41,112,0.08)`.
- **Branding:** use a plain text wordmark "paytm" in primary colour as a placeholder. Do not use the real logo file.

**Shared components**
- `AppHeader` (title, back button, "Prototype · sample data" label)
- `BottomNav` (5 tabs)
- `StatTile`, `Card`, `ProgressBar` (colour changes at 80% and 100%), `CategoryChip`, `CardChip` (bank name + last 4 digits)
- `BottomSheet`, `Toast` (simulates a push notification), `Badge`, `EmptyState`, `Skeleton`
- `ConsentSheet` (what is read, why, how to revoke)
- `DemoPanel` (floating button, dev controls)

## Information architecture
The app has 5 bottom tabs (Home, Spends, Rewards, Circle, Cards) and 15 routes, preceded by a one-time onboarding and consent flow.

| Route | Screen | Tab | Features |
|---|---|---|---|
| /onboarding | Welcome, link cards, choose data sources with consent | – | Trust layer |
| / | Home dashboard: month spend, limits at risk, expiring rewards, nearby deals | Home | F1, F4, F8, F10 |
| /spends | Live spend feed + category breakdown | Spends | F1, F2 |
| /spends/txn/:id | Transaction detail, fix category, tag as shared | Spends | F2, F7 |
| /spends/limits | Set and track category limits | Spends | F4 |
| /spends/charges | Hidden charges and interest | Spends | F3 |
| /rewards | Rewards and benefits hub across cards | Rewards | F8 |
| /rewards/card/:id | Card detail: benefits, milestones, devaluation log | Rewards | F8 |
| /rewards/best-card | Best card for a purchase | Rewards | F5 |
| /rewards/tips | Verified tips feed | Rewards | F6 |
| /rewards/tips/:id | Tip guide (steps, sources) | Rewards | F6 |
| /circle | My circles (family, trip, friends) | Circle | F7 |
| /circle/:id | Circle detail, who should pay, splits | Circle | F7 |
| /cards | My cards + suggested cards | Cards | F9 |
| /deals | Nearby perishable deals for Paytm card holders | Home | F10 |

**Navigation rules**
- Bottom nav is visible on all tab root screens and hidden on detail screens, which show a back arrow.
- Home tiles link to their detail screen: a limit tile opens /spends/limits, an expiry tile opens /rewards/card/:id, a deal tile opens /deals.
- A floating "Best card" button on Spends and Rewards opens /rewards/best-card as a bottom sheet.
- Settings, the persona switcher and the Features 11–12 placeholders live in a "More" menu in the Home header.

## Mock data model
All screens read from 8 JSON files per persona under `/src/data/<persona>/`, typed by the interfaces below.

```ts
type CategoryId = 'food' | 'groceries' | 'shopping' | 'travel' | 'fuel' | 'bills' | 'entertainment' | 'health' | 'others';

interface Card {
  id: string; issuer: string; name: string; last4: string; network: 'Visa' | 'Mastercard' | 'RuPay' | 'Amex';
  limit: number; outstanding: number; billDay: number; dueDay: number; color: string;
  rewardRules: { category: CategoryId | 'all'; ratePct: number; monthlyCap?: number; excluded?: boolean }[];
  pointsBalance: number; pointValueInr: number; isPaytmCobrand: boolean;
}

interface Transaction {
  id: string; cardId: string; amount: number; timestamp: string;
  rawDescriptor: string;            // exactly as in the bank SMS
  merchantDisplayName?: string;     // resolved via Paytm merchant network
  merchantSource: 'paytm_network' | 'user_corrected' | 'unresolved';
  confidence: number;               // 0-1, below 0.7 shows a "Confirm?" chip
  category: CategoryId; source: 'sms' | 'paytm' | 'statement';
  isShared?: boolean; circleId?: string; recoverableAmount?: number;
  rewardEarned: number; bestCardId?: string; missedReward?: number;
}

interface CategoryLimit { category: CategoryId; monthlyLimit: number; excludeShared: boolean }

interface Benefit {
  id: string; cardId: string; title: string;
  type: 'automatic' | 'needs_action' | 'threshold';
  description: string; used?: number; total?: number;
  condition?: { spendRequired: number; spendSoFar: number; periodEnd: string };
}

interface Milestone { id: string; cardId: string; title: string; target: number; progress: number; reward: string; deadline: string }
interface Expiry { id: string; cardId: string; kind: 'points' | 'voucher'; value: number; expiresOn: string }
interface Devaluation { id: string; cardId: string; date: string; change: string; impact: 'low' | 'medium' | 'high' }

interface Charge {
  id: string; cardId: string; statementMonth: string;
  type: 'interest' | 'late_fee' | 'annual_fee' | 'forex_markup' | 'gst' | 'other';
  amount: number; reversible: boolean; note: string;
}

interface Tip {
  id: string; title: string; cardIds: string[]; category: CategoryId | 'general';
  steps: string[]; estSavingInr: number; lastVerified: string;
  sources: { label: string; type: 'reddit' | 'youtube' | 'issuer' | 'forum' }[];
  status: 'verified' | 'needs_review';
}

interface Circle {
  id: string; name: string; type: 'family' | 'trip' | 'friends';
  members: { id: string; name: string; cards: { issuer: string; name: string }[] }[];
  splits: { id: string; title: string; category: CategoryId; amount: number; payerId: string;
            shares: { memberId: string; amount: number; settled: boolean }[]; date: string }[];
  monthlyPaidForOthers: number; monthlyCap: number;
}

interface CardSuggestion { id: string; issuer: string; name: string; annualFee: number; extraValuePerYear: number; reason: string; isPartner: boolean }
interface Deal { id: string; merchant: string; distanceKm: number; item: string; discountPct: number; validUntil: string; requiresPaytmCobrand: true }
```

**Rules for generating mock data**
- Neha: 3 cards (HDFC cashback card, SBI fuel card, a Paytm co-branded card), 60 transactions over the last 45 days, monthly spend about ₹62,000, limits set for food, shopping and entertainment, with food at 82% of its limit.
- Arjun: 5 cards, 90 transactions, about ₹1.3 lakh a month, 2 active milestones (one at 88%), 1 devaluation in the last 30 days, 3 transactions where a better card would have earned more.
- Karan: 2 cards, 30 transactions, 2 circles ("Family" with 4 members, "Goa trip" with 5), 3 splits with one still unsettled.
- At least 20% of transactions use noisy descriptors like `TOWER 5IAND5J BUNDLTECHNO`, `RAZ*SWIGGY BLR` or `PYTM*SHARMA GEN STORE`, each with a resolved display name.
- 4 transactions have confidence below 0.7 and `merchantSource: 'unresolved'`.
- Card names and reward rates are illustrative; label them as sample data in the UI.

**Sample transaction**
```json
{
  "id": "t_1042", "cardId": "c_hdfc", "amount": 186, "timestamp": "2026-11-13T14:55:19+05:30",
  "rawDescriptor": "TOWER 5IAND5J BUNDLTECHNO", "merchantDisplayName": "Swiggy (legal name: Bundl Technologies)",
  "merchantSource": "paytm_network", "confidence": 0.92, "category": "food", "source": "sms",
  "rewardEarned": 9.3, "bestCardId": "c_hdfc", "missedReward": 0
}
```

## P1 features
These four features make up Neha's core experience and must be fully clickable and connected to each other.

### F1 Real-time spend tracking
**Goal:** Show every card spend within seconds of payment, across all cards.
**Screens:** Home ("Spent this month" tile, last 3 transactions) and /spends (live feed grouped by day).
**UI details**
- Each feed row shows: merchant display name, raw descriptor in muted 12px text beneath, amount, `CardChip`, category icon, and a source badge (SMS, Paytm or Statement).
- Header filter chips: All cards, then one chip per card.
- Top summary: total spent this month, the same day last month, and the difference.
**Interactions**
- Demo panel "Simulate payment" picks a random merchant and amount, shows a `Toast` ("₹450 at Swiggy · HDFC ••6451 · Food & Dining"), adds the row to the top of the feed with a 1-second highlight, and updates every total and limit on all screens.
- Tapping a row opens /spends/txn/:id.
**States:** Empty (no cards linked: "Link a card to start tracking"), loading skeleton, and an iOS notice: "Live tracking needs SMS access on Android. On iPhone, spends update from statements."
**Acceptance:** A simulated payment appears in the feed, Home total, category breakdown and limit bar within 1 second, with matching numbers everywhere.

### F2 Intelligent category breakdown
**Goal:** Turn noisy bank descriptors into recognisable merchants and accurate categories using Paytm merchant network data.
**Screens:** /spends (breakdown section above the feed) and /spends/txn/:id.
**UI details**
- Donut chart of spend by category for the selected month with total in the centre; legend list with amount, percentage and change vs last month.
- Month selector (last 3 months) and card filter.
- Transaction detail shows a "How we identified this" card: raw descriptor → resolved name, with a source label ("Matched from Paytm merchant network" or "Unresolved") and confidence.
- Rows with confidence below 0.7 show a "Confirm?" chip.
**Interactions**
- Tapping a category filters the feed to that category.
- "Fix category" opens a `BottomSheet` with category chips and a "Rename merchant" field. Saving updates the row, the donut and the limits, sets `merchantSource: 'user_corrected'` and shows "Thanks. This helps others too."
**Acceptance:** Correcting a category moves the amount between categories in the donut and the limit bars immediately.

### F4 Real-time category limits
**Goal:** Let users set monthly limits per category and get warned as they approach them.
**Screens:** /spends/limits, plus a "Limits at risk" tile on Home.
**UI details**
- One row per category: icon, spent / limit, `ProgressBar` (accent below 80%, warning at 80–99%, danger at 100%+), days left in month, and suggested daily allowance.
- "Set limit" opens a sheet with a slider and quick picks (last month's spend, 3-month average, custom).
- Toggle "Exclude shared spends I'll get back" (default on), linked to F7 tagging.
**Interactions**
- When a simulated payment pushes a category past 80% or 100%, show a `Toast` ("You've used 82% of your Food limit with 9 days left") and a banner on Home.
- Tapping the Home tile opens /spends/limits scrolled to that category.
**Acceptance:** Thresholds fire once per category per level, and percentages always match the feed totals.

### F8 Benefit catalogue and milestone tracking
**Goal:** Show every benefit and reward across cards in one place, including what is unused, expiring or changed.
**Screens:** /rewards (hub) and /rewards/card/:id.
**UI details**
- Hub top: total reward value across cards in ₹ and "Expiring in 30 days" (₹ value, count).
- Section "Milestones": card, target, `ProgressBar`, "₹12,400 more by 31 Mar to unlock a ₹1,500 voucher".
- Section "Benefits you're not using": e.g. "2 of 4 lounge visits unused this quarter" or "Purchase protection on electronics".
- Card detail tabs: Benefits (grouped Automatic / Needs action / Spend condition), Milestones, Rewards (balance, value, expiry list), Changes (devaluation log as a dated list with impact badge).
- Benefits with a spend condition show progress, e.g. "Lounge access: spend ₹15,000 this quarter to unlock (₹9,800 spent)".
**Interactions**
- Demo panel "Simulate expiry alert" shows a `Toast` ("1,200 points (≈₹300) on your HDFC card expire in 7 days") linking to the card detail.
- "How to use" on any benefit opens a sheet with steps.
**Acceptance:** Milestone progress uses the same transactions as F1, so a simulated payment on that card moves the milestone bar.

## P2 features
These four features serve Arjun and should be fully clickable, but can use simpler layouts than P1.

### F3 Hidden charges and interest detector
**Goal:** Surface interest, late fees, forex markup and other charges from statements so users can act on them.
**Screens:** /spends/charges, reached from a Home tile ("₹1,240 in charges this quarter").
**UI details**
- Optional "Add statement" step with a `ConsentSheet` ("We read charges and totals only. Delete anytime.") and a mock upload that shows a 2-second parsing animation.
- Summary: total charges this quarter, split by type in a horizontal bar.
- List of `Charge` items: type badge, card, statement month, amount, note (e.g. "Late fee: paid 2 days after due date").
- Items marked reversible show "Ask for reversal" (opens a sheet with a ready-to-copy message to the issuer) and "Turn on bill reminder".
**Acceptance:** Totals match the listed charges; the empty state reads "No charges found. Nice!"

### F5 Transaction-level card optimisation
**Goal:** Tell the user which of their cards earns the most for a specific purchase.
**Entry points (all three must work)**
1. Scan QR (simulated): Demo panel "Simulate QR scan at Swiggy" opens the payment sheet with the merchant pre-filled.
2. Paytm checkout sheet: before paying, a strip says "Best card here: HDFC ••6451 · earns ₹45".
3. Manual: /rewards/best-card with merchant search and amount field.
**UI details**
- Ranked list of the user's cards: expected reward in ₹, effective rate, and a one-line reason ("5% on food delivery").
- Warnings on cards where they apply: "Monthly cap reached", "Category excluded", "Counts toward milestone: ₹12,400 left".
- Primary button "Pay with HDFC ••6451" completes a mock payment and adds the transaction to F1.
**Acceptance:** The ranking uses each card's `rewardRules` and caps; paying through it updates the feed, limits and milestones.

### F6 Verified tips and tricks hub
**Goal:** One trusted, up-to-date place for card tips, filtered to the user's cards.
**Screens:** /rewards/tips and /rewards/tips/:id.
**UI details**
- Filter chips: For my cards (default), Travel, Dining, Shopping, Milestones.
- Tip card: title, matching `CardChip`s, estimated saving, "Verified 3 days ago" badge, source icons (Reddit, YouTube, issuer, forum).
- Tip detail: numbered steps, sources list, "Works with your HDFC card" tag, buttons "Mark as tried" and "Report outdated".
- Footer note on the feed: "Tips are summarised by AI from public posts, checked against issuer terms. Tips that break card terms are excluded."
**Acceptance:** "For my cards" only shows tips whose `cardIds` match the persona's cards; `needs_review` tips show a grey "Under review" badge and cannot be marked as tried.

### F9 Smart card suggestion
**Goal:** Recommend a new card based on the user's actual spending, with a clear value estimate.
**Screens:** /cards ("Suggested for you" section) and a sheet for each suggestion.
**UI details**
- Suggestion card: card name, annual fee, "Could earn ₹3,200 more a year", reason ("You spend ₹8,500 a month on food delivery").
- Detail sheet: comparison table of current best card vs suggested card by category (from the last 6 months of mock data), net value after annual fee.
- "Partner" badge on cards where Paytm earns a referral fee, plus a note "Ranked by value to you, not by partnership."
- Button "Check eligibility" goes to a mock success screen.
**Acceptance:** The suggested card's extra value is calculated from the persona's transactions and rules, and the sheet shows the calculation.

## P3 features
These two features show where the product goes next; build them as working demos with clear guardrails on screen.

### F7 Credit Circle
**Goal:** Let friends and family find the best card in their group for a shared purchase, split the cost and settle through UPI, without enabling card misuse or cash-out.
**Screens:** /circle and /circle/:id.
**UI details**
- Circle list: name, type icon (family, trip, friends), members' avatars, "You're owed ₹2,400" or "You owe ₹800".
- "Create circle" sheet: name, type, add members from contacts (mock), and an opt-in consent: "Share which cards you hold (names only, never numbers)."
- Circle detail:
  - Members with their card names (no numbers or limits).
  - **"Who should pay?"**: enter merchant, category and amount; the app ranks members by best reward or offer on their cards ("Riya's ICICI card gives 10% on this booking, saving ₹1,200").
  - Splits list: title, payer, amount, each member's share with settled or pending status, and a "Pay via UPI" button for pending shares.
- **Guardrails, shown in the UI:**
  - Allowed categories only: dining, travel, bookings, events, electronics, groceries, household bills. Choosing wallet loads, gift cards or prepaid cards shows "Splits aren't available for cash-like purchases."
  - A meter "Paid for others this month: ₹18,000 of ₹25,000 cap".
  - If one member repeatedly pays and is always repaid by the same person, show an amber notice: "This circle has frequent one-way repayments. Splits are paused for review." Trigger it from the Demo panel.
  - Every split needs confirmation from all members.
- **Family add-on nudge:** when the same member pays family purchases 3+ times in a month, show "Add Mom as an add-on cardholder so you both earn toward the same milestone."

**Links to P1:** the payer's share for others is tagged `isShared` with a `recoverableAmount`, and F4 limits exclude it when "Exclude shared spends" is on.
**Acceptance:** Creating a split updates the payer's feed (tagged Shared), circle balances and limit calculations; settling a share via mock UPI marks it settled and reduces "You're owed".

### F10 Dynamic discounting on Paytm co-branded cards
**Goal:** Let nearby Paytm merchants broadcast time-limited discounts on perishables to customers holding a Paytm co-branded card.
**Screens:** /deals and a "Deals near you" strip on Home.
**UI details**
- Deal card: merchant name, distance, item ("Fresh bread and buns"), discount ("30% off"), countdown ("until 9:00 PM"), "Paytm card only" badge.
- For users without a Paytm co-branded card, show deals greyed out with "Get the Paytm card to unlock deals like this" (links to F9).
- Optional merchant preview: a simple mock "Broadcast a deal" form (item, discount, end time) reached from the Demo panel, showing how a shop would send it.
- Label the screen "Later phase" in the header.
**Acceptance:** The countdown updates live; tapping "Pay at store" opens the F5 payment sheet with the Paytm card pre-selected and the discount applied.

## Demo flows and acceptance criteria
The prototype is done when these 4 scripted flows run end to end without dead ends, each in under 90 seconds.

**Flow A: Trust and onboarding (all personas)**
1. Open /onboarding, see 3 cards detected from SMS (mock), and confirm them.
2. Choose data sources, each with a `ConsentSheet`: SMS (Android, transaction alerts only), statement upload (optional), Account Aggregator (marked "Coming soon"), manual entry.
3. Land on Home with data loaded.

**Flow B: Neha stays in control (F1, F2, F4, F8)**
1. Simulate a ₹640 food payment; the toast appears and the feed, donut and Home update.
2. The Food limit crosses 80% and a limit alert shows.
3. Open the transaction, see the raw descriptor resolved to a merchant name, and correct a low-confidence one.
4. Open Rewards and see the unused lounge benefit and a voucher expiring in 7 days.

**Flow C: Arjun maximises (F5, F8, F6, F9, F3)**
1. Simulate a QR scan at a food delivery merchant; the payment sheet ranks his cards with expected rewards and a cap warning on one card.
2. Pay with the top card; the milestone bar moves on that card.
3. Open a verified tip for his travel card and view its sources.
4. Open Cards and see a suggested card with the value calculation.
5. Open Charges and see a reversible late fee with a ready-to-copy reversal message.

**Flow D: Karan's family purchase (F7, F4, F10)**
1. In the "Family" circle, ask "Who should pay?" for a ₹32,000 phone.
2. The app recommends his sister's card for a 10% offer; she pays, and a 4-way split is created.
3. Karan settles his share via mock UPI; balances update.
4. Show a blocked gift-card split and the monthly cap meter.
5. Open Deals and see a perishables deal greyed out with the Paytm card prompt.

**Global acceptance criteria**
- [ ] Works at 390 × 844 inside the phone frame and full-screen on mobile widths.
- [ ] All 15 routes are reachable, with no dead buttons; anything not built shows a "Coming soon" toast.
- [ ] One shared state store: the same numbers appear on every screen after any simulated event.
- [ ] Every list has empty and loading states.
- [ ] Text contrast meets WCAG AA; tap targets are at least 44px.
- [ ] No real APIs, no real card numbers (last 4 digits only), and a "Prototype · sample data" label in the header.
- [ ] Demo panel includes: persona switcher, simulate payment, simulate QR scan, simulate expiry alert, simulate one-way repayment flag, reset data.
- [ ] No console errors; `npm run build` passes.

## Build order
1. **Foundation:** Vite + React + TS + Tailwind setup, design tokens, phone frame, `AppHeader`, `BottomNav`, routes with placeholder screens, shared components.
2. **Data and state:** TypeScript types, mock data for all 3 personas following the generation rules, shared store, persona switcher and reset in the Demo panel.
3. **P1:** Onboarding and consent (Flow A), then F1, F2, F4, F8, wired together through the store (Flow B).
4. **P2:** F5 (all three entry points), F3, F6, F9 (Flow C).
5. **P3:** F7 with guardrails, then F10 (Flow D).
6. **Polish:** empty and loading states, toasts, transitions, accessibility checks, and the global acceptance checklist.
