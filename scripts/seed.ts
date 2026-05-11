/**
 * @file seed.ts — populate the machines table with demo data.
 * @module scripts
 *
 * Idempotent. Run via `npm run seed`. Requires `SUPABASE_SERVICE_ROLE_KEY`
 * (admin) + `EXPO_PUBLIC_SUPABASE_URL` in the local environment — never
 * bundled with the client. Uses the service-role client to bypass RLS for
 * insert/delete on behalf of the demo owner.
 *
 * Steps:
 *   1. Find or create the `owner@demo.com` auth user.
 *   2. Upsert their profile row (role=owner, Mandya district).
 *   3. Wipe existing machines for that owner (clean slate every run).
 *   4. Insert 10 machines across all 5 categories with realistic
 *      Mandya-area lat/lng (small spread around the town centre).
 *
 * Re-running the script is safe: same owner, same wipe + reseed pattern.
 */
import { createClient } from '@supabase/supabase-js';
// Why: Node 20 has no native WebSocket, but Supabase v2's createClient
// initializes a RealtimeClient as a side effect that needs one. Pass `ws`
// as the transport so the constructor doesn't throw — we don't actually
// use realtime in the seed script. Node 22+ ships native WebSocket and
// won't need this; safe to remove then.
import WebSocket from 'ws';

import { encodeGeohash } from '../src/lib/geohash';
import { rupeesToPaise } from '../src/lib/money';
import type {
  MachineCategory,
  MachineCondition,
  MachineInsert,
} from '../src/types/database';

// ─── Env validation ───────────────────────────────────────────────────

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  throw new Error('seed: EXPO_PUBLIC_SUPABASE_URL is missing');
}
if (!SERVICE_ROLE_KEY) {
  throw new Error(
    'seed: SUPABASE_SERVICE_ROLE_KEY is missing. Set it in your shell before running. Never commit it.',
  );
}

// Service-role client — bypasses RLS. Never expose this on the client.
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: {
    transport: WebSocket as unknown as typeof globalThis.WebSocket,
  },
});

// ─── Demo owner constants ─────────────────────────────────────────────

const DEMO_OWNER_EMAIL = 'owner@demo.com';
const DEMO_OWNER_PASSWORD = 'demo1234';
const DEMO_OWNER_NAME = 'Ravi Kumar';
const DEMO_OWNER_PHONE = '+91 98000 00000';
const DEMO_OWNER_VILLAGE = 'Maddur';
const DEMO_OWNER_DISTRICT = 'Mandya';
const DEMO_OWNER_STATE = 'Karnataka';

// Centre of Mandya district. Each seeded machine is offset by a small
// random delta so the discover feed shows varied distances.
const MANDYA_LAT = 12.5218;
const MANDYA_LNG = 76.8951;
const SPREAD_DEG = 0.05;

// ─── Demo machines ────────────────────────────────────────────────────

interface SeedMachineInput {
  category: MachineCategory;
  brand: string;
  model: string;
  year: number;
  hp?: number;
  title: string;
  descriptionEn: string;
  features: string[];
  hourlyRupees: number;
  dailyRupees: number;
  minimumHours: number;
  village: string;
  condition: MachineCondition;
}

const SEED_MACHINES: SeedMachineInput[] = [
  {
    category: 'tractor',
    brand: 'Mahindra',
    model: '575 DI XP Plus',
    year: 2022,
    hp: 47,
    title: 'Mahindra 575 DI — well-maintained',
    descriptionEn:
      'Reliable 47 HP tractor, ideal for ploughing 2–3 acre paddy or sugarcane fields. Recently serviced; comes with cultivator and rotavator attachments on request.',
    features: ['Power steering', 'Oil-immersed brakes', 'PTO 540 RPM'],
    hourlyRupees: 450,
    dailyRupees: 3500,
    minimumHours: 2,
    village: 'Maddur',
    condition: 'excellent',
  },
  {
    category: 'tractor',
    brand: 'Sonalika',
    model: 'DI 745 III',
    year: 2021,
    hp: 50,
    title: 'Sonalika DI 745 — 50 HP workhorse',
    descriptionEn:
      'Sturdy 50 HP tractor for medium-large farms. Good fuel economy, comfortable operator seat, and ample lifting capacity for trolleys.',
    features: ['Dual clutch', 'ADDC hydraulics', 'Heavy-duty axle'],
    hourlyRupees: 480,
    dailyRupees: 3700,
    minimumHours: 2,
    village: 'Srirangapatna',
    condition: 'good',
  },
  {
    category: 'tractor',
    brand: 'John Deere',
    model: '5042D',
    year: 2023,
    hp: 42,
    title: 'John Deere 5042D — newer, low-hour',
    descriptionEn:
      'Almost new tractor under 200 hours of use. Excellent for orchards and inter-row work. Returns easily on tight headlands.',
    features: ['Collar-shift transmission', '8F+4R gears', 'Dry-disc brakes'],
    hourlyRupees: 550,
    dailyRupees: 4200,
    minimumHours: 2,
    village: 'Mandya',
    condition: 'excellent',
  },
  {
    category: 'harvester',
    brand: 'New Holland',
    model: 'TC5.30',
    year: 2020,
    hp: 76,
    title: 'New Holland TC5.30 combine harvester',
    descriptionEn:
      'Self-propelled combine harvester for paddy and ragi. Operator + helper included for the hire. Booking at least one full day in advance is recommended during harvest season.',
    features: ['Track + wheel option', 'Grain tank 2300 L', 'Self-leveling sieves'],
    hourlyRupees: 1800,
    dailyRupees: 14000,
    minimumHours: 4,
    village: 'Pandavapura',
    condition: 'good',
  },
  {
    category: 'harvester',
    brand: 'Kartar',
    model: '4000 Track',
    year: 2022,
    hp: 76,
    title: 'Kartar 4000 — track combine for wet fields',
    descriptionEn:
      'Track-type combine harvester ideal for waterlogged paddy fields. Smooth on slush; minimal soil compaction. Operator included.',
    features: ['Rubber tracks', '76 HP engine', 'Side discharge'],
    hourlyRupees: 2000,
    dailyRupees: 16000,
    minimumHours: 4,
    village: 'Krishnarajpet',
    condition: 'excellent',
  },
  {
    category: 'sprayer',
    brand: 'Aspee',
    model: 'AB-15 Power Sprayer',
    year: 2023,
    hp: 5,
    title: 'Aspee AB-15 power sprayer',
    descriptionEn:
      'Engine-driven knapsack sprayer for pesticides and fertilisers. Ideal for 2–4 acre coverage per day. Operator can be arranged on request.',
    features: ['15 L tank', '5 HP engine', '4-stroke petrol'],
    hourlyRupees: 200,
    dailyRupees: 1500,
    minimumHours: 1,
    village: 'Maddur',
    condition: 'good',
  },
  {
    category: 'sprayer',
    brand: 'Mahindra',
    model: 'Boom Sprayer 600 L',
    year: 2022,
    hp: 0,
    title: 'Tractor-mounted 600 L boom sprayer',
    descriptionEn:
      'PTO-driven 600 litre boom sprayer that mounts on a 35+ HP tractor. Covers 8–10 acres per fill. Tractor not included — bring your own or pair with a tractor listing.',
    features: ['600 L tank', '12 m boom', 'PTO driven'],
    hourlyRupees: 250,
    dailyRupees: 1900,
    minimumHours: 1,
    village: 'Mandya',
    condition: 'good',
  },
  {
    category: 'tiller',
    brand: 'Honda',
    model: 'F300',
    year: 2023,
    hp: 5,
    title: 'Honda F300 power tiller',
    descriptionEn:
      'Compact petrol-powered tiller for kitchen gardens and small plots. Lightweight, easy to operate. Tines included.',
    features: ['5 HP engine', 'Adjustable depth', '4-stroke petrol'],
    hourlyRupees: 220,
    dailyRupees: 1700,
    minimumHours: 2,
    village: 'Mandya',
    condition: 'excellent',
  },
  {
    category: 'tiller',
    brand: 'Kubota',
    model: 'PEM 140 DI',
    year: 2021,
    hp: 14,
    title: 'Kubota PEM 140 — diesel power tiller',
    descriptionEn:
      'Heavy-duty 14 HP diesel power tiller for 1–3 acre fields. Better mud handling than petrol units. Comes with rotary attachment.',
    features: ['14 HP diesel', 'Rotary tilling', 'Reverse gear'],
    hourlyRupees: 320,
    dailyRupees: 2400,
    minimumHours: 2,
    village: 'Pandavapura',
    condition: 'good',
  },
  {
    category: 'other',
    brand: 'Lemken',
    model: 'Solitair 9',
    year: 2022,
    hp: 0,
    title: 'Lemken Solitair 9 — pneumatic seed drill',
    descriptionEn:
      'Pneumatic seed drill that mounts on a 50+ HP tractor. Excellent for sowing wheat, ragi, and millets in straight rows. Tractor not included.',
    features: ['Pneumatic metering', '3 m working width', 'PTO driven'],
    hourlyRupees: 350,
    dailyRupees: 2700,
    minimumHours: 2,
    village: 'Srirangapatna',
    condition: 'excellent',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────

function jitter(base: number, spread: number): number {
  // Deterministic-feeling spread around a centre point; uses Math.random
  // because seed scripts don't need cryptographic randomness.
  return base + (Math.random() * 2 - 1) * spread;
}

async function findOrCreateOwner(): Promise<string> {
  // The admin listUsers API is paged; for demo data, page 1 is plenty.
  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (error) {
    console.log(`[seed] listUsers failed: ${error.message}`);
    throw error;
  }
  const existing = data.users.find((u) => u.email === DEMO_OWNER_EMAIL);
  if (existing) {
    console.log(`[seed] reusing existing owner ${existing.id}`);
    return existing.id;
  }
  const created = await supabase.auth.admin.createUser({
    email: DEMO_OWNER_EMAIL,
    password: DEMO_OWNER_PASSWORD,
    email_confirm: true,
  });
  if (created.error || !created.data.user) {
    console.log(`[seed] createUser failed: ${created.error?.message}`);
    throw created.error ?? new Error('createUser returned no user');
  }
  console.log(`[seed] created demo owner ${created.data.user.id}`);
  return created.data.user.id;
}

async function upsertOwnerProfile(userId: string): Promise<void> {
  const { error } = await supabase.from('profiles').upsert(
    {
      id: userId,
      display_name: DEMO_OWNER_NAME,
      phone_number: DEMO_OWNER_PHONE,
      role: 'owner',
      village: DEMO_OWNER_VILLAGE,
      district: DEMO_OWNER_DISTRICT,
      state: DEMO_OWNER_STATE,
      preferred_language: 'en',
    },
    { onConflict: 'id' },
  );
  if (error) {
    console.log(`[seed] upsert profile failed: ${error.message}`);
    throw error;
  }
  console.log('[seed] owner profile upserted');
}

async function wipeExistingMachines(ownerId: string): Promise<void> {
  const { error, count } = await supabase
    .from('machines')
    .delete({ count: 'exact' })
    .eq('owner_id', ownerId);
  if (error) {
    console.log(`[seed] wipe failed: ${error.message}`);
    throw error;
  }
  console.log(`[seed] wiped ${count ?? 0} existing machines`);
}

async function insertSeedMachines(ownerId: string): Promise<void> {
  const rows: MachineInsert[] = SEED_MACHINES.map((m) => {
    const lat = jitter(MANDYA_LAT, SPREAD_DEG);
    const lng = jitter(MANDYA_LNG, SPREAD_DEG);
    return {
      owner_id: ownerId,
      owner_name: DEMO_OWNER_NAME,
      owner_phone: DEMO_OWNER_PHONE,
      owner_village: DEMO_OWNER_VILLAGE,
      category: m.category,
      brand: m.brand,
      model: m.model,
      year_of_purchase: m.year,
      horsepower: m.hp ?? null,
      title: m.title,
      description_en: m.descriptionEn,
      description_kn: '',
      features: m.features,
      image_urls: [],
      primary_image_url: null,
      hourly_rate_paise: rupeesToPaise(m.hourlyRupees),
      daily_rate_paise: rupeesToPaise(m.dailyRupees),
      minimum_hours: m.minimumHours,
      location_lat: lat,
      location_lng: lng,
      village: m.village,
      district: DEMO_OWNER_DISTRICT,
      geohash: encodeGeohash(lat, lng),
      condition: m.condition,
      status: 'active',
      is_currently_available: true,
    };
  });
  const { error } = await supabase.from('machines').insert(rows);
  if (error) {
    console.log(`[seed] insert failed: ${error.message}`);
    throw error;
  }
  console.log(`[seed] inserted ${rows.length} machines`);
}

// ─── Main ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('[seed] starting');
  const ownerId = await findOrCreateOwner();
  await upsertOwnerProfile(ownerId);
  await wipeExistingMachines(ownerId);
  await insertSeedMachines(ownerId);
  console.log('[seed] done');
}

void main().catch((err: unknown) => {
  console.log(`[seed] fatal: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
