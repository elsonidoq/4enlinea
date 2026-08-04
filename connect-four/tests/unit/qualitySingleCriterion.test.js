// FR-020 (spec 057): boundary-case test proving the live scoring path (`scoreMove`) and the
// cached-reconstruction path (`reconstructAnalysisFromBlunders`, reading a stored `blunders`
// row) produce IDENTICAL `quality` for one real harvested move. This is the FR-019/OI-104
// regression test — it must ship live and passing (D4 is RESOLVED, so the `skip`-marked
// fallback the original task text allowed no longer applies).
//
// Position harvested via server/gameSampling.js's playGame (never hand-constructed; see
// CLAUDE.md's movestring-sourcing rule), verified with `./visualize_board.sh 35` from the
// repo root — its `scr` row reads `-2 2 0 0 -2 2 -2`, matching SCORES below exactly:
//   pre-move movestring '35' (2 plies played: col 3, col 5 — 0-indexed), mover P1 (Green) to
//   play a 3rd move. c4solver scores (0-indexed columns): [-2, 2, 0, 0, -2, 2, -2].
//   Best column is col 1 (score 2, a small win). Playing col 2 (score 0) drops win -> draw —
//   an outcome-class change of magnitude exactly 2.
//
// This is FR-019a's own worked boundary case (`bestScore=2, playedScore=0`): the now-deleted
// `classifyStoredMistake` magnitude threshold (`bestScore - playedScore > 4 ? 'blunder' :
// 'suboptimal'`, formerly at server/mistakeStorageRule.js:102) graded this move 'suboptimal'
// (2 - 0 = 2, not > 4). `scoreMove` (server/moveQualityScorer.js) grades by outcome-class
// change — any win -> draw or win -> loss is 'blunder' regardless of magnitude — so it grades
// the SAME move 'blunder'. Before T035, the live path (badge) and the stored/cached path
// (detail screen, Review chips) disagreed on this exact class of move.
//
// SCOPE, HONESTLY STATED (corrected 2026-08-04 — the previous header's "OBSERVED ... this
// test's final assertion FAILED" claim was IMPOSSIBLE as written and has been removed):
// `storedRow.quality` below is derived by calling `scoreMove` a second, independent time
// (`writePathQuality`, mirroring the single call `server/index.js`'s `POST /api/games/analyze`
// handler makes — `const { quality, bestCol } = scoreMove(scores, col);` — whose result feeds
// BOTH the live response AND, when `classifyStoredMistake` says the ply is eligible, the
// `insertGameBlunder` write). This test therefore proves `reconstructAnalysisFromBlunders` is a
// faithful, unmodified passthrough of whatever `quality` a `blunders` row already carries — the
// FR-020 half of the contract this test can reach directly. It does **not** exercise
// `POST /api/games/analyze` or `insertGameBlunder` themselves (no DB, no HTTP layer in this
// unit test), so it cannot by itself catch a regression where `server/index.js`'s write path
// stops using `scoreMove`'s result for the stored `quality` — that half of FR-019a's "exactly
// ONE grader" contract is enforced by reading `server/index.js` at the `insertGameBlunder(...)`
// call (`quality,` passed straight from the `scoreMove` destructure, no second computation) plus
// `tests/unit/mistakeStorageRule.test.js`'s coverage of `classifyStoredMistake` returning
// eligibility only, never a quality label. A true end-to-end version (real HTTP call into
// `POST /api/games/analyze`, real DB write, then a follow-up read) was judged not worth adding
// here — it would need a live Supabase fixture and a stubbed solver, which is more machinery
// than a boundary-case regression test for FR-020 warrants; `tests/integration/` is where that
// would belong if a future regression demands it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreMove } from '../../server/moveQualityScorer.js';
import { reconstructAnalysisFromBlunders } from '../../server/reconstructAnalysisFromBlunders.js';

// Harvested via server/gameSampling.js playGame() + the real c4solver (a scratch script
// invoking playGame with a fixed rng, searching for a ply with bestScore===2 and a legal
// column scoring 0); cross-checked against `./visualize_board.sh 35`'s `scr` row.
const SCORES = [-2, 2, 0, 0, -2, 2, -2];
const BEST_COL = 1;   // score 2 (a small win)
const PLAYED_COL = 2; // score 0 (win -> draw)
const PRE_MOVE_MOVESTRING = '35';

test('FR-020 boundary case (bestScore=2, playedScore=0): live scoreMove and the cached-reconstruction path agree', () => {
  const live = scoreMove(SCORES, PLAYED_COL);
  assert.equal(SCORES[BEST_COL], 2);
  assert.equal(SCORES[PLAYED_COL], 0);
  assert.equal(live.bestCol, BEST_COL);
  // scoreMove: win (positive) -> draw (zero) is a sign-class drop, graded 'blunder'
  // regardless of the raw magnitude of the drop.
  assert.equal(live.quality, 'blunder');

  // Historical record (documents the divergence FR-019a fixes; classifyStoredMistake no
  // longer computes this at all post-T035 — server/mistakeStorageRule.js). The deleted
  // magnitude threshold would have graded this SAME move differently from scoreMove:
  const DELETED_MAGNITUDE_THRESHOLD_QUALITY =
    (SCORES[BEST_COL] - SCORES[PLAYED_COL]) > 4 ? 'blunder' : 'suboptimal';
  assert.equal(DELETED_MAGNITUDE_THRESHOLD_QUALITY, 'suboptimal');
  assert.notEqual(
    DELETED_MAGNITUDE_THRESHOLD_QUALITY,
    live.quality,
    'the deleted magnitude rule disagreed with scoreMove on this exact move — the FR-019/OI-104 bug'
  );

  // Cached-reconstruction path: a stored `blunders` row for this ply. Post-T035, the write
  // path (server/index.js's POST /api/games/analyze handler) stores `quality` straight from
  // its own `scoreMove(scores, col)` call — no second computation. Reproduce that call
  // independently here (rather than reading the `live` variable above) so this fixture models
  // "what the write path derives," not a hardcoded copy of this test's own live-path result.
  const writePathQuality = scoreMove(SCORES, PLAYED_COL).quality;
  const gamePlies = PRE_MOVE_MOVESTRING.length; // 2 plies already played before this move
  const storedRow = {
    move_index: gamePlies, // 0-indexed global ply this move occupies
    move_played: PLAYED_COL,
    quality: writePathQuality,
    pattern_category: 'suboptimal_move',
    reason: 'test fixture',
    direction: 'missed_own',
    blunder_severity: null,
  };
  const reconstructed = reconstructAnalysisFromBlunders({
    existingBlunders: [storedRow],
    moves: PRE_MOVE_MOVESTRING + String(PLAYED_COL),
    side: 'first', // ply 0 and ply 2 are P1 (Green) plies — mover of PLAYED_COL is P1
    difficulty: 'medium',
    created_at: '2026-01-01T00:00:00Z',
    isPapergames: false,
  });
  const cachedMove = reconstructed.moves.find((m) => m.col === PLAYED_COL);
  assert.ok(cachedMove, 'reconstructed move for this ply must exist');

  // FR-020: the live path and the cached-reconstruction path must produce IDENTICAL quality.
  assert.equal(cachedMove.quality, live.quality);
});
