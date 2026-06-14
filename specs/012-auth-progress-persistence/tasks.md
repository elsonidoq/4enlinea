# Tasks: Auth & Progress Persistence (Epic 7)

**Input**: Design documents from `specs/012-auth-progress-persistence/`
**Spec**: `specs/012-auth-progress-persistence/spec.md`
**Plan**: `specs/012-auth-progress-persistence/plan.md`
**Data Model**: `specs/012-auth-progress-persistence/data-model.md`
**Contracts**: `specs/012-auth-progress-persistence/contracts/`

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US5)
- File paths are absolute from the monorepo root (under `connect-four/`)

---

## Phase 1: Setup (No dependencies)

**Purpose**: Foundational prerequisite with no story dependency — DB migrations enable SupabaseStore work; IndexedDB refactor is independent.

- [x] T001 Write `connect-four/server/migrations/020_users_progress_columns.sql` — add `streak_count INTEGER NOT NULL DEFAULT 0`, `last_active_date DATE` (nullable), `sparring_record JSONB NOT NULL DEFAULT '{"W":0,"L":0,"D":0}'` to `users`; include comment block with migration number, description, and `-- HUMAN REVIEW REQUIRED before applying to production.`
- [x] T002 Write `connect-four/server/migrations/021_lesson_progress_table.sql` — create `lesson_progress(id UUID PK gen_random_uuid(), user_id UUID FK→users ON DELETE CASCADE, lesson_id TEXT, completed_at TIMESTAMPTZ, UNIQUE(user_id, lesson_id))`; enable RLS with `auth.uid() = user_id` policy for SELECT/INSERT/UPDATE/DELETE; `GRANT SELECT, INSERT, UPDATE, DELETE ON lesson_progress TO authenticated` (do NOT grant to `anon` — no anonymous code path writes lesson_progress; RLS `auth.uid() = user_id` is the only access control); include comment block
- [x] T003 Write `connect-four/server/migrations/022_deep_reveal_reset_nullable.sql` — `ALTER TABLE users ADD COLUMN IF NOT EXISTS deep_reveal_reset_at TIMESTAMPTZ`, then `ALTER TABLE users ALTER COLUMN deep_reveal_reset_at DROP NOT NULL`, then `ALTER TABLE users ALTER COLUMN deep_reveal_reset_at DROP DEFAULT`; include comment block

**Checkpoint**: All three migration files written. Apply migrations to the local Supabase instance before any SupabaseStore work begins.

---

## Phase 2: Foundational (Blocking prerequisites — complete before US2/US3/US4)

**Purpose**: IndexedDB version bump and `openDB()` refactor. Must be done before any new IndexedDB method is added. Independent of migrations.

- [x] T004 Refactor `openDB()` in `connect-four/src/store/IndexedDBStore.js` — bump `DB_VERSION` from 1 to 2; replace `objectStoreNames.contains()` guards with `e.oldVersion` version-gating pattern: `if (e.oldVersion < 1)` block for existing stores (`profile`, `puzzle_attempts`, `session_stats`); `if (e.oldVersion < 2)` block for new stores (`lesson_progress` keyPath `lessonId`, `sparring_record` keyPath `id`, `streak` keyPath `id`)
- [x] T005 Fix `getProfile()` in `connect-four/src/store/IndexedDBStore.js` — remove `deep_reveal_count` and `deep_reveal_reset_at` from the anonymous profile init shape; change default `tier` from `'anonymous'` to `'free'`

**Checkpoint**: App loads without error with the new DB version. Existing puzzle_attempts and session_stats data is preserved on upgrade.

---

## Phase 3: User Story 1 — Sign In with Magic Link (Priority: P1) 🎯 MVP

**Goal**: Reskin `AuthModal` to match the new visual design — `modal-card` + `sheet-backdrop` pattern, email stage, sent stage, conditional mount.

**Independent Test**: Open the app unauthenticated, tap the profile icon (HomeScreen). Verify: (1) modal appears with green icon, "Sign in to DecodeC4" heading, subtitle, email input, "Continue with email" primary button, "Maybe later" ghost button; (2) "Maybe later" closes modal; (3) submitting an email transitions to the sent stage showing check-icon, "Check your inbox", magic link copy, and "Back" ghost button; (4) "Back" returns to email stage with cleared field.

- [x] T006 [P] [US1] Add new i18n keys to `connect-four/src/i18n/en.json` under the `auth` namespace: `auth.subtitle` = "Save your progress, streaks, and stats across devices.", `auth.checkInbox` = "Check your inbox", `auth.magicLinkSent` = "We sent a magic link to your email. Tap it to sign in.", `auth.continueWithEmail` = "Continue with email"; update `auth.deepRevealGate` = "Create a free account to unlock 20 Deep Reveals per week."; keep deprecated `auth.checkEmail` and `auth.sendLink` in place; do NOT add `auth.maybeLater` (reuse existing `auth.dismiss: "Maybe later"`)
- [x] T007 [US1] Rewrite `connect-four/src/components/AuthModal.jsx` — drop `isOpen` prop entirely (component is always mounted when rendered); implement two-stage layout: email stage (green circle icon, `auth.signIn` heading, `auth.subtitle` subtitle, styled email input, `auth.continueWithEmail` primary button, `auth.dismiss` ghost button) and sent stage (check-icon circle using `var(--eval-good-bg)`, `auth.checkInbox` heading, `auth.magicLinkSent` copy, `auth.dismiss` "Back" ghost button that clears email and resets to email stage); use `modal-card` + `sheet-backdrop` CSS classes; call `supabase.auth.signInWithOtp({ email })` on submit; call `track('signup_initiated', { method: 'magic_link' })` on successful OTP send; receive only `{ onClose, reason }` props; all user-facing strings use i18n keys (no hardcoded English in JSX); OTP email error stays on email stage (silently caught)
- [x] T008 [US1] Update all `AuthModal` callers to use conditional mount — in `connect-four/src/screens/HomeScreen.jsx`: replace `<AuthModal isOpen={authOpen} ... />` with `{authOpen && <AuthModal ... />}`; in `connect-four/src/components/DeepRevealButton.jsx`: same conversion; in `connect-four/src/components/AuthModal.jsx` internal `AuthGate` usage: same conversion (grep for all `<AuthModal` usages and convert each)

**Checkpoint**: AuthModal matches the mockup in both stages. "Maybe later" closes. Email submit shows sent stage. "Back" resets to email stage.

---

## Phase 4: User Story 2 — Device-Local Progress for Anonymous Users (Priority: P2)

**Goal**: Extend `IndexedDBStore` with `lesson_progress`, `sparring_record`, challenge session, and streak methods. Anonymous users accumulate data locally that survives app reloads.

**Independent Test**: Without signing in — (1) call `saveLessonProgress('lesson-01', 'complete')`, reload, call `getLessonProgress()`, verify result contains `{ lessonId: 'lesson-01', status: 'complete' }`; (2) call `saveSparringRecord('win')`, reload, call `getSparringRecord()`, verify `{ W: 1, L: 0, D: 0 }`; (3) call `recordActivityDay()`, call `getStreak()`, verify `{ streak_count: 1, last_active_date: <today> }`; (4) call `recordActivityDay()` again same day, verify streak_count still 1; (5) verify Stats screen shows non-zero values after these operations and an app reload.

- [x] T009 [P] [US2] Implement `saveLessonProgress(lessonId, status)` and `getLessonProgress()` in `connect-four/src/store/IndexedDBStore.js` — `saveLessonProgress` does a `put({ lessonId, status })` in the `lesson_progress` store (upsert by keyPath); `getLessonProgress` does a `getAll()` returning `Array<{lessonId, status}>`; default return when store is empty is `[]`
- [x] T010 [P] [US2] Implement `saveSparringRecord(result)` and `getSparringRecord()` in `connect-four/src/store/IndexedDBStore.js` — `getSparringRecord` reads the singleton (`id: 'singleton'`), returns `{W:0,L:0,D:0}` if not found; `saveSparringRecord` reads, increments the matching key (`win→W`, `loss→L`, `draw→D`), writes back with `put`
- [x] T011 [P] [US2] Implement `saveChallengeSession(session)` and `getLastChallengeSession()` in `connect-four/src/store/IndexedDBStore.js` — `saveChallengeSession` does a `put(session)` in the existing `session_stats` store (keyPath `date`; overwrites by date); `getLastChallengeSession` opens a cursor on `session_stats` in `prev` direction and returns the first record, or `null` if empty
- [x] T012 [P] [US2] Implement `recordActivityDay()` and `getStreak()` in `connect-four/src/store/IndexedDBStore.js` — `getStreak` reads the `streak` singleton (`id: 'singleton'`), returns `{streak_count:0, last_active_date:null}` if not found; `recordActivityDay` reads current streak, computes today/yesterday as `YYYY-MM-DD` strings using local timezone, applies rules: today→no-op; yesterday→`streak_count+1, last_active_date=today`; older or null→`streak_count=1, last_active_date=today`; writes back with `put({ id: 'singleton', streak_count, last_active_date })`

**Checkpoint**: All four method pairs function correctly in IndexedDB. Stats screen shows non-zero values after completing actions and reloading.

---

## Phase 5: User Story 3 — Progress Migrates to Server on Sign-In (Priority: P2)

**Goal**: Extend `IndexedDBStore.migrateToSupabase()` to include the new data types (lesson progress, sparring record, all challenge sessions, streak), and implement the matching methods in `SupabaseStore`.

**Independent Test**: Seed IndexedDB with `saveLessonProgress`, `saveSparringRecord`, `saveChallengeSession`, `recordActivityDay`, and a puzzle attempt. Trigger sign-in (which calls `migrateToSupabase`). Query Supabase tables to verify all data is present in `lesson_progress`, `users.sparring_record`, `session_stats`, `users.streak_count`/`users.last_active_date`. Verify IndexedDB stores are cleared after successful migration. Simulate a Supabase write failure; verify IndexedDB is NOT cleared.

- [x] T013 [P] [US3] Implement `saveLessonProgress(lessonId, status)` and `getLessonProgress()` in `connect-four/src/store/SupabaseStore.js` — `saveLessonProgress` upserts into `lesson_progress` table with `{ user_id: this._userId, lesson_id: lessonId, completed_at: new Date().toISOString() }` using `onConflict: 'user_id,lesson_id'`; `getLessonProgress` SELECTs `lesson_id, completed_at` WHERE `user_id = this._userId`, maps rows: `completed_at != null → { lessonId: row.lesson_id, status: 'complete' }`, else `{ lessonId: row.lesson_id, status: 'incomplete' }`
- [x] T014 [P] [US3] Implement `saveSparringRecord(result)` and `getSparringRecord()` in `connect-four/src/store/SupabaseStore.js` — `getSparringRecord` SELECTs `sparring_record` from `users` WHERE `id = this._userId`, returns `data?.sparring_record ?? {W:0,L:0,D:0}`; `saveSparringRecord` reads current record, merges with `{W:0,L:0,D:0}`, increments the matching key (`win→W`, `loss→L`, `draw→D`), UPDATEs `users.sparring_record` (read-modify-write per Decision 6)
- [x] T015 [P] [US3] Implement `saveChallengeSession(session)` and `getLastChallengeSession()` in `connect-four/src/store/SupabaseStore.js` — `saveChallengeSession` upserts `{ user_id: this._userId, date: session.date, stats: session }` into `session_stats` using `onConflict: 'user_id,date'`; `getLastChallengeSession` SELECTs from `session_stats` WHERE `user_id = this._userId` ORDER BY `date DESC` LIMIT 1; returns `row?.stats ?? null` (bare session object, not the full DB row)
- [x] T016 [P] [US3] Implement `recordActivityDay()` and `getStreak()` in `connect-four/src/store/SupabaseStore.js` — `getStreak` SELECTs `streak_count, last_active_date` from `users` WHERE `id = this._userId`, returns `{ streak_count: data?.streak_count ?? 0, last_active_date: data?.last_active_date ?? null }`; `recordActivityDay` reads current streak via `getStreak()`, applies same 3-branch logic as IndexedDB (today→no-op, yesterday→+1, older/null→reset to 1), UPDATEs `users.streak_count` and `users.last_active_date`; uses same `YYYY-MM-DD` local-timezone date comparison (Decision 3)
- [x] T017 [US3] Extend `migrateToSupabase()` in `connect-four/src/store/IndexedDBStore.js` — add migration of lesson progress (bulk upsert all `lesson_progress` rows to Supabase), sparring record (UPDATE `users.sparring_record`), all `session_stats` rows (fix existing data-loss bug: INSERT each row as `{ user_id, date, stats: sessionObject }` BEFORE clearing), streak state (UPDATE `users.streak_count` + `users.last_active_date`); use `Promise.all` for parallel writes; implement all-or-nothing clear: only clear all migrated stores (`lesson_progress`, `sparring_record`, `streak`, `puzzle_attempts`, `session_stats`) after ALL writes succeed; if any write throws, catch, re-throw, skip clear step; do NOT migrate anonymous `deep_reveal_count`/`deep_reveal_reset_at` (they don't exist in IndexedDB per FR-011)

**Checkpoint**: Sign-in after accumulating device-local data results in all data present in Supabase and IndexedDB cleared. A simulated Supabase failure preserves IndexedDB data.

---

## Phase 6: User Story 4 — Authenticated User Cross-Session Stats (Priority: P2)

**Goal**: Implement `getAllSessionStats()` in `SupabaseStore` and remove the paid-tier guard from `saveSessionStats()`.

**Independent Test**: Insert known `session_stats` rows in Supabase for a user (two rows with different categories and accuracy values). Call `getAllSessionStats()`; verify `rows` array length matches, `byPattern` aggregates accuracy correctly per category. Call `saveSessionStats()` as a `free`-tier user; verify row appears in `session_stats`.

- [x] T018 [P] [US4] Implement `getAllSessionStats()` in `connect-four/src/store/SupabaseStore.js` — SELECT all `session_stats` rows WHERE `user_id = this._userId`; aggregate per-pattern accuracy in JS using a **count-weighted mean**: for each row's `stats.category`, treat the row's `accuracy` value directly and weight it by the number of attempts in that session for that category (use `optimalCount + blunderCount + suboptimalCount` if available, or equal weight if not stored); aggregate as `sum(accuracy_i * weight_i) / sum(weight_i)`; do NOT reconstruct `correct = accuracy × (optimalCount + blunderCount)` (suboptimal moves are not in that denominator, making it unreliable); return `{ rows, byPattern: { [category]: { accuracy, attempted } } }` (per Decision 7 return shape)
- [x] T019 [US4] Fix `saveSessionStats()` in `connect-four/src/store/SupabaseStore.js` — remove the `if (profile.tier !== 'paid') return;` guard so all authenticated users' session stats are saved regardless of tier (FR-013)

**Checkpoint**: `saveSessionStats` saves for free-tier users. `getAllSessionStats` returns aggregated per-pattern accuracy.

---

## Phase 7: User Story 5 — Deep Reveal Weekly Quota (Priority: P3)

**Goal**: Fix `checkAndDecrementQuota` (cap 20/week Monday reset), add 401 guard to `/api/explain-move-llm`, and remove the quota call from the old `/api/explain-move` endpoint.

**Independent Test**: (1) Send a request to `POST /api/explain-move-llm` without auth header; verify `401 Unauthorized`. (2) Send 20 authenticated requests from a free-tier user; verify all succeed. (3) Send the 21st; verify `429 Too Many Requests` with body `{ error: 'quota_exceeded', resetsAt: <ISO> }`. (4) Advance `deep_reveal_reset_at` to a past Monday; send another request; verify it succeeds and quota resets.

- [x] T020 [US5] Update `checkAndDecrementQuota()` in `connect-four/server/index.js` — replace cap 3 → 20; replace daily-midnight reset with `nextMondayUtcMidnight()` helper (per Decision 5: `dayOfWeek === 1 ? 7 : (8 - dayOfWeek) % 7` days ahead; always strictly next future Monday); handle `deep_reveal_reset_at === null` as "already expired" (reset to next Monday and allow the request); return `{ allowed: boolean, resetsAt: string }` shape from the function so callers can include `resetsAt` in 429 responses
- [x] T021 [US5] Add 401 guard and quota enforcement to the `/api/explain-move-llm` handler in `connect-four/server/index.js` — at the top of the handler add `if (!req.user) return res.status(401).json({ error: 'Unauthorized' })`; after the 401 guard, call `checkAndDecrementQuota(req.user)` for `free`-tier users; if `!quota.allowed` return `res.status(429).json({ error: 'quota_exceeded', resetsAt: quota.resetsAt })`; `paid`-tier users skip quota check unconditionally; `loadUser` middleware is already global (line 166 in `index.js`) — no new middleware wiring needed
- [x] T022 [P] [US5] Remove quota call from the old `/api/explain-move` endpoint in `connect-four/server/index.js` — delete the `checkAndDecrementQuota(req.user)` call at the `requestDeepReveal && req.user` guard (~line 416); the anonymous `requestDeepReveal && !req.user` 403 gate is preserved; deep reveal payload on this endpoint remains free (no quota gate)

**Checkpoint**: 401 on unauthenticated request. 21st free-tier request returns 429 with `resetsAt`. Old `/api/explain-move` no longer decrements quota.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Documentation updates mandated by Constitution §VIII. MUST be completed before the feature is marked shipped.

- [x] T023 [P] Update `docs/architecture/frontend-conventions.md` — add 8 new methods to the Store Interface table (`saveLessonProgress`, `getLessonProgress`, `saveSparringRecord`, `getSparringRecord`, `saveChallengeSession`, `getLastChallengeSession`, `recordActivityDay`, `getStreak`); note that `getProfile()` from `IndexedDBStore` no longer returns `deep_reveal_count`/`deep_reveal_reset_at`; note `IndexedDBStore` is now version 2
- [x] T024 [P] Update `docs/architecture/db-schema.md` — add new `users` columns from migration 020 (`streak_count`, `last_active_date`, `sparring_record`); add `lesson_progress` table from migration 021 (all columns, RLS, grants); update `deep_reveal_reset_at` to nullable per migration 022
- [x] T025 [P] Update `docs/architecture/server-conventions.md` — update Deep Reveal quota documentation: cap 20/week, Monday 00:00 UTC reset; note 401 is returned for unauthenticated requests to `/api/explain-move-llm`; note quota is enforced on `/api/explain-move-llm` only (not on old `/api/explain-move`)
- [x] T026 [P] Amend constitution — make the following three changes and bump patch version `1.3.1 → 1.3.2`:
  1. **Line 218 (tier table)**: update the free-tier Deep Reveals entry from "3 Deep Reveals per day" to "20 Deep Reveals per week (resets Monday 00:00 UTC)"
  2. **Line 222**: change "3/day for free users" (or equivalent phrasing) to "20/week (resets Monday 00:00 UTC) for free users"
  3. **Line 223**: replace "Anonymous quota is keyed to the device-bound UUID and is not migrated on signup" with "Anonymous users have no Deep Reveal quota — they see the AuthModal when they tap Learn more"

**Checkpoint**: All four architecture docs updated. Constitution tier table reflects the new quota values. Feature is ready to ship.

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Migrations) ─────────────────────────────► Phase 6 (SupabaseStore session stats)
                     └─────────────────────────────► Phase 5 (SupabaseStore migration — C methods)
Phase 2 (IndexedDB refactor) ─────────────────────► Phase 4 (IndexedDB methods)
                             └─────────────────────► Phase 5 (migrateToSupabase extension)
Phase 3 (AuthModal) — independent, no dependencies
Phase 4 (IndexedDB methods) ──────────────────────► Phase 5 (migrateToSupabase needs B methods)
Phase 5 (SupabaseStore C methods) ────────────────► Phase 8 (docs, after all implementation)
Phase 6 (getAllSessionStats, saveSessionStats fix) ► Phase 8
Phase 7 (Server quota fix) — independent, no dependency on Phases 1–6
Phase 8 (Docs) — after all implementation phases complete
```

### User Story Dependencies

- **US1 (P1) — AuthModal**: Fully independent. Can start immediately.
- **US2 (P2) — IndexedDB anonymous progress**: Depends on Phase 2 (IndexedDB refactor).
- **US3 (P2) — Migration on sign-in**: Depends on Phase 1 (migrations applied), Phase 2 (IndexedDB refactor), Phase 4 (IndexedDB methods B3–B6 implemented), and Phase 5 SupabaseStore methods.
- **US4 (P2) — Authenticated cross-session stats**: Depends on Phase 1 (migration 020 applied for `session_stats` `user_id` column).
- **US5 (P3) — Deep Reveal quota**: Fully independent of all other stories.

### Recommended Execution Order

Serial within each phase. Phases that can start in parallel:

```
Immediately:  Phase 1 (write migrations) + Phase 2 (IndexedDB refactor) + Phase 3 (AuthModal) + Phase 7 (server quota)
After Phase 1 applied + Phase 2 done:  Phase 4 (IndexedDB methods) + Phase 5 SupabaseStore + Phase 6
After all implementation:  Phase 8 (docs)
```

### Within Each Phase — Parallel Opportunities

- **Phase 1**: T001, T002, T003 are all independent SQL files — run in parallel.
- **Phase 4**: T009, T010, T011, T012 are all independent methods in the same file — implement in parallel (different method names, no cross-dependency).
- **Phase 5**: T013, T014, T015, T016 are all independent SupabaseStore methods — run in parallel. T017 (migrateToSupabase) depends on T009–T016.
- **Phase 6**: T018, T019 are independent — run in parallel.
- **Phase 7**: T020 and T022 are independent. T021 depends on T020 (quota helper must be updated before wiring it).
- **Phase 8**: T023, T024, T025, T026 are all independent doc files — run in parallel.

---

## Parallel Execution Examples

### Phase 1 — Migrations (all three in parallel)

```
T001: write 020_users_progress_columns.sql
T002: write 021_lesson_progress_table.sql
T003: write 022_deep_reveal_reset_nullable.sql
```

### Phase 4 — IndexedDB Methods (all in parallel, same file different methods)

```
T009: saveLessonProgress / getLessonProgress
T010: saveSparringRecord / getSparringRecord
T011: saveChallengeSession / getLastChallengeSession
T012: recordActivityDay / getStreak
```

### Phase 8 — Docs (all in parallel)

```
T023: frontend-conventions.md
T024: db-schema.md
T025: server-conventions.md
T026: constitution
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 3 (AuthModal reskin) — fully independent
2. Validate: AuthModal matches mockup in both stages, conditional mount works
3. Deliver US1

### Incremental Delivery

1. Phases 1 + 2 + 3 + 7 (all independent) → Foundation + AuthModal + Server quota ready
2. Phase 4 (IndexedDB methods) → US2 complete: anonymous progress persists across reloads
3. Phases 5 + 6 (SupabaseStore) → US3 + US4 complete: migration on sign-in, cross-session stats
4. Phase 8 (docs) → Ship

---

## Notes

- [P] tasks = different files or independent methods with no blocking dependency
- [USn] label maps task to specific user story for traceability
- `migrateToSupabase` (T017) has a **bug fix**: existing code clears `session_stats` without first writing to Supabase — a data-loss bug. T017 MUST fix this.
- Migrations must be applied to local Supabase before SupabaseStore work (T013–T019) can be tested.
- `loadUser` middleware is already global in `server/index.js` — T021 only adds a handler-level guard, not middleware wiring.
- `auth.dismiss: "Maybe later"` already exists in `en.json`; do NOT add `auth.maybeLater` (spec FR-002 explicit).
- Streak date comparison uses local timezone, not UTC (Decision 3).
- `getLastChallengeSession` in both stores returns the bare session object (not the full DB row) — callers receive identical shapes.
