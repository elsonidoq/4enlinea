---
name: feedback_measurement_expires
description: "A verification taken mid-epic expires — re-measure against the FINAL code before trusting any \"already checked, nothing to do\" conclusion"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 09ab1bbf-3752-44fc-9a64-d05aa25d0cce
  modified: 2026-08-01T23:41:01.510Z
---

[[feedback_verify_at_the_source_layer]] says verify at the right *layer*. This is the **time** axis
of the same failure: a check that was honest when it ran can be false by the end of the change.

Spec 052 produced three of these in one epic, all of the form "we already verified this, it's fine":

- **FR-006's pool count** was measured after US1 but before US2 widened the detector. Its "42 rows,
  all identical, no repair needed" was true when taken and wrong at merge — 18 rows had drifted.
  Re-running it at the end is what found the deploy blocker (OI-92).
- **FR-017's premise** — "a genuine draw keeps its `drawing_move` tag" — described a case that never
  existed; `tagBlunder` only ever emitted that tag for a forfeited win.
- **FR-019's acceptance scenario** described a position later *proven* unreachable.

**Why:** these claims assert something about code or data while doing the least checking, so they
attract the least scrutiny — and unlike a stale line number, nothing about them looks stale.

## The sharpest form: an unchanged line does NOT mean an unfixed bug

Spec 053 reasoned "`App.jsx:113` still reads `const goBack = useCallback(() => { window.history.back(); }, [])`,
so the `/mistakes ↔ /stats` cold-load back loop remains plausibly live." Both halves were true and the
conclusion was false: the loop was **never** in `goBack`. It lived in the screen's back handler and was
fixed 2026-07-16 by `f4de927`, in `src/screens/categoryListBack.js` — a file the QA finding never named.
The inference survived a spec, a plan, and a quickstart, and the prescribed "fix" (a `history.length`
guard in the global `goBack`) would have **regressed** in-session Back navigation that already worked.

**Why:** "the code I'd expect to change didn't change" only rules out a fix *at that location*. A fix
that landed anywhere else leaves your chosen line pristine, so the evidence looks like confirmation
while proving nothing. It is the negative-claim trap ([[feedback_verify_at_the_source_layer]]) with a
timestamp on it.

**How to apply:** before assigning any "still broken / fix-here" disposition to a previously-reported
bug, run both `git log --oneline --grep "<finding keyword>"` and `git log --oneline -- <the-file-that-actually-owns-the-behavior>`.
Find the owning symbol first — the reporter's cited file is frequently not it. Two commands, and they
are what caught this.

**How to apply:** when a task says "confirm X, then act on the result", re-run the confirmation
against the **final** state of the branch, not the state it had when the task was written. Treat any
inherited "already satisfied / no task needed" from an earlier batch or a spec as a hypothesis to
re-test, not a fact — sub-agent handoffs are especially prone to laundering one into the other
([[feedback_isolated_review_misses_seams]]). Record explicitly when an environment was unreachable
rather than assuming its result matches another's.
