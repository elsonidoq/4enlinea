---
name: reference_deep_reveal_eval_harness
description: Eval harness for deep reveal — run_eval.mjs collects pipeline results; /judge-deep-reveals scores them against 9-item rubric
metadata: 
  node_type: memory
  type: reference
  originSessionId: 8e6b5cb9-213b-4297-befc-b49b1ce0b6be
---

Two-phase eval harness for diagnosing deep reveal (explain-move-llm) quality issues.

## Phase 1 — data collection

`connect-four/server/scripts/run_eval.mjs` — runs the full `/api/explain-move-llm` production pipeline (buildExplainContext → callLLM → normalizeZoneTags → expandZoneAliases → validateAnnotation → retry) over an eval set JSON file.

```bash
# New run from an eval set path (creates timestamped JSONL):
cd connect-four && node server/scripts/run_eval.mjs server/scripts/eval_set_large.json

# Resume an existing run (skips already-processed IDs):
cd connect-four && node server/scripts/run_eval.mjs server/scripts/eval_set_large.json server/scripts/eval_results_<timestamp>.jsonl

# Default (no args): uses eval_set_small.json
cd connect-four && node server/scripts/run_eval.mjs
```

Output: `<eval_set_stem>_results_<ISO-timestamp>.jsonl` — one JSON record per position (e.g. `eval_set_large_results_2026-06-24T14Z.jsonl`). Each record includes `context_outcome` (success/null_returned/trivial/all_moves_equal/error), both attempt responses + validation results, and `final_response` (null if both attempts failed annotation validation).

### Solver ground-truth fields (added 2026-06-25, for the judge's grounding-sufficiency check)

Populated **only in the success branch**, after the `record.correct_move` override (so any better-move-derived field uses the OVERRIDDEN column, not the eval-set's `correct_move`):
- `premove_scores` = `solver.query(board_state)` — player-perspective (player to move pre-move)
- `played_scores` = `solver.query(board_state + move_played)` — opponent-perspective
- `best_scores` = `solver.query(board_state + correct_move)` — opponent-perspective, uses overridden `correct_move`
- `premove_best_col` / `premove_best_score` — argmax over `premove_scores`
- `lookahead_null_reason` — coarse tag: `null` if `lookahead_fired`, else `'not_sparse'` (runtime_is_sparse false) or `'sparse_no_winner'`. Finer reasons (empty_tally vs no_branch_delta) would require `runSparseLookahead` to return a reason — deliberately left as a follow-up; do NOT touch sparseLookahead.js for it.

Each `solver.query` is guarded in its own try/catch → field stays `null` on `Invalid position` (terminal). Populated only on fresh runs; old result files lack them and the judge degrades to "unknown" — don't backfill. Acceptance values for eval-3 (`board_state="3333"`, played 4, correct 3): `premove_scores=[-2,-2,-2,1,-2,-2,-2]`, `best_scores`(after `33333`)=all `-1`, `played_scores`(after `33334`)=`[-17,-17,2,-17,-17,2,-17]`, `premove_best_col=3`, `premove_best_score=1`. NOTE: `solver.query` is async — must be `await`ed (see [[reference_inline_node_scripts]]).

## Filtering failures for a targeted re-run

`connect-four/server/scripts/filter_failing_evals.mjs` — extracts entries where `final_response === null` from a results JSONL and writes a new eval set JSON for targeted re-runs.

```bash
# Produces <eval_set_stem>_failing_<timestamp>.json next to the results file:
cd connect-four && node server/scripts/filter_failing_evals.mjs \
  server/scripts/eval_results_<timestamp>.jsonl \
  server/scripts/eval_set_large.json

# Then re-run on just the failures:
cd connect-four && node server/scripts/run_eval.mjs server/scripts/eval_set_large_failing_<timestamp>.json
```

## Phase 2 — judge

`/judge-deep-reveals <path-to-jsonl>` — Claude skill that classifies records into pipeline failures / annotation failures / successes, scores success records on the 9-item rubric, and writes `<stem>_report.md` alongside the JSONL.

**9-item rubric** (sub-agent prompt in SKILL.md — always read SKILL.md for the authoritative version):
1. Correct column named
2. No hallucinated win **or structure** — also checks if the explanation claims a tactical structure (major threat, forcing sequence) that the boards show is absent
3. Pattern match — sub-agent first runs a **pre-check** that identifies the PRIMARY tactical concept (what the player missed/had), then checks it matches `pattern_category`; secondary supporting concepts are fine. `suboptimal_move` no longer accepts generic positional filler — it must name a reproducible board feature or be scored against item 9
4. Player perspective correct
5. Move location accuracy
6. No internal terms leaked
7. Internal consistency
8. Other issues (catch-all only — vague/boilerplate moved to item 9, do not double-count)
9. Reproducible reasoning (added 2026-06-25) — the reason must be a board feature the player could find on their own, not score-flavored ("stronger move", "loses slower") or generic filler ("kept your options open"). Honest-minimal exception: brevity is fine when no feature genuinely distinguishes the moves. Checkable rule: if the prompt has a `## What the better move leads to` section, the explanation must use it. Will fail on current sparse-board outputs by design — see [[feedback_deep_reveal_product_mindset]]

**Key rule:** `move_played` and `correct_move` in the JSONL are 0-indexed; the LLM response uses 1-indexed columns.

## Judge skill is now goal-first + 3-axis + agent-with-tools (2026-06-25)

SKILL.md was extended well beyond the rubric. It frames judging as: (1) the goal — does the explanation teach the player an actionable, board-findable reason; (2) if not, a **scientific-method root-cause analysis** across three layers — **render** (prompt text), **context** (data fed in), **generator** (code producing the context, e.g. `runSparseLookahead`). Each entry is scored on THREE axes:
- the 9-item **rubric** (response quality),
- a **prompt-integrity audit** → `prompt_defects[]` (empty_section, vocab_without_data, missing_expected_section, instruction_data_contradiction, direction_mismatch),
- a **grounding-sufficiency check** → `grounding{}` — classify the TRUE reason from solver score vectors (outcome_flip/speed/tactical_structure/parity_positional/none) and flag a `grounding_gap` when a decisive reason has no supporting fact in the prompt (attributed to a `suspected_generator`).

Core principle baked in: **an absent/null upstream signal is a question, not a fact** — don't accept "vague but honest" when ground truth says the move is decisively arguable; trace upstream to the generator. The judge is told it is an AGENT: verify board claims by running `./visualize_board.sh <board_state><col>` and observe generators by RUNNING them, not reading text. See [[feedback_llm_output_root_cause]].

**Ground-truth enrichment (implemented 2026-06-25):** `run_eval.mjs` now emits the solver fields the grounding check needs — `premove_scores`, `best_scores`, `played_scores`, `premove_best_col/score`, `lookahead_null_reason`. Score perspective: `premove_scores` is the pre-move player; `best_scores`/`played_scores` are opponent-perspective (after one move). Older result files predating this lack the fields, so the grounding check degrades to `unknown` on them.

## Human flagging from the admin viewer → judge left-join (2026-06-25)

The `admin/deep-reveal-eval` page has a "Flag this explanation" button (single-run view only, between the explanation and the prompt). It POSTs to `POST /api/admin/eval-feedback` `{ filename, id, human_note }`, which **appends** `{ id, human_note, flagged_at }` to a sidecar JSONL **next to the results file**. The sidecar name is the results filename with `feedback_` inserted after `_results_` — derived by `feedbackFilenameFor()` in `server/evalResultsHelpers.js` (e.g. `..._results_<ts>.jsonl` → `..._results_feedback_<ts>.jsonl`). This naming convention is a **contract** shared by three places: the server endpoint, and the `/judge-deep-reveals` skill which **left-joins the sidecar onto the results by `id`** (keep all records, attach `human_note` where present, latest line wins) and feeds the note to the per-entry sub-agent as a high-priority hypothesis (a prior, not ground truth). Change one, change all. The flag button is gated on `final_response` being present, so pipeline/annotation-failure rows can't be flagged. `isValidEvalFilename` requires the `eval_set_<name>_results_<...>(.enriched).jsonl` shape (the `eval_set_` prefix is mandatory) — `evalResultsHelpers.test.js` was aligned to that convention 2026-06-25 (its `accepts valid eval result filenames` cases formerly used bare `eval_results_` and failed).

## Annotation failure codes

Failures in `attempt1_failures` / `attempt2_failures` come from `annotationGate.js`:
- `P1:invalid_spec` / `P1:empty` — zone spec is syntactically invalid or resolves to no cells
- `P2:col_mismatch` — inner text references a different column than the zone spec
- `P3:disc_notation` / `P3:player_name` / `P3:engine_jargon` — forbidden text in visible output (markup tags are stripped before checking)
- `P5:blocked` — all 4-windows through the zone's cells are blocked
- `P5strong:tg` — LLM used `[zone:tg]` (always invalid; use bare `0` for zero-count threats)
- `P5strong:col_not_allowed` / `P5strong:cell_not_allowed` — zone references a cell/col not in the allowed set
- `P6:raw_coordinate` — zone inner text contains a raw coordinate like `c4r3`

## Eval sets

- `eval_set_small.json` — small subset for quick smoke tests
- `eval_set_large.json` — 49 positions covering forced_win, immediate_threat, odd_even_threat, and other categories
- Generated by `generate_eval_set.mjs`; filtered subsets produced by `filter_failing_evals.mjs`
