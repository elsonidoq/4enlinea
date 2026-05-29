import { classifyAll, Board } from '../classifier.js';
import { createSolverProcess } from '../c4solver-wrapper.js';

const ROWS = 6;
const COLS = 7;

const moves = process.argv[2] ?? '';

const solver = createSolverProcess();
let scores, detectorResults;
try {
  scores = await solver.query(moves);
  const board = new Board(moves);
  detectorResults = await classifyAll(moves, scores, solver);

  // ── Board state ─────────────────────────────────────────────────────────────
  const playerName = p => p === 1 ? 'Red' : 'Yellow';
  console.log('=== BOARD STATE ===');
  console.log('movestring:', moves);
  console.log('move_count:', moves.length);
  console.log('current_player:', playerName(board.currentPlayer));
  console.log('opponent:', playerName(board.opponent));
  console.log('');

  // ── Raw board grid (row 5 = top) ─────────────────────────────────────────────
  console.log('=== BOARD GRID (row 5=top, row 0=bottom, 0-indexed) ===');
  for (let row = ROWS - 1; row >= 0; row--) {
    const cells = board.board[row].map(v => v === 1 ? 'R' : v === 2 ? 'Y' : '.').join(' ');
    console.log(`row ${row}: ${cells}`);
  }
  console.log('col:  ', Array.from({length: COLS}, (_, i) => i).join(' '));
  console.log('');

  // ── Column heights & parity ───────────────────────────────────────────────
  console.log('=== COLUMN INFO ===');
  const heights = board.colHeights;
  console.log('col_heights (next empty row per col):', heights.join(' '));
  const parities = heights.map(h => {
    const empty = ROWS - h;
    return empty === 0 ? 'full' : (empty % 2 === 1 ? 'odd' : 'even');
  });
  console.log('col_parity  (empty cells remaining):  ', parities.join(' '));
  console.log('');

  // ── Solver scores ─────────────────────────────────────────────────────────
  console.log('=== SOLVER SCORES (positive=Red wins, negative=Yellow wins, 0=draw) ===');
  console.log('col:   ', Array.from({length: COLS}, (_, i) => i).join('  '));
  console.log('score: ', scores.map(s => String(s).padStart(2)).join(' '));
  console.log('');

  // ── Immediate threats ─────────────────────────────────────────────────────
  console.log('=== IMMEDIATE THREATS (cols where player wins on next drop) ===');
  for (const player of [1, 2]) {
    const cols = board.immediateThreats(player);
    console.log(`${playerName(player)}: cols [${cols.join(', ')}]`);
  }
  console.log('');

  // ── Reachable threats ─────────────────────────────────────────────────────
  console.log('=== REACHABLE THREATS (all future winning cells, gravity-respecting) ===');
  for (const player of [1, 2]) {
    const map = board.reachableThreats(player);
    const entries = [];
    for (const [col, rows] of map) entries.push(`col${col}:rows[${rows.join(',')}]`);
    console.log(`${playerName(player)}: ${entries.length ? entries.join('  ') : 'none'}`);
  }
  console.log('');

  // ── Double threats ────────────────────────────────────────────────────────
  console.log('=== ACTIVE DOUBLE THREATS ===');
  for (const player of [1, 2]) {
    console.log(`${playerName(player)}: ${board.hasActiveDoubleThreat(player)}`);
  }
  console.log('');

  // ── Major/minor threat cells ─────────────────────────────────────────────
  console.log('=== THREAT MAP PER CELL (rm=Red major, rn=Red minor, ym=Yellow major, yn=Yellow minor) ===');
  const threatCells = board.majorThreatCells();
  const entries = Object.entries(threatCells).sort(([a], [b]) => {
    const [ar, ac] = a.split(',').map(Number);
    const [br, bc] = b.split(',').map(Number);
    return ac - bc || ar - br;
  });
  if (entries.length === 0) {
    console.log('none');
  } else {
    for (const [key, flags] of entries) {
      const [r, c] = key.split(',');
      const active = Object.entries(flags).filter(([, v]) => v).map(([k]) => k).join(',');
      console.log(`  col${c} row${r}: ${active}`);
    }
  }
  console.log('');

  // ── Pattern detectors ─────────────────────────────────────────────────────
  console.log('=== PATTERN DETECTORS ===');
  for (const { detectorName, result } of detectorResults) {
    console.log(`${detectorName}:`, JSON.stringify(result));
  }
} finally {
  solver.destroy();
}
