# Grounded-Render Prompt — Phase 2 (Grounding) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Phase 1's faithful passthrough render into a *grounded* one: tag each board with curated tactics, resolve every vector cell to `{status, horizon, reachableInPlies, role}`, select only signal-carrying boards, and render a clean board + plain-language threat list — so the LLM reads grounded facts instead of reconstructing the game.

**Architecture:** Three new pure render-layer modules in `server/scripts/` — `reasonCellGrounding.mjs` (status/horizon/reachableInPlies/role), `reasonBoardTags.mjs` (`tagBoard`, reusing `classifier.js` detectors), `reasonBoardSelect.mjs` (`selectBoards` + clean-board ASCII with You/Opp labels + threat-list rendering). `renderReasonModel.mjs` is extended to assemble them and its `renderedFields` array traversal is fixed. No engine changes; condition D stays gradeable.

**Tech Stack:** Node.js ESM (`.mjs`), `node:test` + `node:assert/strict`. Reuses `server/classifier.js` (`parseBoardState`, `getMajorThreatCells`).

## Global Constraints

- **Coordinates 0-indexed internally** (row 0 = bottom, col 0 = left); `cNrM` strings 1-indexed. `[r,c]` (0-indexed) ↔ `c{c+1}r{r+1}`. Verbatim project invariant.
- **No solver scores in the prompt, ever** (already scrubbed upstream; the render must not reintroduce them).
- **Completeness invariant still holds** (spec §6): every present narrator-vector field must render, be causal-covered, or be excluded-with-reason, else `assertCoverage` throws. P2 must not break the corpus completeness gate.
- **Condition D must stay gradeable** — the assembled D prompt still ends with the `TASK` output-contract block (P1 fix `9f287ce`).
- **Reuse existing detectors; do not reimplement threat detection.** `classifier.js`: `parseBoardState(moves)→{board,colHeights}` (board[row][col], values 0/1/2, player 1 = move 0); `getMajorThreatCells(board)→ map "r,c"→{rm,rn,ym,yn}` (rm=player1 major (3 discs+1 empty), ym=player2 major; rn/yn are minors — IGNORE them). A major-threat cell `[r,c]` is **gravity-top / immediate** iff `r === colHeights[c]`.
- **Commit after each task** on branch `stagging` (not `main`). Commit trailer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **Authoritative spec:** `docs/architecture/reason-render-grounded-prompt.md` — §3c (render-object schema), §3e (selectBoards rule), §7 P2 decisions (5–10). This plan implements P2 of §5.
- **Decisions already settled (spec §7.5–10), do not relitigate:** board selection = Option A; `reachableInPlies` from `finalMovestring`; `horizon` = `immediate|deep-forced-line|deep-parity` from `register`; array-traversal fix required; tag presentation = clean board + threat list; disc labels `You`/`Opp`.

## Scope

Phase 2 only. It produces grounded boards + threat lists + grounded cells and wires them into condition D, but does NOT compose rich causal-frame *text* (frames stay P1-style), does NOT do the L2/L3 branch-invariance computation, and does NOT touch the grader/sampler (P3, P4). The sampler `board_*` predicates and grader board-awareness (§3e/§3f) are P4.

## File Structure

- Create `connect-four/server/scripts/reasonCellGrounding.mjs` — cell status/horizon/reachableInPlies/role. Pure.
- Create `connect-four/server/scripts/reasonBoardTags.mjs` — `tagBoard`. Reuses `classifier.js`.
- Create `connect-four/server/scripts/reasonBoardSelect.mjs` — `selectBoards`, `renderBoardAscii` (You/Opp), `renderThreatList`.
- Modify `connect-four/server/scripts/renderReasonModel.mjs` — fix `renderedFields` array traversal; integrate boards/grounded cells/threat lists into the render object + assembler.
- Create tests: `reasonCellGrounding.test.mjs`, `reasonBoardTags.test.mjs`, `reasonBoardSelect.test.mjs`; extend `renderReasonModel.test.mjs`; the existing `renderCoverageCorpus.test.mjs` must still pass.
- Modify `connect-four/package.json` — register the three new test files in `test:fast`.

---

### Task 1: Cell grounding — status, horizon, reachableInPlies, role

**Files:**
- Create: `connect-four/server/scripts/reasonCellGrounding.mjs`
- Test: `connect-four/server/tests/reasonCellGrounding.test.mjs`

**Interfaces:**
- Consumes: `parseBoardState` from `../classifier.js`.
- Produces: `cellToRC(cell)→[r,c]` and `rcToCell(r,c)→"cNrM"`; `horizonForRegister(register)→'immediate'|'deep-forced-line'|'deep-parity'`; `statusOf(cell, board, colHeights, perspectivePlayer)→'occupied-you'|'occupied-opp'|'empty-playable-now'|'empty'`; `reachableInPlies(cell, finalMovestring)→number|null` (ply index at which the cell fills along the line, or null if it never fills); `groundCell(cell, { board, colHeights, finalMovestring, register, role, perspectivePlayer })→{cell,status,horizon,reachableInPlies,role}`.

- [ ] **Step 1: Write the failing test**

```js
// connect-four/server/tests/reasonCellGrounding.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cellToRC, rcToCell, horizonForRegister, statusOf, reachableInPlies, groundCell }
  from '../scripts/reasonCellGrounding.mjs';
import { parseBoardState } from '../classifier.js';

test('cell <-> rc round trip (0-indexed rc, 1-indexed cNrM)', () => {
  assert.deepEqual(cellToRC('c1r4'), [3, 0]);
  assert.equal(rcToCell(3, 0), 'c1r4');
});

test('horizonForRegister maps register to horizon', () => {
  assert.equal(horizonForRegister('immediate'), 'immediate');
  assert.equal(horizonForRegister('forced_sequence'), 'deep-forced-line');
  assert.equal(horizonForRegister('parity'), 'deep-parity');
});

test('statusOf classifies occupancy + gravity-top', () => {
  // "01020": col0 = player1 at r0,r1,r2 (heights[0]=3); c1r4 (=[3,0]) is empty and playable now.
  const { board, colHeights } = parseBoardState('01020');
  assert.equal(statusOf('c1r4', board, colHeights, 1), 'empty-playable-now'); // r==height
  assert.equal(statusOf('c1r1', board, colHeights, 1), 'occupied-you');       // [0,0] = player1 = you
  assert.equal(statusOf('c2r1', board, colHeights, 1), 'occupied-opp');       // [0,1] = player2
  assert.equal(statusOf('c1r5', board, colHeights, 1), 'empty');              // [4,0] empty, not playable yet
});

test('reachableInPlies finds the fill ply along the final line', () => {
  // In "01020", col0's 3rd disc (c1r3 = [2,0]) is placed at move index 4.
  assert.equal(reachableInPlies('c1r3', '01020'), 4);
  assert.equal(reachableInPlies('c1r4', '01020'), null); // never filled in this string
});

test('groundCell composes the grounded object', () => {
  const { board, colHeights } = parseBoardState('01020');
  const g = groundCell('c1r4', { board, colHeights, finalMovestring: '010200', register: 'immediate',
                                 role: 'completes the winning line', perspectivePlayer: 1 });
  assert.deepEqual(g, { cell: 'c1r4', status: 'empty-playable-now', horizon: 'immediate',
                        reachableInPlies: 5, role: 'completes the winning line' });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd connect-four && node --test server/tests/reasonCellGrounding.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```js
// connect-four/server/scripts/reasonCellGrounding.mjs
// Resolve a vector cell to a grounded object (spec §3c). Pure; reuses classifier's board model.
import { parseBoardState } from '../classifier.js';

export function cellToRC(cell) {
  const m = /^c(\d+)r(\d+)$/.exec(cell);
  if (!m) throw new Error(`bad cell: ${cell}`);
  return [Number(m[2]) - 1, Number(m[1]) - 1]; // [row, col], 0-indexed
}
export function rcToCell(r, c) { return `c${c + 1}r${r + 1}`; }

export function horizonForRegister(register) {
  if (register === 'immediate') return 'immediate';
  if (register === 'forced_sequence') return 'deep-forced-line';
  if (register === 'parity') return 'deep-parity';
  return 'immediate'; // conservative default; only these three registers exist in the corpus
}

export function statusOf(cell, board, colHeights, perspectivePlayer) {
  const [r, c] = cellToRC(cell);
  const v = board[r]?.[c] ?? 0;
  if (v !== 0) return v === perspectivePlayer ? 'occupied-you' : 'occupied-opp';
  return r === colHeights[c] ? 'empty-playable-now' : 'empty';
}

export function reachableInPlies(cell, finalMovestring) {
  const [r, c] = cellToRC(cell);
  const heights = Array(7).fill(0);
  for (let i = 0; i < (finalMovestring || '').length; i++) {
    const col = Number(finalMovestring[i]);
    if (Number.isNaN(col) || col < 0 || col >= 7) continue;
    const row = heights[col];
    if (row >= 6) continue;
    if (col === c && row === r) return i;
    heights[col]++;
  }
  return null;
}

export function groundCell(cell, { board, colHeights, finalMovestring, register, role, perspectivePlayer }) {
  return {
    cell,
    status: statusOf(cell, board, colHeights, perspectivePlayer),
    horizon: horizonForRegister(register),
    reachableInPlies: reachableInPlies(cell, finalMovestring),
    role: role ?? null,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd connect-four && node --test server/tests/reasonCellGrounding.test.mjs`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add connect-four/server/scripts/reasonCellGrounding.mjs connect-four/server/tests/reasonCellGrounding.test.mjs
git commit -m "feat(reason-render): cell grounding — status/horizon/reachableInPlies/role (P2)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Board tagger — curated tactics per board

**Files:**
- Create: `connect-four/server/scripts/reasonBoardTags.mjs`
- Test: `connect-four/server/tests/reasonBoardTags.test.mjs`

**Interfaces:**
- Consumes: `parseBoardState`, `getMajorThreatCells` from `../classifier.js`; `rcToCell` from `./reasonCellGrounding.mjs`.
- Produces: `tagBoard(movestring, perspectivePlayer, opts?)→ Array<{cell,kind,owner,window?}>` where `kind ∈ 'major'|'immediate'|'double'` and `owner ∈ 'you'|'opp'`, plus, if `opts.patternTag` (e.g. `'figure_7'`) and `opts.patternWindow` are supplied from the vector, one `{cell:opts.patternCompletingCell, kind:opts.patternTag, owner, window:opts.patternWindow}` entry. Tags are sorted by cell for determinism.

**Behavior (this is an integration task — verify the detector return shapes named in Global Constraints before coding; if `getMajorThreatCells` does not return the `{rm,rn,ym,yn}` map described, STOP and report NEEDS_CONTEXT):**
1. Parse the board. Run `getMajorThreatCells`. For each `"r,c"` entry: if `rm` → a player-1 major; if `ym` → a player-2 major. IGNORE `rn`/`yn` (minors). Emit `{cell: rcToCell(r,c), kind: (r===colHeights[c] ? 'immediate' : 'major'), owner}` where `owner` = 'you' if that player === `perspectivePlayer` else 'opp'.
2. **Double threat:** if a single player owns ≥2 major cells in *distinct columns*, additionally emit a `{kind:'double', owner, ...}` tag on each of those cells (a move can't block both). Represent as marking those major tags' `kind` as `'double'` is NOT required — instead emit separate `double` tags referencing the pair; keep it simple: for each player with ≥2 distinct-column majors, emit one `{cell:<lowest such cell>, kind:'double', owner, window:[those cells]}`.
3. **Named pattern from the vector:** if `opts.patternTag`/`opts.patternWindow`/`opts.patternCompletingCell` are provided, emit one tag for it (owner per `opts.patternOwner`). This is how `figure_7`/`double_threat` names from the reason vector are surfaced — the board detects majors; the vector names the specific structure.

- [ ] **Step 1: Write the failing test**

```js
// connect-four/server/tests/reasonBoardTags.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tagBoard } from '../scripts/reasonBoardTags.mjs';

test('detects a gravity-top (immediate) major threat, owner via perspective', () => {
  // "01020": player1 has a vertical 3-in-col0, threatening c1r4 (=[3,0]); heights[0]=3 => gravity-top.
  const tags = tagBoard('01020', 1);
  const t = tags.find((x) => x.cell === 'c1r4');
  assert.ok(t, 'expected a tag at c1r4');
  assert.equal(t.kind, 'immediate');   // r === height
  assert.equal(t.owner, 'you');        // player1 === perspectivePlayer 1
});

test('same board from the opponent perspective flips owner', () => {
  const t = tagBoard('01020', 2).find((x) => x.cell === 'c1r4');
  assert.equal(t.owner, 'opp');
});

test('surfaces a named pattern from the vector when provided', () => {
  const tags = tagBoard('01020', 1, { patternTag: 'figure_7', patternCompletingCell: 'c4r3',
    patternWindow: ['c6r1', 'c5r2', 'c4r3', 'c3r4'], patternOwner: 'opp' });
  const fig = tags.find((x) => x.kind === 'figure_7');
  assert.ok(fig);
  assert.equal(fig.cell, 'c4r3');
  assert.deepEqual(fig.window, ['c6r1', 'c5r2', 'c4r3', 'c3r4']);
  assert.equal(fig.owner, 'opp');
});

test('no minor threats leak into the tag set', () => {
  // A lone 2-in-a-row must NOT produce a tag (minors excluded).
  const tags = tagBoard('0102', 1); // col0: p1 at r0,r1 only (2 discs) -> minor, not major
  assert.equal(tags.filter((t) => t.owner === 'you').length, 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd connect-four && node --test server/tests/reasonBoardTags.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```js
// connect-four/server/scripts/reasonBoardTags.mjs
// Curated per-board tactics (major/immediate/double + a vector-named pattern). Reuses classifier detectors.
// Deliberately EXCLUDES minor threats, scores, move numbers (spec §7 tagging decision).
import { parseBoardState, getMajorThreatCells } from '../classifier.js';
import { rcToCell } from './reasonCellGrounding.mjs';

export function tagBoard(movestring, perspectivePlayer, opts = {}) {
  const { board, colHeights } = parseBoardState(movestring);
  const majors = getMajorThreatCells(board); // "r,c" -> {rm,rn,ym,yn}
  const tags = [];
  const byOwnerCols = { you: new Map(), opp: new Map() }; // owner -> Map<col, cell> for double detection

  for (const [key, flags] of Object.entries(majors)) {
    const [r, c] = key.split(',').map(Number);
    for (const player of [1, 2]) {
      const isMajor = player === 1 ? flags.rm : flags.ym;
      if (!isMajor) continue;
      const owner = player === perspectivePlayer ? 'you' : 'opp';
      const cell = rcToCell(r, c);
      tags.push({ cell, kind: r === colHeights[c] ? 'immediate' : 'major', owner });
      if (!byOwnerCols[owner].has(c)) byOwnerCols[owner].set(c, cell);
    }
  }
  // Double threat: one owner with majors in >=2 distinct columns.
  for (const owner of ['you', 'opp']) {
    const cells = [...byOwnerCols[owner].values()].sort();
    if (cells.length >= 2) tags.push({ cell: cells[0], kind: 'double', owner, window: cells });
  }
  // Vector-named pattern (figure_7 / double_threat), surfaced verbatim from the reason vector.
  if (opts.patternTag && opts.patternCompletingCell) {
    tags.push({ cell: opts.patternCompletingCell, kind: opts.patternTag, owner: opts.patternOwner ?? 'opp',
                ...(opts.patternWindow ? { window: opts.patternWindow } : {}) });
  }
  return tags.sort((a, b) => (a.cell < b.cell ? -1 : a.cell > b.cell ? 1 : 0));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd connect-four && node --test server/tests/reasonBoardTags.test.mjs`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add connect-four/server/scripts/reasonBoardTags.mjs connect-four/server/tests/reasonBoardTags.test.mjs
git commit -m "feat(reason-render): board tagger — curated major/immediate/double + vector pattern (P2)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: selectBoards, You/Opp board ASCII, threat-list rendering

**Files:**
- Create: `connect-four/server/scripts/reasonBoardSelect.mjs`
- Test: `connect-four/server/tests/reasonBoardSelect.test.mjs`

**Interfaces:**
- Consumes: `tagBoard` from `./reasonBoardTags.mjs`; `parseBoardState` from `../classifier.js`.
- Produces:
  - `renderBoardAscii(movestring, perspectivePlayer)→string` — 6×7 grid, `You`→`Y`, `Opp`→`O`, empty `.`, header `c1..c7`, rows top→bottom, with a first line stating the mapping `"Y = you (player N), O = opponent"`.
  - `renderThreatList(tags)→string` — one line per tag: `"<kind> at <cell> (<owner>[, window <cells>])"`; returns `"(no tactics)"` if empty.
  - `selectBoards(fv)→ Array<{ id, movestring, ascii, tags, reason }>` implementing spec §3e: `decision` always; `afterBest` iff its tag-set differs from decision's; `afterPlayed` iff its tag-set differs from decision's; `projectedDeep` iff `fv.lostResource?.register` or `fv.opponentPunishment?.register ∈ {forced_sequence, parity}` (rendered from that half's `finalMovestring`). Tag-set equality = same sorted list of `cell|kind|owner`.

- [ ] **Step 1: Write the failing test**

```js
// connect-four/server/tests/reasonBoardSelect.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderBoardAscii, renderThreatList, selectBoards } from '../scripts/reasonBoardSelect.mjs';

test('renderBoardAscii labels You/Opp and states the mapping', () => {
  const ascii = renderBoardAscii('01020', 1);
  assert.match(ascii, /Y = you \(player 1\)/);
  assert.match(ascii, /O = opponent/);
  assert.match(ascii, /c1 +c2/);      // header
  assert.match(ascii, /Y/);            // player1 discs shown as Y
});

test('renderThreatList renders one sentence per tag', () => {
  const line = renderThreatList([{ cell: 'c1r4', kind: 'immediate', owner: 'you' },
                                 { cell: 'c4r3', kind: 'figure_7', owner: 'opp', window: ['c6r1','c5r2','c4r3','c3r4'] }]);
  assert.match(line, /immediate at c1r4 \(you\)/);
  assert.match(line, /figure_7 at c4r3 \(opp, window c6r1·c5r2·c4r3·c3r4\)/);
  assert.equal(renderThreatList([]), '(no tactics)');
});

test('selectBoards includes decision always and omits an unchanged after-best', () => {
  // A decision board with no tactic; the best move adds none either => afterBest omitted.
  const fv = { movestring: '0', bestCol: 6, playedCol: 1, player: 1, opponent: 2,
               lostResource: { register: 'immediate' }, opponentPunishment: { register: 'immediate' } };
  const boards = selectBoards(fv);
  assert.ok(boards.find((b) => b.id === 'decision'));
  assert.ok(!boards.find((b) => b.id === 'afterBest'), 'unchanged afterBest should be omitted');
});

test('selectBoards adds a projected-deep board when a half is deep', () => {
  const fv = { movestring: '3', bestCol: 3, playedCol: 4, player: 2, opponent: 1,
               lostResource: { register: 'parity', finalMovestring: '3333302' },
               opponentPunishment: { register: 'immediate' } };
  const boards = selectBoards(fv);
  assert.ok(boards.find((b) => b.id === 'projectedDeep'), 'deep resource => projected board present');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd connect-four && node --test server/tests/reasonBoardSelect.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```js
// connect-four/server/scripts/reasonBoardSelect.mjs
// Board selection (spec §3e Option A) + clean-board ASCII (You/Opp) + threat-list rendering (spec §7.10 (i)).
import { parseBoardState } from '../classifier.js';
import { tagBoard } from './reasonBoardTags.mjs';

export function renderBoardAscii(movestring, perspectivePlayer) {
  const { board } = parseBoardState(movestring);
  const sym = (v) => (v === 0 ? '.' : v === perspectivePlayer ? 'Y' : 'O');
  const oppPlayer = perspectivePlayer === 1 ? 2 : 1;
  const header = '      ' + Array.from({ length: 7 }, (_, c) => `c${c + 1}`).join(' ');
  const rows = [];
  for (let r = 5; r >= 0; r--) rows.push(` r${r + 1} |  ` + board[r].map(sym).join('  '));
  return `Y = you (player ${perspectivePlayer}), O = opponent (player ${oppPlayer})\n${header}\n${rows.join('\n')}`;
}

export function renderThreatList(tags) {
  if (!tags || tags.length === 0) return '(no tactics)';
  return tags.map((t) => {
    const win = t.window ? `, window ${t.window.join('·')}` : '';
    return `- ${t.kind} at ${t.cell} (${t.owner}${win})`;
  }).join('\n');
}

const DEEP = new Set(['forced_sequence', 'parity']);
const tagKey = (tags) => tags.map((t) => `${t.cell}|${t.kind}|${t.owner}`).sort().join(',');

export function selectBoards(fv) {
  const you = fv.player;
  const applyCol = (ms, col) => (col == null ? ms : ms + String(col));
  const decisionTags = tagBoard(fv.movestring ?? '', you);
  const decisionKey = tagKey(decisionTags);
  const out = [{ id: 'decision', movestring: fv.movestring ?? '', tags: decisionTags,
                 ascii: renderBoardAscii(fv.movestring ?? '', you),
                 reason: 'the position under judgment' }];

  for (const [id, col, why] of [['afterBest', fv.bestCol, 'the better move'],
                                ['afterPlayed', fv.playedCol, 'the move you played']]) {
    const ms = applyCol(fv.movestring ?? '', col);
    const tags = tagBoard(ms, you);
    if (tagKey(tags) !== decisionKey) {
      out.push({ id, movestring: ms, tags, ascii: renderBoardAscii(ms, you),
                 reason: `${why} — changes the tactical picture` });
    }
  }

  const deepHalf = [fv.lostResource, fv.opponentPunishment].find(
    (h) => h && DEEP.has(h.register) && h.finalMovestring);
  if (deepHalf) {
    out.push({ id: 'projectedDeep', movestring: deepHalf.finalMovestring,
               tags: tagBoard(deepHalf.finalMovestring, you),
               ascii: renderBoardAscii(deepHalf.finalMovestring, you),
               reason: `where the deep ${deepHalf.register} resource resolves` });
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd connect-four && node --test server/tests/reasonBoardSelect.test.mjs`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add connect-four/server/scripts/reasonBoardSelect.mjs connect-four/server/tests/reasonBoardSelect.test.mjs
git commit -m "feat(reason-render): selectBoards + You/Opp board + threat-list rendering (P2)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Fix renderedFields array traversal (P1-flagged leak)

**Files:**
- Modify: `connect-four/server/scripts/renderReasonModel.mjs` (the `renderedFields` function)
- Test: extend `connect-four/server/tests/renderReasonModel.test.mjs`

**Interfaces:**
- Consumes: `dispositionOf`, `leafPaths` from `./fieldDisposition.mjs` (already imported by the module — restore `leafPaths` if the P1 final-review removed it; this task needs it).
- Produces: `renderedFields` that, in addition to its P1 behavior, recurses into **array elements that are objects** and classifies each element leaf by its full element-path (mirroring `leafPaths`), dropping `transformed`/`exclude` subfields while keeping `render` ones — so once `window` is `[{cell, status, ...}]` a transformed/excluded subfield is dropped, not the whole array kept wholesale.

- [ ] **Step 1: Write the failing test (append to renderReasonModel.test.mjs)**

```js
test('renderedFields prunes transformed/excluded subfields inside object arrays', () => {
  // window as an array of grounded-cell objects; `finalMovestring` (transformed) nested per element
  // must be dropped, while `cell`/`status` (render) survive.
  const m = buildReasonRenderModel({ ...NV,
    lostResource: { ...NV.lostResource,
      window: [{ cell: 'c4r3', status: 'empty', finalMovestring: 'zzz' },
               { cell: 'c5r4', status: 'occupied-you', finalMovestring: 'zzz' }] } });
  const w = m.rendered.lostResource.window;
  assert.equal(w[0].cell, 'c4r3');                 // render subfield kept
  assert.equal(w[0].status, 'empty');              // render subfield kept
  assert.ok(!('finalMovestring' in w[0]));          // transformed subfield dropped
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd connect-four && node --test server/tests/renderReasonModel.test.mjs`
Expected: FAIL — the new test fails (current `renderedFields` keeps object arrays wholesale, so `finalMovestring` survives).

- [ ] **Step 3: Update `renderedFields`**

Replace the array-handling branch so object arrays are pruned element-wise. The full corrected function:

```js
function renderedFields(prunedFv) {
  function pruneArray(arr, prefix) {
    return arr.map((el) => (el !== null && typeof el === 'object' && !Array.isArray(el))
      ? prune(el, prefix + '[]')
      : el);
  }
  function prune(node, prefix) {
    if (node === null || typeof node !== 'object' || Array.isArray(node)) return node;
    const copy = {};
    for (const [key, val] of Object.entries(node)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (Array.isArray(val)) {
        if (val.length && val[0] !== null && typeof val[0] === 'object') {
          copy[key] = pruneArray(val, path);           // object array: prune each element
        } else {
          const d = dispositionOf(path);               // scalar/empty array: classify by path
          if (d !== 'transformed' && d !== 'exclude') copy[key] = val;
        }
      } else if (val !== null && typeof val === 'object') {
        const child = prune(val, path);                 // object container: recurse, keep if non-empty
        if (Object.keys(child).length) copy[key] = child;
      } else {
        const d = dispositionOf(path);
        if (d !== 'transformed' && d !== 'exclude') copy[key] = val;
      }
    }
    return copy;
  }
  return prune(prunedFv, '');
}
```

Also remove the P1 NOTE comment about the array-wholesale asymmetry (it is now resolved) and, if `leafPaths` was dropped in P1 cleanup, it is not needed here — do not re-add unused imports.

- [ ] **Step 4: Run tests to verify pass**

Run: `cd connect-four && node --test server/tests/renderReasonModel.test.mjs`
Expected: PASS (all prior tests + the new one).

- [ ] **Step 5: Commit**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add connect-four/server/scripts/renderReasonModel.mjs connect-four/server/tests/renderReasonModel.test.mjs
git commit -m "fix(reason-render): renderedFields prunes subfields inside object arrays (P2)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Integrate grounded boards + threat lists into the render model & prompt

**Files:**
- Modify: `connect-four/server/scripts/renderReasonModel.mjs` (`buildReasonRenderModel`, `assembleGroundedPrompt`)
- Test: extend `connect-four/server/tests/renderReasonModel.test.mjs`; existing `renderCoverageCorpus.test.mjs` must stay green.

**Interfaces:**
- Consumes: `selectBoards`, `renderThreatList` from `./reasonBoardSelect.mjs`.
- Produces: `buildReasonRenderModel(nv).boards` is now the `selectBoards(nv)` array (each `{id,ascii,tags,reason}`); `assembleGroundedPrompt(model)` emits, per selected board, its `ascii` + a `Tactics:` threat list (`renderThreatList(board.tags)`), followed by the `# Vector facts` block (unchanged) — and, when called via condition D, still ends with the `TASK` output-contract (that append lives in `compute.mjs`, unchanged). The single decision board of P1 is replaced by the selected set.

- [ ] **Step 1: Write the failing test (append to renderReasonModel.test.mjs)**

```js
test('assembled prompt renders selected boards each with a Tactics list', () => {
  const m = buildReasonRenderModel(NV);
  assert.ok(Array.isArray(m.boards) && m.boards.length >= 1);
  assert.ok(m.boards.every((b) => b.ascii && Array.isArray(b.tags) && b.reason));
  const prompt = assembleGroundedPrompt(m);
  assert.match(prompt, /Y = you \(player 2\)/);   // You/Opp board present
  assert.match(prompt, /Tactics:/);               // threat list section present
  assert.doesNotMatch(prompt, /"scores"/);
  assert.doesNotMatch(prompt, /"movestring"/);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd connect-four && node --test server/tests/renderReasonModel.test.mjs`
Expected: FAIL — `m.boards` is P1's `{ decision: {...} }` object, not the selected array; no `Tactics:` in the prompt.

- [ ] **Step 3: Update `buildReasonRenderModel` and `assembleGroundedPrompt`**

In `buildReasonRenderModel`, replace the P1 `boards: { decision: {...} }` with `boards: selectBoards(pruned)` (import `selectBoards`, `renderThreatList` from `./reasonBoardSelect.mjs`). Keep the `assertCoverage(pruned, link.covers)` call and `rendered: renderedFields(pruned)` exactly as-is. Then rewrite `assembleGroundedPrompt`:

```js
export function assembleGroundedPrompt(model) {
  const boards = model.boards.map((b) =>
    `## Board: ${b.id} (${b.reason})\n${b.ascii}\nTactics:\n${renderThreatList(b.tags)}`).join('\n\n');
  return [
    `# Boards (you = player ${model.perspective.you})`,
    '',
    boards,
    '',
    `# Reason (causal link ${model.link.id}, confidence ${model.link.confidence})`,
    model.link.guardrail,
    '',
    '# Vector facts',
    '```json',
    JSON.stringify(model.rendered, null, 2),
    '```',
  ].join('\n');
}
```

- [ ] **Step 4: Run the module test + the corpus gate + condition D**

Run: `cd connect-four && node --test server/tests/renderReasonModel.test.mjs server/tests/renderCoverageCorpus.test.mjs server/tests/computeConditionD.test.mjs`
Expected: PASS. (The corpus gate confirms all 29 records still render with zero uncovered fields; `computeConditionD` confirms D still appends `TASK`.) If `computeConditionD.test.mjs` asserted the old single-board marker text, update its assertions to the new `# Boards` / `Tactics:` markers while keeping its schema-key assertions (`better_move`/`mechanism`/`key_cells`).

- [ ] **Step 5: Register new test files + run the fast suite**

Add `server/tests/reasonCellGrounding.test.mjs server/tests/reasonBoardTags.test.mjs server/tests/reasonBoardSelect.test.mjs` to the `test:fast` script in `connect-four/package.json`. Then:

Run: `cd connect-four && npm run test:fast`
Expected: PASS, no regressions (prior baseline 744/744 + the new P2 tests).

- [ ] **Step 6: Commit**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add connect-four/server/scripts/renderReasonModel.mjs connect-four/server/tests/renderReasonModel.test.mjs connect-four/server/tests/computeConditionD.test.mjs connect-four/package.json
git commit -m "feat(reason-render): grounded boards + threat lists in condition D prompt (P2)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage (P2 scope of §5 + §7.5–10):**
- Board tagger (curated major/immediate/double/figure-7, reuse detectors) → Task 2 ✓
- Cell grounding (status/horizon/reachableInPlies/role) → Task 1 ✓
- `selectBoards` Option A (§3e) → Task 3 ✓
- Threat-list rendering + You/Opp labels (§7.10 (i)) → Task 3 ✓
- Projected-deep board (register-deep) → Task 3 ✓
- Array-traversal fix (§7.9) → Task 4 ✓
- Integration + condition D stays gradeable + corpus gate green → Task 5 ✓

**Deferred (not gaps):** grader board-awareness/threat-list fidelity (§3f, P4); sampler `board_*` predicates (§3e, P4); rich causal-frame text + L2/L3 branch-invariance (P3). `role` text is populated per-cell here but the composers that *use* it are P3.

**Placeholder scan:** none — every step has runnable code/commands.

**Type consistency:** `tagBoard(movestring, perspectivePlayer, opts) → [{cell,kind,owner,window?}]` consumed identically by `selectBoards` and the tests. `groundCell(...) → {cell,status,horizon,reachableInPlies,role}` matches the §3c schema. `selectBoards(fv) → [{id,movestring,ascii,tags,reason}]` consumed by `buildReasonRenderModel`/`assembleGroundedPrompt`. `renderThreatList(tags)` and `renderBoardAscii(movestring, player)` signatures match their call sites in Task 5.

**Note for the executor:** Task 2 is an integration task (reuses `classifier.js` detectors) — dispatch it on a standard model, not the cheapest; if `getMajorThreatCells`'s return shape differs from Global Constraints, it must report NEEDS_CONTEXT rather than guess. Tasks 1, 3, 4, 5 carry complete code (cheapest-tier transcription-plus-testing is fine, but Task 5 touches the corpus gate so verify it stays green).
