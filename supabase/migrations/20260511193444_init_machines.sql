-- ==============================================
-- Layer 2: machines table
-- ==============================================
-- Read-only listings catalog. RLS lets all authenticated users see active
-- machines, plus owners see their own (any status). Owner-CRUD policies
-- already in place for L4 (create/edit) — only the read path is exercised
-- in L2.

create type machine_condition as enum ('excellent', 'good', 'fair', 'needs_service');
create type machine_status as enum ('active', 'paused', 'archived');

create table machines (
  id                            uuid primary key default gen_random_uuid(),
  owner_id                      uuid not null references profiles(id) on delete cascade,
  -- Denormalized owner fields for fast list rendering (no join in feed query).
  owner_name                    text not null,
  owner_phone                   text,
  owner_village                 text not null,
  -- Categorization
  category                      text not null references categories(id),
  brand                         text not null,
  model                         text not null,
  year_of_purchase              int  not null,
  horsepower                    int,
  -- Listing copy (Kannada filled by L6 AI; default empty string keeps NOT NULL clean).
  title                         text not null,
  description_en                text not null default '',
  description_kn                text not null default '',
  features                      text[] not null default '{}',
  -- Media (real upload lands in L4; arrays empty until then).
  image_urls                    text[] not null default '{}',
  primary_image_url             text,
  -- Pricing in PAISE (1 INR = 100 paise) — never floats per CLAUDE.md.
  hourly_rate_paise             int  not null,
  daily_rate_paise              int  not null,
  minimum_hours                 int  not null default 2,
  -- Location + geohash (precision-6 cells, ~1.2km, computed client-side).
  location_lat                  numeric(9,6) not null,
  location_lng                  numeric(9,6) not null,
  village                       text not null,
  district                      text not null,
  geohash                       text not null,
  -- Health + AI condition report (filled by L6).
  last_service_date             timestamptz,
  condition                     machine_condition not null default 'good',
  condition_report_summary      text,
  condition_report_issues       text[],
  condition_report_image_url    text,
  condition_report_generated_at timestamptz,
  -- Lifecycle
  status                        machine_status not null default 'active',
  -- L5 broadcast column. Defaults true; flips on accepted booking covering now().
  is_currently_available        boolean not null default true,
  -- Denormalized aggregates (kept warm by booking edge functions in L3+).
  total_bookings                int not null default 0,
  total_earnings_paise          bigint not null default 0,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now()
);

-- Why: reuses L1's set_updated_at() function (search_path locked down per
-- migration 20260509090545).
create trigger machines_updated_at
  before update on machines
  for each row execute function set_updated_at();

-- Indexes match the three primary query shapes:
--   feed:     where status = 'active' [and category = ?] order by created_at desc
--   owner:    where owner_id = ? and status = ? order by created_at desc
--   geohash:  where geohash like '...%' (proximity prefix search; L2 uses for sorting)
create index idx_machines_status_category_created
  on machines (status, category, created_at desc);
create index idx_machines_owner_status_created
  on machines (owner_id, status, created_at desc);
create index idx_machines_geohash on machines (geohash);

alter table machines enable row level security;

-- Read: authed users see active machines OR their own (any status).
create policy machines_select_active on machines for select to authenticated
  using (status = 'active' or owner_id = auth.uid());

-- Write: owner-CRUD on own rows. Used by L4 (create/edit/delete from app).
-- Edge functions in L3+ go through service role and bypass RLS.
create policy machines_insert_own on machines for insert to authenticated
  with check (owner_id = auth.uid());
create policy machines_update_own on machines for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy machines_delete_own on machines for delete to authenticated
  using (owner_id = auth.uid());
