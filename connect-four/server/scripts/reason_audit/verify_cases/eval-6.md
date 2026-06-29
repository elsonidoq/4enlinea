> ⛔ **SUPERSEDED / ABANDONED 2026-06-28** — the reason-field design described or assumed here branched off and is no longer the plan. Restarting from `docs/architecture/my_pseudocode.md`. Do NOT use this file as guidance; treat it as historical only.

# VERIFY — eval-6 (undercut / slow_zugzwang ACID TEST: forced-vs-diffuse)

## verdict: SOUND
## grain: `line` (forced terminal board-fill zugzwang)

Board `444423333643535655`, 18 discs, Green/P1 to move. Played 0-idx col1 (display c2),
correct 0-idx col2 (display c3). Outcome draw→loss FLIP. Router §5 rule 2: a winning four,
re-solve-confirmed decisive on the crux branch (FORCED terminal board-fill), no ownership flip
→ **`line`** (not line_parity, not zugzwang_class).

## Evidence (reproducible)

### 1. Scores + outcomeDelta + register
`node server/scripts/reason_audit/TOOLS/forward_distance.mjs 444423333643535655 1 2`
```
per-col scores (Green): [-11, -1, 0, -1000, -11, 0, -11]
col 1: score=-1 outcome=loss  forwardPlies=23 register=slow_zugzwang
col 2: score=0  outcome=draw  forwardPlies=null register=draw_no_register
```
- played col1 = -1 → loss (slowest |score|=1, ≈ board-fill); best col2 = 0 → draw.
- outcomeDelta {best:"draw", played:"loss"} → FLIP. ✓
- register.playedPlies = 43 − 2·1 − 18 = 23 → near-fill bucket → word **slow_zugzwang**. ✓
- register.bestPlies = "none" (draw). ✓

### 2. Dual-PV (optimal_line, both sides solver-optimal)
PLAYED branch `node …/optimal_line.mjs 4444233336435356551`:
```
terminal: win  winner: second(Gray/P2)
completingCell: c7r6  completingPly: 42
winningWindows: [["c4r3","c5r4","c6r5","c7r6"]]   (exactly ONE window)
finalMovestring: 444423333643535655152200000011222111456666  (42 discs = full board)
```
BEST branch `node …/optimal_line.mjs 4444233336435356552`:
```
board full, no win   → draw, bestLine = "absent"
```

### 3. Refutation (a) — terminal four is FORCED + canonical, NOT diffuse
- completingPly 42 = the **last cell of a full board** (board-fill). At that moment exactly one
  empty cell remains, so the completion is forced by definition (no interchangeable terminal).
- `winningWindows` has length 1 → the diagonal c4r3-c5r4-c6r5-c7r6 is the **unique** winning four
  through c7r6. Canonical, not one-of-many diffuse terminals. ACID TEST PASSED → grain `line`
  with forced:"yes", not `zugzwang_class`.

### 4. decisive_check on the cell
`node server/scripts/reason_audit/TOOLS/decisive_check.mjs 4444233336435356551 c7r6`
```
verdict: "DECISIVE (win completes through candidate under optimal defense)"
winnerIsPunisher: true  completingCellIsCandidate: true  candidateInCompletedWindow: true
winningWindows: [["c4r3","c5r4","c6r5","c7r6"]]
```
Satisfies §8 gate 2 (re-solve-confirmed decisive AND forced terminal board-fill). ✓

### 5. Refutation (b) — cell is NOT in the frozen lookahead → re-solve is MANDATORY
`node server/scripts/print_lookahead.mjs 444423333643535655 1 26`
```
c7r6 surfaces only as  tag: "minor_threat", realizedOnPly: 10   (future-minor_threat-2: cells:c7r6)
the c4r3-c5r4-c6r5-c7r6 winning window NEVER appears in the frozen vector
```
A builder trusting the raw vector would emit c7r6 as a *minor_threat* (or nothing) — the WRONG
label. Populating `line.playedLine` REQUIRES the optimal_line re-solve. This is load-bearing for
every slow_zugzwang `line` case.

## Golden payload — see golden/eval-6.json

## player_sentence
"Playing column 2 hands Gray the win on the very last disc: the c4-c7 up-diagonal completes at
c7r6 when the board fills. Column 3 instead exhausts the squares to a draw."

## defect: none (SOUND)
Caveat (not a defect): the frozen lookahead mislabels the decisive cell as minor_threat. This is
already covered by the epic's mandatory re-solve for completingCell grounding (§8 gate 2); no
router/field change needed. If anything, it confirms the gate must stay mandatory — do not let a
builder short-circuit to the raw vector for slow_zugzwang.

## tools_used
- visualize_board.sh 444423333643535655
- TOOLS/forward_distance.mjs 444423333643535655 1 2
- TOOLS/optimal_line.mjs 4444233336435356551 (played) / …552 (best)
- TOOLS/decisive_check.mjs 4444233336435356551 c7r6
- print_lookahead.mjs 444423333643535655 1 26

## tools_created: none (all needed diagnostics already in TOOLS/)

## one-line lesson
A forced terminal board-fill (single winning window through the unique last cell) is grain `line`
with forced:"yes", never zugzwang_class — the acid test is winningWindows.length===1 at completingPly===42;
this likely makes the other board-fill/slow_zugzwang cases redundant (all reduce to: re-solve to terminal,
emit the single diagonal, register=slow_zugzwang).
