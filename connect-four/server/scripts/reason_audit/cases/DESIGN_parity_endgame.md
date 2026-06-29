# DESIGN — parity/zugzwang classifier return shape (endgame, threats already on board)

Residue B design investigation. Cases: eval-5 (z_threat), eval-49, eval-58 (z_threat flips);
eval-54, eval-64, eval-60, eval-62 (z_threat / claimeven, both-lose). Goal: what a PARITY classifier
must RETURN so the feature vector self-explains a parity/zugzwang blunder where the deciding threats are
ALREADY on the board, with zero LLM inference and zero fabrication.

Target sentence to support:
> "After your move the opponent owns an **odd/even** threat at cell **X** with **K** empty cells beneath
> it — as that column fills, parity hands them X and you cannot neutralize it; the better move kept your
> own threat at **Y** / denied theirs."

---

## PROPOSED RETURN SHAPE (lead)

```jsonc
parityControl = {
  // --- causal core: MUST be solver-/fill-derived, NEVER computed from the parity counts below ---
  "mechanism":   "z_threat" | "claimeven",  // z_threat = a nameable controlling cell exists;
                                            // claimeven = control is pure column-pairing, cell may be null
  "controller":  "player" | "opponent",     // who actually wins the zugzwang. SOURCE = outcome flip
                                            // (bestOutcome vs postBlunderOutcome) or a fill simulation.
                                            // DO NOT derive from emptiesBeneath/ownerParity (proven unsafe below).
  "flips":       true | false,              // true  = this move CHANGED the controller  -> FLIP / parity_control rung
                                            // false = control was already settled        -> SAME-floor -> resistance/OMIT

  // --- the deciding cell ---
  "controllingThreatCell": "cNrM" | null,   // controller's winning cell that decides the fill.
                                            // = lowest winning cell for the controller's perspective in the
                                            //   contested column, selected by ROW PARITY ownership (see below),
                                            //   ANY distance parity. null for pure claimeven (no single cell).

  // --- honest narrative DESCRIPTORS (annotation only, never used to derive `controller`) ---
  "emptiesBeneath": <int> | null,           // empty cells strictly BELOW controllingThreatCell in its column
                                            //   (board geometry of the controller's snapshot). The "K".
  "ownerParity":  "odd" | "even" | null,    // DISPLAY-row parity of the cell: odd row = P1's natural row,
                                            //   even row = P2's natural row. This is the reliable "whose threat".

  // --- the diff (what THIS move did); exactly the relevant ones are non-null ---
  "surrenderedThreatCell": "cNrM" | null,   // the PLAYER's own winning cell the move failed to keep
                                            //   (present on FLIP "I lost my own threat")
  "enabledThreatCell":     "cNrM" | null    // an OPPONENT winning cell the move handed over / accelerated
}
```

### Two load-bearing design rules (both proven by the cases, §"Central finding")
1. **`controller` is solver/fill-derived, not parity-derived.** The local empties-beneath parity does NOT
   determine who wins. (eval-5 owner wins with emptiesBeneath=2 EVEN; eval-49 owner wins with
   emptiesBeneath=1 ODD — direct contradiction.) A classifier that computed control from the count parity
   would fabricate on the even-distance endgame wins.
2. **Name the owner by ROW PARITY, not by count parity.** Display-row parity (odd→P1, even→P2) correctly
   identifies the threat owner in 100% of cases (c3r4/c7r2 = P2's even rows; c1r3/c1r5 = P1's odd rows).
   The z-threat *count* parity (odd-only `detectZThreat`) is the WRONG primitive and is exactly what makes
   eval-49/58 ungroundable today.

---

## Per-case field values

`controller`/`flips` taken from the solver outcome flip; `controllingThreatCell` = row-parity-correct lowest
winning cell on the controller's snapshot; `emptiesBeneath`/`ownerParity` from board geometry of that snapshot.

| case | branch | mechanism | controller | flips | controllingThreatCell | emptiesBeneath | ownerParity | surrenderedThreatCell | enabledThreatCell |
|---|---|---|---|---|---|---|---|---|---|
| **eval-5**  | FLIP win→draw | z_threat  | player   | **true**  | c3r4 | 2 | even (P2) | c3r4 | — |
| **eval-49** | FLIP win→draw | z_threat  | player   | **true**  | c7r2 | 1 | even (P2) | c7r2 | — |
| **eval-58** | FLIP win→draw | z_threat  | player   | **true**  | c1r3 | 1 | odd (P1)  | c1r3 | — |
| **eval-54** | SAME both-lose | claimeven (parity-trap) | opponent | false | null | null | null | — | — |
| **eval-64** | SAME both-lose | z_threat  | opponent | false | c2r2 (opp) | — | even (P2) | — | c2r2 |
| **eval-60** | SAME both-lose | z_threat  | opponent | false | c1r5 (opp) | 1 | odd (P1)  | — | c1r5 |
| **eval-62** | SAME both-lose | claimeven | opponent | false | null | null | null | — | — |

Notes:
- eval-5 is the ONLY case where the deciding threat is **created by the better move** (absent pre-move,
  present on best, absent on played). That is why its same-perspective cell *set* differs and the controller
  *flips* cleanly — it is the one validated `parity_control` case.
- eval-49 / eval-58 are the true endgame target class: the deciding cell is **already on the board** pre-move.
  Both boards (best AND played) contain it; only *who lands on it* flips. `controller` is groundable (from the
  outcome flip) and `controllingThreatCell` is groundable (row-parity-correct), but NOT via a set-difference of
  detector hits (see Q2.5).
- eval-54/60/62 do NOT flip (`controller`=opponent on both boards) → `parity_control` is correctly inapplicable;
  these route to `resistance`, and given severity-0 + non-discriminating ceilings the honest output is OMIT.
  eval-62 has no threats at all (pure claimeven pairing) → `controllingThreatCell` null is the correct shape.

---

## Central finding — local parity is NOT sufficient to name the controller

The owner "gets" a threat as the column fills only if the GLOBAL zugzwang (spare tempo / dead cells elsewhere)
forces the OPPONENT into the column first. The local empties-beneath parity cannot see that:

| case | controller's cell | emptiesBeneath | count parity | owner wins? |
|---|---|---|---|---|
| eval-5  | c3r4 (P2) | 2 (even) | ODD  | **yes** |
| eval-49 | c7r2 (P2) | 1 (odd)  | EVEN | **yes** |
| eval-58 | c1r3 (P1) | 1 (odd)  | EVEN | **yes** |

Owner wins on BOTH parities of emptiesBeneath ⇒ the count is **not** the cause. This is the KB's documented
limitation (`derived-parity-formula.md`: "simple r%2 exact only when the column fills straight through; use the
solver for mid-game"). **Consequence for the shape:** `controller` and `flips` must come from the solver
outcome flip already in the vector; `emptiesBeneath`+`ownerParity` are honest narrative descriptors of the cell
and must be flagged in the spec as *descriptive only*, never inputs to the control decision. Carrying them is
safe (they truthfully say "even threat at c7r2 with 1 cell beneath"); deriving control from them would fabricate.

---

## Q2.5 — generalization via a STRUCTURE-gated same-perspective pass with an EVEN-distance-aware predicate

The current `detectZThreat` is odd-distance-only. Question: with an even-distance-aware predicate (the lowest
winning cell of ANY count parity, i.e. `parity_cells.allThreatCells`), which cases ground via a same-perspective
pass comparing best vs played, and which still fail?

**Set-difference same-perspective pass (best − played cell sets):**

| case | controller persp, best set | played set | set differs? | grounds via set-diff? |
|---|---|---|---|---|
| eval-5  | P2 = {c3r4} | P2 = {} | **yes** | **YES** |
| eval-49 | P2 = {c7r2} | P2 = {c7r2} | no (cell on both) | **NO** |
| eval-58 | P1 = {c1r3} | P1 = {c1r3} | no (cell on both) | **NO** |
| eval-54/60/62 | controller never flips | — | — | N/A (SAME-floor) |

**Verdict:** even-distance awareness alone rescues **nothing new**. It surfaces c7r2 / c1r3 on the best board
(odd-only missed them), but those cells are ALSO present on the played board, so the *set difference* is empty.
The discriminator that makes eval-5 groundable and eval-49/58 not is **whether the deciding threat is
move-CREATED (set changes) vs ALREADY-ON-BOARD (set stable, only ownership flips)**. For the endgame
"threats already on board" class — the exact target of this investigation — a same-perspective **set-difference**
pass is structurally the wrong primitive regardless of distance-parity awareness.

**What actually grounds all three flips:** replace the set-difference derivation with
1. `controller` = the outcome flip (player wins on best), and
2. `controllingThreatCell` = the row-parity-correct lowest winning cell for the controller in the contested
   column (any distance parity), which is identical on both boards but still a real, on-board, named cell.

With (1)+(2) the proposed shape grounds **eval-5, eval-49, eval-58** honestly (controller + named cell +
emptiesBeneath + ownerParity all from real evidence). This makes `parity_control` viable for the endgame
flips instead of deferring them to `concrete_line` — and it is the minimal change: drop the odd-only
count gate, keep row-parity for ownership, take control from the flip.

eval-54/60/62 still fail `parity_control` and SHOULD — they do not flip; control was lost before the move.
They belong to `resistance`/OMIT, and the shape encodes that via `flips:false`.

---

## Summary verdict
- **Shape sufficient?** YES for the three FLIP cases, *provided* `controller` is solver/flip-derived and the
  owner is named by ROW parity. The shape carries every token the target sentence needs without fabrication.
- **Biggest trap:** do NOT derive `controller` (or "who gets the cell") from `emptiesBeneath`/count parity —
  empirically contradicted by eval-5 vs eval-49.
- **detectZThreat fix:** odd-only count gate is the root cause of the eval-49/58 grounding gap; switch to
  row-parity ownership + any-distance lowest-winning-cell, take control from the outcome flip.
- **Q2.5:** even-distance awareness + set-difference rescues none of the already-on-board endgame flips; a
  per-cell controller verdict from the flip is required instead.
