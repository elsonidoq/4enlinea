---
name: Dev environment setup — DecodeC4
description: Local dev environment is fully configured and working as of 2026-05-01
type: project
originSessionId: 5719c43c-8011-4e5d-a333-7894384b241b
---
Local dev environment is complete and working as of 2026-05-01.

**What's set up:**
- `connect-four/server/.env` — has SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, PORT=3001, DATABASE_URL
- `connect-four/.env.local` — VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_BASE_URL (empty — relies on Vite proxy)
- Vite proxies `/api/*` → `http://localhost:3001`
- Server starts via `node --env-file=server/.env server/index.js` (dotenv loaded via Node flag, not a library)
- All 5 migrations applied (001_initial, 002_explanation_cache, 003_puzzles, 005_coach, 006_session_stats)
- `npm test` runs 31 tests across 3 files — all passing

**Why:** Setting up the project for the first time following specs/001-decodec4-mvp/quickstart.md.

**How to apply:** When picking up dev work, assume environment is configured. Run `npm run dev` from `connect-four/` to start.
