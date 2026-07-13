/**
 * Shared application constants.
 *
 * @module constants
 */

/** Milliseconds between player-move coach message and AI continuation (FR-014, FR-015). */
export const COACH_PACING_MS = 1200;

/** Solver sentinel score for a full/illegal column. */
export const INVALID_MOVE = -1000;

/**
 * Promise-based delay.
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
