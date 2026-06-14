# Feature Specification: Patterns → Blunders Epic 1 — Schema + Core Algorithm

**Feature Branch**: `023-patterns-blunders-epic1`
**Created**: 2026-06-05
**Status**: Draft

---

## Overview

Epic 1 builds the schema foundation and core tagging engine for the three-layer Patterns → Blunders → Challenges model. It introduces two new server-side functions (`classifyPattern` and `tagBlunder`), updates the `blunders` DB table with three new schema changes (updated CHECK constraint, `reason` column, `direction` column), and runs mandatory pre-deploy audits. No production call sites are wired in this epic — that is Epic 2's scope.

**Epic dependency**: Epic 2 (production wiring) cannot begin until this epic lands.

---

## Settled Decisions (Do Not Re-Derive)

- **Storage gate is independent of tagging.** `tagBlunder` runs after the blunder is confirmed by `scoreMove()`; whether a named pattern matches does not affect whether the row is stored.
- **Tag describes the situation, not the cure.** A blunder is tagged with the pattern the player *was in or created*, not with what the correct move builds afterward.
- **`unknown` is not a valid tag.** Any unmatched blunder falls through to `suboptimal_move`.
- **`tagBlunder` never throws.** On solver exception it resolves to `{ tag: 'suboptimal_move', direction: 'missed_own', reason: 'solver error: <message>' }`. On a degenerate/terminal position detected without an exception it resolves to `{ tag: 'suboptimal_move', direction: 'missed_own', reason: 'degenerate position: <description>' }`. These two reason prefixes are distinct and MUST NOT be merged.
- **Anon write prohibition.** `blunders.user_id` is `NOT NULL` at the DB level (migration 027 constraint). The client-side skip for anonymous users is not a workaround for a nullable column — it matches a real DB constraint.
- **Non-challenge tags are stored.** `forced_win`, `drawing_move`, and `suboptimal_move` are stored in `blunders` like any other tag. They are excluded from challenge-set matching only; never dropped at insert time.
- **`forced_win` tag ≠ `forced_win` puzzle category.** The blunder tag means "solver confirmed the player had a forced win." The puzzle category labels a multi-move learner exercise. They share a name; they are distinct concepts.
- **i18n entries already present.** No i18n work is required by this epic. Entries for `undercut`, `overcut`, `odd_even_threat`, and `claimodd` already exist in `en.json`.

---

## Non-Obvious Facts (Must Be Encoded)

1. **`classifyPattern` does not exist.** `rg classifyPattern server/` returns nothing. This is a brand-new function. `classifyAll` (at `classifier.js:1217`) and `classifyBestMove` (at `:1245`) are related but distinct — neither is retired in this epic. Both must be audited before any retirement decision (deferred to Epic 2).

2. **`blunders.user_id` is `NOT NULL`.** Enforced at the DB level. Anonymous writes are blocked by the DB, not just by application logic.

3. **Removing `unknown` from the CHECK constraint is a breaking change.** Any existing code that inserts `pattern_category = 'unknown'` will fail the moment the migration applies. A pre-deploy ripgrep audit of server code is a hard prerequisite.

4. **`forbidden_columns` stays in the constraint.** It is a live tag emitted today by `classifier.js` and both import scripts. The new tagger naturally stops emitting it (replacing it with `immediate_threat`). The tag stays valid in the constraint as a legacy-tolerated value. Do NOT patch callsites that currently emit `forbidden_columns` — they will drain naturally.

5. **Truncate strategy.** `TRUNCATE blunders;` is folded into the top of migration (a)'s SQL file. PostgreSQL validates existing rows when a new CHECK constraint is added; any existing `unknown` rows cause the migration to fail. Placing the TRUNCATE inside migration (a) makes it impossible to forget or mis-order. All existing blunder rows are intentionally discarded; they will be regenerated in Epic 2's reprocess-all-games step. There is no separate runbook step or script for truncation.

6. **`direction` column values are free-text TEXT.** Do NOT add a CHECK constraint on the `direction` column. Known values are `'missed_own'`, `'enabled_opponent'`, `'defensive_miss'` — but the column is deliberately unconstrained to allow future extensions without a migration.

7. **No per-call query budget or timeout.** `classifyPattern` is called from `tagBlunder` on the lazy post-game analyze path (never blocks the UI). `detectClaimeven` may run up to 60 solver queries per invocation; this cost is acceptable.

8. **`classify()` puzzle-generation path is frozen.** The existing `classify(moves, candidateCol, scores)` function must not change behavior. Detectors that gain a `perspective` parameter must use `Board.currentPlayer(ms)` as default so all existing callers in `classify()` are unaffected.

---

## User Scenarios & Testing

### User Story 1 — Blunder Gets a Named Tag Instead of `unknown` (Priority: P1)

A developer runs the server's post-game analysis path. After `scoreMove()` confirms a blunder, `tagBlunder` is called. The returned `{ tag, direction, reason }` object names the tactical pattern the player missed or enabled — never `unknown`. The tag and reason are available for insertion into `blunders.pattern_category` and `blunders.reason`.

**Why this priority**: This is the core deliverable of Epic 1. Without it, Epic 2 cannot wire `tagBlunder` into production, and blunder data remains untagged.

**Independent Test**: Call `tagBlunder` with a known blunder position (e.g., a position where Red has `double_threat` before playing) and assert the returned tag is `double_threat`, direction is `missed_own`, and reason contains `"matched missed_own: double_threat"`.

**Acceptance Scenarios**:

1. **Given** a movestring where the blunderer held `double_threat` before playing and the pattern is gone after, **When** `tagBlunder(moves, playedCol, correctCol, solver)` is called, **Then** it returns `{ tag: 'double_threat', direction: 'missed_own', reason: 'matched missed_own: double_threat' }`.

2. **Given** a movestring where the opponent gains `immediate_threat` after the blunderer plays, **When** `tagBlunder` is called, **Then** it returns `{ tag: 'immediate_threat', direction: 'enabled_opponent', reason: 'matched enabled_opponent: immediate_threat' }`.

3. **Given** a movestring where the blunderer was about to be beaten (`forced_block` pre-move) and played elsewhere, **When** `tagBlunder` is called, **Then** it returns `{ tag: 'forced_block', direction: 'defensive_miss', reason: 'matched defensive_miss: forced_block' }`.

4. **Given** a position where `solver.score(moves) > 0` (blunderer was winning) and `solver.score(moves + playedCol) === 0` (position is now a draw), and no named pattern fires, **When** `tagBlunder` is called, **Then** it returns `{ tag: 'drawing_move', direction: 'missed_own', reason: 'win dropped to draw, no pattern detected' }`.

5. **Given** no named pattern and no score-based case, **When** `tagBlunder` is called, **Then** it returns `{ tag: 'suboptimal_move', direction: 'missed_own', reason: 'no pattern detected' }`.

---

### User Story 2 — `tagBlunder` Resolves on Solver Failure Without Throwing (Priority: P1)

A developer triggers `tagBlunder` in an environment where the solver times out or returns an error. The call resolves to a safe fallback rather than crashing the analysis pipeline.

**Why this priority**: The pipeline is fire-and-forget; an unhandled rejection would silently corrupt blunder data and break the analysis path.

**Independent Test**: Inject a mock solver that always rejects. Call `tagBlunder`. Assert it resolves (not rejects) with `{ tag: 'suboptimal_move', direction: 'missed_own' }` and a reason string starting with `"solver error:"`.

**Acceptance Scenarios**:

1. **Given** a solver that throws on every query, **When** `tagBlunder` is called, **Then** it resolves (does not throw/reject) with `tag: 'suboptimal_move'` and `reason` beginning with `"solver error:"`.

2. **Given** a degenerate position (e.g., terminal board), **When** `tagBlunder` is called, **Then** it resolves with `tag: 'suboptimal_move'` and `reason` beginning with `"degenerate position:"` (distinct from a solver exception).

---

### User Story 3 — DB Rejects `unknown` Tag; Accepts All New Tags (Priority: P2)

A developer attempts to insert a blunder row. The database enforces the new CHECK constraint — `unknown` is rejected at the DB level, while all new tags (`drawing_move`, `suboptimal_move`, `forced_win`, `odd_even_threat`, `claimodd`) are accepted. `forbidden_columns` remains accepted as a legacy-tolerated value.

**Why this priority**: The constraint migration gates all tagging work. Without it, new tags cannot safely be inserted.

**Independent Test**: Attempt `INSERT INTO blunders (pattern_category, ...) VALUES ('unknown', ...)` and assert it fails with a constraint violation. Attempt the same with `'drawing_move'` and assert it succeeds.

**Acceptance Scenarios**:

1. **Given** the updated CHECK constraint is applied, **When** `INSERT INTO blunders ... VALUES ('unknown', ...)` is executed, **Then** the DB returns a constraint violation error.
2. **Given** the updated CHECK constraint is applied, **When** `INSERT INTO blunders ... VALUES ('forbidden_columns', ...)` is executed, **Then** the insert succeeds.
3. **Given** the updated CHECK constraint is applied, **When** `INSERT INTO blunders ... VALUES ('drawing_move', ...)` is executed, **Then** the insert succeeds.
4. **Given** the `reason` and `direction` columns are added, **When** `INSERT INTO blunders (pattern_category, reason, direction, ...) VALUES ('suboptimal_move', 'no pattern detected', 'missed_own', ...)` is executed, **Then** the insert succeeds.

---

### User Story 4 — `classifyPattern` Evaluates Any Player's Patterns at Any Position (Priority: P2)

A developer calls `classifyPattern(ms, perspective, solver)` with an explicit player perspective and an injected solver handle. The function returns the full set of pattern tags held by that player at position `ms`, regardless of whose turn it is.

**Why this priority**: `classifyPattern` is the building block `tagBlunder` depends on. Without it, the cascade cannot be implemented.

**Independent Test**: Call `classifyPattern` with a known position where Yellow (player 2) has `claimeven`, using `perspective = 2` and an injected solver. Assert `'claimeven'` appears in the returned Set. Verify `classify()` still behaves identically for puzzle-generation calls (no behavioral change).

**Acceptance Scenarios**:

1. **Given** a position where Yellow holds `claimeven`, **When** `classifyPattern(ms, 2, solver)` is called, **Then** `'claimeven'` is in the returned Set and `'claimeven'` does not appear for a Red perspective call on the same position.
2. **Given** any position, **When** `classifyPattern(ms, perspective, solver)` is called, **Then** the returned Set never contains `'unknown'`.
3. **Given** a call to `classify(moves, candidateCol, scores)` before and after the perspective retrofit, **Then** the return value is identical (no behavioral change to the puzzle-generation path).

---

### Edge Cases

- What happens when `tagBlunder` is called with a terminal position (game already won)? → Detected without a solver exception; resolves with `reason` beginning `"degenerate position: <description>"` and `tag: 'suboptimal_move'`. Does not throw.
- What happens when both `missed_own` and `enabled_opponent` fire for the same blunder? → `missed_own` takes precedence (Priority cascade step 3 before step 4).
- What happens when a Red-only pattern (`odd_even_threat`, `claimodd`) appears in a Yellow-perspective classification result? → Treated as a detector bug; an assertion fires in tests.
- What happens when a Yellow-only pattern (`claimeven`) appears in a Red-perspective classification result? → Treated as a detector bug; an assertion fires in tests.
- What happens when `TRUNCATE blunders` is run and Epic 2 has not yet reprocessed games? → Blunder table is empty. Analytics queries return zero rows. Acceptable interim state; Epic 2 reprocess-all-games step repopulates.
- What happens if a live callsite is found inserting `'unknown'` after the pre-deploy audit? → Patch that callsite to fall through to `'suboptimal_move'` before the migration runs.

---

## Requirements

### Functional Requirements — Pre-Deploy Audits

- **FR-001**: Before any migration runs, the implementer MUST run `rg "'unknown'" server/scripts/ server/index.js` and enumerate every callsite inserting `pattern_category`. IF any live callsite inserts `'unknown'`, THEN it MUST be patched to use `'suboptimal_move'` before the migration applies.
- **FR-002**: Before any migration runs, the implementer MUST run `rg "'forbidden_columns'" server/scripts/ server/index.js` and document callsites. These callsites are NOT patched.
- **FR-003**: Before implementing `classifyPattern`, the implementer MUST enumerate every entry in `DETECTOR_REGISTRY` (via `rg 'DETECTOR_REGISTRY' server/`) and produce a two-column table: detectors that already accept a `perspective` parameter vs. those that derive perspective from `ms` alone and need the parameter added.
- **FR-004**: Before retiring any function, the implementer MUST run `rg classifyAll server/` and `rg classifyBestMove server/` and document all callers. Neither function is retired in this epic.

### Functional Requirements — Data Migration

- **FR-005**: `TRUNCATE blunders;` MUST appear at the top of migration (a)'s SQL file, before the CHECK constraint is dropped and re-created. This makes the truncation atomic with the constraint change and impossible to forget or mis-order. (PostgreSQL validates existing rows at `ADD CONSTRAINT` time; the table must be empty for the migration to succeed.)
- **FR-006**: Migration (a) MUST drop the existing `blunders_pattern_category_check` constraint and re-create it as:
  ```sql
  CHECK (pattern_category IN (
    'immediate_threat', 'forced_block', 'forced_win', 'double_threat',
    'undercut', 'overcut', 'figure_7', 'j_shape', 'z_threat',
    'odd_even_threat', 'claimeven', 'claimodd',
    'drawing_move', 'suboptimal_move',
    'forbidden_columns'
  ))
  ```
  `unknown` is excluded. `forbidden_columns` is retained as a legacy-tolerated value.
- **FR-007**: Migration (b) MUST add a nullable `reason TEXT` column to the `blunders` table. No index required.
- **FR-008**: Migration (c) MUST add a nullable `direction TEXT` column to the `blunders` table. No CHECK constraint on its values. No index required.
- **FR-009**: Migrations (a), (b), and (c) MUST be sequenced: (a) [which opens with the truncation] → (b) → (c). They are NOT parallelizable. There is no separate truncation step — it is folded into (a).

### Functional Requirements — `classifyPattern`

- **FR-010**: A new exported function `classifyPattern(ms, perspective, solver)` MUST be created in `server/classifier.js`. It MUST NOT be placed in a separate module. (Direct co-location with `DETECTOR_REGISTRY` avoids circular-import risk and is the honest coupling; the file will grow but that is acceptable.) This function does not exist today. **Note**: the authoritative source doc describes a 2-argument `classifyPattern(ms, perspective)` assuming an implicit module-singleton solver. That signature is deliberately rejected here because it is incompatible with the mock-solver tests this spec mandates (T-003 through T-005). The 3-argument form is canonical.
- **FR-011**: `classifyPattern` MUST return `Promise<Set<string>>` — the full set of pattern tags held by `perspective` at position `ms`. The `solver` argument MUST be threaded into every detector call that needs it (e.g., `detectClaimeven`).
- **FR-012**: `classifyPattern` MUST run all detectors in `DETECTOR_REGISTRY` with `perspective` as the explicit evaluating player, regardless of whose turn it is in `ms`.
- **FR-013**: Every detector in `DETECTOR_REGISTRY` that currently derives perspective from `ms` alone MUST be updated to accept an explicit `perspective` parameter (default: `Board.currentPlayer(ms)`). Detectors that already accept `perspective` are unchanged.
- **FR-014**: The default behavior of each retrofitted detector MUST be identical to its pre-retrofit behavior when called without a `perspective` argument (i.e., `Board.currentPlayer(ms)` is used).
- **FR-015**: The existing `classify(moves, candidateCol, scores)` function MUST NOT change behavior after the perspective retrofit. All existing callers pass no `perspective` argument; the default must preserve current behavior exactly.
- **FR-016**: `classifyPattern` MUST NOT include `'unknown'` in any returned Set.
- **FR-017**: `detectClaimeven` MAY issue up to 60 `solver.query` calls per `classifyPattern` invocation. No per-call query budget or wall-clock timeout is imposed. The solver handle used is the one passed to `classifyPattern` as its third argument.

### Functional Requirements — `tagBlunder`

- **FR-018**: A new exported function `tagBlunder(moves, playedCol, correctCol, solver)` MUST be created in `server/classifier.js`. It MUST thread its `solver` handle into every `classifyPattern(ms, perspective, solver)` call (i.e., `P(ms, player)` always passes the same solver handle `tagBlunder` received).
- **FR-019**: `tagBlunder` MUST return `Promise<{ tag: string, direction: 'missed_own' | 'enabled_opponent' | 'defensive_miss', reason: string }>`.
- **FR-020**: `tagBlunder` MUST implement the 5-step priority cascade exactly as specified:
  1. **Defensive miss** — `forced_block ∈ P(moves, blunderer)` → `{ tag: 'forced_block', direction: 'defensive_miss', reason: 'matched defensive_miss: forced_block' }`
  2. **Enabled immediate (1-ply)** — `immediate_threat ∈ P(moves + playedCol, opponent)` → `{ tag: 'immediate_threat', direction: 'enabled_opponent', reason: 'matched enabled_opponent: immediate_threat' }`
  3. **Missed own** — from `{ T : missed(T) }`, priority-pick: `immediate_threat > forced_win > double_threat > z_threat > odd_even_threat > figure_7 > j_shape > overcut > claimeven > claimodd`
  4. **Enabled opponent (2-ply)** — from `{ T : enabled_opp(T) } ∪ { undercut : enabled_self(undercut) }`, priority-pick: `forced_win > double_threat > z_threat > odd_even_threat > figure_7 > j_shape > undercut > claimeven > claimodd`
  5. **Score-based fallbacks** — issue two solver score queries: `preScore = solver.score(moves)` (score from blunderer's perspective, since blunderer is the current player at `moves`) and `postScore = solver.score(moves + playedCol)` (score from opponent's perspective after the blunder). If `preScore > 0` (blunderer was winning) AND `postScore === 0` (position is now a draw): `{ tag: 'drawing_move', direction: 'missed_own', reason: 'win dropped to draw, no pattern detected' }`; else: `{ tag: 'suboptimal_move', direction: 'missed_own', reason: 'no pattern detected' }`. Note: c4solver scores are always from the perspective of the player to move at the given position — no explicit player argument is needed for this check.
- **FR-021**: `tagBlunder` MUST derive `blunderer` from move count parity of `moves` (even count → Red/player 1; odd count → Yellow/player 2). `opponent` is the other player.
- **FR-022**: `tagBlunder` MUST compute `after_blunder = moves + playedCol + bm(moves + playedCol)` and `after_correct = moves + correctCol + bm(moves + correctCol)`, each requiring one solver query for `bm()`.
- **FR-023**: `tagBlunder` MUST NEVER throw or reject. Two distinct failure branches apply:
  - **Solver exception**: if any `solver.score()` or `solver.query()` call throws, catch the exception and resolve with `{ tag: 'suboptimal_move', direction: 'missed_own', reason: 'solver error: <message>' }` where `<message>` is the caught error's message.
  - **Degenerate/terminal position**: if the board is detected as terminal (game already won or drawn at entry) without a solver exception, resolve with `{ tag: 'suboptimal_move', direction: 'missed_own', reason: 'degenerate position: <description>' }` where `<description>` characterises the condition (e.g. `"board is already won"`).
  These two branches MUST NOT be collapsed into a single string prefix — the stored `reason` field is human-inspectable and the distinction matters.
- **FR-024**: `tagBlunder` MUST use `enabled_self(undercut)` (not `enabled_opp(undercut)`) when checking if the blunderer gained undercut exposure — the undercut tag names the blunderer's experience.
- **FR-025**: `tagBlunder` MUST NOT tag `overcut` via the enabled-opponent direction. `enabled_opp(overcut)` is the same event as `enabled_self(undercut)` — tag as `undercut` when this scenario fires (no double-counting).

### Functional Requirements — Player-Only Guards

- **FR-026**: The following patterns are Red-only: `odd_even_threat`, `claimodd`. If `classifyPattern` is called with `perspective = Yellow (2)` and either pattern appears in the result set, this is a detector bug. Tests MUST assert this guard (see Tests section).
- **FR-027**: `claimeven` is Yellow-only. If `classifyPattern` is called with `perspective = Red (1)` and `claimeven` appears in the result set, this is a detector bug. Tests MUST assert this guard.

### Functional Requirements — Score-Consuming Detector Perspective

- **FR-033**: Score-consuming detectors (`detectForcedWin`, `detectForbiddenColumns`, `detectForcedBlock`, `detectZThreat`, `detectOddEvenThreat`) read raw solver `scores` which are always signed relative to the player to move at position `ms`, not the explicit `perspective` argument. These detectors MUST implement a two-step perspective contract:
  - **When `perspective === board.currentPlayer`**: apply the score-based predicate directly (scores are correctly signed for `perspective`). This is the existing logic.
  - **When `perspective !== board.currentPlayer`** (opponent of `perspective` is to move): iterate over all playable columns `c` for the current player; for each `c`, query fresh scores via `await solver.query(board.movestring + c)` and call the detector recursively on `new Board(board.movestring + c)` with the same `perspective`; return `true` iff ALL playable columns return `true`. The recursive call always bottoms out in the first case (after one half-move, it is `perspective`'s turn and scores are correctly signed).
  - A simple sign flip (`max(-scores) > 0`) is NOT a valid substitute: it detects "at least one of the current player's moves is bad," which is too weak. For `forced_win`, this produces false positives whenever the current player has even one escape column.
  - Each of these five detectors MUST accept `solver` as an additional parameter (e.g., `solver = null`) to enable the recursive step. Existing callers that omit `solver` are unaffected because the recursive branch fires only when `perspective !== board.currentPlayer`, which never occurs in the existing `classify()` path (which always passes the current player as `perspective` via the default).

### Functional Requirements — Out of Scope

- **FR-028**: The existing `classify(moves, candidateCol, scores)` function MUST NOT be modified beyond accepting the `perspective` default in the detectors it calls.
- **FR-029**: `classifyAll` and `classifyBestMove` MUST NOT be deleted in this epic.
- **FR-030**: Call sites in `import_papergames_blunders.mjs`, `reprocess_blunders.mjs`, and `server/index.js` MUST NOT be updated to call `tagBlunder` in this epic (Epic 2 scope).
- **FR-031**: No changes to the challenge pipeline, challenge-set matching, or any frontend code.
- **FR-032**: No i18n changes.

### Key Entities

- **Pattern**: A board condition predicate over `(position, player)`. Identified by a slug string. Can belong to both players (most) or only one (Red-only: `odd_even_threat`, `claimodd`; Yellow-only: `claimeven`).
- **Blunder**: A record of a player's mistake. Has `tag` (pattern slug), `direction` (`missed_own` | `enabled_opponent` | `defensive_miss`), and `reason` (human-readable explanation). Stored in `blunders` table after Epic 2 wires the call sites.
- **`blunderer`**: The player who made the blunder. Derived from `moves.length % 2 === 0 ? 1 : 2`.
- **`P(ms, player)`**: Shorthand for `classifyPattern(ms, player, solver)` where `solver` is the handle `tagBlunder` received. Returns the full pattern Set.
- **`bm(ms)`**: Best-move function — `argmax(solver.query(ms))` with lowest-index tie-break. Requires one solver query.
- **`missed(T)`**: `T ∈ P(moves, blunderer) ∧ T ∉ P(moves + playedCol, blunderer)`.
- **`enabled_opp(T)`**: `T ∈ P(after_blunder, opponent) ∧ T ∉ P(after_correct, opponent)`.
- **`enabled_self(T)`**: `T ∈ P(after_blunder, blunderer) ∧ T ∉ P(after_correct, blunderer)`.

---

## Tests

All test movestrings MUST be sourced from the DB, git history, or the knowledge base. Never invent a movestring by hand.

- **T-001 (unit)**: For each per-pattern predicate direction (missed-own, enabled-opponent, defensive-miss), provide at least one concrete movestring from existing sources and assert the correct `tag` and `direction` are returned.
- **T-002 (integration)**: For a position where both `missed_own` and `enabled_opponent` fire, assert the result tag comes from the `missed_own` path (step 3 precedes step 4).
- **T-003 (unit)**: `tagBlunder` with a mock solver that rejects every call resolves with `{ tag: 'suboptimal_move', direction: 'missed_own' }` and `reason` starting with `"solver error:"`. Assert it does not throw or reject. The mock solver is injected as the 4th argument to `tagBlunder`; it propagates automatically into `classifyPattern` via FR-018.
- **T-004 (unit)**: Calling `classifyPattern(ms, 2, solver)` on a position where `odd_even_threat` fires for Red does NOT include `odd_even_threat` in the Yellow result set. Same for `claimodd`. (Guard against detector bug.) The solver used may be the real singleton or an appropriate mock.
- **T-005 (unit)**: Calling `classifyPattern(ms, 1, solver)` on a position where `claimeven` fires for Yellow does NOT include `claimeven` in the Red result set. (Guard against detector bug.)
- **T-006 (regression)**: All existing tests for `classify()` continue to pass without modification after the `perspective` parameter retrofit.
- **T-007 (DB)**: After applying migration (a), a direct DB insert of `pattern_category = 'unknown'` fails. A direct DB insert of `pattern_category = 'drawing_move'` succeeds.
- **T-008 (DB)**: After applying migrations (b) and (c), inserting a `blunders` row with non-null `reason` and `direction` succeeds. Inserting with both `NULL` also succeeds (nullable).

---

## Success Criteria

- **SC-001**: `INSERT INTO blunders (pattern_category, ...) VALUES ('unknown', ...)` is rejected by the DB with a CHECK constraint violation.
- **SC-002**: `INSERT INTO blunders (pattern_category, ...) VALUES ('forbidden_columns', ...)` succeeds (legacy-tolerated).
- **SC-003**: `INSERT INTO blunders (pattern_category, reason, direction, ...) VALUES ('drawing_move', 'win dropped to draw, no pattern detected', 'missed_own', ...)` succeeds.
- **SC-004**: The `blunders` table is empty before the CHECK constraint is added. This is achieved by the `TRUNCATE blunders;` statement at the top of migration (a) — no separate pre-migration step is needed.
- **SC-005**: `tagBlunder` resolves on every input without throwing, including degenerate positions and solver-failure scenarios.
- **SC-006**: All player-only guard tests pass: Red-only patterns never appear in Yellow perspective results; Yellow-only patterns never appear in Red perspective results.
- **SC-007**: All existing `classify()` callers produce identical output before and after the perspective retrofit (no behavioral regression).
- **SC-008**: `classifyAll` and `classifyBestMove` are not deleted; both are still importable and callable after this epic.

---

## Assumptions

- The migration numbering follows the existing sequential scheme in `connect-four/server/migrations/`. The spec does not assign migration file numbers — the implementer picks the next available numbers at implementation time.
- `blunders` has no downstream FK dependents (the `false_positive_records` table has a FK to `candidates`, not `blunders`). TRUNCATE can be run without dependency ordering issues.
- The solver handle passed to `tagBlunder` is the same persistent singleton used elsewhere in the server. No new solver process is spawned.
- `Board.currentPlayer(ms)` is the correct fallback for existing `classify()` callers — this is already the convention used throughout `classifier.js`.
- Movestrings used in tests are sourced from existing KB files, git history, or the `puzzles`/`candidates` DB tables. The implementer queries these sources before writing tests.

---

## Explicitly Out of Scope

- Updating call sites (`import_papergames_blunders.mjs`, `reprocess_blunders.mjs`, `POST /api/games/analyze`) — Epic 2.
- Retiring `classifyAll` / `classifyBestMove` — deferred to Epic 2 after confirming no remaining callers.
- Reprocessing existing blunder rows — Epic 2 reprocess-all-games step.
- Any changes to the challenge pipeline or challenge-set matching.
- Any frontend changes.
- Any i18n changes (already done).
- Adding a DB CHECK constraint on the `direction` column values.
