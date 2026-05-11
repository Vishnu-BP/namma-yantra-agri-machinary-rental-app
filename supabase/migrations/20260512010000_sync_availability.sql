-- Layer 5: scheduled availability reconciliation.
-- Reconciles is_currently_available every 15 min so short-lived booking
-- windows don't leave stale badge state after they end.

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable Postgres Changes broadcasting for the machines table.
ALTER PUBLICATION supabase_realtime ADD TABLE machines;

-- Reconciler: sets is_currently_available = false when an accepted booking
-- covers NOW(), true otherwise. SECURITY DEFINER bypasses RLS so the cron
-- worker (which runs as postgres) can update all active machines.
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run every 15 minutes.
SELECT cron.schedule(
  'sync-machine-availability',
  '*/15 * * * *',
  $$ SELECT sync_machine_availability(); $$
);
