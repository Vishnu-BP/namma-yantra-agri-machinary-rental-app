# Namma-Yantra Share

Peer-to-peer farm machinery rental marketplace for Karnataka — "Uber for Tractors." Bilingual (English + Kannada), built for small farmers with limited literacy.

> **Status:** Layer 0 (project skeleton). See [`tasks/todo.md`](tasks/todo.md) for the current build phase. The 8-layer build plan is in [`docs/`](docs/).

## Stack

- **Frontend:** React Native + Expo SDK 54, expo-router, TypeScript (strict), NativeWind v4, Zustand, TanStack Query, React Hook Form + Zod
- **Backend:** Supabase (Postgres + Auth + Realtime + Storage + Edge Functions)
- **AI:** Groq (`llama-3.3-70b-versatile` text, `llama-3.2-90b-vision-preview` vision) — added in Layer 6
- **Build:** EAS Build for Android APK — Layer 7

## Setup

Prerequisites: Node 20+, Expo Go v54 on a physical Android device (or Android emulator).

```bash
# 1. Install deps
npm install

# 2. Fill in Supabase credentials
cp .env.example .env
# Edit .env with EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY

# 3. Link the Supabase CLI to your project
npx supabase link --project-ref <your-project-ref>

# 4. Run the app
npx expo start --tunnel    # tunnel mode if LAN doesn't reach your phone
# or
npx expo start --android   # emulator on the same machine
```

Open the QR code in Expo Go v54.

## Useful scripts

```bash
npm run start         # Expo dev server
npm run android       # Dev server with Android device target
npm run typecheck     # tsc --noEmit
npm run lint          # ESLint (Expo flat config)
```

## Reference docs

- [`CLAUDE.md`](CLAUDE.md) — coding conventions and architecture rules (the bible).
- [`docs/00-overview.md`](docs/00-overview.md) → [`docs/10-claude-code-tactical.md`](docs/10-claude-code-tactical.md) — full PRD split by build layer.
- [`PLAN.md`](PLAN.md) — full 8-layer roadmap.
- [`PLAN-L0.md`](PLAN-L0.md) — current layer plan.
- [`tasks/todo.md`](tasks/todo.md) — current layer checklist + completed work log.

## Project conventions (excerpt — see CLAUDE.md for the full list)

- Direct `supabase-js` only — no ORM.
- All money values stored as integer paise (₹1 = 100 paise).
- Booking time windows use Postgres `tstzrange` with an `EXCLUDE` constraint to make double-booking structurally impossible.
- Real-time availability via Supabase Postgres Changes broadcast on a single column.
- Path alias `@/*` → `./src/*` everywhere; no `../..` imports.
- Tagged logger only — no raw `console.log`.

## License

Private — internship project (MindMatrix VTU).
