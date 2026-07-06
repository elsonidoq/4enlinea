---
name: project_explain_prompt_grounding_traps
description: Three open prompt-construction traps in explainContext.js that drive LLM fabrication on sparse/anchorless deep-reveal positions
metadata: 
  node_type: memory
  type: project
  originSessionId: a287e3be-f401-40ae-aed8-aec68fed5a9a
---

Diagnosed 2026-06-25 while judging sparse deep-reveal evals. These are **open** (no fix landed; "show the complete threat picture" was deliberately out of scope). They make the LLM fabricate structure when the prompt has no real grounding. All in `connect-four/server/explainContext.js` prompt build + `llmCoachHelpers.js`.

1. **Empty threat-comparison section is emitted unconditionally.** `threatComparisonSection` (Step 8) is always built — header + the "Note: snapshots…" paragraph + three labels — even when all four `show*` flags are false, so every row is blank. The only suppression is `tag === 'immediate_threat'`. A section full of "how to cite a threat count" instructions with zero threats primes the model to invent one.

2. **`parity` and `gravity_top` are `always_include: true`** (`llmCoachHelpers.js` PATTERN_KB), so `kbTermsSection` is never empty. A non-empty `kbTermsSection` flips the task instruction to **"Name the tactical pattern that was missed"** (`buildBlunderExplainPrompt`) even on a near-empty board with no pattern → the model fabricates a "parity edge" / minor threat. (Same anti-pattern that [[project_explain_system]] fixed for major/minor — parity escaped it.)

3. **Term-inclusion vs row-visibility criteria disagree (direction mismatch).** `minor_threat` is injected whenever `hasMinorThreats` counts a threat on ANY of the 3 boards **including the blunder board**, but the comparison row only shows when `showPlayerMinor = bestStats.playerMinor > blunderStats.playerMinor`. When the **blunder** is the threat-richer move (common on sparse positions), the row is hidden yet the `[term:minor_threat]` vocab is still injected → the model attributes the blunder's threat to the better move. The pedagogically true story ("the threat you made was a distraction") is unexpressible.

These map to the `judge-deep-reveals` prompt_defect types `empty_section` / `instruction_data_contradiction` / `direction_mismatch`. See [[project_explain_system]], [[feedback_llm_output_root_cause]].
