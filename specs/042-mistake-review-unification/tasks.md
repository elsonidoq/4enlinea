# Tasks: Mistake Review Unification & Deep-Reveal Overhaul

**Input**: Design documents from `specs/042-mistake-review-unification/` (spec.md, plan.md, research.md,
data-model.md, contracts/, quickstart.md)
**Prerequisites**: Epic 1 / spec 041 landed (unified, correctly-counted, fully-reachable mistake data).
**Repo root for file paths below**: `connect-four/` (e.g. `server/index.js` = `connect-four/server/index.js`).
**Test command**: `npm run test:fast` (run from `connect-four/`) — NEVER plain `npm test` (it includes
`candidate-generator.test.js`, which hangs). New test files MUST be added by name to the `test:fast`
script entry in `connect-four/package.json` (and to `test` if broadly relevant) — the harness runs an
explicit file list, not a glob.

**Tests**: Included per plan.md's explicit Constitution III requirements (automated substring-absence
test for FR-019/SC-005, nav-trail test for FR-012, stepper board-signature test for FR-013/014) plus
manual quickstart.md walkthroughs for pure-UI acceptance criteria that have no solver dependency.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Maps to spec.md's user stories (US1–US6)

---

## Phase 1: Setup

- [x] T001 Confirm baseline is green before any change: run `npm run test:fast` from `connect-four/`
  and record pass/fail; if anything is already red, stop and resolve before starting (do not attribute
  pre-existing failures to this feature).
- [x] T002 [P] `rg -i explorer connect-four/src` and `rg -n "quality\s*===?\s*'blunder'|quality:\s*'blunder'|quality=blunder" connect-four/server connect-four/src` to produce a written baseline list (in a scratch note, not committed) of every remaining "explorer" reference and every place a `quality==='blunder'` filter exists — both US1 (T010) and US4 (T034) consume this list; doing the scan once up front avoids duplicated greps across stories.
- [x] T002A [P] **(Promoted per critique blocking issue #3 / Decision 1.)** Extend `GET /api/blunders/:id`'s
  `.select()` in `connect-four/server/index.js` (~line 2590) to include `papergames_game_id` — the
  one-line change originally scoped under US2 (old T012). Promoted to Foundational because US1's own
  test (T003) asserts `papergames_game_id`/`game_id` on the response, and without this change that
  field is `undefined` for a papergames fixture row until US2 lands, undermining US1's claimed
  independent-shippability; it also unblocks US6 (T049 uses fixture boards that may be
  papergames-sourced). Everything else IS still scoped to US2 (T013/T014, `totalMoves`/`siblingMistakes`).

**Checkpoint**: Baseline green, explorer/quality-filter inventory in hand, `papergames_game_id` present
on `GET /api/blunders/:id`'s response.

---

## Phase 2: Foundational — none required

No shared blocking infrastructure beyond T002A is needed: there are no new tables/migrations
(data-model.md), no new routes, and no shared new module used by more than one story except
`server/reasonRenderGuard.mjs`, which is scoped entirely to US5 and is created within that story's
phase. Each user story phase below is independently implementable once Phase 1 completes. (The
remaining `GET /api/blunders/:id` extension — `totalMoves`/`siblingMistakes` — is scoped under US2,
since that is the story whose acceptance criteria require it; US6's `patternCells` addition to the same
handler(s) is scoped under US6 and is additive/independent of US2's fields; `papergames_game_id` itself
was promoted to T002A above, per Decision 1.)

---

## Phase 3: User Story 1 — One screen for every mistake, regardless of severity (Priority: P1) 🎯 MVP

**Goal**: Suboptimal- and blunder-quality mistakes render the same `MistakeDetailScreen` layout with all
three actions, differing only by a severity label/color; no legacy explorer path remains reachable.

**Independent Test**: Open a suboptimal-quality mistake and a blunder-quality mistake from the same game
and confirm both render the same screen component with all three actions present, differing only by a
severity indicator.

### Tests for User Story 1

- [x] T003 [P] [US1] Add a test in `connect-four/tests/blunder/mistakeDetailUnification.test.js` (new
  file), using this repo's mock-supabase-stub convention (no real DB — see
  `tests/integration/challenge-progress.test.js`), asserting that a stubbed fixture blunder row
  (`quality: 'blunder'`) and a stubbed fixture suboptimal row (`quality: 'suboptimal'`) both produce the
  same set of renderable action affordances (start-new-game, deep-reveal, mark-as-reviewed-when-owner)
  from the shared data shape returned by `GET /api/blunders/:id` — a server/data-shape-level test (this
  repo has no component-render test harness for React; do not introduce one), i.e. assert the response
  contains all fields both severities need (`quality`, `is_owner`, `board_state`, `correct_move`,
  `game_id`/`papergames_game_id`) for both a `blunder` and a `suboptimal` fixture row, and that neither
  is missing a field the other has. `papergames_game_id` is present on both fixtures because T002A
  (Phase 1) already added it to the `.select()` — this test may freely use either an AI-sparring or a
  papergames-sourced fixture row for each severity.

### Implementation for User Story 1

- [x] T004 [US1] Using T002's grep output, remove every remaining "explorer" route/component/prop/i18n
  key in `connect-four/src` (expected: none found per research.md §1a, but this task is the explicit
  verification + removal step, not an assumption) — if any surface, delete them and confirm no import
  references remain (`rg -i explorer connect-four/src` returns nothing after).
  **FR-004.**
- [x] T005 [US1] In `connect-four/src/screens/MistakeDetailScreen.jsx`, confirm/adjust the severity
  indicator (label + color) so a `quality: 'suboptimal'` row and a `quality: 'blunder'` row render through
  the identical component structure, differing only in that indicator — no branch that hides or disables
  an action based on `quality`. **FR-001.**
- [x] T006 [US1] In `connect-four/src/screens/MistakeDetailScreen.jsx`, verify "Start new game from here"
  and "What should I have played?" (deep reveal) always render regardless of `quality`, and "Mark as
  reviewed" continues to gate on `blunder.is_owner !== false` (already correct at `:441` per
  research.md §1a — do NOT simplify to `blunder.is_owner`). **FR-002, FR-003.**
- [x] T007 [US1] In `connect-four/src/screens/ReviewScreen.jsx`, confirm `navigateToMistake` routes both
  `quality` values to `blunderDetail` with no residual explorer fallback branch (per research.md §1a this
  is already true — this task is a verification-and-guard, add a comment or assertion if useful, not a
  rewrite).
- [x] T008 [US1] Run `npm run test:fast`; add T003's new test file name to the `test:fast` (and `test`,
  if applicable) script entries in `connect-four/package.json`.
- [x] T009 [US1] Manual QA per `quickstart.md` US1 section: open a known suboptimal mistake and a known
  blunder mistake from the SC-002 fixture game (`40fe793a-aa39-429d-8ef4-4e43192cc4db`) and confirm
  identical layout/actions, differing only by severity indicator. **SC-001.**

**Checkpoint**: US1 fully functional and independently testable — suboptimal and blunder mistakes are
visually and functionally unified.

---

## Phase 4: User Story 2 — Reliable permalinks and reload survival (Priority: P1)

**Goal**: A cold-opened mistake permalink shows the correct "Move N / M" and "X of Y", "Start new game
from here" works regardless of game source, and reloading the mistakes-by-category screen stays on that
screen.

**Independent Test**: Copy a mistake's permalink URL, open it in a fresh tab with no prior in-app
navigation, and confirm correct header/pagination figures; reload the mistakes-by-category screen and
confirm it stays on the category list.

### Tests for User Story 2

- [x] T010 [P] [US2] Add an HTTP-level integration test in
  `connect-four/tests/integration/blunderPermalinkContext.test.js` (new file), using this repo's
  mock-supabase-stub convention (no real DB — see `tests/integration/challenge-progress.test.js`'s
  "Tests the HTTP handler logic with mock supabase stubs" header). Hardcode the SC-002 row values
  (research.md §3: game `40fe793a-aa39-429d-8ef4-4e43192cc4db`, blunder id
  `52a28158-8603-4ccf-89f4-b9a73b2910f3` at `move_index: 18`, siblings at move_index 16/18/28/32,
  `totalMoves: 41`) as inline stub fixtures wired through a mocked
  `supabase.from('blunders').select().eq().single()` (blunder row) + `.from('papergames_games')...`
  (parent-game `moves` lookup) + `.from('blunders').select().eq().order()` (siblings) chain — asserting
  `GET /api/blunders/:id` returns `papergames_game_id: '40fe793a-aa39-429d-8ef4-4e43192cc4db'`,
  `totalMoves: 41`, and a `siblingMistakes` array of length 4 ordered by `moveIndex` ascending
  (16, 18, 28, 32) that includes the requested id at position 2 (1-indexed) — matching quickstart.md's
  "Move 19 / 41" / "2 of 4" expectations. The **real** game/ids are used only in the manual quickstart
  walkthrough (T022), never in this automated test. **FR-008, FR-009, SC-002.**
- [x] T011 [P] [US2] Add a test in `connect-four/tests/urlMapping.test.js` (existing file — extend, do
  not replace) asserting `/mistakeDetail/:category` round-trips through `URL_MAP`'s `parseUrl`/`buildUrl`
  and that `'mistakeDetail'` is absent from `SESSION_ONLY_SCREENS`. **FR-011.**

### Implementation for User Story 2

- [x] T012 [US2] **(Superseded by T002A, Phase 1.)** Verify `papergames_game_id` is already present in
  `GET /api/blunders/:id`'s `.select()` in `connect-four/server/index.js` (~line 2590) — this was
  promoted to Phase 1/Foundational per critique blocking issue #3 / Decision 1 so US1 could ship
  independently. No further `.select()` change is needed in this story; this task is a confirmation
  checkpoint only, kept numbered here for phase bookkeeping and so T013/T014 have a stated
  precondition.
- [x] T013 [US2] Add the parent-game total-move-count lookup in `connect-four/server/index.js` (same
  handler): branch on `data.game_id` vs `data.papergames_game_id`, query `games`/`papergames_games`
  `.select('moves')` by id, compute `totalMoves = moves.length` (null if neither FK set), per
  `contracts/api-blunders-id.md` step 2. **FR-008.**
- [x] T014 [US2] Add the sibling-mistakes query in `connect-four/server/index.js` (same handler): query
  `blunders` filtered on whichever FK column is set, `.select('id, move_index, quality, resolved_at')`,
  `order('move_index', { ascending: true })`, map to `siblingMistakes: [{ id, moveIndex, quality,
  resolved_at }]` (no `user_id` filter — preserves the public-permalink contract), per
  `contracts/api-blunders-id.md` step 3. **FR-009.**
- [x] T015 [US2] Apply the equivalent `totalMoves`/`siblingMistakes` context to the list-variant endpoint
  at `connect-four/server/index.js` (~line 2560). **Confirmed (not conditional)**: this handler
  independently constructs its own blunder response shape (`threat_cells`/`game_id`/
  `papergames_game_id`) and does **not** delegate to the single-item `:id` handler — this was verified
  by direct read during the critique pass, so this task is not gated behind a "verify first, skip if
  delegating" check; apply the addition unconditionally. Note T002A (Phase 1) only touched the `:id`
  handler's own `.select()` — this list-variant handler has its own independent query, so confirm
  whether it already selects `papergames_game_id` and add it there too if missing (do not assume T002A
  covers this handler).
- [x] T016 [US2] In `connect-four/src/screens/MistakeDetailScreen.jsx` (cold-boot effect, ~lines 39-59),
  replace the single-item `coldNavList = [data]` construction with a full `siblingMistakes`-derived
  navList; use the new `totalMoves` field for the "Move N / M" header (replacing the `blunders.length`
  fallback) and `siblingMistakes.length`/position for "X of Y" (replacing the toolbar's "1 of 1" default).
  **FR-008, FR-009.**
- [x] T017 [US2] In `connect-four/src/screens/MistakeDetailScreen.jsx`, implement lazy per-sibling
  stepping: when Prev/Next/a sibling-chip is activated within the cold-boot navList, issue a fresh
  `GET /api/blunders/:id` for that sibling's `id` at the moment of navigation (siblingMistakes entries
  carry no `board_state` by design — research.md §10) — do NOT eagerly prefetch all siblings' board data
  on initial load.
- [x] T018 [US2] In `connect-four/src/screens/MistakeDetailScreen.jsx`, confirm "Start new game from
  here" now renders on cold boot for a papergames-owned mistake (using the newly-present
  `papergames_game_id`), closing the previously-undocumented gap from research.md §1c. **FR-010.**
- [x] T019 [US2] In `connect-four/src/lib/urlMapping.js`, replace the bare `/mistakeDetail` entry with
  `{ pattern: '/mistakeDetail/:category', screenKey: 'mistakeDetail', paramNames: ['category'] }` (URL_MAP
  "replace, not add" precedent) and update `CategoryListScreen.jsx:146`'s `go('mistakeDetail', { category:
  ... })` call site if the URL builder needs the new param name. **FR-011.**
- [x] T020 [US2] Remove `'mistakeDetail'` from `SESSION_ONLY_SCREENS` in
  `connect-four/src/lib/urlMapping.js`; verify `connect-four/src/App.jsx`'s mount effect (~lines 19-31)
  and popstate handler (~lines 34-57) no longer force-redirect `/mistakeDetail/:category` to home on
  reload. **FR-011.**
- [x] T021 [US2] Run `npm run test:fast`; add T010/T011's test files (or extended file) to the `test:fast`
  script entry in `connect-four/package.json`.
- [x] T022 [US2] Manual QA per `quickstart.md` US2 section using the exact SC-002 fixture ids: open
  `/blunder/52a28158-8603-4ccf-89f4-b9a73b2910f3` cold in a private tab, confirm "Move 19 / 41" and "2 of
  4", confirm "Start new game from here" is present and functional; separately reload
  `/mistakeDetail/<category>` and confirm it stays on the category list. **SC-002.**
  **DEFERRED (batch 2 handoff)**: not run this batch per instructions to avoid starting a dev
  server/browser. Steps above are the exact manual QA to execute before this story is called done.

**Checkpoint**: US2 fully functional and independently testable — cold-boot permalinks are self-sufficient
and `/mistakeDetail` survives reload. (US1's screen from Phase 3 already renders correctly with these
richer fields; no rework needed.)

---

## Phase 5: User Story 3 — Navigation that goes somewhere, and controls that actually move the board (Priority: P1)

**Goal**: Back from a game-reached mistake takes exactly three presses to Home with no repeats;
Prev/Next and mistake-quality chips always change the rendered board; chip resolution works for both AI
sparring and papergames games.

**Independent Test**: Press Back three times from a game-reached mistake and confirm the linear trail;
click Prev/Next and a chip and confirm the board changes each time, for both game sources.

### Tests for User Story 3

- [x] T023 [P] [US3] Add a nav-trail test in `connect-four/tests/urlMapping.test.js` (or a new
  `connect-four/tests/navigation/backTrail.test.js` if a suitable harness doesn't exist in the existing
  file), using an inline hardcoded fixture mistake/game object shaped like the SC-002 fixture (id/
  game_id/move_index values from research.md §3, not a live Supabase call — this is a pure
  navigation/`urlMapping`-state test, so no HTTP server or DB dependency should be introduced) asserting
  the pathname sequence mistake → game → past games list → home for a game-reached mistake (no repeated
  screen), and separately that a cold-opened permalink's Back goes straight to Home in one press (Edge
  Case). **FR-012, SC-003.**
- [x] T024 [P] [US3] Add a stepper board-signature test per `contracts/review-stepper-contract.md`'s
  "Test strategy" section, in `connect-four/tests/blunder/reviewStepperPreview.test.js` (new file),
  using an inline hardcoded `analysis` fixture shaped like the SC-002 game (41 plies, 4 mistakes at
  move_index 16/18/28/32, per research.md §3 — hardcoded movestring/quality values, not a live Supabase
  or solver call): step through `analysis.moves` and assert every step produces a distinct signature —
  either a navigation target (non-optimal) or a changed board render derived from
  `buildBoard(fullMovestring.slice(0, n))` (optimal) — plus a zero-mistake-game case where every step is
  a preview update (Edge Case). **FR-013, FR-014, SC-004.**

### Implementation for User Story 3

- [x] T025 [US3] Fix `handleBack` in `connect-four/src/screens/MistakeDetailScreen.jsx` so a mistake
  reached via a game's "view mistake" link produces the linear trail mistake → game → past games list →
  home (no cycle), while preserving the existing cold-boot-permalink → Home-in-one-press behavior (Edge
  Cases; do not regress spec-037's shipped cold-boot Back behavior). **FR-012.**
- [x] T026 [US3] In `connect-four/src/screens/ReviewScreen.jsx`, change the step universe from
  `mistakeIndices` (non-optimal only) to all of `analysis.moves` (`stepIndices = analysis.moves.map(m =>
  m.moveIndex)`) per `contracts/review-stepper-contract.md` §"Required behavior" 1; Prev/Next disable only
  at the true first/last move, never because a game has zero mistakes (Edge Case).
- [x] T027 [US3] In `connect-four/src/screens/ReviewScreen.jsx`, add local `previewMoveIndex` state (per
  the contract): on selecting a step whose `quality !== 'optimal'`, call the existing (unchanged)
  `navigateToMistake`; on selecting a step whose `quality === 'optimal'`, instead set `previewMoveIndex`
  and re-derive `frozenBoard` from `buildBoard(analysis.fullMovestring.slice(0, previewMoveIndex))`
  (reusing the already-imported `buildBoard`) rather than a no-op. **FR-013, FR-014.**
- [x] T028 [US3] In `connect-four/src/screens/ReviewScreen.jsx`, update the move-timeline chip row
  (currently `onClick={isOptimal ? undefined : ...}`) so every chip click dispatches through the same
  per-step logic as T027 (navigate if non-optimal, preview-update if optimal) — no chip is ever a true
  no-op. **FR-014.**
- [x] T029 [US3] In `connect-four/src/screens/ReviewScreen.jsx`, verify/repair `navigateToMistake`'s
  chip→blunder resolution against both `game_id` and `papergames_game_id` (the `queueParam` ternary at
  `data.source === 'papergames'`, ~lines 132-134, is already reported correct per research.md §6 — this
  task is the explicit verification pass plus a regression guard, using the SC-002 papergames fixture
  game to confirm empirically, not merely re-reading the code). **FR-015.**
- [x] T030 [US3] Confirm `previewMoveIndex` defaults to unset/null (full-game board renders exactly as
  today when a user never steps) and is not persisted across remount/reload (contract: transient UI state
  only).
- [x] T031 [US3] Run `npm run test:fast`; add T023/T024's new test files to the `test:fast` script entry
  in `connect-four/package.json`.
- [x] T032 [US3] Manual QA per `quickstart.md` US3 section: reach a mistake via a game's "view mistake"
  link, press Back three times, confirm the linear trail; open the SC-002 fixture game's stepper, click
  Prev/Next and a blunder chip, confirm board changes and permalink navigation for the papergames source.
  **SC-003, SC-004.**
  **DEFERRED (per batch instructions): no dev server/browser was started this batch. Manual steps to run:**
  1. Start the dev server and app; in-app navigate Home -> Past Games -> open a game -> click a mistake
     chip ("view mistake") -> confirm you land on that mistake's `/blunder/:id` detail. Press Back three
     times; confirm the trail is mistake -> game (`/game/:id`) -> Past Games list (`/pastGames`) -> Home
     (`/`), with no screen repeated.
  2. Open `/blunder/52a28158-8603-4ccf-89f4-b9a73b2910f3` directly (cold, e.g. paste the URL in a fresh
     tab) and confirm a single Back press goes straight to Home.
  3. Open the SC-002 fixture game's review/stepper (papergames game
     `40fe793a-aa39-429d-8ef4-4e43192cc4db`, owned by `d2752b6b-4b9e-450b-8242-bcb10a3900ed` — requires
     that user's session or an admin/service view); click Prev/Next and confirm the board visibly changes
     on every click (optimal moves update in place; non-optimal moves navigate to the permalink). Click a
     blunder chip (e.g. move 18) and confirm it navigates to `/blunder/52a28158-...` with the correct
     "2 of 4" sibling position.

**Checkpoint**: US3 fully functional and independently testable — Back is linear, stepper/chips always
change the board, both game sources resolve correctly.

---

## Phase 6: User Story 4 — "No mistakes" only means no mistakes (Priority: P2)

**Goal**: A game with 0 blunders but ≥1 suboptimal mistake shows a non-zero "mistake" count; no
user-facing label ever claims "no mistakes" in that case, and no "blunder(s)" wording remains where the
underlying count includes both severities.

**Independent Test**: Play/identify a game with zero blunders and ≥1 suboptimal mistake; confirm Past
Games shows a non-zero mistake count and no "no mistakes" text.

### Tests for User Story 4

- [x] T033 [P] [US4] Extend `connect-four/tests/unit/blunderCountsForGames.test.js` (existing file) with
  a regression case: a game with 0 `quality: 'blunder'` rows and ≥1 `quality: 'suboptimal'` row must
  produce a non-zero count from `blunderCountsForGames.js` (this should already pass per research.md/epic
  "Non-obvious facts" — the point of this task is to lock the guarantee in as an explicit regression
  test, not to add new counting logic). **FR-006, SC-006.**

### Implementation for User Story 4

- [x] T034 [US4] Using T002's grep output, audit `/api/games`, `/api/coach/queue`, and
  `/api/coach/weakness-map` handlers in `connect-four/server/index.js` to confirm none filters on
  `quality='blunder'` (regression check only — do not add new counting logic; `/api/stats` is explicitly
  out of scope per spec Assumptions). Record the confirmation (or fix, if a filter is unexpectedly found)
  directly in the code comment at each confirmed site if none already exists. **FR-005, FR-007.**
- [x] T035 [US4] In `connect-four/src/screens/PastGamesListScreen.jsx` (~lines 108-115), rename the
  `no_blunders`-driven copy/i18n to a "mistake(s)" framing (e.g. `no_blunders` → a "no mistakes" string)
  while keeping the wire field name `blunder_count` unchanged (FR-007 — a field rename is out of scope).
  **FR-005, FR-006.**
- [x] T036 [P] [US4] Update `connect-four/src/i18n/en.json` (and any other locale file present) so every
  user-facing count/aggregate label reading "blunder(s)" changes to "mistake(s)" — remember the known
  duplicate-key trap: the `mistakes`/`no_blunders`-adjacent key is defined twice (memory
  `reference_en_json_duplicate_mistakes`, effective copy is the one near line ~707, not the dead one near
  ~492) — edit the effective key, and remove or reconcile the dead duplicate if it causes confusion.
  **FR-005.**
- [x] T037 [US4] Sweep any other user-facing "blunder(s)" label/i18n key in chips/headers/coach copy
  (using T002's grep output as the starting point) and rename to "mistake(s)," explicitly leaving the
  per-move severity indicator's "Blunder" label (US1, FR-001) untouched — FR-005 states this prohibition
  applies to count/aggregate labels only, never the severity chip.
- [x] T038 [US4] Run `npm run test:fast`; add T033's extended test coverage confirmation (no new file
  needed if extending an existing one already in the script).
- [x] T039 [US4] Manual QA per `quickstart.md` US4 section: view the identified 0-blunder/≥1-suboptimal
  game (or the referenced `papergames_game_id = 'a5d40c9e-14a5-46cb-ade8-cdff4bfa2073'` fixture) in Past
  Games; confirm a non-zero mistake count and no "no mistakes" text. **SC-006.**
  DEFERRED (batch 4, 2026-07-08): no dev server/browser was started per task constraints. Manual
  steps for a follow-up QA pass: `cd connect-four && npm run dev` (or equivalent), sign in as the
  user owning `papergames_game_id = 'a5d40c9e-14a5-46cb-ade8-cdff4bfa2073'`, open Past Games, locate
  that game's card, confirm the chip reads "N mistake(s)" (non-zero) and never "No mistakes" — the
  game must have 0 `quality:'blunder'` rows and ≥1 `quality:'suboptimal'` row in `blunders` to be a
  valid fixture; verify via a quick DB query first if the card looks wrong.

**Checkpoint**: US4 fully functional and independently testable — terminology is consistent and no
undercount/mislabel remains.

---

## Phase 7: User Story 5 — No internal jargon or debug output leaks to players (Priority: P2)

**Goal**: No raw debug fields, unformatted movestrings, `community-`/`allen-` prefixes, or raw `cXrY`
tokens ever reach a player — enforced at one shared response-boundary guard covering cache-hit and fresh
paths alike.

**Independent Test**: Open several mistake explanations across tactical patterns and search rendered text
for debug markers, label prefixes, and coordinate tokens; confirm none appear.

### Tests for User Story 5

- [x] T040 [P] [US5] Add a unit test in `connect-four/server/tests/reasonRenderGuard.test.mjs` (new file)
  for the new guard module: `stripInternalTokens` strips a `community-`/`allen-`-prefixed token and
  rewrites `cXrY` to "column N" in sample prose; `sanitizeTermsMap` rewrites a `terms` map key with a
  `community-`/`allen-` prefix. Include at least one negative case (clean text/terms passes through
  unchanged). **FR-017, FR-018, SC-005.**
- [x] T041 [P] [US5] Add an integration test in
  `connect-four/tests/integration/explainMoveResponseGuard.test.js` (new file), using this repo's
  mock-supabase-stub convention (no real DB) that hits `/api/explain-move-llm` and `/api/explain-move`
  for both a cache-hit and a fresh-generation response. Add a small stubbed-cache-row helper (e.g.
  `mockExplanationCacheRow(text, terms)` in a shared test-helpers file or inline in this file) that
  constructs a mocked `supabase.from('explanation_cache').select().eq().single()` chain returning a
  deliberately-poisoned row (explanation text containing a `community-`/`cXrY` token, and a `terms` map
  key with a `community-`/`allen-` prefix) for the cache-hit branch; for the fresh-generation branch,
  stub the underlying generation call (mechanism/LLM helper) to return an equivalently poisoned payload
  and a mocked cache-miss on `explanation_cache`. Assert neither substring class ever appears in the JSON
  response body's explanation text or `terms` keys for either branch. **FR-019, SC-005.**

### Implementation for User Story 5

- [x] T042 [US5] Create `connect-four/server/reasonRenderGuard.mjs` exporting `stripInternalTokens(text)`
  (strips `community-`/`allen-` prefixes from any detected KB-slug-shaped token; rewrites raw `cXrY`
  tokens to "column N", 1-based, dropping the row per Decision A) and `sanitizeTermsMap(terms)` (rewrites
  each key of the `terms` map through the same prefix-stripping rule), per research.md §5.
- [x] T043 [US5] In `connect-four/src/screens/MistakeDetailScreen.jsx`, remove the raw debug legend
  (`blunder.board_state` raw movestring, `sev:{severity}`, `tree:{blunder_severity}` — originally
  ~lines 359-364 per the epic's non-obvious facts, verify current line numbers before editing). **FR-016.**
- [x] T044 [US5] In `connect-four/server/index.js`, call `stripInternalTokens`/`sanitizeTermsMap` at the
  response/serialization boundary — immediately before every `res.json(...)` that emits explanation text
  or a `terms` map — covering both the cache-hit early return and the fresh-generation branch of
  `/api/explain-move-llm` (~lines 1005, 1088) and both branches of `/api/explain-move` (~line 961), per
  research.md §5. Do NOT add guard calls inside `reasonEngine.mjs`/`explainContext.js`/
  `llmCoachHelpers.js` (those are bypassed by cache hits — the whole point of the response-boundary
  placement). **FR-019.**
- [x] T045 [US5] Grep for any other `res.json()` call site in `connect-four/server/index.js` that returns
  player-facing `explanation`/`mechanism`/`terms` content and was not covered by T044 (the plan explicitly
  calls for a full re-grep, not just the four named sites) — add the guard call there too if found.
- [x] T046 [US5] Confirm the TTS endpoint (~line 3676, `stripAnnotationsForTTS`) is intentionally left
  untouched (it already strips separately for its own purpose) — no change needed, verify only.
- [x] T047 [US5] Run `npm run test:fast`; add T040/T041's new test files to the `test:fast` script entry
  in `connect-four/package.json`.
- [ ] T048 [US5] Manual QA per `quickstart.md` US5 section: open several mistake explanations across
  different `pattern_category` values; search rendered DOM/text for `sev:`, `tree:`, a raw movestring,
  `community-`, and any `cXrY`-shaped token; confirm none appear. **SC-005.**
  **DEFERRED (batch 5, 2026-07-08): no dev server/browser was started this batch per instructions.**
  Manual steps for a follow-up QA pass: `cd connect-four && npm run dev` (or equivalent); open several
  mistake detail screens across different `pattern_category` values (e.g. via Past Games → a game with
  mistakes, and via a direct `/blunder/:id` permalink); for each, trigger a Deep Reveal (both the
  free `/api/explain-move` "What should I have played?" path and, on an authed session, the paid
  `/api/explain-move-llm` path) so both endpoints' response text renders; inspect the rendered DOM/text
  for `sev:`, `tree:`, a raw board-state movestring (the removed debug legend), `community-`, `allen-`,
  and any `cXrY`-shaped token (e.g. `c1r4`). None should appear. Since the guard is a defensive last-mile
  filter (research.md §8 — the leak site was never conclusively pinned to one call site ahead of time),
  also worth spot-checking a KB-term tap popup title (`KbTermPopup.jsx`) does not show a raw
  `community-`/`allen-`-prefixed id as its title for at least one pattern.

**Checkpoint**: US5 fully functional and independently testable — the guard is a single shared seam and
is verified to actually catch a real leak instance, not merely present-but-inert.

---

## Phase 8: User Story 6 — See exactly which squares matter, with a stable board while adjusting the view (Priority: P3)

**Goal**: Every square named in a mistake's explanation — for whichever tactical pattern it is, not just
double-threat — is visibly highlighted, via one generic, pattern-agnostic mechanism (Decision 3);
dragging the split-pane divider never changes the board's zoom.

**Independent Test**: Open a double-threat explanation and confirm both named squares are highlighted;
drag the split divider and confirm the board's zoom stays constant.

**⚠️ Sequencing note (binding, from research.md §9 and the plan-fix handoff)**: T049 (the `double_threat`
verification) MUST run and pass BEFORE any other US6 task begins, and T049A (the per-pattern
board-state audit) MUST run and pass before T050/T052. The `detectDoubleThreat`/`Board`/`parseCxRy`
computation described below is a design-level sketch derived by reading `classifier.js:1328`/`:1703`,
not tested code — the implementer must verify it against the real `Board` constructor API and the
detector's actual 1-indexed `"cXrY"` cell-string format (`c${col+1}r${board.colHeights[col]+1}`) before
trusting the shape in `contracts/api-blunders-id.md`.

**Decision 3 (owner-raised, generalizes the field)**: the field is `patternCells`, not a
`double_threat`-only `doubleThreatCells`. One mechanism: look up the mistake's `pattern_category` in the
existing tag→detector map (`classifier.js:1536`), run that pattern's detector (every detector shares the
`{ matched, cells }` return shape; `figure_7`/`j_shape` are two other examples, at
`classifier.js:934`/`:970`), and plumb its `cells` as the additive render-only field. Verified test
fixtures remain the two detector-verified `double_threat` boards only (`41442625312235115445550126400`
P1 `c1r4`/`c4r3`; `3333364101252113121524` P2 `c5r3`/`c7r2`) — do not invent verified expectations for
other tags. Patterns whose detector returns empty cells (e.g. solver-based ones) simply yield an
empty/absent field, no special-casing. Still render-only per reason-INVARIANTS I0.

### Tests for User Story 6

- [x] T049 [US6] **(Do this first, blocking for the rest of this phase.)** Write and run a standalone
  verification script (e.g. via the project's existing inline-Node-script pattern, memory
  `reference_inline_node_scripts`) that calls the production `detectDoubleThreat` from
  `connect-four/server/classifier.js` against the two Assumptions boards, through the exact computation
  `contracts/api-blunders-id.md` §4 specifies (`Board` constructed from `board_state + correct_move`,
  `detectDoubleThreat(boardAfterCorrect, blundererFromBoard(board_state).currentPlayer)`), and confirm the
  returned cells match: `41442625312235115445550126400` → `c1r4`/`c4r3` → `{col:0,row:3}`/`{col:3,row:2}`;
  `3333364101252113121524` → `c5r3`/`c7r2` → `{col:4,row:2}`/`{col:6,row:1}`. If the real `Board`/
  `detectDoubleThreat` API differs from the sketch (constructor signature, `currentPlayer` accessor,
  `cells` shape), fix the computation in T050/T052 accordingly — do not silently trust the sketch.
  **SC-008, prerequisite for all other US6 tasks.**
- [x] T049A [US6] **(Second blocking prerequisite, after T049, before T050/T052 — Decision 3's per-pattern
  audit.)** For every other cell-naming pattern tag in the tag→detector map (`classifier.js:1536`:
  `immediate_threat`, `forced_block`, `forbidden_columns`, `z_threat`, `odd_even_threat`, `undercut`,
  `overcut`, `figure_7`, `j_shape`, `major_threat_parity`, `major_threat_nonparity`, `minor_threat`,
  `claimeven` — `double_threat` is already covered by T049), determine and record which board state and
  perspective that tag's detector must run on to produce the mistake's named cells. Record the result as
  a small table (tag → board-input expression) that T052 implements against. **WARNING (project memory,
  immediate_threat phantom-cell trap)**: `immediate_threat`/`missed_own` MUST be evaluated on the
  **pre-move** `board_state` (the movestring as stored, NOT `board_state + correct_move`) — running the
  detector against the post-correct-move board produces a phantom threat one row up that was never the
  actual mistake. Fork-shaped patterns (`double_threat`, and any other pattern with the same
  "missed-creating-a-fork" shape) keep the board-after-correct-move derivation verified in T049.
  Patterns whose detector is score-consuming (`forced_block`, `forbidden_columns`, `z_threat`,
  `odd_even_threat`, `claimeven`) or otherwise legitimately returns `cells: []` in practice are recorded
  as "empty/absent by design" — no special-casing in T052's implementation for these, they simply
  produce an empty field.
- [x] T050 [P] [US6] Add a test in `connect-four/tests/blunder/patternCells.test.js` (new file, renamed
  from `doubleThreatCells.test.js` per Decision 3), using this repo's mock-supabase-stub convention (no
  real DB) — hardcoded fixture rows for `GET /api/blunders/:id` asserting the response's `patternCells`
  field: for a `pattern_category: 'double_threat'` fixture row, computed for each of the two Assumptions
  boards, matches the cells verified in T049; for a fixture row whose `pattern_category` has no detector
  mapping (per T049A's table) or whose detector doesn't match, `patternCells` is an empty
  array/absent. Keep the two `double_threat` boards as the only verified-expectation fixtures — do not
  assert specific cell values for any other pattern tag without its own solver-verified board.
- [x] T051 [P] [US6] **(Decision 2 — automated guard, not manual-only.)** Extract the board-width freeze
  into a pure function `computeFrozenBoardWidth(containerH, initialSplitPct, isDragging) -> boardW` in
  `useDragSplit.js`/`SplitReveal.jsx`, and add a unit test in
  `connect-four/tests/unit/splitRevealZoom.test.js` (new file) asserting its output is invariant to drag
  position: call it across a simulated range of `splitPct`/drag positions from `minTopPct` to
  `maxTopPct` while `isDragging === true`, and assert `boardW` never changes, while a separate call with
  a genuinely different `containerH` (simulating a real resize) DOES change it. This is a real automated
  regression guard (no simulated `pointermove` events needed, since the pure function is tested directly)
  — it complements, not replaces, the manual drag-feel check in T058.

### Implementation for User Story 6

- [x] T052 [US6] In `connect-four/server/index.js`, add the generic `patternCells` computation to **both**
  independent blunder-response builders — the `GET /api/blunders/:id` handler AND the list/enriched-map
  builder at `~line 2560` (confirmed by direct read, not merely "if T015 found it independently
  constructs response shapes" — it does, unconditionally apply the addition to both, per critique
  blocking issue #2). Implementation: look up `data.pattern_category` in the tag→detector map
  (`classifier.js:1536`); if mapped, run that tag's detector against the board state/perspective recorded
  in T049 (`double_threat`) / T049A (every other tag) — reusing the verified-in-T049 call to the
  production `detectDoubleThreat` (`classifier.js:1328`) on the board after `correct_move`, from the
  blunderer's perspective (mirroring `classifier.js:1703`), for `double_threat` specifically; convert
  1-indexed `"cXrY"` strings to `{col, row}` 0-indexed objects; empty array/absent when unmapped, no
  match, or the detector legitimately returns no cells. **Two things do not exist in `index.js` today and
  must be added**: (1) an import of the relevant detector function(s) from `classifier.js` — `index.js`
  currently imports `Board` but not `detectDoubleThreat` or any other detector; (2) a `cXrY` → `{col,
  row}` parser (`parseCxRy` exists nowhere in the repo today) — author it once, reuse for both response
  builders. **FR-020, SC-008.**
- [x] T052A [US6] Add a check (in T050's test file, or a small addition to it) that an
  in-app-navigated `double_threat` mistake — i.e. one fetched through the list/enriched-map builder at
  `index.js:~2560`, not just the cold-boot `:id` handler — carries the same `patternCells` values as the
  cold-boot path for the same mistake. This closes the gap the critique identified: in-app navigation
  (`ReviewScreen` → `blunderDetail` → `MistakeDetailScreen.jsx:84-85`'s `userMajorThreats` channel) goes
  through the `~2560` builder, so highlighting could silently work only for cold-boot permalinks if T052
  were applied to just one builder.
- [x] T053 [US6] In `connect-four/src/screens/MistakeDetailScreen.jsx` (~lines 84-85), extend the existing
  `userMajorThreats` derivation to merge `blunder.patternCells` alongside the existing
  `blunder.threat_cells` — no new frontend prop; both feed the one existing highlight channel (Decision A:
  never parse highlights from prose). **FR-020, FR-021.**
- [x] T054 [US6] Confirm highlight coloring in `connect-four/src/components/DeepRevealPane.jsx` continues
  to use the existing player-color convention (`userIsYellow` role assignment per memory
  `project_highlight_cell_colors`) for the merged cell set — no hardcoded color assignment introduced.
  **FR-021.**
- [x] T055 [US6] In `connect-four/src/lib/useDragSplit.js`, expose `containerH` and `initialSplitPct` (the
  pane height/percent at open time, before any drag), and add the pure function `computeFrozenBoardWidth
  (containerH, initialSplitPct, isDragging)` (tested in T051) that `SplitReveal.jsx` calls to compute a
  one-time frozen board width, per `contracts/split-reveal-zoom-contract.md` §2 and Decision 2.
- [x] T056 [US6] In `connect-four/src/components/SplitReveal.jsx`, freeze `boardW` in a ref by calling
  T055's `computeFrozenBoardWidth` once from `initialSplitPct`/`containerH` at mount and on genuine
  container resize only (window resize/orientation change) — never recomputed inside `handleMove` or
  while `isDragging === true`. The pane's own `flex: 0 0 ${topPx}px` sizing is unchanged; only the
  board's rendered `maxWidth` decouples from live drag position. **FR-022.**
- [x] T057 [US6] Run `npm run test:fast`; add T050/T051's new test files (`patternCells.test.js`,
  `splitRevealZoom.test.js`) to the `test:fast` script entry in `connect-four/package.json`.
- [ ] T058 [US6] Manual QA per `quickstart.md` US6 section: open the mistake/explanation surfacing each of
  the two Assumptions boards and confirm both named cells render highlighted; drag the SplitReveal divider
  from a neutral position past the prior break point and confirm the board's zoom stays constant across
  the full `minTopPct`–`maxTopPct` range. **SC-008, SC-009.**
  **DEFERRED** (this batch did not start a dev server/browser per instructions). Automated coverage
  (T050/T051/T052A) exercises the underlying logic; this manual walkthrough step remains open for the
  next session/batch.

**Checkpoint**: US6 fully functional and independently testable — pattern highlighting (verified for
`double_threat` against real detector output, generalized to every other mapped pattern tag per T049A's
audit) works identically whether the mistake was reached cold-boot or in-app, and the split-pane zoom bug
is fixed for the full drag range with an automated regression guard.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [x] T059 [P] Update `docs/architecture/api-conventions.md`'s `GET /api/blunders/:id` documented response
  shape to match the shipped extension (`papergames_game_id`, `totalMoves`, `siblingMistakes`,
  `patternCells`), per `contracts/api-blunders-id.md` (plan.md's Constitution Check VIII commitment).
  **Done (Polish batch, 2026-07-08)**: response example, per-field notes, and list/enriched-map parity
  note added.
- [x] T060 [P] Update `docs/architecture/frontend-conventions.md`'s `SESSION_ONLY_SCREENS` description to
  reflect `mistakeDetail`'s removal and its new `/mistakeDetail/:category` URL-param pattern.
  **Done (Polish batch, 2026-07-08)**: set description updated to 2 entries (`summary`, `game`) with a
  note on `mistakeDetail`'s new `/mistakeDetail/:category` route.
- [x] T061 Full regression pass: run `npm run test:fast` from `connect-four/` one final time with every
  story's changes merged; confirm green. **SC-007.**
  **Done (Polish batch, 2026-07-08)**: 964/964 passing, 0 failures.
- [ ] T062 Deploy task (per plan.md's Constitution Check VIII and spec-039 precedent): `TRUNCATE
  explanation_cache` at ship time, so no pre-fix cached row containing an unsanitized `community-`/`cXrY`
  token or unsanitized `terms` key is ever served stale during the deploy window (the response-boundary
  guard from T044 covers it regardless, but truncating is defense-in-depth per research.md §5).
  **DEFERRED — must be run by the user at ship/deploy time, not by an agent.** This is a production-DB
  action (`TRUNCATE explanation_cache`), same category as spec-039's deploy requirement (memory
  `project_spec039_audio_interactive_coach`). Concrete step: after this feature deploys, run `TRUNCATE
  explanation_cache;` against the production DB before/at the deploy window closes, so no pre-fix cached
  row leaks through the (functionally redundant but defense-in-depth) response-boundary guard.
- [ ] T063 Full `quickstart.md` walkthrough, US1 through US6 in order, on a real local dev server
  (`npm run dev`), confirming every Acceptance Scenario and Success Criterion listed in `spec.md` passes
  end to end with the merged feature.
  **DEFERRED — belongs to the interactive browser QA phase that follows this Polish batch**, per batch
  instructions (do not start a dev server/browser walkthrough in this batch). See the consolidated
  deferred-QA list in the Polish-batch handoff for the exact per-story steps (T009, T022, T032, T039,
  T048, T058 already recorded their own concrete steps inline above; T063 additionally requires walking
  every spec.md Acceptance Scenario/Success Criterion end to end, not just the per-story subset).
- [x] T064 Sweep `rg -n "sev:|tree:|community-|cXrY" connect-four/src connect-four/server` (excluding test
  fixtures and this feature's own guard/test files) to confirm no residual leak site was missed by T044/
  T045's response-boundary audit.
  **Done (Polish batch, 2026-07-08) — sweep clean, no genuine player-facing leak found.** Every hit
  classified: (1) doc comments/JSDoc in `reasonRenderGuard.mjs`, `index.js`, `explainContext.js`,
  `blunderDetailResponse.js`, `reasonEngine.mjs` — non-runtime, fine; (2) `reasonRenderGuard.test.mjs` —
  excluded per instructions; (3) `kbTermLesson.js` / `llmCoachHelpers.js` `PATTERN_KB` — internal lookup
  keys only (`'community-z-threat': {...}`); consuming code reads `.displayName`, and any raw id that
  reaches player-facing prose via an LLM-emitted `[term:community-x]` token is stripped by
  `stripInternalTokens` at the response boundary before the client ever parses it — verified this is the
  exact case `sanitizeTermsMap`'s doc comment describes guarding against; (4) `AdminDeepRevealEvalPage.jsx`
  `sev:` label — admin-only page, route gated by `requireLocalhost + requireAdmin` (`index.js:543,555`),
  not player-facing; (5) `reason_engine/TOOLS/build_catalog.mjs` `sev:` — internal dev/catalog script, not
  a server response path; (6) `fv_suff_answers_..._grade_report.md` — generated eval-harness report
  artifacts under `server/scripts/`, never served to players. No fix required.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately. Includes T002A (`papergames_game_id` on
  `GET /api/blunders/:id`'s `.select()`, promoted from US2 per Decision 1) — US1's T003 and US6's T049
  both depend on this having landed.
- **Foundational (Phase 2)**: None required (see Phase 2 note) — all user stories may start once Phase 1
  completes.
- **User Stories (Phase 3–8)**: Each is independently implementable after Phase 1. In practice, US1
  (Phase 3) and US2 (Phase 4) both touch `MistakeDetailScreen.jsx`'s cold-boot logic — implement in
  spec order (US1 → US2 → US3 → US4 → US5 → US6) to avoid merge friction, even though each story's
  acceptance criteria are independently testable in isolation.
- **Polish (Phase 9)**: Depends on all six user stories being complete (T059/T060 specifically depend on
  US2's and US2's endpoint/URL changes respectively having landed).

### User Story Dependencies

- **US1 (P1)**: No dependencies on other *stories* — only on Phase 1's T002A (now Foundational, not US2).
  Can genuinely ship alone as the MVP increment; T003 no longer needs to wait on US2's endpoint work.
- **US2 (P1)**: Independent of US1's severity-label change, but both touch `MistakeDetailScreen.jsx` — no
  logical dependency, just shared-file awareness. Its own `.select()` addition (old T012) moved to T002A;
  T013/T014 (totalMoves/siblings) and T015 (list-variant parity) remain here.
- **US3 (P1)**: Independent; touches `ReviewScreen.jsx` and `MistakeDetailScreen.jsx`'s `handleBack`
  (different function than US2's cold-boot logic in the same file).
- **US4 (P2)**: Independent; touches `PastGamesListScreen.jsx` and i18n only.
- **US5 (P2)**: Independent; new module + `server/index.js` response boundary only — no shared frontend
  file with other stories.
- **US6 (P3)**: Depends on Phase 1's T002A (fixture boards may be papergames-sourced) but nothing else
  from US1–US5 functionally; reuses `MistakeDetailScreen.jsx`'s `userMajorThreats` derivation (already
  present) — additive only. T049 then T049A (Decision 3's per-pattern audit) must both complete, in that
  order, before any other US6 task, per the binding handoff note.

### Within Each User Story

- Tests before implementation where included (T003 before T004-T007; T010/T011 before T012-T020; etc.).
- Server-side data/field changes before frontend consumption of those fields (e.g., T012-T015 before
  T016-T018).
- Story's own manual-QA task is last.

### Parallel Opportunities

- T003 [P], T010/T011 [P], T023/T024 [P], T033 [P]/T036 [P], T040/T041 [P] can each run in parallel
  within their story once that story's tests are being written.
- T049 → T049A must run strictly sequentially (in that order) before T050/T051, which may then run in
  parallel [P] with each other.
- T059/T060 (Polish, doc updates) can run in parallel with each other.
- Different user story phases (Phase 3–8) can be staffed in parallel by different developers once Phase 1
  completes, with the shared-file caution noted above for US1/US2/US3 (all touch
  `MistakeDetailScreen.jsx`).

---

## Parallel Example: User Story 2

```bash
# Launch US2's two test tasks together:
Task: "Add HTTP-level integration test for GET /api/blunders/:id extension in tests/integration/blunderPermalinkContext.test.js"
Task: "Add /mistakeDetail/:category URL_MAP round-trip test in tests/urlMapping.test.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 3: User Story 1 (unified detail screen).
3. **STOP and VALIDATE**: suboptimal and blunder mistakes render identically, all 3 actions present.
4. Ship/demo if desired — this alone retires the legacy explorer split.

### Incremental Delivery

1. Setup → US1 (unify screen) → validate → ship.
2. Add US2 (permalinks/reload) → validate → ship.
3. Add US3 (nav/stepper) → validate → ship.
4. Add US4 (terminology) → validate → ship.
5. Add US5 (no leakage) → validate → ship.
6. Add US6 (highlighting/split-pane) → validate → ship.
7. Phase 9 Polish (docs + deploy truncate + full quickstart) as the final gate before calling the epic
   done.

### Notes

- No new tables/migrations/endpoints — every server change is additive fields on
  `GET /api/blunders/:id`, plus one new small module (`reasonRenderGuard.mjs`).
- Every new test file MUST be added by explicit name to the `test:fast` npm script entry in
  `connect-four/package.json` — this repo's `test:fast` runs an explicit file list, not a glob.
- Out of scope for every task above (do not fold in): chip z-order/opacity bleed-through, chip-below-board
  layout (both are stale CSS/layout QA items, not spec-042 requirements), `/api/stats`, any
  `blunder_count` → `mistake_count` wire rename, and any change to the reason/evidence engine's
  computation (render-only per reason-INVARIANTS I0).

---

## Manual-QA results — 2026-08-03

Run against locally harvested fixtures (the `quickstart.md` SC-002 ids are staging/prod rows and do
not exist locally). Full report: `agentic_QA_2026-08-03-1208.md`.

- **T009 / T022 / T032 / T039 — ✅ pass**, marked complete above.
- **T048 (US5) — ❌ fail**, left unchecked. 3 reveals sampled (undercut, double_threat, forced_win):
  no `sev:`, `tree:`, `community-`, `cXrY`, or raw movestrings — but `forced_win` prose emitted the
  raw column range **"c3-c6"**. `reasonRenderGuard.mjs:25`'s `CXRY_RE` only matches the `cXrY` form,
  so bare/ranged column tokens pass through. Filed as **OI-126**. Fix the guard before checking this off.
- **T058 (US6) — ⚠️ partial**, left unchecked. Highlighting verified correct (a "column 7" zone draws
  its capsule exactly on column 7's centre; toggles on click). The **split-pane zoom half is blocked**
  — and its criterion is **stale**: `SplitReveal.jsx:49-72` documents that FR-022's width freeze was
  deliberately superseded (the freeze was the root cause of a worse full-bleed bug), so "zoom stays
  constant" is no longer the intended behavior. Filed as **OI-127** — which also records that the
  contract doc asserts the *opposite* outcome and that `tests/unit/splitRevealZoom.test.js`'s
  "invariant" case is vacuous. Update `quickstart.md` + the contract before re-running.
- **T062 — not run** (deploy task, out of scope for a local QA run). Still open.
- **T063 — ⚠️ partial**: US1–US6 all driven in order; only the US6 drag portion is unverified.
