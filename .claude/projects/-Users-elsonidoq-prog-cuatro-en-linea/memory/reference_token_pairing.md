---
name: reference_token_pairing
description: "Two CSS token systems (dark-theme in index.css, light-theme in tokens.css) — never mix dark-surface tokens with light-text tokens"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 10fb6ffe-e0b9-4c4d-822a-9c5032b080bf
---

The codebase has **two separate CSS custom property systems** that must be paired correctly:

**Dark-theme tokens** (`index.css`): `--surface`, `--surface-2`, `--surface-3`, `--border`, `--text`, `--text-sub`, `--text-muted`
- Used for dark-background surfaces
- `--text: #e2eaf5` (light), `--text-sub: #8ba3c0`, `--text-muted: #4a6480`

**Light-theme tokens** (`tokens.css`): `--ink`, `--ink-soft`, `--ink-faint`, `--card`, `--line`, `--eval-good-bg`, `--eval-mid-bg`, `--eval-bad-bg`
- Used for white/light-background surfaces (cards, modals, sheets)
- `--ink: #2b2a28` (dark), `--ink-soft: #6b6862`, `--ink-faint: #a6a299`, `--card: #ffffff`

**Pairing rule:**
- Dark background (`var(--surface)` or `var(--surface-2)`) → text MUST be `var(--text)` / `var(--text-sub)` / `var(--text-muted)`
- Light background (`#fff` or `var(--card)`) → text MUST be `var(--ink)` / `var(--ink-soft)` / `var(--ink-faint)`
- Never cross the streams: `var(--ink)` on `var(--surface)` = invisible (dark on dark); `var(--text)` on `#fff` = invisible (light on light)

**Mockup-first rule:** When a mockup exists in `docs/mvp/mockup/`, check the background color in the mockup before choosing tokens. The mockup determines whether the surface is light or dark, which determines the token system to use.

**Why:** The global `:root` sets `color-scheme: dark` and `color: var(--text)`, so any element without explicit `color` inherits light text. A white card without explicit `color: var(--ink)` will have invisible light text.

See also: [[project_dark_global_theme]]
