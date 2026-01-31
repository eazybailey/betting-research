'use client';

import { useQuery } from '@tanstack/react-query';
import { OddsSnapshot } from '@/lib/types';

/**
 * Hook to fetch historical snapshots for a specific event.
 */
export function useSnapshots(eventId: string | null, runnerName?: string) {
  return useQuery({
    queryKey: ['snapshots', eventId, runnerName],
    queryFn: async (): Promise<OddsSnapshot[]> => {
      if (!eventId) return [];

      const params = new URLSearchParams({ eventId });
      if (runnerName) params.set('runnerName', runnerName);

      const res = await fetch(`/api/history?${params}`);
      if (!res.ok) return [];

      const json = await res.json();
      return json.data || [];
    },
    enabled: Boolean(eventId),
    staleTime: 30_000,
  });
}
