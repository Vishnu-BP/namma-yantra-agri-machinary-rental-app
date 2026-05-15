---

# Working with Claude Code: tactical guidance

## Before each session
1. Tell Claude Code: "Read `CLAUDE.md` and `PRD.md` first."
2. Tell it which layer you're on: "We're building Layer X. Show me what's done so far before writing new code."
3. Have it run `git status` to see uncommitted changes from last session.

## During a session
- After Claude implements something, ask it to **run the acceptance criteria for the current layer**. Don't take its word that it works.
- If a layer's acceptance fails: don't move on. Make Claude debug.
- If you see Claude introducing a new dependency or pattern not in this PRD, push back.
- Migrations must always go through `supabase migration new <name>` then `supabase db push`. Never edit the database directly via the dashboard except for one-off testing.

## After each layer
- Run the full acceptance checklist yourself
- Commit with the exact format: `feat(L{n}): {layer name}`
- Push to GitHub
- If anything broke from a previous layer: stop, fix, re-test before moving on

## When stuck
- Re-read the relevant section of this PRD
- If a piece of code isn't working: ask Claude to add console.logs, run, share output
- If Supabase is misbehaving: check the dashboard's logs (SQL editor for queries, Edge Functions → Logs for function errors, Database → Logs for connection issues)
- If RLS is blocking a legitimate query: don't disable RLS — find the right policy expression
- If the app crashes on launch: clear Expo cache (`npx expo start --clear`) and rebuild

---

**End of PRD. Total estimated time: 21 working days. Hand this document to Claude Code along with `CLAUDE.md`, and start with Layer 0.**

