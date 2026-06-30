# Unified Occupation-Witness (draw_to_lose denial + win_to_draw migration) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the vague `parity_group` half-a for `draw_to_lose` with a concrete occupation-witness (the best move denies the opponent's conceded winning window by the player occupying a cell of it), and unify it with `win_to_draw` onto **one** parameterized PV-walk primitive.

**Architecture:** Generalize the committed `denyOpponentPunishment` BFS into a single `findOccupationWitness(solver, root, { denier, windows, depthCap })` that walks the **canonical optimal (argmax, both-sides) principal variation** and returns the first node where `denier` occupies a cell of `windows` (window LIVE before → DEAD after). The theorem *"a draw is a full board with no four, so every winning-for-S window holds ≥1 not-S disc"* guarantees the witness exists once the walk reaches the full-board terminal — so a single PV walk suffices and the BFS branching is retired (I9/Occam). `win_to_draw` (denier = opponent, root = `playedRoot`, windows = player's fork windows) and `draw_to_lose` (denier = player, root = `bestRoot`, windows = the opponent's conceded winning window) both call it. This revises the LOCKED D17 contract (shallowest-across-lines → first-on-canonical-PV) and is recorded as appended decision **D18**.

**Tech Stack:** Node ESM (`reasonEngine.mjs`), `node:test` via `npm run test:fast` (inside `connect-four/`), c4solver wrapper, the production `classifier.js` detectors, the `/admin/fv-suff` React viewer.

## Global Constraints

- **Coordinates 0-indexed internally; engine emits `cNrM` 1-indexed.** Never use 1-indexed in code/tests.
- **I0 correctness over optimization:** extra solver calls are acceptable; never weaken the search to save queries. A PV walk is O(plies); walk to the full-board terminal.
- **I2 never fabricate:** every clause solver-grounded; abstain (`no_occupation` / `tacticTag:null`) rather than invent.
- **I3/D8 two halves stay in SEPARATE fields**; never merge the half-a denial cell with the half-b opponent completing cell.
- **I6/D6 bounded by DEPTH, never a budget heuristic.**
- **I8 reuse production detectors/walkers:** `killedWindow`, `classifyPattern`, `walkOptimal`, `isTerminalPosition`, `buildBoard`, `cellStr`, `parseCell`.
- **I12 validate against the case-space:** one counterexample board per case, probed **through the production engine** (`computeReason`), never a hand-rolled proxy.
- **Source boards from fixtures / `gameSampling.playGame`, never hand-roll** (memory `feedback_no_random_boards`).
- **Two honest claims, never merged (D17/D18):** LOCAL = "the denier occupies cell X of window W" (verified LIVE→DEAD); GLOBAL = "the line draws" (carried by the case). Never claim "this one move refutes everything."
- **Tests:** `npm run test:fast` inside `connect-four/`. Inline solver scripts must `await solver.query` and `solver.destroy()` in a `finally`.
- **Do not relitigate the four canonical docs.** If anything conflicts with INVARIANTS / DECISIONS / my_pseudocode / blunder-reason-evidence, STOP and ask.

**Validated anchor boards (ground truth, already observed):**
- `draw_to_lose` ZUGZWANG: `2444422235255630400333` played `0` (best `1`). Opponent conceded window W = `c4r6 c5r6 c6r6 c7r6` (completes `c7r6`). From `bestRoot` the **player** occupies `c4r6` (ply 33) then `c5r6` (ply 35) → final window `Gn Gn Gy Gy` → draw. First player occupation = **`c4r6`** = the denial witness. (Current engine: half-a `parity_group c6r6`, tie falsely `independent`.)
- `draw_to_lose` TACTICAL: `3342652233354244431011` played `0` (best `1`). holdCell `c2r4`, opponent window `c2r4 c3r4 c4r4 c5r4`. The best move occupies `c2r4` ∈ W → occupation **at root** (ply 0), tie `tied` at `c2r4`. (Already `tied` today; must remain so.)
- `win_to_draw` occupation: `214444115623` played `4`. Opponent occupies `c3r3` (fork window `c3r3 c4r3 c5r3 c6r3`). Canonical PV reproduces the BFS witness (`c3r3`, opponent's first move) — verified.

---

### Task 0: Plan grounding review (no code)

**Files:** none (review only — produce a short written sign-off in the task PR/notes).

**Interfaces:**
- Consumes: this plan + the four canonical docs + `reason-opponentPunishment-spec.md`.
- Produces: a go/no-go sign-off; a list of any conflicts found.

- [ ] **Step 1: Re-read the binding docs and check each design claim against them.** Read `reason-INVARIANTS.md`, `reason-DECISIONS.md` (esp. D7, D8, D14, D16, D17), `my_pseudocode.md`, `blunder-reason-evidence.md`, `reason-opponentPunishment-spec.md`, `reason-engine-pseudocode.md`. For each, confirm:
  - The PV-walk-replaces-BFS migration is consistent with I0/I6/I9 and that the **only** semantic change is D17's "shallowest" guarantee → "first-on-canonical-PV" (recorded as D18, Task 6). Confirm D17 §3a already declares the tie-break "NOT part of the contract" and correctness defined solely by §3 (a LIVE→DEAD occupation exists).
  - The `draw_to_lose` flip keeps the two halves in separate fields (D8): half a = denial witness (player blocks W), half b = the opponent's winning line (unchanged). The constructive tie lives on `opponentPunishment.tie` (consistent with D14/D17) but is produced by the half-a occupation cell.
  - Parity naming stays DEFERRED for *prose* (D7) — the occupation witness *exhibits* the blocking cell concretely without naming Allis/Aftereven, which is allowed.
- [ ] **Step 2: Confirm no conflict.** If any check fails or a canonical doc contradicts this plan, STOP and ask the owner — do NOT redesign. Otherwise record sign-off and proceed.
- [ ] **Step 3: Commit** the sign-off note (if kept as a file) or proceed (no commit needed for a review-only step).

---

### Task 1: Generalize `denyOpponentPunishment` → `findOccupationWitness` (PV primitive)

**Files:**
- Modify: `connect-four/server/scripts/reason_audit/reasonEngine.mjs` (add `findOccupationWitness`; keep `killedWindow`, `isTerminalPosition` as-is; do NOT yet remove `denyOpponentPunishment`).
- Test: `connect-four/server/tests/reasonEngine.witness.test.mjs` (new).

**Interfaces:**
- Consumes: `killedWindow(ms, cell, windows, denier)`, `isTerminalPosition(ms)`, `buildBoard`, `cellStr`, `COLS`, `ROWS`, `INVALID_MOVE`.
- Produces: `export async function findOccupationWitness(solver, root, { denier, windows, depthCap })` →
  `{ verdict: 'occupation'|'no_occupation', line: [{ply,mover,col,cell,score}], finalMovestring, cell?, window?, exhaustive }`.
  - `denier` is the mark (1|2) that must occupy a window cell.
  - `occupation`: `line` = root→witness (empty `[]` when the witness IS the move that produced `root` — the root pre-check); `cell`/`window` set; `exhaustive:true`.
  - `no_occupation`: `line:[]`, `finalMovestring:root`, `cell`/`window` absent; `exhaustive` = reached a full-board terminal without occupation (true) vs hit `depthCap` / solver-errored on a non-terminal node (false).

- [ ] **Step 1: Write the failing tests.**

```js
// reasonEngine.witness.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { createSolverProcess } from '../c4solver-wrapper.js';
import { findOccupationWitness } from '../scripts/reason_audit/reasonEngine.mjs';

let solver;
before(async () => { solver = await createSolverProcess(); });
after(() => { if (solver) solver.destroy(); });

const remaining = (ms) => 42 - ms.length;

test('win_to_draw PV witness reproduces the BFS witness c3r3 (denier=opponent)', async () => {
  const root = '214444115623' + '4';                 // playedRoot; player=1 played, denier=opponent=2
  const W = ['c3r3', 'c4r3', 'c5r3', 'c6r3'];
  const d = await findOccupationWitness(solver, root, { denier: 2, windows: [W], depthCap: remaining(root) });
  assert.equal(d.verdict, 'occupation');
  assert.equal(d.cell, 'c3r3');
  assert.ok(d.window.includes('c3r3') && d.window.includes('c4r3'));
  assert.ok(d.exhaustive === true);
});

test('draw_to_lose ZUGZWANG: from bestRoot the player occupies c4r6 of the conceded window', async () => {
  const root = '2444422235255630400333' + '1';        // bestRoot; player=1 to deny, denier=player=1
  const W = ['c4r6', 'c5r6', 'c6r6', 'c7r6'];
  const d = await findOccupationWitness(solver, root, { denier: 1, windows: [W], depthCap: remaining(root) });
  assert.equal(d.verdict, 'occupation');
  assert.equal(d.cell, 'c4r6');                        // first player occupation on the canonical PV
  assert.deepEqual(d.window, W);
  assert.ok(d.line.length >= 1, 'a multi-ply witness line to the deep occupation');
});

test('draw_to_lose TACTICAL: best move already occupies holdCell -> occupation at root (line empty)', async () => {
  const root = '3342652233354244431011' + '1';        // bestRoot; best move lands c2r4 in opp window
  const W = ['c2r4', 'c3r4', 'c4r4', 'c5r4'];
  const d = await findOccupationWitness(solver, root, { denier: 1, windows: [W], depthCap: remaining(root) });
  assert.equal(d.verdict, 'occupation');
  assert.equal(d.cell, 'c2r4');
  assert.deepEqual(d.line, []);                         // root pre-check: the deciding move IS root's last disc
  assert.equal(d.finalMovestring, root);
});

test('no_occupation fallback: a tiny depthCap forces exhaustive:false (cap hit, not a structural claim)', async () => {
  const root = '2444422235255630400333' + '1';
  const W = ['c4r6', 'c5r6', 'c6r6', 'c7r6'];          // first occupation is deep (~ply 33); cap 2 cannot reach it
  const d = await findOccupationWitness(solver, root, { denier: 1, windows: [W], depthCap: 2 });
  assert.equal(d.verdict, 'no_occupation');
  assert.equal(d.exhaustive, false);
});
```

- [ ] **Step 2: Run the tests to verify they fail.**

Run: `cd connect-four && node --test server/tests/reasonEngine.witness.test.mjs`
Expected: FAIL — `findOccupationWitness is not a function` (not yet exported).

- [ ] **Step 3: Implement `findOccupationWitness`.** Add to `reasonEngine.mjs` near `denyOpponentPunishment`:

```js
// Generalized occupation-witness PV walk (D18 — supersedes denyOpponentPunishment's BFS).
// Walks the canonical optimal (argmax, both-sides) line from `root` and returns the first node where
// `denier` occupies a cell of `windows`, that window being LIVE before (no denier disc) and DEAD after.
// THEOREM: a draw is a full board with no four, so every winning-for-S 4-window holds >=1 not-S disc;
// thus once the walk reaches the full-board terminal the witness ALWAYS exists -> no branching needed
// (I9/Occam; the BFS this replaces was over-built). `depthCap` only bounds the walk; reaching it (or a
// solver error on a non-terminal node) yields the honest residual no_occupation (exhaustive:false). I0/I2/I6.
export async function findOccupationWitness(solver, root, { denier, windows, depthCap }) {
  const wins = windows || [];
  const patternCells = new Set(wins.flat());

  // Root pre-check: the move that produced `root` may ITSELF be the denial — the denier's last disc
  // already sits in a window (draw_to_lose TACTICAL defensive_hold: the best move occupies the
  // opponent's win-in-one cell). killedWindow's LIVE-before test cannot see a window already DEAD at
  // root, so detect it here (honest-limit: already-dead-at-root window). This NEVER fires for
  // win_to_draw, where root's last disc is the PLAYER's played move, not the denier's (=opponent).
  if (root.length) {
    const mover = (root.length % 2 === 1) ? 1 : 2;     // who placed root's last disc
    if (mover === denier) {
      const { heights } = buildBoard(root);
      const lastCol = Number(root[root.length - 1]);
      const cell = cellStr(heights[lastCol] - 1, lastCol);
      for (const w of wins) {
        if (w.includes(cell)) {
          return { verdict: 'occupation', line: [], finalMovestring: root, cell, window: w, exhaustive: true };
        }
      }
    }
  }

  const parent = new Map();
  const lineTo = (ms) => { const out = []; let c = ms; while (parent.has(c)) { const e = parent.get(c); out.unshift({ ply: c.length, mover: e.mover, col: e.col, cell: e.cell, score: e.score }); c = e.ms; } return out; };

  let cur = root;
  let errored = false, reachedTerminal = false;
  for (let step = 0; step < depthCap; step++) {
    let scores;
    try { scores = await solver.query(cur); }
    catch { if (!isTerminalPosition(cur)) errored = true; else reachedTerminal = true; break; }
    const mover = (cur.length % 2 === 0) ? 1 : 2;
    let bestCol = -1, best = -Infinity;
    for (let c = 0; c < COLS; c++) { if (scores[c] === INVALID_MOVE) continue; if (scores[c] > best) { best = scores[c]; bestCol = c; } }
    if (bestCol === -1) { reachedTerminal = true; break; }   // no legal move -> terminal
    const { heights } = buildBoard(cur);
    const cell = cellStr(heights[bestCol], bestCol);
    const child = cur + String(bestCol);
    if (mover === denier && patternCells.has(cell)) {
      const w = killedWindow(cur, cell, wins, denier);       // LIVE before -> DEAD after
      if (w) {
        parent.set(child, { ms: cur, mover, col: bestCol, cell, score: scores[bestCol] });
        return { verdict: 'occupation', line: lineTo(child), finalMovestring: child, cell, window: w, exhaustive: true };
      }
    }
    parent.set(child, { ms: cur, mover, col: bestCol, cell, score: scores[bestCol] });
    cur = child;
    if (cur.length >= ROWS * COLS) { reachedTerminal = true; break; }   // full board reached
  }
  return { verdict: 'no_occupation', line: [], finalMovestring: root, exhaustive: reachedTerminal && !errored };
}
```

- [ ] **Step 4: Run the tests to verify they pass.**

Run: `cd connect-four && node --test server/tests/reasonEngine.witness.test.mjs`
Expected: PASS (4/4).

- [ ] **Step 5: Commit.**

```bash
git add connect-four/server/scripts/reason_audit/reasonEngine.mjs connect-four/server/tests/reasonEngine.witness.test.mjs
git commit -m "feat(reason): unified findOccupationWitness PV primitive (D18 precursor)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Migrate `win_to_draw` half (b) onto the PV primitive; retire the BFS

**Files:**
- Modify: `connect-four/server/scripts/reason_audit/reasonEngine.mjs` (the `win_to_draw` fork branch of `computeReason`; remove `denyOpponentPunishment`).
- Test: `connect-four/server/tests/reasonEngine.denial.test.mjs` (update to the PV primitive + cap semantics).

**Interfaces:**
- Consumes: `findOccupationWitness` (Task 1); `out.lostResource.forkWindows`; `opponent`, `playedRoot`.
- Produces: `out.opponentPunishment` for fork `win_to_draw` unchanged in SHAPE (`kind:'denial'`, `verdict`, `line`, `finalMovestring`, `cell`, `window`, `exhaustive`, `entryCell`, `tie`) but produced by the PV primitive.

- [ ] **Step 1: Update the failing tests** in `reasonEngine.denial.test.mjs`:
  - Keep the two occupation tests (`214444115623` → `c3r3`) but call `findOccupationWitness(solver, ms+'4', forkWindows, { denier: r.opponent, windows: forkWindows, depthCap: 42 - (ms.length+1) })` instead of `denyOpponentPunishment`. Assert `verdict==='occupation'`, `cell==='c3r3'`, `window.includes('c3r3')`, and the `computeReason` end-to-end assertions (`opponentPunishment.kind==='denial'`, `verdict==='occupation'`, `tie.kind==='tied'`, `tie.sharedCells===['c3r3']`) — these are UNCHANGED.
  - Replace the `no_occupation` test for `3333302111456114554542`: under cap-to-terminal it now finds an occupation (the theorem), so assert `verdict==='occupation'` there. Re-add a dedicated `no_occupation` regression by calling `findOccupationWitness` with `depthCap: 2` (cap hit) and asserting `verdict==='no_occupation'`, `exhaustive===false`. (Covered already by Task 1's witness test; keep one here scoped to the win_to_draw board for locality.)
  - Update the M3 throwing-solver test to call `findOccupationWitness(throwingSolver, '2144441156234', { denier: 2, windows: [['c3r3','c4r3','c5r3','c6r3']], depthCap: 8 })` and assert `verdict==='no_occupation'`, `exhaustive===false` (non-terminal solver throw must not inflate exhaustive).

- [ ] **Step 2: Run to verify the relevant tests fail.**

Run: `cd connect-four && node --test server/tests/reasonEngine.denial.test.mjs`
Expected: FAIL — `findOccupationWitness`/cap calls not yet wired into `computeReason`; old `denyOpponentPunishment` import still present.

- [ ] **Step 3: Wire `computeReason`'s `win_to_draw` fork branch to the primitive.** In `reasonEngine.mjs`, replace the fork denial block:

```js
    if (out.lostResource.terminal === 'fork') {
      // Fork win_to_draw (D18): the opponent (denier) occupies a fork-window cell under optimal play.
      const denial = await findOccupationWitness(solver, playedRoot, {
        denier: opponent, windows: out.lostResource.forkWindows || [],
        depthCap: ROWS * COLS - playedRoot.length,
      });
      out.opponentPunishment = {
        kind: 'denial', verdict: denial.verdict,
        register: (denial.line && denial.line.length > 1) ? 'forced_sequence' : 'immediate',
        line: denial.line, finalMovestring: denial.finalMovestring,
        completingCell: denial.cell ?? null, window: denial.window ?? null,
        cell: denial.cell ?? null, exhaustive: denial.exhaustive,
        entryCell: denial.cell ?? null,
      };
      out.opponentPunishment.tie = denial.verdict === 'occupation'
        ? { kind: 'tied', sharedCells: [denial.cell] }
        : { kind: 'independent', sharedCells: [] };
    } else {
      // ... non-fork neutralization block UNCHANGED ...
```

  Then delete the now-unused `denyOpponentPunishment` function and its export. Grep for residual references:
  `grep -rn "denyOpponentPunishment" connect-four/` → update/remove all.

- [ ] **Step 4: Run the full denial + witness suites.**

Run: `cd connect-four && node --test server/tests/reasonEngine.denial.test.mjs server/tests/reasonEngine.witness.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add connect-four/server/scripts/reason_audit/reasonEngine.mjs connect-four/server/tests/reasonEngine.denial.test.mjs
git commit -m "refactor(reason): win_to_draw denial onto PV primitive; retire BFS (D18)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Flip `draw_to_lose` — half a becomes the denial witness; window-aware constructive tie

**Files:**
- Modify: `connect-four/server/scripts/reason_audit/reasonEngine.mjs` (the `draw_to_lose` branch of `computeReason`; the final tieTo guard).
- Test: `connect-four/server/tests/reasonEngine.drawToLose.test.mjs` (new).

**Interfaces:**
- Consumes: `findOccupationWitness` (Task 1); `walkOptimal` (half b, unchanged); `nameWalkedHalf`; `player`, `opponent`, `bestRoot`, `playedRoot`.
- Produces: `out.lostResource` for `draw_to_lose` becomes `{ kind:'denial', verdict, register, line, finalMovestring, completingCell, window, cell, exhaustive, anchorCells }` (replaces `parity_group`; tactical sub-case yields a ply-0 root occupation). `out.opponentPunishment.tie` is set constructively from the half-a occupation cell (`tied` when occupation, `independent` otherwise).

- [ ] **Step 1: Write the failing tests.**

```js
// reasonEngine.drawToLose.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { createSolverProcess } from '../c4solver-wrapper.js';
import { computeReason } from '../scripts/reason_audit/reasonEngine.mjs';

let solver;
before(async () => { solver = await createSolverProcess(); });
after(() => { if (solver) solver.destroy(); });

test('draw_to_lose ZUGZWANG: half-a denial occupies c4r6 of the opponent window; tie window-aware tied', async () => {
  const r = await computeReason('2444422235255630400333', 0, { solver });
  assert.equal(r.case, 'draw_to_lose');
  // half b (opponentPunishment) UNCHANGED: opponent's conceded winning line.
  assert.equal(r.opponentPunishment.kind, 'winning_line');
  assert.deepEqual(r.opponentPunishment.window, ['c4r6', 'c5r6', 'c6r6', 'c7r6']);
  // half a: the best move denies that window by the PLAYER occupying a cell of it.
  assert.equal(r.lostResource.kind, 'denial');
  assert.equal(r.lostResource.verdict, 'occupation');
  assert.equal(r.lostResource.cell, 'c4r6');
  assert.ok(r.lostResource.window.includes('c4r6'));
  assert.ok(r.lostResource.finalMovestring && r.lostResource.line.length >= 1);
  // the constructive tie is now WINDOW-AWARE: c4r6 is inside the opponent's window -> tied (NOT independent).
  assert.equal(r.opponentPunishment.tie.kind, 'tied');
  assert.deepEqual(r.opponentPunishment.tie.sharedCells, ['c4r6']);
});

test('draw_to_lose TACTICAL: half-a denial is a root occupation of holdCell; tie tied at c2r4', async () => {
  const r = await computeReason('3342652233354244431011', 0, { solver });
  assert.equal(r.case, 'draw_to_lose');
  assert.equal(r.lostResource.kind, 'denial');
  assert.equal(r.lostResource.verdict, 'occupation');
  assert.equal(r.lostResource.cell, 'c2r4');
  assert.deepEqual(r.lostResource.line, []);                 // immediate: the best move IS the denial
  assert.equal(r.lostResource.register, 'immediate');
  assert.equal(r.opponentPunishment.tie.kind, 'tied');
  assert.deepEqual(r.opponentPunishment.tie.sharedCells, ['c2r4']);
});
```

- [ ] **Step 2: Run to verify they fail.**

Run: `cd connect-four && node --test server/tests/reasonEngine.drawToLose.test.mjs`
Expected: FAIL — `lostResource.kind` is currently `parity_group`/`defensive_hold`, tie `independent` on the zugzwang board.

- [ ] **Step 3: Rewrite the `draw_to_lose` branch of `computeReason`.** Replace the whole `else if (bestScore === 0 && playedScore < 0)` block with: compute half b FIRST, then half a as the occupation witness against half b's window(s):

```js
  } else if (bestScore === 0 && playedScore < 0) {
    // ── draw_to_lose (D18 flip) ──
    out.case = CASES.DRAW_TO_LOSE;
    // half (b) FIRST, UNCHANGED: the opponent's conceded winning line after the blunder.
    const bWalk = await walkOptimal(solver, playedRoot, opponent);
    out.opponentPunishment = renderHalf('winning_line', bWalk, fwdOf(playedScore, discs), { rootMs: playedRoot, winnerMark: opponent });
    Object.assign(out.opponentPunishment, await nameWalkedHalf(solver, out.opponentPunishment, playedRoot, opponent));
    // the window(s) the opponent rides: fork windows if fork-stopped, else the single winning window.
    const concededWindows = (out.opponentPunishment.terminal === 'fork')
      ? (out.opponentPunishment.forkWindows || [])
      : (out.opponentPunishment.window ? [out.opponentPunishment.window] : []);
    // half (a): how the BEST (draw) move denies that window — the player (denier) occupies a cell of W.
    // THEOREM: bestRoot draws -> its full-board terminal fills W with >=1 player disc -> occupation
    // always exists; tactical defensive_hold falls out as a ply-0 root occupation (no special-case).
    const denial = await findOccupationWitness(solver, bestRoot, {
      denier: player, windows: concededWindows, depthCap: ROWS * COLS - bestRoot.length,
    });
    out.lostResource = {
      kind: 'denial', verdict: denial.verdict,
      register: (denial.line && denial.line.length > 0) ? 'forced_sequence' : 'immediate',
      line: denial.line, finalMovestring: denial.finalMovestring,
      completingCell: denial.cell ?? null, window: denial.window ?? null,
      cell: denial.cell ?? null, exhaustive: denial.exhaustive,
      anchorCells: denial.cell ? [denial.cell] : [],
    };
    Object.assign(out.lostResource, await nameHalf(solver, bestRoot, player, { diffAgainst: playedRoot }));
    // constructive, window-aware tie (fixes the false `independent`): the player's blocking cell is
    // inside the opponent's window -> tied at that cell. (D8: still two separate fields.)
    out.opponentPunishment.tie = denial.verdict === 'occupation'
      ? { kind: 'tied', sharedCells: [denial.cell] }
      : { kind: 'independent', sharedCells: [] };
  } else if (bestScore < 0 && playedScore < 0) {
```

  Remove now-dead `draw_to_lose` helpers if unused elsewhere: `opponentImmediateThreatCells`, the `parityCells` import, `holdCell`/`hit` logic. Grep first — `opponentImmediateThreatCells` and `parityCells` may have no other caller:
  `grep -rn "opponentImmediateThreatCells\|parityCells" connect-four/server/scripts/reason_audit/` → delete only if `draw_to_lose` was the sole consumer; otherwise leave.

- [ ] **Step 4: Update the final tieTo guard** so it does not overwrite EITHER half's constructive denial tie. Change:

```js
  // Constructive denial ties (win_to_draw half b; draw_to_lose half a) are already set — do not overwrite.
  if (out.lostResource && out.opponentPunishment
      && out.lostResource.kind !== 'denial' && out.opponentPunishment.kind !== 'denial') {
    out.opponentPunishment.tie = tieTo(out.case, out.lostResource, out.opponentPunishment);
  }
```

- [ ] **Step 5: Run the draw_to_lose suite + full fast suite.**

Run: `cd connect-four && node --test server/tests/reasonEngine.drawToLose.test.mjs && npm run test:fast`
Expected: PASS (new draw_to_lose tests green; no regressions in `reasonEngine.test.mjs` / `reasonEngine.denial.test.mjs` / `reasonEngine.enrichment.test.mjs`). If `reasonEngine.test.mjs` asserts the old `parity_group`/`defensive_hold` half-a shape for a `draw_to_lose` fixture row, update those assertions to the `denial` shape here.

- [ ] **Step 6: Commit.**

```bash
git add connect-four/server/scripts/reason_audit/reasonEngine.mjs connect-four/server/tests/reasonEngine.drawToLose.test.mjs
git commit -m "feat(reason): draw_to_lose half-a is the occupation-denial witness; window-aware tie (D18)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: I12 case-space validation (counterexample per case, through the engine)

**Files:**
- Modify: `connect-four/server/tests/reasonEngine.drawToLose.test.mjs` (add the case-space assertions) and `reasonEngine.witness.test.mjs` (already covers win_to_draw + no_occupation fallback).

**Interfaces:**
- Consumes: `computeReason`, the validated boards.
- Produces: a documented counterexample for each sub-case, asserted through the production engine (not a proxy).

- [ ] **Step 1: Add the case-space assertions** (each board already sourced from the fixture / observed, per `feedback_no_random_boards`):
  - TACTICAL `draw_to_lose` `3342652233354244431011` → root occupation `c2r4`, `line:[]`, register `immediate` (Task 3 covers; keep).
  - ZUGZWANG `draw_to_lose` `2444422235255630400333` → deep occupation `c4r6`, multi-ply line, `tied` (Task 3 covers; keep).
  - `win_to_draw` occupation `214444115623` → `c3r3` (Task 2 covers; keep).
  - `no_occupation` fallback exercised via tiny `depthCap` (Task 1 covers; keep).
  - Add ONE assertion that the ZUGZWANG occupation cell lies **inside** `opponentPunishment.window` (proves the tie is window-aware, not merely entry/completing-cell intersection): `assert.ok(r.opponentPunishment.window.includes(r.lostResource.cell))`.

- [ ] **Step 2: Run to confirm the new assertion fails if the tie regressed to a cell outside the window.** (Sanity: temporarily point the assertion at a non-window cell, confirm RED, revert.)

Run: `cd connect-four && node --test server/tests/reasonEngine.drawToLose.test.mjs`
Expected: PASS after revert.

- [ ] **Step 3: Run the full fast suite.**

Run: `cd connect-four && npm run test:fast`
Expected: PASS.

- [ ] **Step 4: Commit.**

```bash
git add connect-four/server/tests/reasonEngine.drawToLose.test.mjs
git commit -m "test(reason): I12 case-space counterexamples for the occupation witness (D18)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Regenerate evidence; confirm `/admin/fv-suff` two-board rendering

**Files:**
- Regenerate: `connect-four/server/scripts/reason_evidence_all.jsonl` (via `build_evidence.mjs`).
- Confirm (read-only): `connect-four/src/pages/AdminFvSuffPage.jsx` (renders two `HalfBoard`s from each half's `finalMovestring` + numbered `line` lookahead).

**Interfaces:**
- Consumes: `build_evidence.mjs`, the committed fixture, the new engine.
- Produces: a regenerated evidence file whose `draw_to_lose` rows now carry a half-a `denial` with a non-null `finalMovestring`/`line` (was `parity_group` with `finalMovestring:null`).

- [ ] **Step 1: Regenerate the evidence file.**

Run: `cd connect-four && node server/scripts/reason_audit/build_evidence.mjs`
Expected: writes `server/scripts/reason_evidence_all.jsonl`; no solver errors.

- [ ] **Step 2: Spot-check the two draw_to_lose rows.** Confirm the zugzwang row (`2444422235255630400333`,0) now has `lostResource.kind==='denial'`, `lostResource.finalMovestring` non-null, `lostResource.cell==='c4r6'`, and `opponentPunishment.tie.kind==='tied'`:

Run: `cd connect-four && grep -F '"2444422235255630400333"' server/scripts/reason_evidence_all.jsonl | python3 -c "import json,sys; d=json.loads(sys.stdin.readline()); lr=d['lostResource']; print(lr['kind'], lr.get('cell'), bool(lr.get('finalMovestring')), d['opponentPunishment']['tie'])"`
Expected: `denial c4r6 True {'kind': 'tied', 'sharedCells': ['c4r6']}`.

- [ ] **Step 3: Confirm the viewer renders both boards.** Read `AdminFvSuffPage.jsx` `HalfBoard`/`HalfDetail`: it draws `half.finalMovestring` with `lookaheadSteps(ms, baseLen)` (numbered ①②… lookahead) for BOTH `lostResource` and `opponentPunishment`. Since half-a now carries `finalMovestring` + `line`, board (1) (best→draw, player holds the blocking cell) renders alongside board (2) (played→loss, opponent completes W). No viewer code change required — confirm by reading and, if a dev server is available, loading `/admin/fv-suff` and stepping to the zugzwang row. If the half-a board does NOT render (e.g. it keys off a `kind` allowlist), surface that as a follow-up — do not silently special-case.

- [ ] **Step 4: Commit the regenerated evidence.**

```bash
git add connect-four/server/scripts/reason_evidence_all.jsonl
git commit -m "chore(reason): regenerate evidence with draw_to_lose occupation witness (D18)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Canonical-doc sync (D18 + the no_occupation→depth-artifact correction)

**Files:**
- Modify: `docs/architecture/reason-DECISIONS.md` (append **D18**).
- Modify: `docs/architecture/reason-engine-pseudocode.md` (replace `denial_search` BFS with the unified PV `find_occupation_witness`; update `punish_half` win_to_draw + the `draw_to_lose` half-a / tie).
- Modify: `docs/architecture/my_pseudocode.md` (update the `draw_to_lose` reason comment + the `win_to_draw` half-b comment).
- Modify: `docs/architecture/blunder-reason-evidence.md` (§2 half-a/half-b table for draw_to_lose; §7 note that the parity_group fallback is replaced by the occupation witness for draw_to_lose).
- Modify: `docs/architecture/reason-opponentPunishment-spec.md` (status note: superseded-in-part by D18; BFS → PV).

**Interfaces:**
- Consumes: the implemented engine + tests.
- Produces: canonical docs consistent with D18. (Append-only for DECISIONS; do not edit D17 in place.)

- [ ] **Step 1: Append D18 to `reason-DECISIONS.md`** (after D17), stating: (a) one unified `findOccupationWitness` PV primitive replaces the win_to_draw BFS AND adds the draw_to_lose denial; (b) **supersedes the "shallowest-by-BFS" portion of D17 §3** — the witness is now the **first occupation on the canonical optimal PV** (shallowest is no longer guaranteed; this was already declared non-contractual in D17 §3a, and correctness (a LIVE→DEAD occupation) is unchanged); (c) for `draw_to_lose`, half a = the player's occupation of the opponent's conceded window (the constructive, **window-aware** tie fixes the former false `independent`); the TACTICAL sub-case falls out as a ply-0 root occupation (no special-case); (d) `no_occupation:exhaustive=true` is now a **depth-budget artifact, not a structural verdict** — the theorem guarantees occupation by the full-board terminal, so with `depthCap = 42 − len(root)` occupation is always found; `no_occupation` only honestly fires on a deliberately small cap or a non-terminal solver error (`exhaustive:false`). Cite the I12 counterexamples (tactical `3342652233354244431011`, zugzwang `2444422235255630400333`, win_to_draw `214444115623`). Rationale: I9/Occam (one mechanism, roles swapped), I0 (PV is O(plies); walk to terminal), I2 (every node solver-grounded). Status: LOCKED.

- [ ] **Step 2: Update `reason-engine-pseudocode.md`:** replace the `denial_search` BFS section with `find_occupation_witness(root, denier, windows, depthCap)` (PV walk + root pre-check + the theorem note). In `punish_half`, `win_to_draw` fork → `find_occupation_witness(playedRoot, denier=opponent, against.forkWindows)`. Add the `draw_to_lose` half-a path: compute half b first, then `lostResource = find_occupation_witness(bestRoot, denier=player, concededWindows)`, set the constructive window-aware tie. Update the `tie_to` `draw_to_lose` note (no longer "independent by design" — now `tied` at the occupation cell; remove the stale "hold cell != completing cell" zugzwang claim).

- [ ] **Step 3: Update `my_pseudocode.md`** `draw_to_lose` and `win_to_draw` comments to point at the unified occupation witness (the half-a denial for draw_to_lose; PV not BFS for win_to_draw).

- [ ] **Step 4: Update `blunder-reason-evidence.md`** §2 table: `draw_to_lose` half (a) kind becomes `denial` (occupation witness) for both sub-cases; §6 zugzwang `draw_to_lose` bullet: the hold/denial cell is `c4r6` **inside** the opponent window (tied), not `c2r3`/independent; §7: note the `parity_group` fallback is superseded by the occupation witness for `draw_to_lose` (parity *prose* naming still deferred per D7).

- [ ] **Step 5: Add the status note to `reason-opponentPunishment-spec.md`** (top): "Superseded in part by D18 — the win_to_draw BFS is now the unified `findOccupationWitness` PV walk; §3's shallowest-by-BFS contract is replaced by first-on-canonical-PV. The output shape and the two-honest-claims rule are unchanged."

- [ ] **Step 6: Verify docs reference real symbols.** Grep that the docs no longer reference the deleted `denyOpponentPunishment` / `denial_search` as current:
  `grep -rn "denyOpponentPunishment\|denial_search" docs/architecture/` → only historical/superseded mentions remain (or none).

- [ ] **Step 7: Commit.**

```bash
git add docs/architecture/reason-DECISIONS.md docs/architecture/reason-engine-pseudocode.md docs/architecture/my_pseudocode.md docs/architecture/blunder-reason-evidence.md docs/architecture/reason-opponentPunishment-spec.md
git commit -m "docs(reason): D18 unified occupation witness; draw_to_lose flip; no_occupation as depth artifact

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage** (against the task brief):
- §1 problem (vague `parity_group`, false `independent`) → Task 3 (denial witness + window-aware tie).
- §2 theorem (PV walk suffices; no_occupation = depth artifact) → Task 1 primitive + D18 (Task 6).
- §3 design (one parameterized primitive; draw_to_lose flip half a/b; two boards; window-aware tie; two honest claims) → Tasks 1, 3, 5.
- §3 scope decision (migrate win_to_draw vs not) → **resolved by owner: migrate both** → Task 2 + D18.
- §4 plan requirements (plan conventions + `docs/superpowers/plans/`; TDD; I12 counterexample per case; reuse detectors; regenerate evidence; update docs; confirm viewer; FIRST grounding task) → Task 0 (first), Tasks 1–6.
- §5 honest limits (W is one realization; deep occupation; already-dead-at-root window) → carried in D18 + the primitive's root pre-check + the `findOccupationWitness` theorem comment.

**Placeholder scan:** every code step shows complete code; every run step shows the command + expected result. No TBD/"handle edge cases".

**Type consistency:** `findOccupationWitness(solver, root, { denier, windows, depthCap })` and its `{ verdict, line, finalMovestring, cell, window, exhaustive }` return shape are used identically in Tasks 1, 2, 3. `denier` (mark 1|2), `windows` (array of `cNrM[]`), `depthCap = ROWS*COLS - root.length` are consistent throughout. `out.opponentPunishment.tie` constructive shape `{ kind:'tied'|'independent', sharedCells }` matches D17/D14.

**Honest limits surfaced, not hidden:** (1) the conceded window W is ONE realization of the zugzwang win — the local occupation is illustrative, the global guarantee is the draw (D18 + GLOBAL claim); (2) the occupation can be deep (ply 33) — fine for a single PV walk; (3) `killedWindow`'s LIVE-before test cannot see a window already DEAD at root → handled by the explicit root pre-check (tactical defensive_hold).

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-06-30-unified-occupation-witness-draw-to-lose.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**
