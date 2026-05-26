# Task: Fix spec, audit DB, update plan, generate tasks

## What has already been done

- The KB entry for `overcut` has been written at
  `docs/knowledge-base/community-overcut.md`.
- The classifier and all six category detection functions are fully implemented in
  `connect-four/server/classifier.js`.
- All tasks T001–T032 in `specs/008-new-puzzle-categories/tasks.md` are marked done.

---

## Working directory

All commands run from: `/Users/elsonidoq/prog/cuatro_en_linea`

---

## Context: the 11 discrepancies

A cross-check of the spec against the KB revealed 11 discrepancies. Each is listed
below with the spec location and the KB file that is the source of truth.

All fixes tighten the predicate. Existing false-positive candidates (if any) are
handled by the normal curation review workflow — no DB intervention needed.

---

### j_shape — 4 discrepancies

**J1 — Missing anchor parity**
- Spec: FR-008. Currently no parity check.
- KB: `docs/knowledge-base/allen-j-configuration.md` precondition: "y is odd (row y =
  odd, meaning the J's lower anchor is at an odd row — parity load-bearing)" and
  `formal_predicate`: `y % 2 == 1`.
- Fix: add to FR-008 that the J-shape anchor row must be odd (1-indexed).

**J2 — Missing edge proximity**
- Spec: FR-008. No check that extension cells are on the board.
- KB: `docs/knowledge-base/allen-j-configuration.md` precondition: "The diagonal
  extension cells (x+2, y+3) are on the board." Also listed as an explicit
  `false_positives` entry.
- Fix: add to FR-008 that (x+2, y+3) must be within the 7×6 board.

**J3 — Missing parity cancellation**
- Spec: FR-008. No check for opponent odd-row threat in the far column.
- KB: `docs/knowledge-base/allen-j-configuration.md` `formal_predicate`:
  `opp_odd_in_far_col = any(t.col == far_col and t.row % 2 == 1 for t in
  opponent_threats)` must be False.
- Fix: add to FR-008 that the opponent must have no odd-row major threat in column
  x+2 (the far column, 0-indexed).

**J4 — Guard condition checks wrong cell**
- Spec: FR-008 guard: "for each column col present in the template at row
  completingRow, !Occupied(opponent, col, completingRow+1)".
- KB: `docs/knowledge-base/allen-j-configuration.md` `formal_predicate`:
  `board[far_col][far_row] != opponent` where `far_col = x+2` and `far_row = y+2`
  (the horizontal threat cell in 0-indexed).
- Fix: replace the current guard in FR-008 with the KB guard: the opponent must not
  occupy the horizontal threat cell at (x+2, y+2) (0-indexed).

---

### undercut — 3 discrepancies

**U1 — Missing opposite-parity requirement**
- Spec: FR-005 only requires "opponent has a threat at row R' < R". No parity check.
- KB: `docs/knowledge-base/allen-t2.md` precondition: "The two threats are at rows
  with opposite parity (one odd, one even)." Same-parity threats fall under T4
  (no interaction) — not an undercut.
- Fix: add to FR-005 that R and R′ must have opposite parity (one odd, one even,
  using 1-indexed rows).

**U2 — Missing T5 exception**
- Spec: FR-005. No mention of T5.
- KB: `docs/knowledge-base/allen-t5.md`: the row-3 + row-6 pair in the same column
  does NOT constitute an undercut even though they are opposite parity. T5 explicitly
  overrides T2 for this specific pair.
- Fix: add to FR-005 that the pair (R=6, R′=3) or (R=3, R′=6) in the same column is
  excluded from undercut classification.

**U3 — Missing adjacency constraint for sub-case 3**
- Spec: FR-005. Only requires R′ < R.
- KB: `docs/knowledge-base/allen-t2.md` sub-case 3 note: "Red odd at r, Black even at
  r+1 — adjacency required for sub-case 3." When the current player has an even-row
  threat and the opponent has an odd-row threat below, T2 sub-case 3 only applies when
  the rows are immediately adjacent (R = R′ + 1).
- Fix: add to FR-005 that when the current player's threat is at an even row and the
  opponent's threat is at an odd row below, the condition only holds when R = R′ + 1
  (adjacent rows).

---

### overcut — 1 discrepancy

**O1 — No parity analysis in spec**
- Spec: FR-006 describes the mechanism ("opponent cannot activate R′ without enabling
  R") but gives no parity conditions.
- KB: `docs/knowledge-base/community-overcut.md` (just written — read it).
- Fix: update FR-006 to reference `community-overcut.md` as the source of truth and
  incorporate its preconditions (parity conditions, T2/T4/T5 interaction rules, and
  the minor-vs-major distinction for the opponent's lower threat).

---

### figure_7 — 3 discrepancies

**F1 — Missing gravity-top count constraint**
- Spec: FR-007. No gravity-top check.
- KB: `docs/knowledge-base/community-figure-7.md` `formal_predicate`:
  `if gravity_top_count >= 2: continue  # direct fork, not Figure-7 zugzwang`.
  At most one of the two threat cells (at (x+3,y+2) and (x+3,y+3)) may be at the
  current column height.
- Fix: add to FR-007 that at most one of the two threat cells may be gravity-top
  (immediately playable).

**F2 — Missing above-gravity requirement**
- Spec: FR-007. No above-gravity check.
- KB: `docs/knowledge-base/community-figure-7.md` precondition: "At least one threat
  cell is above gravity (not immediately playable), providing the zugzwang element."
- Fix: add to FR-007 that at least one of the two threat cells must be above gravity.

**F3 — Variant 1 horizontal arm is structurally wrong**
- Spec: FR-007 variant 1 ("Ascending + right"): diagonal
  `{(x,y),(x+1,y+1),(x+2,y+2)}` + horizontal `{(x+2,y+2),(x+3,y+2),(x+4,y+2)}`.
  With the hinge at (x+2,y+2) and horizontal extending right to (x+4,y+2), the
  horizontal extension threat lands at (x+5,y+2) while the diagonal extension lands
  at (x+3,y+3). These are in **different columns** — violating the KB's core
  same-column property ("generates exactly two major threats in the same column").
- KB: `docs/knowledge-base/community-figure-7.md` — both threat cells are always in
  column x+3.
- Fix: remove variant 1 from FR-007 or correct it so the horizontal arm ends at
  (x+2,y+2) (the hinge) and extends left to (x,y+2), matching the same-column
  property. Variant 2 ("Ascending + left") already correctly describes the canonical
  ascending case.

---

## Step 1 — Read the KB files for each discrepancy

Before touching the spec, read the relevant KB section for each discrepancy to
extract the exact wording to use in the spec fix:

- `docs/knowledge-base/allen-j-configuration.md` (J1–J4)
- `docs/knowledge-base/allen-t2.md` (U1, U3)
- `docs/knowledge-base/allen-t5.md` (U2)
- `docs/knowledge-base/community-overcut.md` (O1)
- `docs/knowledge-base/community-figure-7.md` (F1, F2, F3)

---

## Step 2 — Fix the spec

Edit `specs/008-new-puzzle-categories/spec.md`. Apply all 11 fixes in-place:

- Each fix must cite the KB condition it encodes. Do not invent new conditions.
- Do not rewrite surrounding text. Make the minimum change needed.
- For F3: remove variant 1 entirely from FR-007 and renumber remaining variants
  (variant 2 → variant 1, etc.), or replace variant 1 with the correct ascending+left
  form if both ascending-left and descending-right are needed. Read the KB first to
  understand which variants are legitimate.
- For O1: read `community-overcut.md` in full before editing FR-006.

---

## Step 3 — Read the classifier and update the plan

Read the current implementations in `connect-four/server/classifier.js`:
- `detectUndercut` (around line 220)
- `detectOvercut` (around line 261)
- `detectFigure7` (search for `detectFigure7`)
- `detectJShape` (search for `detectJShape`)

For each function, compare its logic against the now-fixed spec and identify exactly
what code path is wrong or missing.

Then edit `specs/008-new-puzzle-categories/plan.md`: append a new section at the
bottom titled `## Classifier Bug Fixes (post-audit)` that describes, for each
affected function:

1. Which discrepancy it relates to (use the IDs: J1–J4, U1–U3, O1, F1–F3).
2. The current (wrong) behaviour.
3. The required change, in terms of specific conditions to add or remove.
4. Whether a DB fix is also needed (flag U1 and F3 only).

Keep it terse — this is a delta description, not a full rewrite.

---

## Step 4 — Generate new tasks

Append a new phase to `specs/008-new-puzzle-categories/tasks.md`:

```
## Phase 6: Classifier Correctness Fixes
```

Write one task per affected classifier function. Use the same format as existing
tasks (e.g. `- [ ] T037 ...`). Start numbering from T037.

Task requirements:
- Each task must name the exact function in `classifier.js` to change.
- Each task must cite the discrepancy IDs it addresses (e.g. "fixes J1, J2").
- Each task must state the specific condition to add (derived from the plan delta in
  Step 4), not a vague "fix the classifier".
- Include one task to re-run the existing classifier test suite after all fixes.
- Mark all tasks as `[ ]` (not done).

---

## Output summary

After completing all steps:

1. `specs/008-new-puzzle-categories/spec.md` — 11 fixes applied in-place.
2. `specs/008-new-puzzle-categories/plan.md` — new "Classifier Bug Fixes" section
   appended.
3. `specs/008-new-puzzle-categories/tasks.md` — Phase 6 appended with surgical tasks.
