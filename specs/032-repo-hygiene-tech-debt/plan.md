# Implementation Plan: Repo Hygiene & Tech-Debt Sweep

**Branch**: `032-repo-hygiene-tech-debt` | **Date**: 2026-06-13 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/032-repo-hygiene-tech-debt/spec.md`

---

## Summary

Remove all dead screens, dead components, and dead server modules from the codebase, then replace every user-facing "red"/"yellow" disc label with the canonical "green"/"gray" terminology. The epic splits into two independent parts: Part A (dead-code audit → inventory → deletion) and Part B (green/gray terminology sweep). Part A is sequenced — inventory must precede deletion. Part B has no dependency on Part A and can begin immediately.

**No new endpoints, no schema changes, no new dependencies.** This is a pure cleanup epic.

---

## Technical Context

**Language/Version**: Node 20.10+ (server), React 18 / Vite (frontend)  
**Primary Dependencies**: No new dependencies introduced  
**Storage**: N/A (no DB changes)  
**Testing**: `npm run test:fast` inside `connect-four/` (see project CLAUDE.md)  
**Target Platform**: Existing monorepo under `connect-four/`  
**Project Type**: Cleanup/refactor — no new features  
**Performance Goals**: N/A  
**Constraints**: Internal board-cell enum values `'red'`/`'yellow'` must NOT be changed (FR-017). Test-only imports do not count as live references. File granularity only — no per-symbol pruning.  
**Scale/Scope**: ~40 frontend files to audit, ~30 server files to audit, ~11 lesson JSON files to scan

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Principle I — Explanation Engine as Single Source of Truth**:
- [x] This epic does not touch the Explanation Engine. No move evaluations or annotations are changed.

**Principle II — Code Quality & Simplicity**:
- [x] Deletions remove dead code; no speculative abstractions added.
- [x] Grey→Gray string normalization is a targeted find/replace with no logic change.

**Principle III — Testing Standards**:
- [x] No solver-dependent features added. Post-deletion `npm run test:fast` is the verification gate.

**Principle IV — UX Consistency**:
- [x] The green/gray sweep enforces terminology consistency — this is required by this principle.

**Principle VII — Software Design Philosophy**:
- [x] Flat is better than nested: dead code removed simplifies the tree.

**Principle VIII — Documentation (MUST check before planning)**:
- [x] Architecture docs read: `frontend-conventions.md`, `server-conventions.md`, spec.md, constitution.md.
- [x] No undocumented conventions discovered that need backfill.
- [x] tasks.md will include the debt-inventory.md creation as a first-class deliverable (it is itself documentation).

**No constitution violations detected.**

---

## Project Structure

### Documentation (this feature)

```text
specs/032-repo-hygiene-tech-debt/
├── spec.md
├── plan.md              ← This file
├── research.md          ← Phase 0 output
├── debt-inventory.md    ← Primary deliverable (created in T1, final after T2)
└── tasks.md             ← Phase 2 output (/speckit-tasks)
```

### Source Code — audit surface

```text
connect-four/
├── src/
│   ├── screens/          ← 20 files; 17 in SCREENS map + 2 Admin + 1 Placeholder (pre-audited DELETE)
│   ├── pages/            ← 3 files; 2 lazy-loaded in App.jsx + 1 pre-audited DELETE (PuzzlesPage)
│   ├── components/       ← ~30 files; all appear reachable from production importers (verify during T1)
│   ├── lib/              ← 12 files; all appear reachable (verify useDragSplit, surfaceGroups)
│   ├── context/          ← 1 file (DebugContext.jsx); imported by App.jsx
│   └── store/            ← 3 files; all active (ProfileStore/IndexedDBStore/SupabaseStore)
└── server/
    ├── *.js / *.mjs      ← ~30 files at root; most imported from index.js
    │   └── debug-immediate-threat.js  ← pre-audited SURFACE (FR-009)
    │   └── debug-claimeven.js         ← has process.argv → entrypoint → alive
    └── scripts/          ← 13 files
        ├── classify_all.mjs           ← has process.argv → alive; stdout uses Red/Yellow → FR-016
        ├── visualize_board.mjs        ← has process.argv → alive; Grey→Gray → FR-021
        ├── corpus_annotation_check.mjs ← no process.argv, not imported → SURFACE candidate
        ├── debug_blunder_severity.mjs  ← no process.argv, not imported → SURFACE candidate
        ├── reprocess_blunders.mjs      ← no process.argv, not imported → SURFACE candidate
        └── verify_prompt_fixes.mjs     ← no process.argv, not imported → SURFACE candidate
```

**Structure Decision**: Monorepo single-project; cleanup targets the `connect-four/` subtree only.

---

## Phase 0: Research

*All NEEDS CLARIFICATION items were resolved by direct codebase inspection during planning. No external research needed.*

### R1: SCREENS map count and pre-audit of screen files

**Confirmed from `screenRegistry.jsx`**: 17 entries in SCREENS map:
`home`, `stats`, `saga`, `concept`, `socratic`, `clchallenge`, `setpicker`, `challenge`, `summary`, `difficulty`, `game`, `review`, `explorer`, `mistakes`, `mistakeDetail`, `blunderDetail`, `pastGames`.

Files in `src/screens/` NOT in SCREENS map:
- `AdminLessonEditorScreen.jsx` — imported by `AdminLessonsPage.jsx` (which is lazy-loaded in App.jsx) → ALIVE, not a screen route but reachable.
- `AdminLessonListScreen.jsx` — same path as above → ALIVE.
- `PlaceholderScreen.jsx` — no importer found → **pre-audited DELETE** (FR-008).

Files in `src/pages/` NOT lazy-loaded in App.jsx:
- `PuzzlesPage.jsx` — no lazy import in App.jsx, no import found in any production file → **pre-audited DELETE** (FR-007).

### R2: Server entrypoint roster (FR-006)

Files in `server/` root that ARE entrypoints (imported from index.js or have process.argv):
- All files imported by `index.js`: `heatmap.js`, `classifyAiMove.js`, `explainContext.js`, `blunderTags.js`, `insertGameBlunder.js`, `userRoutes.js`, `c4solver-wrapper.js`, `candidate-generator.js`, `challengeSets.js`, `moveQualityScorer.js`, `completionStrategies.js`, `adminAuth.js`, `lessonAdmin.js`, `annotationGate.js`, `classifier.js`, `categories.js`, `lessonLoader.js`, `predicates.js`, `zoneParser.js`, `blunderReasons.js`, `userHelpers.js`.
- `migrate.js` — listed in package.json scripts.
- `debug-claimeven.js` — has `process.argv[2]` → entrypoint signal → ALIVE.
- `debug-immediate-threat.js` — **no** `process.argv`, hardcoded movestring, not imported → **pre-audited SURFACE** (FR-009).
- `llmCoachHelpers.js` — imported transitively by `explainContext.js` → ALIVE. Also needs FR-020 fix.

Test files at server root (always in entrypoint roster per FR-006):
`evaluate-move-ai-path.test.js`, `llmCoachHelpers.test.mjs`, `migrate.test.js`, `userEndpoints.test.mjs`, `userHelpers.test.mjs`.

### R3: Server scripts entrypoint analysis

Scripts with `process.argv` (ALIVE): `classify_all.mjs`, `debug_blunders_for_room.mjs`, `diagnose_blunders.mjs`, `import_papergames_blunders.mjs`, `simulate_blunders.mjs`, `visualize_board.mjs`, `diag_figure7.js`, `set-tier.js`.

Scripts without `process.argv` and not imported anywhere (SURFACE candidates — no import chain, ambiguous purpose):
- `corpus_annotation_check.mjs`
- `debug_blunder_severity.mjs`
- `reprocess_blunders.mjs`
- `verify_prompt_fixes.mjs`

`delete_all_candidates.sh` — shell script, no JS entrypoint signal. Purpose: bulk candidate deletion. Should receive SURFACE verdict pending owner confirmation.

### R4: Green/gray terminology scan findings

**`en.json`**: Uses "Green"/"Gray" throughout (already canonical). No 'red'/'yellow' disc labels found — this file is a no-op for Part B.

**`es.json`**: No disc-color strings found that use rojo/amarillo. Likely a no-op; implementer MUST grep to confirm before recording.

**Lesson JSON files**: User-facing text contains "Yellow" and "Red" as disc color labels in `infoProse`, `text`, and `label` fields. Affected files confirmed:
- `lesson-01-immediate-threat.json` ("three Yellow discs", "Tempting Yellow build")
- `lesson-02-block-before-build.json` ("yellow" in infoProse)
- `lesson-04-odd-rows-belong-to-red.json` ("Red" and "Yellow" throughout — this lesson is about parity)
- `lesson-09-overcut.json` ("Yellow", "Red" in board instructions)
- `lesson-10-figure-7-trap.json` ("Yellow" in multiple slides)
- `lesson-11-j-shape.json` ("Yellow" in infoProse)

**`_boardInstructions` fields**: These are authoring notes rendered only in the admin lesson editor (`AdminLessonEditorScreen.jsx`), not in the player-facing lesson runtime. They are OUT OF SCOPE for the green/gray sweep — no runtime verification needed.

**`userPerspective` field**: Internal enum value ('red'/'yellow') — OUT OF SCOPE per FR-017.

**`classify_all.mjs`**: stdout uses `'Red'` / `'Yellow'` as player labels:
- `const playerName = p => p === 1 ? 'Red' : 'Yellow';` — string values in scope (FR-016)
- `console.log('Red (player 1):', ...)` — in scope
- `console.log('Yellow (player 2):', ...)` — in scope
- `console.log('=== SOLVER SCORES (positive=Red wins, negative=Yellow wins, 0=draw) ===')` — in scope

**`visualize_board.mjs`**: 
- `const nextPlayer = ... 'Green' : 'Grey'` (line 82) — 'Grey' → 'Gray' required (FR-021)
- Legend string `'Gy=Grey'` (line 152) — 'Grey' → 'Gray' required (FR-021)

**`explainContext.js`**:
- `const playerName = perspective === 1 ? 'Green' : 'Grey'` (line 130) — 'Grey' → 'Gray' required (FR-020)
- `const opponentName = perspective === 1 ? 'Grey' : 'Green'` (line 155) — 'Grey' → 'Gray' required (FR-020)

**`llmCoachHelpers.js`**:
- `const opponentName = playerName === 'Green' ? 'Grey' : 'Green'` (line 554) — 'Grey' → 'Gray' required (FR-020; this is the computation that uses the playerName contract)
- `'Note: In the board, Gn = Green discs, Gy = Grey discs.'` (line 589) — 'Grey' → 'Gray' required

**JSDoc in `llmCoachHelpers.js`** (`@param {'Green'|'Grey'}`) — OUT OF SCOPE per FR-019 (code comment).

---

## Phase 1: Design

### D1: Debt inventory schema

`specs/032-repo-hygiene-tech-debt/debt-inventory.md` — markdown table with columns:

| File | Category | Verdict | Reason |
|------|----------|---------|--------|

**Verdict taxonomy** (FR-003):
- `DELETE` — all dead checks passed; safe to remove.
- `SURFACE` — ambiguous or missing owner signal; logged but not deleted.
- `DEFER` — deliberate keep decision by owner; logged but not deleted.

**Category values**: `screen`, `page`, `component`, `lib`, `context`, `store`, `server`, `script`.

**Reason format for DELETE rows**: Must cite the specific dead-check(s) that passed (e.g. "not in SCREENS map; not lazy-loaded in App.jsx; no go() call to this screen key; no URL_MAP entry; no production importer found in src/"). Generic reasons are not acceptable.

**Reason format for SURFACE rows**: Must cite the specific ambiguity (e.g. "no process.argv call and not imported; purpose unclear without owner clarification").

### D2: Part A task sequencing

```
T1: Audit + produce debt-inventory.md  (FR-001 prerequisite gate)
    └── T2: Delete DELETE-verdict files + clean dangling imports
                └── verify: npm run test:fast + npm run lint
```

T2 blocks on T1 completion (inventory must exist before deletions).

### D3: Part B task sequencing

```
T3: Green/gray terminology sweep (fully independent of T1 and T2)
    ├── 3a: Run FR-013 rg scan; record all hits
    ├── 3b: Fix visualize_board.mjs Grey→Gray (FR-021)
    ├── 3c: Fix explainContext.js Grey→Gray (FR-020)
    ├── 3d: Fix llmCoachHelpers.js Grey→Gray (FR-020 continuation)
    ├── 3e: Fix classify_all.mjs Red/Yellow stdout (FR-016)
    ├── 3f: Fix lesson JSON user-facing text (FR-015)
    ├── 3g: Scan + conditionally fix es.json (FR-014)
    └── verify: npm run test:fast
```

T3 has no dependency on T1 or T2. It may be executed in parallel with Part A.

### D4: Scope boundaries (explicit non-changes)

The following are confirmed OUT OF SCOPE and must not be modified:
- `board[row][col]` cell values `'red'`/`'yellow'` anywhere in `board.js`, `Board.jsx`, `buildBoard`, `boardSpecToBoard`, `parseBoardState`, classifier/detector logic.
- CSS variable names, class names, token names.
- Code comments, variable names, identifiers.
- `userPerspective` field values in lesson JSON files.
- `boardSpec` array values in lesson JSON files.
- JSDoc type annotations.
- `_boardInstructions` fields in lessons (authoring notes — rendered only in `AdminLessonEditorScreen.jsx`, not in player-facing runtime; unconditionally out of scope).

### D5: Post-sweep verification commands

```bash
# Part A verification
cd connect-four && npm run test:fast
# Then: cd connect-four && npm run lint
# Gate: error count ≤ pre-epic baseline recorded in debt-inventory.md (not exit 0 — 170 pre-existing errors exist)

# Part B verification
rg -iw "yellow|red" connect-four/src/i18n/ connect-four/lessons/ | grep -v "userPerspective\|boardSpec\|goalPredicate\|correctCol"
# Expected: zero hits that refer to disc colors

# Internal enum preservation check
rg "'red'\|'yellow'" connect-four/src/lib/board.js connect-four/src/components/Board.jsx
# Expected: matches present (enum unchanged)
```

---

## Implementation Tasks (high-level — detailed in tasks.md)

### Track A: Dead-Code Audit & Removal

**T1 — Produce debt-inventory.md** *(prerequisite for T2)*

1. **Generate the transitive import graph** (required before any manual grep step):
   - Run `npx dependency-cruiser --no-config --include-only "^(src|connect-four/src)" --output-type dot .` from the repo root (or equivalent: `npx madge --image graph.svg connect-four/src/`) to build the full reachability graph starting from the entrypoint roster (App.jsx, index.html entry, admin pages).
   - Alternatively: `npx madge --circular connect-four/src/` to detect unreachable nodes.
   - Files outside the transitive closure of the entrypoint roster are dead candidates. Record them; they will be verified in step 2 before receiving DELETE verdict.
   - This step catches multi-hop dead chains that single-hop grep cannot detect.

2. Apply FR-004 screen check to every file in `src/screens/` and `src/pages/`:
   - Grep `SCREENS` map in `screenRegistry.jsx` for export name.
   - Grep `App.jsx` for lazy imports.
   - Cross-reference against the graph from step 1; any file absent from the transitive closure is a DELETE candidate.
   - Confirm with single-hop grep: `rg` all `src/` for production imports (excluding `*.test.*`).
   - Grep all `go('screenKey')` calls and check `URL_MAP` entries.
3. Apply FR-005 component/lib check to every file in `src/components/`, `src/lib/`, `src/context/`, `src/store/`:
   - Use the graph from step 1 as the primary signal; confirm reachable files with targeted `rg` where needed.
4. Apply FR-006 server check to every file in `server/` root and `server/scripts/`:
   - Compare against entrypoint roster (index.js, migrate.js, package.json scripts, process.argv files, *.test.* files).
5. Record pre-audited verdicts directly: PuzzlesPage → DELETE (FR-007), PlaceholderScreen → DELETE (FR-008), debug-immediate-threat.js → SURFACE (FR-009).
6. Record SURFACE verdicts for script files lacking process.argv and not imported: `corpus_annotation_check.mjs`, `debug_blunder_severity.mjs`, `reprocess_blunders.mjs`, `verify_prompt_fixes.mjs`, `delete_all_candidates.sh`.
7. **Capture ESLint baseline**: Run `cd connect-four && npm run lint 2>&1 | tail -1` to get the current error count. Record the exact count in `debt-inventory.md` under a "ESLint baseline" heading. This count is the gate for T2 step 3.
8. Write `specs/032-repo-hygiene-tech-debt/debt-inventory.md`.

**T2 — Delete confirmed-dead files and clean imports** *(requires T1)*

1. For each DELETE-verdict file:
   - Remove the file from the repository.
   - Remove all import statements referencing it from any remaining file (FR-010).
2. Run `cd connect-four && npm run test:fast` — must exit 0 (FR-011).
3. Run `cd connect-four && npm run lint` — error count must be ≤ the pre-epic baseline recorded in `debt-inventory.md` (zero new errors introduced; exit code need not be 0 given 170 pre-existing errors) (FR-012).
4. Update `debt-inventory.md` with final confirmed-deleted list.

### Track B: Green/Gray Terminology Sweep

**T3 — Normalize all user-facing disc color strings** *(independent of Track A)*

1. Run `rg -iw "yellow|red" connect-four/src/ connect-four/server/ connect-four/lessons/ visualize_board.sh connect-four/server/scripts/` and record every hit (FR-013). Filter results to disc-color usages only; ignore non-disc-color contexts (e.g., CSS error colors, "redirect").

2. Fix **`connect-four/server/scripts/visualize_board.mjs`** (FR-021):
   - Line ~82: `'Grey'` → `'Gray'` in nextPlayer string.
   - Line ~152: `'Gy=Grey'` → `'Gy=Gray'` in legend string.

3. Fix **`connect-four/server/explainContext.js`** (FR-020):
   - Line 130: `'Grey'` → `'Gray'` in playerName assignment.
   - Line 155: `'Grey'` → `'Gray'` in opponentName assignment.
   - Line 158: Update trivialExplanation string if it contains `'Grey'`.

4. Fix **`connect-four/server/llmCoachHelpers.js`** (FR-020 continuation):
   - Line ~554: `playerName === 'Green' ? 'Grey' : 'Green'` → `'Gray'`.
   - Line ~589: `'Gy = Grey discs'` → `'Gy = Gray discs'` in board legend note.
   - Scan remaining file for any other 'Grey' string literals in LLM prompt construction; fix all.

5. Fix **`connect-four/server/scripts/classify_all.mjs`** (FR-016):
   - `playerName = p => p === 1 ? 'Red' : 'Yellow'` → `'Green' : 'Gray'`.
   - `console.log('Red (player 1):', ...)` → `'Green (player 1):'`.
   - `console.log('Yellow (player 2):', ...)` → `'Gray (player 2):'`.
   - Solver-scores header string: `'positive=Red wins, negative=Yellow wins'` → `'positive=Green wins, negative=Gray wins'`.
   - Threat map legend: `'rm=Red major, rn=Red minor, ym=Yellow major, yn=Yellow minor'` — this is internal board notation. Confirm whether this reaches user display; if it does, update player name portions only (rm/rn/ym/yn abbreviations are out of scope as identifiers).

6. Fix **lesson JSON files** (FR-015) — user-facing `text`, `infoProse`, `label` fields only:
   - `lesson-01-immediate-threat.json`: "three Yellow discs" → "three Gray discs"; "Tempting Yellow build" → "Tempting Gray build".
   - `lesson-02-block-before-build.json`: scan `infoProse` and `text` for Red/Yellow disc references; fix.
   - `lesson-04-odd-rows-belong-to-red.json`: fix all "Red" → "Green" and "Yellow" → "Gray" in user-facing text; leave `userPerspective: "red"` unchanged.
   - `lesson-09-overcut.json`: fix "Yellow" → "Gray" and "Red" → "Green" in `infoProse` and `text`.
   - `lesson-10-figure-7-trap.json`: fix "Yellow" → "Gray" in all slides.
   - `lesson-11-j-shape.json`: fix "Yellow" → "Gray" in `infoProse`.
   - Scan all remaining lesson files for misses (`lesson-03`, `lesson-05`, `lesson-06`, `lesson-07`, `lesson-08`).
   - Do NOT change `userPerspective`, `boardSpec`, `goalPredicateType`, `correctCol`, or `_boardInstructions` fields. (`_boardInstructions` is an admin authoring note rendered only in `AdminLessonEditorScreen.jsx` — it is out of scope.)

7. **`connect-four/src/i18n/es.json`** (FR-014): Run `rg -iw "rojo|amarillo|red|yellow" connect-four/src/i18n/es.json`. If zero hits → record as no-op. If hits found → replace disc-color terms with "verde"/"gris".

8. **`connect-four/src/i18n/en.json`** (FR-014): Confirmed no 'red'/'yellow' disc labels; no changes needed. Record as verified no-op.

9. Run `cd connect-four && npm run test:fast` — must exit 0 (FR-022).

10. Run verification: `rg -iw "yellow|red" connect-four/src/i18n/ connect-four/lessons/` filtering for disc-color usages → zero hits expected (SC-005).

---

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations detected. No complexity tracking needed.

---

## Constitution Check — Post-Design Recheck

**Principle VIII** — The debt-inventory.md is itself a documentation deliverable committed to the repo. All deleted files will have their deletion rationale recorded before removal. No new architectural decisions introduced; no architecture docs require updates.

**All constitution gates pass.**
