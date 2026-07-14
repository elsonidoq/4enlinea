import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Authored source (repo root) vs the vendored copy shipped inside connect-four/.
// See scripts/sync-kb.mjs and server/kbDir.js for why the copy exists.
const SOURCE = join(__dirname, '../../../docs/knowledge-base');
const VENDORED = join(__dirname, '../../server/kb');

const mdFiles = (dir) => readdirSync(dir).filter((f) => f.endsWith('.md')).sort();

// The authored source only exists in the repo checkout, not in the Railway
// build tree (where docs/ was never shipped). Skip there; the committed copy is
// authoritative on the server anyway.
test('server/kb is in sync with docs/knowledge-base (run `npm run sync-kb`)', { skip: !existsSync(SOURCE) }, () => {
  assert.ok(existsSync(VENDORED), 'server/kb/ is missing — run `npm run sync-kb`');

  const srcFiles = mdFiles(SOURCE);
  const vendFiles = mdFiles(VENDORED);
  assert.deepEqual(
    vendFiles,
    srcFiles,
    'server/kb/ file set differs from docs/knowledge-base/ — run `npm run sync-kb`',
  );

  for (const f of srcFiles) {
    assert.equal(
      readFileSync(join(VENDORED, f), 'utf8'),
      readFileSync(join(SOURCE, f), 'utf8'),
      `server/kb/${f} is stale — run \`npm run sync-kb\``,
    );
  }
});
