# Coordinator prompt: Find Allen V-rule worked example movestrings

## Your role

You are a **coordinator**. Your job is to find concrete Connect Four movestrings that
demonstrate each of the five Allen victory rules (V1–V5). You will spawn one sub-agent
per case, **sequentially**, and pass relevant findings from earlier agents to later ones.

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

## Already-solved movestrings (reuse or adapt these first)

### `42354643256425346355663`
- Red has one odd-row major threat at col1 row3.
- Black has one odd-row major threat at col7 row5.
- T7 cancels both. No threats remain. **V5: Draw. Solver-verified.**
- This also illustrates what a pre-T7 "V3 setup" looks like — one Red odd, one Black
  odd — before they cancel.

### `77273746`
- Red has two odd-row major threats (col1 row1, col5 row1).
- Black has one odd-row major threat (col7 row5).
- T7 cancels one Red threat against Black's one. Remaining: 1 Red odd, 0 Black.
- **V3: Red wins. Solver-verified.**

### `1115222555577773663636617`
- Used in T4/T5 examples. Red has threats in col4 at rows 3 and 5 — same column,
  same parity → T4: only one effective odd-row threat for counting. Useful reference
  for recognizing same-column stacking in the annotated board.

---

## Cases to solve (in this order)

### Case v5 — Draw (no surviving threats)

**Criteria:**
- After T1–T7, neither player has any major threats. Solver score = 0 (Draw).
- The simplest sub-case: Red and Black each had one odd-row threat; T7 cancelled both.

**Starting hint:** `42354643256425346355663` already satisfies this. Verify it by
running `visualize_board.sh`. Check that:
- The major threats list at the bottom is empty (or shows only minor threats, no `[R]`/`[Y]`).
- All `scr` values are 0.
If confirmed, adopt it without further construction.

**Report back to coordinator:**
1. The confirmed movestring.
2. Whether the major threats list was completely empty or had minor threats only.
3. What the `par` row looks like (column parities) — useful for understanding the
   parity structure of draw positions.
4. Any insight about what board states produce clean Draw outcomes.

---

### Case v3 — Red wins (1 Red odd threat, 0 Black odd threats)

**Criteria:**
- After T1–T7, Red has exactly 1 uncancelled odd-row major threat. Black has 0.
- Solver score positive (Red wins). Black may have even-row threats — those don't block V3.

**Starting hint:** `77273746` already demonstrates V3 (after T7 reduces Red's 2 to 1).
Verify it. If confirmed, adopt it. Optionally also look for a cleaner position where
Red has exactly 1 odd threat from the start (no T7 step needed).

**Report back to coordinator:**
1. The confirmed movestring.
2. Which column/row the surviving Red odd threat is in.
3. Whether Black has any even-row threats (showing V3 fires despite them).
4. The `par` value for the column with Red's odd threat.

---

### Case v2 — Black wins (2 Black odd threats, no Red odd)

**Criteria:**
- After T1–T7, Black has exactly 2 uncancelled odd-row major threats in separate
  columns. Red has 0 uncancelled odd-row threats. Solver score negative (Black wins).

**Key constraint:** If Red also has odd threats, T7 cancels pairs. To have 2 Black
threats survive T7 while Red ends at 0, either:
- Red has 0 odd threats to begin with, OR
- Black starts with 3 odd threats and Red has 1 (T7 cancels one pair; 2 Black survive).

**Construction strategy:**
- Black needs major threats on odd rows in two different columns (rows 1, 3, or 5).
  Row 3 is most practical (2 discs already in that column).
- Red must NOT accumulate odd-row threats — steer Red toward even-row threats or
  columns Black isn't using.
- Use v3 findings: knowing what a single Red odd-row threat looks like helps you avoid
  accidentally creating one for Red.

**Report back to coordinator:**
1. The confirmed movestring.
2. Which two columns/rows hold Black's surviving odd threats.
3. Whether Red had odd threats that T7 cancelled, or none at all.
4. Construction insight: how you kept Red's odd-threat count at 0.

---

### Case v1 — Red wins (3+ Red odd threats, odd count)

**Criteria:**
- After T1–T7, Red has ≥ 3 uncancelled odd-row major threats in separate columns
  (targeting exactly 3). Black has 0. Solver score positive (Red wins).

**Key constraint:** T4 — same column, same parity, same player counts as ONE effective
threat. Red's 3 threats must be in THREE DIFFERENT columns.

**Construction strategy:**
- Extend the v3 pattern (1 Red odd threat) to three separate columns.
- Use v2 findings: you know how to build Black odd threats — the same techniques apply
  for Red. Apply them to three Red columns instead.
- Black must end at 0 odd threats. If Black accidentally builds an odd threat, T7 will
  cancel one of Red's three, leaving Red with 2 (even — not V1, not V3, → Draw).
- Target: Red has `[R]` cells on odd rows in cols A, B, C; Black has zero `[Y]` on odd rows.

**Use from earlier agents:**
- From v5: what "no Black odd threats" looks like in the annotated board.
- From v3: what a single Red odd threat looks like — multiply across 3 columns.
- From v2: how to prevent a player from accumulating odd threats.

**Report back to coordinator:**
1. The confirmed movestring.
2. Which three columns/rows hold Red's odd threats.
3. Whether T7 was involved.

---

### Case v4 — Black wins (even-row threat, no odd threats either side)

**Criteria:**
- After T1–T7, Black has at least one major even-row threat (row 2, 4, or 6).
  Neither player has any uncancelled odd-row threats (V1/V2/V3 don't fire).
  Solver score negative (Black wins).

**Key constraint:** This is the hardest case. You need:
1. No odd-row `[R]` or `[Y]` anywhere in the major threats list.
2. At least one `[Y]` on an even row.
3. Solver confirms Black wins.

**Construction strategy:**
- Start from the v5 Draw position (no threats after T7). Then see if adding Black
  discs to create an even-row threat tips the solver score negative — if so, you
  have a V4 example.
- Alternatively: build a position where Black has a row-4 or row-6 threat and Red
  has only even-row threats (which T6 removes, leaving Black's even-row threat
  decisive).
- Avoid any odd-row 4-windows with 3 discs of one color — those would create odd
  threats that would trigger V1/V2/V3 instead.

**Use from earlier agents:**
- From v5: the draw movestring is a safe starting point — no threats. Extend it.
- From v3/v2: how to avoid creating odd-row threats while maneuvering.

**Report back to coordinator:**
1. The confirmed movestring.
2. Which column/row Black's even-row threat is.
3. Confirmation that no odd-row threats appear in the major threats list.

---

## Coordinator instructions

1. **Spawn sub-agents sequentially** in this order: v5 → v3 → v2 → v1 → v4.

2. **Pass context forward:** Before spawning each sub-agent, read the previous agent's
   report and include its findings verbatim (or summarized) in the new sub-agent's
   prompt under a "Context from prior agents" section. Specifically:
   - v3 prompt: include v5 findings.
   - v2 prompt: include v5 and v3 findings.
   - v1 prompt: include v5, v3, and v2 findings.
   - v4 prompt: include all prior findings.

3. **Sub-agent task:** Each sub-agent must:
   a. Start with the "starting hint" movestring if one is given — run `visualize_board.sh`
      on it first.
   b. Check the major threats list and `scr` row to verify the criteria.
   c. If the hint works, adopt it. If not, iterate: modify the movestring (add/remove
      moves), re-run `visualize_board.sh`, check again. Repeat until criteria are met.
   d. Report the confirmed movestring and requested context back to the coordinator.

4. **Verification checklist** each sub-agent must complete before returning:
   - [ ] Major threats list shows the correct `[R]`/`[Y]` cells at the right rows.
   - [ ] `scr` row confirms the expected winner (positive=Red, negative=Black, 0=Draw).
   - [ ] No unexpected T-rule is still active (e.g., if odd threats should be cancelled,
         the `scr` row should reflect the post-cancellation outcome).

5. **Final output:** After all five agents complete, output a YAML block:

```yaml
allen_v_rule_examples:
  v1:
    movestring: "<confirmed>"
    description: "Red wins: 3 Red odd-row threats in separate columns after T1–T7"
  v2:
    movestring: "<confirmed>"
    description: "Black wins: 2 Black odd-row threats in separate columns after T1–T7"
  v3:
    movestring: "<confirmed>"
    description: "Red wins: 1 Red odd-row threat, 0 Black odd-row threats after T1–T7"
  v4:
    movestring: "<confirmed>"
    description: "Black wins: Black even-row threat, no odd threats either side after T1–T7"
  v5:
    movestring: "<confirmed>"
    description: "Draw: no surviving threats after T1–T7"
```

---

## Working directory

All commands run from: `/Users/elsonidoq/prog/cuatro_en_linea`

The `visualize_board.sh` script is in the project root. No other setup needed.
