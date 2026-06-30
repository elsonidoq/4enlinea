# `connect-four/server/scripts/` — server-runtime + eval tooling

Scripts here import `server/` runtime modules (`classifier.js`, `explainContext.js`,
`c4solver-wrapper.js`, `gameSampling.js`, the reason engine). That `server/`-import dependency is the
line between this folder and the package-root `connect-four/scripts/` (DB/ops/asset tooling, no
`server/` imports). Run everything from `connect-four/`.

The scripts belong to **two eval pipelines** plus standalone/ops tools — see the **"Scripts &
tooling"** section of the repo-root `README.md` for the pipeline-grouped catalogue with usage.

Quick map:

- **`reason_engine/`** — the blunder-reason engine (`reasonEngine.mjs` = `computeReason`),
  `build_fixture.mjs` → `reason_fixture.jsonl` (regression fixture), `build_evidence.mjs` →
  `reason_evidence_all.jsonl` (corpus), `lib/`, `TOOLS/`.
- **Reason-vector LLM eval (Pipeline B):** `build_reason_eval_set.mjs` / `build_fv_eval_set.mjs`
  (Stage ① board sets) → `explain_from_vector.mjs` (LLM answerer) → `grade-fv-sufficiency` skill.
  Shared projection: `reasonNarratorVector.mjs`. Runbook: `RUNBOOK_fv_sufficiency.md`.
- **Deep-reveal coach eval (Pipeline A):** `generate_eval_set.mjs` → `run_eval.mjs` →
  `judge-deep-reveals`; `filter_failing_evals.mjs`, `corpus_annotation_check.mjs`, `print_lookahead.mjs`.
- **Ops / diagnostics:** `set-tier.js`, `delete-user.mjs`, `import_papergames_blunders.mjs`,
  `reprocess_blunders.mjs`, `generate_all_candidates.mjs`, `generate_tagblunder_fixtures.mjs`,
  `classify_all.mjs`, `debug_*.mjs`, `diagnose_blunders.mjs`.
