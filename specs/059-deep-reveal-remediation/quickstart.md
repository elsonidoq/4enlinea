# Quickstart: verifying Epic 12 / spec 059 work

## Baseline (re-measure at branch point — do not trust a recalled number)

```bash
cd connect-four && npm run test:fast
```

Measured for this plan at branch point (2026-08-27): **1999 pass / 0 fail, 278 suites**, 0 eslint
errors. This is the number every task's regression check compares against (FR-027) — re-measure it
yourself before relying on it if time has passed, since this tree carries uncommitted WIP.

**Never open or edit `connect-four/package.json` directly** (its `test:fast` line is one
7,146-character string; exact-match editing it has killed prior agents). New test files
(enumerated in tasks.md) must be handed to the human to append.

## US1 — measurement (no LLM call needed to verify the harness plumbing)

```bash
cd connect-four
node -e "
import('./server/reasonRenderGuard.mjs').then(async ({ guardExplainMoveLlmPayload, toAllowedSet }) => {
  const { Board } = await import('./server/classifier.js');
  // substitute a real recorded answers row's movestring/aliases/mechanism here
});
"
```

Regression fixture (harvested, do not hand-write — SC-001): replaying
`fv_suff_answers_boards_subset_2026-08-26T15-47-56Z` through the new `served` field must show **0**
raw `cNrM` tokens in prose (tags stripped) and **exactly 5** runs losing ≥1 `[zone:…]` span.

## US2/US3 — board-truth and offer/template consistency (deterministic, corpus-wide)

Every fix is validated against the **63-record corpus** (`server/scripts/reason_corpus/boards.jsonl`
+ `evidence.jsonl`, solver-free, committed) via `render*.test.mjs` files, never via an LLM call
(FR-031). Regenerate `evidence.jsonl` only if the reason engine itself changed — it did not in this
epic (Out of Scope: "the reason engine").

```bash
cd connect-four && node --test server/tests/renderCoverageCorpus.test.mjs server/tests/renderCoverageUniverse.test.mjs server/tests/reasonRenderFixes.test.mjs
```

## Do NOT run

- Any LLM eval batch (`compute.mjs --llm`, or a `grade-fv-sufficiency` dispatch) — 125+ model calls
  plus a 25-agent grading fan-out; gated on the owner, scheduled only as a final optional step
  (Q7, provisional).
- Any deploy action.

## Deployment prerequisites

See plan.md's Deploy Prerequisites section and the `docs/deployment_steps.md` entries tasks.md will
add — every task that changes served text must append its own entry there before being marked done.
