---
name: Classifier architecture and score convention
description: How the pattern classifier works, c4solver score encoding, and category detection logic
type: project
---

# Pattern classifier architecture

## File: `connect-four/server/classifier.js`

Classifies a Connect Four position given `(moves, candidateCol, scores)` where scores come from c4solver `-a` flag.

## c4solver score convention

Score from c4solver `-a` = from current player's perspective:
- Positive: current player wins eventually
- Negative: current player loses eventually
- `immediateWinScore(n) = floor((42 - n) / 2)` where n = number of moves already played
- If current player wins immediately (at move n+1): score = `floor((42 - n) / 2)`
- If opponent wins on their next turn (at move n+2 from current position): score = `-floor((41 - n) / 2)`

**Key invariant**: These are NOT symmetric around zero. `-(winScore - 1) ≠ opponentImmediateWin`.

## Category detection (in priority order)

1. **Cat 1 Immediate Threat**: `score === floor((42-n)/2) && score > 0`
2. **Cat 2 Forced Block**: `score >= 0` AND all other legal moves have score in `[-floor((41-n)/2), -1]`
3. **Cat 3 Double Threat**: `score > 0` AND after placing candidate, current player has ≥2 winning threats
4. **Cat 4 Fork Setup**: `score > 0` AND NOT cat 1/2/3 AND ≥3 total columns with positive scores
5. **Cat 5 Zugzwang**: `score < 0` AND all scores ≤ 0 AND candidate has the highest score AND some worse exist
6. **Cat 6 Parity Control**: `score > 0` AND NOT cat 1-4 AND `score >= avg(positive scores)` AND ≥2 positive cols
7. **Fallback**: `best_move` (pos), `drawing_move` (0), `suboptimal_move` (neg)

## Test fixtures

`connect-four/tests/classifier/fixtures/fixtures.json` has 10 solver-verified positions, one or two per category.
`connect-four/tests/predicates/fixtures/fixtures.json` has 13 positions covering correct/wrong/tied for all 6 categories.

Run tests: `node --test tests/classifier/classifier.test.js tests/predicates/predicates.test.js` (all 29 pass).
