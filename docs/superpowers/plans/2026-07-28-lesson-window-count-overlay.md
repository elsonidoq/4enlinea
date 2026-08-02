# Lesson Window-Count Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show, on opening-lesson boards, how many four-in-a-row windows the learner can still win through each empty cell — as a violet tint plus an integer.

**Architecture:** A pure server module counts, for each empty cell, the four-windows through it that contain no opponent disc. `saveLessonFile` recomputes those counts into the lesson JSON on every admin write, so the numbers are a derived cache and are never hand-authored. A content test recomputes and asserts equality, making staleness a red test. The client only renders a stored array.

**Tech Stack:** Node ESM (`"type": "module"`), `node:test` + `node:assert/strict`, React 19, Express 5, i18next.

## Global Constraints

- **Movestring digits are 0-indexed columns (0–6).** `src/lib/movestring.js:5-6`: *"Movestrings use 0-indexed columns (0–6). Only c4solver-wrapper.js ever translates to 1-indexed; nothing here should."* Enforced for challenges by `lessonLoader.js:133` (`/^[0-6]*$/`).
- **All coordinates 0-indexed, row 0 = bottom, col 0 = leftmost.** Project-wide invariant (CLAUDE.md).
- **`'red'` = player 1 = GREEN disc; `'yellow'` = player 2 = GRAY disc.** `movestring.js:11-13`: *"'red'/'yellow' are kept for historical reasons — they are internal player-1/player-2 identity tokens, NOT display colors. The Board renders 'red' as a GREEN disc and 'yellow' as a GRAY disc."* User-facing copy says **green/gray**, never red/yellow.
- **New test files must be registered in `package.json`.** `test`, `test:fast`, and `test:dom` are explicit space-separated file lists — an unregistered test file silently never runs.
- **Run tests with `npm run test:fast` from `connect-four/`.** Never `npm test` (it includes `candidate-generator.test.js`, which hangs on solver IPC).
- **`node --test` cannot import `.jsx`.** Pure logic must live in `.js` so unit tests can import it; JSX needs `test:dom` (`--import ./tests/dom/setup.js`). Precedent: `src/lib/board.js:182-184`.
- **Every user-visible English string needs a Spanish sibling.** A missing one ships English silently. `en.json`/`es.json` key structures must match exactly — `tests/unit/i18nKeyParity.test.js`.
- **The lesson loader EXCLUDES an invalid file entirely** (`lessonLoader.js:44-47`), so validators stay structural/permissive and strictness lives in `tests/unit/lessonContent.test.js`, which "fails loudly instead."
- **Never `git add -A`.** Stage explicit paths; a background process auto-commits staged work.

## Deviation from the approved spec — read before Task 4

The spec says perspective is *"derived from movestring parity"* (the player to move). **This plan uses `lesson.userPerspective` instead.** Reason, discovered while harvesting: both target lessons are `userPerspective: "red"` (learner is green), but 5 of their 6 slides have **gray** to move (`lesson-04` slides 2/3/4, `lesson-15` slides 1/3). Parity-derived perspective would show the opponent's opportunities in a lesson about where *you* should play.

Consequence for content: the spec's *"update the prose to 10 and 2"* becomes **13 → 11 only**. Under learner perspective the corner cell is still 3, so that number is unchanged. Verified below.

If the reviewer prefers the spec's parity rule, the only changes are `computeWindowCounts`' second argument at the call site in Task 2 and the numbers in Task 4.

## File Structure

| File | Responsibility |
|---|---|
| `connect-four/server/windowCounts.js` (create) | Pure: movestring + perspective → 6×7 counts. No I/O. |
| `connect-four/tests/unit/windowCounts.test.js` (create) | Unit tests for the above. |
| `connect-four/server/lessonAdmin.js` (modify) | Recompute counts at the single write seam. |
| `connect-four/server/lessonLoader.js` (modify) | Permissive structural validation of the new fields. |
| `connect-four/tests/unit/lessonContent.test.js` (modify) | Staleness gate: stored counts must equal recomputed. |
| `connect-four/scripts/backfill-window-counts.mjs` (create) | One-shot backfill using the production function. |
| `connect-four/lessons/lesson-04-opening-centre.json` (modify) | Opt in slides 1, 2, 4; fix slide 4 prose. |
| `connect-four/lessons/lesson-15-opening-sharp.json` (modify) | Opt in all three slides. |
| `connect-four/src/lib/lessonWindows.js` (modify) | `WINDOW_COUNT_MAX`, `windowCountTint()` — render-side constants. |
| `connect-four/src/components/Board.jsx` (modify) | New `windowCounts` prop; per-cell tint + number. |
| `connect-four/src/screens/ConceptScreen.jsx` (modify) | Memoize, pass the prop, render the legend row. |
| `connect-four/src/i18n/{en,es}.json` (modify) | `lesson.windowCounts.legend`. |
| `connect-four/tests/dom/BoardWindowCounts.dom.test.jsx` (create) | Renders Board for real; asserts digits and tint. |
| `connect-four/package.json` (modify) | Register the two new test files. |
| `docs/architecture/lesson-editor.md` (modify) | Authoring contract. |
| `docs/architecture/frontend-conventions.md` (modify) | Board prop table row. |

## Data contract

Two new **concept-slide** fields (not valid on `socratic`):

- `showWindowCounts: boolean` — authored intent. The only thing a human writes.
- `windowCounts: (number|null)[6][7]` — derived cache, row 0 = bottom, `null` for occupied cells. Present iff `showWindowCounts` is true.

---

### Task 1: The pure counting function

**Files:**
- Create: `connect-four/server/windowCounts.js`
- Create: `connect-four/tests/unit/windowCounts.test.js`
- Modify: `connect-four/package.json` (the `test` and `test:fast` scripts)

**Interfaces:**
- Consumes: nothing.
- Produces: `computeWindowCounts(movestring: string, userPerspective: 'red'|'yellow') => (number|null)[][]` — a 6-element array of 7-element rows, index `[row][col]`, row 0 = bottom. `null` where a disc sits. Also exports `ALL_WINDOWS: Array<Array<{c,r}>>` (the 69 windows).

- [ ] **Step 1: Write the failing test**

Create `connect-four/tests/unit/windowCounts.test.js`:

```js
// Counts, per empty cell, the four-in-a-row windows through it that contain no opponent
// disc — from the LEARNER's perspective (lesson.userPerspective), not the side to move.
// Expected values were harvested by brute force over the 69 windows, not hand-derived.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeWindowCounts, ALL_WINDOWS } from '../../server/windowCounts.js';

test('windowCounts: the board has exactly 69 four-in-a-row windows', () => {
  assert.equal(ALL_WINDOWS.length, 69);
});

test('windowCounts: on an empty board the count is pure geometry (13 centre, 3 corner)', () => {
  // No opponent disc exists, so every window is live and the count degenerates to the
  // number of windows through each cell. Row 0 = bottom.
  const expected = [
    [3, 4, 5, 7, 5, 4, 3],
    [4, 6, 8, 10, 8, 6, 4],
    [5, 8, 11, 13, 11, 8, 5],
    [5, 8, 11, 13, 11, 8, 5],
    [4, 6, 8, 10, 8, 6, 4],
    [3, 4, 5, 7, 5, 4, 3],
  ];
  assert.deepEqual(computeWindowCounts('', 'red'), expected);
  // Symmetric: with no discs at all, perspective cannot matter.
  assert.deepEqual(computeWindowCounts('', 'yellow'), expected);
});

test('windowCounts: occupied cells are null', () => {
  // '333' drops three discs in column 3: (3,0)=green, (3,1)=gray, (3,2)=green.
  const g = computeWindowCounts('333', 'red');
  assert.equal(g[0][3], null);
  assert.equal(g[1][3], null);
  assert.equal(g[2][3], null);
  assert.notEqual(g[3][3], null, 'the cell above the stack is empty and must carry a count');
});

test('windowCounts: an opponent disc kills the windows it sits in', () => {
  // Green learner, board '333'. Cell (c3,r3): geometric 13. The three vertical windows
  // through it span rows 0-3, 1-4 and 2-5; the gray disc at (3,1) kills the first two.
  // Green's OWN discs at (3,0)/(3,2) kill nothing. 13 - 2 = 11.
  assert.equal(computeWindowCounts('333', 'red')[3][3], 11);
  // The corner keeps all 3: its horizontal window contains green's own disc at (3,0),
  // and its vertical window cannot be blocked while (0,0) itself is empty.
  assert.equal(computeWindowCounts('333', 'red')[0][0], 3);
});

test('windowCounts: perspective flips which discs block', () => {
  // Same board, gray learner. Now green's discs are the blockers: the gray corner count
  // drops to 2 (green at (3,0) kills the horizontal) and (3,3) drops to 10.
  assert.equal(computeWindowCounts('333', 'yellow')[3][3], 10);
  assert.equal(computeWindowCounts('333', 'yellow')[0][0], 2);
});

test('windowCounts: a fully blocked cell counts 0', () => {
  // Harvested by random search — 0 is reachable, but only high on the board: for any
  // empty cell at row <= 2 the vertical window above it is necessarily empty, hence live.
  const ms = '3466053256140200054046246152456232';
  assert.equal(computeWindowCounts(ms, 'yellow')[5][5], 0);
});

test('windowCounts: every cell is null or a non-negative integer, shape is 6x7', () => {
  const g = computeWindowCounts('3332223362', 'red');
  assert.equal(g.length, 6);
  for (const row of g) {
    assert.equal(row.length, 7);
    for (const v of row) {
      assert.ok(v === null || (Number.isInteger(v) && v >= 0), `bad cell value ${v}`);
    }
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd connect-four && node --test tests/unit/windowCounts.test.js`
Expected: FAIL — `Cannot find module '.../server/windowCounts.js'`

- [ ] **Step 3: Write the implementation**

Create `connect-four/server/windowCounts.js`:

```js
/**
 * Per-cell "live window" counts for lesson board overlays.
 *
 * For each EMPTY cell, counts the four-in-a-row windows through it that contain no
 * opponent disc — i.e. the lines the learner can still complete through that square.
 * Own discs never reduce the count; only the opponent's do.
 *
 * Perspective is the LEARNER (lesson.userPerspective), deliberately NOT the side to
 * move: the target lessons are userPerspective 'red' while most of their slides have
 * 'yellow' to move, and the overlay must answer "where should I play", not "where
 * should my opponent play".
 *
 * On an empty board no window has an opponent disc, so every count degenerates to pure
 * geometry (13 at the two middle centre cells, 3 at a corner, 69 windows in total).
 * That is the same one formula, not a special case.
 *
 * Pure: no I/O, no dependency on the lesson loader. Coordinates are 0-indexed with
 * row 0 = bottom, per the project-wide convention.
 */

const ROWS = 6;
const COLS = 7;

/** All 69 four-in-a-row windows, each an ordered array of 4 {c,r} cells. */
export const ALL_WINDOWS = (() => {
  const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
  const out = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      for (const [dc, dr] of dirs) {
        const cells = [];
        for (let i = 0; i < 4; i++) cells.push({ c: c + i * dc, r: r + i * dr });
        if (cells.every(x => x.c >= 0 && x.c < COLS && x.r >= 0 && x.r < ROWS)) out.push(cells);
      }
    }
  }
  return out;
})();

/**
 * Replay a movestring into a Map keyed "c,r" -> 'red' | 'yellow'.
 * Move 0 is 'red' (player 1), move 1 is 'yellow' — matches src/lib/movestring.js.
 */
function placeDiscs(movestring) {
  const heights = Array(COLS).fill(0);
  const discs = new Map();
  for (let i = 0; i < movestring.length; i++) {
    const c = Number(movestring[i]);
    if (!Number.isInteger(c) || c < 0 || c >= COLS) continue;
    if (heights[c] >= ROWS) continue;
    discs.set(`${c},${heights[c]}`, i % 2 === 0 ? 'red' : 'yellow');
    heights[c] += 1;
  }
  return discs;
}

/**
 * @param {string} movestring        0-indexed column digits
 * @param {'red'|'yellow'} userPerspective  the LEARNER's player token
 * @returns {Array<Array<number|null>>}  [row][col], row 0 = bottom, null where occupied
 */
export function computeWindowCounts(movestring, userPerspective) {
  const discs = placeDiscs(movestring ?? '');
  const opponent = userPerspective === 'red' ? 'yellow' : 'red';

  const grid = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      row.push(discs.has(`${c},${r}`) ? null : 0);
    }
    grid.push(row);
  }

  for (const window of ALL_WINDOWS) {
    if (window.some(x => discs.get(`${x.c},${x.r}`) === opponent)) continue;
    for (const { c, r } of window) {
      if (grid[r][c] !== null) grid[r][c] += 1;
    }
  }

  return grid;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd connect-four && node --test tests/unit/windowCounts.test.js`
Expected: PASS — 7 tests.

- [ ] **Step 5: Register the test file in both test scripts**

In `connect-four/package.json`, the `test` and `test:fast` scripts are single-line space-separated file lists. In **each** of those two lists, find `tests/unit/lessonContent.test.js` and insert ` tests/unit/windowCounts.test.js` immediately after it. Do not touch `test:dom` in this task.

- [ ] **Step 6: Verify the suite still passes and the new file actually runs**

Run: `cd connect-four && npm run test:fast 2>&1 | tail -20`
Expected: all pass. Confirm registration took effect:
Run: `cd connect-four && node -e "const p=require('./package.json'); for (const k of ['test','test:fast']) console.log(k, p.scripts[k].includes('tests/unit/windowCounts.test.js'))"`
Expected: `test true` and `test:fast true`.

- [ ] **Step 7: Commit**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add connect-four/server/windowCounts.js connect-four/tests/unit/windowCounts.test.js connect-four/package.json
git commit -m "feat(lessons): pure per-cell live-window counter"
```

---

### Task 2: Recompute at the save seam + validate the fields

**Files:**
- Modify: `connect-four/server/lessonAdmin.js` (`saveLessonFile`, currently lines 18-24)
- Modify: `connect-four/server/lessonLoader.js` (add `validateWindowCounts`, call it from `validateLesson` near line 156)
- Modify: `connect-four/tests/unit/lessonAdmin.test.js`

**Interfaces:**
- Consumes: `computeWindowCounts(movestring, userPerspective)` from Task 1.
- Produces: `saveLessonFile` now stamps `slide.windowCounts` on every slide with `showWindowCounts === true` and deletes it everywhere else. `validateLesson` returns an error string for malformed `showWindowCounts` / `windowCounts`.

`saveLessonFile` is the single write seam for **both** admin write paths — `POST /api/admin/lessons` (`server/index.js:886`) and `PUT /api/admin/lessons/:id` (`server/index.js:902`) — so stamping here covers editing a board in the editor with nothing for the author to remember.

- [ ] **Step 1: Write the failing test**

Append to `connect-four/tests/unit/lessonAdmin.test.js`:

```js
import os from 'node:os';
import { computeWindowCounts } from '../../server/windowCounts.js';

function lessonWithSlides(slides) {
  return {
    id: 'wc-fixture', title: 'WC', free: true, userPerspective: 'red', order: 99,
    slides, socratic: null, confirmationCategory: null, confirmationCount: 0,
  };
}

test('saveLessonFile: stamps windowCounts on slides that opt in', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-'));
  const lesson = lessonWithSlides([
    { movestring: '333', showWindowCounts: true, boardSpec: ['', '', '', 'gdg', '', '', ''] },
  ]);
  saveLessonFile(dir, lesson);
  const written = JSON.parse(fs.readFileSync(path.join(dir, 'lesson-99-wc-fixture.json'), 'utf8'));
  assert.deepEqual(written.slides[0].windowCounts, computeWindowCounts('333', 'red'));
  // Spot-check the actual value so this cannot pass by comparing two identical bugs.
  assert.equal(written.slides[0].windowCounts[3][3], 11);
});

test('saveLessonFile: strips windowCounts from slides that do not opt in', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-'));
  const lesson = lessonWithSlides([
    { movestring: '333', windowCounts: [[1, 1, 1, 1, 1, 1, 1]], boardSpec: ['', '', '', 'gdg', '', '', ''] },
  ]);
  saveLessonFile(dir, lesson);
  const written = JSON.parse(fs.readFileSync(path.join(dir, 'lesson-99-wc-fixture.json'), 'utf8'));
  assert.equal(written.slides[0].windowCounts, undefined);
});

test('saveLessonFile: recomputes a stale windowCounts rather than trusting it', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-'));
  const lesson = lessonWithSlides([
    { movestring: '333', showWindowCounts: true, windowCounts: [[0, 0, 0, 0, 0, 0, 0]], boardSpec: ['', '', '', 'gdg', '', '', ''] },
  ]);
  saveLessonFile(dir, lesson);
  const written = JSON.parse(fs.readFileSync(path.join(dir, 'lesson-99-wc-fixture.json'), 'utf8'));
  assert.equal(written.slides[0].windowCounts[3][3], 11);
});

test('saveLessonFile: uses the learner perspective, not the side to move', () => {
  // '333' is 3 plies, so GRAY is to move — but a userPerspective 'red' lesson must
  // still count for GREEN. Under gray's perspective (3,3) would be 10, not 11.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-'));
  saveLessonFile(dir, lessonWithSlides([
    { movestring: '333', showWindowCounts: true, boardSpec: ['', '', '', 'gdg', '', '', ''] },
  ]));
  const written = JSON.parse(fs.readFileSync(path.join(dir, 'lesson-99-wc-fixture.json'), 'utf8'));
  assert.equal(written.slides[0].windowCounts[3][3], 11);
});

test('validateLesson: rejects a non-boolean showWindowCounts and a malformed windowCounts', () => {
  const bad1 = lessonWithSlides([{ movestring: '', showWindowCounts: 'yes' }]);
  assert.match(validateLesson(bad1) ?? '', /showWindowCounts/);
  const bad2 = lessonWithSlides([{ movestring: '', showWindowCounts: true, windowCounts: [[1, 2, 3]] }]);
  assert.match(validateLesson(bad2) ?? '', /windowCounts/);
  const good = lessonWithSlides([
    { movestring: '', showWindowCounts: true, windowCounts: computeWindowCounts('', 'red') },
  ]);
  assert.equal(validateLesson(good), null);
});
```

If `tests/unit/lessonAdmin.test.js` does not already import `fs`, `path`, `assert`, `test`, `saveLessonFile`, or `validateLesson`, add whichever are missing to its existing import block. Read the top of the file first rather than assuming.

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd connect-four && node --test tests/unit/lessonAdmin.test.js`
Expected: FAIL — the stamped `windowCounts` is `undefined`, and `validateLesson` returns `null` for the malformed fixtures.

- [ ] **Step 3: Implement the save-seam recompute**

In `connect-four/server/lessonAdmin.js`, add the import at the top and replace `saveLessonFile`:

```js
import fs from 'node:fs';
import path from 'node:path';
import { computeWindowCounts } from './windowCounts.js';
```

```js
/**
 * Write lesson to disk. If oldId is provided and differs from lesson.id,
 * the old file is deleted first (handles rename).
 *
 * `slides[].windowCounts` is a DERIVED CACHE, never authored: it is recomputed here
 * from the slide's movestring on every write, so editing a board in the admin editor
 * refreshes it automatically. Slides without `showWindowCounts` have it stripped.
 */
export function saveLessonFile(dir, lesson, oldId = null) {
  if (oldId && oldId !== lesson.id) {
    const oldFile = findLessonFile(dir, oldId);
    if (oldFile) fs.unlinkSync(path.join(dir, oldFile));
  }
  const stamped = {
    ...lesson,
    slides: (lesson.slides ?? []).map(slide => {
      const { windowCounts: _stale, ...rest } = slide;
      return slide.showWindowCounts === true
        ? { ...rest, windowCounts: computeWindowCounts(slide.movestring ?? '', lesson.userPerspective) }
        : rest;
    }),
  };
  fs.writeFileSync(lessonFilePath(dir, stamped), JSON.stringify(stamped, null, 2), 'utf8');
}
```

- [ ] **Step 4: Implement the validator**

In `connect-four/server/lessonLoader.js`, add this function immediately after `validateWindowHighlights` (which ends at line 73):

```js
/**
 * Validate `slides[].showWindowCounts` / `slides[].windowCounts`. Structural only, for
 * the same reason as validateWindowHighlights: the loader EXCLUDES an invalid file
 * entirely, so an over-strict rule silently removes a lesson from the app. Whether the
 * stored counts are STALE is checked by tests/unit/lessonContent.test.js, which fails
 * loudly instead.
 * Returns an error string if invalid, or null if valid.
 */
function validateWindowCounts(lesson) {
  for (let i = 0; i < lesson.slides.length; i++) {
    const slide = lesson.slides[i];
    if (slide.showWindowCounts !== undefined && typeof slide.showWindowCounts !== 'boolean') {
      return `slides[${i}].showWindowCounts must be a boolean`;
    }
    const wc = slide.windowCounts;
    if (wc === undefined) continue;
    if (!Array.isArray(wc) || wc.length !== 6) {
      return `slides[${i}].windowCounts must be an array of exactly 6 rows`;
    }
    for (let r = 0; r < 6; r++) {
      if (!Array.isArray(wc[r]) || wc[r].length !== 7) {
        return `slides[${i}].windowCounts[${r}] must be an array of exactly 7 cells`;
      }
      for (let c = 0; c < 7; c++) {
        const v = wc[r][c];
        if (v !== null && !(Number.isInteger(v) && v >= 0)) {
          return `slides[${i}].windowCounts[${r}][${c}] must be null or a non-negative integer`;
        }
      }
    }
  }
  return null;
}
```

Then in `validateLesson`, immediately after the existing `windowErr` block (lines 156-157), add:

```js
  const windowCountsErr = validateWindowCounts(lesson);
  if (windowCountsErr) return windowCountsErr;
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd connect-four && node --test tests/unit/lessonAdmin.test.js tests/unit/lessonLoader.test.js tests/unit/adminLessonPayload.test.js`
Expected: PASS. `lessonToJsonPayload` spreads `...slide` (`src/lib/lessonPayload.js:21`), so the new fields survive the editor round trip untouched and that test needs no change.

- [ ] **Step 6: Run the full fast suite**

Run: `cd connect-four && npm run test:fast 2>&1 | tail -20`
Expected: all pass. The lesson files have no `showWindowCounts` yet, so nothing else changes.

- [ ] **Step 7: Commit**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add connect-four/server/lessonAdmin.js connect-four/server/lessonLoader.js connect-four/tests/unit/lessonAdmin.test.js
git commit -m "feat(lessons): recompute windowCounts at the save seam"
```

---

### Task 3: Content gate + backfill the two lessons

**Files:**
- Modify: `connect-four/tests/unit/lessonContent.test.js`
- Create: `connect-four/scripts/backfill-window-counts.mjs`
- Modify: `connect-four/lessons/lesson-04-opening-centre.json`
- Modify: `connect-four/lessons/lesson-15-opening-sharp.json`

**Interfaces:**
- Consumes: `computeWindowCounts` (Task 1), `saveLessonFile` (Task 2).
- Produces: six slides carrying `showWindowCounts: true` and a stamped `windowCounts`; a test that fails if any stored array drifts from the recomputed one.

- [ ] **Step 1: Write the failing gate**

Append to `connect-four/tests/unit/lessonContent.test.js`. Add the import to the existing import block at the top:

```js
import { computeWindowCounts } from '../../server/windowCounts.js';
```

```js
// windowCounts is a DERIVED CACHE written by saveLessonFile, not authored copy. If someone
// edits a movestring by hand (or the recompute is ever bypassed), the board would render a
// stale, confidently-wrong number that nothing else catches — the value looks plausible and
// only a person opening that exact slide and recounting 69 windows would notice. This is
// that gate. Unconditional, not gated on REMEDIATED: the field is new, so every use is new.
test('lessonContent: windowCounts equals a fresh recompute from the slide movestring', () => {
  for (const { file, lesson } of lessons) {
    for (const [i, s] of (lesson.slides ?? []).entries()) {
      const where = `${file} slides[${i}]`;
      if (s.showWindowCounts !== true) {
        assert.equal(s.windowCounts, undefined,
          `${where}: windowCounts present without showWindowCounts — strip it`);
        continue;
      }
      assert.equal(typeof s.movestring, 'string', `${where}: showWindowCounts on a slide with no movestring`);
      assert.deepEqual(s.windowCounts, computeWindowCounts(s.movestring, lesson.userPerspective),
        `${where}: windowCounts is stale — re-run scripts/backfill-window-counts.mjs`);
    }
  }
});

test('lessonContent: showWindowCounts is a concept-slide field only', () => {
  for (const { file, lesson } of lessons) {
    assert.equal(lesson.socratic?.showWindowCounts, undefined,
      `${file}: showWindowCounts on socratic — the field is concept-slide only`);
    assert.equal(lesson.socratic?.windowCounts, undefined,
      `${file}: windowCounts on socratic — the field is concept-slide only`);
  }
});

test('lessonContent: the two opening lessons opt every concept slide into windowCounts', () => {
  // Locks in the shipped scope so a later edit cannot silently drop the overlay.
  for (const id of ['opening-centre', 'opening-sharp']) {
    const entry = lessons.find(l => l.lesson.id === id);
    assert.ok(entry, `no lesson with id "${id}"`);
    // opening-centre opts in 3 of its 4 slides; opening-sharp all 3 of its 3.
    const opted = entry.lesson.slides.filter(s => s.showWindowCounts === true).length;
    assert.equal(opted, 3, `${id}: expected 3 slides with showWindowCounts`);
  }
});
```

Note: `opening-centre` has 4 slides but only 3 opt in — slide 3 (`3333311115555`, the "I play where you play" slide) stays clean, because its point is the imitation shape, not cell value. Slides 1, 2 and 4 opt in.

- [ ] **Step 2: Run the gate to verify it fails**

Run: `cd connect-four && node --test tests/unit/lessonContent.test.js`
Expected: FAIL on the third test — `opening-centre: expected 3 slides with showWindowCounts` (actual 0). The first two tests pass vacuously; that is correct at this point.

- [ ] **Step 3: Write the backfill script**

Create `connect-four/scripts/backfill-window-counts.mjs`:

```js
#!/usr/bin/env node
/**
 * Backfill slides[].windowCounts for lessons that opt in via showWindowCounts.
 *
 * The counts are a derived cache; saveLessonFile stamps them on every admin write. This
 * script is for the one-time backfill and for repairing a file edited on disk outside the
 * admin API. It routes through saveLessonFile so there is exactly one implementation of
 * the stamping rule.
 *
 * Usage:
 *   node scripts/backfill-window-counts.mjs            # all lessons
 *   node scripts/backfill-window-counts.mjs <id> [id]  # only these lesson ids
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { saveLessonFile } from '../server/lessonAdmin.js';

const LESSONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '../lessons');

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`Backfill slides[].windowCounts into lesson JSON files.

Recomputes the derived per-cell live-window counts for every slide with
showWindowCounts: true, and strips windowCounts from every slide without it.
Routes through saveLessonFile, the same seam the admin API uses.

Usage:
  node scripts/backfill-window-counts.mjs             Backfill every lesson (default)
  node scripts/backfill-window-counts.mjs <id>...     Backfill only these lesson ids
  node scripts/backfill-window-counts.mjs --help      Show this message

Lessons directory: ${LESSONS_DIR}`);
  process.exit(0);
}

const only = new Set(args);
let touched = 0;
for (const file of fs.readdirSync(LESSONS_DIR).filter(f => /^lesson-\d+-.*\.json$/.test(f))) {
  const lesson = JSON.parse(fs.readFileSync(path.join(LESSONS_DIR, file), 'utf8'));
  if (only.size > 0 && !only.has(lesson.id)) continue;
  saveLessonFile(LESSONS_DIR, lesson);
  const opted = (lesson.slides ?? []).filter(s => s.showWindowCounts === true).length;
  console.log(`${file}: rewrote (${opted} slide${opted === 1 ? '' : 's'} with windowCounts)`);
  touched++;
}
console.log(`Done — ${touched} lesson file${touched === 1 ? '' : 's'} rewritten.`);
```

- [ ] **Step 4: Verify the script's --help exits 0 before doing anything**

Run: `cd connect-four && node scripts/backfill-window-counts.mjs --help; echo "exit=$?"`
Expected: the usage text, then `exit=0`. No files written.

- [ ] **Step 5: Opt the six slides in**

Add `"showWindowCounts": true` to these slide objects. Do **not** hand-write any `windowCounts` array — Step 6 generates them.

In `connect-four/lessons/lesson-04-opening-centre.json`:
- slide 1 (`"movestring": ""`)
- slide 2 (`"movestring": "333334444"`)
- slide 4 (`"movestring": "333"`)
- **not** slide 3 (`"movestring": "3333311115555"`)

In `connect-four/lessons/lesson-15-opening-sharp.json`: all three slides (`"333334444"`, `"3332223362"`, `"3332222"`).

- [ ] **Step 6: Run the backfill**

Run: `cd connect-four && node scripts/backfill-window-counts.mjs opening-centre opening-sharp`
Expected:
```
lesson-04-opening-centre.json: rewrote (3 slides with windowCounts)
lesson-15-opening-sharp.json: rewrote (3 slides with windowCounts)
Done — 2 lesson files rewritten.
```

- [ ] **Step 7: Verify the written values against an independent check**

Run:
```bash
cd connect-four && node -e "
const l = require('./lessons/lesson-04-opening-centre.json');
const s1 = l.slides[0].windowCounts, s4 = l.slides[3].windowCounts;
console.log('slide1 centre (3,2)=', s1[2][3], 'expect 13');
console.log('slide1 corner (0,0)=', s1[0][0], 'expect 3');
console.log('slide4 (3,3)=', s4[3][3], 'expect 11');
console.log('slide4 corner (0,0)=', s4[0][0], 'expect 3');
console.log('slide4 occupied (3,0)=', s4[0][3], 'expect null');
"
```
Expected: `13`, `3`, `11`, `3`, `null`.

- [ ] **Step 8: Fix the slide-4 coach text**

The board is `333` and the learner is green, so the cell above the centre stack now shows **11**, not the 13 the copy claims — green's two verticals through it are dead. The corner is unchanged at 3.

In `connect-four/lessons/lesson-04-opening-centre.json`, slide 4, replace the `coachMessages[0]` `text` and `text_es` (currently lines 93 and 95):

```json
"text": "Why is the centre worth so much? Count the lines. The next cell up the centre column still sits on 11 four-in-a-row lines you could finish — a corner cell sits on just 3.",
"text_es": "¿Por qué vale tanto el centro? Contá las líneas. La siguiente casilla de la columna central todavía se encuentra en 11 líneas de cuatro en línea que podrías completar — una casilla de esquina se encuentra en apenas 3."
```

Then append one sentence to that slide's `infoProse` and `infoProse_es`, so the on-board 11 does not read as contradicting the 13 the paragraph correctly states for an empty board:

- `infoProse` — append after the final sentence:
  `" On this board the numbers show 11 rather than 13 on that centre cell: gray's disc already sits inside two of its vertical lines, and a line with a gray disc in it can never be yours. That is the centre's advantage being spent, one line at a time. A high count is still not the same as a win — which of those lines you actually get to finish depends on who lands on which row, and that is the subject of a later lesson."`
- `infoProse_es` — append after the final sentence:
  `" En este tablero los números muestran 11 en lugar de 13 en esa casilla central: la ficha gris ya está dentro de dos de sus líneas verticales, y una línea con una ficha gris adentro nunca puede ser tuya. Esa es la ventaja del centro gastándose, una línea a la vez. Igual, un número alto no es lo mismo que una victoria — cuáles de esas líneas llegás a completar depende de quién cae en qué fila, y ese es el tema de una lección posterior."`

- [ ] **Step 8b: Add the scope guardrail to slide 1**

The overlay counts **lines through a square**, not the learner's chance of winning there. On slide 1 the two centre cells show 13 — the largest numbers on an empty board — and without this sentence a learner can read them as "these are the best squares to aim for". Parity, not line count, decides which of those lines they ever get to complete; that is lesson 07 ("Odd Rows Belong to Green"), which the wording forward-references without naming, so the Spanish copy does not depend on a translated lesson title.

In `connect-four/lessons/lesson-04-opening-centre.json`, slide 1, append to `infoProse` and `infoProse_es`:

- `infoProse` — append after the final sentence:
  `" The number on each square counts the lines that pass through it — it is not a ranking of where to play. Which of those lines you actually get to finish depends on who lands on which row, and that is its own lesson later on."`
- `infoProse_es` — append after the final sentence:
  `" El número en cada casilla cuenta las líneas que pasan por ella — no es un ranking de dónde jugar. Cuáles de esas líneas llegás a completar depende de quién cae en qué fila, y eso es una lección aparte más adelante."`

- [ ] **Step 9: Run the gate to verify it passes**

Run: `cd connect-four && node --test tests/unit/lessonContent.test.js tests/lessons/opening-lessons.test.js`
Expected: PASS.

- [ ] **Step 10: Prove the gate actually bites**

Temporarily corrupt one number to confirm the test fails for the right reason:
```bash
cd connect-four && node -e "
const fs=require('fs'), p='lessons/lesson-04-opening-centre.json';
const l=JSON.parse(fs.readFileSync(p,'utf8')); l.slides[3].windowCounts[3][3]=99;
fs.writeFileSync(p, JSON.stringify(l,null,2));
"
node --test tests/unit/lessonContent.test.js 2>&1 | grep -c "stale" ; node scripts/backfill-window-counts.mjs opening-centre
```
Expected: a non-zero count of "stale" matches, then the backfill restores the file. Re-run `node --test tests/unit/lessonContent.test.js` and confirm PASS.

- [ ] **Step 11: Run the full fast suite**

Run: `cd connect-four && npm run test:fast 2>&1 | tail -20`
Expected: all pass.

- [ ] **Step 12: Commit**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add connect-four/tests/unit/lessonContent.test.js connect-four/scripts/backfill-window-counts.mjs connect-four/lessons/lesson-04-opening-centre.json connect-four/lessons/lesson-15-opening-sharp.json
git commit -m "feat(lessons): backfill windowCounts for the opening lessons + staleness gate"
```

---

### Task 4: Render tint + number on the Board

**Files:**
- Modify: `connect-four/src/lib/lessonWindows.js`
- Modify: `connect-four/src/components/Board.jsx`
- Create: `connect-four/tests/dom/BoardWindowCounts.dom.test.jsx`
- Modify: `connect-four/package.json` (the `test:dom` script)
- Modify: `connect-four/tests/unit/lessonWindows.test.js`

**Interfaces:**
- Consumes: nothing from earlier tasks at runtime — Board renders whatever array it is handed.
- Produces: `WINDOW_COUNT_MAX = 13` and `windowCountTint(count) => string` (a CSS colour) from `src/lib/lessonWindows.js`; a new `windowCounts` prop on `Board` accepting `(number|null)[6][7] | null`.

The render is a plain DOM element inside the existing cell `<div>`, **not** a branch of the `zhSvg` layer: the cell div already exists per cell (`Board.jsx:305-319`) with `position: 'relative'` and `placeItems: 'center'`, so no coordinate maths and no `boardWidth`/`ResizeObserver` dependency is needed. (The spec's "third branch of zhSvg" note is superseded — SVG would re-derive geometry the CSS grid already has.)

`boardPropsAreEqual` (`src/lib/board.js:190-202`) iterates over the union of prop keys generically, so a new prop needs no comparator change — but the caller must pass a stable reference (Task 5 does).

- [ ] **Step 1: Write the failing tests**

Append to `connect-four/tests/unit/lessonWindows.test.js`:

```js
import { WINDOW_COUNT_MAX, windowCountTint } from '../../src/lib/lessonWindows.js';

test('windowCountTint: scales alpha against the fixed board maximum, not the board in hand', () => {
  // Fixed scale is the point: a mid-game board must read visibly dimmer than the opening,
  // because that decay IS the lesson. A per-board max would renormalise it away.
  assert.equal(WINDOW_COUNT_MAX, 13);
  assert.equal(windowCountTint(13), 'rgba(139, 92, 246, 0.55)');
  assert.equal(windowCountTint(0), 'transparent');
  const mid = windowCountTint(7);
  assert.match(mid, /^rgba\(139, 92, 246, 0\.2\d+\)$/);
});

test('windowCountTint: a count above the maximum is clamped, never over-saturated', () => {
  assert.equal(windowCountTint(99), 'rgba(139, 92, 246, 0.55)');
});
```

Create `connect-four/tests/dom/BoardWindowCounts.dom.test.jsx`:

```jsx
// Renders Board for real and asserts the DIGITS on screen, per the CLAUDE.md rule that a
// green test on the producer alone is not evidence the app shows the right thing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render, screen, cleanup } from '@testing-library/react';
import { Board } from '../../src/components/Board.jsx';

// Empty board, green learner — the pure-geometry case (13 centre, 3 corner).
const EMPTY_COUNTS = [
  [3, 4, 5, 7, 5, 4, 3],
  [4, 6, 8, 10, 8, 6, 4],
  [5, 8, 11, 13, 11, 8, 5],
  [5, 8, 11, 13, 11, 8, 5],
  [4, 6, 8, 10, 8, 6, 4],
  [3, 4, 5, 7, 5, 4, 3],
];

test('Board renders a digit in every empty cell when windowCounts is supplied', () => {
  cleanup();
  render(<Board windowCounts={EMPTY_COUNTS} />);
  // Both middle centre cells carry 13 — the board's maximum.
  assert.equal(screen.getAllByText('13').length, 2);
  // The four corners all carry 3, as do four other cells (row 5 outer, row 0 outer).
  assert.ok(screen.getAllByText('3').length >= 4);
});

test('Board renders no digits at all when windowCounts is omitted', () => {
  cleanup();
  render(<Board />);
  assert.equal(screen.queryByText('13'), null);
});

test('Board skips cells marked null (occupied) and renders 0 without a tint', () => {
  cleanup();
  const counts = EMPTY_COUNTS.map(r => [...r]);
  counts[0][3] = null;  // pretend a disc sits at (c3,r0)
  counts[0][0] = 0;     // fully blocked corner
  const board = Array.from({ length: 6 }, () => Array(7).fill('empty'));
  board[0][3] = 'red';
  render(<Board board={board} windowCounts={counts} />);
  const zero = screen.getByText('0');
  assert.ok(zero, 'a 0 count must still render its digit');
  assert.equal(zero.parentElement.style.background, 'transparent');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd connect-four && node --test tests/unit/lessonWindows.test.js`
Expected: FAIL — `windowCountTint` is not exported.

- [ ] **Step 3: Add the render-side constants**

Append to `connect-four/src/lib/lessonWindows.js`:

```js
/**
 * The largest number of four-in-a-row windows through any cell on an empty board (the two
 * middle cells of the centre column). The tint scale is pinned to this FIXED value rather
 * than to the maximum on the board being drawn: as the opponent kills lines the counts fall
 * and the board visibly dims, and that decay is the thing the overlay exists to show. A
 * per-board maximum would re-saturate every board and erase it.
 */
export const WINDOW_COUNT_MAX = 13;

/** Peak alpha, at a count of WINDOW_COUNT_MAX. Stays readable behind the digit. */
const WINDOW_COUNT_PEAK_ALPHA = 0.55;

/**
 * Violet, matching DEFAULT_WINDOW_HIGHLIGHT_COLOR (#8b5cf6): the app's neutral structural
 * colour, chosen so the overlay collides with neither the green/gray discs nor the amber
 * `claim` / red `tr` overlays.
 * @param {number} count
 * @returns {string} a CSS colour; 'transparent' at zero
 */
export function windowCountTint(count) {
  if (!count || count <= 0) return 'transparent';
  const alpha = Math.min(count, WINDOW_COUNT_MAX) / WINDOW_COUNT_MAX * WINDOW_COUNT_PEAK_ALPHA;
  return `rgba(139, 92, 246, ${Number(alpha.toFixed(4))})`;
}
```

- [ ] **Step 4: Add the Board prop and the per-cell render**

In `connect-four/src/components/Board.jsx`:

Add the import to the existing import block:
```js
import { windowCountTint } from '../lib/lessonWindows.js';
```

Add the prop to the `BoardImpl` signature, after `zhCells = []` (line 102):
```js
  // Per-cell live-window counts for lesson overlays — (number|null)[6][7], [row][col],
  // row 0 = bottom, null where a disc sits. Rendered only on EMPTY cells.
  windowCounts = null,
```

Inside the cell loop, after `const stepLabel = stepLabels[...]` (line 295), add:
```js
              const windowCount = windowCounts?.[r]?.[col] ?? null;
```

Then insert this block immediately **after** the `tg / td / tr / claim overlays` block (which ends at line 371) and before the deprecated-shim block, so the digit sits on top of any overlay:
```jsx
                  {/* Live-window count — how many four-in-a-rows the learner can still
                      finish through this square. Empty cells only. The tint is suppressed
                      where a per-cell overlay already colours the cell (slide 4 rings the
                      two cells its coach text compares), so the two never muddy. */}
                  {windowCount != null && value === 'empty' && (
                    <span style={{
                      position: 'absolute', inset: '8%', borderRadius: '50%',
                      background: ovType ? 'transparent' : windowCountTint(windowCount),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      pointerEvents: 'none', userSelect: 'none',
                    }}>
                      <span style={{
                        fontSize: compact ? 10 : 12,
                        fontWeight: 800,
                        color: 'var(--ink)',
                      }}>{windowCount}</span>
                    </span>
                  )}
```

- [ ] **Step 5: Register the DOM test**

In `connect-four/package.json`, append ` tests/dom/BoardWindowCounts.dom.test.jsx` to the end of the `test:dom` script's file list.

- [ ] **Step 6: Run both test layers to verify they pass**

Run: `cd connect-four && node --test tests/unit/lessonWindows.test.js && npm run test:dom 2>&1 | tail -20`
Expected: PASS in both.

- [ ] **Step 7: Run the full fast suite**

Run: `cd connect-four && npm run test:fast 2>&1 | tail -20`
Expected: all pass, including `tests/unit/boardMemoStability.test.js` (the comparator iterates prop keys generically, so the new prop needs no change there).

- [ ] **Step 8: Commit**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add connect-four/src/lib/lessonWindows.js connect-four/src/components/Board.jsx connect-four/tests/dom/BoardWindowCounts.dom.test.jsx connect-four/tests/unit/lessonWindows.test.js connect-four/package.json
git commit -m "feat(board): windowCounts prop renders per-cell tint and digit"
```

---

### Task 5: Wire ConceptScreen + legend + Spanish

**Files:**
- Modify: `connect-four/src/screens/ConceptScreen.jsx`
- Modify: `connect-four/src/i18n/en.json`
- Modify: `connect-four/src/i18n/es.json`

**Interfaces:**
- Consumes: `Board`'s `windowCounts` prop (Task 4); `slides[].windowCounts` (Task 3); `WINDOW_COUNT_MAX`/`windowCountTint` (Task 4).
- Produces: the shipped feature. Nothing depends on this task.

- [ ] **Step 1: Add the i18n keys**

The wording says **open to you**, not *winnable by you*: the overlay counts lines through a square, and parity — not line count — decides which of them the learner ever completes. Do not reword this into a claim about winning chances.

In `connect-four/src/i18n/en.json`, inside the existing `"lesson"` object (a sibling of `"node"` and `"confirmation"`), add:
```json
"windowCounts": {
  "legend": "Four-in-a-rows still open to you through each square"
},
```

In `connect-four/src/i18n/es.json`, at the same path:
```json
"windowCounts": {
  "legend": "Líneas de cuatro todavía abiertas para vos por cada casilla"
},
```

- [ ] **Step 2: Run the parity gate to verify the keys match**

Run: `cd connect-four && node --test tests/unit/i18nKeyParity.test.js`
Expected: PASS. (If it fails it names the exact dotted key path that is missing from one file — fix and re-run.)

- [ ] **Step 3: Memoize and pass the prop**

In `connect-four/src/screens/ConceptScreen.jsx`, add the import to the existing `lessonWindows.js` import on line 15:
```js
import { windowHighlightsToZhCells, WINDOW_HIGHLIGHT_COLOR, DEFAULT_WINDOW_HIGHLIGHT_COLOR, WINDOW_COUNT_MAX, windowCountTint } from '../lib/lessonWindows.js';
```

Immediately after the existing `zhCells` memo (which ends at line 122), add — it must stay **above** the loading/error early returns, per rules of hooks:
```js
  // Derived per-cell live-window counts (slides[].windowCounts), stamped into the lesson
  // JSON by saveLessonFile. Memoized for the same reason as zhCells: Board's
  // boardPropsAreEqual falls back to Object.is for non-`board` props, so a fresh-but-equal
  // array every render would defeat the memo.
  const windowCounts = useMemo(
    () => lesson?.slides?.[slideIndex]?.windowCounts ?? null,
    [lesson, slideIndex],
  );
```

Add the prop to the `<Board>` element (currently lines 173-178), after `zhCells={zhCells}`:
```jsx
          windowCounts={windowCounts}
```

- [ ] **Step 4: Add the legend row**

In the same file, change the `hasLegend` line (line 153) to account for the new row:
```js
  const hasLegend = legendItems.length > 0 || windowLegendItems.length > 0 || slide.showWindowCounts === true;
```

Then inside the legend container, immediately after the `windowLegendItems.map(...)` block (which ends at line 214), add:
```jsx
            {slide.showWindowCounts === true && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {/* Swatch at peak tint, so it reads as the darkest square on the board. */}
                <span style={{
                  display: 'inline-block',
                  width: 14,
                  height: 14,
                  borderRadius: 3,
                  background: windowCountTint(WINDOW_COUNT_MAX),
                  flexShrink: 0,
                }} />
                <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 600 }}>
                  {t('lesson.windowCounts.legend', 'Four-in-a-rows still open to you through each square')}
                </span>
              </div>
            )}
```

- [ ] **Step 5: Run the full fast suite**

Run: `cd connect-four && npm run test:fast 2>&1 | tail -20`
Expected: all pass.

- [ ] **Step 6: Verify in the browser — both languages**

The lesson cache is populated at server startup and these edits were made on disk, so the server must be restarted for them to be served.

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
eval "$(./worktree-ports.sh)"     # ALWAYS, every session — sets $API_PORT / $VITE_PORT
echo "API_PORT=$API_PORT VITE_PORT=$VITE_PORT"
```
Kill any server only by the exact `$API_PORT`/`$VITE_PORT` — never `pkill node`, never a bare port number. Then start the app (`npm run dev` from `connect-four/`) and open `http://localhost:$VITE_PORT` — **not** the API port, which does not serve the frontend.

Check, in the running app:
1. Lesson "Own the Centre" slide 1 — an empty board showing 13 at the two middle centre cells and 3 at each corner, tint darkest in the centre.
2. Slide 2 — dimmer overall (its maximum is 8), digits absent from every disc.
3. Slide 4 — **11** on the cell above the centre stack and **3** on the bottom-left corner; the two amber `claim` rings still visible, with the digit legible on top and no violet tint under them.
4. Slide 3 — no digits at all (it does not opt in).
5. Switch to Spanish and confirm the legend reads *"Líneas de cuatro todavía abiertas para vos por cada casilla"*, not the English string — and that slide 1's and slide 4's appended guardrail sentences are Spanish too, not silently falling back to English.
6. Narrow the window to a phone width and confirm the digits stay legible and the board does not overflow.

- [ ] **Step 7: Commit**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add connect-four/src/screens/ConceptScreen.jsx connect-four/src/i18n/en.json connect-four/src/i18n/es.json
git commit -m "feat(lessons): render the window-count overlay in ConceptScreen"
```

---

### Task 6: Document the contract

**Files:**
- Modify: `docs/architecture/lesson-editor.md`
- Modify: `docs/architecture/frontend-conventions.md`

Per CLAUDE.md's two-destination rule, conventions and contracts go in `docs/architecture/`, not memory. `docs/superpowers/` is throwaway.

- [ ] **Step 1: Document the authoring contract**

In `docs/architecture/lesson-editor.md`, add a section immediately after the existing `## Window highlights (slides[].windowHighlights)` section (which runs to roughly line 236):

```markdown
## Window counts (slides[].showWindowCounts / windowCounts)

Renders, in every EMPTY cell of a concept slide's board, how many four-in-a-row windows
through that cell still contain no opponent disc — as a violet tint plus the integer.

| key | type | meaning |
|---|---|---|
| `showWindowCounts` | boolean | Authored intent. The only field a human writes. |
| `windowCounts` | `(number\|null)[6][7]` | **Derived cache.** `[row][col]`, row 0 = bottom, `null` where a disc sits. Present iff `showWindowCounts` is true. |

- **Never hand-author `windowCounts`.** `saveLessonFile` (`server/lessonAdmin.js`) recomputes
  it from the slide's movestring on every admin write and strips it from slides that do not
  opt in, so editing a board in the editor refreshes it automatically. To repair a file
  edited directly on disk, run `node scripts/backfill-window-counts.mjs [lesson-id...]`.
- **Perspective is `lesson.userPerspective`, not the side to move.** Both opening lessons
  are `userPerspective: "red"` while most of their slides have gray to move; counting for
  the mover would show the opponent's opportunities in a lesson about where *you* should
  play.
- **The tint scale is pinned to a fixed maximum of 13** (`WINDOW_COUNT_MAX` in
  `src/lib/lessonWindows.js`), never to the maximum on the board being drawn. As the
  opponent kills lines the counts fall and the board visibly dims; a per-board maximum
  would re-saturate every board and erase that signal.
- **On an empty board the count is pure geometry** — 13 at the two middle centre cells,
  3 at a corner, 69 windows in total. That is the same formula, not a special case.
- **Concept slides only.** `socratic` ignores both fields; a content test enforces it.
- **The overlay is parity-blind, by design.** Window counts are vertically symmetric, so they
  express the *column* fact (the centre sits on far more lines) and cannot express the *row*
  fact (green completes lines on odd rows, gray on even). That is deliberate scope, not a
  gap: rows belong to `lesson-07-odd-rows-belong-to-red`. Copy must therefore describe the
  number as lines **open through** a square, never as a chance of winning there, and must not
  present the two 13-cells as "the best squares".
- **Enforcement:** `validateLesson` checks shape only (the loader excludes an invalid file
  entirely). Staleness is caught by `tests/unit/lessonContent.test.js`, which recomputes and
  fails loudly.
- The legend row is emitted by `ConceptScreen` from the i18n key
  `lesson.windowCounts.legend` — it does **not** go through `legendItems`, which requires a
  matching per-cell overlay type.
```

- [ ] **Step 2: Document the Board prop**

In `docs/architecture/frontend-conventions.md`, add a row to the Board prop table (around lines 222-240), matching the existing table's column layout:

```markdown
| `windowCounts` | `(number\|null)[6][7] \| null` | Per-cell live-window counts for lesson overlays; `[row][col]`, row 0 = bottom, `null` where a disc sits. Renders a violet tint + digit on EMPTY cells only; the tint is suppressed where a per-cell `overlays` entry already colours the cell. Must be memoized by the caller. See `lesson-editor.md` § Window counts. |
```

- [ ] **Step 3: Verify the docs match the code**

Run: `cd connect-four && grep -n "WINDOW_COUNT_MAX" src/lib/lessonWindows.js src/screens/ConceptScreen.jsx`
Expected: the constant is defined in `lessonWindows.js` and consumed in `ConceptScreen.jsx`, as the docs claim. Confirm the documented default (13) matches the definition.

- [ ] **Step 4: Commit**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add docs/architecture/lesson-editor.md docs/architecture/frontend-conventions.md
git commit -m "docs: window-count overlay authoring contract and Board prop"
```

---

## Self-review notes

**Spec coverage.** Every spec section maps to a task: geometry-over-simulation → Task 1; live-count semantics → Task 1; fixed-13 tint and violet hue → Task 4; precomputed cache at the save seam → Task 2; content-test staleness gate → Task 3; the lesson-04 prose fix → Task 3 Step 8; legend + Spanish → Task 5; scope of six slides → Task 3 Step 5.

**Two deviations from the spec, both flagged in place:**
1. Perspective is `lesson.userPerspective`, not movestring parity — see "Deviation" above. Changes the prose fix from "13→10 and 3→2" to "13→11 only".
2. The render is a DOM element in the existing cell div, not a third branch of `zhSvg` — SVG would re-derive geometry the CSS grid already provides, and would pull in the `boardWidth`/`ResizeObserver` dependency for no benefit.

**Unverified items a reviewer should confirm during execution:**
- `tests/unit/lessonAdmin.test.js`'s existing import block (Task 2 Step 1 assumes some imports exist and says to read the file first).
- Exact line/section anchors in `docs/architecture/lesson-editor.md` and `frontend-conventions.md` (Task 6) — located by heading, since line numbers drift.
