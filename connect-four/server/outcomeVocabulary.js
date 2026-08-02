// Maps evaluatePredicate's raw result vocabulary ('correct'|'wrong'|'tied', see
// server/predicates.js's evaluatePredicate @returns contract) to the stored
// puzzle_attempts.outcome enum narrowed by migration 063
// (server/migrations/063_puzzle_attempts_outcome_narrow.sql) to
// 'correct_first' | 'tied' | 'incorrect' | 'abandoned'.
//
// server/index.js is not HTTP-harness-testable (the Express app is not exported),
// so this pure map lives here and is unit-tested; index.js only wires it.
//
// FR-015 (spec 054 US3): before this map existed, the writer at
// POST /api/puzzles/:id/check inserted evaluation.result verbatim, so a 'wrong' result
// failed the pre-migration-063 CHECK constraint and was silently dropped by the
// fire-and-forget `.catch(err => console.error(...))`.

const RAW_TO_STORED_OUTCOME = {
  correct: 'correct_first',
  wrong: 'incorrect',
  tied: 'tied',
};

/**
 * Translate evaluatePredicate's raw result into the stored puzzle_attempts.outcome enum.
 * @param {'correct'|'wrong'|'tied'} rawResult
 * @returns {'correct_first'|'incorrect'|'tied'}
 */
export function toStoredOutcome(rawResult) {
  const stored = RAW_TO_STORED_OUTCOME[rawResult];
  if (!stored) {
    throw new Error(`toStoredOutcome: unrecognized evaluatePredicate result "${rawResult}"`);
  }
  return stored;
}
