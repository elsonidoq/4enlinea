> ⛔ **SUPERSEDED / ABANDONED 2026-06-28** — the reason-field design described or assumed here branched off and is no longer the plan. Restarting from `docs/architecture/my_pseudocode.md`. Do NOT use this file as guidance; treat it as historical only.

# VERIFY — eval-2 (drawing_move, win→draw FLIP, 3 discs) — DOUBLE refusal stress

## verdict: SOUND
## grain: `zugzwang_class` (FLIPPING, diffuse, no canonical cell)

Board `444` (3 discs, all col4 0-idx), Gray/P2 to move. Played 0-idx col4 (display c5),
correct 0-idx col3 (display c4 = dead center). Outcome win→draw FLIP. Router §5: not_a_blunder
fails (flip); **line REFUSED** (terminal four blockable / non-canonical, §8 gate 2);
**opening_principle REFUSED** (line-participation NON-monotone, §8 gate 4 — and it points to the
WRONG cell); **line_parity REFUSED** (no standing threat, parity cells empty, §8 gate 3). Router
falls through to rule 4 → **`zugzwang_class`** with `noThreatWithinPlies`.

This is the eval-6 ACID-TEST twin that lands on the OTHER side: eval-6's terminal four is DECISIVE
(single window, forced) → `line`; eval-2's terminal four is BLOCKABLE (non-canonical board-fill
artifact) → `zugzwang_class`. The discriminator is `decisive_check` verdict.

## Evidence (reproducible; run from connect-four/)

### 1. Case + scores + outcomeDelta + register
`node server/scripts/reason_audit/TOOLS/forward_distance.mjs 444 3 4`
```
per-col scores (Gray): [-4, -3, -2, 1, 0, -2, -2]
col 3: score=1  outcome=win   forwardPlies=38  register=slow_zugzwang(tool bucket)
col 4: score=0  outcome=draw  forwardPlies=null
```
- best col3 = +1 (the SLOWEST possible win); played col4 = 0 (draw) → win→draw **FLIP**. ✓
- Winning cols (score>0): col3 ONLY → winningColumnCount = 1.
- bestPlies = 43 − 2·1 − 3 = **38**; playedPlies = draw → **"none"**.
- **register.word = "opening"** by §4 contract (discs=3 ≤ 6 → phase "opening"). The tool's
  distance bucket says slow_zugzwang, but the contract's disc-count override governs (same as
  eval-0 FINDING 1). **This is load-bearing: the "register==slow_zugzwang" suppression heuristic
  from the iteration-2 notes is UNAVAILABLE here — register is "opening", so gate-4 monotonicity
  is the ONLY guard that refuses opening_principle.**

### 2. Refutation (c) — line_parity REFUSED (no standing threat anywhere)
`parity_cells.mjs {444,4443,4444} {1,2}` → ALL six runs return
`zThreatCells:[]  allThreatCells:[]`. No z-threat/odd-threat cell exists on the board (the parity
structure only materializes ~35 plies deep). §8 gate 3 forbids deriving a controller from
empty-square parity COUNTS — and a count derivation would give the wrong controller. No standing
threat whose ownership flips → **line_parity REFUSED**. ✓

### 3. Refutation (a) — line REFUSED (terminal four NON-canonical / blockable)
BEST branch `optimal_line.mjs 4443`:
```
terminal: win (Gray/P2)  completingCell: c1r6  completingPly: 42 (board FULL)
winningWindows: [["c1r6","c2r6","c3r6","c4r6"]]  (top row, ONE window)
```
PLAYED branch `optimal_line.mjs 4444` → `board full, no win` (draw). bestLine present, playedLine
absent — but the bestLine cell does NOT survive the decisiveness gate:
`decisive_check.mjs 4443 c1r6`:
```
winner: Gray  completingCellIsCandidate: true  candidateInCompletedWindow: true
verdict: "BLOCKABLE (defender escapes / candidate not decisive)"
defenderCouldOccupyCandidateWhenGravityTop: true
```
Unlike eval-6 (DECISIVE, single forced window), here the |score|=1 win is diffuse parity: the
specific completing cell/window shifts with Green's defense, and the defender could occupy c1r6.
§8 gate 2 ("name a cell ONLY when re-solve-confirmed decisive OR forced terminal board-fill;
never a non-canonical diffuse terminal") is NOT met → **line REFUSED — do NOT name c1r6**. ✓

### 4. Refutation (b) — opening_principle REFUSED (line-participation NON-monotone; picks WRONG cell)
Geometric 4-window count of each column's current landing cell on `444` vs solver scores:
```
col0 c1r1 win=3  sc=-4 | col1 c2r1 win=4  sc=-3 | col2 c3r1 win=5  sc=-2
col3 c4r1 win=7  sc=+1 | col4 c5r4 win=11 sc=0  | col5 c6r1 win=4 sc=-2 | col6 c7r1 win=3 sc=-2
counts: [3,4,5,7,11,4,3]   scores: [-4,-3,-2,1,0,-2,-2]
best-score col = 3 (cnt 7);  MAX-participation col = 4 (cnt 11, sc 0)   MONOTONE? FALSE
```
The **played** move col4 lands HIGH in the stacked center column → it has the HIGHEST line
participation (11) of any move, yet it only DRAWS. The winning col3 has participation 7. So
line_participation does not merely fail to explain the win — **it actively predicts the played
(draw) cell as best**. §8 gate 4 ("opening_principle only when line-participation monotone with
solver — it inverts mid-game") is violated → **opening_principle REFUSED**. ✓

This is the key VERIFY finding: even though phase=="opening" (3 discs) AND best=dead-center (so a
naive center_control / direction-guard test PASSES, as the iteration-2 note flagged), the
MECHANISTIC line_participation gate catches the fabrication because the stacked center inverts the
geometry. The win mechanism is diffuse zugzwang, not centrality; centrality is causally
irrelevant.

### 5. Refutation (d) — forward search confirms diffuse / no threat within horizon
`forward_projection.mjs 444` optimal-line trace:
```
p4..p23  -> P1mj:[] P2mj:[]   (20 plies, NO major threat for either side)
p24      -> first major threat P2mj:[c3r5]  (intermediate, non-winning)
terminal: win P2 c1r6 ply42; winningWindows length 1
"win window first major-threat at ply 38, emptyCell c1r6, reachableThen=FALSE"
```
No major threat surfaces within the first **20 plies** of the move; the winning window itself
never becomes a reachable major threat until ply 38 (one ply before terminal). §8 gate 5 (assert
no-threat only when forward search confirms it, flipping case only) is satisfied →
`zugzwang:{noThreatWithinPlies:20}`. ✓

## §5 router landing
flip=true → (1) not_a_blunder skipped. (2) line/line_parity: no re-solve-decisive four (gate 2
BLOCKABLE) → skip. (3) opening_principle: line-participation NON-monotone (gate 4) → skip.
(4) flip → **zugzwang_class**. Deterministic landing confirmed by refusing 2 and 3. ✓

## Golden payload — see golden/eval-2.json
winner = "player" (Gray, the mover, forgoes its OWN razor-thin win).

## player_sentence (honest, NO lesson)
"The center column keeps a razor-thin win that only pays off when the board completely fills — no
threat, no forcing line, no center-control rule explains it; your move simply lets that endgame
edge slip to a draw." (There is no transferable tactical lesson here: the win is a deep diffuse
zugzwang with no nameable cell.)

## defect: none blocking (SOUND). One general FINDING (not a fabrication):
The §4 phase rule keys on disc count only (`discs≤6 → opening`), so this 3-disc board is labelled
register.word="opening" even though the win is a 38-ply deep zugzwang. register (board phase) and
grain (reason mechanism) are correctly orthogonal here, so this does NOT cause fabrication. BUT it
means the iteration-2 "suppress positional when register==slow_zugzwang" guard would NOT fire on
this board (register is "opening"). The load-bearing guard is therefore **§8 gate-4
line-participation monotonicity**, not any register check. GENERAL epic note: do not rely on a
register==slow_zugzwang test to suppress opening_principle; rely on gate-4 monotonicity (and
optionally also key phase on bestPlies/near-fill, not disc count alone, so deep-zugzwang-from-
few-discs is not mislabelled "opening").

## tools_used
- forward_distance.mjs 444 3 4
- parity_cells.mjs {444,4443,4444} {1,2}  (all empty)
- optimal_line.mjs 4443 (best) / 4444 (played)
- decisive_check.mjs 4443 c1r6  → BLOCKABLE
- forward_projection.mjs 444 / 4443
- inline node: geometric 4-window participation counts (monotonicity proof)
## tools_created: none (existing TOOLS sufficed)

## one-line lesson + redundancy
eval-2 is the eval-6 acid-test TWIN on the other side: same ply-42 board-fill |score|=1 win, but
`decisive_check` = BLOCKABLE (non-canonical) → `zugzwang_class`, not `line`. It proves opening_principle
is refused by gate-4 line-participation NON-monotonicity (the stacked center inverts the geometry and
points to the WRONG/played cell) — NOT by any register guard, since at 3 discs register.word=="opening".
Makes **eval-37, eval-40, eval-24** redundant: all are |score|=1 slow/diffuse zugzwang win/draw flips with
empty parity and a blockable terminal → all route `zugzwang_class` (no canonical cell, no parity controller).
