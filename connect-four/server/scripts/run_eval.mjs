#!/usr/bin/env node
// DEPRECATED (2026-07-01): the old LLM-explanation eval is retired — it is no longer evaluated.
// The reason feature-vector eval is `compute.mjs`; a glossary-derived prompt evaluator will replace
// this runner. `run_eval.mjs` + `eval_set_*.json` + `buildExplainContext` are swept when that lands.
// Do not build new work on this file.
// run_eval.mjs — Deep Reveal eval harness, Phase 1: data collection.
//
// Usage (run from connect-four/):
//   node server/scripts/run_eval.mjs <eval_set.json> [output.jsonl] [--no-llm]
//
// Flags (may appear anywhere; positional args ignore them):
//   --no-llm   Skip the LLM annotation calls entirely. Still builds the explain context,
//              solver ground-truth, prompt, prompt_data and feature_vector, and writes a
//              valid JSON-lines record per position (LLM fields stay null) so the frontend
//              reader does not break. Use when iterating on the feature vector, not the prose.
//
// Examples:
//   node server/scripts/run_eval.mjs server/scripts/eval_set_large.json
//   node server/scripts/run_eval.mjs server/scripts/eval_set_failing.json out.jsonl  # resume if out.jsonl exists
//   node server/scripts/run_eval.mjs server/scripts/eval_set_large.json --no-llm

import { readFileSync, appendFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, basename } from 'path';
import { createSolverProcess } from '../c4solver-wrapper.js';
import { buildExplainContext, expandZoneAliases } from '../explainContext.js';
import { callLLM } from '../llmCoachHelpers.js';
import { validateAnnotation, normalizeZoneTags } from '../annotationGate.js';
import { Board } from '../classifier.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load .env ──────────────────────────────────────────────────────────────
const envPath = join(__dirname, '../.env');
const env = readFileSync(envPath, 'utf8');
env.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k?.trim() && !k.trim().startsWith('#')) process.env[k.trim()] = v.join('=').trim();
});

// ── Parse args (flags may appear anywhere; positional args ignore them) ────
const rawArgs = process.argv.slice(2);
const noLlm = rawArgs.includes('--no-llm');
const positional = rawArgs.filter(a => !a.startsWith('--'));

// ── Resolve eval set path and output file ─────────────────────────────────
const ts = new Date().toISOString().replace(/:/g, '-').replace(/\.\d+Z$/, 'Z');
const evalSetPath = positional[0] ?? join(__dirname, 'eval_set_small.json');
const evalSetStem = basename(evalSetPath, '.json');
const outputFile = positional[1] ?? `server/scripts/${evalSetStem}_results_${ts}.jsonl`;

// ── Load already-processed IDs (resume mode) ──────────────────────────────
const processedIds = new Set();
if (positional[1] && existsSync(outputFile)) {
  const lines = readFileSync(outputFile, 'utf8').split('\n').filter(Boolean);
  for (const line of lines) {
    try { const r = JSON.parse(line); if (r.id) processedIds.add(r.id); } catch { /* skip malformed line */ }
  }
  console.log(`Resuming ${outputFile} — ${processedIds.size} entries already done`);
} else {
  console.log(`New run → ${outputFile}`);
}
if (noLlm) console.log('--no-llm: skipping LLM annotation calls (context + feature vector only)');

// ── Load eval set ──────────────────────────────────────────────────────────
const evalSet = JSON.parse(readFileSync(evalSetPath, 'utf8'));

// ── Run ────────────────────────────────────────────────────────────────────
const solver = createSolverProcess();

try {
  for (const entry of evalSet) {
    if (processedIds.has(entry.id)) {
      process.stdout.write(`  skip  ${entry.id}\n`);
      continue;
    }

    process.stdout.write(`  proc  ${entry.id} (${entry.pattern_category})... `);

    const record = {
      id: entry.id,
      board_state: entry.board_state,
      move_played: entry.move_played,
      correct_move: entry.correct_move,
      pattern_category: entry.pattern_category,
      predicates: entry.predicates,
      severity: entry.severity,
      is_sparse: entry.is_sparse ?? null,
      runtime_is_sparse: null,
      lookahead_fired: null,
      premove_scores: null,
      played_scores: null,
      best_scores: null,
      premove_best_col: null,
      premove_best_score: null,
      lookahead_null_reason: null,
      context_outcome: null,
      context_error: null,
      llm_error: null,
      prompt: null,
      prompt_data: null,
      feature_vector: null,
      allowed_set: null,
      attempt1_response: null,
      attempt1_passed: null,
      attempt1_failures: [],
      attempt2_response: null,
      attempt2_passed: null,
      attempt2_failures: [],
      final_response: null,
    };

    // ── Step 1: Build explain context ─────────────────────────────────────
    let context;
    try {
      // prompt_data look-ahead config: 13-ply window, dedupe-by-score pruning, no budget cap
      // (only depth limits the search). Matches server/scripts/print_lookahead.mjs.
      context = await buildExplainContext(entry.board_state, entry.move_played, 1, solver, {
        alwaysLookahead: true,
        lookaheadDepth: 13,
        lookaheadBudget: null,
        lookaheadDedupeByScore: true,
      });
    } catch (err) {
      record.context_outcome = 'error';
      record.context_error = err.message;
      appendFileSync(outputFile, JSON.stringify(record) + '\n');
      process.stdout.write(`context_error\n`);
      continue;
    }

    if (!context) {
      record.context_outcome = 'null_returned';
      appendFileSync(outputFile, JSON.stringify(record) + '\n');
      process.stdout.write(`null_returned\n`);
      continue;
    }
    if (context.allMovesEqual) {
      record.context_outcome = 'all_moves_equal';
      appendFileSync(outputFile, JSON.stringify(record) + '\n');
      process.stdout.write(`all_moves_equal\n`);
      continue;
    }
    if (context.trivial) {
      record.context_outcome = 'trivial';
      appendFileSync(outputFile, JSON.stringify(record) + '\n');
      process.stdout.write(`trivial\n`);
      continue;
    }

    record.context_outcome = 'success';
    record.runtime_is_sparse = context.isSparse ?? null;
    record.lookahead_fired = context.lookaheadFired ?? null;
    record.prompt = context.prompt;
    record.prompt_data = context.promptData ?? null;
    record.feature_vector = context.featureVector ?? null;
    record.allowed_set = context.allowedSet ?? null;
    // Override correct_move with the column buildExplainContext actually put in the
    // prompt. eval_set.json uses a different tiebreaker for tied-score positions,
    // which can produce a different column than selectContrastMove's centerMost rule.
    if (context.contrastCol !== undefined) record.correct_move = context.contrastCol;

    // ── Solver ground-truth fields (for the judge's grounding-sufficiency check) ──
    // Each query is guarded individually: board_state + move can be a terminal/won
    // position, which the solver rejects with "Invalid position" — an unguarded
    // query would crash the whole run. On throw, the field stays null and we continue.
    try {
      record.premove_scores = await solver.query(entry.board_state);
    } catch { record.premove_scores = null; }
    try {
      record.played_scores = await solver.query(entry.board_state + String(entry.move_played));
    } catch { record.played_scores = null; }
    try {
      // Use the OVERRIDDEN record.correct_move (the column the prompt treats as "better").
      record.best_scores = await solver.query(entry.board_state + String(record.correct_move));
    } catch { record.best_scores = null; }
    if (Array.isArray(record.premove_scores)) {
      let bestCol = 0;
      for (let c = 1; c < record.premove_scores.length; c++) {
        if (record.premove_scores[c] > record.premove_scores[bestCol]) bestCol = c;
      }
      record.premove_best_col = bestCol;
      record.premove_best_score = record.premove_scores[bestCol];
    }
    // Coarse null-reason tag. We only have runtime_is_sparse / lookahead_fired here.
    // Distinguishing finer cases (empty_tally vs no_branch_delta) would require
    // runSparseLookahead to return a reason — left as a future follow-up.
    if (record.lookahead_fired === true) {
      record.lookahead_null_reason = null;
    } else if (record.runtime_is_sparse === false) {
      record.lookahead_null_reason = 'not_sparse';
    } else {
      record.lookahead_null_reason = 'sparse_no_winner';
    }

    // ── --no-llm short-circuit ────────────────────────────────────────────
    // Everything above (context, solver ground-truth, prompt, prompt_data,
    // feature_vector) is already on the record. The LLM fields keep their null/[]
    // defaults, which is a valid record shape the frontend already handles.
    if (noLlm) {
      appendFileSync(outputFile, JSON.stringify(record) + '\n');
      process.stdout.write(`no-llm (skipped)\n`);
      continue;
    }

    const board = new Board(entry.board_state);
    const aliasMap = context.zoneAliasMap ?? {};

    // ── Step 2: Attempt 1 ─────────────────────────────────────────────────
    let raw1;
    try {
      ({ content: raw1 } = await callLLM(context.prompt));
    } catch (err) {
      record.llm_error = err.message;
      appendFileSync(outputFile, JSON.stringify(record) + '\n');
      process.stdout.write(`llm_error (attempt 1)\n`);
      continue;
    }
    const exp1 = expandZoneAliases(normalizeZoneTags(raw1), aliasMap);
    const result1 = validateAnnotation(exp1, board, context.allowedSet);
    record.attempt1_response = exp1;
    record.attempt1_passed = result1.valid;
    record.attempt1_failures = result1.failures;

    if (result1.valid) {
      record.final_response = exp1;
      appendFileSync(outputFile, JSON.stringify(record) + '\n');
      process.stdout.write(`ok (attempt 1)\n`);
      continue;
    }

    // ── Step 3: Attempt 2 (retry) ─────────────────────────────────────────
    let raw2;
    try {
      ({ content: raw2 } = await callLLM(context.prompt));
    } catch (err) {
      record.llm_error = err.message;
      appendFileSync(outputFile, JSON.stringify(record) + '\n');
      process.stdout.write(`llm_error (attempt 2)\n`);
      continue;
    }
    const exp2 = expandZoneAliases(normalizeZoneTags(raw2), aliasMap);
    const result2 = validateAnnotation(exp2, board, context.allowedSet);
    record.attempt2_response = exp2;
    record.attempt2_passed = result2.valid;
    record.attempt2_failures = result2.failures;

    if (result2.valid) {
      record.final_response = exp2;
      process.stdout.write(`ok (attempt 2)\n`);
    } else {
      process.stdout.write(`ANNOTATION_FAILED\n`);
    }

    appendFileSync(outputFile, JSON.stringify(record) + '\n');
  }
} finally {
  solver.destroy();
}

console.log(`\nDone. Results → ${outputFile}`);
