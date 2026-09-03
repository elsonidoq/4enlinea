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

import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, isAbsolute, resolve, basename } from 'path';
import { createSolverProcess } from '../c4solver-wrapper.js';
import { computeReason } from './reason_engine/reasonEngine.mjs';
import { toNarratorVector, pruneVector } from './reasonNarratorVector.mjs';
import { buildReasonRenderModel, assembleGroundedPrompt, buildRenderDecision } from './renderReasonModel.mjs';
import { processAnnotations } from './reason_engine/zoneAnnotations.mjs';
import { loadEnv } from './reason_engine/lib/boardUtils.mjs';
import { callOpenAIChat } from '../llmChat.js';
import { Board } from '../classifier.js';
import { guardExplainMoveLlmPayload, toAllowedSet } from '../reasonRenderGuard.mjs';
import { decideRetry, chooseRetryWinner, ensureBetterColumnMention } from '../retryDecision.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load .env (manual parse — dotenv is not reliable here; matches run_eval.mjs) ──
// This module is imported into the server boot path (index.js → mechanismExplainer.mjs →
// compute.mjs), so it MUST NOT crash when server/.env is absent. In prod env vars come from
// the platform; loadEnv treats a missing file as a no-op. See boardUtils.loadEnv.
loadEnv(join(__dirname, '../.env'));

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
       [--llm [--condition A|B|C|D|all] [--n 3] [--model X] [--retry]]

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
  --locale en|es        Output locale (--llm only). 'es' appends SPANISH_OUTPUT_DIRECTIVE to the
                        task, matching production's locale-aware prompt. Default: en.
  --sentence-budget <t> Answer-length instruction for the mechanism field, as prose (e.g. "1-3",
                        "4-6"). Default: 1-3. Used by the budget-ablation arm.
  --retry               Reproduce production's full post-LLM content pipeline instead of scoring a
                        single attempt: the real retry decision (decideRetry, retryDecision.mjs),
                        the keep-the-better-attempt chooser (chooseRetryWinner), and the
                        better-column post-repair (ensureBetterColumnMention, D63/OI-224). IMPORTANT:
                        a --retry run is NOT comparable to historical single-attempt runs on any
                        judgment axis — it reproduces production's two CONTENT triggers only (a
                        missing required square/line and/or an unnamed better column); rows that hit
                        a call/parse error remain single-attempt (that is a separate, pre-existing
                        LLM-error retry trigger, out of scope here). It is gated to condition D — on
                        A/B/C, render_decision is null and the content triggers are inert. A6 is NOT
                        an independent measure on a --retry run: it is one of the retry's own
                        triggers, so report it separately and never against a single-attempt
                        baseline. The better-column post-repair (D63/OI-224) can also append a
                        deterministic sentence to answer.mechanism/servedExplanation on rows marked
                        better_col_repaired: true — the judgment axes (A3/A4/A5/A7/G1-G6) grade that
                        appended text too, so segment or exclude those rows before comparing a
                        --retry run's judgment axes against a pre-D63 --retry run.
  -h, --help            Show this help and exit.

Requires OPENAI_API_KEY (and a model) for --llm; loaded from connect-four/server/.env.`;

// ── CLI-only arg parsing (imperative; exits/side-effects on missing args) ──────
// Guarded so importing this module (e.g. from tests, for buildEvidenceRow) never triggers
// process.exit or depends on --input being present. Everything below this point that the CLI
// entry needs (INPUT, evidenceOut, useLlm, ts, N, model, CONDITIONS) is declared with `let` at
// module scope and populated only when this file is the entry point.
let inputArg, INPUT, inputStem, evidenceOut, useLlm, useRetry, ts, N, model, CONDITIONS, idFilter, sentenceBudget, locale;
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
  // Reproduces production's real retry decision (decideRetry, retryDecision.mjs) — gated to
  // condition D in the per-run loop below, since renderDecision is null on A/B/C.
  useRetry = process.argv.includes('--retry');
  ts = new Date().toISOString().replace(/:/g, '-').replace(/\.\d+Z$/, 'Z');
  N = parseInt(argVal('--n', '3'), 10);
  model = argVal('--model', process.env.EXPLAIN_MODEL);
  sentenceBudget = argVal('--sentence-budget', '1-3');
  // Production threads a locale into buildPromptForCondition (mechanismExplainer.mjs:187); the CLI
  // hardcoded 'en', so a Spanish eval silently generated English. 'es' appends SPANISH_OUTPUT_DIRECTIVE.
  locale = argVal('--locale', 'en');
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
  if (condition === 'C') { const { movestring: _movestring, ...rest } = pruned; return rest; }
  return pruned; // A
}

// ── Build the isolated prompt: glossary + vector + task ─────────────────────────
// Exported for the budget-ablation arm: the answer schema with a parameterised sentence budget.
// `budget` is prose ('1-3', '4-6'), not a number — it is read by the model, not parsed.
export function answerSchemaBlock(budget = '1-3') {
  return `  "mechanism":        "<${budget} sentences spoken directly to the player as their coach: the load-bearing reason the played move is worse. 2nd person, plain Connect Four language, NO internal/field/engine terms>",`;
}

function buildTask(budget) {
  return `# Your task

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
${answerSchemaBlock(budget)}
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
}

export const SPANISH_OUTPUT_DIRECTIVE = `

# Output language
Write the \`mechanism\` field — the ONLY player-facing field — in **Argentinian Spanish
(Rioplatense voseo)**: use "usá / tenés / podés / jugá / sos / vos", never tú-Spanish. Refer to
the two discs as **verde** (first player) and **gris** (second player); never say red, yellow, or
the English words green/gray. Keep every OTHER field exactly as specified above (English JSON keys,
English enum values like "win"/"draw"/"loss", numeric \`better_move\`, \`cNrM\` cells). Do NOT
translate, rename, or reformat the [zone:…] / [term:…] tags or the cell references inside
\`mechanism\` — copy those tokens verbatim; only the surrounding prose is Spanish.`;

export function buildPromptForCondition(glossary, fv, condition, locale = 'en', budget = '1-3') {
  const localeSuffix = locale === 'es' ? SPANISH_OUTPUT_DIRECTIVE : '';
  const task = buildTask(budget);
  if (condition === 'D') {
    return `${assembleGroundedPrompt(buildReasonRenderModel(fv))}

---

${task}${localeSuffix}`;
  }
  const projected = projectVector(fv, condition);
  return `${glossary}

---

${task}${localeSuffix}

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

// ── Lenient JSON parse (handles fenced or prose-wrapped output) ──────────────────
function parseAnswer(raw) {
  try { return { answer: JSON.parse(raw), parse_error: null }; } catch { /* fall through to fenced/prose extraction below */ }
  const m = raw && raw.match(/\{[\s\S]*\}/);
  if (m) {
    try { return { answer: JSON.parse(m[0]), parse_error: null }; } catch (e) {
      return { answer: null, parse_error: e.message };
    }
  }
  return { answer: null, parse_error: 'no JSON object found in response' };
}

// Condition-D post-processing: expand offered zone handles -> real specs, drop unoffered tags, and
// re-derive key_cells from the expanded specs. No-op for A/B/C (render_decision is null) or a null answer.
// Transition safety (M4): only overwrite key_cells when the model actually emitted >=1 zone handle;
// until it is prompted to emit handles, keep the model's own key_cells so the /admin/fv-suff overlay
// doesn't silently empty out. (G5 grading is unaffected — it reads render_decision, not answer.key_cells.)
export function postprocessAnswer(answer, render_decision) {
  if (!answer || !render_decision?.zones) return { answer, repairs: [], usedSpecs: [] };
  const { mechanism, keyCells, zonesEmitted, repairs, usedSpecs } = processAnnotations(answer.mechanism ?? '', render_decision.zones);
  answer.mechanism = mechanism;
  if (zonesEmitted) answer.key_cells = keyCells;
  return { answer, repairs, usedSpecs };
}

// FR-001/FR-002 (spec 059/Epic 12, US1, tasks 1.1/1.2): compute the string production would
// ACTUALLY serve, by running the (already annotation-processed) mechanism through the real
// production render guard — never a reimplementation of its logic. `mechanism` here is the
// post-`processAnnotations` mechanism (`postprocessAnswer`'s output), matching what
// `mechanismExplainer.mjs`/`index.js` pass into `guardExplainMoveLlmPayload` in production. Returns
// null/null when there is no post-move board to construct (condition A/B/C, or a null render_decision
// / empty movestring) — nothing to guard against.
//
// Q1 PROVISIONAL: both mechanism and servedExplanation stored; see spec.md Q1
export function computeServedExplanation(mechanism, render_decision, movestring, locale = 'en') {
  if (typeof mechanism !== 'string' || !render_decision?.zones || !movestring) {
    return { servedExplanation: null, guardDiagnostics: null };
  }
  let board;
  try {
    board = new Board(movestring);
  } catch {
    return { servedExplanation: null, guardDiagnostics: null };
  }
  const allowedSet = toAllowedSet(render_decision.zones.aliases);
  // locale MUST be threaded: humanizeGroundedCoordinates is locale-aware (reasonRenderGuard.mjs:156)
  // and production passes req.locale (index.js:1470). Defaulting to 'en' here rendered "column 5,
  // row 6" inside Spanish served text — an eval artifact that made the es run look worse than what
  // production would actually serve.
  const { explanation, diagnostics } = guardExplainMoveLlmPayload({
    explanation: mechanism,
    prompt: '',
    terms: {},
    board,
    allowedSet,
    locale,
    diagnostics: true,
  });
  return { servedExplanation: explanation, guardDiagnostics: diagnostics };
}

// FR-007 (epic task 1.6): code -> open-issue attribution for every guard-action failure code
// `guardDiagnostics.failures` can surface. This names WHICH issue a given code's loss belongs to;
// it does not fix any of them (OI-140/OI-170/OI-172/OI-208 stay `open`, narrowed-not-closed — see
// docs/open_issues.md, updated by a later batch). A code not present in this table is presumed to
// belong to the general OI-194 (raw-coordinate) bucket unless/until a future failure code demonstrates
// otherwise.
//
// Prefix match: `validateAnnotation`'s failure strings are `"<code>:<detail>:<spec>"` — attribution
// keys on the leading `<code>` (and, for P5strong, the specific sub-reason after the first colon,
// since P5strong carries two independently-attributed failure shapes).
export const GUARD_FAILURE_CODE_TO_OI = {
  // P6 runs before token-stripping in the pipeline ordering (annotationGate.js), so a P6 rejection
  // can fire on text that later stripping would have made valid — an ordering defect, not a
  // grounding defect.
  P6: 'OI-140',
  // checkP5Strong's admission is whole-window-only: a `P5strong:cell_not_allowed` rejection fires
  // when a cell-shaped reference isn't offered as its own alias, even though the containing window
  // is offered.
  'P5strong:cell_not_allowed': 'OI-172',
  // A `P5strong:tg` rejection's span is never stripped by `stripFailingZoneSpans` (SPAN_CARRYING_CODES
  // includes 'P5strong' generically, but the `tg` sub-case's span shape is not matched by the spec
  // extracted from the failure string), so the annotation nominally "fails" but its span survives.
  'P5strong:tg': 'OI-170',
  // `unclosed_tag` repair (processAnnotations, pre-guard) runs before the guard sees the text; its
  // placement can leave a residual guard-visible artifact for the guard to react to.
  unclosed_tag: 'OI-208',
};

// Returns the OI this failure code is attributed to, or null if it falls into the general
// (unattributed / OI-194-adjacent) bucket. Matches on the longest known key first (e.g.
// "P5strong:cell_not_allowed" before the bare "P5strong" code, since P5strong has no bare-code entry
// here — every P5strong failure this table has observed carries a sub-reason).
export function attributeGuardFailureCode(failure) {
  const [code, detail] = failure.split(':');
  const withDetail = detail ? `${code}:${detail}` : null;
  if (withDetail && GUARD_FAILURE_CODE_TO_OI[withDetail]) return GUARD_FAILURE_CODE_TO_OI[withDetail];
  if (GUARD_FAILURE_CODE_TO_OI[code]) return GUARD_FAILURE_CODE_TO_OI[code];
  return null;
}

// ── Retry row-shaping (pure; no network, no solver) ──────────────────────────────────────────
// Shapes the three additive answers-row fields (`retry_fired`/`retry_reason`/`attempt1`) from a
// `decideRetry` outcome and the first attempt's row-shaped data. Kept separate from the network
// call so it is unit-testable without a mock LLM: `retryOutcome` is `decideRetry(...)`'s return
// value (or null/`{ shouldRetry: false }` when the retry gate wasn't satisfied — off, wrong
// condition, or a call/parse error on attempt 1); `attempt1Row` is
// `{ raw, answer, parse_error, call_error, guardDiagnostics, annotationRepairs, servedExplanation }`
// for the FIRST attempt, i.e. exactly the shape the non-retry answer line already carries for
// those fields. Every existing row field keeps its current meaning: when the retry does not fire,
// this returns `attempt1: null` and nothing else about the row's shape changes.
export function shapeRetryFields(retryOutcome, attempt1Row) {
  if (!retryOutcome?.shouldRetry) {
    return { retry_fired: false, retry_reason: null, attempt1: null };
  }
  return {
    retry_fired: true,
    retry_reason: {
      missingHandles: (retryOutcome.missing ?? []).map((g) => g.handle),
      missingBetterCol: Boolean(retryOutcome.missingBetterColPhrase),
    },
    attempt1: attempt1Row,
  };
}

async function runLlm(evidenceRows) {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set in environment');
  if (!model) throw new Error('EXPLAIN_MODEL not set (and no --model given)');

  const glossaryText = readFileSync(GLOSSARY_PATH, 'utf8');
  // Answers file: always derived from input stem + launch timestamp (never overloads evidence --out).
  // Written to reason_corpus/runs/ — the directory GET /api/admin/fv-suff reads (server/index.js's
  // FV_SUFF_RUNS_DIR) and where grade-fv-sufficiency writes its `<stem>_grades.jsonl` sidecar. Writing
  // to server/scripts/ instead left every run invisible to the browser until moved by hand.
  const runsDir = join(__dirname, 'reason_corpus', 'runs');
  mkdirSync(runsDir, { recursive: true });
  const answersOut = join(runsDir, `fv_suff_answers_${inputStem}_${ts}.jsonl`);

  console.log(`Answerer: ${evidenceRows.length} records × ${N} runs × ${CONDITIONS.length} condition(s) [${CONDITIONS.join(',')}]`);
  console.log(`Model: ${model}`);
  console.log(`Input:  ${INPUT}`);
  console.log(`Output: ${answersOut}`);
  if (existsSync(answersOut)) console.log('(appending to existing output file)');

  let done = 0, failed = 0;
  // Retry summary (Step 4): how many runs retried, and the trigger split.
  let retriedTotal = 0, retriedMissingHandlesOnly = 0, retriedMissingBetterColOnly = 0, retriedBoth = 0;
  // D63/OI-224: rows where the better-column post-repair fired (see the `if (repaired)` branch below).
  let betterColRepairedTotal = 0;
  for (const row of evidenceRows) {
    if (!row.evidence || row.evidence.notABlunder) continue; // error row or non-blunder: nothing to narrate
    // toNarratorVector produces the UN-pruned narrator vector; per-condition pruning happens inside
    // buildPrompt via projectVector. feature_vector in the output line is always the full nv so the
    // grader and /admin/fv-suff can re-project under any condition without recomputing.
    const nv = toNarratorVector(row.evidence);
    for (const condition of CONDITIONS) {
      let prompt;
      try {
        prompt = buildPromptForCondition(glossaryText, nv, condition, locale, sentenceBudget);
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
          annotationRepairs: null,
          retry_fired: false,
          retry_reason: null,
          attempt1: null,
          served_attempt: 'attempt1',
          better_col_repaired: false,
          mechanism_pre_repair: null,
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
          ({ content: raw } = await callOpenAIChat(prompt, {
            model,
            apiKey: process.env.OPENAI_API_KEY,
            endpoint: 'compute-eval',
            userId: null,
            purpose: 'offline-eval',
          }));
          ({ answer, parse_error } = parseAnswer(raw));
        } catch (err) {
          call_error = err.message;
        }
        let { answer: postAnswer, repairs: annotationRepairs, usedSpecs } = postprocessAnswer(answer, render_decision);
        answer = postAnswer;
        // FR-001/FR-002: the served string production would actually show, plus the guard's own
        // diagnostics — computed via the REAL guardExplainMoveLlmPayload, never a reimplementation.
        // Q1 PROVISIONAL: both mechanism (pre-guard, above) and servedExplanation stored; see spec.md Q1
        let { servedExplanation, guardDiagnostics } = computeServedExplanation(
          answer?.mechanism, render_decision, nv.movestring, locale,
        );

        // ── Retry (--retry only): reproduce production's real decideRetry (retryDecision.mjs) —
        // never a hand-rolled proxy (I12). Gated to condition D: render_decision is null on A/B/C
        // (the required-set trigger is dead there), and buildRetryPrompt's amended text refers to
        // "the Decision block above," which A/B/C prompts don't contain — production itself is
        // D-only. Skipped on a call/parse error: that belongs to the pre-existing, separate
        // LLM-error retry trigger (mechanismExplainer.mjs's isLlmError), out of scope here.
        let retryOutcome = { shouldRetry: false };
        const attempt1Row = { raw, answer, parse_error, call_error, guardDiagnostics, annotationRepairs, servedExplanation };
        // served_attempt (additive): which attempt's content ended up in the top-level fields —
        // 'attempt1' both when no retry fired and when a retry fired but attempt1 won the
        // keep-the-better-attempt comparison below; 'retry' when the retried attempt was served.
        // Mirrors production's mechanismExplainer.mjs `servedAttempt` — harness/production alignment
        // is the entire purpose of --retry (D51 follow-up).
        let served_attempt = 'attempt1';
        if (useRetry && condition === 'D' && !call_error && !parse_error) {
          retryOutcome = decideRetry({
            attempt1: { mechanism: answer?.mechanism ?? null, usedSpecs, answer },
            renderDecision: render_decision,
            prompt,
            movestring: nv.movestring,
            bestCol: nv?.bestCol ?? null,
            locale,
          });
          if (retryOutcome.shouldRetry) {
            // Same callOpenAIChat options as attempt 1, so cost accounting stays correct.
            let raw2 = null, answer2 = null, parse_error2 = null, call_error2 = null;
            try {
              ({ content: raw2 } = await callOpenAIChat(retryOutcome.retryPrompt, {
                model,
                apiKey: process.env.OPENAI_API_KEY,
                endpoint: 'compute-eval',
                userId: null,
                purpose: 'offline-eval',
              }));
              ({ answer: answer2, parse_error: parse_error2 } = parseAnswer(raw2));
            } catch (err) {
              call_error2 = err.message;
            }
            const { answer: postAnswer2, repairs: annotationRepairs2, usedSpecs: usedSpecs2 } = postprocessAnswer(answer2, render_decision);
            const { servedExplanation: servedExplanation2, guardDiagnostics: guardDiagnostics2 } = computeServedExplanation(
              postAnswer2?.mechanism, render_decision, nv.movestring, locale,
            );

            // Keep the better of the two (retryDecision.mjs D51 follow-up, chooseRetryWinner):
            // prefer the retried attempt, but fall back to attempt1 when it is strictly better on
            // the two content requirements the retry exists to enforce. Reproduces production's
            // mechanismExplainer.mjs decision exactly, not a hand-rolled proxy (I12).
            const { chosen } = chooseRetryWinner({
              attempt1: { mechanism: answer?.mechanism ?? null, usedSpecs },
              retriedAttempt: { mechanism: postAnswer2?.mechanism ?? null, usedSpecs: usedSpecs2 },
              renderDecision: render_decision,
              movestring: nv.movestring,
              bestCol: nv?.bestCol ?? null,
              locale,
            });
            served_attempt = chosen;
            if (chosen === 'retry') {
              // Top-level fields now describe the FINAL (retried) attempt — what production would
              // serve; attempt1Row above preserves the discarded first one.
              raw = raw2;
              answer = postAnswer2;
              parse_error = parse_error2;
              call_error = call_error2;
              annotationRepairs = annotationRepairs2;
              servedExplanation = servedExplanation2;
              guardDiagnostics = guardDiagnostics2;
            }
            // else: attempt1 won — top-level fields already hold attempt1's values (set above the
            // retry block); attempt1Row is then a duplicate of the served content, which is
            // expected (shapeRetryFields always preserves attempt1's row shape once a retry fired).

            retriedTotal++;
            const missedHandles = retryOutcome.missing?.length > 0;
            const missedBetterCol = Boolean(retryOutcome.missingBetterColPhrase);
            if (missedHandles && missedBetterCol) retriedBoth++;
            else if (missedHandles) retriedMissingHandlesOnly++;
            else if (missedBetterCol) retriedMissingBetterColOnly++;
          }
        }
        // ── Better-column post-repair (D63 / OI-224), mirroring production ────────────────────
        // Production (mechanismExplainer.mjs) applies this to EVERY served explanation. Here it is
        // gated on `--retry` on purpose: a run without --retry is the single-attempt BASELINE other
        // measurements compare against, and silently repairing those rows would move a baseline.
        // `--retry`'s whole purpose is production alignment (D51), so the repair sits behind the
        // same gate as the chooser it follows. Deliberate divergence, not an oversight.
        //
        // `mechanism_pre_repair` (owner decision). grade_mechanical.mjs's A6 axis measures whether
        // the MODEL named the better column unaided (`grade_mechanical.mjs:40-45`); if A6 graded the
        // repaired text instead it would read a constant 'pass' on every `--retry` run and stop being
        // a measurement, silently breaking comparability with the pre-D63 189-run baseline. So this
        // row additionally captures the mechanism as it stood BEFORE the repair — null when no repair
        // fired — and Task 4b changes A6 to grade that field instead of the (now-repaired) `answer`.
        let better_col_repaired = false;
        let mechanism_pre_repair = null;
        if (useRetry && condition === 'D' && !call_error && !parse_error) {
          const { mechanism: repairedMechanism, repaired } =
            ensureBetterColumnMention(answer?.mechanism ?? null, nv?.bestCol ?? null, locale);
          if (repaired) {
            better_col_repaired = true;
            mechanism_pre_repair = answer?.mechanism ?? null;
            answer = { ...answer, mechanism: repairedMechanism };
            // servedExplanation/guardDiagnostics describe the string production would SERVE, so
            // they must be recomputed from the repaired mechanism — through the real guard, never a
            // reimplementation (FR-001/FR-002).
            ({ servedExplanation, guardDiagnostics } = computeServedExplanation(
              repairedMechanism, render_decision, nv.movestring, locale));
            betterColRepairedTotal++;
          }
        }
        const { retry_fired, retry_reason, attempt1 } = shapeRetryFields(retryOutcome, attempt1Row);

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
          annotationRepairs,
          servedExplanation,
          guardDiagnostics,
          retry_fired,
          retry_reason,
          attempt1,
          served_attempt,
          better_col_repaired,
          mechanism_pre_repair,
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
  if (useRetry) {
    console.log(`Retried: ${retriedTotal} run(s) — ${retriedMissingHandlesOnly} missing-handles only, `
      + `${retriedMissingBetterColOnly} missing-better-column only, ${retriedBoth} both.`);
    console.log(`Better-column repaired: ${betterColRepairedTotal} run(s) (D63/OI-224 post-repair).`);
    console.log('--retry reproduces production\'s full post-LLM content pipeline: the retry decision, '
      + 'the keep-the-better-attempt chooser, and the better-column post-repair; call/parse-error rows remain single-attempt.');
    console.log('A6 on a --retry run is not an independent measure — it is one of the retry\'s own triggers. '
      + 'Report it separately and never against a single-attempt baseline.');
  }
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
