# opponentPunishment fork-denial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `win_to_draw` `opponentPunishment` half with a search that exhibits, via the shortest optimal line, the opponent occupying a cell of the lost double-threat pattern — proving the fork can't be rebuilt after the blunder.

**Architecture:** A breadth-first search over the blunder position's optimal-play tree (both sides branch all score-ties), stopping at the shallowest node where the opponent occupies a `lostResource` fork-window cell (window LIVE→DEAD). Verdict `occupation` (with the killed window) or `no_occupation` (two-valued by exhaustion). Detector-agnostic: consumes `lostResource.forkWindows`, never names "double threat".

**Tech Stack:** Node `--test`, the c4solver wrapper, `classifier.js` production detectors, `reason_audit/` boardUtils.

## Global Constraints

- Authoritative design: `docs/architecture/reason-opponentPunishment-spec.md` + the four canonical reason docs. On conflict, canonical docs win — stop and ask.
- I0: correctness over optimization — extra solver calls are accepted; never weaken the search to save queries.
- I2: every move in any witness is solver-grounded **optimal** play (score-tying with the node best). Never exhibit a sub-optimal move.
- I6: search bounded by a **depth cap** + dedup by movestring — never a budget heuristic.
- I9: the search is pattern-agnostic — it consumes `forkWindows`, it does not hardcode "double threat".
- The tie-break is a pure speed heuristic: it MUST NOT change the returned board and is NOT tested (spec §3a).
- Coordinates 0-indexed internally; emit `cNrM` 1-indexed. Tests via `node --test` (in `npm run test:fast`).
- Run from `connect-four/`. Solver scripts must `await solver.query` and `solver.destroy()` in a `finally`.

---

### Task 1: Ground & principle review of this plan

**Files:**
- Read: `docs/architecture/reason-INVARIANTS.md`, `docs/architecture/reason-DECISIONS.md` (esp. D14, D16), `docs/architecture/reason-opponentPunishment-spec.md`, this plan.

**Interfaces:**
- Produces: a short written review note (in the execution thread, not a file) confirming the plan is grounded, or a list of fixes applied.

- [ ] **Step 1: Map every design decision to a principle.** For each of: the §3 contract, tie-break-independence (§3a), the two honest claims (§5), constructive tie (§6), `no_occupation` two-valued (§7), I12 counterexamples (§8) — name the INVARIANT (I0/I2/I6/I7/I9/I12) or canonical decision it rests on. Flag any decision with no principle behind it.
- [ ] **Step 2: Verify the contract is tie-break-independent.** Confirm the stop criterion (§3) references only the tree, never the heuristic; confirm the plan's search code (Task 3) BFS-by-depth never prunes a depth level. If the code lets a bounded player fan-out drive the result, that's a bug — fix the plan.
- [ ] **Step 3: Verify D14 conflict is handled, not silently broken.** This changes how `win_to_draw` `tie` is produced. Confirm Task 6 appends D17 superseding the relevant part of D14 for `win_to_draw` (append-only, not in-place). If D14 must change in a way the spec doesn't cover → STOP and ask.
- [ ] **Step 4: Verify both I12 counterexamples are real tasks.** Occupation (`214444115623`) is fixed; `no_occupation` must be *sourced* (Task 2), not assumed. Confirm Task 2 exists and Task 3's tests consume its output.
- [ ] **Step 5: Record the review.** State "plan grounded" or list the fixes made. Do not start Task 2 until this passes.

---

### Task 2: Implement `denyOpponentPunishment` — occupation case (TDD)

**Files:**
- Modify: `connect-four/server/scripts/reason_audit/reasonEngine.mjs` (add the function + helpers; do not wire it in yet)
- Create: `connect-four/server/tests/reasonEngine.denial.test.mjs`

**Interfaces:**
- Consumes: `createSolverProcess`, `buildBoard`/`cellStr`/`parseCell`/`COLS`/`INVALID_MOVE` from boardUtils.
- Produces: `export async function denyOpponentPunishment(solver, blunderRoot, forkWindows, { opponent, depthCap })` →
  `{ verdict:'occupation', line:[{ply,mover,col,cell,score}], finalMovestring, cell, window }`
  | `{ verdict:'no_occupation', line:[], finalMovestring, exhaustive }`.

> Note: the implementation handles BOTH verdicts. This task tests only `occupation` (fixed board
> `214444115623`); the `no_occupation` test is added in Task 3 once its board is sourced — sequencing
> avoids duplicating the search (it IS the sourcing tool, I12/DRY).

- [ ] **Step 1: Write the failing test (occupation only).**

```js
// reasonEngine.denial.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { createSolverProcess } from '../c4solver-wrapper.js';
import { computeReason, denyOpponentPunishment } from '../scripts/reason_audit/reasonEngine.mjs';

let solver;
before(async () => { solver = await createSolverProcess(); });
after(() => { if (solver) solver.destroy(); });

const DEPTH = 8;

test('occupation: 214444115623 played 4 -> opponent takes c3r3, killing the row-3 window', async () => {
  const r = await computeReason('214444115623', 4, { solver });
  const d = await denyOpponentPunishment(solver, '214444115623' + '4', r.lostResource.forkWindows,
    { opponent: r.opponent, depthCap: DEPTH });
  assert.equal(d.verdict, 'occupation');
  assert.equal(d.cell, 'c3r3');
  assert.ok(d.window.includes('c3r3') && d.window.includes('c4r3'), 'killed the row-3 fork window');
  assert.ok(d.line.length >= 1 && d.finalMovestring.startsWith('2144441156234'));
});
```

- [ ] **Step 2: Run, verify RED.** `cd connect-four && node --test server/tests/reasonEngine.denial.test.mjs` → FAIL ("denyOpponentPunishment is not a function").

- [ ] **Step 3: Implement the search.** Add to `reasonEngine.mjs`:

```js
// A window (array of cellStr) is LIVE for the winner on `ms` if it holds no opponent disc; the
// opponent's move into `cell` kills it. Returns the killed window or null.
function killedWindow(ms, cell, forkWindows, opponent) {
  const { grid } = buildBoard(ms);                 // board BEFORE the opponent move
  const p = parseCell(cell); if (!p) return null;
  for (const w of forkWindows) {
    if (!w.includes(cell)) continue;
    const live = w.every((s) => { const q = parseCell(s); return grid[q.r][q.c] !== opponent; });
    if (live) return w;                             // live before -> dead after this move
  }
  return null;
}

// Shortest optimal line where the opponent occupies a fork-window cell (window LIVE->DEAD).
// BFS strictly by ply (never prunes a depth level), both sides branch ALL score-ties, dedup. I0/I2/I6.
export async function denyOpponentPunishment(solver, blunderRoot, forkWindows, { opponent, depthCap }) {
  const windows = forkWindows || [];
  const patternCells = new Set(windows.flat());
  const parent = new Map();                          // child -> { ms, mover, col, cell, score }
  let frontier = [blunderRoot];
  const seen = new Set([blunderRoot]);
  const lineTo = (ms) => { const out = []; let c = ms; while (parent.has(c)) { const e = parent.get(c); out.unshift({ ply: c.length, mover: e.mover, col: e.col, cell: e.cell, score: e.score }); c = e.ms; } return out; };

  for (let depth = 0; depth < depthCap; depth++) {
    const next = [];
    for (const ms of frontier) {
      let scores; try { scores = await solver.query(ms); } catch { continue; } // terminal/won
      const mover = (ms.length % 2 === 0) ? 1 : 2;
      const legal = []; let best = -Infinity;
      for (let c = 0; c < COLS; c++) { if (scores[c] === INVALID_MOVE) continue; legal.push(c); if (scores[c] > best) best = scores[c]; }
      if (!legal.length) continue;                    // full board (draw terminal)
      for (const c of legal) {
        if (scores[c] !== best) continue;             // optimal (score-tying) moves only
        const { heights } = buildBoard(ms);
        const cell = cellStr(heights[c], c);
        const child = ms + String(c);
        if (mover === opponent && patternCells.has(cell)) {
          const w = killedWindow(ms, cell, windows, opponent);
          if (w) { parent.set(child, { ms, mover, col: c, cell, score: scores[c] });
                   return { verdict: 'occupation', line: lineTo(child), finalMovestring: child, cell, window: w }; }
        }
        if (!seen.has(child)) { seen.add(child); parent.set(child, { ms, mover, col: c, cell, score: scores[c] }); next.push(child); }
      }
    }
    if (!next.length) return { verdict: 'no_occupation', line: [], finalMovestring: blunderRoot, exhaustive: true };
    frontier = next;
  }
  return { verdict: 'no_occupation', line: [], finalMovestring: blunderRoot, exhaustive: false };
}
```

- [ ] **Step 4: Run, verify GREEN.** `node --test server/tests/reasonEngine.denial.test.mjs` → PASS (occupation test).

- [ ] **Step 5: Commit.**

```bash
git add connect-four/server/scripts/reason_audit/reasonEngine.mjs connect-four/server/tests/reasonEngine.denial.test.mjs
git commit -m "feat(reason): denyOpponentPunishment occupation search (win_to_draw half b)"
```

---

### Task 3: Source the `no_occupation` board + fallback test (I12 #2)

**Files:**
- Create (scratch): a sourcing script under the session scratchpad.
- Modify: `connect-four/server/tests/reasonEngine.denial.test.mjs` (add the `no_occupation` test)

**Interfaces:**
- Consumes: `denyOpponentPunishment` (Task 2), `computeReason`.
- Produces: `NO_OCCUPATION_MS`, `NO_OCCUPATION_COL` baked into the test.

- [ ] **Step 1: Scan for a board using the real search (no duplicate logic).** Over `win_to_draw` candidates (fixture rows first; then `gameSampling.playGame` with a high disc floor for short trees): run `computeReason`; if `lostResource.terminal === 'fork'`, call `denyOpponentPunishment(solver, ms+col, forkWindows, {opponent, depthCap: 8})` and keep the first board returning `verdict:'no_occupation'` — prefer `exhaustive:true` (near-endgame, fast + the stronger verdict).

```js
// scratch sourcing script — reuses denyOpponentPunishment, NOT a re-implementation (I12/DRY).
```

- [ ] **Step 2: Verify with the board tool.** `./visualize_board.sh <movestring>`; confirm by eye it is a `win_to_draw` fork whose drawn continuation never forces the opponent onto a fork-window cell.

- [ ] **Step 3: Add the `no_occupation` test** to `reasonEngine.denial.test.mjs` with the sourced board baked in:

```js
test('no_occupation: 33...<sourced board> draws without the opponent taking a fork cell', async () => {
  const ms = '<NO_OCCUPATION_MS>', col = <NO_OCCUPATION_COL>;  // sourced 2026-06-29, exhaustive
  const r = await computeReason(ms, col, { solver });
  const d = await denyOpponentPunishment(solver, ms + String(col), r.lostResource.forkWindows,
    { opponent: r.opponent, depthCap: 8 });
  assert.equal(d.verdict, 'no_occupation');
  assert.equal(typeof d.exhaustive, 'boolean');
});
```

- [ ] **Step 4: Run, verify GREEN.** `node --test server/tests/reasonEngine.denial.test.mjs` → PASS (both tests).

- [ ] **Step 5: Commit.**

```bash
git add connect-four/server/tests/reasonEngine.denial.test.mjs
git commit -m "test(reason): source no_occupation counterexample + fallback test"
```

---

### Task 4: Wire into the `win_to_draw` branch + constructive tie (D14)

**Files:**
- Modify: `connect-four/server/scripts/reason_audit/reasonEngine.mjs` (the `win_to_draw` branch + `tieTo` usage)
- Modify: `connect-four/server/tests/reasonEngine.enrichment.test.mjs` (the `win_to_draw` tie test, to the constructive contract)

**Interfaces:**
- Consumes: `denyOpponentPunishment` (Task 2), `lostResource.forkWindows` (D16).
- Produces: `opponentPunishment = { kind:'denial', verdict, line, finalMovestring, cell?, window?, exhaustive?, tie }` for `win_to_draw`.

- [ ] **Step 1: Write/adjust the failing test.** In `reasonEngine.enrichment.test.mjs`, assert the new shape on `214444115623`:

```js
test('win_to_draw denial: 214444115623 opponentPunishment is occupation tied at c3r3', async () => {
  const r = await computeReason('214444115623', 4, { solver });
  assert.equal(r.opponentPunishment.kind, 'denial');
  assert.equal(r.opponentPunishment.verdict, 'occupation');
  assert.equal(r.opponentPunishment.tie.kind, 'tied');
  assert.deepEqual(r.opponentPunishment.tie.sharedCells, ['c3r3']);
});
```

- [ ] **Step 2: Run, verify RED.** `node --test server/tests/reasonEngine.enrichment.test.mjs` → FAIL (kind is `neutralization`).

- [ ] **Step 3: Replace the `win_to_draw` half-(b) block.** Swap the `neutralization` block for:

```js
const denial = await denyOpponentPunishment(solver, playedRoot, out.lostResource.forkWindows || [],
  { opponent, depthCap: REASON_CONFIG.denialDepth });
out.opponentPunishment = {
  kind: 'denial', verdict: denial.verdict, register: 'forced_sequence',
  line: denial.line, finalMovestring: denial.finalMovestring,
  completingCell: denial.cell ?? null, window: denial.window ?? null,
  cell: denial.cell ?? null, exhaustive: denial.exhaustive,
  entryCell: denial.cell ?? null,
};
out.opponentPunishment.tie = denial.verdict === 'occupation'
  ? { kind: 'tied', sharedCells: [denial.cell] }
  : { kind: 'independent', sharedCells: [] };
```

Add `denialDepth: 8` to `REASON_CONFIG`. Guard: if `lostResource` is NOT a fork (no `forkWindows`), keep the legacy `neutralization` block (genuine-parity `win_to_draw` lost resources still exist).

- [ ] **Step 4: Update the tie block.** Ensure the generic `tieTo(...)` at the end of `computeReason` does NOT overwrite the constructive `win_to_draw` tie (skip when `out.opponentPunishment.kind === 'denial'`).

- [ ] **Step 5: Run, verify GREEN + no regression.** `node --test server/tests/reasonEngine.test.mjs server/tests/reasonEngine.enrichment.test.mjs server/tests/reasonEngine.denial.test.mjs` → all PASS.

- [ ] **Step 6: Commit.**

```bash
git add connect-four/server/scripts/reason_audit/reasonEngine.mjs connect-four/server/tests/reasonEngine.enrichment.test.mjs
git commit -m "feat(reason): wire denial into win_to_draw half b + constructive tie"
```

---

### Task 5: Regenerate evidence + full-suite verification

**Files:**
- Modify (generated): `connect-four/server/scripts/reason_evidence_all.jsonl`

- [ ] **Step 1: Regenerate.** `cd connect-four && node server/scripts/reason_audit/build_evidence.mjs` — expect `0 case mismatches`.
- [ ] **Step 2: Inspect `214444115623`.** Confirm `opponentPunishment.kind==='denial'`, `verdict==='occupation'`, multi-ply `line`, `tie.sharedCells==['c3r3']`.
- [ ] **Step 3: Full reason suite.** `node --test server/tests/reasonEngine*.test.mjs` → all green.
- [ ] **Step 4: Admin sanity.** Confirm `/admin/fv-suff` renders the now multi-ply opponentPunishment line with the existing numbered lookahead (no code change expected). `npx vite build` succeeds.
- [ ] **Step 5: Commit.**

```bash
git add connect-four/server/scripts/reason_evidence_all.jsonl
git commit -m "chore(reason): regenerate evidence with opponentPunishment denial"
```

---

### Task 6: Documentation updates

**Files:**
- Modify: `docs/architecture/reason-DECISIONS.md` (append D17)
- Modify: `docs/architecture/blunder-reason-evidence.md` (opponentPunishment denial section; close the D16 sync gap)
- Modify: `docs/architecture/reason-case-taxonomy.md` (note half-b is now a denial search for win_to_draw)
- Modify: `docs/architecture/reason-engine-pseudocode.md` (fold `opponent_punishment` from the spec)
- Modify: `docs/architecture/reason-opponentPunishment-spec.md` (status → IMPLEMENTED)

- [ ] **Step 1: Append D17** (append-only) to `reason-DECISIONS.md`: the constructive occupation-witness contract; supersede the `win_to_draw` portion of D14's "tie via anchorCells intersection" with "tie produced constructively by the denial search"; reference I12 counterexamples + the spec.
- [ ] **Step 2: Update `blunder-reason-evidence.md`** — add the opponentPunishment denial mechanism to §2/§4, and (closing the D16 lag) note that `win_to_draw`/`win_to_lose` lostResource halves stop at forks.
- [ ] **Step 3: Fold `opponent_punishment` pseudocode** (spec §3 corrected block) into `reason-engine-pseudocode.md`; one line in `reason-case-taxonomy.md` pointing half-b at it for `win_to_draw`.
- [ ] **Step 4: Flip the spec status** to IMPLEMENTED with the commit refs.
- [ ] **Step 5: Commit.**

```bash
git add docs/architecture/reason-DECISIONS.md docs/architecture/blunder-reason-evidence.md docs/architecture/reason-case-taxonomy.md docs/architecture/reason-engine-pseudocode.md docs/architecture/reason-opponentPunishment-spec.md
git commit -m "docs(reason): D17 opponentPunishment denial + close D16 doc-sync"
```
