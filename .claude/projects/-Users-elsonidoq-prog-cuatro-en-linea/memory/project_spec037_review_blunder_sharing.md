---
name: project_spec037_review_blunder_sharing
description: Spec 037 (Epic 8 — Review & Blunder Sharing) pipeline state and key implementation decisions
metadata: 
  node_type: memory
  type: project
  originSessionId: df3993bd-901e-4984-b6dc-811f0efe0cc0
---

Spec 037 is **implemented** (all 15 tasks T001–T015 complete, 2026-06-17). Four QA bugs remain open — not yet fixed.

**Why:** Epic 8 adds player-color clarity chips, past-games sort, and blunder permalinks.

**How to apply:** Fix the four open QA bugs below before considering this branch shippable.

## Key decisions (non-obvious, needed for implementation)

- **`GET /api/blunders/:id` is the only blunder endpoint without `user_id` filter.** All others use `.eq('user_id', req.user.id)`. This is intentional (unlisted-but-public permalink).
- **`is_owner` boolean, not raw `user_id`.** Server computes `is_owner = (req.user?.id === row.user_id)`. Client never sees a UUID.
- **`is_owner !== false` gate on "Mark as reviewed".** Treats `undefined` (in-app nav, coach/queue items have no `is_owner`) as truthy — only hides when API returns explicit `false`. Do NOT simplify to `blunder.is_owner`.
- **Cold-boot uses single-item `blunderNavList` array.** Constructs `[blunderObject]` with `index=0`, preserving the existing aliased prop API (`navList`/`initialIndex`). No new prop added.
- **URL_MAP: replace, not add.** `/blunder` entry must be *replaced* with `/blunder/:id`. Adding a second entry causes first-match ambiguity. All three `go('blunderDetail', ...)` callers (MistakesListScreen.jsx:205, ReviewScreen.jsx:120, ReviewScreen.jsx:314) must be updated atomically **in T011** — not T003.
- **`computeThreatCells` needs hoisting AND takes two args.** Currently scoped inside the coach/queue handler closure — unreachable from the new endpoint. Must be extracted to module scope first (T001). Call signature is `computeThreatCells(board_state, move_played)` — passing only `board_state` silently returns `[]` (crashes internally with "undefined" appended to movestring).
- **`moveIndex` and `threat_cells` are NOT DB columns.** `moveIndex = board_state.length`; `threat_cells` computed via `computeThreatCells(data.board_state, data.move_played)` in JS after the DB query. The `.select()` must include `move_played`.
- **`side` missing from GET /api/games unified response.** Selected from `games` table but dropped before response. Must be added to unified object for player-color clarity on PastGamesListScreen.
- **Back nav from cold-boot permalink → `home`.** `handleBack` branch: if both `mistakeContext` and `mistakeSource` absent, navigate to `home`.
- **Deep Reveal on permalink = "Sign in to unlock" prompt.** Deliberate conversion hook. Do NOT hide Deep Reveal for non-authenticated users — show the prompt.
- **Sort is JS comparator over merged array, not SQL.** `GET /api/games` fetches games + papergames_games separately, concatenates, then JS-sorts before slicing. `blunder_count` computed via separate `blunders` query + JS map (not a DB column).
- **OG title humanizes enum server-side.** `pattern_category` DB enum (e.g. `immediate_threat`) must be converted to title-case ("Immediate Threat") via a `CATEGORY_LABELS` map with regex fallback before injecting `og:title`. Raw enum strings read as broken in social previews.
- **Deploy constraint: T009 before T011/T012.** `GET /api/blunders/:id` must be deployed and reachable before the URL_MAP change (T011) and cold-boot fetch (T012) ship. Violating this order makes all permalink URLs 404 with no fallback.

## Open QA bugs (2026-06-17)

1. **ReviewScreen chip floats above coach.** `PlayerColorChip` is placed AFTER `<CoachDialog fixed .../>` in the JSX. The coach uses `background: rgba(255,255,255,0.45)` (semi-transparent), so the chip bleeds through visually. Fix: move the chip to BEFORE `<CoachDialog>`.

2. **Blunder click in ReviewScreen goes to `/explorer` instead of `/blunder/<id>`.** Two root causes:
   - *Timing*: `gameBlunderList` is fetched async after analysis loads; if user clicks before it resolves, `matchedIdx === -1` → falls through to Explorer.
   - *Papergames*: blunders from papergames use `papergames_game_id` column, not `game_id`. `GET /api/coach/queue?game_id=<papergames_id>` returns 0 rows → `gameBlunderList` stays empty. The server coach/queue handler at `index.js` line ~2281 only does `.eq('game_id', gameId)`. Fix requires either OR-filtering both columns or passing source-aware param.

3. **MistakeDetailScreen chip is below the board.** Chip rendered inside the legend `<div>` after the board (line ~307). Should be above the board, after `<CoachDialog>`.

4. **Coach doesn't say what color the user played.** `coachMessages` in ReviewScreen and MistakeDetailScreen don't use `disc`/`discLabel` fields. Add them using `analysis.side` (ReviewScreen) or `board_state.length % 2` heuristic (MistakeDetailScreen).
