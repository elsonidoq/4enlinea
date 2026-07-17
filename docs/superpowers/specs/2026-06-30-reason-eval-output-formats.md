# Reason-eval tooling — output-format proposal

Status: PROPOSAL (awaiting approval). Scope: the file shapes produced by the consolidated
reason-eval pipeline (`select_boards.mjs` → `compute.mjs` → `grade-fv-sufficiency`). This document
specifies *only the artifacts* — not the implementation. Designed clean-first, not inherited from the
scripts being replaced.

## Design principles

1. **One join spine.** A single `id` threads every artifact: board → evidence → answers → grades.
   `id = "eval-<N>"`, N = 1-based selection order. Assigned at board generation; preserved verbatim
   downstream. When a board file carries no `id` (the frozen regression fixture), `compute` assigns
   `eval-<N>` by line order.
2. **Layered namespaces, never mixed.** Each artifact keeps distinct concerns in distinct keys:
   the pure engine output (`evidence`), research metadata (`groundTruth`), the LLM's reply
   (`answer`), the grade (`per_run`). No flat-spreading of unrelated layers into one object.
3. **Each file independently inspectable.** Every line is self-describing (carries `id` +
   enough context to read alone); downstream files never *require* an upstream file to be parsed.
4. **Two frozen edges** (cannot redesign — see §4): the committed regression fixture's shape, and
   the answer-row keys the unchanged grader reads.

---

## 1. Board generation — `select_boards.mjs`

Picks decision points. A decision point is **a board + the move played**; everything else is
provenance. Two strategies, matching the two real selection jobs:

- `--strategy coverage` — predicate-coverage harvest (the LLM-eval diversity set). Inherently runs
  `computeReason` to score coverage predicates, **but discards the vector** and emits only the board
  list; `compute` (§2) is the single authoritative place the evidence vector is produced. The
  redundant recompute is bounded to the ~dozens of surviving boards (the thousands-of-candidates
  harvest happens once, here).
- `--strategy fixture` — anchors + stratified rejection sampling → the committed regression fixture.
  Emits the FROZEN flat shape (§1b). (There is no standalone anchor-free `sample` mode — it had no
  consumer.)

### 1a. `coverage` → `boards_coverage_<ts>.jsonl`

```jsonc
{
  "id": "eval-1",            // 1-based selection order
  "movestring": "3325",      // pre-move board (0-indexed cols)
  "playedCol": 5,            // the move under scrutiny (0-indexed)
  "strategy": "coverage",    // which selector produced this row
  "selection": {             // free-form provenance (optional)
    "predicates": ["case_win_to_draw", "tactic_lost_present", "tie_temporal"]
  }
}
```

- **Required core**: `id`, `movestring`, `playedCol`. These are the *only* fields `compute` reads.
- `selection.predicates`: provenance that explains *why this board was picked* (which coverage axes
  it advanced). Purely informational; never collides with evidence fields.

### 1b. `fixture` → `reason_engine/reason_fixture.jsonl` (FROZEN shape — see §4.1)

Reproduces the committed regression fixture byte-for-byte. Legacy flat shape, ground-truth-labeled,
**no `id`** (adding a field would change the committed bytes; the reasonEngine tests read these rows
directly):

```jsonc
{ "movestring": "3325", "playedCol": 5, "bestCol": 1, "scores": [-3,18,2,3,-3,0,-3],
  "discs": 4, "expectedCase": "win_to_draw", "bucket": "anchor",
  "expectedGate": null, "expectedExhaustive": null }
```

---

## 2. Vector computation — `compute.mjs`

Reads a board file (§1), runs `computeReason` per board. `--llm` is **off by default**.

### 2a. Evidence file (always) — `reason_evidence_<input-stem>.jsonl`

The `reason_evidence_` prefix is load-bearing (the `/api/admin/reason` validator + the
`/admin/fv-suff` Evidence tab). One row per board:

```jsonc
{
  "id": "eval-1",
  "evidence": {              // computeReason output VERBATIM, incl. raw per-column `scores`
    "movestring": "3325", "playedCol": 5, "bestCol": 1, "scores": [-3,18,2,3,-3,0,-3],
    "player": 1, "opponent": 2, "bestScore": 18, "playedScore": 0,
    "case": "win_to_draw", "notABlunder": false,
    "lostResource": { /* … */ }, "opponentPunishment": { /* … */ },
    "replyHistogram": { "afterBest": 0, "afterPlayed": 1 }, "gate": null
  },
  "groundTruth": {           // research labels, namespaced; null when input had no ground truth
    "case": "win_to_draw", "gate": null, "exhaustive": null,
    "bucket": "anchor", "matches": true   // matches = (evidence.case === groundTruth.case)
  }
}
```

- **`evidence`** is the untouched engine object. The narrator projection becomes
  `toNarratorVector(row.evidence)` and needs to strip only `scores` (`HIDDEN_FIELDS`) — the
  `RESEARCH_LABELS` strip-list is **deleted**, because research labels now live outside `evidence`
  and can no longer leak into the vector.
- **`groundTruth`** is `null` when the board file carried no labels (coverage/sample). For the
  curated fixture it carries the renamed labels + the computed-vs-expected `matches` flag (today's
  `caseMatches`), which drives the UI mismatch chip.

### 2b. Answers file (with `--llm`) — `fv_suff_answers_<input-stem>_<ts>.jsonl`

`--llm [--condition A|all] [--n 3] [--model X]`. **Reuses an existing `reason_evidence_<stem>.jsonl`
if present** (no solver) and only re-runs the LLM, so iterating the glossary/prompt never re-runs the
solver. One row per `(id × condition × run_index)`:

```jsonc
{
  "id": "eval-1",
  "pattern_category": "win_to_draw",      // = evidence.case (grader groups by this)
  "condition": "A",                       // A=full · B=board-only · C=features-without-movestring
  "run_index": 0,
  "model": "gpt-5.4",
  "feature_vector": { /* toNarratorVector(evidence) — un-pruned; condition-pruning done at prompt */ },
  "answer": { "better_move": 2, "played_outcome": "draw", "best_outcome": "win",
              "mechanism": "…", "key_cells": ["c1r1"], "fields_relied_on": ["case"],
              "unsure_about": "", "confidence": "medium" } ,   // null on parse/call failure
  "raw": "…",
  "parse_error": null,
  "call_error": null
}
```

- **Self-sufficient for grading.** Each line carries `{id, pattern_category, feature_vector}` — a
  complete vectors row — so the unchanged grader reads vectors and answers from this *one* file:
  `/grade-fv-sufficiency <answers> --vectors <same answers file>`. No separate eval-set artifact.
- `feature_vector` is the un-pruned `toNarratorVector(evidence)` (matches what the grader expects to
  introspect); per-condition pruning happens only when building the prompt.

---

## 3. Grade result — `grade-fv-sufficiency` (skill UNCHANGED)

### 3a. Structured grades — `fv_suff_answers_<stem>_<ts>_grades.jsonl`

One row per `(id × condition)`, joined to the answers/evidence by `id`:

```jsonc
{
  "id": "eval-1", "condition": "A", "n_runs": 3,
  "per_run": [
    { "run_index": 0, "A1": "pass", "A2": "pass", "A3": "fail", "A4": "pass", "unsure_about": "" }
  ],
  "case_pass": false,         // A1–A4 hold on ALL runs
  "intermittent": false,
  "notes": "A3 fail run 0: named a fork the after-played board does not show",
  "counterexamples": [
    { "axis": "A3", "field_or_glossary": "lostResource.tacticCells", "evidence": "visualizer shows no major threat at c4r4" }
  ]
}
```

### 3b. Human report — `fv_suff_answers_<stem>_<ts>_grade_report.md` (unchanged).

---

## 4. Frozen edges (constraints, not choices)

1. **`reason_fixture.jsonl`** keeps the §1b flat shape: `server/tests/reasonEngine*.test.mjs` read
   `row.expectedCase` / `bucket` / `playedCol` directly, and the consolidation brief forbids changing
   the committed file or the tests. `--strategy fixture` therefore emits the legacy shape; only
   `coverage` uses the clean §1a shape. `compute` derives `eval-N` for fixture rows.
2. **Answer-row keys** (`answer`, `pattern_category`, `feature_vector`, `parse_error`, `call_error`,
   `condition`, `run_index`) are fixed by the unchanged grader skill. §2b already honors them.

## 5. Join spine, end to end

```
select_boards   boards_coverage_<ts>.jsonl       { id, movestring, playedCol, … }
   (or fixture)  reason_engine/reason_fixture.jsonl  (frozen flat shape, no id)
      │ id preserved (or derived eval-N from fixture order)
compute         reason_evidence_<stem>.jsonl     { id, evidence, groundTruth }
      │ id + toNarratorVector(evidence)
compute --llm   fv_suff_answers_<stem>_<ts>.jsonl{ id, pattern_category, feature_vector, answer, … }
      │ id + condition
grade           …_grades.jsonl                   { id, condition, per_run, case_pass, … }
```

The `/admin/fv-suff` Eval-answers tab joins evidence/answers/grades by `id`; the Evidence tab reads
`reason_evidence_*.jsonl` rows as `{ id, evidence, groundTruth }`.
