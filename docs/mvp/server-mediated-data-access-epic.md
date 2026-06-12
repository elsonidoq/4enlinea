# Epic 1 — Server-Mediated Data Access (Security Hardening)

*Extracted from `TODOs_epics.md` Epic 1. Where this file conflicts with an authoritative design doc
(`docs/architecture/*`, `docs/mvp/*`), the design doc wins.*

---

## Source-of-truth docs

| Doc | Role |
|---|---|
| [`docs/architecture/api-conventions.md`](../architecture/api-conventions.md) | Route naming, status codes, error shape, auth threading |
| [`docs/architecture/frontend-conventions.md`](../architecture/frontend-conventions.md) | Store interface, screen registry, URL mapping, CSS token systems, Board API |
| [`docs/architecture/server-conventions.md`](../architecture/server-conventions.md) | Solver IPC, classifier API, blunder write path, env vars |
| [`docs/architecture/data-model.md`](../architecture/data-model.md) | PKs, column naming, category slugs, soft delete, jsonb |
| [`docs/architecture/db-schema.md`](../architecture/db-schema.md) | Live table columns/constraints |

---

## Verified-pending facts (must be encoded in implementing specs)

1. **`SupabaseStore` queries the DB directly from the client.** `src/store/SupabaseStore.js` makes
   `.from('users' | 'session_stats' | 'puzzle_attempts' | 'lesson_progress')` calls with the anon
   key. Epic 1 must replace every one with a server endpoint. The store *interface* (the method
   table in `frontend-conventions.md`) is a hard contract and must be preserved.

---

## Goal

The browser never talks to Supabase for data; every read and write goes through a server endpoint,
and the app passes a vulnerability scan with no high-severity findings.

---

## Scope

- Audit every direct Supabase call in the client: `rg "\.from\(|\.rpc\(" src/store/SupabaseStore.js`
  and anywhere else in `src/`. Enumerate each as a `{method, table, operation}` row.
- For each `SupabaseStore` method (`getProfile`, `saveSessionStats`, `getSessionStats`,
  `recordPuzzleAttempt`, `saveLessonProgress`, `getLessonProgress`, `saveSparringRecord`,
  `getSparringRecord`, `saveChallengeSession`, `getLastChallengeSession`, `recordActivityDay`,
  `getStreak`), add a matching server endpoint and rewrite the method to `fetch` it with the
  `Authorization: Bearer <token>` header. **Preserve the method signatures and return shapes**
  exactly — the store interface is a contract (`frontend-conventions.md`).
- Rewrite `IndexedDBStore.migrateToSupabase()` to call `POST /api/user/migrate` instead of writing
  directly to Supabase. The anonymous IndexedDB data is bundled into the request body and written
  server-side at sign-in time.
- New endpoints follow `api-conventions.md`: `loadUser` threading, `{ error }` shape, correct
  status codes, service-role key server-side only.
- Keep the frontend anon key for **auth only** (`getSupabaseClient()` for `supabase.auth.*`).
  This is the one sanctioned client-side Supabase use and stays.
- Run a full vulnerability scan (dependency audit + the security-review skill over the diff +
  the auth/RLS surface). Triage findings into a remediation list; fix high/critical.

---

## Acceptance criteria

- `rg "\.from\(|\.rpc\(" src/` returns zero hits outside `supabase.auth.*` (no carve-outs; `migrateToSupabase` is rewritten to use `POST /api/user/migrate`, so it no longer writes to Supabase directly).
- Every former `SupabaseStore` DB operation has a corresponding `/api/*` endpoint that runs through
  `loadUser` and enforces ownership (`user_id = req.user.id`).
- A signed-in user's stats, puzzle attempts, lesson progress, sparring record, challenge sessions,
  and streak all persist and reload correctly through the server (no behavioral regression).
- Vulnerability scan produces a written report; no unresolved high/critical findings.

**NOT included:** Changing the store *interface*, anonymous-mode-only operations (IndexedDB reads
and writes while the user is not signed in), payments/Stripe hardening beyond what the scan flags,
or moving auth off the client. The *migration step* — converting anonymous data to server-side
storage at sign-in — is **in scope** (see `POST /api/user/migrate`).

---

## API Contracts — new `/api/user/*` endpoints

All endpoints in this section:
- Route prefix: `/api/user/`
- Auth: **required** — `loadUser` runs; 401 if `req.user` is null
- Ownership enforced server-side: all queries filter `user_id = req.user.id`
- Error shape: `{ "error": "<message>" }` per `api-conventions.md`

| Method | Path | Request body | Response | Notes |
|---|---|---|---|---|
| GET | `/api/user/profile` | — | `{ device_uuid, tier, deep_reveal_count, deep_reveal_reset_at }` | Replaces `getProfile()` |
| GET | `/api/user/session-stats?date=YYYY-MM-DD` | — | stats object \| `null` (200) | Replaces `getSessionStats(date)` |
| POST | `/api/user/session-stats` | `{ date, ...stats }` | 204 | Upserts on `user_id, date`; replaces `saveSessionStats()` |
| GET | `/api/user/session-stats/all` | — | `{ rows: [...], byPattern: { [slug]: { accuracy, attempted } } }` | Replaces `getAllSessionStats()` (not in formal interface but queries DB directly) |
| POST | `/api/user/puzzle-attempts` | `{ puzzle_id, device_uuid, moves_tried, outcome, first_attempt_correct, time_ms }` | 204 | Replaces `recordPuzzleAttempt()`; `created_at` set server-side |
| GET | `/api/user/lesson-progress` | — | `Array<{ lessonId, status: 'complete'\|'incomplete' }>` | Replaces `getLessonProgress()` |
| POST | `/api/user/lesson-progress` | `{ lessonId, status }` | 204 | Upserts on `user_id, lesson_id`; replaces `saveLessonProgress()` |
| GET | `/api/user/sparring-record` | — | `{ W, L, D }` | Replaces `getSparringRecord()` |
| POST | `/api/user/sparring-record` | `{ result: 'win'\|'loss'\|'draw' }` | 204 | Best-effort read-then-write; race condition negligible for per-user counters; replaces `saveSparringRecord()` |
| GET | `/api/user/challenge-session` | — | session object \| `null` (200) | Returns most-recent row by date; replaces `getLastChallengeSession()` |
| POST | `/api/user/challenge-session` | `{ date, ...session fields }` | 204 | Upserts on `user_id, date`; replaces `saveChallengeSession()` |
| GET | `/api/user/streak` | — | `{ streak_count, last_active_date }` | Replaces `getStreak()` |
| POST | `/api/user/streak/record-day` | `{}` | 204 | No-op if `last_active_date` is today; increments if yesterday; resets to 1 otherwise; best-effort read-then-write; race condition negligible for per-user counters; replaces `recordActivityDay()` |
| POST | `/api/user/migrate` | `{ puzzle_attempts: [...], session_stats: [...], lesson_progress: [...], sparring_record: { W, L, D }, streak: { streak_count, last_active_date } }` | 204 | Accepts all 5 anonymous IndexedDB data types and writes them server-side atomically; called by the rewritten `migrateToSupabase()` at sign-in; IndexedDB is cleared only after all 5 writes succeed |

`getStats()` already calls `GET /api/stats` via `fetch` — no change needed.

---

### Data model coupling

**`session_stats` — one shared row per `(user_id, date)`**

`POST /api/user/session-stats` and `POST /api/user/challenge-session` both upsert into the
`session_stats` table on the same composite primary key `(user_id, date)`. Both endpoints write
the full `stats` jsonb column as a **full-replace upsert** — last writer wins. No `||` merge is
used. The two endpoints store incompatible shapes under `stats`, so a merge would corrupt the row;
full-replace matches current production behavior and is the accepted trade-off.

**Schema contradiction — verify live table before speccing endpoint bodies**

`docs/architecture/db-schema.md` declares `session_stats` as having only `user_id`, `date`, and
`stats` (jsonb). However, `SupabaseStore.saveSessionStats()` does `.upsert({ user_id, ...stats })`
— spreading stats fields as top-level columns — which would require flat columns to exist on the
table. These two descriptions are mutually contradictory. **The spec author must query the live
`session_stats` table** (e.g. `SELECT column_name FROM information_schema.columns WHERE table_name
= 'session_stats'`) and pin the authoritative column list before writing the endpoint request
bodies. Do not guess the shape.

---

#### Decisions

- **Scan tooling & scope.** The epic is "secure" when: (a) `npm audit --omit=dev` returns zero
  high/critical findings in production dependencies — dev-only criticals such as `concurrently`
  are logged as a GitHub issue but do not block; (b) the `/security-review` skill is run over the
  full server endpoint diff and all high/critical findings are resolved before merge. Moderate
  findings are triaged and tracked but do not block shipping. No external SAST/DAST tools are
  required. No new tooling needed; these two tools cover the highest-risk surfaces (CVEs and auth
  wiring) at zero setup cost.
- **Non-blocking findings.** Non-blocking findings (moderate npm audit results, dev-only criticals)
  are logged as GitHub issues.
- **RLS posture.** Supabase Row-Level Security remains configured as defense-in-depth. No new RLS
  policies are required for this epic (no new tables are added). The existing policies block direct
  anon/authenticated PostgREST access; the server's service-role key bypasses them. All ownership
  enforcement in the new `/api/user/*` endpoints is server-side via `WHERE user_id = req.user.id`
  (set by `loadUser` middleware). `docs/architecture/db-schema.md` gets a new "Security posture"
  section documenting this posture. Existing tables already have appropriate policies; adding
  redundant RLS policies mirroring server-side filters would be out of scope and wouldn't reduce
  production risk since service-role bypasses RLS anyway.
