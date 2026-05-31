# Feature Specification: Auth & Progress Persistence (Epic 7)

**Feature Branch**: `012-auth-progress-persistence`  
**Created**: 2026-05-30  
**Status**: Draft  
**Depends on**: Epic 1b (App Shell & Navigation)  
**Feeds into**: Epics 2a, 2b, 3a, 3b, 3c, 4

---

## Overview

Ship authentication and all device-local / server-side persistence layers early — before any surface epic (Challenges, Sparring, Lessons) — so every subsequent epic writes to the correct store from day one. This epic covers three concerns: (1) reskin `AuthModal` to match the new visual design, (2) extend `IndexedDBStore` and `SupabaseStore` with the new data types all surfaces need, and (3) fix the Deep Reveal weekly quota system.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Sign In with Magic Link (Priority: P1)

An anonymous user on the Home Hub taps the profile icon (top-right corner) to sign in. A bottom-sheet modal appears with the new visual style. They enter their email, tap "Continue with email," see a "Check your inbox" confirmation, then tap the magic link in their email to complete sign-in. On return to the app, they are authenticated and the profile icon now navigates to the Stats screen.

**Why this priority**: Auth is the prerequisite for all cross-device progress persistence. Everything else in this epic depends on having a functioning, well-styled auth flow.

**Independent Test**: Can be fully tested by tapping the profile icon on the Home Hub (unauthenticated), submitting a real email address, and confirming that the OTP magic link signs the user in — delivering authenticated state with cross-device persistence.

**Acceptance Scenarios**:

1. **Given** the user is unauthenticated and on the Home Hub, **When** they tap the profile icon, **Then** the `AuthModal` appears using the `modal-card` + `sheet-backdrop` pattern (light background card, green user icon, "Sign in to DecodeC4" heading, email input, "Continue with email" primary button, "Maybe later" ghost button).
2. **Given** the email stage is shown, **When** the user taps "Maybe later", **Then** the modal closes and the user remains on the Home Hub with no state change.
3. **Given** the email stage is shown, **When** the user submits a valid email, **Then** the modal transitions to the sent stage showing a check-icon circle, "Check your inbox" heading, the magic link copy, and a "Back" ghost button.
4. **Given** the sent stage is shown, **When** the user taps "Back", **Then** the modal returns to the email stage with the email field cleared.
5. **Given** a magic link OTP was submitted, **When** `track` is called, **Then** a `signup_initiated` event with `{ method: 'magic_link' }` is emitted.
6. **Given** the user clicks the magic link in their email and returns to the app, **When** auth state changes to signed-in, **Then** `track('signup_completed', ...)` fires automatically (already wired in `ProfileStore`) and the active store switches from `IndexedDBStore` to `SupabaseStore`.

---

### User Story 2 — Device-Local Progress Saved for Anonymous Users (Priority: P2)

An anonymous user plays puzzles, completes a lesson, and wins a sparring game. All progress (lesson completion, sparring record, challenge session accuracy, daily streak) is stored locally on the device. If they close and reopen the app, their progress is still there.

**Why this priority**: Without this, the Stats screen (Epic 1b) always shows zeros, destroying the core engagement loop for users who haven't signed up yet.

**Independent Test**: Can be tested by completing one puzzle set (saves a challenge session), marking a lesson complete, and winning a sparring game — then refreshing the app and verifying the Stats screen shows non-zero values from IndexedDB.

**Acceptance Scenarios**:

1. **Given** an anonymous user completes a challenge set, **When** `saveChallengeSession(session)` is called, **Then** the `session_stats` object store is updated (merge/overwrite the per-date row) and `getLastChallengeSession()` returns it on next read.
2. **Given** an anonymous user completes a lesson, **When** `saveLessonProgress(lessonId, 'complete')` is called, **Then** `getLessonProgress()` returns an array containing `{ lessonId, status: 'complete' }` for that lesson.
3. **Given** an anonymous user wins a sparring game, **When** `saveSparringRecord('win')` is called, **Then** `getSparringRecord()` returns `{ W: 1, L: 0, D: 0 }`.
4. **Given** an anonymous user plays a puzzle today for the first time, **When** `recordActivityDay()` is called, **Then** `getStreak()` returns `{ streak_count: 1, last_active_date: <today> }`.
5. **Given** an anonymous user's `last_active_date` is yesterday, **When** `recordActivityDay()` is called today, **Then** `getStreak()` returns `{ streak_count: <prev+1>, last_active_date: <today> }`.
6. **Given** an anonymous user's `last_active_date` is two or more days ago, **When** `recordActivityDay()` is called today, **Then** `getStreak().streak_count` resets to 1.

---

### User Story 3 — Progress Migrates to Server on Sign-In (Priority: P2)

A user who accumulated device-local progress (lessons, sparring record, challenge sessions, streak) signs in for the first time. Their local data migrates automatically to Supabase, so their Stats screen immediately reflects their history in the authenticated view.

**Why this priority**: Without migration, signing in would appear to "erase" progress, creating a frustrating first-session experience.

**Independent Test**: Can be tested by seeding IndexedDB with known data, triggering sign-in (which calls `migrateToSupabase`), then querying the Supabase tables to verify all data was written and IndexedDB was cleared.

**Acceptance Scenarios**:

1. **Given** IndexedDB contains lesson progress, a sparring record, challenge sessions, streak state, and puzzle attempts, **When** `migrateToSupabase()` completes successfully, **Then** all data is present in the corresponding Supabase tables/columns.
2. **Given** migration completes successfully, **When** IndexedDB is read, **Then** all migrated object stores are empty (cleared).
3. **Given** migration fails midway (simulated error), **When** the error is thrown, **Then** IndexedDB is NOT cleared (data is preserved for retry).

---

### User Story 4 — Authenticated User Sees Full Cross-Session Stats (Priority: P2)

An authenticated user opens the Stats screen. They see all-time accuracy aggregated across all challenge sessions, lessons done, sparring record, day streak, and per-pattern accuracy bars — all sourced from Supabase.

**Why this priority**: This is the primary motivation for signing up — persistent, cross-device stats.

**Independent Test**: Can be tested by inserting known `session_stats` rows in Supabase for a user, then loading the Stats screen and verifying the displayed values match the inserted data.

**Acceptance Scenarios**:

1. **Given** a signed-in user with multiple `session_stats` rows, **When** `getAllSessionStats()` is called, **Then** it returns all rows for that user aggregated correctly (per-pattern accuracy computed from the rows).
2. **Given** a signed-in user completes a challenge puzzle, **When** `saveSessionStats(stats)` is called, **Then** the stats row is written to Supabase regardless of tier (the paid-only guard is removed).
3. **Given** a signed-in user with `streak_count: 7` and `last_active_date: yesterday`, **When** `recordActivityDay()` is called, **Then** `users.streak_count` becomes 8 and `users.last_active_date` becomes today.
4. **Given** a signed-in user queries `getStreak()`, **When** `users.last_active_date` is null, **Then** the method returns `{ streak_count: 0, last_active_date: null }`.

---

### User Story 5 — Deep Reveal Weekly Quota Enforced Correctly (Priority: P3)

Authenticated free-tier users can open at most 20 Deep Reveal explanations per week, resetting Monday 00:00 UTC. When the cap is reached, tapping "Learn more" shows the `UpgradeModal`. Pro users have no limit. Anonymous users who tap "Learn more" are shown the `AuthModal` — there is no anonymous quota, no anonymous counter.

**Why this priority**: The quota gate is a freemium enforcement mechanism. Without it, the LLM cost is unbounded. It is P3 here because the quota fix is a server-side correctness issue — surfaces that call Deep Reveal are built in later epics.

**Independent Test**: Can be tested on `/api/explain-move-llm` by sending 20 authenticated requests with a free-tier user, then verifying the 21st returns `429`, and then advancing the clock past Monday 00:00 UTC and verifying the 22nd succeeds.

**Acceptance Scenarios**:

1. **Given** an unauthenticated request hits `/api/explain-move-llm`, **When** the server processes it, **Then** it responds with `401 Unauthorized` (server enforcement; client-side `AuthModal` is the first-line gate for anonymous users).
2. **Given** a free-tier authenticated user has `deep_reveal_count: 19`, **When** they request a Deep Reveal, **Then** the request succeeds and `deep_reveal_count` becomes 20.
3. **Given** a free-tier authenticated user has `deep_reveal_count: 20` and `deep_reveal_reset_at` is in the future, **When** they request a Deep Reveal, **Then** the server rejects with `429 Too Many Requests` and body `{ error: 'quota_exceeded', resetsAt: <ISO timestamp> }`.
4. **Given** a free-tier authenticated user has `deep_reveal_reset_at` in the past (week has elapsed), **When** they request a Deep Reveal, **Then** the quota resets to 0, the request is allowed, and `deep_reveal_reset_at` is set to next Monday 00:00 UTC.
5. **Given** a `paid`-tier user requests a Deep Reveal, **When** the server processes it, **Then** no quota check is performed and the request is allowed unconditionally.

---

### Edge Cases

- What happens when `recordActivityDay()` is called multiple times on the same calendar day? → No-op after the first call (streak_count unchanged, last_active_date already set to today).
- What happens when the migration API is called but the user has zero data in IndexedDB? → Migration succeeds immediately (empty inserts are no-ops); IndexedDB is still cleared.
- What happens when `migrateToSupabase` is called on a `SupabaseStore` instance by mistake? → Throws `"migrateToSupabase called on SupabaseStore"` (already implemented; preserve).
- What happens when the OTP email fails to send (Supabase error)? → The modal stays on the email stage; the error is silently caught (same behavior as current implementation); the user can retry.
- What happens if `lesson_progress` has a unique constraint conflict on upsert? → `saveLessonProgress` uses an upsert with `onConflict: 'user_id,lesson_id'` — it updates `completed_at` in place without creating a duplicate.
- What happens when `getLastChallengeSession()` is called with no sessions in the `session_stats` store? → Returns `null`.
- What happens if the server's `deep_reveal_reset_at` is null for an existing user row? → Treat as "already expired": reset to next Monday 00:00 UTC and allow the request.

---

## Requirements *(mandatory)*

### Functional Requirements

**Auth UI:**

- **FR-001**: `AuthModal` MUST render using the `modal-card` + `sheet-backdrop` pattern with a light-background card (matching `docs/mvp/mockup/project/screens_home.jsx`).
- **FR-002**: The email stage MUST display a green circle icon, "Sign in to DecodeC4" heading (i18n: `auth.signIn` — existing key), subtitle "Save your progress, streaks, and stats across devices." (i18n: `auth.subtitle` — NEW key), a styled email input, a "Continue with email" primary button, and a "Maybe later" ghost button (i18n: `auth.dismiss` — existing key; do NOT add a new `auth.maybeLater` key).
- **FR-003**: The sent stage MUST display a check-icon circle using `var(--eval-good-bg)`, "Check your inbox" heading (i18n: `auth.checkInbox` — NEW key, replaces `auth.checkEmail`), the magic link copy (i18n: `auth.magicLinkSent` — NEW key, replaces `auth.sendLink`), and a "Back" ghost button that resets to the email stage.
- **FR-004**: `AuthModal` MUST be conditionally mounted by its parent with no `isOpen` prop. The component receives `{ onClose, reason }` only. Existing callers that pass `isOpen` MUST be updated (grep for `AuthModal` usages and convert each to conditional render). The existing `onClose` and `reason` props are preserved unchanged. `supabase.auth.signInWithOtp({ email })` is called on submit; `track('signup_initiated', { method: 'magic_link' })` fires on successful OTP send.

  > **Existing AuthModal API (for reference):**  
  > Current props: `{ isOpen, onClose, reason }`.  
  > Current i18n keys in use: `auth.signIn`, `auth.email`, `auth.sendLink`, `auth.checkEmail`.  
  > After this epic: `isOpen` is dropped (conditional mount); `auth.subtitle` is NEW; `auth.checkInbox` is NEW (replaces `auth.checkEmail`); `auth.magicLinkSent` is NEW (replaces `auth.sendLink`); `auth.email` is preserved.

- **FR-005**: All user-facing strings in `AuthModal` MUST go through i18n keys; no hardcoded English strings in JSX.

**IndexedDBStore extensions:**

- **FR-006**: `IndexedDBStore` MUST bump the DB version to 2, adding three new object stores: `lesson_progress` (keyPath: `lessonId`), `sparring_record` (keyPath: `id`), `streak` (keyPath: `id`). Challenge sessions reuse the existing `session_stats` store (keyPath: `date`, put-overwrites by date) — no new `challenge_sessions` store is added.
- **FR-007**: `IndexedDBStore` MUST implement `saveLessonProgress(lessonId, status)` (upsert by `lessonId`) and `getLessonProgress()` (returns `Array<{lessonId, status}>`).
- **FR-008**: `IndexedDBStore` MUST implement `saveSparringRecord(result: 'win'|'loss'|'draw')` (increments W/L/D singleton) and `getSparringRecord()` (returns `{W, L, D}`, defaulting to `{W:0, L:0, D:0}`).
- **FR-009**: `IndexedDBStore` MUST implement `saveChallengeSession(session)` by merging/overwriting the per-date row in the existing `session_stats` store (keyPath: `date`; `put` semantics — one row per date). `getLastChallengeSession()` returns the most recent `session_stats` row or `null`. No separate autoIncrement store is added; no `challenge_sessions` store exists.
- **FR-010**: `IndexedDBStore` MUST implement `recordActivityDay()` (streak logic: today = no-op, yesterday = +1, older = reset to 1) and `getStreak()` (returns `{streak_count, last_active_date}`, defaulting to `{streak_count:0, last_active_date:null}`).
- **FR-011**: `IndexedDBStore.getProfile()` MUST continue to return `{ device_uuid, tier }` (existing fields preserved). `deep_reveal_count` and `deep_reveal_reset_at` are NOT stored in IndexedDB — anonymous users have no quota; they see the `AuthModal` instead.

**SupabaseStore extensions:**

- **FR-012**: `SupabaseStore` MUST implement matching methods with the same interface signatures as `IndexedDBStore`: `saveLessonProgress`, `getLessonProgress`, `saveSparringRecord`, `getSparringRecord`, `saveChallengeSession`, `getLastChallengeSession`, `recordActivityDay`, `getStreak`.
- **FR-013**: `SupabaseStore.saveSessionStats` MUST save stats for any authenticated user regardless of tier (remove the `if (profile.tier !== 'paid') return;` guard).
- **FR-014**: `SupabaseStore` MUST implement `getAllSessionStats()` returning all `session_stats` rows for the user, with per-pattern accuracy aggregated as a **count-weighted mean**: `sum(accuracy_i * weight_i) / sum(weight_i)` where weight is the number of attempts in that session for that category. Do NOT reconstruct `correct = accuracy × (optimalCount + blunderCount)` — suboptimal moves are excluded from that denominator, making the math unreliable.
- **FR-015**: `SupabaseStore.saveSparringRecord` MUST use read-modify-write on `users.sparring_record` JSONB (read current `{W,L,D}`, increment the appropriate key, write back).
- **FR-016**: `SupabaseStore.recordActivityDay` MUST apply the same streak logic as `IndexedDBStore` and persist to `users.streak_count` + `users.last_active_date`.

**Migration:**

- **FR-017**: `IndexedDBStore.migrateToSupabase` MUST migrate lesson progress, sparring record, challenge sessions, and streak state in addition to the existing `puzzle_attempts` and `session_stats` migration. Anonymous deep reveal quota is NOT migrated (no quota exists in IndexedDB).
- **FR-018**: `IndexedDBStore.migrateToSupabase` MUST clear all migrated object stores only after all writes to Supabase succeed; if any write fails, no object stores are cleared.

**DB Migrations:**

- **FR-019**: Migration 020 MUST add `streak_count INTEGER NOT NULL DEFAULT 0`, `last_active_date DATE` (nullable), and `sparring_record JSONB NOT NULL DEFAULT '{"W":0,"L":0,"D":0}'` to the `users` table without backfilling existing rows. The `sparring_record` default is `'{"W":0,"L":0,"D":0}'` (not `'{}'`) so that `saveSparringRecord` never needs to handle missing keys.
- **FR-020**: Migration 021 MUST create the `lesson_progress` table with `(id UUID PK, user_id UUID FK→users ON DELETE CASCADE, lesson_id TEXT, completed_at TIMESTAMPTZ, UNIQUE(user_id, lesson_id))`. There is NO `status` column; completion state is derived by the store at read time (`completed_at != null → 'complete'`, `null → 'incomplete'`). RLS: standard per-user row-level security (user can only read/write their own rows) — `auth.uid() = user_id` is the only access control. The migration MUST NOT grant to `anon`: `GRANT SELECT, INSERT, UPDATE, DELETE ON lesson_progress TO authenticated` only. No anonymous code path writes lesson_progress. `SupabaseStore` reads and writes through PostgREST using the user's own token — no service-role access required.
- **FR-021**: Migration 022 MUST ensure `users.deep_reveal_reset_at` column exists and is nullable. The next-Monday-00:00-UTC computation lives entirely in the server-side `checkAndDecrementQuota` helper. The migration MUST NOT change the column DEFAULT to a computed expression.
- **FR-022**: All migration files MUST follow the `NNN_slug.sql` naming convention and include the required comment block (migration number, description, `-- HUMAN REVIEW REQUIRED before applying to production.`).

**Deep Reveal Quota:**

- **FR-023**: The bearer-token user-resolution middleware currently applied to `/api/explain-move` MUST also be applied to `/api/explain-move-llm`. The LLM handler MUST read `req.user`. Unauthenticated requests receive `401 Unauthorized`.
- **FR-024**: `/api/explain-move-llm` MUST enforce a weekly cap of 20 Deep Reveal calls for `free`-tier authenticated users; the cap resets at next Monday 00:00 UTC. When the cap is exceeded, the server MUST respond with `429 Too Many Requests` and body `{ error: 'quota_exceeded', resetsAt: <ISO timestamp> }` so the client can show the `UpgradeModal`.
- **FR-025**: `checkAndDecrementQuota` in `server/index.js` MUST be updated from cap-3/daily-reset to cap-20/weekly-Monday-reset.
- **FR-026**: The quota check on `/api/explain-move` (old endpoint) MUST be removed or left harmless; quota enforcement lives on `/api/explain-move-llm` only.

**Streak triggers:**

- **FR-027**: `recordActivityDay()` MUST be called on exactly two surfaces: completing a puzzle attempt (Challenges) and completing a sparring game. Lessons, app opens, and all other interactions do NOT bump the streak.

### Key Entities

- **Profile (IndexedDB)**: Device-local anonymous identity. Fields: `device_uuid`, `tier`. Singleton per device. `deep_reveal_count` and `deep_reveal_reset_at` are NOT stored here — anonymous users have no quota.
- **LessonProgress**: Maps a lesson ID to its completion state. Keyed by `(user_id|device, lessonId)`.
- **SparringRecord**: Singleton `{W, L, D}` counts per user/device.
- **ChallengeSession**: Per-session accuracy snapshot: `{ category, accuracy, optimalCount, blunderCount, date, ... }`. Stored by overwriting the per-date row in `session_stats` (keyPath: `date`).
- **Streak**: Singleton `{ streak_count, last_active_date }` per user/device.
- **users (Supabase, existing table extended)**: Added columns `streak_count`, `last_active_date`, `sparring_record`. Existing: `deep_reveal_count`, `deep_reveal_reset_at`, `tier`, `device_uuid`.
- **lesson_progress (Supabase, new table)**: `(id, user_id, lesson_id, completed_at)` with unique constraint on `(user_id, lesson_id)`. No `status` column — completion state is derived: `completed_at != null → 'complete'`, `null → 'incomplete'`.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A returning anonymous user who completed a sparring game and a lesson in a previous session sees non-zero values on the Stats screen without signing in — data persists across app reloads.
- **SC-002**: A user who signs in after accumulating device-local data sees all their progress (lessons, sparring record, challenge sessions, streak) reflected on the authenticated Stats screen immediately after sign-in — zero data loss during migration.
- **SC-003**: The 21st Deep Reveal request in a given week from a free-tier authenticated user is rejected by the server with `429 Too Many Requests` (quota enforced); the same user's 1st request in the following week succeeds (quota resets Monday).
- **SC-004**: An unauthenticated request to `/api/explain-move-llm` is rejected with `401 Unauthorized` without any quota being decremented.
- **SC-005**: The `AuthModal` is visually indistinguishable from the mockup (`screens_home.jsx`) in both the email and sent stages — same card pattern, colors, icon, button labels, and layout.
- **SC-006**: All new `IndexedDBStore` methods pass unit tests covering the happy path and the "no existing data" default return case.
- **SC-007**: `SupabaseStore.saveSessionStats` saves a row for a `free`-tier user (not only `paid`).

---

## Assumptions

- **IndexedDB over localStorage**: The existing store layer uses IndexedDB. The Gap 2 requirement for "device-local storage" is treated as medium-agnostic; no switch to localStorage.
- **Store interface contract**: Both `IndexedDBStore` and `SupabaseStore` expose the same method signatures so `ProfileStore` can swap them transparently on sign-in. All new methods added here must follow this contract.
- **Magic-link OTP only**: Auth uses Supabase magic-link OTP. No password, OAuth, or SSO is added. The existing `signInWithOtp` call is preserved.
- **lesson_progress access via PostgREST**: `SupabaseStore.getLessonProgress()` reads from the `lesson_progress` table through PostgREST using the authenticated user's token. RLS policy `auth.uid() = user_id` ensures the user can only access their own rows. The migration grants to `authenticated` role only (not `anon`). No service-role access is needed for this epic.
- **session_stats table reuse for challenge sessions**: `saveChallengeSession` maps to `session_stats` (existing table). The shape is compatible: `{ user_id, date, stats (jsonb), ... }`. One row per date; `put` semantics overwrite the row if the user plays multiple sets on the same day.
- **`UpgradeModal` from Epic 1a**: This epic does not build `UpgradeModal`. The quota cap UI logic (showing `UpgradeModal` when cap reached) is wired in Epics 2b/3b/3c when Deep Reveal panels are built. This epic only delivers the quota enforcement infrastructure (server 429 + `resetsAt` in response body).
- **No anonymous Deep Reveal quota**: Anonymous users who tap "Learn more" see the `AuthModal` as the gate — no client-side quota counter, no `deepRevealQuota.js` module, no IndexedDB quota fields. The server returns 401 for unauthenticated requests; the client shows `AuthModal` before the request is made.
- **No new server endpoints**: This epic adds no new API routes. The only server-side changes are: (a) wiring user-resolution middleware onto `/api/explain-move-llm` and (b) fixing `checkAndDecrementQuota`.
- **Stripe routes untouched**: Existing Stripe webhook and checkout routes remain in `server/index.js` but are not wired to any UI flow. `users.tier` stays `'free'` for all users.
- **ProfileStore.switchToSupabase already implemented**: The migration trigger (`supabase.auth.onAuthStateChange` → `migrateToSupabase` → swap store) is already wired in `ProfileStore.jsx`. This epic extends the migration payload, not the trigger mechanism.
- **i18n keys**: `auth.subtitle` (NEW), `auth.checkInbox` (NEW, replaces `auth.checkEmail`), `auth.magicLinkSent` (NEW, replaces `auth.sendLink`), `auth.continueWithEmail` (NEW) added to `en.json`. `auth.signIn`, `auth.email`, and `auth.dismiss` are preserved. `auth.maybeLater` is NOT added — `auth.dismiss: "Maybe later"` already exists. The existing `auth.deepRevealGate` copy MUST be updated to `"Create a free account to unlock 20 Deep Reveals per week."`. `es.json` stub remains empty.
