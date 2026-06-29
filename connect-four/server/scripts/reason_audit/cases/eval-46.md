# eval-46 — verdict: PAYLOAD_UNGROUNDABLE

**Is `decisiveLine.opponent` populated here? NO.** `decisiveLine.opponent = null` and
`oppCategoryExamples = []` in the frozen lookahead — IDENTICAL to eval-15. This case is a CLEAN,
non-dual win→loss flip with geometrically SEPARATE player/opponent windows (player win at top of
board c2r5/c6r5; opponent win at bottom column-0 c1r2 — no shared cell). It therefore proves the
eval-15 gap is **GENERAL to win→loss concrete_line FLIPs, not a dual-line artifact**: even when the
opponent's punishing line is completely independent of the player's missed win, the engineered
vector still never carries it.

## Case facts
- movestring `333444343342525611` (18 discs), Green (P1) to move. severity 2.
- Per-col solver scores (0-idx): `[-12, -5, 3, --, 3, -12, 3]`.
- playedCol **1** → score **-5 (LOSS)**; bestCol **2** → score **+3 (WIN)**. FLIP win→loss. Confirmed.
- bestCell = **c3r3** (col2 lands display col3 row3).

## The two lines (solver-confirmed)
- **Best (col2):** Green WINS via **double_threat** at **c2r5 / c6r5** (completingCell c2r5,
  winningLinesThroughCell=2), live pliesToEnd 3 / repaired forward 19.
- **Played (col1):** Gray WINS. `optimal_line.mjs` + `decisive_check.mjs` →
  completingCell **c1r2**, single horizontal window **[c1r2,c2r2,c3r2,c4r2]** (row2; c2r2/c3r2/c4r2
  already Gray), completingPly **34** under optimal defense. Verdict **DECISIVE** (not blockable).
  c1r2 is the PRE-EXISTING Gray major threat ("col1 row2 (Gy)") in the empty column 0 — a slow
  even-row zugzwang threat, NOT created by the played move. The played move loses by **forgoing the
  forced win**, letting Gray's standing zugzwang threat convert 15 plies later.

## Register
`forward_distance.mjs`: played col1 forwardPlies=**15 → slow_zugzwang**; best col2 forwardPlies=19 →
slow_zugzwang. (Live `outcomeTiming.pliesToEnd` best=3/played=5 are the inverted-bug values.)

## Routed kind (ACTUAL) = concrete_line
FLIP ladder. parity_control? `parity_cells.mjs` both perspectives, both branches: `zThreatCells=[]`;
Gray's `allThreatCells=[c1r2,c6r4]` are IDENTICAL on best and played boards — no controller flip, no
NON-EMPTY differing kept/surrendered set → does NOT route parity_control (even though the *mechanism*
is zugzwang). Routes **concrete_line** (matches catalog).

## Hand-built payload (the only §14-valid one) — and why it is ungroundable
§14 for FLIP/concrete_line requires the `line` to be **present on the PLAYED branch, absent on the
better branch** → the line MUST describe the opponent's win:
```json
{ "register":"slow_zugzwang", "kind":"concrete_line",
  "outcomeDelta": { "best":"win", "played":"loss" },
  "line": { "winner":"opponent", "completingCell":"c1r2", "col":0,
            "winningLines":1, "realizedOnPly":34 },
  "betterMoveDoes": "Playing c3r3 (col2) completes your double threat at c2r5/c6r5 — register slow_zugzwang." }
```
The `line` payload (winner:opponent, c1r2) is **NOT derivable from the vector**:
`decisiveLine.opponent = null`, `decisiveLine.owner = "player"` (carries only c2r5), and
`oppCategoryExamples = []`. The opponent cell c1r2 appears NOWHERE in the frozen vector. Building it
requires the OPTIMAL re-solve of the played branch (optimal_line.mjs), which the vector does not
trigger. A FV-only builder would have no completingCell for the required winner:opponent line.

Asymmetry worth flagging: **`betterMoveDoes` IS groundable** (the player's missed win c2r5/c6r5 and
bestCell c3r3 are all in the vector). So the vector can say what the better move WOULD do, but cannot
say what the played move ALLOWS — which is precisely the half that explains the blunder. A coach
handed only the FV-derivable half learns "you missed a win at c2r5" but never learns the played move
hands Gray a zugzwang win at c1r2.

## §14 grader checks (for the correct winner:opponent payload)
- outcomeDelta matches solver (best win / played loss): ✓
- register matches forward bucket (slow_zugzwang, 15 plies): ✓
- line present on played branch / absent on better branch / outcome flips: ✓
- completingCell re-solve-confirmed decisive: ✓ (`decisive_check` → DECISIVE, single window, optimal defense)
- cell exists on snapshot: c1r2 exists on the **terminal** played board; on the immediate 19-disc
  snapshot column 0 is empty (future cell — same forward-cell caveat as eval-15).
- betterMoveDoes asserts no extra mechanism: ✓ (names cells + outcome + register only).
- **Mechanical checks PASS for the hand-injected payload — but the payload CANNOT be produced from
  the vector at all.** Ungroundable, not merely uninformative.

## Missing signal + proposal
**Vector gap (confirmed general):** for win→loss FLIPs the engineered vector sets
`decisiveLine.opponent = null` / `oppCategoryExamples = []` — the opponent's punishing line is never
computed, even for clean single-window flips with independent geometry. The §14-required
winner:opponent `line` payload has no data source.
*Proposal:* on every FLIP-to-loss, run the mistake-repaired OPTIMAL search on the played branch (as
optimal_line.mjs does) and populate `decisiveLine.opponent = { completingCell, col, winningLines,
realizedOnPly }`. This is the single fix that unblocks both eval-15 and eval-46; no schema/`kind`
change is needed for the CLEAN case (unlike eval-15, eval-46 does NOT also need the `dual_line` /
`pivotCell` schema extension — one opponent completingCell suffices because the windows are disjoint).

## Redundancy
Makes redundant any other **clean (non-shared-cell) win→loss concrete_line FLIP** case: they will all
hit `decisiveLine.opponent = null` and be PAYLOAD_UNGROUNDABLE for the same reason. Together with
eval-15 (shared-cell/dual variant) this brackets the failure mode: eval-15 needs BOTH the opponent
line AND a schema extension; eval-46 needs ONLY the opponent line. The common root cause — uncomputed
opponent decisive line — is demonstrated to be universal across the win→loss family.

## tools_used
visualize_board.sh (pre/played/best); print_lookahead.mjs (depth 24); TOOLS/forward_distance.mjs;
TOOLS/optimal_line.mjs (played branch); TOOLS/decisive_check.mjs (c1r2 → DECISIVE);
TOOLS/parity_cells.mjs (P1 & P2, pre/played/best).
## tools_created
none (reused existing).
