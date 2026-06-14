# Research: Design Tokens & Component Library (Epic 1a)

All unknowns are resolved. No external research was required — the project mockup at
`docs/mvp/mockup/project/` provides complete, self-consistent references for every
design decision in this epic.

---

## Token values

**Decision**: Use the exact values from `docs/mvp/mockup/project/styles.css`.  
**Rationale**: The mockup CSS is the authoritative design source; duplicating values would create drift.  
**Alternatives considered**: Extracting from Figma — not applicable (no Figma file exists).

All token values are specified verbatim in the spec (FR-001 through FR-008) and in
`styles.css`. No ambiguity remains.

---

## Component implementations

**Decision**: Port component implementations directly from the mockup files:
- `Icon`, `StatusBar`, `TopBar`, `ProgressBar`, `Toolbar`, `ToolButton`, `Stars` — from `primitives.jsx`
- `CoachAvatar`, `CoachDialog` — from `coach.jsx`
- `Board` — from `board.jsx` (adapted to `board[row][col]` encoding and existing prop names)
- `FeatureCard`, `SetCard` — CSS in `styles.css`; JSX from `screens_home.jsx` / `screens_challenges.jsx`

**Rationale**: The mockup was designed specifically for this product. Porting is correct by definition.  
**Alternatives considered**: Redesigning from scratch — would introduce drift from the approved visual design.

---

## Board encoding adapter

**Decision**: The new `Board` accepts `board[row][col]` with `'red'`/`'yellow'`/`'empty'` (existing encoding)
and maps internally: `'red'` → green disc (`--disc-green`), `'yellow'` → dark-gray disc (`--disc-gray`).
The mockup `board.jsx` uses a column-first `cols` array with `'g'`/`'d'` values; the adapter transposes on render.

**Rationale**: Preserving the existing `board[row][col]` encoding avoids migrating all callers (spec FR-025/FR-026 explicitly requires this).  
**Alternatives considered**: Switching to column-first — would require migrating `PuzzlesPage`, `SequenceHandler`, all test fixtures.

---

## Column.jsx + Piece.jsx disposition

**Decision**: Both files are deleted; their logic is absorbed into the new `Board.jsx`.  
**Rationale**: The new Board design has no direct callers of `Column` or `Piece` outside `Board`; keeping them as separate files adds indirection without benefit (Constitution §II: flat is better than nested).  
**Alternatives considered**: Keeping them as internal sub-components — they are already internal; the file split is not required.

---

## CSS delivery

**Decision**: All tokens go into `connect-four/src/styles/tokens.css`, imported once in `main.jsx`.
Component-specific styles are inline `style` props (matching existing project convention in `Piece.jsx`, `Column.jsx`).  
**Rationale**: The project uses no CSS modules or Tailwind; inline styles are the established pattern for component-level CSS. Global tokens (custom properties) go in a CSS file because they must be reachable from inline `var(--token)` references.  
**Alternatives considered**: CSS modules — not used anywhere else in the project; introducing them here would violate §II (no speculative abstractions).

---

## UpgradeModal pattern

**Decision**: Bottom-sheet modal (CSS `.sheet` + `.sheet-backdrop`) using `slideUp` animation.
Email input + "Notify me" CTA + confirmation state; no Stripe calls.  
**Rationale**: Matches the mockup `screens_challenges.jsx` locked-set sheet pattern. Spec FR-040 through FR-042.  
**Alternatives considered**: Centered modal (popIn) — used for inline cards in mockup, not for upgrade prompts.

---

## i18n namespaces

**Decision**: `upgrade.*` for all UpgradeModal copy; `common.*` for shared labels (e.g., dismiss, confirm).
Existing `paywall.*` keys removed when `PaywallModal.jsx` is deleted.  
**Rationale**: Spec FR-043 + epics.md cross-cutting i18n convention.  
**Alternatives considered**: Reusing `paywall.*` — explicitly prohibited by spec.

---

## No NEEDS CLARIFICATION items remain.
