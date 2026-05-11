# CLAUDE.md — Namma-Yantra Share

> Peer-to-peer farm machinery rental marketplace ("Uber for Tractors") for Karnataka.
> React Native (Expo) + Supabase + Groq AI. Bilingual: English + Kannada.
> Goal: MindMatrix VTU internship — production-quality demo proving real-time, AI integration, and system design.

## Commands

```bash
# Expo
npx expo start --android         # Dev server (--clear to reset cache)
npm run typecheck                # tsc --noEmit
npm run lint                     # ESLint

# Supabase
supabase migration new <name>    # New SQL migration
supabase db push                 # Apply pending migrations
supabase functions deploy <name> --no-verify-jwt
supabase secrets set GROQ_API_KEY=<key>

# Scripts & Build
npm run seed                     # Seed demo (needs SUPABASE_SERVICE_ROLE_KEY)
npm run reset-and-seed
eas build --platform android --profile preview
```

> **Not yet wired up:** `npm run test` (Layer 7), `npm run e2e` (out of scope V1).

## Tech Stack — USE ONLY THESE

**Frontend:** React Native, Expo SDK 51+, expo-router, TypeScript (strict), NativeWind, Zustand, TanStack Query, React Hook Form + Zod, react-native-maps, react-native-calendars, lucide-react-native, date-fns, i18next + react-i18next.
**Backend:** Supabase (Postgres + Auth + Realtime + Storage + Edge Functions), `@supabase/supabase-js` v2+, Deno edge functions, Zod, Groq SDK via esm.sh.
**AI:** Groq — `llama-3.3-70b-versatile` (text), `llama-3.2-90b-vision-preview` (vision).
**Infra:** EAS Build (APK), Supabase Cloud, Expo Push Notifications.

## Environment Variables

Client `.env` (commit `.env.example`): `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Edge functions: `GROQ_API_KEY` via `supabase secrets set` (`SUPABASE_SERVICE_ROLE_KEY` auto-injected). Local scripts only: `SUPABASE_SERVICE_ROLE_KEY` for `scripts/seed.ts` — never bundled with client.

## Folder Rules

- **`src/integrations/`** is the only place that imports `@supabase/supabase-js` directly. Hooks/components use `@/integrations/supabase`.
- **`src/lib/`** is pure — no React, no Supabase, no Expo APIs.
- **`src/components/`** groups by domain (`machine`, `booking`, `ai`, `ui`), not by feature.
- **`src/stores/`** is for cross-cutting state only. No per-feature stores.
- **`app/`** only routes and renders. No business logic in page files.
- **No monster root barrels.** Folder-local `index.ts` is fine.

## Path Aliasing — `@` Always

Configure both `tsconfig.json` (`"paths": { "@/*": ["src/*"] }`) and `babel.config.js` (`module-resolver`). Every cross-folder import uses `@`. Same-folder relative imports (`./Button`) are fine. **No `../..` ever.**

```typescript
// ✅ import { supabase } from '@/integrations/supabase'
// ❌ import { supabase } from '../../integrations/supabase'
```

## Comments — Required, Not Optional

Anyone — recruiter, teammate, future-you — must understand any file in 30 seconds.

1. **File header on every file > 20 lines:** `@file`, `@module`, 2-3 sentences on what it does and why it exists.
2. **Function docblock on every exported function** — purpose, key params, return, non-obvious behavior.
3. **Inline comments explain WHY, not WHAT.** `// Throttle: avoid Groq rate limits during retries.` — not `// increment count`.
4. **Section separators** for files over 50 lines: `// ─── Section Name ─────────────────────────────────`
5. **`// Why:`** comments for non-obvious decisions.

**Never:** restate code · leave commented-out code · write apologetic comments (`// hacky but works`) · use `// TODO` without `(L{n})` reference.

## Architecture

### Data Flow — NEVER skip layers

```
Component → Hook (TanStack Query) → @/integrations/supabase/{resource}
  → supabase-js → RLS in Postgres OR Edge Function (sensitive ops)
  → Response → query cache invalidated
```

- Components NEVER import supabase-js directly.
- Sensitive writes (booking creation, status changes, AI calls) go through Edge Functions. Never trust the client to compute prices or check conflicts.
- Direct table writes are fine for owner-CRUD-on-own-resources — RLS is the safety net.

### State Management

| Data | Tool | Never... |
|---|---|---|
| Server data | TanStack Query | ...put in Zustand |
| UI state (filters, modals) | Zustand | ...put in TanStack Query |
| Form inputs | React Hook Form + Zod | ...put in Zustand |
| Cross-cutting (auth, location, multi-step drafts) | Zustand stores | ...query on every render |

### TanStack Query Conventions

```typescript
['machines'] | ['machines', { category }] | ['machine', id] | ['machines', 'owner', ownerId]
['bookings', 'renter' | 'owner', userId] | ['bookings', 'machine', machineId]
```

Stale times: feed = 60s, single = 30s, bookings = 0. Invalidation via mutation `onSuccess`, Postgres Changes, app focus.

### Resilience

AI failures → fallback message, form remains functional. Realtime drops → TanStack refetch on focus. Offline → persistent banner; cached data readable. Storage failures → retry button. Toasts via `sonner-native`. **Optimistic updates ONLY for booking status changes.**

### Design Principles

Code like a senior engineer: **understandable, scalable, maintainable, commented.** Single Responsibility, Separation of Concerns, Defense in Depth (frontend → edge function → RLS), Fail Gracefully, DRY, Composition over Inheritance.

## Tagged Logger — No raw `console.log`. Ever.

```typescript
import { createLogger } from '@/lib/logger'
const log = createLogger('BOOKING')
log.info('Created booking', { id })
log.error('Edge fn failed', err)            // always include error obj
log.debug('Conflict check', { conflicts })  // stripped in production
```

**Tags:** `AUTH`, `API`, `DB`, `BOOKING`, `MACHINE`, `RT`, `AI`, `STORAGE`, `I18N`, `LOC`, `STORE`, `UI`, `NAV`, `MW`, `PUSH`. **Never log PII or JWTs at any level.** Edge functions use `console.log` prefixed with `[function-name]` for grep.

### Every user action gets logged

The user journey must be reconstructible from the logger output alone. For every screen and feature:

- **Page-mount log** when a route mounts: `useEffect(() => log.info('<Page>: page visited'), [])`. Without this, logs only show what was tapped, not where the user actually was.
- **Tap log** at the start of every button / pressable handler: `log.info('<Page>: <action> tapped', { ...enums })`. Tap logs go *before* the side-effect runs.
- **Completion log** after the side-effect resolves: `log.info('<Page>: <action> completed', { ...result })`. A tap log without a completion log indicates the action errored or hung.
- **Lifecycle transitions** at INFO, not DEBUG — auth state changes, onboarding completion, navigation guard cross-group redirects, app boot. DEBUG is only for fine-grained tracing that should be stripped in production builds.

What NOT to log: keystrokes / per-character typing (noisy + PII), every render, raw values from PII fields (email, OTP digits, full name, phone, village/district names). Log the *shape* of the action — booleans, enums, role identifiers, page names — never the user's input string.

## Coding Standards

### Naming

| Type | Convention | Example |
|---|---|---|
| Component | PascalCase.tsx | `MachineCard.tsx` |
| Hook | camelCase + "use" | `useMachines.ts` |
| Store | camelCase + "Store" | `authStore.ts` |
| Lib / Edge fn | resource.ts / kebab-case | `pricing.ts`, `ai-suggest-price/` |
| Vars / Functions | camelCase, verb-first for fns | `isAvailable`, `createMachine()` |
| Constants | UPPER_SNAKE_CASE | `MAX_PHOTOS_PER_LISTING` |
| Types | PascalCase, no "I" prefix | `Machine` |
| Booleans / Handlers | is/has/can · handle prefix | `isLoading`, `handleAccept` |
| DB tables/columns | snake_case (plural tables) | `bookings`, `hourly_rate_paise` |

### TypeScript & Styling

`strict: true`. No `any` (use `unknown` + narrow). No `@ts-ignore` without WHY. Explicit return types on exports. `import type` for type-only. DB types in `@/types/database` mirror Postgres exactly.

NativeWind only — no inline `style={{}}` for layout. Colors only via `@/theme/colors` — no hex inline. Tap targets ≥ 44×44 pt. Status badges combine icon + color + text — never color alone.

### File Size Limits

Components: 250 lines. Hooks: 150. Lib: 200. Edge functions: 200. Split before continuing.

### Code Discipline — non-negotiable

- **Reuse before creating.** Search the codebase before writing a new hook/component/util.
- **No magic numbers or strings.** Named constants only.
- **No default exports** (except expo-router page files).
- **Isolated try/catch** — one screen's failure never crashes another.
- **Migrations append-only** — never edit a pushed migration.
- **No `console.log`** in committed code — CI fails on it.
- **No commented-out code** in commits.
- **No "temporary" workarounds** without `// TODO(L{n}):` naming the fix layer.
- **No premature abstraction.** Wait for the third use before extracting.

### File Deletion

Layers 0–6: delete freely. Post-Layer 7: rename to `_DEPRECATED_<reason>.ts`, delete in a separate commit. **Never delete migrations.**

### When in Doubt

1. Re-read this file and `PRD.md`. 2. Check `tasks/todo.md`. 3. Ask the user — never guess on architecture.

## Workflow

1. Read the task fully before writing code. 2. Identify the **build layer** (see `PRD.md`). 3. Write a plan to `tasks/todo.md`. 4. **STOP and wait for approval** before coding. 5. Implement one item at a time, marking each done. 6. Briefly explain what changed and why after each. 7. Run the layer's **acceptance criteria** before claiming complete. 8. Move done items to "Completed Work Log".

**Hard stops — STOP and ask:** task wants to skip layers · unapproved library seems needed · ambiguous architectural decision · acceptance fails unexpectedly · change touches > 8 files.

**Never:** assume scope · mark a layer done without running acceptance · push migrations without confirming · commit secrets or `.env`.

### Git

Branches: `main`, `feat/L{n}-{description}`, `fix/{description}`. Commits: `feat(L{n}): {layer name}` for layer completions, `feat(scope): description` otherwise. **One concern per commit.** Tag `v1.0.0` after Layer 7 ships.

## Database Quick Reference

**Tables:** profiles, categories, machines, bookings, ai_usage, notifications.
**Enums:** `user_role`, `language_code`, `machine_category`, `machine_condition`, `machine_status`, `booking_status`, `duration_unit`.

**Key constraints:** `bookings` EXCLUDE on `(machine_id, time_range)` for active statuses → **no double-booking, ever** · `machines.is_currently_available` → real-time broadcast column · `profiles.id` → `auth.users.id`.

**RLS philosophy:** read what's yours or public; write only what's yours; sensitive transitions through edge functions.

## Reference Documents

> **Read-on-demand rule.** The PRD is split into 11 part files under [`docs/`](docs/). Before editing any code in a given domain, **open the matching part file and re-read it.** The split is byte-exact (concat reproduces the original [`PRD-claude-code.md`](PRD-claude-code.md)), so no section is "incomplete." Read the layer file that matches the code you're touching, not the whole PRD.

### Always-read

| Document | When |
|---|---|
| [`docs/00-overview.md`](docs/00-overview.md) | Start of every session. Tech-stack allowlist, domain glossary, the 8-layer rule, the "never skip ahead" guardrail. |
| [`docs/10-claude-code-tactical.md`](docs/10-claude-code-tactical.md) | Start of every session. Session habits, what to do when stuck, what to ask the user. |
| [`tasks/todo.md`](tasks/todo.md) | Start of every session. Current layer + checklist + Completed Work Log. **Finish current layer before starting the next.** |

### Read-when-touching-this-domain

Open the matching file *before* writing or modifying code in that area. If a change spans two layers, read both — but stop and ask the user whether scope is right before coding (per the "Hard stops" rule).

| Touching… | Open this file |
|---|---|
| Project bootstrap, deps, NativeWind, `app.json`, Supabase client wiring, `.env`, the L0 health-check screen | [`docs/01-layer-0-skeleton.md`](docs/01-layer-0-skeleton.md) |
| Auth (sign-up/in/out), the `profiles` or `categories` tables, role selection, route groups `(auth)`/`(renter)`/`(owner)`, `authStore`, profile RLS | [`docs/02-layer-1-auth.md`](docs/02-layer-1-auth.md) |
| `machines` table, discover feed, machine card, machine detail screen, money/geohash/distance utils, location store, seed script | [`docs/03-layer-2-listings.md`](docs/03-layer-2-listings.md) |
| `bookings` table, the `EXCLUDE` constraint, `tstzrange` parsing, pricing math, `create-booking`/`respond-to-booking` edge functions, renter book flow, owner Requests tab | [`docs/04-layer-3-booking.md`](docs/04-layer-3-booking.md) |
| Storage buckets/policies, image upload + compression, machine create/edit/delete, Add Machine multi-step flow, `addMachineStore` | [`docs/05-layer-4-owner-crud-photos.md`](docs/05-layer-4-owner-crud-photos.md) |
| `is_currently_available`, `useAvailability`, `AvailabilityBadge`, the `supabase_realtime` publication, the pg_cron reconciler | [`docs/06-layer-5-realtime.md`](docs/06-layer-5-realtime.md) |
| Anything calling Groq, the `_shared/groq.ts` helper, `ai_usage` rate limiter, the four AI edge functions, `AIButton`, the four AI client components | [`docs/07-layer-6-ai-features.md`](docs/07-layer-6-ai-features.md) |
| i18n (`en.json`/`kn.json`, `useTranslation`), language toggle, polish sweep (skeletons, toasts, splash, icons), `reset-and-seed`, EAS APK build | [`docs/08-layer-7-i18n-polish-apk.md`](docs/08-layer-7-i18n-polish-apk.md) |
| Cross-checking the final repo layout — what folder a new file should go in, whether something is missing | [`docs/09-final-directory.md`](docs/09-final-directory.md) |

### Other references

| Document | When |
|---|---|
| [`PRD-claude-code.md`](PRD-claude-code.md) | When you need the full PRD as one scrollable document or for byte-exact verification. The split parts under `docs/` are the day-to-day reading surface. |
| `PRD-textual.md` | When questioning a *product* decision (the "why," not the "how"). Does not exist yet — created later if needed. |
| `docs/prototype.html` | Visual reference for screens, palette, interactions. Does not exist yet — added with design assets. |
| [`docs/README.md`](docs/README.md) | Index of the split files; useful when a topic doesn't obviously map to one layer. |

**Hard rule:** if you're about to edit a file and you haven't read the matching layer doc *in this session*, read it first. The split is small per part — opening one is cheap; getting the layer wrong is not.
