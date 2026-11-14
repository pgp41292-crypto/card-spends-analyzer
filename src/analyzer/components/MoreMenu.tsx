import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, House, MoreVertical, Settings, Sparkles, UserRound } from 'lucide-react';
import { useUI } from '../store/ui';
import { BottomSheet } from './overlays';
import { Badge } from './ui';

/** "More" menu in the Home header: Settings, persona switcher, Features 11–12 placeholders. */
export default function MoreMenu() {
  const [open, setOpen] = useState(false);
  const { comingSoon, setDemoOpen } = useUI();
  const nav = useNavigate();
  const rows = [
    { icon: Settings, label: 'Settings', run: () => comingSoon('Settings') },
    { icon: UserRound, label: 'Switch persona', run: () => setDemoOpen(true) },
    { icon: Sparkles, label: 'Feature 11', soon: true, run: () => comingSoon('Feature 11 is not specified yet.') },
    { icon: Sparkles, label: 'Feature 12', soon: true, run: () => comingSoon('Feature 12 is not specified yet.') },
    { icon: House, label: 'Back to Paytm home', run: () => nav('/') },
  ];
  return (
    <>
      <button type="button" aria-label="More" onClick={() => setOpen(true)} className="grid place-items-center h-11 w-11 rounded-btn text-primary">
        <MoreVertical size={22} />
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title="More">
        <ul className="divide-y divide-border">
          {rows.map(({ icon: Icon, label, soon, run }) => (
            <li key={label}>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  run();
                }}
                className="flex w-full items-center gap-3 min-h-[52px] text-left"
              >
                <Icon size={20} className="text-primary" aria-hidden />
                <span className="flex-1 text-14 font-semibold text-text">{label}</span>
                {soon && <Badge>Coming soon</Badge>}
                <ChevronRight size={18} className="text-muted" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      </BottomSheet>
    </>
  );
}
