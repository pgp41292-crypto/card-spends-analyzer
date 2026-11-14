import type { ReactNode } from 'react';
import {
  ArrowLeft, BadgeCheck, BadgeIndianRupee, Camera, ChevronRight, Contrast, Copy, Download, PhoneCall, RefreshCcw,
  Search, Settings, Share, ShoppingBag, User, Users, Wallet,
} from 'lucide-react';
import { QrPlaceholder } from './art';

/* Dummy data only */
const PERSON = { name: 'Alex Placeholder', upi: '9000000000@bank', bank: 'Sample Bank - 1094' };

const IC = { size: 23, strokeWidth: 1.5, color: '#1A1A1A' } as const;
const rows: { icon: ReactNode; title: string; sub: string; badge?: boolean }[] = [
  { icon: <Wallet {...IC} />, title: 'Pocket Money', sub: 'Give your dependents UPI access with UPI Circle — fully under your control', badge: true },
  { icon: <Settings {...IC} />, title: 'UPI & Payment Settings', sub: 'UPI PIN, Bank Accounts & more' },
  { icon: <RefreshCcw {...IC} />, title: 'Automatic Payments', sub: 'Manage all your UPI Automatic Payments' },
  { icon: <ShoppingBag {...IC} />, title: 'Orders & Bookings', sub: 'Payments, Recharge, Travel & Others' },
  { icon: <User {...IC} />, title: 'Profile', sub: 'Privacy, Notification & Language' },
  { icon: <Users {...IC} />, title: 'Refer & Win', sub: 'Assured ₹450' },
  { icon: <PhoneCall {...IC} />, title: 'Help & Support', sub: 'Customer Support, Your Queries & FAQs' },
  { icon: <BadgeIndianRupee {...IC} />, title: 'MyUPI', sub: 'Help for Payments, Mandates & Services' },
  { icon: <Contrast {...IC} />, title: 'Appearance', sub: 'Experience Dark Mode (Beta) on select pages, stay tuned for more!' },
];

export default function Receive({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      <div className={`scrim ${open ? 'on' : ''}`} onClick={onClose} />
      <aside className={`drawer ${open ? 'on' : ''}`} aria-hidden={!open}>
        <div className="d-head">
          <button className="icon-btn" onClick={onClose} aria-label="Back"><ArrowLeft size={21} strokeWidth={1.8} /></button>
          <span className="wm wm-md"><b>Pay</b><i>tm</i></span>
        </div>

        <section className="profile">
          <div className="profile-main">
            <div className="ring">
              <div className="ring-inner"><User size={22} color="#9CC3EA" fill="#D6E7F8" strokeWidth={1} /></div>
              <span className="cam"><Camera size={9} strokeWidth={2.2} /></span>
            </div>
            <div className="profile-text">
              <b>{PERSON.name} <BadgeCheck size={12} fill="#3D8BF2" color="#fff" strokeWidth={2.4} /></b>
              <span>UPI ID: {PERSON.upi} <Copy size={11} color="#3D8BF2" strokeWidth={2} /></span>
            </div>
          </div>
          <div className="info-strip">
            <span className="info-dot">i</span>
            <span className="info-text">Receive money on Paytm from all UPI apps</span>
            <button className="btn-enable">Enable now</button>
          </div>
        </section>

        <div className="qr-frame">
          <div className="qr-inner"><QrPlaceholder size={238} /></div>
        </div>

        <div className="bank-row">
          <span className="bank-dot" />
          <span className="bank-name">{PERSON.bank}</span>
          <a className="link sm">Change Bank</a>
        </div>

        <div className="qr-actions">
          <button><Share size={17} strokeWidth={1.7} />Share QR</button>
          <button><Download size={17} strokeWidth={1.7} />Download</button>
        </div>

        <section className="settings">
          <div className="settings-head">
            <h2>Settings</h2>
            <Search size={17} strokeWidth={2.1} />
          </div>
          {rows.map((r) => (
            <div className="s-row" key={r.title}>
              <span className="s-icon">{r.icon}</span>
              <div className="s-body">
                <div className="s-text">
                  <b>{r.title}{r.badge && <span className="new">New</span>}</b>
                  <span>{r.sub}</span>
                </div>
                <ChevronRight size={17} strokeWidth={1.6} />
              </div>
            </div>
          ))}
        </section>

        <footer className="d-foot">
          <span className="wm wm-lg"><b>Pay</b><i>tm</i></span>
          <span className="crafted"><i className="flag" />Crafted &amp; Owned by India<i className="flag" /></span>
          <p>Terms &amp; Conditions, Privacy policy, Grievance, Redressal Mechanism, <a className="link">See all policies</a></p>
          <small>v10.83.10</small>
        </footer>
      </aside>
    </>
  );
}
