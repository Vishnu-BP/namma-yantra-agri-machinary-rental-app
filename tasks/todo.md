# tasks/todo.md — Namma-Yantra Share

> Active layer + checklist. CLAUDE.md workflow:
> 1. Implement one item at a time.
> 2. Mark `[x]` when done.
> 3. Move completed items into "Completed Work Log" at the bottom — never delete.
> 4. After each item, briefly explain what changed and why (one paragraph in commit body or PR).

## Current layer: **Layer 0 — Project skeleton**

Plan reference: [PLAN-L0.md](../PLAN-L0.md) and the latest version at [`~/.claude/plans/ok-bud-now-we-recursive-starlight.md`](#).

### Phase 1 — Pre-flight & scaffold

- [x] Stash docs (`PRD-claude-code.md` (since deleted), `CLAUDE.md`, `PLAN.md`, `PLAN-L0.md`, `docs/`) out of project dir
- [x] Run `npx create-expo-app@latest . --template default`
- [x] Verify Expo SDK 54 (resolved to `54.0.33`)
- [x] Verify Expo Go v54 connects via tunnel mode
- [x] Delete sample template files (`app/(tabs)`, `app/modal.tsx`, root `components/hooks/constants/`, `react-logo*` images, `scripts/reset-project.js`)
- [x] Restore docs to project root, remove stash
- [x] Rewrite `app/_layout.tsx` to minimal placeholder; create `app/index.tsx` placeholder
- [x] Rename git branch `master` → `main`
- [x] Update `.gitignore` to ignore `.env` and `.env.*` while keeping `.env.example`

### Phase 2 — Deps + config

- [x] Install JS deps: zustand, @tanstack/react-query, react-hook-form, zod, @hookform/resolvers, lucide-react-native, i18next, react-i18next, date-fns, @supabase/supabase-js, nativewind
- [x] Install native deps via `expo install`: expo-location, expo-image-picker, expo-image-manipulator, expo-notifications, expo-secure-store, @react-native-async-storage/async-storage, react-native-url-polyfill, react-native-svg, react-native-maps, react-native-calendars
- [x] Install devDeps: tailwindcss, babel-plugin-module-resolver, supabase (CLI as devDep)
- [x] `npx expo install --fix` exits clean
- [x] `tsconfig.json` paths: `@/*` → `./src/*`; nativewind types included
- [x] Create `babel.config.js` (NativeWind v4 + module-resolver)
- [x] Create `metro.config.js` (NativeWind v4 wrapper)
- [x] Create `tailwind.config.js` (brand palette + nativewind preset)
- [x] Create `global.css` (tailwind directives) + import in `app/_layout.tsx`
- [x] Create `nativewind-env.d.ts`
- [x] Rewrite `app.json` (name, slug, scheme, package, permissions, plugins)
- [x] Add `typecheck` script to `package.json`
- [x] `npm run typecheck` exits 0
- [x] `npm run lint` exits 0

### Phase 3 — Source skeleton

- [x] Create `src/` folder tree with `.gitkeep` placeholders
- [x] Write `src/lib/logger.ts`
- [x] Write `src/theme/colors.ts`
- [x] Write `src/integrations/supabase/client.ts`
- [x] Write `src/integrations/supabase/index.ts` (folder barrel)
- [x] Replace scaffold `README.md` with project description
- [x] Seed this `tasks/todo.md`

### Phase 4 — Supabase wiring

- [x] Vishnu created Supabase project `Namma Yantra` in `ap-southeast-1` (Singapore — note: PRD recommended `ap-south-1`/Mumbai; ~30 ms latency tradeoff)
- [x] Vishnu disabled email confirmation in Auth → Providers → Email
- [x] `.env` written with `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY` (gitignored)
- [x] `.env.example` written with empty values (committed)
- [x] `.mcp.json` configured for Supabase hosted MCP (`https://mcp.supabase.com/mcp`)
- [x] MCP connection verified via `list_projects` — project ref `vgyivfjbkgvpibhrylzp`, status ACTIVE_HEALTHY
- [x] `supabase/config.toml` initialized (local CLI ready as fallback for L1+ workflows)
- [x] `supabase/.gitignore` standard (excludes `.temp`, `.branches`, local env files)
- ~~`npx supabase login`~~ — superseded by MCP, deferred until needed
- ~~`npx supabase link --project-ref <ref>`~~ — superseded by MCP, deferred until needed

### Phase 5 — Routes + landing + acceptance + commit

- [ ] Rewrite `app/_layout.tsx`: SafeAreaProvider + QueryClientProvider + StatusBar + Stack
- [ ] Rewrite `app/index.tsx`: health-check screen using `supabase.from('_health').select('*')`
- [ ] App launches on Expo Go v54 with no red error overlay
- [ ] Status text shows "Connected to Supabase ✓"
- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0
- [ ] `grep -rn "console\\.log" src app` returns nothing
- [ ] `grep -rn "from '\\.\\./\\.\\." src app` returns nothing
- [ ] `git status` clean of `.env`
- [ ] Commit: `feat(L0): project skeleton with Supabase initialized`

---

## Completed Work Log

_Items move here after the layer's commit lands. Don't delete — this is the audit trail._

(Layer 0 entries land here once §Phase 5 commit is pushed.)
