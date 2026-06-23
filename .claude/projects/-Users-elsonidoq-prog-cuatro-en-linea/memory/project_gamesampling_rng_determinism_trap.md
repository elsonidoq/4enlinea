---
name: project_gamesampling_rng_determinism_trap
description: Changing playGame/gameSampling rng usage shifts which candidates a seed produces; candidate-generator tests assert length properties that depend on the stream
metadata: 
  node_type: memory
  type: project
  originSessionId: 3f20054b-9050-4719-a610-d4ba490b0ecf
---

`generateCandidates` (candidate-generator.js) runs many rollouts off ONE seeded `rng`
(mulberry32). Any change to how `playGame`/`sampleColMP` consume `rng()` — even a single
extra call — shifts the rng stream and changes *which* candidates a given seed produces.
Same-seed reproducibility (run twice → identical) is preserved, but cross-version output
is NOT.

**Why:** Trap surfaced porting candidate-generator onto `playGame`. The old loop checked
its predicate BEFORE sampling and returned without consuming the matching ply's sample
`rng()`; `playGame` samples THEN yields, so a matched rollout consumes one extra `rng()`,
shifting all subsequent rollouts.

**How to apply:** When touching gameSampling.js or any caller's rng usage, expect
`candidate-generator.test.js` candidate sets to change. Those tests assert *properties*
not exact strings — chiefly `move_string.length >= 14` (T017) and median `>= 14`
(SC-002). These pass deterministically ONLY because FR-011 forces the per-rollout minimum
to `14 + Math.floor(rng()*21)` ∈ [14,34]. If you ever see a `length 12` failure, the
minMoves floor was lowered (the pre-port code had a latent `8 + floor(rng()*10)` bug that
passed T017 only by seed-luck). Verify with the real-solver integration test, run ONCE
(IPC-hang trap — see [[project_integration_test_slowness]]); `npm run test:fast` excludes it.
See [[reference_game_simulation_harness]].
