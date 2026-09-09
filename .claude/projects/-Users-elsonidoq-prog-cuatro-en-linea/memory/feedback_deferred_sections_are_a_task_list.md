---
name: feedback_deferred_sections_are_a_task_list
description: A plan's "Deferred / not in this plan" section is a conditional task list that must be re-read against the measurement, not a discard pile
metadata:
  type: feedback
---

When a plan carries a **"Deferred, deliberately not in this plan"** section, treat it as a task list with
**trigger conditions**, not as scope that was thrown away. Its bullets typically read *"revisit only if
the final measurement shows X"* — which means the measurement is the test, and someone has to go back
and evaluate each condition once the numbers exist.

**Why:** measured 2026-08-25 on the spec-058 render remediation. Asked "what's remaining", I listed only
the numbered tasks and reported "19 of 20 complete". The user pushed back that more work was ahead — and
they were right. The plan's deferred section held six items, and checking them against the final data
showed **three had fired**:

- "revisit only if the parenthetical group fails materially above prose" → it had gone from 9% vs 0% to
  **16% vs 0%**; the gap widened, so the rewrite it deferred is now indicated.
- "revisit only if the flaky pile dominates" → **15 of 20 failing cases were intermittent**.
- "file as an open issue after Task 10" → a direct instruction that was simply never carried out.

Two of those are only visible if you compute the trigger metric on purpose; none appear in a task
checklist. A control group deliberately left untouched is the sharpest case: it can come back with the
*opposite* answer to the plan's rationale, and that is a result, not an oversight.

**How to apply:** when reporting completion or "what's next" on a plan, re-read its deferred/out-of-scope
section and evaluate each condition against the actual measurement, then report the deferrals with an
explicit fired / not-fired verdict alongside the numbered tasks. Related: [[feedback_measurement_expires]],
[[feedback_eval_design_methodology]], [[feedback_verify_at_the_source_layer]].
