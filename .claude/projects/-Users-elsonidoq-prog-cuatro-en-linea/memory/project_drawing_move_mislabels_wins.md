---
name: project_drawing_move_mislabels_wins
description: "Open bug — blunder tagging labels a win-forfeiting move as drawing_move; the prompt then asserts \"not a win\" falsely"
metadata: 
  node_type: memory
  type: project
  originSessionId: 8e0529ea-465b-46f1-afef-31862eabe6f1
---

The `drawing_move` blunder tag is applied to positions where the **better move is a forced win**, not just a draw. On an empty/near-empty board, center (col 4, 0-idx 3) is a first-player win (premove score +1/+2) while col 3/col 5 only draw; playing the drawing column gets tagged `drawing_move`. Found in the deep-reveal eval `eval_set_large_2_nonfiring_lookup_evals` (eval-12, eval-16), 2026-06-25.

**Why:** the tag describes the *played* move's outcome (a draw) but the grounding rule it triggers (`llmCoachHelpers.js`, the `tag === 'drawing_move'` branch) used to assert "the position is a draw, **not a win for either side**" — which is false when the better move wins. That false premise pushed the LLM to under-claim or invent a non-tactical reason.

**How to apply:** Fix 4 (done 2026-06-25) reworded the grounding rule to stop asserting "not a win" and instead say the played move only draws while a stronger move existed — a text-level patch. The **real** fix (Fix 6, NOT yet done) is upstream in the blunder-tagging pipeline: a move that forfeits a forced win should be categorized as a missed win / outcome_flip, not `drawing_move`. See `docs/architecture/server-conventions.md` §`tagBlunder`. Until then, `drawing_move` semantically conflates "played move draws, best draws" with "played move draws, best WINS".

Related: the same eval drove the sparse-lookahead deepening and the always_include rollback — see [[project_lookahead_shared_seam]] and [[project_explain_system]].
