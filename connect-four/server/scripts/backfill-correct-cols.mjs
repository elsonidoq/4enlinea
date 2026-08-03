#!/usr/bin/env node
/**
 * backfill-correct-cols.mjs — recompute and store the solver-gated answer SET (`correct_cols`)
 * for every existing active `puzzles` and `candidates` row (spec 051, US3, FR-015/016/016a/016b/019).
 *
 * Why this is needed: `correct_cols` (migration 061_correct_cols.sql) did not exist when most rows
 * in this DB were created, so it is NULL on every pre-existing row. This script populates it by
 * calling the exact same `checkPredicate(category, moveString, scores, solver)` fresh generation
 * uses (server/candidate-generator.js) — never a simplified re-derivation (FR-015) — with `scores`
 * from a fresh `solver.query(moveString)` per row (never a stale stored column).
 *
 * "Active" row definition per table (verified at source, db-schema.md / research.md D5):
 *   - puzzles:    is_active = true
 *   - candidates: status = 'pending' (approved rows already became puzzles; rejected rows are dead)
 *
 * FR-016b — empty-but-non-null `correct_cols` is a data defect, not a valid state for an active
 * row. When `checkPredicate` returns `{ passes: false, correctCols: [] }` for a previously-active
 * row, this script DEACTIVATES it instead of writing `correct_cols: []`:
 *   - puzzles:    is_active = true -> false
 *   - candidates: has no is_active column (schema: server/migrations/011_category_slugs.sql) — the
 *     schema-equivalent of "take it out of active circulation" is status = 'pending' -> 'rejected'
 *     (a candidate-only decision made in this script, since FR-016b's own worked example only
 *     names `puzzles`; 'rejected' already exists in the CHECK constraint and is exactly the state
 *     a human reviewer would leave it in for the same reason), with `rejection_reason` recording why.
 *
 * Idempotency (FR-016) falls out for free: re-running recomputes the same deterministic function
 * of (category, move_string) each time, and checkPredicate's own centralized sort+sync (D6) fixes
 * the order — see tests/unit/checkPredicateSortAndScalarSync.test.js.
 *
 * Usage:
 *   node server/scripts/backfill-correct-cols.mjs --env local
 *   node server/scripts/backfill-correct-cols.mjs --env local --dry-run
 *   node server/scripts/backfill-correct-cols.mjs --env local --category undercut
 *   node server/scripts/backfill-correct-cols.mjs --help
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { createSolverProcess } from '../c4solver-wrapper.js';
import { checkPredicate } from '../candidate-generator.js';
import { VALID_CATEGORIES } from '../categories.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const STAGING_REF = 'jkqilynpshutqcceopdn';
const PRODUCTION_REF = 'kxtqwsumojtexokrtlfp';

const ENV_FILES = {
  local: '.env',
  staging: '.env.staging',
  production: '.env.production',
};

const DEACTIVATION_REASON = 'backfill-correct-cols.mjs: correct_cols empty after checkPredicate re-derivation (FR-016b)';

function printHelp() {
  console.log(`
backfill-correct-cols.mjs — recompute and store the solver-gated answer set (\`correct_cols\`) for
every existing active \`puzzles\`/\`candidates\` row, using the SAME \`checkPredicate\` generation
uses (never a simplified re-derivation).

"Active" per table: puzzles.is_active = true; candidates.status = 'pending'.

FR-016b: a row whose recomputed correctCols comes back empty is DEACTIVATED, not written with an
empty array while left active — puzzles: is_active -> false; candidates: status -> 'rejected'
(with rejection_reason set), since candidates has no is_active column.

Options:
  --env <env>        Required. One of: local, staging, production. Reads
                      connect-four/server/${ENV_FILES.local} / ${ENV_FILES.staging} / ${ENV_FILES.production}.
  --category <cat>   Optional. Restrict to one category (e.g. undercut). Default: all
                      VALID_CATEGORIES.
  --dry-run           Report the per-category before/after plan (including which rows would be
                      deactivated) with no writes, then exit.
  --help, -h          Show this help.

Examples:
  node server/scripts/backfill-correct-cols.mjs --env local --dry-run
  node server/scripts/backfill-correct-cols.mjs --env local
  node server/scripts/backfill-correct-cols.mjs --env local --category claimeven
`);
}

function parseEnv(filePath) {
  const out = {};
  const raw = fs.readFileSync(filePath, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ── Pure core (Pure Function Extraction pattern, testing-conventions.md) ───────────────────────

// Recompute one row's answer set via the SAME checkPredicate generation uses (FR-015). Exported
// for direct unit testing; the default `fetchResult` used by buildBackfillPlan below.
export async function computeCorrectColsForRow(category, moveString, solver) {
  const scores = await solver.query(moveString);
  return checkPredicate(category, moveString, scores, solver);
}

// Given a flat list of rows ({ id, table, category, move_string }) and a solver, build the write
// plan: which rows get an updated correct_cols, and which get deactivated (FR-016b).
// `fetchResult` is injectable so tests can substitute a stub without a live solver — production
// callers always use the default (the real checkPredicate).
export async function buildBackfillPlan(rows, solver, { fetchResult = computeCorrectColsForRow } = {}) {
  const updates = [];
  const deactivations = [];
  for (const row of rows) {
    const result = await fetchResult(row.category, row.move_string, solver);
    if (!result.passes || !result.correctCols || result.correctCols.length === 0) {
      deactivations.push({ id: row.id, table: row.table, category: row.category, move_string: row.move_string });
    } else {
      updates.push({
        id: row.id,
        table: row.table,
        category: row.category,
        correct_cols: result.correctCols,
      });
    }
  }
  return { updates, deactivations };
}

// Apply a plan against a supabase client. Batched (not sequential row-by-row awaits): one
// upsert per table per chunk for updates, one `.update().in()` per table per chunk for
// deactivations.
export async function applyPlan(supabase, plan) {
  const byTable = (list) => list.reduce((acc, r) => {
    (acc[r.table] ??= []).push(r);
    return acc;
  }, {});

  // Per-row `.update({...}).eq('id', id)` rather than a multi-row `.upsert(...)`: an upsert's
  // INSERT-path NOT NULL checks (category/move_string/goal_prompt/... are NOT NULL on both
  // tables) fire even when the row is expected to hit the ON CONFLICT UPDATE branch — verified at
  // source (a real run against local errored `null value in column "category" ... violates
  // not-null constraint` since this payload only ever carries id/correct_cols).
  // Batched via `Promise.all` over small chunks (research.md D5's own sanctioned alternative to a
  // single multi-row upsert) rather than sequential row-by-row awaits.
  for (const [table, rows] of Object.entries(byTable(plan.updates))) {
    for (const batch of chunk(rows, 20)) {
      const results = await Promise.all(batch.map((r) =>
        supabase.from(table).update({ correct_cols: r.correct_cols }).eq('id', r.id)
      ));
      const failed = results.find((res) => res.error);
      if (failed) throw new Error(`update failed on ${table}: ${failed.error.message}`);
    }
  }

  for (const [table, rows] of Object.entries(byTable(plan.deactivations))) {
    for (const batch of chunk(rows, 200)) {
      const ids = batch.map((r) => r.id);
      if (table === 'puzzles') {
        const { error } = await supabase.from('puzzles').update({ is_active: false }).in('id', ids);
        if (error) throw new Error(`deactivate failed on puzzles: ${error.message}`);
      } else if (table === 'candidates') {
        const { error } = await supabase.from('candidates')
          .update({ status: 'rejected', rejection_reason: DEACTIVATION_REASON })
          .in('id', ids);
        if (error) throw new Error(`deactivate failed on candidates: ${error.message}`);
      } else {
        throw new Error(`applyPlan: unknown table '${table}'`);
      }
    }
  }
}

// ── Reporting ────────────────────────────────────────────────────────────────────────────────

function countByCategory(rows) {
  return rows.reduce((acc, r) => { acc[r.category] = (acc[r.category] ?? 0) + 1; return acc; }, {});
}

function printCategoryReport(label, beforeCounts, deactivatedCounts) {
  console.log(`\n${label} — per-category before/after active-row counts:`);
  const categories = [...new Set([...Object.keys(beforeCounts), ...Object.keys(deactivatedCounts)])].sort();
  if (categories.length === 0) { console.log('  (no active rows)'); return; }
  for (const cat of categories) {
    const before = beforeCounts[cat] ?? 0;
    const deactivated = deactivatedCounts[cat] ?? 0;
    const after = before - deactivated;
    console.log(`  ${cat.padEnd(18)} before=${before}  deactivated=${deactivated}  after=${after}`);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  const dryRun = args.includes('--dry-run');
  const envIdx = args.indexOf('--env');
  const envName = envIdx !== -1 ? args[envIdx + 1] : undefined;
  const catIdx = args.indexOf('--category');
  const category = catIdx !== -1 ? args[catIdx + 1] : undefined;

  if (!envName) {
    console.error('ERROR: --env is required.\n');
    printHelp();
    process.exit(1);
  }
  if (!Object.prototype.hasOwnProperty.call(ENV_FILES, envName)) {
    console.error(`ERROR: --env must be one of: ${Object.keys(ENV_FILES).join(', ')}`);
    process.exit(1);
  }
  if (category && !VALID_CATEGORIES.has(category)) {
    console.error(`ERROR: unknown --category '${category}'. Known: ${[...VALID_CATEGORIES].join(', ')}`);
    process.exit(1);
  }

  const envPath = path.join(__dirname, '..', ENV_FILES[envName]);
  if (!fs.existsSync(envPath)) {
    console.error(`ERROR: env file not found at ${envPath}`);
    process.exit(1);
  }
  const env = parseEnv(envPath);
  const supabaseUrl = env.SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error(`ERROR: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not both set in ${envPath}`);
    process.exit(1);
  }

  if (envName === 'production' && !supabaseUrl.includes(PRODUCTION_REF)) {
    console.error(`ABORT: --env production but ${envPath} does not point at the known production ref (${PRODUCTION_REF}).`);
    process.exit(1);
  }
  if (envName === 'staging' && !supabaseUrl.includes(STAGING_REF)) {
    console.error(`ABORT: --env staging but ${envPath} does not point at the known staging ref (${STAGING_REF}).`);
    process.exit(1);
  }
  if (envName === 'local' && !supabaseUrl.includes('127.0.0.1') && !supabaseUrl.includes('localhost')) {
    console.error(`ABORT: --env local but SUPABASE_URL (${supabaseUrl}) does not look local.`);
    process.exit(1);
  }

  console.log(`Target env: ${envName} (${supabaseUrl})`);
  if (category) console.log(`Category filter: ${category}`);

  const supabase = createClient(supabaseUrl, serviceKey);

  // ── Fetch active rows from both tables ────────────────────────────────────────────────────
  let puzzleQuery = supabase.from('puzzles').select('id,category,move_string').eq('is_active', true);
  if (category) puzzleQuery = puzzleQuery.eq('category', category);
  const { data: puzzleRows, error: pErr } = await puzzleQuery;
  if (pErr) { console.error(`ERROR: failed to read puzzles: ${pErr.message}`); process.exit(1); }

  let candidateQuery = supabase.from('candidates').select('id,category,move_string').eq('status', 'pending');
  if (category) candidateQuery = candidateQuery.eq('category', category);
  const { data: candidateRows, error: cErr } = await candidateQuery;
  if (cErr) { console.error(`ERROR: failed to read candidates: ${cErr.message}`); process.exit(1); }

  const rows = [
    ...puzzleRows.map((r) => ({ ...r, table: 'puzzles' })),
    ...candidateRows.map((r) => ({ ...r, table: 'candidates' })),
  ];

  console.log(`\nActive rows found: ${puzzleRows.length} puzzles, ${candidateRows.length} candidates (${rows.length} total).`);
  if (rows.length === 0) { console.log('Nothing to do.'); return; }

  const beforeCounts = {
    puzzles: countByCategory(puzzleRows),
    candidates: countByCategory(candidateRows),
  };

  // ── Recompute (FR-015): the same checkPredicate() generation uses, fresh solver scores ──────
  const solver = createSolverProcess();
  let plan;
  try {
    plan = await buildBackfillPlan(rows, solver);
  } finally {
    solver.destroy(); // solver is a child process — always shut it down (try/finally, per house convention)
  }

  const deactivatedByTable = {
    puzzles: countByCategory(plan.deactivations.filter((d) => d.table === 'puzzles')),
    candidates: countByCategory(plan.deactivations.filter((d) => d.table === 'candidates')),
  };

  console.log(`\nRecompute complete: ${plan.updates.length} row(s) to update, ${plan.deactivations.length} row(s) to deactivate (FR-016b).`);
  if (plan.deactivations.length > 0) {
    console.log(`\nRows to deactivate (empty correctCols after checkPredicate re-derivation):`);
    for (const d of plan.deactivations) {
      console.log(`  - [${d.table}] ${d.id} (${d.category}) move_string=${d.move_string}`);
    }
  }

  printCategoryReport('puzzles', beforeCounts.puzzles, deactivatedByTable.puzzles);
  printCategoryReport('candidates', beforeCounts.candidates, deactivatedByTable.candidates);

  if (dryRun) {
    console.log('\n[--dry-run] No changes made.');
    return;
  }

  const answer = await ask(
    `\nWrite ${plan.updates.length} update(s) and ${plan.deactivations.length} deactivation(s) on ${envName}? Type "Yes" to confirm: `
  );
  if (answer !== 'Yes') {
    console.log('Aborted (confirmation not "Yes").');
    process.exit(1);
  }

  await applyPlan(supabase, plan);

  console.log(`\nDone. Updated ${plan.updates.length} row(s), deactivated ${plan.deactivations.length} row(s) on ${envName}.`);
}

// Only run main() when invoked as a script (`node backfill-correct-cols.mjs ...`), not when
// imported for its exported functions (buildBackfillPlan/applyPlan/computeCorrectColsForRow) by
// tests/unit/backfillCorrectColsIdempotency.test.js and tests/unit/backfillCorrectColsDeactivation.test.js.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('FAILED:', err.message);
    process.exit(1);
  });
}
