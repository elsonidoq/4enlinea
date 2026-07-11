---
name: project_puzzle_correctness_seams
description: "Where puzzle answer-correctness is actually judged (dual server seam + two client bypasses) and the traps that look relevant but aren't"
metadata: 
  node_type: memory
  type: project
  originSessionId: c09ffba4-34ae-46ca-94bc-bf215d3744d3
---

# Puzzle answer-correctness — the real seams (and the decoys)

Judging "is this the right move for this puzzle?" lives in **two server layers**, and there are **two client
paths that bypass the server evaluator entirely**. Getting this wrong wastes hours (it did — spec 044 review).

## The two real server seams
- **Generation-time:** `candidate-generator.js` — `checkPredicate` dispatches per category to `check*Predicate`
  functions. Multi-solution categories (immediate_threat/forced_block/double_threat) filter legal columns via
  `evaluatePredicate` and gate `passes` on `correctCols.length === 1`.
- **Solve-time:** `predicates.js` — `evaluatePredicate(puzzle, candidateCol, scores)` dispatches per category;
  `evalImmediateThreat`/`evalForcedBlock`/`evalDoubleThreat` already return `{result:'tied', tiedWith, correctCol}`
  for multi-column cases.

## The multi-solution accept bug (spec 044 target)
`checkPredicate` counts a column correct only when `evaluatePredicate(...).result === 'correct'` — it **discards
`'tied'`** — and then requires `correctCols.length === 1`. So a genuinely multi-solution board (two valid fork
columns) is rejected at generation, and a valid alternate is scored wrong. `evalDoubleThreat` already multi-accepts
via `'tied'`; the callers throw it away. Fix is per-category, not a blanket rule.

## Per-category semantics differ — do NOT apply a blanket "classifier-on-result" rule
- `checkUndercutPredicate` already computes **avoid-the-pattern** correctly: correctCols = every legal column
  EXCEPT the killing column. A "pattern present → correct" rule would INVERT it.
- `claimeven`/`overcut`/`z_threat` are **unique-answer** (single correctCol) — "accept any generating column" is a
  no-op there.

## Decoys — look relevant to correctness, are NOT
- `blunderReasons.js` / `blunderTags.js` — **sparring-game blunder tagging**, `VALID_BLUNDER_TAGS != VALID_CATEGORIES`.
  Not puzzle correctness.
- `CompletionStrategy` (`completionStrategies.js`, spec 007) — sequence-mode **forced-win continuation** validator.
  Not single-answer correctness.

## The two client bypasses (a green test suite can hide a broken UX here)
- **ChallengeScreen** calls `POST /api/evaluate-move`, which judges via `scoreMove()` (pure solver-score compare)
  and **never calls `evaluatePredicate`**. A sibling endpoint `/api/evaluate-move/inline` DOES call
  `evaluatePredicate`, but nothing routes ChallengeScreen to it. So fixing `evaluatePredicate` alone does not reach
  Challenge puzzles. **score-tie ≠ fork-tie:** a double_threat fork column need not be the max-score column, so
  `scoreMove` is not a safe stand-in — verify empirically before trusting it.
- **SocraticScreen** compares `col === lesson.socratic.correctCol` client-side on **hand-authored lesson content**
  that has no `category` and no accepted-answer set → bare equality is correct there; nothing to fix (single-answer
  by construction).

**When you change correctness for the three multi-solution categories, do an exhaustive `rg 'evaluatePredicate'`
caller sweep** — a single missed caller silently re-introduces the "false wrong" bug.

Related: [[classifier-architecture-and-score-convention]] (detectors + check*Predicate), [[reference_classify_vs_classifyPattern]], [[reference_valid_blunder_tags]], [[project_forced_win_refactor]] (CompletionStrategy).
