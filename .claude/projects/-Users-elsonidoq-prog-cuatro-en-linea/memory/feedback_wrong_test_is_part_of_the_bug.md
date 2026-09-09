---
name: feedback_wrong_test_is_part_of_the_bug
description: "Never shape a fix to keep an existing test green — if the test asserts wrong behaviour it is part of the bug; and a test can be vacuous (f(a)===f(a)), reading as coverage while pinning nothing"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: d7194ddb-70f6-4602-a846-18bfc9014c46
  modified: 2026-08-28T18:35:55.777Z
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

**A second failure mode: the test that cannot fail at all.** The case above is a test asserting
something *false*. Worse — and harder to see — is a test asserting something **vacuous**, because it
reads as coverage while pinning nothing. Found 2026-08-03 in
`connect-four/tests/unit/splitRevealZoom.test.js`: a case titled *"is invariant across the full
simulated drag range"* loops `simulatedSplitPct` from 30 to 80 and, on every iteration, calls
`computeFrozenBoardWidth(CONTAINER_H, INITIAL_SPLIT_PCT, true)` — **identical arguments each time**,
with the loop variable explicitly thrown away (`void simulatedSplitPct; // not a valid input to the
frozen function — that's the point`). It asserts `f(a,b,c) === f(a,b,c)`: true for any pure function,
un-failable by any implementation.

The compounding trap: **the behaviour it claimed to guard had moved into the caller.** `SplitReveal.jsx`
now passes the *live* split where the helper's JSDoc still says "at open time (pre-drag)", so the
freeze the test advertises was reverted in production while the test stayed green — it could never
have detected the change, because the changed code isn't the code it calls. See `docs/open_issues.md`
OI-127.

**A third failure mode, and the one that ships wrong text: asserting the ABSENCE of the bad thing
without asserting the TRUTH of the replacement.** Found 2026-08-28, twice in one epic, by code review
run after every corpus test was already green:

- OI-194's fix replaced raw `cNrM` in `link.text` with `"column N"`. The test asserted *no `cNrM`
  token appears*. Green — while 6/63 records now named **two different cells identically**
  ("Column 5 was the better move… the opponent takes column 5", for `c2r5` vs `c2r6`).
- D49's sibling disambiguation replaced `"the one at c6r5"` with an ordinal locator. The test
  asserted *the two roles differ from each other*. Green — while **22 of 58** sibling groups asserted
  a false height ("the lower one" / "the higher one" for two cells **on the same row**).

Both fixes removed a coordinate and introduced a falsehood; both tests were structurally incapable of
noticing, because *two strings that are both lies still differ, and a lie still contains no
coordinate*. The old text was ugly-but-true, the new clean-but-false — strictly worse in a grounding
layer whose entire purpose is truth.

**The rule: when a fix REPLACES a representation, assert a property of the replacement, not merely
the disappearance of the original.** "No raw coordinate" / "the roles differ" are absence assertions;
"no two different cells render identically" / "a height claim only where the rows actually differ"
are truth assertions. The tell: if the test would still pass when the new text is nonsense, it is
testing the deletion, not the fix.

Tells that a test is vacuous: a loop variable that never reaches the call; both sides of the assert
built from the same expression; a "must not change" assertion on a **pure** function whose inputs are
held constant (purity already guarantees it); a unit test whose subject is a helper while the
behaviour under test lives at the call site; **an assertion that only forbids the old form and never
constrains the new one**. When a test's name describes an *integration* property
("across a drag", "after a reload"), a unit test of a pure helper usually cannot express it — that
property needs a render/DOM-level test. (Here one exists and is correct:
`tests/dom/SplitRevealZoom.dom.test.jsx`.)

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
