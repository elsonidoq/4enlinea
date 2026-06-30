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
- `build_fixture.mjs` → `reason_fixture.jsonl` — curated regression fixture (anchor boards + expected-case labels for `reasonEngine*.test.mjs`).
- `build_evidence.mjs` → `server/scripts/reason_evidence_all.jsonl` — runs the engine over the fixture (the precomputed corpus).
- `lib/boardUtils.mjs`, `TOOLS/*` — shared helpers + on-demand PV/parity/board inspectors.

**To evaluate the reason engine** (Stage ① get boards → ② vector → ③ LLM → ④ grade):

```bash
# ① Get a DIVERSE board set (harvest self-play, select by reason-vector predicate coverage):
node server/scripts/build_reason_eval_set.mjs --out server/scripts/reason_eval_set.jsonl
#    …OR quickly freeze a subset of the existing precomputed corpus (no solver):
node server/scripts/build_fv_eval_set.mjs            # → server/scripts/fv_eval_set.jsonl

# ② vectors are already in the set rows (feature_vector = toNarratorVector(computeReason)).

# ③ Ask the LLM to explain each (PAID — EXPLAIN_MODEL in server/.env; conditions A/B/C):
node server/scripts/explain_from_vector.mjs --input server/scripts/reason_eval_set.jsonl \
     --out server/scripts/fv_suff_answers_$(date +%Y%m%dT%H%M%SZ).jsonl --n 3 --condition all

# ④ Grade A1–A4 vs the board (Claude skill; writes a counterexample report AND a
#   <stem>_grades.jsonl the UI reads, both next to the answers):
/grade-fv-sufficiency server/scripts/fv_suff_answers_<ts>.jsonl server/scripts/reason_eval_set.jsonl
```

**View the whole loop in the UI at `/admin/fv-suff`** (desktop, localhost+admin) — two modes:
- **Evidence** — browse the vectors (`reason_evidence_*.jsonl` ← `GET /api/admin/reason`); verify the
  engine's `computeReason` output by eye against the boards.
- **Eval answers** — pick an answers file + eval set; for each case see the board + vector **and the
  LLM's answer + its A1–A4 grade** side by side (← `GET /api/admin/fv-suff?answers=&set=`). This is
  the iteration view: a failing grade points straight at the vector field / glossary gap to fix.

Field semantics: `docs/architecture/feature-vector-glossary.md`. Operational details:
`RUNBOOK_fv_sufficiency.md`. Shared LLM-facing projection: `reasonNarratorVector.mjs`
(`toNarratorVector` strips raw scores).

**Create a new evidence file for the `/admin/fv-suff` dropdown.** The browser's file dropdown lists
every `server/scripts/reason_evidence_*.jsonl` (scanned by `GET /api/admin/reason/files`). To add an
entry, run `build_evidence.mjs` over a fixture of your choice with a distinct `--out` name (it must
match `reason_evidence_*.jsonl` to appear):

```bash
# (optional) make a custom fixture of {movestring, playedCol[, expectedCase, bucket]} rows, e.g.:
node server/scripts/reason_engine/build_fixture.mjs        # → reason_fixture.jsonl  (or hand-curate one)
# compute evidence into a NEW named file (the default invocation still writes reason_evidence_all.jsonl):
node server/scripts/reason_engine/build_evidence.mjs \
  --input server/scripts/reason_engine/reason_fixture.jsonl \
  --out   reason_evidence_<name>.jsonl
# → server/scripts/reason_evidence_<name>.jsonl, now selectable in the /admin/fv-suff dropdown.
```

`--input` defaults to `reason_fixture.jsonl`; `--out` defaults to `reason_evidence_all.jsonl` (a bare
name lands in `server/scripts/`; a path is used as-is). Fixtures without `expectedCase` labels are
fine — those rows just show no computed-vs-expected check.

## Pipeline A — Deep-reveal coach eval

Evaluates the **live production coach** (`buildExplainContext` → `/api/explain*`). Kept because the
coach is in production.

```bash
# ① Generate / expand the eval set (harvest blunders covering 35 tag/direction/phase predicates):
node server/scripts/generate_eval_set.mjs server/scripts/eval_set_large_3.json
# ② Run the coach pipeline over it → raw results jsonl:
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
