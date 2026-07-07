// Guard test: VALID_BLUNDER_TAGS (code) must be a subset of the tags allowed by
// the blunders_pattern_category_check DB constraint.
//
// Regression for the 2026-07-06 schema drift: three parity-aware threat tags
// (major_threat_parity, major_threat_nonparity, minor_threat) were added to
// VALID_BLUNDER_TAGS on 2026-06-25 but the DB check constraint was never widened,
// so insertGameBlunder passed them through and every such row was rejected with
// error 23514. This test fails if code emits a tag the newest migration's
// constraint would reject.
//
// Run with: node --test connect-four/tests/blunder/blunderTagConstraint.test.js

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VALID_BLUNDER_TAGS } from '../../server/blunderTags.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'server', 'migrations');

/**
 * Extract the set of pattern_category values from the most recent migration that
 * (re)defines blunders_pattern_category_check. This mirrors the live constraint
 * without requiring a DB connection.
 * @returns {Set<string>}
 */
function allowedTagsFromLatestMigration() {
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  let allowed = null;
  for (const file of files) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    // Match the ADD CONSTRAINT ... CHECK (pattern_category IN ( ... )) block.
    const m = sql.match(
      /ADD\s+CONSTRAINT\s+blunders_pattern_category_check\s+CHECK\s*\(\s*pattern_category\s+IN\s*\(([^)]*)\)/is
    );
    if (m) {
      allowed = new Set(
        [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1])
      );
    }
  }
  return allowed;
}

describe('blunder tag / DB constraint agreement', () => {
  it('every VALID_BLUNDER_TAGS value is accepted by the latest DB constraint', () => {
    const allowed = allowedTagsFromLatestMigration();
    assert.ok(allowed, 'no migration defines blunders_pattern_category_check');

    const missing = [...VALID_BLUNDER_TAGS].filter((t) => !allowed.has(t));
    assert.deepEqual(
      missing,
      [],
      `Tags emitted by the classifier but rejected by the DB constraint: ${missing.join(', ')}. ` +
      `Add a migration widening blunders_pattern_category_check.`
    );
  });
});
