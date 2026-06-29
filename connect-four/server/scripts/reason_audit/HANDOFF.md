> ⛔ **SUPERSEDED / ABANDONED 2026-06-28** — the reason-field design described or assumed here branched off and is no longer the plan. Restarting from `docs/architecture/my_pseudocode.md`. Do NOT use this file as guidance; treat it as historical only.

# Reason-Field Audit — Handoff Log

## Shared context (distilled epic facts — auditors get this in their prompt)

**Artifact under test:** the feature vector + glossary. The `reason` field (not built yet) must let a
privileged checker reconstruct WHY the played move is a blunder from the vector alone. "Reason omitted"
or "passes a mechanical check but doesn't explain" = FAILURE to report.

**Routing ladder (epic §5), splits on outcome FLIP first:**
- FLIP (best≠played outcome): `parity_control` (z_threat/claimeven tag + non-empty same-perspective
  kept/surrendered cells that DIFFER between best/played boards) → `concrete_line` (re-solve-confirmed
  decisive completingCell, NOT the earliest blockable threat) → `positional` (center control, sparse/
  opening) → else OMIT.
- SAME-floor (best=played outcome): `resistance` (both lose: speed slower/same + punishable =
  reachability.played.ceiling win/draw/none) / `conversion` (both win: speed faster/same + extraLines
  some/none) → else OMIT.

**register** from REPAIRED forward distance = `43 - 2*|score| - currentDiscs` (TOOLS/forward_distance.mjs):
immediate(≤2) / forced_sequence(≤10) / slow_zugzwang(near fill) / lost_or_won_opening.

**Key traps:** detectZThreat returns cells:[] when perspective≠currentPlayer; pickEarliestWay can surface
a BLOCKABLE intermediate (not decisive); mistake-mode opponent lines are phantoms (use optimal mode);
bestOutcome/postBlunderOutcome are null for losing_either_way (fall back to solver).

## Selection plan (coordinator, from CATALOG.md — chosen for new evidence per group × failure-class)

Groups: FLIP/concrete_line(8), FLIP/parity_control?(2), FLIP/positional?(17), SAME/resistance(29),
SAME/conversion(10).

Targeted failure classes to probe:
1. Deep slow_zugzwang concrete_line — **eval-6** (acid test, undercut, ply-23).
2. Blockable-intermediate decisiveness trap — **eval-51** (figure_7).
3. Dual-line (missed_own + enabled) — **eval-15** (double_threat).
4. defensive_miss flip framing — **eval-27** (forced_block flip).
5. Shallow concrete_line win→draw — **eval-5**.
6. parity_control validation (the rung the epic admits it lacks) — **eval-49, eval-58** (z_threat win→draw deep).
7. Opening positional win→draw — **eval-0** (empty board) / eval-21.
8. **SUSPECTED BIG GAP**: draw→loss flip, few discs, too deep to tree-search, no parity, center not
   decisive → likely OMIT — **eval-1, eval-9, eval-13** (suboptimal_move flips).
9. win→loss tactical flip on tiny board (too early to search) — **eval-29 / eval-35** (double_threat).
10. resistance, punishable line in reach (ceiling win/draw) — **eval-7** (defensive_miss) / eval-42.
11. resistance, deep/lost opening, no cell — **eval-8** (1 disc).
12. **resistance honesty gap**: both-lose, ceiling=loss, reason is only "loses slower" — probe one.
13. parity TAG but SAME-floor (routes to resistance not parity_control) — **eval-54 / eval-64** (z_threat both-lose).
14. conversion: does "wins sooner" explain a both-win "blunder"? severity often 0 — **eval-43 / eval-50**.

Target 22–26 analyzed cases.

## Tools available (TOOLS/)
- `build_catalog.mjs` — produced CATALOG.md (done).
- `forward_distance.mjs` — repaired forward ply distance + register word for a move. REUSE for every register check.

---

## Per-case verdicts (appended as auditors return)

### eval-6 — concrete_line @ slow_zugzwang — **SUFFICIENT (with mandatory-re-solve caveat)**
- Draw→loss flip; opponent wins at board-fill c7r6 (col6), window c4r3-c5r4-c6r5-c7r6, fwd 23 plies = slow_zugzwang. Payload grounds; passes §14.
- **KEY GAP FINDING:** the decisive diagonal is NOT in the frozen lookahead vector — categoryExamples surface only minor_threat at c7r5/c7r6, never the winning window. A builder trusting the raw vector would mislabel c7r6 or emit nothing. → The re-solve-to-terminal step MUST be mandatory for slow_zugzwang concrete_line; completingCell must NOT be sourced from frozen lookahead categories.
- Tool created: `TOOLS/optimal_line.mjs` (reusable for all board-fill/zugzwang cases). Likely makes other deep board-fill concrete_line cases (eval-51 deeper resolution, eval-46) redundant on the re-solve pattern.

### eval-43 — conversion (both-win) — **INSUFFICIENT (structural to the conversion kind)**
- Payload grounds & passes §14 (speed=faster strict, 20-ply gap; extraLines=some, 3 vs 2 windows). BUT the move is still a forced win — it does not throw the win away.
- **HEADLINE GAP:** "wins sooner → fewer chances to throw it away" rests on a player-fallibility assumption NO vector field expresses. Severity = conversion SPEED (score delta), not an error measure. A coach would overstate a non-mistake. This is the STRONGEST conversion case (max ply gap + more windows) and still fails → the flaw is structural to the kind. Missing field: a convertibility/fallibility-risk signal; reframe betterMoveDoes to "both moves win".
- Makes the whole SAME/conversion bucket redundant on the honesty axis: eval-20,36,39,50,53,57,59,63,65. Degenerate variants (speed=same / extraLines=none) are even WEAKER single-field payloads. One light probe of a degenerate (e.g. eval-36, gap 1) would confirm.

### eval-49 — routes to concrete_line (catalog guessed parity_control) — **SUFFICIENT via concrete_line; parity_control NOT validated**
- WIN→DRAW flip; single-open-column zugzwang; Gray completes at c7r2, re-solve-confirmed, register immediate. Grounds as concrete_line.
- **PIVOTAL GAP:** parity_control payload is UNGROUNDABLE here. Gray's parity weapon at c7r2 is an EVEN threat (P2's correct weapon) but `detectZThreat` is ODD-distance-only → kept set `[]` on the best board (fails §14 non-empty). The detector fires only on the PLAYED (worse) board where Gray filled beneath → control signal INVERTED. Plus cells:[] + FR-033 recursion trap. → parity_control still has NO valid case; the same-perspective pass alone is insufficient — it needs a perspective-correct EVEN/odd threat signal.
- Tool created: `TOOLS/parity_cells.mjs` (same-perspective, solver-free z/odd/all-threat cell extractor, works around cells:[]+FR-033). Likely makes eval-58 redundant (same routing+non-grounding) — confirm cheaply in batch 3.

### eval-0 — positional/center_control — **SUFFICIENT (empty board), with 2 gaps**
- Empty board win→draw; center_control is the only honest reason; grounds & passes §14.
- **GAP 1 (register):** forward_distance buckets the 41-ply opening win as slow_zugzwang, but an empty board has no zugzwang. Register must be PHASE-AWARE: discs≈0 → lost_or_won_opening overrides the distance bucket. (Confirms §13.1 cutoffs need phase-awareness, not just ply thresholds.)
- **GAP 2 (positional fabrication):** center_control is correlational/near-tautological. **eval-24 is a COUNTEREXAMPLE** — its best move is the EDGE col0, so "bestCell more central" is FALSE; the §14 "holds AND differs" wording is too weak and would pass a fabricated center_control. Positional check must verify centrality DIRECTION and be the gated last rung on featureless boards only.
- eval-21 fully redundant with eval-0. **eval-24 MUST be audited** (counterexample). eval-2/37/40 not auto-redundant.

### eval-7 — resistance (both-lose) — **ROUTING_GAP / PAYLOAD_UNGROUNDABLE**
- forced_block immediate-loss inside a both-lose position. Best col7 blocks Gray's pre-existing immediate threat at c7r4 (slow, 21 plies); played col6 loses on ply 1. Honest reason = a concrete BLOCK line, fully grounded (opponent.immediate_threat.cells=[c7r4]).
- **HEADLINE GAP A (routing):** SAME-floor sends it to resistance, whose {loserSide,speed,punishable} schema has NO cell slot and asserts no block → the explaining fact is DISCARDED. The mover doesn't "last longer for more punish chances" — they fail to block an immediate win. Proposal: route immediate-loss defensive misses (played register=immediate + confirmed opponent immediate_threat) to a concrete block line even when same-floor; or add resistance.decisiveCell + playedRegister.
- **HEADLINE GAP B (phantom punishable):** punishable=win is a phantom — mistake-mode line requiring Gray to slip; under optimal play Green loses either way. reachability.played.ceiling alone MISLEADS (implies a real chance, hides the ply-1 loss). Phantom-vs-real must be flagged.
- Makes redundant other forced_block/immediate-loss resistance cases: eval-11,12,14,38,42,52,55,61 (check played register=immediate). **NOT covered:** resistance where BOTH branches are slow_zugzwang (no immediate threat) — a different subspecies; must probe one in batch 3 (e.g. eval-23/28/48/64 deep both-lose).

### eval-15 — concrete_line dual-line (win→loss) — **PAYLOAD_UNGROUNDABLE**
- Genuine missed_own + enabled_opponent. Best col2: Green wins at c1r3. Played col0: Gray wins at c3r5 (diagonal) AFTER taking the shared pivot c1r3. Both lines pivot on c1r3 (Green's win cell = Gray's enabling cell).
- **HEADLINE GAP A:** vector does NOT carry the opponent line — decisiveLine.opponent=null, oppCategoryExamples=[] even at depth 26; c3r5 appears nowhere. A FV-driven builder silently drops the enabled_opponent fact. → must populate decisiveLine.opponent for win→loss flips (optimal-mode played-branch search).
- **HEADLINE GAP B:** even with both lines, the schema (one completingCell + templated betterMoveDoes, no free narrative) cannot express the SHARED pivot cell — the actual reason the move loses. → needs a dual_line kind or pivotCell{sharedWithOpponent} carrying both windows.
- Covers the shared-cell zugzwang dual family + any win→loss flip needing the null decisiveLine.opponent.

### eval-1 — near-opening draw→loss flip — **PAYLOAD_UNGROUNDABLE / ROUTING_GAP (the BIG GAP)**
- `44`, draw→loss flip at 3 discs. parity_control FAILS (no structure), concrete_line FAILS (loss 39 plies out = slow_zugzwang, only mistake-mode phantoms), positional/center_control ROUTES but is SOLVER-REFUTED: col5 is LESS central than played col4 yet DRAWS while col4 LOSES → "more central = better" is FALSE. centerDominance fires with NO solver guard → fabricates a false reason.
- True reason = long-range zugzwang ~39 plies out (3rd disc flips col4 parity 4E→3O) — unnameable at 3 discs. No field expresses "loses by long-range zugzwang" absent z-threat/claimeven/searchable line.
- Proposals: (a) solver-gate positional (require centrality monotone with solver score across alternatives → kills it here → honest OMIT); (b) add a zugzwang_opening kind emitting an honest register-only reason.
- **Subsumes the whole near-opening draw→loss class: eval-3, eval-9, eval-13, eval-18, eval-22, eval-25, eval-26, eval-47** (~9 cases, no groundable kind). Combined w/ eval-0's eval-24 counterexample → the FLIP/positional bucket (17) largely collapses to OMIT-or-fabricate.

### eval-8 — resistance (both-lose opening) — **INSUFFICIENT (correct = OMIT)**
- Board "3" (center opening), P2 theoretically lost; every reply loses. Payload passes §14 (speed=slower by 2 plies at fill, punishable=win) but is coaching-vacuous (sev 0).
- **GAP (sharpens eval-7 B):** punishable=win does NOT discriminate best from played — reachability.best.ceiling is ALSO win → not a differentiator, and it tells a coach "you can still win" on a lost position. Gate punishable on a best-vs-played ceiling DIFF.
- **NEW GAP:** vector can't distinguish "this move lost the game" from "position already lost." Add preMoveFloor; OMIT resistance when preMoveFloor=loss + sev 0.
- **Register gap (3rd confirmation):** buckets slow_zugzwang but is semantically lost_or_won_opening — ply-only bucket can't tell opening-determined loss from real endgame zugzwang.
- eval-16,30,33 IDENTICAL position → fully redundant (OMIT). eval-19/23/44 deeper both-lose sev-0, spot-check only.

### eval-27 — defensive_miss flip (win→loss) → concrete_line — **SUFFICIENT**
- Green has pre-existing immediate threat at c2r5; best col1 blocks (+win), played col2 loses on ply 2. Routes to concrete_line, line.winner=opponent, completingCell c2r5 (==bestCell), register immediate. Passes §14.
- Provenance recoverable: patternsOpponent (opp-perspective classify on pre-move board) carries c2r5; defensive_miss verb "blocks". FR-033 trap: mover-perspective forced_block returns cells:[] — grounded cell ONLY from the opp-perspective augmentation (which the defensive_miss branch runs). Low-pri: add line.preExisting/source flag to disambiguate "created" vs "failed to block".
- **KEY CONTRAST w/ eval-7:** same forced_block mechanism is SUFFICIENT when it FLIPS (concrete_line carries the cell) but BREAKS when SAME-FLOOR (resistance has no cell slot). The flip/same-floor routing split itself causes the eval-7 failure.
- Makes eval-14, eval-31 likely redundant (spot-check: single pre-existing immediate threat, block-cell==bestCell, immediate loss).

### eval-51 — concrete_line FLIP (draw→loss, figure_7) — **PAYLOAD_UNGROUNDABLE**
- Opponent forces win at c3r2 (@ply7, forced_sequence). Cell IS genuinely decisive (reachable depth 8, cheap) — NOT the blockable trap the epic advertised.
- **HEADLINE (unifies w/ eval-15):** the real defect is OPPONENT-LINE SUPPRESSION. The Case-1 short-circuit (sparseLookahead.js:634 early return) fires because a player-side delta exists → opponent-punishment search never runs → production vector emits opponent:null / oppCategoryExamples:[] / no decisiveLine. So concrete_line is ungroundable from the production vector for flip-to-loss cases carrying a player-side structure delta. Story B's short-circuit removal is the fix, but the epic frames it as depth/decisiveness; the load-bearing issue is opponent-line ABSENCE.
- Secondary: winningLinesThroughCell=1 UNDERSTATES (c3r2 is actually a fork; passes the gate only via "completes under optimal defense"). So winningLines:1 alone is not a sufficient decisiveness signal.
- Tools created: `TOOLS/opp_punish_probe.mjs`, `TOOLS/decisive_check.mjs`. Likely makes other FLIP-to-loss/figure_7 cases with a player-side delta redundant (same opponent:null).
- NOTE: this means eval-6 (SUFFICIENT) and eval-27 (SUFFICIENT) only ground because eval-6 used a mandatory re-solve and eval-27's opponent cell came from the defensive_miss patternsOpponent augmentation (not the suppressed lookahead). missed_own/enabled win→loss flips have no such augmentation → opponent:null.

### eval-58 — z_threat win→draw → concrete_line — **SUFFICIENT via concrete_line; parity_control NOT validated (CONFIRMED)**
- Structurally identical to eval-49: single-open-column zugzwang, Green wins at c1r3 (forced_sequence). detectZThreat odd-only fires on the PLAYED board only (c1r3 is EVEN-distance on the best board → kept set []). 
- **CONFIRMED HEADLINE:** both z_threat win→draw candidates (eval-49, eval-58) fail parity_control. The rung has NO valid case in eval_set_large_3 → must SHIP DARK per epic §16. The same-perspective pass (Story B2) is necessary but NOT sufficient — it also needs a perspective-correct EVEN/odd threat predicate (detectZThreat's odd-only predicate is the blocker).
- Last z_threat win→draw case; no further redundancy.

### eval-64 — resistance (deep both-lose, z_threat tag) — **INSUFFICIENT (OMIT)**
- speed=slower thin (2 plies), severity 0. reachability.best.ceiling == played.ceiling == win → punishable NON-discriminating (eval-8 confirmed) + PHANTOM (Green loses optimally everywhere, no re-solve-confirmed cell).
- **CLARIFICATION:** parity-tag-SAME-floor → resistance is CORRECT routing (parity_control is flip-only; mover already lost). NOT a routing gap. But resistance discards the surrendered zugzwang column (only explanatory content).
- Proposals: punishable = a DELTA gated on best≠played ceilings + re-solve-confirmed (suppress phantom); OMIT for sev-0 marginal same-floor.
- Redundant: eval-54, eval-60, eval-62 (parity-tag both-lose). **Resistance now fails in ALL probed subspecies (eval-7 routing-gap, eval-8 vacuous-opening, eval-64 vacuous-deep). eval-42 = last hope for an honest resistance success.**

### eval-5 — win→draw drawing_move → **parity_control (SUFFICIENT)** — MAJOR CORRECTION
- NOT a concrete_line baseline. Forgone win is an ODD-distance z-threat at c3r4 (deep, ply 40, slow_zugzwang). Same-perspective parity pass FIRES: best kept [c3r4], played [], controller flips → parity_control grounds, and the cell surfaces DIRECTLY in the frozen vector (major_threat_parity cells:[c3r4]) — NO deep re-solve needed (unlike eval-6).
- **NUANCE / ROUTING GAP:** parity_control CAN ground when the threat is odd-distance & the controller is the mover. BUT eval-5's blunder TAG is `drawing_move`, not z_threat — so if the rung is gated on the TAG (as epic §5 specifies) eval-5 NEVER enters parity_control and falls to concrete_line (needing the deep re-solve + the inverted realizedOnPly bug). Meanwhile the tag-carrying cases (eval-49/58) are even-distance P2 threats the odd-only detector can't see. → Net: as epic specifies (tag-gated), parity_control still has no case that BOTH enters AND grounds; a STRUCTURE-gated rung WOULD validate via eval-5. This is a routing-gate design gap, not pure "ship dark".
- **Reshapes the FLIP/positional bucket:** the win→draw drawing_move family (eval-2, eval-24, eval-37, eval-40) likely routes to parity_control/concrete_line (groundable), NOT positional-fabrication. The real OMIT gap is the draw→loss suboptimal class (eval-1,3,9,13,18,22,25,26,47).

### eval-29 — win→loss tactical flip (3 discs, double_threat) → concrete_line — **PAYLOAD_UNGROUNDABLE**
- Opponent fork (winningLines=2) completes at c5r1 @ply7, forced_sequence — re-solve confirmed. Catalog discs≤6 positional heuristic MISLABELED it; it is a tactical concrete_line, NOT positional.
- Ungroundable: vector carries opponent:null, oppCategoryExamples:[], records only the PLAYER's surrendered best-line threats, not the opponent's punishing fork. Same class as eval-15. **eval-35 redundant.**

### eval-46 — CLEAN win→loss flip (forced_win) → concrete_line — **PAYLOAD_UNGROUNDABLE (the generalization)**
- decisiveLine.opponent = null + oppCategoryExamples=[] EVEN for a clean, geometrically-separate-window win→loss flip. → the opponent-line-absence gap is NOT a dual-line artifact; it is a GENERAL property of ALL win→loss concrete_line flips.
- betterMoveDoes (missed win) IS FV-derivable, but the half that explains the blunder (what the played move ALLOWS = opponent c1r2, slow_zugzwang ply 34) is absent. Clean case needs ONLY the opponent line (no schema extension); eval-15 needs opponent line + shared-cell schema.
- **UNIFIED HEADLINE GAP (eval-15+29+46+51):** every win→loss concrete_line flip is ungroundable from the production vector because decisiveLine.opponent is null (Case-1 short-circuit / no opponent-branch optimal re-solve). Fix = one field: populate decisiveLine.opponent on FLIP-to-loss via optimal re-solve of the played branch. Epic Story B targets the short-circuit but frames it as depth/decisiveness; opponent-line ABSENCE is the load-bearing issue. Redundant: eval-31, eval-32, eval-35 (other win→loss flips).

### eval-24 — win→draw deep zugzwang → positional — **PAYLOAD_UNGROUNDABLE (positional fabricates; correct = OMIT)**
- Best=EDGE col0 (centrality dist 3) > played col4 (dist 1) → center_control "more central" FALSE. Worse: 5 of 7 columns WIN → center_control truth value is UNDEFINED (depends which winning col is nominated). parity_control fails (threats not on board yet), concrete_line decisiveness FAILS (cells blockable, diffuse zugzwang), positional FABRICATES.
- Load-bearing guard: suppress positional when winningColumnCount>1 OR register==slow_zugzwang → OMIT. Centrality-direction guard (eval-0) is necessary but INSUFFICIENT.
- **Refines win→draw split:** eval-5 = parity_control groundable (threat ON board, odd-dist); eval-24 = OMIT (deep multi-win zugzwang). eval-0/21 = positional OK (empty board, unique center win). eval-2/37/40 = unresolved (parity_control vs OMIT) → probing eval-2/eval-37.

### eval-42 — resistance flagship ("punish line in reach") — **INSUFFICIENT (schema-level)**
- The ONE case where the resistance thesis is perfectly, re-solve-confirmed TRUE: best 25 plies vs played 5; Gray has 1 safe reply after best vs 6 after played; real punishable cell c2r5 (Green wins if Gray slips, confirmed, NOT phantom).
- **CONCLUSIVE GAP:** the PAYLOAD is byte-for-byte identical to eval-8's vacuous payload {loserSide, speed:"slower", punishable:"win"}. The schema discards every quantity separating real from vacuous resistance: numeric forward-distance gap (25v5 vs 40v38), opponent safe-reply count (1 vs 6), severity, the winning cell. punishable=played.ceiling non-discriminating (both ceilings=win) again.
- → **Resistance has NO honest success expressible in the current {loserSide,speed,punishable} payload ANYWHERE in the set.** Fix: numeric forwardDistanceGap + opponentSafeReplies + re-solve-confirmed punishableCell + punishable as DIFF vs best.ceiling + severity/preMoveFloor gate.
- Makes the remaining both-lose resistance cases redundant (eval-11/12/14/19/23/38/44/52/55/61): each is eval-7's immediate-block misroute or this enum-underdetermination.

### eval-2 — win→draw deep zugzwang → **OMIT** (positional fabricates)
- Win resolves at ply 42 (board full); parity empty; concrete_line cell c1r6 BLOCKABLE (board-fill artifact). winningColumnCount=1, best=dead-center → center_control passes BOTH centrality-direction AND truth, yet mechanism is zugzwang not centrality. → eval-24's winningColumnCount>1 guard does NOT catch this; **only register==slow_zugzwang guard does (load-bearing positional fix).**
- **Family resolved:** win→draw drawing_move is MOSTLY OMIT (deep diffuse zugzwang); only eval-5 (on-board odd-dist z-threat) grounds as parity_control. **eval-37, eval-40 REDUNDANT (OMIT).** → positional rung as designed honestly works ONLY on the empty board (eval-0/21); all populated win→draw → OMIT w/ center_control fabricating.

### eval-32 — FAST win→loss flip (immediate_threat) → concrete_line — **SUFFICIENT (groundable)**
- decisiveLine.opponent IS present (owner=opponent, completingCell c3r3, winningLines=2, oppCategoryExamples non-empty, realizedOnPly 1). Payload fully FV-derivable, passes §14.
- **BOUNDS the opponent-line gap:** the eval-15/29/46/51 ungroundability is NOT universal — it hits win→loss flips whose punishing line is BEYOND THE IMMEDIATE HORIZON (forced_sequence+ / suppressed by Case-1 short-circuit / deep zugzwang). Losses to an ON-BOARD immediate/double threat (realizedOnPly~1) surface and ground. **eval-31 REDUNDANT (SUFFICIENT).**

---
## SATURATION DECLARED — 19 cases analyzed, all 5 kinds + all (branch×kind) groups covered multiply; conclusions stable. Remaining ~47 cases mapped to representatives via redundancy notes above.
