# eval-42 — the resistance flagship: thesis TRUE, payload INSUFFICIENT

## verdict: INSUFFICIENT  →  Does resistance honestly explain eval-42? **NO (as specified).**

This is the epic's named "punish line in reach" case and it is the ONE position in the set where the
resistance *thesis* ("better move lasts longer ⇒ more chances for the opponent to slip") is
**literally, strongly true and re-solve-confirmed**. And yet the resistance **payload** as schema'd
(`{loserSide, speed, punishable}`) is **byte-for-byte identical to eval-8's vacuous payload**
`{loserSide, speed:"slower", punishable:"win"}`. From the payload alone a coach cannot tell the
flagship honest case (25-vs-5 plies, opponent has only 1 safe reply, real forced win on any slip)
from the vacuous lost-opening case (40-vs-38 plies, severity 0, nothing to coach). The honesty of
eval-42 lives entirely in numbers the schema **discards** (the numeric forward-distance gap, the
opponent's safe-reply count, the gravity-top winning cell). So even resistance's best case fails at
the payload level: **resistance has no honest SUCCESS expressible in `{loserSide, speed, punishable}`.**

## case facts
- board_state `412225155414` (12 discs), **Green (P1, mover)** to move. pattern_category `forced_win`, severity 3.
- move_played col **2** (0-idx) = display **col3** → score **-13** (loss).
- correct_move col **1** (0-idx) = display **col2** → score **-3** (loss).
- pre-move per-col scores (Green): `[-13, -3, -13, -15, -3, -13, -13]`. Every column loses ⇒
  **SAME-floor BOTH-LOSE** (`losing_either_way`). Two equal-best moves exist (idx1 and idx4, both -3);
  dataset best = idx1. No outcome flip.

## routed kind (ACTUAL): resistance
best=loss = played=loss ⇒ SAME-floor ⇒ both lose ⇒ **resistance**. Matches catalog. Confirmed.

## hand-built payload (from real evidence)
```json
{
  "register": "slow_zugzwang",
  "kind": "resistance",
  "outcomeDelta": { "best": "loss", "played": "loss" },
  "betterMoveDoes": "Best move c2r4 loses more slowly than the played c3r4; both lose.",
  "resistance": { "loserSide": "player", "speed": "slower", "punishable": "win" }
}
```
- `loserSide="player"` — Green (the blunderer/mover) loses.
- `speed="slower"` — repaired forward distance best=**25** plies vs played=**5** plies (register
  slow_zugzwang vs forced_sequence). Strictly larger ⇒ slower. PASS, and a LARGE honest gap.
- `punishable="win"` = `reachability.played.ceiling` = **win**. PASS mechanically — BUT
  `reachability.best.ceiling` is **also win**. The field does **not** discriminate best from played.

## §14 checks — ALL PASS
- outcomeDelta matches solver (both loss) ✓
- register matches forward-ply bucket (best 25 ⇒ slow_zugzwang) ✓
- speed matches repaired timing: slower ⇒ best distance strictly larger, 25 > 5 ✓
- punishable matches `reachability.played.ceiling` = win ✓
- betterMoveDoes asserts no extra mechanism ✓

## the position is genuinely a resistance success (unlike eval-7/eval-8)
Re-solve of the two post-Green boards (c4solver `scr` rows, authoritative):
- **BEST board** `4122251554141` (Gray to move): scores `[-14, 3, -14, -14, -14, -14, -14]`.
  Gray has **exactly ONE** non-losing reply (display col2, +3). The other **6 of 7 columns lose for
  Gray** ⇒ Green wins. Green's move created a **gravity-top major threat `<Gn>` at c2r5**.
  - Re-solve-confirmed punishable line (NOT a mistake-mode phantom): Gray slips with col1 →
    `41222515541410` → Green plays display col2 → `412225155414101` = **GAME OVER, Green wins**
    (vertical col2, rows 2–5). So "punishable" here is a real, immediate, forced win on any slip.
- **PLAYED board** `4122251554142` (Gray to move): scores `[3, 3, 3, -3, 13, 3, 3]`.
  Gray has **6 of 7** safe winning replies; only col4 punishes. Green created **no** threat (only
  Gray's c4r2 major threat stands). Green surrendered the initiative.

So the *position* perfectly fits resistance: best move forces the opponent onto a knife-edge (1 safe
reply, 6 punishable); played move hands the opponent a trivial 6-way win. Forward distance 25 vs 5
mirrors this. **This is the real thing the epic promised** — confirmed.

## why the PAYLOAD is still INSUFFICIENT (the harder question)
1. **Identical to the vacuous case.** eval-8 payload: `{loserSide, speed:"slower", punishable:"win"}`.
   eval-42 payload: `{loserSide, speed:"slower", punishable:"win"}`. **Same enums.** Everything that
   makes eval-42 honest and eval-8 vacuous — the *magnitude* of the speed gap (25-vs-5 here vs
   40-vs-38 there), the opponent **safe-reply count** (1 vs 6), the **severity** (3 vs 0), the
   concrete winning cell (c2r5) — is **outside** the `{loserSide, speed, punishable}` schema. From the
   payload alone the two are indistinguishable, so the payload cannot be said to "explain" eval-42:
   the same bytes "explain" a position with nothing to coach.
2. **`speed` is an enum, not the gap.** The honesty rides on "25 vs 5", but the payload only carries
   the word "slower" — the exact same word eval-8 carries for "40 vs 38". The discriminating number
   is dropped.
3. **`punishable` is non-discriminating (eval-8's exact defect).** `played.ceiling=win` is true
   (col4 punishes after the played move too) but `best.ceiling=win` as well. The field tagged
   "punishable" cannot express that best has **6** punishable replies and played has **1** — which is
   the actual reason the played move is a blunder. It also can't name the gravity-top c2r5 cell that
   IS the punishment, because the resistance schema has **no cell slot** (same structural gap eval-7
   flagged for the block cell).

So: the reason field, AS SPECIFIED, is mechanically valid AND honest-in-direction here — but it is
**underdetermined**: it discards every quantity that separates "real resistance" from "vacuous
resistance". The flagship case proves the SCHEMA insufficient, not the THESIS.

## missing_signal + proposal
To make resistance honestly explanatory (and to make eval-42 distinguishable from eval-8), enrich the
payload:
- **`forwardDistanceGap` (numeric)**, not just the `speed` enum — surface 25 vs 5 (Δ20) so a coach
  sees a real swing, and a small Δ (eval-8's 2) can be gated to OMIT.
- **`opponentSafeReplies` (count)** on the BEST board (1 here) vs the PLAYED board (6 here). This is
  the literal "more chances to slip" quantity; the enum `punishable` is the wrong proxy. Discriminate
  on `bestSafeReplies < playedSafeReplies`.
- **`punishableCell` (re-solve-confirmed)** — c2r5 here — give resistance a cell slot so the
  punishment can be named (the gravity-top forced win), instead of a bare `win` enum.
- **Replace `punishable = reachability.played.ceiling`** (non-discriminating; both win) with a DIFF
  vs `reachability.best.ceiling`, OR drop it for the safe-reply count above. Same fix eval-8 proposed.
- **Severity / preMoveFloor gate** (from eval-8): suppress resistance when severity 0 / lost opening.
  eval-42 (sev 3) survives the gate; eval-8 (sev 0) does not — which is exactly the discrimination the
  current schema cannot make.

## evidence (commands + key outputs)
- `visualize_board.sh 412225155414 | 4122251554142 | 4122251554141` — pre/played/best boards + scr rows.
- `forward_distance.mjs 412225155414 1 2` → col1 (best): score -3, **forwardPlies=25, slow_zugzwang**;
  col2 (played): score -13, **forwardPlies=5, forced_sequence**.
- `print_lookahead.mjs 412225155414 2 22` → case `losing_either_way`; `reachability.best={loss,win}`,
  `reachability.played={loss,win}` (BOTH ceiling=win — non-discriminating);
  `outcomeTiming` best pliesToEnd 3 / played 13 (inverted buggy field — repaired numbers used instead).
- Re-solve confirm of the punishable line: `412225155414101` → **GAME OVER, Green wins** (vertical c2).

## tools_used
`visualize_board.sh`, `forward_distance.mjs`, `print_lookahead.mjs`, inline re-solve via visualize GAME OVER.
## tools_created
none (existing tools sufficed).

## one-line lesson (handoff log)
eval-42 is resistance's BEST possible case — thesis literally true (25-vs-5 plies, opponent left with
1 safe reply of 7, re-solve-confirmed forced win c2r5 on any slip) — yet its `{loserSide, speed,
punishable}` payload is **identical to eval-8's vacuous payload**, because the schema carries enums not
magnitudes and has no cell/safe-reply-count slot. **Conclusion for the audit: resistance has NO honest
SUCCESS at the payload level anywhere in the set — even its flagship needs payload enrichment
(forwardDistanceGap, opponentSafeReplies, punishableCell) to be explanatory. This makes the remaining
both-lose resistance cases (eval-11/12/14/19/23/38/44/52/55/61) very likely redundant: each is either
eval-7's immediate-block misroute or this same enum-underdetermination — none can be a clean resistance
success as the schema stands.**
