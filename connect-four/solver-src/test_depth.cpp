/*
 * Tests for depth-limited analysis.
 *
 * With maxDepth=0 (unlimited): full solver, col 4 on empty board scores +1.
 * With maxDepth=1: negamax cuts off after 1 ply — all non-winning moves on the
 *   empty board should return 0 (heuristic), making all 7 scores identical.
 * With maxDepth=3: intermediate lookahead — scores should differ from both
 *   unlimited and depth-1 results.
 *
 * Build: make test_depth
 * Run:   ./test_depth
 */

#include <iostream>
#include "Solver.hpp"

using namespace GameSolver::Connect4;

#define EXPECT(cond, msg) \
  do { \
    if (!(cond)) { \
      std::cerr << "FAIL: " << (msg) << std::endl; \
      return 1; \
    } \
    std::cerr << "PASS: " << (msg) << std::endl; \
  } while(0)

int main() {
  Solver solver;
  solver.loadBook("7x6.book"); // required for full-solver tests to run in < 1s

  // ── Test 1: full solver on empty board ──────────────────────────────────────
  // Col 4 (index 3) is the centre and should score +2 with full search.
  {
    Position P;
    std::vector<int> scores = solver.analyze(P);
    EXPECT(scores[3] == 1, "full solver: col 4 on empty board scores +1");
    EXPECT(scores[3] > scores[0], "full solver: col 4 beats col 1 on empty board");
  }

  // ── Test 2: depth-1 solver on empty board ───────────────────────────────────
  // At depth 1 there are no immediate wins from the empty board, so negamax
  // reaches the cutoff for every branch and returns the heuristic (0).
  // All seven scores should therefore equal 0.
  {
    Position P;
    std::vector<int> scores = solver.analyze(P, /*weak=*/false, /*maxDepth=*/1);
    for (int col = 0; col < Position::WIDTH; col++) {
      EXPECT(scores[col] == 0,
             std::string("depth-1: col ") + std::to_string(col+1) + " scores 0 on empty board");
    }
  }

  // ── Test 3: depth-limited scores differ from full-solver scores ─────────────
  // Position "4" (one move played, centre).  The full solver can compute an
  // exact value for the remaining columns; depth-1 cannot see deep enough to
  // distinguish them from 0.
  {
    Position P;
    P.play(std::string("4"));          // 1 move: red centre

    std::vector<int> full   = solver.analyze(P);
    std::vector<int> depth1 = solver.analyze(P, false, 1);

    bool any_differ = false;
    for (int col = 0; col < Position::WIDTH; col++) {
      if (full[col] != Solver::INVALID_MOVE && depth1[col] != Solver::INVALID_MOVE)
        if (full[col] != depth1[col]) { any_differ = true; break; }
    }
    EXPECT(any_differ,
           "depth-1 analysis differs from full-solver analysis on position '4'");
  }

  // ── Test 4: depth-5 differs from depth-1 on a non-trivial position ──────────
  // A 10-move position where one side has a forced-win threat visible at depth 5
  // but not depth 1 (d1 sees only immediate wins; d5 sees 5-ply tactics).
  {
    Position P;
    P.play(std::string("6455767164")); // 10 moves played

    std::vector<int> d1 = solver.analyze(P, false, 1);
    std::vector<int> d5 = solver.analyze(P, false, 5);

    bool any_differ = false;
    for (int col = 0; col < Position::WIDTH; col++) {
      if (d1[col] != Solver::INVALID_MOVE && d5[col] != Solver::INVALID_MOVE)
        if (d1[col] != d5[col]) { any_differ = true; break; }
    }
    EXPECT(any_differ,
           "depth-5 analysis differs from depth-1 analysis on position '4455'");
  }

  std::cerr << "\nAll tests passed." << std::endl;
  return 0;
}
