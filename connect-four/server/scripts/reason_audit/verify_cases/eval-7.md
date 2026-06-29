> ⛔ **SUPERSEDED / ABANDONED 2026-06-28** — the reason-field design described or assumed here branched off and is no longer the plan. Restarting from `docs/architecture/my_pseudocode.md`. Do NOT use this file as guidance; treat it as historical only.

# eval-7 — VERIFY verdict: SOUND (grain `line`, winner opponent)

**verdict: SOUND** — same-floor BOTH-LOSE, but a discriminating *accelerated* opponent four
is reachable and re-solve-confirmed decisive on the played branch, so §5 router rule 2 fires →
`line` (NOT `not_a_blunder`). This case proves **same-floor can still be `line`** and closes the
ROUTING_GAP the iteration-2 audit recorded against the old `resistance` routing (which had no cell
slot for the block at c7r4).

## Case facts (re-confirmed)
- board_state `44442333364353565516` (20 discs), Green (P1, mover) to move.
- move_played col 5 (display c6) score **-11**; correct_move col 6 (display c7) score **-1**.
- pattern_category `forced_block`, severity 3.
- Pre-move board (`visualize_board.sh`): Gray major threat **col7 row4 (Gy) [GT]** — gravity-top,
  immediately playable. col7 is the unique block; col6 leaves it open.
- All legal columns lose for Green ⇒ SAME-floor, BOTH-LOSE. No outcome flip.

## §5 router derivation
- `flip = (best=loss == played=loss)` → **NOT flip** (same-floor).
- Rule 1 (not_a_blunder) requires *no discriminating winning four reachable*. **FALSE** here — the
  played branch walks into Gray's immediate vertical win at c7r4 (ply 22) while the best branch
  delays Gray's win to c7r6 (ply 42). The accelerated opponent line IS discriminating ⇒ rule 1
  does not fire.
- Rule 2: re-solve-confirmed decisive accelerated opponent four on the crux (played) branch →
  standing-threat-ownership-flip? **No** (Gray owns the threat in both branches; the played move
  merely fails to block) ⇒ **`line`**, winner=opponent. ✔ matches predicted grain.

## Evidence (commands + key outputs)
- `forward_distance.mjs 44442333364353565516 6 5`:
  - col6 (best/block): score=-1, **forwardPlies=21** (register 43−2·1−20=21)
  - col5 (played): score=-11, **forwardPlies=1** (register 43−2·11−20=1)
- `optimal_line.mjs 444423333643535655166` (BEST branch): terminal **win for Gray**, completingCell
  **c7r6**, **completingPly 42**, window [c4r3,c5r4,c6r5,c7r6]. (slow grind ~20 plies)
- `optimal_line.mjs 444423333643535655165` (PLAYED branch): terminal **win for Gray**, completingCell
  **c7r4**, **completingPly 22**, window [c7r1,c7r2,c7r3,c7r4], line `p22:gcol6(s11)` —
  Gray wins on the very next ply.
- `decisive_check.mjs 444423333643535655165 c7r4` (PLAYED branch): **DECISIVE** —
  `completingCellIsCandidate=true`, `candidateInCompletedWindow=true`, `winnerIsPunisher=true`,
  verdict "DECISIVE (win completes through candidate under optimal defense)".
- Acceleration confirmed via both optimal PVs: opponent four lands at **ply 22 on played** vs
  **ply 42 on best** — ~20 plies sooner. The played move drops a forced block.

(Note: `decisive_check` on the *pre-move* board for c7r4 reports BLOCKABLE — because from pre-move
the optimal continuation is Green's BEST move col7, which blocks the threat; the candidate is only
decisive on the PLAYED branch. That is exactly the discrimination this case rests on.)

## Refutation duties — discharged
(a) Both optimal PVs confirm the opponent four is genuinely accelerated (ply 22 played vs ply 42
best) and re-solve-confirmed (decisive_check c7r4 DECISIVE on played). ✔
(b) §5 router lands on grain-2 `line`, NOT `not_a_blunder` — a discriminating accelerated opponent
line exists. ✔
(c) Contrast: eval-8 / eval-64 are both-lose with NO discriminating reachable line (both branches
lose at the same speed, no nameable accelerated four) → those route to `not_a_blunder`. eval-7
differs precisely because of the ~20-ply acceleration + decisive c7r4 ⇒ `line`. ✔

## player_sentence
"Column 7 blocks Gray's immediate win at c7r4 (the vertical c7r1·c7r2·c7r3·c7r4); column 6 lets
Gray win on the very next move. The position is lost either way, but the better move makes Gray
work ~20 more moves for it instead of handing it over now."

## defect
None. The unified algorithm correctly routes this same-floor case to `line` via the
discriminating-accelerated-opponent-four clause (router rule 2), carrying the block cell c7r4 in
the `line.playedLine` body — the exact fact the old `resistance` payload `{loserSide,speed,
punishable}` threw away. The phantom `punishable=win` artifact is gone (winner=opponent, both
branches loss).

## tools_used
- `visualize_board.sh`, `forward_distance.mjs`, `optimal_line.mjs` (both branches), `decisive_check.mjs`.
## tools_created
- none.

## one-line lesson
A SAME-floor BOTH-LOSE defensive miss is still `line` (winner=opponent) when the played move drops a
forced block and the opponent's winning four is *accelerated* (immediate on played vs slow on best)
and re-solve-confirmed decisive — the acceleration is the discriminator that separates it from
`not_a_blunder`.

## redundant cases
This finding makes redundant the other forced_block / immediate-loss defensive-miss both-lose cases
that share the same shape (played register=immediate + a re-solve-confirmed accelerated opponent
`immediate_threat` cell the best move blocks): **eval-11, eval-12, eval-38, eval-55, eval-61**. Each
should route to `line` (winner opponent) by the same rule-2 acceleration clause — confirm each has a
decisive accelerated opponent four before stamping. Both-lose cases where both branches are slow with
no accelerated nameable four (eval-8, eval-64) are the DIFFERENT `not_a_blunder` subspecies.
