import { NavLink } from 'react-router-dom';
import { CreditCard, Gift, House, PieChart, Users } from 'lucide-react';
import { p } from '../lib/paths';

const TABS = [
  { to: '/', label: 'Home', icon: House },
  { to: '/spends', label: 'Spends', icon: PieChart },
  { to: '/rewards', label: 'Rewards', icon: Gift },
  { to: '/circle', label: 'Circle', icon: Users },
  { to: '/cards', label: 'Cards', icon: CreditCard },
];

export default function BottomNav() {
  return (
    <nav aria-label="Analyzer tabs" className="shrink-0 grid grid-cols-5 h-16 bg-surface border-t border-border pb-[env(safe-area-inset-bottom)]">
      {TABS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={p(to)}
          end={to === '/'}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 min-h-[44px] text-12 no-underline ${isActive ? 'text-primary font-bold' : 'text-muted font-semibold'}`
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={22} strokeWidth={isActive ? 2.4 : 1.8} aria-hidden />
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
