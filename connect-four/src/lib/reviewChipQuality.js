// Task 17 (finding 14): "red chip opens a SUBOPTIMAL detail" — Review's move-timeline chip
// color came from the live `scoreMove` badge quality (analysis.moves[].quality), while
// MistakeDetailScreen's title comes from the STORED row's quality
// (server/mistakeStorageRule.js#classifyStoredMistake). The two can disagree (memory
// project_mistake_storage_rule: "badge quality != stored quality"), so a chip could render
// red (blunder, live badge) yet open a detail titled SUBOPTIMAL (stored).
//
// Fix: where a stored row exists for a ply (an entry in gameBlunderList, sourced from
// GET /api/coach/queue — see server/index.js's `enriched` mapping, which keeps `quality:
// b.quality ?? 'blunder'` all the way to the client), the chip must use the STORED quality,
// since the stored row is the durable truth the detail screen shows. Only plies with no
// stored row (moves the storage rule excluded — e.g. slower wins, dead-position faster
// losses) fall back to the live badge quality.
//
// Do NOT change classifyStoredMistake/the storage rule — this reconciles the display only.

/**
 * Per-player move ordinal -> 0-indexed global ply index, matching the formula used
 * throughout ReviewScreen.jsx (navigateToMistake, moveIndexToPlyCount, selectStep).
 * @param {'first'|'second'} side
 * @param {number} moveIndex per-player move ordinal (1-based)
 * @returns {number} 0-indexed ply position in the full movestring
 */
export function globalPlyIndexForMove(side, moveIndex) {
  return side === 'first' ? 2 * (moveIndex - 1) : 2 * (moveIndex - 1) + 1;
}

/**
 * Resolves the quality a Review chip should render for a move: the stored row's quality
 * when one exists for this ply, else the live badge quality from `move.quality`.
 * @param {{ moveIndex: number, quality: string }} move an entry of analysis.moves
 * @param {'first'|'second'} side analysis.side
 * @param {Array<{ moveIndex: number, quality: string }>} gameBlunderList stored mistake rows
 *   (moveIndex here is already the 0-indexed global ply — see server GET /api/coach/queue)
 * @returns {string} the quality to color the chip with
 */
export function resolveChipQuality(move, side, gameBlunderList) {
  const globalPlyIndex = globalPlyIndexForMove(side, move.moveIndex);
  const stored = gameBlunderList.find(b => b.moveIndex === globalPlyIndex);
  return stored ? stored.quality : move.quality;
}
