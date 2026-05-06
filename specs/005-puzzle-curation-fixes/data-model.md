# Data Model: Puzzle Curation & Classifier Fixes

## Entities

### Candidate (extended)

Existing table `public.candidates`. Two new columns added via migration 009:

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `highlight_cells` | `jsonb` | YES | Ordered array of `{col, row, role}` objects (0-indexed). `role` ∈ `'hint'` \| `'loser'` \| `'winner'` \| `'threat'` \| `'support'`. Null for legacy records → UI falls back to `deriveHighlightCol`. |
| `debug_trace` | `jsonb` | YES | Per-rollout generation metadata (see structure below). Null for legacy records → UI shows "no trace available". |

No other columns change; `status`, `classifier_tags`, `solver_scores` etc. are unchanged.

#### `highlight_cells` schema

```jsonc
// Single-move categories (Cat 1, 2, 3)
[{ "col": 3, "row": 2, "role": "hint" }]

// Cat 4 (Fork Setup)
[
  { "col": 3, "row": 2, "role": "hint" },   // setup cell
  { "col": 5, "row": 1, "role": "hint" },   // fork cell
  { "col": 1, "row": 3, "role": "hint" },   // threat cell
  { "col": 6, "row": 0, "role": "hint" }    // threat cell
]

// Cat 5 (Zugzwang) — alternating loser/winner
[
  { "col": 2, "row": 3, "role": "loser" },
  { "col": 4, "row": 2, "role": "winner" },
  { "col": 2, "row": 4, "role": "loser" },
  { "col": 4, "row": 3, "role": "winner" }
]

// Cat 6 (Parity Control)
[
  { "col": 3, "row": 4, "role": "threat" },
  { "col": 3, "row": 3, "role": "support" },
  { "col": 5, "row": 2, "role": "threat" }
]
```

#### `debug_trace` schema

```jsonc
{
  "temperature_p1": 1.23,
  "temperature_p2": 0.87,
  "termination": "win" | "draw" | "max_moves",
  "plies": [
    {
      "ply": 0,
      "player": 1,
      "scores": [3, 5, 7, 8, 7, 5, 3],
      "weights": [0.05, 0.10, 0.18, 0.34, 0.18, 0.10, 0.05],
      "sampled_col": 3
    }
    // ... one entry per ply in the rollout
  ]
}
```

### DB Migration 009

File: `connect-four/server/migrations/009_curation_fixes.sql`

```sql
ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS highlight_cells jsonb,
  ADD COLUMN IF NOT EXISTS debug_trace     jsonb;
```

No index needed on these columns (not used in WHERE clauses).

---

## State Transitions

`candidates.status` state machine is unchanged:

```
pending → approved
pending → rejected
(skip leaves status as pending — no transition)
```

---

## Shared c4solver Wrapper

New module `connect-four/server/c4solver-wrapper.js`.

### Interface

```js
// Create a persistent solver process with the opening book loaded.
// Returns an object with a single async method.
export function createSolverProcess(): SolverProcess

interface SolverProcess {
  // Resolve 7 numeric scores for the given move string.
  query(moveString: string): Promise<number[]>
  // Terminate the underlying child process.
  destroy(): void
}
```

### Invariants

- Always spawns with `-a -b 7x6.book`; never `-nb`.
- Always returns exactly 7 numbers; strips the move-string echo if present (`parts.length === 8 ? parts.slice(1) : parts`).
- `GeneratorSolver` in `candidate-generator.js` is removed; replaced by `createSolverProcess()`.
- `Connect4Solver` in `index.js` is removed; replaced by `createSolverProcess()`. The `queryDepth` method (depth-limited, spawns a fresh process each call) remains in `index.js` as an inline helper since it is a different code path and not used by the generator.

---

## Classifier Changes (no schema)

**Prerequisite — export `checkWin` and `countWinningThreats`** (gap 4): Both functions are currently unexported. Before any generator code can import them, add `export` to their declarations:

```js
// classifier.js — change these two lines
export function checkWin(board, row, col, player) { … }
export function countWinningThreats(board, colHeights, player) { … }
```

`classify` and `classifyBestMove` are already exported; no change there.

---

`classifier.js` logic changes:

1. **Cat 1** (`classify`): change `score === winScore` → `score >= winScore`. After the `>= && > 0` check, call `parseBoardState`, place piece, call `checkWin`. Only tag as `immediate_threat` if `checkWin` returns true. The `isImmediateWin` helper at the bottom must also change from `===` to `>=`.

2. **Cat 7** (new branch): compute `opponentWinScore = -Math.ceil((41 - moveCount) / 2)`. Illegal columns always have score `-1000`, which is far below any `opponentWinScore`, so checking all 7 entries in `scores` is safe without filtering for legality first. Tag `forbidden_column` if: `scores.some(s => s === opponentWinScore)` AND `scores.every(s => s <= 0)` (no positive score across any column).

---

## Generator Changes (no schema)

`candidate-generator.js` changes:

### 1. Min-move enforcement (FR-011)

Draw `minMoves = 14 + Math.floor(rng() * 21)` → uniform integer in [14, 34]. The existing `targetLen` variable becomes `maxMoves`. After `solverWeightedPosition` returns, discard the result if `moveString.length < minMoves`. Because the rollout stops early on a win, some rollouts produce fewer moves than `targetLen`; the length check happens after the fact.

```js
// Inside generateCandidates while-loop:
const minMoves = 14 + Math.floor(rng() * 21);
const maxMoves = Math.max(minMoves, category <= 2 ? 20 : 34);
const result = await solverWeightedPosition(solver, maxMoves, rng);
if (!result) continue;
const { moveString, trace } = result;   // ← new destructure (see §3 below)
if (moveString.length < minMoves) continue;
```

### 2. Cat 7 guard (FR-005)

After `checkPredicate` passes, add before pushing to `candidates`:

```js
if (category === 7 && scores.some(s => s > 0)) continue;
```

### 3. `solverWeightedPosition` return-value change (gap 2)

**Current signature**: `async function solverWeightedPosition(solver, targetLen, rng) → string | null`

**New signature**: `async function solverWeightedPosition(solver, targetLen, rng) → { moveString: string, trace: object } | null`

The function accumulates a `plies` array — one entry per iteration — and returns it alongside the move string. Return `null` unchanged when the game ends early.

```js
// Skeleton of the changed function:
async function solverWeightedPosition(solver, targetLen, rng) {
  const T1 = rng() * 2 + 0.1;
  const T2 = rng() * 2 + 0.1;
  const temps = [T1, T2];
  let moveString = '';
  const heights = Array(COLS).fill(0);
  const board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  let player = 1;
  const plies = [];

  for (let i = 0; i < targetLen; i++) {
    const legal = [];
    for (let c = 0; c < COLS; c++) if (heights[c] < ROWS) legal.push(c);
    if (legal.length === 0) return null;

    const scores = await solver.query(moveString);
    const weights = legal.map(c => Math.exp(scores[c] / temps[player - 1]));
    const total = weights.reduce((a, b) => a + b, 0);
    const probs_legal = weights.map(w => w / total);

    // Build full 7-element probs array (0 for illegal cols) for storage
    const probs = Array(COLS).fill(0);
    legal.forEach((c, j) => { probs[c] = probs_legal[j]; });

    const col = softmaxSample(legal, scores, temps[player - 1], rng);
    plies.push({ ply: i, player, scores: [...scores], weights: probs, sampled_col: col });

    board[heights[col]][col] = player;
    heights[col]++;
    moveString += (col + 1).toString();
    if (hasWon(board, player)) {
      return {
        moveString,
        trace: { temperature_p1: T1, temperature_p2: T2, termination: 'win', plies }
      };
    }
    player = 3 - player;
  }
  // Reached targetLen without a win
  const termination = moveString.length === ROWS * COLS ? 'draw' : 'max_moves';
  return { moveString, trace: { temperature_p1: T1, temperature_p2: T2, termination, plies } };
}
```

**Call-site update** in `generateCandidates`: replace `const moveString = await solverWeightedPosition(...)` with the destructure shown in §1 above.

### 4. `highlight_cells` computation

After the candidate passes `checkPredicate` and `isClean`, compute `highlight_cells` based on category.

**Cat 1, 2, 3 — single cell** (gap 5): use `correctCols[0]` as the column (this is already the column that passed the predicate). Compute the row from heights:

```js
const heights = getHeights(moveString);
const col = correctCols[0];
const row = heights[col];
highlight_cells = [{ col, row, role: 'hint' }];
```

**Cat 4** — FR-015a algorithm (spec.md §FR-015a, 7-step board algorithm using `checkWin` and `countWinningThreats` imported from `classifier.js`).

**Cat 5** — FR-015b depth filter then FR-015c PV trace (spec.md §FR-015b–c; requires up to K=6 additional solver calls per candidate).

**Cat 6** — FR-015d parity algorithm (spec.md §FR-015d; board-level only, no extra solver calls).

**Cat 7** — single cell: the first column where `scores[c] === opponentWinScore`.

For each algorithm, if the result is an empty array (fallback cases in FR-015a/d), store `[]`; the UI then falls back to `deriveHighlightCol`.

### 5. Supabase insert mapping (gap 1)

`index.js` `/api/admin/generate` endpoint (lines ~848–856) builds an explicit `rows` mapping. **Both new fields must be added here**:

```js
const rows = result.candidates.map(c => ({
  category: c.category,
  move_string: c.move_string,
  solver_scores: c.solver_scores,
  classifier_tags: c.classifier_tags,
  generation_run_id: runId,
  seed: result.seed,
  user_player: c.move_string.length % 2 === 0 ? 1 : 2,
  highlight_cells: c.highlight_cells ?? null,   // ← ADD
  debug_trace: c.debug_trace ?? null,           // ← ADD
}));
```

Without this, the generator returns both fields but they are silently dropped before the Supabase insert.

---

## UI Integration (CurationWorkspace.jsx)

### highlight_cells rendering (gap 3)

`Board.jsx` expects `highlightedCells` as `[[row, col, type], ...]` (see `Board.jsx` lines 13–15: `.filter(([, c]) => c === col).map(([r, , type]) => [r, type])`). The stored `highlight_cells` field uses `{col, row, role}` objects.

In `CurationWorkspace.jsx`, replace the current `highlightedCells` build (lines ~224–230) with:

```js
// Priority: use stored highlight_cells if present; fall back to deriveHighlightCol
const storedCells = candidate.highlight_cells;   // array of {col, row, role} or null
let highlightedCells = [];

if (storedCells && storedCells.length > 0) {
  // Convert {col, row, role} → [row, col, role] tuples for Board
  highlightedCells = storedCells.map(h => [h.row, h.col, h.role]);
} else {
  const highlightCol = deriveHighlightCol(category, candidate.solver_scores, candidate.move_string);
  const heights = getHeights(candidate.move_string);
  if (highlightCol !== null && heights[highlightCol] < ROWS) {
    highlightedCells.push([heights[highlightCol], highlightCol, 'hint']);
  }
}

// Overlay the clicked column on top of stored/derived highlights
if (clickedCol !== null) {
  const heights = getHeights(candidate.move_string);
  if (heights[clickedCol] < ROWS) {
    highlightedCells = highlightedCells.filter(([, c]) => c !== clickedCol);
    highlightedCells.push([heights[clickedCol], clickedCol, 'selected']);
  }
}
```

`deriveHighlightCol` is kept for the legacy fallback path; it also needs the `===` → `>=` fix (FR-003) applied to its `case 1`.

### Debug trace panel (gap 9)

Add a collapsible debug section inside `CurationWorkspace.jsx`, rendered after the scores row and before the predicate checklist. Use a `useState` boolean `showTrace` toggled by a small button.

**Structure**:

```jsx
<div style={debugSection}>
  <button style={debugToggle} onClick={() => setShowTrace(v => !v)}>
    {showTrace ? '▲ Hide trace' : '▼ Debug trace'}
  </button>
  {showTrace && (
    candidate.debug_trace
      ? <DebugTracePanel trace={candidate.debug_trace} />
      : <div style={noTrace}>no trace available</div>
  )}
</div>
```

**`DebugTracePanel`** — inline component (or a separate file `DebugTracePanel.jsx` if it grows large). Renders:

- `T₁ = {temperature_p1.toFixed(3)}  T₂ = {temperature_p2.toFixed(3)}  stopped: {termination}`
- A table with one row per ply: columns `ply | player | sampled col | scores (C1–C7) | weights (C1–C7)`
  - scores and weights can be rendered as comma-separated values; full column layout not required
- Scores row: `[s0, s1, …, s6]` rendered as `C1:s0  C2:s1 …` in a monospace span

`showTrace` state must reset with the rest of the per-candidate state in the `useEffect` that resets on `idx` change.

---

## Test Fixtures — Classifier Regression (gap 8)

These eight records must be fixtures in `tests/classifier/classifier.test.js`. Each is a known false positive from `false_positive_records` in the DB.

### C1 fixtures — should NOT be `immediate_threat` (odd moveCount, score == immediateWinScore but no actual win)

| id prefix | move_string | moveCount | scores | candidateCol (0-indexed) | expected category |
|-----------|-------------|-----------|--------|--------------------------|-------------------|
| `ebebf258` | `427554542541224` | 15 | `[11,11,13,11,11,-13,11]` | 2 | not 1 |
| `1c58cd7a` | `445664144723734` | 15 | `[6,13,12,-1000,11,7,7]` | 1 | not 1 |
| `982ca50c` | `24441476566674473513756` | 23 | `[8,7,9,-1000,8,7,7]` | 2 | not 1 |
| `c4526868` | `556374612625672253533212633` | 27 | `[6,-1000,-1000,7,6,6,6]` | 3 | not 1 |

Test assertion: `classify(moveString, candidateCol, scores).category !== 1`.

### C2 fixtures — SHOULD be `immediate_threat` (score > winScore, genuine immediate win)

| id prefix | move_string | moveCount | scores | candidateCol (0-indexed) | expected |
|-----------|-------------|-----------|--------|--------------------------|----------|
| `58ebbed9` | `2333234334222` | 13 | `[5,10,-1000,11,15,11,10]` | 4 | `{ category: 1, tag: 'immediate_threat' }` |
| `69dced55` | `551645765476634` | 15 | `[-12,-8,14,-12,-12,-8,-12]` | 2 | `{ category: 1, tag: 'immediate_threat' }` |

Test assertion: `classify(moveString, candidateCol, scores)` returns `{ category: 1 }`.

### C3 fixtures — Cat 7 cases (missing classifier branch + invalid predicate)

| id prefix | move_string | moveCount | scores | issue |
|-----------|-------------|-----------|--------|-------|
| `d9ceb902` | `36335513733676645` | 17 | `[-12,-12,-1000,4,-12,-12,-12]` | scores contain positive value (col 3 = 4) → must NOT be `forbidden_column` |
| `1d5b2782` | `7655564344577556647` | 19 | `[-11,-11,-11,-11,-1000,-11,5]` | scores contain positive value (col 6 = 5) → must NOT be `forbidden_column` |

Test assertions for `d9ceb902` and `1d5b2782`: `classify(moveString, anyCol, scores).tag !== 'forbidden_column'`.

Additionally, add one positive fixture for Cat 7 (a position with no positive scores and at least one `opponentWinScore` column) to confirm the new branch fires correctly. Construct it synthetically — pick `moveCount = 17` and `scores = [-12,-12,-1000,-12,-1000,-12,-12]` where `opponentWinScore = -Math.ceil((41-17)/2) = -12`. Test: `classify('', 0, scores).tag === 'forbidden_column'`.
