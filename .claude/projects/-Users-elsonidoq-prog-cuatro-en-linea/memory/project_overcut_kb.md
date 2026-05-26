---
name: project_overcut_kb
description: Overcut KB entry written 2026-05-19; three verified sub-cases with solver-verified movestrings
metadata:
  type: project
---

KB entry at `docs/knowledge-base/community-overcut.md`, written 2026-05-19.

**Why:** Part of spec 008 new puzzle categories; overcut is a tactical pattern needed in the knowledge base.

**How to apply:** When working on puzzle detection for overcut, refer to this entry for the formal predicate and verified examples.

## Four worked examples (all solver-verified)

1. `37644565255642234456335266` — Red col7, same-parity sub-case (both even rows 4+6, T4), scr=+3
2. `3476324141134417557465576166657` — Yellow col3, active-forcing sub-case (opposite parity, 3O column), scr=+1
3. `43751455437445773174731` — Yellow col2, chain-T2 sub-case (Yellow row2 kills Red row3 first), scr=+4
4. `3235331144452262262` — Yellow col4, active-forcing sub-case, scr=+10

## Two false positives (solver-verified)

- FP-A `442435355667716253` — T2 fires (Yellow even row4 undercuts Red odd row5 in col4), scr col4=-12
- FP-B `21342516141223453142546` — structural pattern in col3 but col3 row5 is mutual [*]; playing col3 loses (-9), Yellow wins via col7 (+10)

## Three T2-exception sub-cases

1. Same parity (T4): both threats at same-parity rows → T4 says no interaction
2. Active forcing: odd-parity column + current player's turn → blocks opponent's lower threat, creates immediate check at upper row
3. Chain T2 (bottom-up): current player has lower major threat that neutralizes opponent's lower threat first via T2 sub-case 2 or 3
