---
name: feedback_reason_case_requires_eval_and_grader
description: Adding a reason-engine case/evidence-field is not done until select_boards coverage + the grade-fv-sufficiency skill also know about it
metadata:
  type: feedback
---

When you add a new case, evidence field, or predicate to the blunder-reason engine
(`computeReason` / `reason_engine/`), the change is **not complete** until you also:

1. **Add new predicate derivation CASES in `select_boards.mjs`** — in the reason-vector
   predicate-derivation block (`~select_boards.mjs:331–380`, where it does
   `preds.add('phase_' + r.boardState)`), map the new vector field to a predicate name, and
   **register that name in `REASON_UNIVERSE`** (partition REQUIRED vs PROVISIONAL). The names
   must round-trip or the coverage strategy's "emitted-but-unlisted predicate = bug" self-check
   fires. Otherwise the new case is never harvested → never evaluated.
2. **Update `.claude/skills/grade-fv-sufficiency/SKILL.md`** (and `feature-vector-glossary.md`)
   so the grader knows the new field: how to verify its claim on the board and how to attribute
   failures (`vector_error` vs `missing_info`). Otherwise the grader mis-scores the new case.

**Why:** the user explicitly required this (2026-07-04): "adding cases to the reason engine has to
also make select_boards cover those conditions... and the grader skill must be aware." A reason
field that isn't in the coverage universe or the glossary/grader is invisible to the eval loop.

**How to apply:** treat "engine field → select_boards predicate → glossary → grader skill" as one
atomic unit of work in the plan. See `docs/architecture/api-conventions.md` §Admin Blunder-Reason Browser Endpoints, [[project_reason_render_layer]].
