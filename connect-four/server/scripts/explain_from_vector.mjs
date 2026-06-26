#!/usr/bin/env node
// explain_from_vector.mjs — Feature-Vector Sufficiency Experiment, the ANSWERER.
//
// Reads a frozen run_eval --no-llm jsonl, and for each record asks an OpenAI model to
// explain WHY the played move was a blunder, using ONLY the feature vector + the glossary.
// The prompt is ISOLATED: glossary text + the feature_vector JSON + the task. No tools, and
// NEVER any solver ground truth (premove/played/best scores, correct_move). The model returns
// the §4 structured-answer JSON, which the grader skill later checks against the board.
//
// Usage (from connect-four/):
//   node server/scripts/explain_from_vector.mjs [--input <vectors.jsonl>] [--out <answers.jsonl>]
//        [--n 3] [--condition A|B|C|all] [--model <id>]
//
// Env (connect-four/server/.env, manually parsed): EXPLAIN_MODEL (required, NOT OPENAI_MODEL —
// production OPENAI_MODEL=gpt-5.4-mini must stay untouched), OPENAI_API_KEY (required).
//
// Conditions (§5 ablation):
//   A — full:                       pruned full vector (production-faithful headline).
//   B — board-only:                 glossary + {movestring, perspective, playedCol, bestCol}.
//   C — features-without-movestring: pruned full vector with movestring removed.

import { readFileSync, appendFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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
const ts = new Date().toISOString().replace(/:/g, '-').replace(/\.\d+Z$/, 'Z');
const inputPath = argVal('--input', join(__dirname, 'eval_set_fv_suff_frozen_vectors.jsonl'));
const outPath = argVal('--out', join(__dirname, `fv_suff_answers_${ts}.jsonl`));
const N = parseInt(argVal('--n', '3'), 10);
const model = argVal('--model', process.env.EXPLAIN_MODEL);
const condArg = (argVal('--condition', 'A') || 'A').toLowerCase();
const CONDITIONS = condArg === 'all' ? ['A', 'B', 'C'] : condArg.toUpperCase().split(',');

if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set in environment');
if (!model) throw new Error('EXPLAIN_MODEL not set (and no --model given)');

const GLOSSARY_PATH = join(__dirname, '../../../docs/architecture/feature-vector-glossary.md');
const glossaryText = readFileSync(GLOSSARY_PATH, 'utf8');

// ── pruneVector — honor glossary §6 (absence = "not present") ────────────────────
// buildExplainContext writes the vector with prune:false, so all-zero threatStats buckets
// and empty maps are present on the wire. The glossary the model reads says absent = not
// present, so we recursively drop empties to match that contract. movestring is preserved
// even when "" (empty board is meaningful) — handled by the top-level guard below.
function pruneValue(v) {
  if (Array.isArray(v)) {
    const arr = v.map(pruneValue).filter((x) => x !== undefined);
    return arr.length ? arr : undefined;
  }
  if (v && typeof v === 'object') {
    // {count, cells} bucket that is all-zero/empty → drop
    const out = {};
    for (const [k, val] of Object.entries(v)) {
      const pv = pruneValue(val);
      if (pv !== undefined) out[k] = pv;
    }
    return Object.keys(out).length ? out : undefined;
  }
  if (v === null || v === false || v === '' || v === 0) return undefined;
  return v;
}
function pruneVector(fv) {
  const out = {};
  for (const [k, val] of Object.entries(fv)) {
    if (k === 'movestring') { out.movestring = val ?? ''; continue; } // keep even when ""
    const pv = pruneValue(val);
    if (pv !== undefined) out[k] = pv;
  }
  return out;
}

// ── Project the vector for a given ablation condition ───────────────────────────
function projectVector(fv, condition) {
  if (condition === 'B') {
    return {
      movestring: fv.movestring ?? '',
      perspective: fv.perspective,
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
  "mechanism":        "<1-3 sentences: the load-bearing reason the played move is worse>",
  "key_cells":        ["c5r4", ...],   // squares the mechanism rests on, cNrM (1-indexed); [] if none
  "fields_relied_on": ["lookahead.case", "threatStats.best.opponentMajorParityAligned", ...],
  "unsure_about":     "<what the vector did NOT let you determine, or empty string>",
  "confidence":       "high" | "medium" | "low"
}

Notes:
- \`better_move\` is 1-INDEXED display (1-7). The vector's \`bestCol\` is 0-indexed, so add 1.
- \`key_cells\` use the glossary's \`cNrM\` convention (1-indexed column and row).
- \`fields_relied_on\` must list the actual vector field paths your reasoning used — this reveals
  whether your claims trace to engineered fields or to re-deriving from \`movestring\`.
- Never claim a "win" as guaranteed by the single move unless it completes four-in-a-row; the
  \`_with_best_play\` outcomes mean "with correct continuation".`;

function buildPrompt(glossary, fv, condition) {
  const projected = projectVector(fv, condition);
  return `${glossary}

---

${TASK}

# Feature vector

\`\`\`json
${JSON.stringify(projected, null, 2)}
\`\`\``;
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

// ── Run ─────────────────────────────────────────────────────────────────────────
const records = readFileSync(inputPath, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
console.log(`Answerer: ${records.length} records × ${N} runs × ${CONDITIONS.length} condition(s) [${CONDITIONS.join(',')}]`);
console.log(`Model: ${model}`);
console.log(`Input:  ${inputPath}`);
console.log(`Output: ${outPath}`);
if (existsSync(outPath)) console.log('(appending to existing output file)');

let done = 0, failed = 0;
for (const rec of records) {
  if (!rec.feature_vector) { console.log(`  skip ${rec.id} — no feature_vector`); continue; }
  for (const condition of CONDITIONS) {
    const prompt = buildPrompt(glossaryText, rec.feature_vector, condition);
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
        id: rec.id,
        run_index,
        condition,
        model,
        pattern_category: rec.pattern_category,
        answer,
        raw,
        parse_error,
        call_error,
      };
      appendFileSync(outPath, JSON.stringify(line) + '\n');
      if (call_error || parse_error) {
        failed++;
        process.stdout.write(`  ${rec.id} ${condition} run${run_index}: ERROR ${call_error ?? parse_error}\n`);
      } else {
        done++;
        process.stdout.write(`  ${rec.id} ${condition} run${run_index}: ok\n`);
      }
    }
  }
}

console.log(`\nDone. ${done} ok, ${failed} failed → ${outPath}`);
