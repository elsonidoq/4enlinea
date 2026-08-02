// Regression test for FR-026/FR-027/FR-028/FR-029 (spec 051 US5): the shared
// TTS synthesis entry point (server/ttsProvider.js) must be the ONLY way any
// caller can ship a clip, and it must be structurally impossible for a caller
// to omit voice-style instructions or use a model that ignores them.
//
// Per contracts/tts-provider-contract.md's "FR-029 regression test" section,
// this file covers all 7 required assertions:
//   1. synthesize(text) (no lang) throws.
//   2. synthesize(text, 'fr') throws.
//   3. synthesize(text, 'en') / 'es' resolve, and the outgoing HTTP request body's
//      `instructions` is non-empty and lang-specific.
//   4. resolveSynthesisConfig(lang) throws when the (injected, test-only) config
//      source resolves to a legacy model.
//   5. synthesizeRaw/synthesizeStreamRaw accept a valid model, refuse a legacy one.
//   6. Lint: no file outside ttsProvider.js constructs an OpenAI TTS request directly.
//   7. Lint: no file outside ttsProvider.js/server/index.js imports synthesizeRaw
//      or synthesizeStreamRaw.
//
// This file registers itself with global.fetch (never a real OpenAI call) — see
// the "Pure Function Extraction" testing convention referenced by the contract.

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  synthesize,
  synthesizeStream,
  synthesizeRaw,
  synthesizeStreamRaw,
  resolveSynthesisConfig,
} from './ttsProvider.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..'); // connect-four/

let originalFetch;
let originalKey;

before(() => {
  originalFetch = globalThis.fetch;
  originalKey = process.env.OPENAI_API_KEY;
  // Landmine (contract): buildTtsRequest throws unless OPENAI_API_KEY is set.
  // Fake, non-secret key — no real network call is ever made in this file.
  process.env.OPENAI_API_KEY = 'sk-fake-test-key-not-real';
});

after(() => {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalKey;
});

/**
 * Installs a stub global.fetch that captures every outgoing Request and
 * resolves with a minimal successful audio/mpeg response. Returns the array
 * of captured Request objects.
 */
function stubFetchCapture() {
  const requests = [];
  globalThis.fetch = async (request) => {
    requests.push(request);
    return {
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(4),
      body: { getReader: () => ({ read: async () => ({ done: true, value: undefined }) }) },
    };
  };
  return requests;
}

describe('synthesize(text, lang) — invalid lang throws synchronously', () => {
  it('throws when lang is omitted (no silent default to en)', async () => {
    stubFetchCapture();
    await assert.rejects(() => synthesize('hello'), /invalid lang/);
  });

  it("throws when lang is 'fr' (unsupported locale)", async () => {
    stubFetchCapture();
    await assert.rejects(() => synthesize('hello', 'fr'), /invalid lang/);
  });

  it('synthesizeStream also throws on missing/invalid lang', async () => {
    stubFetchCapture();
    await assert.rejects(() => synthesizeStream('hello'), /invalid lang/);
    await assert.rejects(() => synthesizeStream('hello', 'fr'), /invalid lang/);
  });
});

describe('synthesize(text, lang) — resolves with lang-specific, non-empty instructions', () => {
  it("en request body carries non-empty instructions sourced from tts-prompt.en.json", async () => {
    const requests = stubFetchCapture();
    await synthesize('Nice move!', 'en');

    assert.equal(requests.length, 1);
    const body = JSON.parse(await requests[0].text());
    assert.ok(typeof body.instructions === 'string' && body.instructions.length > 0, 'instructions must be non-empty');
    // tts-prompt.en.json's persona describes a "raspy" coaching voice — the
    // Spanish accent directive text must NOT appear on the English request.
    assert.match(body.instructions, /raspy/i);
    assert.doesNotMatch(body.instructions, /Rioplatense/);
  });

  it("es request body carries the Spanish persona + accent directive — NOT the English persona", async () => {
    const requests = stubFetchCapture();
    await synthesize('Buen movimiento!', 'es');

    assert.equal(requests.length, 1);
    const body = JSON.parse(await requests[0].text());
    assert.ok(typeof body.instructions === 'string' && body.instructions.length > 0, 'instructions must be non-empty');
    // tts-prompt.es.json's persona is "argentino"/porteño and the accent
    // directive (buildTtsInstructions) appends "Rioplatense" — neither string
    // appears anywhere in the English prompt, so this is a strong,
    // non-tautological assertion that the ES path used ES config, not EN's.
    assert.match(body.instructions, /Rioplatense|argentin/i);
    assert.doesNotMatch(body.instructions, /raspy/i);
  });

  it('synthesizeStream(text, lang) resolves the same way for a valid lang', async () => {
    stubFetchCapture();
    const response = await synthesizeStream('Nice move!', 'en');
    assert.ok(response); // did not throw; stub returned a response-shaped object
  });
});

describe('resolveSynthesisConfig(lang) — legacy-model refusal (FR-028)', () => {
  it('throws when the (injected, test-only) config source resolves to a legacy model', () => {
    const fakeLegacyConfig = () => ({ prompt: 'some coaching persona', speed: 1.0, voice: 'alloy', model: 'tts-1' });
    assert.throws(
      () => resolveSynthesisConfig('en', { readConfig: fakeLegacyConfig }),
      /does not honor voice-style instructions/,
    );
  });

  it('throws when the config source resolves to empty instructions', () => {
    const fakeEmptyConfig = () => ({ prompt: '', speed: 1.0, voice: 'alloy', model: 'gpt-4o-mini-tts' });
    assert.throws(
      () => resolveSynthesisConfig('en', { readConfig: fakeEmptyConfig }),
      /empty instructions/,
    );
  });

  it('resolves successfully for a valid current config (real tts-prompt.en.json)', () => {
    const cfg = resolveSynthesisConfig('en');
    assert.equal(cfg.model, 'gpt-4o-mini-tts');
    assert.ok(cfg.instructions.length > 0);
  });

  it('throws on an invalid lang before even reading config', () => {
    assert.throws(() => resolveSynthesisConfig('fr'), /invalid lang/);
  });
});

describe('synthesizeRaw/synthesizeStreamRaw — preview sandbox carve-out, still refuses legacy models', () => {
  it('synthesizeRaw accepts a valid model with arbitrary opts (proves the sandbox still works)', async () => {
    stubFetchCapture();
    const audio = await synthesizeRaw('preview text', { voice: 'nova', model: 'gpt-4o-mini-tts', speed: 2.0, instructions: 'test' });
    assert.ok(Buffer.isBuffer(audio));
  });

  it('synthesizeRaw refuses a legacy model (tts-1)', async () => {
    stubFetchCapture();
    await assert.rejects(
      () => synthesizeRaw('preview text', { voice: 'nova', model: 'tts-1', speed: 1.0, instructions: 'test' }),
      /does not honor voice-style instructions/,
    );
  });

  it('synthesizeRaw refuses a legacy model (tts-1-hd)', async () => {
    stubFetchCapture();
    await assert.rejects(
      () => synthesizeRaw('preview text', { model: 'tts-1-hd' }),
      /does not honor voice-style instructions/,
    );
  });

  it('synthesizeStreamRaw accepts a valid model, refuses a legacy one', async () => {
    stubFetchCapture();
    const resp = await synthesizeStreamRaw('preview text', { model: 'gpt-4o-mini-tts' });
    assert.ok(resp);
    await assert.rejects(
      () => synthesizeStreamRaw('preview text', { model: 'tts-1' }),
      /does not honor voice-style instructions/,
    );
  });

  it('synthesizeRaw tolerates empty instructions (auditioning "no style" is a legitimate preview use case)', async () => {
    stubFetchCapture();
    const audio = await synthesizeRaw('preview text', { model: 'gpt-4o-mini-tts', instructions: '' });
    assert.ok(Buffer.isBuffer(audio));
  });
});

// ── Lints (assertions 6 & 7) ────────────────────────────────────────────────
//
// Bare `grep` silently reports zero matches in this shell's non-UTF-8 locale
// (see memory: project_grep_silent_zero_matches.md) — so these lints walk the
// filesystem in Node with fs.readFileSync + a plain string/regex search,
// sidestepping the locale problem entirely, per the task's guidance.

const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.git', 'coverage']);

/**
 * Recursively collects every .js/.mjs file under `root`, skipping SKIP_DIRS.
 * @param {string} root
 * @returns {string[]} absolute file paths
 */
function walkJsFiles(root) {
  const out = [];
  const entries = fs.readdirSync(root, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      out.push(...walkJsFiles(full));
    } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.mjs'))) {
      out.push(full);
    }
  }
  return out;
}

describe('Lint: exactly one file talks to the OpenAI TTS endpoint directly (assertion 6)', () => {
  it('no .js/.mjs file other than ttsProvider.js references api.openai.com/v1/audio/speech', () => {
    // Excludes this test file too — its own doc comments/assertions legitimately
    // mention the endpoint string without constructing a request against it.
    const excluded = new Set([path.join(__dirname, 'ttsProvider.js'), path.join(__dirname, 'ttsProvider.test.js')]);
    const offenders = [];
    for (const file of walkJsFiles(REPO_ROOT)) {
      if (excluded.has(file)) continue;
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('api.openai.com/v1/audio/speech')) {
        offenders.push(path.relative(REPO_ROOT, file));
      }
    }
    assert.deepEqual(offenders, [], `files constructing an OpenAI TTS request directly: ${offenders.join(', ')}`);
  });
});

describe('Lint: synthesizeRaw/synthesizeStreamRaw stay confined to the documented exception (assertion 7)', () => {
  it('no .js/.mjs file other than ttsProvider.js and server/index.js imports synthesizeRaw/synthesizeStreamRaw', () => {
    // server/index.js is the POST /api/admin/audio/preview handler's module —
    // the one documented exception. This test file itself legitimately imports
    // both Raw functions to exercise them directly (assertion 5 above); excluding
    // it from the scan is what makes assertion 5 and this lint coexist.
    const allowed = new Set([
      path.join(__dirname, 'ttsProvider.js'),
      path.join(__dirname, 'index.js'),
      path.join(__dirname, 'ttsProvider.test.js'),
    ]);
    // Import-specific (not a bare name mention) so an unrelated doc comment
    // elsewhere that happens to name these functions in prose doesn't trip a
    // false positive — this matches the contract's actual concern ("imports").
    // Covers both a static `import { synthesizeRaw } from '...ttsProvider...'`
    // and the dynamic-import destructure idiom already used elsewhere in this
    // codebase: `const { synthesizeRaw } = await import('...ttsProvider...')`.
    const importPattern = new RegExp(
      String.raw`(?:import|const)\s*\{[^}]*\bsynthesize(?:Stream)?Raw\b[^}]*\}\s*(?:from|=\s*await\s+import)\s*\(?['"][^'"]*ttsProvider(?:\.js)?['"]`,
    );
    const offenders = [];
    for (const file of walkJsFiles(REPO_ROOT)) {
      if (allowed.has(file)) continue;
      const content = fs.readFileSync(file, 'utf8');
      if (importPattern.test(content)) {
        offenders.push(path.relative(REPO_ROOT, file));
      }
    }
    assert.deepEqual(offenders, [], `files referencing synthesizeRaw/synthesizeStreamRaw outside the documented exception: ${offenders.join(', ')}`);
  });
});
