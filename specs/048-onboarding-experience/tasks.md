---
description: "Task list for Epic 8 — Onboarding Experience"
---

# Tasks: Onboarding Experience

**Input**: Design documents from `specs/048-onboarding-experience/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Included — Constitution Principle III requires `node --test` coverage for new server/store
logic, and quickstart.md explicitly enumerates the automated tests this feature must add. Run via
`npm run test:fast` (inside `connect-four/`), per CLAUDE.md — never `npm test` for routine checks.

**Reconciliation note**: spec.md/plan.md/research.md/data-model.md have already reconciled this feature
to a **three-state** model (`not_encountered | seen | skipped`) with aha/coach-reaction detection and
the reward-toast **dropped**. `polish_epic.md`'s Epic 8 section still uses "aha"/"onboarded flag"/
"success or reward moment" language from before that reconciliation — the tasks below follow the
reconciled spec/plan artifacts, not the epic's original wording. Do NOT add: a pre-aha gate, a
difficulty picker, a carousel/walkthrough, auth-flow implementation, or any aha-detection/reward-toast
mechanism.

**Organization**: Tasks are grouped by user story in spec.md's priority order (US1, US2 = P1; US3 = P2;
US4 = P3). Foundational work (DB column, `userHelpers.js`, `updateProfile`, the `PUT /api/user/profile`
extension, `track()` uid population) is placed in Phase 2 because US1's account-carryover scenario, US2's
`seen`-write, US3's fallback read, and US4's `skipped`-write all depend on it — no single story owns it
alone.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1 / US2 / US3 / US4 — maps to spec.md's user stories
- File paths are relative to the repo root; `connect-four/` prefix implied for all `server/`/`src/` paths

---

## Phase 1: Setup

- [x] T001 Confirm baseline: run `npm run test:fast` (inside `connect-four/`) on a clean checkout of this
  branch and record that it passes before any Epic 8 change lands — establishes the regression floor
  this feature must not break.

---

## Phase 2: Foundational (blocks all user stories)

**⚠️ CRITICAL — no user-story task should write or read `onboarding_status` before this phase is done.**

- [x] T002 [P] DB migration `connect-four/server/migrations/057_users_onboarding_status.sql`: add
  `onboarding_status text NOT NULL DEFAULT 'not_encountered' CHECK (onboarding_status IN
  ('not_encountered','seen','skipped'))` to `public.users`. No new grants needed — `012_explicit_grants.sql`
  and `040_service_role_grants.sql` are table-level (research.md R2).
- [x] T003 [P] Test: schema test confirming the new column, its default, and the CHECK constraint's three
  allowed values, alongside this project's existing migration-test conventions.
- [x] T004 `connect-four/server/userHelpers.js`: add `onboarding_status` to `USER_PROFILE_SELECT_COLUMNS`
  (~line 13-14) AND to `defaultUserProfile()`'s returned object (~line 22-31, value `'not_encountered'`) —
  the actual `req.user` population seam; without this, `req.user.onboarding_status` is `undefined`
  regardless of the DB column existing (research.md R1 correction / R10). Also add and export a single
  shared `isValidOnboardingStatus(value)` validator (fixed 3-value enum check) from this file — this is
  the ONE place the enum is validated; both T009 (`PUT /api/user/profile`) and T021 (`POST
  /api/user/migrate`) import and reuse it rather than duplicating the check inline.
- [x] T005 Extend the **existing** pinning tests in `connect-four/server/userHelpers.test.mjs:317-340`
  (do NOT add a new `describe` block) to additionally assert `columns.includes('onboarding_status')` and
  `profile.onboarding_status === 'not_encountered'`, alongside the existing `stripe_customer_id`
  assertions (research.md R10). Depends on T004.
- [x] T006 [P] `connect-four/src/store/IndexedDBStore.js`: add `async updateProfile(patch)` near
  `getProfile()` (~line 42) — reads the existing single `profile` row (keyPath `device_uuid`), merges
  `patch`, `put()`s it back; no new object store, no DB version bump (contracts/onboarding-store-interface.md).
- [x] T007 [P] `connect-four/src/store/SupabaseStore.js`: add `async updateProfile(patch)` near
  `getProfile()` (~line 28) — `PUT`s `patch` (JSON body) to `/api/user/profile` with `credentials:
  'include'`; errors swallowed client-side, matching the existing fire-and-forget posture (Constitution
  V — must never block the coach-reaction render the user is watching).
- [x] T008 [P] [US1] Unit test: `IndexedDBStore.updateProfile` merges `patch` into the existing row without
  clobbering other profile fields (e.g. `tier`, `device_uuid`).
- [x] T009 `connect-four/server/userRoutes.js:106` (`PUT /api/user/profile`): extend to accept an
  **optional** `onboarding_status` independently of `papergames_id` — at least one of the two fields must
  be present; build a single `update` object and `.update(update)` once (contracts/onboarding-api.md exact
  diff). Validate the enum value via `userHelpers.js`'s shared `isValidOnboardingStatus()` (T004) — do not
  duplicate the check inline. Depends on T002/T004.
- [x] T010 [P] Test: `PUT /api/user/profile` extended-shape — `papergames_id`-only request is unaffected
  (existing 204/400/500 contract); `onboarding_status`-only request is accepted; an invalid enum value is
  rejected with 400; both fields together are accepted in one call; no fields at all is 400.
- [x] T011 [P] `connect-four/src/lib/track.js`: extend `track(event, data)` to always include the local
  profile's `device_uuid` as `uid` in the POST body, for all events project-wide (not onboarding-only) —
  a narrow, justified direct read of `IndexedDBStore` from a non-component module, confined to this file
  (research.md R7).
- [x] T012 [P] Test: `track()` populates `uid` from the local profile's `device_uuid` in its POST body.
- [x] T013 Update `docs/architecture/data-model.md`: document the new `onboarding_status` field (3-state
  enum, both storage locations — anonymous profile + `users` row) per data-model.md's Entity section.
- [x] T014 Update `docs/architecture/db-schema.md`: document migration `057_users_onboarding_status.sql`
  (column, default, CHECK constraint, no new grants needed).
- [x] T015 Update `docs/architecture/api-conventions.md`: document the extended `GET`/`PUT
  /api/user/profile` response/request shapes (the new `onboarding_status` field) and the
  `USER_PROFILE_SELECT_COLUMNS`/`defaultUserProfile()` pairing convention in `userHelpers.js`
  (research.md R10).

**Checkpoint**: `onboarding_status` exists end-to-end (DB column → `req.user` → `PUT /api/user/profile`
→ both store backends' `updateProfile`) and is documented. User-story implementation can now begin.

---

## Phase 3: User Story 1 - First-run detection & routing (Priority: P1) 🎯 MVP

**Goal**: A brand-new visitor is routed directly into a sparring game with zero intermediate screens,
exactly once, without racing session/OAuth-hash restoration; the fact carries to an account on sign-up.

**Independent Test**: Open the app with a clean/empty local profile and confirm (a) direct landing in a
sparring game with no intermediate screen, (b) reload does not repeat onboarding, (c) a first-time user
mid-way through a magic-link sign-in is not shown onboarding and the sign-in completes correctly.

- [x] T016 [US1] `connect-four/src/store/ProfileStore.jsx`: add a `sessionChecked` boolean state, set to
  `true` in a `finally` block wrapping the entire body of `checkSession()` (both the OAuth-hash and the
  cookie-restore branches), exposed via the store context alongside `session` (research.md R3).
- [x] T017 [US1] `connect-four/src/App.jsx` `Navigator`: render-gate on `!sessionChecked` — return a
  neutral, near-instant "booting" frame (blank background matching the app shell) before the existing
  `return (...)`, so no real screen (including `home`) ever flashes before the first-run decision or
  `consumeReturnTo()` resolve (research.md R3 "cold-boot Home flash" correction).
- [x] T018 [US1] `connect-four/src/App.jsx` `Navigator`: add a third effect gated on
  `sessionChecked && !session` — read `store.getProfile()`; if `onboarding_status` is `'not_encountered'`
  or `null`/`undefined`, call `go('game', { difficulty: 'easy', side: 'first', onboarding: true })` and
  fire `track('onboarding_started', ...)`. Depends on T016/T017. **Decision (B3/D1, owner-settled,
  anonymous-only)**: the `!session` gate is intentional, not a gap — a signed-in user whose account has
  never been onboarded is deliberately excluded from this auto-route; they can only reach onboarding via
  Settings "Replay intro" (T043/FR-010). Do not extend this effect to cover signed-in users; see spec.md
  Assumptions for the recorded decision.
- [x] T019 [P] [US1] Component/integration test: with `sessionChecked=true, session=null,
  profile.onboarding_status='not_encountered'`, the effect calls `go('game', {difficulty:'easy',
  side:'first', onboarding:true})` exactly once; with `sessionChecked=true, session={...}` it does NOT
  fire; while `sessionChecked=false`, `Navigator` renders only the boot-gate frame (no `ScreenComponent`).
- [x] T020 [US1] `connect-four/src/store/IndexedDBStore.js` `migrateToSupabase` (~line 206): read the
  local profile's `onboarding_status` (fresh `getProfile()` call) and add it as one more key in the POST
  body to `/api/user/migrate`, alongside the existing five keys. The `profile` object store continues to
  not be cleared by this method (research.md R2).
- [x] T021 [US1] `connect-four/server/userRoutes.js:445` (`POST /api/user/migrate`): destructure
  `onboarding_status` from the body alongside the existing five keys; if present and valid per
  `userHelpers.js`'s shared `isValidOnboardingStatus()` (T004) — do not duplicate the enum check inline —
  apply it with a **conditional** update —
  `UPDATE users SET onboarding_status = $1 WHERE id = $2 AND onboarding_status = 'not_encountered'`
  (never clobber an already-recorded `seen`/`skipped` state from a different device's migration). Absent
  or invalid values are a silent no-op and MUST NOT fail the rest of the migration request. Depends on
  T002 (the `onboarding_status` column must exist) + T004 (the shared validator) — NOT on T009 (`PUT
  /api/user/profile` is an unrelated endpoint on a different route).
- [x] T022 [P] [US1] Test: `POST /api/user/migrate` — (a) a fresh account (`not_encountered`) migrating a
  local `seen`/`skipped` value accepts it; (b) an account already `seen`/`skipped` migrating a
  `not_encountered` (or any) value is NOT clobbered; (c) an absent or invalid `onboarding_status` is a
  silent no-op that does not fail the migration of the other five data categories.
- [x] T023 Update `docs/architecture/api-conventions.md`: document the extended `POST /api/user/migrate`
  request shape (`onboarding_status` optional key, conditional-write semantics, silent-no-op-on-invalid
  posture).
- [x] T024 Update `docs/architecture/frontend-conventions.md`: document the new `sessionChecked` +
  boot-gate render convention on `ProfileStore`/`Navigator` (research.md R3) and the
  `store.updateProfile(patch)` interface (contracts/onboarding-store-interface.md).
- [x] T025 [US1] Manual acceptance per `quickstart.md` "Manual verification — first-run (anonymous)" steps
  1-2 and 6, and "Manual verification — OAuth-hash race" (all 4 steps) and "Manual verification — account
  carryover" (all 4 steps).

**Checkpoint**: A first-time anonymous user is routed into onboarding exactly once, the redirect never
races session/OAuth-hash restoration, and the flag carries to an account on sign-up.

---

## Phase 4: User Story 2 - Sparring-first demonstrated value (Priority: P1)

**Goal**: The onboarding game is immediately playable with no splash/tutorial/carousel, the existing
live coach-feedback mechanism reacts to the user's own moves, and the experience is usable on mobile.

**Independent Test**: Play several moves of the onboarding game on both a 390×844 mobile viewport and a
desktop viewport; confirm the coach reacts to each move with no accompanying tutorial/carousel copy.

- [x] T026 [US1→US2 seam] `connect-four/src/screens/GameScreen.jsx`: thread a new `onboarding` boolean
  prop from `params.onboarding` (routed to via T018/R4 — no new screen key, reuses the existing `game`
  screen; `DifficultyPickerScreen.jsx` stays untouched/bypassed).
- [x] T027 [US2] `connect-four/src/screens/GameScreen.jsx`: wrap the human-move column-click handler
  passed to `useGameBoard`'s `handleColumnClick` with a thin onboarding-only wrapper (only when
  `onboarding === true`) that, on its *first* invocation only, sets a local `movePlayed` ref to `true`
  and calls `store.updateProfile({ onboarding_status: 'seen' })` fire-and-forget, before delegating to
  the hook's real handler. `useGameBoard.js` itself is **unchanged** — stays a pure, store-agnostic hook
  (research.md R5).
- [x] T028 [P] [US2] Test: the first human move played in an `onboarding=true` session triggers exactly
  one `updateProfile({onboarding_status:'seen'})` call; subsequent moves in the same session do not
  re-trigger it; a non-onboarding session never calls it.
- [x] T029 [US2] Verify (no code change expected) that the existing `/api/evaluate-move` →
  `useGameBoard.js` coach-reaction seam surfaces unmodified when `onboarding === true` — no new
  move-evaluation or coach-reaction mechanism is introduced; no reward/success overlay is shown (aha
  detection and its reward acknowledgment were dropped, research.md R5 / spec.md FR-006).
- [x] T030 [US2] i18n audit: confirm every user-facing string introduced by T026-T029 (if any) is routed
  through the existing translation-key system — no hardcoded strings (FR-016).
- [x] T031 [US2] Manual acceptance per `quickstart.md`'s "Responsive check" (390×844 and ~1440×900) and
  the "first-run" section's steps 2-4 (no splash/tutorial/carousel; coach reacts to the specific move
  played; `onboarding_status` flips to `seen` in IndexedDB after one move).

**Checkpoint**: The onboarding game demonstrates the coach reacting to the user's own moves, at both
mobile and desktop viewports, with the `seen` engagement signal wired and verified.

---

## Phase 5: User Story 3 - Guided first workflow + import offer (Priority: P2)

**Goal**: Every onboarding game's natural end (win/loss/draw/resign/abandon) routes to an optional
"import your real games" offer instead of the normal review screen; a user who engaged (`seen`) but left
early sees the same offer once, on their next Home visit.

**Independent Test**: (a) Play an onboarding game to its natural end and confirm the import offer appears
and leads to the existing import entry point on accept. (b) Start an onboarding game, play one move, then
leave before game end, and confirm the offer instead surfaces once on the next Home visit.

- [x] T032 [US3] New file `connect-four/src/screens/OnboardingImportOfferScreen.jsx`: optional,
  always-dismissible "import your real games" offer shown to every user regardless of stated online-play
  status; accepting routes into the existing authenticated Papergames import entry point (spec 038,
  composing with the existing sign-in flow if not currently signed in — this feature does not alter that
  flow's own mechanics); declining/dismissing routes to `home`. **Owns idempotency**: on mount —
  regardless of which path reached it (game-end via T034 or Home-fallback via T036) — synchronously write
  the one-time `localStorage` marker `onboarding_offer_shown_v1` (see T038 for the paired analytics
  event). This is the SINGLE place the marker is written; T036 only ever reads it (see below).
- [x] T033 [US3] `connect-four/src/lib/screenRegistry.jsx`: register `onboardingImportOffer: () =>
  <OnboardingImportOfferScreen .../>` (or equivalent). Reached only via `go()`/`goReplace()` — NOT added
  to `urlMapping.js`/`SESSION_ONLY_SCREENS`, matching the existing `game`/`summary` session-only pattern
  (research.md R4).
- [x] T034 [US3] `connect-four/src/screens/GameScreen.jsx` `saveGame()`: replace the existing
  unconditional `goReplace('review', { id: gameId })` (currently ~line 76) with a branch — if `onboarding`
  is true, `goReplace('onboardingImportOffer', { id: gameId })`; else the existing `goReplace('review',
  ...)`. This single branch point covers every outcome that already funnels through `saveGame` (win/loss/
  draw via the normal flow, and resign via `handleResign()`'s existing `onGameEnd?.(...)` call into the
  same seam — no separate resign-path handling needed, research.md R5 correction).
- [x] T035 [P] [US3] Test: an onboarding session's game-end via each of win/loss/draw/resign calls
  `goReplace('onboardingImportOffer', ...)`, never `goReplace('review', ...)`; a non-onboarding session's
  game-end is unaffected (still `goReplace('review', ...)`).
- [x] T036 [US3] `connect-four/src/screens/HomeScreen.jsx` (or its mount effect): on mount, if
  `profile.onboarding_status === 'seen'` AND the `localStorage` one-time marker
  (`onboarding_offer_shown_v1`) is **not yet set**, route to `onboardingImportOffer` instead of rendering
  Home. This check is **read-only** — it must NOT itself write the marker; the marker write is owned
  entirely by `OnboardingImportOfferScreen` on mount (T032), so that the game-end path (T034) and the
  Home-fallback path share one single write site and neither can re-show the offer after the other has
  already shown it (data-model.md "Storage location 1" note; not part of the profile record, not synced
  to the server — FR-013 spirit).
- [x] T037 [P] [US3] Test: Home-fallback fires exactly once when `onboarding_status === 'seen'` and the
  marker is unset (routes to `onboardingImportOffer`); a second Home mount with the marker now set (set by
  the offer screen's own mount, per T032) does not re-trigger it; a `skipped` or `not_encountered` status
  never triggers it.
- [x] T038 [US3] Analytics: fire `onboarding_finished` when the import-offer screen mounts, at the same
  mount site as the T032 marker write (single call site covering either entry path — game-end or Home
  fallback); fire `onboarding_import_offer_accepted` / `onboarding_import_offer_declined` from
  `OnboardingImportOfferScreen` on the corresponding user action (contracts/onboarding-api.md event
  table). All events carry `uid` per T011.
- [x] T050 [P] [US3] Cross-path regression test (B2): simulate the game-end path — an onboarding game
  ending routes to `onboardingImportOffer` (T034) and, per T032, the offer screen's mount writes the
  `onboarding_offer_shown_v1` marker. Then mount `HomeScreen` with `profile.onboarding_status === 'seen'`
  and assert it does NOT re-route to `onboardingImportOffer` (because the marker set by the game-end path
  is already present) — i.e. the marker is a single cross-path guard, not scoped to the Home-fallback
  branch alone. This is distinct from T037, which only exercises the Home-fallback path in isolation.
- [x] T039 [US3] i18n keys for all `OnboardingImportOfferScreen` copy (FR-016).
- [x] T040 [US3] Manual acceptance per `quickstart.md`'s "first-run" step 5 (normal game-end path) and the
  full "early exit before game end" section (all 5 steps).
- [x] T051 [US3] Update `docs/architecture/frontend-conventions.md` (Constitution VIII lockstep-doc
  requirement): document the new `OnboardingImportOfferScreen` (session-only screen, reached only via
  `go()`/`goReplace()`, not in `urlMapping.js`/`SESSION_ONLY_SCREENS`, per T033) AND the
  `onboarding_offer_shown_v1` `localStorage` marker — its single write site (the offer screen's own mount,
  T032), its single read site (`HomeScreen`'s read-only fallback check, T036), and why it is a
  `localStorage` marker rather than a profile/`onboarding_status` field (not synced to the server, not
  part of the account record — FR-013 spirit, data-model.md "Storage location 1"). Depends on T032/T036.

**Checkpoint**: The import offer reliably appears exactly once per onboarding pass, via whichever of the
two paths applies, and never blocks or precedes play.

---

## Phase 6: User Story 4 - Skip & re-access (Priority: P3)

**Goal**: A user can skip onboarding at any point (sparring game or import offer) and land on Home
without penalty; onboarding is re-launchable on demand from Settings; interruption doesn't lose or
duplicate progress; all copy is translated.

**Independent Test**: Start onboarding, tap skip, confirm immediate landing on Home; navigate to Settings
and re-launch onboarding from there.

- [x] T041 [US4] `connect-four/src/screens/GameScreen.jsx` and
  `connect-four/src/screens/OnboardingImportOfferScreen.jsx`: render a skip control whenever
  `onboarding === true` (both screens); tapping it calls `store.updateProfile({ onboarding_status:
  'skipped' })` fire-and-forget, fires `track('onboarding_skipped', ...)`, and routes directly to `home`
  (bypassing the Home-fallback check in T036, since `skipped` is never `'seen'`).
- [x] T042 [P] [US4] Test: tapping skip (from either screen) sets `onboarding_status` to `'skipped'` and
  routes to `home` without triggering the Home-fallback import-offer check.
- [x] T043 [US4] `connect-four/src/screens/SettingsScreen.jsx`: add a "Replay intro" control, visible for
  any onboarding state, that calls `go('game', { difficulty: 'easy', side: 'first', onboarding: true })`
  directly — bypassing the auto-detect gate (T018) entirely, since this is an explicit user action
  (research.md R6). Reachable from Home in ≤2 navigation actions (SC-004).
- [x] T044 [US4] i18n keys for the skip control and the Settings "Replay intro" control (FR-016).
- [x] T045 [P] [US4] Test: a game closed/abandoned mid-onboarding before any move is played leaves
  `onboarding_status` at `'not_encountered'` (no forced replay is triggered, but a subsequent app load
  still auto-routes into onboarding again, which is expected per spec.md Edge Cases — not a bug).
- [x] T046 [US4] Manual acceptance per `quickstart.md`'s "skip" section (all 4 steps) and "game ends with
  zero moves played" section (all 4 steps).

**Checkpoint**: All four user stories are independently functional and verified.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T047 Append an entry to `staging_checks.md` (repo root) under a new `## Epic 8 — Onboarding
  Experience` heading, per that file's "How to add checks" convention, for items not fully confirmable in
  local dev: (a) SC-005's 7-day unprompted-return correlation, which requires real production analytics
  history, not a local session; (b) a genuine end-to-end magic-link email round-trip through the real
  email provider (as opposed to a manually-constructed hash fragment used for the local FR-014 test).
- [x] T048 Full regression: run `npm run test:fast` (inside `connect-four/`) and confirm all new tests
  (T003, T005, T008, T010, T012, T019, T022, T028, T035, T037, T042, T045, T050) pass alongside the
  existing suite with zero regressions.
- [x] T049 Full manual walkthrough of every section in `quickstart.md` (first-run, early exit, zero-moves
  edge case, skip, OAuth-hash race, account carryover, responsive check) end-to-end on one pass, at both
  390×844 and a desktop viewport, confirming SC-001 through SC-005.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup. BLOCKS all user stories — no story task reads or writes
  `onboarding_status` before T002-T015 land.
- **US1 (Phase 3)**: Depends on Foundational. No dependency on US2/US3/US4.
- **US2 (Phase 4)**: Depends on Foundational; T026 depends on US1's T018 (the routing that sets
  `params.onboarding`) existing so `GameScreen` has something to thread — in practice, implement US1
  before US2, though US2's coach-reaction/responsive work has no *logic* dependency on US1 beyond that.
- **US3 (Phase 5)**: Depends on Foundational + US2's T027 (the `onboarding` prop/`seen`-write plumbing
  T034/T036 branch on) — implement after US2.
- **US4 (Phase 6)**: Depends on Foundational + US2 (GameScreen's onboarding prop) + US3
  (`OnboardingImportOfferScreen` exists as a place to put its own skip control, and the Home-fallback
  check T041 must bypass) — implement last among the four stories, consistent with spec.md's P3 ranking.
- **Polish (Phase 7)**: Depends on all four user stories being complete.

### Within Each Phase

- Tests marked with a task number immediately after the implementation task they cover should be written
  before that implementation is considered done (per Constitution III); this file lists them adjacent
  rather than strictly test-first, since several are integration-style tests that need the real seam
  (`ProfileStore`, `userRoutes.js`) in place to assert against.
- Docs tasks (T013-T015, T023-T024, T047, T051) are part of the definition of done for their phase, not
  optional follow-ups (Constitution VIII).

### Parallel Opportunities

- T002/T003 (migration + its schema test), T006/T007 (the two `updateProfile` implementations), T010-T012
  (independent test files) can run in parallel within Phase 2.
- Within each user-story phase, tasks marked `[P]` (mostly the test tasks, which live in separate test
  files from the implementation they cover) can run in parallel with each other once their corresponding
  implementation task is done.

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Complete Phase 1 (Setup) + Phase 2 (Foundational).
2. Complete Phase 3 (US1) — a first-time user is routed into a sparring game exactly once, races
   resolved, account carryover verified.
3. **STOP and VALIDATE** against US1's Independent Test before proceeding.

### Incremental Delivery

1. Foundational → US1 (routing) → US2 (the coach-reaction demonstration itself, the actual point of the
   epic) → US3 (import offer) → US4 (skip/re-access) → Polish.
2. Each story is independently testable per its own Independent Test in spec.md, but — unlike a typical
   speckit feature — the stories here have a real build-order dependency (US2 needs US1's routing to
   reach the game; US3 needs US2's `seen` signal; US4 needs US3's offer screen to attach a skip control
   to), so parallelizing story implementation across multiple developers is not recommended for this
   feature; sequential P1→P1→P2→P3 delivery is the intended path.
