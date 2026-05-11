# tasks/todo.md — Namma-Yantra Share

> Active layer + checklist. CLAUDE.md workflow:
> 1. Implement one item at a time.
> 2. Mark `[x]` when done.
> 3. Move completed items into "Completed Work Log" at the bottom — never delete.
> 4. After each item, briefly explain what changed and why (one paragraph in commit body or PR).

## Current layer: **Layer 2 — Listings (read-only)**

Spec: [`docs/03-layer-2-listings.md`](../docs/03-layer-2-listings.md).

L2 introduces:
- `machines` table + RLS policies (read public for active machines, owner-CRUD on own).
- Pure utilities in `src/lib/`: `money.ts` (paise ↔ rupees), `geohash.ts` (precision-6 cells), `distance.ts` (Haversine).
- Query layer in `src/integrations/supabase/machines.ts` (read-only at L2; create/update lands in L4).
- TanStack Query hooks in `src/hooks/useMachines.ts`.
- UI primitives in `src/components/ui/` (Card, Badge, LoadingState, EmptyState).
- `MachineCard` in `src/components/machine/`.
- Renter Tab layout (Discover, Bookings, AI Helper, Profile — only Discover wired at L2).
- Discover screen + Machine Detail screen.
- Location store + `useLocation` hook (Expo Location with Mandya fallback).
- Seed script (`scripts/seed.ts`) — 8+ demo machines across categories.

Plan to be drafted in this file before coding starts.

### Pre-flight

- [ ] Read `docs/03-layer-2-listings.md` end-to-end.
- [ ] Confirm Phase E acceptance walk for L1 was performed (OAuth deferred to dev-build verification).

### Phase A — DB + types

- [ ] Apply `init_machines` migration via MCP (machines table + enums + indexes + RLS policies + btree_gist for future EXCLUDE).
- [ ] Mirror SQL to `supabase/migrations/<timestamp>_init_machines.sql`.
- [ ] Regenerate `src/types/database.ts` via MCP.

### Phase B — Pure libs + integration

- [ ] `src/lib/money.ts` (paise ↔ rupees, formatPaise).
- [ ] `src/lib/geohash.ts` (precision-6 encoder).
- [ ] `src/lib/distance.ts` (Haversine).
- [ ] `src/integrations/supabase/machines.ts` (`fetchMachines`, `fetchMachineById`, `fetchMachinesForOwner`).

### Phase C — State + hooks

- [ ] `src/stores/locationStore.ts` (Zustand: lat/lng + permission flow with Mandya fallback).
- [ ] `src/hooks/useLocation.ts`.
- [ ] `src/hooks/useMachines.ts` (TanStack Query wrappers per CLAUDE.md key conventions).

### Phase D — UI primitives + screens

- [ ] `src/components/ui/{Card,Badge,LoadingState,EmptyState}.tsx`.
- [ ] `src/components/machine/MachineCard.tsx`.
- [ ] Update `app/(renter)/_layout.tsx` to Tabs (Discover, Bookings, AI Helper, Profile — stub the latter three).
- [ ] `app/(renter)/discover.tsx` — header + category filters + FlatList.
- [ ] `app/(renter)/machine/[id].tsx` — detail screen (CTA disabled at L2; enables in L3).

### Phase E — Seed + acceptance + commit

- [ ] `scripts/seed.ts` — 8+ machines across categories with realistic geohashes + pricing in paise.
- [ ] `npm run seed` succeeds (needs `SUPABASE_SERVICE_ROLE_KEY` locally).
- [ ] Discover screen renders seeded machines, sorted by distance from current location.
- [ ] Category filter works.
- [ ] Tap card → detail screen shows full info.
- [ ] Distance computation verified against a hand-computed value.
- [ ] `npm run typecheck` + `npm run lint` clean.
- [ ] No raw `console.*` outside `src/lib/logger.ts`. No `../..` imports.
- [ ] Commit: `feat(L2): read-only listings feed and detail screen`.

---

## Completed Work Log

_Items move here after each layer's commit lands. Don't delete — this is the audit trail._

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
- [x] Update `.gitignore` to ignore `.env` and `.env.*` while keeping `.env.example`.

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
</content>
</invoke>