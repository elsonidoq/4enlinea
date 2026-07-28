/**
 * Lesson window highlights — authored capsule overlays for concept slides.
 *
 * A concept slide may carry:
 *
 *   "windowHighlights": [
 *     {
 *       "type": "claim",
 *       "cells": [{"c":1,"r":0},{"c":2,"r":0},{"c":3,"r":0},{"c":4,"r":0}],
 *       "label": "…", "label_es": "…"
 *     }
 *   ]
 *
 * `cells` is 0-indexed (row 0 = bottom, col 0 = left) and MUST be ordered along the
 * line: Board draws one capsule from the first cell to the last, so an unordered array
 * silently produces the wrong length or angle. `type` reuses the LOCKED OverlayType
 * tokens (see docs/architecture/frontend-conventions.md) so a window and a per-cell
 * overlay of the same type read as the same colour.
 *
 * `label` is optional and, when present, renders as its own legend row — deliberately
 * NOT through `legendItems`, whose content gate requires a matching per-cell *overlay*
 * of the same type on the same slide.
 */

/**
 * Capsule colours, keyed by OverlayType token.
 *
 * Opaque on purpose: Board renders the capsule at `opacity="0.4"`, so feeding it an
 * already-translucent `rgba(…, 0.4)` (as ConceptScreen's legend swatches use) would
 * compound to ~0.16 and vanish against the board.
 */
export const WINDOW_HIGHLIGHT_COLOR = {
  tg:    '#4caf50',  // current-player (green) threat
  td:    '#8e8e8e',  // opponent (gray) threat
  claim: '#f59e0b',  // amber — neutral "look at this window" marker
  win:   '#4caf50',
};

/** Fallback for an unknown/absent token — visible, but obviously not a palette colour. */
export const DEFAULT_WINDOW_HIGHLIGHT_COLOR = '#8b5cf6';

const ROWS = 6;
const COLS = 7;

function isOnBoard(cell) {
  return (
    cell != null &&
    Number.isInteger(cell.c) && cell.c >= 0 && cell.c < COLS &&
    Number.isInteger(cell.r) && cell.r >= 0 && cell.r < ROWS
  );
}

/**
 * True iff `cells` is 2–4 on-board cells forming a contiguous straight line, listed in
 * traversal order (either direction). This is the geometry the capsule renderer assumes;
 * `tests/unit/lessonContent.test.js` enforces it over every authored lesson.
 *
 * @param {Array<{c:number,r:number}>} cells
 * @returns {boolean}
 */
export function isStraightLineWindow(cells) {
  if (!Array.isArray(cells) || cells.length < 2 || cells.length > 4) return false;
  if (!cells.every(isOnBoard)) return false;

  const dc = cells[1].c - cells[0].c;
  const dr = cells[1].r - cells[0].r;
  // A unit step in one of the four Connect Four directions (or their reverses).
  if (Math.abs(dc) > 1 || Math.abs(dr) > 1) return false;
  if (dc === 0 && dr === 0) return false;

  for (let i = 1; i < cells.length; i++) {
    if (cells[i].c - cells[i - 1].c !== dc) return false;
    if (cells[i].r - cells[i - 1].r !== dr) return false;
  }
  return true;
}

/**
 * Map a slide's authored `windowHighlights` onto Board's `zhCells` prop.
 *
 * One entry per window so overlapping windows keep their own colour (Board renders each
 * zhCells entry independently). The `windows` key takes Board's structural branch: one
 * capsule per window, first cell → last cell, no run-detection heuristics.
 *
 * Degenerate entries (missing/short `cells`) are dropped rather than throwing — a
 * malformed authoring should lose its capsule, never blank the lesson.
 *
 * @param {Array<{type?: string, cells?: Array<{c:number,r:number}>}>} windowHighlights
 * @returns {Array<{color: string, windows: Array<Array<{c:number,r:number}>>}>}
 */
export function windowHighlightsToZhCells(windowHighlights) {
  if (!Array.isArray(windowHighlights)) return [];
  return windowHighlights
    .filter(w => w != null && Array.isArray(w.cells) && w.cells.length >= 2)
    .map(w => ({
      color: WINDOW_HIGHLIGHT_COLOR[w.type] ?? DEFAULT_WINDOW_HIGHLIGHT_COLOR,
      windows: [w.cells],
    }));
}

/**
 * The largest number of four-in-a-row windows through any cell on an empty board (the two
 * middle cells of the centre column). The tint scale is pinned to this FIXED value rather
 * than to the maximum on the board being drawn: as the opponent kills lines the counts fall
 * and the board visibly dims, and that decay is the thing the overlay exists to show. A
 * per-board maximum would re-saturate every board and erase it.
 */
export const WINDOW_COUNT_MAX = 13;

/** Peak alpha, at a count of WINDOW_COUNT_MAX. Stays readable behind the digit. */
const WINDOW_COUNT_PEAK_ALPHA = 0.55;

/**
 * Violet, matching DEFAULT_WINDOW_HIGHLIGHT_COLOR (#8b5cf6): the app's neutral structural
 * colour, chosen so the overlay collides with neither the green/gray discs nor the amber
 * `claim` / red `tr` overlays.
 * @param {number} count
 * @returns {string} a CSS colour; 'transparent' at zero
 */
export function windowCountTint(count) {
  if (!count || count <= 0) return 'transparent';
  const alpha = Math.min(count, WINDOW_COUNT_MAX) / WINDOW_COUNT_MAX * WINDOW_COUNT_PEAK_ALPHA;
  return `rgba(139, 92, 246, ${Number(alpha.toFixed(4))})`;
}
