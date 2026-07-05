// openingContext.test.mjs — solver-backed, end-to-end through the PRODUCTION computeReason.
//
// Validates the `openingContext` evidence field and its four namedOpening guards against the
// FULL case-space (I12): one deliberate counterexample per branch. EVERY board below is a
// genuine player-1 blunder (or, for the losing-side branch, a genuine player-2 blunder), verified
// with ./visualize_board.sh + TOOLS/optimal_line.mjs before shipping — see task-B2-report.md for
// the per-board solver evidence (scores, winner, case).
import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { createSolverProcess } from '../../c4solver-wrapper.js';
import { computeReason } from './reasonEngine.mjs';

let solver;
before(async () => { solver = await createSolverProcess(); });
after(() => { if (solver) solver.destroy(); });

// ── namedOpening branch: shared central prefix -> family, id null ──
// VERIFIED: '3333' player 1 to move; col 3 = +1 (unique win), col 0 = -2 (loss) -> playing col 0
// is a win_to_lose blunder, bestCol = 3. '3333' is a shared 4-ply prefix of 5-4 AND candlesticks
// (both central-column), so ids = 2 -> id null, family 'central-column opening', bookNextCol 3 = best.
test('shared-prefix: namedOpening fires with family + id:null', async () => {
  const v = await computeReason('3333', /*playedCol*/ 0, { solver });
  const named = v.openingContext?.namedOpening;
  assert.ok(named, 'expected namedOpening');
  assert.ok(!v.openingContext.centrality, 'namedOpening and centrality are mutually exclusive');
  assert.equal(named.id, null, 'shared prefix across ids -> id null');
  assert.equal(named.family, 'central-column opening');
  assert.equal(named.matchedPrefixLen, 4);
  assert.equal(named.bookNextCol, v.bestCol);
  assert.equal(named.bookNextCol, 3);
});

// ── namedOpening branch: unique prefix (direct orientation) -> specific id ──
// VERIFIED: '333331' player 1; col 1 = +1 (unique best), col 0 = -2 (loss) -> win_to_lose blunder.
// '333331' matches ONLY allen-candlesticks-opening; bookNextCol 1 = best.
test('unique-prefix (direct): namedOpening fires with a specific id', async () => {
  const v = await computeReason('333331', 0, { solver });
  const named = v.openingContext?.namedOpening;
  assert.ok(named, 'expected namedOpening');
  assert.equal(named.id, 'allen-candlesticks-opening');
  assert.equal(named.family, 'central-column opening');
  assert.equal(named.bookNextCol, v.bestCol);
  assert.equal(named.bookNextCol, 1);
});

// ── namedOpening branch: mirror-reflected prefix -> still matches (specific id) ──
// VERIFIED: '333335' (column-reflection of '333331', 1<->5) player 1; col 5 = +1 (unique best),
// col 0 = -3 (loss) -> win_to_lose blunder. Matches candlesticks via reflection; bookNextCol 5 = best.
test('mirror-reflected: namedOpening still fires', async () => {
  const v = await computeReason('333335', 0, { solver });
  const named = v.openingContext?.namedOpening;
  assert.ok(named, 'expected namedOpening on the reflected line');
  assert.equal(named.id, 'allen-candlesticks-opening');
  assert.equal(named.bookNextCol, v.bestCol);
  assert.equal(named.bookNextCol, 5);
});

// ── losing-side branch (guard 2): player-2 history on a first-player-win line -> NO namedOpening ──
// VERIFIED: '3332223' — 7 discs, PLAYER 2 to move; optimal_line: first player (Green) wins, so
// player 2 is the loser/non-beneficiary. col 0 = -7 vs best -3 -> genuine lose_to_faster_lose
// blunder (computeReason: notABlunder=false). match is non-null (d3-d4) but beneficiary is P1, so
// guard 2 fails; ply 7 > 6 so centrality also abstains -> openingContext absent.
test('losing-side: no namedOpening when the mover is not the beneficiary', async () => {
  const v = await computeReason('3332223', 0, { solver });
  assert.equal(v.notABlunder, false, 'must be a genuine blunder');
  assert.ok(!v.openingContext?.namedOpening, 'player-2 mover on a P1 line -> no namedOpening');
});

// ── book-move-not-best branch (guard 3): book next move is not the solver best -> NO namedOpening ──
// VERIFIED: '32' player 1; the gambit's book next col is 6 (score +1) but the UNIQUE solver best is
// col 5 (score +2). col 0 = -3 -> win_to_lose blunder. Guard 3 (bookNextCol score === max) fails,
// so no false "best" claim; centrality is the honest opening fallback.
test('book-move-not-best: no namedOpening when the book move is not solver-best', async () => {
  const v = await computeReason('32', 0, { solver });
  assert.equal(v.notABlunder, false, 'must be a genuine blunder');
  assert.ok(!v.openingContext?.namedOpening, 'book move not best -> no namedOpening');
});

// ── off-book centrality branch ──
// VERIFIED: '30' player 1 is off-book (matchOpeningPrefix null). col 3 = +4 (best), col 1 = -2 (loss)
// -> win_to_lose blunder. Opening phase (2 plies), better move strictly more central -> centrality.
test('off-book opening blunder uses centrality, not namedOpening', async () => {
  const v = await computeReason('30', 1, { solver });
  assert.equal(v.notABlunder, false, 'must be a genuine blunder');
  assert.ok(v.openingContext, 'expected an openingContext');
  assert.ok(!v.openingContext.namedOpening, 'off-book -> no namedOpening');
  assert.ok(v.openingContext.centrality, 'expected centrality fallback');
  assert.equal(v.openingContext.centrality.bestCol, v.bestCol);
  assert.equal(v.openingContext.centrality.playedCol, 1);
  assert.equal(v.openingContext.centrality.betterHasMoreLines, true);
  assert.ok(typeof v.openingContext.centrality.text === 'string' && v.openingContext.centrality.text.length > 0);
});

// Mutual exclusivity holds across every branch that produces an openingContext.
test('namedOpening and centrality are never both present', async () => {
  for (const [ms, played] of [['3333', 0], ['333331', 0], ['333335', 0], ['32', 0], ['30', 1]]) {
    const v = await computeReason(ms, played, { solver });
    if (v.openingContext) {
      assert.ok(!(v.openingContext.namedOpening && v.openingContext.centrality),
        `both present on "${ms}"`);
    }
  }
});
