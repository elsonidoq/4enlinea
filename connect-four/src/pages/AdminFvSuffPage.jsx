import { useState, useEffect, useMemo } from 'react';
import { ProfileStoreProvider } from '../store/ProfileStore.jsx';
import { Board } from '../components/Board.jsx';
import { buildBoard } from '../lib/board.js';

const API = import.meta.env.VITE_API_BASE_URL || '';

// ── Compact collapsible JSON tree (ported from AdminDeepRevealEvalPage) ──────────
const JSON_COLORS = { key: '#7c3aed', str: '#16a34a', num: '#2563eb', bool: '#db2777', null: '#94a3b8' };

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

function JsonLeaf({ value }) {
  let color = JSON_COLORS.num, text = String(value);
  if (typeof value === 'string') { color = JSON_COLORS.str; text = JSON.stringify(value); }
  else if (typeof value === 'boolean') color = JSON_COLORS.bool;
  else if (value === null || value === undefined) { color = JSON_COLORS.null; text = 'null'; }
  return <span style={{ color }}>{text}</span>;
}

function JsonNode({ name, value, depth, isLast }) {
  const [collapsed, setCollapsed] = useState(false);
  const pad = { paddingLeft: depth * 16 };
  const comma = isLast ? '' : ',';
  const keyLabel = name != null
    ? <><span style={{ color: JSON_COLORS.key }}>"{name}"</span>: </>
    : null;

  const isContainer = value != null && typeof value === 'object';
  if (!isContainer) {
    return <div style={pad}>{keyLabel}<JsonLeaf value={value} />{comma}</div>;
  }

  const isArr = Array.isArray(value);
  const entries = isArr ? value.map((v, i) => [i, v]) : Object.entries(value);
  const open = isArr ? '[' : '{';
  const close = isArr ? ']' : '}';

  if (entries.length === 0) {
    return <div style={pad}>{keyLabel}{open}{close}{comma}</div>;
  }

  return (
    <>
      <div style={{ ...pad, cursor: 'pointer' }} onClick={() => setCollapsed(c => !c)}>
        <span style={{ color: JSON_COLORS.null, userSelect: 'none' }}>{collapsed ? '▶' : '▼'} </span>
        {keyLabel}{open}
        {collapsed && <span style={{ color: JSON_COLORS.null }}> {isArr ? `${entries.length} items` : `${entries.length} keys`} {close}{comma}</span>}
      </div>
      {!collapsed && entries.map(([k, v], i) => (
        <JsonNode key={k} name={isArr ? null : k} value={v} depth={depth + 1} isLast={i === entries.length - 1} />
      ))}
      {!collapsed && <div style={pad}>{close}{comma}</div>}
    </>
  );
}

function JsonView({ value }) {
  return (
    <pre
      style={{ fontFamily: 'monospace', fontSize: 11, lineHeight: 1.6, color: '#1e293b', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: 12, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowX: 'auto' }}
    >
      <JsonNode value={value} depth={0} isLast />
    </pre>
  );
}

// ── key_cells "cNrM" (1-indexed) → board overlay {c, r} (0-indexed) ──────────────
function parseKeyCell(s) {
  const m = /^c(\d+)r(\d+)$/i.exec(String(s).trim());
  if (!m) return null;
  return { c: parseInt(m[1], 10) - 1, r: parseInt(m[2], 10) - 1 };
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink)' }}>{children}</div>
    </div>
  );
}

function AnswerView({ answer, parse_error, call_error, raw }) {
  if (!answer) {
    return (
      <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#475569' }}>
        <div style={{ color: '#dc2626', marginBottom: 8 }}>
          No structured answer{call_error ? ` — call_error: ${call_error}` : parse_error ? ` — parse_error: ${parse_error}` : ''}
        </div>
        {raw && <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, color: '#64748b' }}>{raw}</pre>}
      </div>
    );
  }
  const outcomeColor = (o) => (o === 'win' ? '#16a34a' : o === 'loss' ? '#dc2626' : '#a16207');
  return (
    <div>
      <Field label="better move (1-indexed)">
        <span style={{ fontWeight: 700, fontSize: 16 }}>{answer.better_move ?? '--'}</span>
      </Field>
      <div style={{ display: 'flex', gap: 24, marginBottom: 10 }}>
        <Field label="played outcome">
          <span style={{ color: outcomeColor(answer.played_outcome), fontWeight: 700 }}>{answer.played_outcome ?? '--'}</span>
        </Field>
        <Field label="best outcome">
          <span style={{ color: outcomeColor(answer.best_outcome), fontWeight: 700 }}>{answer.best_outcome ?? '--'}</span>
        </Field>
        <Field label="confidence">{answer.confidence ?? '--'}</Field>
      </div>
      <Field label="mechanism">{answer.mechanism ?? '--'}</Field>
      {answer.unsure_about ? <Field label="unsure about">{answer.unsure_about}</Field> : null}
      {(answer.key_cells || []).length > 0 && (
        <Field label="key cells">
          <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{(answer.key_cells || []).join(', ')}</span>
        </Field>
      )}
      {(answer.fields_relied_on || []).length > 0 && (
        <Field label="fields relied on">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {(answer.fields_relied_on || []).map((f, i) => (
              <span key={i} style={{ padding: '1px 6px', borderRadius: 8, background: '#eef2ff', color: '#4338ca', fontSize: 11, fontFamily: 'monospace' }}>{f}</span>
            ))}
          </div>
        </Field>
      )}
    </div>
  );
}

function FvSuffViewer() {
  const [answerFiles, setAnswerFiles] = useState([]);
  const [answersFile, setAnswersFile] = useState('fv_suff_answers_all.jsonl');
  const [vectors, setVectors] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [collapseEmpty, setCollapseEmpty] = useState(false);
  const [condition, setCondition] = useState('A');
  const [runIndex, setRunIndex] = useState(0);

  const [isDesktop, setIsDesktop] = useState(() => typeof window === 'undefined' || window.innerWidth >= 1100);
  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1100);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    fetch(`${API}/api/admin/fv-suff/files`)
      .then(r => r.ok ? r.json() : { files: [] })
      .then(data => setAnswerFiles(data.files || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`${API}/api/admin/fv-suff?answers=${encodeURIComponent(answersFile)}`)
      .then(r => { if (!r.ok) throw new Error(`${r.status} ${r.statusText}`); return r.json(); })
      .then(data => {
        setVectors(data.vectors || []);
        setAnswers(data.answers || []);
        setIndex(0);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [answersFile]);

  const entry = vectors[index];

  // answers for the current entry, indexed by condition → run_index
  const entryAnswers = useMemo(
    () => (entry ? answers.filter(a => a.id === entry.id) : []),
    [answers, entry]
  );
  const conditions = useMemo(
    () => [...new Set(entryAnswers.map(a => a.condition))].sort(),
    [entryAnswers]
  );
  const runs = useMemo(
    () => [...new Set(entryAnswers.filter(a => a.condition === condition).map(a => a.run_index))].sort((x, y) => x - y),
    [entryAnswers, condition]
  );
  const currentAnswer = useMemo(
    () => entryAnswers.find(a => a.condition === condition && a.run_index === runIndex) ?? null,
    [entryAnswers, condition, runIndex]
  );

  // Keep condition/run valid as the entry changes.
  useEffect(() => {
    if (conditions.length && !conditions.includes(condition)) setCondition(conditions[0]);
  }, [conditions]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (runs.length && !runs.includes(runIndex)) setRunIndex(runs[0]);
  }, [runs]); // eslint-disable-line react-hooks/exhaustive-deps

  const boardObj = useMemo(() => {
    if (!entry) return { board: [], heights: [] };
    return buildBoard(entry.board_state || '');
  }, [entry]);

  const overlays = useMemo(() => {
    if (!entry) return [];
    const result = [];
    const playedRow = boardObj.heights[entry.move_played];
    if (playedRow != null && playedRow < 6) result.push({ c: entry.move_played, r: playedRow, type: 'tr' });
    const bestRow = boardObj.heights[entry.correct_move];
    if (bestRow != null && bestRow < 6) result.push({ c: entry.correct_move, r: bestRow, type: 'tg' });
    for (const s of (currentAnswer?.answer?.key_cells || [])) {
      const cell = parseKeyCell(s);
      if (cell && cell.r >= 0 && cell.r < 6 && cell.c >= 0 && cell.c < 7) result.push({ ...cell, type: 'td' });
    }
    return result;
  }, [entry, boardObj, currentAnswer]);

  function handlePrev() { if (index > 0) setIndex(index - 1); }
  function handleNext() { if (index < vectors.length - 1) setIndex(index + 1); }

  if (!isDesktop) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: 32, textAlign: 'center', background: '#0f172a', color: '#94a3b8', fontFamily: 'monospace', fontSize: 14, lineHeight: 1.6 }}>
        The FV-Sufficiency browser is desktop-only. Please open it on a wider screen (≥ 1100px).
      </div>
    );
  }

  const featureVector = entry?.feature_vector ?? null;
  const isGreen = entry ? entry.board_state.length % 2 === 0 : false;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#0f172a', color: '#e2e8f0' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 20px', gap: 12, background: '#1e293b', borderBottom: '1px solid #1e3a5f', flexShrink: 0 }}>
        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 14, color: '#94a3b8' }}>
          FV sufficiency browser
        </span>
        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'monospace', fontSize: 11, color: '#94a3b8', cursor: 'pointer' }}>
          <input type="checkbox" checked={collapseEmpty} onChange={e => setCollapseEmpty(e.target.checked)} />
          collapse empty
        </label>
        <select
          value={answersFile}
          onChange={e => setAnswersFile(e.target.value)}
          style={{ fontFamily: 'monospace', fontSize: 12, background: '#0f172a', color: '#e2e8f0', border: '1px solid #475569', borderRadius: 4, padding: '4px 8px', maxWidth: 360 }}
        >
          {!answerFiles.includes(answersFile) && <option value={answersFile}>{answersFile}</option>}
          {answerFiles.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        {vectors.length > 0 && (
          <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#64748b' }}>
            {index + 1} / {vectors.length}
          </span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={handlePrev} disabled={!entry || index === 0}
            style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: (!entry || index === 0) ? '#334155' : '#475569', color: (!entry || index === 0) ? '#64748b' : '#e2e8f0', cursor: (!entry || index === 0) ? 'default' : 'pointer', fontSize: 13 }}>
            ← Prev
          </button>
          <button onClick={handleNext} disabled={!entry || index === vectors.length - 1}
            style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: (!entry || index === vectors.length - 1) ? '#334155' : '#475569', color: (!entry || index === vectors.length - 1) ? '#64748b' : '#e2e8f0', cursor: (!entry || index === vectors.length - 1) ? 'default' : 'pointer', fontSize: 13 }}>
            Next →
          </button>
        </div>
      </div>

      {/* Predicate chips */}
      {entry && (entry.predicates || []).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '10px 20px', background: '#1e293b', borderBottom: '1px solid #334155' }}>
          {(entry.predicates || []).map(p => (
            <span key={p} style={{ padding: '2px 8px', borderRadius: 10, background: '#0f4c81', color: '#7dd3fc', fontSize: 11, fontFamily: 'monospace', fontWeight: 700 }}>{p}</span>
          ))}
        </div>
      )}

      {/* Meta row */}
      {entry && (
        <div style={{ display: 'flex', gap: 20, padding: '8px 20px', fontSize: 12, fontFamily: 'monospace', color: '#64748b', background: '#1e293b', borderBottom: '1px solid #334155', flexWrap: 'wrap' }}>
          <span>player: <span style={{ color: isGreen ? '#2faa5a' : '#94a3b8', fontWeight: 700 }}>{isGreen ? 'Green' : 'Gray'}</span></span>
          <span>id: <span style={{ color: '#94a3b8' }}>{entry.id ?? '--'}</span></span>
          <span>ms: <span style={{ color: '#94a3b8' }}>{entry.board_state || '(empty)'}</span></span>
          <span>sev: <span style={{ color: '#94a3b8' }}>{entry.severity ?? '--'}</span></span>
          <span>tag: <span style={{ color: '#94a3b8' }}>{entry.pattern_category ?? '--'}</span></span>
          <span>col: <span style={{ color: '#94a3b8' }}>{entry.move_played + 1}</span> → best: <span style={{ color: '#94a3b8' }}>{entry.correct_move + 1}</span></span>
        </div>
      )}

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, background: '#fff', color: 'var(--ink)' }}>
        {loading ? (
          <div style={{ padding: 24, color: '#64748b', fontFamily: 'monospace', fontSize: 13 }}>Loading…</div>
        ) : error ? (
          <div style={{ padding: 24, color: '#dc2626', fontFamily: 'monospace', fontSize: 13 }}>Error: {error}</div>
        ) : !entry ? (
          <div style={{ padding: 24, color: '#64748b', fontFamily: 'monospace', fontSize: 13 }}>No vectors found.</div>
        ) : (
          <>
            {/* Left: board + explanation */}
            <div style={{ flex: '0 0 42%', minWidth: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: 16, gap: 16 }}>
              <div style={{ maxWidth: 380 }}>
                <Board board={boardObj.board} compact canPlay={false} overlays={overlays} />
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#94a3b8' }}>
                <span style={{ color: '#dc2626', fontWeight: 700 }}>red</span> = played ·{' '}
                <span style={{ color: '#16a34a', fontWeight: 700 }}>green</span> = best ·{' '}
                <span style={{ color: '#a16207', fontWeight: 700 }}>amber</span> = answer key_cells
              </div>

              {/* Explanation controls + output */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <label style={{ fontFamily: 'monospace', fontSize: 11, color: '#475569', display: 'flex', alignItems: 'center', gap: 4 }}>
                    condition
                    <select value={condition} onChange={e => setCondition(e.target.value)}
                      style={{ fontFamily: 'monospace', fontSize: 12, padding: '2px 6px' }}>
                      {conditions.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </label>
                  <label style={{ fontFamily: 'monospace', fontSize: 11, color: '#475569', display: 'flex', alignItems: 'center', gap: 4 }}>
                    run
                    <select value={runIndex} onChange={e => setRunIndex(parseInt(e.target.value, 10))}
                      style={{ fontFamily: 'monospace', fontSize: 12, padding: '2px 6px' }}>
                      {runs.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </label>
                  {currentAnswer && (
                    <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#94a3b8' }}>{currentAnswer.model}</span>
                  )}
                </div>
                {currentAnswer ? (
                  <AnswerView
                    answer={currentAnswer.answer}
                    parse_error={currentAnswer.parse_error}
                    call_error={currentAnswer.call_error}
                    raw={currentAnswer.raw}
                  />
                ) : (
                  <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#94a3b8' }}>
                    No answer for this position in the selected file.
                  </div>
                )}
              </div>
            </div>

            {/* Right: feature vector */}
            <aside style={{ flex: 1, minWidth: 400, borderLeft: '1px solid #e2e8f0', background: '#fff', overflowY: 'auto', padding: '16px 18px' }}>
              <div style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8 }}>
                Feature Vector{collapseEmpty ? ' (collapsed)' : ''}
              </div>
              {featureVector
                ? <JsonView value={collapseEmpty ? pruneFeatureVectorDeep(featureVector) : featureVector} />
                : <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#94a3b8' }}>No feature_vector on this record.</div>}
            </aside>
          </>
        )}
      </div>
    </div>
  );
}

export default function AdminFvSuffPage() {
  // #root is globally capped at max-width:480px (mobile shell); widen it while this
  // full-width desktop tool is mounted, then restore on unmount.
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
      <FvSuffViewer />
    </ProfileStoreProvider>
  );
}
