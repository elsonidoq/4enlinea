# eval-29 — verdict: PAYLOAD_UNGROUNDABLE

**One-liner:** A 3-disc WIN→LOSS tactical flip whose honest reason is `concrete_line` with
**winner=opponent** (Green builds a horizontal open-three fork c1r1/c5r1, completes c5r1 at ply 7),
but the vector carries `decisiveLine.opponent = null` / `oppCategoryExamples = []` — the opponent's
punishing fork is entirely absent. Same gap as eval-15; the concrete_line payload cannot be built
from the vector. Falling back to `positional` would mislabel a 4-ply forced tactical loss as a
center-control principle.

## Case
- board_state `332` (3 discs). Mover = **Gray (P2)**. move_played `2` (0-idx col2 = display c3),
  correct_move `1` (0-idx col1 = display c2). severity 6. catalog pattern_category `double_threat`,
  `is_sparse:false`.
- Pre-move per-col solver scores (Gray to move): `[-18, 2, -18, -18, 2, -18, -18]`.
  - **best** col1 = +2 **WIN**; **played** col2 = -18 **LOSS** ⇒ **FLIP** (win→loss).

## Forward distance / register
`forward_distance.mjs 332 2 1`:
- col2 (played): score -18, outcome **loss**, forwardPlies **4**, register **forced_sequence**.
- col1 (best): score +2, outcome win, forwardPlies 36, register slow_zugzwang.

The catalog "positional because discs≤6" heuristic is wrong: the loss is a 4-ply forced sequence — tactical.

## The actual mechanism (opponent double_threat)
`optimal_line.mjs 3322` → terminal **win for Green/P1**, completingCell **c5r1**, completingPly 7,
line `p5:Gcol1(s18) p6:gcol0(s-18) p7:Gcol4(s18)`, window `[c2r1,c3r1,c4r1,c5r1]`.

`decisive_check.mjs 3322 c5r1` → `DECISIVE (win completes through candidate under optimal defense)`,
`winnerIsPunisher:true`, `candidateInCompletedWindow:true`.

`visualize 33221` (after Green's fork move) → **two gravity-top major threats: c1r1 (Gn) and c5r1 (Gn)**;
every column scores -18. Gray blocks one end, Green completes the other ⇒ genuine fork, **winningLines=2**.

So Gray's col2 (stacking a wasted disc on its own c3 column) lets Green play c2r1 to make the open
three c2r1-c3r1-c4r1, a horizontal double_threat. Best move col1 (Gy→c2r1) denies the left extension
and wins slowly via a parity threat (c5r4, realizedOnPly 16).

## Honest routed_kind = concrete_line (winner = opponent)
FLIP ladder: parity_control (no — the loss is an immediate horizontal fork, not a parity/zugzwang
controller flip; parity belongs to the BEST line, not the played loss) → **concrete_line** (yes).

Would-be payload (from real evidence):
```json
{
  "register": "forced_sequence",
  "kind": "concrete_line",
  "outcomeDelta": { "best": "win", "played": "loss" },
  "line": {
    "winner": "opponent",
    "completingCell": "c5r1",
    "col": 4,
    "winningLines": 2,
    "realizedOnPly": 5
  },
  "betterMoveDoes": "<bestCell c2r1 / col1, wins, slow_zugzwang; no mechanism named>"
}
```

## Why PAYLOAD_UNGROUNDABLE
`print_lookahead 332 2`(distilled) carries, on the played branch:
- `opponent: null`
- `oppCategoryExamples: []`
- `oppTallyComparison: null`
- `categoryExamples[*].playedNovel` for both major_threat tags = `[]`; the only non-empty playedNovel
  are Gray's own **minor** threats c1r2/c2r2 (plumbing, not the loss mechanism).

The vector instead carries the **player's (Gray's)** BEST-line threats (`major_threat_parity c5r4`,
`major_threat_nonparity c3r3`) — i.e. the win it gave up — not the **opponent's** fork it handed over.
Every field the concrete_line payload needs (completingCell c5r1, col 4, winningLines 2, the
c1r1/c5r1 fork) lives only in a re-solve I had to run; none of it is in the vector. §14 check
"line present on played branch, completingCell re-solve-confirmed decisive" **fails** — there is no
played-branch line to check.

## verdict: PAYLOAD_UNGROUNDABLE
The correct kind (concrete_line, winner=opponent) is unbuildable from the vector. The only groundable
fallback, `positional`, would be a **dishonest mislabel**: it would claim "better move keeps center
control" for what is actually a 4-ply forced loss to a concrete horizontal fork. So this is both a
payload gap AND a latent routing mislabel risk.

## missing_signal
The vector has **no opponent-perspective decisive line for the played branch**. Specifically,
`decisiveLine.opponent` (and `oppCategoryExamples` / `oppTallyComparison`) are null/empty whenever the
played move LOSES — the engine only collects novel opportunities from the player's perspective.

**Proposal:** when `postBlunderOutcome = loss_with_best_play`, run the same novel-opportunity /
decisive-cell collection from the **opponent's** perspective on the played board (mistake-mode is a
phantom here — use the OPTIMAL punishing line, as `optimal_line.mjs`/`decisive_check.mjs` already do)
and populate `decisiveLine.opponent = { completingCell, col, winningLines, realizedOnPly }`. This is the
exact field the concrete_line FLIP/winner=opponent payload reads. Without it, every WIN→LOSS flip whose
loss mechanism is the opponent's tactic (not the player's surrendered threat) is ungroundable.

## tools_used
visualize_board.sh; forward_distance.mjs; print_lookahead.mjs; optimal_line.mjs; decisive_check.mjs.
## tools_created
none (reused existing).

## Lesson for handoff log
WIN→LOSS flips where the loss mechanism is the **opponent's** fast tactic share one gap:
`decisiveLine.opponent` is null, so concrete_line/winner=opponent is ungroundable (eval-15, eval-29,
and almost certainly **eval-35** — 4-disc double_threat win→loss sev6 — are the same class; eval-35 is
likely redundant). Fix is one shared field (opponent-perspective decisive line on losing played
branches), not per-case.
