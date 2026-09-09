// Colour rule for the `win` board overlay — shared between what the board PAINTS and
// what the legend CLAIMS (OI-168).
//
// `win` is the only overlay type whose colour is not fixed by the type: it rings a disc
// and therefore has to take that disc's identity, the same way `tg`/`td` split. Board
// (`src/components/Board.jsx`, the `ovType === 'win'` branch) implements exactly this
// rule inline; ConceptScreen's legend imports it from here so the swatch cannot drift
// from the ring. `tests/unit/winLegendSwatch.test.js` carries a divergence guard that
// pins Board.jsx's two tokens to the constants below.
//
// Cell values are the historical P1/P2 identity tokens, NOT display colours:
//   'red'    → player 1 → GREEN disc
//   'yellow' → player 2 → GRAY disc
//   'empty'  → no occupant

/** Ring/swatch colour for a `win` overlay on a green (P1) disc, or on an empty cell. */
export const WIN_OVERLAY_GREEN = 'var(--eval-good)';

/** Ring/swatch colour for a `win` overlay on a gray (P2) disc. */
export const WIN_OVERLAY_GRAY = 'var(--disc-gray-hi)';

/**
 * The colour Board.jsx rings a single `win` overlay cell in.
 *
 * An EMPTY cell has no occupant: there the overlay is a "play here" target marker
 * rather than a disc annotation (lesson-06-the-fork slide 3), and it keeps the green
 * eval colour. Anything that is not a gray disc is green — mirroring the board's own
 * `value === 'yellow' ? gray : green`.
 *
 * @param {string|undefined} cellValue  'red' | 'yellow' | 'empty' | undefined
 * @returns {string} a CSS colour token
 */
export function winOverlayColor(cellValue) {
  return cellValue === 'yellow' ? WIN_OVERLAY_GRAY : WIN_OVERLAY_GREEN;
}

/**
 * The colour for a legend row of type `win` on a slide.
 *
 * A legend row describes the slide's whole set of `win` overlays with one swatch, so it
 * can only be honest when every one of them rings the same kind of cell. When they
 * agree, the swatch takes that colour; when they DON'T (no shipped slide does today —
 * every `win` slide is single-occupant), it falls back to green, the board's own
 * default for anything that is not a gray disc, rather than picking a majority and
 * mislabelling the rest.
 *
 * @param {string[][]} board  6x7 board array, row 0 = bottom (from `boardSpecToBoard`).
 * @param {Array<{c:number,r:number,type:string}>} overlays  the slide's overlays.
 * @returns {string} a CSS colour token
 */
export function winLegendColor(board, overlays = []) {
  const winCells = (overlays ?? []).filter(o => o && o.type === 'win');
  if (winCells.length === 0) return WIN_OVERLAY_GREEN;
  const colors = new Set(winCells.map(o => winOverlayColor(board?.[o.r]?.[o.c])));
  return colors.size === 1 ? [...colors][0] : WIN_OVERLAY_GREEN;
}
