/* /deals — F10 dynamic discounting on Paytm co-branded cards (later phase). */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Lock, MapPin, Store } from 'lucide-react';
import AppHeader from '../components/AppHeader';
import { useFirstLoad } from '../components/useFirstLoad';
import { Badge, Button, Card, EmptyState, Skeleton, cx } from '../components/ui';
import { liveNowMs } from '../lib/clock';
import { fmtTime } from '../lib/format';
import { p } from '../lib/paths';
import { useData } from '../store/data';
import { useUI } from '../store/ui';

/** Ticks every second on the demo clock. */
export function useLiveNow() {
  const [now, setNow] = useState(liveNowMs());
  useEffect(() => {
    const id = window.setInterval(() => setNow(liveNowMs()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function countdown(untilIso: string, now: number) {
  const ms = Date.parse(untilIso) - now;
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3_600_000), m = Math.floor((ms % 3_600_000) / 60_000), s = Math.floor((ms % 60_000) / 1000);
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s` : `${m}m ${String(s).padStart(2, '0')}s`;
}

export default function Deals() {
  const d = useData();
  const openCheckout = useUI((s) => s.openCheckout);
  const loading = useFirstLoad('deals');
  const now = useLiveNow();
  const cobrand = d.cards.find((c) => c.isPaytmCobrand);

  return (
    <>
      <AppHeader title="Deals near you" back tag="Later phase" />
      <div className="px-4 pb-24 pt-4">
        <p className="text-14 text-muted">Nearby Paytm shops drop prices on fresh items before closing, for Paytm co-branded card holders.</p>
        {!cobrand && (
          <Link to={p('/cards')} className="mt-3 flex items-start gap-3 rounded-card border border-[#C9D6EA] bg-[#F2F6FC] p-3">
            <Lock size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden />
            <span className="text-14 text-text"><b className="font-semibold">Get the Paytm card to unlock deals like this.</b> <span className="text-primary underline">See if it suits your spending</span></span>
          </Link>
        )}
        <div className="mt-3 space-y-3">
          {loading ? (
            [0, 1, 2].map((i) => <Skeleton key={i} className="h-32" />)
          ) : d.offers.deals.length === 0 ? (
            <Card className="p-0"><EmptyState icon={Store} title="No deals nearby right now" body="We'll show perishable deals from nearby Paytm shops here." /></Card>
          ) : (
            d.offers.deals.map((deal) => {
              const left = countdown(deal.validUntil, now);
              const locked = !cobrand;
              return (
                <Card key={deal.id} className={cx(locked && 'opacity-70')}>
                  <div className={cx('flex items-start justify-between gap-3', locked && 'grayscale')}>
                    <div className="min-w-0">
                      <p className="text-16 font-semibold text-text">{deal.item}</p>
                      <p className="text-14 text-muted">{deal.merchant}</p>
                      <p className="mt-1 flex items-center gap-3 text-12 text-muted">
                        <span className="inline-flex items-center gap-1"><MapPin size={12} aria-hidden /> {deal.distanceKm} km</span>
                        <span className="inline-flex items-center gap-1"><Clock size={12} aria-hidden /> until {fmtTime(deal.validUntil)}</span>
                      </p>
                    </div>
                    <span className="shrink-0 text-28 font-bold text-[#1E7A44]">{deal.discountPct}%<span className="block text-12 font-semibold">off</span></span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Badge tone="accent">Paytm card only</Badge>
                    {left ? <Badge tone="warning">Ends in {left}</Badge> : <Badge>Ended</Badge>}
                  </div>
                  {locked ? (
                    <p className="mt-2 text-12 text-muted">Get the Paytm card to unlock deals like this.</p>
                  ) : (
                    <Button className="mt-3 w-full" disabled={!left}
                      onClick={() => openCheckout({
                        merchant: deal.merchant, rawDescriptor: `PYTM*${deal.merchant.toUpperCase().slice(0, 20)}`, category: 'groceries', amount: 400,
                        preselectCardId: cobrand.id, discountPct: deal.discountPct, dealLabel: `${deal.discountPct}% Paytm card deal`,
                      })}>
                      Pay at store
                    </Button>
                  )}
                </Card>
              );
            })
          )}
        </div>
        <p className="mt-3 text-12 text-muted">Deals are sample data. Times follow the demo clock.</p>
      </div>
    </>
  );
}
