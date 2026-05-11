/**
 * @file bookings.ts — Supabase query wrappers for the bookings table.
 * @module src/integrations/supabase
 *
 * Read queries call Supabase directly (RLS: caller sees only their own rows).
 * Write mutations call the edge functions so pricing + state transitions are
 * always computed server-side. Raw table writes are blocked by the absence of
 * an UPDATE RLS policy on bookings.
 */

import { createLogger } from '@/lib/logger';
import type { Booking, BookingStatus, DurationUnit } from '@/types/database';
import { supabase } from './client';

const log = createLogger('BOOKING');

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateBookingParams {
  machineId: string;
  startTime: Date;
  endTime: Date;
  durationUnit: DurationUnit;
  renterNote?: string;
}

export interface RespondToBookingParams {
  bookingId: string;
  action: 'accept' | 'decline' | 'cancel';
  ownerNote?: string;
}

// ─── Read queries ─────────────────────────────────────────────────────────────

/**
 * Fetches all bookings where the caller is the renter, newest first.
 * RLS enforces caller identity — no additional filter needed.
 */
export async function fetchRenterBookings(renterId: string): Promise<Booking[]> {
  log.info('fetchRenterBookings: querying', { renterId });
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('renter_id', renterId)
    .order('created_at', { ascending: false });
  if (error) {
    log.error('fetchRenterBookings: failed', error);
    throw error;
  }
  log.info('fetchRenterBookings: done', { count: data.length });
  return data;
}

/**
 * Fetches all bookings where the caller is the machine owner, newest first.
 */
export async function fetchOwnerBookings(ownerId: string): Promise<Booking[]> {
  log.info('fetchOwnerBookings: querying', { ownerId });
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });
  if (error) {
    log.error('fetchOwnerBookings: failed', error);
    throw error;
  }
  log.info('fetchOwnerBookings: done', { count: data.length });
  return data;
}

/**
 * Fetches active (pending/accepted) bookings for a given machine.
 * Used to derive disabled calendar dates in the booking flow.
 */
export async function fetchMachineBookings(machineId: string): Promise<Booking[]> {
  log.info('fetchMachineBookings: querying', { machineId });
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('machine_id', machineId)
    .in('status', ['pending', 'accepted'] satisfies BookingStatus[]);
  if (error) {
    log.error('fetchMachineBookings: failed', error);
    throw error;
  }
  log.info('fetchMachineBookings: done', { count: data.length });
  return data;
}

// ─── Mutations (via edge functions) ──────────────────────────────────────────

/**
 * Calls the create-booking edge function with the renter's JWT.
 * Server computes the authoritative price; client total is ignored.
 *
 * @throws with a 409 message when the EXCLUDE constraint fires (overlap).
 */
export async function createBooking(params: CreateBookingParams): Promise<Booking> {
  log.info('createBooking: calling edge fn', {
    machineId: params.machineId,
    durationUnit: params.durationUnit,
  });

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-booking`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      machineId: params.machineId,
      startTime: params.startTime.toISOString(),
      endTime: params.endTime.toISOString(),
      durationUnit: params.durationUnit,
      renterNote: params.renterNote,
    }),
  });

  const body = await res.json() as { booking?: Booking; error?: string };
  if (!res.ok) {
    log.error('createBooking: edge fn error', { status: res.status, error: body.error });
    throw Object.assign(new Error(body.error ?? 'createBooking failed'), { status: res.status });
  }
  log.info('createBooking: created', { bookingId: body.booking?.id });
  return body.booking!;
}

/**
 * Calls the respond-to-booking edge function.
 * Accepts 'accept' | 'decline' | 'cancel' actions.
 *
 * @throws with a 409 message on invalid state transitions.
 */
export async function respondToBooking(params: RespondToBookingParams): Promise<Booking> {
  log.info('respondToBooking: calling edge fn', {
    bookingId: params.bookingId,
    action: params.action,
  });

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/respond-to-booking`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      bookingId: params.bookingId,
      action: params.action,
      ownerNote: params.ownerNote,
    }),
  });

  const body = await res.json() as { booking?: Booking; error?: string };
  if (!res.ok) {
    log.error('respondToBooking: edge fn error', { status: res.status, error: body.error });
    throw Object.assign(new Error(body.error ?? 'respondToBooking failed'), { status: res.status });
  }
  log.info('respondToBooking: done', { bookingId: params.bookingId, action: params.action });
  return body.booking!;
}
