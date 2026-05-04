# Internal Tool Specification: Puzzle Factory (MVP)

## 1. Overview
The **Puzzle Factory** is an internal utility designed to populate the DecodeC4 MVP with high-quality, pattern-specific training puzzles. The tool automates the discovery of candidate positions by leveraging the existing `c4solver` and rule-based pattern classifier, leaving only the final pedagogical curation to a human annotator.

---

## 2. Core Workflow: Automated Candidate Generation
To minimize human effort, the tool follows a "Generate-Filter-Curate" pipeline.

### 2.1. Solver-Guided Sampling
The backend service generates board states by simulating games:
*   **Initial State:** Starts from an empty board or a randomized opening (first 4-6 moves).
*   **Move Selection:** Uses a weighted random sampler. It prioritizes moves with high solver scores for the "active" player to reach winning/complex patterns, while occasionally making sub-optimal moves for the "opponent" to create tactical openings
*   **Step-through Analysis:** At every ply (turn), the board state is passed to the **Explanation Engine** (Layers 1 and 2 only).

### 2.2. Classifier Filtering (Goal Predicates)
A board is flagged as a candidate for a specific category if it meets the **Goal Predicate** defined in the MVP spec

| Category | Predicate Logic for Candidate Detection |
| :--- | :--- |
| **Immediate Threat** | Solver detects a score of $V$ (win) where the winning move is a bitboard sequence of 4. |
| **Forbidden Columns** | For each legal column $c$, simulate playing there and check whether the opponent has an immediate bitboard win on the following turn. A position is a candidate when ≥ 1 such column exists, and ideally when the number of forbidden columns varies (1, 2, or even all columns) to cover diverse puzzle instances. |
| **Forced Block** | Opponent has a bitboard-detected winning threat; only one column prevents immediate loss. |
| **Double Threat** | Post-move, the classifier detects $\ge 2$ distinct winning threats for the player. |
| **Fork Setup** | A sequence of 3–5 moves where the solver score remains $V$ and ends in a Double Threat state. |
| **Zugzwang** | A state where every legal move for the opponent results in a forced loss score from the solver. |
| **Parity Control** | Solver confirms the win is dependent on controlling the final odd/even cell in a column. |

---

## 3. Annotator UI Features
The internal web interface allows the human curator to process the generated candidates.

### 3.1. Candidate Review Dashboard
*   **Queue Management:** Displays counts of pending candidates per category (e.g., "Zugzwang: 14 pending").
*   **Batch Actions:** Ability to "Reject All" in a batch if the generator produced noise (e.g., positions too close to the end-game to be educational).

### 3.2. Curation Workspace
*   **Interactive Board:** Displays the candidate position. The annotator can click columns to see solver scores and classifier tags instantly.
*   **Pattern Metadata:** Displays the engine’s "Deep Reveal" (minus the LLM prose):
    *   Solver scores for all 7 columns.
    *   List of tags identified (e.g., `diagonal_fork`, `bottom_row_parity`).
*   **Goal Verification:** A "Predicate Checklist" that lights up green if the human-selected move matches the engine's predicted pattern.
*   **The "Cleanliness" Check:** A toggle to ensure there are no "distractor" wins (other unintended winning moves) that might confuse a student.

### 3.3. Multi-Move Sequencer (For Paid Categories)
For **Fork Setup** and **Parity**, the tool allows the annotator to:
1.  Define the start and end of the puzzle sequence.
2.  Set the AI's "Cooperative Response" moves (choosing moves that are legal but do not prematurely block the pattern being taught)

---

## 4. Technical Constraints
*   **No LLM:** The tool focuses purely on the structural truth of the solver and the rule-based tags. Natural language generation is excluded from the creation tool to ensure the annotator focuses on tactical accuracy
*   **Persistence:** Approved puzzles are exported according to the format described in specs/001-decodec4-mvp/data-model.md

---

## 5. Success Metric for the Tool
*   **Efficiency Goal:** A human annotator should be able to curate the 50 required MVP puzzles in under 4 hours of total work, assuming the generator provides a 3:1 candidate-to-approval ratio.
