# Winning-cell distribution grid

Computes, for each pairing of two playing policies, the probability that a board
cell is part of the winning four-in-a-row — separately for player-1 wins and
player-2 wins. It answers: *given how the two sides play, where do wins actually
get completed on the board?*

The quantity is only defined relative to a play policy (under perfect play the
second player never wins, so that distribution is all-zero for P2). So the
experiment sweeps a **4×4 grid** of policies — every policy for player 1 against
every policy for player 2, 16 pairings in total.

## Policies

| name | behavior |
|---------|----------|
| `optimal` | uniform over all solver-optimal moves |
| `mp10` | with prob 0.10 play a uniformly random legal move (a mistake), else `optimal` |
| `mp25` | same, with prob 0.25 |
| `blocker` | solver-free: take own win-in-1 → else block opponent win-in-1 → else random among columns that don't hand the opponent a win-on-top |

Any pairing is written `<p1>:<p2>`, e.g. `optimal:blocker` = perfect player 1 vs
random blocker player 2.

## Pipeline

Three stages, each a standalone module:

1. **`policies.mjs`** — the four policy factories (`makePolicy(name)`, `POLICY_NAMES`).
2. **`run_grid.mjs`** — Monte-Carlo runner. Self-plays games via
   `playPolicyGame` (in `../../gameSampling.js`), classifies the winning
   structure of each finished game via `winningCells.mjs` (`extractOutcome`),
   and appends one JSON line per game to `data/games_<p1>_<p2>.jsonl`.
3. **`aggregate.mjs`** — folds the per-game JSONL files into `data/summary.json`:
   per combo and per winning player, a 6×7 `P(cell ∈ winning four | that player
   wins)` heatmap, win/draw rates, mean game length, and odd/even-row parity mass.

`data/` is gitignored — game logs and `summary.json` are reproducible artifacts,
not committed.

## Quick check (one cell, ~2 minutes)

Sanity-check the whole pipeline on a single interesting pairing before committing
to the full run. `mp25:mp25` is a good choice — both players win frequently, so
both heatmaps fill in.

```bash
cd connect-four/server/scripts/win_distribution

# ~1:47 on a laptop; both players get ~800–950 wins
node run_grid.mjs --combos mp25:mp25 --target-wins 100000 --max-games 1800 --seed 42

# fold into data/summary.json and print a one-line-per-combo table
node aggregate.mjs
```

(The high `--target-wins` keeps the win target from binding, so `--max-games`
alone bounds the run to a fixed, fast game count.)

Expected: the printed table shows `oddMassP1` ≈ 0.64 and `oddMassP2` ≈ 0.41
(i.e. P2's even-row mass ≈ 0.59). First-player wins concentrate on **odd** rows,
second-player wins on **even** rows — Allen's parity result, reproduced with no
parity logic in the code. Both heatmaps are center-column heavy.

## Full 16-cell run

Runs all 16 pairings to tight statistics. **This is a long job** — expect
**~3–6 hours** of solver compute. The cost is dominated by the pairings with a
perfect player 1 (`optimal:optimal`, `optimal:mp10`, `optimal:mp25`): player 2
never wins those, so they run all the way to the `--max-games` cap.

```bash
cd connect-four/server/scripts/win_distribution

# all 16 combos, 10k wins/side target, 30k-game hard cap, base seed 42
node run_grid.mjs --seed 42 --target-wins 10000 --max-games 30000

# then aggregate everything into data/summary.json
node aggregate.mjs
```

The runner is **resumable and idempotent**: re-running the same command continues
each combo after its highest recorded game index (per-game seeds are derived from
`--seed` and the game index alone, so nothing replays or shifts). If the job is
interrupted — or the solver IPC hangs, a known failure mode — just re-run the same
command to pick up where it left off. You can also run subsets and extend later:

```bash
# run a few combos now...
node run_grid.mjs --combos optimal:blocker,mp25:mp25,blocker:blocker
# ...and extend an existing combo to more wins later (appends, never duplicates)
node run_grid.mjs --combos mp25:mp25 --target-wins 20000
```

Tips:
- **Faster first pass:** lower `--target-wins`/`--max-games` (e.g. `--target-wins
  3000 --max-games 8000`, ~45–75 min) gives visually identical heatmaps; extend
  to full precision later since the output is resumable.
- **Background it:** the run prints progress every 200 games per combo; redirect
  to a log and run detached for the full sweep.

## Output formats

**`data/games_<p1>_<p2>.jsonl`** — one line per game:

```json
{"g": 0, "ms": "3342...", "winner": 1, "cells": [[3,0],[3,1],[3,2],[3,3]], "plies": 7}
```

`winner` is `1`, `2`, or `null` (draw). `cells` are `[col, row]` pairs (0-indexed,
row 0 = bottom) of the union of every completed four-window through the deciding
move. `g` is the game index; `plies` the game length.

**`data/summary.json`** — keyed `"<p1>__<p2>"`:

```jsonc
{
  "mp25__mp25": {
    "games": 1800, "p1Wins": 961, "p2Wins": 769, "draws": 70, "meanPlies": 24.9,
    "heatmaps": { "1": [[...6 rows × 7 cols...]], "2": [[...]] },  // null if that player never wins
    "parity":   { "1": { "oddRowMass": 0.644, "evenRowMass": 0.356 }, "2": { ... } }
  }
}
```

`heatmaps[p][row][col]` = `P(cell ∈ winning four | player p wins)`, with row 0 =
bottom. `oddRowMass` is the mean fraction of a winning game's cells that sit on
odd 1-indexed rows (rows 1, 3, 5), per `docs/knowledge-base/allen-parity.md`.

## Tests

Unit tests live in `connect-four/server/tests/winDistribution.*.test.mjs` and run
under `npm run test:fast` (from `connect-four/`). `run_grid.mjs` has no unit test —
it is validated by the quick-check recipe above.
