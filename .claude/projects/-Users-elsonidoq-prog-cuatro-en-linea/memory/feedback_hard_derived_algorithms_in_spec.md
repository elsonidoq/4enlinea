---
name: feedback-hard-derived-algorithms-in-spec
description: "Keep hard-to-derive algorithms in spec.md even when they describe \"how\", not just \"what\""
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 9320c895-f694-4d86-b5a4-33acb766275c
---

Keep hard-to-derive algorithms in spec.md even if SDD best practices would normally move them to plan.md.

**Why:** The claimeven simulation algorithm (FR-004) was difficult to derive. Moving it to plan.md would risk losing the derivation or having it overridden. When an algorithm represents significant research effort, its presence in the spec is intentional — it locks the approach, not just the outcome.

**How to apply:** When reviewing a spec and flagging "how vs. what" violations, first ask whether the algorithm was hard to derive or represents a deliberate constraint. If yes, leave it in the spec and do not suggest moving it to the plan.
