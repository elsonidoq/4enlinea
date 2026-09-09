// OI-174 — the single owner of "which post-game coach summary pool does this game get".
//
// Both producers of `summaryPhraseKey` must use this and only this: the solver-driven
// POST /api/games/analyze path in server/index.js, and the cached path in
// server/reconstructAnalysisFromBlunders.js. Before this module they held byte-identical
// copies of a binary clean/mistakes ternary (index.js:2287-2290 and
// reconstructAnalysisFromBlunders.js:72-74), which is exactly the drift risk the extraction
// removes — fix one and the cached-game review keeps the old behaviour.
//
// The defect this fixes was NOT "the selection ignores the counts" (it never did). It was that
// `coach.spoken.sparring.review.mistakes` is a single binary bucket with NO accuracy band, so a
// 17%-accuracy / 3-blunder game and a 95%-accuracy / 1-suboptimal game drew from the same four
// strings — one of which is "You played well. Let's find the edge."
//
// Bands are keyed only off values BOTH producers already compute at the call site
// (accuracy = round(optimal/scored*100), blunderCount, suboptimalCount):
//
//   clean          blunderCount === 0 && suboptimalCount === 0   (unchanged; FR-006 —
//                  0 blunders + >=1 suboptimal is still a game with mistakes, never "clean")
//   mistakesStrong blunderCount === 0 && accuracy >= 80          — slips only, nothing decisive
//   mistakes       blunderCount <= 1 && accuracy >= 50           — the existing pool, unchanged
//   mistakesRough  everything else                                — <50% accurate, or >=2 blunders
//
// Why `blunderCount === 0` gates the praise band rather than accuracy alone: a single blunder can
// lose a game outright at any accuracy, so a blunder-containing game never earns "sharp game".
// Why 50/80 and not other numbers: 80% is roughly "one slip in five non-forced moves" and 50% is
// "at least half the non-forced moves were not the best move" — both computed over `scored`
// (non-forced plies only), which is what `accuracy` already means at both call sites.
//
// The four `mistakes` strings are deliberately NOT re-worded or redistributed: coach audio is
// keyed by the i18n KEY (not a text hash), so editing text under an existing key would ship the
// old clip with the new text.

const PREFIX = 'coach.spoken.sparring.review';

/**
 * @param {object} counts
 * @param {number} counts.blunderCount
 * @param {number} counts.suboptimalCount
 * @param {number} counts.accuracy  0-100 integer
 * @returns {string} dot-path of the phrase pool, for pickFromPool()
 */
export function selectReviewSummaryPool({ blunderCount, suboptimalCount, accuracy }) {
  if (blunderCount === 0 && suboptimalCount === 0) return `${PREFIX}.clean`;
  if (blunderCount === 0 && accuracy >= 80) return `${PREFIX}.mistakesStrong`;
  if (blunderCount <= 1 && accuracy >= 50) return `${PREFIX}.mistakes`;
  return `${PREFIX}.mistakesRough`;
}
