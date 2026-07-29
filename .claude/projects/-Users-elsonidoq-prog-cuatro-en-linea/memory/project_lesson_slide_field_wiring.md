---
name: project_lesson_slide_field_wiring
description: "Adding an authored slides[] field takes 6 wiring points; the admin-editor control is the one that gets forgotten every time, leaving the field unconfigurable without hand-editing JSON"
metadata: 
  node_type: memory
  type: project
  originSessionId: 7622effc-b51a-4ecb-aabd-07abd6931e35
  modified: 2026-07-28T16:14:39.155Z
---

A new authored field on `slides[]` needs **six** wiring points. Five of them are enforced by tests or
are obvious from the render path. The sixth — the **admin editor control** — is enforced by nothing,
so the field ships working-but-unconfigurable and the gap is only found when a human asks.

This has now happened twice:
- `windowHighlights` → logged as **OI-67** ("Admin lesson editor has no UI control for
  `slides[].windowHighlights`") and fixed later.
- `showWindowCounts` (2026-07-28) → shipped through a full spec → plan → 6-task
  subagent-driven implementation with a final whole-branch review, and **not one of those gates
  caught it**. The user did, by asking "did you update /admin/lessons?".

The checklist:

1. **`validateLesson`** (`server/lessonLoader.js`) — structural check only. The loader **excludes an
   invalid file entirely**, so an over-strict rule silently deletes a lesson from the app.
2. **`localizeLesson`** (same file) — usually free: it starts from `stripEsKeys(slide)`, so a
   non-localized field passes through untouched. Verify rather than assume if the field has `_es`
   siblings.
3. **The renderer** (`ConceptScreen` → `Board`) — plus a `useMemo` for any array prop, because
   `boardPropsAreEqual` falls back to `Object.is` for every prop except `board`.
4. **A content gate** in `tests/unit/lessonContent.test.js` — for a *derived* field, recompute and
   assert equality so staleness is a red test.
5. **`test`/`test:fast`/`test:dom` registration** — explicit file lists; an unregistered test file
   silently never runs.
6. **`SlideEditor.jsx`** ← *the one that gets forgotten.* It already has a generic
   `updateField(key, value)` → `onChange({ ...slide, [key]: value })`, and `lessonToJsonPayload`
   spreads `...slide`, so the field round-trips through the editor **whether or not you add a
   control** — which is exactly why its absence is invisible. Note `SocraticEditor` is a separate
   component: a concept-slide-only field must NOT appear there.

**How to apply:** when a plan adds a `slides[]` field, add "SlideEditor control + a
`tests/dom/*.dom.test.jsx` for it" as an explicit task before starting. If the field is a *derived
cache* (the worked example is `showWindowCounts`/`windowCounts` — contract in
`docs/architecture/lesson-editor.md` §"Window counts"), the editor control must set only the authored
flag and never write the derived value — pin that with a test, or an author can hand-write numbers
that bypass the recompute. Related: [[project_lesson_json_fields_not_rendered]],
[[project_lesson_window_highlights_traps]], [[project_new_category_wiring_checklist]].
