import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REASON_TEMPLATES, POSITIVE_TEMPLATES } from '../../server/blunderReasons.js';

// Expected entries for REASON_TEMPLATES (23 entries)
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
  'odd_even_threat:missed_own',
  'odd_even_threat:enabled_opponent',
  'claimeven:missed_own',
  'claimeven:enabled_opponent',
  'claimodd:missed_own',
  'claimodd:enabled_opponent',
  'drawing_move:missed_own',
  'suboptimal_move:missed_own',
];

// Expected entries for POSITIVE_TEMPLATES (12 entries)
const EXPECTED_POSITIVE_KEYS = [
  'immediate_threat',
  'forced_win',
  'double_threat',
  'undercut',
  'overcut',
  'figure_7',
  'j_shape',
  'z_threat',
  'odd_even_threat',
  'claimeven',
  'claimodd',
  'drawing_move',
];

test('REASON_TEMPLATES has exactly 23 entries', () => {
  assert.equal(REASON_TEMPLATES.size, 23);
});

test('REASON_TEMPLATES — all 23 keys map to non-empty strings', () => {
  for (const key of EXPECTED_REASON_KEYS) {
    const value = REASON_TEMPLATES.get(key);
    assert.ok(value !== undefined, `Missing key: ${key}`);
    assert.ok(typeof value === 'string' && value.length > 0, `Empty value for key: ${key}`);
  }
});

test('REASON_TEMPLATES — all expected values match exactly', () => {
  const expected = new Map([
    ['immediate_threat:missed_own',       "You had a winning move right there and didn't take it."],
    ['immediate_threat:enabled_opponent', "That move handed your opponent an immediate win."],
    ['forced_block:defensive_miss',       "Your opponent was about to win. You had to block and didn't."],
    ['forced_win:missed_own',             "You had a forced win and let it slip."],
    ['forced_win:enabled_opponent',       "Your move handed your opponent a forced win."],
    ['double_threat:missed_own',          "You could have built a double threat — two winning columns at once — and missed it."],
    ['double_threat:enabled_opponent',    "Your move let your opponent set up two winning threats at once."],
    ['undercut:enabled_opponent',         "Your move let your opponent undercut your threat — their lower disc now kills your win."],
    ['overcut:missed_own',                "You had an overcut — a column where your lower disc neutralizes their upper threat — and didn't play it."],
    ['figure_7:missed_own',               "You had a Figure-7 fork structure and didn't complete it."],
    ['figure_7:enabled_opponent',         "You let your opponent build a Figure-7 fork you can't answer."],
    ['j_shape:missed_own',                "You had a J-shape trap available and didn't use it."],
    ['j_shape:enabled_opponent',          "You let your opponent build a J-shape trap."],
    ['z_threat:missed_own',               "You had the parity advantage — an odd vertical capsule — and abandoned it."],
    ['z_threat:enabled_opponent',         "Your move handed your opponent the parity advantage."],
    ['odd_even_threat:missed_own',        "You had threats on both row parities — a fork neither player can fully answer — and let it go."],
    ['odd_even_threat:enabled_opponent',  "Your move gave Red threats on both row parities."],
    ['claimeven:missed_own',              "You had a claimeven endgame — the pairing was yours — and threw it away."],
    ['claimeven:enabled_opponent',        "You gave Yellow a claimeven endgame — they now control the pairing."],
    ['claimodd:missed_own',               "You had the claimodd control — all even columns, center command — and lost it."],
    ['claimodd:enabled_opponent',         "Your move gave Red the claimodd endgame control."],
    ['drawing_move:missed_own',           "You had a forced win available with best play — the position was winning — but this move settled for a draw."],
    ['suboptimal_move:missed_own',        "There was a stronger move — this one gives ground."],
  ]);
  for (const [key, value] of expected) {
    assert.equal(REASON_TEMPLATES.get(key), value, `Mismatch for key: ${key}`);
  }
});

test('REASON_TEMPLATES spot-check: drawing_move:missed_own', () => {
  assert.equal(
    REASON_TEMPLATES.get('drawing_move:missed_own'),
    "You had a forced win available with best play — the position was winning — but this move settled for a draw."
  );
});

test('POSITIVE_TEMPLATES has exactly 12 entries', () => {
  assert.equal(POSITIVE_TEMPLATES.size, 12);
});

test('POSITIVE_TEMPLATES — all 12 keys map to non-empty strings', () => {
  for (const key of EXPECTED_POSITIVE_KEYS) {
    const value = POSITIVE_TEMPLATES.get(key);
    assert.ok(value !== undefined, `Missing key: ${key}`);
    assert.ok(typeof value === 'string' && value.length > 0, `Empty value for key: ${key}`);
  }
});

test('POSITIVE_TEMPLATES — all expected values match exactly', () => {
  const expected = new Map([
    ['immediate_threat', "You spotted the immediate win and took it — the clearest winning move available."],
    ['forced_win',       "This move locks in a forced win — your opponent has no escape."],
    ['double_threat',    "You built two threats at once, giving your opponent an impossible choice."],
    ['undercut',         "Well played — you placed below their threat, neutralizing it while building your own."],
    ['overcut',          "You used the overcut — your lower disc sidesteps their upper threat entirely."],
    ['figure_7',         "You completed a Figure-7 fork — your opponent can't answer both wings."],
    ['j_shape',          "You set the J-shape trap — a threat structure your opponent can't unravel."],
    ['z_threat',         "You secured the parity advantage — an odd vertical capsule that forces the endgame."],
    ['odd_even_threat',  "You built threats on both row parities, creating a fork the opponent can't fully answer."],
    ['claimeven',        "You locked in the claimeven endgame — the pairing of empty cells is now yours."],
    ['claimodd',         "You claimed the claimodd endgame control — center column, even parity, commanding position."],
    ['drawing_move',     "You found the drawing resource — the only move that prevents a loss."],
  ]);
  for (const [key, value] of expected) {
    assert.equal(POSITIVE_TEMPLATES.get(key), value, `Mismatch for key: ${key}`);
  }
});
