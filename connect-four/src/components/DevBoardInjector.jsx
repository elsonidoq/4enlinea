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
