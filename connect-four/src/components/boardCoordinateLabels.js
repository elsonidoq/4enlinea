// Spec 058 US4 (FR-014) — pure label-derivation for Board.jsx's showCoordinates overlay.
//
// Extracted to a plain .js module (not inlined in Board.jsx) for the same reason
// boardA11y.js exists: Board.jsx contains JSX, which `node --test` cannot parse without the
// tests/dom loader, so anything that needs a fast (non-DOM) unit test must live outside it.
// Board.jsx imports and renders these arrays directly, so there is exactly one source of the
// numbering — the test below exercises the real production values, not a duplicate belief.
//
// Internal coordinates are 0-indexed (row 0 = bottom, col 0 = leftmost) per CLAUDE.md's
// project-wide invariant; these are the +1 conversion to the 1-indexed *display* convention,
// applied only here at the frontend-display boundary.

/** 1-indexed column numbers, left→right, matching Board's COLS=7 column render order. */
export function getColumnLabels() {
  return [1, 2, 3, 4, 5, 6, 7];
}

/** 1-indexed row numbers, top→bottom, matching Board's internal [5,4,3,2,1,0] render order. */
export function getRowLabels() {
  return [6, 5, 4, 3, 2, 1];
}
