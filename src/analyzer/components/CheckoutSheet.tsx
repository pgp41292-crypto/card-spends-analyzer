/* F5 — one sheet for all three entry points:
   1. QR scan (Demo panel) and F10 "Pay at store" → mode "checkout", merchant pre-filled
   2. The "Best card here" strip shown before paying
   3. /rewards/best-card → mode "manual", merchant search + amount */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, QrCode, Search, Sparkles, Tag } from 'lucide-react';
import type { CategoryId } from '../types';
import { rankForPurchase } from '../lib/bestcard';
import { CATEGORIES, CATEGORY_IDS } from '../lib/categories';
import { notifyPayment } from '../lib/notify';
import { inr, p } from '../lib/paths';
import { MERCHANTS } from '../lib/simulate';
import { useData, useStore } from '../store/data';
import type { CheckoutInit } from '../store/ui';
import { BottomSheet } from './overlays';
import { Badge, Button, CategoryChip, ProgressBar, cx } from './ui';

interface Paid { amount: number; reward: number; cardId: string; milestone?: { title: string; before: number; after: number; target: number } }

export default function CheckoutSheet({ initial, mode, onClose }: { initial?: CheckoutInit; mode: 'checkout' | 'manual'; onClose: () => void }) {
  const d = useData();
  const addTransaction = useStore((s) => s.addTransaction);
  const nav = useNavigate();
  const [merchant, setMerchant] = useState(initial?.merchant ?? '');
  const [raw, setRaw] = useState(initial?.rawDescriptor ?? '');
  const [category, setCategory] = useState<CategoryId | null>(initial?.category ?? null);
  const [amountStr, setAmountStr] = useState(initial?.amount ? String(initial.amount) : '');
  const [selected, setSelected] = useState<string | null>(initial?.preselectCardId ?? null);
  const [paid, setPaid] = useState<Paid | null>(null);

  // Merchant catalogue for manual search: demo merchants + merchants resolved in this persona's history.
  const catalogue = useMemo(() => {
    const m = new Map<string, { name: string; raw: string; category: CategoryId }>();
    for (const x of MERCHANTS) m.set(x.name, { name: x.name, raw: x.raw, category: x.category });
    for (const t of d.transactions) if (t.merchantDisplayName && !m.has(t.merchantDisplayName)) m.set(t.merchantDisplayName, { name: t.merchantDisplayName, raw: t.rawDescriptor, category: t.category });
    return [...m.values()];
  }, [d.transactions]);
  const matches = merchant.trim().length > 0 && !catalogue.some((c) => c.name === merchant)
    ? catalogue.filter((c) => c.name.toLowerCase().includes(merchant.trim().toLowerCase())).slice(0, 5)
    : [];

  const gross = Math.max(0, Number(amountStr) || 0);
  // F10: a deal discount only applies on the deal's card (the Paytm co-branded card).
  const dealCard = initial?.discountPct ? initial.preselectCardId : undefined;
  const discount = dealCard ? Math.round((gross * initial!.discountPct!) / 100) : 0;
  const benefit = (cardId: string, reward: number) => reward + (cardId === dealCard ? discount : 0);
  const ranked = category && gross > 0
    ? rankForPurchase(d, category, gross - discount).sort((a, b) => benefit(b.card.id, b.q.reward) - benefit(a.card.id, a.q.reward))
    : [];
  const chosen = ranked.find((r) => r.card.id === selected) ?? ranked[0];
  const best = ranked[0];
  const dealApplies = !!dealCard && chosen?.card.id === dealCard;
  const payable = gross - (dealApplies ? discount : 0);

  const pay = () => {
    if (!chosen || !category) return;
    const ms = d.benefits.milestones.find((m) => m.cardId === chosen.card.id && m.progress < m.target);
    const input = {
      cardId: chosen.card.id, amount: payable, category,
      rawDescriptor: raw || `PYTM*${(merchant || CATEGORIES[category].short).toUpperCase().slice(0, 22)}`,
      merchantDisplayName: merchant || undefined, source: 'paytm' as const,
    };
    const txn = addTransaction(input);
    notifyPayment(input, chosen.card);
    setPaid({
      amount: payable, reward: txn.rewardEarned, cardId: chosen.card.id,
      milestone: ms && { title: ms.title, before: ms.progress, after: ms.progress + payable, target: ms.target },
    });
  };

  if (paid) {
    const card = d.cards.find((c) => c.id === paid.cardId)!;
    return (
      <BottomSheet open onClose={onClose} title="Payment successful"
        footer={<div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={() => { onClose(); nav(p('/spends')); }}>View in Spends</Button>
          <Button onClick={onClose}>Done</Button>
        </div>}>
        <div className="flex flex-col items-center py-2 text-center">
          <CheckCircle2 size={48} className="text-success" aria-hidden />
          <p className="mt-2 text-28 font-bold text-text">{inr(paid.amount)}</p>
          <p className="text-14 text-muted">paid to {merchant || 'merchant'} with {card.issuer} ••{card.last4}</p>
          <Badge tone="success" className="mt-2">You earned {inr(paid.reward, 2)}</Badge>
        </div>
        {paid.milestone && (
          <div className="mt-3 rounded-card border border-border p-3">
            <p className="text-14 font-semibold text-text">{paid.milestone.title} · {card.issuer} ••{card.last4}</p>
            <ProgressBar goal className="mt-2" value={paid.milestone.after} max={paid.milestone.target} label={paid.milestone.title} />
            <p className="mt-1 text-12 text-muted">
              {((paid.milestone.before / paid.milestone.target) * 100).toFixed(1)}% → <b className="text-text">{((paid.milestone.after / paid.milestone.target) * 100).toFixed(1)}%</b> · {inr(Math.max(0, paid.milestone.target - paid.milestone.after))} left
            </p>
          </div>
        )}
        <p className="mt-3 text-12 text-muted">Mock payment. No money moved.</p>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={mode === 'checkout' ? `Pay ${merchant}` : 'Best card for a purchase'}
      footer={
        <Button className="w-full" disabled={!chosen} onClick={pay}>
          {chosen ? `Pay ${inr(payable)} with ${chosen.card.issuer} ••${chosen.card.last4}` : 'Enter merchant and amount'}
        </Button>
      }
    >
      {mode === 'checkout' ? (
        <div className="flex items-center gap-3 rounded-btn bg-background p-3">
          <QrCode size={20} className="text-primary" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-14 font-semibold text-text">{merchant}</p>
            <p className="text-12 text-muted">Paytm checkout · {category && CATEGORIES[category].label}</p>
          </div>
        </div>
      ) : (
        <div className="relative">
          <label htmlFor="merchant" className="text-14 font-semibold text-text">Merchant</label>
          <div className="mt-1 flex h-12 items-center gap-2 rounded-btn border border-[#C9D6EA] px-3">
            <Search size={16} className="text-muted" aria-hidden />
            <input id="merchant" value={merchant} placeholder="Search e.g. Swiggy, Amazon, Uber" autoComplete="off"
              onChange={(e) => { setMerchant(e.target.value); setRaw(''); }}
              className="h-full flex-1 bg-transparent text-14 text-text outline-none placeholder:text-muted" />
          </div>
          {matches.length > 0 && (
            <ul className="mt-1 divide-y divide-border rounded-btn border border-border bg-surface">
              {matches.map((m) => (
                <li key={m.name}>
                  <button type="button" className="flex min-h-[44px] w-full items-center justify-between px-3 text-left"
                    onClick={() => { setMerchant(m.name); setRaw(m.raw); setCategory(m.category); setSelected(null); }}>
                    <span className="text-14 text-text">{m.name}</span>
                    <span className="text-12 text-muted">{CATEGORIES[m.category].short}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-14 font-semibold text-text">Category</p>
          <div className="-mx-4 mt-1 flex gap-2 overflow-x-auto px-4 pb-1">
            {CATEGORY_IDS.map((c) => <CategoryChip key={c} category={c} selected={c === category} onClick={() => { setCategory(c); setSelected(null); }} />)}
          </div>
        </div>
      )}

      <label htmlFor="amount" className="mt-3 block text-14 font-semibold text-text">Amount</label>
      <div className="mt-1 flex h-12 items-center gap-1 rounded-btn border border-[#C9D6EA] px-3">
        <span className="text-16 font-semibold text-muted">₹</span>
        <input id="amount" inputMode="numeric" value={amountStr} placeholder="0"
          onChange={(e) => { setAmountStr(e.target.value.replace(/[^\d]/g, '')); setSelected(initial?.preselectCardId ?? null); }}
          className="h-full flex-1 bg-transparent text-16 font-semibold text-text outline-none" />
      </div>
      {discount > 0 && (dealApplies ? (
        <p className="mt-2 flex items-center gap-2 text-14 text-[#1E7A44]">
          <Tag size={14} aria-hidden /> {initial?.dealLabel ?? `${initial?.discountPct}% deal`} applied: {inr(gross)} → <b>{inr(payable)}</b>
        </p>
      ) : (
        <p className="mt-2 flex items-center gap-2 text-14 text-[#9A4A08]">
          <Tag size={14} aria-hidden /> The {initial?.discountPct}% deal needs your Paytm card. Paying full {inr(gross)}.
        </p>
      ))}

      {best && (
        <div className="mt-3 flex items-center gap-2 rounded-btn bg-border px-3 py-2.5 text-14 text-text">
          <Sparkles size={16} className="text-primary" aria-hidden />
          <span>Best card here: <b>{best.card.issuer} ••{best.card.last4}</b> · {best.card.id === dealCard ? <>saves <b>{inr(discount)}</b> + </> : ''}earns <b>{inr(best.q.reward, best.q.reward % 1 ? 2 : 0)}</b></span>
        </div>
      )}

      {ranked.length > 0 && (
        <div role="radiogroup" aria-label="Pay with" className="mt-3 space-y-2">
          {ranked.map((r, i) => {
            const on = chosen?.card.id === r.card.id;
            return (
              <button key={r.card.id} type="button" role="radio" aria-checked={on} onClick={() => setSelected(r.card.id)}
                className={cx('flex w-full items-start gap-3 rounded-card border p-3 text-left', on ? 'border-primary bg-[#F2F6FC]' : 'border-[#D5DEEA]')}>
                <span className={cx('mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-chip border-2', on ? 'border-primary' : 'border-[#9AA6B8]')}>
                  {on && <span className="h-2.5 w-2.5 rounded-chip bg-primary" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-5 shrink-0 rounded-[3px]" style={{ background: r.card.color }} aria-hidden />
                    <span className="truncate text-14 font-semibold text-text">{r.card.issuer} ••{r.card.last4}</span>
                    {i === 0 && r.q.reward > 0 && <Badge tone="success">Best</Badge>}
                  </span>
                  <span className="mt-0.5 block text-12 text-muted">{r.reason}</span>
                  {dealCard && (r.card.id === dealCard
                    ? <span className="mt-1 flex"><Badge tone="success">{initial?.discountPct}% deal: −{inr(discount)}</Badge></span>
                    : <span className="mt-1 flex"><Badge tone="warning">No deal on this card</Badge></span>)}
                  {r.warnings.length > 0 && (
                    <span className="mt-1 flex flex-wrap gap-1">{r.warnings.map((w) => <Badge key={w.text} tone={w.tone}>{w.text}</Badge>)}</span>
                  )}
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-14 font-bold text-text">{inr(r.q.reward, 2)}</span>
                  <span className="block text-12 text-muted">{r.q.effectivePct.toFixed(1)}%</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
      <p className="mt-3 text-12 text-muted">Expected rewards use each card's sample reward rules and this month's caps.</p>
    </BottomSheet>
  );
}
