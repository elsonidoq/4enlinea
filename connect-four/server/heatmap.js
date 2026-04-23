/**
 * Pure function: given the two heatmap grids from the C++ solver and the
 * game context, returns { human, ai } correctly labelled.
 *
 * The C++ solver always treats player 0 as the first to move.
 * After `movesLength` moves, the current player in the C++ position is
 * player (movesLength % 2).
 *
 *   humanFirst=true  → player 0 = human, player 1 = AI
 *   humanFirst=false → player 0 = AI,    player 1 = human
 *
 * Human is the "current" player in the C++ position when:
 *   humanFirst && movesLength%2===0  (player 0 = human is current)
 *   !humanFirst && movesLength%2===1 (player 1 = human is current)
 */
export function assignHeatmaps(current, opponent, movesLength, humanFirst) {
  const humanIsCurrent = humanFirst
    ? movesLength % 2 === 0
    : movesLength % 2 === 1;
  return {
    human: humanIsCurrent ? current : opponent,
    ai:    humanIsCurrent ? opponent : current,
  };
}
