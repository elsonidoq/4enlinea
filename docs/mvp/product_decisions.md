# DecodeC4 — Product Decisions

*Behavioral rules, business logic, and edge-case decisions that complete the product vision. This document is authoritative — where it conflicts with `product_vision.md`, the more specific rule here takes precedence. Does not repeat or rewrite anything already specified in that document.*

---

### Move quality thresholds

**Score classification (applies to Challenges and Post-Game Review alike):**

Use the sign of the c4solver score to determine outcome category, then compare the played move's score to the best available score:

| Condition | Label |
|---|---|
| `score(played) = score(best)` | **Optimal** |
| `sign(score(played)) = sign(score(best))` but `played ≠ best` | **Suboptimal** |
| `sign(score(played)) < sign(score(best))` | **Blunder** |

Sign ordering: positive (win) > 0 (draw) > negative (loss). A Blunder is specifically a move that changes the outcome category — winning→draw, draw→loss, or winning→loss. A Suboptimal move reaches the correct outcome but more slowly (e.g., winning in 18 moves instead of 12). Losing positions where all moves are negative: Optimal = least negative; Blunder = more than 4 score points below the least negative (approximately 2 extra ply lost).

**Accuracy formula:**

```
accuracy = optimal_moves / scored_moves
```

`scored_moves` = total user moves minus forced moves. A move is **forced** when exactly one legal column exists. Forced moves are excluded from accuracy because there is no decision. Hint-assisted moves are scored normally (the user still chooses the column). The formula is applied only to user moves — AI moves are never scored.

**Accuracy display:** round to the nearest integer percent. Show `--` if `scored_moves = 0` (e.g., a very short game where every move was forced).

---

### Persistence without login

| Data type | Storage | Notes |
|---|---|---|
| Lesson progress (node states) | Device-local (localStorage) | Key per lesson ID |
| Challenge attempt history | Device-local (localStorage) | Per-session accuracy only; no cross-session aggregation for MVP |
| Sparring game record (W/L/D) | **Server (`games` table, keyed by `device_uuid`)** | **Stale note:** earlier versions of this table said device-local. Superseded — see "Game persistence and blunder capture" section. A server row is required for Epic 3b's `/api/games/analyze` to fetch the movestring by game ID. |
| Daily streak | Device-local (localStorage) | Reset if no attempt recorded for the current calendar day |
| Post-game review data | Device-local, current session only | Discarded on app close without login |

**Anonymous server rows for `games`:** An anonymous user's completed sparring game does create a server-side `games` row (keyed by `device_uuid`, `user_id` nullable). This is the sole exception to the rule below; all other data types in this table remain device-local for anonymous users. All non-game data is lost when localStorage is cleared. Account creation migrates device-local data to the server (schema TBD, not MVP-blocking). The profile icon on the Hub opens a sign-up prompt for unauthenticated users.

---

### Freemium gate scope

**Lessons:** Lessons 1–7 free. Lessons 8–11 Pro-gated (padlock on Saga Map node; tapping shows upgrade prompt).

**Challenge sets:** Sets that correspond to Lessons 1–7 content (Spot the Win, Block Before You Build, The Fork, Claimeven, Z-Threat) are free. The **Mixed** set is Pro-gated. Sets corresponding to Lessons 8–11 (Undercut, Overcut, Figure-7, J-Shape) are Pro-gated.

**Sparring:** Free at all four difficulty levels. Free users have a **weekly Coach interaction limit** (default: 20 Deep Reveal LLM calls per week across Sparring and Challenges combined). Once the limit is reached, the "Learn more" button is hidden and tapping it shows an upgrade prompt instead. The counter resets on Monday 00:00 UTC. Pro users have no limit.

**Upgrade CTA for MVP:** Tapping any locked feature shows a modal: "Coming soon to Pro — join the waitlist." A single email input field + "Notify me" button. No Stripe, no payment flow in MVP. The modal is dismissible.

---

### Post-game analysis trigger

Analysis runs **lazily** — it starts when the Post-Game Review screen first opens, not during the game.

The timeline renders immediately with all nodes showing a neutral gray "pending" state. Nodes update to their quality color as each move's score resolves. The board stays interactive (the user can already tap completed nodes).

**Timeout rule:** if a single move's solver evaluation takes more than 8 seconds, mark that node `?` (unknown quality, neutral gray) and continue with the remaining moves. The `?` node is excluded from the accuracy denominator.

**Solver error:** same treatment as timeout — node shows `?`, excluded from accuracy. The review screen does not crash or block; the user still sees all correctly analyzed moves.

Deep Reveal on a `?` node shows the Tier 1 fallback text (the rule-based classifier phrase) with no LLM component. No retry button for MVP.

---

### Lesson content storage

Lesson content (concept slide text, board positions, Socratic board setups, confirmation challenge puzzle IDs) lives in **hardcoded JSON files in the repo**, one file per lesson (e.g., `lessons/lesson-05-claimeven.json`). The server loads these at startup and exposes them via a `/api/lessons/:id` endpoint.

No admin UI for MVP. Content is authored by developers in code review. Lesson 4 (reading-only) has no puzzle IDs — its JSON contains only slides.

This is a deliberate MVP trade-off: runtime editability is not needed until content iteration begins at scale. Adding a DB-backed lesson table is a post-MVP migration.

---

### Empty and error states

**(a) Challenge set with fewer than 8 approved puzzles:**
Show what is available. Set card on the picker displays the actual count (e.g., "3 positions"). Entry is not blocked. If zero approved puzzles exist for a category, the set card is hidden from the picker entirely (not shown as locked).

**(b) LLM timeout on Deep Reveal:**
Show the Tier 1 summary text in the expanded panel with a note: *"Detailed explanation unavailable."* No retry button for MVP. The loading state times out after 6 seconds.

**(c) First-time user on Stats screen:**
Show zeros for all metrics. No gate, no "play first" prompt. Stats screen is always accessible from the Hub. Example display: "0 puzzles · 0% accuracy · 0-day streak · 0 lessons complete."

---

### Lesson completion definition

A lesson is **complete** when the user has advanced past every concept slide AND has answered at least one confirmation challenge correctly. If the user fails every puzzle on every attempt, the confirmation challenges stay active — they may retry until at least one correct answer is submitted. The concept slides do not need to be repeated on retry.

**Socratic board:** counts as one step. If the user fails twice, the correct column is briefly highlighted and the lesson advances automatically. This does not block completion.

**Lesson 4 (reading-only):** no confirmation challenges. Completes on advancing past the last concept slide.

**Replay:** tapping a completed lesson node on the Saga Map replays the lesson from the beginning. Replay does not reset the completed state — the checkmark stays.

Completion state is written to persistence immediately when the last step is submitted (before navigating back to Saga Map).

---

### Challenge board: single-move puzzles

All challenge puzzles are **single-move**. The user plays one column and sees feedback (Screens 6 → 7). The AI does not respond. "Next →" immediately advances to the next position. There is no multi-move sequence in Challenges.

**Undo is not available in Challenge mode.** Once the disc animates into place the move is committed and scored. There is no retry for a wrong move — the user sees feedback and moves on. Undo can be revisited in a future iteration if needed.

---

### Challenge puzzle draw and repeat behavior

Puzzles within a set are drawn **randomly without replacement** from the pool of approved puzzles for that category. Each session draws exactly 8 (or all available if fewer than 8). The same puzzle will not appear twice in a single session.

**Session resume (authenticated users):** entering a set checks for an open session (started but not completed) for that category. If one exists, the user resumes from the next unplayed puzzle and the progress bar reflects how many have already been played. Open sessions never expire — they remain resumable indefinitely until the full set is completed. Only when no open session exists is a fresh draw made.

**Anonymous users:** no session is persisted. Every visit draws fresh. Puzzles may repeat across visits.

Across sessions where a fresh draw occurs, puzzles may repeat. No "spaced repetition" or recency weighting for MVP.

The puzzle draw happens server-side at the moment the user enters the set (not pre-fetched at Set Picker load time).

---

### Hint effect on accuracy and Undo behavior

**Hint in Challenges:** the Coach's contextual nudge (names the task/threat, no column reveal, no raw scores) does not affect accuracy. The user's column choice after seeing the hint is still scored normally.

**Hint in Sparring:** same rule — the Coach's best-move highlight does not affect post-game accuracy scoring.

**Undo in Challenges:** not available (see Gap 8).

**Undo in Sparring:** Undo is not available (the Action Toolbar shows Hint and Resign only in Sparring). The vision's Sparring Action Toolbar lists these two; no Undo. Post-game accuracy reflects every committed move.

---

### AI difficulty mapping

| Difficulty | Deliberate mistake rate |
|---|---|
| Easy | ~every 4 moves on average |
| Medium | ~every 7 moves on average |
| Hard | ~every 15 moves on average |
| Perfect | Never |

**Deliberate mistake mechanics:** when a deliberate mistake fires, the AI selects the second-best legal move (by solver score) and emits a Coach phrase announcing it ("Oops. Did I just give you something?"). At Perfect, the Coach never announces a deliberate mistake and always plays the best move.

The existing temperature-based sampling code for move selection is **kept** — the table above defines the *deliberate mistake trigger rate* (when the AI intentionally plays second-best and says so), which layers on top of the temperature sampling rather than replacing it. Move-quality variation from temperature sampling still applies between deliberate mistakes.

---

### Post-Game Review timeline scope

The move timeline shows **only the user's moves**, numbered 1, 2, 3, … in the order played (not counting AI moves). AI moves are not scored or displayed.

A node is colored by quality (green/orange/red) once analysis resolves. The **"prev/next mistake" navigation** jumps between nodes with quality = Suboptimal or Blunder. Optimal nodes are skipped.

If the game has no Suboptimal or Blunder moves, the prev/next buttons are disabled and the Coach phrase on the Post-Game Review reflects this: *"Clean game. Nothing to revisit."*

---

### Stats screen content

The Stats screen shows:

- **Puzzles solved:** total challenge positions attempted all time (each session contributes; not deduplicated).
- **All-time accuracy:** `total_optimal / total_scored` across all challenge sessions.
- **Lessons complete:** N / 11.
- **Sparring record:** W / L / D.
- **Daily streak:** consecutive calendar days with at least one puzzle attempt or sparring game.

For unauthenticated users, all values are read from device-local storage. Displayed as integers/percents; no charts or history graphs for MVP.

---

### Back-navigation from a mid-set challenge

Tapping the back arrow during an active challenge set (before the Post-Set Summary) shows a confirmation dialog. Two options: **Keep going** and **Leave**.

**Authenticated users:** no confirmation dialog is shown — they can navigate away freely because their session is persisted and resumable. Returning to the same category resumes from where they left off.

**Anonymous users:** the dialog reads *"Leave this set? Your progress won't be saved."* If they leave, they return to the Set Picker and the in-progress draw is discarded.

---

### Coach recommendation logic on Post-Set Summary

The Coach recommends the lesson corresponding to the **pattern with the lowest accuracy in that session**. Accuracy per pattern = `optimal / attempted` within that session.

Tie-break: recommend the pattern that appears earliest in lesson order (Lesson 1 before Lesson 2, etc.).

If the user scored 100% on every pattern, the Coach shows a congratulatory phrase (*"Perfect set. Try a harder one."*) and the CTA becomes **"Back to Challenges"** (no lesson link).

The lesson link on the CTA scrolls the Saga Map to the recommended lesson node. If the recommended lesson is locked (Pro-gated), the CTA instead shows the upgrade prompt.

---

### Position Explorer: AI difficulty during exploration

When the user tries an alternative move in Position Explorer, the AI responds at the **same difficulty as the original sparring game**. This is consistent — the user is re-exploring the same game context.

The user may explore freely with no move limit. These exploratory moves are not recorded to the sparring game record. The "Start new game from here" action creates a new game entry in persistence, distinct from the reviewed game.

---

### Sparring game end conditions

| Condition | Outcome |
|---|---|
| Four in a row for user | Win |
| Four in a row for AI | Loss |
| Board full with no four in a row | Draw |
| User taps Resign | Loss |

All outcomes go to Post-Game Review. Resign counts as a Loss in the sparring W/L/D record.

If the app is closed or navigated away mid-game without Resign, the game is silently abandoned (no record written). For unauthenticated users, this is acceptable — no draft game persistence for MVP.

---

### Stats screen: unauthenticated vs authenticated

**Unauthenticated users** see session-only data on the Stats screen:
- Accuracy from the most recent challenge session only (or `--` if no session played)
- Lessons done count (from IndexedDB lesson progress)
- Sparring record W/L/D (from IndexedDB)
- No all-time aggregation, no per-pattern history

A "Sign up to track your progress over time" prompt is shown below the stats.

**Authenticated users** see full cross-session stats:
- All-time accuracy: `total_optimal / total_scored` across all sessions
- Total puzzles solved (all time)
- Lessons complete (N / 11)
- Sparring record W/L/D
- Day streak
- Accuracy-by-pattern bars colored by quality threshold
- Coach recommendation phrase + CTA to weakest lesson
- "Review past mistakes" link → Past Mistakes screen

---

### Auth and payments timeline

**Auth ships early in development** (after the app shell, before any surface goes to production users). The existing Supabase magic-link OTP flow, `ProfileStore`, `IndexedDBStore`, and `SupabaseStore` with migration are kept and reskinned to match the new visual design.

**Payments are deferred to the end of development.** The payment provider is not yet decided (Stripe or alternative). For MVP, the upgrade prompt (`UpgradeModal`) shows a waitlist email capture ("join the waitlist — Notify me") with no checkout, no Stripe redirect, and no tier change. Existing Stripe server routes are left untouched but not wired to any UI flow. `users.tier` stays `'free'` for all users until the payments epic ships.

---

### Deep Reveal access for anonymous users

Anonymous users have **no access** to Deep Reveals. Tapping "Learn more" while unauthenticated shows the `AuthModal` — there is no anonymous quota, no anonymous counter, and no IndexedDB quota fields.

- **Anonymous**: no Deep Reveal access; `AuthModal` is the gate (client-side); server returns 401 for unauthenticated requests to `/api/explain-move-llm`
- **Authenticated free**: 20 Deep Reveals per week, counter tracked server-side on `users.deep_reveal_count` + `users.deep_reveal_reset_at`; resets Monday 00:00 UTC
- **Pro**: no limit (future-proofed; `tier` stays `'free'` until payments epic ships)

When the weekly cap is reached for free users, tapping "Learn more" shows `UpgradeModal` (waitlist capture).

---

### Tied-move quality classification

No separate "tied move" feedback state exists. The Optimal / Suboptimal / Blunder model (Gap 1) handles ties:

- A move that ties with the best available move → **Optimal** (same score as best = Gap 1 definition of Optimal)
- A move that ties with another non-best move → **Suboptimal** (sign matches best but score differs from best)

No special "also works — ties with col X" message. The Tier 1 summary line and Coach phrase apply the standard quality register.

---

### Personal AI Coach scope for MVP

The Coach in MVP is two things:

1. **Real-time feedback during sparring**: the Coach Avatar gives one-liner phrases after every move (user good move / user blunder / AI normal move / AI deliberate mistake). This is the Coach as a *voice*, not a tracking system.

2. **Past mistake review**: after a game, the explanation engine identifies which moves were blunders. The user can browse these on the Past Mistakes screen and ask the Coach "what should I have played?" via Deep Reveal.

**Not in MVP**: weakness map (aggregating failures by category across sessions), prescriptive drill programs, review queue with oldest-first or spaced-repetition ordering, population benchmarking, opening-habit tracking. These are post-MVP once blunder data accumulates at scale.

---

### Game persistence and blunder capture

**Game persistence**: when a sparring game ends (any outcome), the client calls `POST /api/games` to save the complete game record to a new `games` table: `{ id, user_id (nullable), device_uuid, moves (movestring), difficulty, side, result, created_at }`. The game ID is passed to Post-Game Review for analysis.

**Blunder capture**: there is no async background job. Blunders are captured as a side effect of the lazy analysis already running in Post-Game Review:
1. User opens Post-Game Review → `POST /api/games/analyze` runs
2. As per-move quality resolves, any move with `quality === 'blunder'` is written to the `blunders` table (fire-and-forget, does not block UI)
3. If the user closes the app before opening Post-Game Review, that game's blunders are never captured — acceptable for MVP

**Anonymous users**: game records are saved with `device_uuid` only (no `user_id`). Blunder writes require a `user_id`; anonymous users' mistakes are not persisted to `blunders`. The Past Mistakes screen requires authentication.

---

### Past Mistakes review surface

A dedicated screen accessible from the authenticated Stats screen ("Review past mistakes" link).

- Lists blunder cards: compact board thumbnail, pattern category tag, date, "Reviewed" badge if `resolved_at` is set
- Filter tabs: All / Unreviewed / Reviewed
- Tap a card → Mistake Detail: board at mistake position with overlays, Coach one-liner, "What should I have played?" CTA → Deep Reveal for the best move (cached)
- "Mark as reviewed" → sets `resolved_at` on the `blunders` row
- Prev / Next navigation through the blunder list

Anonymous users see a "Sign up to save your mistakes" prompt instead of the list.

---

### Forbidden Columns puzzle type

The Forbidden Columns puzzle uses a **multi-select tagging interaction**, distinct from all other challenge types (which are single-move):

- Board renders in multi-select mode: user taps columns to mark them as forbidden (red tint + ✕ badge); tap again to untoggle
- A "Submit" button in the Toolbar replaces the normal Next flow; disabled until ≥1 column is selected
- On submit: correct forbidden columns flash green; incorrect tags (false positives) and missed forbidden columns (false negatives) are revealed simultaneously
- **Exact-match predicate**: the user's tagged set must exactly match every column where playing immediately grants the opponent a win on the next turn. Both false positives and false negatives count as wrong.
- Feedback strip shows partial credit: "3 / 4 forbidden columns found"
- Quality badge: Optimal = exact match; Suboptimal = partially correct (missed some, no false positives); Blunder = any false positive OR zero correct

---

### Prompt caching for Deep Reveal

All Deep Reveal LLM calls check the `explanation_cache` table before calling the LLM:

- **Cache key**: `SHA256(movestring + ":" + col)` stored in `position_hash`
- **Cache hit**: serve `deep_reveal_json` directly; no spinner (instant response)
- **Cache miss**: call `/api/explain-move-llm`; write result to `explanation_cache` on response
- Cache is shared across all users — one user's Deep Reveal populates it for everyone else at the same position

This applies to: Challenge Board Deep Reveal (Epic 2), Position Explorer Deep Reveal (Epic 3b), and Past Mistakes Deep Reveal (Epic 3c).

---

### User flag for LLM explanation quality

Every Deep Reveal panel includes a "Flag this explanation" button (flag icon, unobtrusive). Tapping it:
- Writes a row to the `llm_feedback` table: `{ movestring, llm_prompt, llm_response, human_note: '', feature: context }` where `context` identifies the surface (challenges / position_explorer / past_mistakes)
- Shows a brief confirmation: "Thanks — flagged for review"
- Does not close the panel or affect the explanation shown

No moderation UI, no review workflow for MVP. The table accumulates for manual inspection.

---

### Analytics instrumentation

The `tracks` table (already in DB schema) must be instrumented throughout the app. A shared `track(event, data)` utility is wired in the app shell (Epic 1b). All components call it without DB knowledge.

**Required events for MVP:**

| Event | When |
|---|---|
| `session_start` | App mount |
| `screen_viewed` | Every screen navigation |
| `puzzle_attempted` | User plays a move in Challenges |
| `puzzle_solved_correct` | Correct move in Challenges |
| `puzzle_solved_wrong` | Wrong move in Challenges |
| `set_completed` | Post-Set Summary loads |
| `deep_reveal_viewed` | Deep Reveal panel opens |
| `deep_reveal_flagged` | Flag button tapped |
| `signup_initiated` | AuthModal email submitted |
| `signup_completed` | Magic link confirmed |
| `waitlist_submitted` | UpgradeModal "Notify me" tapped |
| `lesson_started` | First concept slide of a lesson |
| `lesson_completed` | Lesson marked done |
| `game_started` | Sparring game begins |
| `game_ended` | Sparring game ends (any outcome) |
| `game_reviewed` | Post-Game Review screen opened |
| `mistake_reviewed` | Past Mistakes detail viewed or "Mark as reviewed" tapped |

All events include `uid` (device hash, always present) and `user_id` (Supabase ID when signed in, nullable).

---

### i18n strategy

**react-i18next stays wired throughout the app.** No epic removes it. All user-facing strings go through `t('key')` translation keys from day one.

- **English** (`en.json`): fully populated at launch
- **Spanish** (`es.json`): file exists but empty stub at launch; population is post-MVP content work
- The infrastructure must support adding a new language by populating a single JSON file, with no code changes required

This means: no hardcoded user-facing strings anywhere in the codebase; even placeholder/static Coach phrases go through i18n keys.

---

### Intentional cuts for MVP

The following were explicitly decided as out of scope for this MVP:

| Cut | Reason |
|---|---|
| Spaced-repetition (SR) scheduler | Need blunder review rate data before investing in scheduling logic |
| Cooperative AI multi-move puzzles (Fork Setup, Parity Control) | All challenge puzzles are single-move (Gap 8); multi-move complexity removed |
| Losing-position lessons | Low value for the 1000–1500 Elo target audience |
| Allis rules beyond Claimeven + Claimodd | Too abstract for the target audience; Claimeven and Claimodd are kept as concrete/visual |
| Saga Map visual variants A (winding path) and B (meadow stones) | Variant C (clean list) ships for MVP; A/B are polish |
| Weakness map + prescriptive drills | Requires accumulated blunder data at scale |
| Advanced Training Paths | Requires Personal AI Coach data at scale |
| Zugzwang as a named challenge category | Demoted to post-MVP Lesson 12 |
| Papergames.io integration | No game-history API available; blocked on data access |
| Population benchmarking ("38% more than average") | Requires a user base to compare against |
| Opening-habit tracking | Requires accumulated game data |
| Premium Analytics (ELO, win rate by opening, error trend charts) | Requires months of data |
