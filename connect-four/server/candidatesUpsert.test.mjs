// Two DB-free source-parse assertions (per the batch's test-seam note — no test in
// this repo seeds a live database; a mock-based DB-seeding test was explicitly
// rejected, research.md D10): (a) migration 062 defines a UNIQUE INDEX on
// candidates(generation_run_id, move_string); (b) the candidate-insert retry call
// site in server/index.js uses upsert(..., { onConflict, ignoreDuplicates: true })
// rather than a bare .insert(rows). Together these prove a retried insert after a
// simulated post-commit acknowledgment loss cannot duplicate a row. FR-012.
//
// Mirrors connect-four/tests/blunder/blunderTagConstraint.test.js's migration-parsing
// precedent.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATION_PATH = path.join(__dirname, 'migrations', '062_candidates_generation_run_unique.sql');
const INDEX_JS_PATH = path.join(__dirname, 'index.js');

describe('migration 062 — candidates unique index', () => {
  it('creates a UNIQUE INDEX on public.candidates (generation_run_id, move_string)', () => {
    assert.ok(fs.existsSync(MIGRATION_PATH), `${MIGRATION_PATH} does not exist`);
    const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');

    const m = sql.match(/CREATE\s+UNIQUE\s+INDEX[^;]*ON\s+public\.candidates\s*\(([^)]*)\)/is);
    assert.ok(m, 'migration 062 must contain a CREATE UNIQUE INDEX on public.candidates(...)');

    const cols = m[1].split(',').map((c) => c.trim());
    assert.deepEqual(cols, ['generation_run_id', 'move_string']);
  });
});

describe('candidate-insert retry — upsert/ignoreDuplicates, not a bare insert', () => {
  it("the retry call site uses .upsert(rows, { onConflict: 'generation_run_id,move_string', ignoreDuplicates: true })", () => {
    const source = fs.readFileSync(INDEX_JS_PATH, 'utf8');

    assert.ok(
      !/supabase\.from\('candidates'\)\.insert\(rows\)/.test(source),
      "server/index.js must not call supabase.from('candidates').insert(rows) directly — " +
      'a retried plain insert of an already-committed batch would violate the migration 062 ' +
      'unique index and fail the whole batched statement atomically.'
    );

    const upsertMatch = source.match(
      /supabase\.from\('candidates'\)\.upsert\(\s*rows\s*,\s*\{([^}]*)\}\s*\)/s
    );
    assert.ok(upsertMatch, "expected supabase.from('candidates').upsert(rows, { ... }) in server/index.js");

    const optionsSource = upsertMatch[1];
    assert.match(optionsSource, /onConflict:\s*'generation_run_id,move_string'/);
    assert.match(optionsSource, /ignoreDuplicates:\s*true/);
  });
});
