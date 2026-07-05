import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reasonPredicates } from './reasonEvalPredicates.mjs';

const base = { case: 'lose_to_faster_lose', player: 2, boardState: 'opening',
  bestScore: -1, playedScore: -3, route: 'sign', lostResource: null, opponentPunishment: null, gate: {} };

test('reason_opening_defense derived from openingContext.defense', () => {
  const preds = reasonPredicates({ ...base, openingContext: { defense: { id: null, family: 'central-column opening', matchedPrefixLen: 3, bestDefenseCol: 3, centralityGrounded: true } } });
  assert.ok(preds.has('reason_opening_defense'));
  assert.ok(!preds.has('reason_opening_named_line'));
  assert.ok(!preds.has('reason_opening_centrality'));
});

test('reason_opening_named_line derived from openingContext.namedOpening', () => {
  const preds = reasonPredicates({ ...base, player: 1, case: 'win_to_lose', bestScore: 2, playedScore: -1, openingContext: { namedOpening: { id: 'allen-5-4-opening', family: 'central-column opening', matchedPrefixLen: 7, bookNextCol: 4 } } });
  assert.ok(preds.has('reason_opening_named_line'));
  assert.ok(!preds.has('reason_opening_defense'));
});

test('reason_opening_centrality derived from openingContext.centrality', () => {
  const preds = reasonPredicates({ ...base, openingContext: { centrality: { bestCol: 3, playedCol: 4, betterHasMoreLines: true, text: 'x', resistAndWait: true } } });
  assert.ok(preds.has('reason_opening_centrality'));
  assert.ok(!preds.has('reason_opening_defense'));
});

test('no opening predicate when openingContext absent', () => {
  const preds = reasonPredicates({ ...base, openingContext: undefined });
  for (const p of ['reason_opening_defense', 'reason_opening_named_line', 'reason_opening_centrality']) assert.ok(!preds.has(p));
});
