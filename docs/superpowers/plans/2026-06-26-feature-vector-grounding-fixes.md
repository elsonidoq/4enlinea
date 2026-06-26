# Feature-Vector Grounding Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the four feature-vector context blindspots the sufficiency grader found (deep-line cells read as current threats, minor/major/immediate conflation, opponent/player attribution flips, and phantom player structure surfaced in lost positions) by enriching the vector's labels and tightening the look-ahead's opponent-mistake search.

**Architecture:** Three of the four changes are pure *projection* changes in `toFeatureVector` (explainContext.js) plus glossary documentation — they attach `owner`/`severity`/`realizedOnPly` labels to cell groups without changing the underlying detectors. The fourth is a behavioral change to `selectOpponentMistakeCols` (sparseLookahead.js): restrict the opponent-mistake search to replies the opponent score ≤ 0 (a real concession), which requires threading detection depth through the look-ahead tally for `realizedOnPly`. The frozen sufficiency set is then regenerated and re-graded to confirm the fabrications drop.

**Tech Stack:** Node.js ESM, `node:test` + `node:assert/strict`, the c4solver wrapper, the existing sparse look-ahead + classifier modules.

## Global Constraints

- **Coordinates are 0-indexed in code; every `cNrM` cell string in the vector is 1-indexed for display.** Do not change cell-string format — the answerer (`explain_from_vector.mjs`) and the `grade-fv-sufficiency` grader both parse `cNrM` strings. New labels are *sibling fields*, never a change to the cell-string shape.
- **Pruning contract (glossary §6): absence = "not present".** `pruneEmpty` (explainContext.js:67) drops `null`/`''`/`0`/`false`/empty-array/empty-object and objects all of whose values are droppable. **A label must never resurrect an empty group.** Therefore: attach `owner`/`severity` to a cell group **only when its `cells` array is non-empty**; make `realizedOnPly` **1-indexed (never 0)** so it is not pruned.
- **Run tests with `npm run test:fast` inside `connect-four/`** (never `npm test` — it hangs on the real-solver suite). The look-ahead unit tests in `tests/sparseLookahead.test.js` use a fake solver and run under `test:fast`.
- **`severity` vocabulary is exactly `minor | major | immediate`.** `minor` = 2-in-window developing threat; `major` = 3-in-window latent threat whose completing cell is **not** currently playable; `immediate` = a major threat whose completing cell is **gravity-top (playable this move / win-in-one)**.
- **`owner` vocabulary is exactly `player | opponent`** (relative to `perspective`).
- **Every code change ships with its glossary edit in the same task.** The glossary (`docs/architecture/feature-vector-glossary.md`) is loaded verbatim by the answerer at runtime, so it is part of the contract under test.
- **Commit after each task** with a `feat(feature-vector):` or `fix(lookahead):` prefix; end commit messages with the `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` trailer.

---

## Background: the four findings (from the sufficiency grader)

The grader (`connect-four/server/scripts/fv_suff_answers_all_grade_report.md`) attributed Condition-A failures (8/18 cases pass) to:

1. **`lookahead.categoryExamples`/`perCategory`/`oppCategoryExamples`** surface deep-search example cells with no marker that they are far-future-line artifacts → the model states them as current-board threats (eval-0, eval-2, eval-8, eval-11). **Fix = Task 4 (`realizedOnPly`).**
2. **Threat cells carry no per-cell severity** → minor cells read as immediate wins (eval-6, eval-10, eval-29, eval-11, eval-51). **Fix = Task 3 (`severity`).**
3. **Cell lists carry no owner** → opponent threats attributed to the player and vice-versa (eval-10 j_shape folds in the mover's own square; eval-59 mislabels opponent/major cells as player-minor). **Fix = Task 2 (`owner`).**
4. **`losing_either_way` floods `categoryExamples` with player structure built down sub-optimal (still-winning) opponent lines** (eval-42: 9 phantom player categories in a position lost on every column). **Fix = Task 1 (opponent-mistake filter).**

Empirical anchor for Task 1: in `eval_set_fv_suff_frozen_vectors.jsonl`, record `eval-42` has `premove_scores [-13,-3,-13,-15,-3,-13,-13]` (player lost everywhere) yet `feature_vector.lookahead.categoryExamples` lists `double_threat`/`immediate_threat`/`figure_7`/`j_shape`/`undercut`/`overcut`/major+minor threats. After Task 1 + regeneration, `categoryExamples` for eval-42 must be empty (or near-empty).

---

## File Structure

- **`connect-four/server/sparseLookahead.js`** — Task 1 (`selectOpponentMistakeCols` sign filter) and Task 4 (thread `ply` through `recurse`/`recordWay`/the tally so `collectNovelOpportunities` can emit `realizedOnPly`).
- **`connect-four/server/explainContext.js`** — Tasks 2, 3, 4 projection: `toFeatureVector` attaches `owner`/`severity` to `patterns*` groups and `threatStats` buckets and to `lookahead` examples, and passes `realizedOnPly` through. New small helpers: `labelGroup`, `bucketSeverity`, `isGravityTop`.
- **`docs/architecture/feature-vector-glossary.md`** — §1, §4/§5.1, §5.2, §5.3 documentation for `owner`, `severity`, `realizedOnPly`.
- **`connect-four/tests/sparseLookahead.test.js`** — rewrite the 4 `selectOpponentMistakeCols` tier tests for the sign filter; add `realizedOnPly` assertions.
- **`connect-four/tests/explainContext.test.js`** (or the existing feature-vector test file — confirm name with `rg -l "toFeatureVector" connect-four/tests`) — `owner`/`severity` projection tests + prune-safety test.
- **Regeneration scripts (unchanged, just run):** `connect-four/server/scripts/run_eval.mjs --no-llm`, `explain_from_vector.mjs`, and the `grade-fv-sufficiency` skill.

> Note: `docs/superpowers/plans/` is a throwaway execution artifact (see memory `feedback_superpowers_docs_not_durable`). The durable schema documentation lives in the **glossary** — that is why every task updates it.

---

### Task 1: Restrict the opponent-mistake search to genuine concessions (score ≤ 0)

**Files:**
- Modify: `connect-four/server/sparseLookahead.js:54-84` (`selectOpponentMistakeCols`)
- Test: `connect-four/tests/sparseLookahead.test.js:6-42` (rewrite the four tier tests) + `:96-129` (verify `searchOpportunities` mistake-mode tests)

**Interfaces:**
- Consumes: `scores` (array of 7 solver scores, **opponent-to-move perspective** — positive = good for the opponent), `board` (a `Board` with `colHeights`).
- Produces: `selectOpponentMistakeCols(scores, board) → number[]` — 0-indexed opponent columns to explore; now returns **only columns whose `scores[c] <= 0`**, ranked best-first (least-bad for the opponent), whole tiers, capped by `OPPONENT_CAP`, never splitting a tie. Returns `[]` when no legal reply concedes a draw-or-loss.

- [ ] **Step 1: Read the current behavior and the consuming tests**

Run: `sed -n '40,84p' connect-four/server/sparseLookahead.js` and `sed -n '1,42p;96,129p' connect-four/tests/sparseLookahead.test.js`
Confirm `OPPONENT_CAP`, `COLS`, `ROWS` are module constants already in scope.

- [ ] **Step 2: Rewrite the four tier tests to encode the sign filter (failing first)**

Replace `connect-four/tests/sparseLookahead.test.js` lines 6-42 with:

```javascript
test('selectOpponentMistakeCols excludes replies that still win for the opponent (score > 0)', () => {
  // All scores positive → the opponent is winning on every reply → no genuine mistake to explore.
  const board = new Board('');
  const scores = [10, 9, 8, 7, 6, 5, 4];
  assert.deepEqual(selectOpponentMistakeCols(scores, board), []);
});

test('selectOpponentMistakeCols keeps only score<=0 replies, best-first, until >=3', () => {
  const board = new Board('');
  // col0 still wins (5, excluded); cols 1..6 concede (0,-1,-2,-3,-4,-6).
  const scores = [5, 0, -1, -2, -3, -4, -6];
  const got = selectOpponentMistakeCols(scores, board).sort((a, b) => a - b);
  // Candidates ranked best-first: 0(col1), -1(col2), -2(col3) → 3 reached, stop.
  assert.deepEqual(got, [1, 2, 3]);
});

test('selectOpponentMistakeCols never splits a tie tier among concessions', () => {
  const board = new Board('');
  // col0 wins (5, excluded); four 0-tier concessions (cols1-4); then -5,-6.
  const scores = [5, 0, 0, 0, 0, -5, -6];
  const got = selectOpponentMistakeCols(scores, board).sort((a, b) => a - b);
  assert.deepEqual(got, [1, 2, 3, 4]);
});

test('selectOpponentMistakeCols returns [] when <=1 legal column', () => {
  const board = new Board('');
  board.colHeights = [0, 6, 6, 6, 6, 6, 6];
  const scores = [-3, 0, 0, 0, 0, 0, 0];
  assert.deepEqual(selectOpponentMistakeCols(scores, board), []);
});

test('selectOpponentMistakeCols keeps a whole concession tie tier even past OPPONENT_CAP', () => {
  const board = new Board('');
  // col0 wins (5, excluded); five 0-tier concessions (cols1-5); col6 = -6.
  const scores = [5, 0, 0, 0, 0, 0, -6];
  const got = selectOpponentMistakeCols(scores, board).sort((a, b) => a - b);
  assert.deepEqual(got, [1, 2, 3, 4, 5]); // never-split overrides the cap
});
```

- [ ] **Step 3: Run the rewritten tests to verify they fail**

Run: `cd connect-four && npx node --test tests/sparseLookahead.test.js 2>&1 | grep -A2 selectOpponentMistakeCols`
Expected: FAIL — the current code returns positive-score middle tiers (e.g. `[1,2,3]` for `[10,9,8,7,6,5,4]`, not `[]`).

- [ ] **Step 4: Implement the sign filter**

Replace `selectOpponentMistakeCols` (sparseLookahead.js:54-84) with:

```javascript
export function selectOpponentMistakeCols(scores, board) {
  const legal = [];
  for (let c = 0; c < COLS; c++) if (board.colHeights[c] < ROWS) legal.push(c);
  if (legal.length <= 1) return [];

  // Only opponent replies that concede at least a draw (score <= 0 from the opponent's
  // to-move perspective) are real mistakes worth exploring. A still-winning sub-optimal
  // reply does NOT hand the player a genuine on-board opportunity — exploring it floods the
  // look-ahead with phantom player structure in positions the player is actually losing
  // (see the feature-vector glossary §5.3 and the sufficiency report's eval-42).
  const candidates = legal.filter((c) => scores[c] <= 0);
  if (candidates.length === 0) return [];

  // Group concessions into score tiers, best (highest score = least-bad for the opponent,
  // i.e. the most realistic slip) first.
  const byScore = new Map();
  for (const c of candidates) {
    const s = scores[c];
    if (!byScore.has(s)) byScore.set(s, []);
    byScore.get(s).push(c);
  }
  const tiers = [...byScore.entries()].sort((a, b) => b[0] - a[0]).map(([, cols]) => cols);

  // Accumulate whole tiers (best-first) until >=3 columns; never split a tie tier; a single
  // large tie tier may exceed OPPONENT_CAP rather than force an arbitrary within-tier choice.
  const selected = [];
  for (const tier of tiers) {
    if (selected.length >= 3 && selected.length + tier.length > OPPONENT_CAP) break;
    selected.push(...tier);
    if (selected.length >= 3) break;
  }
  return selected;
}
```

Also update the doc comment block at sparseLookahead.js:41-53 to describe the score≤0 semantics (replace the "Excludes the best score tier and the single worst tier" paragraph with the concession rule above).

- [ ] **Step 5: Fix the `searchOpportunities` mistake-mode tests' fake scores**

The tests at `tests/sparseLookahead.test.js:101-128` use `fakeSolver(() => [10, 5, 5, 5, 5, 5, 1])` (all positive → now yields `[]`). Change both to concession scores so mistake-mode still branches:

In `searchOpportunities tallies structures per first-opponent-reply branch` (line ~106) change the solver to:
```javascript
  const solver = fakeSolver(() => [3, 0, 0, 0, 0, 0, -3]); // cols1-5 concede (0), col0 wins, col6 worst
```
The classify hook keys on `ms[1] === '2'` (opponent reply col 2), which is still in the concession set, so the assertion `dt.branches.has(2)` holds.

In `searchOpportunities stops when call budget is exhausted` (line ~124) change to the same `[3, 0, 0, 0, 0, 0, -3]`.

- [ ] **Step 6: Audit the remaining mistake-mode `runSparseLookahead` tests**

Run: `sed -n '395,440p' connect-four/tests/sparseLookahead.test.js`
For each test that relies on `opponentMode: 'mistake'` (the pre-move-solver-error fallback at ~398 and the player-slip test at ~419): confirm its node-level fake scores include at least one `<= 0` opponent reply on the branch the assertion needs. If a test's scores are all-positive, lower the branch column(s) the assertion depends on to `0` (a draw concession). Do **not** weaken the assertion; only adjust the fake scores to keep the intended branch reachable under the new rule.

- [ ] **Step 7: Run the full look-ahead suite**

Run: `cd connect-four && npx node --test tests/sparseLookahead.test.js`
Expected: PASS (all tests).

- [ ] **Step 8: Commit**

```bash
git add connect-four/server/sparseLookahead.js connect-four/tests/sparseLookahead.test.js
git commit -m "fix(lookahead): explore only opponent concessions (score<=0) in mistake mode

Phantom player structure was surfacing in lost positions because the
opponent-mistake search explored still-winning sub-optimal replies. Restrict
it to replies that concede at least a draw. Confirmed against fv-sufficiency
eval-42 (player lost on every column yet 9 phantom player categories appeared).

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Attach `owner` (player | opponent) to every cell group

**Files:**
- Modify: `connect-four/server/explainContext.js` — `toFeatureVector` (140-197) + new helper `labelGroup` near `compactThreats` (85-96)
- Modify: `docs/architecture/feature-vector-glossary.md` — §1 (add owner to conventions), §4/§5.1, §5.2, §5.3
- Test: feature-vector test file (find with `rg -l "toFeatureVector" connect-four/tests`; if none, create `connect-four/tests/featureVector.test.js`)

**Interfaces:**
- Consumes: `promptData` with `patternsBest`/`patternsPreMove`/`patternsPostBlunder` (player perspective), `patternsOpponent` (opponent perspective), `threatStats.{pre,best,played}` buckets, `lookahead.categoryExamples` (player) + `oppCategoryExamples` (opponent).
- Produces: a feature vector where every **non-empty** cell group carries `owner: 'player' | 'opponent'`:
  - `patternsBest`/`patternsPreMove`/`patternsPostBlunder` groups → `owner: 'player'`
  - `patternsOpponent` groups → `owner: 'opponent'`
  - `threatStats.*.player*` buckets → `owner: 'player'`; `*.opponent*` buckets → `owner: 'opponent'`
  - `lookahead.categoryExamples[*]` → `owner: 'player'`; `oppCategoryExamples[*]` → `owner: 'opponent'`
  - Empty groups/buckets stay `{cells: []}` / `{count:0, cells:[]}` (no `owner`) so pruning still drops them.

- [ ] **Step 1: Confirm the test file name**

Run: `rg -l "toFeatureVector" connect-four/tests || echo "none — create connect-four/tests/featureVector.test.js"`
Use that path for all Task 2/3 tests below.

- [ ] **Step 2: Write the failing owner test**

Add to the feature-vector test file:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toFeatureVector } from '../server/explainContext.js';

test('owner: patternsOpponent groups labeled opponent, patternsBest labeled player', () => {
  const pd = {
    movestring: '33', perspective: 1, playedCol: 1, bestCol: 4,
    playedCell: 'c2r1', bestCell: 'c5r1',
    patternsBest: { immediate_threat: { cells: ['c4r3'] } },
    patternsOpponent: { j_shape: { cells: ['c3r3', 'c4r4'] } },
    threatStats: { pre: {}, best: {}, played: {} },
  };
  const fv = toFeatureVector(pd, { prune: true });
  assert.equal(fv.patternsBest.immediate_threat.owner, 'player');
  assert.equal(fv.patternsOpponent.j_shape.owner, 'opponent');
});

test('owner: empty pattern groups are pruned, not labeled', () => {
  const pd = {
    movestring: '33', perspective: 1, playedCol: 1, bestCol: 4,
    playedCell: 'c2r1', bestCell: 'c5r1',
    patternsBest: { immediate_threat: { cells: [] } },
    threatStats: { pre: {}, best: {}, played: {} },
  };
  const fv = toFeatureVector(pd, { prune: true });
  assert.equal(fv.patternsBest, undefined, 'all-empty patternsBest pruned away');
});
```

- [ ] **Step 3: Run to verify failure**

Run: `cd connect-four && npx node --test tests/featureVector.test.js 2>&1 | grep -A2 owner`
Expected: FAIL — `owner` is `undefined`.

- [ ] **Step 4: Add the `labelGroup` helper**

In explainContext.js, just below `compactThreats` (after line 96), add:

```javascript
// Attach provenance labels to a cell group WITHOUT defeating the prune contract: a group
// with no cells stays a bare {cells: []} (so pruneEmpty still drops it); a non-empty group
// gains `owner` (and `severity` when provided). `extra` carries severity / realizedOnPly.
function labelGroup(group, owner, severity) {
  const cells = group?.cells ?? [];
  if (cells.length === 0) return { cells: [] };
  const out = { cells, owner };
  if (severity) out.severity = severity;
  return out;
}

// Map a serialized pattern map ({tag → {cells}}) to a labeled one, stamping each non-empty
// group with `owner` (and a per-tag `severity` from patternSeverity, Task 3).
function labelPatternMap(patternMap, owner) {
  if (!patternMap) return patternMap;
  const out = {};
  for (const [tag, value] of Object.entries(patternMap)) {
    out[tag] = labelGroup(value, owner, patternSeverity(tag));
  }
  return out;
}
```

> `patternSeverity` is defined in Task 3. Implement Task 2 and Task 3 in sequence in the same file; if executing Task 2 alone, temporarily define `function patternSeverity() { return undefined; }` and replace it in Task 3.

- [ ] **Step 5: Wire `labelPatternMap` into `toFeatureVector`**

Replace the four `stripThreatDupeTags(...)` lines (explainContext.js:166-169) with:

```javascript
    patternsBest:        labelPatternMap(stripThreatDupeTags(promptData.patternsBest), 'player'),
    patternsPreMove:     labelPatternMap(stripThreatDupeTags(promptData.patternsPreMove), 'player'),
    patternsPostBlunder: labelPatternMap(stripThreatDupeTags(promptData.patternsPostBlunder), 'player'),
    patternsOpponent:    labelPatternMap(stripThreatDupeTags(promptData.patternsOpponent), 'opponent'),
```

- [ ] **Step 6: Add `owner` to threatStats buckets and lookahead examples**

In `compactThreats` (explainContext.js:85-96), label each bucket. Replace the `return {...}` with buckets built via a local helper:

```javascript
function compactThreats(s) {
  if (!s) return null;
  const player   = (count, cells) => (cells?.length ? { count: count ?? 0, cells, owner: 'player' }   : { count: count ?? 0, cells: cells ?? [] });
  const opponent = (count, cells) => (cells?.length ? { count: count ?? 0, cells, owner: 'opponent' } : { count: count ?? 0, cells: cells ?? [] });
  const pmajP = s.playerMajorParityAligned   ?? { count: 0, cells: [] };
  const pmajN = s.playerMajorNonParity        ?? { count: 0, cells: [] };
  const omajP = s.opponentMajorParityAligned ?? { count: 0, cells: [] };
  const omajN = s.opponentMajorNonParity      ?? { count: 0, cells: [] };
  return {
    playerMajorParityAligned:   player(pmajP.count, pmajP.cells),
    playerMajorNonParity:       player(pmajN.count, pmajN.cells),
    playerMinor:                player(s.playerMinor, s.playerMinorCells),
    opponentMajorParityAligned: opponent(omajP.count, omajP.cells),
    opponentMajorNonParity:     opponent(omajN.count, omajN.cells),
    opponentMinor:              opponent(s.opponentMinor, s.opponentMinorCells),
  };
}
```

In `toFeatureVector`'s `lookahead` block (183-194), add owner to the example arrays:

```javascript
      categoryExamples: (la.categoryExamples ?? []).map((e) => ({ ...e, owner: 'player' })),
      oppCategoryExamples: (la.oppCategoryExamples ?? []).map((e) => ({ ...e, owner: 'opponent' })),
```

- [ ] **Step 7: Run the owner tests**

Run: `cd connect-four && npx node --test tests/featureVector.test.js 2>&1 | grep -A2 owner`
Expected: PASS.

- [ ] **Step 8: Update the glossary for `owner`**

In `docs/architecture/feature-vector-glossary.md`:
- §1 "Global conventions", after the "two players" bullet, add:
  > - **`owner` on cell groups.** Every non-empty `cells`/`ways` group carries `owner: "player"` (yours) or `owner: "opponent"`. Trust it literally — never re-attribute a cell to the other side. An absent `owner` only ever co-occurs with an empty group (pruned away).
- §4 intro: change `{ <patternTag>: { cells: [<cNrM>, ...] } }` to `{ <patternTag>: { cells: [<cNrM>, ...], owner } }` and note `patterns*Best/PreMove/PostBlunder` are `owner:"player"`, `patternsOpponent` is `owner:"opponent"`.
- §5.2: note each non-empty bucket carries `owner` matching its `player*`/`opponent*` name.
- §5.3 `categoryExamples`/`oppCategoryExamples` table: add an `owner` row (`player` / `opponent`).

- [ ] **Step 9: Commit**

```bash
git add connect-four/server/explainContext.js connect-four/tests/featureVector.test.js docs/architecture/feature-vector-glossary.md
git commit -m "feat(feature-vector): label every cell group with owner (player|opponent)

Prevents the answerer flipping opponent threats to the player and vice-versa
(fv-sufficiency eval-10/eval-59). Labels are attached only to non-empty groups
so the prune contract (absence = not present) is preserved.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Attach per-cell `severity` (minor | major | immediate)

**Files:**
- Modify: `connect-four/server/explainContext.js` — add `patternSeverity`, `bucketSeverity`, `isGravityTop`; wire severity into `labelPatternMap` (already calls `patternSeverity`), `compactThreats`, and the lookahead examples
- Modify: `docs/architecture/feature-vector-glossary.md` — §1, §4, §5.2, §5.3
- Test: feature-vector test file

**Interfaces:**
- Consumes: pattern tags, threatStats bucket names, lookahead example `tag`s, and (for the gravity-top check) the snapshot board's `colHeights`.
- Produces: `severity ∈ {minor, major, immediate}` on every **non-empty** labeled group:
  - `patterns*.immediate_threat` → `immediate`; `patterns*.double_threat` → `immediate`; structural tactical tags (`figure_7`, `j_shape`, `undercut`, `overcut`, `forced_block`, `forced_win`, `z_threat`, `claimeven`, `odd_even_threat`, `forbidden_columns`) → **no `severity`** (the tag names the structure; severity is a threat-window notion only).
  - `threatStats` major buckets → `major`, **relabeled to `immediate` per cell if that cell is gravity-top on the snapshot board**; minor buckets → `minor`.
  - `lookahead` example entries: `immediate_threat`/`double_threat` → `immediate`; `major_threat_parity`/`major_threat_nonparity` → `major`; `minor_threat` → `minor`; structural tags → no `severity`.

- [ ] **Step 1: Write the failing severity tests**

Add to the feature-vector test file:

```javascript
test('severity: immediate_threat pattern is immediate, minor bucket is minor', () => {
  const pd = {
    movestring: '3434', perspective: 1, playedCol: 1, bestCol: 4,
    playedCell: 'c2r1', bestCell: 'c5r1',
    patternsBest: { immediate_threat: { cells: ['c5r2'] } },
    threatStats: {
      pre: {},
      best: { playerMinor: 2, playerMinorCells: ['c1r1', 'c7r1'] },
      played: {},
    },
  };
  const fv = toFeatureVector(pd, { prune: true });
  assert.equal(fv.patternsBest.immediate_threat.severity, 'immediate');
  assert.equal(fv.threatStats.best.playerMinor.severity, 'minor');
  assert.equal(fv.threatStats.best.playerMinor.owner, 'player');
});

test('severity: structural tags (j_shape) carry owner but no severity', () => {
  const pd = {
    movestring: '33', perspective: 1, playedCol: 1, bestCol: 4,
    playedCell: 'c2r1', bestCell: 'c5r1',
    patternsOpponent: { j_shape: { cells: ['c3r3', 'c4r4'] } },
    threatStats: { pre: {}, best: {}, played: {} },
  };
  const fv = toFeatureVector(pd, { prune: true });
  assert.equal(fv.patternsOpponent.j_shape.owner, 'opponent');
  assert.equal(fv.patternsOpponent.j_shape.severity, undefined);
});

test('severity: lookahead major_threat example labeled major, minor labeled minor', () => {
  const pd = {
    movestring: '3434', perspective: 1, playedCol: 1, bestCol: 4,
    playedCell: 'c2r1', bestCell: 'c5r1',
    threatStats: { pre: {}, best: {}, played: {} },
    lookahead: {
      case: 3,
      categoryExamples: [
        { tag: 'major_threat_parity', ways: [['c4r3']], novelInstances: 1 },
        { tag: 'minor_threat', ways: [['c1r1']], novelInstances: 1 },
      ],
      oppCategoryExamples: [],
      tallyComparison: [],
    },
  };
  const fv = toFeatureVector(pd, { prune: true });
  const byTag = Object.fromEntries(fv.lookahead.categoryExamples.map((e) => [e.tag, e]));
  assert.equal(byTag.major_threat_parity.severity, 'major');
  assert.equal(byTag.major_threat_parity.owner, 'player');
  assert.equal(byTag.minor_threat.severity, 'minor');
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd connect-four && npx node --test tests/featureVector.test.js 2>&1 | grep -A2 severity`
Expected: FAIL — `severity` undefined (and `patternSeverity` may be the Task-2 stub returning `undefined`).

- [ ] **Step 3: Add the severity helpers**

In explainContext.js, near the top of the helpers region (after the constants, before `toFeatureVector`), add. First confirm the `Board` import exists: `rg -n "from './classifier.js'|require\\('./classifier" connect-four/server/explainContext.js`. If `Board` is not imported, add it to the existing classifier import.

```javascript
// Severity vocabulary for threat-window cells: minor (2-in-window), major (3-in-window
// latent, not playable now), immediate (major whose completing cell is gravity-top — a
// win this move). Structural tactical tags name a SHAPE, not a threat window, so they
// carry no severity (the tag is the meaning).
const IMMEDIATE_TAGS = new Set(['immediate_threat', 'double_threat']);
const MAJOR_TAGS = new Set(['major_threat_parity', 'major_threat_nonparity']);
const MINOR_TAGS = new Set(['minor_threat']);

// Severity for a pattern-map / lookahead tag. Returns undefined for structural tags.
function patternSeverity(tag) {
  if (IMMEDIATE_TAGS.has(tag)) return 'immediate';
  if (MAJOR_TAGS.has(tag)) return 'major';
  if (MINOR_TAGS.has(tag)) return 'minor';
  return undefined;
}

// True when cell string `cNrM` is the next square gravity will fill in its column on a board
// with the given 0-indexed `colHeights` (i.e. playing that column lands exactly there).
function isGravityTop(cellStr, colHeights) {
  const m = /^c(\d)r(\d)$/.exec(cellStr);
  if (!m) return false;
  const col0 = Number(m[1]) - 1;
  const row0 = Number(m[2]) - 1;
  return colHeights[col0] === row0;
}

// Severity for a threatStats MAJOR bucket cell: immediate if the cell is gravity-top on the
// snapshot board, else major. (In practice the pipeline already routes gravity-top majors to
// patterns.immediate_threat, so this almost always returns 'major' — but computing it keeps
// the label faithful to the gravity-top definition.)
function majorCellSeverity(cellStr, colHeights) {
  return isGravityTop(cellStr, colHeights) ? 'immediate' : 'major';
}
```

- [ ] **Step 4: Make `compactThreats` severity-aware (gravity-top split for majors)**

`compactThreats` needs the snapshot's `colHeights`. Thread it in: change the signature to `compactThreats(s, colHeights)` and update its three call sites in `toFeatureVector` (171-175) to pass per-snapshot heights derived from `Board`:

```javascript
    threatStats: {
      pre:    compactThreats(promptData.threatStats?.pre,    new Board(promptData.movestring).colHeights),
      best:   compactThreats(promptData.threatStats?.best,   new Board(promptData.movestring + promptData.bestCol).colHeights),
      played: compactThreats(promptData.threatStats?.played, new Board(promptData.movestring + promptData.playedCol).colHeights),
    },
```

> Confirm `new Board(ms).colHeights` is the public shape (Task 1 tests already construct `new Board('')` and read `colHeights`). If `Board` stores heights elsewhere, adapt — but the look-ahead tests prove `colHeights` is accessible.

Inside `compactThreats`, give each **major** bucket per-cell severity. Since a bucket today is one `{count, cells}` with a single `severity`, and majors can in principle mix immediate/major cells, **split the major label by the bucket's cells** — if every cell is `major`, severity `major`; if any cell is gravity-top, that bucket's cells that are gravity-top should instead surface as immediate. To keep buckets atomic and avoid restructuring `threatStats`, apply the simplest faithful rule: **label the major bucket `immediate` iff all its cells are gravity-top, else `major`** (the mixed case is vanishingly rare because gravity-top majors are pre-routed to `patterns.immediate_threat`). Implement:

```javascript
function compactThreats(s, colHeights) {
  if (!s) return null;
  const majorSeverity = (cells) =>
    cells.length && cells.every((c) => isGravityTop(c, colHeights)) ? 'immediate' : 'major';
  const major = (count, cells, owner) =>
    (cells?.length ? { count: count ?? 0, cells, owner, severity: majorSeverity(cells) }
                   : { count: count ?? 0, cells: cells ?? [] });
  const minor = (count, cells, owner) =>
    (cells?.length ? { count: count ?? 0, cells, owner, severity: 'minor' }
                   : { count: count ?? 0, cells: cells ?? [] });
  const pmajP = s.playerMajorParityAligned   ?? { count: 0, cells: [] };
  const pmajN = s.playerMajorNonParity        ?? { count: 0, cells: [] };
  const omajP = s.opponentMajorParityAligned ?? { count: 0, cells: [] };
  const omajN = s.opponentMajorNonParity      ?? { count: 0, cells: [] };
  return {
    playerMajorParityAligned:   major(pmajP.count, pmajP.cells, 'player'),
    playerMajorNonParity:       major(pmajN.count, pmajN.cells, 'player'),
    playerMinor:                minor(s.playerMinor, s.playerMinorCells, 'player'),
    opponentMajorParityAligned: major(omajP.count, omajP.cells, 'opponent'),
    opponentMajorNonParity:     major(omajN.count, omajN.cells, 'opponent'),
    opponentMinor:              minor(s.opponentMinor, s.opponentMinorCells, 'opponent'),
  };
}
```

This supersedes the Task-2 `compactThreats` edit (owner is folded in here). If Task 2 already added the owner-only version, replace it with this.

- [ ] **Step 5: Add severity to lookahead examples**

Update the lookahead example mapping (from Task 2 step 6) to include severity:

```javascript
      categoryExamples: (la.categoryExamples ?? []).map((e) => severityTag({ ...e, owner: 'player' })),
      oppCategoryExamples: (la.oppCategoryExamples ?? []).map((e) => severityTag({ ...e, owner: 'opponent' })),
```

and add the helper near `patternSeverity`:

```javascript
// Stamp a lookahead example entry with severity derived from its tag (omit for structural tags).
function severityTag(entry) {
  const sev = patternSeverity(entry.tag);
  return sev ? { ...entry, severity: sev } : entry;
}
```

- [ ] **Step 6: Run the severity tests**

Run: `cd connect-four && npx node --test tests/featureVector.test.js 2>&1 | grep -A2 severity`
Expected: PASS.

- [ ] **Step 7: Update the glossary for `severity`**

In `docs/architecture/feature-vector-glossary.md`:
- §1 "Major vs minor threat" bullet: extend to the three-way vocabulary — add that non-empty threat groups carry `severity: "minor" | "major" | "immediate"`, where **immediate** = a major threat whose completing cell is **gravity-top (playable this move / win-in-one)**, **major** = 3-in-window latent threat **not** playable now, **minor** = 2-in-window. Structural tactical patterns (`figure_7`/`j_shape`/`undercut`/`overcut`/`forced_block`/`forced_win`/`z_threat`/`claimeven`) carry **no** `severity` — the tag names the shape.
- §4 intro: groups are `{ cells, owner, severity? }`.
- §5.2: note major buckets are `severity:"major"` (latent) and a gravity-top major surfaces as `immediate` (normally via `patterns.immediate_threat`); update the existing "Important: major buckets count latent threats only" paragraph to cross-reference the `severity` field.
- §5.3 example tables: add a `severity` row.

- [ ] **Step 8: Commit**

```bash
git add connect-four/server/explainContext.js connect-four/tests/featureVector.test.js docs/architecture/feature-vector-glossary.md
git commit -m "feat(feature-vector): per-cell severity (minor|major|immediate)

Stops the answerer reading minor cells as immediate wins (fv-sufficiency
eval-6/10/29/51). immediate = gravity-top playable-now; major = latent;
minor = 2-window. Structural tactical tags carry no severity.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Add `realizedOnPly` to look-ahead example cells

**Files:**
- Modify: `connect-four/server/sparseLookahead.js` — `recordWay` (153-160), `searchOpportunities.recurse` (188-240), `collectNovelOpportunities` (283-298)
- Modify: `connect-four/server/explainContext.js` — pass `realizedOnPly` through in the lookahead example mapping
- Modify: `docs/architecture/feature-vector-glossary.md` — §5.3 `ways` shape
- Test: `connect-four/tests/sparseLookahead.test.js`

**Interfaces:**
- Consumes: the look-ahead recursion's depth (`pliesLeft` vs `depth`).
- Produces: each `ways` entry becomes `{ cells: [<cNrM>...], realizedOnPly: <int ≥ 1> }`, where `realizedOnPly` = plies from the **pre-move decision board** at which the structure first appears (the candidate move itself is ply 1; deeper detections are 2, 3, …). The minimum ply across detection nodes is kept. `collectNovelOpportunities` carries it onto each surfaced way; `categoryExamples`/`oppCategoryExamples` in the vector expose it.

- [ ] **Step 1: Write the failing realizedOnPly test**

Add to `tests/sparseLookahead.test.js`:

```javascript
test('collectNovelOpportunities carries realizedOnPly (>=1, minimum across nodes)', async () => {
  const { searchOpportunities, collectNovelOpportunities } = await import('../server/sparseLookahead.js');
  // Concession scores so mistake mode branches; classify reports a structure only at the
  // player node one ply into the best line (realizedOnPly should be 2: candidate move = ply 1,
  // then the opponent concession reply, then the player node — first PLAYER detection node).
  const solver = fakeSolver(() => [3, 0, 0, 0, 0, 0, -3]);
  const classifyFn = async (ms) => (ms.length >= 3 ? new Map([['minor_threat', { cells: ['c4r3'] }]]) : new Map());
  const best = await searchOpportunities('3', 1, { solver, classifyFn }, { calls: 20 }, 3);
  const novel = collectNovelOpportunities(best, new Map());
  const mt = novel.find((n) => n.tag === 'minor_threat');
  assert.ok(mt, 'minor_threat surfaced');
  assert.ok(mt.ways.every((w) => Number.isInteger(w.realizedOnPly) && w.realizedOnPly >= 1), 'each way has realizedOnPly >= 1');
});
```

> The exact `realizedOnPly` value depends on the root depth bookkeeping; assert the invariant (`>= 1`, integer) rather than a brittle exact number. Adjust the classify trigger if the structure does not surface, but keep the invariant assertion.

- [ ] **Step 2: Run to verify failure**

Run: `cd connect-four && npx node --test tests/sparseLookahead.test.js 2>&1 | grep -A2 realizedOnPly`
Expected: FAIL — `ways` entries are bare cell arrays (`w.realizedOnPly` undefined).

- [ ] **Step 3: Thread ply through the tally**

In `searchOpportunities` (sparseLookahead.js:177), compute the ply at each player-detection node and pass it to `recordWay`. The recursion is seeded `recurse(rootMovestring, null, depth)`; a node's ply-from-pre-move = `1 + (depth - pliesLeft)` (root = ply 1). Change the player-branch detection loop (218-226) to compute and pass `ply`:

```javascript
    } else {
      // Player to move: detect structures here, then continue down best lines.
      if (budget.calls > 0) {
        budget.calls -= 1;
        const ply = 1 + (depth - pliesLeft); // plies from the pre-move board (root = 1)
        const map = await classifyPatternWithTimeout(classifyFn, ms, perspective, solver);
        for (const { tag, cells } of extractLookaheadStructures(map)) {
          if (THREAT_TAGS.has(tag)) {
            for (const cell of cells) recordWay(tally, tag, firstReply, [cell], ply);
          } else {
            recordWay(tally, tag, firstReply, cells, ply);
          }
        }
      }
      ...unchanged...
    }
```

- [ ] **Step 4: Store the minimum ply per way in `recordWay`**

Replace `recordWay` (153-160) with a ply-tracking version. Ways become `{ cells, ply }`:

```javascript
function recordWay(tally, tag, firstReply, cells, ply) {
  if (!tally.has(tag)) tally.set(tag, { branches: new Set(), ways: [], occurrences: 0 });
  const entry = tally.get(tag);
  entry.branches.add(firstReply);
  entry.occurrences += 1;
  const key = cells.join(',');
  const existing = entry.ways.find((w) => w.cells.join(',') === key);
  if (existing) {
    if (ply < existing.ply) existing.ply = ply; // keep the EARLIEST realization
  } else {
    entry.ways.push({ cells, ply });
  }
}
```

> This changes `entry.ways` from `string[][]` to `{cells, ply}[]`. Update the two readers below (`summarizeTallyComparison`, `collectNovelOpportunities`) accordingly in Steps 5-6. Also check `tests/sparseLookahead.test.js:90-93` (the `recordWay`-shape test) — update its assertions to `t.ways.every((w) => w.cells.length === 1)` and `t.ways[0].cells`.

- [ ] **Step 5: Update `summarizeTallyComparison`**

`summarizeTallyComparison` (250-268) reads `b.ways.length` (count) — that still works (it's an array length). No cell-content reads there, so it is unaffected. Verify by reading it; if any `.join` on a way appears, switch to `w.cells.join`.

- [ ] **Step 6: Update `collectNovelOpportunities` to emit `realizedOnPly`**

Replace `collectNovelOpportunities` (283-298) so it dedupes by `cells` and surfaces `realizedOnPly`:

```javascript
export function collectNovelOpportunities(bestTally, playedTally) {
  const out = [];
  for (const [tag, entry] of bestTally) {
    const playedEntry = playedTally.get(tag);
    const playedWayKeys = new Set((playedEntry?.ways ?? []).map((w) => w.cells.join(',')));
    const novelWays = entry.ways.filter((w) => !playedWayKeys.has(w.cells.join(',')));
    if (novelWays.length === 0) continue;
    out.push({
      tag,
      ways: novelWays.slice(0, MAX_WAYS).map((w) => ({ cells: w.cells, realizedOnPly: w.ply })),
      novelInstances: novelWays.length,
    });
  }
  out.sort((a, b) => priorityIndex(a.tag) - priorityIndex(b.tag) || (a.tag < b.tag ? -1 : 1));
  return out;
}
```

- [ ] **Step 7: Update `compareOpportunities` / `buildAliasOutput` for the new way shape**

`compareOpportunities` (305-310) calls `collectNovelOpportunities` then returns `{ tag, ways: top.ways }` — `top.ways` are now `{cells, realizedOnPly}`. `buildAliasOutput` (329-342) does `winner.ways.forEach((cells, i) => ... cells.join(','))`. Update it to read `.cells`:

```javascript
  winner.ways.forEach((way, i) => {
    aliasMap[`${prefix}-${winner.tag}-${i + 1}`] = 'cells:' + way.cells.join(',');
    for (const c of way.cells) allCells.add(c);
  });
```

- [ ] **Step 8: Pass `realizedOnPly` through `toFeatureVector`**

The Task-2/3 lookahead mapping spreads the whole entry (`{ ...e }`), and `collectNovelOpportunities` now puts `realizedOnPly` on each `ways` member (not the entry). No change needed if `categoryExamples` entries already carry `ways: [{cells, realizedOnPly}]` — verify the spread preserves nested `ways`. Add a feature-vector test:

```javascript
test('feature vector lookahead ways carry realizedOnPly', () => {
  const pd = {
    movestring: '3434', perspective: 1, playedCol: 1, bestCol: 4,
    playedCell: 'c2r1', bestCell: 'c5r1',
    threatStats: { pre: {}, best: {}, played: {} },
    lookahead: {
      case: 3,
      categoryExamples: [{ tag: 'minor_threat', ways: [{ cells: ['c4r3'], realizedOnPly: 2 }], novelInstances: 1 }],
      oppCategoryExamples: [], tallyComparison: [],
    },
  };
  const fv = toFeatureVector(pd, { prune: true });
  assert.equal(fv.lookahead.categoryExamples[0].ways[0].realizedOnPly, 2);
});
```

- [ ] **Step 9: Run the look-ahead + feature-vector suites**

Run: `cd connect-four && npx node --test tests/sparseLookahead.test.js tests/featureVector.test.js`
Expected: PASS (all). Fix any remaining `.ways` shape readers the tests surface.

- [ ] **Step 10: Update the glossary for `realizedOnPly`**

In `docs/architecture/feature-vector-glossary.md` §5.3:
- Change the `ways` field description from "A list of cell-sets" to: "A list of `{ cells: [<cNrM>...], realizedOnPly }` entries. `cells` are the novel squares; **`realizedOnPly` is how many plies into the future the structure first appears** (1 = the immediate resulting board; larger = a deeper line). A high `realizedOnPly` is a *projected* future structure, **not** a threat on the current board — never describe it as already present."
- Update the §5.3 schema block and the worked-reading example (§7) if it shows `ways`.

- [ ] **Step 11: Commit**

```bash
git add connect-four/server/sparseLookahead.js connect-four/server/explainContext.js connect-four/tests/sparseLookahead.test.js connect-four/tests/featureVector.test.js docs/architecture/feature-vector-glossary.md
git commit -m "feat(feature-vector): realizedOnPly on look-ahead ways

Marks how deep each surfaced structure is so the answerer stops reading
far-future-line cells as current-board threats (fv-sufficiency eval-0/2/8/11).
realizedOnPly is 1-indexed (never 0) to survive pruning.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Regenerate the frozen set and re-grade

**Files:**
- Run (no edits): `connect-four/server/scripts/run_eval.mjs`, `explain_from_vector.mjs`, the `grade-fv-sufficiency` skill
- Inputs: `connect-four/server/scripts/eval_set_fv_suff_frozen.json` (the 18-case frozen selection — unchanged)
- Outputs: a fresh `*_frozen_vectors.jsonl`, a fresh answers jsonl, a fresh grade report

- [ ] **Step 1: Run the fast test suite end-to-end**

Run: `cd connect-four && npm run test:fast`
Expected: PASS. If anything outside Tasks 1-4 fails, it is pre-existing — confirm against `git stash`-free `main` only by inspection, do not fix unrelated failures here.

- [ ] **Step 2: Regenerate the frozen vectors**

Run (confirm the exact invocation from the file header first: `sed -n '1,30p' connect-four/server/scripts/run_eval.mjs`):
```bash
cd connect-four && node server/scripts/run_eval.mjs --no-llm \
  --input server/scripts/eval_set_fv_suff_frozen.json \
  --out server/scripts/eval_set_fv_suff_frozen_vectors.jsonl
```
Expected: 18 records written.

- [ ] **Step 3: Spot-check eval-42 lost-position fabrication source is gone**

Run:
```bash
cd connect-four && node -e "
const fs=require('fs');
const r=fs.readFileSync('server/scripts/eval_set_fv_suff_frozen_vectors.jsonl','utf8').trim().split('\n').map(JSON.parse).find(x=>x.id==='eval-42');
const la=r.feature_vector.lookahead||{};
console.log('case', la.case);
console.log('categoryExamples count', (la.categoryExamples||[]).length);
console.log('a labeled bucket', JSON.stringify(r.feature_vector.threatStats.best));
"
```
Expected: `categoryExamples count` is 0 (or sharply reduced vs. the pre-change 9); a `threatStats.best` bucket shows `owner`/`severity` when non-empty.

- [ ] **Step 4: Re-run the answerer (all three conditions)**

Run (confirm flags via `sed -n '1,40p' connect-four/server/scripts/explain_from_vector.mjs`):
```bash
cd connect-four && node server/scripts/explain_from_vector.mjs \
  --input server/scripts/eval_set_fv_suff_frozen_vectors.jsonl \
  --out server/scripts/fv_suff_answers_all_v2.jsonl \
  --n 3 --condition all
```
Expected: 162 answer rows, 0 parse/call failures.

- [ ] **Step 5: Re-grade**

Invoke the grader skill on the new files:
`/grade-fv-sufficiency connect-four/server/scripts/fv_suff_answers_all_v2.jsonl connect-four/server/scripts/eval_set_fv_suff_frozen_vectors.jsonl`

- [ ] **Step 6: Compare against the baseline report**

Open `connect-four/server/scripts/fv_suff_answers_all_v2_grade_report.md` and compare Condition-A pass count and the A3/A4 pass-rates against the baseline (`fv_suff_answers_all_grade_report.md`: A = 8/18, A3 30/54, A4 29/54). Confirm the specific fabrication cases improve: eval-0, eval-2, eval-8, eval-11 (realizedOnPly), eval-6, eval-10, eval-29, eval-51 (severity), eval-59 (owner), eval-42, eval-56 (lost-position flood). Record the new numbers in the report's summary.

- [ ] **Step 7: Commit the regenerated artifacts**

```bash
git add connect-four/server/scripts/eval_set_fv_suff_frozen_vectors.jsonl connect-four/server/scripts/fv_suff_answers_all_v2.jsonl connect-four/server/scripts/fv_suff_answers_all_v2_grade_report.md
git commit -m "chore(fv-sufficiency): regenerate frozen vectors + re-grade after grounding fixes

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- Finding 1 (deep-line cells) → Task 4 (`realizedOnPly`). ✓
- Finding 2 (severity conflation) → Task 3 (`severity`). ✓
- Finding 3 (owner flips) → Task 2 (`owner`). ✓
- Finding 4 (lost-position flood) → Task 1 (concession filter). ✓
- "Reflect in glossary" → Tasks 2 Step 8, 3 Step 7, 4 Step 10 (and Task 1's behavior is documented in glossary §5.3 via Task 4 Step 10). ✓
- Validation → Task 5. ✓

**Decisions locked (from the user):** mistake-filter on **all** mistake-mode searches at `score ≤ 0` (Task 1); `immediate` = gravity-top playable-now (Task 3, `isGravityTop`); implement all four + glossary now.

**Type consistency:** `entry.ways` changes shape (`string[][]` → `{cells, ply}[]`) in Task 4 — readers updated in the same task: `recordWay`, `summarizeTallyComparison` (length-only, safe), `collectNovelOpportunities`, `compareOpportunities`, `buildAliasOutput`, plus the `recordWay`-shape unit test. `patternSeverity` is referenced by `labelPatternMap` (Task 2) and defined in Task 3 — Task 2 ships a stub, Task 3 replaces it; if executed in order (2 → 3) the stub is overwritten before any severity test runs. `labelGroup`/`labelPatternMap` (Task 2) and `compactThreats(s, colHeights)` (Task 3) are the single owner+severity path — Task 3's `compactThreats` supersedes Task 2's owner-only version (noted in Task 3 Step 4).

**Prune safety:** every label is attached only to non-empty groups (`labelGroup`, the `cells?.length` guards in `compactThreats`), and `realizedOnPly` is ≥ 1 — so all-zero/empty groups still prune away and the glossary §6 "absence = not present" contract holds. A dedicated test (`owner: empty pattern groups are pruned, not labeled`, Task 2 Step 2) guards this.

**Open risk flagged for the executor:** the answerer (`explain_from_vector.mjs`) and the `grade-fv-sufficiency` grader are schema-agnostic (recurse + parse `cNrM` strings), so the new sibling fields do not break them — but Task 5 Step 4-5 re-runs both end-to-end to confirm. If a downstream production consumer (`buildExplainContext` callers) reads `entry.ways` as bare arrays, Task 4's shape change would surface there; grep `rg -n "\\.ways" connect-four/server connect-four/src` before Task 4 Step 11 and fix any bare-array reader.
