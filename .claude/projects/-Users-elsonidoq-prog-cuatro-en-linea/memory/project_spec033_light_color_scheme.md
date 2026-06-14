---
name: project_spec033_light_color_scheme
description: Spec 033 — Global Light Color Scheme; 22 tasks; IMPLEMENTED 2026-06-14
metadata: 
  node_type: memory
  type: project
  originSessionId: 988a6f6d-34f2-4b48-ba6c-2a3a7353762e
---

Spec 033 implemented. `:root` is now `color-scheme: light` with cream background (`#fbf4e8`) and ink text (`var(--ink)`). Dark tokens live exclusively in `.dark-surface` scoped block.

**Commits:**
- `d0d231a` — feat: flip global theme to light (FR-012 atomic) — 10 files
- `9d0a51b` — docs: update frontend-conventions for light global theme

**Deviation from spec:** `AdminLessonsPage.jsx` was wrapped in `.dark-surface` per user request, overriding FR-015's "no code change needed." See [[project_admin_lessons_dark]].

**Dark surfaces:** `AdminCuratePage` and `AdminLessonsPage` — both wrapped in `<div className="dark-surface" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>`.

**Token map applied:** `--border`/`--border-dim`/`--surface-2`/`--surface-3` → `--line`; `--text` → `--ink`; `--text-sub` → `--ink-soft`; `--text-muted` → `--ink-faint`.

**Board.jsx shimStyle()** — no code change; `--bg`/`--border-dim` resolve correctly via `.dark-surface` ancestor on CurationWorkspace.

**tokens.css** — untouched; pairing-rule comment remains accurate.

**New components:** get light default automatically. Dark components need `.dark-surface` ancestor or their `--text`/`--surface` tokens will be unresolved (visible failure).
