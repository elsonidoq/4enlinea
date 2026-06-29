# eval-0 — verdict: SUFFICIENT (positional / center_control), with two findings

**Verdict: SUFFICIENT** — on the EMPTY board the `positional` payload `center_control` is the only
honest reason and it is correctly grounded and grader-verifiable. But the audit surfaces two real gaps
the grader/epic must close (register mislabel + centrality-direction check), and proves center_control
is NOT generalizable across the positional/drawing_move class.

## Case
- board_state `""` (empty), move_played col **4**, correct_move col **3**, pattern_category `drawing_move`, is_sparse, severity 0.
- Empty-board solver scores (P1/Green to move): `[-2, -1, 0, 1, 0, -1, -2]`.
  - col **3** (0-idx, the TRUE center) = **+1 → WIN** (Connect-4's unique winning first move).
  - col **4** (0-idx, off-center) = **0 → DRAW**.
- Branch: **FLIP**, outcomeDelta `{ best: win, played: draw }`. Confirmed by re-solving the resulting
  boards: after `3` Gray's best is −1 (Green wins); after `4` Gray's best is 0 (draw).

## Routed kind (ACTUAL)
Ladder on a FLIP: parity_control → concrete_line → positional.
- parity_control: no detector cells on an empty board (no structure). FAILS.
- concrete_line: no completing/decisive cell exists 41 plies from the end. FAILS.
- positional: best cell is strictly MORE central than played cell, solver prefers it. **FIRES.**

## Hand-built `reason` payload
```json
{
  "register": "lost_or_won_opening",
  "kind": "positional",
  "outcomeDelta": { "best": "win", "played": "draw" },
  "betterMoveDoes": "Playing c4r1 keeps the win that c5r1 lets slip to a draw.",
  "principle": {
    "name": "center_control",
    "bestCells": ["c4r1"],
    "playedCells": ["c5r1"]
  }
}
```
- `bestCells` = col3 (0-idx) → display col4, bottom row → **c4r1** (board center column).
- `playedCells` = col4 (0-idx) → display col5, bottom row → **c5r1** (one column off-center).
- Both cells exist on their snapshot boards; outcomeDelta matches solver; betterMoveDoes asserts NO
  mechanism (no fork/parity claim) — compliant.

## §14 positional checks
- named principle holds on solver: YES — c4r1 is the exact center (col distance 0); c5r1 is distance 1.
  Center is strictly more central AND solver-better (win vs draw). ✔
- differs between the two boards: YES — best occupies center, played does not. ✔

## register (FINDING 1)
`forward_distance.mjs "" 3 4` → col3 forwardPlies **41**, col4 null. The tool buckets 41 (near fill) as
**`slow_zugzwang`** — but on an EMPTY board there is no zugzwang/parity mechanism. The honest register is
**`lost_or_won_opening`**: the game is decided on move 1, resolution is just 41 plies away under optimal
play. Distance-only bucketing mislabels opening decisions as zugzwang and falsely implies a parity
mechanism. **Proposal:** register must be phase-aware — `currentDiscs ≈ 0` (opening) overrides the
distance bucket to `lost_or_won_opening`, regardless of forward distance.

## The harder question — is center_control genuine or tautological?
On the EMPTY board, center_control is genuine and is the ONLY altitude available: there is no line, no
parity structure, no threat. It is also a real Connect-4 principle — col 3 participates in the most
four-windows (vertical + 3 horizontals + both diagonals), which is *why* the first-player center move is
the unique theoretical win. So the payload does explain the mistake to a coach: "take center on move 1;
it's the only first move that wins."

BUT the *grounding the vector provides is correlational* — "more central + solver prefers it" — not the
line-count mechanism. That makes center_control near-tautological **off** the empty board, where it can
fabricate. Proof from the sibling family:

- **eval-24** (`333332562100`, played col4, correct **col0**, sparse drawing_move FLIP): the best move is
  the **edge** (col0), the LEAST central column. center_control would assert "bestCell more central" —
  **false**. If the ladder routes a sparse FLIP to positional whenever detectors find no tactic and emits
  center_control, eval-24 **fabricates**. The §14 check as worded ("principle holds AND *differs*") is too
  weak: "differs" passes eval-24. **FINDING 2 — proposal:** the positional check must verify centrality
  **direction** (bestCell strictly more central than playedCell), not mere difference; otherwise OMIT.
  This guard also implies positional must be the LAST rung and gated to genuinely featureless boards.

## Redundancy
- **eval-21** (`""`, played col2, correct col3): IDENTICAL structure — empty board, center vs off-center,
  win→draw FLIP, center_control with bestCells `[c4r1]`, playedCells `[c3r1]`. **Fully redundant with
  eval-0.** No separate analysis needed beyond swapping the played cell.
- **eval-2 / eval-24 / eval-37 / eval-40** (drawing_move win→draw family): NOT redundant. None has the
  best move at center (eval-2 best=col3 but board `444` is not empty; eval-24 best=col0 edge; eval-37
  best=col5; eval-40 best=col1). They need their own analysis (concrete_line / parity / a different
  positional principle / OMIT). eval-24 specifically is the counterexample that must NOT be routed
  center_control.

## tools_used
- `./visualize_board.sh "" / 3 / 4`
- `forward_distance.mjs "" 3 4` (register)
- inline solver re-solve of resulting boards (via visualize scr rows)
## tools_created
- none (reused existing)

## Lesson (handoff log)
eval-0 positional/center_control is SUFFICIENT on the empty board and makes **eval-21 redundant**. Two
guards needed: (1) register must override to `lost_or_won_opening` for opening boards (`currentDiscs≈0`)
instead of distance-bucketing to `slow_zugzwang`; (2) the §14 positional check must verify centrality
DIRECTION, not mere difference — eval-24 (best=edge col0) is the fabrication counterexample. The rest of
the drawing_move win→draw family is NOT redundant.
