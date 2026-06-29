# DESIGN — can a PRINCIPLED Allis-style PARITY argument (rule of parity / claimeven control), computed from board features WITHOUT a deep forward search, soundly explain the deep zugzwang FLIPs?

Decisive question: the user wants the deep board-fill zugzwang cases (no winning four on the board when
the move is played; result resolves only near board-fill) explained by an Allis-style **control / rule of
parity** reason — whole-board & per-column empty-square parity, claimeven pairing, odd-vs-even threat
ownership — and explicitly **NOT** by deep forward search and **NOT** by OMIT. This audit tests whether
such a parity-derived **control verdict** can be computed shallowly AND is **solver-consistent**.

Cases: eval-1, eval-2, eval-24, eval-37, eval-40. All are FLIPs (best≠played), all `slow_zugzwang`.

---

## PER-CASE VERDICTS (lead)

| case | board (discs) | flip (mover) | nOdd best→played | claimeven control verdict | sound? | discriminates? | **verdict** |
|------|---------------|--------------|------------------|---------------------------|--------|----------------|-------------|
| **eval-1**  | `44` (2) | draw→loss (Green/P1) | 1 → 1 (EQUAL) | both ambiguous (nOdd=1) | n/a | **NO (identical)** | **DIFFUSE → OMIT** |
| **eval-2**  | `444` (3) | win→draw (Gray/P2) | 2 → 0 | best nOdd2 ⇒ "P2 controls ⇒ DRAW"; **solver = P2 WIN** | **NO** | spurious (wrong direction) | **SOLVER-INCONSISTENT → OMIT** |
| **eval-24** | `333332562100` (12) | win→draw (Green/P1) | 5 → 5 (EQUAL) | both ambiguous (nOdd=5) | n/a | **NO (identical)** | **DIFFUSE → OMIT** |
| **eval-37** | `33333025` (8) | win→draw (Green/P1) | 3 → 5 | both ambiguous | n/a | spurious (opposite of eval-2) | **DIFFUSE → OMIT** |
| **eval-40** | `241` (3) | win→draw (Gray/P2) | 2 → 2 (EQUAL) | best nOdd2 ⇒ "P2 controls ⇒ DRAW"; **solver = P2 WIN** | **NO** | **NO (identical) + spurious** | **SOLVER-INCONSISTENT → OMIT** |

**Bottom line: 0 of 5 reach PRINCIPLED-PARITY-WORKS.** Two cases (eval-2, eval-40) are actively
**SOLVER-INCONSISTENT** — a naive claimeven/rule-of-parity classifier asserts "P2 controls ⇒ draw" on a
board the solver scores as a P2 **win**, i.e. it fabricates a controller the solver contradicts. The other
three are **DIFFUSE** — the only computable parity features are identical between the best and played boards
(or differ with no solver-consistent direction), so parity cannot NAME why the move flips the result. The
answer to "explain these by principled parity, not by forward search and not by OMIT" is: **it cannot be
done** — they must be OMIT.

---

## The shared, load-bearing fact: NO on-board threats on ANY branch

`parity_cells.mjs <board> {1,2}` (same-perspective, any-distance lowest-winning-cell) returns
`allThreatCells:[]` and `zThreatCells:[]` for **every** pre-move / best / played board of all 5 cases
(verified). Allis-style "control" is about who **owns a threat** by row parity as the column fills; the
**row-parity-ownership primitive has nothing to assign** because the deciding threat is not on the board —
it first materialises 11–35 plies forward at/near board-fill (see `DESIGN_parity_deep.md`). So the entire
"odd-row→P1 / even-row→P2 threat ownership" half of the parity argument is **inert** for this class. The
only parity signal that exists is the **empty-square parity** of the `par` row (whole-board + per-column).
The rest of this doc shows that signal is both non-discriminating and unsound.

Evidence: `node server/scripts/reason_audit/TOOLS/parity_cells.mjs <ms> <p>` →
`443 444 4443 4444 333330255 333330256 2411 2412 3333325621000 3333325621004` all `all[] z[]`, both p.

---

## Computable parity features and what they say (per branch)

`par` rows from `./visualize_board.sh`; solver scores from the `scr` row (mover-perspective). nOdd = number
of odd-parity (O) columns. Claimeven control rule under test: nOdd∈{0,2} ⇒ second player (P2/Gray) controls
zugzwang by (extended) claimeven; with **no threats** that control can only secure a **DRAW**, never a win.

| case | branch | par (per-col O/E) | nOdd | solver outcome (mover) | claimeven says |
|------|--------|-------------------|------|------------------------|----------------|
| eval-1 | best `443`  | E E E **O** E E E | 1 | DRAW | ambiguous (nOdd∉{0,2}) |
| eval-1 | play `444`  | E E E E **O** E E | 1 | LOSS | ambiguous |
| eval-2 | best `4443` | E E E **O O** E E | 2 | **WIN** | "P2 controls ⇒ DRAW" ❌ |
| eval-2 | play `4444` | E E E E E E E | 0 | DRAW | "P2 controls ⇒ DRAW" ✓ |
| eval-24| best `…0`   | **O O** E **O** E **O O** | 5 | **WIN** | ambiguous |
| eval-24| play `…4`   | E **O** E **O O O O** | 5 | DRAW | ambiguous |
| eval-37| best `…255` | **O** E **O O** E E E | 3 | **WIN** | ambiguous |
| eval-37| play `…256` | **O** E **O O** E **O O** | 5 | DRAW | ambiguous |
| eval-40| best `2411` | E E **O** E **O** E E | 2 | **WIN** | "P2 controls ⇒ DRAW" ❌ |
| eval-40| play `2412` | E **O** E E **O** E E | 2 | DRAW | "P2 controls ⇒ DRAW" ✓ |

### Three structural defects this table exposes

1. **Whole-board parity can NEVER discriminate best from played.** Best and played boards always have the
   **same disc count** (pre-move + 1), hence identical total-empty parity and identical dead-space-parity
   `(n+S_dead) mod 2`. So the canonical "rule of parity / who-is-forced-first" baseline returns the *same*
   verdict for both branches by construction — it is structurally incapable of naming why the move flips
   the result. The ONLY parity quantity that can differ is **which column** changed O↔E (per-column).

2. **Per-column odd-count is non-discriminating in 3/5 and direction-inconsistent in the other 2.**
   nOdd is **identical** between best and played in eval-1 (1=1), eval-24 (5=5), eval-40 (2=2) — yet
   outcomes differ (draw/loss, win/draw, win/draw). Where nOdd *does* differ, the relation to outcome has
   **no consistent direction**: eval-2's winning branch has MORE odd columns than its drawing branch
   (2>0), eval-37's winning branch has FEWER (3<5). No monotone "more/fewer odd columns favours the mover"
   rule survives both cases. The discriminator that actually flips the result is *which* column went odd
   (centre vs edge), which is a positional fact, not a parity-control fact — and `center_control` is
   already proven to fabricate on exactly these boards (see eval-1/eval-2/eval-24 case files).

3. **The claimeven control verdict is unsound on the winning branch.** For nOdd∈{0,2} the rule says
   "P2 controls ⇒ draw", but the solver scores the best branch as a **P2 win** in eval-2 (`4443`, +1) and
   eval-40 (`2411`, Gray wins). This is the precise failure the task flagged: **parity asserts a controller
   /outcome the solver contradicts.** The win is produced by a board-fill threat that lies outside
   claimeven's threat-free pairing model (KB `allis-claimeven` known_limitation: claimeven guarantees the
   even square, *not* a win; an unrefuted odd-row threat elsewhere flips control — but that threat is not
   yet on the board, so the precondition is uncheckable).

This generalises and worsens the `DESIGN_parity_endgame.md` soundness trap (eval-5 emptiesBeneath=2 EVEN
vs eval-49 emptiesBeneath=1 ODD, owner wins on both parities ⇒ count parity ≠ controller): there the
deciding threat was at least **on the board**; here there is no threat at all, so empty-square parity is
the *only* primitive available and it is the one proven unsound.

---

## Per-case detail

- **eval-1 — DIFFUSE.** Draw→loss; nOdd 1 (col3) → 1 (col4), identical; claimeven ambiguous on both. The
  flip is "centre col3 went odd (draws) vs col4 went odd (loses)" — a centre-vs-near-centre positional
  fact, not parity control. (eval-1 case file already shows even the less-central col5 draws, refuting
  center_control too.) Parity cannot name it. OMIT.
- **eval-2 — SOLVER-INCONSISTENT.** Best `4443` nOdd=2 ⇒ rule says "Gray controls ⇒ draw", solver says
  **Gray wins** (deepest possible zugzwang, completes top row on disc 42). Played `4444` nOdd=0 ⇒ "draw",
  solver draw. The control verdict is right on the played branch by luck and **wrong on the winning
  branch**; the win is invisible to claimeven. A classifier emitting the parity verdict would fabricate.
  OMIT.
- **eval-24 — DIFFUSE.** Win→draw; nOdd 5 = 5, identical; both ambiguous. 5 of 7 columns win (edge→centre);
  the win is diffuse threat-count superiority materialising ~ply 27 forward. No empty-parity feature
  differs in a way that tracks the flip. OMIT. (Only `DESIGN_parity_deep.md`'s bounded **forward
  projection** rescues this via the forward-materialised c2r3 lever — which is exactly the deep search the
  task wanted to avoid, not a board-feature parity computation.)
- **eval-37 — DIFFUSE.** Win→draw; nOdd 3→5; both ambiguous (nOdd∉{0,2}); direction opposite to eval-2 so
  no principled rule. Decisive window first 3/1 at ply 33. OMIT.
- **eval-40 — SOLVER-INCONSISTENT + non-discriminating.** Best `2411` and played `2412` both nOdd=2, so the
  claimeven verdict is identical ("Gray controls ⇒ draw") yet best is a **Gray win** and played a draw. The
  rule is simultaneously unable to tell the branches apart AND wrong on the winning one. OMIT.

---

## SYNTHESIS — can a principled-parity classifier honestly cover the deep cases?

**No — not for the deep, no-on-board-threat zugzwang class (eval-1/2/24/37/40).** A principled-parity
control argument needs two ingredients: (i) on-board threat cells to assign row-parity **ownership** to,
and (ii) a controller verdict. For this class (i) is **empty on every branch**, so only empty-square
parity remains, and empty-square parity is (a) structurally identical between best and played at the
whole-board level, (b) non-discriminating or direction-inconsistent at the per-column level, and (c)
**unsound** as a claimeven control verdict (predicts draw on solver-confirmed wins, eval-2/eval-40). There
is no honest, shallow, board-feature parity statement that names why the move flips the result. These are
genuine **OMIT** (and `DESIGN_parity_deep.md` already accepts 4/5 as HONEST-OMIT; eval-24 closes only via a
forward projection, i.e. a search, not board-feature parity).

### What a principled-parity classifier MUST compute/return — and its mandatory solver-gate

A parity-control reason is honest ONLY in the **threats-already-on-board** endgame class
(`DESIGN_parity_endgame.md`: eval-5/49/58), and only with these rules:

1. **Gate on on-board threats.** Require `parity_cells(board, controllerPerspective).allThreatCells`
   NON-EMPTY on the controller's snapshot. If empty on every branch → **OMIT** (this single gate excludes
   all 5 deep cases cleanly, no fabrication).
2. **Take `controller` from the solver outcome flip, NEVER from empty-square / emptiesBeneath parity.**
   (Proven unsafe by eval-2/eval-40 here and eval-5-vs-eval-49 in the endgame doc.)
3. **Name the threat owner by ROW parity** (odd row→P1, even row→P2) of an on-board cell, as a *descriptive*
   annotation only — never as the input that decides the controller.
4. **Never derive a control verdict from the `par`/empty-square parity counts** (whole-board or per-column).
   They are descriptive narrative at most; here they are flatly wrong.

Returned shape stays as `DESIGN_parity_endgame.md` proposes (`mechanism`, `controller` from flip,
`controllingThreatCell` row-parity-correct, `emptiesBeneath`/`ownerParity` descriptive-only,
`surrendered/enabled` cells). The deep class fails gate (1) and is routed to **OMIT**.

### Where it must still defer to OMIT
Any FLIP where `allThreatCells` is empty on the best AND played boards (the deciding threat is forward-only)
→ OMIT. Do not let `center_control`/positional fire on `register==slow_zugzwang` FLIPs (already the
recommendation in the eval-2/eval-24 case files). The one principled escape — a bounded same-perspective
forward parity projection (eval-24's c2r3 lever) — is a **forward search**, explicitly outside "principled
parity from board features," and only one of the five deep cases qualifies even for it.

---

## Tools used / created
- used: `./visualize_board.sh` (par+scr rows, all 10 best/played boards + 5 pre-move);
  `TOOLS/parity_cells.mjs` (both perspectives, all boards → all empty); `eval_set_large_3.json` (array, not
  object — cases keyed by `.id`); prior `DESIGN_parity_deep.md` / `DESIGN_parity_endgame.md` and the
  eval-1/eval-2/eval-24 case files.
- created: none (existing tools sufficed).

## One-line lesson
A principled Allis-style parity/claimeven control verdict computed from board features is **unsound and
non-discriminating** for the deep no-on-board-threat zugzwang FLIPs: empty-square parity is identical
between best & played at whole-board level and in 3/5 at column level, and the claimeven verdict asserts
"P2 controls ⇒ draw" on solver-confirmed P2 **wins** (eval-2, eval-40) — so all five must OMIT; honest
parity_control requires on-board threat cells (gate) + solver-derived controller, which excludes this class.
