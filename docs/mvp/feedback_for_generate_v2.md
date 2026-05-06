# Feedback on Puzzle Generation & Curation Tool

## UX Issues

**1 — Debugging trace per board**  
For each board, show debugging information so that weird cases can be understood without guessing. The trace should include: solver scores per column, softmax weights, the temperature drawn for each player, which column was sampled at each ply (along with the scores and probabilities), and the reason the rollout stopped (win, draw, max-moves reached).

**2 — Skip to next candidate without deciding**  
There must be a way to advance to the next candidate without approving or rejecting the current one. Right now every navigation forces a decision.

**3 — Enforce a minimum number of moves**  
Boards with too few moves still appear even at very low temperatures. Enforce a hard minimum (e.g. 14 moves or 30 moves) so that trivially sparse positions are never presented to the annotator regardless of temperature. Today there is a parameter, but it is hardcoded to 10. It should be sampled like randint(10, 35).

**4 — Show the category name, not its number**  
The curation view shows a bare category number. Replace it with the human-readable name (e.g. "Immediate Threat", "Forced Block") so annotators understand what they are looking for.

**5 — Escape key should close the reject modal**

**6 — Highlighted cell does not appear for some boards** (see Bug C2 below for root cause)

**7 — Multi-move puzzles must highlight the entire move sequence**  
For Fork Setup, Zugzwang, and Parity Control, highlight all the moves that constitute the pattern, not just the first one. Showing a single move forces the annotator to manually trace a multi-step sequence.

**8 — "Reject all" button should be "Delete all"**  
The button should delete all pending (un-reviewed) candidates, not the rejected ones. Rename it and update the confirmation message accordingly.

---

## Code Quality

**9 — Consolidate the two c4solver wrappers**  
There are two independent Node.js wrappers around the c4solver binary: `GeneratorSolver` (in `candidate-generator.js`) and `Connect4Solver` (in `index.js`). They parse the same output format but implement independent IPC logic. Additionally, the C++ binary sometimes returns the move string alongside scores (when no book is used) and sometimes only the scores (when the book answers). This inconsistency propagates upstream. Normalize the output: always return only the scores (7 values), never the move string echo. Merge both wrappers into a single shared module used by both files. Before doing this, make sure the move string is never used as a c4solver output.

---

## Classifier Bugs (from false_positive_records in DB)

Eight positions were flagged as false positives with annotator notes pointing at classifier failures. Root cause analysis follows. All eight records are in the `false_positive_records` table, joined to the `candidates` table via `candidate_id`.

---

### Bug C1 — Score ambiguity for odd moveCount: Cat 1 false positives (no immediate win on board)

**Affected records:** `ebebf258`, `1c58cd7a`, `982ca50c`, `c4526868`

**Positions and scores:**

| move_string | moveCount | scores | winScore | candidate col |
|---|---|---|---|---|
| `427554542541224` | 15 | `[11, 11, 13, 11, 11, -13, 11]` | 13 | col 3 |
| `445664144723734` | 15 | `[6, 13, 12, -1000, 11, 7, 7]` | 13 | col 2 |
| `24441476566674473513756` | 23 | `[8, 7, 9, -1000, 8, 7, 7]` | 9 | col 3 |
| `556374612625672253533212633` | 27 | `[6, -1000, -1000, 7, 6, 6, 6]` | 7 | col 4 |

**Annotator notes:** "red does not win playing in col 3", "this is not an immediate win", "not a winning case" (×2).

**Root cause:** The c4solver uses `score = floor((42 + 1 − movesWhenGameEnds) / 2)`. For an **odd** moveCount N, the score for an immediate win (game ends at stone N+1) and the score for a win-in-2 (game ends at stone N+2) are **identical**:

- Immediate win: `floor((42 − N) / 2)` — since `42 − N` is odd, this equals `(41 − N) / 2`
- Win-in-2: `floor((41 − N) / 2)` — this is `(41 − N) / 2` exactly (41−N is even for odd N)

Both reduce to the same integer. **For every odd-N position, `immediateWinScore(N)` is indistinguishable from the "forced win in 2 moves" score.** Board-level verification confirms that none of these four positions have an actual immediate four-in-a-row: playing the highlighted column does not complete four-in-a-row immediately. The solver is correctly reporting a forced win in 2 moves, but the classifier treats it as an immediate win.

All four cases have odd moveCount (15, 15, 23, 27), consistent with this being a systematic failure affecting all Cat 1 puzzles where the current player is player 2.

**Fix:** The Cat 1 classifier must verify the immediate win on the board, not rely on the score alone. After finding `score >= winScore && score > 0`, place the piece at the candidate column and check for an actual four-in-a-row using a `checkWin` call. The helper already exists in `classifier.js`.

---

### Bug C2 — `score > winScore` misses immediate win: highlighted cell disappears

**Affected records:** `58ebbed9`, `69dced55`

**Positions and scores:**

| move_string | moveCount | scores | winScore | winning col score |
|---|---|---|---|---|
| `2333234334222` | 13 | `[5, 10, -1000, 11, 15, 11, 10]` | 14 | col 5: score **15** > 14 |
| `551645765476634` | 15 | `[-12, -8, 14, -12, -12, -8, -12]` | 13 | col 3: score **14** > 13 |

**Annotator notes:** "Highlighted cell does not appear" (×2).

**Root cause:** Both positions have a genuine immediate four-in-a-row (confirmed by board-level check). However, the winning column's score **exceeds** `winScore` rather than equalling it. This happens for positions where the opening book recorded a winning line that was forced before the nominal win threshold for the current move count. The existing checks use strict equality (`===`), so:

- In `classifier.js` line 75: the Cat 1 branch is never entered; the position falls through to `fork_setup` (record `58ebbed9`) or `forced_block` (record `69dced55`).
- In `CurationWorkspace.jsx` `deriveHighlightCol` case 1 (line 53): `scores[i] === winScore` finds no column, returning `null` — no cell is highlighted, which is exactly what the annotator observed.

This is the same `===` vs `>=` bug that was fixed in `isClean()` in `candidate-generator.js` (plan step 3), but was not fixed in the classifier or in the UI highlight logic.

**Fix:** Change `===` to `>=` in both locations:
- `classifier.js` line 75: `if (score >= winScore && score > 0)`
- `CurationWorkspace.jsx` `deriveHighlightCol` case 1: `scores[i] >= winScore && winScore > 0`

After this change, also apply the board-level win check from Bug C1 to avoid accepting win-in-2 positions under the broader `>=` condition.

---

### Bug C3 — Category 7 (Forbidden Column) not implemented in `classifier.js`; invalid positions generated

**Affected records:** `d9ceb902`, `1d5b2782`

**Positions and scores:**

| move_string | moveCount | scores |
|---|---|---|
| `36335513733676645` | 17 | `[-12, -12, -1000, 4, -12, -12, -12]` |
| `7655564344577556647` | 19 | `[-11, -11, -11, -11, -1000, -11, 5]` |

**Annotator note (d9ceb902):** "The highlighted cell does not correspond to a forbidden column. Also yellow has a winning move, so red must block it, it does not make sense to think of a forbidden column."

**Root cause — missing classifier branch:** `classify()` in `classifier.js` handles only categories 1–6. There is no case for category 7. Both positions fall through to the generic `best_move` fallback (category 0), so the stored `classifier_tags` is `["best_move"]` instead of `["forbidden_column"]` or similar. The UI highlight logic in `CurationWorkspace.jsx` case 7 does contain a forbidden-column formula (using `opponentWinScore = −ceil((41 − moveCount) / 2)`), but the mismatch between the classifier tag and the actual category makes the curation experience incorrect.

**Root cause — invalid predicate for d9ceb902:** Record `d9ceb902` (`36335513733676645`) has col 4 (0-indexed 3) with score=4 (positive). The current player has a winning advantage. A "Forbidden Column" puzzle is only meaningful when the current player cannot simply win outright — the puzzle teaches which columns *not* to play, not how to win. Generating a Cat 7 candidate when the player already holds a positive-score move is a predicate error.

**Fix (two parts):**
1. Add a `case 7` branch to `classify()` in `classifier.js`: compute `opponentWinScore = −Math.ceil((41 − moveCount) / 2)`; tag as `forbidden_column` if at least one legal column has that score AND no legal column has a positive score (the player cannot win outright).
2. Add a guard in the candidate generator or the Cat 7 predicate: reject any Cat 7 candidate where `scores.some(s => s > 0)` — the current player must have no winning move for a forbidden-column puzzle to be valid.
