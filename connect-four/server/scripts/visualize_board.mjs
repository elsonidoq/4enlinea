import { parseBoardState, checkWin } from '../classifier.js';
import { createSolverProcess } from '../c4solver-wrapper.js';

const ROWS = 6;
const COLS = 7;
const EMPTY_BOARD_SCORES = [0, 0, 1, 2, 1, 0, 0];

const moves = process.argv[2] ?? '';

// Returns map "r,c" -> { rm, rn, ym, yn } for all empty cells with any threat.
// rm = red major (3 discs), rn = red minor (2 discs), ym/yn = same for yellow.
function buildThreatMap(board) {
  const map = {};
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] !== 0) continue;
      let rm = false, rn = false, ym = false, yn = false;
      for (const [dr, dc] of dirs) {
        for (let off = 0; off <= 3; off++) {
          const sr = r - dr*off, sc = c - dc*off;
          let red = 0, yel = 0, valid = true;
          for (let i = 0; i < 4; i++) {
            const nr = sr + dr*i, nc = sc + dc*i;
            if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) { valid = false; break; }
            if (board[nr][nc] === 1) red++;
            else if (board[nr][nc] === 2) yel++;
          }
          if (!valid || (red > 0 && yel > 0)) continue;
          const empty = 4 - red - yel;
          if (red === 3 && empty === 1) rm = true;
          else if (red === 2 && empty === 2) rn = true;
          if (yel === 3 && empty === 1) ym = true;
          else if (yel === 2 && empty === 2) yn = true;
        }
      }
      if (rm || rn || ym || yn) map[`${r},${c}`] = { rm, rn, ym, yn };
    }
  }
  return map;
}

// Raw board: 3-char cell (space-padded symbol).
function rawCell(v) {
  if (v === 1) return ' R ';
  if (v === 2) return ' Y ';
  return '   ';
}

// Annotated board: 3-char inner value, rendered as ' VALUE ' (5-char cell).
// Discs: "R 1" / "Y42"  (player + padStart(2) move number)
// Major threat: "[R]" / "[Y]" / "[*]" (both)
// Minor threat: "(r)" / "(y)" / "(*)" (both)
// Empty: "   "
function annotatedValue(r, c, board, moveGrid, threatMap) {
  const v = board[r][c];
  if (v !== 0) {
    const player = v === 1 ? 'R' : 'Y';
    return player + String(moveGrid[r][c]).padStart(2);
  }
  const t = threatMap[`${r},${c}`];
  if (!t) return '   ';
  if (t.rm || t.ym) {
    if (t.rm && t.ym) return '[*]';
    return t.rm ? '[R]' : '[Y]';
  }
  if (t.rn && t.yn) return '(*)';
  return t.rn ? '(r)' : '(y)';
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

  const threatMap = buildThreatMap(board);

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

  const nextPlayer = moves.length % 2 === 0 ? 'Red' : 'Yellow';
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
  // 5-char cells: ' VALUE ' where VALUE is 3 chars
  // Each col slot in header = 1 (sep) + 5 (content) = 6 chars; digit at offset 3 → abs pos 8
  console.log('     ' + Array.from({length: COLS}, (_, i) => `   ${i+1}  `).join(''));
  for (let row = ROWS - 1; row >= 0; row--) {
    const cells = Array.from({length: COLS}, (_, c) => {
      return ' ' + annotatedValue(row, c, board, moveGrid, threatMap) + ' ';
    }).join('|');
    console.log(`  ${row + 1}  |${cells}|`);
  }

  console.log('');

  // Parity row (5-char cells): ' NP  ' where N=empty count, P=O/E
  const parLine = Array.from({length: COLS}, (_, c) => {
    const empty = ROWS - colHeights[c];
    return ' ' + empty + (empty % 2 === 1 ? 'O' : 'E') + '  ';
  }).join('|');
  console.log(` par |${parLine}|  (empty cells: O=odd E=even)`);

  // Solver scores row (5-char cells): ' NNN ' right-aligned, or '  -- ' for full columns
  if (scores) {
    const scrLine = scores.map((s, c) => {
      if (colHeights[c] >= ROWS) return '  -- ';
      return ' ' + String(s).padStart(3) + ' ';
    }).join('|');
    console.log(` scr |${scrLine}|  (solver score)`);
  }

  // Major threat summary
  const majorThreats = [];
  for (const [key, t] of Object.entries(threatMap)) {
    if (!t.rm && !t.ym) continue;
    const [r, c] = key.split(',').map(Number);
    const who = (t.rm && t.ym) ? 'R+Y' : t.rm ? 'R' : 'Y';
    majorThreats.push({ col: c + 1, row: r + 1, who });
  }
  if (majorThreats.length > 0) {
    majorThreats.sort((a, b) => a.col - b.col || a.row - b.row);
    const list = majorThreats.map(({ col, row, who }) => `col${col} row${row} (${who})`).join('   ');
    console.log(`  Major threats: ${list}`);
  } else {
    console.log('  Major threats: none');
  }

  console.log('');
  console.log('  Legend: R/Y = disc(move#)   [R]/[Y] = major threat (3-in-row)   (r)/(y) = minor threat (2-in-row)');
  console.log('          [*]/(*) = both players   par: O=odd E=even   scr: solver score per column');
}

main().catch(e => { console.error(e); process.exit(1); });
