# Opening-Aware Reason Engine Implementation Plan (Part B)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the blunder-reason feature-vector engine explain opening blunders soundly — carry a board-findable centrality reason (and, when the board is an exact KB opening line, the opening's name) — and wire that new evidence through the eval harness, the grader, the glossary, and the production prompt.

**Architecture:** Additive only. `computeReason` gains an `openingContext` field computed by **reusing** `centerDominance.js` (centrality) plus one new pure `matchNamedOpening` helper (Tier-2 label). The two-halves engine, the 5-case taxonomy, and the gate are untouched. Coverage (`select_boards.mjs`), the glossary, the `grade-fv-sufficiency` skill, and the production prompt (`explainContext.js` → `llmCoachHelpers.js`) are extended to see the new field. The general causal "you left the opening" reason is **deferred as unsound** and is NOT built.

**Tech Stack:** Node ESM (`.mjs` reason engine, `.js` server), `node:test`, the `c4solver` wrapper, the existing KB markdown entries as the source of truth.

## Global Constraints

- **Invariant I0 (correctness over optimization):** never prune search / lower a bound / cache-around to save solver calls. Extra solver calls from un-skipping openings are expected and acceptable.
- **Invariant I2 (never fabricate):** every clause is solver- or canon-grounded. Centrality is a geometric board-findable claim (sound). A named-opening label is a **lookup match**, asserted only on an exact KB-line match (sound). No general causal deviation claim.
- **Invariant I8 (reuse detectors as evidence):** reuse `detectCenterDominance`; do not re-derive centrality.
- **Invariant I12 (validate against the case-space):** validate the new field through the **production `computeReason`**, with a counterexample per opening sub-case — never a hand proxy.
- **Coordinates 0-indexed** internally; the engine emits `cNrM` **1-indexed** cells. Movestring digits are 0-indexed columns.
- **`board_state` bands:** `opening` = `discs < REASON_CONFIG.openingMaxDiscs` (15), set at `reasonEngine.mjs:865`.
- **Do NOT change** the 5-case taxonomy, the two-halves engine, or the `lose_to_faster_lose` gate.
- **Reason-engine tests are solver-backed** (not `test:fast`); model them on `connect-four/server/tests/reasonRealizedDenied.test.mjs`. Run individual test files with `node --test <path>` from `connect-four/`.
- **Read before coding (per `CLAUDE.md`):** `docs/architecture/reason-INVARIANTS.md`, `reason-DECISIONS.md`, `reason-case-taxonomy.md`, `blunder-reason-evidence.md`.

---

### Task 1: `matchNamedOpening` helper (Tier-2 label, pure function)

Pure, solver-free lookup: does a movestring exactly match a KB opening line (up to left/right mirror about column 3)?

**Files:**
- Create: `connect-four/server/scripts/reason_engine/lib/namedOpenings.mjs`
- Test: `connect-four/server/scripts/reason_engine/lib/namedOpenings.test.mjs`

**Interfaces:**
- Produces: `matchNamedOpening(movestring: string) → { id: string, line: string } | null` — `id` is the KB slug, `line` is the canonical (un-mirrored) matched movestring. `mirrorMovestring(movestring: string) → string` (maps each column `c` to `6 - c`).

- [ ] **Step 1: Write the failing test**

```javascript
// namedOpenings.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchNamedOpening, mirrorMovestring } from './namedOpenings.mjs';

test('mirrorMovestring reflects columns about col 3', () => {
  assert.equal(mirrorMovestring('333334444'), '333332222');
  assert.equal(mirrorMovestring('0123456'), '6543210');
});

test('matches the 5-4 opening exactly', () => {
  assert.deepEqual(matchNamedOpening('333334444'), { id: 'allen-5-4-opening', line: '333334444' });
});

test('matches the mirror of the 5-4 opening, reporting the canonical line', () => {
  // 333332222 is the mirror; it still resolves to the 5-4 entry.
  assert.deepEqual(matchNamedOpening('333332222'), { id: 'allen-5-4-opening', line: '333334444' });
});

test('matches the D3-D4 Diagram-231 line and the third-row gambit', () => {
  assert.equal(matchNamedOpening('3332223362').id, 'allen-d3-d4-opening');
  assert.equal(matchNamedOpening('3265533353553111').id, 'allen-third-row-gambit');
});

test('returns null for a non-opening / near-miss board', () => {
  assert.equal(matchNamedOpening('3332221'), null);   // one ply off the 3-4 line
  assert.equal(matchNamedOpening('0123456'), null);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd connect-four && node --test server/scripts/reason_engine/lib/namedOpenings.test.mjs`
Expected: FAIL — `Cannot find module './namedOpenings.mjs'`.

- [ ] **Step 3: Implement the helper**

```javascript
// namedOpenings.mjs
// Exact-match lookup of a movestring against the KB opening lines (up to mirror).
// Sound Tier-2 label: a match is a fact, not an inference (reason-INVARIANTS I2).
// Lines are the solver-verified worked_example movestrings from docs/knowledge-base/allen-*opening*.md.

// id -> the canonical (un-mirrored) lines that count as "this opening".
const OPENING_LINES = {
  'allen-5-4-opening':        ['333334444', '3333341'],                 // 5-4 stem + 5-1 stem
  'allen-3-4-opening':        ['3332222'],
  'allen-d3-d4-opening':      ['3332223', '3332223362', '33322233646646', '3332326433444644222'],
  'allen-candlesticks-opening': ['3333311115555', '333331111555515'],
  'allen-third-row-gambit':   ['3265533353553111'],
};

export function mirrorMovestring(movestring) {
  let out = '';
  for (const ch of movestring) out += String(6 - parseInt(ch, 10));
  return out;
}

export function matchNamedOpening(movestring) {
  const mirror = mirrorMovestring(movestring);
  for (const [id, lines] of Object.entries(OPENING_LINES)) {
    for (const line of lines) {
      if (movestring === line || mirror === line) return { id, line };
    }
  }
  return null;
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `cd connect-four && node --test server/scripts/reason_engine/lib/namedOpenings.test.mjs`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add connect-four/server/scripts/reason_engine/lib/namedOpenings.mjs connect-four/server/scripts/reason_engine/lib/namedOpenings.test.mjs
git commit -m "feat(reason): matchNamedOpening — exact KB opening-line lookup (Tier-2 label)"
```

---

### Task 2: `openingContext` evidence field in `computeReason`

Attach `openingContext` on opening-phase blunders, reusing `detectCenterDominance` (centrality) and `matchNamedOpening` (label).

**Files:**
- Modify: `connect-four/server/scripts/reason_engine/reasonEngine.mjs` (import block ~line 28–32; add the block just before the final `return out` of `computeReason`, after `out.case` is set — `computeReason` starts at line 852, `boardState` is at line 865)
- Test: `connect-four/server/tests/reasonOpeningContext.test.mjs`

**Interfaces:**
- Consumes: `detectCenterDominance({ movestring, playedCol, bestCol })` (from `connect-four/server/centerDominance.js`) → `{ bestCol, playedCol, reason } | null`; `matchNamedOpening(movestring)` (Task 1).
- Produces: `out.openingContext = { centrality?: { bestCol, playedCol, text }, namedOpening?: { id, line } }` — present only when at least one sub-field fires, only on opening blunder cases.

- [ ] **Step 1: Write the failing test** (solver-backed)

```javascript
// reasonOpeningContext.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createSolverProcess } from '../c4solver-wrapper.js';
import { computeReason } from '../scripts/reason_engine/reasonEngine.mjs';

let solver;
before(() => { solver = createSolverProcess(); });
after(() => solver.destroy());

test('empty board, edge first move: centrality evidence fires', async () => {
  // Verified: computeReason('', 0) => case win_to_lose, bestCol 3, boardState opening.
  const out = await computeReason('', 0, { solver });
  assert.equal(out.boardState, 'opening');
  assert.ok(out.openingContext, 'openingContext present on an opening blunder');
  assert.equal(out.openingContext.centrality.bestCol, 3);
  assert.equal(out.openingContext.centrality.playedCol, 0);
  assert.match(out.openingContext.centrality.text, /central|lines/i);
});

test('exact KB line carries the named-opening label', async () => {
  // 3332223362 (D3-D4 Diagram 231) with a losing reply -> opening blunder on a matched line.
  const out = await computeReason('3332223362', 3, { solver });   // col 3 is losing (only col 1 wins)
  assert.equal(out.boardState, 'opening');
  assert.ok(out.openingContext?.namedOpening, 'namedOpening present on an exact KB line');
  assert.equal(out.openingContext.namedOpening.id, 'allen-d3-d4-opening');
});

test('non-opening board carries no openingContext', async () => {
  // A deep mid-game blunder (>= 15 discs) must not get an openingContext.
  const out = await computeReason('3325331453520', 6, { solver });
  assert.notEqual(out.boardState, 'opening');
  assert.equal(out.openingContext, undefined);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd connect-four && node --test server/tests/reasonOpeningContext.test.mjs`
Expected: FAIL — `out.openingContext` is `undefined` on the first two tests.

- [ ] **Step 3: Add the import**

In `reasonEngine.mjs`, in the import block near line 28, add:

```javascript
import { detectCenterDominance } from '../../centerDominance.js';
import { matchNamedOpening } from './lib/namedOpenings.mjs';
```

- [ ] **Step 4: Attach `openingContext` before the final return of `computeReason`**

In `computeReason` (starts line 852), immediately **before the final `return out;`** (the tail return after the two halves and tie are assembled), add:

```javascript
  // ── Opening context (additive, board-findable) ────────────────────────────
  // Sound per I2: centrality is geometric; namedOpening is an exact KB-line lookup.
  // Not a causal deviation claim (that is deferred — see reason-DECISIONS D-opening).
  const isBlunderCase = out.case && out.case !== 'not_a_blunder' && out.case !== CASES.WIN_TO_SLOWER_WIN;
  if (boardState === 'opening' && isBlunderCase) {
    const cd = detectCenterDominance({ movestring, playedCol, bestCol });
    const named = matchNamedOpening(movestring);
    if (cd || named) {
      out.openingContext = {};
      if (cd) out.openingContext.centrality = { bestCol: cd.bestCol, playedCol: cd.playedCol, text: cd.reason };
      if (named) out.openingContext.namedOpening = named;
    }
  }
```

Note: `WIN_TO_SLOWER_WIN` and `not_a_blunder` return early (lines 896–898, 913) before this point, so the guard is belt-and-suspenders; keep it for clarity.

- [ ] **Step 5: Run the test and watch it pass**

Run: `cd connect-four && node --test server/tests/reasonOpeningContext.test.mjs`
Expected: PASS (3 tests). If the third test's movestring is not actually a mid-game blunder, replace it with any board of ≥ 15 discs where `bestCol !== playedCol` (confirm with `node server/scripts/reason_engine/reasonEngine.mjs <ms> <col>` that `boardState` is `mid-game`).

- [ ] **Step 6: Commit**

```bash
git add connect-four/server/scripts/reason_engine/reasonEngine.mjs connect-four/server/tests/reasonOpeningContext.test.mjs
git commit -m "feat(reason): openingContext evidence field (centrality + named-opening label)"
```

---

### Task 3: Keep `openingContext` through the narrator vector

The narrator vector (`toNarratorVector` + `pruneVector`) is what the answerer/grader sees. It must keep `openingContext` (dropping it only when empty), and must NOT leak the raw `scores` (D21, already handled).

**Files:**
- Modify: `connect-four/server/scripts/reasonNarratorVector.mjs`
- Test: `connect-four/server/scripts/reasonNarratorVector.test.mjs` (create if absent; otherwise add cases)

**Interfaces:**
- Consumes: a `computeReason` output object with `openingContext`.
- Produces: `toNarratorVector(out)` retains `out.openingContext` verbatim; `pruneVector(v)` removes `openingContext` only when it is `undefined`/empty.

- [ ] **Step 1: Read the current transform**

Run: `sed -n '1,80p' connect-four/server/scripts/reasonNarratorVector.mjs`
Confirm whether it uses an allowlist (explicit field copy) or a denylist (delete specific fields). This determines Step 3.

- [ ] **Step 2: Write the failing test**

```javascript
// reasonNarratorVector.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toNarratorVector, pruneVector } from './reasonNarratorVector.mjs';

test('openingContext survives toNarratorVector + pruneVector when present', () => {
  const out = {
    movestring: '', playedCol: 0, bestCol: 3, scores: [0,0,1,2,1,0,0], discs: 0,
    boardState: 'opening', case: 'win_to_lose',
    openingContext: { centrality: { bestCol: 3, playedCol: 0, text: 'more central...' } },
  };
  const v = pruneVector(toNarratorVector(out));
  assert.deepEqual(v.openingContext.centrality, { bestCol: 3, playedCol: 0, text: 'more central...' });
  assert.equal(v.scores, undefined, 'raw scores must be stripped (D21)');
});

test('absent openingContext is pruned, not emitted as empty', () => {
  const out = { movestring: '3325', playedCol: 5, bestCol: 1, scores: [], discs: 4, boardState: 'opening', case: 'win_to_draw' };
  const v = pruneVector(toNarratorVector(out));
  assert.equal('openingContext' in v, false);
});
```

- [ ] **Step 3: Run it and watch it fail**

Run: `cd connect-four && node --test server/scripts/reasonNarratorVector.test.mjs`
Expected: FAIL on the first test (if the transform is an allowlist that doesn't yet copy `openingContext`).

- [ ] **Step 4: Implement**

- If **allowlist**: add `openingContext` to the copied-fields list in `toNarratorVector`.
- If **denylist**: no change needed for `toNarratorVector`; ensure `pruneVector`'s empty-drop rule covers `openingContext` (drop when `undefined` or an object with no keys). Add the drop rule if pruning is field-specific.

Show the exact edit you made (the field name added to the allowlist, or the prune predicate line).

- [ ] **Step 5: Run the test and watch it pass**

Run: `cd connect-four && node --test server/scripts/reasonNarratorVector.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add connect-four/server/scripts/reasonNarratorVector.mjs connect-four/server/scripts/reasonNarratorVector.test.mjs
git commit -m "feat(reason): carry openingContext through the narrator vector"
```

---

### Task 4: Register opening predicates + emit them in coverage

`select_boards.mjs --strategy coverage` names a closed predicate universe; an engine-emitted predicate not listed is a bug (`select_boards.mjs:269–275`). Add the opening predicates and derive them from the vector during the coverage walk.

**Files:**
- Modify: `connect-four/server/scripts/select_boards.mjs` (the `REASON_UNIVERSE` array ~line 275–301; the `PROVISIONAL` set ~line 307; the per-board predicate derivation ~line 331–355)
- Modify (if a render frame is added in Task 8): `connect-four/server/scripts/renderUniverse.mjs`

**Interfaces:**
- Consumes: `openingContext` on each harvested vector.
- Produces: predicates `reason_opening_centrality` (when `openingContext.centrality` present) and `reason_opening_named_line` (when `openingContext.namedOpening` present) in the coverage universe.

- [ ] **Step 1: Add the predicate names to `REASON_UNIVERSE`**

In the `REASON_UNIVERSE` array (the block starting ~line 275, which already lists `'phase_opening', 'phase_mid-game', 'phase_closing'`), add:

```javascript
    'reason_opening_centrality', 'reason_opening_named_line',
```

- [ ] **Step 2: Mark `reason_opening_named_line` PROVISIONAL**

In the `PROVISIONAL` set (~line 307), add `'reason_opening_named_line'` (exact KB-line matches are rare and must not gate `satisfied()` — avoids the coverage rare-fill full-budget solver burn). Leave `reason_opening_centrality` REQUIRED (it fires on any early more-central-better blunder).

```javascript
  const PROVISIONAL = new Set([
    // ...existing entries...
    'reason_opening_named_line',
  ]);
```

- [ ] **Step 3: Derive the predicates from each vector during the walk**

In the per-board predicate derivation (~line 331–355, where `preds.add('phase_...')` etc. are built from the reason vector `r`), add:

```javascript
    if (r.openingContext?.centrality)   preds.add('reason_opening_centrality');
    if (r.openingContext?.namedOpening) preds.add('reason_opening_named_line');
```

- [ ] **Step 4: Verify the universe is closed (no unlisted emission)**

Run the built-in universe check by doing a short coverage dry run (small budget):

Run: `cd connect-four && node server/scripts/select_boards.mjs --strategy coverage --target 1 --max-games 40 2>&1 | tail -20`
Expected: completes without an "engine emitted predicate not in universe" error; the summary lists non-zero counts for `reason_opening_centrality` **only if** an opening blunder was harvested (Task 5 makes that reliable — for now, "no error and named predicates recognized" is the pass).

- [ ] **Step 5: Commit**

```bash
git add connect-four/server/scripts/select_boards.mjs
git commit -m "feat(reason-eval): register opening predicates in the coverage universe"
```

---

### Task 5: Opening harvest band in `select_boards.mjs`

The harvester excludes openings (`fixture` `CFG.discMin: 12 // skip opening theory`; coverage self-play rarely blunders in the opening). Add an opening band so opening blunders enter both sets.

**Files:**
- Modify: `connect-four/server/scripts/select_boards.mjs` (the `fixture` `CFG` ~line 91–102; the coverage harvest loop that filters boards by disc count)
- Modify: `connect-four/server/scripts/select_boards.mjs` header/`--help` (~line 44–58)

**Interfaces:**
- Produces: harvested boards with `discs < 15` (opening) included, so `reason_opening_centrality` fills.

- [ ] **Step 1: Add an opening lower bound to the fixture band**

In `CFG` (~line 91), change the disc window so openings are sampled. Replace `discMin: 12, // skip opening theory` with an explicit dual-band note and lower floor, e.g.:

```javascript
    discMin: 1,             // include opening theory (was 12 = "skip opening")
    discMax: 34,            // mid-game / early-closing upper band
    openingBandMax: 14,     // discs < this => the opening centrality/named bucket
    perCaseOpening: 3,      // target opening-band rows per case
```

- [ ] **Step 2: Route opening-band boards into their own quota**

In the fixture row-selection loop, add an opening bucket alongside the existing large-magnitude / parity-register buckets: a board with `discs < CFG.openingBandMax` and a non-`not_a_blunder` case counts toward `perCaseOpening`. Keep the mid-game bands' quotas unchanged (additive). Show the added bucket condition.

- [ ] **Step 3: Ensure the coverage strategy walks opening boards**

In the coverage harvest, remove/relax any `discs >= N` filter that excludes early boards, so self-play blunders at `discs < 15` are analyzed. If coverage harvests from full self-play games, opening blunders arise naturally once the disc-floor filter is dropped — confirm there is no residual `discMin` gate on the coverage path.

- [ ] **Step 4: Update `--help` / header**

In the header comment (~line 44) and any `--help` text, document the opening band: "Opening theory (discs < 15) is now sampled and drives the `reason_opening_centrality` / `reason_opening_named_line` predicates (was excluded via discMin:12)."

- [ ] **Step 5: Verify openings are harvested and the predicate fills**

Run: `cd connect-four && node server/scripts/select_boards.mjs --strategy coverage --target 2 --max-games 300 2>&1 | tail -25`
Expected: the summary shows `reason_opening_centrality` with count ≥ 1 (ideally ≥ target); `reason_opening_named_line` may remain PROVISIONAL/low. No mid-game predicate regresses to 0.

- [ ] **Step 6: Commit**

```bash
git add connect-four/server/scripts/select_boards.mjs
git commit -m "feat(reason-eval): sample opening theory (opening harvest band)"
```

---

### Task 6: Document the fields in the feature-vector glossary

The glossary is the artifact the answerer reads and the grader treats as the field contract.

**Files:**
- Modify: `docs/architecture/feature-vector-glossary.md` (add a section after §7 "parityAttribution, anchorCells, tacticTag"; the file's section headers are enumerated — insert an "## 7a. openingContext" or "## 12. openingContext" section consistent with the numbering)

**Interfaces:** none (documentation).

- [ ] **Step 1: Write the section**

Add:

```markdown
## openingContext (opening-phase blunders only)

Present only when `boardState === "opening"` (`discs < 15`) on a blunder case, and only when at least one sub-field fires. Pruned otherwise (absence is meaningful — do not infer "no opening idea" from its absence on a mid-game board).

- `openingContext.centrality` — `{ bestCol, playedCol, text }`. A **geometric, board-findable** claim: the better column sits in strictly more four-in-a-row windows than the played column. **Verify** by counting winning lines through `bestCol` vs `playedCol` on the pre-move board (`visualize_board.sh`), NOT by looking for a tactical `finalMovestring` line. This is the player-graspable reason on early boards where the true winning line is dozens of plies deep. It is additive: it may co-exist with a deep `lostResource` winning line.
- `openingContext.namedOpening` — `{ id, line }` when the pre-move movestring exactly matches a KB opening line (up to mirror). This is a **label, not a causal claim**: it names the opening the position is on, not "you deviated from it and that lost." Do not grade it as a mechanism. `id` is a `docs/knowledge-base/allen-*opening*.md` slug.

**Not present:** any "you left opening X, the plan was Y" causal field — deferred as unsound (reason-DECISIONS D-opening).
```

- [ ] **Step 2: Commit**

```bash
git add docs/architecture/feature-vector-glossary.md
git commit -m "docs(reason): glossary — openingContext fields"
```

---

### Task 7: Teach the grader the opening case

`grade-fv-sufficiency` verifies claims on the board. It must know that a centrality claim is verified by counting lines (not by tracing a `finalMovestring`), and that a `namedOpening` label is not a fabricated mechanism.

**Files:**
- Modify: `.claude/skills/grade-fv-sufficiency/SKILL.md`

**Interfaces:** none (skill prose).

- [ ] **Step 1: Add opening-case guidance**

In the "How to grade" / A3–A4 area, add a short subsection:

```markdown
### Opening-phase cases (`openingContext` present)

- A `openingContext.centrality` claim ("the better column sits in more four-in-a-row lines") is verified **geometrically**: on the pre-move board (`visualize_board.sh <movestring>`), the better column participates in more winning windows than the played column. Do **NOT** expect or require a tactical `finalMovestring` line for this claim — on early boards the true winning line is dozens of plies deep and legitimately absent. A correct centrality claim with no named tactic is **A3/A4 pass**, not `vector_error`.
- A `openingContext.namedOpening` label ("this is the 5-4 opening") is a **lookup label**, not a mechanism. It is A4-passing if the movestring matches the KB line; it must NOT be graded as a causal "the deviation lost" claim (there is none).
- Add `openingContext.centrality` and `openingContext.namedOpening` to the field names you may cite in `unsure_about` attributions.
```

- [ ] **Step 2: Commit**

```bash
git add .claude/skills/grade-fv-sufficiency/SKILL.md
git commit -m "docs(reason): grade-fv-sufficiency — opening-case grading guidance"
```

---

### Task 8: Ground the opening reason in the production prompt

Feed `openingContext` into the production deep-reveal prompt, reusing the existing `centerDominance` wiring; add the named-opening label as context; ensure condition-D `render_decision` covers opening cases.

**Files:**
- Modify: `connect-four/server/explainContext.js` (`centerDominance` block at lines 944–961; `prompt_data` at ~line 1051)
- Modify: `connect-four/server/llmCoachHelpers.js` (the `centerDominanceSection` push ~line 692 and the instruction ~line 835)
- Modify (only if a new frame is needed): `connect-four/server/scripts/reason_engine/causalLinks.mjs`
- Test: `connect-four/server/explainContext.opening.test.mjs` (create; model on existing explainContext tests)

**Interfaces:**
- Consumes: the shared `detectCenterDominance` result (already computed at `explainContext.js:954`) and `matchNamedOpening(movestring)`.
- Produces: a `namedOpening` label surfaced in `prompt_data` and, when present, appended to the `centerDominanceSection` text; no change to non-opening behaviour.

- [ ] **Step 1: Write the failing test**

```javascript
// explainContext.opening.test.mjs — assert prompt_data carries the named-opening label on a KB line.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildExplainContext } from './explainContext.js';
// Use the module's existing test harness/fixture pattern for buildExplainContext.
// On movestring '3332223362', playedCol 3 (a losing reply on the D3-D4 Diagram-231 board):
test('named-opening label reaches prompt_data on an exact KB line', async () => {
  const ctx = await /* existing helper to build context */ buildExplainContextForTest('3332223362', 3);
  assert.equal(ctx.prompt_data.namedOpening?.id, 'allen-d3-d4-opening');
});
```

(Adapt the harness call to the project's existing `explainContext` test pattern — read a sibling `explainContext*.test.*` first.)

- [ ] **Step 2: Run it and watch it fail**

Run: `cd connect-four && node --test server/explainContext.opening.test.mjs`
Expected: FAIL — `ctx.prompt_data.namedOpening` is `undefined`.

- [ ] **Step 3: Wire the label in `explainContext.js`**

Add the import `import { matchNamedOpening } from './scripts/reason_engine/lib/namedOpenings.mjs';`. In the center-dominance block (944–961), after computing `cd`, compute `const named = matchNamedOpening(movestring);` and:
- when `named`, append a short "This position is on the <name>." clause to `centerDominanceSection` (only when the section is being emitted — keep the existing gate);
- set `centerDominanceData = { reason: cd?.reason, namedOpening: named || undefined }`;
- in the `prompt_data` object (~line 1051) add `namedOpening: named || null` (alongside the existing `centerDominance:` line).

- [ ] **Step 4: Reaffirm the anti-fabrication instruction in `llmCoachHelpers.js`**

At the instruction near line 835, extend the existing `centerDominanceSection` conditional clause so that, when a named opening is present, the model **may state the opening's name as context** but must still ground the "why it's stronger" on centrality — and must not invent a tactic. Keep the existing "do not invent a pattern / claim a threat" text.

- [ ] **Step 5: Condition-D render_decision for opening cases**

Confirm whether opening cases route through an existing causal frame. Run the render pipeline on an opening board:

Run: `cd connect-four && node server/scripts/compute.mjs --llm --condition D --n 1 --model <model> --filter <opening board id>` (or the project's standard condition-D invocation) and inspect that a `render_decision` is emitted.
- **IF** an existing "why the better move is stronger" frame already covers centrality → reuse it, add nothing to `causalLinks.mjs`.
- **IF NOT** (the board is unroutable / no frame) → add a minimal `centrality` causal frame in `causalLinks.mjs` with a `guardrail` ("do not claim the played move caused a tactical loss; the reason is positional/centrality") and a `covers` list; union its predicate into `renderUniverse.mjs` `RENDER_UNIVERSE` (and re-run Task 4 Step 4).

Record which branch held in the commit message.

- [ ] **Step 6: Run the test and watch it pass; verify no non-opening regression**

Run: `cd connect-four && node --test server/explainContext.opening.test.mjs`
Expected: PASS.
Run the existing explainContext test suite: `cd connect-four && node --test server/explainContext*.test.*`
Expected: still PASS (the opening section stays gated to opening + no-structure/no-threat-row boards).

- [ ] **Step 7: Commit**

```bash
git add connect-four/server/explainContext.js connect-four/server/llmCoachHelpers.js connect-four/server/explainContext.opening.test.mjs
# add causalLinks.mjs + renderUniverse.mjs only if Step 5 took the "new frame" branch
git commit -m "feat(coach): ground opening reason — centrality + named-opening label in the prompt"
```

---

### Task 9: Decisions log + evidence doc

Record the sound-slice decision and the deferral, and the validated opening boards, in the authoritative reason docs.

**Files:**
- Modify: `docs/architecture/reason-DECISIONS.md` (append a new D-entry)
- Modify: `docs/architecture/blunder-reason-evidence.md` (add an "opening evidence" subsection)

**Interfaces:** none (documentation).

- [ ] **Step 1: Append the decision (reason-DECISIONS.md)**

```markdown
## D-opening — opening reason is centrality + exact-label; general causal reason deferred

The reason engine explains opening blunders with an additive `openingContext`:
`centrality` (reuses `centerDominance`; geometric, board-findable — I2-safe) and an
optional `namedOpening` **label** set only on an exact KB-line match (a lookup, not an
inference). A **general** "you deviated from opening X, the plan was Y" causal reason is
**deferred as unsound**: a deviation from a named line is often not a blunder, and
attributing a score drop to "leaving the opening" is not solver-verifiable (I0/I2/I12).
Openings were previously excluded from the eval (`select_boards` discMin:12); they are now
sampled (opening harvest band) and covered by `reason_opening_centrality` /
`reason_opening_named_line`.
```

- [ ] **Step 2: Add the evidence subsection (blunder-reason-evidence.md)**

Add an "Opening evidence" subsection listing the validated boards: `""`/`3333` (edge first move → win_to_lose, centrality fires), `3332223362` (D3-D4 Diagram 231, named label), and the KB opening lines the matcher recognizes. Note the field is additive and pruned off non-opening boards.

- [ ] **Step 3: Commit**

```bash
git add docs/architecture/reason-DECISIONS.md docs/architecture/blunder-reason-evidence.md
git commit -m "docs(reason): D-opening decision + opening evidence subsection"
```

---

### Task 10: I12 case-space validation

Validate the field through the **production** `computeReason` with a counterexample per opening sub-case (not a hand proxy).

**Files:**
- Test: `connect-four/server/tests/reasonOpeningContext.caseSpace.test.mjs`

- [ ] **Step 1: Write the case-space test**

```javascript
// reasonOpeningContext.caseSpace.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createSolverProcess } from '../c4solver-wrapper.js';
import { computeReason } from '../scripts/reason_engine/reasonEngine.mjs';

let solver;
before(() => { solver = createSolverProcess(); });
after(() => solver.destroy());

// One counterexample per opening sub-case, run through the production engine.
const cases = [
  { name: 'win_to_lose off-centre',      ms: '',            col: 0, wantCentrality: true,  wantNamed: false },
  { name: 'named line (D3-D4) losing',   ms: '3332223362',  col: 3, wantCentrality: false, wantNamed: true  },
  { name: 'unmatched opening blunder',   ms: '334',         col: 6, wantCentrality: null,  wantNamed: false },
];

for (const c of cases) {
  test(`opening sub-case: ${c.name}`, async () => {
    const out = await computeReason(c.ms, c.col, { solver });
    assert.equal(out.boardState, 'opening');
    if (c.wantNamed) assert.ok(out.openingContext?.namedOpening);
    else assert.ok(!out.openingContext?.namedOpening);
    if (c.wantCentrality === true) assert.ok(out.openingContext?.centrality);
    if (c.wantCentrality === false) {
      // centrality may or may not fire; the assertion under test is the named label.
    }
    // No fabrication: if centrality present, its columns match the decision board.
    if (out.openingContext?.centrality) {
      assert.equal(out.openingContext.centrality.bestCol, out.bestCol);
      assert.equal(out.openingContext.centrality.playedCol, out.playedCol);
    }
  });
}
```

- [ ] **Step 2: Run it**

Run: `cd connect-four && node --test server/tests/reasonOpeningContext.caseSpace.test.mjs`
Expected: PASS. If any `ms/col` is not actually an opening blunder (e.g. `334`/`6` turns out `not_a_blunder`), replace it with a verified opening blunder found via `node server/scripts/reason_engine/reasonEngine.mjs <ms> <col>` and update the row. Every row must be confirmed against the **production** engine, not assumed.

- [ ] **Step 3: Commit**

```bash
git add connect-four/server/tests/reasonOpeningContext.caseSpace.test.mjs
git commit -m "test(reason): I12 case-space validation for openingContext"
```

---

## Self-Review

**Spec coverage (Part B stories → tasks):**
- B1 (opening-centrality evidence + named label) → Tasks 1, 2, 3.
- B2 (opening coverage in the eval harness) → Tasks 4, 5.
- B3 (glossary + grader awareness) → Tasks 6, 7.
- B4 (production prompt grounding) → Task 8.
- Documentation deliverables (§6): glossary (T6), grader skill (T7), reason-DECISIONS + evidence (T9), select_boards `--help` (T5 Step 4). ✓
- I12 validation → Task 10. ✓

**Type consistency:** `matchNamedOpening → { id, line } | null` (T1) is consumed identically in T2 and T8. `openingContext = { centrality?: { bestCol, playedCol, text }, namedOpening?: { id, line } }` is written in T2, carried in T3, derived-from in T4, documented in T6/T7, and read in T8/T10 — same shape throughout. `detectCenterDominance({ movestring, playedCol, bestCol }) → { bestCol, playedCol, reason }` matches `centerDominance.js`.

**Placeholder scan:** the only deferred-to-implementer items are (a) the narrator-vector allowlist-vs-denylist branch (T3 Step 1 reads it first, both branches specified), (b) the exact fixture movestring for the "mid-game" and "unmatched" negative tests (T2 Step 5 / T10 Step 2 give a concrete verification command to confirm/replace), and (c) the condition-D frame reuse-vs-new branch (T8 Step 5, both branches specified). These are genuine "read the code, then take the specified branch" steps, not vague placeholders.

**Open decision carried from the spec:** the exact `openingContext` nesting is now fixed by this plan (Task 2 Step 4). Pro-gating and Tier-2 inclusion are Part A / product decisions, out of this plan's scope.
