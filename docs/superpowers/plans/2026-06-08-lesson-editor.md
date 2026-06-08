# Lesson Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an in-app admin lesson editor at `/admin/lessons` that lets the author create and edit lesson JSON files visually (movestring-driven board, click-to-place overlays, form fields), with a hot-reload loop so lessons are immediately previewable in the real app.

**Architecture:** The editor lives in the React app under `/admin/lessons*`, rendered outside the normal Navigator/SCREENS system (same pattern as the existing `/admin` curation page). Saving POSTs lesson JSON to a new `/api/admin/lessons` server endpoint that writes the file to disk and calls `reloadLessons()` so the lesson is immediately live without a server restart. The board widget is movestring-driven: clicking a column appends to the movestring, overlays are placed separately via cell clicks.

**Tech Stack:** React (existing), Express (existing), `node:fs` for file writes, `node:test` + `node:assert` for server/lib unit tests, no new npm packages.

---

## File Structure

### New files

| File | Responsibility |
|---|---|
| `connect-four/server/adminAuth.js` | `requireAdmin` Express middleware — gates `/api/admin/*` |
| `connect-four/server/lessonAdmin.js` | File helpers: find/write/delete lesson files on disk |
| `connect-four/tests/unit/lessonAdmin.test.js` | Tests for lessonAdmin.js helpers |
| `connect-four/tests/unit/adminAuth.test.js` | Tests for requireAdmin middleware |
| `connect-four/src/lib/movestring.js` | Pure utils: parse movestring → board, board → boardSpec, append/undo/query |
| `connect-four/tests/unit/movestring.test.js` | Unit tests for movestring.js |
| `connect-four/src/components/admin/BoardEditor.jsx` | Board widget: movestring field + interactive board + overlay mode |
| `connect-four/src/components/admin/SlideEditor.jsx` | Single slide card: BoardEditor + coach messages + legend + infoProse |
| `connect-four/src/components/admin/SocraticEditor.jsx` | Socratic section: BoardEditor + correctCol picker with solver check |
| `connect-four/src/components/admin/LessonMetaForm.jsx` | Top-level lesson fields: title, id, order, free, userPerspective |
| `connect-four/src/screens/AdminLessonListScreen.jsx` | List all lessons with new/edit/delete |
| `connect-four/src/screens/AdminLessonEditorScreen.jsx` | Full lesson editor: assembles all sub-components, save/preview/delete |
| `connect-four/src/pages/AdminLessonsPage.jsx` | Entry page for `/admin/lessons*` — owns routing between list and editor |

### Modified files

| File | What changes |
|---|---|
| `connect-four/server/lessonLoader.js` | Export `validateLesson`; store `_dir`; add `reloadLessons()` and `getLessonsAll()` |
| `connect-four/server/index.js` | Import admin helpers; add `/api/admin/lessons` CRUD endpoints |
| `connect-four/src/components/Board.jsx` | Add optional `onCellClick` prop for cell-level click in overlay mode |
| `connect-four/src/App.jsx` | Route `/admin/lessons*` to `AdminLessonsPage` |
| `connect-four/tests/unit/lessonLoader.test.js` | Add tests for `reloadLessons`, `getLessonsAll`, `validateLesson` |

---

## Task 1: Extend `lessonLoader.js`

**Files:**
- Modify: `connect-four/server/lessonLoader.js`
- Modify: `connect-four/tests/unit/lessonLoader.test.js`

- [ ] **Step 1: Add failing tests for the new exports**

Append to `connect-four/tests/unit/lessonLoader.test.js`:

```js
import { loadLessons, getLessons, getLesson, reloadLessons, getLessonsAll, validateLesson } from '../../server/lessonLoader.js';

test('lessonLoader: reloadLessons re-reads the same directory', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lessons-reload-'));
  writeTempLesson(dir, 'lesson-01-test.json', makeValidLesson());
  loadLessons(dir);
  assert.equal(getLessons().length, 1);

  // Add a second lesson and reload
  writeTempLesson(dir, 'lesson-02-second.json', makeValidLesson({ id: 'second', title: 'Second' }));
  reloadLessons();
  assert.equal(getLessons().length, 2);
});

test('lessonLoader: getLessonsAll returns full lesson objects (not summaries)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lessons-all-'));
  const lesson = makeValidLesson({ confirmationCategory: 'immediate_threat', confirmationCount: 3 });
  writeTempLesson(dir, 'lesson-01-test.json', lesson);
  loadLessons(dir);

  const all = getLessonsAll();
  assert.equal(all.length, 1);
  assert.equal(all[0].confirmationCategory, 'immediate_threat');
  assert.equal(all[0].confirmationCount, 3);
  assert.ok('slides' in all[0], 'full object should include slides');
});

test('lessonLoader: validateLesson returns null for a valid lesson', () => {
  const err = validateLesson(makeValidLesson());
  assert.equal(err, null);
});

test('lessonLoader: validateLesson returns error string for missing id', () => {
  const bad = makeValidLesson();
  delete bad.id;
  const err = validateLesson(bad);
  assert.ok(typeof err === 'string' && err.length > 0, 'should return error string');
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd connect-four && node --test tests/unit/lessonLoader.test.js 2>&1 | tail -20
```

Expected: failures on `reloadLessons`, `getLessonsAll`, `validateLesson` (not exported yet).

- [ ] **Step 3: Implement the changes in `lessonLoader.js`**

```js
// At top, change:
let _lessons = [];
// To:
let _lessons = [];
let _dir = '';

// Change loadLessons signature to store _dir:
export function loadLessons(dir) {
  _dir = dir;
  _lessons = [];
  // ... rest of existing function body unchanged
}

// Add after loadLessons:
export function reloadLessons() {
  if (_dir) loadLessons(_dir);
}

export function getLessonsAll() {
  return [..._lessons];
}

// Change:
function validateLesson(lesson) {
// To:
export function validateLesson(lesson) {
```

- [ ] **Step 4: Run tests and verify they pass**

```bash
cd connect-four && node --test tests/unit/lessonLoader.test.js 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
cd connect-four && git add server/lessonLoader.js tests/unit/lessonLoader.test.js
git commit -m "feat: export reloadLessons, getLessonsAll, validateLesson from lessonLoader"
```

---

## Task 2: Create `adminAuth.js` middleware

**Files:**
- Create: `connect-four/server/adminAuth.js`
- Create: `connect-four/tests/unit/adminAuth.test.js`

- [ ] **Step 1: Write the failing test**

Create `connect-four/tests/unit/adminAuth.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';

// Load the module under test — must be imported AFTER setting env if needed
let requireAdmin;

function makeReq(email) {
  return { user: email ? { email } : null };
}
function makeRes() {
  const res = { statusCode: 200, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
}

// requireAdmin reads process.env.NODE_ENV at call time, so we can change it between tests.
test('requireAdmin: calls next() in development env regardless of user', async () => {
  process.env.NODE_ENV = 'development';
  ({ requireAdmin } = await import('../../server/adminAuth.js'));

  const next = () => { next.called = true; };
  const res = makeRes();
  requireAdmin(makeReq(null), res, next);
  assert.ok(next.called, 'next() should be called in development');
});

test('requireAdmin: returns 403 in production when no user', async () => {
  ({ requireAdmin } = await import('../../server/adminAuth.js'));
  process.env.NODE_ENV = 'production';

  const next = () => { next.called = true; };
  const res = makeRes();
  requireAdmin(makeReq(null), res, next);
  assert.equal(res.statusCode, 403);
  assert.ok(!next.called, 'next() should NOT be called');

  process.env.NODE_ENV = 'development';
});

test('requireAdmin: returns 403 in production for non-admin email', async () => {
  ({ requireAdmin } = await import('../../server/adminAuth.js'));
  process.env.NODE_ENV = 'production';
  process.env.ADMIN_EMAILS = 'admin@example.com';

  const next = () => { next.called = true; };
  const res = makeRes();
  requireAdmin(makeReq('other@example.com'), res, next);
  assert.equal(res.statusCode, 403);
  assert.ok(!next.called);

  process.env.NODE_ENV = 'development';
  delete process.env.ADMIN_EMAILS;
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd connect-four && node --test tests/unit/adminAuth.test.js 2>&1 | tail -10
```

Expected: fails — module not found.

- [ ] **Step 3: Create `connect-four/server/adminAuth.js`**

```js
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'elsonidoq@gmail.com')
  .split(',').map(e => e.trim());

export function requireAdmin(req, res, next) {
  if (process.env.NODE_ENV !== 'production') return next();
  if (!req.user || !ADMIN_EMAILS.includes(req.user.email)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}
```

- [ ] **Step 4: Run tests and verify they pass**

```bash
cd connect-four && node --test tests/unit/adminAuth.test.js 2>&1 | tail -10
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
cd connect-four && git add server/adminAuth.js tests/unit/adminAuth.test.js
git commit -m "feat: add admin auth middleware"
```

---

## Task 3: Create `lessonAdmin.js` file helpers

**Files:**
- Create: `connect-four/server/lessonAdmin.js`
- Create: `connect-four/tests/unit/lessonAdmin.test.js`

- [ ] **Step 1: Write failing tests**

Create `connect-four/tests/unit/lessonAdmin.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { lessonFilePath, findLessonFile, saveLessonFile, deleteLessonFile } from '../../server/lessonAdmin.js';

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ladmin-'));
}

const SAMPLE = {
  id: 'test-lesson',
  title: 'Test',
  order: 3,
  free: true,
  userPerspective: 'red',
  slides: [],
  socratic: null,
  confirmationCategory: null,
  confirmationCount: 0,
};

test('lessonFilePath: returns correct filename for order=3, id=test-lesson', () => {
  const p = lessonFilePath('/lessons', SAMPLE);
  assert.ok(p.endsWith('lesson-03-test-lesson.json'), `got: ${p}`);
});

test('findLessonFile: returns filename when lesson exists', () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, 'lesson-03-test-lesson.json'), '{}');
  const found = findLessonFile(dir, 'test-lesson');
  assert.equal(found, 'lesson-03-test-lesson.json');
});

test('findLessonFile: returns null when lesson does not exist', () => {
  const dir = tmpDir();
  const found = findLessonFile(dir, 'nonexistent');
  assert.equal(found, null);
});

test('saveLessonFile: writes JSON to disk at the correct path', () => {
  const dir = tmpDir();
  saveLessonFile(dir, SAMPLE);
  const file = path.join(dir, 'lesson-03-test-lesson.json');
  assert.ok(fs.existsSync(file), 'file should exist');
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(parsed.id, SAMPLE.id);
});

test('saveLessonFile: deletes old file when id changes', () => {
  const dir = tmpDir();
  // Write old file with different id
  const oldPath = path.join(dir, 'lesson-03-old-id.json');
  fs.writeFileSync(oldPath, '{}');

  saveLessonFile(dir, SAMPLE, 'old-id');
  assert.ok(!fs.existsSync(oldPath), 'old file should be deleted');
  assert.ok(fs.existsSync(path.join(dir, 'lesson-03-test-lesson.json')), 'new file should exist');
});

test('deleteLessonFile: removes the file for the given id', () => {
  const dir = tmpDir();
  const file = path.join(dir, 'lesson-03-test-lesson.json');
  fs.writeFileSync(file, '{}');
  deleteLessonFile(dir, 'test-lesson');
  assert.ok(!fs.existsSync(file), 'file should be deleted');
});

test('deleteLessonFile: does not throw when lesson file does not exist', () => {
  const dir = tmpDir();
  assert.doesNotThrow(() => deleteLessonFile(dir, 'nonexistent'));
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd connect-four && node --test tests/unit/lessonAdmin.test.js 2>&1 | tail -10
```

Expected: fails — module not found.

- [ ] **Step 3: Create `connect-four/server/lessonAdmin.js`**

```js
import fs from 'node:fs';
import path from 'node:path';

export function lessonFilePath(dir, lesson) {
  const prefix = String(lesson.order).padStart(2, '0');
  return path.join(dir, `lesson-${prefix}-${lesson.id}.json`);
}

export function findLessonFile(dir, id) {
  const files = fs.readdirSync(dir);
  return files.find(f => new RegExp(`^lesson-\\d+-${id}\\.json$`).test(f)) ?? null;
}

/**
 * Write lesson to disk. If oldId is provided and differs from lesson.id,
 * the old file is deleted first (handles rename).
 */
export function saveLessonFile(dir, lesson, oldId = null) {
  if (oldId && oldId !== lesson.id) {
    const oldFile = findLessonFile(dir, oldId);
    if (oldFile) fs.unlinkSync(path.join(dir, oldFile));
  }
  fs.writeFileSync(lessonFilePath(dir, lesson), JSON.stringify(lesson, null, 2), 'utf8');
}

export function deleteLessonFile(dir, id) {
  const filename = findLessonFile(dir, id);
  if (filename) fs.unlinkSync(path.join(dir, filename));
}
```

- [ ] **Step 4: Run tests and verify they pass**

```bash
cd connect-four && node --test tests/unit/lessonAdmin.test.js 2>&1 | tail -10
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
cd connect-four && git add server/lessonAdmin.js tests/unit/lessonAdmin.test.js
git commit -m "feat: add lessonAdmin file helpers"
```

---

## Task 4: Add admin endpoints to `index.js`

**Files:**
- Modify: `connect-four/server/index.js`

- [ ] **Step 1: Add imports at the top of `index.js`**

Add after the existing `lessonLoader` import (line 22):

```js
import { reloadLessons, getLessonsAll, validateLesson } from './lessonLoader.js';
import { requireAdmin } from './adminAuth.js';
import { saveLessonFile, deleteLessonFile } from './lessonAdmin.js';
```

Also add a constant for the lessons directory after the existing `loadLessons` call (line 43):

```js
const LESSONS_DIR = join(__dirname, '../lessons');
```

- [ ] **Step 2: Add the 5 admin endpoints**

Add after the existing lesson endpoints (after `app.get('/api/lessons/:id', ...)`, around line 275):

```js
// ── Admin lesson endpoints ─────────────────────────────────────────────────────

app.get('/api/admin/lessons', requireAdmin, (req, res) => {
  res.json(getLessonsAll());
});

app.get('/api/admin/lessons/:id', requireAdmin, (req, res) => {
  const all = getLessonsAll();
  const lesson = all.find(l => l.id === req.params.id);
  if (!lesson) return res.status(404).json({ error: 'Not found' });
  res.json(lesson);
});

app.post('/api/admin/lessons', requireAdmin, (req, res) => {
  const lesson = req.body;
  const err = validateLesson(lesson);
  if (err) return res.status(400).json({ error: err });
  try {
    saveLessonFile(LESSONS_DIR, lesson);
    reloadLessons();
    res.status(201).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/admin/lessons/:id', requireAdmin, (req, res) => {
  const lesson = req.body;
  const err = validateLesson(lesson);
  if (err) return res.status(400).json({ error: err });
  try {
    const oldId = req.params.id !== lesson.id ? req.params.id : null;
    saveLessonFile(LESSONS_DIR, lesson, oldId);
    reloadLessons();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/admin/lessons/:id', requireAdmin, (req, res) => {
  try {
    deleteLessonFile(LESSONS_DIR, req.params.id);
    reloadLessons();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
```

- [ ] **Step 3: Run the fast test suite to check nothing broke**

```bash
cd connect-four && npm run test:fast 2>&1 | tail -20
```

Expected: all existing tests still pass.

- [ ] **Step 4: Smoke-test the endpoints manually**

With the dev server running (`npm run dev` in connect-four/), in a separate terminal:

```bash
# List lessons (should return all 11)
curl -s http://localhost:3001/api/admin/lessons | jq 'length'
# Expected: 11

# Fetch one lesson
curl -s http://localhost:3001/api/admin/lessons/immediate-threat | jq '.id'
# Expected: "immediate-threat"
```

- [ ] **Step 5: Commit**

```bash
cd connect-four && git add server/index.js
git commit -m "feat: add /api/admin/lessons CRUD endpoints"
```

---

## Task 5: Create `movestring.js` utility

**Files:**
- Create: `connect-four/src/lib/movestring.js`
- Create: `connect-four/tests/unit/movestring.test.js`

- [ ] **Step 1: Write failing tests**

Create `connect-four/tests/unit/movestring.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseMovestring,
  boardToSpec,
  appendMove,
  undoMove,
  isColFull,
  nextPlayer,
  getColHeights,
} from '../../src/lib/movestring.js';

test('parseMovestring: empty string → all-empty 6×7 board', () => {
  const board = parseMovestring('');
  assert.equal(board.length, 6);
  assert.equal(board[0].length, 7);
  assert.ok(board.every(row => row.every(v => v === 'empty')));
});

test('parseMovestring: "3" → red disc at row 0 col 3', () => {
  const board = parseMovestring('3');
  assert.equal(board[0][3], 'red');
  assert.equal(board[1][3], 'empty');
});

test('parseMovestring: "33" → red at row 0, yellow at row 1, same column', () => {
  const board = parseMovestring('33');
  assert.equal(board[0][3], 'red');
  assert.equal(board[1][3], 'yellow');
});

test('parseMovestring: "34" → red at col 3 row 0, yellow at col 4 row 0', () => {
  const board = parseMovestring('34');
  assert.equal(board[0][3], 'red');
  assert.equal(board[0][4], 'yellow');
});

test('boardToSpec: empty board → 7 empty strings', () => {
  const board = parseMovestring('');
  const spec = boardToSpec(board);
  assert.deepEqual(spec, ['', '', '', '', '', '', '']);
});

test('boardToSpec: red disc at col 3 row 0 → spec[3] === "g"', () => {
  const board = parseMovestring('3');
  const spec = boardToSpec(board);
  assert.equal(spec[3], 'g');
});

test('boardToSpec: red at row 0, yellow at row 1 → spec[col] === "gd"', () => {
  const board = parseMovestring('33');
  const spec = boardToSpec(board);
  assert.equal(spec[3], 'gd');
});

test('appendMove: appends column digit to movestring', () => {
  assert.equal(appendMove('33', 4), '334');
  assert.equal(appendMove('', 0), '0');
});

test('undoMove: removes last character', () => {
  assert.equal(undoMove('334'), '33');
  assert.equal(undoMove(''), '');
});

test('isColFull: returns true when column has 6 discs', () => {
  const ms = '000000'; // 6 discs in col 0
  assert.ok(isColFull(ms, 0));
  assert.ok(!isColFull(ms, 1));
});

test('nextPlayer: returns "red" for even-length movestring', () => {
  assert.equal(nextPlayer(''), 'red');
  assert.equal(nextPlayer('33'), 'red');
});

test('nextPlayer: returns "yellow" for odd-length movestring', () => {
  assert.equal(nextPlayer('3'), 'yellow');
  assert.equal(nextPlayer('334'), 'yellow');
});

test('getColHeights: counts discs per column', () => {
  const h = getColHeights('03301');
  assert.equal(h[0], 2);
  assert.equal(h[3], 2);
  assert.equal(h[1], 1);
  assert.equal(h[2], 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd connect-four && node --test tests/unit/movestring.test.js 2>&1 | tail -10
```

Expected: fails — module not found.

- [ ] **Step 3: Create `connect-four/src/lib/movestring.js`**

```js
/**
 * Movestring utilities for the lesson editor.
 * Movestrings use 0-indexed columns (0–6). Only c4solver-wrapper.js
 * ever translates to 1-indexed; nothing here should.
 *
 * Player assignment: odd move index (0-based) = 'yellow'; even = 'red'.
 * i.e. move 0 (first move) is red, move 1 is yellow, etc.
 */

/** Parse a movestring into a 6×7 board array ('empty' | 'red' | 'yellow'). */
export function parseMovestring(movestring) {
  const board = Array.from({ length: 6 }, () => Array(7).fill('empty'));
  const heights = Array(7).fill(0);
  for (let i = 0; i < movestring.length; i++) {
    const col = parseInt(movestring[i], 10);
    if (isNaN(col) || col < 0 || col > 6) continue;
    const row = heights[col];
    if (row >= 6) continue;
    board[row][col] = i % 2 === 0 ? 'red' : 'yellow';
    heights[col]++;
  }
  return board;
}

/**
 * Convert a board array to a boardSpec (7-element string array).
 * 'red' → 'g', 'yellow' → 'd'. Stops at the first empty cell per column.
 */
export function boardToSpec(board) {
  const spec = Array(7).fill('');
  for (let c = 0; c < 7; c++) {
    for (let r = 0; r < 6; r++) {
      if (board[r][c] === 'empty') break;
      spec[c] += board[r][c] === 'red' ? 'g' : 'd';
    }
  }
  return spec;
}

export function appendMove(movestring, col) {
  return movestring + String(col);
}

export function undoMove(movestring) {
  return movestring.slice(0, -1);
}

export function getColHeights(movestring) {
  const h = Array(7).fill(0);
  for (const ch of movestring) {
    const col = parseInt(ch, 10);
    if (!isNaN(col) && col >= 0 && col <= 6) h[col]++;
  }
  return h;
}

export function isColFull(movestring, col) {
  return getColHeights(movestring)[col] >= 6;
}

export function nextPlayer(movestring) {
  return movestring.length % 2 === 0 ? 'red' : 'yellow';
}
```

- [ ] **Step 4: Run tests and verify they pass**

```bash
cd connect-four && node --test tests/unit/movestring.test.js 2>&1 | tail -10
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
cd connect-four && git add src/lib/movestring.js tests/unit/movestring.test.js
git commit -m "feat: add movestring utility functions for lesson editor"
```

---

## Task 6: Add `onCellClick` to `Board.jsx`

**Files:**
- Modify: `connect-four/src/components/Board.jsx`

The Board component currently supports `onColumnClick` (fires when user clicks a column). For overlay placement in the editor, we need cell-level clicks. This task adds an optional `onCellClick` prop.

- [ ] **Step 1: Add `onCellClick` to the Board props destructuring**

In `Board.jsx`, find the props destructuring (around line 80) and add `onCellClick`:

```jsx
export function Board({
  board = EMPTY_BOARD,
  onColumnClick,
  onCellClick,          // ← add this line
  canPlay = false,
  overlays = [],
  // ... rest unchanged
```

**No change needed to `handleClick` or `tappable`.** `tappable` is defined as `canPlay && !colFull` (line 179). `BoardEditor` passes `canPlay={false}` when in overlay mode, which already blocks column-level clicks. Nothing to change here.

- [ ] **Step 2: Add `onClick` to each cell div**

Inside the column map, find the cell rendering loop `{[5,4,3,2,1,0].map(r => {` (around line 258) and add an `onClick` to the outer cell `<div>`:

```jsx
<div
  key={r}
  onClick={onCellClick ? (e) => { e.stopPropagation(); onCellClick(col, r); } : undefined}
  style={{
    aspectRatio: 1,
    borderRadius: '50%',
    background: 'var(--hole)',
    boxShadow: 'inset 0 3px 5px rgba(150,120,60,0.28), inset 0 -1px 0 rgba(255,255,255,0.6)',
    position: 'relative',
    display: 'grid',
    placeItems: 'center',
    cursor: onCellClick ? 'crosshair' : undefined,  // ← visual cue in overlay mode
  }}
>
```

- [ ] **Step 4: Test visually**

Start the dev server and open the existing lesson screen — verify the Board still works normally with no `onCellClick` prop.

```bash
cd connect-four && npm run dev
```

Open `http://localhost:5173` and navigate to a lesson. Confirm that board interaction is unchanged.

- [ ] **Step 5: Commit**

```bash
cd connect-four && git add src/components/Board.jsx
git commit -m "feat: add onCellClick prop to Board for overlay editing"
```

---

## Task 7: Create `BoardEditor.jsx`

**Files:**
- Create: `connect-four/src/components/admin/BoardEditor.jsx`

This is the core editor widget: a movestring text field bidirectionally synced with the interactive board, plus an overlay mode toggle.

- [ ] **Step 1: Create the directory and file**

```bash
mkdir -p connect-four/src/components/admin
```

Create `connect-four/src/components/admin/BoardEditor.jsx`:

```jsx
import React, { useState, useCallback } from 'react';
import { Board } from '../Board.jsx';
import {
  parseMovestring, boardToSpec, appendMove, undoMove, isColFull,
} from '../../lib/movestring.js';

const OVERLAY_TYPES = ['tg', 'td', 'claim', 'win'];
const OVERLAY_LABELS = { tg: 'tg (user threat)', td: 'td (opp threat)', claim: 'claim', win: 'win' };
const OVERLAY_COLORS = { tg: '#4ade80', td: '#9ca3af', claim: '#fbbf24', win: '#60a5fa' };

/**
 * Props:
 *   movestring: string
 *   overlays: Array<{c, r, type}>
 *   onMovestringChange: (ms: string) => void
 *   onOverlaysChange: (overlays: Array<{c,r,type}>) => void
 *   label: string  (optional, shown above the widget)
 */
export default function BoardEditor({ movestring, overlays, onMovestringChange, onOverlaysChange, label }) {
  const [mode, setMode] = useState('disc');
  const [activeType, setActiveType] = useState('tg');

  const board = parseMovestring(movestring);

  const handleColumnClick = useCallback((col) => {
    if (isColFull(movestring, col)) return;
    onMovestringChange(appendMove(movestring, col));
  }, [movestring, onMovestringChange]);

  const handleCellClick = useCallback((col, row) => {
    const idx = overlays.findIndex(o => o.c === col && o.r === row);
    if (idx >= 0) {
      onOverlaysChange(overlays.filter((_, i) => i !== idx));
    } else {
      onOverlaysChange([...overlays, { c: col, r: row, type: activeType }]);
    }
  }, [overlays, activeType, onOverlaysChange]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {label && <div style={{ fontWeight: 600, fontSize: 13, color: '#888' }}>{label}</div>}

      {/* Movestring field */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input
          value={movestring}
          onChange={e => onMovestringChange(e.target.value)}
          placeholder="movestring (e.g. 3332111)"
          style={{ flex: 1, fontFamily: 'monospace', padding: '4px 8px', borderRadius: 6, border: '1px solid #555', background: '#1a1a1a', color: '#fff' }}
        />
        <button
          onClick={() => onMovestringChange(undoMove(movestring))}
          disabled={!movestring.length}
          style={{ padding: '4px 10px', borderRadius: 6, cursor: 'pointer' }}
        >
          Undo
        </button>
        <button
          onClick={() => onMovestringChange('')}
          disabled={!movestring.length}
          style={{ padding: '4px 10px', borderRadius: 6, cursor: 'pointer' }}
        >
          Clear
        </button>
      </div>

      {/* Mode toolbar */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={() => setMode('disc')}
          style={{ padding: '3px 10px', borderRadius: 6, cursor: 'pointer', fontWeight: mode === 'disc' ? 700 : 400, border: mode === 'disc' ? '2px solid #4ade80' : '1px solid #555' }}
        >
          Disc
        </button>
        <button
          onClick={() => setMode('overlay')}
          style={{ padding: '3px 10px', borderRadius: 6, cursor: 'pointer', fontWeight: mode === 'overlay' ? 700 : 400, border: mode === 'overlay' ? '2px solid #fbbf24' : '1px solid #555' }}
        >
          Overlay
        </button>
        {mode === 'overlay' && OVERLAY_TYPES.map(t => (
          <button
            key={t}
            onClick={() => setActiveType(t)}
            style={{
              padding: '3px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12,
              background: activeType === t ? OVERLAY_COLORS[t] : 'transparent',
              color: activeType === t ? '#000' : '#ccc',
              border: `1px solid ${OVERLAY_COLORS[t]}`,
            }}
          >
            {OVERLAY_LABELS[t]}
          </button>
        ))}
        {mode === 'overlay' && (
          <button
            onClick={() => onOverlaysChange([])}
            style={{ padding: '3px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, border: '1px solid #555' }}
          >
            Clear overlays
          </button>
        )}
      </div>

      {/* Board */}
      <Board
        board={board}
        overlays={overlays}
        onColumnClick={mode === 'disc' ? handleColumnClick : undefined}
        onCellClick={mode === 'overlay' ? handleCellClick : undefined}
        canPlay={mode === 'disc'}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify manually**

We'll test this component when it's wired into the full editor (Task 10). For now, run the test suite to ensure no import errors or broken tests:

```bash
cd connect-four && npm run test:fast 2>&1 | tail -10
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
cd connect-four && git add src/components/admin/BoardEditor.jsx
git commit -m "feat: add BoardEditor component for lesson editor"
```

---

## Task 8: Create `SlideEditor.jsx`

**Files:**
- Create: `connect-four/src/components/admin/SlideEditor.jsx`

A card that edits a single slide: board (via BoardEditor), coach messages, legend items (auto-synced with overlays), and infoProse.

- [ ] **Step 1: Create `connect-four/src/components/admin/SlideEditor.jsx`**

```jsx
import React, { useEffect } from 'react';
import BoardEditor from './BoardEditor.jsx';

const MOOD_OPTIONS = ['happy', 'think'];
const DEFAULT_LEGEND_LABEL = { tg: 'User threat', td: 'Opponent threat', claim: 'Claimed cell', win: 'Winning move' };

/**
 * Sync legend items to match current overlay types.
 * Keeps existing labels for types that are still present; adds defaults for new types;
 * removes entries for types no longer in overlays.
 */
function syncLegend(overlays, legendItems) {
  const types = [...new Set(overlays.map(o => o.type))];
  return types.map(t => {
    const existing = legendItems.find(li => li.type === t);
    return existing ?? { type: t, label: DEFAULT_LEGEND_LABEL[t] ?? t };
  });
}

/**
 * Props:
 *   slide: { movestring, overlays, coachMessages, legendItems, infoProse }
 *   index: number
 *   total: number
 *   onChange: (updatedSlide) => void
 *   onMoveUp: () => void
 *   onMoveDown: () => void
 *   onDelete: () => void
 */
export default function SlideEditor({ slide, index, total, onChange, onMoveUp, onMoveDown, onDelete }) {
  // Auto-sync legend when overlays change
  useEffect(() => {
    const synced = syncLegend(slide.overlays, slide.legendItems);
    if (JSON.stringify(synced) !== JSON.stringify(slide.legendItems)) {
      onChange({ ...slide, legendItems: synced });
    }
  }, [slide.overlays]); // eslint-disable-line react-hooks/exhaustive-deps

  function updateField(key, value) {
    onChange({ ...slide, [key]: value });
  }

  function updateCoachMessage(i, key, value) {
    const msgs = slide.coachMessages.map((m, j) => j === i ? { ...m, [key]: value } : m);
    onChange({ ...slide, coachMessages: msgs });
  }

  function addCoachMessage() {
    onChange({ ...slide, coachMessages: [...slide.coachMessages, { text: '', mood: 'happy' }] });
  }

  function removeCoachMessage(i) {
    onChange({ ...slide, coachMessages: slide.coachMessages.filter((_, j) => j !== i) });
  }

  function updateLegendLabel(i, label) {
    const items = slide.legendItems.map((li, j) => j === i ? { ...li, label } : li);
    onChange({ ...slide, legendItems: items });
  }

  const card = { background: '#1e1e1e', border: '1px solid #333', borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 };
  const label = { fontWeight: 600, fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 1 };
  const input = { padding: '6px 10px', borderRadius: 6, border: '1px solid #444', background: '#111', color: '#fff', width: '100%', boxSizing: 'border-box' };

  return (
    <div style={card}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, color: '#fff' }}>Slide {index + 1}</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={onMoveUp} disabled={index === 0} style={{ padding: '2px 8px' }}>↑</button>
          <button onClick={onMoveDown} disabled={index === total - 1} style={{ padding: '2px 8px' }}>↓</button>
          <button onClick={onDelete} style={{ padding: '2px 8px', color: '#f87171' }}>✕</button>
        </div>
      </div>

      {/* Board */}
      <BoardEditor
        label="Board"
        movestring={slide.movestring ?? ''}
        overlays={slide.overlays ?? []}
        onMovestringChange={ms => updateField('movestring', ms)}
        onOverlaysChange={ov => updateField('overlays', ov)}
      />

      {/* Coach messages */}
      <div>
        <div style={label}>Coach messages</div>
        {slide.coachMessages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
            <input
              value={msg.text}
              onChange={e => updateCoachMessage(i, 'text', e.target.value)}
              placeholder="Coach message text"
              style={{ ...input, flex: 1 }}
            />
            <select value={msg.mood} onChange={e => updateCoachMessage(i, 'mood', e.target.value)} style={{ padding: '6px', borderRadius: 6, border: '1px solid #444', background: '#111', color: '#fff' }}>
              {MOOD_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <button onClick={() => removeCoachMessage(i)} style={{ padding: '2px 8px', color: '#f87171' }}>✕</button>
          </div>
        ))}
        <button onClick={addCoachMessage} style={{ marginTop: 8, padding: '4px 12px', borderRadius: 6 }}>+ Add message</button>
      </div>

      {/* Legend items (auto-synced, labels editable) */}
      {slide.legendItems.length > 0 && (
        <div>
          <div style={label}>Legend</div>
          {slide.legendItems.map((li, i) => (
            <div key={li.type} style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
              <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#aaa', width: 48 }}>{li.type}</span>
              <input
                value={li.label}
                onChange={e => updateLegendLabel(i, e.target.value)}
                style={{ ...input, flex: 1 }}
                placeholder="Legend label"
              />
            </div>
          ))}
        </div>
      )}

      {/* infoProse */}
      <div>
        <div style={label}>Info prose</div>
        <textarea
          value={slide.infoProse ?? ''}
          onChange={e => updateField('infoProse', e.target.value)}
          rows={3}
          style={{ ...input, resize: 'vertical' }}
          placeholder="Explanatory text shown below the board"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run the test suite**

```bash
cd connect-four && npm run test:fast 2>&1 | tail -10
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
cd connect-four && git add src/components/admin/SlideEditor.jsx
git commit -m "feat: add SlideEditor component"
```

---

## Task 9: Create `SocraticEditor.jsx`

**Files:**
- Create: `connect-four/src/components/admin/SocraticEditor.jsx`

The socratic section: a board editor plus a correctCol picker that verifies the chosen column against the solver.

- [ ] **Step 1: Create `connect-four/src/components/admin/SocraticEditor.jsx`**

```jsx
import React, { useState, useCallback } from 'react';
import BoardEditor from './BoardEditor.jsx';

const COL_LABELS = ['0', '1', '2', '3', '4', '5', '6'];

/**
 * Props:
 *   enabled: boolean
 *   socratic: { movestring, overlays, correctCol } | null
 *   onChange: (socratic | null) => void
 */
export default function SocraticEditor({ enabled, socratic, onChange }) {
  const [verifyState, setVerifyState] = useState(null); // null | 'checking' | 'ok' | 'bad'

  const empty = { movestring: '', overlays: [], correctCol: null };

  function toggle() {
    onChange(enabled ? null : empty);
  }

  function updateField(key, value) {
    onChange({ ...socratic, [key]: value });
    if (key === 'correctCol') setVerifyState(null);
  }

  const verifySolver = useCallback(async (col, movestring) => {
    if (movestring === '') { setVerifyState('bad'); return; }
    setVerifyState('checking');
    try {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moves: movestring }),
      });
      const data = await res.json();
      const score = data.scores?.[col];
      setVerifyState(typeof score === 'number' && score > 0 ? 'ok' : 'bad');
    } catch {
      setVerifyState('bad');
    }
  }, []);

  function selectCorrectCol(col) {
    updateField('correctCol', col);
    verifySolver(col, socratic?.movestring ?? '');
  }

  const label = { fontWeight: 600, fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 1 };
  const card = { background: '#1e1e1e', border: '1px solid #333', borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 };

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <input type="checkbox" checked={enabled} onChange={toggle} id="socratic-toggle" />
        <label htmlFor="socratic-toggle" style={{ fontWeight: 700, color: '#fff', cursor: 'pointer' }}>Socratic board</label>
      </div>

      {enabled && socratic && (
        <>
          <BoardEditor
            label="Socratic position"
            movestring={socratic.movestring ?? ''}
            overlays={socratic.overlays ?? []}
            onMovestringChange={ms => { updateField('movestring', ms); setVerifyState(null); }}
            onOverlaysChange={ov => updateField('overlays', ov)}
          />

          <div>
            <div style={label}>Correct column</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
              {COL_LABELS.map((cl, col) => (
                <button
                  key={col}
                  onClick={() => selectCorrectCol(col)}
                  style={{
                    width: 36, height: 36, borderRadius: 6, cursor: 'pointer',
                    fontWeight: socratic.correctCol === col ? 700 : 400,
                    background: socratic.correctCol === col ? '#2563eb' : '#222',
                    color: '#fff',
                    border: socratic.correctCol === col ? '2px solid #60a5fa' : '1px solid #444',
                  }}
                >
                  {cl}
                </button>
              ))}
              {verifyState === 'checking' && <span style={{ color: '#aaa', fontSize: 12 }}>Checking…</span>}
              {verifyState === 'ok' && <span style={{ color: '#4ade80', fontSize: 12 }}>✓ Solver confirms winning move</span>}
              {verifyState === 'bad' && <span style={{ color: '#f87171', fontSize: 12 }}>⚠ Not a winning move (or empty board)</span>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run the test suite**

```bash
cd connect-four && npm run test:fast 2>&1 | tail -10
```

- [ ] **Step 3: Commit**

```bash
cd connect-four && git add src/components/admin/SocraticEditor.jsx
git commit -m "feat: add SocraticEditor component"
```

---

## Task 10: Create `LessonMetaForm.jsx`

**Files:**
- Create: `connect-four/src/components/admin/LessonMetaForm.jsx`

- [ ] **Step 1: Create `connect-four/src/components/admin/LessonMetaForm.jsx`**

```jsx
import React from 'react';

function toSlug(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Props:
 *   meta: { title, id, order, free, userPerspective }
 *   onChange: (updatedMeta) => void
 */
export default function LessonMetaForm({ meta, onChange }) {
  function update(key, value) {
    const updated = { ...meta, [key]: value };
    if (key === 'title' && !meta._idManuallyEdited) {
      updated.id = toSlug(value);
    }
    onChange(updated);
  }

  function updateId(value) {
    onChange({ ...meta, id: value, _idManuallyEdited: true });
  }

  const input = { padding: '6px 10px', borderRadius: 6, border: '1px solid #444', background: '#111', color: '#fff', boxSizing: 'border-box' };
  const label = { fontWeight: 600, fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 4 };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
      <div>
        <label style={label}>Title</label>
        <input value={meta.title} onChange={e => update('title', e.target.value)} style={{ ...input, width: '100%' }} placeholder="Lesson title" />
      </div>
      <div>
        <label style={label}>ID / slug</label>
        <input value={meta.id} onChange={e => updateId(e.target.value)} style={{ ...input, width: '100%', fontFamily: 'monospace' }} placeholder="lesson-id" />
      </div>
      <div>
        <label style={label}>Order</label>
        <input type="number" min={1} value={meta.order} onChange={e => update('order', parseInt(e.target.value, 10))} style={{ ...input, width: '100%' }} />
      </div>
      <div>
        <label style={label}>Tier</label>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          {[true, false].map(isFree => (
            <button
              key={String(isFree)}
              onClick={() => update('free', isFree)}
              style={{
                flex: 1, padding: '6px', borderRadius: 6, cursor: 'pointer',
                background: meta.free === isFree ? (isFree ? '#166534' : '#7c2d12') : '#222',
                color: '#fff', border: '1px solid #444',
              }}
            >
              {isFree ? 'Free' : 'Pro'}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label style={label}>User plays as</label>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          {['red', 'yellow'].map(p => (
            <button
              key={p}
              onClick={() => update('userPerspective', p)}
              style={{
                flex: 1, padding: '6px', borderRadius: 6, cursor: 'pointer',
                background: meta.userPerspective === p ? (p === 'red' ? '#166534' : '#854d0e') : '#222',
                color: '#fff', border: '1px solid #444',
              }}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run the test suite**

```bash
cd connect-four && npm run test:fast 2>&1 | tail -10
```

- [ ] **Step 3: Commit**

```bash
cd connect-four && git add src/components/admin/LessonMetaForm.jsx
git commit -m "feat: add LessonMetaForm component"
```

---

## Task 11: Create `AdminLessonEditorScreen.jsx`

**Files:**
- Create: `connect-four/src/screens/AdminLessonEditorScreen.jsx`

Assembles all sub-components. Handles loading an existing lesson, saving, preview, and delete. Also handles the `confirmationCategory` and `confirmationCount` fields.

- [ ] **Step 1: Create `connect-four/src/screens/AdminLessonEditorScreen.jsx`**

```jsx
import React, { useState, useEffect, useCallback } from 'react';
import LessonMetaForm from '../components/admin/LessonMetaForm.jsx';
import SlideEditor from '../components/admin/SlideEditor.jsx';
import SocraticEditor from '../components/admin/SocraticEditor.jsx';
import { parseMovestring, boardToSpec } from '../lib/movestring.js';

const VALID_CATEGORIES = [
  'immediate_threat', 'forced_block', 'double_threat', 'claimeven', 'z_threat',
  'claimodd', 'undercut', 'overcut', 'figure_7', 'j_shape',
];

function emptyLesson() {
  return {
    title: '',
    id: '',
    order: 12,
    free: true,
    userPerspective: 'yellow',
    slides: [emptySlide()],
    socratic: null,
    confirmationCategory: null,
    confirmationCount: 2,
  };
}

function emptySlide() {
  return { movestring: '', overlays: [], coachMessages: [{ text: '', mood: 'happy' }], legendItems: [], infoProse: '' };
}

function lessonToJson(lesson) {
  const { _idManuallyEdited, ...rest } = lesson;
  return {
    ...rest,
    slides: rest.slides.map(slide => {
      const { movestring, overlays, coachMessages, legendItems, infoProse } = slide;
      const { boardToSpec } = require('../lib/movestring.js');
      return {
        coachMessages,
        boardSpec: boardToSpec(require('../lib/movestring.js').parseMovestring(movestring)),
        overlays,
        legendItems,
        infoProse,
      };
    }),
    socratic: rest.socratic ? {
      boardSpec: require('../lib/movestring.js').boardToSpec(
        require('../lib/movestring.js').parseMovestring(rest.socratic.movestring ?? '')
      ),
      correctCol: rest.socratic.correctCol,
    } : null,
  };
}

/**
 * Props:
 *   lessonId: string | null  (null = new lesson)
 *   onBack: () => void
 */
export default function AdminLessonEditorScreen({ lessonId, onBack }) {
  const [lesson, setLesson] = useState(null);
  const [saveState, setSaveState] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'
  const [saveError, setSaveError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isNew = !lessonId;

  useEffect(() => {
    if (isNew) {
      setLesson(emptyLesson());
      return;
    }
    fetch(`/api/admin/lessons/${lessonId}`)
      .then(r => r.json())
      .then(data => {
        // Hydrate boardSpec → movestring: we store movestring in editor state.
        // Since boardSpec is read-only in the editor (users always have the source movestring),
        // we cannot reconstruct the exact movestring from boardSpec — so we leave it empty
        // and let the author re-enter it. The boardSpec still renders via boardSpecToBoard
        // in the lesson screens, so existing lessons are not broken.
        const hydrated = {
          ...data,
          slides: data.slides.map(s => ({
            ...s,
            movestring: s.movestring ?? '',  // ← round-trips if lesson was saved by this editor
            overlays: s.overlays ?? [],
            legendItems: s.legendItems ?? [],
            coachMessages: s.coachMessages ?? [],
            infoProse: s.infoProse ?? '',
          })),
          socratic: data.socratic ? {
            ...data.socratic,
            movestring: data.socratic.movestring ?? '',  // ← same
            overlays: data.socratic.overlays ?? [],
          } : null,
        };
        setLesson(hydrated);
      });
  }, [lessonId]);

  const handleSave = useCallback(async () => {
    setSaveState('saving');
    setSaveError('');
    try {
      const payload = lessonToJsonPayload(lesson);
      const url = isNew ? '/api/admin/lessons' : `/api/admin/lessons/${lessonId}`;
      const method = isNew ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
    } catch (e) {
      setSaveState('error');
      setSaveError(e.message);
    }
  }, [lesson, isNew, lessonId]);

  const handleDelete = useCallback(async () => {
    await fetch(`/api/admin/lessons/${lessonId}`, { method: 'DELETE' });
    onBack();
  }, [lessonId, onBack]);

  function addSlide() {
    setLesson(l => ({ ...l, slides: [...l.slides, emptySlide()] }));
  }

  function updateSlide(i, updated) {
    setLesson(l => ({ ...l, slides: l.slides.map((s, j) => j === i ? updated : s) }));
  }

  function deleteSlide(i) {
    setLesson(l => ({ ...l, slides: l.slides.filter((_, j) => j !== i) }));
  }

  function moveSlide(i, dir) {
    setLesson(l => {
      const slides = [...l.slides];
      const target = i + dir;
      if (target < 0 || target >= slides.length) return l;
      [slides[i], slides[target]] = [slides[target], slides[i]];
      return { ...l, slides };
    });
  }

  if (!lesson) return <div style={{ color: '#fff', padding: 32 }}>Loading…</div>;

  const sectionLabel = { fontWeight: 700, fontSize: 16, color: '#fff', marginBottom: 8 };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px', color: '#fff', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ padding: '6px 14px', borderRadius: 8, cursor: 'pointer' }}>← Back</button>
        <h1 style={{ margin: 0, fontSize: 20 }}>{isNew ? 'New lesson' : `Edit: ${lesson.title || lesson.id}`}</h1>
      </div>

      {/* Metadata */}
      <section>
        <div style={sectionLabel}>Metadata</div>
        <LessonMetaForm meta={lesson} onChange={updated => setLesson(l => ({ ...l, ...updated }))} />
      </section>

      {/* Slides */}
      <section>
        <div style={sectionLabel}>Slides</div>
        {lesson.slides.map((slide, i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <SlideEditor
              slide={slide}
              index={i}
              total={lesson.slides.length}
              onChange={updated => updateSlide(i, updated)}
              onMoveUp={() => moveSlide(i, -1)}
              onMoveDown={() => moveSlide(i, 1)}
              onDelete={() => deleteSlide(i)}
            />
          </div>
        ))}
        <button onClick={addSlide} style={{ padding: '8px 20px', borderRadius: 8, cursor: 'pointer' }}>+ Add slide</button>
      </section>

      {/* Socratic */}
      <section>
        <div style={sectionLabel}>Socratic</div>
        <SocraticEditor
          enabled={lesson.socratic !== null}
          socratic={lesson.socratic}
          onChange={s => setLesson(l => ({ ...l, socratic: s }))}
        />
      </section>

      {/* Confirmation */}
      <section>
        <div style={sectionLabel}>Confirmation challenges</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: '#1e1e1e', padding: 16, borderRadius: 8, border: '1px solid #333' }}>
          <div>
            <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Category</label>
            <select
              value={lesson.confirmationCategory ?? ''}
              onChange={e => setLesson(l => ({ ...l, confirmationCategory: e.target.value || null }))}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #444', background: '#111', color: '#fff' }}
            >
              <option value="">None</option>
              {VALID_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Count</label>
            <input
              type="number" min={0}
              value={lesson.confirmationCount}
              onChange={e => setLesson(l => ({ ...l, confirmationCount: parseInt(e.target.value, 10) || 0 }))}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #444', background: '#111', color: '#fff', width: 80 }}
            />
          </div>
        </div>
      </section>

      {/* Action bar */}
      <div style={{ position: 'sticky', bottom: 0, background: '#111', borderTop: '1px solid #333', padding: '12px 0', display: 'flex', gap: 10, alignItems: 'center' }}>
        <button
          onClick={handleSave}
          disabled={saveState === 'saving'}
          style={{ padding: '8px 24px', borderRadius: 8, cursor: 'pointer', background: '#166534', color: '#fff', fontWeight: 700 }}
        >
          {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved ✓' : 'Save'}
        </button>
        <button
          onClick={() => window.open(`/lessons/${lesson.id}?adminPreview=1`, '_blank')}
          disabled={isNew && saveState !== 'saved'}
          style={{ padding: '8px 24px', borderRadius: 8, cursor: 'pointer', background: '#1d4ed8', color: '#fff' }}
        >
          Preview ↗
        </button>
        {!isNew && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{ marginLeft: 'auto', padding: '8px 20px', borderRadius: 8, cursor: 'pointer', background: '#7f1d1d', color: '#fff' }}
          >
            Delete
          </button>
        )}
        {saveState === 'error' && <span style={{ color: '#f87171', fontSize: 13 }}>{saveError}</span>}
      </div>

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'grid', placeItems: 'center', zIndex: 999 }}>
          <div style={{ background: '#1e1e1e', borderRadius: 12, padding: 32, maxWidth: 360, textAlign: 'center' }}>
            <p>Delete <strong>{lesson.title || lesson.id}</strong>? This cannot be undone.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16 }}>
              <button onClick={() => setShowDeleteConfirm(false)} style={{ padding: '8px 20px', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleDelete} style={{ padding: '8px 20px', borderRadius: 8, cursor: 'pointer', background: '#7f1d1d', color: '#fff' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Convert editor state to the lesson JSON payload.
// boardSpec is derived from movestring (used by the app to render).
// movestring is stored alongside boardSpec so the editor can round-trip cleanly.
function lessonToJsonPayload(lesson) {
  const { _idManuallyEdited, ...rest } = lesson;
  const convertBoard = (ms) => boardToSpec(parseMovestring(ms ?? ''));
  return {
    ...rest,
    slides: rest.slides.map(slide => ({
      movestring: slide.movestring ?? '',        // ← stored for editor round-trip
      coachMessages: slide.coachMessages,
      boardSpec: convertBoard(slide.movestring), // ← used by app to render
      overlays: slide.overlays,
      legendItems: slide.legendItems,
      infoProse: slide.infoProse,
    })),
    socratic: rest.socratic ? {
      movestring: rest.socratic.movestring ?? '', // ← stored for editor round-trip
      boardSpec: convertBoard(rest.socratic.movestring),
      correctCol: rest.socratic.correctCol,
    } : null,
  };
}
```

- [ ] **Step 2: Run the test suite**

```bash
cd connect-four && npm run test:fast 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
cd connect-four && git add src/screens/AdminLessonEditorScreen.jsx
git commit -m "feat: add AdminLessonEditorScreen"
```

---

## Task 12: Create `AdminLessonListScreen.jsx`

**Files:**
- Create: `connect-four/src/screens/AdminLessonListScreen.jsx`

- [ ] **Step 1: Create `connect-four/src/screens/AdminLessonListScreen.jsx`**

```jsx
import React, { useState, useEffect } from 'react';

/**
 * Props:
 *   onEdit: (lessonId: string) => void
 *   onNew: () => void
 */
export default function AdminLessonListScreen({ onEdit, onNew }) {
  const [lessons, setLessons] = useState(null);

  async function load() {
    const res = await fetch('/api/admin/lessons');
    setLessons(await res.json());
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id, title) {
    if (!confirm(`Delete "${title}"?`)) return;
    await fetch(`/api/admin/lessons/${id}`, { method: 'DELETE' });
    load();
  }

  if (!lessons) return <div style={{ color: '#fff', padding: 32 }}>Loading…</div>;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 16px', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Lessons</h1>
        <button
          onClick={onNew}
          style={{ padding: '8px 20px', borderRadius: 8, cursor: 'pointer', background: '#166534', color: '#fff', fontWeight: 700 }}
        >
          + New lesson
        </button>
      </div>

      {lessons.length === 0 && <p style={{ color: '#888' }}>No lessons yet.</p>}

      {lessons.map(lesson => (
        <div
          key={lesson.id}
          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#1e1e1e', borderRadius: 8, marginBottom: 8, border: '1px solid #333' }}
        >
          <span style={{ width: 28, color: '#888', fontFamily: 'monospace', fontSize: 13 }}>{lesson.order}</span>
          <span style={{ flex: 1, fontWeight: 600 }}>{lesson.title || lesson.id}</span>
          <span style={{ fontSize: 12, color: lesson.free ? '#4ade80' : '#f59e0b', width: 36 }}>{lesson.free ? 'Free' : 'Pro'}</span>
          <button onClick={() => onEdit(lesson.id)} style={{ padding: '4px 14px', borderRadius: 6, cursor: 'pointer' }}>Edit</button>
          <button onClick={() => handleDelete(lesson.id, lesson.title)} style={{ padding: '4px 14px', borderRadius: 6, cursor: 'pointer', color: '#f87171' }}>✕</button>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd connect-four && git add src/screens/AdminLessonListScreen.jsx
git commit -m "feat: add AdminLessonListScreen"
```

---

## Task 13: Wire routing in `App.jsx` and create `AdminLessonsPage.jsx`

**Files:**
- Create: `connect-four/src/pages/AdminLessonsPage.jsx`
- Modify: `connect-four/src/App.jsx`

- [ ] **Step 1: Create `connect-four/src/pages/AdminLessonsPage.jsx`**

```jsx
import React, { useState } from 'react';
import AdminLessonListScreen from '../screens/AdminLessonListScreen.jsx';
import AdminLessonEditorScreen from '../screens/AdminLessonEditorScreen.jsx';

export default function AdminLessonsPage() {
  const [view, setView] = useState('list'); // 'list' | 'edit' | 'new'
  const [editingId, setEditingId] = useState(null);

  if (view === 'edit' || view === 'new') {
    return (
      <AdminLessonEditorScreen
        lessonId={view === 'edit' ? editingId : null}
        onBack={() => setView('list')}
      />
    );
  }

  return (
    <AdminLessonListScreen
      onEdit={(id) => { setEditingId(id); setView('edit'); }}
      onNew={() => { setEditingId(null); setView('new'); }}
    />
  );
}
```

- [ ] **Step 2: Update `App.jsx` to route `/admin/lessons` to `AdminLessonsPage`**

In `connect-four/src/App.jsx`, find the admin routing block:

```jsx
if (window.location.pathname.startsWith('/admin')) {
  return <Suspense fallback={null}><AdminCuratePage /></Suspense>;
}
```

Replace with:

```jsx
if (window.location.pathname.startsWith('/admin/lessons')) {
  const AdminLessonsPage = lazy(() => import('./pages/AdminLessonsPage.jsx'));
  return <Suspense fallback={null}><AdminLessonsPage /></Suspense>;
}
if (window.location.pathname.startsWith('/admin')) {
  return <Suspense fallback={null}><AdminCuratePage /></Suspense>;
}
```

- [ ] **Step 3: Test the full flow**

Start the dev server:

```bash
cd connect-four && npm run dev
```

Open `http://localhost:5173/admin/lessons`:
- [ ] The lesson list loads with all 11 lessons
- [ ] Clicking "Edit" on any lesson opens the editor
- [ ] The board widget shows (empty movestring initially for existing lessons)
- [ ] Typing a movestring (e.g. `3333`) renders discs on the board
- [ ] Clicking a column adds a disc and updates the movestring
- [ ] Undo removes the last move
- [ ] Switching to overlay mode and clicking a cell adds an overlay
- [ ] Clicking the same cell removes the overlay
- [ ] Legend items appear automatically when overlays are added
- [ ] Saving a lesson writes the file and shows "Saved ✓"
- [ ] After saving, "Preview ↗" opens the lesson in a new tab

- [ ] **Step 4: Commit**

```bash
cd connect-four && git add src/pages/AdminLessonsPage.jsx src/App.jsx
git commit -m "feat: wire admin/lessons routing — lesson editor is live"
```
