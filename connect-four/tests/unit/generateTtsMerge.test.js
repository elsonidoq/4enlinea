/**
 * mergeRegistry — the merge that makes `generate-tts.js --sync` safe to run.
 *
 * The bug this guards against: the old `--scan-only` rebuilt the registry from
 * the i18n tree, stamping every entry needs_audio/approved_at:null. That silently
 * discarded the record of a human having listened to 434 clips, and invited a
 * regenerate-all costing real money for byte-identical audio.
 *
 * Approval state is NOT derivable from the i18n tree, so merging must preserve it.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeRegistry } from '../../scripts/generate-tts.js';

const approved = (key, overrides = {}) => ({
  key,
  slug: key.replace(/[._]/g, '--'),
  status: 'approved',
  reason: null,
  generated_at: '2026-01-01T00:00:00.000Z',
  approved_at: '2026-01-02T00:00:00.000Z',
  ...overrides,
});

test('preserves every workflow field of a key that still exists', () => {
  const existing = [approved('coach.spoken.generic.optimal.0')];
  const scanned = [{ key: 'coach.spoken.generic.optimal.0', value: 'Nice move.' }];

  const r = mergeRegistry(existing, scanned);

  assert.equal(r.entries.length, 1);
  assert.deepEqual(r.entries[0], existing[0]);
  assert.equal(r.preserved, 1);
  assert.deepEqual(r.added, []);
  assert.deepEqual(r.removed, []);
});

test('adds a brand-new key as needs_audio', () => {
  const r = mergeRegistry([], [{ key: 'coach.spoken.home.welcome.0', value: 'Hello.' }]);

  assert.equal(r.entries.length, 1);
  assert.equal(r.entries[0].status, 'needs_audio');
  assert.equal(r.entries[0].slug, 'coach--spoken--home--welcome--0');
  assert.equal(r.entries[0].approved_at, null);
  assert.equal(r.added.length, 1);
});

test('adds a new interpolated key as ineligible', () => {
  const r = mergeRegistry([], [{ key: 'coach.spoken.queue.count', value: '{{count}} left' }]);

  assert.equal(r.entries[0].status, 'ineligible');
  assert.equal(r.entries[0].reason, 'interpolated');
});

test('an approved key that is still eligible is never reset to needs_audio', () => {
  // The exact regression: --scan-only did this to all 434 entries.
  const existing = Array.from({ length: 10 }, (_, i) => approved(`coach.spoken.generic.optimal.${i}`));
  const scanned = existing.map(e => ({ key: e.key, value: 'text' }));

  const r = mergeRegistry(existing, scanned);

  assert.equal(r.entries.filter(e => e.status === 'approved').length, 10);
  assert.equal(r.entries.filter(e => e.status === 'needs_audio').length, 0);
  assert.ok(r.entries.every(e => e.approved_at === '2026-01-02T00:00:00.000Z'));
});

test('an ineligible-but-intended key keeps its ineligible status', () => {
  // coach.spoken.forbidden_columns.suboptimal.0 is real: interpolated, yet played.
  const existing = [approved('coach.spoken.forbidden_columns.suboptimal.0', {
    status: 'ineligible', reason: 'interpolated', generated_at: null, approved_at: null,
  })];
  const scanned = [{ key: 'coach.spoken.forbidden_columns.suboptimal.0', value: 'Column {{col}} is forbidden.' }];

  const r = mergeRegistry(existing, scanned);

  assert.equal(r.entries[0].status, 'ineligible');
  assert.equal(r.preserved, 1);
  assert.deepEqual(r.becameEligible, []);
});

test('reports a key deleted from i18n instead of dropping it silently', () => {
  const existing = [approved('coach.spoken.gone.0'), approved('coach.spoken.stays.0')];
  const scanned = [{ key: 'coach.spoken.stays.0', value: 'text' }];

  const r = mergeRegistry(existing, scanned);

  assert.equal(r.removed.length, 1);
  assert.equal(r.removed[0].key, 'coach.spoken.gone.0');
  assert.equal(r.removed[0].approved_at, '2026-01-02T00:00:00.000Z', 'caller needs the lost state to warn about it');
  assert.ok(!r.entries.some(e => e.key === 'coach.spoken.gone.0'));
});

test('text gaining an interpolation discards the approval, and says so', () => {
  const existing = [approved('coach.spoken.summary.0')];
  const scanned = [{ key: 'coach.spoken.summary.0', value: 'You scored {{n}}.' }];

  const r = mergeRegistry(existing, scanned);

  assert.equal(r.entries[0].status, 'ineligible');
  assert.equal(r.entries[0].approved_at, null);
  assert.equal(r.becameIneligible.length, 1);
  assert.equal(r.becameIneligible[0].lostApprovedAt, '2026-01-02T00:00:00.000Z');
});

test('text losing its interpolation becomes needs_audio, losing nothing', () => {
  const existing = [approved('coach.spoken.summary.0', {
    status: 'ineligible', reason: 'interpolated', generated_at: null, approved_at: null,
  })];
  const scanned = [{ key: 'coach.spoken.summary.0', value: 'Good set.' }];

  const r = mergeRegistry(existing, scanned);

  assert.equal(r.entries[0].status, 'needs_audio');
  assert.equal(r.entries[0].reason, null);
  assert.equal(r.becameEligible.length, 1);
  assert.deepEqual(r.becameIneligible, []);
});

test('a drifted slug is repaired to keyToSlug(key)', () => {
  const existing = [approved('coach.spoken.generic.optimal.0', { slug: 'stale--slug' })];
  const scanned = [{ key: 'coach.spoken.generic.optimal.0', value: 'text' }];

  const r = mergeRegistry(existing, scanned);

  assert.equal(r.entries[0].slug, 'coach--spoken--generic--optimal--0');
  assert.equal(r.entries[0].status, 'approved', 'repairing the slug must not touch workflow state');
});

test('mutates neither argument', () => {
  const existing = [approved('coach.spoken.gone.0')];
  const scanned = [{ key: 'coach.spoken.new.0', value: 'text' }];
  const existingBefore = structuredClone(existing);
  const scannedBefore = structuredClone(scanned);

  mergeRegistry(existing, scanned);

  assert.deepEqual(existing, existingBefore);
  assert.deepEqual(scanned, scannedBefore);
});

test('entry order follows the i18n tree, not the old registry', () => {
  const existing = [approved('coach.spoken.b.0'), approved('coach.spoken.a.0')];
  const scanned = [
    { key: 'coach.spoken.a.0', value: 'a' },
    { key: 'coach.spoken.b.0', value: 'b' },
  ];

  const r = mergeRegistry(existing, scanned);

  assert.deepEqual(r.entries.map(e => e.key), ['coach.spoken.a.0', 'coach.spoken.b.0']);
});

test('reports a reorder, so a pure-reorder rewrite is never announced as "no changes"', () => {
  // Real case: --key appends to the end, so onboardingMission.greeting sat last
  // in the registry while sitting second in en.json.
  const existing = [approved('coach.spoken.b.0'), approved('coach.spoken.a.0')];
  const scanned = [
    { key: 'coach.spoken.a.0', value: 'a' },
    { key: 'coach.spoken.b.0', value: 'b' },
  ];

  assert.equal(mergeRegistry(existing, scanned).reordered, true);
});

test('does not claim a reorder when order already matches', () => {
  const existing = [approved('coach.spoken.a.0'), approved('coach.spoken.b.0')];
  const scanned = [
    { key: 'coach.spoken.a.0', value: 'a' },
    { key: 'coach.spoken.b.0', value: 'b' },
  ];

  assert.equal(mergeRegistry(existing, scanned).reordered, false);
});

test('appending a new key at the end is not a reorder of the existing ones', () => {
  const existing = [approved('coach.spoken.a.0')];
  const scanned = [
    { key: 'coach.spoken.a.0', value: 'a' },
    { key: 'coach.spoken.b.0', value: 'b' },
  ];

  const r = mergeRegistry(existing, scanned);

  assert.equal(r.reordered, false, 'only surviving entries count toward reordering');
  assert.equal(r.added.length, 1);
});
