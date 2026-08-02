# Tasks: Lesson Learning Surface & Authoring Polish

**Input**: Design documents from `/specs/052-lesson-learning-surface-polish/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md (all present; no `contracts/` — this spec adds no new API endpoints or DB schema)

**Tests**: Requested by the spec itself (FR-030/FR-031, SC-001, SC-004, SC-005) — test tasks are included and are not optional for this feature.

**Working directory**: All `npm run`/`node server/scripts/...` commands run from `connect-four/` unless a path is given relative to repo root. Any task that starts/restarts/kills a dev server MUST first run `eval "$(./worktree-ports.sh)"` from the repo root and use `$API_PORT`/`$VITE_PORT` — never a bare `3001`/`5173`, never `pkill node` (see `docs/architecture/worktree-conventions.md`). Line numbers cited below are approximate per `research.md`/`data-model.md` — locate by symbol name, re-verify before editing.

**Organization**: Tasks are grouped by user story (US1–US5, matching spec.md's priorities P1/P1/P2/P3/P3) so each story is independently implementable and testable. Every user-story phase ends with that story's spec.md "Independent Test" / quickstart.md acceptance steps and its `docs/open_issues.md` closeout write(s).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task in the same phase)
- **[Story]**: US1–US5, per spec.md
- Exact file paths are included in every task description

---

## Phase 1: Setup

**Purpose**: Confirm a clean baseline before any change lands, so a later red test is attributable to this feature, not pre-existing rot.

- [x] T001 Run `cd connect-four && npm run test:fast && npm run test:dom` and confirm both are 100% green on the unmodified tree; record the result (no file changes). This is the baseline SC-007 will be re-checked against in Phase 9.

**Checkpoint**: Baseline confirmed green. No foundational (Phase 2) tasks are required — per `plan.md`, this spec is "five independent, additive changes to already-existing surfaces" with no shared new infrastructure, model, or endpoint that multiple stories depend on. Proceed directly to user stories; they may be implemented in any order or in parallel.

---

## Phase 3: User Story 1 - Socratic hint no longer swallows the solved-it reward (Priority: P1) 🎯 MVP

**Goal**: `showHint` resets on every phase transition so a hint can never persist into and visually/audibly block the `correct` reward message (FR-001/FR-002).

**Independent Test**: `npm run test:dom` drives Hint → correct-move and asserts the coach bubble renders and narrates the `correct` message, not the hint text; a manual two-pass browser walkthrough is supplementary evidence only.

- [x] T002 [US1] Run `cd connect-four && npm run test:dom -- --test-name-pattern="SocraticNarration"` on the unmodified tree to determine whether the existing `tests/dom/SocraticNarration.dom.test.jsx` "run 2" case is currently a red gate or silent rot against the sticky-hint premise (`research.md` flags this as unverified — establish it now, before touching source). Record which it is; no file changes in this task.
- [x] T003 [P] [US1] In `connect-four/src/screens/SocraticScreen.jsx`, add `useEffect(() => setShowHint(false), [phase])` next to the existing `showHint` state (`useState(false)`, symbol `showHint`) so hint resets on every phase transition (FR-001). In the same change, correct the in-source comment (symbol: the comment reading "sticky by design — see the plan's D2" near the `showHint ? 'hint' : phase` message-selection line) to cite FR-001 as the current, overriding decision instead of the superseded prior-spec record (FR-030 second half).
- [x] T004 [US1] Rewrite `connect-four/tests/dom/SocraticNarration.dom.test.jsx`'s "run 2" case and its header comment (which currently label the unreachable `correct` message after Hint "a known, accepted" behavior) to assert the new hint-yields-to-phase contract: Hint → correct move renders and narrates the `correct` message, not the hint text (FR-030 first half). Depends on T002's finding to know whether this is fixing a failing assertion or replacing a passing-but-wrong one.
- [x] T005 [P] [US1] Add new `connect-four/tests/dom/SocraticHintPhase.dom.test.jsx` with three cases: (a) Hint clicked → correct column played → `correct` message renders in the bubble AND the narration effect fires with the `correct` text (SC-001); (b) Hint clicked → wrong column played → hint text does not render alongside the wrong-move message (AC2); (c) no Hint clicked → correct column played → behavior unchanged from today (AC3, regression guard).
- [x] T006 [US1] Register `SocraticHintPhase.dom.test.jsx` (added in T005) in `connect-four/package.json`'s `test:dom` script string, which is a hardcoded space-separated file list, not a directory glob (FR-031) — confirm via `grep -o '"test:dom":.*' connect-four/package.json` that the new filename now appears.
- [x] T007 [US1] In `docs/architecture/lesson-editor.md`, document the hint-yields-to-phase decision (FR-001/FR-002: hint and phase messages never coexist, because the 120px coach-bubble cap that applies on every screen would truncate the `correct` reward text) (FR-003). In `docs/open_issues.md`, close OI-46 with a dated `✅ RESOLVED` status referencing this documentation and the new tests (T005/T006), per the issue-closeout convention.
- [x] T008 [US1] Run `cd connect-four && npm run test:dom` (full suite, confirm T005/T006 pass and no other DOM test regressed) then perform the manual split V7 procedure from `quickstart.md` §2: (1) hint-free run — play the taught correct column directly, confirm `correct` renders and is spoken; (2) separate hint run — click Hint, play the taught correct column, confirm `correct` (not hint text) renders and is spoken; reload, click Hint, play a wrong column, confirm hint text does not linger. Also confirm the Continue button still keys off `phase` directly (AC4, no code change expected — read-only regression check). Do NOT collapse the two runs into one pass.

**Checkpoint**: US1 fully functional and independently testable/shippable. OI-46 closed.

---

## Phase 4: User Story 2 - Lesson content has one home, and per-lesson prompts actually reach the learner (Priority: P1)

**Goal**: Every lesson title is sourced solely from the lesson's own JSON `title` field (no i18n key); `confirmationChallenges[].goalPrompt` becomes a per-lesson override of the shared prompt pool, fixing the claimeven and undercut misleading-copy findings; the override changes displayed text only, so the now-mismatched pre-generated audio clip is explicitly silenced (FR-029).

**Independent Test**: (a) Delete/rename the lesson's i18n title key and confirm the title still renders correctly on every screen from the lesson JSON alone. (b) Open the claimeven and undercut lessons and confirm the corrected, board-specific prompt now renders — and that no stale audio clip plays for it.

- [x] T009 [US2] Re-verify at source (do not assume drift-free) the three lesson-title call sites and their current fallback behavior: `connect-four/src/screens/SocraticScreen.jsx` (symbol: the `title={t(`lesson.${lessonId}.title`, ...)}` TopBar prop, currently `defaultValue: ''`), `connect-four/src/screens/ConceptScreen.jsx` (currently `defaultValue: lesson.title`), `connect-four/src/screens/SagaScreen.jsx` (currently `defaultValue: lesson.title`). Record any drift from `research.md`'s citations before editing in T010–T012.
- [x] T010 [P] [US2] In `connect-four/src/screens/SocraticScreen.jsx`, replace the `t('lesson.<id>.title', {defaultValue: ''})` call with a direct read of `lesson.title` from the lesson JSON (no `t()` call, no i18n key, no blank-fallback risk) (FR-004/FR-005).
- [x] T011 [P] [US2] In `connect-four/src/screens/ConceptScreen.jsx`, replace the equivalent `t('lesson.<id>.title', {defaultValue: lesson.title})` call with a direct read of `lesson.title` (FR-004/FR-005).
- [x] T012 [P] [US2] In `connect-four/src/screens/SagaScreen.jsx`, replace the equivalent `t('lesson.<id>.title', {defaultValue: lesson.title})` call with a direct read of `lesson.title` (FR-004/FR-005).
- [x] T013 [US2] Remove the `lesson.<id>.title` key for all 15 current lesson ids from both `connect-four/src/i18n/en.json` and `connect-four/src/i18n/es.json` (FR-011). **Settled 2026-07-30**: since `title` is (per `research.md`) the *only* key inside each `lesson.<id>` object today, deleting just the `title` key would leave 15 empty `{}` objects behind in each locale file — remove the entire `lesson.<id>` parent object for each of the 15 ids instead, not just its `title` child. Before deleting, grep each `lesson.<id>` object in both files to confirm `title` really is its only child (if any id's object also carries another key today, delete only `title` for that one id and note the exception here). Depends on T010–T012 landing first so no call site still references a key about to be deleted. T046 (US5's namespace-collision guard, which enumerates `lesson.*` children to derive the reserved set) depends on this full-object removal — a leftover empty `lesson.<id>: {}` would still appear as a spurious child in that enumeration.
- [x] T014 [US2] Run `cd connect-four && node --test tests/unit/i18nKeyParity.test.js` (or the relevant `test:fast` invocation) and confirm it still passes after the key removal — fewer keys, still symmetric (verification-only, no file change beyond confirming green).
- [x] T015 [US2] Load one lesson end-to-end — Saga list → its Concept slides → its Socratic screen — and confirm the lesson title renders non-blank on all three screens, per `quickstart.md` §3(a). This closes **SC-002**, the only success criterion in this spec with no other task behind it: `SocraticScreen.jsx`'s pre-migration title call is `title={t(`lesson.${lessonId}.title`, { defaultValue: '' })}` — an **empty-string** fallback — so a partial migration (e.g. T010 landing without T013, or a missed call site) would ship a silently blank top-bar title that nothing else in this story would catch before T063's final walkthrough. Depends on T010–T013 (all three call sites migrated AND the i18n keys removed, so this exercises the lesson-JSON path, not a stale i18n fallback still masking a bug).
- [x] T016 [US2] In `docs/architecture/lesson-editor.md`: (a) rewrite the "Curriculum ordering" paragraph that currently states "Titles come from the i18n key `lesson.<id>.title`... There is no `title_es`" to instead state titles are sourced solely from the lesson JSON's own `title` field (FR-012 first half); (b) rewrite the "Do NOT localize `title`" paragraph (currently ~line 22–23: "The `lesson.<id>.title` i18n key (en/es.json) already owns titles via `t(..., {defaultValue})` and wins; a `title_es` would be a second, silently-losing source") — the **rule** ("do NOT localize `title`; no `title_es`") still holds after this migration, but its stated **justification** is now false since the i18n key no longer exists. Restate the justification as: the lesson JSON's own `title` field is now the sole source of truth, so a `title_es` sibling would be a second, redundant place to look, not a silently-losing one — but is still disallowed to keep exactly one home for lesson content, per the project's standing "lesson content is a thing in itself" rule (Settled Decision 1). Without this edit, an implementer reading T015/T016's diff would see "leave the do-NOT-localize guidance unchanged" and skip a justification paragraph that is now factually wrong.
- [x] T017 [P] [US2] In `connect-four/src/screens/ChallengeScreen.jsx`, thread `goal_prompt: ch.goalPrompt ?? null` into the object built by the lesson-mode `confirmationChallenges.map(...)` inline-challenge mapping (symbol: the object currently containing `id`, `category`, `move_string`, `interaction_mode`, `highlight_metadata`, `correct_col`, `user_player`) so the already-locale-resolved `goalPrompt` reaches the puzzle object instead of being dropped (per `data-model.md` §"Entity: Puzzle object"). Before wiring, verify at source (do not assume) that `goalPrompt`/`goalPrompt_es` really do arrive pre-resolved to a single `goalPrompt` value by the time this mapping runs: grep `server/lessonLoader.js`'s `localizeLesson` for how it merges `_es` siblings and confirm `confirmationChallenges[].goalPrompt` is included in that merge (not just `socratic.goalPrompt`), and confirm the payload this screen receives from `GET /api/lessons/:id` already carries the resolved field, not the raw `{goalPrompt, goalPrompt_es}` pair — `plan.md` flags this as needing confirmation, not an assumed fact. Record the finding in the task/PR notes; if the field is NOT already locale-resolved, adjust this task's `ch.goalPrompt ?? null` read accordingly before proceeding.
- [x] T018 [US2] In `connect-four/src/screens/ChallengeScreen.jsx`'s prompt-selection call site (symbol: `candidateKeys` built from `coach.spoken.${effectiveCategory}.prompt.{0,1,2}`, currently near `initPuzzle`), add an `if (puzzle.goal_prompt) { ... } else { <existing random pool pick> }` branch: when `goal_prompt` is present and non-empty, use it as the displayed coach-message text instead of a random pool pick (FR-006); when absent, behavior is unchanged (FR-007); the pool mechanism and its outcome-neutral copy are untouched (FR-008). Depends on T017.
- [x] T019 [US2] In the same override branch added in T018 (`initPuzzle`, where `promptKeyRef.current` and `lastCoachKeyRef.current` are both currently set to `pickedKey`), set `lastCoachKeyRef.current = null` instead of `pickedKey` when the `goal_prompt` override is used, so the narration effect (`useEffect` keyed on `coachMessages.length`, calling `speakCoachMessage(lastCoachKeyRef.current)`) does not fire the old, now-mismatched `coach.spoken.<category>.prompt.N` clip (FR-029). Leave `promptKeyRef` unaffected — it is not read by the narration effect. This must be the same branch that picks the override text, not a separate mechanism, per Settled Decision 8.
- [x] T020 [US2] Add or extend a DOM test (`connect-four/tests/dom/ChallengeScreenGoalPrompt.dom.test.jsx` or an existing `ChallengeScreen*.dom.test.jsx`) asserting: (a) a puzzle with `goal_prompt` set renders that exact text in the coach bubble, not a `coach.spoken.*` pool string (FR-006); (b) a puzzle without `goal_prompt` still renders a pool string (FR-007 regression guard); (c) when `goal_prompt` renders, no call is made to `speakCoachMessage`/no truthy `lastCoachKeyRef.current` fires the narration effect (FR-029 automated tier — call/no-call assertion, not audio playback).
- [x] T021 [US2] If T020 created a new test file, register it in `connect-four/package.json`'s `test:dom` script string (FR-031) — confirm via `grep -o '"test:dom":.*' connect-four/package.json`.
- [x] T022 [US2] Re-verify the current claimeven lesson (`connect-four/lessons/lesson-08-claimeven.json` — confirm this is still the correct filename, it has drifted from `lesson-05-claimeven.json` before) and undercut lesson movestrings with `./visualize_board.sh <movestring>` before treating them as the acceptance boards for T023, since lesson content may have shifted since the 2026-07-25 QA snapshot.
- [x] T023 [US2] Manual acceptance walkthrough per `quickstart.md` §3(b): navigate to the claimeven lesson's confirmation puzzle and confirm the on-screen prompt no longer says "secure a draw" on the solver-won board (FR-009); navigate to the undercut lesson's confirmation puzzle and confirm the prompt no longer names the grader-rejected column (FR-010); confirm a DB-drawn (non-lesson) puzzle in the same categories still shows the original outcome-neutral shared-pool prompt (FR-008 regression guard). This closes SC-003.
- [x] T024 ✅ VERIFIED 2026-07-30 by the project owner in a real browser: the claimeven confirmation puzzle plays NO audio for the override prompt (silence, not the stale clip). [US2] Manual audio-ON real-browser verification per `quickstart.md` §3(c) — MUST be a real, non-automated browser session with audio on (automation Chrome fakes autoplay and cannot serve as evidence either way, per memory `project_app_qa_setup_gotchas`): reload the claimeven and undercut confirmation puzzles from T023 and confirm no audio clip plays for the coach's prompt message (silence, not the old mismatched clip); confirm a DB-drawn puzzle in the same categories still narrates its shared-pool prompt audibly, unchanged. This is the only valid evidence for FR-029's "actually audibly silent" half — T020's automated assertion is reliable evidence only for "the code takes the silent branch."
- [x] T025 [US2] In `docs/architecture/lesson-editor.md`: (a) correct the "To change a challenge prompt, edit i18n, not the lesson" paragraph to state `goalPrompt` is a per-lesson override edited in the lesson JSON, not i18n (FR-012 first half, `confirmationChallenges[].goalPrompt` only — NOT `socratic.goalPrompt`); (b) update the "Fields the learner UI ignores" table's `socratic.goalPrompt` entry to state it plainly stays unrendered because `socratic.messages.ask` already serves that per-lesson-prompt role for the interactive Socratic phase; (c) record the "override prompts are silent until Epic 5 synthesizes them" decision (FR-029) next to the `goalPrompt` documentation; (d) separately correct the "Traps" bullet (currently ~line 31–32: "`goalPrompt` / `goalPrompt_es` are edited and localized here but never reach the learner... Translating them is harmless but changes nothing on screen") — this story reverses that statement for `confirmationChallenges[].goalPrompt` specifically (it now DOES reach the learner as an override), while it remains true for `socratic.goalPrompt` (covered by (b)). Rewrite the bullet to distinguish the two fields explicitly; (a)/(c) above only touch the "To change a challenge prompt..." paragraph and the table entry — this Traps bullet is a separate piece of prose that would otherwise survive untouched and keep telling future authors their `confirmationChallenges[].goalPrompt` edits do nothing.
- [x] T026 [US2] Close OI-44 in `docs/open_issues.md` with a dated `✅ RESOLVED` status: title migration (T010–T016) + `goalPrompt` wiring (T017–T019) + corrected counts (15/15 lessons carry `goalPrompt`, 13/15 carry `goalPrompt_es`, measured 2026-07-30, superseding the stale "9 of 13, English only") + the audio-silence decision (FR-029) referencing `lesson-editor.md`'s new note from T025(c). Reference the two now-closed `agentic_QA_2026-07-25-0015.md` `[major]` findings as acceptance evidence.

**Checkpoint**: US2 fully functional and independently testable/shippable, alongside US1. OI-44 closed.

---

## Phase 5: User Story 3 - Lesson-board verification tooling fails loudly and tells you what it's actually checking (Priority: P2)

**Goal**: A malformed board input produces a clear failure row instead of crashing a verification run; the board-finder tool has a real `--help`; every matcher's production-detector-and-side is documented; the `REMEDIATED` exemption mechanism is deleted, not merely emptied.

**Independent Test**: Feed a deliberately malformed input to the verifier and confirm a clear failure, not a crash. Run the finder tool with `--help` and confirm it prints usage and exits 0 with no other arguments.

- [x] T027 [P] [US3] In `connect-four/server/scripts/verify_lesson_content.mjs`, wrap both `solver.query(...)` call sites (currently ~line 42, `await solver.query(soc.movestring)`, and ~line 51, `await solver.query(ch.moveString)`) in try/catch, converting a thrown error into a reported FAIL row for that one input and allowing the run to continue processing the remainder (FR-013).
- [x] T028 [US3] In `connect-four/server/scripts/find_lesson_boards.mjs`'s `main()`, add a `--help`/`-h` check as the very first thing done — before `createSolverProcess()` is called, so no solver process is ever spawned just to print help (house convention: exit 0 before required-arg validation). Print the tool's purpose, the available specs (`Object.keys(SPECS)`), the `tag:<classifier-tag>` form, `--count`/`--seed`/`--games` defaults, and `--check <movestring>`, then `process.exit(0)` (FR-014).
- [x] T029 [P] [US3] In `connect-four/server/scripts/find_lesson_boards.mjs`, add a doc comment above each `SPECS` matcher (`z_threat_gap3`, `z_threat_stacked`, `z_threat_socratic`, `undercut_t2_adjacent`, `same_parity_pair`, `overcut_active`, `overcut_shared_cell`, `fork_socratic_clean`, and the generic `tag:` branch that delegates to `classifyPattern` for `claimeven`/`figure_7`/`j_shape`/etc.) stating exactly which production pattern-detector, and which side of the board, it validates against — or, for the overcut pair, the honest "no single detector — hand-rolled geometry check" statement (FR-015). Confirm `undercut_t2_adjacent`'s existing OI-74 carve-out comment ("validated against `detectUndercutBeneficiary`, NOT against `detectUndercutVictim`") is intact and needs no change.
- [x] T030 [US3] In the `overcut_active`/`overcut_shared_cell` doc comments added in T029, add the explicit cross-lane decision: tightening/re-pointing these matchers to call `detectOvercut` directly is deferred until Epic 2 (Lane A) ships OI-76's `detectOvercut` perspective fix — record this as a code comment (not just in memory), per the "must not race Epic 2's fix" constraint (FR-016).
- [x] T031 [US3] **Decision 1 (2026-07-30) — Option B, every matcher except the overcut pair**: add a solver-optimal gate to `find_lesson_boards.mjs`'s search/curation output requiring the taught pattern's column be the true best move, applied to **every matcher except `overcut_active`/`overcut_shared_cell`** (deferred per T030, pending OI-76): `z_threat_gap3`, `z_threat_stacked`, `z_threat_socratic`, `undercut_t2_adjacent`, `same_parity_pair`, `fork_socratic_clean`, and the generic `tag:` branch. This applies to candidate-search output, not retroactively to already-shipped lesson content (FR-017 first half).
- [x] T032 [US3] Using `node server/scripts/find_lesson_boards.mjs <matcher> --check <movestring>` for every matcher gated in T031 (all except the overcut pair), re-check every currently-shipped lesson board sourced via the affected specs and record which (if any) fail the newly-tightened gate — do NOT edit, replace, or rewrite any lesson board's content as part of this task (FR-017 second half / NOT included boundary). **Flagging is this task's entire deliverable; fixing is explicitly out of scope** (the epic's NOT-included "writing new lessons" bars T032 from acting on its own findings). Hand the flagged list (even if empty) to T033.
- [x] T033 [US3] Write T032's flagged-board list into `docs/open_issues.md` as a new dated entry, **OI-108** ("Lesson boards flagged by the widened solver-optimal gate — human review pending"), listing each flagged board (lesson id, movestring, matcher, taught column vs. true-best column) and stating explicitly that no board content was altered as part of this task. If T032 found zero flagged boards, still file OI-108 recording a clean re-check — the date checked and the full matcher list covered — so the audit is traceable rather than silently absent.
- [x] T034 [US3] File a second new `docs/open_issues.md` entry, **OI-109**, for the root cause behind T032's findings: `find_lesson_boards.mjs`'s `SPECS` matchers are independent re-implementations of `classifier.js` pattern-detection concepts that measurably diverge from the production detectors they mirror (per this spec's Non-Obvious Facts: `z_threat_socratic`'s taught column was solver-optimal in only 25 of 50 sampled candidates). Propose refactoring so there is **one detector per concept** rather than a matcher/detector pair, replacing the current per-concept duplication. Note explicitly in the entry that spec 052 deliberately hardened the matchers in place (T029–T032) rather than unifying them, because unification is out of scope for this feature — this is an owner-requested tracked follow-up, not a task this spec implements.
- [x] T035 [P] [US3] In `connect-four/tests/unit/lessonContent.test.js`, delete the `REMEDIATED` set (currently ~line 23) and all three `if (!REMEDIATED.has(lesson.id)) continue;` guards at the strict-check call sites (currently ~lines 92/102/115) so the strict checks run unconditionally for all lessons; rewrite the file's header comment (currently line 3, "Strict checks apply only to lessons in REMEDIATED...") to describe the unconditional check instead (FR-018). Confirmed behavior-neutral: the set already lists all 15 current lesson ids.
- [x] T036 [US3] In `connect-four/server/scripts/verify_lesson_content.mjs` and its `validateLesson` logic, add support for a per-overlay `_overlayIntent` annotation on individual `overlays[]` entries (`{c, r, type, _overlayIntent?}`) that overrides the existing slide-level `_overlayIntent` default when present; slide-level stays as the inherited default, so the 6 existing usages (`lesson-01`, `lesson-02`, `lesson-07`, `lesson-08` ×4, `lesson-09`) require no edit (FR-019 first half). **Not `[P]` relative to T027** — both tasks edit `connect-four/server/scripts/verify_lesson_content.mjs`; land T027 first, then this task, to avoid two agents clobbering the same file.
- [x] T037 [US3] In `docs/architecture/lesson-editor.md`, document the per-overlay `_overlayIntent` schema added in T036: this mechanism is the node/overlay-level opt-out consumed by `verify_lesson_content.mjs`'s `overlayRows()` check (distinct from the `windowHighlights` capsule feature already documented under "Window highlights") — add a note there (or immediately adjacent, cross-referencing "Window highlights" so a reader who searches that section finds it) stating: a per-overlay `_overlayIntent` overrides the slide/socratic-node-level default when present; slide-level continues to serve as the inherited default for the 6 existing usages. `plan.md`'s Constitution Principle VIII checklist commits `tasks.md` to this documentation; T036 implements the schema but nothing previously documented it — the string `_overlayIntent` appears nowhere in `lesson-editor.md` before this task.
- [x] T038 [US3] Extend `connect-four/tests/unit/lessonContent.test.js`'s existing static scan for stray/dead content to also assert no `lesson.<lessonId>.title` i18n key survives in `en.json`/`es.json` for any current lesson id — a regression guard against US2's title migration, complementary to (not duplicating) `i18nKeyParity.test.js`'s symmetry check (FR-019 second half). **Hard dependency on T013** (US2's i18n key removal): before T013 lands, `en.json`/`es.json` still contain `lesson.<id>.title` keys and this assertion is red, not vacuously true — it does not "hold either way." If US3 is implemented before US2, this one task must wait for T013.
- [x] T039 [US3] File a new `docs/open_issues.md` entry, **OI-107**, for the deferred lesson-editor puzzle-existence check (confirming, at authoring time, that puzzles exist for a chosen confirmation category before an author saves), recording it as admin-only authoring-tool scope explicitly deferred out of this feature (FR-020).
- [x] T040 [US3] In `docs/architecture/lesson-editor.md`'s "Confirmation Challenges" section, correct the stale line "The editor does NOT verify that puzzles exist for the chosen category — that is Epic 6 scope." to instead point at OI-107 filed in T039 (FR-012 second half).
- [x] T041 [US3] Close OI-63 in `docs/open_issues.md` with a dated `✅ RESOLVED` status referencing T027 (try/catch), T028 (`--help`), T029/T030 (matcher docs + OI-76 deferral), T035 (REMEDIATED deletion), and T036/T037/T038 (`_overlayIntent` + its documentation + i18n-title scan). Also note, in the same entry or a cross-reference, that this story additionally filed OI-108 (T033) and OI-109 (T034) as new tracked backlog rather than resolving them here.
- [x] T042 [US3] Verify per `quickstart.md` §4: `node server/scripts/verify_lesson_content.mjs` completes even when a lesson has a temporarily-injected bad movestring (do not commit the injected fixture); `node server/scripts/find_lesson_boards.mjs --help; echo "exit=$?"` prints usage and exits 0 with zero other args; read `lessonContent.test.js` to confirm the `REMEDIATED` set and its three guards are fully gone, not merely emptied.

**Checkpoint**: US3 fully functional and independently testable/shippable, alongside US1/US2 (subject to T038's hard dependency on US2's T013 if run out of priority order). OI-63 closed; OI-107, OI-108, OI-109 newly filed.

---

## Phase 6: User Story 4 - Editor cosmetics, and the capsule-tinting question is closed as a decision (Priority: P3)

**Goal**: `infoProse` renders in the editor's standard font; the `aria-label` ambiguity is left unaddressed with a recorded reason; OI-68 is closed as a recorded non-fix decision; OI-69 is closed alongside it.

**Independent Test**: In the lesson-authoring tool, confirm `infoProse` matches the editor's font family; confirm `docs/open_issues.md`'s OI-68 entry is closed with the "overlays kept as-is" rationale, not left open or marked as a code fix.

- [x] T043 [US4] Read `connect-four/src/components/admin/SlideEditor.jsx` in full around the `infoProse` free-text `<textarea>` and the adjacent coach-message textarea (which OI-69 states already sets `fontFamily: 'inherit'`) to confirm the exact mismatch before editing — do not assume the fix location sight-unseen. Then set `fontFamily: 'inherit'` on the `infoProse` textarea so it renders in the same font family as the rest of the editor (FR-021), or, if inspection shows the mismatch is already intentional/absent, document that finding instead of making a no-op change.
- [x] T044 [US4] Record the reason the multi-board `aria-label` ambiguity is left unaddressed (no broader accessibility pass is separately commissioned as part of this feature) as a short note near the relevant `aria-label`-generating code (e.g. `getColumnA11yProps` or wherever multi-board labels are built) or in `docs/architecture/lesson-editor.md`, so the reasoning lives in-repo, not only in this spec (FR-022).
- [x] T045 [US4] Close OI-68 in `docs/open_issues.md` with a dated `✅ RESOLVED` status recording the decision: window-highlight capsule overlays are kept exactly as they render today, on the stated assumption that authored slides do not have overlapping overlays; explicitly note no rendering code changed (FR-023).
- [x] T046 [US4] Close OI-69 in `docs/open_issues.md` with a dated `✅ RESOLVED` status referencing T043 (`infoProse` font-family fix or documented no-op finding) and T044 (the recorded, unaddressed-by-decision `aria-label` ambiguity). The US4 checkpoint and T062's audit grep (`^## OI-6[2389]`) both expect OI-69 resolved with a date; previously no task in this story closed it — only OI-68 was closed (by the task now numbered T045).
- [x] T047 [US4] Manual verification per `quickstart.md` §5: open `/admin/lessons`, edit a slide's `infoProse` field, confirm it renders in the same font as the adjacent coach-message field; confirm `docs/open_issues.md`'s OI-68 entry reads `✅ RESOLVED <date>` with the "overlays kept as-is" rationale and the "no rendering code changed" note; confirm OI-69 also reads `✅ RESOLVED <date>`.

**Checkpoint**: US4 fully functional and independently testable/shippable, alongside US1/US2/US3. OI-68 and OI-69 closed.

---

## Phase 7: User Story 5 - Remaining hardcoded strings, a namespace safety net, and two KB fixes (Priority: P3)

**Goal**: Remaining hardcoded English strings (starting with `PlayOnlineScreen.jsx`) are translatable; a guard prevents a lesson id from colliding with a reserved `lesson.*` i18n sub-path; two KB content edits ship and sync; the stale KB Spanish-summary count is corrected without performing the bulk translation.

**Independent Test**: Switch the app to Spanish and confirm the previously-hardcoded strings now render in Spanish; attempt to introduce a colliding lesson id and confirm the guard fails clearly.

- [x] T048 [US5] Grep `connect-four/src/screens` and `connect-four/src/components` for literal `title=`, `aria-label=`, and hardcoded button/label-child English strings not already routed through `t()`, beyond `PlayOnlineScreen.jsx`'s two known `title="Play Online"` occurrences (currently lines 428 and 522) — produce an inventory list before fixing anything (OI-19's own text says other screens were not exhaustively audited). **Decision 2 (2026-07-30) — scope boundary, state it explicitly in the inventory**: this sweep is **learner-facing only**. In scope: `PlayOnlineScreen.jsx:428,522` ("Play Online") and `CoachDialog.jsx:116,127` ("Replay narration", "Stop narration"). Out of scope, filed as a note on the OI-19 closeout instead of fixed here: the admin-only literals in `CandidateDashboard.jsx` and `admin/PuzzlePickerRow.jsx` (6 literals — "Move up"/"Move down"/"Remove"/"Puzzles need reindexing" — plus 4 `aria-label` literals), since the project already treats admin tooling as English-only and this keeps a P3 story small.
- [x] T049 [US5] Wire `connect-four/src/screens/PlayOnlineScreen.jsx`'s two hardcoded `title="Play Online"` occurrences (T048's confirmed lines) through a new i18n key (e.g. `playOnline.title`) added to both `connect-four/src/i18n/en.json` and `es.json` (FR-024).
- [x] T050 [P] [US5] Wire `CoachDialog.jsx:116,127`'s "Replay narration"/"Stop narration" strings (T048's confirmed learner-facing scope) through new i18n keys in both `en.json` and `es.json` (FR-024).
- [x] T051 [US5] Add a namespace-collision guard to `connect-four/tests/unit/i18nKeyParity.test.js` (or a new sibling test file) asserting no current lesson `id` collides with a reserved `lesson.*` sub-key — enumerate the reserved set (`lesson.node`, `lesson.confirmation`, `lesson.windowCounts`, and any others present) by inspecting `en.json`'s `lesson.*` subtree for non-lesson-id children at test-write time, not by hardcoding today's three from memory (FR-025/OI-73). Depends on T013 for a clean enumeration (see T013's note): a leftover empty `lesson.<id>: {}` object from an incomplete title removal would otherwise appear as a spurious non-lesson-id child.
- [x] T052 [US5] If T051 added a new test file (rather than extending `i18nKeyParity.test.js` in place), register it in `connect-four/package.json`'s `test:fast` script string (FR-031) — confirm via `grep -o '"test:fast":.*' connect-four/package.json`.
- [x] T053 [P] [US5] Edit `docs/knowledge-base/allen-j-configuration.md`'s `3334434` worked example: change `solver_verified` from `PENDING` (currently ~line 94) to a verification date/value, matching the pattern of the second worked example that already shows `solver_verified: true` (~line 106) (OI-62 edit 1).
- [x] T054 [P] [US5] Edit `docs/knowledge-base/community-figure-7.md` to add a note that the `gravity_top_count >= 2` filter (currently ~lines 59-63) is dead code for same-column adjacent-row threats (OI-62 edit 2).
- [x] T055 [US5] Run `cd connect-four && npm run sync-kb` to propagate T053/T054's edits into `connect-four/server/kb/`; confirm via `git diff --stat connect-four/server/kb/` that both edits landed, and that `tests/unit/kbSync.test.js` still passes (FR-026).
- [x] T056 [US5] Correct the stale KB `short_summary_es` coverage count wherever currently stated: `docs/open_issues.md`'s OI-38 entry body (currently "45 of 49") to the re-verified 47 entries / 4 with `short_summary_es` / 43 missing (excluding `README.md` and `_sketches.md`), leaving OI-38 open with a dated `**UPDATE**` noting the count is corrected and translation is deferred to a standalone content spec — do NOT mark OI-38 resolved (FR-027/SC-008).
- [x] T057 [US5] Close OI-19 with a dated `✅ RESOLVED` status referencing T048–T050 and explicitly noting, per Decision 2, that the admin-only literals identified in T048's inventory were scoped out and remain untranslated by owner decision (not an oversight); close OI-73 with a dated `✅ RESOLVED` status referencing T051–T052; close OI-62 with a dated `✅ RESOLVED` status referencing T053–T055.
- [x] T058 [US5] Manual verification per `quickstart.md` §6: switch the app to Spanish and confirm "Play Online" and the coach-dialog narration controls (T049/T050) now render in Spanish; attempt to introduce a lesson id colliding with a reserved `lesson.*` sub-key (e.g. a temporary, uncommitted `lessons/lesson-16-node.json` with `"id": "node"`) and confirm T051's guard test fails clearly; confirm the KB sync diff from T055 shows both edits.

**Checkpoint**: US5 fully functional and independently testable/shippable, alongside all other stories. OI-19, OI-73, OI-62 closed; OI-38 corrected-but-open.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Full-suite regression and closeout audit across all five stories together, per SC-007/SC-008.

- [x] T059 Run `cd connect-four && npm run test:fast && npm run test:dom` with all five stories' changes present and confirm both are 100% green (SC-007).
- [x] T060 Run `node connect-four/server/scripts/audit_answer_ambiguity.mjs` and confirm it still reports 39/39 (the full Socratic-node-plus-confirmation-board audit, distinct from and larger than the 15 lesson files) (SC-007).
- [x] T061 Run `grep -o '"test:dom":.*\|"test:fast":.*' connect-four/package.json` and confirm every test file added or modified across T005–T006, T020–T021, T035/T038, T051–T052 is present in the correct script string — a file present on disk but absent from both strings passes silently with zero coverage and is not caught by T059 (FR-031 final audit).
- [x] T062 Run `grep -n "^## OI-4[46]\|^## OI-6[2389]\|^## OI-73\|^## OI-19\|^## OI-38\|^## OI-10[789]" docs/open_issues.md` and confirm every entry's status line matches the closure/UPDATE convention: OI-46/44/63/69/19/73/62 resolved with a date; OI-68 resolved specifically as a recorded decision; OI-38 left open with the corrected count and an explicit "translation deferred to a standalone spec" note; OI-107 (T039), OI-108 (T033), OI-109 (T034) each exist as newly-filed tracked backlog with a dated entry — these three are **filed, not resolved**, by this feature (SC-008).
- [x] T063 Perform the full `quickstart.md` walkthrough (§§1–8) end-to-end with all five stories' changes present together, as the final acceptance pass for this feature.

**Architecture documentation** (Constitution Principle VIII): all documentation tasks required by this feature are already embedded in their owning story above (T007 lesson-editor.md/OI-46; T015/T016/T025/T026 lesson-editor.md/OI-44/SC-002; T029/T030/T037/T039/T040/T041 lesson-editor.md/find_lesson_boards.mjs/OI-63/OI-107/OI-108/OI-109; T044/T045/T046 lesson-editor.md/OI-68/OI-69; T056/T057 open_issues.md) — no additional cross-cutting doc task is needed beyond T062's audit that they all landed.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — T001 only, run first.
- **User Stories (Phase 3–7)**: All depend on Phase 1 (a confirmed green baseline) only. No shared foundational phase exists — the five stories touch **almost entirely disjoint** files (US1: `SocraticScreen.jsx` + its DOM tests; US2: title call sites + `ChallengeScreen.jsx` + i18n; US3: two server scripts + `lessonContent.test.js`; US4: `SlideEditor.jsx`; US5: `PlayOnlineScreen.jsx`/`CoachDialog.jsx` + KB docs + i18n) and can proceed in parallel or in any order **with one named exception**: US2 and US3 both write i18n-title state — US2's T013 deletes the `lesson.<id>.title` i18n keys, and US3's T038 asserts their absence. T038 has a hard dependency on T013 (see User Story Dependencies below); every other pair of stories is genuinely independent.
- **Polish (Phase 9)**: Depends on all five user stories being complete.

### User Story Dependencies

- **US1 (P1)**: No dependency on other stories. Independently shippable after Phase 1.
- **US2 (P1)**: No dependency on other stories. T013 (i18n key removal) depends only on T010–T012 (US2-internal). Independently shippable after Phase 1.
- **US3 (P2)**: No dependency on other stories for its own priority ordering, **except T038 (i18n-title static scan), which has a hard dependency on US2's T013**. Before T013 lands, `en.json`/`es.json` still contain `lesson.<id>.title` keys and T038's "no such key survives" assertion is red for real, not vacuously true — it does not "hold either way." If US3 is worked before or in parallel with US2, sequence T038 specifically to land after T013 (all of T038's sibling US3 tasks remain unblocked). US5's T051 has the same T013 dependency for the same reason (a leftover empty `lesson.<id>` object would pollute its reserved-key enumeration).
- **US4 (P3)**: No dependency on other stories.
- **US5 (P3)**: No dependency on other stories, except T051 → T013 (see above).

### Within Each User Story

- Verification/read-first tasks (T002, T009, T017's verification step, T022, T043, T048) precede the edits they inform.
- Source edits precede the tests that exercise them, which precede test-file registration, which precedes manual/live verification, which precedes the `docs/open_issues.md` closeout write for that story.

### Parallel Opportunities

- All Setup tasks marked [P]: none beyond T001 itself.
- Once Phase 1 completes, US1/US2/US4/US5 can all start in parallel; US3 can start in parallel too, but its T038 (and US5's T051) must wait for US2's T013.
- Within US1: T003 and T005 are [P] (different files, `SocraticScreen.jsx` vs. new test file).
- Within US2: T010, T011, T012 are [P] (three different screen files); T017 is [P] relative to the title-migration tasks (different concern in the same broad story, no shared file until T018).
- Within US3: T027, T029, T035 are [P] (different files, no interdependency). T036 is **NOT** [P] — it shares `verify_lesson_content.mjs` with T027; sequence it after T027 lands.
- Within US5: T050, T053, T054 are [P] (different files).

---

## Parallel Example: User Story 2

```bash
# Launch the three independent title call-site edits together:
Task: "Replace lesson.<id>.title lookup with lesson.title in connect-four/src/screens/SocraticScreen.jsx"
Task: "Replace lesson.<id>.title lookup with lesson.title in connect-four/src/screens/ConceptScreen.jsx"
Task: "Replace lesson.<id>.title lookup with lesson.title in connect-four/src/screens/SagaScreen.jsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (T001).
2. Complete Phase 3 (US1, T002–T008).
3. **STOP and VALIDATE**: `npm run test:dom` green, manual split V7 walkthrough confirms the fix, OI-46 closed.
4. This is a legitimate standalone deploy — the epic's headline "coach appears to stop reacting" bug is fixed with nothing else touched.

### Incremental Delivery

1. Phase 1 → baseline confirmed.
2. US1 (P1) → validate independently → ship (MVP).
3. US2 (P1) → validate independently → ship.
4. US3 (P2) → validate independently → ship (T038 waits on US2's T013 having already shipped, which it has by this point in the incremental order).
5. US4 (P3) → validate independently → ship.
6. US5 (P3) → validate independently → ship (T051 likewise benefits from US2 already having shipped).
7. Phase 9 → full-suite + closeout audit across everything shipped.

### Parallel Team Strategy

With multiple developers, after Phase 1:
- Developer A: US1 (Socratic hint/phase)
- Developer B: US2 (title + goalPrompt) — largest story, may itself split T009–T016 (title) from T017–T026 (goalPrompt) between two people since they touch disjoint files after T009
- Developer C: US3 (verifier/finder hardening) — **hold T038 until Developer B's T013 lands**; everything else in US3 (T027–T037, T039–T042) is unblocked from Phase 1 alone
- Developer D: US4 + US5 (both small, P3, no shared files) — **hold T051 until Developer B's T013 lands** for the same reason as Developer C's T038

Phase 9 is the point requiring everyone's work to be present simultaneously; T038 and T051 are the two narrower, earlier ordering constraints within it.

---

## Notes

- [P] tasks = different files, no dependency on an incomplete task in the same phase.
- [Story] label maps every user-story-phase task to US1–US5 for traceability against spec.md.
- `npm run test:fast` is the correct fast-CI command inside `connect-four/` — never `npm test` (which includes `candidate-generator.test.js`, real-solver, 10+ minute hang risk).
- Every task that adds a new test file has a paired registration task (FR-031) immediately after it — do not skip the registration task even if it looks redundant; `test:dom`/`test:fast` are hardcoded file lists, not globs, and an unregistered file silently never runs.
- FR-029's audio-silence check has two tiers (automated call/no-call assertion + mandatory real-browser audio-ON manual pass); neither substitutes for the other, and the automated-only tier must never be reported as full verification. **This repetition (T020c, T024, and the note above) is intentional — do not consolidate it into a single mention.**
- No lesson content is authored, replaced, or re-tiered by any task above — where US3's tightened gate (T031/T032) flags an already-shipped board, the task is to flag it (T032), track it (T033/OI-108), and separately track the root cause (T034/OI-109) — never to fix it.
- Every `docs/open_issues.md` closeout task follows the existing `**Status**: ✅ RESOLVED <date>` / dated `**UPDATE**` convention already used in that file — do not invent a new format. The three newly-**filed** entries (OI-107, OI-108, OI-109) use whatever "new entry" convention that file already uses for open, untriaged backlog — they are not closed by this feature.
