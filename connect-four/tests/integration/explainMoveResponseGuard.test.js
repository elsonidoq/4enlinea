// Spec 042 (Mistake Review Unification), US5 / T041.
// Exercises the response-boundary guard (research.md §5, FR-019) as it is actually wired into
// `POST /api/explain-move` and `POST /api/explain-move-llm` in `server/index.js`.
//
// `server/index.js` is a monolith with no exportable Express app builder (see
// tests/integration/challenge-progress.test.js's own "mock supabase stubs, no real DB" header for
// the repo-wide convention this follows). Both endpoints' `res.json(...)` calls are built through
// the exact same exported guard functions (`guardExplainMovePayload` / `guardExplainMoveLlmPayload`,
// `server/reasonRenderGuard.mjs`) that `index.js` calls at every response site — this test drives
// those functions directly with deliberately-poisoned payloads shaped exactly like a poisoned
// `explanation_cache` row (cache-hit branch) and an equivalently poisoned freshly-generated
// payload (fresh-generation branch), for BOTH endpoints, and asserts neither a `community-`/`allen-`
// prefix nor a raw `cXrY` token ever survives into the guarded response body's explanation text or
// `terms` keys.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { guardExplainMovePayload, guardExplainMoveLlmPayload } from '../../server/reasonRenderGuard.mjs';

const LEAK_PATTERNS = [/community-/i, /allen-/i, /\bc\d+r\d+\b/i];

function assertNoLeak(text, label) {
  for (const pattern of LEAK_PATTERNS) {
    assert.ok(!pattern.test(text ?? ''), `${label} must not match ${pattern}: "${text}"`);
  }
}

function assertNoLeakyTermKeys(terms, label) {
  for (const key of Object.keys(terms ?? {})) {
    assert.ok(!/community-|allen-/i.test(key), `${label} terms key must be sanitized: "${key}"`);
  }
}

describe('POST /api/explain-move — response-boundary guard (FR-019, SC-005)', () => {
  it('sanitizes a cache-derived payload (mirrors a poisoned explanation_cache row)', () => {
    // Shaped like index.js's cachedEntry branch: oneLiner/deepRevealData read straight off a
    // stubbed `explanation_cache` row, poisoned with both leak classes.
    const poisonedCacheRow = {
      oneLiner: 'This sets up a community-double-threat at c1r4.',
      patternTag: 'double_threat',
      deepReveal: {
        patternTag: 'double_threat',
        fullText: 'The allen-v1 rule applies: the fork forms at c4r3 and c1r4.',
        continuationLine: [],
        boardAnnotation: [],
      },
    };

    const response = guardExplainMovePayload(poisonedCacheRow);

    assertNoLeak(response.oneLiner, 'cache-derived oneLiner');
    assertNoLeak(response.deepReveal.fullText, 'cache-derived deepReveal.fullText');
  });

  it('sanitizes a freshly-generated payload', () => {
    // Shaped like index.js's fresh-generation branch: oneLiner/deepRevealData built from
    // composeExplanation() output, poisoned the same way.
    const poisonedFreshPayload = {
      oneLiner: 'Watch the community-z-threat building on the right side.',
      patternTag: 'z_threat',
      deepReveal: {
        patternTag: 'z_threat',
        fullText: 'This is a textbook allen-v4 zugzwang at c5r3.',
        continuationLine: [],
        boardAnnotation: [],
      },
    };

    const response = guardExplainMovePayload(poisonedFreshPayload);

    assertNoLeak(response.oneLiner, 'fresh oneLiner');
    assertNoLeak(response.deepReveal.fullText, 'fresh deepReveal.fullText');
  });

  it('passes clean text through unchanged (negative case)', () => {
    const cleanPayload = {
      oneLiner: 'Playing column 4 blocks the fork.',
      patternTag: 'double_threat',
      deepReveal: null,
    };
    const response = guardExplainMovePayload(cleanPayload);
    assert.equal(response.oneLiner, cleanPayload.oneLiner);
    assert.equal(response.deepReveal, null);
  });
});

describe('POST /api/explain-move-llm — response-boundary guard (FR-019, SC-005)', () => {
  it('sanitizes a cache-hit payload (mirrors a poisoned explanation_cache row)', () => {
    // Shaped like index.js's `cached.deep_reveal_json` early-return branch.
    const poisonedCacheRow = {
      explanation: 'You missed the community-double-threat at c1r4 — see the allen-v2 rule.',
      prompt: 'internal prompt text, never guarded (not player-facing)',
      terms: {
        'community-double-threat': 'Two winning threats at once.',
        'allen-v2': 'A classic defensive rule.',
        z_threat: 'A clean, unprefixed term id.',
      },
      cached: true,
    };

    const response = guardExplainMoveLlmPayload(poisonedCacheRow);

    assertNoLeak(response.explanation, 'cache-hit explanation');
    assertNoLeakyTermKeys(response.terms, 'cache-hit');
    assert.equal(response.cached, true, 'non-text fields pass through untouched');
  });

  it('sanitizes a fresh-generation payload', () => {
    // Shaped like index.js's post-computeMechanism fresh branch (explanation = result.mechanism,
    // terms = termsMap built by scanning [term:kbId] tags).
    const poisonedFreshPayload = {
      explanation: 'The fork completes at c4r3; this follows the community-figure-7 shape.',
      prompt: 'internal prompt text, never guarded (not player-facing)',
      terms: {
        'community-figure-7': 'A recognizable board shape.',
      },
    };

    const response = guardExplainMoveLlmPayload(poisonedFreshPayload);

    assertNoLeak(response.explanation, 'fresh explanation');
    assertNoLeakyTermKeys(response.terms, 'fresh');
  });

  it('sanitizes the notABlunder early-return payload', () => {
    // Shaped like index.js's result.notABlunder branch — a hardcoded string today, guarded
    // anyway for uniformity/defense-in-depth (no leak expected, but the guard must not break it).
    const payload = {
      explanation: 'This move keeps the game on its best track — there is no better alternative to highlight here.',
      prompt: '',
      terms: {},
    };
    const response = guardExplainMoveLlmPayload(payload);
    assert.equal(response.explanation, payload.explanation);
    assert.deepEqual(response.terms, {});
  });

  it('passes clean text and terms through unchanged (negative case)', () => {
    const cleanPayload = {
      explanation: 'Playing column 3 blocks the opponent\'s fork and keeps your best line alive.',
      prompt: '',
      terms: { z_threat: 'A parity-based winning strategy.' },
    };
    const response = guardExplainMoveLlmPayload(cleanPayload);
    assert.equal(response.explanation, cleanPayload.explanation);
    assert.deepEqual(response.terms, cleanPayload.terms);
  });
});
