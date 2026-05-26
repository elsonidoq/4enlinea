# Coordinator prompt: Find Allen V-rule worked example movestrings — V1 and V4 only

## Your role

You are a **coordinator**. Your job is to find concrete Connect Four movestrings that
demonstrate Allen victory rules V1 and V4. V2, V3, and V5 are already solved (see below).
Spawn one sub-agent per case, **sequentially** (v1 first, then v4), passing v1 findings
to the v4 agent.

---

## Background: Allen's T/V framework

Allen's framework predicts the outcome of a Connect Four position by:
1. **Applying T1–T7** transformation rules to simplify the major-threat set.
2. **Checking V1–V5** victory rules on the simplified threat set to determine the winner.

A "major threat" is a 4-window with exactly 3 discs of one color and 1 empty cell
(`[R]` or `[Y]` in visualize_board output). Odd rows = 1, 3, 5 (bottom = row 1).
Red moves first (odd move numbers), Yellow/Black moves second.

### The V-rules (checked in order V1 → V5)

**V1 — Red wins:** After T1–T7, Red has ≥ 3 uncancelled odd-row major threats in
separate columns (odd count: 3, 5, …). Checked first.

**V2 — Black wins:** After T1–T7, Black has ≥ 2 uncancelled odd-row major threats in
separate columns (even count: 2, 4, …). Checked second (only if V1 didn't fire).

**V3 — Red wins:** After T1–T7, Red has exactly 1 uncancelled odd-row major threat,
Black has 0. Checked third.

**V4 — Black wins:** After T1–T7, neither player has a winning odd-row configuration
(V1/V2/V3 all failed), but Black holds at least one major even-row threat. Checked
fourth. Red's even-row threats are worthless (T6 removes them).

**V5 — Draw:** None of V1–V4 fired. Catch-all.

### Key T-rules you need to know

**T7 (cancellation):** One Red odd-row threat + one Black odd-row threat in *separate*
columns cancel each other — both are removed from V1/V2 counting. This is why Black
needs TWO odd-row threats to win via V2 (one survives T7 cancellation).

**T6:** Red's isolated even-row threats are worthless and removed before V4 counting.
Black's even-row threats are NOT removed — they are the basis of V4.

**T4:** Two threats of the same player, same column, same parity (both odd or both
even) — no cumulative bonus. The column contributes only one effective threat to
V1/V2/V3 counting.

---

## Tool: visualize_board.sh

Run from the project root (`/Users/elsonidoq/prog/cuatro_en_linea`):

```
./visualize_board.sh <movestring>
```

**Output interpretation:**
- **Raw board**: R = Red, Y = Yellow. Columns 1–7 left to right, row 1 = bottom.
- **Annotated board**:
  - `[R]` / `[Y]` — major threat on that cell (3 discs + 1 empty in a window)
  - `(r)` / `(y)` — minor threat (2 discs + 2 empty)
  - `[*]` / `(*)` — both players have a threat on that cell
- **`par` row**: parity of each column (O = odd empty cells, E = even).
- **`scr` row**: c4solver score per column. Positive = Red wins, negative = Black wins,
  0 = Draw. `--` = column full.
- **Major threats list**: explicit list at the bottom like `col1 row3 (Red)`.

---

## Tool: Gemini (model: gemini-3.1-pro)

Use the `mcp__gemini__gemini-query` tool with `model: gemini-3.1-pro` to ask Gemini
to propose or revise a movestring. Structure your prompt clearly: describe the board
rules, the criteria the position must satisfy, and any prior attempts that failed
(including the visualize_board.sh output and the reason for failure). It is very important
you use gemini 3.1, not gemini 2.5.

---

## Gemini-assisted construction workflow

For each case, follow this loop:

1. **Check the starting hint first** (if one is given). Run `visualize_board.sh` on it
   and verify against the criteria. If it passes, adopt it immediately — no Gemini call
   needed.

2. **If no hint works (or none is given), ask Gemini for a candidate.** Send Gemini:
   - A clear description of the Connect Four rules (columns 1–7, Red moves first,
     a movestring is a sequence of column digits).
   - The exact criteria the position must satisfy (which `[R]`/`[Y]` cells, which rows,
     what `scr` values).
   - Any prior failed attempts and **why** they failed (include the full
     `visualize_board.sh` output so Gemini can see the actual board state).
   - Ask Gemini to produce a single movestring that meets the criteria.

3. **Run `visualize_board.sh` on Gemini's suggestion.** Check:
   - Major threats list matches the required pattern.
   - `scr` row confirms the expected winner.

4. **If it fails, iterate.** Feed back to Gemini:
   - The movestring it proposed.
   - The full `visualize_board.sh` output.
   - A precise explanation of **what is wrong** (e.g., "Black has an odd-row threat at
     col3 row1 that should not be there", "scr shows Draw but we need Red to win").
   - Ask Gemini to revise.

5. **Repeat steps 3–4 up to 3 total Gemini attempts** (3 proposals, 3 verifications).

6. **If all 3 Gemini attempts fail**, mark the case as `hard: true` in the final YAML,
   record the last attempted movestring and the remaining failure reason, and move on
   to the next case.

---

## Already-solved movestrings (context and reuse)

### `42354643256425346355663` — V5: Draw
- Red has one odd-row major threat at col1 row3; Black has one at col7 row5.
- T7 cancels both. No threats remain. All scr=0.
- par: col1=6E, col2=3O, col3=1O, col4=1O, col5=1O, col6=1O, col7=6E.

### `77273746` — V3: Red wins
- Major threats: Red col1 row1 (odd), Red col5 row1 (odd), Yellow col7 row5 (odd).
- T7 cancels Red col5 + Yellow col7. Surviving: 1 Red odd at col1 row1, 0 Black odd.
- scr: [17, -17, -17, -17, 17, -17, 16].

### `727364` — V2: Black wins
- Yellow has `[Y]` at col1 row1 and col5 row1 (both odd rows, separate columns).
- Red has 0 major threats at all. All scr = -18.
- Construction insight: Red spread across cols 6 and 7 (stacked 2-deep each) without
  forming threats. Yellow played cols 2,3,4 at row1 → two simultaneous horizontal
  windows (cols 1–4 and cols 2–5). Keep Red's discs spread and low to avoid threats.

### `1115222555577773663636617` — T4 reference
- Red has threats in col4 at rows 3 and 5 — same column, same parity → T4: counts as
  ONE effective odd-row threat. Useful for recognizing same-column stacking.

---

## Cases to solve (in this order)

### Case v1 — Red wins (3+ Red odd threats, odd count)

**Criteria:**
- After T1–T7, Red has ≥ 3 uncancelled odd-row major threats in separate columns
  (targeting exactly 3). Black has 0 uncancelled odd-row threats.
- Solver score positive (Red wins).

**Key constraints:**
- T4: Red's 3 threats must be in THREE DIFFERENT columns (same column same parity = 1 count).
- T7: Black must have 0 odd threats, OR Black has 1 and Red has 4 (T7 cancels one pair,
  leaving 3 Red odd, 0 Black odd).
- The `[R]` major threat cells must be on odd rows (row 1, 3, or 5).

**Construction strategy:**
- Mirror the v2 example: v2 used Yellow playing cols 2,3,4 at row1 to create two
  simultaneous horizontal windows (cols 1–4 and cols 2–5). For v1, extend Red one
  column further: Red playing cols 2,3,4,5 at row1 creates THREE windows simultaneously:
  cols 1–4, cols 2–5, and cols 3–6 → `[R]` at col1 row1, col6 row1, and either col1
  or col6 again... actually: window 1-4 → empty at col1; window 2-5 → no empty (all
  filled); window 3-6 → empty at col6. So Red at cols 2,3,4,5 row1 yields `[R]` at
  col1 row1 AND col6 row1 (two threats). Need a third from another window or column.
- Alternative: Red at cols 3,4,5,6 row1 → `[R]` at col2 row1 and col7 row1. Still only two.
- To get THREE threats: Red needs discs in TWO separate row-1 horizontal groups, e.g.,
  cols 1,2,3 AND cols 5,6,7 at row1 → windows at cols 1-4 (empty col4), cols 2-5
  (empty col5 if empty), cols 4-7 (empty col4), cols 5-8... but board is only 7 wide.
  Cols 1,2,3 → `[R]` at col4; cols 5,6,7 → `[R]` at col4 again (col4 covered twice)
  or cols 4-7 → `[R]` at col4. This gets complicated.
- Simplest concrete attempt: Red at cols 2,3,4 row1 + Red at col6 row1 (4 Red discs total
  at row1). This creates: window 1-4 → `[R]` col1 row1; window 2-5 → `[R]` col5 row1;
  window 3-6 → `[R]` col6... wait col6 is occupied. Window 4-7 → missing two.
  Try: Red at cols 1,2,3 row1 AND col5 row1 (4 Red discs). Windows: cols 1-4 → `[R]`
  col4; cols 2-5 → `[R]` col5... col5 occupied. Window cols 1-4 → empty at col4 row1.
  Window cols 2-5 → Red at 2,3,5, empty at 4 → `[R]` col4 row1 (same column as first).
  T4 removes duplicate. Only 1 effective threat.
- **Best concrete hint to try first:** `27374656` — Red plays cols 2,3,4,5 at row1
  (moves 1,3,5,7); Yellow plays cols 7,7,6,6 (moves 2,4,6,8) stacking harmlessly.
  Run visualize_board.sh on this and check how many `[R]` odd threats appear.

**Starting hint:** `27374656`

**Report back to coordinator:**
1. The confirmed movestring (or "HARD").
2. Which three columns/rows hold Red's odd threats.
3. Whether T7 was involved.
4. Full visualize_board.sh output of the confirmed position.

---

### Case v4 — Black wins (even-row threat, no odd threats either side)

**Criteria:**
- After T1–T7, Black has at least one major even-row threat (row 2, 4, or 6).
- Neither player has any uncancelled odd-row threats (V1/V2/V3 don't fire).
- Solver score negative (Black wins).

**Key constraints:**
1. No `[R]` or `[Y]` cells at odd rows in the major threats list.
2. At least one `[Y]` cell at an even row (row 2, 4, or 6).
3. Solver confirms Black wins (negative scr).

**Construction strategy:**
- **Approach A — extend v5:** Start from the v5 Draw position (`42354643256425346355663`,
  23 moves played). Add moves that give Black an even-row threat without creating new
  odd-row threats. Even rows are 2, 4, 6. A row-4 horizontal threat for Yellow needs
  3 Yellow discs in a row at row 4 with one empty in the same row.
- **Approach B — build from scratch:** Construct a position where both players stack
  discs vertically so that Yellow gets a row-4 or row-6 threat, but no row-1/3/5 threats
  form. Example: fill cols 1–4 to row 3 with alternating discs, then continue to row 4
  where Yellow completes a horizontal threat.
- **Critical pitfall:** Any column where one player has 3 discs at rows 1–3 will likely
  create a row-3 or row-1 window. Check carefully. Even-row threats (row 4) require at
  least 3 discs in that row, meaning rows 1–3 of those columns are already filled —
  exactly the situation that creates odd-row threats. This is why V4 is the hardest case.
- **Avoiding odd threats:** To have row-4 Yellow threats without row-1/3 threats, the
  four columns of the row-4 window must have rows 1–3 filled without creating any 3-in-a-row
  windows at rows 1 or 3. This means alternating R/Y at the lower rows is essential.

**Context from v1 agent:** (will be filled in by coordinator after v1 completes)

**Starting hint:** None. Use Gemini from the start.

**Gemini prompt template for v4:**
Ask Gemini to construct a position where:
- Yellow (Black) has 3 discs of the same color in a horizontal 4-window at row 4,
  with the empty cell of the window also at row 4.
- The columns holding those discs have their rows 1–3 filled with alternating Red/Yellow
  discs (no 3-in-a-row for either player at rows 1 or 3).
- Red has no major threats (no `[R]` anywhere in the major threats list).
- The c4solver score is negative (Black wins).

**Report back to coordinator:**
1. The confirmed movestring (or "HARD").
2. Which column/row Black's even-row threat is at.
3. Confirmation that no odd-row threats appear in the major threats list.
4. Full visualize_board.sh output of the confirmed position.

---

## Coordinator instructions

1. **Spawn sub-agents sequentially**: v1 first, then v4.

2. **Pass context forward:** Include v1 findings in the v4 agent's prompt under
   "Context from v1 agent".

3. **Sub-agent task:** Each sub-agent must:
   a. Start with the starting hint if given — run `visualize_board.sh` on it first.
   b. Check the major threats list and `scr` row to verify the criteria.
   c. If the hint works, adopt it immediately (no Gemini call needed).
   d. If the hint fails or none is given, follow the **Gemini-assisted construction
      workflow**: ask Gemini (`gemini-3.1-pro`) for a candidate, verify, iterate up to
      3 Gemini attempts.
   e. If after 3 Gemini attempts the criteria are still not met, mark the case `hard`.
   f. Report the confirmed movestring (or `hard` status) and requested context back
      to the coordinator.

4. **Verification checklist** each sub-agent must complete before returning:
   - [ ] Major threats list shows the correct `[R]`/`[Y]` cells at the right rows.
   - [ ] `scr` row confirms the expected winner (positive=Red, negative=Black, 0=Draw).
   - [ ] No unexpected T-rule violation (e.g., for v4: zero odd-row threats in list).

5. **Final output:** After both agents complete, output a YAML block updating only
   the two remaining entries in `specs/008-new-puzzle-categories/allen_v_rule_examples.yaml`:

```yaml
  v1:
    movestring: "<confirmed or HARD>"
    hard: false  # set to true if all 3 Gemini attempts failed
    last_failure: ""  # fill in if hard=true
    description: "Red wins: 3 Red odd-row threats in separate columns after T1–T7"
  v4:
    movestring: "<confirmed or HARD>"
    hard: false
    last_failure: ""
    description: "Black wins: Black even-row threat, no odd threats either side after T1–T7"
```

---

## Working directory

All commands run from: `/Users/elsonidoq/prog/cuatro_en_linea`

The `visualize_board.sh` script is in the project root. No other setup needed.
