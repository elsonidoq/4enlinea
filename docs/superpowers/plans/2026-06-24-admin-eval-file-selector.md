# Admin Eval File Selector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the admin deep-reveal eval screen with a file selector dropdown and a "show all evals" comparison view powered by pre-computed `eval_results_*.jsonl` files.

**Architecture:** Two new localhost-only admin endpoints serve the eval file list and per-file rows; all new state and rendering live inside the existing `EvalViewer` component in `AdminDeepRevealEvalPage.jsx`; zone-tagged text is rendered using the existing `AnnotatedExplanation` component with `termsMap={}`.

**Tech Stack:** Node.js ESM (server), React + Vite (frontend), `node:test` + `node:assert/strict` (tests).

## Global Constraints

- All new server endpoints are protected by both `requireLocalhost` (raw socket address check — not `req.ip`) and `requireAdmin`.
- Filename validation uses the regex `/^eval_results_[\w-]+\.jsonl$/` plus `path.basename()` — never join untrusted input directly to a path.
- No new React component files — all frontend changes go inside `connect-four/src/pages/AdminDeepRevealEvalPage.jsx`.
- Zone rendering uses `AnnotatedExplanation` with `termsMap={}` — KB-term popups will be no-ops in eval mode.
- New test files must be added to both `test` and `test:fast` scripts in `connect-four/package.json`.
- Use `node:test` + `node:assert/strict` — no Jest or Mocha.
- `logError` must be called in all server catch blocks that respond with 5xx.

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `connect-four/server/evalResultsHelpers.js` | `isValidEvalFilename` pure function |
| Create | `connect-four/tests/unit/evalResultsHelpers.test.js` | Unit tests for filename validation |
| Modify | `connect-four/server/index.js` | `requireLocalhost`, two new endpoints, import additions |
| Modify | `connect-four/src/pages/AdminDeepRevealEvalPage.jsx` | All new state, loading, and rendering |
| Modify | `connect-four/package.json` | Add new test file to both test scripts |

---

## Task 1: Server helper module — `isValidEvalFilename`

**Files:**
- Create: `connect-four/server/evalResultsHelpers.js`
- Create: `connect-four/tests/unit/evalResultsHelpers.test.js`
- Modify: `connect-four/package.json`

**Interfaces:**
- Produces: `isValidEvalFilename(filename: string) → boolean` — imported by `index.js` in Task 2

- [ ] **Step 1: Create the helper module**

`connect-four/server/evalResultsHelpers.js`:
```js
export function isValidEvalFilename(filename) {
  return /^eval_results_[\w-]+\.jsonl$/.test(filename);
}
```

- [ ] **Step 2: Write the test file**

`connect-four/tests/unit/evalResultsHelpers.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidEvalFilename } from '../../server/evalResultsHelpers.js';

test('accepts valid eval result filenames', () => {
  assert.ok(isValidEvalFilename('eval_results_2026-06-24T01-16-56Z.jsonl'));
  assert.ok(isValidEvalFilename('eval_results_2026-06-23T18-41-48Z.jsonl'));
  assert.ok(isValidEvalFilename('eval_results_foo-bar.jsonl'));
});

test('rejects path traversal attempts', () => {
  assert.equal(isValidEvalFilename('../index.js'), false);
  assert.equal(isValidEvalFilename('../../.env'), false);
  assert.equal(isValidEvalFilename('eval_results_../secret.json'), false);
  assert.equal(isValidEvalFilename('/etc/passwd'), false);
});

test('rejects filenames with wrong extension', () => {
  assert.equal(isValidEvalFilename('eval_results_2026-06-24.txt'), false);
  assert.equal(isValidEvalFilename('eval_results_2026-06-24.js'), false);
  assert.equal(isValidEvalFilename('eval_results_2026-06-24.json'), false);
  assert.equal(isValidEvalFilename('eval_set.json'), false);
});

test('rejects filenames with empty suffix between prefix and extension', () => {
  assert.equal(isValidEvalFilename('eval_results_.jsonl'), false);
});

test('rejects empty string', () => {
  assert.equal(isValidEvalFilename(''), false);
});
```

- [ ] **Step 3: Run the test to verify it fails (module not importable yet — expected)**

```bash
cd connect-four && node --test tests/unit/evalResultsHelpers.test.js
```
Expected: error importing `../../server/evalResultsHelpers.js` — file doesn't exist yet.

- [ ] **Step 4: Confirm helper module is saved (Step 1 done), run again**

```bash
cd connect-four && node --test tests/unit/evalResultsHelpers.test.js
```
Expected: all 5 tests PASS.

- [ ] **Step 5: Add the test file to both test scripts in `connect-four/package.json`**

In the `"test"` script, append ` tests/unit/evalResultsHelpers.test.js` after `tests/unit/shapeDescriptor.test.js`.

In the `"test:fast"` script, append ` tests/unit/evalResultsHelpers.test.js` after `tests/urlMapping.test.js`.

- [ ] **Step 6: Run the full fast test suite to confirm no regressions**

```bash
cd connect-four && npm run test:fast
```
Expected: all tests pass including the new one.

- [ ] **Step 7: Commit**

```bash
git add connect-four/server/evalResultsHelpers.js connect-four/tests/unit/evalResultsHelpers.test.js connect-four/package.json
git commit -m "$(cat <<'EOF'
feat: add isValidEvalFilename helper with unit tests

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Server endpoints — eval file list and per-file rows

**Files:**
- Modify: `connect-four/server/index.js`

**Interfaces:**
- Consumes: `isValidEvalFilename` from `./evalResultsHelpers.js`
- Produces:
  - `GET /api/admin/eval-results` → `{ files: string[] }`
  - `GET /api/admin/eval-results/:filename` → `{ rows: Array<{ id, board_state, final_response, attempt1_failures, attempt2_failures }> }`

- [ ] **Step 1: Add missing imports to `connect-four/server/index.js`**

Change the existing `node:fs` import line from:
```js
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
```
to:
```js
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
```

Change the existing `path` import line from:
```js
import { dirname, join } from 'path';
```
to:
```js
import { dirname, join, basename } from 'path';
```

Add the helper import after the existing local imports (near `import { requireAdmin } from './adminAuth.js';`):
```js
import { isValidEvalFilename } from './evalResultsHelpers.js';
```

- [ ] **Step 2: Add `requireLocalhost` middleware**

Add this function definition anywhere before the route definitions (e.g., right after the `requireAdmin` import block, before `app.use(...)`):

```js
function requireLocalhost(req, res, next) {
  const addr = req.socket.remoteAddress;
  if (addr === '127.0.0.1' || addr === '::1') return next();
  res.status(403).json({ error: 'localhost only' });
}
```

- [ ] **Step 3: Add the two new endpoints**

Find the existing eval-set endpoint block:
```js
app.get('/api/admin/eval-set', requireAdmin, (req, res) => {
```

Insert the two new endpoints directly after the closing `});` of that block:

```js
app.get('/api/admin/eval-results', requireLocalhost, requireAdmin, (req, res) => {
  const scriptsDir = join(dirname(fileURLToPath(import.meta.url)), 'scripts');
  try {
    const files = readdirSync(scriptsDir)
      .filter(isValidEvalFilename)
      .sort();
    res.json({ files });
  } catch {
    res.json({ files: [] });
  }
});

app.get('/api/admin/eval-results/:filename', requireLocalhost, requireAdmin, (req, res) => {
  const { filename } = req.params;
  if (!isValidEvalFilename(filename)) {
    return res.status(400).json({ error: 'invalid filename' });
  }
  const safe = basename(filename);
  const filePath = join(dirname(fileURLToPath(import.meta.url)), 'scripts', safe);
  try {
    const lines = readFileSync(filePath, 'utf-8').trim().split('\n').filter(Boolean);
    const rows = lines.map(line => {
      const obj = JSON.parse(line);
      return {
        id: obj.id,
        board_state: obj.board_state,
        final_response: obj.final_response,
        attempt1_failures: obj.attempt1_failures ?? [],
        attempt2_failures: obj.attempt2_failures ?? [],
      };
    });
    res.json({ rows });
  } catch (err) {
    if (err.code === 'ENOENT') return res.status(404).json({ error: 'file not found' });
    logError('[admin/eval-results/:filename]', err);
    res.status(500).json({ error: err.message });
  }
});
```

- [ ] **Step 4: Manually verify the endpoints with the server running**

Start the server if not running:
```bash
cd connect-four && node server/index.js
```

In another terminal:
```bash
curl -s http://localhost:3001/api/admin/eval-results | head -c 200
```
Expected: `{"files":["eval_results_2026-06-23T18-14-13Z.jsonl",...]}` (list of filenames).

```bash
curl -s "http://localhost:3001/api/admin/eval-results/eval_results_2026-06-23T18-41-48Z.jsonl" | head -c 300
```
Expected: `{"rows":[{"id":"eval-0","board_state":"...","final_response":"...","attempt1_failures":[...],"attempt2_failures":[...]},...]}`.

```bash
curl -s "http://localhost:3001/api/admin/eval-results/../index.js"
```
Expected: `{"error":"invalid filename"}` with HTTP 400.

- [ ] **Step 5: Run fast test suite to confirm no regressions**

```bash
cd connect-four && npm run test:fast
```
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add connect-four/server/index.js
git commit -m "$(cat <<'EOF'
feat: add localhost-only admin endpoints for eval result files

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Frontend — file selector + single-file view (Mode 2)

**Files:**
- Modify: `connect-four/src/pages/AdminDeepRevealEvalPage.jsx`

**Interfaces:**
- Consumes: `GET /api/admin/eval-results` and `GET /api/admin/eval-results/:filename` from Task 2
- Consumes: `SplitReveal` from `../components/SplitReveal.jsx`
- Consumes: `AnnotatedExplanation` from `../components/AnnotatedExplanation.jsx`

- [ ] **Step 1: Add new imports to `AdminDeepRevealEvalPage.jsx`**

The current import block at the top of the file is:
```js
import { useState, useEffect, useMemo } from 'react';
import { ProfileStoreProvider } from '../store/ProfileStore.jsx';
import { Board } from '../components/Board.jsx';
import { DeepRevealPane } from '../components/DeepRevealPane.jsx';
import { buildBoard } from '../lib/board.js';
```

Replace it with:
```js
import { useState, useEffect, useMemo } from 'react';
import { ProfileStoreProvider } from '../store/ProfileStore.jsx';
import { Board } from '../components/Board.jsx';
import { DeepRevealPane } from '../components/DeepRevealPane.jsx';
import { SplitReveal } from '../components/SplitReveal.jsx';
import { AnnotatedExplanation } from '../components/AnnotatedExplanation.jsx';
import { buildBoard } from '../lib/board.js';
```

- [ ] **Step 2: Add new state variables to `EvalViewer`**

The current state declarations inside `EvalViewer` end at line 54 with:
```js
  const [zhCells, setZhCells] = useState([]);
```

Add the following four new state declarations immediately after that line:
```js
  const [evalFiles, setEvalFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState('');
  const [fileRows, setFileRows] = useState(null);
  const [fileLoading, setFileLoading] = useState(false);
```

- [ ] **Step 3: Add the fetch-on-mount effect for `evalFiles`**

After the existing `useEffect` (which fetches the eval set, ending around line 64), add a new effect:
```js
  useEffect(() => {
    fetch(`${API}/api/admin/eval-results`)
      .then(r => r.ok ? r.json() : { files: [] })
      .then(data => setEvalFiles(data.files || []))
      .catch(() => {});
  }, []);
```

- [ ] **Step 4: Add the fetch-on-file-change effect**

Immediately after the effect from Step 3, add:
```js
  useEffect(() => {
    if (!selectedFile) { setFileRows(null); return; }
    setFileLoading(true);
    fetch(`${API}/api/admin/eval-results/${encodeURIComponent(selectedFile)}`)
      .then(r => r.ok ? r.json() : { rows: [] })
      .then(data => {
        const map = new Map();
        for (const row of (data.rows || [])) map.set(row.board_state, row);
        setFileRows(map);
      })
      .catch(() => setFileRows(new Map()))
      .finally(() => setFileLoading(false));
  }, [selectedFile]);
```

- [ ] **Step 5: Add `matchedRow` memoized value**

After the existing `useMemo` for `overlays` (around line 89), add:
```js
  const matchedRow = useMemo(() => {
    if (!fileRows || !entry) return null;
    return fileRows.get(entry.board_state) ?? null;
  }, [fileRows, entry]);
```

- [ ] **Step 6: Add the file selector `<select>` to the header**

The header div contains a flex row ending with the Prev/Next buttons. Find this section (around line 138–160):
```jsx
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={handlePrev} ...>← Prev</button>
          <button onClick={handleNext} ...>Next →</button>
        </div>
```

Insert the file selector before `<div style={{ marginLeft: 'auto', ...`:
```jsx
        <select
          value={selectedFile}
          onChange={e => setSelectedFile(e.target.value)}
          disabled={evalFiles.length === 0}
          style={{
            fontFamily: 'monospace', fontSize: 12,
            background: '#1e293b', color: '#e2e8f0',
            border: '1px solid #334155', borderRadius: 4,
            padding: '4px 8px',
          }}
        >
          <option value="">{evalFiles.length === 0 ? 'no eval files' : '— select file —'}</option>
          {evalFiles.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
```

- [ ] **Step 7: Replace the board-area rendering to add Mode 2**

The current board area (around line 187–217) is:
```jsx
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff', color: 'var(--ink)' }}>
        {deepRevealOpen ? (
          <DeepRevealPane ... />
        ) : (
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ borderRadius: 8, padding: 12, maxWidth: 380 }}>
              <Board board={boardObj.board} compact canPlay={false} overlays={overlays} zhCells={zhCells} />
            </div>
            <button
              onClick={() => setDeepRevealOpen(true)}
              style={{ alignSelf: 'flex-start', padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--disc-green)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
            >
              Deep Reveal
            </button>
          </div>
        )}
      </div>
```

Replace the entire `<div style={{ flex: 1, ... }}>` block with:
```jsx
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff', color: 'var(--ink)' }}>
        {selectedFile ? (
          fileLoading ? (
            <div style={{ padding: 20, color: '#94a3b8', fontFamily: 'monospace', fontSize: 12 }}>Loading…</div>
          ) : matchedRow ? (
            <SplitReveal
              isOpen={true}
              onClose={() => setSelectedFile('')}
              closeLabel="← Deselect file"
              boardContent={
                <Board board={boardObj.board} compact canPlay={false} overlays={overlays} zhCells={zhCells} />
              }
              revealContent={
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.6, color: 'var(--ink)' }}>
                  {([...(matchedRow.attempt1_failures || []), ...(matchedRow.attempt2_failures || [])].length > 0) && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                      {(matchedRow.attempt1_failures || []).map(f => (
                        <span key={`a1-${f}`} style={{ padding: '2px 8px', borderRadius: 10, background: '#78350f', color: '#fcd34d', fontSize: 11, fontFamily: 'monospace', fontWeight: 700 }}>
                          a1: {f}
                        </span>
                      ))}
                      {(matchedRow.attempt2_failures || []).map(f => (
                        <span key={`a2-${f}`} style={{ padding: '2px 8px', borderRadius: 10, background: '#92400e', color: '#fde68a', fontSize: 11, fontFamily: 'monospace', fontWeight: 700 }}>
                          a2: {f}
                        </span>
                      ))}
                    </div>
                  )}
                  {matchedRow.final_response ? (
                    <AnnotatedExplanation
                      text={matchedRow.final_response}
                      termsMap={{}}
                      userMajorThreats={userMajorThreats}
                      onHighlightsChange={setZhCells}
                      navigate={() => {}}
                    />
                  ) : (
                    <p style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: 12, margin: 0 }}>
                      No final_response for this entry.
                    </p>
                  )}
                </div>
              }
            />
          ) : (
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ borderRadius: 8, padding: 12, maxWidth: 380 }}>
                <Board board={boardObj.board} compact canPlay={false} overlays={overlays} zhCells={zhCells} />
              </div>
              <p style={{ fontFamily: 'monospace', fontSize: 12, color: '#94a3b8', margin: 0 }}>
                No result for this position in selected file.
              </p>
            </div>
          )
        ) : deepRevealOpen ? (
          <DeepRevealPane
            isOpen={deepRevealOpen}
            onClose={() => setDeepRevealOpen(false)}
            moveString={entry.board_state || ''}
            col={entry.move_played}
            feature="eval"
            navigate={() => {}}
            onReveal={() => setHighlightCol(entry.correct_move)}
            onZhCellsChange={setZhCells}
            userMajorThreats={userMajorThreats}
            noSpeech
            boardContent={
              <Board board={boardObj.board} compact canPlay={false} overlays={overlays} zhCells={zhCells} />
            }
          />
        ) : (
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ borderRadius: 8, padding: 12, maxWidth: 380 }}>
              <Board board={boardObj.board} compact canPlay={false} overlays={overlays} zhCells={zhCells} />
            </div>
            <button
              onClick={() => setDeepRevealOpen(true)}
              style={{ alignSelf: 'flex-start', padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--disc-green)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
            >
              Deep Reveal
            </button>
          </div>
        )}
      </div>
```

- [ ] **Step 8: Manually verify Mode 2 in the browser**

1. Navigate to the admin deep-reveal eval screen.
2. Confirm the `<select>` appears in the header and lists the eval files.
3. Select a file — the board area should switch to a SplitReveal layout showing the `final_response` for the current position.
4. Confirm failure chips appear (amber) above the explanation if `attempt1_failures` or `attempt2_failures` are non-empty.
5. Navigate to a different position (Prev/Next) — the displayed explanation should update immediately (no extra fetch).
6. Select a position that has no entry in the chosen file — should show the board + "No result for this position" message.
7. Click "← Deselect file" — should return to the live "Deep Reveal" button.

- [ ] **Step 9: Commit**

```bash
git add connect-four/src/pages/AdminDeepRevealEvalPage.jsx
git commit -m "$(cat <<'EOF'
feat: add eval file selector and single-file view to admin eval screen

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Frontend — "show all evals" list view (Mode 3)

**Files:**
- Modify: `connect-four/src/pages/AdminDeepRevealEvalPage.jsx`

**Interfaces:**
- Consumes: `GET /api/admin/eval-results/:filename` for each file
- The `showAll` mode overrides `selectedFile` mode in the rendering priority

- [ ] **Step 1: Add new state for "show all" mode**

In `EvalViewer`, after the four state variables added in Task 3 Step 2, add:
```js
  const [showAll, setShowAll] = useState(false);
  const [allFilesRows, setAllFilesRows] = useState(new Map());
  const [allFilesLoading, setAllFilesLoading] = useState(new Set());
```

- [ ] **Step 2: Add the "show all" loading effect**

After the `selectedFile` effect added in Task 3 Step 4, add:
```js
  useEffect(() => {
    if (!showAll || evalFiles.length === 0) return;
    const toFetch = evalFiles.filter(f => !allFilesRows.has(f));
    if (toFetch.length === 0) return;

    setAllFilesLoading(prev => new Set([...prev, ...toFetch]));

    for (const filename of toFetch) {
      fetch(`${API}/api/admin/eval-results/${encodeURIComponent(filename)}`)
        .then(r => r.ok ? r.json() : { rows: [] })
        .then(data => {
          const map = new Map();
          for (const row of (data.rows || [])) map.set(row.board_state, row);
          setAllFilesRows(prev => new Map([...prev, [filename, map]]));
          setAllFilesLoading(prev => { const s = new Set(prev); s.delete(filename); return s; });
        })
        .catch(() => {
          setAllFilesRows(prev => new Map([...prev, [filename, new Map()]]));
          setAllFilesLoading(prev => { const s = new Set(prev); s.delete(filename); return s; });
        });
    }
  }, [showAll, evalFiles]); // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 3: Add the "Show all evals" checkbox to the header**

In the header, insert the checkbox immediately after the file `<select>` added in Task 3 Step 6 (before the `<div style={{ marginLeft: 'auto', ...}}>` Prev/Next div):
```jsx
        <label style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontFamily: 'monospace', fontSize: 12, color: '#e2e8f0',
          cursor: evalFiles.length > 0 ? 'pointer' : 'default',
        }}>
          <input
            type="checkbox"
            checked={showAll}
            onChange={e => setShowAll(e.target.checked)}
            disabled={evalFiles.length === 0}
          />
          Show all evals
        </label>
```

- [ ] **Step 4: Add Mode 3 rendering as the highest-priority branch**

In the board area added in Task 3 Step 7, the outer condition is `{selectedFile ? ... : deepRevealOpen ? ... : ...}`.

Wrap the entire existing conditional so that `showAll` takes priority. Replace the opening of the board-area `<div>`:

Find:
```jsx
        {selectedFile ? (
```

Replace with:
```jsx
        {showAll ? (
          <SplitReveal
            isOpen={true}
            onClose={() => setShowAll(false)}
            closeLabel="← Close list"
            boardContent={
              <Board board={boardObj.board} compact canPlay={false} overlays={overlays} zhCells={zhCells} />
            }
            revealContent={
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {evalFiles.map(filename => {
                  const fileMap = allFilesRows.get(filename);
                  const isLoading = allFilesLoading.has(filename);
                  const row = fileMap ? fileMap.get(entry.board_state) : null;
                  return (
                    <div key={filename}>
                      <div style={{
                        fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
                        color: '#475569', marginBottom: 8,
                        borderBottom: '1px solid #334155', paddingBottom: 4,
                      }}>
                        {filename}
                      </div>
                      {isLoading ? (
                        <div style={{ color: '#64748b', fontFamily: 'monospace', fontSize: 11 }}>Loading…</div>
                      ) : !fileMap ? (
                        <div style={{ color: '#64748b', fontFamily: 'monospace', fontSize: 11 }}>— not loaded —</div>
                      ) : !row ? (
                        <div style={{ color: '#64748b', fontFamily: 'monospace', fontSize: 11 }}>— no entry —</div>
                      ) : !row.final_response ? (
                        <div style={{ color: '#64748b', fontFamily: 'monospace', fontSize: 11 }}>— no final_response —</div>
                      ) : (
                        <AnnotatedExplanation
                          text={row.final_response}
                          termsMap={{}}
                          userMajorThreats={userMajorThreats}
                          onHighlightsChange={setZhCells}
                          navigate={() => {}}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            }
          />
        ) : selectedFile ? (
```

- [ ] **Step 5: Manually verify Mode 3 in the browser**

1. Check "Show all evals" — the board should be fixed in the top pane; the bottom pane shows a scrollable list with one section per file, in chronological order.
2. Positions where a file has an entry show the `final_response` with zone highlighting; positions without an entry show `— no entry —`.
3. Files still loading show "Loading…" until their fetch completes.
4. Tap a zone tag in one of the explanations — the board highlights update. Tap a zone in a different explanation — the highlights update to that explanation's zones (last interaction wins).
5. Navigate to a different board position (Prev/Next) — all sections update immediately (no extra fetches, the maps are already built).
6. Uncheck "Show all evals" — returns to the previous mode (file selected or live deep reveal button).
7. While "Show all evals" is checked, change the file selector — the checkbox remains checked and the list view stays visible.

- [ ] **Step 6: Run fast test suite to confirm no regressions**

```bash
cd connect-four && npm run test:fast
```
Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add connect-four/src/pages/AdminDeepRevealEvalPage.jsx
git commit -m "$(cat <<'EOF'
feat: add show-all-evals comparison list view to admin eval screen

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```
