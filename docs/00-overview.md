# Namma-Yantra Share — Build PRD for Claude Code (Supabase Edition)

> **You are Claude Code helping me build Namma-Yantra Share, a peer-to-peer farm machinery rental marketplace for Karnataka. This document is your single source of truth. Read the entire document before writing any code. Build in the layers specified — never skip ahead.**

---

## Document metadata

- **Project owner:** Vishnu (final-year CSE intern at Scaleswift, MindMatrix VTU intern)
- **Stack:** React Native + Expo SDK 51+ · TypeScript · Supabase · Groq AI
- **Timeline:** 3 weeks
- **Submission:** Android APK via EAS Build
- **This is a portfolio project** — code quality matters as much as features

---

## How to use this document

This PRD is structured as **eight build layers**. Each layer:

1. **Has a clear goal** — what new capability we're adding
2. **Lists prerequisites** — what must exist before starting
3. **Specifies exact deliverables** — files, components, functionality
4. **Defines "done"** — concrete acceptance criteria you must verify
5. **Ends in a working app** — you can run `npx expo start` and demo it

**Rules for Claude Code:**

- ✅ Always finish a layer completely before starting the next
- ✅ At the end of each layer, run the app and verify acceptance criteria
- ✅ Commit after each layer with the message format: `feat(L{n}): {layer name}`
- ✅ Ask before making architectural decisions not specified here
- ❌ Never skip ahead to add a future layer's feature mid-current-layer
- ❌ Never use a library not on the approved list without asking
- ❌ Never bypass TypeScript with `any` — if a type is hard, ask
- ❌ Never use Drizzle, Prisma, or any ORM — direct supabase-js only

---

## Approved tech stack (DO NOT deviate without asking)

### Frontend
- `expo` (SDK 51+), `expo-router` (file-based routing), `expo-location`, `expo-image-picker`, `expo-image-manipulator`, `expo-notifications`, `expo-secure-store`, `expo-image`
- `react-native`, `react`
- `typescript`
- `nativewind` + `tailwindcss` for styling
- `zustand` for client state
- `@tanstack/react-query` for server state
- `react-hook-form` + `zod` + `@hookform/resolvers/zod` for forms
- `react-native-maps` for maps
- `react-native-calendars` for the booking calendar
- `i18next` + `react-i18next` for localization
- `lucide-react-native` for icons
- `date-fns` for date math
- `@react-native-async-storage/async-storage` for Supabase session persistence

### Backend
- `@supabase/supabase-js` (v2+)
- Supabase Edge Functions (Deno runtime, TypeScript)
- Groq via direct fetch in edge functions (no SDK install needed; we'll use `@groq/groq-sdk` via esm.sh in Deno)
- `zod` for response validation in edge functions

### Dev tooling
- `eslint` + `prettier` (Expo defaults)
- `supabase` CLI (for local development and deploys)
- `eas-cli` (for builds)

**If you think you need anything else, stop and ask first.**

---

## Domain glossary (use these terms consistently)

| Term | Meaning |
|---|---|
| **Machine** | The rentable equipment (tractor, harvester, sprayer, tiller) |
| **Owner** | User who lists machines for rent |
| **Renter** | User who books machines |
| **Listing** | A row in the `machines` table |
| **Booking** | A row in the `bookings` table |
| **Availability** | Boolean column `is_currently_available` on machines table |
| **Request** | A booking with `status='pending'` |
| **RLS** | Row Level Security — Postgres's policy system |
| **Edge Function** | Supabase serverless function (Deno + TS) |
| **KVK** | Krishi Vigyana Kendra — agricultural extension center |

---

## Build layer overview

```
Layer 0 ─ Project skeleton            (Day 1)         → app runs, Supabase connected
Layer 1 ─ Auth + role selection       (Day 2)         → can sign up, pick role
Layer 2 ─ Listings (read-only)        (Day 3-4)       → can browse seeded machines
Layer 3 ─ Booking flow                (Day 5-6)       → renter books, owner accepts/declines
Layer 4 ─ Owner CRUD + photos         (Day 7-8)       → owner can create real listings
Layer 5 ─ Real-time availability      (Day 9)         → green/gray dot live updates
Layer 6 ─ AI features (4 of them)     (Day 10-13)     → all AI working end-to-end
Layer 7 ─ i18n + polish + APK         (Day 14-21)     → Kannada + final polish + ship
```

**Critical rule:** the app must be runnable and demoable at the end of every layer. If it's broken, fix it before moving on.

---
