# Implementation Plan: Blunder Category Navigation & Two-Way Links

**Branch**: `101-new-design` | **Date**: 2026-06-10 | **Spec**: `specs/028-blunder-category-nav/spec.md`

---

## Summary

Redesign the Past Mistakes surface with a three-level drill-down (Category List → Blunder List → Blunder Detail) and add two-way navigation between blunders and their source sparring games. Depends on Epic A (migration 036 already landed — `game_id` column on `blunders`, `gameDate` in analyze response).

The implementation is backend-light (two optional params on an existing endpoint) and frontend-heavy (one new screen, two refactored screens, three route changes, one component extraction).

---

## Technical Context

**Language/Version**: JavaScript (ES2022), React 18, Node 20  
**Primary Dependencies**: React, react-i18next, Supabase JS client  
**Storage**: Supabase Postgres (no new migrations; Epic A migration 036 already applied)  
**Testing**: `npm run test:fast` in `connect-four/` (node --test for server unit tests)  
**Target Platform**: Web SPA (mobile-first PWA)  
**Project Type**: Web application (monorepo: `connect-four/server/` + `connect-four/src/`)  
**Performance Goals**: Screen transitions < 200ms; API responses under existing caps  
**Constraints**: Inline styles only in production screens (no new CSS class names); Navigator params spread as direct props; `blunderNavList` never serialised to URL

---

## Constitution Check

**Principle I (Explanation Engine)**: ✅ This feature reads blunder data (already explained via the engine at capture time). No new move explanations or pattern labels are produced independently.

**Principle II (Code Quality)**: ✅ `SeverityMeter` extracted because it gains two callers (`CategoryListScreen` renders it per-row with `score = maxSev`; `MistakesListScreen` renders it on blunder cards). `MistakesGate` extracted because it gains two callers (`CategoryListScreen` + `MistakesListScreen`). No speculative abstractions. The `CategoryEntry` grouping logic is inline in `CategoryListScreen` (only one caller).

**Principle III (Testing Standards)**: ✅ No solver-dependent logic is added. UI changes verified manually on golden path. No random board generation.

**Principle IV (UX Consistency)**: ✅ Same `SeverityMeter` visual output across Level 1 and Level 2. Pattern labels use existing `mistakes.pattern.*` keys. Inline board thumbnails use existing `Board` component API.

**Principle V (Performance)**: ✅ `GET /api/coach/queue?status=all` is a single query (existing cap: 50 rows). `GET /api/coach/queue?game_id=<uuid>` is a filtered single query. No blocking operations; loading spinners on all async states.

**Principle VI (Debugging Methodology)**: ✅ `moveIndex` derivation formula verified empirically against `analysis.side` and `move.moveIndex` semantics from api-conventions.md before writing FR-032 tasks. `gameDate` presence confirmed via `rg` before declaring FR-004 already satisfied.

**Principle VII (Software Design)**: ✅ Flat navigation param shapes; no nested state objects; explicit fallback defaults for all optional nav params.

**Principle VIII (Documentation)**: ✅ `api-conventions.md` must be updated with `GET /api/coach/queue` new params. `frontend-conventions.md` must document the three-level Mistakes route hierarchy.

---

## Project Structure

```text
connect-four/
├── server/
│   └── index.js                         # GET /api/coach/queue: add ?category + ?game_id
├── src/
│   ├── components/
│   │   ├── SeverityMeter.jsx            # extracted from MistakesListScreen (callers: MistakesListScreen + CategoryListScreen)
│   │   └── MistakesGate.jsx             # extracted from MistakesListScreen (callers: MistakesListScreen + CategoryListScreen)
│   ├── screens/
│   │   ├── CategoryListScreen.jsx       # NEW — Level 1 mistakes route
│   │   ├── MistakesListScreen.jsx       # MODIFIED — Level 2, gains category prop
│   │   └── MistakeDetailScreen.jsx      # MODIFIED — Level 3, new nav params
│   ├── lib/
│   │   ├── screenRegistry.jsx           # route rewiring
│   │   ├── urlMapping.js                # blunderDetail route + SESSION_ONLY
│   │   └── surfaceGroups.js             # blunderDetail → --bg-home
│   └── i18n/
│       └── en.json                      # new mistakes.* keys
└── src/screens/
    └── ReviewScreen.jsx                 # add gameBlunderList fetch + timeline tap update

specs/028-blunder-category-nav/
├── plan.md              # this file
├── research.md          # Phase 0 decisions
├── data-model.md        # entity shapes + i18n additions
└── contracts/
    └── api.md           # GET /api/coach/queue extended contract
```

---

## Implementation Phases

### Phase A — Backend (unblocks all frontend work)

**A1 — Extend `GET /api/coach/queue`**

Changes to `server/index.js`:

1. After `const status = req.query.status || 'all'`, read `category` and `game_id` from `req.query`.
2. Validate `category`: if present, must be in `VALID_BLUNDER_TAGS`; return `400 { error: 'invalid category' }` otherwise.
3. Validate `game_id`: if present, must match UUID regex `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`; return `400 { error: 'invalid game_id' }` otherwise.
4. Add `game_id` to the `.select(...)` string.
5. After the status filter, conditionally add `.eq('pattern_category', category)` and/or `.eq('game_id', game_id)`.
6. In the `enriched` map, add `game_id: b.game_id ?? null` and `moveIndex: (b.board_state || '').length` to each object.

**No other server changes needed.** `gameDate` is already in `POST /api/games/analyze` response. `POST /api/blunders` is unaffected.

---

### Phase B — Component extraction (unblocks CategoryListScreen and MistakesListScreen refactor)

**B1 — Extract `SeverityMeter`**

Create `connect-four/src/components/SeverityMeter.jsx`:
- Move `SEVERITY_LEVELS`, `severityLevel()`, and `SeverityMeter` component verbatim from `MistakesListScreen.jsx`.
- Export `SeverityMeter` as named export.
- Update `MistakesListScreen.jsx` to import from `../components/SeverityMeter.jsx`.

Two concrete callers after extraction: `MistakesListScreen` (existing blunder cards) and `CategoryListScreen` (category rows display `SeverityMeter` with `score = maxSev`; see Phase E and FR-010).

**B2 — Extract `MistakesGate`**

Create `connect-four/src/components/MistakesGate.jsx`:
- Extract the signed-out gate, loading spinner, error state (with Retry button), and authenticated-empty state from `MistakesListScreen.jsx`.
- Export `MistakesGate` as named export. Accept props for session/loading/error/data presence and render callbacks (or slot props) for the signed-out and empty-authenticated content — the exact prop shape should be driven by the two callers' diverging empty-state CTAs.
- Update `MistakesListScreen.jsx` to use `MistakesGate` for its non-populated states.

Two concrete callers: `MistakesListScreen` (existing gate logic; refactored in F1) and `CategoryListScreen` (new; Phase E uses it for FR-012 states).

B2 MUST precede both E1 (CategoryListScreen) and F1 (MistakesListScreen refactor).

---

### Phase C — i18n additions (unblocks all screens)

**C1 — Add new keys to `en.json`**

Add under `mistakes`:
- `to_review`: `"{{count}} to review"`
- `cat.done`: `"done"`
- `cat.new`: `"{{count}} new"`
- `detail.all_caught_up`: `"All caught up in this category!"`
- `detail.none_reviewed`: `"None reviewed yet — tap a blunder to study it."`
- `detail.meta_count`: `"{{count}} blunder"`
- `detail.meta_count_pl`: `"{{count}} blunders"`
- `detail.source_game`: `"{{date}} game"`
- `pattern.suboptimal_move`: `"Suboptimal move"`
- `pattern.drawing_move`: `"Drawing move"`

Do NOT add `detail.tab_unreviewed` or `detail.tab_reviewed`. The "Unreviewed" / "Reviewed" tab labels in `MistakesListScreen` already exist as `mistakes.filter.unreviewed` and `mistakes.filter.reviewed` — reuse those keys.

---

### Phase D — App shell wiring (can be done in parallel with E/F/G)

**D1 — `urlMapping.js`**
- Add `{ pattern: '/blunder', screenKey: 'blunderDetail', paramNames: [] }` to `URL_MAP`.
- Add `'blunderDetail'` to `SESSION_ONLY_SCREENS`.

**D2 — `surfaceGroups.js`**
- Add `blunderDetail: '--bg-home'` to `SURFACE_BG`.

**D3 — `screenRegistry.jsx`**
- Add import for `CategoryListScreen` (once the file exists).
- Change `mistakes: MistakesListScreen` → `mistakes: CategoryListScreen`.
- Change `mistakeDetail: MistakeDetailScreen` → `mistakeDetail: (p) => <MistakesListScreen {...p} />`.
- Add `blunderDetail: MistakeDetailScreen`.

Note: D3 must be done after `CategoryListScreen.jsx` exists (Phase E). D1 and D2 can be done at any time.

---

### Phase E — `CategoryListScreen` (new, Level 1)

**E1 — Create `CategoryListScreen.jsx`**

File: `connect-four/src/screens/CategoryListScreen.jsx`

Props: `{ go, goBack }` (no nav params; this is the top-level entry point)

Non-populated states (gate, loading, error, empty): rendered via `MistakesGate` (B2). Pass `session`, `loading`, `error`, and `blunders.length === 0` flags plus the signed-out and empty-authenticated slot content specific to this screen (signed-out: user icon, heading, CTA → `go('stats')`, "Maybe later" → `go('stats')`; empty: `CoachAvatar`, "No mistakes captured yet", "Play a game" → `go('difficulty')`).

State:
5. **Populated**: list of category rows (rendered directly by `CategoryListScreen` when `MistakesGate` passes through).

Data flow:
- `useEffect` on mount: if `session`, fetch `GET /api/coach/queue?status=all` with auth header.
- Group blunders by `pattern_category` → `CategoryEntry[]` (see data-model.md).
- Sort: `maxSev` desc; `maxSev === 0` at bottom.

TopBar:
- Title: `t('mistakes.title')`
- Back: `go('stats')`
- Meta: `"{{totalUnreviewed}} to review"` when `totalUnreviewed > 0` (using `t('mistakes.to_review', { count: totalUnreviewed })`); omitted otherwise.

Category row layout (inline styles only):
- Flex row. Left: `Board` compact thumbnail built from `thumb.board_state` with overlay `[{ c: thumb.move_played, r: buildBoard(thumb.board_state).heights[thumb.move_played], type: 'tr' }]`.
- Body: `t('mistakes.pattern.' + slug)` label; `<SeverityMeter score={maxSev} />` (imported from `../components/SeverityMeter`); unreviewed badge (`t('mistakes.cat.new', { count: unreviewed.length })` in amber) or "done" chip (`t('mistakes.cat.done')` in green) when `unreviewed.length === 0`.
- Right: total count (`items.length`), chevron icon.

Tap: `go('mistakeDetail', { category: slug })`.

Analytics: `track('screen_viewed', { screen: 'mistake_categories' })` on mount.

---

### Phase F — `MistakesListScreen` refactor (Level 2)

**F1 — Accept `category` prop and update behavior**

Changes to `MistakesListScreen.jsx`:

1. Add `category` to the function signature: `export function MistakesListScreen({ go, goBack, category })`.
1a. Null guard: if `category` is null or undefined, return null immediately — do not render any content. Null-category cross-category flat view is explicitly out of scope (Epic B "NOT included").
2a. Replace the inline signed-out gate, loading, error, and authenticated-empty states with `<MistakesGate ...>` (imported from `../components/MistakesGate`). Pass the empty-authenticated slot content specific to this screen (existing "No mistakes yet" copy + "Play a game" CTA).
2. Fetch URL: `${API}/api/coach/queue?status=all&category=${category}` (category is always set when this screen renders past the null guard).
3. Filter tabs: show only `['unreviewed', 'reviewed']`; default active tab `'unreviewed'`.
4. TopBar:
   - Title: `t('mistakes.pattern.' + category)`.
   - Meta: total blunder count (`t('mistakes.detail.meta_count', { count })` / plural).
   - Back: `go('mistakes')`.
5. Empty-tab messages:
   - `'unreviewed'` tab + empty: `t('mistakes.detail.all_caught_up')`.
   - `'reviewed'` tab + empty: `t('mistakes.detail.none_reviewed')`.
6. Card tap: `go('blunderDetail', { blunderNavList: currentList, index: i, mistakeContext: 'list', mistakeSource: null })` where `currentList` is the current `filteredBlunders` array.
7. Analytics: fire `track('mistake_category_detail_viewed', { category })`.

---

### Phase G — `MistakeDetailScreen` refactor (Level 3)

**G1 — Replace nav param shape**

Changes to `MistakeDetailScreen.jsx`:

1. New signature: `export function MistakeDetailScreen({ go, goBack, blunderNavList: navList, index: initialIndex, mistakeContext, mistakeSource })`.
2. Internal: `const blunders = navList ?? []`; `const [index, setIndex] = useState(initialIndex ?? 0)`.
3. Back button behavior:
   - `mistakeContext === 'game'`: `go('review', { id: mistakeSource.gameId })`.
   - default/`'list'`: `goBack()`.
4. TopBar meta:
   - `mistakeSource` present: render `<button>` with text `"Move ${displayMoveNumber} / ${mistakeSource.totalMoves} · ${mistakeSource.date} ›"` → `go('review', { id: mistakeSource.gameId })`.
   - `mistakeSource` null: render plain text `"Move ${displayMoveNumber} / ${blunders.length}"`.
   - `displayMoveNumber = blunders[index]?.moveIndex + 1` (1-indexed; `moveIndex` = `board_state.length`, so display = `board_state.length + 1`). Note: Epic B's text used "N = board_state.length" (no +1) — that wording is **superseded** by this decision; do not revert to no-+1.
5. Toolbar Prev/Next — replace wrap-around with bounds check:
   - `handlePrev`: disabled when `index === 0`; decrement `index` (no modulo).
   - `handleNext`: disabled when `index === blunders.length - 1`; increment `index` (no modulo).
   - Counter: `"${index + 1} of ${blunders.length}"` displayed in toolbar between buttons.
   - `deepRevealOpen` resets to `false` on each nav.
6. Fallback for empty/out-of-range: render "no blunder found" state when `!blunder` (existing null guard already present, update text).
7. Remove `_status` param (no longer used).

---

### Phase H — `ReviewScreen` changes (FR-031, FR-032, FR-033, FR-034)

**H1 — Fetch game blunders after analyze**

After `setAnalysis(data)` in the `fetch` success handler, if `session` is non-null:
```js
fetch(`${API}/api/coach/queue?game_id=${id}`, {
  headers: { Authorization: `Bearer ${session.access_token}` },
})
  .then(r => r.ok ? r.json() : { blunders: [] })
  .then(data => {
    const sorted = (data.blunders || []).slice().sort((a, b) => a.moveIndex - b.moveIndex);
    setGameBlunderList(sorted);
  })
  .catch(() => setGameBlunderList([]));
```

Add `const [gameBlunderList, setGameBlunderList] = useState([])`.

**H2 — Format `gameDate` (FR-034)**

After `setAnalysis(data)`:
```js
const raw = data.gameDate; // ISO 8601
const formatted = raw
  ? new Date(raw).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  : '';
setGameDate(formatted);
```

Add `const [gameDate, setGameDate] = useState('')`.

**H3 — Update timeline tap handler (FR-032, FR-033)**

In the move timeline `onClick` handler, for `quality === 'blunder'` nodes (currently navigates to `go('explorer', ...)`):

```js
const side = analysis.side; // 'first' | 'second'
const globalPlyIndex = side === 'first'
  ? 2 * (move.moveIndex - 1)
  : 2 * (move.moveIndex - 1) + 1;

const matchedIdx = gameBlunderList.findIndex(b => b.moveIndex === globalPlyIndex);

if (matchedIdx !== -1) {
  go('blunderDetail', {
    blunderNavList: gameBlunderList,
    index: matchedIdx,
    mistakeContext: 'game',
    mistakeSource: {
      date: gameDate,
      gameId: id,
      totalMoves: analysis.fullMovestring.length,
    },
  });
} else {
  // FR-033 fallback: no matching blunder (anonymous, race condition, or pre-036)
  go('explorer', {
    gameId: id,
    moveIndex: move.moveIndex,
    moves: analysis.moves,
    difficulty: analysis.difficulty,
    side: analysis.side,
    fullMovestring: analysis.fullMovestring,
  });
}
```

Note: `quality !== 'blunder'` nodes (suboptimal, optimal) continue to navigate to `go('explorer', ...)` unchanged.

**H4 — Update Prev/Next handler for blunder routing (FR-032 complement)**

In `ReviewScreen.jsx`, update the existing `navigateToMistake(moveIndex)` function (which takes a number, not a move object). Apply the same blunder-vs-suboptimal branching as H3:

```js
function navigateToMistake(moveIndex) {
  // Resolve the move object from analysis
  const move = analysis.moves.find(m => m.moveIndex === moveIndex);

  if (move?.quality === 'blunder') {
    const globalPlyIndex = analysis.side === 'first'
      ? 2 * (moveIndex - 1)
      : 2 * (moveIndex - 1) + 1;
    const matchedIdx = gameBlunderList.findIndex(b => b.moveIndex === globalPlyIndex);
    if (matchedIdx !== -1) {
      go('blunderDetail', {
        blunderNavList: gameBlunderList,
        index: matchedIdx,
        mistakeContext: 'game',
        mistakeSource: { date: gameDate, gameId: id, totalMoves: analysis.fullMovestring.length },
      });
      return;
    }
  }
  // suboptimal nodes, or blunder with no match → Explorer fallback
  go('explorer', {
    gameId: id,
    moveIndex,
    moves: analysis.moves,
    difficulty: analysis.difficulty,
    side: analysis.side,
    fullMovestring: analysis.fullMovestring,
  });
}
```

This step depends on A1 (needs `gameBlunderList` to be populated) and H1 (state variable must exist). Update the existing `navigateToMistake` function in place — do NOT extract a new `navigateToPrevNextMove` helper. Note: `navigateToMistake` already takes `moveIndex` as a number; resolve the move object via `analysis.moves.find` inside the function before branching on `quality`.

---

### Phase I — Documentation updates (Principle VIII)

**I1 — Update `docs/architecture/api-conventions.md`**

Add new `GET /api/coach/queue` params (`?category`, `?game_id`) and new response fields (`game_id`, `moveIndex`) to the existing coach endpoint section.

**I2 — Update `docs/architecture/frontend-conventions.md`**

Add to the Surface group table and document the three-level Mistakes route hierarchy (Level 1 → `CategoryListScreen`, Level 2 → `MistakesListScreen` with `category`, Level 3 → `MistakeDetailScreen` with `blunderNavList`).

---

## Sequencing & Dependencies

```
A1 (backend)
  ├── unblocks H3 (ReviewScreen timeline tap needs ?game_id endpoint)
  ├── unblocks H4 (Prev/Next blunder routing also needs gameBlunderList from A1)
  └── unblocks F1 (MistakesListScreen needs ?category param)

B1 (SeverityMeter extraction)
  └── unblocks E1 (CategoryListScreen imports SeverityMeter per-row)

B2 (MistakesGate extraction)
  ├── unblocks E1 (CategoryListScreen uses MistakesGate for non-populated states)
  └── unblocks F1 (MistakesListScreen refactor replaces inline gate with MistakesGate)

C1 (i18n)
  └── unblocks E1, F1, G1 (all screens use new keys)

D1, D2 (urlMapping, surfaceGroups)
  └── no dependencies; can be done immediately

E1 (CategoryListScreen)
  ├── requires B1 (SeverityMeter), B2 (MistakesGate), and C1 (i18n)
  └── unblocks D3 (screenRegistry import of CategoryListScreen)

D3 (screenRegistry)
  └── requires E1 (CategoryListScreen must exist)

F1 (MistakesListScreen refactor)
  └── requires B2 (MistakesGate), C1 (i18n); A1 helpful but not strictly blocking

G1 (MistakeDetailScreen refactor)
  └── requires C1 (i18n); independent of A1/F1

H1+H2+H3+H4 (ReviewScreen)
  └── requires A1 (game_id query param); H4 also requires H1 (gameBlunderList state); independent of E1/F1/G1

I1, I2 (docs)
  └── can be done last, after all implementation tasks
```

**Recommended task order**: A1 → B1 → B2 → C1 → D1 → D2 → G1 → F1 → E1 → D3 → H1+H2+H3+H4 → I1 → I2

---

## Complexity Tracking

No constitution violations. All new abstractions have two or more concrete callers at the time of extraction.

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| `move.quality === 'blunder'` is not the current discriminator for timeline nodes (currently all non-optimal nodes navigate to explorer) | Read `ReviewScreen.jsx` lines 264–278 before writing H3; the current condition is `isOptimal ? undefined : () => go('explorer', ...)`. FR-032 scopes only to `quality === 'blunder'` — suboptimal nodes continue to explorer. |
| `analysis.side` may not be available at timeline render time | `analysis.side` is set in `setAnalysis(data)` on line 99 of ReviewScreen — same React state as `analysis.moves`. Both are available when the timeline renders. |
| `gameBlunderList` may be empty (anonymous user, race condition) | FR-033 fallback handles this. `matchedIdx === -1` → explorer. |
| `blunders[index]?.moveIndex` is undefined for old blunders (pre-Epic A) | `moveIndex = (board_state || '').length` — always a valid integer. Old blunders have a board_state string, so `moveIndex` is computable even if `game_id` is null. |
| Category row thumbnail board: `buildBoard('')` must not crash for empty `board_state` | `buildBoard('')` returns an all-empty board with `heights = [0,0,0,0,0,0,0]`. Guard: if `thumb.board_state` is empty/null, use `''` as default. The played-cell overlay row = `heights[move_played]` = 0, which is valid. |
