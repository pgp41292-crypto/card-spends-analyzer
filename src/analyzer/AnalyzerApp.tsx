import { lazy, Suspense, useEffect, useRef } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, type Location } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import BottomNav from './components/BottomNav';
import { DemoFab, DemoPanel } from './components/DemoPanel';
import { OVERLAY_ID, ToastHost } from './components/overlays';
import { p, prdPath, TAB_ROOTS } from './lib/paths';
import { useUI } from './store/ui';
import { Skeleton } from './components/ui';
import Onboarding from './screens/Onboarding';
import Home from './screens/Home';
import TxnDetail from './screens/TxnDetail';
import Limits from './screens/Limits';
import Rewards from './screens/Rewards';
import CardDetail from './screens/CardDetail';
import Charges from './screens/Charges';
import Tips from './screens/Tips';
import TipDetail from './screens/TipDetail';
import Cards from './screens/Cards';
import CheckoutSheet from './components/CheckoutSheet';
import Circle from './screens/Circle';
import CircleDetail from './screens/CircleDetail';
import Deals from './screens/Deals';
import './analyzer.css';

const BEST_CARD = p('/rewards/best-card');
/* Recharts is only needed on Spends, so it gets its own chunk. */
const Spends = lazy(() => import('./screens/Spends'));

function SpendsFallback() {
  return <div className="space-y-3 p-4" aria-busy="true">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28" />)}</div>;
}

function IndexGate() {
  const onboarded = useUI((s) => s.onboarded);
  return onboarded ? <Home /> : <Navigate to={p('/onboarding')} replace />;
}

export default function AnalyzerApp() {
  const location = useLocation();
  const nav = useNavigate();
  const scroller = useRef<HTMLElement>(null);
  const checkout = useUI((s) => s.checkout);
  const closeCheckout = useUI((s) => s.closeCheckout);

  // /rewards/best-card is a sheet: render the screen underneath from state.bg (or Rewards on a direct visit).
  const isSheet = location.pathname === BEST_CARD;
  const bg: Location | string = isSheet ? (location.state as { bg?: Location } | null)?.bg ?? p('/rewards') : location;
  const basePath = typeof bg === 'string' ? bg : bg.pathname;
  const route = prdPath(basePath);
  const isTabRoot = TAB_ROOTS.includes(route);
  const showBestCard = route === '/spends' || route === '/rewards';

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [basePath]);

  return (
    <div className="az min-h-[100dvh] w-full bg-[#E6E9EF] min-[430px]:grid min-[430px]:place-items-center min-[430px]:py-6">
      <div className="relative flex flex-col overflow-hidden bg-background w-full h-[100dvh] min-[430px]:w-[390px] min-[430px]:h-[844px] min-[430px]:rounded-[44px] min-[430px]:shadow-[0_0_0_10px_#111,0_30px_60px_rgba(0,0,0,.25)]">
        <main ref={scroller} className="flex-1 overflow-y-auto overscroll-contain">
          <div key={basePath} className="min-h-full animate-[azfade_.18s_ease-out]">
          <Routes location={bg}>
            <Route path="onboarding" element={<Onboarding />} />
            <Route index element={<IndexGate />} />
            <Route path="spends" element={<Suspense fallback={<SpendsFallback />}><Spends /></Suspense>} />
            <Route path="spends/txn/:id" element={<TxnDetail />} />
            <Route path="spends/limits" element={<Limits />} />
            <Route path="spends/charges" element={<Charges />} />
            <Route path="rewards" element={<Rewards />} />
            <Route path="rewards/card/:id" element={<CardDetail />} />
            <Route path="rewards/tips" element={<Tips />} />
            <Route path="rewards/tips/:id" element={<TipDetail />} />
            <Route path="circle" element={<Circle />} />
            <Route path="circle/:id" element={<CircleDetail />} />
            <Route path="cards" element={<Cards />} />
            <Route path="deals" element={<Deals />} />
            <Route path="*" element={<Navigate to={p('/')} replace />} />
          </Routes>
          </div>
        </main>

        {showBestCard && (
          <button
            type="button"
            onClick={() => nav(BEST_CARD, { state: { bg: location } })}
            className="absolute right-3 bottom-[76px] z-30 inline-flex items-center gap-1.5 h-11 px-4 rounded-chip bg-primary text-white text-14 font-semibold shadow-[0_6px_16px_rgba(0,41,112,0.3)]"
          >
            <Sparkles size={16} aria-hidden /> Best card
          </button>
        )}
        {route !== '/onboarding' && <DemoFab raised={isTabRoot} />}
        {isTabRoot && <BottomNav />}

        <ToastHost />
        <div id={OVERLAY_ID} className="absolute inset-0 z-50 pointer-events-none" />
        <DemoPanel />
        {isSheet && (
          <CheckoutSheet
            mode="manual"
            onClose={() => ((location.state as { bg?: Location } | null)?.bg ? nav(-1) : nav(p('/rewards')))}
          />
        )}
        {checkout && <CheckoutSheet key={JSON.stringify(checkout)} mode="checkout" initial={checkout} onClose={closeCheckout} />}
      </div>
    </div>
  );
}
