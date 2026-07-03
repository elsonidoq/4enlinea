import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leafPaths, dispositionOf, assertCoverage, UncoveredVectorFieldError } from '../scripts/fieldDisposition.mjs';

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
