---
name: project_opening_theory_scoping
description: Opening theory is cut from Challenges (recognition-task mismatch) and delivered via Lessons + a reason-engine "book-deviation" reason
metadata:
  type: project
---

Settled scoping for productizing the Allen opening KB entries (2026-07-04). Don't relitigate:

- **NO opening Challenge category.** Openings don't fit the recognition-puzzle/category model: the
  flagship "won position" boards (`333334444` 5-4, `3333311115555` candlesticks, `3332222` 3-4) have
  the **losing side to move** → no column to recognize; and there's no generatable one-move opening
  signal for a classifier. Only the gambit `3265533353553111`→col4 and D3-D4 Diagram 231
  `3332223362`→col1 are clean unique-move boards, and they're singletons. Do not build an `opening`
  category / 8-file wiring.
- **Lessons** carry the "find the move" interaction via one client-side Socratic per lesson
  (empty→3, imitation, gambit→4 / D3-D4→1). See [[project_lesson_interactivity_evaluation]].
- **Reason engine** integrates openings as a **book-deviation reason**: openings are *good moves*, so
  when a blunder's pre-move history is a mirror-normalized **prefix** of a KB opening line and the
  blundering player is the opening's **beneficiary**, name the opening and state the book's next move
  (solver-verified best) as the correct move; the two-halves engine still supplies why the played
  move loses. Off-book openings fall back to centrality (`centerDominance.js`). Four guards keep it
  sound (prefix-match, beneficiary-only, book-move-is-best, name-specific-only-when-unique-else-family).

**Why:** the durable home for this is memory — the spec/plan live under `docs/superpowers/` which is
throwaway ([[feedback_superpowers_docs_not_durable]]). The design spec + plan are
`docs/superpowers/{specs,plans}/2026-07-04-opening-theory*` (as of session end, planned, NOT implemented).

**How to apply:** if asked to "add openings to challenges/puzzles," push back with the recognition-task
mismatch above. A prior full implementation attempt (`feat/opening-aware-reason-engine`) was declared a
FAILED attempt and deleted — do not resurrect it.
