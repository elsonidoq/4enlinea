# Classifier Design Review — Pre-Completion Mode Alignment
**Date:** 2026-05-21

## Context

Each classifier should operate in **pre-completion mode**: it detects a board position where playing `correct_col` *creates* the target pattern. This serves two use cases:

1. **Puzzle generation** — find positions in gameplay simulations where the next move completes a teachable tactic.
2. **Sparring hints** — warn the learner ("you could build X here") or alert them ("the AI is about to complete X").

The KB documents the *complete* strategic pattern and why it wins. The classifier predicates are intentionally different — they describe the one-move-away state.

---

## Per-Classifier Assessment

### Cat 1 — `immediate_threat` ✓
Playing `candidateCol` wins immediately. The winning disc is the completing move. Clean pre-completion.

### Cat 2 — `forced_block` ✓
Opponent has an immediate threat; this is the only saving move. Pre-completion from the defender's perspective. Consistent with the design.

### Cat 3 — `double_threat` ✓
Simulates placing the disc in `candidateCol`, then counts reachable threats ≥ 2 on the resulting board. Correctly pre-completion.

### Cat 4 — `forced_win` ✓
Best move in a position where all moves are losing. Playing it starts the forced sequence. Pre-completion.

### Cat 5 — `forbidden_columns` ⚠️ — open design question
Detects columns that give the opponent an immediate winning response — a trap to avoid, not a beneficial completing move. The puzzle would be "identify the dangerous column," which is a different interaction model from all other classifiers (those ask the learner to PLAY a move; this one asks them to AVOID one). Not necessarily wrong, but the intended puzzle design should be confirmed.

### `detectZThreat` ✓
Finds the column with an odd-count empty capsule to a major threat on the current board. Playing it starts the zugzwang sequence. Pre-completion.

### `detectUndercut` ⚠️ — conceptual mismatch
Requires `scores[col] < 0` — fires on **losing** columns. It detects: "your threat at row R will be killed by the opponent's lower threat at row R'." The puzzle would be about recognising a trap to avoid, not about applying undercut as a winning technique.

All other classifiers detect a move the learner should PLAY. This one detects a move the learner should AVOID. This is structurally opposite to the pre-completion design.

Two possible intended designs — needs clarification:
- **Trap-avoidance puzzle**: "recognise which column is dangerous and why." `correct_col` is the column to avoid. The classifier is correct as-is.
- **Technique-application puzzle**: "find the column where YOU can use undercut to win." Would require `scores[col] > 0` and swapping whose threats are at which rows (current player's lower threat kills opponent's upper threat).

### `detectOvercut` ✓
Requires `scores[col] > 0`. Playing the column wins by overcoming the opponent's lower threat via one of T2/T4/T5 mechanisms. Pre-completion, consistent with the pattern.

### `detectFigure7` ✓
4-of-5 Figure-7 discs placed, completing cell (the junction/hinge) empty and at gravity-top, confirmed by solver. Playing `correct_col` creates the Figure-7 zugzwang. Clean pre-completion.

### `detectJShape` ✓ in design (has known implementation bugs)
3-of-4 J-shape discs placed, completing cell at gravity-top. The design intent is correct pre-completion. Known bugs (missing parity check, missing player identity check) are separate from the design question and are tracked in the Phase 6 tasks.

### `detectClaimeven` ✓
Identifies the column Yellow should play to initiate the claimeven zugzwang, validated by running a full baseinverse simulation. Pre-completion.

---

## Summary

| Classifier | Pre-completion aligned? | Note |
|---|---|---|
| immediate_threat | ✓ | |
| forced_block | ✓ | |
| double_threat | ✓ | |
| forced_win | ✓ | |
| forbidden_columns | ⚠️ | Trap-avoidance model differs from other classifiers — confirm intent |
| detectZThreat | ✓ | |
| detectUndercut | ⚠️ | Fires on losing columns — trap detection, not technique application |
| detectOvercut | ✓ | |
| detectFigure7 | ✓ | |
| detectJShape | ✓ (design) | Implementation bugs tracked separately in Phase 6 |
| detectClaimeven | ✓ | |

**10 of 11 classifiers** are aligned with the pre-completion design. Two open design questions requiring clarification:

1. **`forbidden_columns`** — is the intended puzzle "identify the trap column" (current implementation) or something else?
2. **`detectUndercut`** — is the intended puzzle "recognise a trap to avoid" (current implementation) or "find the column where you can use undercut to win" (would require inverting the predicate)?
