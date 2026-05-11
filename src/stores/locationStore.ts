/**
 * @file locationStore.ts — renter's current coordinates.
 * @module src/stores
 *
 * Cross-cutting state per CLAUDE.md (used by discover feed for distance
 * sort + MachineCard for distance display + later L3 booking address
 * defaults). Not persisted: re-derived on every cold launch via
 * `useLocation`. Falls back to Mandya town centre when geo permission is
 * denied or unavailable (web sometimes silently fails).
 */
import { create } from 'zustand';

import type { LatLng } from '@/lib/distance';

// Why named: Mandya is the project's reference farming district. Every
// "fallback to a sane default" code path lands here so reviewers don't have
// to grep through hardcoded coords.
export const MANDYA_LAT = 12.5218;
export const MANDYA_LNG = 76.8951;
export const MANDYA_FALLBACK: LatLng = { lat: MANDYA_LAT, lng: MANDYA_LNG };

export type LocationPermissionStatus = 'unknown' | 'granted' | 'denied';

interface LocationState {
  coords: LatLng | null;
  permissionStatus: LocationPermissionStatus;
  setCoords: (coords: LatLng) => void;
  setPermission: (status: LocationPermissionStatus) => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  coords: null,
  permissionStatus: 'unknown',
  setCoords: (coords) => set({ coords }),
  setPermission: (permissionStatus) => set({ permissionStatus }),
}));
