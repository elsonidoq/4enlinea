---
name: feedback_update_tasks_promptly
description: "Mark tasks as completed immediately when done, not at end of session or in batches"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 228a29d0-e59f-46cb-9da9-13b3d5253a5a
---

Mark tasks as `completed` as soon as the work is done — don't let them go stale showing `in_progress` or `pending` after the work is finished.

**Why:** User noticed tasks still showing stale statuses in the terminal after all work was complete, requiring an explicit correction prompt.

**How to apply:** After finishing each task (tests passing, code committed), call TaskUpdate to mark it completed before moving on to the next one.
