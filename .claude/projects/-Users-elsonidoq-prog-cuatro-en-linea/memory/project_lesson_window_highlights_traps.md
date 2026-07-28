---
name: project_lesson_window_highlights_traps
description: "slides[].windowHighlights capsules — cells must be ORDERED along the line (renderer draws first→last, validates nothing between), colours must be opaque, and a window label must NOT go through legendItems"
metadata: 
  node_type: memory
  type: project
  originSessionId: fc78ad5e-ad9a-4ca3-aabe-8823ea29d545
  modified: 2026-07-28T12:39:48.087Z
---

Concept slides can draw a translucent capsule over a line of board cells via
`slides[].windowHighlights` (contract in `docs/architecture/lesson-editor.md` §"Window highlights",
helpers in `src/lib/lessonWindows.js`). Four things about it will surprise you.

**1. `cells` order is load-bearing, and nothing at runtime checks it.** `Board.jsx`'s `zhSvg` takes
the `windows` branch and draws exactly one capsule per window from `w[0]` to `w[w.length - 1]` —
it never looks at the cells in between. An unordered array therefore renders a plausible-looking
capsule over the **wrong** cells (wrong length, or wrong angle entirely) with no error anywhere.
`isStraightLineWindow()` (same module) is the only gate; it runs in
`tests/unit/lessonContent.test.js`, not in the renderer and not in `validateLesson`. Author cells in
traversal order, first → last, and never "fix" a window by sorting it into some canonical order.

**2. Capsule colours must be OPAQUE hex, not the `rgba()` values the legend swatches use.** Board
renders the capsule at `opacity="0.4"`. Feeding it `ConceptScreen`'s `OVERLAY_SWATCH_COLOR` values
(already `rgba(…, 0.4)`) compounds to ~0.16 and the capsule visually disappears against the board.
That is why `WINDOW_HIGHLIGHT_COLOR` is a *separate* map from `OVERLAY_SWATCH_COLOR` with the same
type tokens — they are not redundant, do not "deduplicate" them.

**3. A window label must NOT become a `legendItems` entry.** `tests/unit/lessonContent.test.js`
asserts every `legendItems[].type` has a matching per-cell **overlay** of that type on the same
slide. A window has no such overlay, so the obvious move — "add a legend row for my new marker" —
fails the suite in a way that reads like an unrelated legend bug. Window labels live on the window
object (`label`/`label_es`) and `ConceptScreen` renders them as their own legend rows with a pill
swatch. Same reason `SlideEditor`'s `syncLegend` auto-sync must never see them.

**4. `ConceptScreen` is the only consumer.** `SocraticScreen` derives its own overlays from phase
state and reads no authored ones (see [[project_lesson_json_fields_not_rendered]] — `socratic.overlays`
is already dead for the same reason), so `windowHighlights` on a socratic node renders nothing.
`server/scripts/verify_lesson_content.mjs` also knows nothing about windows **by design**: a window
asserts no solver-checkable fact the way a `tg`/`td` cell does, so the geometry test is the whole
safety net.

Also: the capsule draws **over** discs (`zIndex: 2`), so amber over a gray disc reads brown. Fine
normally; avoid it on a slide whose teaching point is disc colour. Related:
[[project_lesson_disk_edit_cache_clobber]] (the server caches lessons at startup — restart before
believing a window "didn't render").
