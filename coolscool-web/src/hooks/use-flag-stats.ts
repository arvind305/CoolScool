'use client';

/**
 * useFlagStats — lightweight hook for open flag count badge.
 * Only fetches when enabled (admin users). Refreshes every 60s.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { api } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';

interface FlagStats {
  total: number;
  byStatus: Record<string, number>;
  byReason: Record<string, number>;
  resolutionRate: number;
}

export function useFlagStats(enabled: boolean) {
  const [openCount, setOpenCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStats = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await api.get<{ stats: FlagStats }>(ENDPOINTS.FLAGS_STATS);
      const open = res.stats.byStatus['open'] || 0;
      setOpenCount(open);
    } catch {
      // Silently ignore — badge is non-critical
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setOpenCount(0);
      return;
    }

    fetchStats();
    intervalRef.current = setInterval(fetchStats, 60_000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, fetchStats]);

  return { openCount, refresh: fetchStats };
}
