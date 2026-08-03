import React, { useState, useCallback } from 'react';
import { Board } from '../Board.jsx';
import {
  parseMovestring, appendMove, undoMove, isColFull,
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
 *
 * Optional cell-picking surface for an OWNER-DRIVEN mode (used by SlideEditor's
 * windowHighlights control). BoardEditor deliberately knows nothing about the
 * windowHighlights schema — it only lends its board:
 *   zhCells: Array — forwarded verbatim to Board's zhCells capsule renderer (preview only)
 *   pickCellsActive: boolean — when true, every board click routes to onPickCell and
 *     the disc/overlay toolbar is replaced by a notice; disc placement is suspended
 *   onPickCell: (col, row) => void
 *   pickCellsNotice: string — what to tell the admin while picking
 *
 * All four default to inert, so callers that don't pass them (SocraticEditor) get the
 * exact previous behaviour and no extra UI. No caller migration required.
 */
export default function BoardEditor({
  movestring, overlays, onMovestringChange, onOverlaysChange, label,
  zhCells = [], pickCellsActive = false, onPickCell, pickCellsNotice = '',
}) {
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

      {/* Mode toolbar — replaced wholesale while an owner is picking cells, so the admin
          can't half-place a disc into the position they're annotating. */}
      {pickCellsActive ? (
        <div style={{
          padding: '5px 10px', borderRadius: 6, fontSize: 12,
          border: '1px dashed #8b5cf6', color: '#c4b5fd', background: 'rgba(139,92,246,0.08)',
        }}>
          {pickCellsNotice || 'Click board cells to pick them.'}
        </div>
      ) : (
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
      )}

      {/* Board */}
      <Board
        board={board}
        overlays={overlays}
        zhCells={zhCells}
        onColumnClick={!pickCellsActive && mode === 'disc' ? handleColumnClick : undefined}
        onCellClick={pickCellsActive ? onPickCell : (mode === 'overlay' ? handleCellClick : undefined)}
        canPlay={!pickCellsActive && mode === 'disc'}
      />
    </div>
  );
}
