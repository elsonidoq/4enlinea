# Tasks: Review & Blunder Sharing

**Feature**: `specs/037-review-blunder-sharing/`
**Input**: spec.md, plan.md, research.md, data-model.md, contracts/
**Tests**: Not requested — manual golden-path verification per constitution §III

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no blocking dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths included in all descriptions

---

## Phase 1: Setup

_No new project structure or dependencies required — all three stories touch existing files only._

---

## Phase 2: Foundational (Blocking prerequisite for Story 3)

**Purpose**: One refactor that must land before the new Story 3 endpoint can be written. Stories 1 and 2 do not depend on this phase.

- [ ] T001 Hoist `computeThreatCells` (or its current name — grep first) from inside the coach/queue handler closure to module scope in `connect-four/server/index.js`. No logic change; pure refactor. Verify the coach/queue endpoint still works after the move.

**Checkpoint**: `computeThreatCells` is callable from any handler in server/index.js. Stories 1 and 2 are unblocked from Phase 2 start; Story 3 is unblocked from this checkpoint.

---

## Phase 3: User Story 1 — Player-Color Chip on Review Screens (Priority: P1) 🎯 MVP

**Goal**: Every review and blunder screen shows a persistent "You played Green" or "You played Gray" chip so the user never loses track of their disc color.

**Independent Test**: Finish a sparring game, enter the Review screen — verify a "You played Green" or "You played Gray" chip is visible at all times during move navigation. Also verify the chip appears on ExplorerScreen, on blunder list items in MistakesListScreen, and on the MistakeDetailScreen.

### Implementation

- [ ] T002 [US1] In `connect-four/server/index.js`, add `side: g.side ?? null` to both `unified.push(...)` calls in the `GET /api/games` handler (one for AI games, one for papergames). The column is already selected; this is the forwarding fix only.

- [ ] T003 [P] [US1] Add an inline `PlayerColorChip({ side })` component and render it as a persistent element (outside the scroll area) in `connect-four/src/screens/ReviewScreen.jsx`. Derive label from `analysis?.side`: `'first'` → "You played Green", `'second'` → "You played Gray". Render only when `analysis` is set. **Depends on T002** (needs `analysis.side` populated by server). _Do not_ update the `go('blunderDetail', ...)` call sites here — that is part of T011's atomic routing commit.

- [ ] T004 [P] [US1] Add the same `PlayerColorChip({ side })` inline component to `connect-four/src/screens/ExplorerScreen.jsx`, placed in the header area below `<TopBar>` and above the board section. The `side` prop is already threaded into ExplorerScreen from ReviewScreen. **Depends on T002**.

- [ ] T005 [P] [US1] In `connect-four/src/screens/MistakesListScreen.jsx`, add a color chip to each blunder list item using the heuristic `blunder.board_state.length % 2 === 0 ? 'Green' : 'Gray'`. Place chip at same visual weight as the pattern tag. No dependency on T002 (uses board_state length, not `side`).

- [ ] T006 [P] [US1] In `connect-four/src/screens/MistakeDetailScreen.jsx`, restyle the existing inline "You played: **green/gray**" text (current lines ~229–232) into a persistent pill/chip using the same visual treatment as FR-002. Logic is already correct; this is a styling change only. Use CSS tokens matching the light theme (`--ink`, `--card`, disc color tokens). No dependency on T002.

**Checkpoint**: User Story 1 is fully functional. Color chip appears on all four review surfaces.

---

## Phase 4: User Story 2 — Sort Past Games by Usefulness (Priority: P2)

**Goal**: Past-games list can be reordered by "Recent", "Played Well", or "Worst Blunders" via a sort-picker control.

**Independent Test**: With at least 3 past games with different blunder counts, select "Worst Blunders" — verify highest-blunder game appears first. Switch to "Recent" — verify chronological order is restored.

### Implementation

- [ ] T007 [US2] In `connect-four/server/index.js`, add sort validation and three JS comparators to `GET /api/games`: (a) reject unknown `?sort=` values with `400 { "error": "invalid sort" }`, (b) replace the existing single-line sort with the three-branch comparator block from the plan (`recent` / `played_well` / `worst_blunders`). `played_well` uses `accuracy ?? -Infinity`; `worst_blunders` uses `blunder_count` directly.

- [ ] T008 [US2] In `connect-four/src/screens/PastGamesListScreen.jsx`: add `const [sort, setSort] = useState('recent')` (resets on mount per FR-016), add a segmented sort-picker UI above the existing outcome filter row (three buttons: "Recent", "Played Well", "Worst Blunders"), add `sort` to the `fetchGames` call's URLSearchParams, add `sort` to the `useEffect` dependency array, and reset offset to 0 on sort change. **Depends on T007** (server must accept the `?sort=` param).

**Checkpoint**: User Story 2 is fully functional. Sort picker works on all three options.

---

## Phase 5: User Story 3 — Blunder Permalinks (Priority: P3)

**Goal**: Each blunder has a `/blunder/<uuid>` URL that anyone can open without an account. Non-owners see a read-only view ("Mark as reviewed" hidden; Deep Reveal shows sign-in prompt). Page is not indexed by search engines.

**Independent Test**: Copy a `/blunder/:id` URL, open in a private/incognito window — verify full blunder renders (board, pattern, severity), "Mark as reviewed" is absent, Deep Reveal shows "Sign in to unlock".

### Implementation

- [ ] T009 [US3] In `connect-four/server/index.js`, add the `GET /api/blunders/:id` route (registered before the `app.get('/{*path}', ...)` catch-all). Include: UUID regex validation (`400 invalid id`), supabase null guard (`503`), single-row select with the exact column list from the contract (coach/queue column set plus `user_id`), `is_owner = req.user?.id != null && req.user.id === data.user_id` computation, JS-derived `moveIndex = board_state.length`, `threat_cells = computeThreatCells(data.board_state, data.move_played)` (uses the hoisted function from T001 — must pass **both** arguments; the DB select already includes `move_played`), strip `user_id` from the response (`const { user_id: _omit, ...blunderPublic } = data`), return `{ ...blunderPublic, moveIndex, threat_cells, is_owner }`. **Depends on T001**.

- [ ] T010 [P] [US3] In `connect-four/server/index.js`, add the `/blunder/:id` OG meta injection block inside the `app.get('/{*path}', ...)` catch-all, immediately after the existing `/game/:id` match block. Pattern: `const blunderMatch = req.path.match(/^\/blunder\/([^/]+)$/)`. On DB fetch success: inject `og:title`, `og:description`, and `noindex` meta tag. On error or 404 or non-UUID: inject only the `noindex` tag. The `noindex` tag MUST always be injected for any `/blunder/*` URL. `UUID_REGEX` is already defined by T009. **OG title humanization**: build a small `CATEGORY_LABELS` map (e.g., `{ immediate_threat: 'Immediate Threat', forced_win: 'Forced Win', ... }`) and use it to render `og:title` as `Connect Four blunder — ${CATEGORY_LABELS[data.pattern_category] ?? data.pattern_category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}`. This ensures shared links read "Immediate Threat" not "immediate_threat". **Depends on T009** (needs UUID_REGEX at module scope).

- [ ] T011 [US3] **Atomic commit** — make all three changes together to avoid a window where URLs break: (1) In `connect-four/src/lib/urlMapping.js`, replace the `blunderDetail` entry `{ pattern: '/blunder', paramNames: [] }` with `{ pattern: '/blunder/:id', paramNames: ['id'] }` and remove `'blunderDetail'` from `SESSION_ONLY_SCREENS`. (2) Update all three `go('blunderDetail', ...)` call sites to include `id: <blunder>.id` in the params object: `connect-four/src/screens/MistakesListScreen.jsx` (line ~205, use `filteredBlunders[i].id`), `connect-four/src/screens/ReviewScreen.jsx` line ~120 (use `gameBlunderList[matchedIdx].id`), and `connect-four/src/screens/ReviewScreen.jsx` line ~314 (same pattern). All three sites must land in this single commit — splitting them risks `/blunder/undefined` URLs.

> **Deploy constraint**: T009 (`GET /api/blunders/:id`) must be deployed and reachable in the target environment before T011 and T012 are merged. If T011 ships first (removing `blunderDetail` from `SESSION_ONLY_SCREENS`), any `/blunder/:id` URL will attempt a cold-boot fetch that returns 404 until T009 is live.

- [ ] T012 [US3] In `connect-four/src/screens/MistakeDetailScreen.jsx`, add the cold-boot fetch path: add `id` to the destructured props, add `coldNavList` and `coldBootState` state vars (all hooks declared before any conditional logic), add a `useEffect` that fires when `id` is present and `navListProp` is empty/absent — fetches `GET /api/blunders/${encodeURIComponent(id)}`, handles 404 (`not_found`), other non-ok (`error`), and success (`ready`). Derive `navList = navListProp?.length > 0 ? navListProp : (coldNavList ?? [])`. Update `handleBack`: when both `mistakeContext` and `mistakeSource` are absent (cold-boot permalink path), navigate to `home`. Render loading/not-found/error/content as JSX conditionals inside the single `return` (no early returns before hooks). **Depends on T009 and T011**.

- [ ] T013 [P] [US3] In `connect-four/src/screens/MistakeDetailScreen.jsx`, add two gates: (1) Wrap the entire "Mark as reviewed" button and reviewed-state div in `{session && blunder.is_owner !== false && (...)}` — preserves button for in-app nav (`is_owner` undefined → `undefined !== false` = true) while hiding for non-owners (`is_owner: false`) and signed-out users. (2) For the Deep Reveal trigger button, add `session ? <button ...> : <div>Sign in to unlock</div>` branch. `session` variable is already available in the component. **Can be done in the same commit as T012 or after.**

---

## Final Phase: Architecture Documentation

- [ ] T014 [P] Update `docs/architecture/api-conventions.md`: add `GET /api/blunders/:id` contract (UUID validation, 400/404/503 error shapes, `is_owner` field, `user_id` never exposed). Add `?sort=` param table and `side` field to the `GET /api/games` section.

- [ ] T015 [P] Update `docs/architecture/frontend-conventions.md`: remove `blunderDetail` from the `SESSION_ONLY_SCREENS` description. Add a note to the cold-boot fetch pattern section documenting `blunderDetail` alongside the existing `clchallenge` example.

---

## Dependencies Summary

```
T001 (computeThreatCells hoist)
  └─ T009 (GET /api/blunders/:id)
       ├─ T010 (OG injection) [can be parallel with T012]
       └─ T012 (cold-boot path) ← also depends on T011

T002 (side forwarding)
  ├─ T003 (ReviewScreen chip + call sites)
  └─ T004 (ExplorerScreen chip)

T005 (MistakesListScreen chip)  ← independent
T006 (MistakeDetailScreen chip restyle)  ← independent

T007 (sort server)
  └─ T008 (sort picker UI)

T011 (urlMapping atomic)
  └─ T012 (cold-boot path)

T013 (is_owner + Deep Reveal gates) ← same file as T012; batch together
T014, T015 ← docs, fully independent, last
```

## Parallel Execution Opportunities

**Within Story 1**: T003, T004, T005, T006 can all be worked in parallel once T002 is complete (all touch different files). T005 and T006 can start immediately (no T002 dependency).

**Across stories**: All of Story 2 (T007, T008) is independent of Stories 1 and 3 and can be developed in parallel with Story 1 after T001.

**Story 3**: T010 can be drafted alongside T012 (different sections of index.js), but T009 must land before either.

**Docs**: T014 and T015 are always last and always parallelizable with each other.

## Implementation Strategy

**MVP = Story 1 (T002–T006)**: Color chips provide immediate UX value and are the lowest-risk change. Zero new endpoints, zero routing changes. (FR-024 call-site and URL_MAP changes are part of T011 in Story 3, not Story 1.)

**Story 2 (T007–T008)**: Self-contained server + UI change. No Story 1 dependency.

**Story 3 (T001, T009–T013)**: Highest complexity. The T001 → T009 → T011 → T012 chain is the critical path. T010 and T013 can be batched with their neighbors.

**Total tasks**: 15 (2 foundational/docs, 5 Story 1, 2 Story 2, 6 Story 3)
