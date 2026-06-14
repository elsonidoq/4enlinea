# Quickstart: Past Games Navigation

**Feature**: Past Games Navigation (Epic A)
**Date**: 2026-06-09

## Prerequisites

- Node.js 20.10+
- Supabase project running with migrations up to 035 applied
- `connect-four/server/.env` configured with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- `connect-four/.env` configured with `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## Implementation Order

### 1. Migration (first — DB must exist before code references it)

```bash
# Create migration file
touch connect-four/server/migrations/036_past_games_schema.sql
```

Contents: Add `game_id` to `blunders`, index, `accuracy` to `games`.

Apply: `psql` or Supabase dashboard SQL editor.

### 2. Server changes

**`insertGameBlunder.js`** — Add `game_id` to destructured fields:
```js
const { user_id, ..., game_id } = row;
// INSERT: game_id: game_id ?? null,
```

**`server/index.js`** — Three changes:
1. `POST /api/games` — add optional `accuracy` validation and store
2. `POST /api/games/analyze` — add `created_at` to SELECT, add `gameDate` to response, pass `game_id: gameId` to `insertGameBlunder`
3. `GET /api/games` — new endpoint (auth-required, LEFT JOIN blunders, compute `cols`)

### 3. Frontend utility

**`src/lib/board.js`** — Add `colsToBoard(cols)`:
```js
export function colsToBoard(cols) {
  if (!Array.isArray(cols) || cols.length !== 7) {
    return Array.from({ length: 6 }, () => Array(7).fill('empty'));
  }
  try { return boardSpecToBoard(cols); }
  catch { return Array.from({ length: 6 }, () => Array(7).fill('empty')); }
}
```

### 4. Frontend screen

**`src/screens/PastGamesListScreen.jsx`** — New file with:
- `PastGamesList` component (filter tabs, data fetch, variant states)
- `GameCard` sub-component (board thumbnail, outcome chip, difficulty, accuracy, blunder count)

### 5. Home Screen card

**`src/screens/HomeScreen.jsx`** — Add Past Games `FeatureCard` below Sparring card:
```jsx
<FeatureCard
  title={t('home.past_games.title')}
  subtitle={t('home.past_games.subtitle')}
  background="linear-gradient(170deg,#fff,#e8faf8)"
  icon={<Icon name="clock" size={28} color="#1a8a7c" />}
  iconBg="#c7f0ea"
  iconColor="#1a8a7c"
  onClick={() => go('pastGames')}
  wide
/>
```

### 6. App shell wiring

- **`src/components/Icon.jsx`** — Add `clock` SVG path
- **`src/lib/screenRegistry.jsx`** — Register `pastGames: PastGamesListScreen`
- **`src/lib/surfaceGroups.js`** — Add `pastGames: '--bg-spar'`
- **`src/lib/urlMapping.js`** — Add `{ pattern: '/pastGames', screenKey: 'pastGames', paramNames: [] }` to `URL_MAP`. Do NOT add to `SESSION_ONLY_SCREENS`.

### 7. CSS + i18n

- **`src/i18n/en.json`** — Add `games.*` and `home.past_games.*` keys
- **`src/styles/index.css`** — Add `.game-card`, `.gc-body`, `.outcome-chip`, `.gc-blunder-chip`, `.gc-no-blunder-chip`, `.opponent-av` classes

## Manual Verification Checklist

After implementation, verify each state:

- [ ] **Signed-in with games**: Navigate Home → Past Games → see scrollable card list
- [ ] **Filter tabs**: Tap Won/Lost/Blunder → list filters instantly (no network request)
- [ ] **Empty filter**: Apply filter with no matches → "Nothing here" message
- [ ] **Card tap**: Tap a GameCard → navigates to Post-Game Review with correct game data
- [ ] **Signed-out gate**: Anonymous user taps Past Games → see sign-up gate
- [ ] **AuthModal**: Tap "Create free account" on gate → AuthModal opens
- [ ] **"Maybe later"**: Tap ghost button on gate → returns to Home
- [ ] **Empty state**: Authenticated user with no games → Coach avatar + "Play a game" CTA
- [ ] **Loading state**: Slow network → spinner visible during fetch
- [ ] **Error state**: Server down → error message with retry option
- [ ] **Cold boot**: Navigate directly to `/pastGames` in URL bar → screen loads (not redirected to home)
- [ ] **Draw outcome**: Game with result=draw → neutral gray chip
- [ ] **No blunders**: Game with blunder_count=0 → "no blunders" muted text
- [ ] **Null accuracy**: Pre-migration game → `--` display
- [ ] **Clock icon**: Past Games card on Home has clock icon in teal

## Key Files

| File | Action |
|---|---|
| `connect-four/server/migrations/036_past_games_schema.sql` | NEW |
| `connect-four/server/insertGameBlunder.js` | MODIFY |
| `connect-four/server/index.js` | MODIFY (3 endpoints) |
| `connect-four/src/lib/board.js` | MODIFY (add `colsToBoard`) |
| `connect-four/src/screens/PastGamesListScreen.jsx` | NEW |
| `connect-four/src/screens/HomeScreen.jsx` | MODIFY |
| `connect-four/src/components/Icon.jsx` | MODIFY (add `clock`) |
| `connect-four/src/lib/screenRegistry.jsx` | MODIFY |
| `connect-four/src/lib/surfaceGroups.js` | MODIFY |
| `connect-four/src/lib/urlMapping.js` | MODIFY |
| `connect-four/src/i18n/en.json` | MODIFY |
| `connect-four/src/styles/index.css` | MODIFY |
