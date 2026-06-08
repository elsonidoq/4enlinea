/**
 * FR-T06 — Automated corpus annotation gate.
 *
 * Fetches blunder rows from the DB (where pattern_category IS NOT NULL AND
 * direction IS NOT NULL), runs each position through buildExplainContext,
 * and validates a synthetic explanation with validateAnnotation.
 *
 * Pass criterion per position:
 *   - buildExplainContext returns a non-null, non-allMovesEqual result
 *   - validateAnnotation(syntheticExplanation, board, allowedSet).valid === true
 *
 * Positions where buildExplainContext returns null or allMovesEqual are counted
 * as "skipped" (not added to pass/fail denominator).
 *
 * Run with:
 *   node --env-file=connect-four/server/.env connect-four/server/scripts/corpus_annotation_check.mjs
 * from the project root, or:
 *   node --env-file=server/.env server/scripts/corpus_annotation_check.mjs
 * from connect-four/.
 */

import { createClient } from '@supabase/supabase-js';
import { buildExplainContext } from '../explainContext.js';
import { validateAnnotation } from '../annotationGate.js';
import { Board } from '../classifier.js';
import { createSolverProcess } from '../c4solver-wrapper.js';

const SYNTHETIC_EXPLANATION = 'This was not the right move here.';
const TARGET_COUNT = 50;

// ---------------------------------------------------------------------------
// Silence validateAnnotation's debug console.log calls during the run.
// ---------------------------------------------------------------------------
function withSilencedConsole(fn) {
  const originalLog = console.log;
  console.log = () => {};
  try {
    return fn();
  } finally {
    console.log = originalLog;
  }
}

async function withSilencedConsoleAsync(fn) {
  const originalLog = console.log;
  console.log = () => {};
  try {
    return await fn();
  } finally {
    console.log = originalLog;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// Fetch blunder rows
console.error('Fetching blunder rows from DB...');
const { data: rows, error: fetchError } = await supabase
  .from('blunders')
  .select('id, board_state, move_played, pattern_category, direction')
  .not('pattern_category', 'is', null)
  .not('direction', 'is', null)
  .limit(200);

if (fetchError) {
  console.error('DB fetch error:', fetchError.message);
  process.exit(1);
}

if (!rows || rows.length === 0) {
  console.error('No tagged blunder rows found in DB. Cannot run corpus gate.');
  process.exit(1);
}

const totalFetched = rows.length;
console.error(`Fetched ${totalFetched} blunder rows (target: ≥${TARGET_COUNT})`);
if (totalFetched < TARGET_COUNT) {
  console.error(`WARNING: Fewer than ${TARGET_COUNT} rows found. Gate will run on ${totalFetched} rows.`);
}

const solver = createSolverProcess();

let passed = 0;
let failed = 0;
let skipped = 0;
const failures = [];

for (let i = 0; i < rows.length; i++) {
  const row = rows[i];
  const { id, board_state, move_played, pattern_category, direction } = row;

  process.stderr.write(`\r[${i + 1}/${rows.length}] ${board_state} col=${move_played} tag=${pattern_category} dir=${direction}    `);

  let result;
  try {
    result = await withSilencedConsoleAsync(() =>
      buildExplainContext(board_state, move_played, 1, solver)
    );
  } catch (err) {
    failed++;
    failures.push({
      id,
      board_state,
      move_played,
      pattern_category,
      direction,
      reason: 'buildExplainContext threw',
      detail: err.message,
      pChecks: [],
    });
    continue;
  }

  if (result === null) {
    // Contrast move could not be determined — skip (not a gate failure)
    skipped++;
    continue;
  }

  if (result.allMovesEqual) {
    // All moves are settled — skip
    skipped++;
    continue;
  }

  // Validate synthetic explanation against board + allowedSet
  const board = new Board(board_state);
  let validation;
  try {
    validation = withSilencedConsole(() =>
      validateAnnotation(SYNTHETIC_EXPLANATION, board, result.allowedSet)
    );
  } catch (err) {
    failed++;
    failures.push({
      id,
      board_state,
      move_played,
      pattern_category,
      direction,
      reason: 'validateAnnotation threw',
      detail: err.message,
      pChecks: [],
    });
    continue;
  }

  if (validation.valid) {
    passed++;
  } else {
    failed++;
    failures.push({
      id,
      board_state,
      move_played,
      pattern_category,
      direction,
      reason: 'validateAnnotation failed',
      pChecks: validation.failures,
    });
  }
}

process.stderr.write('\n');
solver.destroy();

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const evaluated = passed + failed;
const passRate = evaluated > 0 ? Math.round((passed / evaluated) * 100) : 0;

console.log('');
console.log('═══════════════════════════════════════════════════════════');
console.log('  FR-T06 CORPUS ANNOTATION GATE RESULTS');
console.log('═══════════════════════════════════════════════════════════');
console.log(`  Total rows fetched : ${totalFetched} (target: ≥${TARGET_COUNT})`);
console.log(`  Evaluated          : ${evaluated}`);
console.log(`  Passed             : ${passed}`);
console.log(`  Failed             : ${failed}`);
console.log(`  Skipped            : ${skipped} (null or allMovesEqual)`);
console.log(`  Pass rate          : ${passed}/${evaluated} (${passRate}%)`);
console.log('');

if (totalFetched < TARGET_COUNT) {
  console.log(`  ⚠ SHORTFALL: Only ${totalFetched} rows available (target ≥${TARGET_COUNT})`);
  console.log(`    Gate result is INFORMATIONAL only until ≥${TARGET_COUNT} rows exist.`);
  console.log('');
}

if (passRate >= 95) {
  console.log(`  ✓ GATE PASSES (${passed}/${evaluated} ≥ 95%)`);
} else {
  console.log(`  ✗ GATE FAILS — pass rate ${passRate}% is below 95% threshold`);
  console.log('    This is a blocking failure per FR-T06.');
}

if (failures.length > 0) {
  console.log('');
  console.log('─── Failure details ───────────────────────────────────────');
  for (const f of failures) {
    console.log(`  id          : ${f.id}`);
    console.log(`  board_state : ${f.board_state}`);
    console.log(`  move_played : ${f.move_played}`);
    console.log(`  tag         : ${f.pattern_category}`);
    console.log(`  direction   : ${f.direction}`);
    console.log(`  reason      : ${f.reason}`);
    if (f.detail) {
      console.log(`  detail      : ${f.detail}`);
    }
    if (f.pChecks && f.pChecks.length > 0) {
      console.log(`  P-failures  : ${f.pChecks.join(', ')}`);
    }
    console.log('  ─────────────────────────────────────────────────────');
  }
}

console.log('═══════════════════════════════════════════════════════════');
console.log('');
console.log('NOTE: FR-T06b (manual quality gate — compare 10 LLM explanations)');
console.log('is a human review step. It cannot be automated.');
console.log('Pending user action.');
