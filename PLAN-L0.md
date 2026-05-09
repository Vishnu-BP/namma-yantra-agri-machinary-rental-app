# Layer 0 — Project skeleton

## Context

First layer of [Namma-Yantra Share](PRD-claude-code.md). Goal: a blank Expo + TypeScript app that **runs on Android, has all tooling locked in, and verifies the Supabase connection** — nothing else. Get every "infrastructure decision" pain done at once so layers 1–7 never touch the scaffolding.

The full 8-layer roadmap lives in [PLAN.md](PLAN.md); this file is the focused execution plan for Layer 0 only. Implement and verify Layer 0 in full before opening a Layer 1 plan.

Today the workspace at `c:/projects/Mindmatrix` contains only `PRD-claude-code.md` and the two plan files. By the end of Layer 0 it will be a runnable Expo project at the root of that folder, with Supabase wired up and a "Connected to Supabase ✓" landing screen.

**User decisions (carried into this layer):**
- Project lives **flat** at `c:/projects/Mindmatrix` (no `namma-yantra/` subdir).
- User creates the Supabase project + email-confirmation toggle manually, then pastes URL + anon key into `.env`. Implementation pauses there until creds exist.

## Pre-flight (one-time, before anything else)

`create-expo-app` refuses non-empty targets, but the directory already contains the markdown docs. Strategy:

1. Move docs out of the project dir: `mv PRD-claude-code.md PLAN.md PLAN-L0.md ../`.
2. From `c:/projects/Mindmatrix`, run `npx create-expo-app@latest . --template blank-typescript`.
3. Move the docs back into the project root.
4. `git init` (workspace is currently not a git repo).
5. Verify Node 20+ (`node -v`); confirm Android emulator or Expo Go available; install the CLIs:
   - `npm install -g supabase`
   - `npm install -g eas-cli` (used in Layer 7, but install now to fail fast on env issues).

## Pause point — Supabase project creation

Stop and wait for the user to provide URL + anon key + project ref. Steps the user does manually:

1. Create Supabase project `namma-yantra` in region `ap-south-1` (Mumbai), strong DB password.
2. **Authentication → Providers → Email** → disable email confirmation (so demo signups work without inbox access).
3. Copy `URL` and `anon` public key from **Project Settings → API**.
4. Project ref is the `<ref>` in `https://<ref>.supabase.co`.

Resume only when those three values are in hand.

## Build steps

### 1. Dependencies (PRD §0.2 — install in this order to surface peer-dep errors early)

```
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
npx expo install @react-native-async-storage/async-storage react-native-url-polyfill
# Utils
npm install date-fns
```

### 2. Project config

- [package.json](package.json): set `"main": "expo-router/entry"`, add `"typecheck": "tsc --noEmit"` script.
- [app.json](app.json) (PRD §0.3): name `Namma-Yantra Share`, slug `namma-yantra`, scheme `nammayantra`, version `0.1.0`, `userInterfaceStyle: light`, Android package `com.vishnu.nammayantra`, adaptive icon, permissions `[ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION, CAMERA, READ_EXTERNAL_STORAGE]`, plugins `[expo-router, expo-location, expo-image-picker, expo-notifications]`, `experiments.typedRoutes: true`.
- [tailwind.config.js](tailwind.config.js) (PRD §0.4): content globs `./app/**` + `./src/**`; brand palette (`primary`, `accent`, `bg`, `surface`, `ink`/`ink.soft`/`ink.mute`, `border`, `avail`, `busy`, `pending`, `error`); fonts `sans: Inter`, `serif: Cormorant Garamond`, `mono: JetBrains Mono`.
- [babel.config.js](babel.config.js): `presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel']`.
- [nativewind-env.d.ts](nativewind-env.d.ts): single line `/// <reference types="nativewind/types" />`.

### 3. Folder skeleton (PRD §0.5)

```
app/
  _layout.tsx
  index.tsx
src/
  components/ui/
  hooks/
  lib/
    supabase/
    i18n/
  stores/
  types/
  theme/
supabase/
  migrations/
  functions/
assets/
  fonts/
scripts/
```

Drop `.gitkeep` in empty leaf dirs so they survive `git add`.

### 4. Env + secrets

- [.env](.env) — `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY` filled in from the pause-point values. **Never committed.**
- [.env.example](.env.example) — same keys, empty values, committed.
- [.gitignore](.gitignore) — confirm `.env` is excluded (Expo's default `.gitignore` usually covers it; verify).

### 5. Supabase client

- [src/lib/supabase/client.ts](src/lib/supabase/client.ts) (PRD §0.8): import `react-native-url-polyfill/auto` + `AsyncStorage`; `createClient(url, key, { auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } })`. Throw at module load if env vars are missing.

### 6. Theme

- [src/theme/colors.ts](src/theme/colors.ts) (PRD §0.9): single `colors` object (`as const`) — every hex in the codebase will come from here once L1+ ships.

### 7. Root layout + landing screen

- [app/_layout.tsx](app/_layout.tsx) (PRD §0.10): `SafeAreaProvider` → `QueryClientProvider` (`staleTime: 60_000`, `retry: 1`) → `StatusBar style="dark"` → `Stack screenOptions={{ headerShown: false }}` with one `Stack.Screen name="index"`.
- [app/index.tsx](app/index.tsx) (PRD §0.10): on mount, call `supabase.from('_health').select('*').limit(1)`. Treat error code `42P01` ("relation does not exist") as success — it proves the client reached the server. Render "Namma-Yantra Share" + "Layer 0" + the connection status string. NativeWind classes (`bg-bg`, `text-ink`, etc.) — no inline styles.

### 8. Project docs

- [README.md](README.md): one-paragraph project description, setup steps (deps install, fill `.env`, `npx expo start --android`, `npm run typecheck`).
- [CLAUDE.md](CLAUDE.md) (PRD §0.11 verbatim): stack summary, conventions (TanStack Query in `src/hooks/`, all strings via `useTranslation()`, colors from `src/theme/colors.ts`, NativeWind for layout, no `any`, money in paise, `tstzrange` for booking windows, no ORM), and a pointer to PRD-claude-code.md for the layered plan.

### 9. Supabase CLI link

After the user provides the project ref:

```
supabase login
supabase init
supabase link --project-ref <YOUR_PROJECT_REF>
```

This creates `supabase/config.toml` and stamps the project link. Verify with `supabase status` (should show the linked project ref).

## Acceptance (PRD §Layer 0)

Run `npx expo start --android` and walk this list:

- [ ] App launches on Android emulator or device with no red error overlay.
- [ ] Landing screen shows "Namma-Yantra Share" + "Layer 0".
- [ ] Status text reads **"Connected to Supabase ✓"** (proves env vars + client + network all work).
- [ ] No new yellow warning boxes (only known-harmless ones tolerated).
- [ ] `npm run typecheck` exits 0.
- [ ] Folder structure matches §3 of this plan.
- [ ] `supabase status` shows the linked project ref.

If any item fails: fix at root cause before moving on. Don't stub past it.

## Commit

`feat(L0): project skeleton with Supabase initialized`

(One commit, end of layer. `.env` must NOT be in the diff — verify with `git status` and `git diff --cached` before committing.)

## What is explicitly NOT in Layer 0

To prevent scope creep into Layer 1+:

- No `profiles` / `categories` / `machines` migrations.
- No auth screens, no Zustand stores.
- No tab navigators, no role-based routing.
- No seed scripts.
- No edge functions or Groq integration.
- No i18n strings — `app/index.tsx` hardcodes English. (The `useTranslation()` hard rule begins at Layer 3 per [PLAN.md](PLAN.md) cross-cutting rules; English-only is acceptable for the L0 health screen.)

These all belong to later layers and the PRD enforces "never skip ahead."

## Critical files (the L0 deliverable list, at a glance)

- [package.json](package.json), [app.json](app.json), [tailwind.config.js](tailwind.config.js), [babel.config.js](babel.config.js), [nativewind-env.d.ts](nativewind-env.d.ts)
- [.env](.env) (uncommitted), [.env.example](.env.example), [.gitignore](.gitignore)
- [src/lib/supabase/client.ts](src/lib/supabase/client.ts), [src/theme/colors.ts](src/theme/colors.ts)
- [app/_layout.tsx](app/_layout.tsx), [app/index.tsx](app/index.tsx)
- [README.md](README.md), [CLAUDE.md](CLAUDE.md)
- [supabase/config.toml](supabase/config.toml) (created by `supabase init`)
