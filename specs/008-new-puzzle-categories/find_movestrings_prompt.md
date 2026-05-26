# Coordinator Prompt: Find Pending Worked-Example Movestrings (Tier 1)

## Your Role

You are a coordinator agent. Your task is to find valid Connect Four movestrings for
6 pending worked examples across 4 knowledge-base entries. You will spawn one sub-agent
per case using the Agent tool. Each sub-agent will use Gemini Pro to generate a candidate
movestring, verify it with `./visualize_board.sh`, and retry up to 2 times if needed.

Run all 6 agents in parallel (single message with 6 Agent tool calls).

After all agents complete, compile a final report listing for each case:
- `FOUND <movestring>` — if a valid movestring was found
- `HARD (gemini gave up after 2 attempts)` — if no valid movestring was found

---

## Connect Four Background (needed by all agents)

**Board:** 7 columns (labeled 1–7 left to right), 6 rows (1 = bottom, 6 = top).

**Players:** Red moves on odd turns (1st, 3rd, 5th…), Black/Yellow moves on even turns.

**Movestring:** a string of column digits, e.g. `"4412"` means: Red→col4, Black→col4,
Red→col1, Black→col2. Pieces fall to the lowest empty row in the chosen column.

**Rows of pieces:** In a fully filled column with no interruptions, Red occupies odd rows
(1, 3, 5) and Black occupies even rows (2, 4, 6) — assuming Red went first in that column.

**Threats:** A "major threat" is an empty cell that would complete a 4-in-a-row for a player
if placed there. An "odd-row threat" is at row 1, 3, or 5; an "even-row threat" is at row 2, 4, 6.

**Verification tool:** `./visualize_board.sh <movestring>` (run from project root) prints:
1. Raw board: `R` / `Y` / empty per cell
2. Annotated board: `R N` = Red disc at move N; `[R]` = major threat for Red; `[Y]` = major
   threat for Black; `(r)`/`(y)` = minor threat; `[*]`/`(*)`= both players
3. `par` row: empty-cell count per column with parity O/E
4. `scr` row: c4solver score per column (positive = Red wins, negative = Black wins, 0 = draw)
5. Major threats list: all `[R]`/`[Y]`/`[*]` cells listed as `colC rowR (player)`

**Solver score interpretation:** Any positive score = Red wins. Any negative score = Black wins.
Score 0 = draw.

---

## Agent Protocol (for each sub-agent)

1. **Craft a Gemini prompt** using the case specification below. The prompt must explain
   Connect Four movestring notation and describe exactly what board state is required.
   Tell Gemini to output ONLY the movestring, nothing else.

2. **Call Gemini Pro:** use `mcp__gemini__gemini-query` with `model="pro"` and `thinkingLevel="high"`.

3. **Extract the movestring** from Gemini's response (strip whitespace/quotes).

4. **Verify** by running `./visualize_board.sh <movestring>` via Bash from the project root
   `/Users/elsonidoq/prog/cuatro_en_linea`.

5. **Check correctness** against the case's success criteria (piece placement, threats, solver score).

6. **If incorrect:** compose a follow-up Gemini prompt that includes:
   - The full `visualize_board.sh` output
   - A precise explanation of what is wrong and what the board should show instead
   Then go back to step 2. This is attempt 2.

7. **After 2 failed attempts:** stop and report `HARD`.

8. **If correct:** report `FOUND <movestring>`.

---

## The 6 Cases

---

### Case 1 — allen-t1: Red adjacent threats at rows 3 and 4 in the same column

**Rule:** T1 — Adjacent major threats win. If Red has threats at consecutive rows r and r+1
in the same column, Red wins unconditionally.

**Success criteria:**
- Red (first player) has a major threat (`[R]`) at some column C, row 3
- Red also has a major threat (`[R]`) at the same column C, row 4
- These two cells are currently empty (threats, not discs)
- Solver score confirms Red wins (positive score)
- The position is not already over (no 4-in-a-row on the board)

**Gemini prompt to use:**

```
You are a Connect Four expert. I need a movestring for a specific board position.

Connect Four: 7 columns (1=leftmost, 7=rightmost), 6 rows (1=bottom, 6=top).
Movestring: a sequence of column digits. First digit = Red's move, second = Black's move, etc.
Pieces fall to the lowest empty row in the chosen column.

I need a position where:
- Red (first player, odd moves) has a major threat (an empty cell that would complete 4-in-a-row for Red) at row 3 of some column
- Red ALSO has a major threat at row 4 of that SAME column
- Both threat cells are empty (not yet played)
- The game is not already over
- The board state makes this the key strategic feature (no other overwhelming imbalances)

Keep the movestring short (under 20 moves). Output ONLY the movestring, no explanation.
```

---

### Case 2 — allen-t3 example 1: Red has threats at row 2 AND row 5 in the same column

**Rule:** T3 — Same player with threats at row 2 (even) and row 5 (odd) in the same column.
This pair acts as two independent odd-threated columns for V1/V2 counting. Red wins because
T3 gives zugzwang control twice.

**Success criteria:**
- Red has a major threat (`[R]`) at some column D, row 2
- Red also has a major threat (`[R]`) at the same column D, row 5
- No other major threats (or minimal other threats) — the T3 pair is the deciding factor
- Solver confirms Red wins (positive score)

**Gemini prompt to use:**

```
You are a Connect Four expert. I need a movestring for a specific board position.

Connect Four: 7 columns (1–7), 6 rows (1=bottom, 6=top). Red plays first (odd moves), Black plays second (even moves). Pieces fall to lowest empty row.

I need a position where:
- Red (first player) has a major threat at row 2 of some column — an empty cell completing 4-in-a-row for Red at row 2 (even row)
- Red ALSO has a major threat at row 5 of that SAME column — empty cell completing 4-in-a-row for Red at row 5 (odd row)
- These are the main strategic features; no other overwhelming imbalances
- Solver confirms Red wins

This demonstrates Allen's T3 rule: a same-player row-2 + row-5 pair in one column acts like two separate odd-threated columns, giving Red zugzwang control twice.

Keep the movestring short (under 25 moves). Output ONLY the movestring.
```

---

### Case 3 — allen-t3 example 2: Black has threats at row 2 AND row 5 in the same column

**Rule:** T3 — Black with row-2 and row-5 threats in the same column. This gives Black the
equivalent of two virtual odd-threated columns, satisfying V2 (Black wins with two odd-row threats).

**Success criteria:**
- Black has a major threat (`[Y]`) at some column E, row 2
- Black also has a major threat (`[Y]`) at the same column E, row 5
- No other major threats (or minimal) — T3 is the deciding factor
- Solver confirms Black wins (negative score)

**Gemini prompt to use:**

```
You are a Connect Four expert. I need a movestring for a specific board position.

Connect Four: 7 columns (1–7), 6 rows (1=bottom, 6=top). Red plays first (odd moves), Black plays second (even moves). Pieces fall to lowest empty row.

I need a position where:
- Black (second player) has a major threat at row 2 of some column — empty cell completing 4-in-a-row for Black at row 2
- Black ALSO has a major threat at row 5 of that SAME column — empty cell completing 4-in-a-row for Black at row 5
- No other major threats (or minimal) — this pair is the main strategic feature
- Solver confirms Black wins

This demonstrates Allen's T3 rule applied to Black: a same-player row-2 + row-5 pair acts like two separate odd-threated columns, giving Black zugzwang control twice and a V2 win.

Keep the movestring short (under 25 moves). Output ONLY the movestring.
```

---

### Case 4 — allen-t6 example 1: Red has only a single even-row threat (worthless)

**Rule:** T6 — An isolated Red major threat on an even row has zero strategic value.
With only a row-4 threat, Red cannot control zugzwang. Black wins or draws.

**Success criteria:**
- Red has exactly one major threat (`[R]`) at some column B, row 4 (even row)
- No other major threats for Red (isolated)
- Solver confirms Black wins or draw (non-positive score)

**Gemini prompt to use:**

```
You are a Connect Four expert. I need a movestring for a specific board position.

Connect Four: 7 columns (1–7), 6 rows (1=bottom, 6=top). Red plays first (odd moves), Black plays second (even moves). Pieces fall to lowest empty row.

I need a position where:
- Red (first player) has exactly one major threat, at an even row (row 2, 4, or 6) in some column
- Red has NO other major threats
- Black (second player) has no major threats (or minimal), so the position is roughly balanced
- Solver confirms Black wins or draw — NOT Red wins
- This demonstrates Allen's T6: Red's isolated even-row threat is worthless (gives no zugzwang control)

Keep the movestring short (under 25 moves). Output ONLY the movestring.
```

---

### Case 5 — allen-t6 example 2: Red has C4 (worthless) and D3 (active) — outcome via D3 only

**Rule:** T6 — Red has an even-row threat at C4 and an odd-row threat at D3. T6 makes C4
worthless. The outcome depends only on D3 (V3: Red wins with one uncontested odd-row threat).

**Success criteria:**
- Red has a major threat (`[R]`) at some column, row 4 (even — worthless via T6)
- Red has a major threat (`[R]`) at a DIFFERENT column, row 3 (odd — active)
- No other major threats that would confound the analysis
- Solver confirms Red wins (positive score) — driven by the row-3 threat in the second column

**Gemini prompt to use:**

```
You are a Connect Four expert. I need a movestring for a specific board position.

Connect Four: 7 columns (1–7), 6 rows (1=bottom, 6=top). Red plays first (odd moves), Black plays second (even moves). Pieces fall to lowest empty row.

I need a position where:
- Red (first player) has a major threat at row 4 of one column (even row)
- Red ALSO has a major threat at row 3 of a DIFFERENT column (odd row)
- Black has no major threats (or is otherwise losing)
- Solver confirms Red wins

This demonstrates Allen's T6: Red's row-4 even threat is worthless (provides no zugzwang control), but Red's row-3 odd threat in a separate column is decisive. The outcome depends entirely on the odd-row threat.

Keep the movestring short (under 25 moves). Output ONLY the movestring.
```

---

### Case 6 — allen-t7 example 1: Red row-3 (col B) vs Black row-3 (col F) → cancel → Draw

**Rule:** T7 — One Red odd-row threat in column B and one Black odd-row threat in a different
column F cancel each other. After T7 cancellation, no threats remain → V5: Draw.

**Success criteria:**
- Red has exactly one major threat (`[R]`) at some column, row 3 (odd row)
- Black has exactly one major threat (`[Y]`) at a DIFFERENT column, row 3 (odd row)
- No other major threats for either player
- Solver confirms Draw (score 0)

**Gemini prompt to use:**

```
You are a Connect Four expert. I need a movestring for a specific board position.

Connect Four: 7 columns (1–7), 6 rows (1=bottom, 6=top). Red plays first (odd moves), Black plays second (even moves). Pieces fall to lowest empty row.

I need a position where:
- Red (first player) has exactly one major threat at an odd row (row 1, 3, or 5) in some column
- Black (second player) has exactly one major threat at an odd row in a DIFFERENT column
- No other major threats for either player
- Solver confirms the position is a draw (score 0)

This demonstrates Allen's T7: one Red odd-row threat and one Black odd-row threat in separate columns cancel each other — neither player can force a win, resulting in a draw.

Keep the movestring short (under 25 moves). Output ONLY the movestring.
```

---

## Output Format

After all 6 agents complete, produce a table like this:

```
| Case                        | Result                        | Movestring (if found)        |
|-----------------------------|-------------------------------|------------------------------|
| allen-t1 worked_ex_2        | FOUND                         | <movestring>                 |
| allen-t3 example-1          | FOUND                         | <movestring>                 |
| allen-t3 example-2          | FOUND                         | <movestring>                 |
| allen-t6 example-1          | FOUND                         | <movestring>                 |
| allen-t6 example-2          | FOUND                         | <movestring>                 |
| allen-t7 example-1          | FOUND                         | <movestring>                 |
```

For each HARD case, include a brief note on what Gemini's best attempt produced and why it failed.
