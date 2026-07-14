# Server Conventions

## Error Logging

**MUST**: All catch blocks in server route handlers and helpers call `logError` before responding or returning.

```js
import { logError } from './logger.js';

// Route handler
} catch (err) {
  logError('[endpoint-name]', err);
  res.status(500).json({ error: err.message });
}

// Helper / background job
} catch (e) {
  logError('[job/step]', e, { uid: room.uid });  // extra context is optional
  skipped++;
  continue;
}
```

`logError(tag, err, extra?)` in `server/logger.js`:
- Always calls `console.error` with tag, message, stack, and optional extra object.
- If `SENTRY_DSN` is set, calls `Sentry.captureException(err, { tags: { tag }, extra })`.
- `tag` convention: `'[route-path]'` e.g. `'[auth/callback]'`, `'[puzzles/check/solver]'`

**Global safety net**: A 4-arg Express error middleware is registered at the end of `index.js` (before `app.listen`) and catches any error passed via `next(err)` or thrown in async routes. All route handlers still call `logError` directly — the global handler is a last resort, not a substitute.

**Intentional exception**: Client-input validation errors that respond with 4xx are NOT logged as errors — e.g. a `400 Invalid movestring` catch block is intentionally silent.

## Solver IPC — Persistent Process

**MUST**: The standard scoring solver (`c4solver -a -b 7x6.book`) runs as a single persistent child process spawned at server startup via `createSolverProcess()` in `c4solver-wrapper.js`.
Queries are serialized: one move string written to stdin per request, one line of scores read from stdout. The wrapper serializes concurrent calls via a promise chain — never query the persistent solver from multiple places in parallel.
Rationale: The solver binary takes ~2 seconds to load the opening book; a new process per request would be too slow.

## Solver IPC — One-Shot Processes

Two other invocation modes spawn a fresh child process per call:

1. **Heatmap data** (`/api/explain`): `spawn(c4solver, ['-x'])` — returns 84 integers (two 7×6 grids) representing threat coverage for both players.
2. **Depth-limited search** (`/api/scores` with `depth` param): `spawn(c4solver, ['-nb', '-d', depth, '-a'])` — returns 7 scores, no book lookup.

## Solver Input/Output Format

- **Input**: A move string written to stdin, followed by `\n`. Format: digits `1–7`, one per move, 0–42 characters. `c4solver-wrapper.js` converts from 0-indexed (`0–6`) to `1–7` before writing — callers always pass 0-indexed strings.
- **Output** (standard mode): One line per query. When a move string is non-empty, the first token is the input echoed back; scores are tokens 1–7 (0-indexed). When the input is empty, only 7 tokens are returned.
- **Empty board special case**: The persistent solver hangs on empty input. Use the hardcoded `EMPTY_BOARD_SCORES = [0, 0, 1, 2, 1, 0, 0]` constant instead.

## Move String Convention

**MUST**: Move strings use **0-indexed** columns `0–6`, concatenated, no separator. This applies everywhere: DB storage, API wire format, and all server/frontend logic.
**MUST**: The only conversion from 0-indexed to 1-indexed happens inside `c4solver-wrapper.js` `query()` before writing to the solver's stdin. No other file may perform this conversion.
**MUST**: Player parity derived from move count: even = player 1 (Red), odd = player 2 (Yellow).

## Board Representation (Server)

**MUST**: Boards are `board[row][col]` where row 0 is the bottom row. Values: `0` (empty), `1` (Red/player 1), `2` (Yellow/player 2).
`new Board(movestring)` in `classifier.js` is the standard entry point for board-state access in the classifier and detectors (see **Board Class** below).
`parseBoardState` in `classifier.js` and `completionStrategies.js` is a lower-level primitive used by `Board` internally and by simulation loops that need mutable raw arrays.

## CompletionStrategy Interface

Sequence-mode puzzle validation uses a strategy object with:
```js
validateMove(position, col) → { valid: boolean, reason?: string }
```
- `position`: move string before the learner's move (0-indexed, digits `0–6`).
- `col`: 0-indexed column.
- All logic is bitboard-only — no solver calls.

`ForcedWinStrategy` (in `completionStrategies.js`) is the only current implementation. Validates that:
1. The learner had no immediate win before the move (forces them to play through the sequence).
2. The move creates at least one new immediate threat.

`getAiResponseCol(positionAfterLearnerMove)` returns the column where the learner has an immediate threat (the opponent must block there). Returns `-1` if no such column exists.

## Category Registry

**MUST**: All valid category slugs are defined once in `server/categories.js` as `VALID_CATEGORIES`, `PAID_CATEGORIES`, `CATEGORY_ORDER`, and `CATEGORY_NAMES`.

Current slugs (as of Epic 6): `immediate_threat`, `forced_block`, `double_threat`, `forced_win`, `forbidden_columns`, `odd_even_threat`, `z_threat`, `claimeven`, `claimodd`, `undercut`, `overcut`, `figure_7`, `j_shape`.

`odd_even_threat` was added in Epic 6 as a free 2-star category. It is Red-only, `single_move` interaction mode, and has no `highlight_metadata`. Detection uses `immediateThreats` not `getMajorThreatCells`.
**MUST NOT**: Hard-code category slug lists anywhere else in server code — always import from `categories.js`.

## Blunder Tag Registry

**MUST**: All valid blunder tags are defined once in `server/blunderTags.js` as the `VALID_BLUNDER_TAGS` Set.

The set contains exactly 16 tags (as of 2026-06-25): `immediate_threat`, `forced_block`, `forced_win`, `double_threat`, `undercut`, `overcut`, `figure_7`, `j_shape`, `z_threat`, `major_threat_parity`, `major_threat_nonparity`, `minor_threat`, `claimeven`, `drawing_move`, `suboptimal_move`, `forbidden_columns`.

`odd_even_threat` was **removed** as a blunder tag 2026-06-25 (it remains a puzzle category and a `classifyPattern` tag — see [[project_detect_odd_even_threat_yellow]]). The three parity-aware threat tags replaced its blunder role; they are generic (almost any mid-game position carries a latent major threat), so they rank **last** among tactical tags in both `tagBlunder` cascades, just above the score-based fallbacks.

`VALID_BLUNDER_TAGS` is distinct from `VALID_CATEGORIES` in `server/categories.js` (which lists puzzle category slugs). Blunder tags are applied to sparring-game blunders via `tagBlunder()` in `classifier.js`. Any tag not in this set is substituted with `'suboptimal_move'` before INSERT into the `blunders` table.

**MUST** import `VALID_BLUNDER_TAGS` from `server/blunderTags.js` wherever a blunder tag is validated (e.g., the `POST /api/games/analyze` endpoint guard).
**MUST NOT** duplicate the tag set locally — always import from `blunderTags.js`.
**MUST NOT** conflate `VALID_BLUNDER_TAGS` with `VALID_CATEGORIES` — they serve different purposes.

## Classifier vs Predicate Evaluator — Explicit Separation

**MUST NOT** conflate these two systems — they are independent:

- `classifier.js` → **labeling only**: determines which tactical pattern a position exhibits. Output: a category slug and evidence tags. Used for puzzle curation, candidate generation, and coach explanations.
- `predicates.js` → **correctness scoring only**: determines whether the learner's move satisfies the puzzle goal. Output: `'correct' | 'wrong' | 'tied'`. A classifier tag does NOT imply predicate correctness, and a correct move does not require a matching classifier tag.

A puzzle's `category` field is set by the classifier at generation time. The predicate evaluator reads `category` to dispatch to the right evaluator, but the classifier is never called during puzzle-check requests.

**New endpoint modes gate on an explicit request flag, never absence-of-field.** When adding a new mode to an existing endpoint, branch on an explicit boolean (e.g. `aiMove: true`), not on some other field being missing — sibling callers may also omit that field. This is why `evaluate-move` dispatches on `aiMove`, not on a missing `category`.

## Predicate Evaluator

`evaluatePredicate(puzzle, candidateCol, scores)` in `predicates.js` dispatches on `puzzle.category`.
Returns `{ result: 'correct' | 'wrong' | 'tied', correctCol?, tiedWith?, forbiddenCols? }`.

New category evaluators MUST be added as a named function `eval<CategoryCamelCase>(candidateCol, puzzle)` and registered in the `switch` statement.

Categories that store their answer in `highlightMetadata` (z_threat, undercut, overcut) read `puzzle.highlightMetadata`.
Categories that store their answer as a scalar (claimeven, figure_7, j_shape) read `puzzle.correctCol`.

### Generation-time candidate guards — color casting & stray forced-block (spec 044 US1/US2)

`checkPredicate` in `candidate-generator.js` is an **exported wrapper** around `checkPredicateRaw`
(the raw per-category dispatch). The wrapper applies two cross-cutting generation-time rejection
rules on top of whatever `checkPredicateRaw` returns — a candidate that passes the raw predicate is
still **rejected** (not silently re-cast) if it violates either:

- **Color casting**: the learner-facing player at a puzzle position is
  `new Board(moveString).currentPlayer` (equivalently `moveString.length % 2 === 0 ? 1 : 2`). For
  `immediate_threat` the learner MUST be P1 (green — the side with the winning move); for
  `forced_block` the learner MUST be P2 (gray — the side that must block). Miscast candidates are
  rejected outright. This applies to puzzle generation ONLY — it is never applied to real-game
  (sparring) blunder detection/tagging.
- **No stray forced-block**: for any category OTHER than `forced_block`, if the board contains a
  live (gravity-top / immediately playable) forced-block situation — detected via
  `detectForcedBlock(new Board(moveString), scores)`, reading `.cols` for the blocking column set —
  whose blocking column is NOT among the candidate's own computed answer column(s), the candidate is
  rejected. If the forced-block's blocking column coincides with the answer, it is accepted. A
  forced-block that is not gravity-top is not a live distraction and does not trigger rejection.

All learner-facing puzzle text referencing disc color MUST say "green"/"gray", never "red"/"yellow"
(the `'red'`/`'yellow'` code strings are P1/P2 labels that render green/gray — see CLAUDE.md's color
table).

### Multi-solution acceptance (spec 044 US3)

`immediate_threat`, `forced_block`, and `double_threat` are the only three categories whose
correctness model allows more than one valid answer column (a fork, or multiple independently
winning/blocking columns). For these three categories only:

- **Generation-time** (`checkPredicateRaw` in `candidate-generator.js`, the fallthrough branch for
  these three categories): the acceptance threshold is `correctCols.length >= 1`, not `=== 1`. The
  `correctCols` filter itself must accept `evaluatePredicate(...).result === 'correct' ||
  result === 'tied'` — NOT `'correct'` alone. This is load-bearing: `evalImmediateThreat`/
  `evalForcedBlock`/`evalDoubleThreat` return `'correct'` only when a column is the SOLE satisfying
  column, and `'tied'` when 2+ columns satisfy it — so filtering on `'correct'` alone yields an
  EMPTY `correctCols` for every multi-solution board (all its winning/forking columns individually
  evaluate to `'tied'`, none to `'correct'`), not just a size-1 one.
- **Solve-time**: every production caller of `evaluatePredicate` that gates learner correctness on
  the result MUST treat `'tied'` as accepted, exactly like `'correct'` — e.g.
  `result === 'correct' || result === 'tied'`. As of spec 044 Batch 2, all production callers
  already did this except `checkPredicateRaw`'s own filter (fixed above) — see the caller-sweep
  comment block atop `predicates.js` for the full audited list.
- **`undercut`** (avoid-the-pattern: every legal column except the killing column is correct) and
  **`z_threat`/`overcut`/`claimeven`** (exactly one correct column) are explicitly OUT of this rule
  — their existing single-answer/avoid-the-pattern semantics are unchanged, and must never be
  widened to "any generating column."
- **Client**: `POST /api/evaluate-move` (`server/evaluateMoveHandler.js`'s
  `createEvaluateMoveHandler`, registered from `server/index.js`) exposes an additive
  `accepted: bool | null` response field, gated to these three categories via the request's
  `category` field (`accepted` is `null` for every other category). It is computed via
  `evaluatePredicate` at solve time — no persistence, no schema change. `ChallengeScreen.jsx`'s
  `handleColumnClick` reads `data.accepted` (not a bare `data.quality === 'optimal'` check) for
  these three categories only; every other category's client-side scoring is unchanged.

### Single-answer categories widen the same gate (spec 049, Epic 9)

`SINGLE_ANSWER_CATEGORIES` (`server/categories.js`, mirrored — duplicate literal, NOT
cross-imported — in `src/lib/categories.js`) is a sibling list to `MULTI_SOLUTION_CATEGORIES`:
`z_threat`, `overcut`, `claimeven`, `undercut`, `figure_7`, `j_shape` — the six categories whose
correctness model has exactly one taught answer column (or, for `undercut`'s avoid-the-pattern
semantics, one taught avoid-column). It is **disjoint** from `MULTI_SOLUTION_CATEGORIES` and MUST
NOT be derived as its complement — a category in neither set (`forced_win`, `forbidden_columns`,
`odd_even_threat`) would otherwise be silently miscategorized as single-answer. The
`POST /api/evaluate-move` `accepted` gate is `MULTI_SOLUTION_CATEGORIES.has(category) ||
SINGLE_ANSWER_CATEGORIES.has(category)` — one shared boolean expression
(`result === 'correct' || result === 'tied'`) applied uniformly across all nine categories, not a
second category-conditional branch (the six single-answer categories' `eval*` functions never
actually return `'tied'`, so this is equivalent to strict `'correct'` for them, but the shared
expression is what's implemented).

For the six single-answer categories, the predicate-object the handler evaluates against is built
from the request's `correctCol`/`highlightMetadata` fields (client-sent, remapped from the
puzzle's stored snake_case columns — see api-conventions.md) rather than recomputed server-side
metadata, via `buildPredicatePuzzle(category, movestring, { correctCol, highlightMetadata })` in
`server/predicates.js`. This same helper is shared with `POST /api/evaluate-move/inline`'s
`evaluatePredicate` call site (previously a second, divergent construction of the predicate
object) — the two endpoints now converge on one code path for building that object, closing a
maintenance seam where the two handlers could silently drift.

**Handler extraction**: the `/api/evaluate-move` route handler itself is extracted into
`server/evaluateMoveHandler.js`'s `createEvaluateMoveHandler({ solver, i18nTranslations })` — a
side-effect-free factory parameterized on the two values that differ between the live server and
a test. `server/index.js` has no exported `app` and boots a live solver process at import time,
so it cannot be imported directly by tests; this factory is what lets
`tests/integration/singleAnswerCategoriesAccepted.test.js` and
`tests/integration/evaluateMoveMultiSolution.test.js` mount the actual production handler instead
of a hand-copied reimplementation.

## Classifier API — Perspective, classifyPattern, and tagBlunder

`classifier.js` exposes two functions beyond the category-level `classify()`:

### `classifyPattern(ms, perspective, solver)`

```js
classifyPattern(ms, perspective, solver) → Promise<Map<string, { cells: string[] }>>
```

Returns a Map of tactical pattern tags (e.g. `'immediate_threat'`, `'forced_win'`, `'z_threat'`) present for the given `perspective` on the position `ms`. Each value has a `cells` array of wire-format cell coordinates (`"c{col+1}r{row+1}"`, 1-indexed). Tags are drawn from all 15 detectors, run in parallel via `Promise.all`. Never contains `'unknown'`.

The 15 detectors include three **parity-aware threat** detectors added 2026-06-25 — `major_threat_parity`, `major_threat_nonparity`, `minor_threat` (geometry-only, built on `categorizeThreats`; see **Threat categorization** below). `odd_even_threat` is still emitted (puzzle path) but is de-listed from the coach prompt and the blunder vocabulary — see [[project_detect_odd_even_threat_yellow]].

- `ms` — 0-indexed movestring.
- `perspective` — 1 (Red) or 2 (Yellow). The player whose patterns to detect.
- `solver` — c4solver wrapper with `.query(ms)` method.

**Inline detector list**: `classifyPattern` maintains its own inline list of 13 detectors. This list is the sole registry of pattern detectors. `classifyPattern` must NOT import any external registry to avoid circular dependencies.

**Detector perspective parameter**: Every `detect*` function accepts a `perspective` parameter defaulting to `board.currentPlayer`. When `classifyPattern` calls detectors, it passes the explicit `perspective` — never relying on the default.

### `tagBlunder(moves, playedCol, correctCol, solver)`

```js
tagBlunder(moves, playedCol, correctCol, solver) → Promise<{ tag: string, direction: string, reason: string }>
```

Tags a blunder with the tactical pattern involved, from the perspective of the player who moved.

- `moves` — 0-indexed movestring of the position where the blunder was made.
- `playedCol` — 0-indexed column the player actually played.
- `correctCol` — 0-indexed best column (argmax of solver scores).
- `solver` — c4solver wrapper.

**Throwing contract** (changed): `tagBlunder` throws `NotABlunderError` (exported from `classifier.js`) when called on a **terminal** position — already won, or a full board — because there is no move to tag. This is a *precondition violation* (caller error), surfaced loudly and distinct from a solver failure. All OTHER errors (e.g. solver rejects) resolve to the fallback `{ tag: 'suboptimal_move', direction: 'missed_own', reason: 'solver error: ...' }`.

> Callers MUST distinguish the two: on `NotABlunderError`, skip the ply / do not record a blunder (never fabricate a `suboptimal_move`); only fall back for genuine solver errors. The "is this a mistake?" gate (`scoreMove`) must never flag a blunder on a terminal position — it can't, since the solver won't score one, but the typed error enforces it. See `index.js` (analysis loop) and `papergamesImporter.js` for the reference handling.

`direction` is one of:
- `'defensive_miss'` — the **opponent already had** an immediate winning threat at `moves` and the blunderer failed to take it off the board (tag is always `forced_block`).
- `'missed_own'` — the blunderer either had an immediate win available, or **playing `correctCol` would have built** pattern X for them while `playedCol` did not.
- `'enabled_opponent'` — the played move let the opponent build a pattern (an immediate threat, or a pattern on the opponent's best continuation that the correct line avoided).

**New missed_own semantics** (changed): a pattern tag is `missed_own` when `correctCol` *builds* it and `playedCol` does not — i.e. `patterns(moves+correctCol, blunderer) ∋ X` and `patterns(moves+playedCol, blunderer) ∌ X` — NOT the old "had X at `moves`, lost it". `double_threat`/`figure_7` carry an undercut guard.

**Priority cascade** (phases; first match wins):
1. **Phase A** (pre-move pressure): `immediate_threat:missed_own` (own win available) → `forced_block:defensive_miss` (opponent had an immediate threat).
2. **Phase B**: `immediate_threat:enabled_opponent` (played move hands a *new* opponent win; pre-existing threats are caught by Phase A as `defensive_miss`).
3. **Phase C** (missed_own patterns): `forced_win`, `double_threat`, `figure_7`, `j_shape`, `z_threat`, `overcut`, `claimeven`, then the generic parity-aware threats `major_threat_parity`, `major_threat_nonparity`, `minor_threat` (ranked last).
4. **Phase D** (enabled_opponent continuation): existential/universal over **all** the opponent's optimal replies — `enabled(X)` iff some optimal reply on the blunder line builds X and no optimal reply on the correct line does.
5. **Phase E**: score-based fallback (`drawing_move` or `suboptimal_move`).

Phase A returns before any `moves+correctCol` solver query when the blunderer has an immediate win, so Phase C never queries a terminal position.

### FR-033: Two-step perspective contract

Five score-consuming detectors implement a **recursive two-step** pattern when called with a `perspective` that differs from `board.currentPlayer`:

- `detectForcedBlock`, `detectForcedWin`, `detectZThreat`, `detectOddEvenThreat`, `detectForbiddenColumns`

When `perspective !== board.currentPlayer && solver !== null`, each detector recursively evaluates **all** child positions (one per playable column) from the requested perspective. The pattern matches only if it matches from the requested perspective in **every** child position.

This IIFE (`(async () => { ... })()`) returns a Promise, so these five detectors become async when the perspective changes. The IIFE shields against terminal child positions (where the solver rejects) by returning `{ matched: false }` — a terminal game cannot exhibit tactical patterns.

Detectors that do NOT depend on solver scores (`detectImmediateThreat`, `detectDoubleThreat`, `detectUndercut`, `detectOvercut`, `detectFigure7`, `detectJShape`, `detectClaimodd`) never enter the IIFE — they only use board geometry, which is perspective-independent for threat analysis. `detectClaimeven` uses the solver independently via its simulation, not via the FR-033 IIFE.

## Simulating games

`server/gameSampling.js` is the **canonical game simulator** and the SOLE owner of all
self-play. When you need real game positions — eval sets, test fixtures, blunder
coverage, position sampling, finding a board with a given property — do NOT hand-roll a
game loop. Every consumer now goes through this module: `select_boards.mjs` and
`generate_tagblunder_fixtures.mjs` (via `harvestBlunders`), and `candidate-generator.js`'s
`generateCandidates` (via `playGame`, see below). (`generate_eval_set.mjs`, a former consumer, was
deleted 2026-07-01 — see `docs/architecture/reason-DECISIONS.md` D22.) Use:

- **`playGame(solver, rng = Math.random, { maxMistakeProb = 0.5 } = {})`** — THE
  primitive. Async generator that plays one mistake-weighted self-play game, yielding
  `{ ms, scores, player, movePlayed, plyIndex }` at each ply **before** the move is
  applied. Because it streams, a caller can inspect each position and `break` the moment
  it finds the board it wants — no whole-game cost, no callbacks/inversion of control.
  Each player draws an independent mistake probability in `[0, maxMistakeProb)`.
  `candidate-generator` passes `maxMistakeProb: 0.25`; all other callers use the default.
- **`simulateGame(solver, rng)`** — drains `playGame` into a full game `{ ms,
  scoresCache }` (`scoresCache[i]` = scores before move `i`).
- **`harvestBlunders(solver, { maxGames, rng })`** — async generator yielding **every
  non-optimal ply** with `{ boardState, movePlayed, correctCol, scores, score,
  bestScore, severity, perspective, quality, gameIndex, plyIndex, gameMs }` — exactly
  the inputs `tagBlunder` / blunder recording need.
- **`playPolicyGame(solver, policies, rng = Math.random)`** — policy-driven variant of
  `playGame` for strategy experiments (used by `server/scripts/win_distribution/`).
  `policies` is `[player1Policy, player2Policy]`; each policy is
  `async ({ ms, board, heights, player, legal, getScores, rng }) => 0-indexedCol`.
  `getScores()` lazily queries the solver for the current position and memoizes it per
  ply (returns a copy of `EMPTY_BOARD_SCORES` for the empty board), so solver-free
  policies cost zero solver calls. Yields `{ ms, player, movePlayed, plyIndex, scores }`
  before each move (`scores` is `null` unless a policy fetched it). Unlike `playGame`, it
  imposes no mistake model — the policies decide. Additive-only: it does not touch the
  frozen `playGame`/`sampleColMP` rng contract.

Pass a seeded `rng` for deterministic runs (e.g. in tests). `harvestBlunders` skips
optimal plies, so consumers only see mistakes.

**Candidate generation pattern** (`candidate-generator.js` → `generateCandidates`): each
rollout iterates `playGame`, accumulating yielded plies into `debug_trace.plies`, and
`break`s on the first position satisfying the category predicate. It re-imposes the old
fixed scan cap by `break`-ing when `pos.ms.length >= maxMoves` (abandon this game, try
another). **FR-011**: the per-rollout minimum move count MUST be drawn from `randint(14,
34)` (one `rng()` call: `14 + Math.floor(rng() * 21)`); positions shorter than that are
skipped. The integration test `candidate-generator.test.js` (T017/SC-002) asserts every
`move_string` has length ≥ 14 — this passes deterministically only because of the FR-011
floor, not by luck.

## Board Class

`Board` in `classifier.js` is the standard entry point for board-state access in the
classifier and detectors. Construct it once per position; pass it to all consumers.

**MUST** use `new Board(movestring)` in `classify()` and all `detect*` functions.  
**MUST NOT** call `parseBoardState` inside `classify()` or `detect*` functions; use
`board.board` / `board.colHeights` / board methods instead.

`parseBoardState` remains a free export for callers that need mutable raw arrays
(simulation loops, one-shot predicate checks that do not share state across detectors).

`board.withMove(col)` returns a new immutable `Board` for the position after placing in
`col`. Use it instead of the mutation+undo pattern (`board[r][c] = player; ...; board[r][c] = 0`).  
**The mutation+undo pattern MUST NOT appear in `classify()` or any `detect*` function.**
**`withMove(col)` throws `RangeError` if `col` is out of range (`0–6`) or the column is full.** Always guard with `board.colHeights[col] < 6` before calling if the column's availability is not already guaranteed by the caller.

`getReachableThreats(board, colHeights, player)` is O(42) and mutation-free because
`checkWin` never reads `board[row][col]` itself — only neighbor cells. This means threat
scanning functions can call `checkWin` on an empty cell without placing the piece first.

## Explain Context (`explainContext.js`)

`buildExplainContext(movestring, col, rounds, solver)` in `server/explainContext.js` is the
unified grounding flow for the LLM explain-move endpoint. It replaces the former
`explainSimulate`-based approach (deleted in Epic 3).

```js
buildExplainContext(movestring, col, rounds = 1, solver)
  → Promise<{ prompt: string, allowedSet: Array|null, zoneAliasMap: Object }
           | { prompt: null, allowedSet: null, allMovesEqual: true }
           | null>
```

- Returns `null` if the contrast move could not be determined.
- Returns `{ prompt: null, allowedSet: null, allMovesEqual: true }` when all legal moves
  have equal solver scores (settled position).
- Otherwise returns `{ prompt, allowedSet, zoneAliasMap }` where:
  - `prompt` — full LLM system prompt string (from `buildBlunderExplainPrompt`)
  - `allowedSet` — `AllowedSetEntry[]` or `null` (null = no Tier 1/2 patterns found)
  - `zoneAliasMap` — `{ 'player-minor-pre': 'windows:...', ... }` — 6 entries mapping alias names to `windows:` specs for minor threat windows at pre/best/played board states. Used by `expandZoneAliases()` after LLM generation.

`expandZoneAliases(text, aliasMap)` (also exported from `explainContext.js`) replaces `[zone:player-minor-pre]` → `[zone:windows:c2r4,c3r4,...|...]` in the raw LLM output **before** `validateAnnotation`. The `windows:` spec encodes per-window cell structure so the frontend can render one capsule per threat window.

**Flow**:
1. Query solver scores; check for settled position.
2. Select contrast move via `selectContrastMove`.
3. On the blunder path: call `tagBlunder` to get `{ tag, direction }` and derive `humanReason`
   from `REASON_TEMPLATES`.
4. On the optimal path: classify patterns at the best-move position and derive `positiveReason`
   from `POSITIVE_TEMPLATES` via the priority cascade.
5. Build `allowedSet` from `classifyPattern` results (three directions contribute pattern maps).
6. Build board visualizations via `getBoardVisualization`.
7. Build and return the prompt via `buildBlunderExplainPrompt`.

## Solver Score Semantics (Critical Invariant)

At forced-win terminal positions, all opponent columns score identically — the solver cannot identify which column blocks. Use direct `checkWin` board detection instead.
Reference: `reference_c4solver_behavior.md` and `reference_cat5_forced_block_detection.md` in memory.

## Threat-Counting Invariant

Pattern detectors (`detectFigure7`, `detectJShape`) count threats at any reachable empty cell `(col, row)` where `row >= colHeights[col]`. A threat is valid even if pieces must fill below it first — those pieces arrive in the natural course of play. Use `board.reachableThreats(player)` (backed by `getReachableThreats`) for this.

The gravity-top restriction (only `row === colHeights[col]`) applies exclusively to `immediate_threat` and `forced_block` detection, which reason about the current player's single immediate move.

`getImmediateThreats` / `board.immediateThreats(player)` uses the gravity-top restriction and is reserved for immediate-move semantics (`detectClaimeven`, forced-block checks). Do not use it in pattern detectors.

## Threat categorization (`categorizeThreats`)

`categorizeThreats(board, perspective)` in `classifier.js` is the canonical parity-aware threat categorizer. For BOTH `player` (the to-move perspective) and `opponent` it returns `{ majorParityAligned, majorNonParity, minor }`, each `{ count, cells }` (cells are sorted `"cNrM"` 1-indexed strings):

- **Majors** come from `getMajorThreatCells` (`rm`/`ym` flags), **exclude** immediately-playable cells (`row === colHeights[col]`), and are split by parity: aligned ⟺ `row % 2 === (P - 1)` where `P` is that side's perspective.
- **Minors** use `getMinorThreatWindows` + `emptyCellsFromWindows` (NOT the `rn`/`yn` flags), so a 2-disc window shadowed by a major window is excluded.

`categorizeThreats`, `getMinorThreatWindows`, and `emptyCellsFromWindows` live in `classifier.js` (moved there from `explainContext.js` 2026-06-25) **specifically to avoid an import cycle**: `explainContext.js → sparseLookahead.js → classifier.js`, and the new `classifyPattern` threat detectors need the categorizer. `classifier.js` imports neither of the other two, so it is the only cycle-free home. `explainContext.js`'s `summarizeThreats` delegates to `categorizeThreats` (keeping its legacy output shape) and imports `getMinorThreatWindows` from `classifier.js`.

## Allen T/V-rule content-pipeline utilities (`allenTransforms.js`, `allenVRules.js`)

`connect-four/server/allenTransforms.js` and `connect-four/server/allenVRules.js` (spec 044 Epic 4, User Stories 4–5) are standalone, pure threat-set-in/threat-set-out utility modules — **not wired into any production request path** (`candidate-generator.js`, `classifier.js`, `predicates.js`, and `ChallengeScreen.jsx` are all untouched). They exist to give the content pipeline (puzzle authoring / regression tooling) a KB-sourced, unit-tested implementation of Allen (2010)'s threat-simplification and victory-rule framework, callable independently of the runtime classifier.

- `allenTransforms.js` exports the T1–T7 transformation-rule detectors (each a literal port of its own `docs/knowledge-base/allen-t{1..7}.md` `formal_predicate`) plus `simplifyThreats(threats)`, a composition helper that runs the applicable detectors in KB-documented precedence order and returns `{ threats, decidedBy, t3Pairs, t4Cols, t5Cols, t7Cancellations }` for downstream V-rule consumption. It also exports `isAllenOddRow0(row0)`, the 0-indexed ⟷ Allen-1-indexed row-parity translator — required because every KB entry's prose/pseudocode is written in Allen's own 1-indexed row numbering while this project is 0-indexed everywhere (CLAUDE.md); reuse this helper for any absolute-row-parity check rather than porting a KB literal directly.
- `allenVRules.js` exports the V1–V5 victory-rule evaluators and the T4 Case A / Case B evaluators (each a literal port of its own KB entry). The V1–V5 evaluators take the `simplifyThreats()` output shape (not a raw threat array), since V1/V2's odd-threat counting needs the T3 pair metadata.
- Contract: a threat is `{ player: 1 | 2, col: 0-6, row: 0-5 }` (0-indexed), `RED = 1`, `BLACK = 2`. No board-mutation, no gravity/reachability check, no candidate-board generation, no new player-facing category — these are pure functions over an already-extracted threat set.
- Tests: `tests/unit/allenTransforms.test.js` and `tests/unit/allenVRules.test.js`, each fixture sourced from its own KB entry's `worked_examples`/`false_positives` and cross-checked against `./visualize_board.sh`/the production c4solver, not trusted from KB prose alone.

## LLM Coach Helpers (`llmCoachHelpers.js`)

`connect-four/server/llmCoachHelpers.js` is the shared module for all LLM coaching server endpoints. It exports:

### Recommend-move helpers (unchanged from Epic B)

- `buildRecommendPrompt({...})` — assembles the full move-recommendation prompt
- `buildFlatTable(colData, rounds)` — formats the per-column pattern table for the prompt
- `getScoreTier(col, score, immediateWinSet, immediateLossSet)` — classifies a column into IMMEDIATE WIN / WINS / DRAWS / LOSES / IMMEDIATE LOSS
- `TIER_ORDER`, `IMMEDIATE_WIN_OUTCOMES`, `PATTERN_KB` — shared constants

`PATTERN_KB` maps pattern keys to `{ id: '<kb-slug>' }` entries. No `inline` entries exist (all migrated to files 2026-06-20). A KB term is injected into an explain-move prompt **only when its pattern fires** (added to `relevantPatternKeys` in `explainContext.js`); the gate is `if (!relevantPatternKeys.has(patternKey)) continue;`. There is **no** `always_include` glossary path — it was removed 2026-06-25 because injecting a term with no on-board instance (even `parity`/`gravity_top`) caused the LLM to fabricate/misapply it (see memory `project_explain_system`). Special shape:
- Alias entries share a `kbId` with another pattern key (e.g. `fork` → same file as `double_threat`); `explainContext.js` deduplicates by `kbId`. Every entry must have a corresponding `docs/knowledge-base/<id>.md` with `short_summary` and an entry in `src/lib/kbTermLesson.js` for the popup display name.

### Shared utilities

- `isMajorThreatForPlayer(board, col, row, player)` — checks whether a cell is a 3+empty major threat; not exported from `classifier.js`, this is the canonical server location
- `getBoardVisualization(movestring)` — shells out to `scripts/visualize_board.mjs` via `spawnSync`, strips the `scr` row
- `buildKBSection(patternNames)` / `loadKBStatement(id)` — loads KB article `statement` field for active patterns; `inline` branch removed 2026-06-20
- `callLLM(prompt)` — thin wrapper around `server/llmChat.js`'s `callOpenAIChat` (see "Unified OpenAI-Chat Call Helper" below); reads `OPENAI_API_KEY` / `OPENAI_MODEL` from env, passes `endpoint: 'run-eval'`, `purpose: 'offline-eval'`, `userId: null`, `maxCompletionTokens: 400`, `useJsonFormat: false`. Callers destructure `{ content }` from the return value — it is no longer a bare string (spec 047 US5; `tests/scripts/run_eval.mjs` was updated accordingly).
- `selectContrastMove(scores, userCol, board)` — pure; returns `{ contrastCol, isOptimal }` or `null` when all legal scores are equal. `isOptimal=true`: user played best, contrast = second-best; `isOptimal=false`: user played suboptimally, contrast = best. Tie-break: closest to col 3.
- `getOpponentResponseMs(postMovestring, postBoard, opponentWinCols, perspective, solver)` — returns the movestring after opponent's best response, or null if the game is over.
- `findMajorThreatWindows(board, perspective)` — scans all 4-windows and returns windows with exactly 3 discs of one color + 1 empty cell. Returns `{ cells: string[], owner: 'player'|'opponent' }[]`. Replaces `getMajorThreatCells` for all group-level operations.

### Explain-move utilities (Epic 3)

- `checkAllMovesEqual(preScores, board)` — returns `{ isSettled, allMovesEqual }`. `isSettled=true` means all legal columns have zero score (genuine draw). Used to short-circuit the LLM call.
- `getGapAndFraming(preScores, col, contrastCol)` — returns `{ gap, inverted, forceBucket, gapBucket }`. The eval gap between user's move and the contrast. `inverted=true` when the user's move is optimal. `gapBucket` is one of `small`/`moderate`/`large`, with sign-change override (`forceBucket`).

### Prompt builder (Epic 3, replaces type-dispatch)

- `buildBlunderExplainPrompt({ tag, direction, humanReason, positiveReason, correctMovePatterns, boardViz, postBoardViz, playerName, gap, gapBucket, allowedSet })` — builds the full LLM system prompt for the explain-move endpoint. Handles both the blunder path (when `tag`/`direction`/`humanReason` are set, `positiveReason` is null) and the optimal path (when `positiveReason` is set, `tag`/`direction`/`humanReason` are null). Used exclusively by `buildExplainContext` in `explainContext.js`.

Parameter shapes:
  - `tag` — string or null (null on optimal-move path). One of the 15 VALID_BLUNDER_TAGS values.
  - `direction` — `'missed_own'|'enabled_opponent'|'defensive_miss'` or null.
  - `humanReason` — string from `REASON_TEMPLATES.get('${tag}:${direction}')` on blunder path, or null.
  - `positiveReason` — string from `POSITIVE_TEMPLATES.get(tag)` on optimal path, or null.
  - `correctMovePatterns` — `Map<string, {cells: string[]}>` from `classifyPattern(ms + bestCol, perspective, solver)`.
  - `boardViz`, `postBoardViz` — board visualization strings from `getBoardVisualization`.
  - `playerName` — `'Green'` or `'Grey'`.
  - `gap`, `gapBucket` — eval gap metrics from `getGapAndFraming`.
  - `allowedSet` — `AllowedSetEntry[]` or null. Never pass `[]` (empty array) — that causes P5strong failures for all `tg` zones.

### Deleted functions (Epic 3)

The following functions were removed to simplify the explain-move path:
- `classifyExplanationType` — type-1/2/3/4 dispatch (replaced by direct blunder/optimal paths in `buildExplainContext`)
- `buildType12Prompt`, `buildType3Prompt`, `buildType4Prompt` — type-specific templates (replaced by `buildBlunderExplainPrompt`)
- `buildCommonPromptSections`, `buildGroupContextBlock`, `selectTopGroups`, `buildAllowedSet`, `buildType1AllowedSet` — simulation-era grounding contract builders (no longer needed)
- `computeDeltaTable`, `buildExplainPrompt`, `buildPatternNarrative`, `PATTERN_NAMES` — earlier versions

**Critical invariant**: solver scores are NEVER passed to the LLM. `getScoreTier` translates scores to tier labels (WINS/DRAWS/LOSES), and `getBoardVisualization` strips the `scr` row from board output. This invariant MUST be preserved by all callers.

The CLI scripts (`scripts/recommend_next_move.mjs`, `scripts/explain_move.mjs`) import from this module. Server endpoints (`/api/recommend-move`, `/api/explain-move-llm`) also import from it and reuse the server-managed solver singleton rather than spawning their own.

## Unified OpenAI-Chat Call Helper (`llmChat.js`, spec 047 US5)

`connect-four/server/llmChat.js` exports one async function, `callOpenAIChat(prompt, ctx)`, that
**every** in-scope OpenAI chat-completion call site is routed through, so token usage and USD cost are
recorded uniformly with zero bespoke per-site logging. Full contract:
`specs/047-platform-hardening-cost-observability/contracts/llm-call-helper.md` (this section
summarizes; that doc is authoritative for exact parameter defaults and edge-case behavior — do not
duplicate it verbatim here on future edits, cross-reference it instead).

**Signature**: `callOpenAIChat(prompt, { model, apiKey, endpoint, userId = null, purpose,
maxCompletionTokens = 4000, useJsonFormat = true, fetchImpl = fetch }) → Promise<{ content, usage:
{ promptTokens, completionTokens, totalTokens } }>`. Throws on any non-2xx OpenAI response or network
failure, same as the three pre-existing implementations it replaced. Retries once without
`response_format` if `useJsonFormat` was requested and the response indicates the model rejected it
(ported verbatim from the prior `defaultCallLLM`/`callExplainLLM` behavior), but the retry flag is now
function-local per call, not module-level shared state — a rejection on one model's call no longer
silently disables `response_format` for a different model sharing the module.

**Call sites** (all three rewired in place):

| Call site | File | `{ endpoint, purpose }` |
|---|---|---|
| Production deep-reveal | `mechanismExplainer.mjs`'s `defaultCallLLM` (thin wrapper) | `{ endpoint: 'explain-move-llm', purpose: 'deep-reveal' }` |
| Offline eval harness | `llmCoachHelpers.js`'s `callLLM` | `{ endpoint: 'run-eval', purpose: 'offline-eval' }` |
| Offline compute/eval script | `scripts/compute.mjs`'s `runLlm` (its former local `callExplainLLM` copy is deleted) | `{ endpoint: 'compute-eval', purpose: 'offline-eval' }` |

**`userId` threading is not purely mechanical.** Unlike the static `endpoint`/`purpose` literals above,
`userId` is request-scoped. For the production deep-reveal path this requires two edit points, both
required (skipping either silently leaves `userId` as `null` for every production call):
`computeMechanism` (`mechanismExplainer.mjs`) accepts `userId = null` in its options object and forwards
it into its internal `defaultCallLLM` call closure; and the route (`POST /api/explain-move-llm`,
`index.js`) passes `userId: req.user.id` into `computeMechanism`'s options (safe because the route
already guards `!req.user` earlier). The offline call sites always pass `userId: null` — there is no
request-scoped user in a CLI/script context.

**Fire-and-forget ledger write.** On a successful response, `callOpenAIChat` computes `costUsd` via
`llmPricing.js`'s `estimateCost(model, usage)` and calls `llmUsageLedger.js`'s `recordUsage({ endpoint,
purpose, userId, model, usage, costUsd })` **without awaiting it** — a ledger-write failure or delay
must never affect the caller's response latency or success. On failure (thrown or non-2xx), it logs via
`logError('[llm-chat]', err, { endpoint, purpose, userId, model })` and re-throws; no `recordUsage` call
happens — no partial/fabricated ledger row. See `data-model.md`'s `llm_usage` section for the table
this writes to and its append-only lifecycle (contrasted with `explanation_cache`'s deploy-time
TRUNCATE).

## CSP Directive Rationale (spec 047 US2, FR-003/004/005)

The `helmet` CSP mounted in `index.js` (see the `app.use(helmet({ contentSecurityPolicy: { directives:
{...} } }))` block, right after `app.set('trust proxy', 1)`) is deliberately narrow —
`default-src 'self'` plus explicit, minimal per-directive allowances. Two omissions look like bugs to a
future contributor scanning for a missing `connect-src`/`form-action` entry; they are not:

- **No `connect-src` entry for Sentry.** `@sentry/react` is a listed frontend dependency and
  `ErrorBoundary.jsx` calls `Sentry.captureException(...)`, but **no `Sentry.init(...)` call exists
  anywhere in `connect-four/src/`** — an uninitialized client's `captureException` is a no-op that
  issues no network request. There is nothing for the CSP to allow today. Do not add a speculative
  `connect-src` entry for Sentry's ingest host; that would be dead configuration for traffic that
  doesn't exist (tracked separately as a real gap: `docs/open_issues.md`, frontend Sentry never wired
  up).
- **No `form-action`/`frame-src` entry for Google OAuth.** `AuthModal.jsx` performs the OAuth handoff via
  `window.location.href = '${oauthBase}/api/auth/oauth/google'` — a full top-level page navigation, not
  a `fetch`/XHR (governed by `connect-src`), not a popup, and not an iframe (governed by `frame-src`).
  Standard CSP source directives do not restrict top-level navigation via `location.href` assignment,
  so no directive is needed to "permit" the OAuth redirect chain.
- **`media-src` includes the Supabase host** (`'self'`, `` `https://${SUPABASE_HOST}` `` where
  `SUPABASE_HOST = new URL(process.env.SUPABASE_URL).host`, computed once at startup) because signed
  coach-audio URLs from Supabase Storage (the redirect target of `GET /api/user/tts/deep-reveal`) are
  fetched cross-origin by the `<audio>` element. This is the one directive in the set that legitimately
  needs a non-`'self'` origin.
- **`style-src` stays `'self'`** with no `'unsafe-inline'` — there is no styled-components/emotion
  dependency, and React's `style={{}}` prop sets element `.style` properties directly, which `style-src`
  does not restrict. Add `'unsafe-inline'` only if a real CSP violation surfaces one (see the FR-005
  smoke-test legs in `staging_checks.md`'s Epic 7 section), not preemptively.
- **`connect-src` and `img-src` include `https://papergames.io` (and `wss://papergames.io` for
  `connect-src`).** The Play-Online / Past-Games features talk to papergames.io directly from the browser:
  `PlayOnlineScreen.jsx` opens a `wss://papergames.io/socket.io/...` WebSocket (governed by `connect-src`),
  and `PastGamesListScreen.jsx` renders avatar `<img>` elements from `https://papergames.io/en/assets/...`
  (governed by `img-src`). A bare `'self'` for either directive silently breaks online play and avatars in
  production. **This was missed by the original spec-047 research §2 CSP analysis and caught in code review**
  — these are real, load-bearing external dependencies, not speculative allowances, so unlike the Sentry
  case above they MUST stay. **Caveat:** this only breaks when Express serves the built `dist/` with the CSP
  header; `npm run dev` (Vite, port 5173) serves the SPA itself without Express's CSP, so the local FR-005
  smoke test cannot surface a papergames CSP violation — verify online-play + avatars against a
  **production-like** build (or the deployed staging system) specifically.
- **The service-worker registration is in `src/main.jsx`, not an inline `<script>`.** It was moved out of
  `index.html` precisely so `script-src 'self'` can stay strict (an inline `<script>` would need
  `'unsafe-inline'`, a hash, or a nonce). Do not reintroduce inline scripts into `index.html` without
  updating `script-src` accordingly.

If a future change needs to add a `connect-src`/`form-action`/`frame-src` entry, first check whether it is
a real dependency (like papergames.io above) or a speculative one (like Sentry). For Sentry/OAuth
specifically: adding a directive almost certainly means Sentry has actually been `init()`'d or the OAuth
flow has changed to a `fetch`/popup/iframe — re-verify the premise before adding, rather than restoring it
"to be safe."

## Static Cross-Directory JSON Import

`server/index.js` imports the frontend i18n file directly:
```js
import i18nTranslations from '../src/i18n/en.json' with { type: 'json' };
```
This is acceptable in this monorepo because `en.json` is a build artifact that the server reads at startup (for `pickFromPool` key selection). Requires **Node 20.10+** for the `with { type: 'json' }` import-attributes syntax. If the Node version constraint cannot be met, fall back to `JSON.parse(fs.readFileSync(...))`.

Do not add more server→frontend imports. This single cross-boundary import is intentional and documented here so future maintainers don't generalise the pattern.

## LLM Explanation Scripts

CLI scripts that call an LLM must load `connect-four/server/.env` via Node's built-in
`--env-file` flag (Node 20.6+). The shell wrapper at the project root is the single
call site for this flag (e.g. `explain_move.sh`). Scripts themselves read
`process.env.OPENAI_API_KEY` and `process.env.OPENAI_MODEL` directly — no `dotenv`
package needed.

**Boot-path import discipline.** Some reason-engine CLI modules (`reasonEngine.mjs`,
`scripts/compute.mjs`) also load `.env` at module-import time. Because the production
server transitively imports them (`index.js` → `mechanismExplainer.mjs` → `compute.mjs`
→ `reasonEngine.mjs`), any `.env` read that runs as an import side-effect executes during
server boot — and in prod there is **no `.env` file** (env comes from the platform). Such
reads MUST go through `boardUtils.loadEnv`, which treats a missing file as a no-op. Never
add a bare top-level `readFileSync` of `.env` to a module reachable from `index.js`; it
will crash-loop the server. See memory `project_boot_path_env_read_crash.md`.

**LLM prompt structure contract** for move explanations (`/api/explain-move-llm`, Epic B):

The prompt is built by one of four type-specific template builders (`buildType4Prompt`, `buildType12Prompt`, `buildType3Prompt`), dispatched by `classifyExplanationType`. All templates share a common skeleton via `buildCommonPromptSections`:

1. `## Role` — type-dependent persona:
   - **Type 1/2/3**: "You are a Connect Four coach explaining why one move was stronger than another."
   - **Type 4**: "You are a Connect Four coach explaining, in the opening, why one move develops better than another."
2. `## Players` — player identity (Green/Grey) with winning parity rows
3. `## Hard grounding rules` — must reference only cells listed in the Winning-line comparison block
4. `## Move context` — player, column played, best alternative, eval gap, stage, major threat count
5. `## Boards` — up to three board visualizations (pre-move, post-move, post-opponent-response) with R→Green, Y→Grey substitution and `scr` row stripped
6. `## Winning-line comparison` — zero or more `GROUP_k` blocks with per-group: cells, occupants, key completing cell, row parity, CONCRETE-ELIGIBLE/ABSTRACT-ONLY flag, A-branch vs B-branch frequency, KB justification
7. `## Tone (driven by Eval gap)` — tone ladder scaled to `gapBucket` (small/moderate/large), with inverted framing when user's move is optimal
8. `## Pattern definitions` (KB section) — loaded via `buildKBSection` for parity-related KB slugs
9. `## Output format` — zone tag instructions
10. `## Task` — type-specific grounding instruction (Type 1: missed immediate threat; Type 2: tactical pattern; Type 3: parity flip sentence; Type 4: developmental framing)

Solver scores are intentionally excluded from the prompt. The LLM reasons from the grounded `allowedSet` cells, winning-line comparison, and KB parity definitions only.

**Contrast move selection**: if the user's move was suboptimal, the contrast is the best legal move; if optimal, the contrast is the second-best. Center column (col 3) breaks ties. If all legal scores are equal, the handler returns the "All moves are roughly equivalent" frozen string without calling the LLM. If `checkAllMovesEqual` detects a genuinely settled position (all scores zero), the shorter "All moves are roughly equivalent" frozen string is returned instead.

### Zone tag normalization (`normalizeZoneTags`)

LLMs frequently malform zone tags in explain-move output. Common errors:
- `[zone:column 2]...[/zone:column]` instead of `[zone:col2]...[/zone:col2]`
- `[zone:col 3]...[/zone:col]` instead of `[zone:col3]...[/zone:col3]`

`normalizeZoneTags()` in `server/index.js` fixes these before validation:
1. Opening tags: `[zone:column N]` or `[zone:col N]` → `[zone:colN]`
2. Closing tags: pairs each opening `[zone:colN]` with the nearest following `[/zone:*]` and rewrites it to `[/zone:colN]`

This function MUST be called on both the first attempt and retry LLM output before `validateAnnotation()`.

### allowedSet construction rules

`buildExplainContext` in `explainContext.js` builds the `allowedSet` for P5Strong validation. Rules:
1. **Pattern-derived cells**: from `classifyPattern` results at the played position, best-move position, and (for blunders) opponent-response position. Tier 1 tags contribute cells; Tier 2 contributes abstract columns; Tier 3 is skipped.
2. **Played column**: always added as `{ col, validationOnly: true }` — the LLM may reference where the move was played.
3. **Contrast column** (blunders only): added as `{ col: contrastCol, validationOnly: true }` — the LLM may reference the better column.
4. **Played cell** (pending): the exact cell where the disc landed should also be whitelisted. Computed by counting discs in `col` within `movestring`.

`validationOnly: true` means the entry is used for P5Strong validation but excluded from the prompt's "Strategic reference cells" list. Columns with this flag are instead listed explicitly in the "Hard grounding rules" section with their exact zone tag format.

**Key files**:
- `connect-four/server/explainContext.js` — `buildExplainContext` (the grounding entry point)
- `connect-four/server/scripts/visualize_board.mjs` — board visualization (called via `spawnSync`)

## Game Blunder Writes (`insertGameBlunder`)

`insertGameBlunder(supabase, row)` in `server/insertGameBlunder.js` is the sole write path for all blunders — post-game analysis, puzzle attempts, and papergames imports. The client no longer writes blunders directly. As of migration 058 (anon free deep reveal) it writes when `row.user_id || row.device_uuid` (was `user_id`-only), so anonymous rows carry `user_id NULL` + `device_uuid`. The **owner decision** (user- vs device-scoped, or skip) is a separate pure, unit-tested module `server/anonBlunderAccess.js#resolveGameBlunderOwner(reqUser, game)` — the analyze handler calls it and passes the result's `user_id`/`device_uuid` into the row. `anonBlunderAccess.js` also exports `resolveQueueOwner` (coach-queue scoping) and `resolveExplainQuota` (whether the free-tier weekly quota runs) — the standard extract-decision-from-`index.js`-so-it's-unit-testable pattern, since `index.js` has no HTTP harness.

The `row` shape:
```js
{
  user_id,          // required — anonymous users are silently skipped
  board_state,      // movestring at the point of the blunder
  move_played,      // 0-indexed column actually played
  correct_move,     // 0-indexed best column
  pattern_category, // blunder tag slug; unrecognized tags are substituted with 'suboptimal_move'
  reason,           // human-readable reason string
  direction,        // 'defensive_miss' | 'enabled_opponent' | 'missed_own'
  severity,         // integer [0,10] score-spread measure
  blunder_severity, // real [0,1] tree-scan fraction, or null
  game_id,          // uuid FK → games(id), nullable — AI sparring game
  papergames_game_id, // uuid FK → papergames_games(id), nullable — papergames imported game
}
```

**Dual game-link columns**: `game_id` links to AI sparring games (`games` table); `papergames_game_id` links to imported papergames games (`papergames_games` table). Exactly one should be non-null for a given blunder row; both can be null for puzzle blunders. `insertGameBlunder` stamps whichever is provided — it does not enforce the "exactly one" constraint (that is left to the caller).

**`move_index` stamping**: `insertGameBlunder` computes `move_index` as `row.board_state?.length ?? null`. This is the 0-indexed global ply number where the blunder occurred. Callers do NOT pass `move_index` — the function derives it from `board_state`. The column and its partial unique indexes (`idx_blunders_papergames_unique` for papergames rows, `idx_blunders_game_unique` for AI-sparring `game_id` rows — migration 054) back the `23505`-as-success dedup for idempotent re-analysis/re-import per `(user_id, <fk>, move_index)`.

**Storage gate — `server/mistakeStorageRule.js`**: `classifyStoredMistake(bestScore, playedScore, movestring)` is the single shared gate that decides whether a non-optimal ply is written at all, and with which `quality`. All three write paths call it *before* `insertGameBlunder`/the `POST /api/blunders` insert: `POST /api/games/analyze`, `papergamesImporter.extractBlunders`, and `POST /api/blunders`. It returns `null` (do not store) for slower wins and dead-position faster losses; otherwise `{ quality }` graded by score drop (`> 4` → `'blunder'`). Its `playerHasPotentialWin(board, player)` liveness check (any 4-window free of opponent discs) is deliberately NOT the forbidden `bestScore < 0` skip — solver-lost-but-alive positions are still stored. See `data-model.md` for the full rule and rationale.

- `game_id` and `papergames_game_id` are both nullable. Pass `null` (or omit) when the blunder does not originate from that source.
- Returns `true` on success or a `23505` dedup (already recorded), `false` on any other DB error. Callers that track import quality (e.g. `importForUser`) count `false` returns as `blunderErrors`.
- Never throws or rejects — all errors are logged via `console.error`.
- Deduplication is handled by DB unique indexes; `23505` constraint violations return `true` (treated as success).

## Admin Batch-Generation Modules — Pure-Function Pattern (`lessonAudio.js`)

`server/lessonAudio.js` (spec 046 US3/US4) is the canonical shape for a future admin-triggered
batch-generation module — it mirrors `insertGameBlunder.js`'s extraction pattern (see "Game Blunder
Writes" above): pure, dependency-injected functions with no route-handler logic inline, so they're
directly `node --test`-able without an Express app or a real TTS provider.

- **`hashMessageText(text)`** — deterministic 16-hex-char `sha256(text)` prefix. Identity key for
  generated audio: identical text ⇒ same filename (no redundant re-synth); changed text ⇒ a new,
  distinct file. There is no separate manifest/registry/approval file — the lesson JSON's own `audio`
  field is the sole source of truth (contrast with spec 039's i18n-key-driven, manifest-gated coach TTS
  pipeline, which this module deliberately does NOT reuse or extend).
- **`generateLessonAudio(lesson, { synthesize = ttsSynthesize, dir = LESSON_AUDIO_DIR } = {})`** —
  dependency-injected `synthesize` and `dir` params are the test seam (a test passes a stub synthesize
  function and a temp dir; production code omits both and gets the real `server/ttsProvider.js`
  `synthesize` + the real `public/audio/lessons/` dir). Iterates only `lesson.slides[].coachMessages[]`
  (concept slides) — never `lesson.socratic`, which carries no `coachMessages`. Skips a message whose
  current `audio` already matches `hashMessageText(text) + '.mp3'` (no wasted TTS call). Each message's
  synthesis is isolated in its own try/catch — one failure doesn't abort the batch; that message's
  `audio` is left unset/unchanged and recorded in the `failed` array. Returns `{ lesson, generated,
  failed }`, mutating (and returning) the same lesson object passed in.
- **`pruneOrphanedLessonAudio(allLessons, dir = LESSON_AUDIO_DIR)`** — synchronous; computes the set of
  every `audio` basename referenced across all lessons, deletes any `.mp3` under `dir` not in that set,
  returns the list of deleted filenames.
- **`LESSON_AUDIO_DIR`** — exported constant (`public/audio/lessons/`), overridable per-call via the
  `dir` param for tests.

**Pattern to reuse for the next admin batch-generation feature**: export pure functions taking their
side-effecting dependencies (an API client, a filesystem root, etc.) as an optional `deps` object with
production defaults, keep all Express/route-handler concerns (auth middleware, request parsing,
response shaping) in `index.js`, and give the module its own `node --test` unit test file completely
independent of the HTTP layer.

## Annotation Gate (`POST /api/explain-move-llm`)

All LLM outputs from `/api/explain-move-llm` pass through `validateAnnotation` (in `server/annotationGate.js`) before being cached or delivered to the client.

### Signature

```js
validateAnnotation(explanation, board, allowedSet = null)
```

The third parameter `allowedSet` is an internal grounding contract array built by `buildExplainContext`. When provided, an additional check runs.

### Checks

The gate runs up to seven checks:

| Check | Description |
|---|---|
| **P1** — spec syntax/bounds | Every `[zone:SPEC]` must be a known format and resolve to ≥1 in-bounds cell. `tg` is always valid. |
| **P2** — column-reference consistency | For `colN` zones, any explicit column reference in the inner text must match N. |
| **P3** — forbidden terminology | Explanation must not contain disc notation (`\bR\b`, `\bY\b`), player names (Red/Yellow/Black), or engine jargon (forced win, the solver, forced_win, etc.). |
| **P5** — blocked 4-windows | Each zone must have at least one live 4-window (not blocked by both players) on the actual board. |
| **P6** — raw coordinates | Zone inner text must not contain raw coordinate strings like `c4r3` or `col5`. |
| **P5strong** — zone-vs-allowedSet (Epic B) | When `allowedSet` is provided: `tg` always fails; `colN` must match an allowed column; cell-level specs must appear in a CONCRETE-ELIGIBLE entry's `cells` list. ABSTRACT-ONLY entries satisfy `colN` zones but NOT cell-level zones. |

**Backward compatibility**: When the `allowedSet` parameter is `null` or omitted (old callers), P5strong is silently skipped. The Epic A API is fully preserved.

**Retry**: If the first attempt fails validation, the same prompt is sent to the LLM a second time (bypassing cache and quota). If the retry also fails, the fallback path is taken.

**Tier-1 fallback**: On double failure, the server reads the most recent `explanation_cache` row for the same `position_hash` and returns its `deep_reveal_json.fullText`, or the static string `"Detailed explanation unavailable."` if no row exists. The failure is logged to `deep_reveal_failures`. No quota unit is consumed.

**Quota timing**: The weekly quota is decremented only **after** a valid explanation is confirmed — never before the LLM call and never for fallback responses. Cache hits (served before the LLM is called) also do not consume quota.

**All-or-nothing rejection**: If ANY zone fails ANY check, the entire LLM output is rejected (FR-010).

**Relevant modules**:
- `server/zoneParser.js` — `parseZoneSpecs`, `expandSpec`, `isValidSpec`
- `server/annotationGate.js` — `validateAnnotation`, `checkP1`–`checkP6`, `getWindowsThroughCell`, `isWindowBlocked`
- `server/migrations/031_deep_reveal_failures.sql` — failure log table DDL

## Deep Reveal Quota

The `/api/explain-move-llm` endpoint enforces a weekly quota for free-tier users.

- **Authentication**: Unauthenticated requests (no valid `Authorization` header) return `401 Unauthorized`. No quota logic is reached.
- **Cap**: 20 Deep Reveals per week for free-tier users.
- **Reset**: Monday 00:00 UTC. The `deep_reveal_reset_at` column stores the next reset timestamp. A `null` value is treated as "already expired" — the quota resets to next Monday and the request is allowed.
- **Paid-tier**: No quota check; all requests are allowed unconditionally.
- **429 response shape**: `{ error: 'quota_exceeded', resetsAt: <ISO string> }`.
- **Endpoint scope**: Quota is enforced on `/api/explain-move-llm` only. The old `/api/explain-move` endpoint does NOT decrement quota.

## Supabase Two-Client Pattern

**MUST**: `server/index.js` initializes **two** separate supabase client instances from the same service role key:

```js
supabase    = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
authClient  = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
```

- `supabase` — DB operations ONLY: `from()`, `rpc()`. **Never** call `auth.*` on this client.
- `authClient` — auth operations ONLY: `getUser()`, `refreshSession()`, `signInAnonymously()`.

**Why**: supabase-js v2 `auth.getUser(userToken)` stores the user's JWT as the client's active session. If `supabase` is reused for auth calls, subsequent DB inserts run as `authenticated` instead of `service_role`, bypassing BYPASSRLS and triggering RLS 42501 errors. See memory `bug-supabase-js-session-contamination`.

**MUST NOT** add `auth.*` calls on the `supabase` DB client. Both clients are always initialized together — `!supabase` guards are sufficient for both.

## Session Persistence & Silent Refresh (spec 045)

**`REFRESH_TOKEN_MAX_AGE`** (`server/index.js`) is **60 days** (`60 * 24 * 3600_000`), up from 7 days pre-spec-045. `ACCESS_TOKEN_MAX_AGE` is unchanged at 1 hour. All 4 cookie-set sites (`POST /api/auth/callback`, `POST /api/auth/refresh`, `GET /api/auth/session`, `POST /api/auth/anonymous`) read the same module-level constant — never hardcode a duplicate literal.

**`server/authRefresh.js`** exports `createAttemptRefresh({ authClient })`, a factory that binds a testable `attemptRefresh(refreshToken) → Promise<{accessToken, refreshToken} | null>`:
- Calls `authClient.auth.refreshSession({ refresh_token })`; returns `null` on any failure (invalid/expired/revoked token, or thrown error) — the caller decides the HTTP response (typically 401 + clear both cookies).
- `index.js` constructs one shared instance (`const attemptRefresh = createAttemptRefresh({ authClient })`) and both `POST /api/auth/refresh` and `GET /api/auth/session` import/call it.

**`POST /api/auth/refresh` and `GET /api/auth/session` deliberately stay inline in `index.js`.** There is **no `authRoutes.js` module** — unlike the `registerUserRoutes`/`registerStripeRoutes` extraction pattern (see below), spec 045's plan.md reconciled this explicitly: only `attemptRefresh` (the exchange logic) was extracted to `authRefresh.js`; the two route handlers that call it were left in place in `index.js` alongside the other `/api/auth/*` routes (`callback`, `signout`, `anonymous`). Do not extract these two routes into a new module without re-reading that reconciliation note in `specs/045-account-session-checkout/plan.md`.

**No de-dup Map — documented absence, not a gap.** `specs/045-account-session-checkout/research.md` (R1, 2026-07-11) empirically confirmed this project's Supabase/GoTrue instance does **not** enforce refresh-token rotation-with-reuse-detection: a refresh token that has already been exchanged for a newer one still works, and concurrent calls presenting the same refresh token both succeed independently rather than racing/conflicting. Because of this, `attemptRefresh` has **no** single-flight coordination (no Map keyed by refresh token, no in-flight promise cache) — the original contract draft (`contracts/api-auth-session.md`) called for one, but it was intentionally not built once the empirical finding came back. Coverage is 2 concurrency regression tests instead (`authRefresh.test.mjs`). **Caveat**: this was only tested against anonymous sessions — do not assume it generalizes to every auth provider config without re-verifying. If a future GoTrue upgrade or config change turns out to enforce rotation-with-reuse-detection, a de-dup Map would then become necessary — do not silently "re-add" one without first re-confirming the current behavior has actually changed.

`GET /api/auth/session` falls through to `attemptRefresh` before returning 401 (silent refresh) — see api-conventions.md for the exact processing order. Response shape is unchanged: `{ user: { id, tier } }`.

**FR-007 (in-flight sign-in guard)**: no client-side guard was needed. The OAuth hash-callback branch of `ProfileStore.checkSession` returns early after `POST /api/auth/callback` succeeds, before `GET /api/auth/session` is ever called — the two code paths are mutually exclusive by control flow, not by an added coordination check.

## PaymentProcessor Seam (spec 045)

`server/paymentProcessor.js`, `server/stripeProcessor.js`, and `server/stripeRoutes.js` extract the Stripe integration into a swappable interface, mirroring the `registerUserRoutes(app, supabase)` pattern below:

- **`paymentProcessor.js`** — interface-only module: the `PaymentProcessor` JSDoc typedef (`createCheckout`, `handleWebhook`, `getSubscriptionStatus`), the `PaymentConfigError` class (carries `.status` so route code needn't know Stripe specifics), the pure `getSubscriptionStatus({ tier, stripeCustomerId })` function, and a generic `createPaymentProcessor({ createCheckout, handleWebhook, getSubscriptionStatus })` assembly helper.
- **`stripeProcessor.js`** — `createStripeProcessor({ stripeClient, supabase, monthlyPriceId, annualPriceId, webhookSecret, frontendUrl })` implements the interface against the real Stripe SDK. Also exposes `createPortalSession` (used by `/api/stripe/portal`, which is NOT part of the 3-method interface but lives on the same object for convenience).
- **`stripeRoutes.js`** — `registerStripeRoutes(app, paymentProcessor)` registers `POST /api/stripe/create-checkout`, `POST /api/stripe/webhook`, and `POST /api/stripe/portal`, extracted verbatim out of `index.js`. `index.js` constructs `paymentProcessor` once at boot (`STRIPE_SECRET_KEY` present → `createStripeProcessor(...)`, else `null`) and calls `registerStripeRoutes(app, paymentProcessor)` once, exactly as it calls `registerUserRoutes(app, supabase)`.

**Why this seam matters (US4 substitutability)**: because `registerStripeRoutes` takes `paymentProcessor` as a plain argument rather than closing over a module-scope `stripe` singleton, a test can call it twice against two fresh Express apps — once with `StripeProcessor`, once with a `StubProcessor` — and assert identical route behavior with zero production code changes. See `specs/045-account-session-checkout/contracts/payment-processor-interface.md`.

**`getSubscriptionStatus` is deliberately test-only in production wiring.** No production call site is wired through it — real paid-gates read `req.user.tier` directly (populated by `loadUser`). It exists solely to prove the `PaymentProcessor` interface's substitutability (the same three-method shape a `StubProcessor` implements). This is by design, not a gap — do not "fix" it by wiring a call site unless a new requirement actually needs a derived (non-`tier`) subscription status.

### FR-025: status-based tier mirror

`stripeProcessor.js`'s `handleWebhook` makes `users.tier` a **live derivation of Stripe subscription status**, not a value set once at purchase:
- `checkout.session.completed` → `tier: 'paid'` + `stripe_customer_id` write + fire-and-forget `tracks` insert (`event: 'upgrade_completed'`).
- `customer.subscription.updated` with status `active` or `trialing` → `tier: 'paid'`.
- `customer.subscription.updated` with status `past_due` → **no write** (Stripe's automatic retry window; a single transient card decline must not downgrade a paying user).
- `customer.subscription.updated` with status `canceled` or `unpaid` → `tier: 'free'`.
- `customer.subscription.deleted` → `tier: 'free'` unconditionally (explicit terminal cancellation).

**Webhook idempotency**: before any tier write, `handleWebhook` inserts into `stripe_events` (`stripe_event_id` UNIQUE) and checks the result — a `23505` unique-violation means the event was already processed, so the handler returns `{ handled: false, eventType: 'duplicate' }` and skips the tier write and `tracks` insert entirely. This mirrors `insertGameBlunder`'s `23505`-as-success dedup pattern (see Game Blunder Writes above). A non-dedup insert error is logged and processing continues (matches prior fire-and-forget behavior for genuine DB errors).

### Webhook raw-body middleware ordering

`app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }))` is mounted in `index.js` **before** the global `app.use(express.json())`. This is load-bearing: Stripe signature verification (`stripeClient.webhooks.constructEvent`) needs the exact raw request bytes. If the global JSON parser ran first, it would consume and re-serialize the body, and signature verification would fail. Never reorder these two `app.use()` calls, and never add a new global body-parsing middleware ahead of the webhook route's raw parser.

### `loadUser` — `stripe_customer_id` fix (R3)

`loadUser` now selects `stripe_customer_id` on all three of its code paths (existing row, freshly-inserted row, anonymous-fallback default), via a single shared source of truth in `server/userHelpers.js`:
- `USER_PROFILE_SELECT_COLUMNS` — the `.select()` column list string: `'tier, deep_reveal_count, deep_reveal_reset_at, device_uuid, papergames_id, last_import_at, stripe_customer_id'`.
- `defaultUserProfile()` — the default object `loadUser` attaches to `req.user` when no `users` row exists yet; field set mirrors `USER_PROFILE_SELECT_COLUMNS` (`stripe_customer_id: null`).

Before this fix, `req.user.stripe_customer_id` was always `undefined`, which broke `POST /api/stripe/portal` (needs the Stripe customer id to open a billing portal session) and made `getSubscriptionStatus`'s `stripeCustomerId` argument meaningless. Any future addition to the `users` profile columns `loadUser` needs should extend `USER_PROFILE_SELECT_COLUMNS`/`defaultUserProfile()` together, not one in isolation.

## Environment Variables

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for server DB access |
| `ANTHROPIC_API_KEY` | LLM annotation (optional; falls back to template text) |
| `STRIPE_SECRET_KEY` | Stripe API (optional) |
| `STRIPE_MONTHLY_PRICE_ID` / `STRIPE_ANNUAL_PRICE_ID` | Stripe price IDs |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature verification |
| `OPENAI_API_KEY` | OpenAI API key for LLM coaching endpoints (optional; affected endpoints return 503 if absent) |
| `OPENAI_MODEL` | **Mini** production model (e.g. `gpt-5.4-mini`). Used by ALL production LLM endpoints, including `/api/explain-move-llm` (via `computeMechanism`) and `llmCoachHelpers.callLLM`. Required alongside `OPENAI_API_KEY`. |
| `EXPLAIN_MODEL` | **Full** model (e.g. `gpt-5.4`). Eval-only — read solely by the offline eval CLI `scripts/compute.mjs --llm`. NOT used by any production endpoint despite the name. |
| `SENTRY_DSN` | Error tracking (optional) |
| `FRONTEND_URL` | Used in Stripe redirect URLs (default: `http://localhost:5173`) |
| `PORT` | Server port (default: 3001) |

All external clients (`supabase`, `anthropic`, `stripe`) are initialized conditionally — the server starts and serves requests even when these are absent, returning 503 for affected endpoints.

## SPA Catch-all Route

The server hosts the built SPA (`dist/`) and serves `dist/index.html` for all non-API paths via a catch-all route.

**Registration order** (enforced by Express route order):
1. All `/api/*` routes
2. `app.use(express.static(join(__dirname, '../dist')))` — serves JS/CSS/asset files
3. Catch-all for HTML — registered last

**Express 5 wildcard syntax**: Use `app.get('/{*path}', handler)` — bare `app.get('*', ...)` throws `PathError` at startup in Express 5 (path-to-regexp no longer accepts unparameterized `*`).

**`dist/index.html` caching**: Read once at startup into a module-level `let indexHtml`. If the file is absent (e.g., pre-build), log a warning and return 500 from the catch-all. Never read or write it per-request.

**OG injection**: For `/game/:id` paths, inject `<meta property="og:title">` and `<meta property="og:description">` before `</head>` using a local `patched` variable. Never mutate the cached `indexHtml` string.

**`/blunder/:id` OG + noindex injection**: The blunder permalink is unlisted-but-public (see `api-conventions.md` → `GET /api/blunders/:id`), so the catch-all both advertises it for sharing and keeps it out of search indexes:

- When the id is a valid UUID (`UUID_REGEX`) and the blunder row exists, inject `<meta property="og:title" content="Connect Four blunder — <human category>">`, an `og:description`, **and** `<meta name="robots" content="noindex, nofollow">`. The human category comes from a small `CATEGORY_LABELS` map with a `snake_case → Title Case` fallback.
- The `noindex, nofollow` robots tag is injected for **every** `/blunder/*` request — including malformed/non-UUID ids, 404s (no matching row), DB errors, and when Supabase is unconfigured. A blunder page must never be indexable, even on the fall-through paths.

---

## Route Module Organization

**`server/userRoutes.js`** (spec 030): The 15 `/api/user/*` endpoints are extracted into `registerUserRoutes(app, supabase)` — the first route module extracted from `index.js`. This pattern enables endpoint tests to create a clean Express app with a mock supabase client and test HTTP handler logic without the real DB.

**Registration**: `index.js` imports `registerUserRoutes` and calls it once after `app.use(loadUser)`:
```js
import { registerUserRoutes } from './userRoutes.js';
// ... after app.use(loadUser):
registerUserRoutes(app, supabase);
```

**`server/userHelpers.js`** (spec 030): Five per-table write helpers (`writeSessionStats`, `writeLessonProgress`, `writePuzzleAttempts`, `writeSparringRecord`, `writeStreak`) used by both the individual POST endpoints and the migrate endpoint — single write path per table. All return `{ error: string }` on failure, `undefined` on success. Unit-tested independently with `node --test` against stub supabase objects.

**MUST**: When adding a new `/api/user/*` endpoint that writes to one of the 5 covered tables, call the existing helper rather than reimplementing the write inline.

**MUST**: New route groups with >=5 related endpoints SHOULD follow the `register<Feature>Routes(app, supabase)` extraction pattern rather than inlining in `index.js`. The module should be testable without the real DB or solver.

## In-Memory Job Map Pattern (spec 038)

The papergames import endpoints (`POST /api/user/papergames/import` and `GET /api/user/papergames/import/status`) use a **module-level `Map`** for job state:

```js
// Module-level in userRoutes.js — persists for process lifetime
const jobMap = new Map();
```

**Key**: `jobId` (UUID string, generated via `crypto.randomUUID()`).
**Value**: `{ jobId, userId, status, imported, skipped, blunderErrors, capReached, error }` where `status` is one of `pending | running | done | error`. `blunderErrors` counts the number of blunder rows that failed to write (non-dedup errors from `insertGameBlunder`); exposed in the status response so the frontend can warn the user.

**Lifecycle**:
1. **Created** when `POST` spawns a new job (C2d) — status `pending`.
2. **Updated to `running`** immediately before `importForUser` is called in the async path.
3. **Updated to `done` or `error`** when `importForUser` resolves or rejects.
4. **Never deleted** — entries accumulate in the Map for the server process lifetime.

**Persistence**: None. Jobs exist ONLY in memory. A server restart clears all entries, and any in-flight import is lost without recovery. The `last_import_at` timestamp on the `users` table provides a partial recovery mechanism — on next import, the incremental stop (`room.createdAt < lastImportAt`) prevents re-processing already-imported games.

**Concurrency**: The one-in-flight guard (C2c) iterates all Map values looking for an entry with the same `userId` and status `pending` or `running`. This prevents concurrent imports for the same user. The Map is not locked — concurrent modifications are possible in theory but practically impossible because:
- A user cannot issue two `POST` requests before the first returns (single-threaded browser)
- The async path uses `Promise.resolve().then(...)`, not a separate thread

**Ownership verification**: The `GET /api/user/papergames/import/status` handler checks `job.userId !== req.user.id` and returns 404 (not 403) — a privacy-preserving pattern that prevents attackers from probing whether a given jobId exists.

---

## Lesson Loader

`server/lessonLoader.js` is the canonical module for loading lesson content from JSON files at server startup.

**Startup loading pattern**: `fs.readdirSync` + `JSON.parse(fs.readFileSync(..., 'utf8'))` — synchronous, runs once at startup. Results are cached in a module-level array. No I/O occurs at request time.

**In-memory cache**: `getLessons()` and `getLesson(id)` return from the in-memory cache only — no filesystem reads on request.

**Validation and exclusion**: Each file is validated for required fields (`id`, `title`, `free`, `userPerspective`, `slides`, `socratic`, `confirmationCategory`, `confirmationCount`) and `boardSpec` array length (must be 7). Files failing validation are logged via `console.error` and excluded. The server never crashes due to a malformed lesson file.

**`order` derivation**: Extracted from the filename numeric prefix (e.g., `lesson-05-claimeven.json` → `order: 5`). Lessons are sorted ascending by `order` before caching.

**Directory**: `connect-four/lessons/`. Ships empty in Epic 4; content added in Epic 5.

---

## Migration Runner (`migrate.js`)

`server/migrate.js` is the database migration runner. It reads `.sql` files from `server/migrations/`, compares against a `schema_migrations` ledger table, and applies pending migrations inside transactions. It runs as the first step of the Railway start command (`node server/migrate.js && node server/index.js`); a non-zero exit blocks the server from starting.

### DATABASE_URL requirement

`DATABASE_URL` **MUST** use the Supabase **session-mode pooler** (port **5432**) with `sslmode=no-verify` appended to the connection string. The connection is still SSL-encrypted; `no-verify` skips certificate chain validation which is necessary because Supabase's pooler uses self-signed certificates. (`sslmode=require` triggers strict certificate verification in the `pg` driver v8.21+, which fails against Supabase poolers.)

The **transaction-mode pooler** (port **6543**) is **forbidden** — it breaks multi-statement transactions (each statement may execute on a different backend connection) and does not support `pg_dump`.

Example correct format:
```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres?sslmode=no-verify
```

### schema_migrations ledger table

Self-bootstrapped by `migrate.js` as its first database action:

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename   TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT now()
);
```

- `filename` is the `.sql` basename (e.g., `001_initial.sql`), not a full path.
- `PRIMARY KEY` on filename enforces uniqueness; `ON CONFLICT DO NOTHING` in baseline mode is safe.
- No foreign keys, no RLS — this is a server-managed operational table, not a user-data table.

### Normal mode (default)

1. Creates `schema_migrations` table if it does not exist.
2. Reads all `.sql` filenames from `server/migrations/`, sorted alphabetically.
3. Reads all `filename` values from `schema_migrations`.
4. Computes `pending = disk_files − ledger_set`.
5. For each pending file in alphabetical order:
   - Acquires a client from the pool
   - `BEGIN` transaction
   - Executes the file's SQL
   - `INSERT` filename into `schema_migrations`
   - `COMMIT`
   - On any error: `ROLLBACK`, prints error identifying the failing file to stderr, exits 1
6. Prints summary, exits 0.

### Baseline mode (`--baseline`)

Invoked as `node server/migrate.js --baseline`. Records all `.sql` filenames present on disk without executing any SQL from those files.

1. Creates `schema_migrations` table if it does not exist.
2. Reads all `.sql` filenames from `server/migrations/`, sorted alphabetically.
3. For each filename: `INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING`.
4. Prints count of rows recorded, exits 0.

**Idempotency**: `ON CONFLICT DO NOTHING` makes repeated `--baseline` runs safe. After `--baseline`, a normal `migrate.js` run finds all filenames in the ledger and applies 0 new files.

**Runtime**: Must be run from `connect-four/`, or from any directory where `server/migrations/` resolves correctly relative to the script's `__dirname`.

### Transaction rollback behavior

Each migration file runs inside its own `BEGIN/COMMIT` transaction. A failure:
- Rolls back only that file's SQL (prior files remain committed)
- Does NOT insert a row into `schema_migrations` for the failing file
- Prints `ERROR: Migration [filename] failed. Transaction rolled back.` to stderr
- Exits with code 1, which causes `&&` in the Railway start command to skip `node server/index.js`

### Exit codes

| Code | Meaning |
|---|---|
| 0 | Success |
| 1 | Failure — DATABASE_URL absent, connection error, migration SQL error, or file read error |

---

## Repo Hygiene — `.claude/` Tracking Decision (spec 047 US4)

**Decision (2026-07-12): `.claude/` stays tracked in git.**

**Rationale**: The project actively depends on `.claude/projects/.../memory/MEMORY.md` and its linked
memory files as durable, cross-session, checked-in memory — this is a deliberate design choice (see this
file's project CLAUDE.md, "Where information lives: memory vs. docs/architecture"), not an accident.
Untracking `.claude/` would break that workflow: memory would no longer survive a fresh clone or a
teammate's checkout, and the append-only memory-index convention depends on git history for provenance.

The Epic 7 audit (F9) flagged `.claude/` as tracked reconnaissance-useful operational detail (skills
content, memory of past bugs/decisions, internal architecture discussion) but found **no secrets** in it —
the tradeoff is between some recon-useful detail being visible in a public/shared repo versus losing a
working, load-bearing memory system. Given no secrets are present, this feature keeps `.claude/` tracked
and accepts that tradeoff explicitly, rather than leaving the status quo unexamined. If the repo's
visibility model changes (e.g., a public open-source release), this decision should be revisited — the
recon-detail cost is a function of who can read the repo, not a fixed property of `.claude/` itself.

## Security Regression Guards (spec 047 US4, audit F10 positive controls)

The Epic 7 audit found the following properties **sound by design** at the time of the audit. They are
recorded here as an explicit checklist so future work does not silently reintroduce a regression on any
of them. Any PR touching an area below should re-confirm the guard still holds:

1. **Service-role Supabase key stays server-only.** No `createClient`, `SUPABASE_SERVICE_ROLE_KEY`, or
   `sb_secret`-prefixed key literal may appear anywhere under `connect-four/src/` (the frontend bundle).
   The service-role key is read only in `connect-four/server/`.
2. **RLS stays enabled, deny-by-default, on every user-data/backend table** — including the `llm_usage`
   table added by spec 047 US5. A new table with user-scoped rows MUST ship with an RLS policy denying
   anonymous/`authenticated`-role reads by default; server access relies on the `service_role` BYPASSRLS
   grant, never a permissive table-level policy.
3. **Solver invocations stay `spawn`/`spawnSync` with array args, never `shell: true`.** All c4solver
   process invocations (`c4solver-wrapper.js` and any one-shot spawn site) MUST pass argv as an array;
   never construct a shell command string or set `shell: true`.
4. **No CORS middleware is added.** The API and SPA are served same-origin from one Express process by
   design (see "SPA Catch-all Route" above). Do not add `cors` middleware or permissive
   `Access-Control-Allow-Origin` headers without a documented reason re-litigating this.
5. **No `dangerouslySetInnerHTML` / raw `innerHTML` / `eval` / `new Function`** may be introduced under
   `connect-four/src/`. All rendered strings go through normal JSX text interpolation.
6. **`tier` stays writable only by the Stripe webhook path.** `users.tier` MUST NOT be set by any
   client-writable endpoint or user-controlled request field — the sole write path is
   `stripeProcessor.js`'s `handleWebhook` (see "PaymentProcessor Seam" above, FR-025 status mirror).
7. **Stripe webhook signature verification stays on the raw body.** `stripe.webhooks.constructEvent` MUST
   continue to run against the raw (unparsed) request body — see "Webhook raw-body middleware ordering"
   above. Never let a global JSON body-parser run ahead of the webhook route.

## Localhost/IP gating under `trust proxy` (spec 047 US3, FR-009)

`requireLocalhost` (gate on all `/api/admin/*` and `/api/debug/*` routes) MUST derive the peer address from
**`req.socket.remoteAddress`**, never from `req.ip`. Because `app.set('trust proxy', 1)` is set globally
(required so `express-rate-limit` sees real client IPs behind Railway's edge), Express computes `req.ip`
from the client-supplied `X-Forwarded-For` header for one hop — so a direct (non-proxied) caller can send
`X-Forwarded-For: 127.0.0.1` and spoof any `req.ip`-based localhost check. `req.socket.remoteAddress` is the
raw TCP peer and is header-immune. In production this is Railway's proxy IP for all external traffic (→
rejected); only a genuine on-box loopback connection (an operator shell in the same container) passes —
which is exactly the intended "localhost-only" semantics. **Any new IP-based or localhost gate anywhere in
the server must follow this rule**; reaching for `req.ip` reintroduces the spoof. (The original spec-047
planning wrongly assumed `trust proxy` made `req.ip` safe; the bug was reproduced and fixed in QA.)
