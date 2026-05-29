# Quickstart: Design Tokens & Component Library (Epic 1a)

## Dev environment

```bash
cd connect-four
npm run dev      # starts Vite dev server on http://localhost:5173
```

The server at port 3001 is not required for this epic — it is a component library change with no API calls.

## Verification checkpoints

After each component is implemented, verify in the browser:

### 1. Tokens loaded
Open the app; open DevTools → Computed tab → check `--disc-green` resolves to `#2faa5a`.

### 2. Board redesign
Navigate to Puzzles. Play a puzzle:
- Discs are green/gray (no red/yellow).
- Hover over a non-full column → green chevD arrow appears above it.
- Clicking a column calls the move handler.

### 3. Board overlays
Using a `forced_win` or `double_threat` puzzle (they emit overlays), verify colored rings render on the correct cells.

### 4. Sequence mode (forced_win)
Open a `forced_win` puzzle via `SequenceHandler`. Play the first move → board does not lock → play a second move. Verify `interactionMode="sequence"` is wired.

### 5. Forbidden columns multi-select
Open a `forbidden_columns` puzzle. Tap two columns → red tint + ✕ badge on both. Tap "Submit". Verify `onColToggle` fires.

### 6. UpgradeModal
Trigger the modal via a Pro-gated feature (Coach page or Deep Reveal). Verify:
- Email input present; "Notify me" disabled when empty.
- Enter an email → button enables.
- No network request to `/api/stripe/*` is made (check Network tab).
- Modal shows confirmation after submit.

### 7. PaywallModal retired
```bash
rg "PaywallModal" connect-four/src/
# Expected: zero results
```

### 8. Old Board props retired
```bash
rg "highlightedCells|highlightMetadata" connect-four/src/
# Expected: zero results
```

## Key file locations

| Purpose | File |
|---------|------|
| All CSS tokens | `connect-four/src/styles/tokens.css` |
| Board (redesigned) | `connect-four/src/components/Board.jsx` |
| UpgradeModal | `connect-four/src/components/UpgradeModal.jsx` |
| Icon | `connect-four/src/components/Icon.jsx` |
| CoachAvatar + CoachDialog | `connect-four/src/components/CoachAvatar.jsx`, `CoachDialog.jsx` |
| i18n strings | `connect-four/src/i18n/en.json` |
| Board API contract | `specs/010-design-tokens-component-library/contracts/board-api.md` |

## Mockup references

All component visual designs are from `docs/mvp/mockup/project/`:
- `styles.css` — token values and CSS classes
- `primitives.jsx` — Icon, StatusBar, TopBar, ProgressBar, Stars, Toolbar, ToolButton
- `coach.jsx` — CoachAvatar, CoachDialog
- `board.jsx` — Board (column-first encoding; adapt to row-major on port)
- `screens_home.jsx` — FeatureCard usage
- `screens_challenges.jsx` — SetCard + UpgradeModal bottom-sheet pattern
