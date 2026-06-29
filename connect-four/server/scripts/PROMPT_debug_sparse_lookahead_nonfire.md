# Debug task: why does the sparse forward look-ahead NOT fire on eval-0?

## How to work this
Use the **scientific-method-debugging** skill (Empirical Debugger). Form explicit
hypotheses, instrument, and let evidence decide. Do NOT propose a fix until you have a
reproduced, evidence-backed root cause. This is an investigation, not an
implementation task — your deliverable is a root-cause writeup, not a code change.

## Background
We just shipped a "sparse-board forward look-ahead" engine
(`connect-four/server/sparseLookahead.js`), wired into `buildExplainContext`
(`connect-four/server/explainContext.js`, Step 8b, ~line 599). On an "anchorless"
blunder (no threat-comparison rows shown AND no Tier-1/2 pattern, i.e. `isSparse`),
it simulates forward over the opponent's *mistakes* to find a concrete Tier-1 winning
structure the better move reaches, and surfaces it under a prompt section
`## What the better move leads to`.

In a 54-entry eval run, 10 entries were `is_sparse:true` but the look-ahead section
fired on only **1** of them. The other 9 produced no section (`lookaheadFired:false`).
The working assumption in the arch doc is that these are honest nulls
("opponent-indifference dead-ends"). **The operator does not believe that** — they
expect these positions to fire — so we need to find out empirically whether each null
is a genuine dead-end or a bug in the search/selection/compare logic.

Authoritative reference for the intended behavior:
`connect-four/docs/architecture/llm-coach-endpoints.md` → "Sparse-board forward look-ahead".

## The single case to debug: eval-0
- `movestring` (board_state): `"33"`  (two discs, both dropped in column index 3 / display column 4 — visualize it first)
- `move_played` (0-indexed col): `2`  (the blunder)
- `correct_move` / better move (0-indexed col): `3`
- `pattern_category`: `suboptimal_move`, severity 1
- Derived perspective (from `buildExplainContext`): `movestring.length % 2 === 0 ? 1 : 2` → length 2 → **perspective 1 (Green, the blundering player, is to move at `"33"`)**.

Always run `./visualize_board.sh 33` from the project root first to see the board — never
reason about the movestring blind. (See the CLAUDE.md board-visualization section.)

## Direct repro entry point
The look-ahead is called as (explainContext.js ~611):
```js
runSparseLookahead({ movestring: "33", playedCol: 2, bestCol: 3, perspective: 1 }, { solver })
```
It returns `null` for this case (→ no section). Your job is to find out *where and why*
the signal collapses to null.

`runSparseLookahead` (sparseLookahead.js):
1. builds `bestRoot = "33" + "3"` and `playedRoot = "33" + "2"`,
2. runs `searchOpportunities` on each (depth `LOOKAHEAD_DEPTH=4`, budget 60 classify calls each),
3. `compareOpportunities(bestTally, playedTally)` → returns a winner only if some Tier-1
   tag has `bestBranches - playedBranches >= MIN_BRANCH_DELTA (1)`.

## Hypotheses to test empirically (rank/extend with evidence — do not assume)
- **H1 (mistake-gradient collapse):** `selectOpponentMistakeCols(scores, board)` returns
  `[]` whenever all legal columns share one score tier (line ~35: "all equal — no mistake
  gradient") OR when the best/worst-tier trimming leaves nothing. At a 2–3 ply opening the
  solver scores may be flat or nearly flat, so the opponent-mistake branch set is empty and
  the recursion never reaches a player node that classifies a structure. Instrument the
  cols returned at each opponent node.
- **H2 (genuine dead-end):** the position really is drawn/indifferent — no Tier-1 structure
  is reachable within depth 4 even when the opponent errs, so both tallies are empty and the
  null is honest. Distinguish this from H1 by checking whether `searchOpportunities` ever
  reaches a player node and what `extractTier1Structures` returns there.
- **H3 (compare cancels):** structures are found but `bestTally` and `playedTally` carry the
  same tags/branch counts, so `compareOpportunities` finds `delta < 1` and returns null.
- **H4 (budget/timeout):** `classifyPatternWithTimeout` is silently returning empty Maps
  (timeout or IPC), so structures are never recorded. Check whether the 4s timeout fires.

## Tools / how to run things
- Inline Node scripts: read memory `reference_inline_node_scripts.md` and
  `reference_supabase_connection.md` first. Key gotchas: `cd connect-four` so imports
  resolve; the solver export is `createSolverProcess`; the solver hangs unless you close it
  (wrap in try/finally and call its close/kill). The solver wrapper translates coordinates
  internally — pass 0-indexed values.
- You can import and call `searchOpportunities`, `selectOpponentMistakeCols`,
  `extractTier1Structures`, `compareOpportunities` directly (they are all exported) and add
  `console.log` instrumentation in a throwaway script under
  `connect-four/server/scripts/` — do not leave instrumentation in the library files.
- `./visualize_board.sh <movestring>` for board + per-column solver scores + threats.
- For c4solver score semantics see memory `reference_c4solver_scores.md` and
  `reference_c4solver_score_universality.md`.

## Deliverable
A short root-cause writeup that answers:
1. For eval-0, does the search ever reach a player node and find any Tier-1 structure? If
   not, at which stage does it stop (opponent-mistake selection / depth / budget / timeout)?
2. Is the null a **genuine dead-end** (H2) or a **bug/over-aggressive pruning** (H1/H3/H4)?
   Give the concrete evidence (logged tallies, returned cols, scores).
3. If it is a bug or a too-aggressive heuristic, name the exact function and condition
   responsible and sketch (do not implement) the minimal change that would let legitimately
   winning sparse positions fire — and note any positions that *should* still return null so
   the fix doesn't reintroduce fabrication on truly drawn boards.
4. Whether the same root cause plausibly explains the other 8 non-firing sparse entries
   (eval-3, eval-5, eval-10, eval-12, eval-14, eval-15, eval-16, eval-17) — most are
   `drawing_move`/low-severity `suboptimal_move` on near-empty boards.
