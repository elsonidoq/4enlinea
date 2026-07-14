# Tasks: Puzzle Scoring-by-Pattern & Spanish Localization

**Input**: Design documents from `/specs/049-puzzle-scoring-spanish-localization/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-evaluate-move.md, quickstart.md

**Tests**: Included — FR-012/FR-020/FR-021 and Constitution III explicitly require automated
regression coverage through the production `evaluatePredicate`/`/api/evaluate-move` path, sourced
from real boards (never hand-constructed, per CLAUDE.md/I12).

**Organization**: Two independent halves bundled into one speckit cycle (see spec.md Origin
note). US9.1/US9.2 (puzzle scoring, OI-1) and US9.3/US9.4 (Spanish localization, OI-15) share no
code, no data, no design decision — each is independently testable and deliverable. Do not let
one half block the other, but **within** the scoring half, the binding ordering below is
mandatory (it is not a style preference — violating it makes `test:fast` red mid-cycle).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 = spec.md User Story 1 (epic US9.1+US9.2 server half), US2 = spec.md User
  Story 2 (epic US9.2 client half), US3 = spec.md User Story 3 (epic US9.3, Spanish content), US4
  = spec.md User Story 4 (epic US9.4, parity guard)

## Path Conventions

Existing monorepo: `connect-four/server/` (Express API), `connect-four/src/` (React SPA),
`connect-four/tests/` (node:test). All paths below are relative to `connect-four/` unless
otherwise noted.

---

## Phase 1: Setup

No new project structure, no new dependencies (plan.md §Technical Context). Nothing to do here —
proceed directly to Foundational.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared `SINGLE_ANSWER_CATEGORIES` registry both scoring stories depend on. Must
land before any US1/US2 task that reads it. Does not block US3/US4 (independent half).

- [x] T001 [P] Add `SINGLE_ANSWER_CATEGORIES = new Set(['z_threat', 'overcut', 'claimeven',
      'undercut', 'figure_7', 'j_shape'])` to `server/categories.js`, alongside
      `VALID_CATEGORIES`/`PAID_CATEGORIES`. Add a comment noting it is mirrored (not
      cross-imported) in `src/lib/categories.js`, must stay disjoint from
      `server/index.js`'s `MULTI_SOLUTION_CATEGORIES`, and MUST NOT be derived as "not
      multi-solution" (FR-008; `forced_win`/`forbidden_columns`/`odd_even_threat` belong to
      neither set).
- [x] T002 [P] Add the identical literal `SINGLE_ANSWER_CATEGORIES` Set to
      `src/lib/categories.js`, with the same disjointness/no-derivation comment, mirroring the
      server copy per research.md R3 (duplicate-and-sync, not cross-import).

**Checkpoint**: `SINGLE_ANSWER_CATEGORIES` exists identically on both sides. US1 and US2 can now
begin. (US3/US4 do not depend on this checkpoint.)

---

## Phase 3: User Story 1 — Learner gets an accurate correct/wrong verdict on single-answer
puzzles (Priority: P1) — server half (epic US9.1) 🎯 MVP-critical

**Goal**: `/api/evaluate-move` computes an additive `accepted` field for the six single-answer
categories by running `evaluatePredicate` against client-sent taught-pattern metadata, not by
`quality === 'optimal'` solver-score comparison. Converges `/api/evaluate-move` and
`/api/evaluate-move/inline` onto one `evaluatePredicate` code path and fixes the inline handler's
`.includes`-on-a-`Set` bug.

**Independent Test**: `POST /api/evaluate-move` with a z_threat board + `correctCol`/
`highlightMetadata` for the taught column returns `accepted: true`; the same board + a
non-taught, score-tying column returns `accepted: false` — verifiable via curl/integration test
without any frontend or Spanish-localization work.

**⚠️ Ordering inside this phase is binding (research.md R9 / plan.md Task Sequencing Notes)**:
T003 → T004 → T005 → T006 → T007 (widen gate) → T007a (extract the real handler for test-mounting,
plan.md D1) MUST land, and its tests T008/T009 MUST be written and adjusted **against the
extracted handler**, **before** T024 (US4's test-list registration) runs — registering
`singleAnswerCategoriesAccepted.test.js` or the corrected `evaluateMoveMultiSolution.test.js`
into `test`/`test:fast` before the gate widens would make the suite red for an unrelated reason
mid-cycle. T008/T009 MUST NOT mount a hand-copied reimplementation of the handler (the prior
`buildEvaluateMoveApp` pattern) — see T007a.

### Tests for User Story 1

> T008 cannot be meaningfully drafted against the pre-fix handler at all — it mounts the extracted
> handler from T007a, which does not exist until T007a lands. Write T008 only after T007a, per the
> binding ordering above; there is no useful "stale pre-fix" version of this file to write first.

- [x] T003 [P] [US1] Confirm (do not yet change) the exact metadata field each of the six
      `eval*` functions reads in `server/predicates.js:289-341` against research.md's table
      (`evalZThreat`→`highlightMetadata.column`; `evalClaimeven`/`evalFigure7`/`evalJShape`→
      `correctCol`; `evalUndercut`→`highlightMetadata.cells` role `killing_threat`;
      `evalOvercut`→`highlightMetadata.cells` role `major_threat`). This is a verification task,
      not a code change — record any drift from research.md as a blocking finding before
      proceeding.

### Implementation for User Story 1

- [x] T004 [US1] In `server/index.js`'s `POST /api/evaluate-move` handler, extend the request
      body destructuring (~line 1687) to also read `correctCol` and `highlightMetadata` from
      `req.body` (camelCase wire fields per contracts/api-evaluate-move.md — no validation beyond
      existing `movestring`/`col` checks; absent values flow through, not a 400).
- [x] T005 [US1] In the same handler, build one shared `predicatePuzzle` object (category,
      moveString, correctCol, highlightMetadata — matching the shape the `/inline` handler
      already builds at ~line 1800) and extract it into a small shared helper
      `buildPredicatePuzzle(category, movestring, { correctCol, highlightMetadata, puzzle })` in
      `server/index.js` or `server/predicates.js`, used by **both** `/api/evaluate-move` and
      `/api/evaluate-move/inline`, per FR-006's single-code-path mandate and
      contracts/api-evaluate-move.md's "Handler convergence" section. **Plan.md Decision D2**: the
      helper MUST preserve/pass through `goalPredicateType`/`goalPredicateParams` (defaulted from
      the puzzle object when present, matching the `/inline` handler's current
      `puzzle.goalPredicateType || category` / `puzzle.goalPredicateParams ?? null` logic at
      ~line 1800) — `/inline`'s non-single-answer categories (`forced_win`, `forbidden_columns`)
      depend on these fields and must keep working once T007 routes `/inline` through this same
      helper. Do not add a second predicate-object construction path.
- [x] T006 [US1] Widen the `accepted` gate at `server/index.js:1746-1753` (Decision B,
      research.md R1a): change `if (MULTI_SOLUTION_CATEGORIES.has(category))` to
      `if (MULTI_SOLUTION_CATEGORIES.has(category) || SINGLE_ANSWER_CATEGORIES.has(category))`,
      importing `SINGLE_ANSWER_CATEGORIES` from `./categories.js` (T001). Keep the existing
      `accepted = predicateResult.result === 'correct' || predicateResult.result === 'tied'`
      expression unchanged (single-answer categories never return `'tied'` — verified in
      research.md R1a; do not add a category-conditional branch). Pass the shared
      `predicatePuzzle` object from T005 (built from the now-available `correctCol`/
      `highlightMetadata`) into `evaluatePredicate` instead of the current
      `{ category, moveString: movestring }`.
- [x] T007 [US1] Fix `server/index.js:1779`'s inline-handler category-validation bug: change
      `!VALID_CATEGORIES.includes(category)` to `!VALID_CATEGORIES.has(category)` (FR-006). As
      part of this same convergence pass, replace the inline handler's separate
      `predicatePuzzle` construction (~line 1800) with a call to the shared helper from T005, so
      both handlers build the predicate object identically for the six single-answer categories.
- [x] T007a [US1] **Plan.md Decision D1** — extract the real `/api/evaluate-move` handler into an
      importable, side-effect-free module so integration tests mount the actual production
      handler instead of a hand-copied reimplementation (closes critique B1/B2: the prior
      `buildEvaluateMoveApp` copy in `evaluateMoveMultiSolution.test.js` had a hardcoded
      `MULTI_SOLUTION_CATEGORIES`-only gate and never threaded `correctCol`/`highlightMetadata`,
      so it could not exercise T004-T007's actual code). Concretely:
      1. Create `server/evaluateMoveHandler.js` exporting a factory
         `createEvaluateMoveHandler({ solver, i18nTranslations })` that returns the
         `async (req, res) => { ... }` function currently inlined at `server/index.js:1692`
         (post-T004/T005/T006 edits) — the handler body itself moves here verbatim; only
         `solver` and `i18nTranslations` (the two values that differ between the live server and
         a test) become factory parameters. Pure imports the handler already uses (`classify`,
         `classifyAiMove`, `scoreMove`, `evaluatePredicate`, `buildPredicatePuzzle`,
         `MOVES_RE`, `isValidCol0`, `EMPTY_BOARD_SCORES`, `MULTI_SOLUTION_CATEGORIES`,
         `SINGLE_ANSWER_CATEGORIES`, `logError`) are imported directly inside the new module, not
         injected.
      2. **Do not** export this factory from `server/index.js` itself or otherwise make importing
         the handler trigger `server/index.js`'s module-level `app.listen()` — `server/index.js`
         has no exported `app` and boots the full production server (with a live solver process)
         at import time (see `evaluateMoveMultiSolution.test.js`'s existing header comment and
         memory `project_integration_test_slowness`). The new module must be importable in
         isolation.
      3. In `server/index.js`, replace the inline handler body with
         `app.post('/api/evaluate-move', createEvaluateMoveHandler({ solver, i18nTranslations }))`
         — the production route now delegates to the extracted function; no behavior change.
      4. This is what makes T008/T009 "the same handler" tests: they import
         `createEvaluateMoveHandler` from `server/evaluateMoveHandler.js`, mount it on a bare
         Express app with a stub `solver` (same stubbing pattern already used in
         `evaluateMoveMultiSolution.test.js`), and drive it over HTTP — the gate widening (T006),
         the `correctCol`/`highlightMetadata` destructuring (T004), and `buildPredicatePuzzle`
         (T005) are all exercised as the actual production code, not a copy.

### Tests for User Story 1 (write/update after T007a)

**Mandatory metadata rule for every test body in T008/T009 (closes critique B1/B3)**: every
request body MUST carry the camelCase taught-pattern metadata for its category —
`highlightMetadata: { column: <n> }` for `z_threat`; `highlightMetadata: { cells: [{ column, role:
'killing_threat' }, ...] }` for `undercut`; `highlightMetadata: { cells: [{ column, role:
'major_threat' }, ...] }` for `overcut`; `correctCol: <n>` for `claimeven`/`figure_7`/`j_shape` —
per `evalZThreat`/`evalUndercut`/`evalOvercut`/`evalClaimeven`/`evalFigure7`/`evalJShape`
(`server/predicates.js:289-341`, T003). Every **negative** (`accepted: false`) case MUST send the
REAL taught metadata for that board (not absent/omitted metadata) alongside a genuinely
non-taught `col` — proving non-membership, not the FR-007 fail-closed default (absent metadata →
`wrong` regardless of column). Every category MUST have at least one **positive**
(`accepted: true`) assertion with correct metadata — only positives prove the wiring
(plan.md Task Sequencing Notes #1).

- [x] T008 [P] [US1] Create `tests/integration/singleAnswerCategoriesAccepted.test.js` (new
      file, `node:test`), mounting the **real extracted handler from T007a**
      (`createEvaluateMoveHandler`, not a reimplementation) and driving `POST /api/evaluate-move`
      end-to-end (not `evaluatePredicate` directly — per contracts/api-evaluate-move.md's
      mandatory-positive-case note and R2's caveat that `/inline` is not an oracle for this). For
      **each** of the six `SINGLE_ANSWER_CATEGORIES`, assert both an `accepted: true` case
      (taught/correct column, with matching metadata per the rule above) and an `accepted: false`
      case (real taught metadata + a genuinely non-pattern column), using only real boards — never
      hand-constructed (I12):
      - `z_threat`: the two OI-1 repro boards. For `3333302444422222060315555054`: **first source
        the real taught z-threat column** — do not hand-construct or guess it — by either (a)
        querying the stored puzzle row for this `move_string`/`category='z_threat'` via Supabase
        (memory `reference_supabase_connection.md`), or (b) running `detectZThreat` from
        `server/classifier.js` against this board's pre-move state through the live solver
        (pattern in `tests/integration/z_threat.test.js`), and record the retrieved
        `highlightMetadata` (column/fromRow/toRow/badgeCount) and its derivation method in a code
        comment above the test. Send that real `highlightMetadata` with col 0 → `accepted: false`
        (col 0 is confirmed non-taught per `docs/open_issues.md` OI-1: "playing col 0 reads
        correct despite not being the z-threat answer"). For `3333334512266550121166`: send
        `highlightMetadata: { column: 0, ... }` (OI-1: "`correct_col` 0 has a below-max solver
        score" — 0 is the taught column here) with col 0 → `accepted: true`.
      - `claimeven`: source a taught-correct + non-pattern board pair, with their real
        `correctCol`, from `tests/integration/claimeven.test.js`.
      - `figure_7`: `F7_PRE = '041015021326'`, correctCol 2 (from
        `tests/integration/figure7_jshape.test.js:27`) — send `correctCol: 2`; taught column 2 →
        `accepted: true`; same `correctCol: 2` metadata + a non-pattern column on the same board →
        `accepted: false`.
      - `j_shape`: `J_PRE = '04101502'`, correctCol 1 (from
        `tests/integration/figure7_jshape.test.js:39`) — send `correctCol: 1`; same true/false
        pairing as `figure_7`.
      - `undercut`/`overcut`: source the real `highlightMetadata.cells` fixtures from
        `tests/integration/undercut_overcut.test.js` (`evalUndercut`/`evalOvercut` blocks,
        ~lines 135-210) and send them verbatim — for `undercut`, the non-killing column →
        `accepted: true`, the killing column (same metadata, different `col`) → `accepted: false`
        (avoid-the-pattern semantics unchanged, FR-002/FR-004 Acceptance Scenario 4); for
        `overcut`, the major-threat column → `accepted: true`, a non-major column (same metadata)
        → `accepted: false`.
      This file is the mandatory **positive**-assertion coverage called out in plan.md's Task
      Sequencing Notes #1 and research.md R1a — a suite that only asserts `false`/`null`, or that
      proves `false` via absent metadata, would not catch a broken client→server remap (that
      remap is US2's job, but this test exercises the server side of the contract in isolation via
      direct request bodies carrying real metadata).
- [x] T009 [US1] In `tests/integration/evaluateMoveMultiSolution.test.js`, delete the hand-copied
      `buildEvaluateMoveApp` mini-handler (lines 64-85) and mount the **real extracted handler
      from T007a** (`createEvaluateMoveHandler`) instead, for all tests in this file (the existing
      `double_threat` fork-board tests included) — this closes critique B1's "not the real
      handler" gap for the whole file, not just the z_threat case. Then replace the test at line
      132 (`'a single-answer category (z_threat) response has accepted:null...'`) — it MUST now
      assert real `true`/`false` values instead of `null`, since z_threat moves from the "always
      null" set to the "real accepted value" set (research.md R9). Split it into two tests using
      the two OI-1 repro boards, each sending the camelCase `highlightMetadata` per the mandatory
      metadata rule above (reuse the same real-taught-column value T008 sourced for board 1 — do
      not re-derive independently):
      - `3333302444422222060315555054`, col 0, `highlightMetadata` = the real taught column
        (T008-sourced, ≠ 0) → `data.accepted === false`.
      - `3333334512266550121166`, col 0, `highlightMetadata: { column: 0 }` → `data.accepted ===
        true`.
      This is US9.2.6 in the epic numbering; it depends on T006/T007a landing first (ordering
      constraint). **Do not register this file's placement change yet** — that is T024 (US4),
      sequenced after this task.

**Checkpoint**: `POST /api/evaluate-move` now returns correct `accepted` values for all nine
categories (3 multi-solution + 6 single-answer), verified through the actual extracted production
handler (not a reimplementation — closes B2); `/inline` no longer 500s and shares the same
predicate-construction path. T008/T009 are written but **not yet** added to the `test`/`test:fast`
run lists (that is T024, after US2 also lands, per the epic's ordering note — US2 is independent
of registration timing but US1's own server-side change is now complete and verifiable by running
the new test file directly: `node --test tests/integration/singleAnswerCategoriesAccepted.test.js`
and `node --test tests/integration/evaluateMoveMultiSolution.test.js`).

---

## Phase 4: User Story 2 — Correct verdict drives every downstream signal on the Challenge
screen (Priority: P1) — client half (epic US9.2) 🎯 MVP

**Goal**: `ChallengeScreen.jsx` sends the six categories' taught-pattern metadata (remapped from
snake_case) to `/api/evaluate-move` and reads `data.accepted` for them, so every downstream
signal (SFX, coach mood, attempt-recording, win overlay, "Suboptimal" label) agrees with the
corrected verdict.

**Independent Test**: Drive the Challenge screen through both OI-1 repro boards; confirm SFX,
coach reaction, badge/label, and attempt-recording all agree with the corrected verdict on each.
Requires US1 (T001-T007a) to be live server-side, but is otherwise independent of US3/US4.

### Implementation for User Story 2

- [x] T010 [US2] In `src/screens/ChallengeScreen.jsx`, extend the `POST /api/evaluate-move`
      request body (~line 225-229) to include the **mandatory snake_case→camelCase remap**
      (research.md R1a, plan.md Task Sequencing Notes #1): add `correctCol:
      current.correct_col, highlightMetadata: current.highlight_metadata` as top-level request
      fields. This is a top-level rename only — do NOT touch or reshape the inner
      `highlight_metadata` JSON value (`.column`, `.cells[].role` pass through unmodified in
      both directions, per data-model.md). Per contracts/api-evaluate-move.md: `z_threat`/
      `undercut`/`overcut` puzzles populate `current.highlight_metadata` (read `.column` for
      z_threat; `.cells` for undercut/overcut); `claimeven`/`figure_7`/`j_shape` puzzles populate
      `current.correct_col`. Send both fields unconditionally (harmless no-op for other
      categories, per contract).
- [x] T011 [US2] Import `SINGLE_ANSWER_CATEGORIES` from `../lib/categories.js` (T002) into
      `src/screens/ChallengeScreen.jsx`, alongside the existing local
      `MULTI_SOLUTION_CATEGORIES` (~line 23).
- [x] T012 [US2] In the `.then(data => ...)` block (~line 230-242), widen the `isCorrect`
      computation: replace
      `isMultiSolutionCategory ? data.accepted === true : data.quality === 'optimal'`
      with a check that also routes `SINGLE_ANSWER_CATEGORIES` through `data.accepted === true`
      — e.g. introduce `usesAcceptedGate = isMultiSolutionCategory ||
      SINGLE_ANSWER_CATEGORIES.has(effectiveCategory)` and use
      `usesAcceptedGate ? data.accepted === true : data.quality === 'optimal'`. Every category
      outside both sets keeps the unchanged `data.quality === 'optimal'` path (FR-011).
- [x] T013 [US2] Extend the `displayData` override (~line 246-250, R6/FR-010): change the
      `isMultiSolutionCategory && isCorrect && data.quality !== 'optimal'` condition to use
      `usesAcceptedGate` in place of `isMultiSolutionCategory`, so a single-answer category's
      pattern-correct-but-slower move also displays `quality: 'optimal', badge: 'good'` instead
      of "Suboptimal" — without touching `coachPhraseKey`/`coachMood`/`summaryLineKey`/
      `patternTag` (FR-003/FR-010, OI-1 repro board 2).
- [x] T014 [US2] Trace `isCorrect`'s remaining downstream consumers in
      `src/screens/ChallengeScreen.jsx` past line 250 (SFX `playSfx(...)`, coach mood/reaction,
      `first_attempt_correct` attempt-recording, the win/completion overlay trigger, and the
      `track(...)` analytics calls) and confirm each already reads the same `isCorrect`/
      `displayData` values updated in T012/T013 — no separate `data.quality`/`data.accepted`
      read exists elsewhere in the handler that would disagree (FR-009/US9.2.4). Fix any
      divergent read found.
- [x] T015 [US2] Confirm (read-only, no edit) that `src/screens/SocraticScreen.jsx`'s
      correctness check (`col === correctCol`) is untouched by this feature — it has no puzzle
      `category` or stored pattern metadata to evaluate against (spec.md Acceptance Scenario 3 /
      Out of Scope). Record this confirmation in the task's completion notes; do not edit the
      file.

### Tests for User Story 2

- [x] T016 [P] [US2] Add a `node:test` case (in `tests/integration/evaluateMoveMultiSolution.test.js`
      or a small new `tests/unit/challengeScreenRemap.test.js`, whichever fits the existing
      static-source-assertion pattern used at line 51-57 of that file) that greps
      `src/screens/ChallengeScreen.jsx`'s source text for the remap fields
      (`current.correct_col`, `current.highlight_metadata`) in the request-body construction, so
      a future edit that silently drops the remap is caught by source-text assertion (mirrors
      the file's existing `data.accepted === true` source-check pattern at line 57).
- [ ] T017 [US2] Manually verify (quickstart.md §Puzzle scoring step 3): load the app locally,
      drive the two OI-1 repro boards through a real Challenge session (via `/admin/curate` or
      dev tooling to force the board), confirm verdict/SFX/coach mood agree with the corrected
      verdict on both; spot-check `undercut` end-to-end (correct move → correct; killing column
      → wrong).

**Checkpoint**: User Stories 1 and 2 together deliver the full OI-1 fix end-to-end — server
computes the right `accepted`, client sends the right metadata and reads it correctly, every
downstream signal agrees. This is the MVP scope (spec.md's two P1 stories).

---

## Phase 5: User Story 3 — Spanish-speaking learner sees the whole app in Spanish (Priority: P2)
(epic US9.3)

**Goal**: `src/i18n/es.json` reaches full nested key-parity with `src/i18n/en.json` across all 22
currently-missing top-level sections, preserving placeholders, disc-color terminology
(verde/gris), and coach tone.

**Independent Test**: Switch app language to Spanish; walk Home, Challenge/Puzzle, Coach,
Settings, Onboarding — no leftover English text, no raw `t()` keys. Fully independent of
US1/US2/US4 (US4 depends on this story being complete, not the reverse).

### Implementation for User Story 3

- [x] T018 [US3] Enumerate `en.json`'s 25 top-level sections vs `es.json`'s current 3
      (`setcard`, `onboarding`, `settings`) via `Object.keys` diff (confirms research.md R8's
      count is still accurate against current code before translating) — list the 22 sections
      to translate: `nav, puzzle, sparring, auth, upgrade, common, games, home, coach, stats,
      error, setpicker, challenge, eval, deepReveal, summary, challengeSet, mistakes, socratic,
      lesson, review, saga` (plus any remaining nested gaps inside the already-partial
      `settings`/`onboarding`/`setcard` sections revealed by the diff).
- [x] T019 [US3] Translate each of the 22 missing top-level sections into `src/i18n/es.json`,
      preserving `en.json`'s exact nested key structure per section (no added/renamed/reordered
      keys). Do this section-by-section (parallelizable by section if desired, but all land in
      the same file — treat as one task to avoid merge conflicts within `es.json`).
- [x] T020 [US3] Preserve every i18next interpolation placeholder (`{{var}}`) and any
      plural/ICU form from `en.json` in its exact structural position within each translated
      Spanish string (FR-014) — pass over every translated key from T019 checking placeholder
      presence/position.
- [x] T021 [US3] Apply disc-color terminology across every translated string: **verde** (green,
      P1) / **gris** (gray, P2) — never rojo/amarillo (FR-015, CLAUDE.md player-color table) —
      pass over every translated key from T019 checking for stray rojo/amarillo.
- [x] T022 [US3] Review coach-voice sections (`coach`, `eval`, `summary`, any losing-position
      copy) specifically for supportive, non-defeatist tone matching the English original
      (FR-016, `feedback_pedagogy_preferences` — no lost-position defeatism).
- [ ] T023 [US3] Manually verify (quickstart.md §Spanish localization step 2): switch app
      language to Spanish in Settings, walk Home, a Challenge/Puzzle, the Coach, Settings, and
      Onboarding screens — confirm no leftover English text in translated sections and no raw
      `t()` keys render.

**Checkpoint**: `es.json` has full content parity with `en.json` (not yet guarded by an automated
test — that's US4). App is genuinely Spanish end-to-end when the switcher is set to `es`.

---

## Phase 6: User Story 4 — Future translation drift is caught automatically (Priority: P3)
(epic US9.4)

**Goal**: An automated `node:test` parity check fails whenever `en.json`/`es.json` key sets
diverge, registered in both `test` and `test:fast`; the pre-existing multi-solution test
(currently `test:fast`-only) is corrected to both lists in the same pass.

**⚠️ Depends on US3 (T018-T022) being complete** — the parity test only goes green once
`es.json` has full key-parity; landing the test's registration earlier breaks the suite
(spec.md US9.4 dependency, epic US9.4.4). **Also depends on US1's T006-T009 (including T007a) being complete** —
registering `singleAnswerCategoriesAccepted.test.js` (T008) before the `accepted` gate widens
(T006) would make `test:fast` red for an unrelated reason (research.md R9 / plan.md Task
Sequencing Notes #2).

### Tests for User Story 4

- [x] T024 [US4] Create `tests/unit/i18nKeyParity.test.js` (new `node:test` file): implement a
      pure `getNestedKeyPaths(obj) -> Set<string>` helper (dotted paths, no arrays expected in
      this JSON per data-model.md), apply it to both `src/i18n/en.json` and `src/i18n/es.json`,
      assert the two sets are equal, and on failure report the symmetric difference
      (`missingFromEs`, `missingFromEn`) in the assertion message. Assert **key presence only**
      — a proper noun with identical text in both files must still pass (FR-019).
      Add a short comment at the top of the file documenting the lockstep rule (epic US9.4.5).

### Registration (US4 — depends on US1 §Phase 3 and US3 §Phase 5 both being complete)

- [x] T025 [US4] In `connect-four/package.json`, add ALL of the following to **both** the
      `test` and `test:fast` script file lists (per the project's "add to both lists" rule,
      testing-conventions.md / FR-020/FR-021):
      1. `tests/unit/i18nKeyParity.test.js` (new, T024) — both lists currently lack it.
      2. `tests/integration/singleAnswerCategoriesAccepted.test.js` (new, T008) — both lists
         currently lack it.
      3. `tests/integration/evaluateMoveMultiSolution.test.js` (existing, updated by T009) —
         currently present in `test:fast` only; add it to `test` (epic US9.4.2 / FR-021).
      This is the single registration pass called out in plan.md Task Sequencing Notes #2 —
      do not split it across multiple tasks or land any piece of it before T006/T009/T018-T022
      are done.
- [x] T026 [US4] Run `npm run test:fast` and `npm test` (both, per Constitution III) and confirm
      all newly-registered files pass, including the flipped z_threat assertions in
      `evaluateMoveMultiSolution.test.js` (T009) and the full `singleAnswerCategoriesAccepted.test.js`
      suite (T008). Fix any failure before proceeding — do not register a file red.
- [x] T027 [US4] Regression-check the guard itself (quickstart.md §Spanish localization step 3,
      SC-004): temporarily delete one key from `es.json`, run
      `node --test tests/unit/i18nKeyParity.test.js`, confirm it fails with a clear
      missing-key message; restore the key, confirm it passes again. Do not commit the
      temporary deletion.

**Checkpoint**: Both halves of the epic are now fully verified — `npm run test:fast` and
`npm test` both green, including the six-category production-path coverage, the corrected
multi-solution z_threat assertions, and the i18n parity guard.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation lockstep required by Constitution VIII (plan.md's Constitution Check
already identifies these three docs as mandatory, not optional).

- [x] T028 [P] Update `docs/architecture/api-conventions.md`'s "Move Evaluation Endpoint"
      section: widen the documented `accepted` gating from "three multi-solution categories" to
      "nine categories total (three multi-solution + six single-answer, via
      `SINGLE_ANSWER_CATEGORIES`)"; document the new `correctCol`/`highlightMetadata` request
      fields per contracts/api-evaluate-move.md's request-body delta (camelCase wire names,
      client-side snake_case→camelCase remap responsibility, fail-closed-not-400 behavior for
      absent metadata).
- [x] T029 [P] Update `docs/architecture/server-conventions.md`'s "Multi-solution acceptance"
      section: add a sibling note introducing `SINGLE_ANSWER_CATEGORIES` (mirrored
      server/client, disjoint from `MULTI_SOLUTION_CATEGORIES`, not derived as a complement) and
      the `/api/evaluate-move` ↔ `/api/evaluate-move/inline` handler-convergence decision (one
      shared predicate-object-building helper, per T005/T007).
- [x] T030 [P] Update `docs/architecture/testing-conventions.md`: document the new `es`/`en`
      key-parity lockstep test pattern (`tests/unit/i18nKeyParity.test.js`, key-presence-only
      comparison) and add `tests/integration/singleAnswerCategoriesAccepted.test.js` +
      `tests/unit/i18nKeyParity.test.js` to the "npm test includes" / "test:fast additionally
      includes" file lists documented in that file, matching the actual `package.json` change
      from T025.
- [x] T031 Run `npm run test:fast` one final time after all documentation tasks (docs changes
      don't affect test outcomes, but this confirms nothing regressed during the polish phase).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: None — no-op for this feature.
- **Foundational (Phase 2, T001-T002)**: No dependencies. BLOCKS US1 (Phase 3) and US2 (Phase 4)
  only — does not block US3 (Phase 5) or US4 (Phase 6) directly, though US4 also transitively
  needs US1 complete (see below).
- **US1 (Phase 3, T003-T009 + T007a)**: Depends on Foundational (T001). Internal ordering is
  binding: T003 → T004 → T005 → T006 → T007 → T007a → T008/T009 (T008/T009 depend on T006/T007
  landing so the gate is actually widened, AND on T007a landing so they can mount the real
  handler, before their assertions can pass).
- **US2 (Phase 4, T010-T017)**: Depends on Foundational (T002) AND US1's server changes
  (T004-T007a) — the client can't consume `data.accepted` for the six categories until the server
  computes it correctly.
- **US3 (Phase 5, T018-T023)**: No dependency on Foundational, US1, or US2 — fully independent
  translation-content work. Can run in parallel with US1/US2.
- **US4 (Phase 6, T024-T027)**: T024 (writing the parity test) has no dependency. T025
  (registration) is gated on BOTH US1 (T006-T009 and T007a complete, per research.md R9) AND US3
  (T018-T022 complete, per spec.md's US3-before-US4 dependency) — do not run T025 until both are
  done, even though T024 itself can be written earlier.
- **Polish (Phase 7, T028-T031)**: Depends on all four user stories being complete (documents the
  final shape of the change).

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational only. No dependency on US2/US3/US4.
- **US2 (P1)**: Depends on Foundational + US1. No dependency on US3/US4.
- **US3 (P2)**: Depends on nothing in this feature. Fully parallel to US1/US2/T024.
- **US4 (P3)**: T024 depends on nothing; T025-T027 depend on US1 AND US3 both being complete.

### Parallel Opportunities

- T001/T002 (Foundational) — different files, run together.
- T018-T022 (US3 translation work) can proceed in parallel with all of US1/US2, since they touch
  disjoint files (`es.json` vs `server/`, `src/screens/`, `src/lib/categories.js`).
- T024 (writing the parity test) can be written in parallel with US1/US2 — only its *registration*
  (T025) must wait.
- T028/T029/T030 (Polish documentation) — different files, run together, after everything else
  lands.

---

## Parallel Example: Foundational + US3 kickoff

```bash
# These four can start immediately and run concurrently — no shared files:
Task: "Add SINGLE_ANSWER_CATEGORIES to server/categories.js"                # T001
Task: "Add SINGLE_ANSWER_CATEGORIES to src/lib/categories.js"                # T002
Task: "Enumerate en.json vs es.json section diff"                            # T018
Task: "Write tests/unit/i18nKeyParity.test.js"                               # T024 (registration deferred)
```

---

## Implementation Strategy

### MVP First (US1 + US2 only)

1. Complete Phase 2: Foundational (T001-T002).
2. Complete Phase 3: US1 server changes (T003-T009, including T007a).
3. Complete Phase 4: US2 client changes (T010-T017).
4. **STOP and VALIDATE**: run `node --test tests/integration/singleAnswerCategoriesAccepted.test.js
   tests/integration/evaluateMoveMultiSolution.test.js` directly (not yet registered in
   `test`/`test:fast`) and do the manual quickstart walkthrough (T017). This is the OI-1 fix,
   fully shipped and testable, even before US3/US4 land.
5. Deploy/demo if ready — OI-1's two learner-facing defects are closed.

### Incremental Delivery

1. Foundational → US1 → US2 → validate (MVP: OI-1 fixed end-to-end).
2. US3 (translation content) → validate manually (OI-15 content complete, no guard yet).
3. US4 (T024 write + T025 register, gated on US1+US3 both done) → validate via full
   `npm run test:fast` / `npm test` → both halves shipped with regression coverage.
4. Polish (T028-T031) → documentation lockstep, final verification.

### Parallel Team Strategy

- Developer A: Foundational (T001-T002) → US1 (T003-T009, including T007a) → US2 (T010-T017).
- Developer B: US3 (T018-T023) in parallel, independent of Developer A's work.
- Either developer (or both together): US4's T024 can be written any time; T025 registration
  waits for both A and B to finish their respective phases.

---

## Notes

- [P] tasks touch different files with no unmet dependencies.
- Never hand-construct movestrings for any test in this feature (CLAUDE.md/I12) — every board
  cited above is sourced from an existing DB/KB/integration-test fixture or the two OI-1 repro
  boards.
- `/api/evaluate-move/inline` (T007) has no `src/` caller — its convergence fix is correct to do
  (removes a divergent code path, fixes a live 500) but is NOT validation of the client→server
  remap; T008/T017 (via `/api/evaluate-move`, which `ChallengeScreen.jsx` does call) are the real
  oracle.
- Do not skip T008's positive (`accepted: true`) assertions — a suite with only negative/null
  cases would pass even if T010's remap is silently broken (FR-007 fail-closed makes a missed
  remap indistinguishable from a genuine wrong answer).
- T008/T009 MUST mount the real extracted handler from T007a (`server/evaluateMoveHandler.js`'s
  `createEvaluateMoveHandler`), never a hand-copied reimplementation — a copy with its own gate
  logic can drift from production silently (critique B1/B2) and does not satisfy FR-012/SC-001's
  "verified through the same correctness check used in production."
- Every negative (`accepted: false`) assertion in T008/T009 MUST send the real taught metadata for
  its board alongside a non-taught column — a negative case built from absent/omitted metadata
  proves nothing about pattern-membership logic, only that the fail-closed default fires
  (critique B1/B3).
- Excluded from this task list (epic "NOT included" / spec.md Out of Scope): the three existing
  multi-solution categories' correctness handling, `SocraticScreen.jsx`'s bypass (confirmed
  non-applicable, T015), server-side verification of client-sent metadata, recomputing a taught
  pattern via fresh detection, any language-switcher mechanism work, backfilling stored puzzle
  rows, and removing/de-registering English.
