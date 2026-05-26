# Solver Scores Usage Report
*Generated: 2026-05-22*

## Purpose

This document maps every place solver scores are consumed in the server codebase. It has two goals:

1. **Removal planning** — identify which score usages can be replaced with board analysis or stored puzzle data, enabling solver calls to be eliminated.
2. **Assumption audit** — flag places where a score comparison is used as a proxy for a board fact (e.g. `score > 0` used to infer "playing here wins") when the correct test is a board check (`checkWin`).

---

## Score Usage Types

All score usages in the codebase fall into one of seven types. The type determines whether a board check is also needed, and whether the usage is a candidate for removal.

### Type 1 — Immediate win/loss check (proxy)

**Question asked:** "Does playing in column C win the game right now?"

**How scores are used:** `score > 0` is checked first as a cheap guard, then `checkWin` is called on the board.

**Reliability:** The score is a *necessary but not sufficient* condition. A score > 0 means the current player wins *eventually* with optimal play — not that this specific move wins immediately. The follow-up `checkWin` is the actual test; the score only avoids the board check for clearly losing columns.

**Can a bad assumption arise?** Yes, if `checkWin` is skipped and `score > 0` is treated as proof of immediate win. Every site in the codebase that uses this type does call `checkWin` afterward — but it is the one place where removing the score gate without adding the board check would introduce a bug.

**Sites:** `evalImmediateThreat`, `classify()` immediate_threat branch.

---

### Type 2 — Eventual outcome gate

**Question asked:** "Is playing in column C eventually winning / eventually losing / a draw?"

**How scores are used:** Sign check only — `score > 0`, `score < 0`, or `score === 0`.

**Reliability:** This is exactly what the solver computes. No board check is needed to confirm it; the solver is the ground truth for this question.

**Can a bad assumption arise?** Only if the sign is conflated with immediacy (Type 1). Used correctly as "this path eventually wins," the sign is reliable.

**Sites:** `detectZThreat`, `detectOvercut`, `detectFigure7`, `detectJShape` (winning gate); `detectUndercut` (losing gate); `classify()` fallback tag, `forbidden_columns` gate, `forced_win` branch; `evalDoubleThreat` pre-filter.

---

### Type 3 — Opponent-wins-immediately threshold (`opponentImmediateWin`)

**Question asked:** "Does playing in column C leave the opponent able to win on their very next move?"

**How scores are used:** `score === -floor((41 - moveCount) / 2)`. This specific value is the floor score the solver assigns when every reply by the current player loses immediately.

**Reliability:** Exact by definition — this is a mathematical identity of the scoring formula, not an approximation. A score at exactly this floor means the opponent has an immediate winning response.

**Can a bad assumption arise?** No — the threshold is derived from the same formula the solver uses. However, `getForcedBlock` and `evalForcedBlock` have already migrated away from this to direct board checks (`hasWon` / `opponentWinsImmediately`), which is strictly more correct because it does not depend on the solver's scoring formula.

**Sites:** `traceForcedWin` only. (Formerly in `getForcedBlock` and `evalForcedBlock`, but those were refactored to board analysis.)

---

### Type 4 — Best-move selection (argmax)

**Question asked:** "Which column is the strongest available move?"

**How scores are used:** `argmax(scores)` — pick the column with the highest score.

**Reliability:** Reliable for identifying the solver-optimal move. Does not make any claim about the resulting board state — it only ranks moves by outcome quality.

**Can a bad assumption arise?** No intrinsic assumption about board state. However, in `evalForcedWin`, the argmax is taken over a set of losing scores (all ≤ 0), meaning "least bad" rather than "winning." If a drawing score (0) is present, the argmax will pick that, which may not match the intended semantics of a forced_win puzzle.

**Sites:** `runClaimevenSimulation` (Red's move), `classifyBestMove`, `evalDoubleThreat` fallback, `evalForcedWin`.

---

### Type 5 — All-moves-losing check

**Question asked:** "Is every legal move in this position a loss (or draw) for the current player?"

**How scores are used:** `scores.every(s => s <= 0)` or `Math.max(...scores) <= 0`.

**Reliability:** Reliable for "no winning move exists." Note the boundary: `<= 0` includes draws. Whether draws should be included depends on context.

**Can a bad assumption arise?** `evalForcedWin` uses `Math.max(...scores) > 0` as the reject guard, which means a position where all scores ≤ 0 (including draws at 0) passes through. A drawing position is not a forced-win position, but the guard does not catch it.

**Sites:** `classify()` forced_win branch (`allNegative`), `evalForcedWin` guard.

---

### Type 6 — Weighted move sampling (softmax)

**Question asked:** "Which column should the simulated player choose, with probability proportional to move quality?"

**How scores are used:** Scores are treated as continuous utilities and fed through a softmax. `solverWeightedPosition` computes `exp(scores[c] / T)` for the debug trace. The actual column selection uses `softmaxSample`, which first normalises scores to `[-1, 1]` before applying temperature.

**Reliability:** The normalisation step prevents temperature sensitivity from depending on the absolute scale of scores, which varies by game length. This is the only usage that treats score *magnitude* as meaningful rather than just sign or rank.

**Can a bad assumption arise?** The debug trace (written to `plies`) uses the un-normalised formula while the actual sampled column uses the normalised formula. These produce different probability distributions, so the logged probabilities do not match what was actually sampled.

**Sites:** `solverWeightedPosition` / `softmaxSample` in `candidate-generator.js`.

---

### Type 7 — Least-bad move in a losing position (ordinal comparison)

**Question asked:** "Among moves that are all losing, which one loses slowest (delays defeat the longest)?"

**How scores are used:** Ordinal comparison among negative scores — least negative = best.

**Reliability:** Reliable for ranking losing moves by how quickly they lead to defeat. The ordinal meaning of negative scores is part of the solver's contract.

**Can a bad assumption arise?** No, as long as the caller has already confirmed all scores are negative (Type 5 check). The risk is if a 0 (draw) slips in — see Type 5 note.

**Sites:** `evalForcedWin` (argmax over the non-positive set), `classify()` forced_win `isBestBadMove` check.

---

### Summary table

| Type | Question | Score test | Board check also needed? | Bad assumption possible? |
|---|---|---|---|---|
| 1 — Immediate win/loss | "Does this move win right now?" | `score > 0` (pre-filter) | Yes — `checkWin` required | Yes, if `checkWin` is skipped |
| 2 — Eventual outcome | "Does this path eventually win/lose?" | Sign of score | No | Only if confused with Type 1 |
| 3 — Opp-wins-immediately | "Can the opponent win on their next move?" | `score === oiw` threshold | No (mathematical identity) | No |
| 4 — Best move (argmax) | "What is the strongest move?" | `argmax(scores)` | No | If draws slip into forced_win argmax |
| 5 — All-moves-losing | "Is every move a loss (or draw)?" | `scores.every(s <= 0)` | No | Yes — draws pass as losses |
| 6 — Weighted sampling | "Which move to sample probabilistically?" | Softmax over scores | No | Debug trace uses different formula than actual sampling |
| 7 — Least-bad loss | "Which losing move delays defeat longest?" | Ordinal among negatives | No | If 0 (draw) is included in the set |

---

## What the Scores Are

The c4solver binary is invoked via `c4solver-wrapper.js`. It returns a 7-element array — one integer per column (0–6) — for any given position. The semantics follow the standard c4solver convention (see `reference_c4solver_scores.md`):

| Score range | Meaning |
|---|---|
| `> 0` | Current player wins with optimal play; larger = faster win |
| `= 0` | Draw with optimal play |
| `< 0` | Current player loses with optimal play; more negative = faster loss |

The special floor value `opponentImmediateWin = -floor((41 - moveCount) / 2)` means the opponent wins on their very next turn.

The empty board is never queried (the solver hangs on empty input). A hardcoded constant `EMPTY_BOARD_SCORES = [0, 0, 1, 2, 1, 0, 0]` is substituted instead. This constant is **defined independently in both `index.js` and `candidate-generator.js`** — two separate copies that could silently diverge.

---

## Site Map of Score Usage

```
c4solver binary
   └─ createSolverProcess()         c4solver-wrapper.js
         ├─ solver.query(ms)        → 7-element score array
         └─ queryDepth(ms, depth)   → 7-element score array (depth-limited, no book)

Score consumers
   ├─ candidate-generator.js        (puzzle generation pipeline)
   │     ├─ solverWeightedPosition  (game simulation — move sampling)
   │     ├─ traceForcedWin          (forced-win sequence tracing — threshold gate)
   │     ├─ checkPredicate          (position filter — category detection)
   │     └─ generateCandidates      (top-level orchestrator)
   ├─ classifier.js                 (per-move tagging and tactical detectors)
   │     ├─ classify()              (old 6-category classifier)
   │     ├─ classifyBestMove()      (argmax → classify)
   │     ├─ detectZThreat()
   │     ├─ detectUndercut()
   │     ├─ detectOvercut()
   │     ├─ detectFigure7()
   │     ├─ detectJShape()
   │     ├─ detectClaimeven()       (scores accepted but NOT used — see note)
   │     └─ runClaimevenSimulation  (argmax for Red's move inside detectClaimeven)
   ├─ predicates.js                 (puzzle evaluation)
   │     ├─ evalImmediateThreat()
   │     ├─ evalDoubleThreat()
   │     └─ evalForcedWin()
   │     NOTE: evalForcedBlock() accepts scores but does NOT use them
   └─ index.js                      (API layer)
         ├─ POST /api/scores              (raw score passthrough)
         ├─ POST /api/explain             (solver -x heatmap — separate invocation, no score array)
         ├─ POST /api/explain-move        (LLM explanation — scores in prompt text only)
         ├─ POST /api/puzzles/:id/check   (puzzle attempt evaluation)
         ├─ POST /api/puzzles/:id/sequence/move  (sequence-mode — NO scores fetched)
         └─ GET  /api/admin/scores        (admin debug — scores + classify + predicate)
```

---

## Detailed Usage by File

### `candidate-generator.js`

#### 1. Game simulation (`solverWeightedPosition`)

Scores drive move sampling during simulated games. There are **two formulas in play simultaneously**, which creates a subtle inconsistency:

**Debug trace** (recorded in `plies`, used for logging only):
```js
rawWeights[c] = exp(scores[c] / T)
```

**Actual column selection** (calls `softmaxSample()`):
```js
normalized[c] = (scores[c] - min) / range * 2 - 1   // rescale to [-1, 1]
logits[c]     = normalized[c] / T
weight[c]     = exp(logits[c] - maxLogit)             // numerically stable softmax
```

The column that is actually sampled comes from `softmaxSample`, which first normalises scores to `[-1, 1]` before applying temperature. The debug trace records weights with raw scores. Both players get their own temperature `T ∈ (0.1, 4.1]` sampled fresh per game.

Score role: **continuous utility** (for sampling); **normalised continuous utility** (for actual column choice).

#### 2. `traceForcedWin`

Scores are used as threshold gates to classify opponent moves after the initiating move:

- `oiw1 = -floor((41 - ms1.length) / 2)` is computed as the threshold.
- **Case A (terminal):** all legal opponent columns have `score < oiw1` → multi-threat, initiator wins after any reply. Then a board check (`checkWin`) is used to find the actual winning cell.
- **Case B (forced block):** exactly one column has `score >= oiw1` → that is the forced block; recurse.
- If `betterCols.length !== 1` in Case B, the sequence is rejected.

Score role: **binary gate** (above/below threshold). Board analysis (`checkWin`) is still needed for the terminal case to identify the winning cell.

#### 3. `getForcedBlock`

**⚠️ The report's earlier version was wrong here.**

`getForcedBlock` does **not** use scores. Despite accepting a `scores` parameter, the function body never reads it. It uses direct board simulation (`hasWon()`) to identify safe vs. dangerous columns:

```js
// For each legal column c:
//   play c for current player
//   check if opponent has any immediate winning reply (hasWon loop)
//   if yes → dangerous; if no → safe
// Return safe column only when exactly one safe col exists and at least one is dangerous.
```

Score role: **not used**. The `scores` parameter is dead weight.
→ **Removal note:** `getForcedBlock` already uses board analysis. No score dependency to remove.

#### 4. `checkZThreatPredicate`

Passes the score array directly to `detectZThreat` in `classifier.js`.

---

### `classifier.js`

#### `classify(moves, candidateCol, scores)`

The legacy classifier uses scores as a layered dispatch:

| Check | Score condition used |
|---|---|
| `immediate_threat` | `score > 0` (then board-checks for actual win) |
| `forced_block` | `score >= 0` (gate; board confirms opponent threat exists) |
| `double_threat` | **no score check** (pure board logic — see design note below) |
| `forced_win` | `score < 0`, `allNegative`, `isBestBadMove` |
| `forbidden_columns` | `scores.every(s => s <= 0)` (gate for losing positions) |
| Fallback | `score > 0` → `best_move`, `= 0` → `drawing_move`, `< 0` → `suboptimal_move` |

`immediate_threat`: the `score > 0` gate is a **proxy assumption** — it is used to avoid the board check, but a score > 0 does not guarantee the move is an *immediate* win (it means the current player wins eventually with optimal play). The board check that follows (`checkWin`) is the actual test. The gate is safe as a pre-filter because an immediate win always has `score > 0`, but the assumption direction matters: the score is necessary but not sufficient.

`double_threat`: uniquely skips the score gate. Two or more columns can constitute a double threat even if none have `score > 0`. This is inconsistent with `evalDoubleThreat`, which does gate on `score > 0`.

Additionally, `double_threat` in `classify()` counts threats at **any reachable row** in the column (not just gravity-top), whereas `evalDoubleThreat` in `predicates.js` counts only gravity-top threats. A position classified as `double_threat` at generation time may be evaluated with different logic at play time.

#### `classifyBestMove(moves, scores)`

Picks the argmax column from `scores`, then calls `classify()` on it. Score role: **argmax**. Not covered in the rest of the analysis but is an exported function and a distinct score consumer.

#### `detectZThreat(moves, scores)`

```js
if (scores[col] <= 0) continue;   // only winning columns qualify
```

Scores filter columns to those where the solver confirms a win. Then the function counts cells from current height to the lowest winning row; if the count is odd, the column is a Z-threat candidate. A valid Z-threat has exactly one such column.

⚠️ **Assumption:** `score > 0` is used as a proxy for "playing here creates a real winning path." This is directionally safe (a column with score ≤ 0 cannot be the Z-threat initiator) but the score alone doesn't confirm the specific cell geometry — the board analysis that follows does.

Score role: **binary gate**.

#### `detectUndercut(moves, scores)`

```js
if (scores[col] >= 0) continue;   // undercut requires playing C to be losing
```

Undercut is only detected on columns that are losing (`score < 0`). The structural board analysis (threat geometry) is score-independent.

Score role: **binary gate**.

#### `detectOvercut(moves, scores)`

```js
if (scores[col] <= 0) continue;   // overcut requires playing C to be winning
```

Mirror of undercut: overcut requires a winning column (`score > 0`).

Score role: **binary gate**.

#### `detectFigure7(moves, scores)` and `detectJShape(moves, scores)`

Both use:
```js
if (!scores || scores[comp.col] <= 0) continue;
```

Scores gate the completing cell: only columns with a positive score are considered. All structural template matching is score-independent.

Score role: **binary gate**.

#### `detectClaimeven(moves, scores, solver)` — scores NOT used

**⚠️ `detectClaimeven` accepts `scores` but never reads them.**

Column selection is based entirely on column-height parity computed from the board. The `scores` parameter is dead weight in the outer function.

Score role: **not used** (in `detectClaimeven` itself).
→ **Removal note:** `scores` can be removed from the `detectClaimeven` signature without any behaviour change.

#### `runClaimevenSimulation` (inside `detectClaimeven`)

Red (the solver-optimal player in simulation) picks moves by:
```js
let bestScore = -Infinity;
for (let c = 0; c < COLS; c++) {
  if (colHeights[c] < ROWS && scores[c] > bestScore) { bestScore = scores[c]; redCol = c; }
}
```

This is a fresh `solver.query()` call inside the simulation loop — not the `scores` passed to `detectClaimeven`. Red plays the **argmax** of scores (greedy best). This is used to verify that Yellow can maintain a winning position via the baseinverse strategy against optimal Red play.

Score role: **argmax** (for internal simulation, sourced from a fresh query).

---

### `predicates.js`

#### `evalImmediateThreat`

```js
if (s > 0 && heights[i] < ROWS) { /* check win */ }
```

Scores pre-filter candidates: only columns with positive scores are checked for an immediate win. The actual correctness test is `checkWin` (board analysis).

⚠️ **Assumption:** `score > 0` is a necessary condition for an immediate win (safe assumption) but not sufficient — the board check is still needed and is performed.

Score role: **binary gate** (pre-filter before board check).
→ **Removal note:** if scores are removed, iterate all legal columns and call `checkWin` directly.

#### `evalForcedBlock`

**⚠️ The report's earlier version was wrong here.**

`evalForcedBlock` does **not** use scores. Despite accepting a `scores` parameter, the implementation uses `opponentWinsImmediately()` — pure board simulation — to determine safe vs. dangerous columns:

```js
// For each legal column c:
//   play c for current player
//   check if opponent has any immediately-playable winning move (board loop + checkWin)
//   if yes → not safe; if no → safe
// Correct iff: at least one unsafe col exists AND candidateCol is safe
```

Score role: **not used**.
→ **Removal note:** `scores` can be removed from the `evalForcedBlock` signature. No score dependency to remove.

#### `evalDoubleThreat`

```js
if (scores[col] > 0 && threatsAfterMove(col) >= 2) doubleThreatCols.push(col);
```

Scores narrow candidates to positive-score columns before counting threats. The threat count is board-based. There is also a fallback path used when no column creates ≥2 threats:

```js
const bestScore = Math.max(...scores.filter(s => s > 0));
const bestCols = scores where s === bestScore;
```

⚠️ **Edge case:** if `scores.filter(s => s > 0)` is empty (no winning moves), `Math.max()` returns `-Infinity` and the fallback compares against it. In practice this shouldn't arise — `evalDoubleThreat` is only called for `double_threat` puzzles where a winning move is expected — but the code does not guard against it.

⚠️ **Inconsistency with `classify()`:** `classify()`'s `double_threat` branch counts threats at any reachable row; `evalDoubleThreat` counts only gravity-top threats. They can disagree on the same position.

Score role: **binary gate** (pre-filter) + **argmax** (fallback).
→ **Removal note:** removing the score gate would only require iterating all legal columns for the board check, with a small performance cost.

#### `evalForcedWin`

```js
if (Math.max(...scores) > 0) return { result: 'wrong' };
const maxScore = Math.max(...scores);
const bestCols = scores where s === maxScore;
```

Entirely score-driven. If any column has `score > 0`, the predicate rejects. Otherwise, the "best" move is the column with the **least-negative** score.

⚠️ **Edge case — drawing positions:** The guard is `> 0`, not `>= 0`. If all scores are ≤ 0 but some equal exactly 0 (draw), the predicate does **not** reject. It proceeds and picks 0-score columns as "correct" via argmax. A drawing position where no player is losing will silently pass through a `forced_win` predicate check and declare drawing moves correct. In practice, generation logic should prevent this, but the evaluator has no explicit guard.

Score role: **sign check** + **argmax**.
→ **Removal note:** no obvious board-only substitute — the forced-win concept is inherently defined by relative score ordering. However, the drawing-position edge case should be explicitly guarded.

#### `evalForbiddenColumns`, `evalZThreat`, `evalClaimeven`, `evalUndercut`, `evalOvercut`, `evalFigure7`, `evalJShape`

Scores are **not used** in evaluation. Correct column(s) are read from pre-stored fields on the puzzle record (`highlightMetadata`, `correctCol`). The score-based computation happened at generation time and was stored.

---

### `index.js` (API Layer)

#### `POST /api/scores`

Raw passthrough. Returns `solver.query(moves)` or `queryDepth(moves, depth)` directly. Clients (frontend heatmap, explain-move endpoint, admin debug tool) call this to obtain scores.

#### `POST /api/explain`

Spawns `c4solver -x` to get a 42+42 cell heatmap and calls `assignHeatmaps()`. This is a **separate solver invocation path** that does not use the standard 7-element score array. Not relevant to score removal planning.

#### `POST /api/explain-move`

Fetches scores via `solver.query()`, passes them to `classify()` for tagging, and includes the score array verbatim in the LLM prompt:

```
Solver scores for all columns: col 1: X, col 2: Y, ...
```

Scores serve as **context for the LLM** — not used algorithmically after classification.

#### `POST /api/puzzles/:id/check` (puzzle attempt evaluation)

*(The route is `/api/puzzles/:id/check`, not `/api/attempt`.)*

Fetches scores via `solver.query()` unconditionally, then calls `evaluatePredicate(puzzle, candidateCol, scores)`. Score dependency by category:

| Category | Scores used at eval? |
|---|---|
| `immediate_threat` | Yes — `score > 0` pre-filter before board check |
| `forced_block` | **No** — `evalForcedBlock` ignores scores (board-only) |
| `double_threat` | Yes — `score > 0` pre-filter + fallback argmax |
| `forced_win` | Yes — sign check + argmax |
| `forbidden_columns`, `z_threat`, `claimeven`, `undercut`, `overcut`, `figure_7`, `j_shape` | **No** — stored puzzle data only |

→ **Removal note:** `solver.query()` is called unconditionally for all categories. For `forced_block` and all new tactical categories, the call is wasted. Scores are only load-bearing for `immediate_threat`, `double_threat`, and `forced_win`.

#### `POST /api/puzzles/:id/sequence/move` (sequence-mode puzzles)

Handles sequence-mode forced_win puzzles. Uses `ForcedWinStrategy.validateMove()` and `getAiResponseCol()` — both pure board analysis from `completionStrategies.js`. **No solver scores are fetched anywhere in this route.** Score-independent by design.

#### `GET /api/admin/scores`

Debug tool: takes a `moves` string where the **last character is the candidate column** (i.e., the position *after* the click). The server strips the last character to get `preClickMoves`, queries scores for that position, runs `classify()` and `evaluatePredicate()`, and returns all three. For `forced_win` it calls `checkForcedWinPredicate` (solver-intensive); for `forbidden_columns` it calls `checkForbiddenColumnsPredicate` (board-only).

---

## Summary Table

| Usage site | How scores are used | Score role |
|---|---|---|
| `solverWeightedPosition` (debug trace) | `exp(score / T)` logged to plies | Continuous utility (logging only) |
| `solverWeightedPosition` (actual sampling) | Normalise to [-1,1], then softmax | Normalised continuous utility |
| `traceForcedWin` | Above/below `oiw` threshold | Binary gate |
| `getForcedBlock` | **Not used** (board simulation only) | — |
| `classify()` — immediate_threat | `score > 0` pre-filter | Binary gate |
| `classify()` — forced_block | `score >= 0` pre-filter | Binary gate |
| `classify()` — double_threat | (none — board-only) | Not used |
| `classify()` — forced_win | `score < 0`, allNegative, isBestBadMove | Ordinal comparison |
| `classify()` — forbidden_columns | `scores.every(s <= 0)` | Binary gate |
| `classify()` — fallback | sign of score → tag | Sign |
| `classifyBestMove` | argmax → calls `classify()` | Argmax |
| `detectZThreat` | `score > 0` pre-filter | Binary gate |
| `detectUndercut` | `score < 0` required | Binary gate |
| `detectOvercut` | `score > 0` required | Binary gate |
| `detectFigure7` / `detectJShape` | `score > 0` required | Binary gate |
| `detectClaimeven` | **Not used** (board parity only) | — |
| `runClaimevenSimulation` | argmax for Red's move (fresh query) | Argmax |
| `evalImmediateThreat` | `score > 0` pre-filter before `checkWin` | Binary gate |
| `evalForcedBlock` | **Not used** (board simulation only) | — |
| `evalDoubleThreat` | `score > 0` pre-filter; fallback argmax | Binary gate + argmax |
| `evalForcedWin` | All non-positive guard; argmax | Sign + argmax |
| `evalForbiddenColumns` / new categories | Not used | — |
| `POST /api/puzzles/:id/check` | Fetched unconditionally; wasted for most categories | — |
| `composeExplanation` (LLM) | Included verbatim in prompt | Informational context |

---

## Notable Design Patterns

1. **Scores are almost never used as magnitudes.** The dominant pattern is a sign or threshold check (`> 0`, `< 0`, `== opponentImmediateWin`). The only exception is softmax sampling in `solverWeightedPosition` (plus the normalised variant in `softmaxSample`).

2. **`opponentImmediateWin` is a computed constant, not a solver output.** The value `−floor((41 − moveCount) / 2)` is used only in `traceForcedWin`. It is not returned by the solver; it is derived from move count. Checking whether a score equals this value distinguishes "you lose immediately" from "you lose eventually." `getForcedBlock` and `evalForcedBlock` have **already migrated away from this constant** to direct board checks.

3. **`getForcedBlock` and `evalForcedBlock` are already score-free.** Both accept `scores` in their signatures but ignore them entirely. The `scores` parameter can be removed from both signatures as cleanup. The report's summary table previously listed both as score-dependent — that was incorrect.

4. **`detectClaimeven` outer function is score-free; only the inner simulation uses scores.** The `scores` parameter to `detectClaimeven(moves, scores, solver)` is never read. It can be removed. The internal `runClaimevenSimulation` does use scores, but via its own fresh `solver.query()` call.

5. **Evaluation at play time is score-independent for all new categories.** For `z_threat`, `claimeven`, `undercut`, `overcut`, `figure_7`, `j_shape`, and `forbidden_columns` — the correct column was determined at generation time and stored. `evaluatePredicate` reads from stored puzzle fields. The `solver.query()` call in `POST /api/puzzles/:id/check` is wasted for these categories plus `forced_block`.

6. **`double_threat` has two inconsistencies between generation and evaluation.** (a) `classify()` has no score gate; `evalDoubleThreat` does. (b) `classify()` counts threats at any reachable row; `evalDoubleThreat` counts only gravity-top threats. A position could pass one check and fail the other.

7. **`evalForcedWin` does not guard against drawing positions.** The guard `Math.max(...scores) > 0` passes when all scores ≤ 0, including when some equal 0 (draw). A drawing position silently reaches the argmax path and declares drawing moves correct for a `forced_win` puzzle.

8. **Empty board is never queried — two independent copies.** `EMPTY_BOARD_SCORES = [0, 0, 1, 2, 1, 0, 0]` is defined separately in `index.js` and `candidate-generator.js`. The values are approximate. If one copy is updated, the other will silently diverge.

9. **`POST /api/explain` is a distinct solver invocation.** It spawns `c4solver -x` and processes 84 heatmap values, independent of the 7-element score array. It is not part of the score-removal plan but should be noted in any solver-dependency audit.
