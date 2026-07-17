# DEV Board Injector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a DEV-only board injector so a human or QA agent can load any board (fixture, custom, or `?devBoard=` URL) into a real Challenge session, and seed any starting position into a Sparring game via URL param — enabling browser QA of spec 049's puzzle-scoring fix.

**Architecture:** Two new pure `src/lib` modules (frozen QA fixtures + a shared URL-param parser), one new DEV-only React panel, and three small DEV-gated edits to existing screens/router. Reuses `ChallengeScreen`'s existing client-side inline-puzzle path and `GameScreen`'s existing `initialMoves` prop — no server change, no new load mechanism.

**Tech Stack:** React 19 (JSX), Vite (`import.meta.env.DEV` dead-code-elimination), `node:test` + `node:assert/strict` for unit tests.

## Global Constraints

- All new surfaces MUST be gated behind `import.meta.env.DEV` so Vite dead-code-eliminates them from the production bundle (convention: `src/components/AuthModal.jsx:55` "Dev: skip auth").
- No server change. No new dependency.
- Tests run inside `connect-four/` with `npm run test:fast`. NEVER run `npm test` (invokes the real c4solver, hangs 10+ min — CLAUDE.md).
- Coordinates are 0-indexed everywhere.
- Never hand-construct movestrings: every fixture board below is copied verbatim from an existing passing integration test.
- All paths below are relative to `connect-four/` unless noted.
- New unit-test files MUST be registered in BOTH the `test` and `test:fast` script lists in `package.json` (testing-conventions.md "add to both lists").

---

### Task 1: QA fixtures + `buildDevPuzzle` helper

**Files:**
- Create: `src/lib/devFixtures.js`
- Test: `tests/unit/devFixtures.test.js`

**Interfaces:**
- Produces:
  - `buildDevPuzzle({ movestring, category, correctCol?, highlightMetadata? }) -> { id, category, move_string, interaction_mode, highlight_metadata, correct_col, user_player }`
  - `DEV_QA_FIXTURES: Array<{ label, movestring, category, correctCol?, highlightMetadata?, taughtCol }>`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/devFixtures.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEV_QA_FIXTURES, buildDevPuzzle } from '../../src/lib/devFixtures.js';
import { SINGLE_ANSWER_CATEGORIES } from '../../src/lib/categories.js';

test('buildDevPuzzle produces the inline puzzle shape for a correctCol category', () => {
  const p = buildDevPuzzle({ movestring: '041015021326', category: 'figure_7', correctCol: 2 });
  assert.equal(p.id, 'dev-041015021326');
  assert.equal(p.category, 'figure_7');
  assert.equal(p.move_string, '041015021326');
  assert.equal(p.interaction_mode, 'single_move');
  assert.equal(p.correct_col, 2);
  assert.equal(p.highlight_metadata, null);
});

test('buildDevPuzzle produces the inline puzzle shape for a highlightMetadata category', () => {
  const hm = { type: 'capsule', column: 6, fromRow: 1, toRow: 5, badgeCount: 5 };
  const p = buildDevPuzzle({ movestring: '3333302444422222060315555054', category: 'z_threat', highlightMetadata: hm });
  assert.deepEqual(p.highlight_metadata, hm);
  assert.equal(p.correct_col, null);
});

test('every single-answer fixture carries the metadata its category requires (anti-drift)', () => {
  const single = DEV_QA_FIXTURES.filter(f => SINGLE_ANSWER_CATEGORIES.has(f.category));
  assert.ok(single.length >= 6, 'expected at least one fixture per single-answer category');
  for (const f of single) {
    const ok = Number.isInteger(f.correctCol) || (f.highlightMetadata != null);
    assert.ok(ok, `fixture "${f.label}" (${f.category}) must carry correctCol or highlightMetadata`);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/devFixtures.test.js`
Expected: FAIL — cannot find module `../../src/lib/devFixtures.js`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/devFixtures.js`. Every board + metadata is copied verbatim from the cited passing integration test — do not alter or re-derive:

```js
// DEV-only QA board fixtures + inline-puzzle builder. Imported only by the DEV board injector
// (src/components/DevBoardInjector.jsx) and ChallengeScreen's DEV branch, both of which are
// import.meta.env.DEV-gated, so this module is dead-code-eliminated from the production bundle.
//
// Every board + metadata below is copied VERBATIM from the cited passing integration test
// (never hand-constructed — CLAUDE.md/I12). The anti-drift guard in tests/unit/devFixtures.test.js
// asserts each single-answer fixture still carries the metadata its category requires.

// Builds the inline puzzle object ChallengeScreen consumes — identical shape to the
// `confirmationChallenges` mapping in ChallengeScreen.loadPuzzles().
export function buildDevPuzzle({ movestring, category, correctCol, highlightMetadata }) {
  return {
    id: `dev-${movestring}`,
    category,
    move_string: movestring,
    interaction_mode: 'single_move',
    highlight_metadata: highlightMetadata ?? null,
    correct_col: Number.isInteger(correctCol) ? correctCol : null,
    user_player: undefined,
  };
}

export const DEV_QA_FIXTURES = [
  // z_threat — OI-1 repro board 1. taughtCol 6; probe col 0 → WRONG (col 0 ties the top solver
  // score but is not the taught z-threat). Source: tests/integration/evaluateMoveMultiSolution.test.js
  // (T009) + singleAnswerCategoriesAccepted.test.js (T008), highlightMetadata from detectZThreat.
  {
    label: 'z_threat — OI-1 board 1 (probe col 0 → WRONG; taught col 6)',
    movestring: '3333302444422222060315555054',
    category: 'z_threat',
    highlightMetadata: { type: 'capsule', column: 6, fromRow: 1, toRow: 5, badgeCount: 5 },
    taughtCol: 6,
  },
  // z_threat — OI-1 repro board 2. taughtCol 0; probe col 0 → CORRECT (not "Suboptimal", even
  // though col 2 wins faster). Source: same tests as board 1.
  {
    label: 'z_threat — OI-1 board 2 (probe col 0 → CORRECT, not Suboptimal; taught col 0)',
    movestring: '3333334512266550121166',
    category: 'z_threat',
    highlightMetadata: { column: 0, fromRow: 1, toRow: 3, badgeCount: 3 },
    taughtCol: 0,
  },
  // claimeven — taughtCol 2; probe any non-2 (e.g. col 0) → WRONG.
  // Source: tests/integration/claimeven.test.js ('3233333556', correctCol 2).
  {
    label: 'claimeven (probe col 2 → CORRECT; any other col → WRONG)',
    movestring: '3233333556',
    category: 'claimeven',
    correctCol: 2,
    taughtCol: 2,
  },
  // figure_7 — taughtCol 2. Source: tests/integration/figure7_jshape.test.js:27 (F7_PRE, correctCol 2).
  {
    label: 'figure_7 (probe col 2 → CORRECT; any other col → WRONG)',
    movestring: '041015021326',
    category: 'figure_7',
    correctCol: 2,
    taughtCol: 2,
  },
  // j_shape — taughtCol 1. Source: tests/integration/figure7_jshape.test.js:39 (J_PRE, correctCol 1).
  {
    label: 'j_shape (probe col 1 → CORRECT; any other col → WRONG)',
    movestring: '04101502',
    category: 'j_shape',
    correctCol: 1,
    taughtCol: 1,
  },
  // undercut — avoid-the-pattern. Killing col is 3; probe col 3 → WRONG, any non-killing col
  // (e.g. col 0) → CORRECT. Source: tests/integration/undercut_overcut.test.js:135-168.
  {
    label: 'undercut (probe killing col 3 → WRONG; any other col → CORRECT)',
    movestring: '334455221100',
    category: 'undercut',
    highlightMetadata: {
      type: 'cells',
      cells: [
        { column: 3, row: 2, role: 'killing_threat' },
        { column: 3, row: 4, role: 'dead_threat' },
      ],
    },
    taughtCol: 0,
  },
  // overcut — taughtCol 4 (major_threat col); probe col 4 → CORRECT, any non-major col
  // (e.g. col 0) → WRONG. Source: tests/integration/undercut_overcut.test.js:174-210.
  {
    label: 'overcut (probe major col 4 → CORRECT; any other col → WRONG)',
    movestring: '33445522110033',
    category: 'overcut',
    highlightMetadata: {
      type: 'cells',
      cells: [
        { column: 4, row: 1, role: 'neutralised_threat' },
        { column: 4, row: 3, role: 'major_threat' },
      ],
    },
    taughtCol: 4,
  },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/devFixtures.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/devFixtures.js tests/unit/devFixtures.test.js
git commit -m "feat(dev): QA board fixtures + buildDevPuzzle helper for board injector"
```

---

### Task 2: Shared `?devBoard=` URL-param parser

**Files:**
- Create: `src/lib/devBoardParam.js`
- Test: `tests/unit/devBoardParam.test.js`

**Interfaces:**
- Produces:
  - `parseDevBoardSearch(search: string) -> { movestring, category?, correctCol?, highlightMetadata?, side?, difficulty? } | null` (pure; returns `null` when `devBoard` absent)
  - `readDevBoardParam(search?) -> same | null` (DEV-gated wrapper; returns `null` outside a Vite DEV build)

- [ ] **Step 1: Write the failing test**

Create `tests/unit/devBoardParam.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDevBoardSearch, readDevBoardParam } from '../../src/lib/devBoardParam.js';

test('parseDevBoardSearch returns null when devBoard is absent', () => {
  assert.equal(parseDevBoardSearch('?foo=bar'), null);
  assert.equal(parseDevBoardSearch(''), null);
});

test('parseDevBoardSearch parses a full param set with URL-encoded devMeta', () => {
  const meta = encodeURIComponent(JSON.stringify({ column: 0 }));
  const r = parseDevBoardSearch(`?devBoard=3333334512266550121166&devCategory=z_threat&devMeta=${meta}`);
  assert.equal(r.movestring, '3333334512266550121166');
  assert.equal(r.category, 'z_threat');
  assert.deepEqual(r.highlightMetadata, { column: 0 });
});

test('parseDevBoardSearch parses devCorrectCol as an integer', () => {
  const r = parseDevBoardSearch('?devBoard=041015021326&devCategory=figure_7&devCorrectCol=2');
  assert.equal(r.correctCol, 2);
});

test('parseDevBoardSearch parses devSide and devDifficulty for sparring', () => {
  const r = parseDevBoardSearch('?devBoard=333333&devSide=second&devDifficulty=hard');
  assert.equal(r.side, 'second');
  assert.equal(r.difficulty, 'hard');
});

test('parseDevBoardSearch tolerates malformed devMeta JSON (no throw)', () => {
  const r = parseDevBoardSearch('?devBoard=333&devMeta=not-json');
  assert.equal(r.movestring, '333');
  assert.equal(r.highlightMetadata, undefined);
});

test('readDevBoardParam returns null outside a Vite DEV build (import.meta.env.DEV undefined in node)', () => {
  assert.equal(readDevBoardParam('?devBoard=333'), null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/devBoardParam.test.js`
Expected: FAIL — cannot find module `../../src/lib/devBoardParam.js`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/devBoardParam.js`:

```js
// Shared DEV-only parser for the ?devBoard=... deep-link params. One param contract used by both
// the Challenge deep-link (ChallengeScreen) and the sparring cold-boot (App.jsx), so the format
// never diverges.
//
// parseDevBoardSearch is pure (always parses) and unit-testable in node. readDevBoardParam is the
// DEV-gated wrapper: `import.meta.env?.DEV` is truthy only in a Vite dev build and is undefined in
// node (optional chaining → null), so this whole feature is inert in production and under test.

export function parseDevBoardSearch(search) {
  const params = new URLSearchParams(search || '');
  const movestring = params.get('devBoard');
  if (!movestring) return null;

  let highlightMetadata;
  const rawMeta = params.get('devMeta');
  if (rawMeta) {
    try {
      highlightMetadata = JSON.parse(rawMeta);
    } catch {
      // Fail-closed: a malformed devMeta is treated as absent (verdict reads "wrong"), never a throw.
      console.warn('[devBoardParam] malformed devMeta JSON — ignoring');
      highlightMetadata = undefined;
    }
  }

  const rawCol = params.get('devCorrectCol');
  const parsedCol = rawCol != null && rawCol !== '' ? Number.parseInt(rawCol, 10) : NaN;

  return {
    movestring,
    category: params.get('devCategory') ?? undefined,
    correctCol: Number.isInteger(parsedCol) ? parsedCol : undefined,
    highlightMetadata,
    side: params.get('devSide') ?? undefined,
    difficulty: params.get('devDifficulty') ?? undefined,
  };
}

export function readDevBoardParam(
  search = (typeof window !== 'undefined' ? window.location.search : ''),
) {
  if (!import.meta.env?.DEV) return null;
  return parseDevBoardSearch(search);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/devBoardParam.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/devBoardParam.js tests/unit/devBoardParam.test.js
git commit -m "feat(dev): shared ?devBoard= URL-param parser (DEV-gated)"
```

---

### Task 3: Register the two new unit tests in both suites

**Files:**
- Modify: `package.json` (the `test` and `test:fast` script strings)

- [ ] **Step 1: Read the current scripts**

Run: `node -e "const s=require('./package.json').scripts; console.log('test:\n'+s.test+'\n\ntest:fast:\n'+s['test:fast'])"`
Note the exact space-separated file-list format (both scripts pass an explicit list to `node --test`).

- [ ] **Step 2: Add both files to BOTH lists**

Edit `package.json`: append `tests/unit/devFixtures.test.js` and `tests/unit/devBoardParam.test.js` to both the `test` and the `test:fast` file lists, matching the existing format (space-separated, same position convention as the other `tests/unit/*.test.js` entries).

- [ ] **Step 3: Verify both are registered**

Run: `node -e "const s=require('./package.json').scripts; for (const k of ['test','test:fast']) for (const f of ['devFixtures','devBoardParam']) console.log(k, f, s[k].includes(f) ? 'YES' : 'NO')"`
Expected: all four lines end in `YES`.

- [ ] **Step 4: Run the fast suite green**

Run: `npm run test:fast`
Expected: PASS, 0 fail — count is the prior baseline (1228) + 9 new tests = **1237 pass**.

- [ ] **Step 5: Commit**

```bash
git add package.json
git commit -m "test(dev): register devFixtures + devBoardParam tests in both suites"
```

---

### Task 4: `DevBoardInjector` panel component

**Files:**
- Create: `src/components/DevBoardInjector.jsx`

**Interfaces:**
- Consumes: `buildDevPuzzle` (Task 1), `CATEGORY_ORDER`, `SINGLE_ANSWER_CATEGORIES` (from `../lib/categories.js`)
- Produces: `DevBoardInjector({ onLoad })` — a React component. `onLoad(puzzleObj, category)` is called on load.

This is DEV-only UI (dead-code-eliminated from prod), so it has no unit test; it is verified by `vite build` (Task 6) and the browser QA that follows. Reuses the already-tested `buildDevPuzzle`.

- [ ] **Step 1: Write the component**

Create `src/components/DevBoardInjector.jsx`:

```jsx
import { useState } from 'react';
import { buildDevPuzzle } from '../lib/devFixtures.js';
import { DEV_QA_FIXTURES } from '../lib/devFixtures.js';
import { CATEGORY_ORDER, SINGLE_ANSWER_CATEGORIES } from '../lib/categories.js';

const MOVES_RE = /^[0-6]{0,42}$/;
const box = { border: '1.5px dashed #aaa', borderRadius: 12, padding: 10, margin: '8px 0', background: 'transparent' };
const fieldRow = { display: 'flex', gap: 6, alignItems: 'center', margin: '4px 0', flexWrap: 'wrap' };

// DEV-only board injector. Rendered ONLY inside an `import.meta.env.DEV &&` guard by its parent,
// so it is stripped from production builds. Lets a developer/QA agent load a fixture or a custom
// board into the current Challenge via onLoad(puzzleObj, category).
export function DevBoardInjector({ onLoad }) {
  const [open, setOpen] = useState(false);
  const [fixtureIdx, setFixtureIdx] = useState(0);
  const [movestring, setMovestring] = useState('');
  const [category, setCategory] = useState('z_threat');
  const [correctCol, setCorrectCol] = useState('');
  const [metaJson, setMetaJson] = useState('');
  const [error, setError] = useState(null);

  function loadFixture() {
    const f = DEV_QA_FIXTURES[fixtureIdx];
    onLoad(buildDevPuzzle(f), f.category);
  }

  function loadCustom() {
    setError(null);
    if (!MOVES_RE.test(movestring)) {
      setError('Invalid movestring (expected 0-42 chars, each 0–6).');
      return;
    }
    let highlightMetadata;
    if (metaJson.trim()) {
      try {
        highlightMetadata = JSON.parse(metaJson);
      } catch {
        setError('highlightMetadata is not valid JSON.');
        return;
      }
    }
    const colNum = correctCol.trim() ? Number.parseInt(correctCol, 10) : undefined;
    onLoad(
      buildDevPuzzle({ movestring, category, correctCol: colNum, highlightMetadata }),
      category,
    );
  }

  const needsMeta = SINGLE_ANSWER_CATEGORIES.has(category) && !correctCol.trim() && !metaJson.trim();

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} style={{ ...box, cursor: 'pointer', fontSize: 13, color: 'var(--ink-soft)', width: '100%' }}>
        🛠 Dev: load board ▾
      </button>
    );
  }

  return (
    <div style={box}>
      <div style={fieldRow}>
        <strong style={{ fontSize: 13 }}>🛠 Dev: load board</strong>
        <button type="button" onClick={() => setOpen(false)} style={{ marginLeft: 'auto', cursor: 'pointer' }}>▴</button>
      </div>

      <div style={fieldRow}>
        <select value={fixtureIdx} onChange={e => setFixtureIdx(Number(e.target.value))} style={{ flex: 1 }}>
          {DEV_QA_FIXTURES.map((f, i) => <option key={i} value={i}>{f.label}</option>)}
        </select>
        <button type="button" onClick={loadFixture}>Load fixture</button>
      </div>

      <hr style={{ border: 0, borderTop: '1px solid #ddd', margin: '8px 0' }} />

      <div style={fieldRow}>
        <input placeholder="movestring (e.g. 041015021326)" value={movestring} onChange={e => setMovestring(e.target.value)} style={{ flex: 1, minWidth: 180 }} />
        <select value={category} onChange={e => setCategory(e.target.value)}>
          {CATEGORY_ORDER.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div style={fieldRow}>
        <input placeholder="correctCol (opt)" value={correctCol} onChange={e => setCorrectCol(e.target.value)} style={{ width: 110 }} />
        <input placeholder='highlightMetadata JSON (opt)' value={metaJson} onChange={e => setMetaJson(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
        <button type="button" onClick={loadCustom}>Load custom</button>
      </div>

      {needsMeta && (
        <div style={{ fontSize: 12, color: '#b26a00' }}>
          ⚠ Single-answer categories need correctCol or highlightMetadata, else the verdict reads "wrong".
        </div>
      )}
      {error && <div style={{ fontSize: 12, color: '#c00' }}>{error}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx vite build`
Expected: `✓ built in …` with no errors (the component is imported by no one yet, but must parse).

- [ ] **Step 3: Commit**

```bash
git add src/components/DevBoardInjector.jsx
git commit -m "feat(dev): DevBoardInjector panel (fixture dropdown + custom form, DEV-only)"
```

---

### Task 5: Wire the injector into `ChallengeScreen`

**Files:**
- Modify: `src/screens/ChallengeScreen.jsx`

**Interfaces:**
- Consumes: `DevBoardInjector` (Task 4), `buildDevPuzzle` (Task 1), `readDevBoardParam` (Task 2)
- Produces: a new `devPuzzles` prop on `ChallengeScreen` (array of inline puzzle objects, DEV-only)

- [ ] **Step 1: Add imports**

Below the existing `import { SINGLE_ANSWER_CATEGORIES, MULTI_SOLUTION_CATEGORIES } from '../lib/categories.js';` line, add:

```jsx
import { DevBoardInjector } from '../components/DevBoardInjector.jsx';
import { buildDevPuzzle } from '../lib/devFixtures.js';
import { readDevBoardParam } from '../lib/devBoardParam.js';
```

- [ ] **Step 2: Add the `devPuzzles` prop**

In the `export function ChallengeScreen({ ... })` destructured props list, add `devPuzzles,` (default `undefined`) alongside the existing `confirmationChallenges = null,`.

- [ ] **Step 3: Add the DEV branch at the top of `loadPuzzles()`**

Inside `loadPuzzles()`'s `try {`, as the FIRST statement (before the `if (lessonMode && confirmationChallenges?.length > 0)` branch), insert:

```jsx
// DEV board injector (dead-code-eliminated in prod): a `devPuzzles` prop (set by handleDevLoad's
// go('challenge', {devPuzzles})) or a ?devBoard= URL param takes priority over the normal draw.
if (import.meta.env.DEV) {
  let injected = devPuzzles?.length ? devPuzzles : null;
  if (!injected) {
    const p = readDevBoardParam();
    if (p) injected = [buildDevPuzzle(p)];
  }
  if (injected?.length) {
    sessionIdRef.current = null;
    setPuzzles(injected);
    setCurrentIdx(0);
    initPuzzle(injected[0]);
    setPhase('pre-move');
    return;
  }
}
```

- [ ] **Step 4: Add `handleDevLoad` and render the panel**

Add this function inside the component (near `handleColumnClick`):

```jsx
function handleDevLoad(puzzleObj, cat) {
  // Re-navigate so the `category` prop (hence effectiveCategory + the accepted-gate) matches the
  // loaded board; the DEV branch in loadPuzzles picks up devPuzzles on the remount.
  go('challenge', { category: cat, devPuzzles: [puzzleObj] });
}
```

Then, at the very top of the screen's returned JSX (the first child of the outermost container), add:

```jsx
{import.meta.env.DEV && <DevBoardInjector onLoad={handleDevLoad} />}
```

- [ ] **Step 5: Verify build + existing tests still pass**

Run: `npx vite build`
Expected: `✓ built` with no errors.

Run: `npm run test:fast`
Expected: PASS, 0 fail, **1237** (unchanged — the T016 source-assertion regex for `SINGLE_ANSWER_CATEGORIES` still matches; no test asserts against the new imports).

- [ ] **Step 6: Commit**

```bash
git add src/screens/ChallengeScreen.jsx
git commit -m "feat(dev): wire DevBoardInjector + ?devBoard= into ChallengeScreen (DEV-only)"
```

---

### Task 6: Sparring cold-boot exception in `App.jsx`

**Files:**
- Modify: `src/App.jsx` (mount effect, ~lines 25-41)
- Verify only (likely no edit): `src/screens/GameScreen.jsx`

**Interfaces:**
- Consumes: `readDevBoardParam` (Task 2)

- [ ] **Step 1: Add the import**

Near the top of `src/App.jsx`, alongside `import { buildUrl, parseUrl, SESSION_ONLY_SCREENS } from './lib/urlMapping.js';`, add:

```jsx
import { readDevBoardParam } from './lib/devBoardParam.js';
```

- [ ] **Step 2: Replace the mount-effect resolution block**

In the mount effect, replace this:

```jsx
    const { screenKey, params: initParams } = parseUrl(window.location.pathname);
    const isSessionOnly = SESSION_ONLY_SCREENS.has(screenKey);
    const resolved = isSessionOnly ? 'home' : screenKey;
    const resolvedParams = isSessionOnly ? {} : initParams;
    const resolvedUrl = isSessionOnly ? '/' : buildUrl(resolved, resolvedParams);
```

with:

```jsx
    const { screenKey, params: initParams } = parseUrl(window.location.pathname);
    let isSessionOnly = SESSION_ONLY_SCREENS.has(screenKey);
    let resolved = isSessionOnly ? 'home' : screenKey;
    let resolvedParams = isSessionOnly ? {} : initParams;

    // DEV-only: allow cold-booting a seeded Sparring game from /game?devBoard=... (game is
    // session-only, so it would otherwise redirect to home). Entire block stripped from prod.
    if (import.meta.env.DEV && screenKey === 'game') {
      const devParam = readDevBoardParam(window.location.search);
      if (devParam) {
        isSessionOnly = false;
        resolved = 'game';
        resolvedParams = {
          difficulty: devParam.difficulty ?? 'medium',
          side: devParam.side ?? 'first',
          initialMoves: devParam.movestring,
        };
      }
    }

    const resolvedUrl = isSessionOnly ? '/' : buildUrl(resolved, resolvedParams);
```

- [ ] **Step 3: Confirm `GameScreen` needs no change**

Run: `grep -n "initialMoves" src/screens/GameScreen.jsx`
Expected: `GameScreen` already destructures `initialMoves` and passes it to `useGameBoard({ initialMoves })`. Since App.jsx now puts `initialMoves` into the screen params (which flow to the screen as props), no GameScreen edit is needed.
If (and only if) the params do NOT flow as props in this codebase, change GameScreen's `useGameBoard` call to `initialMoves: initialMoves || (import.meta.env.DEV ? (readDevBoardParam()?.movestring ?? '') : '')` and add the `readDevBoardParam` import. Otherwise skip.

- [ ] **Step 4: Verify build + tests + router regression**

Run: `npx vite build`
Expected: `✓ built` with no errors.

Run: `npm run test:fast`
Expected: PASS, 0 fail, **1237**. In particular the existing router tests (`tests/unit/onboardingRouting.test.js`, and any `parseUrl`/`buildUrl`/`SESSION_ONLY_SCREENS` tests) must still pass — the prod path is unchanged (the new block is inside `import.meta.env.DEV`).

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx
git commit -m "feat(dev): cold-boot seeded sparring from /game?devBoard= (DEV-only)"
```

---

### Task 7: End-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Production bundle contains none of the DEV surfaces**

Run: `npx vite build && grep -rl "Dev: load board\|DEV_QA_FIXTURES\|devBoard" dist/assets/*.js; echo "exit=$?"`
Expected: no file matches (grep prints nothing, `exit=1`) — confirms Vite dead-code-eliminated the injector.

- [ ] **Step 2: Full fast suite green**

Run: `npm run test:fast`
Expected: PASS, 0 fail, **1237**.

- [ ] **Step 3: Manual smoke (dev server) — record results**

Start the dev server (`npm run dev`), then in the browser confirm:
1. `/challenge/z_threat` shows the collapsed `🛠 Dev: load board ▾` bar; expanding it lists all 7 fixtures.
2. Load "z_threat — OI-1 board 2" fixture → play col 0 → verdict CORRECT (not "Suboptimal"), coach message congruent (happy), correct SFX, win overlay.
3. Load "z_threat — OI-1 board 1" fixture → play col 0 → verdict WRONG, wrong SFX.
4. Load "undercut" fixture → play col 3 (killing) → WRONG; reload, play col 0 → CORRECT.
5. Deep-link `/challenge/figure_7?devBoard=041015021326&devCategory=figure_7&devCorrectCol=2` → play col 2 → CORRECT.
6. Deep-link `/game?devBoard=3333334512266550121166&devSide=first` → cold-boots a seeded sparring board; AI responds to a move.

- [ ] **Step 4: Final commit (if any verification-driven fixes were needed)**

```bash
git add -A
git commit -m "chore(dev): board injector verified end-to-end for spec-049 QA"
```

---

## Self-Review

**Spec coverage:** All six design units map to tasks — devFixtures (T1), devBoardParam (T2), DevBoardInjector (T4), ChallengeScreen wiring (T5), App.jsx cold-boot (T6), GameScreen (T6/step 3, verify-only). Test registration (design "Testing") → T3. Prod-stripping + manual QA (design "Rollout") → T7. No gap.

**Placeholder scan:** No TBD/TODO/"handle appropriately". Every fixture board carries a concrete value copied from a cited test. Every code step shows full code.

**Type consistency:** `buildDevPuzzle` returns `{ id, category, move_string, interaction_mode, highlight_metadata, correct_col, user_player }` — consumed identically in T5's `loadPuzzles` branch (passed to `setPuzzles`/`initPuzzle`, same shape as `confirmationChallenges`). `readDevBoardParam`/`parseDevBoardSearch` return `{ movestring, category, correctCol, highlightMetadata, side, difficulty }` — consumed by `buildDevPuzzle` (T5) and the App.jsx cold-boot (T6, uses `movestring`/`side`/`difficulty`). `onLoad(puzzleObj, category)` signature matches between `DevBoardInjector` (T4) and `handleDevLoad` (T5). Consistent.
