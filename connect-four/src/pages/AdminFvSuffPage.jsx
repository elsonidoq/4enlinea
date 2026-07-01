import { useState, useEffect, useMemo } from 'react';
import { ProfileStoreProvider } from '../store/ProfileStore.jsx';
import { Board } from '../components/Board.jsx';
import { buildBoard } from '../lib/board.js';

// Blunder-reason EVIDENCE browser. Renders reasonEngine output (precomputed by
// server/scripts/reason_engine/build_evidence.mjs, served by GET /api/admin/reason) so the
// solver-derived evidence can be verified by eye against the rendered boards.
//
// Each row is the engine's evidence object: { movestring, playedCol, bestCol, scores, case,
// lostResource, opponentPunishment, replyHistogram, gate, ... } + fixture ground-truth labels.
// (Component/route still named AdminFvSuff for historical reasons — see memory
// project_admin_fv_suff_repurposed.md.)

const API = import.meta.env.VITE_API_BASE_URL || '';

// ── Compact collapsible JSON tree ───────────────────────────────────────────────
const JSON_COLORS = { key: '#7c3aed', str: '#16a34a', num: '#2563eb', bool: '#db2777', null: '#94a3b8' };

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

// "cNrM" (1-indexed) → board overlay {c, r} (0-indexed)
function parseCell(s) {
  const m = /^c(\d+)r(\d+)$/i.exec(String(s).trim());
  if (!m) return null;
  const cell = { c: parseInt(m[1], 10) - 1, r: parseInt(m[2], 10) - 1 };
  if (cell.r < 0 || cell.r >= 6 || cell.c < 0 || cell.c >= 7) return null;
  return cell;
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--ink)' }}>{children}</div>
    </div>
  );
}

const REGISTER_COLOR = { immediate: '#16a34a', forced_sequence: '#2563eb', parity: '#a16207' };
const Chip = ({ text, bg, fg }) => (
  <span style={{ padding: '1px 7px', borderRadius: 8, background: bg, color: fg, fontSize: 11, fontFamily: 'monospace', fontWeight: 700 }}>{text}</span>
);

// Numbered lookahead moves: every disc in `ms` placed AFTER the pre-move board (index >= baseLen),
// in play order, as a Board `stepLabels` map "row,col" -> number. Lets the reader follow how the
// board evolves from the decision point to the half's resolution (keeps green/gray disc colors).
function lookaheadSteps(ms, baseLen) {
  if (!ms) return {};
  const heights = [0, 0, 0, 0, 0, 0, 0];
  const out = {};
  let step = 0;
  for (let i = 0; i < ms.length; i++) {
    const col = Number(ms[i]);
    if (Number.isNaN(col)) continue;
    const row = heights[col]++;
    if (i >= baseLen) out[`${row},${col}`] = ++step;
  }
  return out;
}

// One labelled board for a half of the evidence. Renders the half's finalMovestring with the
// completingCell + window cells overlaid (amber), and the lookahead moves numbered in play order.
// Falls back to a note when there is no cell.
function HalfBoard({ title, subtitle, half, baseLen = 0 }) {
  const ms = half?.finalMovestring;
  const boardObj = useMemo(() => buildBoard(ms || ''), [ms]);
  const overlays = useMemo(() => {
    if (!half) return [];
    const out = [];
    for (const w of (half.window || [])) { const c = parseCell(w); if (c) out.push({ ...c, type: 'td' }); }
    const cc = parseCell(half.completingCell);
    if (cc) out.push({ ...cc, type: 'td' });
    return out;
  }, [half]);
  const steps = useMemo(() => lookaheadSteps(ms, baseLen), [ms, baseLen]);

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 2 }}>{title}</div>
      <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#94a3b8', marginBottom: 4, minHeight: 14 }}>{subtitle}</div>
      {half && ms
        ? <Board board={boardObj.board} compact canPlay={false} overlays={overlays} stepLabels={steps} />
        : <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#a16207', padding: 8, border: '1px dashed #e2e8f0', borderRadius: 6 }}>
            {half ? 'no board cell (parity-naming deferred / draw-save swindle)' : 'no half'}
          </div>}
    </div>
  );
}

const TIE_STYLE = {
  tied: { bg: '#dcfce7', fg: '#15803d' },
  temporal: { bg: '#ede9fe', fg: '#6d28d9' },
  independent: { bg: '#fee2e2', fg: '#b91c1c' },
};

function HalfDetail({ label, half }) {
  if (!half) return <Field label={label}><span style={{ color: '#94a3b8' }}>null (notABlunder / out of scope)</span></Field>;
  const pa = half.parityAttribution;
  const tie = half.tie;
  return (
    <div style={{ marginBottom: 10, borderLeft: '3px solid #e2e8f0', paddingLeft: 8 }}>
      <div style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>{label}</div>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center', marginBottom: 4 }}>
        <Chip text={half.kind} bg="#eef2ff" fg="#4338ca" />
        <Chip text={half.register} bg="#f1f5f9" fg={REGISTER_COLOR[half.register] || '#475569'} />
        {half.tacticTag && <Chip text={`◆ ${half.tacticTag}${half.tacticFromDiff ? ' (diff)' : ''}`} bg="#ecfeff" fg="#0e7490" />}
        {half.tacticTag && (half.tacticCells || []).length > 0 && (
          <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#0e7490' }}>{half.tacticCells.join(' ')}</span>
        )}
        {tie && (
          <Chip
            text={`⇄ ${tie.kind}${tie.sharedCells?.length ? ' ' + tie.sharedCells.join(' ') : ''}`}
            bg={(TIE_STYLE[tie.kind] || {}).bg || '#f1f5f9'}
            fg={(TIE_STYLE[tie.kind] || {}).fg || '#475569'}
          />
        )}
        {half.completingCell && <span style={{ fontFamily: 'monospace', fontSize: 12 }}>cell <b>{half.completingCell}</b></span>}
        {half.pliesToEnd != null && <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b' }}>plies {half.pliesToEnd}</span>}
        {half.savingCol != null && <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b' }}>saveCol {half.savingCol + 1}</span>}
      </div>
      {(half.line || []).length > 0 && (
        <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#475569' }}>
          line: {half.line.map((m, i) => (
            <span key={i}>{i ? ' · ' : ''}<span style={{ color: m.mover === 1 ? '#2faa5a' : '#64748b' }}>{m.cell}</span></span>
          ))}
        </div>
      )}
      {(half.anchorCells || []).length > 0 && (
        <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b', marginTop: 2 }}>
          anchorCells: {half.anchorCells.join(' ')}
        </div>
      )}
      {tie && tie.kind === 'temporal' && (
        <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#6d28d9', marginTop: 2 }}>
          tie: played {tie.playedPlies} vs swindle {tie.swindlePlies} plies — {tie.tied ? 'faster (blunder)' : 'not faster'}
        </div>
      )}
      {pa?.nameable && (
        <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#475569', marginTop: 4, padding: '4px 6px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6 }}>
          <b style={{ color: '#a16207' }}>parity attribution</b>{' '}
          <Chip text={pa.groupKind} bg="#fef3c7" fg="#92400e" />{' '}
          group: {pa.controllingGroup.join(' ')}
          <div>
            levers (odd z-threat): {pa.leverCells.length
              ? <b style={{ color: '#16a34a' }}>{pa.leverCells.join(' ')}</b>
              : <b style={{ color: '#dc2626' }}>none → forcedFirstRequired (deferred)</b>}
          </div>
        </div>
      )}
    </div>
  );
}

const CASE_COLOR = {
  win_to_draw: '#a16207', win_to_lose: '#dc2626', draw_to_lose: '#b45309',
  lose_to_faster_lose: '#7c3aed', win_to_slower_win: '#64748b',
};

function ReasonViewer() {
  const [files, setFiles] = useState([]);
  const [file, setFile] = useState('reason_evidence_all.jsonl');
  const [rows, setRows] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isDesktop, setIsDesktop] = useState(() => typeof window === 'undefined' || window.innerWidth >= 1100);
  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1100);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    fetch(`${API}/api/admin/reason/files`)
      .then(r => r.ok ? r.json() : { files: [] })
      .then(data => setFiles(data.files || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`${API}/api/admin/reason?file=${encodeURIComponent(file)}`)
      .then(r => { if (!r.ok) throw new Error(`${r.status} ${r.statusText}`); return r.json(); })
      .then(data => { setRows(data.rows || []); setIndex(0); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [file]);

  const entry = rows[index];
  const ev = entry?.evidence || {};

  const preBoard = useMemo(() => buildBoard(ev.movestring || ''), [ev]);
  const preOverlays = useMemo(() => {
    if (!entry) return [];
    const out = [];
    // optimalWinSamples (parity wins): overlay every distinct winning-line window in amber, so the
    // spread of optimal realizations — where the win lands, and whether the orientation is fixed — is
    // visible on the decision board. Drawn first, so the played (red) / best (green) markers win on
    // any overlapping cell.
    for (const ln of (ev.lostResource?.optimalWinSamples?.lines || [])) {
      for (const w of (ln.window || [])) { const c = parseCell(w); if (c) out.push({ ...c, type: 'claim' }); }
    }
    const playedRow = preBoard.heights[ev.playedCol];
    if (playedRow != null && playedRow < 6) out.push({ c: ev.playedCol, r: playedRow, type: 'tr' });
    const bestRow = preBoard.heights[ev.bestCol];
    if (bestRow != null && bestRow < 6) out.push({ c: ev.bestCol, r: bestRow, type: 'tg' });
    return out;
  }, [ev, preBoard]);

  function handlePrev() { if (index > 0) setIndex(index - 1); }
  function handleNext() { if (index < rows.length - 1) setIndex(index + 1); }

  if (!isDesktop) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: 32, textAlign: 'center', background: '#0f172a', color: '#94a3b8', fontFamily: 'monospace', fontSize: 14, lineHeight: 1.6 }}>
        The blunder-reason evidence browser is desktop-only. Please open it on a wider screen (≥ 1100px).
      </div>
    );
  }

  const isGreen = entry ? ev.player === 1 : false;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden', background: '#0f172a', color: '#e2e8f0' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 20px', gap: 12, background: '#1e293b', borderBottom: '1px solid #1e3a5f', flexShrink: 0 }}>
        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 14, color: '#94a3b8' }}>
          Blunder-reason evidence browser
        </span>
        <select
          value={file}
          onChange={e => setFile(e.target.value)}
          style={{ fontFamily: 'monospace', fontSize: 12, background: '#0f172a', color: '#e2e8f0', border: '1px solid #475569', borderRadius: 4, padding: '4px 8px', maxWidth: 360 }}
        >
          {!files.includes(file) && <option value={file}>{file}</option>}
          {files.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        {rows.length > 0 && (
          <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#64748b' }}>
            {index + 1} / {rows.length}
          </span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={handlePrev} disabled={!entry || index === 0}
            style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: (!entry || index === 0) ? '#334155' : '#475569', color: (!entry || index === 0) ? '#64748b' : '#e2e8f0', cursor: (!entry || index === 0) ? 'default' : 'pointer', fontSize: 13 }}>
            ← Prev
          </button>
          <button onClick={handleNext} disabled={!entry || index === rows.length - 1}
            style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: (!entry || index === rows.length - 1) ? '#334155' : '#475569', color: (!entry || index === rows.length - 1) ? '#64748b' : '#e2e8f0', cursor: (!entry || index === rows.length - 1) ? 'default' : 'pointer', fontSize: 13 }}>
            Next →
          </button>
        </div>
      </div>

      {/* Meta row */}
      {entry && (
        <div style={{ display: 'flex', gap: 18, alignItems: 'center', padding: '8px 20px', fontSize: 12, fontFamily: 'monospace', color: '#64748b', background: '#1e293b', borderBottom: '1px solid #334155', flexWrap: 'wrap' }}>
          <Chip text={ev.case} bg="#0f172a" fg={CASE_COLOR[ev.case] || '#94a3b8'} />
          {ev.notABlunder && <Chip text="notABlunder" bg="#0f172a" fg="#64748b" />}
          {entry.groundTruth?.matches === false && <Chip text="case≠expected" bg="#7f1d1d" fg="#fecaca" />}
          <span>player: <span style={{ color: isGreen ? '#2faa5a' : '#94a3b8', fontWeight: 700 }}>{isGreen ? 'Green' : 'Gray'}</span></span>
          <span>ms: <span style={{ color: '#94a3b8' }}>{ev.movestring || '(empty)'}</span></span>
          <span>col: <span style={{ color: '#e8543e', fontWeight: 700 }}>{ev.playedCol + 1}</span> → best: <span style={{ color: '#2faa5a', fontWeight: 700 }}>{ev.bestCol + 1}</span></span>
          <span>scores: <span style={{ color: '#94a3b8' }}>[{(ev.scores || []).join(',')}]</span></span>
          {entry.groundTruth?.bucket && <span>bucket: <span style={{ color: '#94a3b8' }}>{entry.groundTruth?.bucket}</span></span>}
        </div>
      )}

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, background: '#fff', color: 'var(--ink)' }}>
        {loading ? (
          <div style={{ padding: 24, color: '#64748b', fontFamily: 'monospace', fontSize: 13 }}>Loading…</div>
        ) : error ? (
          <div style={{ padding: 24, color: '#dc2626', fontFamily: 'monospace', fontSize: 13 }}>Error: {error}</div>
        ) : !entry ? (
          <div style={{ padding: 24, color: '#64748b', fontFamily: 'monospace', fontSize: 13 }}>No evidence rows found.</div>
        ) : (
          <>
            {/* Left: the three boards + evidence detail */}
            <div style={{ flex: '0 0 58%', minWidth: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: 16, gap: 14 }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 2 }}>pre-move board</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#94a3b8', marginBottom: 4, minHeight: 14 }}>
                    <span style={{ color: '#e8543e', fontWeight: 700 }}>red</span> played · <span style={{ color: '#16a34a', fontWeight: 700 }}>green</span> best
                    {ev.lostResource?.optimalWinSamples && <> · <span style={{ color: '#a16207', fontWeight: 700 }}>amber</span> win-sample windows ({ev.lostResource.optimalWinSamples.distinct})</>}
                  </div>
                  <Board board={preBoard.board} compact canPlay={false} overlays={preOverlays} />
                </div>
                <HalfBoard
                  title="lostResource (half a)"
                  subtitle={ev.lostResource ? `${ev.lostResource.kind} · amber = completing/window · ① = lookahead` : 'null'}
                  half={ev.lostResource}
                  baseLen={(ev.movestring || '').length}
                />
                <HalfBoard
                  title="opponentPunishment (half b)"
                  subtitle={ev.opponentPunishment ? `${ev.opponentPunishment.kind} · amber = completing/window · ① = lookahead` : 'null'}
                  half={ev.opponentPunishment}
                  baseLen={(ev.movestring || '').length}
                />
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
                <HalfDetail label="lostResource — what the best move preserved" half={ev.lostResource} />
                <HalfDetail label="opponentPunishment — how the played move loses" half={ev.opponentPunishment} />

                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 6 }}>
                  {ev.replyHistogram && (
                    <Field label="reply histogram (opp non-losing replies)">
                      afterBest <b>{ev.replyHistogram.afterBest}</b> · afterPlayed <b>{ev.replyHistogram.afterPlayed}</b>
                    </Field>
                  )}
                  {ev.gate && (
                    <Field label="gate (lose_to_faster_lose)">
                      <Chip text={ev.gate.verdict} bg={ev.gate.verdict === 'Blunder' ? '#fee2e2' : '#dcfce7'} fg={ev.gate.verdict === 'Blunder' ? '#b91c1c' : '#15803d'} />
                      {' '}exhaustive <b>{String(ev.gate.exhaustive)}</b>
                      {ev.gate.witness && <> · devCols [{(ev.gate.witness.devCols || []).map(c => c + 1).join(',')}] · oppPlies {ev.gate.witness.oppPlies}</>}
                    </Field>
                  )}
                </div>
              </div>
            </div>

            {/* Right: raw evidence JSON */}
            <aside style={{ flex: 1, minWidth: 360, borderLeft: '1px solid #e2e8f0', background: '#fff', overflowY: 'auto', padding: '16px 18px' }}>
              <div style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8 }}>
                Raw evidence
              </div>
              <JsonView value={entry} />
            </aside>
          </>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
//  Eval-answers mode: board + vector + the LLM's answer + its grade, joined by id.
//  Data from GET /api/admin/fv-suff?answers=<file>&set=<file> → { set, answers, grades }.
//  set row = { id, pattern_category, feature_vector }; answer = { id, condition, run_index,
//  answer:{ better_move, played_outcome, best_outcome, mechanism, key_cells, unsure_about,
//  confidence } }; grade = { id, condition, per_run:[{A1..A4}], case_pass }.
// ════════════════════════════════════════════════════════════════════════════════

const OUTCOME_COLOR = { win: '#16a34a', draw: '#a16207', loss: '#dc2626' };
const AX = (v) => v === 'pass'
  ? <Chip text="✓" bg="#dcfce7" fg="#15803d" />
  : v === 'fail' ? <Chip text="✗" bg="#fee2e2" fg="#b91c1c" /> : <Chip text="–" bg="#f1f5f9" fg="#94a3b8" />;

function AnswerPanel({ answer, grade, runIdx }) {
  if (!answer) {
    return <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#a16207', padding: 10, border: '1px dashed #e2e8f0', borderRadius: 6 }}>
      No LLM answer for this case / condition / run.
    </div>;
  }
  const a = answer.answer || {};
  const perRun = grade?.per_run?.find((r) => r.run_index === runIdx) || grade?.per_run?.[0];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <Chip text={`better → col ${a.better_move}`} bg="#dcfce7" fg="#15803d" />
        <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
          best <b style={{ color: OUTCOME_COLOR[a.best_outcome] || '#475569' }}>{a.best_outcome}</b>
          {' · '}played <b style={{ color: OUTCOME_COLOR[a.played_outcome] || '#475569' }}>{a.played_outcome}</b>
        </span>
        <Chip text={`conf ${a.confidence}`} bg="#f1f5f9" fg="#475569" />
        {answer.parse_error && <Chip text="parse_error" bg="#fee2e2" fg="#b91c1c" />}
      </div>
      {perRun && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', fontFamily: 'monospace', fontSize: 11 }}>
          <span style={{ color: '#94a3b8', fontWeight: 700 }}>GRADE</span>
          A1 {AX(perRun.A1)} A2 {AX(perRun.A2)} A3 {AX(perRun.A3)} A4 {AX(perRun.A4)}
          <Chip text={grade.case_pass ? 'PASS' : 'FAIL'} bg={grade.case_pass ? '#dcfce7' : '#fee2e2'} fg={grade.case_pass ? '#15803d' : '#b91c1c'} />
        </div>
      )}
      <Field label="mechanism (the LLM's load-bearing reason)">
        <span style={{ fontSize: 12, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{a.mechanism}</span>
      </Field>
      {(a.key_cells || []).length > 0 && (
        <Field label="key cells (amber on pre-move board)">{a.key_cells.join(' ')}</Field>
      )}
      {a.fields_relied_on?.length > 0 && (
        <Field label="fields relied on"><span style={{ fontSize: 11, color: '#64748b' }}>{a.fields_relied_on.join(' · ')}</span></Field>
      )}
      {a.unsure_about && (
        <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#92400e', padding: '4px 6px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6 }}>
          <b>unsure:</b> {a.unsure_about}
        </div>
      )}
      {perRun?.unsure_about && perRun.unsure_about !== a.unsure_about && (
        <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#92400e' }}>grader noted abstention: {perRun.unsure_about}</div>
      )}
    </div>
  );
}

function AnswerViewer() {
  const [files, setFiles] = useState({ answers: [] });
  const [answersFile, setAnswersFile] = useState('');
  const [data, setData] = useState({ set: [], answers: [], grades: [] });
  const [index, setIndex] = useState(0);
  const [condition, setCondition] = useState('A');
  const [run, setRun] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/admin/fv-suff/files`)
      .then((r) => r.ok ? r.json() : { answers: [] })
      .then((d) => {
        setFiles({ answers: d.answers || [] });
        if ((d.answers || []).length && !answersFile) setAnswersFile(d.answers[d.answers.length - 1]);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!answersFile) return;
    setLoading(true); setError(null);
    fetch(`${API}/api/admin/fv-suff?answers=${encodeURIComponent(answersFile)}`)
      .then((r) => { if (!r.ok) throw new Error(`${r.status} ${r.statusText}`); return r.json(); })
      .then((d) => { setData({ set: d.set || [], answers: d.answers || [], grades: d.grades || [] }); setIndex(0); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [answersFile]);

  // index maps
  const conditions = useMemo(() => [...new Set(data.answers.map((a) => a.condition))].sort(), [data.answers]);
  const answersByKey = useMemo(() => {
    const m = new Map();
    for (const a of data.answers) { const k = `${a.id}|${a.condition}`; if (!m.has(k)) m.set(k, []); m.get(k).push(a); }
    for (const arr of m.values()) arr.sort((x, y) => (x.run_index ?? 0) - (y.run_index ?? 0));
    return m;
  }, [data.answers]);
  const gradesByKey = useMemo(() => {
    const m = new Map();
    for (const g of data.grades) m.set(`${g.id}|${g.condition}`, g);
    return m;
  }, [data.grades]);

  const caseRow = data.set[index];
  const fv = caseRow?.feature_vector;
  const key = caseRow ? `${caseRow.id}|${condition}` : null;
  const runs = key ? (answersByKey.get(key) || []) : [];
  const answer = runs.find((r) => (r.run_index ?? 0) === run) || runs[0] || null;
  const grade = key ? gradesByKey.get(key) : null;

  const preBoard = useMemo(() => buildBoard(fv?.movestring || ''), [fv]);
  const keyCellsStr = (answer?.answer?.key_cells || []).join(' '); // primitive dep (stable across renders)
  const preOverlays = useMemo(() => {
    if (!fv) return [];
    const out = [];
    const pr = preBoard.heights[fv.playedCol]; if (pr != null && pr < 6) out.push({ c: fv.playedCol, r: pr, type: 'tr' });
    const br = preBoard.heights[fv.bestCol]; if (br != null && br < 6) out.push({ c: fv.bestCol, r: br, type: 'tg' });
    for (const kc of (keyCellsStr ? keyCellsStr.split(' ') : [])) { const c = parseCell(kc); if (c) out.push({ ...c, type: 'td' }); }
    return out;
  }, [fv, preBoard, keyCellsStr]);

  const isGreen = fv ? fv.player === 1 : false;
  const sel = { fontFamily: 'monospace', fontSize: 12, background: '#0f172a', color: '#e2e8f0', border: '1px solid #475569', borderRadius: 4, padding: '4px 8px' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: '#0f172a', color: '#e2e8f0' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '8px 20px', gap: 10, background: '#1e293b', borderBottom: '1px solid #334155', flexWrap: 'wrap', flexShrink: 0 }}>
        <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#94a3b8' }}>answers</span>
        <select value={answersFile} onChange={(e) => setAnswersFile(e.target.value)} style={{ ...sel, maxWidth: 320 }}>
          {!files.answers.length && <option value="">(no fv_suff_answers_*.jsonl found)</option>}
          {files.answers.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#94a3b8' }}>cond</span>
        <select value={condition} onChange={(e) => { setCondition(e.target.value); setRun(0); }} style={sel}>
          {(conditions.length ? conditions : ['A']).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#94a3b8' }}>run</span>
        <select value={run} onChange={(e) => setRun(Number(e.target.value))} style={sel}>
          {(runs.length ? runs : [{ run_index: 0 }]).map((r) => <option key={r.run_index} value={r.run_index ?? 0}>{r.run_index ?? 0}</option>)}
        </select>
        {data.set.length > 0 && <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#64748b' }}>{index + 1} / {data.set.length}</span>}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={() => index > 0 && setIndex(index - 1)} disabled={!caseRow || index === 0}
            style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: (!caseRow || index === 0) ? '#334155' : '#475569', color: '#e2e8f0', cursor: 'pointer', fontSize: 13 }}>← Prev</button>
          <button onClick={() => index < data.set.length - 1 && setIndex(index + 1)} disabled={!caseRow || index === data.set.length - 1}
            style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: (!caseRow || index === data.set.length - 1) ? '#334155' : '#475569', color: '#e2e8f0', cursor: 'pointer', fontSize: 13 }}>Next →</button>
        </div>
      </div>

      {caseRow && fv && (
        <div style={{ display: 'flex', gap: 18, alignItems: 'center', padding: '8px 20px', fontSize: 12, fontFamily: 'monospace', color: '#64748b', background: '#1e293b', borderBottom: '1px solid #334155', flexWrap: 'wrap' }}>
          <Chip text={caseRow.id} bg="#0f172a" fg="#94a3b8" />
          <Chip text={fv.case} bg="#0f172a" fg={CASE_COLOR[fv.case] || '#94a3b8'} />
          <span>player: <span style={{ color: isGreen ? '#2faa5a' : '#94a3b8', fontWeight: 700 }}>{isGreen ? 'Green' : 'Gray'}</span></span>
          <span>ms: <span style={{ color: '#94a3b8' }}>{fv.movestring || '(empty)'}</span></span>
          <span>col: <span style={{ color: '#e8543e', fontWeight: 700 }}>{fv.playedCol + 1}</span> → best: <span style={{ color: '#2faa5a', fontWeight: 700 }}>{fv.bestCol + 1}</span></span>
          {grade && <Chip text={grade.case_pass ? 'graded: PASS' : 'graded: FAIL'} bg="#0f172a" fg={grade.case_pass ? '#16a34a' : '#dc2626'} />}
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', minHeight: 0, background: '#fff', color: 'var(--ink)' }}>
        {loading ? <div style={{ padding: 24, color: '#64748b', fontFamily: 'monospace' }}>Loading…</div>
          : error ? <div style={{ padding: 24, color: '#dc2626', fontFamily: 'monospace' }}>Error: {error}</div>
          : !caseRow ? <div style={{ padding: 24, color: '#64748b', fontFamily: 'monospace' }}>{answersFile ? 'No eval-set rows.' : 'Run explain_from_vector.mjs to produce an answers file, then pick it above.'}</div>
          : (
            <>
              <div style={{ flex: '0 0 56%', minWidth: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: 16, gap: 14 }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 2 }}>pre-move board</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#94a3b8', marginBottom: 4, minHeight: 14 }}>
                      <span style={{ color: '#e8543e', fontWeight: 700 }}>red</span> played · <span style={{ color: '#16a34a', fontWeight: 700 }}>green</span> best · <span style={{ color: '#a16207', fontWeight: 700 }}>amber</span> answer key_cells
                    </div>
                    <Board board={preBoard.board} compact canPlay={false} overlays={preOverlays} />
                  </div>
                  <HalfBoard title="lostResource (half a)" subtitle={fv.lostResource ? fv.lostResource.kind : 'null'} half={fv.lostResource} baseLen={(fv.movestring || '').length} />
                  <HalfBoard title="opponentPunishment (half b)" subtitle={fv.opponentPunishment ? fv.opponentPunishment.kind : 'null'} half={fv.opponentPunishment} baseLen={(fv.movestring || '').length} />
                </div>
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
                  <HalfDetail label="lostResource — what the best move preserved" half={fv.lostResource} />
                  <HalfDetail label="opponentPunishment — how the played move loses" half={fv.opponentPunishment} />
                </div>
              </div>
              <aside style={{ flex: 1, minWidth: 380, borderLeft: '1px solid #e2e8f0', background: '#fff', overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <div style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8 }}>LLM answer · {condition} · run {run}</div>
                  <AnswerPanel answer={answer} grade={grade} runIdx={run} />
                </div>
                <div>
                  <div style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8 }}>Feature vector (what the LLM saw)</div>
                  <JsonView value={fv} />
                </div>
              </aside>
            </>
          )}
      </div>
    </div>
  );
}

function ModeSwitcher() {
  const [mode, setMode] = useState('evidence');
  const tab = (id, label) => (
    <button onClick={() => setMode(id)} style={{
      padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontFamily: 'monospace', fontWeight: 700,
      background: mode === id ? '#2563eb' : '#334155', color: mode === id ? '#fff' : '#94a3b8',
    }}>{label}</button>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#0f172a' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 20px', background: '#0f172a', borderBottom: '1px solid #1e3a5f', flexShrink: 0 }}>
        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: '#e2e8f0', marginRight: 8 }}>Reason eval</span>
        {tab('evidence', 'Evidence (vectors)')}
        {tab('answers', 'Eval answers (LLM + grade)')}
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        {mode === 'evidence' ? <ReasonViewer /> : <AnswerViewer />}
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
      <ModeSwitcher />
    </ProfileStoreProvider>
  );
}
