/**
 * @file useMachines.ts — TanStack Query hooks for the machines table.
 * @module src/hooks
 *
 * Three read-only hooks per CLAUDE.md TanStack key conventions:
 *   ['machines']                            — full active feed
 *   ['machines', { category }]              — filtered feed
 *   ['machine', id]                         — single detail
 *   ['machines', 'owner', ownerId]          — owner's listings (any status)
 *
 * Stale times: feed = 60s, single = 30s. These match CLAUDE.md defaults so
 * a hard refresh isn't needed for moment-to-moment browsing while still
 * letting price/status edits propagate within a minute.
 */
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { machines as machinesApi } from '@/integrations/supabase';
import type { Machine, MachineCategory } from '@/types/database';

// Why named: matches CLAUDE.md "Stale times: feed = 60s, single = 30s,
// bookings = 0" rule. Naming kills the magic number per the same file.
const FEED_STALE_MS = 60_000;
const SINGLE_STALE_MS = 30_000;

interface UseMachinesArgs {
  category?: MachineCategory;
}

export function useMachines(
  args: UseMachinesArgs = {},
): UseQueryResult<Machine[]> {
  // Why: matches CLAUDE.md key conventions exactly — bare `['machines']` for
  // the unfiltered feed; `['machines', { category }]` when filtered. The
  // object form makes filter-aware invalidation cleaner later.
  const queryKey = args.category
    ? (['machines', { category: args.category }] as const)
    : (['machines'] as const);

  return useQuery({
    queryKey,
    queryFn: () => machinesApi.fetchMachines({ category: args.category }),
    staleTime: FEED_STALE_MS,
  });
}

export function useMachine(
  id: string | undefined,
): UseQueryResult<Machine | null> {
  return useQuery({
    queryKey: ['machine', id] as const,
    queryFn: () => {
      // Type-narrowed by `enabled` below — id is defined when the queryFn runs.
      if (!id) throw new Error('useMachine queryFn called without id');
      return machinesApi.fetchMachineById(id);
    },
    enabled: !!id,
    staleTime: SINGLE_STALE_MS,
  });
}

export function useOwnerMachines(
  ownerId: string | undefined,
): UseQueryResult<Machine[]> {
  return useQuery({
    queryKey: ['machines', 'owner', ownerId] as const,
    queryFn: () => {
      if (!ownerId) throw new Error('useOwnerMachines called without ownerId');
      return machinesApi.fetchMachinesForOwner(ownerId);
    },
    enabled: !!ownerId,
    staleTime: FEED_STALE_MS,
  });
}
