# Server Conventions

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
**MUST NOT**: Hard-code category slug lists anywhere else in server code — always import from `categories.js`.

## Classifier vs Predicate Evaluator — Explicit Separation

**MUST NOT** conflate these two systems — they are independent:

- `classifier.js` → **labeling only**: determines which tactical pattern a position exhibits. Output: a category slug and evidence tags. Used for puzzle curation, candidate generation, and coach explanations.
- `predicates.js` → **correctness scoring only**: determines whether the learner's move satisfies the puzzle goal. Output: `'correct' | 'wrong' | 'tied'`. A classifier tag does NOT imply predicate correctness, and a correct move does not require a matching classifier tag.

A puzzle's `category` field is set by the classifier at generation time. The predicate evaluator reads `category` to dispatch to the right evaluator, but the classifier is never called during puzzle-check requests.

## Predicate Evaluator

`evaluatePredicate(puzzle, candidateCol, scores)` in `predicates.js` dispatches on `puzzle.category`.
Returns `{ result: 'correct' | 'wrong' | 'tied', correctCol?, tiedWith?, forbiddenCols? }`.

New category evaluators MUST be added as a named function `eval<CategoryCamelCase>(candidateCol, puzzle)` and registered in the `switch` statement.

Categories that store their answer in `highlightMetadata` (z_threat, undercut, overcut) read `puzzle.highlightMetadata`.
Categories that store their answer as a scalar (claimeven, figure_7, j_shape) read `puzzle.correctCol`.

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

## Forward Simulation (`explainSimulate`)

`explainSimulate(movestring, numPlies, anchorCell, perspective, solver, options={})` in `explainSimulate.js`
plays out optimal continuations and aggregates which tactical patterns appear at the leaves.
It answers "what does this move set up?" for the coach LLM.

```
options.detectors  — string[] of detector names to enable.
                     Default: all names in DETECTOR_REGISTRY (including 'claimeven').
                     Example (exclude claimeven):
                       DETECTOR_REGISTRY.map(d => d.name).filter(n => n !== 'claimeven')
```

**Key design decisions**:

- **Detector registry** (`DETECTOR_REGISTRY` in `explainSimulate.js`): all detectors are
  declared as `{ name, fn, isAsync, histType }` entries. Sync detectors receive `(board, scores)`;
  async detectors receive `(board, solver)`. `options.detectors` filters this registry before
  each simulation. Only patterns in the active registry appear as keys in the output `patterns`
  object. **Adding a new detector = one entry in `DETECTOR_REGISTRY`; no other code changes
  required.**
  - `histType: 'col'`  → output entry has `colHistogram` keyed by column index string
  - `histType: 'cell'` → output entry has `cellHistogram` keyed by `"colC,rowR"`
  - `histType: null`   → no histogram field

- **Claimeven cost**: `detectClaimeven` is async and issues ~20 solver queries per call via
  `runClaimevenSimulation`. It is included in the default registry. To exclude it for speed,
  filter it out via `options.detectors`. Measure actual cost via `result.timing.solverCalls`.

- **Leaf filtering**: only leaves where `currentPlayer === perspective` contribute to `frequency`
  and histograms. All leaves count toward `total`. This ensures patterns are attributed to the
  correct player without special-casing the recursion logic.

- **Solver score cache**: a `Map<movestring, scores>` allocated per `explainSimulate()` call
  and threaded through `collectLeaves`. Avoids redundant queries when the same position is
  reached via different paths. Cache key is the literal movestring — transpositions via
  different column orderings are not detected as the same entry.

- **Won-position safety**: if `board.hasWon(1) || board.hasWon(2)`, the solver is not queried
  (it rejects positions reached through winning moves). Zero scores are used; detectors run
  safely and return `matched: false` for solver-dependent patterns.

- **anchorCell**: fixed for the entire recursion tree. The caller computes it as
  `{ col, row: new Board(movesBeforePlay).colHeights[col] }` before calling `explainSimulate`.
  Disc-involvement tracking (`withAnchorDisc`) checks whether the anchor cell appears in
  each matched pattern's active cells. For patterns without cell-level geometry
  (immediate_threat, double_threat, forced_block, forced_win, forbidden_columns — these return
  `cols` arrays only), involvement is determined by column match alone (noted as column proxy).

- **`timing` return field**: every call returns `{ totalMs, solverCalls, solverCacheHits }`.
  `solverCalls` counts cache misses only (actual `solver.query()` invocations).
  `solverCacheHits` counts positions served from the score cache.

**Cost estimate** (branching factor b ≈ 3):

| numPlies | Tree solver calls | +claimeven (~20/node) | Total with claimeven |
|---|---|---|---|
| 2 | ~21 | ~9 nodes × 20 = ~180 | ~200 |
| 3 | ~40 | ~13 nodes × 20 = ~260 | ~300 |
| 4 | ~120 | ~40 nodes × 20 = ~800 | ~920 |

Run `./explain_simulate.sh <movestring> <col> <numPlies>` and check the printed `Timing` line
to get the real numbers for a specific position.

## Solver Score Semantics (Critical Invariant)

At forced-win terminal positions, all opponent columns score identically — the solver cannot identify which column blocks. Use direct `checkWin` board detection instead.
Reference: `reference_c4solver_behavior.md` and `reference_cat5_forced_block_detection.md` in memory.

## Threat-Counting Invariant

Pattern detectors (`detectFigure7`, `detectJShape`) count threats at any reachable empty cell `(col, row)` where `row >= colHeights[col]`. A threat is valid even if pieces must fill below it first — those pieces arrive in the natural course of play. Use `board.reachableThreats(player)` (backed by `getReachableThreats`) for this.

The gravity-top restriction (only `row === colHeights[col]`) applies exclusively to `immediate_threat` and `forced_block` detection, which reason about the current player's single immediate move.

`getImmediateThreats` / `board.immediateThreats(player)` uses the gravity-top restriction and is reserved for immediate-move semantics (`detectClaimeven`, forced-block checks). Do not use it in pattern detectors.

## LLM Coach Helpers (`llmCoachHelpers.js`)

`connect-four/server/llmCoachHelpers.js` is the shared module for all LLM coaching server endpoints. It exports:

- `buildRecommendPrompt({...})` — assembles the full move-recommendation prompt
- `buildFlatTable(colData, rounds)` — formats the per-column pattern table for the prompt
- `getScoreTier(col, score, immediateWinSet, immediateLossSet)` — classifies a column into IMMEDIATE WIN / WINS / DRAWS / LOSES / IMMEDIATE LOSS
- `isMajorThreatForPlayer(board, col, row, player)` — checks whether a cell is a 3+empty major threat; not exported from `classifier.js`, this is the canonical server location
- `getBoardVisualization(movestring)` — shells out to `scripts/visualize_board.mjs` via `spawnSync`, strips the `scr` row
- `buildKBSection(patternNames)` / `loadKBStatement(id)` — loads KB article statements for active patterns
- `callLLM(prompt)` — calls OpenAI chat completions API; reads `OPENAI_API_KEY` / `OPENAI_MODEL` from env
- `TIER_ORDER`, `IMMEDIATE_WIN_OUTCOMES`, `PATTERN_KB` — shared constants
- `selectContrastMove(scores, userCol, board)` — pure; returns `{ contrastCol, isOptimal }` or `null` when all legal scores are equal. `isOptimal=true`: user played best, contrast = second-best; `isOptimal=false`: user played suboptimally, contrast = best. Tie-break: closest to col 3.
- `computeDeltaTable(userPatterns, contrastPatterns)` — pure; returns `{ rows, insufficientTacticalData }`. Rows are `{ name, userRatio, contrastRatio, delta, userTop2, contrastTop2 }` sorted by delta descending.
- `buildExplainPrompt({ boardViz, postBoardViz, playerName, isOptimal, userCol, contrastCol, deltaRows, insufficientTacticalData, allLinesDecided, rounds, totalLeaves, userOutcomes, contrastOutcomes, kbSection, forcedBlockNote, blunderNote })` — pure; builds the LLM prompt for `/api/explain-move-llm`. Solver scores never appear in output. Column references are 1-indexed to the LLM. `boardViz` = pre-move board, `postBoardViz` = post-move board.
- `PATTERN_NAMES` — ordered string array of the 11 pattern names consumed by `computeDeltaTable`

**Critical invariant**: solver scores are NEVER passed to the LLM. `getScoreTier` translates scores to tier labels (WINS/DRAWS/LOSES), and `getBoardVisualization` strips the `scr` row from board output. This invariant MUST be preserved by all callers.

The CLI scripts (`scripts/recommend_next_move.mjs`, `scripts/explain_move.mjs`) import from this module. Server endpoints (`/api/recommend-move`, `/api/explain-move-llm`) also import from it and reuse the server-managed solver singleton rather than spawning their own.

## LLM Explanation Scripts

CLI scripts that call an LLM must load `connect-four/server/.env` via Node's built-in
`--env-file` flag (Node 20.6+). The shell wrapper at the project root is the single
call site for this flag (e.g. `explain_move.sh`). Scripts themselves read
`process.env.OPENAI_API_KEY` and `process.env.OPENAI_MODEL` directly — no `dotenv`
package needed.

**LLM prompt structure contract** for move explanations (`buildExplainPrompt` / `explain_move.mjs` / `/api/explain-move-llm`):

1. `## Role` — coach persona and move quality framing (strong / weak)
2. `## Move context` — player name, column played, optional forced-block / blunder annotations
3. `## Board position (BEFORE ...)` — pre-move `visualize_board.mjs` output, `scr` row stripped
4. `## Board position (AFTER ...)` — post-move `visualize_board.mjs` output, `scr` row stripped
5. `## Pattern comparison` — delta table from two `explainSimulate` calls (user move vs contrast move), sorted by |Δratio|, showing top-2 histogram entries per row
6. `## Pattern definitions` — KB article statements for active patterns (optional)
7. `## Task` — grounding instruction targeting 2–4 sentence response

Solver scores are intentionally excluded from the prompt. The LLM reasons from tactical patterns, outcome rates, and KB definitions only.

When all pattern ratios are zero for both compared moves, `insufficient_tactical_data` is set and section 4 includes an explicit "No tactical patterns detected" notice rather than silently omitting the section (Principle VI: validate signal before use). The LLM is still called but told it has no pattern data.

**Contrast move selection**: if the user's move was suboptimal, the contrast is the best legal move; if optimal, the contrast is the second-best. Center column (col 3) breaks ties. If all legal scores are equal, the script exits without calling the LLM.

**Key files**:
- `connect-four/server/scripts/explain_move.mjs` — full PoC logic (no server required)
- `explain_move.sh` — shell wrapper at project root (`./explain_move.sh <movestring> <col> [rounds=1]`)
- `connect-four/server/scripts/visualize_board.mjs` — board visualization (called via `spawnSync`)

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
| `OPENAI_MODEL` | OpenAI model name (e.g., `gpt-4o-mini`); required alongside `OPENAI_API_KEY` |
| `SENTRY_DSN` | Error tracking (optional) |
| `FRONTEND_URL` | Used in Stripe redirect URLs (default: `http://localhost:5173`) |
| `PORT` | Server port (default: 3001) |

All external clients (`supabase`, `anthropic`, `stripe`) are initialized conditionally — the server starts and serves requests even when these are absent, returning 503 for affected endpoints.
