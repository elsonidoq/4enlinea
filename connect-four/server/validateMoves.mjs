// Shared movestring format validator. Extracted verbatim from index.js (Task 15)
// so it can be imported in tests/other modules without dragging in server boot
// side-effects (index.js starts the solver process, opens DB connections, etc.
// on import).

export const MOVES_RE = /^[0-6]{0,42}$/;

export function validateMoves(moves) {
  if (typeof moves !== 'string') return 'moves must be a string';
  if (!MOVES_RE.test(moves)) return 'moves must be 0–42 characters of digits 0–6';
  return null;
}
