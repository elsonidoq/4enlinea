// FR-032 / FR-033: classify a played column against solver scores.

/**
 * @param {number[]} scores   7 solver scores for the position (0-indexed cols).
 *                            Positive = current player wins, 0 = draw, negative = loses.
 * @param {number}  playedCol 0-indexed column the user played.
 * @returns {{ badge: 'good'|'mid'|'bad', quality: 'optimal'|'suboptimal'|'blunder', bestCol: number }}
 */
export function scoreMove(scores, playedCol) {
  // 1. Find best score and best column (lowest index on tie)
  let bestScore = scores[0];
  let bestCol = 0;
  for (let i = 1; i < scores.length; i++) {
    if (scores[i] > bestScore) {
      bestScore = scores[i];
      bestCol = i;
    }
  }

  const played = scores[playedCol];

  // Helper: sign ordering — positive (>0) > zero (===0) > negative (<0)
  function sign(v) {
    if (v > 0) return 1;
    if (v === 0) return 0;
    return -1;
  }

  // 2. Losing position branch: all scores are negative
  if (bestScore < 0) {
    let quality;
    if (played === bestScore) {
      quality = 'optimal';
    } else if (played < bestScore - 4) {
      quality = 'blunder';
    } else {
      quality = 'suboptimal';
    }
    const badge = quality === 'optimal' ? 'good' : quality === 'blunder' ? 'bad' : 'mid';
    return { badge, quality, bestCol };
  }

  // 3. Standard branch
  let quality;
  if (played === bestScore) {
    quality = 'optimal';
  } else if (sign(played) === sign(bestScore)) {
    // Same sign category but strictly less — suboptimal
    quality = 'suboptimal';
  } else {
    // sign(played) < sign(bestScore)
    quality = 'blunder';
  }

  const badge = quality === 'optimal' ? 'good' : quality === 'blunder' ? 'bad' : 'mid';
  return { badge, quality, bestCol };
}

const INVALID_MOVE = -1000;

/**
 * Complete depth-D scan of the game tree starting from the post-blunder position.
 *
 * At each internal node every playable column is explored (no pruning), so the
 * leaf count is exactly the product of playable-column counts at each ply
 * (≤ 7^depth, typically ~343 for depth=3 in mid-game).
 *
 * The "opponent" is whoever is to move at postBlunderMoveString — i.e. the
 * player who benefits from the blunder.
 *
 * @param {object} solver  - solver process from createSolverProcess()
 * @param {string} postBlunderMoveString - movestring after the blunder move (0-indexed cols)
 * @param {number} depth   - ply depth to scan (default 3)
 * @returns {Promise<{opponentWins:number, draws:number, userWins:number, total:number, severity:number}>}
 *   severity = opponentWins / total
 */
export async function computeBlunderSeverity(solver, postBlunderMoveString, depth = 3) {
  // opponentTurn=true when the opponent (beneficiary of blunder) is to move.
  // scores[col] from solver.query() is always from the current mover's POV,
  // so we flip sign when the user is moving to normalise to opponent's POV.
  async function scan(moveString, remainingDepth, opponentTurn) {
    let scores;
    try {
      scores = await solver.query(moveString);
    } catch {
      // Position is game-over: the previous mover won.
      // opponentTurn=true  → user just moved and won  → userWin
      // opponentTurn=false → opponent just moved and won → opponentWin
      return opponentTurn
        ? { opponentWins: 0, draws: 0, userWins: 1 }
        : { opponentWins: 1, draws: 0, userWins: 0 };
    }

    if (remainingDepth === 1) {
      let opponentWins = 0, draws = 0, userWins = 0;
      for (const s of scores) {
        if (s === INVALID_MOVE) continue;
        const forOpponent = opponentTurn ? s : -s;
        if (forOpponent > 0) opponentWins++;
        else if (forOpponent === 0) draws++;
        else userWins++;
      }
      return { opponentWins, draws, userWins };
    }

    let opponentWins = 0, draws = 0, userWins = 0;
    for (let col = 0; col < 7; col++) {
      if (scores[col] === INVALID_MOVE) continue;
      const sub = await scan(moveString + String(col), remainingDepth - 1, !opponentTurn);
      opponentWins += sub.opponentWins;
      draws += sub.draws;
      userWins += sub.userWins;
    }
    return { opponentWins, draws, userWins };
  }

  const result = await scan(postBlunderMoveString, depth, true);
  const total = result.opponentWins + result.draws + result.userWins;
  return { ...result, total, severity: total > 0 ? result.opponentWins / total : 0 };
}
