/* /rewards — F8 hub: total value, expiring, milestones, unused benefits, cards. */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Clock, Gift, Lightbulb, Trophy } from 'lucide-react';
import AppHeader from '../components/AppHeader';
import { HowToSheet } from '../components/sheets';
import { useFirstLoad } from '../components/useFirstLoad';
import { Badge, Button, Card, CardChip, EmptyState, ProgressBar, SectionTitle, Skeleton, StatTile } from '../components/ui';
import { daysUntil, fmtDate } from '../lib/format';
import { inr, p } from '../lib/paths';
import { cardById, cardTitle, expiryValueInr, totalRewardValue } from '../lib/selectors';
import type { Benefit, Card as CardT, Milestone } from '../types';
import { useData } from '../store/data';

export const milestoneLine = (m: Milestone) =>
  m.progress >= m.target ? `Unlocked: ${m.reward}` : `${inr(m.target - m.progress)} more by ${fmtDate(m.deadline)} to unlock ${m.reward}`;

/** "Benefits you're not using": needs-action perks with uses left, and spend conditions not yet met. */
export function unusedBenefits(benefits: Benefit[]) {
  return benefits
    .map((b) => {
      if (b.type === 'needs_action' && b.total != null && (b.used ?? 0) < b.total) return { b, line: `${b.total - (b.used ?? 0)} of ${b.total} unused this quarter` };
      if (b.type === 'needs_action' && b.total == null) return { b, line: 'Needs action: not set up yet' };
      if (b.type === 'threshold' && b.condition && b.condition.spendSoFar < b.condition.spendRequired)
        return { b, line: `Spend ${inr(b.condition.spendRequired - b.condition.spendSoFar)} more by ${fmtDate(b.condition.periodEnd)} to unlock` };
      return null;
    })
    .filter(Boolean) as { b: Benefit; line: string }[];
}

export function MilestoneCard({ m, card }: { m: Milestone; card?: CardT }) {
  return (
    <Link to={`${p(`/rewards/card/${m.cardId}`)}?tab=milestones`} className="block rounded-card border border-border bg-surface p-4 shadow-soft">
      <div className="flex items-center justify-between gap-2">
        <span className="text-14 font-semibold text-text">{m.title}</span>
        {card && <CardChip issuer={card.issuer} last4={card.last4} color={card.color} />}
      </div>
      <ProgressBar goal className="mt-3" value={m.progress} max={m.target} label={m.title} />
      <div className="mt-2 flex justify-between text-12 text-muted">
        <span>{inr(m.progress)} of {inr(m.target)}</span>
        <span className="font-semibold text-text">{Math.min(100, Math.round((m.progress / m.target) * 100))}%</span>
      </div>
      <p className="mt-1 text-14 text-text">{milestoneLine(m)}</p>
    </Link>
  );
}

export default function Rewards() {
  const d = useData();
  const nav = useNavigate();
  const loading = useFirstLoad('rewards');
  const [howTo, setHowTo] = useState<Benefit | null>(null);
  const expiring = d.benefits.expiries
    .filter((e) => daysUntil(e.expiresOn) >= 0 && daysUntil(e.expiresOn) <= 30)
    .sort((a, b) => a.expiresOn.localeCompare(b.expiresOn));
  const expiringValue = expiring.reduce((s, e) => s + expiryValueInr(e, d.cards), 0);
  const unused = unusedBenefits(d.benefits.benefits);

  return (
    <>
      <AppHeader title="Rewards" />
      <div className="px-4 pb-28 pt-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-3"><Skeleton className="h-[104px]" /><Skeleton className="h-[104px]" /></div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <StatTile icon={Gift} label="Total reward value" value={inr(totalRewardValue(d.cards))} sub={`Across ${d.cards.length} cards`} />
            <StatTile icon={Clock} label="Expiring in 30 days" value={inr(expiringValue)} tone={expiring.length ? 'warning' : 'default'}
              sub={`${expiring.length} item${expiring.length === 1 ? '' : 's'}`}
              onClick={() => document.getElementById('expiring')?.scrollIntoView({ behavior: 'smooth' })} />
          </div>
        )}

        <SectionTitle>Milestones</SectionTitle>
        {d.benefits.milestones.length === 0 ? (
          <Card className="p-0"><EmptyState icon={Trophy} title="No active milestones" /></Card>
        ) : (
          <div className="space-y-3">
            {d.benefits.milestones.map((m) => <MilestoneCard key={m.id} m={m} card={cardById(d.cards, m.cardId)} />)}
          </div>
        )}

        <SectionTitle>Benefits you're not using</SectionTitle>
        {unused.length === 0 ? (
          <Card className="p-0"><EmptyState icon={Gift} title="You're using every benefit" /></Card>
        ) : (
          <Card className="p-0">
            <ul className="divide-y divide-border">
              {unused.map(({ b, line }) => {
                const card = cardById(d.cards, b.cardId);
                return (
                  <li key={b.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-14 font-semibold text-text">{b.title}</p>
                      <p className="text-14 text-muted">{line}</p>
                      {card && <div className="mt-1"><CardChip issuer={card.issuer} last4={card.last4} color={card.color} /></div>}
                    </div>
                    <Button variant="secondary" className="px-3" onClick={() => setHowTo(b)}>How to use</Button>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}

        <div id="expiring" className="scroll-mt-20">
          <SectionTitle>Expiring soon</SectionTitle>
          {expiring.length === 0 ? (
            <Card className="p-0"><EmptyState icon={Clock} title="Nothing expires in the next 30 days" /></Card>
          ) : (
            <Card className="p-0">
              <ul className="divide-y divide-border">
                {expiring.map((e) => {
                  const card = cardById(d.cards, e.cardId);
                  const days = daysUntil(e.expiresOn);
                  return (
                    <li key={e.id}>
                      <Link to={`${p(`/rewards/card/${e.cardId}`)}?tab=rewards`} className="flex min-h-[64px] items-center gap-3 px-4 py-3">
                        <div className="flex-1">
                          <p className="text-14 font-semibold text-text">
                            {e.kind === 'voucher' ? `${inr(e.value)} voucher` : `${e.value.toLocaleString('en-IN')} points (≈${inr(expiryValueInr(e, d.cards))})`}
                          </p>
                          <p className="text-12 text-muted">{card ? `${card.issuer} ••${card.last4} · ` : ''}expires {fmtDate(e.expiresOn)}</p>
                        </div>
                        <Badge tone={days <= 7 ? 'danger' : 'warning'}>in {days} day{days === 1 ? '' : 's'}</Badge>
                        <ChevronRight size={18} className="text-muted" aria-hidden />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </div>

        <SectionTitle>Your cards</SectionTitle>
        <Card className="p-0">
          <ul className="divide-y divide-border">
            {d.cards.map((c) => (
              <li key={c.id}>
                <Link to={p(`/rewards/card/${c.id}`)} className="flex min-h-[64px] items-center gap-3 px-4 py-3">
                  <span className="h-8 w-12 shrink-0 rounded-[6px]" style={{ background: c.color }} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-14 font-semibold text-text">{cardTitle(c)}</span>
                    <span className="block text-12 text-muted">{c.pointsBalance.toLocaleString('en-IN')} points · ≈{inr(Math.round(c.pointsBalance * c.pointValueInr))}</span>
                  </span>
                  <ChevronRight size={18} className="text-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <button type="button" onClick={() => nav(p('/rewards/tips'))}
          className="mt-4 flex min-h-[56px] w-full items-center gap-3 rounded-card border border-border bg-surface px-4 text-left shadow-soft">
          <Lightbulb size={20} className="text-primary" aria-hidden />
          <span className="flex-1 text-14 font-semibold text-text">Verified tips and tricks for your cards</span>
          <ChevronRight size={18} className="text-muted" aria-hidden />
        </button>
        <p className="mt-3 text-12 text-muted">Card names, reward rates and benefits are sample data.</p>
      </div>
      <HowToSheet benefit={howTo} onClose={() => setHowTo(null)} />
    </>
  );
}
