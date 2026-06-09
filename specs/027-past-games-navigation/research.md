# Research: Past Games Navigation

**Feature**: Past Games Navigation (Epic A)
**Date**: 2026-06-09

## 1. `colsToBoard` vs existing `boardSpecToBoard`

### Finding

The existing `boardSpecToBoard(boardSpec)` function in `connect-four/src/lib/board.js` performs the exact conversion required by FR-024: a 7-element array of `g`/`d` strings (bottom-to-top per column) becomes a `board[row][col]` 2D array with `'red'`/`'yellow'`/`'empty'` values.

The encoding contract matches identically:
- `'g'` → `'red'` (renders as green disc)
- `'d'` → `'yellow'` (renders as gray disc)

### Decision

Implement `colsToBoard` as a thin wrapper that delegates to `boardSpecToBoard` but adds input validation (malformed data returns an empty 6x7 board instead of throwing). The function is exported from `src/lib/board.js`.

```js
export function colsToBoard(cols) {
  if (!Array.isArray(cols) || cols.length !== 7) {
    return Array.from({ length: 6 }, () => Array(7).fill('empty'));
  }
  try {
    return boardSpecToBoard(cols);
  } catch {
    return Array.from({ length: 6 }, () => Array(7).fill('empty'));
  }
}
```

### Rationale

- Reuses the existing, tested `boardSpecToBoard` logic.
- Provides a distinct name that makes the encoding contract explicit (`cols` → API response field; `boardSpecToBoard` → lesson rendering).
- Meets FR-024's graceful-fallback requirement.

---

## 2. Server-side `cols` computation (FR-010)

### Finding

The spec assumes `movesToBoardSpec` (a lesson helper) can be reused for `cols` computation. After review, the lesson helper has a different interface and return type. A direct inline algorithm is simpler and avoids cross-concern coupling.

### Decision

Compute `cols` inline in the `GET /api/games` handler using a simple 4-line algorithm:

```js
function movesToCols(moves) {
  const cols = ['', '', '', '', '', '', ''];
  for (let i = 0; i < moves.length; i++) {
    cols[parseInt(moves[i], 10)] += (i % 2 === 0) ? 'g' : 'd';
  }
  return cols;
}
```

### Rationale

- Trivially correct — no external dependency.
- Runs in O(n) where n ≤ 42 (game length). Performance is not a concern.
- The encoding rule (`g` at even indices, `d` at odd indices) is verifiable at a glance.

---

## 3. Production app wiring — no rail selector, no `gamesVariant` app-level state

### Finding

The mockup's `app.jsx` defines `NAV_GROUPS`, `gamesVariant` state, and a rail selector. None of these exist in the production `connect-four/src/App.jsx`. The production app uses:
- `SCREENS` registry (screenRegistry.jsx)
- `go(key, params)` / `goBack()` / `goReplace()`
- `SURFACE_BG` (surfaceGroups.js)
- `parseUrl` / `buildUrl` / `SESSION_ONLY_SCREENS` (urlMapping.js)

The production app has no variant rail selector and no app-level variant state.

### Decision

For MVP (Epic A only), `PastGamesListScreen` manages its variant internally:
- Checks auth state via `useStore()` (ProfileStore context).
- Fetches data and derives `"empty"` / `"in"` variant from the result.
- Derives `"out"` variant from auth state (or from a 401 fetch response).

The `gamesVariant` prop mentioned in the spec (FR-019) is handled as internal component state. No app-level state is added. No rail selector is created.

### Rationale

- Matches the production architecture — no other screen depends on `gamesVariant`.
- Keeps the scope minimal for Epic A.
- If Epic B needs shared variant state, it can be promoted to app-level at that time.
- Avoids building mockup-only infrastructure (rail selector) that has no production counterpart.

---

## 4. AuthModal trigger pattern

### Finding

The production app's `AuthModal` is opened via local `useState` in the screen component. The `HomeScreen` pattern (production code, lines 15-21):

```jsx
const [authOpen, setAuthOpen] = useState(false);
// CTA button: onClick={() => setAuthOpen(true)}
// Render: {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
```

The `MistakesListScreen` signed-out gate does NOT use `AuthModal` — it renders a static prompt with a CTA button that navigates to `go('stats')`. The `ProfileStore` does NOT expose `setShowAuthModal`.

### Decision

`PastGamesListScreen` uses the `HomeScreen` pattern: local `useState` for `authOpen` / `setAuthOpen`, renders `<AuthModal>` when `authOpen` is true, and the "Create free account" button calls `setAuthOpen(true)`.

### Rationale

- Matches the only production AuthModal trigger pattern (`HomeScreen`).
- No app-level or store-level auth modal state exists to reuse.
- The `AuthModal` component is already imported in `HomeScreen`; `PastGamesListScreen` imports it identically.

---

## 5. Client-side blunder write removal location

### Finding

FR-005 requires game blunders to be written server-side inside `POST /api/games/analyze` with `game_id`. `POST /api/blunders` stays for puzzle blunders only.

A grep of `connect-four/src/` for `POST /api/blunders` returned zero results. The client-side game-blunder write path never existed — the server-side path in `POST /api/games/analyze` is the sole blunder write mechanism. No removal task is needed.

### Decision

No task needed. Empirical verification (grep of `connect-four/src/`) confirmed zero `POST /api/blunders` calls in the frontend. The client-side write path never existed for game blunders — the server-side path in `POST /api/games/analyze` is the sole blunder write mechanism. FR-026 is deleted from the spec.

### Rationale

- The server-side blunder write in `POST /api/games/analyze` now carries `game_id`, making any hypothetical client-side write redundant and inconsistent (it would write without `game_id`).
- The `POST /api/blunders` endpoint stays for puzzle blunders (where a client-side write is still needed because puzzles don't go through the game-analysis flow).
- The tasks.md handoff context (judgment call #1) explicitly excludes a frontend blunder-write removal task — there is nothing to remove.

---

## 6. Difficulty pill color decisions

### Finding

The mockup defines four difficulty styles:
- Easy: `bg: var(--eval-good-bg)`, `fg: #1c8a4a`
- Medium: `bg: var(--eval-mid-bg)`, `fg: #b9760a`
- Hard: `bg: var(--eval-bad-bg)`, `fg: #c23a26`
- Perfect: `bg: #2b2a28`, `fg: #fff`

The eval token background colors (`--eval-good-bg`, `--eval-mid-bg`, `--eval-bad-bg`) are defined in the existing CSS token system. The Perfect pill uses a hardcoded dark background with white text — it does not map to any existing eval token.

### Decision

Use the mockup's inline style pattern for the Perfect pill. Do not create a new CSS token for a single use case. The three eval-based difficulties use the existing token pairs. If the Perfect pill pattern proliferates (e.g., appears in 3+ components), a token can be backfilled.

### Rationale

- Avoids adding a token with one consumer.
- Matches the mockup's design decisions.
- Easy to refactor later if needed.

---

## 7. Draw outcome chip styling

### Finding

The spec requires handling draw as a valid outcome (it is not an error state). The `outcome-chip` needs a `.draw` variant. The spec says: "neutral gray — `background: var(--ink-faint)` at low opacity, text `var(--ink-soft)`". This is a light-surface token pairing on a white card, which is correct.

### Decision

Use `background: color-mix(in srgb, var(--ink-faint) 20%, transparent)` or `background: var(--ink-faint)` with reduced opacity, paired with `color: var(--ink-soft)` for the draw chip. The exact opacity level should match the mockup visually.

### Rationale

- Draw is a legitimate game outcome that must be visually distinct from both Won and Lost.
- Using `var(--ink-faint)` with opacity creates a muted appearance that signals neutrality.
- Text color `var(--ink-soft)` ensures readability on the light chip background.

---

## 8. `blunder_count` LEFT JOIN — `user_id` filter importance

### Finding

The spec (FR-011) requires filtering blunder counts by `user_id = req.user.id` in the LEFT JOIN. Without this filter, if two users play the same game (same `moves` movestring, different `games` rows with different `user_id` values), the blunder count would include blunders from both users.

However, each game row has a unique `user_id` (and games are not shared between users), so the `user_id` filter on the blunders join is technically redundant in the current data model. But the epics explicitly require it for correctness, and it costs nothing to add.

### Decision

Include `AND b.user_id = $1` in the LEFT JOIN's WHERE clause as specified in FR-011.

### Rationale

- Defensive programming — if the data model ever supports shared games, the query remains correct.
- Matches the spec exactly.
- The performance impact is negligible (the index on `user_id` already covers it).

---

## 9. URL mapping — cold-boot survival

### Finding

The spec (FR-030) explicitly excludes `pastGames` from `SESSION_ONLY_SCREENS`. The screen must survive a cold URL boot — a user who bookmarks `/pastGames` and revisits should land on the Past Games screen (with a loading spinner while data fetches, or the signed-out gate).

This works because:
1. `parseUrl('/pastGames')` returns `{ screenKey: 'pastGames', params: {} }`.
2. `SESSION_ONLY_SCREENS.has('pastGames')` is `false`.
3. The `Navigator` mount effect sets `screen` to `'pastGames'` with no redirect.
4. `PastGamesListScreen` mounts and fetches data.

### Decision

Register the URL mapping entry and ensure `pastGames` is NOT added to `SESSION_ONLY_SCREENS`. No additional cold-boot logic is needed — the screen handles its own data fetching.

### Rationale

- The existing `parseUrl` / `buildUrl` infrastructure already supports this.
- The screen's mount-time `GET /api/games` fetch naturally handles the cold-boot case.
- If the user is not authenticated, the 401 response triggers the signed-out gate.

---

## 10. Game date formatting

### Finding

The spec says dates are client-formatted from ISO 8601. The mockup uses format "Jun 7". The `gameDate` field is returned by `POST /api/games/analyze` and is available via `GET /api/games` (as `date: games.created_at`).

### Decision

Format dates on the client using `Intl.DateTimeFormat` or a simple month-name + day formatter. Do NOT format on the server — pass `created_at` as ISO 8601 and let the client handle presentation.

### Rationale

- Consistent with i18n principles — date formatting is locale-sensitive.
- The server returns raw data; the client presents it.
```

---

## 11. Existing `insertGameBlunder` signature — backward compatibility

### Finding

`insertGameBlunder(supabase, row)` currently destructures `row` for: `user_id`, `board_state`, `move_played`, `correct_move`, `pattern_category`, `reason`, `direction`, `severity`, `blunder_severity`. It does NOT accept `game_id`.

### Decision

Add `game_id` to the destructured fields with a default of `null`:
```js
const { user_id, board_state, move_played, correct_move, pattern_category,
        reason, direction, severity, blunder_severity, game_id } = row;
```

The INSERT statement adds `game_id: game_id ?? null`. This is backward-compatible — callers that don't pass `game_id` get `null` stored.

### Rationale

- Minimal change to existing code.
- The column is nullable and defaults to `null` in the migration.
- Only `POST /api/games/analyze` (modified in this feature) passes `game_id`.
