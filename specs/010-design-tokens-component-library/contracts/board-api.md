# Board Component API Contract

**Established**: Epic 1a (spec 010)  
**Consumers**: Epics 2a, 2b, 3a, 3b, 3c, 4  
**Status**: Locked — do not rename or add values without a cross-epic amendment

---

## Props

### `board` — 2D array (row-major)

```
board[row][col]   row 0 = bottom, row 5 = top; col 0 = leftmost
Values: 'empty' | 'red' | 'yellow'
```

`'red'` renders as a green disc (`--disc-green`); `'yellow'` renders as a dark-gray disc (`--disc-gray`).
These internal value names are preserved from the previous Board API — no caller migration required.

### `onColumnClick(col: number)` — tap handler

Called with 0-indexed column. Not called when `canPlay=false`, column is full, or `onColToggle` is provided.

### `canPlay: boolean` — global interactivity flag

When `false`, no column is interactive.

### `overlays: Array<{c: number, r: number, type: OverlayType}>` — cell overlays

Defaults to `[]`. Replaces the retired `highlightedCells` + `highlightMetadata` props.

#### OverlayType enum (LOCKED)

| Value | Visual | Usage |
|-------|--------|-------|
| `tg` | green translucent ring | current-player threat highlight |
| `td` | gray translucent ring | opponent threat highlight |
| `tr` | red translucent ring | user's last committed column (used by Position Explorer, Epic 3b) |
| `claim` | amber translucent fill | claimeven cell |
| `win` | pulsing green outline | winning-line flash |

No other values are valid. Do not add values without updating all consuming epics.

### `badge: {col: number, type: BadgeType, label: string}` — single column badge

Optional. Renders one evaluation badge above the specified column.

#### BadgeType enum (LOCKED)

| Value | Background color | Default glyph |
|-------|-----------------|---------------|
| `good` | `--eval-good` (green) | ✓ |
| `mid` | `--eval-mid` (amber) | ? |
| `bad` | `--eval-bad` (red) | ✕ |

The `label` prop carries the displayed glyph; `type` sets only the background color.
Singular by design — only one column receives a badge at a time.

### `lastDrop: {c: number, r: number}` — drop animation trigger

When provided, the disc at `(c, r)` gets the `drop` CSS class (plays the `drop` @keyframe).

### `compact: boolean` — reduced padding mode

`true` → 9px padding / 6px gap. `false` (default) → 11px padding / 7px gap.
Used by post-game review surfaces.

### `fullCols: Array<number>` — blocked columns

Columns whose index appears here are treated as full regardless of board state.
No arrow renders above them; tapping them is a no-op.

### `selectedCols: Array<number>` — multi-select (forbidden columns) mode

Columns in this list display a red tint and a ✕ badge.
**Multi-select mode is active if and only if `onColToggle` is provided.**

### `onColToggle(col: number)` — multi-select tap handler

When provided: every tap calls `onColToggle(col)`; `onColumnClick` tap-to-play is suspended.
When absent: multi-select mode is inactive.

### `interactionMode: 'single_move' | 'sequence'` — tap locking behaviour

`'single_move'` (default): standard single-tap-play (Board does not internally lock after a move; the surface controls `canPlay`).
`'sequence'`: Board never self-locks; every tap calls `onColumnClick` as long as `canPlay=true` and the column is not full. Required for `forced_win` multi-move challenge type.

---

## Deprecated prop (curation shim — do not use in game surfaces)

### `highlightedCells: Array<[row, col, role, step?]>` — legacy curation highlight

Retained solely to keep `CurationWorkspace.jsx` functional without migration. Accepts the old tuple format used by `Piece.jsx` and renders curation-specific roles (`z_range`, `hint`, `ghost_mirror`, `wrong_move`, `correct_reveal`, `pattern_piece`, `figure7_threat`, etc.).

**Do not use this prop in any game-surface component.** It is invisible to downstream epics and will be removed when CurationWorkspace is redesigned.

`highlightMetadata` (capsule/cells variant) is fully retired — no shim is provided. No caller other than `PuzzlesPage.jsx` and `SequenceHandler.jsx` used it, and both are migrated to `overlays` in this epic.

---

## Props migrated in Epic 1a

| Old prop | Status | Replacement |
|----------|--------|-------------|
| `highlightedCells` | **Shim retained** for `CurationWorkspace.jsx` only | `overlays` for all other callers |
| `highlightMetadata` | **Retired** — no shim | `overlays` |

Game-surface callers migrated: `PuzzlesPage.jsx`, `SequenceHandler.jsx`.  
Not migrated (intentional deferral): `CurationWorkspace.jsx`.

---

## Cross-epic usage map

| Epic | Overlay types used | Badge types used | Multi-select | Sequence mode |
|------|--------------------|-----------------|--------------|---------------|
| 2a (Lessons) | `tg`, `td`, `win` | `good`, `mid`, `bad` | — | — |
| 2b (Challenges/Forbidden) | `tg`, `td`, `tr`, `win` | `good`, `bad` | ✓ | — |
| 3a (Sparring) | `tg`, `td` | `good`, `mid`, `bad` | — | — |
| 3b (Position Explorer) | `tg`, `td`, `tr`, `claim`, `win` | — | — | — |
| 3c (Coach queue) | `tg`, `td`, `win` | — | — | — |
| 4 (Saga Map) | `tg`, `td`, `claim`, `win` | — | — | — |

> **Epic 4 overlay note**: Concept Screen slides render a static annotated `Board` with overlays from lesson JSON. Lesson content may use any of the four non-`tr` overlay types (`tg`, `td`, `claim`, `win`). The `tr` type (user's committed column) is not used in static lesson boards. Sequence mode is not used by any Epic 4 screen; `forced_win` sequence mode belongs to Epic 2a.
