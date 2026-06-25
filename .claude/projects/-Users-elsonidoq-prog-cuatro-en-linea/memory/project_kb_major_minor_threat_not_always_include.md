---
name: project_kb_major_minor_threat_not_always_include
description: The always_include KB-term mechanism was removed entirely (2026-06-25) — NO term injects without its pattern firing; reverting causes hallucinations
metadata: 
  node_type: memory
  type: project
  originSessionId: 8e0529ea-465b-46f1-afef-31862eabe6f1
---

There is **no `always_include` glossary path** in `PATTERN_KB` (`server/llmCoachHelpers.js`) anymore. Every KB term is injected into a prompt **only** when its pattern actually fires (added to `relevantPatternKeys` in `explainContext.js`). The inclusion gate is now simply `if (!relevantPatternKeys.has(patternKey)) continue;` — no `always_include` branch.

**Why:** injecting a term definition on a board with no instance leads the LLM to fabricate/misapply it. This was first found for `major_threat`/`minor_threat` (e.g. "your major threat was kept alive" on an empty board). The **2026-06-25 deep-reveal judge** (`eval_set_large_2_nonfiring_lookup_evals`) showed `parity` and `gravity_top` — long thought safe "legend" terms — caused the **same** failure: parity invoked as a fake mechanism on a bare board, gravity_top misapplied to a column-filling move. So `always_include: true` was dropped from those two as well, and the whole mechanism was deleted.

**How to apply:** do NOT re-add `always_include: true` to any `PATTERN_KB` entry. `major_threat`/`minor_threat` are added to `relevantPatternKeys` only when `hasMajorThreats`/`hasMinorThreats` is true; all other terms only when their detector fires. See [[project_drawing_move_mislabels_wins]] and [[project_sparse_lookahead_unvalidated]] (same eval round). The `## KB term definitions` section is empty (and now, per the no-empty-section rule, omitted) on anchorless boards — that is correct.
