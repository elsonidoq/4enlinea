# Harness Retry Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the offline eval harness (`compute.mjs`) exercise **production's own single retry**, behind a `--retry` flag, so that measured A7/G1 rates stop being a floor computed on text production would never have served.

**Architecture:** Production's retry decision currently lives inside `computeMechanism` as four module-private helpers. This plan **extracts that decision into one exported function** used by BOTH `computeMechanism` and `compute.mjs` — so the eval provably runs production's rule rather than a copy of it. A reimplementation in the harness would be exactly the hand-rolled proxy invariant **I12** forbids, and would make the resulting numbers unfalsifiable.

**Tech Stack:** Node ESM, `node:test` via `npm run test:fast` (inside `connect-four/`), OpenAI chat via `callOpenAIChat`, eval harness `server/scripts/compute.mjs`.

**Spec:** No separate spec file. The motivating measurement is in `docs/architecture/reason-DECISIONS.md` **D60** and in `.superpowers/sdd/2026-09-01-deep-reveal-a7-remediation/progress.md`. Owner decision 2026-09-01: **harness retry first**, ahead of further render fixes; the full 63-board re-baseline stays PENDING and is explicitly **not** part of this plan.

## Why this is the highest-value next step (measured, not asserted)

Verified against the 2026-08-28 grades + the live render layer on 2026-09-01:

- Of the 75 A7-failing corpus runs (2026-08-28 grades), **56** carry **A7b** (an unlocatable referent) and **23** carry **A7c**.
- "Required handle dropped" and "better column never named" are **precisely production's two content retry triggers** (`mechanismExplainer.mjs`, `computeMechanism`).
- Earlier measurement over the 2026-08-28 run: **48 of the 75 A7-failing runs (64%) would have fired production's retry.**

So a large fraction of what the eval calls a failure is text **production would have discarded**. Until the harness retries, every A7 number is a floor and further render work risks optimising an artifact.

**All of the figures above are v2-graded** (`GRADER_INSTRUCTIONS_v2.md`-era grades) and must not be read as v3 numbers — see the next section.

### Interaction with rubric v3 — a hard ordering constraint

`GRADER_INSTRUCTIONS_v3.md` (measured at source 2026-09-01) is v2 verbatim plus one new A7 subtest, **A7e SEVERITY**: when the played move leaves the opponent a gravity-top four (a mate in 1), the explanation must make it unmistakable that the opponent finishes on their very next move. It triggers on **10 of the 63** corpus records.

**The retry cannot rescue an A7e failure.** Production's two content triggers are "a required handle was dropped" and "the better column was never named"; an A7e failure is "the served text never conveyed that the move loses next move." Neither trigger fires on it. So under v3 the share of failures the retry can rescue is **strictly smaller** than this plan's motivating numbers suggest.

**Measured exposure:** of the 10 A7e-trigger records, **25 of their 30 runs currently PASS A7 under v2**. If all 25 were to fail A7e, corpus A7 would fall from **114/189 (60.3%)** to **89/189 (47.1%)** before any retry.

**The hard constraint:** v3 and `--retry` move A7 in **opposite** directions, so a measurement that changes both at once is uninterpretable — a retry gain and a severity loss cannot be separated. **Never change rubric version and retry status in the same measurement.** This is the same principle the plan already applies when it refuses to bundle a render change with an instrument change (see "Explicitly OUT of scope") — except that here both changes are to the instrument.

**Recommended order** (a recommendation, not a decision): run the retry first, still graded under **v2**, against the existing v2 baselines, so the retry's effect is isolated; then re-grade both arms under v3 separately — that second step costs only grader agents, since it re-grades answers already on disk and needs no generations.

## Global Constraints

- **Mandatory reads before touching `mechanismExplainer.mjs` or anything under `reason_engine/`:** `docs/architecture/reason-AGENT-PREAMBLE.md`, `docs/architecture/reason-INVARIANTS.md` (especially **I12** — never validate through a hand-rolled proxy), `docs/architecture/reason-DECISIONS.md` — at minimum **D51** (which established this exact retry seam and its rejected alternatives), **D53** (the harness stores both pre-guard `mechanism` and post-guard `servedExplanation`), and **D60**. Do not relitigate them.
- **D51 is binding and must not be re-opened.** It states: the guard-aware required-set check runs BEFORE the existing single retry, on `attempt1`; the retry **budget and trigger set are unchanged**; the endpoint's own guard call on `finalAttempt.mechanism` is a separate invocation. This plan changes **where the decision code lives**, never what it decides.
- **Production behaviour must be byte-identical.** `computeMechanism`'s observable output (including `attempt1`, `missingHandles`, and call count) must not change. This is a pure extraction.
- **Do NOT create new test files.** Append to the already-registered `connect-four/server/tests/mechanismExplainer.test.mjs`. Never touch `package.json` (its test list is one enormous line; editing it has killed agents).
- **Do NOT commit and do NOT `git add` anything.** Leave changes unstaged. Never `git stash`. No `.bak*` files in the repo — use a temp dir outside it.
- **Tests:** `cd connect-four && npm run test:fast`. Baseline is **2097 pass / 0 fail / 282 suites, 0 eslint errors** (verified 2026-09-01). End green.
- **`OPENAI_API_KEY` is present** in `connect-four/server/.env`. Never print it, never echo it, never write it to a report.
- Corpus: `connect-four/server/scripts/reason_corpus/evidence.jsonl` — look records up **by id, never line number**. Movestring digits are **0-indexed columns directly**.

---

### Task 1: Extract production's retry decision into one exported function

**Files:**
- New: `connect-four/server/retryDecision.mjs` (leaf module — see circular-import note below)
- Modify: `connect-four/server/mechanismExplainer.mjs` (`computeMechanism`, plus the private helpers `missingRequiredGroups`, `buildRetryPrompt` — moved into the new module)
- Test: `connect-four/server/tests/mechanismExplainer.test.mjs` (append)

**Why:** The retry decision is currently inlined in `computeMechanism`'s `else` branch and depends on four module-private-or-nearly-private symbols: `missingRequiredGroups`, `buildRetryPrompt`, `isLlmError` are module-private; `mentionsBetterColumn` is already exported but is also a dependency of the decision. Nothing outside the module can ask "would production retry this answer, and with what prompt?" — which is exactly what the harness needs. `toAllowedSet` is already exported from `reasonRenderGuard.mjs`.

**Circular-import note:** `mechanismExplainer.mjs` already imports `buildPromptForCondition`, `renderDecisionForCondition`, and `postprocessAnswer` from `./scripts/compute.mjs`, and `compute.mjs` sits on the server boot path (`index.js → mechanismExplainer.mjs → compute.mjs`). If `decideRetry` lived in `compute.mjs` and were imported back into `mechanismExplainer.mjs`, that would close a cycle. Instead, put `decideRetry` in a new leaf module, `server/retryDecision.mjs`, imported by BOTH `mechanismExplainer.mjs` and `compute.mjs`. This removes the cycle entirely and changes no decision.

**Interfaces — this is what Task 2 consumes:**

```js
// server/retryDecision.mjs — NEW module, NEW export
// Decides whether production would retry, and returns the amended prompt if so.
// No LLM call, no solver, no network; may log (guardExplainMoveLlmPayload can console.warn
// from the annotation gate). Runs the guard for its diagnostics exactly as computeMechanism
// does (D51: guard-aware, on attempt1, BEFORE the retry check).
export function decideRetry({ attempt1, renderDecision, prompt, movestring, bestCol, locale = 'en' })
// returns:
// { shouldRetry: boolean,
//   missing: Array<{handle, spec, role, truthBoard}>,   // missingRequiredGroups output
//   missingBetterColPhrase: string|null,
//   retryPrompt: string|null }                          // null when shouldRetry is false
```

- [ ] **Step 1: Write the failing test** (append to `mechanismExplainer.test.mjs`). There is no standalone `renderDecision` fixture in this file to reuse — every existing test drives `computeMechanism` with an injected `callLLM` and a REAL solver (`before(async () => { solver = await createSolverProcess(); })`), and its only fixtures are JSON strings (`okAnswer`, `missingAnswer`, `noColumnAnswer`). Build the real construction path instead of authoring a proxy:

```js
test('decideRetry reproduces computeMechanism\'s own trigger decision (D51 seam, extracted)', async () => {
  // Build a REAL renderDecision via the production path — do not author one by hand.
  const nv = toNarratorVector(await computeReason(MOVESTRING, PLAYED_COL, { solver }));
  const renderDecision = renderDecisionForCondition(nv, 'D');
  const { answer } = parseAnswer(missingAnswer);
  const { mechanism, usedSpecs } = postprocessAnswer(answer, renderDecision);

  // A required-set MISS must decide shouldRetry === true and name the missing group.
  const d = decideRetry({ attempt1: { mechanism, usedSpecs, answer }, renderDecision, prompt: 'P',
                          movestring: MOVESTRING, bestCol: nv?.bestCol ?? null, locale: 'en' });
  assert.equal(d.shouldRetry, true);
  assert.ok(d.missing.length > 0);
  assert.ok(d.retryPrompt.startsWith('P'));            // amended prompt extends the original
  assert.match(d.retryPrompt, /Retry: required squares were missing/);
});
```

**Do not author a literal `renderDecision` or `requiredSet` object.** That is the hand-rolled proxy invariant I12 forbids — build `renderDecision` only via `renderDecisionForCondition` over a real `computeReason` result, as above.

- [ ] **Step 2: Run it, verify it fails** with `decideRetry is not a function`. `cd connect-four && node --test server/tests/mechanismExplainer.test.mjs 2>&1 | tail -20`

- [ ] **Step 3: Extract.** Move the body of `computeMechanism`'s `else` branch — from `const requiredSet = …` down to and including the `buildRetryPrompt(...)` call, plus the private helpers `missingRequiredGroups` and `buildRetryPrompt` themselves — into the new `server/retryDecision.mjs`, exporting `decideRetry` with the shape above instead of performing the call. `mechanismExplainer.mjs` imports `decideRetry` from `./retryDecision.mjs`. Then rewrite that `else` branch to:

```js
  } else {
    const { shouldRetry, missing, retryPrompt } = decideRetry({
      attempt1, renderDecision, prompt, movestring, bestCol: nv?.bestCol ?? null, locale,
    });
    if (shouldRetry) {
      missingHandles = missing;
      finalAttempt = await runLlmAttempt(retryPrompt, renderDecision, call);
    }
  }
```

**Preserve exactly**, or the extraction is not behaviour-preserving:
- the guard invocation (`guardExplainMoveLlmPayload({ explanation: attempt1.mechanism, board, allowedSet, diagnostics: true })`) and the `survivedSpecs` filter — D51's whole point;
- `new Board(movestring)` and `toAllowedSet(renderDecision?.zones?.aliases ?? [])`;
- `mentionsBetterColumn(attempt1, bestCol, locale)` and the `serverT(locale, 'column')(bestCol + 1)` phrase;
- the `missing.length > 0 || missingBetterColPhrase` condition;
- `isLlmError`'s separate branch — it stays in `computeMechanism`, untouched. `decideRetry` handles **content** triggers only.

- [ ] **Step 4: Prove the extraction changed nothing.** `npm run test:fast` must stay at **2097 + your new tests**, with **every pre-existing test in `mechanismExplainer.test.mjs` passing unmodified**. That file's header says its older tests deliberately encode specific retry counts — if any of them needs editing, the extraction is wrong; fix the code, not the test. State this explicitly in your report.

- [ ] **Step 5: Leave unstaged.**

---

### Task 2: `compute.mjs --retry` — exercise the real decision, and record both attempts

**Files:**
- Modify: `connect-four/server/scripts/compute.mjs` (CLI parsing near `argVal`; the `runLlm` per-run loop)
- Test: `connect-four/server/tests/mechanismExplainer.test.mjs` (append — do NOT create a compute.mjs test file)

**Why:** The harness makes exactly one call per run and stores its result. Production makes a second when a required handle is missing or the better column is unnamed. Measuring the first attempt and calling it production's output is the OI-183 floor.

**Interfaces — consumes Task 1's `decideRetry` (imported from `server/retryDecision.mjs`). New answers-row fields (additive; every existing field keeps its current meaning so old readers and the `/admin/fv-suff` page keep working):**

```
retry_fired:      boolean          // false when --retry is off, or on and not triggered
retry_reason:     null | { missingHandles: string[], missingBetterCol: boolean }
attempt1:         null | { raw, answer, parse_error, call_error, guardDiagnostics, annotationRepairs, servedExplanation }
```

When the retry fires, the TOP-LEVEL `raw` / `answer` / `mechanism` / `servedExplanation` / `annotationRepairs` describe the **final** attempt (what production would serve); `attempt1` preserves the discarded first one. When it does not fire, `attempt1` stays `null` and nothing else changes.

- [ ] **Step 1: Failing test** — a pure unit test of the row-shaping, no network. Export whatever small helper you need from `compute.mjs` (it already exports `postprocessAnswer` and `computeServedExplanation`, so exporting is the established pattern there). Assert: retry off → `retry_fired === false`, `attempt1 === null`, row otherwise byte-identical to today's shape; retry on and triggered → top-level fields hold the second attempt, `attempt1` holds the first, `retry_reason.missingHandles` names the handles.

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement.** Add `useRetry` to the module-scope `let` list near line 100 (`let inputArg, INPUT, …, useLlm, ts, N, model, CONDITIONS, idFilter, sentenceBudget, locale;`) — do **not** declare it as a `const` inside the CLI guard, since that guard's block scope (`if (process.argv[1] === fileURLToPath(import.meta.url)) { … }`) is invisible to `runLlm`. Inside the guard, assign `useRetry = process.argv.includes('--retry');` beside the existing `useLlm` parse. Import `decideRetry` from `../retryDecision.mjs`. Gate the retry to condition `D` — on A/B/C, `renderDecision` is null (the required-set trigger is dead) and `buildRetryPrompt` would append text referring to "the Decision block above," which those prompts don't contain; production itself is D-only. In the per-run loop, after `postprocessAnswer` and before building `line`:

```js
let retry_fired = false, retry_reason = null, attempt1Row = null;
if (useRetry && CONDITION === 'D' && !call_error && !parse_error) {
  const d = decideRetry({
    attempt1: { mechanism: answer?.mechanism ?? null, usedSpecs, answer },
    renderDecision: render_decision, prompt, movestring: nv.movestring,
    bestCol: nv?.bestCol ?? null, locale,
  });
  if (d.shouldRetry) { /* second callOpenAIChat with d.retryPrompt; re-run parseAnswer +
                          postprocessAnswer + computeServedExplanation on it; keep the first
                          attempt in attempt1Row; set retry_fired/retry_reason */ }
}
```

**Verify at source before writing this**: `postprocessAnswer` is one function returning `{ answer, repairs, usedSpecs }` on both exits — there is no asymmetry in the function itself. `compute.mjs`'s call site simply discards `usedSpecs` in its destructure today; add it there. `decideRetry` needs `usedSpecs`. Do **not** recompute `usedSpecs` by re-running `processAnnotations` yourself — thread the value `postprocessAnswer` already returns.

**The second call must use the same `callOpenAIChat` options as the first** (`model`, `endpoint: 'compute-eval'`, `purpose: 'offline-eval'`), so cost accounting stays correct.

- [ ] **Step 4: Print a retry summary** at the end of `runLlm`, beside the existing `Done. N ok, M failed` line: how many runs retried, and the trigger split (missing-handles vs missing-better-column vs both). This is the number the owner will read first. Also print: "`--retry` reproduces production's two content triggers only; call/parse-error rows remain single-attempt" and "A6 on a `--retry` run is not an independent measure — it is one of the retry's own triggers. Report it separately and never against a single-attempt baseline."

- [ ] **Step 5: `--help` text.** `compute.mjs` has a `HELP` constant — add `--retry` with a description that says plainly: *a `--retry` run is NOT comparable to historical single-attempt runs on any judgment axis; it reproduces production's two content triggers only (call/parse-error rows remain single-attempt); it is gated to condition D; and A6 is not an independent measure on a `--retry` run since it is one of the retry's own triggers.*

- [ ] **Step 6: Verify the circular-import fix.** `node server/scripts/compute.mjs --help` must succeed, and the server must still boot (`npm start` or equivalent) — confirming `retryDecision.mjs` broke the `mechanismExplainer.mjs` ↔ `compute.mjs` cycle rather than recreating it.

- [ ] **Step 7: `npm run test:fast` green. Leave unstaged.**

---

### Task 3: Dry-run the flag without spending a full generation

**Files:** none modified — this is a verification task producing a report only.

**Why:** Retry is per-run, so a full 14-case smoke set at `--n 3` is up to **84** model calls, not 42 — prove the flag does what it claims on data already on disk before spending that.

**Task 3 is unaffected by the rubric version.** It measures retry *eligibility* from the stored answers (required handles and the better-column phrase), never from grades, so no rubric version enters into it. This matters because it means the dry-run can proceed regardless of which grading order is chosen.

- [ ] **Step 1: Replay, don't regenerate.** Write a throwaway script (in a temp dir, NOT the repo) that reads the **existing** answers file `connect-four/server/scripts/reason_corpus/runs/fv_suff_answers_boards_smoke_a7wave1_2026-09-01T16-55-47Z.jsonl`. **Do not recompute `usedSpecs` from the stored `answer`** — the stored `answer.mechanism` is already post-`processAnnotations` (handles have been rewritten to specs), so re-running `processAnnotations` on it yields `usedSpecs` empty for every row (measured: 42/42 empty) and would report 42/42 retry-eligible, which is this plan's own "wiring is broken" signal. Instead, for every row: parse the stored `raw` field with `parseAnswer`, then run `postprocessAnswer(answer, row.render_decision)` and use its `usedSpecs`. Then call `decideRetry` with that row's stored `render_decision`, the postprocessed `mechanism`, and this `usedSpecs`. Report: how many of the 42 runs **would** retry, and the trigger split. **Expected (reviewer-measured with the corrected method): 20 of 42 retry-eligible — 16 missing-handles only, 2 column only, 2 both.** If your replay lands far from this, the wiring is wrong — say so and stop rather than reporting a number you do not believe.

- [ ] **Step 2: Sanity-check the number against the independent prior measurement.** The 64% prior (48 of 75 A7-**failing** runs) and Step 1's measurement have different denominators — Step 1 measures eligibility over **all** runs, not just A7-failing ones. Recomputed over all runs: 83 of 189 = 44% on the 2026-08-28 run. Expect your smoke-set number to land in **~40–55% of all runs** (prior: 83/189 = 44% on the 2026-08-28 run) — not a target, since that run predates the six render changes recorded in D60, only a neighbourhood check. If it is 0% or 100%, the wiring is wrong — say so and stop rather than reporting a number you do not believe.

- [ ] **Step 3: One live end-to-end probe, 1 case × 1 run.** Pick a record your Step-1 replay says WOULD retry. Run:

```
node server/scripts/compute.mjs --input server/scripts/reason_corpus/boards_smoke_a7wave1.jsonl --ids <record-id> --condition D --llm --n 1 --retry --model gpt-5.4-mini --out server/scripts/reason_corpus/runs/reason_evidence_retryprobe.jsonl
```

`--condition D` is required: `compute.mjs` defaults to condition `A`, where `renderDecisionForCondition` returns `null`, `requiredSet` is empty (the required-set trigger is dead), and `computeServedExplanation` returns `servedExplanation: null` — making the step's own assertion unfalsifiable without it. Use `--ids` (it already filters both passes) rather than building a one-row input file. Confirm from the output row that `retry_fired === true`, `attempt1` is populated, and the top-level `servedExplanation` differs from `attempt1.servedExplanation`. **Two model calls total — do not run the whole smoke set.**

- [ ] **Step 4: Report** the replay table, the live probe's before/after served text, and an explicit statement of whether the flag is ready for a full measured run.

---

## Explicitly OUT of scope

- **The 63-board re-baseline** (189+ generations, 63 grader agents) — still PENDING owner approval, and nothing here should be read as approving it.
- **Re-running the 14-case smoke set with `--retry`.** That is the obvious next measurement, but it is a spend decision for the owner after Task 3's dry-run report.
- **Any render-layer change**, including the narrow A7c required-set fix. This plan is instrument-only; mixing an instrument change with a behaviour change would make the next measurement unattributable.
- **Changing the retry budget or trigger set** — D51 fixed both; this plan only relocates the decision.

## Self-review notes

- Every code fact was harvested from source on 2026-09-01, not recalled: `computeMechanism`'s structure, the private helpers `missingRequiredGroups`/`buildRetryPrompt`/`isLlmError` plus the already-exported dependency `mentionsBetterColumn`, `toAllowedSet`'s export, `compute.mjs`'s single-call loop and its existing exports, and the fact that `compute.mjs`'s call site discards `postprocessAnswer`'s `usedSpecs` in its destructure (flagged inline as a verify-before-writing item — `postprocessAnswer` itself is one function with one return shape, `{ answer, repairs, usedSpecs }`).
- The one authored artifact is `decideRetry`'s signature. Treat the Task-1 test sketch as a **shape**, not as text to paste: build it from the fixtures already in `mechanismExplainer.test.mjs`.
- Ordering is strict: 1 → 2 → 3. Task 2 cannot start before `decideRetry` exists; Task 3 needs both.
