// server/tests/reasonEvalPredicates.test.mjs
// Task B4: the reason-eval coverage selector (select_boards.mjs --strategy coverage) derives two
// opening-theory predicates from Task B2's `openingContext` evidence field. This is a direct,
// solver-free unit test of the derivation (`reasonEvalPredicates.mjs`'s `reasonPredicates`) — no need
// to run the CLI or the solver, since `openingContext` is a plain object on the vector.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reasonPredicates } from '../scripts/reasonEvalPredicates.mjs';

// Minimal vector shape: only the fields `reasonPredicates` reads. `boardState` must be 'opening' to
// be board-shape-consistent with a real openingContext (Task B2 only computes it for early boards),
// but the derivation itself does not gate on boardState — it is a direct read of `openingContext`.
function baseVector(openingContext) {
  return {
    case: 'win_to_lose',
    player: 1,
    boardState: 'opening',
    bestScore: 5,
    playedScore: -2,
    route: 'sign',
    openingContext,
  };
}

test('reasonPredicates fires reason_opening_named_line for a namedOpening vector', () => {
  const r = baseVector({
    namedOpening: { id: 'allen-candlesticks-opening', family: null, matchedPrefixLen: 6, bookNextCol: 1 },
  });
  const preds = reasonPredicates(r);
  assert.ok(preds.has('reason_opening_named_line'));
  assert.ok(!preds.has('reason_opening_centrality'));
});

test('reasonPredicates fires reason_opening_centrality for a centrality vector', () => {
  const r = baseVector({
    centrality: { bestCol: 3, playedCol: 1, betterHasMoreLines: true, text: 'col 3 is more central than col 1' },
  });
  const preds = reasonPredicates(r);
  assert.ok(preds.has('reason_opening_centrality'));
  assert.ok(!preds.has('reason_opening_named_line'));
});

test('reasonPredicates fires neither when openingContext is absent', () => {
  const r = baseVector(undefined);
  const preds = reasonPredicates(r);
  assert.ok(!preds.has('reason_opening_named_line'));
  assert.ok(!preds.has('reason_opening_centrality'));
});
