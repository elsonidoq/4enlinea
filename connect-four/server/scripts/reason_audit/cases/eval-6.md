# eval-6 audit — undercut / slow_zugzwang ACID TEST

## verdict: SUFFICIENT (with a flagged coaching-depth caveat — not a blocker)

The designed `reason` field (concrete_line, FLIP branch) CAN explain why col1 is a blunder,
and the payload is fully groundable + the completingCell is re-solve-confirmed decisive.
The only gap is a *coaching-depth* one (the parity "why col1≠col3" is intentionally out of
scope of the payload), which the epic's design deliberately excludes — so it is a noted
caveat, not a sufficiency failure.

## Setup (verified)
- pre-move `444423333643535655`, 18 discs, **Green/P1 to move**. Movestrings here are **0-indexed**
  (digit counts match column heights: 2→1,3→6,4→5,5→4,6→2). Played 0-idx col1 = digit `1` = display col2;
  best 0-idx col2 = digit `2` = display col3.
- per-col solver scores (Green's perspective): `[-11, -1, 0, -1000, -11, 0, -11]`
  - **played col1 = -1 → loss**, slowest magnitude (|score|=1 ≈ board-fill)
  - **best col2 = 0 → draw**
- outcomeDelta: best=draw, played=loss → **draw→loss FLIP → branch A → concrete_line**. ✓ matches epic.
- forward_distance: played col1 `forwardPlies=23  register=slow_zugzwang`; best col2 `draw_no_register`. ✓

## Decisive line (optimal_line.mjs, both sides solver-optimal from played board)
- terminal **win for Gray/P2 (opponent)** at **completingPly 42** (board-fill).
- **completingCell `c7r6`**, winning window = diagonal **`c4r3 c5r4 c6r5 c7r6`** (winningLines=1).
- Decisiveness: it is the **terminal board-fill cell** AND **completes under optimal defense for
  both sides** → satisfies two of the epic's three completingCell criteria. Unblockable (last cell). ✓
- forward distance 23 = 42 − 19(played-branch discs). Epic's documented "realizedOnPly:23" = forward distance.

## Hand-built `reason` payload
```json
{
  "register": "slow_zugzwang",
  "kind": "concrete_line",
  "outcomeDelta": { "best": "draw", "played": "loss" },
  "betterMoveDoes": "Playing c3 (col2) holds the draw.",
  "line": {
    "winner": "opponent",
    "completingCell": "c7r6",
    "col": 6,
    "winningLines": ["c4r3-c5r4-c6r5-c7r6"],
    "realizedOnPly": 42
  }
}
```
- `betterMoveDoes` names bestCell (c3 / display col3) + outcome word "draw" only — asserts NO
  mechanism absent from payload. ✓ §14.

## §14 grader checks
- every named cell exists on its snapshot board ✓ (c4r3/c5r4/c6r5/c7r6 occupied at terminal)
- outcomeDelta matches solver (draw vs loss) ✓
- register matches forward bucket (fwd=23 → slow_zugzwang) ✓
- line present on played branch, absent on better branch (best draws, no Gray win) ✓
- completingCell re-solve-confirmed decisive (terminal board-fill, optimal-defense) ✓
- betterMoveDoes asserts no extra mechanism ✓
→ PASSES all §14 checks.

## Harder question: does it actually explain the mistake?
- WHAT it explains (grounded, decisive): col1 lets Gray win on the very last move via the
  `c4r3-c5r4-c6r5-c7r6` diagonal at board-fill; col3 holds the draw. That is a complete,
  verifiable, decisive line-level WHY.
- WHAT it omits (by design): the *parity/tempo* reason **why col1 loses but col3 draws**. c7r6 is
  an even (display row6 = 0-idx row5) cell → Gray/P2's parity. Green's col1 concedes the tempo so the
  zugzwang resolves with Gray taking the last cell. The concrete_line payload carries NO parity
  mechanism, and the parity detectors are silent here (assumed per epic; routing is FLIP-first so
  parity_control is never reached regardless).
- **Caveat / missing_signal:** the decisive diagonal is **not surfaced in the frozen lookahead
  vector** — its categoryExamples surface only minor_threat c7r5/c7r6 (realizedOnPly 10) and an
  undercut at c3, never the c4–c7 winning window. Building `winningLines` REQUIRED the prescribed
  re-solve (optimal_line.mjs). The epic explicitly permits this (completingCell "re-solve-confirmed";
  FV-grounding correctness-over-speed allows extra solver passes), so the payload is groundable — but
  a builder that trusts the raw vector alone would emit the WRONG cell (c7r6 as a *minor_threat*, or
  nothing). The re-solve step is load-bearing and must be mandatory for slow_zugzwang concrete_lines.

## tools_used
- visualize_board.sh (pre/best/played)
- forward_distance.mjs 444423333643535655 1 2
- print_lookahead.mjs 444423333643535655 1 26
## tools_created
- reason_audit/TOOLS/optimal_line.mjs — plays solver-optimal line both sides to terminal, reports
  completingCell + winning windows. Reusable for every slow_zugzwang / board-fill case.

## one-line lesson
slow_zugzwang concrete_line is SUFFICIENT only because the epic mandates a re-solve to find the
terminal completing cell (the frozen vector mislabels it minor_threat); this likely covers the other
board-fill/zugzwang cases — they reduce to "re-solve to terminal, emit the diagonal, register=slow".
