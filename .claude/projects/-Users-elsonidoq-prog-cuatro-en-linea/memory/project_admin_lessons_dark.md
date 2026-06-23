---
name: project_admin_lessons_dark
description: AdminLessonsPage is dark (overrides spec FR-015) — per user request during spec 033 implementation
metadata: 
  node_type: memory
  type: project
  originSessionId: 988a6f6d-34f2-4b48-ba6c-2a3a7353762e
---

`AdminLessonsPage.jsx` is intentionally wrapped in `.dark-surface`, overriding spec FR-015 which said the page goes light by default. The user explicitly requested dark background after visual inspection.

Sub-components (`AdminLessonListScreen`, `AdminLessonEditorScreen`) use no CSS token references — they inherit cleanly from `.dark-surface`. Do not remove the wrapper to "match the spec."
