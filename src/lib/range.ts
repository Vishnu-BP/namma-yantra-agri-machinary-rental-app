/**
 * @file range.ts — Postgres tstzrange string parser.
 * @module lib
 *
 * Supabase returns `time_range` as a raw string like
 * `[2026-05-12 08:00:00+00,2026-05-12 10:00:00+00)`.
 * This module parses that into plain JS Dates so callers never touch the
 * raw format again.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TimeRange {
  start: Date;
  end: Date;
}

// ─── Parser ───────────────────────────────────────────────────────────────────

/**
 * Parses a Postgres tstzrange string into start/end Dates.
 *
 * Accepts both `[` (inclusive) and `(` (exclusive) bounds — for booking
 * ranges the distinction doesn't matter at the JS layer.
 *
 * @throws if the string doesn't match the expected format.
 */
export function parseTstzrange(raw: string): TimeRange {
  // Strip leading [ or ( and trailing ] or )
  const inner = raw.replace(/^[[(]/, '').replace(/[\])]$/, '');
  const commaIdx = inner.indexOf(',');
  if (commaIdx === -1) {
    throw new Error(`parseTstzrange: unexpected format "${raw}"`);
  }
  const startStr = inner.slice(0, commaIdx).trim();
  const endStr = inner.slice(commaIdx + 1).trim();
  return {
    start: new Date(startStr),
    end: new Date(endStr),
  };
}
