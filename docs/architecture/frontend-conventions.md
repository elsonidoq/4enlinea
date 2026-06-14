# Frontend Conventions

## CSS Token Systems

The codebase has **two separate CSS custom property systems** defined in different files. They MUST be paired with the correct background color.

| File | Surface type | Background tokens | Text tokens |
|---|---|---|---|
| `src/index.css` | Dark surfaces (`.dark-surface` only) | `--surface`, `--surface-2`, `--surface-3` | `--text`, `--text-sub`, `--text-muted` |
| `src/styles/tokens.css` | Light surfaces (`:root` default) | `--card` (#fff) | `--ink`, `--ink-soft`, `--ink-faint` |

**Global default:** `:root` is now `color-scheme: light` with `background: #fbf4e8` and `color: var(--ink)`. All user-facing surfaces inherit these light defaults.

**`.dark-surface`:** Defined in `index.css`, this is the sole home of the 9 dark tokens and `color-scheme: dark`. Any component that must render on a dark surface MUST be a descendant of a `.dark-surface` element. Currently applied to `AdminCuratePage` and `AdminLessonsPage` wrapper divs.

**Pairing rule:** Dark background → dark-theme text. Light background → light-theme text. Never mix across systems.
- `var(--surface)` (dark) + `var(--ink)` (dark) = invisible text
- `#fff` (light) + `var(--text)` (light) = invisible text

**Dark component in light context:** If a dark-surface component is placed in a light context without a `.dark-surface` ancestor, its `--text`/`--surface` tokens will be unresolved (visible failure, not silent). Always wrap dark components in `.dark-surface`.

**Mockup-first rule:** When a mockup exists in `docs/mvp/mockup/`, check the background color in the mockup before choosing tokens. The mockup determines which token system to use.

See also: [[reference_token_pairing]], [[project_dark_global_theme]]

## State Management

**MUST**: App-level state lives in `ProfileStore` (React Context, `src/store/ProfileStore.jsx`).
**MUST NOT**: Components reference `IndexedDBStore` or `SupabaseStore` directly — always go through `useStore()`.
**MUST NOT**: Use Redux, Zustand, or any external state library. React Context is the sole mechanism.
Rationale: Constitution §II — the storage-agnostic interface MUST be honored.

## Storage Abstraction

Two store implementations share the same method interface:
- `IndexedDBStore` (`src/store/IndexedDBStore.js`): anonymous users, browser-local.
- `SupabaseStore` (`src/store/SupabaseStore.js`): signed-in users, backend-synced.

`ProfileStore` selects the active store and swaps it transparently on sign-in.
On first sign-in, `IndexedDBStore.migrateToSupabase(supabaseStore, supabaseClient)` bulk-migrates local attempts to Supabase, then clears IndexedDB.

**Required store interface** (both implementations must provide):
| Method | Returns |
|---|---|
| `getProfile()` | `{ device_uuid, tier }` (IndexedDB only — does NOT return `deep_reveal_count` or `deep_reveal_reset_at`; `SupabaseStore.getProfile()` still returns those fields from the `users` table) |
| `saveSessionStats(stats)` | `void` |
| `getSessionStats(date)` | stats object or `null` |
| `recordPuzzleAttempt(attempt)` | `void` |
| `saveLessonProgress(lessonId, status)` | `void` |
| `getLessonProgress()` | `Array<{lessonId, status}>` |
| `saveSparringRecord(result)` | `void` |
| `getSparringRecord()` | `{W, L, D}` |
| `saveChallengeSession(session)` | `void` |
| `getLastChallengeSession()` | session object or `null` |
| `recordActivityDay()` | `void` |
| `getStreak()` | `{streak_count, last_active_date}` |

`IndexedDBStore` additionally provides `getAllPuzzleAttempts()` (used only during migration) and `migrateToSupabase(supabaseStore, supabaseClient)`. `SupabaseStore.migrateToSupabase()` exists but throws — it is not part of the shared interface and must never be called on a `SupabaseStore` instance.

## IndexedDB Schema

Database name: `decodec4`, version 2.
Object stores: `profile` (keyPath: `device_uuid`), `puzzle_attempts` (autoIncrement), `session_stats` (keyPath: `date`), `lesson_progress` (keyPath: `lessonId`), `sparring_record` (keyPath: `id`), `streak` (keyPath: `id`).

## Auth Integration

The frontend uses the Supabase anon key (`VITE_SUPABASE_ANON_KEY`) for auth only.
`getSupabaseClient()` (exported from `ProfileStore.jsx`) is the sole source of the Supabase client instance.
On auth state change, `ProfileStore` automatically swaps the store and tracks the `signup_completed` event.

## Environment Variables

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Server base URL (default: `''` = same origin) |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key for frontend auth |

## Board Representation (Frontend)

Board is a 2D array `board[row][col]` where row 0 is the bottom row.
Cell values: `'empty'`, `'red'` (player 1), `'yellow'` (player 2).
Move strings are 0-indexed (columns `0–6`) throughout — in the DB, on the wire, and in all frontend logic. The +1 conversion to 1-indexed happens only inside `c4solver-wrapper.js` on the server.

## Board Component API

`Board` accepts the following props (defined in `src/components/Board.jsx`; cross-epic contract in `specs/010-design-tokens-component-library/contracts/board-api.md`):

| Prop | Type | Default | Description |
|---|---|---|---|
| `board` | `board[row][col]` 2D array | 6×7 `'empty'` | Cell values: `'red'` → green disc, `'yellow'` → gray disc |
| `onColumnClick` | `(col: number) => void` | — | Tap handler (0-indexed). Not called when `canPlay=false`, column full, or `onColToggle` provided. |
| `canPlay` | boolean | `false` | Global interactivity gate |
| `overlays` | `Array<{c, r, type: OverlayType}>` | `[]` | Cell overlays. Replaces retired `highlightedCells` + `highlightMetadata`. |
| `badge` | `{col, type: BadgeType, label}` | — | Single column evaluation badge |
| `lastDrop` | `{c, r}` | — | Triggers `drop` CSS animation on that disc |
| `compact` | boolean | `false` | 9px/6px padding/gap instead of 11px/7px |
| `fullCols` | `Array<number>` | `[]` | Columns treated as full regardless of board state |
| `selectedCols` | `Array<number>` | `[]` | Multi-select mode: columns show red tint + ✕ badge |
| `onColToggle` | `(col: number) => void` | — | When provided, activates multi-select mode; all taps call `onColToggle` instead of `onColumnClick` |
| `interactionMode` | `'single_move' \| 'sequence'` | `'single_move'` | `'sequence'` = Board never self-locks; required for `forced_win` multi-move type |

### OverlayType enum (LOCKED — cross-epic contract)

| Value | Visual | Usage |
|---|---|---|
| `tg` | green translucent ring | current-player threat highlight |
| `td` | gray translucent ring | opponent threat highlight |
| `tr` | red translucent ring | user's last committed column / wrong-move indicator |
| `claim` | amber translucent fill | claimeven cell |
| `win` | pulsing green outline | winning-line flash |

### BadgeType enum (LOCKED — cross-epic contract)

| Value | Background | Default glyph |
|---|---|---|
| `good` | `--eval-good` (green) | ✓ |
| `mid` | `--eval-mid` (amber) | ? |
| `bad` | `--eval-bad` (red) | ✕ |

### Deprecated prop (curation shim — do not use in game surfaces)

`highlightedCells: Array<[row, col, role, step?]>` — retained solely to keep `CurationWorkspace.jsx` functional without migration. Accepts the old tuple format from `Piece.jsx` and renders curation-specific roles (`z_range`, `hint`, `ghost_mirror`, `wrong_move`, `correct_reveal`, `pattern_piece`, `figure7_threat`, etc.).

**Do not use in any game-surface component.** Will be removed when CurationWorkspace is redesigned.

`highlightMetadata` is fully retired — no shim. No caller other than `PuzzlesPage.jsx` and `SequenceHandler.jsx` used it; both are now on `overlays`.

## Shared Board Utility

`src/lib/board.js` is the canonical location for `buildBoard(moves)`. Do not inline this function in individual screens or pages — import it instead:
```js
import { buildBoard } from '../lib/board.js';
```
`buildBoard(moves)` accepts a 0-indexed move string and returns a `board[row][col]` 2D array using `'empty'`/`'red'`/`'yellow'` cell values (matching the Board component's expected format).

`boardSpecToBoard(boardSpec)` — converts a lesson `boardSpec` (Array[7] of `'g'`/`'d'` strings,
bottom→top per column) to the `Board` component's `board` prop format (`board[row][col]` 6×7
array with `'empty'`/`'red'`/`'yellow'` values). `'g'`→`'red'` (renders green disc),
`'d'`→`'yellow'` (renders gray disc). Exported from `src/lib/board.js`. Used by ConceptScreen
and SocraticScreen.

## Challenge Session State Machine

Multi-puzzle challenge sessions (`ChallengeScreen`) follow a three-phase state machine driven by a `phase` string:

| Phase | Description |
|---|---|
| `'loading'` | Fetching puzzles from `GET /api/puzzles/draw`. Board and controls not yet visible. |
| `'pre-move'` | Puzzle displayed, board interactive. CoachDialog shows a prompt. |
| `'post-move'` | Move committed (commit-first: disc placed before server responds). Board locked. Evaluation arrives asynchronously; Tier-1 strip renders once it arrives. |

Transitions: `loading → pre-move` (on draw response), `pre-move → post-move` (on column tap, immediately — no confirmation step), `post-move → pre-move` (on "Next →", advance `currentIdx`) or `post-move → summary` (on "Next →" when all puzzles exhausted).

New challenge-type screens MUST follow this phase machine. Do not add a `'confirm'` phase — the project uses commit-first with no confirmation step (see project memory `project_commit_first_no_confirm.md`).

### Forbidden Columns branch (`category === 'forbidden_columns'`)

When the drawn puzzle has `category === 'forbidden_columns'`, the `'pre-move'` phase uses multi-select mode instead of single-column commit:

- The Board is rendered with `onColToggle` (not `onColumnClick`) and `selectedCols` state.
- The Toolbar shows a "Submit" button (disabled when `selectedCols.length === 0`) in place of the Hint button.
- After submit, `handleForbiddenSubmit()` calls `POST /api/puzzles/:id/check` with the selected columns and transitions to `'post-move'`.
- The "Learn more ▼" Tier-1 strip button is suppressed for this category.

### Forced Win / sequence branch (`puzzle.interaction_mode === 'sequence'`)

When the drawn puzzle has `interaction_mode === 'sequence'`, `ChallengeScreen` renders `<SequenceHandler>` in place of the standard Board + CoachDialog + Toolbar + Tier-1 strip:

- `SequenceHandler` owns its own Board, banners, and "Next" button (see `project_sequence_handler_ui.md`).
- `SequenceHandler.onNext` is wired as `() => handleSequenceComplete(true)` (success-only in MVP).
- The Tier-1 strip and "Learn more ▼" button are not rendered for sequence puzzles.

### Deep Reveal bottom-sheet panel

After `'post-move'`, `ChallengeScreen` renders a bottom-sheet panel ("Learn more ▼") for categories that support it (all except `forbidden_columns` and sequence puzzles). Tapping the strip calls `POST /api/explain-move-llm` and displays the LLM explanation inside the sheet.

### `challengeSets.js` i18n-key shape convention

All entries in `connect-four/server/challengeSets.js` use `displayNameKey` and `descriptionKey` fields (i18n key strings, e.g. `'challengeSet.immediate_threat.displayName'`). No literal `displayName`/`description` strings are stored. `SetPickerScreen` resolves display names via `t(set.displayNameKey) ?? set.slug`.

## Category Constants

**MUST**: Frontend category constants are defined in `src/lib/categories.js` and MUST be kept in sync with `server/categories.js` whenever categories are added or renamed. Both files define `CATEGORY_ORDER`, `CATEGORY_NAMES`, and `PAID_CATEGORIES`.
`CATEGORY_CHIPS` (styling) is frontend-only.

## API Calls

**MUST**: All fetch calls use `const API = import.meta.env.VITE_API_BASE_URL || ''` as the base.
**MUST**: Authenticated requests include `Authorization: Bearer <session.access_token>` in the header.

## Analytics

**MUST**: Track user events via the `track(eventName, data)` helper in `src/lib/track.js`.
**MUST NOT**: Call `fetch('/api/track', ...)` directly from components — use the helper.
`track()` behavior: posts `{ event, path, data }` to `${VITE_API_BASE_URL}/api/track`. When `VITE_API_BASE_URL` is absent it falls back to `''` (same origin) — events are sent, not dropped. All fetch errors are intentionally swallowed (`.catch(() => {})`). No buffering. The frontend never awaits the result.

## Pages Structure

Pages live in `src/pages/`. Router is defined in `src/App.jsx` using `react-router-dom` with lazy imports.

| Route | File | Purpose |
|---|---|---|
| `/` | `DashboardPage.jsx` | Home / stats overview |
| `/sparring` | `HomePage.jsx` | Sparring (lazy-imported as `SparringPage`) |
| `/puzzles` | `PuzzlesPage.jsx` | Puzzle training flow |
| `/coach` | `CoachPage.jsx` | Coach queue + weakness map (paid) |
| `/admin/curate` | `AdminCuratePage.jsx` | Candidate curation (localhost-only) |

**MUST**: Add new routes in `App.jsx` alongside the existing `<Routes>` block.
Components shared across pages live in `src/components/`.

## RecommendCoach + BadgeRow Pattern

`RecommendCoach` (`src/components/RecommendCoach.jsx`) manages all LLM coach UI state for the sparring page: the "✦ Recommend" and "💡 Why?" pill buttons, the inline coach card, and the flag button.

**State ownership**: `RecommendCoach` owns `mode`, `loading`, `text`, `colRankings`, and `prompt` internally. It does NOT own the badge state — it delegates badge updates upward via `onBadgesChange(colRankings | null)`.

**Props**:
- `moves`: current movestring (for Recommend)
- `lastHumanMovestring`: movestring before human's last move; `null` if no human move yet (disables Why)
- `lastHumanCol`: column human last played; `null` if no human move yet
- `gameOver`: boolean — disables Recommend when true
- `onBadgesChange(colRankings | null)`: callback so the parent can render `BadgeRow`

`BadgeRow` (`src/components/BadgeRow.jsx`) renders star badges above board columns. It is a stateless presentational component.

**Props**: `colRankings: Array<{col: number, tier: string}> | null`

**Placement**: `BadgeRow` renders immediately above `<Board>` inside the same `padding: '0 16px'` wrapper, using `display: flex, justifyContent: center, padding: '0 8px 3px'` so its cells align with Board's columns. Each cell is `48px` wide (= `CELL_SIZE(40) + 2 * COL_PAD_H(4)` from `Column.jsx`).

**Column display convention**: Column rank pills show `Col X` where X is 1-indexed (`col + 1`). No solver scores are surfaced (constitution Principle IV).

**Reset rule**: The parent (`HomePage`) must call `setRecommendBadges(null)` on every move commit, undo, and game reset. `RecommendCoach` calls `onBadgesChange(null)` at the start of each fetch, before the response arrives.

## Debug Panel (`ClassifyAllPanel`)

A developer-only panel that shows the output of `classifyAll` for any board position: 11 detector rows (immediate_threat, double_threat, forced_block, forced_win, forbidden_columns, z_threat, undercut, overcut, figure_7, j_shape, claimeven) + board state (scores, threats, parity).

**Toggle**: `Cmd+Shift+D` (Mac) / `Ctrl+Shift+D` (Windows/Linux). State persists in `localStorage` under key `c4_debug`. Managed by `DebugContext` in `src/context/DebugContext.jsx`.

**Future gating**: To restrict to developer users, replace the `localStorage` check in `DebugContext.jsx` with a role check (e.g. `session?.user?.role === 'developer'`).

**API**: `POST /api/debug/classify-all` (localhost-only). Body: `{ moves: string }`. Returns `{ detectors, boardState, scores }`. Do not call from prod-user-facing code.

**Adding to a new page** — two steps:

```jsx
// 1. Import at the top of the page file
import { ClassifyAllPanel } from '../components/ClassifyAllPanel.jsx';
import { useDebugMode } from '../context/DebugContext.jsx';

// 2. Inside the component, compute two movestings:
//    - humanMovestring: board right after the human's most recent move (odd-length slice)
//    - aiMovestring:    board right after AI's most recent move (even-length slice, '' if AI hasn't moved)
// Then render below the board (gate on !gameOver to avoid solver errors on won positions):
const { debugMode } = useDebugMode();
// ...
{debugMode && !gameOver && (
  <ClassifyAllPanel humanMovestring={humanMovestring} aiMovestring={aiMovestring} />
)}
```

**Sparring example** (the reference implementation, `src/pages/HomePage.jsx`):

```jsx
const humanMovestring = buildMovesString(
  moveHistory.slice(0, moveHistory.length % 2 === 1 ? moveHistory.length : Math.max(0, moveHistory.length - 1))
);
const aiMovestring = moveHistory.length < 2 ? '' : buildMovesString(
  moveHistory.slice(0, moveHistory.length % 2 === 0 ? moveHistory.length : moveHistory.length - 1)
);
// Human plays at even indices (0, 2, 4…), AI at odd indices (1, 3, 5…).
// humanMovestring = last odd-length prefix; aiMovestring = last even-length prefix.
```

For pages where only one perspective exists (e.g. Puzzles, where the position is fixed), pass the same string for both props or pass `''` for whichever is not applicable.

## Screen Navigation

**Sole navigation mechanism**: `go(screenKey, params)` is the only way to navigate between screens. Do not call any router API (no `BrowserRouter`, `navigate()`, `Link`, etc.).

**`setActiveScreen` ordering**: `setActiveScreen(key)` (from `src/lib/track.js`) MUST be called before `track()` on every navigation so the correct `path` is recorded in analytics. The Navigator mount effect calls `setActiveScreen('home')` and then `track('session_start', ...)` in that exact sequential order.

**Surface group → background token mapping**: Each screen key maps to a CSS custom property token via `SURFACE_BG` in `src/lib/surfaceGroups.js`:

| Surface group | Token | Screens |
|---|---|---|
| Home | `--bg-home` | home, stats, mistakes, mistakeDetail, blunderDetail |
| Lessons | `--bg-lessons` | saga, concept, socratic, clchallenge |
| Challenges | `--bg-challenges` | setpicker, challenge, summary |
| Sparring | `--bg-sparring` | difficulty, game, review, explorer |

### Three-level Mistakes route hierarchy

The mistakes feature has three independent screen routes:

- **Level 1**: `mistakes` -- `CategoryListScreen` -- entry point, groups blunders by tactical category sorted by severity. Requires auth (gated by `MistakesGate` with `renderSignedOut`).
- **Level 2**: `mistakeDetail` -- `MistakesListScreen` with `category` prop -- filtered blunder list for one category. Shows Unreviewed/Reviewed tabs.
- **Level 3**: `blunderDetail` -- `MistakeDetailScreen` with `blunderNavList`, `index`, `mistakeContext` (`'list'` | `'game'`), and `mistakeSource` (`{ date, gameId, totalMoves }` | null) -- individual blunder detail with Prev/Next nav. Contextual Back: from a game review the Back button returns to `review`; from the list it calls `goBack()`.

**Screen registry**: `src/lib/screenRegistry.js` is the canonical map of all 15 screen keys to their React components. Add new screen components here; never wire them directly in `App.jsx`.

**Back-stack pattern**: The Navigator maintains a one-level back-stack via `prevScreen`. `goBack()` restores `prevScreen` and clears it to `null`. Do NOT implement `goBack()` by calling `go(prevScreen)` — that would overwrite `prevScreen` with the current screen instead of clearing it, breaking subsequent back navigations.

## URL Sync & Navigation

**`react-router-dom` is permanently absent** — spec 011 FR-001 invariant. Do NOT reintroduce it.

### Single source of truth: `urlMapping.js`

`src/lib/urlMapping.js` exports:
- `URL_MAP` — ordered array of `{ screenKey, pattern, buildPath }` entries for all 16 routable screens. This is the canonical URL ↔ screen-key mapping; no other file may hard-code URL paths.
- `SESSION_ONLY_SCREENS` — `Set` of 5 screen keys whose state cannot survive a cold page load: `summary`, `explorer`, `mistakeDetail`, `game`, `blunderDetail`. On cold boot, these screens redirect to `home`.
- `buildUrl(screenKey, params)` — constructs the URL pathname for a given screen + params.
- `parseUrl(pathname)` — parses a pathname and returns `{ screenKey, params }` or `null`.

### Navigation API

| Function | History effect | When to use |
|---|---|---|
| `go(screenKey, params)` | `pushState` — adds a history entry | Normal forward navigation |
| `goReplace(screenKey, params)` | `replaceState` — no new history entry | Replacing current entry (e.g., after saving a game) |
| `goBack()` | `window.history.back()` | Back button / back gesture |

### Event handling

The `popstate` handler in `App.jsx` is the **canonical place** for back-navigation tracking. `goBack()` itself does NOT call `track()` — tracking fires inside the `popstate` listener so it covers both programmatic back navigation and browser back-button gestures.

### Cold-boot behaviour

On initial page load, `App.jsx` calls `parseUrl(location.pathname)` and calls `replaceState` to normalise the URL. Screens in `SESSION_ONLY_SCREENS` cannot be loaded from a cold URL (their required state is absent); the mount effect redirects them to `home`.

### `clchallenge` cold-boot fetch pattern

The `clchallenge` screen encodes only `lessonId` in the URL. On cold boot (when `lessonTitle` is absent from navigation params), `CLChallengeScreen` fetches the remaining props from `GET /api/lessons/:lessonId`. Components that require data beyond what fits in a URL path parameter MUST follow this same fetch-on-missing-props pattern.

## Service Worker (`public/sw.js`)

The service worker provides offline support and performance caching. Critical rules for modifying it:

### Caching strategy per request type

| Request type | Strategy | Rationale |
|---|---|---|
| Navigation (HTML pages) | **Network-first** | `index.html` changes every deploy (new hashed JS filenames). Cache-first would serve stale HTML → broken app. |
| Hashed assets (`/assets/*`) | **Cache-first** | Vite generates content-hashed filenames. Immutable — a cached version is always correct. |
| Other static (manifest, favicon, fonts) | **Cache-first with network update** | Rarely changes; cache for speed, update in background. |
| API requests (`/api/*`) | **Bypass** | Never cache API responses — they must be fresh. |
| Cross-origin requests | **Bypass** | Supabase, Google Fonts etc. are handled by their own CDNs. |

### Important: bump CACHE_NAME on any SW logic change

The `CACHE_NAME` constant (e.g., `'decodec4-shell-v2'`) must be bumped whenever the caching strategy changes. This purges all stale cached entries from old SW versions. Failing to bump it means users with the old SW installed will continue serving stale content.

### Never cache index.html with cache-first

**Doing so will break the app after every deploy.** The cached index.html references old hashed JS files that no longer exist on the server, causing MIME type errors ("Expected a JavaScript module but the server responded with text/html").

### SW lifecycle

`skipWaiting()` is called on install — the new SW activates immediately without waiting for all tabs to close. `clients.claim()` is called on activate — the SW takes control of all clients immediately. This means SW updates apply on the next navigation, not the next full page load.
