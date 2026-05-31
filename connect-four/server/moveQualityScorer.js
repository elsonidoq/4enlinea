// Pure function — no imports, no side effects.
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
