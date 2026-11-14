/* The analyzer lives under /analyzer so the Paytm home mockup keeps "/".
   PRD routes map 1:1: PRD "/spends" → "/analyzer/spends". */
export const BASE = '/analyzer';
export const p = (path: string) => (path === '/' ? BASE : `${BASE}${path}`);

/** Strip the base so screens can reason in PRD route terms. */
export const prdPath = (pathname: string) => pathname.replace(/^\/analyzer/, '') || '/';

export const TAB_ROOTS = ['/', '/spends', '/rewards', '/circle', '/cards'];

export const inr = (n: number, frac = 0) =>
  '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: frac, maximumFractionDigits: frac });
