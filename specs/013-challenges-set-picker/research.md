# Research: Epic 2a — Challenges: Set Picker, Single-Move Board & Tier-1 Feedback

**Phase 0 output for `specs/013-challenges-set-picker/plan.md`**

---

## Decision 1 — Route Registration Order for New Puzzle Endpoints

**Decision**: `GET /api/puzzles/draw` and `GET /api/puzzles/counts` MUST be registered in `server/index.js` BEFORE the existing `GET /api/puzzles/:id` handler (currently at line 806).

**Rationale**: Express matches routes in registration order. If `/draw` or `/counts` are registered after `/:id`, Express treats `draw` and `counts` as values for the `:id` parameter and the wrong handler fires. This is a silent failure — no error, wrong behavior.

**Verified**: `GET /api/puzzles/:id` is at line 806 of `server/index.js`. The new endpoints must be inserted above this line, ideally immediately after the existing `GET /api/puzzles` (line 761) handler.

**Alternatives considered**: Using a separate router file and mounting it before the `:id` route. Rejected because the project does not currently use router files; all routes live in `index.js` directly.

---

## Decision 2 — `PAID_CATEGORIES` Remap

**Decision**: Update BOTH `server/categories.js` AND `connect-four/src/lib/categories.js`:
- Remove `claimeven` and `z_threat` from `PAID_CATEGORIES`.
- Add `mixed` to `PAID_CATEGORIES`.
- `VALID_CATEGORIES` is unchanged (does not need `mixed` — the draw endpoint handles `mixed` with a pre-check branch BEFORE the `VALID_CATEGORIES` check).

**Rationale**: The spec (FR-031, FR-055) requires this remap. The current `server/categories.js` has both `claimeven` and `z_threat` in `PAID_CATEGORIES`, which is wrong per Gap 3 (they should be free). `mixed` is a pseudo-category that is Pro-only but never stored in the DB — it routes to a cross-category sample.

**Verified**: Current state in `server/categories.js`:
- `PAID_CATEGORIES` = `{ forced_win, forbidden_columns, z_threat, claimeven, undercut, overcut, figure_7, j_shape }`
- `VALID_CATEGORIES` = `{ immediate_threat, forced_block, double_threat, forced_win, forbidden_columns, z_threat, claimeven, undercut, overcut, figure_7, j_shape }`

Target state after remap:
- `PAID_CATEGORIES` = `{ forced_win, forbidden_columns, mixed, undercut, overcut, figure_7, j_shape }`
- `VALID_CATEGORIES` = unchanged (same 11 slugs, all actual DB categories)

**Alternatives considered**: Adding `mixed` to `VALID_CATEGORIES`. Rejected — `mixed` has no DB slug; it's a routing concept, not a stored category. The `VALID_CATEGORIES` set is used for DB queries and category validation; polluting it with a pseudo-category would break DB queries.

---

## Decision 3 — `moveQualityScorer.js` as a Standalone Module

**Decision**: Create `connect-four/server/moveQualityScorer.js` as a standalone ES module exporting `scoreMove(scores, playedCol)`. The `POST /api/evaluate-move` endpoint imports it, and `POST /api/games/analyze` (Epic 3b) will also import it.

**Rationale**: FR-034 explicitly requires the scorer to be importable by both endpoints. Building it as a separate module is the only way to satisfy this without duplication.

**Signature**:
```js
export function scoreMove(scores, playedCol) {
  // Returns: { badge: 'good'|'mid'|'bad', quality: 'optimal'|'suboptimal'|'blunder', bestCol: number }
}
```

**Classification logic** (from spec FR-032/FR-033):
1. Find `bestScore = max(scores)` and `bestCol = argmax(scores)` (ties: lowest index).
2. Losing position = all scores ≤ 0: `optimal` = score closest to 0 (least negative); `blunder` = more than 4 score points below least negative.
3. Otherwise:
   - `score(played) === score(best)` → `optimal` / `good`
   - `sign(score(played)) === sign(score(best))` but played ≠ best by score → `suboptimal` / `mid`
   - `sign(score(played)) < sign(score(best))` → `blunder` / `bad`
   - Sign ordering: positive > 0 > negative (per FR-033)

**Empty board**: caller passes `EMPTY_BOARD_SCORES = [0,0,1,2,1,0,0]` — scorer handles it naturally (all scores are positive/zero; center wins).

---

## Decision 4 — i18n Key Pool Architecture for New Namespaces

**Decision**: Add the following top-level key pools to `en.json` for the five free categories (`immediate_threat`, `forced_block`, `double_threat`, `claimeven`, `z_threat`):
- `coach.<category>.prompt.0` … `.2` — pre-move prompt shown in CoachDialog (client picks randomly per puzzle)
- `coach.<category>.hint.0` … `.1` — hint text when Hint button is tapped (no column names)
- `coach.<category>.optimal.0`, `coach.<category>.suboptimal.0`, `coach.<category>.blunder.0` — post-move coach phrases
- `eval.<category>.optimal.summary.0`, `eval.<category>.suboptimal.summary.0`, `eval.<category>.blunder.summary.0` — Tier-1 summary lines

**Rationale**: The server picks one key at random and returns it as `coachPhraseKey` / `summaryLineKey`. The client calls `t(coachPhraseKey)` to resolve English text. The server never returns English strings. This follows the cross-cutting i18n convention from `epics.md` (Gap 29).

**Verified**: Current `en.json` has no `coach.<category>.*` entries beyond `coach.home.welcome.0`. All new keys are additive.

---

## Decision 5 — `server/challengeSets.js` Module Design

**Decision**: Create `connect-four/server/challengeSets.js` exporting a `CHALLENGE_SETS` ordered array and a `CHALLENGE_SET_MAP` lookup object:

```js
export const CHALLENGE_SETS = [
  { slug: 'immediate_threat', displayName: 'Spot the Win',       stars: 1, description: '...', free: true },
  { slug: 'forced_block',     displayName: 'Block Before You Build', stars: 1, description: '...', free: true },
  { slug: 'double_threat',    displayName: 'The Fork',           stars: 2, description: '...', free: true },
  { slug: 'claimeven',        displayName: 'Claimeven',          stars: 2, description: '...', free: true },
  { slug: 'z_threat',         displayName: 'Z-Threats',          stars: 3, description: '...', free: true },
  { slug: 'mixed',            displayName: 'Mixed — All Patterns', stars: 3, description: '...', free: false },
  { slug: 'undercut',         displayName: 'The Undercut',       stars: 3, description: '...', free: false },
  { slug: 'overcut',          displayName: 'The Overcut',        stars: 3, description: '...', free: false },
  { slug: 'figure_7',         displayName: 'Figure-7 Trap',      stars: 3, description: '...', free: false },
  { slug: 'j_shape',          displayName: 'J-Shape',            stars: 3, description: '...', free: false },
];
```

Note: `forced_win` and `forbidden_columns` are NOT included in Epic 2a per the spec assumption section (their multi-step mechanics require Epic 2b infrastructure).

**Rationale**: The Set Picker drives its rendering from this module + dynamic counts from the endpoint. The mockup's `CHAL_SETS` is illustrative only.

---

## Decision 6 — Challenge Session State (Client-Side)

**Decision**: The `challenge` screen owns a local React state object:
```js
{
  puzzles: DrawnPuzzle[],      // from GET /api/puzzles/draw
  currentIdx: number,           // 0-indexed current puzzle
  results: ChallengeSessionResult[],  // accumulated { puzzleId, quality, category }
  phase: 'loading' | 'pre-move' | 'post-move',
  evaluation: MoveEvaluation | null,  // from POST /api/evaluate-move
}
```

No Zustand/Redux. React `useState` only (per frontend-conventions.md). Session is transient — it is NOT persisted until `summary` screen (Epic 2b calls `store.saveChallengeSession`). This screen calls `store.recordPuzzleAttempt` for solved-puzzle exclusion and analytics.

---

## Decision 7 — `GET /api/puzzles/counts` Implementation

**Decision**: Single GROUP BY query over approved puzzles, returning counts for all categories in `CATEGORY_ORDER`. `mixed` is NOT in the counts response (it has no DB slug). The Set Picker hides `mixed` counts is not applicable — the `challengeSets.js` entry marks it as Pro, so it renders as locked without needing a count.

**Query pattern**:
```sql
SELECT category, COUNT(*) as count FROM puzzles WHERE is_active = true GROUP BY category
```

Response shape: `{ counts: { immediate_threat: 12, forced_block: 8, ... } }` — all categories in `CATEGORY_ORDER` are present, with 0 for missing ones.

---

## Decision 8 — "Learn more ▼" Stub in Epic 2a

**Decision**: Wire the "Learn more ▼" button with the full gate logic (anonymous → `AuthModal`, quota-exceeded → `UpgradeModal`, eligible → stub that logs "Deep Reveal coming in Epic 2b") but do NOT implement the Deep Reveal Panel itself.

**Rationale**: FR-025, FR-026, FR-027 require the gates to be wired. FR-027 explicitly calls out "this epic wires the button and gate logic, not the panel itself." The stub approach avoids dead code while making the gating logic testable.

---

## Decision 9 — Back-Confirmation Dialog

**Decision**: Use a native `window.confirm()` for the session-abort dialog during Epic 2a implementation. Replace with a custom modal in a polish pass if required.

**Rationale**: FR-015 requires a dialog with "Keep going" / "Leave" options. The simplest implementation that passes the acceptance criterion is a `window.confirm()`. Custom modal adds no educational value in this epic.

**Update**: Per the spec's acceptance scenarios, the dialog message is: "Leave this set? Your progress won't be saved." This is i18n key `challenge.leave_confirm` in `en.json`.

---

## Decision 10 — Migration Number for `PAID_CATEGORIES` Remap

**Decision**: No database migration is needed for the `PAID_CATEGORIES` remap. The remap is a code-only change to `server/categories.js` and `src/lib/categories.js`. The DB does not store tier information for categories — it stores category slugs in `puzzles.category`. The `PAID_CATEGORIES` set is a runtime configuration in the server code.

**Verified**: `server/categories.js` exports a `Set` constant — this is a code file, not a DB migration. No SQL migration is needed.

---

## Decision 11 — `GET /api/puzzles/draw` Access Control for `mixed`

**Decision**: The draw endpoint's category validation flow:
```
1. if category === 'mixed':
   a. if !userCanAccessCategory(req.user, 'mixed') → 403
   b. sample from all approved puzzles across all categories in CATEGORY_ORDER (excluding mixed itself)
   c. return response
2. if !VALID_CATEGORIES.has(category) → 400
3. if !userCanAccessCategory(req.user, category) → 403
4. draw n puzzles from puzzles table WHERE category = ? AND is_active = true
5. return response
```

This order ensures `mixed` (not in `VALID_CATEGORIES`) never hits the 400 path.
