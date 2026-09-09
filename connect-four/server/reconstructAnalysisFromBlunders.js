// Extracted from server/index.js (spec 057 T034) so tests can exercise the
// cached-reconstruction path directly, without importing index.js itself (which has
// heavy import-time side effects — spawns the c4solver process, opens listeners; see
// tests/unit/debugClassifyAllValidation.test.js's header note).
//
// Spec 054 (Epic 4) User Story 3 / FR-013 / T031. Shared by both the authenticated and
// anonymous branches of POST /api/games/analyze's cache-check (Constitution Principle
// II / research.md D6 — one reconstruction path, not a copy-paste per branch). Reconstructs
// the same move-by-move analysis shape the solver-driven path produces, but from
// already-stored `blunders` rows instead of re-running the solver. Returns the exact response
// body (not res.json itself) so both call sites can add branch-specific fields identically.
//
// FR-019a note (spec 057): this function does NOT grade — it reads `blunder.quality`
// verbatim from the stored row. The stored value comes from whichever code wrote the row
// (now `scoreMove`, the sole grader — see server/moveQualityScorer.js). Before T035, stored
// rows were graded by the now-deleted `classifyStoredMistake` magnitude threshold, which is
// exactly the divergence FR-020's boundary-case test (tests/unit/qualitySingleCriterion.test.js)
// exercises through this function.

import i18nTranslations from '../src/i18n/en.json' with { type: 'json' };
import { pickFromPool } from './pickFromPool.js';
import { selectReviewSummaryPool } from './selectReviewSummaryPool.js';

export function reconstructAnalysisFromBlunders({ existingBlunders, moves, side, difficulty, created_at, isPapergames }) {
  const blunderMap = new Map(existingBlunders.map(b => [b.move_index, b]));
  const cachedMoves = [];
  let cScored = 0, cOptimal = 0, cSuboptimal = 0, cBlunder = 0;
  let cOrdinal = 0;

  for (let i = 0; i < moves.length; i++) {
    const isUserPly = side === 'first' ? (i % 2 === 0) : (i % 2 === 1);
    if (!isUserPly) continue;
    cOrdinal++;
    cScored++;

    const blunder = blunderMap.get(i);
    if (blunder) {
      cachedMoves.push({
        moveIndex: cOrdinal,
        col: blunder.move_played,
        quality: blunder.quality,
        score: null,
        bestScore: null,
        bestCol: null,
        patternTag: blunder.pattern_category,
        reason: blunder.reason,
        direction: blunder.direction,
        blunderSeverity: blunder.blunder_severity,
      });
      if (blunder.quality === 'suboptimal') cSuboptimal++;
      else cBlunder++;
    } else {
      cachedMoves.push({
        moveIndex: cOrdinal,
        col: parseInt(moves[i], 10),
        quality: 'optimal',
        score: null,
        bestScore: null,
        bestCol: null,
        patternTag: null,
        reason: null,
        direction: null,
        blunderSeverity: null,
      });
      cOptimal++;
    }
  }

  const cAccuracy = cScored > 0 ? Math.round(cOptimal / cScored * 100) : 0;
  // OI-174: band selection is owned by server/selectReviewSummaryPool.js, shared verbatim with
  // server/index.js's solver-driven path. FR-006 (0 blunders + >=1 suboptimal is never "clean")
  // lives inside that rule. Do NOT reintroduce a local copy here — the two producers drifting is
  // the exact failure mode the extraction prevents.
  const phrasePool = selectReviewSummaryPool({
    blunderCount: cBlunder,
    suboptimalCount: cSuboptimal,
    accuracy: cAccuracy,
  });
  const cSummaryKey = pickFromPool(i18nTranslations, phrasePool) ?? `${phrasePool}.0`;

  return {
    moves: cachedMoves,
    accuracy: cAccuracy,
    optimalCount: cOptimal,
    suboptimalCount: cSuboptimal,
    blunderCount: cBlunder,
    scored: cScored,
    summaryPhraseKey: cSummaryKey,
    fullMovestring: moves,
    difficulty,
    side,
    gameDate: created_at,
    source: isPapergames ? 'papergames' : 'ai',
  };
}
