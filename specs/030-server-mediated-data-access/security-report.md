# Security Report: Server-Mediated Data Access

**Feature**: 030-server-mediated-data-access  
**Date**: 2026-06-12  
**Reviewer**: Claude (automated security review)

---

## 1. npm Audit (`--omit=dev`)

Run from `connect-four/` on 2026-06-12.

### Critical (2)

| Package | Dependency of | Dev-only? | Resolution |
|---------|--------------|-----------|------------|
| `shell-quote` ≤1.8.3 (GHSA-w7jw-789q-3m8p) | `concurrently` 9.2.1 | **Yes** | Accept. Tracked as GitHub issue. Fix requires `concurrently` 10.x (breaking). Does not affect production. |
| `shell-quote` (duplicate via concurrently) | same | **Yes** | Same as above. |

### Moderate (5)

| Package | Resolution |
|---------|------------|
| `brace-expansion` 5.0.2–5.0.5 (GHSA-jxxr-4gwj-5jf2) | `npm audit fix` available |
| `ip-address` ≤10.1.0 (GHSA-v2v4-37r5-5v8g) | Via `express-rate-limit` — fix available |
| `qs` 6.11.1–6.15.1 (GHSA-q8mj-m7cp-5q26) | `npm audit fix` available |
| `ws` 8.0.0–8.20.0 (GHSA-58qx-3vcg-4xpx) | `npm audit fix` available |

All moderate; none are merge-blockers per FR-027.

### Verdict

- **Zero unresolved production high/critical findings.** ✅
- Dev-only critical in `shell-quote` (via `concurrently`) — accepted per FR-027 dev-dependency exception.
- Five moderate findings — all have fixes available; tracked as housekeeping items.

---

## 2. Security Review — New `/api/user/*` Endpoints

### Scope reviewed

- `connect-four/server/userRoutes.js` — 15 endpoint handlers (7 GET, 7 POST, 1 migrate)
- `connect-four/server/userHelpers.js` — 5 write helpers (session_stats, lesson_progress, puzzle_attempts, sparring_record, streak)
- `connect-four/server/index.js` — import + registration (2 lines changed)
- `connect-four/src/store/SupabaseStore.js` — rewrite (fetch replaces supabase client)
- `connect-four/src/store/IndexedDBStore.js` — migrateToSupabase rewrite

### Reviewed categories

| Category | Result |
|----------|--------|
| SQL/NoSQL injection | **Pass** — All DB operations use Supabase query builder with parameterized `.eq()` / `.upsert()` / `.insert()`. No raw SQL or string interpolation. |
| Command injection | **Pass** — No shell commands or subprocesses in new code. |
| Authentication bypass | **Pass** — `requireUser(req, res)` guard at top of every handler; returns 401 if `!req.user`. Globally registered `loadUser` middleware validates JWT before any route runs. |
| Authorization / ownership | **Pass** — Every DB query filters by `user_id = req.user.id` or `id = req.user.id`. No endpoint can read or write another user's data. |
| Privilege escalation | **Pass** — `device_uuid` sourced exclusively from `req.user.device_uuid` (set by server-side auth), never from request body. No user-controlled identifier can influence ownership. |
| Sensitive data exposure | **Pass** — `GET /api/user/profile` explicitly projects `{ device_uuid, tier, deep_reveal_count, deep_reveal_reset_at }`. `req.user.id` is never returned to the client. |
| Cross-site scripting (XSS) | **Pass** — All endpoints return JSON; no HTML rendering. |
| Mass assignment | **Pass** — `writePuzzleAttempts` explicitly selects fields (`puzzle_id`, `moves_tried`, `outcome`, `first_attempt_correct`, `time_ms`). Extra body keys are ignored. |
| Injection via jsonb | **Pass** — All data stored in `jsonb` columns is PostgreSQL-escaped by the Supabase client. jsonb values are never executed as SQL or code. |
| Token leakage | **Pass** — Supabase access tokens are sent only over HTTPS `Authorization: Bearer` headers. Tokens are never logged, stored on disk, or returned in responses. |

### Findings

**Zero high or critical findings. Zero moderate findings.**

The feature is a security hardening change: it moves database operations from the browser (anon-key, bypassable) to the server (service-role key, JWT-authenticated, user_id-filtered). The new endpoints add defense-in-depth relative to the prior state where the browser had direct Supabase access.

---

## 3. Client-Side Security

- **T035 verification**: `rg "\.from\(['\"a-zA-Z]" connect-four/src/` returns only `Array.from()` JavaScript calls (not Supabase queries). Zero `.rpc()` calls. ✅
- The Supabase anon key is now used exclusively for `supabase.auth.*` calls. ✅
- The browser never sees the service-role key. ✅

---

## 4. Open Issues

None. All acceptance criteria for US4 are satisfied.

