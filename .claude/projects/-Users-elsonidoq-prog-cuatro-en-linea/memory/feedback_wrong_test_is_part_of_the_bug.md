---
name: feedback_wrong_test_is_part_of_the_bug
description: "Never shape a fix to keep an existing test green — if the test asserts wrong behaviour, the test is part of the bug and must be replaced along with the code"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: d7194ddb-70f6-4602-a846-18bfc9014c46
  modified: 2026-07-28T21:05:02.873Z
---

**When designing a fix, correctness is the constraint. A green suite is not.**

If the honest fix would break an existing test, the question is *never* "how do I keep the
test passing?" — it is **"is that test asserting something true?"** A test that encodes the
defect is not a cost of the fix; it is part of what you are fixing. Replace it in the same
change.

The tell that you are rationalizing: you find yourself writing "keep X for now, because two
tests depend on it," or scoping a fix to the subset that happens not to trip the suite. That
is designing around evidence rather than acting on it.

**Why (2026-07-28, `double_threat` grader):** `evalDoubleThreat` (`server/predicates.js`) had
a silent fallback — when *no* column created a fork, it graded by "highest positive solver
score" instead. I drafted a plan that **kept the fallback specifically so
`tests/unit/multiSolutionAcceptance.test.js` would stay green**, and even noted that its two
fixtures named *"2 legal fork columns"* contain **no fork at all** — while still proposing to
leave them. The user caught it: "I got the idea that you are letting a wrong test be kept in
the codebase."

The suite was hiding the real story. Measured against the DB afterwards:
**92 of 100 `double_threat` puzzles contain no double threat on any column** — they exist only
because the fallback let them through `checkPredicate` at generation time. The two "passing"
tests were not protecting behaviour, they were *certifying* the defect, and they made a
category-wide content bug look like a two-fixture inconvenience.

**It happened twice more in the same session, and the second time is the useful pattern.** After
adding the invariant as a *generation guard*, the first thing it did was fail two more existing
fixtures — `overcut` (a board with three winning columns at +8 while accepting only one) and
`claimeven` (a board teaching a +10 move when +11 was available). Both were replaced, not exempted.

**Generalisation: when you add a guard, the existing test fixtures are the first place it fires,
and those hits are findings, not obstacles.** A fixture that has to be exempted for a new
correctness rule to pass is usually evidence the rule is right. Read the fixture's actual board and
values before concluding the guard is too strict — but equally, check the guard itself: the same
session's guard *was* over-strict for lost positions and for callers passing `scores = []`, and
those two exemptions were legitimate. The discriminator is the data, never the red/green.

**How to apply:**
1. When a fix breaks a test, first ask whether the assertion is *true* — read the fixture's
   actual board/value, don't trust the test's name. Names lie exactly like doc comments.
2. If it is false, the deliverable includes: fixed code + replaced fixture + a note on what
   the old assertion was really pinning.
3. Preserve the test's **intent**, never its wrong data. ("Multi-solution acceptance" was the
   right thing to test; the boards were wrong.)
4. Before writing "keep X for now," state out loud what X is protecting. If the answer is
   "the suite," delete X.
5. A defect that reached a test fixture has usually reached the data too. Measure the corpus
   (DB rows, content files) before sizing the fix — see [[feedback_verify_at_the_source_layer]]
   ("all N, not a sample of 3").

Related: [[feedback_verify_at_the_source_layer]] (a green test you authored is not evidence —
this is its mirror: a green test *someone else* authored is not authority),
[[feedback_occam_principled_extrapolation]].
