# Coordinator prompt: Find Allis strategy rule worked example movestrings (Gemini-assisted)

## Your role

You are a **coordinator**. Your job is to find concrete Connect Four movestrings that
demonstrate each of Allis's nine strategic rules: Claimeven (two sub-cases), Baseinverse,
Vertical, Aftereven, Lowinverse, Highinverse, Baseclaim, Before, and Specialbefore. You
will spawn one sub-agent per case, **sequentially**, passing findings from earlier agents
to later ones.

---

## Background: Allis's strategic rule framework

In Allis's knowledge-based solver VICTOR, Black (Yellow, second mover) uses nine strategic
rules to refute Red's (White's) winning groups. A "group" is any horizontal, vertical, or
diagonal window of four squares. A group is **refuted** if Black can guarantee Red will
never complete it.

**Key conventions:**
- Red = first mover (odd move numbers 1, 3, 5, …). Yellow/Black = second mover (even).
- Rows 1–6, bottom = row 1, top = row 6. Columns 1–7, left to right.
- Odd rows: 1, 3, 5. Even rows: 2, 4, 6.
- A square is **directly playable** if it is the lowest empty square in its column.
- **Zugzwang controller**: typically Black, who forces Red to burn moves.

### The nine rules

**Rule 1 — Claimeven:**
Two vertically adjacent empty squares: lower at odd row r, upper at even row r+1. Black
guarantees the upper (even) square: if Red plays the lower, Black immediately plays the
upper; if Red never plays the lower, Black eventually takes it then plays above. Refutes
all Red groups that include the upper square. If every Red group is covered by
non-overlapping Claimevens → Black wins via the pairing argument (a "claimeven position").

**Rule 2 — Baseinverse:**
Two directly playable squares in different columns. Black guarantees at least one: if Red
plays one, Black plays the other. Refutes all Red groups that need BOTH squares.

**Rule 3 — Vertical:**
Two vertically adjacent empty squares where the UPPER square is ODD. Like Claimeven but
weaker: opponent chooses which of the two squares Black gets. Refutes all Red groups
containing BOTH squares (which must be vertical groups, because both squares are in one
column).

**Rule 4 — Aftereven:**
A Red group (no Black discs) whose remaining empty squares are ALL upper (even) squares of
active Claimeven pairs. Black will eventually fill all those even squares via Claimeven
responses, completing the group. Consequence: in the column where Black plays the last disc
of the group, no further discs appear above it — so Red groups requiring squares above the
Aftereven level in ALL of those columns are refuted.

**Rule 5 — Lowinverse:**
Two different columns each containing a Vertical pair (4 empty squares total; upper of each
pair is ODD). Black gets at least one square from each pair. Refutes Red groups requiring
BOTH upper-odd squares, plus side-effects from the two embedded Verticals. The upper squares
do NOT need to be in the same row.

**Rule 6 — Highinverse:**
Like Lowinverse but each column has THREE empty squares (lower-even, middle-odd, upper-even).
Refutes groups needing both upper-even squares, both middle-odd squares, and conditional
cross-column pairs if either lower square is directly playable.

**Rule 7 — Baseclaim:**
Three directly playable squares P1, P2, P3 in three different columns, plus the even square
E directly above P2 (empty, not yet playable). Refutes groups needing P1+E, and groups
needing P2+P3.

**Rule 8 — Before:**
A Red group (no Black discs) whose empty squares (none in row 6) are each covered by a
Claimeven (as upper/even square) or a Vertical (as upper square). Black will eventually
complete the group. Refutes Red groups requiring the successors of each empty Before-square
(the square directly above each). Use Before only when at least one Vertical is needed;
if all empties are covered by Claimevens, use Aftereven instead.

**Rule 9 — Specialbefore:**
Before + one directly playable square in another column, where one Before-group empty square
is itself directly playable. Adds Baseinverse-like refutations (the two playable squares)
and a wider set of "successor + extra square" group refutations.

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
cell in each column is directly playable. Count discs from row 1 upward — the first empty
cell is playable.

---

## Tool: Gemini (model: gemini-3.1-pro-preview)

Use the `mcp__gemini__gemini-query` tool with `model: gemini-3.1-pro-preview . Structure your
prompt clearly: describe Connect Four rules, the exact criteria the position must satisfy,
and prior failed attempts (include full `visualize_board.sh` output and exact failure
reason). Ask Gemini to produce a single movestring meeting the criteria.

---

## Gemini-assisted construction workflow

For each case, follow this loop:

1. **Check the starting hint first** (if given). Run `visualize_board.sh` on it and verify
   against the criteria. If it passes, adopt immediately — no Gemini call needed.

2. **If no hint works, ask Gemini for a candidate.** Send:
   - Connect Four rules (7 columns, 6 rows, Red moves first, movestring = column digits).
   - The exact criteria: which squares must be empty/occupied, parities, solver score.
   - Prior failed attempts with the full `visualize_board.sh` output and why they failed.

3. **Run `visualize_board.sh` on Gemini's suggestion.** Check annotated board, par row,
   scr row, and major threats list against the criteria.

4. **If it fails, iterate** — feed back exact failure reason, ask Gemini to revise.

5. **Repeat steps 3–4 up to 3 total Gemini attempts.**

6. **If all 3 Gemini attempts fail**, mark `hard: true`, record the last movestring and
   failure reason, and move on.

By no circumstances you should attempt finding the movestring yourself. IF gemini fails, mark the case as hard

---

## Cases to solve (in this order)

### Case claimeven-boardwide — All columns have even empty counts

**Criteria:**
- `par` row: ALL seven columns show `E` (even empty counts).
- At least one Red major threat `[R]` exists in the annotated board.
- Solver score: all values ≤ 0 (Black wins or draw in every column).
- This shows the board-wide claimeven position: Black wins by always responding directly
  above Red wherever Red plays.

**Starting hint:** `112233`
Each of the first three columns is played twice (once by Red, once by Black). Run
`visualize_board.sh 112233`. Verify the par row shows all E and that at least one `[R]`
appears. If confirmed, adopt it.

**Report back to coordinator:**
1. The confirmed movestring.
2. The full `par` row (confirm all E).
3. Which Red major threats appear and at which squares.
4. The solver scores for all columns.

---

### Case claimeven-singlepair — Single Claimeven pair refutes a specific Red threat

**Criteria:**
- A specific Claimeven pair exists: (col C, row r) and (col C, row r+1) where r is ODD
  and r+1 is EVEN, and BOTH squares are empty.
- Red has a major threat `[R]` at (col C, row r+1) — the even square of the pair.
- Solver score: at least one column ≤ 0 (Black draws or wins when Claimeven fires).

**Construction strategy:**
- Look for a column with exactly 2 empty squares where the upper is even (e.g., rows 5–6,
  or rows 3–4, or rows 1–2). Red needs a major threat through the upper (even) square.
- Use the claimeven-boardwide movestring as a starting point: columns with all-even empties
  naturally contain Claimeven pairs.

**Report back to coordinator:**
1. The confirmed movestring.
2. Which exact (col, lower-odd-row, upper-even-row) pair forms the Claimeven.
3. Which Red major threat `[R]` at the even row is refuted.
4. Solver scores.

---

### Case baseinverse — Two directly playable squares refute one Red group

**Criteria:**
- Two directly playable squares (col A, row_A) and (col B, row_B) in different columns.
- At least one Red minor threat `(r)` or major threat `[R]` exists that includes BOTH
  (col A, row_A) and (col B, row_B) in the same 4-window.
- Solver score ≤ 0.

**Construction strategy:**
- Easiest case: Red has 2 discs in a horizontal window at row 1, with both remaining
  cells directly playable (both are row 1, the lowest row). Those 2 empty row-1 cells form
  the Baseinverse.
- Example: place Red discs at (col 2, row 1) and (col 3, row 1), leaving (col 1, row 1)
  and (col 4, row 1) empty and directly playable. The window cols 1–4 row 1 is a Red minor
  threat with both empties being directly playable.
- A simple hint: `2233` — Red at (2,1), Black at (2,2), Red at (3,1), Black at (3,2). Now
  cols 1 and 4 row 1 are directly playable and part of the same horizontal window.

**Report back to coordinator:**
1. The confirmed movestring.
2. Which two (col, row) squares form the Baseinverse pair.
3. Which Red group `(r)` or `[R]` is refuted.
4. Solver scores.

---

### Case vertical — Adjacent empty pair with odd upper square refutes a Red vertical group

**Criteria:**
- Two vertically adjacent empty squares in one column: (col C, row r) and (col C, row r+1)
  where r+1 is ODD (not even — that would be Claimeven).
- A Red vertical threat (major or minor) exists in column C that includes BOTH squares.
- Solver score ≤ 0.

**Key constraint:** The upper square must be ODD (rows 1, 3, 5). Common Vertical pairs:
- (row 2, row 3) — lower even, upper odd ✓
- (row 4, row 5) — lower even, upper odd ✓

**Construction strategy:**
- Build a column where Red has 2 discs in rows 1–2, leaving rows 3–6 empty. The pair at
  (row 2, row 3) would have the upper at row 3 (odd) — but row 2 is occupied! Try: Red at
  row 1 only, leaving rows 2–6 empty. Vertical pair at (row 2, row 3): upper = row 3 is
  odd. ✓
- Red needs 2 more discs in that column (at rows 4 and/or 5) to form a vertical threat
  through rows 2–5. But those can't be placed yet (rows 2–3 are empty). So Red's vertical
  threat must come through the NOT-yet-filled cells.
- Simplest: column with exactly 1 disc at row 1 (Red). Rows 2–6 empty. Red threatens
  (col, rows 2–5) as a 4-window — but Red has only 1 disc there (at row 1), so rows 2–5
  form a minor threat `(r)` with 0 Red discs... Actually Red needs discs in the window.
- Revised: column with Red discs at rows 1 and 2, Black disc at row 3 — actually this
  puts a Black disc in the window, blocking it.
- Better approach: Red places in rows 1–2 of one column, with rows 3 and 4 empty. The
  vertical window rows 1–4 has 2 Red discs and rows 3–4 empty → `(r)` at rows 3 and 4.
  The Vertical pair is (row 3, row 4) where row 4 is even → that's Claimeven, not Vertical!
- For a true Vertical (upper = odd): Red discs at rows 1 and 2, rows 3–4 empty. Pair at
  (row 2, row 3): row 2 occupied by Red → not a valid Vertical (lower must be empty too).
  Pair at (row 3, row 4): upper = row 4 even → Claimeven. Pair at (row 4, row 5): need
  rows 4 and 5 both empty, and Red has some discs at rows 1–3 in that column. The window
  rows 2–5 or rows 3–6 with Red discs at lower rows.
- Simplest working setup: Red discs at (col C, rows 1 and 2). Rows 3–6 empty. Vertical
  pair at (row 4, row 5): upper = row 5 (odd). ✓ Red vertical window at rows 2–5 has Red
  at row 2 + empty at rows 3, 4, 5 → only 1 Red disc. Need 2 for minor threat. Try
  rows 3–6 window: empty at 3, 4, 5, 6 → 0 Red. Not useful.
- Revised: Red at rows 1, 2, 3. Rows 4, 5, 6 empty. Vertical pair at (row 4, row 5): ✓
  Window rows 3–6: Red at row 3, empty at rows 4, 5, 6 → 1 Red disc. Still need more.
- Even simpler: don't try to find a vertical threat involving only the Vertical pair.
  The Vertical ITSELF just needs to exist (two adjacent empty squares, upper odd). The
  "refuted group" can be any vertical 4-window that includes BOTH squares of the pair.
  Example: pair at (col 3, row 4)–(col 3, row 5). Vertical window rows 3–6 of col 3:
  if Red has a disc at row 3 and rows 4–6 are empty, window is `(r)` at rows 4, 5, 6.
  The pair (row 4, row 5) is within this window → Vertical refutes the window rows 3–6
  (which needs both row 4 and row 5).
- Let Gemini find the exact position. Ask for: a column where Red has exactly 1 disc at
  row 3 (so rows 1, 2 are Black-filled or empty, rows 4–6 empty), with the Vertical pair
  at rows 4–5 (upper = row 5 odd), and solver ≤ 0.

**Report back to coordinator:**
1. The confirmed movestring.
2. Which (col, lower-even-row, upper-odd-row) pair forms the Vertical.
3. Which Red vertical threat `(r)` or `[R]` is refuted.
4. Solver scores.

---

### Case aftereven — Claimeven pairs cover all empty squares of a Red group

**Criteria:**
- A horizontal (or diagonal) Red 4-window exists with no Black discs.
- All empty squares of that group are the UPPER (even) squares of active Claimeven pairs.
  That is: for each empty square (col X, row E) in the group, row E is even AND (col X,
  row E-1) is also empty. Both squares empty → Claimeven fires at (col X, row E-1)–(col X,
  row E).
- Solver score ≤ 0.

**Construction strategy:**
- Target a Red group at an even row (rows 2, 4, or 6) where some cells have Red discs and
  the rest are empty even-row cells each with an empty odd cell directly below.
- Example: Red has discs at (col 1, row 2) and (col 2, row 2). Cols 3 and 4 at row 2 are
  empty. Below each: (col 3, row 1) and (col 4, row 1) must be empty. So the group
  cols 1–4 row 2 has 2 Red discs at cols 1–2 and empty at cols 3–4 (both even), with cols
  3–4 row 1 also empty → Claimeven pairs at (col3, row1)–(col3, row2) and
  (col4, row1)–(col4, row2). ✓ Aftereven fires.
- Hint: position where Red has exactly 2 discs in a horizontal row-2 window, with both
  remaining row-2 cells empty and their row-1 cells also empty. For instance:
  `1211` — Red(col1), Black(col2), Red(col1), Black(col1): Red at (1,1)(1,2)(1,3)?
  Better to use Gemini here.

**Report back to coordinator:**
1. The confirmed movestring.
2. Which Red group (columns A–D at row R) is the Aftereven group.
3. Which cells in the group are Red discs vs. empty; which Claimeven pairs cover the empties.
4. Solver scores.

---

### Case lowinverse — Two columns with Vertical pairs, both upper squares odd

**Criteria:**
- Two different columns (col A, col B), each containing a Vertical pair:
  - Col A: (col A, row a) and (col A, row a+1) both empty, row a+1 is ODD.
  - Col B: (col B, row b) and (col B, row b+1) both empty, row b+1 is ODD.
- A Red major or minor threat exists that includes BOTH upper-odd squares:
  (col A, row a+1) AND (col B, row b+1) in the same 4-window.
- Solver score ≤ 0.

**Note:** The upper squares do NOT need to be in the same row (Allis explicit). A
Lowinverse on col A rows 2–3 and col B rows 4–5 is valid.

**Construction strategy:**
- For col A to have a Vertical pair at (row 2, row 3): row 3 is odd ✓. Col A must have
  exactly 1 disc at row 1 (so rows 2 and 3 are the two lowest empty cells in that column).
- For col B similarly (or at rows 4–5 if col B has 3 discs in rows 1–3).
- Red must threaten through both upper-odd squares in the same window. If both upper squares
  are at row 3, Red could threaten cols A-B-…-… at row 3.
- Use the Vertical findings: you already know how to build a Vertical pair in a column.
  Apply the same technique to two columns.

**Report back to coordinator:**
1. The confirmed movestring.
2. The two Lowinverse columns and their exact lower/upper square rows.
3. Which Red threat is refuted (must include both upper-odd squares).
4. Solver scores.

---

### Case highinverse — Two columns with three-square stacks, upper squares even

**Criteria:**
- Two different columns (col A, col B), each with THREE vertically adjacent empty squares:
  - Col A: rows (a, a+1, a+2) all empty, where a+2 is EVEN (hence a+1 is odd, a is even).
  - Col B: rows (b, b+1, b+2) all empty, where b+2 is EVEN.
- A Red threat exists that includes BOTH upper-even squares (col A, row a+2) AND
  (col B, row b+2), OR both middle-odd squares (col A, row a+1) AND (col B, row b+1).
- Solver score ≤ 0.

**Note:** In each Highinverse column: lower square is even, middle is odd, upper is even.
Simplest instance: rows 2, 3, 4 all empty (upper = row 4 = even). Column has exactly 1
disc at row 1.

**Construction strategy:**
- Place exactly 1 Red or Black disc at row 1 of two different columns, leaving rows 2–4
  (and above) empty in each. The triple (rows 2, 3, 4) forms a valid Highinverse column.
- Red must threaten a group through row 4 of both columns (or row 3 of both). Build Red
  discs in other columns at row 4 to create a horizontal threat.
- Build on the Lowinverse findings: the Lowinverse pairs are the middle and lower rows of
  a Highinverse. Extend them by one row above.

**Report back to coordinator:**
1. The confirmed movestring.
2. The two Highinverse columns and their exact three rows.
3. Which Red threat(s) are refuted (through which row).
4. Solver scores.

---

### Case baseclaim — Three playable squares plus even square above the middle one

**Criteria:**
- Three directly playable squares P1, P2, P3 in three different columns.
- The square E directly above P2 is empty and EVEN (P2 must be at an odd row, so P2 is at
  an odd row and E = P2_row + 1 is even).
- At least one Red group includes P1 + E in the same window.
- At least one Red group includes P2 + P3 in the same window.
- Solver score ≤ 0.

**Construction strategy:**
- For P2 to be at an odd row, the column for P2 must have an even number of discs below P2.
  If P2 is at row 1 (odd), the column is empty. If P2 is at row 3 (odd), rows 1–2 have
  discs.
- Simplest: P1, P2, P3 all at row 1 (all columns empty). E = (col P2, row 2) which is
  even. ✓ Red must threaten through P1 and E in one window, and P2 and P3 in another.
- A horizontal window at row 1 containing P2 and P3 (2 of the 4 cells) works for the
  P2+P3 group. A horizontal or diagonal window containing P1 at row 1 and E at (col P2,
  row 2) — but those are in different rows, so must be a diagonal window.
- This is complex. Let Gemini explore positions where the diagonal windows create the
  required structure.

**Report back to coordinator:**
1. The confirmed movestring.
2. Which columns hold P1, P2, P3 and at which rows.
3. Which square is E (col, row).
4. Which Red groups are refuted.
5. Solver scores.

---

### Case before — Red group covered by Claimeven + Vertical (not all Claimeven)

**Criteria:**
- A Red horizontal (or diagonal) 4-window with no Black discs exists, with at least one
  empty square covered by a Claimeven and at least one covered by a Vertical (so it is
  a Before, not an Aftereven).
- "Covered by Claimeven": the empty square is at an even row with another empty square
  directly below it (odd row).
- "Covered by Vertical": the empty square is at an odd row with another empty square
  directly below it (even row).
- No empty square of the group is in row 6 (Vertical/Claimeven require a row below).
- Solver score ≤ 0.

**Key distinction from Aftereven:** At least one empty group square must be odd-row
(covered by Vertical). If all empty squares are even-row, it is Aftereven; use Before
only when a Vertical is needed.

**Construction strategy:**
- Build a Red group at row 3 (odd). Empty squares at row 3 are covered by Verticals if
  row 2 is empty below them. If the group also has an empty square at row 4 (even) with
  row 3 empty below → Claimeven. But the group must be at one row level...
- Actually a non-horizontal Before group works: diagonal groups span multiple rows. A
  diagonal window with empty squares at different rows can mix Claimeven and Vertical.
- Alternatively: a horizontal group at row 3 (odd). All empties are at row 3 (odd) →
  all covered by Vertical. That works but is "all Vertical" not a mix. Allis requires
  the mix only when combining with other rules — a pure-Vertical Before is still valid.
  But to clearly differentiate from Aftereven, show at least one Vertical (not all Claimeven).
- Simplest: horizontal group at row 3, some cells occupied by Red (rows 1–2 filled), some
  empty at row 3 with row 2 empty below → Vertical pairs (row 2, row 3). Row 2 empty means
  the column has at most 1 disc at row 1. Red discs at row 3 come from... actually
  row 3 cells in the group must already have Red discs in them to make it a Red group.
  Wait — the Before group is a group where Black fills the remaining empties. It can have
  Red discs in some cells and all empty cells are covered by Vertical/Claimeven.
- This case is high-difficulty. Provide a detailed Gemini prompt. Ask for: a position
  where Red has exactly 2 discs in a horizontal row-3 window with 2 empty cells at row 3,
  each with row 2 empty below (two Vertical pairs at row 2–3), and solver ≤ 0.

**Report back to coordinator:**
1. The confirmed movestring.
2. Which Red group is the Before group (which 4-window at which row).
3. Which empty squares are covered by Claimeven (even row) vs. Vertical (odd row).
4. Solver scores.

---

### Case specialbefore — Before with a directly playable Before-square + extra square

**Criteria:**
- All Before criteria apply (Red group, no Black discs, empty squares covered by
  Claimeven/Vertical, no empty square in row 6).
- At least one empty square of the Before group is itself DIRECTLY PLAYABLE (lowest empty
  in its column).
- An additional directly playable square exists in a column NOT used by the Before group.
- Solver score ≤ 0.

**Construction strategy:**
- Build on the Before findings: take the Before position and check if any Before group
  has a directly playable empty cell (i.e., the empty cell in the group is also at the
  bottom of its column's empty stack).
- If the Before group is at row 3, a group cell is directly playable only if the column
  has rows 1 and 2 occupied (so row 3 is the lowest empty). So stack 2 discs in that
  column before the Before group cell.
- Then add an unrelated column with a single directly playable square.

**Report back to coordinator:**
1. The confirmed movestring.
2. Which Red group is the Specialbefore group.
3. Which empty square of the group is directly playable; which is the extra square.
4. Solver scores.

---

## Coordinator instructions

1. **Spawn sub-agents sequentially** in this order:
   `claimeven-boardwide` → `claimeven-singlepair` → `baseinverse` → `vertical` →
   `aftereven` → `lowinverse` → `highinverse` → `baseclaim` → `before` → `specialbefore`.

2. **Pass context forward:** Before each new sub-agent, summarize all prior findings and
   include them verbatim under "Context from prior agents":
   - `claimeven-singlepair`: include `claimeven-boardwide` findings.
   - `baseinverse`: include both claimeven findings.
   - `vertical`: include claimeven and baseinverse findings.
   - `aftereven`: include all prior findings (focus on claimeven structure).
   - `lowinverse`: include all prior findings (focus on vertical structure).
   - `highinverse`: include lowinverse findings.
   - `baseclaim`: include baseinverse and vertical findings.
   - `before`: include aftereven and vertical findings.
   - `specialbefore`: include before findings.

3. **Sub-agent task:** Each sub-agent must:
   a. Run `visualize_board.sh` on the starting hint if given; verify criteria.
   b. If the hint passes, adopt immediately.
   c. If not, follow the Gemini-assisted workflow (up to 3 Gemini attempts).
   d. If all 3 fail, mark `hard: true`.
   e. Report findings back to coordinator.

4. **Verification checklist** each sub-agent must complete before returning:
   - [ ] Rule's structural requirements visible in annotated board (correct empty squares,
         correct parities).
   - [ ] At least one Red threat exists that the rule refutes.
   - [ ] Solver score confirms expected outcome (≤ 0 for Black wins or draw).
   - [ ] `par` row parity matches the rule's column-height requirements.

5. **Final output:** After all ten agents complete, output this YAML block:

```yaml
allis_rule_examples:
  claimeven_boardwide:
    movestring: "<confirmed or HARD>"
    hard: false
    last_failure: ""
    description: "Black wins: all columns even empty counts, Claimeven pairing covers entire board"
  claimeven_singlepair:
    movestring: "<confirmed or HARD>"
    hard: false
    last_failure: ""
    description: "Single Claimeven pair (col C, rows r/r+1) refutes Red major threat at even row"
  baseinverse:
    movestring: "<confirmed or HARD>"
    hard: false
    last_failure: ""
    description: "Two directly playable squares refute Red group needing both"
  vertical:
    movestring: "<confirmed or HARD>"
    hard: false
    last_failure: ""
    description: "Two adjacent empty squares (upper odd) refute Red vertical group needing both"
  aftereven:
    movestring: "<confirmed or HARD>"
    hard: false
    last_failure: ""
    description: "Claimeven pairs cover all empty squares of a Red group; Red groups above refuted"
  lowinverse:
    movestring: "<confirmed or HARD>"
    hard: false
    last_failure: ""
    description: "Two Vertical pairs (upper-odd) in two columns refute Red group needing both upper squares"
  highinverse:
    movestring: "<confirmed or HARD>"
    hard: false
    last_failure: ""
    description: "Two column triples (upper-even) refute Red groups needing both upper-even or middle-odd squares"
  baseclaim:
    movestring: "<confirmed or HARD>"
    hard: false
    last_failure: ""
    description: "Three playable squares + even square above P2 refute two Red groups"
  before:
    movestring: "<confirmed or HARD>"
    hard: false
    last_failure: ""
    description: "Red group covered by Claimeven + Vertical mix; successor squares refuted"
  specialbefore:
    movestring: "<confirmed or HARD>"
    hard: false
    last_failure: ""
    description: "Before with playable Before-square + extra playable square; extended refutations"
```

---

## Working directory

All commands run from: `/Users/elsonidoq/prog/cuatro_en_linea`

The `visualize_board.sh` script is in the project root. No other setup needed.
