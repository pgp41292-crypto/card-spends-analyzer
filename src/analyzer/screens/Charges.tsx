/* /spends/charges — F3 hidden charges and interest detector. */
import { useEffect, useState } from 'react';
import { BellRing, Check, Copy, FileText, PartyPopper, Upload } from 'lucide-react';
import AppHeader from '../components/AppHeader';
import { BottomSheet, ConsentSheet } from '../components/overlays';
import { useFirstLoad } from '../components/useFirstLoad';
import { Badge, Button, Card, CardChip, EmptyState, SectionTitle, Skeleton } from '../components/ui';
import { QUARTER_START } from '../lib/clock';
import { fmtMonth } from '../lib/format';
import { inr } from '../lib/paths';
import { cardById } from '../lib/selectors';
import type { Charge } from '../types';
import { useData } from '../store/data';
import { useUI } from '../store/ui';

/* color = bar/legend fill; ink + tint = AA-contrast chip text and background. */
export const CHARGE_TYPE: Record<Charge['type'], { label: string; color: string; ink: string; tint: string }> = {
  interest: { label: 'Interest', color: '#EB5757', ink: '#B42318', tint: '#FDE8E8' },
  late_fee: { label: 'Late fee', color: '#F2994A', ink: '#9A4A08', tint: '#FDEEDF' },
  annual_fee: { label: 'Annual fee', color: '#9B51E0', ink: '#6B21A8', tint: '#F3E8FF' },
  forex_markup: { label: 'Forex markup', color: '#2F80ED', ink: '#1E4FA8', tint: '#E3EDFC' },
  gst: { label: 'GST', color: '#828282', ink: '#4A4A4A', tint: '#EEF1F5' },
  other: { label: 'Other', color: '#C9A227', ink: '#6B5A10', tint: '#FBF3D6' },
};
const stmt = (ym: string) => `${fmtMonth(ym)} ${ym.slice(0, 4)} statement`;
const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`;

function reversalMessage(c: Charge, issuer: string, last4: string) {
  return `Dear ${issuer} team,

I see a ${CHARGE_TYPE[c.type].label.toLowerCase()} of ${inr(c.amount)} on my credit card ending ${last4} in the ${stmt(c.statementMonth)}. ${c.note}

I have a good repayment record with you and request a one-time reversal of this charge as a goodwill gesture.

Thank you.`;
}

export default function Charges() {
  const d = useData();
  const { toast, reminders, toggleReminder, setSource } = useUI();
  const loading = useFirstLoad('charges');
  const [reversal, setReversal] = useState<Charge | null>(null);
  const [consent, setConsent] = useState(false);
  const [upload, setUpload] = useState<'pick' | 'parsing' | 'done' | null>(null);

  const quarter = d.charges.filter((c) => `${c.statementMonth}-01` >= QUARTER_START);
  const earlier = d.charges.filter((c) => `${c.statementMonth}-01` < QUARTER_START);
  const total = quarter.reduce((s, c) => s + c.amount, 0);
  const byType = Object.entries(
    quarter.reduce<Record<string, number>>((m, c) => ({ ...m, [c.type]: (m[c.type] ?? 0) + c.amount }), {}),
  ).sort((a, b) => b[1] - a[1]) as [Charge['type'], number][];

  useEffect(() => {
    if (upload !== 'parsing') return;
    const id = window.setTimeout(() => setUpload('done'), 2000);
    return () => clearTimeout(id);
  }, [upload]);

  const remind = (cardId: string) => {
    const card = cardById(d.cards, cardId)!;
    const on = toggleReminder(cardId);
    toast({ tone: on ? 'success' : 'info', title: on ? 'Bill reminder on' : 'Bill reminder off',
      body: on ? `We'll remind you 3 days before your ${card.issuer} ••${card.last4} bill is due on the ${ordinal(card.dueDay)}.` : undefined });
  };

  const Row = ({ c }: { c: Charge }) => {
    const card = cardById(d.cards, c.cardId);
    const on = reminders.includes(c.cardId);
    return (
      <li className="px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-chip px-2 py-0.5 text-12 font-semibold" style={{ background: CHARGE_TYPE[c.type].tint, color: CHARGE_TYPE[c.type].ink }}>{CHARGE_TYPE[c.type].label}</span>
              {card && <CardChip issuer={card.issuer} last4={card.last4} color={card.color} />}
              {c.reversible && <Badge tone="success">Reversible</Badge>}
            </div>
            <p className="mt-1.5 text-14 text-text">{c.note}</p>
            <p className="text-12 text-muted">{stmt(c.statementMonth)}</p>
          </div>
          <span className="shrink-0 text-16 font-bold text-[#B42318]">{inr(c.amount)}</span>
        </div>
        {c.reversible && card && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button variant="secondary" className="px-2" onClick={() => setReversal(c)}>Ask for reversal</Button>
            <Button variant="secondary" className="px-2" onClick={() => remind(c.cardId)}>
              {on ? <><Check size={16} aria-hidden /> Reminder on</> : <><BellRing size={16} aria-hidden /> Turn on bill reminder</>}
            </Button>
          </div>
        )}
      </li>
    );
  };

  return (
    <>
      <AppHeader title="Charges & interest" back />
      <div className="px-4 pb-24 pt-4">
        <Card>
          <p className="text-12 text-muted">Charges this quarter (Oct–Dec)</p>
          {loading ? <Skeleton className="mt-1 h-8 w-32" /> : <p className={`text-28 font-bold ${total ? 'text-[#B42318]' : 'text-[#1E7A44]'}`}>{inr(total)}</p>}
          {total > 0 && (
            <>
              <div className="mt-3 flex h-3 overflow-hidden rounded-chip" role="img" aria-label={byType.map(([t, v]) => `${CHARGE_TYPE[t].label} ${inr(v)}`).join(', ')}>
                {byType.map(([t, v]) => <span key={t} style={{ width: `${(v / total) * 100}%`, background: CHARGE_TYPE[t].color }} />)}
              </div>
              <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1">
                {byType.map(([t, v]) => (
                  <li key={t} className="flex items-center gap-2 text-12">
                    <span className="h-2.5 w-2.5 rounded-chip" style={{ background: CHARGE_TYPE[t].color }} aria-hidden />
                    <span className="flex-1 text-text">{CHARGE_TYPE[t].label}</span>
                    <span className="font-semibold text-text">{inr(v)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <Button variant="secondary" className="mt-4 w-full" onClick={() => setConsent(true)}>
            <Upload size={16} aria-hidden /> Add statement
          </Button>
        </Card>

        <SectionTitle>This quarter</SectionTitle>
        <Card className="p-0">
          {loading ? (
            <div className="space-y-3 p-4" aria-busy="true">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}</div>
          ) : quarter.length === 0 ? (
            <EmptyState icon={PartyPopper} title="No charges found. Nice!" body="We'll flag interest, late fees and markups from your statements here." />
          ) : (
            <ul className="divide-y divide-border">{quarter.map((c) => <Row key={c.id} c={c} />)}</ul>
          )}
        </Card>

        {earlier.length > 0 && (
          <>
            <SectionTitle>Earlier</SectionTitle>
            <Card className="p-0"><ul className="divide-y divide-border">{earlier.map((c) => <Row key={c.id} c={c} />)}</ul></Card>
          </>
        )}
        <p className="mt-3 text-12 text-muted">Charges come from sample statements.</p>
      </div>

      <ConsentSheet
        open={consent}
        onClose={() => setConsent(false)}
        onAllow={() => { setConsent(false); setSource('statement', true); setUpload('pick'); }}
        source={{ title: 'Add a statement', reads: 'We read charges and totals only. Delete anytime.', why: 'To find interest, late fees, forex markups and other charges you can act on.', revoke: 'Delete the statement from Settings › Data sources. Files are removed within 24 hours.' }}
      />

      <BottomSheet open={!!upload} onClose={() => setUpload(null)} title="Add statement"
        footer={upload === 'done' ? <Button className="w-full" onClick={() => setUpload(null)}>Done</Button> : undefined}>
        {upload === 'pick' && (
          <button type="button" onClick={() => setUpload('parsing')}
            className="flex min-h-[120px] w-full flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-[#C9D6EA] text-primary">
            <FileText size={28} aria-hidden />
            <span className="text-14 font-semibold">Choose a PDF statement</span>
            <span className="text-12 text-muted">Mock upload · no file leaves your device</span>
          </button>
        )}
        {upload === 'parsing' && (
          <div className="py-4" aria-busy="true">
            <p className="text-14 font-semibold text-text">Reading Statement_Nov_2026.pdf…</p>
            <p className="text-12 text-muted">Looking for interest, fees and markups</p>
            <div className="mt-3 h-2 overflow-hidden rounded-chip bg-[#E8EEF6]">
              <div className="h-full rounded-chip bg-accent animate-[azparse_2s_linear_forwards]" />
            </div>
          </div>
        )}
        {upload === 'done' && (
          <div className="py-2">
            <p className="flex items-center gap-2 text-14 font-semibold text-text"><Check size={18} className="text-success" aria-hidden /> Statement read</p>
            <p className="mt-1 text-14 text-muted">
              {quarter.length ? `Found ${quarter.length} charge${quarter.length > 1 ? 's' : ''} worth ${inr(total)} this quarter. They're listed on this screen.` : 'No charges found. Nice!'}
            </p>
          </div>
        )}
      </BottomSheet>

      <BottomSheet open={!!reversal} onClose={() => setReversal(null)} title="Ask for reversal"
        footer={reversal && (() => {
          const card = cardById(d.cards, reversal.cardId)!;
          const msg = reversalMessage(reversal, card.issuer, card.last4);
          return (
            <Button className="w-full" onClick={async () => {
              try { await navigator.clipboard.writeText(msg); toast({ title: 'Message copied', body: `Paste it in the ${card.issuer} app chat or email.`, tone: 'success' }); }
              catch { toast({ title: 'Copy failed', body: 'Select the text and copy it manually.', tone: 'warning' }); }
            }}>
              <Copy size={16} aria-hidden /> Copy message
            </Button>
          );
        })()}>
        {reversal && (() => {
          const card = cardById(d.cards, reversal.cardId)!;
          return (
            <>
              <p className="text-14 text-muted">Send this to {card.issuer} from their app, email or phone banking.</p>
              <textarea readOnly aria-label="Reversal message" value={reversalMessage(reversal, card.issuer, card.last4)}
                className="mt-3 h-56 w-full resize-none rounded-btn border border-[#C9D6EA] bg-background p-3 text-14 text-text" />
            </>
          );
        })()}
      </BottomSheet>
    </>
  );
}
