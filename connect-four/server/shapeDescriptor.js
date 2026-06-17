// Shape descriptor module — derives a canonical shape_key from puzzle data.
// Used for shape-variety draws (Epic 6) so learners don't get consecutive
// puzzles of the same shape.
//
// Each puzzle category has its own derivation rules (Appendix A of spec 035).
// Storage-metadata categories (z_threat, undercut, overcut, figure_7, j_shape)
// use highlight_metadata. Board-replay categories replay the move_string.
// forced_win uses highlight_cells with a board-replay fallback.

import { Board, checkWin, getImmediateThreats } from './classifier.js';
import { computeForcedWinHighlight, checkForbiddenColumnsPredicate } from './candidate-generator.js';

const ROWS = 6;
const COLS = 7;

// ─── Zone bucketing ───────────────────────────────────────────────────────────

export function bucketColZone(col) {
  if (col <= 1) return 'left';
  if (col <= 4) return 'center';
  return 'right';
}

export function bucketRowZone(row) {
  if (row <= 1) return 'low';
  if (row <= 3) return 'mid';
  return 'high';
}

// ─── Deterministic serializer ─────────────────────────────────────────────────

export function serialize(obj) {
  return Object.keys(obj).sort().map(k => {
    const v = obj[k];
    if (v !== null && typeof v === 'object') return `${k}=(${serialize(v)})`;
    return `${k}=${v}`;
  }).join('|');
}

// ─── Win orientation helper ───────────────────────────────────────────────────

function winOrientations(board, row, col, player) {
  const directions = [[0, 1, 'H'], [1, 0, 'V'], [1, 1, 'D↗'], [1, -1, 'D↘']];
  const results = [];
  for (const [dr, dc, label] of directions) {
    let back = 1; // including the cell itself
    for (let d = 1; d <= 3; d++) {
      const r = row - dr * d, c = col - dc * d;
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player) back++;
      else break;
    }
    let fwd = 1;
    for (let d = 1; d <= 3; d++) {
      const r = row + dr * d, c = col + dc * d;
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player) fwd++;
      else break;
    }
    if (back + fwd - 1 >= 4) {
      const pos = back - 1; // 0-indexed position within the run
      results.push({
        orientation: label,
        subtype: (pos === 0 || pos === 3) ? 'run3' : 'gap',
      });
    }
  }
  return results;
}

// ─── Board-replay: immediate_threat, forced_block ─────────────────────────────

function descriptorForImmediateOrForcedBlock(board, correctCol, player) {
  const landingRow = board.colHeights[correctCol];
  const postBoard = board.withMove(correctCol);
  const orients = winOrientations(postBoard.board, landingRow, correctCol, player);

  let orientation;
  let subtype;
  if (orients.length === 0) {
    orientation = null;
    subtype = null;
  } else if (orients.length === 1) {
    orientation = orients[0].orientation;
    subtype = orients[0].subtype;
  } else {
    orientation = 'multi';
    subtype = orients[0].subtype; // use first arm's subtype
  }

  return {
    orientation,
    subtype,
    col_zone: bucketColZone(correctCol),
    row_zone: bucketRowZone(landingRow),
  };
}

// ─── Board-replay: positional categories (forbidden_columns, claimeven, claimodd, odd_even_threat)

function descriptorForPositional(board, correctCol) {
  const landingRow = board.colHeights[correctCol];
  return {
    orientation: null,
    subtype: null,
    col_zone: bucketColZone(correctCol),
    row_zone: bucketRowZone(landingRow),
  };
}

// ─── Board-replay: double_threat ──────────────────────────────────────────────

function descriptorForDoubleThreat(board, correctCol, player) {
  const postBoard = board.withMove(correctCol);
  const opponent = postBoard.opponent;
  const threats = postBoard.reachableThreats(opponent);

  const arms = [];
  for (const [threatCol, threatRows] of threats) {
    for (const threatRow of threatRows) {
      // Simulate opponent placing at threat cell to find winning window
      const tempBoard = postBoard.board.map(r => [...r]);
      tempBoard[threatRow][threatCol] = opponent;
      const orients = winOrientations(tempBoard, threatRow, threatCol, opponent);
      const orient = orients.length > 0 ? orients[0] : { orientation: null, subtype: null };
      arms.push({
        orientation: orient.orientation,
        subtype: orient.subtype,
        col_zone: bucketColZone(threatCol),
        row_zone: bucketRowZone(threatRow),
      });
    }
  }

  // Sort arms by col_zone then row_zone then orientation then subtype
  const zoneOrder = { left: 0, center: 1, right: 2 };
  arms.sort((a, b) => {
    const cz = zoneOrder[a.col_zone] - zoneOrder[b.col_zone];
    if (cz !== 0) return cz;
    const rz = zoneOrder[a.row_zone] - zoneOrder[b.row_zone];
    if (rz !== 0) return rz;
    const o = (a.orientation || '').localeCompare(b.orientation || '');
    if (o !== 0) return o;
    return (a.subtype || '').localeCompare(b.subtype || '');
  });

  // Take first two arms (should be exactly 2 for a valid double_threat)
  const arm1 = arms[0] || { orientation: null, subtype: null, col_zone: null, row_zone: null };
  const arm2 = arms[1] || { orientation: null, subtype: null, col_zone: null, row_zone: null };

  return { arm1, arm2 };
}

// ─── Storage-metadata: z_threat ───────────────────────────────────────────────

function descriptorForZThreat(metadata) {
  if (metadata.type === 'capsule') {
    const midRow = Math.round((metadata.fromRow + metadata.toRow) / 2);
    return {
      orientation: null,
      subtype: null,
      col_zone: bucketColZone(metadata.column),
      row_zone: bucketRowZone(midRow),
    };
  }
  return { orientation: null, subtype: null, col_zone: null, row_zone: null };
}

// ─── Storage-metadata: undercut ───────────────────────────────────────────────

function descriptorForUndercut(metadata) {
  const killingCell = metadata.cells?.find(c => c.role === 'killing_threat');
  if (killingCell) {
    return {
      orientation: null,
      subtype: null,
      col_zone: bucketColZone(killingCell.column),
      row_zone: bucketRowZone(killingCell.row),
    };
  }
  return { orientation: null, subtype: null, col_zone: null, row_zone: null };
}

// ─── Storage-metadata: overcut ────────────────────────────────────────────────

function descriptorForOvercut(metadata) {
  const majorCell = metadata.cells?.find(c => c.role === 'major_threat');
  if (majorCell) {
    return {
      orientation: null,
      subtype: null,
      col_zone: bucketColZone(majorCell.column),
      row_zone: bucketRowZone(majorCell.row),
    };
  }
  return { orientation: null, subtype: null, col_zone: null, row_zone: null };
}

// ─── Storage-metadata: figure_7 ───────────────────────────────────────────────

function descriptorForFigure7(metadata) {
  const cells = metadata.cells;
  if (!cells || cells.length < 4) {
    return { orientation: null, subtype: null, col_zone: null, row_zone: null };
  }

  // Collect row counts to find anchor (sole row)
  const rowCounts = new Map();
  for (const cell of cells) {
    rowCounts.set(cell.row, (rowCounts.get(cell.row) || 0) + 1);
  }

  // Anchor: cell at a row not shared with any other cell
  const anchor = cells.find(c => rowCounts.get(c.row) === 1);
  if (!anchor) return { orientation: null, subtype: null, col_zone: null, row_zone: null };

  // Max-row cells = cells in the row with the most cells
  let maxRow = 0, maxCount = 0;
  for (const [r, cnt] of rowCounts) {
    if (cnt > maxCount) { maxCount = cnt; maxRow = r; }
  }
  const maxRowCells = cells.filter(c => c.row === maxRow);

  // Junction: cell in max-row group whose column is closest to anchor's column
  let junction = maxRowCells[0];
  let minDist = Math.abs(junction.column - anchor.column);
  for (const c of maxRowCells) {
    const dist = Math.abs(c.column - anchor.column);
    if (dist < minDist) { minDist = dist; junction = c; }
  }

  // Orientation
  let orientation;
  if (junction.column > anchor.column) orientation = 'D↗'; // actually 'D↗' = rising diagonal
  else if (junction.column < anchor.column) orientation = 'D↘'; // falling diagonal
  else orientation = null;

  // Centroid
  const avgCol = Math.round(cells.reduce((s, c) => s + c.column, 0) / cells.length);
  const avgRow = Math.round(cells.reduce((s, c) => s + c.row, 0) / cells.length);

  return {
    orientation,
    subtype: null,
    col_zone: bucketColZone(avgCol),
    row_zone: bucketRowZone(avgRow),
  };
}

// ─── Storage-metadata: j_shape ────────────────────────────────────────────────

function descriptorForJShape(metadata) {
  const cells = metadata.cells;
  if (!cells || cells.length < 3) {
    return { orientation: null, subtype: null, col_zone: null, row_zone: null };
  }

  // Find spine: two cells sharing the same column
  const byCol = new Map();
  for (const cell of cells) {
    if (!byCol.has(cell.column)) byCol.set(cell.column, []);
    byCol.get(cell.column).push(cell);
  }

  let spineCol = null;
  for (const [col, colCells] of byCol) {
    if (colCells.length === 2) { spineCol = col; break; }
  }
  if (spineCol === null) return { orientation: null, subtype: null, col_zone: null, row_zone: null };

  const spineCells = byCol.get(spineCol).sort((a, b) => a.row - b.row);
  const lowerSpineRow = spineCells[0].row;

  // Bridge: the remaining cell (col = spineCol ± 1)
  const bridge = cells.find(c => c.column !== spineCol);
  if (!bridge) return { orientation: null, subtype: null, col_zone: null, row_zone: null };

  const orientation = bridge.column > spineCol ? 'canonical' : 'mirror';

  return {
    orientation,
    subtype: null,
    col_zone: bucketColZone(spineCol),
    row_zone: bucketRowZone(lowerSpineRow),
  };
}

// ─── forced_win from highlight_cells ──────────────────────────────────────────

function descriptorForForcedWin(highlightCells) {
  if (!highlightCells || highlightCells.length === 0) {
    return null; // signal to use fallback
  }

  const first = highlightCells[0];
  const last = highlightCells[highlightCells.length - 1];

  let orientation;
  if (first.column === last.column) orientation = 'returning';
  else if (first.column < last.column) orientation = 'ascending';
  else orientation = 'descending';

  return {
    orientation,
    subtype: null,
    col_zone: bucketColZone(first.column),
    row_zone: bucketRowZone(last.row),
  };
}

// ─── Main dispatcher ──────────────────────────────────────────────────────────

export function descriptorForPuzzle(puzzle) {
  const category = puzzle.category;

  // Storage-metadata categories — no board replay needed
  if (category === 'z_threat') return descriptorForZThreat(puzzle.highlight_metadata || {});
  if (category === 'undercut') return descriptorForUndercut(puzzle.highlight_metadata || {});
  if (category === 'overcut') return descriptorForOvercut(puzzle.highlight_metadata || {});
  if (category === 'figure_7') return descriptorForFigure7(puzzle.highlight_metadata || {});
  if (category === 'j_shape') return descriptorForJShape(puzzle.highlight_metadata || {});

  // forced_win — try stored highlight_cells first, fall back to board replay
  if (category === 'forced_win') {
    const fromCells = descriptorForForcedWin(puzzle.highlight_cells);
    if (fromCells) return fromCells;

    // Fallback: compute highlight cells via board replay
    const cells = computeForcedWinHighlight(puzzle.move_string, [puzzle.correct_col]);
    return descriptorForForcedWin(cells) || {
      orientation: null, subtype: null, col_zone: null, row_zone: null,
    };
  }

  // Board-replay categories
  const board = new Board(puzzle.move_string);
  const player = board.currentPlayer;

  if (category === 'immediate_threat' || category === 'forced_block') {
    let correctCol = puzzle.correct_col;
    if (correctCol == null) {
      // Fallback for puzzles approved before correct_col was stored:
      // immediate_threat → column where current player wins immediately
      // forced_block → column where opponent wins immediately (must be blocked)
      const searchPlayer = category === 'immediate_threat' ? player : board.opponent;
      const threats = getImmediateThreats(board.board, board.colHeights, searchPlayer);
      correctCol = threats[0] ?? null;
    }
    if (correctCol == null) return { orientation: null, subtype: null, col_zone: null, row_zone: null };
    return descriptorForImmediateOrForcedBlock(board, correctCol, player);
  }

  if (category === 'double_threat') {
    return descriptorForDoubleThreat(board, puzzle.correct_col, player);
  }

  if (category === 'forbidden_columns' || category === 'claimeven' || category === 'claimodd' || category === 'odd_even_threat') {
    let correctCol = puzzle.correct_col;
    if (correctCol == null && category === 'forbidden_columns') {
      // Fallback: derive a safe col from the board (any col that isn't forbidden)
      const result = checkForbiddenColumnsPredicate(puzzle.move_string);
      correctCol = result.correctCols[0] ?? null;
    }
    if (correctCol == null) return { orientation: null, subtype: null, col_zone: null, row_zone: null };
    return descriptorForPositional(board, correctCol);
  }

  // Unknown category
  return { orientation: null, subtype: null, col_zone: null, row_zone: null };
}

// ─── Convenience ──────────────────────────────────────────────────────────────

export function shapeKeyForPuzzle(puzzle) {
  return serialize(descriptorForPuzzle(puzzle));
}
