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

function EvalViewer() {
  const [entries, setEntries] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deepRevealOpen, setDeepRevealOpen] = useState(false);
  const [highlightCol, setHighlightCol] = useState(null);
  const [zhCells, setZhCells] = useState([]);
  const [evalFiles, setEvalFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState('');
  const [fileRows, setFileRows] = useState(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [allFilesRows, setAllFilesRows] = useState(new Map());
  const [allFilesLoading, setAllFilesLoading] = useState(new Set());

  useEffect(() => {
    fetch(`${API}/api/admin/eval-set`)
      .then(r => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.json();
      })
      .then(data => { setEntries(data); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  useEffect(() => {
    fetch(`${API}/api/admin/eval-results`)
      .then(r => r.ok ? r.json() : { files: [] })
      .then(data => setEvalFiles(data.files || []))
      .catch(() => {});
  }, []);

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
  }, [showAll, evalFiles]); // eslint-disable-line react-hooks/exhaustive-deps

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

  if (loading) {
    return (
      <div style={{ padding: 24, color: '#fff', fontFamily: 'monospace' }}>
        Loading eval set…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24, color: '#f87171', fontFamily: 'monospace' }}>
        Error: {error}
        <br />
        <small>Run <code>node server/scripts/generate_eval_set.mjs</code> first.</small>
      </div>
    );
  }

  if (!entry) {
    return (
      <div style={{ padding: 24, color: '#fff', fontFamily: 'monospace' }}>
        No entries in eval set.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#0f172a', color: '#e2e8f0' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 20px', background: '#1e293b', borderBottom: '1px solid #334155' }}>
        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 14, color: '#94a3b8' }}>
          Deep Reveal Eval
        </span>
        <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#64748b' }}>
          {index + 1} / {entries.length}
        </span>
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
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button
            onClick={handlePrev}
            disabled={index === 0}
            style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: index === 0 ? '#334155' : '#475569', color: index === 0 ? '#64748b' : '#e2e8f0', cursor: index === 0 ? 'default' : 'pointer', fontSize: 13 }}
          >
            ← Prev
          </button>
          <button
            onClick={handleNext}
            disabled={index === entries.length - 1}
            style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: index === entries.length - 1 ? '#334155' : '#475569', color: index === entries.length - 1 ? '#64748b' : '#e2e8f0', cursor: index === entries.length - 1 ? 'default' : 'pointer', fontSize: 13 }}
          >
            Next →
          </button>
        </div>
      </div>

      {/* Predicate chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '10px 20px', background: '#1e293b', borderBottom: '1px solid #334155' }}>
        {(entry.predicates || []).map(p => (
          <span key={p} style={{ padding: '2px 8px', borderRadius: 10, background: '#0f4c81', color: '#7dd3fc', fontSize: 11, fontFamily: 'monospace', fontWeight: 700 }}>
            {p}
          </span>
        ))}
      </div>

      {/* Meta row */}
      <div style={{ display: 'flex', gap: 20, padding: '8px 20px', fontSize: 12, fontFamily: 'monospace', color: '#64748b', background: '#1e293b', borderBottom: '1px solid #334155', flexWrap: 'wrap' }}>
        {(() => {
          const isGreen = entry.board_state.length % 2 === 0;
          return (
            <span>player: <span style={{ color: isGreen ? '#2faa5a' : '#94a3b8', fontWeight: 700 }}>{isGreen ? 'Green' : 'Gray'}</span></span>
          );
        })()}
        <span>ms: <span style={{ color: '#94a3b8' }}>{entry.board_state || '(empty)'}</span></span>
        <span>sev: <span style={{ color: '#94a3b8' }}>{entry.severity ?? '--'}</span></span>
        <span>tag: <span style={{ color: '#94a3b8' }}>{entry.pattern_category ?? '--'}</span></span>
        <span>col: <span style={{ color: '#94a3b8' }}>{entry.move_played + 1}</span> → best: <span style={{ color: '#94a3b8' }}>{entry.correct_move + 1}</span></span>
      </div>

      {/* Board + DeepRevealPane */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff', color: 'var(--ink)' }}>
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

      {/* Predicate glossary */}
      <div style={{ padding: '20px 20px 32px', borderTop: '1px solid #334155', background: '#0f172a' }}>
        <div style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 12 }}>
          Predicate glossary
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '4px 24px' }}>
          {PREDICATE_GLOSSARY.filter(({ id }) => (entry.predicates || []).includes(id)).map(({ id, desc }) => (
            <div key={id} style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
              <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#7dd3fc', minWidth: 32, flexShrink: 0 }}>{id}</span>
              <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#94a3b8' }}>{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminDeepRevealEvalPage() {
  return (
    <ProfileStoreProvider>
      <EvalViewer />
    </ProfileStoreProvider>
  );
}
