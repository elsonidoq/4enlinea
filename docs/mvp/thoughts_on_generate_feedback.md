# Thoughts on Generate Feedback

## 1. Classifier Bugs — Root Cause Analysis

### Bug 1 — Cat 1: Immediate Win Missed (move_string: `661441575127316`)

**Scores:** `[14, 9, 2, 0, 2, 0, 13]` | **moveCount:** 15 | **winScore:** 13

The predicate in `evalCat1` checks `s === winScore` (exact equality), so it finds col 6 (score 13) and declares it the unique immediate win. But col 0 has score **14 > 13**, which is a score that can only arise when the game ends *before* move 17 — i.e., the position is already won or the solver reports a forced win in fewer moves than "immediate." In practice, this is a valid winning move that the predicate misses entirely.

**Root cause:** `s === winScore` is too strict. The correct check is `s >= winScore`. Scores above `winScore` are still wins (they just have an oddity in the solver output for edge positions), and the predicate should treat them as immediate wins.

The same off-by-one affects `isClean()` and the cat 4 predicate (see Bug 4).

---

### Bug 2 — Cat 2: Forced Block False Positives (move_strings: `14465`, `5674`, `31151336635`)

**Example — `14465`:** scores `[-4, -7, -5, 2, -4, -4, -4]`, moveCount 5, `opponentImmediateWin = -18`.

`evalCat2` defines blocking columns as those with `s >= 0`. Col 3 (score 2) qualifies. The predicate then returns `correct` for col 3 without checking *why* the other moves lose. The non-blocking moves score -4, -7, -5, -4 — none equal `opponentImmediateWin = -18`. The opponent does not have an immediate threat; they just win eventually if you play poorly.

**Example — `5674`:** scores `[-3, -4, -3, -2, -1, -3, -2]`, no column ≥ 0. Falls into the "all moves lose" branch, picks col 4 (score -1 = max). This is a **zugzwang**, not a forced block.

**Root cause:** The predicate conflates "I have one non-losing move" with "the opponent has an immediate threat." A true forced block requires that every non-blocking move results in **immediate** opponent win — i.e., all other scores must equal `opponentImmediateWin`. The fix is to add: `const allOthersAreImmediateLoss = scores.every((s, i) => i === blockingCol || s === opponentImmediateWin)` before accepting the position as cat 2.

---

### Bug 3 — Cat 3: Double Threat False Positive (move_string: `5511144271561247`)

**Scores:** `[-3, 4, -12, 12, 2, 10, 2]` | **moveCount:** 16

The predicate plays each positive-score column and calls `countWinningThreats()` — counting how many column tops would give the current player an immediate win after the move. The candidate column apparently gets a count ≥ 2. But the note says there is no double threat.

**Root cause:** `countWinningThreats` counts cells at the playable row of every column, but does not verify that those threats are *safe* — i.e., not sitting directly above an opponent threat. If the opponent has a threat at row *r* of column *c*, the current player's "threat" at row *r+1* of column *c* is illusory: the opponent will play col *c* first and win. The threat count is therefore inflated by unsafe (phantom) threats.

A stricter check must filter out threats where placing the piece would sit immediately above the opponent's next winning square, or where the opponent has a forced response that neutralises one of the counted threats before the current player can act on it.

---

### Bug 4 — Cat 4: Immediate Win Score Not Caught (move_string: `611752141574572`)

**Scores:** `[11, -13, 14, -13, -13, -13, -13]` | **moveCount:** 15 | **winScore:** 13

`evalCat4` filters with `s > 0 && s !== winScore` to exclude immediate wins and look for fork setups. Col 2 has score 14 > winScore = 13; `14 !== 13` is true, so col 2 passes the filter and is declared the best fork setup. But score 14 means col 2 is an **immediate win** (same edge case as Bug 1).

**Root cause:** The filter `s !== winScore` should be `s < winScore`. Any score ≥ winScore is an immediate win and must be excluded from cat 4.

---

### Bug 5 — Cat 5: Zugzwang with Positive Scores (move_string: `42757523654`)

**Scores:** `[-2, -1, 2, 5, 16, -3, 5]` | **moveCount:** 11

`evalCat5` simply picks the column with the maximum score and returns `correct`. Here the maximum is 16 (col 4) — a strong winning score. The predicate returns `correct` for col 4, so `checkPredicate` finds exactly one correct column and declares this a valid zugzwang puzzle. It is not.

**Root cause:** `evalCat5` has no guard requiring all scores to be negative. The classifier (`classify()`) correctly checks `allNegative = scores.every(s => s <= 0)` before tagging something as zugzwang, but the predicate that drives generation does not. The fix is to add the same guard to `evalCat5`: if `Math.max(...scores) > 0`, the position is not zugzwang and the predicate should return `wrong`.

---

### Bug 6 — Cat 6: Single Positive Move Trivially Passes Parity Control (move_string: `312361744236226626`)

**Scores:** `[-2, -3, -2, 3, -3, -3, -2]` | **moveCount:** 18

Only col 3 has a positive score (s = 3). `evalCat6` computes `avg = 3/1 = 3` and finds that col 3 (s = 3 ≥ avg) is "above average." It returns `correct` for col 3. The result: any position with a single winning move trivially passes as a parity control puzzle.

Parity control is meant to be a puzzle where multiple winning continuations exist and the task is to distinguish the one that preserves parity advantage. With a single winning move, there is nothing to reason about.

**Root cause:** `evalCat6` does not require `posScores.length >= 2`. The fix is to return `wrong` immediately when there is only one positive-score move (it would be better categorised as cat 1 or left unclassified).

---

## 2. Sampling Algorithm

### Is the Proposal Sound?

Yes, the direction is correct. Random position generation produces sparse, early-game boards precisely because the naive approach treats all move-counts uniformly and does not account for how real games develop. Solver-weighted sampling — playing moves proportional to softmax(scores / temperature) — would produce positions that resemble actual competitive play: material is distributed across the board, threats are realistic, and the tactical features that define each category emerge naturally.

Sampling temperature in [1, 3] is a good touch: temperature 1 approaches best-play and creates tight tactical positions; temperature 3 approaches random play and creates messier, more diverse boards. Varying it per game ensures the puzzle pool has a healthy spread of difficulty.

The opening-book pre-loading is critical for performance: without it, every simulated move in the first ~8 plies requires a full solver query. With the book covering those moves in O(1), the cost per game drops to the number of queries needed only in the mid-game phase, which is tractable.

### Main Concern

The proposal does not change the **acceptance rate** problem — it improves position realism, but each generated position still needs to pass `checkPredicate`. For rarer categories (cat 5, cat 7) the acceptance rate may still be very low even with better positions. The two proposals below address this directly.

### A Lighter Alternative

If compute is still a concern after book pre-loading, a hybrid works well: use solver-weighted play only for the first 10–14 moves (covered entirely by the book), then switch to **random play** for the remaining moves. This produces realistic openings — avoiding the empty-board trap — while keeping the mid/late-game solver calls to a single evaluation at the candidate position rather than one per simulated move. The boards will be denser and more game-like without paying the full solver-per-step cost.

### Increasing Acceptance Rate

#### Proposal 1 — Cheap Structural Pre-screening

Each category has a lightweight signature check that can be evaluated from the raw score vector alone, before invoking the full `checkPredicate`. Failing this check is a guaranteed rejection, so it avoids wasting the more expensive predicate evaluation.

| Category | Pre-screen condition |
|---|---|
| Cat 1 | `scores.some(s => s >= winScore)` |
| Cat 2 | exactly one `s >= 0` AND at least one other score equals `opponentImmediateWin` |
| Cat 5 | `scores.every(s => s <= 0)` |
| Cat 6 | `scores.filter(s => s > 0).length >= 2` |

Categories without a cheap pre-screen (cat 3, cat 4, cat 7) proceed directly to `checkPredicate` as before.

#### Proposal 2 — Targeted Rollout Termination

Instead of simulating a fixed number of moves and then evaluating, **poll the structural pre-screen during the rollout** every 2–3 moves once past move 8. Stop and run the full predicate as soon as the pre-screen passes. This trades a few extra score-vector checks per step for a much shorter average rollout length when a promising position appears early — which is the common case for categories like cat 1 and cat 2.

### Next Steps if Acceptance Rate Remains Low

The two proposals above should cover most categories. If cat 5 or cat 7 acceptance rates remain unacceptably low after these changes, the following heavier-weight approaches can be considered.

#### Option A — Two-Phase Biased Sampling

- **Phase 1** (moves 1–12): Solver-weighted play from the opening book — produces realistic mid-game boards.
- **Phase 2** (moves 13+): Biased play toward the target structural signature. For cat 5 (zugzwang), bias toward moves that keep scores balanced and negative. For cat 7, bias toward moves that create threats on specific columns. Phase 2 bias can use heuristics derived from the last known score vector, avoiding additional solver calls.

#### Option B — Population Beam Search

Run K rollouts in parallel (e.g. K=20). At each ply, score every partial position by how close it is to the target structural signature, keep the top M branches (beam width M), and expand only from those. Computationally heavier but dramatically increases acceptance rate for categories where acceptance rate is below 1%.

---

## 3. Player Perspective Ambiguity

### The Problem

The puzzle's `move_string` encodes the full game from move 1. Player 1 always plays on even-index moves, player 2 on odd-index moves. The current player at any position is `moveCount % 2 === 0 ? 1 : 2`. The solver scores are always from the *current player's* perspective — but nowhere in the UI is the user told which player they are, so half the puzzles show them as yellow and half as red, with no indication that anything has changed.

This compounds Bug 3 (Cat 7): the annotator noted that the forbidden-column classification looks wrong "if the user is yellow." The solver math is correct; the confusion is purely in the presentation layer.

### Proposed Solution

**Always render the user as the same color (RED) by normalising the display.**

When `moveCount % 2 === 1` (user is player 2), swap the piece colors in the board renderer: display player-2 pieces as RED and player-1 pieces as YELLOW. The solver scores, predicate logic, and `move_string` are untouched — only the visual mapping changes. From the user's point of view, they always play RED, the canonical "protagonist" color.

Steps:
1. Compute `userPlayer = moveCount % 2 === 0 ? 1 : 2` from the puzzle's `move_string`.
2. Pass `userPlayer` to the board renderer.
3. In the renderer, map: `pieceColor = (piece === userPlayer) ? RED : YELLOW` (instead of `piece === 1 ? RED : YELLOW`).
4. Add a small persistent badge on the puzzle board: **"You are RED ●"** — a single colored disc. This survives even if the user skips the brief orientation.
5. Store `user_player` (1 or 2) in the `candidates` and `puzzles` tables for completeness and for any future server-side logic that needs to know orientation.

This is a display-only change with no impact on scoring correctness. It also makes Cat 7 puzzles unambiguous: the forbidden columns are always those that hand the opponent (YELLOW) an immediate win, which is visually consistent from the user's (always-RED) perspective.
