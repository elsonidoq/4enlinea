# Feature Specification: Puzzle Generation & Correctness

**Feature Branch**: `044-puzzle-generation-correctness`
**Created**: 2026-07-10
**Status**: Draft
**Input**: User description: "Epic 4 of polish_epic.md — Enforce player-color and pattern constraints in generated puzzles, audit and correct the per-category correctness predicates at both the generation and solve seams, and add net-new Allen transformations + V-rules sourced from the knowledge base."

## Framing

This feature is an **audit-and-fix** of correctness logic that already exists in two layers of the puzzle
pipeline, plus **net-new** algorithmic coverage sourced from the strategy knowledge base:

- **Generation-time** (`server/candidate-generator.js`): per-category `check*Predicate` functions, dispatched
  by `checkPredicate` (~line 431), decide whether a sampled board qualifies as a puzzle candidate for a
  category, and which column(s) count as the correct answer.
- **Solve-time** (`server/predicates.js`): per-category `eval*` functions, dispatched by `evaluatePredicate`,
  decide whether a learner's submitted column is `'correct'`, `'wrong'`, or `'tied'` (tied = correct but not the
  stored canonical answer).

This spec does **not** introduce a new generic "run the classifier, accept if present" correctness rule. It
audits the existing per-category semantics — accept-any-generating-column, avoid-the-pattern, or
unique-answer — against what is actually implemented (server-side *and* client-side), corrects a confirmed
acceptance-path bug for the multi-solution categories, and adds new-but-verified pattern operators: Allen
T1–T7 as threat-simplification **detectors** (each takes a set of threats and returns a winner, per the
knowledge base's `t*_winner(threats) -> (player, col) | None` predicate shape — not board-mutation operators),
plus Allen V-rules V1–V5 and T4 (Case A and Case B), all sourced strictly from `docs/knowledge-base/` after a
one-time backfill of currently-memory-only verified fixtures into the KB.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Learner is cast as the correct color for the concept (Priority: P1)

As a learner solving an `immediate_threat` or `forced_block` puzzle, I want the puzzle to always put me in the
seat that matches the concept being taught — the player who has the winning move for `immediate_threat`, the
player who must block for `forced_block` — so the lesson maps cleanly onto "my move accomplishes X," using the
project's green (first player / P1) and gray (second player / P2) color convention consistently.

**Why this priority**: Miscast puzzles (e.g. a `forced_block` puzzle where the learner is asked to play the
winning move instead of the blocking move) teach the wrong lesson and break the mental model the rest of the
lesson content relies on. This is foundational — every downstream puzzle-quality fix assumes color casting is
already correct.

**Independent Test**: Generate a batch of `immediate_threat` and `forced_block` candidate puzzles and verify,
for each, which color the learner is assigned versus which color the concept requires.

**Acceptance Scenarios**:

1. **Given** a candidate board that qualifies for `immediate_threat`, **When** the puzzle is generated,
   **Then** the learner is cast as the first player (green) — the side with the winning move.
2. **Given** a candidate board that qualifies for `forced_block`, **When** the puzzle is generated, **Then**
   the learner is cast as the second player (gray) — the side that must block.
3. **Given** a candidate board that would cast the learner as the wrong color for the category, **When** the
   generator evaluates it, **Then** the candidate is rejected (not surfaced as a puzzle) rather than corrected
   after the fact.
4. **Given** any user-facing puzzle text (prompt, hint, explanation) referencing the learner's color, **When**
   the text is rendered, **Then** it says "green" or "gray," never "red" or "yellow."

---

### User Story 2 - No unrelated forced-block distraction in other puzzles (Priority: P1)

As a learner solving a puzzle in a category other than `forced_block`, I don't want the board to also contain
an unrelated forced-block situation that has nothing to do with the concept being taught, because it muddies
which move I should be looking for and why.

**Why this priority**: A stray, unrelated forced-block on the board competes for the learner's attention with
the actual concept and can make an otherwise-correct puzzle read as ambiguous or wrong. This directly affects
puzzle trustworthiness, on the same footing as color casting.

**Independent Test**: Scan a batch of non-`forced_block` candidate puzzles for the presence of a forced-block
situation on the board; verify each is rejected unless the forced-block *is* the puzzle's answer move.

**Acceptance Scenarios**:

1. **Given** a candidate board for a category other than `forced_block` that contains a forced-block situation
   whose blocking column is *not* the puzzle's answer move, **When** the generator evaluates the candidate,
   **Then** the candidate is rejected.
2. **Given** a candidate board where the puzzle's answer move *is itself* the move that blocks the
   forced-block threat (i.e., the forced-block and the intended answer coincide), **When** the generator
   evaluates the candidate, **Then** the candidate is accepted.
3. **Given** a batch of newly-generated candidates (this feature's generation-time check only), **When** they
   are evaluated against this rule, **Then** every non-`forced_block` candidate containing a stray forced-block
   is rejected at generation time, consistent with Scenario 1. **Out of scope**: this feature does NOT sweep or
   remediate already-stored/previously-generated puzzles in the database — see "Out of Scope" section below.
   (This narrows an earlier draft of this scenario, which described a re-audit of previously-generated puzzles;
   the owner decided that remediation of already-stored puzzles is out of scope for this epic — new-generation
   prevention only.)

---

### User Story 3 - Any move that solves the puzzle is accepted, without weakening categories that require a unique answer (Priority: P1)

As a learner solving a puzzle whose category logically allows more than one winning answer (there are two
different winning moves, or two different moves that each create a fork), I want any one of those moves to be
accepted as correct — not just the one column the system happened to store — while puzzle categories that are
genuinely single-answer (there's exactly one correct move, or exactly one column to avoid) keep working exactly
as they do today. This must hold **everywhere the learner's move is judged**, including the client-side
Challenge screen, not only the server's `evaluatePredicate` path.

**Why this priority**: This is the single highest-value correctness fix in the epic: learners are currently
told they're wrong for playing a move that objectively solves the puzzle, which is the most damaging kind of
puzzle-quality bug (an incorrect "wrong" verdict on a correct answer). It must be scoped precisely so it does
not regress the categories whose correctness model is deliberately single-answer. It is worthless if fixed only
on the server while the client-side Challenge screen (`src/screens/ChallengeScreen.jsx` line ~138) still
compares the learner's move directly against the stored `correctCol` and never consults the server's
accepted-answer set — so this story explicitly covers both seams. **`SocraticScreen.jsx`'s own bare
`col === correctCol` comparison (line ~78) is a real bypass but is not part of this story's scope**: its
`lesson.socratic` record is hand-authored single-teaching-move content with no `category` field and no
accepted-answer *set* to source from (confirmed by direct read, not assumed — see plan.md research.md R2), so
there is nothing for it to consult even if it were rewired.

**Independent Test**: For each puzzle category, construct (or pull from existing verified fixtures) one board
with more than one objectively valid answer where such a board is possible for that category, and one board
with a single valid answer; confirm the generator's acceptance and the solver's per-move verdict match each
category's documented correctness model. Additionally, drive the same boards through the client-side
Challenge screen and confirm every valid answer column is accepted there too, not only the canonical stored
column.

**Acceptance Scenarios**:

1. **Given** a board that qualifies for `double_threat` and has two distinct columns that each create a fork,
   **When** the puzzle is generated, **Then** the candidate is accepted with both columns recorded as valid
   answers (not rejected for having more than one solution).
2. **Given** a generated `double_threat` puzzle with two valid fork columns, **When** a learner plays either
   one, **Then** both are scored as correct.
3. **Given** the same `double_threat` puzzle, **When** a learner plays a column that does not create a fork,
   **Then** it is scored as wrong.
4. **Given** a board that qualifies for `immediate_threat` or `forced_block` with more than one column that
   independently solves it, **When** the puzzle is generated and later solved, **Then** every solving column is
   accepted, consistent with scenario 1–3 above.
5. **Given** an `undercut` puzzle, **When** a learner plays the column that would reactivate the opponent's
   dead ("undercut") threat, **Then** it is still scored as wrong, exactly as before this change.
6. **Given** a `claimeven`, `overcut`, or `z_threat` puzzle — each of which has exactly one correct column by
   its own definition — **When** a learner plays any column other than that one, **Then** it is still scored
   as wrong, exactly as before this change.
7. **Given** a multi-solution puzzle (`immediate_threat`, `forced_block`, or `double_threat`) rendered on the
   client-side Challenge screen, **When** a learner plays any column that is in the puzzle's accepted-answer
   set but is not the stored canonical `correctCol`, **Then** the client scores it correct (the screen no
   longer relies on a bare `col === correctCol` comparison for these categories).

**Scope note**: "Any move that solves the puzzle is accepted" is deliberately a *narrow, per-category* rule —
it applies only where the category's own correctness model is multi-solution
(`immediate_threat`, `forced_block`, `double_threat`). It intentionally narrows this file's earlier
top-level framing of a blanket acceptance rule for these two reasons: (1) for the unique-answer categories
(`claimeven`, `overcut`, `z_threat`) a blanket "any solving column" rule is a no-op — their correctness model
has exactly one right answer by definition — and (2) for `undercut`, an "any-move" rule would invert the
category, since `undercut`'s correct answers are defined by *avoiding* a column, not by generating a pattern.
FR-013 and FR-014 exist specifically to keep those categories' existing single-answer/avoid-the-pattern models
untouched.

**Resolved during planning**: the client-side fix targets `ChallengeScreen.jsx` only. `SocraticScreen.jsx` was
traced and found to have no `category`/accepted-answer-set concept on its `lesson.socratic` data — see this
story's "Why this priority" note and plan.md research.md R2 for the empirical routing trace that settled this.

---

### User Story 4 - Threat-simplification detectors for Allen's T1–T7 rules (Priority: P2)

As the puzzle content pipeline, I want programmatic detectors for Allen's T1–T7 rules so the pipeline has a
verified implementation of each rule available when reasoning about a board's threats, instead of ad hoc
reasoning about which threats resolve a position.

Each T-rule is, per its knowledge-base `formal_predicate` (e.g. `allen-t1.md`'s
`t1_winner(threats) -> (player, col) | None`), a **threat-simplification rule**: it takes a *set of threats*
already present on a board and returns which player wins and on which column, or `None` if the rule doesn't
apply — it does **not** take a board and produce a different board. There is no board-transformation or
board-mutation step anywhere in T1–T7; "applying" a T-rule means evaluating this function against a threat set
extracted from an existing board.

**How this is used in the pipeline**: T1–T7 sit upstream of the V1–V5 win/loss/draw evaluation described in
User Story 5. The intended data flow is "extract the full threat set from a board, run it through the
applicable T1–T7 simplification(s), then feed the simplified threat set into V1–V5 to determine the
game-theoretic outcome" — T1–T7 reduce a raw threat set to the subset of threats that actually decide the
game, which is what makes V1–V5's win/loss/draw reasoning tractable. This story does not use T1–T7 to
generate net-new candidate boards for the sampler; that would require a board-mutation model these rules do
not have.

**Why this priority**: This gives the pipeline a verified detector for each of the seven rules, which User
Story 5's V1–V5 evaluation depends on as an input-simplification step. It is not correcting an existing
player-facing bug — it depends on User Stories 1–3 landing first so new puzzles inherit correct color-casting
and acceptance behavior.

**Independent Test**: Run each T-rule detector against its knowledge-base worked example's threat set and
confirm it returns the documented `(player, col)` winner (or `None`). **Note**: this story's Acceptance
Scenario 3 (feeding a T-rule-simplified threat set into the V1–V5 evaluation) is explicitly NOT covered by
this independent test — it requires User Story 5's V-rule operators to exist and is verified only once User
Story 5 lands (see Acceptance Scenario 3 below).

**Acceptance Scenarios**:

1. **Given** a threat set extracted from a board and one of the seven Allen T-rules, **When** the rule's
   detector evaluates that threat set, **Then** it returns the `(player, col)` winner or `None` exactly as
   Allen's rule specifies — no new board is produced or required.
2. **Given** a T-rule's knowledge-base entry with a worked example, **When** the detector is run against that
   same example's threat set, **Then** the detector reproduces the documented `(player, col)` result.
3. **Given** a board's simplified threat set (post T1–T7), **When** it is passed into the V1–V5 evaluation from
   User Story 5, **Then** the combined pipeline reproduces the documented outcome for boards where both a
   T-rule and a V-rule apply. **This scenario is not independently testable within User Story 4** — the V1–V5
   operators it depends on do not exist until User Story 5 ships; its verification lands with User Story 5
   (implemented as a single combined-pipeline task in that story's phase, not split across two phases).

---

### User Story 5 - Verified Allen-V rule operators for pattern coverage (Priority: P2)

As the puzzle content pipeline, I want reusable pattern-detection operators for all of the Allen-V rules
(V1 through V5) and both T4 variants (Case A and Case B), each backed by a solver-verified worked example in
the knowledge base, so puzzle curation and future categories can rely on programmatically-checked
implementations of these rules rather than ad hoc reasoning.

**Prerequisite — KB backfill**: V1, V2, V4, and V5 currently have a solver-verified movestring recorded only in
memory (`reference_verified_tactical_movestrings.md`), not in their own `docs/knowledge-base/` entries (those
entries currently say PENDING). Before any V1/V2/V4/V5 operator is implemented, this story backfills each
entry's `worked_examples` with its verified movestring, regenerating/re-verifying the fixture using the
project's `TOOLS/` scripts (notably `optimal_line.mjs`) and `server/gameSampling.js`'s `playGame` utility. As
part of this same backfill step, reconcile the disagreement between memory (which lists T4 Case B as PENDING)
and the knowledge base (which shows T4 Case B as solver-verified) by confirming the KB's verification directly
against a worked example, and correct whichever source is stale. Once backfilled, every operator in this story
(V1–V5, T4 Case A, T4 Case B) is sourced strictly from its own (now-verified) KB entry — none are implemented
from an unverified or memory-only source.

**Why this priority**: This extends pattern coverage using fixtures proven correct against the solver (after
the backfill step above), keeping risk low; it is scoped deliberately narrower than User Story 4 and depends on
nothing from it except consuming its detectors' simplified threat sets as input, as described in User Story 4.

**Independent Test**: For V1, V2, V4, and V5, first confirm the KB entry's `worked_examples` section contains
the backfilled, re-verified movestring. Then run each V-rule / T4 (Case A and Case B) operator against its own
knowledge-base worked example and confirm it classifies that example correctly; run it against the other
verified fixtures listed in the tactical-movestrings reference to confirm no regressions.

**Acceptance Scenarios**:

1. **Given** the knowledge-base worked example for V1, **When** the V1 operator evaluates it, **Then** it
   correctly identifies the pattern described in that entry.
2. **Given** the same test for V2, V3, V4, V5, T4 Case A, and T4 Case B, **When** each corresponding operator
   evaluates its own knowledge-base worked example, **Then** each correctly identifies its documented pattern.
3. **Given** the full set of previously solver-verified tactical fixtures, **When** they are re-classified
   after this change, **Then** they still classify exactly as before.
4. **Given** V1, V2, V4, or V5's knowledge-base entry before this story starts, **When** the backfill
   prerequisite runs, **Then** the entry's `worked_examples` section is updated to contain the same verified
   movestring currently recorded only in `reference_verified_tactical_movestrings.md`, re-verified via
   `optimal_line.mjs`/`playGame` rather than copied uncritically.

---

### Edge Cases

- A board qualifies for a multi-solution category (US3) but has more legal answer columns than the board has
  remaining columns to play (i.e., every legal column solves it) — the fix must still record all of them as
  acceptable, not just cap at some arbitrary count.
- A board simultaneously contains a genuine `forced_block` answer move *and* an unrelated, separate
  forced-block elsewhere on the board that is not reachable this turn (not gravity-top) — clarify whether
  "not yet playable" forced-blocks are exempt from the US2 rejection rule.
- A T1–T7 detector (US4) is evaluated against a threat set that does not correspond to any single coherent
  board (e.g. a synthetically assembled threat set used only for unit testing) — the detector's contract is
  defined purely over threat sets, so this is a valid input, not an error case; it must not be conflated with
  "board reachability," which does not apply to a threat-set-in/winner-out function.
- A V-rule/T4 example board (US5) coincides with a board already produced by plain random sampling — decide
  whether this is treated as a duplicate to discard or an acceptable overlap.
- A learner plays a valid alternate column on the client-side Challenge screen for a multi-solution category,
  and the screen's accepted-answer set (post-fix, per User Story 3) disagrees with the server's
  `evaluatePredicate` result for the same move — this must not happen; the client and server must derive their
  accepted-answer sets from the same source of truth for these categories.

## Requirements *(mandatory)*

### Functional Requirements

**Color casting (US1)**

- **FR-001**: The generator MUST require the learner-facing player in a generated `immediate_threat` puzzle to
  be the first player (green).
- **FR-002**: The generator MUST require the learner-facing player in a generated `forced_block` puzzle to be
  the second player (gray).
- **FR-003**: The generator MUST reject (not silently correct) any `immediate_threat` or `forced_block`
  candidate that would cast the learner as the wrong color for that category.
- **FR-004**: All learner-facing text describing the puzzle's colors MUST use "green" and "gray" and MUST NOT
  use "red" or "yellow."
- **FR-005**: This color-casting rule applies only to puzzle generation. It MUST NOT be applied to real-game
  (sparring) blunder detection or tagging, which is out of scope for this feature.

**No stray forced_block (US2)**

- **FR-006**: The generator MUST detect whether a candidate board (for any category other than
  `forced_block`) contains a forced-block situation.
- **FR-007**: If a detected forced-block's blocking column is different from the puzzle's intended answer
  move, the generator MUST reject the candidate.
- **FR-008**: If a detected forced-block's blocking column is the same as the puzzle's intended answer move,
  the generator MUST accept the candidate (the forced-block and the answer coincide).
- **FR-009**: The rule in FR-006–FR-008 MUST be precisely defined in terms of the generator's existing
  concepts (candidate board, answer/correct column(s), gravity-top reachability) so it is unambiguous which
  boards are rejected. *(See Clarifications — this definition is a settled decision below, not an open
  question.)*

**Multi-solution acceptance (US3)**

- **FR-010**: For the multi-solution categories `immediate_threat`, `forced_block`, and `double_threat` only,
  the generator MUST accept a candidate board whenever one or more legal columns independently satisfy the
  category's correctness condition — it MUST NOT require exactly one satisfying column.
- **FR-011**: For the same three categories, every column that independently satisfies the category's
  correctness condition MUST be recorded as a valid answer for that puzzle, not only the first one found.
- **FR-012**: The solve-time evaluator's `'tied'` outcome (an alternate column that also satisfies the
  category's condition) MUST be treated as an accepted / correct outcome wherever a learner's submitted move
  is judged for these three categories — not as `'wrong'`.
- **FR-013**: The `undercut` category's existing correctness condition — every legal column except the one
  that reactivates the opponent's dead threat is acceptable — MUST remain unchanged by this feature.
- **FR-014**: The `z_threat`, `overcut`, and `claimeven` categories' existing single-correct-column condition
  MUST remain unchanged by this feature.
- **FR-015**: Each corrected category's behavior MUST be validated against a full case-space (single-answer
  boards, multi-answer boards where applicable, and a counterexample per case) run through the production
  detection/evaluation code path — not validated only against the motivating example that revealed the bug.
- **FR-015a**: The client-side Challenge screen (`src/screens/ChallengeScreen.jsx`) MUST NOT judge a learner's
  move by a bare `col === correctCol` comparison for the multi-solution categories (`immediate_threat`,
  `forced_block`, `double_threat`); it MUST accept any column in that puzzle's accepted-answer set, sourced
  from the same server-computed answer set used by `evaluatePredicate`'s `'tied'`-as-correct behavior (FR-012),
  so the client and server never disagree on a given move for these categories. `SocraticScreen.jsx` is
  explicitly not covered by this requirement — its `lesson.socratic` data has no `category`/accepted-answer-set
  concept (see User Story 3's "Why this priority" note).
- **FR-015b**: The client-side fix in FR-015a MUST NOT change client-side scoring behavior for the
  single-answer categories (`undercut`, `overcut`, `claimeven`, `z_threat`) or for any category outside the
  three named in FR-010.

**Allen T1–T7 threat-simplification detectors (US4)**

- **FR-016**: The system MUST provide a detector for each of the seven Allen transformations (T1–T7), each
  implemented as a threat-set-in/winner-out function (`t*_winner(threats) -> (player, col) | None`), defined
  strictly from its `docs/knowledge-base/allen-t*.md` entry's `formal_predicate`.
- **FR-017**: Each T1–T7 detector's output MUST be exactly the `(player, col)` winner or `None` specified by
  its knowledge-base `formal_predicate` for a given threat set. There is no board-mutation or
  board-transformation step, and no board-reachability check applies to these detectors — their contract is
  defined purely over threat sets, not boards.
- **FR-018**: Each T1–T7 detector MUST be checked against the worked example in its own knowledge-base entry
  and MUST reproduce that documented `(player, col)` result.
- **FR-019**: The T1–T7 detectors MUST be composable as an input-simplification step feeding the V1–V5
  evaluation (User Story 5): given a board's extracted threat set, the pipeline MUST be able to run applicable
  T1–T7 detectors first and pass the simplified threat set into the V1–V5 operators, reproducing the documented
  outcome for boards where both a T-rule and a V-rule apply (per FR-022 and Acceptance Scenario 3 of User
  Story 4).

**Allen-V rule / T4 (Case A and Case B) operators (US5)**

- **FR-020**: The system MUST provide an operator for each of Allen's V1–V5 rules and both T4 variants (Case A
  and Case B), each defined strictly from its own `docs/knowledge-base/` entry (V1–V5 and T4 entries
  respectively), once that entry's `worked_examples` are backfilled per the User Story 5 prerequisite.
- **FR-020a** *(prerequisite)*: For each of V1, V2, V4, and V5, the currently memory-only verified movestring
  (`reference_verified_tactical_movestrings.md`) MUST be backfilled into that rule's own KB entry
  `worked_examples`, re-verified via `TOOLS/optimal_line.mjs` and `server/gameSampling.js`'s `playGame` rather
  than copied uncritically. The KB-vs-memory disagreement on T4 Case B's verification status MUST be
  reconciled (confirmed against a worked example) as part of this same step, before implementing an operator
  for it.
- **FR-021**: The system MUST NOT implement operators for any Allen rule outside the approved set for this
  feature — T1–T7 (User Story 4), V1–V5, T4 Case A, and T4 Case B (User Story 5) — and MUST NOT implement an
  operator for any V1/V2/V4/V5/T4-Case-B rule until FR-020a's backfill/reconciliation for that rule is complete.
- **FR-022**: Each V-rule / T4 (Case A or Case B) operator MUST be checked against its own knowledge-base
  worked example and MUST reproduce that documented result.
- **FR-023**: Every existing tactical movestring already verified against the production detector (per the
  project's tactical-movestrings reference) MUST continue to classify identically after this feature ships.

### Key Entities

- **Candidate board**: A sampled board position under evaluation for qualifying as a puzzle in a given
  category, along with the category-specific answer column(s) computed for it and its color-casting (which
  player is the learner).
- **Puzzle category**: One of the existing categories (`immediate_threat`, `forced_block`, `double_threat`,
  `undercut`, `overcut`, `claimeven`, `z_threat`, plus others unaffected by this feature), each with its own
  correctness model: accept-any-generating-column (multi-solution), avoid-the-pattern (e.g. `undercut`), or
  unique-answer (e.g. `claimeven`, `overcut`, `z_threat`).
- **Answer column set**: The set of one or more board columns considered a correct response for a given
  puzzle, as computed at generation time and re-derivable at solve time.
- **Forced-block situation**: A board state in which one player is compelled to play a specific column to
  prevent the opponent's immediate win; relevant both as its own puzzle category and as a distracting element
  that must not appear unrelated in other categories' puzzles.
- **Allen transformation (T1–T7)**: A knowledge-base-defined threat-simplification rule
  (`t*_winner(threats) -> (player, col) | None`) that reduces a set of threats already present on a board to
  the winner they decide, used as an input-simplification step feeding the V1–V5 evaluation — not an operator
  that produces a new board.
- **Allen-V rule / T4 (Case A, Case B)**: A knowledge-base-defined tactical pattern with a solver-verified
  worked example (after the User Story 5 backfill for V1/V2/V4/V5/T4-Case-B), used as a pattern-detection
  operator over a board's (possibly T1–T7-simplified) threat set.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of a sampled batch of newly generated `immediate_threat` puzzles cast the learner as green,
  and 100% of a sampled batch of newly generated `forced_block` puzzles cast the learner as gray.
- **SC-002**: 0% of a sampled batch of newly generated non-`forced_block` puzzles contain a forced-block
  situation whose blocking column is not the puzzle's answer move.
- **SC-003**: For `immediate_threat`, `forced_block`, and `double_threat` puzzles with more than one
  objectively valid answer column, learners are scored correct on 100% of those valid columns (not only the
  one stored as canonical) — **both** on the server (`evaluatePredicate`) **and** on the client-side Challenge
  screen (FR-015a).
- **SC-004**: `undercut`, `claimeven`, `overcut`, and `z_threat` puzzle scoring behavior is unchanged for 100%
  of a fixed regression set of existing verified boards for those categories, on both server and client.
- **SC-005**: Every implemented Allen T1–T7 detector and every implemented V-rule/T4 (Case A and Case B)
  operator reproduces its knowledge-base worked example on the first verification run, with zero operators
  implemented outside the approved set for this feature (T1–T7, V1–V5, T4 Case A, T4 Case B), and V1/V2/V4/V5/
  T4-Case-B operators are implemented only after their KB-backfill/reconciliation prerequisite (FR-020a) is
  complete.
- **SC-006**: 100% of the existing solver-verified tactical movestrings (per the project's tactical-fixtures
  reference) classify identically before and after this feature ships.

## Assumptions

- The generation-time (`candidate-generator.js`) and solve-time (`predicates.js`) predicate functions
  currently in the codebase are the authoritative, current implementation to audit against — this feature
  corrects their acceptance-path behavior; it does not redesign the per-category correctness model from
  scratch.
- "Answer move is the forced block" (US2/FR-006–009) is defined as: the forced-block's blocking column is
  identical to the column already computed as the puzzle's intended answer for its actual category. A
  forced-block that is not gravity-top (not immediately playable this turn) is treated as not yet a live
  distraction and does not trigger rejection under this rule; this scoping is a settled decision for this
  feature, not left open for `/speckit-clarify`.
- The client-side Challenge screen's direct `col === correctCol` comparison, which bypasses the server's
  `evaluatePredicate`/`'tied'` path entirely, is pulled **into scope** for this feature (FR-015a/FR-015b) so
  that SC-003's "learners are scored correct on 100% of valid columns" promise holds universally, not only on
  the server. `SocraticScreen.jsx`'s equivalent bypass was traced and found non-applicable (no `category`/
  accepted-answer-set concept on its data) — see User Story 3.
- Real-game (sparring) blunder detection/tagging is entirely out of scope; the color-casting rule in US1
  applies to generated puzzles only.
- Allen T1–T7 are threat-simplification detectors (threat-set-in, `(player, col)`-winner-out), not
  board-mutation operators; they are scoped in this feature to feeding the V1–V5 evaluation as an
  input-simplification step (User Story 4). They are not used in this feature to generate net-new candidate
  boards for the sampler, since they have no board-mutation model to do so — widening the candidate pool via a
  distinct board-generation mechanism is not part of this feature and may be considered separately later.
- All seven Allen transformations (T1–T7) and all of V1–V5, T4 Case A, and T4 Case B are solver-verified in the
  knowledge base (V1/V2/V4/V5/T4-Case-B via the FR-020a backfill/reconciliation prerequisite in this feature)
  — there is no deferred T-rule or V-rule remaining in scope for this feature; every one of T1–T7, V1–V5, T4
  Case A, and T4 Case B is implemented.
- No new puzzle categories, no reason-engine changes, and no UI changes beyond the color-casting/text
  correction in US1 and the client-side scoring fix in US3 are introduced by this feature.

## Out of Scope

- Real-game (sparring) blunder color-casting rules.
- Any change to `server/scripts/reason_engine/` or the blunder-`reason` feature-vector engine.
- New player-facing puzzle categories.
- Using Allen T1–T7 to generate net-new candidate boards for the sampler (they have no board-mutation model;
  see Assumptions).
- De-duplication/canonicalization of equivalent boards via Allen transformations.
- Remediating already-stored/previously-generated puzzles that contain a stray forced-block (US2). This
  feature's US2 fix is new-generation-prevention only; no DB sweep or backfill task is in scope. (Owner
  decision — see User Story 2, Acceptance Scenario 3.)
