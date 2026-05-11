-- Layer 3: bookings table with btree_gist EXCLUDE constraint.
-- Prevents double-booking at the DB level — no two active bookings can
-- overlap for the same machine. Edge functions do a second check before
-- inserting, but the constraint is the hard safety net.

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TYPE booking_status AS ENUM (
  'pending', 'accepted', 'declined', 'cancelled', 'completed'
);
CREATE TYPE duration_unit AS ENUM ('hourly', 'daily');

CREATE TABLE bookings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id        UUID NOT NULL REFERENCES machines(id) ON DELETE RESTRICT,
  renter_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  owner_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  status            booking_status NOT NULL DEFAULT 'pending',
  duration_unit     duration_unit NOT NULL,
  start_time        TIMESTAMPTZ NOT NULL,
  end_time          TIMESTAMPTZ NOT NULL,
  -- Generated column so callers never manually construct tstzrange.
  time_range        TSTZRANGE GENERATED ALWAYS AS (tstzrange(start_time, end_time)) STORED,
  total_hours       NUMERIC(8,2) NOT NULL,
  rate_paise        INT NOT NULL,
  total_paise       BIGINT NOT NULL,
  renter_note       TEXT,
  owner_note        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Core constraint: no two pending/accepted bookings may overlap for the
  -- same machine. Declined/cancelled/completed rows are excluded from the
  -- check so they don't block future bookings.
  CONSTRAINT bookings_no_overlap EXCLUDE USING gist (
    machine_id WITH =,
    time_range WITH &&
  ) WHERE (status IN ('pending', 'accepted'))
);

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_bookings_machine_status ON bookings (machine_id, status);
CREATE INDEX idx_bookings_renter ON bookings (renter_id, created_at DESC);
CREATE INDEX idx_bookings_owner  ON bookings (owner_id, created_at DESC);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Renters and owners can read their own bookings only.
CREATE POLICY bookings_select ON bookings FOR SELECT TO authenticated
  USING (renter_id = auth.uid() OR owner_id = auth.uid());

-- Only the renter can create a booking for themselves.
CREATE POLICY bookings_insert ON bookings FOR INSERT TO authenticated
  WITH CHECK (renter_id = auth.uid());

-- Status updates go through edge functions which use the service role;
-- direct client UPDATE is blocked by the absence of an UPDATE policy.
