# Tasks: Detector Perspective Soundness & Blunder Tag Taxonomy

**Input**: Design documents from `specs/052-detector-perspective-taxonomy/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/detector-signatures.md, quickstart.md

**Tests**: This epic is a content-migration/correctness fix to stored, user-visible blunder tags. Per
`reason-INVARIANTS.md` I12 and the epic's Settled decision 3, every behavior change MUST be validated
by a counterexample board run through the *production* detector — these are not optional test tasks,
they are FR-mandated (FR-009, FR-017, FR-020, spec Edge Cases) and are included below as first-class
tasks, not a separate optional block.

**Movestrings**: Every counterexample/repro board below MUST be harvested via `gameSampling.js`'s
`playGame` (or `./visualize_board.sh` on an already-known-good movestring from the KB/lessons), never
hand-constructed, per `CLAUDE.md`'s movestring rule. Tasks whose fixture cannot be harvested before
implementation begins are flagged **UNVERIFIED SKETCH — adapt**.

**Test runner**: `npm run test:fast` from `connect-four/` — NOT `npm test` (excludes the solver-hanging
`tests/integration/candidate-generator.test.js`, per `CLAUDE.md` §Running tests).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US5, mapping to spec.md's five user stories
- Every task names an exact file path

## Path Conventions

All paths are relative to the repository root unless stated otherwise. Server code lives in
`connect-four/server/`, tests in `connect-four/tests/`, i18n in `connect-four/src/i18n/`, docs in
`docs/`. This epic touches only the server side and its fixture/doc/i18n satellites (plan.md §Project
Structure) — no `connect-four/src/` component code.

---

## Phase 1: Setup

**Purpose**: Confirm a clean, green starting point before any story-specific change lands.

- [ ] T001 From `connect-four/`, run `eval "$(../worktree-ports.sh)"` then `npm run test:fast` and
  confirm 100% green — this is the baseline every subsequent story-level checkpoint compares against
  (quickstart.md §Prerequisites).
- [ ] T002 [P] Grep-confirm the zero-fixture-risk baseline for `overcut`:
  `grep -c "'overcut'" connect-four/tests/blunder/fixtures/tagBlunderFixtures.json` from
  `connect-four/` and record the count (research.md D1 states this is 0 today — verify it is still 0
  before US1 changes anything).
- [ ] T003 [P] Re-measure the active `overcut` puzzle/candidate row count against the current local
  database (and staging/production if reachable) per FR-006, using the conventions in memory
  `reference_supabase_connection.md` (service-role key, `cd connect-four` first, manual `.env` parse).
  Record the count and, if staging/production is unreachable, record that fact explicitly rather than
  assuming zero — this measurement gates US1's `highlight_metadata` re-derivation task (T014).
- [ ] T003A [P] SC-001 sweep audit (epic acceptance criterion, spec.md SC-001): enumerate **every**
  detector in `connect-four/server/classifier.js` that both reads `scores` and reads
  perspective-dependent board state, and record, for each, whether it is sound and *why* — this task's
  scope is the whole epic's headline acceptance criterion ("No detector mixes one player's threats with
  the other player's score sign"), not just `detectOvercut` (US1–US2 already cover that detector in
  depth). Cover at minimum the four other detectors registered in `classifyPattern`'s detector list that
  take both `scores` and `perspective`: `detectZThreat` (`classifier.js:849`), `detectOddEvenThreat`
  (`:1220`), `detectForcedBlock` (`:1615`), `detectForbiddenColumns` (`:1716`). Each already carries a
  guard shaped `if (perspective !== board.currentPlayer && solver) { …recurse into child moves… }`
  (verified present at `:851`, `:1222`, `:1617`, `:1718` respectively) — cite this guard explicitly for
  each detector as the reason it is likely sound when a solver is supplied. Do **not** assert "already
  satisfied" by omission (per `CLAUDE.md`'s prohibition on that exact move) — write the finding down for
  each of the four, even if the conclusion is "no change needed." Explicitly flag, but do NOT fix, the
  `solver === null` fall-through: when no solver is supplied, the guard's `&& solver` condition is
  false, so execution falls straight through to the unsound perspective-mixing branch with nothing
  checking for it — file this as a **new** `docs/open_issues.md` entry (do not fold it into OI-76 or any
  other existing entry) describing the four affected detectors and the exact failure condition. Also add
  a new dated entry to `docs/architecture/reason-DECISIONS.md` (D34/D35 citation format) recording that
  the codebase now contains **two competing solutions to the same perspective problem** — this epic's
  role-split pattern (Settled decision 1, `detectOvercutVictim`/`detectOvercutBeneficiary`,
  `detectUndercutVictim`/`detectUndercutBeneficiary`) and the older FR-033 solver-recursion route used by
  these four detectors — since no artifact currently acknowledges that divergence and it will confuse
  the next person who touches a perspective-taking detector. Do **NOT** migrate any of the four
  detectors to the role-split pattern — this task is audit-only, per the epic owner's explicit decision;
  fixing the `solver === null` gap is future work tracked by the new open-issues entry, not this epic.

---

## Phase 2: Foundational

**Purpose**: No shared new infrastructure is introduced by this epic (plan.md §Project Structure: "No
new directories or services"). Each user story is a self-contained fix to an existing detector/tag
producer. There is no blocking foundational phase distinct from Setup — user stories 1–5 may begin as
soon as Phase 1 is green.

**Checkpoint**: Foundation ready — proceed to User Story 1 (P1), the epic's required first story per
spec.md's sequencing note ("must land first... every other story either depends on this fix... or is
independent of it").

---

## Phase 3: User Story 1 — A player's stored blunder tag correctly names who did what (Priority: P1) 🎯 MVP

**Goal**: Split `detectOvercut(board, scores, perspective)` into `detectOvercutVictim(board, scores)` /
`detectOvercutBeneficiary(board, scores)`, drop `perspective` entirely, fix the production call site
that today always takes the unsound wrong-player branch, and human-review every resulting fixture
change.

**Independent Test**: Re-run `tests/blunder/tagBlunderFixtures.test.js` against the fixed detectors and
confirm every `overcut`-tagged fixture's cells/columns belong to the tagged player, not another player.

### Implementation for User Story 1

- [ ] T004 [US1] Characterize today's (pre-fix) `detectOvercut` behavior: add a characterization test in
  `connect-four/tests/integration/undercut_overcut.test.js` capturing current output for each reachable
  branch (`same_parity_t4`, `active_forcing` [T5], `chain_t2`, no-match) using the harvested movestrings
  already cited in quickstart.md (`26533454144531123345224155`, `2365213030023306446354465055546`,
  `32640344326334662063620`) — run and pass BEFORE the split, so the diff in T005 is measurable.
- [ ] T005 [US1] In `connect-four/server/classifier.js`, split `detectOvercut` (currently `:1020-1073`)
  into two exported functions with no `perspective` parameter: `detectOvercutBeneficiary(board, scores)`
  (today's `scores[col] > 0` framing — the direct migration of the existing loop, per contracts C2) and
  `detectOvercutVictim(board, scores)` (new losing-mover predicate: the mover's own major threat in
  column C is neutralized — T2 applies, no T4/T5/chain/minor/active-forcing rescue — **and**
  `scores[C] < 0` from the mover's perspective; built from the `detectUndercutVictim`/`detectUndercutCore`
  template at `classifier.js:981-1004`, per contracts C1's resolved predicate). Remove the old
  `detectOvercut` export entirely (hard break, FR-002).
- [ ] T006 [P] [US1] Harvest a sixth counterexample board via `gameSampling.js`'s `playGame` (flag
  **UNVERIFIED SKETCH — adapt**) where the mover's own major threat is legitimately dead and
  `scores[C] < 0`, and add a dedicated test exercising `detectOvercutVictim` through the production
  function in `connect-four/tests/integration/undercut_overcut.test.js` — none of the epic's five
  Beneficiary-shaped counterexamples exercise this predicate (contracts C1, research.md D1 "Harvest
  gap").
- [ ] T007 [US1] Update the production call site `connect-four/server/classifier.js:1784`
  (`classifyPattern`'s detector list, `['overcut', () => detectOvercut(board, scores, perspective)]`) to
  `['overcut', () => detectOvercutVictim(board, scores)]` — NOT Beneficiary. Verified: `tagBlunder`
  Phase C (`classifier.js:1929`) calls `classifyPattern` on `moves + correctCol`, a board where the side
  to move is the opponent, not the blunderer; both new functions resolve role from `board.currentPlayer`,
  so only Victim reports the blunderer's own exposure correctly here (mirrors the existing `'undercut'`
  entry at `:1783`, which calls `detectUndercutVictim` for the identical reason).
- [ ] T008 [US1] **Confirmation task, resolved on plan review — wire to Beneficiary, do not
  re-investigate.** Verified at source: `candidate-generator.js:368`'s `checkOvercutPredicate` calls
  `detectOvercut(new Board(ms), scores)` — exactly two arguments, no `perspective` — i.e. it already runs
  as the side to move, and consumes `result.correctCols` (contracts C2: Beneficiary is "the closest
  direct migration of the existing loop"). Update `connect-four/server/candidate-generator.js:6`
  (import) and `:368` (call) to `detectOvercutBeneficiary(new Board(ms), scores)`. This is
  behavior-preserving by construction (the call already matched the mover's own perspective, unlike the
  `classifyPattern` call site T007 fixes), so the existing `overcut` puzzle pool stays valid — this
  matters because the `overcut` fixture corpus currently has **zero rows** (T002), so nothing would catch
  a silent inversion if this were instead re-derived from first principles and flipped to Victim. Record
  this rationale in the commit. This call site is independent of T007's `classifyPattern` mapping — the
  two need not (and do not) match.
- [ ] T009 [US1] Update `connect-four/tests/integration/undercut_overcut.test.js` (`:5, 142, 146, 150,
  154`) and `connect-four/tests/classifier/classifier.test.js` (`:11`) imports/calls from `detectOvercut`
  to `detectOvercutVictim`/`detectOvercutBeneficiary` as appropriate for each existing test's intent.
- [ ] T010 [US1] **This is the epic's only real guard against wiring the new detectors to the wrong
  role — do not water it down.** Add a Phase-C-level regression (not a bare unit test) in
  `connect-four/tests/blunder/tagBlunderFixtures.test.js` or `connect-four/tests/blunder/tagBlunder.test.js`:
  construct a real blunder board via `gameSampling.js`, run the full `tagBlunder` pipeline, and assert the
  `overcut`-tagged cells belong to the blunderer, not the opponent — a correct `detectOvercutVictim`
  wired to the wrong call site would pass a bare unit test but fail this regression (FR-003). The
  `overcut` fixture corpus is currently empty (zero rows, T002), so T011/T012's fixture-diff review has
  nothing to protect Story 1 with — this Phase-C-level regression, exercising the real pipeline
  end-to-end, is the only thing standing between a wrong-role wiring bug and a shipped defect. If this
  task is implemented as a plain `detectOvercutVictim(board, scores)` unit-level assertion instead of a
  full `tagBlunder` pipeline run on a harvested board, Story 1 ships unverified.
- [ ] T011 [US1] Only after T005/T007 land, re-run
  `node connect-four/server/scripts/generate_tagblunder_fixtures.mjs` and diff
  `connect-four/tests/blunder/fixtures/tagBlunderFixtures.json` — do not run this against an intermediate
  state that still calls Beneficiary at the `classifyPattern` call site (research.md D1 sequencing
  constraint).
- [ ] T012 [US1] Human-review every changed or newly-appearing `overcut`-tagged row in the T011 diff
  individually before committing (FR-005, SC-002) — this covers both "existing match changes" and "no
  match before, new match after" (spec.md Edge Cases); a bulk regeneration does not satisfy this.
- [ ] T013 [US1] Using T003's measurement, if the local (or reachable staging/production) active
  `overcut` row count is non-zero, re-derive `highlight_metadata` for those rows under the new detectors
  and report in the PR/commit whether the pool needs repair (FR-006); if the count is zero everywhere
  reachable, record that explicitly as a no-op with the measurement as evidence.
- [ ] T014 [US1] Add a new dated entry to `docs/architecture/reason-DECISIONS.md` (follow the existing
  Context/Decision/Rationale/Source citation format used by D34/D35) recording the `classifyPattern`
  Phase-C call-site mapping to `detectOvercutVictim` (not Beneficiary) and why.
- [ ] T015 [US1] Update `docs/architecture/server-conventions.md` §"Undercut has two sides" to extend its
  worked precedent explicitly to overcut's `detectOvercutVictim`/`detectOvercutBeneficiary` split.
- [ ] T016 [US1] From `connect-four/`, run `npm run test:fast` and confirm green (FR-027, SC-007
  checkpoint for this story).

**Checkpoint**: US1 is independently complete — every `overcut` blunder tag now describes the tagged
player using only that player's own threats and score sign.

---

## Phase 4: User Story 2 — "Active forcing" overcut is recognized as a first-class blunder pattern (Priority: P2)

**Goal**: Add the KB's gravity-top-adjacent "active forcing" sub-case as its own match branch, add the
structurally-missing minor-threat branch, and resolve the contested `active_forcing` label per a
recorded decision.

**Independent Test**: Construct a board matching `community-overcut.md`'s active-forcing case (e) and
confirm the detector reports a match distinct from the T5-exception case.

**Depends on**: User Story 1 (both touch the same detector; the epic requires US1's perspective fix to
land first — spec.md "Why this priority").

### Implementation for User Story 2

- [ ] T017 [US2] Before touching `connect-four/server/classifier.js:1052`, add a new dated entry to
  `docs/architecture/reason-DECISIONS.md` recording the resolved Open Question 1: rename the existing
  `isT5Exception`-driven branch's `reason` from `'active_forcing'` to `'t5_row3_row6'`, and reserve
  `'active_forcing'` for the new KB-matching branch (research.md D3; matches the epic's own documented
  leaning and `community-overcut.md`'s own vocabulary) — write the rationale, not just the choice
  (FR-008).
- [ ] T018 [US2] In `connect-four/server/classifier.js:1052`, rename the `isT5Exception` branch's emitted
  `reason` string from `'active_forcing'` to `'t5_row3_row6'` — logic unchanged, label only (per T017's
  decision).
- [ ] T019 [US2] Before implementing the minor-threat branch, run the corrected predicate ("current
  player has a major threat at R **and** the opponent has a **minor** threat strictly below R — no
  match if the opponent has no threat at all below R") over the existing fixture corpus plus a fresh
  `node connect-four/server/scripts/generate_tagblunder_fixtures.mjs` run, and record the match-count
  delta versus today's 0 `overcut` fixture rows (T002's baseline); escalate to the epic owner before
  absorbing it silently if the delta is material (research.md D2 "Required pre-tasking step").
- [ ] T020 [US2] In `connect-four/server/classifier.js`, add a new `'minor_threat'` match branch to
  `detectOvercutBeneficiary`'s loop: source the opponent's minor threat via `getMinorThreatWindows` (or
  `categorizeThreats(board, opponent).player.minor.cells`) filtered to the target column, requiring a
  minor threat strictly below the mover's major threat at R — the branch MUST NOT match merely because
  no opposing threat exists there at all (FR-009's explicit carve-out; research.md D2's "drop the 'or
  none' clause" correction).
- [ ] T021 [US2] In `connect-four/server/classifier.js`, add the new gravity-top-adjacent
  `'active_forcing'` match branch per `community-overcut.md`'s case (e): odd-empty-count column, mover's
  turn, mover's threat immediately above the opponent's blocked threat, immediate check created at R
  (FR-007).
- [ ] T022 [P] [US2] Harvest and run through the production `detectOvercutBeneficiary`, each as its own
  dedicated test in `connect-four/tests/integration/undercut_overcut.test.js`, the 5 documented
  mechanisms — T4 same-parity (`26533454144531123345224155`), T5 rows-3/6 now `t5_row3_row6`
  (harvest via `gameSampling.js`), chain-T2 (`32640344326334662063620`), minor-threat (harvested per
  T019/T020, flag **UNVERIFIED SKETCH — adapt**), and active-forcing
  (`2365213030023306446354465055546`) — no single board or hand-rolled proxy stands in for more than
  one case (FR-009, SC-003).
- [ ] T023 [P] [US2] Confirm the two documented false positives still correctly fail to match through
  the production detector: `331324244556605142` (T2 legitimately fires, no rescue) and
  `10231405030112342031435` (mutual `[*]`-contested row — active-forcing must not backfire, per
  `community-overcut.md`'s own false-positive example and spec.md Edge Cases).
- [ ] T024 [US2] Update `connect-four/lessons/lesson-12-overcut.json` copy and any deep-reveal
  shape-naming text referencing the affected label(s) to match T017's decision (FR-010).
- [ ] T025 [US2] Add cross-references to `docs/knowledge-base/community-overcut.md`,
  `docs/knowledge-base/allen-t2.md`, `docs/knowledge-base/allen-t4.md`, and
  `docs/knowledge-base/allen-t5.md` documenting the shipped `detectOvercutVictim`/`detectOvercutBeneficiary`
  split and the new `active_forcing`/`minor_threat` branches (FR-011); then run `npm run sync-kb` from
  `connect-four/` and confirm `connect-four/tests/unit/kbSync.test.js` passes.
- [ ] T026 [US2] From `connect-four/`, run `npm run test:fast` and confirm green (FR-027, SC-007
  checkpoint for this story).

**Checkpoint**: US1 + US2 both independently complete — every documented overcut sub-case is a
first-class, correctly-labeled match, validated one counterexample per mechanism.

---

## Phase 5: User Story 3 — A forfeited forced win is never described as merely "a draw" (Priority: P2)

**Goal**: Distinguish "you forfeited a forced win" from "the best available outcome was a draw" in both
`classify()` (live sparring) and `tagBlunder` Phase E (stored/reviewed), without altering the genuine
draw-to-draw case.

**Independent Test**: Play a near-empty-board position where center is a forced win and a side column
only draws through both the live sparring endpoint and the stored blunder pipeline; confirm neither path
emits the tag/label it would emit for a genuine best-is-a-draw position.

**Depends on**: Independent of US1/US2 (different detector/tag entirely, per spec.md).

### Implementation for User Story 3

- [ ] T027 [US3] In `connect-four/server/classifier.js`'s `tagBlunder` Phase E (currently `:2056-2062`),
  change the emitted `direction` from `'missed_own'` to a new value `'forfeited_win'` when `preScore > 0
  && postScore === 0`; keep `direction: 'missed_own'` unchanged for the genuine best-is-a-draw case
  (`preScore === 0 && postScore === 0`) — FR-012/FR-017.
- [ ] T028 [US3] In `connect-four/server/classifier.js`'s `classify()` (currently `:736-737` —
  `if (score > 0) return { tag: 'best_move' }; if (score === 0) return { tag: 'drawing_move' };`; NOT
  `:743-744`, which sits inside an unrelated JSDoc block — locate by the `score === 0` return, not the
  line number), compute
  `bestScore = Math.max(...scores.filter(...))` (not currently computed there) and surface a distinct
  signal — e.g. a `phrasePoolKey: 'forfeited_win'` addition to the returned shape — when `bestScore > 0
  && score === 0`, instead of falling through to the plain `'drawing_move'` tag; do NOT emit a
  `direction` field from `classify()` — its sole consumer never reads one (contracts C5, research.md
  D4's "corrected on plan review").
- [ ] T029 [US3] Update `connect-four/server/evaluateMoveHandler.js`'s `phrasePoolKey` derivation
  (currently `:76-83`, `phrasePoolKey = category || patternTag`) to consult T028's forfeited-win signal
  ahead of that fallback, so a forfeited-win live move resolves to the `'forfeited_win'` pool key instead
  of `'drawing_move'`.
- [ ] T030 [US3] Author new `coach.spoken.forfeited_win.*` phrase pools (matching the existing
  `{prompt, hint, optimal, suboptimal, blunder}` shape used by other `coach.spoken.<tag>` entries) in
  BOTH `connect-four/src/i18n/en.json` and `connect-four/src/i18n/es.json` — this is net-new i18n
  content, not covered by any existing `drawing_move` pool (research.md D4, data-model.md). Also check
  the second, independent lookup family `evaluateMoveHandler.js`'s `summaryLineKey` derivation drives
  (`eval.<phrasePoolKey>.<quality>.summary`, currently `:85-86`, distinct from the `coachPhraseKey`
  lookup at `:81-83`): verified, `eval.*` in `en.json` today has entries for only 6 keys
  (`immediate_threat`, `forced_block`, `double_threat`, `claimeven`, `z_threat`, `forbidden_columns`), so
  `forfeited_win` has no `eval.*` pool. Make an explicit, recorded decision — either author
  `eval.forfeited_win.*.summary` pools in both locales, or record that the written-summary line is
  intentionally out of scope for this tag — do not leave it as an unnoticed gap (FR-025's "renders in
  both supported locales" covers both lookup families, not just `coach.spoken.*`).
- [ ] T031 [US3] **Resolved — no-op, confirmed rather than assumed**: `connect-four/tests/unit/
  i18nKeyParity.test.js`'s `getNestedKeyPaths` walks the *entire* `en`/`es` JSON trees recursively
  (verified — it is called on the top-level `en`/`es` imports, not a `coach.spoken`-scoped subtree), so
  it already covers `coach.spoken.forfeited_win.*` (and any `eval.forfeited_win.*` added under T030) with
  no test-code change required. Keep the caveat live: this test enforces key **presence** parity only —
  an English string copied verbatim into `es.json` under the right key path passes it silently; presence
  parity is not translation parity, so the T030 pools must still be genuinely translated, not just
  key-complete.
- [ ] T032 [US3] Add a new `'drawing_move:forfeited_win'` key to `REASON_TEMPLATES` in
  `connect-four/server/blunderReasons.js` (alongside the existing `:43` `'drawing_move:missed_own'`
  entry), with `reason` text distinguishing "a forced win was forfeited" from the generic missed-own
  text (`classifier.js:2060`'s current reason string must also be updated for the forfeited case).
- [ ] T033 [US3] Trace every call site of `blunderReasons.js:60`'s bare `POSITIVE_TEMPLATES.get('drawing_move')`
  fallback string ("You found the drawing resource — the only move that prevents a loss"); verify
  whether it is reachable on a forfeited-win (blunder) position or only on the optimal/praise path, and
  correct its text ONLY if reachable there (FR-014's "verify and correct only if reachable," not an
  unconditional rewrite).
- [ ] T033A [US3] Verify-and-record touchpoint 2 of FR-015's six: confirm `connect-four/server/
  blunderTags.js` requires no change under Decision D4. Verified: `VALID_BLUNDER_TAGS` is a `Set` of
  `pattern_category` values only, `'drawing_move'` is already a member (`blunderTags.js:20`), and
  Decision D4 mints no new `pattern_category` — `forfeited_win` is a `direction` value, a field this
  registry does not track at all. Record this finding explicitly in the commit (do not leave it as an
  implicit assumption folded into T034).
- [ ] T033B [US3] Verify-and-record touchpoint 1 of FR-015's six: confirm no Postgres CHECK constraint
  governs the `direction` column, so no migration is needed for the new `forfeited_win` value. Verified:
  `connect-four/server/migrations/034_blunders_direction.sql` is a bare `ALTER TABLE public.blunders ADD
  COLUMN direction TEXT;` with an explicit comment "No CHECK constraint: deliberately unconstrained to
  allow future extensions without a migration" — `pattern_category`'s CHECK constraint
  (`migrations/052_blunders_parity_threat_tags.sql`) is a separate column, unaffected by Decision D4.
  Record this finding explicitly in the commit (do not leave it as an implicit assumption folded into
  T034).
- [ ] T034 [US3] Update `docs/architecture/data-model.md`, `docs/architecture/db-schema.md`, and
  `docs/architecture/server-conventions.md` (§"Blunder Tag Registry") with a `direction` semantics note
  for the new `forfeited_win` value — no new `pattern_category` enum value, no CHECK-constraint edit, no
  migration (research.md D4; the "no CHECK constraint, no migration" conclusion is verified and recorded
  separately by T033A/T033B — this task's own scope is the doc-prose update only).
- [ ] T035 [US3] Update `connect-four/server/explainContext.js`'s `POSITIVE_CASCADE` array (verify the
  `'drawing_move'` entry, cited at `:415`) and `docs/architecture/feature-vector-glossary.md:337`'s
  `drawing_move` row: split the glossary row into "missed_own" (score fallback, no named pattern) vs. a
  new "forfeited_win" row/note (FR-015).
- [ ] T036 [US3] Add a new dated entry to `docs/architecture/reason-DECISIONS.md` (D34/D35 citation
  format) recording the Open Question 2 resolution — refine `direction` rather than mint a new
  `pattern_category`, plus the separate live-path phrase-pool-key mechanism — with full rationale
  (FR-014).
- [ ] T037 [US3] Re-read `connect-four/server/llmCoachHelpers.js`'s Fix 4 grounding-rule block (currently
  `:723-724`, keyed on `tag === 'drawing_move'` only) against the shipped T027–T029 behavior; confirm it
  still reads correctly for both the `missed_own` and `forfeited_win` sub-cases, or correct it if it does
  not (FR-016).
- [ ] T038 [P] [US3] Harvest (via `gameSampling.js`'s `playGame`, flag **UNVERIFIED SKETCH — adapt**) a
  near-empty-board position where center is a forced win and a side column only draws; exercise the FULL
  live path via `POST /api/evaluate-move` (not just `classify()` in isolation) and confirm the
  `phrasePoolKey` resolves to `'forfeited_win'` and `coach.spoken.forfeited_win.*` renders in both `en`
  and `es` (FR-012).
- [ ] T039 [P] [US3] Using the same or an equivalent harvested board, run it through the full
  `tagBlunder` pipeline and confirm `direction === 'forfeited_win'` is stored (FR-013).
- [ ] T040 [P] [US3] Harvest a genuine draw-to-draw position (best move and played move both only draw);
  confirm `direction` remains `'missed_own'` (unchanged) via `tagBlunder`, AND confirm the live path's
  `phrasePoolKey` resolution does NOT divert this case to `'forfeited_win'` via `POST
  /api/evaluate-move` (FR-017, spec.md Edge Cases — validated in both directions per I12).
- [ ] T041 [US3] From `connect-four/`, run `npm run test:fast` and confirm green (FR-027, SC-007
  checkpoint for this story).

**Checkpoint**: US1 + US2 + US3 all independently complete — a forfeited forced win is now
distinguishable from a genuine draw in both live sparring and stored/reviewed analysis.

---

## Phase 6: User Story 4 — A second, genuinely new tactical fork is recognized as newly created (Priority: P3)

**Goal**: Replace the boolean "did the mover already hold this pattern" gate with a per-column/anchor
diff for both the fork-creation gate and the forced-win-creation gate, so a genuinely new second
instance is recognized even when the first persists.

**Independent Test**: Construct a board where the mover already holds a fork in columns A/B and creates
a second, distinct fork in C/D; confirm the "creation" signal now fires.

**Depends on**: Independent of US1/US2/US3; independent of US5 (spec.md: "not shared infrastructure for
User Story 5").

### Implementation for User Story 4

- [ ] T042 [US4] In `connect-four/server/classifier.js`, refactor `hasDoubleThreat(board, player)`
  (currently returns a plain `boolean`, `:635-659`) to also expose the identifying column set — its
  already-computed internal `gravityTopCols` `Set<number>` (Case A) plus, for Case B (stacked pair), an
  identity for the stacked column — while preserving a boolean-compatible check for any caller that still
  needs one. First confirm (do not assume) that `hasDoubleThreat`'s **only** caller is `classify()`'s
  Category 3 gate (`:696`, both the `nextBoard` and `board` calls sit on that one line) — `:702`
  (Category 4) calls `detectForcedWin`, a DIFFERENT function, not `hasDoubleThreat`; do not cite `:702`
  as a second `hasDoubleThreat` call site. Also confirm Phase C's `isUndercutDoubleThreat`/
  `isUndercutFigure7` helpers (`:1940-1956`) call `detectDoubleThreat` — yet another different function
  — not `hasDoubleThreat` (contracts C6 — do not conflate the three).
- [ ] T043 [US4] Update `classify()`'s Category 3 gate (`classifier.js:696`) to diff `colsAfter \
  colsBefore` (set difference, not equality) using T042's exposed column sets; a non-empty diff ⇒
  `'double_threat'`. Confirm the A/B→C/A partial-overlap edge case (spec.md line 142) correctly counts as
  "one new column, one retained" (FR-018, FR-020).
- [ ] T044 [US4] In `connect-four/server/classifier.js`, add a `blockCol` field to `detectForcedWin`'s
  return shape (currently always `{ matched, cells: [] }`, verified `:1664-1697`): `{ matched, cells,
  blockCol }`, where `blockCol` is the anchoring immediate threat (`myThreats[0]`, `:1673`) that starts
  the forcing sequence. Do NOT thread the full per-branch forcing-column recursion (`:1686`) through —
  that is out of scope per research.md Decision D5 (FR-019). **Warning**: `detectForcedWin`'s JSDoc
  (`:1660`) declares `@returns {{ matched, cells? }}`, but every return statement actually emits
  `cells: []` — the doc comment is stale/wrong, not the code. Follow the verified body (add `blockCol`
  alongside the real return shape) — do NOT "fix" the code to match the comment, and do not treat the
  comment as authoritative when implementing this task.
- [ ] T045 [US4] Update `classify()`'s Category 4 gate (`classifier.js:702`) to diff `blockCol`
  before/after (single-value inequality, not a set) instead of the boolean `.matched` transition
  (FR-019).
- [ ] T046 [P] [US4] Harvest (via `gameSampling.js`'s `playGame`) a board where the mover already holds a
  fork in columns A/B before their move and creates a second, distinct fork in columns C/D with their
  move; add a test confirming `classify()` now returns `'double_threat'` for that move (today:
  suppressed) (FR-018, Acceptance Scenario 1).
- [ ] T047 [P] [US4] Harvest a board where the move does not change which columns hold the fork pattern;
  add a test confirming no regression — `classify()` still does not report `'double_threat'` (FR-020,
  Acceptance Scenario 2).
- [ ] T048 [P] [US4] Harvest a board demonstrating the forced-win `blockCol` diff creating a genuinely
  new forced-win instance (a different `blockCol` before vs. after); add a test confirming `classify()`
  now returns `'forced_win'` for that move (FR-019, Acceptance Scenario 3).
- [ ] T049 [US4] Add a NEW entry to `docs/open_issues.md` (per the file's Issue closeout convention —
  new entry, NOT folded into OI-33's closeout) documenting the known, accepted limitation: two distinct
  forced-win lines sharing the same anchoring `blockCol` are not distinguished by this diff and would be
  treated as one instance (research.md Decision D5, spec.md Edge Cases, FR-026).
- [ ] T050 [US4] Add a `test:fast`-safe regression exercising
  `connect-four/server/candidate-generator.js`'s `cls.tag` consumer (currently `:668`, `if (cls?.tag)
  tags.push(cls.tag);`) WITHOUT invoking the real solver process — verify the solver-injection seam
  (parameter vs. module-level import) before designing a mock/stub, or construct a fixture board where
  `classify()`'s pure-geometry gate (Category 3, no solver call) is exercised directly — and confirm it
  fails on the old boolean gate / passes on the new diff (FR-021).
- [ ] T051 [US4] From `connect-four/`, run `npm run test:fast` and confirm green (FR-027, SC-007
  checkpoint for this story).

**Checkpoint**: US1–US4 all independently complete — the creation gates now recognize genuinely new,
distinct fork/forced-win instances alongside a persisting one.

---

## Phase 7: User Story 5 — The live coach can recognize and praise more tactical patterns during play (Priority: P4)

**Goal**: Extend `classify()`'s live per-move tag vocabulary with a latency-vetted subset of
`{figure_7, j_shape, z_threat, undercut, overcut, odd_even_threat, claimeven}`, reusing the existing
absent→present transition gate, under a single total-endpoint latency budget.

**Independent Test**: Play a live sparring move that creates one of the chosen patterns for the first
time; confirm the coach praises it exactly once, not on every subsequent persistence-only move.

**Depends on**: Independent of US1–US4; may ship before, after, or in parallel with US4 (FR-023 does not
depend on FR-018/FR-019 shipping first).

### Implementation for User Story 5

- [ ] T052 [US5] Measure `POST /api/evaluate-move`'s real end-to-end latency with and without each
  candidate detector (`detectZThreat`, `detectOddEvenThreat`, `detectClaimeven` — solver-calling;
  `detectFigure7`, `detectJShape`, `detectUndercutVictim`/`detectUndercutBeneficiary`,
  `detectOvercutVictim`/`detectOvercutBeneficiary` — pure geometry, no solver call beyond the
  already-computed `scores` array) against a representative mid-game position, and derive the remaining
  headroom versus the Explanation Engine's existing 2s target — record the numeric budget explicitly
  (e.g. "non-detector baseline Xms; headroom Yms") (FR-022, Constitution Principle V).
- [ ] T053 [US5] Using T052's measurements, decide and record (in a new
  `docs/architecture/reason-DECISIONS.md` entry or the equivalent decision doc this epic uses for US5)
  which patterns are admitted to live recognition, admitting cheapest-first while the running total stays
  under T052's budget — this is a knapsack-style admission over one shared budget, not five independent
  per-detector ceilings; justify the inclusion/exclusion rationale for each of the 7 candidates in writing
  (FR-022, Acceptance Scenario 1).
- [ ] T054 [US5] In `connect-four/server/classifier.js`, extend `classify()`'s priority chain with each
  pattern admitted under T053, gated by the existing absent→present transition-gate shape at `:696`
  (`if (hasX(nextBoard) && !hasX(board))`) — or, if US4 (Phase 6) has already shipped for that pattern's
  creation-gate family, the per-column-diff shape MAY be preferred (FR-024, optional, non-blocking; MUST
  NOT be used to justify new per-instance infrastructure).
- [ ] T055 [P] [US5] For each pattern admitted under T053, verify (do not assume) BOTH of the two
  independent lookup families `evaluateMoveHandler.js` drives from the same `phrasePoolKey`
  (`:79-86`) — `coach.spoken.<tag>.<quality>` (spoken line) AND `eval.<tag>.<quality>.summary` (written
  summary) — render correctly and in parity in both `connect-four/src/i18n/en.json` and
  `connect-four/src/i18n/es.json` before enabling live recognition for that pattern (FR-025). research.md
  Decision D6 found all 7 candidates already have complete `coach.spoken.*` English pools; confirm
  Spanish parity there via T031 (already confirmed `i18nKeyParity.test.js` covers the whole tree, key
  presence only — not translation quality). Separately, verified: `en.json`'s `eval.*` object has entries
  for only 6 keys (`immediate_threat`, `forced_block`, `double_threat`, `claimeven`, `z_threat`,
  `forbidden_columns`) — of the 7 US5 candidates, **five** (`figure_7`, `j_shape`, `undercut`, `overcut`,
  `odd_even_threat`) have no `eval.*` entry at all. This is not a regression (the fall-through tags they
  replace today have no `eval.*` pool either), but make an explicit, recorded decision **per admitted
  pattern**: either author the missing `eval.<tag>.*.summary` pools in both locales, or record that the
  written-summary line is intentionally out of scope for that pattern — do not leave it as an unnoticed
  gap; FR-025's "renders in both supported locales" is only half-checked if only `coach.spoken.*` is
  verified.
- [ ] T056 [P] [US5] For each pattern admitted under T053, add a dedicated test exercising the actual
  `POST /api/evaluate-move` endpoint (not a unit-level `classify()` call) confirming the tag fires exactly
  once when the pattern is newly created by a move, and does NOT re-fire on a subsequent move where the
  pattern merely persists (FR-023, Acceptance Scenario 2/4).
- [ ] T057 [US5] From `connect-four/`, run `npm run test:fast` and confirm green (FR-027, SC-007
  checkpoint for this story).

**Checkpoint**: All five user stories are independently complete and functional.

---

## Phase 8: Polish & Cross-Cutting — Open-Issues Closeout

**Purpose**: Close out every `OI-N` this epic covers in `docs/open_issues.md`, per the Issue closeout
convention (`docs/epics/open-issues-epics.md` top matter), and confirm the whole epic's final gate. This
phase is the acceptance-criteria-mandated closeout, not incidental cleanup — FR-026/SC-006.

- [ ] T058 Close out **OI-76** in `docs/open_issues.md`: change its `**Status**: open — latent` to
  `**Status**: ✅ RESOLVED <YYYY-MM-DD>`, and replace the "If picked up" section with what actually
  shipped (the `detectOvercutVictim`/`detectOvercutBeneficiary` split, the `classifyPattern` call-site fix
  to Victim, T004–T016) — follow OI-74's own closeout as the worked template (same file, immediately
  preceding OI-76).
- [ ] T059 Close out **OI-60** in `docs/open_issues.md`: change its `**Status**: deferred / open` to
  `**Status**: ✅ RESOLVED <YYYY-MM-DD>` describing the new `active_forcing`/`minor_threat` branches and
  the `t5_row3_row6` rename (T017–T026), AND correct its body text's "lesson 07 (overcut)" to
  "`lessons/lesson-12-overcut.json`" (FR-026's explicit callout — this correction is part of the
  closeout, not a separate task).
- [ ] T060 Close out **OI-48** in `docs/open_issues.md`: change its `**Status**: deferred / open` to
  `**Status**: ✅ RESOLVED <YYYY-MM-DD>` describing the `direction: 'forfeited_win'` refinement and the
  live-path phrase-pool-key mechanism (T027–T041).
- [ ] T061 Close out **OI-33** in `docs/open_issues.md`: for whichever of its two items (distinct-second-fork
  over-suppression; `candidate-generator.js` classify-consumer not in `test:fast`) US4 (Phase 6) actually
  resolved, either mark `**Status**: ✅ RESOLVED <YYYY-MM-DD>` (both items fixed — T042–T051) or, if only
  one item is fully closed, add a dated `**UPDATE <YYYY-MM-DD>**` block stating precisely which item
  closed and which remains — mirroring OI-61's item-1/item-2 split precedent in the same file. Do NOT mark
  it resolved if the `blockCol`-collision residual (T049) means item 1 is only partially addressed.
- [ ] T062 Add the **NEW** `docs/open_issues.md` entry for the forced-win `blockCol`-sharing collision
  (T049) if not already added as part of Phase 6 — confirm it is a standalone entry, not folded into
  OI-33's closeout (T061), per FR-026's explicit instruction.
- [ ] T063 Close out **OI-30** in `docs/open_issues.md`: change its `**Status**: deferred` to
  `**Status**: ✅ RESOLVED <YYYY-MM-DD>` if T053 admitted at least the fully-vetted patterns and shipped
  transition-gating for all of them, or add a dated `**UPDATE <YYYY-MM-DD>**` block naming exactly which
  patterns were admitted/excluded and why (T052–T057) if the story only partially closes the gap (e.g.
  some candidates excluded on latency grounds are an intentional, recorded partial closure, not a defect).
- [ ] T064 Confirm all reason-engine documentation lockstep obligations landed in the same change as their
  code: `docs/architecture/reason-DECISIONS.md` has the four-plus new entries (T003A's perspective-audit
  divergence note, T014, T017, T036, and T053's admission rationale if recorded there);
  `docs/architecture/server-conventions.md` has both the US1 undercut-precedent extension (T015) and the
  US3 Blunder Tag Registry note (T034); the KB cross-references (T025) are synced via `npm run sync-kb`;
  and T003A's new `docs/open_issues.md` entry for the `solver === null` fall-through exists as a
  standalone entry (not folded into OI-76's closeout, T058).
- [ ] T065 From `connect-four/`, run `npm run test:fast` one final time and confirm 100% green with zero
  regressions across all five stories (FR-027, SC-007, epic Acceptance criteria's final gate) —this is
  the single command that must pass "at the end of every user story in this epic," re-confirmed here at
  the epic level.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — run first.
- **Foundational (Phase 2)**: No blocking infrastructure introduced by this epic; proceeds directly to
  User Story 1.
- **User Story 1 (Phase 3, P1)**: Must land first — spec.md: "Every other story in this epic either
  depends on this fix (US2 extends the same detector) or is independent of it, so it must land first."
- **User Story 2 (Phase 4, P2)**: Depends on US1 (same detector, hard-break rename already landed).
- **User Story 3 (Phase 5, P2)**: Independent of US1/US2 (different detector/tag) — may run in parallel
  with Phase 4 if staffed separately, but sequenced after in this document for readability.
- **User Story 4 (Phase 6, P3)**: Independent of US1/US2/US3.
- **User Story 5 (Phase 7, P4)**: Independent of US1–US4; FR-023 explicitly does not require US4 to ship
  first, and MAY ship before, after, or in parallel with it.
- **Polish (Phase 8)**: Depends on whichever stories are in scope for a given release having landed —
  each OI closeout (T058–T063) depends specifically on its own story's tasks, not on all five.

### User Story Dependencies

- **US1 → US2**: hard sequential (same detector, same call site).
- **US3, US4, US5**: each independent of US1/US2 and of each other — may be implemented in any order
  after Setup, though this document lists them P2 → P3 → P4 for priority-driven delivery.

### Within Each User Story

- Characterization/harvest tasks before the code change they validate (US1: T004 before T005; US2: T019
  before T020).
- Detector/gate code changes before their dedicated counterexample tests are added against the
  production path (though the counterexample boards themselves may be harvested in parallel — see [P]
  markers).
- Fixture regeneration only after the call-site fix that determines correct fixture content (US1: T011
  strictly after T005+T007).
- Documentation/decision-log entries for a taxonomy choice land BEFORE the code that depends on the
  choice (US2: T017 before T018; US3: T036 documents the choice already implemented in T027–T029, per
  FR-014's "decision... justified in writing" being a description of the shipped choice, not a
  pre-registration gate — unlike US2's T017, which must precede T018 because the string literal itself
  is the decision's output).
- Each story's own `npm run test:fast` checkpoint (T016, T026, T041, T051, T057) before considering that
  story done.

### Parallel Opportunities

- T002, T003, and T003A (Setup) can run in parallel with each other and with T001 — T003A (the SC-001
  perspective-soundness audit) touches only `docs/architecture/reason-DECISIONS.md` and
  `docs/open_issues.md`, and is independent of every code-change task in this epic.
- Within US1: T006 (Victim harvest) can run in parallel with T004 (characterization) since they touch
  different test scenarios, but both must precede T005's implementation review.
- Within US2: T022 and T023 (harvest + false-positive verification) are mutually parallel once T018/T020/
  T021 land.
- Within US3: T038, T039, T040 (three independent harvested-board verifications) are mutually parallel.
- Within US4: T046, T047, T048 (three independent harvested-board tests) are mutually parallel once
  T043/T045 land.
- Within US5: T055 (i18n parity check) and T056 (round-trip tests) are mutually parallel per admitted
  pattern.
- **Across stories**: US3, US4, and US5 have no file-level or logical dependency on each other or on
  US1/US2 (beyond the shared `classifier.js` file, which requires sequential edits within a single
  branch/worktree to avoid merge conflicts — but if executed in separate worktrees per
  `feedback_concurrent_agents_clobber`'s warning about silent clobbering, coordinate merges carefully).

---

## Parallel Example: User Story 3

```bash
# Launch all three independent harvested-board verifications for User Story 3 together,
# once T027-T037 have landed:
Task: "Harvest live-path repro board and verify phrasePoolKey resolves to 'forfeited_win' via
       POST /api/evaluate-move, rendering in both en/es (T038)"
Task: "Harvest stored-path repro board and verify tagBlunder direction === 'forfeited_win' (T039)"
Task: "Harvest genuine draw-to-draw board and verify direction stays 'missed_own' unchanged,
       live phrasePoolKey does not divert (T040)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup) + Phase 2 (Foundational, no-op here).
2. Complete Phase 3 (User Story 1) — the actively-shipping OI-76 defect fix.
3. **STOP and VALIDATE**: run T016's `npm run test:fast` gate and confirm the Phase-C-level regression
   (T010) passes against the real `tagBlunder` pipeline.
4. This alone resolves the epic's single actively-shipping production defect and can ship independently.

### Incremental Delivery

1. Setup + Foundational → ready.
2. US1 (P1) → validate independently → ship (closes OI-76, T058).
3. US2 (P2) → validate independently → ship (closes OI-60, T059) — requires US1 merged first.
4. US3 (P2) → validate independently → ship (closes OI-48, T060) — independent of US1/US2, may ship in
   parallel.
5. US4 (P3) → validate independently → ship (closes/updates OI-33 + new blockCol-collision entry, T061,
   T062) — independent of all above.
6. US5 (P4) → validate independently → ship (closes/updates OI-30, T063) — independent of all above,
   including US4.
7. Phase 8 final closeout audit (T064–T065) once all stories intended for this release have landed.

### Parallel Team Strategy

With multiple developers/agents, after Setup:
- US1 must be done by one lane first (US2 blocks on it).
- Once US1 lands: Developer/Agent A continues to US2; Developer/Agent B starts US3; Developer/Agent C
  starts US4; Developer/Agent D starts US5 — all four run in parallel, each touching
  `connect-four/server/classifier.js` in a different function region (overcut detectors for US1/US2,
  `classify()`/`tagBlunder` Phase E for US3, `hasDoubleThreat`/`detectForcedWin` for US4, `classify()`'s
  priority chain for US5) — coordinate merges carefully since all five ultimately land in the same file.
