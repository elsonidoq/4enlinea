---
name: project_deep_reveal_eval_harness_gap
description: "run_eval.mjs is DEPRECATED and evaluates a RETIRED path; judge-deep-reveals has no live producer; compute.mjs --condition D shares production's prompt builder and SINCE 2026-09-01 has --retry (default is still single-attempt, and a run without it is a FLOOR)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 27fa7982-3633-4667-b874-6e6635ff6e81
  modified: 2026-09-01T21:10:21.577440Z
---

Before proposing to "measure the deep reveal", check which layer the harness actually touches.
Three traps, all of which cost a session:

**`server/scripts/run_eval.mjs` is DEPRECATED** — its own line 1 says
`DEPRECATED (2026-07-01): the old LLM-explanation eval is retired — it is no longer evaluated. …
Do not build new work on this file.` It imports `buildExplainContext` + `callLLM`, i.e. the retired
explain path, and **never imports `computeMechanism`**. Running it measures code you do not ship.
Two more sharp edges: its default input `eval_set_small.json` does not exist in the repo, and
`--help` is not implemented — the flag is ignored and it *starts a real run*, then crashes.

**`docs/architecture/feature-vector-sufficiency-experiment.md` §1 still narrates run_eval as the
production evaluator.** That prose predates the deprecation. This is how the trap gets re-entered:
the doc reads authoritative and the deprecation lives only in the script header.

**The `judge-deep-reveals` skill has no live producer.** Its Input section expects run_eval's record
shape (`prompt`, `attempt1_response`, `attempt1_failures`, `final_response`, `premove_scores`…).
`compute.mjs` emits a different shape. The 9-item rubric is genuinely good and its items 1/2/8/9 map
onto real production defects — but wiring a producer is a build, not a run.

**`compute.mjs --condition D` IS production-faithful — by shared code, not resemblance.**
`server/mechanismExplainer.mjs` **imports** `buildPromptForCondition` and `renderDecisionForCondition`,
which are **defined in `server/scripts/compute.mjs`**. Production server code depends on a script in
`scripts/`. Surprising, but it means condition D is the same prompt path production uses.

**What no harness covers: the retry layer.** `compute.mjs` calls the model directly;
`computeMechanism`'s single shared retry (required-set miss and/or better-column miss) sits above it.
Attempt-1 behaviour is measurable; retry effect is not. Also `compute.mjs` passes **no locale**
(defaults `'en'`) while production threads `locale` — so Spanish output has zero eval coverage.

Only `server/index.js` and the unit tests drive `computeMechanism`. There is **no batch harness for
the production deep-reveal path** (OI-183).

Related: `docs/architecture/server-conventions.md` §"Which function actually serves production deep-reveal", [[feedback_eval_design_methodology]],
[[project_reason_render_layer]]


## The retry gap has a number now (2026-08-26) — and it has cost TWO sessions

`compute.mjs --llm --condition D` calls the model **once**. `computeMechanism` — what `index.js`
actually serves — gets a second attempt whenever the answer omits a required square/line **or** never
names the better column, with both misses folded into ONE amended retry prompt on a single shared
budget, plus an admin failure row (`deepRevealFailuresRow.js`) if a required square is still missing.

Measured by replaying 125 condition-D runs through production's OWN trigger functions
(`missingRequiredGroups`, `mentionsBetterColumn` — imported from `mechanismExplainer.mjs`, never
reimplemented): **48/125 (38%) would have been retried** — 34 missing a required handle, 22 never
naming the better column.

**The trap, and it is a strong one:** graded runs make it look like the required set is never enforced
and that enforcement needs designing. It does not — it has existed since spec 058. Two sessions in a
row reached the wrong conclusion from these gradings, and the second one (2026-08-25) reported it to
the owner twice as a finding before checking `computeMechanism`. **Before concluding that the model
ignores the required set, or that a retry needs building, read `computeMechanism` and [[reference_open_issues_epics]]'s OI-183.**

Corollary: every A6 / A7c / G7 number in `reason_corpus/runs/` is a FLOOR, not shipped behaviour. The
standing caveat lives at the top of that directory's `README.md`. Owner decision 2026-08-26: the
harness stays as-is deliberately; carry the caveat instead of spending a measurement arm.


## CLOSED 2026-09-01 — the harness now has `--retry`, and the gap above is historical

`compute.mjs --retry` exercises production's real retry. The decision was extracted verbatim into
`server/retryDecision.mjs` (`decideRetry`) and is called by BOTH `computeMechanism` and the harness,
so the eval runs production's rule and not a reimplementation (I12). OI-183 is RESOLVED; D60 records it.

**What still bites, so keep reading this memory:**
- **The default is still single-attempt.** A run WITHOUT `--retry` remains a floor. The flag is opt-in
  precisely so historical single-attempt comparability is preserved.
- **`--retry` is gated to condition D** and reproduces the two CONTENT triggers only; call/parse-error
  rows stay single-attempt (production also retries those, the harness does not).
- **A6 is no longer an independent measure on a `--retry` run** — it is one of the two triggers, so the
  instrument re-prompts on A6's own failure condition. Never compare a `--retry` A6 to a single-attempt one.
- Everything above about `run_eval.mjs` being deprecated, `judge-deep-reveals` having no live producer,
  and compute.mjs passing no locale is UNCHANGED and still true.
