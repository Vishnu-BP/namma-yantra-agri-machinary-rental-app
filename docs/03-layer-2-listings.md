
# LAYER 2 — Listings (read-only)

**Goal:** Renter can browse a feed of seeded machines. Tap one to see full detail. No booking yet, no real-time, no AI.

**Why this layer:** Get the data layer + read flow working perfectly before adding writes.

## Prerequisites
- Layer 1 complete

## Deliverables

### 2.1 Machines table migration

```bash
supabase migration new init_machines
```

Edit `supabase/migrations/<timestamp>_init_machines.sql`:

```sql
-- ==============================================
-- Layer 2: machines table
-- ==============================================

CREATE TYPE machine_condition AS ENUM ('excellent', 'good', 'fair', 'needs_service');
CREATE TYPE machine_status AS ENUM ('active', 'paused', 'archived');

CREATE TABLE machines (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Denormalized owner info for fast list rendering
  owner_name          TEXT NOT NULL,
  owner_phone         TEXT,
  owner_village       TEXT NOT NULL,

  -- Categorization
  category            TEXT NOT NULL REFERENCES categories(id),
  brand               TEXT NOT NULL,
  model               TEXT NOT NULL,
  year_of_purchase    INT NOT NULL,
  horsepower          INT,

  -- Listing copy
  title               TEXT NOT NULL,
  description_en      TEXT NOT NULL DEFAULT '',
  description_kn      TEXT NOT NULL DEFAULT '',
  features            TEXT[] NOT NULL DEFAULT '{}',

  -- Media
  image_urls          TEXT[] NOT NULL DEFAULT '{}',
  primary_image_url   TEXT,

  -- Pricing (in PAISE — ₹1 = 100 paise)
  hourly_rate_paise   INT NOT NULL,
  daily_rate_paise    INT NOT NULL,
  minimum_hours       INT NOT NULL DEFAULT 2,

  -- Location
  location_lat        NUMERIC(9,6) NOT NULL,
  location_lng        NUMERIC(9,6) NOT NULL,
  village             TEXT NOT NULL,
  district            TEXT NOT NULL,
  geohash             TEXT NOT NULL,

  -- Health
  last_service_date   TIMESTAMPTZ,
  condition           machine_condition NOT NULL DEFAULT 'good',
  condition_report_summary TEXT,
  condition_report_issues  TEXT[],
  condition_report_image_url TEXT,
  condition_report_generated_at TIMESTAMPTZ,

  -- Lifecycle
  status              machine_status NOT NULL DEFAULT 'active',
  is_currently_available BOOLEAN NOT NULL DEFAULT TRUE,

  -- Denormalized aggregates
  total_bookings      INT NOT NULL DEFAULT 0,
  total_earnings_paise BIGINT NOT NULL DEFAULT 0,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER machines_updated_at
  BEFORE UPDATE ON machines
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Indexes for common queries
CREATE INDEX idx_machines_status_category_created
  ON machines (status, category, created_at DESC);
CREATE INDEX idx_machines_owner_status_created
  ON machines (owner_id, status, created_at DESC);
CREATE INDEX idx_machines_geohash ON machines (geohash);

-- RLS
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can see active machines (the public catalog)
CREATE POLICY "machines_select_active" ON machines FOR SELECT
  TO authenticated
  USING (status = 'active' OR owner_id = auth.uid());

-- Only the owner can insert (with their own user id)
CREATE POLICY "machines_insert_own" ON machines FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- Only the owner can update or delete
CREATE POLICY "machines_update_own" ON machines FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "machines_delete_own" ON machines FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());
```

Push: `supabase db push`

### 2.2 Type definitions

Add to `src/types/database.ts`:

```typescript
export type MachineCategory = 'tractor' | 'harvester' | 'sprayer' | 'tiller' | 'other';
export type MachineCondition = 'excellent' | 'good' | 'fair' | 'needs_service';
export type MachineStatus = 'active' | 'paused' | 'archived';

export interface Machine {
  id: string;
  owner_id: string;
  owner_name: string;
  owner_phone: string | null;
  owner_village: string;
  category: MachineCategory;
  brand: string;
  model: string;
  year_of_purchase: number;
  horsepower: number | null;
  title: string;
  description_en: string;
  description_kn: string;
  features: string[];
  image_urls: string[];
  primary_image_url: string | null;
  hourly_rate_paise: number;
  daily_rate_paise: number;
  minimum_hours: number;
  location_lat: number;
  location_lng: number;
  village: string;
  district: string;
  geohash: string;
  last_service_date: string | null;
  condition: MachineCondition;
  condition_report_summary: string | null;
  condition_report_issues: string[] | null;
  condition_report_image_url: string | null;
  condition_report_generated_at: string | null;
  status: MachineStatus;
  is_currently_available: boolean;
  total_bookings: number;
  total_earnings_paise: number;
  created_at: string;
  updated_at: string;
}
```

### 2.3 Money formatting utility

Create `src/lib/money.ts`:

```typescript
// All money values are stored as integer paise (1 rupee = 100 paise)
// to avoid floating-point arithmetic errors.

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function formatPaise(paise: number): string {
  // Format as Indian rupee with grouping: 10,500
  const rupees = paiseToRupees(paise);
  return `₹${rupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}
```

### 2.4 Geohash utility

Since we removed geofire-common, we'll use a tiny inline geohash implementation:

Create `src/lib/geohash.ts`:

```typescript
// Minimal geohash encode for proximity grouping.
// Precision 6 = ~1.2km cells, good for "nearby machines" queries.

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

export function encodeGeohash(lat: number, lng: number, precision = 6): string {
  let minLat = -90, maxLat = 90;
  let minLng = -180, maxLng = 180;
  let bit = 0;
  let ch = 0;
  let geohash = '';
  let evenBit = true;

  while (geohash.length < precision) {
    if (evenBit) {
      const midLng = (minLng + maxLng) / 2;
      if (lng >= midLng) { ch |= 1 << (4 - bit); minLng = midLng; }
      else { maxLng = midLng; }
    } else {
      const midLat = (minLat + maxLat) / 2;
      if (lat >= midLat) { ch |= 1 << (4 - bit); minLat = midLat; }
      else { maxLat = midLat; }
    }
    evenBit = !evenBit;
    if (++bit === 5) {
      geohash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }
  return geohash;
}
```

### 2.5 Distance utility

Create `src/lib/distance.ts`:

```typescript
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
```

### 2.6 Machines query layer

Create `src/lib/supabase/machines.ts`:

```typescript
import { supabase } from './client';
import { Machine, MachineCategory } from '../../types/database';

export async function fetchMachines(filters?: {
  category?: MachineCategory;
  limit?: number;
}): Promise<Machine[]> {
  let query = supabase
    .from('machines')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (filters?.category) query = query.eq('category', filters.category);
  if (filters?.limit) query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function fetchMachineById(id: string): Promise<Machine | null> {
  const { data, error } = await supabase
    .from('machines')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchMachinesForOwner(ownerId: string): Promise<Machine[]> {
  const { data, error } = await supabase
    .from('machines')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
```

### 2.7 TanStack Query hooks

Create `src/hooks/useMachines.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { fetchMachines, fetchMachineById, fetchMachinesForOwner } from '../lib/supabase/machines';
import { MachineCategory } from '../types/database';

export function useMachines(filters?: { category?: MachineCategory }) {
  return useQuery({
    queryKey: ['machines', filters],
    queryFn: () => fetchMachines(filters),
  });
}

export function useMachine(id: string | undefined) {
  return useQuery({
    queryKey: ['machine', id],
    queryFn: () => fetchMachineById(id!),
    enabled: !!id,
  });
}

export function useOwnerMachines(ownerId: string | undefined) {
  return useQuery({
    queryKey: ['machines', 'owner', ownerId],
    queryFn: () => fetchMachinesForOwner(ownerId!),
    enabled: !!ownerId,
  });
}
```

### 2.8 Location store + hook

Create `src/stores/locationStore.ts`:

```typescript
import { create } from 'zustand';

interface LocationState {
  coords: { lat: number; lng: number } | null;
  permissionStatus: 'unknown' | 'granted' | 'denied';
  setCoords: (coords: { lat: number; lng: number }) => void;
  setPermission: (status: 'granted' | 'denied') => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  coords: null,
  permissionStatus: 'unknown',
  setCoords: (coords) => set({ coords }),
  setPermission: (permissionStatus) => set({ permissionStatus }),
}));
```

Create `src/hooks/useLocation.ts`:

```typescript
import { useEffect } from 'react';
import * as Location from 'expo-location';
import { useLocationStore } from '../stores/locationStore';

export function useLocationInit() {
  const { setCoords, setPermission } = useLocationStore();

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermission('denied');
        // Default fallback to Mandya center for demo
        setCoords({ lat: 12.5218, lng: 76.8951 });
        return;
      }
      setPermission('granted');
      const loc = await Location.getCurrentPositionAsync({});
      setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    })();
  }, []);
}
```

### 2.9 UI primitives

Create these in `src/components/ui/`:

**Card.tsx** — Pressable wrapper, base styling:

```typescript
import { Pressable, PressableProps, View } from 'react-native';

export function Card({ children, onPress, className = '', ...rest }: PressableProps & { className?: string }) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        className={`bg-white rounded-2xl p-4 mb-3 border border-border/40 ${className}`}
        {...rest}
      >
        {children}
      </Pressable>
    );
  }
  return <View className={`bg-white rounded-2xl p-4 mb-3 border border-border/40 ${className}`}>{children}</View>;
}
```

**Badge.tsx** — Variant prop ('avail' | 'busy' | 'pending' | 'accepted' | 'declined'), outputs colored pill with optional dot/icon.

**LoadingState.tsx** — Centered ActivityIndicator with optional label.

**EmptyState.tsx** — Icon + title + subtitle, centered.

### 2.10 Machine card component

Create `src/components/machine/MachineCard.tsx`:

Props: `machine: Machine, userLocation?: {lat, lng}, onPress: () => void`

Renders:
- Row layout inside Card
- Left: 80x80 image (use `expo-image` with `primary_image_url`, fallback to category icon if null)
- Right: title, brand+model, distance (if userLocation), `formatPaise(hourly_rate_paise)`, static availability badge for now (the live AvailabilityBadge comes in L5)

### 2.11 Renter discover screen + tab layout

Update `app/(renter)/_layout.tsx` to a tab layout:

```typescript
import { Tabs } from 'expo-router';
import { Search, Calendar, Sparkles, User } from 'lucide-react-native';
import { colors } from '../../src/theme/colors';

export default function RenterLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inkMute,
      }}
    >
      <Tabs.Screen name="discover" options={{ title: 'Discover', tabBarIcon: ({ color }) => <Search color={color} size={22} /> }} />
      <Tabs.Screen name="bookings" options={{ title: 'Bookings', tabBarIcon: ({ color }) => <Calendar color={color} size={22} /> }} />
      <Tabs.Screen name="ai-helper" options={{ title: 'AI Helper', tabBarIcon: ({ color }) => <Sparkles color={color} size={22} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => <User color={color} size={22} /> }} />
      <Tabs.Screen name="home" options={{ href: null }} />
      <Tabs.Screen name="machine/[id]" options={{ href: null }} />
    </Tabs>
  );
}
```

Replace `app/(renter)/home.tsx` with `discover.tsx`. The Discover screen shows:
- Header with "Discover" + location subtitle
- Filter pill row (category filter)
- FlatList of MachineCards
- Empty state if no results
- Loading state while fetching
- Pull-to-refresh
- On card press → `router.push(\`/(renter)/machine/${id}\`)`

Create stub screens for `bookings.tsx`, `ai-helper.tsx`, `profile.tsx`.

### 2.12 Machine detail screen

Create `app/(renter)/machine/[id].tsx`:
- Hero block (decorative for now — colored gradient with category icon)
- Back button
- Title, meta, static availability badge
- About section (description, with Kannada toggle later)
- Pricing section (hourly + daily cells)
- Owner section
- "Request rental" button (disabled — toast "Coming in Layer 3")

### 2.13 Seed script

Create `scripts/seed.ts`:

```typescript
// Run: npx tsx scripts/seed.ts
// Requires SERVICE_ROLE_KEY in process env (DO NOT commit)

import { createClient } from '@supabase/supabase-js';
import { encodeGeohash } from '../src/lib/geohash';

const url = process.env.SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

const DEMO_OWNER_EMAIL = 'owner@demo.com';
const DEMO_OWNER_PASSWORD = 'demo1234';

async function ensureDemoOwner() {
  // Try to sign in first, create if doesn't exist
  let userId: string;
  const { data: signInData } = await supabase.auth.admin.listUsers();
  const existing = signInData.users.find((u) => u.email === DEMO_OWNER_EMAIL);
  if (existing) {
    userId = existing.id;
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: DEMO_OWNER_EMAIL,
      password: DEMO_OWNER_PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
    userId = data.user.id;
    // Create profile
    await supabase.from('profiles').insert({
      id: userId,
      display_name: 'Suresh Kumar',
      role: 'owner',
      village: 'Hosaholalu',
      district: 'Mandya',
      phone_number: '+919876543210',
    });
  }
  return userId;
}

const machines = (ownerId: string, ownerName: string) => [
  {
    owner_id: ownerId,
    owner_name: ownerName,
    owner_phone: '+919876543210',
    owner_village: 'Hosaholalu',
    category: 'tractor',
    brand: 'Mahindra',
    model: '575 DI',
    year_of_purchase: 2020,
    horsepower: 47,
    title: 'Mahindra 575 DI · 47 HP with hydraulics',
    description_en: 'Reliable 47 HP tractor, 2020 model. Power steering and dual hydraulics make it suitable for ploughing 1-3 acre plots.',
    description_kn: 'ವಿಶ್ವಾಸಾರ್ಹ 47 HP ಟ್ರ್ಯಾಕ್ಟರ್, 2020 ಮಾದರಿ.',
    features: ['Power steering', 'Dual hydraulics'],
    image_urls: ['https://placehold.co/600x400/B8862C/white?text=Mahindra+575'],
    primary_image_url: 'https://placehold.co/600x400/B8862C/white?text=Mahindra+575',
    hourly_rate_paise: 50000,   // ₹500
    daily_rate_paise: 350000,   // ₹3,500
    minimum_hours: 2,
    location_lat: 12.5218, location_lng: 76.8951,
    village: 'Hosaholalu', district: 'Mandya',
    geohash: encodeGeohash(12.5218, 76.8951),
    condition: 'good',
    status: 'active',
    is_currently_available: true,
  },
  // ... add 7 more diverse machines: harvester, sprayer, tiller, more tractors at varied locations near Mandya
];

async function seed() {
  const ownerId = await ensureDemoOwner();
  // Get owner display name
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', ownerId)
    .single();

  for (const m of machines(ownerId, profile!.display_name)) {
    const { error } = await supabase.from('machines').insert(m);
    if (error) {
      console.error(`Failed to seed ${m.title}:`, error);
    } else {
      console.log(`Seeded: ${m.title}`);
    }
  }
}

seed().then(() => process.exit(0));
```

Add a script to package.json: `"seed": "tsx scripts/seed.ts"`

Run: `SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> npm run seed`

(The service role key is found in Supabase dashboard → Project Settings → API. **Never put it in `.env` that's bundled with the client.**)

## Acceptance criteria for Layer 2

- [ ] Migration `init_machines` applied successfully (verify in dashboard SQL editor)
- [ ] Seed script populates 8+ machines across categories
- [ ] Renter discover screen shows the seeded machines
- [ ] Each card shows: image (placeholder), title, brand+model, distance, hourly rate, availability badge
- [ ] Tapping a category pill filters the list
- [ ] Tapping a card navigates to detail screen
- [ ] Detail screen shows full info correctly
- [ ] Pull-to-refresh works on the discover list
- [ ] Loading state shows while fetching
- [ ] Empty state shows when filter returns nothing
- [ ] Distance calculation is correct (verify against a known coordinate)
- [ ] Bottom tab bar works (other tabs show "Coming soon")
- [ ] Try opening Discover as the demo owner account — should also see the active machines
- [ ] No TypeScript errors

**Commit:** `feat(L2): read-only listings feed and detail screen`

---
