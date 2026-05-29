---
name: project-puzzle-advancement
description: store.recordPuzzleAttempt must be called on correct answers for loadPuzzle to advance past the current puzzle
metadata: 
  node_type: memory
  type: project
  originSessionId: b9f8f8e6-5d30-4a8e-965d-bb516d5e5874
---

`loadPuzzle` filters the puzzle pool by `solvedIds` from `store.getAllPuzzleAttempts()` and keeps `categoryPuzzleRef` pointing to the current puzzle ID. If `store.recordPuzzleAttempt` is not called after a correct answer, the puzzle is never added to `solvedIds`, the pool still contains it, and "Next puzzle" reloads the same puzzle forever.

**Why:** Discovered when implementing `handleForbiddenSubmit` — the function omitted the `store.recordPuzzleAttempt` call, causing the same forbidden_columns puzzle to reload on every "Next puzzle" click.

**How to apply:** Every correct-answer branch in `PuzzlesPage.jsx` (normal `handleColumnClick`, `handleForbiddenSubmit`, and any future submit handlers) MUST call `store.recordPuzzleAttempt` with `outcome: 'correct_first'` or similar. Wrong-answer attempts do not need recording for advancement, only for blunder tracking.
