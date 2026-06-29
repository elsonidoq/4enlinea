# eval-8 — resistance honesty gap (lead probe)

## verdict: INSUFFICIENT
The resistance payload is fully groundable and PASSES every §14 mechanical check, yet it does **not**
honestly explain a mistake. The correct product answer is **OMIT**. eval-8 is the canonical "lost
opening, no line" case: P2 (Gray) is theoretically lost the instant it must reply to a center opening,
so *every* reply loses and the "blunder" is severity 0. The reason reduces to "loses ~2 plies slower,
still winnable if the opponent slips" — vacuous coaching on an already-lost position.

## case facts
- pre-move board `"3"` = single center disc (c4r1, Green/P1). 1 disc ⇒ **Gray/P2 to move**.
- played col 5 (0-idx) → board `"35"`, disc at c6r1. best col 3 (0-idx) → board `"33"`, disc at c4r2.
- pattern_category `suboptimal_move`, **severity 0**, is_sparse, threat_cells `[]`.
- pre-move per-col scores `[-4,-2,-2,-1,-2,-2,-4]` (cols 1–7): **every Gray reply loses.** Best = col3 (-1,
  slowest loss); played = col5 (-2). SAME-floor BOTH-LOSE.

## routed kind (ACTUAL)
outcomeDelta {best: loss, played: loss} ⇒ SAME-floor ⇒ **resistance** (matches catalog). Confirmed.

## hand-built reason payload (from real evidence)
```json
{
  "register": "slow_zugzwang",
  "kind": "resistance",
  "outcomeDelta": { "best": "loss", "played": "loss" },
  "betterMoveDoes": "Best move c4r2 loses more slowly than the played c6r1; both lose.",
  "payload": {
    "loserSide": "P2",
    "speed": "slower",
    "punishable": "win"
  }
}
```
- `speed="slower"`: repaired forward distance best=40 plies, played=38 plies → strictly longer by **2 plies**,
  both `register=slow_zugzwang` (loss at board-fill; 42 max).
- `punishable="win"` = `reachability.played.ceiling`. **NOTE: ceiling is `win`, not `loss`** — the brief's
  premise ("ceiling=loss → no punishable line") is empirically wrong here.

## §14 checks — ALL PASS
- outcomeDelta matches solver (both loss) ✓
- register matches forward-ply bucket (slow_zugzwang) ✓
- speed matches repaired timing: slower ⇒ better distance strictly larger, 40>38 ✓
- punishable matches reachability.played.ceiling = win ✓
- betterMoveDoes asserts no extra mechanism ✓

## the honesty gap (why INSUFFICIENT despite passing)
1. **`punishable="win"` is false reassurance, not signal.** ceiling=win is a near-opening reachability
   artifact: from a 2-disc board *any* move has a winnable ceiling against a fallible opponent.
   `reachability.best.ceiling` is **also win** — the field does not discriminate best from played. Surfacing
   it tells a coach "you can still win!" on a theoretically lost position.
2. **`speed="slower"` is noise.** A 2-ply difference at board-fill (lose on ply ~41 vs ~39). "Play col 4 so
   you lose slightly later" is not a coachable mistake.
3. **severity 0 + lost opening.** Gray was lost before it moved. There is no mistake to explain — the move
   merely picks among losing replies to a position theory already decided.

So the payload is mechanically valid and coaching-vacuous simultaneously: the canonical resistance-honesty
failure. Right answer = OMIT.

## missing_signal + proposal
The vector cannot tell "this move lost the game" from "the position was already lost." Proposals:
- **Add `preMoveFloor`** = optimal-play outcome of the position *before* the move, for the mover. If
  `preMoveFloor=loss` (mover already lost), a sev-0 both-lose resistance reason is vacuous → **OMIT**.
  Equivalently, route this register as `lost_or_won_opening` and suppress resistance for it.
- **Gate `punishable`** on a DIFF vs `reachability.best.ceiling`. ceiling=win should only surface when it
  exceeds best's ceiling (played uniquely preserves chances). Here best.ceiling=win too ⇒ non-discriminating
  ⇒ drop it.
- **Register-mapping gap:** forward_distance buckets this as `slow_zugzwang`, but semantically it is
  `lost_or_won_opening`. The bucket tool keys only on forward plies and cannot distinguish an opening-determined
  loss from genuine endgame zugzwang. A `lost_or_won_opening` detector (low disc count + pre-move floor decided)
  should take precedence.

## redundancy
eval-16, eval-30, eval-33 are the **identical** pre-move board `"3"`, same best=col3, differing only in the
losing reply (played cols 2/4/1, all score -2 vs best -1). They are the same position; eval-8 makes them
**fully redundant** — same verdict, payload, and OMIT recommendation.
eval-19 (5 discs), eval-23 (18 discs), eval-44 (11 discs) are deeper both-lose sev-0 suboptimal cases in the
same resistance-honesty class; eval-8 is the lead probe. They warrant a spot-check (deeper boards may have a
real speed delta or a discriminating ceiling) but very likely share the OMIT verdict.

## tools used
- `./visualize_board.sh 3 | 33 | 35`
- `node server/scripts/reason_audit/TOOLS/forward_distance.mjs 3 3 5`
- `node server/scripts/print_lookahead.mjs 3 5`
- direct read of eval_set_large_3.json for the 7 sibling ids
## tools created: none (existing tools sufficient)
```
