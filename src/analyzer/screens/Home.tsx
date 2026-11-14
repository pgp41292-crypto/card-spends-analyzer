/* Home dashboard: month spend (F1), limits at risk (F4), expiring rewards (F8), charges (F3 tile), nearby deals strip (F10). */
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronRight, CreditCard, Gauge, Gift, MapPin, Receipt, Smartphone, Wallet } from 'lucide-react';
import AppHeader from '../components/AppHeader';
import MoreMenu from '../components/MoreMenu';
import TxnRow from '../components/TxnRow';
import { useFirstLoad } from '../components/useFirstLoad';
import { Badge, Button, Card, EmptyState, SectionTitle, Skeleton, StatTile, cx } from '../components/ui';
import { alertKey } from '../lib/alerts';
import { CATEGORIES } from '../lib/categories';
import { DAYS_LEFT, QUARTER_START } from '../lib/clock';
import { daysUntil, fmtDate } from '../lib/format';
import { inr, p } from '../lib/paths';
import { cardById, expiryValueInr, limitsAtRisk, monthSummary } from '../lib/selectors';
import { useData, usePersona, useStore } from '../store/data';
import { useUI } from '../store/ui';

export default function Home() {
  const d = useData();
  const persona = usePersona();
  const fired = useStore((s) => s.firedAlerts);
  const { cardsLinked, sources } = useUI();
  const nav = useNavigate();
  const loading = useFirstLoad('home');

  if (!cardsLinked) {
    return (
      <>
        <AppHeader title={`Hi ${persona.name}`} right={<MoreMenu />} />
        <EmptyState icon={CreditCard} title="Link a card to start tracking" body="Confirm the cards we found in your SMS, or add one manually."
          action={<Button onClick={() => nav(p('/onboarding'))}>Link a card</Button>} />
      </>
    );
  }

  const s = monthSummary(d.transactions);
  const risk = limitsAtRisk(d);
  const top = risk[0];
  // Banner for the highest limit alert that has fired this month and still applies.
  const banner = risk.find((r) => fired.includes(alertKey(persona.id, r.category, r.level)));
  const expiring = d.benefits.expiries
    .filter((e) => daysUntil(e.expiresOn) >= 0 && daysUntil(e.expiresOn) <= 30)
    .sort((a, b) => a.expiresOn.localeCompare(b.expiresOn));
  const expiringValue = expiring.reduce((sum, e) => sum + expiryValueInr(e, d.cards), 0);
  const charges = d.charges.filter((c) => `${c.statementMonth}-01` >= QUARTER_START).reduce((sum, c) => sum + c.amount, 0);
  const hasCobrand = d.cards.some((c) => c.isPaytmCobrand);
  const isIOS = /iPhone|iPad/.test(navigator.userAgent);

  return (
    <>
      <AppHeader title={`Hi ${persona.name}`} right={<MoreMenu />} />
      <div className="px-4 pb-28 pt-4">
        {banner && (
          <Link
            to={`${p('/spends/limits')}?cat=${banner.category}`}
            className={cx('mb-4 flex items-start gap-3 rounded-card border p-3', banner.level === 100 ? 'border-[#F5C2C2] bg-[#FDE8E8]' : 'border-[#F6D3B3] bg-[#FDEEDF]')}
          >
            <AlertTriangle size={20} className={banner.level === 100 ? 'text-[#B42318]' : 'text-[#9A4A08]'} aria-hidden />
            <span className="flex-1 text-14 text-text">
              <b className="font-semibold">
                {banner.level === 100
                  ? `You've gone over your ${CATEGORIES[banner.category].short} limit`
                  : `You've used ${Math.round(banner.pct)}% of your ${CATEGORIES[banner.category].short} limit with ${DAYS_LEFT} days left`}
              </b>
              <span className="block text-muted">{inr(banner.spent)} of {inr(banner.monthlyLimit)} · {inr(banner.dailyAllowance)}/day keeps you on track</span>
            </span>
            <ChevronRight size={18} className="mt-0.5 text-muted" aria-hidden />
          </Link>
        )}

        {loading ? (
          <div className="grid grid-cols-2 gap-3" aria-busy="true">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[104px]" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <StatTile
              icon={Wallet}
              label="Spent this month"
              value={inr(s.thisMonth)}
              sub={`${s.diff >= 0 ? '▲' : '▼'} ${inr(Math.abs(s.diff))} vs same day last month`}
              onClick={() => nav(p('/spends'))}
            />
            <StatTile
              icon={Gauge}
              label="Limits at risk"
              value={risk.length}
              tone={!top ? 'success' : top.pct >= 100 ? 'danger' : 'warning'}
              sub={top ? `${CATEGORIES[top.category].short} at ${Math.round(top.pct)}%` : 'All under 80%'}
              onClick={() => nav(top ? `${p('/spends/limits')}?cat=${top.category}` : p('/spends/limits'))}
            />
            <StatTile
              icon={Gift}
              label="Expiring in 30 days"
              value={inr(expiringValue)}
              tone={expiring.length ? 'warning' : 'default'}
              sub={expiring[0] ? `${expiring.length} item${expiring.length > 1 ? 's' : ''} · first on ${fmtDate(expiring[0].expiresOn)}` : 'Nothing expiring'}
              onClick={() => nav(expiring[0] ? `${p(`/rewards/card/${expiring[0].cardId}`)}?tab=rewards` : p('/rewards'))}
            />
            <StatTile
              icon={Receipt}
              label="Charges this quarter"
              value={inr(charges)}
              tone={charges ? 'danger' : 'success'}
              sub={charges ? 'Interest, fees and markups' : 'No charges found'}
              onClick={() => nav(p('/spends/charges'))}
            />
          </div>
        )}

        {(isIOS || !sources.sms) && (
          <p className="mt-3 flex items-start gap-2 rounded-btn bg-[#EEF1F5] p-3 text-12 text-[#4A4A4A]">
            <Smartphone size={14} className="mt-0.5 shrink-0" aria-hidden />
            Live tracking needs SMS access on Android. On iPhone, spends update from statements.
          </p>
        )}

        <SectionTitle action={<Link to={p('/spends')} className="text-14 font-semibold text-primary min-h-[44px] inline-flex items-center">See all</Link>}>
          Recent spends
        </SectionTitle>
        <Card className="overflow-hidden p-0">
          {loading ? (
            <div className="space-y-3 p-4" aria-busy="true">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : d.transactions.length === 0 ? (
            <EmptyState icon={Wallet} title="No spends yet" body="New card spends show up here within seconds." />
          ) : (
            <ul className="divide-y divide-border">
              {d.transactions.slice(0, 3).map((t) => <li key={t.id}><TxnRow t={t} card={cardById(d.cards, t.cardId)} /></li>)}
            </ul>
          )}
        </Card>

        <SectionTitle action={<Badge tone="warning">Later phase</Badge>}>Deals near you</SectionTitle>
        {d.offers.deals.length === 0 ? (
          <Card><p className="text-14 text-muted">No deals nearby right now.</p></Card>
        ) : (
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
            {d.offers.deals.map((deal) => (
              <Link
                key={deal.id}
                to={p('/deals')}
                className={cx('w-40 shrink-0 rounded-card border border-border bg-surface p-3 shadow-soft', !hasCobrand && 'opacity-60 grayscale')}
              >
                <span className="text-20 font-bold text-[#1E7A44]">{deal.discountPct}% off</span>
                <span className="mt-1 block truncate text-14 font-semibold text-text">{deal.item}</span>
                <span className="block truncate text-12 text-muted">{deal.merchant}</span>
                <span className="mt-1 flex items-center gap-1 text-12 text-muted"><MapPin size={12} aria-hidden /> {deal.distanceKm} km</span>
              </Link>
            ))}
          </div>
        )}
        {!hasCobrand && (
          <p className="mt-2 text-12 text-muted">Get the Paytm card to unlock deals like this.</p>
        )}
      </div>
    </>
  );
}
