---
name: project_sparring_move_algorithm
description: Sparring AI move selection is server-side chooseSparringMove reached via /api/scores?difficulty; softmax deleted
metadata:
  type: project
---

The non-perfect sparring AI's move is chosen **server-side** by `chooseSparringMove(board, difficulty, scores)` in `server/classifier.js`, reached through `POST /api/scores` **with a `difficulty` field** (surprising home — the "scores" endpoint returns `{ scores, col }` when `difficulty` is present, else `{ scores }` only). There is **no** dedicated sparring endpoint. Client `src/lib/useGameBoard.js` `makeAiMove` POSTs `{ moves, difficulty }`, plays `col`, and on any error falls back to a random legal column. Coach commentary is still a **separate** `/api/evaluate-move` call (`aiMove:true`).

Softmax is **gone**: `src/lib/aiDifficulty.js` (`DIFFICULTY_TEMPERATURES`, `sampleColumnFromScores`, `secondBestColumn`) was **deleted**; `INVALID_MOVE` moved to `src/lib/constants.js`. Ignore lingering search/memory refs to those.

Non-obvious algorithm invariants (in `chooseSparringMove`):
- **Own win-in-1 is taken BEFORE the mistake roll** — a coach that skips an available 4-in-a-row reads as broken. So an own-win position is never a "mistake" regardless of difficulty.
- A rolled mistake is **guaranteed strictly-suboptimal** (excludes argmax columns, so it never accidentally plays optimal) **AND non-forbidden** (never hands the opponent a win-in-1). On an opponent immediate threat it **blocks** instead. Only when no safe strictly-worse move exists does it fall back to optimal.
- Consequence (deliberate design): difficulties differ **only** by `SPARRING_MISTAKE_RATES` (½, ¼, ⅛, 0); every "mistake" is tactically sound, so **even easy never falls for a one-move trap** — the floor is intentionally raised (goal: "never let you win by just stacking discs"). `medium` and `hard` therefore differ only in rate.

`rng` is injectable (unit-testable): consumed once for the mistake roll, then once for the uniform pool pick. See `docs/architecture/api-conventions.md` Scores Endpoint. Related: [[reference_c4solver_scores]].
