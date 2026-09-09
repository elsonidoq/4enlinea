// OI-163 — POST /api/games's two movestring validators contradict each other, one line apart:
//   index.js  `if (!moves || !difficulty || !side || !result)`   → rejects moves === ''
//   index.js  `if (typeof moves !== 'string' || !/^[0-6]{0,42}$/.test(moves))` → {0,42} ACCEPTS ''
// The regex is the correct one: '' is a well-formed movestring (validateMoves('') === null, and
// POST /api/scores, POST /api/evaluate-move and every other movestring consumer accept it). The
// truthiness guard is the bug — it rejects a legal value before the format check ever runs.
//
// Why source-parse: server/index.js boots the full production server at import time and exports
// no `app`, so the handler cannot be mounted (same limitation documented in
// tests/unit/scoresValidation.test.js). This test does NOT merely string-match: it lifts the
// required-fields condition out of the shipped source and EVALUATES it, so what is asserted is
// the real expression the server runs, not a copy of it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validateMoves } from '../../server/validateMoves.mjs';

const REQUIRED_MSG = 'moves, difficulty, side, and result are required';

function gamesHandlerSource() {
  const src = readFileSync(
    fileURLToPath(new URL('../../server/index.js', import.meta.url)),
    'utf8',
  );
  const start = src.indexOf("app.post('/api/games', ");
  assert.ok(start > 0, "expected to find the POST /api/games handler");
  return src.slice(start, start + 2500);
}

// Lift `if (<cond>) {` where the body returns the required-fields 400, and return a callable
// predicate over the four body fields.
function requiredFieldsPredicate(handler) {
  const msgIdx = handler.indexOf(REQUIRED_MSG);
  assert.ok(msgIdx > 0, `expected the '${REQUIRED_MSG}' 400 in the /api/games handler`);
  const ifIdx = handler.lastIndexOf('if (', msgIdx);
  assert.ok(ifIdx > 0, 'expected an if (...) guard above the required-fields 400');
  const condStart = ifIdx + 'if ('.length;
  const condEnd = handler.indexOf(') {', condStart);
  assert.ok(condEnd > condStart, 'could not delimit the required-fields condition');
  const cond = handler.slice(condStart, condEnd);
  return new Function('moves', 'difficulty', 'side', 'result', `return (${cond});`);
}

test('the two /api/games movestring validators agree that an empty movestring is legal', () => {
  // Half 1 — the project-wide format rule already accepts the empty movestring.
  assert.equal(validateMoves(''), null);

  const handler = gamesHandlerSource();

  // Half 2 — the handler's own regex accepts it too.
  assert.ok(
    /\/\^\[0-6\]\{0,42\}\$\//.test(handler),
    'expected the /^[0-6]{0,42}$/ movestring regex in the /api/games handler',
  );

  // Half 3 — and so must the required-fields guard that runs BEFORE it. This is the OI-163 bug:
  // `!moves` is truthiness, so a legal 0-move game is 400ed before reaching the regex.
  const rejects = requiredFieldsPredicate(handler);
  assert.equal(
    rejects('', 'easy', 'first', 'loss'),
    false,
    'a 0-move game with every other field present must NOT be rejected by the required-fields guard',
  );
});

test('the /api/games required-fields guard still rejects genuinely missing fields', () => {
  const rejects = requiredFieldsPredicate(gamesHandlerSource());
  assert.equal(rejects(undefined, 'easy', 'first', 'loss'), true, 'missing moves must still 400');
  assert.equal(rejects(null, 'easy', 'first', 'loss'), true, 'null moves must still 400');
  assert.equal(rejects('012', undefined, 'first', 'loss'), true, 'missing difficulty must still 400');
  assert.equal(rejects('012', 'easy', undefined, 'loss'), true, 'missing side must still 400');
  assert.equal(rejects('012', 'easy', 'first', undefined), true, 'missing result must still 400');
  assert.equal(rejects('012', 'easy', 'first', 'loss'), false, 'a normal game must be accepted');
});
