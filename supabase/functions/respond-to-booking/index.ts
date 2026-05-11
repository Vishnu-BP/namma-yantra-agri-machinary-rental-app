/**
 * @file respond-to-booking/index.ts — Edge function: owner accept/decline, renter cancel.
 * @module edge-functions
 *
 * Enforces the booking state machine:
 *   pending  → accepted  (owner only)
 *   pending  → declined  (owner only)
 *   pending  → cancelled (renter or owner)
 *   accepted → cancelled (renter or owner)
 *
 * Completed status is set by a future pg_cron reconciler (L5).
 * Accepting a booking sets machines.is_currently_available = false
 * as a lightweight signal until L5's realtime reconciler takes over.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── CORS helpers ─────────────────────────────────────────────────────────────

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

// ─── State machine ────────────────────────────────────────────────────────────

type BookingStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'completed';
type Action = 'accept' | 'decline' | 'cancel';

const TRANSITIONS: Record<BookingStatus, Partial<Record<Action, BookingStatus>>> = {
  pending: { accept: 'accepted', decline: 'declined', cancel: 'cancelled' },
  accepted: { cancel: 'cancelled' },
  declined: {},
  cancelled: {},
  completed: {},
};

// ─── Handler ──────────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Missing Authorization header' }, 401);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  );
  const adminSupabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return json({ error: 'Unauthorized' }, 401);

  let body: { bookingId: string; action: Action; ownerNote?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { bookingId, action, ownerNote } = body;
  if (!bookingId || !action) return json({ error: 'bookingId and action are required' }, 400);
  if (!['accept', 'decline', 'cancel'].includes(action)) {
    return json({ error: 'action must be accept, decline, or cancel' }, 400);
  }

  // Fetch booking
  const { data: booking, error: fetchErr } = await adminSupabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single();

  if (fetchErr || !booking) return json({ error: 'Booking not found' }, 404);

  // Authorization check
  const isOwner = booking.owner_id === user.id;
  const isRenter = booking.renter_id === user.id;
  if (!isOwner && !isRenter) return json({ error: 'Forbidden' }, 403);

  if ((action === 'accept' || action === 'decline') && !isOwner) {
    return json({ error: 'Only the machine owner can accept or decline bookings' }, 403);
  }

  // State transition check
  const nextStatus = TRANSITIONS[booking.status as BookingStatus]?.[action];
  if (!nextStatus) {
    return json(
      { error: `Cannot ${action} a booking with status "${booking.status}"` },
      409,
    );
  }

  // Build update payload
  const updatePayload: Record<string, unknown> = { status: nextStatus };
  if (ownerNote !== undefined) updatePayload['owner_note'] = ownerNote;

  const { data: updated, error: updateErr } = await adminSupabase
    .from('bookings')
    .update(updatePayload)
    .eq('id', bookingId)
    .select()
    .single();

  if (updateErr || !updated) {
    console.log(`[respond-to-booking] update error: ${updateErr?.message}`);
    return json({ error: 'Failed to update booking' }, 500);
  }

  // If accepted → mark machine temporarily unavailable (L5 will manage this via realtime)
  if (nextStatus === 'accepted') {
    const { error: machineErr } = await adminSupabase
      .from('machines')
      .update({ is_currently_available: false })
      .eq('id', booking.machine_id);
    if (machineErr) {
      console.log(`[respond-to-booking] machine availability update failed: ${machineErr.message}`);
    }
  }

  // If cancelled/declined after being accepted → restore availability
  if (
    nextStatus === 'cancelled' &&
    (booking.status === 'accepted')
  ) {
    await adminSupabase
      .from('machines')
      .update({ is_currently_available: true })
      .eq('id', booking.machine_id);
  }

  console.log(
    `[respond-to-booking] booking=${bookingId} ${booking.status}->${nextStatus} by user=${user.id}`,
  );
  return json({ booking: updated });
});
