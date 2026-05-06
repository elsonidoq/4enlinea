---
name: c4solve score semantics
description: Sign/magnitude meaning of c4solver scores, book encoding, and validated examples for the 7x6 board
type: reference
---

## Sign
Always from the **current player to move**:
- `> 0`: current player wins with best play
- `= 0`: draw
- `< 0`: current player loses with best play

## Magnitude — how soon the outcome is determined
Higher absolute value = outcome decided **sooner**.

| Score | Meaning |
|-------|---------|
| `+18` | Current player wins **next move** (earliest possible win, 6 moves played) |
| `+1`  | Current player wins very late (~move 41) |
| `-1`  | Current player loses very late (~move 41) |
| `-18` | Current player loses next move regardless (opponent has ≥2 winning threats) |

Board constants for 7×6: `MIN_SCORE = -18`, `MAX_SCORE = +18`.

## Exact formulas (Solver.cpp)
- **Win next move**: `score = (43 - nbMoves) / 2`
- **Loss (no non-losing moves)**: `score = -(42 - nbMoves) / 2`
- Inverse: win ends at move `≈ 43 - 2*score`; loss ends at move `≈ 42 + 2*score`

## Validated examples
```
""       → +1   P1 wins, decided around move 41
"4"      → -1   P2 to move, loses (consistent: same game, opposite perspective)
"121212" → +18  P1 can win immediately (4-in-a-row vertically in col 1)
"121212" -a → col1=+18, col2=-3, cols3-7=-18
```
The `-a` (analyze) flag returns per-column scores using this same convention.

## Opening book encoding
Book stores offset values so that 0 == "not in book":

```
book_val = score - MIN_SCORE + 1 = score + 19
score    = book_val + MIN_SCORE - 1 = book_val - 19
```

| score | book_val |
|-------|----------|
| -18   | 1        |
| -1    | 18       |
| 0     | 19       |
| +1    | 20       |
| +18   | 37       |

In code: `book.get(P)` returns 0 if not in book, otherwise the encoded value.
Decode in Solver.cpp: `return val + Position::MIN_SCORE - 1`.
In explainSearch, negate because book stores score for P2 but we need P1's perspective:
`int score = bval ? -(bval + MIN_SCORE - 1) : 0`.
