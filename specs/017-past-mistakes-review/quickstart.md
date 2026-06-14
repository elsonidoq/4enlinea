# Quickstart: Past Mistakes Review (Epic 3c)

## Prerequisites

- Node.js 20+ installed
- `.env` set up in `connect-four/server/` (Supabase service role key, OpenAI keys)
- At least one blunder in the DB for the test user (can be inserted manually or by playing a game and triggering post-game review blunder capture from Epic 3b)

---

## Development Setup

```bash
# Start server
cd connect-four/server && node index.js

# Start frontend (separate terminal)
cd connect-four && npm run dev
```

---

## Manual QA Gates

### Gate 1 — Anonymous gate

1. Sign out (clear session from Supabase).
2. Navigate to `go('mistakes')`.
3. Verify: user icon circle, "Sign up to save your mistakes" heading, "Create free account" button, "Maybe later" ghost button — both navigating to `stats`.
4. Verify: no API call to `/api/coach/queue` fires (check DevTools Network).

### Gate 2 — Empty state

1. Sign in with an account that has no blunders.
2. Navigate to `go('mistakes')`.
3. Verify: CoachAvatar (happy, size 88), "No mistakes captured yet" heading, body copy, "Play a game" CTA → navigates to `difficulty`.

### Gate 3 — Populated list

1. Sign in with an account that has ≥1 blunder.
2. Navigate to `go('mistakes')`.
3. Verify: blunder cards render with compact Board thumbnail, pattern tag (unless `pattern_category === 'unknown'`), date string.
4. Verify: `tr` overlay (red ring) on the played column's landing row in thumbnail.
5. Verify: `td` overlays (gray rings) on `threat_cells` cells in thumbnail.
6. Verify: filter tabs (All / Unreviewed / Reviewed) — tap "Unreviewed", confirm only unresolved blunders shown.
7. Verify: tap "Reviewed" with no reviewed blunders → "Nothing here — switch tabs to see your other moves."

### Gate 4 — Detail screen

1. Tap any blunder card.
2. Verify: `mistakeDetail` screen loads; TopBar shows "Mistake" as title and "Move N" in meta slot.
3. Verify: CoachDialog shows "You played column N here." (1-indexed) and "Let me show you what worked better." (mood: think).
4. Verify: Board renders from `board_state`; `tr` overlay on played column landing row; `td` overlays on threat cells.
5. Verify: pattern tag shown (unless `unknown`).
6. Verify: Toolbar Prev/Next navigate through blunders with wrap-around; Deep Reveal panel closes on navigation.

### Gate 5 — Mark as reviewed

1. On the detail screen, tap "Mark as reviewed".
2. Verify: button becomes ghost "Marked as reviewed" with check icon.
3. Verify: `/api/coach/queue/:blunderId/resolve` called once with `Authorization` header.
4. Simulate error (disconnect server): verify button reverts to "Mark as reviewed".

### Gate 6 — Deep Reveal

1. On the detail screen, tap "What should I have played?".
2. Verify: spinner shown while loading.
3. Verify: explanation paragraph, bestLine chips, "Flag this explanation" button appear on load.
4. Verify: second tap on the same blunder → instant response (cache hit), no spinner.
5. Verify: quota exhausted (mock 429 response) → `UpgradeModal` shown.

### Gate 7 — Analytics

1. Open DevTools Network; filter for `/api/track`.
2. Navigate to `mistakes` → verify `screen_viewed` with `path: 'mistakes'` fires.
3. Navigate to `mistakeDetail` → verify `mistake_reviewed` event fires.
4. Tap "What should I have played?" → verify `deep_reveal_viewed` with `{ context: 'past_mistakes' }` fires.

---

## Inserting a Test Blunder (SQL)

```sql
INSERT INTO blunders (user_id, board_state, move_played, correct_move, pattern_category)
VALUES (
  '<your-user-uuid>',
  '33344',    -- position before blunder
  2,          -- column user played (0-indexed)
  3,          -- correct column (0-indexed)
  'forced_block'
);
```

---

## Verifying `threat_cells` Computation

```bash
# From project root, run the visualize board script on the post-blunder position
./visualize_board.sh 333442  # board_state + move_played
```

Check the annotated board output for `[R]` or `[Y]` cells — these should match the `threat_cells` returned by the API for this blunder.
