# Feature Specification: Patterns → Blunders Epic 3 — Coach Explanation Rebuild

**Feature Branch**: `025-patterns-blunders-epic3`
**Created**: 2026-06-08
**Status**: Draft
**Depends on**: Epic 2 (`specs/024-patterns-blunders-epic2`) — `tagBlunder` must be wired and producing non-null `reason`/`direction` on stored blunder rows before this epic begins.

---

## Context and Goal

Epic 2 wired `tagBlunder` into all production write paths. Epic 3 uses that structured output (`{tag, reason, direction}`) to replace the simulation-based LLM grounding in `buildExplainContext`. The `explainSimulate`-based type1/2/3/4 dispatch is removed and replaced by a unified two-sided grounding: `tagBlunder` describes what went wrong, and `classifyPattern` describes what the best move achieves.

After this epic there are exactly two classification APIs:
- `classifyPattern(ms, perspective, solver)` — board-level pattern detection, returns `Map<string, {cells: string[]}>`.
- `tagBlunder(moves, playedCol, correctCol, solver)` — blunder analysis and coach grounding.

`explainSimulate.js` is deleted. `classifyAll` is removed from `classifier.js` after all callers are adapted.

**Source of truth**: `docs/mvp/patterns_blunders_challenges.md` (three-layer model, API contracts). Where this spec conflicts with that document, that document wins.

---

## Settled decisions (carry forward — do not re-derive)

- **Storage gate is independent of tagging.** `tagBlunder` runs after `scoreMove()` confirms a blunder; whether a named pattern matches does not affect whether the row is stored.
- **Tag describes the situation, not the cure.** A blunder is tagged with the pattern the player *was in or created*, not with what the correct move builds afterward.
- **`unknown` is not a valid tag.** Any unmatched blunder falls through to `suboptimal_move`.
- **`tagBlunder` never throws.** All failures resolve to `{ tag: 'suboptimal_move', direction: 'missed_own', reason: 'solver error: ...' }`.
- **Anon write prohibition.** `blunders.user_id` is `NOT NULL`. The INSERT skip for unauthenticated requests matches this constraint.
- **Non-challenge tags are stored.** `forced_win`, `drawing_move`, and `suboptimal_move` are stored in `blunders`. They are excluded from challenge-set matching only.
- **`forced_win` tag ≠ `forced_win` puzzle category.** The blunder tag means "solver confirmed the player had a forced win." The puzzle category labels a multi-move learner exercise.
- **i18n entries for all tags are already present** in `en.json`. No i18n work required.
- **`explanation_cache` no-invalidation policy.** Old cached entries remain valid. Users see the explanation text, not the prompt. Only a nullable `template_version` column is added to let operators identify old-format entries.
- **`tagBlunder` terse reason strings are not modified.** `blunders.reason` continues to store `"matched missed_own: double_threat"` style strings. `REASON_TEMPLATES` enrichment happens only inside the prompt builder.
- **`validateAnnotation` gate (spec 021) is retained unchanged.** Only the data fed into it changes.
- **`classifyPattern` signature change is pre-audited.** Every direct caller of `classifyPattern` must be adapted to the `Map` return type before the change ships; `tagBlunder`'s internal `P()` helper must also be adapted (see FR-006).

---

## Pre-implementation audits (required before writing any code)

These audits must be completed and documented before implementing any requirement:

- **Audit A**: `rg explainSimulate connect-four/server/` — enumerate all callers and exactly what they consume from the result (`groups`, `topGroups`, `patterns`, etc.). These are all removal candidates.
- **Audit B**: `rg classifyAll connect-four/server/` — enumerate all callers and document the replacement plan for each. Confirmed callers: `server/index.js` debug endpoint (~line 2055), `server/scripts/classify_all.mjs`, `explainSimulate.js`.
- **Audit C**: `rg classifyPattern connect-four/server/` — enumerate every direct caller. Critical because the return-type change from `Set<string>` to `Map<string, {cells: string[]}>` silently breaks any caller using set-membership operations. All callers must be adapted before the signature change ships.
- **Audit D**: Read `buildExplainContext` in `server/index.js` top-to-bottom. Document the four explanation types (type1/2/3/4), the `allowedSet` construction path for each, and which functions are called exclusively from within it. Those functions are removal candidates.
- **Audit E** (detector cell shapes): For every `detect*` function in `classifier.js`, read its actual return value and record the output shape (`{ matched }`, `{ matched, cols }`, `{ matched, correctCol }`, etc.). Derive the correct `cells` mapping for FR-005 before writing any code. Two known-correct findings that the audit must confirm: (a) `detectImmediateThreat` and `detectDoubleThreat` return `{ matched, cols }` — column indices only, not window coordinates — so `cells` must be derived by mapping each column index to its landing-row cell; (b) `detectForcedWin` is solver-score based with no spatial output — it must emit empty `cells` (ABSTRACT-ONLY). All remaining detectors must be audited before implementing FR-005.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Blunder Explanation Is Grounded in the Tagged Pattern (Priority: P1)

A player requests a Deep Reveal explanation after making a blunder in a sparring game. The explanation names the tactical pattern the player missed or enabled (e.g., "You had a forced win and let it slip"), rather than a simulation-derived summary. The explanation passes the annotation gate (P1–P6 constraints from spec 021) and cites specific board cells that the `classifyPattern` output identified.

**Why this priority**: This is the north star of the epic. Without it, the coach explanation has no verifiable connection to the tagged blunder — the LLM's grounding remains simulation-based and opaque.

**Independent Test**: Call `POST /api/explain-move-llm` on a position where `tagBlunder` returns a known tag (e.g., `double_threat`). Verify the returned explanation text contains a sentence matching the `REASON_TEMPLATES` entry for `double_threat:missed_own` and that `validateAnnotation` passes.

**Acceptance Scenarios**:

1. **Given** a blunder position where `tagBlunder` returns `{ tag: 'double_threat', direction: 'missed_own', reason: 'matched missed_own: double_threat' }`, **When** `POST /api/explain-move-llm` is called, **Then** the returned explanation contains a human-readable sentence from `REASON_TEMPLATES` (not the terse reason string) and passes `validateAnnotation`.
2. **Given** a blunder position where `tagBlunder` returns `{ tag: 'forced_block', direction: 'defensive_miss', ... }`, **When** `POST /api/explain-move-llm` is called, **Then** the explanation reflects the defensive-miss framing and passes `validateAnnotation`.
3. **Given** a blunder position of any tag, **When** the explanation is generated, **Then** `blunders.reason` in the DB still stores the terse string (e.g., `"matched missed_own: double_threat"`), not the human-readable sentence from `REASON_TEMPLATES`.

---

### User Story 2 — Optimal-Move Explanation Works Without tagBlunder (Priority: P1)

A player requests a Deep Reveal explanation for a move they played that was already the best move. The explanation frames the move positively ("this is good because X") using `classifyPattern` on the post-move board. `tagBlunder` is not called on this path.

**Why this priority**: Equal priority with P1 — the optimal-move path is called whenever `DeepRevealButton` sends `col == bestCol`. If it crashes or skips `validateAnnotation`, the feature is broken for half its call volume.

**Independent Test**: Call `POST /api/explain-move-llm` with `col` equal to the known best move for a verified position. Verify the response is non-null, passes `validateAnnotation`, and the server logs show no `tagBlunder` invocation.

**Acceptance Scenarios**:

1. **Given** a position where `col == bestCol`, **When** `POST /api/explain-move-llm` is called, **Then** `tagBlunder` is NOT called (verifiable via server logs or test spy), the prompt is built using `classifyPattern` output only, and the explanation passes `validateAnnotation`.
2. **Given** a position where `col == bestCol` and `classifyPattern` returns an empty Map (no patterns), **When** the explanation is generated, **Then** the prompt still constructs a valid response (graceful empty-pattern case) and does not crash.

---

### User Story 3 — `explainSimulate.js` and `classifyAll` Are Removed (Priority: P2)

After this epic ships, the codebase contains exactly two classification APIs. `explainSimulate.js` is deleted and `classifyAll` is removed from `classifier.js`. The `/api/debug/classify-all` endpoint and `scripts/classify_all.mjs` are updated to use `classifyPattern` with both perspectives.

**Why this priority**: This is the consolidation goal stated in the epic description. It matters for codebase hygiene and correctness (no one accidentally calls the old simulation path), but the user-facing explanation behavior is the higher priority.

**Independent Test**: After implementation, `rg explainSimulate connect-four/server/` returns zero hits and `rg classifyAll connect-four/server/` returns zero hits. The debug endpoint `/api/debug/classify-all` returns `{ red: [...], yellow: [...] }` shaped output.

**Acceptance Scenarios**:

1. **Given** the `buildExplainContext` rework is complete, **When** `rg explainSimulate connect-four/server/` is run, **Then** zero hits are returned (file deleted).
2. **Given** all `classifyAll` callers have been adapted, **When** `rg classifyAll connect-four/server/` is run in the main source tree, **Then** zero hits are returned.
3. **Given** the debug endpoint `/api/debug/classify-all` is called with a valid movestring, **When** the request is processed, **Then** the response contains `{ red: [...tags], yellow: [...tags] }` — two perspective sets derived from `classifyPattern`.

---

### User Story 4 — `REASON_TEMPLATES` Covers Every Tag-Direction Pair (Priority: P2)

The `REASON_TEMPLATES` map in `server/blunderReasons.js` has an entry for every `{tag, direction}` pair that `tagBlunder` can return. If a pair is missing, the prompt builder silently inserts `undefined`, producing a broken LLM prompt. A snapshot unit test guards against accidental deletions.

**Why this priority**: Correctness insurance. Without it, a new tag or direction added to `tagBlunder` silently produces broken prompts in production.

**Independent Test**: The unit test `REASON_TEMPLATES covers all {tag, direction} pairs` passes with snapshot assertions for all 23 entries listed in FR-002.

**Acceptance Scenarios**:

1. **Given** the `REASON_TEMPLATES` map in `server/blunderReasons.js`, **When** the unit test runs, **Then** all 23 `{tag, direction}` entries listed in FR-002 resolve to non-empty strings (snapshot assertion).
2. **Given** `tagBlunder` returns `{ tag: 'drawing_move', direction: 'missed_own' }`, **When** `REASON_TEMPLATES.get('drawing_move:missed_own')` is called, **Then** the result is `"You had a win available and settled for a draw."` (not `undefined`).

---

### User Story 5 — `explanation_cache` Rows Track Template Version (Priority: P3)

New explanation rows written after this epic have `template_version = 'v2'`. Old rows retain `NULL`. This lets operators identify old-format entries for optional purging without forced invalidation.

**Why this priority**: Operational observability — low urgency but important for future cache management. Old cached entries continue to work; the column is purely additive.

**Independent Test**: After deployment, insert a new explanation via `POST /api/explain-move-llm` and query `explanation_cache` for the row. Verify `template_version = 'v2'`.

**Acceptance Scenarios**:

1. **Given** a new LLM explanation is generated and cached, **When** the row is queried from `explanation_cache`, **Then** `template_version = 'v2'` is present.
2. **Given** an existing cached row (from before this migration), **When** queried, **Then** `template_version` is `NULL` (no backfill).

---

### Edge Cases

- What happens when `classifyPattern` returns an empty Map (no patterns matched) for both the played and best-move positions? No Tier 1 or Tier 2 entries exist, so `allowedSet = null` is passed to `validateAnnotation`, which skips the P5strong check. The prompt builder must handle `null` allowedSet and empty `correctMovePatterns` gracefully, falling back to generic framing. Passing `[]` would be wrong — it would fail every `tg` zone on P5strong.
- What happens when `classifyPattern` returns only Tier 3 patterns (e.g., only `forced_win` matched) across all calls? Same as empty Map: pass `allowedSet = null` to `validateAnnotation`. The explanation is generated without concrete cell references.
- What happens when `tagBlunder` returns `suboptimal_move` (no named pattern)? `REASON_TEMPLATES.get('suboptimal_move:missed_own')` must return a valid sentence; the prompt builder must not crash.
- What happens when `REASON_TEMPLATES` has no entry for a `{tag, direction}` combination? The prompt builder must fall back to a generic sentence (e.g., `"A stronger move was available."`) rather than inserting `undefined`.
- What happens when `DETECTOR_REGISTRY` in `explainSimulate.js` is deleted along with the file? The `classifyPattern` inline detector list becomes the sole registry. The implementor must verify parity before deletion.
- What happens when the P() adaptation in `tagBlunder` ships without updating all other `classifyPattern` callers? Any caller still expecting `Set<string>` will receive a `Map` and silently fail. The pre-implementation Audit C ensures all callers are updated atomically.
- What happens when a `classifyPattern` detector returns an empty `cells` array for a matched pattern? If it is Tier 2 (z_threat), `buildExplainContext` derives the column anchor independently from `board.colHeights`. If it is Tier 3 (forced_win etc.), the pattern contributes only to template lookup, not to `allowedSet`.
- What happens if `selectContrastMove` returns `null` (all legal moves equal)? `buildExplainContext` already returns early in this case. This behavior is retained unchanged.

---

## Requirements *(mandatory)*

### Functional Requirements

**Pre-implementation audits (must run before writing code):**

- **FR-000a**: Run Audit A (`rg explainSimulate connect-four/server/`) and document every caller plus what fields it consumes from the result. This is the removal surface.
- **FR-000b**: Run Audit B (`rg classifyAll connect-four/server/`) and document every caller plus the replacement plan (classifyPattern with both perspectives, or deleted with file).
- **FR-000c**: Run Audit C (`rg classifyPattern connect-four/server/`) and enumerate every direct caller. Every caller must be adapted to `Map<string, {cells: string[]}>` before the signature change ships.
- **FR-000d**: Read `buildExplainContext` (`server/index.js`) top-to-bottom and document the type1/2/3/4 dispatch plus which helper functions are exclusively called from within it.
- **FR-000e**: Run Audit E (see Pre-implementation audits section above): read every `detect*` function in `classifier.js` and record its actual return shape. Produce a per-detector mapping plan for FR-005 before writing any `cells` derivation code.

**`server/blunderReasons.js` — new module:**

- **FR-001**: Create `connect-four/server/blunderReasons.js` exporting `REASON_TEMPLATES` as a `Map<string, string>` keyed by `"${tag}:${direction}"`.
- **FR-002**: `REASON_TEMPLATES` MUST contain exactly the following 23 entries (key → sentence):

  | Key | Sentence |
  |---|---|
  | `immediate_threat:missed_own` | "You had a winning move right there and didn't take it." |
  | `immediate_threat:enabled_opponent` | "That move handed your opponent an immediate win." |
  | `forced_block:defensive_miss` | "Your opponent was about to win. You had to block and didn't." |
  | `forced_win:missed_own` | "You had a forced win and let it slip." |
  | `forced_win:enabled_opponent` | "Your move handed your opponent a forced win." |
  | `double_threat:missed_own` | "You could have built a double threat — two winning columns at once — and missed it." |
  | `double_threat:enabled_opponent` | "Your move let your opponent set up two winning threats at once." |
  | `undercut:enabled_opponent` | "Your move let your opponent undercut your threat — their lower disc now kills your win." |
  | `overcut:missed_own` | "You had an overcut — a column where your lower disc neutralizes their upper threat — and didn't play it." |
  | `figure_7:missed_own` | "You had a Figure-7 fork structure and didn't complete it." |
  | `figure_7:enabled_opponent` | "You let your opponent build a Figure-7 fork you can't answer." |
  | `j_shape:missed_own` | "You had a J-shape trap available and didn't use it." |
  | `j_shape:enabled_opponent` | "You let your opponent build a J-shape trap." |
  | `z_threat:missed_own` | "You had the parity advantage — an odd vertical capsule — and abandoned it." |
  | `z_threat:enabled_opponent` | "Your move handed your opponent the parity advantage." |
  | `odd_even_threat:missed_own` | "You had threats on both row parities — a fork neither player can fully answer — and let it go." |
  | `odd_even_threat:enabled_opponent` | "Your move gave Red threats on both row parities." |
  | `claimeven:missed_own` | "You had a claimeven endgame — the pairing was yours — and threw it away." |
  | `claimeven:enabled_opponent` | "You gave Yellow a claimeven endgame — they now control the pairing." |
  | `claimodd:missed_own` | "You had the claimodd control — all even columns, center command — and lost it." |
  | `claimodd:enabled_opponent` | "Your move gave Red the claimodd endgame control." |
  | `drawing_move:missed_own` | "You had a win available and settled for a draw." |
  | `suboptimal_move:missed_own` | "There was a stronger move — this one gives ground." |

- **FR-003**: `REASON_TEMPLATES` is applied only inside the prompt builder. It is imported by `buildBlunderExplainPrompt` in `llmCoachHelpers.js`. It is NOT imported by `tagBlunder` and does NOT affect the `reason` string stored in `blunders.reason`.
- **FR-003a**: If `REASON_TEMPLATES.get(key)` returns `undefined` for a given `{tag, direction}`, the prompt builder MUST substitute a generic fallback sentence (e.g., `"A stronger move was available."`) rather than inserting `undefined` into the prompt.
- **FR-003b**: Create `POSITIVE_TEMPLATES` as a second `Map<string, string>` in `server/blunderReasons.js`, exported alongside `REASON_TEMPLATES`. Keys are tag names (no direction suffix). Each value is a "this is strong because…" sentence used on the optimal-move path. Required entries:

  | Key | Sentence |
  |---|---|
  | `immediate_threat` | "You spotted the immediate win and took it — the clearest winning move available." |
  | `forced_win` | "This move locks in a forced win — your opponent has no escape." |
  | `double_threat` | "You built two threats at once, giving your opponent an impossible choice." |
  | `undercut` | "Well played — you placed below their threat, neutralizing it while building your own." |
  | `overcut` | "You used the overcut — your lower disc sidesteps their upper threat entirely." |
  | `figure_7` | "You completed a Figure-7 fork — your opponent can't answer both wings." |
  | `j_shape` | "You set the J-shape trap — a threat structure your opponent can't unravel." |
  | `z_threat` | "You secured the parity advantage — an odd vertical capsule that forces the endgame." |
  | `odd_even_threat` | "You built threats on both row parities, creating a fork the opponent can't fully answer." |
  | `claimeven` | "You locked in the claimeven endgame — the pairing of empty cells is now yours." |
  | `claimodd` | "You claimed the claimodd endgame control — center column, even parity, commanding position." |
  | `drawing_move` | "You found the drawing resource — the only move that prevents a loss." |

  If `POSITIVE_TEMPLATES.get(tag)` returns `undefined` (e.g., for `suboptimal_move` on a technically-optimal move that simply didn't match a named pattern), the prompt builder MUST use the generic fallback `"This was the strongest move available."`.

**`classifyPattern` return-type extension:**

- **FR-004**: Extend `classifyPattern(ms, perspective, solver)` to return `Promise<Map<string, { cells: string[] }>>` instead of `Promise<Set<string>>`. Each key is a matched tag; each value contains a `cells` array of wire-format cell coordinates (e.g., `["c3r2","c4r2","c5r2","c6r2"]`).
- **FR-005**: Every `detect*` function that currently returns `{ matched: boolean }`, `{ matched, cols }`, or `{ matched, correctCol }` MUST be extended to also return `{ cells: string[] }` when `matched` is `true`. Cell derivation rules MUST be determined by Audit E (FR-000e) — do not assume a detector's output shape without reading its code first. Known-correct rules established by the audit:
  - `detectImmediateThreat` and `detectDoubleThreat` return `{ matched, cols }` (column indices only). Map each column index to its landing-row cell: `"c{col+1}r{colHeights[col]+1}"`.
  - `detectForcedWin`, `detectForcedBlock`, `detectForbiddenColumns`, `detectOddEvenThreat`, `detectClaimeven` are solver-score or simulation-based with no spatial output. These MUST emit empty `cells` (POSITION-GLOBAL). Do not attempt to map solver output to board coordinates. They contribute only to template lookup and never appear in `allowedSet`.
  - `detectZThreat` emits empty `cells`. The odd-parity capsule column is NOT returned by the detector; it is derived in `buildExplainContext` directly from `board.colHeights` when `z_threat` is a matched tag (see FR-008).
  - `detectClaimodd` returns `{ matched, correctCol }`. Map to landing cell: `"c{correctCol+1}r{colHeights[correctCol]+1}"`. This is CONCRETE-ELIGIBLE.
  - For `detectUndercut`, `detectOvercut`, `detectFigure7`, `detectJShape`: map `highlightMetadata.cells` to wire-format strings.
  - When `matched` is `false`, `cells` MUST be `[]` (never undefined or absent).
- **FR-005a**: The existing `classify()` puzzle-generation path MUST NOT be modified. `classify()` calls detectors differently (per-candidate-column, not perspective-based) and is not affected by this change.
- **FR-006**: `tagBlunder`'s internal `P()` helper MUST be adapted as follows:
  ```js
  const P = async (ms, player) => new Set((await classifyPattern(ms, player, solver)).keys())
  ```
  This preserves the set-membership semantics (`∈`, `∉`, `∪`) used across all five cascade steps while consuming the new Map return type. The adaptation MUST ship in the same commit as the `classifyPattern` signature change.
- **FR-006a**: A regression test MUST verify that the `tagBlunder` cascade resolves identically before and after the `P()` adaptation on a known blunder movestring sourced from the DB or codebase — never invented by hand (see `feedback_no_random_boards.md`).
- **FR-007**: Every other direct caller of `classifyPattern` identified in Audit C MUST be adapted to the `Map` return type before or in the same commit as the signature change. No caller may use `Set` methods (`.has`, `.forEach`, `for...of`) directly on the `Map` without wrapping via `new Set(result.keys())` or iterating via `result.entries()`.

**`buildExplainContext` rework:**

- **FR-008**: Replace the type1/2/3/4 dispatch inside `buildExplainContext` with a unified two-sided grounding. The new flow:
  1. Compute `preScores`, `isSettled`, `contrast`, `gap/gapBucket/inverted` as before (unchanged).
  2. Determine `bestCol = contrastCol` when the user's move was suboptimal; `bestCol = col` when optimal (i.e., `inverted == true`).
  3. **Blunder path** (`col ≠ bestCol`, `inverted == false`):
     - Call `tagBlunder(movestring, col, bestCol, solver)` → `{tag, reason, direction}`.
     - Look up `humanReason = REASON_TEMPLATES.get(`${tag}:${direction}`) ?? fallback`.
     - Call `classifyPattern(movestring + bestCol, perspective, solver)` → correct-move patterns Map.
  4. **Optimal path** (`col == bestCol`, `inverted == true`):
     - Do NOT call `tagBlunder`.
     - Call `classifyPattern(movestring + col, perspective, solver)` → patterns after the best move.
     - `tag`, `direction`, `humanReason` are `null`.
  5. **`allowedSet` derivation**: The base union always includes:
     - `classifyPattern(movestring, perspective, solver)` — patterns at the played position (blunderer's view).
     - `classifyPattern(movestring + bestCol, perspective, solver)` — patterns after best move (blunderer's view).
     Additionally, apply direction-specific augmentations:
     - **`enabled_opponent` direction**: compute `oppBestCol` = the top-scoring column from solver scores on `movestring + playedCol` (the opponent's best response after the blunder). Add cells from `classifyPattern(movestring + playedCol + oppBestCol, opponentPerspective, solver)`. This captures the opponent-side pattern that the blunder enabled.
     - **`defensive_miss` direction**: Add cells from `classifyPattern(movestring, opponentPerspective, solver)` restricted to the `forced_block` and `immediate_threat` entries. This captures the opponent threat the blunderer failed to block.
     - All other directions: no additional calls beyond the base union.
     Each Map entry is classified by tier and emitted as follows:
     - **Tier 1** (non-empty `cells`): emit as CONCRETE-ELIGIBLE `{ cells, zoneSpec: 'tg' }`.
     - **Tier 2** (tag == `z_threat`, `cells` is empty): derive the odd-parity capsule column from `board.colHeights` (the column `c` where `(board.height - board.colHeights[c]) % 2 === 1`) and emit ABSTRACT-ONLY `{ col: capsuleCol, parity: 'odd', zoneSpec: 'tg' }`. If no odd-parity column exists, treat `z_threat` as Tier 3 for this position.
     - **Tier 3** (position-global: `forced_win`, `forced_block`, `forbidden_columns`, `odd_even_threat`, `claimeven`): not added to `allowedSet`. Used only for `humanReason`/`positiveReason` template lookup.
     **`allowedSet` null rule**: If no Tier 1 or Tier 2 entry exists across all `classifyPattern` calls (all matched patterns are Tier 3, or no patterns matched), pass `allowedSet = null` (not `[]`) to `validateAnnotation`. `validateAnnotation` called with `null` skips the P5strong check entirely; called with `[]` it fails every `tg` zone on P5strong. If at least one Tier 1 or Tier 2 entry exists, pass the assembled array normally.
  6. Build board visualizations (unchanged).
  7. Call `buildBlunderExplainPrompt(...)` with the assembled context.
  8. Return `{ prompt, allowedSet }`.

- **FR-009**: The following are REMOVED from `buildExplainContext` and `llmCoachHelpers.js` after this rework:
  - `classifyExplanationType` and its four-branch dispatch.
  - Both `explainSimulate` calls (the parallel `Promise.all` invocations).
  - `selectTopGroups`, `buildAllowedSet`, `buildType1AllowedSet`.
  - `buildType12Prompt`, `buildType3Prompt`, `buildType4Prompt`.
  These functions may not be deleted until `buildExplainContext` is fully reworked and tested.

- **FR-010**: The following are RETAINED UNCHANGED:
  - `getBoardVisualization`.
  - `selectContrastMove` (and its early-return behavior when it returns `null`).
  - `checkAllMovesEqual` (and its early-return behavior when `isSettled == true`).
  - `getGapAndFraming`.
  - The `validateAnnotation` gate and all P1–P6 checks (spec 021).
  - LLM model selection, retry logic, quota gate, fallback path in `POST /api/explain-move-llm`.
  - `getOpponentResponseMs` — retained in `llmCoachHelpers.js` as it may be used elsewhere; the implementor must verify with `rg getOpponentResponseMs` before deleting.

**`buildBlunderExplainPrompt` — new unified prompt builder:**

- **FR-011**: Add `buildBlunderExplainPrompt({ tag, direction, humanReason, positiveReason, correctMovePatterns, boardViz, postBoardViz, playerName, gap, gapBucket, allowedSet })` to `connect-four/server/llmCoachHelpers.js`. On the blunder path `humanReason` is non-null and `positiveReason` is null; on the optimal-move path the reverse applies.
- **FR-012**: For the blunder path (`tag` and `direction` non-null): the prompt MUST include `humanReason` as a human-readable sentence explaining what went wrong. The terse `reason` string from `tagBlunder` (e.g., `"matched missed_own: double_threat"`) MUST NOT appear in the prompt.
- **FR-013**: For the optimal-move path (`tag` and `direction` are `null`): the prompt MUST frame the move positively using `correctMovePatterns` (the tags from `classifyPattern` after the best move). Select the single highest-priority matched tag using the same priority cascade as `tagBlunder` (i.e., `forced_win` > `double_threat` > `immediate_threat` > `undercut` > `overcut` > `figure_7` > `j_shape` > `z_threat` > `odd_even_threat` > `claimeven` > `claimodd` > `drawing_move` > `suboptimal_move`), look up that tag's sentence in `POSITIVE_TEMPLATES`, and use it as `positiveReason`. Map ordering (detector-registry order) MUST NOT be used for selection — only the explicit cascade ordering above applies. Use the generic fallback `"This was the strongest move available."` when no matched tag has a `POSITIVE_TEMPLATES` entry, or when `correctMovePatterns` is empty. The framing must not reference a blunder.
- **FR-014**: The prompt MUST preserve the P1–P6 annotation constraints from spec 021. The `allowedSet` is passed to `validateAnnotation` as before. The hard grounding rules section in the prompt (listing cells the LLM may reference) must use the `allowedSet` entries exactly as it did previously.
- **FR-015**: Solver scores MUST NOT appear in the prompt (existing invariant, enforced by all prompt builders).

**`explanation_cache` migration:**

- **FR-016**: Create a new SQL migration file in `connect-four/server/migrations/` (next available number) with:
  ```sql
  ALTER TABLE explanation_cache ADD COLUMN IF NOT EXISTS template_version TEXT;
  ```
  No data backfill. No `DEFAULT` clause — old rows stay NULL; new rows are written explicitly by the server.
- **FR-017**: The `POST /api/explain-move-llm` endpoint MUST set `template_version = 'v2'` on all new rows inserted into `explanation_cache` after this migration is applied. Old cached rows with `template_version IS NULL` remain valid and are served as-is.

**`explainSimulate.js` removal:**

- **FR-018**: After `buildExplainContext` is fully reworked (FR-008), ALL of the following MUST be performed before `explainSimulate.js` is deleted:
  1. Delete the four CLI scripts that import `explainSimulate`: `server/scripts/review_feedback.mjs`, `server/scripts/explain_move.mjs`, `server/scripts/explain_simulate.mjs`, `server/scripts/recommend_next_move.mjs`. These are dead code on the current branch (`101-new-design`) — their functions have been superseded.
  2. Delete the `/api/recommend-move` endpoint block from `server/index.js`. This endpoint calls `explainSimulate` directly; it is dead because `RecommendCoach.jsx` is only used in the old `HomePage.jsx` sparring flow, which no longer runs on this branch (sparring now uses `GameScreen.jsx`).
  3. Delete `src/pages/HomePage.jsx` (the entire file — it is unrouted dead code on this branch) and `src/components/RecommendCoach.jsx` (its only consumer). Do not surgically edit; delete both files outright.
  4. Re-run `rg explainSimulate connect-four/` to confirm zero callers remain.
  5. Delete `connect-four/server/explainSimulate.js` and `connect-four/server/explainSimulate.test.js`.
- **FR-019**: Before deletion, `DETECTOR_REGISTRY` from `explainSimulate.js` MUST be reconciled. `classifyPattern` currently maintains its own inline detector list documented as "kept in sync with `DETECTOR_REGISTRY` in `explainSimulate.js`" (see `server-conventions.md`). After deletion, `classifyPattern`'s inline list becomes the sole registry. The implementor MUST verify the two lists are identical before deleting the file.

**`classifyAll` removal:**

- **FR-020**: Replace the `classifyAll` call in the `/api/debug/classify-all` endpoint with two `classifyPattern` calls — one with `perspective = 1` (Red) and one with `perspective = 2` (Yellow). The response shape MUST become `{ red: [...tags], yellow: [...tags], boardState, scores }` where `red` and `yellow` are `string[]` arrays of matched tag names derived from `new Set(result.keys())` on each `classifyPattern` result.
- **FR-021**: Replace `server/scripts/classify_all.mjs` with an updated script that calls `classifyPattern(ms, 1, solver)` and `classifyPattern(ms, 2, solver)` per position, printing both perspective tag sets. The script must import `classifyPattern` from `classifier.js`.
- **FR-022**: After FR-020 and FR-021 are applied, re-run `rg classifyAll connect-four/server/` to confirm zero hits in the main source tree. Then delete `classifyAll` from `classifier.js`. If hits remain (unexpected caller), document them and do NOT delete until resolved.

**Tests:**

- **FR-T01**: Unit test: `REASON_TEMPLATES` in `server/blunderReasons.js` has exactly 23 entries matching FR-002. Use snapshot assertions so future text changes produce an explicit diff. Test file: `connect-four/tests/blunder/blunderReasons.test.js`.
- **FR-T02**: Unit test: `classifyPattern` returns `Map` with non-empty `cells` for `immediate_threat` and `double_threat` detectors on verified movestrings sourced from the DB or codebase (never invented by hand). Test file: `connect-four/tests/blunder/classifyPatternCells.test.js`.
- **FR-T03**: Unit test: `tagBlunder`'s cascade resolves identically before and after the `P()` adaptation on a known blunder movestring sourced from the DB or codebase. Test file: `connect-four/tests/blunder/tagBlunderPAdaptation.test.js`.
- **FR-T04**: Integration test: `buildExplainContext` on a known blunder movestring (`col ≠ bestCol`) returns a non-null prompt containing the human-readable `REASON_TEMPLATES` sentence (not the terse reason string) and passes `validateAnnotation`. Test file: `connect-four/tests/blunder/buildExplainContext.test.js`.
- **FR-T05**: Integration test: `buildExplainContext` on an optimal-move call (`col == bestCol`) returns a non-null prompt and passes `validateAnnotation`; verify `tagBlunder` was NOT called (test spy or log check). Same test file as FR-T04.
- **FR-T06 (automated corpus gate)**: Before shipping, run `validateAnnotation` over a corpus of at least 50 blunder positions sourced from the DB (not invented). The pass rate MUST be ≥ 95% (≥ 48/50). Each position is run through the new `buildExplainContext` path and the result submitted to `validateAnnotation`. Record per-failure details (which P1–P6 check failed, which tag/direction). A pass rate below 95% blocks the epic. Script: `connect-four/server/scripts/corpus_annotation_check.mjs`.
- **FR-T06b (manual quality gate)**: After the automated gate passes, compare LLM explanations generated by the new system against a sample of 10 existing cached explanations for the same movestrings. Any regression in accuracy or clarity blocks the epic. This human review step is in addition to, not a replacement for, the automated gate.

---

## Key Entities

- **`REASON_TEMPLATES`**: `Map<string, string>` in `server/blunderReasons.js`. 23 entries keyed by `"${tag}:${direction}"`. Provides human-readable blunder sentences for the LLM prompt builder. Never stored to DB; never returned to clients.
- **`POSITIVE_TEMPLATES`**: `Map<string, string>` in `server/blunderReasons.js`. Keyed by tag name (no direction suffix). Provides "this is strong because…" sentences used on the optimal-move path. Generic fallback `"This was the strongest move available."` used for missing tags or empty pattern maps. Never stored to DB; never returned to clients.
- **`classifyPattern` return value**: `Map<string, { cells: string[] }>`. Each key is a matched tactical pattern tag. Each value has a `cells` array of wire-format cell coordinates. Used to derive `allowedSet` in `buildExplainContext` and by `tagBlunder`'s `P()` helper (via `new Set(result.keys())`).
- **`buildBlunderExplainPrompt` parameters**:
  - `tag` — string or null (null on optimal-move path).
  - `direction` — `'missed_own'|'enabled_opponent'|'defensive_miss'` or null.
  - `humanReason` — string from `REASON_TEMPLATES` lookup on the blunder path, or null on the optimal-move path.
  - `positiveReason` — string from `POSITIVE_TEMPLATES` lookup on the optimal-move path (keyed by the highest-priority matched tag in `correctMovePatterns` per the blunder cascade ordering: `forced_win` > `double_threat` > `immediate_threat` > `undercut` > `overcut` > `figure_7` > `j_shape` > `z_threat` > `odd_even_threat` > `claimeven` > `claimodd` > `drawing_move` > `suboptimal_move`; or the generic fallback when no matched tag is in the map or patterns are empty), or null on the blunder path.
  - `correctMovePatterns` — `Map<string, {cells: string[]}>` from `classifyPattern(ms + bestCol, perspective, solver)`.
  - `boardViz`, `postBoardViz` — board visualization strings (unchanged from current).
  - `playerName` — `'Green'` or `'Grey'` (unchanged).
  - `gap`, `gapBucket` — eval gap metrics (unchanged).
  - `allowedSet` — `AllowedSetEntry[]` derived from the direction-aware union of classifyPattern results (replaces simulation-derived allowedSet).
- **`explanation_cache.template_version`**: nullable TEXT column. `NULL` = pre-Epic-3 entry. `'v2'` = entry written after this epic.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `POST /api/explain-move-llm` produces a `validateAnnotation`-passing explanation for every blunder position in the manual quality gate sample (10 positions). Zero annotation failures on the new system's output.
- **SC-002**: `POST /api/explain-move-llm` produces a `validateAnnotation`-passing explanation for every optimal-move position in the manual quality gate sample. Zero annotation failures.
- **SC-003**: `rg explainSimulate connect-four/server/` returns zero hits after the epic ships. The 520-line `explainSimulate.js` file is deleted.
- **SC-004**: `rg classifyAll connect-four/server/` returns zero hits in the main source tree after the epic ships.
- **SC-005**: `REASON_TEMPLATES` unit test passes with snapshot assertions covering all 23 `{tag, direction}` entries. No entry resolves to `undefined`.
- **SC-006**: `tagBlunder` regression test passes — cascade output is identical before and after the `P()` adaptation on the test movestring.
- **SC-007**: New `explanation_cache` rows have `template_version = 'v2'`. Existing rows are unaffected (NULL).
- **SC-008**: Automated corpus gate (FR-T06): `validateAnnotation` pass rate ≥ 95% over ≥ 50 DB-sourced blunder positions using the new `buildExplainContext` path.
- **SC-009**: Manual quality gate (FR-T06b): reviewer finds no regression in accuracy or clarity versus the 10 sampled cached explanations from the old system. Runs after SC-008 passes.

---

## Assumptions

- Epic 2 (`specs/024-patterns-blunders-epic2`) is fully deployed: `tagBlunder` is exported from `classifier.js`, wired into `POST /api/games/analyze`, and producing non-null `reason`/`direction` on stored blunder rows. `classifyPattern` is already exported and callable.
- `classifyPattern` currently returns `Set<string>` (as implemented in Epic 1). The return-type extension to `Map` is real new work in this epic.
- `DETECTOR_REGISTRY` is currently declared in `explainSimulate.js`. Before that file is deleted, the implementor must verify that `classifyPattern`'s inline detector list is identical to `DETECTOR_REGISTRY`. If they have drifted, `classifyPattern`'s list is updated to match before deletion.
- The `contrastCol` computed by `selectContrastMove` serves as `bestCol` for the blunder path. When `inverted == true` (user played optimally), `col` itself is `bestCol`. This logic is already present in `buildExplainContext`; it is carried through to the new flow unchanged.
- Performance: `tagBlunder` may issue up to 60+ solver queries per call (due to `detectClaimeven`). Two `classifyPattern` calls replace two `explainSimulate` calls; the overall solver query budget per `buildExplainContext` invocation is expected to decrease, not increase, because `explainSimulate` ran deep simulation trees. This is acceptable on the post-game, non-UI-blocking path.
- The `getOpponentResponseMs` helper in `llmCoachHelpers.js` may or may not remain used after the rework. The implementor must verify with `rg getOpponentResponseMs connect-four/server/` before deciding to retain or remove it.
- The next available migration number for the `template_version` column must be determined by scanning `connect-four/server/migrations/` at implementation time.
- Tests follow the `node --test` pattern documented in `feedback_server_testing_pattern.md` — not Jest. Test files go under `connect-four/tests/blunder/`.
- `npm run test:fast` (not `npm test`) is used for all CI checks; it omits `candidate-generator.test.js`.
