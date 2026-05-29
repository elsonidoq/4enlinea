# LLM Coach Endpoints

Two CLI scripts implement LLM-grounded Connect Four coaching. Both are PoCs today; this document covers their architecture and the path to converting them into server endpoints.

---

## Scripts overview

| Script | Entry point | Question answered |
|--------|-------------|-------------------|
| `explain_move.sh` | `explain_move.mjs` | "Why was the move I just played strong or weak?" |
| `recommend_next_move.sh` | `recommend_next_move.mjs` | "What should I play next and why?" |

Both live in `connect-four/server/scripts/`. Shell wrappers at project root load `.env` via `node --env-file`.

---

## Shared infrastructure

### Solver integration
`createSolverProcess()` from `c4solver-wrapper.js` — spawns c4solver as a persistent child process. One process per invocation today; a server endpoint should create it once at startup and reuse it across requests.

### explainSimulate
`explainSimulate(movestring, numPlies, anchorCell, perspective, solver)` from `explainSimulate.js`.  
Walks a game tree `numPlies` deep with optimal play, classifying positions via the detector registry. Returns `{ patterns, outcomes, totalLeaves, timing }`.

**Cost:** `O(branching^numPlies)` solver queries. At `rounds=1` (numPlies=3) a mid-game position with 5 playable columns costs roughly 5×27 ≈ 135 solver queries. `claimeven` adds ~20 queries per classified node.

### Board logic helpers (from `classifier.js`)
- `Board(movestring)` — parses movestring into board state + colHeights
- `getImmediateThreats(board, colHeights, player)` — returns columns where `player` wins immediately
- `isMajorThreatForPlayer(board, col, row, player)` — true if cell (col, row) is a 3+empty major threat for `player`

### Board visualization
`getBoardVisualization(movestring)` — shells out to `visualize_board.mjs` via `spawnSync`. Output has the `scr` (solver score) row stripped before being passed to the LLM.

### KB loading
`loadKBStatement(id)` — reads a KB article's `statement:` frontmatter field from `docs/knowledge-base/`. Only articles for patterns with ratio > 0 are loaded at runtime.

### LLM call
`callLLM(prompt)` — native `fetch` to OpenAI chat completions API. Model and key read from `OPENAI_API_KEY` / `OPENAI_MODEL` env vars.

---

## explain_move data flow

```
args: movestring, col (0-indexed), rounds
  │
  ├─ solver.query(movestring) → pre-move scores
  ├─ selectContrastMove(scores, col, board) → contrastCol
  ├─ explainSimulate(movestring+col, ...)       ┐ parallel
  ├─ explainSimulate(movestring+contrastCol, ...) ┘
  ├─ computeDeltaTable(userPatterns, contrastPatterns)
  ├─ getBoardVisualization(movestring)   ← pre-move
  ├─ getBoardVisualization(movestring+col) ← post-move
  ├─ isMajorThreatForPlayer → forcedBlockNote
  ├─ getImmediateThreats(postBoard) → blunderNote
  ├─ buildKBSection(activePatterns)
  └─ buildPrompt → callLLM → print
```

**Key invariant:** solver scores never appear in the LLM prompt. The `scr` row is stripped from board visualizations; `selectContrastMove` uses scores internally but only passes `isOptimal: bool` to the prompt builder.

**Contrast move selection:**
- User played optimally → contrast = second-best column
- User played suboptimally → contrast = best column
- All columns equal → exits (no explanation possible)
- Tie-break: center-most column (closest to col 3)

---

## recommend_next_move data flow

```
args: movestring, rounds
  │
  ├─ solver.query(movestring) → 7 scores (for non-immediate tier labels only)
  ├─ getImmediateThreats(board, colHeights, perspective) → immediateWinSet   ← board logic
  ├─ isMajorThreatForPlayer(board, c, ..., opponent) for each c → forcedBlockCols ← board logic
  ├─ new Board(movestring+c) + getImmediateThreats(postBoard, ..., opponent) → immediateLossSet ← board logic
  ├─ explainSimulate(movestring+c, ...) for each non-immediate-win c  ← parallel
  ├─ assign score tier per column (IMMEDIATE WIN / WINS / DRAWS / LOSES / IMMEDIATE LOSS)
  ├─ sort columns: tier order then column index
  ├─ getBoardVisualization(movestring)
  ├─ buildFlatTable(colData) → per-column pattern table
  ├─ buildKBSection(activePatterns)  ← all patterns with ratio > 0 in any column
  └─ buildRecommendPrompt → callLLM → print
```

**Critical:** IMMEDIATE WIN and IMMEDIATE LOSS tiers are determined by **board logic only**, not solver scores. Solver scores have two failure modes at these boundaries:
1. In forced-win terminal positions, all opponent scores are flat/identical — no signal to distinguish which column is the forced block (see `reference_cat5_forced_block_detection` memory).
2. `immediateWinScore(moveCount)` has an off-by-1 for odd `moveCount`.

**Immediate-win columns skip explainSimulate** — c4solver rejects input positions reached through a winning alignment (it returns an error, not scores). These columns receive placeholder outcomes `{ winRate:1, drawRate:0, lossRate:0 }`.

**Deferred:** detecting columns that prevent the opponent from establishing a double threat. This requires counter-factual simulation (skip a column, run opponent simulation, check for `double_threat` pattern). Not yet implemented; `TODO` comment in `buildRecommendPrompt`.

---

## Prompt structure comparison

### explain_move prompt
```
## Role
## Move context          ← "Red just played col N" + forced-block / blunder notes
## Board (BEFORE)        ← pre-move, scr stripped
## Board (AFTER)         ← post-move, scr stripped
## Pattern comparison    ← outcome line + delta table (sorted by |Δratio|)
## Pattern definitions   ← KB for patterns in delta table
## Task                  ← 2–4 sentence explanation
```

### recommend_next_move prompt
```
## Role
## Move context          ← current player + position assessment (winning/drawing/losing)
## Special move annotations  ← IMMEDIATE WIN / FORCED BLOCK / IMMEDIATE LOSS (omitted if none)
## Board (current)       ← pre-move, scr stripped
## Per-column tactical analysis  ← flat table: COL TIER OUTCOMES PATTERN RATIO TOP2
## Pattern definitions   ← KB for patterns with ratio > 0 in any column
## Task                  ← 3–5 sentence recommendation
```

**Flat table format** (recommend_next_move):
```
COL  TIER           OUTCOMES                 PATTERN             RATIO  TOP2
3    WINS           win 85% draw 10%        z_threat             0.42  col3r4×18 col3r2×12
                                             j_shape              0.28  col3r3×9
4    WINS           win 80% loss 5%         double_threat        0.38  col3×12
1    DRAWS          draw 50% loss 8%        (no tactical patterns detected)
```
- Columns sorted by tier order (IMMEDIATE WIN → WINS → DRAWS → LOSES → IMMEDIATE LOSS), then by column index.
- Outcomes shown on first pattern row for each column; subsequent rows for same column have blank COL/TIER/OUTCOMES prefix.
- Column numbers are 1-indexed in the LLM prompt.

---

## Converting to server endpoints

### Recommended signatures

```
POST /api/explain-move
Body: { movestring: string, col: number, rounds?: number }
→ { prompt: string, explanation: string }

POST /api/recommend-move
Body: { movestring: string, rounds?: number }
→ { prompt: string, recommendation: string }
```

### Refactoring steps

1. **Extract shared module** `connect-four/server/llmCoachHelpers.js`:
   - `loadKBStatement`, `buildKBSection`, `PATTERN_KB`
   - `getBoardVisualization` (replace `spawnSync` with a direct import of the board renderer if possible, to avoid subprocess overhead per request)
   - `callLLM` (or inject an LLM client)

2. **Solver lifecycle** — replace `createSolverProcess()` per-call with a module-level singleton managed by the server (created at startup, destroyed on shutdown). The solver process is stateless between queries; one instance handles concurrent requests via the `c4solver-wrapper.js` queue.

3. **Extract pure functions** from each script — `buildPrompt` / `buildRecommendPrompt`, `selectContrastMove`, `buildFlatTable`, `getScoreTier`, etc. are already self-contained and require no changes.

4. **Replace `process.argv` parsing** with route handler parameter extraction. The validation logic (movestring regex, col range) becomes input sanitization middleware.

5. **Streaming (optional)** — `callLLM` can stream the LLM response. For the endpoint, pipe through SSE or return the full string synchronously.

6. **Timeout/cost guard** — `explainSimulate` at `rounds=2` (numPlies=5) can take several seconds for a full board. Enforce a max rounds value (e.g., `rounds ≤ 2`) and add a request timeout.

### Environment variables required

```
OPENAI_API_KEY=...
OPENAI_MODEL=...  # e.g. gpt-4o-mini
```

Already loaded via `--env-file` in the CLI wrappers; move to standard dotenv or server config for the endpoint.

---

## Pattern → KB article mapping

| Pattern | KB entry |
|---------|----------|
| `double_threat` | inline string |
| `j_shape` | `allen-j-configuration` |
| `figure_7` | `community-figure-7` |
| `claimeven` | `allis-claimeven` |
| `baseclaim` | `allis-baseclaim` |
| `before` | `allis-before` |
| `specialbefore` | `allis-specialbefore` |
| `undercut` | `allen-t2` |
| `overcut` | `community-overcut` |
| `z_threat` | `community-z-threat` |
| `forced_win` | inline string |
| `immediate_threat` | — (table only, no KB article) |
| `forced_block` | — (table only, no KB article) |
| `forbidden_columns` | — (table only, no KB article) |

---

## See also

- `connect-four/server/explainSimulate.js` — simulation engine and detector registry
- `connect-four/server/classifier.js` — `Board`, `getImmediateThreats`, pattern detectors
- `connect-four/server/c4solver-wrapper.js` — solver IPC
- `docs/knowledge-base/` — KB article files (YAML frontmatter + markdown body)
- `docs/architecture/server-conventions.md` — solver IPC modes and board representation
