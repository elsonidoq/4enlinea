# Frontend Conventions

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
| `getProfile()` | `{ device_uuid, tier, deep_reveal_count, deep_reveal_reset_at }` |
| `saveSessionStats(stats)` | `void` |
| `getSessionStats(date)` | stats object or `null` |
| `recordPuzzleAttempt(attempt)` | `void` |

`IndexedDBStore` additionally provides `getAllPuzzleAttempts()` (used only during migration) and `migrateToSupabase(supabaseStore, supabaseClient)`. `SupabaseStore.migrateToSupabase()` exists but throws — it is not part of the shared interface and must never be called on a `SupabaseStore` instance.

## IndexedDB Schema

Database name: `decodec4`, version 1.
Object stores: `profile` (keyPath: `device_uuid`), `puzzle_attempts` (autoIncrement), `session_stats` (keyPath: `date`).

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

Pages live in `src/pages/`. Current pages: `PuzzlesPage` (main puzzle flow).
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
