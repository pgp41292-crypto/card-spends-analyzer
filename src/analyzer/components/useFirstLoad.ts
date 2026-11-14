import { useEffect, useState } from 'react';

const seen = new Set<string>();
/** Shows a loading skeleton the first time a screen opens in a session (simulated fetch). */
export function useFirstLoad(key: string, ms = 650) {
  const [loading, setLoading] = useState(!seen.has(key));
  useEffect(() => {
    if (!loading) return;
    const id = window.setTimeout(() => { seen.add(key); setLoading(false); }, ms);
    return () => clearTimeout(id);
  }, [key, loading, ms]);
  return loading;
}

