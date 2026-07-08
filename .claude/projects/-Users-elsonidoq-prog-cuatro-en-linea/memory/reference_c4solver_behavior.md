---
name: c4solver behavioral quirks
description: c4solver returns an error (not a silent hang) for winning-move strings; scores at won positions are unreliable
type: reference
originSessionId: fc1fb961-5695-4a98-a66a-009449178618
---
## c4solver returns an error for strings that contain a winning move

**Correction (2026-06-06):** c4solver does NOT silently hang on winning-move strings. It returns an error message:

```
Invalid move at position N: move in column C would create a winning alignment
Line 1: Invalid move 7 "4343434"
```

Example: `4343434` — Red gets 4-in-a-row in column 4 on move 7. The solver rejects the 7th move and prints the above error.

However, **scores at won/terminal positions are meaningless** — even if the solver doesn't hang, any score returned for a position reached through a winning move should not be used for game analysis. Guard against this in code before querying the solver.

**Previous "silent hang" observations** may have been caused by the c4solver-wrapper.js not correctly handling the solver's error output (wrapper uses `pending` queue; if the error line doesn't match the expected score line format, the Promise may never resolve). If you encounter hangs: check whether the wrapper correctly parses solver error lines.

Known-bad positions discovered during 008 integration tests (may cause wrapper hangs): `'44334455667711223355'`, `'445566332211'`, `'44556633221144'`, `'4455663'`, `'112233445566'`.

Known-good positions (≥10 moves, verified): `'765432176543'`, `'12345671234567'`, `'12345677654321'`, `'44554433'`, `'441133'`.

## Score formula vs JS implementation

Solver C++ (Solver.cpp line 140):
```cpp
scores[col] = (WIDTH * HEIGHT + 1 - P.nbMoves()) / 2;  // immediate win
```
= `(43 - nbMoves) / 2` (integer division)

JS code:
```js
immediateWinScore(moveCount) = Math.floor((42 - moveCount) / 2)
```

These differ by 1 when `moveCount` is odd. The JS formula underestimates by 1 in those cases. Current code works around this via `>=` comparisons, but the formula itself is wrong.

## Scores at forced-win terminals are flat

When the opponent faces a forced-win position (all moves lose at the same speed), all opponent column scores are identical. Do not use scores to pick which column to highlight — use direct board threat detection instead. See `reference_cat5_forced_block_detection.md`.

## Never use score threshold to detect immediate wins

`immediateWinScore` was deleted from `predicates.js` and `candidate-generator.js` (2026-05-21) because the formula `Math.floor((42 - moveCount) / 2)` produces the same integer for an immediate win and a win-in-2 when `moveCount` is odd.

**Rule**: always use `checkWin` at the gravity-top cell to detect immediate wins — never infer immediacy from a score value. This applies everywhere: `classifier.js`, `predicates.js`, `candidate-generator.js`.


---

## (merged from `feedback_binary_rebuild` — When c4solver crashes unexpectedly (exit 137 / SIGKILL), delete the binary and recompile from source)

If the c4solver binary crashes with exit 137 (SIGKILL) or behaves incorrectly (e.g., ignores flags, produces wrong output), **delete the binary and recompile from scratch**.

```bash
cd solver-src
rm c4solver
make
# This also runs: cp c4solver ../connect-four/server/c4solver
```

**Why:** Stale object files or a corrupted binary copy can cause silent failures that look like bugs in the C++ code. The Makefile copies the fresh binary to `connect-four/server/c4solver` automatically. Spent significant debugging time in one session chasing a crash that was simply a stale binary — the crash vanished after a clean rebuild.

**How to apply:** Before investigating any c4solver crash or unexpected behavior, always try deleting and recompiling first. This is especially true after code changes to `Solver.cpp`, `main.cpp`, or any other solver source file.

**Railway deployment:** The committed binary at `connect-four/server/c4solver` is a **macOS ARM64 (Mach-O)** executable — it cannot run on Railway's Linux containers. The Railway build must compile from source via `connect-four/nixpacks.toml`. The `solver-src/` directory is at the **repo root** (a sibling of `connect-four/`, not inside it); the nixpacks build command is `cd ../solver-src && make && npm run build`. The Makefile has no macOS-specific flags and produces a correct Linux binary.
