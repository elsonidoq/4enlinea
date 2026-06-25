---
name: project_kb_major_minor_threat_not_always_include
description: major_threat and minor_threat KB terms are deliberately NOT always_include — only injected when threats exist; reverting causes hallucinations
metadata:
  type: project
---

`major_threat` and `minor_threat` in `PATTERN_KB` (`server/llmCoachHelpers.js`) do NOT have `always_include: true`. This is intentional.

**Why:** When injected on boards with no actual threats (e.g. the opening position), the LLM reads the definition and hallucinates threats into its explanation — claiming "your major threat was kept alive" on an empty board. The root cause is that `always_include` bypasses the pattern-fired check entirely.

**How to apply:** In `explainContext.js` Step 7a, `major_threat` and `minor_threat` are added to `relevantPatternKeys` only when `hasMajorThreats` / `hasMinorThreats` is true (computed from `summarizeThreats` across all three board states). Do not add `always_include: true` back to these two entries. `gravity_top` and `parity` remain `always_include: true` because they are always relevant context.
