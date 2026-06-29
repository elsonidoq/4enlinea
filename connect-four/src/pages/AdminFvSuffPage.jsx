import { useState, useEffect, useMemo } from 'react';
import { ProfileStoreProvider } from '../store/ProfileStore.jsx';
import { Board } from '../components/Board.jsx';
import { buildBoard } from '../lib/board.js';

// Blunder-reason EVIDENCE browser. Renders reasonEngine output (precomputed by
// server/scripts/reason_audit/build_evidence.mjs, served by GET /api/admin/reason) so the
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

// One labelled board for a half of the evidence. Renders the half's finalMovestring with the
// completingCell + window cells overlaid (amber). Falls back to a note when there is no cell.
function HalfBoard({ title, subtitle, half }) {
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

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 2 }}>{title}</div>
      <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#94a3b8', marginBottom: 4, minHeight: 14 }}>{subtitle}</div>
      {half && ms
        ? <Board board={boardObj.board} compact canPlay={false} overlays={overlays} />
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

  const preBoard = useMemo(() => buildBoard(entry?.movestring || ''), [entry]);
  const preOverlays = useMemo(() => {
    if (!entry) return [];
    const out = [];
    const playedRow = preBoard.heights[entry.playedCol];
    if (playedRow != null && playedRow < 6) out.push({ c: entry.playedCol, r: playedRow, type: 'tr' });
    const bestRow = preBoard.heights[entry.bestCol];
    if (bestRow != null && bestRow < 6) out.push({ c: entry.bestCol, r: bestRow, type: 'tg' });
    return out;
  }, [entry, preBoard]);

  function handlePrev() { if (index > 0) setIndex(index - 1); }
  function handleNext() { if (index < rows.length - 1) setIndex(index + 1); }

  if (!isDesktop) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: 32, textAlign: 'center', background: '#0f172a', color: '#94a3b8', fontFamily: 'monospace', fontSize: 14, lineHeight: 1.6 }}>
        The blunder-reason evidence browser is desktop-only. Please open it on a wider screen (≥ 1100px).
      </div>
    );
  }

  const isGreen = entry ? entry.player === 1 : false;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#0f172a', color: '#e2e8f0' }}>
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
          <Chip text={entry.case} bg="#0f172a" fg={CASE_COLOR[entry.case] || '#94a3b8'} />
          {entry.notABlunder && <Chip text="notABlunder" bg="#0f172a" fg="#64748b" />}
          {entry.caseMatches === false && <Chip text="case≠expected" bg="#7f1d1d" fg="#fecaca" />}
          <span>player: <span style={{ color: isGreen ? '#2faa5a' : '#94a3b8', fontWeight: 700 }}>{isGreen ? 'Green' : 'Gray'}</span></span>
          <span>ms: <span style={{ color: '#94a3b8' }}>{entry.movestring || '(empty)'}</span></span>
          <span>col: <span style={{ color: '#e8543e', fontWeight: 700 }}>{entry.playedCol + 1}</span> → best: <span style={{ color: '#2faa5a', fontWeight: 700 }}>{entry.bestCol + 1}</span></span>
          <span>scores: <span style={{ color: '#94a3b8' }}>[{(entry.scores || []).join(',')}]</span></span>
          {entry.bucket && <span>bucket: <span style={{ color: '#94a3b8' }}>{entry.bucket}</span></span>}
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
                  </div>
                  <Board board={preBoard.board} compact canPlay={false} overlays={preOverlays} />
                </div>
                <HalfBoard
                  title="lostResource (half a)"
                  subtitle={entry.lostResource ? `${entry.lostResource.kind} · amber = completing/window` : 'null'}
                  half={entry.lostResource}
                />
                <HalfBoard
                  title="opponentPunishment (half b)"
                  subtitle={entry.opponentPunishment ? `${entry.opponentPunishment.kind} · amber = completing/window` : 'null'}
                  half={entry.opponentPunishment}
                />
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
                <HalfDetail label="lostResource — what the best move preserved" half={entry.lostResource} />
                <HalfDetail label="opponentPunishment — how the played move loses" half={entry.opponentPunishment} />

                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 6 }}>
                  {entry.replyHistogram && (
                    <Field label="reply histogram (opp non-losing replies)">
                      afterBest <b>{entry.replyHistogram.afterBest}</b> · afterPlayed <b>{entry.replyHistogram.afterPlayed}</b>
                    </Field>
                  )}
                  {entry.gate && (
                    <Field label="gate (lose_to_faster_lose)">
                      <Chip text={entry.gate.verdict} bg={entry.gate.verdict === 'Blunder' ? '#fee2e2' : '#dcfce7'} fg={entry.gate.verdict === 'Blunder' ? '#b91c1c' : '#15803d'} />
                      {' '}exhaustive <b>{String(entry.gate.exhaustive)}</b>
                      {entry.gate.witness && <> · devCols [{(entry.gate.witness.devCols || []).map(c => c + 1).join(',')}] · oppPlies {entry.gate.witness.oppPlies}</>}
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
      <ReasonViewer />
    </ProfileStoreProvider>
  );
}
