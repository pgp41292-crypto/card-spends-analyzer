/* BottomSheet, ConsentSheet, ToastHost — all rendered into the phone frame's overlay layer. */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Bell, Eye, ShieldCheck, Undo2, X } from 'lucide-react';
import { useUI, type ToastMsg } from '../store/ui';
import { Button, cx } from './ui';

export const OVERLAY_ID = 'az-overlay';
/* Resolve the overlay node after mount: on a direct visit the frame's overlay div isn't in the DOM during first render. */
const Portal = ({ children }: { children: ReactNode }) => {
  const [el, setEl] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => setEl(document.getElementById(OVERLAY_ID)), []);
  return el ? createPortal(children, el) : null;
};

export function BottomSheet({
  open, onClose, title, children, footer,
}: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  const dialog = useRef<HTMLDivElement>(null);
  // Move focus into the sheet when it opens and give it back when it closes.
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const id = window.setTimeout(() => dialog.current?.focus(), 0);
    return () => { clearTimeout(id); prev?.focus?.(); };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <Portal>
      <div className="absolute inset-0 pointer-events-auto">
        <div className="absolute inset-0 bg-black/40 animate-[azfade_.2s_ease-out]" onClick={onClose} aria-hidden />
        <div
          ref={dialog}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="absolute inset-x-0 bottom-0 outline-none max-h-[88%] flex flex-col bg-surface rounded-t-card shadow-soft animate-[azup_.25s_cubic-bezier(.2,.8,.2,1)]"
        >
          <div className="mx-auto mt-2 h-1 w-10 rounded-chip bg-[#D5DEEA]" aria-hidden />
          <div className="flex items-center justify-between pl-4 pr-1">
            <h2 className="text-16 font-bold text-text">{title}</h2>
            <button type="button" aria-label="Close" onClick={onClose} className="grid place-items-center h-11 w-11 text-muted">
              <X size={20} />
            </button>
          </div>
          <div className="overflow-y-auto px-4 pb-4">{children}</div>
          {footer && <div className="border-t border-border p-4">{footer}</div>}
        </div>
      </div>
    </Portal>
  );
}

export interface ConsentSource { title: string; reads: string; why: string; revoke: string }

/** PRD ConsentSheet: what is read, why, how to revoke. */
export function ConsentSheet({
  open, onClose, onAllow, source,
}: { open: boolean; onClose: () => void; onAllow: () => void; source: ConsentSource }) {
  const rows = [
    { icon: Eye, h: 'What we read', t: source.reads },
    { icon: ShieldCheck, h: 'Why', t: source.why },
    { icon: Undo2, h: 'How to revoke', t: source.revoke },
  ];
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={source.title}
      footer={
        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={onClose}>Not now</Button>
          <Button onClick={onAllow}>Allow</Button>
        </div>
      }
    >
      <ul className="space-y-4 pt-1">
        {rows.map(({ icon: Icon, h, t }) => (
          <li key={h} className="flex gap-3">
            <span className="grid place-items-center h-9 w-9 shrink-0 rounded-chip bg-border text-primary"><Icon size={18} aria-hidden /></span>
            <div>
              <p className="text-14 font-semibold text-text">{h}</p>
              <p className="text-14 text-muted">{t}</p>
            </div>
          </li>
        ))}
      </ul>
    </BottomSheet>
  );
}

const TONE_BAR = { info: 'bg-accent', success: 'bg-success', warning: 'bg-warning', danger: 'bg-danger' };

/** PRD Toast — styled as an incoming push notification. */
export function ToastHost() {
  const toasts = useUI((s) => s.toasts);
  return (
    <div className="absolute inset-x-0 top-2 z-[60] flex flex-col items-center gap-2 px-3 pointer-events-none" aria-live="polite">
      {toasts.map((t) => <ToastItem key={t.id} t={t} />)}
    </div>
  );
}

function ToastItem({ t }: { t: ToastMsg }) {
  const dismiss = useUI((s) => s.dismiss);
  const nav = useNavigate();
  useEffect(() => {
    const id = window.setTimeout(() => dismiss(t.id), 4500);
    return () => clearTimeout(id);
  }, [t.id, dismiss]);
  return (
        <button
          type="button"
          onClick={() => {
            dismiss(t.id);
            if (t.to) nav(t.to);
          }}
          className="pointer-events-auto relative w-full overflow-hidden flex gap-3 items-start text-left rounded-card bg-surface/95 backdrop-blur shadow-[0_8px_24px_rgba(0,41,112,0.18)] border border-border p-3 animate-[azdrop_.3s_cubic-bezier(.2,.8,.2,1)]"
        >
          <span className={cx('absolute left-0 inset-y-0 w-1', TONE_BAR[t.tone ?? 'info'])} aria-hidden />
          <span className="grid place-items-center h-9 w-9 shrink-0 rounded-btn bg-primary text-white"><Bell size={16} aria-hidden /></span>
          <span className="min-w-0">
            <span className="block text-12 text-muted">paytm · now</span>
            <span className="block text-14 font-semibold text-text">{t.title}</span>
            {t.body && <span className="block text-14 text-muted">{t.body}</span>}
          </span>
        </button>
  );
}
