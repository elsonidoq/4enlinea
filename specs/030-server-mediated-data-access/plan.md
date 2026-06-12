# Implementation Plan: Server-Mediated Data Access (Security Hardening)

**Branch**: `030-server-mediated-data-access` | **Date**: 2026-06-12 | **Spec**: [spec.md](./spec.md)  
**Input**: `specs/030-server-mediated-data-access/spec.md`

---

## Summary

Move all Supabase data reads/writes behind 14 new `/api/user/*` server endpoints so the browser never touches the database directly. Rewrite every `SupabaseStore` method that currently calls `.from(...)` to call the corresponding endpoint with `Authorization: Bearer <token>`. Rewrite `IndexedDBStore.migrateToSupabase()` to bundle all anonymous data into a single `POST /api/user/migrate` request and clear IndexedDB only on confirmed success. Gate completion on a formal vulnerability scan with zero unresolved high/critical findings.

---

## Technical Context

**Language/Version**: Node.js (ESM), React 18  
**Primary Dependencies**: Express 5, @supabase/supabase-js, Vite  
**Storage**: Supabase PostgreSQL (via service-role key server-side; anon key for auth only)  
**Testing**: `node --test` for server helpers; `npm run test:fast` for fast CI  
**Target Platform**: Linux server + browser (Chrome/Safari/Firefox)  
**Project Type**: Web application (monorepo: `connect-four/server/` + `connect-four/src/`)  
**Performance Goals**: No new latency requirement; new endpoints are simple DB queries with no solver involvement  
**Constraints**: No new DB tables; no schema migrations; `loadUser` already globally registered; service-role key already in env  
**Scale/Scope**: ~14 new endpoints, ~12 SupabaseStore method rewrites, 1 IndexedDBStore method rewrite

### Key schema facts (verified against `docs/architecture/db-schema.md`)

- `session_stats`: exactly 3 columns — `user_id uuid`, `date date`, `stats jsonb`. Composite PK `(user_id, date)`.
- `users`: has `sparring_record jsonb`, `streak_count integer`, `last_active_date date`, `tier text`, `device_uuid text`, `deep_reveal_count integer`, `deep_reveal_reset_at timestamptz`.
- `puzzle_attempts`: has `user_id uuid` (nullable), `device_uuid text`, `puzzle_id uuid`, `moves_tried integer[]`, `outcome text`, `first_attempt_correct boolean`, `time_ms integer`, `created_at timestamptz`.
- `lesson_progress`: keyed `(user_id, lesson_id)`. Completion derived from `completed_at != null`.

### `saveSessionStats` schema contradiction — resolved

`SupabaseStore.saveSessionStats(stats)` does `.upsert({ user_id, ...stats })`, which spreads the stats argument as top-level columns. But the live table only has `(user_id, date, stats)`. Because Supabase ignores unknown keys in upserts when RLS/service-role allows, any extra spread fields are silently dropped; only `user_id` and `date` from the spread land in real columns. The `stats` field in the spread is the jsonb column.

This means the incoming `stats` object has shape `{ date: 'YYYY-MM-DD', stats: {...} }` — it contains both a `date` field (for the PK) and a `stats` field (the jsonb blob). The new endpoint for FR-003 must therefore accept `{ date, ...otherFields }` and write `{ user_id, date, stats: { date, ...otherFields } }` — that is, the entire body becomes the `stats` jsonb so that the round-trip `getSessionStats` → `data.stats` returns the same shape the caller gave `saveSessionStats`.

The rewritten `SupabaseStore.saveSessionStats(stats)` will POST the `stats` object as the body. The endpoint stores the body as the `stats` jsonb column.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

**Principle I — Explanation Engine as Single Source of Truth**:
- [x] No new move evaluations, pattern labels, or LLM annotations are introduced. PASS.

**Principle II — Code Quality & Simplicity**:
- [x] No speculative abstractions — each endpoint is a thin DB wrapper. PASS.
- [x] Storage-agnostic interface preserved — `SupabaseStore` public signatures unchanged. PASS.

**Principle III — Testing Standards**:
- [x] New endpoints are pure DB operations; no solver involvement. Unit tests with `node --test` helpers are sufficient. PASS.

**Principle IV — UX Consistency**:
- [x] No UI changes. PASS.

**Principle V — Performance**:
- [x] New endpoints are simple DB queries; no solver calls. Well within any latency budget. PASS.

**Principle VI — Implementation Methodology**:
- [x] Schema verified against `db-schema.md` before writing any endpoint bodies. PASS.
- [x] `saveSessionStats` contradiction resolved above via reasoning + schema inspection. PASS.

**Principle VII — Software Design Philosophy**:
- [x] Explicit auth check in every endpoint. No implicit behavior. PASS.

**Principle VIII — Documentation as First-Class Deliverable**:
- [x] `docs/architecture/api-conventions.md` read before planning endpoints. PASS.
- [x] `docs/architecture/db-schema.md` must receive a "Security posture" section (FR-030). Tracked as explicit task.
- [x] `docs/architecture/frontend-conventions.md` read for store interface contract. PASS.
- [ ] Documentation tasks included in tasks.md for every new architectural decision.

**Post-Phase 1 re-check**: Verify contracts/ and data-model.md are consistent with endpoint shapes defined here.

---

## Project Structure

### Documentation (this feature)

```text
specs/030-server-mediated-data-access/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── contracts/
│   └── api-user-endpoints.md
├── security-report.md   ← produced during security scan phase
└── tasks.md             ← Phase 2 output (/speckit-tasks)
```

### Source Code (modified files)

```text
connect-four/
├── server/
│   └── index.js                     ← 14 new /api/user/* route handlers added
├── src/
│   └── store/
│       ├── SupabaseStore.js          ← all .from(...) methods rewritten to fetch
│       └── IndexedDBStore.js         ← migrateToSupabase rewritten to POST /api/user/migrate
└── docs/
    └── architecture/
        └── db-schema.md              ← new "Security posture" section added (FR-030)
```

---

## Phase 0: Research

> No external unknowns. All decisions are derivable from existing code and schema.

### research.md decisions

**Decision 1: Upsert semantics for session_stats**
- Both `POST /api/user/session-stats` and `POST /api/user/challenge-session` do a full-replace upsert of the `stats` jsonb column.
- Rationale: The two callers write incompatible blob shapes. Merging with `||` would produce a corrupted hybrid. Full-replace matches current production behavior.
- Alternative: jsonb merge (`||`). Rejected because the two endpoints write different shapes to the same `stats` column.

**Decision 2: POST /api/user/migrate atomicity**
- All 5 writes are executed in a `try/catch` block. If any fails, the handler returns 500 without clearing IndexedDB. The endpoint does NOT use a Postgres transaction — Supabase's JS client does not expose multi-table transactions cleanly, and race conditions from the same user signing in twice are not a realistic scenario.
- Alternative: Use `supabase.rpc(...)` with a PL/pgSQL transaction. Rejected because it requires a new database function (schema change) for a non-realistic failure mode.

**Decision 3: SupabaseStore default values on missing token**
- If `auth.getSession()` returns no token, each method returns the same default it returned before (e.g., `getProfile()` returns `{ device_uuid: null, tier: 'free', ... }`). It must not throw.
- This mirrors the current pattern used by `getStats()`.

**Decision 4: Route file organization**
- All 14 new routes are added to `server/index.js` in a dedicated `// ── User data endpoints (/api/user/*) ──` block, immediately after the `loadUser` middleware and before existing puzzle routes.
- Alternative: Extract to a separate `server/userRoutes.js` file. Deferred — the existing codebase is a single-file server; adding a second file is a larger refactor not required by this spec.

**Decision 5: `getAllSessionStats` migration**
- `getAllSessionStats()` in SupabaseStore is not in the formal store interface table (frontend-conventions.md) but it does query the DB directly. It must be rewritten to call `GET /api/user/session-stats/all`. The computation of `byPattern` is moved to the server.
- Rationale: FR-021 only exempts `getStats()`. FR-020 says every `.from(...)` call must be replaced. `getAllSessionStats` has a `.from(...)` call.

**Decision 6: duplicate puzzle_attempts on migration**
- The migrate endpoint uses `{ ignoreDuplicates: true }` equivalent on the bulk insert (Supabase `upsert` with `ignoreDuplicates: true`). The `puzzle_attempts` table has no unique constraint besides PK, so "duplicate" here means same PK — which cannot happen on a fresh insert from IndexedDB since the PK is server-generated. Using `insert` (not upsert) is safe; the edge-case from the spec is about the same attempt being uploaded twice (e.g., network retry). Guard: wrap in try/catch and ignore `23505` constraint violations on the bulk insert.

---

## Phase 1: Design & Contracts

### data-model.md (entities involved)

No new tables. The affected entities and their read/write paths:

| Entity | Table | Key columns read/written | Endpoint(s) |
|---|---|---|---|
| User profile | `users` | `device_uuid, tier, deep_reveal_count, deep_reveal_reset_at` | GET /api/user/profile |
| Session stats | `session_stats` | `user_id, date, stats` | GET/POST /api/user/session-stats, GET /api/user/session-stats/all |
| Puzzle attempt | `puzzle_attempts` | `puzzle_id, device_uuid, moves_tried, outcome, first_attempt_correct, time_ms` | POST /api/user/puzzle-attempts |
| Lesson progress | `lesson_progress` | `user_id, lesson_id, completed_at` | GET/POST /api/user/lesson-progress |
| Sparring record | `users.sparring_record` | `sparring_record jsonb { W, L, D }` | GET/POST /api/user/sparring-record |
| Challenge session | `session_stats` | same as session stats row | GET/POST /api/user/challenge-session |
| Streak | `users` | `streak_count, last_active_date` | GET /api/user/streak, POST /api/user/streak/record-day |
| Migration | all 5 above | all | POST /api/user/migrate |

### contracts/api-user-endpoints.md

All 14 endpoints share:
- **Auth**: `loadUser` runs (globally registered). Return `401 { "error": "Unauthorized" }` inline at start of each handler if `!req.user`.
- **Ownership**: all queries filter `user_id = req.user.id` or `id = req.user.id`.
- **Error shape**: `{ "error": "<message>" }`.
- **Supabase**: use the server-side `supabase` client (service-role key). Return 503 if `!supabase`.

| Method | Path | Request | Response | Notes |
|---|---|---|---|---|
| GET | `/api/user/profile` | — | `{ device_uuid, tier, deep_reveal_count, deep_reveal_reset_at }` (200) | Returns `req.user` directly; `loadUser` already applies the correct no-row defaults (matching `loadUser` output exactly, which satisfies FR-022) |
| GET | `/api/user/session-stats` | `?date=YYYY-MM-DD` | Full row `{ user_id, date, stats }` (200) or `null` (200) | 400 if `date` param missing/invalid |
| POST | `/api/user/session-stats` | `{ date, ...statsFields }` | 204 | Upsert `{ user_id, date, stats: body }` |
| GET | `/api/user/session-stats/all` | — | `{ rows: [...], byPattern: { [slug]: { accuracy, attempted } } }` (200) | |
| POST | `/api/user/puzzle-attempts` | `{ puzzle_id, moves_tried, outcome, first_attempt_correct, time_ms }` | 204 | Insert; `created_at` set server-side; `user_id = req.user.id`; `device_uuid = req.user.device_uuid` (never from body) |
| GET | `/api/user/lesson-progress` | — | `Array<{ lessonId, status }>` (200) | Map `lesson_id → lessonId`; `completed_at != null → 'complete'` |
| POST | `/api/user/lesson-progress` | `{ lessonId, status }` | 204 | 400 if `status !== 'complete'`; upsert on `(user_id, lesson_id)` |
| GET | `/api/user/sparring-record` | — | `{ W, L, D }` (200) | From `users.sparring_record`; default `{ W:0, L:0, D:0 }` |
| POST | `/api/user/sparring-record` | `{ result: 'win'\|'loss'\|'draw' }` | 204 | Read-then-write; 400 if invalid `result` |
| GET | `/api/user/challenge-session` | — | `stats` jsonb (200) or `null` (200) | Most-recent `session_stats` row by date desc; returns `row.stats` |
| POST | `/api/user/challenge-session` | `{ date, ...sessionFields }` | 204 | Upsert `{ user_id, date, stats: body }` |
| GET | `/api/user/streak` | — | `{ streak_count, last_active_date }` (200) | From `users` |
| POST | `/api/user/streak/record-day` | `{}` | 204 | No-op if today; +1 if yesterday; reset to 1 otherwise |
| POST | `/api/user/migrate` | `{ puzzle_attempts, session_stats, lesson_progress, sparring_record, streak }` | 204 | Atomic all-or-nothing; 500 on any failure |

### SupabaseStore rewrite contract

Each method follows the pattern:
```js
async methodName(...args) {
  const { data: { session } } = await this._supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return <default_value>;  // same default as today
  const apiBase = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || '';
  const res = await fetch(`${apiBase}/api/user/<path>`, {
    method: 'GET' | 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',  // for POST only
    },
    body: JSON.stringify(...),  // for POST only
  });
  if (!res.ok) return <default_value>;
  return res.json();  // or void for 204
}
```

`migrateToSupabase()` continues to throw `Error('migrateToSupabase called on SupabaseStore — use IndexedDBStore')`.

### IndexedDBStore.migrateToSupabase rewrite contract

```js
async migrateToSupabase(supabaseStore, supabaseClient) {
  // 1. Read all 5 data types from IndexedDB
  const [attempts, lessonRows, sparringRecord, sessionRows, streak] = await Promise.all([...]);

  // 2. Get auth token from supabaseClient
  const { data: { session } } = await supabaseClient.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('migrateToSupabase: no auth token');

  // 3. POST to /api/user/migrate
  const apiBase = ...;
  const res = await fetch(`${apiBase}/api/user/migrate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ puzzle_attempts: attempts, session_stats: sessionRows, lesson_progress: lessonRows, sparring_record: sparringRecord, streak }),
  });
  if (!res.ok) throw new Error(`Migration failed: server returned ${res.status}`);

  // 4. Only on success: clear all 5 IndexedDB stores
  await clearAllStores(db);
}
```

---

## Implementation Phases

### Phase A: Shared write helpers + Server endpoints (GET read endpoints)

**Step A-0: Extract shared write helpers (do this first, before any endpoint)**

Before writing any endpoint body, extract the five per-table write operations into standalone helpers in `server/index.js` (or a co-located `server/userHelpers.js`). Both the individual POST endpoints and `POST /api/user/migrate` call these helpers — this is the single write path for each table.

```js
// Helpers return { error } on failure, undefined on success.
async function writeSessionStats(supabase, userId, date, stats) { ... }
async function writeLessonProgress(supabase, userId, lessonRows) { ... }
async function writePuzzleAttempts(supabase, userId, deviceUuid, attempts) { ... }
async function writeSparringRecord(supabase, userId, record) { ... }
async function writeStreak(supabase, userId, streak) { ... }
```

Unit-test each helper independently with `node --test` before wiring them into routes.

**Step A-1: Add the route block and register GET endpoints**

Add a dedicated block in `connect-four/server/index.js` after line ~182 (after `app.use(loadUser)`):

```js
// ── User data endpoints (/api/user/*) — FR-015 to FR-019 ──────────────────────
// All endpoints: require auth, enforce user_id = req.user.id, use service-role key.
```

Register these GET endpoints:
1. `GET /api/user/session-stats/all`
2. `GET /api/user/profile` — return `req.user` directly (no second DB query; `loadUser` already populated the object with the correct defaults)
3. `GET /api/user/session-stats` (with `?date=` param)
4. `GET /api/user/lesson-progress`
5. `GET /api/user/sparring-record`
6. `GET /api/user/challenge-session`
7. `GET /api/user/streak`

### Phase B: Server endpoints (POST mutation endpoints)

8. `POST /api/user/session-stats`
9. `POST /api/user/puzzle-attempts`
10. `POST /api/user/lesson-progress`
11. `POST /api/user/sparring-record`
12. `POST /api/user/challenge-session`
13. `POST /api/user/streak/record-day`

### Phase C: Migration endpoint (last — calls shared write helpers)

14. `POST /api/user/migrate` — must come after Phase A-0 helpers are extracted and tested. The handler calls the five shared write helpers rather than reimplementing DB writes inline. `device_uuid` for `puzzle_attempts` rows is sourced from `req.user.device_uuid`; no profile read is needed. Returns 500 (without clearing anything) if any helper call returns an error.

### Phase D: SupabaseStore rewrite

Rewrite each `.from(...)` method to call the corresponding endpoint. Methods in order:
1. `getProfile()` → GET /api/user/profile
2. `getSessionStats(date)` → GET /api/user/session-stats?date=...  (returns full row; no change to callers since they already read `.stats`)
3. `saveSessionStats(stats)` → POST /api/user/session-stats
4. `getAllSessionStats()` → GET /api/user/session-stats/all
5. `recordPuzzleAttempt(attempt)` → POST /api/user/puzzle-attempts
6. `getLessonProgress()` → GET /api/user/lesson-progress
7. `saveLessonProgress(lessonId, status)` → POST /api/user/lesson-progress
8. `getSparringRecord()` → GET /api/user/sparring-record
9. `saveSparringRecord(result)` → POST /api/user/sparring-record
10. `getLastChallengeSession()` → GET /api/user/challenge-session
11. `saveChallengeSession(session)` → POST /api/user/challenge-session
12. `getStreak()` → GET /api/user/streak
13. `recordActivityDay()` → POST /api/user/streak/record-day

`migrateToSupabase()` stays as the throwing stub (FR-023). `getStats()` is untouched (FR-021).

### Phase E: IndexedDBStore.migrateToSupabase rewrite

Rewrite to call `POST /api/user/migrate`. Clear IndexedDB only on 2xx response. No profile read is needed inside the migrate handler — `device_uuid` is derived server-side from `req.user.device_uuid` (set by `loadUser`). The client never sends `device_uuid` in the migrate body.

### Phase F: Security scan and documentation

1. Run `npm audit --omit=dev` in `connect-four/`
2. Run `/security-review` over the new endpoint diff
3. Resolve all high/critical findings
4. Write `specs/030-server-mediated-data-access/security-report.md`
5. Add "Security posture" section to `docs/architecture/db-schema.md` (FR-030)

---

## Sequencing Constraints

| Constraint | Reason |
|---|---|
| Phase A-0 (write helpers) before Phase B (POST endpoints) | POST endpoints and migrate both call the helpers; helpers must exist first |
| Phase C (migrate endpoint) after Phase A-0 helpers | `POST /api/user/migrate` calls shared helpers rather than reimplementing writes inline |
| Phase D (SupabaseStore rewrite) after Phase A+B+C | SupabaseStore methods call server endpoints; endpoints must exist before rewrite |
| Phase E (IndexedDBStore rewrite) after Phase C | `migrateToSupabase` calls `POST /api/user/migrate` |
| Phase F (security scan) last | Scan runs over the complete diff |
| `SC-001` verification (`rg "\.from\(|\.rpc\(" src/`) | Run after Phase D to confirm zero remaining direct DB calls |

---

## Test Strategy

Per `docs/architecture/testing-conventions.md` and `server-conventions.md`:

- **Server helpers** (Phase A–C): Extract thin helpers (e.g., `readSessionStats(supabase, userId, date)`) and unit-test with `node --test`. No endpoint test harness exists; tests call helpers directly.
- **SupabaseStore** (Phase D): Manually verify the golden path (sign in, play puzzle, reload page, check stats persist) per constitution Principle III.
- **Migration** (Phase E): Manually verify: play 3 puzzles anonymously, complete a lesson, sign in, confirm all data present after reload.
- **Security scan** (Phase F): `npm audit --omit=dev` + `/security-review`. Automated gate; failures block merge.

Fast CI: `npm run test:fast` (inside `connect-four/`) omits slow solver tests.

---

## Complexity Tracking

No constitution violations. All new code is thin DB wrappers; no new abstractions, no new tables, no schema changes.

---

## Open Questions (Resolved)

| Question | Resolution |
|---|---|
| Does `session_stats` have flat columns or a jsonb `stats` column? | Verified: exactly 3 columns `(user_id, date, stats jsonb)`. The current `saveSessionStats` spread works because Supabase ignores extra keys; `date` and `stats` from the spread land in their columns. |
| Does `getSessionStats` return the full row or just `data.stats`? | Returns full row `{ user_id, date, stats }` per FR-002. Callers access `.stats` from the returned value. |
| Is there a race condition risk on `saveSparringRecord` / `recordActivityDay`? | Accepted: per-user single-player counters; concurrent writes from the same user are not a realistic scenario (spec §Assumptions). |
| Should `POST /api/user/migrate` use a Postgres transaction? | No. Supabase JS client does not expose multi-table transactions without a custom RPC. Try/catch semantics with 500 on failure is sufficient. |
