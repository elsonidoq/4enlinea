import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REASON_TEMPLATES, POSITIVE_TEMPLATES } from '../../server/blunderReasons.js';

// Expected entries for REASON_TEMPLATES (25 entries). odd_even_threat:* removed
// 2026-06-25; replaced by the parity-aware threat tags.
const EXPECTED_REASON_KEYS = [
  'immediate_threat:missed_own',
  'immediate_threat:enabled_opponent',
  'forced_block:defensive_miss',
  'forced_win:missed_own',
  'forced_win:enabled_opponent',
  'double_threat:missed_own',
  'double_threat:enabled_opponent',
  'undercut:enabled_opponent',
  'overcut:missed_own',
  'figure_7:missed_own',
  'figure_7:enabled_opponent',
  'j_shape:missed_own',
  'j_shape:enabled_opponent',
  'z_threat:missed_own',
  'z_threat:enabled_opponent',
  'major_threat_parity:missed_own',
  'major_threat_parity:enabled_opponent',
  'major_threat_nonparity:missed_own',
  'major_threat_nonparity:enabled_opponent',
  'minor_threat:missed_own',
  'minor_threat:enabled_opponent',
  'claimeven:missed_own',
  'claimeven:enabled_opponent',
  'drawing_move:missed_own',
  'suboptimal_move:missed_own',
];

// Expected entries for POSITIVE_TEMPLATES (13 entries).
const EXPECTED_POSITIVE_KEYS = [
  'immediate_threat',
  'forced_win',
  'double_threat',
  'undercut',
  'overcut',
  'figure_7',
  'j_shape',
  'z_threat',
  'major_threat_parity',
  'major_threat_nonparity',
  'minor_threat',
  'claimeven',
  'drawing_move',
];

test('REASON_TEMPLATES has exactly 25 entries', () => {
  assert.equal(REASON_TEMPLATES.size, 25);
});

test('REASON_TEMPLATES — all keys map to non-empty strings', () => {
  for (const key of EXPECTED_REASON_KEYS) {
    const value = REASON_TEMPLATES.get(key);
    assert.ok(value !== undefined, `Missing key: ${key}`);
    assert.ok(typeof value === 'string' && value.length > 0, `Empty value for key: ${key}`);
  }
});

test('REASON_TEMPLATES — parity-aware threat tags present, odd_even_threat absent', () => {
  for (const tag of ['major_threat_parity', 'major_threat_nonparity', 'minor_threat']) {
    assert.ok(REASON_TEMPLATES.has(`${tag}:missed_own`), `missing ${tag}:missed_own`);
    assert.ok(REASON_TEMPLATES.has(`${tag}:enabled_opponent`), `missing ${tag}:enabled_opponent`);
  }
  assert.ok(!REASON_TEMPLATES.has('odd_even_threat:missed_own'), 'odd_even_threat de-listed');
  assert.ok(!REASON_TEMPLATES.has('odd_even_threat:enabled_opponent'), 'odd_even_threat de-listed');
});

test('REASON_TEMPLATES spot-check: drawing_move:missed_own', () => {
  assert.equal(
    REASON_TEMPLATES.get('drawing_move:missed_own'),
    "You had a move that would have held at least a draw, and this move gave that balance up."
  );
});

test('POSITIVE_TEMPLATES has exactly 13 entries', () => {
  assert.equal(POSITIVE_TEMPLATES.size, 13);
});

test('POSITIVE_TEMPLATES — all keys map to non-empty strings', () => {
  for (const key of EXPECTED_POSITIVE_KEYS) {
    const value = POSITIVE_TEMPLATES.get(key);
    assert.ok(value !== undefined, `Missing key: ${key}`);
    assert.ok(typeof value === 'string' && value.length > 0, `Empty value for key: ${key}`);
  }
});

test('POSITIVE_TEMPLATES — parity-aware threat tags present, odd_even_threat absent', () => {
  for (const tag of ['major_threat_parity', 'major_threat_nonparity', 'minor_threat']) {
    assert.ok(POSITIVE_TEMPLATES.has(tag), `missing positive template ${tag}`);
  }
  assert.ok(!POSITIVE_TEMPLATES.has('odd_even_threat'), 'odd_even_threat de-listed');
});
