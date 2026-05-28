// CELL_WIDTH = CELL_SIZE(40) + 2*COL_PAD_H(4) = 48 — must match Column.jsx constants.
const CELL_WIDTH = 48;
const NUM_COLS = 7;

const s1Style = {
  fontSize: 10,
  fontWeight: 800,
  padding: '3px 6px',
  borderRadius: 20,
  lineHeight: 1,
  whiteSpace: 'nowrap',
  background: 'rgba(34,197,94,.15)',
  color: 'var(--green)',
  border: '1px solid rgba(34,197,94,.35)',
};


export function BadgeRow({ colRankings }) {
  const bestCols = new Set(colRankings ? colRankings.map(({ col }) => col) : []);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      padding: '0 8px 3px',
    }}>
      {Array.from({ length: NUM_COLS }, (_, col) => (
        <div
          key={col}
          style={{
            width: CELL_WIDTH,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            height: 26,
          }}
        >
          {bestCols.has(col) && <span style={s1Style}>★</span>}
        </div>
      ))}
    </div>
  );
}
