> ⛔ **SUPERSEDED / ABANDONED 2026-06-28** — the reason-field design described or assumed here branched off and is no longer the plan. Restarting from `docs/architecture/my_pseudocode.md`. Do NOT use this file as guidance; treat it as historical only.

# VERIFY pass — golden-fixture handoff log

Pre-implementation verification of the *unified* `reason` algorithm (`docs/epics/unified-blunder-reason-epic.md`).
Each auditor freezes one case's golden §4 payload in `golden/<id>.json` + evidence in `verify_cases/<id>.md`.

Selection: driven by the iteration-2 saturation (`HANDOFF.md`, 19 cases) + the Required-coverage classes in
`PROMPT_verify_unified_reason.md`. Representative set ≈20; remainder mapped by redundancy.

## Running verdicts (lead: verdict — grain)

- **eval-6** — SOUND — `line` (forced terminal board-fill). playedLine c7r6 window c4r3·c5r4·c6r5·c7r6 ply42 forced:yes; bestLine absent; register slow_zugzwang/23. Acid test `winningWindows.length===1 && completingPly===42` ⇒ forced, not diffuse. Re-solve mandatory (frozen vector mislabels cell minor_threat). Redundant: other board-fill slow_zugzwang.
- **eval-0** — SOUND — `opening_principle`. bestCellFours 7 (c4r1) > playedCellFours 5 (c5r1); line-participation rank-monotone with solver `[-2,-1,0,1,0,-1,-2]`; phase=opening overrides distance bucket. Redundant: eval-21.
- **eval-5** — SOUND — `line_parity`, winner player. bestLine c3r4 window c6r1·c5r2·c4r3·c3r4 ply40 forced:yes; controller=player FROM SOLVER FLIP (parity-count ambiguous: both candidate threats even-row); ownerParity even (row4); mechanism z_threat; surrenderedCell c3r4. Router enters by STRUCTURE not tag. NOTE: decisive_check reads BLOCKABLE yet cell is decisive via board-fill zugzwang at ply40 → see FINDING-G1.

- **eval-32** — SOUND — `line`, winner opponent. Both branches resolve at the same contested gravity-top cell c3r3 (played: opponent window c5r1·c4r2·c3r3·c2r4 ply20 forced; best: player diagonal c1r1·c2r2·c3r3·c4r4 ply19 forced). register immediate (both fwd=1). Confirms opponent line surfaces directly for FAST on-board wins → bounds the opponent-suppression gap to slow/deep cases. Redundant: eval-31. (Epic §9 minor: eval-32 word should be "immediate" not "forced_sequence ply~7".)
- **eval-46** — SOUND — `line`, winner opponent. playedLine c1r2 window c1r2·c2r2·c3r2·c4r2 ply34 forced:yes (BEYOND horizon, recovered ONLY by played-branch optimal re-solve); bestLine c2r5 ply37 forced:no (forgone player win, blockable double-threat but nameable as score>0). parity_cells: no ownership flip → line not line_parity. Resolves iteration-2 UNGROUNDABLE. Redundant: eval-31,35.
- **eval-43** — **FABRICATION_RISK** → golden grain forced to `not_a_blunder` (predicted `line` OVER-CLAIMS). Both-win; identical standing blockable four c4r2 wins on BOTH branches; only timing differs (best 4 plies vs played 24). §5 rule 1 + §8 gates 2&6 fire ⇒ not_a_blunder, winner none. See DEFECT-D1.

- **eval-8** — SOUND — `not_a_blunder`, winner none. Same-floor both-lose, center-opening pre-decided; two distinct ~40-ply board-fill terminals (c5r5 vs c6r3), 2-ply gap is artifact. decisive_check "DECISIVE" on both is tautological → must NOT promote to line. Redundant: eval-16,30,33 (identical pre-move "3"); spot eval-19,23,44.
- **eval-1** — SOUND — `zugzwang_class`, winner opponent. `44` draw→loss; non-canonical board-fill (random-optimal probe: win completes through 2 distinct top-row windows 36×/13×); no standing major threat any ply; opening_principle refused (col5 less central yet draws). noThreatWithinPlies 20. Redundant: eval-3,9,13,18,22,25,26,47. Tool: scratchpad/interchange.mjs (interchangeability probe — promote to TOOLS/).
- **eval-32** — SOUND — `line` opponent (see above).
- **eval-46** — SOUND — `line` opponent (see above).
- **eval-27** — SOUND — `line`, winner opponent. Flip win→loss; pre-existing Green vertical threat c2r5 (window c2r2·c2r3·c2r4·c2r5) ply9 forced; bestLine c6r6 ply42 forced:no; register played immediate/2, best slow/34. Cell from OPP-perspective parity_cells (mover-perspective []=FR-033). Redundant: eval-14,31.
- **eval-7** — SOUND — `line`, winner opponent (same-floor-but-line). Both lose; played drops forced block → Gray vertical c7r4 ply22 forced; best c7r6 ply42; acceleration 22 vs 42. Proves grain-2 fires on same-floor when a discriminating accelerated four exists. Redundant: eval-11,12,38,55,61.

- **eval-51** — SOUND — `line`, winner opponent. draw→loss; playedLine c3r2 window c2r1·c3r2·c4r3·c5r4 ply18 forced:yes (a forked prong, reads winningLines:1 but DECISIVE under optimal defense); bestLine absent (best draws); register forced_sequence/7. Played-branch optimal re-solve load-bearing (production opponent:null). Redundant: FLIP-to-loss figure_7 single-window forced forks.

- **eval-53** — SOUND — `not_a_blunder`, winner none. Both-win; both PVs win through the IDENTICAL window (c4r1·c3r2·c2r3·c1r4, same cell c1r4), only ply differs (7 vs 9). Machine rule: identical winningWindows across both branch PVs ⇒ not_a_blunder regardless of gap. Redundant: eval-63,20,36,39,59,65.

- **eval-64** — SOUND — `not_a_blunder`, winner none. Same-floor both-lose, z_threat TAG but no flip; both PVs lose through the IDENTICAL Gray window (c2r2/c3r2 bottom-row) only ~2 plies apart; tagged geometry pre-exists in both branches (parity_cells identical). Parity TAG does NOT force line_parity. Redundant: eval-54,60,62.

- **eval-49** — SOUND — `line_parity`, winner player. win→draw P2 EVEN-distance; bestLine c7r2 window c4r2·c5r2·c6r2·c7r2 ply38 forced:yes (winningWindows=2); controller=player FROM SOLVER FLIP (odd-only detector is BLIND on the winning board, fires INVERTED on the draw board; col7 even-empty count would also mislead); ownerParity even (row2); surrenderedCell c7r2, enabledCell c6r6; register immediate/2 (35-disc endgame). **Validates the parity grain has a sound P2 case** — the iteration-2 "parity_control ships dark" is RESOLVED by §8 gate-3 (solver-flip controller). Redundant: eval-58.

  > **POSITIVE HEADLINE:** `line_parity` now grounds on BOTH eval-5 (odd, P1) and eval-49 (even, P2). The
  > unified algorithm fixes the single biggest iteration-2 hole (parity had no valid case) by taking the
  > controller from the solver flip and the cell from row parity, never from the odd-only detector/empties.

- **eval-24** — SOUND — `zugzwang_class`, winner player. win→draw, 12 discs; line refused (all completions BLOCKABLE, 5/7 cols win = diffuse non-canonical board-fill); line_parity refused (parity_cells []); opening_principle refused (best is EDGE col0, centrality non-monotone, not near-empty); noThreatWithinPlies 27. **Confirms eval-2 redundancy.** Best=edge is the clean witness that the router does NOT lean on centrality.

- **eval-2** — SOUND — `zugzwang_class`, winner player. `444` win→draw, 3 discs; eval-6 acid-test TWIN on the BLOCKABLE side (c1r6 board-fill BLOCKABLE → refuse line); opening_principle refused by GATE-4 MONOTONICITY (stacked center col4 = 11 fours = MAX yet only draws). noThreatWithinPlies 20. Closes the cross-check: zugzwang_class, NOT line_parity. Redundant: eval-37,40,24.
- **eval-15** — SOUND — `line`, winner opponent (dual-line). playedLine c3r5 window c1r3·c2r4·c3r5·c4r6 ply32 forced:yes; bestLine c1r3 window c1r3·c2r3·c3r3·c4r3 ply39 forced:no. SHARED PIVOT c1r3 self-carries: bestLine.completingCell ∈ playedLine.window AND bestCell lands on playedLine.completingCell. **iteration-2 MISSING_FIELD RESOLVED** by the dual-PV body — no new field needed. See FINDING-G8 (dangling §7 doc ref).
- **eval-42** — SOUND — `line`, winner opponent. Both-lose; SAME opponent four c4r2 accelerated 20 plies (best ply38 vs played ply18). **CELL CORRECTION:** predicted c2r5 was the iteration-2 mistake-mode PHANTOM; optimal-mode re-solve → opponent's standing four c4r2. Validates §5 "use optimal mode, never mistake-mode." Carries the cell + two completingPlies the old vacuous {loserSide,speed,punishable} discarded. Redundant: eval-11,12,14,38,52,61.
- **eval-55** — SOUND — `line`, winner opponent. Both-lose; same opponent diagonal c3r3 accelerated 8 plies (best34/played26). Confirms eval-42 template (overcut variant).

> **NOTE — eval-42/eval-64 boundary (refines FINDING-G5):** eval-42 & eval-55 (→line) and eval-64 (→not_a_blunder)
> ALL share the same opponent window across both branches, completing sooner on played. The discriminator
> the auditors used is the MAGNITUDE/STATUS of acceleration: eval-42 = 20 plies (5 vs 25 register: forced
> vs slow), eval-55 = 8 plies, eval-64 = 2 plies (both forced_sequence, marginal). So §14-decision-4 needs
> a concrete threshold: a same-window acceleration is discriminating (→line) only when it crosses a register
> band (e.g. played reaches immediate/forced while best stays slow_zugzwang), else not_a_blunder. eval-7's
> "played fails a forced block" (immediate vs slow) is the cleanest discriminating case.

## Emerging findings (for REPORT_verify.md defect list)

- **FINDING-G7 (opening_principle must be gated on MONOTONICITY, not register — confirms §8.4):** eval-2
  (3 discs) phase=opening makes word="opening", so the iteration-2 "refuse when register==slow_zugzwang"
  heuristic is unavailable. The load-bearing guard is §8 gate-4 line-participation monotonicity, which
  fires because the stacked center inverts geometry (played col4 = 11 fours = max yet draws). Confirms the
  epic's §8.4 design is correct AND necessary; the register can never substitute for it. Corollary: key
  `phase` on bestPlies/resolution-horizon, not current disc count (so deep-zugzwang-from-few-discs like
  eval-2/eval-1 isn't mislabeled phase=opening). Ties to FINDING-G3.
- **FINDING-G8 (§7 dangling parity reference for dual-line `line` — doc fix):** §7 line ~216 says the
  dual-line's other cell is named in `parity.surrenderedCell`/`enabledCell`, but grain=`line` has NO parity
  body. eval-15 proves the shared pivot self-carries via the dual-PV `line` body (bestLine.completingCell ∈
  playedLine.window). General fix: correct §7 to say grain=`line` carries the second cell via the two
  windows, and `betterMoveDoes` MUST render the "claim-vs-surrender the same square" framing when
  bestLine.completingCell ∈ playedLine.window (or bestCell-landing == playedLine.completingCell).

- **FINDING-G6 (golden-file metadata schema drift — fixture hygiene):** golden JSONs vary the id/board
  wrapper (`board_state`/`move_played` snake_case vs eval-24's `boardState`/`movePlayed` camelCase; some
  embed an `_evidence` block). The §4 `reason` payload itself is consistent, but `GOLDEN.jsonl` assembly
  must normalize the wrapper keys. Not an epic defect — a fixture-assembly task.

- **FINDING-G5 (same-floor `line` vs `not_a_blunder` predicate needs sharpening — §14-open):** the boundary
  is NOT ply-gap magnitude. eval-7 (block: opponent four goes slow/blockable→forced/immediate, the better
  move actively blocks) and eval-42 (distinct accelerated four) → `line`; eval-64 (IDENTICAL window, same
  owner, 2 plies sooner) → `not_a_blunder`. Proposed general predicate: a same-floor opponent four is
  *discriminating* (→ line) only when the played move changes its STATUS (blockable→forced, or
  not-yet-on-played-PV→on-played-PV), not when it is the same window merely completing marginally sooner.
  Same window in both PVs ⇒ not_a_blunder (mirrors eval-53's both-win rule). Resolve in §14 decision 4.

- **FINDING-G4 (decisiveness gate: window-count is NOT sufficient — confirms/extends G1):** eval-51's decisive
  cell reads `winningLinesThroughCell:1` yet is a forced fork. The gate's operative criterion must be the
  disjunction **(completes under optimal re-solve) OR (forced terminal board-fill)**; `winningLines>1` may
  only be a fast pre-filter, never alone admit OR reject. §5 already phrases it as an OR; eval-51 + eval-5
  (G1) are the witnesses it must STAY an OR and accept board-fill/zugzwang completion even when the cell is
  locally blockable.

- **FINDING-G2 (decisive_check is MOVER-oriented — grader/tooling note):** for `winner:opponent` cells
  (defensive miss / accelerated opp line), `decisive_check <ms> <cell>` can return NOT-THIS-CELL/BLOCKABLE
  because it evaluates the cell from the mover's perspective. The decisiveness WITNESS for an opponent four
  is the **played-branch `optimal_line`** reaching that cell, not decisive_check. The §15 grader's
  decisiveness clause must say: opponent-line cells are confirmed by the played-branch optimal re-solve;
  decisive_check is only valid for mover-perspective cells. (Surfaced eval-5, eval-27.)
- **FINDING-G3 (register phase vs word enum confusion — golden normalization):** §4 defines `phase ∈
  {opening, midgame, endgame}` and `word ∈ {immediate, forced_sequence, slow_zugzwang, opening}` as
  SEPARATE fields. Auditors frequently wrote `phase:"slow_zugzwang"`/`"immediate"` (a word value). Golden
  files must be normalized so phase carries the enum and word the bucket. Also eval-1 shows phase derived
  from CURRENT discs (≤6→opening) disagrees with a 2-disc board resolving at ply42 → general fix: derive
  `phase` from the resolution horizon, not current disc count (non-blocking; zugzwang_class still honest).

- **DEFECT-D1 (the §7 both-win row is unsound — HIGH, collapses the conversion bucket):** §7 matrix row
  "both win, better wins sooner → `line` (winner player)" contradicts §5 rule 1 and §8 gates 2 & 6. eval-43
  (the STRONGEST conversion case, ~20-ply gap) names the SAME pre-existing blockable four c4r2 on both
  branches — naming a "sooner win" is fabrication (calls a non-mistake a blunder). **General fix (no new
  field):** route both-win → `line` ONLY IF the dual-PV completingCells DIFFER (or one branch's four is
  forced/decisive while the other's is not) AND it passes decisive_check; else → `not_a_blunder`. Uses
  dual-PV cell equality + existing decisive_check. Collapses eval-20/36/39/50/53/57/59/63/65 to
  not_a_blunder unless a discriminating-four exception exists.

- **FINDING-G1 (decisiveness gate):** for parity/board-fill zugzwang lines (eval-5), `decisive_check` returns
  BLOCKABLE in isolation, yet the cell is genuinely decisive via the ply-40 zugzwang squeeze. The §8.2 /
  §15 decisiveness gate must accept "forced terminal board-fill / completes under optimal defense at the
  fill" as decisive even when the cell is locally blockable. Otherwise sound line_parity/line cases get
  rejected. (General rule, not a per-case patch.)
- **CROSS-CHECK (eval-5 vs eval-40/eval-2 — line_parity vs zugzwang_class):** RESOLVED for eval-40 — it is
  `zugzwang_class`, NOT line_parity (parity_cells empty on every branch → no standing threat to flip; a
  claimeven count would name the WRONG controller, which gate 3 forbids). The discriminator is now
  empirically grounded (= §14 decision 4): **line_parity requires an actual STANDING same-perspective
  threat present on the best branch (parity_cells non-empty & ownership flips); empty parity cells ⇒
  zugzwang_class.** eval-5 has the standing threat (line_parity); eval-40 does not (zugzwang_class).
  eval-2 pending — expect zugzwang_class (3 discs, board-fill diffuse) by the same test.
- **eval-40** — SOUND — `zugzwang_class`, winner player. `241` win→draw P2 winner; line refused (board-fill
  BLOCKABLE c7r6, single window but unstable); line_parity refused (parity_cells [] + a claimeven count
  would mislabel controller — the REFUSAL stress passes); opening_principle refused (anti-monotone: best
  cell 6 fours < played cell 8); noThreatWithinPlies 26. Redundant: eval-37.
