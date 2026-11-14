/* /spends/txn/:id — F2 "How we identified this", fix category; F7 tag as shared (Phase 5). */
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowDown, BadgeCheck, CircleHelp, SearchX, Sparkles, UserCheck, Users } from 'lucide-react';
import AppHeader from '../components/AppHeader';
import { FixCategorySheet } from '../components/sheets';
import { TagSharedSheet } from '../components/demoSheets';
import { SOURCE_LABEL } from '../components/TxnRow';
import { Badge, Button, Card, CardChip, CategoryIcon, EmptyState } from '../components/ui';
import { CATEGORIES } from '../lib/categories';
import { dayLabel, fmtTime } from '../lib/format';
import { inr } from '../lib/paths';
import { cardById } from '../lib/selectors';
import { useData, useStore } from '../store/data';
import { useUI } from '../store/ui';

const SOURCE_TEXT = {
  paytm_network: { label: 'Matched from Paytm merchant network', icon: BadgeCheck, tone: 'success' as const },
  user_corrected: { label: 'Corrected by you', icon: UserCheck, tone: 'primary' as const },
  unresolved: { label: 'Unresolved', icon: CircleHelp, tone: 'warning' as const },
};

export default function TxnDetail() {
  const { id } = useParams();
  const d = useData();
  const correct = useStore((s) => s.correctTransaction);
  const { toast } = useUI();
  const [fixOpen, setFixOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const t = d.transactions.find((x) => x.id === id);

  if (!t) {
    return (
      <>
        <AppHeader title="Transaction" back />
        <EmptyState icon={SearchX} title="Transaction not found" body="It may belong to another persona. Switch persona in the Demo panel." />
      </>
    );
  }
  const card = cardById(d.cards, t.cardId);
  const best = t.bestCardId ? cardById(d.cards, t.bestCardId) : undefined;
  const src = SOURCE_TEXT[t.merchantSource];
  const needsConfirm = t.confidence < 0.7 && t.merchantSource !== 'user_corrected';
  const conf = Math.round(t.confidence * 100);

  return (
    <>
      <AppHeader title="Transaction" back />
      <div className="space-y-3 px-4 pb-24 pt-4">
        <Card className="text-center">
          <div className="flex justify-center"><CategoryIcon category={t.category} size={52} /></div>
          <p className="mt-2 text-16 font-semibold text-text">{t.merchantDisplayName ?? 'Unknown merchant'}</p>
          <p className="text-28 font-bold text-primary">{inr(t.amount)}</p>
          <p className="text-14 text-muted">{dayLabel(t.timestamp)}, {fmtTime(t.timestamp)}</p>
          <div className="mt-2 flex flex-wrap justify-center gap-1.5">
            {card && <CardChip issuer={card.issuer} last4={card.last4} color={card.color} />}
            <Badge tone={t.source === 'paytm' ? 'accent' : 'neutral'}>via {SOURCE_LABEL[t.source]}</Badge>
            {t.isShared && <Badge tone="primary"><Users size={12} aria-hidden /> Shared · {inr(t.recoverableAmount ?? 0)} to get back</Badge>}
          </div>
        </Card>

        {needsConfirm && (
          <Card className="border-[#F6D3B3] bg-[#FDEEDF]">
            <p className="text-14 font-semibold text-text">Is this {CATEGORIES[t.category].label}?</p>
            <p className="text-14 text-[#4A4A4A]">We couldn't match this merchant with confidence. Confirming improves matches for everyone.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => { correct(t.id, {}); toast({ title: 'Thanks. This helps others too.', tone: 'success' }); }}>Yes, correct</Button>
              <Button onClick={() => setFixOpen(true)}>Fix category</Button>
            </div>
          </Card>
        )}

        <Card>
          <h2 className="text-16 font-bold text-text">How we identified this</h2>
          <div className="mt-3 rounded-btn bg-background p-3">
            <p className="text-12 text-muted">Bank SMS said</p>
            <p className="break-all font-mono text-14 text-text">{t.rawDescriptor}</p>
            <ArrowDown size={16} className="my-1 text-muted" aria-hidden />
            <p className="text-12 text-muted">We matched it to</p>
            <p className="text-14 font-semibold text-text">{t.merchantDisplayName ?? '—'}</p>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge tone={src.tone}><src.icon size={12} aria-hidden /> {src.label}</Badge>
            <Badge tone={conf >= 70 ? 'success' : 'warning'}>Confidence {conf}%</Badge>
          </div>
        </Card>

        <Card className="flex items-center gap-3">
          <CategoryIcon category={t.category} />
          <div className="flex-1">
            <p className="text-12 text-muted">Category</p>
            <p className="text-14 font-semibold text-text">{CATEGORIES[t.category].label}</p>
          </div>
          <Button variant="secondary" onClick={() => setFixOpen(true)}>Fix category</Button>
        </Card>

        <Card>
          <h2 className="flex items-center gap-2 text-16 font-bold text-text"><Sparkles size={16} className="text-primary" aria-hidden /> Rewards</h2>
          <p className="mt-1 text-14 text-text">You earned <b>{inr(t.rewardEarned, 2)}</b>{card ? ` on ${card.issuer} ••${card.last4}` : ''}.</p>
          {(t.missedReward ?? 0) > 0 && best ? (
            <p className="mt-1 text-14 text-[#B42318]">{best.issuer} ••{best.last4} would have earned {inr(t.missedReward!, 2)} more.</p>
          ) : (
            <p className="mt-1 text-14 text-[#1E7A44]">Best card for this purchase.</p>
          )}
          <p className="mt-2 text-12 text-muted">Sample reward rates.</p>
        </Card>

        {!t.isShared && (
          <Button variant="secondary" className="w-full" onClick={() => setShareOpen(true)}>
            <Users size={16} aria-hidden /> Tag as shared
          </Button>
        )}
      </div>
      <FixCategorySheet txn={t} open={fixOpen} onClose={() => setFixOpen(false)} />
      <TagSharedSheet txn={t} open={shareOpen} onClose={() => setShareOpen(false)} />
    </>
  );
}
