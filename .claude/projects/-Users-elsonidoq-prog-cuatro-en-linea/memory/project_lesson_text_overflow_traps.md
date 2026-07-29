---
name: project_lesson_text_overflow_traps
description: "Lesson coach bubbles clip silently at a 120px cap that is NOT tied to the `fixed` prop, splitting a long message into two makes it WORSE, and infoProse newlines collapse — Spanish is always the binding constraint"
metadata: 
  node_type: memory
  type: project
  originSessionId: e7f37a8a-4ca5-4426-8f4c-e4ff6e22ca13
  modified: 2026-07-28T16:05:32.050Z
---

Lesson copy that reads fine in the JSON can render **clipped** in the app, with no error and no
failing test. Three things about the two lesson text surfaces will surprise you.

**1. The coach bubble has a hard 120px cap on EVERY screen — `fixed` is irrelevant.**
`CoachDialog.jsx` puts `maxHeight: 120, overflowY: 'auto'` on the **inner** bubbles container,
outside the `fixed` ternary. `fixed` only adds an outer `height: 140` plus background/margin. So
`ConceptScreen` and `SocraticScreen` — which deliberately do **not** pass `fixed` — are capped
exactly like `ChallengeScreen`. `frontend-conventions.md` §"Coach-message accumulation" reads as if
the inner cap arrives *with* `fixed`; it does not. Measured budget: the box fits **5 rendered lines**
of text (`scrollHeight` 119 fits, 139 overflows — 22px of that is bubble padding), which is
**~205 characters**. Nothing enforces this: `lessonContent.test.js` has no length assertion, so a
6-line bubble is green in CI and truncated on screen.

**2. Splitting one long message into two `coachMessages` makes the clipping WORSE, not better.**
This is the intuitive fix and it is backwards. `CoachDialog` renders **all** messages stacked inside
that *same* 120px box (it is not a sequential/paged reveal), so two bubbles cost ~28px more than one
for identical words (6px gap + a second bubble's 22px padding). Worse, `CoachDialog.jsx`'s effect
sets `scrollTop = scrollHeight` on mount — the learner opens the slide looking at bubble **2** with
bubble 1 already scrolled off the top. Shorten the text; do not split it.

**3. Spanish is the binding constraint, and it fails alone.** ES runs ~15% longer than EN at equal
sentence count, so slides routinely pass in `en` and clip in `es` (measured: 6 of 10 slides in one
lesson overflowed only in Spanish). Always measure in `es`.

**4. `infoProse` paragraph breaks do not render.** `ConceptScreen.jsx` drops the string into a plain
`<div>` with no `white-space: pre-wrap` and no split — authored `\n\n` collapses to a single space,
so a carefully paragraphed block reads as one wall of text (OI-71).

**How to apply:** measure, don't eyeball — in the browser, read
`scrollHeight - clientHeight` off the element with `maxHeight: 120px` for every slide in **both**
locales, and treat non-zero as a bug. And restart the API server first: it caches lessons at startup,
so a disk edit that "changed nothing" is usually the cache, not the CSS
([[project_lesson_disk_edit_cache_clobber]]) — identical before/after measurements are the tell.
Related: [[project_lesson_json_fields_not_rendered]], [[project_spanish_output_silent_fallback]],
[[feedback_pedagogy_preferences]], [[project_lesson_window_highlights_traps]].
