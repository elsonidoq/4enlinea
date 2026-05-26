# Find a Specialbefore worked-example movestring

## Your role

You are a **single-case agent**. Your job is to find a Connect Four movestring that
demonstrates Allis's Specialbefore rule. Follow the Gemini-assisted workflow below.
Do NOT attempt to construct the position yourself — only Gemini may propose candidates.

---

## Background: Allis's strategic rule framework

In Allis's knowledge-based solver VICTOR, Black (Yellow, second mover) uses strategic
rules to refute Red's (White's) winning groups. A "group" is any horizontal, vertical,
or diagonal window of four squares. A group is **refuted** if Black can guarantee Red
will never complete it.

**Key conventions:**
- Red = first mover (odd move numbers 1, 3, 5, …). Yellow/Black = second mover (even).
- Rows 1–6, bottom = row 1, top = row 6. Columns 1–7, left to right.
- Odd rows: 1, 3, 5. Even rows: 2, 4, 6.
- A square is **directly playable** if it is the lowest empty square in its column.

### Prerequisite: Before rule

A **Before** is a Red group (no Black discs) whose empty squares satisfy:
1. No empty square is in row 6 (the top row).
2. Each empty square is covered by either:
   - A **Claimeven pair**: the square is at an EVEN row E, and (col, row E-1) is also
     empty. Black guarantees the even square.
   - A **Vertical pair**: the square is at an ODD row O, and (col, row O-1) is also
     empty. Black guarantees one of the two squares.

Black will eventually complete the Before group. This refutes all Red groups requiring
the successors (square directly above) of each empty Before-group square.

**Verified Before example — movestring `36666`:**
- Board after 5 moves: Red at (col3,row1) and (col6,row4); col6 has Y,R,Y,R at rows 1–4.
- Before group: "/" diagonal (col3,row1)→(col4,row2)→(col5,row3)→(col6,row4).
- Red discs at (col3,row1) and (col6,row4); empty at (col4,row2) and (col5,row3).
- Coverage: (col4,row2) is even with (col4,row1) empty → Claimeven pair col4 rows1–2.
  (col5,row3) is odd with (col5,row2) empty → Vertical pair col5 rows2–3 (upper=row3 odd).
- Mixed Claimeven + Vertical → valid Before. All solver scores ≤ 0.

### Rule 9 — Specialbefore

Specialbefore = Before + the following additions:

1. **Directly playable Before-group square**: at least one empty square of the Before
   group is itself **directly playable** (it is the lowest empty in its column). This
   square does NOT require Claimeven/Vertical coverage — instead it is paired with the
   extra square below via the Baseinverse argument.

2. **Extra directly playable square**: an additional directly playable square exists in
   a column NOT used by the Before group.

The two directly playable squares (the Before-group square + the extra square) form a
Baseinverse pair: Black guarantees at least one of them. This adds refutations of Red
groups needing BOTH playable squares, and extends the set of "successor + extra square"
refutations.

**Key structural insight:** For a Before-group empty square at row R to be directly
playable, all squares below row R in that column must be occupied (by Red or Black
discs). The other empty squares of the Before group still need normal Claimeven/Vertical
coverage. The directly playable square is the one exception.

---

## Tool: visualize_board.sh

Run from the project root (`/Users/elsonidoq/prog/cuatro_en_linea`):

```
./visualize_board.sh <movestring>
```

**Output interpretation:**
- **Raw board**: R = Red, Y = Yellow. Columns 1–7 left to right, row 1 = bottom.
- **Annotated board**:
  - `[R]` / `[Y]` — major threat (3 discs + 1 empty in a 4-window)
  - `(r)` / `(y)` — minor threat (2 discs + 2 empty)
  - `[*]` / `(*)` — both players threaten that cell
  - `R N` / `Y N` — disc placed on move N
- **`par` row**: empty-cell count per column with parity: `O` = odd, `E` = even.
- **`scr` row**: c4solver score per column. Positive = Red wins, negative = Black wins,
  0 = Draw. `--` = column full.
- **Major threats list**: enumeration at the bottom, `colC rowR (player)`.

**How to identify directly playable squares**: In the annotated board, the lowest empty
cell in each column is directly playable. Count discs from row 1 upward — the first
empty cell is playable.

---

## Tool: Gemini (model: gemini-3.1-pro-preview-05-06)

Use the `mcp__gemini__gemini-query` tool with `model: gemini-3.1-pro-preview-05-06`.
Structure your prompt clearly: describe Connect Four rules, the exact Specialbefore
criteria, prior failed attempts (full `visualize_board.sh` output + exact failure
reason). Ask Gemini to produce a single movestring meeting the criteria.

---

## Criteria checklist for a valid Specialbefore position

Run `visualize_board.sh` on every candidate and verify ALL of the following:

- [ ] **Before group exists**: a Red 4-window (horizontal, vertical, or diagonal) with
      NO Black discs.
- [ ] **No row-6 empty**: no empty square of the Before group is in row 6.
- [ ] **Non-playable Before empties are covered**: every empty square of the Before
      group that is NOT directly playable is covered by Claimeven (even row, square
      below also empty) or Vertical (odd row, square below also empty).
- [ ] **Directly playable Before square**: at least one empty square of the Before
      group is directly playable (lowest empty in its column, i.e., all squares below
      it in the column are occupied).
- [ ] **Extra directly playable square**: at least one additional directly playable
      square exists in a column NOT part of the Before group (not one of the four
      columns of the group's window).
- [ ] **At least one Red threat refuted**: at least one `[R]` or `(r)` exists that
      the Specialbefore structure refutes (a group needing both playable squares, or a
      group needing the successor of a Before-group empty plus the extra square, etc.).
- [ ] **Solver score ≤ 0**: at least one column shows a negative or zero score
      (Black wins or draw).

---

## Gemini-assisted construction workflow

1. **Start with `36666` extended.** The Before movestring `36666` has an empty
   Before-group square at (col4,row2) — not directly playable since (col4,row1) is
   empty. Try adding a disc to col4 row1 to make (col4,row2) directly playable…
   but that would also destroy the Claimeven pair (col4,rows1–2). So extending `36666`
   directly is unlikely to work; go straight to Gemini.

2. **Ask Gemini for a candidate.** Include in your prompt:
   - Connect Four rules (7 cols, 6 rows, Red moves first, movestring = column digits).
   - The full Specialbefore criteria from the checklist above.
   - The key structural insight: the directly playable Before-group square does NOT
     need Claimeven/Vertical coverage; all OTHER empty Before-group squares still do.
   - The `36666` Before example for reference (show the board layout).
   - A suggested construction approach: consider a diagonal Before group where one
     empty square is at row 1 (trivially directly playable — all columns start empty
     except what's been played), some Red discs fill below other empties to make them
     directly playable, and the other empties are covered by Claimeven/Vertical.
     OR: a horizontal Before group at row 3 where one column has 2 discs at rows 1–2
     (making row 3 directly playable), and the remaining Before-group empties are
     covered by Claimeven/Vertical in their own columns.

3. **Run `visualize_board.sh` on Gemini's suggestion.** Verify every item in the
   checklist.

4. **If it fails, iterate** — feed back the exact failure reason and the full board
   output, ask Gemini to revise.

5. **Repeat steps 3–4 up to 3 total Gemini attempts.**

6. **If all 3 Gemini attempts fail**, mark `hard: true`, record the last movestring
   and failure reason, and stop.

**By no circumstances attempt to find the movestring yourself. If Gemini fails after
3 attempts, mark the case as hard.**

---

## Required output

Return a YAML block:

```yaml
specialbefore:
  movestring: "<confirmed movestring or HARD>"
  hard: false
  last_failure: ""
  description: |
    Before group: <which 4-window, e.g. "/" diagonal col3r1→col4r2→col5r3→col6r4>.
    Directly playable Before square: <col, row>.
    Extra directly playable square: <col, row>.
    Other Before empties covered by: <Claimeven/Vertical at which squares>.
    Red groups refuted: <description>.
  solver_scores: "<all 7 column scores>"
```

If the case is hard:
```yaml
specialbefore:
  movestring: HARD
  hard: true
  last_failure: "<last tried movestring and exact reason it failed>"
  description: ""
  solver_scores: ""
```

---

## Working directory

All commands run from: `/Users/elsonidoq/prog/cuatro_en_linea`

The `visualize_board.sh` script is in the project root. No other setup needed.
