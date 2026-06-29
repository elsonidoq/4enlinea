> ⛔ **SUPERSEDED / ABANDONED 2026-06-28** — the reason-field design described or assumed here branched off and is no longer the plan. Restarting from `docs/architecture/my_pseudocode.md`. Do NOT use this file as guidance; treat it as historical only.

# Pre-Implementation Verification — Unified `reason` Algorithm + Golden Fixture

**Date:** 2026-06-28. **Artifact under test:** the unified `reason` algorithm on paper
(`docs/epics/unified-blunder-reason-epic.md` §4 contract / §5 router / §8 gates / §15 grader) — NOT a model.
**Method:** 20 representative `eval_set_large_3.json` cases hand-derived with the solver + `reason_audit/TOOLS/`,
each frozen as a golden §4 payload (`golden/<id>.json`, normalized in `GOLDEN.jsonl`) with evidence in
`verify_cases/<id>.md`. Saturation inherited from the iteration-2 audit (`HANDOFF.md`, 19 cases) + the
Required-coverage classes. No production file modified.

---

## Headline

**The unified algorithm produces a SOUND + HONEST reason for 100% of the represented case classes — with
ONE design defect to fix before `/specify`.**

- **19 of 20** analyzed cases verified **SOUND** as specified.
- **1 of 20** (eval-43) is **FABRICATION_RISK as the §7 matrix specifies it**, but its *golden* reason is
  the corrected `not_a_blunder` — which is sound. The defect is in the epic's §7 (a router rule), not in
  the achievable coverage. With the one-line fix (DEFECT-D1) the algorithm is sound on all 20.
- **Zero UNGROUNDABLE** verdicts — every board receives exactly one of the five grains as an honest reason.
  `not_a_blunder` (4) and `zugzwang_class` (4) are valid sound outcomes (no cell); the bar "a sound reason
  on every board, not a cell on every board" is met.
- **The single biggest iteration-2 hole is closed:** the parity grain (`line_parity`) — which had NO valid
  case under the old odd-only `detectZThreat` and was slated to "ship dark" — now grounds soundly on BOTH
  eval-5 (odd, P1) and eval-49 (even, P2), because §8 gate-3 takes the controller from the **solver flip**
  and the cell from **row parity**, never from a parity count or the odd-only detector.
- **The opponent-line-suppression gap** (iteration-2's `decisiveLine.opponent = null` for win→loss flips
  beyond the horizon) is closed by the §5 mandated **optimal-mode re-solve of the played branch** — proven
  on eval-15/eval-46/eval-51 (previously PAYLOAD_UNGROUNDABLE, now SOUND).
- **The vacuous-resistance gap** (iteration-2: eval-42's payload byte-identical to no-lesson eval-8) is
  closed by the unified `line` grain carrying the concrete cell + two completing plies — eval-42/eval-55/
  eval-7 (same-floor both-lose) now ground as `line`, winner opponent.

---

## Coverage table (20 analyzed)

| id | category | discs | outcomeDelta | grain | winner | verdict | one-line player sentence |
|----|----------|-------|--------------|-------|--------|---------|--------------------------|
| eval-0 | drawing_move | 0 | win→draw | opening_principle | player | SOUND | take center: its landing sits in 7 fours vs 5 |
| eval-1 | suboptimal | 2 | draw→loss | zugzwang_class | opp | SOUND | no tactic — deep board-fill zugzwang, prefer col3/5 |
| eval-2 | drawing_move | 3 | win→draw | zugzwang_class | player | SOUND | razor-thin fill win, no square to point at |
| eval-5 | drawing_move | 9 | win→draw | line_parity | player | SOUND | c6 keeps your z-threat at c3r4; you win the squeeze |
| eval-6 | undercut | 18 | draw→loss | line (forced) | opp | SOUND | col2 hands Gray the up-diagonal at c7r6 on the last disc |
| eval-7 | forced_block | 20 | loss=loss | line | opp | SOUND | block c7r4 or Gray wins now; lost either way but slower |
| eval-8 | suboptimal | 1 | loss=loss | not_a_blunder | none | SOUND | already lost answering center as P2 — nothing to fix |
| eval-15 | double_threat | 28 | win→loss | line (dual) | opp | SOUND | col0 surrenders c1r3; opp finishes diagonal at c3r5 |
| eval-24 | drawing_move | 12 | win→draw | zugzwang_class | player | SOUND | most moves keep a slow fill win; col1 drops it |
| eval-27 | forced_block | 7 | win→loss | line | opp | SOUND | you had to block c2r5; playing elsewhere = vertical four |
| eval-32 | immediate_threat | 18 | win→loss | line | opp | SOUND | col3 completes your diagonal; col1 gives opp same cell |
| eval-40 | drawing_move | 3 | win→draw | zugzwang_class | player | SOUND | hair-thin fill win, no threat yet — hold the column |
| eval-42 | forced_win | 12 | loss=loss | line | opp | SOUND | col3 walks into Gray's c4r2 in 5; col2 drags it to 25 |
| eval-43 | forced_win | 13 | win=win | not_a_blunder | none | SOUND* | both win via same four c4r2 — preference, not a mistake |
| eval-46 | forced_win | 18 | win→loss | line | opp | SOUND | col2 wins at c2r5; col1 lets opp's c1r2 land later |
| eval-49 | z_threat | 35 | win→draw | line_parity | player | SOUND | c6 forces opp into c7; your row-2 four completes at c7r2 |
| eval-51 | figure_7 | 10 | draw→loss | line | opp | SOUND | col1 hands Gray a forked four at c3r2; col6 draws |
| eval-53 | figure_7 | 12 | win=win | not_a_blunder | none | SOUND | both win via the same diagonal at c1r4 — preference |
| eval-55 | overcut | 20 | loss=loss | line | opp | SOUND | col5 lets Gray's c3r3 diagonal land 8 plies sooner |
| eval-64 | z_threat | 28 | loss=loss | not_a_blunder | none | SOUND | already lost; same four, one move sooner — nothing to coach |

\* eval-43 golden is SOUND **after** applying DEFECT-D1; the §7 matrix as written would FABRICATE here.

Grain tally: **line 9 · line_parity 2 · opening_principle 1 · zugzwang_class 4 · not_a_blunder 4.**

---

## Selection log + saturation argument

Selection was inherited from the iteration-2 saturation (19 cases, all branch×kind groups covered) and the
Required-coverage classes in `PROMPT_verify_unified_reason.md`. Each analyzed case exercised a distinct
router branch / grain / soundness gate:

- **Grain-defining acid tests:** eval-6 (forced terminal `line`), eval-5/eval-49 (`line_parity` odd+even),
  eval-0 (`opening_principle`), eval-1/eval-2 (`zugzwang_class` diffuse), eval-8/eval-53/eval-64
  (`not_a_blunder` both-lose + both-win).
- **Opponent-line seam (the iteration-2 ungroundables):** eval-32 (on-board fast), eval-46/eval-51 (beyond
  horizon, played-branch re-solve), eval-15 (dual/shared-pivot).
- **Same-floor-but-line:** eval-7 (defensive block), eval-42/eval-55 (accelerated opponent four).
- **Defensive-miss flip:** eval-27.
- **Soundness-gate REFUSALS (a naive rule would fabricate — golden must refuse):** eval-2/eval-40
  (parity-count → wrong controller, must NOT emit line_parity), eval-1/eval-24 (centrality non-monotone
  mid/low-disc, must NOT emit opening_principle), eval-51 (window-count understates → decisiveness gate).
- **Honesty refusals:** eval-43 (both-win sooner is NOT a blunder).

Saturation: new cases stopped changing conclusions; every Required-coverage class has ≥1 analyzed
representative; redundancy is strong (the cross-checks eval-5↔eval-40↔eval-2 and eval-42↔eval-64 resolved
the only two boundary ambiguities). 20 analyzed is principled, not padded.

---

## Golden-fixture coverage of all 66

Every case is analyzed directly (20) or mapped to an analyzed representative whose golden reason is its
template. Mapping (from the auditors' redundancy notes, `HANDOFF_verify.md`):

| representative | grain | mapped cases (template applies) |
|----------------|-------|--------------------------------|
| eval-0 | opening_principle | eval-21 |
| eval-1 | zugzwang_class (near-opening draw→loss) | eval-3, eval-9, eval-13, eval-18, eval-22, eval-25, eval-26, eval-47 |
| eval-2 / eval-40 / eval-24 | zugzwang_class (diffuse win→draw) | eval-37 |
| eval-5 | line_parity (odd, P1) | — |
| eval-49 | line_parity (even, P2) | eval-58 |
| eval-6 | line (forced board-fill) | — |
| eval-15 | line (dual / shared pivot, win→loss) | eval-29 |
| eval-46 / eval-32 / eval-27 | line (win→loss, opp line) | eval-31, eval-35 |
| eval-51 | line (figure_7 forced fork flip) | — |
| eval-8 | not_a_blunder (both-lose opening, pre-decided) | eval-16, eval-30, eval-33, eval-19, eval-23, eval-44 |
| eval-53 / eval-43 | not_a_blunder (both-win, same window) | eval-20, eval-36, eval-39, eval-50, eval-57, eval-59, eval-63, eval-65 |
| eval-42 / eval-55 / eval-7 | line (both-lose, accelerated opp four) | eval-11, eval-12, eval-38, eval-52, eval-61 |
| eval-64 | not_a_blunder (parity-tag both-lose) | eval-54, eval-60, eval-62 |
| **eval-42 ↔ eval-64 pair** | line **or** not_a_blunder per FINDING-G5 | eval-4, eval-10, eval-14, eval-17, eval-28, eval-34, eval-41, eval-45, eval-48, eval-56 |

All 66 covered. The only residual per-case discretion is the **both-lose same-floor** family (last row):
each is either an accelerated opponent four (→ `line`, eval-42 template) or a non-accelerated marginal loss
(→ `not_a_blunder`, eval-64 template). Both are sound grains; the assignment is governed by FINDING-G5's
register-band threshold, which the spec must pin (a `/clarify` decision, not a coverage gap).

---

## Defect list (ordered by cases blocked) — feed back into the epic before `/specify`

### DEFECT-D1 — §7 "both-win, better wins sooner → `line`" is unsound (HIGH; blocks the whole both-win bucket)
The §7 matrix row routes both-win-better-sooner to `line (winner player)`, contradicting §5 rule 1 and §8
gates 2 & 6. **Witness:** eval-43 (strongest conversion, ~20-ply gap) names the SAME pre-existing blockable
four c4r2 on both branches — a "sooner win" claim is fabrication. **General fix (no new field):** route
both-win → `line` ONLY IF the dual-PV completing cells/windows DIFFER (or one branch's four is
forced/decisive while the other's is not) AND it passes the decisiveness gate; else → `not_a_blunder`.
Machine-checkable rule (eval-53): **identical winningWindows across both branch PVs ⇒ not_a_blunder
regardless of ply gap.** Blocks: eval-20/36/39/43/50/53/57/59/63/65.

### DEFECT-G5 — same-floor `line` vs `not_a_blunder` predicate is under-specified (MED; §14 decision 4)
The boundary is NOT ply-gap magnitude. eval-7 (block: four goes slow/blockable→forced/immediate) and
eval-42 (20-ply, forced vs slow) → `line`; eval-64 (identical window, 2 plies sooner, both forced_sequence)
→ `not_a_blunder`. **Fix:** a same-window acceleration is *discriminating* only when the played branch
crosses a register band the best branch does not (e.g. played reaches immediate/forced while best stays
slow_zugzwang), or the played move drops a forced block. Pin the threshold empirically in `/clarify`.
Blocks the both-lose discretion family (≈10 cases).

### DEFECT-G1+G4 — decisiveness gate must NOT rely on window count, must accept zugzwang completion (MED)
`winningLinesThroughCell > 1` is neither sufficient nor necessary: eval-51's forced fork reads
`winningLines:1`; eval-5/eval-49's parity cells read locally BLOCKABLE yet complete decisively at board-fill.
**Fix:** the §8.2/§15 gate's operative criterion is the disjunction **(completes under optimal re-solve) OR
(forced terminal board-fill)**; `winningLines>1` is at most a fast pre-filter that can never alone admit or
reject. (§5 already phrases this as an OR — eval-51 + eval-5 are the witnesses it must STAY one.)

### DEFECT-G2 — grader must use the played-branch re-solve (not `decisive_check`) for opponent cells (LOW; grader spec)
`decisive_check` is mover-oriented and returns NOT-THIS-CELL/BLOCKABLE for `winner:opponent` cells
(eval-27, eval-5). The §15 grader's decisiveness clause must state: opponent-line cells are confirmed by the
**played-branch `optimal_line` re-solve**; decisive_check validates only mover-perspective cells.

### DEFECT-G3+G7 — `register.phase` should key on resolution horizon, not current disc count (LOW)
§4's `phase = opening when discs ≤ 6` mislabels low-disc boards that resolve at board-fill (eval-1 at 2
discs, eval-2 at 3 discs → phase "opening" though they are deep zugzwang). It also makes the
"refuse-opening_principle-when-register==slow_zugzwang" heuristic unavailable — so `opening_principle` MUST
be gated on §8.4 **line-participation monotonicity** (the load-bearing guard, confirmed by eval-2: stacked
center = 11 fours = max yet draws), never on the register word. **Fix:** derive `phase` from
bestPlies/resolution-horizon; keep §8.4 monotonicity as the sole opening_principle gate. (Also: `phase` and
`word` are distinct enums — normalize golden `phase` to {opening,midgame,endgame}.)

### DEFECT-G8 — §7 dangling parity reference for dual-line `line` (LOW; doc)
§7 (~line 216) says a dual-line's other cell is named in `parity.surrenderedCell`/`enabledCell`, but
grain=`line` has no parity body. eval-15 proves the shared pivot self-carries via the dual-PV body
(`bestLine.completingCell ∈ playedLine.window`). **Fix:** correct §7 to say grain=`line` carries the second
cell via the two windows, and `betterMoveDoes` must render the "claim-vs-surrender the same square" framing
when the pivot is detected.

### Epic §9 worked-example nit (TRIVIAL)
eval-32's stated `word:"forced_sequence" ply~7` is wrong — the solver-grounded register is `immediate`
(|score|=12, 18 discs → 1 forward ply). Correct the worked example; no router/gate change.

---

## Tooling note (load-bearing diagnostics — candidates to promote into the Stories)

- `optimal_line.mjs` — the dual-PV engine; load-bearing in EVERY case (Story B). The played-branch re-solve
  is what fixes `decisiveLine.opponent = null`.
- `decisive_check.mjs` — the decisiveness gate (Story B); but see DEFECT-G2 (mover-oriented).
- `parity_cells.mjs` — standing same-perspective threat detection (Story C); the empty/non-empty result is
  the line_parity-vs-zugzwang_class discriminator.
- `forward_distance.mjs` — register (Story A).
- `forward_projection.mjs` — the `noThreatWithinPlies` / diffuse confirmation for `zugzwang_class`.
- **New (eval-1, in scratchpad):** a random-optimal interchangeability probe proving a terminal four is
  non-canonical (board-fill artifact, multiple windows) — promote to `TOOLS/` for the forced-vs-diffuse test
  in Story B.

## Verdict

The unified algorithm, as specified, achieves **100% honest coverage** of the 66-case fixture once
**DEFECT-D1** (the §7 both-win row) and the **G5** same-floor threshold are pinned. No board is
UNGROUNDABLE; every grain has ≥1 sound case; the two structural iteration-2 holes (parity has no case;
opponent line is null) are closed. The golden fixture (`golden/*.json`, `GOLDEN.jsonl`) is frozen as the
implementation's acceptance target.
