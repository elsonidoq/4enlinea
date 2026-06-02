# Tasks: Past Mistakes Review (Epic 3c)

**Input**: Design documents from /specs/017-past-mistakes-review/
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/api.md, quickstart.md
**Tests**: Not requested in the specification — manual QA gates defined in quickstart.md.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: [ID] [P?] [Story] Description

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: No project initialization needed — the project exists and all dependencies are installed.

**Skip**: No setup tasks required. Existing project structure, dependencies, and configuration are sufficient.

---

## Phase 2: Foundational (Enabling Tasks)

**Purpose**: Backend endpoint changes, i18n keys, and screen registration that enable all three user stories. These are NOT blocking for parallel frontend development (screens can be built with mock data), but MUST be complete before manual QA.

**Note on parallel development**: Backend tasks (T001, T002) and frontend preparation tasks (T003, T004) touch completely different files and can be developed in parallel. Frontend screens T005–T006 can also be built with mock data before the backend is ready.

- [ ] T001 [P] Backend: Redesign `GET /api/coach/queue` in connect-four/server/index.js
      - Remove `requirePaid` middleware; add inline `requireAuth` check (`if (!req.user) return res.status(401).json({ error: 'unauthorized' })`)
      - Add `?status` query param: `all` (default), `unreviewed` (resolved_at IS NULL), `reviewed` (resolved_at IS NOT NULL)
      - Remove the `puzzles` join from the Supabase query (FR-024); select only from `blunders` table
      - Select fields: `id, board_state, move_played, correct_move, pattern_category, created_at, resolved_at`
      - Remove `resolved_at` filter from query when `status=all` (currently hardcoded to `.is('resolved_at', null)`)
      - Apply `.is('resolved_at', null)` when `status=unreviewed`, `.not('resolved_at', 'is', null)` when `status=reviewed`
      - After fetching blunders, compute `threat_cells` for each blunder:
        - Build a post-blunder Board: `new Board(board_state + String(move_played))`
        - Determine opponent: `postBoard.currentPlayer` (opponent's turn after blunder move)
        - Call `postBoard.majorThreatCells()` (returns `"row,col"` → `{ rm, rn, ym, yn }` map)
        - Filter entries where `opponent === 1 ? flags.rm : flags.ym` (rm = Red major threat, ym = Yellow major threat)
        - Map to `{ col, row }` objects (key.split(',').map(Number) gives `[row, col]`)
      - Return new shape: `{ blunders: [...], total: number }` instead of old `{ queueCount, puzzle }` shape
      - Cap at 50 rows, ordered by `created_at` ascending
      - Edge cases: empty `board_state` still works; invalid movestring from `board_state + move_played` is handled gracefully by `new Board()` (colHeights handles it)
      - Note: `Board` class is already imported from `./classifier.js` at line 9

- [ ] T002 [P] Backend: Fix `POST /api/coach/queue/:blunderId/resolve` in connect-four/server/index.js
      - Remove `requirePaid` middleware; add inline `requireAuth` check (same pattern as T001)
      - Replace `parseInt(req.params.blunderId, 10)` with raw `req.params.blunderId` string
      - Replace `isNaN(blunderId)` check with: `if (!blunderId || typeof blunderId !== 'string') return res.status(400).json({ error: 'invalid blunder id' })`
      - Ownership check (`.eq('user_id', req.user.id)`) stays unchanged
      - Response: `204 No Content` on success
      - Note: `blunders.id` is UUID (`gen_random_uuid()` in `003_puzzles.sql`) — `parseInt` of UUID returns `NaN` for every real blunder, making the current endpoint completely broken

- [ ] T003 [P] i18n: Add `mistakes.*` keys to connect-four/src/i18n/en.json
      - Insert the full `mistakes` block (from data-model.md) after the `sparring` block (around line 295)
      - Keys to add:
        - `mistakes.title`: "Past Mistakes"
        - `mistakes.reviewed`: "Reviewed"
        - `mistakes.emptyFilter`: "Nothing here — switch tabs to see your other moves."
        - `mistakes.gate.heading`: "Sign up to save your mistakes"
        - `mistakes.gate.body`: "Create a free account and DecodeC4 will remember every blunder so you can review them with the Coach later."
        - `mistakes.gate.cta`: "Create free account"
        - `mistakes.gate.later`: "Maybe later"
        - `mistakes.empty.heading`: "No mistakes captured yet"
        - `mistakes.empty.body`: "Play a game and review it afterwards — I'll collect the tricky moments here so we can study them together."
        - `mistakes.empty.cta`: "Play a game"
        - `mistakes.filter.all`: "All"
        - `mistakes.filter.unreviewed`: "Unreviewed"
        - `mistakes.filter.reviewed`: "Reviewed"
        - `mistakes.pattern.*`: One key per pattern slug (immediate_threat, forced_block, double_threat, forced_win, forbidden_columns, z_threat, claimeven, undercut, overcut, figure_7, j_shape)
        - `mistakes.detail.topbarTitle`: "Mistake"
        - `mistakes.detail.moveLabel`: "Move {{n}}"
        - `mistakes.detail.coach.line1`: "You played column {{n}} here."
        - `mistakes.detail.coach.line2`: "Let me show you what worked better."
        - `mistakes.detail.legend.yourMove`: "your move"
        - `mistakes.detail.legend.opponentThreat`: "opponent threat"
        - `mistakes.detail.whatShouldIHave`: "What should I have played?"
        - `mistakes.detail.markReviewed`: "Mark as reviewed"
        - `mistakes.detail.markedReviewed`: "Marked as reviewed"
      - Use the exact key values from data-model.md section on i18n Keys
      - Note: `mistakes.pattern` does NOT include an `unknown` key — unknown patterns are hidden via a `!== 'unknown'` guard, not via i18n

- [ ] T004 [P] Registry: Register `MistakesListScreen` and `MistakeDetailScreen` in connect-four/src/lib/screenRegistry.jsx
      - Import `MistakesListScreen` from `../screens/MistakesListScreen.jsx`
      - Import `MistakeDetailScreen` from `../screens/MistakeDetailScreen.jsx`
      - Replace the two `PlaceholderScreen` entries:
        - `mistakes: (props) => <PlaceholderScreen {...props} screenKey="mistakes" />` → `mistakes: MistakesListScreen`
        - `mistakeDetail: (props) => <PlaceholderScreen {...props} screenKey="mistakeDetail" />` → `mistakeDetail: MistakeDetailScreen`
      - Note: `surfaceGroups.js` already maps both routes to `--bg-home` (verified in research.md). No changes needed there.

**Checkpoint**: Foundation ready — backend serves blunder data, i18n strings available, screen routes registered. User story implementation can now begin.

---

## Phase 3: User Story 1 — Browse Past Blunders (Priority: P1) 🎯 MVP

**Goal**: Authenticated users can navigate from Stats to a scrollable list of blunder cards with compact board thumbnails, pattern tags, dates, filter tabs (All/Unreviewed/Reviewed), and Reviewed badge. Anonymous gate and empty state variants render correctly.

**Independent Test**: Sign in with blunders in DB, navigate `go('mistakes')` from Stats, verify blunder cards render with correct board thumbnails and metadata. Tap Unreviewed tab — only unresolved blunders shown. Tap Reviewed with no reviewed blunders — empty filter message shown. Sign out and navigate — anonymous gate shown. Sign in with no blunders — empty state shown.

- [ ] T005 [US1] Build `MistakesListScreen` at connect-four/src/screens/MistakesListScreen.jsx
      - **Three variants** determined by authentication and data state:
        1. **Anonymous gate** (`!session`): Show user icon circle, `t('mistakes.gate.heading')`, `t('mistakes.gate.body')`, "Create free account" button (calls sign-up flow), "Maybe later" ghost button — both navigate to `stats` via `go('stats')`. No API call to `/api/coach/queue` is made.
        2. **Empty state** (`blunders.length === 0` after fetch): Show CoachAvatar (happy, size 88), `t('mistakes.empty.heading')`, `t('mistakes.empty.body')`, "Play a game" CTA button → navigates to `difficulty`.
        3. **Populated list** (`blunders.length > 0`): Show filter tabs row (All / Unreviewed / Reviewed), scrollable list of blunder cards, each with:
           - Compact non-interactive Board thumbnail (using `buildBoard` on `board_state`)
           - `tr` overlay on `(move_played, heights[move_played])` — the landing row of the blunder disc
           - `td` overlays on each cell in `threat_cells`
           - Pattern category tag (hidden when `pattern_category === 'unknown'`)
           - Date string from `created_at`
           - "Reviewed" chip when `resolved_at` is set
           - Tapping a card: `go('mistakeDetail', { blunders, index: i, status: currentFilter })`
      - **State management**:
        - `blunders: Blunder[]` — initial `[]`
        - `loading: boolean` — initial `true`
        - `error: string | null` — initial `null`
        - `filter: 'all' | 'unreviewed' | 'reviewed'` — initial `'all'`
      - **Data fetching**:
        - Fetch `GET /api/coach/queue?status=all` once on mount — NOT per-tab (FETCH-ALL-ONCE strategy from plan)
        - Filter tabs operate on the in-memory array: check `resolved_at !== null` for "Reviewed", `resolved_at === null` for "Unreviewed"
        - `useEffect([filter])` only updates which blunders to display from the already-fetched array
      - **Navigation**:
        - Tapping a blunder card: `go('mistakeDetail', { blunders, index, status })`
      - **Analytics**: Fire `track('screen_viewed', { path: 'mistakes' })` on mount
      - **Edge cases**:
        - Empty `board_state` string: `buildBoard('')` returns all-empty board with `heights: [0,0,0,0,0,0,0]` — renders empty thumbnail, `tr` at row 0, `td` overlays derived from `threat_cells`
        - Error fetching data: Display error state with retry option
        - Loading state: Show spinner/placeholder while fetching
      - **Styling**: Use existing CSS tokens (`--bg-home`, `--surface`, `--border`, `--text`, `--teal`, `--radius-sm`). The page-background class is `--bg-home` per surfaceGroups.js.
      - **Imports needed**: `buildBoard` from `../lib/board.js`, `track` from `../lib/track.js`, `useStore` from `../store/ProfileStore.jsx`, `CoachAvatar` from components (if exists), React Router `go` from platform navigation hook

**Checkpoint**: At this point, User Story 1 should be fully functional and independently testable — anonymous gate, empty state, and populated list all render correctly.

---

## Phase 4: User Story 2 — Review a Single Blunder (Priority: P1)

**Goal**: Authenticated users tap a blunder card and see the Mistake Detail screen with the board rendered at the blunder position, played column highlighted with `tr` overlay, opponent major threat cells with `td` overlays, CoachDialog with move context, TopBar with title and move number, Toolbar with Prev/Next (wrap-around), and "Mark as reviewed" button.

**Independent Test**: Tap any blunder card from the list. Verify board renders from `board_state`, `tr` overlay on played column landing row, `td` overlays on threat cells. CoachDialog shows "You played column N here." and "Let me show you what worked better." TopBar shows "Mistake" + "Move N". Toolbar Prev/Next navigates through blunders with wrap-around and closes Deep Reveal panel. "Mark as reviewed" flips to "Marked as reviewed" on 204.

- [ ] T006 [US2] Build `MistakeDetailScreen` at connect-four/src/screens/MistakeDetailScreen.jsx
      - **Navigation parameters**: Read from `props.params` — `{ blunders: Blunder[], index: number, status: string }`
        - `blunders`: The full blunders array passed by MistakesListScreen
        - `index`: Index of the current blunder to display
        - `status`: Current filter tab (unused in detail screen, but passed through for back-navigation)
      - **Active blunder**: Derive from `blunders[index]` — the current blunder object
      - **State management**:
        - `index`: `number` — mutable via Prev/Next (modifies local state, not via `go()`)
        - `isReviewed`: `boolean` — initialized as `blunders[index].resolved_at !== null`, re-derived on index change
        - `resolving`: `boolean` — initially `false`
        - `deepRevealOpen`: `boolean` — initially `false`
      - **Board rendering**:
        - Build board from `blunder.board_state` via `buildBoard()`: `const preBoardObj = buildBoard(blunder.board_state)`
        - Compute `tr` overlay: `{ c: blunder.move_played, r: preBoardObj.heights[blunder.move_played], type: 'tr' }`
        - Compute `td` overlays: `blunder.threat_cells.map(({ col, row }) => ({ c: col, r: row, type: 'td' }))`
        - Render overlays on top of the Board component
      - **TopBar**: Show `t('mistakes.detail.topbarTitle')` ("Mistake") as title, `t('mistakes.detail.moveLabel', { n: blunder.board_state.length + 1 })` as meta slot (1-based move number)
      - **CoachDialog**: Show `t('mistakes.detail.coach.line1', { n: blunder.move_played + 1 })` ("You played column N here." — 1-indexed), `t('mistakes.detail.coach.line2')` ("Let me show you what worked better.") with `mood: 'think'`
      - **Pattern tag**: Show when `blunder.pattern_category !== 'unknown'`, using `t('mistakes.pattern.' + blunder.pattern_category)` for the label
      - **Legend**: Show `t('mistakes.detail.legend.yourMove')` next to `tr` color swatch, `t('mistakes.detail.legend.opponentThreat')` next to `td` color swatch
      - **DeepRevealButton**: Render `<DeepRevealButton moves={blunder.board_state} candidateCol={blunder.correct_move} trackingContext="past_mistakes" buttonLabel={t('mistakes.detail.whatShouldIHave')} feature="past_mistakes" />` — this renders the "What should I have played?" button. The `buttonLabel` prop overrides the default button text with the i18n key from T003. The `feature` prop ensures the Flag button sends `feature: 'past_mistakes'` to satisfy FR-015. WARNING: The `onReveal` callback must NOT fire `deep_reveal_viewed` analytics (see FR-019 — DeepRevealButton fires it internally via its `trackingContext` prop). Any `onReveal`-based side effects in this screen must NOT duplicate the `deep_reveal_viewed` event.
      - **"Mark as reviewed" button**:
        - Text: `isReviewed ? t('mistakes.detail.markedReviewed') : t('mistakes.detail.markReviewed')`
        - When `isReviewed`: ghost style with check icon, disabled
        - When `!isReviewed && !resolving`: primary style, clickable
        - When `resolving`: disabled/loading state
        - On click: `POST /api/coach/queue/${blunder.id}/resolve` with `Authorization: Bearer ${session.access_token}`
        - On success (204): set `isReviewed = true`
        - On error: revert (`resolving = false`, `isReviewed` stays false)
        - Also update `blunders[index].resolved_at` in-place in the params array to keep tab counts accurate in the list screen
      - **Toolbar (Prev/Next)**:
        - Prev: `setIndex((index - 1 + blunders.length) % blunders.length)` — wrap-around
        - Next: `setIndex((index + 1) % blunders.length)` — wrap-around
        - On navigation: also set `deepRevealOpen = false` to close the Deep Reveal panel
        - Re-derive `isReviewed` from `blunders[newIndex].resolved_at !== null` on index change
      - **Analytics**: Fire `track('mistake_reviewed', { blunderId: blunder.id })` on screen mount (FR-018)
      - **Edge cases**:
        - `blunder.board_state` empty string: `buildBoard('')` returns empty board, `heights[move_played]` = 0 (bottom row) — render as-is
        - `pattern_category === 'unknown'`: No pattern tag rendered
        - Wrapping around from last to first blunder (and vice versa)
        - Deep Reveal panel resets on every Prev/Next navigation
      - **Imports needed**: `DeepRevealButton` from `../components/DeepRevealButton.jsx`, `buildBoard` from `../lib/board.js`, `track` from `../lib/track.js`, `useStore` from `../store/ProfileStore.jsx`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently — list screen navigates to detail screen, detail screen renders board with overlays, mark-as-reviewed works, navigation wraps around.

---

## Phase 5: User Story 3 — Ask the Coach What to Play (Deep Reveal) (Priority: P2)

**Goal**: From the Mistake Detail screen, the "What should I have played?" button opens a bottom sheet with LLM explanation, bestLine column chips, and a "Flag this explanation" button. Cached responses load instantly. Quota exhaustion shows upgrade prompt.

**Independent Test**: Tap "What should I have played?" from the detail screen. Verify spinner during loading, then explanation paragraph + bestLine chips + Flag button appear. Second tap on same blunder — instant response (cache hit), no spinner. Simulate 429 — UpgradeModal shown.

- [ ] T007 [US3] Extend `DeepRevealButton` at connect-four/src/components/DeepRevealButton.jsx
      - **Prop changes**:
        - Add optional `trackingContext` prop (string, e.g., `"past_mistakes"`)
        - Add optional `buttonLabel` prop (string) — defaults to current hardcoded text `t('puzzle.seeWhy')`. When provided, overrides the button's label text
        - Add optional `feature` prop (string) — defaults to current hardcoded value `'explain-move-llm'`. Passed as `feature` in the `POST /api/llm-feedback` call body
        - Existing props `moves` (movestring string) and `candidateCol` (0-indexed integer) stay unchanged
        - `onReveal` callback stays (but may be omitted by callers)
      - **Fetch changes**:
        - Change URL from `${API}/api/explain-move` to `${API}/api/explain-move-llm`
        - Change request body from `{ moves, candidateCol, requestDeepReveal: true }` to `{ movestring: moves, col: candidateCol }`
      - **Response handling**:
        - Remove `data.deepReveal` unwrap — `/api/explain-move-llm` returns `{ explanation, bestLine, cached? }` at top level
        - Store the response directly in state (no wrapping)
        - Pass `{ cached: data.cached ?? false }` to `onReveal?.()` callback
      - **Status code handling**:
        - Keep 403 → show auth modal (unchanged)
        - Keep 429 → show upgrade modal (unchanged)
        - Add handling for the `/api/explain-move-llm` specific errors: 400/401/500/503
      - **Render changes (revealed state)**:
        - Replace `deepReveal.patternTag` + `deepReveal.fullText` render with:
          - LLM `explanation` text paragraph (from `data.explanation`)
          - **bestLine chips**: Array of 1-indexed column label strings (from `data.bestLine`). First chip is always `"Col N"` where N = candidateCol + 1. Render as small clickable chip badges. If `bestLine` is empty array, render nothing for this section.
          - **"Flag this explanation" button**: Calls `POST /api/llm-feedback` with `{ ... }` — note: the current `DeepRevealButton` does NOT have a Flag button yet (it needs to be added). On success: show brief inline confirmation "Thanks — flagged for review" (or `t('sparring.explanationFlagged')`). On error: silent (no UI change).
      - **Analytics change**:
        - The internal `track('deep_reveal_viewed', { candidateCol })` call — extend to include `context` and `cached`:
          ```js
          track('deep_reveal_viewed', {
            candidateCol,
            ...(trackingContext ? { context: trackingContext } : {}),
            cached: data.cached ?? false,
          });
          ```
        - NOTE: Because `DeepRevealButton` fires this internally, the `MistakeDetailScreen` caller must NOT fire a second `deep_reveal_viewed` event via `onReveal`. The `onReveal` callback is available for other side effects, but analytics duplication is explicitly forbidden.
      - **i18n**: Use `t('sparring.flagExplanation')` for the Flag button text, `t('sparring.explanationFlagged')` for confirmation toast, `t('sparring.explanationUnavailable')` for error/Tier-1 fallback
      - **Edge cases**:
        - `bestLine` is `[]` (empty — pre-Epic-2b cache rows): Render no bestLine chips section
        - `data.cached` is absent (undefined — cache miss): Treat as `false`
        - LLM response takes >6s/hangs: Show "Detailed explanation unavailable." fallback text
        - 429 response: Show `UpgradeModal` (existing pattern — no change needed)
      - **Affected callers**: `MistakeDetailScreen` (this feature) passes `trackingContext="past_mistakes"`. `ExplorerScreen` (Epic 3b) also uses `DeepRevealButton` — its current usage will be unaffected (optional `trackingContext` prop defaults to undefined, existing behavior preserved). Any existing `onReveal` callbacks must be audited to not duplicate `deep_reveal_viewed`.

**Checkpoint**: All three user stories independently functional. Deep Reveal shows LLM explanation, bestLine chips, Flag button, with correct analytics and caching.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation updates and analytics verification across all user stories.

- [ ] T008 [P] Docs: Update `api-conventions.md` in docs/architecture/api-conventions.md
      - Replace the "Coach Endpoints: weakness-map, queue, resolve" section (currently describes old single-blunder shape and `requirePaid` pattern)
      - Update "GET /api/coach/queue" description to: new list shape returning `{ blunders: [...], total }`, `?status` query param, server-side `threat_cells` computation, `requireAuth` instead of `requirePaid`
      - Update "POST /api/coach/queue/:blunderId/resolve" description to: UUID path param (not integer), non-empty string validation, `requireAuth` instead of `requirePaid`
      - Update `requirePaid` description in Access Guards section — note that it still exists for `GET /api/coach/weakness-map` but the queue/resolve endpoints now use inline `requireAuth`
      - The response shapes and contracts are already documented in `contracts/api.md` (generated by Phase 1) — update `api-conventions.md` to reference the new shapes

- [ ] T009 Analytics verification across all screens
      - Verify `screen_viewed` fires on `MistakesListScreen` mount with `path: 'mistakes'`
      - Verify `mistake_reviewed` fires on `MistakeDetailScreen` mount with `blunderId`
      - Verify `deep_reveal_viewed` fires from `DeepRevealButton` with `{ candidateCol, context: 'past_mistakes', cached }`
      - Verify NO double-fired `deep_reveal_viewed` event from `MistakeDetailScreen`'s `onReveal` callback
      - Test method: Open DevTools Network tab, filter for `/api/track`, manually navigate through all three screens

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — skipped
- **Phase 2 (Foundational)**: No dependencies — all T001–T004 are parallel
- **Phase 3 (US1)**: Depends on T003 (i18n keys) and T004 (screen registry). T001 (backend GET endpoint) is recommended before US1 QA but the screen can be built with mock data in parallel.
- **Phase 4 (US2)**: Depends on T003 (i18n keys) and T004 (screen registry). Can be built in parallel with T001/T002 (backend). NOTE: T007 (DeepRevealButton extension) affects US2's Deep Reveal rendering but US2's primary functionality (board overlays, CoachDialog, Prev/Next, Mark as reviewed) does NOT depend on T007.
- **Phase 5 (US3)**: Can be developed in parallel with T001/T005/T006. The `DeepRevealButton` is a self-contained component — its extension does not depend on the new screens being built.
- **Phase 6 (Polish)**: Depends on all other phases being complete.

### User Story Dependencies

- **US1**: Independent foundational. T003 and T004 must be done first, but T005 (screen building) can run in parallel with backend T001.
- **US2**: Can start after Phase 2. The screen renders `<DeepRevealButton>` which works (with limited UX) before T007.
- **US3**: Completely independent — `DeepRevealButton` is a standalone component. Extension can happen any time.

### Within Each User Story

- Screens are built as single components (no model/service/endpoint split within frontend)
- Backend endpoints are single-file changes in `server/index.js`
- Each task is self-contained

### Parallel Opportunities

- All Phase 2 tasks can run in parallel:
  - T001 (server) + T002 (server) + T003 (en.json) + T004 (screenRegistry.jsx) — four independent files
- US1 (T005), US2 (T006), and US3 (T007) can all run in parallel:
  - `MistakesListScreen.jsx` + `MistakeDetailScreen.jsx` + `DeepRevealButton.jsx` — three independent files
- T008 (docs) and T009 (analytics) can run in parallel

---

## Parallel Example: All Phases

```bash
# Phase 2 — all four tasks in parallel:
# Terminal 1: Backend GET endpoint
Task: "Redesign GET /api/coach/queue in connect-four/server/index.js"

# Terminal 2: Backend POST endpoint
Task: "Fix POST /api/coach/queue/:blunderId/resolve in connect-four/server/index.js"

# Terminal 3: i18n keys
Task: "Add mistakes.* keys to connect-four/src/i18n/en.json"

# Terminal 4: Screen registry
Task: "Register screens in connect-four/src/lib/screenRegistry.jsx"

# Phase 3-5 — all three screens in parallel:
# Terminal 5: MistakesListScreen
Task: "Build MistakesListScreen at connect-four/src/screens/MistakesListScreen.jsx"

# Terminal 6: MistakeDetailScreen
Task: "Build MistakeDetailScreen at connect-four/src/screens/MistakeDetailScreen.jsx"

# Terminal 7: DeepRevealButton extension
Task: "Extend DeepRevealButton at connect-four/src/components/DeepRevealButton.jsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2 (all four foundational tasks run in parallel)
2. Complete T005 (US1 — MistakesListScreen)
3. **STOP and VALIDATE**: Test US1 independently (anonymous gate, empty state, populated list, filter tabs)
4. Deploy/demo if ready

### Incremental Delivery

1. Complete Phase 2 → Foundation ready
2. Add US1 (MistakesListScreen) → Test independently → Deploy/Demo (MVP!)
3. Add US2 (MistakeDetailScreen) → Test independently → Deploy/Demo
4. Add US3 (DeepRevealButton extension) → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories
6. Polish (docs + analytics) → Final verification

---

## Notes

- **[P] tasks** = different files, no dependencies
- **[Story] label** maps task to specific user story for traceability
- **No test tasks**: Manual QA gates defined in `quickstart.md` (Gates 1–7) cover all acceptance scenarios. No automated tests requested.
- **Backend-first for QA**: US1 and US2 CAN be built with mock data before the backend is ready, but full QA requires T001 and T002 to be complete.
- **DeepRevealButton affects ExplorerScreen**: T007 changes a shared component. The `ExplorerScreen` (Epic 3b) also uses `DeepRevealButton` — verify it still works after extension (it should: `trackingContext` is optional, and the URL/body changes are transparent to callers).
- **`unknown` pattern_category**: Always hidden from UI via `!== 'unknown'` guard. No i18n key needed.
- **`blunders.id` is UUID**: T002 is critical infrastructure — the current `parseInt` makes the resolve endpoint completely non-functional for all real data.
