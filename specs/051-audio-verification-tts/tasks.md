# Tasks: Audio Verification & TTS Management

**Input**: Design documents from `/specs/051-audio-verification-tts/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md, contracts/tts-provider-contract.md, contracts/admin-lesson-audio-endpoints.md

**Tests**: Included — the spec's own acceptance scenarios (FR-001, FR-004, FR-018, FR-029) require automated
regression tests, not manual sign-off, for every in-story guarantee. The two by-ear checks (FR-003/FR-005)
are explicitly non-gating `staging_checks.md` sign-off items, not test tasks.

**Organization**: Tasks are grouped by user story (US1–US5, priorities per spec.md) to enable independent
implementation and testing of each story. All file paths are relative to the repo root unless prefixed
`connect-four/` already makes that explicit.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US5)
- Every task names its FR(s) and, where relevant, its `OI-N`.

---

## Phase 1: Setup

**Purpose**: One-time environment prep shared by every story below — no code changes.

- [x] T001 Run `eval "$(./worktree-ports.sh)"` from the repo root, restart the server on `$API_PORT` (OI-43
  stale in-memory lesson-cache guard), and confirm `OPENAI_API_KEY` is present in `connect-four/server/.env`
  — per `specs/051-audio-verification-tts/quickstart.md`'s preamble. No file changes.
- [x] T002 From `connect-four/`, run `npm run test:fast` and `npm run test:dom` as the **pre-change baseline**;
  confirm the only failures are the two pre-existing, unrelated ENOENT failures
  (`server/tests/renderCoverageCorpus.test.mjs`, `server/tests/renderCoverageUniverse.test.mjs`) documented in
  this epic's handoff context. Record this baseline so later tasks can distinguish a pre-existing failure from
  a regression this epic introduces.

---

## Phase 2: Foundational

**No blocking foundational work.** This is a brownfield hardening epic against an already-built pipeline
(plan.md: "No new dependencies... no new project structure"). Nothing here is shared new infrastructure that
all five stories depend on — each story's own prerequisites are scoped inside its own phase below (e.g. US5's
single-synthesis-path work, T039–T048, is a P2-story-internal prerequisite for that same story's T050 bulk
regeneration, not a cross-story blocker). Proceed directly to Phase 3.

---

## Phase 3: User Story 1 - Prove the shipped audio actually works (Priority: P1) 🎯 MVP

**Goal**: Produce automated, evidenced proof (not inspection) that the already-shipped 15-lesson/2-language
audio corpus is complete, non-orphaned, narrates correctly including Socratic, and is either confirmed current
against the model-upgrade date or flagged stale for US5.

**Independent Test**: Run the coverage test, the prune-parity check, and the two-pass Socratic DOM test; all
pass with zero code changes beyond the new test files themselves. Close out the issues the checks confirm.

### Tests + verification for User Story 1

- [x] T003 [US1] Write lesson-audio coverage assertions in `connect-four/tests/lessons/lessonAudioCoverage.test.js`:
  walk every lesson in `connect-four/lessons/` via the production `collectMessages()`
  (`connect-four/server/lessonAudio.js`), and for each entry with non-empty text in a given language assert its
  audio field is populated **and** `fs.existsSync` on the referenced file — zero hand-listed field names (FR-001).
- [x] T004 [US1] In the same file, add a prune-parity assertion per `research.md` R10: compute
  `collectReferencedAudio(getLessonsAll())` and `fs.readdirSync` of `public/audio/lessons/`, assert the two sets
  agree (zero orphans) via `assert.deepEqual` on sorted arrays — **never** call the destructive
  `pruneOrphanedLessonAudio` against the real directory (FR-002).
- [x] T005 [P] [US1] Register `connect-four/tests/lessons/lessonAudioCoverage.test.js` in **both** the `test`
  and `test:fast` script entries in `connect-four/package.json`.
- [x] T006 [US1] Write `connect-four/tests/dom/SocraticNarration.dom.test.jsx`: stub
  `HTMLMediaElement.prototype.play`/`.pause` and `ResizeObserver` (per `testing-conventions.md`), render the
  Socratic screen, and assert `play()`/`pause()` fire correctly across two separate runs — one that never
  triggers Hint, one that triggers Hint at least once — per FR-004's explicit two-run requirement.
- [x] T007 [P] [US1] Register `connect-four/tests/dom/SocraticNarration.dom.test.jsx` in the `test:dom` script
  entry in `connect-four/package.json`.
- [x] T008 [US1] Determine the lesson audio fleet's currency against the 2026-07-14 model-switch commits
  (`9d0e952`, `ff196c9`) using **git history, not file mtime** — mtime is worthless here: every tracked file in
  a fresh checkout of this repo carries the checkout timestamp, not its synthesis date (an external process
  also auto-commits unpredictably), so mtime cannot distinguish a pre-switch clip from a post-switch one. Run,
  for every lesson mp3:
  ```
  for f in public/audio/lessons/*.mp3; do
    d=$(git log --diff-filter=A --format='%ad' --date=short -- "$f" | tail -1)
    echo "$d $f"
  done | sort
  ```
  Emit the **per-file list of clips whose first-added date is before 2026-07-14** (there are 2, per the
  measured run) as this task's evidence artifact — this is what US5's T052 must regenerate, not the full 348.
  Record an explicit "current" (for everything else) or "stale" (for the 2 flagged clips) verdict, not an
  inference from the content-pass rewrite date (FR-006). Caveat for later readers: this `git log
  --diff-filter=A` method is clean for lesson clips but less reliable for coach clips, because the 2026-07-16
  refactor commit `fb59ee3` ("split `coach.*` into `coach.spoken.*`") renamed them and reset their add-date —
  coach clips don't need this method anyway, since their registry (`server/tts-registry.json`) carries real
  `generated_at` timestamps. Generalized rule to state in this task: **timestamps on tracked files are never
  evidence in this repo** — checkouts and the external auto-backup process touch file mtimes routinely, so any
  future currency check must use git history or an explicit registry field, never mtime. This verdict feeds
  US5's T052.
- [x] T009 [US1] Run `npm run test:fast`, `npm run test:dom`, and the ad hoc coverage/prune node snippet from
  `quickstart.md` step 2; capture the actual output (missing count, orphan count) as the evidence artifact for
  T011's issue closeout.
- [x] T010 [US1] Append the FR-003/FR-005 by-ear sign-off checklist items to `connect-four/staging_checks.md`
  under a new "Epic 5 — Audio Verification & TTS Management (open-issues-epics.md, spec 051)" heading: one
  Spanish lesson clip and one Spanish coach clip confirmed genuinely Spanish (not English under Spanish text),
  plus a Rioplatense-accent sample audit — **not** gating this story's or US5's completion.
- [x] T011 [US1] Close out **OI-65, OI-27, OI-9, OI-43, OI-64** in `docs/open_issues.md` per the closeout
  convention (top of that file / `docs/epics/open-issues-epics.md`'s preamble), citing T003–T009's evidence;
  OI-9/OI-43/OI-64 are noted as subsumed by OI-65 per the epic but must still get an accurate, non-stale status
  (FR-007, FR-030).
- [x] T012 [US1] Acceptance validation: walk `spec.md`'s US1 acceptance scenarios 1–8 against the evidence
  gathered in T003–T011; confirm scenarios 1/2/5/6/8 are fully satisfied in-story and scenarios 3/4/7 are
  correctly recorded as `staging_checks.md` sign-off items rather than treated as blocking.

**Checkpoint**: US1 is independently complete — the audio corpus's structural correctness is proven, and its
currency verdict (T008) is available for US5.

---

## Phase 4: User Story 2 - Audition and manage lesson audio from one admin surface (Priority: P1)

**Goal**: Add a "Lessons" section to `/admin/audio` so every lesson message, in either language, can be
listened to and (re)generated without leaving the page, with status always derived live (no new registry).

**Independent Test**: Open `/admin/audio`, confirm the new Lessons section lists every lesson's messages
grouped by slide/Socratic phase, play a clip inline, regenerate a single message, and confirm none of the
pre-existing coach-audio functionality changed.

### Implementation for User Story 2

- [x] T013 [US2] Add `GET /api/admin/lessons/:id/audio-status?lang=en|es` in `connect-four/server/index.js` per
  `contracts/admin-lesson-audio-endpoints.md`: gate with `requireLocalhost, requireAdmin`, in that order —
  the verbatim two-middleware declaration every sibling `/api/admin/lessons/*` route uses
  (`connect-four/server/index.js:870-948`); `requireAdmin` alone is a no-op outside `NODE_ENV=production`, so
  `requireLocalhost` is the gate that actually matters in dev/staging. Before walking the lesson, call
  `reloadLessons()` (or otherwise read the lesson JSON fresh from disk) so the status reflects the current
  on-disk content, not whatever the server loaded at boot (FR-009, OI-43) — `getLessonsAll()`'s in-memory array
  is refreshed only by the write routes today, none of which run on this new read path. Then call
  `getLessonsAll()` (raw, `_es`-intact) → `collectMessages(lesson)` → resolve localized `text`/`audioPath`/
  `hasAudio` per entry, grouped by locator prefix into `"Slide N"` / `"Socratic"` (FR-008, FR-009).
- [x] T014 [P] [US2] Add an optional `locator` filter to `generateLessonAudio()` in
  `connect-four/server/lessonAudio.js`: `if (locator && entry.locator !== locator) continue;` inside the
  `collectMessages(lesson)` loop, with `locator` defaulting to `null` (byte-identical full-lesson behavior when
  absent) (FR-011). **Same-file conflict note**: `connect-four/server/lessonAudio.js` is also edited by US5's
  T043 (migrating the `synthesize` call signature). The two edits touch non-overlapping regions of the file —
  sequence by whichever lands first and have the other rebase, same as the `AdminAudioPage.jsx` T016/T045
  conflict noted below in Parallel Opportunities. `[P]` here means "parallel with other US2 tasks", not
  "parallel with T043" — see that note for the cross-story caveat.
- [x] T015 [US2] Thread the optional `locator` body field through `POST /api/admin/lessons/:id/generate-audio`
  in `connect-four/server/index.js` to the `generateLessonAudio(lesson, { lang, locator })` call; a stale/
  no-match locator returns the settled `200 { generated: [], failed: [] }` shape — a no-op, not a `404` (FR-011,
  see `contracts/admin-lesson-audio-endpoints.md`).
- [x] T016 [US2] Add the Lessons section to `connect-four/src/pages/AdminAudioPage.jsx`: lesson picker,
  per-slide/Socratic message grouping, an inline player reusing the existing `AudioPlayer` component
  (`AdminAudioPage.jsx:53`), and a per-message Generate button that POSTs with that message's `locator`;
  respect the page's existing `lang` toggle state — do not add a second one (FR-008, FR-010, FR-011, FR-012).
- [x] T017 [US2] Manually verify the pre-existing coach-audio status list, config editor, and preview sandbox
  are behaviorally unchanged by T016's addition, except for the FR-028 model-dropdown carve-out landed in US5's
  T045 (FR-013). **Ordering with T045 (both touch `AdminAudioPage.jsx`'s model dropdown), settled explicitly**:
  T017 and T045 may land in either order; whichever of the two lands **second** is responsible for
  re-verifying T017's claim still holds — i.e. if T017 lands first, T045's landing must re-confirm T017's "only
  the dropdown carve-out changed" assertion still holds after its own edit; if T045 lands first, T017's own
  execution already covers this (it verifies against the post-T045 state directly).
- [x] T018 [US2] Document the Lessons admin section — including the settled `200 { generated: [], failed: [] }`
  stale-locator response shape (see `contracts/admin-lesson-audio-endpoints.md`) — in
  `docs/architecture/lesson-editor.md` (FR-014).
- [x] T019 [P] [US2] Document the new `GET /api/admin/lessons/:id/audio-status` endpoint and the
  `generate-audio` `locator` field in `docs/architecture/api-conventions.md`.
- [x] T020 [US2] Close out **OI-42** in `docs/open_issues.md` per the closeout convention, citing T013–T016.
- [x] T021 [US2] Acceptance validation: run `quickstart.md` step 7's manual walkthrough against `spec.md`'s US2
  acceptance scenarios 1–6. **Additionally assert liveness**: with the server already running (no restart),
  edit a lesson JSON on disk (e.g. change a slide's text), re-view that lesson's audio-status in the admin
  Lessons section, and confirm the change is reflected — this is what T013's `reloadLessons()` call exists to
  guarantee, and it is the exact scenario OI-43 tracks and US2 acceptance scenario 5 requires.

**Checkpoint**: US2 is independently complete — every lesson clip is auditionable/regeneratable from
`/admin/audio`, which US1's by-ear checks lean on for playback. (US5's T051 — re-approving 217 coach clips —
does **not** depend on this section: coach-clip approval uses the pre-existing coach-audio Approve-All
control, unrelated to the new Lessons section built here.)

---

## Phase 5: User Story 3 - Fix the three correctness bugs that survived the content pass (Priority: P2)

**Goal**: Fix three independent, narrow defects — unwarned regenerate-over-approved, cross-locale cache
clobber, empty-movestring 400 — each with its own regression test.

**Independent Test**: Each of the three fixes below has its own regression test that fails against pre-fix
behavior and passes after; none requires the other two.

### Fix 1 — OI-45 regenerate-approved warning (FR-015)

- [x] T022 [P] [US3] Write `connect-four/tests/dom/AdminAudioPageWarning.dom.test.jsx`: render
  `AdminAudioPage`, trigger single-clip regeneration on an `approved` item, and assert a confirmation prompt
  appears before the fetch fires — confirm this test fails against today's `handleGenerate` (no warning at all)
  (FR-015, FR-018).
- [x] T023 [P] [US3] Register `AdminAudioPageWarning.dom.test.jsx` in the `test:dom` script entry in
  `connect-four/package.json`.
- [x] T024 [US3] Implement the warning in `handleGenerate(key)` in `connect-four/src/pages/AdminAudioPage.jsx`:
  look up the item's current `status` from already-loaded state; if `'approved'`, show a `window.confirm(...)`
  reusing the CLI's existing warning copy (`connect-four/scripts/generate-tts.js:409-421`, adapted — drop the
  `git checkout` recovery line, which is CLI-specific) and abort on cancel; do not touch `handleGenerateAll`
  (already warns) (FR-015, OI-45).

### Fix 2 — OI-26 cross-locale cleanup (FR-016)

- [x] T025 [P] [US3] Extract the `POST /api/admin/tts/cleanup` update logic in `connect-four/server/index.js`
  into a pure, injectable-Supabase-stub function (per `testing-conventions.md`'s Pure Function Extraction
  Pattern), and write its regression test in `connect-four/server/explanationCacheCleanup.test.js`: assert that
  expiring an `en` row never nulls a different-locale row for the same `position_hash` — confirm it fails
  against today's ungrouped `.in('position_hash', hashes)` (FR-016, FR-018).
- [x] T026 [P] [US3] Register `explanationCacheCleanup.test.js` in **both** the `test` and `test:fast` entries in
  `connect-four/package.json`.
- [x] T027 [US3] Fix the cleanup route in `connect-four/server/index.js`: extend the initiating
  `.select('position_hash, audio_path')` to also select `locale`, group `expired` rows by `locale`, and issue
  one `.update({...}).eq('locale', loc).in('position_hash', hashesForLoc)` per locale present in the batch
  (FR-016, OI-26).

### Fix 3 — OI-23 empty-movestring 400 (FR-017)

- [x] T028 [P] [US3] Write `connect-four/tests/unit/deepRevealMovestring.test.js`: assert
  `GET /api/user/tts/deep-reveal` with `moveString=''` does not 400 — confirm it fails against today's
  `if (!moveString || ...)` check (FR-017, FR-018).
- [x] T029 [P] [US3] Register `deepRevealMovestring.test.js` in **both** the `test` and `test:fast` entries in
  `connect-four/package.json`.
- [x] T030 [US3] Fix the validation in `GET /api/user/tts/deep-reveal` in `connect-four/server/index.js`:
  replace `if (!moveString || !/^[0-6]{0,42}$/.test(moveString))` with
  `if (typeof moveString !== 'string' || !/^[0-6]{0,42}$/.test(moveString))`, mirroring the pattern already used
  correctly in `POST /api/explain-move-llm` (FR-017, OI-23).

### Closeout

- [x] T031 [US3] Close out **OI-45, OI-26, OI-23** in `docs/open_issues.md` per the closeout convention, each
  citing its own regression test (T022/T025/T028) as evidence.
- [x] T032 [US3] Acceptance validation: run all three new regression tests, confirm each independently fails on
  a pre-fix checkout of its target file and passes post-fix (FR-018), and confirm the three fixes did not
  interact (each can land in any order relative to the others, per spec.md's Independent Test note).

**Checkpoint**: US3 is independently complete — all three bugs are fixed and regression-guarded.

---

## Phase 6: User Story 4 - Localize the blunder one-liner (Priority: P3)

**Goal**: Make the blunder one-liner honor the learner's locale — but only against whichever server response
actually renders it in the running app, confirmed by a captured network request, not by editing
`composeExplanation` on the unverified assumption it's live.

**Independent Test**: Request a mistake explanation as a fresh Spanish-locale caller and confirm the one-liner
comes back in Spanish; an English-locale caller is unchanged.

- [x] T033 [US4] **Discovery (must run before any implementation task below)**: in the running app, starting
  from `DeepRevealPane.jsx` and the mistake-review chip's rendering path, trigger a mistake review and capture
  a real Network-tab request to confirm which server response actually populates the one-liner the learner
  reads. `research.md` R7 found no frontend caller of plain `/api/explain-move` and no `oneLiner`/`one_liner`
  consumer in `src/` via static grep — this task confirms or overturns that against the live app, not by
  re-reading source. Record the confirmed live path (or its absence) as this task's output.
  **DONE 2026-07-29**: drove the real app in Chrome (chrome-devtools MCP) through Sparring → Resign → Past
  Games → a "Suboptimal" mistake card → "What should I have played?" and captured the live
  `POST /api/explain-move-llm` request/response twice (English default, then again after switching
  Settings→Language to Español). Verdict: `composeExplanation`/`POST /api/explain-move` is confirmed **dead**
  (zero requests to that endpoint; matches R7's static grep). The live response field the learner reads is
  `explanation` from `POST /api/explain-move-llm`, produced by `computeMechanism`
  (`server/mechanismExplainer.mjs`). No response anywhere in the captured traffic contains an `oneLiner` /
  `one_liner` key.
- [x] T034 [US4] Based on T033's outcome, implement the locale-threading fix on exactly the confirmed function:
  - **If `composeExplanation`/`POST /api/explain-move` is confirmed live**: [not applicable — confirmed dead]
  - **If a different function is confirmed live** (e.g. `computeMechanism`'s `one_liner` field, currently
    written as `''`): retarget the same requirement — determine locale at generation, honor it — at that
    function instead; do not touch `composeExplanation`.
  - **If no code path currently renders a one-liner to the learner**: implement nothing; proceed directly to
    T037's re-scope closeout.
  **DONE 2026-07-29 — took the "different function" branch, found already implemented**: `computeMechanism`
  (`server/mechanismExplainer.mjs:78`) already accepts `locale = 'en'` and passes it to
  `buildPromptForCondition` (`server/scripts/compute.mjs:246`), which already appends
  `SPANISH_OUTPUT_DIRECTIVE` (Rioplatense voseo, verde/gris) whenever `locale === 'es'` — shipped in commit
  `da8a916` ("feat(i18n): deep-reveal Spanish output directive"), a prior, unrelated epic. `server/index.js`'s
  `POST /api/explain-move-llm` handler already reads `const locale = req.locale ?? 'en';` and threads it into
  `computeMechanism(movestring, col, { solver, model, userId, locale })`, and its `explanation_cache`
  lookup/write is already keyed on `(position_hash, locale)`. **No code changes were needed or made** — live
  network capture in both `en` and `es` (see T033/T038) proves this already satisfies FR-019/020 for the
  confirmed live path. No file under `server/index.js` was touched by T034; the only files touched this batch
  are `server/tests/mechanismExplainer.test.mjs` (T035), `docs/open_issues.md` (T037), and this file.
  `composeExplanation` (`server/index.js:593`) was left completely untouched, per the "do not touch" clause.
- [x] T035 [P] [US4] Write a regression test confirming a fresh (uncached) Spanish-locale request yields Spanish
  one-liner text and an English-locale request is unchanged, targeting whichever function T034 changed. Skip
  this task (mark N/A in T037's closeout note) if T033 found no live path.
  **DONE 2026-07-29**: added two tests to `server/tests/mechanismExplainer.test.mjs` (pre-existing file, not
  new — T036 is N/A): `locale "es" threads the Spanish output directive into the prompt sent to the LLM` and
  `locale "en" (and the default) omit the Spanish output directive — unchanged from current behavior`. Both
  inject `callLLM` and assert on the prompt `computeMechanism` builds (the same `buildPromptForCondition` call
  the production `/api/explain-move-llm` path uses). Both pass (`node --test
  server/tests/mechanismExplainer.test.mjs` → 9/9 green, including the 7 pre-existing tests).
- [x] T036 [US4] If T035 added a new test file, register it in both the `test` and `test:fast` entries in
  `connect-four/package.json`. Not parallel: this strictly depends on T035's output (the file to register).
  **N/A** — T035 extended the pre-existing `server/tests/mechanismExplainer.test.mjs`, already registered in
  both `test` and `test:fast` in `connect-four/package.json`. No registration change needed.
- [x] T037 [US4] Close out **OI-28** in `docs/open_issues.md` per the closeout convention:
  - If implemented (T034 ran a real branch): cite T034/T035 as evidence, and explicitly record the FR-021
    owner-ratified decision that already-cached English rows are not backfilled (they're naturally replaced on
    next regeneration for a Spanish-locale learner).
  - If re-scoped/deferred (T033 found no live path): close with a dated `**UPDATE**` naming exactly what
    discovery found, per the closeout convention's "deliberately not fixed" / "found already resolved" shape —
    whichever applies.
  **DONE 2026-07-29**: `docs/open_issues.md` OI-28 rewritten — status flipped to `✅ RESOLVED (blunder
  one-liner half) 2026-07-29`, citing T033's live-capture verdict, T034's "already implemented via commit
  da8a916" finding, and T035's regression tests, with the FR-021 backfill decision spelled out explicitly (the
  `(position_hash, locale)` cache key already means English and Spanish rows for the same position coexist;
  no migration/purge was written). The lesson-narration-audio half of OI-28 is left open, unchanged, per the
  "partially fixed" convention (only one of the entry's two named surfaces was in this batch's scope).
- [x] T038 [US4] Acceptance validation: run `spec.md`'s US4 acceptance scenarios 1–3 against whichever function
  T034 targeted; if T033 found no live path, record why scenarios 1–2 don't apply rather than silently skipping
  them.
  **DONE 2026-07-29**, all three verified live against `computeMechanism`/`POST /api/explain-move-llm`:
  (1) Spanish-locale caller, fresh (different locale = cache miss for that `(position_hash, locale)` row) →
  captured response `explanation` field is Rioplatense Spanish prose ("Jugaste la columna 1 aquí... En la
  apertura, la columna 4 te deja más líneas..."). (2) English-locale caller, same kind of request → captured
  response `explanation` is English, unchanged from pre-batch behavior (verified byte-for-byte structurally
  identical response shape, only language differs). (3) The English row cached before this verification (from
  the scenario-2 capture, `position_hash` for movestring `""`/col 1 combination) was left untouched — the
  scenario-1 Spanish request did not read or overwrite it (separate `locale` cache key), consistent with
  FR-021's no-backfill decision; the Spanish-locale caller instead got a freshly-generated Spanish row.

**Checkpoint**: US4 is independently complete regardless of which of the three T034 branches fired.

---

## Phase 7: User Story 5 - Regenerate the stale coach fleet and guarantee it cannot go stale silently again (Priority: P2)

**Goal**: Close off the drift mechanism (single synthesis path, config resolved internally from `lang`, legacy
models refused) and only then regenerate + re-approve the ~217 stale English coach clips; separately confirm
or regenerate the lesson fleet; ship the paced lesson-audio CLI.

**Independent Test**: Confirm the full English coach fleet was generated after the model upgrade and is
re-approved; confirm the lesson fleet was checked (not blindly regenerated) and found current; run a
regression test that fails if any code path can synthesize speech without full per-language config or with a
refused model.

**Sequencing note (load-bearing, per FR-022's own text)**: T050 (bulk regeneration) **must not** start before
T039–T048 (the single synthesis path and its tests) are complete and green. Regenerating through today's
defective `generate-tts.js` path would ship 217 fresh but still-unstyled clips.

### Single synthesis path (FR-026/027/028/029 — do this before any regeneration)

- [x] T039 [US5] Add an exported pure `resolveSynthesisConfig(lang)` to `connect-four/server/ttsProvider.js`
  per `contracts/tts-provider-contract.md`: resolve `{ voice, model, speed, instructions } = readTtsConfig(lang)`
  + `buildTtsInstructions`; throw on invalid/missing `lang`, empty/falsy `instructions`, or a `model` not in a
  local `ALLOWED_TTS_MODELS = ['gpt-4o-mini-tts']` allow-list (FR-026, FR-027, FR-028, FR-029).
- [x] T040 [US5] Rename today's `synthesize`/`synthesizeStream` in `connect-four/server/ttsProvider.js` to
  `synthesizeRaw`/`synthesizeStreamRaw` (bodies unchanged), and add the same `ALLOWED_TTS_MODELS` refusal check
  to both — the preview sandbox keeps its arbitrary-opts escape hatch but still refuses legacy models (Decision
  1 hardening, FR-026, FR-027, FR-028).
- [x] T041 [US5] Add new production `synthesize(text, lang)` / `synthesizeStream(text, lang)` in
  `connect-four/server/ttsProvider.js` delegating to `resolveSynthesisConfig` (T039) then
  `synthesizeRaw`/`synthesizeStreamRaw` (T040); throw synchronously on a missing/invalid `lang` before any
  network call (FR-026, FR-027) — depends on T039, T040.
- [x] T042 [US5] Move the `voice=… speed=… model=… instructionsChars=…` diagnostic log line into
  `synthesize`/`resolveSynthesisConfig` in `connect-four/server/ttsProvider.js`, logged once per call, so it is
  not silently dropped once config resolution leaves `generateLessonAudio` (research.md R1a). Not parallel:
  this edits the same `ttsProvider.js` functions T039/T040/T041 create/modify, so it must sequence after them
  rather than run alongside.
- [x] T043 [US5] Migrate the 5 production call sites to the new signatures per
  `contracts/tts-provider-contract.md`'s migration table: `connect-four/server/index.js` (`generate`,
  `generate-all`, `deep-reveal` → `synthesizeStream(cleanText, locale)`, `preview` →
  `synthesizeRaw(text, { instructions, speed, voice, model })`), `connect-four/server/lessonAudio.js`
  (`synthesize(text, lang)`), `connect-four/scripts/generate-tts.js` (`synthesize(value, lang)`) — depends on
  T041.
- [x] T044 [P] [US5] Shrink `VALID_TTS_MODELS` to `['gpt-4o-mini-tts']` in `connect-four/server/ttsConfig.mjs`
  (FR-028).
- [x] T045 [P] [US5] Shrink the `TTS_MODELS` dropdown array to `['gpt-4o-mini-tts']` in
  `connect-four/src/pages/AdminAudioPage.jsx` — this one constant feeds both the config-editor dropdown and the
  preview-sandbox dropdown (FR-028, FR-013 carve-out). Notify US2's T017 this landed if it lands after.
- [x] T046 [US5] Rewrite `connect-four/tests/unit/lessonAudio.test.js`'s `makeStubSynthesize` and the "passes
  TTS instructions/voice/speed/model opts to synthesize (not called bare)" test (today at
  `:23-27`/`:323-332`) to the new `(text, lang)` stub contract: assert the stub receives a valid `'en'`/`'es'`
  string and that a bare one-argument call is impossible — depends on T043. This file is already registered in
  both `test` and `test:fast`; do not drop it while editing.
- [x] T047 [US5] Write `connect-four/server/ttsProvider.test.js` with the 7 required assertions from
  `contracts/tts-provider-contract.md`: no-lang throws; invalid-lang throws; `en`/`es` calls resolve with
  lang-specific `instructions` in the outgoing request body (read via `await request.text()`, with a fake
  `OPENAI_API_KEY` set); `resolveSynthesisConfig` throws on a fake legacy-model config; `synthesizeRaw` accepts
  a valid model and refuses a legacy one; a lint asserting no file directly constructs an OpenAI TTS request;
  a lint asserting no file outside `ttsProvider.js`/the preview handler imports `synthesizeRaw`/
  `synthesizeStreamRaw` — depends on T039, T040, T041.
- [x] T048 [P] [US5] Register `connect-four/server/ttsProvider.test.js` in **both** the `test` and `test:fast`
  entries in `connect-four/package.json`.

### Lesson-audio CLI (FR-031, OI-78)

- [x] T049 [US5] Build `connect-four/scripts/generate-lesson-audio.mjs`: `--lesson <id>` (repeatable/comma-list,
  default all 15) and `--lang <en|es|all>` (default `all`) flags targeting
  `POST /api/admin/lessons/:id/generate-audio`; pace requests (e.g. 500ms–1s apart) to stay under the shared
  120 req/min limiter; on 429, read the response via `.text()` first (never a bare `.json()`, the body is plain
  text), then `JSON.parse` in a try/catch, and honor the `RateLimit-Reset` header before retrying; provide a
  real `--help` (purpose, options, defaults) that exits 0 before required-arg validation — depends on T043 (the
  admin endpoint's synthesis path must already be fixed before this tool ships fresh-but-unstyled clips).

### Regeneration and re-approval (FR-022/023/024/025)

- [x] T050 [SAMPLE ONLY — owner-scoped 2026-07-30, NOT full regeneration] [US5] Regenerated **5** English
  coach clips (not the full 217) via the surgical per-key `POST /api/admin/audio/generate` (not
  `generate-all scope:'all'`), per an explicit owner decision to audition a small sample before
  authorizing the full spend. Keys regenerated: `coach.spoken.sparring.outcome.win`,
  `coach.spoken.sparring.outcome.loss`, `coach.spoken.immediate_threat.hint.0`,
  `coach.spoken.figure_7.blunder.2`, `coach.spoken.undercut.optimal.2` — all previously
  `generated_at` 2026-06-19 (pre-2026-07-14 model switch), now 2026-07-30. Confirmed via
  `/tmp/epic5-server.log`: each call logged `[ttsProvider] resolved lang=en voice=echo speed=1.1
  model=gpt-4o-mini-tts instructionsChars=867`. Endpoint reported per-key JSON
  (`{key, slug, status:'awaiting_approval', size}`) for all 5, no crash, no unexpected-shape failure
  (FR-024 confirmed for the per-key path). **The remaining ~212 clips are explicitly NOT regenerated —
  waiting on the owner's go-ahead after auditioning these 5 on `/admin/audio`.**
- [ ] T051 [DEFERRED — owner go-ahead pending, NOT run] [US5] Re-approval of the full regenerated fleet
  is deferred until the full regeneration (T050 in its original all-217 form) actually happens — nothing
  to re-approve yet beyond the 5-clip sample. Verified (read-only) that the machinery is present and
  functional: `handleApproveAll()` in `connect-four/src/pages/AdminAudioPage.jsx:396`, its button
  ("Approve All (N)") confirmed rendering live on `/admin/audio` showing `Approve All (5)`, backed by
  `POST /api/admin/audio/approve-all` (`server/index.js:3876`). **Not executed** — mass-approving now
  would approve only the 5-clip sample and pre-empt the owner's audition. Ready-to-run once authorized:
  click "Approve All" on `/admin/audio` (en), or `curl -sX POST
  http://localhost:$API_PORT/api/admin/audio/approve-all -H 'Content-Type: application/json' -d
  '{"lang":"en"}'`.
- [ ] T052 [DEFERRED — NOT run] [US5] Using US1's T008 currency verdict (2 stale lesson clips in
  `lesson-01-immediate-threat.json`), the ready-to-run regeneration command is recorded but **not
  executed** per the owner's scope-down instruction. Exact command:
  `node --env-file=server/.env scripts/generate-lesson-audio.mjs --lesson immediate-threat --lang en`
  (regenerates the whole lesson's `en` narration, including the 2 stale locators
  `slides[1].coachMessages[0]` = `41dcfb2a0d945146.mp3` and `slides[2].coachMessages[0]` =
  `4d377642248f22e2.mp3`; the script has no locator-level filter, only whole-lesson/whole-language). For
  surgical per-clip regeneration instead: `curl -sX POST
  http://localhost:$API_PORT/api/admin/lessons/immediate-threat/generate-audio -H 'Content-Type:
  application/json' -d '{"lang":"en","locator":"slides[1].coachMessages[0]"}'` and the same with
  `slides[2].coachMessages[0]`.

### Documentation and closeout

- [x] T053 [P] [US5] Documented the `synthesize`/`synthesizeRaw` split in
  `docs/architecture/coach-audio-conventions.md` (new "The single-synthesis-path guarantee" section),
  stating the guarantee precisely as "exactly one path that can **ship** a clip" (not "exactly one path" —
  `synthesizeRaw` is a real second path that can synthesize, just never ship), including the
  who-may-call-it table and why the sandbox needs its own escape hatch.
- [x] T054 [P] [US5] Document `connect-four/scripts/generate-lesson-audio.mjs` alongside the existing
  `generate-tts.js` documentation.
- [x] T055 [PARTIAL — OI-32 stays OPEN, not resolved] [US5] Closed out **OI-32** in
  `docs/open_issues.md` per the closeout convention, as **partially fixed, remaining open**, dated
  2026-07-30: records the single-synthesis-path fix (batch 5), the lesson fleet check (2 of 348 stale,
  batch 1), the 5-clip English coach sample regenerated this batch, and that the remaining ~212 English
  coach clips + their re-approval, plus the 2 stale lesson clips, are pending owner sign-off. OI-78's
  closeout (batch 5) verified accurate, not redone.
- [x] T056 [US5] Acceptance validation: ran `spec.md`'s US5 acceptance scenarios 5, 6, 7 (single-
  synthesis-path guarantees) — confirmed by re-running `connect-four/server/ttsProvider.test.js` (17/17
  pass) as the "reintroduces a bypassing caller" regression check named in scenario 7. Scenarios 1–4
  (full regeneration + re-approval) recorded as **pending owner sign-off**, not passed, not silently
  skipped.

**Checkpoint**: US5 is independently complete — the stale fleet is regenerated and re-approved, the lesson
fleet's currency is settled (not assumed), and a future caller that omits config or picks a legacy model is
refused and caught by an automated test.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [x] T057 [P] Ran the full `npm run test:fast` suite from `connect-four/`: **1516 tests / 1511 pass / 5
  fail** — the five pre-existing ENOENT failures documented in this batch's handoff (`branchInvariance`,
  `causalLinksComposers`, `reasonRenderFixes`, `renderCoverageCorpus`, `renderCoverageUniverse`, all
  ENOENT on `server/scripts/reason_evidence_boards_coverage_*.jsonl`, which live under
  `server/scripts/fv_suff/`). No new regressions across any of the five stories.
- [x] T058 [P] Ran `npm run test:dom` from `connect-four/`: **39/39 pass**, including
  `SocraticNarration.dom.test.jsx` (both runs) and `AdminAudioPageWarning.dom.test.jsx`.
- [x] T059 After this batch's sample regeneration (US5's T050 sample), called
  `POST /api/admin/lessons/prune-audio` **exactly once**: response `{"deleted":[]}` — zero deletions, as
  expected. T004's non-destructive parity check remains the standing CI regression test.
- [x] T060 Ran `specs/051-audio-verification-tts/quickstart.md`'s verification walkthrough steps 1–7
  end-to-end (step 8 is a `staging_checks.md` sign-off item, non-gating, already appended by batch 1):
  step 1 (`test:fast`/`test:dom`) — matches, see T057/T058; step 2 (coverage/orphan check) —
  `{ missing: 0, referencedCount: 348, diskCount: 348, orphanCount: 0 }`, matches; step 3 (coach fleet
  currency) — `{'2026-06-19': 210, '2026-07-13': 1, '2026-07-14': 1, '2026-07-30': 5, '': 1}`, confirms
  210 clips still pre-switch-stale (this batch's 5-clip sample is the only movement, deliberately);
  step 4 (single-synthesis-path smoke) — ran verbatim, all three assertions passed exactly as documented;
  step 5 (deep-reveal opening-move) — `404` (not `400`), matches "must NOT be 400" (no cached explanation
  yet for that exact position, a legitimate 404); step 6 (blunder one-liner) — already validated live by
  batch 4 (T033/T038); re-confirmed `mechanismExplainer.test.mjs` still 9/9 green; step 7 (admin manual
  walkthrough) — confirmed in a real browser (chrome-devtools MCP) against the running dev server: Lessons
  section lists all 15 lessons, model dropdown offers only `gpt-4o-mini-tts`, "Approve All (5)" button
  renders live reflecting this batch's 5-clip sample. Where a step assumes the full regeneration happened
  (steps 3/7's "all clips re-voiced" framing), the deferral is noted rather than faking full-fleet results.
- [x] T061 Final sweep of `docs/open_issues.md` completed 2026-07-30: all 12 `OI-N` entries
  (OI-9, OI-23, OI-26, OI-27, OI-28, OI-32, OI-42, OI-43, OI-45, OI-64, OI-65, OI-78) read and verified
  against the working tree — 11 accurate as batches 1–5 left them (re-verified, not re-written); OI-32
  updated this batch (T055) to reflect the 5-clip sample and remain explicitly OPEN/partial. See this
  batch's final report for the full per-entry table.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Empty by design (see Phase 2 note) — does not block any story.
- **User Stories (Phase 3–7)**: All depend only on Setup (Phase 1). US1–US4 have no dependency on each other or
  on US5. **US5 has one internal dependency that crosses a story boundary**: T052 (lesson-fleet confirm/regen)
  depends on US1's T008 currency verdict. T051 (coach-clip re-approval) does **not** depend on US2 — it uses
  the pre-existing coach-audio Approve-All control, unrelated to US2's new Lessons section; its only dependency
  is T050 (regeneration must run first). US5's T050 (bulk regen) must not start before its own T039–T048 land.
- **Polish (Phase 8)**: Depends on all five stories being complete.

### User Story Dependencies

- **US1 (P1)**: No dependencies on other stories. Produces the T008 currency verdict US5's T052 consumes.
- **US2 (P1)**: No dependencies on other stories. Its admin surface (T013–T016) is **not** consumed by any
  other story's tasks — US5's T051 (coach-clip re-approval) uses the pre-existing coach-audio Approve-All
  control instead.
- **US3 (P2)**: Fully independent of every other story.
- **US4 (P3)**: Fully independent of every other story; its own internal task order (discovery T033 before
  implementation T034) is the only sequencing inside this story.
- **US5 (P2)**: Internally sequenced (T039–T048 before T050); externally depends only on US1 (T008, for T052)
  — not on US2 — but US5's own single-synthesis-path work (T039–T049) can proceed in parallel with US1–US4
  since it touches none of their files.

### Within Each User Story

- Regression tests are written before their corresponding fix, and confirmed to fail pre-fix (per US3, US4,
  US5's explicit FR-018/FR-029 requirements).
- New test files are registered in the relevant `package.json` script list in the same task or the very next
  one — never deferred.
- Story-specific acceptance-validation task is last.

### Parallel Opportunities

- All of Phase 1's two tasks are sequential (T002 needs T001's environment first) but both precede everything
  else.
- US1, US2, US3, US4, and US5's T039–T049 can all proceed in parallel once Phase 1 completes — they touch
  disjoint files except:
  - US5's T052 explicitly depends on US1's T008 (the only real cross-story dependency; T051 does **not**
    depend on US2 — see above).
  - US2 and US5 share `connect-four/src/pages/AdminAudioPage.jsx` (T016 vs T045 — different, non-overlapping
    edits to the same file; sequence by whichever lands first and have the other rebase; see also the T017/T045
    ordering note in Phase 4).
  - US2 and US5 also share `connect-four/server/lessonAudio.js` (T014 adds the `locator` filter; T043 migrates
    the `synthesize` call signature) — same situation: non-overlapping edits, sequence by whichever lands
    first and have the other rebase.
- Within US3: the three fixes (T022–T024, T025–T027, T028–T030) are fully parallel with each other.
- Within US5: T039/T040 can start together; T041 needs both; T044/T045 are parallel with each other and with
  T046/T047 once T043 lands; T042 is **not** parallel — it edits the same `ttsProvider.js` functions T039–T041
  create/modify, so it sequences after them; T049 only needs T043.

---

## Parallel Example: User Story 3 (all three fixes at once)

```bash
# Launch all three regression tests together (writing them first, confirming each fails):
Task: "Write AdminAudioPageWarning.dom.test.jsx (FR-015 regression)"
Task: "Write explanationCacheCleanup.test.js (FR-016 regression)"
Task: "Write deepRevealMovestring.test.js (FR-017 regression)"

# Then their three independent fixes, also parallel:
Task: "Add approved-clip warning to handleGenerate in AdminAudioPage.jsx"
Task: "Scope the cleanup update by locale in server/index.js"
Task: "Fix the movestring falsy-check in server/index.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 + User Story 2)

Both are P1. Complete Phase 1 → Phase 3 (US1) and Phase 4 (US2) in parallel → validate both independently.
This alone delivers the epic's two highest-value outcomes: proof the shipped audio works, and one place to
manage every clip.

### Incremental Delivery

1. Setup → Foundational (no-op) → Foundation ready.
2. US1 + US2 in parallel → validate each independently → this is the MVP.
3. US3 (three independent mechanical fixes) → validate.
4. US4 (discovery-gated locale fix) → validate.
5. US5 (single synthesis path, then bulk regeneration, then lesson-fleet confirm/regen) — start its
   synthesis-path work (T039–T049) any time after Phase 1, but hold T050 until T039–T048 are green, and hold
   T051 until T050 completes (T051 does not need US2).
6. Polish: full-suite regression run, one-off `prune-audio` run, quickstart walkthrough, final open-issues
   sweep.

### Sequencing Constraint Recap (do not violate)

FR-026/FR-027 (US5's T039–T043) **must** land before FR-022 (US5's T050) — spelled out in the spec's own
"Sequencing constraint" text for FR-022 and repeated in plan.md's Summary. Nothing in US1–US4 is blocked by
this; it is entirely internal to US5.
