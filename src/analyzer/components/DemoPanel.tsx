import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BroadcastSheet } from './demoSheets';
import { BellRing, Flag, FlaskConical, Megaphone, QrCode, RotateCcw, Wallet } from 'lucide-react';
import { useUI } from '../store/ui';
import { PERSONAS, useStore } from '../store/data';
import { notifyPayment } from '../lib/notify';
import { daysUntil } from '../lib/format';
import { inr } from '../lib/paths';
import { expiryValueInr } from '../lib/selectors';
import { flowBPayment, randomPayment } from '../lib/simulate';
import type { NewTxnInput } from '../lib/ledger';
import { p } from '../lib/paths';
import { BottomSheet } from './overlays';
import { Button } from './ui';

/** PRD DemoPanel: floating button + developer controls. Wired to the data store in Phase 2+. */
export function DemoFab({ raised }: { raised: boolean }) {
  const setOpen = useUI((s) => s.setDemoOpen);
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Open demo panel"
      className={`absolute left-3 z-30 inline-flex items-center gap-1.5 h-11 px-3 rounded-chip bg-text/85 text-white text-12 font-semibold shadow-soft ${raised ? 'bottom-[76px]' : 'bottom-4'}`}
    >
      <FlaskConical size={16} aria-hidden /> Demo
    </button>
  );
}

export function DemoPanel() {
  const { demoOpen, setDemoOpen, comingSoon, setOnboarded, toast, openCheckout } = useUI();
  const { persona, setPersona, resetData, addTransaction, setCircleFlag } = useStore();
  const location = useLocation();
  const [broadcast, setBroadcast] = useState(false);
  /** F7 guardrail: flag the circle on screen (or the first one) for one-way repayments. */
  const oneWayFlag = () => {
    setDemoOpen(false);
    const onScreen = location.pathname.match(/\/circle\/([^/]+)/)?.[1];
    const c = data.circles.circles.find((x) => x.id === onScreen) ?? data.circles.circles[0];
    if (!c) return comingSoon('This persona has no circles. Switch to Karan.');
    setCircleFlag(c.id, true);
    toast({ tone: 'warning', title: `${c.name}: splits paused for review`, body: 'This circle has frequent one-way repayments.', to: p(`/circle/${c.id}`) });
  };
  const data = useStore((s) => s.byPersona[s.persona]);
  const pay = (input: NewTxnInput) => {
    setDemoOpen(false);
    notifyPayment(input, data.cards.find((c) => c.id === input.cardId)!);
    addTransaction(input); // limit alerts (if any) toast right after
  };
  const expiryAlert = () => {
    const e = [...data.benefits.expiries].filter((x) => daysUntil(x.expiresOn) >= 0).sort((a, b) => a.expiresOn.localeCompare(b.expiresOn))
      .find((x) => x.kind === 'points') ?? data.benefits.expiries[0];
    setDemoOpen(false);
    if (!e) return comingSoon('This persona has nothing expiring.');
    const card = data.cards.find((c) => c.id === e.cardId)!;
    const days = daysUntil(e.expiresOn);
    toast({
      tone: 'warning',
      title: e.kind === 'points'
        ? `${e.value.toLocaleString('en-IN')} points (≈${inr(expiryValueInr(e, data.cards))}) on your ${card.issuer} card expire in ${days} days`
        : `Your ${inr(e.value)} voucher on ${card.issuer} ••${card.last4} expires in ${days} days`,
      body: 'Tap to see how to use them',
      to: `${p(`/rewards/card/${card.id}`)}?tab=rewards`,
    });
  };
  const nav = useNavigate();
  const controls = [
    { icon: Wallet, label: 'Simulate payment (random merchant)', run: () => pay(randomPayment(data)) },
    { icon: Wallet, label: 'Simulate ₹640 food payment (Flow B)', run: () => pay(flowBPayment(data)) },
    { icon: QrCode, label: 'Simulate QR scan at Swiggy', run: () => openCheckout({ merchant: 'Swiggy', rawDescriptor: 'RAZ*SWIGGY', category: 'food', amount: 450 }) },
    { icon: BellRing, label: 'Simulate expiry alert', run: expiryAlert },
    { icon: Flag, label: 'Simulate one-way repayment flag', run: oneWayFlag },
    { icon: Megaphone, label: 'Broadcast a deal (merchant preview)', run: () => { setDemoOpen(false); setBroadcast(true); } },
  ];
  return (
    <>
    <BroadcastSheet open={broadcast} onClose={() => setBroadcast(false)} />
    <BottomSheet open={demoOpen} onClose={() => setDemoOpen(false)} title="Demo panel">
      <p className="text-12 text-muted mb-3">Developer controls · everything here is simulated</p>
      <p className="text-14 font-semibold text-text mb-2">Persona</p>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {PERSONAS.map((x) => (
          <button
            key={x.id}
            type="button"
            aria-pressed={x.id === persona}
            onClick={() => {
              setPersona(x.id);
              setDemoOpen(false);
              toast({ title: `Now viewing as ${x.name}`, body: `${x.archetype} · ${x.city} · ${x.monthlySpend}`, tone: 'success' });
              nav(p('/'));
            }}
            className={`min-h-[56px] rounded-btn border px-2 text-left ${x.id === persona ? 'border-primary bg-[#E6ECF7]' : 'border-[#D5DEEA] bg-surface'}`}
          >
            <span className="block text-14 font-semibold text-text">{x.name}</span>
            <span className="block text-12 leading-tight text-[#4A4A4A]">{x.archetype}</span>
          </button>
        ))}
      </div>
      <p className="text-14 font-semibold text-text mb-2">Events</p>
      <div className="flex flex-col gap-2">
        {controls.map(({ icon: Icon, label, run }) => (
          <Button key={label} variant="secondary" className="!justify-start" onClick={run}>
            <Icon size={18} aria-hidden /> {label}
          </Button>
        ))}
        <div className="grid grid-cols-2 gap-2 mt-2">
          <Button
            variant="secondary"
            onClick={() => {
              resetData();
              setDemoOpen(false);
              toast({ title: 'Demo data reset', body: 'All personas reloaded from the mock data files.', tone: 'info' });
            }}
          >
            <RotateCcw size={16} aria-hidden /> Reset data
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setOnboarded(false);
              setDemoOpen(false);
              nav(p('/onboarding'));
            }}
          >
            Replay onboarding
          </Button>
        </div>
      </div>
    </BottomSheet>
    </>
  );
}
