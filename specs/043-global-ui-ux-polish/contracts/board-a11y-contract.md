# Contract: `Board` component a11y addition (amends `docs/architecture/frontend-conventions.md`
## Board Component API / cross-epic contract in `specs/010-design-tokens-component-library/contracts/board-api.md`)

No new props are added to `Board` (`connect-four/src/components/Board.jsx`). This contract
documents new **attributes rendered on the existing per-column wrapper** (`Board.jsx:211-229`),
derived entirely from props that already exist (`canPlay`, `board`, `fullCols`).

## Per-column wrapper attributes (new)

| Condition | `role` | `aria-label` | `tabIndex` | `aria-disabled` | Keyboard |
|---|---|---|---|---|---|
| `canPlay === false` (read-only board) | *(absent)* | *(absent)* | *(absent)* | *(absent)* | not focusable |
| `canPlay === true`, column not full | `"button"` | `"column N"` (1-based) | `0` | *(absent)* | Enter/Space → same action as click |
| `canPlay === true`, column full | `"button"` | `"column N"` | `-1` | `true` | not reachable by Tab; Enter/Space no-ops (same guard as click) |

## Invariants

- **I1 (FR-001/FR-002)**: A board renders either exactly 7 column controls (playable) or exactly
  0 (read-only) — never a per-cell control count (42) and never a partial count.
- **I2 (FR-004)**: Keyboard activation (Enter/Space) on a column control MUST call the exact same
  `handleClick` function the mouse `onClick` calls — including its `multiSelectMode` branch
  (`onColToggle` vs `onColumnClick`). No parallel/duplicated branch logic.
- **I3 (FR-007)**: This contract touches only the column wrapper's ARIA/tabIndex attributes.
  Disc color rendering (`value === 'red'`/`'yellow'` → green/gray, `Board.jsx:303-317`) and all
  `shimRole`/`overlays` highlight logic are untouched.
- **I4 (FR-005)**: A focused column control (`:focus-visible` or equivalent) MUST show a visible
  outline/ring distinct from the existing hover state (`isHovered` background, `Board.jsx:223-224`)
  — focus and hover are visually distinguishable states.

## Non-goals (explicitly out of scope per this contract)

- No change to `onCellClick` (the deprecated per-cell shim used only by `BoardEditor.jsx`'s
  overlay-annotation mode, `Board.jsx:287`).
- No change to `highlightedCells` shim rendering.
- No new `Board` prop.

## Verified: the gate is `canPlay`, not `onColumnClick` presence

A plan-review critique raised the concern that admin boards with per-cell-only interaction
(`canPlay={true}` but no `onColumnClick`) would incorrectly gain column controls with nothing
behind them, and proposed gating on `onColumnClick` presence instead of `canPlay`. This was
checked directly against the current codebase: **every** call site that passes `canPlay={true}`
today (`GameScreen.jsx`, `SocraticScreen.jsx`, `PlayOnlineScreen.jsx`, `ChallengeScreen.jsx`,
`CurationWorkspace.jsx:326-327`, `BoardEditor.jsx:109-111` when `mode==='disc'`) **also** passes
`onColumnClick` in that same call. There is no site today where `canPlay` is `true` and
`onColumnClick` is absent — `BoardEditor.jsx`'s per-cell overlay mode sets `canPlay={false}`, not
`true`. The `canPlay` gate documented above is therefore kept as-is; switching to an
`onColumnClick`-presence gate would be behaviorally identical today and add indirection without
fixing a real gap. See `research.md` R1 for the full verification trace.
