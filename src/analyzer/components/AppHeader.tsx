import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Badge } from './ui';

/** PRD AppHeader: title, back button, "Prototype · sample data" label. */
export default function AppHeader({
  title, back, right, tag,
}: { title: string; back?: boolean | string; right?: ReactNode; tag?: string }) {
  const nav = useNavigate();
  return (
    <header className="sticky top-0 z-20 bg-surface border-b border-border">
      <div className="flex items-center gap-1 h-16 px-2">
        {back ? (
          <button
            type="button"
            aria-label="Back"
            onClick={() => (typeof back === 'string' ? nav(back) : nav(-1))}
            className="grid place-items-center h-11 w-11 rounded-btn text-primary"
          >
            <ArrowLeft size={22} />
          </button>
        ) : (
          <span className="pl-2 pr-1 text-20 font-bold tracking-tight text-primary" aria-label="paytm">paytm</span>
        )}
        <div className="min-w-0 flex-1 pl-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-16 font-semibold text-primary">{title}</h1>
            {tag && <Badge tone="warning">{tag}</Badge>}
          </div>
          <p className="text-12 text-muted">Prototype · sample data</p>
        </div>
        {right}
      </div>
    </header>
  );
}
