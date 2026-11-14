/* /rewards/tips — F6 verified tips feed. */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lightbulb } from 'lucide-react';
import AppHeader from '../components/AppHeader';
import { SOURCE_ICON, VerifiedBadge } from '../components/tips';
import { useFirstLoad } from '../components/useFirstLoad';
import { Badge, Card, CardChip, EmptyState, Skeleton, cx } from '../components/ui';
import { inr, p } from '../lib/paths';
import type { Tip } from '../types';
import { useData } from '../store/data';

type Filter = 'mine' | 'travel' | 'dining' | 'shopping' | 'milestones';
const FILTERS: { id: Filter; label: string; test: (t: Tip) => boolean }[] = [
  { id: 'mine', label: 'For my cards', test: () => true },
  { id: 'travel', label: 'Travel', test: (t) => t.category === 'travel' },
  { id: 'dining', label: 'Dining', test: (t) => t.category === 'food' },
  { id: 'shopping', label: 'Shopping', test: (t) => t.category === 'shopping' },
  { id: 'milestones', label: 'Milestones', test: (t) => t.category === 'general' || /milestone/i.test(t.title) },
];

export default function Tips() {
  const d = useData();
  const loading = useFirstLoad('tips');
  const [filter, setFilter] = useState<Filter>('mine');
  const mine = new Set(d.cards.map((c) => c.id));
  const f = FILTERS.find((x) => x.id === filter)!;
  // "For my cards" = tips whose cardIds match one of this persona's cards. Other chips browse all verified-source tips.
  const list = d.tips.filter((t) => (filter === 'mine' ? t.cardIds.some((id) => mine.has(id)) : f.test(t)));

  return (
    <>
      <AppHeader title="Tips & tricks" back />
      <div className="pb-24">
        <div className="flex gap-2 overflow-x-auto px-4 pt-3" role="group" aria-label="Filter tips">
          {FILTERS.map((x) => (
            <button key={x.id} type="button" aria-pressed={filter === x.id} onClick={() => setFilter(x.id)}
              className={cx('min-h-[44px] shrink-0 rounded-chip border px-4 text-14 font-semibold', filter === x.id ? 'border-primary bg-primary text-white' : 'border-[#D5DEEA] bg-surface text-text')}>
              {x.label}
            </button>
          ))}
        </div>
        <div className="space-y-3 px-4 pt-3">
          {loading ? (
            [0, 1, 2].map((i) => <Skeleton key={i} className="h-32" />)
          ) : list.length === 0 ? (
            <Card className="p-0"><EmptyState icon={Lightbulb} title="No tips here yet" body="Try another filter." /></Card>
          ) : (
            list.map((t) => {
              const cards = d.cards.filter((c) => t.cardIds.includes(c.id));
              return (
                <Link key={t.id} to={p(`/rewards/tips/${t.id}`)} className="block rounded-card border border-border bg-surface p-4 shadow-soft">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <VerifiedBadge tip={t} />
                    <Badge tone="success">Save ~{inr(t.estSavingInr)}</Badge>
                  </div>
                  <p className="mt-2 text-16 font-semibold text-text">{t.title}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {cards.length
                      ? cards.map((c) => <CardChip key={c.id} issuer={c.issuer} last4={c.last4} color={c.color} />)
                      : <Badge>For a card you don't have</Badge>}
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-12 text-muted" aria-label="Sources">
                    {t.sources.map((s, i) => {
                      const S = SOURCE_ICON[s.type];
                      return <span key={i} className="inline-flex items-center gap-1"><S.icon size={14} aria-hidden />{S.label}</span>;
                    })}
                  </div>
                </Link>
              );
            })
          )}
          <p className="pt-2 text-12 text-muted">
            Tips are summarised by AI from public posts, checked against issuer terms. Tips that break card terms are excluded.
          </p>
        </div>
      </div>
    </>
  );
}
