> ⛔ **SUPERSEDED / ABANDONED 2026-06-28** — the reason-field design described or assumed here branched off and is no longer the plan. Restarting from `docs/architecture/my_pseudocode.md`. Do NOT use this file as guidance; treat it as historical only.

# UNIFY — conversion (both-WIN) line-comparison claim

## CONCLUSION (lead)
The claim — *"every both-WIN blunder is explainable by exhibiting a CONCRETE winning
connect-4 in BOTH branches where the better move's line completes in strictly FEWER
plies"* — is **UNIVERSALLY GROUNDABLE but not self-explanatory, and partially vacuous.**

- **Groundable: YES, for all 10 both-win cases** (eval-43 + the 9 here). A concrete player
  winning connect-4 exists under optimal defense on BOTH branches in every case, and the
  better branch completes in **strictly fewer plies** in every case (gap range 2–32). So as
  a *mechanical* unification it never fails to produce a payload.
- **Vacuous / tautological:** "better completes in strictly fewer plies" is just a restatement
  of "bestScore > playedScore." optimal_line picks max-score for the winner, so completion ply
  is a monotone function of |score|; the recommended (higher-score) move ALWAYS completes
  sooner whenever the scores differ. Edge case (a) — "better move has NO sooner line, same
  ply ⇒ not a blunder ⇒ OMIT" — therefore **cannot occur** among score-distinct both-win
  cases. It is structurally impossible, not merely absent from this sample.
- **Edge case (b) DOES occur and breaks the "line comparison" framing:** in **eval-53 and
  eval-63** the winning completing CELL is *identical* on both branches (c1r4 / c1r6
  respectively) — same geometric win, reached 2 plies later. There is no distinct "extra
  line"; the comparison degenerates to **pure timing (speed-only)**, exactly eval-43's
  predicted weak-payload mode. `extraLines` collapses to "none/ambiguous" here.
- **Honesty (eval-43's structural finding holds):** 6 of 9 cases are **severity 0 with only a
  2-ply gap** (eval-20, 39, 53, 59, 63, 65). A 2-ply-later *forced win* is not a thrown-away
  win; calling it a "blunder" overstates. The line comparison quantifies how much *cleaner*
  the better move is, never whether the slower win is actually *hard to hold*. The claim is
  self-consistent but not self-explanatory as a mistake.

**Net:** The unification is real as a groundable fact (both lines always exist, better always
sooner), so it can *replace* the vacuous {speed, extraLines} payload with an actual cell@ply
comparison. But it inherits eval-43's honesty gap and adds the identical-cell degeneracy
(eval-53, eval-63). Use it, but (1) flag identical-cell cases as speed-only, and (2) carry a
convertibility/fallibility framing so a 2-ply sev-0 "blunder" is presented as a preference.

## Table (cell@ply via TOOLS/optimal_line.mjs, optimal both sides)
| case | mover/sev | bestCell@ply | playedCell@ply | gap | both-win | holds? | note |
|------|-----------|--------------|----------------|-----|----------|--------|------|
| eval-20 | Green / 0 | c1r4@35 | c5r3@37 | 2  | yes | yes | distinct cells |
| eval-36 | Gray  / 0 | c6r4@14 (immediate) | c5r5@16 | 2  | yes | yes | best = immediate win (solver rejects won pos) |
| eval-39 | Green / 0 | c1r6@35 | c3r4@37 | 2  | yes | yes | distinct cells |
| eval-50 | Green / 4 | c2r1@7  | c7r3@39 | 32 | yes | yes | huge gap; strongest groundable case |
| eval-53 | Green / 0 | c1r4@19 | c1r4@21 | 2  | yes | yes* | **(b) IDENTICAL cell** — speed-only |
| eval-57 | Gray  / 3 | c2r3@22 | c2r4@40 | 18 | yes | yes | same col, diff row |
| eval-59 | Green / 0 | c2r3@39 | c7r5@41 | 2  | yes | yes | distinct cells; deep board (34 discs) |
| eval-63 | Green / 0 | c1r6@35 | c1r6@37 | 2  | yes | yes* | **(b) IDENTICAL cell** — speed-only |
| eval-65 | Green / 0 | c1r2@33 | c1r4@35 | 2  | yes | yes | same col (0), diff row |
| eval-43 | Gray  / 3 | c5r4 (s13, ~ply17) | c7r1 (s3, ~ply37) | ~20 | yes | yes | distinct windows; prior case |

`yes*` = claim's *timing* clause holds (best sooner) but the *line-comparison* clause is
degenerate (same cell ⇒ no distinct better line, only a faster path to the same win).

## Answers to the three required determinations
1. **Concrete player winning connect-4 on BOTH branches?** YES in all 9 (+ eval-43). The mover
   (the player who chose the blunder) wins on both branches under optimal defense; cells/plies
   in the table. optimal_line plays max-score both sides, so the loser resists maximally and
   the reported completion is the win-under-optimal-defense, not a blockable phantom.
2. **Better branch strictly fewer plies?** YES in all 9. Gaps: six cases = 2 plies (sev 0),
   eval-57 = 18, eval-50 = 32, eval-43 ≈ 20. The gap is monotone in the score delta, so this
   clause is automatically satisfied whenever bestScore > playedScore.
3. **Edge cases:**
   - **(a) better move has NO sooner line (same ply ⇒ OMIT):** NONE found, and **impossible by
     construction** for score-distinct both-win cases (higher score ⇒ strictly sooner). The
     only way to hit (a) is bestScore == playedScore, which would not be flagged a blunder in
     the first place. So the "OMIT" branch is theoretically right but never reached here.
   - **(b) identical winning line (cell+timing) on both branches:** the *cell* is identical in
     **eval-53 (c1r4) and eval-63 (c1r6)**; *timing* still differs (19 vs 21; 35 vs 37). A
     truly identical cell+ply never occurs (timing always differs when scores differ). These
     two are the degenerate "speed-only" payloads — the line comparison adds nothing beyond
     the timing already in `speed`.

## Method / evidence
- Case data: `eval_set_large_3.json`.
- `TOOLS/optimal_line.mjs <board+col>` on best and played branch for each case → completingCell
  + completingPly + full optimal line (raw outputs captured in this audit run).
- `TOOLS/forward_distance.mjs <board> <col> <col>` to confirm both branches win and register
  buckets (e.g. eval-36 col5 score=15 forwardPlies=0 = immediate; eval-50 col2 ply 7 vs col4
  ply 39).
- eval-36 best move col5 is itself the winning move (solver returns "Invalid position" on the
  already-won movestring); completing cell computed from col5 height (3 discs → c6r4 @ ply 14).

## Tools used / created
- used: optimal_line.mjs, forward_distance.mjs, eval_set_large_3.json. created: none.

## One-line lesson
both-win unification is always groundable (both lines exist, better always sooner = restated
score delta) but eval-43's honesty gap is structural and eval-53/eval-63 add an identical-cell
"speed-only" degeneracy; edge case (a) is unreachable by construction. Flag identical-cell
cases and the 2-ply sev-0 cases as preferences, not thrown-away wins.
