<div align="center">

<img src="assets/icon.png" alt="Namma-Yantra Share" width="120" />

# Namma-Yantra Share

**"Uber for Tractors" — a peer-to-peer farm machinery rental marketplace for Karnataka.**

Connect farmers who own idle equipment with small farmers who need it — without middlemen, without phone-tag, without guesswork.

[![Platform](https://img.shields.io/badge/platform-Android-3DDC84?style=flat-square&logo=android&logoColor=white)](https://expo.dev)
[![Built with Expo](https://img.shields.io/badge/Expo-SDK%2054-000020?style=flat-square&logo=expo&logoColor=white)](https://expo.dev)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Realtime-3FCF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![Groq AI](https://img.shields.io/badge/Groq-LLaMA%203.3-F54F00?style=flat-square)](https://groq.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Status](https://img.shields.io/badge/Status-Layer%200%20%2F%208-B8862C?style=flat-square)](#build-layers)

---

*Built for the MindMatrix VTU Internship Program — Project 51*

</div>

---

## The Problem

Small farmers in rural Karnataka cannot afford to buy tractors, harvesters, or sprayers. Large farmers own this equipment but it sits idle for ~20 days a month. The current rental market is broken — informal middlemen take 20–30% cuts, pricing is opaque, availability is unknowable unless you walk to the owner's house, and trust doesn't extend past your immediate village.

**Namma-Yantra Share removes the middleman entirely.** Owners list machines in 60 seconds, renters find and book in 3 taps, and AI handles the friction points neither party wants to deal with.

---

## Features

### For Renters (Small Farmers)

| Feature | Description |
|---|---|
| **Distance-Aware Discovery** | Browse machines sorted by GPS distance. Filter by category — Tractors, Harvesters, Sprayers, Tillers |
| **Live Availability** | Green/gray badge updates in real-time via Postgres Changes. No stale listings |
| **Transparent Pricing** | Hourly and daily rates shown side by side. Price formula displayed explicitly: `3 days × ₹3,500 = ₹10,500` |
| **Booking Calendar** | Date-range picker with booked dates blocked in red. Double-booking is structurally impossible — enforced by a Postgres `EXCLUDE` constraint |
| **Machine Detail** | Image carousel, specs, condition report (AI-assessed from photo), and owner profile |
| **AI Crop Recommender** | Tell it your crop, land size, and task — it recommends the right machine type, estimated hours, and cost range |
| **My Bookings** | All bookings in one place with status tabs: Pending / Accepted / Past |
| **Push Notifications** | Notified the moment an owner accepts or declines |

### For Owners (Machine Operators)

| Feature | Description |
|---|---|
| **Quick Listing** | Add a machine in 3 steps: photos → specs → pricing |
| **AI Price Suggester** | Recommends a fair hourly + daily rate based on machine type, age, and your district |
| **AI Listing Copy** | Generates a title and bilingual description (English + Kannada) from your machine specs |
| **AI Condition Report** | Take one photo of your machine — AI assesses visible condition and generates a detailed report that builds renter trust |
| **Request Management** | See all incoming bookings with renter details. Accept or decline with one tap |
| **Earnings Dashboard** | Total earnings, monthly bar chart, per-machine breakdown |
| **Availability Control** | Pause or archive listings without deleting them |

### Shared

- **Bilingual UI** — every screen in English or Kannada, togglable from profile, persists across sessions
- **Offline Graceful** — cached data readable; clear offline banner; nothing silently fails
- **Earthy Design** — mustard ochre + forest green + warm cream palette, custom machinery icons, high-contrast for outdoor use

---

## AI Features

All AI runs through Supabase Edge Functions — the Groq API key never touches the client.

```
Owner side                              Renter side
─────────────────────────────           ─────────────────────────────
AI Price Suggester                      AI Crop Recommender
  ↳ Input: category, brand, district     ↳ Input: crop, acres, task
  ↳ Output: ₹/hr rate + reasoning        ↳ Output: machine type + hours + cost

AI Listing Copy Generator              
  ↳ Input: machine specs + photos      
  ↳ Output: title + EN + KN desc       

AI Condition Report                    
  ↳ Input: machine photo               
  ↳ Output: rating + summary + issues  
```

All four features degrade gracefully — if AI is offline or rate-limited, the form continues to work with manual input. Responses are JSON-validated by Zod before touching the UI.

---

## Real-Time Architecture

The technical centerpiece is the live availability badge. When an owner accepts a booking on one phone, the green dot on a renter's screen turns gray **within ~1 second** — without the renter refreshing.

```
Owner accepts booking
  → respond-to-booking Edge Function
    → UPDATE machines SET is_currently_available = false
      → Postgres WAL change
        → Supabase Realtime broadcast
          → useAvailability() hook on renter's device
            → AvailabilityBadge re-renders
```

This uses **Supabase Postgres Changes** — not Firebase RTDB, not a custom WebSocket, not polling. One column update, one broadcast, one re-render.

A `pg_cron` job reconciles any drift every 15 minutes:
```sql
UPDATE machines m
SET is_currently_available = NOT EXISTS (
  SELECT 1 FROM bookings b
  WHERE b.machine_id = m.id
    AND b.status = 'accepted'
    AND b.time_range @> NOW()
);
```

---

## Booking Conflict Prevention

Booking conflicts are prevented **at the database level** using Postgres's `EXCLUDE` constraint — not in application code. This means double-booking is structurally impossible regardless of race conditions or malicious clients.

```sql
CONSTRAINT no_overlapping_bookings
  EXCLUDE USING gist (
    machine_id WITH =,
    time_range WITH &&
  )
  WHERE (status IN ('pending', 'accepted'))
```

If two renters race to book the same machine for overlapping dates, the second insert is rejected with a `23P01` conflict error — caught by the edge function and returned to the client as a clean `CONFLICT` error code.

---

## Tech Stack

### Frontend

| Layer | Technology |
|---|---|
| Framework | React Native + Expo SDK 54 |
| Routing | expo-router (file-based, typed) |
| Language | TypeScript (strict mode) |
| Styling | NativeWind v4 (Tailwind for RN) |
| Server State | TanStack Query |
| Client State | Zustand |
| Forms | React Hook Form + Zod |
| Maps | react-native-maps (Google Maps) |
| Calendar | react-native-calendars |
| Icons | lucide-react-native + custom SVG machinery icons |
| i18n | i18next + react-i18next |
| Date utils | date-fns |

### Backend

| Layer | Technology |
|---|---|
| Database | Supabase Postgres |
| Auth | Supabase Auth (email/password) |
| Real-time | Supabase Postgres Changes |
| Storage | Supabase Storage (machine images, condition reports) |
| Server functions | Supabase Edge Functions (Deno) |
| Security | Row Level Security (RLS) on all tables |
| Scheduling | pg_cron (availability reconciliation) |

### AI

| Model | Used for |
|---|---|
| `llama-3.3-70b-versatile` | Price suggestions, listing copy, crop recommendations |
| `llama-3.2-90b-vision-preview` | Condition report from photo |

### Infrastructure

| Concern | Tool |
|---|---|
| Android APK | EAS Build |
| Push Notifications | Expo Push + FCM |
| Path aliasing | `@/*` → `./src/*` |

---

## Data Model

```
profiles          — user accounts (owner / renter / both), language pref, location
categories        — seeded reference data (tractor, harvester, sprayer, tiller, other)
machines          — listings with pricing, location, condition, is_currently_available
bookings          — rental records with tstzrange time window + EXCLUDE constraint
ai_usage          — per-user AI call rate limiting (50 calls / 24h / function)
notifications     — push notification queue with delivery tracking
```

**Money convention:** all currency values stored as **integer paise** (₹1 = 100 paise). No floating-point arithmetic ever touches money.

**Time convention:** booking windows stored as Postgres `tstzrange`, not separate start/end timestamps. This enables range-aware overlap detection natively in SQL.

---

## Project Structure

```
namma-yantra/
├── app/                      # expo-router screens
│   ├── (auth)/               # Login, signup, role-select
│   ├── (renter)/             # Discover, bookings, AI helper, profile
│   └── (owner)/              # Listings, requests, earnings, profile
├── src/
│   ├── integrations/
│   │   └── supabase/         # Only place supabase-js is imported directly
│   ├── components/
│   │   ├── ui/               # Card, Badge, Button, EmptyState (shared)
│   │   ├── machine/          # MachineCard, AvailabilityBadge, ConditionBadge
│   │   ├── booking/          # PriceCalculator, DateRangePicker, BookingCard
│   │   └── ai/               # AIButton, PriceSuggester, DescriptionGenerator
│   ├── hooks/                # TanStack Query hooks for all data fetching
│   ├── stores/               # Zustand: authStore, locationStore, addMachineStore
│   ├── lib/                  # Pure utilities: money, range, pricing, distance, geohash
│   ├── types/                # database.ts — Postgres-mirroring TypeScript types
│   ├── theme/                # colors, typography, spacing
│   ├── i18n/                 # en.json, kn.json
│   └── constants/            # districts, brands, crops
├── supabase/
│   ├── migrations/           # SQL migrations (append-only)
│   └── functions/            # Edge functions (Deno)
│       ├── _shared/          # groq.ts, cors helpers, JWT verification
│       ├── create-booking/
│       ├── respond-to-booking/
│       ├── ai-suggest-price/
│       ├── ai-listing-copy/
│       ├── ai-crop-recommend/
│       └── ai-condition-report/
├── scripts/
│   ├── seed.ts
│   └── reset-and-seed.ts
└── docs/                     # Full PRD split across build layers
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- Expo Go v54 on a physical Android device (or Android emulator)
- Supabase account (free tier)
- Groq account (free tier — added in Layer 6)

### Setup

```bash
# 1. Clone and install
git clone https://github.com/yourusername/namma-yantra
cd namma-yantra
npm install

# 2. Set up environment variables
cp .env.example .env
# Fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
# from your Supabase project's API settings

# 3. Link Supabase CLI
npx supabase link --project-ref <your-project-ref>

# 4. Apply database migrations
npx supabase db push

# 5. Seed demo data
SUPABASE_SERVICE_ROLE_KEY=<key> npm run seed

# 6. Run the app
npx expo start --android       # emulator
npx expo start --tunnel        # physical device on different network
```

Scan the QR code with Expo Go on your Android device.

### Demo Accounts

After running the seed script, two accounts are available:

| Role | Email | Password |
|---|---|---|
| Owner | `owner@demo.com` | `demo1234` |
| Renter | `renter@demo.com` | `demo1234` |

To restore a clean demo state at any time: `npm run reset-and-seed`

---

## Development Commands

```bash
npm run start           # Expo dev server
npm run android         # Start with Android target
npm run typecheck       # tsc --noEmit
npm run lint            # ESLint
npm run seed            # Seed demo data
npm run reset-and-seed  # Wipe DB + storage, reseed

# Supabase
supabase migration new <name>
supabase db push
supabase functions deploy <fn-name> --no-verify-jwt
supabase secrets set GROQ_API_KEY=<key>

# Build
eas build --platform android --profile preview
```

---

## Build Layers

The app is built in **8 incremental layers**. Each layer ends with a fully working, demostrable app.

| Layer | Name | Deliverable |
|---|---|---|
| **L0** | Project skeleton | App runs, Supabase connected, all tooling configured |
| **L1** | Auth + role selection | Sign up, pick role (owner/renter), land on home |
| **L2** | Listings — read only | Browse seeded machines, view detail screen |
| **L3** | Booking flow | Renter books, owner accepts/declines, conflict prevention |
| **L4** | Owner CRUD + photos | Owner creates/edits listings with real image upload |
| **L5** | Real-time availability | Live green/gray badge across devices |
| **L6** | AI features | All 4 Groq features working end-to-end |
| **L7** | i18n + polish + APK | Kannada, visual polish, EAS Android build |

Current layer: see [`tasks/todo.md`](tasks/todo.md)

---

## Design System

The UI is intentionally **earthy and rugged** — built for farmers who use their phones outdoors, sometimes with dirty hands.

| Token | Value | Usage |
|---|---|---|
| Primary | `#B8862C` mustard ochre | CTAs, prices, active states |
| Accent | `#2D5F3F` forest green | Accepted states, growth indicators |
| Background | `#FAF6ED` warm cream | App background |
| Ink | `#1A1A1A` rich black | Primary text |
| Available | `#3CB371` sage green | Live availability dot |

**Typography:** Cormorant Garamond (display) + Inter (body) + JetBrains Mono (prices/numbers)

**Accessibility:** all tap targets ≥ 44×44 pt, status badges always combine icon + color + text (never color alone), high contrast for sunlight readability.

---

## Documentation

| File | Description |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | Coding conventions, architecture rules, workflow. The development bible. |
| [`docs/00-overview.md`](docs/00-overview.md) | Product vision, problem statement, personas |
| [`docs/01–07-*.md`](docs/) | Full PRD by build layer — each file contains specifications, code samples, and acceptance criteria |
| [`PLAN.md`](PLAN.md) | 8-layer roadmap with day-by-day timeline |
| [`tasks/todo.md`](tasks/todo.md) | Current layer checklist + completed work log |

---

## License

Private — MindMatrix VTU Internship Program, Project 51.

---

<div align="center">

Built with ♥ for Karnataka's farming communities

**Groq** · **Supabase** · **Expo** · **React Native**

</div>