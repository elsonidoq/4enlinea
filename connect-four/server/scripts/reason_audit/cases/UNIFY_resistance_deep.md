> ⛔ **SUPERSEDED / ABANDONED 2026-06-28** — the reason-field design described or assumed here branched off and is no longer the plan. Restarting from `docs/architecture/my_pseudocode.md`. Do NOT use this file as guidance; treat it as historical only.

# UNIFY — resistance honesty on DEEP/SLOW both-lose cases

## Conclusion (lead)

**8 of 9 deep both-lose cases are honest OMIT; only 1 (eval-55) is GROUNDABLE-BY-LINE.**

Applying the reframed rule — *the only honest resistance reason is a CONCRETE, re-solve-confirmed
opponent connect-4 (cell + window + ply) reachable sooner / in more ways on the played branch than the
better branch* — the deep both-lose bucket collapses almost entirely to OMIT. Every case where the two
branches differ by a **single parity tempo (1 solver-score unit = 2 plies) and both losses land at
board-fill (ply 37–42)** is a diffuse parity zugzwang: there is a terminal completing cell, but it is the
last-square-of-a-full-board, not an exhibitable forcing line the move created. The better move "resists"
only by one zugzwang tempo — coaching-vacuous on an already-lost position → **OMIT**.

The lone exception is **eval-55**: a real **8-ply (4-score-unit) gap** where the played move walks into a
re-solve-confirmed **5-ply forced diagonal** (Gray completes `c1r1-c2r2-c3r3-c4r4` at `c3r3`, ply 26),
while the better move denies that immediate force and lasts to ply 34. That is a concrete, nameable,
discriminating line → **GROUNDABLE-BY-LINE**. (It is also the only severity-1 case in the set.)

**Headline counts: GROUNDABLE-BY-LINE = 1 (eval-55). OMIT = 8 (eval-4, 16, 23, 28, 44, 48, 60, 62).**

This strongly implies the 29-case resistance bucket is *mostly* honest OMIT: the discriminator is not
"both lose" (they all do) but "is the played loss a concrete forcing line meaningfully sooner than best."
Only cases with (a) a multi-unit score gap AND (b) a re-solve-confirmed completing cell qualify. A single
parity tempo at board-fill never does.

## Table

| case | premove discs | best score / fwd | played score / fwd | Δ plies | terminal: best (cell@ply, win) | terminal: played (cell@ply, win) | discriminating opponent line? | classification |
|------|---------------|------------------|--------------------|---------|--------------------------------|----------------------------------|-------------------------------|----------------|
| eval-4  | 6  | -1 / 35 | -2 / 33 | 2 | c7r6@42 (board full) | c3r4@40 | NONE — board-fill parity, 2-ply | **OMIT** |
| eval-16 | 1  | -1 / 40 | -2 / 38 | 2 | c5r5@41 | c6r3@39 (2 win) | NONE — lost opening (== eval-8), board-fill | **OMIT** |
| eval-23 | 18 | -1 / 23 | -2 / 21 | 2 | c7r6@42 (board full) | c3r6@40 | NONE — board-fill parity, 2-ply | **OMIT** |
| eval-28 | 29 | -2 / 10 | -3 / 8  | 2 | c1r6@39 | c2r6@37 | NONE — top-row board-fill (only ~14 cells left), 2-ply | **OMIT** |
| eval-44 | 11 | -1 / 30 | -2 / 28 | 2 | c7r5@41 | c7r3@39 | NONE — board-fill parity, 2-ply | **OMIT** |
| eval-48 | 20 | -4 / 15 | -5 / 13 | 2 | c3r6@36 | c2r4@34 | NONE — slow zugzwang, 2-ply (category label `forced_win` is stale; both LOSE) | **OMIT** |
| **eval-55** | 20 | -5 / 13 | **-9 / 5** | **8** | c3r3@34 (2 win) | **c3r3@26 (1 win, DECISIVE)** | **YES — Gray forces diag c1r1-c2r2-c3r3-c4r4 in 5 plies; best denies it 8 plies** | **GROUNDABLE-BY-LINE** |
| eval-60 | 35 | -1 / 6  | -2 / 4  | 2 | c1r5@41 | **c1r5@39 (same cell)** | NONE — identical completing cell, pure 2-ply tempo | **OMIT** |
| eval-62 | 17 | -5 / 16 | -6 / 14 | 2 | c1r5@33 | **c1r5@31 (same cell)** | NONE — identical completing cell, 2-ply | **OMIT** |

## Why "diffuse" = OMIT, concretely

- Every Connect-4 loss ends with *some* opponent 4-window, so a terminal completing cell always exists.
  That cell is **not** evidence of a blunder. The honest test is whether the played move makes a concrete
  opponent line resolve **sooner or in more ways** than the better move.
- For 8/9 cases the gap is exactly **one solver-score unit (2 plies)** and the loss completes at **ply
  37–42** (board essentially full). eval-60 and eval-62 even share the **identical completing cell** on
  both branches — the move changed nothing but a single fill-order tempo. There is no exhibitable forcing
  line; the position was lost by parity regardless. `speed=slower` carries a true but coaching-vacuous
  2-ply delta; `punishable=win` (where present) is the eval-8/eval-64 non-discriminating phantom.
- eval-55 is structurally different: a **4-unit** score gap and a **decisive_check-confirmed** 5-ply
  forced diagonal on the played branch (`verdict: DECISIVE, win completes through c3r3 under optimal
  defense`). The better move denies that immediate force. You can write a true, discriminating line:
  *"col4 lets Gray force the c1-c4 diagonal in 5 plies; col0 avoids the immediate force and lasts 8 plies
  longer."* That is the genuine, narrow content of "resistance."

## Implication for the 29-case resistance bucket

The deep both-lose probe confirms the eval-8 / eval-64 finding at scale: **resistance is honestly OMIT
unless a re-solve-confirmed concrete completing cell discriminates the branches by a real multi-ply
forcing line.** A single parity tempo at board-fill — the dominant shape here (8/9) — is always OMIT.
Recommend the ladder gate resistance on: `outcomeDelta both loss` AND `Δfwd ≥ ~4 plies (≥2 score units)`
AND `a decisive_check-confirmed completing cell that resolves strictly sooner on played`. Otherwise OMIT.
Under that gate only eval-55 survives in this set; by extension the large majority of the 29-case bucket
is honest OMIT.

## Evidence (commands)

- `forward_distance.mjs <premove-ms> <bestCol> <playedCol>` for all 9 (scores/fwd plies in table).
- `optimal_line.mjs <premove-ms+col>` on both branches of all 9 (terminal cell/ply/window counts).
- `decisive_check.mjs 333310426541014413364 c3r3` → `verdict: DECISIVE (win completes through candidate
  under optimal defense)`, window `[c1r1,c2r2,c3r3,c4r4]`, line `p22 g4 / p23 G0 / p24 g2 / p25 G0 / p26 g2`.

## tools_used
forward_distance.mjs, optimal_line.mjs, decisive_check.mjs. **tools_created:** none (all reused).

## redundancy note
eval-16 is the `"3"` lost-opening position — identical class to eval-8 (already OMIT). eval-60 / eval-62
confirm the eval-64 prediction (claimeven both-lose → same-cell 2-ply tempo → OMIT). eval-4 / eval-23 /
eval-44 / eval-48 / eval-28 are all the same "single-parity-tempo board-fill" shape and need no further
individual analysis. Only multi-unit-gap cases like eval-55 warrant per-case decisive_check.
