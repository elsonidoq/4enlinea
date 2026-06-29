# eval-43 — VERIFY

## verdict: FABRICATION_RISK (predicted `line` over-claims) → golden grain = **not_a_blunder**

The §7 matrix predicts `line` (both-win, better-wins-sooner). The §5 router + §8 gate 6
correctly route this board to **not_a_blunder**. Naming a `line` here would fabricate a
blunder where, under optimal play, none exists.

## case facts
- board_state `4122251554142` (13 discs → P2/Gray to move), move_played col **6** (0-idx),
  correct_move col **4** (0-idx). pattern_category `forced_win`, severity 3.
- Pre-move per-col solver scores (Gray to move): `[3,3,3,-3,13,3,3]`.
  - best col4 → score **13** (win), played col6 → score **3** (win). SAME-floor BOTH-WIN.

## THE KEY FINDING — same standing four wins both branches
- `optimal_line.mjs 41222515541424` (BEST): terminal win, winner Gray/P2,
  **completingCell c4r2**, completingPly 18, window `[c3r2,c4r2,c5r2,c6r2]`.
- `optimal_line.mjs 41222515541426` (PLAYED): terminal win, winner Gray/P2,
  **completingCell c4r2**, completingPly 38, window `[c3r2,c4r2,c5r2,c6r2]` (+`[c4r2..c7r2]`).
- `visualize_board.sh 4122251554142` (PRE-MOVE): `Major threats: col4 row2 (Gy)` — the
  c4r2 four is **already standing before either move**. Neither candidate creates or
  destroys it.
- `decisive_check.mjs 4122251554142...4 c4r2` and `...6 c4r2`: both **BLOCKABLE**
  ("defender escapes / candidate not decisive") — the win is a zugzwang grind that
  eventually forces Gray to occupy c4r2, NOT a decisive immediate threat.

So the winning four is **identical** on both branches, **pre-existing**, and **not decisive**.
The ONLY difference between the moves is timing: bestPlies 4 vs playedPlies 24 (`forward_distance.mjs 4122251554142 4 6`).

## why §5 router → not_a_blunder (and `line` is a fabrication)
- `flip = false` (both win).
- §5 rule 1: `(not flip) AND no discriminating winning four reachable on either PV → not_a_blunder`.
  The winning four does NOT discriminate — same cell c4r2 on both PVs — so "no discriminating
  winning four" is TRUE. → **not_a_blunder**.
- §8 gate 2 independently forbids naming c4r2: it is BLOCKABLE (not re-solve-confirmed
  decisive) and the terminal is a zugzwang grind, not a forced board-fill where the only
  move completes. "Never the earliest blockable threat."
- §8 gate 6 is dispositive: not_a_blunder for same-floor with no discriminating reachable
  line — **"never 'lasts longer/wins sooner'."** The entire `line`/conversion rationale
  ("wins ~20 moves sooner → fewer chances to throw it away") is exactly what gate 6 bans.

This resolves the iteration-2 INSUFFICIENT finding: the reason "could not honestly explain a
blunder" *because there is no blunder to explain* — the same standing four wins both ways.
The honest output is not_a_blunder, which the gated router already produces.

## golden reason
```json
{
  "grain": "not_a_blunder",
  "outcomeDelta": { "best": "win", "played": "win" },
  "register": { "bestPlies": 4, "playedPlies": 24, "phase": "forced_sequence", "word": "forced_sequence" },
  "winner": "none",
  "betterMoveDoes": "position already decided; this move did not change the result reachably."
}
```

## player_sentence
"Both col4 and col6 still force your win on the c4r2 four — this isn't a mistake; col4 just
finishes faster." (Honest no-blunder note. Do NOT tell the student they erred.)

## defect (epic-level, GENERAL)
**§7 matrix row "both-win, better-wins-sooner → line" contradicts §8 gate 6 and §5 rule 1.**
Timing alone (a smaller ply count) is not a blunder. The both-win→line branch must require a
**discriminating** winning four: the best branch names a four that is NOT the four the played
branch wins with (different completing cell/window) AND that four passes `decisive_check`.

**General fix:** gate the both-win→line route with:
`route to line ONLY IF bestLine.completingCell != playedLine.completingCell (or one branch's
four is forced/decisive while the other's is not) AND the discriminating four passes the
decisiveness gate; OTHERWISE (same standing four / blockable / acceleration-only) → not_a_blunder.`
This makes gate 6's "never wins sooner" the controlling rule and removes the §7/§8 conflict.
No new field is needed — the discrimination test is `completingCell` equality from the dual PV
plus the existing decisive_check, both already computed.

## tools_used
- `eval_set_large_3.json` (case data)
- `TOOLS/forward_distance.mjs 4122251554142 4 6`
- `TOOLS/optimal_line.mjs 41222515541424` / `...26`
- `TOOLS/decisive_check.mjs ...4 c4r2` / `...6 c4r2`
- `visualize_board.sh 4122251554142`

## tools_created
none

## lesson + redundant cases
eval-43 is the STRONGEST both-win conversion case (max ply gap 4→24, extra winning window)
and it routes to **not_a_blunder**, because the same standing four (c4r2) wins both branches
and is blockable. "Wins sooner" is a preference, not a blunder (§8 gate 6). This makes the
whole both-win conversion bucket redundant on the honesty axis: **eval-20, eval-36, eval-39,
eval-50, eval-53, eval-57, eval-59, eval-63, eval-65** all route to not_a_blunder UNLESS one
exhibits a *discriminating* winning four (best names a four the played branch cannot reach /
the best branch's four is decisive while the played branch only wins via a different,
blockable cell). Re-examine those nine only to check for a discriminating-four exception; the
default golden for the bucket is not_a_blunder.
