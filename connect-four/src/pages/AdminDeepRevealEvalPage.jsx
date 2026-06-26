import { useState, useEffect, useMemo } from 'react';
import { ProfileStoreProvider } from '../store/ProfileStore.jsx';
import { Board } from '../components/Board.jsx';
import { DeepRevealPane } from '../components/DeepRevealPane.jsx';
import { SplitReveal } from '../components/SplitReveal.jsx';
import { AnnotatedExplanation } from '../components/AnnotatedExplanation.jsx';
import { buildBoard } from '../lib/board.js';

const API = import.meta.env.VITE_API_BASE_URL || '';

const PREDICATE_GLOSSARY = [
  { id: 'P01', desc: 'Red is the blundering player (odd move index)' },
  { id: 'P02', desc: 'Yellow is the blundering player (even move index)' },
  { id: 'P03', desc: 'Mild blunder — severity 1–3' },
  { id: 'P04', desc: 'Severe blunder — severity ≥ 7' },
  { id: 'P05', desc: 'No minor threats for either player before the move' },
  { id: 'P06', desc: 'Player has minor threats; opponent has none' },
  { id: 'P07', desc: 'Opponent has minor threats; player has none' },
  { id: 'P08', desc: 'Both players have minor threats' },
  { id: 'P10', desc: "Opponent's major threat count unchanged after the blunder" },
  { id: 'P11', desc: 'tag: immediate_threat — missed own winning move' },
  { id: 'P12', desc: 'tag: immediate_threat — enabled opponent to win next move' },
  { id: 'P13', desc: 'tag: forced_block — missed forced defensive block' },
  { id: 'P14', desc: 'tag: forced_win — missed own forced-win sequence' },
  { id: 'P15', desc: 'tag: forced_win — enabled opponent forced-win sequence' },
  { id: 'P16', desc: 'tag: double_threat — missed own double-threat setup' },
  { id: 'P17', desc: 'tag: double_threat — enabled opponent double-threat' },
  { id: 'P18', desc: 'tag: undercut — enabled opponent undercut' },
  { id: 'P19', desc: 'tag: overcut — missed own overcut' },
  { id: 'P20', desc: 'tag: figure_7 — missed own figure-7 setup' },
  { id: 'P21', desc: 'tag: figure_7 — enabled opponent figure-7' },
  { id: 'P22', desc: 'tag: j_shape — missed own J-shape setup' },
  { id: 'P23', desc: 'tag: j_shape — enabled opponent J-shape' },
  { id: 'P24', desc: 'tag: z_threat — missed own Z-threat' },
  { id: 'P25', desc: 'tag: z_threat — enabled opponent Z-threat' },
  { id: 'P26', desc: 'tag: odd_even_threat — missed own odd/even threat' },
  { id: 'P27', desc: 'tag: odd_even_threat — enabled opponent odd/even threat' },
  { id: 'P28', desc: 'tag: claimeven — missed own claimeven' },
  { id: 'P29', desc: 'tag: claimeven — enabled opponent claimeven' },
  { id: 'P30', desc: 'tag: drawing_move — missed own drawing move' },
  { id: 'P31', desc: 'tag: suboptimal_move — generic suboptimal (no specific pattern)' },
  { id: 'P32', desc: 'LLM prompt includes position-specific KB terms (pattern fired)' },
  { id: 'P33', desc: 'LLM prompt contains only always-include KB terms (no pattern fired)' },
  { id: 'P34', desc: 'Early game — fewer than 10 moves played' },
  { id: 'P35', desc: 'Mid game — 10–24 moves played' },
  { id: 'P36', desc: 'Late game — 25+ moves played' },
];

function evalSetDisplayName(filename) {
  return filename.replace(/^eval_set_/, '').replace(/\.json$/, '');
}

// Pretty-print JSON with lightweight syntax highlighting (no dependency). Indents 2
// spaces, then wraps keys/strings/numbers/booleans/null in colored spans. Input is
// HTML-escaped first, so the value itself can contain any characters safely.
const JSON_COLORS = { key: '#7c3aed', str: '#16a34a', num: '#2563eb', bool: '#db2777', null: '#94a3b8' };
function highlightJson(value) {
  const json = JSON.stringify(value, null, 2)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false)\b|\bnull\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let cls = 'num';
      if (/^"/.test(match)) cls = /:$/.test(match) ? 'key' : 'str';
      else if (/^(true|false)$/.test(match)) cls = 'bool';
      else if (match === 'null') cls = 'null';
      return `<span style="color:${JSON_COLORS[cls]}">${match}</span>`;
    },
  );
}

// Recursive empty/all-zero elimination — client port of pruneEmpty in server/explainContext.js.
// Toggled in the header; collapses the fixed-shape feature vector to only its informative fields.
function fvIsZeroOrBlankDeep(v) {
  if (v === null || v === undefined || v === '') return true;
  if (typeof v === 'number') return v === 0;
  if (typeof v === 'boolean' || typeof v === 'string') return false;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') return Object.values(v).every(fvIsZeroOrBlankDeep);
  return false;
}
function fvIsDroppable(v) {
  if (v === null || v === undefined || v === '') return true;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') return Object.keys(v).length === 0 || fvIsZeroOrBlankDeep(v);
  return false;
}
function pruneFeatureVectorDeep(value) {
  if (Array.isArray(value)) return value.map(pruneFeatureVectorDeep).filter((v) => !fvIsDroppable(v));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      const pv = pruneFeatureVectorDeep(v);
      if (!fvIsDroppable(pv)) out[k] = pv;
    }
    return out;
  }
  return value;
}

function JsonView({ value }) {
  return (
    <pre
      style={{ fontFamily: 'monospace', fontSize: 11, lineHeight: 1.5, color: '#1e293b', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: 12, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowX: 'auto' }}
      dangerouslySetInnerHTML={{ __html: highlightJson(value) }}
    />
  );
}

// Flag-this-explanation control mirroring the in-app DeepRevealPane UX, but
// writing to a per-run feedback JSONL file via POST /api/admin/eval-feedback.
// Reset between entries/files by giving it a `key`.
function EvalFlagButton({ filename, id }) {
  const [flagged, setFlagged] = useState(false);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');

  function send() {
    if (flagged) return;
    setFlagged(true);
    setOpen(false);
    fetch(`${API}/api/admin/eval-feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, id, human_note: note.trim() }),
    }).catch(() => {});
  }

  if (flagged) {
    return (
      <div style={{ textAlign: 'center' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink-soft)' }}>
          ✓ Thanks — flagged
        </span>
      </div>
    );
  }

  if (open) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <textarea
          autoFocus
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="What's wrong with this explanation? (optional)"
          rows={3}
          style={{ width: '100%', boxSizing: 'border-box', resize: 'none', fontFamily: 'var(--font-body)', fontSize: 13, border: '1px solid var(--line)', borderRadius: 8, padding: '6px 8px', colorScheme: 'light' }}
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={() => { setOpen(false); setNote(''); }}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink-soft)' }}
          >
            Cancel
          </button>
          <button
            onClick={send}
            style={{ background: 'var(--eval-bad)', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, color: '#fff', borderRadius: 6, padding: '4px 12px' }}
          >
            Send
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <button
        onClick={() => setOpen(true)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink-soft)' }}
      >
        ⚑ Flag this explanation
      </button>
    </div>
  );
}

function EvalViewer() {
  const [evalSets, setEvalSets] = useState([]);
  const [selectedEvalSet, setSelectedEvalSet] = useState('');
  const [entries, setEntries] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deepRevealOpen, setDeepRevealOpen] = useState(false);
  const [highlightCol, setHighlightCol] = useState(null);
  const [zhCells, setZhCells] = useState([]);
  const [allResultFiles, setAllResultFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState('');
  const [fileRows, setFileRows] = useState(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [collapseEmpty, setCollapseEmpty] = useState(true); // recursive empty-elimination on the feature vector — ON by default
  const [allFilesRows, setAllFilesRows] = useState(new Map());
  const [allFilesLoading, setAllFilesLoading] = useState(new Set());

  // This tool is a dense desktop debugging surface (board + deep reveal + prompt-data
  // column side by side). Below ~1100px there is no room for the layout, so we gate it.
  const [isDesktop, setIsDesktop] = useState(() => typeof window === 'undefined' || window.innerWidth >= 1100);
  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1100);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // eval set name without extension, e.g. "eval_set_large_2"
  const evalSetBasename = selectedEvalSet ? selectedEvalSet.replace(/\.json$/, '') : '';

  // result files filtered to the selected eval set
  const evalFiles = evalSetBasename
    ? allResultFiles.filter(f => f.startsWith(`${evalSetBasename}_results_`))
    : [];

  useEffect(() => {
    fetch(`${API}/api/admin/eval-sets`)
      .then(r => r.ok ? r.json() : { files: [] })
      .then(data => setEvalSets(data.files || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`${API}/api/admin/eval-results`)
      .then(r => r.ok ? r.json() : { files: [] })
      .then(data => setAllResultFiles(data.files || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedEvalSet) { setEntries([]); setError(null); return; }
    setLoading(true);
    setError(null);
    setIndex(0);
    setSelectedFile('');
    setFileRows(null);
    setShowAll(false);
    fetch(`${API}/api/admin/eval-set/${encodeURIComponent(evalSetBasename)}`)
      .then(r => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.json();
      })
      .then(data => { setEntries(data); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [selectedEvalSet]); // eslint-disable-line react-hooks/exhaustive-deps

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
  }, [showAll, evalFiles.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const entry = entries[index];

  const boardObj = useMemo(() => {
    if (!entry) return { board: [], heights: [] };
    return buildBoard(entry.board_state || '');
  }, [entry]);

  const userMajorThreats = useMemo(() =>
    (entry?.threat_cells || []).map(tc => ({ c: tc.col, r: tc.row })),
    [entry]
  );

  const overlays = useMemo(() => {
    if (!entry) return [];
    const landingRow = boardObj.heights[entry.move_played];
    const result = [{ c: entry.move_played, r: landingRow ?? 0, type: 'tr' }];
    (entry.threat_cells || []).forEach(tc => {
      result.push({ c: tc.col, r: tc.row, type: 'td' });
    });
    if (highlightCol != null && boardObj.heights[highlightCol] < 6) {
      result.push({ c: highlightCol, r: boardObj.heights[highlightCol], type: 'tg' });
    }
    return result;
  }, [entry, boardObj, highlightCol]);

  const matchedRow = useMemo(() => {
    if (!fileRows || !entry) return null;
    return fileRows.get(entry.board_state) ?? null;
  }, [fileRows, entry]);

  function handlePrev() {
    if (index > 0) {
      setIndex(index - 1);
      setHighlightCol(null);
      setZhCells([]);
      setDeepRevealOpen(false);
    }
  }

  function handleNext() {
    if (index < entries.length - 1) {
      setIndex(index + 1);
      setHighlightCol(null);
      setZhCells([]);
      setDeepRevealOpen(false);
    }
  }

  const selectPrompt = !selectedEvalSet && !loading && !error;
  const noEntries = selectedEvalSet && !loading && !error && entries.length === 0;

  if (!isDesktop) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: 32, textAlign: 'center', background: '#0f172a', color: '#94a3b8', fontFamily: 'monospace', fontSize: 14, lineHeight: 1.6 }}>
        The Deep Reveal Eval tool is desktop-only. Please open it on a wider screen (≥ 1100px).
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#0f172a', color: '#e2e8f0' }}>
      {/* Header row 1: title + eval set selector + counter + nav */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 20px', gap: 12, background: '#1e293b', borderBottom: '1px solid #1e3a5f', flexShrink: 0 }}>
        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 14, color: '#94a3b8' }}>
          Deep reveal feature vector
        </span>
        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'monospace', fontSize: 11, color: '#94a3b8', cursor: 'pointer' }}>
          <input type="checkbox" checked={collapseEmpty} onChange={e => setCollapseEmpty(e.target.checked)} />
          collapse empty
        </label>
        <select
          value={selectedEvalSet}
          onChange={e => setSelectedEvalSet(e.target.value)}
          style={{
            fontFamily: 'monospace', fontSize: 12,
            background: '#0f172a', color: '#e2e8f0',
            border: '1px solid #475569', borderRadius: 4,
            padding: '4px 8px',
          }}
        >
          <option value="">{evalSets.length === 0 ? 'no eval sets found' : '— select eval set —'}</option>
          {evalSets.map(f => <option key={f} value={f}>{evalSetDisplayName(f)}</option>)}
        </select>
        {selectedEvalSet && entries.length > 0 && (
          <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#64748b' }}>
            {index + 1} / {entries.length}
          </span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button
            onClick={handlePrev}
            disabled={!entry || index === 0}
            style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: (!entry || index === 0) ? '#334155' : '#475569', color: (!entry || index === 0) ? '#64748b' : '#e2e8f0', cursor: (!entry || index === 0) ? 'default' : 'pointer', fontSize: 13 }}
          >
            ← Prev
          </button>
          <button
            onClick={handleNext}
            disabled={!entry || index === entries.length - 1}
            style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: (!entry || index === entries.length - 1) ? '#334155' : '#475569', color: (!entry || index === entries.length - 1) ? '#64748b' : '#e2e8f0', cursor: (!entry || index === entries.length - 1) ? 'default' : 'pointer', fontSize: 13 }}
          >
            Next →
          </button>
        </div>
      </div>
      {/* Header row 2: results file controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 20px', background: '#1e293b', borderBottom: '1px solid #334155', flexShrink: 0 }}>
        <select
          value={selectedFile}
          onChange={e => setSelectedFile(e.target.value)}
          disabled={!selectedEvalSet || evalFiles.length === 0}
          style={{
            fontFamily: 'monospace', fontSize: 12,
            background: '#1e293b', color: '#e2e8f0',
            border: '1px solid #334155', borderRadius: 4,
            padding: '4px 8px',
            minWidth: 0, maxWidth: 400,
          }}
        >
          <option value="">{!selectedEvalSet ? 'select eval set first' : evalFiles.length === 0 ? 'no result files' : '— select result file —'}</option>
          {evalFiles.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
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
      </div>

      {/* Predicate chips */}
      {entry && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '10px 20px', background: '#1e293b', borderBottom: '1px solid #334155' }}>
          {(entry.predicates || []).map(p => (
            <span key={p} style={{ padding: '2px 8px', borderRadius: 10, background: '#0f4c81', color: '#7dd3fc', fontSize: 11, fontFamily: 'monospace', fontWeight: 700 }}>
              {p}
            </span>
          ))}
        </div>
      )}

      {/* Meta row */}
      {entry && (
        <div style={{ display: 'flex', gap: 20, padding: '8px 20px', fontSize: 12, fontFamily: 'monospace', color: '#64748b', background: '#1e293b', borderBottom: '1px solid #334155', flexWrap: 'wrap' }}>
          {(() => {
            const isGreen = entry.board_state.length % 2 === 0;
            return (
              <span>player: <span style={{ color: isGreen ? '#2faa5a' : '#94a3b8', fontWeight: 700 }}>{isGreen ? 'Green' : 'Gray'}</span></span>
            );
          })()}
          <span>id: <span style={{ color: '#94a3b8' }}>{entry.id ?? '--'}</span></span>
          <span>ms: <span style={{ color: '#94a3b8' }}>{entry.board_state || '(empty)'}</span></span>
          <span>sev: <span style={{ color: '#94a3b8' }}>{entry.severity ?? '--'}</span></span>
          <span>tag: <span style={{ color: '#94a3b8' }}>{entry.pattern_category ?? '--'}</span></span>
          <span>col: <span style={{ color: '#94a3b8' }}>{entry.move_played + 1}</span> → best: <span style={{ color: '#94a3b8' }}>{entry.correct_move + 1}</span></span>
        </div>
      )}

      {/* Board + DeepRevealPane */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: '#fff', color: 'var(--ink)' }}>
        {selectPrompt ? (
          <div style={{ padding: 24, color: '#64748b', fontFamily: 'monospace', fontSize: 13 }}>
            Select an eval set above to begin.
          </div>
        ) : loading ? (
          <div style={{ padding: 24, color: '#94a3b8', fontFamily: 'monospace', fontSize: 13 }}>
            Loading eval set…
          </div>
        ) : error ? (
          <div style={{ padding: 24, color: '#f87171', fontFamily: 'monospace', fontSize: 13 }}>
            Error: {error}
          </div>
        ) : noEntries ? (
          <div style={{ padding: 24, color: '#94a3b8', fontFamily: 'monospace', fontSize: 13 }}>
            No entries in eval set.
          </div>
        ) : showAll ? (
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
          fileLoading ? (
            <div style={{ padding: 20, color: '#94a3b8', fontFamily: 'monospace', fontSize: 12 }}>Loading…</div>
          ) : matchedRow ? (
            <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
              {/* Left column: board + deep reveal (~30% narrower than the prior flex:1 ≈58%) */}
              <div style={{ flex: '0 0 40%', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
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
                      {matchedRow.final_response && (
                        <div style={{ marginTop: 16 }}>
                          <EvalFlagButton
                            key={`${selectedFile}:${matchedRow.id ?? entry.id}`}
                            filename={selectedFile}
                            id={matchedRow.id ?? entry.id}
                          />
                        </div>
                      )}
                    </div>
                  }
                />
              </div>

              {/* Right column: feature vector + prompt data + prompt */}
              {(() => { const featureVector = matchedRow.feature_vector ?? matchedRow.filtered_prompt_data; return (
              (featureVector || matchedRow.prompt_data || matchedRow.prompt) && (
                <aside style={{ flex: 1, minWidth: 400, borderLeft: '1px solid #e2e8f0', background: '#fff', overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {featureVector && (
                    <div>
                      <div style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8 }}>
                        Feature Vector{collapseEmpty ? ' (collapsed)' : ''}
                      </div>
                      <JsonView value={collapseEmpty ? pruneFeatureVectorDeep(featureVector) : featureVector} />
                    </div>
                  )}
                  {matchedRow.prompt_data && (
                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
                      <div style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8 }}>
                        Prompt Data
                      </div>
                      <JsonView value={matchedRow.prompt_data} />
                    </div>
                  )}
                  {matchedRow.prompt && (
                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
                      <div style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8 }}>
                        Prompt
                      </div>
                      <pre style={{ fontFamily: 'monospace', fontSize: 11, color: '#475569', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
                        {matchedRow.prompt}
                      </pre>
                    </div>
                  )}
                </aside>
              )); })()}
            </div>
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
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
            <div style={{ borderRadius: 8, padding: 12, maxWidth: 380 }}>
              <Board board={boardObj.board} compact canPlay={false} overlays={overlays} zhCells={zhCells} />
            </div>
            <button
              onClick={() => setDeepRevealOpen(true)}
              style={{ alignSelf: 'flex-start', padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--disc-green)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
            >
              Deep Reveal
            </button>
            {/* Predicate glossary */}
            <div style={{ paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
              <div style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 12 }}>
                Predicate glossary
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '4px 24px' }}>
                {PREDICATE_GLOSSARY.filter(({ id }) => (entry.predicates || []).includes(id)).map(({ id, desc }) => (
                  <div key={id} style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#1d4ed8', minWidth: 32, flexShrink: 0 }}>{id}</span>
                    <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#475569' }}>{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminDeepRevealEvalPage() {
  // #root is globally capped at max-width:480px (the mobile app shell). This admin tool
  // is a full-width desktop surface, so widen #root while it's mounted and restore the
  // original constraints on unmount — without touching the global stylesheet.
  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return;
    const prev = { maxWidth: root.style.maxWidth, width: root.style.width };
    root.style.maxWidth = 'none';
    root.style.width = '100%';
    return () => {
      root.style.maxWidth = prev.maxWidth;
      root.style.width = prev.width;
    };
  }, []);

  return (
    <ProfileStoreProvider>
      <EvalViewer />
    </ProfileStoreProvider>
  );
}
