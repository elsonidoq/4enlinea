---
name: project_select_boards_skips_openings
description: RESOLVED — select_boards samples openings: fixture additive band + coverage deterministic Phase-1 step (seed-local RNG); 3 PROVISIONAL opening predicates
metadata: 
  node_type: memory
  type: project
  originSessionId: 4f6802b0-e9e6-4ad7-83f4-13466dbbe726
---

**RESOLVED on branch `opening-theory` (2026-07-05, Task B4, commit e56fe26).** Historically
`connect-four/server/scripts/select_boards.mjs` excluded opening positions: the `fixture` config had
`CFG.discMin: 12 // skip opening theory`, so `phase_opening` and any opening-specific reason was
never sampled — a mismatch, since `computeReason` already classified `board_state: opening`
(`REASON_CONFIG.openingMaxDiscs: 15`).

That gap is now closed in TWO places:
- **`fixture` strategy (B4):** an **additive opening harvest band** (discs ~1–14) alongside the
  untouched mid-game band (`discMin` 12 still governs the mid-game pass; opening uses a separate
  `counts.opening.*` bucket). Derivation was **extracted into `reasonEvalPredicates.mjs`**
  (unit-testable).
- **`coverage` strategy (2026-07-05, Task 6):** a **deterministic Phase-1 opening step** runs FIRST,
  INSIDE the same single `try/finally` as the stochastic Phase-2 `harvestBlunders` loop. For each KB
  line (`loadOpeningLines()`) it walks `shuffle(evenAndOddPrefixLengths(line))` and emits
  solver-verified opening blunders stratified `(line.id × player × sign-case)`, cap 2/bucket,
  best-effort. Even-length prefix ⇒ player 1 (namedOpening/win-cases); odd ⇒ player 2 (defense /
  `lose_to_faster_lose`). RNG is a **seed-local `mulberry32`** in `openingSampling.mjs` (`--seed`,
  default 1337) — it must NOT touch `gameSampling`'s RNG ([[project_gamesampling_rng_determinism_trap]]).

Three PROVISIONAL predicates: `reason_opening_named_line`, `reason_opening_defense` (D32),
`reason_opening_centrality`.

**Still-true gotcha:** opening predicates stay `PROVISIONAL`, not REQUIRED, EVEN THOUGH coverage
Phase-1 now sources them deterministically — because in ordinary stochastic self-play (Phase 2 / any
caller without Phase 1) a move landing exactly on a KB prefix is rare, and a REQUIRED-but-unreachable
predicate burns the full solver budget ([[project_coverage_sampler_rarefill_trap]]). A pre-existing
orphaned REQUIRED predicate `opp_neutralization` is a separate rare-fill culprit in coverage harvests
(unrelated to openings, still OPEN). Opening reason engine = `computeOpeningContext.mjs`; see
[[feedback_reason_case_requires_eval_and_grader]], [[project_opening_defender_reason_gap]], and
reason-DECISIONS **D31**/**D32**.
