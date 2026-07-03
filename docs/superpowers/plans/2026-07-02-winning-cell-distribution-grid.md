# Winning-Cell Distribution Grid (4×4 Policy Matrix) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compute, for every pairing of 4 playing policies (P1 policy × P2 policy = 16 combos), the per-cell probability that a board cell is part of the winning four-in-a-row structure, separately for player-1 wins and player-2 wins — a data-science exploration of how winning-cell heatmaps shift with player strength.

**Architecture:** A new policy-driven game generator `playPolicyGame` is added to the canonical simulation harness `gameSampling.js` (without touching the existing `playGame`, whose rng draw order is load-bearing for candidate-generator determinism). Four policy functions (uniform-optimal, ε=0.10 uniform-legal mistakes, ε=0.25, defensive random blocker) live in a new `scripts/win_distribution/` folder alongside a Monte-Carlo runner that writes resumable per-combo JSONL, and an aggregator that produces per-combo/per-winner 6×7 probability grids plus summary stats. Solver queries are lazy: a game ply only pays a solver call if the acting policy asks for scores, so blocker-vs-blocker runs solver-free.

**Tech Stack:** Node.js ESM (`.mjs` scripts), `node:test` + `node:assert/strict`, existing `c4solver-wrapper.js` persistent solver, existing `classifier.js` board primitives (`parseBoardState`, `checkWin`, `hasWon`, `getWinningWindows`).

## Global Constraints

- All coordinates 0-indexed: row 0 = bottom, col 0 = leftmost. Movestrings are 0-indexed digit strings (`docs/architecture/server-conventions.md`).
- Player parity from move count: even ply index = player 1, odd = player 2.
- **Do NOT modify `playGame` / `sampleColMP` / `simulateGame` / `harvestBlunders` in `gameSampling.js`** — changing their rng usage shifts candidate-generator output (memory: `project_gamesampling_rng_determinism_trap`). Only add new exports.
- The persistent solver hangs on an empty movestring; use `EMPTY_BOARD_SCORES = [0, 0, 1, 2, 1, 0, 0]` for `ms === ''` (server-conventions).
- Solver queries are serialized by the wrapper's promise chain; always `destroy()` the solver in a `finally` (memory: `reference_inline_node_scripts`).
- Tests use `node:test`, live in `connect-four/server/tests/`, run via `npm run test:fast` inside `connect-four/` (never bare `npm test`).
- Every CLI script ships a real `--help` (purpose + options + defaults), checked before required-arg validation (memory: `feedback_scripts_meaningful_help`).
- Full column solver score sentinel: `INVALID_MOVE = -1000`.

## Locked design decisions (from user Q&A)

1. **Policies (same 4 for both players):**
   - `optimal` — uniform over all legal moves with the max solver score.
   - `mp10` / `mp25` — with prob ε (0.10 / 0.25) play uniformly over ALL legal columns (may coincide with an optimal move); otherwise uniform over optimal.
   - `blocker` — no solver: take own win-in-1 if any (uniform among them), else block an opponent win-in-1 (uniform among them), else uniform among columns that don't give the opponent a win-in-1 on top ("forbidden"), falling back to all legal if every column is forbidden.
2. **Metric:** per game, the winning structure = union of cells of every completed 4-window through the winning move. Heatmap value = P(cell ∈ winning structure | that player won, combo). Draws recorded with `winner: null`.
3. **Budget:** Monte Carlo. Per combo: stop when BOTH players have ≥ `--target-wins` (default 10000) wins, or `--max-games` (default 30000) games, whichever first. (In combos with a perfect P1, P2 never wins — the cap is what terminates those.)
4. **Reproducibility:** each game `g` in a combo uses its own `mulberry32` rng seeded from `(baseSeed ^ (g * 0x9E3779B9)) >>> 0`, so resuming from a partial JSONL never replays or shifts games.

## File structure

- Modify: `connect-four/server/gameSampling.js` — add `playPolicyGame` (new export only).
- Create: `connect-four/server/scripts/win_distribution/policies.mjs` — the 4 policy factories + `POLICY_NAMES`.
- Create: `connect-four/server/scripts/win_distribution/winningCells.mjs` — `extractOutcome(ms)`.
- Create: `connect-four/server/scripts/win_distribution/run_grid.mjs` — CLI Monte-Carlo runner.
- Create: `connect-four/server/scripts/win_distribution/aggregate.mjs` — CLI aggregator → `summary.json`.
- Test: `connect-four/server/tests/winDistribution.policies.test.mjs`
- Test: `connect-four/server/tests/winDistribution.winningCells.test.mjs`
- Test: `connect-four/server/tests/winDistribution.playPolicyGame.test.mjs`
- Test: `connect-four/server/tests/winDistribution.aggregate.test.mjs`
- Output (gitignored data, not committed): `connect-four/server/scripts/win_distribution/data/games_<p1>_<p2>.jsonl`, `data/summary.json`.

---

### Task 1: `playPolicyGame` generator in gameSampling.js

**Files:**
- Modify: `connect-four/server/gameSampling.js` (append after `harvestBlunders`)
- Test: `connect-four/server/tests/winDistribution.playPolicyGame.test.mjs`

**Interfaces:**
- Consumes: `hasWon` from `./classifier.js` (already imported in the file).
- Produces: `export async function* playPolicyGame(solver, policies, rng)` where `policies` is `[p1Policy, p2Policy]` and each policy is `async ({ ms, board, heights, player, legal, getScores, rng }) => number` (0-indexed column). Yields per ply `{ ms, player, movePlayed, plyIndex, scores }` (`scores` is `null` unless the policy called `getScores()`); the yielded `ms` is the movestring BEFORE the move, matching `playGame`'s contract. Stops at win or full board.

- [ ] **Step 1: Write the failing test**

```js
// connect-four/server/tests/winDistribution.playPolicyGame.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { playPolicyGame } from '../gameSampling.js';

function fixedCol(col) {
  return async () => col;
}

test('playPolicyGame plays policies alternately and stops on a win', async () => {
  // P1 always col 0, P2 always col 1 → P1 wins vertically after 7 plies: "0101010"
  const solver = { query: async () => { throw new Error('solver must not be called'); } };
  const plies = [];
  let finalMs = '';
  for await (const p of playPolicyGame(solver, [fixedCol(0), fixedCol(1)])) {
    plies.push(p);
    finalMs = p.ms + String(p.movePlayed);
  }
  assert.equal(finalMs, '0101010');
  assert.equal(plies.length, 7);
  assert.deepEqual(plies.map(p => p.player), [1, 2, 1, 2, 1, 2, 1]);
  assert.equal(plies[3].ms, '010');   // ms is the position BEFORE the move
  assert.equal(plies[0].scores, null); // no policy asked for scores
});

test('playPolicyGame getScores is lazy, memoized, and uses EMPTY_BOARD_SCORES for the empty board', async () => {
  let queries = 0;
  const solver = { query: async (ms) => { queries++; return [0, 0, 0, 3, 0, 0, 0]; } };
  const greedy = async ({ getScores, legal }) => {
    const s1 = await getScores();
    const s2 = await getScores(); // memoized — must not re-query
    assert.deepEqual(s1, s2);
    return legal.reduce((b, c) => (s1[c] > s1[b] ? c : b), legal[0]);
  };
  const gen = playPolicyGame(solver, [greedy, greedy]);
  const first = (await gen.next()).value;
  assert.equal(first.movePlayed, 3);            // argmax of EMPTY_BOARD_SCORES
  assert.deepEqual(first.scores, [0, 0, 1, 2, 1, 0, 0]);
  assert.equal(queries, 0);                     // empty board never hits the solver
  const second = (await gen.next()).value;
  assert.equal(queries, 1);                     // one memoized query for ply 2
  await gen.return();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/elsonidoq/prog/cuatro_en_linea/connect-four && node --test server/tests/winDistribution.playPolicyGame.test.mjs`
Expected: FAIL — `playPolicyGame` is not exported.

- [ ] **Step 3: Write the implementation**

Append to `connect-four/server/gameSampling.js`:

```js
const EMPTY_BOARD_SCORES = [0, 0, 1, 2, 1, 0, 0]; // persistent solver hangs on empty input

/**
 * Policy-driven variant of `playGame` for strategy experiments. Unlike `playGame`
 * (whose mistake model and rng draw order are frozen — candidate-generator
 * determinism depends on them), each player here is an arbitrary async policy:
 *
 *   policy({ ms, board, heights, player, legal, getScores, rng }) → 0-indexed col
 *
 * `getScores()` lazily queries the solver for the current position and memoizes
 * it for the ply, so solver-free policies cost zero solver calls.
 *
 * Yields per ply (BEFORE the move is applied):
 *   { ms, player, movePlayed, plyIndex, scores }  // scores null if never fetched
 *
 * @param {object} solver  c4solver wrapper
 * @param {[Function, Function]} policies  [player1Policy, player2Policy]
 * @param {() => number} rng  random source in [0, 1)
 */
export async function* playPolicyGame(solver, policies, rng = Math.random) {
  let ms = '';
  const heights = Array(COLS).fill(0);
  const board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  let player = 1;
  let plyIndex = 0;

  while (ms.length < COLS * ROWS) {
    const legal = [];
    for (let c = 0; c < COLS; c++) { if (heights[c] < ROWS) legal.push(c); }
    if (!legal.length) break;

    let scores = null;
    const msNow = ms;
    const getScores = async () => {
      if (scores === null) {
        scores = msNow === '' ? EMPTY_BOARD_SCORES : await solver.query(msNow);
      }
      return scores;
    };

    const movePlayed = await policies[player - 1]({ ms, board, heights, player, legal, getScores, rng });

    yield { ms, player, movePlayed, plyIndex, scores };

    ms += String(movePlayed);
    board[heights[movePlayed]][movePlayed] = player;
    heights[movePlayed]++;
    plyIndex++;

    if (hasWon(board, player)) break;
    player = 3 - player;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/elsonidoq/prog/cuatro_en_linea/connect-four && node --test server/tests/winDistribution.playPolicyGame.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 5: Guard the determinism trap — run the fast suite**

Run: `cd /Users/elsonidoq/prog/cuatro_en_linea/connect-four && npm run test:fast`
Expected: PASS with no new failures (the addition must not disturb existing `playGame` behavior; compare failures against a pre-change run if any appear — memory `project_classifier_current_state` notes some pre-existing failures may exist).

- [ ] **Step 6: Commit**

```bash
git add connect-four/server/gameSampling.js connect-four/server/tests/winDistribution.playPolicyGame.test.mjs
git commit -m "feat(win-dist): add policy-driven playPolicyGame to game sampling harness"
```

---

### Task 2: Policy factories

**Files:**
- Create: `connect-four/server/scripts/win_distribution/policies.mjs`
- Test: `connect-four/server/tests/winDistribution.policies.test.mjs`

**Interfaces:**
- Consumes: `checkWin` from `../../classifier.js` (relative to `scripts/win_distribution/`); the policy call signature from Task 1.
- Produces:
  - `export const POLICY_NAMES = ['optimal', 'mp10', 'mp25', 'blocker'];`
  - `export function makePolicy(name)` → policy function per Task 1's signature. `makePolicy('optimal')`, `makePolicy('mp10')` (ε=0.10), `makePolicy('mp25')` (ε=0.25), `makePolicy('blocker')`.

**Semantics to implement exactly:**
- `optimal`: `scores = await getScores()`; uniform over legal cols with max score.
- `mpXX`: first rng draw decides mistake (`rng() < eps`) → uniform over ALL legal (second rng draw), **without calling getScores** (saves ~ε of solver calls); otherwise same as `optimal`.
- `blocker` (solver-free): evaluate on the pre-move board — correct because the blocker's own disc can neither create nor block an opponent window through the landing cell (the supporting cell is empty either way):
  1. own win-in-1: `legal.filter(c => checkWin(board, heights[c], c, player))` → uniform pick if non-empty;
  2. else block: same filter with `3 - player` → uniform pick if non-empty;
  3. else safe columns: `legal.filter(c => heights[c] + 1 >= 6 || !checkWin(board, heights[c] + 1, c, 3 - player))` → uniform pick, falling back to `legal` if empty.

- [ ] **Step 1: Write the failing test**

```js
// connect-four/server/tests/winDistribution.policies.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makePolicy, POLICY_NAMES } from '../scripts/win_distribution/policies.mjs';
import { parseBoardState } from '../classifier.js';

function ctx(ms, { scores = null, rng = Math.random } = {}) {
  const { board, colHeights } = parseBoardState(ms);
  const legal = [];
  for (let c = 0; c < 7; c++) if (colHeights[c] < 6) legal.push(c);
  const player = ms.length % 2 === 0 ? 1 : 2;
  let fetched = false;
  return {
    ms, board, heights: colHeights, player, legal, rng,
    getScores: async () => { fetched = true; return scores; },
    wasFetched: () => fetched,
  };
}

test('POLICY_NAMES lists the 4 policies', () => {
  assert.deepEqual(POLICY_NAMES, ['optimal', 'mp10', 'mp25', 'blocker']);
});

test('optimal picks uniformly among argmax columns', async () => {
  const p = makePolicy('optimal');
  const seen = new Set();
  for (let i = 0; i < 200; i++) {
    const c = ctx('', { scores: [5, -1, 5, 2, 5, -1000, 0] });
    seen.add(await p(c));
  }
  assert.deepEqual([...seen].sort(), [0, 2, 4]);
});

test('mp policies: mistake branch is uniform over legal and skips the solver', async () => {
  const p = makePolicy('mp25');
  // rng sequence: first draw 0.1 (< 0.25 → mistake), second draw 0.99 → last legal col
  const draws = [0.1, 0.99];
  const c = ctx('', { rng: () => draws.shift() });
  const col = await p(c);
  assert.equal(col, 6);
  assert.equal(c.wasFetched(), false);
});

test('mp policies: non-mistake branch plays optimal', async () => {
  const p = makePolicy('mp10');
  const draws = [0.5, 0.0]; // 0.5 >= 0.10 → optimal branch; 0.0 → first of the tied best
  const c = ctx('', { scores: [0, 0, 1, 2, 1, 0, 0], rng: () => draws.shift() });
  assert.equal(await p(c), 3);
  assert.equal(c.wasFetched(), true);
});

test('blocker takes its own win-in-1', async () => {
  // "0101010" minus the last move: "010101" — P1 to move, col 0 wins (3 discs stacked)
  const p = makePolicy('blocker');
  assert.equal(await p(ctx('010101')), 0);
});

test('blocker blocks the opponent win-in-1', async () => {
  // "001122" → P2 has nothing; P1 threatens 3 at row 0? Build explicitly:
  // ms "010101": if it were P2 to move they must block col 0.
  // Use "0101013" (P1 played col3 instead of winning is illegal to construct that way),
  // so instead: ms "343404" → P1 discs at col3(r0),col3(r2)?? — use a vertical:
  // "010102" : plies P1:0, P2:1, P1:0, P2:1, P1:0, P2:2 — invalid, P2 already moved.
  // Simplest legal: "01010" — P2 to move, P1 has 3 stacked in col 0 → must block col 0.
  const p = makePolicy('blocker');
  assert.equal(await p(ctx('01010')), 0);
});

test('blocker avoids forbidden columns (opponent wins on top)', async () => {
  // P1 has 3 stacked in col 0 rows 1..3? Construct: "102030" ply-by-ply:
  // P1:1, P2:0, P1:2, P2:0, P1:3, P2:0 → P2 has 3 stacked in col 0 (rows 0,1,2), P1 to move.
  // P1 (blocker) must treat col 0 as a BLOCK (opponent win-in-1), so use it to
  // test blocking-first; forbidden test needs opponent threat one row above landing:
  // "1020304" → P1:1, P2:0, P1:2, P2:0, P1:3, P2:0, P1:4 — now P2 to move with
  // 3 stacked in col 0 → own win, not forbidden. A true forbidden fixture must be
  // built with visualize_board.sh during implementation (see Step 2 note).
  const p = makePolicy('blocker');
  assert.equal(await p(ctx('102030')), 0); // blocks the vertical
});
```

- [ ] **Step 2: Fix the forbidden-column fixture properly**

The last two fixtures above cover win/block. For the *forbidden* branch, construct a real movestring during implementation: run `./visualize_board.sh <candidate>` from the project root until you have a position where (a) the mover has no win-in-1, (b) the opponent has no win-in-1, (c) exactly one column c has an opponent major threat at `heights[c] + 1`. A known shape: opponent has 3-in-a-row horizontally on row 1 with the completing cell at row 1 of column c and column c currently at height 0 → playing c gives the opponent the completion on top? (No — completion is AT row 1, so landing at row 0 lets the opponent play row 1: that is the forbidden shape.) Verify with the script, then assert the blocker never returns c over 100 trials. Do not skip this: memory `feedback_no_random_boards` — never invent movestrings blindly, verify with `visualize_board.sh`.

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd /Users/elsonidoq/prog/cuatro_en_linea/connect-four && node --test server/tests/winDistribution.policies.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 4: Write the implementation**

```js
// connect-four/server/scripts/win_distribution/policies.mjs
import { checkWin } from '../../classifier.js';

const ROWS = 6;

export const POLICY_NAMES = ['optimal', 'mp10', 'mp25', 'blocker'];

function pickUniform(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}

function argmaxCols(scores, legal) {
  const best = Math.max(...legal.map(c => scores[c]));
  return legal.filter(c => scores[c] === best);
}

function makeOptimal() {
  return async ({ legal, getScores, rng }) => {
    const scores = await getScores();
    return pickUniform(argmaxCols(scores, legal), rng);
  };
}

function makeEpsilonUniform(eps) {
  return async ({ legal, getScores, rng }) => {
    if (rng() < eps) return pickUniform(legal, rng); // mistake: no solver call
    const scores = await getScores();
    return pickUniform(argmaxCols(scores, legal), rng);
  };
}

// Defensive random player, solver-free. Pre-move board is sufficient: the
// mover's own disc can neither create nor remove an opponent window through
// the landing cell (that supporting cell is empty in both evaluations).
function makeBlocker() {
  return async ({ board, heights, player, legal, rng }) => {
    const opp = 3 - player;
    const ownWins = legal.filter(c => checkWin(board, heights[c], c, player));
    if (ownWins.length) return pickUniform(ownWins, rng);
    const blocks = legal.filter(c => checkWin(board, heights[c], c, opp));
    if (blocks.length) return pickUniform(blocks, rng);
    const safe = legal.filter(c => heights[c] + 1 >= ROWS || !checkWin(board, heights[c] + 1, c, opp));
    return pickUniform(safe.length ? safe : legal, rng);
  };
}

export function makePolicy(name) {
  switch (name) {
    case 'optimal': return makeOptimal();
    case 'mp10': return makeEpsilonUniform(0.10);
    case 'mp25': return makeEpsilonUniform(0.25);
    case 'blocker': return makeBlocker();
    default: throw new Error(`Unknown policy: ${name} (valid: ${POLICY_NAMES.join(', ')})`);
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd /Users/elsonidoq/prog/cuatro_en_linea/connect-four && node --test server/tests/winDistribution.policies.test.mjs`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add connect-four/server/scripts/win_distribution/policies.mjs connect-four/server/tests/winDistribution.policies.test.mjs
git commit -m "feat(win-dist): 4 playing policies — optimal, mp10, mp25, blocker"
```

---

### Task 3: Winning-structure extraction

**Files:**
- Create: `connect-four/server/scripts/win_distribution/winningCells.mjs`
- Test: `connect-four/server/tests/winDistribution.winningCells.test.mjs`

**Interfaces:**
- Consumes: `parseBoardState`, `getWinningWindows` from `../../classifier.js`.
- Produces: `export function extractOutcome(ms)` → `{ winner: 1|2|null, cells: Array<{row:number,col:number}>, windows: Array<Array<{row,col}>> }`. `cells` is the deduplicated union of all completed 4-windows through the final move; empty and `winner: null` for draws/unfinished games. Every winning window must pass through the last move (games stop at the first win), so checking windows through the final disc is complete.

- [ ] **Step 1: Write the failing test**

```js
// connect-four/server/tests/winDistribution.winningCells.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractOutcome } from '../scripts/win_distribution/winningCells.mjs';

const key = ({ row, col }) => `${col},${row}`;

test('vertical P1 win', () => {
  const o = extractOutcome('0101010');
  assert.equal(o.winner, 1);
  assert.deepEqual(o.cells.map(key).sort(), ['0,0', '0,1', '0,2', '0,3']);
  assert.equal(o.windows.length, 1);
});

test('horizontal P1 win', () => {
  const o = extractOutcome('0011223'); // P1: cols 0,1,2,3 on row 0
  assert.equal(o.winner, 1);
  assert.deepEqual(o.cells.map(key).sort(), ['0,0', '1,0', '2,0', '3,0']);
});

test('P2 vertical win has winner 2', () => {
  // Verified with ./visualize_board.sh 60504060 on 2026-07-02: P1 plays c6,c5,c4,c6;
  // P2 stacks col 0 and wins vertically (rows 0-3) at move 8. P1 never wins first.
  const o = extractOutcome('60504060');
  assert.equal(o.winner, 2);
  assert.deepEqual(o.cells.map(key).sort(), ['0,0', '0,1', '0,2', '0,3']);
});

test('draw / unfinished returns null winner', () => {
  assert.deepEqual(extractOutcome('001122'), { winner: null, cells: [], windows: [] });
  assert.deepEqual(extractOutcome(''), { winner: null, cells: [], windows: [] });
});

test('double win counts the union of windows', { todo: true }, () => {
  // Implementation-time fixture: a move completing >= 2 windows at once (e.g.
  // horizontal + diagonal through the same disc). Construct with
  // ./visualize_board.sh (never hand-invent a movestring blindly), then assert:
  //   o.windows.length >= 2
  //   o.cells.length === new Set(o.cells.map(key)).size   // dedup holds
  //   o.cells.length > 4                                   // union, not one window
});
```

**FIXTURE NOTE (binding):** the double-win fixture above is a `{ todo: true }` node:test — per project rules (`feedback_no_random_boards`, CLAUDE.md movestring policy) construct the movestring at implementation time, verify it with `./visualize_board.sh <ms>` from the project root, then drop the `todo` flag and fill in the real assertions. The `60504060` P2 fixture is already solver-script-verified (2026-07-02) — keep it as is.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/elsonidoq/prog/cuatro_en_linea/connect-four && node --test server/tests/winDistribution.winningCells.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```js
// connect-four/server/scripts/win_distribution/winningCells.mjs
import { parseBoardState, getWinningWindows } from '../../classifier.js';

/**
 * Given a finished (or unfinished) game movestring, return the winner and the
 * union of cells of every completed 4-window. Games stop at the first win, so
 * every winning window necessarily passes through the final move — checking
 * windows through the last disc is exhaustive.
 */
export function extractOutcome(ms) {
  if (!ms.length) return { winner: null, cells: [], windows: [] };
  const { board, colHeights } = parseBoardState(ms);
  const lastCol = parseInt(ms[ms.length - 1], 10);
  const lastRow = colHeights[lastCol] - 1;
  const lastPlayer = (ms.length - 1) % 2 === 0 ? 1 : 2;
  const windows = getWinningWindows(board, lastRow, lastCol, lastPlayer);
  if (!windows.length) return { winner: null, cells: [], windows: [] };
  const seen = new Set();
  const cells = [];
  for (const w of windows) {
    for (const cell of w) {
      const k = `${cell.col},${cell.row}`;
      if (!seen.has(k)) { seen.add(k); cells.push(cell); }
    }
  }
  return { winner: lastPlayer, cells, windows };
}
```

- [ ] **Step 4: Replace placeholder fixtures with verified movestrings** (see FIXTURE NOTE), re-run until all tests assert real content and pass.

Run: `cd /Users/elsonidoq/prog/cuatro_en_linea/connect-four && node --test server/tests/winDistribution.winningCells.test.mjs`
Expected: PASS with zero placeholder `assert.ok(true)` remaining.

- [ ] **Step 5: Commit**

```bash
git add connect-four/server/scripts/win_distribution/winningCells.mjs connect-four/server/tests/winDistribution.winningCells.test.mjs
git commit -m "feat(win-dist): extract winning-structure cells from a finished game"
```

---

### Task 4: Monte-Carlo grid runner CLI

**Files:**
- Create: `connect-four/server/scripts/win_distribution/run_grid.mjs`
- Modify: `.gitignore` (add `connect-four/server/scripts/win_distribution/data/`)

**Interfaces:**
- Consumes: `playPolicyGame` (Task 1), `makePolicy`/`POLICY_NAMES` (Task 2), `extractOutcome` (Task 3), `createSolverProcess` from `../../c4solver-wrapper.js`.
- Produces: one JSONL per combo at `data/games_<p1>_<p2>.jsonl`; each line `{ "g": <gameIndex>, "ms": "<final movestring>", "winner": 1|2|null, "cells": [[col,row], ...], "plies": <int> }`. Resumable: on restart it reads the existing file, finds `maxG`, tallies existing wins, and continues from `g = maxG + 1` (per-game derived seeds make this exact).

- [ ] **Step 1: Write the runner**

```js
// connect-four/server/scripts/win_distribution/run_grid.mjs
// Monte-Carlo winning-cell distribution over the 4x4 policy grid.
import { createSolverProcess } from '../../c4solver-wrapper.js';
import { playPolicyGame } from '../../gameSampling.js';
import { makePolicy, POLICY_NAMES } from './policies.mjs';
import { extractOutcome } from './winningCells.mjs';
import { appendFileSync, existsSync, readFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const HELP = `run_grid.mjs — Monte-Carlo winning-cell distributions over the 4x4 policy grid.

Plays P1-policy vs P2-policy games for each requested combo and appends one JSON
line per game to data/games_<p1>_<p2>.jsonl. Resumable: re-running continues
after the highest recorded game index (per-game derived seeds; nothing replays).

Policies: ${POLICY_NAMES.join(', ')}
  optimal  uniform over solver-optimal moves
  mp10     10% uniform-over-legal mistakes, else optimal
  mp25     25% uniform-over-legal mistakes, else optimal
  blocker  solver-free: own win > block > random avoiding forbidden columns

Options:
  --combos p1:p2[,p1:p2...]  combos to run (default: all 16)
  --target-wins N            stop a combo when BOTH players have >= N wins (default 10000)
  --max-games N              hard cap on games per combo (default 30000)
  --seed N                   base seed (default 42)
  --out DIR                  output dir (default <script dir>/data)
  -h, --help                 show this help
`;

function parseArgs(argv) {
  const args = { targetWins: 10000, maxGames: 30000, seed: 42, out: null, combos: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') { console.log(HELP); process.exit(0); }
    else if (a === '--combos') args.combos = argv[++i].split(',').map(s => s.split(':'));
    else if (a === '--target-wins') args.targetWins = parseInt(argv[++i], 10);
    else if (a === '--max-games') args.maxGames = parseInt(argv[++i], 10);
    else if (a === '--seed') args.seed = parseInt(argv[++i], 10);
    else if (a === '--out') args.out = argv[++i];
    else { console.error(`Unknown arg: ${a}\n${HELP}`); process.exit(1); }
  }
  return args;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function runCombo(solver, [p1Name, p2Name], { targetWins, maxGames, seed, outDir }) {
  const file = join(outDir, `games_${p1Name}_${p2Name}.jsonl`);
  let startG = 0;
  let draws = 0;
  const wins = { 1: 0, 2: 0 };
  if (existsSync(file)) {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      const row = JSON.parse(line);
      startG = Math.max(startG, row.g + 1);
      if (row.winner) wins[row.winner]++; else draws++;
    }
  }
  console.log(`[${p1Name} vs ${p2Name}] resuming at game ${startG} (wins so far P1=${wins[1]} P2=${wins[2]})`);

  for (let g = startG; g < maxGames; g++) {
    if (wins[1] >= targetWins && wins[2] >= targetWins) break;
    const rng = mulberry32((seed ^ Math.imul(g + 1, 0x9E3779B9)) >>> 0);
    const policies = [makePolicy(p1Name), makePolicy(p2Name)];
    let finalMs = '';
    for await (const p of playPolicyGame(solver, policies, rng)) {
      finalMs = p.ms + String(p.movePlayed);
    }
    const { winner, cells } = extractOutcome(finalMs);
    if (winner) wins[winner]++; else draws++;
    appendFileSync(file, JSON.stringify({
      g, ms: finalMs, winner, cells: cells.map(c => [c.col, c.row]), plies: finalMs.length,
    }) + '\n');
    if ((g + 1) % 200 === 0) {
      console.log(`[${p1Name} vs ${p2Name}] game ${g + 1}: P1=${wins[1]} P2=${wins[2]} draws=${draws}`);
    }
  }
  console.log(`[${p1Name} vs ${p2Name}] done: P1=${wins[1]} P2=${wins[2]} draws=${draws}`);
}

const args = parseArgs(process.argv);
const outDir = args.out ?? join(dirname(fileURLToPath(import.meta.url)), 'data');
mkdirSync(outDir, { recursive: true });
const combos = args.combos ?? POLICY_NAMES.flatMap(a => POLICY_NAMES.map(b => [a, b]));
for (const [a, b] of combos) {
  if (!POLICY_NAMES.includes(a) || !POLICY_NAMES.includes(b)) {
    console.error(`Invalid combo ${a}:${b}. Valid policies: ${POLICY_NAMES.join(', ')}`);
    process.exit(1);
  }
}

const solver = createSolverProcess();
try {
  for (const combo of combos) {
    await runCombo(solver, combo, { ...args, outDir });
  }
} finally {
  solver.destroy();
}
```

- [ ] **Step 2: Verify --help**

Run: `cd /Users/elsonidoq/prog/cuatro_en_linea/connect-four/server/scripts/win_distribution && node run_grid.mjs --help`
Expected: the help text prints, exit 0, no solver spawned.

- [ ] **Step 3: Smoke test the solver-free combo**

Run: `node run_grid.mjs --combos blocker:blocker --target-wins 50 --max-games 200 --seed 7`
Expected: completes in seconds; `data/games_blocker_blocker.jsonl` exists with ≤200 lines; each line parses as JSON with keys `g, ms, winner, cells, plies`.

- [ ] **Step 4: Smoke test resume**

Run the same command again.
Expected: log line shows `resuming at game <N>` with N = previous line count, and either exits immediately (targets met) or appends only new `g` values — verify `sort -n` on the `g` field has no duplicates:
`node -e "const l=require('fs').readFileSync('data/games_blocker_blocker.jsonl','utf8').trim().split('\n').map(x=>JSON.parse(x).g); console.log(new Set(l).size===l.length ? 'OK no dup games' : 'DUPES!')"`
Expected: `OK no dup games`.

- [ ] **Step 5: Smoke test one solver-backed combo (small)**

Run: `node run_grid.mjs --combos optimal:blocker --target-wins 20 --max-games 40 --seed 7`
Expected: completes (solver loads book ~2s, then plays); P1 wins nearly every game.

- [ ] **Step 6: Commit (code + .gitignore only, not data/)**

```bash
git add connect-four/server/scripts/win_distribution/run_grid.mjs .gitignore
git commit -m "feat(win-dist): resumable Monte-Carlo runner for the 4x4 policy grid"
```

---

### Task 5: Aggregator → summary.json

**Files:**
- Create: `connect-four/server/scripts/win_distribution/aggregate.mjs`
- Test: `connect-four/server/tests/winDistribution.aggregate.test.mjs`

**Interfaces:**
- Consumes: the JSONL row shape from Task 4 (`{ g, ms, winner, cells: [[col,row],...], plies }`).
- Produces:
  - `export function aggregateRows(rows)` → `{ games, p1Wins, p2Wins, draws, meanPlies, heatmaps: { 1: number[6][7]|null, 2: number[6][7]|null }, parity: { 1: {oddRowMass, evenRowMass}|null, 2: {...}|null } }` where `heatmaps[p][row][col] = P(cell in winning structure | winner === p)` (null when that player never wins), and row parity uses 1-indexed rows (row index 0 → row 1 → odd) per `allen-parity`.
  - CLI: `node aggregate.mjs [--data DIR] [--out FILE]` reads every `games_*.jsonl` in DIR (default `./data`) and writes `summary.json` keyed `"<p1>__<p2>"`, plus prints a compact table (win rates, mean plies, odd-row mass per winner) to stdout. Ships `--help` per script conventions.

- [ ] **Step 1: Write the failing test**

```js
// connect-four/server/tests/winDistribution.aggregate.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aggregateRows } from '../scripts/win_distribution/aggregate.mjs';

test('aggregateRows computes conditional heatmaps and parity mass', () => {
  const rows = [
    { g: 0, ms: 'x', winner: 1, cells: [[0, 0], [0, 1], [0, 2], [0, 3]], plies: 7 },
    { g: 1, ms: 'x', winner: 1, cells: [[0, 0], [1, 0], [2, 0], [3, 0]], plies: 9 },
    { g: 2, ms: 'x', winner: null, cells: [], plies: 42 },
  ];
  const a = aggregateRows(rows);
  assert.equal(a.games, 3);
  assert.equal(a.p1Wins, 2);
  assert.equal(a.p2Wins, 0);
  assert.equal(a.draws, 1);
  assert.equal(a.heatmaps[2], null);
  assert.equal(a.heatmaps[1][0][0], 1);    // cell (col0,row0) in both wins → 2/2
  assert.equal(a.heatmaps[1][1][0], 0.5);  // (col0,row1) in 1 of 2 wins
  assert.equal(a.heatmaps[1][0][3], 0.5);  // (col3,row0) in 1 of 2 wins
  // parity: winning-cell mass on odd rows (1-indexed rows 1,3,5 = row indices 0,2,4)
  // game0 cells rows {0,1,2,3} → odd-mass 2/4; game1 rows all 0 → 4/4; mean over games = 0.75
  assert.equal(a.parity[1].oddRowMass, 0.75);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/elsonidoq/prog/cuatro_en_linea/connect-four && node --test server/tests/winDistribution.aggregate.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```js
// connect-four/server/scripts/win_distribution/aggregate.mjs
import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROWS = 6, COLS = 7;

export function aggregateRows(rows) {
  const counts = { 1: null, 2: null };
  const wins = { 1: 0, 2: 0 };
  const oddMassSum = { 1: 0, 2: 0 };
  let draws = 0, pliesSum = 0;

  for (const r of rows) {
    pliesSum += r.plies;
    if (!r.winner) { draws++; continue; }
    wins[r.winner]++;
    counts[r.winner] ??= Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    let odd = 0;
    for (const [col, row] of r.cells) {
      counts[r.winner][row][col]++;
      if (row % 2 === 0) odd++; // row index 0 = 1-indexed row 1 = odd (allen-parity)
    }
    oddMassSum[r.winner] += r.cells.length ? odd / r.cells.length : 0;
  }

  const heatmaps = {}, parity = {};
  for (const p of [1, 2]) {
    if (!wins[p]) { heatmaps[p] = null; parity[p] = null; continue; }
    heatmaps[p] = counts[p].map(rw => rw.map(v => v / wins[p]));
    const oddRowMass = oddMassSum[p] / wins[p];
    parity[p] = { oddRowMass, evenRowMass: 1 - oddRowMass };
  }
  return { games: rows.length, p1Wins: wins[1], p2Wins: wins[2], draws, meanPlies: rows.length ? pliesSum / rows.length : 0, heatmaps, parity };
}

function readJsonl(path) {
  return readFileSync(path, 'utf8').split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
}

const HELP = `aggregate.mjs — fold win_distribution game JSONLs into summary.json

Reads every games_<p1>_<p2>.jsonl in the data dir and writes summary.json with,
per combo and per winning player: the 6x7 P(cell in winning structure | win)
heatmap, win/draw rates, mean game length, and odd/even-row parity mass.

Options:
  --data DIR   input dir with games_*.jsonl (default: <script dir>/data)
  --out FILE   output path (default: <data dir>/summary.json)
  -h, --help   this help
`;

function main() {
  const argv = process.argv;
  let dataDir = join(dirname(fileURLToPath(import.meta.url)), 'data');
  let out = null;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '-h' || argv[i] === '--help') { console.log(HELP); process.exit(0); }
    else if (argv[i] === '--data') dataDir = argv[++i];
    else if (argv[i] === '--out') out = argv[++i];
    else { console.error(`Unknown arg: ${argv[i]}\n${HELP}`); process.exit(1); }
  }
  out ??= join(dataDir, 'summary.json');

  const summary = {};
  for (const f of readdirSync(dataDir).filter(f => /^games_.+\.jsonl$/.test(f)).sort()) {
    const [, p1, p2] = f.match(/^games_(.+)_(.+)\.jsonl$/);
    const agg = aggregateRows(readJsonl(join(dataDir, f)));
    summary[`${p1}__${p2}`] = agg;
    const pct = n => (100 * n / agg.games).toFixed(1) + '%';
    console.log(`${p1.padEnd(8)} vs ${p2.padEnd(8)} games=${agg.games} P1=${pct(agg.p1Wins)} P2=${pct(agg.p2Wins)} draws=${pct(agg.draws)} meanPlies=${agg.meanPlies.toFixed(1)} oddMassP1=${agg.parity[1] ? agg.parity[1].oddRowMass.toFixed(3) : '—'} oddMassP2=${agg.parity[2] ? agg.parity[2].oddRowMass.toFixed(3) : '—'}`);
  }
  writeFileSync(out, JSON.stringify(summary, null, 2));
  console.log(`\nWrote ${out}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
```

(Note the CLI body sits behind the `import.meta.url` entry guard because the module is also imported by the test — per `feedback_scripts_meaningful_help`.)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/elsonidoq/prog/cuatro_en_linea/connect-four && node --test server/tests/winDistribution.aggregate.test.mjs`
Expected: PASS.

- [ ] **Step 5: Smoke test on the Task-4 smoke data**

Run: `cd server/scripts/win_distribution && node aggregate.mjs`
Expected: one table row per smoke combo; `data/summary.json` written; heatmap rows sum sensibly (each cell in [0,1]; `heatmaps[p]` null for a player with 0 wins).

- [ ] **Step 6: Commit**

```bash
git add connect-four/server/scripts/win_distribution/aggregate.mjs connect-four/server/tests/winDistribution.aggregate.test.mjs
git commit -m "feat(win-dist): aggregate game JSONLs into per-combo winning-cell heatmaps"
```

---

### Task 6: Full grid run (long-running, background)

**Files:**
- Uses: `run_grid.mjs`, `aggregate.mjs`. No code changes expected.

**Ordering & cost model:** run cheap combos first to fail fast. `blocker:blocker` is solver-free (seconds). Combos with one solver-backed side cost roughly (plies × games) solver queries; `optimal:optimal` games run long (~35–41 plies) and every ply queries → budget the run as hours, not minutes. The runner is resumable, so interruptions are safe.

- [ ] **Step 1: Clean smoke data** — the Task 4/5 smoke files used tiny targets; delete them so the real run isn't polluted: `rm -f connect-four/server/scripts/win_distribution/data/games_*.jsonl`.

- [ ] **Step 2: Launch the full grid in the background**

Run (from `connect-four/server/scripts/win_distribution/`, as a background task):
`node run_grid.mjs --seed 42 --target-wins 10000 --max-games 30000`
Expected: progress lines every 200 games per combo. Check in periodically; the process is resumable if it dies (solver IPC hangs are a known failure mode — memory `project_integration_test_slowness`; if a combo stalls >10 min with no output, kill and re-run to resume).

- [ ] **Step 3: Aggregate**

Run: `node aggregate.mjs`
Expected: 16 table rows; sanity checks — `optimal:*` combos show P2 wins = 0; `*:optimal` combos show P1 win rate consistent with first-player theoretical advantage; `blocker` as P2 loses overwhelmingly; mean plies longest for `optimal:optimal`.

- [ ] **Step 4: Commit the summary (not the raw games)**

```bash
git add connect-four/server/scripts/win_distribution/data/summary.json -f
git commit -m "data(win-dist): 4x4 policy-grid winning-cell distribution summary"
```
(If the team prefers no data in git, skip this commit and note the summary path instead.)

---

### Task 7: Exploration report (Artifact)

**Files:**
- Create: `<scratchpad>/win-dist-report.html` (session scratchpad; published via the Artifact tool, not committed).

**Interfaces:**
- Consumes: `data/summary.json` from Task 6.

- [ ] **Step 1: Load the `artifact-design` and `dataviz` skills** (both are mandatory pre-reads before building any chart/artifact in this environment).

- [ ] **Step 2: Build a self-contained HTML report** (inline CSS/JS, no external resources) containing:
  - A 4×4 grid of cells (P1 policy rows × P2 policy columns), each showing two 6×7 heatmaps side by side (P1-wins distribution, P2-wins distribution; render "no wins" for null), color scale shared across the whole grid so combos are visually comparable. Row 0 at the bottom, matching board orientation.
  - A stats strip per combo: win/draw rates, mean plies, odd-row parity mass per winner — the parity signature is the headline finding to surface (theory predicts P1-win mass tilts to odd rows and P2-win mass to even rows, strongest in optimal-heavy combos; see `docs/knowledge-base/allen-parity.md`).
  - A short prose section: how the distribution deforms as the opponent weakens (expected: perfect-play wins concentrate center + odd rows; vs blocker, wins spread outward and drop to lower rows).
  - Embed the summary.json data inline as a `<script type="application/json">` block.

- [ ] **Step 3: Publish with the Artifact tool** (favicon suggestion: 🎯) and hand the URL to the user.

---

## Self-review checklist (run after writing code, per task)

- Spec coverage: 4 policies ✔ (Task 2), 16 combos ✔ (Task 4), both players' distributions ✔ (Tasks 5–6), exploration deliverable ✔ (Task 7).
- The two placeholder fixtures (Task 3 P2-win/double-win, Task 2 forbidden-column) are flagged as binding implementation steps with the `visualize_board.sh` verification procedure — they must not ship as `assert.ok(true)`.
- Interfaces consistent: `playPolicyGame` policy signature = Task 2 factories; JSONL row shape Task 4 = Task 5 input; `cells: [[col,row],...]` order used consistently in Task 4 writer and Task 5 reader.
