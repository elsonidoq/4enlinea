// Plan B — mobile viewport fit.
//
// Source-scan guard for the UNIT half of the fix. Chrome DevTools emulation
// resolves 100vh === 100dvh === 100svh (no emulated browser chrome), so no
// screenshot can prove the unit swap landed. This test is the only mechanical
// check. The PROPERTY half (pinned root + internal scroller) is verified
// visually per-screen instead.
//
// Admin pages are deliberately excluded — see OI-160 and the plan's D4.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, '..', '..', 'src');

function screenFiles() {
  const dir = join(SRC, 'screens');
  return readdirSync(dir).filter(f => f.endsWith('.jsx')).map(f => join(dir, f));
}

const IN_SCOPE = [...screenFiles(), join(SRC, 'App.jsx')];

describe('viewport units: no 100vh in user-facing screens', () => {
  for (const file of IN_SCOPE) {
    it(`${file.slice(SRC.length + 1)} uses no 100vh`, () => {
      const src = readFileSync(file, 'utf8');
      const hits = src.split('\n')
        .map((line, i) => ({ line: line.trim(), n: i + 1 }))
        .filter(({ line }) => line.includes('100vh'));
      assert.deepEqual(
        hits, [],
        `100vh must be 100dvh (mobile chrome) — found:\n` +
        hits.map(h => `  line ${h.n}: ${h.line}`).join('\n'),
      );
    });
  }

  it('scans a non-trivial number of files (guards against an empty glob)', () => {
    assert.ok(IN_SCOPE.length >= 20, `expected >=20 in-scope files, got ${IN_SCOPE.length}`);
  });
});
