# Deep Reveal Eval Harness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a two-phase eval harness: a script that runs the full deep-reveal pipeline over `eval_set.json` and records all outcomes, plus a Claude skill (`/judge-deep-reveals`) that scores each successful LLM response against an 8-item rubric and produces a structured report.

**Architecture:** Phase 1 (`run_eval.mjs`) replicates the `/api/explain-move-llm` production path exactly — `buildExplainContext` → `callLLM` → normalize → validate → retry — writing a JSONL record per entry. Phase 2 is a Claude skill that reads the JSONL and applies the rubric in-context, writing a Markdown report alongside the JSONL file. `normalizeZoneTags` is extracted from `index.js` to `annotationGate.js` first so the script can import it.

**Tech Stack:** Node.js ESM scripts, existing server modules (`explainContext.js`, `llmCoachHelpers.js`, `annotationGate.js`, `classifier.js`, `c4solver-wrapper.js`), Claude Code skill YAML/Markdown format.

## Global Constraints

- Run all commands from `connect-four/` unless otherwise noted
- Use `npm run test:fast` for tests (never plain `npm test` — it hangs on candidate-generator)
- All coordinates are 0-indexed internally
- `.env` is at `connect-four/server/.env`
- ESM imports only (`.mjs` files use `import`, not `require`)
- Never call the real c4solver more than needed — reuse the solver process across entries

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `connect-four/server/annotationGate.js` | Modify | Export `normalizeZoneTags` (extracted from `index.js`) |
| `connect-four/server/index.js` | Modify | Import `normalizeZoneTags` from `annotationGate.js` |
| `connect-four/server/scripts/run_eval.mjs` | Create | Phase 1 collection script |
| `.claude/skills/judge-deep-reveals/SKILL.md` | Create | Phase 2 judge skill |

---

### Task 1: Export `normalizeZoneTags` from `annotationGate.js`

`normalizeZoneTags` currently lives as a private function in `index.js`. The eval script needs it without importing the entire Express server. Move it to `annotationGate.js` (where all annotation logic lives) and update `index.js` to import it from there.

**Files:**
- Modify: `connect-four/server/annotationGate.js` (add function at the end, before `validateAnnotation`)
- Modify: `connect-four/server/index.js` (replace local function with import)

**Interfaces:**
- Produces: `export function normalizeZoneTags(text: string): string`

- [ ] **Step 1: Add `normalizeZoneTags` to `annotationGate.js`**

Append this exported function at the end of `annotationGate.js`, just before `validateAnnotation`:

```js
/**
 * Normalize zone tags in raw LLM output before annotation validation.
 * - [zone:column N] / [zone:col N] → [zone:colN]
 * - Pairs each [zone:colN] with the nearest following closing tag → [/zone:colN]
 * - Expands [/zone:cells] short closers to [/zone:cells:SPEC]
 */
export function normalizeZoneTags(text) {
  // Step 1: Normalize opening tags: [zone:column N] or [zone:col N] → [zone:colN]
  text = text.replace(/\[zone:col(?:umn)?\s+(\d+)\]/gi, (_, n) => `[zone:col${n}]`);

  // Step 2: Pair each opening [zone:colN] with the nearest following closing tag
  const CLOSE_RE = /\[\/zone:col(?:umn)?(?:\s+\d+)?\]/gi;
  const OPEN_RE = /\[zone:col(\d+)\]/gi;
  const resultParts = [];
  let lastIndex = 0;
  let openMatch;

  while ((openMatch = OPEN_RE.exec(text)) !== null) {
    resultParts.push(text.slice(lastIndex, openMatch.index + openMatch[0].length));
    const colNum = openMatch[1];
    CLOSE_RE.lastIndex = openMatch.index + openMatch[0].length;
    const closeMatch = CLOSE_RE.exec(text);
    if (closeMatch) {
      resultParts.push(text.slice(openMatch.index + openMatch[0].length, closeMatch.index));
      resultParts.push(`[/zone:col${colNum}]`);
      lastIndex = closeMatch.index + closeMatch[0].length;
    } else {
      lastIndex = openMatch.index + openMatch[0].length;
    }
  }
  resultParts.push(text.slice(lastIndex));
  text = resultParts.join('');

  // Step 3: Expand short [zone:cells:SPEC]...[/zone:cells] closing tags
  const CELLS_OPEN_RE = /\[zone:cells:([^\]]+)\]/g;
  const cellsParts = [];
  let cellsLastIndex = 0;
  let cellsMatch;
  while ((cellsMatch = CELLS_OPEN_RE.exec(text)) !== null) {
    cellsParts.push(text.slice(cellsLastIndex, cellsMatch.index + cellsMatch[0].length));
    const spec = cellsMatch[1];
    const afterOpen = cellsMatch.index + cellsMatch[0].length;
    const closeIdx = text.indexOf('[/zone:cells]', afterOpen);
    if (closeIdx !== -1) {
      cellsParts.push(text.slice(afterOpen, closeIdx));
      cellsParts.push(`[/zone:cells:${spec}]`);
      cellsLastIndex = closeIdx + '[/zone:cells]'.length;
    } else {
      cellsLastIndex = afterOpen;
    }
  }
  cellsParts.push(text.slice(cellsLastIndex));
  return cellsParts.join('');
}
```

- [ ] **Step 2: Update `index.js` to import `normalizeZoneTags` from `annotationGate.js`**

Find the import line for `validateAnnotation` in `index.js`:
```js
import { validateAnnotation } from './annotationGate.js';
```
Replace with:
```js
import { validateAnnotation, normalizeZoneTags } from './annotationGate.js';
```

Then delete the local `normalizeZoneTags` function definition in `index.js` (the one starting around line 810 with `function normalizeZoneTags(text) {`).

- [ ] **Step 3: Verify server still starts**

```bash
cd connect-four && node -e "import('./server/annotationGate.js').then(m => { console.log(typeof m.normalizeZoneTags); console.log(typeof m.validateAnnotation); })"
```
Expected output:
```
function
function
```

- [ ] **Step 4: Run tests**

```bash
cd connect-four && npm run test:fast
```
Expected: same pass/fail count as before (no regressions).

- [ ] **Step 5: Commit**

```bash
git add connect-four/server/annotationGate.js connect-four/server/index.js
git commit -m "refactor: export normalizeZoneTags from annotationGate for eval harness reuse"
```

---

### Task 2: Write `run_eval.mjs` — Phase 1 collection script

**Files:**
- Create: `connect-four/server/scripts/run_eval.mjs`

**Interfaces:**
- Consumes: `buildExplainContext(movestring, col, rounds, solver)` from `../explainContext.js` → `{ prompt, allowedSet, zoneAliasMap } | { allMovesEqual: true } | { trivial: true, trivialExplanation: string } | null`
- Consumes: `expandZoneAliases(text, aliasMap)` from `../explainContext.js`
- Consumes: `callLLM(prompt)` from `../llmCoachHelpers.js` → `string`
- Consumes: `validateAnnotation(explanation, board, allowedSet)` from `../annotationGate.js` → `{ valid: boolean, failures: string[] }`
- Consumes: `normalizeZoneTags(text)` from `../annotationGate.js` → `string`
- Consumes: `Board` class from `../classifier.js` — `new Board(movestring)` builds board state
- Consumes: `createSolverProcess()` from `../c4solver-wrapper.js`
- Produces: JSONL file, one record per line

- [ ] **Step 1: Create `run_eval.mjs`**

```js
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
  if (k?.trim()) process.env[k.trim()] = v.join('=').trim();
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
const evalSet = JSON.parse(readFileSync(join(__dirname, 'eval_set.json'), 'utf8'));

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

    const board = new Board(entry.board_state);
    const aliasMap = context.zoneAliasMap ?? {};

    // ── Step 2: Attempt 1 ─────────────────────────────────────────────────
    const raw1 = await callLLM(context.prompt);
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
    const raw2 = await callLLM(context.prompt);
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
```

- [ ] **Step 2: Smoke-test the script on the first entry only**

Temporarily create a one-entry slice to verify imports and the pipeline work without spending money on all 25 LLM calls:

```bash
cd connect-four && node -e "
import('./server/annotationGate.js').then(m => {
  const out = m.normalizeZoneTags('[zone:column 3]foo[/zone:col]');
  console.assert(out === '[zone:col3]foo[/zone:col3]', 'normalizeZoneTags broken: ' + out);
  console.log('normalizeZoneTags OK:', out);
});
"
```
Expected:
```
normalizeZoneTags OK: [zone:col3]foo[/zone:col3]
```

- [ ] **Step 3: Run the full script**

```bash
cd connect-four && node server/scripts/run_eval.mjs
```

Watch for per-entry status lines. A `[DEBUG validateAnnotation]` line per attempt is expected from the existing debug log in `annotationGate.js`. The script will create `server/scripts/eval_results_<timestamp>.jsonl`.

- [ ] **Step 4: Verify output structure**

```bash
cd connect-four && node -e "
const { readFileSync } = await import('fs');
const lines = readFileSync('server/scripts/eval_results_$(ls server/scripts/eval_results_*.jsonl | tail -1 | xargs basename)', 'utf8')
  .split('\n').filter(Boolean);
console.log('Records written:', lines.length);
const first = JSON.parse(lines[0]);
const keys = ['id','board_state','move_played','correct_move','pattern_category','context_outcome','prompt','final_response'];
keys.forEach(k => console.log(k + ':', typeof first[k]));
"
```
Expected: 25 records, all required keys present, types correct.

- [ ] **Step 5: Test resume — re-run with the output file**

```bash
cd connect-four && node server/scripts/run_eval.mjs server/scripts/eval_results_<timestamp>.jsonl
```
Expected output: all 25 lines say `skip`, no new records appended, file unchanged.

- [ ] **Step 6: Commit**

```bash
git add connect-four/server/scripts/run_eval.mjs
git commit -m "feat: add run_eval.mjs — deep reveal eval harness phase 1"
```

---

### Task 3: Write `/judge-deep-reveals` Claude skill

**Files:**
- Create: `.claude/skills/judge-deep-reveals/SKILL.md`

**Interfaces:**
- Consumes: path to a JSONL file produced by `run_eval.mjs`
- Produces: Markdown report at `<same-dir>/<same-stem>_report.md`

- [ ] **Step 1: Create `.claude/skills/judge-deep-reveals/SKILL.md`**

```markdown
---
name: judge-deep-reveals
description: Score a deep-reveal eval run against the 8-item rubric and produce a structured report
argument-hint: "<path-to-eval_results_*.jsonl>"
user-invocable: true
---

# Deep Reveal Judge

You are evaluating a batch of deep-reveal LLM explanations produced by `run_eval.mjs`.

## Input

The argument is a path to a `.jsonl` file. Each line is a JSON object with this shape:

```json
{
  "id": "eval-0",
  "board_state": "3253...",
  "move_played": 2,        // 0-indexed column played (the blunder)
  "correct_move": 3,       // 0-indexed column that was better
  "pattern_category": "claimeven",
  "predicates": ["P02","P28"],
  "severity": 4,
  "context_outcome": "success | null_returned | trivial | all_moves_equal | error",
  "context_error": null,
  "prompt": "<full LLM prompt>",
  "allowed_set": [...],
  "attempt1_response": "<raw LLM text>",
  "attempt1_passed": true,
  "attempt1_failures": [],
  "attempt2_response": null,
  "attempt2_passed": null,
  "attempt2_failures": [],
  "final_response": "<accepted response text or null>"
}
```

## Your task

1. Read the JSONL file using the Read tool (or Bash `cat`).
2. For each record, classify it into one of three buckets:
   - **Pipeline failure**: `context_outcome` is not `success` — no LLM was called. Record the outcome type and `context_error` if present.
   - **Annotation failure**: `context_outcome` is `success` but `final_response` is `null` — both validation attempts failed. Record the failure codes from `attempt1_failures` and `attempt2_failures`.
   - **Success**: `final_response` is non-null — apply the 8-item rubric.
3. For each success record, score all 8 rubric items.
4. Write the report to `<same-directory>/<stem>_report.md` where `<stem>` is the filename without `.jsonl`.

## Rubric (apply to success records only)

You have access to `board_state`, `move_played`, `correct_move`, `pattern_category`, `severity`, `predicates`, `prompt`, and `final_response` for each entry.

Score each item **pass / partial / fail** with a one-line rationale. Column numbers in the explanation are 1-indexed (so `correct_move + 1` is the expected column number).

| # | Item | What to check |
|---|---|---|
| 1 | **Correct column named** | Does the explanation explicitly mention column `correct_move + 1`? Does it avoid naming wrong columns as the better move? |
| 2 | **No hallucinated win** | Does it claim an immediate win exists when none does, or deny one when it does? Cross-check against `pattern_category` (`forced_win` = win exists) and `severity` (high severity = large mistake, not necessarily a forced win). |
| 3 | **Pattern match** | Does the described tactical concept match `pattern_category`? Mapping: `claimeven` → zugzwang / even-row control; `forced_win` → forced sequence / forced win; `double_threat` → fork / two threats at once; `z_threat` → Z-shape / odd-row stacking; `figure_7` → figure-7 / diagonal staircase; `j_shape` → J-shape; `undercut` → undercut / lower threat; `overcut` → overcut / upper threat; `immediate_threat` → immediate threat / blocking urgency; `forced_block` → forced block / defensive urgency; `drawing_move` → drawing / balanced outcome; `odd_even_threat` → parity / odd-even row strategy; `suboptimal_move` → generic positional improvement (no specific named pattern required). |
| 4 | **Player perspective correct** | Is the explanation from the blundering player's viewpoint ("you missed…", "your move…")? No confusion about who played vs who benefits. |
| 5 | **Move location accuracy** | Are the played move (column `move_played + 1`) and better move (column `correct_move + 1`) correctly attributed? No transposition between the two. |
| 6 | **No internal terms leaked** | Does the response use any banned words: `solver`, `score`, `leaf`, `leaf position`, `tag`, `direction`, `forced_win` as a noun, `simulation`, `pattern data`, `pattern comparison`? |
| 7 | **Internal consistency** | Does the better move's rationale directly address the specific weakness identified in the blunder? The diagnosis and remedy must be logically connected — not just "the other move was stronger." |
| 8 | **Other issues** | Anything else: vague/boilerplate explanation with no position-specific reasoning, self-contradictory claims, wrong threat direction, misleading framing. |

## Report format

Write the report in this structure:

```
# Deep Reveal Eval Report — <filename>

## Summary

- Total entries: N
- Pipeline failures: N
- Annotation failures: N  
- Successes evaluated: N
- Rubric pass rate: X/Y items passed across all success entries

## Pipeline failures

| id | category | outcome | error |
|----|----------|---------|-------|
...

## Annotation failures

| id | category | attempt1_failures | attempt2_failures |
|----|----------|------------------|------------------|
...

## Per-entry rubric scores (success entries)

| id | category | sev | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|----|----------|-----|---|---|---|---|---|---|---|---|
...

For each row where any item is partial or fail, add a notes block immediately below:
> eval-N: item 3 fail — explanation describes "column pressure" but pattern is claimeven; item 7 partial — better move rationale is generic

## Systematic issues

Group failures by rubric item. For each item with ≥2 failures:
- How many entries affected
- Which pattern_category values are involved
- A one-sentence description of the recurring failure pattern

Order by number of entries affected, descending.

## Raw explanations (success entries)

For each success entry, print:

### eval-N — <pattern_category> (sev <severity>)
**Prompt excerpt (Move context section):**
<paste the ## Move context section from the prompt>

**Final response:**
<paste final_response>
```

## Key column-number rule

`move_played` and `correct_move` are 0-indexed. The LLM prompt and response use 1-indexed columns. When checking rubric items 1 and 5, add 1 to each value before comparing against what the explanation says.
```

- [ ] **Step 2: Verify the skill is discoverable**

```bash
ls /Users/elsonidoq/prog/cuatro_en_linea/.claude/skills/judge-deep-reveals/SKILL.md
```
Expected: file exists.

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/judge-deep-reveals/SKILL.md
git commit -m "feat: add /judge-deep-reveals skill for eval rubric scoring"
```

---

## Self-Review

**Spec coverage:**
- ✅ Phase 1 script with full production path replication (Task 2)
- ✅ Resume via file argument, new run via no argument (Task 2)
- ✅ Timestamped output file (Task 2)
- ✅ All 5 context_outcome states handled (Task 2)
- ✅ Attempt 1 + retry + final_response (Task 2)
- ✅ normalizeZoneTags extracted and importable (Task 1)
- ✅ `/judge-deep-reveals <path>` skill with rubric (Task 3)
- ✅ 8-item rubric in full (Task 3)
- ✅ Three-bucket classification: pipeline / annotation / success (Task 3)
- ✅ Report with per-entry table + systematic issues + raw explanations (Task 3)
- ✅ 0-indexed → 1-indexed column note in skill (Task 3)

**Placeholder scan:** None found.

**Type consistency:**
- `buildExplainContext` returns `{ prompt, allowedSet, zoneAliasMap }` — used as `context.prompt`, `context.allowedSet`, `context.zoneAliasMap` ✅
- `validateAnnotation` returns `{ valid, failures }` — used as `result1.valid`, `result1.failures` ✅
- `Board` constructed with `entry.board_state` (the pre-move movestring) ✅ — matches production (`new Board(movestring)` before the move is played)
