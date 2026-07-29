#!/usr/bin/env node
/**
 * audit_answer_ambiguity.mjs — find boards where the grader's accepted answer set disagrees
 * with the solver about which moves win.
 *
 * The invariant this enforces: a teaching board must never contain a winning move that is
 * unrelated to the concept being taught. Formally, for every audited board,
 *
 *     optimalCols ⊆ acceptedCols        (no winning move is graded wrong)
 *     acceptedCols ∩ optimalCols ≠ ∅    (the taught move actually wins)
 *
 * A board that violates either is a content defect: replace the board, never loosen the grader.
 *
 * Usage (from connect-four/):
 *   node server/scripts/audit_answer_ambiguity.mjs
 *   node server/scripts/audit_answer_ambiguity.mjs --lessons the-fork z-threats
 *   node server/scripts/audit_answer_ambiguity.mjs --puzzles --env local
 *   node server/scripts/audit_answer_ambiguity.mjs --puzzles double_threat --env local --verbose
 *   node server/scripts/audit_answer_ambiguity.mjs --help
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createSolverProcess } from '../c4solver-wrapper.js';
import { VALID_CATEGORIES } from '../categories.js';
import {
  optimalCols, acceptedCols,
  classifyAnswerSet as verdict, PASSING_VERDICTS as PASSING,
} from '../answerSetInvariant.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LESSONS_DIR = path.join(__dirname, '..', '..', 'lessons');

const ENV_FILES = { local: '.env', staging: '.env.staging', production: '.env.production' };

function printHelp() {
  console.log(`
audit_answer_ambiguity.mjs — find boards whose accepted answer set disagrees with the solver.

Checks each board against two rules:
  optimalCols ⊆ acceptedCols       every winning move is accepted
  acceptedCols ∩ optimalCols ≠ ∅   the taught move actually wins

Verdicts:
  OK                 both rules hold
  AMBIGUOUS          a solver-optimal column is graded wrong (the learner is told a
                     correct move is incorrect)
  SUBOPTIMAL-ANSWER  the accepted column(s) are not solver-optimal — the board teaches a
                     move a better one beats
  NO-CONCEPT         no column satisfies the category at all; the board is not a valid
                     puzzle for it
  LOST-POSITION      every legal move loses, so "optimal" only means "loses slowest" and the
                     two rules above do not apply. Reported for visibility, NOT a failure —
                     undercut lives here by definition (detectUndercutVictim only fires when
                     playing the column is losing)

Sources:
  lessons   socratic nodes (accepted = the single authored correctCol) and every
            confirmationChallenge (accepted = evaluatePredicate over all legal columns)
  puzzles   rows in the puzzles table, same grader

Options:
  --lessons [id...]     Audit lessons. With no ids, audits all. This is the default when
                        neither --lessons nor --puzzles is given.
  --puzzles [category]  Audit DB puzzle rows, optionally for one category. Requires --env.
  --env <env>           One of: local, staging, production. Reads
                        connect-four/server/${ENV_FILES.local} / ${ENV_FILES.staging} / ${ENV_FILES.production}.
  --verbose             Print a row for every board, not just the failing ones.
  --source <category>   Read-only. Generate candidates for the category and print those that
    [--count N]         satisfy the invariant, as replacement boards for an ambiguous lesson
                        board. Writes nothing. Default N = 3.
  --repair --yes        WRITES. Retires every failing puzzle row (is_active = false) and
                        generates solver-verified replacements to restore the pool size.
                        Requires --puzzles and --env. Lessons are never touched — a lesson
                        board is authored content, so fix it in /admin/lessons instead.
  --help, -h            Show this help.

Exits 1 if any board fails, 0 if all pass — so it can gate a release.

Why retire instead of delete: puzzle_attempts.puzzle_id is a FK onto puzzles with no
ON DELETE CASCADE, so deleting an attempted puzzle errors. Every serving query already
filters is_active = true, so retiring removes the board from circulation and is reversible.

Examples:
  node server/scripts/audit_answer_ambiguity.mjs
  node server/scripts/audit_answer_ambiguity.mjs --puzzles double_threat --env local
  node server/scripts/audit_answer_ambiguity.mjs --puzzles double_threat --env local --repair --yes
`);
}

function parseEnv(filePath) {
  const out = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[trimmed.slice(0, eq).trim()] = val;
  }
  return out;
}

// 0-indexed internally everywhere; only this function renders for a human, and the app shows
// learners 1-based columns, so print both.
const showCols = (cols) => cols.length ? `[${cols.join(',')}] (display ${cols.map(c => c + 1).join(',')})` : '[]';

function report(rows, { verbose }) {
  const failing = rows.filter(r => !PASSING.has(r.verdict));
  const shown = verbose ? rows : failing;
  for (const r of shown) {
    const flag = r.verdict === 'OK' ? '   ' : '>> ';
    console.log(`${flag}${r.verdict.padEnd(18)} ${r.where}`);
    console.log(`   ${' '.repeat(18)} board    ${r.moveString}`);
    console.log(`   ${' '.repeat(18)} accepted ${showCols(r.accepted)}`);
    console.log(`   ${' '.repeat(18)} optimal  ${showCols(r.optimal)}   scores ${JSON.stringify(r.scores)}`);
  }
  const counts = rows.reduce((acc, r) => { acc[r.verdict] = (acc[r.verdict] ?? 0) + 1; return acc; }, {});
  console.log(`\n${rows.length} board(s) audited — ` +
    Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join(', '));
  return failing.length;
}

async function auditLessons(solver, filterIds) {
  const rows = [];
  const files = fs.readdirSync(LESSONS_DIR).filter(f => /^lesson-\d+-.*\.json$/.test(f)).sort();
  for (const file of files) {
    const lesson = JSON.parse(fs.readFileSync(path.join(LESSONS_DIR, file), 'utf8'));
    if (filterIds.length && !filterIds.includes(lesson.id)) continue;

    const soc = lesson.socratic;
    if (soc && typeof soc.movestring === 'string' && Number.isInteger(soc.correctCol)) {
      const scores = await solver.query(soc.movestring);
      // SocraticScreen.jsx grades with `col === socratic.correctCol` — one column, client-side,
      // no predicate. That is only sound while the authored column is the UNIQUE optimum.
      const accepted = [soc.correctCol];
      rows.push({
        where: `${lesson.id} socratic`,
        moveString: soc.movestring,
        accepted, scores,
        optimal: optimalCols(scores),
        verdict: verdict(accepted, optimalCols(scores), scores),
      });
    }

    for (const [i, ch] of (lesson.confirmationChallenges ?? []).entries()) {
      const category = ch.goalPredicateType || lesson.confirmationCategory;
      const scores = await solver.query(ch.moveString);
      const accepted = acceptedCols(category, ch.moveString, scores, {
        correctCol: ch.correctCol,
        highlightMetadata: ch.highlightMetadata,
      });
      const optimal = optimalCols(scores);
      rows.push({
        where: `${lesson.id} challenge[${i}] (${category})`,
        moveString: ch.moveString,
        accepted, optimal, scores,
        verdict: verdict(accepted, optimal, scores),
      });
    }
  }
  return rows;
}

async function auditPuzzles(solver, category, env) {
  const envPath = path.join(__dirname, '..', ENV_FILES[env]);
  if (!fs.existsSync(envPath)) throw new Error(`env file not found: ${envPath}`);
  const cfg = parseEnv(envPath);
  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_SERVICE_ROLE_KEY);

  // Only active rows: every serving query filters is_active, so a retired board is already out
  // of circulation. Auditing retired rows would keep reporting boards we deliberately took out
  // and make a clean run impossible.
  let q = sb.from('puzzles')
    .select('id,category,move_string,correct_col,highlight_metadata')
    .eq('is_active', true);
  if (category) q = q.eq('category', category);
  const { data, error } = await q;
  if (error) throw new Error(`supabase: ${error.message}`);

  const rows = [];
  for (const p of data) {
    const scores = await solver.query(p.move_string);
    const accepted = acceptedCols(p.category, p.move_string, scores, {
      correctCol: p.correct_col,
      highlightMetadata: p.highlight_metadata,
    });
    const optimal = optimalCols(scores);
    rows.push({
      where: `puzzle ${p.id} (${p.category})`,
      moveString: p.move_string,
      accepted, optimal, scores,
      verdict: verdict(accepted, optimal, scores),
    });
  }
  return rows;
}

function supabaseFor(env) {
  const envPath = path.join(__dirname, '..', ENV_FILES[env]);
  if (!fs.existsSync(envPath)) throw new Error(`env file not found: ${envPath}`);
  const cfg = parseEnv(envPath);
  return import('@supabase/supabase-js')
    .then(({ createClient }) => createClient(cfg.SUPABASE_URL, cfg.SUPABASE_SERVICE_ROLE_KEY));
}

// Retire the failing rows and generate solver-verified replacements.
//
// Replacements are inserted straight into `puzzles` rather than going through
// candidates -> /api/admin/candidates/:id/approve, because there is nothing for a human to
// curate here: generateCandidates() grades through the same evaluatePredicate this audit
// uses, and every board is re-audited below before it is inserted.
async function repairPuzzles(category, env) {
  if (!category) throw new Error('--repair requires an explicit --puzzles <category>');

  const sb = await supabaseFor(env);

  // 1. Re-derive the failing set here rather than trusting an earlier printed run.
  let failing = [];
  {
    const solver = createSolverProcess();
    try {
      failing = (await auditPuzzles(solver, category, env)).filter(r => !PASSING.has(r.verdict));
    } finally { solver.destroy(); }
  }
  if (failing.length === 0) { console.log(`\nnothing to repair for ${category}`); return 0; }
  const failingIds = failing.map(r => r.where.match(/^puzzle (\S+)/)[1]);
  console.log(`\nretiring ${failingIds.length} ${category} puzzle(s) (is_active = false)`);

  // 2. Inherit the human-authored fields from an existing row of the same category, so
  //    replacements read identically to the pool they join. goal_prompt/difficulty/
  //    interaction_mode are category-level (the prompt is shared by every board in the
  //    category — see lesson-editor.md "coach.spoken.<category>.* is shared"), so any row
  //    of this category is a valid template, including one being retired.
  const { data: template, error: tplErr } = await sb.from('puzzles')
    .select('goal_prompt,difficulty,interaction_mode')
    .eq('category', category)
    .limit(1).maybeSingle();
  if (tplErr) throw new Error(`supabase: ${tplErr.message}`);
  if (!template) throw new Error(`no existing ${category} row to inherit goal_prompt from — repair by hand`);

  const { error: deacErr } = await sb.from('puzzles')
    .update({ is_active: false }).in('id', failingIds);
  if (deacErr) throw new Error(`supabase: ${deacErr.message}`);

  // 3. Generate replacements. generateCandidates caps at 400 attempts per call, so ask in
  //    batches with distinct seeds rather than one oversized request.
  const { generateCandidates } = await import('../candidate-generator.js');
  const wanted = failingIds.length;
  const fresh = [];
  for (let batch = 0; fresh.length < wanted && batch < 20; batch++) {
    const need = Math.min(25, wanted - fresh.length);
    const res = await generateCandidates(category, need, 1000 + batch);
    fresh.push(...res.candidates);
    console.log(`  batch ${batch + 1}: +${res.candidates.length} (${fresh.length}/${wanted})`);
    if (res.candidates.length === 0) break;
  }
  if (fresh.length === 0) throw new Error('generation produced nothing — pool left retired, nothing inserted');

  // 4. Re-audit every replacement against this script's own rules before it is inserted.
  //    "Generated by the fixed predicate" is a belief; this is the check.
  const rows = [];
  {
    const solver = createSolverProcess();
    try {
      for (const c of fresh.slice(0, wanted)) {
        const scores = await solver.query(c.move_string);
        const accepted = acceptedCols(category, c.move_string, scores, {
          correctCol: c.correct_col, highlightMetadata: c.highlight_metadata,
        });
        const v = verdict(accepted, optimalCols(scores), scores);
        if (v !== 'OK') { console.log(`  skipped a generated board (${v}): ${c.move_string}`); continue; }
        rows.push({
          category,
          move_string: c.move_string,
          goal_prompt: template.goal_prompt,
          goal_predicate_type: category,
          goal_predicate_params: {},
          cooperative_ai_moves: [],
          difficulty: template.difficulty,
          is_active: true,
          interaction_mode: template.interaction_mode,
          highlight_metadata: c.highlight_metadata ?? null,
          correct_col: c.correct_col ?? null,
          highlight_cells: c.highlight_cells ?? null,
          user_player: c.move_string.length % 2 === 0 ? 1 : 2,
          simulation_trace: c.category_evidence?.simulation_trace ?? [],
        });
      }
    } finally { solver.destroy(); }
  }

  const { error: insErr } = await sb.from('puzzles').insert(rows);
  if (insErr) throw new Error(`supabase: ${insErr.message}`);
  console.log(`inserted ${rows.length} replacement ${category} puzzle(s)`);
  return rows.length;
}

// Read-only: generate candidates for a category and print the ones that satisfy the invariant,
// as replacement boards for an ambiguous lesson board. Writes nothing.
async function sourceBoards(category, count) {
  const { generateCandidates } = await import('../candidate-generator.js');
  const found = [];
  for (let batch = 0; found.length < count && batch < 12; batch++) {
    const res = await generateCandidates(category, Math.max(count * 2, 10), 2000 + batch);
    if (res.candidates.length === 0) break;
    const solver = createSolverProcess();
    try {
      for (const c of res.candidates) {
        const scores = await solver.query(c.move_string);
        const accepted = acceptedCols(category, c.move_string, scores, {
          correctCol: c.correct_col, highlightMetadata: c.highlight_metadata,
        });
        const optimal = optimalCols(scores);
        if (verdict(accepted, optimal, scores) !== 'OK') continue;
        // Same bar verify_lesson_content.mjs applies to a lesson board: the position must not
        // already be lost for the side to move. A drill whose best move still loses teaches
        // resignation (see the "no lost-position lessons" rule).
        if (optimal.length === 0 || scores[optimal[0]] < 0) continue;
        found.push({ move_string: c.move_string, correct_col: c.correct_col ?? null,
          highlight_metadata: c.highlight_metadata ?? null, scores, accepted, optimal });
        if (found.length >= count) break;
      }
    } finally { solver.destroy(); }
  }
  console.log(`\n── ${found.length} verified ${category} board(s) ──`);
  for (const f of found) {
    console.log(`  ${f.move_string}`);
    console.log(`    userPlayer ${f.move_string.length % 2 === 0 ? 1 : 2}  correct_col ${f.correct_col}  accepted ${showCols(f.accepted)}  optimal ${showCols(f.optimal)}`);
    console.log(`    scores ${JSON.stringify(f.scores)}`);
    if (f.highlight_metadata) console.log(`    highlight_metadata ${JSON.stringify(f.highlight_metadata)}`);
  }
  return found.length;
}

function parseArgs(argv) {
  const opts = { lessons: null, puzzles: null, env: null, verbose: false, repair: false, yes: false,
    source: null, count: 3 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--verbose') opts.verbose = true;
    else if (a === '--repair') opts.repair = true;
    else if (a === '--yes') opts.yes = true;
    else if (a === '--source') opts.source = argv[++i];
    else if (a === '--count') opts.count = parseInt(argv[++i], 10);
    else if (a === '--env') opts.env = argv[++i];
    else if (a === '--lessons') {
      opts.lessons = [];
      while (argv[i + 1] && !argv[i + 1].startsWith('--')) opts.lessons.push(argv[++i]);
    } else if (a === '--puzzles') {
      opts.puzzles = { category: null };
      if (argv[i + 1] && !argv[i + 1].startsWith('--')) opts.puzzles.category = argv[++i];
    } else {
      throw new Error(`unknown argument: ${a}`);
    }
  }
  return opts;
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) { printHelp(); process.exit(0); }

  let opts;
  try { opts = parseArgs(argv); } catch (e) { console.error(e.message); printHelp(); process.exit(2); }

  if (opts.puzzles) {
    if (!opts.env) { console.error('--puzzles requires --env <local|staging|production>'); process.exit(2); }
    if (!ENV_FILES[opts.env]) { console.error(`--env must be one of: ${Object.keys(ENV_FILES).join(', ')}`); process.exit(2); }
    if (opts.puzzles.category && !VALID_CATEGORIES.has(opts.puzzles.category)) {
      console.error(`unknown category: ${opts.puzzles.category}`); process.exit(2);
    }
  }
  if (opts.source) {
    if (!VALID_CATEGORIES.has(opts.source)) { console.error(`unknown category: ${opts.source}`); process.exit(2); }
    const n = await sourceBoards(opts.source, opts.count);
    process.exit(n > 0 ? 0 : 1);
  }
  if (opts.repair) {
    if (!opts.puzzles?.category) { console.error('--repair requires --puzzles <category>'); process.exit(2); }
    if (!opts.yes) { console.error('--repair writes to the database; re-run with --yes to confirm'); process.exit(2); }
    await repairPuzzles(opts.puzzles.category, opts.env);
    // fall through: the audit below re-checks the repaired pool
  }

  const solver = createSolverProcess();
  let failures = 0;
  try {
    if (opts.puzzles) {
      console.log(`\n── DB puzzles${opts.puzzles.category ? ` (${opts.puzzles.category})` : ''} — ${opts.env} ──`);
      failures += report(await auditPuzzles(solver, opts.puzzles.category, opts.env), opts);
    }
    if (opts.lessons || !opts.puzzles) {
      console.log('\n── lessons ──');
      failures += report(await auditLessons(solver, opts.lessons ?? []), opts);
    }
  } finally {
    solver.destroy();   // the solver is a child process; without this the script hangs
  }
  process.exit(failures > 0 ? 1 : 0);
}

main().catch(err => { console.error(err); process.exit(1); });
