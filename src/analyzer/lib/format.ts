/* Date helpers. Timestamps are IST strings, so we read their parts directly (no timezone drift). */
import { DEMO_NOW } from './clock';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ymd = (s: string) => s.slice(0, 10);
const utcDay = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));

export const fmtDate = (s: string) => `${+s.slice(8, 10)} ${MONTHS[+s.slice(5, 7) - 1]}`;
export const fmtDateYear = (s: string) => `${fmtDate(s)} ${s.slice(0, 4)}`;
export const fmtMonth = (ym: string) => MONTHS[+ym.slice(5, 7) - 1];
export const fmtMonthLong = (ym: string) =>
  ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][+ym.slice(5, 7) - 1];
export function fmtTime(ts: string) {
  const h = +ts.slice(11, 13), m = ts.slice(14, 16);
  return `${h % 12 || 12}:${m} ${h < 12 ? 'AM' : 'PM'}`;
}
/** Whole days from the demo clock's date to `date` (negative = past). */
export const daysUntil = (date: string) => Math.round((utcDay(ymd(date)) - utcDay(ymd(DEMO_NOW))) / 86_400_000);

export function dayLabel(ts: string) {
  const diff = daysUntil(ts);
  if (diff === 0) return 'Today';
  if (diff === -1) return 'Yesterday';
  return `${DAYS[new Date(utcDay(ymd(ts))).getUTCDay()]}, ${fmtDate(ts)}`;
}

export const pct = (n: number) => `${Math.round(n)}%`;
