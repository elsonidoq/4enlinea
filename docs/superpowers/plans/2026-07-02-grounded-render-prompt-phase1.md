# Grounded-Render Prompt — Phase 1 (Foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the single-source-of-truth causal-links catalog + a defensive field-completeness layer + a faithful structured render for the from-vector LLM prompt, wired as ablation `--condition D`, so no vector field can be silently dropped and every downstream consumer (composer, grader, sampler) derives from one catalog.

**Architecture:** Three new pure modules in `server/scripts/` — `reason_engine/causalLinks.mjs` (declarative L1–L9 catalog + `classifyCausalLink`), `fieldDisposition.mjs` (leaf-path walker + closed field-disposition registry + `assertCoverage` that throws on any unregistered field), and `renderReasonModel.mjs` (`buildReasonRenderModel` that classifies the link, runs the coverage assertion, and emits a staged render object; plus `assembleGroundedPrompt`). `compute.mjs` gains `--condition D`, which builds the prompt from the render object instead of dumping JSON. Phase 1 does NOT tag boards, ground cells, or compose rich causal text — frames are passthrough and boards are plain ASCII; those land in P2/P3.

**Tech Stack:** Node.js ESM (`.mjs`), `node:test` + `node:assert/strict`, existing `server/scripts/reasonNarratorVector.mjs` (`toNarratorVector`, `pruneVector`).

## Global Constraints

- **Coordinates are 0-indexed internally** (row 0 = bottom, col 0 = left); `cNrM` cell strings are 1-indexed. Never introduce 1-indexed internal coords. (Verbatim project invariant.)
- **No solver scores in the prompt, ever.** The score family (`scores`, `score`, `*Score`) is already scrubbed by `toNarratorVector` (`isNarratorHidden`); the render must not reintroduce it (no `scr` row).
- **Tests run via `node:test`.** Run a single file with `cd connect-four && node --test server/tests/<file>.test.mjs`. New reason tests are registered in the `test:fast` script in `connect-four/package.json`.
- **Commit after each task.** We are on branch `stagging` (not `main`), so committing is fine. End every commit message with:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
- **Authoritative spec:** `docs/architecture/reason-render-grounded-prompt.md` (§3b catalog, §3c render object, §3d consumers, §6 completeness). This plan implements P1 of §5.

## Scope

This plan is **Phase 1 only**. P2 (board tagger + cell grounding), P3 (the nine rich composers + branch-invariance), and P4 (grader per-link rubric + sampler `link_<id>` predicates + targeted harvest) each get their own plan once P1's interfaces are merged — their tasks depend on the exact signatures produced here.

## File Structure

- Create `connect-four/server/scripts/reason_engine/causalLinks.mjs` — declarative catalog + classifier. Consumed later by composer, grader, sampler.
- Create `connect-four/server/scripts/fieldDisposition.mjs` — leaf-path walker, closed disposition registry, `assertCoverage`.
- Create `connect-four/server/scripts/renderReasonModel.mjs` — `buildReasonRenderModel` + `assembleGroundedPrompt`.
- Create `connect-four/server/tests/causalLinks.test.mjs`, `fieldDisposition.test.mjs`, `renderReasonModel.test.mjs`, `renderCoverageCorpus.test.mjs`.
- Modify `connect-four/server/scripts/compute.mjs` — accept `--condition D`; build the grounded prompt for D.
- Modify `connect-four/package.json` — add the four test files to `test:fast`.
- Frozen corpus for the coverage test: `connect-four/server/scripts/reason_evidence_boards_coverage_2026-07-02T11-37-56Z.jsonl` (29 rows, shape `{ id, evidence, error, groundTruth }`; `evidence` is the raw reason object).

---

### Task 1: Causal-links catalog + classifier

**Files:**
- Create: `connect-four/server/scripts/reason_engine/causalLinks.mjs`
- Test: `connect-four/server/tests/causalLinks.test.mjs`

**Interfaces:**
- Produces: `CAUSAL_LINKS` (array of `{ id, family, confidence, when(fv,ctx), covers:string[], guardrail }`) and `classifyCausalLink(fv, ctx={}) -> { id, confidence, covers, guardrail }` (throws if no rule matches). `covers` entries are dotted field paths (e.g. `"opponentPunishment.tie.kind"`). Phase-1 note: the L2-vs-L3 split uses `ctx.patternOnAfterBestBoard` when provided, else falls back to `case` (P3 supplies the computed flag).

- [ ] **Step 1: Write the failing test**

```js
// connect-four/server/tests/causalLinks.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyCausalLink, CAUSAL_LINKS } from '../scripts/reason_engine/causalLinks.mjs';

test('L1 missed_own', () => {
  const fv = { case: 'win_to_lose', route: 'realized_denied', direction: 'missed_own',
               lostResource: { kind: 'realized_pattern' }, opponentPunishment: { kind: 'denial' } };
  assert.equal(classifyCausalLink(fv).id, 'L1');
});

test('L3 enabled_opponent when already losing (branch-invariant default)', () => {
  const fv = { case: 'lose_to_faster_lose', route: 'realized_denied', direction: 'enabled_opponent',
               lostResource: { kind: 'denial' }, opponentPunishment: { kind: 'realized_pattern' } };
  assert.equal(classifyCausalLink(fv).id, 'L3');
});

test('L2 enabled_opponent when winning was available and pattern not branch-invariant', () => {
  const fv = { case: 'win_to_lose', route: 'realized_denied', direction: 'enabled_opponent',
               lostResource: { kind: 'denial' }, opponentPunishment: { kind: 'realized_pattern' } };
  assert.equal(classifyCausalLink(fv, { patternOnAfterBestBoard: false }).id, 'L2');
});

test('L7 conditional swindle', () => {
  const fv = { case: 'lose_to_faster_lose', route: 'sign',
               lostResource: { kind: 'conditional_swindle', register: 'parity' },
               opponentPunishment: { kind: 'winning_line', register: 'parity' } };
  assert.equal(classifyCausalLink(fv).id, 'L7');
});

test('L9 diffuse parity win (no shared cell) beats L6', () => {
  const fv = { case: 'win_to_lose', route: 'sign',
               lostResource: { kind: 'winning_line', register: 'parity' },
               opponentPunishment: { kind: 'winning_line', register: 'parity', tie: { sharedCells: [] } } };
  assert.equal(classifyCausalLink(fv).id, 'L9');
});

test('no rule matches throws', () => {
  assert.throws(() => classifyCausalLink({ case: 'nonsense', route: 'sign', lostResource: {}, opponentPunishment: {} }));
});

test('every catalog entry has the required shape', () => {
  for (const l of CAUSAL_LINKS) {
    assert.ok(l.id && l.family && l.confidence && typeof l.when === 'function' && Array.isArray(l.covers));
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd connect-four && node --test server/tests/causalLinks.test.mjs`
Expected: FAIL — `Cannot find module '.../reason_engine/causalLinks.mjs'`.

- [ ] **Step 3: Write minimal implementation**

```js
// connect-four/server/scripts/reason_engine/causalLinks.mjs
// Single source of truth for the causal-explanation rules (spec §3b/§3d).
// Consumed by the render composer, the grader rubric, and the board sampler.
// Phase 1: `when` classification + `covers`/`guardrail` data. Rich `template()` text lands in P3.

const CODES_REALIZED = [
  'route', 'tag', 'direction',
  'lostResource.kind', 'lostResource.verdict', 'lostResource.register', 'lostResource.terminal',
  'opponentPunishment.kind', 'opponentPunishment.verdict', 'opponentPunishment.register', 'opponentPunishment.terminal',
  'opponentPunishment.tie.kind',
];
const CODES_SIGN = [
  'route', 'lostResource.kind', 'opponentPunishment.kind', 'opponentPunishment.verdict',
  'lostResource.terminal', 'opponentPunishment.terminal', 'lostResource.forkCase', 'opponentPunishment.forkCase',
  'opponentPunishment.tie.kind', 'opponentPunishment.tie.tied',
  'lostResource.register', 'opponentPunishment.register',
];

const hasSharedCell = (fv) =>
  !!(fv.opponentPunishment?.tie?.sharedCells?.length) || !!(fv.opponentPunishment?.cell);
// P3 supplies ctx.patternOnAfterBestBoard (branch-invariance). Until then, "already losing" is the proxy.
const branchInvariant = (fv, ctx) =>
  ctx.patternOnAfterBestBoard === true || fv.case === 'lose_to_faster_lose';

export const CAUSAL_LINKS = [
  // ── Family 1: realized_denied (checked first; L3 before L2) ──
  { id: 'L1', family: 'realized_denied', confidence: 'high',
    when: (fv) => fv.route === 'realized_denied' && fv.direction === 'missed_own',
    covers: CODES_REALIZED,
    guardrail: 'The correct move builds/completes YOUR pattern; do not attribute it to the opponent.' },
  { id: 'L4', family: 'realized_denied', confidence: 'high',
    when: (fv) => fv.route === 'realized_denied' && fv.direction === 'defensive_miss',
    covers: CODES_REALIZED,
    guardrail: 'The better move blocks the opponent pattern; frame it as a missed defense.' },
  { id: 'L3', family: 'realized_denied', confidence: 'high',
    when: (fv, ctx) => fv.route === 'realized_denied' && fv.direction === 'enabled_opponent' && branchInvariant(fv, ctx),
    covers: [...CODES_REALIZED, 'lostResource.exhaustive', 'gate.witness.node', 'gate.witness.devVal'],
    guardrail: 'MUST NOT say the played move caused or enabled the pattern; both moves lose, played loses faster.' },
  { id: 'L2', family: 'realized_denied', confidence: 'high',
    when: (fv, ctx) => fv.route === 'realized_denied' && fv.direction === 'enabled_opponent' && !branchInvariant(fv, ctx),
    covers: CODES_REALIZED,
    guardrail: 'The played move genuinely handed the opponent the pattern; name the conceded cell.' },
  // ── Family 2: sign (L9 refinement before L5/L6) ──
  { id: 'L7', family: 'sign', confidence: 'high',
    when: (fv) => fv.route !== 'realized_denied' && fv.lostResource?.kind === 'conditional_swindle',
    covers: [...CODES_SIGN, 'opponentPunishment.tie.playedPlies', 'opponentPunishment.tie.swindlePlies'],
    guardrail: 'Neither move wins; the better move only kept a practical swindle. Do not claim a win.' },
  { id: 'L8', family: 'sign', confidence: 'high',
    when: (fv) => fv.route !== 'realized_denied' && fv.case === 'draw_to_lose',
    covers: CODES_SIGN,
    guardrail: 'The position was a draw; the played move abandoned a defensive resource.' },
  { id: 'L9', family: 'sign', confidence: 'low',
    when: (fv) => fv.route !== 'realized_denied' && fv.lostResource?.kind === 'winning_line'
                  && fv.lostResource?.register === 'parity' && !hasSharedCell(fv),
    covers: ['route', 'lostResource.terminal', 'opponentPunishment.terminal'],
    guardrail: 'The culprit square is not cleanly isolable; hedge — do not fabricate a crisp cause.' },
  { id: 'L5', family: 'sign', confidence: 'high',
    when: (fv) => fv.route !== 'realized_denied' && fv.lostResource?.kind === 'winning_line'
                  && fv.opponentPunishment?.kind === 'denial',
    covers: CODES_SIGN,
    guardrail: 'You had a forced win; state its horizon honestly (may be deep). The played move let the opponent deny it.' },
  { id: 'L6', family: 'sign', confidence: 'high',
    when: (fv) => fv.route !== 'realized_denied' && fv.lostResource?.kind === 'winning_line'
                  && fv.opponentPunishment?.kind === 'winning_line',
    covers: CODES_SIGN,
    guardrail: 'You gave up a win AND handed the opponent their own; name both lines with their horizons.' },
];

export function classifyCausalLink(fv, ctx = {}) {
  for (const link of CAUSAL_LINKS) {
    if (link.when(fv, ctx)) {
      return { id: link.id, confidence: link.confidence, covers: link.covers, guardrail: link.guardrail };
    }
  }
  throw new Error(`classifyCausalLink: no rule matched (case=${fv.case} route=${fv.route} direction=${fv.direction})`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd connect-four && node --test server/tests/causalLinks.test.mjs`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add connect-four/server/scripts/reason_engine/causalLinks.mjs connect-four/server/tests/causalLinks.test.mjs
git commit -m "feat(reason-render): declarative causal-links catalog + classifyCausalLink (P1)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Field-disposition registry + coverage assertion

**Files:**
- Create: `connect-four/server/scripts/fieldDisposition.mjs`
- Test: `connect-four/server/tests/fieldDisposition.test.mjs`

**Interfaces:**
- Consumes: nothing (pure).
- Produces: `leafPaths(obj) -> string[]` (present leaf paths; arrays collapse to a single `[]` element-shape segment); `class UncoveredVectorFieldError extends Error`; `dispositionOf(path) -> 'transformed'|'exclude'|'causal-code'|'render'|null` (null = unknown); `assertCoverage(prunedFv, firedCovers=[]) -> void` (throws `UncoveredVectorFieldError` on the first present path whose disposition is `null`). A `causal-code` path is allowed whether or not `firedCovers` includes it (covered → hidden; not covered → falls back to render); the assertion's job is only to catch *unregistered* paths.

- [ ] **Step 1: Write the failing test**

```js
// connect-four/server/tests/fieldDisposition.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leafPaths, dispositionOf, assertCoverage, UncoveredVectorFieldError } from '../scripts/fieldDisposition.mjs';

test('leafPaths collapses arrays to element shape', () => {
  const paths = leafPaths({ a: 1, b: [{ c: 2 }], d: { e: 3 } });
  assert.deepEqual(new Set(paths), new Set(['a', 'b[].c', 'd.e']));
});

test('dispositionOf classifies representative paths', () => {
  assert.equal(dispositionOf('movestring'), 'transformed');
  assert.equal(dispositionOf('lostResource.finalMovestring'), 'transformed');
  assert.equal(dispositionOf('lostResource.line[].cell'), 'transformed');
  assert.equal(dispositionOf('notABlunder'), 'exclude');
  assert.equal(dispositionOf('gate.nodesVisited'), 'exclude');
  assert.equal(dispositionOf('lostResource.exhaustive'), 'exclude');
  assert.equal(dispositionOf('route'), 'causal-code');
  assert.equal(dispositionOf('opponentPunishment.tie.kind'), 'causal-code');
  assert.equal(dispositionOf('lostResource.completingCell'), 'render');
  assert.equal(dispositionOf('opponentPunishment.tie.sharedCells[]'), 'render');
  assert.equal(dispositionOf('replyHistogram.afterBest'), 'render');
});

test('unknown path has null disposition', () => {
  assert.equal(dispositionOf('opponentPunishment.brandNewField'), null);
});

test('assertCoverage passes on a fully-registered object', () => {
  const fv = { case: 'win_to_lose', bestCol: 1, playedCol: 2, movestring: '33',
               lostResource: { kind: 'winning_line', completingCell: 'c4r3' },
               opponentPunishment: { kind: 'denial', tie: { kind: 'tied', sharedCells: ['c4r3'] } },
               replyHistogram: { afterBest: 0, afterPlayed: 2 } };
  assert.doesNotThrow(() => assertCoverage(fv, []));
});

test('assertCoverage throws on an unregistered field', () => {
  const fv = { case: 'win_to_lose', opponentPunishment: { brandNewField: 7 } };
  assert.throws(() => assertCoverage(fv, []), UncoveredVectorFieldError);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd connect-four && node --test server/tests/fieldDisposition.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```js
// connect-four/server/scripts/fieldDisposition.mjs
// Closed field-disposition registry + coverage assertion (spec §6).
// Every leaf path present in a pruned narrator vector must map to a disposition;
// an unmapped path throws so a new engine field forces a conscious render/exclude decision.

export class UncoveredVectorFieldError extends Error {
  constructor(path) { super(`UncoveredVectorFieldError: ${path}`); this.name = 'UncoveredVectorFieldError'; this.path = path; }
}

export function leafPaths(obj, pre = '') {
  const out = [];
  if (Array.isArray(obj)) {
    if (obj.length === 0) return pre ? [pre + '[]'] : [];
    // collapse: element shape from the first element only
    const first = obj[0];
    if (first !== null && typeof first === 'object') return leafPaths(first, pre + '[]');
    return [pre + '[]'];
  }
  if (obj !== null && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) out.push(...leafPaths(v, pre ? `${pre}.${k}` : k));
    return out;
  }
  return pre ? [pre] : [];
}

const leaf = (path) => path.replace(/\[\]$/, '').split('.').pop();

// A. statically excluded (spec §6 C1); the score/samples family is already gone upstream.
const EXCLUDE_LEAVES = new Set(['notABlunder', 'discs', 'exhaustive', 'tacticFromDiff', 'nameable', 'parityNamingDeferred']);
const EXCLUDE_PATHS = new Set(['gate.ran', 'gate.nodesVisited', 'gate.witness.node', 'gate.witness.devVal']);

// B. transformed → the rendered board carries the info (raw field withheld).
const TRANSFORMED_LEAVES = new Set(['movestring', 'finalMovestring']);
const isTransformed = (p) => TRANSFORMED_LEAVES.has(leaf(p)) || /(^|\.)line(\[\]|\.|$)/.test(p);

// C. causal-code → conditionally hidden by a live frame's covers; otherwise renders.
const CODE_LEAVES = new Set(['route', 'tag', 'direction', 'kind', 'verdict', 'register', 'terminal', 'forkCase']);
const CODE_PATHS = new Set([
  'opponentPunishment.tie.kind', 'opponentPunishment.tie.tied',
  'gate.witness.devCols', 'gate.witness.oppPlies',
]);
const isCode = (p) => CODE_LEAVES.has(leaf(p)) || CODE_PATHS.has(p);

// D. render (literal or grounded-cell). Closed allowlist of known leaves + a few full paths.
const RENDER_LEAVES = new Set([
  'case', 'bestCol', 'playedCol', 'player', 'opponent', 'boardState', 'owner',
  'completingCell', 'window', 'windows', 'cell', 'cells', 'entryCell', 'anchorCells',
  'forkCells', 'forkWindows', 'tacticCells', 'tacticTag', 'supportingDiscs',
  'pliesToEnd', 'controllingGroup', 'ownDiscs', 'zcount', 'parity', 'basis', 'lockInPly', 'rule',
  'afterBest', 'afterPlayed', 'sharedCells', 'playedPlies', 'swindlePlies',
]);
const RENDER_PATHS = new Set(['gate.verdict']);
const isRender = (p) => RENDER_LEAVES.has(leaf(p)) || RENDER_PATHS.has(p);

export function dispositionOf(path) {
  if (isTransformed(path)) return 'transformed';
  if (EXCLUDE_LEAVES.has(leaf(path)) || EXCLUDE_PATHS.has(path)) return 'exclude';
  if (isCode(path)) return 'causal-code';
  if (isRender(path)) return 'render';
  return null; // unknown → tripwire
}

export function assertCoverage(prunedFv, _firedCovers = []) {
  for (const path of leafPaths(prunedFv)) {
    if (dispositionOf(path) === null) throw new UncoveredVectorFieldError(path);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd connect-four && node --test server/tests/fieldDisposition.test.mjs`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add connect-four/server/scripts/fieldDisposition.mjs connect-four/server/tests/fieldDisposition.test.mjs
git commit -m "feat(reason-render): closed field-disposition registry + coverage assertion (P1)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Render model + prompt assembler (faithful passthrough)

**Files:**
- Create: `connect-four/server/scripts/renderReasonModel.mjs`
- Test: `connect-four/server/tests/renderReasonModel.test.mjs`

**Interfaces:**
- Consumes: `pruneVector` from `./reasonNarratorVector.mjs`; `classifyCausalLink` from `./reason_engine/causalLinks.mjs`; `assertCoverage`, `leafPaths`, `dispositionOf` from `./fieldDisposition.mjs`.
- Produces: `buildReasonRenderModel(nv) -> { perspective, link, boards, rendered, coverage }` (calls `assertCoverage` internally on the pruned vector — throws on an unregistered field); `assembleGroundedPrompt(model) -> string`. Phase-1 shape: `boards.decision.ascii` is a plain untagged board (`tags: []`); `link` is the `classifyCausalLink` result; `rendered` is the pruned vector minus statically-excluded/transformed paths (faithful passthrough); `coverage.ok === true`.

- [ ] **Step 1: Write the failing test**

```js
// connect-four/server/tests/renderReasonModel.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildReasonRenderModel, assembleGroundedPrompt } from '../scripts/renderReasonModel.mjs';

const NV = {
  movestring: '341330613', playedCol: 4, bestCol: 3, player: 2, opponent: 1,
  case: 'win_to_lose', route: 'sign',
  lostResource: { kind: 'winning_line', register: 'forced_sequence', completingCell: 'c6r5' },
  opponentPunishment: { kind: 'winning_line', register: 'forced_sequence', completingCell: 'c3r3',
                        tie: { kind: 'tied', sharedCells: ['c4r5'] } },
  replyHistogram: { afterBest: 0, afterPlayed: 1 },
};

test('buildReasonRenderModel classifies link and passes coverage', () => {
  const m = buildReasonRenderModel(NV);
  assert.equal(m.link.id, 'L6');
  assert.equal(m.coverage.ok, true);
  assert.equal(m.perspective.you, 2);
});

test('rendered fields keep render cells but drop transformed/excluded (path-precise)', () => {
  const m = buildReasonRenderModel({ ...NV, notABlunder: false,
    lostResource: { ...NV.lostResource, finalMovestring: '34133061334', exhaustive: true } });
  assert.equal(m.rendered.lostResource.completingCell, 'c6r5');      // render cell survives
  assert.ok(!('finalMovestring' in m.rendered.lostResource));         // transformed dropped
  assert.ok(!('exhaustive' in m.rendered.lostResource));              // excluded dropped
  assert.ok(!('notABlunder' in m.rendered));                          // excluded dropped
  assert.ok(!('movestring' in m.rendered));                          // transformed dropped
});

test('render model draws an ASCII decision board', () => {
  const m = buildReasonRenderModel(NV);
  assert.match(m.boards.decision.ascii, /c1|col|\|/); // some board scaffold
  assert.deepEqual(m.boards.decision.tags, []);       // untagged in P1
});

test('assembled prompt contains the board and omits scores/movestring dump', () => {
  const prompt = assembleGroundedPrompt(buildReasonRenderModel(NV));
  assert.match(prompt, /Board/);
  assert.doesNotMatch(prompt, /"scores"/);
  assert.doesNotMatch(prompt, /"movestring"/); // raw movestring is transformed into the board
});

test('an unregistered field makes the model throw', () => {
  assert.throws(() => buildReasonRenderModel({ ...NV, opponentPunishment: { ...NV.opponentPunishment, brandNewField: 1 } }));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd connect-four && node --test server/tests/renderReasonModel.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```js
// connect-four/server/scripts/renderReasonModel.mjs
// Staged render object between the narrator vector and the prompt text (spec §3c).
// Phase 1: faithful passthrough — classify link, assert completeness, draw an untagged board.
// P2 adds tags/grounding; P3 adds rich causal-frame text.

import { pruneVector } from './reasonNarratorVector.mjs';
import { classifyCausalLink } from './reason_engine/causalLinks.mjs';
import { leafPaths, dispositionOf, assertCoverage } from './fieldDisposition.mjs';

// Rebuild a 6x7 board (row 0 bottom) from a 0-indexed movestring; render as ASCII.
function boardFromMovestring(ms) {
  const cols = 7, rows = 6;
  const heights = Array(cols).fill(0);
  const grid = Array.from({ length: rows }, () => Array(cols).fill('.'));
  [...(ms || '')].forEach((ch, i) => {
    const c = Number(ch);
    if (Number.isNaN(c) || c < 0 || c >= cols || heights[c] >= rows) return;
    grid[heights[c]][c] = (i % 2 === 0) ? 'A' : 'B'; // A = player 1 move, B = player 2 move
    heights[c] += 1;
  });
  return grid;
}
function asciiBoard(ms) {
  const grid = boardFromMovestring(ms);
  const header = '     ' + Array.from({ length: 7 }, (_, c) => `c${c + 1}`).join(' ');
  const body = [];
  for (let r = 5; r >= 0; r--) body.push(` r${r + 1} | ` + grid[r].join('  '));
  return [header, ...body].join('\n');
}

// The pruned vector minus fields the board carries (transformed) or statically excluded.
// Path-precise: recurse into plain-object containers; classify arrays/primitives by their own path;
// drop 'transformed'/'exclude', keep 'render' and (in P1, unapplied) 'causal-code'. Prune empties.
function renderedFields(prunedFv) {
  function prune(node, prefix) {
    if (node === null || typeof node !== 'object' || Array.isArray(node)) return node;
    const copy = {};
    for (const [key, val] of Object.entries(node)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
        const child = prune(val, path);            // container: recurse, keep if non-empty
        if (Object.keys(child).length) copy[key] = child;
      } else {
        const d = dispositionOf(path);             // array or primitive: classify by path
        if (d !== 'transformed' && d !== 'exclude') copy[key] = val;
      }
    }
    return copy;
  }
  return prune(prunedFv, '');
}

export function buildReasonRenderModel(nv) {
  const pruned = pruneVector(nv);
  const link = classifyCausalLink(pruned, {});
  assertCoverage(pruned, link.covers);
  return {
    perspective: { you: pruned.player, opponent: pruned.opponent },
    link,
    boards: { decision: { ascii: asciiBoard(pruned.movestring), tags: [] } },
    rendered: renderedFields(pruned),
    coverage: { ok: true, unowned: [] },
  };
}

export function assembleGroundedPrompt(model) {
  return [
    '# Board (you = player ' + model.perspective.you + ')',
    '',
    model.boards.decision.ascii,
    '',
    '# Reason (causal link ' + model.link.id + ', confidence ' + model.link.confidence + ')',
    model.link.guardrail,
    '',
    '# Vector facts',
    '```json',
    JSON.stringify(model.rendered, null, 2),
    '```',
  ].join('\n');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd connect-four && node --test server/tests/renderReasonModel.test.mjs`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add connect-four/server/scripts/renderReasonModel.mjs connect-four/server/tests/renderReasonModel.test.mjs
git commit -m "feat(reason-render): render model + prompt assembler, faithful passthrough (P1)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Corpus coverage test (the completeness gate) + register tests in test:fast

**Files:**
- Create: `connect-four/server/tests/renderCoverageCorpus.test.mjs`
- Modify: `connect-four/package.json:14` (the `test:fast` script)

**Interfaces:**
- Consumes: `buildReasonRenderModel` (Task 3), `toNarratorVector` from `./reasonNarratorVector.mjs`, the frozen corpus file.

- [ ] **Step 1: Write the failing test**

```js
// connect-four/server/tests/renderCoverageCorpus.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { toNarratorVector } from '../scripts/reasonNarratorVector.mjs';
import { buildReasonRenderModel } from '../scripts/renderReasonModel.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORPUS = join(__dirname, '../scripts/reason_evidence_boards_coverage_2026-07-02T11-37-56Z.jsonl');

test('every corpus record renders with zero uncovered fields and a classified link', () => {
  const rows = readFileSync(CORPUS, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.ok(rows.length >= 25, `expected the 29-record corpus, got ${rows.length}`);
  const failures = [];
  for (const row of rows) {
    if (!row.evidence || row.error) continue;
    try {
      const m = buildReasonRenderModel(toNarratorVector(row.evidence));
      assert.ok(m.link.id, `${row.id}: no link`);
    } catch (e) {
      failures.push(`${row.id}: ${e.message}`);
    }
  }
  assert.deepEqual(failures, [], `render failures:\n${failures.join('\n')}`);
});
```

- [ ] **Step 2: Run test to verify it fails or surfaces registry gaps**

Run: `cd connect-four && node --test server/tests/renderCoverageCorpus.test.mjs`
Expected: Either PASS, or FAIL listing `UncoveredVectorFieldError: <path>` / `classifyCausalLink: no rule matched` for real corpus fields. This is the point of the task — it exercises the full 29-record field space.

- [ ] **Step 3: Fix registry/classifier gaps surfaced by the corpus**

For each `UncoveredVectorFieldError: <path>`, add the leaf to the correct set in `fieldDisposition.mjs` (`RENDER_LEAVES` for a cell/value, `CODE_*` for a semantic code, `EXCLUDE_*` only with a documented reason). For each `no rule matched`, widen the relevant `when` in `causalLinks.mjs`. Re-run Step 2 until the corpus passes. (Do NOT loosen `assertCoverage` to swallow the error — that defeats the tripwire.)

- [ ] **Step 4: Register the four test files in `test:fast`**

In `connect-four/package.json`, append these to the end of the `test:fast` script string (line 14), space-separated, before the closing quote:

```
server/tests/causalLinks.test.mjs server/tests/fieldDisposition.test.mjs server/tests/renderReasonModel.test.mjs server/tests/renderCoverageCorpus.test.mjs
```

- [ ] **Step 5: Run the fast suite to verify no regression**

Run: `cd connect-four && npm run test:fast`
Expected: PASS, including the four new files.

- [ ] **Step 6: Commit**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add connect-four/server/tests/renderCoverageCorpus.test.mjs connect-four/package.json connect-four/server/scripts/fieldDisposition.mjs connect-four/server/scripts/reason_engine/causalLinks.mjs
git commit -m "test(reason-render): corpus completeness gate + register P1 tests in test:fast

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Wire `--condition D` into compute.mjs

**Files:**
- Modify: `connect-four/server/scripts/compute.mjs` (condition parsing ~line 114; `buildPrompt` ~line 209)
- Test: `connect-four/server/tests/computeConditionD.test.mjs`

**Interfaces:**
- Consumes: `buildReasonRenderModel`, `assembleGroundedPrompt` (Task 3). `compute.mjs` already loops `for (const condition of CONDITIONS)` calling `buildPrompt(glossaryText, nv, condition)`.

- [ ] **Step 1: Write the failing test**

```js
// connect-four/server/tests/computeConditionD.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPromptForCondition } from '../scripts/compute.mjs';

const NV = {
  movestring: '341330613', playedCol: 4, bestCol: 3, player: 2, opponent: 1,
  case: 'win_to_lose', route: 'sign',
  lostResource: { kind: 'winning_line', register: 'forced_sequence', completingCell: 'c6r5' },
  opponentPunishment: { kind: 'winning_line', register: 'forced_sequence', completingCell: 'c3r3',
                        tie: { kind: 'tied', sharedCells: ['c4r5'] } },
  replyHistogram: { afterBest: 0, afterPlayed: 1 },
};

test('condition D produces the grounded prompt (board + causal link), not the glossary+JSON dump', () => {
  const prompt = buildPromptForCondition('GLOSSARY-TEXT', NV, 'D');
  assert.match(prompt, /# Board/);
  assert.match(prompt, /causal link L6/);
  assert.doesNotMatch(prompt, /GLOSSARY-TEXT/); // D does not prepend the 607-line glossary
});

test('condition A is unchanged (glossary + JSON)', () => {
  const prompt = buildPromptForCondition('GLOSSARY-TEXT', NV, 'A');
  assert.match(prompt, /GLOSSARY-TEXT/);
  assert.match(prompt, /# Feature vector/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd connect-four && node --test server/tests/computeConditionD.test.mjs`
Expected: FAIL — `buildPromptForCondition` is not exported.

- [ ] **Step 3: Modify compute.mjs**

At the top of `compute.mjs`, add to the imports near the existing `import { toNarratorVector, pruneVector } from './reasonNarratorVector.mjs';`:

```js
import { buildReasonRenderModel, assembleGroundedPrompt } from './renderReasonModel.mjs';
```

Change condition parsing (line ~114) so `all` includes D and D is accepted:

```js
  CONDITIONS = condArg === 'all' ? ['A', 'B', 'C', 'D'] : condArg.toUpperCase().split(',');
```

Rename `buildPrompt` to an exported `buildPromptForCondition` and add the D branch. Replace the existing `function buildPrompt(glossary, fv, condition) { ... }` with:

```js
export function buildPromptForCondition(glossary, fv, condition) {
  if (condition === 'D') {
    return assembleGroundedPrompt(buildReasonRenderModel(fv));
  }
  const projected = projectVector(fv, condition);
  return `${glossary}

---

${TASK}

# Feature vector

\`\`\`json
${JSON.stringify(projected, null, 2)}
\`\`\``;
}
```

Update the single call site (in the answerer loop, ~line 290) from `buildPrompt(glossaryText, nv, condition)` to `buildPromptForCondition(glossaryText, nv, condition)`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd connect-four && node --test server/tests/computeConditionD.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 5: Add the test to test:fast and run the fast suite**

Append `server/tests/computeConditionD.test.mjs` to the `test:fast` script in `connect-four/package.json`, then:

Run: `cd connect-four && npm run test:fast`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add connect-four/server/scripts/compute.mjs connect-four/server/tests/computeConditionD.test.mjs connect-four/package.json
git commit -m "feat(reason-render): wire --condition D to the grounded prompt (P1)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage (P1 scope of §5):**
- Catalog module + `classifyCausalLink` → Task 1 ✓
- Field-disposition registry + covers-aware coverage assertion (§6) → Task 2 (assertion) + Task 4 (corpus gate) ✓
- Faithful structured render (sections, untagged boards, passthrough frames) → Task 3 ✓
- `--condition D` wiring → Task 5 ✓
- Corpus coverage test (zero uncovered fields) → Task 4 ✓
- Single source of truth consumed by three consumers → catalog created in Task 1; grader/sampler consumers are P4 (out of P1 scope, noted).

**Deferred to later plans (not gaps):** board tagging + cell grounding/`horizon` (P2); rich per-link `template()` text + L2/L3 branch-invariance `ctx.patternOnAfterBestBoard` (P3); grader per-link rubric + sampler `link_<id>` predicates + targeted harvest (P4). The `covers` data ships in Task 1 so P3/P4 consume it without a schema change.

**Placeholder scan:** none — every step has runnable code/commands.

**Type consistency:** `classifyCausalLink(fv, ctx)` returns `{ id, confidence, covers, guardrail }` — used identically in Task 3 (`m.link.id/.confidence/.guardrail`) and Task 5. `buildReasonRenderModel`/`assembleGroundedPrompt` signatures match across Tasks 3–5. `assertCoverage(prunedFv, firedCovers)` matches Task 2 definition and Task 3 call.
