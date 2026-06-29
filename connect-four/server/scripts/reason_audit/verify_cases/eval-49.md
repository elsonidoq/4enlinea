> ⛔ **SUPERSEDED / ABANDONED 2026-06-28** — the reason-field design described or assumed here branched off and is no longer the plan. Restarting from `docs/architecture/my_pseudocode.md`. Do NOT use this file as guidance; treat it as historical only.

# VERIFY — eval-49 (z_threat, WIN→DRAW flip)

## verdict: SOUND
## grain: `line_parity` (controller from SOLVER FLIP, ownerParity even from c7r2 row)

This is the **P2 even-distance test**. Under the iteration-2 sufficiency audit this routed to
`concrete_line` ONLY because the spec'd `detectZThreat` (odd-only, `cells:[]`) could not ground
`parity_control`. The unified algorithm fixes that: §8 gate 3 takes the controller from the
**solver flip**, never from an empty-square parity count — so `line_parity` is now soundly
groundable here, and §5 rule 2 ("standing threat whose ownership flips → line_parity") routes it.

## Case facts
- board_state (pre-move, 35 discs): `33241034112213235544401245230150005`
- mover = **Gray (P2, perspective 2)** — 35 discs ⇒ P2 to move (ply 36).
- move_played = **6** (internal col6 = display col7); correct_move = **5** (internal col5 = display col6).
- Solver pre-move (Gray POV): `[-1000,-1000,-1000,-1000,-1000, 3, 0]` ⇒ best internal col5 = **+3 WIN**,
  played internal col6 = **0 DRAW**. FLIP confirmed.
- Standing threat = the row-2 horizontal four **c4r2·c5r2·c6r2·c7r2** (three Gray discs + empty c7r2),
  completing cell **c7r2** (internal col6 row1).

## Mechanism (single-open-column zugzwang)
- **BEST (col5 → c6r6):** Gray fills the second-to-last column. Only display col7 remains open
  (6 empty, even). Green is **forced** into it (score −3); Green plays c7r1, Gray completes **c7r2**
  → terminal win at ply 38. forwardPlies = **2**, register = immediate.
- **PLAYED (col6 = display col7):** Gray drops into the only open column himself, inverting the
  zugzwang. Green replies by occupying **c7r2** (score 0) → draw. The threat ownership flipped to Green.

## Evidence (reproducible commands, run from `connect-four/`)

### Solver outcome / flip + register
```
node server/scripts/reason_audit/TOOLS/forward_distance.mjs 33241034112213235544401245230150005 5 6
  per-col scores: [-1000,-1000,-1000,-1000,-1000, 3, 0]
  col 5: score=3 outcome=win  forwardPlies=2 register=immediate
  col 6: score=0 outcome=draw forwardPlies=null
```
bestPlies = 43 − 2·3 − 35 = **2**; playedPlies = draw → **none**.

### Decisive gate on c7r2 — DECISIVE
```
node server/scripts/reason_audit/TOOLS/decisive_check.mjs 33241034112213235544401245230150005 c7r2
  verdict: "DECISIVE (win completes through candidate under optimal defense)"
  winningWindows: [["c4r2","c5r2","c6r2","c7r2"], ["c7r2","c6r3","c5r4","c4r5"]]   (winningLines = 2 > 1)
  line: "p36:gcol5(s3) p37:Gcol6(s-3) p38:gcol6(s3)"   (Green forced; Gray completes)
```

### Optimal lines (dual PV)
```
node server/scripts/reason_audit/TOOLS/optimal_line.mjs 332410341122132355444012452301500055   (BEST)
  terminal:"win" winner:"second(Gray/P2)" completingCell:"c7r2" completingPly:38
node server/scripts/reason_audit/TOOLS/optimal_line.mjs 332410341122132355444012452301500056   (PLAYED)
  "board full, no win"   → playedLine: absent
```

### Refutation duty (a) — controller must NOT come from a parity count
The odd-only z-threat detector is BLIND to / INVERTS this even-distance threat:
```
parity_cells.mjs <board> 2   (perspective = Gray)
  pre-move : zThreatCells=[]        allThreatCells=[c7r2]   ← detector MISSES c7r2 (even-distance)
  BEST     : zThreatCells=[]        allThreatCells=[c7r2]   ← still blind on the WINNING board
  PLAYED   : zThreatCells=[c7r2]    allThreatCells=[c7r2]   ← fires on the WORSE (draw) board — INVERTED
```
Col7 has **6 empty cells (even)** pre-move — a naive empty-square parity count would also mislead.
∴ controller is taken from the **solver flip**: best = WIN for the player-to-move (Gray) ⇒
`controller = "player"`. `ownerParity = "even"` is the ROW parity of c7r2 (row 2), NOT an empties count.

## Why line_parity (not plain line)
The completing four is a **STANDING** threat — three Gray discs (c4r2,c5r2,c6r2) already present
pre-move with empty c7r2 — whose **ownership flips** across branches (BEST: Gray completes c7r2;
PLAYED: Green occupies c7r2). §5 rule 2 ⇒ `line_parity`. The `line` body is fully present and
re-solve-confirmed (decisive, 2 winning windows, completes under optimal defense), so the parity
overlay sits on a sound concrete line — no fabrication risk.

## Golden payload
See `golden/eval-49.json`. Key fields: grain=line_parity, winner=player,
outcomeDelta{best:win,played:draw}, register{bestPlies:2,playedPlies:none,phase/word:immediate},
line.bestLine{c7r2, [c4r2,c5r2,c6r2,c7r2], ply38, forced:yes}, line.playedLine:absent,
parity{controller:player(FROM SOLVER FLIP), mechanism:z_threat, ownerParity:even(c7r2 row),
surrenderedCell:c7r2, enabledCell:c6r6}.

## player_sentence
"You had a forced win — playing c6 leaves Green only the last column, and your standing three-in-a-row
on row 2 completes at c7r2. By dropping into the last column yourself you handed c7r2 to Green and only drew."

## defect
None. SOUND. The unified algorithm's solver-flip controller (gate 3) is exactly what rescues this
case from the iteration-2 `parity_control` non-grounding — the broken odd-only detector is no longer
on the grounding path.

## tools_used
- `./visualize_board.sh` (pre / best / played)
- `forward_distance.mjs` (flip + register)
- `decisive_check.mjs` (decisive gate, winning windows)
- `optimal_line.mjs` (dual PV: BEST completing ply 38; PLAYED board-full draw)
- `parity_cells.mjs` (refutation: odd-only detector blind/inverted)

## tools_created
None (all needed diagnostics already present; `parity_cells.mjs` reused from iteration-2).

## lesson + redundant cases
P2 even-distance z_threat WIN→DRAW single-open-column zugzwangs are **line_parity** in the unified
algorithm: the standing row-N four's ownership flips, controller comes from the SOLVER FLIP (mover wins
on best ⇒ controller=player), ownerParity from the completing cell's ROW. The odd-only detector is the
trap — it is blind on the winning board and fires on the losing one; never derive the controller from it
or from an empty-square count. Makes **eval-58** (the other z_threat WIN→DRAW) redundant: expect the
same line_parity routing, same odd-detector inversion, controller=player from the solver flip.
