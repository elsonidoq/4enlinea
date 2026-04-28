The app must contain the following functionalities.

## Cross-cutting: Explanation Engine
All features that expose a move or position to the user share a single explanation engine. It operates in three layers: (1) the solver produces exact scores for every legal column; (2) a rule-based pattern classifier tags what is happening structurally (e.g. double threat, zugzwang, fork, immediate block); (3) an LLM composes a concise natural-language annotation grounded in those tags — never speculating beyond what the classifier found. The result is always pattern-tagged and human-readable: *"Optimal move. Builds a diagonal fork between col 3 and col 4, forcing a double threat the opponent cannot answer in one move."* Progressive disclosure: one-line summary by default, full explanation on tap. This engine is not a standalone feature — it is the substrate that makes puzzles, sparring review, and papergames analysis all speak the same language.

---

1. Concept micro-lessons
Each tactical pattern (immediate threat, double threat, zugzwang, odd/even parity, fork setup, etc.) has a standalone 2-3 minute lesson before the user drills it. A lesson consists of: a short text explanation of *why* the pattern works, one or two annotated board diagrams showing the pattern in its canonical form, and a single "spot it" warm-up position to confirm the concept landed. Lessons are self-contained — the user can revisit any of them from a catalog view without re-doing the puzzles.

2. Puzzles 
There are puzzle categories aligned with the concept micro-lessons. After completing (or skipping) the lesson for a category, the user is presented with a half-played board with prompts like "identify the double threat red has created", "you are red, avoid the double threat", or "you are red, create a double threat in two moves". After solving it, the user gets feedback on whether she was correct, and a natural-language explanation of why the correct move works grounded in the pattern concept.
The user is provided with stats about how well she solves the puzzles, by category.

3. Sparring. 
The user can play against the AI varying the degree of dificulty (easy, medium, hard, perfect). Suggestions pop up. "You can create a zugzwang", "warning, the AI might create a double threat", "pay attention, there is an inmediate threat". Suggestions can be turned off.
A "Try first" mode hides all hints and scores until the user commits a move. After committing, a brief reveal shows how the chosen move compares to the engine's best: the score delta, what was missed, and the pattern at play. This converts normal play into implicit self-testing without changing the game flow.
Plays are saved and can be reviewed move-by-move after the game ends: a timeline colored by score delta (green = best move, yellow = small mistake, red = blunder) lets the user click any point, rewind the board to that position, and try a different continuation against the engine's forced responses.

3. Integration with papergames.io (and maybe other platforms)
Analyze historical plays. What mistakes did the user do? What puzzles could the user do to train so she does not loose the same way in the future?

4. Blunder Log
Every puzzle the user fails on the first attempt is automatically captured: board position, move played, correct move, pattern missed, and date. Surfaced as a review queue where each entry is re-presented as a fresh puzzle (no hint that it was previously failed). Clearing an entry requires solving it correctly. The same capture applies to significant score-drop moves in Sparring games.
The log is personal and persistent — it compounds in value the longer the user trains, because it reflects exactly where *that* user fails rather than where the average player fails. This is what makes the paid tier worth keeping.

5. Progress & stats
Progress on puzzles categories, ELO in papergames.io 

