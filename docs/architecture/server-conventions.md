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
classifyPattern(ms, perspective, solver) → Promise<Map<string, { cells: string[] }>>
```

Returns a Map of tactical pattern tags (e.g. `'immediate_threat'`, `'forced_win'`, `'z_threat'`) present for the given `perspective` on the position `ms`. Each value has a `cells` array of wire-format cell coordinates (`"c{col+1}r{row+1}"`, 1-indexed). Tags are drawn from all 13 detectors, run in parallel via `Promise.all`. Never contains `'unknown'`.

- `ms` — 0-indexed movestring.
- `perspective` — 1 (Red) or 2 (Yellow). The player whose patterns to detect.
- `solver` — c4solver wrapper with `.query(ms)` method.

**Inline detector list**: `classifyPattern` maintains its own inline list of 13 detectors. This list is the sole registry of pattern detectors. `classifyPattern` must NOT import any external registry to avoid circular dependencies.

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

## Explain Context (`explainContext.js`)

`buildExplainContext(movestring, col, rounds, solver)` in `server/explainContext.js` is the
unified grounding flow for the LLM explain-move endpoint. It replaces the former
`explainSimulate`-based approach (deleted in Epic 3).

```js
buildExplainContext(movestring, col, rounds = 1, solver)
  → Promise<{ prompt: string, allowedSet: Array|null }
           | { prompt: null, allowedSet: null, allMovesEqual: true }
           | null>
```

- Returns `null` if the contrast move could not be determined.
- Returns `{ prompt: null, allowedSet: null, allMovesEqual: true }` when all legal moves
  have equal solver scores (settled position).
- Otherwise returns `{ prompt, allowedSet }` where:
  - `prompt` — full LLM system prompt string (from `buildBlunderExplainPrompt`)
  - `allowedSet` — `AllowedSetEntry[]` or `null` (null = no Tier 1/2 patterns found)

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

`insertGameBlunder(supabase, row)` in `server/insertGameBlunder.js` is the sole write path for blunders detected during post-game analysis (i.e., from `POST /api/games/analyze`). The client no longer writes these directly via `POST /api/blunders`.

The `row` shape:
```js
{
  user_id,         // required — anonymous users are silently skipped
  board_state,     // movestring at the point of the blunder
  move_played,     // 0-indexed column actually played
  correct_move,    // 0-indexed best column
  pattern_category,// blunder tag slug; unrecognized tags are substituted with 'suboptimal_move'
  reason,          // human-readable reason string
  direction,       // 'defensive_miss' | 'enabled_opponent' | 'missed_own'
  severity,        // integer [0,10] score-spread measure
  blunder_severity,// real [0,1] tree-scan fraction, or null
  game_id,         // uuid FK → games(id), nullable — links the blunder to its sparring game
}
```

- `game_id` is nullable. Pass `null` (or omit) for blunders that do not originate from a sparring game row.
- The function is fire-and-forget — it never throws or rejects; all errors are logged via `console.error`.
- Deduplication is handled by a DB unique index; `23505` constraint violations are silently swallowed.

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

## SPA Catch-all Route

The server hosts the built SPA (`dist/`) and serves `dist/index.html` for all non-API paths via a catch-all route.

**Registration order** (enforced by Express route order):
1. All `/api/*` routes
2. `app.use(express.static(join(__dirname, '../dist')))` — serves JS/CSS/asset files
3. Catch-all for HTML — registered last

**Express 5 wildcard syntax**: Use `app.get('/{*path}', handler)` — bare `app.get('*', ...)` throws `PathError` at startup in Express 5 (path-to-regexp no longer accepts unparameterized `*`).

**`dist/index.html` caching**: Read once at startup into a module-level `let indexHtml`. If the file is absent (e.g., pre-build), log a warning and return 500 from the catch-all. Never read or write it per-request.

**OG injection**: For `/game/:id` paths, inject `<meta property="og:title">` and `<meta property="og:description">` before `</head>` using a local `patched` variable. Never mutate the cached `indexHtml` string.

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

**MUST**: New route groups with ≥5 related endpoints SHOULD follow the `register<Feature>Routes(app, supabase)` extraction pattern rather than inlining in `index.js`. The module should be testable without the real DB or solver.

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
