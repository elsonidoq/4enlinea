# Research: Repo Hygiene & Tech-Debt Sweep

**Date**: 2026-06-13  
**Status**: Complete — all unknowns resolved by direct codebase inspection

---

## Decision: Dead-screen rule application

**Decision**: Use the 4-condition FR-004 check for all screen and page files. The two AdminLesson screens (`AdminLessonEditorScreen.jsx`, `AdminLessonListScreen.jsx`) are NOT in the SCREENS map but ARE reachable via `AdminLessonsPage.jsx` which is lazy-loaded in App.jsx — they receive DEFER/SURFACE, not DELETE.

**Rationale**: Transitive reachability via an App.jsx lazy-load counts as a "production importer" under FR-005. These screens only fail condition (1) of the 4-condition check; conditions (2) and (3) both pass against them.

**Alternatives considered**: Treating lazy-load as the sole alive signal for pages (conditions 1+2 only) — rejected because the spec requires all 4 conditions to hold for DELETE.

---

## Decision: Server script SURFACE candidates

**Decision**: Scripts that lack `process.argv`, are not imported from any server module, and are not referenced in `package.json` scripts receive SURFACE verdict (not DELETE), regardless of their apparent purpose.

Candidates identified: `corpus_annotation_check.mjs`, `debug_blunder_severity.mjs`, `reprocess_blunders.mjs`, `verify_prompt_fixes.mjs`, `delete_all_candidates.sh`.

**Rationale**: FR-006 and the spec's SURFACE definition explicitly say that "a CLI tool with no importer and no entrypoint signal" receives SURFACE, not DELETE. These files may be one-off tools that the owner uses interactively without a process.argv guard (e.g., invoked directly via `node script.mjs` with inline hardcoded args). Deleting them would be a loss of context with no confirmed payoff.

**Alternatives considered**: Assigning DELETE since they have no live signals — rejected because FR-006 requires all dead checks to pass, and SURFACE is the specified safe landing for ambiguous cases.

---

## Decision: en.json is already canonical

**Decision**: `connect-four/src/i18n/en.json` already uses "Green" and "Gray" throughout. No changes needed. Record as verified no-op.

**Evidence**: Direct grep of en.json found zero occurrences of 'red' or 'yellow' as disc color labels. The file consistently uses "sideGreen"/"sideGray" keys and "Green"/"Gray" in all player-facing strings.

---

## Decision: es.json is conditional — grep first

**Decision**: Run `rg -iw "rojo|amarillo|red|yellow" connect-four/src/i18n/es.json` as T3's first action for es.json. If zero hits, record as no-op. Based on codebase inspection, es.json appears to have minimal content relative to en.json (partial translation), so disc-color strings may not be present.

**Rationale**: The spec says "If no disc-color strings are found in es.json, record the scan result as a no-op." The grep-first approach prevents unnecessary edits.

---

## Decision: `_boardInstructions` fields in lessons are out of scope

**Decision**: The `_boardInstructions` fields in lesson JSON files are authoring notes used during lesson creation — they are not rendered to users by `lessonLoader.js` or any screen. They are treated as code comments (out of scope per FR-019).

**Evidence**: `lessonLoader.js` validates and loads specific fields (`id`, `title`, `free`, `userPerspective`, `slides`, `socratic`, `confirmationCategory`, `confirmationCount`, `boardSpec`). `_boardInstructions` is not in the loaded field set and starts with `_` (convention for non-loaded metadata fields).

**Alternatives considered**: Updating these fields for consistency — rejected because they never reach users and FR-019 explicitly scopes them out.

---

## Decision: classify_all.mjs threat map legend abbreviations are out of scope

**Decision**: The abbreviations `rm`, `rn`, `ym`, `yn` in the threat map legend (`'rm=Red major, rn=Red minor, ym=Yellow major, yn=Yellow minor'`) are identifier-style abbreviations, not user-facing disc color labels. Only the full player names "Red" and "Yellow" in that string are in scope for FR-016.

**Rationale**: FR-019 excludes "identifiers." The abbreviations `rm`/`rn`/`ym`/`yn` function as key names in a legend. Changing them to `gm`/`gn` would break any downstream tool that parses this output format. Only the expanded "Red major"/"Yellow major" labels should change to "Green"/"Gray".

---

## Decision: FR-020 scope in llmCoachHelpers.js

**Decision**: The `playerName` parameter to `buildBlunderExplainPrompt` is documented as `{'Green'|'Grey'}` in a JSDoc comment (out of scope). The actual string values `'Grey'` computed in:
- `explainContext.js` line 130/155 (assignment of playerName/opponentName)
- `llmCoachHelpers.js` line ~554 (opponentName derivation from playerName)
- `llmCoachHelpers.js` line ~589 (board legend string in LLM prompt)

are in scope and MUST change to `'Gray'`.

**Rationale**: These strings reach the LLM as part of the prompt text (user-facing in the sense of LLM-facing for coaching output). FR-020 explicitly names `server/llmCoachHelpers.js` and the playerName emission as required changes.

---

## Pre-audited verdicts confirmed

| File | Verdict | FR reference |
|------|---------|--------------|
| `src/pages/PuzzlesPage.jsx` | DELETE | FR-007 |
| `src/screens/PlaceholderScreen.jsx` | DELETE | FR-008 |
| `server/debug-immediate-threat.js` | SURFACE | FR-009 |
