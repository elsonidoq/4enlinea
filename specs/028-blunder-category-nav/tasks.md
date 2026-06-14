# Tasks: Blunder Category Navigation & Two-Way Links

**Input**: Design documents from `/specs/028-blunder-category-nav/`  
**Branch**: `101-new-design`  
**Date**: 2026-06-10

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (touches a different file from concurrent tasks)
- **[Story]**: User story this task belongs to (US1–US4 from spec.md)

---

## Phase 1: Setup

No new project infrastructure is needed. Epic A (migration 036) is already applied; `game_id` exists on `blunders`, and `gameDate` is already in the `POST /api/games/analyze` response. Implementation begins at Phase 2.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend extension, component extractions, i18n, and shell wiring that all user-story phases depend on.

**⚠️ CRITICAL**: B1 (T002) must complete before B2 (T003) — both touch `MistakesListScreen.jsx`.

- [x] T001 [P] Extend `GET /api/coach/queue` in `connect-four/server/index.js`: (1) read `category` and `game_id` from `req.query`; (2) validate `category` against `VALID_BLUNDER_TAGS` from `server/blunderTags.js`, return `400 { error: 'invalid category' }` on mismatch; (3) validate `game_id` against UUID regex, return `400 { error: 'invalid game_id' }` on mismatch; (4) add `game_id` to the existing `.select(...)` string; (5) apply `.eq('pattern_category', category)` and/or `.eq('game_id', game_id)` when present; (6) add `game_id: b.game_id ?? null` and `moveIndex: (b.board_state || '').length` to the `enriched` map for every blunder object
- [x] T002 [P] Extract `SeverityMeter` from `connect-four/src/screens/MistakesListScreen.jsx` to `connect-four/src/components/SeverityMeter.jsx`: move `SEVERITY_LEVELS`, `severityLevel()`, and the `SeverityMeter` component verbatim; export `SeverityMeter` as a named export; replace the inline definitions in `MistakesListScreen.jsx` with `import { SeverityMeter } from '../components/SeverityMeter'`
- [x] T003 Extract `MistakesGate` from `connect-four/src/screens/MistakesListScreen.jsx` to `connect-four/src/components/MistakesGate.jsx` (depends on T002 — same file): encapsulate the signed-out gate, loading spinner, error state with Retry button, and authenticated-empty state; accept props for `session`, `loading`, `error`, `isEmpty`, and render-callback slots for signed-out and empty-authenticated content; export as named export; replace the inline gate states in `MistakesListScreen.jsx` with `<MistakesGate ...>`
- [x] T004 [P] Add new i18n keys to `connect-four/src/i18n/en.json` under the `mistakes` namespace: `to_review: "{{count}} to review"`, `cat.done: "done"`, `cat.new: "{{count}} new"`, `detail.all_caught_up: "All caught up in this category!"`, `detail.none_reviewed: "None reviewed yet — tap a blunder to study it."`, `detail.meta_count: "{{count}} blunder"`, `detail.meta_count_pl: "{{count}} blunders"`, `detail.source_game: "{{date}} game"`, `pattern.suboptimal_move: "Suboptimal move"`, `pattern.drawing_move: "Drawing move"`. Do NOT add `detail.tab_unreviewed` or `detail.tab_reviewed` — those are duplicates of the existing `mistakes.filter.unreviewed` / `mistakes.filter.reviewed` keys
- [x] T005 [P] Update `connect-four/src/lib/urlMapping.js`: (1) add `{ pattern: '/blunder', screenKey: 'blunderDetail', paramNames: [] }` to `URL_MAP`; (2) add `'blunderDetail'` to `SESSION_ONLY_SCREENS` so cold URL boots redirect to `home`
- [x] T006 [P] Add `blunderDetail: '--bg-home'` to `SURFACE_BG` in `connect-four/src/lib/surfaceGroups.js`

**Checkpoint**: Foundation ready — all user-story phases can now begin

---

## Phase 3: User Story 1 — Browse Mistakes by Category (Priority: P1) 🎯 MVP

**Goal**: Replace the `mistakes` route with a new Level 1 screen grouping blunders by tactical category, sorted by severity.

**Independent Test**: Navigate to `/mistakes` as an authenticated user with blunders in ≥2 categories. Verify: one row per category sorted by `maxSev` desc, board thumbnail, `SeverityMeter`, unreviewed badge or "done" chip, total count, chevron. Tap a row → navigates to `mistakeDetail` with correct `category` param.

- [x] T007 [US1] Create `connect-four/src/screens/CategoryListScreen.jsx` (depends on T002, T003, T004): props `{ go, goBack }`; on mount fetch `GET /api/coach/queue?status=all` with auth header when `session` non-null; group blunders into `CategoryEntry[]` (`{ slug, items, unreviewed, maxSev, thumb }`) sorted by `maxSev` desc (`maxSev === 0` categories at bottom, preserving insertion order within ties); delegate signed-out gate, loading, error, and empty-authenticated states to `<MistakesGate>` — signed-out slot: user icon + "Create free account" → `go('stats')` + "Maybe later" → `go('stats')`; empty-authenticated slot: `<CoachAvatar>` + "No mistakes captured yet" + "Play a game" → `go('difficulty')`; for each category row (inline styles only): compact `Board` thumbnail built from `thumb.board_state` with overlay `[{ c: thumb.move_played, r: buildBoard(thumb.board_state).heights[thumb.move_played], type: 'tr' }]`, category label via `t('mistakes.pattern.' + slug)`, `<SeverityMeter score={maxSev} />`, unreviewed badge (`t('mistakes.cat.new', { count: unreviewed.length })` amber) or "done" chip (`t('mistakes.cat.done')` green) when `unreviewed.length === 0`, total count (`items.length`), chevron; tap → `go('mistakeDetail', { category: slug })`; TopBar: title `t('mistakes.title')`, back → `go('stats')`, meta `t('mistakes.to_review', { count: totalUnreviewed })` when `totalUnreviewed > 0` else omitted; fire `track('screen_viewed', { screen: 'mistake_categories' })` on mount
- [x] T008 [US1] Update `connect-four/src/lib/screenRegistry.jsx` (depends on T007): add import for `CategoryListScreen`; change `mistakes: MistakesListScreen` → `mistakes: CategoryListScreen`; change `mistakeDetail: MistakeDetailScreen` → `mistakeDetail: (p) => <MistakesListScreen {...p} />`; add `blunderDetail: MistakeDetailScreen`

**Checkpoint**: ⚠️ US1 (T007+T008) and US2 (T009) MUST ship atomically — T008 alone is broken. After T008 rewires the `mistakeDetail` route to `MistakesListScreen`, tapping a category row fires `go('mistakeDetail', { category: slug })`, which renders `MistakesListScreen`; without T009 complete, `MistakesListScreen` ignores the `category` param and returns early (null guard). Do NOT deploy T008 until T009 is complete.

---

## Phase 4: User Story 2 — Drill into a Category's Blunder List (Priority: P1)

**Goal**: `MistakesListScreen` accepts a `category` prop from the `mistakeDetail` route and filters/displays blunders for that category with Unreviewed/Reviewed tabs.

**Independent Test**: From Level 1, tap a category row. Verify `MistakesListScreen` shows only that category's blunders, TopBar title is the category name, default tab is "Unreviewed", and switching to "Reviewed" shows only reviewed blunders. Empty-tab messages render correctly. Tapping a blunder card navigates to `blunderDetail` with `mistakeContext: 'list'`.

- [x] T009 [US2] Refactor `connect-four/src/screens/MistakesListScreen.jsx` (depends on T003, T004, T001): (1) add `category` to function signature: `export function MistakesListScreen({ go, goBack, category })`; null-category guard: if `category` is missing or undefined, render null (return early) — do not crash, do not render a flat list (null-category flat-list is explicitly out of scope per Epic B); (2) fetch URL: `?status=all&category=${category}` (category is always set when this screen renders); (3) filter tabs: show only `['unreviewed', 'reviewed']` (grep current tab key to confirm it uses `mistakes.filter.*` — do NOT add new tab keys) with default active tab `'unreviewed'`; (4) TopBar: title = `t('mistakes.pattern.' + category)`; meta = total count (`t('mistakes.detail.meta_count')` / `meta_count_pl`); back = `go('mistakes')`; (5) empty-tab messages: `'unreviewed'` tab empty → `t('mistakes.detail.all_caught_up')`; `'reviewed'` tab empty → `t('mistakes.detail.none_reviewed')`; (6) card tap → `go('blunderDetail', { blunderNavList: currentList, index: i, mistakeContext: 'list', mistakeSource: null })` where `currentList` is the current `filteredBlunders` array; (7) analytics: fire `track('mistake_category_detail_viewed', { category })`

**Checkpoint**: Three-level drill-down is navigable end-to-end with real data. Level 3 still shows stale blunder props until G1 ships.

---

## Phase 5: User Story 3 — Review Individual Blunder with Context (Priority: P2)

**Goal**: `MistakeDetailScreen` accepts the new `blunderNavList`/`index`/`mistakeContext`/`mistakeSource` nav params, renders Prev/Next (no wrap-around), and shows contextual TopBar meta.

**Independent Test**: Tap a blunder card from Level 2. Verify: correct board rendered; TopBar meta shows "Move N / M" (plain text, `displayMoveNumber = blunderNavList[index].moveIndex + 1`); Prev disabled at index 0, Next disabled at last; `deepRevealOpen` resets on each navigation; Back calls `goBack()`. Verify screen does not crash when `blunderNavList` is empty.

- [x] T010 [US3] Refactor `connect-four/src/screens/MistakeDetailScreen.jsx` (depends on T001 — backend adds moveIndex to coach/queue response; depends on T004 for i18n additions; independent of T003/T007): (1) new signature: `export function MistakeDetailScreen({ go, goBack, blunderNavList: navList, index: initialIndex, mistakeContext, mistakeSource })`; (2) internal: `const blunders = navList ?? []`; `const [index, setIndex] = useState(initialIndex ?? 0)`; (3) Back: `mistakeContext === 'game'` → `go('review', { id: mistakeSource.gameId })`; default → `goBack()`; (4) TopBar meta — `displayMoveNumber = blunders[index]?.moveIndex + 1` (1-indexed: `board_state.length + 1`; do NOT omit the +1 — this is locked): when `mistakeSource` present render `<button>` with text `"Move ${displayMoveNumber} / ${mistakeSource.totalMoves} · ${mistakeSource.date} ›"` → `go('review', { id: mistakeSource.gameId })`; when null render plain text `"Move ${displayMoveNumber} / ${blunders.length}"`; (5) Prev/Next: `handlePrev` disabled at `index === 0` (decrement, no modulo); `handleNext` disabled at `index === blunders.length - 1` (increment, no modulo); counter `"${index + 1} of ${blunders.length}"` in toolbar; reset `deepRevealOpen` to `false` on each navigation; (6) empty/out-of-range fallback: render "no blunder found" state when `!blunders[index]`; (7) remove old `_status` param (no longer used)

**Checkpoint**: Full three-level Mistakes surface works for authenticated users navigating from Level 1 → Level 2 → Level 3, with correct Prev/Next and back navigation.

---

## Phase 6: User Story 4 — Navigate from Game Review to Specific Blunder (Priority: P2)

**Goal**: `ReviewScreen` fetches per-game blunders after analysis, formats `gameDate`, and routes `✕` timeline taps (and Prev/Next) to `blunderDetail` when a matching blunder exists.

**Independent Test**: Open a past game in ReviewScreen. Confirm it fetches `GET /api/coach/queue?game_id=<id>` after analysis completes. Tap a `✕` node — verify navigation to `blunderDetail` with `mistakeContext: 'game'`, `mistakeSource` populated, and `blunderNavList` scoped to this game's blunders. Verify tapping a non-`✕` (suboptimal) node still goes to Explorer. Verify `✕` tap with no matching blunder also falls back to Explorer.

- [x] T011 [US4] Add `gameBlunderList` state and post-analyze fetch to `connect-four/src/screens/ReviewScreen.jsx` (depends on T001): add `const [gameBlunderList, setGameBlunderList] = useState([])`; after `setAnalysis(data)` succeeds, if `session` non-null fire `GET ${API}/api/coach/queue?game_id=${id}` with `Authorization: Bearer ${session.access_token}` header; on success parse `data.blunders`, sort by `moveIndex` asc, call `setGameBlunderList(sorted)`; on error or non-ok response call `setGameBlunderList([])`
- [x] T012 [US4] Add `gameDate` state and formatting to `connect-four/src/screens/ReviewScreen.jsx` (depends on T011 — same file, must follow T011 in sequence): add `const [gameDate, setGameDate] = useState('')`; after `setAnalysis(data)` derive `formatted = data.gameDate ? new Date(data.gameDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''`; call `setGameDate(formatted)`
- [x] T013 [US4] Update the `✕`-node click handler in `connect-four/src/screens/ReviewScreen.jsx` (depends on T011, T012): for `quality === 'blunder'` timeline nodes compute `globalPlyIndex = analysis.side === 'first' ? 2 * (move.moveIndex - 1) : 2 * (move.moveIndex - 1) + 1`; look up `matchedIdx = gameBlunderList.findIndex(b => b.moveIndex === globalPlyIndex)`; if found navigate `go('blunderDetail', { blunderNavList: gameBlunderList, index: matchedIdx, mistakeContext: 'game', mistakeSource: { date: gameDate, gameId: id, totalMoves: analysis.fullMovestring.length } })`; if not found fall back to the existing `go('explorer', ...)` call (FR-033); non-`✕` nodes (suboptimal, optimal) continue to navigate to Explorer unchanged
- [x] T014 [US4] Update the existing `navigateToMistake(moveIndex)` function in `connect-four/src/screens/ReviewScreen.jsx` to branch on blunder quality (depends on T011, T013): (1) resolve the move object: `const move = analysis.moves.find(m => m.moveIndex === moveIndex)`; (2) compute `globalPlyIndex` using the same formula as H3: `analysis.side === 'first' ? 2 * (moveIndex - 1) : 2 * (moveIndex - 1) + 1`; (3) if `move?.quality === 'blunder'` and `gameBlunderList.findIndex(b => b.moveIndex === globalPlyIndex)` returns `matchedIdx !== -1`, navigate to `go('blunderDetail', { blunderNavList: gameBlunderList, index: matchedIdx, mistakeContext: 'game', mistakeSource: { date: gameDate, gameId: id, totalMoves: analysis.fullMovestring.length } })`; (4) otherwise (non-blunder quality, or blunder with no matching entry in gameBlunderList) navigate to the existing `go('explorer', ...)` call with existing Explorer params; do NOT extract a new `navigateToPrevNextMove` helper — update the existing `navigateToMistake` function in place

**Checkpoint**: Tapping a `✕` node in any past game's ReviewScreen navigates directly to that blunder in `MistakeDetailScreen` with back-link to the source game. The full two-way navigation between games and blunders is functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T015 [P] Update `docs/architecture/api-conventions.md`: add `?category=<slug>` and `?game_id=<uuid>` optional params, the new `game_id` and `moveIndex` response fields, and the new 400 error codes to the `GET /api/coach/queue` endpoint section
- [x] T016 [P] Update `docs/architecture/frontend-conventions.md`: add the three-level Mistakes route hierarchy (Level 1 `CategoryListScreen` → Level 2 `MistakesListScreen` with `category` prop → Level 3 `MistakeDetailScreen` with `blunderNavList`) and document `blunderDetail` in the `SESSION_ONLY_SCREENS` table

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 2 (Foundational)**: No hard prerequisites — start immediately
  - T001, T002, T004, T005, T006 are all [P] — can run simultaneously
  - T003 must follow T002 (both modify `MistakesListScreen.jsx`)
- **Phase 3 (US1)**: Requires T002, T003, T004 complete; T005/T006 must exist before T008
- **Phase 4 (US2)**: Requires T003, T004, T001 complete; T009 (US2) must be deployed atomically with T008 (US1) — see Phase 3 checkpoint
- **Phase 5 (US3)**: Requires T004 (i18n); otherwise independent
- **Phase 6 (US4)**: Requires T001 complete (backend `?game_id` param); T011 → T012 → T013 → T014 sequential (same file)
- **Phase 7 (Docs)**: After all implementation phases

### User Story Dependencies

- **US1 (P1)**: Depends on T002 (SeverityMeter), T003 (MistakesGate), T004 (i18n), then T007 → T008
- **US2 (P1)**: Depends on T003 (MistakesGate), T004 (i18n), T001 (backend: adds category filter to coach/queue); must ship atomically with US1 — neither US1 (T008) nor US2 (T009) is demoable in isolation; US2 must be complete before US1/T008 is deployed
- **US3 (P2)**: Depends on T001 (backend: adds moveIndex to coach/queue response) and T004 (i18n); can begin after Foundational phase independent of US1/US2
- **US4 (P2)**: Depends on T001 (backend); the four H-tasks are strictly sequential (same file)

### Parallel Opportunities

```bash
# Foundational phase — all these can run simultaneously:
T001  # server/index.js — backend only
T002  # creates SeverityMeter.jsx, modifies MistakesListScreen.jsx
T004  # en.json only
T005  # urlMapping.js only
T006  # surfaceGroups.js only
# T003 starts after T002 finishes (same file: MistakesListScreen.jsx)

# After Foundational completes:
T007 (US1) + T009 (US2) + T010 (US3) + T011 (US4) — different files, can all start in parallel
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 2: Foundational (all 6 tasks)
2. Complete Phase 3: US1 (T007 → T008)
3. Complete Phase 4: US2 (T009)
4. **STOP and VALIDATE**: Navigate the three-level drill-down end-to-end
5. Proceed to US3 (T010) for the Prev/Next and context improvements
6. Proceed to US4 (T011–T014) for the game → blunder two-way link

### Incremental Delivery

1. Foundational → US1 + US2 = full category drill-down (SC-001, SC-004)
2. + US3 = contextual blunder detail with Prev/Next (SC-003)
3. + US4 = two-way game/blunder navigation (SC-002)
4. Docs = constitution compliance (Phase 7)

---

## Notes

- `data-model.md` lists `mistakes.detail.tab_unreviewed` and `mistakes.detail.tab_reviewed` as new i18n keys — **do NOT add them**. Spec FR-039 explicitly prohibits these (they duplicate `mistakes.filter.unreviewed` / `mistakes.filter.reviewed` which already exist). T004 must not include those keys.
- **US1 + US2 atomicity**: US1 (T007+T008, screen registry repoint) and US2 (T009, blunder card tap rewrite) MUST ship in the same deployment. US1 alone breaks the app — tapping a category after T008 renders `MistakesListScreen` which returns early (null guard) without T009. US2 must be complete before T008 is deployed.
- **Null-category is out of scope**: `MistakesListScreen` renders null when `category` is missing. A cross-category flat list is explicitly NOT included in this epic (Epic B). The null guard is a safety net only, not a feature.
- `displayMoveNumber = blunderNavList[index].moveIndex + 1` is locked (1-indexed). The plan.md Phase G note says "Epic B's text used no +1 — that wording is superseded; do not revert."
- For T009, grep `MistakesListScreen.jsx` for the current tab key string before wiring tabs — confirm it uses `mistakes.filter.*` not any custom keys.
- `blunderDetail` must be in BOTH `URL_MAP` and `SESSION_ONLY_SCREENS` (T005). Cold-boot to `/blunder` must redirect to `home` — this is what `SESSION_ONLY_SCREENS` enforces.
- T013/T014 use `analysis.side` which is already present in the analyze response (Decision 6 in research.md) — no additional fetch is needed.
