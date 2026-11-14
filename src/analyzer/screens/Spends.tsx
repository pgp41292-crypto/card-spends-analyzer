/* /spends — F1 live feed + F2 category breakdown. */
import { Fragment, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Cell, Pie, PieChart } from 'recharts';
import { CreditCard, Gauge, Receipt, SearchX, Smartphone, X } from 'lucide-react';
import AppHeader from '../components/AppHeader';
import TxnRow from '../components/TxnRow';
import { useFirstLoad } from '../components/useFirstLoad';
import { Badge, Button, Card, CardChip, EmptyState, Segmented, Skeleton, cx } from '../components/ui';
import { CATEGORIES } from '../lib/categories';
import { DEMO_MONTH, PREV_MONTH, TODAY } from '../lib/clock';
import { dayLabel, fmtMonth, fmtMonthLong } from '../lib/format';
import { inr, p } from '../lib/paths';
import { cardById, inMonth, spendByCategory, sumAmount } from '../lib/selectors';
import type { CategoryId, Transaction } from '../types';
import { useData } from '../store/data';
import { useUI } from '../store/ui';

const MONTHS = ['2026-09', PREV_MONTH, DEMO_MONTH];
const prevOf = (m: string) => MONTHS[MONTHS.indexOf(m) - 1] ?? '2026-08';

export default function Spends() {
  const d = useData();
  const nav = useNavigate();
  const { cardsLinked, sources } = useUI();
  const [cardId, setCardId] = useState<string>('');
  const [month, setMonth] = useState(DEMO_MONTH);
  const [cat, setCat] = useState<CategoryId | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const loading = useFirstLoad('spends');
  const isCurrent = month === DEMO_MONTH;

  const monthTxns = useMemo(() => inMonth(d.transactions, month, cardId || undefined), [d.transactions, month, cardId]);
  // Compare like with like: this month to date vs the same days of last month.
  const prevTxns = useMemo(
    () => inMonth(d.transactions, prevOf(month), cardId || undefined).filter((t) => !isCurrent || Number(t.timestamp.slice(8, 10)) <= TODAY),
    [d.transactions, month, cardId, isCurrent],
  );
  const total = sumAmount(monthTxns);
  const prevTotal = sumAmount(prevTxns);
  const byCat = spendByCategory(monthTxns);
  const prevByCat = spendByCategory(prevTxns);
  const slices = (Object.entries(byCat) as [CategoryId, number][]).sort((a, b) => b[1] - a[1]);
  const feed = cat ? monthTxns.filter((t) => t.category === cat) : monthTxns;

  const groups = useMemo(() => {
    const out: { day: string; items: Transaction[] }[] = [];
    for (const t of feed) {
      const day = t.timestamp.slice(0, 10);
      if (out[out.length - 1]?.day !== day) out.push({ day, items: [] });
      out[out.length - 1].items.push(t);
    }
    return out;
  }, [feed]);

  if (!cardsLinked) {
    return (
      <>
        <AppHeader title="Spends" />
        <EmptyState icon={CreditCard} title="Link a card to start tracking" action={<Button onClick={() => nav(p('/onboarding'))}>Link a card</Button>} />
      </>
    );
  }

  const pickCategory = (c: CategoryId) => {
    setCat(cat === c ? null : c);
    window.setTimeout(() => feedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  return (
    <>
      <AppHeader title="Spends" />
      <div className="pb-28">
        {/* Card filter chips */}
        <div className="flex gap-2 overflow-x-auto px-4 pt-3" role="group" aria-label="Filter by card">
          {[{ id: '', label: 'All cards' }, ...d.cards.map((c) => ({ id: c.id, label: '' }))].map((o) => {
            const c = cardById(d.cards, o.id);
            const on = cardId === o.id;
            return (
              <button
                key={o.id || 'all'}
                type="button"
                aria-pressed={on}
                onClick={() => setCardId(o.id)}
                className={cx('inline-flex min-h-[44px] shrink-0 items-center rounded-chip border px-3 text-14 font-semibold', on ? 'border-primary bg-primary text-white' : 'border-[#D5DEEA] bg-surface text-text')}
              >
                {c ? <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-chip" style={{ background: c.color }} />{c.issuer} ••{c.last4}</span> : o.label}
              </button>
            );
          })}
        </div>

        <div className="px-4">
          {/* Top summary */}
          <Card className="mt-3">
            <p className="text-12 text-muted">{isCurrent ? `Spent this month (${fmtMonth(month)} 1–${TODAY})` : `Spent in ${fmtMonthLong(month)}`}</p>
            {loading ? <Skeleton className="mt-1 h-8 w-40" /> : <p className="text-28 font-bold text-primary">{inr(total)}</p>}
            <div className="mt-1 flex flex-wrap items-center gap-2 text-14 text-muted">
              <span>{isCurrent ? 'Same day last month' : `${fmtMonthLong(prevOf(month))}`}: {inr(prevTotal)}</span>
              {prevTotal > 0 && (
                <Badge tone={total > prevTotal ? 'danger' : 'success'}>
                  {total > prevTotal ? '▲' : '▼'} {inr(Math.abs(total - prevTotal))}
                </Badge>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <Link to={p('/spends/limits')} className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-btn border border-[#C9D6EA] text-14 font-semibold text-primary"><Gauge size={16} aria-hidden /> Limits</Link>
              <Link to={p('/spends/charges')} className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-btn border border-[#C9D6EA] text-14 font-semibold text-primary"><Receipt size={16} aria-hidden /> Charges</Link>
            </div>
          </Card>

          {(/iPhone|iPad/.test(navigator.userAgent) || !sources.sms) && (
            <p className="mt-3 flex items-start gap-2 rounded-btn bg-[#EEF1F5] p-3 text-12 text-[#4A4A4A]">
              <Smartphone size={14} className="mt-0.5 shrink-0" aria-hidden />
              Live tracking needs SMS access on Android. On iPhone, spends update from statements.
            </p>
          )}

          {/* F2 breakdown */}
          <Card className="mt-3">
            <div className="flex items-center justify-between">
              <h2 className="text-16 font-bold text-text">By category</h2>
              {cardId && (() => { const c = cardById(d.cards, cardId)!; return <CardChip issuer={c.issuer} last4={c.last4} color={c.color} />; })()}
            </div>
            <div className="mt-3">
              <Segmented label="Month" value={month} onChange={(m) => { setMonth(m); setCat(null); }} options={MONTHS.map((m) => ({ value: m, label: fmtMonth(m) }))} />
            </div>
            {loading ? (
              <div className="mt-4 flex justify-center"><Skeleton className="h-[168px] w-[168px] rounded-chip" /></div>
            ) : slices.length === 0 ? (
              <EmptyState icon={SearchX} title={`No spends in ${fmtMonthLong(month)}`} body={month < '2026-10' ? 'Tracking started on 1 Oct when your cards were linked.' : 'Nothing on this card yet.'} />
            ) : (
              <>
                <div className="relative mx-auto mt-4 h-[168px] w-[168px]">
                  <PieChart width={168} height={168}>
                    <Pie data={slices.map(([c, v]) => ({ name: c, value: v }))} dataKey="value" innerRadius={56} outerRadius={80} paddingAngle={1.5} stroke="none" isAnimationActive={false}
                      onClick={(e: { name?: string }) => e.name && pickCategory(e.name as CategoryId)}>
                      {slices.map(([c]) => <Cell key={c} fill={CATEGORIES[c].color} opacity={!cat || cat === c ? 1 : 0.3} cursor="pointer" />)}
                    </Pie>
                  </PieChart>
                  <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                    <span>
                      <span className="block text-12 text-muted">{cat ? CATEGORIES[cat].short : 'Total'}</span>
                      <span className="block text-16 font-bold text-text">{inr(cat ? byCat[cat] ?? 0 : total)}</span>
                    </span>
                  </div>
                </div>
                <ul className="mt-3 divide-y divide-border">
                  {slices.map(([c, v]) => {
                    const prev = prevByCat[c] ?? 0;
                    const delta = v - prev;
                    const { icon: Icon, color, label } = CATEGORIES[c];
                    return (
                      <li key={c}>
                        <button type="button" onClick={() => pickCategory(c)} aria-pressed={cat === c}
                          className={cx('flex w-full items-center gap-3 py-2 text-left min-h-[48px]', cat === c && 'bg-[#F2F6FC] -mx-2 px-2 rounded-btn')}>
                          <span className="h-2.5 w-2.5 shrink-0 rounded-chip" style={{ background: color }} aria-hidden />
                          <Icon size={16} style={{ color }} aria-hidden />
                          <span className="flex-1 text-14 text-text">{label}</span>
                          <span className="text-right">
                            <span className="block text-14 font-semibold text-text">{inr(v)} <span className="font-normal text-muted">· {Math.round((v / total) * 100)}%</span></span>
                            <span className={cx('block text-12', prev === 0 ? 'text-muted' : delta > 0 ? 'text-[#B42318]' : 'text-[#1E7A44]')}>
                              {prev === 0 ? 'New this month' : `${delta > 0 ? '▲' : '▼'} ${inr(Math.abs(delta))} vs ${fmtMonth(prevOf(month))}`}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </Card>
        </div>

        {/* F1 live feed */}
        <div ref={feedRef} className="scroll-mt-20 px-4">
          <div className="mt-6 mb-2 flex min-h-[44px] items-center justify-between">
            <h2 className="text-16 font-bold text-text">Transactions <span className="font-normal text-muted">· {feed.length}</span></h2>
            {cat && (
              <button type="button" onClick={() => setCat(null)} className="inline-flex min-h-[44px] items-center gap-1 text-14 font-semibold text-primary">
                {CATEGORIES[cat].short} <X size={16} aria-label="Clear category filter" />
              </button>
            )}
          </div>
          <Card className="p-0">
            {loading ? (
              <div className="space-y-3 p-4" aria-busy="true">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14" />)}</div>
            ) : groups.length === 0 ? (
              <EmptyState icon={SearchX} title="No transactions" body="Try another month, card or category." />
            ) : (
              groups.map((g) => (
                <Fragment key={g.day}>
                  <div className="sticky top-16 z-10 flex justify-between bg-[#F2F5FA] px-4 py-1.5 first:rounded-t-card text-12 font-semibold text-muted">
                    <span>{dayLabel(g.day)}</span>
                    <span>{inr(sumAmount(g.items))}</span>
                  </div>
                  <ul className="divide-y divide-border">
                    {g.items.map((t) => <li key={t.id}><TxnRow t={t} card={cardById(d.cards, t.cardId)} /></li>)}
                  </ul>
                </Fragment>
              ))
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
