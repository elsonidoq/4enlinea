# Research: Review & Blunder Sharing (spec-037)

## Status: Complete — all decisions resolved pre-plan from spec + codebase audit

---

## Decision 1: `side` field forwarding in GET /api/games

**Decision**: Both `games` and `papergames_games` queries already `SELECT ... side` (server/index.js lines 1678–1684). The unified shape construction (lines 1728–1756) simply omits `side` from the pushed object. Fix: add `side: g.side ?? null` to each `unified.push(...)` call.

**Rationale**: Zero risk change — the DB column is already fetched, just not forwarded.

**Alternatives considered**: Adding a `side` column to the `blunders` table. Deferred per spec Not Included list; `board_state.length` heuristic is sufficient for chip display.

---

## Decision 2: Sorting strategy for GET /api/games

**Decision**: JS-side sort on the merged unified array before `slice(offset, offset + limit)`. Three comparators:

- `recent`: `new Date(b.created_at) - new Date(a.created_at)` (current behavior, no change)
- `played_well`: `(b.accuracy ?? -Infinity) - (a.accuracy ?? -Infinity)`, tiebreak `created_at DESC`
- `worst_blunders`: `b.blunder_count - a.blunder_count`, tiebreak `created_at DESC`

**Rationale**: Both tables are fetched separately into a JS array (no UNION SQL path exists); merging then sorting is already the pattern. SQL ORDER BY would require a UNION query or duplicate sort logic per table.

**Alternatives considered**: SQL-side sort with UNION. Rejected — would require substantial query restructuring and break the existing parallel fetch pattern.

---

## Decision 3: GET /api/blunders/:id — auth model

**Decision**: No `requireAuth`; no `user_id` filter. `loadUser` runs globally (attaches `req.user` when session exists, null otherwise). Server computes `is_owner = (req.user?.id === row.user_id)`. Returns `is_owner` in the response body; never exposes `user_id` UUID to the client.

**Rationale**: Permalink visibility model is unlisted-but-public (anyone with UUID can view). Ownership is determined server-side to gate write actions client-side.

---

## Decision 4: Cold-boot path in MistakeDetailScreen

**Decision**: When `id` prop is present but `blunderNavList` is absent (or empty), fetch `GET /api/blunders/:id`, construct `[{ ...data, is_owner: data.is_owner }]` single-item array, call `setNavList([result])` (new local state), and render normally. Preserves existing `blunderNavList + index` prop API entirely.

**Rationale**: The spec mandates "no new prop API". Existing callers (MistakesListScreen, ReviewScreen) continue to pass `blunderNavList` directly; cold-boot path is a fallback branch in the same component.

The `clchallenge` screen (frontend-conventions.md) uses the same fetch-on-missing-props pattern, confirming this is the established convention.

---

## Decision 5: URL_MAP / SESSION_ONLY_SCREENS changes

**Decision**: 
1. Replace `{ pattern: '/blunder', screenKey: 'blunderDetail', paramNames: [] }` with `{ pattern: '/blunder/:id', screenKey: 'blunderDetail', paramNames: ['id'] }`.
2. Remove `'blunderDetail'` from `SESSION_ONLY_SCREENS`.
3. Update all 3 existing `go('blunderDetail', ...)` call sites to include `id: blunder.id` in the params object.

**Call sites identified**:
- `connect-four/src/screens/MistakesListScreen.jsx:205` — `go('blunderDetail', { blunderNavList: filteredBlunders, index: i, ... })`
- `connect-four/src/screens/ReviewScreen.jsx:120` — `go('blunderDetail', { blunderNavList: gameBlunderList, index: matchedIdx, ... })`
- `connect-four/src/screens/ReviewScreen.jsx:314` — same pattern

**Rationale**: FR-024 is a replacement not an addition. All 3 call sites have the blunder object available (`filteredBlunders[i]` and `gameBlunderList[matchedIdx]`) so `.id` is accessible.

---

## Decision 6: OG meta injection for /blunder/:id

**Decision**: Add a `/blunder/:id` match block immediately after the existing `/game/:id` block inside the `app.get('/{*path}', ...)` catch-all handler (server/index.js ~line 3034). Fetches from `blunders` table. On success: inject `og:title`, `og:description`, and `<meta name="robots" content="noindex, nofollow">`. On failure or 404: inject only the noindex tag. The noindex tag is always injected for `/blunder/*` URLs regardless of DB fetch result.

**Rationale**: Mirrors the existing `/game/:id` OG pattern exactly. noindex is required per FR-022 even on error.

---

## Decision 7: Deep Reveal sign-in gate

**Decision**: `DeepRevealPane` is already conditionally rendered. Add a JSX branch: if `!session`, render a "Sign in to unlock" prompt div in place of the Deep Reveal trigger button. For authenticated users (owner or non-owner), Deep Reveal functions normally.

**Rationale**: FR-028 specifies visibility to all visitors with a sign-in prompt for unauthenticated. The existing `DeepRevealPane` component already handles the auth flow for quota; this is an outer JSX gate before the pane renders.

---

## Decision 8: "Mark as reviewed" visibility gate

**Decision**: Gate the entire "Mark as reviewed" button (and the "Marked reviewed" state div) on `blunder.is_owner === true`. The `is_owner` field comes from the `blunderNavList` entry. For the cold-boot path, `is_owner` is copied directly from the `GET /api/blunders/:id` response into the constructed single-item navList entry.

**Rationale**: FR-027/FR-029. Owner check is server-computed; client never sees a UUID. The existing button is gated on `session` (line 137); replace with `blunder.is_owner` which is false for non-owners and false (falsy) when undefined.

---

## Decision 9: Color chip component

**Decision**: Implement as an inline component `PlayerColorChip({ side })` returning a styled span/pill. Use existing CSS tokens (`--disc-green`, `--disc-gray` or equivalent). Place in the relevant screens as a persistent element in the layout (not inside the scroll area). No new component file needed — inline in each screen.

**Rationale**: Simple enough for an inline component; extracting to a shared file would be premature abstraction (Constitution §II).

---

## Decision 10: Sort picker UI in PastGamesListScreen

**Decision**: A segmented control (`<div>` with three `<button>` children) matching the existing filter chip pattern. Default `'recent'`. Stored in component state only; resets on mount. Triggers a fresh `fetchGames` call with the new `?sort=` param.

**Rationale**: The existing outcome filter uses a similar chip row pattern. Sort state is per-session per FR-016; no localStorage or store needed.

**Integration**: `fetchGames` is already a `useCallback`; add `sort` to its parameters and to the URLSearchParams construction.
