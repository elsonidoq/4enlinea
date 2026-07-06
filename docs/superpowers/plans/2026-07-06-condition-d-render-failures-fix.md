# Condition-D Grounded-Render Failures Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the three root causes behind the 17/57 condition-D grading failures from the
2026-07-06 `grade-fv-sufficiency` run: (1) unclosed `[zone:]`/`[term:]` tags leaking raw markup to
the player, (2) an opening-frame guardrail silently dropped from the assembled prompt (causing
invented centrality claims), (3) model non-compliance with the existing L7/L3 "don't say you're
lost" guardrail.

**Architecture:** Render-layer-only changes (no engine/vector schema change, per
reason-INVARIANTS I0). Three independent fix groups, each touching a small, already-identified set
of files: prompt text in `renderReasonModel.mjs`, post-processing in
`reason_engine/zoneAnnotations.mjs`, eval plumbing in `compute.mjs`, guardrail data in
`reason_engine/causalLinks.mjs` and `reason_engine/openingFrame.mjs`, plus doc updates in
`docs/architecture/` and `.claude/skills/grade-fv-sufficiency/SKILL.md`.

**Tech Stack:** Node.js (ESM `.mjs`), `node:test` + `node:assert/strict` for tests.

## Global Constraints

- Never run `npm test` (candidate-generator hangs); always `npm run test:fast` from
  `connect-four/`.
- `causalLinks.mjs` `template()` text is asserted verbatim by 4 test files — do NOT touch
  `template()` in this plan, only `guardrail` fields (guardrail assertions in the repo are all
  `assert.match(...,/regex/i)` substring checks, confirmed by grep — safe to append text to).
- `docs/architecture/*.md` is the durable, mandatory-read location for anything a future
  fresh-context agent needs (per `feedback_superpowers_docs_not_durable`); the design spec at
  `docs/superpowers/specs/2026-07-06-condition-d-render-failures-fix-design.md` is the throwaway
  companion, already written — this plan implements it.
- Coordinates are 0-indexed internally, 1-indexed at display/prompt boundaries — do not
  reintroduce a raw 0-indexed leak (see D30 "Fix A" in `reason-DECISIONS.md`).

---

### Task 1: Tighten the annotation-tag instructions in the prompt (Issue 1, prompt fix)

**Files:**
- Modify: `connect-four/server/scripts/renderReasonModel.mjs:299-305` (inside
  `assembleGroundedPrompt`)
- Test: `connect-four/server/tests/renderReasonModel.test.mjs`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new (prompt text only) — no signature changes.

- [ ] **Step 1: Write the failing test**

Add to `connect-four/server/tests/renderReasonModel.test.mjs` (append at the end of the file):

```js
test('annotation instructions require a paired close tag with a bad/good example', () => {
  const prompt = assembleGroundedPrompt(buildReasonRenderModel(NV));
  assert.match(prompt, /MUST have a matching closing tag/i);
  assert.match(prompt, /Bad:.*no closing tag/i);
  assert.match(prompt, /Good:.*\[term:/i);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd connect-four && node --test server/tests/renderReasonModel.test.mjs`
Expected: FAIL on the new test (`prompt` does not yet match `/MUST have a matching closing tag/i`).

- [ ] **Step 3: Write minimal implementation**

In `renderReasonModel.mjs`, inside `assembleGroundedPrompt`, replace the two instruction lines
(currently reading `'To highlight a phrase, wrap it [zone:<handle>]…[/zone:<handle>] using a
handle from this list verbatim. Never write a raw square. Do not overlap a highlight and a term on
the same words.'` and `'When you use one of these ideas, wrap the words
[term:<slug>]…[/term:<slug>] using a slug from this list verbatim. Only these slugs, only when you
actually use the idea.'`) with:

```js
    '# Highlightable regions',
    'To highlight a phrase, wrap it in BOTH an opening and a closing tag: '
      + '[zone:<handle>]phrase[/zone:<handle>], using a handle from this list verbatim. Every '
      + 'opening tag MUST have a matching closing tag — never write a handle on its own as if it '
      + 'were a word. Bad: "the [term:immediate_threat] on c2 is worth keeping" (no closing tag; '
      + 'used as a noun). Good: "[term:immediate_threat]the threat you need to keep '
      + 'alive[/term:immediate_threat] on c2". Never write a raw square. Do not overlap a '
      + 'highlight and a term on the same words.',
    regions,
    '',
    '# KB terms you may name',
    'When you use one of these ideas, wrap the words in BOTH an opening and a closing tag: '
      + '[term:<slug>]phrase[/term:<slug>], using a slug from this list verbatim. Every opening '
      + 'tag MUST have a matching closing tag — never write a slug on its own as if it were a '
      + 'word. Only these slugs, only when you actually use the idea.',
    termLines,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd connect-four && node --test server/tests/renderReasonModel.test.mjs`
Expected: PASS (all tests in the file, including the new one).

- [ ] **Step 5: Commit**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add connect-four/server/scripts/renderReasonModel.mjs connect-four/server/tests/renderReasonModel.test.mjs
git commit -m "fix(reason-render): require paired open+close tags with bad/good example in prompt"
```

---

### Task 2: `processAnnotations` bare-strips unclosed tags and reports `repairs`

**Files:**
- Modify: `connect-four/server/scripts/reason_engine/zoneAnnotations.mjs:148-167`
  (`processAnnotations`); add a new helper `stripUnclosedTags` above it.
- Test: `connect-four/server/tests/zoneAnnotations.test.mjs`

**Interfaces:**
- Consumes: nothing new (still pure — no Supabase/DB call in this module).
- Produces: `processAnnotations(mechanism, zones)` now returns
  `{ mechanism: string, keyCells: string[], zonesEmitted: boolean, repairs: string[] }` — added
  `repairs` field, one entry per stripped tag, formatted `"unclosed_tag:<zone|term>:<id>"`, empty
  array when nothing was repaired. This is the shape Task 3 (`compute.mjs`) and the (documented,
  not-yet-built) production caller both consume.

- [ ] **Step 1: Write the failing test**

Add to `connect-four/server/tests/zoneAnnotations.test.mjs` (append at the end of the file):

```js
test('processAnnotations bare-strips a genuinely unclosed tag and reports it in repairs', () => {
  const raw = 'You needed to keep the [term:double_threat] on c2 alive because it is tough.';
  const { mechanism, repairs } = processAnnotations(raw, ZONES);
  assert.doesNotMatch(mechanism, /\[term:/);
  assert.doesNotMatch(mechanism, /\[\/term:/);
  assert.match(mechanism, /You needed to keep the  on c2 alive because it is tough\./);
  assert.deepEqual(repairs, ['unclosed_tag:term:double_threat']);
});

test('processAnnotations bare-strips an unclosed zone tag used mid-sentence', () => {
  const raw = 'Playing in [zone:better-col] keeps the fight alive; [zone:opp-double] hands them the finish.';
  const { mechanism, repairs } = processAnnotations(raw, ZONES);
  assert.doesNotMatch(mechanism, /\[zone:/);
  assert.deepEqual(repairs, ['unclosed_tag:zone:better-col', 'unclosed_tag:zone:opp-double']);
});

test('processAnnotations reports empty repairs when all tags are properly paired', () => {
  const raw = 'Column [zone:better-col]3[/zone:better-col] denies the double threat.';
  const { repairs } = processAnnotations(raw, ZONES);
  assert.deepEqual(repairs, []);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd connect-four && node --test server/tests/zoneAnnotations.test.mjs`
Expected: FAIL — `repairs` is `undefined` (destructured from a return object that doesn't have it
yet); the bare tags also aren't stripped, so `mechanism` still contains `[term:` / `[zone:`.

- [ ] **Step 3: Write minimal implementation**

In `connect-four/server/scripts/reason_engine/zoneAnnotations.mjs`, add this helper just above
`processAnnotations` (after `dropUnoffered`, before the `export function processAnnotations` line):

```js
// Delete a [kind:id] opener that has no matching [/kind:id] anywhere later in the text — the model
// used the tag as a bare noun instead of wrapping a phrase (e.g. "the [term:immediate_threat] on
// c2"). Bare-strip: remove just the token, leave the surrounding words as-is (no attempt to
// substitute a canonical phrase — simplicity over prose smoothness on this rare repair path).
// Returns the repaired text + one 'unclosed_tag:<kind>:<id>' entry per removal, consumed by
// compute.mjs (-> annotationRepairs, for grade-fv-sufficiency G7) and, in production, by a future
// deep_reveal_failures write (see reason-render-grounded-prompt.md §10 TODO).
function stripUnclosedTags(text, kind) {
  const OPEN = new RegExp(`\\[${kind}:([^\\]!]+)\\]`, 'g');
  const repairs = [];
  let result = '';
  let last = 0;
  let m;
  while ((m = OPEN.exec(text)) !== null) {
    const id = m[1];
    const CLOSE = new RegExp(`\\[/${kind}:${id}\\]`);
    if (CLOSE.test(text.slice(m.index + m[0].length))) continue; // properly paired — leave it
    result += text.slice(last, m.index);
    last = m.index + m[0].length;
    repairs.push(`unclosed_tag:${kind}:${id}`);
  }
  result += text.slice(last);
  return { text: result, repairs };
}
```

Then replace `processAnnotations` with:

```js
export function processAnnotations(mechanism, zones) {
  const handles = new Set((zones?.aliases ?? []).map((a) => a.handle));
  const slugs = new Set((zones?.terms ?? []).map((t) => t.slug));
  const aliasMap = Object.fromEntries((zones?.aliases ?? []).map((a) => [a.handle, a.spec]));

  let text = normalizeAnnotationTags(mechanism ?? '');
  text = dropUnoffered(text, 'zone', handles);
  text = dropUnoffered(text, 'term', slugs);

  const repairs = [];
  for (const kind of ['zone', 'term']) {
    const stripped = stripUnclosedTags(text, kind);
    text = stripped.text;
    repairs.push(...stripped.repairs);
  }

  // Expand offered zone handles -> real specs (open + close), and collect the specs for key_cells.
  const usedSpecs = new Set();
  for (const [handle, spec] of Object.entries(aliasMap)) {
    if (text.includes(`[zone:${handle}]`)) usedSpecs.add(spec);
    text = text.replaceAll(`[zone:${handle}]`, `[zone:${spec}]`).replaceAll(`[/zone:${handle}]`, `[/zone:${spec}]`);
  }

  const cells = new Set();
  for (const spec of usedSpecs) for (const rc of expandSpec(spec)) cells.add(rcToCellStr(rc));
  return { mechanism: text, keyCells: [...cells].sort(), zonesEmitted: usedSpecs.size > 0, repairs };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd connect-four && node --test server/tests/zoneAnnotations.test.mjs`
Expected: PASS (all tests in the file).

- [ ] **Step 5: Commit**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add connect-four/server/scripts/reason_engine/zoneAnnotations.mjs connect-four/server/tests/zoneAnnotations.test.mjs
git commit -m "fix(reason-render): bare-strip unclosed zone/term tags, report via repairs[]"
```

---

### Task 3: Thread `repairs` through `compute.mjs` as `annotationRepairs`

**Files:**
- Modify: `connect-four/server/scripts/compute.mjs:314-320` (`postprocessAnswer`) and
  `:380-393` (the `runLlm` per-record `line` assembly), plus `:352-364` (the prompt-build-failure
  early-error `line`).
- Test: `connect-four/server/tests/computeConditionD.test.mjs`

**Interfaces:**
- Consumes: `processAnnotations(...).repairs` from Task 2.
- Produces: `postprocessAnswer(answer, render_decision)` now returns
  `{ answer, repairs: string[] }` instead of a bare `answer` (breaking change to this function's
  return shape — the three existing call sites/tests below are the only consumers). The
  `runLlm`-written JSONL `line` object gains a new field `annotationRepairs: string[] | null` —
  `null` when there was no answer to post-process (parse/call error, or A/B/C condition with no
  `render_decision.zones`), an array (possibly empty) otherwise.

- [ ] **Step 1: Write the failing test**

Open `connect-four/server/tests/computeConditionD.test.mjs` and replace the existing
`postprocessAnswer` test (lines 33-48, the whole `test('postprocessAnswer expands handles...` block)
with (this updates the existing assertions to the new `{ answer, repairs }` return contract AND
adds the new repairs-surfacing assertions; note `rd`'s `terms` array gains a `double_threat` entry,
needed for the new unclosed-term case):

```js
test('postprocessAnswer expands handles + rederives key_cells only when a zone was emitted, and surfaces repairs', () => {
  const rd = { zones: { aliases: [{ handle: 'better-col', spec: 'col3', role: 'x', truthBoard: 'decision', kbId: null }],
                        terms: [{ slug: 'double_threat', kbId: 'double_threat', canonicalPhrase: 'double threat', description: 'x' }] } };
  // a zone WAS emitted -> mechanism expanded, key_cells re-derived from the spec
  const withZone = postprocessAnswer({ mechanism: 'play [zone:better-col]column 3[/zone:better-col]', key_cells: ['c9r9'] }, rd);
  assert.match(withZone.answer.mechanism, /\[zone:col3\]column 3\[\/zone:col3\]/);
  assert.deepEqual(withZone.answer.key_cells, ['c3r1', 'c3r2', 'c3r3', 'c3r4', 'c3r5', 'c3r6']); // col3 expanded
  assert.deepEqual(withZone.repairs, []);
  // NO zone emitted -> key_cells preserved (transition safety, M4): don't zero the model's cells
  // before it is prompted to emit handles
  const noZone = postprocessAnswer({ mechanism: 'just prose', key_cells: ['c1r1'] }, rd);
  assert.deepEqual(noZone.answer.key_cells, ['c1r1']);
  assert.deepEqual(noZone.repairs, []);
  // an unclosed offered term is bare-stripped and surfaced in repairs
  const withUnclosed = postprocessAnswer({ mechanism: 'the [term:double_threat] on c2', key_cells: [] }, rd);
  assert.doesNotMatch(withUnclosed.answer.mechanism, /\[term:/);
  assert.deepEqual(withUnclosed.repairs, ['unclosed_tag:term:double_threat']);
  // no-op paths
  const same = { mechanism: 'x', key_cells: ['c1r1'] };
  assert.deepEqual(postprocessAnswer(same, null), { answer: same, repairs: [] });
  assert.deepEqual(postprocessAnswer(null, rd), { answer: null, repairs: [] });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd connect-four && node --test server/tests/computeConditionD.test.mjs`
Expected: FAIL — `postprocessAnswer(...)` currently returns the bare `answer`, so `.answer` /
`.repairs` property access on the result is `undefined`.

- [ ] **Step 3: Write minimal implementation**

In `connect-four/server/scripts/compute.mjs`, replace `postprocessAnswer` (lines 314-320) with:

```js
export function postprocessAnswer(answer, render_decision) {
  if (!answer || !render_decision?.zones) return { answer, repairs: [] };
  const { mechanism, keyCells, zonesEmitted, repairs } = processAnnotations(answer.mechanism ?? '', render_decision.zones);
  answer.mechanism = mechanism;
  if (zonesEmitted) answer.key_cells = keyCells;
  return { answer, repairs };
}
```

Then update the two call sites inside `runLlm`. First, the prompt-build-failure early-error `line`
(around line 352-364) gains `annotationRepairs: null`:

```js
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
        };
```

Second, the main per-record `line` (around line 380-393):

```js
        const { answer: postAnswer, repairs: annotationRepairs } = postprocessAnswer(answer, render_decision);
        answer = postAnswer;
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
        };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd connect-four && node --test server/tests/computeConditionD.test.mjs`
Expected: PASS.

- [ ] **Step 5: Run the broader fast suite to catch any other `postprocessAnswer` consumer**

Run: `cd connect-four && npm run test:fast`
Expected: all green. (If anything else calls `postprocessAnswer` and expected the old bare-`answer`
return, it will surface here — fix its call site to destructure `.answer` the same way.)

- [ ] **Step 6: Commit**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add connect-four/server/scripts/compute.mjs connect-four/server/tests/computeConditionD.test.mjs
git commit -m "feat(reason-render): surface annotation-tag repairs as annotationRepairs on eval output lines"
```

---

### Task 4: Wire `annotationRepairs` into the grader + document the production TODO

**Files:**
- Modify: `.claude/skills/grade-fv-sufficiency/SKILL.md` (two G7 sections: `:357` the summary
  table row, `:400` the triage bullet list, `:549-554` the condition-D detail section)
- Modify: `docs/architecture/reason-render-grounded-prompt.md` (§10, near the existing "Not wired
  to production" line)

No test — this task is documentation-only (grading rubric text + architecture doc), consumed by a
human/LLM grader reading the skill, not by code.

- [ ] **Step 1: Add G7c to the SKILL.md summary table (line 357)**

In `.claude/skills/grade-fv-sufficiency/SKILL.md`, find the G7 row in the summary table (line 357,
starts `| **G7 annotation fidelity** |`). Append a new sentence to the cell (end of the existing
text, before the closing `|`):

```
 **G7c (malformed-tag auto-fail):** if the record's `annotationRepairs` array (a top-level field
sibling to `answer`/`render_decision`) is non-empty, G7 is an automatic FAIL for that run —
the render pipeline already bare-stripped an unclosed `[zone:]`/`[term:]` tag the model emitted, so
the model produced malformed markup even though the final text the pipeline shipped is clean;
triage this `prompt_confusion` (the model's fault, not the render layer's).
```

- [ ] **Step 2: Add the triage rule to the bullet list (around line 400)**

In the same file, find the bullet starting `- **G7 (zone/term annotation) triage:**` (around line
400). Add a new bullet immediately after it:

```
- **G7c (malformed-tag) triage:** always `prompt_confusion` — a non-empty `annotationRepairs`
  means the model emitted an unclosed tag; the pipeline already repaired the player-facing text, so
  there is nothing for the render layer to have done differently.
```

- [ ] **Step 3: Add the condition-D detail section note (around line 549-554)**

In the same file, in the "Condition D only — score G1–G7" section, after the existing G7 bullet
(ending `...genuinely denotes that KB concept.`), add:

```
 Additionally: if the record's `annotationRepairs` array is non-empty, G7 auto-fails
  (`prompt_confusion`) regardless of the above — the model emitted at least one unclosed tag, even
  though the pipeline already bare-stripped it before the player saw it.
```

- [ ] **Step 4: Add the production TODO to the architecture doc**

In `docs/architecture/reason-render-grounded-prompt.md`, find the bullet in §10 that reads:

```
- **Not wired to production:** this makes the grounded path *capable*; `explainContext.js` /
  `annotationGate.js` production zone code is untouched (a later deletion pass, once the grounded path
  serves a live endpoint).
```

Replace it with:

```
- **Not wired to production:** this makes the grounded path *capable*; `explainContext.js` /
  `annotationGate.js` production zone code is untouched (a later deletion pass, once the grounded path
  serves a live endpoint).
- **TODO(production-wiring) — `deep_reveal_failures` logging for repaired tags.** `processAnnotations`
  returns a `repairs: string[]` array (e.g. `["unclosed_tag:term:immediate_threat"]`) whenever it had
  to bare-strip a tag the model left unclosed — see `zoneAnnotations.mjs`. This is NOT a user-facing
  error (the shipped text is already clean) but IS an internal defect worth logging. `processAnnotations`
  stays pure (no DB call); whoever wires the production endpoint that eventually replaces
  `/explain-move-llm` with condition-D must, when `repairs.length > 0`, insert a row into the existing
  `deep_reveal_failures` table (no schema change) shaped like:
  `{ position_hash, movestring, col, endpoint: '<the new endpoint name>', llm_prompt: <the assembled prompt>,
  raw_llm_output: <answer.mechanism BEFORE processAnnotations ran>, failure_reason: JSON.stringify(repairs),
  created_at: new Date().toISOString() }` — the same shape/convention `server/index.js` (~line 1085)
  already uses for `P5strong:*` validation failures.
```

- [ ] **Step 5: Commit**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add .claude/skills/grade-fv-sufficiency/SKILL.md docs/architecture/reason-render-grounded-prompt.md
git commit -m "docs(reason-render): wire annotationRepairs into G7 grading + TODO for prod deep_reveal_failures logging"
```

---

### Task 5: Fix `assembleGroundedPrompt` dropping the opening frame's own guardrail (Issue 2, code bug)

**Files:**
- Modify: `connect-four/server/scripts/renderReasonModel.mjs:294` (inside `assembleGroundedPrompt`)
- Test: `connect-four/server/tests/renderReasonModel.test.mjs`

**Interfaces:**
- Consumes: `model.link.guardrail` (unchanged) and `model.frames[0].guardrail` (already produced by
  `buildReasonRenderModel`, previously unused by the assembler).
- Produces: the assembled prompt's `Guardrail:` line now includes both guardrails when they differ
  (opening cases); unchanged (no duplication) when they're identical (non-opening cases, where
  `frames[0].guardrail === link.guardrail` today).

- [ ] **Step 1: Write the failing test**

Add to `connect-four/server/tests/renderReasonModel.test.mjs` (append at the end of the file; the
file already imports `OPENING` from `./fixtures/opening_vectors.json`):

```js
test('assembled prompt does not duplicate the guardrail on a non-opening record', () => {
  const prompt = assembleGroundedPrompt(buildReasonRenderModel(NV));
  const occurrences = prompt.split('You gave up a win AND handed the opponent their own').length - 1;
  assert.equal(occurrences, 1); // L6's guardrail text must appear exactly once, not doubled
});

test('assembled prompt includes the opening frame\'s own guardrail alongside the link guardrail', () => {
  const prompt = assembleGroundedPrompt(buildReasonRenderModel(OPENING.namedOpening));
  assert.match(prompt, /do not ground a specific deep/i); // openingFrame.mjs's own GUARDRAIL text
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd connect-four && node --test server/tests/renderReasonModel.test.mjs`
Expected: the second new test FAILs (`assembleGroundedPrompt` currently prints only
`model.link.guardrail`, which for an opening record is the L-family guardrail, never the opening
frame's "do not ground a specific deep" text). The first new test should already PASS (documents
current non-duplication behavior as a regression guard for the fix).

- [ ] **Step 3: Write minimal implementation**

In `renderReasonModel.mjs`, add a helper above `assembleGroundedPrompt` and use it in place of the
bare `model.link.guardrail`:

```js
// The frame (opening or L-link) may carry its own guardrail distinct from the L1-L9 classification
// guardrail (always computed, even for opening records, to feed horizon scaffolding — see
// reason-render-grounded-prompt.md §9). For non-opening records frames[0].guardrail IS
// model.link.guardrail (same value) — combining would duplicate it, so only append when distinct.
function combinedGuardrail(model) {
  const frameGuardrail = model.frames[0]?.guardrail;
  if (frameGuardrail && frameGuardrail !== model.link.guardrail) {
    return `${model.link.guardrail} ${frameGuardrail}`;
  }
  return model.link.guardrail;
}
```

Then change line 294 from:

```js
    `Guardrail: ${model.link.guardrail}`,
```

to:

```js
    `Guardrail: ${combinedGuardrail(model)}`,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd connect-four && node --test server/tests/renderReasonModel.test.mjs`
Expected: PASS (all tests in the file).

- [ ] **Step 5: Commit**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add connect-four/server/scripts/renderReasonModel.mjs connect-four/server/tests/renderReasonModel.test.mjs
git commit -m "fix(reason-render): stop dropping the opening frame's own guardrail from the assembled prompt"
```

---

### Task 6: Add the no-invented-centrality guardrail clause (Issue 2, wording addition)

**Files:**
- Modify: `connect-four/server/scripts/reason_engine/openingFrame.mjs:65-71` (`GUARDRAIL` constant
  and `composeOpeningFrame`)
- Test: `connect-four/server/tests/openingFrame.test.mjs`

**Interfaces:**
- Consumes: `centralityQualitative(fv)` (already defined in the same file, already used by
  `centralityClause`).
- Produces: `composeOpeningFrame(fv).guardrail` now includes an additional clause when
  `centralityQualitative(fv) === null`. No signature change.

- [ ] **Step 1: Write the failing test**

Add to `connect-four/server/tests/openingFrame.test.mjs` (append at the end of the file; reuses the
existing `namedFv` fixture, which the file's own line-63 test already confirms has
`centralityQualitative(namedFv) === null`):

```js
test('guardrail forbids inventing a centrality claim when qualitative is null', () => {
  assert.equal(centralityQualitative(namedFv), null); // precondition (also asserted at line 63)
  assert.match(composeOpeningFrame(namedFv).guardrail, /not stated to differ in centrality/i);
});

test('guardrail omits the no-centrality clause when qualitative is non-null', () => {
  // defenseFv's centralityQualitative may be null or a real value depending on the heatmap data;
  // only assert the clause's ABSENCE when a real qualitative value is present.
  if (centralityQualitative(defenseFv) !== null) {
    assert.doesNotMatch(composeOpeningFrame(defenseFv).guardrail, /not stated to differ in centrality/i);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd connect-four && node --test server/tests/openingFrame.test.mjs`
Expected: the first new test FAILs (no such clause exists yet in `GUARDRAIL`).

- [ ] **Step 3: Write minimal implementation**

In `connect-four/server/scripts/reason_engine/openingFrame.mjs`, add a new constant next to
`GUARDRAIL` (around line 65) and use it conditionally inside `composeOpeningFrame`:

```js
const GUARDRAIL = 'Explain the blunder through the opening — book line, centrality, parity. '
  + 'Do NOT ground a specific deep completing cell; the deep resolution is a horizon, not a teachable square.';

const GUARDRAIL_NO_CENTRALITY = ' The two landing cells are NOT stated to differ in centrality or '
  + 'difficulty here — do not say one column is "more central," "the stronger column," or "easier '
  + 'to win through" than the other unless this vector gives you that comparison.';
```

Then in `composeOpeningFrame` (currently: `const base = { confidence: 'high', covers: [],
guardrail: GUARDRAIL };`), change to:

```js
export function composeOpeningFrame(fv) {
  const oc = fv.openingContext;
  if (!oc) return null;
  const guardrail = GUARDRAIL + (centralityQualitative(fv) === null ? GUARDRAIL_NO_CENTRALITY : '');
  const base = { confidence: 'high', covers: [], guardrail };
  // ... rest of the function unchanged (namedOpening / defense / centrality branches)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd connect-four && node --test server/tests/openingFrame.test.mjs`
Expected: PASS.

- [ ] **Step 5: Run the broader fast suite (this touches a widely-reused function)**

Run: `cd connect-four && npm run test:fast`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add connect-four/server/scripts/reason_engine/openingFrame.mjs connect-four/server/tests/openingFrame.test.mjs
git commit -m "fix(reason-render): forbid inventing a centrality claim when qualitative is null"
```

---

### Task 7: Strengthen L7/L3 guardrail wording against defeatist trailers (Issue 3)

**Files:**
- Modify: `connect-four/server/scripts/reason_engine/causalLinks.mjs:62-89` (the `L3` and `L7`
  entries' `guardrail` fields only — do NOT touch `template`)
- Test: `connect-four/server/tests/causalLinks.test.mjs` (or `causalLinksComposers.test.mjs` —
  check which file currently has the L3/L7 guardrail assertions before adding; add alongside them)

**Interfaces:**
- Consumes: nothing new.
- Produces: `CAUSAL_LINKS` entries `L3` and `L7`'s `guardrail` strings gain an appended
  banned-phrase clause. `classifyCausalLink(fv, ctx).guardrail` reflects the new text for any
  record routing to L3/L7. No signature change.

- [ ] **Step 1: Write the failing test**

Open `connect-four/server/tests/causalLinks.test.mjs`, find the existing test asserting
`link.guardrail` matches `/caused or enabled/i` (around line 47, for whichever of L3/L7 that
fixture routes to). Add a new test immediately after it:

```js
test('L3/L7 guardrail forbids defeatist closing phrases', () => {
  const L3_FV = { case: 'lose_to_faster_lose', route: 'realized_denied', direction: 'enabled_opponent',
    lostResource: {}, opponentPunishment: { tag: 'figure_7', completingCell: 'c4r3' } };
  const L7_FV = { case: 'lose_to_faster_lose', route: 'sign',
    lostResource: { kind: 'conditional_swindle' }, opponentPunishment: {} };
  const l3 = classifyCausalLink(L3_FV);
  const l7 = classifyCausalLink(L7_FV);
  assert.equal(l3.id, 'L3');
  assert.equal(l7.id, 'L7');
  for (const link of [l3, l7]) {
    assert.match(link.guardrail, /ends poorly/i);
    assert.match(link.guardrail, /goes against you/i);
  }
});
```

(If `classifyCausalLink` is not already imported in this test file, add it to the existing import
line from `../scripts/reason_engine/causalLinks.mjs`.)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd connect-four && node --test server/tests/causalLinks.test.mjs`
Expected: FAIL — neither L3 nor L7's current guardrail text mentions "ends poorly" or "goes
against you".

- [ ] **Step 3: Write minimal implementation**

In `connect-four/server/scripts/reason_engine/causalLinks.mjs`, update L3's `guardrail` (line 66)
from:

```js
    guardrail: 'MUST NOT say the played move caused or enabled the pattern, and MUST NOT tell the player they are lost; both moves lose, but the better one makes the opponent work hardest — frame it as the toughest defense.',
```

to:

```js
    guardrail: 'MUST NOT say the played move caused or enabled the pattern, and MUST NOT tell the player they are lost; both moves lose, but the better one makes the opponent work hardest — frame it as the toughest defense. Do not add a closing caveat like "but the position is still lost," "both lines end poorly," "the result still goes against you," or "you still lose either way" — the practical-resistance framing must stand on its own, with no defeatist final clause.',
```

And L7's `guardrail` (line 78) from:

```js
    guardrail: 'Do not claim the better move wins, and do NOT tell the player they are lost; frame the better move as the toughest, most resilient defense that keeps the practical swindle alive.',
```

to:

```js
    guardrail: 'Do not claim the better move wins, and do NOT tell the player they are lost; frame the better move as the toughest, most resilient defense that keeps the practical swindle alive. Do not add a closing caveat like "but the position is still lost," "both lines end poorly," "the result still goes against you," or "you still lose either way" — the practical-resistance framing must stand on its own, with no defeatist final clause.',
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd connect-four && node --test server/tests/causalLinks.test.mjs`
Expected: PASS.

- [ ] **Step 5: Run the broader fast suite (guardrail text is read by multiple test files)**

Run: `cd connect-four && npm run test:fast`
Expected: all green — the other 4 files noted in D34 as asserting `causalLinks.mjs` text verbatim
(`causalLinksComposers.test.mjs`, `reasonRealizedDenied.test.mjs`, `reasonRenderFixes.test.mjs`,
plus this one) only assert `template()` output verbatim, not `guardrail` (confirmed by grep before
this plan was written — all `guardrail` assertions repo-wide are `assert.match(...,/regex/i)`
substring checks), so appending text should not break them. If any DOES break, it means a stricter
guardrail assertion existed than the grep found — read it, update the expected substring instead
of reverting the guardrail wording.

- [ ] **Step 6: Commit**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add connect-four/server/scripts/reason_engine/causalLinks.mjs connect-four/server/tests/causalLinks.test.mjs
git commit -m "fix(reason-render): forbid defeatist closing phrases in L3/L7 guardrail text"
```

---

### Task 8: Log the resolved decision in `reason-DECISIONS.md`

**Files:**
- Modify: `docs/architecture/reason-DECISIONS.md` (append a new `### D35` section at the end,
  after the existing D34 section)

No test — append-only decision log, prose only.

- [ ] **Step 1: Append the D35 entry**

At the end of `docs/architecture/reason-DECISIONS.md`, after the D34 section's final paragraph
(`... Modules: reason_engine/causalLinks.mjs, renderReasonModel.mjs, compute.mjs. Invariants: I0
... the coach-voice A5 axis in grade-fv-sufficiency.`), append:

```markdown

### D35 — three condition-D render fixes from the 57-board grading run: tag bare-strip, dropped opening guardrail, defeatist-phrase ban

**Context.** A `grade-fv-sufficiency` run over 57 condition-D answers (57 boards,
`boards_coverage_opening_2026-07-05T18-58-35Z`, model `gpt-5.4`) scored 40 pass / 17 fail, all 17
`prompt_confusion`. Three distinct root causes, none requiring a vector/schema change:

1. **Unclosed annotation tags leak raw markup (13-14/17 fails).** The model sometimes emits a bare
   `[zone:X]`/`[term:X]` opener used as a noun, with no closing tag anywhere. Both
   `processAnnotations`'s `dropUnoffered` and the frontend `parseAnnotatedText` require a paired
   open+close, so an unclosed opener matches neither and its raw markup renders verbatim in the
   coach text the player reads. **Decision:** tighten the prompt instruction (paired-tag rule +
   bad/good example) AND harden `processAnnotations` as a backstop — bare-strip (delete the token,
   no canonical-phrase substitution) any tag still unclosed after normalization, returning a new
   `repairs: string[]` field. `processAnnotations` stays pure (no DB call); `compute.mjs` threads
   `repairs` onto the eval output line as `annotationRepairs`, and `grade-fv-sufficiency` treats a
   non-empty `annotationRepairs` as an automatic G7 fail (`prompt_confusion`). Production logging
   into `deep_reveal_failures` is documented as a TODO in `reason-render-grounded-prompt.md` §10 —
   `processAnnotations` has exactly one caller today (`compute.mjs`, eval-only); there is no
   production endpoint yet to wire the write into.
2. **Invented centrality asymmetry against a null signal (eval-18) — a code bug, not a
   prompt-wording gap.** `assembleGroundedPrompt` always rendered `model.link.guardrail` (the
   unconditional L1-L9 classification's guardrail) and silently dropped `frames[0].guardrail` (the
   opening frame's own guardrail) — so an opening record's model never saw any instruction against
   inventing a centrality claim; the composed frame text itself was already correct (omits the
   clause when `centralityQualitative` is null), but nothing told the model not to add one anyway.
   **Decision:** `assembleGroundedPrompt` now combines both guardrails when they differ (a
   non-opening record's `frames[0].guardrail` already equals `link.guardrail`, so no duplication);
   `openingFrame.mjs`'s `GUARDRAIL` gains a conditional clause, appended when
   `centralityQualitative(fv)` is null, explicitly forbidding an invented centrality/difficulty
   claim.
3. **Player-2 opening defeatism (eval-23, eval-24) — model non-compliance, not a missing
   guardrail.** L7's guardrail (per D34) already said "do NOT tell the player they are lost," and
   `grade-fv-sufficiency`'s A5b/G2 rubric (LLM-judged, not mechanical) already correctly caught
   both cases. **Decision:** strengthen L3/L7's `guardrail` text (not `template` — the verbatim-
   asserted player-facing text is unchanged) with an explicit banned-phrase list ("ends poorly,"
   "goes against you," etc.). Given this is already correctly guarded and graded, and only 2/57
   cases, **accept as a monitored residual** rather than building a mechanical detector or a second
   LLM rewrite pass — revisit with a heavier approach only if it recurs at a meaningfully higher
   rate in a future grading round.

**Source:** session 2026-07-06, branch `opening-theory`. Design:
`docs/superpowers/specs/2026-07-06-condition-d-render-failures-fix-design.md`. Modules:
`renderReasonModel.mjs`, `reason_engine/zoneAnnotations.mjs`, `reason_engine/openingFrame.mjs`,
`reason_engine/causalLinks.mjs`, `compute.mjs`. Docs updated: `reason-render-grounded-prompt.md`
§10 (TODO), `.claude/skills/grade-fv-sufficiency/SKILL.md` (G7c). Invariants: I0 (render-only, no
vector/schema change).
```

- [ ] **Step 2: Commit**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add docs/architecture/reason-DECISIONS.md
git commit -m "docs(reason): log D35 — condition-D render fixes from the 57-board grading run"
```

---

### Task 9: Full regression run

**Files:** none (verification only).

- [ ] **Step 1: Run the full fast suite**

Run: `cd connect-four && npm run test:fast`
Expected: all green, no regressions from Tasks 1-7.

- [ ] **Step 2: Spot-check the reproduction cases from this plan's motivating evidence**

Run a quick manual check that the three original failing examples no longer exhibit their defect
mechanically (full re-grading via `grade-fv-sufficiency` against a fresh LLM run is a follow-up,
not part of this plan — these fixes are prompt/guardrail changes whose effect on live model output
can only be fully confirmed by re-running the eval, which is a separate, explicit follow-up step
for the user to trigger):

```bash
cd connect-four && node --input-type=module -e '
import { processAnnotations } from "./server/scripts/reason_engine/zoneAnnotations.mjs";
const zones = { aliases: [], terms: [{ slug: "immediate_threat" }] };
const r = processAnnotations("You needed to keep the [term:immediate_threat] on c2 alive.", zones);
console.log(JSON.stringify(r, null, 2));
'
```

Expected output: `mechanism` contains no `[term:` substring, `repairs` equals
`["unclosed_tag:term:immediate_threat"]`.

- [ ] **Step 3: Confirm no leftover reference to the old bare `postprocessAnswer` return contract**

Run: `cd connect-four && grep -rn "postprocessAnswer(" server/ --include="*.mjs" --include="*.js"`
Expected: every call site destructures `{ answer, repairs }` (or `.answer`) — none treats the
return value as a bare answer object.
