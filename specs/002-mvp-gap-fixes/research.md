# Research: MVP Gap Fixes

**Date**: 2026-04-30  
**Source**: Codebase inspection + existing documentation in `docs/mvp/`

---

## R1 — Empty State Pattern (G1)

**Decision**: Add a guarded branch in `loadPuzzle()` that detects zero puzzles and sets a new `emptyCategory` state flag; render the empty state card from this flag.

**Rationale**: The current bug is that `selectedCategory` is set before puzzles are verified to exist, trapping the render in the `if (!puzzle)` loading branch. The simplest fix is an early return that sets `emptyCategory = true` when `categoryPuzzles.puzzles.length === 0` and immediately renders the empty state.

**Alternative considered**: Show count on category card and disable click when count = 0. Rejected — users should still be able to enter the category to see the empty state message (content is added incrementally).

---

## R2 — Placeholder Puzzle Format (G1, G2)

**Decision**: JSON file at `connect-four/server/data/placeholder_puzzles.json` with the same schema as the `puzzles` DB table. A one-time seed endpoint (`POST /api/admin/seed-puzzles`, guarded to `localhost` only) inserts them. Puzzles are solver-verified via the existing `/api/scores` endpoint.

**Rationale**: The DB `puzzles` table schema already exists in `003_puzzles.sql`. JSON matches the existing insert path in the codebase. The admin endpoint avoids requiring Supabase to be running for local development — it can also insert into an in-memory array for pure-local testing if Supabase is absent.

**Alternative considered**: Hardcode placeholder puzzles directly in `PuzzlesPage.jsx`. Rejected — mixing content and presentation; also would not exercise the API path.

---

## R3 — Puzzle Curation Tool Placement (G2)

**Decision**: A new React route `/admin/curate` inside the existing SPA. The route is not linked from any navigation; it is accessed by URL directly. No authentication is required for the tool itself (it is internal-only).

**Rationale**: Reuses `<Board>` and the existing `/api/scores` endpoint. No additional infrastructure needed. An admin-only password gate would be over-engineered for a one-person product.

**Alternative considered**: A standalone Node.js CLI script. Rejected — the visual board preview is the primary productivity benefit of the tool; a CLI cannot render the board.

---

## R4 — `signup_completed` Tracking (G12)

**Decision**: Fire `signup_completed` inside `onAuthStateChange` when the event type is `'SIGNED_IN'` (magic-link completion or social sign-in). Do not fire on `'TOKEN_REFRESHED'` or `'INITIAL_SESSION'`.

**Rationale**: Supabase `onAuthStateChange` fires for multiple event types. `'SIGNED_IN'` is the event that corresponds to a new session being established interactively (the magic link was clicked). `'INITIAL_SESSION'` fires on every page load when the user is already signed in — tracking that would inflate signup counts.

**Alternative considered**: Firing from the `AuthModal` after `signInWithOtp()` succeeds. Rejected — `signInWithOtp()` only sends the email; the actual session is established when the magic link is clicked, which happens outside the modal. Tracking at `signInWithOtp()` would count email sends, not completions.

---

## R5 — `upgrade_completed` Tracking (G12)

**Decision**: In the Stripe `checkout.session.completed` webhook handler, after `supabase.from('users').update({ tier: 'paid' })` succeeds, insert a row directly into the `tracks` table with `event: 'upgrade_completed'`.

**Rationale**: The webhook handler runs server-side without a browser context, so the client-side `track()` helper cannot be used. The direct insert matches how the server already tracks events in `POST /api/track`.

**Alternative considered**: Emit a server-sent event to the client and let the client call `track()`. Rejected — adds real-time infrastructure (SSE/WebSockets) for a single analytics event; not worth the complexity.

---

## R6 — Post-Commit Reveal Scores (G7)

**Decision**: In `commitMove()` in `HomePage.jsx`, add a parallel `/api/scores` call with `moves = movesBeforeCommit` (the position before the user's move). Use the returned scores to compute `playedScore = scores[candidateCol]`, `bestCol = argmax(scores)`, `bestScore = max(scores)`. Store these alongside `oneLiner` in `postReveal` state.

**Rationale**: The scores for the pre-move position directly answer "how good was my move?" and "what was the best move?". The existing `/api/explain-move` response does not include scores (adding it would break existing callers and add response size). A parallel call is clean and additive.

**Performance note**: The `/api/scores` and `/api/explain-move` calls are made in parallel (`Promise.all`), so latency is bounded by the slower of the two, not the sum.

**Alternative considered**: Add `scores` to `/api/explain-move` response. Rejected — changes the response schema and requires updating all existing callers; over-scope for this fix.

---

## R7 — `hard` Difficulty Error Rate (G11)

**Decision**: 20% random move probability for `hard`. Constant `HARD_ERROR_RATE = 0.2` at top of `HomePage.jsx`. Implement as: `if (difficulty === 'hard' && Math.random() < HARD_ERROR_RATE) { pick random legal column } else { pick best }`.

**Rationale**: 20% error rate means the AI plays optimally 80% of the time — noticeably weaker than perfect but still challenging. This is a common convention in game AI difficulty scaling. The constant makes it easy to tune post-launch.

**Alternative considered**: A rating-based system (Elo) where hard plays at a specific Elo level. Rejected — requires a full Elo model; the simple error-rate approach is sufficient for MVP.

---

## R8 — Blunder First-Attempt Guard (G15)

**Decision**: Add `attemptNumber` to the `POST /api/puzzles/:id/check` request body (1 or 2). Server inserts blunder only when `attemptNumber === 1 && !isSuccess`. Client sends `attemptCount + 1` before incrementing (i.e., the current attempt being evaluated).

**Rationale**: The server currently has no way to distinguish first from second attempts — the client always sends `moveHistory: []`. Adding an explicit `attemptNumber` field is the minimal change that makes the intent unambiguous and adds no complexity.

**Alternative considered**: Track attempts server-side in a session table. Rejected — over-engineered; the client already tracks `attemptCount` in React state.

---

## R9 — `005_coach.sql` Migration (G14)

**Decision**: Create an intentionally minimal file whose only function is to satisfy migration runner ordering. Since the blunders table and its index are already in `003_puzzles.sql`, the file adds only a comment confirming the schema is in place plus a no-op statement (`SELECT 1;`) to ensure the file is syntactically valid.

**Rationale**: The runner applies files in alphabetical/numeric order. A gap in numbering would cause confusion if future migrations reference "005". The file must exist.

---

## R10 — `session_stats` Migration (G16)

**Decision**: New migration `006_session_stats.sql` with a `session_stats` table keyed by `(user_id, date)` with a JSONB `stats` column. RLS policy: users can only read/write their own rows.

**Rationale**: The `SupabaseStore` already references this table and its schema is implicit in the JS code. Making the schema explicit in a migration ensures clean deploys and enables Supabase type generation.

---

## R11 — Coach Page Gate UX (G8, G10)

**Decision**:
- Anonymous: show "Sign in" button that opens `AuthModal`. The button is sized and styled consistently with other CTAs in the app.
- Free (signed-in, not paid): do not auto-fire `PaywallModal`. Instead, render a locked-state card (same visual pattern as `PuzzleCategoryList` locked categories) with label "Personal AI Coach — Paid Feature" and an "Upgrade" button that opens `PaywallModal` on click.

**Rationale**: Auto-firing a modal on page load is aggressive and unexpected. Users should see the page state first and choose to act. This matches how locked puzzle categories are presented.

**Alternative considered**: Redirect `/coach` to `/` with a toast message for non-paid users. Rejected — destroys the upgrade discovery moment; users should see the locked page, not a redirect.
