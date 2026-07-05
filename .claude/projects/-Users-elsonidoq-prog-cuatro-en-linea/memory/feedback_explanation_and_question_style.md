---
name: feedback_explanation_and_question_style
description: "How to pitch explanations and clarifying questions — non-internals audience, alternatives carry a recommendation, no vague questions"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 39d6b86e-b328-4b30-bb5a-a0664d538973
---

Consistent guidance the user asserted repeatedly in the last sessions (`39d6b86e` L394, `e7115548` L97/L106, `0e333f7b` L7, `78882183` L85, `380dfcca` L43). The user has a strong technical background ([[user_profile]]) but is often **not** familiar with this codebase's internals, so:

- **Explain for someone who has not read the internals.** Name the concept, then give the plain-language mechanism. Abstract away internal helper names (`P()`-style) when walking through a design ("Make the code more abstract and comprehensible for me that I'm not familiar with the internals").
- **When presenting alternatives, always attach a concrete recommendation per option** — not a neutral menu ("Write the alternatives… make a recommendation: what do you suggest to do for each alternative").
- **Clarifying questions must be self-explanatory.** Vague or jargon-laden questions get bounced ("I don't understand your question" — said twice on the same question). When a question is rejected, rephrase with concrete terms and a worked example rather than repeating it.

**Why:** terse, internals-laden explanations and ambiguous questions cost round-trips and stall the work.

**How to apply:** before sending an explanation or a clarifying question, reread it as someone who has not seen the code. If it leans on internal symbol names or unstated assumptions, rewrite. See [[feedback_prework_discipline]], [[feedback_agent_and_ui_workflow]].
