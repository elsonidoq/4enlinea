# Contract: `TopBar` component API amendment (amends Spec 010 FR-013/FR-014)

**Status**: This file is the drafting workspace for the amendment. The actual amendment MUST be
applied in-place to `specs/010-design-tokens-component-library/spec.md` (FR-013/FR-014) as a
visible superseding correction (old text struck through inline, new text follows — matching the
convention already used in `polish_epic.md`), as a documentation deliverable task in `tasks.md`
(Constitution Principle VIII: documentation is part of the task's definition of done, not a
follow-up).

## Current contract (Spec 010, as written)

- **FR-013**: `TopBar` MUST render: optional back button (left), title (Baloo 2 700 19 px),
  spacer, optional meta string (right), up to two right icon buttons.
- **FR-014**: `TopBar` MUST accept: `title`, `onBack`, `meta`, `rightIcon`/`onRight`,
  `right2`/`onRight2` props; back button only renders when `onBack` is provided.

## Amended contract (this feature)

- **FR-013 (amended)**: `TopBar` MUST render: optional back button (left), **a persistent
  DecodeC4 logo mark (left, after the back button, before the title)**, optional title (Baloo 2
  700 19 px), spacer, optional meta string (right), up to two right icon buttons. The logo renders
  unconditionally on every screen regardless of whether `title` is provided (spec 043 FR-017).
- **FR-014 (amended)**: `TopBar` MUST accept: `title` (now explicitly optional — omitting it
  renders no title text, used by Home post-043), `onBack`, `meta`, `rightIcon`/`onRight`,
  `right2`/`onRight2`, **and `onLogoClick` (new, spec 043 FR-018)** props; back button only
  renders when `onBack` is provided; the logo is always rendered and always calls `onLogoClick`
  when tapped.
- **New note (spec 043 FR-019 exception)**: the Home screen's `TopBar` call MUST NOT pass `title`
  once the logo ships, so the DecodeC4 mark appears exactly once on Home. Every other screen's
  existing `title` usage is unchanged.

## Prop table (post-amendment)

| Prop | Type | Default | Change |
|---|---|---|---|
| `title` | `ReactNode` | — | unchanged (already optional; Home stops passing it) |
| `onBack` | `() => void` | — | unchanged |
| `meta` | `string` | — | unchanged |
| `rightIcon` / `onRight` | `string` / `() => void` | — | unchanged |
| `right2` / `onRight2` | `string` / `() => void` | — | unchanged |
| `onLogoClick` | `() => void` | — | **new** — every caller supplies `() => go('home')` |

## Render order (left → right)

`[back button?] [logo] [title?] [spacer] [meta?] [right2 icon?] [rightIcon icon?]`

## Backward compatibility

Every existing `<TopBar title={...} onBack={...} .../>` call site keeps working unchanged (all
new/changed behavior is additive: the logo just appears). The only call-site change required by
this feature is `HomeScreen.jsx` dropping its `title` prop and every screen adding `onLogoClick`.
