import { useState } from 'react';
import { Column } from './Column.jsx';

const ROWS = 6;
const COLS = 7;
const EMPTY_BOARD = Array.from({ length: ROWS }, () => Array(COLS).fill('empty'));

export function Board({ board = EMPTY_BOARD, onColumnClick, canPlay = false, highlightedCells = [], highlightMetadata = null }) {
  const [hoverCol, setHoverCol] = useState(null);

  // Merge cells-type highlightMetadata into highlightedCells
  const allHighlightedCells = [...highlightedCells];
  if (highlightMetadata?.type === 'cells') {
    for (const { column, row, role } of highlightMetadata.cells) {
      allHighlightedCells.push([row, column, role]);
    }
  }

  const columns = Array.from({ length: COLS }, (_, col) => {
    const cells = Array.from({ length: ROWS }, (_, row) => board[row]?.[col] ?? 'empty');
    const colHighlights = allHighlightedCells
      .filter(([, c]) => c === col)
      .map(([r, , type, step = null]) => [r, type, step]);
    const capsule = highlightMetadata?.type === 'capsule' && highlightMetadata.column === col
      ? { fromRow: highlightMetadata.fromRow, toRow: highlightMetadata.toRow, badgeCount: highlightMetadata.badgeCount }
      : null;
    return { cells, highlights: colHighlights, capsule };
  });

  return (
    <div
      style={{
        display: 'inline-flex',
        background: 'var(--surface-2)',
        borderRadius: 12,
        border: '1px solid var(--border)',
        padding: 8,
        gap: 0,
        width: '100%',
        justifyContent: 'center',
        position: 'relative',
        paddingTop: highlightMetadata?.type === 'capsule' ? 32 : 8,
      }}
      onMouseLeave={() => setHoverCol(null)}
    >
      {columns.map(({ cells, highlights, capsule }, col) => (
        <Column
          key={col}
          col={col}
          cells={cells}
          onClick={onColumnClick}
          isHovered={hoverCol === col}
          canPlay={canPlay && cells[ROWS - 1] === 'empty'}
          highlightedCells={highlights}
          capsule={capsule}
          onMouseEnter={() => setHoverCol(col)}
        />
      ))}
    </div>
  );
}
