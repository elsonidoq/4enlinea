---
name: project_reason_opening_traps
description: "Opening reason engine (D31–D34) — all three features SHIPPED; the live traps are: opening predicates stay PROVISIONAL (a REQUIRED-but-unreachable one burns the full solver budget), centrality is deliberately NOT suppressed for a losing mover, and editing causalLinks link text breaks 4 verbatim-asserting tests"
metadata:
  node_type: memory
  type: project
---

Merged from `project_select_boards_skips_openings` + `project_opening_defender_reason_gap` + `project_coach_voice_opening_defeatist_gap`. All three underlying gaps are **RESOLVED/SHIPPED** (branch `opening-theory`, 2026-07-05/06). Authoritative record: reason-DECISIONS **D31/D32/D33/D34**, `blunder-reason-evidence.md` §12 "Opening defense". Engine = `computeOpeningContext.mjs`. What follows is only what stays non-obvious.

## Trap 0 — the opening/mid-game/closing threshold

`REASON_CONFIG.openingMaxDiscs: 15` (`reasonEngine.mjs`) is the threshold that makes `computeReason`
classify `board_state: 'opening'` (`discs < openingMaxDiscs`; the next threshold, `midgameMaxDiscs`,
splits mid-game from closing).

## Trap 1 — opening coverage predicates stay PROVISIONAL, never REQUIRED

`select_boards.mjs` now samples openings in two places: the `fixture` strategy via an **additive opening harvest band** (discs ~1–14, its own `counts.opening.*` bucket; the untouched mid-game band still governed by `CFG.discMin: 12`), and the `coverage` strategy via a **deterministic Phase-1 opening step** that runs FIRST, inside the same `try/finally` as the stochastic Phase-2 `harvestBlunders` loop. Derivation lives in `reasonEvalPredicates.mjs` (unit-testable).

The three opening predicates — `reason_opening_named_line`, `reason_opening_defense` (D32), `reason_opening_centrality` — **must stay `PROVISIONAL`**, even though Phase-1 now sources them deterministically. Reason: in ordinary stochastic self-play (Phase 2, or any caller without Phase 1) a move landing exactly on a KB prefix is rare, and a REQUIRED-but-unreachable predicate makes `satisfied()` never flip and burns the full solver budget (see [[project_coverage_sampler_rarefill_trap]]). A pre-existing orphaned REQUIRED predicate `opp_neutralization` is a separate rare-fill culprit in coverage harvests — unrelated to openings, **still OPEN**.

Phase-1 RNG is a **seed-local `mulberry32`** in `openingSampling.mjs` (`--seed`, default 1337) — it must NOT touch `gameSampling`'s RNG ([[project_gamesampling_rng_determinism_trap]]). It walks `shuffle(evenAndOddPrefixLengths(line))` per KB line (`loadOpeningLines()`), emitting solver-verified opening blunders stratified `(line.id × player × sign-case)`, cap 2/bucket, best-effort. Even-length prefix ⇒ player 1 (namedOpening/win-cases); odd ⇒ player 2 (defense / `lose_to_faster_lose`).

## Trap 2 — centrality is NOT suppressed for a losing mover (owner correction — do NOT "fix" it back)

`openingContext` has three mutually-exclusive modes, precedence **namedOpening → defense → centrality**. `defense` (D32) fires on a second-player opening blunder on a known first-player-win line: on-book real match + `player === 2` + `case === lose_to_faster_lose`, with `bestDefenseCol = bestCol` (solver least-bad hold — NO `bookNextCol`-equality).

The original spec's "companion fix" — *suppress `centrality` when the mover is losing* — was **deliberately dropped**. Central play genuinely helps a losing second player (more potential fours; even rows 2 & 4 favour P2, KB `allen-parity.md`). The real gap was the missing *goal*, not the framing. So:
- `centrality` gained `resistAndWait: player===2 && bestScore<0` and **still fires for a losing mover**.
- `defense` carries a resist-and-wait canon frame plus a **conditional** centrality/even-row clause gated on `centralityGrounded` (= `detectCenterDominance(...) != null`: strictly more central AND ≤6 plies). It is **false** on the equidistant `3333344`/col2 (best col4 vs played col2, both dist 1 → no "more central" claim, I2-honest) and **true** on `333`/col4. Even-row parity is GENERAL canon only, never a per-board cell claim (upholds D24-F3).

Verify with `TOOLS/compute_feature_vector.mjs <ms> <playedCol>` (see [[reference_inline_node_scripts]]).

## Trap 3 — editing `causalLinks.mjs` link/template text is a lockstep change

Link text is a single source of truth asserted **verbatim by 4 test files**: `causalLinks.test.mjs`, `causalLinksComposers.test.mjs`, `reasonRealizedDenied.test.mjs`, `reasonRenderFixes.test.mjs`. The last asserts against the **assembled prompt string** and splits it on the literal section header (`# Internal evidence fields`, renamed from `# Vector facts` in D34) — so renaming a header in `renderReasonModel.mjs`'s `assembleGroundedPrompt` silently breaks a test that greps the old header. `grep` the exact wording across `server/tests/` before changing any template, then run `npm run test:fast`. A corpus guard (scan every rendered frame for defeatist wording / raw tactic slug) is cheap and catches what the unit tests miss.

Context: D34 rewrote L3/L7 to drop defeatist bookends ("You were already losing… Neither move wins") in favour of a practical-resistance frame, keyed on the mover being lost (`case=lose_to_faster_lose`, a SUPERSET of player-2-opening, so it also covers lost player-1 mid-games). Same pass added a `TAG_PHRASE`/`plainTag` C4-vocabulary layer (no raw tactic slug in player text) and the `mechanism`-is-the-only-player-facing-field register contract.

**Stale grader note (still not fixed):** the `grade-fv-sufficiency` skill still says *"A5b render_bug is the expected bucket for this vector today."* After D34 the render is clean, so residual defeatism would correctly bucket `prompt_confusion`, not `render_bug`. Fix next time the grader is touched (`docs/architecture/feature-vector-sufficiency-experiment.md` §7b wants grader + engine in sync).

Related: [[project_reason_render_layer]], [[feedback_pedagogy_preferences]].
