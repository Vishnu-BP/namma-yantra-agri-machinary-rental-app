/**
 * @file machines.ts — query + CRUD layer for the `machines` table.
 * @module src/integrations/supabase
 *
 * L2: read helpers (discover feed, single detail, owner listings).
 * L4: write helpers (create, update, update images, delete).
 *
 * Per CLAUDE.md folder rules: this is the only place outside the auth
 * helper that imports `@supabase/supabase-js` indirectly via `client.ts`.
 * Hooks/components consume via `import { machines } from '@/integrations/supabase'`.
 */
import { createLogger } from '@/lib/logger';
import { encodeGeohash } from '@/lib/geohash';
import type {
  Machine,
  MachineCategory,
  MachineCondition,
} from '@/types/database';

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

// ─── L4 — Owner CRUD ──────────────────────────────────────────────────────────

export interface CreateMachineInput {
  ownerId: string;
  ownerName: string;
  ownerPhone: string | null;
  ownerVillage: string;
  category: MachineCategory;
  brand: string;
  model: string;
  yearOfPurchase: number;
  horsepower?: number;
  title: string;
  descriptionEn: string;
  descriptionKn: string;
  features: string[];
  hourlyRatePaise: number;
  dailyRatePaise: number;
  minimumHours: number;
  locationLat: number;
  locationLng: number;
  village: string;
  district: string;
  condition: MachineCondition;
  lastServiceDate?: string;
}

/**
 * Insert a new machine row and return its generated UUID.
 * Geohash is computed from lat/lng so the discover feed's proximity sort works.
 * Images are uploaded separately and patched in via `updateMachineImages`.
 */
export async function createMachine(input: CreateMachineInput): Promise<string> {
  const geohash = encodeGeohash(input.locationLat, input.locationLng);
  log.info('createMachine: inserting', { category: input.category, ownerId: input.ownerId });
  const { data, error } = await supabase
    .from('machines')
    .insert({
      owner_id: input.ownerId,
      owner_name: input.ownerName,
      owner_phone: input.ownerPhone,
      owner_village: input.ownerVillage,
      category: input.category,
      brand: input.brand,
      model: input.model,
      year_of_purchase: input.yearOfPurchase,
      horsepower: input.horsepower ?? null,
      title: input.title,
      description_en: input.descriptionEn,
      description_kn: input.descriptionKn,
      features: input.features,
      hourly_rate_paise: input.hourlyRatePaise,
      daily_rate_paise: input.dailyRatePaise,
      minimum_hours: input.minimumHours,
      location_lat: input.locationLat,
      location_lng: input.locationLng,
      village: input.village,
      district: input.district,
      geohash,
      condition: input.condition,
      last_service_date: input.lastServiceDate ?? null,
      status: 'active',
      is_currently_available: true,
    })
    .select('id')
    .single();
  if (error) {
    log.error('createMachine: insert failed', error);
    throw error;
  }
  log.info('createMachine: done', { id: data.id });
  return data.id;
}

/**
 * Patch any subset of machine fields. If location_lat/lng are both present
 * in the patch, the geohash is recomputed so proximity queries stay correct.
 */
export async function updateMachine(
  id: string,
  patch: Partial<Machine>,
): Promise<void> {
  const update: Partial<Machine> & { geohash?: string } = { ...patch };
  if (patch.location_lat !== undefined && patch.location_lng !== undefined) {
    update.geohash = encodeGeohash(patch.location_lat, patch.location_lng);
  }
  log.info('updateMachine: patching', { id });
  const { error } = await supabase.from('machines').update(update).eq('id', id);
  if (error) {
    log.error('updateMachine: update failed', error);
    throw error;
  }
  log.info('updateMachine: done', { id });
}

/**
 * Set the image_urls array and primary_image_url after photos have been
 * uploaded to Storage. Called as the final step in the Add Machine flow.
 */
export async function updateMachineImages(
  id: string,
  imageUrls: string[],
  primaryImageUrl: string,
): Promise<void> {
  log.info('updateMachineImages: patching', { id, count: imageUrls.length });
  const { error } = await supabase
    .from('machines')
    .update({ image_urls: imageUrls, primary_image_url: primaryImageUrl })
    .eq('id', id);
  if (error) {
    log.error('updateMachineImages: update failed', error);
    throw error;
  }
  log.info('updateMachineImages: done', { id });
}

/**
 * Delete a machine row. RLS ensures only the owner can delete their own machine.
 * Call `deleteMachineImages` from Storage BEFORE this to avoid orphaned files.
 */
export async function deleteMachine(id: string): Promise<void> {
  log.info('deleteMachine: deleting', { id });
  const { error } = await supabase.from('machines').delete().eq('id', id);
  if (error) {
    log.error('deleteMachine: delete failed', error);
    throw error;
  }
  log.info('deleteMachine: done', { id });
}
