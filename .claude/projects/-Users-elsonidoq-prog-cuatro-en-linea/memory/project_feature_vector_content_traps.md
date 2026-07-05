---
name: project_feature_vector_content_traps
description: "feature_vector content traps from the sufficiency experiment: null lookahead outcomes on losing_either_way; patternsOpponent snapshot ambiguity; pliesToEnd inverted semantics; immediate_threat severity stamped from tag name"
metadata: 
  node_type: memory
  type: project
  originSessionId: 29a169dd-5477-4b5f-aaf8-13766baa9aac
---

Found while building the Feature-Vector Sufficiency grader (2026-06-26). Both are gotchas in the
**content** of `feature_vector` (`toFeatureVector` in `server/explainContext.js`) that the glossary
(`docs/architecture/feature-vector-glossary.md`) does not warn about — they bite any consumer that
reads the vector to reconstruct ground truth.

**1. `lookahead.bestOutcome` / `postBlunderOutcome` are `null` when `lookahead.case ===
'losing_either_way'`** (both moves lose). The glossary §5.3 presents these outcome labels as the
result of each move, so a consumer naturally checks against them — but for the whole
`losing_either_way` class they are null, not `"loss_with_best_play"`. **How to apply:** any check
that maps the vector's outcome labels (e.g. the grader's A2 axis) MUST fall back to the solver when
they are null — `best_scores`/`played_scores` on the run_eval record are opponent-perspective after
the move, so the moving player's outcome = sign of `-(max opponent legal score)` (>0 win, =0 draw,
<0 loss). Verified: eval-8/eval-12/eval-42/eval-56 all derive loss/loss this way.

**2. `patternsOpponent` board-snapshot is ambiguous and can disagree with the after-played board.**
On eval-51 (figure_7/enabled_opponent) the vector's `patternsOpponent` listed
`immediate_threat: {cells:["c5r5"]}` and a `j_shape`, but `visualize_board.sh` on the after-played
board (`43333451540`) shows **"Major threats: none"** and `patternsPostBlunder` is `{}`. Glossary
§5.1 never states **which board snapshot** `patternsOpponent` is computed on, so a reader places it
on the after-played board and produces a claim the board contradicts. **How to apply:** this drives
fabrication-looking A4 failures that are really a context blindspot (field + glossary gap), not a
model error — exactly the counterexample class the sufficiency experiment exists to surface.
Candidate fix: pin/clarify the snapshot in the glossary, or have `toFeatureVector` emit
`patternsOpponent` per-snapshot.

**3. `lookahead.outcomeTiming.*.pliesToEnd` is inverted, and the glossary describes it backwards.**
`toPliesToEnd` (`server/sparseLookahead.js`) returns `Math.abs(score)`. Per `reference_c4solver_scores`,
a SMALL `|score|` resolves LATE (slow) and a LARGE one resolves SOON — the opposite of a forward
"plies from now" count. So `played.pliesToEnd:1` on eval-6 is a **~22-ply zugzwang loss**, not a
1-ply loss. The strong floor model read it as "loses at once" and fabricated. The glossary (~line 323,
339) was corrected 2026-06-28 to flag this; the code is still `Math.abs(score)`. **How to apply:**
never treat `pliesToEnd` as "moves from now"; the proposed fix is `endMove(score) - movestring.length`
(end-move via c4solver inverse formula). Surface it *tactically* — the vector must not mention solver
scores.

**4. `immediate_threat` severity is stamped from the tag name, not verified.** `patternSeverity`
(`server/explainContext.js` ~line 86-92) returns `'immediate'` for any `immediate_threat`/`double_threat`
tag unconditionally; `classifyPattern` can emit `immediate_threat` on a cell that does NOT complete a
4-in-a-row (eval-6: `patternsOpponent.immediate_threat:["c3r2"]` while c3r2 is simultaneously in
`opponentMinor` and only DRAWS). Project rule (`reference_cat5_forced_block_detection`): never infer
immediacy from a tag/score — verify with `checkWin` at the gravity-top cell. **How to apply:** gate
`severity:'immediate'` on a real win-completion check before trusting the field as a decisive threat.

Cross-cutting principle (from the v2 sufficiency run): **a confidently-wrong field is worse than an
absent one** — Condition B (fields stripped) abstains; Conditions A/C with misleading fields fabricate
at high confidence. Prune/verify aggressively; absence is safer than a plausible-but-wrong value.

Related: [[feedback_feature_vector_design]], [[project_explain_prompt_grounding_traps]],
the retired old-explain eval (reason eval is now `compute.mjs`, D22), [[reference_c4solver_scores]],
[[reference_cat5_forced_block_detection]].
