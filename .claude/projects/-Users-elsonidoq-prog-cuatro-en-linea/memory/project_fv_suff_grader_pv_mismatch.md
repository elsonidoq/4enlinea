---
name: project_fv_suff_grader_pv_mismatch
description: "FV-sufficiency grading trap — verify cells against the engine's OWN winning line, not an alternate solver PV"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 5beb0093-24c2-4a4a-b8b8-28461511fe5b
---

When grading (`grade-fv-sufficiency`) or otherwise verifying that a reason-vector cell/window/line is
real, compare it against the **engine's own** `finalMovestring`/`line` — NOT an independently-traced
solver principal variation. Connect Four positions have MANY equally-optimal winning lines; a cell
absent from *your* traced PV can be fully real on the engine's line.

**Why:** In the 2026-07-02 Phase-1 grading run this bit 3 of 4 "failures" — eval-1 (mis-triaged
`vector_error`), eval-16 (mis-triaged A4 "fabrication"), and eval-3 — were all CORRECT deep fields
wrongly convicted because the grader (sub-agents + orchestrator) compared to a *different* optimal PV.
Replaying the engine's `finalMovestring` flipped eval-1/16 to pass and re-triaged eval-3 to an altitude
issue, not fabrication.

**How to apply:** Before ruling a deep field wrong, replay that half's `finalMovestring` and confirm
whether the named window completes there. "Not visible on the board now" AND "not in my PV" are BOTH
invalid grounds to convict — the skill already warns against board-absence; this adds: *your PV ≠ the
engine's PV*. The grade-fv-sufficiency skill does not yet enforce this (tracked as spec §3f G4, a P4
grader-rubric item in [[project_reason_render_layer]]). Related: [[feedback_reproduce_fv_case_from_coverage]].
