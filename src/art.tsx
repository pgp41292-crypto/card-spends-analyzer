/* Hand-drawn neutral glyphs + illustrations. No brand assets. */
import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };
const line = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

/* QR-scan glyph: corner brackets + 4 rounded squares */
export const ScanGlyph = ({ size = 24, ...p }: P) => (
  <svg {...line(size)} {...p}>
    <path d="M3 8V5.5A2.5 2.5 0 0 1 5.5 3H8M16 3h2.5A2.5 2.5 0 0 1 21 5.5V8M21 16v2.5a2.5 2.5 0 0 1-2.5 2.5H16M8 21H5.5A2.5 2.5 0 0 1 3 18.5V16" />
    <rect x="7" y="7" width="4" height="4" rx="1" />
    <rect x="13" y="7" width="4" height="4" rx="1" />
    <rect x="7" y="13" width="4" height="4" rx="1" />
    <rect x="13" y="13" width="4" height="4" rx="1" />
  </svg>
);

/* Contact card with upward arrow */
export const PayAnyoneGlyph = ({ size = 24, ...p }: P) => (
  <svg {...line(size)} {...p}>
    <path d="M14 3.5H7A2.5 2.5 0 0 0 4.5 6v12A2.5 2.5 0 0 0 7 20.5h10a2.5 2.5 0 0 0 2.5-2.5v-6" />
    <path d="M3 8h3M3 12h3M3 16h3" />
    <circle cx="12" cy="10.5" r="2.2" />
    <path d="M8.5 16.5a3.5 3.5 0 0 1 7 0" />
    <path d="M19 2.5v6M16.8 4.7 19 2.5l2.2 2.2" />
  </svg>
);

/* Receipt with ₹ */
export const BalanceGlyph = ({ size = 24, ...p }: P) => (
  <svg {...line(size)} {...p}>
    <rect x="5" y="3" width="14" height="18" rx="2.5" />
    <path d="M8.5 8h4M8.5 12h2M8.5 16h7" />
    <path d="M13.5 7.5h3M13.5 9.5h3M14.5 7.5c1.3 0 1.3 2 0 2l2 2.5" />
  </svg>
);

/* Generic "CASH BACK" text badge */
export const CashbackBadge = ({ w = 24, color = '#1B4FBF' }: { w?: number; color?: string }) => (
  <svg width={w} height={(w * 24) / 32} viewBox="0 0 32 24" aria-hidden>
    <rect x="1" y="1" width="30" height="22" rx="4" fill={color} />
    <text x="16" y="10.6" textAnchor="middle" fontSize="8.4" fontWeight="800" fill="#fff" fontFamily="Inter, system-ui">
      CASH
    </text>
    <text x="16" y="19.6" textAnchor="middle" fontSize="8.4" fontWeight="800" fill="#fff" fontFamily="Inter, system-ui">
      BACK
    </text>
  </svg>
);

/* Toll-tag card (neutral) */
export const TagCardGlyph = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <rect x="1.5" y="5" width="21" height="14" rx="2" fill="#DDEBFF" stroke="#16408C" strokeWidth="1.5" />
    <rect x="4" y="10" width="16" height="4" rx="1" fill="#F28C28" />
    <rect x="4" y="12" width="16" height="2" rx="1" fill="#2E9E47" />
  </svg>
);

/* "IPO" ticket */
export const IpoGlyph = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden>
    <path d="M4 10h20v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4z" fill="#DDEBFF" stroke="#16408C" strokeWidth="1.5" strokeLinejoin="round" />
    <text x="14" y="18" textAnchor="middle" fontSize="6.5" fontWeight="800" fill="#16408C" fontFamily="Inter, system-ui">IPO</text>
    <circle cx="14" cy="5.5" r="3" stroke="#16408C" strokeWidth="1.5" />
  </svg>
);

/* Metro: neutral text mark */
export const MetroMark = () => (
  <svg width="40" height="28" viewBox="0 0 40 28" aria-hidden>
    <text x="2" y="18" fontSize="9" fontStyle="italic" fontWeight="700" fill="#2E9E47" fontFamily="Inter, system-ui">metro</text>
    <path d="M30 6c4 2 4 8 0 10s-4 8 2 8" stroke="#C2378F" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    <path d="M33 4c-3 3 2 6 3 9" stroke="#C2378F" strokeWidth="1.2" fill="none" strokeLinecap="round" />
  </svg>
);

/* Generic placeholder QR — deterministic noise + finder patterns. Encodes nothing. */
export function QrPlaceholder({ size = 237, n = 25, seed = 7 }: { size?: number; n?: number; seed?: number }) {
  let s = seed;
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const inFinder = (x: number, y: number) =>
    (x < 8 && y < 8) || (x >= n - 8 && y < 8) || (x < 8 && y >= n - 8);
  const cells: JSX.Element[] = [];
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++)
      if (!inFinder(x, y) && rnd() > 0.52) cells.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />);
  const finder = (x: number, y: number) => (
    <g key={`f${x}${y}`}>
      <rect x={x} y={y} width="7" height="7" />
      <rect x={x + 1} y={y + 1} width="5" height="5" fill="#fff" />
      <rect x={x + 2} y={y + 2} width="3" height="3" />
    </g>
  );
  return (
    <svg width={size} height={size} viewBox={`0 0 ${n} ${n}`} shapeRendering="crispEdges" fill="#000" aria-label="Placeholder QR">
      {cells}
      {finder(0, 0)}
      {finder(n - 7, 0)}
      {finder(0, n - 7)}
    </svg>
  );
}

/* Banner illustration: QR stand + check + confetti (≈135×108) */
export const BannerArt = () => (
  <svg width="135" height="108" viewBox="0 0 135 108" aria-hidden>
    <rect x="2" y="16" width="9" height="4" rx="2" fill="#E2457A" transform="rotate(30 6 18)" />
    <rect x="112" y="58" width="12" height="5" rx="2.5" fill="#4FD1B3" transform="rotate(-25 118 60)" />
    <path d="M110 2l2 7 7 2-7 2-2 7-2-7-7-2 7-2z" fill="#C9A6F2" />
    <rect x="52" y="54" width="54" height="50" rx="9" fill="#2B3570" />
    <rect x="44" y="10" width="54" height="84" rx="7" fill="#4FB0EE" transform="rotate(4 71 52)" />
    <g transform="rotate(4 71 52)">
      <rect x="49" y="15" width="44" height="56" rx="4" fill="#fff" />
      <text x="71" y="25" textAnchor="middle" fontSize="7" fontWeight="900" fill="#12398A" fontFamily="Inter, system-ui">UPI</text>
      <text x="71" y="30" textAnchor="middle" fontSize="3.4" fill="#555" fontFamily="Inter, system-ui">Accepted Here</text>
      <svg x="58" y="33" width="26" height="26">
        <QrPlaceholder size={26} n={17} seed={3} />
      </svg>
      <rect x="49" y="73" width="44" height="16" rx="3" fill="#CFEBFC" />
    </g>
    <path d="M16 80l12 16 30-36" stroke="#2FA640" strokeWidth="11" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16 80l12 16 30-36" stroke="#7FD86E" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const GaugeArt = () => (
  <svg width="92" height="84" viewBox="0 0 92 84" aria-hidden>
    <defs>
      <linearGradient id="g-arc" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0" stopColor="#D8362F" />
        <stop offset=".5" stopColor="#F2C230" />
        <stop offset="1" stopColor="#3DBE6A" />
      </linearGradient>
    </defs>
    <circle cx="42" cy="58" r="38" fill="none" stroke="url(#g-arc)" strokeWidth="9" />
    <circle cx="42" cy="58" r="28" fill="#CFF1E3" />
    <circle cx="42" cy="58" r="20" fill="#E6F8F0" />
    <path d="M42 58L64 34" stroke="#0E3A8F" strokeWidth="4" strokeLinecap="round" />
    <circle cx="42" cy="58" r="6" fill="#0E3A8F" />
    <rect x="58" y="2" width="31" height="17" rx="3" fill="#fff" stroke="#2E9E47" strokeWidth="1.5" />
    <text x="73.5" y="15" textAnchor="middle" fontSize="11" fontWeight="800" fill="#1F7A3A" fontFamily="Inter, system-ui">820</text>
  </svg>
);

export const GoldArt = () => (
  <svg width="96" height="84" viewBox="0 0 96 84" aria-hidden>
    <path d="M36 26 L60 8" stroke="#24B45A" strokeWidth="9" strokeLinecap="round" />
    <path d="M16 44 L36 26 L48 36 L72 12" stroke="#2FC566" strokeWidth="9" fill="none" strokeLinejoin="round" strokeLinecap="round" />
    <path d="M62 6 L80 4 L77 22 Z" fill="#2FC566" />
    {[
      [20, 46],
      [46, 46],
    ].map(([x, y]) => (
      <path key={x} d={`M${x + 4} ${y} h22 l4 16 h-30 z`} fill="#F2C318" stroke="#D9A20B" strokeWidth="1" />
    ))}
    {[
      [6, 64],
      [33, 64],
      [60, 64],
    ].map(([x, y]) => (
      <path key={x} d={`M${x + 4} ${y} h22 l4 17 h-30 z`} fill="#F8D33A" stroke="#D9A20B" strokeWidth="1" />
    ))}
  </svg>
);

export const SpendsArt = () => {
  const rows = [
    { y: 6, c: '#3E7BE0', v: '₹4600' },
    { y: 50, c: '#3BA0E6', v: '₹9569' },
    { y: 70, c: '#F07B2B', v: '₹5628' },
  ];
  return (
    <svg width="96" height="92" viewBox="0 0 96 92" aria-hidden>
      <rect x="8" y="0" width="76" height="92" rx="5" fill="#F6B5BC" />
      {rows.map((r) => (
        <g key={r.v}>
          <circle cx="20" cy={r.y + 6} r="5" fill={r.c} />
          <text x="78" y={r.y + 9.5} textAnchor="end" fontSize="9" fontWeight="600" fill="#5A5A6A" fontFamily="Inter, system-ui">{r.v}</text>
        </g>
      ))}
      <rect x="1" y="24" width="94" height="22" rx="5" fill="#fff" stroke="#F08A96" strokeWidth="1" />
      <rect x="9" y="30" width="16" height="10" rx="4" fill="#E9862A" />
      <rect x="9" y="34" width="16" height="2" fill="#7B3F12" />
      <text x="88" y="39" textAnchor="end" fontSize="10" fontWeight="800" fill="#12398A" fontFamily="Inter, system-ui">₹10,200</text>
    </svg>
  );
};
