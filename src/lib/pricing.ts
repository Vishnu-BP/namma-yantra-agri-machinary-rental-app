/**
 * @file pricing.ts — Booking price calculations.
 * @module lib
 *
 * Pure math — no network, no React. Used both on the client (booking review
 * step) and mirrored server-side inside the create-booking edge function so
 * the server always recomputes the authoritative total.
 */

import type { DurationUnit } from '@/types/database';
import { formatPaise } from './money';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PricingParams {
  startTime: Date;
  endTime: Date;
  durationUnit: DurationUnit;
  hourlyRatePaise: number;
  dailyRatePaise: number;
  minimumHours: number;
}

export interface PricingResult {
  /** Billable hours (respects minimum; daily rounds partial days up). */
  totalHours: number;
  /** Rate applied per unit (paise). */
  ratePaise: number;
  /** Grand total in paise. */
  totalPaise: number;
  /** Human-readable label, e.g. "₹1,500 × 3 hr" or "₹3,500 × 2 days". */
  label: string;
}

// ─── Implementation ───────────────────────────────────────────────────────────

/**
 * Computes booking total from start/end times and the machine's rate card.
 *
 * Hourly: raw hours clamped to minimum_hours.
 * Daily: partial days rounded UP; minimum is 1 day.
 */
export function calculateTotal(params: PricingParams): PricingResult {
  const {
    startTime,
    endTime,
    durationUnit,
    hourlyRatePaise,
    dailyRatePaise,
    minimumHours,
  } = params;

  const rawHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

  if (durationUnit === 'daily') {
    const rawDays = rawHours / 24;
    const days = Math.max(1, Math.ceil(rawDays));
    const totalPaise = days * dailyRatePaise;
    return {
      totalHours: days * 24,
      ratePaise: dailyRatePaise,
      totalPaise,
      label: `${formatPaise(dailyRatePaise)} × ${days} day${days > 1 ? 's' : ''}`,
    };
  }

  // Hourly
  const hours = Math.max(minimumHours, Math.ceil(rawHours));
  const totalPaise = hours * hourlyRatePaise;
  return {
    totalHours: hours,
    ratePaise: hourlyRatePaise,
    totalPaise,
    label: `${formatPaise(hourlyRatePaise)} × ${hours} hr`,
  };
}
