# tasks/todo.md — Namma-Yantra Share

> Active layer + checklist. CLAUDE.md workflow:
> 1. Implement one item at a time.
> 2. Mark `[x]` when done.
> 3. Move completed items into "Completed Work Log" at the bottom — never delete.
> 4. After each item, briefly explain what changed and why (one paragraph in commit body or PR).

## Current layer: **Layer 3 — Booking flow with EXCLUDE constraint**

Spec: [`docs/04-layer-3-booking.md`](../docs/04-layer-3-booking.md).

L3 introduces:
- `bookings` table with `btree_gist` EXCLUDE constraint preventing double-bookings.
- Pure libs: `range.ts` (tstzrange parser), `pricing.ts` (calculateTotal), `booking-conflict.ts` (disabled dates).
- Two Deno edge functions: `create-booking` (server-side pricing + conflict check) and `respond-to-booking` (state machine accept/decline/cancel).
- Query layer `src/integrations/supabase/bookings.ts` + `src/hooks/useBookings.ts`.
- Screens: multi-step `app/(renter)/book/[machineId].tsx`, wired renter Bookings tab, owner Requests tab.
- Owner tab layout (Machines | Requests | Profile).
- "Request rental" CTA enabled on machine detail screen.

### Phase A — DB migration + types

- [ ] Apply `init_bookings` migration via MCP.
- [ ] Mirror SQL to `supabase/migrations/<ts>_init_bookings.sql`.
- [ ] Regenerate `src/types/database.ts` via MCP.
- [ ] Append aliases: `Booking`, `BookingInsert`, `BookingUpdate`, `BookingStatus`, `DurationUnit`.

### Phase B — Pure libs

- [ ] `src/lib/range.ts` — `parseTstzrange`.
- [ ] `src/lib/pricing.ts` — `calculateTotal`.
- [ ] `src/lib/booking-conflict.ts` — `getDisabledDates`.

### Phase C — Edge functions

- [ ] `supabase/functions/create-booking/index.ts`.
- [ ] `supabase/functions/respond-to-booking/index.ts`.
- [ ] Deploy both via `supabase functions deploy`.

### Phase D — Query layer + hooks

- [ ] `src/integrations/supabase/bookings.ts`.
- [ ] Add `bookings` to `src/integrations/supabase/index.ts` barrel.
- [ ] `src/hooks/useBookings.ts`.

### Phase E — Screens

- [ ] `src/components/booking/BookingCard.tsx`.
- [ ] `app/(renter)/book/[machineId].tsx` — 3-step booking flow.
- [ ] `app/(renter)/bookings.tsx` — replace stub with real list.
- [ ] `app/(owner)/requests.tsx` — owner requests tab.
- [ ] `app/(owner)/_layout.tsx` — convert to Tabs (Machines | Requests | Profile).
- [ ] `app/(renter)/machine/[id].tsx` — enable "Request rental" CTA.

### Phase F — Acceptance + commit

- [ ] `npm run seed` (clean slate machines).
- [ ] Book flow end-to-end: renter submits → owner accepts → status reflects in both tabs.
- [ ] Overlapping booking attempt → 409 toast.
- [ ] `npm run typecheck` + `npm run lint` clean.
- [ ] MCP verify EXCLUDE constraint exists.
- [ ] Commit: `feat(L3): booking flow with EXCLUDE constraint conflict prevention`.

---

## Completed Work Log

_Items move here after each layer's commit lands. Don't delete — this is the audit trail._

### Layer 2 — Listings (read-only) — committed

L2 is purely additive to L1. Implements the machines table, discover feed, machine detail screen, and seed script.

**Phase A — DB + types**
- [x] Migration `init_machines` applied via MCP (version `20260511193444`).
- [x] Enums: `machine_condition`, `machine_status`. Table: `machines` (30 cols). 3 indexes. 4 RLS policies.
- [x] Mirrored to `supabase/migrations/20260511193444_init_machines.sql`.
- [x] Types regenerated via MCP → `src/types/database.ts`. Aliases appended: `Machine`, `MachineInsert`, `MachineUpdate`, `MachineCategory`, `MachineCondition`, `MachineStatus`.

**Phase B — Pure libs + integration**
- [x] `src/lib/money.ts` — `rupeesToPaise`, `paiseToRupees`, `formatPaise` (Intl.NumberFormat en-IN).
- [x] `src/lib/geohash.ts` — `encodeGeohash` precision-6 BASE32.
- [x] `src/lib/distance.ts` — `distanceKm` Haversine.
- [x] `src/integrations/supabase/machines.ts` — `fetchMachines`, `fetchMachineById`, `fetchMachinesForOwner`. Tagged `[MACHINE]`.
- [x] `src/integrations/supabase/index.ts` — added `machines` barrel export.

**Phase C — State + hooks**
- [x] `src/stores/locationStore.ts` — Zustand: `coords`, `permissionStatus`. `MANDYA_FALLBACK = { lat: 12.5218, lng: 76.8951 }`.
- [x] `src/hooks/useLocation.ts` — expo-location permission + Mandya fallback.
- [x] `src/hooks/useMachines.ts` — `useMachines` (60s stale), `useMachine` (30s), `useOwnerMachines` (60s). TanStack Query keys per CLAUDE.md.

**Phase D — UI primitives + screens**
- [x] `src/components/ui/Card.tsx` — Pressable/View wrapper.
- [x] `src/components/ui/Badge.tsx` — hard-coded NativeWind class names per variant (avail/busy/pending/accepted/declined).
- [x] `src/components/ui/LoadingState.tsx` — full-bleed ActivityIndicator.
- [x] `src/components/ui/EmptyState.tsx` — icon + title + body + optional CTA.
- [x] `src/components/machine/MachineCard.tsx` — 80×80 placeholder, category icon, formatPaise, distanceKm.
- [x] `app/(renter)/_layout.tsx` — Tabs: Discover / Bookings / AI Helper / Profile.
- [x] `app/(renter)/discover.tsx` — category filter pills, FlatList sorted by distance, pull-to-refresh, empty state.
- [x] `app/(renter)/machine/[id].tsx` — hero, pricing, owner info, disabled "Request rental" CTA.
- [x] `app/(renter)/bookings.tsx`, `app/(renter)/ai-helper.tsx`, `app/(renter)/profile.tsx` — stubs.

**Phase E — Seed + acceptance**
- [x] `scripts/seed.ts` — 10 machines across 5 categories, Mandya area. `ws` transport for Node 20.
- [x] `package.json` — `"seed": "tsx --env-file=.env scripts/seed.ts"`.
- [x] `.env.example` — `SUPABASE_SERVICE_ROLE_KEY` line added.
- [x] `npm run seed` → 10 machines inserted.
- [x] Discover screen renders seeded machines sorted by distance.
- [x] Category filter, pull-to-refresh, machine detail all working on web preview.
- [x] Windows Metro fix: created empty placeholder dirs for missing lightningcss platform binaries.

### Layer 1 — Auth + onboarding + role select — committed (this commit)

L1 deviates from PRD §1 on three Vishnu-set points:
- Single auth screen (not split login + signup) at `app/(auth)/index.tsx`.
- Email + 6-digit OTP (not password); Supabase auto-detects fresh vs existing users via `signInWithOtp({ shouldCreateUser: true })`.
- Google + GitHub OAuth + pre-auth onboarding route group `(onboarding)` (3-slide carousel, shown whenever no session — not first-launch only).

**Pre-flight**
- [x] Install `expo-auth-session` + `expo-crypto` via `npx expo install`.

**Phase A — Vishnu-side prereqs (manual, in dashboard)**
- [x] Google OAuth client created in Google Cloud Console with redirect `https://vgyivfjbkgvpibhrylzp.supabase.co/auth/v1/callback`.
- [x] GitHub OAuth app created with same callback URL.
- [x] Supabase Auth → Providers → Google + GitHub: enabled.
- [x] Supabase Auth → Providers → Email: OTP enabled, "Confirm email" disabled.
- [x] Supabase Auth → Email Templates → Magic Link customized to OTP-only (`{{ .Token }}` in body, no clickable link).
- [x] Supabase Auth → URL Configuration → Redirect URLs: added `nammayantra://**`, `exp://**`, and `http://localhost:8081/auth/callback` for local web dev.

**Phase B — DB layer**
- [x] Migration `init_profiles` applied via MCP `apply_migration` (version `20260509090235`).
- [x] Follow-up migration `harden_set_updated_at_search_path` (version `20260509090545`) — fixed Supabase advisor lint 0011 (mutable search_path).
- [x] Both mirrored to `supabase/migrations/` for git audit trail.
- [x] Tables: `profiles` (15 cols, FK → `auth.users.id`, RLS on), `categories` (5 rows seeded: tractor, harvester, sprayer, tiller, other).
- [x] Enums: `user_role` (`owner|renter|both`), `language_code` (`en|kn`).
- [x] Types generated by MCP → `src/types/database.ts`.
- [x] Security advisor: 0 lints.
- [x] **Deviation from PRD:** dropped the `auth.users → profiles` auto-insert trigger. Reason: docs/02 schema has NOT NULL fields that an auto-trigger can't populate; cleaner to detect "fresh user" via `getProfile() == null`.

**Phase C — State + auth service**
- [x] `src/stores/authStore.ts` — Zustand: `session`, `profile`, `isHydrated`, setters. No persistence (Supabase already persists session via AsyncStorage).
- [x] `src/stores/onboardingStore.ts` — Zustand, **NO persist** (in-memory only; `hasSeenOnboarding` defaults false on every cold launch).
- [x] `src/integrations/supabase/auth.ts` — `sendOtp`, `verifyOtp`, `signInWithGoogle/GitHub` (returns `Promise<boolean>`), `signOut`, `getProfile`, `createProfile`.
- [x] `src/integrations/supabase/index.ts` — barrel: `supabase` + `auth` namespace.
- [x] `src/hooks/useAuthListener.ts` — `onAuthStateChange` subscription. **Atomic profile load + `useAuthStore.setState({session, profile})`** so existing users never flash role-select. On `SIGNED_OUT`: clears auth + resets onboarding store.
- [x] `src/constants/karnataka-districts.ts` — 30 districts, alphabetized.

**Phase D — Routes + screens**
- [x] `app/_layout.tsx` — SafeAreaProvider + QueryClientProvider + Stack. Mounts `useAuthListener()`. Module-level `SplashScreen.hideAsync()` workaround for SDK 54 splash bug.
- [x] `app/index.tsx` — root routing dispatcher using `computeRootRoute` (pure function in `src/navigation/dispatcher.ts`). Renders `<ActivityIndicator>` until hydrated, else `<Redirect>`.
- [x] `app/(onboarding)/{_layout,index}.tsx` — 3-slide carousel (Tractor → Sprout → Sparkles). Skip + Continue/Get-Started. Responsive (slide width clamped to `min(window, 768px)` via `useWindowDimensions`). Continue button updates page state immediately so it advances on web (where `onMomentumScrollEnd` doesn't fire reliably for programmatic scrolls).
- [x] `app/(auth)/{_layout,index,role-select}.tsx` — single auth screen (Google + GitHub + email/OTP), role-select form (role chips + name + village + district picker over 30 KA districts).
- [x] `app/(renter)/{_layout,index}.tsx` + `app/(owner)/{_layout,index}.tsx` — placeholder homes + sign-out button.
- [x] `app/auth/callback.tsx` — OAuth deep-link / web redirect handler. Reads both query string and URL fragment. Calls `exchangeCodeForSession` (PKCE) or `setSession` (implicit). Bounces to right destination via inline profile fetch.
- [x] `npm run typecheck` + `npm run lint` clean.

**Mid-L1 refactor 1: Navigation module → simplified for MVP**
- [x] Initially built `src/navigation/{routes,dispatcher,navigate,useNavigationGuard}.ts` with a state-driven guard hook.
- [x] Removed `useNavigationGuard.ts` per Vishnu's "simpler MVP" directive. Kept `routes.ts`, `dispatcher.ts` (still used by `app/index.tsx`), `navigate.ts`.
- [x] Each handler now does explicit `router.replace('/(targetGroup)')` after its side-effect — no group-comparison logic, no race conditions.
- [x] Why explicit `'/(group)'` instead of `'/'`: web URL stays `/` regardless of which group renders (groups are invisible in URL), so `router.replace('/')` is a no-op when already at `/`.

**Mid-L1 refactor 2: Comprehensive activity logging (CLAUDE.md update)**
- [x] 68 log calls across 11 files. CLAUDE.md updated with new "Every user action gets logged" subsection under Tagged Logger.
- [x] Page-mount log on every route mount, tap log before side-effect, completion log after, lifecycle transitions at INFO not DEBUG.
- [x] Never log keystrokes, raw PII (email, OTP digits, full name, phone, village/district names) — log shapes only.

**Mid-L1: Web preview + Vercel deploy bring-up**
- [x] `app.json` web mode: `output: "single"` (SPA, no SSR errors), `name`/`shortName`/`description`/`themeColor`/`backgroundColor` for PWA chrome, custom favicon (`assets/images/favicon.jpeg`).
- [x] Responsive sweep: Tailwind breakpoints (`sm:`/`md:`/`lg:`) on auth/role-select/renter/owner home + onboarding container. Same className strings work cross-platform.
- [x] OAuth web parity: `Platform.OS === 'web'` branch in `signInWithProvider` uses `${window.location.origin}/auth/callback` with the redirect flow (Supabase navigates the tab); native path keeps WebBrowser flow.
- [x] `flowType: 'pkce'` added to Supabase client config so OAuth returns `?code=...` (cleaner than implicit-flow `#token=...`).
- [x] Defensive fragment parsing in `app/auth/callback.tsx` as fallback when provider returns tokens in `#`.
- [x] Vercel deploy config: `vercel.json` (build cmd, output dir, SPA rewrites), `build:web` script in `package.json`.

**Mid-L1: Babel + experiments tweaks**
- [x] Added `react-native-worklets/plugin` to `babel.config.js` (last in plugins array) — required for Reanimated 4 + gesture-handler.
- [x] Removed `experiments.reactCompiler: true` from `app.json` — bleeding edge, was causing Metro bundling timeouts when combined with NativeWind v4.

**Phase E — Acceptance**
- [x] Web preview walk: onboarding → auth (OTP path verified) → role-select → renter/owner home → sign-out → onboarding. Existing-user re-sign-in goes straight to home (no role-select flash).
- [x] **OAuth on web: deferred** to dev-build verification (per Vishnu — switching back to dev build later for full Phase E confirmation).
- [x] RLS verified via MCP: `select * from profiles where id != auth.uid()` returns 0 rows for the signed-in user.
- [x] Final greps clean: no `console.*` outside `src/lib/logger.ts`, no `../..` imports.
- [x] Commit: `feat(L1): auth with onboarding and role select`.

### Layer 0 — Project skeleton — committed `9417de9`

**Phase 1 — Pre-flight & scaffold**
- [x] Stash docs out of project dir, run `create-expo-app@latest --template default`, verify SDK 54.0.33, verify Expo Go v54 connects via tunnel mode.
- [x] Delete sample template files (`app/(tabs)`, `app/modal.tsx`, root `components/hooks/constants/`, `react-logo*` images, `scripts/reset-project.js`).
- [x] Rewrite `app/_layout.tsx` to placeholder; restore docs; rename git branch `master` → `main`.
- [x] Update `.gitignore` to exclude `.env` and `.env.*` while keeping `.env.example`.

**Phase 2 — Deps + config**
- [x] Install JS deps (zustand, @tanstack/react-query, react-hook-form + zod + @hookform/resolvers, lucide-react-native, i18next + react-i18next, date-fns, @supabase/supabase-js, nativewind).
- [x] Install native deps via `expo install` (location, image-picker, image-manipulator, notifications, secure-store, async-storage, url-polyfill, svg, maps, calendars).
- [x] DevDeps: tailwindcss, babel-plugin-module-resolver, supabase CLI as devDep.
- [x] `tsconfig.json` paths `@/*` → `./src/*`; create `babel.config.js`, `metro.config.js`, `tailwind.config.js`, `global.css`, `nativewind-env.d.ts`.
- [x] Rewrite `app.json` (name "Namma-Yantra Share", slug `namma-yantra`, scheme `nammayantra`, package `com.vishnu.nammayantra`, permissions, plugins).
- [x] Add `typecheck` script to `package.json`; `npm run typecheck` + `npm run lint` clean.

**Phase 3 — Source skeleton**
- [x] Build `src/` folder tree with `.gitkeep` placeholders.
- [x] Write `src/lib/logger.ts` (15-tag tagged logger, `__DEV__`-gated debug).
- [x] Write `src/theme/colors.ts` (brand palette as named export).
- [x] Write `src/integrations/supabase/client.ts` + folder barrel `index.ts`.
- [x] Replace scaffold `README.md` with project description; seed this `tasks/todo.md`.

**Phase 4 — Supabase wiring (MCP-based)**
- [x] Vishnu created Supabase project (region `ap-southeast-1` Singapore — PRD recommended Mumbai; ~30 ms latency tradeoff, accepted).
- [x] `.env` (gitignored) + `.env.example` (committed) with `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- [x] `.mcp.json` wired to hosted Supabase MCP (`https://mcp.supabase.com/mcp`).
- [x] MCP `list_projects` confirmed `vgyivfjbkgvpibhrylzp` — `ACTIVE_HEALTHY`, Postgres 17.6.
- [x] `supabase/config.toml` initialized (local CLI ready as fallback for L1+ workflows).
- [x] `supabase login` / `link` deferred — MCP handles auth; revisit only if a workflow needs CLI auth.

**Phase 5 — Routes + landing screen + acceptance + commit**
- [x] Rewrite `app/_layout.tsx`: SafeAreaProvider + QueryClientProvider (60s stale, retry 1) + StatusBar + Stack.
- [x] Write `app/index.tsx`: health-check screen using `supabase.from('_health').select(...)`, accepts both `42P01` (Postgres) and `PGRST205` (PostgREST) as the success signal.
- [x] App launches on Expo Go v54 (verified by Vishnu); status text reads "Connected to Supabase ✓" (green).
- [x] `npm run typecheck`, `npm run lint`, no raw `console.*` outside `src/lib/logger.ts`, no `../..` imports.
- [x] L0 commit `9417de9` lands on `main` with `.env` excluded.
