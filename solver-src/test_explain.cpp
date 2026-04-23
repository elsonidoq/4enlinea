/*
 * Test for explainSearch: verifies that the heatmap shows the ACTUAL winning
 * cells, not the forcing-threat cells that the opponent blocks.
 *
 * Scenario: moves "444444777777166662661322222535111133335"
 *   - Hover over Col5 (1-indexed). The candidate places a piece at C++ (row=2, col=4).
 *   - After the candidate, the human has a double threat:
 *       A) diagonal at (row=3, col=4) — forcing threat, AI blocks here
 *       B) horizontal at row=4, cols 2-5 — actual winning line
 *   - The heatmap should show (B), NOT (A).
 */

#include <cstring>
#include <iostream>
#include "Solver.hpp"

using namespace GameSolver::Connect4;

#define EXPECT(cond, msg) \
  do { \
    if (!(cond)) { \
      std::cerr << "FAILED: " << (msg) << std::endl; \
      return 1; \
    } \
  } while(0)

int main() {
  const std::string moves = "444444777777166662661322222535111133335";

  Solver solver;
  solver.loadBook("7x6.book");

  Position P;
  unsigned int played = P.play(moves);
  EXPECT(played == moves.size(), "moves string should be fully valid");

  // After 39 moves (odd), current player = AI, opponent = human.
  // heatCurrent = AI heat, heatOpponent = human heat.
  int heatCurrent[Position::HEIGHT][Position::WIDTH];
  int heatOpponent[Position::HEIGHT][Position::WIDTH];
  solver.explain(P, heatCurrent, heatOpponent);

  // --- The ACTUAL winning line must appear (horizontal: row=4, cols 2-5) ---
  EXPECT(heatOpponent[4][2] > 0, "human heat: (row=4, col=2) should be hot");
  EXPECT(heatOpponent[4][3] > 0, "human heat: (row=4, col=3) should be hot");
  EXPECT(heatOpponent[4][4] > 0, "human heat: (row=4, col=4) should be hot");
  EXPECT(heatOpponent[4][5] > 0, "human heat: (row=4, col=5) should be hot");

  // --- The FORCING THREAT cell must NOT appear as human's winning cell ---
  // (row=3, col=4) is where the AI blocks; the human never wins there.
  EXPECT(heatOpponent[3][4] == 0, "human heat: (row=3, col=4) must be 0 — AI blocks it");

  std::cout << "All tests passed." << std::endl;
  return 0;
}
