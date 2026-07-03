// Resolve a vector cell to a grounded object (spec §3c). Pure; reuses classifier's board model.
import { parseBoardState } from '../classifier.js';

export function cellToRC(cell) {
  const m = /^c(\d+)r(\d+)$/.exec(cell);
  if (!m) throw new Error(`bad cell: ${cell}`);
  return [Number(m[2]) - 1, Number(m[1]) - 1]; // [row, col], 0-indexed
}
export function rcToCell(r, c) { return `c${c + 1}r${r + 1}`; }

export function horizonForRegister(register) {
  if (register === 'immediate') return 'immediate';
  if (register === 'forced_sequence') return 'deep-forced-line';
  if (register === 'parity') return 'deep-parity';
  return 'immediate'; // conservative default; only these three registers exist in the corpus
}

export function statusOf(cell, board, colHeights, perspectivePlayer) {
  const [r, c] = cellToRC(cell);
  const v = board[r]?.[c] ?? 0;
  if (v !== 0) return v === perspectivePlayer ? 'occupied-you' : 'occupied-opp';
  return r === colHeights[c] ? 'empty-playable-now' : 'empty';
}

export function reachableInPlies(cell, finalMovestring) {
  const [r, c] = cellToRC(cell);
  const heights = Array(7).fill(0);
  for (let i = 0; i < (finalMovestring || '').length; i++) {
    const col = Number(finalMovestring[i]);
    if (Number.isNaN(col) || col < 0 || col >= 7) continue;
    const row = heights[col];
    if (row >= 6) continue;
    if (col === c && row === r) return i;
    heights[col]++;
  }
  return null;
}

export function groundCell(cell, { board, colHeights, finalMovestring, register, role, perspectivePlayer }) {
  return {
    cell,
    status: statusOf(cell, board, colHeights, perspectivePlayer),
    horizon: horizonForRegister(register),
    reachableInPlies: reachableInPlies(cell, finalMovestring),
    role: role ?? null,
  };
}
