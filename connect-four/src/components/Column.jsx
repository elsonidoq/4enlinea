import { Piece } from './Piece.jsx';

export function Column({ col, cells, onClick, isHovered, canPlay, highlightedCells = [] }) {
  return (
    <div
      onClick={canPlay ? () => onClick(col) : undefined}
      style={{
        display: 'flex',
        flexDirection: 'column-reverse',
        gap: 5,
        padding: '6px 4px',
        cursor: canPlay ? 'pointer' : 'default',
        background: isHovered && canPlay ? 'rgba(245, 184, 32, .08)' : 'transparent',
        borderRadius: 6,
        transition: 'background .15s',
      }}
    >
      {cells.map((color, row) => {
        const highlight = highlightedCells.find(([r]) => r === row)?.[1] ?? null;
        return (
          <Piece
            key={row}
            color={color}
            highlight={highlight}
          />
        );
      })}
    </div>
  );
}
