# Architecture Gap Report

Decisions found in the code whose intent could not be fully determined.

## TODO: Clarify intent

**1. `SupabaseStore` interface** — RESOLVED
Both stores implement: `getProfile()`, `saveSessionStats(stats)`, `getSessionStats(date)`, `recordPuzzleAttempt(attempt)`. `IndexedDBStore` additionally exposes `getAllPuzzleAttempts()` (used only during migration) and `migrateToSupabase(supabaseStore, supabaseClient)`. `SupabaseStore.migrateToSupabase()` exists but throws — it is not part of the shared interface. Documented in `frontend-conventions.md`.

**2. `src/lib/track.js` implementation** — RESOLVED
`track(event, data)` calls `fetch(\`\${API}/api/track\`, ...)` fire-and-forget: `.catch(() => {})` intentionally swallows all errors. When `VITE_API_BASE_URL` is absent, it falls back to `''` (same origin) — events are sent, not dropped. No buffering. Documented in `frontend-conventions.md`.

**3. `goal_predicate_params` — always `{}`**
Every `INSERT` into `puzzles` sets `goal_predicate_params: {}`. The column exists and is checked out in predicate evaluators, but no evaluator currently reads it. It appears to be a forward-compatibility placeholder, but this intent is not documented.
→ Clarify whether `goal_predicate_params` is reserved for future use or can be dropped.

**4. `cooperative_ai_moves` — legacy column, not read by frontend**
The `cooperative_ai_moves` column exists on `puzzles` and is returned by `GET /api/puzzles/:id` as `cooperativeAiMoves`, but no frontend game-surface component reads this value. It is still written by the curation admin endpoint (`POST /api/admin/puzzle`) and validated (must be an array). It has not been removed because it may be needed for future sequence-mode design, but it carries no functional effect today.
→ Column can be deprecated in a future migration if the sequence-mode design confirms it is not needed.

**5. `user_player` column on `candidates`**
Set to `move_string.length % 2 === 0 ? 1 : 2` at generation time. No code was observed reading this column back. Its purpose (filtering? display?) is unclear.
→ Clarify intent and document in `data-model.md`, or remove if unused.

**6. Classifier output → predicate correctness relationship** — RESOLVED
Documented in `server-conventions.md` under "Classifier vs Predicate Evaluator — Explicit Separation": classifier is for labeling only; predicate evaluator is for correctness scoring only. The two systems are independent.

**7. Admin endpoint auth model** — RESOLVED
Documented in `api-conventions.md` under "Access Guards" (`requireLocalhost`): the server is expected to run without port-forwarding; `requireLocalhost` is the sole access control layer. If the deployment model changes, admin routes must migrate to token-based auth.
