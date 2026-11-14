import { useEffect, useMemo, useState } from 'react';
import type { Benefit, CategoryId, Transaction } from '../types';
import { CATEGORIES, CATEGORY_IDS } from '../lib/categories';
import { PREV_MONTH, TRACKED_MONTHS } from '../lib/clock';
import { inr } from '../lib/paths';
import { inMonth, limitStatus } from '../lib/selectors';
import { useData, useStore } from '../store/data';
import { useUI } from '../store/ui';
import { BottomSheet } from './overlays';
import { Button, CategoryChip, cx } from './ui';

/** F2 "Fix category": category chips + rename merchant. */
export function FixCategorySheet({ txn, open, onClose }: { txn: Transaction; open: boolean; onClose: () => void }) {
  const correct = useStore((s) => s.correctTransaction);
  const toast = useUI((s) => s.toast);
  const [cat, setCat] = useState<CategoryId>(txn.category);
  const [name, setName] = useState(txn.merchantDisplayName ?? '');
  useEffect(() => {
    if (open) { setCat(txn.category); setName(txn.merchantDisplayName ?? ''); }
  }, [open, txn]);
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Fix category"
      footer={
        <Button
          className="w-full"
          onClick={() => {
            correct(txn.id, { category: cat, merchantDisplayName: name });
            toast({ title: 'Thanks. This helps others too.', body: `Saved as ${CATEGORIES[cat].label}`, tone: 'success' });
            onClose();
          }}
        >
          Save
        </Button>
      }
    >
      <p className="mb-3 font-mono text-12 text-muted">{txn.rawDescriptor}</p>
      <p className="mb-2 text-14 font-semibold text-text">Category</p>
      <div className="flex flex-wrap gap-2">
        {CATEGORY_IDS.map((c) => <CategoryChip key={c} category={c} selected={c === cat} onClick={() => setCat(c)} />)}
      </div>
      <label className="mt-4 block text-14 font-semibold text-text" htmlFor="rename">Rename merchant</label>
      <input
        id="rename"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Local chemist"
        className="mt-2 h-11 w-full rounded-btn border border-[#C9D6EA] bg-surface px-3 text-14 text-text placeholder:text-muted"
      />
    </BottomSheet>
  );
}

/** F4 "Set limit": slider + quick picks (last month, 3-month average, custom). */
export function LimitSheet({ category, open, onClose }: { category: CategoryId | null; open: boolean; onClose: () => void }) {
  const d = useData();
  const setLimit = useStore((s) => s.setLimit);
  const existing = d.limits.find((l) => l.category === category);
  const lastMonth = useMemo(
    () => (category ? inMonth(d.transactions, PREV_MONTH).filter((t) => t.category === category).reduce((s, t) => s + t.amount, 0) : 0),
    [d.transactions, category],
  );
  const avg = useMemo(
    () => (category ? Math.round(d.transactions.filter((t) => t.category === category).reduce((s, t) => s + t.amount, 0) / TRACKED_MONTHS) : 0),
    [d.transactions, category],
  );
  const round = (n: number) => Math.max(500, Math.round(n / 500) * 500);
  const [value, setValue] = useState(0);
  const [mode, setMode] = useState<'last' | 'avg' | 'custom'>('custom');
  useEffect(() => {
    if (open && category) { setValue(existing?.monthlyLimit ?? round(avg)); setMode('custom'); }
  }, [open, category]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!category) return null;
  const max = round(Math.max(lastMonth, avg, existing?.monthlyLimit ?? 0, 5000) * 2);
  const preview = limitStatus({ category, monthlyLimit: value, excludeShared: existing?.excludeShared ?? true }, d.transactions);
  const picks = [
    { id: 'last' as const, label: 'Last month', amount: round(lastMonth) },
    { id: 'avg' as const, label: '3-month avg', amount: round(avg) },
  ];
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={`${CATEGORIES[category].label} limit`}
      footer={
        <Button
          className="w-full"
          onClick={() => {
            setLimit(category, { monthlyLimit: value });
            onClose();
          }}
        >
          Save limit
        </Button>
      }
    >
      <p className="text-28 font-bold text-primary">{inr(value)}<span className="text-14 font-semibold text-muted"> / month</span></p>
      <p className="mt-1 text-14 text-muted">
        You've spent {inr(preview.spent)} this month · {Math.round(preview.pct)}% of this limit
      </p>
      <input
        type="range"
        min={500}
        max={max}
        step={500}
        value={value}
        aria-label="Monthly limit"
        onChange={(e) => { setValue(+e.target.value); setMode('custom'); }}
        className="mt-4 h-11 w-full accent-[#002970]"
      />
      <div className="mt-2 grid grid-cols-3 gap-2">
        {picks.map((pk) => (
          <button
            key={pk.id}
            type="button"
            aria-pressed={mode === pk.id}
            onClick={() => { setValue(pk.amount); setMode(pk.id); }}
            className={cx('min-h-[56px] rounded-btn border px-2 text-left', mode === pk.id ? 'border-primary bg-[#E6ECF7]' : 'border-[#D5DEEA]')}
          >
            <span className="block text-12 text-muted">{pk.label}</span>
            <span className="block text-14 font-semibold text-text">{inr(pk.amount)}</span>
          </button>
        ))}
        <label className={cx('min-h-[56px] rounded-btn border px-2 py-1', mode === 'custom' ? 'border-primary bg-[#E6ECF7]' : 'border-[#D5DEEA]')}>
          <span className="block text-12 text-muted">Custom</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={100}
            value={value}
            aria-label="Custom limit"
            onFocus={() => setMode('custom')}
            onChange={(e) => { setValue(Math.max(0, +e.target.value)); setMode('custom'); }}
            className="w-full bg-transparent text-14 font-semibold text-text outline-none"
          />
        </label>
      </div>
      <p className="mt-3 text-12 text-muted">Averages use your tracked spends since 1 Oct (sample data).</p>
    </BottomSheet>
  );
}

/** F8 "How to use" steps, built from the benefit's own description. */
export function HowToSheet({ benefit, onClose }: { benefit: Benefit | null; onClose: () => void }) {
  if (!benefit) return null;
  const steps = benefit.description.split(/(?<=\.)\s+/).filter(Boolean);
  steps.push(
    benefit.type === 'automatic'
      ? 'Nothing else to do. It applies automatically when you pay with this card.'
      : benefit.type === 'threshold'
        ? 'Track your progress on this card. We will tell you when it unlocks.'
        : 'Do this before the period ends so the benefit is not lost.',
  );
  return (
    <BottomSheet open onClose={onClose} title={`How to use: ${benefit.title}`}>
      <ol className="space-y-3">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-chip bg-primary text-12 font-bold text-white">{i + 1}</span>
            <span className="pt-0.5 text-14 text-text">{s}</span>
          </li>
        ))}
      </ol>
    </BottomSheet>
  );
}
