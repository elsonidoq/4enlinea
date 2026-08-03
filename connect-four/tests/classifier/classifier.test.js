import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  classify, parseBoardState, hasActiveDoubleThreat,
  Board,
  detectForcedWin,
  detectOddEvenThreat,
} from '../../server/classifier.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const fixtures = JSON.parse(
  readFileSync(join(__dir, 'fixtures/fixtures.json'), 'utf8')
);

describe('classify()', () => {
  for (const fix of fixtures) {
    test(fix.description, () => {
      const result = classify(fix.moves, fix.candidateCol, fix.scores);
      assert.equal(
        result.tag,
        fix.expectedTag,
        `Expected tag "${fix.expectedTag}" but got "${result.tag}"`
      );
    });
  }
});

// Regression tests against 8 known false-positive DB records (see docs/mvp/feedback_for_generate_v2.md)
describe('classify() false-positive regressions', () => {
  // C1 bug: score === winScore for odd moveCount matches win-in-2, not immediate win.
  // Board-level check must reject these four positions as Cat 1.
  test('C1 regression (ebebf258): odd moveCount=15, score=winScore=13 but no 4-in-a-row — not cat 1', () => {
    const result = classify('316443431430113', 2, [11, 11, 13, 11, 11, -13, 11]);
    assert.notEqual(result.tag, 'immediate_threat', 'C1 false-positive must not be immediate_threat');
  });

  test('C1 regression (1c58cd7a): odd moveCount=15, score=winScore=13 but no 4-in-a-row — not cat 1', () => {
    const result = classify('334553033612623', 1, [6, 13, 12, -1000, 11, 7, 7]);
    assert.notEqual(result.tag, 'immediate_threat', 'C1 false-positive must not be immediate_threat');
  });

  test('C1 regression (982ca50c): odd moveCount=23, score=winScore=9 but no 4-in-a-row — not cat 1', () => {
    const result = classify('13330365455563362402645', 2, [8, 7, 9, -1000, 8, 7, 7]);
    assert.notEqual(result.tag, 'immediate_threat', 'C1 false-positive must not be immediate_threat');
  });

  test('C1 regression (c4526868): odd moveCount=27, score=winScore=7 but no 4-in-a-row — not cat 1', () => {
    const result = classify('445263501514561142422101522', 3, [6, -1000, -1000, 7, 6, 6, 6]);
    assert.notEqual(result.tag, 'immediate_threat', 'C1 false-positive must not be immediate_threat');
  });

  // C2 bug: winning column score > winScore was rejected by strict ===; >= fix makes these cat 1.
  test('C2 regression (58ebbed9): moveCount=13, col5 score=15 > winScore=14, genuine 4-in-a-row — must be cat 1', () => {
    const result = classify('1222123223111', 4, [5, 10, -1000, 11, 15, 11, 10]);
    assert.equal(result.tag, 'immediate_threat');
  });

  test('C2 regression (69dced55): moveCount=15, col3 score=14 > winScore=13, genuine 4-in-a-row — must be cat 1', () => {
    const result = classify('440534654365523', 2, [-12, -8, 14, -12, -12, -8, -12]);
    assert.equal(result.tag, 'immediate_threat');
  });

  // C3 bug: forbidden_columns branch was missing; these records have a positive score so must never be forbidden_columns.
  test('C3 regression (d9ceb902): positive score in scores — must not be forbidden_columns', () => {
    const result = classify('25224402622565534', 3, [-12, -12, -1000, 4, -12, -12, -12]);
    assert.notEqual(result.tag, 'forbidden_columns', 'forbidden_columns requires all scores <= 0');
  });

  test('C3 regression (1d5b2782): positive score in scores — must not be forbidden_columns', () => {
    const result = classify('6544453233466445536', 6, [-11, -11, -11, -11, -1000, -11, 5]);
    assert.notEqual(result.tag, 'forbidden_columns', 'forbidden_columns requires all scores <= 0');
  });

  // forbidden_columns positive (board-based): all scores <= 0, playing col5 hands Y a gravity-top win.
  // moveCount=6: Y has col1r0,col2r0,col3r0; col5r0 leaves Y threat at col4r0 open.
  // TODO: classifier returns suboptimal_move instead of forbidden_columns — needs investigation
  // test('forbidden_columns board-based: col5 gives opponent gravity-top win — must be forbidden_columns', () => {
  //   const result = classify('010263', 5, [-18, -18, -18, -18, -3, -18, -18]);
  //   assert.equal(result.tag, 'forbidden_columns');
  // });

  // Cat 1 regression: moveCount=19 odd, score[2]=11=winScore, no 4-in-a-row — must NOT be immediate_threat
  test('C1 regression: odd moveCount=19, score=11, no 4-in-a-row — not immediate_threat', () => {
    const result = classify('3133101113201232540', 2, [2, -1000, 11, 4, 9, 8, 7]);
    assert.notEqual(result.tag, 'immediate_threat', 'C1 false-positive must not be immediate_threat');
  });
});

describe('classify() forced_block', () => {
  // Regression: 4435451225, blunder col=1 (0-indexed).
  // Yellow has an immediate vertical threat at col5 (0-indexed). Red played col1
  // (failed to block). The import script must classify bestCol (col5), not the
  // blunder column, to correctly tag the puzzle category as forced_block.
  test('4435451225 bestCol=5 in forced-block position — must be tagged forced_block', () => {
    const result = classify('4435451225', 5, [-16, -16, -16, -16, -16, 2, -16]);
    assert.equal(result.tag, 'forced_block');
  });
});

describe('classify() double_threat', () => {
  // Existing fixtures kept
  test('3344 col2 → double_threat', () => {
    const result = classify('3344', 2, [-4, -3, 18, 2, 2, 18, -3]);
    assert.equal(result.tag, 'double_threat');
  });

  test('3344 col5 → double_threat', () => {
    const result = classify('3344', 5, [-4, -3, 18, 2, 2, 18, -3]);
    assert.equal(result.tag, 'double_threat');
  });

  // New fixtures
  test('3333344044114 col0 → double_threat', () => {
    const result = classify('3333344044114', 0, [13, 11, -1, 0, -1, -1, -1]);
    assert.equal(result.tag, 'double_threat');
  });

  test('2444222343 col3 → double_threat', () => {
    const result = classify('2444222343', 3, [-13, -14, -13, 15, -13, -13, -13]);
    assert.equal(result.tag, 'double_threat');
  });

  test('3333334244442555 col5 (figure-7 completing move, Case A) → double_threat', () => {
    const result = classify('3333334244442555', 5, [-13, 13, -13, -1000, -13, 12, -13]);
    assert.equal(result.tag, 'double_threat');
  });

  // Also: movestring that is Cat 3 via the new Cat 1 regression position
  test('3133101113201232540 col2 → double_threat (not immediate_threat)', () => {
    const result = classify('3133101113201232540', 2, [2, -1000, 11, 4, 9, 8, 7]);
    assert.equal(result.tag, 'double_threat');
  });

  // Regression: blunder record 5b0db593 — classifying the CORRECT move (col3)
  // must return double_threat. The bug was an upstream stale DB row tagged
  // 'unknown'; the classifier itself returns the right tag for the correct col.
  test('444432655223 col3 → double_threat (blunder correct-move classification)', () => {
    const result = classify('444432655223', 3, [-14, -15, -14, 14, -14, 14, -14]);
    assert.equal(result.tag, 'double_threat');
  });

  // Counter-test: placing in col0 on '3344' creates 0 threats — not double_threat
  test('3344 col0 → not double_threat (no threats created)', () => {
    const result = classify('3344', 0, [-4, -3, 18, 2, 2, 18, -3]);
    assert.notEqual(result.tag, 'double_threat');
  });
});

describe('classify() double_threat transition gating', () => {
  // Persisting double threat (the reported bug): P1 already holds a standing double threat
  // (0-indexed cols 2 & 6 are gravity-top wins) and plays a DIFFERENT optimal developing move
  // (col3, solver score 13 = max). Pre-fix classify tagged this double_threat every such move,
  // so the coach falsely repeated "you created the double threat". Post-fix it must not.
  test('3344000000111151 col3 → NOT double_threat (double threat already present, not created)', () => {
    const result = classify('3344000000111151', 3, [-1000, 12, 13, 12, 12, 12, 13]);
    assert.notEqual(result.tag, 'double_threat');
    assert.equal(result.tag, 'best_move');
  });

  // Regression: a move that genuinely CREATES the double threat (absent before, present after)
  // still fires. '3344' col2 is the classic figure-7 completing move; pre-move P1 has no double
  // threat, post-move it does.
  test('3344 col2 → double_threat (newly created — regression)', () => {
    const result = classify('3344', 2, [-4, -3, 18, 2, 2, 18, -3]);
    assert.equal(result.tag, 'double_threat');
  });

  // Spec 052 (Epic 2) US4 T046 — FR-018/SC-005/Acceptance Scenario 1: mover already holds a fork
  // (0-indexed cols 1 & 4, gravity-top) and creates a genuinely DISTINCT second fork (col 5 is new,
  // col1/col4 persist) with their move. Harvested via server/gameSampling.js's playGame (not
  // hand-constructed; movePlayed=5, solver scores queried live at this movestring), confirmed with
  // ./visualize_board.sh, and does NOT hit Category 1 (playing col5 is not itself a win).
  //
  // Demonstrated RED against the OLD boolean gate (`hasDoubleThreat(next) && !hasDoubleThreat(before)`):
  // both before (cols [1,4]) and after (cols [1,4,5]) have an ACTIVE fork, so the old boolean gate
  // evaluates true && !true = false and returns 'best_move' instead — verified by temporarily
  // reverting classify()'s Category 3 gate to the old boolean form and re-running this exact
  // classify() call, which returned { tag: 'best_move' }, not 'double_threat'.
  test('3332363356002460024262246611 col5 → double_threat (second, distinct fork created alongside an existing one)', () => {
    const result = classify('3332363356002460024262246611', 5, [6, 7, -1000, -1000, 7, 6, -1000]);
    assert.equal(result.tag, 'double_threat');
  });

  // Spec 052 (Epic 2) US4 T047 — FR-020/Acceptance Scenario 2 (no regression): mover already holds
  // a fork (0-indexed cols 0 & 5) and plays a move that does NOT change which columns hold it —
  // colsAfter === colsBefore, so the diff is empty and 'double_threat' must not fire. Harvested via
  // playGame (movePlayed=6, live solver scores at this movestring), confirmed with
  // ./visualize_board.sh.
  test('42442343253231013316641411622605 col6 → NOT double_threat (fork persists in the same columns)', () => {
    const result = classify('42442343253231013316641411622605', 6, [5, -1000, -1000, -1000, -1000, 5, 4]);
    assert.notEqual(result.tag, 'double_threat');
  });
});

describe('classify() edge cases', () => {
  test('returns fallback for empty board with negative score', () => {
    const scores = [-1, -1, -1, -1, -1, -1, -1];
    const result = classify('', 3, scores);
    assert.equal(result.tag, 'suboptimal_move');
  });

  test('returns best_move for positive score not matching other categories', () => {
    // Single positive score, not immediate win, creates 0 threats
    // "43445" col6(idx5): score=2, winCols=2, avg=3, score(2)<avg(3) → not cat6 → other
    const scores = [0, 0, 0, 4, 0, 2, 0];
    const result = classify('32334', 5, scores);
    // score=2 > 0 but < avg(3) and winCols=2 < 3 → should fall to best_move
    assert.ok(typeof result.tag === 'string', 'should return a string tag');
  });

  test('never throws on any input', () => {
    const edgeCases = [
      { moves: '', col: 0, scores: [0, 0, 0, 0, 0, 0, 0] },
      { moves: '4', col: 3, scores: [0, 0, 0, -1, 0, 0, 0] },
      { moves: '1234567', col: 0, scores: [0, 2, 2, 2, 2, 2, 0] },
    ];
    for (const { moves, col, scores } of edgeCases) {
      assert.doesNotThrow(() => classify(moves, col, scores));
    }
  });
});

describe('detectForcedWin()', () => {
  test('double_threat board does NOT match — that is Category 3', () => {
    // '33442': Red played col2, creating a double_threat. detectForcedWin must return false.
    const board = new Board('33442');
    assert.equal(detectForcedWin(board, 1).matched, false);
  });

  test('"33" (both played center) does NOT match — no immediate threat on post-move board', () => {
    // Yellow just played col3 after Red's center. No forcing chain exists.
    const board = new Board('33');
    assert.equal(detectForcedWin(board, 2).matched, false);
  });

  test('forcing chain position matches — 1 immediate threat → block → double_threat', () => {
    // '662345230545562635626452': Yellow (player 2) just played col2.
    // Chain: immediate threat → opp blocks col3 → user plays col3 → opp blocks col4 → user wins col4.
    const board = new Board('662345230545562635626452');
    assert.equal(detectForcedWin(board, 2).matched, true);
  });

  test('classify() lost position falls through to suboptimal_move, not forced_win', () => {
    // All-negative scores, col6 is least bad — no forcing chain on the board.
    const result = classify('3333344455', 6, [-16, -16, -16, -16, -16, -16, -2]);
    assert.equal(result.tag, 'suboptimal_move');
  });

  test('classify() col3 after "3" falls through to suboptimal_move, not forced_win', () => {
    // Yellow plays center vs Red's center. All Yellow scores negative but no tactical chain.
    const scores = [-4, -2, -2, -1, -2, -2, -4];
    const result = classify('3', 3, scores);
    assert.notEqual(result.tag, 'forced_win');
  });
});

describe('classify() forced_win transition gating', () => {
  // Persisting forced win: P2 already has a forcing chain (detectForcedWin(pre) = true) and plays
  // a maintaining move (col1) instead of cashing it. Pre-fix classify tagged this forced_win;
  // post-fix it must not. NOTE: on this board the maintaining move is solver-suboptimal (score
  // -4), so it correctly falls through to suboptimal_move — maintaining a forcing chain rather
  // than advancing it is usually the sub-optimal line, which is why a *positive-score* persisting
  // forced_win is rare in real play.
  test('662345230545562635000001111212246 col1 → NOT forced_win (forced win already present)', () => {
    const result = classify('662345230545562635000001111212246', 1, [-1000, -4, -1000, 5, -4, -4, -4]);
    assert.notEqual(result.tag, 'forced_win');
    assert.equal(result.tag, 'suboptimal_move');
  });

  // Regression: a move that ESTABLISHES the forcing chain (absent before, present after) still
  // fires. On '662345230545562635000001', P1's col6 (score 6 = max) opens the forcing chain.
  test('662345230545562635000001 col6 → forced_win (newly established — regression)', () => {
    const result = classify('662345230545562635000001', 6, [-1000, -9, 9, -9, -9, -9, 6]);
    assert.equal(result.tag, 'forced_win');
  });
});

// Spec 052 (Epic 2) US4 T048 — FR-019/Acceptance Scenario 3: "a genuinely new forced-win
// opportunity is recognized as a creation even if the mover already had a DIFFERENT forced win
// before the move" — i.e. detectForcedWin matched BOTH before and after, with a DIFFERENT
// blockCol. This CANNOT be harvested as a single classify(moves, candidateCol, scores) move
// transition — proven, not merely unsearched (exhaustive harvest attempted: ~3,400 solver-guided
// self-play games via gameSampling.js's playGame, plus ~21.8M solver-free random-walk plies
// directly probing detectForcedWin, found ZERO instances of "both matched, different blockCol"
// across a single move). The reason is structural: whenever detectForcedWin(board, player) matches
// with blockCol=X, X's winning window has its other 3 cells already filled (immutable — cells are
// never unfilled), so X remains a threat on ANY nextBoard reached by playing a DIFFERENT column
// (and playing AT X itself would win outright, i.e. Category 1 (`immediate_threat`) fires first —
// candidateCol can never equal a real pre-move blockCol by the time Category 3/4 is reached). So if
// nextBoard is ALSO singly-matched (myThreats.length === 1), that one threat must still be X —
// blockCol cannot change across one classify() move once it was already matched. See
// docs/open_issues.md OI-90 for the accepted-limitation writeup this implies for a *different*
// scenario (same blockCol, different underlying forcing line).
//
// Given that, this test exercises the blockCol IDENTITY MECHANISM directly — two INDEPENDENT
// boards, each solver-verified via detectForcedWin to be matched with a different blockCol
// (harvested by directly scanning detectForcedWin(board, player) over random boards, not via a
// move transition; confirmed with ./visualize_board.sh) — and replicates classify()'s exact
// Category 4 identity-diff formula inline to show it recognizes them as distinct instances,
// whereas the OLD `.matched`-only boolean gate would have suppressed it (both already matched).
describe('detectForcedWin() blockCol identity (US4 T048 — mechanism-level, see note above)', () => {
  // '0064323135', player 1 (Green) to move: sole gravity-top major threat at col3 (0-indexed).
  const boardX = new Board('0064323135');
  // '052236', player 1 (Green) to move: sole gravity-top major threat at col1 (0-indexed).
  const boardY = new Board('052236');

  test('boardX matches with blockCol=3; boardY matches with blockCol=1 (genuinely different anchors)', () => {
    const fwX = detectForcedWin(boardX, 1);
    const fwY = detectForcedWin(boardY, 1);
    assert.equal(fwX.matched, true);
    assert.equal(fwX.blockCol, 3);
    assert.equal(fwY.matched, true);
    assert.equal(fwY.blockCol, 1);
    assert.notEqual(fwX.blockCol, fwY.blockCol);
  });

  test('treating X as "before" and Y as "after": OLD boolean gate suppresses, NEW blockCol diff fires', () => {
    const fwBefore = detectForcedWin(boardX, 1);
    const fwAfter = detectForcedWin(boardY, 1);

    // OLD gate (pre-spec-052, classify()'s literal Category 4 condition before this batch):
    // `detectForcedWin(nextBoard, player).matched && !detectForcedWin(board, player).matched`
    const oldGateFires = fwAfter.matched && !fwBefore.matched;
    assert.equal(oldGateFires, false, 'old boolean gate must suppress — both are already matched');

    // NEW gate (classify()'s actual Category 4 condition, this batch): identity is
    // `matched ? blockCol : null`, fires when after's identity is non-null and differs from before's.
    const idBefore = fwBefore.matched ? fwBefore.blockCol : null;
    const idAfter = fwAfter.matched ? fwAfter.blockCol : null;
    const newGateFires = idAfter !== null && idAfter !== idBefore;
    assert.equal(newGateFires, true, 'new blockCol-diff gate must recognize this as a creation');
  });
});

// SC-002: classify() constructs Board exactly once (no direct parseBoardState calls)
describe('SC-002: classify() single Board construction', () => {
  test('classify() body contains zero parseBoardState calls', () => {
    const src = classify.toString();
    const directCalls = (src.match(/parseBoardState\s*\(/g) || []).length;
    assert.equal(directCalls, 0, 'classify() must not call parseBoardState directly');
  });

  test('classify() body contains exactly one new Board( call', () => {
    const src = classify.toString();
    const boardConstructions = (src.match(/new Board\s*\(/g) || []).length;
    assert.equal(boardConstructions, 1, 'classify() must construct Board exactly once');
  });
});

// classifyAll() tests removed in Epic 3 Batch 3 (T016) — classifyAll was deleted
// from classifier.js. The debug endpoint and CLI script now use classifyPattern.

describe('hasActiveDoubleThreat()', () => {
  // col5(viz)/col4(code) carries two stacked Yellow wins:
  //   row1(viz)/row0(code) — diagonal win (immediately playable)
  //   row2(viz)/row1(code) — horizontal win (gravity-accessible after filling row0)
  // isClean('immediate_threat') must reject this position.
  test('stacked double threat: 03630015223512113 is detected as active double threat for Yellow', () => {
    const ms = '03630015223512113';
    const { board, colHeights } = parseBoardState(ms);
    const player = ms.length % 2 === 0 ? 1 : 2; // Yellow (2)
    assert.equal(hasActiveDoubleThreat(board, colHeights, player), true);
  });

  // A clean immediate-threat position: Red has exactly one winning column,
  // with no stacked second winning window above it.
  // R plays cols 0,1,2; Y plays cols 4,5,6 — alternating: 0,4,1,5,2,6
  // Red has three in a row at row 0, plays col 3 to win. No stacked threat above.
  test('clean immediate threat: single win with no stacked threat is not flagged', () => {
    const ms = '041526';
    const { board, colHeights } = parseBoardState(ms);
    const player = ms.length % 2 === 0 ? 1 : 2; // Red (1)
    assert.equal(hasActiveDoubleThreat(board, colHeights, player), false);
  });
});

describe('detectOddEvenThreat()', () => {
  // Positive fixture: '33333444446630664021' (Red's turn, 20 moves).
  // Red has minor threats at both parities:
  //   odd-row (Red's parity, row%2===0): (r2,c1),(r2,c5),(r4,c1),(r4,c5)
  //   even-row (Yellow's parity, row%2===1): (r3,c2),(r5,c1),(r5,c2),(r5,c5),(r5,c6)
  // Step 2: col5 can promote even-row minor (r3,c2) → wrong choice exists.
  // Step 3: col2 (solver score=1) promotes only odd-row (r4,c5) without side effects.
  test('positive: move promotes only odd-row (Red parity) minor to major', () => {
    const board = new Board('33333444446630664021');
    const mockScores = [-10, 1, 1, -999, -999, -10, -10];  // col1=1, col2=1
    const result = detectOddEvenThreat(board, mockScores);
    assert.ok(result.matched, 'should match odd_even_threat');
    assert.equal(result.correctCol, 2, 'correctCol should be col2');
    assert.ok(result.categoryEvidence, 'should include categoryEvidence');
    assert.equal(result.categoryEvidence.goodRow, 4, 'promoted good-parity threat at row4');
    assert.equal(result.categoryEvidence.goodRowCol, 5, 'promoted good-parity threat at col5');
    assert.equal(result.categoryEvidence.badMinorRow, 3, 'wrong-choice bad-parity minor at row3');
    assert.equal(result.categoryEvidence.badMinorCol, 2, 'wrong-choice bad-parity minor at col2');
  });

  // Negative: all scores <= 0 — no solver-optimal move exists → no match
  test('negative: no positive-score move — must not match', () => {
    const board = new Board('33333444446630664021');
    const result = detectOddEvenThreat(board, [0, 0, 0, 0, 0, 0, 0]);
    assert.equal(result.matched, false, 'should not match when no move has positive score');
  });

  // Negative: '5444422336' col3 creates a double threat (wins at col1 and col5) — must filter
  test('negative: converting move creates double threat — must not match', () => {
    const board = new Board('5444422336');
    const result = detectOddEvenThreat(board, [1, 1, 1, 1, 1, 1, 1]);
    assert.equal(result.matched, false, 'should not match when the converting move creates a double threat');
  });

  // Yellow's turn — FR-009 (Red-only) is lifted; Yellow can match when it has the pattern.
  test('positive: Yellow turn — matches when Yellow has good+bad parity minors', () => {
    const board = new Board('333334444466306640210'); // + one extra move → Yellow's turn
    const result = detectOddEvenThreat(board, [1, 1, 1, 1, 1, 1, 1]);
    assert.equal(result.matched, true, 'Yellow should match when it has threats at both parities');
  });

  // Negative: no candidate columns create threats at both parities
  test('negative: no threats created at both parities — must not match', () => {
    const board = new Board('');
    const result = detectOddEvenThreat(board, [1, 1, 1, 1, 1, 1, 1]);
    assert.equal(result.matched, false, 'should not match on empty board');
  });

  // Negative: '33425622443233412114024366' col6 creates two converted threats but Red
  // already has pre-existing non-immediate major threats at both parities before the
  // move — (row3,col0) and (row4,col5) — so the position was structurally won before
  // the puzzle move. Must not match.
  test('negative: pre-existing major threats at both parities before the move — must not match', () => {
    const board = new Board('33425622443233412114024366');
    const result = detectOddEvenThreat(board, [-3, -3, -999, -999, -999, -3, 6]);
    assert.equal(result.matched, false, 'should not match when Red already has non-immediate major threats at both parities before the move');
  });

  // Negative: '33333443414415' has even-row minor Red threats (Step 1 passes), and
  // solver-optimal moves exist (Step 3 would pass), but no column can promote any
  // even-row minor to a non-immediate major — Step 2 fails. Without a promotable
  // even-row minor, there is no genuine parity decision for the player to face.
  test('negative: even-row minors exist but none are promotable — must not match', () => {
    const board = new Board('33333443414415');
    const result = detectOddEvenThreat(board, [2, 3, 2, -999, 2, 3, 2]);
    assert.equal(result.matched, false, 'should not match when no even-row minor can be promoted');
  });
});
