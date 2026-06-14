# Feature Specification: Global Light Color Scheme

**Feature Branch**: `101-new-design`  
**Created**: 2026-06-14  
**Status**: Draft  

## Overview

The app currently renders on a dark global base theme enforced at the CSS `:root` level. This forces every light-surface component to individually override the global dark scheme, creating maintenance overhead and making the two-token-system pairing rule (dark bg → `--text` family; light bg → `--ink` family) error-prone to enforce.

This feature flips the global default to a light (cream) base theme, removes dark token definitions from `:root`, confines them to a `.dark-surface` scoped block used exclusively by the internal curation admin tool, and fixes all stale dark-token uses in user-facing components.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — App renders correctly on a light background (Priority: P1)

A learner opens any screen of the app. All text is legible (dark ink on cream background), the board is unchanged, and no screen shows invisible or low-contrast text.

**Why this priority**: This is the foundational change. Every other story depends on the global flip being correct. Invisible text or broken contrast is a blocker for all users.

**Independent Test**: Open the app and navigate to every route listed in `screenRegistry.jsx`. Verify all text is visible, backgrounds are cream/light, and no white-on-white or dark-on-dark text exists.

**Acceptance Scenarios**:

1. **Given** a user opens the home screen, **When** the page loads, **Then** the background is cream (`#fbf4e8`), all body text is dark ink, and headings are dark ink — no invisible text.
2. **Given** a user navigates to any user-facing screen (challenges, lessons, sparring, mistakes, stats, past games), **When** the screen renders, **Then** text and backgrounds are correctly contrasted with no light-on-light or dark-on-dark combinations.
3. **Given** a user opens a modal or bottom sheet, **When** the modal/sheet appears, **Then** text inside is legible (dark ink on white card background) — same as before the change.

---

### User Story 2 — Curation admin tool remains dark (Priority: P1)

A developer navigates to `/admin/curate`. The curation workspace and candidate dashboard render with their existing dark background and light text, unchanged from before the global theme flip.

**Why this priority**: The curation tool is a localhost-only internal tool with heavy dark-surface styling. If it accidentally inherits the light global theme, text and board shims will break. This must be correct before shipping the root flip.

**Independent Test**: Open `/admin/curate` after the global flip. Both the `CandidateDashboard` and `CurationWorkspace` views must show a dark background with light text, and the board's shim styling must render correctly.

**Acceptance Scenarios**:

1. **Given** a developer opens `/admin/curate`, **When** the `CandidateDashboard` view loads, **Then** the background is dark (`#0d1520`), text is light (`#e2eaf5`), and the component is visually indistinguishable from before the theme flip.
2. **Given** a developer selects a category in the curation tool, **When** `CurationWorkspace` renders, **Then** the dark background is maintained, all dark-surface tokens resolve correctly, and the board shim (which uses `--bg` and `--border-dim`) renders without broken colors.
3. **Given** the global `:root` is now light, **When** any sub-component of `CurationWorkspace` (e.g., `MultiMoveSequencer`, `PredicateChecklist`, `RejectModal`) renders inside the `.dark-surface` wrapper, **Then** it inherits dark tokens correctly and no light-theme bleed is visible.

---

### User Story 3 — No redundant light overrides remain (Priority: P2)

After the global flip, component-level CSS that existed solely to fight the dark global theme is removed. The codebase does not contain `color-scheme: light` overrides or dark-to-light token translations that are now unnecessary.

**Why this priority**: Clean-up is necessary to honor the "flip, then remove overrides" contract. Leaving dead overrides obscures intent and creates confusion for future CSS changes.

**Independent Test**: After the flip, `.modal-card` no longer has `color-scheme: light`. Search for per-component light overrides that were fighting the old dark global and confirm they are absent.

**Acceptance Scenarios**:

1. **Given** the global `color-scheme` is now `light`, **When** a developer inspects `.modal-card` in `index.css`, **Then** the `color-scheme: light` declaration is absent (it is now redundant).
2. **Given** the 7 user-facing files had dark-token references, **When** a developer searches for `--border`, `--surface`, `--surface-2`, `--surface-3`, `--border-dim`, `--text`, `--text-sub`, `--text-muted` in user-facing JSX files, **Then** no uses exist in non-curation component files.

---

### Edge Cases

- What happens if a user-facing component uses `var(--text)` and the token is no longer defined at `:root`? — The value will be unresolved (transparent/inherit), making text invisible. This must be caught by the dark-token sweep before the flip ships.
- What happens to `Board.jsx`'s deprecated `shimStyle()` function that uses `--bg` and `--border-dim`? — It is called exclusively from `CurationWorkspace`, which will be inside `.dark-surface`. The tokens will resolve correctly from `.dark-surface`. No code change to `Board.jsx` is needed.
- What if a user visits `/admin/lessons`? — `AdminLessonsPage` has zero dark-token dependencies and goes light by default without any code change.
- What if a new component is added that uses dark tokens? — Without a `.dark-surface` ancestor, the tokens will be unresolved (fail visibly). This is intentional: the failure mode is obvious, not silent.

## Requirements *(mandatory)*

### Functional Requirements

**index.css — :root block**

- **FR-001**: The `:root` block MUST set `color-scheme: light`.
- **FR-002**: The `:root` block MUST set `color: var(--ink)` (replacing `color: var(--text)`).
- **FR-003**: The `:root` block MUST set `background: #fbf4e8` (replacing `background: #060c14`).
- **FR-004**: The dark token variables (`--bg`, `--surface`, `--surface-2`, `--surface-3`, `--border`, `--border-dim`, `--text`, `--text-sub`, `--text-muted`) MUST be removed from `:root`.

**index.css — body block**

- **FR-005**: The `body` block MUST set `background: #fbf4e8` (replacing `background: #060c14`).
- **FR-006**: The two atmospheric `radial-gradient` lines in the `body` block MUST be removed (dark-themed effect, inappropriate for cream background).

**index.css — #root block**

- **FR-007**: The `#root` block MUST set `background: #fbf4e8` (literal value) replacing `background: var(--bg)`. Do not use `var(--bg-home)` here — use the literal hex so the background is defined even before tokens resolve.

**index.css — h1, h2, h3 rule**

- **FR-008**: The `h1, h2, h3` rule MUST set `color: var(--ink)` (replacing `color: var(--text)`). Failure to update this will cause heading text to be invisible on the light background.

**index.css — .modal-card**

- **FR-009**: The `color-scheme: light` declaration MUST be removed from `.modal-card` (it is redundant once `:root` is light).

**index.css — .dark-surface block**

- **FR-010**: A `.dark-surface` CSS block MUST be added to `index.css` (not `tokens.css`) alongside the dark token definitions being moved there. It MUST declare:
  - `color-scheme: dark`
  - `color: var(--text)`
  - `background: var(--bg)`
  - All 9 dark token variables: `--bg: #0d1520`, `--surface: #162032`, `--surface-2: #1e2d42`, `--surface-3: #253347`, `--border: #2d4060`, `--border-dim: #1a2840`, `--text: #e2eaf5`, `--text-sub: #8ba3c0`, `--text-muted: #4a6480`

**AdminCuratePage — wrapper div**

- **FR-011**: `AdminCuratePage.jsx` MUST wrap its conditional render in `<div className="dark-surface" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>` so both the `CandidateDashboard` branch and the `CurationWorkspace` branch inherit dark tokens. This wrapper div does not currently exist and must be added.
  - The flex sizing is required because `CurationWorkspace` uses `height: 100%` and `CandidateDashboard` uses `minHeight: 100%`, both resolved against the `#root` flex column (`min-height: 100svh`). A bare wrapper div breaks this chain, leaving the dark background covering only content height with cream visible beneath.
  - Note: `CurationWorkspace` and `CandidateDashboard` use `style={page}` (inline style) on their own roots, not `className` — `.dark-surface` is applied on the `AdminCuratePage` wrapper, not on those sub-components.

**Atomicity**

- **FR-012**: The `:root` flip (FR-001–FR-004), the `.dark-surface` block (FR-010), the `AdminCuratePage` wrapper (FR-011), and all 16 user-facing dark-token replacements (FR-013) MUST land in the same commit. Rationale: the `:root` flip removes the 9 dark token definitions, immediately invalidating the 16 remaining dark-token references in user-facing components. Shipping the flip without FR-013 causes invisible text and missing borders on user-facing screens. The curation tool must also never be left with a broken visual state between commits.

**Dark-token sweep — user-facing files**

- **FR-013**: All dark-token references in user-facing JSX files MUST be replaced with their light equivalents per the token map below. There are exactly 16 uses across 7 files:
  - `MistakesGate.jsx`: 1 use
  - `DeepRevealPane.jsx`: 1 use
  - `MistakeDetailScreen.jsx`: 4 uses
    - Special case: one location uses `var(--green)` alongside `var(--border)` in the same ternary — only replace `--border` → `--line`; do NOT touch `var(--green)`.
  - `StatsScreen.jsx`: 2 uses
  - `MistakesListScreen.jsx`: 1 use
  - `ChallengeScreen.jsx`: 4 uses
  - `PastGamesListScreen.jsx`: 3 uses

**Token map (dark → light replacement)**

| Dark token | Value | Light replacement | Value |
|---|---|---|---|
| `--border` | `#2d4060` | `--line` | `#ece7dd` |
| `--border-dim` | `#1a2840` | `--line` | `#ece7dd` |
| `--surface` | `#162032` | `--card` | `#ffffff` |
| `--surface-2` | `#1e2d42` | `--line` | `#ece7dd` |
| `--surface-3` | `#253347` | `--line` | `#ece7dd` |
| `--text` | `#e2eaf5` | `--ink` | `#2b2a28` |
| `--text-sub` | `#8ba3c0` | `--ink-soft` | `#6b6862` |
| `--text-muted` | `#4a6480` | `--ink-faint` | `#a6a299` |
| `--bg` (body/root) | `#0d1520` | `#fbf4e8` (direct) | — |

**Board.jsx — no code change**

- **FR-014**: `Board.jsx`'s deprecated `shimStyle()` function MUST NOT be modified. Its `--bg`/`--border-dim` uses resolve correctly once `CurationWorkspace` renders inside `.dark-surface`. The implementation task is to verify correct rendering, not to change code.

**AdminLessonsPage — no code change**

- **FR-015**: `AdminLessonsPage.jsx` requires no code changes. It has zero dark-token dependencies and goes light by default.

**Existing redundant overrides**

- **FR-016**: Any per-component `color-scheme: light` declarations or dark-to-light token translations that existed solely to fight the old dark global MUST be removed where the new light global default now suffices.

**Architecture doc update**

- **FR-017**: After the atomic commit lands, `docs/architecture/frontend-conventions.md` MUST be updated to reflect the new model: (a) `:root` is now light (`color-scheme: light`, cream background, `--ink` family); (b) `.dark-surface` is the sole home of dark tokens and must be the ancestor of any component using the `--text`/`--surface`/`--border` family; (c) the two-token-system pairing rule is unchanged, but its enforcement point has moved. The stale header comment in `index.css` is refreshed in the atomic commit (Commit 1), not here. `tokens.css` is NOT modified — its pairing-rule comment remains accurate after the flip. This task may land in a separate commit immediately after the atomic commit.

### Key Entities

- **`:root` theme**: The global CSS cascade origin point. After this change it is `color-scheme: light` with cream background and ink text.
- **`.dark-surface`**: A scoped CSS class that re-declares all 9 dark tokens and sets `color-scheme: dark`. Applied exclusively to `AdminCuratePage`'s wrapper div. Acts as a CSS cascade isolation boundary for the curation tool.
- **Dark holdout components**: `AdminCuratePage`, `CandidateDashboard`, `CurationWorkspace`, `MultiMoveSequencer`, `PredicateChecklist`, `RejectModal` — permanently dark. Not a candidate for light migration now or in the future.
- **Token map**: The authoritative mapping from removed dark `:root` tokens to their light-surface equivalents in `tokens.css`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every screen reachable via `screenRegistry.jsx` renders with legible text — no white-on-white or dark-on-dark combinations — when visually inspected after the change.
- **SC-002**: The curation admin tool at `/admin/curate` (both `CandidateDashboard` and `CurationWorkspace` views) is visually indistinguishable from its pre-flip appearance when opened after the change.
- **SC-003**: Zero unexpected references to `--border`, `--border-dim`, `--surface`, `--surface-2`, `--surface-3`, `--text`, `--text-sub`, `--text-muted` exist in user-facing JSX files after the change. The grep MUST explicitly exclude `Board.jsx` and the curation components (`CurationWorkspace`, `CandidateDashboard`, `MultiMoveSequencer`, `PredicateChecklist`, `RejectModal`). The allowed non-zero remainder is exactly 2 uses in `Board.jsx` shimStyle() (`var(--bg)` and `var(--border-dim)`), which resolve correctly via the `.dark-surface` ancestor.
- **SC-004**: Zero references to the removed dark token names exist in `:root` after the change (they live only in `.dark-surface`).
- **SC-005**: The global `:root` CSS block sets `color-scheme: light`, `color: var(--ink)`, and `background: #fbf4e8` after the change.
- **SC-006**: The root flip, `.dark-surface` definition, `AdminCuratePage` wrapper, and all 16 user-facing dark-token replacements (FR-013) all land in a single commit (verified by git log).

## Assumptions

- The light token values (`--ink`, `--ink-soft`, `--ink-faint`, `--card`, `--line`, `--bg-home`, etc.) defined in `tokens.css` are already the correct light replacements for all user-facing surfaces — no new tokens need to be invented.
- `--bg-home: #fbf4e8` already exists in `tokens.css`. `#root` uses the literal `#fbf4e8` directly (not `var(--bg-home)`) so the background is defined before token resolution.
- The curation admin tool components (`CandidateDashboard`, `CurationWorkspace`, etc.) do not need per-component changes; inheriting `.dark-surface` from the `AdminCuratePage` wrapper is sufficient.
- No server-side changes are needed; this is a pure frontend CSS/JSX change.
- No new design tokens need to be defined. All replacements use existing tokens from `tokens.css`.
- The two-token-system pairing rule remains in force after this change: components on dark surfaces (`.dark-surface` descendants) use `--text`/`--surface` family; components on light surfaces use `--ink`/`--card` family. Mixing is still forbidden.
- `AdminLessonsPage` at `/admin/lessons` requires no changes because it has no dark-token dependencies.
- The `screenRegistry.jsx` (not `.js`) file is the canonical registry of all routes to visually verify.

## Not Included

- A dark-mode toggle or user-selectable theme switching.
- A new design language, visual redesign, or restyling of individual components beyond token plumbing.
- Changing Board disc colors (green/gray discs are unchanged).
- Migrating curation admin tools (`AdminCuratePage` and sub-components) to the light theme — this is permanently out of scope.
- Any server, database, or API changes.
- Changes to `Board.jsx` code (only verification needed).
