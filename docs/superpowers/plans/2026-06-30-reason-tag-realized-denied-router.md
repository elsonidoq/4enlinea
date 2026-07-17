# tagBlunder Realized/Denied Router — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route the four short, cell-nameable tactical tags from `tagBlunder` (`immediate_threat`, `forced_block`, `double_threat`, `figure_7`) through a symmetric *realized-vs-denied* reason builder, so a conceded/handed/missed near-term tactic is explained directly instead of the sign engine's parity-swindle machinery (fixes `3321234543`).

**Architecture:** A tag-first branch in `computeReason`. When the tag is in the realized/denied set, one half is the pattern **realized in one move** (from the production detectors) and the other half is the pattern **denied** (the existing D18 `findOccupationWitness`, with `denier`/`root` flipped by the tag *direction*). Which half becomes `lostResource` vs `opponentPunishment` is decided by who owns the pattern. Non-tactical tags fall through to the unchanged sign-taxonomy engine.

**Tech Stack:** Node ESM (`.mjs`), `node:test`, the c4solver wrapper, `connect-four/server/classifier.js` detectors.

## Global Constraints

- Run all tests with `npm run test:fast` from inside `connect-four/` (never `npm test` — candidate-generator hangs). Single-test file: `node --test server/tests/reasonEngine.test.mjs` from `connect-four/`.
- Coordinates are **0-indexed internally**; the engine emits `cNrM` (1-indexed) cell strings. Never introduce 1-indexed internal coords.
- Reuse existing tested primitives (INVARIANT I8): `detectForkAt`, `detectImmediateThreat`, `getWinningWindows`, `findOccupationWitness`, `classifyPattern`, `tagBlunder`. Do not reinvent geometry.
- Every new clause must be solver-grounded or detector-grounded (I2). The realized half is decisive because the sign gate proves it; the denied half is proven by the witness walk.
- Keep the two halves in **separate fields** (I3). Never merge realized and denied.
- Design source of truth: `docs/architecture/reason-tag-fastpath-pseudocode.md`.

---

### Task 1: `realizedPattern` helper — the trivial one-move half

**Files:**
- Modify: `connect-four/server/scripts/reason_engine/reasonEngine.mjs` (add near `detectForkAt`, ~line 177; add `detectFigure7`-free path — forks come from `detectForkAt`)
- Modify import block `reasonEngine.mjs:27-29` — add `detectImmediateThreat` is already imported; confirm `getWinningWindows` already imported (it is, line 28).
- Test: `connect-four/server/tests/reasonRealizedDenied.test.mjs` (new)

**Interfaces:**
- Produces: `export function realizedPattern(rootMs, owner, tag)` →
  `{ cells: string[], windows: string[][], completingCell: string|null } | null`.
  `windows` are arrays of `cNrM` strings; `null` when the pattern is not present for `owner` on `rootMs`.

- [ ] **Step 1: Write the failing test**

Create `connect-four/server/tests/reasonRealizedDenied.test.mjs`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert';
import { realizedPattern } from '../scripts/reason_engine/reasonEngine.mjs';

// 3321234543: Gray (player 2) holds an immediate threat at c4r5 (vertical c4r2..c4r5).
// tagBlunder tags this forced_block/defensive_miss; the OWNER of the threat is the opponent (player 2).
test('realizedPattern: immediate_threat window for the threat owner', () => {
  const rp = realizedPattern('3321234543', 2, 'immediate_threat');
  assert.ok(rp, 'pattern present');
  assert.equal(rp.completingCell, 'c4r5');
  assert.ok(rp.windows.some((w) => w.includes('c4r5') && w.includes('c4r2')), 'vertical window present');
});

// 214444115623 + col 4 = the D16 Case-A double_threat board (Green = player 1 builds the fork on 2144441156234).
test('realizedPattern: double_threat fork windows via detectForkAt', () => {
  const rp = realizedPattern('2144441156234', 1, 'double_threat');
  assert.ok(rp, 'fork present');
  assert.ok(rp.windows.length >= 1, 'at least one fork window');
  assert.ok(rp.cells.length >= 1, 'fork completing cells present');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd connect-four && node --test server/tests/reasonRealizedDenied.test.mjs`
Expected: FAIL — `realizedPattern is not a function` / not exported.

- [ ] **Step 3: Write minimal implementation**

In `reasonEngine.mjs`, immediately after `detectForkAt` (ends ~line 177), add:

```javascript
// Realized half (trivial): the pattern `owner` forms in ONE move on `rootMs`, straight from the
// production detectors (I8). Forks (double_threat/figure_7) reuse detectForkAt so windows match D16/D18;
// immediate_threat/forced_block use the win-in-1 detector + getWinningWindows. Returns null if absent.
export function realizedPattern(rootMs, owner, tag) {
  if (tag === 'double_threat' || tag === 'figure_7') {
    const fork = detectForkAt(rootMs, owner);
    if (!fork) return null;
    return { cells: fork.forkCells, windows: fork.forkWindows, completingCell: fork.completingCell };
  }
  // immediate_threat / forced_block: the owner's win-in-1.
  const cboard = new Board(rootMs);
  const it = detectImmediateThreat(cboard, owner);
  if (!it.matched) return null;
  const { grid } = buildBoard(rootMs);
  const windows = [];
  for (const cs of it.cells) {
    const p = parseCell(cs);
    if (!p) continue;
    for (const w of getWinningWindows(grid, p.r, p.c, owner)) {
      windows.push(w.map(({ row, col }) => cellStr(row, col)));
    }
  }
  return { cells: it.cells, windows, completingCell: it.cells[0] ?? null };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd connect-four && node --test server/tests/reasonRealizedDenied.test.mjs`
Expected: PASS (2 tests). If `2144441156234` produces no fork, replace the second test's movestring/col with a fork board harvested in Task 5 and re-run — but `detectForkAt` should match Case A here.

- [ ] **Step 5: Commit**

```bash
git add connect-four/server/scripts/reason_engine/reasonEngine.mjs connect-four/server/tests/reasonRealizedDenied.test.mjs
git commit -m "feat(reason): realizedPattern helper — one-move detector half"
```

---

### Task 2: `realizedDeniedReason` — assemble both halves

**Files:**
- Modify: `connect-four/server/scripts/reason_engine/reasonEngine.mjs` (add after `realizedPattern`; add `REALIZED_DENIED_TAGS` + `classifySignCase` near `CASES`, ~line 60)
- Test: `connect-four/server/tests/reasonRealizedDenied.test.mjs`

**Interfaces:**
- Consumes: `realizedPattern` (Task 1); `findOccupationWitness(solver, root, { denier, windows, depthCap })` (existing, returns `{ verdict, line, finalMovestring, cell, window, exhaustive }`).
- Produces: `export async function realizedDeniedReason(out, tag, direction, { solver })` → mutates and returns `out` with `route:'realized_denied'`, `tag`, `direction`, `lostResource`, `opponentPunishment`, `replyHistogram`, `gate:null`. `out` is the partially-filled object from `computeReason` (already has `movestring, playedCol, bestCol, player, opponent, scores, bestScore, playedScore, discs, boardState`).
- Produces: `export const REALIZED_DENIED_TAGS = new Set([...])` and `function classifySignCase(bestScore, playedScore)`.

- [ ] **Step 1: Write the failing test**

Append to `reasonRealizedDenied.test.mjs`:

```javascript
import { before, after } from 'node:test';
import { createSolverProcess } from '../c4solver-wrapper.js';
import { realizedDeniedReason } from '../scripts/reason_engine/reasonEngine.mjs';

let solver;
before(async () => { solver = await createSolverProcess(); });
after(() => { if (solver) solver.destroy(); });

function baseOut(movestring, playedCol, bestCol, scores) {
  const discs = movestring.length;
  const player = (discs % 2 === 0) ? 1 : 2;
  return {
    movestring, playedCol, bestCol, scores, discs, boardState: 'opening',
    player, opponent: player === 1 ? 2 : 1,
    bestScore: scores[bestCol], playedScore: scores[playedCol],
    case: null, notABlunder: false, lostResource: null, opponentPunishment: null,
    replyHistogram: null, gate: null,
  };
}

test('realizedDeniedReason: 3321234543 defensive_miss -> block c4r5 is lostResource, opp completes c4r5', async () => {
  const scores = [-16,-16,-16,-4,-16,-16,-16];
  const out = baseOut('3321234543', 0, 3, scores);
  const r = await realizedDeniedReason(out, 'forced_block', 'defensive_miss', { solver });
  assert.equal(r.route, 'realized_denied');
  // opponent owns the threat -> realized half is the opponentPunishment (the threat handed over)
  assert.equal(r.opponentPunishment.kind, 'realized_pattern');
  assert.equal(r.opponentPunishment.completingCell, 'c4r5');
  // the defense you had -> lostResource is the denial (you occupy/block c4r5 on the correct line)
  assert.equal(r.lostResource.kind, 'denial');
  assert.equal(r.lostResource.completingCell, 'c4r5');
  assert.equal(r.lostResource.verdict, 'occupation');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd connect-four && node --test server/tests/reasonRealizedDenied.test.mjs`
Expected: FAIL — `realizedDeniedReason is not a function`.

- [ ] **Step 3: Write minimal implementation**

Near `CASES` (~line 60) in `reasonEngine.mjs` add:

```javascript
export const REALIZED_DENIED_TAGS = new Set(['immediate_threat', 'forced_block', 'double_threat', 'figure_7']);

function classifySignCase(bestScore, playedScore) {
  if (bestScore > 0 && playedScore === 0) return CASES.WIN_TO_DRAW;
  if (bestScore > 0 && playedScore < 0) return CASES.WIN_TO_LOSE;
  if (bestScore === 0 && playedScore < 0) return CASES.DRAW_TO_LOSE;
  if (bestScore < 0 && playedScore < 0) return CASES.LOSE_TO_FASTER_LOSE;
  return 'unclassified';
}
```

After `realizedPattern` add:

```javascript
// Realized/denied reason builder (docs/architecture/reason-tag-fastpath-pseudocode.md).
// One half is the pattern realized in one move (realizedPattern); the other is the pattern denied
// (findOccupationWitness) with denier/root flipped by `direction`. Owner of the pattern decides which
// half is lostResource vs opponentPunishment.
export async function realizedDeniedReason(out, tag, direction, { solver }) {
  const { movestring, playedCol, bestCol, player, opponent, bestScore, playedScore } = out;
  const correctRoot = movestring + String(bestCol);
  const playedRoot = movestring + String(playedCol);

  let owner, denier, realizedRoot, deniedRoot;
  if (direction === 'missed_own') {
    owner = player; denier = opponent; realizedRoot = correctRoot; deniedRoot = playedRoot;
  } else { // enabled_opponent | defensive_miss
    owner = opponent; denier = player;
    realizedRoot = (direction === 'defensive_miss') ? movestring : playedRoot;
    deniedRoot = correctRoot;
  }

  const rp = realizedPattern(realizedRoot, owner, tag);
  if (!rp) throw new Error(`realizedDeniedReason: pattern ${tag} absent for owner ${owner} on ${realizedRoot}`);

  const realized = {
    kind: 'realized_pattern', tag, owner, register: 'immediate',
    cells: rp.cells, windows: rp.windows,
    completingCell: rp.completingCell, window: rp.windows[0] ?? null,
    finalMovestring: realizedRoot, entryCell: rp.completingCell,
    anchorCells: rp.cells,
  };

  const witness = await findOccupationWitness(solver, deniedRoot, {
    denier, windows: rp.windows, depthCap: ROWS * COLS - deniedRoot.length,
  });
  const denied = {
    kind: 'denial', verdict: witness.verdict,
    register: (witness.line && witness.line.length > 1) ? 'forced_sequence' : 'immediate',
    line: witness.line, finalMovestring: witness.finalMovestring,
    completingCell: witness.cell ?? null, window: witness.window ?? null,
    cell: witness.cell ?? null, exhaustive: witness.exhaustive,
    entryCell: witness.cell ?? null,
    anchorCells: witness.cell ? [witness.cell] : [],
  };

  if (owner === player) { out.lostResource = realized; out.opponentPunishment = denied; }
  else { out.lostResource = denied; out.opponentPunishment = realized; }

  const tie = witness.verdict === 'occupation'
    ? { kind: 'tied', sharedCells: [witness.cell] }
    : { kind: 'independent', sharedCells: [] };
  out.opponentPunishment.tie = tie;

  out.route = 'realized_denied';
  out.tag = tag;
  out.direction = direction;
  out.case = classifySignCase(bestScore, playedScore);
  out.replyHistogram = {
    afterBest: await nonLosingReplyCount(solver, correctRoot),
    afterPlayed: await nonLosingReplyCount(solver, playedRoot),
  };
  out.gate = null;
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd connect-four && node --test server/tests/reasonRealizedDenied.test.mjs`
Expected: PASS. If `lostResource.completingCell` is null (no occupation), verify `findOccupationWitness` root pre-check fired: `correctRoot`'s last disc is the player's block at `c4r5` and `c4r5` ∈ the passed window — it should return `verdict:'occupation'` at ply 0.

- [ ] **Step 5: Commit**

```bash
git add connect-four/server/scripts/reason_engine/reasonEngine.mjs connect-four/server/tests/reasonRealizedDenied.test.mjs
git commit -m "feat(reason): realizedDeniedReason — symmetric realized+denied halves"
```

---

### Task 3: Wire the router into `computeReason`

**Files:**
- Modify: `connect-four/server/scripts/reason_engine/reasonEngine.mjs` — import block (line 27-29) + `computeReason` body (after the `win_to_slower_win` guard, ~line 583)
- Test: `connect-four/server/tests/reasonRealizedDenied.test.mjs`

**Interfaces:**
- Consumes: `tagBlunder(moves, playedCol, correctCol, solver)` → `{ tag, direction, reason }`; `NotABlunderError`; `realizedDeniedReason` (Task 2).

- [ ] **Step 1: Write the failing test**

Append to `reasonRealizedDenied.test.mjs`:

```javascript
import { computeReason } from '../scripts/reason_engine/reasonEngine.mjs';

test('computeReason routes 3321234543 to realized_denied (not lose_to_faster_lose swindle)', async () => {
  const r = await computeReason('3321234543', 0, { solver });
  assert.equal(r.route, 'realized_denied');
  assert.equal(r.tag, 'forced_block');
  assert.equal(r.direction, 'defensive_miss');
  assert.equal(r.gate, null, 'no swindle gate on the realized/denied route');
  assert.equal(r.opponentPunishment.completingCell, 'c4r5');
});

test('computeReason reproduces the D18 witness for 214444115623 played 4', async () => {
  const r = await computeReason('214444115623', 4, { solver });
  // missed_own double_threat -> realized (your fork) is lostResource; denied (opp occupies) is punishment
  assert.equal(r.route, 'realized_denied');
  assert.equal(r.opponentPunishment.kind, 'denial');
  assert.equal(r.opponentPunishment.completingCell, 'c3r3', 'same occupation cell as D18');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd connect-four && node --test server/tests/reasonRealizedDenied.test.mjs`
Expected: FAIL — `r.route` is `undefined` (computeReason still uses only the sign engine).

- [ ] **Step 3: Write minimal implementation**

Update the import from classifier (`reasonEngine.mjs:27-29`) to add `tagBlunder` and `NotABlunderError`:

```javascript
import {
  classifyPattern, Board, detectDoubleThreat, detectImmediateThreat, getWinningWindows,
  tagBlunder, NotABlunderError,
} from '../../classifier.js';
```

In `computeReason`, immediately AFTER the `win_to_slower_win` guard block (the `if (bestScore > 0 && playedScore > 0) { ... return out; }`, ~line 583) and BEFORE `const playedRoot = ...`, insert:

```javascript
  // Nothing lost -> not a blunder (best is the max, so playedScore <= bestScore).
  if (playedScore === bestScore) {
    out.case = classifySignCase(bestScore, playedScore);
    out.notABlunder = true;
    return out;
  }

  // ── tag-first realized/denied router (reason-tag-fastpath-pseudocode.md) ──
  let tagged;
  try {
    tagged = await tagBlunder(movestring, playedCol, bestCol, solver);
  } catch (err) {
    if (err instanceof NotABlunderError) { out.notABlunder = true; out.case = 'not_a_blunder'; return out; }
    throw err;
  }
  if (REALIZED_DENIED_TAGS.has(tagged.tag)) {
    return realizedDeniedReason(out, tagged.tag, tagged.direction, { solver });
  }
```

The existing sign-taxonomy branches below run unchanged for every non-realized/denied tag.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd connect-four && node --test server/tests/reasonRealizedDenied.test.mjs`
Expected: PASS (all tests). If `214444115623` does not route (tagBlunder returns something other than a realized/denied tag), print `tagged` and confirm — it should be `double_threat/missed_own`.

- [ ] **Step 5: Commit**

```bash
git add connect-four/server/scripts/reason_engine/reasonEngine.mjs connect-four/server/tests/reasonRealizedDenied.test.mjs
git commit -m "feat(reason): tag-first router dispatches realized/denied tags in computeReason"
```

---

### Task 4: Fixture `route` labeling + gate existing assertions

**Files:**
- Modify: `connect-four/server/scripts/reason_engine/reason_fixture.jsonl` (add `"route"` to diverted rows)
- Modify: `connect-four/server/tests/reasonEngine.test.mjs` (branch per-row assertions on `route`)
- Scratch: `/private/tmp/claude-501/-Users-elsonidoq-prog-cuatro-en-linea/*/scratchpad/route_audit.mjs`

**Interfaces:**
- Consumes: `computeReason` (Task 3). Produces: fixture rows carrying an optional `route` field (`'realized_denied'` when diverted, absent/`'sign'` otherwise).

- [ ] **Step 1: Detect which existing fixture rows now divert**

Write `scratchpad/route_audit.mjs`:

```javascript
import { readFileSync } from 'fs';
import { createSolverProcess } from '../../connect-four/server/c4solver-wrapper.js';
import { computeReason } from '../../connect-four/server/scripts/reason_engine/reasonEngine.mjs';
const FIX = 'connect-four/server/scripts/reason_engine/reason_fixture.jsonl';
const rows = readFileSync(FIX, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const solver = await createSolverProcess();
for (const row of rows) {
  const r = await computeReason(row.movestring, row.playedCol, { solver });
  if (r.route === 'realized_denied') {
    console.log(`DIVERTED ${row.bucket} ${row.movestring} played ${row.playedCol}: was ${row.expectedCase}, now ${r.tag}/${r.direction}`);
  }
}
solver.destroy();
```

Run from repo root: `node scratchpad/route_audit.mjs`
Record the list of DIVERTED rows.

- [ ] **Step 2: Run the existing suite to see the breakage**

Run: `cd connect-four && node --test server/tests/reasonEngine.test.mjs`
Expected: FAIL on exactly the DIVERTED rows (their `expectedCase`/`kind` assertions no longer hold because `route` changed). This confirms the audit list.

- [ ] **Step 3: Label diverted fixture rows + branch the test**

For each DIVERTED row in `reason_fixture.jsonl`, add `"route":"realized_denied"` (and keep `expectedCase` — it still equals `classifySignCase`). In `reasonEngine.test.mjs`, wrap the per-row body (the block after `assert.equal(r.case, row.expectedCase, ...)`) so the sign-shape assertions only run for non-diverted rows:

```javascript
    // 1) case matches solver ground truth (holds for both routes)
    assert.equal(r.case, row.expectedCase, 'classified case');

    if (row.route === 'realized_denied') {
      assert.equal(r.route, 'realized_denied', 'diverted row uses realized/denied route');
      assert.ok(REALIZED_DENIED_TAGS.has(r.tag), `tag ${r.tag} in realized/denied set`);
      // exactly one half is a realized_pattern and one is a denial
      const kinds = [r.lostResource.kind, r.opponentPunishment.kind].sort();
      assert.deepEqual(kinds, ['denial', 'realized_pattern'], 'one realized + one denial half');
      return; // sign-shape assertions below do not apply
    }
    // ... existing sign-shape assertions unchanged ...
```

Add `REALIZED_DENIED_TAGS` to the test's import from `reasonEngine.mjs`.

- [ ] **Step 4: Run the full fast suite**

Run: `cd connect-four && npm run test:fast`
Expected: PASS. If a diverted row's `realizedPattern` throws "pattern absent" (the detector disagrees with tagBlunder on that board), capture it — that is a real I12 discrepancy to record in the design doc's honest-limits, and the row should be moved to Task 5's counterexample review rather than force-labeled.

- [ ] **Step 5: Commit**

```bash
git add connect-four/server/scripts/reason_engine/reason_fixture.jsonl connect-four/server/tests/reasonEngine.test.mjs
git commit -m "test(reason): label realized/denied-diverted fixture rows; gate sign-shape asserts on route"
```

---

### Task 5: I12 counterexample per (tag, direction)

**Files:**
- Modify: `connect-four/server/scripts/reason_engine/reason_fixture.jsonl` (append sourced rows)
- Scratch: `scratchpad/harvest_realized_denied.mjs`

**Interfaces:** Consumes `playGame` (gameSampling.js), `tagBlunder`, `computeReason`. Produces committed fixture rows with `route:'realized_denied'`, `expectedTag`, `expectedDirection`.

- [ ] **Step 1: Harvest one board per (tag, direction)**

Movestrings must be sourced, never hand-rolled (memory `feedback_no_random_boards`). Write `scratchpad/harvest_realized_denied.mjs` that streams `playGame`, and for each blunder (playedCol ≠ bestCol) calls `tagBlunder`; collect the first board for each of the target pairs: `immediate_threat/{missed_own,enabled_opponent}`, `forced_block/defensive_miss`, `double_threat/{missed_own,enabled_opponent}`, `figure_7/{missed_own,enabled_opponent}`. Reuse the harvesting shape in `build_fixture.mjs` (same folder) for the `playGame` loop and solver setup. Print each as a JSONL row:

```javascript
// pseudocode of the emit line — see build_fixture.mjs for the exact playGame/solver harness
console.log(JSON.stringify({
  movestring, playedCol, bestCol, scores, discs: movestring.length,
  expectedCase: classifySignCase(scores[bestCol], scores[playedCol]),
  route: 'realized_denied', expectedTag: tag, expectedDirection: direction,
  bucket: `rd-${tag}-${direction}`,
}));
```

Run from `connect-four/`: `node scripts/reason_engine/../..//scratchpad/harvest_realized_denied.mjs > /tmp/rd_rows.jsonl` (adjust path); inspect each board with `./visualize_board.sh <movestring>` from repo root to confirm the tactic is real before committing.

- [ ] **Step 2: Verify each harvested row through the production engine**

For each harvested row, run: `cd connect-four && node server/scripts/reason_engine/reasonEngine.mjs <movestring> <playedCol>` and confirm `route:'realized_denied'`, the expected `tag`/`direction`, and that the realized half names the tactic cells and the denial half has a sane verdict.

- [ ] **Step 3: Append rows + extend the test**

Append the verified rows to `reason_fixture.jsonl`. In `reasonEngine.test.mjs`, inside the `row.route === 'realized_denied'` branch, add when present:

```javascript
      if (row.expectedTag) assert.equal(r.tag, row.expectedTag, 'expected tag');
      if (row.expectedDirection) assert.equal(r.direction, row.expectedDirection, 'expected direction');
```

- [ ] **Step 4: Run the full fast suite**

Run: `cd connect-four && npm run test:fast`
Expected: PASS, including the new `rd-*` buckets. If any pair could not be harvested within the stream budget, mark that (tag, direction) **provisional** in `reason-tag-fastpath-pseudocode.md` §Open items (I12: never assert coverage you did not test) rather than fabricating a board.

- [ ] **Step 5: Commit**

```bash
git add connect-four/server/scripts/reason_engine/reason_fixture.jsonl connect-four/server/tests/reasonEngine.test.mjs
git commit -m "test(reason): I12 counterexample fixtures per realized/denied (tag,direction)"
```

---

### Task 6: Thread `route`/`tag`/`direction` through evidence output

**Files:**
- Modify: `connect-four/server/scripts/reason_engine/build_evidence.mjs` (pass through the new top-level fields — they ride on the `computeReason` return, so verify they are not stripped)
- Modify: `docs/architecture/reason-tag-fastpath-pseudocode.md` (move viewer/prompt threading from "Open items" to a tracked follow-up note)

**Interfaces:** Consumes the `computeReason` return (Task 3). Produces evidence rows in `reason_evidence_*.jsonl` carrying `route`, `tag`, `direction`, and the `realized_pattern` half kind.

- [ ] **Step 1: Confirm evidence rows carry the new fields**

Run: `cd connect-four && node server/scripts/reason_engine/build_evidence.mjs` (writes `server/scripts/reason_evidence_all.jsonl`). Then check a diverted row:

Run: `grep -m1 '"route":"realized_denied"' connect-four/server/scripts/reason_evidence_all.jsonl | head -c 400`
Expected: the row includes `"route":"realized_denied"`, `"tag"`, `"direction"`, and a `"kind":"realized_pattern"` half. If `build_evidence.mjs` whitelists fields, add `route`/`tag`/`direction` to its projection.

- [ ] **Step 2: Record the downstream follow-up**

In `reason-tag-fastpath-pseudocode.md`, under a new `## Follow-up (separate change)` heading, note that `/admin/fv-suff` (`src/pages/AdminFvSuffPage.jsx`) and the explain prompt (`explainContext.js` / the LLM narrator) must learn to render the `realized_pattern`/`denial` halves and the `route`/`tag`/`direction` fields — out of scope for this plan, tracked here so it is not lost. (See memory `project_admin_fv_suff_repurposed`, `project_explain_system`.)

- [ ] **Step 3: Run the full fast suite once more**

Run: `cd connect-four && npm run test:fast`
Expected: PASS (no regressions from the evidence/doc changes).

- [ ] **Step 4: Commit**

```bash
git add connect-four/server/scripts/reason_engine/build_evidence.mjs docs/architecture/reason-tag-fastpath-pseudocode.md
git commit -m "feat(reason): carry route/tag/direction into evidence output; note viewer/prompt follow-up"
```

---

## Self-Review

- **Spec coverage:** realized half (Task 1), denied half + owner mapping + tie (Task 2), tag-first routing + guards (Task 3), no-regression on `214444115623`/D18 (Task 3 test), fixture reconciliation (Task 4), I12 per (tag,direction) (Task 5), evidence threading + downstream note (Task 6). The design's `forced_win`/`j_shape` exclusion is enforced structurally by `REALIZED_DENIED_TAGS` (they never enter the set) — no dedicated task needed.
- **Placeholder scan:** the only runtime-derived values are the harvested movestrings (Task 5), which are *data outputs* of a concrete script, not code placeholders — acceptable and explicitly sourced per project rules.
- **Type consistency:** `realizedPattern` returns `{cells, windows, completingCell}` (Task 1) consumed verbatim in Task 2; `findOccupationWitness` fields (`verdict, line, finalMovestring, cell, window, exhaustive`) match its implementation (`reasonEngine.mjs:490-541`); `tagBlunder` returns `{tag, direction, reason}` consumed in Task 3; `REALIZED_DENIED_TAGS` defined in Task 2 and imported by the test in Task 4.
