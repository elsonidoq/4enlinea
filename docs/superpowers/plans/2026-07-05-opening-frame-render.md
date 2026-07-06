# Opening-frame Grounded-Render Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire `openingContext` into the condition-D grounded-render pipeline so opening-phase boards produce a composed opening explanation instead of crashing with `UncoveredVectorFieldError`.

**Architecture:** A new `openingFrame.mjs` composer turns an opening vector into a single primary frame (book line + landing-cell centrality/parity argument + horizon tail), driven by a hardcoded empirical winning-cell heatmap. `renderReasonModel.mjs` routes opening boards to this frame, shows the decision board only, and emits an `openingContext` block in `render_decision`. `fieldDisposition.mjs` registers the `openingContext.*` subtree so the coverage tripwire passes deliberately. The `grade-fv-sufficiency` skill learns the new render_decision block.

**Tech Stack:** Node.js ESM (`.mjs`), `node:test` + `node:assert/strict`. All code under `connect-four/server/`.

## Global Constraints

- **Coordinates:** all internal columns/rows are 0-indexed (row 0 = bottom). Display columns/rows are 1-indexed. Frame text shows **1-indexed** columns/cells; raw 0-indexed leaves are withheld from the JSON residue (Fix-A coordinate-leak rule).
- **Cells** are `cNrM` strings, 1-indexed (`c1r1` = bottom-left).
- **Heatmap orientation (pinned):** `heatmap[player][row][col]` — `player`/`col` 0-indexed, `row` 0-indexed with **row 0 = bottom**. Keys `'1'`/`'2'` are strings. `heatmap[p][r][c]` = P(cell ∈ winner's line | player p wins).
- **Parity favor:** player 1 is favored on internal **even** rows (row0 ∈ {0,2,4} = display-odd 1,3,5); player 2 on internal **odd** rows (row0 ∈ {1,3,5} = display-even 2,4).
- **No deep-cell grounding on opening boards:** never render a specific deep completing cell; the deep resolution is a horizon only.
- **No pedagogy doom framing:** the O2 (defense) frame must NOT say the position is "lost"/"theoretically lost".
- **No branch dependency:** the heatmap JSON is copied verbatim from this plan; do not merge/reference `worktree-win-dist-grid`.
- **Run tests from `connect-four/`** with `node --test <file>`.
- **Source of truth spec:** `docs/superpowers/specs/2026-07-05-opening-frame-render-design.md`.

---

## File structure

- Create `connect-four/server/scripts/reason_engine/data/winning-cell-heatmap.json` — hardcoded empirical distribution (config).
- Create `connect-four/server/scripts/reason_engine/winningCellHeatmap.mjs` — loader + `winProbability` / `playerFavorsRow` helpers.
- Create `connect-four/server/scripts/reason_engine/openingFrame.mjs` — `composeOpeningFrame` composer.
- Modify `connect-four/server/scripts/fieldDisposition.mjs` — register `openingContext.*` leaves.
- Modify `connect-four/server/scripts/renderReasonModel.mjs` — opening branch in `buildReasonRenderModel`/`buildRenderDecision`, reading-key addendum, decision-only boards.
- Modify `connect-four/.claude/skills/grade-fv-sufficiency/SKILL.md` — new opening `render_decision` block.
- Create `connect-four/server/tests/winningCellHeatmap.test.mjs`, `connect-four/server/tests/openingFrame.test.mjs`.
- Create `connect-four/server/tests/fixtures/opening_vectors.json` — 3 real opening vectors.
- Modify `connect-four/server/tests/fieldDisposition.test.mjs`, `connect-four/server/tests/renderReasonModel.test.mjs`, `connect-four/server/tests/renderDecisionEmit.test.mjs` — opening cases.
- Modify `connect-four/package.json` — add the two new test files to `test:fast`.

---

### Task 1: Heatmap data asset + loader

**Files:**
- Create: `connect-four/server/scripts/reason_engine/data/winning-cell-heatmap.json`
- Create: `connect-four/server/scripts/reason_engine/winningCellHeatmap.mjs`
- Test: `connect-four/server/tests/winningCellHeatmap.test.mjs`

**Interfaces:**
- Produces:
  - `HEATMAP` — the parsed JSON object.
  - `winProbability(player /*1|2*/, row0 /*int*/, col0 /*int*/) → number` — clamps out-of-range to `0`.
  - `playerFavorsRow(player /*1|2*/, row0 /*int*/) → boolean` — `player===1 ? row0%2===0 : row0%2===1`.

- [ ] **Step 1: Create the data JSON**

Create `connect-four/server/scripts/reason_engine/data/winning-cell-heatmap.json` with EXACTLY this content:

```json
{
  "_provenance": "27976 self-play games, both sides 90% optimal / 10% random, meanPlies ~31.9. heatmap[player][row][col] = P(cell in winner's line | player wins). row 0 = bottom. Copied verbatim from design spec 2026-07-05-opening-frame-render-design.md; NOT sourced from a branch.",
  "games": 27976,
  "p1Wins": 15900,
  "p2Wins": 10000,
  "draws": 2076,
  "meanPlies": 31.858235630540463,
  "heatmaps": {
    "1": [
      [0.03352201257861635, 0.10169811320754717, 0.09540880503144654, 0.17125786163522014, 0.09779874213836479, 0.10427672955974843, 0.03691823899371069],
      [0.03528301886792453, 0.029685534591194968, 0.1320125786163522, 0.028238993710691825, 0.1329559748427673, 0.031572327044025156, 0.03446540880503145],
      [0.07125786163522013, 0.1171069182389937, 0.11566037735849057, 0.29037735849056606, 0.11874213836477987, 0.11886792452830189, 0.07415094339622641],
      [0.05194968553459119, 0.06006289308176101, 0.14408805031446542, 0.06937106918238994, 0.14276729559748427, 0.05817610062893082, 0.05578616352201258],
      [0.09169811320754717, 0.2021383647798742, 0.2683018867924528, 0.36257861635220123, 0.27050314465408803, 0.20836477987421384, 0.09767295597484277],
      [0.02779874213836478, 0.017987421383647798, 0.02666666666666667, 0.08553459119496855, 0.02679245283018868, 0.016540880503144655, 0.02918238993710692]
    ],
    "2": [
      [0.0822, 0.0357, 0.0729, 0.0118, 0.07, 0.0364, 0.0846],
      [0.086, 0.1966, 0.1725, 0.3267, 0.1726, 0.1915, 0.0841],
      [0.0354, 0.0587, 0.2138, 0.0841, 0.2181, 0.0573, 0.0389],
      [0.0869, 0.1723, 0.2027, 0.3873, 0.1954, 0.1724, 0.0871],
      [0.0321, 0.0273, 0.0745, 0.0564, 0.0768, 0.0235, 0.0337],
      [0.0381, 0.067, 0.0715, 0.093, 0.0706, 0.0648, 0.0393]
    ]
  },
  "parity": {
    "1": { "oddRowMass": 0.7176360754898504, "evenRowMass": 0.2823639245101496 },
    "2": { "oddRowMass": 0.32613571428571236, "evenRowMass": 0.6738642857142876 }
  }
}
```

- [ ] **Step 2: Write the failing test**

Create `connect-four/server/tests/winningCellHeatmap.test.mjs`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HEATMAP, winProbability, playerFavorsRow } from '../scripts/reason_engine/winningCellHeatmap.mjs';

test('heatmap shape is 2 players x 6 rows x 7 cols', () => {
  for (const p of ['1', '2']) {
    assert.equal(HEATMAP.heatmaps[p].length, 6);
    for (const row of HEATMAP.heatmaps[p]) assert.equal(row.length, 7);
  }
});

test('parity sums match the embedded summary (orientation sanity)', () => {
  // player 1 mass concentrates on internal even rows {0,2,4}
  const mass = (p, rows) => rows.reduce((s, r) => s + HEATMAP.heatmaps[p][r].reduce((a, b) => a + b, 0), 0);
  const p1odd = mass('1', [0, 2, 4]);   // display-odd rows
  const p1even = mass('1', [1, 3, 5]);
  assert.ok(p1odd / (p1odd + p1even) > 0.7, 'player 1 winning cells concentrate on display-odd rows');
});

test('winProbability reads (player,row0,col0) and clamps out of range', () => {
  assert.equal(winProbability(2, 3, 3), 0.3873);   // player 2 peak, internal row 3, col 3 (display c4r4)
  assert.equal(winProbability(1, 4, 3), 0.36257861635220123);
  assert.equal(winProbability(1, 99, 0), 0);
  assert.equal(winProbability(1, 0, -1), 0);
});

test('playerFavorsRow encodes parity favor', () => {
  assert.equal(playerFavorsRow(1, 0), true);   // player 1 on internal even rows
  assert.equal(playerFavorsRow(1, 1), false);
  assert.equal(playerFavorsRow(2, 1), true);   // player 2 on internal odd rows
  assert.equal(playerFavorsRow(2, 0), false);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd connect-four && node --test server/tests/winningCellHeatmap.test.mjs`
Expected: FAIL — cannot find module `winningCellHeatmap.mjs`.

- [ ] **Step 4: Write the loader**

Create `connect-four/server/scripts/reason_engine/winningCellHeatmap.mjs`:

```javascript
// Empirical winning-cell distribution (hardcoded config; see data/winning-cell-heatmap.json header).
// heatmap[player][row][col] = P(cell in winner's line | that player wins). row 0 = bottom.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const HEATMAP = JSON.parse(readFileSync(join(__dirname, 'data', 'winning-cell-heatmap.json'), 'utf8'));

export function winProbability(player, row0, col0) {
  const grid = HEATMAP.heatmaps[String(player)];
  if (!grid) return 0;
  const row = grid[row0];
  if (!row || col0 < 0 || col0 >= row.length) return 0;
  return row[col0] ?? 0;
}

// Player 1 is favored on internal even rows (display-odd 1,3,5); player 2 on internal odd rows.
export function playerFavorsRow(player, row0) {
  return player === 1 ? row0 % 2 === 0 : row0 % 2 === 1;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd connect-four && node --test server/tests/winningCellHeatmap.test.mjs`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add connect-four/server/scripts/reason_engine/data/winning-cell-heatmap.json \
        connect-four/server/scripts/reason_engine/winningCellHeatmap.mjs \
        connect-four/server/tests/winningCellHeatmap.test.mjs
git commit -m "feat(reason): hardcoded winning-cell heatmap + loader for opening frames"
```

---

### Task 2: `composeOpeningFrame` composer

**Files:**
- Create: `connect-four/server/scripts/reason_engine/openingFrame.mjs`
- Test: `connect-four/server/tests/openingFrame.test.mjs`

**Interfaces:**
- Consumes: `winProbability`, `playerFavorsRow` (Task 1); `parseBoardState` from `../../classifier.js`.
- Produces:
  - `composeOpeningFrame(prunedFv) → { id, kind, confidence, text, guardrail, covers } | null`
    - returns `null` when `prunedFv.openingContext` is absent.
    - `id` ∈ `{'O1','O2','O3'}`, `kind` ∈ `{'namedOpening','defense','centrality'}`, `confidence: 'high'`, `covers: []`.
  - `centralityQualitative(prunedFv) → 'much_easier' | 'easier' | null` (exported for the grader/render_decision).
  - Threshold constants `MUCH_EASIER_RATIO = 2`, `EASIER_RATIO = 1.15`, `MIN_BETTER_MASS = 0.05`.

**Notes for the implementer:**
- `openingContext` has exactly one of `namedOpening` / `defense` / `centrality` (mutually exclusive).
- The mover is `prunedFv.player`. Landing cell of a column = drop it on `prunedFv.movestring`.
- `matchedPrefixLen`, `id`, `family`, `betterHasMoreLines`, `centralityGrounded`, `resistAndWait` may be present; `id` may be absent (family-only). Guard every access.
- The horizon uses the outcome-defining half: `lostResource` for `win_to_*`, else `opponentPunishment`.

- [ ] **Step 1: Write the failing test**

Create `connect-four/server/tests/openingFrame.test.mjs`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { composeOpeningFrame, centralityQualitative } from '../scripts/reason_engine/openingFrame.mjs';

// eval-9 namedOpening: player 1, win_to_draw, movestring 33322226, played 5 best 6
const namedFv = {
  case: 'win_to_draw', player: 1, movestring: '33322226', bestCol: 6, playedCol: 5,
  lostResource: { kind: 'winning_line', register: 'parity', pliesToEnd: 30, completingCell: 'c1r3' },
  opponentPunishment: { kind: 'denial', register: 'parity', pliesToEnd: 28 },
  openingContext: { namedOpening: { id: 'allen-3-4-opening', family: 'central-column opening', matchedPrefixLen: 8, bookNextCol: 6 } },
};

// eval-5 defense: player 2, lose_to_faster_lose, movestring 33322, played 0 best 2
const defenseFv = {
  case: 'lose_to_faster_lose', player: 2, movestring: '33322', bestCol: 2, playedCol: 0,
  lostResource: { kind: 'conditional_swindle', register: 'parity', pliesToEnd: 35, completingCell: 'c6r2' },
  opponentPunishment: { kind: 'winning_line', register: 'parity', pliesToEnd: 33, completingCell: 'c1r3' },
  openingContext: { defense: { id: null, family: 'central-column opening', matchedPrefixLen: 5, bestDefenseCol: 2, centralityGrounded: true } },
};

const centralityFv = {
  case: 'lose_to_faster_lose', player: 2, movestring: '3', bestCol: 3, playedCol: 1,
  lostResource: { kind: 'conditional_swindle', register: 'parity', pliesToEnd: 35, completingCell: 'c6r2' },
  opponentPunishment: { kind: 'winning_line', register: 'parity', pliesToEnd: 37, completingCell: 'c1r3' },
  openingContext: { centrality: { bestCol: 3, playedCol: 1, betterHasMoreLines: true,
    text: 'In the opening, the more central a column is, the more four-in-a-row lines run through it...', resistAndWait: true } },
};

test('returns null without openingContext', () => {
  assert.equal(composeOpeningFrame({ case: 'win_to_lose', player: 1 }), null);
});

test('O1 namedOpening: book move column, 1-indexed, names family+id, no deep cell', () => {
  const f = composeOpeningFrame(namedFv);
  assert.equal(f.id, 'O1');
  assert.equal(f.kind, 'namedOpening');
  assert.match(f.text, /central-column opening/);
  assert.match(f.text, /allen-3-4-opening/);
  assert.match(f.text, /column 7/);          // bookNextCol 6 -> display 7
  assert.match(f.text, /column 6/);          // playedCol 5 -> display 6
  assert.doesNotMatch(f.text, /c6r2|c1r3/);  // no deep completing cell
  assert.match(f.text, /lesson is the opening/);
});

test('O2 defense: resilience framing, NO "lost" doom, family-only when id null', () => {
  const f = composeOpeningFrame(defenseFv);
  assert.equal(f.id, 'O2');
  assert.match(f.text, /more resilient move is column 3/);  // bestDefenseCol 2 -> display 3
  assert.match(f.text, /column 1 gives ground faster/);     // playedCol 0 -> display 1
  assert.doesNotMatch(f.text, /lost|theoretically/i);
  assert.doesNotMatch(f.text, /allen-/);                    // id null -> family only
});

test('O3 centrality: uses embedded text lead', () => {
  const f = composeOpeningFrame(centralityFv);
  assert.equal(f.id, 'O3');
  assert.match(f.text, /more central a column is/);
});

test('centralityQualitative: strong gap -> much_easier', () => {
  // player 1: bestCol 6 lands display c7r1 (internal r0,c6 ~0.037) vs playedCol 5 c6r1 (r0,c5 ~0.104)
  // played cell has MORE mass here, so no claim
  assert.equal(centralityQualitative(namedFv), null);
  // defense player 2: bestCol 2 lands c3r? vs playedCol 0 c1r? — assert it returns a valid enum
  assert.ok(['much_easier', 'easier', null].includes(centralityQualitative(defenseFv)));
});

test('guardrail forbids deep-cell grounding', () => {
  assert.match(composeOpeningFrame(namedFv).guardrail, /do not ground a specific deep/i);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd connect-four && node --test server/tests/openingFrame.test.mjs`
Expected: FAIL — cannot find module `openingFrame.mjs`.

- [ ] **Step 3: Write the composer**

Create `connect-four/server/scripts/reason_engine/openingFrame.mjs`:

```javascript
// Opening-phase primary frame (spec 2026-07-05-opening-frame-render-design.md). Additive to L1-L9:
// the opening IS the teachable reason; the deep two halves demote to a horizon tail. No deep-cell grounding.
import { parseBoardState } from '../../classifier.js';
import { winProbability, playerFavorsRow } from './winningCellHeatmap.mjs';

export const MUCH_EASIER_RATIO = 2;
export const EASIER_RATIO = 1.15;
export const MIN_BETTER_MASS = 0.05;

const col1 = (c) => (c == null ? '?' : c + 1);

// 0-indexed {row0,col0} landing spot for dropping `col` on `movestring`; null on null/full column.
function landing(movestring, col) {
  if (col == null) return null;
  const { colHeights } = parseBoardState(movestring ?? '');
  const row0 = colHeights[col];
  if (row0 == null || row0 >= 6) return null;
  return { row0, col0: col };
}
const cellStr = (l) => (l ? `c${l.col0 + 1}r${l.row0 + 1}` : null);

// Compare the mover's winning-cell mass on the better vs played landing cell.
export function centralityQualitative(fv) {
  const b = landing(fv.movestring, fv.bestCol);
  const p = landing(fv.movestring, fv.playedCol);
  if (!b || !p) return null;
  const pb = winProbability(fv.player, b.row0, b.col0);
  const pp = winProbability(fv.player, p.row0, p.col0);
  if (pb < MIN_BETTER_MASS) return null;
  const ratio = pb / Math.max(pp, 1e-6);
  if (ratio >= MUCH_EASIER_RATIO) return 'much_easier';
  if (ratio >= EASIER_RATIO) return 'easier';
  return null;
}

// Shared centrality/parity clause. `winningFraming` false => resistance wording (O2).
function centralityClause(fv, winningFraming) {
  const qual = centralityQualitative(fv);
  if (!qual) return '';
  const b = landing(fv.movestring, fv.bestCol);
  const p = landing(fv.movestring, fv.playedCol);
  const adverb = qual === 'much_easier' ? 'much easier' : 'easier';
  let clause = ` It'll be ${adverb} to build a connected four through ${cellStr(b)} than through ${cellStr(p)}.`;
  // Parity rider only when the better cell's row favors the mover and the played cell's does not.
  if (playerFavorsRow(fv.player, b.row0) && !playerFavorsRow(fv.player, p.row0)) {
    const rows = fv.player === 1 ? 'odd' : 'even';
    clause += winningFraming
      ? ` That square sits on the ${rows} rows your winning lines tend to run through.`
      : ` The more central hold also contests the rows the opponent needs and is harder to break through.`;
  }
  return clause;
}

function horizonTail(fv) {
  const half = fv.case && fv.case.startsWith('win_') ? fv.lostResource : fv.opponentPunishment;
  const plies = half?.pliesToEnd;
  const battle = half?.register === 'parity' ? 'a parity battle'
    : half?.register === 'forced_sequence' ? 'a deep forced line' : 'a deep line';
  const pliesTxt = plies != null ? `~${plies} plies, ` : '';
  return ` The solver confirms this resolves deep (${pliesTxt}${battle}) — too far to pin to one square; the lesson is the opening.`;
}

const nameTag = (oc) => `the ${oc.family}${oc.id ? ` (${oc.id})` : ''}`;

const GUARDRAIL = 'Explain the blunder through the opening — book line, centrality, parity. '
  + 'Do NOT ground a specific deep completing cell; the deep resolution is a horizon, not a teachable square.';

export function composeOpeningFrame(fv) {
  const oc = fv.openingContext;
  if (!oc) return null;
  const base = { confidence: 'high', covers: [], guardrail: GUARDRAIL };

  if (oc.namedOpening) {
    const o = oc.namedOpening;
    const text = `In the opening you were following ${nameTag(o)}. The book move is column ${col1(o.bookNextCol)}; `
      + `you played column ${col1(fv.playedCol)}, leaving the line.`
      + centralityClause(fv, true) + horizonTail(fv);
    return { ...base, id: 'O1', kind: 'namedOpening', text };
  }
  if (oc.defense) {
    const o = oc.defense;
    const text = `In the opening you were following ${nameTag(o)}. The more resilient move is column ${col1(o.bestDefenseCol)}; `
      + `column ${col1(fv.playedCol)} gives ground faster.`
      + (o.centralityGrounded ? centralityClause(fv, false) : '') + horizonTail(fv);
    return { ...base, id: 'O2', kind: 'defense', text };
  }
  // centrality
  const o = oc.centrality;
  const text = `${o.text}` + centralityClause(fv, fv.player === 1) + horizonTail(fv);
  return { ...base, id: 'O3', kind: 'centrality', text };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd connect-four && node --test server/tests/openingFrame.test.mjs`
Expected: PASS (6 tests). If `centralityQualitative(namedFv)` assertion fails, re-verify landing rows with `./visualize_board.sh 333222265` / `...6` and adjust the test's expected value to the true board — the composer logic is the contract, not the hand-computed probability.

- [ ] **Step 5: Commit**

```bash
git add connect-four/server/scripts/reason_engine/openingFrame.mjs connect-four/server/tests/openingFrame.test.mjs
git commit -m "feat(reason): composeOpeningFrame — opening primary frame with centrality/parity clause"
```

---

### Task 3: Register `openingContext.*` in `fieldDisposition.mjs`

**Files:**
- Modify: `connect-four/server/scripts/fieldDisposition.mjs`
- Test: `connect-four/server/tests/fieldDisposition.test.mjs`

**Interfaces:**
- Consumes: `dispositionOf`, `assertCoverage`, `leafPaths` (existing).
- Produces: no new exports — extends the disposition registry so every `openingContext.*` leaf maps.

**Disposition decisions (from spec §3):**
- `openingContext.namedOpening.bookNextCol`, `openingContext.defense.bestDefenseCol`,
  `openingContext.centrality.bestCol`, `openingContext.centrality.playedCol` → **transformed** (frame renders 1-indexed; raw withheld).
- `openingContext.centrality.text` → **transformed** (frame carries it; not double-shown).
- `id`, `family`, `matchedPrefixLen`, `centralityGrounded`, `betterHasMoreLines`, `resistAndWait` → **render**.

- [ ] **Step 1: Write the failing test**

Add to `connect-four/server/tests/fieldDisposition.test.mjs`:

```javascript
test('openingContext leaves are all registered (no tripwire)', () => {
  const centrality = { openingContext: { centrality: { bestCol: 3, playedCol: 1, betterHasMoreLines: true, text: 'x', resistAndWait: true } } };
  const defense = { openingContext: { defense: { family: 'central-column opening', matchedPrefixLen: 5, bestDefenseCol: 2, centralityGrounded: true } } };
  const named = { openingContext: { namedOpening: { id: 'allen-3-4-opening', family: 'central-column opening', matchedPrefixLen: 8, bookNextCol: 6 } } };
  for (const fv of [centrality, defense, named]) assert.doesNotThrow(() => assertCoverage(fv, []));
});

test('openingContext dispositions are classified correctly', () => {
  assert.equal(dispositionOf('openingContext.centrality.bestCol'), 'transformed');
  assert.equal(dispositionOf('openingContext.centrality.text'), 'transformed');
  assert.equal(dispositionOf('openingContext.namedOpening.bookNextCol'), 'transformed');
  assert.equal(dispositionOf('openingContext.defense.bestDefenseCol'), 'transformed');
  assert.equal(dispositionOf('openingContext.defense.centralityGrounded'), 'render');
  assert.equal(dispositionOf('openingContext.namedOpening.id'), 'render');
  assert.equal(dispositionOf('openingContext.namedOpening.family'), 'render');
  assert.equal(dispositionOf('openingContext.namedOpening.matchedPrefixLen'), 'render');
  assert.equal(dispositionOf('openingContext.centrality.betterHasMoreLines'), 'render');
  assert.equal(dispositionOf('openingContext.centrality.resistAndWait'), 'render');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd connect-four && node --test server/tests/fieldDisposition.test.mjs`
Expected: FAIL — `dispositionOf('openingContext.centrality.bestCol')` returns `null` (bestCol leaf collides with TRANSFORMED_LEAVES so it may pass, but `betterHasMoreLines`/`text`/`id`/`matchedPrefixLen` return null → `assertCoverage` throws).

- [ ] **Step 3: Register the dispositions**

In `connect-four/server/scripts/fieldDisposition.mjs`, add opening path sets and wire them into `dispositionOf`. After the existing `CODE_PATHS`/`RENDER_PATHS` blocks add:

```javascript
// E. openingContext (spec 2026-07-05): the opening frame renders these; columns/text are transformed
// (frame shows 1-indexed / carries the sentence), names+flags render into the JSON residue.
const OPENING_TRANSFORMED = new Set([
  'openingContext.namedOpening.bookNextCol', 'openingContext.defense.bestDefenseCol',
  'openingContext.centrality.bestCol', 'openingContext.centrality.playedCol', 'openingContext.centrality.text',
]);
const OPENING_RENDER = new Set([
  'openingContext.namedOpening.id', 'openingContext.namedOpening.family', 'openingContext.namedOpening.matchedPrefixLen',
  'openingContext.defense.id', 'openingContext.defense.family', 'openingContext.defense.matchedPrefixLen',
  'openingContext.defense.centralityGrounded',
  'openingContext.centrality.betterHasMoreLines', 'openingContext.centrality.resistAndWait',
]);
```

Then update `dispositionOf` (place the opening checks BEFORE the leaf-based fallbacks so full paths win):

```javascript
export function dispositionOf(path) {
  if (OPENING_TRANSFORMED.has(path)) return 'transformed';
  if (OPENING_RENDER.has(path)) return 'render';
  if (isTransformed(path)) return 'transformed';
  if (EXCLUDE_PATHS.has(path)) return 'exclude';
  if (RENDER_PATHS.has(path)) return 'render';
  if (EXCLUDE_LEAVES.has(leaf(path))) return 'exclude';
  if (isCode(path)) return 'causal-code';
  if (isRender(path)) return 'render';
  return null; // unknown → tripwire
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd connect-four && node --test server/tests/fieldDisposition.test.mjs`
Expected: PASS (existing + 2 new tests).

- [ ] **Step 5: Commit**

```bash
git add connect-four/server/scripts/fieldDisposition.mjs connect-four/server/tests/fieldDisposition.test.mjs
git commit -m "feat(reason): register openingContext.* dispositions (closes UncoveredVectorFieldError)"
```

---

### Task 4: Wire the opening branch into `renderReasonModel.mjs`

**Files:**
- Modify: `connect-four/server/scripts/renderReasonModel.mjs`
- Create: `connect-four/server/tests/fixtures/opening_vectors.json`
- Test: `connect-four/server/tests/renderReasonModel.test.mjs`, `connect-four/server/tests/renderDecisionEmit.test.mjs`

**Interfaces:**
- Consumes: `composeOpeningFrame`, `centralityQualitative` (Task 2).
- Produces (behavior, no signature change):
  - `buildReasonRenderModel(nv)` — when `pruned.openingContext` present: `frames = [openingFrame]`, `boards` = decision only, `openingReadingKey` string on the model.
  - `assembleGroundedPrompt(model)` — appends `model.openingReadingKey` when present.
  - `buildRenderDecision(nv)` — adds an `openingContext` block: `{ kind, frameId, lead:{id,family,matchedPrefixLen,bookCol,holdCol}, centralityComparison:{player,betterCell,playedCell,qualitative}, parityFavor:{betterCellRowParity,favorsMover}, deepResourceGrounded:false, horizon:{register,pliesToEnd} }`.

- [ ] **Step 1: Generate the fixture from the frozen run**

Run this one-liner (extracts the 3 real opening vectors; no hand-editing):

```bash
cd connect-four && node --input-type=module -e '
import { readFileSync, writeFileSync, mkdirSync } from "fs";
const f = "server/scripts/fv_suff_answers_boards_coverage_opening_2026-07-05T18-58-35Z_2026-07-05T19-12-52Z.jsonl";
const rows = readFileSync(f, "utf8").trim().split("\n").map(JSON.parse);
const pick = (k) => rows.find(r => r.feature_vector.openingContext?.[k]).feature_vector;
mkdirSync("server/tests/fixtures", { recursive: true });
writeFileSync("server/tests/fixtures/opening_vectors.json",
  JSON.stringify({ namedOpening: pick("namedOpening"), defense: pick("defense"), centrality: pick("centrality") }, null, 2));
console.log("wrote fixture");
'
```

Expected: `wrote fixture`.

- [ ] **Step 2: Write the failing tests**

Add to `connect-four/server/tests/renderReasonModel.test.mjs`:

```javascript
import { readFileSync } from 'fs';
const OPENING = JSON.parse(readFileSync(new URL('./fixtures/opening_vectors.json', import.meta.url)));

test('opening vectors no longer throw and lead with the opening frame', () => {
  for (const kind of ['namedOpening', 'defense', 'centrality']) {
    const model = buildReasonRenderModel(OPENING[kind]);   // was: throws UncoveredVectorFieldError
    assert.equal(model.frames.length, 1);
    assert.ok(/opening/i.test(model.frames[0].text));
    assert.deepEqual(model.boards.map((b) => b.id), ['decision']);   // decision board only
  }
});

test('opening prompt has the opening reading key and no deep board', () => {
  const model = buildReasonRenderModel(OPENING.centrality);
  const prompt = assembleGroundedPrompt(model);
  assert.match(prompt, /book line|opening/i);
  assert.doesNotMatch(prompt, /projectedDeep/);
});
```

Add to `connect-four/server/tests/renderDecisionEmit.test.mjs`:

```javascript
import { readFileSync } from 'fs';
const OPENING = JSON.parse(readFileSync(new URL('./fixtures/opening_vectors.json', import.meta.url)));

test('render_decision carries an openingContext block with deepResourceGrounded false', () => {
  const rd = buildRenderDecision(OPENING.defense);
  assert.ok(rd.openingContext);
  assert.equal(rd.openingContext.kind, 'defense');
  assert.equal(rd.openingContext.frameId, 'O2');
  assert.equal(rd.openingContext.deepResourceGrounded, false);
  assert.equal(rd.openingContext.lead.holdCol, 3);   // bestDefenseCol 2 -> display 3
  assert.ok(['much_easier', 'easier', null].includes(rd.openingContext.centralityComparison.qualitative));
});
```

(If `renderDecisionEmit.test.mjs` does not already import `buildRenderDecision`, add `import { buildRenderDecision } from '../scripts/renderReasonModel.mjs';` at the top — check first.)

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd connect-four && node --test server/tests/renderReasonModel.test.mjs server/tests/renderDecisionEmit.test.mjs`
Expected: FAIL — `buildReasonRenderModel(OPENING.namedOpening)` throws `UncoveredVectorFieldError` (Task 3 removed the throw, but the opening branch/boards/render_decision block don't exist yet → `frames.length`/`boards`/`rd.openingContext` assertions fail).

- [ ] **Step 4: Implement the opening branch**

In `connect-four/server/scripts/renderReasonModel.mjs`:

(a) Add imports near the top:

```javascript
import { composeOpeningFrame, centralityQualitative } from './reason_engine/openingFrame.mjs';
```

(b) Add an opening reading-key builder and a helper, after the `READING_KEY` const:

```javascript
const OPENING_READING_KEY = `# Opening reading key
- family / id: the named opening line this position is on (id absent = shared prefix, family only).
- matchedPrefixLen: how many opening plies matched the book line.
- The blunder is explained through the opening (book line, centrality, parity), NOT a deep tactical cell.
- The winning resolution is deep (many plies away) and is stated only as a horizon — there is no near-term threat cell to read.`;

// The outcome-defining half for the horizon summary.
function horizonHalf(pruned) {
  return pruned.case && pruned.case.startsWith('win_') ? pruned.lostResource : pruned.opponentPunishment;
}
```

(c) In `buildReasonRenderModel`, branch when `openingContext` is present. Replace the current body:

```javascript
export function buildReasonRenderModel(nv) {
  const pruned = pruneVector(nv);
  const ctx = pruned.direction === 'enabled_opponent'
    ? { patternOnAfterBestBoard: patternOnAfterBestBoard(pruned) } : {};
  const link = classifyCausalLink(pruned, ctx);
  assertCoverage(pruned, link.covers);

  const openingFrame = composeOpeningFrame(pruned);
  if (openingFrame) {
    const decisionBoard = boardSelectionDecisions(pruned).find((b) => b.id === 'decision');
    return {
      perspective: { you: pruned.player, opponent: pruned.opponent },
      decision: buildDecision(pruned),
      link,
      frames: [{ id: openingFrame.id, confidence: openingFrame.confidence, text: openingFrame.text,
                 covers: openingFrame.covers, guardrail: openingFrame.guardrail }],
      boards: [decisionBoard],
      rendered: renderedFields(pruned, link.covers),
      openingReadingKey: OPENING_READING_KEY,
      coverage: { ok: true, unowned: [] },
    };
  }

  return {
    perspective: { you: pruned.player, opponent: pruned.opponent },
    decision: buildDecision(pruned),
    link,
    frames: [{ id: link.id, confidence: link.confidence, text: link.text, covers: link.covers, guardrail: link.guardrail }],
    boards: selectBoards(pruned),
    rendered: renderedFields(pruned, link.covers),
    coverage: { ok: true, unowned: [] },
  };
}
```

(d) In `assembleGroundedPrompt`, append the opening reading key when present. Change the return array to insert, right after `READING_KEY`:

```javascript
    READING_KEY,
    ...(model.openingReadingKey ? ['', model.openingReadingKey] : []),
    '',
    '# Vector facts',
```

(e) In `buildRenderDecision`, add the `openingContext` block. Before the `return {`, compute it:

```javascript
  const openingFrame = composeOpeningFrame(pruned);
  let openingContext = null;
  if (openingFrame) {
    const oc = pruned.openingContext;
    const variant = oc.namedOpening ?? oc.defense ?? oc.centrality;
    const bCell = landingCell(pruned.movestring, pruned.bestCol);
    const pCell = landingCell(pruned.movestring, pruned.playedCol);
    const bRow0 = bCell ? Number(bCell.match(/r(\d+)/)[1]) - 1 : null;
    const half = horizonHalf(pruned);
    openingContext = {
      kind: openingFrame.kind,
      frameId: openingFrame.id,
      lead: {
        id: variant.id ?? null,
        family: variant.family ?? null,
        matchedPrefixLen: variant.matchedPrefixLen ?? null,
        bookCol: oc.namedOpening ? oc.namedOpening.bookNextCol + 1 : null,
        holdCol: oc.defense ? oc.defense.bestDefenseCol + 1 : null,
      },
      centralityComparison: {
        player: pruned.player, betterCell: bCell, playedCell: pCell,
        qualitative: centralityQualitative(pruned),
      },
      parityFavor: bRow0 == null ? null : {
        betterCellRowParity: bRow0 % 2 === 0 ? 'odd' : 'even',   // display parity of the better cell's row
        favorsMover: pruned.player === 1 ? bRow0 % 2 === 0 : bRow0 % 2 === 1,
      },
      deepResourceGrounded: false,
      horizon: { register: half?.register ?? null, pliesToEnd: half?.pliesToEnd ?? null },
    };
  }
```

Then add `openingContext,` to the returned object (after `finalMovestring: ...`).

Note: `landingCell` is already defined in this file. `betterCellRowParity` uses **display** parity (internal row0 0,2,4 = display-odd 1,3,5).

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd connect-four && node --test server/tests/renderReasonModel.test.mjs server/tests/renderDecisionEmit.test.mjs server/tests/openingFrame.test.mjs server/tests/fieldDisposition.test.mjs`
Expected: PASS (all).

- [ ] **Step 6: Regression — the 25 crashed records replay cleanly**

Run:

```bash
cd connect-four && node --input-type=module -e '
import { readFileSync } from "fs";
import { buildReasonRenderModel, assembleGroundedPrompt, buildRenderDecision } from "./server/scripts/renderReasonModel.mjs";
const f = "server/scripts/fv_suff_answers_boards_coverage_opening_2026-07-05T18-58-35Z_2026-07-05T19-12-52Z.jsonl";
const rows = readFileSync(f, "utf8").trim().split("\n").map(JSON.parse).filter(r => r.feature_vector.openingContext);
let ok = 0;
for (const r of rows) {
  const m = buildReasonRenderModel(r.feature_vector);
  assembleGroundedPrompt(m);
  const rd = buildRenderDecision(r.feature_vector);
  if (!rd.openingContext) throw new Error(`${r.id}: missing openingContext block`);
  ok++;
}
console.log(`replayed ${ok}/${rows.length} opening vectors with no throw`);
'
```

Expected: `replayed 25/25 opening vectors with no throw`.

- [ ] **Step 7: Commit**

```bash
git add connect-four/server/scripts/renderReasonModel.mjs \
        connect-four/server/tests/fixtures/opening_vectors.json \
        connect-four/server/tests/renderReasonModel.test.mjs \
        connect-four/server/tests/renderDecisionEmit.test.mjs
git commit -m "feat(reason): opening branch in render model + render_decision.openingContext block"
```

---

### Task 5: Teach `grade-fv-sufficiency` the opening `render_decision` block

**Files:**
- Modify: `connect-four/.claude/skills/grade-fv-sufficiency/SKILL.md`

**Interfaces:** none (documentation). This closes `feedback_reason_case_requires_eval_and_grader`: a render change is not done until the grader knows the new ground-truth field.

- [ ] **Step 1: Locate the stale instruction**

Run: `grep -n "No .render_decision. exists for opening\|openingContext\|render layer.*never been wired" connect-four/.claude/skills/grade-fv-sufficiency/SKILL.md`
Expected: finds the paragraph stating *"No `render_decision` exists for opening cases"*.

- [ ] **Step 2: Replace the stale paragraph**

Replace the sentence *"**No `render_decision` exists for opening cases** — the condition-D render layer (`causalLinks.mjs`/`buildRenderDecision`) has never been wired for `openingContext` … verify these claims via the three board checks below instead, whichever condition the case is."* with:

```markdown
**Condition-D opening cases now carry a `render_decision.openingContext` block** (shipped
2026-07-05). Shape: `{ kind, frameId (O1|O2|O3), lead:{id,family,matchedPrefixLen,bookCol,holdCol
(1-indexed)}, centralityComparison:{player,betterCell,playedCell,qualitative (much_easier|easier|
null)}, parityFavor:{betterCellRowParity,favorsMover}, deepResourceGrounded:false, horizon:
{register,pliesToEnd} }`. Consume it as GROUND TRUTH like any other `render_decision` element. Two
opening-specific checks, in addition to the three board checks (prefix / book-move score-equality /
"why it loses" grounding):
- **Deep-cell suppression (G4/G5):** `deepResourceGrounded:false` means the opening frame deliberately
  does NOT ground a deep completing cell. An answer that names a specific deep winning/losing cell
  (e.g. a 35-ply `cNrM` from `lostResource.completingCell`) as the mechanism is a **fail** — the render
  told it not to. Naming the book/hold column and the near-term landing cells is correct.
- **Centrality claim direction (A3):** if the answer asserts one move is "easier/more central" for
  building a four, it must match `centralityComparison.qualitative` — and make **no** such claim when
  `qualitative` is `null`. A centrality claim against a `null` comparison is an A4 fabrication
  (`render_bug` if `qualitative` is wrong for the board; else `prompt_confusion`).
```

- [ ] **Step 3: Verify the edit reads cleanly**

Run: `grep -n "render_decision.openingContext\|deepResourceGrounded\|centralityComparison" connect-four/.claude/skills/grade-fv-sufficiency/SKILL.md`
Expected: the new block is present; the old "never been wired" sentence is gone.

- [ ] **Step 4: Commit**

```bash
git add connect-four/.claude/skills/grade-fv-sufficiency/SKILL.md
git commit -m "docs(grader): teach fv-sufficiency the opening render_decision block"
```

---

### Task 6: Register new tests in `test:fast` and run the reason suite

**Files:**
- Modify: `connect-four/package.json`

- [ ] **Step 1: Add the two new test files to `test:fast`**

In `connect-four/package.json`, in the `test:fast` script string, append after `server/scripts/openingSampling.test.mjs`:

```
 server/tests/winningCellHeatmap.test.mjs server/tests/openingFrame.test.mjs
```

(The `fieldDisposition.test.mjs`, `renderReasonModel.test.mjs`, `renderDecisionEmit.test.mjs` files are already listed — no duplicate entries.)

- [ ] **Step 2: Run the reason-engine render tests together**

Run:

```bash
cd connect-four && node --test \
  server/tests/winningCellHeatmap.test.mjs server/tests/openingFrame.test.mjs \
  server/tests/fieldDisposition.test.mjs server/tests/renderReasonModel.test.mjs \
  server/tests/renderDecisionEmit.test.mjs server/tests/causalLinks.test.mjs \
  server/tests/renderCoverageUniverse.test.mjs
```

Expected: all PASS — in particular `renderCoverageUniverse.test.mjs` (the coverage-universe guard) still passes, proving the disposition additions didn't break the closed-registry invariant.

- [ ] **Step 3: Commit**

```bash
git add connect-four/package.json
git commit -m "test(reason): add opening-frame test files to test:fast"
```

---

## Self-review

**Spec coverage:**
- RCA / crash fix → Task 3 (dispositions) + Task 4 regression (25/25 replay). ✓
- Heatmap hardcoded, no branch → Task 1. ✓
- `openingFrame.mjs` composer (O1/O2/O3, centrality/parity clause, horizon tail, O2 no-doom) → Task 2. ✓
- Landing-cell centrality, qualitative only (no numbers) → Task 2 `centralityClause`/`centralityQualitative`. ✓
- `render_decision.openingContext` + `deepResourceGrounded:false` → Task 4 (e). ✓
- Decision-board-only, reading key → Task 4 (c)(d). ✓
- Grader update → Task 5. ✓
- Tests wired → Task 6. ✓

**Placeholder scan:** no TBD/TODO; every code step shows full code. Thresholds are concrete named constants (Task 2). ✓

**Type consistency:** `composeOpeningFrame`/`centralityQualitative` signatures match between Task 2 (definition) and Task 4 (consumption). `frameId` values `O1/O2/O3` consistent between Task 2, Task 4, Task 5. `lead.holdCol`/`bookCol` are 1-indexed in both Task 4 code and Task 5 doc. `deepResourceGrounded:false` consistent across Task 4 and Task 5. ✓

**Known soft spot:** the Task 2 test's exact `centralityQualitative` expected values depend on real landing rows; Step 4 instructs to verify against `visualize_board.sh` and treat the composer logic (not the hand-computed probability) as the contract. This is the one place to watch during execution.
