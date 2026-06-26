# Feature-Vector Sufficiency Experiment

**Status:** experimental (apparatus implemented 2026-06-26; first grading run pending)
**Created:** 2026-06-26

## 1. Background / why this exists

The deep-reveal coach explains *why a move was a blunder*. The journey so far:

1. We iterated `run_eval.mjs` → `judge-deep-reveals` on the **production** pipeline
   (`buildExplainContext` → production prompt → `gpt-5.4-mini` → annotation gate). It did not
   reach acceptable quality.
2. We traced much of the failure to the **structured context** injected into the prompt, and
   reworked it into the **feature vector** (`toFeatureVector` in `server/explainContext.js`) —
   a compact, board-grounded projection, documented field-by-field in
   `docs/architecture/feature-vector-glossary.md`.
3. **This experiment** tests, *outside* the production explain implementation, whether
   **feature vector + glossary** is sufficient context to explain a blunder — with the end goal
   of arriving at a **prompt-building procedure that `gpt-5.4-mini` can handle**.

## 2. Goal, non-goals, and the trajectory

**Goal.** Determine whether the feature vector + glossary carry enough information for a model to
reconstruct the **correct, board-grounded reason** a move was a blunder — and, where it does not,
produce a **counterexample list attributing each failure to a missing/ambiguous field** so the
vector/glossary can be improved.

**This is a floor test.** We deliberately start with a model **more capable** than production
(`gpt-5.4` full vs. production `gpt-5.4-mini`, **same vendor/family** — OpenAI — so capability is
the only variable; see §6). Logic: if even the strong model cannot make a case crystal-clear, it
is **definitely a context blindspot**, not a capability gap. Success at the top is a *necessary*
condition for the weaker production model.

**The end goal is a trajectory, not a one-shot check.** Once the strong model passes reliably,
dial the model **down** toward `gpt-5.4-mini` while evolving the **prompt-building procedure**
**up**, until mini passes. The apparatus must support this: **model and prompt-builder are the
two dials; the frozen vector set and the grader stay constant** so every iteration is comparable.

**Non-goals.**
- Not testing blunder *detection*. The records *are* blunders; `tag`/`direction`/outcomes stay in
  the vector (they are part of the genuine production context). The task is to **explain**, and
  grading targets the **mechanism/grounding** the tag does *not* spoon-feed (§5).
- Not replacing `run_eval` / `judge-deep-reveals`. Those remain the **production** evaluator. This
  is a separate, exploratory harness with a different input, model, output, and grader.

## 3. Architecture / data flow

```
 run_eval.mjs --no-llm
   └─► frozen stratified jsonl: one record per case, carrying
         feature_vector  (the model's ONLY input, with glossary)
         + solver ground truth (premove/played/best scores, correct_move)  ← grader-only
                       │
                       ▼
 NEW SCRIPT  server/scripts/explain_from_vector.mjs   (OpenAI, isolated API call)
   for each record, N times:
     prompt = buildPrompt(glossary_file, record.feature_vector)   ← swappable procedure
     answer = call EXPLAIN_MODEL (OpenAI, e.g. gpt-5.4)            ← swappable model
   └─► answers jsonl: { id, run_index, <structured answer §4> }
                       │
                       ▼
 GRADER SKILL  (Claude Code, tools ALLOWED — runs on the Max plan)
   reads answers jsonl + the FULL run_eval records (ground truth) + board tools + solver
   grades each answer on the axes (§5); objective axes by solver/code, mechanism/fabrication by
   board verification
   └─► report: per-case verdict + aggregate + COUNTEREXAMPLE LIST attributed to field gaps
```

**Key seams / invariants:**
- **`run_eval --no-llm` is the data generator** (the `--no-llm` flag already emits records whose
  `feature_vector` is exactly this experiment's input — no duplicate vector generation).
- **The vector set is frozen.** Generate once; iterate (prompt × model) against the same inputs so
  results are comparable across iterations.
- **The script is isolated.** Its prompt contains **only** the glossary text + the
  `feature_vector` JSON + the task. It uses **no tools** and does **not** see solver ground truth.
  (The `feature_vector` legitimately contains `movestring`; that is part of the context.)
- **The grader is privileged.** It has everything the model lacked — solver, `visualize_board.sh`,
  the board, and the record's ground-truth fields — and acts as the **oracle**.
- **Glossary is loaded from the file** (`docs/architecture/feature-vector-glossary.md`) so edits
  are picked up without code changes.

## 4. Structured answer schema (the grader's contract)

The script instructs the model to return JSON (not free prose), so the grader can check it
field-by-field:

```jsonc
{
  "better_move":     "<display column 1-7 or 0-indexed; pick one convention and state it>",
  "played_outcome":  "win | draw | loss",   // with best play
  "best_outcome":    "win | draw | loss",
  "mechanism":       "<why the played move is worse — the load-bearing reason>",
  "key_cells":       ["c5r4", ...],          // squares the mechanism rests on (cNrM, 1-indexed)
  "fields_relied_on":["lookahead.oppCategoryExamples", "threatStats.best.opponentMajorParityAligned", ...],
  "unsure_about":    "<what the vector did NOT let you determine, or empty>",
  "confidence":      "high | medium | low"
}
```

- `fields_relied_on` is the **confound check**: it reveals whether claims trace to engineered
  fields or to the model re-deriving from `movestring` (matters for transfer to the weak model).
- `unsure_about` is the **abstention channel**: an honest "couldn't tell" is **not** a fabrication
  — it is a **feature-gap signal**, and must be graded differently from a wrong claim.

## 5. Grading axes and pass rule

Grade against the oracle (solver + board + record ground truth). The vector already contains
`bestCol`, `tag`, and the outcome labels, so axes A1–A2 are **sanity checks** (a miss there means
the model could not even *read* the vector → a glossary problem). The **substance is A3–A4**.

| Axis | What | How graded | Weight |
|---|---|---|---|
| **A1 better move** | `better_move` == `correct_move` | code (record field) | sanity |
| **A2 outcomes** | `played_outcome`/`best_outcome` match the vector's `*_with_best_play` (and solver) | code/solver | sanity |
| **A3 mechanism is real & load-bearing** | the named tactic/threat/line and `key_cells` actually exist on the relevant board, **and** are the decisive reason (not a true-but-peripheral one) | board + solver verification | **high** |
| **A4 no fabrication** | every concrete claim (cells, threats, lines) is true on the board | board verification | **high (zero tolerance)** |

- **Abstention:** `unsure_about` content is excluded from A4 (not a fabrication) and logged as a
  candidate field gap.
- **Pass rule:** a case **passes** iff A1–A4 hold **on all N runs** (§6). Intermittent success =
  fail — it exposes latent ambiguity in the context.

## 6. Set, repetition, and ablation

- **Stratified set (coverage):** sample from `eval_set_large_*` so the set spans every **kind** of
  blunder — each `tag`, each `direction` (`missed_own`/`defensive_miss`/`enabled_opponent`), each
  `lookahead.case`, sparse vs dense boards, and each outcome flip (win→draw, draw→loss, win→loss).
  A glossary that nails `forced_block` may fail on `claimeven`; coverage is what licenses any
  "~100%" claim.
- **Repetition (stability):** run each case **N ≥ 3** times (same context) to measure variance.
- **Ablation conditions (diagnostics, optional):** to interpret results and check transfer to the
  weak model —
  - **A — full** (glossary + full vector): the headline, production-faithful condition.
  - **B — board-only** (glossary + `movestring`, engineered fields stripped): if B ≈ A, the
    engineered fields add nothing for a capable model; the board carries it (won't transfer to the
    weak model).
  - **C — features-without-movestring**: tests whether the distilled fields alone carry the
    reasoning.

## 7. Success criteria & output

- **Success = near-100% pass on Condition A across the stratified set**, all N runs. The number is
  not the deliverable — the **counterexample list is**: each failure attributed to a
  *missing/ambiguous feature field* or a *glossary ambiguity*, with the model's `unsure_about` and
  the grader's board finding. That list drives the next vector/glossary improvement.
- Diagnostic read-outs: per-axis failure breakdown; A vs B vs C deltas; `fields_relied_on`
  distribution (are the engineered fields actually load-bearing?).

## 8. Reuse / do-not-reuse

- **Reuse:** `run_eval --no-llm` (vector generation), the OpenAI call pattern in
  `server/llmCoachHelpers.js` (`callLLM`, env-driven model), the eval sets, `visualize_board.sh`,
  the solver wrapper, `toFeatureVector` field semantics (glossary).
- **Do NOT reuse:** the production prompt, zone aliases, `allowedSet`, the annotation gate, or the
  `judge-deep-reveals` 3-axis rubric — those grade the *production* annotation, not a structured
  explanation against the board.

## 9. Components to build

1. **`server/scripts/explain_from_vector.mjs`** (OpenAI answerer) — reads a `--no-llm` jsonl,
   loads the glossary file, applies a swappable `buildPrompt(glossary, vector)`, calls
   `EXPLAIN_MODEL` (env-driven, default a strong model) N times per case in an isolated prompt
   (glossary + vector only, no tools, no ground truth), writes the structured answers jsonl.
   Configurable: input jsonl, model, N, ablation condition (A/B/C), output path. Per-call
   error isolation (wrap each call; a failure drops one record, not the run).
2. **Grader skill** (Claude Code, tools allowed — Max plan) — see the handoff. Consumes the
   answers jsonl + the full `--no-llm` records; grades A1–A4 (code/solver for A1–A2, board
   verification for A3–A4); emits a markdown report with the counterexample list and field-gap
   attribution.

## 10. Open decisions for the implementer

- Column convention in the answer (`better_move`): 1-indexed display vs 0-indexed — pick one and
  state it in the prompt and the grader.
- N (default 3) and temperature for the answerer.
- Whether the first cut implements all of A/B/C ablations or just Condition A (recommend A first).
- Report format and where results land (suggest `server/scripts/` alongside the eval outputs).

## 11. Implementation (as built, 2026-06-26)

**Resolved decisions (§10):** `better_move` is **1-indexed display (1–7)**; **N = 3**, no
`temperature` (gpt-5.4 is a reasoning model — only `max_completion_tokens`); **all three A/B/C
ablations wired**; the report lands in the answers' directory as
`<answers-stem>_grade_report.md`.

**Model.** `EXPLAIN_MODEL=gpt-5.4` is read from `connect-four/server/.env` (a **new** var — production
`OPENAI_MODEL=gpt-5.4-mini` is untouched). The answerer parses `.env` manually like `run_eval.mjs`.

**Frozen set (Step 1).** `server/scripts/freeze_fv_set.mjs` selects a stratified subset of
`eval_set_large_3.json` (1–2 per `pattern_category`; 2 each for immediate_threat/forced_win/
double_threat to span directions; 1 sparse + 1 dense each for drawing_move/suboptimal_move) →
`server/scripts/eval_set_fv_suff_frozen.json` (**18 cases**, all 13 categories, all 3 `direction`s,
all 3 `lookahead.case` values). `run_eval.mjs --no-llm` on it produces the frozen vectors jsonl
`server/scripts/eval_set_fv_suff_frozen_vectors.jsonl` — the constant input across iterations. To
resize, raise the per-category caps in `freeze_fv_set.mjs` and regenerate; the answerer and grader
are size-agnostic.

**Answerer (Step 2).** `server/scripts/explain_from_vector.mjs` (run from `connect-four/`). Flags:
`--input`, `--out`, `--n`, `--condition A|B|C|all` (comma-list ok), `--model`. It recursively
**prunes** the vector (`buildExplainContext` writes it with `prune:false`; pruning honors glossary
§6, keeping `movestring` even when `""`), projects per condition (A=full, B=`{movestring,
perspective, playedCol, bestCol}`, C=pruned-minus-movestring), builds an isolated prompt (glossary
file text + vector JSON + the §4-schema task, no tools, no ground truth), and calls the model with
`response_format: json_object` (lenient JSON fallback if rejected). Per-call error isolation: each
`(id, run_index, condition)` is wrapped so one failure drops one line, not the run. Output appends
to `--out` (use a fresh name for a clean run).

**Grader skill (Step 4).** `.claude/skills/grade-fv-sufficiency/SKILL.md` — user-invocable Claude
Code **project** skill (tools allowed). Joins answers↔frozen records by `id`, grades A1–A4 (A1/A2 by
code+solver, A3/A4 by board verification via `visualize_board.sh` + `createSolverProcess`), applies
the all-N-runs pass rule, and emits the markdown report whose centerpiece is the **counterexample
list** attributing failures to feature-field / glossary gaps. Grade the **combined** all-conditions
answers file so the A/B/C ablation table has all three rows. Two content traps it must handle live
in memory `project_feature_vector_content_traps.md` (null lookahead outcomes on `losing_either_way`;
`patternsOpponent` snapshot ambiguity).
