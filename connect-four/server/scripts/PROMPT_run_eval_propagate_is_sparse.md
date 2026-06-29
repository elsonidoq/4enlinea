# Task: make `run_eval.mjs` record `is_sparse` (and `lookahead_fired`) in each result line

## Context

`server/scripts/run_eval.mjs` runs the deep-reveal eval pipeline. For each entry in an
eval set it builds an explain context via `buildExplainContext(...)`, runs the LLM, and
appends one JSON record per entry to a timestamped `*_results_*.jsonl` file. The downstream
judge (`/judge-deep-reveals`) needs to know, per entry, whether the position is an
"anchorless / sparse" board where the new sparse-board forward look-ahead engine is supposed
to fire.

That signal currently does NOT appear in the result records, so the judge has to re-join the
results file against the source eval set by `id`. We want the results file to be
self-describing.

There are two sources of truth for the sparse flag, and we want BOTH captured:

1. **Eval-set field** — each entry in the source eval set (e.g.
   `server/scripts/eval_set_large_2.json`) already carries an `is_sparse` boolean,
   precomputed from `buildExplainContext`'s real `isSparse` flag. Propagate it as
   `is_sparse`.
2. **Live runtime flags** — `buildExplainContext(...)` returns an object that includes
   `isSparse` (boolean) and `lookaheadFired` (boolean). These are the ground truth for THIS
   run. Record them as `runtime_is_sparse` and `lookahead_fired`. (`lookahead_fired` should
   also equal whether the built prompt contains the `## What the better move leads to`
   section, but read it from the returned flag rather than string-matching.)

## Changes to make in `server/scripts/run_eval.mjs`

1. In the `record = { ... }` initializer (around line 63), add three fields with safe
   defaults:
   ```js
   is_sparse: entry.is_sparse ?? null,   // from the source eval set
   runtime_is_sparse: null,              // filled from buildExplainContext result
   lookahead_fired: null,                // filled from buildExplainContext result
   ```

2. After the successful `buildExplainContext(...)` call (the `context = await
   buildExplainContext(...)` line near line 88), set the runtime fields from the returned
   context, e.g.:
   ```js
   record.runtime_is_sparse = context.isSparse ?? null;
   record.lookahead_fired = context.lookaheadFired ?? null;
   ```
   Place this assignment where `context` is known-good (inside/after the try that builds it,
   before the record is written). Make sure it does not throw if `context` is undefined on
   the error path — the error path appends the record before context exists, so only set
   these on the success path.

## Constraints

- Do not change any other field names or the ordering/structure of the existing record
  shape; only add the three new keys.
- Do not change resume/skip logic, the LLM calls, or the validation flow.
- Keep the change minimal and self-contained.

## Verify

- Run the script against a tiny eval set (or a 1–2 entry slice) and confirm each emitted
  JSONL line now contains `is_sparse`, `runtime_is_sparse`, and `lookahead_fired`, and that
  for an anchorless entry where the look-ahead section appears in `prompt`,
  `lookahead_fired` is `true`.
- Confirm `is_sparse` matches the source eval set's value for the same `id`.
