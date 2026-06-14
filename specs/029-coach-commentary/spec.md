# Feature Specification: Coach Commentary — Board-Grounded Phrases

**Feature Branch**: `029-coach-commentary`  
**Created**: 2026-06-10  
**Status**: Draft  

## Overview

The coach speaks in generic, mode-unaware phrases today. Two failure classes result:

1. **Context bleed** — phrases from sparring-specific pools fire in lesson and exploration contexts where they make no sense (e.g., "Oops — did I just give you something?" in ExplorerScreen, which has no concept of deliberate AI mistakes).
2. **Two concrete lesson-mode bugs** — in `ChallengeScreen`, the wrong phrase pool key is sent to the evaluation endpoint during lesson practice, and a correct move can receive a blunder taunt when the position has no category-specific phrase.

This feature fixes both bug classes and replaces sparring-specific AI move pools with board-event-grounded commentary driven by what the classifier actually detected on the board.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Lesson-mode practice receives correct coach feedback (Priority: P1)

A learner opens a lesson and attempts a puzzle in `ChallengeScreen`. The coach should reflect the lesson's category (e.g., "immediate threat"), not `undefined`.

**Why this priority**: Bugs 1 and 2 directly produce wrong or misleading coach messages during lesson practice — the most guided user flow. This is regressionable immediately after shipping.

**Independent Test**: Open a lesson, attempt a move. Verify the fetch body for `POST /api/evaluate-move` carries `confirmationCategory` (not `undefined`), and that the response's coach phrase matches the correct quality bucket.

**Acceptance Scenarios**:

1. **Given** a learner is in lesson mode (`lessonMode=true`, `confirmationCategory="immediate_threat"`, `category=undefined`), **When** they click a column, **Then** the evaluate-move request body contains `category: "immediate_threat"` (not `undefined`).
2. **Given** a learner plays an optimal move in a position the classifier does not recognise (`coachPhraseKey: null`, `quality: "optimal"`), **When** the evaluate-move response arrives, **Then** the coach displays a phrase from the `coach.generic.optimal.*` pool — never from `coach.generic.blunder.*`.
3. **Given** a learner plays a genuine blunder (`quality: "blunder"`), **When** the evaluate-move response arrives, **Then** the coach displays a phrase from `coach.generic.blunder.*` (existing pool, unchanged).

---

### User Story 2 — Sparring AI move commentary reflects board events (Priority: P2)

A player is in a sparring game. When the AI plays, the coach should say something grounded in what the AI actually did on the board — not a generic pool phrase or, worse, a "deliberate mistake" phrase for an optimal move.

**Why this priority**: Phase 2 depends on Phase 1's new generic pools. Once Phase 1 ships, Phase 2 delivers the board-grounded AI persona that is the heart of the epic's quality improvement.

**Independent Test**: Play several sparring games at hard/perfect difficulty. Verify that AI moves classified as `double_threat` produce phrases from `coach.ai_move.double_threat.*`, and that AI moves classified as suboptimal produce phrases from `coach.ai_move.suboptimal.*` — never pattern-specific phrases.

**Acceptance Scenarios**:

1. **Given** the AI plays an optimal `double_threat` move, **When** the board commits, **Then** the coach displays a phrase from `coach.ai_move.double_threat.*` and the mood is `'think'`.
2. **Given** the AI plays a suboptimal move (easy/medium difficulty deliberate mistake), **When** the board commits, **Then** the coach displays a phrase from `coach.ai_move.suboptimal.*` and the mood is `'oops'` — never a pattern-specific phrase.
3. **Given** the evaluate-move call fails (network error), **When** `commitAiMove` runs, **Then** the coach displays a phrase from `coach.ai_move.neutral.*` and mood is `'think'`.
4. **Given** `side === 'second'` and the AI plays the opening move automatically, **When** the board commits, **Then** the existing intro-replacement (`replace=true`) behaviour is preserved unchanged; no evaluate-move call is made for this move.

---

### User Story 3 — ExplorerScreen deep-reveal pane shows readable pattern label (Priority: P3)

A player reviewing a past game opens the Deep Reveal pane for a mistake. The timeout content line should show a human-readable pattern label (e.g., "immediate threat") drawn from the existing `mistakes.pattern.*` i18n namespace — not a raw tag string (`"immediate_threat"`) or a phrase from the now-removed `coach.sparring.user_move.generic.*` pool.

**Why this priority**: This is a display correctness fix in a secondary flow. It depends on Phase 2's removal of `coach.sparring.user_move.generic.*`.

**Independent Test**: In ExplorerScreen with a mistake that has `patternTag = "double_threat"`, open Deep Reveal. The timeout content line should read "double threat" (or the localised equivalent from `mistakes.pattern.double_threat`), not the raw string `"double_threat"`.

**Acceptance Scenarios**:

1. **Given** a mistake has `patternTag = "double_threat"`, **When** the Deep Reveal pane times out and renders `timeoutContent`, **Then** the label resolves via `t('mistakes.pattern.double_threat', 'double_threat')` — not via the non-existent `coach.categories.*` namespace.
2. **Given** a mistake has no `patternTag` (null), **When** the Deep Reveal pane renders `timeoutContent`, **Then** the label resolves via `t('coach.generic.suboptimal.0')` from the pool introduced in Phase 1.

---

### Edge Cases

- What happens when the evaluate-move API call for an AI move fails or times out? → neutral fallback (`coach.ai_move.neutral.*`), mood `'think'`. No error is surfaced to the user.
- What happens when an AI move's `patternTag` has no matching `coach.ai_move.<tag>.*` pool in `en.json`? → `pickRandomKey` returns `${prefix}.0` (the key itself, which renders as an empty or missing string). The neutral fallback fires in this case because the pool-existence check (`t(key) !== key`) fails. The spec relies on the fact that all 12 classifier tags have defined pools after Phase 2 ships.
- What happens for the error-fallback path in `makeAiMove` (random legal column when `/api/scores` fails)? → `commitAiMove` receives `null` classification → neutral fallback. This path is a pre-existing issue; the spec does not change its behaviour beyond giving it a sensible coach phrase.
- What happens when `quality` is absent from the evaluate-move response (unexpected server shape)? → `data.quality ?? 'blunder'` in the user-move fallback path ensures the blunder pool fires rather than a missing-key crash.
- Can Phase 2 ship without Phase 1? → No. Phase 2's user-move fallback references `coach.generic.optimal.*` and `coach.generic.suboptimal.*` pools introduced in Phase 1. Phase 1 must ship first.

---

## Requirements *(mandatory)*

### Functional Requirements — Phase 1 (Surgical Bug Fixes)

**FR-001**: In `ChallengeScreen.handleColumnClick`, the system MUST compute `effectiveCategory = lessonMode ? confirmationCategory : category` before the evaluate-move fetch and send `effectiveCategory` in the request body — not the raw `category` prop.

**FR-002**: In `ChallengeScreen.handleColumnClick`, when `data.coachPhraseKey` is null, the system MUST select the fallback pool based on `data.quality`:
- `'optimal'` → `coach.generic.optimal.*`
- `'suboptimal'` → `coach.generic.suboptimal.*`
- `'blunder'` → `coach.generic.blunder.*` (existing pool)

The current hardcoded `Math.floor(Math.random() * 6)` form MUST be replaced with `pickRandomKey`.

**FR-003**: The system MUST add the following i18n keys to `en.json` under `coach.generic`:

```
coach.generic.optimal.0    "Good move."
coach.generic.optimal.1    "Nice choice."
coach.generic.optimal.2    "That's the one."

coach.generic.suboptimal.0 "Not bad, but there was a sharper move."
coach.generic.suboptimal.1 "You're close — try to find the stronger option."
coach.generic.suboptimal.2 "Reasonable, but not the best here."
```

The existing `coach.generic.blunder.*` pool (6 keys, indices 0–5) MUST remain unchanged.

**FR-004**: The `pickRandomKey` helper MUST be accessible from `ChallengeScreen`. The plan phase decides whether to extract it to a shared utility module or duplicate it — both are acceptable. The spec does not mandate the extraction location.

---

### Functional Requirements — Phase 2 (Board-Grounded AI Coach)

**FR-005**: In `useGameBoard.makeAiMove`, after `aiCol` is determined and before calling `commitAiMove`, the system MUST call `POST /api/evaluate-move` with body `{ movestring: currentMoves.join(''), col: aiCol, aiMove: true }`. The `aiMove: true` flag signals the server to use the `classifyPattern` path (FR-005a). This call runs in parallel with the board commit. **Exception**: when `currentMoves.length === 0 && side === 'second'` (the opening auto-play intro path), the evaluate-move call MUST be skipped entirely. The existing intro-replacement coach message (`replace=true`) handles that move; no classification is needed.

**FR-005a** (Server — AI classify path): The `POST /api/evaluate-move` endpoint MUST, when `req.body.aiMove === true` in the request body (AI move path), call `await classifyPattern(postMoveMovestring, aiPlayerInt, solver)` instead of the synchronous `classify()`. When `aiMove` is absent or false (user-move path), the existing `classify()` call MUST run unchanged — this includes the sparring `handleColumnClick` path which sends `{ movestring, col }` with no `aiMove` field.

- `postMoveMovestring` is the request movestring with `col` appended (i.e., the board state after the AI's move lands).
- `aiPlayerInt` is `(movestring.length % 2) + 1` computed from the *pre-move* movestring (1 = Red, 2 = Yellow).
- `classifyPattern` returns a `Map` of matched tags. Apply the following priority ordering to select a single `patternTag`:
  `immediate_threat` > `double_threat` > `forced_win` > `forced_block` > `forbidden_columns` > `z_threat` > `odd_even_threat` > `claimeven` > `figure_7` > `j_shape` > `overcut` > `undercut` > `claimodd`
- If the map is empty, `patternTag` is `null`.
- `classifyPattern` is already imported in `server/index.js` and handles `forced_win` from the AI player's perspective correctly — no inversion fix needed.
- The extra solver query incurred by `classifyPattern` is accepted for now; batching/caching is deferred.

**FR-006**: `commitAiMove` MUST accept a classification argument (the result of the evaluate-move call, or `null` on failure). The argument shape is `{ quality, patternTag } | null`.

**FR-007**: In `commitAiMove`, the coach phrase MUST be selected by this quality-gated algorithm (in order):

1. If classification is `null` → `pickRandomKey(t, 'coach.ai_move.neutral')`, mood `'think'`
2. If `quality !== 'optimal'` → `pickRandomKey(t, 'coach.ai_move.suboptimal')`, mood `'oops'`
3. If `quality === 'optimal'` AND `patternTag` is non-null AND the pool `coach.ai_move.<patternTag>.*` exists → `pickRandomKey(t, 'coach.ai_move.<patternTag>')`, mood `'think'`
4. Otherwise → `pickRandomKey(t, 'coach.ai_move.neutral')`, mood `'think'`

**FR-008**: The `replace` flag (intro replacement when `side === 'second'` and `currentMoves.length === 0`) MUST be preserved unchanged.

**FR-009**: The opening auto-play move (`side === 'second'`, empty board) MUST NOT trigger an evaluate-move call. The existing intro path handles the coach message for this move.

**FR-010**: The `isDeliberate` flag MUST NOT drive i18n key selection after Phase 2 ships. It MAY be retained for dev-mode logging (`import.meta.env.DEV`) but must have no effect on the coach phrase selected.

**FR-011**: In `useGameBoard.handleColumnClick`, the non-blunder fallback (currently `pickRandomKey(t, 'coach.sparring.user_move.generic')`) MUST be replaced with `pickRandomKey(t, \`coach.generic.${data.quality ?? 'blunder'}\`)`.

**FR-012**: In `ExplorerScreen.jsx` `timeoutContent`:
- Line referencing `coach.categories.${patternTag}` MUST be changed to `t('mistakes.pattern.${patternTag}', patternTag)`.
- Line referencing `coach.sparring.user_move.generic.0` MUST be changed to `t('coach.generic.suboptimal.0')`.

**FR-013**: The following i18n keys MUST be removed from `en.json`:
- `coach.sparring.ai_move.{0,1,2}` (3 keys)
- `coach.sparring.deliberate_mistake.{0,1}` (2 keys)
- `coach.sparring.user_move.generic.{0,1,2}` (3 keys)

All references to these keys in `src/` MUST be removed before the keys are deleted.

**FR-014**: The following i18n keys MUST be added to `en.json` under `coach.ai_move`:

```
coach.ai_move.immediate_threat.0   "I can win right now."
coach.ai_move.immediate_threat.1   "That's game — connecting four."

coach.ai_move.forced_block.0       "I had to block that — you had a real threat there."
coach.ai_move.forced_block.1       "No choice but to defend. Nice pressure."

coach.ai_move.double_threat.0      "Sorry — I've created two threats at once. You can only block one."
coach.ai_move.double_threat.1      "Double threat. One of them will connect."

coach.ai_move.claimeven.0          "Claimeven working in my favor — I'm claiming below your even-row threat."
coach.ai_move.claimeven.1          "I'll take that even-row claim. Your threat is neutralized."

coach.ai_move.z_threat.0           "Z-threat activated — that odd-row square is mine now."
coach.ai_move.z_threat.1           "I've secured the parity chain. You'd need an even number of moves to stop me."

coach.ai_move.odd_even_threat.0    "Playing to the odd row — that's parity control on my side."
coach.ai_move.odd_even_threat.1    "Odd-row threat in place. Even rows won't save you."

coach.ai_move.forced_win.0         "I can force you to lose from here — let's see if you can find the escape."
coach.ai_move.forced_win.1         "The path is forced — find the escape if you can."

coach.ai_move.claimodd.0           "Breaking the claimeven lock — I'm anchoring on an odd row."
coach.ai_move.claimodd.1           "Claimodd. Your even-row strategy just lost its grip."

coach.ai_move.figure_7.0           "Figure-7 trap set — two threats you can't both stop."
coach.ai_move.figure_7.1           "I've completed the Figure-7. Two threats incoming."

coach.ai_move.j_shape.0            "J-Shape in place — I'm threatening in three directions now."
coach.ai_move.j_shape.1            "Three simultaneous threats. You can block one, maybe two."

coach.ai_move.overcut.0            "Overcut — my upper threat beats yours in this column."
coach.ai_move.overcut.1            "Same parity, upper wins. Your lower threat is dead."

coach.ai_move.undercut.0           "Undercut. Gravity fills bottom-up — your upper threat can't reach first."
coach.ai_move.undercut.1           "I'm taking the lower threat. Yours is blocked by my disc now."

coach.ai_move.suboptimal.0         "I might have missed something there — see if you can take advantage."
coach.ai_move.suboptimal.1         "Not my sharpest move. There may be an opportunity for you."
coach.ai_move.suboptimal.2         "I gave you something — find it."

coach.ai_move.neutral.0            "I'll take that square."
coach.ai_move.neutral.1            "Setting up my position."
coach.ai_move.neutral.2            "Let's see how this develops."
```

---

### Out of Scope

- `es.json` (Spanish) translation updates — localisation is a separate task.
- AI move commentary during `forced_win` sequence opponent response moves (`outcome === 'continue'` in `handleSequenceClick`) — this path shows no coach message today and is unchanged.
- Coach commentary for `forbidden_columns` AI moves — there are no AI moves in that puzzle type.
- Batching or caching the evaluate-move call for AI moves — performance optimisation deferred to the plan phase.
- `coach.sparring.hint.generic.*` — content is context-neutral; retained unchanged.
- `coach.sparring.explorer.intro.*` — content is context-appropriate for exploration; retained unchanged.
- `coach.sparring.review.*` — server-selected key returned by `GET /api/games/:id/analyze`; not part of the in-game coach message system; retained unchanged.
- Changes to existing `coach.<category>.prompt.*`, `coach.<category>.hint.*`, and `coach.<category>.<quality>.*` pools — those are correct.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

**SC-001 (Phase 1 — Bug 1)**: In lesson mode, 100% of evaluate-move requests carry the lesson's `confirmationCategory` value in the request body. Zero requests carry `undefined` as the category. Verifiable by inspecting request payloads.

**SC-002 (Phase 1 — Bug 2)**: An optimal move in a position the classifier does not recognise never produces a phrase from `coach.generic.blunder.*`. Verifiable by mocking a response with `coachPhraseKey: null, quality: 'optimal'` and asserting the displayed phrase key prefix.

**SC-003 (Phase 1 — Regression)**: A genuine blunder move (`quality: 'blunder'`) continues to produce a phrase from `coach.generic.blunder.*`. Existing behaviour is preserved.

**SC-004 (Phase 2 — Pool removal)**: Zero references to `coach.sparring.ai_move`, `coach.sparring.deliberate_mistake`, or `coach.sparring.user_move.generic` remain in `connect-four/src/`. Verifiable with `rg 'coach\.sparring\.(ai_move|deliberate_mistake|user_move\.generic)' connect-four/src/`.

**SC-005 (Phase 2 — Pattern specificity)**: On hard/perfect difficulty, AI moves classified as an optimal `double_threat` produce a phrase from `coach.ai_move.double_threat.*`. AI moves rated as suboptimal or blunder produce a phrase from `coach.ai_move.suboptimal.*` — never a pattern-specific phrase.

**SC-006 (Phase 2 — Neutral fallback)**: When the evaluate-move call for an AI move fails, the coach displays a phrase from `coach.ai_move.neutral.*`. No error is surfaced to the user.

**SC-007 (Phase 2 — ExplorerScreen)**: In the Deep Reveal pane, the `timeoutContent` label resolves to the human-readable pattern name from `mistakes.pattern.*` when `patternTag` is present, and to a suboptimal-fallback phrase when `patternTag` is absent. Neither `coach.categories.*` nor `coach.sparring.user_move.generic.*` keys are referenced.

---

## Assumptions

- The `POST /api/evaluate-move` endpoint already accepts requests with an `aiMove: true` flag and returns `{ quality, patternTag }` in its response. **Server changes are required for Phase 2**: the AI-move path (gated on `aiMove === true`) must call `classifyPattern()` instead of `classify()` (see FR-005a). The endpoint response shape is unchanged; only the server-side classifier call changes.
- `pickRandomKey` in `useGameBoard.js` already has the correct pool-existence probe logic (`t(key) !== key`). It can be used as-is once made accessible to `ChallengeScreen`.
- Phase 1 ships before Phase 2. Phase 2's user-move fallback in `useGameBoard.handleColumnClick` depends on `coach.generic.optimal.*` and `coach.generic.suboptimal.*` introduced in Phase 1.
- Pattern-specific AI phrases (`coach.ai_move.<tag>.*`) will only fire in practice for hard/perfect difficulty games, because easy/medium difficulty produces deliberate suboptimal moves that route to `coach.ai_move.suboptimal.*`. This is intentional and pedagogically correct.
- The double evaluate-move load per AI turn (one for `/api/scores` column selection, one for `/api/evaluate-move` classification) is acceptable at current user scale. Batching or caching is deferred.
- All 12 classifier tag slugs (`immediate_threat`, `forced_block`, `double_threat`, `claimeven`, `z_threat`, `odd_even_threat`, `forced_win`, `claimodd`, `figure_7`, `j_shape`, `overcut`, `undercut`) will have populated `coach.ai_move.<tag>.*` pools after Phase 2 ships. No missing-pool fallback is needed at runtime beyond the neutral path.
