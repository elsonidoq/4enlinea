---
name: reference_eval_set_large_3_sparse_subset
description: "eval_set_large_3_sparse.json is a strict subset of eval_set_large_3.json — don't treat as a separate set"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 29a169dd-5477-4b5f-aaf8-13766baa9aac
---

`connect-four/server/scripts/eval_set_large_3_sparse.json` (20 entries, all `is_sparse`,
only `drawing_move`/`suboptimal_move`) is a **strict subset** of
`eval_set_large_3.json` (66 entries, 13 categories, 20 sparse). The two share the same
`eval-N` id namespace, so combining them double-counts and collides ids.

**Why:** when stratifying / freezing an eval subset, use `eval_set_large_3.json` alone —
it already contains every sparse case. Pulling `_sparse` in separately adds nothing and
breaks 1:1 joins by `id`.

Related: [[reference_deep_reveal_eval_harness]], [[reference_game_simulation_harness]].
