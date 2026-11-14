/* Demo-panel sheets: F10 merchant "Broadcast a deal" preview and F7 tag-as-shared. */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Megaphone } from 'lucide-react';
import { selfId } from '../lib/circles';
import { DEMO_NOW } from '../lib/clock';
import { inr, p } from '../lib/paths';
import type { Transaction } from '../types';
import { useData, usePersona, useStore } from '../store/data';
import { useUI } from '../store/ui';
import { BottomSheet } from './overlays';
import { Button, Segmented, cx } from './ui';

/** F10 optional merchant preview: how a shop would send a deal. */
export function BroadcastSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addDeal = useStore((s) => s.addDeal);
  const toast = useUI((s) => s.toast);
  const nav = useNavigate();
  const [item, setItem] = useState('Fresh croissants');
  const [pct, setPct] = useState('30');
  const [until, setUntil] = useState('21:30');
  return (
    <BottomSheet open={open} onClose={onClose} title="Broadcast a deal"
      footer={<Button className="w-full" disabled={!item.trim()} onClick={() => {
        addDeal({ id: `d_live_${Date.now()}`, merchant: 'Your shop (merchant preview)', distanceKm: 0.2, item: item.trim(), discountPct: Number(pct),
          validUntil: `${DEMO_NOW.slice(0, 10)}T${until}:00+05:30`, requiresPaytmCobrand: true });
        toast({ title: 'Deal sent to nearby Paytm cardholders', body: `${pct}% off ${item.trim()} until ${until} (mock broadcast)`, tone: 'success', to: p('/deals') });
        onClose(); nav(p('/deals'));
      }}><Megaphone size={16} aria-hidden /> Broadcast</Button>}>
      <p className="mb-3 rounded-btn bg-background p-3 text-12 text-muted">Merchant preview: this is what a Paytm shop owner would see. Deals reach Paytm co-branded card holders within 2 km.</p>
      <label htmlFor="b-item" className="text-14 font-semibold text-text">Item</label>
      <input id="b-item" value={item} onChange={(e) => setItem(e.target.value)} className="mt-1 h-11 w-full rounded-btn border border-[#C9D6EA] px-3 text-14 text-text" />
      <p className="mt-3 mb-1 text-14 font-semibold text-text">Discount</p>
      <Segmented label="Discount" value={pct} onChange={setPct} options={['10', '20', '30', '50'].map((v) => ({ value: v, label: `${v}%` }))} />
      <label htmlFor="b-until" className="mt-3 block text-14 font-semibold text-text">Ends at</label>
      <input id="b-until" type="time" value={until} onChange={(e) => setUntil(e.target.value)} className="mt-1 h-11 w-full rounded-btn border border-[#C9D6EA] px-3 text-14 text-text" />
    </BottomSheet>
  );
}

/** F7 link to P1: tag an existing spend as shared → equal split in a circle, recoverable part excluded from limits. */
export function TagSharedSheet({ txn, open, onClose }: { txn: Transaction; open: boolean; onClose: () => void }) {
  const d = useData();
  const persona = usePersona();
  const createSplit = useStore((s) => s.createSplit);
  const toast = useUI((s) => s.toast);
  const nav = useNavigate();
  const [circleId, setCircleId] = useState(d.circles.circles[0]?.id ?? '');
  const c = d.circles.circles.find((x) => x.id === circleId);
  const self = selfId(persona.id);
  const n = c?.members.length ?? 1;
  const recoverable = Math.floor(txn.amount / n) * (n - 1); // payer keeps the rounding remainder (matches applyCreateSplit)
  return (
    <BottomSheet open={open} onClose={onClose} title="Tag as shared"
      footer={d.circles.circles.length === 0
        ? <Button className="w-full" onClick={() => { onClose(); nav(p('/circle')); }}>Create a circle first</Button>
        : <Button className="w-full" disabled={!c || c.pausedForReview} onClick={() => {
            createSplit(c!.id, { title: txn.merchantDisplayName ?? txn.rawDescriptor, category: txn.category, amount: txn.amount, payerId: self, memberIds: c!.members.map((m) => m.id), existingTxnId: txn.id });
            toast({ title: 'Tagged as shared', body: `${inr(recoverable)} to get back from ${c!.name}. Excluded from your limits.`, tone: 'success' });
            onClose();
          }}>Split {inr(txn.amount)} with {c?.name}</Button>}>
      {d.circles.circles.length === 0 ? (
        <p className="text-14 text-muted">You're not in any circle yet. Create one with the people you share purchases with.</p>
      ) : (
        <>
          <p className="mb-2 text-14 text-muted">Split equally with a circle. Your share stays in your spends; the rest is marked as money you'll get back.</p>
          <div className="space-y-2">
            {d.circles.circles.map((x) => (
              <button key={x.id} type="button" role="radio" aria-checked={x.id === circleId} onClick={() => setCircleId(x.id)}
                className={cx('flex min-h-[52px] w-full items-center justify-between rounded-btn border px-3 text-left', x.id === circleId ? 'border-primary bg-[#F2F6FC]' : 'border-[#D5DEEA]')}>
                <span className="text-14 font-semibold text-text">{x.name}</span>
                <span className="text-12 text-muted">{x.members.length} members{x.pausedForReview ? ' · paused' : ''}</span>
              </button>
            ))}
          </div>
          {c && <p className="mt-3 text-14 text-text">You'll get back <b>{inr(recoverable)}</b> ({n - 1} × {inr(Math.floor(txn.amount / n))}).</p>}
        </>
      )}
    </BottomSheet>
  );
}
