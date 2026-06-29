> ⛔ **SUPERSEDED / ABANDONED 2026-06-28** — the reason-field design described or assumed here branched off and is no longer the plan. Restarting from `docs/architecture/my_pseudocode.md`. Do NOT use this file as guidance; treat it as historical only.

# VERIFY — eval-53 (figure_7 BOTH-WIN same-floor — honest-negative for the both-win bucket)

## verdict: SOUND
## grain: `not_a_blunder` (winner:"none", header-only body)

Board `333223255311`, 12 discs, Green/P1 to move. Played 0-idx col2 (display c3, score 11),
correct 0-idx col1 (display c2, score 12). Both moves WIN for Green. severity 0.
Router §5 rule 1: NOT a flip (win=win) AND no discriminating winning four reachable on either
PV → **`not_a_blunder`**. §8 gate 6 forbids any "wins sooner" line.

This is the honest-negative contrast to eval-43: eval-53 is the *cleaner* both-win case —
not just same floor, but the SAME completing cell + SAME window across both branches.

## Evidence (reproducible)

### 1. Scores + outcomeDelta + register
`node server/scripts/reason_audit/TOOLS/forward_distance.mjs 333223255311 1 2`
```
per-col scores (Green): [3, 12, 11, 3, 3, 10, 3]
col 1 (best):   score=12  outcome=win  forwardPlies=7  register=forced_sequence
col 2 (played): score=11  outcome=win  forwardPlies=9  register=forced_sequence
```
- outcomeDelta {best:"win", played:"win"} → NO FLIP (same floor). ✓
- bestPlies = 43 − 2·12 − 12 = 7. playedPlies = 43 − 2·11 − 12 = 9. ✓ (match solver forwardPlies)
- phase: discs 12 (>6, not opening); both forward buckets ≤10 → **forced_sequence**. ✓
- Ply gap = 9 − 7 = **2** (vs eval-43's 20). Negligible acceleration.

### 2. Dual-PV (optimal_line, both sides solver-optimal) — SAME four, SAME cell
BEST branch `node …/optimal_line.mjs 3332232553111`:
```
terminal: win  winner: first(Green/P1)
completingCell: c1r4  completingPly: 19
winningWindows: [["c4r1","c3r2","c2r3","c1r4"]]   (one window)
```
PLAYED branch `node …/optimal_line.mjs 3332232553112`:
```
terminal: win  winner: first(Green/P1)
completingCell: c1r4  completingPly: 21
winningWindows: [["c4r1","c3r2","c2r3","c1r4"]]   (SAME window)
```
→ Both branches win for Green through the **identical** up-diagonal four
`c4r1-c3r2-c2r3-c1r4`, completing at the **identical** cell `c1r4`. Only the ply at which it
lands differs (19 vs 21). There is **no discriminating winning four** — the played move does
not forgo a win, does not concede anything, reaches the same connect-four.

### 3. Refutation (a) — the cell is BLOCKABLE on BOTH branches (no decisive immediate threat)
`node server/scripts/reason_audit/TOOLS/decisive_check.mjs 3332232553111 c1r4`  → `BLOCKABLE`
`node server/scripts/reason_audit/TOOLS/decisive_check.mjs 3332232553112 c1r4`  → `BLOCKABLE`
- c1r4 is a forced-sequence/zugzwang win on both branches, not a decisive immediate threat.
  Neither move creates nor destroys it; it is the same standing win. §8 gate 2 would not let a
  builder name c1r4 as a discriminating decisive cell — it is not. → no `line`.

### 4. Refutation (b) — router + §8 gate 6 produce not_a_blunder
- §5 rule 1: (not flip) AND no discriminating winning four reachable → not_a_blunder. ✓
- §8 gate 6: same-floor with no discriminating reachable line MUST NOT say "wins sooner /
  lasts longer". A 2-ply-faster identical win is exactly the forbidden claim. winner:"none",
  body = header only, betterMoveDoes = canonical "position already decided; this move did not
  change the result reachably." ✓

## THE GENERAL THRESHOLD — eval-43 (claimed `line`) vs eval-53 (`not_a_blunder`)
Both resolve to **not_a_blunder** in the frozen golden set. The discriminator is **NOT the ply
gap** (eval-43 had a 20-ply gap and still failed; eval-53 has 2). The discriminator is:

> A both-win move is a blunder (`line`) ONLY when the better branch completes a *discriminating*
> winning four — a four that is decisive/alive on the best branch and absent-or-dead on the
> played branch (different window, or a forced win the played move forgoes). When BOTH PVs win
> through the **same winning window** (eval-53: identical c1r4 four) — or through the same
> blockable standing four that neither move creates/destroys (eval-43: identical c4r2 four) —
> there is no discriminating line. Pure timing (ply gap) is NEVER sufficient; §8 gate 6 forbids
> "wins sooner". → `discriminatingFour === false` ⇒ `not_a_blunder`, regardless of gap size.

eval-53 makes the threshold crisp and machine-checkable: **identical winningWindows across both
branch PVs ⇒ not_a_blunder, full stop** (the strongest possible same-four case).

## Golden payload — see golden/eval-53.json

## player_sentence
Honest no-lesson note: "Both column 2 and column 3 win for Green through the same diagonal
(c4-c1, finishing at c1r4) — column 2 just gets there two moves quicker. This is a preference,
not a mistake; no lesson to draw." (The vector emits NO 'wins sooner' line — gate 6.)

## defect: none (SOUND)
The router/gates handle this correctly. Confirms gate 6 must stay: severity 0 + identical
winning four would otherwise tempt a "wins 2 plies sooner" claim that overstates a non-error.

## tools_used
- visualize_board.sh 333223255311
- TOOLS/forward_distance.mjs 333223255311 1 2
- TOOLS/optimal_line.mjs 3332232553111 (best) / 3332232553112 (played)
- TOOLS/decisive_check.mjs 333223255311{1,2} c1r4

## tools_created: none (all needed diagnostics already in TOOLS/)

## one-line lesson
Identical winningWindows across both branch PVs ⇒ not_a_blunder regardless of ply gap; the
both-win→line threshold is a *discriminating* four (different/forgone window), never timing.
This makes the other clean same-floor both-win / both-lose cases redundant — eval-63, eval-20,
eval-36, eval-39, eval-59, eval-65 — all reduce to: re-solve both branches, compare windows;
same window ⇒ not_a_blunder, header-only, gate 6.
