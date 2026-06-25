// Center-dominance reason generator.
//
// Lightweight, simulation-free grounding for the deep-reveal coach on opening /
// near-empty positions. When the look-ahead returns nothing (no tactical structure
// to ground) the coach used to fall back on generic filler. In the opening the
// honest, board-findable reason is centrality: the more central a column is, the
// more four-in-a-row windows pass through it, so it can take part in more future
// threats and shapes. This detector produces that reason when — and only when — the
// better move is strictly more central than the played move on an early board.
//
// All columns are 0-indexed (project-wide invariant). The board is 7 wide, so the
// center column is index 3.

const CENTER_COL = 3;

// Beyond the opening, "more central = stronger" stops being reliably true (concrete
// threats and parity take over), so the reason is confined to early positions.
export const CENTER_DOMINANCE_MAX_PLY = 6;

// Distance-from-center is the player-findable signal: a column closer to the middle
// sits in more winning lines. Higher = more central.
function centrality(col) {
  return -Math.abs(col - CENTER_COL);
}

/**
 * Detect whether the better move is preferable purely because it is more central.
 *
 * @param {object} args
 * @param {string} args.movestring  pre-move movestring (length = plies played)
 * @param {number} args.playedCol   0-indexed column actually played (the blunder)
 * @param {number} args.bestCol     0-indexed column that was better
 * @returns {{ bestCol: number, playedCol: number, reason: string } | null}
 *   A grounded reason object, or null when center-dominance does not apply
 *   (not an early board, or the better move is not strictly more central).
 */
export function detectCenterDominance({ movestring, playedCol, bestCol }) {
  if (typeof playedCol !== 'number' || typeof bestCol !== 'number') return null;
  const plyCount = (movestring || '').length;
  if (plyCount > CENTER_DOMINANCE_MAX_PLY) return null;
  // The better move must be strictly closer to the center than the played move.
  if (centrality(bestCol) <= centrality(playedCol)) return null;

  const reason = `In the opening, the more central a column is, the more four-in-a-row lines run through it, so it can take part in more future threats and shapes. Column ${bestCol + 1} sits in more of those lines than column ${playedCol + 1}, so playing there keeps more ways to build a winning connection open, while the less central choice gives some of them up.`;

  return { bestCol, playedCol, reason };
}
