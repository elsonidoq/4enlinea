# Research: Blunder Category Navigation & Two-Way Links

**Feature**: spec 028  
**Branch**: `101-new-design`  
**Date**: 2026-06-10

---

## Decision 1: Navigator params-as-props pattern

**Decision**: `go(screenKey, params)` spreads all params as direct props onto the target screen component via `{...params}` in `App.jsx`. No app-level state needed for `blunderNavList`, `category`, `mistakeContext`, or `mistakeSource`.

**Rationale**: This is the established pattern in the production codebase (confirmed in `App.jsx` line 92). Adding app-level state would require threading setters through the Navigator API unnecessarily. All navigation context is self-contained in the `go()` call.

**Alternatives considered**: App-level state via `useState` in Navigator (rejected — adds unnecessary coupling between screens that should be independent).

---

## Decision 2: `blunderNavList` is in-memory only — `blunderDetail` must be SESSION_ONLY

**Decision**: `blunderDetail` is added to `SESSION_ONLY_SCREENS`. The URL `/blunder` maps to `blunderDetail` but with `paramNames: []` — no URL params are serialised. Cold URL boot redirects to `home`.

**Rationale**: `blunderNavList` is a `Blunder[]` array that cannot be serialised to a URL path. The same constraint applies to `mistakeDetail` (already in `SESSION_ONLY_SCREENS`). Spec FR-036/FR-037 are explicit on this.

**Alternatives considered**: Serialise blunder `id` only and re-fetch on cold boot (rejected — requires another API round-trip and a fetch-on-missing-props pattern that adds code complexity for a route users never cold-boot to in practice).

---

## Decision 3: `GET /api/coach/queue` extension — no schema changes needed

**Decision**: Extend the existing endpoint with two optional query params (`?category=` and `?game_id=`). Add `game_id` and `moveIndex` (derived as `board_state.length`) to the SELECT. Validate `category` against `VALID_BLUNDER_TAGS` (not `VALID_CATEGORIES`).

**Rationale**: `game_id` column was added to `blunders` in Epic A (migration 036). No new migration is needed here. `moveIndex` is a response-layer computation (`board_state.length`) and does not require a DB column.

**Alternatives considered**: Store `moveIndex` as a DB column (rejected — it's fully derivable from `board_state.length` at response time; storing derived data violates Constitution §II).

---

## Decision 4: `POST /api/games/analyze` — `gameDate` already exists

**Decision**: `gameDate` is already returned by `POST /api/games/analyze` on this branch (confirmed via `rg "gameDate" server/index.js`). No server change needed for FR-004.

**Rationale**: Epic A already added `gameDate: created_at` to the analysis response. FR-004 is already satisfied. The plan tasks must NOT re-add this field.

**Alternatives considered**: N/A — existing implementation confirmed.

---

## Decision 5: `SeverityMeter` extraction approach

**Decision**: Extract `SeverityMeter` from `MistakesListScreen.jsx` to `src/components/SeverityMeter.jsx` as a named export. The `SEVERITY_LEVELS` constant and `severityLevel()` helper move with it. `MistakesListScreen.jsx` imports from the new location.

**Rationale**: `CategoryListScreen` will also need `SeverityMeter` for thumbnail severity badges. Extraction follows Constitution §II (no duplication, no speculative abstraction — there are already two callers).

**Alternatives considered**: Inline in both screens (rejected — violates DRY for an identical component).

---

## Decision 6: `reviewContext.side` is available in ReviewScreen

**Decision**: `analysis.side` is populated from `POST /api/games/analyze` response (confirmed line 99 of `ReviewScreen.jsx`). FR-032's `globalPlyIndex` formula uses this field directly.

**Rationale**: `side` is part of the existing analysis response shape (`first` | `second`). The formula:
- `side === 'first'`: `globalPlyIndex = 2 * (move.moveIndex - 1)` (user plays odd global plies: 0, 2, 4…)
- `side === 'second'`: `globalPlyIndex = 2 * (move.moveIndex - 1) + 1` (user plays even global plies: 1, 3, 5…)

`move.moveIndex` in `analysis.moves` is a 1-indexed user-move ordinal (counting only the user's own plies, confirmed in api-conventions.md `POST /api/games/analyze` response shape). `globalPlyIndex` matches `blunder.moveIndex` which equals `board_state.length` (0-indexed global ply count).

**Alternatives considered**: N/A — field confirmed present.

---

## Decision 7: i18n key audit — `mistakes.pattern.*` coverage

**Decision**: The current `en.json` has `mistakes.pattern.*` for all tags EXCEPT `suboptimal_move` and `drawing_move`. These two must be added (FR-039). Also add all new i18n keys under `mistakes.to_review`, `mistakes.cat.*`, `mistakes.detail.*`.

**Note**: The epic doc (`past_games_epics.md`) uses `mistakes.category.*` namespace but the spec uses `mistakes.pattern.*`. The spec takes precedence (FR-039 is explicit). Do NOT add `mistakes.category.*`.

**Rationale**: Consistency — `MistakesListScreen.jsx` already uses `mistakes.pattern.*` (line 282). The spec locks this namespace.

---

## Decision 8: `CategoryListScreen` is a new file; `mistakes` route is rewired

**Decision**: Create `connect-four/src/screens/CategoryListScreen.jsx` as a new file. Update `screenRegistry.jsx` to point `mistakes → CategoryListScreen` (was `MistakesListScreen`). Update `mistakeDetail → MistakesListScreen` (was `MistakeDetailScreen`). Register new `blunderDetail → MistakeDetailScreen`.

**Rationale**: This is the three-level route migration spec FR-035. The old flat list route (`mistakes → MistakesListScreen`) becomes Level 2 (`mistakeDetail → MistakesListScreen`). Level 1 is the new `CategoryListScreen`.

---

## Decision 9: `MistakeDetailScreen` nav params shape

**Decision**: `MistakeDetailScreen` receives `blunderNavList`, `index`, `mistakeContext`, `mistakeSource` as direct props (Navigator spreads them). Fallback defaults: `blunderNavList ?? []`, `index ?? 0`, `mistakeContext ?? 'list'`, `mistakeSource ?? null`.

**Current params**: The current screen receives `blunders`, `index`, `status`. These props are **replaced entirely** — the spec explicitly states no backward-compat shim is needed (Assumptions section: "The existing `MistakeDetailScreen` `blunders` + `status` nav params from the (now-replaced) `mistakeDetail` route do not need backward-compatibility shims").

**Rationale**: The `mistakeDetail` route is being repurposed to `MistakesListScreen`. The old `blunders + status` params are no longer used by any caller once this epic ships.

---

## Decision 10: Prev/Next in `MistakeDetailScreen` — no wrap-around

**Decision**: `handlePrev` disables at `index === 0`; `handleNext` disables at `index === blunderNavList.length - 1`. No wrap-around. This replaces the current modulo wrap-around in the existing implementation.

**Rationale**: Spec FR-029 is explicit. The list is finite and directional; wrap-around would confuse the user about their position within the list.
