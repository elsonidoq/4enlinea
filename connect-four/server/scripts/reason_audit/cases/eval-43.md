# eval-43 — conversion (SAME-floor BOTH-WIN)

## verdict: INSUFFICIENT
Payload is fully groundable and passes every §14 conversion check, but the `conversion`
reason does **not honestly explain a blunder** — it explains a *preference between two
winning moves*. Under optimal play the played move is not a mistake at all. The "fewer
chances to throw it away" rationale rests on a player-fallibility assumption that **no
vector field expresses**. This is the strongest possible conversion case (max ply gap +
extra winning windows) and it still fails the honesty test.

## case facts
- board_state `4122251554142` (13 discs → P2/Gray to move), move_played col **6** (0-idx),
  correct_move col **4** (0-idx). pattern_category `forced_win`, severity 3.
- Pre-move per-col solver scores (Gray to move): `[3,3,3,-3,13,3,3]`.
  - best col4 → score **13** (win), played col6 → score **3** (win). **SAME-floor BOTH-WIN.**
- winnerSide = **Gray (P2)** — the player who moves. Both moves force the Gray win.

## routed kind (ACTUAL): conversion — matches catalog
Ladder: outcomeDelta.best = outcomeDelta.played = `win` → SAME-floor → both win → **conversion**.

## hand-built reason payload
```json
{
  "register": "forced_sequence",          // best move's repaired forward bucket (see note)
  "kind": "conversion",
  "outcomeDelta": { "best": "win", "played": "win" },
  "betterMoveDoes": "Playing c5r4 wins the forced sequence sooner than c7r1.",
  "conversion": {
    "winnerSide": "Gray",
    "speed": "faster",
    "extraLines": "some"
  }
}
```

## evidence
- `forward_distance.mjs 4122251554142 4 6`:
  - col4: score=13, forwardPlies=**4**, register=**forced_sequence**
  - col6: score=3,  forwardPlies=**24**, register=**slow_zugzwang**
  - → speed = **faster** (4 < 24, strictly). Gap = **20 plies** — the score 13-vs-3 gap is real.
- extraLines via checkWin/major-threat geometry (visualize_board on both branch boards,
  Green to move, both all-negative = Gray wins):
  - BEST board (`...4`): Gray major threats = **col4r2, col4r3, col5r5** → **3 windows**.
  - PLAYED board (`...6`): Gray major threats = **col4r2, col4r4** → **2 windows**.
  - → best opens strictly more winning windows ⇒ extraLines = **some**.
- Both branch boards have every column negative for the opponent-to-move ⇒ both confirmed wins.

## §14 conversion checks — ALL PASS
- named cells exist on snapshots: yes (c5r4 best-move cell, c7r1 played-move cell).
- outcomeDelta matches solver: both win. yes.
- speed matches repaired timing (faster ⇒ best distance strictly smaller): 4 < 24. yes.
- extraLines matches checkWin geometry (some ⇒ strictly more windows): 3 > 2. yes.
- betterMoveDoes asserts no extra mechanism: yes (only names cells + "sooner").

Register note: the two moves fall in DIFFERENT forward buckets (best=forced_sequence,
played=slow_zugzwang). The single `register` field is ambiguous in conversion cases — it
describes the better line, but the played line's "slowness" is the entire point of the
reason and is invisible in that one field. Minor groundability wrinkle, not the core failure.

## THE HARDER QUESTION — why this is INSUFFICIENT despite passing §14
A both-win move is **still a forced win**. Objectively, col6 does NOT throw the win away —
it converts it in 24 plies instead of 4. The "blunder" exists ONLY in the practical sense
that a longer forced line gives a fallible player more chances to slip. But:

1. **No field expresses fallibility or conversion difficulty.** speed=faster and
   extraLines=some quantify how much *cleaner* the better move is, but nothing says the
   longer line is actually *hard* to hold, contains a trap, or has a narrow defense. A
   24-ply grind with a permanent unstoppable Gray threat (col4 zugzwang) is trivially
   convertible — "fewer chances to throw it away" is then literally false: there are no
   realistic chances to throw it away. The reason asserts risk the vector cannot see.

2. **Conversion explains a preference, not a mistake.** A flip reason (win→draw/loss) names
   a real objective change. Conversion names two winning moves and calls the slower one a
   "blunder." A coach reading this could tell the student "you made a mistake, you should
   have played c5r4" — overstating the error, when the truth is "both win; c5r4 is cleaner."
   That is exactly the mislead in question 3: conversion risks OVERSTATING the error.

3. **Severity is a conversion-SPEED measure here, not an error measure.** severity 3 comes
   from the score delta (13−3=10 = plies-to-win), not from any outcome change. The reason
   should carry that framing ("both win; preference") so a coach does not present a
   harmless slower win as a thrown-away win. As designed, it does not.

Because eval-43 is the **strongest** conversion case in the catalog (largest ply gap, AND
strictly more winning windows) and it still cannot honestly justify the "blunder" label,
the failure is **structural to the conversion kind**, not specific to this board.

## missing signal + proposal
- **Missing:** a conversion-DIFFICULTY / fallibility-risk signal — e.g. number of Gray moves
  on the played line that are *uniquely* winning (sole-winning-move count), or defensive
  branching factor, or "is the win self-maintaining (standing zugzwang threat) vs requires
  precise play." Without it, conversion cannot distinguish a harmless slower win from a
  genuinely risky one, and "fewer chances to throw it away" is ungrounded rhetoric.
- **Proposal:** (a) add `convertibilityRisk: trivial|moderate|sharp` derived from a
  sole-winning-move count along the optimal played line; emit conversion as a *preference*
  (not a blunder) when risk=trivial. (b) Reframe `betterMoveDoes` for conversion to
  explicitly say "both moves win" so a coach cannot overstate. (c) Carry the both-win flag /
  speed gap into the register so slowness is visible.

## tools_used
- `visualize_board.sh` (pre-move, best `...4`, played `...6`)
- `TOOLS/forward_distance.mjs 4122251554142 4 6`
- `eval_set_large_3.json` (case data)

## tools_created
none (existing tools sufficient)

## lesson (handoff log)
eval-43: the conversion kind passes §14 mechanically but explains a *preference*, not a
mistake — a both-win move is still a forced win, and "fewer chances to throw it away" needs
a conversion-difficulty/fallibility field the vector lacks. This is STRUCTURAL to conversion.
eval-43 is the strongest conversion case (ply gap 4→24 + extra winning windows) and still
fails, so it likely makes the other both-win conversion cases **redundant on the honesty
axis**: eval-20, eval-36, eval-39, eval-50, eval-53, eval-57, eval-59, eval-63, eval-65.
Re-examine those only for groundability edge cases — specifically any with speed="same"
(payload degenerates to extraLines-only) or extraLines="none" (payload degenerates to
speed-only), which would be even weaker than eval-43, not stronger.
