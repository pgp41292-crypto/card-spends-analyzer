/* /rewards/tips/:id — F6 tip guide. */
import { useParams } from 'react-router-dom';
import { Check, Flag, Lightbulb } from 'lucide-react';
import AppHeader from '../components/AppHeader';
import { SOURCE_ICON, VerifiedBadge } from '../components/tips';
import { Badge, Button, Card, EmptyState, SectionTitle } from '../components/ui';
import { inr } from '../lib/paths';
import { useData } from '../store/data';
import { useUI } from '../store/ui';

export default function TipDetail() {
  const { id } = useParams();
  const d = useData();
  const { tipState, setTipState, toast } = useUI();
  const t = d.tips.find((x) => x.id === id);
  if (!t) return (<><AppHeader title="Tip" back /><EmptyState icon={Lightbulb} title="Tip not found" body="It may belong to another persona." /></>);

  const cards = d.cards.filter((c) => t.cardIds.includes(c.id));
  const state = tipState[t.id];
  const review = t.status === 'needs_review';

  return (
    <>
      <AppHeader title="Tip guide" back />
      <div className="px-4 pb-24 pt-4">
        <div className="flex flex-wrap gap-1.5">
          <VerifiedBadge tip={t} />
          {cards.map((c) => <Badge key={c.id} tone="primary">Works with your {c.issuer} card</Badge>)}
          {!cards.length && <Badge>For a card you don't have</Badge>}
        </div>
        <h2 className="mt-3 text-20 font-bold text-text">{t.title}</h2>
        <p className="mt-1 text-14 text-muted">Estimated saving <b className="text-[#1E7A44]">~{inr(t.estSavingInr)}</b> a year (sample estimate)</p>

        <SectionTitle>Steps</SectionTitle>
        <Card>
          <ol className="space-y-3">
            {t.steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-chip bg-primary text-12 font-bold text-white">{i + 1}</span>
                <span className="pt-0.5 text-14 text-text">{s}</span>
              </li>
            ))}
          </ol>
        </Card>

        <SectionTitle>Sources</SectionTitle>
        <Card className="p-0">
          <ul className="divide-y divide-border">
            {t.sources.map((s, i) => {
              const S = SOURCE_ICON[s.type];
              return (
                <li key={i} className="flex min-h-[52px] items-center gap-3 px-4">
                  <S.icon size={18} className="text-primary" aria-hidden />
                  <span className="flex-1 text-14 text-text">{s.label}</span>
                  <Badge>{S.label}</Badge>
                </li>
              );
            })}
          </ul>
        </Card>

        {review && <p className="mt-4 rounded-btn bg-[#EEF1F5] p-3 text-12 text-[#4A4A4A]">This tip is under review against the latest issuer terms, so it can't be marked as tried yet.</p>}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button disabled={review || state === 'tried'} onClick={() => { setTipState(t.id, 'tried'); toast({ title: 'Marked as tried', body: 'Thanks. This helps rank tips for others.', tone: 'success' }); }}>
            {state === 'tried' ? <><Check size={16} aria-hidden /> Tried</> : 'Mark as tried'}
          </Button>
          <Button variant="secondary" disabled={state === 'reported'} onClick={() => { setTipState(t.id, 'reported'); toast({ title: 'Reported as outdated', body: "We'll re-check it against issuer terms.", tone: 'info' }); }}>
            <Flag size={16} aria-hidden /> {state === 'reported' ? 'Reported' : 'Report outdated'}
          </Button>
        </div>
      </div>
    </>
  );
}
