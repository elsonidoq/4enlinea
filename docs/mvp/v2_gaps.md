# DecodeC4 v2 Gap Analysis

**Baseline**: `specs/001-decodec4-mvp/tasks.md` (full MVP plan) and `specs/002-mvp-gap-fixes/tasks.md` (gap-fix plan).  
**Method**: Code audit of all source files + functional API testing against the running local server (`localhost:3001` / `localhost:5173`).  
**Status of v1 gaps**: Most were fixed by spec 002. The bugs that persist or were introduced are documented below.

---

## Critical bugs — will break at runtime

### B1 · Blunder resolve endpoint parses UUID as integer → always fails
**File:** `connect-four/server/index.js:675`

The `blunders.id` column is `uuid` (defined in `003_puzzles.sql:40`). The queue endpoint correctly returns `blunderId: blunders[0].id` (a UUID string). But the resolve endpoint does:

```js
const blunderId = parseInt(req.params.blunderId, 10);
if (isNaN(blunderId)) return res.status(400).json({ error: 'invalid blunder id' });
```

`parseInt("550e8400-e29b-41d4-a716-446655440000", 10)` returns `550` (stops at first non-digit). The `isNaN` check passes but the resulting integer will never match a UUID in the DB. The Supabase query `.eq('id', 550)` returns 0 rows; the endpoint returns 204 (success) even though nothing was resolved.

**Impact:** The coach review queue's resolve step silently fails. Blunders are never marked resolved. The queue never shrinks. The core paid-tier loop is broken.

**Fix:** Remove `parseInt`; treat `blunderId` as a string UUID directly.

---

### B2 · `puzzle_attempts` outcome enum mismatch — DB inserts silently fail
**File:** `connect-four/server/index.js:573` vs `connect-four/server/migrations/003_puzzles.sql:30`

The predicate evaluator returns `{ result: 'correct' | 'wrong' | 'tied' }`. The server inserts this raw value:

```js
outcome: evaluation.result,  // 'correct' or 'wrong'
```

But the DB schema has a CHECK constraint:
```sql
CHECK (outcome IN ('correct_first','correct_retry','revealed','tied','abandoned'))
```

`'correct'` and `'wrong'` are not in the allowed set. Supabase rejects the insert. Since the insert is fire-and-forget (`.catch(err => console.error(...))`), users see no error but no `puzzle_attempts` rows are ever written. This silently kills: weakness map data, blunder capture, and all session-stats that depend on first_attempt_correct.

**Fix:** Map `evaluation.result` to schema values before inserting:
- `'correct'` on first attempt → `'correct_first'`
- `'correct'` on retry → `'correct_retry'`
- `'tied'` → `'tied'`
- `'wrong'` that triggers reveal → `'revealed'`

The client already passes `attemptNumber` in the request body; use that to determine which outcome to write.

---

## Feature gaps — spec-mandated behaviour missing

### G1 · Multi-move puzzles (Fork Setup, Parity Control) have no UI flow
**Spec:** `mvp_product_spec.md` §Puzzle Trainer — "Multi-move puzzles"

Categories 4 and 6 are multi-move: user plays → AI responds cooperatively → user plays again. Neither side is implemented:

- `predicates.js` evaluates cat 4/6 moves in a single step; it never returns `await_next`.
- `PuzzlesPage.jsx` has no handler for `await_next`, no cooperative AI move application, and no multi-turn board advancement.
- The placeholder puzzles for cat 4/5/6 have an empty `move_string` — a paid user landing on them sees an empty board with no prior position.

Even when real puzzle content is added, paid users cannot complete Fork Setup or Parity Control puzzles as designed.

---

### G2 · Sparring hints-on mode: no hover hints or heatmap
**Task:** T048 (marked `[X]` in spec 001)  
**File:** `connect-four/src/pages/HomePage.jsx`

The spec requires: when Commit-first is OFF, hovering a column calls `/api/explain-move` and surfaces contextual warnings ("Warning: opponent can create a double threat"). No `onMouseEnter`/`onMouseLeave` handler exists on the board columns in `HomePage.jsx`. There is also no score overlay or heatmap display in hints-on mode — these are the overlays Commit-first is supposed to suppress, but they don't exist in either mode.

The board's `highlightedCells` and `canPlay` props are used, but the hover hint call is absent entirely.

---

### G3 · Sparring post-commit reveal does not consume Deep Reveal quota
**Spec:** `mvp_product_spec.md` §Account Tiers — "Deep Reveals are shared across puzzles and sparring"  
**File:** `connect-four/src/pages/HomePage.jsx:150`

The `commitMove()` call to `/api/explain-move` does **not** pass `requestDeepReveal: true`:

```js
fetch(`${API}/api/explain-move`, {
  method: 'POST', headers,
  body: JSON.stringify({ moves: movesBeforeCommit, candidateCol: col }),
  // requestDeepReveal is absent — defaults to false on server
})
```

The server only decrements quota when `requestDeepReveal === true`. Result: post-commit reveals in sparring are free for all users, including anonymous — bypassing the gate entirely. The "3 per day shared" pool only applies to explicit "See why" taps.

Additionally, the anonymous gate is also bypassed: anonymous users can receive post-commit reveals (the 403 only fires for `requestDeepReveal: true && !req.user`).

---

### G4 · Deep Reveal quota remaining not shown to user
**Spec:** `mvp_product_spec.md` §Deep Reveal access rules — primary motivation for sign-up  
**File:** `connect-four/src/components/DeepRevealButton.jsx`

The API response includes `quotaRemaining` but `DeepRevealButton` ignores it. The button always reads "See why" regardless of remaining quota. The spec positions the visible countdown ("2 reveals left") as the primary conversion driver from anonymous → free. Without it, users don't know they have a quota until they hit the wall.

---

### G5 · No `404_seed_puzzles.sql` migration
**Task:** T038 (marked `[ ]` — explicitly incomplete)  
**File:** `connect-four/server/migrations/`

Migration files present: `001`, `002`, `003`, `005`, `006`. Migration `004` is permanently absent. The placeholder seed data lives in `data/placeholder_puzzles.json` and is loaded via the admin endpoint — no migration seeds it. When Supabase is provisioned fresh (Railway, or a new dev machine), the puzzles table is empty by default. There is no repeatable mechanism to populate it other than a manual API call.

---

### G6 · AdminCuratePage has no `cooperative_ai_moves` field
**File:** `connect-four/src/pages/AdminCuratePage.jsx` and `connect-four/server/index.js:873`

The server always inserts `cooperative_ai_moves: []` for new puzzles created via the curation tool. Multi-move puzzles (cat 4/6) require a non-empty `cooperative_ai_moves` array to define what the AI plays between user turns. There is no input field in `AdminCuratePage` and no handling in the admin endpoint. Content authors cannot author multi-move puzzles through the tool.

---

### G7b: Forbidden Columns puzzle type not implemented

The product spec now includes "Forbidden Columns" as category 2 (free tier). This puzzle type requires a fundamentally different interaction from all other categories:

- **UI**: multi-select column tagging + explicit "Submit" button, rather than a single column click. The current `PuzzlesPage.jsx` only supports single-column answers.
- **Predicate**: `predicates.js` must evaluate a submitted *set* of columns against the ground-truth forbidden set. Both false positives and false negatives must fail.
- **Classifier**: `classifier.js` must detect forbidden columns by simulating each legal move and checking for an opponent immediate-win on the next ply (bitboard-only, no solver needed).
- **Data model**: `goal_predicate_type` must accept `'forbidden_columns'`; `goal_predicate_params` can be left `{}` (the correct set is computed at evaluation time from the board state, not stored).
- **Category renumbering**: existing categories 2–6 become 3–7; `PAID_CATEGORIES` in `server/index.js` must be updated to `{5, 6, 7}`.

---

### G8: Payments testing framework
We need to be able to test payments without actually spending money

---

### G9: Accuracy by pattern bug
The accuracy by pattern calculation has a bug, showing always 100%, regardless of the errors. I don't know if it's a tracking issue or a computation issue


---

### G10: resolve endpoint is not working
It fails with the error {error: "invalid blunder id"}

## Puzzle content gaps

### C1 · Only 1 placeholder puzzle per category (spec requires 50 total)
**Tasks:** T031, T032 (both explicitly `[ ]` — human content work)

The DB has 6 puzzles (1 per category). The spec requires 50 hand-curated positions (~8 per category). Categories 4, 5, 6 placeholders have `move_string: ""` — these generate empty boards that the predicate evaluator cannot meaningfully score.

---

## Infrastructure and deployment gaps

### I1 · Railway not deployed, solver not verified on Linux x64
**Tasks:** T001, T005 (explicitly `[ ]`)

No production deployment exists. The solver binary at `connect-four/server/c4solver` is macOS ARM. The Linux x64 binary required by Railway has not been cross-compiled or verified.

---

### I2 · Cloudflare DNS not configured
**Task:** T003 (explicitly `[ ]`)

---

### I3 · Stripe products not created
**Task:** T050 (explicitly `[ ]` — human task)

`STRIPE_MONTHLY_PRICE_ID` and `STRIPE_ANNUAL_PRICE_ID` are unset. Any attempt to start a Stripe Checkout returns a server error ("Price not configured").

---

## Quality gates not run

| Gate | Task | Status |
|---|---|---|
| Mobile layout audit at 375px | T073 | Not run |
| Analytics funnel walk (all 8 KPI events verified in `tracks`) | T074 | Not run |
| Hallucination gate re-run on final build (100 pos × 5 gen, <2%) | T075 | Not run |
| Stripe webhook lifecycle (`stripe listen` + `stripe trigger`) | T076 | Not run |
| Auth migration end-to-end (IndexedDB → Supabase on sign-in) | T077 | Not run |
| Supabase automatic backup enabled | T078 | Not verified |
| Sentry alerts configured and smoke-tested | T079 | Not verified |

---

## Summary table

| # | Area | File(s) | Severity | Blocks launch? |
|---|---|---|---|---|
| B1 | Blunder resolve: UUID parsed as integer, always silently fails | `server/index.js:675` | **Critical** | Yes (coach queue broken) |
| B2 | `puzzle_attempts` outcome 'correct'/'wrong' rejected by DB CHECK | `server/index.js:573` | **Critical** | Yes (coach data never written) |
| G1 | Multi-move puzzles (cat 4,6) have no UI or predicate flow | `PuzzlesPage.jsx`, `predicates.js` | High | Yes (paid feature broken) |
| G2 | Hints-on mode: no hover hints, no heatmap | `HomePage.jsx` | Medium | No (degraded sparring) |
| G3 | Post-commit reveal bypasses Deep Reveal quota entirely | `HomePage.jsx` | Medium | No (monetisation gap) |
| G4 | Quota remaining not shown in DeepRevealButton | `DeepRevealButton.jsx` | Low | No (conversion loss) |
| G5 | No 004_seed_puzzles.sql — empty DB on fresh deploy | migrations/ | High | Yes (no puzzles on Railway) |
| G6 | AdminCuratePage cannot author multi-move puzzles | `AdminCuratePage.jsx` | Medium | No (content workflow) |
| G7 | Hard difficulty: softmax ≠ HARD_ERROR_RATE=0.2 from spec | `aiDifficulty.js` | Low | No (degraded difficulty) |
| C1 | Only 1 placeholder puzzle per category (spec: 50 total) | `data/placeholder_puzzles.json` | High | Yes (no content to train on) |
| I1 | Railway not deployed; solver binary not cross-compiled | — | Critical | Yes (production) |
| I2 | Cloudflare DNS not configured | — | Medium | Yes (production) |
| I3 | Stripe price IDs not configured | — | High | Yes (monetisation) |
| Q1–Q7 | Quality gates not run (mobile, analytics, hallucination, Stripe, auth migration) | various | Medium | No (quality risk) |
