---
name: feedback-agent-model-selection
description: Use Opus for independent critique and gap analysis; stay with Sonnet for applying known decisions to documents
metadata:
  type: feedback
---

Use **Opus** when the task requires independent judgment on an unfamiliar document — e.g., critiquing a spec, doing a gap analysis, catching things the author would rationalize away. Fresh context + Opus = best for these.

Use **Sonnet** when applying a well-defined list of known decisions to a document the current session already wrote. No judgment needed, just execution — Opus's cost isn't justified.

**Why:** Confirmed explicitly during the epics planning session. The user asked before each agent spawn and agreed with this framing.

**How to apply:** Before spawning a review agent, ask: "Is this open-ended critique (Opus) or applying known decisions (Sonnet)?"
