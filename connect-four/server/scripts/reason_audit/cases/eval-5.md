# eval-5 — drawing_move, win→draw FLIP (9 discs)

## verdict: SUFFICIENT — but ROUTES TO parity_control, NOT concrete_line

The reason field is groundable and honest from the frozen vector alone. BUT the catalog premise is
wrong: eval-5 is **not** a clean concrete_line baseline. The forgone "win" is a **30-ply slow
zugzwang win via an odd-distance z-threat**, so the FLIP ladder fires **parity_control** (rung 1)
before concrete_line ever gets a chance. The concrete_line rung is **not exercised** by this case.
Good news: parity_control grounds cleanly from the frozen vector with **no deep re-solve** (unlike
eval-6's concrete_line).

## Case facts
- board_state `444423333` (9 discs), move_played col **6** (0-idx, display c7), correct_move col **5** (0-idx, display c6).
- Mover = Gray / P2 (10th disc). pattern_category drawing_move, severity 1.
- Pre-move solver scores (Gray to move): `[-2, 0, 0, 0, 0, +2, 0]` → col5 is the UNIQUE win (+2); played col6 = draw (0). **win→draw FLIP confirmed.**

## register (repaired forward distance)
`forward_distance.mjs 444423333 5 6`:
- col5: score=2, **forwardPlies=30, register=slow_zugzwang**
- col6: draw, no register

The win is NOT immediate/forcing — it's a parity squeeze that resolves near board fill.

## The forgone win is a deep board-fill / parity win
`optimal_line.mjs 4444233335` → terminal **win for Gray at ply 40** (40/42 discs), single winning
window `c6r1·c5r2·c4r3·c3r4` (diagonal), **completingCell c3r4**, winningLines = **1** (single line,
not a fork). This is the same deep-fill shape eval-6 flagged — not a shallow tactical line.

## Does the missed-own win ground from the FROZEN vector (no re-solve)?
`print_lookahead.mjs 444423333 6`:
- `player: { tag: "major_threat_parity", cells: ["c3r4"] }`  ← decisive cell surfaces directly
- `categoryExamples[major_threat_parity]`: `bestNovel: [{cells:["c3r4"], realizedOnPly:2}]`, `playedNovel: []`
- `bestOutcome: win_with_best_play`, `postBlunderOutcome: draw_with_best_play`

So **c3r4 IS in the frozen vector** — the cell identity is groundable WITHOUT re-solve (contrast
eval-6, where the decisive cell only surfaced via board-fill re-solve). ⚠️ But `realizedOnPly:2` and
`outcomeTiming.best.pliesToEnd:2` are the **inverted-bug values (=|score|)** — they claim ply 2 when
the real completion is ply 40 (30 forward). A coach trusting that number would badly mis-time the win.
parity_control's payload does not use it (register comes from repaired forward distance), so no
functional harm here — but it would poison a concrete_line `realizedOnPly`.

## Same-perspective parity pass (routing decision)
`parity_cells.mjs <board> 2` (Gray):
- best `4444233335` → `zThreatCells: ["c3r4"]`
- played `4444233336` → `zThreatCells: []`
- pre-move → `[]` (the move creates the threat)

NON-EMPTY kept set on best, empty on played, **controller flips** (Gray controls the odd-distance
threat on best; nobody on played). → **parity_control fires** (ladder rung 1, before concrete_line).
Confirmed on the board: best board's major-threat list shows `col3 row4 (Gy)` = c3r4 owned by Gray.

## Hand-built reason payload (ACTUAL routed kind = parity_control)
```json
{
  "register": "slow_zugzwang",
  "kind": "parity_control",
  "outcomeDelta": { "best": "win", "played": "draw" },
  "betterMoveDoes": "Playing c6 keeps Gray's odd-row z-threat at c3r4, turning a draw into a win.",
  "control": {
    "controller": "player",
    "mechanism": "z_threat",
    "keptCells": ["c3r4"],
    "surrenderedCells": ["c3r4"]
  }
}
```

## §14 checks (parity_control branch)
- keptCells/surrenderedCells NON-EMPTY: keptCells `[c3r4]` ✓
- controller flips (same-perspective pass): Gray→nobody ✓
- outcome flips: win→draw ✓
- named cell c3r4 exists on best snapshot ✓ (it's the Gray major threat there)
- register matches forward bucket: 30 plies → slow_zugzwang ✓
- betterMoveDoes asserts only z_threat + outcome, no extra mechanism ✓
PASS on all parity_control checks.

## Harder question — does it honestly explain the blunder?
Yes. "Your move only draws; the winning move keeps an odd-row (parity) threat at c3r4 that Green can't
defuse, and you'd win as the board fills" is the honest mechanism — the win is a zugzwang squeeze, not
a short forcing line. Framing it as a concrete_line ("forced line to c3r4") would MISLEAD a coach into
implying a short combination when the completion is 30 plies away. parity_control + slow_zugzwang is
the correct, honest framing. winningLines=1 (single line, not a fork) — fine for parity_control, which
makes no fork claim.

## missing_signal / finding
Not a field gap — the reason field works. The gap is in the **audit catalog's routing guess**:
shallow-disc (9) drawing_move win→draw flips are NOT automatically concrete_line baselines. When the
win is an odd-distance z-threat, parity_control (rung 1) legitimately pre-empts concrete_line. The
**true concrete_line baseline must be a win with a SHORT forward distance** (immediate/forced_sequence
register), where the win is a real forcing line and the z-threat parity pass returns empty. Also
re-confirms the inverted `realizedOnPly`/`pliesToEnd` bug: any concrete_line payload that copies
`realizedOnPly` from the frozen vector would emit a false ply (2 vs true 40) — concrete_line MUST
recompute realizedOnPly from a re-solve, never trust the vector field.

## tools_used
visualize_board.sh; forward_distance.mjs; optimal_line.mjs; print_lookahead.mjs; parity_cells.mjs; inline solver scores.
## tools_created
none (all existing tools sufficed).

## one-line lesson
eval-5 is a parity_control (odd-distance z-threat, 30-ply zugzwang) win→draw, NOT a concrete_line
baseline — parity_control grounds fully from the frozen vector with no re-solve; likely makes the
other shallow drawing_move win→draws (eval-2/37/40) parity_control too, so a real concrete_line
baseline (short-forward-distance forcing win, empty parity pass) still needs finding.
