/*
 * This file is part of Connect4 Game Solver <http://connect4.gamesolver.org>
 * Copyright (C) 2017-2019 Pascal Pons <contact@gamesolver.org>
 *
 * Connect4 Game Solver is free software: you can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * Connect4 Game Solver is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Connect4 Game Solver. If not, see <http://www.gnu.org/licenses/>.
 */

#include <cassert>
#include "Solver.hpp"
#include "MoveSorter.hpp"

using namespace GameSolver::Connect4;

namespace GameSolver {
namespace Connect4 {

/**
 * Reccursively score connect 4 position using negamax variant of alpha-beta algorithm.
 * @param: position to evaluate, this function assumes nobody already won and
 *         current player cannot win next move. This has to be checked before
 * @param: alpha < beta, a score window within which we are evaluating the position.
 *
 * @return the exact score, an upper or lower bound score depending of the case:
 * - if actual score of position <= alpha then actual score <= return value <= alpha
 * - if actual score of position >= beta then beta <= return value <= actual score
 * - if alpha <= actual score <= beta then return value = actual score
 */
int Solver::negamax(const Position &P, int alpha, int beta, int depth, int maxDepth) {
  assert(alpha < beta);
  assert(!P.canWinNext());

  nodeCount++; // increment counter of explored nodes

  // Depth cutoff: return heuristic (0 = draw estimate) when limit is reached.
  if(maxDepth > 0 && depth >= maxDepth) return 0;

  Position::position_t possible = P.possibleNonLosingMoves();
  if(possible == 0)     // if no possible non losing move, opponent wins next move
    return -(Position::WIDTH * Position::HEIGHT - P.nbMoves()) / 2;

  if(P.nbMoves() >= Position::WIDTH * Position::HEIGHT - 2) // check for draw game
    return 0;

  int min = -(Position::WIDTH * Position::HEIGHT - 2 - P.nbMoves()) / 2;	// lower bound of score as opponent cannot win next move
  if(alpha < min) {
    alpha = min;                     // there is no need to keep alpha below our max possible score.
    if(alpha >= beta) return alpha;  // prune the exploration if the [alpha;beta] window is empty.
  }

  int max = (Position::WIDTH * Position::HEIGHT - 1 - P.nbMoves()) / 2;	// upper bound of our score as we cannot win immediately
  if(beta > max) {
    beta = max;                     // there is no need to keep beta above our max possible score.
    if(alpha >= beta) return beta;  // prune the exploration if the [alpha;beta] window is empty.
  }

  const Position::position_t key = P.key();
  if(int val = transTable.get(key)) {
    if(val > Position::MAX_SCORE - Position::MIN_SCORE + 1) { // we have an lower bound
      min = val + 2 * Position::MIN_SCORE - Position::MAX_SCORE - 2;
      if(alpha < min) {
        alpha = min;                     // there is no need to keep beta above our max possible score.
        if(alpha >= beta) return alpha;  // prune the exploration if the [alpha;beta] window is empty.
      }
    } else { // we have an upper bound
      max = val + Position::MIN_SCORE - 1;
      if(beta > max) {
        beta = max;                     // there is no need to keep beta above our max possible score.
        if(alpha >= beta) return beta;  // prune the exploration if the [alpha;beta] window is empty.
      }
    }
  }

  // Opening book only used in unlimited mode — depth-limited search must not
  // use book shortcuts, otherwise the cutoff heuristic has no effect.
  if(maxDepth == 0) {
    if(int val = book.get(P)) return val + Position::MIN_SCORE - 1;
  }

  MoveSorter moves;
  for(int i = Position::WIDTH; i--;)
    if(Position::position_t move = possible & Position::column_mask(columnOrder[i]))
      moves.add(move, P.moveScore(move));

  while(Position::position_t next = moves.getNext()) {
    Position P2(P);
    P2.play(next);  // It's opponent turn in P2 position after current player plays x column.
    int score = -negamax(P2, -beta, -alpha, depth + 1, maxDepth);

    if(score >= beta) {
      transTable.put(key, score + Position::MAX_SCORE - 2 * Position::MIN_SCORE + 2); // save the lower bound of the position
      return score;  // prune the exploration if we find a possible move better than what we were looking for.
    }
    if(score > alpha) alpha = score; // reduce the [alpha;beta] window for next exploration, as we only
    // need to search for a position that is better than the best so far.
  }

  transTable.put(key, alpha - Position::MIN_SCORE + 1); // save the upper bound of the position
  return alpha;
}

int Solver::solve(const Position &P, bool weak, int maxDepth) {
  if(P.canWinNext()) // check if win in one move as the Negamax function does not support this case.
    return (Position::WIDTH * Position::HEIGHT + 1 - P.nbMoves()) / 2;
  int min = -(Position::WIDTH * Position::HEIGHT - P.nbMoves()) / 2;
  int max = (Position::WIDTH * Position::HEIGHT + 1 - P.nbMoves()) / 2;
  if(weak) {
    min = -1;
    max = 1;
  }

  // Depth-limited search: skip iterative deepening and do a single-window search.
  if(maxDepth > 0) return negamax(P, min, max, 0, maxDepth);

  while(min < max) {                    // iteratively narrow the min-max exploration window
    int med = min + (max - min) / 2;
    if(med <= 0 && min / 2 < med) med = min / 2;
    else if(med >= 0 && max / 2 > med) med = max / 2;
    int r = negamax(P, med, med + 1, 0, 0);
    if(r <= med) max = r;
    else min = r;
  }
  return min;
}

std::vector<int> Solver::analyze(const Position &P, bool weak, int maxDepth) {
  std::vector<int> scores(Position::WIDTH, Solver::INVALID_MOVE);
  for (int col = 0; col < Position::WIDTH; col++)
    if (P.canPlay(col)) {
      if(P.isWinningMove(col)) scores[col] = (Position::WIDTH * Position::HEIGHT + 1 - P.nbMoves()) / 2;
      else {
        Position P2(P);
        P2.playCol(col);
        scores[col] = -solve(P2, weak, maxDepth);
      }
    }
  return scores;
}

void Solver::explainSearch(const Position &P,
                            int heatP0[Position::HEIGHT][Position::WIDTH],
                            int heatP1[Position::HEIGHT][Position::WIDTH],
                            std::unordered_set<Position::position_t>& visited) {
  // Hard node limit to keep the explain request fast.
  if (nodeCount > 500000) return;
  nodeCount++;

  const Position::position_t key = P.key();
  if (!visited.insert(key).second) return; // already visited

  // Current player can win immediately
  if (P.canWinNext()) {
    Position::position_t win_moves = P.getWinningMovesMask();
    for (Position::position_t m = win_moves; m; m &= m - 1) {
      Position::position_t move = m & (-m); // isolate lowest set bit
      std::vector<std::pair<int,int> > cells =
          Position::findWinningCells(P.getCurrentPosition() | move);
      for (size_t i = 0; i < cells.size(); i++)
        heatP0[cells[i].first][cells[i].second]++;
    }
    return;
  }

  // No non-losing moves: opponent wins no matter what the current player does.
  // Recurse through all playable moves so the opponent's canWinNext() branch
  // records the *actual* winning cells (not the forcing threat that gets blocked).
  Position::position_t possible = P.possibleNonLosingMoves();
  if (possible == 0) {
    for (int col = 0; col < Position::WIDTH; col++) {
      if (P.canPlay(col)) {
        Position P2(P);
        P2.playCol(col);
        explainSearch(P2, heatP1, heatP0, visited);
      }
    }
    return;
  }

  // Near-draw: no more moves to explore
  if (P.nbMoves() >= Position::WIDTH * Position::HEIGHT - 2) return;

  // Score each non-losing move using the opening book (O(1) per lookup) and
  // recurse only into the best-scoring category. For positions beyond the book
  // depth the book returns 0 (unknown); all such moves get a neutral score of 0
  // so we fall back to exploring all non-losing moves — the old behaviour.
  struct Candidate { int score; Position::position_t move; };
  std::vector<Candidate> candidates;
  int bestScore = -(Position::WIDTH * Position::HEIGHT);

  for (int i = Position::WIDTH; i--;) {
    if (Position::position_t move = possible & Position::column_mask(columnOrder[i])) {
      Position P2(P);
      P2.play(move);
      int bval = book.get(P2); // 0 = not in book; >0 = encoded score
      // Negate because the book stores the score for the player to move in P2,
      // but we want the score from P's perspective.
      int score = bval ? -(bval + Position::MIN_SCORE - 1) : 0;
      if (score > bestScore) bestScore = score;
      candidates.push_back({score, move});
    }
  }

  for (const auto& c : candidates) {
    if (c.score == bestScore) {
      Position P2(P);
      P2.play(c.move);
      explainSearch(P2, heatP1, heatP0, visited);
    }
  }
}

void Solver::explain(const Position &P,
                      int heatCurrent[Position::HEIGHT][Position::WIDTH],
                      int heatOpponent[Position::HEIGHT][Position::WIDTH]) {
  std::unordered_set<Position::position_t> visited;
  nodeCount = 0;
  for (int r = 0; r < Position::HEIGHT; r++)
    for (int c = 0; c < Position::WIDTH; c++) {
      heatCurrent[r][c]  = 0;
      heatOpponent[r][c] = 0;
    }
  explainSearch(P, heatCurrent, heatOpponent, visited);
}

// Constructor
Solver::Solver() : nodeCount{0} {
  for(int i = 0; i < Position::WIDTH; i++) // initialize the column exploration order, starting with center columns
    columnOrder[i] = Position::WIDTH / 2 + (1 - 2 * (i % 2)) * (i + 1) / 2; // example for WIDTH=7: columnOrder = {3, 4, 2, 5, 1, 6, 0}
}

} // namespace Connect4
} // namespace GameSolver
