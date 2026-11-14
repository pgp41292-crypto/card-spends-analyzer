import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import type { Card, Transaction } from '../types';
import { p, inr } from '../lib/paths';
import { fmtTime } from '../lib/format';
import { useStore } from '../store/data';
import { Badge, CardChip, CategoryIcon, cx } from './ui';

export const SOURCE_LABEL = { sms: 'SMS', paytm: 'Paytm', statement: 'Statement' } as const;

/** F1 feed row: display name, raw descriptor (muted 12px), amount, CardChip, category icon, source badge. */
export default function TxnRow({ t, card }: { t: Transaction; card?: Card }) {
  const highlight = useStore((s) => s.highlightId === t.id);
  return (
    <Link
      to={p(`/spends/txn/${t.id}`)}
      className={cx('flex gap-3 px-4 py-3 min-h-[64px] transition-colors duration-700', highlight ? 'bg-border' : 'bg-transparent')}
    >
      <CategoryIcon category={t.category} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <span className="truncate text-14 font-semibold text-text">{t.merchantDisplayName ?? t.rawDescriptor}</span>
          <span className="shrink-0 text-14 font-bold text-text">{inr(t.amount)}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-mono text-12 text-muted">{t.rawDescriptor}</span>
          <span className="shrink-0 text-12 text-muted">{fmtTime(t.timestamp)}</span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {card && <CardChip issuer={card.issuer} last4={card.last4} color={card.color} />}
          <Badge tone={t.source === 'paytm' ? 'accent' : 'neutral'}>{SOURCE_LABEL[t.source]}</Badge>
          {t.confidence < 0.7 && t.merchantSource !== 'user_corrected' && <Badge tone="warning">Confirm?</Badge>}
          {t.isShared && <Badge tone="primary"><Users size={12} aria-hidden /> Shared</Badge>}
        </div>
      </div>
    </Link>
  );
}
