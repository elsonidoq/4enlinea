// classifyAiMove — AI-move classification for POST /api/evaluate-move
//
// Extracted from the handler so the classifyPattern + PRIORITY logic is independently
// testable. Used by the evaluate-move handler when req.body.aiMove === true.
//
// FR-005a: classify the post-move board from the AI player's perspective.
// Priority ordering: double_threat > immediate_threat > forced_win > forced_block >
// forbidden_columns > z_threat > odd_even_threat > claimeven >
// figure_7 > j_shape > overcut > undercut.
// double_threat before immediate_threat: a double threat (≥2 gravity-top threats)
// always also fires immediate_threat; the more specific tag must win.

import { classifyPattern } from './classifier.js';

export const AI_PATTERN_PRIORITY = [
  'double_threat', 'immediate_threat', 'forced_win', 'forced_block',
  'forbidden_columns', 'z_threat', 'odd_even_threat', 'claimeven',
  'figure_7', 'j_shape', 'overcut', 'undercut',
];

/**
 * Classify an AI move on the post-move board from the AI player's perspective.
 *
 * @param {string} movestring — pre-move movestring (0-indexed, digits 0–6)
 * @param {number} col — 0-indexed column the AI played
 * @param {object} solver — c4solver wrapper (same interface as solver.query)
 * @returns {Promise<string|null>} patternTag or null if no pattern matched
 */
export async function classifyAiMove(movestring, col, solver) {
  const postMoveMovestring = movestring + String(col);
  const aiPlayerInt = (movestring.length % 2) + 1;
  const tagMap = await classifyPattern(postMoveMovestring, aiPlayerInt, solver);
  return AI_PATTERN_PRIORITY.find(tag => tagMap.has(tag)) ?? null;
}

/**
 * Pure-function version: pick a pattern tag from a Set of matched tag strings
 * using the priority ordering.  Useful for unit tests that mock classifyPattern.
 *
 * @param {Set<string>} tagSet — matched tag slugs
 * @returns {string|null}
 */
export function pickPriorityTag(tagSet) {
  return AI_PATTERN_PRIORITY.find(tag => tagSet.has(tag)) ?? null;
}
