
# LAYER 3 — Booking flow

**Goal:** Renter can book a machine end-to-end. Owner can see incoming requests and accept/decline. Status flows correctly. Conflict prevention enforced at the database level via Postgres EXCLUDE constraint.

**Why this layer:** This is the core marketplace transaction. The EXCLUDE constraint is a strong technical talking point — double-booking is impossible at the DB level.

## Prerequisites
- Layer 2 complete

## Deliverables

### 3.1 Bookings table migration

```bash
supabase migration new init_bookings
```

Edit the new migration file:

```sql
-- ==============================================
-- Layer 3: bookings table with EXCLUDE constraint
-- ==============================================

CREATE TYPE booking_status AS ENUM ('pending', 'accepted', 'declined', 'cancelled', 'completed');
CREATE TYPE duration_unit AS ENUM ('hours', 'days');

-- Required for EXCLUDE constraint with range types
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE bookings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  machine_id          UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  -- Denormalized snapshots taken at booking creation
  machine_title       TEXT NOT NULL,
  machine_primary_image_url TEXT,
  machine_category    TEXT NOT NULL,

  owner_id            UUID NOT NULL REFERENCES profiles(id),
  owner_name          TEXT NOT NULL,
  owner_phone         TEXT,

  renter_id           UUID NOT NULL REFERENCES profiles(id),
  renter_name         TEXT NOT NULL,
  renter_phone        TEXT,
  renter_village      TEXT NOT NULL,

  -- Schedule using a range type — the magic of this design
  time_range          TSTZRANGE NOT NULL,
  duration_unit       duration_unit NOT NULL,
  duration_value      NUMERIC(5,2) NOT NULL,

  -- Pricing snapshot (immutable post-creation)
  rate_at_booking_paise INT NOT NULL,
  total_amount_paise  INT NOT NULL,
  service_fee_paise   INT NOT NULL DEFAULT 0,

  -- State
  status              booking_status NOT NULL DEFAULT 'pending',
  status_history      JSONB NOT NULL DEFAULT '[]'::jsonb,
  decline_reason      TEXT,
  cancelled_by        TEXT CHECK (cancelled_by IN ('owner', 'renter')),
  cancellation_reason TEXT,
  renter_notes        TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at         TIMESTAMPTZ,
  declined_at         TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,

  -- THE STAR OF THE SHOW:
  -- Prevent overlapping pending/accepted bookings for the same machine.
  -- This means double-booking is structurally impossible at the DB level.
  CONSTRAINT no_overlapping_bookings
    EXCLUDE USING gist (
      machine_id WITH =,
      time_range WITH &&
    )
    WHERE (status IN ('pending', 'accepted'))
);

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Indexes
CREATE INDEX idx_bookings_renter_status_created
  ON bookings (renter_id, status, created_at DESC);
CREATE INDEX idx_bookings_owner_status_created
  ON bookings (owner_id, status, created_at DESC);
CREATE INDEX idx_bookings_machine_status
  ON bookings (machine_id, status);

-- RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Renter or owner can read their own bookings
CREATE POLICY "bookings_select_involved" ON bookings FOR SELECT
  TO authenticated
  USING (auth.uid() IN (renter_id, owner_id));

-- Renter creates the booking; only renter can be the renter_id;
-- initial status must be 'pending'
CREATE POLICY "bookings_insert_renter" ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (
    renter_id = auth.uid()
    AND status = 'pending'
  );

-- Updates: renter or owner can update, but state-transition rules
-- are enforced by an edge function (this policy is the outer envelope)
CREATE POLICY "bookings_update_involved" ON bookings FOR UPDATE
  TO authenticated
  USING (auth.uid() IN (renter_id, owner_id))
  WITH CHECK (auth.uid() IN (renter_id, owner_id));

-- No deletes (we use soft state changes only)
```

Push: `supabase db push`

**Verify the EXCLUDE constraint works.** In SQL editor, try:
```sql
INSERT INTO bookings (...) VALUES (machine_id_X, '[2026-12-01, 2026-12-03)', ...);
INSERT INTO bookings (...) VALUES (machine_id_X, '[2026-12-02, 2026-12-04)', ...);
-- Second insert MUST fail with "conflicting key value violates exclusion constraint"
```

### 3.2 Booking types

Add to `src/types/database.ts`:

```typescript
export type BookingStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'completed';
export type DurationUnit = 'hours' | 'days';

export interface Booking {
  id: string;
  machine_id: string;
  machine_title: string;
  machine_primary_image_url: string | null;
  machine_category: string;
  owner_id: string;
  owner_name: string;
  owner_phone: string | null;
  renter_id: string;
  renter_name: string;
  renter_phone: string | null;
  renter_village: string;
  time_range: string; // Postgres tstzrange string like "[\"2026-11-10 00:00:00+00\",\"2026-11-13 00:00:00+00\")"
  duration_unit: DurationUnit;
  duration_value: number;
  rate_at_booking_paise: number;
  total_amount_paise: number;
  service_fee_paise: number;
  status: BookingStatus;
  status_history: Array<{ status: BookingStatus; at: string; by: string }>;
  decline_reason: string | null;
  cancelled_by: 'owner' | 'renter' | null;
  cancellation_reason: string | null;
  renter_notes: string | null;
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
  declined_at: string | null;
  completed_at: string | null;
}
```

### 3.3 Range parsing utility

Postgres returns ranges as strings. We need to parse them on the client.

Create `src/lib/range.ts`:

```typescript
// Postgres tstzrange format: "[\"2026-11-10 00:00:00+00\",\"2026-11-13 00:00:00+00\")"
// We convert to/from { start: Date, end: Date }.

export interface DateRange {
  start: Date;
  end: Date;
}

export function parseTstzRange(raw: string): DateRange {
  // Strip leading [ or ( and trailing ) or ]
  const inner = raw.slice(1, -1);
  // Split on comma, but be careful — Postgres quotes timestamps with quotes
  const match = inner.match(/^"([^"]+)","([^"]+)"$/);
  if (!match) {
    throw new Error(`Cannot parse tstzrange: ${raw}`);
  }
  return {
    start: new Date(match[1].replace(' ', 'T')),
    end: new Date(match[2].replace(' ', 'T')),
  };
}

export function formatTstzRange(range: DateRange): string {
  // Format: '[start_iso, end_iso)'
  const startIso = range.start.toISOString();
  const endIso = range.end.toISOString();
  return `[${startIso},${endIso})`;
}
```

### 3.4 Pricing utility (client-side preview)

Create `src/lib/pricing.ts`:

```typescript
import { DurationUnit } from '../types/database';
import { paiseToRupees, formatPaise } from './money';

export interface PriceResult {
  rateUsedPaise: number;
  totalPaise: number;
  formula: string;
}

export function calculatePrice(args: {
  hourlyRatePaise: number;
  dailyRatePaise: number;
  unit: DurationUnit;
  value: number;
}): PriceResult {
  const rateUsedPaise = args.unit === 'hours' ? args.hourlyRatePaise : args.dailyRatePaise;
  const totalPaise = Math.round(rateUsedPaise * args.value);
  const unitLabel =
    args.unit === 'hours' ? (args.value === 1 ? 'hour' : 'hours') : (args.value === 1 ? 'day' : 'days');
  const formula = `${args.value} ${unitLabel} × ${formatPaise(rateUsedPaise)} = ${formatPaise(totalPaise)}`;
  return { rateUsedPaise, totalPaise, formula };
}
```

### 3.5 Conflict detection (client-side preview)

Create `src/lib/booking-conflict.ts`:

```typescript
import { Booking } from '../types/database';
import { parseTstzRange } from './range';

export function getDisabledDates(bookings: Booking[]): string[] {
  // Returns array of YYYY-MM-DD strings for react-native-calendars
  const disabled = new Set<string>();
  for (const b of bookings) {
    if (b.status !== 'pending' && b.status !== 'accepted') continue;
    const { start, end } = parseTstzRange(b.time_range);
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    while (cursor < end) {
      disabled.add(cursor.toISOString().split('T')[0]);
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  return Array.from(disabled);
}
```

### 3.6 Booking edge function: `create-booking`

Initialize the edge function:

```bash
supabase functions new create-booking
```

This creates `supabase/functions/create-booking/index.ts`. Replace its contents:

```typescript
// supabase/functions/create-booking/index.ts
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3.23.8';

const InputSchema = z.object({
  machineId: z.string().uuid(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  durationUnit: z.enum(['hours', 'days']),
  durationValue: z.number().positive(),
  renterNotes: z.string().max(500).optional(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Sign in required' } }, 401);
    }

    // Authed client (uses caller's JWT — for identity verification)
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Invalid token' } }, 401);
    }

    // Parse input
    const body = await req.json();
    const parsed = InputSchema.safeParse(body);
    if (!parsed.success) {
      return json({ success: false, error: { code: 'INVALID_INPUT', message: parsed.error.message } }, 400);
    }
    const input = parsed.data;

    // Service-role client for trusted writes
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Read machine fresh from DB
    const { data: machine, error: machineError } = await adminClient
      .from('machines')
      .select('*')
      .eq('id', input.machineId)
      .eq('status', 'active')
      .maybeSingle();
    if (machineError || !machine) {
      return json({ success: false, error: { code: 'NOT_FOUND', message: 'Machine not found or not active' } }, 404);
    }

    // Read renter profile
    const { data: renter } = await adminClient
      .from('profiles')
      .select('display_name, phone_number, village')
      .eq('id', user.id)
      .single();
    if (!renter) {
      return json({ success: false, error: { code: 'NO_PROFILE', message: 'Complete your profile first' } }, 400);
    }

    // Compute price authoritatively
    const ratePaise = input.durationUnit === 'hours' ? machine.hourly_rate_paise : machine.daily_rate_paise;
    const totalPaise = Math.round(ratePaise * input.durationValue);

    // Build the booking row. Postgres EXCLUDE constraint will reject overlaps.
    const timeRange = `[${input.startTime},${input.endTime})`;

    const { data: booking, error: insertError } = await adminClient
      .from('bookings')
      .insert({
        machine_id: machine.id,
        machine_title: machine.title,
        machine_primary_image_url: machine.primary_image_url,
        machine_category: machine.category,
        owner_id: machine.owner_id,
        owner_name: machine.owner_name,
        owner_phone: machine.owner_phone,
        renter_id: user.id,
        renter_name: renter.display_name,
        renter_phone: renter.phone_number,
        renter_village: renter.village,
        time_range: timeRange,
        duration_unit: input.durationUnit,
        duration_value: input.durationValue,
        rate_at_booking_paise: ratePaise,
        total_amount_paise: totalPaise,
        status: 'pending',
        renter_notes: input.renterNotes ?? null,
        status_history: [{ status: 'pending', at: new Date().toISOString(), by: user.id }],
      })
      .select('*')
      .single();

    if (insertError) {
      // EXCLUDE constraint code is '23P01'
      if (insertError.code === '23P01') {
        return json({ success: false, error: { code: 'CONFLICT', message: 'These dates conflict with an existing booking' } }, 409);
      }
      return json({ success: false, error: { code: 'INSERT_FAILED', message: insertError.message } }, 500);
    }

    return json({ success: true, data: booking });
  } catch (e) {
    return json({ success: false, error: { code: 'INTERNAL', message: (e as Error).message } }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

Deploy: `supabase functions deploy create-booking --no-verify-jwt`

(`--no-verify-jwt` because we're verifying the JWT manually inside the function. This lets us return clean error responses for missing auth.)

### 3.7 Booking edge function: `respond-to-booking`

```bash
supabase functions new respond-to-booking
```

```typescript
// supabase/functions/respond-to-booking/index.ts
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3.23.8';

const InputSchema = z.object({
  bookingId: z.string().uuid(),
  action: z.enum(['accept', 'decline', 'cancel']),
  reason: z.string().max(500).optional(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Sign in required' } }, 401);

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Invalid token' } }, 401);

    const body = await req.json();
    const parsed = InputSchema.safeParse(body);
    if (!parsed.success) return json({ success: false, error: { code: 'INVALID_INPUT', message: parsed.error.message } }, 400);
    const { bookingId, action, reason } = parsed.data;

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Fetch booking
    const { data: booking } = await admin.from('bookings').select('*').eq('id', bookingId).single();
    if (!booking) return json({ success: false, error: { code: 'NOT_FOUND', message: 'Booking not found' } }, 404);

    // Validate authorization for the action
    const isOwner = booking.owner_id === user.id;
    const isRenter = booking.renter_id === user.id;

    if ((action === 'accept' || action === 'decline') && !isOwner) {
      return json({ success: false, error: { code: 'FORBIDDEN', message: 'Only the owner can accept or decline' } }, 403);
    }
    if (action === 'cancel' && !isRenter && !isOwner) {
      return json({ success: false, error: { code: 'FORBIDDEN', message: 'Only the renter or owner can cancel' } }, 403);
    }

    // Validate state transition
    const validTransition =
      (action === 'accept' && booking.status === 'pending') ||
      (action === 'decline' && booking.status === 'pending') ||
      (action === 'cancel' && (booking.status === 'pending' || booking.status === 'accepted'));
    if (!validTransition) {
      return json({ success: false, error: { code: 'INVALID_TRANSITION', message: `Cannot ${action} from status ${booking.status}` } }, 400);
    }

    // Build update
    const newStatus = action === 'accept' ? 'accepted' : action === 'decline' ? 'declined' : 'cancelled';
    const now = new Date().toISOString();
    const update: Record<string, unknown> = {
      status: newStatus,
      status_history: [...booking.status_history, { status: newStatus, at: now, by: user.id }],
    };
    if (action === 'accept') update.accepted_at = now;
    if (action === 'decline') {
      update.declined_at = now;
      update.decline_reason = reason ?? null;
    }
    if (action === 'cancel') {
      update.cancelled_by = isOwner ? 'owner' : 'renter';
      update.cancellation_reason = reason ?? null;
    }

    const { data: updated, error: updateError } = await admin
      .from('bookings')
      .update(update)
      .eq('id', bookingId)
      .select('*')
      .single();

    if (updateError) return json({ success: false, error: { code: 'UPDATE_FAILED', message: updateError.message } }, 500);

    // If accepted and the booking covers the current moment, flip availability
    if (action === 'accept') {
      const range = updated.time_range;
      // Crude parse: extract start and end
      const m = range.match(/\["?([^",]+)"?,"?([^",)]+)"?\)/);
      if (m) {
        const start = new Date(m[1]);
        const end = new Date(m[2]);
        const now = new Date();
        if (start <= now && now < end) {
          await admin.from('machines').update({ is_currently_available: false }).eq('id', booking.machine_id);
        }
      }
    }
    // If cancelled or declined, set machine back to available (the scheduled job will reconcile if needed)
    if (action === 'cancel' || action === 'decline') {
      await admin.from('machines').update({ is_currently_available: true }).eq('id', booking.machine_id);
    }

    return json({ success: true, data: updated });
  } catch (e) {
    return json({ success: false, error: { code: 'INTERNAL', message: (e as Error).message } }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

Deploy: `supabase functions deploy respond-to-booking --no-verify-jwt`

### 3.8 Bookings query layer

Create `src/lib/supabase/bookings.ts`:

```typescript
import { supabase } from './client';
import { Booking, BookingStatus } from '../../types/database';

export async function fetchBookingsForRenter(renterId: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('renter_id', renterId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchBookingsForOwner(ownerId: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchBookingsForMachine(machineId: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('machine_id', machineId)
    .in('status', ['pending', 'accepted']);
  if (error) throw error;
  return data ?? [];
}

export async function callCreateBooking(input: {
  machineId: string;
  startTime: string; // ISO
  endTime: string;
  durationUnit: 'hours' | 'days';
  durationValue: number;
  renterNotes?: string;
}): Promise<Booking> {
  const { data, error } = await supabase.functions.invoke('create-booking', { body: input });
  if (error) throw error;
  if (!data?.success) throw new Error(data?.error?.message ?? 'create-booking failed');
  return data.data as Booking;
}

export async function callRespondToBooking(input: {
  bookingId: string;
  action: 'accept' | 'decline' | 'cancel';
  reason?: string;
}): Promise<Booking> {
  const { data, error } = await supabase.functions.invoke('respond-to-booking', { body: input });
  if (error) throw error;
  if (!data?.success) throw new Error(data?.error?.message ?? 'respond-to-booking failed');
  return data.data as Booking;
}
```

### 3.9 Booking hooks

Create `src/hooks/useBookings.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchBookingsForRenter,
  fetchBookingsForOwner,
  fetchBookingsForMachine,
  callCreateBooking,
  callRespondToBooking,
} from '../lib/supabase/bookings';

export function useRenterBookings(renterId: string | undefined) {
  return useQuery({
    queryKey: ['bookings', 'renter', renterId],
    queryFn: () => fetchBookingsForRenter(renterId!),
    enabled: !!renterId,
  });
}

export function useOwnerBookings(ownerId: string | undefined) {
  return useQuery({
    queryKey: ['bookings', 'owner', ownerId],
    queryFn: () => fetchBookingsForOwner(ownerId!),
    enabled: !!ownerId,
  });
}

export function useMachineBookings(machineId: string | undefined) {
  return useQuery({
    queryKey: ['bookings', 'machine', machineId],
    queryFn: () => fetchBookingsForMachine(machineId!),
    enabled: !!machineId,
  });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: callCreateBooking,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings'] }),
  });
}

export function useRespondToBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: callRespondToBooking,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings'] }),
  });
}
```

### 3.10 Booking flow screen

Create `app/(renter)/book/[machineId].tsx`:

This is a multi-step screen with internal `useState` (no separate routes per step).

**Step 1 — Schedule:**
- Use `react-native-calendars` Calendar with `markedDates` showing disabled (red) booked days, computed via `getDisabledDates()` from machine's bookings
- For "daily" mode: range selection (start + end date)
- For "hourly" mode: single date + time pickers
- Toggle (Hourly/Daily) at top
- Stepper for value (1-24 for hours, 1-30 for days)
- Live PriceCalculator using `calculatePrice()` with paise math
- "Continue to review" button

**Step 2 — Review:**
- Machine summary card (image, title)
- Schedule summary
- Total amount in large type
- Optional notes textarea ("Notes for owner")
- Owner contact card
- "Send request to owner" button

**Step 3 — Confirmation:**
- Big check icon
- "Request sent to {ownerName}"
- Two buttons: "View my bookings" / "Back to discover"

Submit logic in step 2:
1. Build ISO timestamps from selected date + times
2. Call `useCreateBooking()` mutation
3. On success → navigate to step 3
4. On error (especially CONFLICT code) → show inline error toast

### 3.11 Renter bookings tab

Replace `app/(renter)/bookings.tsx`:

- Header "My bookings"
- Filter pills: All / Pending / Accepted / Past
- FlatList of `BookingCard` components
- Pull-to-refresh
- Empty state per filter

Create `src/components/booking/BookingCard.tsx`:
- Card with row layout
- Left: machine image
- Right: title, dates (parsed from time_range), total (formatted from paise), status badge

### 3.12 Owner requests tab

Add `app/(owner)/_layout.tsx` mirroring the renter tabs (Listings, Requests, Earnings, Profile).

Stub `app/(owner)/listings.tsx` for now (Layer 4 will populate it).

Create `app/(owner)/requests.tsx`:
- Header "Requests"
- Filter pills: Pending / Accepted / Past
- FlatList of request cards
- Each pending request: machine + renter info + dates + total + Accept/Decline buttons
- Decline opens a modal asking for optional reason
- Tapping Accept calls `useRespondToBooking({ action: 'accept' })`

Create stubs for `earnings.tsx`, `profile.tsx`.

### 3.13 Update machine detail screen

In `app/(renter)/machine/[id].tsx`:
- Enable "Request rental" button → `router.push(\`/(renter)/book/${id}\`)`
- Show booked-dates summary section (use `useMachineBookings(id)` and count future blocked days)

## Acceptance criteria for Layer 3

- [ ] Renter taps "Request rental" → calendar shows existing booked dates as disabled
- [ ] Calendar prevents selecting disabled dates
- [ ] Hourly/Daily toggle works correctly
- [ ] Stepper updates duration value
- [ ] Price formula displays correctly: e.g. `3 days × ₹3,500 = ₹10,500`
- [ ] Submit creates booking via edge function with `status: 'pending'`
- [ ] **Conflict test:** create one booking, then try to create another booking with overlapping dates on the same machine — must fail with the CONFLICT error code (proves EXCLUDE constraint works)
- [ ] Renter sees new booking in My Bookings tab (after refresh)
- [ ] Owner sees new request in Requests tab (after refresh)
- [ ] Owner taps Accept → booking status flips to `accepted`
- [ ] Owner taps Decline → modal opens, can submit reason → status flips to `declined`
- [ ] After accepting, request disappears from Pending and appears in Accepted
- [ ] After declining, declined reason is stored
- [ ] Filter pills filter correctly on both screens
- [ ] An owner cannot accept someone else's booking (verify by trying via SQL editor with a different owner's auth)
- [ ] All TypeScript types correct

**Commit:** `feat(L3): booking flow with EXCLUDE constraint conflict prevention`

---
