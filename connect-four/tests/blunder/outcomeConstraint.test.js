// Guard test: migration 063's narrowed puzzle_attempts.outcome CHECK constraint must be
// exactly {'correct_first', 'tied', 'incorrect', 'abandoned'} — 'revealed' and 'correct_retry'
// dropped. DB-free parity assertion, mirroring
// connect-four/tests/blunder/blunderTagConstraint.test.js's technique exactly (spec 054 US3,
// FR-016/FR-017).
//
// Run with: node --test connect-four/tests/blunder/outcomeConstraint.test.js

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'server', 'migrations');
const MIGRATION_FILE = '063_puzzle_attempts_outcome_narrow.sql';

/**
 * Extract the set of outcome values from migration 063's
 * `ADD CONSTRAINT ... CHECK (outcome IN (...))` block.
 * @returns {Set<string>|null}
 */
function allowedOutcomesFromMigration063() {
  const filePath = path.join(MIGRATIONS_DIR, MIGRATION_FILE);
  if (!fs.existsSync(filePath)) return null;
  const sql = fs.readFileSync(filePath, 'utf8');
  const m = sql.match(
    /ADD\s+CONSTRAINT\s+\S+\s+CHECK\s*\(\s*outcome\s+IN\s*\(([^)]*)\)/is
  );
  if (!m) return null;
  return new Set([...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]));
}

describe('puzzle_attempts.outcome / migration 063 constraint agreement', () => {
  it('migration 063 exists and defines the ADD CONSTRAINT ... CHECK (outcome IN (...)) block', () => {
    const allowed = allowedOutcomesFromMigration063();
    assert.ok(allowed, `${MIGRATION_FILE} not found or does not define the outcome CHECK constraint`);
  });

  it('the narrowed set is exactly {correct_first, tied, incorrect, abandoned}', () => {
    const allowed = allowedOutcomesFromMigration063();
    assert.ok(allowed, `${MIGRATION_FILE} not found or does not define the outcome CHECK constraint`);
    assert.deepEqual(
      [...allowed].sort(),
      ['abandoned', 'correct_first', 'incorrect', 'tied'].sort()
    );
  });

  it("does NOT accept 'revealed' (dropped — written by no current code path)", () => {
    const allowed = allowedOutcomesFromMigration063();
    assert.ok(allowed);
    assert.equal(allowed.has('revealed'), false);
  });

  it("does NOT accept 'correct_retry' (dropped — first_attempt_correct is the sole first-vs-retry signal)", () => {
    const allowed = allowedOutcomesFromMigration063();
    assert.ok(allowed);
    assert.equal(allowed.has('correct_retry'), false);
  });
});
