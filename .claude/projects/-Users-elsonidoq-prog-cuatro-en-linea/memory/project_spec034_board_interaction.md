---
name: project_spec034_board_interaction
description: Spec 034 — Board Interaction Feedback; IMPLEMENTED 2026-06-16; 10/10 tasks done
metadata: 
  node_type: memory
  type: project
  originSessionId: 955cee10-9c24-40aa-a8a6-2e8b988965be
---

**Key architectural decision — Option B:**
The `finally` block was REMOVED from `handleSequenceClick`. `setIsSubmitting(false)` is now explicit in every branch:
- `continue`: inside `setTimeout` callback (~300ms, async)
- `success`: after `setPhase('post-move')`
- `wrong`: after coach message
- `catch`: after error message
The `return` at line 445 prevents synchronous clearing for the continue path. Any new branch added to handleSequenceClick MUST include its own `setIsSubmitting(false)` call.

**Why:** Animation gate was the missing piece; lastDrop was dead since added to Board API.

**How to apply:** Feature is complete. QA pass recommended (claim/tg/td overlays not visually tested — no claimeven puzzles in DB). See also [[reference_t4_vs_forced_win_trap]].
