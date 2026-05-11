/**
 * @file distance.ts — great-circle distance via the Haversine formula.
 * @module src/lib
 *
 * Returns kilometres between two lat/lng pairs. Used by MachineCard to
 * display "X km away" relative to the renter's current location, and by
 * the discover feed for distance sorting (cheap O(n) sort over the page;
 * proper proximity ranking would use the geohash index, deferred to L5+).
 *
 * Pure function. No external deps.
 */

// Why named: the constant carries a unit. Inlining `6371` would be a
// magic number per CLAUDE.md.
export const EARTH_RADIUS_KM = 6371;

const DEG_TO_RAD = Math.PI / 180;

export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Great-circle distance between two points in kilometres.
 *
 * Accurate to within a few metres at city scale (Haversine assumes a
 * spherical Earth; the WGS-84 ellipsoid would correct this but the error
 * is negligible for "machines near you" UX).
 */
export function distanceKm(a: LatLng, b: LatLng): number {
  const dLat = (b.lat - a.lat) * DEG_TO_RAD;
  const dLng = (b.lng - a.lng) * DEG_TO_RAD;
  const lat1 = a.lat * DEG_TO_RAD;
  const lat2 = b.lat * DEG_TO_RAD;

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}
