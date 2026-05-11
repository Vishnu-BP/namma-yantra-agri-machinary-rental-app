/**
 * @file machines.ts — read-only query layer for the `machines` table.
 * @module src/integrations/supabase
 *
 * L2 surface only — fetch helpers for the discover feed, single detail,
 * and owner listings views. Owner CRUD (create/update/delete) ships in L4
 * and will be added here. Booking-aware queries (e.g., availability for a
 * date range) come in L3 and live in `bookings.ts`.
 *
 * Per CLAUDE.md folder rules: this is the only place outside the auth
 * helper that imports `@supabase/supabase-js` indirectly via `client.ts`.
 * Hooks/components consume via `import { machines } from '@/integrations/supabase'`.
 */
import { createLogger } from '@/lib/logger';
import type { Machine, MachineCategory } from '@/types/database';

import { supabase } from './client';

const log = createLogger('MACHINE');

// Why named: every L2 list query selects `*` (we use the full row everywhere).
// Hoisted so future refactors to a narrower projection touch one line.
const FULL_ROW = '*';

// Why named: discover feed cap. Can be lifted later (pagination is L7
// territory; at L2 we ship 8–20 demo machines and the unbounded list is fine).
const DEFAULT_FEED_LIMIT = 50;

export interface MachineFilters {
  category?: MachineCategory;
  limit?: number;
}

/**
 * Fetch active machines, optionally filtered by category. Sorted by
 * `created_at` desc (newest first); the discover screen re-sorts by
 * distance client-side using `distanceKm`.
 *
 * RLS lets authed users see all `status='active'` machines, plus their own
 * (any status). For the renter feed, only active rows match.
 */
export async function fetchMachines(
  filters: MachineFilters = {},
): Promise<Machine[]> {
  const limit = filters.limit ?? DEFAULT_FEED_LIMIT;

  let query = supabase
    .from('machines')
    .select(FULL_ROW)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (filters.category) {
    query = query.eq('category', filters.category);
  }

  const { data, error } = await query;
  if (error) {
    log.error('fetchMachines failed', error);
    throw error;
  }
  log.debug('fetchMachines resolved', {
    count: data?.length ?? 0,
    category: filters.category,
  });
  return data ?? [];
}

/**
 * Fetch a single machine by id. Returns `null` if the row doesn't exist or
 * is hidden by RLS (e.g., paused/archived machine viewed by a non-owner).
 */
export async function fetchMachineById(id: string): Promise<Machine | null> {
  const { data, error } = await supabase
    .from('machines')
    .select(FULL_ROW)
    .eq('id', id)
    .maybeSingle();
  if (error) {
    log.error('fetchMachineById failed', error);
    throw error;
  }
  return data;
}

/**
 * Fetch all machines belonging to an owner — any status. Used by the owner
 * Listings tab in L4. Available now so we can verify ownership semantics
 * end-to-end with the seed script.
 */
export async function fetchMachinesForOwner(
  ownerId: string,
): Promise<Machine[]> {
  const { data, error } = await supabase
    .from('machines')
    .select(FULL_ROW)
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });
  if (error) {
    log.error('fetchMachinesForOwner failed', error);
    throw error;
  }
  return data ?? [];
}
