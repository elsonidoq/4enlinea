# Implementation Plan: Lesson Content (11 Lessons)

**Branch**: `019-lesson-content` | **Date**: 2026-06-02 | **Spec**: specs/019-lesson-content/spec.md
**Input**: Feature specification from `/specs/019-lesson-content/spec.md`

## Summary

Author 11 lesson JSON content files (`connect-four/lessons/lesson-NN-<slug>.json`) matching the Epic 4 schema, plus targeted backend additions: `immediate_threat` and `forced_block` PATTERN_KB entries in `llmCoachHelpers.js`, a new `claimodd` category registration (server `categories.js` + frontend `src/lib/categories.js` mirror, challenge set entry, i18n pools in `en.json`), a new `detectClaimodd` detector (~25 lines sync) registered in `DETECTOR_REGISTRY`, overcut `reason` field extension (~10 lines), and narration prose templates for claimeven/Z-Threat/Figure-7/J-Shape in `buildExplainContext`. The undercut puzzle existence verification (FR-047/FR-048) is a read-only query that flags Epic 6.

All changes are additive — no existing behavior changes, no new screens or routes.

## Technical Context

**Language/Version**: Node 20.10+ (server), React 18 (frontend)
**Primary Dependencies**: Express (server), react-i18next (frontend i18n), c4solver binary (via `c4solver-wrapper.js`)
**Storage**: Lesson content is file-based (JSON files loaded at server startup via `lessonLoader.js`); no DB changes for lesson content. Claimodd challenge set entry is in-memory (`challengeSets.js`). Coach phrase pools are in `en.json` (frontend i18n).
**Testing**: `npm run test:fast` (omits candidate-generator.test.js). Primary verification is manual: load each lesson JSON via `GET /api/lessons/:id` and verify rendering in ConceptScreen/SocraticScreen/CLChallengeScreen.
**Target Platform**: Web (React SPA + Express API)
**Project Type**: Frontend SPA + Backend API (monorepo)
**Performance Goals**: Lesson JSON files < 50KB each, server loads all 11 at startup in < 100ms (synchronous `fs.readdirSync` + `JSON.parse`, single-pass). `detectClaimodd` is synchronous O(7) parity check + scores comparison — no solver calls, < 1ms.
**Constraints**: Feature branch `019-lesson-content`. All lesson JSON files must validate against Epic 4 schema (server `lessonLoader.js` rejects malformed files with `console.error`, never crashes). Coach phrase pools must have at least 2 variants per quality bucket (spec FR-042). `claimodd` must NOT be added to `PAID_CATEGORIES` (FR-033). All overlays use only the locked enum (`tg`, `td`, `claim`, `win`) — no `tr` type (FR-003).
**Scale/Scope**: 11 lesson JSON files + ~200 lines backend additions (detectClaimodd, PATTERN_KB entries, overcut reason, narration templates, claimodd registration, i18n keys). No new screens, routes, or DB migrations.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Principle I — Explanation Engine**:
- All lesson content is authored JSON (boardSpec diagrams, coach messages, overlays) — no Explanation Engine routing required for concept slides.
- PATTERN_KB entries (FR-028/FR-029/FR-030) feed into the existing `buildKBSection()` path used by `buildExplainPrompt` — consistent with the existing pattern.
- Narration templates (FR-043 through FR-046) add prose to `buildExplainContext` — no new evaluation pipeline.
- detectClaimodd registers in DETECTOR_REGISTRY per the existing convention (FR-037).
- **Compliant**: all additions feed into the existing Explanation Engine pipeline.

**Principle II — Code Quality & Simplicity**:
- `detectClaimodd` is ~25 lines synchronous — no speculative abstraction.
- Overcut `reason` field is ~10 lines — extends existing return object, no new module.
- Narration templates are lightweight prose strings added to existing prompt-assembly code.
- All changes are additive; they change no existing function signature or behavior (FR-050).
- **Compliant**: no premature abstractions, no half-finished implementations.

**Principle III — Testing Standards**:
- `detectClaimodd` must be tested with at least one positive fixture (all-even parity, Red's turn, center col winning) and one negative fixture (any odd-parity column).
- `detectOvercut` reason field must be verified to return a known sub-case string for every matched position (SC-005).
- Lesson JSON files can be validated structurally by loading them via the server endpoint.
- **Compliant with note**: integration tests for solver-dependent patterns follow existing conventions.

**Principle IV — UX Consistency**:
- Coach phrase pools follow the existing key-namespace convention (`coach.<category>.<quality>.<n>`).
- Lesson i18n keys follow the established `lesson.<id>.slide.<n>.<field>` pattern (FR-049).
- All overlays use the locked overlay enum — consistent with all other surfaces.
- **Compliant**: consistent terminology and key conventions throughout.

**Principle V — Performance**:
- Lesson JSON loading is synchronous at startup only — no request-time I/O.
- `detectClaimodd` is O(7) + scores lookup — negligible cost.
- Overcut `reason` derives from existing `detectOvercut` logic — no new solver calls.
- **Compliant**: no new performance-sensitive paths.

**Principle VI — Implementation Methodology**:
- All board positions in lesson JSON are hand-authored boardSpec arrays — not random or derived (see Assumptions).
- Overcut `reason` extension makes the existing sub-case identification explicit (FR-039) rather than implicit.
- Undercut verification (FR-047) is a read-only query against existing data — validates before assuming availability.
- **Compliant**: empirical validation before use.

**Principle VII — Design Philosophy**:
- One obvious way: DETECTOR_REGISTRY entry pattern is already established for all 11 existing detectors.
- Explicit over implicit: overcut `reason` field makes sub-case identification explicit.
- **Compliant**.

**Principle VIII — Documentation**:
- [x] Existing architecture docs (docs/architecture/server-conventions.md, frontend-conventions.md, specs/019-lesson-content/spec.md, .specify/memory/constitution.md, docs/mvp/epics.md, docs/mvp/lesson-curriculum.md) were read before drafting this plan.
- [x] All reference files listed in this plan's preamble were consulted (llmCoachHelpers.js, explainSimulate.js, categories.js, challengeSets.js, socraticReducer.js, lesson-01-immediate-threat.json).
- [x] No undocumented conventions were discovered during review that need documentation before proceeding.
- [x] tasks.md will include documentation tasks for: new PATTERN_KB entries, detectClaimodd registration, overcut reason field contract, narration template wiring locations.

## Project Structure

### Documentation (this feature)

```text
specs/019-lesson-content/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Research findings (data model decisions, API contracts)
├── data-model.md        # Lesson JSON schema, entity definitions
├── quickstart.md        # Implementation quick reference
├── contracts/           # (minimal — lesson JSON schema is self-documenting)
└── tasks.md             # Generated by /speckit-tasks
```

### Source Code (repository root)

```text
connect-four/
├── lessons/                        # Lesson JSON files (this epic's primary output)
│   ├── lesson-01-immediate-threat.json   (exists — verify/update)
│   ├── lesson-02-block-before-build.json
│   ├── lesson-03-the-fork.json
│   ├── lesson-04-odd-rows-belong-to-red.json
│   ├── lesson-05-claimeven.json
│   ├── lesson-06-z-threats.json
│   ├── lesson-07-claimodd.json
│   ├── lesson-08-undercut.json
│   ├── lesson-09-overcut.json
│   ├── lesson-10-figure-7-trap.json
│   └── lesson-11-j-shape.json
├── server/
│   ├── index.js                   # buildExplainContext — narration templates added
│   ├── llmCoachHelpers.js         # PATTERN_KB entries for immediate_threat, forced_block, claimodd
│   ├── categories.js              # claimodd added to VALID_CATEGORIES + CATEGORY_ORDER
│   ├── challengeSets.js           # claimodd entry added (already verified: Pro entries exist)
│   ├── classifier.js              # detectClaimodd function added
│   └── explainSimulate.js         # DETECTOR_REGISTRY: claimodd entry
├── src/
│   ├── i18n/en.json               # Coach phrase pools for claimodd, undercut, overcut, figure_7, j_shape
│   │                              # + claimodd challengeSet i18n keys + lesson content i18n keys
│   └── lib/categories.js          # claimodd added to CATEGORY_ORDER (mirror of server)
└── tests/
    └── unit/
        ├── lessonLoader.test.js   # Existing — verify passes with 11 lessons
        └── (new) detectClaimodd.test.js
```

**Structure Decision**: Monorepo with existing connect-four/ structure. All changes are additive within existing files — no new directories or files beyond the 11 lesson JSON files and a test file.

## Implementation Phases

### Phase 0: Research (Resolved unknowns)

The following unknowns from the spec are resolved by reading the codebase:

1. **Where do PATTERN_KB entries live?** `connect-four/server/llmCoachHelpers.js` — the `PATTERN_KB` map at line 51. Entries are `{ inline: string }` or `{ id: string }` referencing a KB article slug.

2. **Where is the prompt-assembly module?** `buildExplainContext()` in `connect-four/server/index.js` (lines ~633–720) is the function that assembles the Deep Reveal context. Narration templates (FR-043 through FR-046) are prose strings added to the prompt string built by `buildExplainPrompt()` from `llmCoachHelpers.js`.

3. **What is the current DETECTOR_REGISTRY?** 11 entries in `explainSimulate.js` lines 50–62. Adding `claimodd` = one more entry with `isAsync: false, histType: 'col'`.

4. **What is the challengeSets.js state?** All 4 Pro entries (`undercut`, `overcut`, `figure_7`, `j_shape`) are already present with `free: false`. A `claimeven` entry exists with `free: true`. Need to add a `claimodd` entry.

5. **What is the current categories.js state?** `claimodd` is NOT present in `VALID_CATEGORIES` or `CATEGORY_ORDER`. It must be added between `z_threat` and `undercut`. It must NOT be added to `PAID_CATEGORIES` (already verified: PAID_CATEGORIES has `mixed, undercut, overcut, figure_7, j_shape`).

6. **What is the current frontend categories.js state?** Same CATEGORY_ORDER as server. Must add `claimodd` in sync.

7. **Where does the undercut verification query run?** FR-047 specifies a read-only query against the puzzles table. The query runs at verification/QA time, not at startup. Implementation: a one-shot script or README documentation for manual verification. Puzzle population is Epic 6 scope.

8. **What coach phrase pools exist?** `en.json` has pools for `immediate_threat`, `forced_block`, `double_threat`, `claimeven`, `z_threat`, `forbidden_columns`, `forced_win`. Missing pools for: `claimodd`, `undercut`, `overcut`, `figure_7`, `j_shape`.

9. **How does the lesson loader validate?** `server/lessonLoader.js` validates required fields and `boardSpec` array length (must be 7). Files failing validation are logged and excluded.

10. **What is the lesson JSON template?** `lesson-01-immediate-threat.json` provides the canonical shape. Key detail: `coachMessages` use `text` (not `textKey` or `t(...)` wrapper in JSON).

### Phase 1: Design & Contracts

#### Data Model

**Lesson JSON Schema** (validated by `lessonLoader.js` at startup):
- `id` (string, required): slug matching filename pattern, e.g. `"lesson-05-claimeven"`
- `title` (string, required): display name
- `free` (boolean, required): `true` for lessons 1–7, `false` for lessons 8–11
- `userPerspective` (string, required): `"red"` or `"yellow"`
- `slides` (array, required, non-empty): concept slide objects
- `socratic` (object|null, required): `{ boardSpec: string[7], correctCol: number }` or `null`
- `confirmationCategory` (string|null, required): category slug for puzzle draw or `null`
- `confirmationCount` (integer, required, >= 0): number of puzzles to draw

**Slide object**:
- `coachMessages` (array): `{ text: string, lead?: string, faded?: boolean, mood?: string }`
- `boardSpec` (string[7]): column-major, bottom-to-top, `'g'`=green(Red), `'d'`=gray(Yellow)
- `overlays` (array): `{ c: number, r: number, type: 'tg'|'td'|'claim'|'win' }`
- `legendItems` (array): `{ type: 'tg'|'td'|'claim'|'win', label: string }`
- `infoProse` (string): info card text

**i18n key contract**: All lesson text fields use `t('lesson.<id>.slide.<n>.<field>', { defaultValue: value })`. The JSON stores literal English strings as `defaultValue`; the i18n key lookup allows future translation.

**Patten KB entries** (in `llmCoachHelpers.js`):
- `immediate_threat: { inline: string }` — ~1–2 sentences
- `forced_block: { inline: string }` — ~1–2 sentences
- `claimodd: { inline: string }` — ~2 sentences, OR `{ id: 'community-claimodd' }` if the KB article exists

**detectClaimodd** (in `classifier.js`):
- Signature: `detectClaimodd(board, scores)` — synchronous, O(7) parity check
- Returns: `{ matched: boolean, correctCol: number | null }`
- When `matched === true`: `correctCol === 3`
- Detection predicate: all `colHeights[col] % 2 === 0` (even), `board.currentPlayer === 1` (Red's turn), `colHeights[3] < 6` (center not full), `scores[3] > 0 && scores[3] === max(legalScores)`

**detectOvercut reason field** (in `classifier.js`):
- Add `reason: string` to the return object when `matched === true`
- Values: `"same_parity_t4"` (from `isT4SameParity`), `"active_forcing"` (from `isT5Exception`), `"chain_t2"` (from `isT2Blocking`)
- The three predicates in `detectOvercut` (classifier.js lines ~581–612) map directly: `isT4SameParity`→`same_parity_t4`, `isT5Exception`→`active_forcing`, `isT2Blocking`→`chain_t2`. No fourth sub-case exists in the code.
- Derived from existing internal logic — no new solver calls or board analysis

**Narration templates** (in `buildExplainContext` / `index.js`):
- **Claimeven** (FR-043): Prose string added to `buildExplainPrompt` when claimeven matches. Simple sentence like "Yellow wins by always responding above Red."
- **Z-Threat** (FR-044): Template citing `badgeCount` from `highlightMetadata` — explains why the odd gap count matters (zugzwang toggle), references `community-z-threat` KB prose.
- **Figure-7** (FR-045): Template citing both threat rows from `categoryEvidence.threat_cells` — names the two threat rows, explains why they cannot both be blocked.
- **J-Shape** (FR-046): Template citing triple-threat directions — identifies the three winning continuations from the L-shaped cluster.

Note: These narration templates are lightweight prose strings that augment the existing `buildExplainPrompt` output. The wiring mechanism uses named optional parameters: `claimevenNarration` (string | null), `zThreatNarration` (string | null), `figure7Narration` (string | null), and `jShapeNarration` (string | null) are added to `buildExplainPrompt()` in `llmCoachHelpers.js`. Data for each parameter is assembled in `buildExplainContext()` in `index.js` and passed through. Each parameter is appended to the prompt's pattern section when non-null.

#### API Contracts

No new endpoints. Existing endpoints reused:
- `GET /api/lessons` — returns lesson list (already implemented in Epic 4)
- `GET /api/lessons/:id` — returns full lesson JSON (already implemented in Epic 4)
- `GET /api/puzzles/draw` — draws confirmation challenge puzzles (already implemented in Epic 2a)
- `POST /api/explain-move-llm` — LLM explanation (narration templates augment the prompt)

### Phase 2: Task Breakdown (for /speckit-tasks)

The implementation is organized into 6 work groups:

**Group A: Lesson JSON Content Files (11 lessons)**
1. Lesson 1 (immediate-threat) — verify existing file, correct `boardSpec` overlays, add `id` matching schema
2. Lesson 2 (block-before-build) — author slides, boardSpec, overlays, socratic, confirmation
3. Lesson 3 (the-fork) — author Case A and Case B concept slides
4. Lesson 4 (odd-rows-belong-to-red) — reading-only: slides only, socratic=null, confirmationCategory=null
5. Lesson 5 (claimeven) — author claimeven slides with `claim` overlays, socratic
6. Lesson 6 (z-threats) — author Z-threat concept slides, socratic
7. Lesson 7 (claimodd) — author claiming concept slides (free lesson, userPerspective=red), socratic
8. Lesson 8 (undercut) — author undercut slides (Pro-gated, free=false)
9. Lesson 9 (overcut) — author overcut slides (Pro-gated)
10. Lesson 10 (figure-7-trap) — author Figure-7 slides (Pro-gated)
11. Lesson 11 (j-shape) — author J-Shape slides (Pro-gated)

**Group B: Backend — Category Registration**
12. Add `claimodd` to `server/categories.js` VALID_CATEGORIES + CATEGORY_ORDER (after z_threat, before undercut)
13. Add `claimodd` to `src/lib/categories.js` CATEGORY_ORDER (frontend mirror, in sync with server)
14. Add `claimodd` entry to `server/challengeSets.js` (free: true, stars: 3)
15. Verify Pro entries (undercut, overcut, figure_7, j_shape) are already present in challengeSets.js with correct free:false, star ratings (already confirmed)

**Group C: Backend — Detector and PATTERN_KB**
16. Add `immediate_threat` PATTERN_KB entry to `llmCoachHelpers.js` (inline string)
17. Add `forced_block` PATTERN_KB entry to `llmCoachHelpers.js` (inline string)
18. Add `claimodd` PATTERN_KB entry to `llmCoachHelpers.js` (inline or KB article ID)
19. Build `detectClaimodd(board, scores)` in `classifier.js` (~25 lines sync)
20. Register `detectClaimodd` in `DETECTOR_REGISTRY` in `explainSimulate.js`
21. Add `reason` field to `detectOvercut` return object in `classifier.js` (~10 lines)

**Group D: i18n — Coach Phrase Pools**
22. Add coach phrase pools for `claimodd` (free category) in `en.json` — 5 pool types × ≥2 variants
23. Add coach phrase pools for `undercut` (Pro) in `en.json`
24. Add coach phrase pools for `overcut` (Pro) in `en.json`
25. Add coach phrase pools for `figure_7` (Pro) in `en.json`
26. Add coach phrase pools for `j_shape` (Pro) in `en.json`
27. Add `challengeSet.claimodd.displayName` and `challengeSet.claimodd.description` i18n keys in `en.json`

**Group E: Backend — Narration Templates**

28. **Claimeven narration**: In `server/llmCoachHelpers.js`, add optional parameter `claimevenNarration` to `buildExplainPrompt()` signature. In `server/index.js`, within `buildExplainContext()`, assemble a short prose string (e.g. "Yellow wins by always responding above Red") when `detectClaimeven` matches. Pass it as `claimevenNarration` to `buildExplainPrompt()`. Append it to the prompt's pattern section when non-null.

29. **Z-Threat narration**: In `server/index.js`, within `buildExplainContext()`, assemble a `zThreatNarration` string from `highlightMetadata.badgeCount` (the odd gap count) and the `community-z-threat` KB prose. Pass it as new optional parameter `zThreatNarration` to `buildExplainPrompt()`. In `server/llmCoachHelpers.js`, append the parameter to the prompt's pattern section when non-null.

30. **Figure-7 narration**: In `server/index.js`, assemble a `figure7Narration` string from `categoryEvidence.threat_cells` (the two threat rows). Pass it as new optional parameter `figure7Narration` to `buildExplainPrompt()`. In `server/llmCoachHelpers.js`, append the parameter to the prompt's pattern section when non-null.

31. **J-Shape narration**: In `server/index.js`, assemble a `jShapeNarration` string citing the three winning continuation directions (from the L-shaped cluster described in the KB). Pass it as new optional parameter `jShapeNarration` to `buildExplainPrompt()`. In `server/llmCoachHelpers.js`, append the parameter to the prompt's pattern section when non-null.

**Group F: Verification**
32. Write undercut puzzle existence verification script/query (read-only count query)
33. Run verification: confirm all 11 lesson JSON files pass validation by starting the server
34. Run verification: confirm `detectClaimodd` with positive and negative test cases
35. Run existing test suite (`npm run test:fast`) — confirm no regressions (FR-050)

**Dependencies between groups**: A (content) and B (category registration) are independent and can run in parallel. Group C depends on B (claimodd must be in categories before detector matters, but technically independent — detector references category by slug string). Group D (i18n) can run in parallel with A. Group E (narration templates) depends on understanding the existing `buildExplainContext` flow. Group F (verification) runs last.

**Key ordering constraint**: `detectClaimodd` must be built AND registered in DETECTOR_REGISTRY before explainSimulate can use it. The i18n key `challengeSet.claimodd.displayName` must exist before the `claimodd` entry in challengeSets.js is resolvable. The frontend `categories.js` update must mirror the server update atomically.

## Complexity Tracking

No constitution violations detected — all work is additive within existing patterns. No complexity justification needed.
