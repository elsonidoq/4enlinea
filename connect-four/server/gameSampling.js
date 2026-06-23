// Canonical game-simulation harness.
//
// THIS IS THE SIMULATOR. If you need to generate real game positions (for eval
// sets, test fixtures, blunder coverage, position sampling, finding a board with a
// given property, etc.) do NOT hand-roll another game loop — use this module:
//   - `playGame(solver, rng)` — THE primitive. Async generator yielding each ply's
//     position before the move; `break` early once you find what you want.
//   - `simulateGame(solver, rng)` — drain `playGame` into a full game
//     ({ ms, scoresCache }).
//   - `harvestBlunders(solver, opts)` — generator yielding every non-optimal ply,
//     ready to classify/record. The blunder use case.
// See docs/architecture/server-conventions.md ("Simulating games").

import { Board, hasWon } from './classifier.js';
import { scoreMove } from './moveQualityScorer.js';

const COLS = 7;
const ROWS = 6;
const INVALID_MOVE = -1000;

/**
 * Graduated severity of a blunder: how far the played score fell below the best,
 * normalised to a 0–10 scale.
 * @param {number} bestScore  solver score of the best column
 * @param {number} score      solver score of the played column
 * @returns {number}
 */
export function computeSeverity(bestScore, score) {
  return Math.round((bestScore - score) / 36 * 10);
}

/**
 * Mistake-probability column sampler. With probability `mp`, play the second-best
 * legal column (a deliberate mistake); otherwise play uniformly among the best.
 * @param {number[]} scores  solver scores (INVALID_MOVE for full columns)
 * @param {number} mp        mistake probability in [0, 1)
 * @param {() => number} rng random source in [0, 1)
 * @returns {number} chosen 0-indexed column
 */
function sampleColMP(scores, mp, rng) {
  const legal = scores.map((s, i) => ({ s, i })).filter(e => e.s > INVALID_MOVE);
  if (!legal.length) return 0;

  const maxScore = Math.max(...legal.map(e => e.s));

  if (legal.length > 1 && rng() < mp) {
    const belowMax = legal.filter(e => e.s < maxScore);
    if (belowMax.length > 0) {
      const secondBest = Math.max(...belowMax.map(e => e.s));
      const tied = belowMax.filter(e => e.s === secondBest);
      return tied[Math.floor(rng() * tied.length)].i;
    }
  }

  const tiedBest = legal.filter(e => e.s === maxScore);
  return tiedBest[Math.floor(rng() * tiedBest.length)].i;
}

/**
 * THE primitive. Async generator that plays one mistake-weighted self-play game,
 * yielding the state at each ply BEFORE the move is applied. Each player draws an
 * independent mistake probability in [0, 0.5). Stops at a win or a full board.
 *
 * Because it yields per ply, a caller can inspect each position and `break` as soon
 * as it finds a board with a desired property — no whole-game cost, no callbacks /
 * inversion of control. `simulateGame` and `harvestBlunders` are both built on it.
 *
 * Yields, per ply:
 *   {
 *     ms,         // movestring BEFORE this move (the position being evaluated)
 *     scores,     // solver scores at `ms`
 *     player,     // 1 (Red) or 2 (Yellow) — whose turn it is
 *     movePlayed, // 0-indexed column the simulator will play from this position
 *     plyIndex,   // 0-based index of this move within the game
 *   }
 *
 * Each player draws an independent mistake probability in `[0, maxMistakeProb)`
 * (default `0.5`). Callers that need a different mistake intensity (e.g.
 * candidate generation) pass `maxMistakeProb`; the two rng draws happen in the
 * same order regardless, so the rng contract is unchanged.
 *
 * @param {object} solver  c4solver wrapper
 * @param {() => number} rng  random source in [0, 1)
 * @param {{ maxMistakeProb?: number }} [opts]
 */
export async function* playGame(solver, rng = Math.random, { maxMistakeProb = 0.5 } = {}) {
  const mistakeProbs = [rng() * maxMistakeProb, rng() * maxMistakeProb];

  let ms = '';
  const heights = Array(COLS).fill(0);
  const board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  let player = 1;
  let plyIndex = 0;

  while (ms.length < COLS * ROWS) {
    const legal = [];
    for (let c = 0; c < COLS; c++) { if (heights[c] < ROWS) legal.push(c); }
    if (!legal.length) break;

    const scores = await solver.query(ms);
    const movePlayed = sampleColMP(scores, mistakeProbs[player - 1], rng);

    yield { ms, scores, player, movePlayed, plyIndex };

    ms += String(movePlayed);
    board[heights[movePlayed]][movePlayed] = player;
    heights[movePlayed]++;
    plyIndex++;

    if (hasWon(board, player)) break;
    player = 3 - player;
  }
}

/**
 * Plays one mistake-weighted self-play game to completion (win or full board).
 * Thin convenience over `playGame` that accumulates the whole game.
 * @param {object} solver  c4solver wrapper
 * @param {() => number} rng
 * @returns {Promise<{ ms: string, scoresCache: number[][] }>} the full movestring
 *          and the per-ply solver scores (scoresCache[i] = scores before move i).
 */
export async function simulateGame(solver, rng = Math.random) {
  let ms = '';
  const scoresCache = [];
  for await (const pos of playGame(solver, rng)) {
    scoresCache.push(pos.scores);
    ms = pos.ms + String(pos.movePlayed);
  }
  return { ms, scoresCache };
}

/**
 * Async generator that plays mistake-weighted self-play games and yields EVERY
 * non-optimal ply (i.e. every blunder/suboptimal move), with everything a
 * downstream tool needs to classify or record it. Optimal plies are skipped.
 *
 * Yields, per blunder ply:
 *   {
 *     boardState,   // movestring BEFORE the played move (the tagBlunder input)
 *     movePlayed,   // 0-indexed column actually played
 *     correctCol,   // 0-indexed best column (argmax of solver scores)
 *     scores,       // solver scores at boardState
 *     score,        // scores[movePlayed]
 *     bestScore,    // scores[correctCol]
 *     severity,     // computeSeverity(bestScore, score)
 *     perspective,  // 1 (Red) or 2 (Yellow) — the player who blundered
 *     quality,      // 'blunder' | 'suboptimal'
 *     gameIndex,    // 1-based game number (for progress logging)
 *     plyIndex,     // index of the move within its game
 *     gameMs,       // the full game movestring
 *   }
 *
 * @param {object} solver  c4solver wrapper
 * @param {{ maxGames?: number, rng?: () => number }} [opts]
 */
export async function* harvestBlunders(solver, { maxGames = Infinity, rng = Math.random } = {}) {
  let gameIndex = 0;

  while (gameIndex < maxGames) {
    const { ms, scoresCache } = await simulateGame(solver, rng);
    gameIndex++;

    for (let i = 0; i < ms.length; i++) {
      const scores = scoresCache[i];
      if (!scores) continue;

      const movePlayed = parseInt(ms[i], 10);
      const { quality, bestCol } = scoreMove(scores, movePlayed);
      if (quality === 'optimal') continue;

      const boardState = ms.slice(0, i);
      const score = scores[movePlayed];
      const bestScore = scores[bestCol];

      yield {
        boardState,
        movePlayed,
        correctCol: bestCol,
        scores,
        score,
        bestScore,
        severity: computeSeverity(bestScore, score),
        perspective: boardState.length % 2 === 0 ? 1 : 2,
        quality,
        gameIndex,
        plyIndex: i,
        gameMs: ms,
      };
    }
  }
}
