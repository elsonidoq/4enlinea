---
name: feedback-no-random-boards
description: Never generate random Connect Four movestrings/boards as a fallback or candidate source
metadata:
  type: feedback
---

Never generate random boards or movestrings. Random positions are not valid Connect Four games and will produce meaningless or misleading results.

**Why:** The user flagged this explicitly — random movestrings are not a valid substitute for real game positions.

**How to apply:** When a task requires candidate positions (e.g., generating classifier test cases), always source from real data: the puzzles DB, git history of known positions, or KB worked_examples. Never fall back to random generation.
