// OI-174 — the post-game coach summary praised a 17%-accuracy, 3-blunder game with
// "You played well. Let's find the edge."
//
// The selection was ALREADY keyed off the counts (blunderCount/suboptimalCount) at both
// producers; the defect is that `coach.spoken.sparring.review.mistakes` is a single binary
// bucket with no accuracy band, so a 17%/3-blunder game and a 95%/1-suboptimal game draw
// from the same four strings.
//
// TWO producers must agree: server/index.js's solver-driven POST /api/games/analyze path
// and server/reconstructAnalysisFromBlunders.js's cached path. index.js calls app.listen()
// at module scope so it cannot be imported (testing-conventions.md, "Testing index.js's
// inline routes and its limit") — so the rule is extracted into
// server/selectReviewSummaryPool.js, which BOTH import, and the last test here is a
// source-level drift guard proving index.js actually calls the shared rule rather than
// keeping its own copy.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import en from '../../src/i18n/en.json' with { type: 'json' };
import es from '../../src/i18n/es.json' with { type: 'json' };
import { selectReviewSummaryPool } from '../../server/selectReviewSummaryPool.js';
import { reconstructAnalysisFromBlunders } from '../../server/reconstructAnalysisFromBlunders.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('a clean game (no blunders, no suboptimals) still selects the clean pool', () => {
  assert.equal(
    selectReviewSummaryPool({ blunderCount: 0, suboptimalCount: 0, accuracy: 100 }),
    'coach.spoken.sparring.review.clean',
  );
});

test('FR-006 preserved: 0 blunders + >=1 suboptimal is never "clean"', () => {
  const pool = selectReviewSummaryPool({ blunderCount: 0, suboptimalCount: 1, accuracy: 92 });
  assert.notEqual(pool, 'coach.spoken.sparring.review.clean');
});

test('the OI-174 game (17% accuracy, 3 blunders) does NOT draw from the same pool as a 92% game', () => {
  const rough = selectReviewSummaryPool({ blunderCount: 3, suboptimalCount: 2, accuracy: 17 });
  const strong = selectReviewSummaryPool({ blunderCount: 0, suboptimalCount: 1, accuracy: 92 });
  assert.notEqual(rough, strong);
});

test('no band ever resolves to a pool containing the praise line "You played well."', () => {
  // The concrete regression: the 17%/3-blunder game must not be able to say this.
  const pool = selectReviewSummaryPool({ blunderCount: 3, suboptimalCount: 2, accuracy: 17 });
  const node = pool.split('.').reduce((o, p) => (o == null ? o : o[p]), en);
  assert.ok(node, `pool ${pool} missing from en.json`);
  const texts = Object.values(node);
  assert.equal(
    texts.some(s => /you played well/i.test(s)), false,
    `a 17%-accuracy 3-blunder game can still say: ${JSON.stringify(texts)}`,
  );
});

test('every band pool exists in BOTH en.json and es.json with at least two phrasings', () => {
  const bands = [
    selectReviewSummaryPool({ blunderCount: 0, suboptimalCount: 0, accuracy: 100 }),
    selectReviewSummaryPool({ blunderCount: 0, suboptimalCount: 1, accuracy: 92 }),
    selectReviewSummaryPool({ blunderCount: 1, suboptimalCount: 2, accuracy: 60 }),
    selectReviewSummaryPool({ blunderCount: 3, suboptimalCount: 2, accuracy: 17 }),
  ];
  assert.equal(new Set(bands).size, 4, `expected 4 distinct pools, got ${JSON.stringify(bands)}`);
  for (const [name, tree] of [['en', en], ['es', es]]) {
    for (const pool of bands) {
      const node = pool.split('.').reduce((o, p) => (o == null ? o : o[p]), tree);
      assert.ok(node && typeof node === 'object', `${name}.json missing pool ${pool}`);
      assert.ok(Object.keys(node).length >= 2, `${name}.json pool ${pool} needs >=2 phrasings`);
      for (const v of Object.values(node)) assert.equal(typeof v, 'string');
    }
  }
});

test('the CACHED producer bands a 17%-accuracy 3-blunder game away from the praise pool', () => {
  // 12 plies, user moved first -> user plies at even indices 0,2,4,6,8,10 = 6 scored moves.
  // 3 blunders + 2 suboptimal + 1 optimal -> accuracy = 1/6 = 17%.
  const existingBlunders = [
    { move_index: 0, move_played: 3, quality: 'blunder', pattern_category: null, reason: null, direction: null, blunder_severity: 2 },
    { move_index: 2, move_played: 3, quality: 'blunder', pattern_category: null, reason: null, direction: null, blunder_severity: 2 },
    { move_index: 4, move_played: 3, quality: 'blunder', pattern_category: null, reason: null, direction: null, blunder_severity: 2 },
    { move_index: 6, move_played: 3, quality: 'suboptimal', pattern_category: null, reason: null, direction: null, blunder_severity: 1 },
    { move_index: 8, move_played: 3, quality: 'suboptimal', pattern_category: null, reason: null, direction: null, blunder_severity: 1 },
  ];
  const out = reconstructAnalysisFromBlunders({
    existingBlunders,
    moves: '444444444444',
    side: 'first',
    difficulty: 'medium',
    created_at: '2026-09-09T00:00:00Z',
    isPapergames: false,
  });
  assert.equal(out.accuracy, 17);
  assert.equal(out.blunderCount, 3);
  const text = out.summaryPhraseKey.split('.').reduce((o, p) => (o == null ? o : o[p]), en);
  assert.equal(typeof text, 'string', `summaryPhraseKey ${out.summaryPhraseKey} has no en.json string`);
  assert.equal(/you played well/i.test(text), false, `cached path said: ${text}`);
  assert.equal(
    out.summaryPhraseKey,
    `${selectReviewSummaryPool({ blunderCount: 3, suboptimalCount: 2, accuracy: 17 })}.${out.summaryPhraseKey.split('.').pop()}`,
  );
});

test('the SOLVER producer (server/index.js) uses the shared rule, not its own copy', () => {
  // Drift guard: index.js cannot be imported (app.listen at module scope), so assert at the
  // source layer that the inline binary ternary is gone and the shared rule is imported.
  const src = fs.readFileSync(path.join(ROOT, 'server/index.js'), 'utf8');
  assert.match(src, /selectReviewSummaryPool/, 'server/index.js does not use the shared band rule');
  assert.equal(
    /\?\s*'coach\.spoken\.sparring\.review\.clean'/.test(src), false,
    'server/index.js still has its own inline clean/mistakes ternary — the two producers will drift',
  );
});
