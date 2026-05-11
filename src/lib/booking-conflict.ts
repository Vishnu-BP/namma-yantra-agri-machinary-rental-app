/**
 * @file booking-conflict.ts — Derives disabled calendar dates from existing bookings.
 * @module lib
 *
 * Given the active bookings for a machine, returns the set of ISO date strings
 * (`YYYY-MM-DD`) where the machine is fully booked. Used by the booking flow
 * to grey-out unavailable days in `react-native-calendars`.
 *
 * A date is "disabled" when every hour of that day falls inside at least one
 * active booking. For simplicity at L3, any date touched by a booking is
 * disabled — a conservative choice that avoids partial-day complexity. A more
 * granular hourly grid can be added in a later layer.
 */

import type { Booking } from '@/types/database';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** ISO date string for a given Date object, in local-timezone terms. */
function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Enumerate every calendar date touched by [start, end). */
function datesBetween(start: Date, end: Date): string[] {
  const dates: string[] = [];
  const cursor = new Date(start);
  // Zero out time so we iterate whole days
  cursor.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);

  while (cursor <= endDay) {
    dates.push(toDateString(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns ISO date strings for all days touched by pending or accepted bookings.
 *
 * @param bookings - Active bookings fetched from Supabase (status pending/accepted).
 */
export function getDisabledDates(bookings: Booking[]): string[] {
  const active = bookings.filter(
    (b) => b.status === 'pending' || b.status === 'accepted',
  );
  const dateSet = new Set<string>();
  for (const booking of active) {
    const start = new Date(booking.start_time);
    const end = new Date(booking.end_time);
    for (const d of datesBetween(start, end)) {
      dateSet.add(d);
    }
  }
  return Array.from(dateSet).sort();
}
