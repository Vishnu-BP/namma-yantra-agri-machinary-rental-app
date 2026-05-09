
# LAYER 0 — Project skeleton

**Goal:** A blank Expo app that runs on Android, configured with all our tooling, with Supabase initialized and a connection verified.

**Why this layer exists:** Get all environment setup pain done at once. By the end of this layer, every infrastructure decision is locked in and we never touch it again.

## Prerequisites
- Node.js 20+ installed
- Android Studio with an emulator OR physical Android device with Expo Go
- Supabase account (free tier)
- Groq account (for AI keys later, not used yet)

## Deliverables

### 0.1 Initialize the Expo project

```bash
npx create-expo-app@latest namma-yantra --template blank-typescript
cd namma-yantra
```

### 0.2 Install all dependencies

Install in this order to catch peer dep errors early:

```bash
# Routing
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar

# Native modules
npx expo install expo-location expo-image-picker expo-image-manipulator expo-notifications expo-secure-store expo-image

# State + data
npm install zustand @tanstack/react-query

# Forms
npm install react-hook-form zod @hookform/resolvers

# Styling
npm install nativewind
npm install -D tailwindcss@3.3.2

# UI utilities
npm install lucide-react-native react-native-svg
npx expo install react-native-maps react-native-calendars

# i18n
npm install i18next react-i18next

# Supabase
npm install @supabase/supabase-js
npx expo install @react-native-async-storage/async-storage

# Utils
npm install date-fns
```

### 0.3 Configure expo-router

Update `package.json`:

```json
{
  "main": "expo-router/entry"
}
```

Update `app.json`:

```json
{
  "expo": {
    "name": "Namma-Yantra Share",
    "slug": "namma-yantra",
    "scheme": "nammayantra",
    "version": "0.1.0",
    "orientation": "portrait",
    "userInterfaceStyle": "light",
    "android": {
      "package": "com.vishnu.nammayantra",
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#FAF6ED"
      },
      "permissions": ["ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION", "CAMERA", "READ_EXTERNAL_STORAGE"]
    },
    "plugins": [
      "expo-router",
      "expo-location",
      "expo-image-picker",
      "expo-notifications"
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

### 0.4 Configure NativeWind

Create `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#B8862C', dark: '#8C6620' },
        accent: '#2D5F3F',
        bg: '#FAF6ED',
        surface: '#FFFFFF',
        ink: { DEFAULT: '#1A1A1A', soft: '#4A4A4A', mute: '#7A7A7A' },
        border: '#E8DFC9',
        avail: '#3CB371',
        busy: '#9E9E9E',
        pending: '#C8A33C',
        error: '#A83232'
      },
      fontFamily: {
        sans: ['Inter'],
        serif: ['Cormorant Garamond'],
        mono: ['JetBrains Mono']
      }
    }
  },
  plugins: []
};
```

Create `babel.config.js`:

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
  };
};
```

Create `nativewind-env.d.ts` at root:

```typescript
/// <reference types="nativewind/types" />
```

### 0.5 Folder structure

Create these directories (with `.gitkeep` in empty ones):

```
app/                  # expo-router routes
  _layout.tsx
  index.tsx
src/
  components/
    ui/
  hooks/
  lib/
    supabase/
    i18n/
  stores/
  types/
  theme/
supabase/             # Supabase project — created by CLI in step 0.6
  migrations/
  functions/
assets/
  fonts/
scripts/
```

### 0.6 Supabase project setup

1. Go to https://supabase.com/dashboard → create project `namma-yantra`. Pick a strong DB password (save it). Region: Mumbai (`ap-south-1`) for low latency from Bangalore.
2. Once provisioned, go to **Project Settings → API** to get the URL and `anon` public key.
3. Install the Supabase CLI: `npm install -g supabase`
4. Initialize local project linkage:

```bash
supabase login
supabase init
supabase link --project-ref <YOUR_PROJECT_REF>
```

The project ref is in your project URL: `https://<PROJECT_REF>.supabase.co`.

5. In the Supabase dashboard, go to **Authentication → Providers → Email** and **disable email confirmation** (so demo signups work without email verification).

### 0.7 Environment variables

Create `.env`:

```bash
# .env (DO NOT COMMIT)
EXPO_PUBLIC_SUPABASE_URL=https://<YOUR_PROJECT_REF>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<YOUR_ANON_PUBLIC_KEY>
```

Add `.env` to `.gitignore`. Create `.env.example` at the repo root:

```bash
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

### 0.8 Supabase client initialization

Create `src/lib/supabase/client.ts`:

```typescript
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase env vars. Check .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

Install the URL polyfill (required for Supabase on RN):

```bash
npx expo install react-native-url-polyfill
```

### 0.9 Theme constants

Create `src/theme/colors.ts`:

```typescript
export const colors = {
  primary: '#B8862C',
  primaryDark: '#8C6620',
  accent: '#2D5F3F',
  bg: '#FAF6ED',
  surface: '#FFFFFF',
  ink: '#1A1A1A',
  inkSoft: '#4A4A4A',
  inkMute: '#7A7A7A',
  border: '#E8DFC9',
  avail: '#3CB371',
  busy: '#9E9E9E',
  pending: '#C8A33C',
  accepted: '#2D5F3F',
  error: '#A83232',
} as const;
```

### 0.10 Root layout + landing screen

Create `app/_layout.tsx`:

```typescript
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
        </Stack>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
```

Create `app/index.tsx`:

```typescript
import { View, Text } from 'react-native';
import { useEffect, useState } from 'react';
import { supabase } from '../src/lib/supabase/client';

export default function Index() {
  const [status, setStatus] = useState('Connecting...');

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('_health').select('*').limit(1);
      // Note: _health table doesn't exist yet — error is expected.
      // We just want to verify the client can reach Supabase.
      if (error && error.code === '42P01') {
        setStatus('Connected to Supabase ✓');
      } else if (error) {
        setStatus(`Error: ${error.message}`);
      } else {
        setStatus('Connected ✓');
      }
    })();
  }, []);

  return (
    <View className="flex-1 bg-bg items-center justify-center px-6">
      <Text className="text-2xl font-bold text-ink">Namma-Yantra Share</Text>
      <Text className="text-sm text-ink-mute mt-2">Layer 0</Text>
      <Text className="text-xs text-ink-soft mt-4">{status}</Text>
    </View>
  );
}
```

### 0.11 README + CLAUDE.md

Create `README.md` with: project description, setup steps, run commands.

Create `CLAUDE.md` at repo root:

```markdown
# Claude Code Context

## Project: Namma-Yantra Share
A peer-to-peer farm machinery rental marketplace for Karnataka.

## Stack
- React Native + Expo SDK 51+ with TypeScript
- expo-router (file-based routing)
- Supabase (Postgres + Auth + Realtime + Storage + Edge Functions)
- Groq AI via Edge Functions
- NativeWind (Tailwind for RN)
- Zustand + TanStack Query

## Conventions
- All Supabase queries via TanStack Query hooks in `src/hooks/`
- All UI strings via `useTranslation()` — never hardcoded
- Colors from `src/theme/colors.ts` — never hex inline
- Components use NativeWind classes — never inline `style={{}}` for layout
- TypeScript strict mode — no `any`
- All money values stored as integers in PAISE (₹1 = 100 paise) to avoid float math
- Booking time windows use Postgres `tstzrange` type
- Direct supabase-js only; no ORM

## Domain
- Owner: lists machines (tractors, harvesters, etc.)
- Renter: books machines
- Booking lifecycle: pending → accepted/declined → completed/cancelled
- Real-time availability via `is_currently_available` column on machines table
  with Postgres Changes broadcast

## Current build layer
See PRD.md for the layered build plan. Always finish current layer before next.
```

## Acceptance criteria for Layer 0

Run `npx expo start --android` and verify:

- [ ] App launches on Android emulator/device without errors
- [ ] Landing screen shows "Namma-Yantra Share"
- [ ] Status text shows "Connected to Supabase ✓" (proves Supabase client initialized and reached the server)
- [ ] No red error screens
- [ ] No yellow warning boxes (or only known harmless ones)
- [ ] `npm run typecheck` passes (add this script to package.json: `"typecheck": "tsc --noEmit"`)
- [ ] Folder structure matches §0.5
- [ ] Supabase CLI is linked to the project (`supabase status` shows the linked project)

**Commit:** `feat(L0): project skeleton with Supabase initialized`

---
