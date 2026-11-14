/* Flow A: welcome → confirm cards detected from SMS → choose data sources with consent → Home. */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, FileText, Landmark, Lock, MessageSquareText, PencilLine, PieChart, ShieldCheck, Gauge, Gift } from 'lucide-react';
import { ConsentSheet, type ConsentSource } from '../components/overlays';
import { Badge, Button, Card, Skeleton, Switch, cx } from '../components/ui';
import { p } from '../lib/paths';
import { cardTitle } from '../lib/selectors';
import { useData, usePersona } from '../store/data';
import { useUI } from '../store/ui';

type SourceId = 'sms' | 'statement' | 'manual';
const SOURCES: { id: SourceId | 'aa'; icon: typeof FileText; title: string; sub: string; consent?: ConsentSource; soon?: boolean }[] = [
  { id: 'sms', icon: MessageSquareText, title: 'SMS', sub: 'Android · transaction alerts only',
    consent: { title: 'Allow SMS access', reads: 'Only transaction alerts sent by your card issuers. Personal messages and OTPs are never read.', why: 'To show each card spend within seconds of payment.', revoke: 'Turn it off here any time, or remove SMS permission in Android settings. Data already read is deleted on request.' } },
  { id: 'statement', icon: FileText, title: 'Statement upload', sub: 'Optional · PDF statements',
    consent: { title: 'Statement upload', reads: 'We read charges and totals only.', why: 'To find interest, late fees and other charges, and to fill gaps on iPhone.', revoke: 'Delete anytime from Settings › Data sources. Files are removed within 24 hours.' } },
  { id: 'aa', icon: Landmark, title: 'Account Aggregator', sub: 'RBI-regulated consent framework', soon: true },
  { id: 'manual', icon: PencilLine, title: 'Manual entry', sub: 'Add spends yourself',
    consent: { title: 'Manual entry', reads: 'Only the spends you type in.', why: 'To track cards or cash spends that other sources miss.', revoke: 'Delete any entry from its detail screen.' } },
];

export default function Onboarding() {
  const nav = useNavigate();
  const d = useData();
  const persona = usePersona();
  const { completeOnboarding, comingSoon } = useUI();
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<string[]>(d.cards.map((c) => c.id));
  const [sources, setSources] = useState({ sms: false, statement: false, manual: false });
  const [consentFor, setConsentFor] = useState<SourceId | null>(null);

  useEffect(() => setPicked(d.cards.map((c) => c.id)), [d.cards]);
  useEffect(() => {
    if (step !== 3) return;
    const id = window.setTimeout(() => {
      completeOnboarding(picked.length > 0, sources);
      nav(p('/'), { replace: true });
    }, 1400);
    return () => clearTimeout(id);
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const back = () => (step === 0 ? nav('/') : setStep(step - 1));
  const consent = SOURCES.find((s) => s.id === consentFor)?.consent;

  return (
    <div className="flex min-h-full flex-col bg-surface">
      <header className="flex h-16 items-center gap-1 px-2">
        {step < 3 && (
          <button type="button" aria-label="Back" onClick={back} className="grid h-11 w-11 place-items-center text-primary">
            <ArrowLeft size={22} />
          </button>
        )}
        <span className="text-20 font-bold tracking-tight text-primary">paytm</span>
        <span className="ml-auto pr-2 text-12 text-muted">Prototype · sample data</span>
      </header>
      <div className="flex gap-1.5 px-4" aria-label={`Step ${step + 1} of 4`}>
        {[0, 1, 2, 3].map((i) => <span key={i} className={cx('h-1 flex-1 rounded-chip', i <= step ? 'bg-primary' : 'bg-[#E3E8EF]')} />)}
      </div>

      <div className="flex flex-1 flex-col px-4 pb-6 pt-6">
        {step === 0 && (
          <>
            <h1 className="text-28 font-bold text-text">All your card spends, in one place</h1>
            <p className="mt-2 text-16 text-muted">See every spend as it happens, stay inside your budgets and stop losing rewards.</p>
            <ul className="mt-6 space-y-4">
              {[
                { icon: PieChart, t: 'Live spends across all cards', s: 'Merchant names you recognise, not bank codes' },
                { icon: Gauge, t: 'Category limits', s: 'Get warned at 80% and 100%' },
                { icon: Gift, t: 'Rewards and benefits', s: 'Milestones, expiring points, unused perks' },
              ].map(({ icon: Icon, t, s }) => (
                <li key={t} className="flex gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-btn bg-border text-primary"><Icon size={20} aria-hidden /></span>
                  <span><span className="block text-14 font-semibold text-text">{t}</span><span className="block text-14 text-muted">{s}</span></span>
                </li>
              ))}
            </ul>
            <Card className="mt-6 flex gap-3 bg-background">
              <Lock size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden />
              <p className="text-14 text-text">Read-only. We never see full card numbers (last 4 digits only), and you can revoke access anytime.</p>
            </Card>
            <Button className="mt-auto w-full" onClick={() => setStep(1)}>Get started</Button>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="text-20 font-bold text-text">We found {d.cards.length} cards</h1>
            <p className="mt-1 text-14 text-muted">Detected from card alerts in your SMS (simulated for {persona.name}). Confirm the ones to track.</p>
            <ul className="mt-4 space-y-2">
              {d.cards.map((c) => {
                const on = picked.includes(c.id);
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => setPicked(on ? picked.filter((x) => x !== c.id) : [...picked, c.id])}
                      className={cx('flex w-full items-center gap-3 rounded-card border p-3 text-left min-h-[64px]', on ? 'border-primary bg-[#F2F6FC]' : 'border-[#D5DEEA]')}
                    >
                      <span className="h-9 w-14 shrink-0 rounded-[6px]" style={{ background: c.color }} aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-14 font-semibold text-text">{cardTitle(c)}</span>
                        <span className="block text-12 text-muted">{c.network} ••{c.last4}</span>
                      </span>
                      <span className={cx('grid h-6 w-6 place-items-center rounded-[6px] border-2', on ? 'border-primary bg-primary text-white' : 'border-[#9AA6B8]')}>
                        {on && <Check size={14} strokeWidth={3} aria-hidden />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-12 text-muted">Card names and reward rates are sample data.</p>
            <Button className="mt-auto w-full" onClick={() => setStep(2)}>
              {picked.length ? `Confirm ${picked.length} card${picked.length > 1 ? 's' : ''}` : 'Continue without cards'}
            </Button>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="text-20 font-bold text-text">Choose data sources</h1>
            <p className="mt-1 text-14 text-muted">Each one asks for consent first. You can change this later.</p>
            <ul className="mt-4 divide-y divide-border rounded-card border border-border">
              {SOURCES.map((s) => {
                const on = s.id !== 'aa' && sources[s.id as SourceId];
                return (
                  <li key={s.id} className="flex items-center gap-3 px-3 py-2">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-btn bg-border text-primary"><s.icon size={20} aria-hidden /></span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-14 font-semibold text-text">{s.title} {s.soon && <Badge>Coming soon</Badge>}</span>
                      <span className="block text-12 text-muted">{s.sub}</span>
                    </span>
                    {s.soon ? (
                      <Button variant="ghost" className="px-2" onClick={() => comingSoon('Account Aggregator support is planned for a later release.')}>Notify me</Button>
                    ) : (
                      <Switch
                        label={s.title}
                        checked={on}
                        onChange={(v) => (v ? setConsentFor(s.id as SourceId) : setSources({ ...sources, [s.id]: false }))}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 flex items-start gap-2 text-12 text-muted">
              <ShieldCheck size={14} className="mt-0.5 shrink-0" aria-hidden />
              On iPhone, SMS can't be read; spends update from statements instead.
            </p>
            <Button className="mt-auto w-full" onClick={() => setStep(3)}>
              {Object.values(sources).some(Boolean) ? 'Continue' : 'Skip for now'}
            </Button>
          </>
        )}

        {step === 3 && (
          <div className="flex flex-1 flex-col">
            <h1 className="text-20 font-bold text-text">Setting up your dashboard…</h1>
            <p className="mt-1 text-14 text-muted">Matching merchants with the Paytm merchant network.</p>
            <div className="mt-6 space-y-3" aria-busy="true">
              <Skeleton className="h-24 w-full" />
              <div className="grid grid-cols-2 gap-3"><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          </div>
        )}
      </div>

      {consent && (
        <ConsentSheet
          open
          source={consent}
          onClose={() => setConsentFor(null)}
          onAllow={() => { setSources({ ...sources, [consentFor!]: true }); setConsentFor(null); }}
        />
      )}
    </div>
  );
}
