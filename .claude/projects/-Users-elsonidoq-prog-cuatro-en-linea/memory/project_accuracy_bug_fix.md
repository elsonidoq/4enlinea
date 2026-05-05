---
name: Puzzle accuracy tracking — first-attempt-only rule
description: Accuracy stats must be recorded only on the first attempt; second-attempt correct answers must not count as success
type: project
---

Fixed 2026-05-01 in `connect-four/src/pages/PuzzlesPage.jsx`.

**Bug:** `updateStats(category, true)` was called for any correct result (first or retry), and never called for a wrong first attempt. Result: users could fail a puzzle, retry, get it right, and see 100% accuracy.

**Fix:** Stats are recorded only when `newAttemptCount === 1`:
- First attempt correct → `updateStats(category, true)`
- First attempt wrong → `updateStats(category, false)`
- Second attempt (either result) → no stat update

**Why:** Accuracy should reflect whether the user got it right on their first try, not whether they eventually got it right.
**How to apply:** Any future puzzle stat logic should follow the same pattern: check `attemptCount === 1` before updating accuracy.
