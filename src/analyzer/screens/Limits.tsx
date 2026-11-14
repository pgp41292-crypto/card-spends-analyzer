/* /spends/limits — F4 category limits. */
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import AppHeader from '../components/AppHeader';
import { LimitSheet } from '../components/sheets';
import { useFirstLoad } from '../components/useFirstLoad';
import { Button, Card, CategoryIcon, EmptyState, ProgressBar, SectionTitle, Skeleton, Switch, cx } from '../components/ui';
import { CATEGORIES, CATEGORY_IDS } from '../lib/categories';
import { DAYS_LEFT, DEMO_MONTH } from '../lib/clock';
import { fmtMonthLong } from '../lib/format';
import { inr } from '../lib/paths';
import { inMonth, limitStatus, spendByCategory } from '../lib/selectors';
import type { CategoryId } from '../types';
import { useData, useStore } from '../store/data';
import { Gauge } from 'lucide-react';

export default function Limits() {
  const d = useData();
  const setLimit = useStore((s) => s.setLimit);
  const [params] = useSearchParams();
  const focus = params.get('cat');
  const [flash, setFlash] = useState<string | null>(focus);
  const [editing, setEditing] = useState<CategoryId | null>(null);
  const loading = useFirstLoad('limits', 450);

  useEffect(() => {
    if (!focus) return;
    document.getElementById(`limit-${focus}`)?.scrollIntoView({ block: 'center' });
    setFlash(focus);
    const id = window.setTimeout(() => setFlash(null), 1600);
    return () => clearTimeout(id);
  }, [focus]);

  const statuses = d.limits.map((l) => limitStatus(l, d.transactions)).sort((a, b) => b.pct - a.pct);
  const excludeShared = d.limits.length === 0 || d.limits.every((l) => l.excludeShared);
  const spentByCat = spendByCategory(inMonth(d.transactions, DEMO_MONTH));
  const unlimited = CATEGORY_IDS.filter((c) => !d.limits.some((l) => l.category === c));

  return (
    <>
      <AppHeader title="Category limits" back />
      <div className="px-4 pb-24 pt-4">
        <p className="text-14 text-muted">{DAYS_LEFT} days left in {fmtMonthLong(DEMO_MONTH)}. We warn you at 80% and 100%.</p>

        <Card className="mt-3 flex items-center gap-3 px-4 py-2">
          <div className="flex-1">
            <p className="text-14 font-semibold text-text">Exclude shared spends I'll get back</p>
            <p className="text-12 text-muted">Amounts friends owe you (Credit Circle) don't count toward limits.</p>
          </div>
          <Switch label="Exclude shared spends I'll get back" checked={excludeShared}
            onChange={(v) => d.limits.forEach((l) => setLimit(l.category, { excludeShared: v }))} />
        </Card>

        <SectionTitle>Your limits</SectionTitle>
        {loading ? (
          <div className="space-y-3" aria-busy="true">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-[124px]" />)}</div>
        ) : statuses.length === 0 ? (
          <Card className="p-0"><EmptyState icon={Gauge} title="No limits yet" body="Set a monthly limit for a category to get warned before you overspend." /></Card>
        ) : (
          <div className="space-y-3">
            {statuses.map((s) => {
              const over = s.remaining < 0;
              return (
                <div key={s.category} id={`limit-${s.category}`}
                  className={cx('rounded-card bg-surface p-4 shadow-soft border transition-shadow scroll-mt-24', flash === s.category ? 'border-primary shadow-[0_0_0_3px_rgba(0,41,112,0.25)]' : 'border-border')}>
                  <div className="flex items-center gap-3">
                    <CategoryIcon category={s.category} />
                    <div className="flex-1">
                      <p className="text-14 font-semibold text-text">{CATEGORIES[s.category].label}</p>
                      <p className="text-14 text-muted"><b className="text-text">{inr(s.spent)}</b> of {inr(s.monthlyLimit)}</p>
                    </div>
                    <Button variant="ghost" className="px-3" onClick={() => setEditing(s.category)}>Edit</Button>
                  </div>
                  <ProgressBar className="mt-3" value={s.spent} max={s.monthlyLimit} label={`${CATEGORIES[s.category].label} limit`} />
                  <div className="mt-2 flex justify-between text-12">
                    <span className={cx('font-semibold', s.pct >= 100 ? 'text-[#B42318]' : s.pct >= 80 ? 'text-[#9A4A08]' : 'text-muted')}>{Math.round(s.pct)}% used</span>
                    <span className="text-muted">
                      {over ? `Over by ${inr(-s.remaining)}` : `${inr(s.dailyAllowance)}/day for ${s.daysLeft} days`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {unlimited.length > 0 && (
          <>
            <SectionTitle>Add a limit</SectionTitle>
            <Card className="p-0">
              <ul className="divide-y divide-border">
                {unlimited.map((c) => (
                  <li key={c}>
                    <button type="button" onClick={() => setEditing(c)} className="flex min-h-[56px] w-full items-center gap-3 px-4 text-left">
                      <CategoryIcon category={c} size={32} />
                      <span className="flex-1 text-14 text-text">{CATEGORIES[c].label}</span>
                      <span className="text-12 text-muted">{inr(spentByCat[c] ?? 0)} this month</span>
                      <Plus size={18} className="text-primary" aria-label="Set limit" />
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          </>
        )}
      </div>
      <LimitSheet category={editing} open={!!editing} onClose={() => setEditing(null)} />
    </>
  );
}
