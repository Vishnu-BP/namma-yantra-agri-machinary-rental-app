/**
 * @file useAvailability.ts — real-time availability subscription for a single machine.
 * @module src/hooks
 *
 * Subscribes to Postgres Changes on the machines table, filtered to a specific
 * machine ID. On mount it uses `initialValue` if provided (avoids an extra
 * round-trip when the caller already has the row), then updates live whenever
 * the owner accepts/cancels a booking or the 15-min reconciler runs.
 *
 * Cleanup removes the channel on unmount so there are no listener leaks when
 * navigating between the discover feed and detail screens.
 */
import { useEffect, useState } from 'react';

import { supabase } from '@/integrations/supabase';
import { createLogger } from '@/lib/logger';

const log = createLogger('RT');

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseAvailabilityResult {
  isAvailable: boolean;
  isLoading: boolean;
}

/**
 * Subscribe to live availability updates for a single machine.
 *
 * @param machineId - UUID of the machine to watch. Pass `undefined` to skip.
 * @param initialValue - Pre-fetched `is_currently_available` from the query cache.
 *   When provided, skips the initial fetch and goes straight to listening.
 */
export function useAvailability(
  machineId: string | undefined,
  initialValue?: boolean,
): UseAvailabilityResult {
  const [isAvailable, setIsAvailable] = useState<boolean>(initialValue ?? true);
  // Only show loading if we don't already have a value from the caller.
  const [isLoading, setIsLoading] = useState(initialValue === undefined);

  useEffect(() => {
    if (!machineId) return;

    // Skip the initial fetch when the parent component already has the value.
    if (initialValue === undefined) {
      supabase
        .from('machines')
        .select('is_currently_available')
        .eq('id', machineId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setIsAvailable(data.is_currently_available);
          }
          setIsLoading(false);
        });
    }

    const channelName = `machine-availability:${machineId}`;
    log.info('useAvailability: subscribing', { machineId });

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'machines',
          filter: `id=eq.${machineId}`,
        },
        (payload) => {
          const updated = payload.new as { is_currently_available: boolean };
          log.info('useAvailability: update received', {
            machineId,
            isAvailable: updated.is_currently_available,
          });
          setIsAvailable(updated.is_currently_available);
        },
      )
      .subscribe((status) => {
        log.debug('useAvailability: channel status', { machineId, status });
      });

    return () => {
      log.info('useAvailability: unsubscribing', { machineId });
      void supabase.removeChannel(channel);
    };
  }, [machineId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { isAvailable, isLoading };
}
