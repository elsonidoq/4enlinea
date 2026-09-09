---
name: reference_c4solver
description: "c4solver score semantics (sign/magnitude, book encoding) + behavioral quirks — the max<0 vs min<0 universality trap, error-not-hang on winning-move strings, the off-by-1 JS formula, exit 137 = stale binary, and why scores go FLAT at forced-win terminals so you must find the forced block with checkWin"
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

## Scores at forced-win terminals are flat — you CANNOT find the forced block from scores
In a true forced-win terminal the initiator holds an immediate winning threat the opponent cannot
actually defuse, so the opponent loses equally fast whatever they play and **all their column scores are
identical**. Never use scores to pick which column to highlight.

Worked example (`traceForcedWin` Case A), 1-indexed: `77435634165667374673756344`. **26 plies played, so
move 27 is odd ⇒ P1 (X/Green) is to move**, and the threat owner is **P2 (O/Gray)**. Scores are
`-8 -8 -8 -8 -8 -1000 -1000` — flat — yet **col 5 is the correct forced block**, because P2 has the
gravity-top major threat there (`visualize_board.sh` prints `col5 row4 (O) [GT]`). Blocking it only
pushes the win one row up to the stacked follow-up cell `col5 row5`, so every line ends on the same ply
and the score stays flat. (The solver *does* betray col 5, but only as an error: appending it prints
`Invalid move at position 27: move in column 5 would create a winning alignment` — an error, not a score.)

**Watch the perspective.** The mover and the threat owner are *different players* here — the flat scores
belong to the player to move (P1), while the win belongs to P2. Getting this backwards is the easy
mistake, and an earlier version of this note had both inverted.

**Correct approach:** place the **threat owner's** (non-mover's) piece at each legal column height and
call `checkWin`; the first column that creates a win is the forced block (return `[playedCol, wc, wc]` —
the mover is forced to `wc`, the threat owner wins at `wc`). This is the same "never infer immediacy
from a score" rule as `immediateWinScore` above. Also in `docs/architecture/server-conventions.md` §"Solver Score Semantics (Critical Invariant)".

## Exit 137 / SIGKILL → stale binary, rebuild
If c4solver crashes with exit 137, ignores flags, or produces wrong output, **delete the binary and recompile before investigating anything else**:
```bash
cd solver-src
rm c4solver
make   # also runs: cp c4solver ../connect-four/server/c4solver
```
Stale object files or a corrupted copy cause silent failures that look like C++ bugs — a full session was once lost chasing a crash that vanished after a clean rebuild. Especially after editing `Solver.cpp`/`main.cpp`.

**Railway:** the committed `connect-four/server/c4solver` is a **macOS ARM64 (Mach-O)** binary and cannot run on Railway's Linux containers — the build must compile from source via `connect-four/nixpacks.toml`. `solver-src/` sits at the **repo root** (sibling of `connect-four/`), so the build command is `cd ../solver-src && make && npm run build`. The Makefile has no macOS-specific flags and yields a correct Linux binary. (`connect-four/railpack.json` now does this too: `cd solver-src && make -B SERVER_DIR=../server && test -f ../server/c4solver`.)

## `skip-worktree` is set on the binary — `git status` LIES about it

On Linux containers (Claude Code on the web) you must rebuild the solver to run anything solver-backed. To keep that rebuild from dirtying the tree, **`connect-four/server/c4solver` carries the git `skip-worktree` bit** (`git ls-files -v` → leading **`S`**). Consequences, all verified 2026-07-25:

- `git status` and `git diff HEAD` report the file **clean** while the on-disk binary is a completely different ELF. There is no warning.
- **`file connect-four/server/c4solver` describes the WORKING TREE, not the commit.** On a rebuilt Linux container it prints `ELF 64-bit LSB … x86-64`, which reads as "the committed binary is Linux". It is not — the blob is still Mach-O arm64. To see what is actually committed: `git cat-file -p HEAD:connect-four/server/c4solver | file -`.
- A subagent made exactly this inference ("the committed binary is already a Linux ELF, `git status` clean on it") and reported it as fact. Both halves were artifacts of the skip-worktree bit.
- **You cannot commit a real solver update while the bit is set** — `git add` is ignored. Clear it first: `git update-index --no-skip-worktree connect-four/server/c4solver`.

Nothing in the repo sets this bit (no script, no hook — grepped); it is applied per-clone/per-container, so its presence varies by machine. Always check `git ls-files -v <path>` before reasoning about the binary's state. Related: [[feedback_verify_at_the_source_layer]].

## A full board makes the solver throw a *generic* error — which masks your own error signal

`c4solver` returns an **empty line** for a position with zero legal columns (a full/drawn board), and
`c4solver-wrapper.js` turns that into a generic `"Invalid position"` throw. Verified 2026-08-02 via
`POST /api/scores`.

The trap is ordering. In `POST /api/scores` the call sequence is `solver.query(moves)` **then**
`chooseSparringMove(...)`. Spec 054 added a `NoLegalMoveError` to `chooseSparringMove` and a handler
translating it to an explicit `400` — but the solver threw first, so the endpoint returned a generic
`500 "internal error"` and the new branch was **unreachable**. The unit test on `chooseSparringMove`
was green the whole time; only a curl against the running server exposed it. The fix is a board-full
guard that runs *before* `solver.query` (`server/index.js`, `POST /api/scores`), guarded by an
ordering assertion in `tests/unit/scoresValidation.test.js`.

**How to apply:** any terminal/edge-case signal you add to a function called *after* a solver query
is dead code unless you also check what the solver does with that same input first. Test the
endpoint, not just the function. Related: [[feedback_verify_at_the_source_layer]].
