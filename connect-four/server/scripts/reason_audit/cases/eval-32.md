# eval-32 — verdict: SUFFICIENT (groundable)

**Is `decisiveLine.opponent` (or any opponent cell) present in the vector for this FAST win→loss
flip? YES.** Unlike eval-46/eval-15, here `decisiveLine.owner = "opponent"` with
`completingCell = "c3r3"`, `winningLinesThroughCell = 2`, and `oppCategoryExamples` is NON-EMPTY
(double_threat + immediate_threat at `[c3r3, c6r2]`, realizedOnPly 1). The opponent's punishing win is
fully carried by the frozen vector.

**This bounds the eval-46 gap: it is NOT universal across win→loss flips — it is SLOW-LOSS-SPECIFIC.**
When the opponent's punishing win is a FAST on-board immediate/double threat (realizedOnPly 1), the
lookahead's opponent-pattern pass fires and `decisiveLine.owner` flips to `"opponent"`, populating the
completingCell. eval-46/eval-15 are null only because their opponent win is a deep zugzwang that never
surfaces as a near-term on-board pattern.

## Case facts
- movestring `341302131131644152` (18 discs), Green (P1) to move. severity 7, category immediate_threat.
- Pre-move per-col solver scores (0-idx): `[-12, --, 12, -12, -12, 12, -12]`.
- playedCol **0** → score **-12 (LOSS)**; bestCol **2** → score **+12 (WIN)**. FLIP win→loss, large margins. Confirmed.
- Pre-move board already shows TWO gravity-top Gray major threats `<*>` at **c3r3** and **c6r2** (a standing double_threat).

## Direction = missed_own (forced immediate win forgone)
Gray already held a DOUBLE threat (c3r3 AND c6r2) BEFORE Green's move — Green could not block both.
Green's only saving move was its OWN immediate win. bestCol 2 lands **c3r3** for Green and completes
the diagonal **c1r1-c2r2-c3r3-c4r4** → Green wins immediately (`[GAME OVER]`, confirmed by visualize).
Elegantly, that same cell c3r3 is also one of Gray's two winning cells, so Green's win doubles as a
block — but the second Gray threat c6r2 means only winning (not blocking) survives. Playing col0 does
NOT create a new opponent win; it forgoes the forced immediate win, after which Gray's pre-existing
double threat converts on the very next ply. So: **missed_own**, fast.

## Register = immediate (FAST — contrast eval-46's slow_zugzwang)
`forward_distance.mjs 341302131131644152 0 2`: col0 forwardPlies=**1 → immediate**; col2 forwardPlies=1 → immediate.
(Live `outcomeTiming.pliesToEnd` best=12/played=12 are the inverted-bug values; |score|=12 ⇒ resolves at once.)

## Opponent decisive cell — re-solve confirmed
- `optimal_line.mjs 3413021311316441520` → terminal **win** for **second (Gray/P2)**, completingCell
  **c3r3**, window **[c5r1, c4r2, c3r3, c2r4]**, completingPly 20 (immediate next move).
- `decisive_check.mjs 3413021311316441520 c3r3` → **DECISIVE** (win completes through candidate under optimal defense).
- c3r3 is gravity-top on the played board (col2 height 2 → next disc lands row3). Plus c6r2 is a second
  immediate Gray win → genuine double_threat (`winningLinesThroughCell = 2` in the vector).

## Routed kind (ACTUAL) = concrete_line
FLIP ladder. parity_control? No — the punishing line is an immediate tactical fork, not a parity/zugzwang
mechanism (case is `losing_either_way`/edgeType `tactical`, not zugzwang). Routes **concrete_line** (matches catalog).

## Hand-built payload — FULLY groundable from the vector
```json
{ "register": "immediate", "kind": "concrete_line",
  "outcomeDelta": { "best": "win", "played": "loss" },
  "line": { "winner": "opponent", "completingCell": "c3r3", "col": 2,
            "winningLines": 2, "realizedOnPly": 1 },
  "betterMoveDoes": "Playing c3r3 (col2) completes your diagonal four c1r1-c2r2-c3r3-c4r4 and wins immediately — register immediate." }
```
Every field has a vector source:
- `line.winner=opponent`, `completingCell=c3r3`, `winningLines=2`, `realizedOnPly=1` ← `decisiveLine.owner="opponent"` + `oppCategoryExamples` double_threat/immediate_threat. **Present, not null.**
- `betterMoveDoes` ← bestCell c3r3 (col2) + Green's immediate win + register. All FV-derivable.

## §14 grader checks (FLIP/concrete_line) — all PASS
- outcomeDelta matches solver (best win / played loss): ✓
- register matches forward bucket (immediate, 1 ply): ✓
- line present on played branch (Gray wins c3r3) / absent on better branch (Green took c3r3 to win itself) / outcome flips: ✓
- completingCell re-solve-confirmed decisive: ✓ (decisive_check DECISIVE; double_threat winningLines=2)
- named cells exist on snapshots: c3r3 reachable immediately on played board; occupied by Green on best board: ✓
- betterMoveDoes asserts no extra mechanism: ✓

## Why this differs from eval-46 (the load-bearing finding)
eval-46: played move → SLOW Gray zugzwang win 15 plies out → opponent win never surfaces as an on-board
pattern → `decisiveLine.owner="player"` (kept the better-branch line), `oppCategoryExamples=[]`,
`decisiveLine.opponent=null` → PAYLOAD_UNGROUNDABLE.
eval-32: opponent win is an immediate on-board **double_threat** (realizedOnPly 1) → opponent-pattern pass
fires → `decisiveLine.owner="opponent"` + populated `oppCategoryExamples` → groundable.
**Determining factor = whether the opponent's decisive win manifests as a near-term on-board pattern
(immediate/forced) vs a deep zugzwang. The opponent-line-absence gap is SLOW-LOSS-specific.**

## Missing signal
None for this case — SUFFICIENT. (The eval-46 fix — populate `decisiveLine.opponent` via an OPTIMAL
re-solve on every FLIP-to-loss — would make the two cases uniform but is unnecessary here, since the fast
on-board path already populates it.)

## Redundancy
- **eval-31** (same game, one ply earlier; 17-disc prefix `34130213113164415`): the MIRROR blunder —
  Gray (P2) to move, col5 (+12 win) vs played col2 (-12 loss), `forward_distance` register **immediate**
  (forwardPlies 2). Same family: fast immediate win→loss flip, missed_own, opponent win surfaces as an
  on-board immediate threat. **eval-32 makes eval-31 redundant** (groundable/SUFFICIENT for the same reason;
  forced_block label is just the opponent-perspective framing of the identical fast tactic).
- More broadly: makes redundant any **fast (immediate/forced_sequence) win→loss concrete_line FLIP** where
  the opponent's punishing win is an on-board immediate/double threat — they will all carry
  `decisiveLine.owner="opponent"` + non-empty `oppCategoryExamples` and be groundable. The
  PAYLOAD_UNGROUNDABLE class is confined to SLOW/deep (zugzwang) win→loss losses (eval-46/eval-15).

## tools_used
visualize_board.sh (pre/played/best); print_lookahead.mjs (depth 20); TOOLS/forward_distance.mjs;
TOOLS/optimal_line.mjs (played branch); TOOLS/decisive_check.mjs (c3r3 → DECISIVE).
## tools_created
none (reused existing).
