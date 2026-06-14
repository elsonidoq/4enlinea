---
name: project_admin_lessons_dark
description: AdminLessonsPage is dark (overrides spec FR-015) — per user request during spec 033 implementation
metadata: 
  node_type: memory
  type: project
  originSessionId: 988a6f6d-34f2-4b48-ba6c-2a3a7353762e
---

`AdminLessonsPage.jsx` was wrapped in `.dark-surface` during spec 033 implementation, overriding the spec's FR-015 which said "no code change needed — goes light by default."

**Why:** User visually inspected `/admin/lessons` during T017 QA and explicitly requested dark background.

**Implementation:** Same ternary-refactor + `.dark-surface` wrapper pattern as `AdminCuratePage`:
```
const content = (view === 'edit' || view === 'new') ? <AdminLessonEditorScreen ... /> : <AdminLessonListScreen ... />;
return <div className="dark-surface" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>{content}</div>;
```

Sub-components (`AdminLessonListScreen`, `AdminLessonEditorScreen`) use no CSS token references — they inherit cleanly from `.dark-surface`.
