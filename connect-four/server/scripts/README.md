# `connect-four/server/scripts/` — server-runtime + eval tooling

Scripts here import `server/` runtime modules (`classifier.js`, `explainContext.js`,
`c4solver-wrapper.js`, `gameSampling.js`, the reason engine). That `server/`-import dependency is the
line between this folder and the package-root `connect-four/scripts/` (DB/ops/asset tooling, no
`server/` imports). Run everything from `connect-four/`.

The scripts belong to **two eval pipelines** plus standalone/ops tools — see the **"Scripts &
tooling"** section of the repo-root `README.md` for the pipeline-grouped catalogue with usage.

Quick map:

- **`reason_engine/`** — the blunder-reason engine (`reasonEngine.mjs` = `computeReason`),
  `reason_fixture.jsonl` (regression fixture; regenerated via `select_boards.mjs --strategy fixture`),
  `lib/`, `TOOLS/`.
- **Reason-vector LLM eval (Pipeline B):** `select_boards.mjs` (Stage ① board sets; `--strategy
  coverage` or `--strategy fixture`) → `compute.mjs --input <boards>` (evidence; add `--llm` for LLM
  answers) → `grade-fv-sufficiency` skill. Shared projection: `reasonNarratorVector.mjs`. Runbook:
  `RUNBOOK_fv_sufficiency.md`.
- **Deep-reveal coach eval (Pipeline A):** `generate_eval_set.mjs` → `run_eval.mjs` →
  `judge-deep-reveals`; `filter_failing_evals.mjs`, `corpus_annotation_check.mjs`, `print_lookahead.mjs`.
- **Ops / diagnostics:** `set-tier.js`, `delete-user.mjs`, `import_papergames_blunders.mjs`,
  `reprocess_blunders.mjs`, `generate_all_candidates.mjs`, `generate_tagblunder_fixtures.mjs`,
  `classify_all.mjs`, `debug_*.mjs`, `diagnose_blunders.mjs`.
