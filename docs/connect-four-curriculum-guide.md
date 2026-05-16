# Connect Four — Curriculum Guide

Reference for puzzle design and the learning system. Theory is in `connect-four-strategy-reference.md`; detection algorithms are in `connect-four-implementation-guide.md`.

---

## 1. Puzzle Taxonomy

Seven archetypes, ordered by cognitive complexity. Each puzzle has exactly one correct first move.

### Archetype 1 — Win in 1 (Direct)

| Property | Value |
|---|---|
| **Educational goal** | Basic board vision; immediate geometric pattern recognition |
| **Board complexity** | Low (10–15 discs) |
| **Solution depth** | 1 ply |
| **Grading** | Pass/Fail — locate the single winning column |
| **Primary metric** | Time-to-solve (measures pattern recognition speed) |

The position contains a Major Direct threat (check) for the student. No strategy required — pure visual scanning.

---

### Archetype 2 — Forced Defense

| Property | Value |
|---|---|
| **Educational goal** | Threat awareness; defensive discipline |
| **Board complexity** | Low to Medium (10–20 discs) |
| **Solution depth** | 1 ply |
| **Grading** | Pass/Fail — identify opponent's check and block it |
| **Failure signal** | Any column other than the block = immediate loss |

Reverse of Win-in-1: the opponent has a Major Direct threat. The student must recognize the danger before thinking offensively.

---

### Archetype 3 — Double-Threat Creation (Fork)

| Property | Value |
|---|---|
| **Educational goal** | Multi-vector planning; offensive branching |
| **Board complexity** | Medium (15–25 discs) |
| **Solution depth** | 3 plies (student move → opponent block → student wins) |
| **Grading** | Branching success — the student's move must create two simultaneous winning lines; any opponent block leads to a Win-in-1 |
| **Validation** | Solver score must jump to maximum (forced win) on the correct move; all other moves score ≤ 0 |

The position contains two partial 3-in-a-row structures that can be unified into a fork by a single move. Teaches the Baseinverse principle: the opponent can only block one threat per turn.

---

### Archetype 4 — Parity Conversion

| Property | Value |
|---|---|
| **Educational goal** | Odd/even row mathematics; macro-level strategy |
| **Board complexity** | High (25+ discs) |
| **Solution depth** | 1–3 plies |
| **Grading** | Conceptual accuracy — two moves look equally appealing; only one is parity-aligned |
| **Common wrong answer** | The even-row threat (looks like a "free" win but has no zugzwang value for Red) |

The student is presented with a choice between two latent threats. One aligns with their parity (odd-row for Red, even-row for Black); the other does not. Choosing correctly is the puzzle.

---

### Archetype 5 — Trap Recognition (Undercut/Overcut)

| Property | Value |
|---|---|
| **Educational goal** | Vertical threat neutralization; column reading |
| **Board complexity** | Medium (20–30 discs) |
| **Solution depth** | 2–4 plies |
| **Grading** | Structural integrity — establish a lower-board threat that renders the opponent's high-column threat Deceptive |
| **Validation** | After the correct sequence, opponent's primary threat is flagged Deceptive in the classifier |

The opponent has a dangerous latent threat high in a column. The student must recognize that placing their own threat *below* the opponent's kills it — without giving away anything else.

---

### Archetype 6 — Defensive Resource Finding

| Property | Value |
|---|---|
| **Educational goal** | Survival in complex mid-game skirmishes |
| **Board complexity** | High (25–35 discs) |
| **Solution depth** | 3–5 plies |
| **Grading** | Survival — find the only sequence of blocks that keeps the solver evaluation above the loss threshold |
| **Challenge** | Multiple opponent threats active simultaneously; wrong order of blocks loses |

The student is under pressure. There is a unique sequence of defensive moves (sometimes including an interposed counter-threat) that survives. Tests move-order discipline and board-wide threat awareness simultaneously.

---

### Archetype 7 — Endgame Precision (Zugzwang)

| Property | Value |
|---|---|
| **Educational goal** | Tempo management; forced-move calculation; square counting |
| **Board complexity** | Very high (35+ discs) |
| **Solution depth** | 5–11 plies |
| **Grading** | Flawless sequential execution — must exhaust dead/harmless columns in the exact right order to force the opponent into the critical column |
| **Primary concept** | Dead-space parity formula: (n + S_dead) mod 2 determines who is forced |

The outcome is mathematically determined — the puzzle tests whether the student can *calculate* the correct sequence rather than relying on pattern recognition.

---

## 2. Curriculum Ordering

Five phases, each building on the previous. Players should not encounter Phase N+1 puzzles until the metrics for Phase N are met.

### Phase 1 — Fundamentals

| Attribute | Value |
|---|---|
| **Target skills** | Immediate win recognition; preventing immediate losses |
| **Prerequisite knowledge** | Basic Connect Four rules only |
| **Puzzle mix** | 80% Win-in-1, 20% Forced Defense |
| **Advancement gate** | Win-in-1 average TTS < 5 seconds; Forced Defense accuracy > 90% |

Goals: build automatic visual scanning for four-in-a-row patterns in all four directions. No strategy instruction yet.

---

### Phase 2 — Tactics

| Attribute | Value |
|---|---|
| **Target skills** | Multi-step forcing sequences; fork creation; tempo awareness |
| **Prerequisite** | Phase 1 mastery |
| **Puzzle mix** | 60% Double-Threat Forks, 40% Forced Sequences (short VCF, 3–5 ply) |
| **Advancement gate** | Fork accuracy > 75%; VCF puzzles solved with ≤ 1 hint on average |

Goals: internalize that winning requires creating threats faster than the opponent can block them.

---

### Phase 3 — Positional Play

| Attribute | Value |
|---|---|
| **Target skills** | Center column value; J-shape and Figure-7 recognition; structural patterns |
| **Prerequisite** | Phase 2 mastery |
| **Puzzle mix** | 70% structural/formation puzzles (J-shape, Figure-7, center control), 30% mixed tactics |
| **Advancement gate** | J-shape recognition accuracy > 80%; center-column deviation rate < 20% in free play |

Goals: recognize formations before they're complete; understand how geometric structures create inevitable wins several moves in advance.

---

### Phase 4 — Deep Strategy

| Attribute | Value |
|---|---|
| **Target skills** | Odd/even parity math; vertical undercuts; trap construction |
| **Prerequisite** | Phase 3 mastery |
| **Puzzle mix** | 50% Parity Conversion, 50% Trap Recognition |
| **Advancement gate** | Parity Conversion accuracy > 80%; Trap Recognition accuracy > 70% |

Goals: understand row ownership as a mathematical law, not just a heuristic. Build the ability to read whether a latent threat is genuinely winning or secretly dead.

---

### Phase 5 — Master Endgame

| Attribute | Value |
|---|---|
| **Target skills** | Zugzwang calculation; dead-space parity; forced exhaustion |
| **Prerequisite** | Phase 4 mastery |
| **Puzzle mix** | 100% Zugzwang / Endgame Precision / Defensive Resource |
| **Advancement gate** | Endgame Precision accuracy > 65%; TTS on zugzwang puzzles < 60 seconds |

Goals: transition from pattern recognition to pure mathematical calculation of who is forced to play where.

---

## 3. Learning Analytics

### 3.1 Time-to-Solve (TTS)

Measures elapsed time from puzzle display to first move submission.

- **Interpretation:** Low TTS on hard puzzles = strong pattern recognition. High TTS on easy puzzles = gaps in fundamentals.
- **Action trigger:** If a student's TTS on Phase 1 puzzles exceeds 10 seconds on average after 20 puzzles, inject additional Win-in-1 drills before advancing.

### 3.2 Hint Utilization Rate

Percentage of puzzles where the student requested a hint.

- **Threshold:** > 80% hint rate over a 10-puzzle window indicates the curriculum is too steep.
- **Action trigger:** Inject scaffolding puzzles — simpler instances of the same archetype — before returning to the current difficulty level.

### 3.3 Error Categorization

Track which column the student played on incorrect attempts. Map incorrect columns back to the threat taxonomy to identify systematic gaps:

| Error pattern | Likely gap | Remediation |
|---|---|---|
| Student plays the losing forced-upon column | Does not see Forced Defense situations | More Phase 1 Forced Defense |
| Student plays an even-row threat for Red | Does not understand parity | Phase 4 Parity Conversion drills |
| Student plays above a forbidden square | Does not check for opponent's response | Phase 2 tactical awareness drills |
| Student finds one threat but misses the fork setup | Does not plan two moves ahead | Phase 2 Fork drills |
| Student gets the right column but wrong timing | Move-order confusion | Phase 2 Forced Sequence puzzles |

Error categorization runs automatically by comparing the played column against the solver's per-column score array. A column that scores near 0 (draw) when the correct move scores highly (win) signals a parity confusion. A column that scores negative (loss) when the correct move is a block signals defensive blindness.

---

## 4. Admin Dashboard and Human Validation

### 4.1 Dashboard Layout

For each puzzle in the review queue, display:

- **Board rendering:** Current position with disc colors.
- **Optimal move highlight:** Mark the correct column.
- **Tactical tag:** Primary archetype assigned by the classifier.
- **Solver score matrix:** Per-column scores for all 7 columns, showing the full evaluation landscape.
- **Explanation preview:** The natural-language explanation string that will be shown to students.
- **Classification confidence:** High / Medium / Low based on detection method.

### 4.2 Human Validation Checklist

Before approving a puzzle for the student pool:

- [ ] The board position looks naturalistic (not a forced construction with obvious gaps).
- [ ] The correct move is unambiguous — exactly one column scores above all others.
- [ ] The tactical tag matches the human reviewer's understanding of the position.
- [ ] The explanation text is accurate and uses correct coordinate references.
- [ ] No forbidden squares exist for the student's correct move (the move doesn't immediately enable an opponent win on the cell above).
- [ ] The puzzle is solvable within the expected solution depth for its archetype.

### 4.3 False Positive Queue

Puzzles where the solver's best move conflicts with the classifier's tagged move are automatically routed to the false-positive queue. Do not approve these without re-running the solver and manually inspecting the position.

### 4.4 Puzzle Retirement

Retire a puzzle from the active pool when:
- It has been solved correctly by > 95% of students at the target phase (too easy).
- It has been solved correctly by < 20% of students after 50 attempts and ≥ 2 hints per attempt on average (too hard or broken).
- The solver or classifier was updated and the puzzle's tags/scores are now inconsistent.
