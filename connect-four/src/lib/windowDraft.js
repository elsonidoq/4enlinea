/**
 * Draft state for authoring a `windowHighlights` entry in the admin lesson editor.
 *
 * The admin builds a window by clicking board cells one at a time, so the draft is an
 * ORDERED array — click order IS array order. That matters: Board draws one capsule from
 * `cells[0]` to `cells[last]` and validates nothing in between, so an out-of-order array
 * silently draws a capsule of the wrong length or angle (see src/lib/lessonWindows.js).
 *
 * These helpers are pure so the order/validity rules can be tested without a DOM. The
 * geometry predicate itself is NOT reimplemented here — `isStraightLineWindow` from
 * lessonWindows.js is the single source of truth, and the same predicate gates authored
 * lessons in tests/unit/lessonContent.test.js.
 */
import { isStraightLineWindow } from './lessonWindows.js';

/** A window is 2–4 cells (a Connect Four line window). Matches isStraightLineWindow. */
export const MAX_WINDOW_CELLS = 4;

/**
 * Apply one board click to a draft.
 *
 * Clicking an unselected cell APPENDS it (preserving click order); clicking an already
 * selected cell removes it, so a misclick is undoable in place. Appending past
 * MAX_WINDOW_CELLS is refused with a reason rather than silently dropped.
 *
 * @param {Array<{c:number,r:number}>} cells current draft, in order
 * @param {{c:number,r:number}} cell the clicked cell
 * @returns {{cells: Array<{c:number,r:number}>, error: string|null}}
 */
export function toggleWindowCell(cells, cell) {
  const i = cells.findIndex(x => x.c === cell.c && x.r === cell.r);
  if (i >= 0) {
    return { cells: cells.filter((_, j) => j !== i), error: null };
  }
  if (cells.length >= MAX_WINDOW_CELLS) {
    return {
      cells,
      error: `A window is at most ${MAX_WINDOW_CELLS} cells — click a selected cell to remove it first.`,
    };
  }
  return { cells: [...cells, { c: cell.c, r: cell.r }], error: null };
}

/**
 * Re-order a draft into line-traversal order.
 *
 * Sorting by column ascending (tie-broken by row ascending) yields the traversal order for
 * every Connect Four direction: horizontal and both diagonals advance in `c`, and a vertical
 * window has a constant `c` so the row tie-break orders it. Cells that don't form a line are
 * returned reordered but still invalid — this only fixes ORDER, never geometry.
 *
 * @param {Array<{c:number,r:number}>} cells
 * @returns {Array<{c:number,r:number}>}
 */
export function sortWindowCells(cells) {
  return [...cells].sort((a, b) => (a.c - b.c) || (a.r - b.r));
}

/**
 * Describe a draft for the admin: is it committable, why not, and can a re-sort fix it.
 *
 * `canFixOrder` isolates the one failure mode that is invisible on the rendered board — the
 * cells DO form a line but were clicked out of order, which draws a plausible-looking capsule
 * over the wrong span. A bent or gapped selection cannot be fixed by re-ordering.
 *
 * @param {Array<{c:number,r:number}>} cells
 * @returns {{valid: boolean, canFixOrder: boolean, message: string}}
 */
export function describeWindowDraft(cells) {
  const list = Array.isArray(cells) ? cells : [];

  if (list.length === 0) {
    return { valid: false, canFixOrder: false, message: 'Click 2–4 board cells, in order along the line.' };
  }
  if (list.length === 1) {
    return { valid: false, canFixOrder: false, message: 'Pick at least one more cell (a window is 2–4 cells).' };
  }
  if (isStraightLineWindow(list)) {
    return { valid: true, canFixOrder: false, message: `Straight line of ${list.length} cells — ready to add.` };
  }
  if (isStraightLineWindow(sortWindowCells(list))) {
    return {
      valid: false,
      canFixOrder: true,
      message: 'These cells form a line but were clicked out of order — the capsule would span the wrong cells.',
    };
  }
  return {
    valid: false,
    canFixOrder: false,
    message: 'Not a contiguous straight line: a window must be adjacent cells along one row, column, or diagonal.',
  };
}
