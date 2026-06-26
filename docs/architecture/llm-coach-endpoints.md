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
  ├─ Step 8b — Sparse-board forward look-ahead (only when anchorless + blunder):
  │   isAnchorlessPosition(show* flags, allowedSet) && !isOptimal
  │   → runSparseLookahead → { case, tag, aliasMap, allowedSetEntries[, oppTag, oppAliasMap, oppAllowedSetEntries] } | null
  │   → merges aliasMap into zoneAliasMap, builds resolvedAllowedSet,
  │     formats the `## What the better move leads to` section
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

## Sparse-board forward look-ahead

`server/sparseLookahead.js` — fires only on **anchorless** blunder positions: the explanation has nothing concrete to point at (no threat-comparison row is shown **and** `allowedSet === null`), so the *reason one column beats another is invisible in the static board* and only recoverable by simulating forward. Surfaced reasons must be board features the player can reproduce — the solver score is an internal compass only, never stated.

**Gate:** `isAnchorlessPosition({showPlayerMajor, showOpponentMajor, showPlayerMinor, showOpponentMinor}, allowedSet)` → true iff none of the four row-visibility flags is set AND `allowedSet === null`. Keys off the **row-visibility** `show*` flags, NOT the raw `hasMajor/MinorThreats` existence flags — a board can carry non-meaningful threats (e.g. opponent minors that render no directional row) and still be anchorless.

**Method (`runSparseLookahead`):** the engine first queries the **pre-move** position (`solver.query(movestring)`) and picks an opponent-exploration strategy from the player's per-column scores. `optScore` = the better column's score, `blunderScore` = the played column's score (player-to-move convention: `≥0` wins/draws, `<0` loses). `searchOpportunities` then runs a bounded DFS from each candidate move, running `classifyPattern` at player-to-move nodes to find reachable structures via `extractLookaheadStructures` (renamed from `extractTier1Structures` 2026-06-25). The extracted set is `LOOKAHEAD_TAGS = TIER1 ∪ THREAT_TAGS`: the six Tier-1 structures (double_threat, fork, undercut, …) **plus** the three parity-aware threats (`major_threat_parity`, `major_threat_nonparity`, `minor_threat`), which now flow through the identical detection→tally→winner→cells machinery. **Per-cell expansion:** a threat tag's `cells` array is a union of independent completing cells, so each cell is recorded as its own "way" (one instance per cell) before `recordWay` — Tier-1 structures keep their single grouped way. The opponent-node branching mode is selected per `deps.opponentMode`:

- **`'optimal'`** (`selectOptimalOpponentCols`) — branch only into the opponent's best defense (all columns tied for their max score). A losing/weaker played move then surfaces nothing against best play, so the better move's surviving structure yields a positive delta.
- **`'mistake'`** (`selectOpponentMistakeCols`, the default) — branch into whole middle score-tiers (excluding the best and worst, never splitting a tie; uniform-score positions explore every legal reply).

Mode/case selection (top-level selector is `optScore`):

| Case | Pre-move condition | Exploration | Conveys |
|---|---|---|---|
| 1 | `optScore ≥ 0`, `blunderScore < 0` | optimal-opponent (player structures) | best defense punishes your move and wins; the better move survives best defense |
| 2 | `optScore > 0`, `blunderScore ≥ 0` | optimal-opponent (player structures) | you still win, but you give up structure the better move keeps vs best defense |
| 3 | `optScore < 0` | sub-optimal-opponent **AND** optimal-opponent-from-blunder | best play punishes your move (opponent's structures); if they slip, the better move lets you punish (player's structures) |

Cases 1 & 2 share one optimal-opponent best-vs-played search and return `{ tag, aliasMap, allowedSetEntries }` plus `case` (1|2) and `playedStillWins`. Case 3 runs **both**: (a) an optimal-opponent search from the **blunder root with the opponent as perspective** so `classifyPattern` surfaces the **opponent's** punishing structures (compared against an empty tally), aliased `opp-future-<tag>-N`; and (b) the player surviving-slip search (mistake-mode best-vs-played) aliased `future-<tag>-N`. It returns `{ case: 3, tag, aliasMap, allowedSetEntries, oppTag, oppAliasMap, oppAllowedSetEntries }` (either part may be empty; fires if **either** has content). If the pre-move query throws, it falls back to mistake-mode best-vs-played.

**Novel-opportunity selection (changed 2026-06-25).** The core primitive is `collectNovelOpportunities(bestTally, playedTally)`: for **every** look-ahead category it returns the cell-sets (`ways`) present in the **best** branch but **absent** from the played branch — concrete examples the better move generates that the blunder cannot — each capped at `MAX_WAYS` (2). A category whose ways all also appear in the played line contributes nothing (any occurrence delta there is only a frequency difference) and is omitted. The list is ordered by `LOOKAHEAD_PRIORITY` (informativeness — `double_threat`, `immediate_threat`, `major_threat_parity`, `figure_7`, `j_shape`, `undercut`, `overcut`, `major_threat_nonparity`, `minor_threat`), **NOT** by raw quantity (which over-favors minor threats, since a position spawns many). `runSparseLookahead` emits the full per-side list as `categoryExamples` (player) / `oppCategoryExamples` (opponent) so a downstream consumer can keep them all and decide what to filter.

`compareOpportunities` then returns the **single** prompt winner = the highest-priority category with ≥1 novel way (or `null` when nothing distinguishes — never manufacture a benefit). Priority, not occurrence count, is the tiebreak, so a lone parity-aligned major (game-winning) wins over a swarm of minors. This shifts which pattern surfaces in both `prompt_data` and the real prompt; the deep-reveal eval/judge harness validates it.

**Case 1/2 deepening fall-through (decisive flip with no player-structure delta):** when the case-1/2 player-structure comparison returns `null` (no Tier-1 structure separates the moves) **but** the played move actually loses (`blunderScore < 0` — an `outcome_flip`), the engine deepens rather than returning null: it runs the opponent-punishment search (the same machinery as case 3a — `searchOpportunities(playedRoot, opponent, { opponentMode: 'optimal' })` vs an empty tally) and, if that surfaces a structure, returns a **`case: 3` opponent-only shape** (`tag: null, aliasMap: {}, allowedSetEntries: []` + populated `oppTag`/`oppAliasMap`/`oppAllowedSetEntries`). This grounds mid-sparse losses where the refutation is tactically reachable (the rendered section becomes "your move loses to best play…"). When the refutation is too deep for the budget (e.g. an empty-board positional loss whose forced win is ~40 plies away), it still returns `null` → the prompt falls back to an honest-minimal explanation rather than a fabricated one. (Added 2026-06-25 from the `eval_set_large_2_nonfiring_lookup_evals` judge round; the prior behavior here was an unconditional `null`.)

**Key invariants / contracts:**
- **Hang safety:** every `classifyPattern` call goes through `classifyPatternWithTimeout` (timeout + empty-Map on hang/throw); every `solver.query` in the recursion is try/caught (prune, never reject); the `runSparseLookahead` call in `buildExplainContext` is try/caught (throw → no section). An optional additive feature must never sink the explanation.
- **Budget:** each candidate search gets its **own** `{ calls: budget }` object (independent, equal — a shared budget would let the first search starve the second and manufacture a spurious winner). `budget` is the per-tier value (`INITIAL_GAME_CALL_BUDGET` or `GLOBAL_CALL_BUDGET`), not a hardcoded constant.
- **Terminal guard:** `searchOpportunities` prunes any node where `board.hasWon(1) || board.hasWon(2)` **before** any `solver.query`/`classifyPattern`. Already-won positions are game-over — the solver rejects them with `Error: Invalid position` (this previously crashed validation scripts).
- **P5Strong whitelist:** when look-ahead flips `allowedSet` from null → non-null, the played/contrast columns and landing cells must also be appended to `resolvedAllowedSet` (mirroring the existing non-null whitelist), or the explanation's unavoidable column references fail `P5strong:col_not_allowed`.
- The found structure is rendered as a **future possibility** (`## What the better move leads to`), never as a current board fact.

**`buildExplainContext` look-ahead surface:**
- Optional 5th param `deps = {}`: `{ classifyFn }` injects `runSparseLookahead`'s classifier for tests; `skipLookahead: true` computes the gate (`isSparse`) but skips the expensive forward search (used by `generate_eval_set.mjs` to collect anchorless boards cheaply). The internal *grounding* `classifyPattern` calls are not injectable, so end-to-end firing is covered only by the real-solver e2e (`tests/sparseLookahead.e2e.test.js`, excluded from `test:fast`).
- Return adds `isSparse` (the `isAnchorlessPosition` gate decision) and `lookaheadFired` (true when a `## What the better move leads to` section was produced). Both are additive — existing 4-arg callers are unaffected.

**Tunables** (exported named constants in `sparseLookahead.js`; tune from eval results):

| Constant | Default | Meaning |
|---|---|---|
| `LOOKAHEAD_DEPTH` | 4 | plies searched from each candidate move (mid/late game) |
| `EARLY_GAME_DEPTH` | 8 | plies used when `movestring.length < EARLY_GAME_MS_THRESHOLD` |
| `EARLY_GAME_MS_THRESHOLD` | 8 | movestring length below which `EARLY_GAME_DEPTH` applies |
| `INITIAL_GAME_DEPTH` | 10 | plies used when `movestring.length ≤ INITIAL_GAME_MS_THRESHOLD` (near-empty opening) |
| `INITIAL_GAME_MS_THRESHOLD` | 4 | movestring length at/below which the INITIAL tier applies |
| `INITIAL_GAME_CALL_BUDGET` | 2000 | per-candidate `classifyPattern` budget in the INITIAL tier (large one-time search; cached per position) |
| `PLAYER_CAP` | 2 | player branching (top score-tier moves continued) |
| `OPPONENT_CAP` | 4 | opponent-mistake columns per node (whole tiers; may exceed on a tie) |
| `GLOBAL_CALL_BUDGET` | 60 | `classifyPattern` calls **per candidate** (each of the two searches gets its own) |
| `CLASSIFY_TIMEOUT_MS` | 4000 | per-call hang timeout |
| `MAX_WAYS` | 2 | cap on the **novel** cell-sets surfaced for the winner (best-branch ways absent from the played branch) |
| `MIN_BRANCH_DELTA` | 1 | extra opponent-mistake branches the better move must reach to count as distinguishing |

Depth **and budget** are adaptive across three tiers (selected by `movestring.length` in `runSparseLookahead`): `≤ INITIAL_GAME_MS_THRESHOLD(4)` → `INITIAL_GAME_DEPTH(10)` + `INITIAL_GAME_CALL_BUDGET(2000)`; `< EARLY_GAME_MS_THRESHOLD(8)` → `EARLY_GAME_DEPTH(8)` + `GLOBAL_CALL_BUDGET`; else `LOOKAHEAD_DEPTH(4)` + `GLOBAL_CALL_BUDGET`. The chosen `depth` and `budget` are passed to every `searchOpportunities` call (including the case-1/2 deepening fall-through). Root cause for the tiers: at `LOOKAHEAD_DEPTH=4` from a 2-disc board, player nodes only see 4–6 total discs — not enough disc density for any Tier-1 geometry. The INITIAL tier spends a far larger one-time search on the handful of distinct opening positions, which is affordable because the whole deep-reveal is cached per position (`explanation_cache`). `searchOpportunities` accepts an optional `depth` param (default `LOOKAHEAD_DEPTH`) so tests can override independently.

**Known limitations / not yet implemented:**
- **Early-game depth still finite:** `EARLY_GAME_DEPTH=8` was calibrated to reach ~10 discs at player nodes from boards with <8 moves played. Very early positions (movestring.length ≤ 2) with complex structure requirements may still null. Monitor eval results; the tunable is easy to raise.
- **Opponent-indifference dead-end:** `selectOpponentMistakeCols` needs ≥2 distinct opponent score tiers; it returns `[]` when the solver is indifferent among replies. This correctly prunes the PLAYED branch when the played move is already a decisive blunder (all opponent replies score identically). In purely drawn positions both branches may dead-end this way.
- **Designed but unbuilt:** an explicit future-board visualization in the prompt (currently the future structure is conveyed by alias text only), and a Tier-3 *promotion* shortcut (surfacing an already-detected position-global parity pattern without simulating). The gate simulates uniformly instead.

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
## Threat comparison     ← pre-computed major/minor threat counts + parity alignment; OMITTED when no threat row is directionally meaningful (all four show* flags false)
## What the better move leads to ← sparse-board look-ahead; only on anchorless blunders (future-<tag>-N aliases)
## Best-move tactical evidence  ← correctMovePatterns (when patterns fired)
## Hard grounding rules  ← column/cell whitelist
## Tone                  ← severity framing
## KB term definitions   ← classifier-driven; injected ONLY when a pattern fires (no always-include glossary path); absent on anchorless boards
## Output format         ← zone/term tag syntax; term instruction omitted when no KB terms
## Task                  ← 2–3 sentences; pattern-naming conditional on a grounded pattern being present
```

**No empty sections (structural invariant):** the final prompt is assembled by `sections.join('\n\n')` in `buildBlunderExplainPrompt`, but first passes a filter that drops any section whose body — everything after its `## Heading` line, ignoring blank lines — is whitespace-only. This is a property of *every* section, not a per-section special case: an informationally-empty section conveys nothing and primes the model to invent content. Sections that render labels but no data (notably `## Threat comparison`, whose sub-labels are non-whitespace) must additionally be set to `undefined` at build time — the whitespace filter cannot catch them. (Added 2026-06-25; the empty `## Threat comparison` was a confirmed fabrication trigger.)

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

**`## Task`** varies by whether a **grounded pattern** is present — `hasGroundedPattern = kbTermsSection || threatComparisonSection || lookaheadSection || allowedSet !== null`:
- **Grounded pattern present:** "Name the tactical pattern that was missed or given away (use only concepts defined in KB term definitions above)."
- **No grounded pattern:** "Do not invent tactical concept names — describe only what you can see changing between the two boards."

(The gate was previously keyed on `kbTermsSection` alone, which was effectively always-on while `parity`/`gravity_top` were always-include — so it ordered the model to name a pattern even on bare boards, and it fabricated one. With the always-include path removed and this broader gate, the "name the pattern" instruction only fires when something concrete actually grounds it.)

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
| `major_threat_parity` | `derived-parity-aligned-threat` |
| `major_threat_nonparity` | `allen-major-threat` |
| `minor_threat` | `allen-minor-threat` |
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
