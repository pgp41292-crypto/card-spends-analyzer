/* /circle — F7 My circles + Create circle sheet. */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, ChevronRight, House, Plane, Plus, ShieldCheck, Users } from 'lucide-react';
import AppHeader from '../components/AppHeader';
import { BottomSheet } from '../components/overlays';
import { useFirstLoad } from '../components/useFirstLoad';
import { Badge, Button, Card, EmptyState, Segmented, Skeleton, Switch, cx } from '../components/ui';
import { MOCK_CONTACTS, balances, selfId } from '../lib/circles';
import { inr, p } from '../lib/paths';
import type { Circle as CircleT } from '../types';
import { useData, usePersona, useStore } from '../store/data';
import { useUI } from '../store/ui';

export const CIRCLE_ICON = { family: House, trip: Plane, friends: Users };
const AVATAR_COLORS = ['#002970', '#9B51E0', '#27AE60', '#F2994A', '#EB5757', '#2F80ED'];

export function Avatars({ c }: { c: CircleT }) {
  return (
    <span className="flex -space-x-2" aria-label={`${c.members.length} members`}>
      {c.members.slice(0, 5).map((m, i) => (
        <span key={m.id} className="grid h-8 w-8 place-items-center rounded-chip border-2 border-white text-12 font-bold text-white" style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }} aria-hidden>
          {m.name[0]}
        </span>
      ))}
    </span>
  );
}

export function BalanceLine({ c, self }: { c: CircleT; self: string }) {
  const { owed, owe } = balances(c, self);
  if (!owed && !owe) return <span className="text-14 font-semibold text-[#1E7A44]">All settled</span>;
  return (
    <span className="text-14 font-semibold">
      {owed > 0 && <span className="text-[#1E7A44]">You're owed {inr(owed)}</span>}
      {owed > 0 && owe > 0 && <span className="text-muted"> · </span>}
      {owe > 0 && <span className="text-[#B42318]">You owe {inr(owe)}</span>}
    </span>
  );
}

export default function Circle() {
  const d = useData();
  const persona = usePersona();
  const loading = useFirstLoad('circle');
  const createCircle = useStore((s) => s.createCircle);
  const toast = useUI((s) => s.toast);
  const nav = useNavigate();
  const self = selfId(persona.id);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<CircleT['type']>('friends');
  const [picked, setPicked] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);

  const create = () => {
    const id = `circle_${Date.now().toString(36)}`;
    const myCards = d.cards.map((c) => ({ issuer: c.issuer, name: c.name.replace(' (sample)', '') }));
    createCircle(
      { id, name: name.trim(), type, monthlyPaidForOthers: 0, monthlyCap: 25000, splits: [],
        members: [{ id: self, name: `${persona.name} (you)`, cards: myCards }, ...MOCK_CONTACTS.filter((x) => picked.includes(x.id))] },
      // Sample offers for the new members so "Who should pay?" has something to rank.
      MOCK_CONTACTS.filter((x) => picked.includes(x.id)).map((x, i) => ({
        memberId: x.id, cardName: `${x.cards[0].issuer} ${x.cards[0].name}`, category: (['food', 'travel', 'shopping', 'groceries', 'entertainment'] as const)[i % 5],
        ratePct: 5, maxSaving: 1000, note: '5% on this category (sample offer)',
      })),
    );
    setOpen(false); setName(''); setPicked([]); setConsent(false);
    toast({ title: `${name.trim()} created`, body: 'Members see card names only, never numbers.', tone: 'success' });
    nav(p(`/circle/${id}`));
  };

  return (
    <>
      <AppHeader title="Credit Circle" />
      <div className="px-4 pb-28 pt-4">
        <p className="text-14 text-muted">Find the best card in your group for shared purchases, split the cost and settle over UPI.</p>
        <div className="mt-3 space-y-3">
          {loading ? (
            [0, 1].map((i) => <Skeleton key={i} className="h-24" />)
          ) : d.circles.circles.length === 0 ? (
            <Card className="p-0"><EmptyState icon={Users} title="No circles yet" body="Create one for family, a trip or friends." /></Card>
          ) : (
            d.circles.circles.map((c) => {
              const Icon = CIRCLE_ICON[c.type];
              return (
                <Link key={c.id} to={p(`/circle/${c.id}`)} className="flex items-center gap-3 rounded-card border border-border bg-surface p-4 shadow-soft">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-btn bg-border text-primary"><Icon size={22} aria-hidden /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-16 font-semibold text-text">{c.name}</span>
                      {c.pausedForReview && <Badge tone="warning">Paused</Badge>}
                    </span>
                    <span className="mt-1 flex items-center gap-2"><Avatars c={c} /><span className="text-12 text-muted">{c.members.length} members</span></span>
                    <span className="mt-1 block"><BalanceLine c={c} self={self} /></span>
                  </span>
                  <ChevronRight size={18} className="text-muted" aria-hidden />
                </Link>
              );
            })
          )}
        </div>
        <Button className="mt-4 w-full" onClick={() => setOpen(true)}><Plus size={18} aria-hidden /> Create circle</Button>
        <p className="mt-3 flex items-start gap-2 text-12 text-muted">
          <ShieldCheck size={14} className="mt-0.5 shrink-0" aria-hidden />
          Splits are for shared purchases only. Cash-like purchases can't be split, and paying for others is capped each month.
        </p>
      </div>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="Create circle"
        footer={<Button className="w-full" disabled={!name.trim() || picked.length === 0 || !consent} onClick={create}>Create circle</Button>}>
        <label htmlFor="cname" className="text-14 font-semibold text-text">Name</label>
        <input id="cname" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Flatmates"
          className="mt-1 h-11 w-full rounded-btn border border-[#C9D6EA] px-3 text-14 text-text placeholder:text-muted" />
        <p className="mt-3 mb-1 text-14 font-semibold text-text">Type</p>
        <Segmented<CircleT['type']> label="Circle type" value={type} onChange={setType}
          options={[{ value: 'family', label: 'Family' }, { value: 'trip', label: 'Trip' }, { value: 'friends', label: 'Friends' }]} />
        <p className="mt-3 mb-1 text-14 font-semibold text-text">Add members from contacts <span className="font-normal text-muted">(sample)</span></p>
        <ul className="divide-y divide-border rounded-btn border border-border">
          {MOCK_CONTACTS.map((x) => {
            const on = picked.includes(x.id);
            return (
              <li key={x.id}>
                <button type="button" role="checkbox" aria-checked={on} onClick={() => setPicked(on ? picked.filter((i) => i !== x.id) : [...picked, x.id])}
                  className="flex min-h-[48px] w-full items-center gap-3 px-3 text-left">
                  <span className="flex-1 text-14 text-text">{x.name}</span>
                  <span className={cx('grid h-6 w-6 place-items-center rounded-[6px] border-2', on ? 'border-primary bg-primary text-white' : 'border-[#9AA6B8]')}>
                    {on && <Check size={14} strokeWidth={3} aria-hidden />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="mt-3 flex items-center gap-3 rounded-btn bg-background p-3">
          <span className="flex-1 text-14 text-text">Share which cards you hold <span className="text-muted">(names only, never numbers)</span></span>
          <Switch label="Share which cards you hold" checked={consent} onChange={setConsent} />
        </div>
      </BottomSheet>
    </>
  );
}
