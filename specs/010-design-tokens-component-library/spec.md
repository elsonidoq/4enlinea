# Feature Specification: Design Tokens & Component Library (Epic 1a)

**Feature Branch**: `101-new-design`  
**Created**: 2026-05-29  
**Status**: Draft  
**Spec directory**: `specs/010-design-tokens-component-library`

---

## Goal

Establish the visual foundation for the DecodeC4 visual redesign by delivering:

1. A complete CSS design-token set that every downstream epic can import without modification.
2. A set of shared React primitive components (Icon, TopBar, ProgressBar, etc.) that every surface uses identically.
3. A fully redesigned interactive `Board` component — the core game canvas — preserving existing functional behaviours (sequence play, multi-select) while switching to the new green/gray disc palette.
4. Coach avatar and chat-feed components.
5. `FeatureCard`, `SetCard`, and `UpgradeModal` card/modal components.
6. Retirement of `PaywallModal.jsx` and all Stripe-redirect paths behind locked features.

The deliverable is a **component library only** — no screen routing, no API calls, no per-surface background application.

---

## Locked Cross-Epic Contracts

These two enums must appear in code exactly as specified. Downstream epics 2a/2b/3b/3c/4 consume them directly.

**Board overlay types** (prop name `overlays[].type`):
```
tg | td | tr | claim | win
```

**Column badge types** (prop name `badge.type`):
```
good | mid | bad
```

---

## User Scenarios & Testing

### User Story 1 — Developer integrates `Board` into a surface (Priority: P1)

A developer building a challenge screen imports `Board`, passes `board` (row-major 2D array of `'red'`/`'yellow'`/`'empty'`), `overlays`, and `onColumnClick`, and gets a fully rendered, interactive 7×6 grid with green/gray discs, hover arrows, overlay highlights, and an animated drop — without writing any board CSS.

**Why this priority**: Every downstream epic (2a, 2b, 3a, 3b, 3c, 4) renders a `Board`; it is the most critical dependency.

**Independent Test**: Render `Board` with a representative `board` array containing `'red'` and `'yellow'` discs, one overlay of each type, and `onColumnClick` wired. Verify green/gray discs, chevD hover arrow, overlay rings, and the `win` pulse animation.

**Acceptance Scenarios**:

1. **Given** a `board` array with discs in several cells, `overlays=[{c:2,r:3,type:'tg'}]`, and `canPlay=true`, **When** the Board renders, **Then** column 2 row 3 shows a green translucent ring overlay; all other cells show no overlay; hovering over any non-full column shows a green chevD arrow.
2. **Given** `lastDrop={c:3, r:0}`, **When** the Board renders, **Then** the disc at col 3 row 0 has the `drop` animation CSS class applied to it.
3. **Given** `overlays=[{c:1,r:2,type:'win'}]`, **When** the Board renders, **Then** the win-line element at that cell pulses with the green ring animation.
4. **Given** `fullCols=[4]` and `canPlay=true`, **When** column 4 is tapped, **Then** the tap is ignored and no `onColumnClick` call fires.
5. **Given** `badge={col:2, type:'good', label:'✓'}`, **When** the Board renders, **Then** a circular green badge labelled '✓' appears above column 2.

---

### User Story 2 — Developer builds multi-select (Forbidden Columns) puzzle (Priority: P2)

A developer building the Forbidden Columns puzzle type imports `Board` and uses `selectedCols` + `onColToggle` to let the user tag columns as forbidden (red tint + ✕ badge) without writing any board mutation logic.

**Why this priority**: Forbidden Columns is part of Epic 2b; the Board must export this interaction in a single prop pair so the surface layer contains zero board-internal state.

**Independent Test**: Render `Board` with `selectedCols=[2,5]`, `onColToggle` wired to a state setter, and `canPlay=true`. Verify columns 2 and 5 show red tint with ✕ badge; tapping column 3 calls `onColToggle(3)`; tapping column 2 again calls `onColToggle(2)` (untoggle).

**Acceptance Scenarios**:

1. **Given** `selectedCols=[1,3]`, **When** the Board renders, **Then** columns 1 and 3 display a red tint and a ✕ badge; all other columns show no forbidden styling.
2. **Given** `selectedCols=[]` and `onColToggle` wired, **When** the user taps column 2, **Then** `onColToggle(2)` is called exactly once.

---

### User Story 3 — Developer preserves sequence-mode play (Priority: P2)

A developer building the `forced_win` challenge screen passes `interactionMode='sequence'` and `canPlay=true`, and sees that the Board's tap behaviour drives a multi-move forcing line exactly as it did in `PuzzlesPage.jsx` — no behaviour regression.

**Why this priority**: `forced_win` is a free challenge set; collapsing its multi-move interaction to single-move would break an existing feature.

**Independent Test**: Render Board in sequence mode with an initial `board` state and `canPlay=true`. Play moves alternating player/engine turns, verifying the board state advances correctly through the forcing line. The component must not prevent additional taps after the first move.

**Acceptance Scenarios**:

1. **Given** `interactionMode='sequence'` and an ongoing forcing line, **When** the user taps a column, **Then** `onColumn(c)` is called; after the engine response is applied externally, tapping again calls `onColumn` for the next move (the Board does not lock after move 1).

---

### User Story 4 — Locked feature shows UpgradeModal, not Stripe redirect (Priority: P1)

A user taps any Pro-gated feature. The `UpgradeModal` sheet slides in showing a waitlist email input and "Notify me" button. No Stripe checkout is initiated anywhere in the app.

**Why this priority**: All three existing importers of `PaywallModal.jsx` (`PuzzlesPage.jsx`, `CoachPage.jsx`, `DeepRevealButton.jsx`) currently hold a live Stripe redirect path. Leaving even one swapped is a live bug in production.

**Independent Test**: Import `UpgradeModal` in isolation; verify it renders icon + heading + email input + "Notify me" button + dismiss. Grep codebase for `PaywallModal` imports — zero matches expected after the task is complete.

**Acceptance Scenarios**:

1. **Given** the user taps a Pro-gated feature, **When** the `UpgradeModal` opens, **Then** it displays an email input, a "Notify me" CTA, and a dismiss control; no Stripe checkout URL is generated.
2. **Given** `PaywallModal.jsx` has been retired, **When** a developer searches the codebase for `PaywallModal` imports, **Then** zero results are found.
3. **Given** the user submits their email in `UpgradeModal`, **When** the "Notify me" button is tapped, **Then** `onNotify(email)` is called, the modal shows a confirmation state, and no network call to `/api/stripe/*` is made. Analytics tracking (`waitlist_submitted`) is the caller's responsibility, not the modal's.

---

### User Story 5 — Coach dialog animates a new message (Priority: P3)

After a move, the surface appends a new message to `CoachDialog`'s `messages` prop. The new bubble slides in from below and old bubbles scroll upward.

**Why this priority**: Coach feedback is present on every interactive surface; the animation quality affects perceived polish throughout the app.

**Independent Test**: Render `CoachDialog` with two messages; add a third; verify the `.bubbleIn` animation fires on the new bubble and the feed scrolls to show it.

**Acceptance Scenarios**:

1. **Given** `CoachDialog` with two messages, **When** a third message is appended, **Then** the third bubble animates in with `bubbleIn` (translateY 8 px → 0) and is visible at the bottom of the feed.
2. **Given** `fixed=true`, **When** `CoachDialog` renders, **Then** the feed uses the frosted-glass `.fixed-feed` variant (semi-transparent background, blur).

---

### Edge Cases

- **IF** every row in column `c` is non-empty (column full) or `fullCols` contains `c`, **THEN** tapping column `c` MUST NOT call `onColumnClick` or `onColToggle`, and no hover chevD arrow MUST render above it.
- **IF** `overlays` is empty or absent, **THEN** the Board renders with no overlay elements in the DOM.
- **IF** `badge` prop is absent, **THEN** no badge element renders above any column.
- **IF** a `CoachDialog` message has `faded: true`, **THEN** that bubble renders at `opacity: 0.28` (matching the faded style).
- **IF** the `UpgradeModal` email field is empty, **THEN** the "Notify me" button MUST be disabled; no `onNotify` call fires.
- **IF** `Stars` receives `n=0`, **THEN** all `total` stars render at `opacity: 0.28`.
- **IF** `Stars` receives `n > total`, **THEN** all `total` stars render at full opacity (clamped).
- **IF** `Icon` receives an unrecognised `name`, **THEN** it renders an empty `<svg>` without throwing.
- **IF** two `CoachDialog` messages share identical `text` content, **THEN** each MUST still receive a distinct React `key` so that a genuinely new message triggers the `bubbleIn` animation. Message keys MUST NOT be derived from `text` content; use insertion index or a caller-supplied `id` field.

---

## Requirements

### Functional Requirements

**Design Tokens**

- **FR-001**: The CSS file MUST define all semantic color tokens: `--disc-green (#2faa5a)`, `--disc-green-hi (#43c673)`, `--disc-gray (#3c4250)`, `--disc-gray-hi (#525a6b)`, `--eval-good (#2bb462)`, `--eval-good-bg (#e3f7ea)`, `--eval-mid (#f5a623)`, `--eval-mid-bg (#fdf0d9)`, `--eval-bad (#e8543e)`, `--eval-bad-bg (#fbe4df)`.
- **FR-002**: The CSS file MUST define board-specific tokens: `--board (#ecd9ad)`, `--board-edge (#d9c089)`, `--hole (#fbf4e3)`, `--hole-in (#efe3c7)`.
- **FR-003**: The CSS file MUST define threat/overlay tokens: `--threat-green (rgba 47,170,90,0.30)`, `--threat-gray (rgba 60,66,80,0.26)`, `--claim (rgba 245,166,35,0.40)`.
- **FR-004**: The CSS file MUST define locked-state tokens: `--lock (#c7c2b8)`, `--lock-bg (#efece6)`.
- **FR-005**: The CSS file MUST define per-surface tint tokens: `--bg-home (#fbf4e8)`, `--bg-lessons (#e8f0fb)`, `--bg-chal (#fdeede)`, `--bg-spar (#efe9fb)`. *(Note: `epics.md` prose uses longer forms like `--bg-challenges`; the authoritative abbreviated names are those in the mockup `styles.css` and listed here. Downstream epics MUST use these exact token names.)*
- **FR-006**: The CSS file MUST define typography tokens: `--font-display ('Baloo 2', system-ui, sans-serif)` and `--font-body ('Nunito', system-ui, sans-serif)`.
- **FR-007**: The CSS file MUST define layout tokens: `--radius (22px)`, `--radius-sm (14px)`, `--shadow`, `--shadow-sm`.
- **FR-008**: The CSS file MUST declare `@keyframes` for: `drop` (disc fall — used by `Board`), `pulse` (win ring — used by `Board` win overlay), `bubbleIn` (chat bubble slide-in — used by `CoachDialog`), `spin` (loading spinner), `popIn` (modal entrance — used by `UpgradeModal`), `slideUp` (bottom sheet — used by `UpgradeModal`), `fade` (overlay backdrop — used by `UpgradeModal`), `ring` (saga pulse ring — defined here for completeness; consumed by Epic 4 Saga Map node).

**Icon Component**

- **FR-009**: `Icon` MUST render one of the following named SVG icons (stroke style, `fill:none`, `strokeLinecap:round`, `strokeLinejoin:round`): `back`, `chevR`, `chevL`, `chevD`, `gear`, `user`, `bulb`, `undo`, `flag`, `lock`, `check`, `star`, `arrowUp`, `play`, `search`, `retry`, `grad`, `target`, `swords`, `chart`.
- **FR-010**: `Icon` MUST accept `size` (default 22), `color` (default `currentColor`), and `strokeWidth` (default 2.4) props.

**StatusBar**

- **FR-011**: `StatusBar` MUST render time string (left), signal bars (4-bar), Wi-Fi arc, and battery pill (right).
- **FR-012**: `StatusBar` MUST accept a `time` prop (default `"9:41"`).

**TopBar**

- **FR-013**: ~~`TopBar` MUST render: optional back button (left), title (Baloo 2 700 19 px), spacer, optional meta string (right), up to two right icon buttons.~~ **(Amended by spec 043 FR-017/FR-018, NFR-001)**: `TopBar` MUST render: optional back button (left), **a persistent DecodeC4 logo mark (left, after the back button, before the title)**, optional title (Baloo 2 700 19 px), spacer, optional meta string (right), up to two right icon buttons. The logo renders unconditionally on every screen regardless of whether `title` is provided. Render order: `[back button?] [logo] [title?] [spacer] [meta?] [right2?] [rightIcon?]`.
- **FR-014**: ~~`TopBar` MUST accept: `title`, `onBack`, `meta`, `rightIcon`/`onRight`, `right2`/`onRight2` props; back button only renders when `onBack` is provided.~~ **(Amended by spec 043 FR-017/FR-018, NFR-001)**: `TopBar` MUST accept: `title` (now explicitly optional — omitting it renders no title text), `onBack`, `meta`, `rightIcon`/`onRight`, `right2`/`onRight2`, **and `onLogoClick` (new, spec 043 FR-018)** props; back button only renders when `onBack` is provided; the logo is always rendered and always calls `onLogoClick` when tapped. **Exception (spec 043 FR-019)**: the Home screen's `TopBar` call omits `title` by convention, so the DecodeC4 mark appears exactly once on Home; every other screen's existing `title` usage is unchanged. Every existing `<TopBar title={...} onBack={...} .../>` call site keeps working unchanged — all new behavior is additive.

**ProgressBar**

- **FR-015**: `ProgressBar` MUST render a filled green horizontal strip. It MUST accept either `{ value, max }` or `{ pct }` to compute fill width; the `pct` prop takes precedence.

**Stars**

- **FR-016**: `Stars` MUST render `total` (default 3) star glyphs; stars with index `< n` render at full opacity, the rest at `opacity: 0.28`.

**Toolbar / ToolButton**

- **FR-017**: `Toolbar` MUST render a fixed-bottom row with frosted-glass background (semi-transparent white, blur), top border, and horizontal flex layout.
- **FR-018**: `ToolButton` MUST render an icon above a label; `color` prop overrides icon color.

**CoachAvatar**

- **FR-019**: `CoachAvatar` MUST render an SVG cartoon figure (bearded, glasses, teal sweater) in one of three `mood` states: `happy` (smile), `think` (flat mouth), `oops` (downturned eyes + open mouth). Default mood is `happy`.
- **FR-020**: `CoachAvatar` MUST accept a `size` prop (default 58); the SVG scales proportionally.

**CoachDialog**

- **FR-021**: `CoachDialog` MUST render `CoachAvatar` on the left and a vertical stack of bubbles on the right. The avatar mood is derived from the last message's `mood` field. The feed has a fixed visual window (approximately 2 bubbles tall); it scrolls internally to keep the latest bubble visible. The caller is responsible for trimming the `messages` array; the component renders all entries it receives.
- **FR-022**: Each message object in the `messages` array MUST support the following fields: `text` (string, required), `faded` (bool, optional — renders bubble at `opacity: 0.28`; see Edge Cases), `lead` (string, optional — bold display-font line above `text`), `evalNum` (string, optional — float-right chip showing a score or label), `mood` (optional, one of `'happy' | 'think' | 'oops'`, default `'happy'` — controls the avatar expression for that message; the avatar adopts the mood of the last message in the array).
- **FR-023**: Each new bubble MUST animate in using `bubbleIn` (translateY 8 px → 0, 320 ms cubic-bezier).
- **FR-024**: When `fixed=true`, the feed MUST use the frosted-glass `.fixed-feed` style (semi-transparent white background, border-radius 18 px, backdrop-blur).

**Board**

- **FR-025**: `Board` MUST render a 7-column × 6-row grid. The `board` prop uses the existing row-major encoding (`board[row][col]`, values `'red'` | `'yellow'` | `'empty'`); the player-1/player-2 semantic labels are preserved. Only the visual rendering changes: `'red'` entries MUST render as green discs (`--disc-green`) and `'yellow'` entries MUST render as dark-gray discs (`--disc-gray`). No CSS color values for red or yellow MAY be used for discs.
- **FR-026**: `Board` MUST accept the following props:
  - `board`: row-major 2D array `board[row][col]` (row 0 = bottom, row 5 = top; col 0 = leftmost). Values: `'red'` (player 1, renders green), `'yellow'` (player 2, renders dark-gray), `'empty'`. **Preserved from existing API — no caller migration required for this prop.**
  - `onColumnClick(col)`: column tap handler. **Preserved from existing API — no caller migration required for this prop.**
  - `canPlay`: bool — global flag; when `false`, no column is interactive. **Preserved from existing API — no caller migration required for this prop.**
  - `overlays`: array of `{c, r, type}` objects (see FR-027 for locked types). Defaults to `[]`. **Replaces `highlightedCells` + `highlightMetadata`** — this is the only breaking API change. Both callers that pass these removed props (`PuzzlesPage.jsx` and `SequenceHandler.jsx`) MUST be migrated within this epic (see FR-044).
  - `badge`: `{col, type, label}` — a **single** evaluation badge above one column. Singular by design: marks the column just played in standard single-move feedback. Multi-column post-submit feedback in Forbidden Columns uses `overlays` and `selectedCols`, not multiple badge objects.
  - `lastDrop`: `{c, r}` — the cell that just received a disc; triggers the `drop` animation.
  - `compact`: bool — reduced padding/gap mode for post-game review.
  - `fullCols`: array of column indices blocked from tapping regardless of `canPlay`.
- **FR-027**: **Overlay types are locked** (consumed by Epics 2a/2b/3b/3c/4 — do not rename):
  - `tg` = green translucent ring (current-player threat highlight)
  - `td` = gray translucent ring (opponent threat highlight)
  - `tr` = red translucent ring (marks the column the user last played; used by Position Explorer in Epic 3b and by any surface that needs to highlight the user's committed move)
  - `claim` = amber translucent fill (claimeven cell)
  - `win` = pulsing green outline (winning-line flash)
  No other `type` values are valid.
- **FR-028**: **Column badge types are locked**: `good` = green background + ✓, `mid` = amber background + ?, `bad` = red background + ✕. The `label` prop carries the glyph; the `type` prop sets the background color.
- **FR-029**: When `canPlay=true` and a column is not full, tapping that column MUST call `onColumnClick(col)`. A green chevD arrow MUST appear on hover above that column. When `fullCols` includes a column index, or `canPlay=false`, that column MUST NOT be tappable and no arrow renders.
- **FR-030**: When `lastDrop={c, r}` is provided, the disc at that cell MUST play the `drop` CSS animation (class `disc drop`) on render.
- **FR-031**: `Board` MUST accept `compact` prop; in compact mode, padding and gap between cells shrink (9 px / 6 px vs 11 px / 7 px).

**Board — Column Multi-Select Mode**

- **FR-032**: `Board` MUST accept `selectedCols` (array of column indices, defaults to `[]`) and `onColToggle(col)` handler props. **IF `onColToggle` is provided**, the Board enters multi-select mode regardless of `selectedCols` value. **IF `onColToggle` is absent**, multi-select mode is inactive even if `selectedCols` is non-empty. The existing `handleForbiddenSubmit` logic in `PuzzlesPage.jsx` (toggle set, parallel per-column check, exact-match scoring, missed-column reveal, opponent-threat overlay) is the reference implementation for how the surface drives this prop pair; it MUST be ported into the redesigned surface, not rewritten.
- **FR-033**: In multi-select mode, columns whose index appears in `selectedCols` MUST display a red tint and a ✕ badge. Tapping any column MUST call `onColToggle(col)`; the `onColumnClick` tap-to-play behaviour is suspended.
- **FR-034**: The multi-select mode and the single-tap-play mode are mutually exclusive: if `onColToggle` is provided, `onColumnClick` tap-to-play MUST NOT fire.

**Board — Sequence Mode**

- **FR-035**: `Board` MUST accept an `interactionMode` prop. When `interactionMode === 'sequence'`, the Board MUST NOT lock after the first tap; every tap calls `onColumnClick(col)` as long as `canPlay=true` and the column is not full. This preserves the existing `forced_win` multi-move interaction from `PuzzlesPage.jsx:507`.

**FeatureCard**

- **FR-036**: `FeatureCard` MUST render: a square icon container (52 × 52 px, 15 px border-radius), an `h3` title (Baloo 2 700 19 px), and a `p` subtitle (13 px ink-soft). It MUST accept `icon`, `title`, `subtitle`, `onClick`, and an optional `badge` slot.
- **FR-037**: `FeatureCard` MUST support a wide (full-width) and a square variant; layout is controlled by a `wide` prop.

**SetCard**

- **FR-038**: `SetCard` MUST render: `Stars` (difficulty), title (Baloo 2 700 16 px), position-count meta string, and a lock icon in the locked variant.
- **FR-039**: `SetCard` MUST accept a `locked` prop; when `locked=true`, the card uses `--lock-bg` background, title color dims to `--ink-faint`, and a padlock icon is shown.

**UpgradeModal**

- **FR-040**: `UpgradeModal` MUST render as a bottom sheet overlay with: a grab handle, an icon, a heading, a waitlist email input, a "Notify me" CTA, and a dismiss control. No Stripe checkout is initiated.
- **FR-041**: `UpgradeModal` MUST accept `onDismiss` and `onNotify(email)` props. Tapping dismiss calls `onDismiss`. **IF** the email field is non-empty and "Notify me" is tapped, **THEN** `onNotify(email)` is called and the modal shows a confirmation state ("Thanks — we'll let you know!"). **IF** `onNotify` throws or returns a rejected Promise, **THEN** the modal MUST remain open and display an error cue; the CTA MUST be re-enabled. **IF** the email field is empty, **THEN** the "Notify me" button MUST be disabled (not merely visually suppressed).
- **FR-042**: After this epic, no `PaywallModal` import MUST remain anywhere in the codebase, and no `POST /api/stripe/*` call MUST be reachable from any locked-feature path. *(Implementation note for the plan: three importers currently hold the Stripe path — `PuzzlesPage.jsx`, `CoachPage.jsx`, `DeepRevealButton.jsx`. All three must swap to `UpgradeModal`. `PaywallModal.jsx` must be deleted. DeepRevealButton is reused in Epic 2b, so leaving its import in place would reintroduce a live Stripe path on the Challenges surface.)*

**Caller Migration**

- **FR-044**: As part of this epic, the two existing callers of `Board` that pass the removed props MUST be migrated:
  - `PuzzlesPage.jsx`: replace `highlightedCells` + `highlightMetadata` with `overlays`; replace the `forbidden_columns` `'selected'`-role highlight pattern with `selectedCols={Array.from(selectedForbiddenCols)}` + `onColToggle`; remove the forbidden-columns toggle branch from `handleColumnClick` (it moves into the `onColToggle` callback).
  - `SequenceHandler.jsx`: replace `highlightedCells={[]}` with `overlays={[]}`; add `interactionMode="sequence"` prop.
  - `CurationWorkspace.jsx` also passes `highlightedCells` to `Board`, but is explicitly NOT migrated in this epic. It uses ~12 curation-specific roles (`z_range`, `hint`, `ghost_mirror`, `wrong_move`, `correct_reveal`, `pattern_piece`, etc.) that have no equivalent in the locked overlay enum. `Board` retains `highlightedCells` as a deprecated shim prop for this caller only; migration is deferred to a future curation epic.
- **FR-045**: All three existing importers of `PaywallModal.jsx` (`PuzzlesPage.jsx`, `CoachPage.jsx`, `DeepRevealButton.jsx`) MUST be updated to import and render `UpgradeModal` instead. Each must switch from the `isOpen`-controlled pattern to conditional render (mount/unmount). The `trigger` and `session` props are dropped; an `onNotify` stub (no-op until Epic 7) must be wired.

**i18n**

- **FR-043**: All user-facing strings in `UpgradeModal` and any other new component that renders static non-prop text MUST be defined as i18n keys in `en.json`, following the namespace convention in `docs/mvp/epics.md` (`upgrade.*` for modal copy, `common.*` for shared labels). Primitive components (`Icon`, `StatusBar`, `TopBar`, `ProgressBar`, `Stars`, `Toolbar`, `ToolButton`, `CoachAvatar`, `CoachDialog`, `FeatureCard`, `SetCard`) are content-agnostic — they render only what callers pass via props, so no i18n keys are required in the component files themselves. The existing `paywall.*` keys in `en.json` MUST be removed when `PaywallModal.jsx` is deleted.

---

### Key Entities

- **Design token file** (`src/styles/tokens.css` or equivalent): the single source of truth for all CSS custom properties listed above. Imported once at app root.
- **`Board` component** (`src/components/Board.jsx`): the redesigned game grid; replaces the existing `Board.jsx` in-place.
- **`UpgradeModal` component** (`src/components/UpgradeModal.jsx`): replaces `PaywallModal.jsx`; imported by PuzzlesPage, CoachPage, DeepRevealButton.
- **Primitive components** (`src/components/`): `Icon`, `StatusBar`, `TopBar`, `ProgressBar`, `Stars`, `Toolbar`, `ToolButton`, `CoachAvatar`, `CoachDialog`, `FeatureCard`, `SetCard`.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: A standalone render test imports `Board` from a single path, passes a representative `cols` spec, `overlays`, and `onColumn`, and produces a rendered 7×6 grid with no board-internal CSS defined outside the shared token/component files. No other file in the codebase defines board cell or disc colors.
- **SC-002**: Zero occurrences of `PaywallModal` imports remain in the codebase after this epic is merged.
- **SC-003**: Zero occurrences of Stripe checkout calls (`/api/stripe/*`) are reachable from the three updated importers (`PuzzlesPage.jsx`, `CoachPage.jsx`, `DeepRevealButton.jsx`).
- **SC-004**: A grep of the `Board` component source finds zero hard-coded red or yellow color values (hex or CSS variable names for red/orange/yellow disc colors); all disc colors reference `--disc-green` or `--disc-gray`. A manual visual check confirms no red/yellow discs render on the board.
- **SC-005**: The forced_win sequence-play path (routed through `SequenceHandler.jsx`) continues to function after the Board redesign — verified by playing through a three-move forcing line in the UI. `SequenceHandler` has been migrated to `overlays={[]}` + `interactionMode="sequence"`; it passes no `highlightedCells` or `highlightMetadata` props.
- **SC-006**: The Forbidden Columns multi-select path (toggle, submit, reveal) continues to function correctly after the Board redesign — verified by toggling two columns and confirming `onColToggle` fires for each.
- **SC-007**: All user-facing strings in `UpgradeModal` render through `t('...')` keys; no hardcoded English text appears in the component source.
- **SC-008**: A grep of the codebase for `highlightedCells` and `highlightMetadata` returns zero results after this epic is merged — confirming both `PuzzlesPage.jsx` and `SequenceHandler.jsx` have completed the `overlays` migration and no stale prop references remain.

---

## Assumptions

- The existing `Board.jsx` and `PaywallModal.jsx` files are overwritten/replaced, not kept alongside the new components. No backwards-compat re-exports.
- The sequence-play logic (move ordering, engine response) lives in `PuzzlesPage.jsx`, not inside `Board`; the Board only exposes `onColumn` and `interactionMode`.
- `UpgradeModal`'s `onNotify` handler does not call any backend endpoint in this epic — the actual waitlist-capture POST is wired in Epic 7.

---

## Clarifications

### Session 2026-05-29

- Q: Should updating existing Board callers to the new prop shape be in scope of this epic? → A: No — preserve existing `board[row][col]` / `'red'`/`'yellow'`/`'empty'` encoding and `onColumnClick` handler; only change visual rendering (green/dark-gray) and replace `highlightedCells`/`highlightMetadata` with `overlays` (strictly necessary for cross-epic type contracts). No caller migration required.
- Q: What is CoachDialog's overflow behaviour when messages accumulate? → A: Fixed visual window (~2 bubbles); internal scroll to latest; caller manages array trimming.

---

## Not Included

- Screen routing or navigation logic (Epic 1b).
- Per-surface background tint application (Epic 1b — applied at screen level, not in tokens file).
- Any API calls or server-side changes.
- Auth modal reskin (Epic 7).
- Actual lesson/challenge/sparring screen layouts (Epics 2a, 2b, 3a, 4). *(Note: `PuzzlesPage.jsx` and `SequenceHandler.jsx` are migrated in this epic only to the extent required to keep the app working after the Board API change — full surface redesigns are deferred to their respective epics.)*
- The waitlist POST endpoint (Epic 7).
- Settings screen (post-MVP).
- Hint column-score numeric row (intentionally excluded per epics.md cross-cutting Hints rule — mockup divergence).
- Analytics instrumentation (`track('waitlist_submitted', ...)`) — this is the caller surface's responsibility, not `UpgradeModal`'s.
- Storybook or dedicated component-catalogue tooling — developers verify via the app dev server.
