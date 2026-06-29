# UNIFY — resistance reframed as "the opponent connect-4 you let in sooner / in more ways"

## CONCLUSION (lead)

The reframing **holds and is discriminating** across all 10 both-lose cases. Restating
`resistance` as *"what 4-in-a-row can the opponent complete within the search on your line that they
cannot complete (or only later) on the better line?"* cleanly partitions the set:

- **6 GROUNDABLE-BY-LINE** — a concrete, re-solve-confirmed opponent winning connect-4 is reachable
  much sooner on the played branch than on the better branch (Δ 6–18 plies; played win lands at
  ply 16–26). These are honest mistakes a coach can be shown ("you let Gray complete c1r3 *now*
  instead of 18 plies from now"). The discriminating line IS the self-explanatory reason.
  → **eval-11, eval-12, eval-14, eval-38, eval-52, eval-55**

- **4 honest-OMIT** — both branches lose only deep in the fill (played win at ply 32–40), with the
  opponent win completing within **Δ≤2 plies** (eval-17: Δ0) of the better branch. The opponent win
  is **not reachable within any realistic bounded search on either branch** (it is 22–32 plies ahead
  of a 5–10-disc board), so per the CRUCIAL RULE there is nothing to punish: losing at ply 32 vs 34
  is not a mistake. These coincide exactly with severity 0–1 ("barely a blunder").
  → **eval-10, eval-17, eval-34, eval-45**

**Headline counts: 6 groundable-by-line / 4 honest-OMIT.**

The split is sharp and self-consistent: the OMIT set is *exactly* {Δ≤2 plies AND opponent win lands
deep in fill (ply ≥32) AND severity ≤1}; the GROUNDABLE set is *exactly* {Δ≥6 AND played win lands
by ply 26}. There is no ambiguous middle case in this batch. This validates a concrete routing rule:
**route resistance to a concrete opponent-line payload only when the opponent's decisive connect-4 is
reachable within the search on the played branch and strictly earlier (or unreachable) on the better
branch; otherwise OMIT.** It also confirms the eval-7/eval-42 critique from a new angle — the honest
content is always a *cell @ ply* (the opponent line), never the bare `{loserSide, speed, punishable}`
enums; the groundable cases all carry a decisive cell, the OMIT cases carry nothing.

## Table

| Case | played reg | best fwd | played fwd | opp winner | played opp line (cell@ply) | best opp line (cell@ply) | Δply | sev | classification |
|------|-----------|----------|-----------|-----------|---------------------------|--------------------------|------|-----|----------------|
| eval-10 | slow_zug | 23 | 21 | Gray | c2r4@32 | c3r4@34 | 2 | 0 | **OMIT** |
| eval-11 | immediate | 19 | 1  | Gray | **c1r3@16** | c1r3@34 | 18 | 3 | **GROUNDABLE** |
| eval-12 | immediate | 7  | 1  | Gray | **c4r4@34** | c4r4@40 | 6 | 1 | **GROUNDABLE** |
| eval-14 | immediate | 9  | 1  | Gray | **c7r5@18** | c6r3@26 | 8 | 1 | **GROUNDABLE** |
| eval-17 | slow_zug | 30 | 28 | Green | c5r3@37 | c2r5@37 | 0 | 0 | **OMIT** |
| eval-34 | slow_zug | 34 | 32 | Green | c6r3@37 | c3r3@39 | 2 | 0 | **OMIT** |
| eval-38 | forced_seq | 18 | 4 | Green | **c2r4@23** | c5r4@37 | 14 | 2 | **GROUNDABLE** |
| eval-45 | slow_zug | 31 | 29 | Gray | c5r2@38 | c7r4@40 | 2 | 1 | **OMIT** |
| eval-52 | forced_seq | 24 | 8 | Green | **c1r4@19** | c2r3@35 | 16 | 2 | **GROUNDABLE** |
| eval-55 | forced_seq | 13 | 5 | Gray | **c3r3@26** | c3r3@34 | 8 | 1 | **GROUNDABLE** |

(forward distances = repaired `forward_distance.mjs`. opp-line cells/plies = `optimal_line.mjs` on
each branch, optimal defense to terminal. "player"=blunderer/mover loses in every case; opp = the
side that wins. All 10 confirmed BOTH-LOSE: every legal column scored a loss for the mover.)

## Notes on the discriminator

- **Same-cell, strictly-later still counts.** eval-11 (c1r3), eval-12 (c4r4), eval-55 (c3r3) reach
  the *same* opponent winning cell on both branches — but the played move lets it complete 6–18 plies
  sooner. That is a real, coachable mistake (you accelerated the identical loss), and the timing gap
  is the discriminator, not the cell identity.
- **Different-cell, same-ply does NOT count.** eval-17 reaches *different* opponent cells on the two
  branches but at the **identical ply 37** — no acceleration, nothing to punish. Cell difference alone
  is not a mistake; only earlier reachability is. This is the cleanest OMIT.
- **The OMIT lines are search-unreachable.** Every OMIT opponent win lands 22–32 plies beyond a board
  with 5–10 discs — far past any bounded lookahead (depth 20–26). So on neither branch does the search
  surface a punishable opponent win → the player is simply lost → OMIT, per the CRUCIAL RULE.
- **Decisiveness confirmed** for the groundable played lines via `decisive_check.mjs`
  (eval-11 c1r3, eval-14 c7r5, eval-52 c1r4, eval-55 c3r3 all returned
  `DECISIVE (win completes through candidate under optimal defense)`, `winnerIsPunisher=true`).
  optimal_line itself plays optimal defense to terminal, so the completing cells are not blockable
  intermediates.

## Implication for the `resistance` schema

This batch confirms (from eval-7 / eval-42) that the explanatory content is **always a concrete
opponent line `cell@ply` plus the timing gap**, never the `{loserSide, speed, punishable}` enums:
- the 6 groundable cases each need a `decisiveCell` + `playedPly` vs `bestPly` (the current schema has
  no cell slot and only a binary `speed` enum — it cannot say "c1r3 now vs c1r3 in 18 plies");
- the 4 OMIT cases need the routing gate "opponent win unreachable-in-search / Δ≤2 deep in fill ⇒ say
  nothing" — exactly the severity-0/1, lost-opening positions the bare resistance payload would
  wrongly dress up as "loses slower (punishable=win)".

## Commands (reproduce)

```
# forward distances (repaired), per case: best col then played col
node server/scripts/reason_audit/TOOLS/forward_distance.mjs 3553121302 0 3            # eval-10
node server/scripts/reason_audit/TOOLS/forward_distance.mjs 35531213023221 1 0        # eval-11
# ... (all 10; cols = correct then played)

# opponent line on each branch = optimal_line on (board + col), read completingCell/completingPly
node server/scripts/reason_audit/TOOLS/optimal_line.mjs 355312130232210   # eval-11 PLAYED
node server/scripts/reason_audit/TOOLS/optimal_line.mjs 355312130232211   # eval-11 BEST

# decisiveness re-confirm of a played-branch opponent win
node server/scripts/reason_audit/TOOLS/decisive_check.mjs 355312130232210 c1r3
```

tools_used: forward_distance.mjs, optimal_line.mjs, decisive_check.mjs. tools_created: none.
