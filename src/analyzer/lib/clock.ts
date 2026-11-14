/* Fixed demo clock so "this month", days-left and comparisons are stable whenever the prototype is opened.
   Dependency-free so scripts/generate-mock-data.ts can import it too. */
export const DEMO_NOW = '2026-11-15T18:00:00+05:30';
export const DEMO_MONTH = DEMO_NOW.slice(0, 7);            // '2026-11'
export const PREV_MONTH = '2026-10';
export const TRACK_START = '2026-10-01';                   // 45 days of history (PRD rule)
export const TRACKED_MONTHS = 1.5;                         // 45 days ÷ 30
export const QUARTER_START = '2026-10-01';                 // Oct–Dec quarter
export const DAYS_IN_MONTH = 30;                           // November
export const TODAY = Number(DEMO_NOW.slice(8, 10));        // 15
export const DAYS_LEFT = DAYS_IN_MONTH - TODAY;            // 15

export const istStamp = (y: number, m: number, d: number, hh: number, mi: number, ss = 0) =>
  `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T${String(hh).padStart(2, '0')}:${String(mi).padStart(2, '0')}:${String(ss).padStart(2, '0')}+05:30`;

/** Demo clock that keeps ticking: DEMO_NOW + real time elapsed since the app loaded (for live countdowns). */
const APP_START = Date.now();
export const liveNowMs = () => Date.parse(DEMO_NOW) + (Date.now() - APP_START);
