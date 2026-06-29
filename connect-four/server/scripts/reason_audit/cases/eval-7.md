# eval-7 — verdict: ROUTING_GAP (resistance payload is an evasion here)

**verdict: ROUTING_GAP / PAYLOAD_UNGROUNDABLE**

The ladder routes this case to SAME-floor → `resistance`, but the actual blunder is a
**defensive miss that loses IMMEDIATELY** to a pre-existing opponent threat. The `resistance`
payload `{loserSide, speed, punishable}` has no cell field and asserts no block, so it cannot
express the one fact that explains the mistake ("col7 blocks Gray's immediate win at c7r4; col6
lets Gray win on the very next move"). The reason collapses to "loses slower," which is an
evasion — and `punishable=win` is a phantom mistake-mode artifact that actively misleads.

## Case facts
- board_state `44442333364353565516` (20 discs), Green (P1, mover) to move.
- move_played col 5 (display col6) — score **-11**. correct_move col 6 (display col7) — score **-1**.
- All legal columns lose for Green ⇒ **SAME-floor, BOTH-LOSE (`losing_either_way`)**. No outcome flip.
- pattern_category `forced_block`, severity 3.

## Routed kind (ACTUAL): resistance
Ladder: best=loss = played=loss → SAME-floor → both lose → `resistance`. Confirmed; matches catalog.

Hand-built payload from real evidence:
```json
{
  "register": "immediate",
  "kind": "resistance",
  "outcomeDelta": { "best": "loss", "played": "loss" },
  "resistance": { "loserSide": "player", "speed": "slower", "punishable": "win" }
}
```
- `loserSide=player` — Green (the mover/blunderer) loses.
- `speed=slower` — better move's repaired forward distance (21) strictly > played (1). PASS.
- `punishable=win` — `reachability.played.ceiling="win"`. PASS mechanically.

Note the **register conflict**: the §14 register is computed from the REPAIRED forward distance,
which for the *played* move is **1 ply ⇒ immediate**. So this is a same-floor `resistance` whose
played branch is `register=immediate`. That combination is itself a smell: resistance ("lasts
longer, more chances to slip") is being told about a move that loses on the next ply.

## Evidence (commands + key outputs)
- `forward_distance.mjs 44442333364353565516 6 5`:
  - col6 (best/block): score=-1, **forwardPlies=21, register=slow_zugzwang**
  - col5 (played): score=-11, **forwardPlies=1, register=immediate**
  - ⇒ best LASTS LONGER by ~20 plies (speed=slower confirmed; large gap).
- `print_lookahead.mjs 44442333364353565516 5`:
  - case `losing_either_way`; opponent tag `immediate_threat` cells `["c7r4"]`.
  - `decisiveLine`: owner=opponent, completingCell **c7r4**, winningLinesThroughCell=1.
  - `reachability.played` = {floor:loss, **ceiling:win**}; `reachability.best` = {floor:loss, ceiling:win}.
  - (live `outcomeTiming.pliesToEnd` is the INVERTED buggy field — ignored in favor of forward_distance.)
- Re-solve confirm of c7r4: played board `444423333643535655165` (Gray to move) → Gray col7 →
  `4444233336435356551656` = **GAME OVER, Gray wins**. c7r4 is the genuine decisive cell, not a
  blockable intermediate threat. The pre-existing Gy major threat is visible on the pre-move board
  (`col7 row4 (Gy) [GT]`, gravity-top, immediately playable). The better move col7 occupies/blocks it.

## The harder question — does the payload honestly explain the mistake?
**No.** Two failures:

1. **The honest reason is concrete and same-floor blind.** col6 is a blunder because it ignores a
   LIVE immediate winning threat — Gray plays c7r4 and wins next move. col7 is correct because it
   is the unique block of that threat. This is a defensive concrete line, fully grounded in the
   vector (`opponent.immediate_threat.cells=[c7r4]`, played `register=immediate`, re-solve-confirmed
   decisive). The `resistance` schema `{loserSide, speed, punishable}` has **no cell slot** and the
   `betterMoveDoes` template would name bestCell + payload cells — but the payload carries none. So
   the coach is told "col7 lasts longer (punishable=win)" and NEVER told about the block at c7r4.
   The vector HAS the explaining fact; the routed payload THROWS IT AWAY.

2. **`punishable=win` is a misleading phantom.** ceiling=win comes from a mistake-mode line that
   requires Gray to slip; under optimal play Green loses either way. Telling the coach "your better
   move was punishable=win" implies a real winning chance that does not exist, while hiding that the
   played move loses on ply 1. When ceiling=win the reader must trust an unexposed (and here phantom)
   search; `reachability.played.ceiling` alone is NOT enough.

So even though every §14 mechanical check passes, the payload does not explain the mistake — it
evades it. This is the failure mode the brief warns about ("passes the mechanical check but doesn't
actually explain").

## missing_signal / proposal
The vector + ladder lack a way to route an **immediate-loss defensive miss inside a both-lose
position** to a concrete blocking line. Concrete proposal:
- **Routing fix:** before same-floor → resistance, check the played branch register. If the played
  move is `register=immediate` AND there is a re-solve-confirmed opponent `immediate_threat` cell
  that the better move occupies/blocks, route to a **defensive concrete-line** reason (e.g. extend
  `concrete_line`/a new `block` kind to fire on SAME-floor when the played move drops a forced
  block). Payload must carry the blocked cell (c7r4) and "betterMoveBlocks" semantics.
- **Minimum if routing is frozen:** give `resistance` an optional `decisiveCell` + a
  `playedRegister` field so the immediate-loss case can name c7r4 and say "loses next move," instead
  of the bare "loses slower." And suppress/flag `punishable=win` when it is a mistake-mode phantom
  (ceiling derived only from opponent error) so it is not read as a real chance.

## tools_used
- `visualize_board.sh`, `forward_distance.mjs`, `print_lookahead.mjs`, inline re-solve via visualize GAME OVER.
## tools_created
- none (existing tools sufficed).

## one-line lesson (handoff log)
eval-7 = a forced_block/`losing_either_way` where the played move loses on ply 1 to an unblocked
opponent immediate_threat (c7r4); SAME-floor→resistance misroutes it and the `{loserSide,speed,
punishable}` payload evades the real "fails to block" reason — **this likely makes redundant any
OTHER listed resistance case that is itself a forced_block / immediate-loss defensive miss (check
eval-11/12/14/38/42/52/55/61 for played register=immediate + a confirmed opponent immediate_threat;
those share this exact gap). Resistance cases where BOTH branches are slow_zugzwang (no immediate
threat) are a DIFFERENT subspecies and are NOT covered by this finding.**
