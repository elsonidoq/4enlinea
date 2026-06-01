# Implementation Plan: Challenges — Deep Reveal, Forbidden Columns, Forced Win & Post-Set Summary (Epic 2b)

**Branch**: `101-new-design` | **Date**: 2026-05-31 | **Spec**: `specs/014-challenges-deep-reveal/spec.md`

## Summary

This epic completes the Challenges surface by adding four interconnected capabilities:

1. **Deep Reveal Panel** — a bottom-sheet Tier-2 education panel wired to the existing "Learn more ▼" button in `ChallengeScreen.jsx`, calling an extended `POST /api/explain-move-llm` endpoint that now (a) checks `explanation_cache` before calling the LLM, (b) decrements quota only on cache miss, and (c) returns `{ explanation, bestLine, cached? }` where `bestLine` is computed via a new `computeBestLine(movestring, col, solver)` function (solver PV walk, not `explainSimulate` pattern aggregation).

2. **Forbidden Columns** — multi-select challenge type wired into `ChallengeScreen.jsx`, porting `handleForbiddenSubmit` logic from `PuzzlesPage.jsx` into the new challenge state machine; requires adding `forbidden_columns` entry to `challengeSets.js` with `displayNameKey`/`descriptionKey` shape, migrating `SetPickerScreen.jsx` to call `t()` for all entries, and adding i18n keys.

3. **Forced Win** — wiring `ChallengeScreen.jsx` to delegate to `SequenceHandler.jsx` when `puzzle.interactionMode === 'sequence'`; requires adding `forced_win` entry to `challengeSets.js` and i18n keys. The `SequenceHandler` already exists and is functional — no new component needed.

4. **Post-Set Summary** — implementing `PostSetSummaryScreen.jsx` wired to the `summary` key in `screenRegistry.jsx`, reading session results from navigation params, calling `store.saveChallengeSession()`, firing `track('set_completed', ...)`, displaying accuracy + by-pattern breakdown, and rendering a Coach recommendation CTA.

**Key ordering constraint**: `bestLine` computation (FR-013) → `explanation_cache` write shape (FR-012) → endpoint response contract (FR-014) → client-side panel consumption (FR-005). The i18n keys (FR-040/041/042) must be added before any new screen or component is rendered. The `challengeSets.js` shape change and `SetPickerScreen.jsx` update must be atomic.

## Technical Context

**Language/Version**: Node.js 20.10+ (server), React 18 (frontend), Vite build  
**Primary Dependencies**: Express (server), react-i18next (frontend), Supabase JS client, OpenAI SDK  
**Storage**: PostgreSQL via Supabase (server); IndexedDB (frontend anonymous), Supabase (frontend authenticated)  
**Testing**: Manual golden-path + edge-case verification per constitution §III  
**Target Platform**: Browser (PWA), served by Node Express  
**Performance Goals**: Deep Reveal panel: LLM response < 6s; cache hit: no spinner (instant). `computeBestLine`: < 500ms (≤7 solver queries via existing persistent process).  
**Constraints**: Must not break Epic 2a `ChallengeScreen.jsx` single-move flow. Solver IPC serialized — `computeBestLine` must queue behind existing solver calls, not run concurrently.  
**Scale/Scope**: ~15 files modified; 3 new components; 1 server function; ~80 new i18n keys.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Principle I — Explanation Engine as Single Source of Truth**:
- [x] Deep Reveal panel sources `patternTag`, `quality`, `badge` from the already-held Epic 2a `evaluate-move` response (not a duplicate classifier call). The LLM explanation is added on top via `/api/explain-move-llm`.
- [x] `bestLine` is computed server-side from solver PV — no client-side solver logic.
- [x] All surfaces share the same Deep Reveal panel component (`DeepRevealPanel.jsx`).

**Principle II — Code Quality & Simplicity**:
- [x] `SequenceHandler.jsx` already exists and handles `forced_win`; `ChallengeScreen` routes to it, no rebuild.
- [x] `handleForbiddenSubmit` logic ported from `PuzzlesPage.jsx` — reuse, don't rewrite.
- [x] No speculative abstractions: the panel is a single component, not an abstraction layer.
- [x] Storage-agnostic interface honored: all store calls go through `useStore()`.

**Principle III — Testing Standards**:
- [x] Manual golden-path verification required: Deep Reveal cache hit/miss, Forbidden Columns submit, Forced Win sequence pass/fail, Post-Set Summary navigation.
- [x] `bestLine` computation verified with a real solver call before shipping.

**Principle IV — UX Consistency**:
- [x] Board overlays in Deep Reveal panel use same `overlays` prop/enum as Challenge Board.
- [x] Badge/quality terminology (`optimal`/`suboptimal`/`blunder`, `good`/`mid`/`bad`) matches Epic 2a.
- [x] All user-facing strings go through i18n keys (SC-007).

**Principle V — Performance**:
- [x] Cache check runs before quota decrement (FR-011) — prevents unnecessary DB writes.
- [x] `explanation_cache` write is fire-and-forget (FR-012) — does not block response.
- [x] `store.saveChallengeSession()` call on Post-Set Summary mount does not block render.

**Principle VI — Methodology**:
- [x] Architecture docs read before planning. `explainSimulate` output confirmed NOT to expose PV sequence — it aggregates pattern statistics only. A dedicated `computeBestLine` function is required (see research.md).
- [x] `handleForbiddenSubmit` pattern traced to `PuzzlesPage.jsx` lines 345–415. Authoritative `forbiddenCols` is sourced from `results[0].data.forbiddenCols` (POST /api/puzzles/:id/check), confirmed.
- [x] `SetPickerScreen.jsx` confirmed to read `set.displayName` at line 59 — breaking change if `challengeSets.js` entries are switched to `displayNameKey` without updating the screen in the same task.

**Principle VIII — Documentation**:
- [x] Architecture docs read: `frontend-conventions.md`, `server-conventions.md`, `api-conventions.md`, `db-schema.md`, prior `plan.md` files, `constitution.md`.
- [x] New API response shape (`bestLine` field) → `docs/architecture/api-conventions.md` update included in tasks.
- [x] New frontend state machine extension (Forbidden Columns phase + Forced Win delegation) → `docs/architecture/frontend-conventions.md` update included in tasks.
- [x] `challengeSets.js` i18n-key shape change → documented in task.

## Project Structure

### Documentation (this feature)

```text
specs/014-challenges-deep-reveal/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── contracts/
│   └── explain-move-llm.md   # Updated endpoint contract
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (affected files)

```text
connect-four/
├── server/
│   ├── index.js                     # Extend POST /api/explain-move-llm (cache check, quota fix, bestLine)
│   ├── explainSimulate.js           # Add computeBestLine(movestring, col, solver) function
│   ├── challengeSets.js             # Add forbidden_columns + forced_win entries (displayNameKey shape) [B-4: this is the ONLY challengeSets.js]
│   └── categories.js                # Remove forced_win + forbidden_columns from PAID_CATEGORIES [B-3]
│
└── src/
    ├── i18n/
    │   └── en.json                  # Add FR-040 / FR-041 / FR-042 i18n keys
    ├── lib/
    │   ├── categories.js            # Remove forced_win + forbidden_columns from PAID_CATEGORIES [B-3]
    │   └── screenRegistry.jsx       # Wire PostSetSummaryScreen to 'summary' key
    └── screens/
        ├── ChallengeScreen.jsx      # Extend: forbidden_columns multi-select, sequence routing, Deep Reveal
        ├── SetPickerScreen.jsx      # Update: t(set.displayNameKey) for all entries
        └── PostSetSummaryScreen.jsx # New: post-set summary screen
```

**New component** (in `src/screens/` as a screen, not `src/components/` — it is a top-level screen):
- `PostSetSummaryScreen.jsx` — reads `results`, `category` from navigation params; computes accuracy, byPattern; renders summary UI; calls `store.saveChallengeSession()`; fires analytics.

**No new component needed for Deep Reveal** — it is inline UI within `ChallengeScreen.jsx` (a bottom-sheet panel rendered conditionally), built on top of existing `DeepRevealButton.jsx`/`AuthModal`/`UpgradeModal` patterns.

## Phase 0: Research

*Resolved before Phase 1 design. See `research.md` for full findings.*

### RQ-1: Does `explainSimulate` expose the principal variation (PV) sequence?

**Finding**: No. `explainSimulate` aggregates pattern statistics across all optimal-play leaves; it does not return the sequence of moves taken. The function returns `{ totalLeaves, patterns, outcomes, timing }` — no move array. A dedicated `computeBestLine(movestring, col, solver)` function is required.

**Decision**: Add `computeBestLine` in `explainSimulate.js` (same file, documented with a comment explaining why it is not reusing `explainSimulate`). The function walks the PV by repeatedly querying the solver for the current position, picking the highest-scoring column (or the first of ties), alternating player, stopping after N plies (default: 5) or when the game is won/drawn. Returns an array of 1-indexed column label strings, e.g. `["Col 5", "Col 2", "Col 6"]`.

**Cost**: 5 solver queries max via the existing persistent solver process (serialized IPC). Well within the < 500ms budget.

**Sequencing note**: `computeBestLine` must be called within the `POST /api/explain-move-llm` handler BEFORE the LLM call, so that `bestLine` can be included in the cached blob written to `explanation_cache.deep_reveal_json`.

### RQ-2: Does the `explanation_cache` table schema need migration?

**Finding**: No. The table already has `position_hash`, `one_liner`, `deep_reveal_json`, `created_at`. The `deep_reveal_json` column is JSONB — it can absorb the new `bestLine` field without a schema change. Existing cached rows that lack `bestLine` will return `null` for that field; the client omits the "BEST LINE" section when `bestLine` is absent or empty (spec edge case: `bestLine` is empty or null → omit section).

**Decision**: No migration required for this epic. Note: `bestLine` always has ≥1 element by construction (B-5); existing cached rows that pre-date this epic and lack `bestLine` will return `null` for the field — the client `bestLine?.length > 0` guard handles this defensively.

### RQ-3: What is the current `POST /api/explain-move-llm` quota ordering?

**Finding** (reading `server/index.js` lines 586–594): The current handler checks auth (401 for unauthenticated) then immediately calls `checkAndDecrementQuota` — before any cache check. This is the bug identified in FR-011. The fix: move the cache check before `checkAndDecrementQuota`.

**Decision**: Reorder handler: (1) auth gate, (2) cache check, (3) quota decrement (only on cache miss), (4) LLM call, (5) cache write.

### RQ-4: Does `SetPickerScreen.jsx` need atomic update with `challengeSets.js`?

**Finding**: Line 59 of `SetPickerScreen.jsx` renders `set.displayName ?? set.slug`. Existing entries use `displayName`; new entries use `displayNameKey`. To avoid breaking the existing sets while adding the new ones, the safest approach is: update `challengeSets.js` to use `displayNameKey`/`descriptionKey` for ALL entries (not just new ones), and update `SetPickerScreen.jsx` to render `t(set.displayNameKey) ?? set.slug` in the same task. This also adds the English literals to `en.json` for all existing sets (or reuses `CATEGORY_NAMES` values).

**Decision**: Task T-04 atomically updates both files. Existing entry `displayName`/`description` literals become i18n keys in `en.json` using the same `challengeSet.<slug>.displayName` / `challengeSet.<slug>.description` convention. The task also adds `forbidden_columns` and `forced_win` entries.

### RQ-5: Is `SequenceHandler.jsx` ready for use in `ChallengeScreen.jsx`?

**Finding**: `SequenceHandler.jsx` exists and is functional. It calls `POST /api/puzzles/:id/sequence/move` and handles `success`/`continue`/`fail` outcomes. Its `onNext` prop accepts a callback. It renders its own Board and UI — it is a self-contained component. The `ChallengeScreen` only needs to route to it when `puzzle.interactionMode === 'sequence'`, passing `puzzle` and an `onNext` callback that records the attempt and advances the session (pass if `success`, fail otherwise).

**Decision**: Wire `SequenceHandler` inside `ChallengeScreen.jsx` as a conditional branch in the render. Pass `onNext` as `() => handleSequenceComplete(true)` (success-only for MVP — `SequenceHandler.onNext` takes no args, so the fail path is unimplementable without modifying `SequenceHandler`; deferred post-MVP per B-2 resolution). The callback calls `store.recordPuzzleAttempt(...)`, accumulates to `results`, and advances `currentIdx`. Map the `/draw` row to `SequenceHandler`'s camelCase shape at the callsite via `toSequenceHandlerShape()` (B-1 fix). For the forced_win prompt shown in CoachDialog pre-move: `ChallengeScreen.initPuzzle()` picks a random key from the `coach.forced_win.prompt.*` pool (added in T-01) and passes it to CoachDialog. No API change needed for the prompt source (D-3 resolution).

### RQ-6: What does the Forbidden Columns scoring logic need from `POST /api/puzzles/:id/check`?

**Finding** (reading `PuzzlesPage.jsx` lines 345–415): `results[0].data.forbiddenCols` is a 0-indexed array of column indices returned by the first `check` call. All parallel `check` calls for selected columns return the same `forbiddenCols` set (stateless endpoint). The scoring predicates:
- Optimal: all selected cols are forbidden AND no cols missed (exact match).
- Suboptimal: no false positives, but ≥ 1 missed forbidden col.
- Blunder: any false positive (selected a safe col) OR zero true positives.

**Decision**: Port logic verbatim from `PuzzlesPage.handleForbiddenSubmit`. The partial-credit copy `"N / M forbidden columns found"` maps to an i18n key `eval.forbidden_columns.suboptimal.summary.0` using an interpolated `{{found}}` / `{{total}}` pattern.

## Phase 1: Design & Contracts

### Data Model

See `data-model.md` for full entity definitions.

**No new tables or columns required.** Changes are:
- `explanation_cache.deep_reveal_json` gains a `bestLine: string[]` field (JSONB, backward compatible).
- Client-side `ChallengeSessionResult` shape (in navigation params): `{ puzzleId, quality, category }` — unchanged from Epic 2a.
- New `PostSetSummaryParams` shape (navigation params): `{ category, results, accuracy, optimalCount, blunderCount, byPattern }`.

### API Contracts

See `contracts/explain-move-llm.md` for the updated endpoint contract.

**Changed endpoint**: `POST /api/explain-move-llm`
- **Request** (unchanged): `{ movestring: string, col: number, rounds?: number }`
- **Response** (extended): `{ explanation: string, bestLine: string[], cached?: boolean }`
  - `bestLine`: array of 1-indexed column label strings, e.g. `["Col 5", "Col 2", "Col 6"]`. Always contains ≥1 element (the played move is always included as the first element). The function cannot return an empty array by construction — `pvCols` is initialized with the played column before any solver calls. The `bestLine?.length > 0` guard in the client render is purely defensive (B-5 fix).
  - `cached`: `true` if served from `explanation_cache`; absent (undefined) on cache miss.
- **Error responses** (unchanged): 401 (unauthenticated), 429 (quota exceeded), 503 (LLM not configured).
- **Quota behavior** (changed): decrement happens AFTER cache check; cache hits do not decrement.

**No new endpoints** for this epic.

### Component Architecture

**`DeepRevealPanel`** — implemented as inline JSX within `ChallengeScreen.jsx` (bottom-sheet overlay), not a separate file. Rationale: it is only used in one place in this epic (Epic 3b reuses it via copy or extraction if needed); premature extraction violates constitution §II. State managed locally within `ChallengeScreen`:
- `deepRevealOpen: boolean`
- `deepRevealLoading: boolean`
- `deepRevealData: { explanation, bestLine } | null`
- `deepRevealFlagged: boolean`
- `deepRevealTimedOut: boolean`

**`PostSetSummaryScreen`** — new file at `src/screens/PostSetSummaryScreen.jsx`. Reads params from `go('summary', params)` navigation.

**`ChallengeScreen.jsx` state additions** for this epic:
- `selectedCols: number[]` — for Forbidden Columns multi-select (replaces `selectedForbiddenCols` Set → array for simplicity).
- `isSubmitting: boolean` — Forbidden Columns submit gate.
- Existing `phase` state machine extended: `'post-move'` phase now branches by category (single-move feedback vs. sequence feedback vs. forbidden feedback).

**Forced Win routing**: When `puzzles[currentIdx].interaction_mode === 'sequence'`, `ChallengeScreen` renders `<SequenceHandler>` in place of the Board + Toolbar. `SequenceHandler.onNext` is replaced with `onSequenceComplete(passed)` which calls `handleSequenceComplete(passed)` — records the attempt and advances.

## Implementation Tasks (sequencing)

Tasks are ordered by dependency. Tasks within the same group can be done in any order within the group.

---

### Group A — Foundation (no dependencies on other groups)

**T-01: Add i18n keys for forbidden_columns, forced_win, and summary (FR-040, FR-041, FR-042)**

File: `connect-four/src/i18n/en.json`

Add the following key pools:
```json
"challengeSet": {
  "immediate_threat": { "displayName": "Immediate Threat", "description": "Find the move that wins right now." },
  "forced_block":     { "displayName": "Forced Block", "description": "Block your opponent's immediate winning threat." },
  "double_threat":    { "displayName": "Double Threat", "description": "Create two simultaneous winning threats." },
  "claimeven":        { "displayName": "Claimeven", "description": "Use Yellow's Claimeven strategy to secure a draw." },
  "z_threat":         { "displayName": "Z-Threat", "description": "Exploit Z-threat parity to guarantee the win." },
  "mixed":            { "displayName": "Mixed", "description": "A mix of all challenge types." },
  "undercut":         { "displayName": "Undercut", "description": "Take the square below your opponent's threat." },
  "overcut":          { "displayName": "Overcut", "description": "Play above your opponent's intended threat." },
  "figure_7":         { "displayName": "Figure 7", "description": "Exploit the Figure-7 pattern." },
  "j_shape":          { "displayName": "J-Shape", "description": "Exploit the J-Shape pattern." },
  "forbidden_columns": {
    "displayName": "Forbidden Columns",
    "description": "Mark every column where playing immediately hands your opponent a win."
  },
  "forced_win": {
    "displayName": "Forced Win",
    "description": "Play the forcing line that leaves your opponent no escape."
  }
},
"coach": {
  ...existing...,
  "forbidden_columns": {
    "prompt": {
      "0": "Mark every column that would hand your opponent an immediate win.",
      "1": "Which columns are forbidden? Tag them all before submitting.",
      "2": "Find every column where you would lose instantly — mark them all."
    },
    "hint": {
      "0": "Look for columns where your opponent already has three in a row — playing there hands them a win.",
      "1": "Check each column: would your opponent win immediately if you played there?"
    },
    "optimal": { "0": "Perfect — you identified every forbidden column." },
    "suboptimal": { "0": "You found some but missed {{missed}} forbidden column(s)." },
    "blunder": {
      "0": "You tagged a safe column — that counts as a mistake.",
      "1": "At least one of your tagged columns was safe to play."
    }
  },
  "forced_win": {
    "prompt": {
      "0": "Force the win — play the line that leaves your opponent no escape.",
      "1": "There's a forcing sequence here. Play it move by move.",
      "2": "Every move must threaten your opponent. Find the forcing line."
    },
    "optimal": { "0": "You forced the win — well played.", "1": "Perfect sequence — your opponent had no escape." },
    "blunder": { "0": "That move breaks the forcing line.", "1": "The sequence fails here — your opponent can escape." }
  },
  "summary": {
    "perfect": {
      "0": "Perfect set. Try a harder one.",
      "1": "Clean sweep — excellent work!"
    }
  }
},
"eval": {
  ...existing...,
  "forbidden_columns": {
    "optimal":    { "summary": { "0": "You found every forbidden column." } },
    "suboptimal": { "summary": { "0": "{{found}} / {{total}} forbidden columns found." } },
    "blunder":    { "summary": { "0": "At least one of your tagged columns was safe to play." } }
  }
}
```

**Acceptance**: `t('challengeSet.forbidden_columns.displayName')` → `"Forbidden Columns"`. `t('coach.summary.perfect.0')` → `"Perfect set. Try a harder one."`.

---

**T-02: Add `computeBestLine` function in `explainSimulate.js` (FR-013)**

File: `connect-four/server/explainSimulate.js`

Add a new exported async function at the end of the file:

```js
/**
 * Computes the principal variation (PV) for a played move by walking optimal
 * continuations via the solver, up to `maxPlies` moves deep.
 *
 * Note: explainSimulate() is NOT reused here because it aggregates pattern statistics
 * across all optimal-play leaves without exposing the move sequence taken. The PV walk
 * requires a concrete ordered sequence, not an aggregate.
 *
 * @param {string} movestring - position BEFORE the user's move (0-indexed digits 0-6)
 * @param {number} col        - 0-indexed column the user played
 * @param {object} solver     - the shared persistent solver process from c4solver-wrapper.js
 * @param {number} [maxPlies=5] - maximum PV length to return
 * @returns {Promise<string[]>} - array of 1-indexed column label strings, e.g. ["Col 5", "Col 2"]
 */
export async function computeBestLine(movestring, col, solver, maxPlies = 5) {
  const ROWS = 6, COLS = 7;
  const EMPTY_SCORES = [0, 0, 1, 2, 1, 0, 0];
  const pvCols = [col]; // start with the user's move

  let currentMs = movestring + col;

  for (let ply = 1; ply < maxPlies; ply++) {
    // Check for win — if the last move won, stop (solver hangs on won positions)
    const b = new Board(currentMs);
    if (b.hasWon(1) || b.hasWon(2)) break;

    // Check for full board (draw)
    const legalCols = [];
    for (let c = 0; c < COLS; c++) {
      if (b.colHeights[c] < ROWS) legalCols.push(c);
    }
    if (legalCols.length === 0) break;

    // Get solver scores for current position
    let scores;
    try {
      scores = currentMs.length > 0 ? await solver.query(currentMs) : EMPTY_SCORES;
    } catch {
      break; // solver error — return what we have
    }

    // Pick the best legal column (first of ties, by index)
    let bestScore = -Infinity;
    let bestCol = legalCols[0];
    for (const c of legalCols) {
      if (scores[c] > bestScore) {
        bestScore = scores[c];
        bestCol = c;
      }
    }

    pvCols.push(bestCol);
    currentMs += bestCol;
  }

  // Convert 0-indexed col array to 1-indexed label strings
  return pvCols.map(c => `Col ${c + 1}`);
}
```

**Acceptance**: `computeBestLine('', 3, solver)` returns an array starting with `"Col 4"` for an empty board center play; length ≤ 5.

---

### Group B — Server endpoint changes (depends on T-02)

**T-03: Extend `POST /api/explain-move-llm` with cache, quota fix, and `bestLine` (FR-010, FR-011, FR-012, FR-013, FR-014, FR-015)**

File: `connect-four/server/index.js`

Modify the handler at line 586 as follows (summarized — implement the full logic):

1. **Auth gate** (existing, keep): `if (!req.user) return res.status(401)...`

2. **Cache check** (NEW, insert before quota):
   ```js
   const positionHash = createHash('sha256').update(`${movestring}:${col}`).digest('hex');
   if (supabase) {
     const { data: cached } = await supabase
       .from('explanation_cache')
       .select('deep_reveal_json')
       .eq('position_hash', positionHash)
       .single();
     if (cached?.deep_reveal_json) {
       return res.json({
         explanation: cached.deep_reveal_json.explanation,
         bestLine: cached.deep_reveal_json.bestLine ?? [],
         cached: true,
       });
     }
   }
   ```

3. **Quota decrement** (existing, keep but move AFTER cache check):
   ```js
   if (req.user.tier === 'free') {
     const quota = await checkAndDecrementQuota(req.user);
     if (!quota.allowed) return res.status(429)...
   }
   ```

4. **Compute `bestLine`** (NEW, before LLM call):
   ```js
   const bestLine = await computeBestLine(movestring, col, solver);
   ```

5. **LLM call** (existing, keep): `const explanation = await callLLM(prompt);`

6. **Cache write** (MODIFIED — include `bestLine` in blob):
   ```js
   // fire-and-forget
   supabase.from('explanation_cache').insert({
     position_hash: positionHash,
     one_liner: '',
     deep_reveal_json: { explanation, bestLine },
   }).then(() => {}).catch(err => console.error('[cache write]', err.message));
   ```

7. **Response** (MODIFIED):
   ```js
   res.json({ explanation, bestLine });
   ```

Import `computeBestLine` at the top of `index.js`:
```js
import { explainSimulate, computeBestLine } from './explainSimulate.js';
```

**Acceptance**: 
- Authenticated request for a cached position → `{ explanation, bestLine: [...], cached: true }`, quota not decremented.
- Authenticated free-tier request for uncached position → `{ explanation, bestLine: [...] }`, quota decremented by 1.
- Unauthenticated request → 401.
- After first call, second call for same position returns `cached: true`.

---

### Group C — `challengeSets.js` + SetPickerScreen atomic update (depends on T-01)

**T-04: Migrate `challengeSets.js` to i18n-key shape and add `forbidden_columns` / `forced_win` entries; unlock both categories (FR-016, FR-024)**

Files (all four must be edited atomically — B-3, B-4 fix):
1. `connect-four/server/challengeSets.js` — the authoritative server-side list (NOTE: the frontend file `connect-four/src/lib/challengeSets.js` does NOT exist; `connect-four/server/challengeSets.js` is the sole source)
2. `connect-four/src/screens/SetPickerScreen.jsx` — reads the API response shaped from `challengeSets.js`
3. `connect-four/server/categories.js` — `PAID_CATEGORIES` gate for `/draw` 403 (server)
4. `connect-four/src/lib/categories.js` — `PAID_CATEGORIES` gate for frontend tier checks (client)

**`connect-four/server/challengeSets.js`** — replace `displayName`/`description` literals with `displayNameKey`/`descriptionKey` for ALL entries; add new entries:
```js
export const CHALLENGE_SETS = [
  { slug: 'immediate_threat', displayNameKey: 'challengeSet.immediate_threat.displayName', descriptionKey: 'challengeSet.immediate_threat.description', stars: 1, free: true },
  { slug: 'forced_block',     displayNameKey: 'challengeSet.forced_block.displayName',     descriptionKey: 'challengeSet.forced_block.description',     stars: 1, free: true },
  { slug: 'double_threat',    displayNameKey: 'challengeSet.double_threat.displayName',    descriptionKey: 'challengeSet.double_threat.description',    stars: 2, free: true },
  { slug: 'claimeven',        displayNameKey: 'challengeSet.claimeven.displayName',        descriptionKey: 'challengeSet.claimeven.description',        stars: 3, free: true },
  { slug: 'z_threat',         displayNameKey: 'challengeSet.z_threat.displayName',         descriptionKey: 'challengeSet.z_threat.description',         stars: 3, free: true },
  { slug: 'forbidden_columns',displayNameKey: 'challengeSet.forbidden_columns.displayName',descriptionKey: 'challengeSet.forbidden_columns.description',stars: 2, free: true },
  { slug: 'forced_win',       displayNameKey: 'challengeSet.forced_win.displayName',       descriptionKey: 'challengeSet.forced_win.description',       stars: 3, free: true },
  { slug: 'mixed',            displayNameKey: 'challengeSet.mixed.displayName',            descriptionKey: 'challengeSet.mixed.description',            stars: 3, free: false },
  { slug: 'undercut',         displayNameKey: 'challengeSet.undercut.displayName',         descriptionKey: 'challengeSet.undercut.description',         stars: 4, free: false },
  { slug: 'overcut',          displayNameKey: 'challengeSet.overcut.displayName',          descriptionKey: 'challengeSet.overcut.description',          stars: 4, free: false },
  { slug: 'figure_7',         displayNameKey: 'challengeSet.figure_7.displayName',         descriptionKey: 'challengeSet.figure_7.description',         stars: 4, free: false },
  { slug: 'j_shape',          displayNameKey: 'challengeSet.j_shape.displayName',          descriptionKey: 'challengeSet.j_shape.description',          stars: 4, free: false },
];
```

**`connect-four/src/screens/SetPickerScreen.jsx`** — update the render to resolve displayNameKey via `t()`. The Set Picker reads `displayNameKey` and `descriptionKey` from the API response (which is shaped from `server/challengeSets.js`):
- Line 59: `title={t(set.displayNameKey) ?? set.slug}` (was `set.displayName ?? set.slug`)
- Add description display if desired (optional — not required by spec, skip if not in mockup).

**`connect-four/server/categories.js`** — remove `forced_win` and `forbidden_columns` from `PAID_CATEGORIES` (B-3 fix — server gate, controls `/draw` 403):
```js
export const PAID_CATEGORIES = new Set([
  'mixed', 'undercut', 'overcut', 'figure_7', 'j_shape',
]);
```

**`connect-four/src/lib/categories.js`** — remove `forced_win` and `forbidden_columns` from `PAID_CATEGORIES` (B-3 fix — client gate, controls tier-lock UI). Apply the same set as the server file above.

**Acceptance**: Set Picker shows "Forbidden Columns" and "Forced Win" cards (when puzzle counts > 0). Existing sets still display correctly. Neither `forbidden_columns` nor `forced_win` appear as locked. `GET /api/puzzles/draw?category=forced_win` returns 200 (not 403) for free-tier users. `GET /api/puzzles/draw?category=forbidden_columns` returns 200 (not 403) for free-tier users.

---

### Group D — ChallengeScreen extensions (depends on T-01, T-04)

**T-05: Wire Forced Win sequence mode in `ChallengeScreen.jsx` (FR-025, FR-026, FR-027, FR-028, FR-029)**

File: `connect-four/src/screens/ChallengeScreen.jsx`

Add `SequenceHandler` import:
```js
import { SequenceHandler } from '../components/SequenceHandler.jsx';
```

In `initPuzzle()`: detect sequence mode and set coach messages from `coach.forced_win.prompt.*` pool (same random-pick pattern as existing categories). The `puzzle.interaction_mode` field drives detection.

**Field shape adapter (B-1 fix)**: `SequenceHandler` expects camelCase fields (`puzzle.moveString`, `puzzle.goalPrompt`, `puzzle.id`). The `/draw` API returns snake_case (`move_string`, `goal_prompt`, `id`). Map the raw draw row to `SequenceHandler`'s expected shape at the callsite — do NOT modify `SequenceHandler`:

```js
// Adapter — map /draw snake_case row to SequenceHandler's expected camelCase shape
function toSequenceHandlerShape(drawRow) {
  return {
    id: drawRow.id,
    moveString: drawRow.move_string,
    goalPrompt: drawRow.goal_prompt,
    // spread any other fields SequenceHandler reads, mapping snake_case → camelCase
  };
}
```

In the render, where Board is currently rendered: branch on `puzzle.interaction_mode === 'sequence'`:
```jsx
{puzzle.interaction_mode === 'sequence' ? (
  <SequenceHandler
    key={currentPuzzle.id}
    puzzle={toSequenceHandlerShape(currentPuzzle)}
    onNext={() => handleSequenceComplete(true)}
  />
) : (
  // existing Board + single-move rendering
)}
```

**Success-only for MVP (B-2 fix)**: `SequenceHandler.onNext` is a plain button onClick with zero arguments; there is no way to pass a `passed` boolean from the sequence handler. Therefore `onNext` is always wired as `() => handleSequenceComplete(true)` (success only). The fail path (FR-028 Blunder branch and FR-029 fail-recording) is deferred post-MVP. A comment in the code MUST note this: `// MVP: success-only — SequenceHandler.onNext carries no pass/fail argument; fail path deferred`.

Add `handleSequenceComplete(passed)` (retains the `passed` parameter so the fail path can be added later without changing the signature):
```js
function handleSequenceComplete(passed) {
  const quality = passed ? 'optimal' : 'blunder';
  const current = puzzles[currentIdx];
  
  // MVP: only the passed=true path is reachable (see onNext wiring above)
  store?.recordPuzzleAttempt({
    puzzle_id: current.id,
    device_uuid: 'local',
    moves_tried: [],
    outcome: passed ? 'correct_first' : 'wrong',
    first_attempt_correct: passed,
    time_ms: Date.now() - startTimeRef.current,
  });
  
  // Update coach messages
  const qualityPool = passed ? 'optimal' : 'blunder';
  const keys = [0, 1].map(i => `coach.forced_win.${qualityPool}.${i}`);
  const valid = keys.filter(k => t(k) !== k);
  const key = valid[Math.floor(Math.random() * valid.length)] ?? keys[0];
  setCoachMessages(prev => [...prev, { text: t(key), mood: passed ? 'happy' : 'oops' }]);
  
  setPhase('post-move');
  setEvaluation({ quality, badge: passed ? 'good' : 'bad' });
  
  track('puzzle_solved_correct', { puzzleId: current.id, category });
}
```

**Also**: before reading `SequenceHandler`'s actual prop names, inspect `connect-four/src/components/SequenceHandler.jsx` to confirm every field used — extend `toSequenceHandlerShape` to cover all of them. Do not guess at field names.

**Acceptance**: Navigate to Forced Win set → Board renders via `SequenceHandler` with camelCase puzzle shape. Completing the sequence → `handleSequenceComplete(true)` fires, coach updates, "Next →" appears. No `/api/evaluate-move` calls mid-sequence (verify in network log).

---

**T-06: Wire Forbidden Columns multi-select in `ChallengeScreen.jsx` (FR-017, FR-018, FR-019, FR-020, FR-021, FR-022, FR-023)**

File: `connect-four/src/screens/ChallengeScreen.jsx`

Add state:
```js
const [selectedCols, setSelectedCols] = useState([]);
const [isSubmitting, setIsSubmitting] = useState(false);
```

Reset `selectedCols` in `initPuzzle()`.

**Board rendering branch** (when `category === 'forbidden_columns'` and `phase === 'pre-move'`):
- Pass `selectedCols={selectedCols}` and `onColToggle={(col) => setSelectedCols(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col])}` to Board.
- Do NOT pass `onColumnClick` (prevent disc placement).
- Pass `canPlay={false}` (multi-select, not single-move play).

**CoachDialog**: Use `coach.forbidden_columns.prompt.*` pool in `initPuzzle()` when `category === 'forbidden_columns'`.

**Toolbar** (when `category === 'forbidden_columns'` and `phase === 'pre-move'`): replace Hint button with "Submit" button disabled when `selectedCols.length === 0`.

**`handleForbiddenSubmit()`** — port from `PuzzlesPage.jsx` lines 345–415 with these adaptations:
- Use `puzzles[currentIdx]` as `puzzle`.
- Get `session` from `useStore()` (already available).
- After computing `forbiddenCols`, `correctFound`, `missedForbidden`:
  - Compute `quality`: `allCorrect ? 'optimal' : cols.every(c => forbiddenCols.includes(c)) ? 'suboptimal' : 'blunder'`.
  - Compute `badge`: `quality === 'optimal' ? 'good' : quality === 'suboptimal' ? 'mid' : 'bad'`.
  - Set `overlays` (existing state) to `newOverlays`.
  - Set `evaluation({ quality, badge, summaryLineKey: ... })`.
  - Call `store?.recordPuzzleAttempt({ puzzle_id, ... correct: quality === 'optimal' })`.
  - Call `track('puzzle_attempted', { puzzleId, category: 'forbidden_columns', submittedCols: cols, correctCols: forbiddenCols })`.
  - Set `phase('post-move')`.

**Summary line key** for forbidden:
- Optimal: `'eval.forbidden_columns.optimal.summary.0'`
- Suboptimal: use a key with `{{found}}` / `{{total}}` interpolation — pass `{ found: correctFound.length, total: forbiddenCols.length }` to `t()`.
- Blunder: `'eval.forbidden_columns.blunder.summary.0'`

**Acceptance**: Enter Forbidden Columns puzzle → columns toggle on tap with red tint + ✕ badge. Submit disabled with 0 cols. Submit with correct set → green flash. Submit with false positive → `tr` overlay on wrong col. Coach updates.

---

### Group E — Deep Reveal Panel in ChallengeScreen (depends on T-03, T-05, T-06)

**T-07: Implement Deep Reveal Panel inline in `ChallengeScreen.jsx` (FR-001 through FR-009)**

File: `connect-four/src/screens/ChallengeScreen.jsx`

Add state:
```js
const [deepRevealOpen, setDeepRevealOpen] = useState(false);
const [deepRevealLoading, setDeepRevealLoading] = useState(false);
const [deepRevealData, setDeepRevealData] = useState(null); // { explanation, bestLine }
const [deepRevealFlagged, setDeepRevealFlagged] = useState(false);
const [deepRevealTimedOut, setDeepRevealTimedOut] = useState(false);
```

Reset all deep reveal state in `initPuzzle()` (so each puzzle starts fresh).

**`handleLearnMore()`** — replace the existing stub (B-6 fix: no client-side quota pre-flight; rely solely on the server 429 response):
```js
async function handleLearnMore() {
  if (!session) { setAuthOpen(true); return; }
  // NOTE: No client-side quota_exhausted pre-flight here.
  // The server is the authoritative quota gate and returns 429 on exhaustion.
  // UpgradeModal is triggered by a 429 response, not by a client-side profile read.
  // This matches the existing DeepRevealButton.jsx pattern.
  
  setDeepRevealOpen(true);
  setDeepRevealLoading(true);
  setDeepRevealData(null);
  setDeepRevealFlagged(false);
  setDeepRevealTimedOut(false);
  
  track('deep_reveal_viewed', { puzzleId: puzzles[currentIdx]?.id, cached: false }); // cached updated on response
  
  const timeoutId = setTimeout(() => {
    setDeepRevealLoading(false);
    setDeepRevealTimedOut(true);
  }, 6000);
  
  try {
    const current = puzzles[currentIdx];
    const res = await fetch(`${API}/api/explain-move-llm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ movestring: current.move_string, col: lastDrop?.c }),
    });
    
    clearTimeout(timeoutId);
    
    if (res.status === 401) { setDeepRevealOpen(false); setAuthOpen(true); return; }
    if (res.status === 429) { setDeepRevealOpen(false); setUpgradeOpen(true); return; }
    
    const data = await res.json();
    setDeepRevealData(data);
    setDeepRevealLoading(false);
    
    track('deep_reveal_viewed', { puzzleId: current?.id, cached: data.cached ?? false });
  } catch {
    clearTimeout(timeoutId);
    setDeepRevealLoading(false);
    setDeepRevealTimedOut(true);
  }
}
```

**Panel render** (bottom-sheet, rendered when `deepRevealOpen === true`):
```jsx
{deepRevealOpen && (
  <>
    <div style={backdropStyle} onClick={() => setDeepRevealOpen(false)} />
    <div style={sheetStyle}>
      <div style={grabHandleStyle} />
      <button onClick={() => setDeepRevealOpen(false)} style={collapseBtn}>
        <Icon name="chevD" size={16} /> {t('common.collapse', 'Collapse')}
      </button>
      
      {deepRevealLoading ? (
        <div style={spinnerWrapper}>
          <div className="spinner" />
          <p>{t('deepReveal.loading', 'Reading the position…')}</p>
        </div>
      ) : deepRevealTimedOut ? (
        <div>
          <p>{t(evaluation?.summaryLineKey)}</p>
          <p>{t('deepReveal.unavailable', 'Detailed explanation unavailable.')}</p>
        </div>
      ) : deepRevealData ? (
        <div>
          {/* (a) Pattern tags + quality badge from evaluation state */}
          <div style={tagRowStyle}>
            {evaluation?.patternTag && <span className="tag pat">{evaluation.patternTag.replace(/_/g, ' ')}</span>}
            {evaluation?.badge && <span className={`tag ${evaluation.badge}`}>{QUALITY_GLYPH[evaluation.quality]} {t('challenge.quality.' + evaluation.quality)}</span>}
          </div>
          
          {/* (b) Non-interactive compact Board with overlays from evaluation */}
          <div style={{ padding: '10px 0' }}>
            <Board
              board={board}
              compact
              canPlay={false}
              overlays={overlays}
              badge={badge}
            />
          </div>
          
          {/* (c) LLM explanation */}
          <p style={explanationStyle}>{deepRevealData.explanation}</p>
          
          {/* (d) Best line chips — omit if absent/empty */}
          {deepRevealData.bestLine?.length > 0 && (
            <div style={bestLineSectionStyle}>
              <div style={bestLineLabelStyle}>BEST LINE</div>
              <div style={bestLineChipsStyle}>
                {deepRevealData.bestLine.map((move, i) => (
                  <React.Fragment key={i}>
                    <span style={chipStyle}>{move}</span>
                    {i < deepRevealData.bestLine.length - 1 && <Icon name="chevR" size={14} />}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
          
          {/* Flag button */}
          <div style={{ textAlign: 'center', marginTop: 14 }}>
            {deepRevealFlagged ? (
              <span><Icon name="check" size={15} /> {t('deepReveal.flagged', 'Thanks — flagged')}</span>
            ) : (
              <button onClick={handleFlag} style={flagBtn}>
                <Icon name="flag" size={15} /> {t('deepReveal.flag', 'Flag this explanation')}
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  </>
)}
```

**`handleFlag()`**:
```js
async function handleFlag() {
  if (deepRevealFlagged) return;
  setDeepRevealFlagged(true);
  const current = puzzles[currentIdx];
  await fetch(`${API}/api/llm-feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      movestring: current.move_string,
      llm_prompt: '',
      llm_response: deepRevealData?.explanation ?? '',
      human_note: '',
      feature: 'challenges',
    }),
  }).catch(() => {});
  track('deep_reveal_flagged', { puzzleId: current?.id });
}
```

**Add i18n keys** needed by Deep Reveal panel to `en.json`:
```json
"deepReveal": {
  "loading": "Reading the position…",
  "unavailable": "Detailed explanation unavailable.",
  "flag": "Flag this explanation",
  "flagged": "Thanks — flagged"
},
"common": {
  ...existing...,
  "collapse": "Collapse"
}
```

**Acceptance**: Tap "Learn more ▼" as authenticated user → panel opens with spinner. After ≤ 6s response → explanation + best line shown. Tap "Collapse" or backdrop → panel closes, board unaffected. Tap "Flag" → button changes to "Thanks — flagged", `llm_feedback` row written. Unauthenticated → `AuthModal`. 429 response → `UpgradeModal`.

---

### Group F — Post-Set Summary (depends on T-01, T-04)

**T-08: Implement `PostSetSummaryScreen.jsx` and wire to screenRegistry (FR-030 through FR-039)**

File: `connect-four/src/screens/PostSetSummaryScreen.jsx` (new)

```jsx
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TopBar } from '../components/TopBar.jsx';
import { CoachDialog } from '../components/CoachDialog.jsx';
import { ProgressBar } from '../components/ProgressBar.jsx';
import { UpgradeModal } from '../components/UpgradeModal.jsx';
import { useStore } from '../store/ProfileStore.jsx';
import { track } from '../lib/track.js';
import { CATEGORY_ORDER, CATEGORY_NAMES } from '../lib/categories.js';

// Lesson order for tie-break (same as CATEGORY_ORDER for now)
const LESSON_ORDER = CATEGORY_ORDER;

// Pro-gated lesson IDs — update when Epic 5 ships
const PRO_LESSONS = new Set(['undercut', 'overcut', 'figure_7', 'j_shape']);

export function PostSetSummaryScreen({ go, results = [], category }) {
  const { t } = useTranslation();
  const { store, session } = useStore();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [savedOnce, setSavedOnce] = useState(false);

  // Compute derived stats
  const total = results.length;
  const optimalCount = results.filter(r => r.quality === 'optimal').length;
  const blunderCount = results.filter(r => r.quality === 'blunder').length;
  const accuracy = total > 0 ? Math.round((optimalCount / total) * 100) : 0;

  // byPattern: { [slug]: { optimal, total } }
  const byPattern = {};
  for (const r of results) {
    const slug = r.category ?? category;
    if (!byPattern[slug]) byPattern[slug] = { optimal: 0, total: 0 };
    byPattern[slug].total++;
    if (r.quality === 'optimal') byPattern[slug].optimal++;
  }

  // Recommended lesson: lowest accuracy pattern, tie-break by earliest LESSON_ORDER
  const patternSlugs = Object.keys(byPattern);
  const recommendedSlug = patternSlugs
    .filter(s => byPattern[s].total > 0)
    .sort((a, b) => {
      const accA = byPattern[a].optimal / byPattern[a].total;
      const accB = byPattern[b].optimal / byPattern[b].total;
      if (accA !== accB) return accA - accB; // lower accuracy first
      return LESSON_ORDER.indexOf(a) - LESSON_ORDER.indexOf(b); // earlier in order first
    })[0] ?? null;

  const isPerfect = accuracy === 100;
  const isProLesson = recommendedSlug && PRO_LESSONS.has(recommendedSlug);
  const isFreeUser = !session || (store && (store.constructor?.name !== 'SupabaseStore'));

  // Save session and fire analytics exactly once on mount
  useEffect(() => {
    if (savedOnce) return;
    setSavedOnce(true);
    
    store?.saveChallengeSession({ category, results, accuracy, timestamp: Date.now() });
    track('set_completed', { category, accuracy, optimalCount, blunderCount, byPattern });
  }, [savedOnce]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleCTA() {
    if (isPerfect) {
      go('setpicker');
    } else if (isProLesson && isFreeUser) {
      setUpgradeOpen(true);
    } else {
      go('concept', { lessonId: recommendedSlug });
    }
  }

  const ctaLabel = isPerfect
    ? t('summary.cta_back', 'Back to Challenges')
    : t('summary.cta_lesson', 'Go to {{lessonName}} lesson', { lessonName: CATEGORY_NAMES[recommendedSlug] ?? recommendedSlug });

  // Coach message
  const coachText = isPerfect
    ? t(`coach.summary.perfect.${Math.floor(Math.random() * 2)}`)
    : t('summary.coach_recommend', 'Work on {{pattern}} next.', { pattern: CATEGORY_NAMES[recommendedSlug] ?? recommendedSlug });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-challenges)' }}>
      <TopBar onBack={() => go('setpicker')} />
      
      <div style={{ padding: '0 22px 24px', flex: 1, overflowY: 'auto' }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: 76, height: 76, borderRadius: '50%', background: 'var(--eval-good-bg)', display: 'grid', placeItems: 'center', margin: '0 auto 10px' }}>
            <Icon name="check" size={40} color="var(--eval-good)" />
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26 }}>
            {t('summary.hero', 'Set complete!')}
          </h2>
        </div>
        
        {/* Accuracy card */}
        <div style={{ background: '#fff', borderRadius: 20, padding: 20, boxShadow: 'var(--shadow-sm)', marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17 }}>
              {t('summary.count', '{{optimalCount}} / {{total}} optimal', { optimalCount, total })}
            </span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, color: 'var(--disc-green)' }}>
              {accuracy}%
            </span>
          </div>
          <ProgressBar value={optimalCount} max={total} />
          
          <div style={{ height: 1, background: 'var(--line)', margin: '16px 0 4px' }} />
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, color: 'var(--ink-soft)', margin: '6px 0' }}>
            {t('summary.by_pattern', 'BY PATTERN')}
          </div>
          {patternSlugs.map(slug => {
            const { optimal: o, total: tot } = byPattern[slug];
            const acc = tot > 0 ? o / tot : 0;
            const dotColor = acc >= 0.8 ? 'var(--eval-good)' : acc >= 0.5 ? 'var(--eval-mid)' : 'var(--eval-bad)';
            return (
              <div key={slug} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{t(`challengeSet.${slug}.displayName`, CATEGORY_NAMES[slug] ?? slug)}</span>
                <span style={{ fontWeight: 700, fontSize: 14, color: dotColor }}>{o} / {tot}</span>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
              </div>
            );
          })}
        </div>
        
        {/* Coach recommendation */}
        <div style={{ marginTop: 16 }}>
          <CoachDialog size={50} messages={[{ text: coachText, mood: isPerfect ? 'happy' : 'think' }]} />
        </div>
        
        {/* Primary CTA */}
        <button
          onClick={handleCTA}
          style={{ marginTop: 14, width: '100%', padding: '14px 22px', borderRadius: 16, border: 'none', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, cursor: 'pointer', background: 'var(--disc-green)', color: '#fff', boxShadow: '0 6px 0 #228245' }}
        >
          {ctaLabel}
        </button>
        
        {/* Ghost "Back to Challenges" — always present */}
        {!isPerfect && (
          <button
            onClick={() => go('setpicker')}
            style={{ marginTop: 9, width: '100%', padding: '12px 22px', borderRadius: 16, border: '1.5px solid var(--line)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, cursor: 'pointer', background: 'transparent', color: 'var(--ink)' }}
          >
            {t('summary.cta_back', 'Back to Challenges')}
          </button>
        )}
      </div>
      
      {upgradeOpen && <UpgradeModal onDismiss={() => setUpgradeOpen(false)} onNotify={() => setUpgradeOpen(false)} />}
    </div>
  );
}
```

Add i18n keys to `en.json`:
```json
"summary": {
  "hero": "Set complete!",
  "count": "{{optimalCount}} / {{total}} optimal",
  "by_pattern": "BY PATTERN",
  "cta_lesson": "Go to {{lessonName}} lesson",
  "cta_back": "Back to Challenges",
  "coach_recommend": "Work on {{pattern}} next."
}
```

File: `connect-four/src/lib/screenRegistry.jsx`

Wire `PostSetSummaryScreen` to the `'summary'` key (replacing the `PlaceholderScreen`):
```js
import { PostSetSummaryScreen } from '../screens/PostSetSummaryScreen.jsx';
// ...
summary: PostSetSummaryScreen,
```

**Acceptance**: Complete a set → `go('summary', { results, category })` called from `ChallengeScreen.handleNext()`. Summary screen renders: hero, accuracy %, by-pattern breakdown, coach message, primary CTA, ghost CTA. `store.saveChallengeSession()` called once. `track('set_completed', ...)` fired once. Back arrow → setpicker.

---

### Group G — Documentation updates (depends on T-03, T-04, T-07)

**T-09: Update architecture docs and contracts (Principle VIII)**

1. **`docs/architecture/api-conventions.md`** — document the new `POST /api/explain-move-llm` response shape (`bestLine: string[]`, `cached?: boolean`) and the corrected quota ordering (cache check before quota decrement).

2. **`docs/architecture/frontend-conventions.md`** — document:
   - Forbidden Columns branch in the Challenge Session State Machine (new `'forbidden'` sub-branch within `'pre-move'`).
   - `challengeSets.js` i18n-key shape convention (`displayNameKey`/`descriptionKey`).
   - `SetPickerScreen` rendering pattern: `t(set.displayNameKey)`.

3. **`specs/014-challenges-deep-reveal/contracts/explain-move-llm.md`** — full contract for the extended endpoint.

---

## Complexity Tracking

No constitution violations. No speculative abstractions. All components reuse existing patterns.

| Decision | Rationale |
|---|---|
| Deep Reveal panel inline in `ChallengeScreen` (not a separate component) | Used in one place this epic; extraction is premature per Principle II. Epic 3b can extract if needed. |
| `computeBestLine` as a new function in `explainSimulate.js` (not reusing `explainSimulate`) | `explainSimulate` aggregates statistics, not ordered sequences. The function would require a fundamental redesign to expose the PV — simpler to add a dedicated 7-query walk. Comment explains this. |
| `challengeSets.js` shape migration is all-at-once (not just new entries) | Partial migration would leave `SetPickerScreen` in a broken state for existing entries if it switches to `t(set.displayNameKey)`. Atomic update is the only safe path. |
| No `'forbidden'` phase added to the state machine | Forbidden Columns is still `'pre-move'` mode; it just uses `onColToggle` instead of `onColumnClick`. The Submit button is the `'pre-move'` toolbar variant when `category === 'forbidden_columns'`. This avoids adding state for an orthogonal concern. |
| Forced Win: success-only for MVP (B-2) | `SequenceHandler.onNext` has no arguments; passing `passed` is unimplementable without modifying `SequenceHandler`. `onNext` is always wired as `() => handleSequenceComplete(true)`. Fail path (FR-028 Blunder branch, FR-029 fail-recording) is deferred post-MVP. `handleSequenceComplete` signature retains `passed` param for future extension. |
| `/draw` row mapped to camelCase at callsite (B-1) | `SequenceHandler` expects camelCase (`moveString`, `goalPrompt`); `/draw` returns snake_case. `toSequenceHandlerShape()` adapter at the `ChallengeScreen` callsite keeps `SequenceHandler` untouched. |
| No client-side quota pre-flight in Deep Reveal (B-6) | `store.getProfile()` on `IndexedDBStore` does not expose `deep_reveal_count`. Server 429 is the sole quota gate. Removes the contradictory `quota_exhausted` pre-flight from T-07. |
| `bestLine` never empty by construction (B-5) | `pvCols` is initialized with the played column before any solver calls. The `bestLine?.length > 0` guard is purely defensive for legacy `null` cached rows. Contract and FR-005 updated accordingly. |
| PAID_CATEGORIES updated in both files atomically (B-3) | `server/categories.js` and `src/lib/categories.js` both gate `forced_win`/`forbidden_columns`; both must be updated in T-04 or free-tier users still get 403 or see locked UI. |
| `connect-four/server/challengeSets.js` is the sole source (B-4) | `connect-four/src/lib/challengeSets.js` does not exist. Previous plan referenced it in error. T-04 targets only the server file; the frontend reads it via the API response. |
