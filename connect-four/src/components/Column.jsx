import { Piece } from './Piece.jsx';

const ROWS = 6;
const CELL_SIZE = 40;
const GAP = 5;
const STEP = CELL_SIZE + GAP;
const COL_PAD_V = 6;
const COL_PAD_H = 4;

export function Column({ col, cells, onClick, isHovered, canPlay, highlightedCells = [], capsule = null }) {
  return (
    <div
      onClick={canPlay ? () => onClick(col) : undefined}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column-reverse',
        gap: GAP,
        padding: `${COL_PAD_V}px ${COL_PAD_H}px`,
        cursor: canPlay ? 'pointer' : 'default',
        background: isHovered && canPlay ? 'rgba(245, 184, 32, .08)' : 'transparent',
        borderRadius: 6,
        transition: 'background .15s',
      }}
    >
      {cells.map((color, row) => {
        const found = highlightedCells.find(([r]) => r === row);
        const highlight = found?.[1] ?? null;
        const step = found?.[2] ?? null;
        return (
          <Piece
            key={row}
            color={color}
            highlight={highlight}
            step={step}
          />
        );
      })}

      {capsule && (() => {
        const { fromRow, toRow, badgeCount } = capsule;
        const top = COL_PAD_V + (ROWS - 1 - toRow) * STEP;
        const height = (toRow - fromRow) * STEP + CELL_SIZE;
        return (
          <>
            <div
              style={{
                position: 'absolute',
                left: COL_PAD_H,
                top,
                width: CELL_SIZE,
                height,
                borderRadius: 9999,
                border: '2px solid var(--yellow)',
                pointerEvents: 'none',
                zIndex: 10,
              }}
            />
            {badgeCount != null && (
              <span
                style={{
                  position: 'absolute',
                  top: -22,
                  left: COL_PAD_H + CELL_SIZE / 2,
                  transform: 'translateX(-50%)',
                  fontSize: 11,
                  fontWeight: 800,
                  color: 'var(--yellow)',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--yellow)',
                  borderRadius: 6,
                  padding: '1px 5px',
                  pointerEvents: 'none',
                  zIndex: 11,
                  whiteSpace: 'nowrap',
                }}
              >
                {badgeCount}
              </span>
            )}
          </>
        );
      })()}
    </div>
  );
}
