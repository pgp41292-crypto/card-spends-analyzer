/* /cards — My cards + F9 smart card suggestion. */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ChevronRight, CreditCard, Info } from 'lucide-react';
import AppHeader from '../components/AppHeader';
import { BottomSheet } from '../components/overlays';
import { useFirstLoad } from '../components/useFirstLoad';
import { Badge, Button, Card, EmptyState, ProgressBar, SectionTitle, Skeleton } from '../components/ui';
import { CATEGORIES } from '../lib/categories';
import { TRACKED_MONTHS } from '../lib/clock';
import { inr, p } from '../lib/paths';
import { extraPerYear, suggestionBreakdown, type SuggestionRow } from '../lib/rewards';
import { cardById, cardTitle } from '../lib/selectors';
import type { CardSuggestion, PersonaData } from '../types';
import { useData } from '../store/data';

const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`;

/** Live value of a suggestion, from this persona's transactions and rules (same maths as the data generator). */
function valueOf(s: CardSuggestion, d: PersonaData) {
  const rows = suggestionBreakdown(s.rewardRules ?? [], d.cards, d.transactions, TRACKED_MONTHS);
  const extra = extraPerYear(rows);
  const top = [...rows].sort((a, b) => b.gain - a.gain)[0];
  return { rows, extra, net: extra - s.annualFee, top };
}

export default function Cards() {
  const d = useData();
  const loading = useFirstLoad('cards');
  const [open, setOpen] = useState<CardSuggestion | null>(null);
  const [eligible, setEligible] = useState(false);
  const valued = d.offers.suggestions.map((s) => ({ s, ...valueOf(s, d) })).sort((a, b) => b.net - a.net);
  const worth = valued.filter((v) => v.net > 0);
  const hidden = valued.length - worth.length;

  return (
    <>
      <AppHeader title="My cards" />
      <div className="px-4 pb-28 pt-4">
        {d.cards.length === 0 ? (
          <Card className="p-0"><EmptyState icon={CreditCard} title="No cards linked" /></Card>
        ) : (
          <div className="space-y-3">
            {d.cards.map((c) => (
              <Link key={c.id} to={p(`/rewards/card/${c.id}`)} className="block rounded-card border border-border bg-surface p-4 shadow-soft">
                <div className="flex items-center gap-3">
                  <span className="h-10 w-16 shrink-0 rounded-[6px]" style={{ background: `linear-gradient(135deg, ${c.color}, #001A47)` }} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-14 font-semibold text-text">{cardTitle(c)}</span>
                    <span className="block text-12 text-muted">{c.network} ••{c.last4} · bill on {ordinal(c.billDay)}, due {ordinal(c.dueDay)}</span>
                  </span>
                  {c.isPaytmCobrand && <Badge tone="accent">Paytm</Badge>}
                  <ChevronRight size={18} className="text-muted" aria-hidden />
                </div>
                <ProgressBar className="mt-3" value={c.outstanding} max={c.limit} label="Credit used" />
                <div className="mt-1.5 flex justify-between text-12 text-muted">
                  <span>{inr(c.outstanding)} used of {inr(c.limit)}</span>
                  <span>{c.pointsBalance.toLocaleString('en-IN')} pts</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        <SectionTitle>Suggested for you</SectionTitle>
        <p className="-mt-1 mb-2 flex items-start gap-1.5 text-12 text-muted"><Info size={14} className="mt-0.5 shrink-0" aria-hidden /> Ranked by value to you, not by partnership.</p>
        {loading ? (
          <Skeleton className="h-36" />
        ) : worth.length === 0 ? (
          <Card className="p-0"><EmptyState icon={CreditCard} title="Your cards already cover your spending well" body="No card would earn you more after its fee." /></Card>
        ) : (
          <div className="space-y-3">
            {worth.map(({ s, extra, top }) => (
              <button key={s.id} type="button" onClick={() => { setOpen(s); setEligible(false); }}
                className="block w-full rounded-card border border-border bg-surface p-4 text-left shadow-soft">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-16 font-semibold text-text">{cardTitle(s)}</span>
                  {s.isPartner && <Badge tone="primary">Partner</Badge>}
                </div>
                <p className="mt-1 text-20 font-bold text-[#1E7A44]">Could earn {inr(extra)} more a year</p>
                <p className="text-14 text-muted">
                  {top ? `You spend ${inr(top.monthlySpend)} a month on ${CATEGORIES[top.category].label.toLowerCase()}` : s.reason}
                </p>
                <p className="mt-2 text-12 text-muted">Annual fee {s.annualFee ? inr(s.annualFee) : 'nil'} · tap to see the calculation</p>
              </button>
            ))}
          </div>
        )}
        {hidden > 0 && <p className="mt-2 text-12 text-muted">{hidden} other card{hidden > 1 ? 's' : ''} hidden: not worth the annual fee for your spending.</p>}
        <p className="mt-3 text-12 text-muted">Partner: Paytm may earn a referral fee. Card names and rates are sample data.</p>
      </div>

      {open && (() => {
        const v = valueOf(open, d);
        return (
          <BottomSheet open onClose={() => setOpen(null)} title={cardTitle(open)}
            footer={eligible
              ? <Button className="w-full" onClick={() => setOpen(null)}>Done</Button>
              : <Button className="w-full" onClick={() => setEligible(true)}>Check eligibility</Button>}>
            {eligible ? (
              <div className="flex flex-col items-center py-4 text-center">
                <CheckCircle2 size={48} className="text-success" aria-hidden />
                <p className="mt-2 text-20 font-bold text-text">You're likely eligible</p>
                <p className="mt-1 text-14 text-muted">This is a prototype: no credit check was made and nothing was shared with {open.issuer}.</p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {open.isPartner && <Badge tone="primary">Partner</Badge>}
                  <Badge>Annual fee {open.annualFee ? inr(open.annualFee) : 'nil'}</Badge>
                </div>
                <p className="mt-2 text-12 text-muted">Your average monthly spend since 1 Oct ({TRACKED_MONTHS} months of sample data), with each card's monthly caps applied.</p>
                <Comparison rows={v.rows} d={d} />
                <div className="mt-3 space-y-1 rounded-btn bg-background p-3 text-14">
                  <Line label="Extra a month" value={inr(v.rows.reduce((s, r) => s + r.gain, 0), 2)} />
                  <Line label="× 12 months" value={inr(v.extra)} />
                  <Line label="− Annual fee" value={`−${inr(open.annualFee)}`} />
                  <Line label="Net value a year" value={inr(v.net)} strong />
                </div>
                <p className="mt-2 text-12 text-muted">Ranked by value to you, not by partnership.</p>
              </>
            )}
          </BottomSheet>
        );
      })()}
    </>
  );
}

const Line = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => (
  <div className={`flex justify-between ${strong ? 'border-t border-[#D5DEEA] pt-1 font-bold text-[#1E7A44]' : 'text-text'}`}>
    <span>{label}</span><span>{value}</span>
  </div>
);

function Comparison({ rows, d }: { rows: SuggestionRow[]; d: PersonaData }) {
  return (
    <table className="mt-3 w-full text-12">
      <caption className="sr-only">Monthly rewards: your best card vs suggested card</caption>
      <thead>
        <tr className="text-left text-muted">
          <th className="py-1 font-semibold">Category</th>
          <th className="py-1 text-right font-semibold">Spend/mo</th>
          <th className="py-1 text-right font-semibold">Your best</th>
          <th className="py-1 text-right font-semibold">New card</th>
          <th className="py-1 text-right font-semibold">Gain</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {rows.map((r) => {
          const c = cardById(d.cards, r.currentCardId);
          return (
            <tr key={r.category} className="text-text">
              <td className="py-1.5">{CATEGORIES[r.category].short}</td>
              <td className="py-1.5 text-right">{inr(r.monthlySpend)}</td>
              <td className="py-1.5 text-right">{inr(r.currentBest)}<span className="block text-muted">{c?.issuer}</span></td>
              <td className="py-1.5 text-right">{inr(r.suggested)}</td>
              <td className={`py-1.5 text-right font-semibold ${r.gain > 0 ? 'text-[#1E7A44]' : 'text-muted'}`}>{r.gain > 0 ? `+${inr(r.gain)}` : '—'}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
