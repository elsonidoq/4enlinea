# Implementation Plan: Epic 2a — Challenges: Set Picker, Single-Move Board & Tier-1 Feedback

**Branch**: `101-new-design` | **Date**: 2026-05-30 | **Spec**: `specs/013-challenges-set-picker/spec.md`

---

## Summary

Epic 2a delivers the first fully interactive surface of DecodeC4: the Set Picker (browse and enter a challenge set) and the Challenge Board (single-move puzzle with Tier-1 feedback). The technical approach is:

1. **Backend-first**: Build `moveQualityScorer.js` in isolation, then the three new endpoints (`/api/evaluate-move`, `/api/puzzles/draw`, `/api/puzzles/counts`), with careful route ordering.
2. **Port, don't rewrite**: The `challenge` screen ports session logic, solved-puzzle exclusion, and optimistic placement from the existing `PuzzlesPage.jsx` (~708 lines).
3. **i18n-first strings**: All user-facing text goes through `en.json` key pools; the server returns key strings, never resolved English.
4. **Categories remap**: `server/categories.js` and `src/lib/categories.js` are updated in sync to free `claimeven`/`z_threat` and add `mixed` as a Pro pseudo-category.

---

## Technical Context

**Language/Version**: Node.js 20 (server), React 18 (frontend), ES modules throughout
**Primary Dependencies**: Express 4, Supabase JS v2, react-i18next, Vite
**Storage**: Supabase PostgreSQL (server-side only; no new migrations needed for this epic)
**Testing**: Manual golden-path verification + integration tests for solver-dependent scorer
**Target Platform**: Browser (mobile-first PWA)
**Project Type**: Full-stack web application (Express server + React SPA)
**Performance Goals**: `POST /api/evaluate-move` under 1 second (SC-002); solver book lookup is O(1)
**Constraints**: No new DB migrations; no new tables; route ordering is a hard correctness constraint
**Scale/Scope**: 5 new endpoints/modules, 2 new screens, ~10 new i18n key groups

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I — Explanation Engine as Single Source of Truth
- [x] `POST /api/evaluate-move` routes through the shared solver + `classify()`. No feature produces pattern labels independently.
- [x] Tier-1 strip shows quality tag + summary line (one-liner always visible). Deep Reveal on demand (Epic 2b) — progressive disclosure preserved.
- [x] "Learn more ▼" button gates access; Tier-2 is not shown without user gesture.

### Principle II — Code Quality & Simplicity
- [x] `moveQualityScorer.js` is a pure function module — no speculative abstractions, no side effects.
- [x] Challenge session state uses `useState` only — no Redux/Zustand.
- [x] Components use `useStore()` (not direct IndexedDB/Supabase) — storage-agnostic interface honored.

### Principle III — Testing Standards
- [x] `moveQualityScorer.js` will be tested with deterministic board fixtures (at least: optimal, suboptimal, blunder, losing position edge case). All fixtures sourced from DB or KB — no random boards.
- [x] `POST /api/evaluate-move` golden-path manual verification before marked complete.

### Principle IV — UX Consistency & Progressive Disclosure
- [x] Column badge enum (`good`/`mid`/`bad`) matches locked cross-epic contract from Epic 1a.
- [x] Overlay enum (`win`) matches locked cross-epic contract.
- [x] Pro sets render as locked SetCard with padlock — not invisible, not erroring.
- [x] Deep Reveal is behind an explicit user gesture ("Learn more ▼").
- [x] No raw solver scores surfaced at any point.

### Principle V — Performance Requirements
- [x] `POST /api/evaluate-move` uses persistent solver (O(1) book lookup) — expected <500ms.
- [x] `GET /api/puzzles/counts` is a single GROUP BY query — expected <200ms.
- [x] Loading state shown while `GET /api/puzzles/draw` resolves (phase: 'loading').

### Principle VI — Implementation & Debugging Methodology
- [x] All data dependencies mapped before writing: `DrawnPuzzle` fields traced to `puzzles` table columns in `data-model.md`.
- [x] Route ordering validated empirically by checking `server/index.js` line 806 for `/:id`.
- [x] `mixed` pseudo-category branch runs before `VALID_CATEGORIES` check — explicit comment required at that branch point.

### Principle VII — Software Design Philosophy
- [x] `mixed` special-case is a pre-check branch (explicit > implicit). Not a silent fallback.
- [x] `challengeSets.js` is a single source of truth for set metadata — no duplication.

### Principle VIII — Documentation as First-Class Deliverable
- [x] Architecture docs (`api-conventions.md`, `server-conventions.md`, `frontend-conventions.md`) read before drafting.
- [x] New API shapes documented in `contracts/api-contracts.md`.
- [x] New data shapes documented in `data-model.md`.
- [x] No undocumented conventions discovered; constitution and architecture docs are consistent with this plan.
- [x] tasks.md will include explicit documentation tasks for: `moveQualityScorer.js` module contract, new i18n namespace convention (`eval.*`).

**Post-design re-check**: PASS — no violations introduced by Phase 1 design artifacts.

---

## Project Structure

### Documentation (this feature)

```text
specs/013-challenges-set-picker/
├── plan.md              # This file
├── research.md          # Phase 0 output — 11 decisions
├── data-model.md        # Phase 1 output — entities, no new migrations
├── contracts/
│   └── api-contracts.md # Phase 1 output — 3 new endpoints
└── tasks.md             # Phase 2 output (not yet created)
```

### Source Code (affected paths)

```text
connect-four/server/
├── categories.js              # MODIFY: PAID_CATEGORIES remap
├── challengeSets.js           # CREATE: challenge set metadata module
├── moveQualityScorer.js       # CREATE: scoreMove() pure function
└── index.js                   # MODIFY: 3 new endpoints (before /api/puzzles/:id)

connect-four/src/
├── lib/
│   ├── board.js               # CREATE: extract buildBoard() from PuzzlesPage.jsx
│   └── categories.js          # MODIFY: PAID_CATEGORIES remap (mirror)
├── i18n/
│   └── en.json                # MODIFY: add coach.*, eval.*, setpicker.*, challenge.* keys
└── screens/
    ├── SetPickerScreen.jsx    # CREATE: setpicker screen
    └── ChallengeScreen.jsx    # CREATE: challenge screen (single-move + Tier-1)
```

**Structure Decision**: Web application layout (Express server in `connect-four/server/`, React in `connect-four/src/`). New screens go in `src/screens/` (matches `HomeScreen.jsx`, `StatsScreen.jsx` convention). New server modules go in `server/` alongside `categories.js`, `classifier.js` etc.

---

## Complexity Tracking

No constitution violations requiring justification.

---

## Implementation Design

### Phase A: Backend Foundation (no frontend dependency)

#### A1 — `moveQualityScorer.js`

New file: `connect-four/server/moveQualityScorer.js`

```js
/**
 * scoreMove(scores, playedCol)
 *
 * @param {number[]} scores — 7 solver scores for the current position (0-indexed cols).
 *   Positive = current player wins, 0 = draw, negative = current player loses.
 *   Use EMPTY_BOARD_SCORES for empty boards.
 * @param {number} playedCol — 0-indexed column the user played.
 * @returns {{ badge: 'good'|'mid'|'bad', quality: 'optimal'|'suboptimal'|'blunder', bestCol: number }}
 */
export function scoreMove(scores, playedCol) { ... }
```

Classification rules (from spec FR-032/FR-033):
1. Compute legal scores only (columns where `scores[i] !== undefined`; all 7 are returned by solver including full columns as a constant).
2. Find `bestScore = max(scores)` and `bestCol = argmax` (lowest-index tie-break).
3. Losing position branch: if `bestScore < 0` (all scores negative):
   - `optimal`: `score(played) === bestScore` (least negative)
   - `blunder`: `score(played) < bestScore - 4`
   - `suboptimal`: everything else
4. Standard branch:
   - `score(played) === bestScore` → `optimal` / `good`
   - `sign(score(played)) === sign(bestScore)` but `score(played) < bestScore` → `suboptimal` / `mid`
   - `sign(score(played)) < sign(bestScore)` → `blunder` / `bad`
   - Sign function: positive > 0 > negative (treat 0 as its own sign distinct from positive and negative).

This module has zero external dependencies (pure function, no solver calls, no imports).

#### A2 — `server/challengeSets.js`

New file: `connect-four/server/challengeSets.js`

Exports:
- `CHALLENGE_SETS`: ordered array of `{ slug, displayName, stars, description, free }`.
- Set order: `immediate_threat`, `forced_block`, `double_threat`, `claimeven`, `z_threat`, `mixed`, `undercut`, `overcut`, `figure_7`, `j_shape`.
- `forced_win` and `forbidden_columns` are NOT included (Epic 2b adds them).

#### A3 — `server/categories.js` — PAID_CATEGORIES remap

Remove `claimeven` and `z_threat` from `PAID_CATEGORIES`. Add `mixed`.
`VALID_CATEGORIES` and `CATEGORY_ORDER` are unchanged.

#### A4 — Three New Endpoints in `server/index.js`

Registration order constraint: all three new routes MUST be registered BEFORE `GET /api/puzzles/:id` (currently at line 806).

**`GET /api/puzzles/counts`** (simplest — no auth gate, no solver):
- Single Supabase query: `SELECT category, count(*) FROM puzzles WHERE is_active = true GROUP BY category`.
- Build counts map from `CATEGORY_ORDER` (all categories present, 0 if missing from query result).
- Response also includes `sets` array from `CHALLENGE_SETS` so the frontend can render SetCards from one call.
- No auth required.

**`GET /api/puzzles/draw`** (requires auth for Pro categories):
- Validate `category` and `n` params. `n` defaults to 8; valid range is 1–8 inclusive; return 400 `{ error: 'invalid n' }` if out of range.
- Pre-check `mixed` BEFORE `VALID_CATEGORIES` membership test (see research.md Decision 11).
- For standard categories: `SELECT ... FROM puzzles WHERE category = ? AND is_active = true ORDER BY RANDOM() LIMIT ?`.
- For `mixed`: `SELECT ... FROM puzzles WHERE category = ANY(?) AND is_active = true ORDER BY RANDOM() LIMIT ?` where the array is all categories in `CATEGORY_ORDER` that pass `userCanAccessCategory`.
- Response: `{ puzzles: [...] }` with fields from `DrawnPuzzle` entity.

**`POST /api/evaluate-move`** (most complex — requires solver + scorer + classifier + i18n key selection):
- Validate `movestring` and `col`.
- Get scores: empty board → `EMPTY_BOARD_SCORES`; else `await solver.query(movestring)`.
- Call `scoreMove(scores, col)` → `{ badge, quality, bestCol }`.
- Call `classify(movestring, col, scores)` → `{ tag: patternTag }`.
- Determine `phrasePoolKey = category || patternTag`.
- Pick random key from `coach.<phrasePoolKey>.<quality>.*` pool → `coachPhraseKey`.
- Pick random key from `eval.<phrasePoolKey>.<quality>.summary.*` pool → `summaryLineKey`.
- Set `coachMood` from quality.
- Return `{ badge, quality, coachPhraseKey, coachMood, summaryLineKey, patternTag }`.

**i18n pool lookup helper** (inline in `index.js` or small helper function):
```js
function pickFromPool(t, prefix) {
  // t is the full translations object loaded from en.json
  // prefix e.g. 'coach.immediate_threat.optimal'
  // returns a random key like 'coach.immediate_threat.optimal.0'
  const pool = getNestedByPath(t, prefix); // { '0': '...', '1': '...' }
  const keys = Object.keys(pool);
  const idx = Math.floor(Math.random() * keys.length);
  return `${prefix}.${keys[idx]}`;
}
```

The server statically imports `../src/i18n/en.json` at startup to enumerate pool variants in `pickFromPool`. This cross-directory import is acceptable here — `en.json` is a static build artifact and the server already lives in the same monorepo. No dynamic `fs.readFile` needed.

**Classify fallback note**: When `category` is absent AND `classify()` returns no match, the phrase-pool key is undefined — this path is never hit in Epic 2a because challenge puzzles always supply `category`. Generic pool authoring (for Sparring/Epic 3a reuse) is deferred to Epic 3a; do NOT add generic `coach.generic.*` keys in this epic.

### Phase B: i18n Key Pools

#### B1 — `en.json` additions

Add to `en.json`:

1. **`setpicker.*`** and **`challenge.*`** screen namespaces.
2. **`challenge.quality.*`**: quality label strings used in the Tier-1 strip:
   - `challenge.quality.optimal` — "Optimal"
   - `challenge.quality.suboptimal` — "Suboptimal"
   - `challenge.quality.blunder` — "Blunder"
3. **`coach.<category>.*`** for five free categories — `prompt`, `hint`, `optimal`, `suboptimal`, `blunder` sub-keys.
4. **`eval.<category>.*`** for five free categories — `optimal.summary.0`, `suboptimal.summary.0`, `blunder.summary.0`.

Content guidelines for coach phrases:
- `prompt.*`: 2–3 variants. Named the pattern type without revealing column. Example for `immediate_threat.prompt.0`: "You can win right now — find the column."
- `hint.*`: 1–2 variants. Names the task/threat type without revealing the column. Example: "Look for a row where you're one move from four in a row."
- `optimal.*`: Affirms the win/correct pattern. "Nice — you spotted the winning move." 
- `suboptimal.*`: Acknowledges playable but not best. "Close — there was a cleaner path."
- `blunder.*`: Names the mistake type. "That misses your winning opportunity."
- `summary.0`: Concise one-liner. Example for `eval.immediate_threat.optimal.summary.0`: "You found the immediate win."

### Phase C: Frontend — Set Picker Screen

#### C1 — `SetPickerScreen.jsx`

New file: `connect-four/src/screens/SetPickerScreen.jsx`

State:
```js
const [sets, setSets] = useState([]);     // from GET /api/puzzles/counts response.sets
const [counts, setCounts] = useState({}); // from GET /api/puzzles/counts response.counts
const [loading, setLoading] = useState(true);
const [upgradeOpen, setUpgradeOpen] = useState(false);
```

On mount:
- Fetch `GET /api/puzzles/counts` → populate `sets` and `counts`.
- Filter: hide sets where `counts[set.slug] === 0`.
- NOTE: FR-007 (`track('screen_viewed', { screen: 'setpicker' })`) is satisfied automatically by the navigator's `go()` auto-fire — do NOT add a manual `track()` call here; it would double-fire.

Rendering:
- `TopBar` with back → `go('home')`.
- Scrollable list of `SetCard` components.
- Free sets: `onTap` → `go('challenge', { category: set.slug })`.
- Pro sets: `onTap` → `setUpgradeOpen(true)` (opens `UpgradeModal`).
- `UpgradeModal` for locked sets.

Props received: `{ go, goBack }` (standard screen contract). No `params` wrapper — App.jsx spreads nav params as top-level props, so no `params` object exists.

#### C2 — Screen registry update

Update `connect-four/src/lib/screenRegistry.jsx`:
- Replace `setpicker` placeholder with `SetPickerScreen`.

### Phase D: Frontend — Challenge Screen

#### D1 — `ChallengeScreen.jsx`

New file: `connect-four/src/screens/ChallengeScreen.jsx`

**Props received**: `{ go, goBack, category }` — `category` is a top-level prop (App.jsx spreads nav params directly; there is no `params` wrapper object).

**State machine**:
```
loading → pre-move → (tap column) → post-move → (tap Next) → pre-move (next puzzle)
                                                             → summary (if last puzzle)
```

**State**:
```js
const [phase, setPhase] = useState('loading');
const [puzzles, setPuzzles] = useState([]);
const [currentIdx, setCurrentIdx] = useState(0);
const [results, setResults] = useState([]);
const [lastDrop, setLastDrop] = useState(null);
const [evaluation, setEvaluation] = useState(null); // MoveEvaluation
const [promptKeyRef] = useRef(null); // randomly selected per puzzle, stable
```

**On mount**:
- `category` is a top-level prop (destructured directly from the props object — not from `params`).
- Fetch `GET /api/puzzles/draw?category=${category}&n=8`.
- Select `promptKey` for first puzzle: `coach.<category>.prompt.<random>`.
- `setPhase('pre-move')`.

**On column tap** (pre-move only):
1. `track('puzzle_attempted', { puzzleId: current.id, category })`.
2. Compute drop row from `board` state.
3. Commit disc optimistically (`setBoard(...)`, `setLastDrop({ c: col, r: row })`).
4. `setPhase('post-move')` immediately (commit-first per FR-017).
5. Fire `POST /api/evaluate-move` with `{ movestring: current.move_string, col, category }`.
6. On response: `setEvaluation(response)`.
7. Compute `badge` prop for Board: `{ col: playedCol, type: evaluation.badge, label: QUALITY_GLYPH[evaluation.quality] }` where `QUALITY_GLYPH` is a static map defined in the component: `{ optimal: '✓', suboptimal: '?', blunder: '✕' }`. Text labels ("Optimal"/"Suboptimal"/"Blunder") for the Tier-1 strip use i18n keys `challenge.quality.optimal`, `challenge.quality.suboptimal`, `challenge.quality.blunder`.
8. `store.recordPuzzleAttempt({ puzzleId: current.id, category, correct: response.quality === 'optimal' })`.
9. Fire analytics: `track('puzzle_solved_correct', ...)` or `track('puzzle_solved_wrong', ...)`.

**Board state**: Derived from `current.move_string` via `buildBoard` (imported from `src/lib/board.js` — see Phase E1). The board is re-derived each time `currentIdx` changes.

**Progress indicator**: `currentIdx + 1` completed, `puzzles.length` total. Wait for evaluation before counting as completed (evaluation arrival confirms the puzzle attempt is recorded).

**On "Next →" tap**:
- Accumulate `results.push({ puzzleId: current.id, quality: evaluation.quality, category })`.
- If `currentIdx + 1 < puzzles.length`: advance `currentIdx`, reset `phase` to `'pre-move'`, pick new prompt key.
- Else: `go('summary', { results, category })`.

**Back arrow**:
- Show confirmation: "Leave this set? Your progress won't be saved." (use `window.confirm()` in Epic 2a).
- If confirmed: `go('setpicker')`.

**Hint button** (pre-move only):
- Pick a key from `coach.<category>.hint.*` pool.
- Update CoachDialog message to the resolved hint text.

**Win overlays** (post-move, optimal move, win position):
- Check `checkWin` on the board state after the move is committed.
- If won: compute winning line cells → render `win` overlays.

**"Learn more ▼" gating**:
```js
function handleLearnMore() {
  if (!session) { setAuthOpen(true); return; }
  const { deep_reveal_count, deep_reveal_reset_at } = profile;
  const quotaExhausted = /* check count against weekly limit */;
  if (quotaExhausted) { setUpgradeOpen(true); return; }
  // Epic 2b panel: for now, no-op / console.log stub
  console.log('[Epic 2b] Deep Reveal would open here');
}
```

#### D2 — Screen registry update

Update `connect-four/src/lib/screenRegistry.jsx`:
- Replace `challenge` placeholder with `ChallengeScreen`.

### Phase E: Frontend — Shared Utilities & Categories Sync

#### E1 — Extract `buildBoard` to `src/lib/board.js`

New file: `connect-four/src/lib/board.js`

Extract the `buildBoard` function that currently lives inline in `src/pages/PuzzlesPage.jsx` into this shared module. Export it as a named export:
```js
// src/lib/board.js
export function buildBoard(moveString) { ... }
```

Update `PuzzlesPage.jsx` to import `buildBoard` from `src/lib/board.js` instead of defining it locally.

`ChallengeScreen.jsx` imports `buildBoard` from the same shared module.

This extraction is a prerequisite for D1. No behavior change — pure refactor.

#### E2 — `src/lib/categories.js` PAID_CATEGORIES remap

Mirror the server-side change: remove `claimeven`/`z_threat` from `PAID_CATEGORIES`, add `mixed`.

---

## Key Sequencing Constraints

### Constraint 0 — `buildBoard` Extraction Before ChallengeScreen
Phase E1 (extract `buildBoard` to `src/lib/board.js`) is a prerequisite for Phase D (ChallengeScreen). It is a pure refactor with no behavior change and can be done immediately.

### Constraint 1 — Backend before Frontend
Phase A (backend) must complete before Phase D (ChallengeScreen) because the screen calls real endpoints. Phase B (i18n) and Phase C (SetPicker) can proceed in parallel with Phase A once `GET /api/puzzles/counts` is done.

### Constraint 2 — `moveQualityScorer.js` Before `POST /api/evaluate-move`
A1 is a prerequisite for A4's evaluate-move endpoint. Build and test the scorer module in isolation before wiring the endpoint.

### Constraint 3 — Route Registration Order is Correctness-Critical
In A4, the route order in `server/index.js` is:
```
// MUST come before GET /api/puzzles/:id
GET  /api/puzzles/counts    ← new
GET  /api/puzzles/draw      ← new
POST /api/evaluate-move     ← new (not a sub-path of /puzzles/:id, so order here is flexible)
GET  /api/puzzles/:id       ← existing (must stay below /draw and /counts)
```

### Constraint 4 — i18n Keys Before Frontend Renders Coach
Phase B (en.json additions) must complete before Phase D (ChallengeScreen) can be fully tested. The SetPickerScreen (Phase C) does not require coach key pools, so it can be developed before B.

### Constraint 5 — Screen Registry Last
Phase C/D screen implementations must be wired into the screen registry (C2, D2) AFTER the screen components are implemented and manually verified.

---

## Testing Plan

### Scorer Unit Tests (`moveQualityScorer.test.js`)

Minimum fixtures (all sourced from DB or KB — no random boards):
1. **Optimal — winning move**: position with an immediate win; verify `quality === 'optimal'`, `badge === 'good'`.
2. **Suboptimal — same sign, slower**: position with a winning move and a slower winning move; play slower → `suboptimal`.
3. **Blunder — sign drop**: position where best move wins and played move loses → `blunder`.
4. **Losing position**: all scores negative; verify `optimal` = least negative; `blunder` = more than 4 below least negative.
5. **Empty board**: `EMPTY_BOARD_SCORES`, col 3 → `optimal` (score 2 = best).

### Endpoint Integration Tests (manual, golden path)

1. `GET /api/puzzles/counts` — returns object with all 11 categories.
2. `GET /api/puzzles/draw?category=immediate_threat&n=3` — returns 3 or fewer puzzles, all `is_active = true`.
3. `GET /api/puzzles/draw?category=claimeven&n=8` — returns puzzles (claimeven is now free; no 403).
4. `GET /api/puzzles/draw?category=mixed` — returns 403 for unauthenticated user.
5. `POST /api/evaluate-move` with `{ movestring: '', col: 3, category: 'immediate_threat' }` — returns valid response with `coachPhraseKey` starting with `coach.immediate_threat.`.
6. `POST /api/evaluate-move` with invalid movestring — returns 400.

### Frontend Manual Verification (golden path)

1. Navigate to `setpicker` → at least 5 free set cards visible with live counts.
2. Tap a free set → `challenge` screen opens, puzzles loaded.
3. Tap a column → disc animates in, quality badge appears on column, Tier-1 strip appears.
4. Tap "Learn more ▼" while anonymous → AuthModal opens.
5. Tap "Next →" → next puzzle loads.
6. Complete all 8 puzzles → navigates to `summary` screen (placeholder) with `results` param.
7. Tap a locked (Pro) set → UpgradeModal opens.
8. Tap back arrow during session → confirmation dialog appears.

---

## Rollout Notes

- No DB migration required.
- The `PAID_CATEGORIES` remap frees `claimeven` and `z_threat` for all users immediately. Verify no existing paid-only puzzle queries break (they should not — query filter is `is_active = true`, not `PAID_CATEGORIES`).
- The `summary` screen is a placeholder in Epic 2a; navigation to it should land gracefully on the existing `PlaceholderScreen`.
