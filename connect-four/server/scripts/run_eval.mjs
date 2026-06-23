#!/usr/bin/env node
// run_eval.mjs — Deep Reveal eval harness, Phase 1: data collection.
//
// Usage (run from connect-four/):
//   node server/scripts/run_eval.mjs                                   # new run
//   node server/scripts/run_eval.mjs eval_results_2026-06-23T10.jsonl  # resume

import { readFileSync, appendFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
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

// ── Resolve output file ────────────────────────────────────────────────────
const ts = new Date().toISOString().replace(/:/g, '-').replace(/\.\d+Z$/, 'Z');
const outputFile = process.argv[2] ?? `server/scripts/eval_results_${ts}.jsonl`;

// ── Load already-processed IDs (resume mode) ──────────────────────────────
const processedIds = new Set();
if (process.argv[2] && existsSync(outputFile)) {
  const lines = readFileSync(outputFile, 'utf8').split('\n').filter(Boolean);
  for (const line of lines) {
    try { const r = JSON.parse(line); if (r.id) processedIds.add(r.id); } catch {}
  }
  console.log(`Resuming ${outputFile} — ${processedIds.size} entries already done`);
} else {
  console.log(`New run → ${outputFile}`);
}

// ── Load eval set ──────────────────────────────────────────────────────────
const evalSet = JSON.parse(readFileSync(join(__dirname, 'eval_set_small.json'), 'utf8'));

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
      context_outcome: null,
      context_error: null,
      llm_error: null,
      prompt: null,
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
      context = await buildExplainContext(entry.board_state, entry.move_played, 1, solver);
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
    record.prompt = context.prompt;
    record.allowed_set = context.allowedSet ?? null;
    // Override correct_move with the column buildExplainContext actually put in the
    // prompt. eval_set.json uses a different tiebreaker for tied-score positions,
    // which can produce a different column than selectContrastMove's centerMost rule.
    if (context.contrastCol !== undefined) record.correct_move = context.contrastCol;

    const board = new Board(entry.board_state);
    const aliasMap = context.zoneAliasMap ?? {};

    // ── Step 2: Attempt 1 ─────────────────────────────────────────────────
    let raw1;
    try {
      raw1 = await callLLM(context.prompt);
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
      raw2 = await callLLM(context.prompt);
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
