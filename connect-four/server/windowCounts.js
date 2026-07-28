/**
 * Per-cell "live window" counts for lesson board overlays.
 *
 * For each EMPTY cell, counts the four-in-a-row windows through it that contain no
 * opponent disc — i.e. the lines the learner can still complete through that square.
 * Own discs never reduce the count; only the opponent's do.
 *
 * Perspective is the LEARNER (lesson.userPerspective), deliberately NOT the side to
 * move: the target lessons are userPerspective 'red' while most of their slides have
 * 'yellow' to move, and the overlay must answer "where should I play", not "where
 * should my opponent play".
 *
 * On an empty board no window has an opponent disc, so every count degenerates to pure
 * geometry (13 at the two middle centre cells, 3 at a corner, 69 windows in total).
 * That is the same one formula, not a special case.
 *
 * Pure: no I/O, no dependency on the lesson loader. Coordinates are 0-indexed with
 * row 0 = bottom, per the project-wide convention.
 */

const ROWS = 6;
const COLS = 7;

/** All 69 four-in-a-row windows, each an ordered array of 4 {c,r} cells. */
export const ALL_WINDOWS = (() => {
  const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
  const out = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      for (const [dc, dr] of dirs) {
        const cells = [];
        for (let i = 0; i < 4; i++) cells.push({ c: c + i * dc, r: r + i * dr });
        if (cells.every(x => x.c >= 0 && x.c < COLS && x.r >= 0 && x.r < ROWS)) out.push(cells);
      }
    }
  }
  return out;
})();

/**
 * Replay a movestring into a Map keyed "c,r" -> 'red' | 'yellow'.
 * Move 0 is 'red' (player 1), move 1 is 'yellow' — matches src/lib/movestring.js.
 */
function placeDiscs(movestring) {
  const heights = Array(COLS).fill(0);
  const discs = new Map();
  for (let i = 0; i < movestring.length; i++) {
    const c = Number(movestring[i]);
    if (!Number.isInteger(c) || c < 0 || c >= COLS) continue;
    if (heights[c] >= ROWS) continue;
    discs.set(`${c},${heights[c]}`, i % 2 === 0 ? 'red' : 'yellow');
    heights[c] += 1;
  }
  return discs;
}

/**
 * @param {string} movestring        0-indexed column digits
 * @param {'red'|'yellow'} userPerspective  the LEARNER's player token
 * @returns {Array<Array<number|null>>}  [row][col], row 0 = bottom, null where occupied
 */
export function computeWindowCounts(movestring, userPerspective) {
  const discs = placeDiscs(movestring ?? '');
  const opponent = userPerspective === 'red' ? 'yellow' : 'red';

  const grid = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      row.push(discs.has(`${c},${r}`) ? null : 0);
    }
    grid.push(row);
  }

  for (const window of ALL_WINDOWS) {
    if (window.some(x => discs.get(`${x.c},${x.r}`) === opponent)) continue;
    for (const { c, r } of window) {
      if (grid[r][c] !== null) grid[r][c] += 1;
    }
  }

  return grid;
}
