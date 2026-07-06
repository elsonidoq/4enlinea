import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leafPaths, dispositionOf, assertCoverage, UncoveredVectorFieldError } from '../scripts/fieldDisposition.mjs';
import { CAUSAL_LINKS } from '../scripts/reason_engine/causalLinks.mjs';

test('leafPaths collapses arrays to element shape', () => {
  const paths = leafPaths({ a: 1, b: [{ c: 2 }], d: { e: 3 } });
  assert.deepEqual(new Set(paths), new Set(['a', 'b[].c', 'd.e']));
});

test('dispositionOf classifies representative paths', () => {
  assert.equal(dispositionOf('movestring'), 'transformed');
  assert.equal(dispositionOf('lostResource.finalMovestring'), 'transformed');
  assert.equal(dispositionOf('lostResource.line[].cell'), 'transformed');
  assert.equal(dispositionOf('notABlunder'), 'exclude');
  assert.equal(dispositionOf('gate.nodesVisited'), 'exclude');
  assert.equal(dispositionOf('lostResource.exhaustive'), 'exclude');
  assert.equal(dispositionOf('route'), 'causal-code');
  assert.equal(dispositionOf('opponentPunishment.tie.kind'), 'causal-code');
  assert.equal(dispositionOf('lostResource.completingCell'), 'render');
  assert.equal(dispositionOf('opponentPunishment.tie.sharedCells[]'), 'render');
  assert.equal(dispositionOf('replyHistogram.afterBest'), 'render');
});

test('unknown path has null disposition', () => {
  assert.equal(dispositionOf('opponentPunishment.brandNewField'), null);
});

test('assertCoverage passes on a fully-registered object', () => {
  const fv = { case: 'win_to_lose', bestCol: 1, playedCol: 2, movestring: '33',
               lostResource: { kind: 'winning_line', completingCell: 'c4r3' },
               opponentPunishment: { kind: 'denial', tie: { kind: 'tied', sharedCells: ['c4r3'] } },
               replyHistogram: { afterBest: 0, afterPlayed: 2 } };
  assert.doesNotThrow(() => assertCoverage(fv, []));
});

test('assertCoverage throws on an unregistered field', () => {
  const fv = { case: 'win_to_lose', opponentPunishment: { brandNewField: 7 } };
  assert.throws(() => assertCoverage(fv, []), UncoveredVectorFieldError);
});

test('gate.verdict is render, not causal-code (RENDER_PATHS override is live)', () => {
  assert.equal(dispositionOf('gate.verdict'), 'render');
});

test('every catalog covers entry resolves to a causal-code field', () => {
  for (const link of CAUSAL_LINKS) {
    for (const c of link.covers) {
      assert.equal(dispositionOf(c), 'causal-code',
        `${link.id} covers "${c}" has disposition ${dispositionOf(c)} (must be causal-code)`);
    }
  }
});

test('assertCoverage throws when a fired frame covers a non-code field', () => {
  const fv = { route: 'sign', lostResource: { completingCell: 'c4r3' } };
  // completingCell is a render field, not a code — a frame must never cover it.
  assert.throws(() => assertCoverage(fv, ['lostResource.completingCell']), /not a causal-code/);
});

test('assertCoverage passes when covers name only present-or-absent codes', () => {
  const fv = { route: 'sign', lostResource: { kind: 'winning_line' } };
  // 'opponentPunishment.terminal' is a code that is absent here — allowed (superset covers).
  assert.doesNotThrow(() => assertCoverage(fv, ['route', 'lostResource.kind', 'opponentPunishment.terminal']));
});

test('openingContext leaves are all registered (no tripwire)', () => {
  const centrality = { openingContext: { centrality: { bestCol: 3, playedCol: 1, betterHasMoreLines: true, text: 'x', resistAndWait: true } } };
  const defense = { openingContext: { defense: { family: 'central-column opening', matchedPrefixLen: 5, bestDefenseCol: 2, centralityGrounded: true } } };
  const named = { openingContext: { namedOpening: { id: 'allen-3-4-opening', family: 'central-column opening', matchedPrefixLen: 8, bookNextCol: 6 } } };
  for (const fv of [centrality, defense, named]) assert.doesNotThrow(() => assertCoverage(fv, []));
});

test('openingContext dispositions are classified correctly', () => {
  assert.equal(dispositionOf('openingContext.centrality.bestCol'), 'transformed');
  assert.equal(dispositionOf('openingContext.centrality.text'), 'transformed');
  assert.equal(dispositionOf('openingContext.namedOpening.bookNextCol'), 'transformed');
  assert.equal(dispositionOf('openingContext.defense.bestDefenseCol'), 'transformed');
  assert.equal(dispositionOf('openingContext.defense.centralityGrounded'), 'render');
  assert.equal(dispositionOf('openingContext.namedOpening.id'), 'render');
  assert.equal(dispositionOf('openingContext.namedOpening.family'), 'render');
  assert.equal(dispositionOf('openingContext.namedOpening.matchedPrefixLen'), 'render');
  assert.equal(dispositionOf('openingContext.centrality.betterHasMoreLines'), 'render');
  assert.equal(dispositionOf('openingContext.centrality.resistAndWait'), 'render');
});
