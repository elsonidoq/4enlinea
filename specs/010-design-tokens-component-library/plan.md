# Implementation Plan: Design Tokens & Component Library (Epic 1a)

**Branch**: `101-new-design` | **Date**: 2026-05-29 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/010-design-tokens-component-library/spec.md`

---

## Summary

Establish the visual foundation of the DecodeC4 redesign by delivering:
1. A single `tokens.css` file with all semantic CSS custom properties and `@keyframes`.
2. Eleven new primitive React components (`Icon`, `StatusBar`, `TopBar`, `ProgressBar`, `Stars`, `Toolbar`, `ToolButton`, `CoachAvatar`, `CoachDialog`, `FeatureCard`, `SetCard`).
3. A fully redesigned `Board` component in-place, switching to the new overlay API and green/gray disc palette. `highlightedCells` is retained as a deprecated curation-only shim prop so `CurationWorkspace.jsx` keeps working without migration.
4. A new `UpgradeModal` component replacing `PaywallModal.jsx`.
5. Caller migrations for all five files that reference the retired game-surface APIs.

No routing, API calls, or screen layout changes are in scope.

---

## Technical Context

**Language/Version**: JavaScript (ES2022), React 18, Vite  
**Primary Dependencies**: React, react-i18next, CSS custom properties  
**Storage**: N/A (component library only)  
**Testing**: Manual verification via app dev server (Constitution §III for UI features)  
**Target Platform**: Mobile-first progressive web app (iOS Safari + Android Chrome)  
**Project Type**: Frontend component library, delivered as in-place file changes  
**Performance Goals**: Drop animation ≤16ms/frame (hardware-accelerated CSS); `bubbleIn` 320ms cubic-bezier  
**Constraints**: No new npm dependencies; no Storybook; component CSS defined only via token variables  
**Scale/Scope**: ~15 new/replaced files; 5 caller migrations; 1 CSS token file

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Principle I — Explanation Engine**: Not triggered. No move evaluation, pattern labels, or LLM annotations in this epic. ✅

**Principle II — Code Quality & Simplicity**:
- No speculative abstractions: each component has a concrete spec requirement.
- `Column.jsx` and `Piece.jsx` are absorbed into the new `Board.jsx` (the column/piece split is an internal implementation detail; callers only see `Board`).
- Inline `style` props are acceptable for component-library primitives where the style is the component's only purpose; CSS modules are not used in this project.
✅

**Principle III — Testing Standards**:
- All five user stories and edge cases listed in the spec MUST be manually verified in the browser before the epic is marked complete.
- No solver-dependent code exists in this epic — integration tests are not required.
✅

**Principle IV — UX Consistency**:
- Overlay types (`tg | td | tr | claim | win`) and badge types (`good | mid | bad`) are locked cross-epic contracts.
- All board visualizations use `--disc-green`/`--disc-gray` only; no hard-coded red or yellow color values.
✅

**Principle V — Performance**:
- All animations are CSS `@keyframes` (GPU-composited). No JS animation libraries.
- `bubbleIn` = 320ms; `drop` = short (~280ms); `slideUp` = 340ms.
✅

**Principle VI — Methodology**:
- All files that reference the retired game-surface APIs are identified before any code is written: `PuzzlesPage.jsx`, `SequenceHandler.jsx`, `CoachPage.jsx`, `DeepRevealButton.jsx`, `PaywallModal.jsx` itself.
- `CurationWorkspace.jsx` is also a Board caller using `highlightedCells` with ~12 curation-specific roles (`z_range`, `hint`, `ghost_mirror`, `wrong_move`, `correct_reveal`, `pattern_piece`, etc.) that have no equivalent in the locked overlay enum. It is explicitly NOT migrated in this epic; Board retains `highlightedCells` as a deprecated shim prop for this caller only. Full migration is deferred to a future curation epic.
- All fields the Board's new API exposes are traced to their consumers in downstream epics (documented in contracts/).
✅

**Principle VII — Software Design**:
- `Board` props are a flat, explicit shape — no nested config objects.
- `Icon` falls back to empty `<svg>` (not an exception) for unrecognised names.
✅

**Principle VIII — Documentation**:
- `docs/architecture/frontend-conventions.md` "Board Component API" section documents the old `highlightedCells`/`highlightMetadata` API. It MUST be updated to document the new `overlays` API as part of this epic.
- The overlay and badge type contracts MUST be written to `contracts/board-api.md` under this spec directory before implementation.
✅ (tasks will include explicit documentation steps)

---

## Project Structure

### Documentation (this feature)

```text
specs/010-design-tokens-component-library/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── board-api.md     # Board overlay + badge type contracts (cross-epic)
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code

```text
connect-four/src/styles/
└── tokens.css                   # NEW — all CSS custom properties + @keyframes

connect-four/src/components/
├── Board.jsx                    # REDESIGNED in-place (absorbs Column + Piece logic)
                                 #   ⚠ `tr` is NOT in the mockup board.jsx overlay comment (tg|td|claim|win);
                                 #   it MUST be added to the overlay dispatch as a fifth case.
                                 #   See contracts/board-api.md and FR-027 for the required visual (red translucent ring).
                                 #   ⚠ Retains `highlightedCells` as a DEPRECATED shim prop for CurationWorkspace.
                                 #   It accepts the old [row, col, role, step?] tuple format and renders using
                                 #   the Piece.jsx highlight logic inlined into Board. Game-surface callers MUST
                                 #   use `overlays` instead. Do not expose `highlightedCells` in the cross-epic
                                 #   contract or use it in any surface outside CurationWorkspace.
├── Icon.jsx                     # NEW
├── StatusBar.jsx                # NEW
├── TopBar.jsx                   # NEW
├── ProgressBar.jsx              # NEW
├── Stars.jsx                    # NEW
├── Toolbar.jsx                  # NEW
├── ToolButton.jsx               # NEW
├── CoachAvatar.jsx              # NEW
├── CoachDialog.jsx              # NEW
                                 #   ⚠ Do NOT copy `.bubble.faded { opacity: .5 }` from the mockup CSS.
                                 #   The authoritative value is opacity: 0.28 (spec edge-case section, line 126).
                                 #   The mockup and spec body both say 0.5; the spec edge-case overrides them.
├── FeatureCard.jsx              # NEW
├── SetCard.jsx                  # NEW
├── UpgradeModal.jsx             # NEW (replaces PaywallModal.jsx)
├── Column.jsx                   # DELETED (logic absorbed into Board.jsx)
├── Piece.jsx                    # DELETED (logic absorbed into Board.jsx)
└── PaywallModal.jsx             # DELETED

connect-four/src/i18n/en.json   # MODIFIED — add upgrade.* + common.*; remove paywall.*

connect-four/src/pages/
├── PuzzlesPage.jsx              # MIGRATED (overlays, selectedCols/onColToggle, UpgradeModal)
                                 #   ⚠ Preserve handleForbiddenSubmit verbatim — do not rewrite it.
                                 #   Only rewire it to call onColToggle instead of mutating highlightedCells.
                                 #   Full surface redesign is deferred to Epic 2b (see spec "Not Included").
└── CoachPage.jsx                # MIGRATED (UpgradeModal)

connect-four/src/components/
├── SequenceHandler.jsx          # MIGRATED (overlays=[], interactionMode="sequence")
└── DeepRevealButton.jsx         # MIGRATED (UpgradeModal)

connect-four/index.html          # ADD Google Fonts preconnect for Baloo 2 + Nunito

docs/architecture/
└── frontend-conventions.md      # UPDATE Board Component API section
```

**Structure Decision**: Single-project layout. All new files go into the existing `connect-four/src/components/` and `connect-four/src/styles/` directories. No new directories are created except `src/styles/`.

---

## Complexity Tracking

No constitution violations require justification.
