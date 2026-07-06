#!/usr/bin/env node
// compute.mjs — unified reason-eval entry point.
//
// Evidence pass (always): compute reason-engine evidence for each board in --input and write
// nested-shape JSONL rows { id, evidence, groundTruth|null }.
//
// LLM answerer (--llm): call an OpenAI model with the narrator vector; emit answers for grading.
// The evidence pass always runs first, so the vectors handed to the LLM are freshly recomputed from
// the current engine (the --out file is overwritten; a pre-existing one is never reused).
//
// Usage (from connect-four/):
//   node server/scripts/compute.mjs --input <boards.jsonl> [--out <name>]
//        [--llm [--condition A|B|C|D|all] [--n 3] [--model X]]
//
// --out names the EVIDENCE file (default: reason_evidence_<stem>.jsonl in server/scripts/).
//   A bare name → server/scripts/<name>; a path with '/' → resolved from cwd.
//
// Evidence row shape:  { id, evidence, groundTruth|null }
// Answers row shape:   { id, pattern_category, condition, run_index, model, feature_vector,
//                        answer, raw, parse_error, call_error }
//
// Conditions (ablation — only relevant for --llm):
//   A — full:                        pruned full narrator vector (production-faithful headline).
//   B — board-only:                  glossary + {movestring, perspective, playedCol, bestCol}.
//   C — features-without-movestring: pruned full vector with movestring removed.
//   D — grounded render prompt:      staged boards + causal frames + reading key (P4); condition-D
//                                    answer lines also carry a `render_decision` record for the grader.

import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, isAbsolute, resolve, basename } from 'path';
import { createSolverProcess } from '../c4solver-wrapper.js';
import { computeReason } from './reason_engine/reasonEngine.mjs';
import { toNarratorVector, pruneVector } from './reasonNarratorVector.mjs';
import { buildReasonRenderModel, assembleGroundedPrompt, buildRenderDecision } from './renderReasonModel.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load .env (manual parse — dotenv is not reliable here; matches run_eval.mjs) ──
const envPath = join(__dirname, '../.env');
const env = readFileSync(envPath, 'utf8');
env.split('\n').forEach((line) => {
  const [k, ...v] = line.split('=');
  if (k?.trim() && !k.trim().startsWith('#')) process.env[k.trim()] = v.join('=').trim();
});

// ── Args ──────────────────────────────────────────────────────────────────────
function argVal(name, def) {
  const i = process.argv.indexOf(name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : def;
}

const HELP = `compute.mjs — unified reason-eval entry point.

Two passes over the boards in --input:
  Evidence pass (always) — compute reason-engine evidence per board and write nested-shape
                           JSONL rows { id, evidence, groundTruth|null } to the --out file.
  LLM answerer (--llm)   — call an OpenAI model with the narrator vector and emit answers for
                           grading. The evidence pass always runs first, so vectors are freshly
                           recomputed just before the LLM call (the --out file is overwritten,
                           never reused).

Usage (from connect-four/):
  node server/scripts/compute.mjs --input <boards.jsonl> [--out <name>] [--ids <id,...>]
       [--llm [--condition A|B|C|D|all] [--n 3] [--model X]]

Options:
  --input <path>        REQUIRED. Boards JSONL to evaluate (absolute, or resolved from cwd).
  --out <name>          Evidence file. Bare name → server/scripts/<name>; a path with '/' →
                        resolved from cwd. Default: reason_evidence_<input-stem>.jsonl.
                        Should match reason_evidence_*.jsonl to appear in the /admin/fv-suff dropdown.
  --ids <id,...>        Process ONLY the boards whose 'id' field is in this comma-separated list
                        (e.g. eval-51,eval-53). Any board without a matching 'id' is skipped.
                        Filters BOTH the evidence pass and the --llm answerer. Default: all boards.
  --llm                 Run the LLM answerer pass after the evidence pass.
  --condition A|B|C|D|all  Ablation condition(s), comma-separated or "all" (all = A,B,C,D). Default: A.
                          A — full pruned narrator vector (production-faithful headline).
                          B — board-only: glossary + {movestring, perspective, playedCol, bestCol}.
                          C — features without movestring.
                          D — grounded render prompt (P4): staged boards + causal frames + reading key;
                              condition-D answer lines also carry a render_decision record for the grader.
  --n <N>               Runs per record per condition (--llm only). Default: 3.
  --model <id>          OpenAI model (--llm only). Default: $EXPLAIN_MODEL.
  -h, --help            Show this help and exit.

Requires OPENAI_API_KEY (and a model) for --llm; loaded from connect-four/server/.env.`;

// ── CLI-only arg parsing (imperative; exits/side-effects on missing args) ──────
// Guarded so importing this module (e.g. from tests, for buildEvidenceRow) never triggers
// process.exit or depends on --input being present. Everything below this point that the CLI
// entry needs (INPUT, evidenceOut, useLlm, ts, N, model, CONDITIONS) is declared with `let` at
// module scope and populated only when this file is the entry point.
let inputArg, INPUT, inputStem, evidenceOut, useLlm, ts, N, model, CONDITIONS, idFilter;
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(HELP);
    process.exit(0);
  }
  inputArg = argVal('--input', null);
  if (!inputArg) { console.error('Error: --input <boards.jsonl> is required'); process.exit(1); }
  INPUT = isAbsolute(inputArg) ? inputArg : resolve(process.cwd(), inputArg);
  inputStem = basename(INPUT).replace(/\.(jsonl|json)$/i, '');

  // Evidence --out: bare name → server/scripts/<name>; path with '/' → cwd-relative.
  const outArg = argVal('--out', null);
  evidenceOut = outArg
    ? (outArg.includes('/')
      ? (isAbsolute(outArg) ? outArg : resolve(process.cwd(), outArg))
      : join(__dirname, outArg))
    : join(__dirname, `reason_evidence_${inputStem}.jsonl`);

  if (!/^reason_evidence_[\w.-]*\.jsonl$/.test(basename(evidenceOut))) {
    console.warn(`⚠️  "${basename(evidenceOut)}" does not match reason_evidence_*.jsonl — it will NOT appear in the /admin/fv-suff dropdown.`);
  }

  // --llm flags
  useLlm = process.argv.includes('--llm');
  ts = new Date().toISOString().replace(/:/g, '-').replace(/\.\d+Z$/, 'Z');
  N = parseInt(argVal('--n', '3'), 10);
  model = argVal('--model', process.env.EXPLAIN_MODEL);
  const condArg = (argVal('--condition', 'A') || 'A').toLowerCase();
  CONDITIONS = condArg === 'all' ? ['A', 'B', 'C', 'D'] : condArg.toUpperCase().split(',');

  const idsArg = argVal('--ids', null);
  idFilter = idsArg ? new Set(idsArg.split(',').map((s) => s.trim()).filter(Boolean)) : null;
}

// ── Evidence pass ─────────────────────────────────────────────────────────────
// Build one evidence row; isolates a throwing/terminal board (ported from run_eval.mjs:120-126).
export async function buildEvidenceRow(f, i, solver) {
  const id = f.id ?? `eval-${i + 1}`;
  const groundTruth = f.expectedCase != null
    ? { case: f.expectedCase, gate: f.expectedGate ?? null, exhaustive: f.expectedExhaustive ?? null, bucket: f.bucket ?? null, matches: null }
    : null;
  try {
    const evidence = await computeReason(f.movestring, f.playedCol, { solver });
    if (groundTruth) groundTruth.matches = evidence.case === f.expectedCase;
    return { id, evidence, error: null, groundTruth };
  } catch (err) {
    return { id, evidence: null, error: err.message, groundTruth };
  }
}

async function runEvidence() {
  const fixture = readFileSync(INPUT, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const solver = createSolverProcess();
  const rows = [];
  writeFileSync(evidenceOut, ''); // fresh run; crash-safe appends below
  if (idFilter) {
    const present = new Set(fixture.map((f) => f.id).filter((id) => id != null));
    const missing = [...idFilter].filter((id) => !present.has(id));
    if (missing.length) console.warn(`⚠️  --ids: not found in input, skipped: ${missing.join(', ')}`);
    console.log(`--ids filter active: processing ${[...idFilter].filter((id) => present.has(id)).length} of ${fixture.length} boards`);
  }
  try {
    for (let i = 0; i < fixture.length; i++) {
      if (idFilter && !idFilter.has(fixture[i].id)) continue; // skip boards not in --ids (by file `id`)
      const row = await buildEvidenceRow(fixture[i], i, solver);
      rows.push(row);
      appendFileSync(evidenceOut, JSON.stringify(row) + '\n'); // crash-safe incremental write
      if (row.error) process.stdout.write(`  ${row.id}: ERROR ${row.error}\n`);
    }
  } finally {
    solver.destroy();
  }
  const mism = rows.filter((r) => r.groundTruth?.matches === false).length;
  const errored = rows.filter((r) => r.error).length;
  const labeled = rows.filter((r) => r.groundTruth !== null).length;
  console.log(`wrote ${rows.length} evidence rows to ${evidenceOut}`);
  console.log(`case mismatches vs fixture ground truth: ${mism}${labeled < rows.length ? ` (${rows.length - labeled} rows unlabeled)` : ''}${errored ? `; ${errored} errored` : ''}`);
  return rows;
}

// ── LLM answerer — ported verbatim from explain_from_vector.mjs ──────────────
const GLOSSARY_PATH = join(__dirname, '../../../docs/architecture/feature-vector-glossary.md');

// ── Project the vector for a given ablation condition ───────────────────────────
// pruneVector (shared with production via reasonNarratorVector.mjs) honors the glossary's
// absence-contract: empty containers / null are dropped; meaningful scalars (0, false) are kept.
function projectVector(fv, condition) {
  if (condition === 'B') {
    // board-only: the bare decision, no engineered reason fields. `perspective` is the reason
    // vector's `player` (the side whose move is under scrutiny).
    return {
      movestring: fv.movestring ?? '',
      perspective: fv.player,
      playedCol: fv.playedCol,
      bestCol: fv.bestCol,
    };
  }
  const pruned = pruneVector(fv);
  if (condition === 'C') { const { movestring, ...rest } = pruned; return rest; }
  return pruned; // A
}

// ── Build the isolated prompt: glossary + vector + task ─────────────────────────
const TASK = `# Your task

You are reading the feature vector below for a single Connect Four decision. Using ONLY the
glossary above and the facts in this vector (and the board its \`movestring\` describes), explain
**why the played move was a blunder** — the load-bearing reason, grounded in reproducible board
features. Do not invent tactics, threats, or cells that are not present in the vector or directly
derivable from \`movestring\`. If the vector does not let you determine something, say so in
\`unsure_about\` rather than guessing — an honest "couldn't tell" is expected and is NOT a failure.

Return ONLY a single JSON object (no prose, no markdown fences) with EXACTLY these keys:

{
  "better_move":      <integer 1-7, the better column in 1-INDEXED DISPLAY (column 1 = leftmost)>,
  "played_outcome":   "win" | "draw" | "loss",   // result of the PLAYED move, with best play
  "best_outcome":     "win" | "draw" | "loss",   // result of the BETTER move, with best play
  "mechanism":        "<1-3 sentences spoken directly to the player as their coach: the load-bearing reason the played move is worse. 2nd person, plain Connect Four language, NO internal/field/engine terms>",
  "key_cells":        ["c5r4", ...],   // squares the mechanism rests on, cNrM (1-indexed); [] if none
  "fields_relied_on": ["case", "lostResource.tacticTag", "opponentPunishment.tie.kind", ...],
  "unsure_about":     "<what the vector did NOT let you determine, or empty string>",
  "confidence":       "high" | "medium" | "low"
}

Notes:
- \`better_move\` is 1-INDEXED display (1-7). The vector's \`bestCol\` is 0-indexed, so add 1.
- \`key_cells\` use the glossary's \`cNrM\` convention (1-indexed column and row).
- \`mechanism\` is the ONLY player-facing field: write it as a coach speaking to the player in the
  2nd person ("you", "your opponent" — never third-person analyst voice, never by color). Use plain
  Connect Four words (threat, fork, double threat, four-in-a-row line, block, central, claimeven).
  NEVER name a data structure, field path, the solver, the score, a histogram, a "window", or a
  "completing cell" in \`mechanism\`; if you relied on one, put it in \`fields_relied_on\` instead. On a
  position that is lost with best play, do NOT tell the player they are lost — frame the better move
  as the toughest defense that makes the opponent work hardest.
- \`fields_relied_on\` must list the actual vector field paths your reasoning used — this reveals
  whether your claims trace to engineered fields or to re-deriving from \`movestring\`.
- Never claim a "win" as guaranteed by the single move unless it completes four-in-a-row; the
  \`_with_best_play\` outcomes mean "with correct continuation".`;

export function buildPromptForCondition(glossary, fv, condition) {
  if (condition === 'D') {
    return `${assembleGroundedPrompt(buildReasonRenderModel(fv))}

---

${TASK}`;
  }
  const projected = projectVector(fv, condition);
  return `${glossary}

---

${TASK}

# Feature vector

\`\`\`json
${JSON.stringify(projected, null, 2)}
\`\`\``;
}

// The per-record render-decision ground-truth record for the grader (spec §3f). Only condition D
// carries it (A/B/C use the glossary+JSON path). Never throws: a build failure (novel vector) yields
// null, matching how the per-row call_error path already tolerates render failures.
export function renderDecisionForCondition(nv, condition) {
  if (condition !== 'D') return null;
  try { return buildRenderDecision(nv); } catch { return null; }
}

// ── OpenAI call (own fn; reads EXPLAIN_MODEL; larger budget than callLLM) ────────
let useJsonFormat = true; // disabled globally if the model rejects response_format
async function callExplainLLM(prompt) {
  const body = {
    model,
    messages: [{ role: 'user', content: prompt }],
    max_completion_tokens: 4000, // reasoning + output share this budget on gpt-5.x
  };
  if (useJsonFormat) body.response_format = { type: 'json_object' };

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text();
    if (useJsonFormat && /response_format/i.test(errBody)) {
      // Model doesn't support json_object — disable and retry once without it.
      useJsonFormat = false;
      return callExplainLLM(prompt);
    }
    throw new Error(`OpenAI API error ${res.status}: ${errBody}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

// ── Lenient JSON parse (handles fenced or prose-wrapped output) ──────────────────
function parseAnswer(raw) {
  try { return { answer: JSON.parse(raw), parse_error: null }; } catch {}
  const m = raw && raw.match(/\{[\s\S]*\}/);
  if (m) {
    try { return { answer: JSON.parse(m[0]), parse_error: null }; } catch (e) {
      return { answer: null, parse_error: e.message };
    }
  }
  return { answer: null, parse_error: 'no JSON object found in response' };
}

async function runLlm(evidenceRows) {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set in environment');
  if (!model) throw new Error('EXPLAIN_MODEL not set (and no --model given)');

  const glossaryText = readFileSync(GLOSSARY_PATH, 'utf8');
  // Answers file: always derived from input stem + launch timestamp (never overloads evidence --out).
  const answersOut = join(__dirname, `fv_suff_answers_${inputStem}_${ts}.jsonl`);

  console.log(`Answerer: ${evidenceRows.length} records × ${N} runs × ${CONDITIONS.length} condition(s) [${CONDITIONS.join(',')}]`);
  console.log(`Model: ${model}`);
  console.log(`Input:  ${INPUT}`);
  console.log(`Output: ${answersOut}`);
  if (existsSync(answersOut)) console.log('(appending to existing output file)');

  let done = 0, failed = 0;
  for (const row of evidenceRows) {
    if (!row.evidence || row.evidence.notABlunder) continue; // error row or non-blunder: nothing to narrate
    // toNarratorVector produces the UN-pruned narrator vector; per-condition pruning happens inside
    // buildPrompt via projectVector. feature_vector in the output line is always the full nv so the
    // grader and /admin/fv-suff can re-project under any condition without recomputing.
    const nv = toNarratorVector(row.evidence);
    for (const condition of CONDITIONS) {
      let prompt;
      try {
        prompt = buildPromptForCondition(glossaryText, nv, condition);
      } catch (err) {
        // Prompt-build failure (e.g. condition D's buildReasonRenderModel throwing
        // UncoveredVectorFieldError / classifyCausalLink no-match on a novel record) must not
        // abort the whole multi-record job — record it as a per-row call_error, same shape as
        // an LLM call error below, and move on to the next record.
        const line = {
          id: row.id,
          pattern_category: row.evidence.case,
          condition,
          run_index: 0,
          model,
          feature_vector: nv,
          answer: null,
          raw: null,
          parse_error: null,
          call_error: err.message,
          render_decision: null,
        };
        appendFileSync(answersOut, JSON.stringify(line) + '\n');
        failed++;
        process.stdout.write(`  ${row.id} ${condition} run0: ERROR ${err.message}\n`);
        continue;
      }
      const render_decision = renderDecisionForCondition(nv, condition);
      for (let run_index = 0; run_index < N; run_index++) {
        // Per-call error isolation: a single failure drops ONE line, not the run.
        let raw = null, answer = null, parse_error = null, call_error = null;
        try {
          raw = await callExplainLLM(prompt);
          ({ answer, parse_error } = parseAnswer(raw));
        } catch (err) {
          call_error = err.message;
        }
        const line = {
          id: row.id,
          pattern_category: row.evidence.case,
          condition,
          run_index,
          model,
          feature_vector: nv,
          answer,
          raw,
          parse_error,
          call_error,
          render_decision,
        };
        appendFileSync(answersOut, JSON.stringify(line) + '\n');
        if (call_error || parse_error) {
          failed++;
          process.stdout.write(`  ${row.id} ${condition} run${run_index}: ERROR ${call_error ?? parse_error}\n`);
        } else {
          done++;
          process.stdout.write(`  ${row.id} ${condition} run${run_index}: ok\n`);
        }
      }
    }
  }
  console.log(`\nDone. ${done} ok, ${failed} failed → ${answersOut}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
// Guarded: only runs when this file is executed directly (CLI entry), never on import.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  (async () => {
    // Vectors are ALWAYS recomputed from the solver here — immediately before the LLM pass — and the
    // --out file is overwritten. We never reuse a stale on-disk evidence file: it would silently
    // replay vectors from a prior engine version against the current LLM/glossary.
    const evidenceRows = await runEvidence();
    if (useLlm) {
      await runLlm(evidenceRows);
    }
  })();
}
