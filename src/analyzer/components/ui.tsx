/* PRD shared components: StatTile, Card, ProgressBar, CategoryChip, CardChip, Badge, EmptyState, Skeleton, Button. */
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { extendTailwindMerge } from 'tailwind-merge';
import type { LucideIcon } from 'lucide-react';
import { CATEGORIES } from '../lib/categories';
import type { CategoryId } from '../types';

/* tailwind-merge so a className passed in overrides a component's defaults (padding, bg, border colour).
   Taught our custom font-size keys so `text-12` isn't mistaken for a text colour. */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: { 'font-size': [{ text: ['12', '14', '16', '20', '28'] }] },
    theme: { borderRadius: ['card', 'btn', 'chip'] },
  },
});
const cx = (...c: (string | false | null | undefined)[]) => twMerge(c.filter(Boolean).join(' '));

export function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  const cls = cx('block w-full text-left bg-surface rounded-card shadow-soft border border-border p-4', className);
  return onClick ? (
    <button type="button" onClick={onClick} className={cx(cls, 'active:scale-[.99] transition-transform')}>
      {children}
    </button>
  ) : (
    <div className={cls}>{children}</div>
  );
}

export function StatTile({
  label, value, sub, tone = 'default', icon: Icon, onClick,
}: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'default' | 'warning' | 'danger' | 'success'; icon?: LucideIcon; onClick?: () => void }) {
  const toneCls = { default: 'text-primary', warning: 'text-[#9A4A08]', danger: 'text-[#B42318]', success: 'text-[#1E7A44]' }[tone];
  return (
    <Card onClick={onClick} className="p-3 min-h-[88px]">
      <div className="flex items-center gap-1.5 text-12 text-muted">
        {Icon && <Icon size={14} aria-hidden />}
        {label}
      </div>
      <div className={cx('mt-1 text-20 font-bold', toneCls)}>{value}</div>
      {sub && <div className="mt-0.5 text-12 text-muted">{sub}</div>}
    </Card>
  );
}

/** Colour: accent <80%, warning 80–99%, danger ≥100% (PRD F4). */
export function progressTone(pct: number) {
  return pct >= 100 ? 'bg-danger' : pct >= 80 ? 'bg-warning' : 'bg-accent';
}
/** `goal` bars (milestones, spend conditions) fill accent and turn success at 100% — higher is good there. */
export function ProgressBar({ value, max, label, className, goal }: { value: number; max: number; label?: string; className?: string; goal?: boolean }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const fill = goal ? (pct >= 100 ? 'bg-success' : 'bg-accent') : progressTone(pct);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cx('h-2 w-full rounded-chip bg-[#E8EEF6] overflow-hidden', className)}
    >
      <div className={cx('h-full rounded-chip transition-[width] duration-500', fill)} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

export function CategoryChip({ category, selected, onClick }: { category: CategoryId; selected?: boolean; onClick?: () => void }) {
  const { label, icon: Icon, color } = CATEGORIES[category];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cx(
        'inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-chip border text-14 font-semibold whitespace-nowrap',
        selected ? 'bg-primary text-white border-primary' : 'bg-surface text-text border-[#D5DEEA]',
      )}
    >
      <Icon size={16} color={selected ? '#fff' : color} aria-hidden />
      {label}
    </button>
  );
}

export function CardChip({ issuer, last4, color }: { issuer: string; last4: string; color?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-chip bg-background border border-border px-2 py-0.5 text-12 font-semibold text-text whitespace-nowrap">
      <span className="h-2 w-2 rounded-chip" style={{ background: color ?? '#002970' }} aria-hidden />
      {issuer} ••{last4}
    </span>
  );
}

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'accent';
/* Text colours on tints are darkened variants of the tokens so badges pass WCAG AA. */
const BADGE: Record<Tone, string> = {
  neutral: 'bg-[#EEF1F5] text-[#4A4A4A]',
  primary: 'bg-[#E6ECF7] text-primary',
  success: 'bg-[#E3F5EA] text-[#1E7A44]',
  warning: 'bg-[#FDEEDF] text-[#9A4A08]',
  danger: 'bg-[#FDE8E8] text-[#B42318]',
  accent: 'bg-[#E0F5FD] text-[#005F7D]',
};
export function Badge({ children, tone = 'neutral', className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return <span className={cx('inline-flex items-center gap-1 rounded-chip px-2 py-0.5 text-12 font-semibold whitespace-nowrap', BADGE[tone], className)}>{children}</span>;
}

export function EmptyState({ icon: Icon, title, body, action }: { icon: LucideIcon; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-10">
      <span className="grid place-items-center h-14 w-14 rounded-chip bg-border text-primary mb-3"><Icon size={26} aria-hidden /></span>
      <p className="text-16 font-semibold text-text">{title}</p>
      {body && <p className="mt-1 text-14 text-muted">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded-btn bg-[#E6ECF4]', className)} aria-hidden />;
}

export function Button({
  variant = 'primary', className, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  const v = {
    primary: 'bg-primary text-white',
    secondary: 'bg-surface text-primary border border-[#C9D6EA]',
    ghost: 'bg-transparent text-primary',
    danger: 'bg-danger text-white',
  }[variant];
  return (
    <button
      type="button"
      {...rest}
      className={cx('inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-btn text-14 font-semibold disabled:opacity-50', v, className)}
    />
  );
}

export const SectionTitle = ({ children, action }: { children: ReactNode; action?: ReactNode }) => (
  <div className="flex items-center justify-between mt-6 mb-2">
    <h2 className="text-16 font-bold text-text">{children}</h2>
    {action}
  </div>
);

export { cx };

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-11 w-14 shrink-0 items-center justify-center"
    >
      <span className={cx('h-7 w-12 rounded-chip transition-colors', checked ? 'bg-primary' : 'bg-[#C9D2DE]')} />
      <span className={cx('absolute h-6 w-6 rounded-chip bg-white shadow-soft transition-transform', checked ? 'translate-x-[10px]' : '-translate-x-[10px]')} />
    </button>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="flex rounded-btn bg-[#EDF1F7] p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx('flex-1 min-h-[44px] rounded-[10px] text-14 font-semibold', value === o.value ? 'bg-surface text-primary shadow-soft' : 'text-[#4A4A4A]')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Coloured category icon tile. */
export function CategoryIcon({ category, size = 40 }: { category: CategoryId; size?: number }) {
  const { icon: Icon, color } = CATEGORIES[category];
  return (
    <span className="grid shrink-0 place-items-center rounded-btn" style={{ width: size, height: size, background: `${color}1F`, color }}>
      <Icon size={size * 0.5} aria-hidden />
    </span>
  );
}
