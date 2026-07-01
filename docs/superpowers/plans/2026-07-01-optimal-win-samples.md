# Optimal-win-line sampling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a purely-additive `optimalWinSamples` field to the reason engine's `lostResource`, sampling the distribution of optimal winning realizations (orientation, completing-cell parity) for distant parity/zugzwang wins.

**Architecture:** A new `sampleWins.mjs` module holds the sampler and one extracted shared primitive (`optimalCols`). `walkOptimal` switches to that primitive (behavior-preserving). `computeReason` calls `attachWinSamples` after building `lostResource` in the `win_to_draw` and `win_to_lose` branches, self-gated to `register === 'parity'` wins. The field is evidence-only — `toNarratorVector`/`pruneVector` are untouched, so nothing reaches the LLM.

**Tech Stack:** Node ESM (`.mjs`), `node:test`, c4solver via `createSolverProcess`.

## Global Constraints

- Coordinates are 0-indexed internally; the engine emits `cNrM` 1-indexed cells. (INVARIANT I10)
- Never weaken the algorithm to save solver calls; extra queries are expected and fine. (INVARIANT I0)
- Reuse existing detectors/helpers rather than reinvent. (INVARIANT I8/I12)
- Output must be reproducible: the eval vectors are diffed/frozen, so the sampler's RNG is seeded deterministically from the root movestring.
- Board helpers live in `connect-four/server/scripts/reason_engine/lib/boardUtils.mjs`: `COLS, INVALID_MOVE, buildBoard, winningWindows, cellStr, parseCell`.
- `buildBoard(ms)` returns `{ grid, heights }`; `grid[r][c]` is `0`/`1`/`2`; `heights[c]` is the occupied count (next free row) of column `c`. `winningWindows(grid, mover)` returns arrays of `[row,col]` pairs. `cellStr(r,c)` → `cNrM` (1-indexed). `parseCell('c5r4')` → `{ c: 4, r: 3 }` (0-indexed).
- `solver.query(ms)` is **async** — always `await` it; it returns a 7-element score array (`INVALID_MOVE` for full columns).
- Engine tests live in `connect-four/server/tests/reasonEngine*.test.mjs` and are registered explicitly in the `test:fast` script in `connect-four/package.json` (there is no glob). Run tests from `connect-four/`.

---

### Task 1: `sampleWins.mjs` module + pure-unit tests

**Files:**
- Create: `connect-four/server/scripts/reason_engine/sampleWins.mjs`
- Create: `connect-four/server/tests/reasonEngine.winSamples.test.mjs`
- Modify: `connect-four/package.json` (register the new test file in `test:fast`)

**Interfaces:**
- Produces:
  - `optimalCols(scores: number[]) => number[]` — columns achieving the mover's max score (ties included, ascending column order), excluding `INVALID_MOVE`.
  - `orientationOf(window: string[]) => 'horizontal' | 'vertical' | 'diagonal'`.
  - `sampleOptimalWins(solver, rootMs: string, winnerMark: number, opts?: { n?: number }) => Promise<{ n, distinct, orientation, oddCompletingFraction, lines }>`.
  - `attachWinSamples(solver, half, opts: { rootMs, winnerMark, n? }) => Promise<void>` — mutates `half.optimalWinSamples` in place, gated to `half.register === 'parity' && half.window`.

- [ ] **Step 1: Write the module**

Create `connect-four/server/scripts/reason_engine/sampleWins.mjs`:

```js
// sampleWins.mjs — sample optimal winning-line realizations from a won root.
//
// PURELY ADDITIVE EVIDENCE. For a distant parity/zugzwang win, walkOptimal emits exactly ONE
// terminal line; that single window/orientation is an artifact of one walk, not a canonical
// property of the position. This samples the DISTRIBUTION of optimal realizations (orientation,
// completing-cell parity) via seeded random walks so the output is reproducible for the frozen
// eval vectors. Both sides play optimally (argmax score at every node); only the TIE-BREAK among
// argmax columns is randomized. Evidence-only: never wired into toNarratorVector.
import { COLS, INVALID_MOVE, buildBoard, winningWindows, cellStr, parseCell } from './lib/boardUtils.mjs';

// The set of columns achieving the mover's max score (ties included, ascending), minus illegal moves.
// walkOptimal picks optimalCols(scores)[0]; the sampler picks a random element.
export function optimalCols(scores) {
  let best = -Infinity;
  for (let c = 0; c < COLS; c++) { if (scores[c] === INVALID_MOVE) continue; if (scores[c] > best) best = scores[c]; }
  const out = [];
  for (let c = 0; c < COLS; c++) { if (scores[c] !== INVALID_MOVE && scores[c] === best) out.push(c); }
  return out;
}

// Orientation of a solver-realized 4-window (array of cNrM cell strings).
export function orientationOf(window) {
  const pts = window.map(parseCell);
  if (pts.every((p) => p.r === pts[0].r)) return 'horizontal';
  if (pts.every((p) => p.c === pts[0].c)) return 'vertical';
  return 'diagonal';
}

// Deterministic 32-bit FNV-1a hash of a string (seed source).
function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

// mulberry32 PRNG — deterministic given the seed.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function aggregate(samples) {
  const orientation = { horizontal: 0, vertical: 0, diagonal: 0 };
  let odd = 0;
  const byWindow = new Map();
  for (const s of samples) {
    orientation[s.orientation]++;
    if (s.completingParity === 'odd') odd++;
    const key = [...s.window].sort().join('|');
    const prev = byWindow.get(key);
    if (prev) prev.count++;
    else byWindow.set(key, { ...s, count: 1 });
  }
  const lines = [...byWindow.values()].sort((a, b) => b.count - a.count);
  return {
    n: samples.length,
    distinct: lines.length,
    orientation,
    oddCompletingFraction: samples.length ? odd / samples.length : 0,
    lines,
  };
}

// Sample N optimal winning realizations from a won root. `winnerMark` documents which side wins
// (kept for readability/sanity; the walk detects the win via winningWindows on the real board).
// completingParity uses the zcount convention (1-indexed row minus occupied count at rootMs) — the
// same odd/even-threat notion attributeParityWin uses in reasonEngine.mjs.
export async function sampleOptimalWins(solver, rootMs, winnerMark, { n = 20 } = {}) {
  const rng = mulberry32(hashStr(rootMs));
  const { heights: rootHeights } = buildBoard(rootMs);
  const samples = [];
  for (let w = 0; w < n; w++) {
    let cur = rootMs;
    for (let step = 0; step < 50; step++) {
      const scores = await solver.query(cur);
      const cols = optimalCols(scores);
      if (!cols.length) break;
      const col = cols[Math.floor(rng() * cols.length)];
      const mover = (cur.length % 2 === 0) ? 1 : 2;
      const { heights } = buildBoard(cur);
      const r = heights[col];
      cur += String(col);
      const { grid } = buildBoard(cur);
      const wins = winningWindows(grid, mover);
      if (wins.length) {
        const window = wins[0].map(([rr, cc]) => cellStr(rr, cc));
        const completingCell = cellStr(r, col);
        const p = parseCell(completingCell);
        const zcount = (p.r + 1) - rootHeights[p.c];
        samples.push({
          window,
          completingCell,
          orientation: orientationOf(window),
          completingParity: zcount % 2 === 1 ? 'odd' : 'even',
          pliesToEnd: cur.length - rootMs.length,
        });
        break;
      }
    }
  }
  return aggregate(samples);
}

// Attach optimalWinSamples to a lostResource half IN PLACE, gated to distant parity wins
// (register 'parity' + a real winning window) — the same class attributeParityWin fires on.
// n defaults to env REASON_WIN_SAMPLES (fallback 20).
export async function attachWinSamples(solver, half, { rootMs, winnerMark, n } = {}) {
  if (!half || half.register !== 'parity' || !half.window) return;
  const count = n ?? parseInt(process.env.REASON_WIN_SAMPLES ?? '20', 10);
  half.optimalWinSamples = await sampleOptimalWins(solver, rootMs, winnerMark, { n: count });
}
```

- [ ] **Step 2: Write the failing pure-unit tests**

Create `connect-four/server/tests/reasonEngine.winSamples.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert';
import { INVALID_MOVE } from '../scripts/reason_engine/lib/boardUtils.mjs';
import { optimalCols, orientationOf } from '../scripts/reason_engine/sampleWins.mjs';

test('optimalCols: returns all columns tied at the max score, ascending', () => {
  //            c0  c1  c2  c3  c4  c5  c6
  const scores = [-2, 1, 0, 1, 1, -1, -2];
  assert.deepEqual(optimalCols(scores), [1, 3, 4]);
});

test('optimalCols: excludes INVALID_MOVE (full) columns even at the max', () => {
  const scores = [INVALID_MOVE, 2, 2, -1, -1, -1, -1];
  assert.deepEqual(optimalCols(scores), [1, 2]);
});

test('optimalCols: first element equals the strict-argmax walkOptimal would pick', () => {
  const scores = [0, 0, 5, 5, 1, 1, 1];
  assert.equal(optimalCols(scores)[0], 2);
});

test('orientationOf: classifies horizontal / vertical / diagonal windows', () => {
  assert.equal(orientationOf(['c2r5', 'c3r5', 'c4r5', 'c5r5']), 'horizontal');
  assert.equal(orientationOf(['c3r1', 'c3r2', 'c3r3', 'c3r4']), 'vertical');
  assert.equal(orientationOf(['c1r1', 'c2r2', 'c3r3', 'c4r4']), 'diagonal');
});
```

- [ ] **Step 3: Run the tests to verify they pass**

Run: `cd connect-four && node --test server/tests/reasonEngine.winSamples.test.mjs`
Expected: 4 tests pass. (The module already exists from Step 1, so these pass on first run — this task is a leaf module with pure functions; the walk-dependent paths are covered by Task 3's integration tests.)

- [ ] **Step 4: Register the test file in `test:fast`**

In `connect-four/package.json`, the `test:fast` script string ends with `... server/tests/reasonEngine.witness.test.mjs"`. Append the new file immediately before the closing quote so it reads `... server/tests/reasonEngine.witness.test.mjs server/tests/reasonEngine.winSamples.test.mjs"`. (Do not add it to the `test` script — engine tests are `test:fast`-only by convention.)

- [ ] **Step 5: Run the fast suite subset to confirm registration**

Run: `cd connect-four && node --test server/tests/reasonEngine.winSamples.test.mjs`
Expected: PASS (4 tests). Then confirm the JSON edit is valid: `node -e "require('./package.json')"` → no output, exit 0.

- [ ] **Step 6: Commit**

```bash
git add connect-four/server/scripts/reason_engine/sampleWins.mjs connect-four/server/tests/reasonEngine.winSamples.test.mjs connect-four/package.json
git commit -m "feat(reason-eval): add optimal-win sampler module (optimalCols, orientationOf, sampleOptimalWins)"
```

---

### Task 2: Refactor `walkOptimal` onto `optimalCols` (behavior-preserving)

**Files:**
- Modify: `connect-four/server/scripts/reason_engine/reasonEngine.mjs` (import at ~line 26; argmax loop at lines 348-350)

**Interfaces:**
- Consumes: `optimalCols` from `./sampleWins.mjs` (Task 1).

- [ ] **Step 1: Add the import**

In `reasonEngine.mjs`, immediately after the `boardUtils.mjs` import block (ends at line 26), add:

```js
import { optimalCols, attachWinSamples } from './sampleWins.mjs';
```

(`attachWinSamples` is imported now so Task 3 needs no further import edit.)

- [ ] **Step 2: Replace the inline argmax in `walkOptimal`**

In `walkOptimal`, replace lines 348-350:

```js
    let bestCol = -1, bestScore = -Infinity;
    for (let c = 0; c < COLS; c++) { if (scores[c] === INVALID_MOVE) continue; if (scores[c] > bestScore) { bestScore = scores[c]; bestCol = c; } }
    if (bestCol === -1) break;
```

with:

```js
    const opt = optimalCols(scores);
    if (!opt.length) break;
    const bestCol = opt[0];
    const bestScore = scores[bestCol];
```

This is behavior-preserving: `optimalCols` returns max-score columns in ascending order, so `opt[0]` is the smallest-index max-score column — exactly what the strict `>` loop selected.

- [ ] **Step 3: Write the equivalence test**

Append to `connect-four/server/tests/reasonEngine.winSamples.test.mjs`:

```js
import { before, after, test as ntest } from 'node:test';
import { createSolverProcess } from '../c4solver-wrapper.js';
import { computeReason } from '../scripts/reason_engine/reasonEngine.mjs';

let solver;
before(async () => { solver = await createSolverProcess(); });
after(() => { if (solver) solver.destroy(); });

ntest('walkOptimal refactor: lostResource window unchanged on a known parity win', async () => {
  // eval-14: win_to_draw parity win, best col 4, window c4r5..c7r5, completing c7r5.
  const r = await computeReason('333333451225', 2, { solver });
  assert.equal(r.case, 'win_to_draw');
  assert.equal(r.lostResource.register, 'parity');
  assert.deepEqual(r.lostResource.window, ['c4r5', 'c5r5', 'c6r5', 'c7r5']);
  assert.equal(r.lostResource.completingCell, 'c7r5');
});
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd connect-four && node --test server/tests/reasonEngine.winSamples.test.mjs`
Expected: PASS (5 tests). The window/completingCell match the frozen fixture, confirming the refactor did not change `walkOptimal`'s single-line output.

- [ ] **Step 5: Run the broader engine suite to confirm no regression**

Run: `cd connect-four && node --test server/tests/reasonEngine.test.mjs server/tests/reasonEngine.enrichment.test.mjs server/tests/reasonEngine.drawToLose.test.mjs`
Expected: all PASS (walkOptimal is used throughout these; unchanged output).

- [ ] **Step 6: Commit**

```bash
git add connect-four/server/scripts/reason_engine/reasonEngine.mjs connect-four/server/tests/reasonEngine.winSamples.test.mjs
git commit -m "refactor(reason-eval): walkOptimal uses optimalCols (behavior-preserving); pin equivalence"
```

---

### Task 3: Wire `attachWinSamples` into `computeReason` + integration tests

**Files:**
- Modify: `connect-four/server/scripts/reason_engine/reasonEngine.mjs` (after line 723 `win_to_draw`; after line 770 `win_to_lose`)
- Modify: `connect-four/server/tests/reasonEngine.winSamples.test.mjs`

**Interfaces:**
- Consumes: `attachWinSamples` from `./sampleWins.mjs` (imported in Task 2 Step 1).
- Produces: `out.lostResource.optimalWinSamples` (present only when `register === 'parity'` and a winning window exists).

- [ ] **Step 1: Write the failing integration tests**

Append to `connect-four/server/tests/reasonEngine.winSamples.test.mjs`:

```js
// Keep sample counts small so the integration tests stay fast; deterministic regardless of n.
process.env.REASON_WIN_SAMPLES = '8';

ntest('optimalWinSamples: present + well-formed on a parity win (eval-14)', async () => {
  const r = await computeReason('333333451225', 2, { solver });
  const s = r.lostResource.optimalWinSamples;
  assert.ok(s, 'optimalWinSamples attached');
  assert.equal(s.n, 8);
  assert.ok(s.distinct >= 1 && s.distinct <= s.n, 'distinct within [1, n]');
  assert.equal(s.orientation.horizontal + s.orientation.vertical + s.orientation.diagonal, s.n,
    'orientation histogram sums to n');
  assert.ok(s.oddCompletingFraction >= 0 && s.oddCompletingFraction <= 1);
  for (const line of s.lines) {
    assert.equal(line.window.length, 4);
    assert.ok(['horizontal', 'vertical', 'diagonal'].includes(line.orientation));
    assert.ok(['odd', 'even'].includes(line.completingParity));
    assert.ok(line.count >= 1 && line.pliesToEnd > 0);
  }
  // lines are sorted most-frequent-first
  for (let i = 1; i < s.lines.length; i++) assert.ok(s.lines[i - 1].count >= s.lines[i].count);
});

ntest('optimalWinSamples: deterministic across runs (seeded RNG)', async () => {
  const a = await computeReason('333333451225', 2, { solver });
  const b = await computeReason('333333451225', 2, { solver });
  assert.deepEqual(a.lostResource.optimalWinSamples, b.lostResource.optimalWinSamples);
});

ntest('optimalWinSamples: NOT attached on a non-parity (fork) win', async () => {
  // 214444115623 played 4 is a win_to_draw fork (register forced_sequence/immediate, terminal fork).
  const r = await computeReason('214444115623', 4, { solver });
  assert.equal(r.lostResource.terminal, 'fork');
  assert.equal(r.lostResource.optimalWinSamples, undefined);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd connect-four && node --test server/tests/reasonEngine.winSamples.test.mjs`
Expected: the three new `optimalWinSamples` tests FAIL (field is `undefined`) because the wiring is not in place yet. The earlier 5 tests still PASS.

- [ ] **Step 3: Wire the call into both branches**

In `reasonEngine.mjs`, after the `win_to_draw` lostResource assignment (line 723):

```js
    out.lostResource = renderHalf('winning_line', aWalk, fwdOf(bestScore, discs), { rootMs: bestRoot, winnerMark: player });
    await attachWinSamples(solver, out.lostResource, { rootMs: bestRoot, winnerMark: player });
```

And after the `win_to_lose` lostResource assignment (line 770):

```js
    out.lostResource = renderHalf('winning_line', aWalk, fwdOf(bestScore, discs), { rootMs: bestRoot, winnerMark: player });
    await attachWinSamples(solver, out.lostResource, { rootMs: bestRoot, winnerMark: player });
```

(`attachWinSamples` self-gates on `register === 'parity' && window`, so the `win_to_lose` call is a no-op unless that case's lost resource is itself a parity win.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd connect-four && node --test server/tests/reasonEngine.winSamples.test.mjs`
Expected: all 8 tests PASS.

- [ ] **Step 5: Regenerate the coverage fixture and eyeball it in /admin/fv-suff**

Run (from `connect-four/`):
```bash
rm -f server/scripts/reason_evidence_board_coverage_1.jsonl
node server/scripts/compute.mjs --input server/scripts/board_coverage_1.jsonl --out reason_evidence_board_coverage_1.jsonl
```
Expected: writes evidence rows; the `win_to_draw` parity rows (e.g. eval-5, eval-14) now carry `lostResource.optimalWinSamples`. Confirm with:
```bash
node -e "const rows=require('fs').readFileSync('server/scripts/reason_evidence_board_coverage_1.jsonl','utf8').trim().split('\n').map(JSON.parse); const r=rows.find(x=>x.id==='eval-5'); console.log(JSON.stringify(r.evidence.lostResource.optimalWinSamples,null,2));"
```
Expected: a populated `optimalWinSamples` object (orientation histogram, oddCompletingFraction, distinct lines). This is the artifact to inspect in `/admin/fv-suff`.

- [ ] **Step 6: Confirm the narrator path is untouched**

Run: `cd connect-four && node --test server/tests/reasonNarratorVector.test.mjs`
Expected: PASS — `toNarratorVector`/`pruneVector` were not modified, so `optimalWinSamples` does not leak into the LLM vector.

- [ ] **Step 7: Commit**

```bash
git add connect-four/server/scripts/reason_engine/reasonEngine.mjs connect-four/server/tests/reasonEngine.winSamples.test.mjs connect-four/server/scripts/reason_evidence_board_coverage_1.jsonl
git commit -m "feat(reason-eval): attach optimalWinSamples to parity-win lostResource; regen coverage fixture"
```

---

## Self-Review

**Spec coverage:**
- Seeded random walks, reproducible → Task 1 `mulberry32(hashStr(rootMs))`, Task 3 determinism test. ✓
- Both sides optimal → `optimalCols` at every node (Task 1). ✓
- Gate `register === 'parity' && walk.terminal === 'win'` → `attachWinSamples` gates on `register === 'parity' && half.window` (window present ⟺ terminal win for a parity register); negative fork test (Task 3). ✓
- `lostResource` only, both cases via register key → wired in `win_to_draw` + `win_to_lose` only (Task 3). ✓
- Payload shape (`n, distinct, orientation, oddCompletingFraction, lines[]` most-frequent-first) → `aggregate` (Task 1), structural test (Task 3). ✓
- completingParity via zcount at root → Task 1 `sampleOptimalWins`. ✓
- Evidence-only, narrator untouched → Task 3 Step 6. ✓
- `n` default 20, env `REASON_WIN_SAMPLES` → Task 1 `attachWinSamples`. ✓
- Tests in `test:fast` → Task 1 Step 4. ✓

**Placeholder scan:** none — all code and commands are concrete.

**Type consistency:** `optimalCols`, `orientationOf`, `sampleOptimalWins`, `attachWinSamples` names and signatures match across Tasks 1–3. `attachWinSamples` mutates `half` in place (returns `void`); callers use `await` without assignment. ✓
