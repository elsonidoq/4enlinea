---
name: feedback_explicit_server_flags
description: "When adding a new server code path, use an explicit request flag — don't branch on the absence of an existing field"
metadata:
  type: feedback
---

When adding a new server branch (e.g. a new classifier path on an existing endpoint), use an explicit boolean flag in the request body rather than inferring intent from the absence of another field.

**Why:** Other callers of the same endpoint may also lack the "distinguishing" field. In the coach commentary epic, the plan initially branched on `category` absence to route AI moves to `classifyPattern()`. But sparring user moves (`handleColumnClick` in `useGameBoard.js`) also call the same endpoint with no `category` — so the branch would silently rewire live user-move classification too.

**How to apply:** Add a purpose-specific field like `aiMove: true` sent only by the new caller (`makeAiMove`). Gate the new server behavior on that flag. Existing callers are untouched. This pattern applies any time you add a new "mode" to an existing endpoint.
