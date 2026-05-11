/**
 * @file create-booking/index.ts — Edge function: create a booking request.
 * @module edge-functions
 *
 * Called by the renter booking flow. Validates the request, computes the
 * authoritative price server-side (never trusting client-supplied totals),
 * then inserts the booking row. The Postgres EXCLUDE constraint is the last
 * line of defence against overlapping bookings.
 *
 * Auth: caller must be authenticated (JWT validated via supabase.auth.getUser).
 * Returns 400 on validation errors, 409 on overlap, 201 on success.
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

// ─── Pricing (mirrors src/lib/pricing.ts — must stay in sync) ─────────────────

function calculateTotal(params: {
  startTime: Date;
  endTime: Date;
  durationUnit: 'hourly' | 'daily';
  hourlyRatePaise: number;
  dailyRatePaise: number;
  minimumHours: number;
}): { totalHours: number; ratePaise: number; totalPaise: number } {
  const rawHours =
    (params.endTime.getTime() - params.startTime.getTime()) / (1000 * 60 * 60);

  if (params.durationUnit === 'daily') {
    const days = Math.max(1, Math.ceil(rawHours / 24));
    return {
      totalHours: days * 24,
      ratePaise: params.dailyRatePaise,
      totalPaise: days * params.dailyRatePaise,
    };
  }
  const hours = Math.max(params.minimumHours, Math.ceil(rawHours));
  return {
    totalHours: hours,
    ratePaise: params.hourlyRatePaise,
    totalPaise: hours * params.hourlyRatePaise,
  };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // Auth guard
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

  // Parse body
  let body: {
    machineId: string;
    startTime: string;
    endTime: string;
    durationUnit: 'hourly' | 'daily';
    renterNote?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { machineId, startTime: startStr, endTime: endStr, durationUnit, renterNote } = body;
  if (!machineId || !startStr || !endStr || !durationUnit) {
    return json({ error: 'machineId, startTime, endTime, durationUnit are required' }, 400);
  }

  const startTime = new Date(startStr);
  const endTime = new Date(endStr);
  if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
    return json({ error: 'Invalid startTime or endTime' }, 400);
  }
  if (endTime <= startTime) {
    return json({ error: 'endTime must be after startTime' }, 400);
  }

  // Fetch machine (with admin client to bypass RLS for reading owner data)
  const { data: machine, error: machineErr } = await adminSupabase
    .from('machines')
    .select('id, owner_id, status, is_currently_available, hourly_rate_paise, daily_rate_paise, minimum_hours')
    .eq('id', machineId)
    .single();

  if (machineErr || !machine) return json({ error: 'Machine not found' }, 404);
  if (machine.status !== 'active') return json({ error: 'Machine is not active' }, 400);
  if (!machine.is_currently_available) return json({ error: 'Machine is not currently available' }, 400);
  if (machine.owner_id === user.id) return json({ error: 'Cannot book your own machine' }, 400);

  // Minimum hours check (only for hourly bookings)
  const rawHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
  if (durationUnit === 'hourly' && rawHours < machine.minimum_hours) {
    return json({ error: `Minimum booking is ${machine.minimum_hours} hours` }, 400);
  }

  // Server-side pricing — client total is ignored
  const { totalHours, ratePaise, totalPaise } = calculateTotal({
    startTime,
    endTime,
    durationUnit,
    hourlyRatePaise: machine.hourly_rate_paise,
    dailyRatePaise: machine.daily_rate_paise,
    minimumHours: machine.minimum_hours,
  });

  // Fetch renter profile to confirm they are a renter
  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['renter', 'both'].includes(profile.role)) {
    return json({ error: 'Only renters can create bookings' }, 403);
  }

  // Insert — Postgres EXCLUDE constraint will reject overlaps with a 23P01 code
  const { data: booking, error: insertErr } = await adminSupabase
    .from('bookings')
    .insert({
      machine_id: machineId,
      renter_id: user.id,
      owner_id: machine.owner_id,
      status: 'pending',
      duration_unit: durationUnit,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      total_hours: totalHours,
      rate_paise: ratePaise,
      total_paise: totalPaise,
      renter_note: renterNote ?? null,
    })
    .select()
    .single();

  if (insertErr) {
    console.log(`[create-booking] insert error code=${insertErr.code} msg=${insertErr.message}`);
    // 23P01 = exclusion constraint violation
    if (insertErr.code === '23P01') {
      return json({ error: 'Those dates are already booked for this machine' }, 409);
    }
    return json({ error: 'Failed to create booking' }, 500);
  }

  console.log(`[create-booking] created booking=${booking.id} renter=${user.id} machine=${machineId}`);
  return json({ booking }, 201);
});
