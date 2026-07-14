#!/usr/bin/env node
/**
 * sync-kb — vendor the strategy knowledge base into the deployed tree.
 *
 * The KB is authored at the repo root in `docs/knowledge-base/`. That directory
 * lives OUTSIDE `connect-four/`, and Railway's Railpack build ships only the
 * `connect-four/` subtree (this is why solver-src was moved in — commit f841ebc).
 * So the runtime KB readers (llmCoachHelpers.js, scripts/reason_engine/openingMatch.mjs)
 * cannot reach `../docs/knowledge-base` on the server.
 *
 * This script mirrors the authored KB into `connect-four/server/kb/`, which IS
 * inside the shipped tree. That copy is committed to git. Run this whenever the
 * KB under docs/ changes:
 *
 *     npm run sync-kb
 *
 * `tests/unit/kbSync.test.js` fails if the vendored copy drifts from the source,
 * so an un-synced edit is caught by `npm run test:fast`.
 *
 * Usage: node scripts/sync-kb.mjs [--check]
 *   --check  exit non-zero if the copy is out of sync (does not write)
 */

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(__dirname, '../../docs/knowledge-base');
const DEST = join(__dirname, '../server/kb');

const checkOnly = process.argv.includes('--check');

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('Mirror docs/knowledge-base/ into connect-four/server/kb/ (the shipped tree).');
  console.log('Usage: node scripts/sync-kb.mjs [--check]');
  console.log('  --check  exit non-zero if the vendored copy is out of sync (no writes)');
  process.exit(0);
}

if (!existsSync(SOURCE)) {
  // Only happens outside the repo (e.g. the Railway build tree, where docs/ was
  // never shipped). The vendored copy is already committed, so there is nothing
  // to do — succeed quietly.
  console.log(`[sync-kb] source ${SOURCE} not present — using committed copy, nothing to sync.`);
  process.exit(0);
}

const srcFiles = readdirSync(SOURCE).filter((f) => f.endsWith('.md')).sort();
const destFiles = existsSync(DEST)
  ? readdirSync(DEST).filter((f) => f.endsWith('.md')).sort()
  : [];

let inSync = destFiles.length === srcFiles.length && destFiles.every((f, i) => f === srcFiles[i]);
if (inSync) {
  for (const f of srcFiles) {
    if (readFileSync(join(SOURCE, f), 'utf8') !== readFileSync(join(DEST, f), 'utf8')) {
      inSync = false;
      break;
    }
  }
}

if (checkOnly) {
  if (inSync) {
    console.log(`[sync-kb] in sync (${srcFiles.length} files).`);
    process.exit(0);
  }
  console.error('[sync-kb] OUT OF SYNC — run `npm run sync-kb`.');
  process.exit(1);
}

if (inSync) {
  console.log(`[sync-kb] already in sync (${srcFiles.length} files).`);
  process.exit(0);
}

// Rewrite the whole vendored dir so renames/deletions propagate too.
if (existsSync(DEST)) {
  for (const f of readdirSync(DEST).filter((f) => f.endsWith('.md'))) {
    rmSync(join(DEST, f));
  }
} else {
  mkdirSync(DEST, { recursive: true });
}
for (const f of srcFiles) {
  writeFileSync(join(DEST, f), readFileSync(join(SOURCE, f), 'utf8'));
}
console.log(`[sync-kb] wrote ${srcFiles.length} KB files to server/kb/.`);
