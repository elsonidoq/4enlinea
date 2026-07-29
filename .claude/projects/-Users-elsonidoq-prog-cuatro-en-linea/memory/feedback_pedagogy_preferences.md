---
name: feedback-pedagogy-preferences
description: "User's pedagogical preferences for the coaching curriculum — what to teach and what to skip"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: fc412ead-b83c-4db1-8238-d7666fa2182e
  modified: 2026-07-28T21:00:53.309Z
---

Don't teach lost-position play (damage control, forbidden columns, survival mode). If a player is losing they will lose regardless — spending lesson time on it is low value for the target audience (1000–1500 Elo).

**Why:** User explicitly removed these lessons when revising the curriculum.

**How to apply:** Avoid proposing lessons, puzzles, or narration templates framed around "how to play best when you're already losing." The `forced_win` and `forbidden_columns` classifier categories still exist and fire in the explain-move coach, but they should not be the basis of a lesson.

---

Keep lesson messages short: every coach bubble and every `infoProse` block caps at **4 sentences**. When a slide's content exceeds that, **split the slide into more slides** rather than shrinking the teaching — reuse the same board across the split siblings and reveal the overlays progressively (one new idea per slide). A 4-slide lesson becoming 10 is the expected, wanted outcome.

**Why:** User asked for this explicitly on `threat-vocabulary` and accepted the 4→10 slide growth without hesitation. Long blocks also clip on screen — see [[project_lesson_text_overflow_traps]] for the hard 120px coach-bubble cap, which binds *tighter* than 4 sentences in Spanish.

**How to apply:** 4 sentences is the editorial ceiling; ~205 characters / 5 rendered lines is the physical one for coach bubbles. Satisfy both, and verify the Spanish. Never satisfy the sentence cap by splitting one bubble into two `coachMessages` — that makes the clipping worse.

---

Don't include abstract Allis rules as lessons (baseclaim, before, specialbefore, baseinverse, vertical, aftereven, lowinverse, highinverse). Exception: Claimeven is fine — it is concrete and visual. (Claimodd was also listed as an exception but was removed from the codebase entirely on 2026-06-17.)

**Why:** User called them "too abstract and academic" for 1000–1500 Elo players.

**How to apply:** When the explain-move coach surfaces baseclaim/before/specialbefore patterns, that's fine (they exist in PATTERN_KB for narration). But don't propose lessons or puzzles built around them.
