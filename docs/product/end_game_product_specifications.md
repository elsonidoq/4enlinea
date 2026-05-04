The app must contain the following functionalities.

## Cross-cutting: Explanation Engine
All features that expose a move or position to the user share a single explanation engine. It operates in three layers: (1) the solver produces exact scores for every legal column; (2) a rule-based pattern classifier tags what is happening structurally (e.g. double threat, zugzwang, fork, immediate block); (3) an LLM composes a concise natural-language annotation grounded in those tags — never speculating beyond what the classifier found. The result is always pattern-tagged and human-readable: *"Optimal move. Builds a diagonal fork between col 3 and col 4, forcing a double threat the opponent cannot answer in one move."* Progressive disclosure: one-line summary by default, full explanation on tap.

The full output of the engine — pattern tags, continuation lines, and visual annotation — is called a **Deep Reveal**. This engine is not a standalone feature — it is the substrate that makes puzzles, sparring review, and papergames analysis all speak the same language.

---

## Pattern Categories

Six categories from foundational to advanced. The free/paid split is a single configuration value:

| # | Category | Detection Method | Tier |
|---|---|---|---|
| 1 | Immediate Threat | Bitboard only | Free |
| 2 | Forbidden Columns | Bitboard only | Free |
| 3 | Forced Block | Bitboard only | Free |
| 4 | Double Threat | Bitboard only | Free |
| 5 | Fork Setup (multi-move) | Solver-guided | Paid |
| 6 | Zugzwang | Solver required | Paid |
| 7 | Parity Control (Claimeven, Lowinverse, Highinverse) | Solver required | Paid |

---

## Account Tiers

Three tiers, two gates: sign-in (unlocks Deep Reveals) and payment (unlocks advanced patterns + Personal AI Coach).

- **Anonymous:** basic puzzles (categories 1–4), sparring, one-line summaries only.
- **Signed-in (free):** same + 3 Deep Reveals per day.
- **Paid:** all 7 pattern categories, unlimited Deep Reveals, Personal AI Coach, premium analytics, advanced training paths, cross-device sync.

---

## Features

### 1. Concept Micro-lessons
Each tactical pattern (immediate threat, double threat, zugzwang, odd/even parity, fork setup, etc.) has a standalone 2-3 minute lesson before the user drills it. A lesson consists of: a short text explanation of *why* the pattern works, one or two annotated board diagrams showing the pattern in its canonical form, and a single "spot it" warm-up position to confirm the concept landed. Lessons are self-contained — the user can revisit any of them from a catalog view without re-doing the puzzles.

Basic pattern lessons (immediate threat, block) are free. Advanced pattern lessons (fork, zugzwang, parity) are paid.

---

### 2. Puzzles
There are puzzle categories aligned with the concept micro-lessons. After completing (or skipping) the lesson for a category, the user is presented with a half-played board with prompts like "identify the double threat red has created", "you are red, avoid the double threat", or "you are red, create a double threat in two moves". After solving it, the user gets feedback on whether she was correct, and a Deep Reveal from the Explanation Engine.

**Goal predicate:** each puzzle has an explicit goal predicate — not just "find the highest solver score." Example predicates:
- Forbidden Columns: the user's tagged set exactly matches every column where playing immediately grants the opponent a win on the next turn. Both false positives and false negatives count as wrong.
- Forced Block: the move eliminates the opponent's immediate win (a non-blocking move with equal score is rejected).
- Double Threat: after the move, ≥2 distinct winning threats exist simultaneously.
- Fork Setup: after a multi-move sequence, a double threat is established on the final board state.
Evaluation combines solver score + pattern classifier output.

**Multi-move puzzles (Fork Setup, Parity Control):** the user and AI alternate moves. The AI plays cooperatively — legal and plausible moves that deliberately do not block the pattern being taught. The goal predicate is evaluated after the user's final move.

The user is provided with stats about how well she solves the puzzles, by category.

**Pattern tiering:** categories 1–4 (bitboard-detectable) are free. Categories 5–7 (solver-required) are paid. Free users see locked preview cards for paid categories.

---

### 3. Sparring
The user can play against the AI at varying difficulty levels (easy, medium, hard, perfect). Contextual suggestions surface during play: "You can create a zugzwang", "Warning, the AI might create a double threat", "There is an immediate threat". Suggestions can be turned off.

A **Commit-first mode** hides all hints, scores, and heatmaps until the user commits a move. After committing, a Deep Reveal shows: the score of the move played, the engine's best move and its score, and the pattern at play if there was a meaningful difference. Free users receive 3 Deep Reveals per day; paid users receive unlimited.

**Post-game review:** at game end, a move timeline colored by score delta (green = best, yellow = small mistake, red = blunder) lets the user click any point, rewind the board to that position, and try a different continuation against the engine's forced responses.

---

### 4. Integration with Papergames.io (and other platforms)
Analyze historical games played on external platforms. Identify the user's recurring mistakes. Surface puzzles targeted at the patterns they most consistently miss. Connect platform performance to training outcomes — e.g., "your fork miss rate dropped 40% since training fork setup."

---

### 5. Personal AI Coach
The core premium feature. Tracks where *this specific user* consistently fails across puzzles and sparring games, diagnoses recurring weakness patterns, and prescribes targeted drills.

**Auto-capture:** every puzzle failed on first attempt and every significant score-drop move in sparring is silently logged: board state, move played, correct move, pattern missed, date.

**Pattern diagnosis:** aggregates failures by category, surfaces the user's personal weakness map — e.g., "Fork Setup: missed 5 of 8 — your weakest pattern. You miss diagonal forks 38% more than average." Benchmarks against the aggregate user population once data exists.

**Review queue:** captured positions are re-presented as fresh puzzles — no indication they were previously failed. Solving correctly removes the entry. Served oldest-unreviewed first, with optional spaced-repetition scheduling once blunder review rate data validates demand.

**Prescriptive drills:** based on the weakness map, the coach prescribes a personalized training sequence — not a generic path, but one derived from that user's actual failure patterns.

**Opening habit tracking:** identifies structural habits (e.g., consistent left-side bias, weak center control in games the user loses) and flags them as drill candidates.

**The log is personal and persistent** — it compounds in value the longer the user trains, because it reflects exactly where *that* user fails rather than where the average player fails. This is what makes the paid tier worth keeping.

---

### 6. Premium Analytics
- Win rate by opening move (first column played)
- Win rate as first vs. second player
- Error trend over time (blunder rate by week)
- Tactical accuracy score (% of moves matching optimal or near-optimal)
- Rating progression correlated with training volume
- Pattern mastery progress (accuracy by category over time)

---

### 7. Advanced Training Paths
Curated programs assembled from puzzle sequences, each targeting a specific player goal:

- "Beat casual friends fast" — immediate threats and basic forks
- "Reach intermediate tier" — double threats, 7-trap, basic zugzwang
- "Anti-fork mastery" — recognize and prevent forks before they form
- "Defensive killer instinct" — preventative blocking and neutralization
- "Endgame closer program" — parity control, claimeven, forced sequences

Programs are prescribed by the Personal AI Coach based on the user's weakness map, not surfaced as a generic menu.

---

### 8. Progress & Stats
Puzzle accuracy by category, ELO estimate derived from sparring performance, comparison to papergames.io ELO once integration exists, delta vs. prior sessions, and training streak tracking.

---

## Cross-cutting: State Management

All app state (session stats, blunders, Deep Reveal count, puzzle progress) uses a storage-agnostic interface. Anonymous users persist state in IndexedDB with a device-bound UUID profile. On signup, local state migrates to the backend seamlessly. No component in the app is aware of which storage backend is active.

---

## Cross-cutting: Analytics

A `tracks` table records all user interactions: uid (device hash, always present), user_id (Supabase ID when signed in), path (feature area), event_data (JSON), created_at. Design to capture everything; instrument only what is needed to compute active KPIs at any given phase.
