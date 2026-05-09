
# LAYER 5 — Real-time availability

**Goal:** Machine availability badge updates live across devices via Supabase Postgres Changes. When an owner accepts a booking, the green dot turns gray on the renter's screen within ~1 second.

**Why this layer:** This is the marquee technical feature for the demo. It's the visible proof that we know how to use Supabase real-time properly.

## Prerequisites
- Layer 4 complete

## Deliverables

### 5.1 Enable Realtime on the machines table

Postgres Changes only broadcasts updates for tables that have replication enabled. Run in SQL editor:

```sql
-- Enable replication for the machines table (only the columns we care about)
ALTER PUBLICATION supabase_realtime ADD TABLE machines;
```

Verify in Database → Replication that `machines` is listed.

### 5.2 Real-time availability hook

Create `src/hooks/useAvailability.ts`:

```typescript
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase/client';

export function useAvailability(machineId: string | undefined, initialValue?: boolean) {
  const [isAvailable, setIsAvailable] = useState<boolean>(initialValue ?? true);
  const [isLoading, setIsLoading] = useState(initialValue === undefined);

  useEffect(() => {
    if (!machineId) return;

    // Initial fetch (in case we don't have the value yet)
    if (initialValue === undefined) {
      supabase
        .from('machines')
        .select('is_currently_available')
        .eq('id', machineId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setIsAvailable(data.is_currently_available);
          setIsLoading(false);
        });
    }

    // Subscribe to UPDATE events on this specific machine
    const channel = supabase
      .channel(`machine-availability:${machineId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'machines',
          filter: `id=eq.${machineId}`,
        },
        (payload) => {
          const next = payload.new as { is_currently_available: boolean };
          setIsAvailable(next.is_currently_available);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [machineId]);

  return { isAvailable, isLoading };
}
```

### 5.3 AvailabilityBadge component

Create `src/components/machine/AvailabilityBadge.tsx`:

```typescript
import { View, Text } from 'react-native';
import { useAvailability } from '../../hooks/useAvailability';

interface Props {
  machineId: string;
  initialValue?: boolean;
  size?: 'sm' | 'md';
}

export function AvailabilityBadge({ machineId, initialValue, size = 'sm' }: Props) {
  const { isAvailable, isLoading } = useAvailability(machineId, initialValue);
  const textSize = size === 'md' ? 'text-sm' : 'text-xs';

  if (isLoading) {
    return (
      <View className="bg-busy/15 px-2 py-1 rounded-full">
        <Text className={`${textSize} text-busy`}>···</Text>
      </View>
    );
  }

  return isAvailable ? (
    <View className="flex-row items-center gap-1 bg-avail/15 px-2 py-1 rounded-full">
      <View className="w-1.5 h-1.5 rounded-full bg-avail" />
      <Text className={`${textSize} text-avail font-semibold`}>Available</Text>
    </View>
  ) : (
    <View className="flex-row items-center gap-1 bg-busy/20 px-2 py-1 rounded-full">
      <View className="w-1.5 h-1.5 rounded-full bg-busy" />
      <Text className={`${textSize} text-ink-soft font-semibold`}>In use</Text>
    </View>
  );
}
```

### 5.4 Wire into existing components

Update `MachineCard.tsx` to use `<AvailabilityBadge machineId={machine.id} initialValue={machine.is_currently_available} />` instead of the static version.

Update the machine detail screen the same way.

### 5.5 Discover feed real-time updates

For the discover feed where many machines are shown, subscribe once to the whole table and patch the TanStack Query cache.

Update `app/(renter)/discover.tsx` to add this effect:

```typescript
import { useEffect } from 'react';
import { supabase } from '../../src/lib/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

// Inside the component:
const queryClient = useQueryClient();

useEffect(() => {
  const channel = supabase
    .channel('machines-feed')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'machines' },
      (payload) => {
        // Patch the cache for any active machines query
        queryClient.setQueriesData({ queryKey: ['machines'] }, (old: any) => {
          if (!old) return old;
          if (Array.isArray(old)) {
            return old.map((m) =>
              m.id === payload.new.id ? { ...m, ...payload.new } : m
            );
          }
          return old;
        });
        // Also update single-machine cache
        queryClient.setQueryData(['machine', payload.new.id], (old: any) =>
          old ? { ...old, ...payload.new } : old
        );
      }
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, [queryClient]);
```

### 5.6 Scheduled reconciliation function

Create a Postgres scheduled function to reconcile availability:

```bash
supabase migration new sync_availability_function
```

```sql
-- ==============================================
-- Layer 5: scheduled availability reconciliation
-- ==============================================

CREATE OR REPLACE FUNCTION sync_machine_availability()
RETURNS void AS $$
BEGIN
  UPDATE machines m
  SET is_currently_available = NOT EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.machine_id = m.id
      AND b.status = 'accepted'
      AND b.time_range @> NOW()
  )
  WHERE m.status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Schedule via pg_cron (Supabase has pg_cron available)
-- Run every 15 minutes
SELECT cron.schedule(
  'sync-machine-availability',
  '*/15 * * * *',
  $$ SELECT sync_machine_availability(); $$
);
```

Push: `supabase db push`

(Note: pg_cron requires enabling the extension in the Database → Extensions panel of the Supabase dashboard. Enable `pg_cron` before pushing this migration.)

### 5.7 Update seed script

The `is_currently_available` column already defaults to `true` so no changes needed there. But verify seeded machines have it set correctly in the dashboard.

### 5.8 Testing real-time in development

Open two devices/emulators side by side:
- Device A: signed in as the demo owner
- Device B: signed in as a renter (create a new test renter account if needed)

On Device B, navigate to Discover. Note a machine showing "Available."

On Device A, navigate to a booking request that's currently active and tap Accept (or use the SQL editor to manually toggle `is_currently_available`).

The badge on Device B should flip to "In use" within ~1 second.

## Acceptance criteria for Layer 5

- [ ] `supabase_realtime` publication includes the `machines` table
- [ ] `useAvailability` hook subscribes and unsubscribes cleanly (no listener leaks)
- [ ] **Two-device test:** badge updates from Available to In use within 2 seconds when an owner accepts a covering booking on the other device
- [ ] **Reverse test:** cancelling/declining a booking flips availability back to Available
- [ ] New machine listings start as "Available"
- [ ] Discover feed updates live when any machine's availability changes
- [ ] Pulse animation on green dot for visual feedback
- [ ] Scheduled `sync_machine_availability` function runs without error (verify in cron logs after 15 minutes)
- [ ] No memory leaks (multiple navigates between screens don't pile up listeners — verify by watching network tab for ws connections)
- [ ] No TypeScript errors

**Commit:** `feat(L5): real-time availability via Postgres Changes`

---
