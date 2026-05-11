/**
 * @file geohash.ts — minimal precision-6 geohash encoder.
 * @module src/lib
 *
 * No external deps. Standard base32 alphabet (Niemeyer 2008). Used by the
 * machines table's `geohash` column for proximity prefix search.
 *
 * Precision-6 cells are roughly 1.2 km × 0.6 km — appropriate for the
 * "nearby machines in your district" UX. If we ever need finer cells (e.g.,
 * for booking conflict detection at a parcel level), bump precision per call.
 *
 * Determinism note: this exact implementation runs both client-side
 * (MachineCard distance display) and in `scripts/seed.ts` (DB-stored
 * `geohash` column). Do not branch on environment — outputs must match.
 */

// Why named: matches the `idx_machines_geohash` index granularity and the
// 1.2 km cell expectation. Bumping this here without bumping seed-script
// expectations would silently break proximity queries.
export const GEOHASH_PRECISION = 6;

// Standard geohash base32 alphabet — order matters; do not sort.
const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
const BITS_PER_CHAR = 5;

/**
 * Encode a (lat, lng) pair into a geohash string of the requested precision.
 * Throws if lat/lng are outside their valid ranges.
 */
export function encodeGeohash(
  lat: number,
  lng: number,
  precision: number = GEOHASH_PRECISION,
): string {
  if (lat < -90 || lat > 90) {
    throw new Error(`encodeGeohash: lat ${lat} out of range [-90, 90]`);
  }
  if (lng < -180 || lng > 180) {
    throw new Error(`encodeGeohash: lng ${lng} out of range [-180, 180]`);
  }

  let minLat = -90;
  let maxLat = 90;
  let minLng = -180;
  let maxLng = 180;

  let bits = 0;
  let bitCount = 0;
  let hash = '';
  // Geohash interleaves longitude/latitude bits — even-indexed bits are
  // longitude, odd are latitude. Start with longitude.
  let evenBit = true;

  while (hash.length < precision) {
    if (evenBit) {
      const mid = (minLng + maxLng) / 2;
      if (lng >= mid) {
        bits = (bits << 1) | 1;
        minLng = mid;
      } else {
        bits = bits << 1;
        maxLng = mid;
      }
    } else {
      const mid = (minLat + maxLat) / 2;
      if (lat >= mid) {
        bits = (bits << 1) | 1;
        minLat = mid;
      } else {
        bits = bits << 1;
        maxLat = mid;
      }
    }
    evenBit = !evenBit;
    bitCount += 1;

    if (bitCount === BITS_PER_CHAR) {
      hash += BASE32[bits];
      bits = 0;
      bitCount = 0;
    }
  }

  return hash;
}
