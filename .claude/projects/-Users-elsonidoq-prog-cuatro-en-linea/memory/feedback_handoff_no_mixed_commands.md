---
name: feedback_handoff_no_mixed_commands
description: Don't reference a second slash command inside a handoff prompt meant for a single command — the agent can't run both.
metadata:
  type: feedback
---

In handoff prompts targeting a specific slash command (e.g. `/speckit-specify`), do not include instructions like "if X happens, run `/speckit-clarify`." The receiving agent executes one command; it cannot branch into a second one mid-prompt.

**Why:** User flagged this as confusing — the agent has no way to run both commands from a single prompt.

**How to apply:** Pre-answer likely clarification questions inline in the prompt itself, so the target command doesn't stall waiting for input that would normally come from a second command.
