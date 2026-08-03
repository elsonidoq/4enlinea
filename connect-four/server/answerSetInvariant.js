// The answer-set invariant — ONE definition, shared by the grader-side generation guard
// (candidate-generator.js#checkPredicate), the content audit
// (scripts/audit_answer_ambiguity.mjs) and the lesson gate (tests/lessons/lessonAnswerSets.test.js).
//
// A teaching board must never contain a winning move that the drill grades wrong, and its taught
// answer must itself be a winning move:
//
//     optimalCols ⊆ acceptedCols        no solver-optimal column is graded wrong
//     acceptedCols ∩ optimalCols ≠ ∅    the taught answer is itself optimal
//
// A board that violates either is a CONTENT defect: replace the board, never loosen the grader.
// This module exists because the same rule was briefly written out twice and the two copies
// immediately drifted (one grew a lost-position exemption, the other did not, and 7 good
// undercut puzzles were retired as a result). Import it; do not restate it.

import { evaluatePredicate, buildPredicatePuzzle } from './predicates.js';

const COLS = 7;
const FULL_COLUMN = -1000;

export const legalCols = (scores) =>
  [...Array(COLS).keys()].filter(c => scores[c] > FULL_COLUMN);

export function optimalCols(scores) {
  const legal = legalCols(scores);
  if (legal.length === 0) return [];
  const max = Math.max(...legal.map(c => scores[c]));
  return legal.filter(c => scores[c] === max);
}

// The single shared relative solver-safety floor (FR-001, spec 051 Epic 1): a column `C` is safe
// iff it is among the board's own solver-optimal columns — uniform for both won boards
// (scores[C] > 0 and best) and fully-lost boards (C among the slowest losses). Every per-column
// safety check in this codebase MUST import this rather than restating `optimalCols(scores)
// .includes(col)` inline — see this file's header.
export function isSolverSafe(col, scores) {
  return optimalCols(scores).includes(col);
}

// The production grader's accepted set: every legal column evaluatePredicate does not reject.
// 'tied' is an acceptance, not a rejection — see the caller sweep at the top of predicates.js.
export function acceptedCols(category, moveString, scores, { correctCols, highlightMetadata } = {}) {
  const puzzle = buildPredicatePuzzle(category, moveString, { correctCols, highlightMetadata });
  return legalCols(scores).filter(c => {
    const r = evaluatePredicate(puzzle, c, scores).result;
    return r === 'correct' || r === 'tied';
  });
}

/**
 * Classify a board against the invariant.
 *
 * @returns 'OK'                — both rules hold
 *          'LOST-POSITION'     — every legal move loses, so the rules do not apply (see below)
 *          'NO-CONCEPT'        — no column satisfies the category at all
 *          'AMBIGUOUS'         — a solver-optimal column is graded wrong
 *          'SUBOPTIMAL-ANSWER' — the accepted columns are not solver-optimal
 */
export function classifyAnswerSet(accepted, optimal, scores) {
  if (accepted.length === 0) return 'NO-CONCEPT';
  // No usable scores => nothing to judge, so the invariant cannot fire. This is a real calling
  // convention, not a defensive nicety: immediate_threat and forced_block are board-derived and
  // are legitimately checked with `scores = []` (see checkPredicate callers and
  // tests/unit/candidateGeneratorColorAndForcedBlockGuard.test.js). Treating that as a violation
  // rejected every such candidate.
  if (optimal.length === 0) return 'NO-SCORES';
  // Lost positions are exempt. With every legal move losing, `optimal` only means "loses
  // slowest", and a concept drill may legitimately teach a move that is not the slowest loss.
  // `undercut` is the motivating case: detectUndercutVictim only fires when scores[C] < 0, so its
  // boards are routinely losing. Lesson boards can't be lost anyway — verify_lesson_content.mjs
  // rejects those separately — so exempting here costs the lessons nothing.
  if (optimal.length > 0 && scores[optimal[0]] < 0) return 'LOST-POSITION';
  if (optimal.some(c => !accepted.includes(c))) return 'AMBIGUOUS';
  if (!accepted.some(c => optimal.includes(c))) return 'SUBOPTIMAL-ANSWER';
  return 'OK';
}

// Verdicts that are not defects. LOST-POSITION and NO-SCORES are reported for visibility but
// never fail a run — neither is a statement about the board being wrong.
export const PASSING_VERDICTS = new Set(['OK', 'LOST-POSITION', 'NO-SCORES']);

export const isPassing = (verdict) => PASSING_VERDICTS.has(verdict);

/**
 * Generation-time guard: does this candidate's answer set satisfy the invariant?
 *
 * `correctCols` comes from checkPredicateRaw, so this works for every category without knowing
 * how the answer was derived. forbidden_columns is exempt by the caller: checkForbiddenColumnsPredicate
 * returns `correctCols: safeCols` — the ACCEPTED/safe columns, not the columns to avoid — but those
 * safe columns already reflect the caller's own forbidden-column exclusion, so re-running this
 * subset check against them would be meaningless (double-filtering the same set against itself).
 */
export function answerSetHolds(correctCols, scores) {
  return isPassing(classifyAnswerSet(correctCols ?? [], optimalCols(scores), scores));
}
