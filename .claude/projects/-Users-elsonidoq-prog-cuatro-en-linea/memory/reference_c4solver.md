---
name: reference_c4solver
description: "c4solver score semantics (sign/magnitude, book encoding) + behavioral quirks — the max<0 vs min<0 universality trap, error-not-hang on winning-move strings, the off-by-1 JS formula, and exit 137 = stale binary"
metadata:
  node_type: memory
  type: reference
---

Merged from `reference_c4solver_scores` + `reference_c4solver_behavior` (which had themselves absorbed `reference_c4solver_score_universality` and `feedback_binary_rebuild`).

# 1. Score semantics

## Sign — always from the **current player to move**
- `> 0`: current player wins with best play · `= 0`: draw · `< 0`: current player loses with best play

## Magnitude — higher |score| = outcome decided **sooner**

| Score | Meaning |
|-------|---------|
| `+18` | Current player wins **next move** (earliest possible win, 6 moves played) |
| `+1`  | Current player wins very late (~move 41) |
| `-1`  | Current player loses very late (~move 41) |
| `-18` | Current player loses next move regardless (opponent has ≥2 winning threats) |

7×6 constants: `MIN_SCORE = -18`, `MAX_SCORE = +18`.

## Exact formulas (Solver.cpp)
- **Win next move**: `score = (43 - nbMoves) / 2`
- **Loss (no non-losing moves)**: `score = -(42 - nbMoves) / 2`
- Inverse: win ends at move `≈ 43 - 2*score`; loss ends at move `≈ 42 + 2*score`

## Validated examples
```
""       → +1   P1 wins, decided around move 41
"4"      → -1   P2 to move, loses (same game, opposite perspective)
"121212" → +18  P1 can win immediately (vertical in col 1)
"121212" -a → col1=+18, col2=-3, cols3-7=-18
```
`-a` (analyze) returns per-column scores in this same convention.

## Opening book encoding
Book stores offsets so that 0 == "not in book":
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

`book.get(P)` returns 0 if not in book. Decode in Solver.cpp: `return val + Position::MIN_SCORE - 1`. In `explainSearch`, negate — the book stores P2's score but we need P1's perspective: `int score = bval ? -(bval + MIN_SCORE - 1) : 0`.

# 2. THE TRAP: `max(scores) < 0` (ALL lose) vs `min(scores) < 0` (SOME loses)

- `max(scores) > 0` — current player has at least one winning move
- `max(scores) < 0` — **ALL** moves lose (opponent has a forced win regardless)
- `max(scores) === 0` — best achievable is a draw
- `min(scores) < 0` — **SOME** move loses — *not* the same as a forced loss

**The critical trap:** when checking a score-based pattern for a **non-moving** player (e.g. `forbidden_columns` / `forced_block` for `opponent` at a position where `blunderer` is to move), you cannot negate the scores and check `max(-scores) > 0`. That is equivalent to `min(scores) < 0` — only SOME move is bad. The correct check is `max(scores) < 0` — ALL moves are bad.

Generally, for a predicate `P(ms, perspective)` where `perspective ≠ currentPlayer`, a naive sign flip gives **existential** semantics when you need **universal** semantics. Use recursion instead: for all playable columns `c`, check `P(ms + c, perspective)`. Encoded as FR-033 in `specs/023-patterns-blunders-epic1/spec.md`.

**Scope:** affects the score-consuming detectors in `classifier.js` — `detectForbiddenColumns`, `detectForcedBlock`, `detectZThreat`, `detectOddEvenThreat` (each takes a `scores` arg). **NOT** `detectForcedWin`: its signature is `detectForcedWin(board, perspective)`, it consumes no scores, and it handles `perspective ≠ currentPlayer` structurally via internal `withMove` recursion. The `forced_win` PATTERN is structural — never reach for a score check to detect it. See `docs/architecture/server-conventions.md` §Classifier API.

# 3. Behavioral quirks

## Error, NOT a silent hang, on winning-move strings
**Correction (2026-06-06):** c4solver does not silently hang on a movestring containing a winning move — it errors:
```
Invalid move at position N: move in column C would create a winning alignment
Line 1: Invalid move 7 "4343434"
```
**Scores at won/terminal positions are meaningless** regardless — guard before querying.

Apparent "silent hangs" are usually `c4solver-wrapper.js` failing to parse the error line: the wrapper uses a `pending` queue, and an error line that doesn't match the expected score format leaves the Promise unresolved. If you hit a hang, check the wrapper's error-line parsing first.

Known-bad positions (may hang the wrapper, from 008 integration tests): `'44334455667711223355'`, `'445566332211'`, `'44556633221144'`, `'4455663'`, `'112233445566'`.
Known-good (≥10 moves, verified): `'765432176543'`, `'12345671234567'`, `'12345677654321'`, `'44554433'`, `'441133'`.

## The JS score formula is off by one
Solver C++ (`Solver.cpp:140`): `scores[col] = (WIDTH * HEIGHT + 1 - P.nbMoves()) / 2;` = `(43 - nbMoves) / 2`.
JS: `immediateWinScore(moveCount) = Math.floor((42 - moveCount) / 2)`.
These differ by 1 when `moveCount` is **odd** — the JS formula underestimates. Current code works around it with `>=` comparisons, but the formula itself is wrong.

## Never use a score threshold to detect immediate wins
`immediateWinScore` was deleted from `predicates.js` and `candidate-generator.js` (2026-05-21): `Math.floor((42 - moveCount) / 2)` yields the same integer for an immediate win and a win-in-2 when `moveCount` is odd. **Rule:** always use `checkWin` at the gravity-top cell — never infer immediacy from a score. Applies in `classifier.js`, `predicates.js`, `candidate-generator.js`.

## Scores at forced-win terminals are flat
When the opponent faces a forced win, all their column scores are identical. Never use scores to pick which column to highlight — use direct board threat detection. See [[reference_cat5_forced_block_detection]].

## Exit 137 / SIGKILL → stale binary, rebuild
If c4solver crashes with exit 137, ignores flags, or produces wrong output, **delete the binary and recompile before investigating anything else**:
```bash
cd solver-src
rm c4solver
make   # also runs: cp c4solver ../connect-four/server/c4solver
```
Stale object files or a corrupted copy cause silent failures that look like C++ bugs — a full session was once lost chasing a crash that vanished after a clean rebuild. Especially after editing `Solver.cpp`/`main.cpp`.

**Railway:** the committed `connect-four/server/c4solver` is a **macOS ARM64 (Mach-O)** binary and cannot run on Railway's Linux containers — the build must compile from source via `connect-four/nixpacks.toml`. `solver-src/` sits at the **repo root** (sibling of `connect-four/`), so the build command is `cd ../solver-src && make && npm run build`. The Makefile has no macOS-specific flags and yields a correct Linux binary.
