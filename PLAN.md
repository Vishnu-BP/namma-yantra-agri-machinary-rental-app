# Namma-Yantra Share — 8-layer build roadmap

## Context

Building **Namma-Yantra Share** from scratch — a peer-to-peer farm machinery rental marketplace for Karnataka — per the spec in [PRD-claude-code.md](PRD-claude-code.md). Stack: React Native + Expo SDK 51 + TypeScript + Supabase + Groq. Three-week timeline, Android APK submission via EAS.

The PRD enforces a **strict layered build**: each of the 8 layers must run, demo, and commit cleanly before the next starts. This plan mirrors that — never skipping ahead, never adding scope outside the PRD.

**User decisions (already collected):**
- Scope: full 8-layer roadmap (this file).
- Supabase: user will create the project + email-confirm toggle manually and paste `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY` into `.env`. Service-role key passed as env var only when running scripts; never committed.
- Layout: project lives **flat** at `c:/projects/Mindmatrix` alongside `PRD-claude-code.md`.

## Pre-flight (one-time, before Layer 0)

`create-expo-app` refuses non-empty targets, and the directory already contains `PRD-claude-code.md` (and now `PLAN.md`). Strategy:

1. Move `PRD-claude-code.md` and `PLAN.md` → `../*.tmp.md` (out of the target dir).
2. Run `npx create-expo-app@latest . --template blank-typescript` inside `c:/projects/Mindmatrix`.
3. Move the docs back into the project root.
4. `git init` (PRD says "is a git repo: false" today).
5. Confirm Node 20+, Android Studio/emulator or Expo Go on a device. Install `supabase` and `eas-cli` globally.

**Pause point:** before running `supabase link` or any DB migration, wait for the user to:
- Create Supabase project `namma-yantra` in `ap-south-1`.
- Disable email confirmation in Auth → Providers → Email.
- Paste the URL + anon key into `.env`.
- Provide the project ref so `supabase link --project-ref <ref>` succeeds.

---

## Layer 0 — Project skeleton (Day 1)

**Goal:** Expo app runs on Android, connects to Supabase, all tooling locked in.

**Tasks (PRD §0.1–0.11):**
- Install all deps in the exact order from §0.2 (routing → native → state/data → forms → styling → UI → i18n → supabase → utils).
- `package.json`: `"main": "expo-router/entry"`, `typecheck` script.
- `app.json`: name, slug, scheme `nammayantra`, package `com.vishnu.nammayantra`, plugins, Android permissions, `typedRoutes: true`.
- NativeWind: `tailwind.config.js` with the brand palette (PRD §0.4), `babel.config.js` with `nativewind/babel`, `nativewind-env.d.ts`.
- Folder skeleton (PRD §0.5): `app/`, `src/{components/ui,hooks,lib/{supabase,i18n},stores,types,theme}`, `supabase/{migrations,functions}`, `assets/fonts`, `scripts/`.
- `.env` + `.env.example` + `.env` in `.gitignore`.
- `src/lib/supabase/client.ts` with AsyncStorage session, URL polyfill installed.
- `src/theme/colors.ts` (single source of color truth).
- `app/_layout.tsx` mounting `QueryClientProvider` + `SafeAreaProvider`.
- `app/index.tsx` health check: `supabase.from('_health').select('*')` → success on `42P01` (table not found = client reached server).
- `README.md` and `CLAUDE.md` (PRD §0.11).

**Critical files:** [app/_layout.tsx](app/_layout.tsx), [app/index.tsx](app/index.tsx), [src/lib/supabase/client.ts](src/lib/supabase/client.ts), [tailwind.config.js](tailwind.config.js), [babel.config.js](babel.config.js), [src/theme/colors.ts](src/theme/colors.ts).

**Done when (PRD §Layer 0 acceptance):** `npx expo start --android` shows "Connected to Supabase ✓"; `npm run typecheck` passes; folder structure matches; `supabase status` shows linked project.

**Commit:** `feat(L0): project skeleton with Supabase initialized`.

---

## Layer 1 — Auth + role selection (Day 2)

**Goal:** Sign up → role-select → role-specific home. Sessions persist.

**Tasks (PRD §1.1–1.10):**
- Migration `init_profiles`: enums `user_role`, `language_code`; `categories` table seeded with 5 rows; `profiles` table; `set_updated_at()` trigger; RLS policies (`profiles_select_authed`, `profiles_insert_own`, `profiles_update_own`, `categories_select_all`).
- `src/types/database.ts`: `UserRole`, `Language`, `Profile`, `Category`.
- `src/stores/authStore.ts`: zustand store `{ session, profile, isLoading }`.
- `src/lib/supabase/auth.ts`: `signUp`, `signIn`, `signOut`, `getProfile`, `createProfile`.
- `src/hooks/useAuth.ts`: `useAuthListener` wiring `onAuthStateChange` → store.
- Route groups: `(auth)/{login,signup,role-select}`, `(renter)/home`, `(owner)/home`, plus root `index.tsx` redirector.
- `role-select.tsx` with the 30 Karnataka districts list (PRD §1.9), renter-only crop chips + acres input.

**Critical files:** [supabase/migrations/*_init_profiles.sql](supabase/migrations/), [src/stores/authStore.ts](src/stores/authStore.ts), [src/hooks/useAuth.ts](src/hooks/useAuth.ts), [app/index.tsx](app/index.tsx), [app/(auth)/role-select.tsx](app/(auth)/role-select.tsx).

**Done when:** signup → role-select → home; sign-out returns to login; force-quit retains session; RLS verified in SQL editor.

**Commit:** `feat(L1): email auth with role selection`.

---

## Layer 2 — Listings, read-only (Day 3-4)

**Goal:** Renter browses seeded machines; tap to detail view.

**Tasks (PRD §2.1–2.13):**
- Migration `init_machines`: enums `machine_condition`, `machine_status`; `machines` table (paise pricing, geohash, denormalized owner fields, condition report columns); 3 indexes; RLS (`select_active`, `insert_own`, `update_own`, `delete_own`).
- Type additions: `Machine`, `MachineCategory`, `MachineCondition`, `MachineStatus`.
- Utils: `src/lib/money.ts` (paise ↔ rupees, `formatPaise` with Indian grouping); `src/lib/geohash.ts` (precision 6 inline encoder); `src/lib/distance.ts` (haversine).
- Query layer: `src/lib/supabase/machines.ts` (`fetchMachines`, `fetchMachineById`, `fetchMachinesForOwner`).
- Hooks: `src/hooks/useMachines.ts` — `useMachines`, `useMachine`, `useOwnerMachines` via TanStack Query.
- `src/stores/locationStore.ts` + `src/hooks/useLocation.ts` (foreground perms, fallback to Mandya 12.5218,76.8951 on denial).
- UI primitives: `Card`, `Badge`, `LoadingState`, `EmptyState`.
- `MachineCard` component (image | title/brand+model/distance/rate, static badge for now).
- Renter tab layout: Discover, Bookings (stub), AI Helper (stub), Profile (stub) + hidden `home`/`machine/[id]`.
- `app/(renter)/discover.tsx`: header + category pills + FlatList + pull-to-refresh + loading/empty states.
- `app/(renter)/machine/[id].tsx`: hero, meta, pricing cells, owner block, disabled "Request rental" button.
- `scripts/seed.ts` using service-role key — creates `owner@demo.com` (`demo1234`) + 8 machines across categories near Mandya. Add `"seed": "tsx scripts/seed.ts"` to package.json.

**Critical files:** [src/lib/money.ts](src/lib/money.ts), [src/lib/geohash.ts](src/lib/geohash.ts), [src/components/machine/MachineCard.tsx](src/components/machine/MachineCard.tsx), [app/(renter)/discover.tsx](app/(renter)/discover.tsx), [scripts/seed.ts](scripts/seed.ts).

**Done when:** seed populates ≥8 machines; discover lists them; category filter works; detail screen shows full info; pull-to-refresh, loading, empty states all wired.

**Commit:** `feat(L2): read-only listings feed and detail screen`.

---

## Layer 3 — Booking flow (Day 5-6)

**Goal:** End-to-end booking: renter requests → owner accepts/declines. **Double-booking impossible at the DB level.**

**Tasks (PRD §3.1–3.13):**
- Migration `init_bookings`: enums `booking_status`, `duration_unit`; `CREATE EXTENSION btree_gist`; `bookings` table with `time_range TSTZRANGE` and the **EXCLUDE constraint** `no_overlapping_bookings (machine_id WITH =, time_range WITH &&) WHERE status IN ('pending','accepted')`; 3 indexes; RLS (`select_involved`, `insert_renter`, `update_involved`, no deletes). **Verify the constraint** by manually inserting two overlapping rows in SQL editor — second must fail with `23P01`.
- Types: `Booking`, `BookingStatus`, `DurationUnit`.
- Utils: `src/lib/range.ts` (parse/format `tstzrange`); `src/lib/pricing.ts` (`calculatePrice` returns `{rateUsedPaise, totalPaise, formula}`); `src/lib/booking-conflict.ts` (`getDisabledDates` for calendar markers).
- Edge functions:
  - `create-booking` — auth via JWT; service-role read of machine; authoritative price compute in paise; insert booking with snapshots; map error code `23P01` → HTTP 409 `CONFLICT`.
  - `respond-to-booking` — `accept|decline|cancel`; owner-only for accept/decline; state-transition validation; updates `status_history`, `*_at`, `decline_reason`/`cancellation_reason`; flips `is_currently_available` when an accepted booking covers `NOW()`, sets back to `true` on cancel/decline.
  - Both deployed `--no-verify-jwt` (manual auth).
- Query layer: `src/lib/supabase/bookings.ts` + hooks `src/hooks/useBookings.ts` (with mutation invalidation of `['bookings']`).
- Renter booking flow `app/(renter)/book/[machineId].tsx`: 3 steps via local state — Schedule (calendar with `getDisabledDates`, hourly/daily toggle, stepper, live `PriceCalculator`) → Review (notes textarea, total) → Confirmation. Submit calls `useCreateBooking` and routes step 3.
- Renter `bookings.tsx`: filter pills + `BookingCard` + pull-to-refresh + per-filter empty state.
- Owner tab layout: Listings (stub for now), Requests, Earnings (stub), Profile (stub).
- Owner `requests.tsx`: pending requests with Accept/Decline; Decline modal captures reason; calls `useRespondToBooking`.
- Update machine detail: enable "Request rental" → push to book route; show booked-dates summary via `useMachineBookings`.

**Critical files:** [supabase/migrations/*_init_bookings.sql](supabase/migrations/), [supabase/functions/create-booking/index.ts](supabase/functions/create-booking/index.ts), [supabase/functions/respond-to-booking/index.ts](supabase/functions/respond-to-booking/index.ts), [src/lib/range.ts](src/lib/range.ts), [src/lib/pricing.ts](src/lib/pricing.ts), [app/(renter)/book/[machineId].tsx](app/(renter)/book/[machineId].tsx), [app/(owner)/requests.tsx](app/(owner)/requests.tsx).

**Done when:** booking creates a pending row; **conflict test** rejects an overlapping booking with the CONFLICT code; owner accept/decline flows work; status history populated; cross-account RLS denial verified.

**Commit:** `feat(L3): booking flow with EXCLUDE constraint conflict prevention`.

---

## Layer 4 — Owner CRUD + photos (Day 7-8)

**Goal:** Owner creates, edits, pauses, archives, deletes listings; uploads compressed photos to Supabase Storage.

**Tasks (PRD §4.1–4.5):**
- Storage buckets `machine-images` + `condition-reports` (both public); folder-scoped insert/delete policies (`(storage.foldername(name))[1] IN (SELECT id::text FROM machines WHERE owner_id = auth.uid())`).
- `src/lib/supabase/storage.ts`: `uploadMachineImage` and `uploadConditionReportImage` — `expo-image-manipulator` resizes to 1024w + JPEG compress 0.8 before upload via `arrayBuffer`. `deleteMachineImages` lists + removes.
- `src/lib/supabase/machines.ts` extensions: `createMachine` (recomputes geohash), `updateMachine` (re-geohash on location change), `updateMachineImages`, `deleteMachine`.
- Owner Listings tab populated via `useOwnerMachines(profile.id)`.
- Add Machine multi-step flow: `app/(owner)/add-machine/{_layout,index,details,pricing}.tsx`. Cross-step state in `src/stores/addMachineStore.ts`. Step 1 photos (max 5, primary picker), Step 2 details (brand autocomplete from 10 brands, feature chips), Step 3 pricing + map pin (`react-native-maps`). On publish: createMachine → upload images → updateMachineImages → reset store → invalidate `['machines']` → navigate back.
- Edit screen `app/(owner)/machine/[id]/edit.tsx`: pre-fills, Save, status toggle, Delete-with-confirmation (also wipes storage).

**Critical files:** [src/lib/supabase/storage.ts](src/lib/supabase/storage.ts), [src/stores/addMachineStore.ts](src/stores/addMachineStore.ts), [app/(owner)/add-machine/](app/(owner)/add-machine/), [app/(owner)/machine/[id]/edit.tsx](app/(owner)/machine/[id]/edit.tsx).

**Done when:** publish creates a row + uploads images visible at the public URL; new machine appears in renter discover; edit/pause/archive/delete all work; cross-owner UPDATE rejected by RLS; uploaded files <1 MB.

**Commit:** `feat(L4): owner CRUD with photo upload`.

---

## Layer 5 — Real-time availability (Day 9)

**Goal:** Green/gray dot updates across devices in <2s when an owner accepts.

**Tasks (PRD §5.1–5.8):**
- `ALTER PUBLICATION supabase_realtime ADD TABLE machines;` (verify in Database → Replication).
- `src/hooks/useAvailability.ts`: subscribes to `postgres_changes` UPDATE filtered by `id=eq.${machineId}`; cleanly removes channel on unmount.
- `src/components/machine/AvailabilityBadge.tsx`: uses `useAvailability(machineId, initialValue)`; shows "Available" (green dot) / "In use" (gray) / loading.
- Replace static badges in `MachineCard` and machine detail with `<AvailabilityBadge>`.
- Discover screen: single channel patches the `['machines']` and `['machine', id]` query caches in `react-query` on UPDATE events.
- Migration `sync_availability_function`: requires enabling `pg_cron` extension first (Supabase dashboard → Database → Extensions). Creates `sync_machine_availability()` reconciler + `cron.schedule(... '*/15 * * * *')`.
- Two-device manual test (PRD §5.8) is the demo proof.

**Critical files:** [src/hooks/useAvailability.ts](src/hooks/useAvailability.ts), [src/components/machine/AvailabilityBadge.tsx](src/components/machine/AvailabilityBadge.tsx), [supabase/migrations/*_sync_availability_function.sql](supabase/migrations/).

**Done when:** two-device test flips badge in <2s; reverse (cancel) restores to Available; cron job runs without error; no listener leaks across navigation.

**Commit:** `feat(L5): real-time availability via Postgres Changes`.

---

## Layer 6 — AI features (Day 10-13)

**Goal:** Four Groq-powered features, each its own commit.

**Tasks (PRD §6.A–6.E):**

### 6.A Shared infrastructure
- `supabase secrets set GROQ_API_KEY=…` (verify with `supabase secrets list`).
- `supabase/functions/_shared/groq.ts`: `getGroqClient`, `callGroqJson` (model `llama-3.3-70b-versatile`, `response_format: json_object`, retry once), `callGroqVision` (model `llama-3.2-90b-vision-preview`, defensive JSON regex extract), `corsHeaders`, `jsonResponse`, `requireAuth`.
- Migration `ai_usage_table` + `increment_ai_usage()` SECURITY DEFINER (50/24h cap).
- `src/lib/ai.ts` (`callAI<T>` typed wrapper).
- `src/components/ai/AIButton.tsx` (Sparkles icon, "Thinking…" state).

### 6.B Smart Price Suggester (`feat(L6.B)`)
- Edge fn `ai-suggest-price` with input/output Zod schemas (PRD §6.B.1).
- `src/components/ai/PriceSuggester.tsx` wired into `app/(owner)/add-machine/pricing.tsx` above the rate inputs; `onUseSuggestion` writes both rupee values into `addMachineStore`.

### 6.C Listing Copy Generator (`feat(L6.C)`)
- Edge fn `ai-listing-copy` with bilingual output (English + Kannada **in Kannada script**).
- `src/components/ai/DescriptionGenerator.tsx` wired into `app/(owner)/add-machine/details.tsx`.
- **Kannada script verification** is mandatory acceptance (visual glyph check, not Latin transliteration).

### 6.D Crop-Aware Recommender (`feat(L6.D)`)
- Edge fn `ai-crop-recommend`.
- Replace the AI Helper renter tab with the full form: crop chip / acres stepper / task chip → result card with category, specs, hours, cost range, reasoning. CTA "Show me X near me" sets a filterStore key the discover screen consumes.

### 6.E Condition Report from Photo (`feat(L6.E)`)
- Edge fn `ai-condition-report`: ownership check → vision call → save to machine row (`condition`, `condition_report_summary`, `condition_report_issues`, `condition_report_image_url`, `condition_report_generated_at`).
- Owner edit screen: camera capture → `uploadConditionReportImage` → `callAI('ai-condition-report', …)` → refetch machine.
- Renter detail screen: render rating badge + `formatDistanceToNow` timestamp + summary + issues list when report exists.
- **Authorization test:** different owner calling for someone else's machine must get FORBIDDEN.

**Critical files:** [supabase/functions/_shared/groq.ts](supabase/functions/_shared/groq.ts), [src/lib/ai.ts](src/lib/ai.ts), [supabase/functions/ai-suggest-price/index.ts](supabase/functions/ai-suggest-price/index.ts), [supabase/functions/ai-listing-copy/index.ts](supabase/functions/ai-listing-copy/index.ts), [supabase/functions/ai-crop-recommend/index.ts](supabase/functions/ai-crop-recommend/index.ts), [supabase/functions/ai-condition-report/index.ts](supabase/functions/ai-condition-report/index.ts).

**Done when:** all 4 features deployed; AI failure degrades gracefully (form still usable); `grep -r GROQ_API_KEY src/` returns nothing; edge function logs clean.

**Commits:** `feat(L6.B/C/D/E): …` (one per sub-feature, no master commit).

---

## Layer 7 — i18n + polish + APK (Day 14-21)

**Goal:** Bilingual, polished, signed APK in hand.

**Tasks (PRD §7.1–7.11):**
- `src/lib/i18n/index.ts` with `compatibilityJSON: 'v3'`; load `en.json` + `kn.json`. Initialize in `app/_layout.tsx`.
- Comprehensive `en.json` (PRD §7.2 schema). Mirror keys in `kn.json` — Kannada strings reviewed by a native speaker before ship.
- Sweep every screen, replace hardcoded strings with `t('…')`. No string left behind.
- Language toggle in both profile screens; `i18n.changeLanguage` + persist to `profiles.preferred_language`. On app load after profile fetch, call `i18n.changeLanguage(profile.preferred_language)`.
- Visual polish (PRD §7.5): list-screen skeletons, empty states, pull-to-refresh, `react-native-toast-message`, splash + app icon, slide transitions, Pressable feedback, validation messages, custom machinery SVGs.
- Error sweep (PRD §7.6): TanStack `onError` toasts, mutation try/catch, offline banner, AI fallback copy, image upload retry.
- `scripts/reset-and-seed.ts`: cascade-deletes bookings/machines/profiles + storage objects → recreates `owner@demo.com` + `renter@demo.com` (`demo1234`) → seeds 12 quality machines.
- EAS Build: `eas build:configure`, populate `eas.json` `preview` profile (Android `apk` + Supabase env vars), `eas build --platform android --profile preview`. Download + install + run full demo on a clean device.
- Final `README.md` (overview, screenshots, EXCLUDE constraint + Postgres Changes highlights, demo accounts, APK link, acknowledgments).

**Critical files:** [src/lib/i18n/](src/lib/i18n/), [scripts/reset-and-seed.ts](scripts/reset-and-seed.ts), [eas.json](eas.json), [README.md](README.md).

**Done when:** every visible string toggles language; Kannada glyphs render on a clean device; APK installs and demos end-to-end; repo clean (no console.logs, no committed `.env`).

**Commit:** `feat(L7): i18n, polish, and APK build ready` + tag `v1.0.0`.

---

## Cross-cutting rules (enforced every layer)

- TypeScript strict — **no `any`**.
- All money in **paise** (integer); display via `formatPaise`.
- All UI strings via `useTranslation()` — even in early layers, write strings as `t('…')` keys with English fallback so Layer 7 is a key-fill, not a rewrite. (Soft rule for L0–L2; hard rule from L3 on.)
- Colors only from `src/theme/colors.ts` or NativeWind tokens — no inline hex.
- Migrations only via `supabase migration new <name>` + `supabase db push`. Never edit DB via dashboard except for read-only checks.
- Direct `supabase-js` only — no ORM.
- Service-role key never in client `.env`; only passed inline to scripts (`SUPABASE_SERVICE_ROLE_KEY=… npm run seed`).
- After every layer: run that layer's PRD acceptance checklist, then commit with the exact `feat(L{n}): …` format.

## Verification (per layer + final)

Each layer self-verifies via its PRD acceptance checklist. Final smoke test on the APK:

1. Fresh install → sign up → role select → home.
2. Renter: discover → category filter → detail → request rental → see in My Bookings.
3. Owner (second device): see request → accept → renter sees Accepted.
4. Real-time: badge flips Available → In use within 2s on the renter device.
5. Owner: Add Machine → AI price → AI description (Kannada glyphs) → publish → photos visible.
6. AI Helper (renter): paddy + 2 acres + harvest → recommends combine → CTA filters discover.
7. Owner edit: camera condition report → renter sees rating + summary on detail.
8. Language toggle in profile → every screen swaps to Kannada and persists across restart.
9. Conflict test: try to double-book same machine same dates from another renter → CONFLICT error shown.

If any check fails: stop, fix at root cause (no policy disables, no constraint drops), re-test, then advance.
