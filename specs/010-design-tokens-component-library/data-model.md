# Data Model: Design Tokens & Component Library (Epic 1a)

This epic introduces no new database tables, server-side state, or persistent data structures.
All entities are frontend-only (React props and CSS custom properties).

---

## CSS Token File

**File**: `connect-four/src/styles/tokens.css`  
**Import point**: `connect-four/src/main.jsx` (once, at app root)

The file defines all CSS custom properties listed in FR-001 through FR-007, plus
`@keyframes` for FR-008. No other file may define disc or overlay colors.

---

## Component Prop Shapes

### `Icon`
```
{ name: string, size?: number = 22, color?: string = 'currentColor', strokeWidth?: number = 2.4 }
```
Valid `name` values: `back | chevR | chevL | chevD | gear | user | bulb | undo | flag | lock | check | star | arrowUp | play | search | retry | grad | target | swords | chart`
Unknown names render an empty `<svg>` without throwing.

### `StatusBar`
```
{ time?: string = '9:41' }
```

### `TopBar`
```
{ title?: string, onBack?: () => void, meta?: string,
  rightIcon?: string, onRight?: () => void,
  right2?: string, onRight2?: () => void }
```
Back button only renders when `onBack` is provided.

### `ProgressBar`
```
{ value?: number, max?: number, pct?: number }
```
`pct` takes precedence; otherwise `value/max * 100`.

### `Stars`
```
{ n: number, total?: number = 3 }
```
Stars with index `< n` render at full opacity; rest at `opacity: 0.28`.
`n` is clamped: `n < 0` → all faded; `n > total` → all full.

### `Toolbar`
```
{ children: ReactNode }
```

### `ToolButton`
```
{ icon: string, label: string, onClick?: () => void, color?: string }
```

### `CoachAvatar`
```
{ size?: number = 58, mood?: 'happy' | 'think' | 'oops' = 'happy' }
```

### `CoachDialog`
```
{ messages: Message[], size?: number = 58, fixed?: boolean = false }

Message {
  text: string          // required
  faded?: boolean       // bubble at opacity: 0.28 (spec says 0.28 for edge case; was 0.50 in spec body — use 0.28 per edge-case section)
  lead?: string         // bold display-font line above text
  evalNum?: string      // float-right chip (score or label)
  mood?: 'happy' | 'think' | 'oops'  // avatar adopts mood of last message
}
```

### `Board` — see `contracts/board-api.md` for the canonical shape.

### `FeatureCard`
```
{ icon: string, title: string, subtitle?: string,
  onClick?: () => void, badge?: ReactNode, wide?: boolean }
```
`wide=true` → full-width row layout; `wide=false` (default) → square card.

### `SetCard`
```
{ title: string, stars: number, positionCount: number,
  locked?: boolean = false, onClick?: () => void }
```
`locked=true` → `--lock-bg` background, dimmed title, padlock icon.

### `UpgradeModal`
```
{ onDismiss: () => void, onNotify: (email: string) => void | Promise<void> }
```
Internal states: `idle | success | error`.
- `idle`: email input + "Notify me" CTA (disabled when email empty).
- `success`: confirmation message ("Thanks — we'll let you know!").
- `error`: error cue + CTA re-enabled.

---

## i18n Key Map

### Added keys (`en.json`)

```json
{
  "upgrade": {
    "heading": "...",
    "body": "...",
    "cta": "Notify me",
    "placeholder": "your@email.com",
    "success": "Thanks — we'll let you know!",
    "error": "Something went wrong. Please try again.",
    "dismiss": "Maybe later"
  },
  "common": {
    "dismiss": "Dismiss",
    "confirm": "Confirm"
  }
}
```

### Removed keys (`en.json`)

The entire `paywall` namespace is removed when `PaywallModal.jsx` is deleted:
```
paywall.title, paywall.monthly, paywall.annual, paywall.annualNote,
paywall.benefits, paywall.cta, paywall.quotaExhausted, paywall.coachGate
```
