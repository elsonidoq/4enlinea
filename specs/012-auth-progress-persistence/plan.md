# Implementation Plan: Auth & Progress Persistence (Epic 7)

**Branch**: `101-new-design` | **Date**: 2026-05-30 | **Spec**: `specs/012-auth-progress-persistence/spec.md`

---

## Summary

Reskin `AuthModal` to match the new visual design (conditional mount, `modal-card` + `sheet-backdrop` pattern), extend `IndexedDBStore` (version 2: three new object stores) and `SupabaseStore` (eight new methods + `saveSessionStats` tier-guard removal) with the data types all subsequent surfaces need, and fix the Deep Reveal weekly quota system on `/api/explain-move-llm` (cap 20/week Monday reset, 401 for unauthenticated). Three DB migrations add `streak_count`, `last_active_date`, `sparring_record` to `users`; create the `lesson_progress` table; and make `deep_reveal_reset_at` nullable.

---

## Technical Context

**Language/Version**: JavaScript (ES2022) + React 18, JSX (frontend); Node.js (server)  
**Primary Dependencies**: React, react-i18next, `@supabase/supabase-js`, Vite (frontend); Express, `@supabase/supabase-js` (server)  
**Storage**: IndexedDB version 2 (anonymous users); Supabase via PostgREST anon token (authenticated users); server uses service-role key for quota updates  
**Testing**: Manual verification on golden paths (UI); no solver dependency in this epic  
**Target Platform**: Mobile-first PWA, Chrome/Safari  
**Performance Goals**: Store methods (IndexedDB) complete in < 50 ms; SupabaseStore methods non-blocking (fire-and-continue); quota check adds < 100 ms to `/api/explain-move-llm`  
**Constraints**: IndexedDB upgrade must preserve existing data (version 1 stores untouched); `ProfileStore.switchToSupabase` trigger mechanism is NOT changed — only migration payload is extended  
**Scale/Scope**: 3 new DB migrations; 1 component reskin (AuthModal); 8 new store methods × 2 implementations; 2 server endpoint changes; ~8 new i18n keys

---

## Constitution Check

*GATE: All principles verified before Phase 0 research and re-verified after Phase 1 design.*

**§I — Explanation Engine as Single Source of Truth**:
- ✅ Not applicable. This epic adds no move evaluations, pattern labels, or LLM annotations. The quota fix on `/api/explain-move-llm` does not change the explanation pipeline — it only adds an auth guard and a quota check before the existing pipeline runs.

**§II — Code Quality & Simplicity**:
- ✅ Store-agnostic interface honored: all new methods are added to both `IndexedDBStore` and `SupabaseStore` with identical signatures. No component references a concrete store directly.
- ✅ No speculative abstractions: streak logic is a direct 3-branch if/else in each store, not a shared helper (the two implementations have slightly different persistence mechanics).
- ✅ `getProfile()` cleanup removes fields that were defensive but incorrect (anonymous quota fields).
- ✅ Migration atomicity implemented with try/catch + deferred clear, not a premature transaction wrapper.

**§III — Testing Standards**:
- ✅ UI features (AuthModal reskin) manually verified on golden path (email submit, sent stage, back button, maybe-later dismiss) and at least one edge case (OTP email error stays on email stage).
- ✅ IndexedDB methods: unit tests for happy path + "no existing data" default return case (SC-006).
- ✅ Server: `/api/explain-move-llm` quota scenarios tested manually via curl/Postman (21st request → 429, week rollover → 200).
- ✅ No random board generation used. No solver dependency in this epic.

**§IV — UX Consistency & Progressive Disclosure**:
- ✅ `AuthModal` uses `modal-card` + `sheet-backdrop` CSS classes from Epic 1a tokens. No new colors introduced.
- ✅ `UpgradeModal` (from Epic 1a) is the gate shown to authenticated free users who hit the 429 quota — not a new modal.
- ✅ Progressive disclosure: "Learn more" tap is the user gesture required before Deep Reveal shows. No change to this flow.
- ✅ Locked content (quota exhausted): `UpgradeModal` renders a preview/upgrade prompt, not an error.

**§V — Performance Requirements**:
- ✅ Auth/store operations are not on the critical render path. No blocking calls in component mount.
- ✅ Quota check in `/api/explain-move-llm` is < 100 ms (two Supabase reads + one write, all indexed by `user.id`).
- ✅ `recordActivityDay()` is fire-and-forget; callers do not await its result in the UI.
- ✅ Analytics writes (`track()`) remain fire-and-forget.

**§VI — Implementation & Debugging Methodology**:
- ✅ Data dependency map completed in `data-model.md` before any method is implemented. Every UI field traced to its source table.
- ✅ `loadUser` middleware verified to be globally applied (line 166 in `index.js`) before deciding not to add a new route-specific middleware.
- ✅ IndexedDB upgrade path verified: existing `openDB()` does NOT use `e.oldVersion`, requiring a refactor to the version-gated pattern. Discovered during research, documented in `research.md` Decision 2.
- ✅ Migration atomicity load-bearing assumption made explicit: "true atomicity is impossible across IndexedDB and Supabase; best-effort with rollback-by-omission." Documented in `research.md` Decision 4.

**§VII — Design Philosophy**:
- ✅ Explicit over implicit: `isOpen` removal makes modal lifetime explicit at the mount boundary.
- ✅ Flat over nested: streak logic is 3 flat conditions, not a state machine.
- ✅ Simple over complex: `nextMondayUtcMidnight()` is a single pure function, not a date library.

**§VIII — Documentation as First-Class Deliverable**:
- ✅ `docs/architecture/frontend-conventions.md` — task to update Store Interface table (add 8 new methods) and note `getProfile()` field change.
- ✅ `docs/architecture/db-schema.md` — task to add new `users` columns and `lesson_progress` table.
- ✅ `docs/architecture/server-conventions.md` — task to update quota documentation (cap/period change).
- ✅ Constitution tier table lists "3 Deep Reveals per day" — task to amend to "20 Deep Reveals per week, resets Monday UTC."
- ✅ Existing architecture docs (all `docs/architecture/` files, constitution) read before this plan was drafted. No undocumented conventions discovered.

**Constitution Tier Table conflict**: The constitution currently states "3 Deep Reveals per day" for signed-in free users. This epic changes it to 20/week (Monday reset). This is an **intentional spec change** (FR-025), not a violation. A documentation task MUST update the constitution's tier table. No blocking gate violation.

---

## Project Structure

### Documentation (this feature)

```text
specs/012-auth-progress-persistence/
├── plan.md                          # This file
├── research.md                      # Phase 0 — all decisions resolved
├── data-model.md                    # Phase 1 — entity shapes + DB migration map
├── contracts/
│   ├── store-interface.md           # Full store interface contract (cross-epic)
│   └── deep-reveal-quota-api.md     # /api/explain-move-llm request/response contract
└── tasks.md                         # Phase 2 output (via /speckit-tasks)
```

### Source Code (affected files)

```text
connect-four/
├── src/
│   ├── components/
│   │   └── AuthModal.jsx            # Reskin: modal-card + sheet-backdrop, drop isOpen
│   ├── screens/
│   │   └── HomeScreen.jsx           # Convert AuthModal to conditional mount
│   ├── store/
│   │   ├── IndexedDBStore.js        # Version 2, 3 new stores, 8 new methods
│   │   └── SupabaseStore.js         # 8 new methods + saveSessionStats fix
│   └── i18n/
│       └── en.json                  # New auth.* keys
├── server/
│   └── index.js                     # Quota fix + 401 guard on /api/explain-move-llm
└── server/migrations/
    ├── 020_users_progress_columns.sql
    ├── 021_lesson_progress_table.sql
    └── 022_deep_reveal_reset_nullable.sql
```

---

## Implementation Phases

### Phase A — DB Migrations (prerequisite for SupabaseStore)

**A1**: Write and apply `connect-four/server/migrations/020_users_progress_columns.sql`
- Add `streak_count INTEGER NOT NULL DEFAULT 0`
- Add `last_active_date DATE` (nullable, no default)
- Add `sparring_record JSONB NOT NULL DEFAULT '{"W":0,"L":0,"D":0}'`
- No RLS changes; `users` table already has RLS + grants.

**A2**: Write and apply `connect-four/server/migrations/021_lesson_progress_table.sql`
- Create `lesson_progress` table with columns `(id UUID PK, user_id UUID FK→users ON DELETE CASCADE, lesson_id TEXT, completed_at TIMESTAMPTZ, UNIQUE(user_id, lesson_id))` — no `status` column; completion state is derived from `completed_at` at read time
- Enable RLS; policy `auth.uid() = user_id` for SELECT/INSERT/UPDATE/DELETE (only access control; no anon grant)
- `GRANT SELECT, INSERT, UPDATE, DELETE ON lesson_progress TO authenticated` — do NOT grant to `anon`; no anonymous code path writes lesson_progress

**A3**: Write and apply `connect-four/server/migrations/022_deep_reveal_reset_nullable.sql`
- `ALTER TABLE users ADD COLUMN IF NOT EXISTS deep_reveal_reset_at TIMESTAMPTZ` — safe whether or not the column already exists
- `ALTER TABLE users ALTER COLUMN deep_reveal_reset_at DROP NOT NULL` — safe even if the column was just added (already nullable)
- `ALTER TABLE users ALTER COLUMN deep_reveal_reset_at DROP DEFAULT`
- Human review: verify no existing rows have null after this; the column had a NOT NULL constraint with a default before — all rows will have a value, so dropping NOT NULL is safe.

### Phase B — IndexedDBStore (no server dependency)

**B1**: Refactor `openDB()` to use `e.oldVersion` gating pattern (preserves version 1 stores).

**B2**: Add three new object stores in `onupgradeneeded` under `oldVersion < 2`.

**B3**: Implement `saveLessonProgress(lessonId, status)` and `getLessonProgress()`.

**B4**: Implement `saveSparringRecord(result)` and `getSparringRecord()`.

**B5**: Implement `saveChallengeSession(session)` and `getLastChallengeSession()`.

**B6**: Implement `recordActivityDay()` and `getStreak()`.

**B7**: Update `getProfile()` — remove `deep_reveal_count` / `deep_reveal_reset_at` from init shape; change tier from `'anonymous'` to `'free'`.

**B8**: Extend `migrateToSupabase()` — add lesson_progress, sparring_record, session_stats (all dates), streak to migration payload. Implement all-or-nothing clear step.

  **Bug fix (not a preserve)**: The existing `migrateToSupabase` clears `session_stats` from IndexedDB without first inserting those rows into Supabase — this is a data-loss bug. B8 MUST fix it by iterating all `session_stats` rows and inserting each as `{ user_id, date, stats: sessionObject }` into Supabase **before** clearing the local store. The existing `puzzle_attempts` insert is preserved.

### Phase C — SupabaseStore

**C1**: Implement `saveLessonProgress(lessonId, status)` — upsert on `(user_id, lesson_id)` in `lesson_progress`.

**C2**: Implement `getLessonProgress()` — SELECT `lesson_id, completed_at` from `lesson_progress` WHERE `user_id = this._userId`. Map each row: `completed_at != null → { lessonId: row.lesson_id, status: 'complete' }`, `completed_at == null → { lessonId: row.lesson_id, status: 'incomplete' }`. No `status` column exists in the DB; status is always derived at read time.

**C3**: Implement `saveSparringRecord(result)` — read-modify-write on `users.sparring_record`.

**C4**: Implement `getSparringRecord()` — SELECT `sparring_record` from `users`.

**C5**: Implement `saveChallengeSession(session)` — upsert on `(user_id, date)` in `session_stats`, storing the session object inside the `stats` jsonb column: `{ user_id, date, stats: sessionObject }`.

**C6**: Implement `getLastChallengeSession()` — SELECT from `session_stats` ORDER BY date DESC LIMIT 1; return `row?.stats ?? null`. Both `IndexedDBStore` and `SupabaseStore` MUST return the bare session object (not the full row), so callers receive identical shapes from either store.

**C7**: Implement `recordActivityDay()` — streak logic + UPDATE `users.streak_count` and `users.last_active_date`.

**C8**: Implement `getStreak()` — SELECT `streak_count`, `last_active_date` from `users`.

**C9**: Implement `getAllSessionStats()` — SELECT all `session_stats` rows + aggregate `byPattern` using a count-weighted mean: `sum(accuracy_i * weight_i) / sum(weight_i)` where weight is the number of attempts in that session for that category. Do NOT reconstruct `correct = accuracy × (optimalCount + blunderCount)`.

**C10**: Fix `saveSessionStats()` — remove `if (profile.tier !== 'paid') return` guard.

### Phase D — AuthModal Reskin

**D1**: Update `AuthModal.jsx` — drop `isOpen` prop, switch to conditional mount internally; replace inline styles with CSS-class-based design (`modal-card`, `sheet-backdrop`) per mockup; implement two stages (email / sent) with new visual layout.

**D2**: Replace "Check your inbox" text with i18n key `auth.checkInbox`; add "Back" ghost button that resets to email stage.

**D3**: Update all three callers:
- `HomeScreen.jsx` — `<AuthModal isOpen={authOpen} ...>` → `{authOpen && <AuthModal ...>}`
- `DeepRevealButton.jsx` — same conversion
- `AuthGate` (inside `AuthModal.jsx`) — same conversion for its internal `AuthModal` usage

**D4**: Add new i18n keys to `en.json`: `auth.subtitle`, `auth.checkInbox`, `auth.magicLinkSent`, `auth.continueWithEmail`. Do NOT add `auth.maybeLater` — the existing `auth.dismiss: "Maybe later"` key already covers this; reuse it everywhere "Maybe later" appears in `AuthModal`.

**D5**: Update the existing `auth.deepRevealGate` key in `en.json` to reflect the new quota: `"Create a free account to unlock 20 Deep Reveals per week."` (was: `"Create a free account to unlock 3 Deep Reveals per day."`)

### Phase E — Server Quota Fix

**E1**: Add 401 guard to `/api/explain-move-llm` handler: `if (!req.user) return res.status(401).json({ error: 'Unauthorized' })`.

**E2**: Wire quota check in `/api/explain-move-llm` handler: call `checkAndDecrementQuota(req.user)` after the 401 guard; return 429 with `{ error: 'quota_exceeded', resetsAt }` if `!quota.allowed`.

**E3**: Update `checkAndDecrementQuota()`:
- Replace cap 3 → 20
- Replace daily-midnight reset → `nextMondayUtcMidnight()` helper
- Handle `deep_reveal_reset_at === null` as "already expired"
- Return `resetsAt` ISO string in the response shape
- `nextMondayUtcMidnight()` MUST always return the strictly next future Monday 00:00:00 UTC. If `now` is exactly Monday 00:00:00 UTC, return the Monday 7 days later (not `now` itself).

**E4**: Remove quota call from `/api/explain-move` (old endpoint) — delete the `checkAndDecrementQuota(req.user)` call at line ~416.

### Phase F — Documentation Updates

**F1**: Update `docs/architecture/frontend-conventions.md` — Store Interface table: add 8 new methods; note `getProfile()` no longer returns `deep_reveal_count`/`deep_reveal_reset_at` from IndexedDB.

**F2**: Update `docs/architecture/db-schema.md` — add new `users` columns (020); add `lesson_progress` table (021); update `deep_reveal_reset_at` to nullable (022).

**F3**: Update `docs/architecture/server-conventions.md` — update quota documentation: cap 20/week Monday reset; note 401 on unauthenticated requests to `/api/explain-move-llm`.

**F4**: Amend constitution tier table — change "3 Deep Reveals per day" to "20 Deep Reveals per week, resets Monday 00:00 UTC." (PATCH version bump: `1.3.1 → 1.3.2`).

---

## Dependency Order

```
Phase A (migrations) → Phase C (SupabaseStore, needs DB columns/tables)
Phase B (IndexedDBStore) — independent, can start immediately
Phase D (AuthModal) — independent, can start immediately
Phase E (server) — independent, can start immediately
Phase F (docs) — after all implementation phases complete
```

Recommended execution order: A → B → C → D → E → F (serial within phases; A/B/D/E can start in parallel).

---

## Test Verification Plan

| Scenario | How to test |
|---|---|
| AuthModal email stage renders correctly | Open app unauthenticated, tap profile icon; verify modal layout matches mockup |
| AuthModal "Maybe later" closes modal | Tap "Maybe later"; verify modal closes, user stays on home |
| AuthModal email submit → sent stage | Submit email; verify sent stage shows check-icon and "Check your inbox" |
| AuthModal sent stage "Back" → email stage | Tap "Back"; verify email stage shown with cleared email field |
| IndexedDB streak: fresh user | Call `recordActivityDay()`, call `getStreak()`, verify `{streak_count:1, last_active_date:today}` |
| IndexedDB streak: same-day idempotence | Call `recordActivityDay()` twice, verify count stays at 1 |
| IndexedDB streak: consecutive days | Set `last_active_date` to yesterday, call `recordActivityDay()`, verify count increments |
| IndexedDB streak: broken streak | Set `last_active_date` to 3 days ago, call `recordActivityDay()`, verify count resets to 1 |
| IndexedDB sparring record | Call `saveSparringRecord('win')` twice, `saveSparringRecord('loss')`, verify `{W:2,L:1,D:0}` |
| IndexedDB lesson progress | Call `saveLessonProgress('l1','complete')`, call `getLessonProgress()`, verify array contains entry |
| `saveSessionStats` tier guard removed | Call `saveSessionStats()` as free-tier user; verify row appears in `session_stats` |
| `/api/explain-move-llm` 401 | Send request without auth header; verify 401 response |
| `/api/explain-move-llm` quota 429 | Send 21 authenticated requests; verify 21st returns 429 with `resetsAt` |
| Migration: IndexedDB → Supabase | Seed IndexedDB with all data types; trigger sign-in; verify all data in Supabase and IndexedDB cleared |
| App reload preserves data | Complete actions, reload, verify Stats screen shows non-zero values |

---

## Complexity Tracking

No Constitution violations requiring justification. All design decisions follow existing patterns.
