// boardUtils.test.mjs — unit coverage for the solver-free helpers.
import { test } from 'node:test';
import assert from 'node:assert';
import { writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { loadEnv } from './boardUtils.mjs';

test('loadEnv parses key=value lines and skips comments/blanks', () => {
  const p = join(tmpdir(), `boardUtils-loadEnv-${process.pid}.env`);
  writeFileSync(p, '# comment\nFOO_BOARDUTILS=bar\n\nBAZ_BOARDUTILS=a=b=c\n');
  try {
    loadEnv(p);
    assert.equal(process.env.FOO_BOARDUTILS, 'bar');
    assert.equal(process.env.BAZ_BOARDUTILS, 'a=b=c'); // preserves '=' in value
  } finally {
    rmSync(p, { force: true });
    delete process.env.FOO_BOARDUTILS;
    delete process.env.BAZ_BOARDUTILS;
  }
});

test('loadEnv is a no-op when the file is absent (prod: env from platform, not a file)', () => {
  const missing = join(tmpdir(), `boardUtils-nonexistent-${process.pid}-${Date.now()}.env`);
  assert.doesNotThrow(() => loadEnv(missing));
});
