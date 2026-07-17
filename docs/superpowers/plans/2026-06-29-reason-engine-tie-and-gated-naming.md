# Reason-engine: tie principle + solver-gated tactic naming — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the blunder-reason engine (a) name each half's tactic only when the solver confirms it (two gates), and (b) verify the causal tie between `lostResource` and `opponentPunishment` in every case instead of computing them independently.

**Architecture:** Spec is `docs/architecture/reason-engine-pseudocode.md`. All changes are additive to one file, `connect-four/server/scripts/reason_audit/reasonEngine.mjs`. The solver stays authoritative; `classifyPattern` only proposes tactic labels, gated by `register` (nature) and the realized-win locus (locus). Each resource gains `anchorCells`; half (b) gains `entryCell` and a verified `tie`.

**Tech Stack:** Node ESM, `node:test`, the c4solver wrapper, the production `classifier.js` (`classifyPattern`).

## Global Constraints

- Coordinates 0-indexed internally; cell display strings are `cNrM` (1-indexed) at the boundary only. Use `cellStr`/`parseCell` from `lib/boardUtils.mjs`.
- Run tests from `connect-four/`. Use `node --test server/tests/<file>` for the engine test (NEVER full `npm test` — it hangs the solver).
- All new fields are ADDITIVE — existing fields and the existing 33-row `reasonEngine.test.mjs` must keep passing unchanged.
- Solver-error safe: any new naming/classify path must `try/catch` and degrade to nulls, never throw out of `computeReason`.
- The solver is authoritative: `classifyPattern` may only NAME/ground; it never changes `case`, `register`, `completingCell`, or the verdict.

---

### Task 1: `anchorCells` on every lost resource

**Files:**
- Modify: `connect-four/server/scripts/reason_audit/reasonEngine.mjs`
- Test: `connect-four/server/tests/reasonEngine.enrichment.test.mjs` (create)

**Interfaces:**
- Produces: `winningMoveCells(movestring, scores) -> string[]` (cNrM of every column whose score>0). `out.lostResource.anchorCells: string[]` set for all four blunder cases.

- [ ] **Step 1: Write the failing test**

Create `connect-four/server/tests/reasonEngine.enrichment.test.mjs`:

```js
import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { createSolverProcess } from '../c4solver-wrapper.js';
import { computeReason } from '../scripts/reason_audit/reasonEngine.mjs';

let solver;
before(async () => { solver = await createSolverProcess(); });
after(() => { if (solver) solver.destroy(); });

test('anchorCells: win_to_draw 3325 = winning-move cells', async () => {
  const r = await computeReason('3325', 5, { solver });
  // scores [-3,18,2,3,-3,0,-3]: winning cols 1,2,3 -> landing cells c2r1,c3r2,c4r3
  assert.deepEqual([...r.lostResource.anchorCells].sort(), ['c2r1', 'c3r2', 'c4r3']);
});

test('anchorCells present for every blunder case', async () => {
  for (const [ms, pc] of [['3325', 5], ['214444115623', 4]]) {
    const r = await computeReason(ms, pc, { solver });
    assert.ok(Array.isArray(r.lostResource.anchorCells), `${ms}: anchorCells is array`);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd connect-four && node --test server/tests/reasonEngine.enrichment.test.mjs`
Expected: FAIL — `r.lostResource.anchorCells` is `undefined`.

- [ ] **Step 3: Add the helper**

In `reasonEngine.mjs`, after the `attributeParityWin` function, add:

```js
// The MOVE-LEVEL squares that define the lost resource (the winning moves the player had).
// The tie (Task 3) is verified against these, not against the eventual completing cell.
function winningMoveCells(movestring, scores) {
  const { heights } = buildBoard(movestring);
  const out = [];
  for (let c = 0; c < COLS; c++) if (scores[c] !== INVALID_MOVE && scores[c] > 0) out.push(cellStr(heights[c], c));
  return out;
}
```

- [ ] **Step 4: Set `anchorCells` in each case**

In `computeReason`, after each `out.lostResource = ...` assignment:

win_to_draw and win_to_lose — add immediately after the `out.lostResource = renderHalf(...)` line:
```js
    out.lostResource.anchorCells = winningMoveCells(movestring, scores);
```

draw_to_lose — inside the tactical branch (`defensive_hold` object) add field:
```js
        anchorCells: [holdCell],
```
and inside the zugzwang branch (`parity_group` object) add field:
```js
        anchorCells: cell ? [cell] : [],
```

lose_to_faster_lose — after `out.lostResource = renderHalf('conditional_swindle', ...)`:
```js
    const { heights: gh } = buildBoard(gate.node);
    out.lostResource.anchorCells = [cellStr(gh[gate.devCol], gate.devCol)];
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd connect-four && node --test server/tests/reasonEngine.enrichment.test.mjs`
Expected: PASS (both tests).

- [ ] **Step 6: Commit**

```bash
git add connect-four/server/scripts/reason_audit/reasonEngine.mjs connect-four/server/tests/reasonEngine.enrichment.test.mjs
git commit -m "feat(reason): add anchorCells (move-level lost resource) to every case"
```

---

### Task 2: Solver-gated tactic naming (two gates)

**Files:**
- Modify: `connect-four/server/scripts/reason_audit/reasonEngine.mjs`
- Test: `connect-four/server/tests/reasonEngine.enrichment.test.mjs`

**Interfaces:**
- Consumes: existing `nameHalf`, `TAG_PRIORITY`, `classifyPattern`, half objects with `register`/`window`/`line`/`parityAttribution`.
- Produces: `realizedLocus(half) -> Set<string>`; `nameHalf(solver, rootMs, perspective, { diffAgainst, register, anchor })` now gates by Gate 1 (register class) + Gate 2 (locus). Omitting `register`/`anchor` keeps the old un-gated behavior.

- [ ] **Step 1: Write the failing test**

Append to `reasonEngine.enrichment.test.mjs`:

```js
test('gated naming: 214444115623 rejects the immediate_threat decoy', async () => {
  const r = await computeReason('214444115623', 4, { solver });
  // register is 'parity'; immediate_threat{c3r4} is the blocked decoy and must be rejected.
  assert.notEqual(r.lostResource.tacticTag, 'immediate_threat');
  // contextual fallback names the actual row-2 group -> minor_threat with a cell in the group.
  assert.equal(r.lostResource.tacticTag, 'minor_threat');
  const group = new Set(r.lostResource.parityAttribution.controllingGroup);
  assert.ok(r.lostResource.tacticCells.some((c) => group.has(c)), 'named cells touch the controlling group');
});

test('gated naming: 3325 keeps double_threat', async () => {
  const r = await computeReason('3325', 5, { solver });
  assert.equal(r.lostResource.tacticTag, 'double_threat');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd connect-four && node --test server/tests/reasonEngine.enrichment.test.mjs`
Expected: FAIL — `214444115623` currently yields `tacticTag: 'immediate_threat'`.

- [ ] **Step 3: Add register-class map + gate helpers**

In `reasonEngine.mjs`, immediately after the `TAG_PRIORITY` array, add:

```js
// GATE 1 class map. INVARIANT: register is a function of win-distance, so a short tactic cannot win
// a long (parity) position and vice-versa. contextual = weak/defensive, admissible in any register.
const REGISTER_CLASS = {
  immediate_threat: 'tactical', double_threat: 'tactical', forced_win: 'tactical',
  figure_7: 'tactical', j_shape: 'tactical', undercut: 'tactical', overcut: 'tactical',
  z_threat: 'structural', odd_even_threat: 'structural', claimeven: 'structural',
  major_threat_parity: 'structural', major_threat_nonparity: 'structural',
  forced_block: 'contextual', forbidden_columns: 'contextual', minor_threat: 'contextual',
};
function registerClassOk(tag, register) {
  const cls = REGISTER_CLASS[tag] || 'contextual';
  if (cls === 'contextual') return true;                  // last-resort, any register
  return register === 'parity' ? cls === 'structural' : cls === 'tactical';
}
function cellsTouch(cells, anchor) {
  return (cells || []).some((c) => anchor.has(c));
}
// GATE 2 anchor: the cells the solver's realized win actually occupies/rides.
function realizedLocus(half) {
  const s = new Set();
  for (const c of (half.window || [])) s.add(c);
  for (const m of (half.line || [])) s.add(m.cell);
  const pa = half.parityAttribution;
  if (pa && pa.controllingGroup) for (const c of pa.controllingGroup) s.add(c);
  return s;
}
```

- [ ] **Step 4: Replace `nameHalf` body with the gated version**

Replace the existing `nameHalf` function with:

```js
async function nameHalf(solver, rootMs, perspective, { diffAgainst, register, anchor } = {}) {
  try {
    const pRoot = await classifyPattern(rootMs, perspective, solver);
    const exclude = diffAgainst != null ? await classifyPattern(diffAgainst, perspective, solver) : null;
    const ok = (tag) => (register == null || registerClassOk(tag, register))
                     && (anchor == null || cellsTouch(pRoot.get(tag).cells, anchor));
    const admissible = [...pRoot.keys()].filter(ok);
    if (!admissible.length) return { tacticTag: null, tacticCells: [], tacticFromDiff: false };
    const inDiff = (t) => (exclude ? !exclude.has(t) : false);
    admissible.sort((a, b) => (inDiff(b) - inDiff(a))
      || (TAG_PRIORITY.indexOf(a) - TAG_PRIORITY.indexOf(b)));   // diff = tiebreak, NOT a gate
    const tag = admissible[0];
    return { tacticTag: tag, tacticCells: pRoot.get(tag).cells || [], tacticFromDiff: inDiff(tag) };
  } catch {
    return { tacticTag: null, tacticCells: [], tacticFromDiff: false };
  }
}
```

(The old `pickTag` helper is now unused — delete it.)

- [ ] **Step 5: Pass `register` + `anchor` at the WIN-half call sites**

For each WIN-half `nameHalf` call (the three on `lostResource`/`opponentPunishment` that follow a `renderHalf`), add `register` + `anchor` to the options. Pattern — change:
```js
    Object.assign(out.lostResource, await nameHalf(solver, bestRoot, player, { diffAgainst: playedRoot }));
```
to:
```js
    Object.assign(out.lostResource, await nameHalf(solver, bestRoot, player,
      { diffAgainst: playedRoot, register: out.lostResource.register, anchor: realizedLocus(out.lostResource) }));
```
Apply the analogous change to: win_to_lose `lostResource` (bestRoot/player/diffAgainst playedRoot), win_to_lose `opponentPunishment` (playedRoot/opponent, no diff), draw_to_lose `opponentPunishment` (playedRoot/opponent), and the two lose_to_faster_lose halves (swindleRoot/player; playedRoot/opponent) — each using that half's own `.register` and `realizedLocus(thatHalf)`.

Leave the `win_to_draw` neutralization `nameHalf(solver, playedRoot, opponent)` call UN-gated (it names a draw-save, not a realized win — no locus gate applies).

- [ ] **Step 6: Run test to verify it passes**

Run: `cd connect-four && node --test server/tests/reasonEngine.enrichment.test.mjs`
Expected: PASS (decoy rejected → `minor_threat`; `3325` keeps `double_threat`).

- [ ] **Step 7: Commit**

```bash
git add connect-four/server/scripts/reason_audit/reasonEngine.mjs connect-four/server/tests/reasonEngine.enrichment.test.mjs
git commit -m "feat(reason): solver-gate tactic naming (register class + realized-locus)"
```

---

### Task 3: The tie — `entryCell` + `tieTo`, wired in every case

**Files:**
- Modify: `connect-four/server/scripts/reason_audit/reasonEngine.mjs`
- Test: `connect-four/server/tests/reasonEngine.enrichment.test.mjs`

**Interfaces:**
- Consumes: `out.lostResource.anchorCells` (Task 1), `CASES`.
- Produces: `half.entryCell: string|null` on every half; `tieTo(caseName, lost, punish) -> { kind, ... }`; `out.opponentPunishment.tie` set for all four blunder cases.

- [ ] **Step 1: Write the failing test**

Append to `reasonEngine.enrichment.test.mjs`:

```js
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __d = dirname(fileURLToPath(import.meta.url));
const fixtureRows = readFileSync(join(__d, '../scripts/reason_audit/reason_fixture.jsonl'), 'utf8')
  .trim().split('\n').map((l) => JSON.parse(l));

test('tie: 3325 win_to_draw is tied at the winning square', async () => {
  const r = await computeReason('3325', 5, { solver });
  assert.equal(r.opponentPunishment.tie.kind, 'tied');
  assert.ok(r.opponentPunishment.tie.sharedCells.includes('c2r1'));
});

test('tie: lose_to_faster_lose is temporal', async () => {
  const r = await computeReason('3333325662555225', 1, { solver });
  assert.equal(r.opponentPunishment.tie.kind, 'temporal');
  assert.equal(typeof r.opponentPunishment.tie.playedPlies, 'number');
  assert.equal(typeof r.opponentPunishment.tie.swindlePlies, 'number');
});

test('tie: present with a valid kind on every blunder fixture row', async () => {
  for (const f of fixtureRows) {
    const r = await computeReason(f.movestring, f.playedCol, { solver });
    if (r.notABlunder || !r.opponentPunishment) continue;
    assert.ok(['tied', 'independent', 'temporal'].includes(r.opponentPunishment.tie.kind),
      `${f.movestring}: tie.kind valid`);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd connect-four && node --test server/tests/reasonEngine.enrichment.test.mjs`
Expected: FAIL — `r.opponentPunishment.tie` is `undefined`.

- [ ] **Step 3: Add `entryCell` to `renderHalf`**

In `renderHalf`, add to the `half` object literal (after `finalMovestring`):
```js
    entryCell: (walk.line && walk.line[0]) ? walk.line[0].cell : (walk.completingCell ?? null),
```

- [ ] **Step 4: Add `entryCell` to the neutralization half**

In the `win_to_draw` branch, in the `out.opponentPunishment = { kind: 'neutralization', ... }` object, add:
```js
      entryCell: saveCell,
```

- [ ] **Step 5: Add `tieTo`**

After `winningMoveCells`, add:

```js
// The tie: is the opponent's punishment exploiting the very resource that was given up?
// spatial for most cases; temporal for lose_to_faster_lose. May legitimately be 'independent'.
function tieTo(caseName, lost, punish) {
  if (caseName === CASES.LOSE_TO_FASTER_LOSE) {
    const playedPlies = punish.pliesToEnd ?? null, swindlePlies = lost.pliesToEnd ?? null;
    return { kind: 'temporal', playedPlies, swindlePlies,
      tied: (playedPlies != null && swindlePlies != null && playedPlies < swindlePlies) };
  }
  const anchor = new Set(lost.anchorCells || []);
  const shared = [...new Set([punish.entryCell, punish.completingCell])].filter((c) => c && anchor.has(c));
  return { kind: shared.length ? 'tied' : 'independent', sharedCells: shared };
}
```

- [ ] **Step 6: Wire the tie after the case dispatch**

In `computeReason`, immediately before the `// ── reply histogram` block, add:
```js
  if (out.lostResource && out.opponentPunishment) {
    out.opponentPunishment.tie = tieTo(out.case, out.lostResource, out.opponentPunishment);
  }
```

- [ ] **Step 7: Run test to verify it passes**

Run: `cd connect-four && node --test server/tests/reasonEngine.enrichment.test.mjs`
Expected: PASS (all tie tests).

- [ ] **Step 8: Commit**

```bash
git add connect-four/server/scripts/reason_audit/reasonEngine.mjs connect-four/server/tests/reasonEngine.enrichment.test.mjs
git commit -m "feat(reason): verify lostResource<->opponentPunishment tie in every case"
```

---

### Task 4: Regression, corpus regen, admin display

**Files:**
- Run: existing `reasonEngine.test.mjs`
- Run: `connect-four/server/scripts/reason_audit/build_evidence.mjs`
- Modify: `connect-four/src/pages/AdminFvSuffPage.jsx`

**Interfaces:**
- Consumes: the new `tacticTag`/`tie` fields on halves (rendered in the existing Raw evidence JSON automatically; this task adds a compact chip).

- [ ] **Step 1: Run the existing engine test (no regressions)**

Run: `cd connect-four && node --test server/tests/reasonEngine.test.mjs`
Expected: `pass 33  fail 0`.

- [ ] **Step 2: Run the new enrichment test**

Run: `cd connect-four && node --test server/tests/reasonEngine.enrichment.test.mjs`
Expected: all PASS.

- [ ] **Step 3: Regenerate the corpus**

Run: `cd connect-four && node server/scripts/reason_audit/build_evidence.mjs`
Expected: `wrote 33 evidence rows ...` and `case mismatches vs fixture ground truth: 0`.

- [ ] **Step 4: Add a tie chip to the admin half detail**

In `src/pages/AdminFvSuffPage.jsx`, inside `HalfDetail`, after the `tacticTag` chip block, add:
```jsx
        {half.tie && (
          <Chip
            text={`⇄ ${half.tie.kind}${half.tie.sharedCells?.length ? ' ' + half.tie.sharedCells.join(' ') : ''}`}
            bg={half.tie.kind === 'tied' ? '#dcfce7' : half.tie.kind === 'temporal' ? '#ede9fe' : '#fee2e2'}
            fg={half.tie.kind === 'tied' ? '#15803d' : half.tie.kind === 'temporal' ? '#6d28d9' : '#b91c1c'}
          />
        )}
```

- [ ] **Step 5: Verify the known board end-to-end**

Run: `cd connect-four && node server/scripts/reason_audit/reasonEngine.mjs 214444115623 4 | python3 -c "import json,sys;o=json.load(sys.stdin);print('lost.tactic',o['lostResource']['tacticTag']);print('opp.tie',o['opponentPunishment']['tie'])"`
Expected: `lost.tactic minor_threat` and an `opp.tie` object with a valid `kind`.

- [ ] **Step 6: Commit**

```bash
git add connect-four/server/scripts/reason_evidence_all.jsonl connect-four/src/pages/AdminFvSuffPage.jsx
git commit -m "chore(reason): regenerate corpus; show tie chip in fv-suff admin"
```

---

## Self-Review

**Spec coverage:** parity attribution (pre-existing, untouched ✓); solver-gated naming = Task 2 ✓; tie principle whole-algorithm = Task 1 (anchorCells) + Task 3 (tieTo, all cases) ✓; honest `independent`/`temporal` tie = Task 3 `tieTo` ✓; `anchorCells` not a proxy = Task 1 ✓.

**Placeholder scan:** none — every code step shows complete code; expected values verified against the two known boards in-session.

**Type consistency:** `anchorCells: string[]` (Task 1) consumed by `tieTo` (Task 3) ✓; `entryCell` set in `renderHalf` and neutralization, read by `tieTo` ✓; `nameHalf` new opts `{ register, anchor }` produced by `realizedLocus` and the half's `.register` ✓; `tacticTag`/`tie` field names match between engine output and admin chip ✓.

**Known limitation deferred (not in scope):** the `win_to_lose` tie uses the uniform spatial intersection; a stricter "enabled-by-vacating" causal test is left for later (noted in the spec's honest-limits).
```
