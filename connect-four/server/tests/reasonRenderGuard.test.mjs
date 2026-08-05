// Spec 042 (Mistake Review Unification), US5 / T040.
// Unit tests for the shared response-boundary render guard (research.md §5, FR-017/FR-018/SC-005).
//
// Spec 057 (Epic 10) US2 / T024-T026 (OI-126): stripInternalTokens only rewrote the paired cXrY
// form; a bare column token (c3) or a range (c3-c6) reached the player untouched. T025's block
// below adds regression coverage using the REAL served explanation string that reproduced OI-126
// — harvested 2026-08-04 directly from `explanation_cache` (local DB), position_hash
// `da31d4669071...c31`, board `455c5272-3143-43d4-aa3f-c10f9d061666`'s cache row — not invented.
// `git log`/DB access is not available to a plain test run, so the string is checked in verbatim.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { stripInternalTokens, sanitizeTermsMap, guardExplainMoveLlmPayload, buildTtsSpeechText, promoteRawCoordinates, toAllowedSet } from '../reasonRenderGuard.mjs';
import { Board } from '../classifier.js';

// T024 fixture: the REAL served explanation string that reproduced OI-126, harvested from
// `explanation_cache` (position_hash da31d46690710a996abe5dd37d9bb2b28e115e67918790d59fe1dcc92a68cc31,
// locale 'en', created_at 2026-08-03T15:23:17Z) — the row backing blunder
// `455c5272-3143-43d4-aa3f-c10f9d061666`. Verified live via `supabase.from('explanation_cache')`
// against `server/.env` (local). Contains a RANGED internal-coordinate token (`c3-c6`), the exact
// shape OI-126 reported as leaking past the guard.
const OI126_HARVESTED_EXPLANATION =
  'You needed to keep the deep parity fight alive on the lower side, where your support for the ' +
  'c3-c6 line still matters. By playing the other column, you let your opponent switch to a fast ' +
  'double threat and stop you from holding that long four-in-a-row route.';

describe('stripInternalTokens', () => {
  it('strips a community- prefixed token from prose', () => {
    const text = 'This position sets up a community-z-threat that wins the odd rows.';
    const result = stripInternalTokens(text);
    assert.ok(!/community-/i.test(result), 'community- prefix must not remain');
    assert.equal(result, 'This position sets up a z-threat that wins the odd rows.');
  });

  it('strips an allen- prefixed token from prose', () => {
    const text = 'This follows allen-v1, a classic defensive pattern.';
    const result = stripInternalTokens(text);
    assert.ok(!/allen-/i.test(result), 'allen- prefix must not remain');
    assert.equal(result, 'This follows v1, a classic defensive pattern.');
  });

  it('rewrites a raw cXrY token to plain "column N" (1-based, row dropped)', () => {
    const text = 'You missed the fork at c1r4 and c4r3.';
    const result = stripInternalTokens(text);
    assert.ok(!/c\d+r\d+/i.test(result), 'no raw cXrY token may remain');
    assert.equal(result, 'You missed the fork at column 1 and column 4.');
  });

  it('handles both a label prefix and a cXrY token in the same string', () => {
    const text = 'The community-double-threat forms at c5r3.';
    const result = stripInternalTokens(text);
    assert.ok(!/community-/i.test(result));
    assert.ok(!/c\d+r\d+/i.test(result));
    assert.equal(result, 'The double-threat forms at column 5.');
  });

  it('passes clean text through unchanged (negative case)', () => {
    const text = 'Playing column 3 blocks the opponent\'s threat and keeps your best line alive.';
    assert.equal(stripInternalTokens(text), text);
  });

  it('is a no-op on non-string / empty input', () => {
    assert.equal(stripInternalTokens(''), '');
    assert.equal(stripInternalTokens(undefined), undefined);
    assert.equal(stripInternalTokens(null), null);
  });
});

// T025 (OI-126, FR-008, FR-009): bare/ranged/paired coordinate forms, proven against the T024
// harvested string. Before T026 widens CXRY_RE, only the paired-form assertions here pass — the
// bare and ranged ones (and the OI-126-string ones) fail, because
// `/\bc(\d+)r\d+\b/gi` (server/reasonRenderGuard.mjs:25 at the time this test was written) matches
// ONLY the paired cXrY shape. Observed RED for the right reason (AssertionError on the untouched
// "c3-c6"/"c3" substrings, not a crash) before T026 landed; GREEN after.
describe('stripInternalTokens — bare/ranged/paired coordinate forms (OI-126)', () => {
  it('strips the bare column form (c3) in en', () => {
    const result = stripInternalTokens('Play near c3 to hold the center.', 'en');
    assert.ok(!/\bc3\b/i.test(result), 'bare c3 token must not remain');
    assert.equal(result, 'Play near column 3 to hold the center.');
  });

  it('strips the bare column form (c3) in es', () => {
    const result = stripInternalTokens('Jugá cerca de c3 para sostener el centro.', 'es');
    assert.ok(!/\bc3\b/i.test(result));
    assert.equal(result, 'Jugá cerca de columna 3 para sostener el centro.');
  });

  it('strips the ranged column form (c3-c6) in en', () => {
    const result = stripInternalTokens('Hold the c3-c6 line.', 'en');
    assert.ok(!/\bc\d+-c\d+\b/i.test(result), 'ranged cX-cY token must not remain');
    assert.equal(result, 'Hold the columns 3 through 6 line.');
  });

  it('strips the ranged column form (c3-c6) in es', () => {
    const result = stripInternalTokens('Sostené la línea c3-c6.', 'es');
    assert.ok(!/\bc\d+-c\d+\b/i.test(result));
    assert.equal(result, 'Sostené la línea columnas 3 a 6.');
  });

  it('still strips the paired form (c3r4) in en and es (no regression)', () => {
    assert.equal(stripInternalTokens('The fork sits at c3r4.', 'en'), 'The fork sits at column 3.');
    assert.equal(stripInternalTokens('El fork está en c3r4.', 'es'), 'El fork está en columna 3.');
  });

  it('strips the OI-126 harvested string (en) — no bare/ranged/paired token remains', () => {
    const result = stripInternalTokens(OI126_HARVESTED_EXPLANATION, 'en');
    assert.ok(!/\bc\d+(-c\d+|r\d+)?\b/i.test(result), `raw coordinate token leaked: ${result}`);
    assert.ok(result.includes('columns 3 through 6'), `expected the range rewrite in: ${result}`);
  });

  it('strips the OI-126 harvested string (es) — no bare/ranged/paired token remains', () => {
    const result = stripInternalTokens(OI126_HARVESTED_EXPLANATION, 'es');
    assert.ok(!/\bc\d+(-c\d+|r\d+)?\b/i.test(result), `raw coordinate token leaked: ${result}`);
    assert.ok(result.includes('columnas 3 a 6'), `expected the range rewrite in: ${result}`);
  });

  it('does NOT corrupt legitimate prose containing a lone "c" followed by a digit outside a coordinate context', () => {
    // "c." (abbreviation) followed by a digit in an unrelated sentence — no direct c<digit>
    // adjacency, so this must never be treated as a coordinate token.
    const text = 'See appendix c. 3 for the full rule set.';
    assert.equal(stripInternalTokens(text, 'en'), text);
  });

  it('does NOT corrupt "column 3" prose (the existing negative case still holds under the widened regex)', () => {
    const text = 'Playing column 3 blocks the opponent\'s threat and keeps your best line alive.';
    assert.equal(stripInternalTokens(text, 'en'), text);
  });

  // Regression: the bare-column rule was originally written case-insensitively (`/\bc(\d+)\b/gi`),
  // which rewrote "C4" — a common human abbreviation for Connect Four — into "column 4" in served
  // prose. The internal token is always emitted lowercase (the classifier's own `c${col+1}` form),
  // so BARE_COL_RE is deliberately case-SENSITIVE. Do not re-add the `i` flag to it.
  it('does NOT corrupt "C4" (the Connect Four abbreviation) — bare-column matching is case-sensitive', () => {
    const text = 'This is a C4 position with a classic centre trap.';
    assert.equal(stripInternalTokens(text, 'en'), text);
  });

  it('still strips a lowercase bare token in the same sentence as an uppercase "C4"', () => {
    assert.equal(
      stripInternalTokens('A C4 opening and a c3 threat.', 'en'),
      'A C4 opening and a column 3 threat.',
    );
  });

  // Regression: a zone spec is a MACHINE-READABLE selector, not prose. Rewriting coordinates inside
  // one turns `[zone:cells:c4r1,c4r2]` into `[zone:cells:column 4,column 4]`, which
  // `src/lib/annotatedText.js`'s isValidSpec rejects — the client then silently drops the highlight
  // with no error at any layer. Only the `colN` form was unaffected, so a test using `col4` passed
  // while every cell- and window-level deep-reveal highlight was destroyed. Do not "simplify"
  // stripInternalTokens back into a flat .replace() chain over the whole string.
  const ZONE_SPEC_CASES = [
    ['cells', 'The key squares are [zone:cells:c4r1,c4r2]this pair[/zone:cells:c4r1,c4r2] right here.'],
    ['cNrM', 'Watch [zone:c4r3]that square[/zone:c4r3].'],
    ['colN', 'Play [zone:col4]here[/zone:col4].'],
    ['windows', 'See [zone:windows:c1r1,c2r2,c3r3,c4r4]this line[/zone:windows:c1r1,c2r2,c3r3,c4r4].'],
  ];
  for (const [shape, text] of ZONE_SPEC_CASES) {
    it(`leaves a [zone:…] spec of shape "${shape}" byte-for-byte intact`, () => {
      assert.equal(stripInternalTokens(text, 'en'), text);
    });
    it(`leaves a [zone:…] spec of shape "${shape}" intact in Spanish too`, () => {
      assert.equal(stripInternalTokens(text, 'es'), text);
    });
  }

  it('still strips raw coordinates from the PROSE INSIDE a zone, while preserving the spec', () => {
    assert.equal(
      stripInternalTokens('Look at [zone:col4]the c3 square and c4r2[/zone:col4].', 'en'),
      'Look at [zone:col4]the column 3 square and column 4[/zone:col4].',
    );
  });

  it('still strips coordinates in prose OUTSIDE a zone in the same string', () => {
    assert.equal(
      stripInternalTokens('Play c3, then see [zone:c4r3]this[/zone:c4r3], avoiding c3-c6.', 'en'),
      'Play column 3, then see [zone:c4r3]this[/zone:c4r3], avoiding columns 3 through 6.',
    );
  });
});

// Ported from the dead `server/reasonRenderGuard.locale.test.mjs` (Vitest-style, never registered
// in `test`/`test:fast`, and the repo has no `vitest` dependency — it could never have run). That
// file is deleted as part of T026; its two assertions about locale-threading survive here in
// node:test form so the behavior they pinned is not lost.
describe('guardExplainMoveLlmPayload locale threading (ported from the dead vitest file)', () => {
  it('threads locale into the cXrY rewrite', () => {
    const out = guardExplainMoveLlmPayload({ explanation: 'mirá c2r5', prompt: '', terms: {}, locale: 'es' });
    assert.equal(out.explanation, 'mirá columna 2');
  });
});

// T028 (D3, OI-124): validateAnnotation wired into guardExplainMoveLlmPayload, strip-and-log
// enforcement. `board` is optional — omitting it (as every pre-T028 caller and test above does)
// skips the gate entirely, so this describe block is additive, not a behavior change to the rest
// of the suite.
describe('guardExplainMoveLlmPayload — annotation gate wiring (T028, D3)', () => {
  const EMPTY_BOARD = new Board('');

  it('is a no-op when no board is supplied (backward compatible)', () => {
    const out = guardExplainMoveLlmPayload({
      explanation: '[zone:col9]an out-of-bounds column[/zone:col9]',
      prompt: '',
      terms: {},
    });
    // No board -> gate skipped -> the (invalid) zone tag passes through untouched (only
    // stripInternalTokens' prefix/coordinate rewriting applies).
    assert.ok(out.explanation.includes('[zone:col9]'));
  });

  it('strips a P1:empty span-carrying failure (col9 is out of the 7-column board -> expandSpec returns [])', () => {
    const out = guardExplainMoveLlmPayload({
      explanation: 'Watch [zone:col9]that far column[/zone:col9] carefully.',
      prompt: '',
      terms: {},
      board: EMPTY_BOARD,
    });
    assert.ok(!out.explanation.includes('[zone:col9]'), `zone tag should be stripped: ${out.explanation}`);
    assert.ok(out.explanation.includes('that far column'), `inner text should survive: ${out.explanation}`);
  });

  it('leaves a valid zone annotation untouched', () => {
    const out = guardExplainMoveLlmPayload({
      explanation: 'Play [zone:col4]the center column[/zone:col4] to stay strong.',
      prompt: '',
      terms: {},
      board: EMPTY_BOARD,
    });
    assert.ok(out.explanation.includes('[zone:col4]the center column[/zone:col4]'));
  });

  it('P3 policy: a span-less failure (disc notation "R"/"Y") is logged and SERVED AS-IS, not stripped', () => {
    // Deliberately triggers checkP3's disc-notation rule (a bare "R" or "Y" token) — P3 failures
    // carry no span (annotationGate.js:181/186/195/212 push a bare string), so there is nothing
    // to strip; the recorded policy is log-and-serve (see guardExplainMoveLlmPayload's JSDoc).
    const text = 'Player R has a threat.';
    const out = guardExplainMoveLlmPayload({
      explanation: text,
      prompt: '',
      terms: {},
      board: EMPTY_BOARD,
    });
    assert.equal(out.explanation, text, 'P3 failures must not be silently no-op "stripped" into something else');
  });

  it('P5Strong does NOT run on the live seam (no allowedSet is ever threaded)', () => {
    // A colN zone with no allowedSet passed: P5Strong is only invoked when validateAnnotation's
    // third argument is non-null (annotationGate.js:500 `if (allowedSet != null)`).
    // guardExplainMoveLlmPayload calls validateAnnotation(explanation, board, null) — always null
    // — so a P5Strong-only violation (e.g. a column outside the offered allowedSet) can NEVER be
    // caught here. This test pins that as the current, documented behavior (T028 correction (c)),
    // not an oversight to silently fix.
    const out = guardExplainMoveLlmPayload({
      explanation: 'Play [zone:col4]the center column[/zone:col4] to stay strong.',
      prompt: '',
      terms: {},
      board: EMPTY_BOARD,
    });
    assert.ok(out.explanation.includes('[zone:col4]'), 'a syntactically/board-valid zone survives even though P5Strong never ran');
  });
});

describe('sanitizeTermsMap', () => {
  it('rewrites a terms map key with a community- prefix', () => {
    const terms = { 'community-z-threat': 'A parity-based winning strategy.' };
    const result = sanitizeTermsMap(terms);
    assert.deepEqual(Object.keys(result), ['z-threat']);
    assert.equal(result['z-threat'], 'A parity-based winning strategy.');
    assert.ok(!('community-z-threat' in result));
  });

  it('rewrites a terms map key with an allen- prefix', () => {
    const terms = { 'allen-v3': 'A classic rule from Allen (2010).' };
    const result = sanitizeTermsMap(terms);
    assert.deepEqual(Object.keys(result), ['v3']);
  });

  it('passes a clean terms map through unchanged (negative case)', () => {
    const terms = { z_threat: 'A parity-based winning strategy.', figure_7: 'A shape pattern.' };
    const result = sanitizeTermsMap(terms);
    assert.deepEqual(result, terms);
  });

  it('handles null/undefined/empty input defensively', () => {
    assert.deepEqual(sanitizeTermsMap(null), {});
    assert.deepEqual(sanitizeTermsMap(undefined), {});
    assert.deepEqual(sanitizeTermsMap({}), {});
  });
});

describe('RANGE_RE dash widening (fix 8)', () => {
  it('RANGE_RE matches every dash form the model types (fix 8)', () => {
    // Harvested from staging: the model writes an en-dash, not an ASCII hyphen.
    assert.equal(stripInternalTokens('the c2–c5 strip', 'en'), 'the columns 2 through 5 strip');
    assert.equal(stripInternalTokens('the c2—c5 strip', 'en'), 'the columns 2 through 5 strip');
    assert.equal(stripInternalTokens('the c2−c5 strip', 'en'), 'the columns 2 through 5 strip');
    assert.equal(stripInternalTokens('the c2 – c5 strip', 'en'), 'the columns 2 through 5 strip');
    // The ASCII form must keep working.
    assert.equal(stripInternalTokens('the c2-c5 strip', 'en'), 'the columns 2 through 5 strip');
  });

  it('the widened range rule localizes (fix 8)', () => {
    assert.equal(stripInternalTokens('the c2–c5 strip', 'es'), 'the columnas 2 a 5 strip');
  });

  it('widening the dash class does not corrupt "C4" (Connect Four)', () => {
    // BARE_COL_RE has no `i` flag on purpose; the range rule must not reintroduce the problem.
    assert.equal(stripInternalTokens('This is a C4 position', 'en'), 'This is a C4 position');
  });

  it('the range rule stays case-insensitive, as it already was', () => {
    // RANGE_RE carries /gi TODAY, so "C2-C5" already rewrites — this pins that PRE-EXISTING
    // behaviour so widening the dash class is a pure superset, not a silent semantic change.
    // Unlike BARE_COL_RE's bare "C4", an uppercase PAIR is not a plausible Connect Four
    // abbreviation, so there is no prose to protect here.
    assert.equal(stripInternalTokens('a C2-C5 strip', 'en'), 'a columns 2 through 5 strip');
    assert.equal(stripInternalTokens('a C2–C5 strip', 'en'), 'a columns 2 through 5 strip');
  });

  it('a dash range inside a zone spec is left byte-for-byte alone', () => {
    const spec = '[zone:cells:c4r1,c4r2]the c2–c5 strip[/zone:cells:c4r1,c4r2]';
    const out = stripInternalTokens(spec, 'en');
    assert.equal(out.startsWith('[zone:cells:c4r1,c4r2]'), true);
    assert.equal(out.endsWith('[/zone:cells:c4r1,c4r2]'), true);
    assert.equal(out.includes('columns 2 through 5'), true);
  });
});

// T026 (spec 058, US3): promoteRawCoordinates + toAllowedSet + the full allowedSet-threading
// pipeline through guardExplainMoveLlmPayload. Extends the existing file per research.md D12 — no
// new file.
describe('promoteRawCoordinates', () => {
  it('promotes a bare cXrY token to a real, flattened-inner-text highlight', () => {
    const result = promoteRawCoordinates('Watch c4r3 closely.', 'en');
    assert.equal(result, 'Watch [zone:c4r3]column 4[/zone:c4r3] closely.');
  });

  it('the wrapped inner text is the flattened word, never the raw token (load-bearing per checkP6)', () => {
    const result = promoteRawCoordinates('The fork is at c1r4.', 'en');
    assert.ok(result.includes('[zone:c1r4]column 1[/zone:c1r4]'), result);
    assert.ok(!result.includes('[zone:c1r4]c1r4[/zone:c1r4]'), result);
  });

  it('is locale-aware, matching stripInternalTokens\' column word', () => {
    const result = promoteRawCoordinates('Mirá c2r5 con cuidado.', 'es');
    assert.equal(result, 'Mirá [zone:c2r5]columna 2[/zone:c2r5] con cuidado.');
  });

  it('Decision B: a cXrY token already inside an existing zone tag\'s own spec (the delimiter) is left alone', () => {
    const text = 'Play [zone:c4r3]here[/zone:c4r3] to win.';
    assert.equal(promoteRawCoordinates(text, 'en'), text);
  });

  it('Decision B: a cXrY token already inside an existing zone\'s own INNER TEXT is left alone, not re-wrapped', () => {
    const text = '[zone:c4r1]watch c4r1 closely[/zone:c4r1]';
    assert.equal(promoteRawCoordinates(text, 'en'), text, 'a coordinate inside an already-open zone must not be re-wrapped');
  });

  it('Decision B: depth tracking (not segment parity) — a coordinate BETWEEN two zone tags, at depth 0, IS promoted', () => {
    const text = '[zone:col4]note c4r3[/zone:col4] and also c5r2.';
    const result = promoteRawCoordinates(text, 'en');
    assert.equal(
      result,
      '[zone:col4]note c4r3[/zone:col4] and also [zone:c5r2]column 5[/zone:c5r2].',
      'the coordinate INSIDE the zone (depth>0) must stay untouched; the one AFTER it (depth 0) must be promoted'
    );
  });

  it('promotes multiple independent bare coordinates in the same string', () => {
    const result = promoteRawCoordinates('You missed c1r4 and c4r3.', 'en');
    assert.equal(result, 'You missed [zone:c1r4]column 1[/zone:c1r4] and [zone:c4r3]column 4[/zone:c4r3].');
  });

  it('is a no-op on text with no bare coordinates', () => {
    const text = 'Playing column 3 blocks the threat.';
    assert.equal(promoteRawCoordinates(text, 'en'), text);
  });

  it('is a no-op on non-string / empty input', () => {
    assert.equal(promoteRawCoordinates(''), '');
    assert.equal(promoteRawCoordinates(undefined), undefined);
    assert.equal(promoteRawCoordinates(null), null);
  });
});

describe('toAllowedSet', () => {
  it('maps a single-cell alias to a plain, non-windowOnly entry', () => {
    const out = toAllowedSet([{ handle: 'h', spec: 'c4r3' }]);
    assert.deepEqual(out, [{ cells: ['c4r3'] }]);
  });

  it('maps a windows: alias to a windowOnly entry (Decision A)', () => {
    const out = toAllowedSet([{ handle: 'h', spec: 'windows:c2r6,c5r5' }]);
    assert.equal(out.length, 1);
    assert.equal(out[0].windowOnly, true);
    assert.deepEqual([...out[0].cells].sort(), ['c2r6', 'c5r5']);
  });

  it('maps a col alias to the pre-existing ABSTRACT-ONLY {col: N} shape, not a windowOnly cells entry (regression guard: a windowOnly 6-cell bucket would make checkP5Strong\'s colN branch, which never checks offeredWindowSignatures, silently un-matchable for the always-offered move-column highlight)', () => {
    const out = toAllowedSet([{ handle: 'h', spec: 'col4' }]);
    assert.deepEqual(out, [{ col: 3 }]);
  });

  it('drops a tg alias (expandSpec yields no cells — nothing to admit)', () => {
    assert.deepEqual(toAllowedSet([{ handle: 'h', spec: 'tg' }]), []);
  });

  it('handles a future:-prefixed spec identically to its unprefixed form', () => {
    const out = toAllowedSet([{ handle: 'h', spec: 'future:c2r6' }]);
    assert.deepEqual(out, [{ cells: ['c2r6'] }]);
  });

  it('handles an empty/undefined aliases array', () => {
    assert.deepEqual(toAllowedSet([]), []);
    assert.deepEqual(toAllowedSet(undefined), []);
  });
});

describe('guardExplainMoveLlmPayload — allowedSet + promoteRawCoordinates end to end (T026)', () => {
  const EMPTY_BOARD = new Board('');

  it('1: a bare cXrY that IS offered is promoted into a real, surviving highlight', () => {
    const allowedSet = toAllowedSet([{ handle: 'h', spec: 'c4r3' }]);
    const out = guardExplainMoveLlmPayload({
      explanation: 'The key square is c4r3, watch it.',
      prompt: '',
      terms: {},
      board: EMPTY_BOARD,
      allowedSet,
    });
    assert.equal(out.explanation, 'The key square is [zone:c4r3]column 4[/zone:c4r3], watch it.');
  });

  it('2: a bare cXrY that is NOT offered falls back to flattened "column N" prose, with no residual [zone:...] tag', () => {
    const allowedSet = toAllowedSet([{ handle: 'h', spec: 'c1r1' }]); // c4r3 is NOT offered
    const out = guardExplainMoveLlmPayload({
      explanation: 'The key square is c4r3, watch it.',
      prompt: '',
      terms: {},
      board: EMPTY_BOARD,
      allowedSet,
    });
    assert.ok(!out.explanation.includes('[zone:'), `no residual zone tag expected: ${out.explanation}`);
    assert.equal(out.explanation, 'The key square is column 4, watch it.');
  });

  it('3: Decision B — a cXrY already inside the LLM\'s own zone is left unpromoted by promoteRawCoordinates, then handled by the existing pipeline (checkP6 flags the raw text, the wrapper is dropped, stripInternalTokens flattens the leftover prose)', () => {
    const allowedSet = toAllowedSet([{ handle: 'h', spec: 'c4r1' }]);
    const out = guardExplainMoveLlmPayload({
      explanation: '[zone:c4r1]watch c4r1 closely[/zone:c4r1]',
      prompt: '',
      terms: {},
      board: EMPTY_BOARD,
      allowedSet,
    });
    // promoteRawCoordinates leaves the already-wrapped "c4r1" untouched (Decision B), so it never
    // becomes the flattened word — its own inner text then trips checkP6's raw-coordinate check
    // (c4r1 is offered, so checkP5Strong alone would have passed it), the wrapper is stripped, and
    // the leftover raw "c4r1" prose is caught by the final stripInternalTokens pass exactly as it
    // would have been pre-feature. No residual [zone:...] tag either way.
    assert.ok(!out.explanation.includes('[zone:'), out.explanation);
    assert.equal(out.explanation, 'watch column 4 closely');
  });

  it('4: SPAN_CARRYING_CODES including P5strong strips an unoffered, EXPLICIT (non-promoted) zone end to end', () => {
    const allowedSet = toAllowedSet([{ handle: 'h', spec: 'c1r1' }]);
    const out = guardExplainMoveLlmPayload({
      explanation: 'Watch [zone:c4r3]that square[/zone:c4r3] closely.',
      prompt: '',
      terms: {},
      board: EMPTY_BOARD,
      allowedSet,
    });
    assert.ok(!out.explanation.includes('[zone:c4r3]'), `zone tag should be stripped: ${out.explanation}`);
    assert.ok(out.explanation.includes('that square'), `inner text should survive: ${out.explanation}`);
  });

  it('5 (FR-013): a fully valid, fully grounded explanation passes through unaltered', () => {
    const allowedSet = toAllowedSet([{ handle: 'h', spec: 'col4' }]);
    const explanation = 'Play [zone:col4]the center column[/zone:col4] to stay strong.';
    const out = guardExplainMoveLlmPayload({
      explanation,
      prompt: '',
      terms: {},
      board: EMPTY_BOARD,
      allowedSet,
    });
    assert.equal(out.explanation, explanation);
  });
});

describe('buildTtsSpeechText (fix 7)', () => {
  it('buildTtsSpeechText speaks what the screen shows (fix 7)', () => {
    // Harvested from staging (Epic 11 evidence table, board 3154): the coach SPOKE "c5"/"c6"
    // while the screen showed "column 5"/"column 6".
    assert.equal(
      buildTtsSpeechText('By playing c5 you threaten, but c6 is the tougher defense.', 'en'),
      'By playing column 5 you threaten, but column 6 is the tougher defense.',
    );
    // Board 315444233213134122: a paired cell coordinate.
    assert.equal(
      buildTtsSpeechText('A deep threat at c1r3 decides it.', 'en'),
      'A deep threat at column 1 decides it.',
    );
  });

  it('buildTtsSpeechText strips annotation markup as well (fix 7)', () => {
    assert.equal(
      buildTtsSpeechText('the [zone:col4]pivot[/zone:col4] at c3.', 'en'),
      'the pivot at column 3.',
    );
  });

  it('buildTtsSpeechText composes fix 8 with fix 7 (board 315444233213)', () => {
    // Together, the two fixes turn the raw en-dash range into a speakable phrase.
    assert.equal(
      buildTtsSpeechText('the c2–c5 strip; [zone:col4]column 4[/zone:col4] is the pivot.', 'en'),
      'the columns 2 through 5 strip; column 4 is the pivot.',
    );
  });

  it('buildTtsSpeechText honours the locale it is given (fix 7)', () => {
    assert.equal(
      buildTtsSpeechText('A deep threat at c1r3 decides it.', 'es'),
      'A deep threat at columna 1 decides it.',
    );
  });

  it('buildTtsSpeechText handles empty input the way the route expects', () => {
    assert.equal(buildTtsSpeechText('', 'en'), '');
    assert.equal(buildTtsSpeechText(null, 'en'), '');
  });
});
