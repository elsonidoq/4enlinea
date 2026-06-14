# Implementation Plan: Coach Commentary — Board-Grounded Phrases

**Branch**: `101-new-design` | **Date**: 2026-06-10 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/029-coach-commentary/spec.md`

---

## Summary

Replace context-dependent sparring-specific coach phrase pools with board-event-grounded commentary in two ordered phases:

- **Phase 1** (surgical): Fix two bugs in `ChallengeScreen.handleColumnClick` — wrong `category` sent to evaluate-move in lesson mode, and quality-blind blunder fallback — and add `coach.generic.optimal.*` / `coach.generic.suboptimal.*` i18n pools.
- **Phase 2** (board-grounded): Add a `POST /api/evaluate-move` call after AI column selection in `useGameBoard.makeAiMove`, thread the result through `commitAiMove`, replace the `isDeliberate`-gated phrase selection with a quality-gated algorithm, remove obsolete sparring pools, and fix the `ExplorerScreen` `timeoutContent` label. Also adds a server-side `classifyPattern` call when no `category` is provided in the evaluate-move request (FR-005a).

No new endpoints. No DB schema changes. No new React components.

---

## Technical Context

**Language/Version**: Node 20 (server), React 18 / Vite (frontend)  
**Primary Dependencies**: Express 5, `react-i18next` (`useTranslation` / `t()`), `classifier.js` (`classifyPattern`), existing `POST /api/evaluate-move` endpoint  
**Storage**: N/A — no schema changes  
**Testing**: `npm run test:fast` (Jest via `connect-four/`) for frontend; `node --test` for isolated server helpers  
**Target Platform**: Browser (PWA) + Node server  
**Project Type**: Web application (monorepo: `connect-four/server/` + `connect-four/src/`)  
**Performance Goals**: Existing evaluate-move endpoint budget (<2 s per Constitution §V). The extra `classifyPattern` solver query in FR-005a is accepted for current scale.  
**Constraints**: Phase 2 MUST NOT ship before Phase 1 — `coach.generic.optimal.*` and `coach.generic.suboptimal.*` pools must exist before the Phase 2 user-move fallback references them.  
**Scale/Scope**: 4 files modified (server/index.js, useGameBoard.js, ChallengeScreen.jsx, ExplorerScreen.jsx) + en.json additions/removals.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

**Principle I — Explanation Engine as Single Source of Truth**:
- [x] Both phases route through the existing `POST /api/evaluate-move` endpoint and classifier. No new evaluation path is introduced.

**Principle II — Code Quality & Simplicity**:
- [x] `pickRandomKey` will be extracted to `src/lib/coachUtils.js` — a single, shared helper consumed by both `ChallengeScreen` and `useGameBoard`. No duplication.
- [x] `isDeliberate` flag is retained only for `import.meta.env.DEV` logging; it no longer controls any i18n key selection (FR-010).

**Principle III — Testing Standards**:
- [x] Manual golden-path verification required for: (a) lesson-mode correct move → `coach.generic.optimal.*`; (b) hard/perfect sparring AI `double_threat` → `coach.ai_move.double_threat.*`; (c) ExplorerScreen deep-reveal label.
- [x] Automated `node --test` server unit test (P2-T8) covers the no-category `classifyPattern` path for at least one score-consuming detector (`forced_win` or `forced_block`), using a movestring sourced from DB or KB — never hand-built.

**Principle IV — UX Consistency & Progressive Disclosure**:
- [x] Commit-first invariant is preserved — Phase 2 evaluate-move call for AI moves runs in parallel with board commit, not before.

**Principle V — Performance Requirements**:
- [x] `classifyPattern` (FR-005a) incurs one extra solver query per AI turn. Accepted at current scale; batching deferred per spec.

**Principle VIII — Documentation (MUST check before planning)**:
- [x] Architecture docs (`api-conventions.md`, `frontend-conventions.md`, `server/index.js` handler) read before drafting.
- [x] No new architectural convention introduced; `pickRandomKey` extraction is an internal refactor documented in tasks.md.
- [x] tasks.md will include a documentation task to update `api-conventions.md` with the new no-category AI server path (FR-005a).

---

## Project Structure

### Documentation (this feature)

```text
specs/029-coach-commentary/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (N/A — no schema changes)
├── contracts/           # Phase 1 output (see below)
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (files touched by this feature)

```text
connect-four/
├── server/
│   └── index.js                          # FR-005a: classifyPattern in no-category branch
└── src/
    ├── i18n/
    │   └── en.json                        # FR-003, FR-013, FR-014: add/remove i18n keys
    ├── lib/
    │   ├── coachUtils.js                  # NEW: pickRandomKey helper (extracted from useGameBoard)
    │   └── useGameBoard.js                # FR-005–010, FR-011: commitAiMove + user-move fallback
    └── screens/
        ├── ChallengeScreen.jsx            # FR-001, FR-002, FR-004
        └── ExplorerScreen.jsx             # FR-012
```

---

## Phase 0: Research

### Decision 1 — `pickRandomKey` extraction location

**Decision**: Extract to `connect-four/src/lib/coachUtils.js`.  
**Rationale**: The helper is needed by both `ChallengeScreen.jsx` and `useGameBoard.js`. A shared module under `src/lib/` matches the existing pattern (e.g., `board.js`, `categories.js`). Inlining a copy in `ChallengeScreen` would create divergence risk. The function has no side effects and no dependencies on React or i18n internals beyond the `t` callback, so it is trivially extractable.  
**Alternatives considered**: Duplicate in `ChallengeScreen` (rejected — divergence risk); inline in the hook and export (rejected — hooks MUST NOT export non-hook utilities per frontend conventions).

### Decision 2 — Evaluate-move call placement in `makeAiMove` (FR-005)

**Decision**: Call `POST /api/evaluate-move` after `aiCol` is determined (step 4 of `makeAiMove`) and pass the `Promise` result into `commitAiMove`. The call is initiated immediately — before `await commitAiMove` — so it executes in parallel with the board-state update side-effects inside `commitAiMove`.  
**Rationale**: The spec says "runs in parallel with the board commit". The board commit is synchronous state mutation (no await before `commitAiMove` returns), so awaiting the evaluate-move `Promise` after the synchronous mutations produces true parallelism.  
**Concrete pattern**:
```js
// Inside makeAiMove, after aiCol is determined:
const classifyPromise = (currentMoves.length === 0 && side === 'second')
  ? Promise.resolve(null)   // opening auto-play: skip (FR-005 exception / FR-009)
  : fetch(`${API}/api/evaluate-move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ movestring: currentMoves.join(''), col: aiCol, aiMove: true }),
    })
    .then(async r => {
      if (!r.ok) return null;          // HTTP 4xx/5xx → neutral fallback (SC-006)
      const data = await r.json();
      return data.quality !== undefined ? data : null; // missing quality → neutral fallback
    })
    .catch(() => null);     // network error → neutral fallback (SC-006)

await commitAiMove(currentMoves, aiCol, classifyPromise);
```

`commitAiMove` awaits the promise internally before selecting the coach phrase. The board state changes (setMoveHistory, setLastDrop) run first; the coach update waits for the classification.

**HTTP error contract**: Three distinct failure modes all resolve to `null` — (1) network failure (`.catch`), (2) HTTP non-2xx (e.g., 500 from solver crash: `!r.ok`), (3) well-formed 2xx response with no `quality` field (malformed server response: `data.quality === undefined`). All three map to `coach.ai_move.neutral.*` via `commitAiMove`'s null branch. This matches the `/api/scores` error pattern in the codebase.

### Decision 3 — `commitAiMove` signature change (FR-006)

**Decision**: Replace the `isDeliberate: boolean` third argument with `classificationPromise: Promise<{quality, patternTag}|null>`.  
**Rationale**: The spec mandates removing `isDeliberate` from phrase selection entirely. Accepting a `Promise` directly (rather than awaiting in `makeAiMove` and passing the resolved value) keeps the board state mutations and the classify I/O concurrent without restructuring `makeAiMove`'s control flow.  
**Callers**:
- Normal path: `await commitAiMove(currentMoves, aiCol, classifyPromise)`
- Error-fallback path (random legal column): pass `Promise.resolve(null)` → neutral fallback
- Opening auto-play path: `classifyPromise` resolves to `null` due to the guard above

### Decision 4 — Server: `classifyPattern` vs `classify` in evaluate-move (FR-005a)

**Decision**: In the `POST /api/evaluate-move` handler, when `req.body.aiMove === true`, replace:
```js
const classifyResult = classify(movestring, colInt, scores);
const patternTag = classifyResult?.tag ?? null;
```
with:
```js
const postMoveMovestring = movestring + String(colInt);
const aiPlayerInt = (movestring.length % 2) + 1;  // pre-move parity → AI is the mover
const tagMap = await classifyPattern(postMoveMovestring, aiPlayerInt, solver);
const PRIORITY = [
  'immediate_threat','double_threat','forced_win','forced_block',
  'forbidden_columns','z_threat','odd_even_threat','claimeven',
  'figure_7','j_shape','overcut','undercut','claimodd',
];
const patternTag = PRIORITY.find(t => tagMap.has(t)) ?? null;
```
When `req.body.aiMove` is absent or false (user-move path), the existing `classify()` call is retained unchanged.

**Rationale**:
- `classify()` is synchronous and uses the pre-move board + pre-computed scores — suitable for user-move evaluation where the position to classify is the pre-move board.
- `classifyPattern()` is async, classifies the post-move board state (all 13 detectors), and returns a `Map` — required by FR-005a which specifies post-move board + `aiPlayerInt` perspective.
- The handler is already `async` (calls `await solver.query`), so no structural change needed.
- `classifyPattern` is already imported in `server/index.js` (confirmed at line 10).

**`aiPlayerInt` derivation**: `(movestring.length % 2) + 1` — if the pre-move movestring has even length, the current mover (AI) is player 1 (Red, moves at even positions); if odd length, player 2 (Yellow). This matches the convention in the rest of the server.

**Scope guard**: This path fires only when `req.body.aiMove === true`. The `handleColumnClick` user-move path sends `{ movestring, col }` with no `aiMove` field and continues to use `classify()`. This prevents the silent rewiring of the live sparring user-move path.

**Latency note**: The AI-path evaluate-move call may exceed the 2 s latency guideline on `forced_win` positions due to `classifyPattern`'s solver queries. This is a known, tracked exception. Revisit only if observed in production.

### Decision 5 — `en.json` duplicate `mistakes` block awareness

**Decision**: Edits to `en.json` target the **second** `mistakes` block (~line 707), which is the effective one. New `coach.generic.*` and `coach.ai_move.*` keys are added under the existing `coach` top-level key. Obsolete `coach.sparring.ai_move`, `coach.sparring.deliberate_mistake`, and `coach.sparring.user_move.generic` sub-keys are removed.  
**Reference**: `reference_en_json_duplicate_mistakes.md` memory — only the second `mistakes` key is effective.

---

## Phase 1: Design & Contracts

### Data Model

No DB schema changes. No new tables or columns.

`en.json` changes are treated as data-model changes for this feature:

**Added keys (Phase 1)**:
```
coach.generic.optimal.{0,1,2}      — 3 new keys
coach.generic.suboptimal.{0,1,2}   — 3 new keys
```

**Added keys (Phase 2)**:
```
coach.ai_move.immediate_threat.{0,1}   — 2 keys
coach.ai_move.forced_block.{0,1}       — 2 keys
coach.ai_move.double_threat.{0,1}      — 2 keys
coach.ai_move.claimeven.{0,1}          — 2 keys
coach.ai_move.z_threat.{0,1}           — 2 keys
coach.ai_move.odd_even_threat.{0,1}    — 2 keys
coach.ai_move.forced_win.{0,1}         — 2 keys
coach.ai_move.claimodd.{0,1}           — 2 keys
coach.ai_move.figure_7.{0,1}           — 2 keys
coach.ai_move.j_shape.{0,1}            — 2 keys
coach.ai_move.overcut.{0,1}            — 2 keys
coach.ai_move.undercut.{0,1}           — 2 keys
coach.ai_move.suboptimal.{0,1,2}       — 3 keys
coach.ai_move.neutral.{0,1,2}          — 3 keys
```

**Removed keys (Phase 2)**:
```
coach.sparring.ai_move.{0,1,2}              — 3 keys
coach.sparring.deliberate_mistake.{0,1}     — 2 keys
coach.sparring.user_move.generic.{0,1,2}    — 3 keys
```

### Contracts

#### Contract: `POST /api/evaluate-move` — no-category AI path (updated server behaviour)

No change to request/response shape. Internal change only:

| Condition | Before (current) | After (Phase 2) |
|---|---|---|
| `aiMove` absent or false (user-move path) | `classify()` (sync, pre-move board) | unchanged |
| `aiMove: true` (AI-move path) | `classify()` (sync, pre-move board) | `classifyPattern()` (async, post-move board, aiPlayerInt perspective) + PRIORITY reduction |

Response fields unchanged: `{ badge, quality, coachPhraseKey, coachMood, summaryLineKey, patternTag }`.

`coachPhraseKey` and `summaryLineKey` in the AI-move path will now reflect the AI player's pattern (if any) rather than a user-move classifier result. Clients that display `coachPhraseKey` in the AI context (Phase 2: `commitAiMove`) must use the quality-gated algorithm (FR-007) — the key from `coachPhraseKey` in the response is NOT used directly; the client selects from `coach.ai_move.*` pools using `patternTag` and `quality`.

#### Contract: `pickRandomKey(t, prefix) → string`

```js
// connect-four/src/lib/coachUtils.js
// Returns a randomly selected full key string from the i18n pool under `prefix`.
// Pool is discovered by probing indices 0..N until t(key) === key (missing).
// Returns `${prefix}.0` when the pool is empty (key itself — signals missing pool to caller).
export function pickRandomKey(t, prefix) { ... }
```

Callers that need to detect a missing pool (Phase 2 FR-007 step 3) use:
```js
const key = `coach.ai_move.${patternTag}.0`;
if (t(key) !== key) {
  // pool exists — pick random key
  phraseKey = pickRandomKey(t, `coach.ai_move.${patternTag}`);
}
```

#### Contract: `commitAiMove` signature

```js
async function commitAiMove(
  currentMoves: number[],
  aiCol: number,
  classificationPromise: Promise<{ quality: string, patternTag: string|null } | null>
): Promise<void>
```

The `isDeliberate: boolean` third argument is removed. All three call sites in `makeAiMove` (normal, error-fallback, and the opening `side==='second'` auto-play path via the `classifyPromise` guard) now pass a `Promise`.

---

## Implementation Sequence

### Phase 1 — Surgical bug fixes (ship first, no dependencies)

**P1-T1**: Extract `pickRandomKey` from `useGameBoard.js` to `src/lib/coachUtils.js`. Update `useGameBoard.js` import. No behaviour change.

**P1-T2**: Add `coach.generic.optimal.{0,1,2}` and `coach.generic.suboptimal.{0,1,2}` to `en.json` (FR-003 values from spec).

**P1-T3**: Fix `ChallengeScreen.handleColumnClick`:
- Compute `effectiveCategory = lessonMode ? confirmationCategory : category` at the top of the handler (FR-001).
- Replace `body: JSON.stringify({ movestring: current.move_string, col, category })` with `effectiveCategory` (FR-001).
- Replace the hardcoded `coach.generic.blunder.${Math.floor(Math.random() * 6)}` fallback with `pickRandomKey(t, \`coach.generic.${data.quality ?? 'blunder'}\`)` (FR-002). Import `pickRandomKey` from `coachUtils.js` (FR-004).

**P1-T4**: Manual verification of Phase 1:
- Lesson mode → evaluate-move request body contains lesson `confirmationCategory`, never `undefined`.
- Optimal move with `coachPhraseKey: null` → phrase from `coach.generic.optimal.*`.
- Blunder move → phrase from `coach.generic.blunder.*` (regression).

### Phase 2 — Board-grounded AI coach (depends on Phase 1)

**P2-T1**: Server — modify `POST /api/evaluate-move` AI-move branch (FR-005a):
- When `req.body.aiMove === true`: compute `postMoveMovestring`, `aiPlayerInt`, call `await classifyPattern(...)`, apply `PRIORITY` array to select `patternTag`.
- When `aiMove` is absent or false: existing `classify()` path unchanged.
- Document in `docs/architecture/api-conventions.md` under the evaluate-move section.

**P2-T2**: Add all `coach.ai_move.*` keys to `en.json` (FR-014): 12 pattern pools × 2 keys + `suboptimal` × 3 + `neutral` × 3 = 30 new keys. Note: there is no `coach.ai_move.forbidden_columns.*` pool — `forbidden_columns` appears in the PRIORITY array for server-side matching only and falls through to neutral on the client.

**P2-T3**: Refactor `useGameBoard.makeAiMove` (FR-005):
- After `aiCol` is determined: create `classifyPromise` (guarded by opening-move exception) using the three-tier error-handling pattern from Decision 2 (network error → null, HTTP non-2xx → null, missing `quality` field → null).
- Change `commitAiMove` call sites to pass `classifyPromise` (removing `isDeliberate`).
- Retain `isDeliberate` flag declaration for `DEV` logging only (FR-010).

**P2-T4**: Refactor `useGameBoard.commitAiMove` (FR-006, FR-007, FR-008):
- Change signature: `(currentMoves, aiCol, classificationPromise)`.
- Await `classificationPromise` before coach phrase selection.
- Implement quality-gated algorithm:
  1. null classification → `pickRandomKey(t, 'coach.ai_move.neutral')`, mood `'think'`
  2. `quality !== 'optimal'` → `pickRandomKey(t, 'coach.ai_move.suboptimal')`, mood `'oops'`
  3. `quality === 'optimal'` AND `patternTag` non-null AND pool exists → `pickRandomKey(t, 'coach.ai_move.${patternTag}')`, mood `'think'`
  4. Otherwise → `pickRandomKey(t, 'coach.ai_move.neutral')`, mood `'think'`
- Preserve `replace` flag logic (FR-008).

**P2-T5**: Fix `useGameBoard.handleColumnClick` user-move fallback (FR-011):
- Replace `pickRandomKey(t, 'coach.sparring.user_move.generic')` with `pickRandomKey(t, \`coach.generic.${data.quality ?? 'blunder'}\`)`.

**P2-T6**: Fix `ExplorerScreen.jsx` `timeoutContent` (FR-012):
- Line 220: `t('coach.categories.${patternTag}', patternTag)` → `t('mistakes.pattern.${patternTag}', patternTag)`.
- Line 221: `t('coach.sparring.user_move.generic.0', '...')` → `t('coach.generic.suboptimal.0')`.

**P2-T7**: Regression check — verify no remaining references to removed pools:
```bash
rg 'coach\.sparring\.(ai_move|deliberate_mistake|user_move\.generic)' connect-four/src/
```
Output must be empty before `en.json` keys are deleted (gate for P2-T9).

**P2-T8**: Server unit test — `node --test` covering the no-category `classifyPattern` path (FR-005a):
- Source a known post-move movestring from the DB or the knowledge base (e.g., a `forced_win` or `forced_block` puzzle entry). Never construct a movestring by hand.
- Send the pre-move prefix and the played column to the evaluate-move handler (or extract and call the helper directly).
- Assert that `patternTag` equals the expected value for at least one score-consuming detector (`forced_win` or `forced_block`).
- This test must pass before the manual verification (P2-T10) is run.
- Run with: `node --test connect-four/server/evaluate-move.test.js` (or equivalent test file path).

**P2-T9**: Remove `coach.sparring.ai_move.*`, `coach.sparring.deliberate_mistake.*`, `coach.sparring.user_move.generic.*` from `en.json` (FR-013). **Execute only after P2-T7 rg check returns empty output.** This is the final en.json edit in Phase 2.

**P2-T10**: Manual verification of Phase 2:
- Hard/perfect sparring: AI `double_threat` optimal move → `coach.ai_move.double_threat.*` phrase.
- Easy/medium sparring: deliberate suboptimal AI move → `coach.ai_move.suboptimal.*`, mood `'oops'`.
- Evaluate-move network error → AI phrase from `coach.ai_move.neutral.*`.
- ExplorerScreen Deep Reveal pane: `patternTag = 'double_threat'` → "double threat" label.

---

## Dependency Constraints

```
P1-T1 (extract pickRandomKey)
  └─► P1-T3 (ChallengeScreen: import + fix)
  └─► P2-T4 (commitAiMove: import + algorithm)
  └─► P2-T5 (handleColumnClick: import already present after P1-T1)

P1-T2 (add coach.generic.optimal/suboptimal pools)
  └─► P2-T5 (user-move fallback references these pools at runtime)

P2-T3 (makeAiMove: create classifyPromise)
  └─► P2-T4 (commitAiMove: consume classifyPromise)

P2-T4 + P2-T5 + P2-T6 (remove all src/ references to coach.sparring.{ai_move|deliberate_mistake|user_move.generic})
  └─► P2-T7 (verify rg returns empty)
  └─► P2-T9 (delete en.json keys — MUST be after P2-T7 passes; final Phase 2 en.json edit)

P2-T1 (server FR-005a) is independent of all frontend tasks.
P2-T2 (add coach.ai_move.* keys) must precede P2-T10 (manual test — pools must exist).
P2-T8 (server unit test) depends on P2-T1 and must precede P2-T10 (manual test).
```

---

## Complexity Tracking

No constitution violations. All changes are frontend/i18n refactors and a server-side classifier swap within an existing endpoint handler. No new abstractions, DB tables, or API surfaces.

---

## Open Questions (Resolved)

| # | Question | Resolution |
|---|---|---|
| 1 | Does the evaluate-move handler need `async` for `classifyPattern`? | Already `async` (calls `await solver.query`). No structural change. |
| 2 | Is `aiPlayerInt = (movestring.length % 2) + 1` correct from pre-move movestring? | Confirmed: even-length pre-move → Red's turn (player 1); odd-length → Yellow's turn (player 2). Matches server parity convention. |
| 3 | `forbidden_columns` included in PRIORITY list despite no AI moves in that type? | Safe to include — will never match in practice; no special-case handling needed. |
| 4 | Are all 12 classifier tags confirmed to have `coach.ai_move.<tag>.*` pools after Phase 2? | Yes (FR-014 adds all 12 × 2 keys + 3 generic pools). FR-007 neutral fallback handles any gap until keys land. |
| 5 | Does Phase 2's evaluate-move call for AI moves violate commit-first? | No — the board state (disc placement) happens synchronously in `commitAiMove` before `await classificationPromise` resolves. Only the coach phrase update is deferred. |
