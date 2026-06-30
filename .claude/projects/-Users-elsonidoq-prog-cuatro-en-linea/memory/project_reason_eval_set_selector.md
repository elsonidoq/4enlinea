---
name: project_reason_eval_set_selector
description: build_reason_eval_set coverage is over SEEN predicates only — structurally-rare cases never enter the set, and that's by design
metadata:
  type: project
---

`server/scripts/build_reason_eval_set.mjs` selects boards by **reason-vector predicate coverage**:
harvest mistake-weighted self-play (`gameSampling.harvestBlunders`), run `computeReason`, and keep a
board while any predicate it carries is under `--target` (default 2). It **stops the instant
`satisfied()` is true** (every predicate SEEN SO FAR has reached the target) — there is no fixed
predicate universe and no plateau.

Non-obvious consequences (you will NOT see these by reading the code):
- **Coverage is over SEEN predicates only.** A structurally-rare or near-impossible predicate (e.g.
  `lost_denial_no_occupation`, which per DECISIONS D18 basically never fires at full depth; or
  `tie_independent`, also near-gone post-D18) never enters the counter, so it neither blocks
  termination NOR appears in the eval set. The set covers "every case that actually occurs," not a
  declared universe. If you need a rare case represented, harvest won't get it — source it manually.
- **The 5s heartbeat is the diagnostic.** It prints `checked` (positions examined) · `generated`
  (kept) · under-target predicates WITH counts. A predicate sitting at `(1)` for a long stretch is
  the genuinely-rare one gating the run (commonly `opp_denial` = win_to_draw fork-denial). It is NOT
  a bug — it's a real but infrequent board shape.
- **Earlier termination bug (fixed 2026-06-30):** the plateau check compared the *kept* count against
  itself, so once coverage completed nothing more was kept and the loop ran to `MAX_GAMES` for
  nothing (symptom: `under-target(0): none` but still running). The fix breaks immediately on
  `satisfied()`. If you re-introduce a "keep going to discover new predicates" grace window, measure
  it in EXAMINED boards (`checked`), never kept ones.

Output is `{id, pattern_category, feature_vector}` (narrator vector). Distinct from
`build_fv_eval_set.mjs`, which freezes a subset of the PRECOMPUTED corpus (no solver). Both are
slated to merge into a single `select_boards.mjs` + `compute.mjs` — see [[project_reason_engine_reorg]].
