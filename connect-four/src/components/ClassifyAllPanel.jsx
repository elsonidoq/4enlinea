import { useEffect, useRef, useState } from 'react';

const API = import.meta.env.VITE_API_BASE_URL || '';

const ROLE_ABBREV = {
  killing_threat: 'kill',
  dead_threat: 'dead',
  neutralised_threat: 'neut',
  major_threat: 'major',
  pattern_piece: 'piece',
};

function formatHighlight(highlightMetadata) {
  if (!highlightMetadata) return '—';
  if (highlightMetadata.type === 'capsule') {
    const { column, fromRow, toRow, badgeCount } = highlightMetadata;
    return `capsule col${column} r${fromRow}→r${toRow} ×${badgeCount}`;
  }
  if (highlightMetadata.type === 'cells') {
    return highlightMetadata.cells
      .map(({ column, row, role }) => `c${column}r${row} ${ROLE_ABBREV[role] ?? role}`)
      .join(' · ');
  }
  return '—';
}

function formatDetails(detectorName, result) {
  if (!result.matched) return '—';
  const ev = result.categoryEvidence ?? {};
  const parts = [];
  if (result.cols != null) parts.push(`cols: [${result.cols.join(',')}]`);
  if (result.correctCol != null) parts.push(`correct→${result.correctCol}`);
  if (ev.pattern_cells) parts.push(`pattern: ${ev.pattern_cells.length} cells`);
  if (ev.threat_cells) parts.push(`threats: ${ev.threat_cells.length} cells`);
  if (ev.subtype) parts.push(`subtype: ${ev.subtype}`);
  if (ev.baseinverse_pair) parts.push(`baseinverse: [${ev.baseinverse_pair.join(',')}]`);
  if (ev.simulation_trace) parts.push(`trace: ${ev.simulation_trace.length} moves`);
  return parts.length ? parts.join(' · ') : '—';
}

function DetectorRow({ detectorName, result }) {
  const [expanded, setExpanded] = useState(false);
  const matched = result.matched;

  return (
    <>
      <tr style={{ borderBottom: '1px solid var(--border-dim)' }}>
        <td style={tdStyle}>{detectorName}</td>
        <td style={{ ...tdStyle, color: matched ? 'var(--green)' : 'var(--text-muted)', textAlign: 'center' }}>
          {matched ? '✓' : '—'}
        </td>
        <td style={{ ...tdStyle, color: 'var(--text-sub)' }}>{formatHighlight(result.highlightMetadata)}</td>
        <td style={{ ...tdStyle, color: 'var(--text-sub)' }}>{formatDetails(detectorName, result)}</td>
        <td style={{ ...tdStyle, textAlign: 'center' }}>
          {matched && (
            <button onClick={() => setExpanded(v => !v)} style={expandBtn}>
              {expanded ? '▼' : '▶'}
            </button>
          )}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={5} style={{ padding: '4px 8px 8px' }}>
            <pre style={preStyle}>
              {JSON.stringify({ highlightMetadata: result.highlightMetadata, categoryEvidence: result.categoryEvidence }, null, 2)}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}

function BoardStateSection({ boardState, scores }) {
  const [expanded, setExpanded] = useState(false);

  const scoresLine = scores
    .map((s, i) => `col${i}:${s > 0 ? '+' : ''}${s}`)
    .join('  ');

  return (
    <div style={{ marginTop: 12 }}>
      <button onClick={() => setExpanded(v => !v)} style={sectionToggleBtn}>
        {expanded ? '▼' : '▶'} Board State
      </button>
      {expanded && (
        <table style={tableStyle}>
          <tbody>
            {[
              ['player', boardState.currentPlayer],
              ['moves', boardState.moveCount],
              ['scores', scoresLine],
              ['immediate Red', boardState.immediateThreatsRed.length ? `[${boardState.immediateThreatsRed.join(', ')}]` : 'none'],
              ['immediate Yellow', boardState.immediateThreatsYellow.length ? `[${boardState.immediateThreatsYellow.join(', ')}]` : 'none'],
              ['reachable Red', boardState.reachableThreatsRed],
              ['reachable Yellow', boardState.reachableThreatsYellow],
              ['double threat Red', String(boardState.doubleThreatsRed)],
              ['double threat Yellow', String(boardState.doubleThreatsYellow)],
            ].map(([k, v]) => (
              <tr key={k} style={{ borderBottom: '1px solid var(--border-dim)' }}>
                <td style={{ ...tdStyle, color: 'var(--text-muted)', width: 140 }}>{k}</td>
                <td style={{ ...tdStyle, color: 'var(--text-sub)', fontFamily: 'monospace' }}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function ClassifyAllPanel({ humanMovestring, aiMovestring }) {
  const [playerMode, setPlayerMode] = useState('human');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  const movestring = playerMode === 'human' ? humanMovestring : aiMovestring;
  const aiAvailable = !!aiMovestring;

  useEffect(() => {
    if (!movestring) { setData(null); setError(null); return; }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API}/api/debug/classify-all`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ moves: movestring }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setData(await res.json());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [movestring]);

  return (
    <div style={panelStyle}>
      <div style={{ ...headerStyle, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span>classify_all</span>
        <div style={toggleGroupStyle}>
          {['human', 'ai'].map(mode => (
            <button
              key={mode}
              onClick={() => { if (mode === 'ai' && !aiAvailable) return; setPlayerMode(mode); }}
              style={{
                ...toggleBtnStyle,
                background: playerMode === mode ? 'var(--text-muted)' : 'transparent',
                color: playerMode === mode ? 'var(--bg)' : (mode === 'ai' && !aiAvailable ? 'var(--border)' : 'var(--text-muted)'),
                cursor: mode === 'ai' && !aiAvailable ? 'default' : 'pointer',
              }}
            >
              {mode}
            </button>
          ))}
        </div>
        <span style={{ color: 'var(--text-muted)' }}>{movestring || '(no moves yet)'}</span>
      </div>

      {loading && <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>loading…</div>}
      {error && <div style={{ color: 'var(--red)', fontSize: 11 }}>error: {error}</div>}

      {data && (
        <>
          <table style={tableStyle}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['detector', 'match', 'highlight', 'details', ''].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.detectors.map(({ detectorName, result }) => (
                <DetectorRow key={detectorName} detectorName={detectorName} result={result} />
              ))}
            </tbody>
          </table>
          <BoardStateSection boardState={data.boardState} scores={data.scores} />
        </>
      )}
    </div>
  );
}

const panelStyle = {
  margin: '12px 16px 0',
  padding: 12,
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 11,
  fontFamily: "'Courier New', monospace",
};

const headerStyle = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
  color: 'var(--text-sub)',
  marginBottom: 8,
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
};

const thStyle = {
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: '1px',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
  textAlign: 'left',
  padding: '2px 8px',
};

const tdStyle = {
  padding: '4px 8px',
  verticalAlign: 'top',
};

const expandBtn = {
  background: 'none',
  border: 'none',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  fontSize: 10,
  padding: '0 4px',
};

const sectionToggleBtn = {
  background: 'none',
  border: 'none',
  color: 'var(--text-sub)',
  cursor: 'pointer',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '1px',
  textTransform: 'uppercase',
  padding: '4px 0',
  fontFamily: "'Courier New', monospace",
};

const preStyle = {
  fontSize: 10,
  background: 'var(--bg)',
  border: '1px solid var(--border-dim)',
  borderRadius: 4,
  padding: '6px 8px',
  overflowX: 'auto',
  margin: 0,
  color: 'var(--text-sub)',
};

const toggleGroupStyle = {
  display: 'flex',
  border: '1px solid var(--border)',
  borderRadius: 4,
  overflow: 'hidden',
};

const toggleBtnStyle = {
  border: 'none',
  padding: '2px 8px',
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: '1px',
  textTransform: 'uppercase',
  fontFamily: "'Courier New', monospace",
  transition: 'background .1s, color .1s',
};
