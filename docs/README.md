# Namma-Yantra Share — PRD index

This folder holds the project PRD ([PRD-claude-code.md](../PRD-claude-code.md)) split into 11 sequential parts at the natural `---` boundaries. Concatenating all 11 in the order below reproduces the original file byte-for-byte (verified with `diff`). Read in order on first pass; jump to the relevant layer file thereafter.

| # | Section | File | What's inside |
|---|---|---|---|
| 0 | Overview | [00-overview.md](00-overview.md) | Document metadata, how-to-use rules, approved tech stack, domain glossary, the 8-layer build overview diagram. |
| 1 | Layer 0 — Project skeleton | [01-layer-0-skeleton.md](01-layer-0-skeleton.md) | Expo init, deps, NativeWind/Babel config, folder skeleton, `.env`, Supabase client, theme constants, root layout + landing screen, README/CLAUDE.md, acceptance checklist. |
| 2 | Layer 1 — Auth + role selection | [02-layer-1-auth.md](02-layer-1-auth.md) | `init_profiles` migration, types, auth Zustand store, auth service + listener hook, route groups, login/signup/role-select screens, home placeholders. |
| 3 | Layer 2 — Listings (read-only) | [03-layer-2-listings.md](03-layer-2-listings.md) | `init_machines` migration, `Machine` types, money/geohash/distance utils, machines query layer, TanStack hooks, location store, UI primitives, `MachineCard`, renter tabs + discover + detail, seed script. |
| 4 | Layer 3 — Booking flow | [04-layer-3-booking.md](04-layer-3-booking.md) | `init_bookings` migration with the `EXCLUDE` constraint, range/pricing/conflict utils, `create-booking` + `respond-to-booking` edge functions, hooks, multi-step renter booking flow, owner requests tab. |
| 5 | Layer 4 — Owner CRUD + photos | [05-layer-4-owner-crud-photos.md](05-layer-4-owner-crud-photos.md) | Storage buckets + policies, image upload utils with compression, machine CRUD, multi-step Add Machine flow, edit/delete with storage cleanup. |
| 6 | Layer 5 — Real-time availability | [06-layer-5-realtime.md](06-layer-5-realtime.md) | Realtime publication, `useAvailability` hook, `AvailabilityBadge`, discover-feed channel + cache patching, scheduled `sync_machine_availability` via pg_cron. |
| 7 | Layer 6 — AI features | [07-layer-6-ai-features.md](07-layer-6-ai-features.md) | Shared Groq helper, `ai_usage` rate-limit table, AI button component, four edge functions: price suggester, listing copy, crop recommender, vision condition report. |
| 8 | Layer 7 — i18n + polish + APK | [08-layer-7-i18n-polish-apk.md](08-layer-7-i18n-polish-apk.md) | i18n setup, `en.json`/`kn.json`, language toggle, visual polish + error sweep, reset-and-seed script, EAS APK build, final README. |
| 9 | Final directory reference | [09-final-directory.md](09-final-directory.md) | Tree showing the expected repo layout once all 8 layers ship. |
| 10 | Working with Claude Code: tactical guidance | [10-claude-code-tactical.md](10-claude-code-tactical.md) | Session habits: what to read first, how to enforce acceptance criteria, what to do when stuck. |

## Verifying the split

```bash
cat docs/00-overview.md \
    docs/01-layer-0-skeleton.md \
    docs/02-layer-1-auth.md \
    docs/03-layer-2-listings.md \
    docs/04-layer-3-booking.md \
    docs/05-layer-4-owner-crud-photos.md \
    docs/06-layer-5-realtime.md \
    docs/07-layer-6-ai-features.md \
    docs/08-layer-7-i18n-polish-apk.md \
    docs/09-final-directory.md \
    docs/10-claude-code-tactical.md \
    | diff -q - PRD-claude-code.md
```

Should print nothing (files identical). Total line count: 4087.

## Notes

- The original [PRD-claude-code.md](../PRD-claude-code.md) is unchanged. Splits are copies, not moves — no content is lost or replaced.
- Splits happen at the existing `---` separators that the PRD already uses between layers, so each part is a complete, self-contained section.
- When CLAUDE.md says "read PRD.md," the file under that name is `PRD-claude-code.md` in the project root; these split files are the same content reorganized for skim-by-layer reading.
