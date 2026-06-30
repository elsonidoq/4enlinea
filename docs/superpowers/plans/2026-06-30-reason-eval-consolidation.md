# Reason-eval tooling consolidation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse the 5 overlapping reason-eval scripts into 2 (`select_boards.mjs`, `compute.mjs`) plus the unchanged `grade-fv-sufficiency` skill, with the clean output formats in `docs/superpowers/specs/2026-06-30-reason-eval-output-formats.md`.

**Architecture:** `select_boards.mjs --strategy {coverage|fixture}` picks decision points → `compute.mjs` is the sole place `computeReason` produces evidence (`reason_evidence_<stem>.jsonl`, rows = `{id, evidence, groundTruth}`) and, with `--llm`, the self-sufficient answers file (each row embeds `feature_vector`). The `/admin/fv-suff` Eval-answers tab derives its `set` from the answers file (no separate eval-set artifact); the Evidence tab reads the new nested evidence rows.

**Tech Stack:** Node ESM (`.mjs`), `node:test`, Express 5 (`server/index.js`), React (`src/pages/AdminFvSuffPage.jsx`). All commands run from `connect-four/`.

## Global Constraints

- Run tests with `npm run test:fast` from `connect-four/`. Baseline: **685 pass / 0 fail** — keep green.
- Production coach (`explainContext.js` / `toFeatureVector` / `/api/explain*`) is **OUT OF SCOPE** — do not touch.
- Shell is **zsh**: unquoted `$VAR` does NOT word-split; use arrays / `"${arr[@]}"`.
- New scripts live at `server/scripts/` → imports are `../.env`, `../c4solver-wrapper.js`, `../gameSampling.js`, `./reason_engine/reasonEngine.mjs`, `./reason_engine/lib/boardUtils.mjs`, `./reasonNarratorVector.mjs`.
- Filename prefixes are load-bearing (validators in `server/evalResultsHelpers.js`, unit-tested): evidence = `reason_evidence_*.jsonl`; answers = `fv_suff_answers_*.jsonl`; grades = `<answers-stem>_grades.jsonl`.
- Solver lifecycle: `createSolverProcess()` (non-async), `await solver.query(ms)`, `solver.destroy()` in a `finally` or it hangs.
- `reason_engine/reason_fixture.jsonl` is FROZEN: `server/tests/reasonEngine*.test.mjs` read its rows directly. `--strategy fixture` must regenerate it **byte-identically**.
- `id = "eval-<N>"`, N = 1-based selection order; assigned at board generation, derived by line order when absent (the fixture).

---

### Task 1: Shared pure helpers in `evalResultsHelpers.js`

**Files:**
- Modify: `connect-four/server/evalResultsHelpers.js`
- Test: `connect-four/tests/unit/evalResultsHelpers.test.js`

**Interfaces:**
- Produces: `deriveSetFromAnswers(answerRows: object[]) -> {id, pattern_category, feature_vector}[]` (one row per unique `id`, first occurrence wins, skips rows lacking `feature_vector`).

- [ ] **Step 1: Write the failing test** — append to `tests/unit/evalResultsHelpers.test.js`:

```js
import { deriveSetFromAnswers } from '../../server/evalResultsHelpers.js'; // add to existing import line

test('deriveSetFromAnswers dedupes by id, keeps {id,pattern_category,feature_vector}', () => {
  const answers = [
    { id: 'eval-1', condition: 'A', run_index: 0, pattern_category: 'win_to_draw', feature_vector: { case: 'win_to_draw', bestCol: 1 } },
    { id: 'eval-1', condition: 'A', run_index: 1, pattern_category: 'win_to_draw', feature_vector: { case: 'win_to_draw', bestCol: 1 } },
    { id: 'eval-2', condition: 'B', run_index: 0, pattern_category: 'draw_to_lose', feature_vector: { case: 'draw_to_lose', bestCol: 3 } },
  ];
  const set = deriveSetFromAnswers(answers);
  assert.deepEqual(set, [
    { id: 'eval-1', pattern_category: 'win_to_draw', feature_vector: { case: 'win_to_draw', bestCol: 1 } },
    { id: 'eval-2', pattern_category: 'draw_to_lose', feature_vector: { case: 'draw_to_lose', bestCol: 3 } },
  ]);
});

test('deriveSetFromAnswers skips rows without feature_vector', () => {
  assert.deepEqual(deriveSetFromAnswers([{ id: 'eval-1', pattern_category: 'x' }]), []);
});
```

- [ ] **Step 2: Run to verify it fails** — `npx node --test tests/unit/evalResultsHelpers.test.js`. Expected: FAIL (`deriveSetFromAnswers is not a function`).

- [ ] **Step 3: Implement** — append to `server/evalResultsHelpers.js`:

```js
// Derive the {id, pattern_category, feature_vector} eval-set rows the /admin/fv-suff Eval-answers
// browser needs, straight from the answers file (each answer row embeds its feature_vector). One
// row per unique id (first occurrence wins); rows without a feature_vector are skipped.
export function deriveSetFromAnswers(answerRows) {
  const seen = new Set();
  const out = [];
  for (const r of answerRows) {
    if (!r || !r.feature_vector || seen.has(r.id)) continue;
    seen.add(r.id);
    out.push({ id: r.id, pattern_category: r.pattern_category, feature_vector: r.feature_vector });
  }
  return out;
}
```

- [ ] **Step 4: Run to verify pass** — `npx node --test tests/unit/evalResultsHelpers.test.js`. Expected: PASS (all, including the existing validator tests).

- [ ] **Step 5: Commit**

```bash
git add connect-four/server/evalResultsHelpers.js connect-four/tests/unit/evalResultsHelpers.test.js
git commit -m "feat(reason-eval): deriveSetFromAnswers helper for the embedded-vector answers file"
```

---

### Task 2: `toNarratorVector` operates on the pure evidence object (drop `RESEARCH_LABELS`)

**Files:**
- Modify: `connect-four/server/scripts/reasonNarratorVector.mjs`
- Test: `connect-four/server/tests/reasonNarratorVector.test.mjs`

**Interfaces:**
- Produces: `toNarratorVector(evidence)` strips only `HIDDEN_FIELDS` (`['scores']`); `RESEARCH_LABELS` export is removed (research labels now live in the evidence row's sibling `groundTruth`, never inside `evidence`).

- [ ] **Step 1: Update the test to the new contract** — in `server/tests/reasonNarratorVector.test.mjs`: (a) remove `RESEARCH_LABELS` from the import on line 6; (b) make `RAW` a pure evidence object by deleting the `expectedCase/expectedGate/expectedExhaustive/bucket/caseMatches` keys; (c) delete the test `'toNarratorVector strips every fixture research label'`. Keep the `scores`-stripping test and the keep-engineered-fields test.

- [ ] **Step 2: Run to verify it fails** — `npx node --test server/tests/reasonNarratorVector.test.mjs`. Expected: FAIL (`RESEARCH_LABELS` import is now undefined / referenced in deleted test) until both file and test agree.

- [ ] **Step 3: Implement** — in `reasonNarratorVector.mjs`: delete the `RESEARCH_LABELS` export (lines 26-27) and its doc bullet (item 2 in the header). Change `toNarratorVector` to omit only `HIDDEN_FIELDS`:

```js
export function toNarratorVector(reason) {
  const omit = new Set(HIDDEN_FIELDS);
  const out = {};
  for (const [k, v] of Object.entries(reason)) if (!omit.has(k)) out[k] = v;
  return out;
}
```

- [ ] **Step 4: Run to verify pass** — `npx node --test server/tests/reasonNarratorVector.test.mjs`. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add connect-four/server/scripts/reasonNarratorVector.mjs connect-four/server/tests/reasonNarratorVector.test.mjs
git commit -m "refactor(reason-eval): toNarratorVector takes pure evidence; drop RESEARCH_LABELS"
```

---

### Task 3: `select_boards.mjs` (`fixture` + `coverage` strategies)

**Files:**
- Create: `connect-four/server/scripts/select_boards.mjs`
- Reference (port from): `server/scripts/reason_engine/build_fixture.mjs`, `server/scripts/build_reason_eval_set.mjs`

**Interfaces:**
- CLI: `node server/scripts/select_boards.mjs --strategy {fixture|coverage} [--out <path>] [--target N] [--max-games N]`.
- Produces (fixture): `reason_engine/reason_fixture.jsonl`, FROZEN flat rows `{movestring, playedCol, bestCol, scores, discs, expectedCase, bucket[, expectedGate, expectedExhaustive]}` — byte-identical to today's.
- Produces (coverage): `boards_coverage_<ts>.jsonl`, rows `{id:"eval-N", movestring, playedCol, strategy:"coverage", selection:{predicates}}`.

- [ ] **Step 1: Scaffold the dispatcher.** Create `select_boards.mjs` with the `.env` load (`loadEnv(join(__dirname, './reason_engine/lib/boardUtils.mjs')` import) and an arg parser; `--strategy` is required (error to stderr + exit 1 if missing/unknown). Default `--out`: fixture → `join(__dirname, 'reason_engine/reason_fixture.jsonl')`; coverage → `join(__dirname, `boards_coverage_${ts}.jsonl`)` with `ts = new Date().toISOString().replace(/:/g,'-').replace(/\.\d+Z$/, 'Z')`.

- [ ] **Step 2: Port the `fixture` strategy** — copy the body of `reason_engine/build_fixture.mjs` (anchors + stratified loop + the `rows.sort(...)` + the `JSON.stringify` write) **verbatim**, changing ONLY the import paths to the `server/scripts/` depth (`../c4solver-wrapper.js`, `../gameSampling.js`, `./reason_engine/lib/boardUtils.mjs`, `./reason_engine/reasonEngine.mjs`). Preserve row key order exactly (byte-identity depends on it). Gate it behind `if (strategy === 'fixture')`.

- [ ] **Step 3: Verify fixture is byte-identical** —

```bash
node server/scripts/select_boards.mjs --strategy fixture --out /tmp/fix_new.jsonl
diff <(sort server/scripts/reason_engine/reason_fixture.jsonl) <(sort /tmp/fix_new.jsonl) && echo IDENTICAL
```
Expected: `IDENTICAL`. If it diverges, STOP and surface the diff — do not overwrite the committed fixture.

- [ ] **Step 4: Port the `coverage` strategy** — copy the harvest loop + 5s heartbeat + `satisfied()` termination from `build_reason_eval_set.mjs`, but change the collected row from the `{id, pattern_category, feature_vector, _predicates}` shape to the board-list shape: drop `toNarratorVector` (and its import), and push `{ id: `eval-${collected.length + 1}`, movestring: boardState, playedCol: movePlayed, strategy: 'coverage', selection: { predicates: [...preds].sort() } }`. Keep the crash-safe incremental `writeFileSync`. Gate behind `else if (strategy === 'coverage')`.

- [ ] **Step 5: Smoke-test coverage** —

```bash
node server/scripts/select_boards.mjs --strategy coverage --target 1 --max-games 200 --out /tmp/cov.jsonl
head -1 /tmp/cov.jsonl | node -e "const r=JSON.parse(require('fs').readFileSync(0));console.log(r.id, r.strategy, typeof r.movestring, typeof r.playedCol, Array.isArray(r.selection.predicates))"
```
Expected: `eval-1 coverage string number true`.

- [ ] **Step 6: Commit**

```bash
git add connect-four/server/scripts/select_boards.mjs
git commit -m "feat(reason-eval): select_boards.mjs (fixture+coverage); regenerates reason_fixture byte-identically"
```

---

### Task 4: `compute.mjs` (evidence + optional `--llm` answers)

**Files:**
- Create: `connect-four/server/scripts/compute.mjs`
- Reference (port from): `reason_engine/build_evidence.mjs`, `build_fv_eval_set.mjs`, `explain_from_vector.mjs`

**Interfaces:**
- CLI: `node server/scripts/compute.mjs --input <boards.jsonl> [--out <name>] [--llm [--condition A|all] [--n 3] [--model X]]`.
- Consumes: board rows (uses only `id?`, `movestring`, `playedCol`; passes through `expected*` labels when present). `toNarratorVector` (Task 2); `pruneVector`, `buildPrompt`, `projectVector`, `callExplainLLM`, `parseAnswer` (ported from `explain_from_vector.mjs`).
- Produces (always): `reason_evidence_<input-stem>.jsonl`, rows `{id, evidence, groundTruth|null}`.
- Produces (`--llm`): `fv_suff_answers_<input-stem>_<ts>.jsonl`, rows `{id, pattern_category, condition, run_index, model, feature_vector, answer, raw, parse_error, call_error}`.

- [ ] **Step 1: Evidence pass.** Read `--input` (required; resolve relative to cwd). For each board row `f` at index `i`: `evidence = await computeReason(f.movestring, f.playedCol, { solver })`; `id = f.id ?? `eval-${i + 1}``; `groundTruth = f.expectedCase != null ? { case: f.expectedCase, gate: f.expectedGate ?? null, exhaustive: f.expectedExhaustive ?? null, bucket: f.bucket ?? null, matches: evidence.case === f.expectedCase } : null`. Push `{ id, evidence, groundTruth }`. Solver in `try/finally` with `solver.destroy()`. Default `--out`: bare name → `server/scripts/<name>`; derive `reason_evidence_${stem}.jsonl` from `basename(input)` stem when `--out` omitted. Warn (don't fail) if `basename(out)` fails `/^reason_evidence_[\w.-]*\.jsonl$/`.

- [ ] **Step 2: Smoke-test evidence on the fixture** —

```bash
node server/scripts/compute.mjs --input server/scripts/reason_engine/reason_fixture.jsonl --out /tmp/ev.jsonl
head -1 /tmp/ev.jsonl | node -e "const r=JSON.parse(require('fs').readFileSync(0));console.log(r.id, 'evidence' in r, 'scores' in r.evidence, r.groundTruth && r.groundTruth.matches, !('expectedCase' in r))"
```
Expected: `eval-1 true true true true` (id present, evidence nested with raw scores, groundTruth.matches set, no flat label leak).

- [ ] **Step 3: `--llm` answerer.** When `--llm`: if the evidence `--out` file already exists, READ it (rows `{id, evidence, groundTruth}`) — do NOT re-run the solver; else run Step 1 first (and write the evidence file). Port `projectVector`/`buildPrompt`/`TASK`/`callExplainLLM`/`parseAnswer`/glossary-load/`.env`-parse from `explain_from_vector.mjs` verbatim (paths stay `../.env`, glossary `../../../docs/architecture/feature-vector-glossary.md`). For each evidence row: `nv = toNarratorVector(row.evidence)`; for each `condition × run_index`: write line `{ id: row.id, pattern_category: row.evidence.case, condition, run_index, model, feature_vector: nv, answer, raw, parse_error, call_error }` via `appendFileSync`. Answers default `--out` (when `--llm`): `fv_suff_answers_${inputStem}_${ts}.jsonl` in `server/scripts/`.

- [ ] **Step 4: Verify answers row is a valid vectors row** (no LLM/network — assert shape on a hand-written line):

```bash
node -e "const {deriveSetFromAnswers}=require('./server/evalResultsHelpers.js'); /* ESM: */" 2>/dev/null || \
node --input-type=module -e "import {deriveSetFromAnswers} from './server/evalResultsHelpers.js'; const a=[{id:'eval-1',pattern_category:'win_to_draw',condition:'A',run_index:0,feature_vector:{case:'win_to_draw'}}]; console.log(JSON.stringify(deriveSetFromAnswers(a)))"
```
Expected: `[{"id":"eval-1","pattern_category":"win_to_draw","feature_vector":{"case":"win_to_draw"}}]` — confirms an answers line is consumable as a `set` row.

- [ ] **Step 5: Commit**

```bash
git add connect-four/server/scripts/compute.mjs
git commit -m "feat(reason-eval): compute.mjs (nested evidence + optional --llm answers with embedded vector)"
```

---

### Task 5: Endpoint changes (`/api/admin/fv-suff*`)

**Files:**
- Modify: `connect-four/server/index.js` (lines ~641-677)

**Interfaces:**
- Consumes: `deriveSetFromAnswers` (Task 1) — add to the `evalResultsHelpers.js` import on line 28; drop `isReasonEvalSetFile` from that import.
- `GET /api/admin/fv-suff/files` → `{ answers }` (drop `sets`).
- `GET /api/admin/fv-suff?answers=<name>` → `{ set, answers, grades }` where `set = deriveSetFromAnswers(answers)`. No `set` param. Missing answers → 404. (`/api/admin/reason*` unchanged — it is shape-agnostic; only the row shape it returns changed.)

- [ ] **Step 1: Rewrite `/api/admin/fv-suff/files`** to return answers only:

```js
app.get('/api/admin/fv-suff/files', requireLocalhost, requireAdmin, (req, res) => {
  const scriptsDir = join(dirname(fileURLToPath(import.meta.url)), 'scripts');
  try {
    const all = readdirSync(scriptsDir);
    res.json({ answers: all.filter((f) => isFvSuffAnswersFile(f) && !f.endsWith('_grades.jsonl')).sort() });
  } catch {
    res.json({ answers: [] });
  }
});
```

- [ ] **Step 2: Rewrite `/api/admin/fv-suff`** to derive `set` from the answers file:

```js
app.get('/api/admin/fv-suff', requireLocalhost, requireAdmin, (req, res) => {
  const scriptsDir = join(dirname(fileURLToPath(import.meta.url)), 'scripts');
  const answersName = req.query.answers || 'fv_suff_answers_all.jsonl';
  if (!isFvSuffAnswersFile(answersName)) return res.status(400).json({ error: 'invalid answers filename' });
  const parseJsonl = (path) => readFileSync(path, 'utf-8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
  try {
    const answers = parseJsonl(join(scriptsDir, basename(answersName)));
    const set = deriveSetFromAnswers(answers);
    let grades = [];
    const gradesName = gradesFilenameFor(basename(answersName));
    if (gradesName) {
      try { grades = parseJsonl(join(scriptsDir, gradesName)); }
      catch (e) { if (e.code !== 'ENOENT') throw e; }
    }
    res.json({ set, answers, grades });
  } catch (err) {
    if (err.code === 'ENOENT') return res.status(404).json({ error: 'answers file not found' });
    logError('[admin/fv-suff]', err);
    res.status(500).json({ error: err.message });
  }
});
```

- [ ] **Step 3: Fix the import** on line 28 — remove `isReasonEvalSetFile`, add `deriveSetFromAnswers`.

- [ ] **Step 4: Verify server boots** — `node -e "require('child_process').execSync('node --check server/index.js')"` from `connect-four/`. Expected: no output (syntax OK). (`isReasonEvalSetFile` stays exported/tested in `evalResultsHelpers.js` — now unused by the server, harmless.)

- [ ] **Step 5: Commit**

```bash
git add connect-four/server/index.js
git commit -m "feat(reason-eval): /admin/fv-suff derives set from the embedded-vector answers file"
```

---

### Task 6: Frontend `AdminFvSuffPage.jsx`

**Files:**
- Modify: `connect-four/src/pages/AdminFvSuffPage.jsx`

**Interfaces:**
- `ReasonViewer` (Evidence tab): read the nested shape — `entry.evidence.movestring`, `entry.evidence.case`, `entry.evidence.scores`, `entry.evidence.lostResource`, `entry.evidence.opponentPunishment`, `entry.evidence.player`, etc.; mismatch chip uses `entry.groundTruth?.matches === false`; bucket from `entry.groundTruth?.bucket`.
- `AnswerViewer`: remove `setFile` state + the `set` dropdown; fetch `?answers=<name>` only; `files` state holds `{ answers }`.

- [ ] **Step 1: Update `ReasonViewer`** — introduce `const ev = entry?.evidence || {};` after `const entry = rows[index];`, and replace every flat `entry.<field>` read (movestring, playedCol, bestCol, scores, case, player, lostResource, opponentPunishment, replyHistogram, gate) with `ev.<field>`. Replace `entry.caseMatches === false` → `entry.groundTruth?.matches === false`; `entry.bucket` → `entry.groundTruth?.bucket`. `preBoard`/`preOverlays` memos depend on `ev`.

- [ ] **Step 2: Update `AnswerViewer`** — delete `setFile`/`setSetFile` state and the `set` `<select>` (lines ~520-524); set `files` to `{ answers: [] }`; the files effect sets `{ answers: d.answers || [] }` and picks the last answers file; the data effect fetches `${API}/api/admin/fv-suff?answers=${encodeURIComponent(answersFile)}` (drop `&set=`). Everything downstream (`data.set`, `answersByKey`, `gradesByKey`) is unchanged.

- [ ] **Step 3: Build check** — `npm run build` from `connect-four/`. Expected: build succeeds, no unresolved-symbol errors for `setFile`.

- [ ] **Step 4: Commit**

```bash
git add connect-four/src/pages/AdminFvSuffPage.jsx
git commit -m "feat(reason-eval): AdminFvSuffPage reads nested evidence; Eval-answers drops the set dropdown"
```

---

### Task 7: Delete old scripts, update docs + memory

**Files:**
- Delete: `server/scripts/reason_engine/build_fixture.mjs`, `server/scripts/reason_engine/build_evidence.mjs`, `server/scripts/build_reason_eval_set.mjs`, `server/scripts/build_fv_eval_set.mjs`, `server/scripts/explain_from_vector.mjs`
- Modify: `README.md` (repo-root "Scripts & tooling"), `server/scripts/README.md`, `server/scripts/RUNBOOK_fv_sufficiency.md`, `docs/architecture/api-conventions.md` (§ Admin Blunder-Reason Browser, lines ~661-673), memory `project_reason_engine_reorg.md` + `project_admin_fv_suff_repurposed.md`

- [ ] **Step 1: Delete the 5 absorbed scripts** — `git rm` the five files above.

- [ ] **Step 2: Rewrite RUNBOOK** — replace its 4 steps with: (1) `select_boards.mjs --strategy coverage` → `boards_coverage_<ts>.jsonl`; (2) `compute.mjs --input <boards> --llm --condition all --n 3` → evidence + `fv_suff_answers_<stem>_<ts>.jsonl` (note `--llm` reuses an existing evidence file); (3) `/grade-fv-sufficiency server/scripts/fv_suff_answers_<ts>.jsonl --vectors server/scripts/fv_suff_answers_<ts>.jsonl` (same file is its own vectors source); (4) `/admin/fv-suff` Eval-answers tab. Note iterating glossary/prompt = rerun step 2 `--llm` only (vectors reused) → step 3.

- [ ] **Step 3: Update READMEs** — repo-root "Scripts & tooling" and `server/scripts/README.md`: replace the 5 script names with `select_boards.mjs` + `compute.mjs`; fixture is now `select_boards --strategy fixture`; corpus is `compute --input <boards>`.

- [ ] **Step 4: Update `api-conventions.md`** §"Admin Blunder-Reason Browser Endpoints": evidence rows are now `{id, evidence, groundTruth}`; `/api/admin/fv-suff/files` → `{ answers }` (no `sets`); `/api/admin/fv-suff?answers=<name>` → `{ set, answers, grades }` with `set` derived from the answers file (no `set` param); remove the `isReasonEvalSetFile` mention.

- [ ] **Step 5: Update memory** — `project_reason_engine_reorg.md` and `project_admin_fv_suff_repurposed.md`: replace the 5 script names + the separate eval-set/`set=` flow with the 2-script pipeline, the nested evidence row shape, and the embed-vector-in-answers + `--vectors <answers>` grader contract.

- [ ] **Step 6: Full regression** — `npm run test:fast` from `connect-four/`. Expected: **685 pass / 0 fail**.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore(reason-eval): delete 5 absorbed scripts; update README/RUNBOOK/api-conventions/memory"
```

---

## Self-Review

- **Spec coverage:** §1 board generation → Task 3; §2 evidence → Task 4 Step 1-2; §2b answers → Task 4 Step 3; §3 grades (unchanged skill) → no task (RUNBOOK note in Task 7); nested-evidence `toNarratorVector` → Task 2; endpoint set-derivation → Tasks 1+5; Evidence-tab + Answers-tab UI → Task 6; frozen fixture byte-identity → Task 3 Step 3; deletions/docs/memory → Task 7. All covered.
- **Frozen edges honored:** fixture shape (Task 3 Step 2-3, no `id` added), grader-read keys (Task 4 Step 3 row shape), `test:fast` baseline (Task 7 Step 6).
- **Type consistency:** `deriveSetFromAnswers` signature identical in Tasks 1/5; evidence row `{id, evidence, groundTruth}` identical in Tasks 4/5/6; answers row keys identical in Tasks 4/5.
- **Out-of-scope guard:** no task touches `explainContext.js`/`toFeatureVector`/`/api/explain*`.
