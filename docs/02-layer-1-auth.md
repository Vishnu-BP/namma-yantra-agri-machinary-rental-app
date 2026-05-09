
# LAYER 1 — Auth + role selection

**Goal:** Users can sign up, log in, pick a role (renter or owner), and land on a role-specific home screen.

**Why this layer:** Auth is the gate to everything. Get it solid now so we never debug it again.

## Prerequisites
- Layer 0 complete and committed

## Deliverables

### 1.1 Database schema for profiles

Create the first migration. Run:

```bash
supabase migration new init_profiles
```

This creates a file `supabase/migrations/<timestamp>_init_profiles.sql`. Replace its contents with:

```sql
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
```

Push the migration:

```bash
supabase db push
```

Verify in the dashboard that `profiles` and `categories` tables exist with correct columns and the RLS policies are active.

### 1.2 Type definitions

Create `src/types/database.ts`:

```typescript
// Manually authored types matching the Postgres schema.
// (We could generate these via `supabase gen types typescript` but
// keeping them hand-written for visibility during early development.)

export type UserRole = 'owner' | 'renter' | 'both';
export type Language = 'en' | 'kn';

export interface Profile {
  id: string;
  display_name: string;
  phone_number: string | null;
  role: UserRole;
  village: string;
  district: string;
  state: string;
  preferred_language: Language;
  home_lat: number | null;
  home_lng: number | null;
  expo_push_token: string | null;
  owner_stats: {
    totalListings: number;
    activeListings: number;
    totalEarnings: number;
    completedRentals: number;
  };
  renter_profile: {
    primaryCrop?: string;
    landAcres?: number;
    fieldLat?: number;
    fieldLng?: number;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name_en: string;
  name_kn: string;
  icon_asset: string;
  default_minimum_hours: number;
  avg_hourly_low: number;
  avg_hourly_high: number;
}
```

### 1.3 Auth Zustand store

Create `src/stores/authStore.ts`:

```typescript
import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { Profile } from '../types/database';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  profile: null,
  isLoading: true,
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
}));
```

### 1.4 Auth service

Create `src/lib/supabase/auth.ts`:

```typescript
import { supabase } from './client';
import { Profile, UserRole } from '../../types/database';

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createProfile(input: {
  userId: string;
  displayName: string;
  role: UserRole;
  village: string;
  district: string;
  primaryCrop?: string;
  landAcres?: number;
}): Promise<Profile> {
  const renterProfile =
    input.role === 'renter' || input.role === 'both'
      ? { primaryCrop: input.primaryCrop, landAcres: input.landAcres }
      : null;

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: input.userId,
      display_name: input.displayName,
      role: input.role,
      village: input.village,
      district: input.district,
      renter_profile: renterProfile,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}
```

### 1.5 Auth listener hook

Create `src/hooks/useAuth.ts`:

```typescript
import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase/client';
import { getProfile } from '../lib/supabase/auth';

export function useAuthListener() {
  const setSession = useAuthStore((s) => s.setSession);
  const setProfile = useAuthStore((s) => s.setProfile);
  const setLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    setLoading(true);

    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        const profile = await getProfile(session.user.id);
        setProfile(profile);
      } else {
        setProfile(null);
      }
    });

    // Subscribe to changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        const profile = await getProfile(session.user.id);
        setProfile(profile);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);
}
```

### 1.6 Route groups

Restructure `app/`:

```
app/
  _layout.tsx         # mounts useAuthListener, providers
  index.tsx           # splash → routes based on auth/profile
  (auth)/
    _layout.tsx
    login.tsx
    signup.tsx
    role-select.tsx
  (renter)/
    _layout.tsx
    home.tsx          # placeholder for now
  (owner)/
    _layout.tsx
    home.tsx          # placeholder for now
```

### 1.7 Routing logic

In `app/index.tsx`:

```typescript
import { Redirect } from 'expo-router';
import { useAuthListener } from '../src/hooks/useAuth';
import { useAuthStore } from '../src/stores/authStore';
import { View, ActivityIndicator } from 'react-native';
import { colors } from '../src/theme/colors';

export default function Index() {
  useAuthListener();
  const { session, profile, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  // Not signed in → login
  if (!session) return <Redirect href="/(auth)/login" />;

  // Signed in but no profile → role select
  if (!profile) return <Redirect href="/(auth)/role-select" />;

  // Profile complete → role-based home
  if (profile.role === 'owner') return <Redirect href="/(owner)/home" />;
  return <Redirect href="/(renter)/home" />;
}
```

### 1.8 Login + signup screens

Create `app/(auth)/_layout.tsx`:

```typescript
import { Stack } from 'expo-router';
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

Create `app/(auth)/login.tsx`:
- react-hook-form with email + password fields
- Zod schema validating email format and password min length 6
- "Sign in" button calling `signIn()`
- On success, useAuthListener picks up the new session and routes appropriately
- On error, show error message inline
- Link at the bottom: "Don't have an account? Sign up"

Create `app/(auth)/signup.tsx`:
- Same shape as login but calls `signUp()`
- After signup, the auth listener handles routing to role-select

### 1.9 Role select screen

Create `app/(auth)/role-select.tsx`:
- Two large pressable cards: "I rent out machines" / "I rent machines from others"
- Below: text inputs for displayName, village
- District as a dropdown (use a static array of Karnataka districts: Bangalore Rural, Bangalore Urban, Mandya, Mysuru, Hassan, Tumkur, Kolar, Chikkaballapur, Ramanagara, Chamarajanagar, Kodagu, Chikmagalur, Davangere, Shivamogga, Udupi, Dakshina Kannada, Uttara Kannada, Belagavi, Bagalkote, Bidar, Vijayapura, Kalaburagi, Yadgir, Raichur, Koppal, Ballari, Vijayanagara, Haveri, Dharwad, Gadag)
- For renter role: primary crop chips (Paddy, Sugarcane, Areca, Coconut, Other) + land acres number input
- On submit: call `createProfile()` with all fields
- After creation, refresh profile in store (re-fetch via getProfile) and `router.replace('/')`

### 1.10 Home placeholders

`app/(renter)/_layout.tsx`:

```typescript
import { Stack } from 'expo-router';
export default function RenterLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

`app/(renter)/home.tsx`:

```typescript
import { View, Text, Pressable } from 'react-native';
import { signOut } from '../../src/lib/supabase/auth';
import { useAuthStore } from '../../src/stores/authStore';

export default function RenterHome() {
  const profile = useAuthStore((s) => s.profile);
  return (
    <View className="flex-1 bg-bg p-6 justify-center">
      <Text className="text-2xl font-bold text-ink">
        Welcome, {profile?.display_name}
      </Text>
      <Text className="text-sm text-ink-mute mt-2">Renter mode</Text>
      <Text className="text-xs text-ink-mute mt-1">
        {profile?.village}, {profile?.district}
      </Text>
      <Pressable onPress={signOut} className="bg-primary p-3 rounded-lg mt-8">
        <Text className="text-white text-center font-semibold">Sign out</Text>
      </Pressable>
    </View>
  );
}
```

Same shape for owner home but says "Owner mode."

## Acceptance criteria for Layer 1

- [ ] Fresh install → routes to login screen
- [ ] Sign up with email creates Supabase Auth user → routes to role-select
- [ ] Role-select form validates (no empty fields)
- [ ] Submitting role-select creates row in `profiles` table
- [ ] After role-select → routes to correct home (renter or owner)
- [ ] Sign out → returns to login
- [ ] Sign in with same credentials → routes directly to home (skips role-select)
- [ ] Force-quitting and reopening keeps user signed in
- [ ] Profile row in DB has all required fields populated
- [ ] RLS verified: try `SELECT * FROM profiles` from a different user account in the SQL editor — should only return their own row's data when filtered by `id = auth.uid()`
- [ ] No TypeScript errors

**Commit:** `feat(L1): email auth with role selection`

---
