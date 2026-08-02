// spec 054 Epic 4 US4 / FR-025, FR-026
//
// Source-parse wiring check: confirms both `resolvePorts()` (vite.config.js) and
// `resolveWorktreePortEnv()` (server/index.js) delegate their fatal-vs-fallback
// decision to the shared server/worktreePorts.js module (T039) instead of each
// re-implementing the GIT_DIR/GIT_COMMON check independently. The decision logic
// itself is unit-tested directly in server/worktreePorts.test.mjs (T035) — this
// test only checks the wiring, per the batch's "not a re-test" instruction.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const viteConfigSrc = readFileSync(resolve(__dirname, '..', '..', 'vite.config.js'), 'utf8');
const serverIndexSrc = readFileSync(resolve(__dirname, '..', '..', 'server', 'index.js'), 'utf8');

describe('vite.config.js resolvePorts() wiring', () => {
  it('imports the fatal-vs-fallback decision from server/worktreePorts.js', () => {
    assert.match(viteConfigSrc, /from ['"]\.\/server\/worktreePorts\.js['"]/);
  });

  it('calls handleSelfDeriveFailure rather than re-implementing GIT_DIR/GIT_COMMON detection', () => {
    assert.match(viteConfigSrc, /handleSelfDeriveFailure\s*\(/);
    assert.doesNotMatch(viteConfigSrc, /git-common-dir/);
  });
});

describe('server/index.js resolveWorktreePortEnv() wiring', () => {
  it('imports the fatal-vs-fallback decision from ./worktreePorts.js', () => {
    assert.match(serverIndexSrc, /from ['"]\.\/worktreePorts\.js['"]/);
  });

  it('calls handleSelfDeriveFailure rather than re-implementing GIT_DIR/GIT_COMMON detection', () => {
    assert.match(serverIndexSrc, /handleSelfDeriveFailure\s*\(/);
    assert.doesNotMatch(serverIndexSrc, /git-common-dir/);
  });
});
