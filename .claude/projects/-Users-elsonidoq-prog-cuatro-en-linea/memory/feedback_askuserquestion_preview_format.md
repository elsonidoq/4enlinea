---
name: feedback_askuserquestion_preview_format
description: "Never use AskUserQuestion's preview field for text/code option previews — it renders in a way that suppresses/truncates the option text for this user"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 57b21028-1068-459e-ba3a-c954582cf69f
---

Do not use the `preview` field in AskUserQuestion when options are text/code descriptions (as opposed to genuine visual mockups/diagrams). In this user's terminal rendering, previews get shown in a boxed pane that truncates content ("✂ N lines hidden") and the option `description` text itself gets suppressed/not shown.

**Why:** User explicitly said "Never use this format again. Text is being suppressed" after a 4-option question used `preview` for plain prose/code-snippet previews of an implementation approach.

**How to apply:** Reserve `preview` strictly for genuinely visual content (ASCII UI mockups, side-by-side diagram comparisons) per the tool's own guidance — not for restating an option's approach in more detail. For technical/approach questions, put all necessary detail in `label` + `description` only, no `preview`. When in doubt, skip `preview` entirely and just ask in plain text/AskUserQuestion without previews.
