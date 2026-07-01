# Apply database migrations

Migrations live in `connect-four/server/migrations/`. The runner is `connect-four/server/migrate.js`.
It reads `DATABASE_URL` from the `.env` file at `connect-four/server/.env`.

  cd connect-four/server

  # Apply all pending migrations
  node --env-file=.env migrate.js

  # Mark all migrations as applied without running SQL (fresh DB restore, etc.)
  node --env-file=.env migrate.js --baseline

The runner keeps a `schema_migrations` ledger table to track which files have been applied.
Each migration runs in its own transaction — if one fails, it rolls back and exits.

---

# Change tier from free to paid
  cd connect-four/server
  node --env-file=.env scripts/set-tier.js elsonidoq@gmail.com paid

  To revert: replace paid with free.

---

# Scripts & tooling

Every script is either **part of a pipeline** (run together, in order, below) or a **standalone tool**
useful on its own. There are two script folders, split by where they run from:

- **`connect-four/scripts/`** — DB / ops / asset tooling run from the package root (no `server/` imports).
- **`connect-four/server/scripts/`** — server-runtime + eval tooling that imports `server/` modules
  (`classifier.js`, `explainContext.js`, the solver wrapper, the reason engine).

Each folder has its own `README.md` restating this principle. All commands below run from `connect-four/`.

## Pipeline B — Blunder-reason engine + reason-vector LLM eval

The reason engine (`server/scripts/reason_engine/`) turns a blunder `{movestring, playedCol}` into a
structured evidence vector (`computeReason`); the eval tests whether an LLM can narrate "why it was a
blunder" from that vector + the glossary alone. **In production the vector is computed live from the
request;** this offline pipeline mirrors that for evaluation.

**The engine** (`server/scripts/reason_engine/`):
- `reasonEngine.mjs` — `computeReason(movestring, playedCol, {solver})`. CLI: `node server/scripts/reason_engine/reasonEngine.mjs <movestring> <playedCol>`.
- `lib/boardUtils.mjs`, `TOOLS/*` — shared helpers + on-demand PV/parity/board inspectors.

**To evaluate the reason engine** (Stage ① select boards → ② compute evidence → ③ LLM → ④ grade):

```bash
# ① Select a diverse board set by reason-vector predicate coverage:
node server/scripts/select_boards.mjs --strategy coverage [--target N] [--max-games N]
#    → server/scripts/boards_coverage_<ts>.jsonl  rows: {id, movestring, playedCol, strategy, selection}
#    (--strategy fixture regenerates the committed regression fixture reason_engine/reason_fixture.jsonl)

# ② Compute evidence locally (free, local solver):
node server/scripts/compute.mjs --input server/scripts/boards_coverage_<ts>.jsonl
#    → server/scripts/reason_evidence_<stem>.jsonl  rows: {id, evidence, groundTruth}

# ③ Ask the LLM to explain each (PAID — EXPLAIN_MODEL in server/.env; add --llm):
node server/scripts/compute.mjs --input server/scripts/boards_coverage_<ts>.jsonl --llm --n 3 --condition all
#    → server/scripts/fv_suff_answers_<stem>_<ts>.jsonl  (each row embeds its feature_vector)
#    Note: --llm reuses an existing reason_evidence_<stem>.jsonl — no solver re-run needed

# ④ Grade A1–A4 (Claude skill; answers file is its own vectors source):
/grade-fv-sufficiency server/scripts/fv_suff_answers_<stem>_<ts>.jsonl \
  --vectors server/scripts/fv_suff_answers_<stem>_<ts>.jsonl
#    → <stem>_grades.jsonl (UI reads) + <stem>_grade_report.md (counterexample report)
```

**View the whole loop in the UI at `/admin/fv-suff`** (desktop, localhost+admin) — two modes:
- **Evidence** — browse the vectors (`reason_evidence_*.jsonl` ← `GET /api/admin/reason`); verify the
  engine's `computeReason` output by eye against the boards.
- **Eval answers** — pick an answers file; the eval set is derived automatically from the answers
  (each row embeds its `feature_vector`). For each case see the board + vector **and the LLM's answer
  + its A1–A4 grade** side by side. A failing grade points straight at the vector field / glossary gap to fix.

Field semantics: `docs/architecture/feature-vector-glossary.md`. Operational details:
`RUNBOOK_fv_sufficiency.md`. Shared LLM-facing projection: `reasonNarratorVector.mjs`
(`toNarratorVector` strips raw scores).

**Create a new evidence file for the `/admin/fv-suff` dropdown.** The browser's file dropdown lists
every `server/scripts/reason_evidence_*.jsonl` (scanned by `GET /api/admin/reason/files`). To add an
entry, run `compute.mjs` over a board set with a distinct `--out` name (it must match
`reason_evidence_*.jsonl` to appear):

```bash
# (optional) select a custom board set:
node server/scripts/select_boards.mjs --strategy coverage --out boards_custom.jsonl
# compute evidence into a NEW named file:
node server/scripts/compute.mjs \
  --input server/scripts/boards_custom.jsonl \
  --out   reason_evidence_<name>.jsonl
# → server/scripts/reason_evidence_<name>.jsonl, now selectable in the /admin/fv-suff dropdown.
```

## Pipeline A — Deep-reveal coach eval (DEPRECATED)

Evaluated the **live production coach** (`buildExplainContext` → `/api/explain*`) against a hand-built
35-predicate eval set describing the coach prompt (not the reason engine). **`generate_eval_set.mjs`
is deleted** (redundant with the reason-eval board selector, `select_boards.mjs --strategy coverage`,
above) and `run_eval.mjs` is DEPRECATED; this pipeline is retired in favor of evaluating the reason
feature vector directly (Pipeline B, above). The full chain — `run_eval.mjs` + `eval_set_*.json` +
`buildExplainContext` + the `/api/admin/eval-set` endpoint — is swept when the glossary-derived prompt
evaluator lands. See `docs/architecture/reason-DECISIONS.md` D22.

```bash
# ② (still runnable against the existing committed eval_set_large_3.json — step ① generator is gone)
node server/scripts/run_eval.mjs server/scripts/eval_set_large_3.json out.jsonl
# ③ Grade with the judge skill:
/judge-deep-reveals out.jsonl
# (filter_failing_evals.mjs extracts failing rows into a new eval set to re-run.)
```

Quality gate: `corpus_annotation_check.mjs` (DB blunder rows → `buildExplainContext` → annotation
gate). Debug: `print_lookahead.mjs`. Docs: `docs/deep-reveal-eval.md`.

## Standalone tools (useful on their own)

- `./visualize_board.sh <movestring>` (repo root) — ASCII board + threats + parity + per-column solver scores.
- `server/scripts/classify_all.mjs <movestring>` — run `classifyPattern` on one board.
- `server/scripts/{debug_blunder_severity,debug_blunders_for_room,diagnose_blunders}.mjs` — on-demand blunder diagnostics.

## Ops / data scripts

- `server/scripts/set-tier.js`, `delete-user.mjs`, `delete_all_candidates.sh` — account / data admin.
- `server/scripts/{generate_all_candidates,reprocess_blunders,import_papergames_blunders,generate_tagblunder_fixtures}.mjs` — puzzle/candidate + fixture generation.
- `scripts/{generate-tts.js,validate-puzzle-counts.mjs,verify-undercut-puzzles.mjs,backfill-confirmation-challenges.mjs,generate_scores_for_movestring.mjs}` — TTS, DB validation/backfill, score data.
