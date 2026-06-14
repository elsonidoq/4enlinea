# DecodeC4 — Past Games & Blunder Navigation Epics

*Defines two implementation epics that add game history navigation and improve blunder review. Based on the mockup prototype at `docs/mvp/mockup/project/` (files: `screens_games.jsx`, `screens_mistakes.jsx`, updated `screens_home.jsx` and `app.jsx`) and the product decisions in `docs/mvp/product_decisions.md`.*

---

## Cross-cutting notes

**Mockup ground truth:** `screens_games.jsx` (PastGamesList, GameCard), `screens_mistakes.jsx` (CategoryList, MistakesList with category prop, MistakeDetail). All layout, prop shapes, and state wiring follow those files.

**Route naming change:** The mockup introduces a three-level structure for the Mistakes surface, replacing the flat list shipped in the Past Mistakes review. The route mapping is:

| Old route key (Epic 3c) | New route key | Component |
|---|---|---|
| `mistakes` | `mistakes` | `CategoryList` (Level 1 — was `MistakesList`) |
| `mistakeDetail` | `mistakeDetail` | `MistakesList` with `category` prop (Level 2 — new) |
| *(none)* | `blunderDetail` | `MistakeDetail` (Level 3 — was `mistakeDetail`) |

**`blunders.game_id` gap:** The `blunders` table (migration `001`/`005`) does not currently store which game a blunder came from. Epic A adds `game_id uuid nullable FK games` via migration and updates `POST /api/games/analyze` to include `game_id` when writing blunders. Blunders from games are written exclusively server-side inside `POST /api/games/analyze` (which already performs this write). The `POST /api/blunders` endpoint remains for puzzle blunders only (`puzzle_id IS NOT NULL`). Verification confirmed zero client-side game-blunder write calls exist in the frontend.

**Papergames imports (post-MVP):** The `GameCard` component in Epic A includes a visual slot for a Papergames opponent avatar. The API always returns `source: "ai"` in MVP; the slot activates when the Papergames integration epic ships. No import logic is built here.

**Surface group:** `pastGames` joins the `sparring` surface group → `--bg-sparring` tint (same as `review`, `explorer`). Mistakes screens (`mistakes`, `mistakeDetail`, `blunderDetail`) remain on the `home` surface group → `--bg-home`.

**Analytics:** all new screens fire `track('screen_viewed', { screen: screenKey })` on mount. New events: `mistake_category_viewed` (Level 1), `mistake_category_detail_viewed` (Level 2 — replaces the undifferentiated `screen_viewed` on `mistakeDetail`).

**i18n:** all user-facing strings go through `t('key')`. New top-level namespace: `games.*` for Past Games strings.

---

## Epic A — Past Games Navigation

Add a "Past Games" entry point on the Home screen and a new `PastGamesList` screen that lets users browse, filter, and tap into previous games.

**Depends on:** the Sparring game board and Post-Game Review (already shipped) — specifically the `games` table, `POST /api/games`, and the blunder-write path in `POST /api/games/analyze`.

**Estimated spec:** 130–155 lines. **Estimated tasks:** 22–27.

---

### Scope

#### DB migration

Migration file: next sequential `NNN_past_games_schema.sql` (follow `data-model.md` naming — 3-digit prefix, comment block, `-- HUMAN REVIEW REQUIRED`).

**Changes to `blunders`:**
- Add `game_id uuid` nullable, FK → `games(id) ON DELETE SET NULL`. Enables blunder-count aggregation per game and the two-way blunder ↔ game link (consumed by Epic B).
- Add non-unique index `idx_blunders_game_id ON blunders(game_id) WHERE game_id IS NOT NULL` to support the LEFT JOIN COUNT in `GET /api/games`.
- **Null-safe:** existing rows with `puzzle_id IS NOT NULL` remain with `game_id = NULL`. Only game-captured blunders written after this migration carry a `game_id`.

**Changes to `games`:**
- Add `accuracy real` (nullable). Stores the percentage of optimal user moves, computed by the client at game-end and persisted via `POST /api/games`. `null` for games played before this migration.

#### Backend — extend `POST /api/games`

Add `accuracy: number | null` to the request body (optional; omit or pass `null` when `scored_moves = 0`). Validate: if present, must be a number in `[0, 100]`. Store in `games.accuracy`. No change to the `201 { id }` response.

The client computes accuracy from the solver scores it already has (same formula as `product_decisions.md`: `optimal_moves / scored_moves`), then sends it alongside the game record. This avoids a server-side solver pass at list-load time.

#### Backend — update `POST /api/games/analyze`

- Blunders are written **server-side** inside this endpoint via `supabase.from('blunders').insert(...)`. Update each insert to include `game_id` (the `gameId` from the request body). Server-side blunder writes are skipped when `req.user` is null — anonymous users still get the analysis response (move quality, accuracy) but no blunders are persisted.
- Blunders from games are written exclusively server-side inside this endpoint. `POST /api/blunders` stays for puzzle blunders only (where `puzzle_id IS NOT NULL`). Empirical verification confirmed zero client-side `POST /api/blunders` calls exist in the frontend — nothing to remove. The existing unique index `idx_blunders_game_unique ON (user_id, board_state, move_played) WHERE puzzle_id IS NULL` acts as a safety net against accidental duplicates.
- Add `gameDate: string` (ISO 8601 from `games.created_at`) to the response object. `PostGameReview` uses this when constructing `mistakeSource` for the timeline blunder-tap flow.

#### Backend — new endpoint

**`GET /api/games`** — list games for the authenticated user.

- Auth required (`req.user`); 401 for unauthenticated.
- Query params:
  - `outcome` — `"won"` | `"lost"` (optional; omit for all)
  - `has_blunder` — `"true"` (optional; filters to games with ≥1 blunder)
  - `limit` — cap at 50; default 50
- Response: `{ games: GameRecord[] }` where:
  ```
  GameRecord {
    id: string              // UUID
    outcome: "won"|"lost"|"draw"
    date: string            // ISO 8601 from games.created_at; formatted client-side (e.g. "Jun 7")
    source: "ai"            // always "ai" in MVP; "papergames" reserved for future
    difficulty: string      // "easy"|"medium"|"hard"|"perfect" (null for papergames)
    accuracy: number|null   // from games.accuracy column; null if not stored or papergames
    blunder_count: number   // 0 for games predating this migration (game_id was null)
    move_count: number      // games.moves.length — no solver needed
    cols: string[]          // final board state: 7 column-height strings in g/d encoding
  }
  ```
- `cols` is computed server-side by iterating `games.moves` and building 7 column arrays. Encoding rule: `g` = first player (the player who moved on odd indices, 0-indexed), `d` = second player (even indices). This is a mechanical mapping from move-index parity to disc color, independent of which side the user played. The frontend `Board` component already maps `'red'` → Green disc and `'yellow'` → Gray disc; the `g`/`d` encoding is an intermediate format translated by `mkCols`/`movesToBoardSpec`. Reuse the `movesToBoardSpec` helper (same function used for lesson board rendering).
- `blunder_count` is a LEFT JOIN COUNT on `blunders WHERE game_id = games.id AND user_id = req.user.id`. Counts only blunders from games played after Epic A's migration.
- Order: `created_at DESC`.
- **Anonymous users:** returns 401 for unauthenticated requests. Anonymous games stored with `user_id = null` are intentionally excluded — there is no `device_uuid` fallback. MVP cut, consistent with Past Mistakes.

#### Frontend — Home screen (`screens_home.jsx`)

- Add "Past Games" wide-row feature card below Sparring. Exact style from `screens_home.jsx` mockup (teal tint: `background: linear-gradient(170deg,#fff,#e8faf8)`, icon color `#1a8a7c`, icon bg `#c7f0ea`).
- New icon needed: `clock` — add to the `Icon` component SVG set.
- Navigates to `go('pastGames')`.
- i18n keys: `home.past_games.title`, `home.past_games.subtitle`.

#### Frontend — `PastGamesList` screen (new, `screens_games.jsx`)

*Filter tabs:*
- Four tabs: **All · Won · Lost · Blunder**
- "Blunder" shows only games where `blunder_count > 0`.
- Filter state is local; no server round-trip on tab change (all 50 games loaded once on mount).

*`GameCard` subcomponent:*
- Left: compact `Board` thumbnail (80px wide, `compact` mode, non-interactive).
- Body (three rows):
  - Row 1: outcome chip (`Won` green / `Lost` red) + date (formatted e.g. "Jun 7").
  - Row 2 (source slot): AI game shows difficulty pill (color-coded: Easy green, Medium amber, Hard red, Perfect dark) + accuracy %; Papergames shows avatar circle (initials, 2-letter max) + opponent name.
  - Row 3: blunder chip — `⚑ N blunders` (amber) when `blunder_count > 0`; `no blunders` (muted) when 0.
- Right: chevron right.
- Tap → calls `go('review', { id: g.id })`. `PostGameReview` reads `props.id` from navigation params — the same contract already used by `GameBoard` after save. The receiving screen does not distinguish between the two callers.

*States:*
- **Signed-out gate** — icon, headline, "Create free account" CTA, "Maybe later" ghost button. Same pattern as existing `MistakesList` signed-out state.
- **Empty state** — `CoachAvatar`, "No games yet" headline, coach message, "Play a game" primary CTA → `go('difficulty')`.
- **Populated list** — scrollable list of `GameCard` components.
- **Loading** — spinner while `GET /api/games` is in flight.
- **Empty filter** — "Nothing here — switch tabs." message when the active filter returns zero results.

*Data fetch:*
- On mount (authenticated): `GET /api/games` → populate local state.
- No pagination UI; cap is 50 rows from API.
- On unmount: cancel in-flight request.

*Analytics:*
- `track('screen_viewed', { screen: 'past_games' })` on mount.
- `track('game_history_opened', { gameId })` on card tap.

#### App shell wiring

- Add `pastGames: PastGamesListScreen` to `SCREENS` (screenRegistry.jsx).
- Add `pastGames` to `URL_MAP` (`/pastGames` route, no params) — not in `SESSION_ONLY_SCREENS` (survives cold URL boot).
- Add `pastGames` to `SURFACE_BG` with `'--bg-spar'` (sparring surface group).
- `PostGameReview` reads the game ID from the `id` navigation param (`props.id`) regardless of caller — `GameBoard` passes it after saving a game via `go('review', { id })`, and `PastGamesList` passes it on card tap via `go('review', { id: g.id })`. The existing `review` navigation param contract (`{ id: string }` in `data-model.md`) is the single source of truth; no additional app-level state is needed.
- `PastGamesListScreen` derives its `gamesVariant` internally (signed-out / empty / populated) from auth state and fetch results. No app-level `gamesVariant` state or rail selector is created — the production app uses `SCREENS` + `URL_MAP` + `SURFACE_BG`, not `NAV_GROUPS`.

#### i18n keys (new, in `en.json`)

```
games.title               "Past Games"
games.filter.all          "All"
games.filter.won          "Won"
games.filter.lost         "Lost"
games.filter.blunder      "Blunder"
games.empty_filter        "Nothing here — switch tabs to see your other games."
games.signed_out.headline "Sign up to see your games"
games.signed_out.body     "Create a free account to save your games, review them with the Coach, and track your progress over time."
games.empty.headline      "No games yet"
games.empty.body          "Play a sparring game against the AI and it'll show up here for review."
games.card.blunders_one   "{{count}} blunder"
games.card.blunders_other "{{count}} blunders"
games.card.no_blunders    "no blunders"
games.card.accuracy       "Accuracy"
home.past_games.title     "Past Games"
home.past_games.subtitle  "Review your game history"
```

#### CSS additions (new classes, add to `styles.css`)

From `screens_games.jsx`:
- `game-card` — full-width tappable row card (flex row, white bg, rounded corners, shadow)
- `gc-body` — flex-column middle section of `GameCard`
- `gc-blunder-chip` — amber flag chip for "N blunder(s)"
- `gc-no-blunder-chip` — muted "no blunders" chip
- `outcome-chip` — small pill; `.won` variant green, `.lost` variant red
- `opponent-av` — circular avatar for Papergames opponent initials (post-MVP slot, render now)

#### NOT included

- Papergames import flow (post-MVP).
- Game deletion.
- Cross-game stats aggregation.
- Pagination / infinite scroll (50-game cap covers MVP).
- Anonymous game lookup by `device_uuid` (intentional MVP cut — `GET /api/games` requires auth).

---

## Epic B — Blunder Category Navigation & Two-Way Links

Redesign the Past Mistakes surface with a two-level category drill-down and add two-way navigation between blunders and their source games.

**Depends on:** the Past Mistakes review surface (already shipped) — specifically `GET /api/coach/queue` and `POST /api/coach/queue/:id/resolve`. Also depends on Epic A (adds `game_id` to the blunders table).

**Estimated spec:** 140–165 lines. **Estimated tasks:** 24–30.

---

### Scope

#### Backend — extend blunder list endpoint

Extend `GET /api/coach/queue` (already shipped) to accept two optional query params:

- `?category=<pattern_slug>` — filter by `pattern_category` (e.g. `claimeven`). When omitted, returns all categories (existing behaviour).
- `?game_id=<uuid>` — filter `WHERE game_id = $game_id`. When omitted, returns blunders from all sources (both game blunders and puzzle blunders). This is intentional: the Mistakes surface shows a unified view of all blunders.

**SELECT changes for `?game_id=` support:** add `game_id` to the SELECT so callers can confirm provenance. Derive `moveIndex` at the response layer as `board_state.length` (the number of moves already played when the blunder was recorded equals the length of the board-state string at that moment).

**No other changes** to the existing query, status filter, or row cap.

The category detail list (Level 2) calls this endpoint with `?category=<slug>`. `PostGameReview` calls it with `?game_id=<uuid>` to build the in-game blunder navigation list (see *PostGameReview — timeline tap update* below).

#### Frontend — Level 1: `CategoryList` (`mistakes` route)

The `mistakes` route now renders `CategoryList` instead of the old flat `MistakesList`.

*Category data model (client-side, derived from blunder list):*
```
{
  slug: string             // DB slug e.g. "claimeven", "forced_block"
  label: string            // display name via t('mistakes.category.' + slug)
  items: Blunder[]         // all blunders in this category
  unreviewed: Blunder[]    // items where resolved_at is null
  maxSev: number           // raw 0–10 integer from blunders.severity; 0 = all reviewed
  thumb: Blunder           // most-critical unreviewed (or most-critical overall if all reviewed)
}
```

*Ordering:* categories are sorted by `maxSev` descending using the raw 0–10 value. Categories where `maxSev === 0` (all reviewed) are sorted to the bottom. Within equal `maxSev`, preserve insertion order.

*SeverityMeter display buckets (per `api-conventions.md`):* Minor = severity 1; Moderate = severity 2–3; Critical = severity 4–10. These buckets are for visual display only; sorting always uses the raw value.

*Category row layout (from `screens_mistakes.jsx` `CategoryList`):*
- Left: small board thumbnail of `thumb` (compact, with `tr` overlay on played cell).
- Body: category name; unreviewed count badge ("N new") or "done" chip when all reviewed.
- Right: total blunder count + chevron.

*States:* signed-out gate and empty state are unchanged from current `MistakesList` (`mistakesVariant` prop controls them, same as before).

*TopBar meta:* "N to review" when `totalUnreviewed > 0`; omitted when 0.

*Data fetch:* Calls `GET /api/coach/queue` (all categories) on every mount — no local caching. This ensures `maxSev` and `unreviewed` counts are always fresh after returning from Level 3.

*Tap:* sets `selCategory` to the row's `slug` (DB slug, e.g. `"claimeven"`) then `go('mistakeDetail')`.

*Analytics:* `track('screen_viewed', { screen: 'mistake_categories' })` on mount.

#### Frontend — Level 2: `MistakesList` with `category` prop (`mistakeDetail` route)

The `mistakeDetail` route renders `MistakesList` with `category={selCategory}`.

*Changes to `MistakesList`:*
- Accept `category: string | null` prop. Value is a DB slug (e.g. `"claimeven"`) — never a display name.
- When `category` is set: load from `GET /api/coach/queue?category=<slug>` (the slug is passed directly as the query param).
- Filter tabs: **Unreviewed · Reviewed** only — no "All" tab.
- Default active tab: **Unreviewed**.
- TopBar title: `t('mistakes.category.' + category)` when `category` is set; `t('mistakes.title')` when null.
- TopBar meta: "N blunder(s)" (total in category, both tabs).
- Back button: `go('mistakes')` when `category` is set; `go('stats')` otherwise.
- Blunder card tap: sets `mistakeContext = "list"`, sets `selMistake`, sets `blunderNavList` to the currently displayed ordered list, → `go('blunderDetail')`.

*Analytics:* `track('mistake_category_detail_viewed', { category })` on mount.

#### Frontend — Level 3: `MistakeDetail` (`blunderDetail` route)

`MistakeDetail` is unchanged in layout. Three new props:

**`mistakeContext: "list" | "game"` (default `"list"`)**
Controls the back button destination:
- `"list"` → `go('mistakeDetail')` (back to category detail)
- `"game"` → `go('review')` (back to Post-Game Review)

**`mistakeSource: { date: string, gameId: string } | null` (default `null`)**
When present, renders a tappable source-game link in the TopBar meta area:

```
← Mistake     Move 8 / 22 · Jun 7 game ›
```

Tapping "Jun 7 game ›" calls `go('review', { id: mistakeSource.gameId })`.

When `mistakeSource` is null, the TopBar meta renders as before: `"Move N / M"`.

**`blunderNavList: Blunder[]` (required, default `[]`)**
The ordered list of blunders to navigate with Prev/Next:
- When `mistakeContext === "list"`: set by `MistakesList` to the category-filtered list in severity-desc order (same order as the list view). Prev/Next navigates within the category only.
- When `mistakeContext === "game"`: set by `PostGameReview` to the blunders for the current game (those with `game_id` matching the current game), ordered by `moveIndex` asc. Prev/Next navigates within the game only.

`selMistake` is an index into `blunderNavList`. The toolbar counter reads `"N of M"` where M is `blunderNavList.length`.

#### PostGameReview — blunder nav assembly and timeline tap update (`screens_sparring.jsx`)

**On mount (when `props.id` is present):** `PostGameReview` fetches `GET /api/coach/queue?game_id=<props.id>` and stores the result as `blunderNavList` (ordered by `moveIndex` asc, i.e. by `board_state.length` asc). This list is passed to `blunderDetail` when the user taps a blunder node.

`moveIndex` is not stored as a separate DB column — it is derived as `board_state.length` in the API response layer (the number of moves already played when the blunder was recorded).

The `"Move N / M"` display in `MistakeDetail` resolves as:
- **N** = the blunder's `moveIndex` (= `board_state.length` from the coach/queue response).
- **M** = total moves in the game, derived from `games.move_string.length`. `PostGameReview` already has `move_string` (from `POST /api/games/analyze`); pass it as part of `mistakeSource` or derive M from the length of the analyzed-moves array.

The thumbnail `playedCell` overlay:
- **col** = `blunder.move_played` (already on the blunder row).
- **row** = must be derived from `board_state` by counting the number of discs already in that column (i.e. the height of that column at the time the blunder was made). Do not read row from the mockup's `playedCell.row` field — that field does not exist on real blunder rows.

**Tapping a `✕` (blunder) node in the move timeline:**
  1. Sets `mistakeContext = "game"`.
  2. Sets `mistakeSource = { date: game.date, gameId: game.id, totalMoves: move_string.length }`. `game.date` is the formatted `gameDate` field returned by `POST /api/games/analyze` (ISO 8601, format client-side e.g. "Jun 7"). `game.id` is `props.id` (the `id` navigation param, passed by either `GameBoard` or `PastGamesList` — `PostGameReview` does not distinguish).
  3. Sets `selMistake` to the index of the blunder matching that move index within `blunderNavList`.
  4. `blunderNavList` is already populated from the on-mount fetch above; no re-assignment needed.
  5. Calls `go('blunderDetail')`.
- Tapping a `?` (suboptimal) node continues to navigate to `go('explorer')` as before — no change.

#### App shell wiring

Production routing uses `SCREENS` + `URL_MAP` + `SURFACE_BG` + `SESSION_ONLY_SCREENS` (in `src/lib/screenRegistry.jsx`, `src/lib/urlMapping.js`, `src/lib/surfaceGroups.js`). There is no `NAV_GROUPS` concept in production — that construct exists only in the mockup `app.jsx` prototype.

*`SCREENS` changes (`src/lib/screenRegistry.jsx`):*
```js
mistakes:      (p) => <CategoryList {...p} />,                           // was MistakesList
mistakeDetail: (p) => <MistakesList {...p} category={p.selCategory} />,  // new
blunderDetail: (p) => <MistakeDetail {...p} />,                          // was mistakeDetail
```
`mistakes` and `mistakeDetail` are already registered in production (routing contracts unchanged — only their rendered component changes). Only `blunderDetail` is a new registration.

*`URL_MAP` changes (`src/lib/urlMapping.js`):*
- `blunderDetail` → `/blunder` (new entry; `mistakes` and `mistakeDetail` already present).

*`SURFACE_BG` changes (`src/lib/surfaceGroups.js`):*
- `blunderDetail` → `'--bg-home'` (same surface group as `mistakes` and `mistakeDetail`; new entry only).

*`SESSION_ONLY_SCREENS` changes (`src/lib/screenRegistry.jsx`):*
- Add `mistakeDetail` and `blunderDetail` to `SESSION_ONLY_SCREENS`. Deep links to either route bounce to the list root (`mistakes`). `mistakeDetail` requires `selCategory` state that is not URL-encoded; `blunderDetail` requires `blunderNavList` state that is not URL-encoded. Both are session-only.

*New app-level state:*
- `selCategory: string` (default `"claimeven"`). Always a DB slug.
- `mistakeContext: "list" | "game"` (default `"list"`).
- `mistakeSource: { date: string, gameId: string, totalMoves: number } | null` (default `null`).
- `blunderNavList: Blunder[]` (default `[]`).

*Thread all four through `props`* (include both value and setter for each).

#### i18n keys (new/updated, in `en.json`)

```
mistakes.title                     "Past Mistakes"
mistakes.to_review                 "{count} to review"
mistakes.cat.done                  "done"
mistakes.cat.new                   "{count} new"
mistakes.detail.tab_unreviewed     "Unreviewed"
mistakes.detail.tab_reviewed       "Reviewed"
mistakes.detail.all_caught_up      "All caught up in this category!"
mistakes.detail.none_reviewed      "None reviewed yet — tap a blunder to study it."
mistakes.detail.meta_count         "{count} blunder"
mistakes.detail.meta_count_pl      "{count} blunders"
mistakes.detail.source_game        "{date} game"
mistakes.category.claimeven        "Claimeven"
mistakes.category.forced_block     "Forced block"
mistakes.category.immediate_threat "Immediate threat"
mistakes.category.double_threat    "Double threat"
mistakes.category.forced_win       "Forced win"
mistakes.category.z_threat         "Z-threat"
mistakes.category.odd_even_threat  "Odd / even threat"
mistakes.category.undercut         "Undercut"
mistakes.category.overcut          "Overcut"
mistakes.category.figure_7         "Figure-7"
mistakes.category.j_shape              "J-shape"
mistakes.category.forbidden_columns   "Forbidden columns"
mistakes.category.unknown             "Other"
```

> `GET /api/coach/queue` is intentionally unfiltered by blunder source — it returns both game blunders and puzzle blunders. The Mistakes surface shows a unified view. `forbidden_columns` is a puzzle-only pattern category; its i18n key is required so it renders correctly in the category list when puzzle blunders are present.

#### CSS additions (new classes, add to `styles.css`)

From `screens_mistakes.jsx`:
- `cat-row` — full-width tappable category row card (flex row, white bg, rounded, shadow)
- `cat-thumb` — small board thumbnail container in `CategoryList` row
- `cat-row-body` — flex-column text section of category row
- `cat-row-name` — category name text
- `cat-reviewed-badge` — green "done" chip with check icon
- `cat-new-badge` — amber "N new" badge
- `cat-row-count` — total blunder count on right side of row
- `meta-game-link` — tappable inline button in TopBar meta area ("Jun 7 game ›")

#### NOT included

- Category icons beyond the board thumbnail (future visual enhancement — the mockup thumbnail is the icon for MVP).
- Cross-category "All blunders" flat view.
- Spaced-repetition scheduling.
- Blunder capture from Challenges (puzzle blunders, not game blunders — different source; existing Epic 3c covers puzzle blunders only).

---

## Dependency graph

```
[already shipped: Sparring game board, Post-Game Review, Past Mistakes review]
  └─► Epic A (Past Games navigation; adds game_id migration + GET /api/games)
        └─► Epic B (Blunder category navigation + two-way links)
```

Epic A ships first. Epic B depends on Epic A's `game_id` migration.

---

## Summary

| Epic | New screens / routes | Backend changes | Spec lines | Tasks |
|---|---|---|---|---|
| A. Past Games Navigation | `pastGames` (new); Home card | `GET /api/games` (new); extend `POST /api/games` (add `accuracy`); extend `POST /api/games/analyze` (server-side blunder inserts gain `game_id`, anonymous-user skip, response gains `gameDate`); migration: `game_id` + index on `blunders`, `accuracy` column on `games` | 145–170 | 26–32 |
| B. Blunder Category Navigation | `mistakes` → `CategoryList`; `mistakeDetail` → `MistakesList` with category slug; `blunderDetail` → `MistakeDetail` | extend `GET /api/coach/queue` with `?category=` slug filter + `?game_id=` filter (adds `game_id` to SELECT; derives `moveIndex` as `board_state.length`) | 145–170 | 26–32 |
