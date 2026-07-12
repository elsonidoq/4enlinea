# Implementation Plan: Onboarding Experience

**Branch**: `feature/polish` | **Date**: 2026-07-12 | **Spec**: `specs/048-onboarding-experience/spec.md`
**Input**: Feature specification from `specs/048-onboarding-experience/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

A first-time user is routed, with zero intermediate screens, directly into a short sparring game
against the AI on the existing Easy difficulty tier. Playing at least one move of their own is
the engagement signal that defines onboarding success — **not** a detector of any specific coach
reaction (aha/coach-reaction detection was dropped by owner decision; see spec.md Assumptions and
research.md R5). Reaching it flips a **three-state** `onboarding_status` flag (`not_encountered |
seen | skipped`) stored as one more field on the user's existing anonymous profile record, carried
to the account record via the existing migration seam on sign-up, and re-launchable on demand from
Settings. At the sparring game's natural end (or, if the user exits early, on their next Home
visit as a one-time fallback), an optional "import your real games" offer leads into the existing
authenticated Papergames import flow (spec 038) — never before it, never gating play.

The technical approach reuses six existing seams rather than building anything parallel:
`IndexedDBStore`/`SupabaseStore` (profile persistence, extended with one new `updateProfile`
method each), `PUT /api/user/profile` (extended to accept the new field, instead of a new
endpoint), `POST /api/user/migrate` (extended with a sixth payload key), `userHelpers.js`'s
`USER_PROFILE_SELECT_COLUMNS`/`defaultUserProfile()` (the actual `req.user` population seam —
extending only the DB column/endpoint without this would leave `req.user.onboarding_status`
undefined; see research.md R10), `GameScreen.jsx`'s existing human-move path and end-of-game
branch (the `seen` write and the review-vs-import-offer routing decision — `useGameBoard.js`
itself is unchanged, stays a pure store-agnostic hook), and the existing `game` screen key (reused
with an `onboarding` param, no new `sparring` screen key). The one genuinely new architectural
piece is the first-run redirect sequencing against session/OAuth-hash restoration in
`App.jsx`/`ProfileStore.jsx` (FR-014), resolved by adding a `sessionChecked` readiness flag plus a
render-gated "booting" frame that eliminates the cold-boot Home flash — see research.md R3.

## Technical Context

**Language/Version**: JavaScript (ES modules), React 18 (frontend), Node.js/Express (server) —
existing stack, no changes.
**Primary Dependencies**: Existing `connect-four/src` React app (Vite), existing
`connect-four/server` Express app, Supabase (Postgres + PostgREST), IndexedDB (browser). No new
dependency is introduced.
**Storage**: IndexedDB (`decodec4` DB, `profile` object store — extended with one field, no
version bump) for anonymous users; Supabase `public.users` table (extended with one new column,
migration `057_users_onboarding_status.sql`) for signed-in users. No new table.
**Testing**: `npm run test:fast` (`connect-four/`) — Node `--test` unit tests for store methods
and server routes; component/integration tests for `Navigator`'s new effect (incl. the boot-gate
render) and `GameScreen.jsx`'s `seen`-write/end-of-game-branch logic, per `testing-conventions.md`.
Extend the existing `userHelpers.test.mjs:317-340` pinning tests (do not add a parallel describe
block) to assert `onboarding_status` alongside `stripe_customer_id`. Manual verification per
`quickstart.md` at 390×844 and desktop viewports (Constitution III — UI features require manual
verification of the golden path + at least one edge case).
**Target Platform**: Existing web app (mobile + desktop browsers), no new platform.
**Project Type**: Web application (existing `connect-four/src` frontend + `connect-four/server`
backend) — Option 2 shape, already in place; this feature adds files within it, does not
restructure it.
**Performance Goals**: No new latency budget beyond the existing Constitution V ceilings — the
onboarding game reuses `/api/evaluate-move`'s existing <2s Explanation Engine budget unchanged;
the new `onboarding_status` writes are fire-and-forget (never block the coach reaction the user
is watching, per Constitution V and research.md R5).
**Constraints**: No sign-in wall, no routing question, no splash/tutorial/carousel before the
practice game is playable (FR-002); no new/tuned AI difficulty (FR-003); no new storage layer or parallel
reconciliation service (FR-011/FR-012); first-run redirect must not race OAuth-hash/session
restoration (FR-014); 390×844 mobile viewport must remain fully usable (FR-017); all copy through
the existing i18n key system (FR-016).
**Scale/Scope**: 4 user stories (P1×2, P2×1, P3×1); one new DB column (3-value enum, aha states
dropped); two extended existing endpoints (`PUT /api/user/profile`, `POST /api/user/migrate`);
one extended server helper module (`userHelpers.js` — `USER_PROFILE_SELECT_COLUMNS` +
`defaultUserProfile()`); one extended client function (`track()`); two new methods
(`updateProfile` on both store backends); one new screen (`onboardingImportOffer`); no new
presentational component (the aha reward-acknowledgment overlay is dropped along with aha
detection — see research.md R5); modifications to `App.jsx` (boot-gate render + third effect),
`ProfileStore.jsx` (`sessionChecked`), `GameScreen.jsx` (seen-write, end-of-game branch, skip
control, Home-fallback check), `SettingsScreen.jsx`, `screenRegistry.jsx`,
`userHelpers.test.mjs` (extended pinning test). `useGameBoard.js` (at `src/lib/`, not `src/hooks/`)
is explicitly **unchanged**.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Explanation Engine as Single Source of Truth** — PASS. Onboarding does not add a second
  coach/explanation mechanism; it drives the existing `/api/evaluate-move` → `useGameBoard.js`
  seam exactly as Sparring already does (research.md R5). No new move-evaluation or pattern-label
  logic is introduced.
- **II. Code Quality & Simplicity** — PASS. `updateProfile(patch)` is a small, symmetric addition
  to both store backends (no speculative abstraction beyond what FR-011 requires); `PUT
  /api/user/profile` is extended in place rather than duplicated into a new endpoint (contracts/
  onboarding-api.md); no new storage-backend-specific branching is introduced at any call site
  (`store.updateProfile(...)` is backend-agnostic, per the existing `useStore()` pattern).
- **III. Testing Standards** — PASS, with an explicit plan: this feature is not solver-dependent
  (no new pattern classification/puzzle predicate), so the "real solver, no mock" rule does not
  apply; it IS a UI feature, so manual verification of the golden path (first-run → sparring game
  → game-end → import offer → Home) and at least the early-exit-fallback (User Story 3 Scenario 5)
  and FR-014 (OAuth-race, incl. the boot-gate flash fix) edge cases is required before reporting
  complete — see `quickstart.md`. Test data (no board fixtures needed here) is N/A.
- **IV. UX Consistency & Progressive Disclosure** — PASS. The import offer is dismissible,
  ungated, and never in front of the board's own evaluative information (this feature doesn't
  touch heatmaps/Deep Reveal at all). No new terminology for an existing concept is introduced
  (the coach phrase pool is reused unchanged). No new reward-acknowledgment component is
  introduced (dropped with aha detection, per research.md R5) — nothing here needs to be checked
  against progressive-disclosure norms.
- **V. Performance Requirements** — PASS. `onboarding_status` writes (`updateProfile`) are
  fire-and-forget, matching the existing rule for `tracks` writes; they must never block the
  coach-reaction render the user is watching (research.md R5).
- **VI. Implementation & Debugging Methodology** — PASS. The FR-014 race (the highest-risk item)
  was resolved by first reproducing the actual code paths (`App.jsx`/`ProfileStore.jsx` read
  in full, via a dedicated verification pass — see research.md R3) before designing the fix, not
  by theorizing about React effect ordering in the abstract. The `req.user` population seam
  (`userHelpers.js`) and the actual `useGameBoard.js` file location/end-of-game branch
  (`GameScreen.jsx:76`, `useGameBoard.js:371`) were likewise confirmed by reading the real code
  before this plan was drafted, not assumed from the epic's framing — see research.md R10/R5.
- **VII. Software Design Philosophy** — PASS. One obvious way to write the flag
  (`updateProfile`, both backends, identical call shape); explicit `sessionChecked` state instead
  of an implicit "session is still null" ambiguity; the null/`'not_encountered'` treatment is
  made explicit at every read site rather than assumed.
- **VIII. Documentation as First-Class Deliverable**:
  - [x] Existing architecture docs (`docs/architecture/frontend-conventions.md`,
    `server-conventions.md`, `data-model.md`, `db-schema.md`, `api-conventions.md`) and the prior
    `045-account-session-checkout`/`038-papergames-self-service-import` plans were read before
    drafting this plan, alongside a dedicated code-seam verification pass (App.jsx, ProfileStore,
    IndexedDBStore, SupabaseStore, userRoutes.js, userHelpers.js, useGameBoard.js, GameScreen.jsx,
    screenRegistry.jsx, aiDifficulty.js, track.js) to confirm every seam named in the epic against
    the actual code, not against memory summaries.
  - [x] One previously-undocumented convention was surfaced during this review and is captured in
    research.md R1/R6 rather than left implicit: `PUT /api/user/profile` is the established
    pattern for "one more field, one more owner-scoped column update" — this plan reuses it
    instead of introducing a parallel endpoint, and tasks.md will require documenting the
    extended shape in `docs/architecture/api-conventions.md` once implemented.
  - [ ] tasks.md (next command) will include explicit documentation tasks for: the new
    `onboarding_status` column (`data-model.md`/`db-schema.md`), the extended `PUT
    /api/user/profile` and `POST /api/user/migrate` shapes (`api-conventions.md`), the extended
    `USER_PROFILE_SELECT_COLUMNS`/`defaultUserProfile()` in `userHelpers.js`
    (`server-conventions.md` or `data-model.md`, wherever that file's existing convention is
    documented), and the new `sessionChecked` + boot-gate convention on `ProfileStore`/`Navigator`
    (`frontend-conventions.md`).

No violations requiring justification — Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/048-onboarding-experience/
├── plan.md                          # This file
├── research.md                      # Phase 0 output
├── data-model.md                    # Phase 1 output
├── quickstart.md                    # Phase 1 output
├── contracts/
│   ├── onboarding-api.md            # Phase 1 output — endpoint deltas
│   └── onboarding-store-interface.md# Phase 1 output — updateProfile() contract
└── tasks.md                         # Phase 2 output (/speckit-tasks — not created by this command)
```

### Source Code (repository root)

Existing web application shape (frontend + backend in one repo, not a monorepo split into
`frontend/`/`backend/` top-level dirs — the actual layout is `connect-four/src` +
`connect-four/server`). This feature's changes land entirely within that existing layout:

```text
connect-four/
├── src/
│   ├── App.jsx                       # MODIFY — sessionChecked-gated boot render + third
│   │                                  #          first-run effect (research.md R3)
│   ├── store/
│   │   ├── ProfileStore.jsx          # MODIFY — add sessionChecked state
│   │   ├── IndexedDBStore.js         # MODIFY — add updateProfile(patch)
│   │   └── SupabaseStore.js          # MODIFY — add updateProfile(patch)
│   ├── lib/
│   │   ├── screenRegistry.jsx        # MODIFY — register onboardingImportOffer
│   │   ├── track.js                  # MODIFY — populate uid for all events (R7)
│   │   ├── aiDifficulty.js           # UNCHANGED — reused as-is (FR-003)
│   │   └── useGameBoard.js           # UNCHANGED — stays a pure, store-agnostic hook; no
│   │                                 #             onAhaReached callback, no useStore import
│   │                                 #             (research.md R5). NOTE: lives here, at
│   │                                 #             src/lib/, NOT src/hooks/ — an earlier draft
│   │                                 #             of this plan had the wrong path.
│   ├── screens/
│   │   ├── GameScreen.jsx            # MODIFY — thread `onboarding` param, wrap the human-move
│   │   │                             #          handler to write onboarding_status:'seen' on
│   │   │                             #          first move, skip control, end-of-game branch
│   │   │                             #          (route to onboardingImportOffer instead of
│   │   │                             #          the unconditional goReplace('review', ...) at
│   │   │                             #          GameScreen.jsx:76 — this also covers the
│   │   │                             #          resign path via useGameBoard.js:371's existing
│   │   │                             #          onGameEnd call), Home-fallback check on mount
│   │   ├── DifficultyPickerScreen.jsx# UNCHANGED — onboarding bypasses this screen
│   │   ├── SettingsScreen.jsx        # MODIFY — "Replay intro" control
│   │   └── OnboardingImportOfferScreen.jsx  # NEW — import-offer screen (game-end path AND
│   │                                 #        Home-fallback path both route here)
│   └── i18n/                         # MODIFY — new keys for all onboarding copy (FR-016)
│
├── server/
│   ├── userRoutes.js                 # MODIFY — extend GET/PUT /api/user/profile,
│   │                                 #          POST /api/user/migrate
│   ├── userHelpers.js                # MODIFY — add onboarding_status to
│   │                                 #          USER_PROFILE_SELECT_COLUMNS (L13-14) AND
│   │                                 #          defaultUserProfile() (L22-31) — the actual
│   │                                 #          req.user population seam (research.md R10);
│   │                                 #          without this, req.user.onboarding_status is
│   │                                 #          undefined regardless of the DB column existing
│   ├── userHelpers.test.mjs          # MODIFY — extend the existing pinning test
│   │                                 #          (lines 317-340) to also assert
│   │                                 #          onboarding_status, alongside stripe_customer_id
│   └── migrations/
│       └── 057_users_onboarding_status.sql  # NEW — 3-value enum (not_encountered/seen/skipped)
│
docs/architecture/
├── data-model.md                     # MODIFY — document onboarding_status column (3 values)
├── db-schema.md                      # MODIFY — document migration 057
├── api-conventions.md                # MODIFY — document extended profile/migrate shapes,
│                                      #          and userHelpers.js's select-columns/default-
│                                      #          profile pairing (research.md R10)
└── frontend-conventions.md           # MODIFY — document sessionChecked + boot-gate render +
                                       #          updateProfile()
```

**Structure Decision**: No new top-level directory or project. This is additive work inside the
existing single web-application layout (`connect-four/src` + `connect-four/server`), consistent
with every other epic in `polish_epic.md`. The only new file besides the SQL migration is one
screen (`OnboardingImportOfferScreen.jsx`) — no new presentational component is needed since the
aha reward-acknowledgment overlay was dropped along with aha detection (research.md R5).
Everything else is an in-place extension of a seam that already exists, per the epic's "reuse,
don't rebuild" settled decisions.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations. Table intentionally left empty.
