---
name: supabase-explicit-grants
description: Migration 012 adds explicit GRANTs for frontend-accessed tables; required before Supabase enforces this on Oct 30 2026
metadata: 
  node_type: memory
  type: project
  originSessionId: 157167e0-4364-4db5-94fe-0d3fd9b74bb5
---

**Why this matters:** Supabase is removing auto-grants on public schema tables. After Oct 30 2026, PostgREST returns a 42501 error for any table without explicit grants.

**Frontend-accessed tables (require explicit grants):**
- `users` → `SELECT, UPDATE` to `authenticated`
- `session_stats` → `SELECT, INSERT, UPDATE` to `authenticated`
- `puzzle_attempts` → `INSERT, SELECT` to `authenticated`

**Rule:** For any future new table accessed by the frontend, add explicit grants as part of its migration.

**Not needed for:** Backend-only tables (`tracks`, `stripe_events`, `explanation_cache`, `puzzles`, `blunders`, `candidates`, `false_positive_records`) — server uses `service_role` key which bypasses RLS and grants entirely.
