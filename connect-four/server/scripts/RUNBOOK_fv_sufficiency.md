# Feature-Vector Sufficiency — Runbook

How to run the experiment loop. Full design: `docs/architecture/feature-vector-sufficiency-experiment.md`.
The grader's contract: `.claude/skills/grade-fv-sufficiency/SKILL.md`.

> **The vector under test is the BLUNDER-REASON vector** (`computeReason`, raw `scores` stripped by
> `toNarratorVector`). Field semantics: `docs/architecture/feature-vector-glossary.md`. In production
> this vector is computed LIVE from the request; here we freeze a subset of the offline corpus so
> iterations are comparable.

**Two dials**: the model (`EXPLAIN_MODEL` in `connect-four/server/.env`) and the prompt-builder
(`buildPrompt` in `explain_from_vector.mjs`) change between runs; the **frozen eval set and the
grader stay constant** so iterations are comparable.

All commands run from `connect-four/`.

---

## Step 1 — build the frozen eval set (free; no solver, no LLM)

Freezes a subset of the precomputed reason corpus (`reason_evidence_all.jsonl`) into the answerer's
input. Each row is `{ id, pattern_category, feature_vector }` where `feature_vector =
toNarratorVector(corpus row)` (raw `scores` + fixture labels removed). `notABlunder` rows are
dropped.

```bash
node server/scripts/build_fv_eval_set.mjs
# → server/scripts/fv_eval_set.jsonl   (one row per blunder case, all 4 cases covered)
# Options: --input <corpus.jsonl>  --out <set.jsonl>  --per-case <k> (cap rows per case for a balanced/smaller set)
```

**To grow the set** (the corpus is the offline fixture, not production): enlarge the fixture
(`reason_engine/build_fixture.mjs`, raise its sampling) → recompute the corpus
(`reason_engine/build_evidence.mjs`) → re-run this step. The answerer + grader are size-agnostic.

Sanity check the set carries what you expect (cases covered, no raw scores leaked):

```bash
node -e "const r=require('fs').readFileSync('server/scripts/fv_eval_set.jsonl','utf8').trim().split('\n').map(JSON.parse);const c={};r.forEach(x=>c[x.feature_vector.case]=(c[x.feature_vector.case]||0)+1);console.log('cases',JSON.stringify(c),'| any scores leaked:',r.some(x=>'scores' in x.feature_vector));"
```

---

## Step 2 — run the answerer (PAID: calls `EXPLAIN_MODEL` via OpenAI)

`EXPLAIN_MODEL` is read from `connect-four/server/.env` (default `gpt-5.4`). Cost = `records ×
conditions × n`. The answerer defaults `--input` to `server/scripts/fv_eval_set.jsonl`, and
auto-names its output `fv_suff_answers_<input-stem>_<launch-datetime>.jsonl` (traceable to the input
set + when the run started; pass `--out` to override).

```bash
node server/scripts/explain_from_vector.mjs \
  --input  server/scripts/fv_eval_set.jsonl \
  --n 3 \
  --condition all          # A=full vector · B=board-only · C=features-without-movestring · all=A,B,C
# → server/scripts/fv_suff_answers_fv_eval_set_<datetime>.jsonl
#   records × 3 conditions × 3 runs rows, expect 0 parse/call failures.
```

Optional flags: `--model <id>` overrides `EXPLAIN_MODEL`; `--condition A` for just the headline condition.

---

## Step 3 — grade (free on the Max plan; spawns grading sub-agents)

Invoke the grader skill on the answers + the frozen eval set. It scores A1–A4, applies the
all-N-runs pass rule, and writes a report next to the answers.

```
/grade-fv-sufficiency server/scripts/fv_suff_answers_<ts>.jsonl server/scripts/fv_eval_set.jsonl
# → server/scripts/fv_suff_answers_<ts>_grade_report.md   (human report)
# → server/scripts/fv_suff_answers_<ts>_grades.jsonl       (structured per-id×condition; the UI reads this)
```

The deliverable is the **counterexample list** (failures attributed to a missing/ambiguous feature
field or glossary gap), not the pass number.

## Step 4 — view board + vector + answer + grade in the UI

Open **`/admin/fv-suff`** (desktop, localhost+admin) → **Eval answers** tab → pick the answers file
(and eval set). Each case shows the boards + feature vector alongside the LLM's answer and its A1–A4
grade — so a failing case points straight at the vector field / glossary gap to fix in the reason
engine. (The **Evidence** tab browses the raw `reason_evidence_*.jsonl` vectors.)

---

## Iterating

- **Change the prompt-builder** (`buildPrompt` in `explain_from_vector.mjs`) or the **glossary**
  (`docs/architecture/feature-vector-glossary.md`, loaded at runtime) → rerun **Step 2 → Step 3**
  only (eval set unchanged).
- **Change the feature vector** (the reason engine, or `toNarratorVector` in
  `reasonNarratorVector.mjs`) → rerun **Step 1 → 2 → 3** (rebuild the corpus first if you changed the
  engine: `reason_engine/build_evidence.mjs`).
- **Dial the model down** toward `gpt-5.4-mini` via `EXPLAIN_MODEL` (or `--model`) as the prompt
  improves; the frozen set + grader stay fixed.
