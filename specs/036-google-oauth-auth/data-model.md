# Data Model: Google OAuth Authentication

**Feature**: 036-google-oauth-auth

## Summary

No database schema changes. This feature adds a stateless redirect endpoint and rewrites client-side UI only.

## Unchanged Entities

| Entity | Table | Status |
|--------|-------|--------|
| Users | `public.users` | Unchanged |
| Auth sessions | Supabase `auth.sessions` | Unchanged — Supabase manages OAuth session storage transparently |
| Auth identities | Supabase `auth.identities` | Unchanged — Supabase creates a Google identity row on first sign-in automatically |
| Puzzle attempts | `puzzle_attempts` | Unchanged |
| `explanation_cache` | `explanation_cache` | Unchanged |

## Session Flow (no schema change)

The httpOnly cookie set by `POST /api/auth/callback` is `sb_access_token`. This cookie is already in use; no new cookie keys are added.

Supabase creates a `google` identity in `auth.identities` on first sign-in. This is fully managed by Supabase and requires no application-level migration or schema change.

## Anonymous → Signed-In Migration

`IndexedDBStore.migrateToSupabase()` runs on first Google OAuth sign-in (triggered by `ProfileStore.checkSession` → `switchToSupabase()`). This flow is auth-method agnostic and unchanged. No data-model impact.
