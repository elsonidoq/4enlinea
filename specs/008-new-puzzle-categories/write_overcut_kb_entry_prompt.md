# Task: Write the KB entry for `overcut`

## Your role

You are a **research agent**. Your goal is to produce a complete, solver-verified
knowledge-base entry for the `overcut` concept in Connect Four, saved to:

```
docs/knowledge-base/community-overcut.md
```

The KB format is shown in the **Output format** section at the bottom. Every claim in
the entry must be verified by running `./visualize_board.sh` and checking solver scores.
Use Gemini to find movestrings you cannot construct manually.

---

## Working directory

All commands run from: `/Users/elsonidoq/prog/cuatro_en_linea`

---

## Tool: visualize_board.sh

```
./visualize_board.sh <movestring>
```

Output interpretation:
- **Raw board**: `R` = Red (moves 1, 3, 5…), `Y` = Yellow (moves 2, 4, 6…).
  Columns 1–7 left to right, row 1 = bottom.
- **Annotated board**:
  - `[R]` / `[Y]` — **major threat** (3 discs + 1 empty in a 4-window)
  - `(r)` / `(y)` — **minor threat** (2 discs + 2 empty in a 4-window)
  - `[*]` / `(*)` — both players have a threat on that cell
- **`par` row**: per-column parity — `O` = odd empty cells, `E` = even.
- **`scr` row**: c4solver score per column. **Positive = current player wins,
  negative = current player loses, 0 = draw.** `--` = column full.
- **Major threats list**: explicit list at the bottom like `col3 row5 (R)`.

---

## Tool: Gemini

Use `mcp__gemini__gemini-query` with `model: gemini-3.1-pro-preview` to propose or revise
movestrings. Always include in your Gemini prompt:
- Connect Four rules (7 columns, 6 rows, gravity, Red moves first on odd move numbers).
- A movestring is a sequence of 1-indexed column digits (e.g. `"3344"` = Red col3,
  Yellow col3, Red col4, Yellow col4).
- The exact criteria the position must satisfy (which cells, what threats, what scores).
- Any prior failed attempts and **exactly why they failed** (include the full
  `visualize_board.sh` output so Gemini can see the actual board).

Gemini workflow per case:
1. Propose a movestring.
2. Run `visualize_board.sh`. Check criteria.
3. If it fails, send back the full output and the exact failure reason.
4. Iterate up to **5 attempts** per case. If all 5 fail, mark the case `hard: true`.

---

## Background: what is overcut?

### Definition (from `docs/connect-four-strategy-reference.md §6.2`)

> **Overcutting** occurs when your major threat at (c, r) neutralizes the opponent's
> threat at (c, r′) with r′ < r. Because your major threat is in the same column and
> at a higher row, the opponent is forced to play column c to build toward their
> threat — but playing c eventually delivers the column to you, completing your major
> threat first.

The key structural elements:
- **Current player** has a **major threat** at (col C, row R) — 3 discs + 1 empty,
  one move from winning.
- **Opponent** has a threat at (col C, row R′) with R′ < R in the **same column C** —
  their threat is at a lower row.
- The condition: the opponent **cannot activate R′ without enabling R**. Filling column
  C to reach row R′ also fills toward row R, and the dynamics ensure the current player
  wins via R before or as the opponent reaches R′.
- The **solver confirms** the current player wins (positive score for playing column C).

### Relationship to T2 (from `docs/knowledge-base/allen-t2.md`)

Allen's T2 rule says: two major threats in the same column, opposite players, opposite
row parity (one odd, one even) — the **lower** threat neutralizes the **upper**.

Overcut is the **complementary** case where this neutralization does NOT apply and the
**upper** threat wins. This can happen when:
- The opponent's lower threat is a **minor** threat (`(r)` / `(y)` in the visualizer),
  not a major threat — T2 applies only to major threats.
- The threats have the **same parity** (both odd or both even) — T2 requires opposite
  parity; same-parity threats do not interact (T4: no interaction).
- The **T5 exception**: a row-3 + row-6 pair in the same column do NOT interact even
  though they are opposite parity. T5 explicitly overrides T2 for this specific pair.

### Three known valid overcut candidates (already reviewed)

These three candidates are confirmed valid overcuts (solver-verified). Use them to
calibrate your understanding of the mechanism.

```
d50ea2d8 — movestring: 37644565255642234456335266
  Move 26, Red to move.
  Col 7 (1-indexed), 0-indexed col 6.
  Red major threat at col6 row5 (0-indexed).
  Yellow neutralised threat at col6 row3 (0-indexed).
  Solver score for col 6: +3 (Red wins).

7fef078d — movestring: 3476324141134417557465576166657
  Move 31, Yellow to move.
  Col 3 (1-indexed), 0-indexed col 2.
  Yellow major threat at col2 row4 (0-indexed).
  Red neutralised threat at col2 row3 (0-indexed).
  Solver score for col 2: +1 (Yellow wins).

bd9dffb9 — movestring: 43751455437445773174731
  Move 23, Yellow to move.
  Col 2 (1-indexed), 0-indexed col 1.
  Yellow major threat at col1 row3 (0-indexed).
  Red neutralised threat at col1 row2 (0-indexed).
  Solver score for col 1: +4 (Yellow wins).
```

---

## Your task

### Step 1 — Inspect the known valid examples

Run `./visualize_board.sh` on all three movestrings above. For each, record:
- Is the opponent's lower threat a **major** (`[R]`/`[Y]`) or **minor** (`(r)`/`(y)`) threat?
- What are the **row parities** of R and R′ (odd or even in 1-indexed)?
- Does T2 apply, or does one of the T2 exceptions (same parity / T5) prevent it?
- What is the **column parity** (`par` row) — odd or even empty cells in column C?

Compile your findings into a table: one row per candidate.

### Step 2 — Identify the precise overcut conditions

From the table in Step 1, derive the general conditions under which an overcut is valid.
You are looking for the **exact set of conditions** that explain all three valid examples.
Key questions to answer:
- Must the opponent's lower threat be **minor** (not major)?
- What **parity relationship** between R and R′ is required?
- Does the **column parity** (Z-threat vs 0-threat) matter?
- Is there an **adjacency** constraint (R = R′ + 1)?

### Step 3 — Identify at least 2 false positive patterns

A false positive is a position where the structural pattern exists (current player has
upper threat R, opponent has lower threat R′ < R in same column) but the position is
**NOT** a valid overcut — either because the win is via a different mechanism, or
because the opponent's lower threat actually neutralizes the current player's upper one.

From your Step 2 analysis, deduce what conditions would cause a false positive. Then
find concrete movestrings demonstrating each. Use the Gemini workflow:

**False positive type A** (T2 fires — opponent's lower MAJOR even-row threat undercuts
current player's upper odd-row threat): find a position with the overcut shape where
the opponent has a **major** threat at an even row below the current player's odd-row
major threat in the same column — and the solver confirms the current player LOSES.

**False positive type B** (same structural shape, but the win is NOT via the overcut
mechanism — e.g., the current player wins via a completely different column and the
overcut column is irrelevant or losing): find a position where the solver score for
column C is **negative or zero** despite the structural overcut pattern being present.

For each false positive:
- Run `./visualize_board.sh` and confirm:
  - The structural pattern is present (upper R, lower R′).
  - The solver score shows the current player does NOT win by playing column C.
  - The exact condition from your Step 2 analysis that fails.

### Step 4 — Find 1 additional valid example

Find one more valid overcut movestring (different from the three above) to use as a
worked example in the KB entry. It must:
- Show the overcut mechanism clearly (not obscured by unrelated threats).
- Have `scores[C] > 0` (current player wins by playing C).
- Have the opponent's lower threat and current player's upper threat clearly visible
  in the annotated board output.

Use the Gemini workflow to find it.

### Step 5 — Write the KB entry

Write `docs/knowledge-base/community-overcut.md` using the format below.

---

## Output format

The KB entry must follow exactly this structure (see `allen-t2.md` or
`allen-j-configuration.md` for reference):

```markdown
---
id: community-overcut
type: tactical_pattern
canonical: false
source:
  doc: "project:docs/connect-four-strategy-reference.md"
  location: "§6.2 Overcutting"
  verbatim_quote: |
    <verbatim text from the strategy reference>

statement: |
  <1–3 sentence plain-language description of what overcut is and why it wins>

preconditions:
  - "<each condition, one per bullet, precise and checkable>"
  - ...

formal_predicate: |
  # Python pseudocode implementing the overcut check.
  # Must check every precondition listed above.
  # Must include the T2 / T5 interaction rules as guards.

  def is_overcut(board, col, current_player):
      ...

worked_examples:
  - movestring: "<movestring>"
    description: |
      <board state, which cells, which threats, why this is an overcut>
    expected_behavior: "<what solver scores confirm>"
    solver_verified: true
    notes: |
      <optional: which T2 exception makes this work — minor threat / same parity / T5>

  - movestring: "<movestring>"
    description: |
      ...
    solver_verified: true

false_positives:
  - movestring: "<movestring>"
    why_not: |
      <exact condition from preconditions that fails; how this looks in the board output>

  - movestring: "<movestring>"
    why_not: |
      ...

known_limitations:
  - "<each limitation, one per bullet>"
  - ...

related:
  - "[[allen-t2]] — the undercut mechanism; overcut is the complementary winning case"
  - "[[allen-t5]] — row-3+row-6 exception; T5 can create overcut opportunities"
  - "[[community-z-threat]] — Z-threat parity is often the engine behind overcut wins"
  - "[[community-undercut]] — mirror concept: current player's upper threat is the dead one"

last_verified: 2026-05-19
---

## Verbatim source

<verbatim quote from docs/connect-four-strategy-reference.md §6.2>

## Notes

<key observations about the mechanism, the T2 interaction, and edge cases>
```

---

## Verification checklist before saving

For each worked_example and false_positive:
- [ ] `./visualize_board.sh` output matches the description.
- [ ] Major/minor threat type of the opponent's lower threat is recorded correctly.
- [ ] `scr` row confirms the expected winner.
- [ ] The specific precondition that passes (worked example) or fails (false positive)
      is cited by name.

The KB entry is ready to save only when all checklist items pass.
