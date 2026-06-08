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

Current slugs (as of Epic 6): `immediate_threat`, `forced_block`, `double_threat`, `forced_win`, `forbidden_columns`, `odd_even_threat`, `z_threat`, `claimeven`, `claimodd`, `undercut`, `overcut`, `figure_7`, `j_shape`.

`odd_even_threat` was added in Epic 6 as a free 2-star category. It is Red-only, `single_move` interaction mode, and has no `highlight_metadata`. Detection uses `immediateThreats` not `getMajorThreatCells`.
**MUST NOT**: Hard-code category slug lists anywhere else in server code — always import from `categories.js`.

## Blunder Tag Registry

**MUST**: All valid blunder tags are defined once in `server/blunderTags.js` as the `VALID_BLUNDER_TAGS` Set.

The set contains exactly 15 tags (as of Epic 2 batch 1): `immediate_threat`, `forced_block`, `forced_win`, `double_threat`, `undercut`, `overcut`, `figure_7`, `j_shape`, `z_threat`, `odd_even_threat`, `claimeven`, `claimodd`, `drawing_move`, `suboptimal_move`, `forbidden_columns`.

`VALID_BLUNDER_TAGS` is distinct from `VALID_CATEGORIES` in `server/categories.js` (which lists puzzle category slugs). Blunder tags are applied to sparring-game blunders via `tagBlunder()` in `classifier.js`. Any tag not in this set is substituted with `'suboptimal_move'` before INSERT into the `blunders` table.

**MUST** import `VALID_BLUNDER_TAGS` from `server/blunderTags.js` wherever a blunder tag is validated (e.g., the `POST /api/games/analyze` endpoint guard).
**MUST NOT** duplicate the tag set locally — always import from `blunderTags.js`.
**MUST NOT** conflate `VALID_BLUNDER_TAGS` with `VALID_CATEGORIES` — they serve different purposes.

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

## Classifier API — Perspective, classifyPattern, and tagBlunder

`classifier.js` exposes two functions beyond the category-level `classify()`:

### `classifyPattern(ms, perspective, solver)`

```js
classifyPattern(ms, perspective, solver) → Promise<Set<string>>
```

Returns the set of tactical pattern tags (e.g. `'immediate_threat'`, `'forced_win'`, `'z_threat'`) present for the given `perspective` on the position `ms`. Tags are drawn from all 13 detectors, run in parallel via `Promise.all`. Never contains `'unknown'`.

- `ms` — 0-indexed movestring.
- `perspective` — 1 (Red) or 2 (Yellow). The player whose patterns to detect.
- `solver` — c4solver wrapper with `.query(ms)` method.

**Inline detector list**: `classifyPattern` maintains its own inline list of 13 detectors. This list MUST be kept in sync with `DETECTOR_REGISTRY` in `explainSimulate.js`. `classifyPattern` must NOT import `DETECTOR_REGISTRY` directly to avoid a circular dependency (`explainSimulate.js` imports from `classifier.js`).

**Detector perspective parameter**: Every `detect*` function accepts a `perspective` parameter defaulting to `board.currentPlayer`. When `classifyPattern` calls detectors, it passes the explicit `perspective` — never relying on the default.

### `tagBlunder(moves, playedCol, correctCol, solver)`

```js
tagBlunder(moves, playedCol, correctCol, solver) → Promise<{ tag: string, direction: string, reason: string }>
```

Tags a blunder with the tactical pattern the player missed. Never throws — all errors resolve to the solver-error fallback `{ tag: 'suboptimal_move', direction: 'missed_own', reason: 'solver error: ...' }`.

- `moves` — 0-indexed movestring of the position where the blunder was made.
- `playedCol` — 0-indexed column the player actually played.
- `correctCol` — 0-indexed best column.
- `solver` — c4solver wrapper.

`direction` is one of:
- `'defensive_miss'` — blunderer had `forced_block` before playing (Step 1).
- `'enabled_opponent'` — the wrong move gives the opponent a pattern (Steps 2, 4).
- `'missed_own'` — the blunderer had a pattern before playing but lost it by playing elsewhere (Steps 3, 5 fallback).

**Priority cascade**: Step 1 (defensive_miss) > Step 2 (enabled_opponent, 1-ply) > Step 3 (missed_own) > Step 4 (enabled_opponent, continuation) > Step 5 (score-based fallback).

### FR-033: Two-step perspective contract

Five score-consuming detectors implement a **recursive two-step** pattern when called with a `perspective` that differs from `board.currentPlayer`:

- `detectForcedBlock`, `detectForcedWin`, `detectZThreat`, `detectOddEvenThreat`, `detectForbiddenColumns`

When `perspective !== board.currentPlayer && solver !== null`, each detector recursively evaluates **all** child positions (one per playable column) from the requested perspective. The pattern matches only if it matches from the requested perspective in **every** child position.

This IIFE (`(async () => { ... })()`) returns a Promise, so these five detectors become async when the perspective changes. The IIFE shields against terminal child positions (where the solver rejects) by returning `{ matched: false }` — a terminal game cannot exhibit tactical patterns.

Detectors that do NOT depend on solver scores (`detectImmediateThreat`, `detectDoubleThreat`, `detectUndercut`, `detectOvercut`, `detectFigure7`, `detectJShape`, `detectClaimodd`) never enter the IIFE — they only use board geometry, which is perspective-independent for threat analysis. `detectClaimeven` uses the solver independently via its simulation, not via the FR-033 IIFE.

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

- **Group recording at leaves** (T01/T02): `collectLeaves` now produces `groups: GroupRecord[]` for
  every terminal leaf (won and draw leaves). Won leaves record the winning 4-cell group via
  `findWinningGroup`. Draw leaves record all major-threat windows via `findMajorThreatWindows`.
  `aggregateLeaves` aggregates groups into a `Map<string, AggregatedGroup>` keyed by
  `canonicalCells:owner`. Each entry has `completed_freq` and `draw_freq` against `total_leaves`
  (all leaves: won + draw + depth_limit). This powers the grounding contract for the new
  explanation prompt templates.

- **`groups` return field**: `explainSimulate` now returns `groups: Map<string, AggregatedGroup>`
  alongside the existing `patterns`, `outcomes`, `timing` fields. The Map key is
  `sortedCellsCsv:owner` (e.g. `"c3r2,c4r2,c5r2,c6r2:player"`). Each value has:
  - `cells: string[]` — wire-format cell coords (e.g. `["c3r2","c4r2","c5r2","c6r2"]`)
  - `owner: 'player'|'opponent'` — which player's group
  - `completed_freq: number` — fraction of total leaves where this group was a completed line
  - `draw_freq: number` — fraction of total leaves where this group was a draw threat

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

### Recommend-move helpers (unchanged from Epic B)

- `buildRecommendPrompt({...})` — assembles the full move-recommendation prompt
- `buildFlatTable(colData, rounds)` — formats the per-column pattern table for the prompt
- `getScoreTier(col, score, immediateWinSet, immediateLossSet)` — classifies a column into IMMEDIATE WIN / WINS / DRAWS / LOSES / IMMEDIATE LOSS
- `TIER_ORDER`, `IMMEDIATE_WIN_OUTCOMES`, `PATTERN_KB` — shared constants

### Shared utilities

- `isMajorThreatForPlayer(board, col, row, player)` — checks whether a cell is a 3+empty major threat; not exported from `classifier.js`, this is the canonical server location
- `getBoardVisualization(movestring)` — shells out to `scripts/visualize_board.mjs` via `spawnSync`, strips the `scr` row
- `buildKBSection(patternNames)` / `loadKBStatement(id)` — loads KB article statements for active patterns
- `callLLM(prompt)` — calls OpenAI chat completions API; reads `OPENAI_API_KEY` / `OPENAI_MODEL` from env
- `selectContrastMove(scores, userCol, board)` — pure; returns `{ contrastCol, isOptimal }` or `null` when all legal scores are equal. `isOptimal=true`: user played best, contrast = second-best; `isOptimal=false`: user played suboptimally, contrast = best. Tie-break: closest to col 3.
- `getOpponentResponseMs(postMovestring, postBoard, opponentWinCols, perspective, solver)` — returns the movestring after opponent's best response, or null if the game is over.
- `findMajorThreatWindows(board, perspective)` — scans all 4-windows and returns windows with exactly 3 discs of one color + 1 empty cell. Returns `{ cells: string[], owner: 'player'|'opponent' }[]`. Replaces `getMajorThreatCells` for all group-level operations.

### Explain-move type classifier (Epic B, T06/T14)

- `checkAllMovesEqual(preScores, board)` — returns `{ isSettled, allMovesEqual }`. `isSettled=true` means all legal columns have zero score (genuine draw). Used to short-circuit the LLM call.
- `getGapAndFraming(preScores, col, contrastCol)` — returns `{ gap, inverted, forceBucket, gapBucket }`. The eval gap between user's move and the contrast. `inverted=true` when the user's move is optimal. `gapBucket` is one of `small`/`moderate`/`large`, with sign-change override (`forceBucket`).
- `classifyExplanationType(preMoveBoard, postABoard, criticalPositionMs, perspective, playedCol)` — routes a position to Type 1/2/3/4. Priority: Type 1 (immediate threat existed before move) > Type 2 (opponent has >=2 threats in critical position, or Figure-7/J-shape) > Type 3 (major threat adjacent to parity-flipped column) > Type 4 (default). Returns `{ type: string }` (adds `parityFlipData` for Type 3).

### Grounding contract builders (Epic B, T08–T10)

- `selectTopGroups(aGroups, bGroups)` — takes the `groups` Maps from A-branch and B-branch simulation results, selects top 5 per branch by `completed_freq`, merges by canonical key. Returns `AggregatedGroup[]` with `aCompleted`/`aDraw`/`bCompleted`/`bDraw` fields.
- `buildAllowedSet(groups, board, perspective)` — converts `selectTopGroups` output to `AllowedSetEntry[]`. Each group is CONCRETE-ELIGIBLE (≥2 owner discs, has `cells` + `zoneSpec` fields) or ABSTRACT-ONLY (has `col` + `parity` + `zoneSpec` fields, no `cells`).
- `buildType1AllowedSet(preMoveBoard, perspective)` — builds CONCRETE-ELIGIBLE entries directly from `getImmediateThreats` results (Type 1 skips simulation). Returns `{ cells, zoneSpec }[]`.
- `buildGroupContextBlock(groups, allowedSet, board, perspective, options)` — builds the "Move context", "Boards", and "Winning-line comparison" sections. Accepts optional `preViz`/`afterViz` in `options` for pre-move and post-opponent board visualizations.

### Prompt template builders (Epic B, T11–T13)

- `buildType4Prompt({ playerName, gap, gapBucket, contextBlock, inverted })` — developmental/opening prompt. Role: coach explaining why one move develops better.
- `buildType12Prompt({ playerName, gap, gapBucket, contextBlock, explainType })` — Type 1/2 prompt. Role: coach explaining why one move was stronger than another. Task differs for Type 1 (missed immediate threat) vs Type 2 (tactical pattern).
- `buildType3Prompt({ playerName, gap, gapBucket, contextBlock, parityFlipData })` — Type 3 prompt. Adds a frozen parity-flip sentence naming the column, row, and whose parity changed.

All three prompt templates share a common skeleton via `buildCommonPromptSections`: Role, Players, Hard grounding rules, Context block, Tone (driven by eval gap), KB parity rules, Output format (zone tag instructions).

### Deleted functions (removed in Epic B, T18)

The following functions were removed and replaced by the type-driven prompt builders:
- `computeDeltaTable` — comparison-table logic (no longer needed; each type has a dedicated template)
- `buildExplainPrompt` — single-template approach replaced by Type 1/2/3/4 dispatch
- `buildPatternNarrative` — natural-language pattern summary (superseded by Group context block)
- `PATTERN_NAMES` — consumed only by `computeDeltaTable`

**Critical invariant**: solver scores are NEVER passed to the LLM. `getScoreTier` translates scores to tier labels (WINS/DRAWS/LOSES), and `getBoardVisualization` strips the `scr` row from board output. This invariant MUST be preserved by all callers.

The CLI scripts (`scripts/recommend_next_move.mjs`, `scripts/explain_move.mjs`) import from this module. Server endpoints (`/api/recommend-move`, `/api/explain-move-llm`) also import from it and reuse the server-managed solver singleton rather than spawning their own.

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

**Key files**:
- `connect-four/server/scripts/explain_move.mjs` — full PoC logic (no server required)
- `explain_move.sh` — shell wrapper at project root (`./explain_move.sh <movestring> <col> [rounds=1]`)
- `connect-four/server/scripts/visualize_board.mjs` — board visualization (called via `spawnSync`)

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

## Lesson Loader

`server/lessonLoader.js` is the canonical module for loading lesson content from JSON files at server startup.

**Startup loading pattern**: `fs.readdirSync` + `JSON.parse(fs.readFileSync(..., 'utf8'))` — synchronous, runs once at startup. Results are cached in a module-level array. No I/O occurs at request time.

**In-memory cache**: `getLessons()` and `getLesson(id)` return from the in-memory cache only — no filesystem reads on request.

**Validation and exclusion**: Each file is validated for required fields (`id`, `title`, `free`, `userPerspective`, `slides`, `socratic`, `confirmationCategory`, `confirmationCount`) and `boardSpec` array length (must be 7). Files failing validation are logged via `console.error` and excluded. The server never crashes due to a malformed lesson file.

**`order` derivation**: Extracted from the filename numeric prefix (e.g., `lesson-05-claimeven.json` → `order: 5`). Lessons are sorted ascending by `order` before caching.

**Directory**: `connect-four/lessons/`. Ships empty in Epic 4; content added in Epic 5.
