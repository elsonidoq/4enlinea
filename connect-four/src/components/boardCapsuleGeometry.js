// Pure geometry predicate for Board.jsx's `windows:` capsule overlay.
//
// Extracted to a plain .js module (not inlined in Board.jsx) for the same reason
// boardCoordinateLabels.js exists: Board.jsx contains JSX, which `node --test` cannot parse
// without the tests/dom loader, so anything that needs a fast (non-DOM) unit test must live
// outside it. Board.jsx imports this directly, so the test exercises the production predicate.
//
// Coordinates are 0-indexed internal cells ({ c, r }, row 0 = bottom) per CLAUDE.md.

/**
 * True when the cells step by a constant unit vector (horizontal, vertical, or ±1/±1
 * diagonal), i.e. they really are one straight, contiguous line on the board.
 *
 * Callers pass groups of >= 2 cells (zoneToWindowGroups already drops shorter ones).
 *
 * @param {Array<{c: number, r: number}>} cells  Cells in the order the producer emitted them.
 * @returns {boolean}
 */
export function isContiguousLine(cells) {
  const dc = cells[1].c - cells[0].c;
  const dr = cells[1].r - cells[0].r;
  if (Math.abs(dc) > 1 || Math.abs(dr) > 1 || (dc === 0 && dr === 0)) return false;
  for (let i = 2; i < cells.length; i++) {
    if (cells[i].c - cells[i - 1].c !== dc || cells[i].r - cells[i - 1].r !== dr) return false;
  }
  return true;
}
