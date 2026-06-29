# DESIGN — deep-parity FLIP residue: can a FORWARD parity projection ground them?

Question (Residue B): these FLIP cases have NO decisive threat on the current board — the deciding
parity threat only materializes deep in the optimal line, so on-board `detectZThreat`/parity passes are
empty and `positional`/center_control fabricates. Can ANY classifier output make them self-explanatory,
or do they require a bounded FORWARD parity projection — and if so, is the eventual controlling threat
COMPACT + STABLE enough to attribute?

Method: `TOOLS/forward_projection.mjs` (new) walks the solver-optimal line (both sides optimal) from each
branch to terminal and, at every ply, lists every 3/1 MAJOR threat per player (empty completing cell +
gravity-reachability), then reports the terminal winning window(s) and the earliest ply at which that
window first became a 3/1 threat. Run on best AND played branch of each case.

---

## PER-CASE VERDICTS (lead)

| case | board | flip | winner | decisive window first 3/1 @ply | plies-fwd | earliest STABLE lever | verdict |
|------|-------|------|--------|-------------------------------|-----------|----------------------|---------|
| **eval-24** | `333332562100` (12d) | win→draw | P1/Green | c2r3 @**ply15** (=completes col0) | **~2–3** | **c2r3, ply15, survives→39** | **CLOSABLE-VIA-FORWARD-PROJECTION** |
| eval-1 | `44` (2d) | draw→loss | P2/Gray | top-row @ply38, completes ply42 | ~35 | none (c3r5 @ply24, non-completing) | ONLY-HONEST-OMIT |
| eval-2 | `444` (3d) | win→draw | P2/Gray | top-row @ply38, completes ply42 | ~34 | none (c3r5 @ply24, non-completing) | ONLY-HONEST-OMIT |
| eval-37 | `33333025` (9d) | win→draw | P1/Green | c7r5 @ply33, completes ply41 | ~24 | none (c5r4 @ply25, non-completing) | ONLY-HONEST-OMIT |
| eval-40 | `241` (4d) | win→draw | P2/Gray | top-row @ply36, completes ply42 | ~32 | none (c6r5 @ply30, non-completing) | ONLY-HONEST-OMIT |

**Bottom line:** eval-24 is the lone case where a bounded forward projection (~12 plies) surfaces a
compact, stable, branch-discriminating odd-threat (c2r3) — it is CLOSABLE as `parity_control` computed
forward. The other four are deep board-fill zugzwang whose decisive structure first appears 24–35 plies
out at/near board fill, with no shallow stable single cell that distinguishes win from draw → they stay
**OMIT**. So Residue B's deep cases do NOT all reach 100%: exactly one closes; four must honestly OMIT.

---

## eval-24 — CLOSABLE-VIA-FORWARD-PROJECTION (the one that closes)

Pre-move 12 discs, Green(P1) to move. Solver `[2,0,2,2,0,2,2]` → 5 winning cols {0,2,3,5,6}, 2 drawing {1,4};
played col4 (draw). The on-board parity pass is empty (prior audit), so the current ladder OMITs/fabricates.

**Forward projection finding — a single odd-threat lever that is shared, stable, and discriminating:**
Green's major threat at **c2r3** (display col 2, row 3 — an odd row Green owns) appears at **ply 15**
(only ~2–3 plies forward) and then:
- **col0 WIN:** c2r3 persists ply15→39 and IS the completing cell (winningWindows = diagonal + row-3, 2 lines).
- **col2 / col3 / col6 WINS:** c2r3 persists to the end (live, unreachable lever) but a *different* cell
  completes (c2r6 / c2r6 / c6r3). So c2r3 is the LEVER, not always the completer.
- **col4 DRAW (played):** c2r3 appears at ply15 but Green is forced (parity) to make it reachable at ply23,
  and Gray **neutralizes it at ply24** → P1 major threats empty → board fills to a draw.
- **col1 DRAW:** Green never even establishes c2r3 (grep: zero c2r3 in the line).

So across the full best/played split, **c2r3 survives in 5/5 winning columns and is killed/never-built in
2/2 drawing columns.** It is non-arbitrary (unlike center_control, which is undefined across the 5 winning
cols), compact (one column + one odd cell), stable (persists ~24 plies once formed), and it materializes
SHALLOW (ply15 ≈ 2 plies forward); the win-vs-draw DIVERGENCE is visible by **ply ~23–24 ≈ 11 plies forward**.

### What a forward-parity-projection classifier must compute / return
Run a bounded (~12-ply) SAME-PERSPECTIVE optimal projection from both the best and the played board; collect
the set of Green odd-row major threats that PERSIST (never neutralized) to the projection horizon. Return
`parity_control` (NOT concrete_line — the completer is not unique):
```json
{
  "register": "slow_zugzwang",
  "kind": "parity_control",
  "outcomeDelta": { "best": "win", "played": "draw" },
  "control": {
    "controller": "P1(Green)",
    "mechanism": "z_threat",
    "keptCells": ["c2r3"],          // odd-row Green threat preserved by the winning moves (forward-projected, not on current board)
    "surrenderedCells": ["c2r3"]    // same cell neutralized by Gray ~ply24 on the played branch
  },
  "betterMoveDoes": "A winning move keeps Green's odd threat at c2r3 alive as a zugzwang lever; the played move lets Gray neutralize it and the board fills to a draw."
}
```
Grounding requirements the projection must satisfy (so it is honest, not a c2r3 guess):
1. c2r3 is an ODD-distance winning cell for Green (parity_cells geometry, computed on the projected board).
2. c2r3 PERSISTS unneutralized to the projection horizon in the best branch.
3. c2r3 is neutralized (or never formed) in the played branch within the same horizon.
4. Express it as a *kept lever*, NOT "the win completes at c2r3" — the completing cell varies across the 5
   winning columns; only the lever is invariant.

Caveat: this is `parity_control` semantics realized via FORWARD search; the cell is absent from the
12-disc board. The capability the current ladder lacks is exactly that forward materialization step.

---

## eval-1 / eval-2 — ONLY-HONEST-OMIT (identical line; maximal board-fill zugzwang)

eval-1 played `444` and eval-2 best `4443` are the SAME optimal line. Decisive window = **top row**
(c1r6·c2r6·c3r6·c4r6), which first becomes a 3/1 threat at **ply 38** and completes on the **final disc,
ply 42 (board full)**. The only persistent earlier threat is Gray's c3r5 from **ply 24** (~20 plies fwd),
and it NEVER completes — it is a zugzwang lever whose payoff is realized elsewhere (the top row) much later.
There is no shallow, stable, single cell whose fate distinguishes draw from loss/win: a bounded projection
of any practical depth sees nothing (both branches empty until ~ply 24, and the *decisive* window not until
ply 38). Diffuse board-fill, no nameable column+cell → **OMIT** (matches prior eval-1/eval-2 audits).

## eval-37 — ONLY-HONEST-OMIT

best col5: Green wins at c7r5 (row-5 horizontal), decisive window first 3/1 at **ply 33** (24 plies fwd),
completes ply 41. Earliest Green lever c5r4 appears **ply 25** (16 plies fwd) and is non-completing. Played
col6 branch: Green builds NO threats at all (only a transient Gray c5r3). The discriminator (Green builds a
surviving threat) does not appear until ~ply 25 — far past any bounded horizon — and the decisive cell is
deeper still. No compact shallow lever → **OMIT**.

## eval-40 — ONLY-HONEST-OMIT

best col1: Gray wins on the **top row** (c7r6), decisive window first 3/1 at **ply 36** (32 plies fwd),
completes ply 42 (board full). Earliest persistent Gray lever c6r5 at **ply 30** (26 plies fwd). The early
plies are full of transient, mutually-cancelling threats (Green c1r1/c3r2/c1r6, Gray neutralizations) in
BOTH branches — exactly the diffuse parity churn that has no single nameable owner until board fill →
**OMIT**.

---

## Why eval-24 closes and the other four don't (the discriminating principle)

A deep-parity FLIP is CLOSABLE-VIA-FORWARD-PROJECTION iff a bounded (~≤12-ply) optimal projection surfaces a
**single odd-row threat cell that (a) forms shallow, (b) persists to the horizon in the better branch, and
(c) is neutralized / never-formed in the played branch**, with that cell being INVARIANT across the tie-set
of equally-best moves. eval-24 meets all of this (c2r3, ply15, survives 5/5 winning cols, dies 2/2 draws).

The other four FAIL on (a)+(b): their controlling/decisive structure first materializes 24–35 plies forward
at or one disc short of board fill, the persistent levers are non-completing, and the branches are
indistinguishable at any shallow horizon. No bounded forward search of practical depth reaches the
battleground, and even at full depth the win is a diffuse board-fill (eval-1/2/40 complete on the literal
last disc; multiple interchangeable lines) with no single cell that IS the reason. These are the genuine
**HONEST-OMIT** residue — the move is "worse" only in a way no compact board feature, present or forward,
can express.

### Design recommendation
- Add a bounded forward-parity-projection path (≤~12 plies, same-perspective optimal both branches) that
  emits `parity_control` ONLY when it finds an invariant kept/surrendered odd-threat cell per the (a)(b)(c)
  test above. This closes eval-24 (and would generically catch eval-5-style "threat one-disc-below the
  surface" cases) without fabricating.
- Gate it by horizon: if no qualifying cell appears within the budget, fall through to OMIT — do NOT extend
  the search to board fill chasing eval-1/2/37/40, and do NOT let positional/center_control fire on any
  `register==slow_zugzwang` FLIP. The four deep board-fill zugzwangs are accepted OMITs.

## Tools
- created: `TOOLS/forward_projection.mjs` (optimal-line major-threat tracer; earliest-3/1-appearance report).
- used: `forward_projection.mjs` on all 10 branches; prior `parity_cells.mjs`/`optimal_line.mjs`/
  `decisive_check.mjs` evidence from eval-1/2/24 case files; `eval_set_large_3.json` for board/move/correct.

## One-line lesson
Of the deep-parity FLIP residue, ONLY eval-24 closes — via a forward-projected `parity_control` on the
shallow, stable, branch-discriminating odd-threat c2r3 (kept by all 5 winning cols, killed by both draws);
eval-1/2/37/40 are board-fill zugzwang whose decisive cell appears 24–35 plies out with no compact lever →
HONEST-OMIT. Residue B's deep cases reach ~100% only if you accept that "the better move is worse only by
diffuse parity" is a legitimate OMIT for four of five.
