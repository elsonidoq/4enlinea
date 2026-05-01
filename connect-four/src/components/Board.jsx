import { useState } from 'react';
import { Column } from './Column.jsx';

const ROWS = 6;
const COLS = 7;
const EMPTY_BOARD = Array.from({ length: ROWS }, () => Array(COLS).fill('empty'));

export function Board({ board = EMPTY_BOARD, onColumnClick, canPlay = false, highlightedCells = [] }) {
  const [hoverCol, setHoverCol] = useState(null);

  const columns = Array.from({ length: COLS }, (_, col) => {
    const cells = Array.from({ length: ROWS }, (_, row) => board[row]?.[col] ?? 'empty');
    const colHighlights = highlightedCells
      .filter(([, c]) => c === col)
      .map(([r, , type]) => [r, type]);
    return { cells, highlights: colHighlights };
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
      }}
      onMouseLeave={() => setHoverCol(null)}
    >
      {columns.map(({ cells, highlights }, col) => (
        <Column
          key={col}
          col={col}
          cells={cells}
          onClick={onColumnClick}
          isHovered={hoverCol === col}
          canPlay={canPlay && cells[ROWS - 1] === 'empty'}
          highlightedCells={highlights}
          onMouseEnter={() => setHoverCol(col)}
        />
      ))}
    </div>
  );
}
