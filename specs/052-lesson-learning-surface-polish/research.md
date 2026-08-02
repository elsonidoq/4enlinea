# Research: Lesson Learning Surface & Authoring Polish (spec 052)

All decisions below were either already settled by the epic (`docs/epics/open-issues-epics.md`
§"Epic 6") or resolved here by reading the current source. Per repo convention, line numbers are
approximate — locate by symbol; several drifted even during this planning pass (e.g. the claimeven
lesson file is `lesson-08-claimeven.json` today, not `lesson-05-claimeven.json` as the QA doc's
2026-07-25 snapshot names it).

## US1 — Socratic hint/phase interaction

**Decision**: `useEffect(() => setShowHint(false), [phase])` inside `SocraticScreen.jsx`, per
Epic 6 Settled decision 6 (hint yields to phase). No coexistence of hint and phase messages.

**Verified at source**: `connect-four/src/screens/SocraticScreen.jsx`
- `showHint` is `useState(false)` (currently line 27), set by the Hint button, never reset.
- Message selection (currently line 118): `socratic?.messages?.[showHint ? 'hint' : phase] ?? []`
  — confirms the short-circuit is real and current.
- The narration effect (currently lines 125-133) has `showHint` in its dep array already, so
  resetting `showHint` on phase change will also correctly re-trigger narration for the `correct`
  phase without further changes to the narration effect itself.
- Continue button logic keys off `phase` directly (not `showHint`) — confirmed no regression risk
  there; AC4 is a regression guard, not a required code change.

**Alternatives considered**: Let hint and phase messages coexist (append hint text below the phase
message). Rejected — the epic's Settled decision 6 is explicit and cites the 120px coach-bubble cap
(`project_lesson_text_overflow_traps`): appending would push the reward text below the visible
fold, defeating the fix's own purpose.

**Test**: new `tests/dom/SocraticHintPhase.dom.test.jsx` (or extend an existing Socratic DOM test)
drives Hint → correct-move and asserts the rendered bubble text is the `correct` message, not the
hint text, plus a narration-triggered assertion (the effect's speak call fires with the `correct`
text). A second case: Hint → wrong move asserts hint text is not visible alongside the wrong-move
message. A third case (regression guard): no-Hint → correct-move renders `correct` unchanged.

**Existing test encodes the bug being removed — must be rewritten, not left alone**: verified at
source, `connect-four/tests/dom/SocraticNarration.dom.test.jsx`'s "run 2" case (currently
~lines 219-221) and its header comment (currently ~lines 10-14) are written *around* OI-46 and
label the unreachable `correct` message "a known, accepted" behavior. `SocraticScreen.jsx`'s
in-source comment (currently ~lines 116-117) reads "it is sticky by design — see the plan's D2",
citing a prior spec's decision record that FR-001 explicitly overturns; nothing in spec 052 retracts
that comment on its own, so it must be edited in the same change. Per the project's "a wrong test is
part of the bug" convention, this rewrite is a US1 task, not something discovered mid-implementation.
Sequence it early: run the existing test *before* touching `SocraticScreen.jsx` so the implementer
learns whether it's a red gate (fails once `showHint` starts resetting) or a silent-rot problem
(still passes but now asserts the wrong thing) — this was not run as part of this planning pass, so
which of the two it is remains unverified and should be established first, not assumed.

**Test-file registration — silent-never-runs risk**: `connect-four/package.json`'s `test:dom` and
`test:fast` scripts are hardcoded, space-separated file-name lists, not directory globs (verified at
source: `grep '"test' connect-four/package.json`). `test:dom` currently enumerates exactly 10 files;
`test:fast` contains zero `tests/dom/` entries. A new `tests/dom/SocraticHintPhase.dom.test.jsx`
(or whatever name is chosen) MUST be added to `test:dom`'s string in the same change that adds the
file, or SC-001 is vacuously satisfied by a test that CI never executes. This is an explicit task,
not an assumed side effect of creating the file.

## US2 — Lesson title consolidation + goalPrompt wiring

### Title migration

**Decision**: Move `title` sourcing off `t('lesson.<id>.title', {defaultValue})` entirely; every
call site reads `lesson.title` directly from the lesson JSON (already fetched via
`GET /api/lessons/:id` / `GET /api/lessons`, unaffected by localization since
`docs/architecture/lesson-editor.md` states "Do NOT localize `title`" — that constraint is
unchanged, only the *source* moves).

**Verified at source** — three call sites, confirmed current (drifted from the epic's line numbers
but the fallback asymmetry is exactly as documented):
- `src/screens/SocraticScreen.jsx:201` — `title={t(`lesson.${lessonId}.title`, { defaultValue: '' })}`
  — **blank fallback**, the dangerous one.
- `src/screens/ConceptScreen.jsx:183` — `title={t(`lesson.${lessonId}.title`, { defaultValue: lesson.title })}`
- `src/screens/SagaScreen.jsx:114` — `{t(`lesson.${lesson.id}.title`, { defaultValue: lesson.title })}`

All three must change to read `lesson.title` (no `t()` call, no i18n key) so behavior is uniform
and the i18n key removal (FR-011) can't blank `SocraticScreen`'s TopBar.

**i18n key removal**: `lesson.<id>.title` keys in `src/i18n/en.json` / `es.json` are removed once
all three call sites no longer reference them. `tests/unit/i18nKeyParity.test.js` continues to pass
trivially (fewer keys, still symmetric) — confirm by running it, not assuming.

**`lesson-editor.md` correction**: its own "Do NOT localize `title`... a `title_es` would be a
second, silently-losing source" guidance is still correct (no `title_es` is introduced — Spanish
titles are out of scope, matching current behavior where `lesson.<id>.title` has no `_es` variant
either), but its "Titles come from the i18n key `lesson.<id>.title`... There is no `title_es`"
paragraph (§"Curriculum ordering") must be rewritten to say titles come from the lesson JSON's own
`title` field.

### goalPrompt wiring

**Decision, resolved by reading the code** (not explicit in the epic at this granularity — this is
the one real design decision this plan adds): `FR-006`'s "per-lesson override... for a Socratic/
confirmation exercise" resolves, in the current codebase, to **`confirmationChallenges[].goalPrompt`
only**. `socratic.goalPrompt` also exists (verified: `lessons/lesson-08-claimeven.json`'s
`socratic` object has both `goalPrompt`/`goalPrompt_es` fields) but has **no equivalent unwired
consumer to fix** — `SocraticScreen`'s "ask" message is already lesson-owned, sourced from
`socratic.messages.ask` (confirmed in `lesson-editor.md`'s "Fields the learner UI ignores" table
and structurally: `messages.ask` is authored per-lesson prose, not a shared
`coach.spoken.<category>.*` pool lookup). There is nothing analogous to "the shared prompt" for the
interactive Socratic phase for `goalPrompt` to override.

**Consequence**: `socratic.goalPrompt` stays authored-but-unrendered after this spec ships. This
must be an explicit, documented decision (not a silent gap) per the "Verify a negative claim at
source" Settled decision — `lesson-editor.md`'s "Fields the learner UI ignores" table entry for
`socratic.goalPrompt` is corrected to state it plainly: distinct from `confirmationChallenges[].
goalPrompt` (now wired), `socratic.goalPrompt` remains unused because `socratic.messages.ask`
already serves that role per-lesson.

**Verified the actual dead path**: `src/screens/ChallengeScreen.jsx`
- Prompt selection (currently lines 116-118): builds `candidateKeys` from
  `coach.spoken.${effectiveCategory}.prompt.{0,1,2}` and picks one at random — no `goalPrompt`
  consulted at all.
- The lesson-mode inline-challenge mapping (currently ~lines 154-167, `confirmationChallenges.map`)
  builds `{ id, category, move_string, interaction_mode, highlight_metadata, correct_col,
  user_player }` — **`goalPrompt` is dropped here**, confirming the QA finding's root cause
  ("the inline challenge mapping ... drops `goalPrompt` entirely").

**Fix shape**:
1. Thread `goalPrompt` (already localized server-side by `localizeLesson` — the client never sees
   `_es`, just the locale-resolved string) through the inline-challenge mapping into the puzzle
   object the rest of `ChallengeScreen` already carries per-puzzle.
2. At the prompt-selection call site, prefer the current puzzle's `goalPrompt` when present and
   non-empty; fall back to the existing random `coach.spoken.<category>.prompt.*` pick when absent
   — satisfying FR-006/FR-007 exactly as an `if goalPrompt then override else existing-pool` branch,
   not a rewrite of the pool mechanism.
3. The shared pool itself is untouched (FR-008) — only the DB-drawn, non-lesson puzzle path (no
   `goalPrompt` field ever exists on a bare DB puzzle row) is structurally guaranteed to keep using
   it.

**QA findings verified as reproducible today** (both against the *current* filenames, confirmed
solver rows in `agentic_QA_2026-07-25-0015.md` are from 2026-07-25 — re-verify against
`lesson-08-claimeven.json`'s current movestrings before writing the fix's acceptance test, since
lesson content may have been re-shuffled since the QA snapshot):
- claimeven: on-screen prompt says "secure a draw" on a solver-**won** board; the lesson JSON's
  `confirmationChallenges[0].goalPrompt` already states the corrected, win-framed text.
- undercut: on-screen prompt says "find the undercut" (points at the column the grader rejects);
  the lesson JSON's `goalPrompt` already says "play any other column."

**Test**: extend or add a `ChallengeScreen` DOM/unit test that renders the lesson-mode confirmation
flow for a puzzle carrying a `goalPrompt` and asserts that exact text renders (not a
`coach.spoken.*` pool string), plus a case with no `goalPrompt` asserting the pool string still
renders (regression guard, FR-007). A live-app acceptance pass against the claimeven and undercut
lessons closes SC-003.

### goalPrompt audio desync — the override must also silence the mismatched clip (FR-029)

**Problem, verified at source**: the fix shape above only covers the *displayed* text. `ChallengeScreen.jsx`'s
`initPuzzle` sets **two** refs from the same `pickedKey` (currently lines 123-127):
```js
promptKeyRef.current = pickedKey;
...
lastCoachKeyRef.current = pickedKey;
setCoachMessages([{ text: t(pickedKey), mood: 'happy', ... }]);
```
and a separate effect (currently lines 202-207) fires narration off the second ref:
```js
useEffect(() => {
  if (lastCoachKeyRef.current) speakCoachMessage(lastCoachKeyRef.current);
}, [coachMessages.length]);
```
`speakCoachMessage` (`src/lib/useCoachSpeech.js:188+`) is strictly key-based — `keyToSlug(key)` →
manifest lookup → pre-generated mp3 — it cannot speak arbitrary text. If the override branch swaps
only the *text* shown at the prompt-selection call site and leaves `lastCoachKeyRef.current` pointed
at `pickedKey`, the narration effect still plays the old generic clip: the learner reads the
lesson's corrected `goalPrompt` (e.g. the win-framed claimeven text) while hearing the old
"secure a draw" audio — the exact wrong-framing bug FR-009 exists to remove, moved from screen to
speaker. This fires 100% of the time an override renders, for every lesson, until fixed.

**Decision (settled 2026-07-30)**: silent, not mis-spoken. When a `goalPrompt` override is present,
the fix sets `lastCoachKeyRef.current = null` at the same call site instead of leaving it pointed at
`pickedKey` — correct text on screen, no audio for that message. Generating a matching audio clip for
the override text is explicitly out of scope ("Generating any audio (Epic 5)" in the epic's
NOT-included section) — pulling synthesis into this spec was rejected for that reason; keeping the
mismatched generic clip was rejected because it re-ships the exact contradiction FR-009/FR-010 close.

**Verification**: add a DOM/unit assertion that no `coach.spoken.*.prompt.*` clip is requested from
`speakCoachMessage` when a puzzle with a `goalPrompt` override renders (assert on the call/no-call to
the narration hook, not on audible playback). The live-app quickstart check for this must run with
audio **ON** in a real, non-automated browser session — per memory `project_app_qa_setup_gotchas`,
automation Chrome fakes autoplay and ships audio silent regardless of code correctness, so an
automated browser pass cannot distinguish "correctly silenced" from "audio just didn't play under
automation" and must not be used as evidence for this check.

**Documentation**: record "override prompts are silent until Epic 5 synthesizes them" as a stated
decision in `docs/architecture/lesson-editor.md` (near the `goalPrompt` override documentation added
for FR-012) and in the OI-44 closeout note in `docs/open_issues.md`.

## US3 — Verifier/finder hardening

**Decision**: wrap each `solver.query(...)` call site in try/catch inside
`verify_lesson_content.mjs`, converting a thrown error into a FAIL row for that one input (not a
process-level crash). Both call sites (currently lines 42 and 51,
`await solver.query(soc.movestring)` / `await solver.query(ch.moveString)`) need the wrap.

**Verified**: neither call site currently has a try/catch around it (grep confirms no `try`/`catch`
tokens in the file) — the crash-on-bad-movestring defect is real, not stale.

**`--help` for `find_lesson_boards.mjs`**: `main()` (currently starting ~line 293) parses
`process.argv.slice(2)` and, when `specArg` doesn't match `SPECS` or a `tag:` prefix, prints
`Unknown spec "..."` and `process.exit(2)` (confirmed current: line ~349) — this is exactly OI-63
item 5's repro. Fix: check for `--help`/`-h` as the **very first** thing in `main()`, before
`createSolverProcess()` is called (a solver process must never be spawned just to print help,
matching the house convention "exit 0 before required-arg validation") — print purpose, the spec
list (`Object.keys(SPECS)`), the `tag:<classifier-tag>` form, `--count`/`--seed`/`--games`
defaults, and `--check <movestring>`, then `process.exit(0)`.

**Per-matcher detector-and-side documentation**: verified current `SPECS` keys via source read:
`z_threat_gap3`, `z_threat_socratic`, `undercut_t2_adjacent` (already carries the OI-74 carve-out
comment — verified in place: "validated against `detectUndercutBeneficiary`, NOT against
`detectUndercutVictim`"), `overcut_active`, `overcut_shared_cell`, plus the `tag:<classifier-tag>`
generic branch (delegates to `classifyPattern`, used for `claimeven`/`figure_7`/`j_shape`/etc. via
the tag mechanism, not a named `SPECS` entry). Per Epic 6's Non-obvious facts, only
`undercut_t2_adjacent` has been fixed/documented; `z_threat_socratic`, the `overcut_*` pair (and, by
extension, `claimeven`/`figure_7` via the `tag:` mechanism) still need an explicit code-comment
statement of "which production detector, which side."

**Overcut cross-lane dependency (OI-76)**: `overcut_active`/`overcut_shared_cell` do not call
`detectOvercut` directly (they hand-roll gravity-top/adjacency checks against `board.
reachableThreats`), but conceptually validate the same shape `detectOvercut` is meant to detect, and
OI-76 (Epic 2, Lane A, running concurrently) is fixing that detector's unsound `perspective`
argument. **Decision**: defer tightening/re-pointing the overcut matchers to a production detector
call until Epic 2 ships OI-76 — record this explicitly as a code comment plus a task-level note in
`tasks.md`, not a silent no-op. This spec must not race Epic 2's fix (repo instruction, restated
from the epic's Non-obvious facts).

**Solver-optimal gate for the tightened matchers**: per Epic 6 US6.3, add a check requiring the
matched pattern's column be solver-optimal for the matchers being hardened this pass
(`z_threat_socratic` is explicitly named — 25/50 candidates fail today per the epic's own
measurement). **Decision**: this gate applies to `find_lesson_boards.mjs`'s search/curation output
(a tool that scores/ranks *candidate* boards), not to already-shipped lesson content — an
already-shipped board that would now fail the tightened gate is flagged (a FAIL row from a
`--check <movestring>` re-run), never auto-replaced, per FR-017/NOT-included. Concretely: this
spec's task list re-runs `--check` against every currently-shipped board sourced via the affected
specs and records which (if any) fail, but does not edit lesson content to fix them — that is
explicitly out of scope (epic: "Writing new lessons... is a content edit and must not silently
expand into a new lesson pass").

**REMEDIATED gate — settled 2026-07-30**: `tests/unit/lessonContent.test.js`'s `REMEDIATED` set
(currently ~line 23) is confirmed still populated with lesson ids (all 15, per the epic's "every
lesson is in it" claim). **Decision: delete the gate entirely.** Remove the `REMEDIATED` set and the
three `if (!REMEDIATED.has(lesson.id)) continue;` guards at the strict-check call sites (currently
~lines 92/102/115) so the strict checks run unconditionally. Confirmed at source: the set already
lists all 15 lesson ids, so deletion is behavior-neutral today. Deletion, not a permanently-empty
named constant (`const NO_EXEMPTIONS = new Set()`), was chosen because it is the only option that
makes adding a future exemption *impossible* rather than merely discouraged by convention — an empty
named set is still one line away from silently gaining an entry. The file's header comment (line 3:
"Strict checks apply only to lessons in REMEDIATED; each remediation task adds its lesson id.") must
be rewritten in the same change to describe the unconditional check instead. This is now a settled
decision, not an open tasks.md decision point.

**i18n lesson-title static scan (FR-019)**: `lessonContent.test.js` currently scans lesson JSON
copy for stray/dead content but not i18n `lesson.<id>.title` keys. Since US2 removes those keys
entirely, this extension becomes: assert no `lesson.<lessonId>.title` key survives in either
`en.json`/`es.json` for any current lesson id (a regression guard against the title migration
regressing, complementary to, not overlapping with, `i18nKeyParity.test.js`'s symmetry check).

**`_overlayIntent` per-overlay (FR-019 first half) — settled 2026-07-30**: currently `_overlayIntent`
is per-slide (`verify_lesson_content.mjs`'s opt-out, `docs/architecture/testing-conventions.md`
confirms "opt out per slide with `_overlayIntent: "annotation"`"). **Decision: slide-level inherits,
per-overlay overrides.** Keep the existing slide-level `_overlayIntent` as an inherited default and
add a narrower per-overlay `_overlayIntent` on individual `overlays[]` entries
(`{c, r, type, _overlayIntent?}`) that overrides it where present. This is backward compatible — the
6 existing usages across 5 lesson files (`lesson-01`, `lesson-02`, `lesson-07`, `lesson-08` ×4,
`lesson-09`, verified by grep across all 15 lesson files) need no edit, since an absent per-overlay
value simply falls through to the existing slide-level default. This satisfies FR-019's "a slide
mixing annotation and threat overlays can opt individual cells out" requirement at zero risk of
manufacturing out-of-scope content-authoring work on the 6 existing usages. No longer an open
task-level decision — implement the inherit/override read-path directly in
`verify_lesson_content.mjs` and `validateLesson`.

**New OI entry for lesson-editor puzzle-existence check**: per Epic 6 Settled decision 7 / Deferred
section, file a new `docs/open_issues.md` entry (this spec's FR-020) and correct
`lesson-editor.md`'s "Confirmation Challenges" section's stale "that is Epic 6 scope" line (verified
current: `docs/architecture/lesson-editor.md`'s "Confirmation Challenges" section ends with "The
editor does NOT verify that puzzles exist for the chosen category — that is Epic 6 scope.") to
point at the new OI entry instead.

## US4 — Editor cosmetics + OI-68 closeout

**Decision**: `fontFamily: 'inherit'` on the `infoProse` `<textarea>` in `SlideEditor.jsx` (OI-69
item 1's own suggested one-line fix — verified plausible without reading the exact JSX, since the
coach-message textarea already sets `fontFamily: 'inherit'` per OI-69's own description of what
changed to create the mismatch). No functional/rendering change to `Board.jsx` or `windowHighlights`
capsule rendering at all (OI-68 is closed as a decision, not a code fix, per Epic 6 Settled decision
and NOT included).

**`aria-label` ambiguity**: left unaddressed; FR-022 requires only that the reason be recorded (in
this plan/spec's Out of Scope language, already satisfied by the spec text — the implementation
task is to make sure that reasoning also lands in-repo, e.g. a short note near
`getColumnA11yProps` or in `lesson-editor.md`, not just in the spec).

**OI-68 closeout**: a `docs/open_issues.md` edit only — no source file touched. Status line becomes
`✅ RESOLVED <date>` (Epic 6 explicitly frames this as "resolved... as a recorded decision") with a
dated note: overlays kept as-is, assuming authored slides have no overlapping overlays, no rendering
code changed.

## US5 — String/KB coverage

**Decision**: wire `PlayOnlineScreen.jsx`'s two hardcoded `title="Play Online"` occurrences
(currently lines 428 and 522 — confirmed both instances still present) through a new i18n key in
both `en.json`/`es.json`. A broader sweep of `src/screens`/`src/components` for other literal
`title=`/`aria-label=`/button-child strings is in scope per FR-024 ("all identified remaining
hardcoded English strings") — the task list should include a grep-driven inventory step before
fixing, since OI-19's own text says "other screens were not exhaustively audited."

**`lesson.*` namespace guard (OI-73/FR-025)**: add a two-line assertion to
`tests/unit/i18nKeyParity.test.js` (or a sibling test) that no current lesson `id` collides with the
already-known reserved sub-keys (`lesson.node`, `lesson.confirmation`, `lesson.windowCounts` —
enumerate the actual reserved set by inspecting `en.json`'s `lesson.*` subtree for
non-lesson-id children at test-write time, not by hard-coding today's three from memory).

**KB edits (OI-62/FR-026)**: two edits, both doc-only:
1. `docs/knowledge-base/allen-j-configuration.md` — the `3334434` worked example's
   `solver_verified` field (currently `PENDING`, confirmed at source, line ~94) should record the
   verification date/value; a second worked example already shows `solver_verified: true` (line
   ~106) as the pattern to match.
2. `docs/knowledge-base/community-figure-7.md` — add a note that the `gravity_top_count >= 2` filter
   (confirmed present, lines ~59-63) is dead code for same-column adjacent-row threats.

Then `npm run sync-kb` (per `docs/knowledge-base/README.md`'s validated workflow) to propagate into
`connect-four/server/kb/`, pinned by `tests/unit/kbSync.test.js`.

**OI-38 count correction (FR-027)**: re-verified at source in this planning pass:
`ls docs/knowledge-base/*.md | wc -l` → 49; excluding `README.md` and `_sketches.md` → 47 entries;
`grep -l short_summary_es docs/knowledge-base/*.md` → 4 files (`allis-claimeven.md`,
`community-double-threat.md`, `community-figure-7.md`, `community-immediate-threat.md`). Matches the
epic's stated 47/4/43 exactly — this is a doc-text correction only (spec.md, this epic's own text in
`open-issues-epics.md` if any residual stale count remains, and `docs/open_issues.md`'s OI-38 entry
body, which currently says "45 of 49" — confirmed stale at source, needs the FR-027 correction), no
translation work.

## Cross-cutting: OI-N closeout mechanics

Per the epic's mandatory Issue closeout convention, every OI-N this spec touches gets a
`docs/open_issues.md` edit in the same change that ships its fix — `**Status**: ✅ RESOLVED
<date>` with what shipped and where, or a dated `**UPDATE**` block for a partial fix. This applies
to OI-46, OI-44, OI-63, OI-69, OI-19 (if fully closed; else an UPDATE), OI-73, OI-62 — and OI-68 as
a decision-closure (not a code-fix closure) — plus filing the new OI entry for the deferred
lesson-editor puzzle-existence check (FR-020) and updating OI-38's stale count without closing it
(it stays open, re-scoped as "count corrected, translation deferred to a standalone spec").

## Testing approach

No new API contracts and no DB schema changes anywhere in this spec — confirmed: `goalPrompt` is
already served by `GET /api/lessons/:id` (via `localizeLesson`, unconditionally, both on
`socratic` and each `confirmationChallenges[]` entry) and `title` is already present on every
lesson payload; nothing server-side needs a new field, only client-side consumption changes and
tooling/doc edits. `npm run test:fast` and `npm run test:dom` (inside `connect-four/`) are the
regression gates per `CLAUDE.md`/`testing-conventions.md`; `verify_lesson_content.mjs` and
`server/scripts/audit_answer_ambiguity.mjs` are manual/on-demand and must be re-run by hand as
acceptance evidence (39/39 lesson audit, per SC-007), not added to either `npm run` script.

**Which suite a new test belongs to, and the registration trap**: US1's and US2's new/modified
component tests (`SocraticHintPhase.dom.test.jsx` or equivalent, `SocraticNarration.dom.test.jsx`
rewrite, the `ChallengeScreen` goalPrompt/audio-silence test) are React Testing Library/jsdom tests
and belong in `npm run test:dom`, **not** `test:fast` — `test:fast` contains zero `tests/dom/`
entries today. US3's i18n-title static scan and US5's namespace-collision guard are plain
`node --test` unit tests and belong in `test:fast`. Both scripts are hardcoded file-name lists
(confirmed via `grep '"test' connect-four/package.json`), so every new/modified file in either
category must be added to the corresponding script string in the same change — this is FR-031, not
an assumed side effect of adding the file.

**Audio verification cannot be done under browser automation**: per memory
`project_app_qa_setup_gotchas`, automation Chrome fakes autoplay, so audio ships silent under
automated browser sessions regardless of whether the code is correct. The FR-029 acceptance check
(no mismatched clip plays when a `goalPrompt` override renders) therefore has two tiers of evidence:
an automated DOM/unit assertion on whether `speakCoachMessage`/`lastCoachKeyRef` is called (reliable
under any harness), and a manual real-browser pass with audio ON as the only valid evidence for
"and it is actually audibly silent, not just untested."
