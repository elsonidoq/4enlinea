# Feature-Vector Sufficiency — Runbook

How to run the experiment loop. Full design: `docs/architecture/feature-vector-sufficiency-experiment.md`.
The grader's contract: `.claude/skills/grade-fv-sufficiency/SKILL.md`.

> **The vector under test is the BLUNDER-REASON vector** (`computeReason`, raw `scores` stripped by
> `toNarratorVector`). Field semantics: `docs/architecture/feature-vector-glossary.md`. In production
> this vector is computed LIVE from the request; here we freeze a subset of the offline corpus so
> iterations are comparable.

**Two dials**: the model (`EXPLAIN_MODEL` in `connect-four/server/.env`) and the prompt inside
`compute.mjs` change between runs; the **grader stays constant** so iterations are comparable.

All commands run from `connect-four/`.

---

## Step 1 — select boards (free; no LLM)

Pick a set of blunder boards that covers the reason-vector predicate space.

```bash
node server/scripts/select_boards.mjs --strategy coverage [--target N] [--max-games N]
# → server/scripts/boards_coverage_<ts>.jsonl
#   rows: { id, movestring, playedCol, strategy, selection: { predicates } }
```

Options: `--target N` (boards per predicate, default 1); `--max-games N` (self-play game budget).

The coverage strategy enumerates the full named predicate universe (`REASON_UNIVERSE`) upfront,
partitioned into `required` (must reach target — `satisfied()` gates on these) and `provisional`
(known-rare/structurally-unreachable, reported non-blocking). As it harvests it logs
fulfilled / under-target / never-seen predicates against the named universe (`*` marks provisional).
**If `MAX_GAMES` is reached, that is not a normal exit — it means a REQUIRED predicate could not be
filled and is a bug to investigate**, not a signal to just raise the budget and rerun. See
`docs/architecture/reason-DECISIONS.md` D22 for the calibration numbers and the two predicates
currently demoted to PROVISIONAL (`gate_exhaustive`, `lost_realized_forced_block`).

**Regression fixture** — to regenerate the committed fixture used by `reasonEngine*.test.mjs`:

```bash
node server/scripts/select_boards.mjs --strategy fixture
# → server/scripts/reason_engine/reason_fixture.jsonl  (deterministic anchor boards)
```

---

## Step 2 — compute evidence (free; local solver)

Run `computeReason` over the board set to produce a nested evidence file.

```bash
node server/scripts/compute.mjs --input server/scripts/boards_coverage_<ts>.jsonl
# → server/scripts/reason_evidence_<stem>.jsonl
#   rows: { id, evidence, groundTruth }
```

---

## Step 2b — run the LLM answerer (PAID: calls `EXPLAIN_MODEL`)

`EXPLAIN_MODEL` is read from `connect-four/server/.env`. Cost = `records × conditions × n`.

```bash
node server/scripts/compute.mjs \
  --input server/scripts/boards_coverage_<ts>.jsonl \
  --llm \
  [--condition all]   # A=full vector · B=board-only · C=features-without-movestring · all=A,B,C
  [--n 3] \
  [--model <id>]      # overrides EXPLAIN_MODEL
# → server/scripts/fv_suff_answers_<stem>_<ts>.jsonl
#   each row embeds its feature_vector (the answers file IS its own vectors source)
```

**Key efficiency note:** `--llm` reuses an existing `reason_evidence_<stem>.jsonl` if present —
no solver calls are made. Iterating the glossary or prompt only requires rerunning Step 2b,
not Step 2.

---

## Step 3 — grade (free on the Max plan; spawns grading sub-agents)

The answers file is its own vectors source (each row embeds its `feature_vector`). Pass it as
both the answers and the `--vectors` argument.

```
/grade-fv-sufficiency server/scripts/fv_suff_answers_<stem>_<ts>.jsonl \
  --vectors server/scripts/fv_suff_answers_<stem>_<ts>.jsonl
# → server/scripts/fv_suff_answers_<stem>_<ts>_grades.jsonl   (structured per-id×condition; UI reads this)
# → server/scripts/fv_suff_answers_<stem>_<ts>_grade_report.md (human counterexample report)
```

The deliverable is the **counterexample list** (failures attributed to a missing/ambiguous feature
field or glossary gap), not the pass number.

---

## Step 4 — view board + vector + answer + grade in the UI

Open **`/admin/fv-suff`** (desktop, localhost+admin) → **Eval answers** tab → pick the answers
file. No separate eval-set dropdown: the set is derived from the answers file itself via
`deriveSetFromAnswers`. Each case shows the boards + feature vector alongside the LLM's answer
and its A1–A4 grade — so a failing case points straight at the vector field / glossary gap to
fix in the reason engine.

(The **Evidence** tab browses the raw `reason_evidence_*.jsonl` vectors.)

---

## Iterating

- **Change the glossary** (`docs/architecture/feature-vector-glossary.md`) or the **prompt** in
  `compute.mjs` → rerun **Step 2b** only (`--llm`; the evidence file is reused, no solver) → **Step 3**.
- **Change the engine** (`reason_engine/reasonEngine.mjs`) or `toNarratorVector` in
  `reasonNarratorVector.mjs` → rerun **Step 2** (recompute evidence) → **Step 2b** → **Step 3**.
- **Dial the model** via `EXPLAIN_MODEL` (or `--model`) as the prompt improves; the grader stays fixed.
