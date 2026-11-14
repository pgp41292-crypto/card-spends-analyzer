import { lazy, StrictMode, Suspense, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes, useNavigate } from 'react-router-dom';
import Home from './Home';
import Receive from './Receive';
import { p } from './analyzer/lib/paths';

/* The analyzer (and Recharts) load only when someone opens it; the Paytm home stays light. */
const AnalyzerApp = lazy(() => import('./analyzer/AnalyzerApp'));
/** Onboarding flag read straight from localStorage so the home page doesn't pull in the analyzer's store. */
const isOnboarded = () => {
  try { return JSON.parse(localStorage.getItem('csa-ui') ?? '{}')?.state?.onboarded === true; } catch { return false; }
};
import './styles.css';

/* Existing Paytm home mockup (unchanged). #/receive opens the QR drawer. */
function PaytmHome() {
  const nav = useNavigate();
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const f = () => setHash(location.hash);
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  const open = hash === '#/receive';
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
  }, [open]);
  return (
    <div className="artboard">
      <Home
        onOpenReceive={() => (location.hash = '/receive')}
        onOpenAnalyzer={() => nav(isOnboarded() ? p('/') : p('/onboarding'))}
      />
      <Receive open={open} onClose={() => (location.hash = '')} />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<PaytmHome />} />
        <Route path="/analyzer/*" element={<Suspense fallback={<div style={{ minHeight: '100vh', background: '#E6E9EF' }} />}><AnalyzerApp /></Suspense>} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
