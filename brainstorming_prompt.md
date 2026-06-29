# Brainstorm: a principled `reason` field for the Connect-Four blunder feature vector (anchor case: eval-6)

  You are starting a design brainstorm. **Your first action MUST be to invoke the `/superpowers:brainstorming` skill** and run this as a brainstorming session (explore intent, requirements, and
  design trade-offs *before* proposing any implementation). Do not jump to code.

  ## Background (what this is)

  The deep-reveal coach explains *why a Connect-Four move was a blunder*. We feed an LLM a compact, board-grounded **feature vector** (`toFeatureVector` in `connect-four/server/explainContext.js`,
  documented field-by-field in `docs/architecture/feature-vector-glossary.md`) plus the glossary, and ask it to reconstruct the reason. A "Feature-Vector Sufficiency Experiment"
  (`docs/architecture/feature-vector-sufficiency-experiment.md`) floor-tests whether the vector carries enough information: a strong model (`gpt-5.4`) gets only the vector + glossary, no tools,
  and we grade its explanation against the solver/board on four axes (A1 better move, A2 outcomes, A3 mechanism real & decisive, A4 no fabrication).

  **The problem this brainstorm attacks:** the vector exposes a *lot* of structured data (threat tallies, pattern tags, lookahead category diffs), but **nothing in it directly states *why* the
  played move is worse than the best move.** The model is left to infer the causal story, and on hard cases it fabricates one. The worst-graded case in the latest run is **eval-6**, which we use
  as the anchor / acid test below.

  Authoritative reading before you ideate (skim, don't just trust this prompt):
  - `docs/architecture/feature-vector-glossary.md` (field semantics; §6 on pruning/absence)
  - `docs/architecture/feature-vector-sufficiency-experiment.md` (the eval contract)
  - `connect-four/server/sparseLookahead.js` (the lookahead algorithm where any new computation would live — note `runSparseLookahead`, `outcomeTiming`, `buildDecisiveLine`, `categoryExamples`,
  and the depth/budget tiers)
  - `docs/knowledge-base/README.md` and the entries for `undercut`, `allen-t2`, parity, z-threat, claimeven (Connect-Four strategic theory — "winning line" is parity/zugzwang theory, not just a
  4-window)
  - Memories: `project_feature_vector_content_traps.md`, `project_lookahead_shared_seam.md`, `reference_c4solver_scores.md`, `reference_cat5_forced_block_detection.md`,
  `reference_z_threat_detection.md`
  - Run `./visualize_board.sh <movestring>` (repo root) to observe any board; the solver wrapper is `connect-four/server/c4solver-wrapper.js`.

  ---

  ## The anchor case: eval-6 (category `undercut`) — all data embedded

  **Position.** `movestring = "444423333643535655"` (0-indexed columns; 18 discs, **Green to move**).
  - Played move: column **1** (0-indexed) → lands `c2r1`. **Blunder.**
  - Correct move: column **2** (0-indexed) → lands `c3r2`. **Best.**
  - Pre-move per-column solver scores (player-to-move = Green): `[-11, -1, 0, -1000, -11, 0, -11]` → col3 (`0`) and col6 (`0`) draw; the played col2 (`-1`) **loses**.
  - Outcome: **best = draw, played = loss** (a draw→loss blunder).

  **Pre-move board** (`./visualize_board.sh 444423333643535655`):
  ```
    Move 18  |  Next: Green
          1      2      3      4      5      6      7
    6  |      | (gn) |      | Gy14 |      | (gn) | (gy) |
    5  |      | (gy) | [Gn] | Gy12 | Gn11 | (gy) |      |
    4  |      | (gn) | (gy) | Gn 9 | Gy 4 | Gy18 | (gy) |
    3  |      |      | (gn) | Gy 8 | Gn 3 | Gn17 | (gy) |
    2  |      | (gn) | (gy) | Gn 7 | Gy 2 | Gn15 | Gy16 |
    1  |      | (gy) | Gn 5 | Gy 6 | Gn 1 | Gn13 | Gy10 |
   par |  6E  |  6E  |  5O  |  0E  |  1O  |  2E  |  4E  |
   scr | -11  |  -1  |   0  |  --  | -11  |   0  | -11  |
    Major threats: col3 row5 (Gn)
  ```

  **After BEST (Green plays col2→c3r2):** `./visualize_board.sh 4444233336435356552`
  ```
    Move 19  |  Next: Gray
   scr | -10  | -10  |   0  |  --  | -10  | -10  |   0  |
    Major threats: col3 row5 (Gn)     # Gray's best replies (col3/col7) DRAW
  ```

  **After PLAYED (Green plays col1→c2r1):** `./visualize_board.sh 4444233336435356551`
  ```
    Move 19  |  Next: Gray
   scr |  -2  |  -2  |   0  |  --  |  -4  |   1  |   1  |   # Gray WINS via col6/col7 (+1)
    Major threats: col3 row5 (Gn)     # Gray has NO major threat; c3r2 is only a Gray (gy) MINOR and DRAWS
  ```

  **Ground-truth observations (verified on the boards):**
  - The loss is a **deep, full-board zugzwang** decided ~22 plies out (Gray's win score is `+1`, the smallest magnitude = latest possible). Gray has **no major/immediate threat** on the
  after-played board.
  - The vector's `patternsOpponent.immediate_threat = c3r2` is misleading: c3r2 is a Gray **minor** threat, and Gray playing it only **draws** (`scr col3 = 0`). The real winning replies are
  col6/col7.
  - The best move (c3r2) is the **undercut** square: Green takes it to deny the parity/zugzwang. The undercut relation is `c3r2` (lower) vs Green's major at `c3r5` (upper), same column, opposite
  parity.

  **Full feature vector for eval-6:**
  ```json
  {
   "movestring": "444423333643535655", "perspective": 1,
   "playedCol": 1, "bestCol": 2, "playedCell": "c2r1", "bestCell": "c3r2",
   "gapBucket": "moderate", "tag": "undercut", "direction": "enabled_opponent",
   "isSparse": false, "centerDominance": false,
   "patternsBest": {}, "patternsPreMove": {}, "patternsPostBlunder": {},
   "patternsOpponent": { "immediate_threat": { "cells": ["c3r2"], "owner": "opponent", "severity": "immediate" } },
   "threatStats": {
     "pre":   { "playerMajorParityAligned": {"count":1,"cells":["c3r5"],"owner":"player","severity":"major"},
                "playerMinor": {"count":4,"cells":["c2r2","c2r4","c3r3","c6r6"],"owner":"player","severity":"minor"},
                "opponentMinor": {"count":8,"cells":["c2r1","c2r5","c3r2","c3r4","c6r5","c7r3","c7r4","c7r6"],"owner":"opponent","severity":"minor"},
                "playerMajorTotal": 1 },
     "best":  { "playerMajorParityAligned": {"count":1,"cells":["c3r5"],...},
                "playerMinor": {"count":6,"cells":["c1r2","c2r2","c2r4","c3r3","c3r4","c6r6"],...},
                "opponentMinor": {"count":6,"cells":["c2r5","c3r4","c6r5","c7r3","c7r4","c7r6"],...},
                "playerMajorTotal": 1 },
     "played":{ "playerMajorParityAligned": {"count":1,"cells":["c3r5"],...},
                "playerMinor": {"count":4,"cells":["c2r2","c2r4","c3r3","c6r6"],...},
                "opponentMinor": {"count":7,"cells":["c2r5","c3r2","c3r4","c6r5","c7r3","c7r4","c7r6"],...},
                "playerMajorTotal": 1 }
   },
   "lookahead": {
     "case": "better_holds_played_loses",
     "bestOutcome": "draw_with_best_play", "postBlunderOutcome": "loss_with_best_play",
     "outcomeTiming": { "best": {"outcome":"draw","pliesToEnd":null},
                        "played": {"outcome":"loss","pliesToEnd":1} },
     "reachability": { "best": {"floor":"draw","ceiling":"draw"},
                       "played": {"floor":"loss","ceiling":"win"} },
     "edgeType": "tactical",
     "categoryExamples": [
       { "tag":"minor_threat","owner":"player","severity":"minor",
         "bestNovel":[{"cells":["c7r5"],"realizedOnPly":10},{"cells":["c7r6"],"realizedOnPly":10}],
         "playedNovel":[{"cells":["c3r3"],"realizedOnPly":2},{"cells":["c6r6"],"realizedOnPly":2}],
         "novelInstances":4 },
       { "tag":"undercut","owner":"player",
         "playedNovel":[{"cells":["c3r2","c3r5"],"realizedOnPly":2}], "novelInstances":1 }
     ],
     "oppCategoryExamples": []
   }
  }
  ```

  **The six LLM responses (model `gpt-5.4`, floor test):**
  - **A0 / A1 / C0 / C1 (confidence: high)** — all four told the *same board-false story*: "playing col2 lets the opponent play c3r2 *immediately*, killing your major at c3r5; the better move
  occupies c3r2 and holds the draw; the played move *loses at once*." (False: c3r2 only draws; the loss is a col6/col7 zugzwang ~22 plies out.) `unsure_about` only hedged "the exact 4-cell winning
  window," never the central falsehood. `fields_relied_on` centered on `patternsOpponent.immediate_threat.cells`, `lookahead.outcomeTiming.played.pliesToEnd`, `lookahead.categoryExamples`, `tag`,
  `direction`.
  - **B0 / B1 (confidence: low)** — engineered fields stripped; both honestly abstained ("cannot determine the mechanism"), empty `key_cells`; B0 guessed best=loss, B1 guessed draw/draw (both
  wrong on outcome).

  **The grade (eval-6, all three conditions FAIL):**
  - **A:** A1 pass, A2 pass, A3 **fail**, A4 **fail** — "immediate threat at c3r2 / loses at once" contradicts the board; the real loss is a slow zugzwang via col6/col7.
  - **B:** A2/A3 fail (outcomes guessed, no mechanism); A4 pass (nothing to fabricate).
  - **C:** same as A (A3/A4 fail).
  - Root-caused counterexamples: (1) `patternsOpponent.immediate_threat` mislabels a minor/undercut cell as "immediate"; (2) `pliesToEnd: 1` read as "1 ply from now" when it means "resolves on the
  last ply" (slow); (3) the vector carries no field that *states the causal reason*, so the model invents one.

  ---

  ## The proposal to evaluate (from the project owner)

  > The vector should have a **`reason`** field that explains directly *why the blunder is worse than the best line*. We should be able to determine this **algorithmically** by confirming,
  **principally**, a **winning line of Connect Four that appears in one branch but not the other** — that is the first step, and it belongs in the lookahead algorithm.
  >
  > Today the vector provides a lot of data, but it's unclear how that information explains *why* a move was suboptimal. A direct first step: **collect all winning lines from both sides** and
  determine **which ones appear, for which player, in which time horizon**. Then enrich the `reason` field with other tactical information.
  >
  > Two relevant cases:
  > 1. **A losing situation (faster loss):** the player chose a faster-losing move. Detect it by finding an **opponent winning line in a near horizon that disappears under the better move.**
  > 2. **A sign-flip situation:** **opponent winning lines appear on the blunder move that do not appear otherwise.**

  **Goal of the brainstorm:** pressure-test this proposal and converge on a concrete, principled, *verifiable* design for a `reason` field (and the lookahead computation behind it) that would have
  produced a *true, decisive* explanation for eval-6 — and generalize across the blunder taxonomy. The deliverable is a design direction + open questions resolved, **not** code.

  ---

  ## Critique / blindspots to address in the session

  Treat each of these as a requirement the design must answer. Do not accept the proposal as-is; resolve these first.

  1. **"Winning line" ≠ a materializable 4-window within a horizon — and eval-6 proves it.** The after-played board has **no opponent major/immediate threat at all**; the loss is a parity/zugzwang
  resolved ~22 plies out via col6/col7. A naive "find a 4-in-a-row that appears in one branch" would find **nothing** decisive here, yet the move loses. The design must handle losses decided by
  **parity / zugzwang / Zugzwang over odd-even threats** (Allis/Allen theory; see KB `allen-t2`, parity, z-threat), where the "reason" is *control of a threat's parity*, not a concrete forcing
  line. How does `reason` express "you ceded the zugzwang" principally?

  2. **Horizon vs. depth vs. budget tension.** `sparseLookahead` runs under call/ depth budgets (INITIAL/EARLY/default tiers). Deep zugzwang wins (eval-6: ~22 plies) lie far beyond any near
  horizon. Define precisely: what horizon? What happens when the decisive resolution is beyond it? Is a bounded search even capable of "confirming a winning line" for these cases, or must `reason`
  degrade gracefully to a quantitative/parity statement?

  3. **Credit assignment — *which* difference is THE reason.** Branches differ in *many* threat-sets at once (eval-6's `categoryExamples` already lists a `minor_threat` diff *and* an `undercut`
  diff). "Appears in one branch, not the other" is **necessary but not sufficient** for decisiveness: an appearing line can be a *ghost* (unreachable) or *neutralized* (eval-6's undercut is
  literally a neutralization!). The design must tie `reason` to the move actually on the **optimal principal variation**, not to any structural diff. How is the PV obtained and how is a candidate
  line verified as *the* cause (e.g., "remove the blunder ⇒ the line is gone ⇒ outcome changes")?
  4. **The two-case taxonomy is incomplete and opponent-skewed.** It covers loss-related transitions but not **win→draw / win→loss where YOU throw away your own winning line** (this is the entire
  `drawing_move` category — eval-0, eval-2 — where the reason is a *player* winning line that appears under best but not under played, with no opponent line involved). Also **`losing_either_way`**
  (eval-8, eval-10, eval-42): both moves lose, no line "appears/disappears," and the only true reason is "loses N plies faster" via tempo/parity. Enumerate the full transition matrix
  (win/draw/loss × win/draw/loss, plus both-lose-faster) and define what `reason` says for each cell — including the cases the proposal omits.

  5. **Don't leak solver vocabulary; keep `reason` tactical.** The project invariant (owner's prior instruction) is that the vector must speak in *tactical* concepts (threats, columns, parity,
  named patterns), never solver scores/`pliesToEnd`-as-magnitude. `reason` may be *computed* from the solver but must *read* tactically. How do we phrase "loses the parity battle" or "concedes the
  col6/col7 odd-threat" without referencing scores?

  6. **Reuse the existing strategic machinery, don't fork it.** The repo already has `classifier.js`/`classifyPattern`, a strategic KB, z-threat/claimeven/undercut/parity detectors, and
  `collectNovelOpportunities`/`compareOpportunities` (the shared seam feeding both the vector *and* the production annotation gate — see `project_lookahead_shared_seam.md`). A parallel "collect
  all winning lines" pass risks divergence and double-maintenance. Where should the `reason` computation sit, and how does it compose with what exists rather than duplicate it?

  7. **Verifiability — the grader must be able to confirm `reason`.** The whole experiment hinges on a privileged grader checking claims against the board/solver. Define the **acceptance test for
  a generated `reason`**: e.g., every cell it names exists on the stated snapshot (`checkWin`/`visualize_board`), the named line is on the realized PV, and the better move provably removes it /
  changes the outcome. If `reason` can't be mechanically verified, it just moves fabrication from the LLM into the generator.

  8. **Severity/timing correctness is a prerequisite.** `reason` will lean on threat severity and timing, which are *currently buggy* (eval-6: `immediate_threat` stamped on a non-winning cell;
  `pliesToEnd` semantics inverted). Decide whether `reason` depends on fixing those first, and whether it should compute severity itself via `checkWin` at the gravity-top cell (the project rule:
  never infer immediacy from a score/tag).

  9. **Cost & failure modes.** "Collect all winning lines from both sides across the horizon" could blow the call budget or hit solver hangs on terminal/won strings
  (`reference_c4solver_behavior.md`). What's the budget, the caching story (INITIAL tier already caches), and the behavior on solver error/timeout — does `reason` become `null`, and how does the
  prompt treat an absent `reason`?

  10. **eval-6 acid test (use it as the session's running example).** For any design you converge on, walk it through eval-6 end to end and show the *exact* `reason` string/structure it would
  emit, then confirm against the board that it is (a) true, (b) decisive, (c) tactical, (d) grader-verifiable. If the design can't produce a correct reason for eval-6 — the case that motivated it
  — it isn't done.

  ## Desired output of the brainstorm
  - A crisp problem statement and the resolved decisions for blindspots 1–10.
  - A proposed **shape** for `reason` (structure + how it reads), the **algorithm** to compute it in the lookahead (including the PV/decisiveness step and the parity/zugzwang fallback), and where
  it lives relative to existing code.
  - The **transition-matrix coverage** (what `reason` says for each outcome transition, including win→draw and losing_either_way).
  - The **grader acceptance test** for a `reason`.
  - The eval-6 worked example.
  - A short list of follow-ups (enrichment beyond v1, dependencies on Bug 1/Bug 2 fixes).

  Remember: **invoke `/superpowers:brainstorming` first** and run this as a real brainstorm — surface options and trade-offs, challenge the proposal, and converge. No implementation code in this
  session.
