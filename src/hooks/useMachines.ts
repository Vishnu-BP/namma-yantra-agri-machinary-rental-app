/**
 * @file useMachines.ts — TanStack Query hooks for the machines table.
 * @module src/hooks
 *
 * Read hooks (L2):
 *   ['machines']                            — full active feed
 *   ['machines', { category }]              — filtered feed
 *   ['machine', id]                         — single detail
 *   ['machines', 'owner', ownerId]          — owner's listings (any status)
 *
 * Mutation hooks (L4):
 *   useCreateMachine  — insert row + upload photos + patch image URLs
 *   useUpdateMachine  — patch machine fields
 *   useDeleteMachine  — delete Storage files then DB row
 *
 * Stale times: feed = 60s, single = 30s.
 */
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';

import { machines as machinesApi, storage as storageApi } from '@/integrations/supabase';
import type { CreateMachineInput } from '@/integrations/supabase/machines';
import type { Machine, MachineCategory } from '@/types/database';

// ─── Constants ────────────────────────────────────────────────────────────────

// Why named: matches CLAUDE.md "Stale times: feed = 60s, single = 30s" rule.
const FEED_STALE_MS = 60_000;
const SINGLE_STALE_MS = 30_000;

// ─── Read hooks ───────────────────────────────────────────────────────────────

interface UseMachinesArgs {
  category?: MachineCategory;
}

export function useMachines(
  args: UseMachinesArgs = {},
): UseQueryResult<Machine[]> {
  // Why: matches CLAUDE.md key conventions — bare `['machines']` for the
  // unfiltered feed; `['machines', { category }]` when filtered.
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

// ─── Mutation hooks ───────────────────────────────────────────────────────────

interface CreateMachineParams {
  input: CreateMachineInput;
  imageLocalUris: string[];
  primaryIndex: number;
}

/**
 * Insert a machine, upload all photos, then patch image URLs.
 * Three-step sequence: createMachine → uploadMachineImage × N → updateMachineImages.
 * Invalidates both the discover feed and the owner's listings on success.
 */
export function useCreateMachine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ input, imageLocalUris, primaryIndex }: CreateMachineParams) => {
      const machineId = await machinesApi.createMachine(input);
      const urls = await Promise.all(
        imageLocalUris.map((uri, i) => storageApi.uploadMachineImage(machineId, uri, i)),
      );
      await machinesApi.updateMachineImages(machineId, urls, urls[primaryIndex] ?? urls[0]);
      return machineId;
    },
    onSuccess: (_machineId, { input }) => {
      void queryClient.invalidateQueries({ queryKey: ['machines'] });
      void queryClient.invalidateQueries({ queryKey: ['machines', 'owner', input.ownerId] });
    },
  });
}

interface UpdateMachineParams {
  id: string;
  ownerId: string;
  patch: Partial<Machine>;
}

/** Patch machine fields; invalidates the single-machine cache and owner listing. */
export function useUpdateMachine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: UpdateMachineParams) => machinesApi.updateMachine(id, patch),
    onSuccess: (_data, { id, ownerId }) => {
      void queryClient.invalidateQueries({ queryKey: ['machine', id] });
      void queryClient.invalidateQueries({ queryKey: ['machines', 'owner', ownerId] });
      void queryClient.invalidateQueries({ queryKey: ['machines'] });
    },
  });
}

interface DeleteMachineParams {
  id: string;
  ownerId: string;
}

/**
 * Delete Storage images then the DB row.
 * Order matters: if the DB delete fires first and succeeds, orphaned images
 * can't be cleaned up because the RLS folder check would fail.
 */
export function useDeleteMachine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: DeleteMachineParams) => {
      await storageApi.deleteMachineImages(id);
      await machinesApi.deleteMachine(id);
    },
    onSuccess: (_data, { ownerId }) => {
      void queryClient.invalidateQueries({ queryKey: ['machines'] });
      void queryClient.invalidateQueries({ queryKey: ['machines', 'owner', ownerId] });
    },
  });
}
