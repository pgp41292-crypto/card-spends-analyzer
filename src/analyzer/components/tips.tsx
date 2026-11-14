import { Building2, CirclePlay, MessagesSquare, Users, type LucideIcon } from 'lucide-react';
import type { Tip } from '../types';
import { daysUntil } from '../lib/format';
import { Badge } from './ui';

export const SOURCE_ICON: Record<Tip['sources'][number]['type'], { icon: LucideIcon; label: string }> = {
  reddit: { icon: MessagesSquare, label: 'Reddit' },
  youtube: { icon: CirclePlay, label: 'YouTube' },
  issuer: { icon: Building2, label: 'Issuer' },
  forum: { icon: Users, label: 'Forum' },
};

export function VerifiedBadge({ tip }: { tip: Tip }) {
  if (tip.status === 'needs_review') return <Badge>Under review</Badge>;
  const ago = -daysUntil(tip.lastVerified);
  return <Badge tone="success">Verified {ago <= 0 ? 'today' : `${ago} day${ago === 1 ? '' : 's'} ago`}</Badge>;
}
