#!/usr/bin/env node
// parity_cells.mjs — same-perspective z-threat / parity cell extractor.
//
// WHY THIS EXISTS:
//   classifier.js detectZThreat ALWAYS returns cells:[] (it returns a capsule
//   highlightMetadata, never a kept/surrendered cell set), and when
//   perspective !== board.currentPlayer it takes the FR-033 recursion path and
//   returns {matched, cells:[]} with no geometry at all. The parity_control
//   reason payload needs a NON-EMPTY kept/surrendered cell set for a chosen
//   perspective regardless of whose turn it is on the board. This tool replays
//   detectZThreat's *direct-branch geometry* (odd-distance winning threat),
//   perspective-clean and solver-free, and returns the actual cNrM cells.
//
// Usage: node parity_cells.mjs <movestring> <perspective 1|2>
//   prints JSON { perspective, zThreatCells:[cNrM], oddThreatCells, allThreatCells }
//
// A "z-threat / odd threat" candidate (per detectZThreat): a column whose
// lowest winning cell for `perspective` sits an ODD number of cells above the
// current stack top (badgeCount odd). We return every such winning cell, not
// just the single-candidate case detectZThreat gates on.

import { Board, checkWin } from '../../../classifier.js';

const ROWS = 6, COLS = 7;
const cell = (col, row) => `c${col + 1}r${row + 1}`; // 0-idx internal -> 1-idx display

export function parityCells(movestring, perspective) {
  const board = new Board(movestring);
  const zThreatCells = [];   // odd-distance (z/odd threat) winning cells
  const allThreatCells = []; // every empty winning cell for perspective (any parity)
  for (let col = 0; col < COLS; col++) {
    if (board.colHeights[col] >= ROWS) continue;
    for (let row = board.colHeights[col]; row < ROWS; row++) {
      if (!checkWin(board.board, row, col, perspective)) continue;
      allThreatCells.push(cell(col, row));
      const count = row - board.colHeights[col] + 1; // inclusive distance
      if (count % 2 === 1) zThreatCells.push(cell(col, row));
      break; // lowest winning cell per column (matches detectZThreat)
    }
  }
  return { movestring, perspective, currentPlayer: board.currentPlayer, zThreatCells, allThreatCells };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [ms, p] = process.argv.slice(2);
  if (!ms || !p) { console.error('usage: parity_cells.mjs <movestring> <perspective 1|2>'); process.exit(1); }
  console.log(JSON.stringify(parityCells(ms, Number(p)), null, 2));
}
