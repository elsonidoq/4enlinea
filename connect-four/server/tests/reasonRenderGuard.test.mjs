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

import { stripInternalTokens, sanitizeTermsMap, guardExplainMoveLlmPayload } from '../reasonRenderGuard.mjs';
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
