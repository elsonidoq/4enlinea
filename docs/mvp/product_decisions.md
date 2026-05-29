# DecodeC4 — Product Decisions

*Fills behavioral and business-rule gaps in `product_vision.md` so engineering epics can be planned without further product questions. Does not repeat or rewrite anything already specified in that document.*

---

## Pre-identified gaps

### Gap 1 — Move quality thresholds

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

### Gap 2 — Persistence without login

| Data type | Storage | Notes |
|---|---|---|
| Lesson progress (node states) | Device-local (localStorage) | Key per lesson ID |
| Challenge attempt history | Device-local (localStorage) | Per-session accuracy only; no cross-session aggregation for MVP |
| Sparring game record (W/L/D) | Device-local (localStorage) | |
| Daily streak | Device-local (localStorage) | Reset if no attempt recorded for the current calendar day |
| Post-game review data | Device-local, current session only | Discarded on app close without login |

No anonymous server rows are created for unauthenticated users. All data is lost when localStorage is cleared. Account creation migrates device-local data to the server (schema TBD, not MVP-blocking). The profile icon on the Hub opens a sign-up prompt for unauthenticated users.

---

### Gap 3 — Freemium gate scope

**Lessons:** Lessons 1–7 free. Lessons 8–11 Pro-gated (padlock on Saga Map node; tapping shows upgrade prompt).

**Challenge sets:** Sets that correspond to Lessons 1–7 content (Spot the Win, Block Before You Build, The Fork, Claimeven, Z-Threat) are free. The **Mixed** set is Pro-gated. Sets corresponding to Lessons 8–11 (Undercut, Overcut, Figure-7, J-Shape) are Pro-gated.

**Sparring:** Free at all four difficulty levels. Free users have a **weekly Coach interaction limit** (default: 20 Deep Reveal LLM calls per week across Sparring and Challenges combined). Once the limit is reached, the "Learn more" button is hidden and tapping it shows an upgrade prompt instead. The counter resets on Monday 00:00 UTC. Pro users have no limit.

**Upgrade CTA for MVP:** Tapping any locked feature shows a modal: "Coming soon to Pro — join the waitlist." A single email input field + "Notify me" button. No Stripe, no payment flow in MVP. The modal is dismissible.

---

### Gap 4 — Post-game analysis trigger

Analysis runs **lazily** — it starts when the Post-Game Review screen first opens, not during the game.

The timeline renders immediately with all nodes showing a neutral gray "pending" state. Nodes update to their quality color as each move's score resolves. The board stays interactive (the user can already tap completed nodes).

**Timeout rule:** if a single move's solver evaluation takes more than 8 seconds, mark that node `?` (unknown quality, neutral gray) and continue with the remaining moves. The `?` node is excluded from the accuracy denominator.

**Solver error:** same treatment as timeout — node shows `?`, excluded from accuracy. The review screen does not crash or block; the user still sees all correctly analyzed moves.

Deep Reveal on a `?` node shows the Tier 1 fallback text (the rule-based classifier phrase) with no LLM component. No retry button for MVP.

---

### Gap 5 — Lesson content storage

Lesson content (concept slide text, board positions, Socratic board setups, confirmation challenge puzzle IDs) lives in **hardcoded JSON files in the repo**, one file per lesson (e.g., `lessons/lesson-05-claimeven.json`). The server loads these at startup and exposes them via a `/api/lessons/:id` endpoint.

No admin UI for MVP. Content is authored by developers in code review. Lesson 4 (reading-only) has no puzzle IDs — its JSON contains only slides.

This is a deliberate MVP trade-off: runtime editability is not needed until content iteration begins at scale. Adding a DB-backed lesson table is a post-MVP migration.

---

### Gap 6 — Empty and error states

**(a) Challenge set with fewer than 8 approved puzzles:**
Show what is available. Set card on the picker displays the actual count (e.g., "3 positions"). Entry is not blocked. If zero approved puzzles exist for a category, the set card is hidden from the picker entirely (not shown as locked).

**(b) LLM timeout on Deep Reveal:**
Show the Tier 1 summary text in the expanded panel with a note: *"Detailed explanation unavailable."* No retry button for MVP. The loading state times out after 6 seconds.

**(c) First-time user on Stats screen:**
Show zeros for all metrics. No gate, no "play first" prompt. Stats screen is always accessible from the Hub. Example display: "0 puzzles · 0% accuracy · 0-day streak · 0 lessons complete."

---

## Additional gaps found in review

### Gap 7 — Lesson completion definition

A lesson is **complete** when the user has advanced past every concept slide AND has answered at least one confirmation challenge correctly. If the user fails every puzzle on every attempt, the confirmation challenges stay active — they may retry until at least one correct answer is submitted. The concept slides do not need to be repeated on retry.

**Socratic board:** counts as one step. If the user fails twice, the correct column is briefly highlighted and the lesson advances automatically. This does not block completion.

**Lesson 4 (reading-only):** no confirmation challenges. Completes on advancing past the last concept slide.

**Replay:** tapping a completed lesson node on the Saga Map replays the lesson from the beginning. Replay does not reset the completed state — the checkmark stays.

Completion state is written to persistence immediately when the last step is submitted (before navigating back to Saga Map).

---

### Gap 8 — Challenge board: single-move puzzles

All challenge puzzles are **single-move**. The user plays one column and sees feedback (Screens 6 → 7). The AI does not respond. "Next →" immediately advances to the next position. There is no multi-move sequence in Challenges.

**Undo is not available in Challenge mode.** Once the disc animates into place the move is committed and scored. There is no retry for a wrong move — the user sees feedback and moves on. Undo can be revisited in a future iteration if needed.

---

### Gap 9 — Challenge puzzle draw and repeat behavior

Puzzles within a set are drawn **randomly without replacement** from the pool of approved puzzles for that category. Each session draws exactly 8 (or all available if fewer than 8). The same puzzle will not appear twice in a single session.

Across sessions (re-playing a set), a new random draw is made — puzzles may repeat. No "spaced repetition" or recency weighting for MVP.

The puzzle draw happens server-side at the moment the user enters the set (not pre-fetched at Set Picker load time).

---

### Gap 10 — Hint effect on accuracy and Undo behavior

**Hint in Challenges:** showing the column score heatmap does not affect accuracy. The user's column choice after seeing the hint is still scored normally.

**Hint in Sparring:** same rule — the hint heatmap does not affect post-game accuracy scoring.

**Undo in Challenges:** not available (see Gap 8).

**Undo in Sparring:** Undo is not available (the Action Toolbar shows Hint and Resign only in Sparring). The vision's Sparring Action Toolbar lists these two; no Undo. Post-game accuracy reflects every committed move.

---

### Gap 11 — AI difficulty mapping

| Difficulty | Deliberate mistake rate |
|---|---|
| Easy | ~every 4 moves on average |
| Medium | ~every 7 moves on average |
| Hard | ~every 15 moves on average |
| Perfect | Never |

**Deliberate mistake mechanics:** when a deliberate mistake fires, the AI selects the second-best legal move (by solver score) and emits a Coach phrase announcing it ("Oops. Did I just give you something?"). At Perfect, the Coach never announces a deliberate mistake and always plays the best move.

The existing temperature-based sampling code for move selection is **kept** — the table above defines the *deliberate mistake trigger rate* (when the AI intentionally plays second-best and says so), which layers on top of the temperature sampling rather than replacing it. Move-quality variation from temperature sampling still applies between deliberate mistakes.

---

### Gap 12 — Post-Game Review timeline scope

The move timeline shows **only the user's moves**, numbered 1, 2, 3, … in the order played (not counting AI moves). AI moves are not scored or displayed.

A node is colored by quality (green/orange/red) once analysis resolves. The **"prev/next mistake" navigation** jumps between nodes with quality = Suboptimal or Blunder. Optimal nodes are skipped.

If the game has no Suboptimal or Blunder moves, the prev/next buttons are disabled and the Coach phrase on the Post-Game Review reflects this: *"Clean game. Nothing to revisit."*

---

### Gap 13 — Stats screen content

The Stats screen shows:

- **Puzzles solved:** total challenge positions attempted all time (each session contributes; not deduplicated).
- **All-time accuracy:** `total_optimal / total_scored` across all challenge sessions.
- **Lessons complete:** N / 11.
- **Sparring record:** W / L / D.
- **Daily streak:** consecutive calendar days with at least one puzzle attempt or sparring game.

For unauthenticated users, all values are read from device-local storage. Displayed as integers/percents; no charts or history graphs for MVP.

---

### Gap 14 — Back-navigation from a mid-set challenge

Tapping the back arrow during an active challenge set (before the Post-Set Summary) shows a confirmation dialog: *"Leave this set? Your progress won't be saved."* Two options: **Keep going** and **Leave**.

If the user leaves, they return to the Set Picker. No partial session is saved. Accuracy for the abandoned session is discarded.

---

### Gap 15 — Coach recommendation logic on Post-Set Summary

The Coach recommends the lesson corresponding to the **pattern with the lowest accuracy in that session**. Accuracy per pattern = `optimal / attempted` within that session.

Tie-break: recommend the pattern that appears earliest in lesson order (Lesson 1 before Lesson 2, etc.).

If the user scored 100% on every pattern, the Coach shows a congratulatory phrase (*"Perfect set. Try a harder one."*) and the CTA becomes **"Back to Challenges"** (no lesson link).

The lesson link on the CTA scrolls the Saga Map to the recommended lesson node. If the recommended lesson is locked (Pro-gated), the CTA instead shows the upgrade prompt.

---

### Gap 16 — Position Explorer: AI difficulty during exploration

When the user tries an alternative move in Position Explorer, the AI responds at the **same difficulty as the original sparring game**. This is consistent — the user is re-exploring the same game context.

The user may explore freely with no move limit. These exploratory moves are not recorded to the sparring game record. The "Start new game from here" action creates a new game entry in persistence, distinct from the reviewed game.

---

### Gap 17 — Sparring game end conditions

| Condition | Outcome |
|---|---|
| Four in a row for user | Win |
| Four in a row for AI | Loss |
| Board full with no four in a row | Draw |
| User taps Resign | Loss |

All outcomes go to Post-Game Review. Resign counts as a Loss in the sparring W/L/D record.

If the app is closed or navigated away mid-game without Resign, the game is silently abandoned (no record written). For unauthenticated users, this is acceptable — no draft game persistence for MVP.
