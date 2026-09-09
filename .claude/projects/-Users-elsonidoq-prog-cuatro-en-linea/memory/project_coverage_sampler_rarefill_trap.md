---
name: coverage-sampler-rare-fill-satisfied-unbounded-loop-trap
description: "select_boards --strategy coverage appears \"stuck\" for tens of minutes — a near-unreachable REQUIRED predicate makes satisfied() never flip, and the rare-fill reran a full second MAX_GAMES sweep"
metadata: 
  node_type: memory
  type: project
  originSessionId: 4621a462-669f-4601-9459-1ef3ed718c2a
---

`connect-four/server/scripts/select_boards.mjs --strategy coverage` harvests boards until
`satisfied()` (every REQUIRED predicate ≥ target). Two coupled traps make it look **hung** for tens of
minutes when it is actually just doing an intractable amount of solver work (root-caused 2026-07-03,
`.superpowers/sdd/debug-stuck-jobs.md`):

1. **`satisfied()` never flips if ANY REQUIRED predicate is near-unreachable.** `opp_neutralization` (and
   other genuinely rare engine predicates) occur only ~2× in a large corpus; at `--target 2` in 1000
   games they are not reached, so `satisfied()` stays false and **both** the main harvest loop AND the
   rare-fill post-pass burn their **entire** `--max-games` budget. Runtime ≈ `--max-games` regardless of
   how fast the useful coverage fills (all render-required predicates were done by ~300 games).
2. **The rare-fill probes `computeReason` on EVERY suboptimal column, and (pre-fix) reran a full second
   `MAX_GAMES` sweep.** That is ~games × ~15 solver calls — tens of minutes chasing a predicate it will
   never find. The progress log looked **frozen** because the rare-fill updates different counters than
   the printed `fulfilled X/Y` line (c4solver at ~96% CPU = actively burning work, NOT blocked).

**How to prevent / what's already fixed:**
- The rare-fill is now BOUNDED (Task 5b, commit `02debdb`): `RARE_FILL_GAMES = min(MAX_GAMES, 200)` +
  a no-progress early-exit (bail after `RARE_FILL_NOPROGRESS_GAMES = 40` games that add no new board).
  **Any future "harvest until satisfied" loop must carry the same two bounds.**
- For a fast regeneration, run with a **modest `--max-games`** (e.g. 300–500) and accept that a few
  near-unreachable engine predicates (`opp_neutralization`, `rd_figure_7_missed_own`, the `*`-marked
  PROVISIONAL ones) show as never-seen — that is an honest, documented gap, NOT a failure. The RENDER
  coverage (`RENDER_REQUIRED`) fills well before then.
- A near-unreachable predicate that should not block termination belongs in the PROVISIONAL set (D20/D22
  calibration philosophy), so `satisfied()` stays a real completeness claim over *reachable* predicates.
- **OPEN (2026-07-03): three predicates are never reached — one may be DEAD, not rare.** `opp_neutralization`
  (REQUIRED), `parity_unnameable`, `opp_parity_unnameable` (PROVISIONAL) never appear in coverage runs.
  Strong lead: `neutralization` survives in `reasonEngine.mjs` only in a COMMENT (line ~956, "D26 supersedes
  D18's neutralization") — `opponentPunishment.kind === 'neutralization'` may no longer be emitted at all, i.e.
  `opp_neutralization` is a **stale REQUIRED predicate** D26 orphaned in `REASON_UNIVERSE` (would explain why
  `satisfied()` can never flip). Precedent: D23 showed "rare" can be a router-locus BUG, not rarity. Full
  investigation prompt: `TODO/select_boards_rare_fill_investigation.md`; verdict doc (when done):
  `docs/architecture/reason-rare-predicates-investigation.md`. Do not assume rarity before ruling out dead-code/bug.
- **Never run this harvest at the same time as `test:fast`** — see [[Integration test slowness / apparent hang]]
  (the same 2026-07-03 incident: concurrent solver processes deadlock test:fast).
- The committed P4 coverage set (32 boards) already covers every `RENDER_REQUIRED` predicate incl. the
  rare `flip_case_l3` + `link_L9`; the render coverage test reads pre-computed evidence, solver-free.
- **Regenerate the boards file AND its evidence file together.** `renderCoverageUniverse.test.mjs` reads
  `reason_evidence_boards_coverage_p4_*.jsonl` (materialized once via `compute.mjs` from the `boards_coverage_p4_*.jsonl`
  board set). The two are a matched pair — if you re-run `select_boards` to make a new board set, also
  re-run `compute.mjs --input <new boards>` to regenerate the evidence and point the test at the new file,
  or the coverage claim goes stale. Both are `git add -f` (the `*jsonl` global ignore).
- **`phase_opening` is REQUIRED; the opening *theory* predicates are PROVISIONAL.** Easy to conflate,
  and `--help` reads like a guarantee for both. `phase_opening` sits in `REASON_UNIVERSE` and NOT in
  `PROVISIONAL`, so `satisfied()` cannot terminate without opening boards — those are guaranteed. But
  `reason_opening_named_line` / `reason_opening_defense` / `reason_opening_centrality` are PROVISIONAL
  (a self-play move landing exactly on a KB book prefix is rare; a deterministic Phase 1 step, seeded
  by `--seed`, sources them best-effort). **They can come back empty and the harvest still reports
  success** — check the coverage summary, do not assume. (2026-08-06 harvest got all three: 12/8/8.)
- **One coverage run spans BOTH universes.** `select_boards.mjs` builds
  `ALL_REQUIRED = REQUIRED(reason) + RENDER_REQUIRED`, so a single harvest satisfies the reason axes
  *and* the render axes. Two separate corpora were only ever needed because the older set predated
  that union.
- **SUPERSEDED 2026-08-06 — the `boards_coverage_p4_*` / `fv_suff/` file soup is gone.** Every board
  and evidence artifact now lives at the stable path `connect-four/server/scripts/reason_corpus/`
  (`boards.jsonl` + `evidence.jsonl` + README). The "regenerate boards and evidence together" rule
  below still holds and is now written into that README. See
  [[feedback_artifacts_are_detritus_not_baselines]].

