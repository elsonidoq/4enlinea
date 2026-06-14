---
name: project_light_global_theme
description: "Post-spec-033: :root is light, .dark-surface scoped block for admin pages"
metadata: 
  node_type: memory
  type: project
  originSessionId: 988a6f6d-34f2-4b48-ba6c-2a3a7353762e
---

`connect-four/src/index.css` now applies a light theme globally (spec 033 shipped 2026-06-14):
- `:root { color-scheme: light; color: var(--ink); background: #fbf4e8; }`
- `h1, h2, h3 { color: var(--ink); }` — headings are dark
- Body background `#fbf4e8`, no atmospheric radial-gradients
- Dark tokens (`--bg`, `--surface`, `--surface-2`, `--surface-3`, `--border`, `--border-dim`, `--text`, `--text-sub`, `--text-muted`) removed from `:root`

**`.dark-surface`:** Scoped CSS class in `index.css` that re-declares all 9 dark tokens + `color-scheme: dark`. Applied to `AdminCuratePage` and `AdminLessonsPage` wrapper divs. Any component needing dark surface MUST be a `.dark-surface` descendant.

**Token pairing rule unchanged:** Dark surface descendants → `--text`/`--surface` family. Light surface (`:root` default) → `--ink`/`--card` family. Mixing across systems = invisible text.

**New components** get light for free. No more per-component `color-scheme: light` overrides needed.
