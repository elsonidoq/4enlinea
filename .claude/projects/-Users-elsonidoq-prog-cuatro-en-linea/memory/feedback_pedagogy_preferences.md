---
name: feedback-pedagogy-preferences
description: "User's pedagogical preferences for the coaching curriculum — what to teach and what to skip"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: fc412ead-b83c-4db1-8238-d7666fa2182e
---

Don't teach lost-position play (damage control, forbidden columns, survival mode). If a player is losing they will lose regardless — spending lesson time on it is low value for the target audience (1000–1500 Elo).

**Why:** User explicitly removed these lessons when revising the curriculum.

**How to apply:** Avoid proposing lessons, puzzles, or narration templates framed around "how to play best when you're already losing." The `forced_win` and `forbidden_columns` classifier categories still exist and fire in the explain-move coach, but they should not be the basis of a lesson.

---

Don't include abstract Allis rules as lessons (baseclaim, before, specialbefore, baseinverse, vertical, aftereven, lowinverse, highinverse). Exception: Claimeven is fine — it is concrete and visual. (Claimodd was also listed as an exception but was removed from the codebase entirely on 2026-06-17.)

**Why:** User called them "too abstract and academic" for 1000–1500 Elo players.

**How to apply:** When the explain-move coach surfaces baseclaim/before/specialbefore patterns, that's fine (they exist in PATTERN_KB for narration). But don't propose lessons or puzzles built around them.
