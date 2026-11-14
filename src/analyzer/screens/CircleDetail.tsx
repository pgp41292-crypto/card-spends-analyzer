/* /circle/:id — F7 circle detail: members, "Who should pay?", splits, guardrails. */
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, Ban, CheckCircle2, CreditCard, Lightbulb, Lock, Users } from 'lucide-react';
import AppHeader from '../components/AppHeader';
import { BottomSheet } from '../components/overlays';
import { Badge, Button, Card, EmptyState, ProgressBar, SectionTitle, Skeleton, cx } from '../components/ui';
import { useFirstLoad } from '../components/useFirstLoad';
import { SPLIT_CATEGORIES, addOnNudge, memberName, selfId, whoShouldPay, type Split } from '../lib/circles';
import { fmtDate } from '../lib/format';
import { inr } from '../lib/paths';
import { useData, usePersona, useStore } from '../store/data';
import { useUI } from '../store/ui';
import { BalanceLine, CIRCLE_ICON } from './Circle';

type Upi = { split: Split; memberId: string; direction: 'pay' | 'collect' };

export default function CircleDetail() {
  const { id } = useParams();
  const d = useData();
  const persona = usePersona();
  const self = selfId(persona.id);
  const { createSplit, confirmSplit, settleShare } = useStore();
  const toast = useUI((s) => s.toast);
  const c = d.circles.circles.find((x) => x.id === id);
  const loading = useFirstLoad(`circle-${id}`, 450);

  const [merchant, setMerchant] = useState('');
  const [splitCat, setSplitCat] = useState('electronics');
  const [amountStr, setAmountStr] = useState('');
  const [choice, setChoice] = useState<number>(0);
  const [upi, setUpi] = useState<Upi | null>(null);
  const [upiState, setUpiState] = useState<'idle' | 'processing'>('idle');
  useEffect(() => setChoice(0), [splitCat, amountStr]);

  if (!c) return (<><AppHeader title="Circle" back /><EmptyState icon={Users} title="Circle not found" body="It may belong to another persona." /></>);

  const Icon = CIRCLE_ICON[c.type];
  const sc = SPLIT_CATEGORIES.find((x) => x.id === splitCat)!;
  const amount = Math.max(0, Number(amountStr) || 0);
  const options = !sc.blocked && sc.category && amount > 0 ? whoShouldPay(c, d, persona.id, sc.category, amount) : [];
  const pick = options[choice];
  const n = c.members.length;
  const selfShare = Math.floor(amount / n);
  const wouldPayForOthers = pick?.isSelf ? amount - selfShare : 0;
  const overCap = pick?.isSelf && c.monthlyPaidForOthers + wouldPayForOthers > c.monthlyCap;
  const nudge = addOnNudge(c, self);

  const create = () => {
    if (!pick || !sc.category) return;
    const title = merchant.trim() || sc.label;
    const splitId = createSplit(c.id, { title, category: sc.category, amount, payerId: pick.memberId, memberIds: c.members.map((m) => m.id), cardId: pick.cardId });
    toast({ title: `Split created: ${title}`, body: `${pick.isSelf ? 'You pay' : `${pick.name} pays`} ${inr(amount)} · ${n} ways · waiting for members to confirm`, tone: 'info' });
    setMerchant(''); setAmountStr('');
    // Mock: the other members confirm a moment later.
    window.setTimeout(() => {
      confirmSplit(c.id, splitId);
      toast({ title: `All ${n} members confirmed "${title}"`, tone: 'success' });
    }, 1600);
  };

  const doUpi = () => {
    if (!upi) return;
    setUpiState('processing');
    window.setTimeout(() => {
      settleShare(c.id, upi.split.id, upi.memberId);
      const share = upi.split.shares.find((x) => x.memberId === upi.memberId)!;
      toast({
        tone: 'success',
        title: upi.direction === 'pay' ? `${inr(share.amount)} paid to ${memberName(c, upi.split.payerId)} via UPI` : `${memberName(c, upi.memberId)} paid you ${inr(share.amount)} via UPI`,
        body: `${upi.split.title} · share settled`,
      });
      setUpi(null); setUpiState('idle');
    }, 1000);
  };

  return (
    <>
      <AppHeader title={c.name} back />
      <div className="px-4 pb-24 pt-4">
        {c.pausedForReview && (
          <div className="mb-3 flex gap-3 rounded-card border border-[#F6D3B3] bg-[#FDEEDF] p-3" role="status">
            <AlertTriangle size={20} className="shrink-0 text-[#9A4A08]" aria-hidden />
            <p className="text-14 text-text"><b className="font-semibold">This circle has frequent one-way repayments.</b> Splits are paused for review.</p>
          </div>
        )}

        <Card>
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-btn bg-border text-primary"><Icon size={22} aria-hidden /></span>
            <div className="flex-1">
              <p className="text-12 capitalize text-muted">{c.type} circle · {n} members</p>
              <BalanceLine c={c} self={self} />
            </div>
          </div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-12">
              <span className="font-semibold text-text">Paid for others this month</span>
              <span className="text-muted">{inr(c.monthlyPaidForOthers)} of {inr(c.monthlyCap)} cap</span>
            </div>
            <ProgressBar value={c.monthlyPaidForOthers} max={c.monthlyCap} label="Paid for others this month" />
          </div>
        </Card>

        {nudge && (
          <Card className="mt-3 flex gap-3 border-[#C9D6EA] bg-[#F2F6FC]">
            <Lightbulb size={20} className="shrink-0 text-primary" aria-hidden />
            <p className="text-14 text-text">Add {nudge} as an add-on cardholder so you both earn toward the same milestone.</p>
          </Card>
        )}

        <SectionTitle>Members</SectionTitle>
        <Card className="p-0">
          <ul className="divide-y divide-border">
            {c.members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-chip bg-primary text-14 font-bold text-white" aria-hidden>{m.name[0]}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-14 font-semibold text-text">{m.name}</span>
                  <span className="flex items-center gap-1 text-12 text-muted"><CreditCard size={12} aria-hidden /> {m.cards.map((x) => `${x.issuer} ${x.name}`).join(' · ')}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <p className="mt-1 text-12 text-muted">Card names only. Numbers and limits are never shared.</p>

        <SectionTitle>Who should pay?</SectionTitle>
        <Card>
          <label htmlFor="sp-merchant" className="text-14 font-semibold text-text">Merchant</label>
          <input id="sp-merchant" value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="e.g. Croma: new phone"
            className="mt-1 h-11 w-full rounded-btn border border-[#C9D6EA] px-3 text-14 text-text placeholder:text-muted" />
          <p className="mt-3 mb-1 text-14 font-semibold text-text">Category</p>
          <div className="flex flex-wrap gap-2">
            {SPLIT_CATEGORIES.map((x) => (
              <button key={x.id} type="button" aria-pressed={splitCat === x.id} onClick={() => setSplitCat(x.id)}
                className={cx('inline-flex min-h-[44px] items-center gap-1 rounded-chip border px-3 text-14 font-semibold',
                  splitCat === x.id ? (x.blocked ? 'border-danger bg-[#FDE8E8] text-[#B42318]' : 'border-primary bg-primary text-white') : 'border-[#D5DEEA] text-text')}>
                {x.blocked && <Lock size={14} aria-hidden />} {x.label}
              </button>
            ))}
          </div>
          <label htmlFor="sp-amount" className="mt-3 block text-14 font-semibold text-text">Amount</label>
          <div className="mt-1 flex h-12 items-center gap-1 rounded-btn border border-[#C9D6EA] px-3">
            <span className="text-16 font-semibold text-muted">₹</span>
            <input id="sp-amount" inputMode="numeric" value={amountStr} placeholder="0" onChange={(e) => setAmountStr(e.target.value.replace(/[^\d]/g, ''))}
              className="h-full flex-1 bg-transparent text-16 font-semibold text-text outline-none" />
          </div>

          {sc.blocked ? (
            <p className="mt-3 flex items-start gap-2 rounded-btn bg-[#FDE8E8] p-3 text-14 text-[#B42318]" role="alert">
              <Ban size={18} className="mt-0.5 shrink-0" aria-hidden /> Splits aren't available for cash-like purchases.
            </p>
          ) : options.length > 0 && (
            <>
              <p className="mt-4 rounded-btn bg-border p-3 text-14 text-text">
                {options[0].saving > 0
                  ? <><b>{options[0].isSelf ? 'Your' : `${options[0].name}'s`} {options[0].cardName}</b> gives {options[0].ratePct.toFixed(0)}% on this purchase, saving <b>{inr(options[0].saving)}</b>.</>
                  : 'No card in this circle has an offer for this purchase.'}
              </p>
              <div role="radiogroup" aria-label="Who pays" className="mt-2 space-y-2">
                {options.slice(0, 5).map((o, i) => (
                  <button key={`${o.memberId}-${o.cardName}`} type="button" role="radio" aria-checked={choice === i} onClick={() => setChoice(i)}
                    className={cx('flex w-full items-center gap-3 rounded-btn border p-3 text-left', choice === i ? 'border-primary bg-[#F2F6FC]' : 'border-[#D5DEEA]')}>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-14 font-semibold text-text">{o.name} {i === 0 && o.saving > 0 && <Badge tone="success">Best</Badge>}</span>
                      <span className="block truncate text-12 text-muted">{o.cardName} · {o.note}</span>
                    </span>
                    <span className="text-14 font-bold text-[#1E7A44]">{o.saving ? `−${inr(o.saving)}` : '—'}</span>
                  </button>
                ))}
              </div>
              {overCap && (
                <p className="mt-2 text-14 text-[#B42318]" role="alert">This would take you over your {inr(c.monthlyCap)} monthly cap for paying for others.</p>
              )}
              <Button className="mt-3 w-full" disabled={!pick || c.pausedForReview || overCap} onClick={create}>
                {pick?.isSelf ? `You pay · split ${n} ways` : `${pick?.name} pays · split ${n} ways`} ({inr(Math.floor(amount / n))} each)
              </Button>
              <p className="mt-2 text-12 text-muted">Every split needs confirmation from all members.</p>
            </>
          )}
        </Card>

        <SectionTitle>Splits</SectionTitle>
        {loading ? (
          <div className="space-y-3" aria-busy="true">{[0, 1].map((i) => <Skeleton key={i} className="h-40" />)}</div>
        ) : c.splits.length === 0 ? (
          <Card className="p-0"><EmptyState icon={Users} title="No splits yet" body="Use “Who should pay?” to start one." /></Card>
        ) : (
          <div className="space-y-3">
            {c.splits.map((s) => {
              const confirmed = !s.confirmedBy || s.confirmedBy.length === s.shares.length;
              return (
                <Card key={s.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-14 font-semibold text-text">{s.title}</p>
                      <p className="text-12 text-muted">{memberName(c, s.payerId) === memberName(c, self) ? 'You' : memberName(c, s.payerId)} paid · {fmtDate(s.date)}</p>
                    </div>
                    <span className="text-16 font-bold text-text">{inr(s.amount)}</span>
                  </div>
                  <div className="mt-1">
                    {confirmed
                      ? <Badge tone="success"><CheckCircle2 size={12} aria-hidden /> Confirmed by all {s.shares.length}</Badge>
                      : <Badge tone="warning">{s.confirmedBy!.length} of {s.shares.length} confirmed</Badge>}
                  </div>
                  <ul className="mt-2 divide-y divide-border">
                    {s.shares.map((sh) => {
                      const mine = sh.memberId === self;
                      const payerIsMe = s.payerId === self;
                      const canPay = !sh.settled && mine && !payerIsMe;
                      const canCollect = !sh.settled && payerIsMe && !mine;
                      return (
                        <li key={sh.memberId} className="flex min-h-[48px] items-center gap-2 py-1.5">
                          <span className="flex-1 text-14 text-text">{mine ? 'You' : memberName(c, sh.memberId)}</span>
                          <span className="text-14 text-text">{inr(sh.amount)}</span>
                          {sh.settled ? <Badge tone="success">Settled</Badge> : <Badge tone="warning">Pending</Badge>}
                          {(canPay || canCollect) && (
                            <Button variant={canPay ? 'primary' : 'secondary'} className="min-h-[40px] px-3" disabled={!confirmed}
                              onClick={() => setUpi({ split: s, memberId: sh.memberId, direction: canPay ? 'pay' : 'collect' })}>
                              {canPay ? 'Pay via UPI' : 'Collect'}
                            </Button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </Card>
              );
            })}
          </div>
        )}
        <p className="mt-3 text-12 text-muted">Members, cards and offers are sample data. UPI payments here are simulated.</p>
      </div>

      <BottomSheet open={!!upi} onClose={() => upiState === 'idle' && setUpi(null)} title={upi?.direction === 'pay' ? 'Pay via UPI' : 'Collect via UPI'}
        footer={upi && (
          <Button className="w-full" disabled={upiState === 'processing'} onClick={doUpi}>
            {upiState === 'processing' ? 'Processing…' : upi.direction === 'pay'
              ? `Pay ${inr(upi.split.shares.find((x) => x.memberId === upi.memberId)!.amount)}`
              : `Simulate ${memberName(c, upi.memberId)} paying`}
          </Button>
        )}>
        {upi && (
          <div className="py-2 text-center">
            <p className="text-28 font-bold text-text">{inr(upi.split.shares.find((x) => x.memberId === upi.memberId)!.amount)}</p>
            <p className="text-14 text-muted">
              {upi.direction === 'pay' ? `to ${memberName(c, upi.split.payerId)}` : `from ${memberName(c, upi.memberId)}`} · {upi.split.title}
            </p>
            <p className="mt-3 text-12 text-muted">Mock UPI: no money moves and no UPI PIN is asked.</p>
          </div>
        )}
      </BottomSheet>
    </>
  );
}
