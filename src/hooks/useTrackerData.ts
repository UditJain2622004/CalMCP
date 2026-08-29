import { useEffect, useCallback } from 'react';

/**
 * React hook that re-executes refreshFn automatically whenever
 * database data changes (via Dexie or WebMCP tools).
 */
export function useTrackerData(refreshFn: () => void | Promise<void>, deps: unknown[] = []) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const callback = useCallback(refreshFn, deps);

  useEffect(() => {
    const handleChanged = () => {
      callback();
    };

    window.addEventListener('tracker:data-changed', handleChanged);
    return () => {
      window.removeEventListener('tracker:data-changed', handleChanged);
    };
  }, [callback]);
}
