-- ==============================================
-- Layer 1: profiles + categories + enums
-- ==============================================

-- Enums
CREATE TYPE user_role AS ENUM ('owner', 'renter', 'both');
CREATE TYPE language_code AS ENUM ('en', 'kn');

-- Categories (seeded statically)
CREATE TABLE categories (
  id          TEXT PRIMARY KEY,
  name_en     TEXT NOT NULL,
  name_kn     TEXT NOT NULL,
  icon_asset  TEXT NOT NULL,
  default_minimum_hours INT NOT NULL DEFAULT 2,
  avg_hourly_low  INT NOT NULL,
  avg_hourly_high INT NOT NULL
);

INSERT INTO categories (id, name_en, name_kn, icon_asset, default_minimum_hours, avg_hourly_low, avg_hourly_high) VALUES
  ('tractor',   'Tractor',       'ಟ್ರ್ಯಾಕ್ಟರ್',         'tractor',   2, 400, 700),
  ('harvester', 'Harvester',     'ಕೊಯ್ಲು ಯಂತ್ರ',       'harvester', 2, 1200, 2500),
  ('sprayer',   'Sprayer',       'ಸಿಂಪರಣೆ ಯಂತ್ರ',      'sprayer',   1, 150, 300),
  ('tiller',    'Power Tiller',  'ಪವರ್ ಟಿಲ್ಲರ್',       'tiller',    2, 250, 450),
  ('other',     'Other',         'ಇತರೆ',              'other',     2, 200, 800);

-- Profiles
CREATE TABLE profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name        TEXT NOT NULL,
  phone_number        TEXT,
  role                user_role NOT NULL,
  village             TEXT NOT NULL,
  district            TEXT NOT NULL,
  state               TEXT NOT NULL DEFAULT 'Karnataka',
  preferred_language  language_code NOT NULL DEFAULT 'en',
  home_lat            NUMERIC(9,6),
  home_lng            NUMERIC(9,6),
  expo_push_token     TEXT,
  -- Owner-specific aggregates
  owner_stats         JSONB NOT NULL DEFAULT '{"totalListings":0,"activeListings":0,"totalEarnings":0,"completedRentals":0}'::jsonb,
  -- Renter-specific profile
  renter_profile      JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- profiles: anyone authed can read; user can only insert/update their own row; no deletes
CREATE POLICY "profiles_select_authed" ON profiles FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- categories: read-only public
CREATE POLICY "categories_select_all" ON categories FOR SELECT
  TO authenticated, anon USING (true);
