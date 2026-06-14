---
name: feedback_ask_user_question_min_options
description: "AskUserQuestion tool requires at least 2 options per question — single-option questions throw InputValidationError"
metadata:
  type: feedback
---

`AskUserQuestion` enforces a minimum of 2 options per question. A question with only one option (e.g. "Accept recommendation") throws `InputValidationError: Too small: expected array to have >=2 items`.

**Why:** Tool schema validation; can't be bypassed.

**How to apply:** Always provide at least 2 meaningful options for every question in an `AskUserQuestion` call. When only one resolution makes sense, either add a clearly distinct alternative (e.g. "Keep current behavior", "Change the component instead") or merge single-option questions with a broader "Accept all recommendations" option.
