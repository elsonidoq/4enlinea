// Static schema test for migration 057 (Epic 8 — Onboarding Experience).
// Follows the no-DB-connection convention established by
// tests/blunder/blunderTagConstraint.test.js: parse the migration SQL file
// directly rather than requiring a live Postgres connection.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATION_FILE = path.join(
  __dirname, '..', '..', 'server', 'migrations', '057_users_onboarding_status.sql'
);

describe('migration 057 — users.onboarding_status', () => {
  const sql = fs.readFileSync(MIGRATION_FILE, 'utf8');

  it('adds an onboarding_status text column to users', () => {
    assert.match(
      sql,
      /ALTER TABLE\s+users\s+ADD COLUMN IF NOT EXISTS\s+onboarding_status\s+text/i
    );
  });

  it('is NOT NULL with a default of \'not_encountered\'', () => {
    assert.match(sql, /onboarding_status[^;]*NOT NULL/i);
    assert.match(sql, /onboarding_status[^;]*DEFAULT\s+'not_encountered'/i);
  });

  it('has a CHECK constraint allowing exactly the three-state enum', () => {
    const m = sql.match(/CHECK\s*\(\s*onboarding_status\s+IN\s*\(([^)]*)\)/i);
    assert.ok(m, 'expected a CHECK (onboarding_status IN (...)) constraint');
    const allowed = new Set([...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]));
    assert.deepEqual(
      [...allowed].sort(),
      ['not_encountered', 'seen', 'skipped']
    );
  });

  it('does not add any new grants (table-level grants already cover users)', () => {
    assert.doesNotMatch(sql, /^\s*GRANT\b/im);
  });
});
