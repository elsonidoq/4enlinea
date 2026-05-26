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

**4. `cooperative_ai_moves` — unused in sequence mode**
The `cooperative_ai_moves` column exists on `puzzles` and is still returned by the API, but the sequence-mode interaction replaced it with stateless per-move validation (migration 014). It is unclear whether it is still used by any client code or can be deprecated.
→ Confirm whether any frontend component reads `cooperativeAiMoves` and document or remove accordingly.

**5. `user_player` column on `candidates`**
Set to `move_string.length % 2 === 0 ? 1 : 2` at generation time. No code was observed reading this column back. Its purpose (filtering? display?) is unclear.
→ Clarify intent and document in `data-model.md`, or remove if unused.

**6. Classifier output → predicate correctness relationship**
The classifier (`server/classifier.js`) produces pattern tags for display and explanation. The predicate evaluator (`server/predicates.js`) independently determines correctness. These two systems are not formally connected — a classifier tag does not imply predicate correctness. This implicit separation may confuse future contributors. 
→ Document the explicit separation in `server-conventions.md`: classifier is for labeling, predicate evaluator is for scoring.

**7. Admin endpoint auth model**
Admin endpoints are guarded by `requireLocalhost` (IP check). There is no API key, session, or other authentication layer. This is presumably acceptable because the server is not expected to be port-forwarded, but the assumption is not documented.
→ Document the threat model for admin endpoints in `api-conventions.md`.
