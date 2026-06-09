import { Board } from '../Board.jsx';
import { buildBoard } from '../../lib/board.js';

/**
 * Compact row showing one curated puzzle in the confirmation list.
 *
 * Props:
 *   puzzle: object      — curated puzzle entry {moveString, goalPrompt, correctCol, puzzleId, ...}
 *   index: number        — 0-based position
 *   total: number        — total count (for disabling boundary arrows)
 *   onRemove(): void
 *   onMoveUp(): void
 *   onMoveDown(): void
 */
export default function PuzzlePickerRow({ puzzle, index, total, onRemove, onMoveUp, onMoveDown }) {
  const { board } = buildBoard(puzzle.moveString || '');

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: '#2a2a2a', borderRadius: 8, padding: '8px 10px',
      border: '1px solid #333',
    }}>
      {/* Index */}
      <span style={{ fontSize: 13, fontWeight: 700, color: '#888', minWidth: 24, textAlign: 'center' }}>
        {index + 1}
      </span>

      {/* Mini board */}
      <div style={{ width: 100, flexShrink: 0 }}>
        <Board board={board} canPlay={false} compact />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {puzzle.goalPrompt || `Puzzle ${index + 1}`}
        </div>
        <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>
          {puzzle.moveString} · col {puzzle.correctCol}
          {puzzle.puzzleId && (
            <span style={{ color: '#666', marginLeft: 6 }}>{puzzle.puzzleId.slice(0, 8)}…</span>
          )}
        </div>
      </div>

      {/* Reorder + remove buttons */}
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        <button
          onClick={onMoveUp}
          disabled={index === 0}
          title="Move up"
          style={{
            padding: '2px 8px', borderRadius: 4, cursor: index === 0 ? 'not-allowed' : 'pointer',
            background: '#333', color: index === 0 ? '#555' : '#ccc', border: 'none', fontSize: 14,
          }}
        >↑</button>
        <button
          onClick={onMoveDown}
          disabled={index === total - 1}
          title="Move down"
          style={{
            padding: '2px 8px', borderRadius: 4, cursor: index === total - 1 ? 'not-allowed' : 'pointer',
            background: '#333', color: index === total - 1 ? '#555' : '#ccc', border: 'none', fontSize: 14,
          }}
        >↓</button>
        <button
          onClick={onRemove}
          title="Remove"
          style={{
            padding: '2px 8px', borderRadius: 4, cursor: 'pointer',
            background: '#7f1d1d', color: '#fca5a5', border: 'none', fontSize: 14,
          }}
        >✕</button>
      </div>
    </div>
  );
}
