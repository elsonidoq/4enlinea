# Feature-Vector Sufficiency — Runbook

How to run the experiment loop. Full design: `docs/architecture/feature-vector-sufficiency-experiment.md`.
The grader's contract: `.claude/skills/grade-fv-sufficiency/SKILL.md`.

**Three dials**: the model (`EXPLAIN_MODEL` in `connect-four/server/.env`) and the prompt-builder
(`buildPrompt` in `explain_from_vector.mjs`) change between runs; the **frozen vector set and the
grader stay constant** so iterations are comparable.

All commands run from `connect-four/`.

---

## Step 0 (occasional) — (re)build the frozen case set

Only when you want to change which positions are in the set. Produces the 18-case selection.

```bash
node server/scripts/freeze_fv_set.mjs
# → server/scripts/eval_set_fv_suff_frozen.json   (18 cases, all 13 categories / 3 directions / 3 lookahead cases)
```

To resize: raise the per-category caps in `freeze_fv_set.mjs`, then rerun. The answerer + grader are size-agnostic.

---

## Step 1 — generate the frozen vectors (free; local solver only)

Turns the case set into the model's input vectors via `run_eval --no-llm` (builds the feature
vector + solver ground truth, **no** LLM calls).

```bash
# ⚠️ run_eval has RESUME MODE: it SKIPS ids already in the output file.
# To regenerate after a code change, DELETE the output first or it re-emits the stale file.
rm -f server/scripts/eval_set_fv_suff_frozen_vectors.jsonl

# positional args (NOT --input/--out):  <case_set.json> [output.jsonl] [--no-llm]
node server/scripts/run_eval.mjs \
  server/scripts/eval_set_fv_suff_frozen.json \
  server/scripts/eval_set_fv_suff_frozen_vectors.jsonl \
  --no-llm
# → 18 records. Uses the real solver per record → can take a few minutes.
```

Sanity check the vectors carry what you expect (labels, lost-position flood, ply depth):

```bash
node -e "const r=require('fs').readFileSync('server/scripts/eval_set_fv_suff_frozen_vectors.jsonl','utf8').trim().split('\n').map(JSON.parse);const s=JSON.stringify(r.map(x=>x.feature_vector));console.log('owner',(s.match(/\"owner\"/g)||[]).length,'severity',(s.match(/\"severity\"/g)||[]).length,'realizedOnPly',(s.match(/realizedOnPly/g)||[]).length);"
```

---

## Step 2 — run the answerer (PAID: calls `EXPLAIN_MODEL` via OpenAI)

`EXPLAIN_MODEL` is read from `connect-four/server/.env` (default `gpt-5.4`). Cost = `records × conditions × n`.
For the 18-case set, `--condition all --n 3` = **162 calls**. Always write to a fresh `--out` (a new
name per run keeps prior runs comparable; the script appends).

```bash
node server/scripts/explain_from_vector.mjs \
  --input  server/scripts/eval_set_fv_suff_frozen_vectors.jsonl \
  --out    server/scripts/fv_suff_answers_all_v2.jsonl \
  --n 3 \
  --condition all          # A=full vector · B=board-only · C=features-without-movestring · all=A,B,C
# → 162 rows, expect 0 parse/call failures.
```

Optional flags: `--model <id>` overrides `EXPLAIN_MODEL`; `--condition A` for just the headline condition.

---

## Step 3 — grade (free on the Max plan; spawns grading sub-agents)

Invoke the grader skill on the answers + the frozen vectors. It scores A1–A4, applies the
all-N-runs pass rule, and writes a report next to the answers.

```
/grade-fv-sufficiency server/scripts/fv_suff_answers_all_v2.jsonl server/scripts/eval_set_fv_suff_frozen_vectors.jsonl
# → server/scripts/fv_suff_answers_all_v2_grade_report.md
```

Compare the new report's **Condition-A pass count** and **A3/A4 pass-rates** against the prior
baseline report (`fv_suff_answers_all_grade_report.md` — baseline: Condition A 8/18, A3 30/54, A4 29/54).
The deliverable is the **counterexample list** (failures attributed to a missing/ambiguous feature
field or glossary gap), not the pass number.

---

## Iterating

- **Change the prompt-builder** (`buildPrompt` in `explain_from_vector.mjs`) or the **glossary**
  (`docs/architecture/feature-vector-glossary.md`, loaded at runtime) → rerun **Step 2 → Step 3**
  only (vectors unchanged).
- **Change the feature vector** (`toFeatureVector` / `runSparseLookahead`) → rerun **Step 1 → 2 → 3**
  (don't forget the `rm` in Step 1).
- **Dial the model down** toward `gpt-5.4-mini` via `EXPLAIN_MODEL` (or `--model`) as the prompt
  improves; the frozen set + grader stay fixed.
