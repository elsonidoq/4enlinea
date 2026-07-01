---
name: project_reason_eval_set_selector
description: "reason coverage selector now enumerates a NAMED predicate universe (REQUIRED/PROVISIONAL) — the old \"SEEN predicates only, by design\" behavior is SUPERSEDED (D22)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 32600a87-3eae-4d12-80d6-d6e9ef850cf9
---

`connect-four/server/scripts/select_boards.mjs --strategy coverage` selects boards by
**reason-vector predicate coverage**: harvest mistake-weighted self-play
(`gameSampling.harvestBlunders`), run `computeReason`, keep a board while any predicate it carries is
under `--target` (default 2), stop on `satisfied()`. (Was `build_reason_eval_set.mjs`, deleted in the
2026-06-30 reorg — see [[project_reason_engine_reorg]].)

**SUPERSEDED by DECISION D22 (2026-07-01):** the selector no longer discovers predicates dynamically.
It enumerates the **full closed predicate universe UPFRONT** (`REASON_UNIVERSE` — every value of every
axis: `route`, `case`, `player`, `phase`, `severity`, the 7 `rd_<tag>_<direction>` pairs, `lost_*`,
`opp_*`, `tie_*`, `reg_*`, `tactic_*`, `parity_*`, `gate_*`), partitioned into:
- **`required`** — asserted reachable; `satisfied()` = every REQUIRED predicate ≥ target. A real
  completeness claim, NOT the old "every predicate I happened to SEE reached target."
- **`provisional`** — known-rare / structurally-unreachable in self-play; reported (as `never-seen`,
  marked `*`) but NON-blocking; never gates termination.

Non-obvious consequences:
- **`MAX_GAMES` is now a BUG-BOUND, not a normal exit.** Reaching it means a REQUIRED predicate could
  not be filled — investigate (the final log names it). The old "run legitimately to MAX_GAMES on a
  stuck-at-1 rare predicate" is gone: such predicates belong in `provisional`.
- **A `discovered ⊆ REASON_UNIVERSE` guard THROWS** on any engine-emitted predicate not in the named
  universe (I12 on the selector). Add a new axis to `reasonPredicates` → you MUST add its values to
  `REASON_UNIVERSE` or the harvest crashes.
- **Calibrated provisional set (D22):** `rd_double_threat_enabled_opponent`,
  `rd_figure_7_enabled_opponent` (0 hits under an all-suboptimal-columns harvest — 13,937
  enabled_opponent tags checked, 0 forks), `gate_exhaustive` (1 hit/497 games), `lost_realized_forced_block`
  (never seen), `tie_temporal`, `lost_denial_no_occupation`, `lost_realized_figure_7`, `lost_fork_B`,
  `parity_unnameable`, `opp_parity_unnameable`. DEFERRED hypothesis: widen the per-player
  mistake-probability range in sampling to reach these.
- **The 5s heartbeat + final summary** print fulfilled/under-target/never-seen against the named
  universe — the diagnostic for which REQUIRED predicate is holding up a run.

Output is a board list → `compute.mjs` (the sole place `computeReason` runs). `generate_eval_set.mjs`
(the OLD deep-reveal explain-eval board generator, unrelated to the reason pipeline) was DELETED as
redundant — the old LLM-explanation eval is retired; only the reason vector is evaluated now. See
[[project_reason_engine_reorg]], [[reference_deep_reveal_eval_harness]], and DECISIONS D22.
