#!/usr/bin/env node
/**
 * fill-candidate-pools.mjs — bring every puzzle category up to the N=20 active-puzzle serving
 * floor on a target environment (FR-003, FR-004), and retire-and-refill the three
 * metadata-graded categories flagged stale by T008's audit (FR-005, D1).
 *
 * Why this exists (D-a, spec 057):
 *   The existing pool-fill tooling — `POST /api/admin/candidates/:id/approve` /
 *   `approve-batch`, `generate_all_candidates.mjs` — is `requireLocalhost`-gated
 *   (`server/adminAuth.js`) and/or solver-bound (the c4solver binary is not on Railway), so
 *   neither can reach staging or production. This script fills a target environment's pools
 *   directly via the Supabase **service-role** client:
 *     - PROMOTE queued `candidates` rows for that same environment where they exist
 *       (requires the environment's `candidates` table to carry a populated `correct_cols`
 *       column — see the "correct_cols may not exist" note below).
 *     - Otherwise GENERATE fresh candidates locally (against local's c4solver — the only
 *       place the solver binary runs) and insert the resulting rows directly into the
 *       TARGET environment's `puzzles` table, bypassing that environment's `candidates`
 *       table entirely (there is no admin UI reachable there to later approve them).
 *
 * D1 (retire-and-refill, resolved 2026-08-03): for `overcut`/`undercut`/`z_threat`, before
 * computing the floor shortfall, this script re-derives `highlight_metadata` for every live
 * row against the CURRENT detector (mirrors `repair-overcut-highlight-metadata.js`'s
 * dry-run/diff logic, extended to all three categories) and retires (`is_active=false` /
 * `status='rejected'`) every row that no longer matches identically. No in-place repair is
 * attempted and no second repair script is written — a retired row's category is simply
 * refilled back to the floor by the same promote-or-generate logic as any other category.
 *
 * IMPORTANT — `correct_cols` may not exist on the target environment (OI seen 2026-08-04):
 *   staging and production still carry only the legacy `correct_col` singular scalar as of
 *   this writing (`061_correct_cols.sql` not yet applied — see
 *   docs/deployment_steps.md § "Spec 057 — content pools"). This script PROBES **both**
 *   `candidates.correct_cols` (the promotion source) and `puzzles.correct_cols` (the write
 *   target for EVERY insert path — promote and generate alike route through
 *   `buildPromotedPuzzleRow`, which always sets `correct_cols`; see
 *   `server/promotePuzzleRow.js:41-43`). If `candidates.correct_cols` is absent, promotion is
 *   skipped and every below-floor category falls through to GENERATE. If `puzzles.correct_cols`
 *   is absent, that is fatal for BOTH remedy paths — the script hard-stops with `process.exit(1)`
 *   rather than proceeding to guaranteed-failing inserts. Re-run after the migration ships.
 *
 * Safety (mirrors `repair-overcut-highlight-metadata.js` exactly):
 *   - `--env` selects local | staging | production; there is no default. You must name the target.
 *   - Refuses to touch production unless `--i-understand-this-is-production` is also passed.
 *   - `--dry-run` is the DEFAULT posture: you must pass `--apply` to write anything.
 *   - Requires typing `Yes` (exact) at an interactive prompt before any write, twice for production.
 *   - Never rewrites/retires a row whose re-derived metadata is byte-identical (JSONB
 *     key-order canonicalized — see memory project_lesson_answer_set_invariant.md).
 *
 * Usage:
 *   node server/scripts/fill-candidate-pools.mjs --env staging               # dry-run report
 *   node server/scripts/fill-candidate-pools.mjs --env staging --apply
 *   node server/scripts/fill-candidate-pools.mjs --env production --apply --i-understand-this-is-production
 *   node server/scripts/fill-candidate-pools.mjs --help
 *
 * See docs/deployment_steps.md § "Spec 057 — content pools" for the full runbook.
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { createSolverProcess } from '../c4solver-wrapper.js';
import {
  checkOvercutPredicate,
  checkUndercutPredicate,
  checkZThreatPredicate,
  generateCandidates,
} from '../candidate-generator.js';
import { Board, detectOvercutBeneficiary, detectUndercutVictim, detectZThreat } from '../classifier.js';
import { buildPromotedPuzzleRow } from '../promotePuzzleRow.js';
import { CATEGORY_ORDER } from '../categories.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FLOOR = 20;

const STAGING_REF = 'jkqilynpshutqcceopdn';
const PRODUCTION_REF = 'kxtqwsumojtexokrtlfp';

const ENVS = {
  local:      { file: '.env',            ref: null },
  staging:    { file: '.env.staging',    ref: STAGING_REF },
  production: { file: '.env.production', ref: PRODUCTION_REF },
};

// Categories D1's retire-and-refill applies to (metadata-graded, T008's audit scope).
const RETIRE_AND_REFILL_CATEGORIES = new Set(['overcut', 'undercut', 'z_threat']);

// Detector wiring for the retire-and-refill audit. `check*` is the current predicate (matches
// repair-overcut-highlight-metadata.js's use of checkOvercutPredicate); `detect*` supplies the
// raw correctCols so an "ambiguous" (2+ valid columns) row can be told apart from a row that
// simply "no longer matches at all" — the same distinction the overcut repair script makes.
const AUDIT_DETECTORS = {
  overcut:   { check: checkOvercutPredicate,  detect: (b, s) => detectOvercutBeneficiary(b, s) },
  undercut:  { check: checkUndercutPredicate, detect: (b, s) => detectUndercutVictim(b, s) },
  z_threat:  { check: checkZThreatPredicate,  detect: (b, s) => detectZThreat(b, s) },
};

// Generic, pedagogically-reviewed-later placeholder prompts for freshly generated content.
// Categories with existing live rows reuse THOSE rows' own real goal_prompt at insert time
// where available; this map is the fallback for categories with none (figure_7, j_shape,
// z_threat, claimeven, odd_even_threat — none had an active local row as of 2026-08-04) and
// for the always-generic categories.
const DEFAULT_GOAL_PROMPTS = {
  immediate_threat:  'Win the game this move. Which column completes four in a row for green?',
  forced_block:      'Your opponent threatens to win next move. Which column blocks their four in a row?',
  double_threat:     'Create two winning threats at once. Which column makes an unstoppable fork?',
  forced_win:        'You have a forced win. Play the move that starts the winning sequence.',
  forbidden_columns: 'Avoid columns that hand your opponent an immediate win.',
  odd_even_threat:   'Find the column where parity control turns your threat into an unstoppable one.',
  z_threat:          'Identify the column where a Z-threat gives you unstoppable parity control.',
  claimeven:         'Find the column where claiming the even square secures the win by parity.',
  undercut:          'Two threats stack in the same column — the lower one wins first. Find the undercut.',
  overcut:           'Find the move that overcomes your opponent by playing above their intended threat.',
  figure_7:          'Spot the Figure-7 pattern and play the key move to exploit it.',
  j_shape:           'Complete the J-shape pattern with the move that finishes it.',
};

function printHelp() {
  console.log(`
fill-candidate-pools.mjs — bring every puzzle category to the N=${FLOOR} active-puzzle floor on a
target environment (FR-003, FR-004), retiring-and-refilling stale overcut/undercut/z_threat rows
along the way (FR-005, D1).

Options:
  --env NAME       REQUIRED. One of: local | staging | production. No default — name the target.
  --apply          Actually write. Without it, the script only reports (dry run).
  --category CAT   Restrict to a single category instead of all 12 (see server/categories.js).
  --i-understand-this-is-production
                   Required in addition to --apply when --env production.
  --help, -h       Show this help and exit 0 without connecting to anything.

Exit codes: 0 = nothing to do (every category already at/above the floor, no drift);
            1 = error; 2 = remedy needed (below floor, or retire-and-refill drift found).

Examples:
  node server/scripts/fill-candidate-pools.mjs --env staging
  node server/scripts/fill-candidate-pools.mjs --env staging --category overcut --apply
  node server/scripts/fill-candidate-pools.mjs --env production --apply --i-understand-this-is-production
`);
}

// Parse .env manually — dotenv is not reliably available (see project memory
// reference_supabase_connection.md).
function parseEnv(filePath) {
  const out = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
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

/** Stable-key JSON so JSONB key-order drift does not false-flag every row as changed. */
function canon(value) {
  return JSON.stringify(value, (_k, v) =>
    (v && typeof v === 'object' && !Array.isArray(v))
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]]))
      : v);
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (a) => { rl.close(); resolve(a); }));
}

/** Probe whether `table.correct_cols` exists on the target — staging/production may not have it
 *  yet (061_correct_cols.sql unapplied). Returns true/false; never throws. */
async function hasCorrectColsColumn(sb, table) {
  const { error } = await sb.from(table).select('correct_cols').limit(1);
  if (!error) return true;
  // PostgREST reports an unknown column as a 42703-coded error whose message names the column.
  if (error.code === '42703' || /correct_cols/.test(error.message ?? '')) return false;
  // Unexpected error shape — surface it rather than silently degrading.
  throw new Error(`probing ${table}.correct_cols failed: ${error.message}`);
}

/** Classify one overcut/undercut/z_threat row against the CURRENT detector. Pure — no writes. */
async function inspectRow(category, row, solver) {
  const { check, detect } = AUDIT_DETECTORS[category];
  const scores = await solver.query(row.move_string);
  const raw = detect(new Board(row.move_string), scores);
  const res = check(row.move_string, scores);

  if (!res.passes) {
    const kind = (raw.correctCols?.length ?? 0) > 1 ? 'ambiguous' : 'no_longer_matches';
    return { kind, reason: raw.reason ?? null, cols: raw.correctCols ?? [] };
  }
  if (canon(res.highlight_metadata) === canon(row.highlight_metadata)) {
    return { kind: 'identical', reason: raw.reason ?? null };
  }
  return {
    kind: 'stale',
    reason: raw.reason ?? null,
    highlight_metadata: res.highlight_metadata,
    category_evidence: res.category_evidence,
  };
}

/** Run the D1 retire-and-refill audit for one category. Read-only — returns a plan, writes nothing. */
async function auditCategory(sb, category, solver) {
  const plan = { stale: [], ambiguous: [], no_longer_matches: [], identical: 0 };
  // Scope the audit to the SAME population `activeCount` counts (active puzzles, pending
  // candidates) — an already-retired puzzles row or already-rejected candidates row that still
  // fails the current detector must NOT be re-planned as a retire, or plannedRetireCountByCategory
  // double-counts rows activeCount never included in the first place (Finding 3).
  for (const [table, activeFilter, activeValue] of [['puzzles', 'is_active', true], ['candidates', 'status', 'pending']]) {
    const { data, error } = await sb
      .from(table)
      .select('id, move_string, highlight_metadata')
      .eq('category', category)
      .eq(activeFilter, activeValue);
    if (error) throw new Error(`QUERY ERROR on ${table}/${category}: ${error.message}`);
    for (const row of data) {
      const verdict = await inspectRow(category, row, solver);
      if (verdict.kind === 'identical') { plan.identical++; continue; }
      plan[verdict.kind].push({ table, activeFilter, row, verdict });
    }
  }
  return plan;
}

/** Count active puzzles for a category on the target env. */
async function activeCount(sb, category) {
  const { count, error } = await sb
    .from('puzzles')
    .select('id', { count: 'exact', head: true })
    .eq('category', category)
    .eq('is_active', true);
  if (error) throw new Error(`QUERY ERROR counting puzzles/${category}: ${error.message}`);
  return count ?? 0;
}

/** Fetch up to `limit` promotable pending candidates for a category, or [] if correct_cols is absent. */
async function promotableCandidates(sb, category, limit, correctColsAvailable) {
  if (!correctColsAvailable) return [];
  const selectCols = 'id, category, move_string, status, highlight_metadata, correct_cols, category_evidence, highlight_cells';
  const { data, error } = await sb
    .from('candidates')
    .select(selectCols)
    .eq('category', category)
    .eq('status', 'pending')
    .not('correct_cols', 'is', null)
    .limit(limit);
  if (error) throw new Error(`QUERY ERROR fetching candidates/${category}: ${error.message}`);
  return (data ?? []).filter((c) => Array.isArray(c.correct_cols) && c.correct_cols.length > 0);
}

/** Pick a real, previously-served goal_prompt for a category on this env, if one exists. */
async function harvestGoalPrompt(sb, category) {
  const { data } = await sb
    .from('puzzles')
    .select('goal_prompt, difficulty')
    .eq('category', category)
    .limit(1);
  if (data && data[0]?.goal_prompt) return { goalPrompt: data[0].goal_prompt, difficulty: data[0].difficulty ?? 2 };
  return { goalPrompt: DEFAULT_GOAL_PROMPTS[category], difficulty: 2 };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) { printHelp(); process.exit(0); }

  const envName = args[args.indexOf('--env') + 1];
  if (!args.includes('--env') || !ENVS[envName]) {
    console.error('ERROR: --env is required and must be one of: local | staging | production');
    console.error('       Run with --help for usage.');
    process.exit(1);
  }
  const apply = args.includes('--apply');
  const prodAck = args.includes('--i-understand-this-is-production');
  const categoryArg = args.includes('--category') ? args[args.indexOf('--category') + 1] : null;
  if (categoryArg && !CATEGORY_ORDER.includes(categoryArg)) {
    console.error(`ERROR: unknown --category ${categoryArg}. Valid: ${CATEGORY_ORDER.join(', ')}`);
    process.exit(1);
  }
  const categories = categoryArg ? [categoryArg] : CATEGORY_ORDER;

  if (envName === 'production' && apply && !prodAck) {
    console.error('ABORT: --env production with --apply also requires --i-understand-this-is-production.');
    process.exit(1);
  }

  const envPath = path.join(__dirname, '..', ENVS[envName].file);
  if (!fs.existsSync(envPath)) {
    console.error(`ERROR: env file not found at ${envPath}`);
    process.exit(1);
  }
  const env = parseEnv(envPath);
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(`ERROR: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing from ${ENVS[envName].file}`);
    process.exit(1);
  }

  // Guard: the env file's URL must actually match the environment the caller named.
  const expectedRef = ENVS[envName].ref;
  if (expectedRef && !env.SUPABASE_URL.includes(expectedRef)) {
    console.error(`ABORT: --env ${envName} expects project ref ${expectedRef}, but ${ENVS[envName].file} points at ${env.SUPABASE_URL}`);
    process.exit(1);
  }
  if (envName !== 'production' && env.SUPABASE_URL.includes(PRODUCTION_REF)) {
    console.error(`ABORT: ${ENVS[envName].file} points at the PRODUCTION ref. Refusing.`);
    process.exit(1);
  }

  console.log(`Target: ${envName.toUpperCase()}  (${env.SUPABASE_URL})`);
  console.log(`Mode:   ${apply ? 'APPLY (will write)' : 'DRY RUN (no writes)'}\n`);

  const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const solver = createSolverProcess();

  const report = []; // per-category remedy entries
  let anyRemedyNeeded = false;

  try {
    const correctColsAvailable = await hasCorrectColsColumn(sb, 'candidates');
    if (!correctColsAvailable) {
      console.log(`⚠️  ${envName} candidates.correct_cols does NOT exist (061_correct_cols.sql not applied).`);
      console.log('    Promotion is unavailable here; every below-floor category falls through to GENERATE.\n');
    }
    // Both PROMOTE and GENERATE insert into `puzzles` via buildPromotedPuzzleRow, which always
    // sets `correct_cols` (server/promotePuzzleRow.js:41-43) — so the WRITE TARGET, not just
    // `candidates`, must be probed too (Finding 4). An absent column here is fatal for every
    // remedy path, not just promotion.
    const puzzlesCorrectColsAvailable = await hasCorrectColsColumn(sb, 'puzzles');
    if (!puzzlesCorrectColsAvailable) {
      console.log(`⚠️  ${envName} puzzles.correct_cols does NOT exist (061_correct_cols.sql not applied).`);
    }

    // ═══ PHASE 1: PLAN — entirely read-only, runs regardless of --apply ═══════════════════════

    // D1 retire-and-refill audits (overcut/undercut/z_threat only).
    const retirePlans = {};
    for (const category of categories) {
      if (!RETIRE_AND_REFILL_CATEGORIES.has(category)) continue;
      const plan = await auditCategory(sb, category, solver);
      const drift = plan.stale.length + plan.ambiguous.length + plan.no_longer_matches.length;
      retirePlans[category] = plan;
      console.log(`[audit] ${category}: identical=${plan.identical} stale=${plan.stale.length} ambiguous=${plan.ambiguous.length} no_longer_matches=${plan.no_longer_matches.length}`);
      if (drift > 0) anyRemedyNeeded = true;
    }
    const plannedRetireCountByCategory = {};
    let totalPlannedRetires = 0;
    for (const [category, plan] of Object.entries(retirePlans)) {
      const puzzleRetires = ['stale', 'ambiguous', 'no_longer_matches']
        .flatMap((kind) => plan[kind])
        .filter((item) => item.table === 'puzzles').length;
      plannedRetireCountByCategory[category] = puzzleRetires;
      totalPlannedRetires += plan.stale.length + plan.ambiguous.length + plan.no_longer_matches.length;
    }

    // Per-category floor remedy plan (shortfall accounts for rows this run WILL retire).
    for (const category of categories) {
      const before = await activeCount(sb, category);
      const currentActive = before - (plannedRetireCountByCategory[category] ?? 0);
      const shortfall = Math.max(0, FLOOR - currentActive);

      if (shortfall === 0) {
        report.push({ category, before, currentActive, shortfall: 0, remedy: 'none', promoteCount: 0, generateCount: 0 });
        console.log(`[${category}] active=${currentActive} — at/above floor (${FLOOR}). No remedy needed.`);
        continue;
      }

      anyRemedyNeeded = true;
      const promotable = await promotableCandidates(sb, category, shortfall, correctColsAvailable);
      const toPromote = promotable.slice(0, shortfall);
      const toGenerate = shortfall - toPromote.length;
      const remedy = toPromote.length > 0 && toGenerate > 0
        ? 'promote+generate'
        : toPromote.length > 0 ? 'promote' : 'generate';

      report.push({ category, before, currentActive, shortfall, remedy, promoteCount: toPromote.length, generateCount: toGenerate, toPromote });
      console.log(`[${category}] active=${currentActive} shortfall=${shortfall} → remedy=${remedy} (promote ${toPromote.length}, generate ${toGenerate})`);
    }

    console.log('\n=== Per-category remedy report ===');
    for (const r of report) {
      console.log(`  ${r.category.padEnd(18)} active=${String(r.currentActive).padStart(3)} shortfall=${String(r.shortfall).padStart(3)} remedy=${r.remedy}`);
    }
    if (totalPlannedRetires > 0) {
      console.log(`\nRetire-and-refill: ${totalPlannedRetires} drifted overcut/undercut/z_threat row(s) (puzzles+candidates) would be retired.`);
    }

    // HARD STOP (Finding 4): every promote/generate remedy inserts into `puzzles` with a
    // non-null `correct_cols`. If that column doesn't exist on the target's `puzzles` table,
    // proceeding would guarantee a 400 (or a silently dropped column) on every insert —
    // a warning here is not enough, because a dry-run report showing remedy=generate/promote
    // would otherwise read as "this will work."
    // Computed once, reused by both the hard-stop check above and the CONFIRM prompt below.
    const totalPromote = report.reduce((s, r) => s + r.promoteCount, 0);
    const totalGenerate = report.reduce((s, r) => s + r.generateCount, 0);
    if (!puzzlesCorrectColsAvailable && (totalPromote > 0 || totalGenerate > 0)) {
      console.error(`\nABORT: ${envName} puzzles.correct_cols does not exist (061_correct_cols.sql not applied on this target).`);
      console.error('       PROMOTE and GENERATE both insert via buildPromotedPuzzleRow (server/promotePuzzleRow.js),');
      console.error('       which always writes correct_cols — every insert into puzzles would fail or silently');
      console.error(`       drop the answer column. Apply 061_correct_cols.sql on ${envName} before re-running.`);
      console.error(`       (${totalPromote} promote + ${totalGenerate} generate row(s) would otherwise be attempted.)`);
      // Finding 5: set an exit code and return (not process.exit) so `finally { solver.destroy?.() }`
      // below still runs and the spawned c4solver child isn't orphaned.
      process.exitCode = 1;
      return;
    }

    if (!anyRemedyNeeded) {
      console.log(`\n✅ Every category is at/above the N=${FLOOR} floor and overcut/undercut/z_threat show no drift. Nothing to do.`);
      process.exitCode = 0;
      return;
    }

    if (!apply) {
      console.log('\nDry run — nothing was written. Re-run with --apply to fill/retire.');
      process.exitCode = 2;
      return;
    }

    // ═══ PHASE 2: CONFIRM — required before ANY write ═════════════════════════════════════════
    console.log(`\nAbout to: retire ${totalPlannedRetires} row(s), promote ${totalPromote}, generate ${totalGenerate} fresh puzzle(s) on ${envName.toUpperCase()}.`);
    const first = await ask(`Type "Yes" to proceed: `);
    if (first !== 'Yes') { console.log('Aborted.'); process.exitCode = 1; return; }
    if (envName === 'production') {
      const second = await ask('This is PRODUCTION. Type "Yes" again to confirm: ');
      if (second !== 'Yes') { console.log('Aborted.'); process.exitCode = 1; return; }
    }

    // ═══ PHASE 3: APPLY ════════════════════════════════════════════════════════════════════════

    // Retire drifted rows first (D1) — the per-category shortfall above already assumed this ran.
    const toRetire = [];
    for (const [category, plan] of Object.entries(retirePlans)) {
      for (const kind of ['stale', 'ambiguous', 'no_longer_matches']) {
        for (const item of plan[kind]) toRetire.push({ category, ...item });
      }
    }
    let retired = 0;
    for (const { table, row } of toRetire) {
      const patch = table === 'puzzles' ? { is_active: false } : { status: 'rejected' };
      const { error } = await sb.from(table).update(patch).eq('id', row.id);
      if (error) { console.error(`  FAILED retiring ${table}/${row.id}: ${error.message}`); continue; }
      retired++;
    }

    // Promote + generate per category.
    for (const r of report) {
      if (r.remedy === 'none') continue;
      const { goalPrompt, difficulty } = await harvestGoalPrompt(sb, r.category);

      for (const candidate of r.toPromote) {
        const { error: insertErr } = await sb.from('puzzles').insert(buildPromotedPuzzleRow(candidate, {
          goalPrompt, goalPredicateType: r.category, difficulty,
        }));
        if (insertErr) { console.error(`  FAILED promoting candidate ${candidate.id}: ${insertErr.message}`); continue; }
        const { error: updateErr } = await sb.from('candidates')
          .update({ status: 'approved', reviewed_at: new Date().toISOString() })
          .eq('id', candidate.id);
        if (updateErr) console.error(`  WARNING: promoted ${candidate.id} but failed to mark candidates row approved: ${updateErr.message}`);
      }

      if (r.generateCount > 0) {
        console.log(`  generating ${r.generateCount} fresh ${r.category} candidate(s) locally (this calls the real c4solver)...`);
        const { candidates: generated } = await generateCandidates(r.category, r.generateCount);
        for (const c of generated) {
          const candidateLike = {
            category: c.category,
            move_string: c.move_string,
            highlight_metadata: c.highlight_metadata,
            correct_cols: c.correctCols,
            highlight_cells: c.highlight_cells,
            category_evidence: c.category_evidence,
          };
          const { error: insertErr } = await sb.from('puzzles').insert(buildPromotedPuzzleRow(candidateLike, {
            goalPrompt, goalPredicateType: r.category, difficulty,
          }));
          if (insertErr) console.error(`  FAILED inserting generated ${r.category} row: ${insertErr.message}`);
        }
        if (generated.length < r.generateCount) {
          console.error(`  WARNING: only generated ${generated.length}/${r.generateCount} for ${r.category} (solver attempt cap reached) — category may remain below floor. Re-run to top up.`);
        }
      }
    }

    console.log(`\n✅ Apply complete. Retired ${retired} row(s). Re-run without --apply to confirm the pool is now clean.`);
  } finally {
    solver.destroy?.();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
