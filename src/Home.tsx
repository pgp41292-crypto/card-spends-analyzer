import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ArrowRight, Bell, Bike, Building2, BarChart3, CalendarDays, CandlestickChart, Car, ChevronRight, Coins,
  CreditCard, Gift, Landmark, LayoutGrid, Lightbulb, Plane, ScanFace, Search, Smartphone, Tag,
  TicketPercent, TrainFront, Bus, Zap, Wifi, Droplet, Flame, Tv,
} from 'lucide-react';
import {
  BalanceGlyph, BannerArt, CashbackBadge, GaugeArt, GoldArt, IpoGlyph, MetroMark, PayAnyoneGlyph,
  ScanGlyph, SpendsArt, TagCardGlyph,
} from './art';

const LINE = { color: '#16408C', fill: '#DDEBFF', strokeWidth: 1.6 } as const;

/* Horizontal scroller with a tracking pill indicator */
function HScroll({ children, className = '', indicator = false }: { children: ReactNode; className?: string; indicator?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [p, setP] = useState(0);
  const onScroll = () => {
    const el = ref.current!;
    const max = el.scrollWidth - el.clientWidth;
    setP(max > 0 ? el.scrollLeft / max : 0);
  };
  return (
    <>
      <div ref={ref} className={`hscroll ${className}`} onScroll={onScroll}>
        {children}
      </div>
      {indicator && (
        <div className="indicator">
          <span style={{ transform: `translateX(${p * 17}px)` }} />
        </div>
      )}
    </>
  );
}

function Header({ onAvatar }: { onAvatar: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 560);
    window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, []);
  return (
    <header className={`topbar ${scrolled ? 'is-scrolled' : ''}`}>
      <button className="avatar" onClick={onAvatar} aria-label="Open profile">AI</button>
      {scrolled ? (
        <div className="lockup">
          <span className="wm wm-sm"><b>Pay</b><i>tm</i></span>
          <span className="heart">♥</span>
          <span className="upi-text">UPI</span>
        </div>
      ) : (
        <div className="promo-pill">
          First Metro Ticket Free
          <span className="chev-dot"><ChevronRight size={9} strokeWidth={3.2} /></span>
        </div>
      )}
      <div className="topbar-actions">
        <Search size={17} strokeWidth={2.1} />
        <Bell size={19} strokeWidth={2} />
      </div>
    </header>
  );
}

const Card = ({ title, action, children, className = '' }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) => (
  <section className={`card ${className}`}>
    <div className="card-head">
      <h2>{title}</h2>
      {action}
    </div>
    {children}
  </section>
);

const Label = ({ text }: { text: string }) => {
  const [a, b] = text.split('\n');
  return (
    <span className="lbl">
      {a}
      {b && <br />}
      {b}
    </span>
  );
};

export default function Home({ onOpenReceive, onOpenAnalyzer }: { onOpenReceive: () => void; onOpenAnalyzer: () => void }) {
  const upi = [
    { icon: <ScanGlyph size={22} />, label: 'Scan any\nQR' },
    { icon: <PayAnyoneGlyph size={22} />, label: 'Pay\nAnyone' },
    { icon: <Landmark size={22} strokeWidth={1.8} />, label: 'To Bank &\nSelf A/c' },
    { icon: <BalanceGlyph size={22} />, label: 'Balance\n& History' },
  ];
  const bills = [
    { icon: <Smartphone size={22} {...LINE} />, badge: true, label: 'Mobile\nRecharge' },
    { icon: <TagCardGlyph size={26} />, label: 'FASTag\nRecharge' },
    { icon: <Lightbulb size={22} {...LINE} />, label: 'Electricity\nBill' },
    { icon: <CalendarDays size={22} {...LINE} />, label: 'Loan EMI\nPayment' },
    { icon: <CreditCard size={22} {...LINE} />, label: 'Credit\nCard Bill' },
    { icon: <Tv size={22} {...LINE} />, label: 'DTH\nRecharge' },
    { icon: <Wifi size={22} color="#16408C" strokeWidth={1.6} />, label: 'Broadband\nBill' },
    { icon: <Flame size={22} {...LINE} />, label: 'Gas\nCylinder' },
    { icon: <Droplet size={22} {...LINE} />, label: 'Water\nBill' },
  ];

  return (
    <div className="home">
      <Header onAvatar={onOpenReceive} />

      {/* 1 — Promo banner */}
      <section className="banner">
        <div className="banner-copy">
          <h1>Scan &amp; Pay<br />wherever you go</h1>
          <button className="btn-navy">Use Paytm for UPI</button>
        </div>
        <div className="banner-art"><BannerArt /></div>
        <span className="tnc">T&amp;C apply</span>
      </section>

      {/* 2 — UPI Money Transfer */}
      <Card title="UPI Money Transfer" className="card-upi">
        <div className="grid4">
          {upi.map((i) => (
            <div className="tile-item" key={i.label}>
              <span className="circle">{i.icon}</span>
              <Label text={i.label} />
            </div>
          ))}
        </div>
      </Card>

      {/* 3 — Recharge & Bills */}
      <Card title="Recharge & Bills" className="card-bills" action={<a className="link">View All <ArrowRight size={15} strokeWidth={1.8} /></a>}>
        <HScroll className="bills-row" indicator>
          {bills.map((b) => (
            <div className="bill-item" key={b.label}>
              <span className="bill-icon">
                {b.icon}
                {b.badge && <Zap className="bolt" size={9} fill="#16408C" color="#16408C" />}
              </span>
              <Label text={b.label} />
            </div>
          ))}
        </HScroll>
      </Card>

      {/* 4 — Face ID strip */}
      <section className="strip">
        <span className="strip-icon"><ScanFace size={16} color="#16408C" strokeWidth={1.7} /></span>
        <div className="strip-text">
          <b>Enable Face ID</b>
          <span>Secure your Payments</span>
        </div>
        <button className="btn-outline">Activate Now</button>
      </section>

      {/* 5 — Two-up tiles */}
      <section className="twoup">
        <div className="t-tall">
          <CalendarDays size={19} color="#9AA0A6" fill="#EEF0F2" strokeWidth={1.6} />
          <div>
            <b>Paytm Postpaid</b>
            <span>Start using with up to ₹1 Lakh limit</span>
          </div>
        </div>
        <div className="t-stack">
          <div className="t-small"><CashbackBadge w={23} color="#A6ABB1" /><span>Cashback &amp; Offers</span></div>
          <div className="t-small"><Zap size={21} color="#A6ABB1" strokeWidth={1.5} /><span>What&apos;s New</span></div>
        </div>
      </section>

      {/* 6 — Chips */}
      <HScroll className="chips">
        <span className="chip"><Gift size={14} color="#1B4FBF" strokeWidth={1.8} />Refer &amp; Win ₹450</span>
        <span className="chip"><CashbackBadge w={15} />Cashback &amp; Offers</span>
        <span className="chip"><CreditCard size={14} color="#1B4FBF" strokeWidth={1.8} />UPI Lite: Accept faster payments</span>
      </HScroll>

      {/* 7 — Travel & Tickets */}
      <Card title="Travel & Tickets" className="card-icons">
        <div className="grid4">
          {[
            { i: <Plane size={26} {...LINE} />, l: 'Flight' },
            { i: <Bus size={26} {...LINE} />, l: 'Bus' },
            { i: <TrainFront size={26} {...LINE} />, l: 'Train' },
            { i: <MetroMark />, l: 'Namma Metro' },
          ].map((t) => (
            <div className="line-item" key={t.l}>
              <span className="li-icon">{t.i}</span>
              <span className="lbl">{t.l}</span>
            </div>
          ))}
        </div>
        <div className="offer-row">
          <span className="offer"><Plane size={15} color="#16408C" strokeWidth={1.7} />₹1200 OFF* on Flights</span>
          <span className="offer"><Building2 size={15} color="#16408C" strokeWidth={1.7} />40% OFF* on Hotels</span>
        </div>
      </Card>

      {/* 8 — Grow Your Money (+ insurance chips) */}
      <Card title="Grow Your Money" className="card-icons">
        <div className="grid4">
          {[
            { i: <Coins size={26} {...LINE} />, l: 'Digital\nGold' },
            { i: <CandlestickChart size={26} {...LINE} />, l: 'Stocks\n& F&O' },
            { i: <BarChart3 size={26} {...LINE} />, l: 'Mutual\nFunds' },
            { i: <IpoGlyph size={28} />, l: 'Apply for\nIPO' },
          ].map((t) => (
            <div className="line-item" key={t.l}>
              <span className="li-icon">{t.i}</span>
              <Label text={t.l} />
            </div>
          ))}
        </div>
        <div className="offer-row">
          <span className="offer"><Car size={16} color="#16408C" strokeWidth={1.7} />Car Insurance</span>
          <span className="offer"><Bike size={16} color="#16408C" strokeWidth={1.7} />Bike Insurance</span>
        </div>
      </Card>

      {/* 9 — Free Tools */}
      <Card title="Free Tools" className="card-tools">
        <HScroll className="tools-row" indicator>
          <div className="tool tool-green"><b>Check Your Credit Score</b><div className="tool-art"><GaugeArt /></div></div>
          <div className="tool tool-yellow"><b>Set Gold Price Alerts</b><div className="tool-art"><GoldArt /></div></div>
          <div className="tool tool-pink" role="button" tabIndex={0} aria-label="Open Card Spends Analyzer" style={{ cursor: 'pointer' }}
            onClick={onOpenAnalyzer} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpenAnalyzer()}><b>Track Your Spends</b><div className="tool-art"><SpendsArt /></div></div>
          <div className="tool tool-mint"><b>Check Bank Balance</b><div className="tool-art"><Landmark size={56} color="#2E9E47" strokeWidth={1.3} /></div></div>
        </HScroll>
      </Card>

      {/* 10 — Do More */}
      <Card title="Do More with Paytm" className="card-icons card-domore">
        <div className="grid4">
          {[
            { i: <Tag size={23} {...LINE} />, l: 'Claim\nDeals' },
            { i: <TicketPercent size={23} {...LINE} />, l: 'Gift\nVouchers' },
            { i: <CashbackBadge w={25} />, l: 'Cashback\n& Offers' },
            { i: <LayoutGrid size={23} color="#16408C" strokeWidth={1.6} />, l: 'See All\nServices' },
          ].map((t) => (
            <div className="line-item" key={t.l}>
              <span className="li-icon sm">{t.i}</span>
              <Label text={t.l} />
            </div>
          ))}
        </div>
        <div className="offer-row">
          <span className="offer"><span className="dot" style={{ background: '#1E88F5' }} />App Store | 4% Off</span>
          <span className="offer"><span className="dot" style={{ background: '#E5484D' }} />Deals Near You | 50% OFF</span>
        </div>
      </Card>

      {/* 11 — Promoted (neutral placeholders) */}
      <Card title="Promoted" className="card-icons card-promoted">
        <div className="grid4">
          {[
            { c: '#97144D', t: 'AM', l: 'Axis Max Life' },
            { c: '#D3222A', t: 'HL', l: 'HDFC Life' },
            { c: '#DB0011', t: 'HS', l: 'HSBC Credit\nCard' },
            { c: '#E8B416', t: 'FM', l: 'Flipkart\nMinutes' },
          ].map((p) => (
            <div className="line-item" key={p.l}>
              <span className="logo-ph" style={{ background: p.c }}>{p.t}</span>
              <Label text={p.l} />
            </div>
          ))}
        </div>
      </Card>

      <div className="fab-spacer" />
      <button className="fab"><ScanGlyph size={21} strokeWidth={2} />Scan QR</button>
    </div>
  );
}
