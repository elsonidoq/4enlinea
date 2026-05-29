---
name: supabase-explicit-grants
description: Migration 012 adds explicit GRANTs for frontend-accessed tables; required before Supabase enforces this on Oct 30 2026
metadata: 
  node_type: memory
  type: project
  originSessionId: 157167e0-4364-4db5-94fe-0d3fd9b74bb5
---

Migration `012_explicit_grants.sql` was applied on 2026-05-13.

**Why:** Supabase is removing auto-grants on public schema tables. After Oct 30 2026, PostgREST returns a 42501 error for any table without explicit grants. The frontend uses the anon/authenticated key directly for three tables.

**Grants added:**
- `users` → `SELECT, UPDATE` to `authenticated`
- `session_stats` → `SELECT, INSERT, UPDATE` to `authenticated`
- `puzzle_attempts` → `INSERT, SELECT` to `authenticated`

**How to apply:** Already applied. For any future new tables accessed by the frontend, add explicit grants as part of the migration.

**Not needed for:** Backend-only tables (`tracks`, `stripe_events`, `explanation_cache`, `puzzles`, `blunders`, `candidates`, `false_positive_records`) — server uses `service_role` key which bypasses RLS and grants entirely.
