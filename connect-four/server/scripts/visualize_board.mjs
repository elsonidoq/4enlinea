import { parseBoardState, checkWin, getMajorThreatCells } from '../classifier.js';
import { createSolverProcess } from '../c4solver-wrapper.js';

const ROWS = 6;
const COLS = 7;
const EMPTY_BOARD_SCORES = [0, 0, 1, 2, 1, 0, 0];

const moves = process.argv[2] ?? '';


// Raw board: 3-char cell (space-padded symbol).
function rawCell(v) {
  if (v === 1) return 'Gn ';
  if (v === 2) return 'Gy ';
  return '   ';
}

// Annotated board: 4-char inner value, rendered as ' VALUE ' (6-char cell).
// Discs: "Gn 1" / "Gy42"  (player(2) + padStart(2) move number)
// Major threat gravity-top: "<Gn>" / "<Gy>" / "<*> "  ← immediately playable
// Major threat non-gravity:  "[Gn]" / "[Gy]" / "[*] "
// Minor threat: "(gn)" / "(gy)" / "(*) " (both)
// Empty: "    "
function annotatedValue(r, c, board, moveGrid, threatMap, colHeights) {
  const v = board[r][c];
  if (v !== 0) {
    const player = v === 1 ? 'Gn' : 'Gy';
    return player + String(moveGrid[r][c]).padStart(2);
  }
  const t = threatMap[`${r},${c}`];
  if (!t) return '    ';
  if (t.rm || t.ym) {
    const isGT = r === colHeights[c];
    if (t.rm && t.ym) return isGT ? '<*> ' : '[*] ';
    if (t.rm)         return isGT ? '<Gn>' : '[Gn]';
    return                   isGT ? '<Gy>' : '[Gy]';
  }
  if (t.rn && t.yn) return '(*) ';
  return t.rn ? '(gn)' : '(gy)';
}

async function main() {
  const { board, colHeights } = parseBoardState(moves);

  // Build move number grid
  const moveGrid = Array.from({length: ROWS}, () => Array(COLS).fill(0));
  const tmpH = Array(COLS).fill(0);
  for (let i = 0; i < moves.length; i++) {
    const col = parseInt(moves[i], 10);
    moveGrid[tmpH[col]][col] = i + 1;
    tmpH[col]++;
  }

  const threatMap = getMajorThreatCells(board);

  // Detect game over (solver hangs on won positions)
  let gameOver = false;
  if (moves.length > 0) {
    const lastCol = parseInt(moves[moves.length - 1], 10);
    const lastRow = colHeights[lastCol] - 1;
    const lastPlayer = moves.length % 2 === 1 ? 1 : 2;
    gameOver = checkWin(board, lastRow, lastCol, lastPlayer);
  }

  // Get solver scores
  let scores = null;
  if (!gameOver) {
    if (moves.length === 0) {
      scores = EMPTY_BOARD_SCORES;
    } else {
      const solver = createSolverProcess();
      try {
        scores = await solver.query(moves);
      } catch {
        // solver unavailable
      } finally {
        solver.destroy();
      }
    }
  }

  const nextPlayer = moves.length % 2 === 0 ? 'Green' : 'Gray';
  console.log(`  Move ${moves.length}  |  Next: ${nextPlayer}${gameOver ? '  [GAME OVER]' : ''}`);
  console.log('');

  // ── Raw board ──────────────────────────────────────────────────────────────
  // 3-char cells: ' R ', ' Y ', '   '
  // Each col slot in header = 1 (sep) + 3 (content) = 4 chars; digit at offset 2 → abs pos 7
  console.log('     ' + Array.from({length: COLS}, (_, i) => `  ${i+1} `).join(''));
  for (let row = ROWS - 1; row >= 0; row--) {
    const cells = board[row].map(v => rawCell(v)).join('|');
    console.log(`  ${row + 1}  |${cells}|`);
  }

  console.log('');

  // ── Annotated board ────────────────────────────────────────────────────────
  // 6-char cells: ' VALUE ' where VALUE is 4 chars
  // Each col slot in header = 1 (sep) + 6 (content) = 7 chars; digit centered
  console.log('     ' + Array.from({length: COLS}, (_, i) => `   ${i+1}   `).join(''));
  for (let row = ROWS - 1; row >= 0; row--) {
    const cells = Array.from({length: COLS}, (_, c) => {
      return ' ' + annotatedValue(row, c, board, moveGrid, threatMap, colHeights) + ' ';
    }).join('|');
    console.log(`  ${row + 1}  |${cells}|`);
  }

  console.log('');

  // Column heights row (6-char cells)
  const htLine = Array.from({length: COLS}, (_, c) => {
    return '  ' + String(colHeights[c]).padStart(2) + '  ';
  }).join('|');
  console.log(`  ht |${htLine}|  (discs in column)`);

  // Parity row (6-char cells): '  NP  ' where N=empty count, P=O/E
  const parLine = Array.from({length: COLS}, (_, c) => {
    const empty = ROWS - colHeights[c];
    return '  ' + empty + (empty % 2 === 1 ? 'O' : 'E') + '  ';
  }).join('|');
  console.log(` par |${parLine}|  (empty cells: O=odd E=even)`);

  // Solver scores row (6-char cells): ' NNN  ' right-aligned, or '  --  ' for full columns
  if (scores) {
    const scrLine = scores.map((s, c) => {
      if (colHeights[c] >= ROWS) return '  --  ';
      return ' ' + String(s).padStart(3) + '  ';
    }).join('|');
    console.log(` scr |${scrLine}|  (solver score)`);
  }

  // Major threat summary
  const majorThreats = [];
  for (const [key, t] of Object.entries(threatMap)) {
    if (!t.rm && !t.ym) continue;
    const [r, c] = key.split(',').map(Number);
    const who = (t.rm && t.ym) ? 'Gn+Gy' : t.rm ? 'Gn' : 'Gy';
    majorThreats.push({ col: c + 1, row: r + 1, who });
  }
  if (majorThreats.length > 0) {
    majorThreats.sort((a, b) => a.col - b.col || a.row - b.row);
    const list = majorThreats.map(({ col, row, who }) => {
      const isGT = (row - 1) === colHeights[col - 1]; // convert to 0-indexed
      return `col${col} row${row} (${who})${isGT ? ' [GT]' : ''}`;
    }).join('   ');
    console.log(`  Major threats: ${list}`);
  } else {
    console.log('  Major threats: none');
  }

  console.log('');
  console.log('  Legend: Gn=Green  Gy=Gray   Gn/Gy = disc(move#)   <Gn>/<Gy> = major threat gravity-top (immediately playable)');
  console.log('          [Gn]/[Gy] = major threat non-gravity   (gn)/(gy) = minor threat   [GT] = gravity-top in threats list');
  console.log('          [*]/(*) = both players   ht: disc count   par: O=odd E=even   scr: solver score per column');
}

main().catch(e => { console.error(e); process.exit(1); });
