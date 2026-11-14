/* /rewards/card/:id — F8 card detail tabs: Benefits, Milestones, Rewards, Changes. */
import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { CreditCard, History, Trophy } from 'lucide-react';
import AppHeader from '../components/AppHeader';
import { HowToSheet } from '../components/sheets';
import { Badge, Button, Card, EmptyState, ProgressBar, Segmented, Skeleton } from '../components/ui';
import { useFirstLoad } from '../components/useFirstLoad';
import { DEMO_MONTH } from '../lib/clock';
import { daysUntil, fmtDate, fmtDateYear } from '../lib/format';
import { inr } from '../lib/paths';
import { expiryValueInr, inMonth } from '../lib/selectors';
import type { Benefit } from '../types';
import { useData } from '../store/data';
import { MilestoneCard } from './Rewards';

type Tab = 'benefits' | 'milestones' | 'rewards' | 'changes';
const GROUPS: { type: Benefit['type']; title: string }[] = [
  { type: 'automatic', title: 'Automatic' },
  { type: 'needs_action', title: 'Needs action' },
  { type: 'threshold', title: 'Spend condition' },
];
const IMPACT = { high: 'danger', medium: 'warning', low: 'neutral' } as const;

export default function CardDetail() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'benefits';
  const d = useData();
  const [howTo, setHowTo] = useState<Benefit | null>(null);
  const card = d.cards.find((c) => c.id === id);
  const loading = useFirstLoad(`card-${id}`, 450);

  if (!card) {
    return (
      <>
        <AppHeader title="Card" back />
        <EmptyState icon={CreditCard} title="Card not found" body="It may belong to another persona." />
      </>
    );
  }
  const benefits = d.benefits.benefits.filter((b) => b.cardId === card.id);
  const milestones = d.benefits.milestones.filter((m) => m.cardId === card.id);
  const expiries = d.benefits.expiries.filter((e) => e.cardId === card.id).sort((a, b) => a.expiresOn.localeCompare(b.expiresOn));
  const changes = d.benefits.devaluations.filter((v) => v.cardId === card.id).sort((a, b) => b.date.localeCompare(a.date));
  const earnedThisMonth = inMonth(d.transactions, DEMO_MONTH, card.id).reduce((s, t) => s + t.rewardEarned, 0);

  return (
    <>
      <AppHeader title={`${card.issuer} ••${card.last4}`} back />
      <div className="px-4 pb-24 pt-4">
        <div className="relative h-44 overflow-hidden rounded-card p-4 text-white shadow-soft"
          style={{ background: `linear-gradient(135deg, ${card.color}, #001A47)` }}>
          <p className="text-14 font-semibold opacity-90">{card.issuer}</p>
          <p className="text-20 font-bold">{card.name}</p>
          <p className="absolute bottom-4 left-4 font-mono text-16 tracking-widest">•••• {card.last4}</p>
          <p className="absolute bottom-4 right-4 text-14 font-semibold">{card.network}</p>
          <span className="absolute right-4 top-4 rounded-chip bg-white/20 px-2 py-0.5 text-12">Sample card</span>
        </div>

        <div className="mt-4">
          <Segmented<Tab> label="Card sections" value={tab} onChange={(t) => setParams({ tab: t }, { replace: true })}
            options={[{ value: 'benefits', label: 'Benefits' }, { value: 'milestones', label: 'Milestones' }, { value: 'rewards', label: 'Rewards' }, { value: 'changes', label: 'Changes' }]} />
        </div>

        {loading && <div className="mt-4 space-y-3" aria-busy="true">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}</div>}

        {!loading && tab === 'benefits' && (
          benefits.length === 0 ? <EmptyState icon={CreditCard} title="No benefits listed" /> :
          GROUPS.map((g) => {
            const list = benefits.filter((b) => b.type === g.type);
            if (!list.length) return null;
            return (
              <section key={g.type} className="mt-4">
                <h2 className="mb-2 text-14 font-bold text-muted">{g.title}</h2>
                <div className="space-y-3">
                  {list.map((b) => (
                    <Card key={b.id}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-14 font-semibold text-text">{b.title}</p>
                        {b.total != null && <Badge tone={(b.used ?? 0) < b.total ? 'warning' : 'success'}>{b.used ?? 0} of {b.total} used</Badge>}
                      </div>
                      <p className="mt-1 text-14 text-muted">{b.description}</p>
                      {b.condition && (
                        <>
                          <ProgressBar goal className="mt-3" value={b.condition.spendSoFar} max={b.condition.spendRequired} label={b.title} />
                          <p className="mt-2 text-12 text-text">
                            {b.condition.spendSoFar >= b.condition.spendRequired
                              ? `Unlocked: ${inr(b.condition.spendSoFar)} spent this quarter`
                              : `Spend ${inr(b.condition.spendRequired)} by ${fmtDate(b.condition.periodEnd)} to unlock (${inr(b.condition.spendSoFar)} spent)`}
                          </p>
                        </>
                      )}
                      <Button variant="ghost" className="-ml-4 mt-1" onClick={() => setHowTo(b)}>How to use</Button>
                    </Card>
                  ))}
                </div>
              </section>
            );
          })
        )}

        {!loading && tab === 'milestones' && (
          <div className="mt-4 space-y-3">
            {milestones.length === 0 ? <EmptyState icon={Trophy} title="No milestones on this card" /> : milestones.map((m) => <MilestoneCard key={m.id} m={m} />)}
          </div>
        )}

        {!loading && tab === 'rewards' && (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-3">
                <p className="text-12 text-muted">Points balance</p>
                <p className="text-20 font-bold text-primary">{card.pointsBalance.toLocaleString('en-IN')}</p>
                <p className="text-12 text-muted">≈{inr(Math.round(card.pointsBalance * card.pointValueInr))} · {inr(card.pointValueInr, 2)}/pt</p>
              </Card>
              <Card className="p-3">
                <p className="text-12 text-muted">Earned this month</p>
                <p className="text-20 font-bold text-primary">{inr(earnedThisMonth, 2)}</p>
                <p className="text-12 text-muted">From tracked spends</p>
              </Card>
            </div>
            <h2 className="pt-2 text-14 font-bold text-muted">Expiry</h2>
            {expiries.length === 0 ? <Card><p className="text-14 text-muted">Nothing expiring on this card.</p></Card> : (
              <Card className="p-0">
                <ul className="divide-y divide-border">
                  {expiries.map((e) => {
                    const days = daysUntil(e.expiresOn);
                    return (
                      <li key={e.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="flex-1">
                          <p className="text-14 font-semibold text-text">
                            {e.kind === 'voucher' ? `${inr(e.value)} voucher` : `${e.value.toLocaleString('en-IN')} points (≈${inr(expiryValueInr(e, d.cards))})`}
                          </p>
                          <p className="text-12 text-muted">Expires {fmtDateYear(e.expiresOn)}</p>
                        </div>
                        <Badge tone={days <= 7 ? 'danger' : days <= 30 ? 'warning' : 'neutral'}>in {days} days</Badge>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            )}
          </div>
        )}

        {!loading && tab === 'changes' && (
          <div className="mt-4">
            {changes.length === 0 ? <EmptyState icon={History} title="No changes recorded" body="We log reward devaluations and rule changes for this card here." /> : (
              <ol className="space-y-3">
                {changes.map((v) => (
                  <li key={v.id}>
                    <Card>
                      <div className="flex items-center justify-between">
                        <p className="text-12 font-semibold text-muted">{fmtDateYear(v.date)}</p>
                        <Badge tone={IMPACT[v.impact]}>{v.impact[0].toUpperCase() + v.impact.slice(1)} impact</Badge>
                      </div>
                      <p className="mt-1 text-14 text-text">{v.change}</p>
                    </Card>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
        <p className="mt-4 text-12 text-muted">Card names, rates and benefits are sample data.</p>
      </div>
      <HowToSheet benefit={howTo} onClose={() => setHowTo(null)} />
    </>
  );
}
