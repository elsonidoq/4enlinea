# Grounded-Render Prompt Phase 4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the render loop — emit a per-record `render_decision` from the eval pipeline, grade condition D against it (G1–G6), and make `select_boards.mjs` cover the feature-vector × prompt-decision joint universe with a runnable coverage test.

**Architecture:** Render-layer + tooling only; the reason engine is frozen (I0). `buildRenderDecision(nv)` derives the full decision set purely from existing render helpers; `compute.mjs` persists it on condition-D answers lines; the `grade-fv-sufficiency` skill consumes it inline as ground truth; a shared `renderUniverse.mjs` predicate function powers both the enhanced coverage sampler and a new coverage test over a freshly regenerated committed board set.

**Tech Stack:** Node ESM (`.mjs`), `node:test` + `node:assert/strict`, the c4solver wrapper, `playGame`/`harvestBlunders` self-play, a markdown SKILL driving `general-purpose` sub-agents.

## Global Constraints

- No change to what `computeReason` stores or any P1–P3 engine/render behavior (I0). If a P4 finding reveals a P3 defect, SURFACE it as a written finding — do not silently patch.
- Coordinates 0-indexed internally (row 0 = bottom, col 0 = left); `cNrM` strings 1-indexed; `bestCol`/`playedCol` 0-indexed (display col = col+1).
- Narrator vector carries NO solver scores (D21). The grader reads ground truth from RAW evidence (`row.evidence` / sibling `groundTruth`), NEVER the narrator `feature_vector`.
- The grader verifies every cell/line against the engine's OWN `finalMovestring`, NEVER an alternate solver PV (G4).
- Covers audit is a STATIC causal-code check (D28): a covered-but-ABSENT field is normal, NOT `missing_info`; a needed-but-covered field is over-removal.
- `renderCoverageCorpus.test.mjs` (frozen 29, 0-uncovered) stays green; the closed field-disposition registry must not be weakened.
- Never hand-build movestrings; harvest via `playGame`/`harvestBlunders` with a property filter (`feedback_no_random_boards`).
- Tests run via `npm run test:fast` inside `connect-four/` (baseline 785 passing). Do NOT run full `npm test` (candidate-generator solver-IPC hang). Any NEW test file MUST be added by hand to BOTH the `test:fast` and `test` script lists in `connect-four/package.json` (the lists are hardcoded, not globs).
- Commit after each task on `stagging` with explicit `git add <files>` — NEVER `git add -A` (a separate feature lives in `.claude/worktrees/win-dist-grid`; leave pre-existing unrelated modified/untracked files unstaged). Commit trailer every commit: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Do NOT push or open a PR. `.superpowers/sdd/progress.md` is git-ignored scratch — do not `git add` it.
- Base commit: `048a275`. Phase-4 base includes the design commit `f61927d`.

## File Structure

- `connect-four/server/scripts/reasonBoardSelect.mjs` — MODIFY: add `boardSelectionDecisions(fv)` (all 4 board slots with `shown`+`reason`); refactor `selectBoards` to derive shown boards from it (output unchanged).
- `connect-four/server/scripts/renderReasonModel.mjs` — MODIFY: add `buildRenderDecision(nv)` + private helpers (`fieldPartition`, `decisiveFinalMovestring`, `groundResource`).
- `connect-four/server/scripts/compute.mjs` — MODIFY: add `renderDecisionForCondition(nv, condition)` helper; attach `render_decision` to condition-D answers lines.
- `connect-four/server/scripts/renderUniverse.mjs` — CREATE: `RENDER_REQUIRED`/`RENDER_PROVISIONAL` predicate names + `renderDecisionPredicates(renderDecision)` (shared by sampler + coverage test).
- `connect-four/server/scripts/select_boards.mjs` — MODIFY: coverage strategy runs the render pipeline per board, unions the render predicates into the universe/guard/satisfied(), and adds a directed rare-fill post-pass.
- `connect-four/server/scripts/boards_coverage_<ts>.jsonl` — CREATE (generated + committed): the fresh joint-universe coverage set.
- `connect-four/server/tests/renderReasonModel.test.mjs` — MODIFY: `buildRenderDecision` unit tests.
- `connect-four/server/tests/reasonBoardSelect.test.mjs` — MODIFY: `boardSelectionDecisions` unit tests.
- `connect-four/server/tests/renderUniverse.test.mjs` — CREATE: `renderDecisionPredicates` unit tests.
- `connect-four/server/tests/renderDecisionEmit.test.mjs` — CREATE: `renderDecisionForCondition` unit tests.
- `connect-four/server/tests/renderCoverageUniverse.test.mjs` — CREATE: the coverage acceptance test over the committed set.
- `connect-four/package.json` — MODIFY: add the 3 new test files to `test:fast` and `test`.
- `.claude/skills/grade-fv-sufficiency/SKILL.md` — MODIFY: G4 fix + condition-D rubric G1–G6 + `render_decision` consumption + decision-doc reads.
- `docs/architecture/reason-DECISIONS.md` — MODIFY: append D29 (P4 decisions).
- `docs/architecture/reason-render-grounded-prompt.md` — MODIFY: status → P4 IMPLEMENTED.
- `docs/architecture/reason-P4-ablation-runbook.md` — CREATE: the A-vs-D hand-off runbook.
- Memory: MODIFY `project_reason_render_layer.md` + its MEMORY.md pointer.

---

### Task 1: `boardSelectionDecisions` (all board slots, shown+reason)

**Files:**
- Modify: `connect-four/server/scripts/reasonBoardSelect.mjs`
- Test: `connect-four/server/tests/reasonBoardSelect.test.mjs`

**Interfaces:**
- Consumes: `tagBoard`, `renderBoardAscii`, `namedPatternOpts` (existing, this file), `DEEP`/`tagKey` (existing, this file).
- Produces: `boardSelectionDecisions(fv) -> [{ id, shown, movestring, tags, ascii, reason }]` — one entry per slot `decision`|`afterBest`|`afterPlayed`|`projectedDeep`, `shown:boolean`. `selectBoards(fv)` now returns `boardSelectionDecisions(fv).filter(b => b.shown)` (output identical to before).

- [ ] **Step 1: Write the failing test** — append to `reasonBoardSelect.test.mjs`:

```js
import { boardSelectionDecisions } from '../scripts/reasonBoardSelect.mjs';

test('boardSelectionDecisions reports all four slots with shown flags', () => {
  // NV where afterBest changes nothing, afterPlayed changes the picture, resource is deep.
  const fv = {
    movestring: '341330613', playedCol: 4, bestCol: 3, player: 2, opponent: 1,
    case: 'win_to_lose', route: 'sign',
    lostResource: { kind: 'winning_line', register: 'forced_sequence', completingCell: 'c6r5',
                    finalMovestring: '34133061334' },
    opponentPunishment: { kind: 'winning_line', register: 'forced_sequence', completingCell: 'c3r3' },
  };
  const d = boardSelectionDecisions(fv);
  assert.deepEqual(d.map((b) => b.id), ['decision', 'afterBest', 'afterPlayed', 'projectedDeep']);
  assert.equal(d.find((b) => b.id === 'decision').shown, true);
  assert.equal(d.find((b) => b.id === 'projectedDeep').shown, true); // deep resource → shown
  for (const b of d) assert.ok(typeof b.reason === 'string' && b.reason.length > 0);
});

test('selectBoards equals the shown subset of boardSelectionDecisions', () => {
  const fv = {
    movestring: '341330613', playedCol: 4, bestCol: 3, player: 2, opponent: 1,
    case: 'win_to_lose', route: 'sign',
    lostResource: { kind: 'winning_line', register: 'immediate', completingCell: 'c6r5' },
    opponentPunishment: { kind: 'denial', completingCell: 'c3r3' },
  };
  const shownIds = boardSelectionDecisions(fv).filter((b) => b.shown).map((b) => b.id);
  const selIds = selectBoards(fv).map((b) => b.id);
  assert.deepEqual(selIds, shownIds);
});
```

Ensure `selectBoards` is imported at the top of the test file (it already is if prior tests use it; otherwise add it).

- [ ] **Step 2: Run test to verify it fails**

Run: `cd connect-four && node --test server/tests/reasonBoardSelect.test.mjs`
Expected: FAIL — `boardSelectionDecisions is not a function` (or import error).

- [ ] **Step 3: Refactor `reasonBoardSelect.mjs`** — replace the existing `selectBoards` function (lines ~51–83) with:

```js
export function boardSelectionDecisions(fv) {
  const you = fv.player;
  const applyCol = (ms, col) => (col == null ? ms : ms + String(col));
  const patternOpts = namedPatternOpts(fv);
  const decisionStructuralTags = tagBoard(fv.movestring ?? '', you);   // selection baseline (structural)
  const decisionKey = tagKey(decisionStructuralTags);
  const decisionTags = patternOpts                                     // displayed tags (+ named pattern)
    ? tagBoard(fv.movestring ?? '', you, patternOpts)
    : decisionStructuralTags;
  const out = [{ id: 'decision', shown: true, movestring: fv.movestring ?? '', tags: decisionTags,
                 ascii: renderBoardAscii(fv.movestring ?? '', you),
                 reason: 'the position under judgment' }];

  for (const [id, col, why] of [['afterBest', fv.bestCol, 'the better move'],
                                ['afterPlayed', fv.playedCol, 'the move you played']]) {
    const ms = applyCol(fv.movestring ?? '', col);
    const tags = tagBoard(ms, you);
    const shown = tagKey(tags) !== decisionKey;
    out.push({ id, shown, movestring: ms, tags, ascii: renderBoardAscii(ms, you),
               reason: shown ? `${why} — changes the tactical picture`
                             : `${why} — tag-set identical to the decision board, omitted` });
  }

  const deepHalf = [fv.lostResource, fv.opponentPunishment].find(
    (h) => h && DEEP.has(h.register) && h.finalMovestring);
  out.push(deepHalf
    ? { id: 'projectedDeep', shown: true, movestring: deepHalf.finalMovestring,
        tags: tagBoard(deepHalf.finalMovestring, you), ascii: renderBoardAscii(deepHalf.finalMovestring, you),
        reason: `where the deep ${deepHalf.register} resource resolves` }
    : { id: 'projectedDeep', shown: false, movestring: null, tags: [], ascii: null,
        reason: 'the resource is not deep (register is immediate) — no projected board' });
  return out;
}

export function selectBoards(fv) {
  return boardSelectionDecisions(fv).filter((b) => b.shown);
}
```

- [ ] **Step 4: Run the new + existing tests**

Run: `cd connect-four && node --test server/tests/reasonBoardSelect.test.mjs`
Expected: PASS (new tests + all previously-green tests in the file).

- [ ] **Step 5: Commit**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add connect-four/server/scripts/reasonBoardSelect.mjs connect-four/server/tests/reasonBoardSelect.test.mjs
git commit -m "feat(reason-render): boardSelectionDecisions reports all board slots (P4 A1)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: `buildRenderDecision(nv)`

**Files:**
- Modify: `connect-four/server/scripts/renderReasonModel.mjs`
- Test: `connect-four/server/tests/renderReasonModel.test.mjs`

**Interfaces:**
- Consumes: `pruneVector`, `classifyCausalLink`, `patternOnAfterBestBoard`, `boardSelectionDecisions` (Task 1), `assertCoverage`, `dispositionOf`, `leafPaths` (fieldDisposition), `groundCell`/`horizonForRegister` (reasonCellGrounding), `parseBoardState` (classifier).
- Produces: `buildRenderDecision(nv) -> { case, route, direction, patternOnAfterBestBoard, link:{id,confidence,covers,guardrail,text}, boards:[{id,shown,reason}], resource:{completingCell,registerToHorizon}|null, fieldPartition:{rendered[],covered[],excluded[]}, finalMovestring|null }`.

- [ ] **Step 1: Write the failing test** — append to `renderReasonModel.test.mjs`:

```js
import { buildRenderDecision } from '../scripts/renderReasonModel.mjs';

test('buildRenderDecision assembles the full decision set from render helpers', () => {
  const rd = buildRenderDecision(NV); // NV from the top of this file (win_to_lose, sign, L6)
  assert.equal(rd.link.id, 'L6');
  assert.equal(rd.route, 'sign');
  assert.equal(rd.case, 'win_to_lose');
  assert.equal(rd.direction, null);              // sign route → no direction
  assert.equal(rd.patternOnAfterBestBoard, null); // only computed for enabled_opponent
  assert.ok(rd.boards.some((b) => b.id === 'decision' && b.shown === true));
  assert.ok(rd.boards.every((b) => typeof b.shown === 'boolean' && b.reason));
  // field partition classifies present leaves into exactly the three buckets
  const all = [...rd.fieldPartition.rendered, ...rd.fieldPartition.covered, ...rd.fieldPartition.excluded];
  assert.ok(all.includes('case'));                        // render
  assert.ok(rd.fieldPartition.covered.includes('route')); // L6 covers route (present code → hidden)
});

test('buildRenderDecision records branch-invariance + finalMovestring for enabled_opponent', () => {
  const fv = {
    movestring: '341330613', playedCol: 4, bestCol: 3, player: 2, opponent: 1,
    case: 'lose_to_faster_lose', route: 'realized_denied', direction: 'enabled_opponent',
    tag: 'double_threat',
    lostResource: { kind: 'denial', verdict: 'occupation' },
    opponentPunishment: { kind: 'realized_pattern', register: 'immediate', completingCell: 'c3r3',
                          window: ['c3r3', 'c4r3', 'c5r3', 'c6r3'], finalMovestring: '3413306133' },
  };
  const rd = buildRenderDecision(fv);
  assert.equal(rd.direction, 'enabled_opponent');
  assert.equal(typeof rd.patternOnAfterBestBoard, 'boolean'); // computed, not null
  assert.equal(rd.link.id, 'L3');                             // lose_to_faster_lose → branch-invariant
  assert.equal(rd.finalMovestring, '3413306133');            // opponent's line (no lostResource winning_line)
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd connect-four && node --test server/tests/renderReasonModel.test.mjs`
Expected: FAIL — `buildRenderDecision is not a function`.

- [ ] **Step 3: Implement in `renderReasonModel.mjs`** — add imports at top (merge with existing import lines):

```js
import { selectBoards, renderThreatList, patternOnAfterBestBoard, boardSelectionDecisions } from './reasonBoardSelect.mjs';
import { dispositionOf, assertCoverage, leafPaths } from './fieldDisposition.mjs';
import { groundCell, horizonForRegister } from './reasonCellGrounding.mjs';
import { parseBoardState } from '../classifier.js';
```

Then append these functions (after `buildReasonRenderModel`):

```js
// The engine's own decisive line for cell grounding (G4): the winning half's finalMovestring when
// the lostResource is a winning line; otherwise the opponent's realized line. Never an alternate PV.
function decisiveFinalMovestring(fv) {
  const lr = fv.lostResource, op = fv.opponentPunishment;
  if (lr?.kind === 'winning_line' && lr.finalMovestring) return lr.finalMovestring;
  if (op?.finalMovestring) return op.finalMovestring;
  return lr?.finalMovestring ?? null;
}

// Partition every PRESENT leaf path into rendered | covered | excluded (spec §3f). Mirrors
// renderedFields' keep() logic: exclude → excluded; covered causal-code → covered; everything else
// (render, transformed-to-board, uncovered causal-code) → rendered.
function fieldPartition(pruned, covers) {
  const covered = new Set(covers);
  const out = { rendered: [], covered: [], excluded: [] };
  for (const path of leafPaths(pruned)) {
    const d = dispositionOf(path);
    if (d === 'exclude') out.excluded.push(path);
    else if (d === 'causal-code' && covered.has(path)) out.covered.push(path);
    else out.rendered.push(path);
  }
  return out;
}

// Ground the load-bearing resource cell (status/horizon/reachableInPlies) against the decisive line.
function groundResource(pruned) {
  const half = pruned.lostResource?.kind === 'winning_line' ? pruned.lostResource
    : (pruned.opponentPunishment?.completingCell ? pruned.opponentPunishment : pruned.lostResource);
  const cell = half?.completingCell;
  if (!cell) return null;
  const { board, colHeights } = parseBoardState(pruned.movestring ?? '');
  const grounded = groundCell(cell, {
    board, colHeights, finalMovestring: decisiveFinalMovestring(pruned),
    register: half.register, role: 'where the load-bearing resource completes',
    perspectivePlayer: pruned.player,
  });
  return { completingCell: grounded,
           registerToHorizon: { register: half.register ?? null, horizon: horizonForRegister(half.register) } };
}

// The complete render-layer decision set the grader consumes as ground truth (spec §3f). Derived
// PURELY from the render helpers — no engine call. Reuses the same classify+assert path as
// buildReasonRenderModel so routing is identical.
export function buildRenderDecision(nv) {
  const pruned = pruneVector(nv);
  const ctx = pruned.direction === 'enabled_opponent'
    ? { patternOnAfterBestBoard: patternOnAfterBestBoard(pruned) } : {};
  const link = classifyCausalLink(pruned, ctx);
  assertCoverage(pruned, link.covers);
  return {
    case: pruned.case ?? null,
    route: pruned.route === 'realized_denied' ? 'realized_denied' : 'sign',
    direction: pruned.direction ?? null,
    patternOnAfterBestBoard: pruned.direction === 'enabled_opponent' ? ctx.patternOnAfterBestBoard : null,
    link: { id: link.id, confidence: link.confidence, covers: link.covers,
            guardrail: link.guardrail, text: link.text },
    boards: boardSelectionDecisions(pruned).map(({ id, shown, reason }) => ({ id, shown, reason })),
    resource: groundResource(pruned),
    fieldPartition: fieldPartition(pruned, link.covers),
    finalMovestring: decisiveFinalMovestring(pruned),
  };
}
```

- [ ] **Step 4: Run tests**

Run: `cd connect-four && node --test server/tests/renderReasonModel.test.mjs`
Expected: PASS (new + existing).

- [ ] **Step 5: Commit**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add connect-four/server/scripts/renderReasonModel.mjs connect-four/server/tests/renderReasonModel.test.mjs
git commit -m "feat(reason-render): buildRenderDecision emits the grader ground-truth record (P4 A2)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Emit `render_decision` on condition-D answers lines

**Files:**
- Modify: `connect-four/server/scripts/compute.mjs`
- Test: `connect-four/server/tests/renderDecisionEmit.test.mjs` (create)

**Interfaces:**
- Consumes: `buildRenderDecision` (Task 2).
- Produces: `renderDecisionForCondition(nv, condition) -> object|null` (the `render_decision` value; `null` for non-D or on build failure). Exported from `compute.mjs`. The condition-D answers line gains a top-level `render_decision` key.

- [ ] **Step 1: Write the failing test** — create `renderDecisionEmit.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderDecisionForCondition } from '../scripts/compute.mjs';

const NV = {
  movestring: '341330613', playedCol: 4, bestCol: 3, player: 2, opponent: 1,
  case: 'win_to_lose', route: 'sign',
  lostResource: { kind: 'winning_line', register: 'forced_sequence', completingCell: 'c6r5' },
  opponentPunishment: { kind: 'winning_line', register: 'forced_sequence', completingCell: 'c3r3',
                        tie: { kind: 'tied', sharedCells: ['c4r5'] } },
  replyHistogram: { afterBest: 0, afterPlayed: 1 },
};

test('render_decision is emitted for condition D only', () => {
  const rd = renderDecisionForCondition(NV, 'D');
  assert.equal(rd.link.id, 'L6');
  assert.ok(Array.isArray(rd.boards));
  assert.equal(renderDecisionForCondition(NV, 'A'), null);
  assert.equal(renderDecisionForCondition(NV, 'C'), null);
});

test('render_decision returns null instead of throwing on an unroutable vector', () => {
  // no route/direction and no sign-matchable half → classifyCausalLink throws; helper swallows to null
  const bad = { movestring: '', playedCol: 0, bestCol: 1, player: 1, opponent: 2, case: 'win_to_draw' };
  assert.equal(renderDecisionForCondition(bad, 'D'), null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd connect-four && node --test server/tests/renderDecisionEmit.test.mjs`
Expected: FAIL — `renderDecisionForCondition is not a function`.

- [ ] **Step 3: Implement in `compute.mjs`** — add the import (merge with the existing render import on line 33):

```js
import { buildReasonRenderModel, assembleGroundedPrompt, buildRenderDecision } from './renderReasonModel.mjs';
```

Add the exported helper just after `buildPromptForCondition` (near line 230):

```js
// The per-record render-decision ground-truth record for the grader (spec §3f). Only condition D
// carries it (A/B/C use the glossary+JSON path). Never throws: a build failure (novel vector) yields
// null, matching how the per-row call_error path already tolerates render failures.
export function renderDecisionForCondition(nv, condition) {
  if (condition !== 'D') return null;
  try { return buildRenderDecision(nv); } catch { return null; }
}
```

In `runLlm`, compute it once per record+condition and attach it to every line. Inside the `for (const condition of CONDITIONS)` loop, right after the `try { prompt = buildPromptForCondition(...) }` block succeeds (before the `for (let run_index...)` loop), add:

```js
      const render_decision = renderDecisionForCondition(nv, condition);
```

Then add `render_decision` to BOTH `line` objects (the prompt-build-failure line near line 306 and the per-run line near line 332). For the prompt-build-failure line it is `null` (that path is only reached when the build threw), so add `render_decision: null,`. For the per-run line add `render_decision,`.

- [ ] **Step 4: Run tests**

Run: `cd connect-four && node --test server/tests/renderDecisionEmit.test.mjs server/tests/computeConditionD.test.mjs`
Expected: PASS (new tests; condition-D prompt tests unaffected).

- [ ] **Step 5: Add the new test file to `package.json`** — in `connect-four/package.json`, append `server/tests/renderDecisionEmit.test.mjs` to the END of both the `test:fast` and the `test` script's file list.

- [ ] **Step 6: Run the fast suite for regression**

Run: `cd connect-four && npm run test:fast 2>&1 | tail -5`
Expected: all pass (786+; no failures).

- [ ] **Step 7: Commit**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add connect-four/server/scripts/compute.mjs connect-four/server/tests/renderDecisionEmit.test.mjs connect-four/package.json
git commit -m "feat(reason-render): persist render_decision on condition-D answers lines (P4 A3)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Shared render-predicate module (`renderUniverse.mjs`)

**Files:**
- Create: `connect-four/server/scripts/renderUniverse.mjs`
- Test: `connect-four/server/tests/renderUniverse.test.mjs` (create)

**Interfaces:**
- Consumes: a `render_decision` object (Task 2 shape).
- Produces: `renderDecisionPredicates(rd) -> Set<string>`; `RENDER_REQUIRED` (string[]); `RENDER_PROVISIONAL` (Set<string>); `RENDER_UNIVERSE` (string[] = required ∪ provisional).

- [ ] **Step 1: Write the failing test** — create `renderUniverse.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderDecisionPredicates, RENDER_UNIVERSE, RENDER_PROVISIONAL } from '../scripts/renderUniverse.mjs';

const base = {
  case: 'win_to_lose', route: 'sign', direction: null, patternOnAfterBestBoard: null,
  link: { id: 'L6', confidence: 'high', covers: ['route'], guardrail: '', text: '' },
  boards: [
    { id: 'decision', shown: true, reason: '' },
    { id: 'afterBest', shown: false, reason: '' },
    { id: 'afterPlayed', shown: true, reason: '' },
    { id: 'projectedDeep', shown: true, reason: '' },
  ],
  resource: { completingCell: { cell: 'c6r5' }, registerToHorizon: { register: 'forced_sequence', horizon: 'deep-forced-line' } },
  fieldPartition: { rendered: ['case'], covered: ['route'], excluded: [] },
  finalMovestring: 'x',
};

test('renderDecisionPredicates emits link/board/horizon/covers predicates', () => {
  const p = renderDecisionPredicates(base);
  assert.ok(p.has('link_L6'));
  assert.ok(p.has('route_sign'));
  assert.ok(p.has('case_win_to_lose'));
  assert.ok(p.has('board_afterbest_omitted'));
  assert.ok(p.has('board_afterplayed_shown'));
  assert.ok(p.has('board_projecteddeep_shown'));
  assert.ok(p.has('horizon_deep-forced-line'));
  assert.ok(p.has('covers_exercised_L6'));   // covered.length > 0
});

test('enabled_opponent splits on the fired link id, and flags the flip-case', () => {
  const l3flip = { ...base, direction: 'enabled_opponent', patternOnAfterBestBoard: true, case: 'win_to_lose',
    link: { ...base.link, id: 'L3' } };
  const p = renderDecisionPredicates(l3flip);
  assert.ok(p.has('dir_enabled_opponent'));
  assert.ok(p.has('enabled_branch_invariant'));
  assert.ok(p.has('flip_case_l3'));          // win_to_lose + enabled + pattern-present
  const l2 = { ...base, direction: 'enabled_opponent', patternOnAfterBestBoard: false, link: { ...base.link, id: 'L2' } };
  assert.ok(renderDecisionPredicates(l2).has('enabled_causal'));
});

test('every predicate any decision emits is in RENDER_UNIVERSE', () => {
  for (const rd of [base]) for (const p of renderDecisionPredicates(rd)) assert.ok(RENDER_UNIVERSE.includes(p), `missing ${p}`);
  assert.ok(RENDER_PROVISIONAL.has('link_L9'));
  assert.ok(RENDER_PROVISIONAL.has('flip_case_l3'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd connect-four && node --test server/tests/renderUniverse.test.mjs`
Expected: FAIL — cannot find module `renderUniverse.mjs`.

- [ ] **Step 3: Create `renderUniverse.mjs`:**

```js
// renderUniverse.mjs — the render-layer half of the joint coverage universe (spec §3e).
// ONE predicate function shared by the sampler (select_boards.mjs) and the coverage test
// (renderCoverageUniverse.test.mjs), so "which predicates does this board hit" has a single source
// of truth. Consumes a render_decision (buildRenderDecision output); never touches the engine.

// Map a render_decision to the set of render-layer coverage predicates it exercises.
export function renderDecisionPredicates(rd) {
  const p = new Set();
  p.add(`link_${rd.link.id}`);
  p.add(`route_${rd.route}`);
  if (rd.case) p.add(`case_${rd.case}`);
  if (rd.direction) p.add(`dir_${rd.direction}`);
  // Branch-invariance split keys off the FIRED link (L2 causal vs L3 branch-invariant), not the raw
  // patternOnAfterBestBoard flag — L3 also fires via lose_to_faster_lose where the flag is false (D28).
  if (rd.direction === 'enabled_opponent') p.add(rd.link.id === 'L3' ? 'enabled_branch_invariant' : 'enabled_causal');
  // The I12 flip-case: enabled_opponent routed to L3 by a PRESENT after-best pattern (not by the
  // already-losing sign). Absent from the frozen 29; the targeted rare-fill probes for it.
  if (rd.direction === 'enabled_opponent' && rd.patternOnAfterBestBoard === true && rd.case !== 'lose_to_faster_lose') {
    p.add('flip_case_l3');
  }
  for (const b of rd.boards) {
    if (b.id === 'afterBest') p.add(b.shown ? 'board_afterbest_shown' : 'board_afterbest_omitted');
    if (b.id === 'afterPlayed') p.add(b.shown ? 'board_afterplayed_shown' : 'board_afterplayed_omitted');
    if (b.id === 'projectedDeep') p.add(b.shown ? 'board_projecteddeep_shown' : 'board_projecteddeep_absent');
  }
  if (rd.fieldPartition.covered.length > 0) p.add(`covers_exercised_${rd.link.id}`);
  const h = rd.resource?.registerToHorizon?.horizon;
  if (h) p.add(`horizon_${h}`);
  return p;
}

// Known-rare / structurally-hard render predicates: reported by the coverage test, non-blocking.
export const RENDER_PROVISIONAL = new Set([
  'link_L9', 'covers_exercised_L9',                 // diffuse-parity bucket, rare in self-play
  'flip_case_l3',                                    // I12 gap (D28); may be structurally unreachable
  'board_afterbest_shown',                           // after-best rarely changes the tag-set
]);

// Every render-layer predicate the function can emit, named upfront (closed; the sampler's
// discovered ⊆ universe guard unions this with the engine REASON_UNIVERSE).
export const RENDER_UNIVERSE = [
  'link_L1', 'link_L2', 'link_L3', 'link_L4', 'link_L5', 'link_L6', 'link_L7', 'link_L8', 'link_L9',
  'route_sign', 'route_realized_denied',
  'case_win_to_draw', 'case_win_to_lose', 'case_draw_to_lose', 'case_lose_to_faster_lose',
  'dir_missed_own', 'dir_enabled_opponent', 'dir_defensive_miss',
  'enabled_causal', 'enabled_branch_invariant', 'flip_case_l3',
  'board_afterbest_shown', 'board_afterbest_omitted',
  'board_afterplayed_shown', 'board_afterplayed_omitted',
  'board_projecteddeep_shown', 'board_projecteddeep_absent',
  'covers_exercised_L1', 'covers_exercised_L2', 'covers_exercised_L3', 'covers_exercised_L4',
  'covers_exercised_L5', 'covers_exercised_L6', 'covers_exercised_L7', 'covers_exercised_L8', 'covers_exercised_L9',
  'horizon_immediate', 'horizon_deep-forced-line', 'horizon_deep-parity',
];

export const RENDER_REQUIRED = RENDER_UNIVERSE.filter((p) => !RENDER_PROVISIONAL.has(p));
```

- [ ] **Step 4: Run tests**

Run: `cd connect-four && node --test server/tests/renderUniverse.test.mjs`
Expected: PASS.

- [ ] **Step 5: Add to `package.json`** — append `server/tests/renderUniverse.test.mjs` to both `test:fast` and `test` lists.

- [ ] **Step 6: Commit**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add connect-four/server/scripts/renderUniverse.mjs connect-four/server/tests/renderUniverse.test.mjs connect-four/package.json
git commit -m "feat(reason-render): shared render-predicate universe (P4 C1)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Sampler covers the joint universe + directed rare-fill

**Files:**
- Modify: `connect-four/server/scripts/select_boards.mjs` (coverage strategy only)

**Interfaces:**
- Consumes: `toNarratorVector` (reasonNarratorVector), `buildRenderDecision` (Task 2), `renderDecisionPredicates`/`RENDER_UNIVERSE`/`RENDER_PROVISIONAL` (Task 4).
- Produces: the coverage strategy now (a) unions render predicates into the per-board predicate set, (b) asserts `discovered ⊆ (REASON_UNIVERSE ∪ RENDER_UNIVERSE)`, (c) gates `satisfied()` on `REQUIRED ∪ RENDER_REQUIRED`, and (d) runs a directed rare-fill post-pass. No new exported API (CLI script).

> This task edits a CLI script whose coverage branch runs at import time; there is no unit test. Verify with a SMALL smoke run (below). Keep every change inside the `else if (strategy === 'coverage')` block.

- [ ] **Step 1: Add imports** at the top of `select_boards.mjs` (merge with existing imports):

```js
import { toNarratorVector } from './reasonNarratorVector.mjs';
import { buildRenderDecision } from './renderReasonModel.mjs';
import { renderDecisionPredicates, RENDER_UNIVERSE, RENDER_PROVISIONAL, RENDER_REQUIRED } from './renderUniverse.mjs';
```

- [ ] **Step 2: Fold render predicates into the coverage universe.** Inside the coverage branch:

  1. After `REQUIRED` is defined (~line 312), add the unioned universe + guard set:

```js
  const FULL_UNIVERSE = new Set([...REASON_UNIVERSE, ...RENDER_UNIVERSE]);
  const ALL_PROVISIONAL = new Set([...PROVISIONAL, ...RENDER_PROVISIONAL]);
  const ALL_REQUIRED = [...REQUIRED, ...RENDER_REQUIRED];
```

  2. In `reasonPredicates(r)`, after it computes the engine predicates but BEFORE `return preds;`, merge the render predicates (compute the render_decision from the same evidence object `r`):

```js
    // Render-layer predicates (spec §3e): derive the render_decision from this evidence and union in
    // its link/board/branch-invariance/horizon/covers predicates. Failure (unroutable) → engine preds only.
    try {
      const rd = buildRenderDecision(toNarratorVector(r));
      for (const rp of renderDecisionPredicates(rd)) preds.add(rp);
    } catch { /* render pipeline can't route this board — keep engine predicates */ }
```

  3. Replace the three references that gate/guard on the old sets:
     - `satisfied` (~line 362): `const satisfied = () => ALL_REQUIRED.every((p) => (counts.get(p) || 0) >= TARGET_PER_PREDICATE);`
     - the discovered⊆named guard (~line 415): `if (!FULL_UNIVERSE.has(p)) throw new Error(...)`.
     - `predicateReport()` (~lines 372–378): replace `REASON_UNIVERSE`→`[...FULL_UNIVERSE]`, `REQUIRED`→`ALL_REQUIRED`, `PROVISIONAL`→`ALL_PROVISIONAL` in that function's body so logging reflects the full universe.

- [ ] **Step 3: Add the directed rare-fill post-pass.** After the main `for await (const ply of harvestBlunders(...))` loop finishes but BEFORE `} finally { solver.destroy(); }`, insert a targeted sweep that probes EVERY suboptimal legal column per self-play position (the D23 idiom) for the still-unfilled predicates:

```js
    // ── Directed rare-fill: for still-unfilled predicates (mostly PROVISIONAL render/flip-case ones),
    // probe every suboptimal legal column per position, not just the played move — a broader existential
    // than the diversity sweep. Never fabricates a board; each candidate is a real self-play position
    // plus a real legal (suboptimal) column. Bounded by the same MAX_GAMES budget.
    if (!satisfied()) {
      const rng2 = (() => { let a = 0x5EED; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
      let fillGames = 0;
      for (let g = 0; g < MAX_GAMES && !satisfied(); g++) {
        for await (const pos of playGame(solver, rng2)) {
          fillGames = g;
          logProgress();
          const { ms, scores } = pos;
          const legal = legalCols(scores);
          if (legal.length < 2) continue;
          let bestCol = legal[0], bestScore = scores[legal[0]];
          for (const c of legal) if (scores[c] > bestScore) { bestScore = scores[c]; bestCol = c; }
          for (const col of legal) {
            if (col === bestCol || scores[col] >= bestScore) continue;   // suboptimal only
            const key = `${ms}|${col}`;
            if (seen.has(key)) continue;
            let r;
            try { r = await computeReason(ms, col, { solver }); } catch { continue; }
            if (r.notABlunder || !r.case || r.case === 'win_to_slower_win') continue;
            const preds = reasonPredicates(r);
            const advancing = [...preds].filter((p) => (counts.get(p) || 0) < TARGET_PER_PREDICATE);
            if (advancing.length === 0) continue;                        // adds no coverage
            seen.add(key);
            for (const p of preds) {
              if (!FULL_UNIVERSE.has(p)) throw new Error(`unnamed predicate "${p}" — add it to REASON_UNIVERSE/RENDER_UNIVERSE (I12 selector guard)`);
              counts.set(p, (counts.get(p) || 0) + 1);
            }
            collected.push({ id: `eval-${collected.length + 1}`, movestring: ms, playedCol: col,
              strategy: 'coverage', selection: { predicates: [...preds].sort(), source: 'rare-fill' } });
            writeFileSync(outPath, collected.map((x) => JSON.stringify(x)).join('\n') + '\n');
            boards++;
          }
          if (satisfied()) break;
        }
      }
      process.stderr.write(`rare-fill: ${fillGames} extra games\n`);
    }
```

- [ ] **Step 4: Smoke-run (small budget) to verify no guard throws and predicates accrue**

Run: `cd connect-four && node server/scripts/select_boards.mjs --strategy coverage --target 1 --max-games 40 --out /tmp/cov_smoke.jsonl 2>&1 | tail -20`
Expected: it runs to completion (or hits the small MAX_GAMES) WITHOUT throwing an "unnamed predicate" error; the progress log shows `link_*`, `board_*`, `horizon_*` predicates accruing. (Coverage need not be complete at this tiny budget.)

- [ ] **Step 5: Commit**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add connect-four/server/scripts/select_boards.mjs
git commit -m "feat(reason-render): coverage sampler spans the render-decision joint universe + rare-fill (P4 C2)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Regenerate + commit the fresh coverage board set

**Files:**
- Create (generated, committed): `connect-four/server/scripts/boards_coverage_<ts>.jsonl`

> No code change — this task RUNS the Task-5 sampler at full budget and commits its output as the coverage-test input. The frozen 29 is untouched.

- [ ] **Step 1: Run the full harvest**

Run: `cd connect-four && node server/scripts/select_boards.mjs --strategy coverage --target 2 2>&1 | tee /tmp/cov_full.log | tail -30`
Expected: `Done: … boards → …/boards_coverage_<ts>.jsonl`. Note the produced filename and the final "Fulfilled / Under target / Never seen" lines.

- [ ] **Step 2: Record the coverage outcome.** From the tail of the log, capture which REQUIRED predicates (engine + render) reached target and which PROVISIONAL ones never filled. If any `RENDER_REQUIRED` predicate is unfilled, investigate before committing (a REQUIRED render predicate that self-play + rare-fill cannot reach may need reclassifying to PROVISIONAL with a documented reason — note it for Task 10/11, do NOT hand-build a board).

- [ ] **Step 3: Commit the board set** (substitute the real filename):

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add connect-four/server/scripts/boards_coverage_<ts>.jsonl
git commit -m "chore(reason-render): fresh joint-universe coverage board set (P4 C3)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Coverage acceptance test

**Files:**
- Create: `connect-four/server/tests/renderCoverageUniverse.test.mjs`
- Modify: `connect-four/package.json`

**Interfaces:**
- Consumes: the committed `boards_coverage_<ts>.jsonl` (Task 6), `computeReason`, `toNarratorVector`, `buildRenderDecision`, `renderDecisionPredicates`, `RENDER_REQUIRED`, `RENDER_PROVISIONAL`.

> This test calls the real solver via `computeReason` on each board. To stay inside `test:fast` timing, the committed set is small (tens of boards). If it proves too slow, the test reads a precomputed predicate cache instead — but first attempt the live path.

- [ ] **Step 1: Write the test** — create `renderCoverageUniverse.test.mjs`. Set `COVERAGE_FILE` to the Task-6 filename:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createSolverProcess } from '../c4solver-wrapper.js';
import { computeReason } from '../scripts/reason_engine/reasonEngine.mjs';
import { toNarratorVector } from '../scripts/reasonNarratorVector.mjs';
import { buildRenderDecision } from '../scripts/renderReasonModel.mjs';
import { renderDecisionPredicates, RENDER_REQUIRED, RENDER_PROVISIONAL } from '../scripts/renderUniverse.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const COVERAGE_FILE = join(__dirname, '../scripts/boards_coverage_<ts>.jsonl'); // <-- Task 6 filename

test('the committed coverage set exercises every REQUIRED render predicate', async () => {
  const boards = readFileSync(COVERAGE_FILE, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const hit = new Set();
  const solver = createSolverProcess();
  try {
    for (const b of boards) {
      let r;
      try { r = await computeReason(b.movestring, b.playedCol, { solver }); } catch { continue; }
      if (r.notABlunder || !r.case) continue;
      let rd;
      try { rd = buildRenderDecision(toNarratorVector(r)); } catch { continue; }
      for (const p of renderDecisionPredicates(rd)) hit.add(p);
    }
  } finally { solver.destroy(); }

  const missingRequired = RENDER_REQUIRED.filter((p) => !hit.has(p));
  const missingProvisional = [...RENDER_PROVISIONAL].filter((p) => !hit.has(p));
  if (missingProvisional.length) {
    // eslint-disable-next-line no-console
    console.log(`PROVISIONAL render predicates not covered (non-blocking): ${missingProvisional.join(', ')}`);
  }
  assert.deepEqual(missingRequired, [], `uncovered REQUIRED render predicates: ${missingRequired.join(', ')}`);
});
```

- [ ] **Step 2: Run it**

Run: `cd connect-four && node --test server/tests/renderCoverageUniverse.test.mjs 2>&1 | tail -15`
Expected: PASS, with a console line listing any non-blocking PROVISIONAL gaps. If a REQUIRED predicate is missing, the assertion fails listing it — reconcile with Task 6 (regenerate) or reclassify (document in Task 11), do NOT weaken the assertion to make it pass.

- [ ] **Step 3: Add to `package.json`** — append `server/tests/renderCoverageUniverse.test.mjs` to both `test:fast` and `test` lists.

- [ ] **Step 4: Run the full fast suite**

Run: `cd connect-four && npm run test:fast 2>&1 | tail -6`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add connect-four/server/tests/renderCoverageUniverse.test.mjs connect-four/package.json
git commit -m "test(reason-render): coverage acceptance test over the joint render universe (P4 C4)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: Grader G4 fix — solver-PV → engine `finalMovestring`

**Files:**
- Modify: `.claude/skills/grade-fv-sufficiency/SKILL.md`

> Markdown skill — no unit test. Verify by grep + read.

- [ ] **Step 1: Replace the PV-grounding wording.** In `SKILL.md`, edit every instruction that says to trace/verify against the "solver PV" / "principal variation" so it verifies against the engine's OWN `finalMovestring`. Specifically:
  - The "Observe the board with tools" bullet (~line 44–58): the "trace the solver's winning **principal variation**" clause → "trace the engine's OWN winning line (`finalMovestring` from the record's raw evidence — `lostResource.finalMovestring` when the lost resource is a winning line, else `opponentPunishment.finalMovestring`), and check whether it passes through the field's named cell/window."
  - The failure-triage `vector_error` bullet (~line 152–160): "Trace the solver's principal variation" → "Trace the engine's own `finalMovestring`"; "Only rule `vector_error` when the solver **contradicts** the field" stays, but "solver's winning **principal variation**" → "engine's own line".
  - The sub-agent template (~line 190–195): "Trace the solver's principal variation and check whether it passes through the named cell BEFORE calling the field wrong." → "Trace the engine's OWN `finalMovestring` (given below) and check whether it passes through the named cell BEFORE calling the field wrong. Never ground on an alternate optimal solver line — multiple optimal lines exist and grounding on the wrong one is exactly the eval-1/16/3 mis-grade bug."
  - The "Key rules recap" bullet (~line 347): "trace the solver PV before calling `vector_error`" → "trace the engine's own `finalMovestring` before calling `vector_error` (never an alternate solver PV — the eval-1/16/3 bug)".

- [ ] **Step 2: Verify no stray "principal variation"/"solver PV" grounding instruction remains**

Run: `grep -n "principal variation\|solver PV\|solver's winning" .claude/skills/grade-fv-sufficiency/SKILL.md`
Expected: no line still INSTRUCTS grounding on the solver PV (a mention that explicitly warns against it is fine).

- [ ] **Step 3: Commit**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add .claude/skills/grade-fv-sufficiency/SKILL.md
git commit -m "fix(grader): ground cells on the engine finalMovestring, not an alternate solver PV (P4 G4)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 9: Grader condition-D rubric (G1–G6) + render_decision consumption

**Files:**
- Modify: `.claude/skills/grade-fv-sufficiency/SKILL.md`

**Interfaces:**
- Consumes (from the answers jsonl): the condition-D `render_decision` object (Task 3 shape) + the record's RAW `feature_vector`/evidence.

> Markdown skill — no unit test. Verify by grep + a careful read. Keep the existing A1–A4 / condition-A path INTACT; G1–G6 are additive for condition D.

- [ ] **Step 1: Add a "Grading condition D" section** to `SKILL.md` (after the "How to grade" section). It must state, in the skill's own voice:

  - **Read the decision docs first (once):** `docs/architecture/reason-case-taxonomy.md`, `reason-DECISIONS.md` D20 (tag-first realized/denied router → `route`/`direction`) and D28 (the covers audit is a STATIC causal-code check; a covered-but-ABSENT field is NORMAL, not `missing_info`; L2-vs-L3 is computed at render time), and `connect-four/server/scripts/reason_engine/causalLinks.mjs` (the L1–L9 semantics). Grading a case against a re-imagined meaning is the same error class as an alternate PV.
  - **Consume `render_decision` as GROUND TRUTH; never re-derive it.** The condition-D answers line carries a `render_decision` object. Do NOT re-run `classifyCausalLink`, recompute branch-invariance, or re-select boards — that reintroduces the drift the single catalog prevents. Read the fired `link.id`/`confidence`/`covers`/`guardrail`/`text`, the `boards` shown/omitted list + reasons, `patternOnAfterBestBoard`, the `fieldPartition`, and `finalMovestring` straight from the record.
  - **Ground truth from RAW evidence.** Outcomes/cols come from the RAW `feature_vector` fields (the narrator vector is score-scrubbed — D21). Verify every cell against `render_decision.finalMovestring` (G4), never an alternate PV.
  - The six additive checks:
    - **G1 format-aware:** grade against the grounded artifact the model saw (the rendered boards, the plain-language threat list, the composed frame `text`, the reading key) — NOT the glossary+JSON.
    - **G2 per-link:** (a) the answer honored `render_decision.link.guardrail` (e.g. L3 → NO "your move caused/enabled it"); (b) over-removal audit — a code in `render_decision.link.covers` that the answer actually NEEDED = a wrong removal, BUT a covered-but-absent field is normal (D28), not `missing_info`; (c) a `confidence:"low"` link (L9) must HEDGE, not fabricate a crisp cause.
    - **G3 board-selection:** using `render_decision.boards`, over-omission audit — did the answer need a board marked `shown:false`?
    - **G4 engine-line grounding:** verify each named cell/line against `render_decision.finalMovestring`.
    - **G5 threat-list fidelity:** each rendered threat-list entry must be board-true on its stated board (`visualize_board.sh`); a wrong entry is a render bug to REPORT, not narrate around.
    - **G6 branch-invariance provenance:** given `patternOnAfterBestBoard` + `link.id` — (a) guardrail honored; (b) the routing was correct for the after-best board; a wrong L2/L3 pick (miscomputed `patternOnAfterBestBoard`) is a **render bug attributable to the pipeline**, never a model failure — triage it as `render_bug`, not `prompt_confusion`.

- [ ] **Step 2: Extend the failure-triage buckets for condition D.** Add a fourth bucket `render_bug` (a render-layer defect: a wrong causal-frame guardrail/route, a mis-selected/omitted board, a false threat-list entry, or a miscomputed `patternOnAfterBestBoard`) alongside `vector_error`/`missing_info`/`prompt_confusion`. Note that for condition D the `field_or_glossary` attribution becomes "which `render_decision` element or `causalLinks.mjs` rule is wrong."

- [ ] **Step 3: Add a condition-D sub-agent prompt block.** In the sub-agent template section, add (for condition D) a `## Render decision — GROUND TRUTH (do NOT re-derive)` block that the orchestrator fills from the record: `linkId`, `confidence`, `covers[]`, `guardrail`, verbatim `text`, `boards` (id/shown/reason), `patternOnAfterBestBoard`, `fieldPartition` (rendered/covered/excluded), `finalMovestring`. Instruct the sub-agent to trust these as the pipeline's decisions and audit the ANSWER against them (G1–G6), not to recompute them.

- [ ] **Step 4: Verify the additions are coherent and the A-path is intact**

Run: `grep -n "G1\|G2\|G3\|G4\|G5\|G6\|render_decision\|render_bug\|condition D\|A1–A4\|A1-A4" .claude/skills/grade-fv-sufficiency/SKILL.md | head -40`
Expected: the G1–G6 section, the `render_decision` ground-truth block, and the `render_bug` bucket are present; the original A1–A4 axes and condition-A instructions still appear.

- [ ] **Step 5: Commit**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add .claude/skills/grade-fv-sufficiency/SKILL.md
git commit -m "feat(grader): condition-D rubric G1–G6 consuming render_decision as ground truth (P4 B2)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 10: Root-cause the flip-case unreachability (scientific-method-debugging)

**Files:**
- Create: `docs/architecture/reason-flip-case-investigation.md` (the written finding)

> REQUIRED SUB-SKILL for this task: `superpowers:scientific-method-debugging`. This is an INVESTIGATION, not a fix. Soundness is frozen — if the cause is an engine/router defect, SURFACE it in the finding; do NOT patch `computeReason` or the router.

**Interfaces:**
- Consumes: `computeReason`, `patternOnAfterBestBoard`, `playGame` all-suboptimal probing (the D23 idiom, reproducible from `select_boards.mjs`).

- [ ] **Step 1: State the hypothesis.** Write the target predicate precisely: a board where `case ∈ {win_to_lose, draw_to_lose}` AND `direction = enabled_opponent` AND `patternOnAfterBestBoard === true` (the after-best board still carries the opponent's pattern → L3 by presence, not by already-losing). Frame ≥2 candidate hypotheses for why self-play never produces it (e.g. H1: structural — if the pattern survives the BEST move it was never the played move's doing, so the case can't be `enabled_opponent`+non-losing simultaneously; H2: a router-locus artifact like D23's `realizedPattern` timing).

- [ ] **Step 2: Run the experiment.** Use an all-suboptimal-column probe (reuse the Task-5 rare-fill loop or a standalone script under `/tmp`) over a few hundred games, logging for each `enabled_opponent` blunder the tuple `(case, patternOnAfterBestBoard, direction)`. Count how many hit the target predicate. Cross-check a handful by hand with `./visualize_board.sh <movestring><bestCol>` (does the opponent pattern really persist after the best move?).

- [ ] **Step 3: Draw the conclusion.** Determine whether the flip-case is (a) structurally impossible (the reason engine's own definitions preclude it — an honest I12 limit, extends D28), or (b) reachable-but-rare (a board exists; add it to the coverage set via the rare-fill), or (c) blocked by an engine/router bug (SURFACE it — describe the defect + a minimal repro, recommend a future engine-phase fix, do NOT patch here).

- [ ] **Step 4: Write the finding** to `docs/architecture/reason-flip-case-investigation.md`: hypothesis, experiment (games/probes, counts), the verified conclusion with a board example if found, and the disposition of the `flip_case_l3` predicate (stays PROVISIONAL if unreachable). Reference D28's I12 note.

- [ ] **Step 5: Commit**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add docs/architecture/reason-flip-case-investigation.md
git commit -m "docs(reason-render): flip-case unreachability investigation (P4 C5)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 11: Docs — D29, spec status, ablation runbook, memory

**Files:**
- Modify: `docs/architecture/reason-DECISIONS.md`
- Modify: `docs/architecture/reason-render-grounded-prompt.md`
- Create: `docs/architecture/reason-P4-ablation-runbook.md`
- Modify: memory `project_reason_render_layer.md` + `MEMORY.md` pointer

- [ ] **Step 1: Append D29** to `reason-DECISIONS.md` — the P4 decisions: `render_decision` emitted from `buildRenderDecision` (render-only, no engine change) onto condition-D answers lines; the grader consumes it as ground truth (never re-derives) with the solver-PV→`finalMovestring` fix; the coverage universe gains the render-layer joint predicates via a shared `renderUniverse.mjs`, graded on a freshly regenerated committed set (frozen 29 retained as ablation + regression anchor); the flip-case disposition per Task 10's finding. Match the existing D-entry format (Decision / Rationale / Status / Source).

- [ ] **Step 2: Update `reason-render-grounded-prompt.md`** — change the top status line and §5's P4 bullet from "proposal/remains" to IMPLEMENTED on `stagging`, and mark §8 open question 1 (`reachableInPlies` source) and any P4 items resolved.

- [ ] **Step 3: Write `reason-P4-ablation-runbook.md`** — the hand-off runbook: the exact command to run the A-vs-D ablation on the frozen 29
  (`cd connect-four && node server/scripts/compute.mjs --input server/scripts/<frozen-29-input>.jsonl --llm --condition A,D --n 3`),
  what it produces (`fv_suff_answers_*.jsonl` with `render_decision` on D lines), how to grade it
  (`/grade-fv-sufficiency <answers>.jsonl`), and the acceptance signals (eval-3 no longer frames the deep fork as near-term; eval-23 stops asserting causation; no regression on the other 27; per-link rubric green). Note it needs `OPENAI_API_KEY` + budget and is non-deterministic. Identify the actual frozen-29 INPUT board file (the boards jsonl that produced `reason_evidence_boards_coverage_2026-07-02T11-37-56Z.jsonl`).

- [ ] **Step 4: Update memory** `project_reason_render_layer.md` — P1+P2+P3+P4 DONE; add the P4 gotchas: `render_decision` is condition-D-only and derived purely from `buildRenderDecision` (no engine call); the grader consumes it as ground truth and must NOT re-derive routing; the coverage test runs on the freshly-regenerated committed set (frozen 29 = ablation + regression anchor only); `flip_case_l3` disposition per the investigation. Update the one-line pointer in `MEMORY.md` if its hook text changed.

- [ ] **Step 5: Commit**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add docs/architecture/reason-DECISIONS.md docs/architecture/reason-render-grounded-prompt.md docs/architecture/reason-P4-ablation-runbook.md
git commit -m "docs(reason-render): D29 + P4 status + ablation runbook (P4 docs)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

(Memory files live outside the repo — write them with the Write tool; they are not part of the git commit.)

---

### Task 12: Whole-branch review + final green

**Files:** none (review + any review-fix commits)

> Model tier: most-capable. Reviews the whole Phase-4 diff `048a275..HEAD`.

- [ ] **Step 1: Run the full fast suite**

Run: `cd connect-four && npm run test:fast 2>&1 | tail -8`
Expected: all pass (≥ 785 + the new tests); `renderCoverageCorpus.test.mjs` (frozen 29) still green.

- [ ] **Step 2: Verify the invariants hold across the diff.** Confirm: no `computeReason`/engine behavior change; no score/movestring leak into `render_decision` (grep the emitted object shape); the frozen 29 file is unchanged (`git diff --stat 048a275 -- connect-four/server/scripts/reason_evidence_boards_coverage_2026-07-02T11-37-56Z.jsonl` is empty); the field-disposition registry is not weakened; the `.claude/worktrees/win-dist-grid` tree was never touched (`git status` clean of it).

- [ ] **Step 3: Dispatch the whole-branch review** (per subagent-driven-development): a most-capable reviewer over `git diff 048a275..HEAD`, checking spec §3d/§3e/§3f/§6 conformance, the G4 fix, the covers-audit semantics (D28), and no-hand-built-boards. Address any Critical/Major findings with fix commits (explicit `git add`, same trailer).

- [ ] **Step 4: Final confirmation**

Run: `cd connect-four && npm run test:fast 2>&1 | tail -3 && cd .. && git log --oneline 048a275..HEAD`
Expected: green suite; the Phase-4 commit series present. Do NOT push / open a PR.

---

## Self-Review (completed against the spec)

- **§3d one catalog, three consumers:** composer (existing) + grader (Task 9 reads the catalog) + sampler (Task 5 via `renderDecisionPredicates`, itself derived from `classifyCausalLink` inside `buildRenderDecision`). ✓
- **§3e sampler MAXIMIZES joint coverage + runnable coverage test:** Task 5 (universe + rare-fill) + Task 6 (regenerate) + Task 7 (test). ✓
- **§3f render_decision record (full field set):** Task 2 shape covers case/route/direction, patternOnAfterBestBoard, link(id/confidence/covers/guardrail/text), boards shown/omitted+reason, resource status/horizon/reachableInPlies + register→horizon, fieldPartition, finalMovestring. ✓
- **§3f G1–G6 + decision-doc reads + covers-absent-is-normal:** Task 8 (G4) + Task 9 (G1–G3,G5,G6, docs reads, D28 semantics). ✓
- **§6 completeness invariant unchanged:** no registry edit; `renderCoverageCorpus.test.mjs` stays green (Task 12 step 1). ✓
- **Flip-case root-cause (user Q3):** Task 10 via scientific-method-debugging, surfaces (not patches) any engine defect. ✓
- **Ablation set up + hand off (user Q2):** Task 11 step 3 runbook; no live run in P4. ✓
- **New test files wired into `test:fast` AND `test`:** Tasks 3/4/7 each add their file by hand. ✓
- **Type consistency:** `boardSelectionDecisions` → `{id,shown,reason,...}` consumed identically in Tasks 2/4/9; `buildRenderDecision` output shape identical across Tasks 3/4/7/9; `renderDecisionPredicates` consumes that shape in Tasks 5/7. ✓
