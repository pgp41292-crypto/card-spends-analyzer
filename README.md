# Card Spends Analyzer: clickable prototype

A front-end-only prototype of a credit card spends and benefits analyzer inside a Paytm-style app, built from [PRD.md](PRD.md).
Everything uses **sample data**: no real APIs, SMS, payments or card numbers (last 4 digits only).

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
```

- `/` is the Paytm home mockup. Tap **Track Your Spends** (Free Tools row) to open the analyzer.
- `/analyzer` opens the analyzer directly. The first visit goes through onboarding.
- Wider than 430px it renders in a 390 × 844 phone frame; narrower, it fills the screen.

| Command | What it does |
|---|---|
| `npm run build` | Type-check and production build (`dist/`) |
| `npm run preview` | Serve the production build |
| `npm run data:generate` | Regenerate mock data in `src/data/` (seeded, deterministic) |
| `npm run data:check` | Ledger sanity checks for Flows B and D |

## Demo panel

The floating **Demo** button (bottom-left) has the persona switcher (Neha, Arjun, Karan) and these simulated events:
- a random payment
- a ₹640 food payment (Flow B)
- a QR scan at Swiggy
- an expiry alert
- a one-way repayment flag
- a merchant deal broadcast

It also has **Reset data** and **Replay onboarding**. State persists in localStorage.

The app clock is fixed at **15 Nov 2026, 6 PM IST** so "this month", days left and countdowns are stable (deal countdowns tick in real time from there).

## Demo flows (each under 90 seconds)

| Flow | Persona | Steps |
|---|---|---|
| A: Trust & onboarding | any | Track Your Spends → Get started → Confirm 3 cards → toggle SMS / Statement / Manual (each opens a consent sheet) → Continue |
| B: Stays in control | Neha | Demo → *Simulate ₹640 food payment* (toast + "82% of your Food limit") → Spends → open a **Confirm?** row → Fix category → Rewards (2 of 4 lounge visits unused, ₹500 voucher in 7 days) |
| C: Maximises | Arjun | Demo → *Simulate QR scan at Swiggy* (HDFC ranked first, ICICI "Monthly cap reached") → Pay → milestone moves → Rewards → Tips → Axis Travel EDGE → Cards → HSBC Live+ calculation → Home → Charges → Ask for reversal |
| D: Family purchase | Karan | Circle → Family → Who should pay? Electronics ₹32,000 (Riya's card saves ₹3,200) → Riya pays · split 4 ways → Pay via UPI → Gift cards (blocked) + cap meter → Home → Deals near you (greyed, Paytm card prompt) |

## Structure

```
src/
  Home.tsx, Receive.tsx, art.tsx    Paytm home mockup (plain CSS)
  analyzer/                         Card Spends Analyzer (Tailwind, lazy-loaded)
    AnalyzerApp.tsx                 phone frame, routes (all under /analyzer), overlays
    screens/                        one file per PRD route
    components/                     PRD shared components, sheets, Demo panel
    lib/                            pure logic: rewards, ledger, selectors, alerts, best card, circles
    store/                          Zustand: data (per persona) + UI
    types.ts                        PRD data model (+ marked extensions)
  data/<persona>/*.json             8 mock data files per persona
scripts/                            data generator + ledger checks
```

Routes map 1:1 to the PRD with an `/analyzer` prefix (PRD `/spends` → `/analyzer/spends`).

## Deviations from the PRD (deliberate)

- **Neha's food limit is seeded at 74%**, so Flow B's ₹640 payment crosses 80% and lands on exactly 82% (the PRD's toast text).
- **45 days of history** (PRD data rule), so September is empty in the 3-month selector, and F9 averages over 1.5 months, not 6.
- **Type extensions**, marked in `types.ts`:
  - `CardSuggestion.rewardRules`, so F9 can calculate value
  - member card offers, for F7's "Who should pay?"
  - `confirmedBy` on splits
  - `pausedForReview` on circles
- **Colour tokens:** accent `#00BAF2` and warning `#F2994A` fail WCAG AA as text on white, so they're used for fills. Text on tints uses darker shades of each token.
