# LLM Coach Endpoints

Two LLM-grounded coaching features are live as server endpoints. CLI scripts in `connect-four/server/scripts/` serve as standalone test harnesses and share the same logic via `llmCoachHelpers.js`.

---

## Endpoints and CLI scripts

| Feature | Server endpoint | CLI script |
|---------|----------------|------------|
| Move explanation | `POST /api/explain-move-llm` | `explain_move.sh` → `explain_move.mjs` |
| Move recommendation | `POST /api/recommend-move` | `recommend_next_move.sh` → `recommend_next_move.mjs` |
| Eval harness (offline) | — | `run_eval.mjs` → `/judge-deep-reveals` skill |

Server endpoints share the solver singleton managed at startup. CLI scripts in `connect-four/server/scripts/` each spawn their own solver process. Shell wrappers at project root load `.env` via `node --env-file`.

---

## Shared infrastructure

All shared helpers live in `connect-four/server/llmCoachHelpers.js`. See `server-conventions.md` → "LLM Coach Helpers" for the full export list.

### Solver integration
`createSolverProcess()` from `c4solver-wrapper.js` — spawns c4solver as a persistent child process. Server endpoints reuse the singleton created at startup. CLI scripts spawn their own process per invocation.

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

### Zone tag normalization
`normalizeZoneTags(text)` — exported from `annotationGate.js` (moved from private `index.js` function 2026-06-23). Normalizes LLM output before validation: `[zone:column N]` → `[zone:colN]`, pairs opening/closing col tags, expands short `[/zone:cells]` closers. Import from `annotationGate.js`, not `index.js`.

### Annotation gate invariants

`validateAnnotation(explanation, board, allowedSet)` runs P1–P6 + P5Strong checks. Two non-obvious invariants:

- **P3 checks visible text only.** `checkP3` strips all `[zone:...]` and `[term:...]` markup tags from the text before scanning for forbidden slugs. A `[term:forced_win]` tag does not trigger the `forced_win` jargon check — only the literal string in the rendered output does.

- **Zero-count threats use bare `0`, not `[zone:tg]`.** `formatThreatStats` emits a bare `0` (no zone tag) when a threat count is zero. The LLM prompt has an explicit exception clause instructing the LLM to write bare `0` for zero-count lines rather than invent a zone tag. `checkP5Strong` always fails `[zone:tg]` — there is no valid use of that spec in LLM output.

### LLM call
`callLLM(prompt)` — native `fetch` to OpenAI chat completions API. Model and key read from `OPENAI_API_KEY` / `OPENAI_MODEL` env vars.

---

## explain_move data flow (current — post spec 039)

The unified blunder/optimal flow lives in `server/explainContext.js` → `buildExplainContext()`.
It replaced the old `explainSimulate`-based pipeline.

```
args: movestring, col (0-indexed), rounds, solver
  │
  ├─ solver.query(movestring) → preScores
  ├─ selectContrastMove(preScores, col, board) → { contrastCol, isOptimal }
  ├─ getGapAndFraming → { gap, gapBucket }
  ├─ Trivial-optimal guard: if optimal + small gap → canned message (no LLM call)
  │
  ├─ Blunder path (isOptimal=false):
  │   └─ tagBlunder(movestring, col, contrastCol, solver) → { tag, direction }
  │
  ├─ Optimal path (isOptimal=true):
  │   └─ positiveReason from POSITIVE_CASCADE + POSITIVE_TEMPLATES
  │
  ├─ safeClassifyPattern(movestring + bestCol, ...)  → correctMovePatterns
  ├─ safeClassifyPattern(movestring, ...)             → patPlayed
  ├─ safeClassifyPattern(movestring + col, ...)       → patPostBlunder
  ├─ buildAllowedSetFromPatternMaps(all 3 patternMaps, postBestBoard)
  │
  ├─ getBoardVisualization(movestring)         ← Before
  ├─ getBoardVisualization(movestring + bestCol) ← After best move
  ├─ getBoardVisualization(movestring + col)     ← After move played
  │
  ├─ Threat comparison: summarizeThreats + formatThreatStats
  │   (major/minor threats, parity alignment, gravity-top)
  │
  ├─ KB terms section: union of 3 pattern maps + tagBlunder.tag
  │   → PATTERN_KB lookup → short_summary per entry
  │   → alias entries (e.g. fork) use patternKey as tag id
  │
  └─ buildBlunderExplainPrompt → callLLM → cache
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

## Prompt structure (explain_move, current)

```
## Role                  ← blunder or optimal framing
**Language rule**        ← banned internal terms only (no positive vocabulary list)
## Players               ← player names, parity rows
## Boards                ← 3 boards: Before / After best move / After move played
## Move context          ← player, eval gap, columns, key insight (humanReason)
## Threat comparison     ← pre-computed major/minor threat counts + parity alignment
## Best-move tactical evidence  ← correctMovePatterns (when patterns fired)
## Hard grounding rules  ← column/cell whitelist
## Tone                  ← severity framing
## KB term definitions   ← classifier-driven; absent when no patterns fired
## Output format         ← zone/term tag syntax; term instruction omitted when no KB terms
## Task                  ← 2–3 sentences; pattern-naming conditional on KB terms presence
```

**`## Threat comparison`** format:

```
After the best move (column N):
- Player major threats: 0
- Player minor threats: 6
- Opponent major threats: 1
- Opponent minor threats: 3

After the move played (column M):
- Player major threats: 1 (1 parity-aligned, 0 immediately playable)
- Player minor threats: 2
- Opponent major threats: 0
- Opponent minor threats: 6
```

Parity-aligned = threat row matches the player's winning parity.
Immediately playable = gravity-top cell.

**`## Task`** varies by presence of KB terms:
- **With KB terms:** "Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above)."
- **Without KB terms:** "Do not invent tactical concept names — describe only what you can see changing between the two boards."

Both paths include: "When the threat comparison shows a meaningful difference, use the specific counts as evidence."

**Term tag instruction** is omitted from `## Output format` when no `## KB term definitions` section exists — no definitions = no tagging.

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

## Environment variables required

```
OPENAI_API_KEY=...
OPENAI_MODEL=...  # e.g. gpt-4o-mini
```

Both server endpoints return 503 if these are absent. CLI scripts read them via `--env-file connect-four/server/.env`.

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
| `odd_even_threat` | `derived-odd-even-threat` |
| `fork` | `community-double-threat` (alias — resolves to same article as `double_threat`) |
| `immediate_threat` | — (table only, no KB article) |
| `forced_block` | — (table only, no KB article) |
| `forbidden_columns` | — (table only, no KB article) |

**`loadKBShortSummary` alias fallback:** If the direct file read fails (e.g. `fork.md` doesn't exist), the function checks `PATTERN_KB[id]` and retries with the resolved slug. This means `loadKBShortSummary('fork')` returns the `community-double-threat` summary.

**KB term line format in prompt:** For alias entries where `patternKey !== kbEntry.id`, the prompt uses `patternKey` as the tag id with a combined display name:
```
- [term:fork] **community double threat / fork** (fork): <short_summary>
```

---

## See also

- `connect-four/server/explainSimulate.js` — simulation engine and detector registry
- `connect-four/server/classifier.js` — `Board`, `getImmediateThreats`, pattern detectors
- `connect-four/server/c4solver-wrapper.js` — solver IPC
- `docs/knowledge-base/` — KB article files (YAML frontmatter + markdown body)
- `docs/deep-reveal-eval.md` — 3-layer evaluation framework: deterministic checks, LLM-as-judge, golden set regression
