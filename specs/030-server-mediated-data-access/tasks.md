# Tasks: Server-Mediated Data Access (Security Hardening)

**Input**: `specs/030-server-mediated-data-access/`  
**Spec**: spec.md | **Plan**: plan.md | **Contracts**: contracts/api-user-endpoints.md  
**Branch**: `030-server-mediated-data-access`

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story this task belongs to (US1–US4)
- Exact file paths in every description

## Phase order (locked)

```
Phase 2 (A-0 helpers) → Phase 3 GET endpoints → Phase 3 POST endpoints → Phase 3 SupabaseStore rewrites
                                                ↘ Phase 4 (migrate endpoint) → Phase 4 (IndexedDBStore)
Phase 5 (security verification) — after Phase 3 + 4
Phase 6 (vulnerability scan + docs) — last
```

---

## Phase 1: Setup

**Purpose**: Create the shared write-helper module that both individual POST endpoints and the migrate endpoint will import from. The file must exist before Phase 2 tasks can fill it in.

- [ ] T001 Create `connect-four/server/userHelpers.js` with ESM exports: five async write helper stubs (`writeSessionStats`, `writeLessonProgress`, `writePuzzleAttempts`, `writeSparringRecord`, `writeStreak`) that each throw `new Error('not implemented')` as placeholders; export all five

---

## Phase 2: Foundational — Shared Write Helpers (A-0)

**Purpose**: Implement and unit-test the five per-table write helpers. These are called by both the individual POST endpoints (Phase 3) and the migrate endpoint (Phase 4). Both phases are blocked until these helpers are proven correct.

**⚠️ CRITICAL**: No Phase 3 POST endpoint or Phase 4 migrate work can begin until T002–T007 are complete and tests pass.

- [ ] T002 Implement `writeSessionStats(supabase, userId, date, stats)` in `connect-four/server/userHelpers.js` — upsert `{ user_id: userId, date, stats }` into `session_stats` on conflict `(user_id, date)` using **full-replace** (no `||` merge); return `{ error }` on failure, `undefined` on success
- [ ] T003 Implement `writeLessonProgress(supabase, userId, lessonRows)` in `connect-four/server/userHelpers.js` — for each row where `row.status === 'complete'`, upsert `{ user_id: userId, lesson_id: row.lessonId, completed_at: new Date().toISOString() }` on conflict `(user_id, lesson_id)`; silently skip rows where status is not 'complete'; return `{ error }` on failure
- [ ] T004 Implement `writePuzzleAttempts(supabase, userId, deviceUuid, attempts)` in `connect-four/server/userHelpers.js` — bulk insert rows into `puzzle_attempts`; set `user_id = userId` and `device_uuid = deviceUuid` on every row (never from row data); set `created_at = new Date().toISOString()` if absent; use `ignoreDuplicates: true`; no-op if `attempts` is empty; return `{ error }` on failure
- [ ] T005 Implement `writeSparringRecord(supabase, userId, record)` in `connect-four/server/userHelpers.js` — `UPDATE users SET sparring_record = record WHERE id = userId`; return `{ error }` on failure
- [ ] T006 Implement `writeStreak(supabase, userId, streak)` in `connect-four/server/userHelpers.js` — `UPDATE users SET streak_count = streak.streak_count, last_active_date = streak.last_active_date WHERE id = userId`; return `{ error }` on failure
- [ ] T007 Write `node --test` unit tests for all 5 helpers in `connect-four/server/userHelpers.test.mjs` — mock the supabase client; cover happy path, empty input (no-op), and error return for each helper; run `npm run test:fast` from `connect-four/` and confirm all pass

**Checkpoint**: All 5 helpers tested and passing before proceeding to Phase 3.

---

## Phase 3: User Story 1 — Signed-In User Data Persists (Priority: P1) 🎯 MVP

**Goal**: A signed-in user's data (stats, puzzle attempts, lessons, sparring, streak) persists through server-mediated endpoints. No Supabase `.from()` calls remain in `SupabaseStore.js`.

**Independent Test**: Sign in, solve 3 puzzles, visit the dashboard, sign out, sign in again. Stats, lesson progress, and streak all match what was recorded.

---

### Step A-1: Register route block and GET endpoints in server/index.js

- [ ] T008 [US1] Add the `// ── User data endpoints (/api/user/*) ──` route block to `connect-four/server/index.js` immediately after the `app.use(loadUser)` middleware registration; add an inline `requireUser(req, res)` guard (returns `false` and sends `401 { "error": "Unauthorized" }` if `!req.user`, returns `true` otherwise); add `503 { "error": "Supabase not configured" }` guard pattern for `!supabase`
- [ ] T009 [US1] Implement `GET /api/user/session-stats/all` in `connect-four/server/index.js` — **register this route FIRST before any other /api/user/session-stats route** (Express routing order; see research.md Decision 4); SELECT all rows for `user_id = req.user.id`; compute `byPattern` weighted mean (weight = `(optimalCount??0)+(blunderCount??0)+(suboptimalCount??0) || 1`); return `{ rows, byPattern }` (200)
- [ ] T010 [US1] Implement `GET /api/user/profile` in `connect-four/server/index.js` — return an **explicit projection** as JSON (200): `{ device_uuid: req.user.device_uuid ?? null, tier: req.user.tier, deep_reveal_count: req.user.deep_reveal_count, deep_reveal_reset_at: req.user.deep_reveal_reset_at }`; do NOT return `req.user` verbatim (it contains `id` which must not be leaked, and `device_uuid` may be `undefined` in the no-users-row branch rather than `null`); no second DB query needed
- [ ] T011 [US1] Implement `GET /api/user/session-stats` in `connect-four/server/index.js` — require `?date=` query param matching `/^\d{4}-\d{2}-\d{2}$/`; return 400 if missing or invalid; SELECT full row `{ user_id, date, stats }` WHERE `user_id = req.user.id AND date = date`; return full row or `null` (200)
- [ ] T012 [US1] Implement `GET /api/user/lesson-progress` in `connect-four/server/index.js` — SELECT `lesson_id, completed_at` WHERE `user_id = req.user.id`; map each row to `{ lessonId: row.lesson_id, status: row.completed_at != null ? 'complete' : 'incomplete' }`; return array (200)
- [ ] T013 [US1] Implement `GET /api/user/sparring-record` in `connect-four/server/index.js` — SELECT `sparring_record` from `users` WHERE `id = req.user.id`; return `data?.sparring_record ?? { W: 0, L: 0, D: 0 }` (200)
- [ ] T014 [US1] Implement `GET /api/user/challenge-session` in `connect-four/server/index.js` — SELECT `stats` FROM `session_stats` WHERE `user_id = req.user.id` ORDER BY `date DESC` LIMIT 1; return `row.stats` or `null` (200)
- [ ] T015 [US1] Implement `GET /api/user/streak` in `connect-four/server/index.js` — SELECT `streak_count, last_active_date` from `users` WHERE `id = req.user.id`; return `{ streak_count: data?.streak_count ?? 0, last_active_date: data?.last_active_date ?? null }` (200)

---

### Step B: POST mutation endpoints in server/index.js

- [ ] T016 [US1] Implement `POST /api/user/session-stats` in `connect-four/server/index.js` — 400 if `req.body.date` is missing; call `writeSessionStats(supabase, req.user.id, req.body.date, req.body.stats)` — **store only the inner `req.body.stats` object** as the `stats` jsonb (not the whole body; storing the whole body would double-nest it as `{ date, stats: {...} }`; full-replace, no merge); return 204 on success; 500 on helper error
- [ ] T017 [US1] Implement `POST /api/user/puzzle-attempts` in `connect-four/server/index.js` — 400 if any of `{ puzzle_id, moves_tried, outcome, first_attempt_correct }` is missing from body; call `writePuzzleAttempts(supabase, req.user.id, req.user.device_uuid, [req.body])` — **`device_uuid` comes from `req.user.device_uuid`, NEVER from `req.body`**; 204 on success; 500 on error
- [ ] T018 [US1] Implement `POST /api/user/lesson-progress` in `connect-four/server/index.js` — 400 `{ "error": "status must be 'complete'" }` if `req.body.status !== 'complete'`; 400 if `lessonId` missing; call `writeLessonProgress(supabase, req.user.id, [{ lessonId: req.body.lessonId, status: 'complete' }])`; 204 on success; 500 on error
- [ ] T019 [US1] Implement `POST /api/user/sparring-record` in `connect-four/server/index.js` — 400 if `req.body.result` not in `{ 'win', 'loss', 'draw' }`; read current `sparring_record` from `users`; increment the correct counter (`W`/`L`/`D`); call `writeSparringRecord(supabase, req.user.id, updated)`; 204 on success; 500 on error
- [ ] T020 [US1] Implement `POST /api/user/challenge-session` in `connect-four/server/index.js` — 400 if `req.body.date` missing; call `writeSessionStats(supabase, req.user.id, req.body.date, req.body)` — same full-replace semantics as `POST /api/user/session-stats`; 204 on success; 500 on error
- [ ] T021 [US1] Implement `POST /api/user/streak/record-day` in `connect-four/server/index.js` — read `streak_count, last_active_date` from `users`; compute `today = new Date().toLocaleDateString('en-CA')`; no-op if `last_active_date === today`; `streak_count += 1` if yesterday, else reset to 1; call `writeStreak(supabase, req.user.id, { streak_count, last_active_date: today })`; 204

---

### Step C: Endpoint tests (backs SC-005)

**Purpose**: Verify all 14 `/api/user/*` endpoints respond correctly to happy-path and 401 scenarios. These tests use `node --test` with a mocked supabase and a lightweight Express test-server (see server-testing-pattern memory). Must pass before the SupabaseStore rewrite begins so regressions are caught early.

- [ ] T021a [US3] Write `node --test` tests for the **7 GET endpoints** in `connect-four/server/userEndpoints.test.mjs` — for each of `GET /api/user/profile`, `GET /api/user/session-stats`, `GET /api/user/session-stats/all`, `GET /api/user/lesson-progress`, `GET /api/user/sparring-record`, `GET /api/user/challenge-session`, `GET /api/user/streak`: (1) happy-path returns expected shape and 200; (2) missing `Authorization` header → 401; run `npm run test:fast` from `connect-four/` and confirm all pass
- [ ] T021b [US3] Write `node --test` tests for the **6 POST endpoints** in `connect-four/server/userEndpoints.test.mjs` — for each of `POST /api/user/session-stats`, `POST /api/user/puzzle-attempts`, `POST /api/user/lesson-progress`, `POST /api/user/sparring-record`, `POST /api/user/challenge-session`, `POST /api/user/streak/record-day`: (1) happy-path returns 204; (2) missing `Authorization` header → 401; (3) for `POST /api/user/session-stats` specifically, assert the write helper receives `req.body.stats` (not `req.body`); run `npm run test:fast` from `connect-four/` and confirm all pass
- [ ] T021c [US3] Write `node --test` test for **`POST /api/user/migrate`** in `connect-four/server/userEndpoints.test.mjs` — happy-path: all 5 write helpers called with correct arguments, returns 204; 401 on missing auth; server error in one helper returns 500; run `npm run test:fast` from `connect-four/` and confirm all pass

**Checkpoint**: All 14 endpoints verified by automated tests before SupabaseStore rewrite. SC-005 satisfied.

---

### Step D: Rewrite SupabaseStore to call server endpoints (depends on T009–T021)

All rewrites follow the pattern in plan.md §SupabaseStore rewrite contract: get token from `this._supabase.auth.getSession()`; if no token return the method's default value (see research.md Decision 5); fetch with `Authorization: Bearer <token>`.

- [ ] T022 [US1] Rewrite `SupabaseStore.getProfile()` in `connect-four/src/store/SupabaseStore.js` — GET `/api/user/profile`; default `{ device_uuid: null, tier: 'free', deep_reveal_count: 0, deep_reveal_reset_at: new Date().toISOString() }` on no-token or non-ok response
- [ ] T023 [US1] Rewrite `SupabaseStore.getSessionStats(date)` in `connect-four/src/store/SupabaseStore.js` — GET `/api/user/session-stats?date=<date>`; return `null` on no-token or non-ok; return parsed JSON (full row `{ user_id, date, stats }`) on success
- [ ] T024 [US1] Rewrite `SupabaseStore.saveSessionStats(stats)` in `connect-four/src/store/SupabaseStore.js` — POST `/api/user/session-stats` with `body = stats` (the full `stats` argument — which has shape `{ date, stats: {...} }` — is sent as the request body verbatim so the server can store the whole body as the `stats` jsonb); silent no-op on no-token
- [ ] T025 [US1] Rewrite `SupabaseStore.getAllSessionStats()` in `connect-four/src/store/SupabaseStore.js` — GET `/api/user/session-stats/all`; return `{ rows: [], byPattern: {} }` on no-token or non-ok
- [ ] T026 [US1] Rewrite `SupabaseStore.recordPuzzleAttempt(attempt)` in `connect-four/src/store/SupabaseStore.js` — POST `/api/user/puzzle-attempts` with body = attempt fields (puzzle_id, moves_tried, outcome, first_attempt_correct, time_ms); **do NOT send device_uuid — the server derives it from req.user**; silent no-op on no-token
- [ ] T027 [US1] Rewrite `SupabaseStore.getLessonProgress()` and `SupabaseStore.saveLessonProgress(lessonId, status)` in `connect-four/src/store/SupabaseStore.js` — getLessonProgress: GET `/api/user/lesson-progress`; return `[]` on no-token; saveLessonProgress: POST `/api/user/lesson-progress` `{ lessonId, status }`; silent no-op on no-token
- [ ] T028 [US1] Rewrite `SupabaseStore.getSparringRecord()` and `SupabaseStore.saveSparringRecord(result)` in `connect-four/src/store/SupabaseStore.js` — getSparringRecord: GET `/api/user/sparring-record`; return `{ W: 0, L: 0, D: 0 }` on no-token; saveSparringRecord: POST `/api/user/sparring-record` `{ result }`; silent no-op on no-token
- [ ] T029 [US1] Rewrite `SupabaseStore.getLastChallengeSession()` and `SupabaseStore.saveChallengeSession(session)` in `connect-four/src/store/SupabaseStore.js` — getLastChallengeSession: GET `/api/user/challenge-session`; return `null` on no-token; saveChallengeSession: POST `/api/user/challenge-session` with body = session; silent no-op on no-token
- [ ] T030 [US1] Rewrite `SupabaseStore.getStreak()` and `SupabaseStore.recordActivityDay()` in `connect-four/src/store/SupabaseStore.js` — getStreak: GET `/api/user/streak`; return `{ streak_count: 0, last_active_date: null }` on no-token; recordActivityDay: POST `/api/user/streak/record-day` with `body = {}`; silent no-op on no-token
- [ ] T031 [US1] Run `npm run test:fast` from `connect-four/` and confirm zero regressions; fix any failures before proceeding to Phase 4

**Checkpoint**: At this point, US1 is fully functional. A signed-in user's data round-trips through server endpoints. `SupabaseStore.js` should have zero `.from(...)` calls. Verify with `rg "\.from\(" connect-four/src/store/SupabaseStore.js`.

---

## Phase 4: User Story 2 — Anonymous-to-Signed-In Data Migration (Priority: P1)

**Goal**: An anonymous user's IndexedDB data (5 types) migrates to the server in a single atomic POST. IndexedDB is cleared only on confirmed 204. On failure, IndexedDB is untouched.

**Independent Test**: Play 5 puzzles anonymously, record a sparring win, complete a lesson, sign in. Verify the dashboard shows all history.

**Depends on**: T002–T006 (write helpers must exist and be tested before T032)

- [ ] T032 [US2] Implement `POST /api/user/migrate` in `connect-four/server/index.js` — require auth (401 if !req.user); 400 if body missing; call all 5 write helpers via `Promise.all([writeSessionStats (loop per row), writeLessonProgress, writePuzzleAttempts, writeSparringRecord, writeStreak])` where `device_uuid` for puzzle_attempts is `req.user.device_uuid`; wrap in `try/catch`; **on any failure return 500 and do NOT clear IndexedDB** — the client can retry and idempotent writes will converge to a complete migration; return 204 on success; see contracts/api-user-endpoints.md §POST /api/user/migrate for exact write-target mappings
- [ ] T033 [US2] Rewrite `IndexedDBStore.migrateToSupabase(supabaseStore, supabaseClient)` in `connect-four/src/store/IndexedDBStore.js` — read all 5 data types from IndexedDB in parallel; get auth token from `supabaseClient.auth.getSession()`; throw if no token; POST to `/api/user/migrate` with `Authorization: Bearer <token>` and body `{ puzzle_attempts, session_stats, lesson_progress, sparring_record, streak }`; **throw on non-2xx** (do NOT clear IndexedDB); clear all 5 IndexedDB stores only on 204; preserve method signature `migrateToSupabase(supabaseStore, supabaseClient)` per FR-025
- [ ] T034 [US2] Run `npm run test:fast` from `connect-four/` and confirm zero regressions

**Checkpoint**: US2 complete. Migration transfers all 5 data types atomically. IndexedDB untouched on server failure.

---

## Phase 5: User Story 3 — Security: No Direct Database Access from Browser (Priority: P1)

**Goal**: Zero `.from(...)` or `.rpc(...)` calls remain in `src/` outside of `supabase.auth.*`. All `/api/user/*` endpoints enforce 401 on missing auth.

**Independent Test**: `rg "\.from\(|\.rpc\(" connect-four/src/` — zero hits outside auth.

- [ ] T035 [US3] Run `rg "\.from\(|\.rpc\(" connect-four/src/` from the project root; verify zero results; if any hits remain outside `supabase.auth.*` call sites, fix them in the relevant `connect-four/src/store/*.js` file and re-run until clean; document the final result in a one-line comment at the top of `connect-four/src/store/SupabaseStore.js`
- [ ] T036 [US3] Audit all 14 `/api/user/*` route handlers in `connect-four/server/index.js` for presence of the `requireUser` guard at the top of each handler; add any missing guards; confirm each handler also checks `!supabase` and returns 503

**Checkpoint**: US3 complete. Security criterion SC-001 satisfied.

---

## Phase 6: User Story 4 — Vulnerability Scan Passes (Priority: P2)

**Goal**: Zero unresolved high/critical findings in production dependencies. Security report written. Architecture doc updated.

**Depends on**: Phases 3–5 complete (scan runs over the complete diff).

- [ ] T037 [US4] Run `npm audit --omit=dev` from `connect-four/`; document the output; for any **high/critical production** findings: fix or remove/replace the dependency — "accept-with-issue" is NOT valid for production high/critical CVEs regardless of patch availability; "accept-with-issue" is valid only for dev-only dependencies or moderate-severity findings; open GitHub issues for all accepted findings; do not mark done until zero unresolved production high/critical findings remain
- [ ] T038 [US4] Run the `/security-review` skill over the new `/api/user/*` endpoint block in `connect-four/server/index.js`; resolve all high and critical findings in `connect-four/server/index.js`; open GitHub issues for moderate findings
- [ ] T039 [US4] Write `specs/030-server-mediated-data-access/security-report.md` — document npm audit results, security-review findings, resolutions and any open issues; must exist before feature is considered complete per FR-029
- [ ] T040 [US4] Add "Security posture" section to `docs/architecture/db-schema.md` — document: (a) all `/api/user/*` endpoints use the service-role key which bypasses RLS; (b) server-side `user_id = req.user.id` ownership filter is the primary access control layer; (c) existing RLS policies remain as defense-in-depth; (d) the browser anon key is now used exclusively for `supabase.auth.*` calls; per FR-030

---

## Dependencies Summary

| Phase | Blocked by |
|---|---|
| Phase 2 (helpers T002–T006) | T001 (file must exist) |
| Phase 3 POST endpoints (T016–T021) | T002–T007 (helpers tested) |
| Phase 3 GET endpoints (T009–T015) | T008 (route block skeleton) |
| Phase 3 endpoint tests (T021a–T021c) | T009–T021 (all endpoints implemented) |
| Phase 3 SupabaseStore (T022–T030) | T009–T021, T021a–T021c (endpoints live and tested) |
| Phase 4 migrate endpoint (T032) | T002–T006 (helpers) |
| Phase 4 IndexedDBStore (T033) | T032 (migrate endpoint must exist) |
| Phase 5 (T035–T036) | T022–T034 (all SupabaseStore + IndexedDB rewrites complete) |
| Phase 6 (T037–T040) | T035–T036 (security scan runs over complete diff) |

## Parallel Opportunities

Within Phase 3, once T008 is done:
- T009–T015 (7 GET endpoints) can be implemented in one continuous editing session; they touch only `server/index.js`
- T022–T030 (SupabaseStore rewrites) are sequential but fast; they touch only `src/store/SupabaseStore.js`

T002–T006 (helpers in Phase 2) can be written in a single editing session since they're all in `server/userHelpers.js`.

T037 (npm audit) and T038 (security-review) can be run in parallel since they are independent tools.

## Implementation Strategy

**MVP scope (minimum to satisfy US1)**: Complete Phases 1–3 in order. This delivers a signed-in user experience with zero direct DB calls.

**Migration (US2)**: Add after US1 is stable. Phase 4 is self-contained — the write helpers from Phase 2 already exist.

**Security gate (US3 + US4)**: Run only after all rewrites are complete. Do not run partial scans mid-implementation.

**Key invariants to preserve across all tasks**:
1. `writeSessionStats` always uses full-replace; never `||` merge
2. `writePuzzleAttempts` always takes `deviceUuid` as an explicit parameter; never reads it from row data
3. `SupabaseStore.migrateToSupabase()` continues to throw (`Error('migrateToSupabase called on SupabaseStore — use IndexedDBStore')`) — do not change it (FR-023)
4. `SupabaseStore.getStats()` is unchanged — it already calls `/api/stats` via fetch (FR-021)
5. `GET /api/user/session-stats/all` must be registered BEFORE `GET /api/user/session-stats` in Express
