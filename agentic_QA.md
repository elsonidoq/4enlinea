# Agentic QA — 2026-07-07 (round 2: blunder-persistence retest)

Run scope: focused — blunder-dependent flows + import, after a **full local DB wipe** (clean slate, first-and-only user)
DB state: reset — schema present, all tables empty at start; imported papergames `69e773d36bf9938bffc1509a` fresh as the FIRST user
Tier(s) exercised: paid (flipped via DB right after login, so import is uncapped)
Viewport(s): mobile 390×844
Environment: local dev, Chrome (chrome-devtools MCP), API server log at `/private/tmp/claude-501/-Users-elsonidoq-prog-cuatro-en-linea/e03463df-1966-43b7-ace1-64f57c55a85d/scratchpad/app-qa-server.log`
Auth: `🛠 Dev: skip auth` → anonymous user `d2752b6b-4b9e-450b-8242-bcb10a3900ed`, no email

**Purpose:** Yesterday's round found a blocker — a second user importing the same papergames account got 0 persisted blunders because `idx_blunders_papergames_unique` omits `user_id`, so every blunder insert collided (23505) and was silently dropped. Many downstream findings (Past Games "No mistakes", "With mistakes" filter, "Worst Blunders" sort, deep reveal, mark-as-reviewed) were starved by that. The user wiped the whole local DB so this round imports as the FIRST user — blunders should now persist and the blunder-dependent flows should work. This run re-tests exactly those flows.

**Import result (this run):** UI "Imported 50 games." Server log `Done — imported: 50 skipped: 0 blunderErrors: 0 processed: 50`. DB: 50 `papergames_games`, **137 blunders** (72 quality=blunder, 65 quality=suboptimal). ✅ Blunders persist for the first user — the blocker's data-loss does NOT occur on a fresh single-user DB (as expected; the underlying index bug is still latent for the 2nd-user case).

## Summary
- **Blockers: 1 (latent/unfixed root cause)   Major: 4   Minor: 5   Polish: 0**
- **The retest verdict — blunder-dependent flows now WORK.** With blunders persisting (fresh single-user import), every flow that yesterday returned "No mistakes" / empty / 401 now functions:
  - Past Games list mistake counts populate (1/3/4 mistakes per card). ✅
  - "With mistakes" filter → 47 games (all with blunders). ✅
  - "Worst Blunders" sort → true descending by blunder count (6,6,6,5…), distinct from Recent. ✅
  - Blunder deep reveal ("What should I have played?") renders for all 3 sampled blunders — all fundamentally SOUND. ✅
  - "Mark as reviewed" → persists `resolved_at`. ✅
  - "Start new game from here" → loads the exact blunder position (Move 13, board matches `visualize_board`). ✅
  - `/mistakes` categories load; **Forced block category opens** (yesterday it permanently 401'd). ✅
- **BUT the root-cause blocker is NOT fixed.** `idx_blunders_papergames_unique` still omits `user_id`, so the data loss re-appears the instant a *second* user imports any overlapping papergames account. This run just didn't trigger it (single user). See finding below.
- **Still-reproducing, persistence-independent bugs:** ReviewScreen move stepper doesn't drive the board / blunder chips don't navigate; direct-URL blunder detail shows "Move N / 1" + "1 of 1" + drops "Start new game from here"; `/mistakeDetail` reload→home; raw debug fields (`sev:`/`tree:`/movestring) leak into blunder detail.
- **New this run (only observable now that blunders persist):** the Past Mistakes coach queue is hard-capped at `.limit(50)` with no pagination → 87 of 137 blunders and entire categories (undercut ×8, forced_win ×1) are unreachable in the UI.
- **Deep-reveal quality (Opus, 3 sampled — forced_block, double_threat, figure_7-losing):** all 3 sound — correct best move, correct Gray perspective, appropriate hold-the-line tone in the losing position, no `community-*` leakage. Common defect: 2 of 3 leak a **raw internal coordinate (`c2r1`, `c1r3`) into user-facing prose**; double_threat's named fork square isn't highlighted.

## Findings

### Area: Import / DB schema

#### [blocker] Root cause unfixed: `idx_blunders_papergames_unique` still omits `user_id` — 2nd user importing an overlapping papergames account will again lose all blunders
- **Severity:** blocker (latent — not triggered this run, but the schema defect is unchanged since yesterday)
- **Area:** Import / Past Games / Blunders / DB schema
- **Suspected code location:** the migration defining `idx_blunders_papergames_unique`; insert path `server/insertGameBlunder.js` (treats `23505` as a benign duplicate → returns success); importer `server/papergamesImporter.js` (counts the collision as `ok`, so `blunderErrors:0`).
- **Repro (not run this session — single user only):** User A imports papergames account X (blunders stored). User B imports the SAME account X → import assigns deterministic `papergames_games.id` → `(papergames_game_id, move_index)` collides → every `insertGameBlunder` gets `23505` → silently dropped → User B has 0 blunders.
- **Input used:** this run: single user `d2752b6b`, papergames `69e773d36bf9938bffc1509a`, 50 games → **137 blunders persisted** (72 blunder / 65 suboptimal), `blunderErrors:0`. Verified index: `CREATE UNIQUE INDEX idx_blunders_papergames_unique ON public.blunders USING btree (papergames_game_id, move_index) WHERE (papergames_game_id IS NOT NULL)` — **no `user_id`**.
- **Observed:** Single-user import works perfectly; the index has NOT been changed to include `user_id`.
- **Expected:** `UNIQUE (user_id, papergames_game_id, move_index)` so two users analyzing the same public papergames game don't clobber each other. **This is the actual fix** — yesterday's downstream findings were symptoms of it; they only "pass" now because there is exactly one user.
- **Evidence:** `pg_indexes` output above; import log `Done — imported: 50 skipped: 0 blunderErrors: 0 processed: 50`; DB `blunders` = 137, all owned by `d2752b6b`.

#### [minor] No "view imported games" CTA after a successful import (still reproduces)
- **Severity:** minor
- **Area:** Import
- **Suspected code location:** `SettingsScreen.jsx` Papergames Import success-state rendering.
- **Repro:** `/settings` → set id → Import → result text.
- **Input used:** viewport 390×844, paid, id `69e773d36bf9938bffc1509a`.
- **Observed:** result is plain text "Imported 50 games." with no link/button to Past Games.
- **Expected:** a CTA to jump to the imported games. (Tracked in new_TODOs.md.)
- **Evidence:** post-import snapshot shows only `StaticText "Imported 50 games."`, no interactive element.

### Area: Past Mistakes (coach queue)

#### [major] Past Mistakes queue hard-capped at 50 with no pagination — 87 of 137 blunders and entire categories (undercut, forced_win) are unreachable
- **Severity:** major (new — only observable now that blunders persist at scale)
- **Area:** Blunders / Past Mistakes
- **Suspected code location:** `server/index.js:2508` — `GET /api/coach/queue` applies `.order('severity',desc).order('created_at',asc).limit(50)` with **no offset/pagination**. The `/mistakes` category cards are derived client-side from this capped 50-item list, so any category whose blunders all fall outside the top-50-by-severity window never gets a card.
- **Repro steps:** Home → Progress & Stats → Review past mistakes (`/mistakes`).
- **Input used:** paid, user `d2752b6b`, 137 blunders in DB.
- **Observed:** `/mistakes` shows "49 to review" and 10 category cards. `GET /api/coach/queue?status=all` returns exactly **50** items (double_threat 3, forced_block 6, major_threat_parity 7, immediate_threat 2, suboptimal_move 13, figure_7 1, drawing_move 8, major_threat_nonparity 8, minor_threat 1, j_shape 1). **No `undercut` and no `forced_win` card**, yet the DB has 8 undercut + 1 forced_win blunders. `GET /api/coach/queue?status=all&category=undercut` returns all **8** undercut blunders — so the data exists and is server-reachable by direct filter, but the user can never navigate to it because no card is rendered.
- **Expected:** paginate the queue (or raise/remove the cap) so all persisted blunders are reviewable, and derive the category list from full per-category counts (a DB-side `count()` per category) rather than from a truncated 50-row page. `undercut`/`forced_win` are valid `VALID_BLUNDER_TAGS` (`server/blunderTags.js:12,14`), so their omission is a bug, not an intentional exclusion.
- **Evidence:** endpoint source `server/index.js:2501-2508`; queue responses above; `VALID_BLUNDER_TAGS` includes both categories.

### Area: Past Games / ReviewScreen

#### [major] ReviewScreen move stepper (Prev/Next + move chips) does not drive the board; blunder chips don't navigate
- **Severity:** major (independent of blunder persistence — blunders exist now and it still doesn't work)
- **Area:** Past Games (ReviewScreen)
- **Suspected code location:** `ReviewScreen.jsx` — the move-quality chip row (chips 1-8: green=optimal, red=blunder) and `← Prev` / `Next →` controls. An internal index advances (Prev toggles disabled→enabled after Next) but the rendered board (`__bsig` positional signature) is byte-identical, and clicking a red blunder chip neither navigates nor highlights.
- **Repro steps:** Past Games → open game `03b32884-…` (joe, 63%, Optimal 5 / Suboptimal 0 / Blunder 3) → click chip "3", "Next →", red chip "6".
- **Input used:** viewport 390×844, paid, game `03b32884-ab40-4943-b360-d8e4d8017d19`.
- **Observed:** board disc signature identical across all three clicks (17 discs, unchanged); URL unchanged; only side-effect is `← Prev` flipping from disabled to enabled (an index moved with no visible result). Red chips (6/7/8) = the 3 blunders but clicking them does nothing. Chip colors verified: 1-5 `rgb(43,180,98)` green, 6-8 `rgb(232,84,62)` red.
- **Expected:** stepping replays the board move-by-move; a blunder chip jumps to / opens that blunder's detail.
- **Evidence:** `__bsig` positional signature identical pre/post each click; Prev `disabled`→enabled transition; chip background-color readout.
- **Note:** On a *fresh* card-click load, the first "Next →" DID navigate to a `/blunder/:id` detail ("2 of 3"); on a direct-URL load of the same ReviewScreen it does not. The two entry paths disagree — likely the same client-state-vs-URL gap as the `/mistakeDetail` and direct-URL-blunder findings below.

### Area: Blunders / Deep Reveal

#### [major] Direct-URL / reload of `/blunder/:id` shows wrong "Move N / 1", collapses pagination to "1 of 1", and drops "Start new game from here" (still reproduces)
- **Severity:** major
- **Area:** Blunders / Deep Reveal / Navigation
- **Suspected code location:** `MistakeDetailScreen.jsx` — header "Move N / M", sibling pagination ("X of Y"), and the "Start new game from here" button all depend on client list/router state passed from the mistakes/review list, not on the `/api/blunders/:id` (or queue) payload.
- **Repro steps:** Fresh-navigate directly to `/blunder/b0d8d306-…` (double_threat) or `/blunder/3fbb9263-…` (figure_7).
- **Input used:** viewport 390×844, paid.
- **Observed:** header reads "Move 12 / **1**" and "Move 22 / **1**" (denominator = 1, should be the game's total move count); footer "1 of 1" with Prev/Next disabled even though the parent game has multiple blunders; only 2 action buttons (missing "Start new game from here" — present when reached via the review list).
- **Expected:** deep-link/reload renders the correct total-move denominator, correct sibling pagination, and all 3 actions.
- **Evidence:** snapshots of both direct-loaded blunder pages; `game_id` present on these rows but the header/pagination/actions ignore it. (Tracked in TODOs.md: blunder permalink refactor.)

#### [minor] Deep reveal leaks raw internal coordinates (`c2r1`, `c1r3`) into user-facing coach prose (2 of 3 samples)
- **Severity:** minor
- **Area:** Blunders / Deep Reveal (reason render layer)
- **Suspected code location:** the reason render / causal-link text builder — some templates interpolate the engine's raw `cXrY` cell tokens directly into the sentence instead of translating to a human column reference (or relying on the board highlight). The forced_block template did this correctly ("blocking move in column 5", "that same spot"); the double_threat and figure_7 templates did not.
- **Repro steps:** open deep reveal for double_threat `b0d8d306-…` and figure_7 `3fbb9263-…`.
- **Input used:** viewport 390×844, paid; movestrings `33243432244` (played 2) and `333333215444442561222` (played 2).
- **Observed (verbatim):**
  - double_threat: *"…you let your opponent take **c2r1** and make a 7-shaped double threat…"*
  - figure_7: *"…lets your opponent cash in the faster four-in-a-row line around **c1r3**…"*
- **Expected:** no raw `cXrY` in prose — use "column N" or point to the highlighted cell. (The coordinate is fine internally; it should not reach the reader.)
- **Evidence:** a11y text nodes; `compute_feature_vector 33243432244 2` → `completingCell:"c2r1"` (so the render is faithful to the engine — the defect is *surfacing* the token, not a wrong cell). `optimal_line 332434322442` → `completingCell:"c2r1"` confirms the engine value the text echoes.

#### [minor] Deep reveal (double_threat): named fork square `c2r1` is not highlighted on the board (still reproduces from yesterday)
- **Severity:** minor
- **Area:** Blunders / Deep Reveal (highlight integrity)
- **Suspected code location:** deep-reveal board highlight builder — only the "your move" (correct column, light-green) and "played move" (red) cells are marked; the opponent-threat / fork cell named in the text gets no marker.
- **Repro steps:** open deep reveal for `b0d8d306-…`.
- **Input used:** viewport 390×844, movestring `33243432244`, played 2, best 0.
- **Observed:** board marks c1r1 (light-green, correct block = column 1) and the played column-3 cell (red). The text names `c2r1` and describes a "7-shaped double threat" fork, but that square has no visual anchor.
- **Expected:** every named cell (and the fork squares) highlighted so the double threat is visible on the board.
- **Evidence:** screenshot `scratchpad/dr-double-threat.png`; text names `c2r1` with no corresponding board marker.

#### [minor] Raw debug fields leak into production blunder-detail UI (`sev:6 tree:0.28`, raw movestring) — still reproduces
- **Severity:** minor
- **Area:** Blunders / Deep Reveal
- **Suspected code location:** `MistakeDetailScreen.jsx` threat-legend section renders `board_state` / `severity` / `blunder_severity` (`tree`) as plain text.
- **Repro steps:** open any blunder detail → look under the pattern legend.
- **Input used:** viewport 390×844, blunders `d7f5298e-…` (`3333331222245 sev:4 tree:0.30`) and `b0d8d306-…` (`33243432244 sev:6 tree:0.28`).
- **Observed:** raw internal fields (movestring, `sev:`, `tree:`) printed to end users on every blunder detail.
- **Expected:** no raw debug/internal fields shipped.
- **Evidence:** a11y text nodes under the legend on multiple blunder details.

### Area: Navigation

#### [major] `/mistakeDetail` reload silently redirects to Home (still reproduces)
- **Severity:** major
- **Area:** Navigation
- **Suspected code location:** the `/mistakeDetail` route (`MistakeDetailScreen.jsx` / `urlMapping.js`) — SESSION_ONLY screen with no URL param; depends on state set by the programmatic nav from the Mistakes list, so any reload/popstate falls back to `/`.
- **Repro steps:** `/mistakes` → tap "Forced block" → `/mistakeDetail` (category list, "6 blunders") → reload.
- **Input used:** paid, viewport 390×844, category forced_block.
- **Observed:** reload of `/mistakeDetail` → Home; the category list is lost.
- **Expected:** reload restores the category detail (needs a URL param e.g. `/mistakeDetail/:category` or a state-recovery fallback).
- **Evidence:** `window.location.pathname` went `/mistakeDetail` → `/` after reload; no console/network errors.

### Positives verified (no finding)
- Forced_block deep reveal (`d7f5298e-…`, movestring `3333331222245`, user Gray): SOUND — correct block = column 5 (matches `bestCol=4`), light-green highlight on the correct column + red on the played column both land at the right cells, "next-move four" (not "community immediate threat"), true forced-block logic. Screenshot `scratchpad/dr-forced-block.png`.
- figure_7 deep reveal (`3fbb9263-…`, losing position, `bestScore=-1`): tone correctly hold-the-line ("tougher defense", "keeps your most stubborn swindle alive", "practical resistance") — not defeatist; best move = column 2 (matches `bestCol=1`).
- "Start new game from here" board matches `visualize_board.sh 3333331222245` exactly (screenshot `scratchpad/start-from-here.png`).
- Forced_block category with a **Green** user appears in the queue — legitimate for an imported-game blunder (the "user must be gray in forced_block" backlog rule is about generated *puzzles*, not real-game blunders), so not flagged.


## Run Metrics (proxies for token cost — drives next-session tuning)

| Area | Actions | Snapshots | Screenshots | Console/Net reads | ~Output lines | Biggest single output (~lines) | Findings |
|------|---------|-----------|-------------|-------------------|---------------|--------------------------------|----------|
| Setup + Import | 10 | 3 | 0 | 1 | ~200 | ~60 (agentic_QA read) | 2 |
| Past Games (list/filter/sort) | 8 | 2 | 0 | 3 | ~120 | ~40 | 1 |
| ReviewScreen stepper | 7 | 2 | 0 | 3 | ~90 | ~30 | 1 |
| Blunder detail + 3 deep reveals (Opus grade) | 22 | 8 | 3 | 3 | ~350 | ~90 (a11y snapshots) | 5 |
| Past Mistakes queue | 5 | 2 | 0 | 3 | ~110 | ~35 | 1 |
| Navigation (mistakeDetail reload) | 2 | 1 | 0 | 0 | ~30 | ~20 | 1 |

**Hotspots:**
1. **Deep-reveal board introspection** — discs render as radial-gradient `background-image`, not `backgroundColor`, so the first two `evaluate_script` disc-detectors returned 0 and I fell back to screenshots. Fix next time: seed `window.__bsig` (gradient-aware, provided in this session's transcript) once per game screen and reuse it; only screenshot to confirm a *highlight* defect.
2. **`agentic_QA.md` read at start** (~470 lines from yesterday). Unavoidable for continuity, but future focused reruns can read only the Summary + the specific finding being retested.

**Next-session tuning:**
- The real fix is the `user_id` unique-index change — apply it, then the 2nd-user import path can finally be QA'd (import as user A, dev-skip-auth a second user B, import same id, assert B gets its own blunders).
- Re-seed the local `puzzles` table before any Challenges QA (still empty this run — Challenges skipped, out of scope).
- Skip re-confirming the persistence-downstream symptoms next time — they're proven to collapse into the index fix. Focus reruns on the stepper, permalink, and coach-queue-cap findings which are independent.
- Board cells still lack `role`/`aria-label` — a gradient-aware board helper (or that a11y fix) would remove the screenshot dependency for highlight checks.
- **DB state left:** single user `d2752b6b` = **paid**, papergames_id `69e773d36bf9938bffc1509a`, 50 games, 137 blunders (1 forced_block resolved), 3 explanation_cache rows. `puzzles` empty.
