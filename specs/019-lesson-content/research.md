# Research: Lesson Content (11 Lessons)

## Resolved Unknowns

### 1. PATTERN_KB entry format
**Decision**: `{ inline: string }` for immediate_threat and forced_block; `{ inline: string }` for claimodd (no community-claimodd.md KB article exists yet).
**Rationale**: The existing `PATTERN_KB` map in `llmCoachHelpers.js` accepts both `inline` and `{ id }` formats. For patterns without a dedicated KB article, inline is preferred. Epic 6 may add a KB article later.
**Location**: `connect-four/server/llmCoachHelpers.js` line 51, after `double_threat` entry.

### 2. Prompt assembly location for narration templates
**Decision**: Narration templates are added as short prose strings to the `buildExplainPrompt()` function in `llmCoachHelpers.js`, called from `buildExplainContext()` in `index.js`.
**Rationale**: `buildExplainPrompt` receives all pattern analysis context via named parameters. The narration templates are pattern-specific prose that augment the existing `## What the analysis found` section. Adding parameters to `buildExplainPrompt`'s destructured argument is the cleanest pattern — it follows the existing convention of optional context parameters.
**Location**: `buildExplainPrompt()` in `llmCoachHelpers.js`, with call-site data passed from `buildExplainContext()` in `index.js`.

### 3. DETECTOR_REGISTRY entry pattern
**Decision**: `{ name: 'claimodd', fn: detectClaimodd, isAsync: false, histType: 'col' }`
- `histType: 'col'` because `detectClaimodd` returns a single `correctCol` (col 3) — column-level histogram is appropriate.
- `isAsync: false` because the detector is synchronous O(7) — no solver calls needed.
**Rationale**: Follows the exact pattern of existing synchronous column-based detectors like `immediate_threat` and `double_threat`.

### 4. Claimodd challenge set entry
**Decision**: `{ slug: 'claimodd', displayNameKey: 'challengeSet.claimodd.displayName', descriptionKey: 'challengeSet.claimodd.description', stars: 3, free: true }`
**Rationale**: Matches existing `claimeven` entry structure. Placed after `z_threat` (alphabetical/order convention in existing array) or after `claimeven`. Stars=3 per FR-035 and epic spec.

### 5. Overcut reason derivation
**Decision**: The `reason` field is derived from existing internal logic within `detectOvercut` — specifically the classification of why the upper threat wins over the lower threat. No new solver calls.
**Values**: `"same_parity_t4"`, `"active_forcing"`, `"chain_t2"`, `"minor_threat"`
**Rationale**: The existing `detectOvercut` function already distinguishes these cases internally; exposing them as a return field costs ~10 lines with no algorithmic change.

### 6. Undercut verification approach
**Decision**: A one-shot query script at `connect-four/server/scripts/verify-undercut-puzzles.mjs` that queries `SELECT COUNT(*) FROM puzzles WHERE category = 'undercut' AND approved = true` and checks whether any have distinct undercut trap column vs correct column.
**Rationale**: Read-only query per FR-048. Not run at startup — executed manually or as part of Epic 6 task handoff. Exact predicate for "distinct undercut trap column" requires `detectUndercut` on the position's movestring to get the undercut column, then compare to `correct_col`.

### 7. Coach phrase pool requirements
**Decision**: Each of the 5 missing categories (claimodd, undercut, overcut, figure_7, j_shape) gets 5 pools × ≥2 variants each (4+ for optimal/blunder recommended).
**Rationale**: FR-041/FR-042 require at least 2 per pool; 4+ for optimal/blunder is recommended for variation (Gap 29).

### 8. Narration template wiring
**Decision**: For MVP, narration templates are simple prose strings added to the `buildExplainPrompt` call via optional parameters. Each pattern gets a `narration<Pattern>: ?string` parameter:
- `narrationClaimeven` — basic prose about Yellow's pairing strategy
- `narrationZThreat` — cites badgeCount from highlightMetadata
- `narrationFigure7` — cites threat rows
- `narrationJShape` — cites triple-threat directions

**Rationale**: This keeps each narration independent and avoids modifying the prompt-building logic to detect which pattern matched — the caller (buildExplainContext) determines which narration applies from the `detect*` results and passes it through.

### 9. Lesson JSON i18n strategy
**Decision**: The lesson JSON stores literal English strings directly (e.g. `"text": "An immediate threat is a move that wins."`). The ConceptScreen wraps each text field in `t(key, { defaultValue })` where key follows `lesson.<id>.slide.<n>.<field>`.
**Rationale**: The JSON itself is the authoring source; i18n key wrapping is a display concern. This avoids the overhead of maintaining parallel i18n keys for every lesson text while still supporting future translation. Matches the existing `lesson-01-immediate-threat.json` pattern.

### 10. Lesson 4 (reading-only) confirmationCategory=null behavior
**Decision**: Already handled by Epic 4 infrastructure — the ConceptScreen checks `confirmationCategory === null` and advances from the last slide directly to lesson completion without the Socratic or clchallenge screen.
**Rationale**: No new code needed in this epic for this path. See `project_lesson_curriculum.md` reference.

## Design Decisions

| Decision | Choice | Alternatives Considered |
|---|---|---|
| Narration template location | `buildExplainPrompt` parameters | In `buildExplainContext` (rejected: couples prompt assembly to analysis logic) |
| detectClaimodd histType | `'col'` | `null` (rejected: column-level histogram matches pattern geometry; the detector identifies a specific column) |
| claimodd i18n pool size | 2–4 variants per quality | 1 variant (rejected: FR-042 requires ≥2, 4+ recommended) |
| Lesson text i18n | `defaultValue` pattern in JSON | Keys-only (rejected: doubles authoring effort for no practical gain in MVP) |
| Undercut verification | Manual script | Automated gating (rejected: FR-048 specifies read-only, no data modification) |
