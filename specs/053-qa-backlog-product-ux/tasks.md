# Tasks: QA Backlog & Product/UX Decisions

**Input**: Design documents from `/specs/053-qa-backlog-product-ux/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md, contracts/disposition-record-format.md (all present)

**Tests**: This is primarily a documentation-and-verification epic (plan.md Summary: "at most three
narrowly-scoped, live-check-gated code edits"). A regression test is required only if a live-check
finds something still broken and a code task fires (US1's i18n-leak branch, US3's ReviewScreen branch)
— per `docs/architecture/testing-conventions.md` and Constitution Principle III. The nav-loop item
(FR-004) already has a regression test (`connect-four/tests/unit/categoryListBack.test.js`, shipped
with `f4de927`) — re-run it as a live-check, do not write a new one unless the live-check surprises us.

**Working directory**: `npm run`/`node` commands run from `connect-four/` unless a repo-root path is
given. Any task that starts, restarts, or kills a dev server MUST first run `eval "$(./worktree-ports.sh)"`
from the repo root and use `$API_PORT`/`$VITE_PORT` — never a bare `3001`/`5173`, never `pkill node`
(`docs/architecture/worktree-conventions.md`, standing rule). Use `npm run test:fast` inside
`connect-four/` for all automated checks — never bare `npm test` (hangs on
`candidate-generator.test.js`'s solver IPC, `docs/architecture/testing-conventions.md`).

**Organization**: Tasks are grouped by user story (US1 P1, US2 P2, US3 P2, per spec.md). Each phase ends
with that story's spec.md "Independent Test" / quickstart.md acceptance steps and its
`docs/open_issues.md` closeout write(s), per FR-023 and the epic's Issue closeout convention
(`docs/epics/open-issues-epics.md` lines 17–37).

**Branching, not single-outcome, tasks**: Per the epic's organizing method (Constitution Principle VI —
reproduce before theorizing), every live-check task below states what to do in *both* the "still
reproduces" and "already fixed/stale" branches. Do not treat the "already fixed at source" evidence in
plan.md/spec.md as license to skip the live-check itself — re-verify, then record whichever branch the
fresh check actually lands on.

**Required triage step (FR-002, applies to every fix-here candidate below)**: before assigning `fix-here`
to any finding claimed still-live, run both:
```
git log --oneline --grep "<finding keyword>"
git log --oneline -- <the file the finding originally cited>
```
This is what caught the nav-loop error during planning (the fix landed in `categoryListBack.js`, not the
file the finding named) — only assign `fix-here` after both searches come up empty against the current tree.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task in the same phase)
- **[Story]**: US1–US3, per spec.md
- Exact file paths are included in every task description

---

## Phase 1: Setup

**Purpose**: Confirm the untracked-file and baseline-tree facts the whole epic is built on, before any
disposition gets recorded against a stale assumption.

- [x] T001 Run `git status --short` from the repo root and confirm it still reports
  `?? agentic_QA_2026-07-15-1321.md` (untracked) and `git log --diff-filter=A -- agentic_QA_2026-07-15-1321.md`
  returns empty (never committed) — this is the fact FR-001 corrects. Then run
  `cd connect-four && npm run test:fast` on the unmodified tree and confirm it is green, so any later red
  test is attributable to a task in this epic, not pre-existing rot. Record both results; no file changes.

**Checkpoint**: Baseline confirmed. No foundational (Phase 2) tasks are required — per plan.md this is
"three independent, mostly-decided threads" with no shared new infrastructure, model, or endpoint. US1,
US2, and US3 may proceed in any order or in parallel; each is independently testable per spec.md.

---

## Phase 3: User Story 1 - Re-triage, commit, and route the QA backlog (Priority: P1) 🎯 MVP

**Goal**: `agentic_QA_2026-07-15-1321.md` stops being a single-machine, untracked artifact; every finding
in it carries exactly one of five dispositions (fixed / stale / fix-here / owned-by-another-epic /
new `OI-N`); `docs/open_issues.md`'s OI-35 entry stops asserting a false "committed" claim and instead
carries the full durable disposition table (FR-001–FR-009, FR-023).

**Independent Test**: Confirm `agentic_QA_2026-07-15-1321.md` is committed and no longer git-untracked.
Confirm every finding in the file has exactly one recorded disposition (in the file and in
`docs/open_issues.md` under OI-35). Confirm the four live-check items (nav loop, `/api/scores`, i18n
leaks, anon 401) each carry a disposition backed by a cited, current-tree observation obtained today, not
assumed from the epic/spec text.

- [x] T002 [US1] Commit `agentic_QA_2026-07-15-1321.md` to the repository at the repo root
  (`git add agentic_QA_2026-07-15-1321.md`, as its own change within this feature's commit set) so
  `git status --short` no longer reports it untracked (FR-001, SC-001). Do not edit its content in this
  task — content edits happen in T007/T008 after triage.
- [x] T003 [US1] Live-check the `/mistakes ↔ /stats` cold-load nav loop (FR-004). Run the required triage
  step first: `git log --oneline --grep "mistakes.*stats\|cold.load\|categoryListBack"` and
  `git log --oneline -- connect-four/src/screens/categoryListBack.js` — expect to find commit `f4de927`.
  Then run `cd connect-four && npm run test:fast -- categoryListBack` (or the project's equivalent
  single-file `test:fast` invocation) and confirm it passes. Then live-verify in the running app: start
  the dev server (`eval "$(./worktree-ports.sh)"` first), navigate directly to `$VITE_PORT/mistakes` by
  typing the URL (cold load, empty `window.history`), and press Back repeatedly.
  - **If it reaches Home within a bounded number of presses (expected/default)**: record disposition
    `fixed`, evidence `f4de927` + the passing regression test, verified today's date.
  - **If it still toggles indefinitely between `/mistakes` and `/stats`**: this is the one case where
    FR-004 authorizes a fix-here code change. Do NOT touch `App.jsx` (its `goBack`/`window.history.back()`
    has no knowledge of in-app stack depth and a guard there would regress in-session Back behavior that
    currently works). Instead debug `resolveCategoryListBack` in `connect-four/src/screens/categoryListBack.js`
    (consumed at `connect-four/src/screens/CategoryListScreen.jsx:64`) — reproduce before theorizing — fix
    it, and extend `connect-four/tests/unit/categoryListBack.test.js` with the reproducing case before
    re-running it green.
- [x] T004 [US1] Live-check the `/api/scores` 500-on-malformed-movestring finding (FR-005). Run the
  triage step: `git log --oneline --grep "scores.*500\|validateMoves"` and
  `git log --oneline -- connect-four/server/index.js`. Read `connect-four/server/index.js` around
  `validateMoves(moves)` (near line 1037) to confirm the current guard shape (`if (movesErr) return
  res.status(400).json({ error: movesErr })`). Then send a real malformed-movestring request to a running
  server following `quickstart.md` §2 (`eval "$(./worktree-ports.sh)"`, then:
  `curl -s -o /dev/null -w '%{http_code}\n' -X POST -H 'Content-Type: application/json' -d '{"moves":"notamovestring"}' "http://localhost:$API_PORT/api/scores"`
  — `/api/scores` is a POST-only route (`server/index.js:1037`, `req.body`, no GET handler) and is
  rate-limited to 60/min (`makeLimit(60)` at `server/index.js:238`) — do not loop this call).
  - **If it returns 400 with a well-formed error body (expected/default)**: record disposition `fixed`,
    citing `connect-four/server/index.js` (current line, re-verify — the finding's original `:942`
    citation is stale) with today's date.
  - **If it still 500s**: this is the second fix-here-authorized item — add/fix the `validateMoves` guard
    on this route and add an integration test under `connect-four/tests/integration/` per
    `docs/architecture/testing-conventions.md`'s "HTTP endpoint behavior" row before closing it out.
- [x] T005 [US1] Live-check English-in-Spanish leaks (FR-006). First re-verify the four already-named
  leaks at their current locations — Past Games sort chips ("Worst Mistakes"/"Played Well"),
  Review/blunder headers ("You played"/"Prev"/"Next"), and `connect-four/src/components/KbTermPopup.jsx`
  (expect `t(\`kb.term.${kbId}\`, ...)` at/near line 66) — by switching the running app to Spanish
  (Settings → language, or `localStorage` key `app_language`) and visiting each screen; also run
  `grep -rn "Worst Mistakes\|Played Well\|You played" connect-four/src` to confirm zero raw-literal
  matches on those screens. Then walk the rest of `agentic_QA_2026-07-15-1321.md`'s batches (A–F) in
  Spanish looking for any *other* leak the file names that is not already known to be owned by Epic 3
  (upgrade-funnel/payments).
  - **For the four already-named leaks (expected/default)**: record disposition `fixed` with the
    zero-match grep + screen observation as evidence, today's date. No code change.
  - **For any other leak this triage actually finds, not already owned by Epic 3**: run the required
    triage step first (`git log --oneline --grep "<screen/component keyword>"` and
    `git log --oneline -- <the component file>`) to rule out a fix that already landed elsewhere before
    treating it as fix-here. If still open, fix it — wire the literal through `t()` in its component, add
    the key to **both** `connect-four/src/i18n/en.json` and `es.json` (parity enforced by
    `connect-four/tests/unit/i18nKeyParity.test.js` — run it after adding), following the Rioplatense
    voseo convention. This is authorized narrowly (Epic 6 US6.5 shipped, commit `4d78aa2`) — do not run a
    fresh repo-wide sweep beyond what this triage step actually finds.
  - **For any i18n leak already owned by Epic 3 (upgrade-funnel/payments)**: record `owned-by-Epic-3`,
    pointer only, no edit.
- [x] T006 [US1] Live-check the anon challenge-progress 401 fix (FR-007). In a clean/incognito (or
  IndexedDB-cleared) anonymous session against the running dev server, start a Challenge session and
  confirm progress persists across puzzles without a 401 from the endpoint that tracks it.
  - **If it still holds (expected/default)**: record `fixed`/"still holding" with today's date; no code
    change (a regression here is explicitly out of FR-004/005/006's fix-here scope per the Assumptions —
    it would get a new `OI-N`, not a fix, even if small).
  - **If it regressed**: file a new `OI-N` in `docs/open_issues.md` per T009's contract; do not fix it
    under this feature.
- [x] T007 [US1] **Open with an explicit denominator step**: enumerate and freeze the finding list in
  `agentic_QA_2026-07-15-1321.md` — 25 `####` blocks, of which 23 are actual problem reports (`[major]`
  ×3, `[minor]` ×18, `[polish]` ×2) and 2 are `[passes]` entries (things that worked, not findings,
  excluded from the disposition count by definition) — plus a separate sweep of the four `❌ fail` rows
  embedded in checklist tables outside any `####` header (e.g. line 474, "Paid gates read 'is paid' only
  through shared swappable interface — ❌ fail"), which were never promoted to a write-up and are the
  only place a genuine unaddressed problem can hide. State **23 dispositioned findings + 4 swept
  checklist rows** as the stated total in the OI-35 record (T009), and record which classes are excluded
  by definition (the 2 `[passes]` entries) and why. Give each of the four `❌` rows a disposition under
  the same five-way rule — the paid-gate architecture row (line 474) most likely resolves to an Epic 3
  (Lane A) pointer or a new `OI-N`, not a fix here (the upgrade-funnel/payments exclusion remains fully
  intact). Then re-triage every remaining `####` finding (Batches A–F, all entries not already covered by
  T003–T006) against the current tree. For each: assign exactly one of
  `fixed` (cite the current-tree evidence — file/line, test, or commit), `stale` (original repro no
  longer applies — state why), `owned-by-Epic-N` (Epic 3 upgrade-funnel/payments findings stay a pointer,
  not edited; Epic 6 US6.5 i18n findings are dispositioned against the **shipped** commit `4d78aa2` —
  confirmed-covered or a new `OI-N` for anything it left behind, per FR-009), or `new OI-N` (confirmed
  still open, outside T003–T006's fix-here scope — file it in `docs/open_issues.md` following the shape
  of a recent worked example, e.g. OI-38's `UPDATE 2026-07-30` block). The candidate-generation
  "fetch failed" finding keeps its existing "environmental flake" classification — do not reopen it
  (FR-008). Do not fix anything found in this task; a `fix-here` disposition is illegal here — only
  T003–T005 may fix code (Assumptions: the three fix-here items are the full and only set).
- [x] T008 [US1] Update `agentic_QA_2026-07-15-1321.md` in place: append a `DISPOSITION:` line directly
  under each finding using the literal tag vocabulary from `contracts/disposition-record-format.md`
  (`DISPOSITION: fixed — <file:line or test>, verified <date>` / `stale — <reason>, verified <date>` /
  `fix-here — see OI-35, fixed <date>` / `owned-by-Epic-<N> — <shipped, confirmed covered | new OI-N
  filed: OI-<M>>` / `new-OI-N — filed as OI-<M>`), covering every disposition from T003–T007. Confirm
  `grep -n "^DISPOSITION:" agentic_QA_2026-07-15-1321.md` returns 23 lines — the denominator T007 froze
  and stated in the OI-35 record (the 2 `[passes]` entries are excluded by definition, not counted) —
  and separately confirm the four `❌` checklist rows T007 swept each carry a recorded disposition in the
  OI-35 table, even though they carry no `DISPOSITION:` line in the file itself (SC-002).
- [x] T009 [US1] Rewrite `docs/open_issues.md`'s OI-35 entry: remove the false "the **committed** findings
  file" claim (correct only if T002 has landed by the time this is written), replace the body with the
  full durable disposition table per `contracts/disposition-record-format.md`'s "Per-`OI-N` durable
  record" shape (one row per finding or a grouped summary with an explicit total count matching T007's
  stated denominator: 23 dispositioned findings + the 4 swept `❌` checklist rows) — not a link back to
  the file. Mark
  `**Status**: ✅ RESOLVED <date>` if every finding landed as fixed/stale/owned/new-OI-N with no
  fix-here work still pending, or keep it open with a dated `**UPDATE**` block naming exactly what
  remains (per FR-023 and the Issue closeout convention). File any new `OI-N` entries T006/T007 produced
  in the same change. This is the story's closeout write — confirm against spec.md's Independent Test
  and Acceptance Scenarios 1–9 before moving on.

**Checkpoint**: US1 fully functional and independently testable. `agentic_QA_2026-07-15-1321.md`
committed with every finding dispositioned; OI-35 durable and accurate.

---

## Phase 4: User Story 2 - Document the accepted onboarding alternative (Priority: P2)

**Goal**: The onboarding mission screen's text bubble alone fully conveys the greeting in English and
Spanish; the accepted first-interaction-playback alternative is documented and OI-21 is closed; a real,
non-automated browser confirms (or fails to confirm) the greeting is audible before `staging_checks.md:495`
is signed off (FR-010–FR-014b).

**Independent Test**: With audio muted/blocked, reach the mission screen in English and Spanish and
confirm the text bubble alone conveys the full greeting. Separately, in a real (non-automation) browser
from a clean incognito session, reach the mission screen via the first-run auto-route and confirm (or
fail to confirm) the greeting audibly plays on first interaction, in both languages.

- [x] T010 [US2] Verify FR-011: with the app's audio muted (or an autoplay-blocked state), reach
  `OnboardingMissionScreen` fresh in English, then again in Spanish, and confirm the coach's on-screen
  text bubble alone — no audio — fully conveys the greeting content in both languages (Acceptance
  Scenario 1, SC-006). Read-only verification; no code change expected. If the text is found to be
  incomplete relative to the audio script in either language, that is out of this feature's fix-here
  scope (FR-012 forbids new onboarding UI, and a copy gap here is a distinct, smaller fix than anything
  named in FR-004–006) — file a new `OI-N` rather than editing under this feature.
- [x] T011 [US2] Write the accepted-alternative rationale into `docs/open_issues.md`'s OI-21 entry
  (first-interaction playback, status quo; rationale: browsers block `audio.play()` before a user
  gesture, and the mission screen is reached via `shouldAutoRouteToOnboarding`'s auto-route with no prior
  gesture) and mark it `**Status**: ✅ RESOLVED <date>` (FR-010, Acceptance Scenario 2, SC-005). Per
  plan.md, OI-21's design-question closeout is satisfied by this documentation alone, independent of
  T012's outcome — do not gate this task on T012.
- [x] T012 [US2] **MANUAL, human-in-the-loop — MUST NOT be performed with `/app-qa` automation tooling,
  `chrome-devtools` MCP, or any other headless/automation browser** (FR-014a; those tools disable
  autoplay-blocking and produce a false pass). Following `quickstart.md` §6: a human opens a real desktop
  browser in a clean incognito/private window, navigates to the app's first-run URL so the anonymous
  auto-route lands on `OnboardingMissionScreen`, makes a first interaction (tap/click/keypress), and
  listens for the coach greeting — then repeats in a fresh incognito session with the language switched
  to Spanish. Apply the `staging_checks.md:495` sign-off contract from
  `contracts/disposition-record-format.md` — there are exactly three legal outcomes, not two:
  - **Audible in both languages**: check `staging_checks.md:495`'s box (`- [x]`), with a dated note
    naming the real browser used, and cite this observation from OI-21 (FR-014).
  - **Silently blocked in either language**: leave the checkbox `- [ ]`, add a dated note of what was
    observed, and file a new `OI-N` in `docs/open_issues.md` describing the silent-block finding
    (FR-014b) — this is a bug to file, not a pass.
  - **Not yet performed this session** (no human available to run it at this point in the task
    sequence): leave the checkbox `- [ ]` and add a dated note stating the check is pending, naming a
    **specific owner and a concrete ISO target date** — not a generic "pending" (e.g. "pending
    real-browser check — handed off to `<real name>`, target `<YYYY-MM-DD>`, see OI-21"). File this same
    owner + target date in `docs/deployment_steps.md` **and** the OI-21 body in `docs/open_issues.md`, in
    addition to the dated note beside the `staging_checks.md:495` checkbox, so the pending check is
    discoverable wherever pre-staging gates are actually read, not only at staging sign-off. This is a
    legitimate outcome, not a blocker — it does not reopen OI-21 (T011 already closed the design question)
    and does not block T013 or Phase 5.
  Do not substitute any automated/scripted check to manufacture the first or avoid recording the third.
- [x] T013 [US2] Confirm-and-close: verify FR-012 (no new onboarding entry-point UI — splash, welcome
  card, routing change, speaker affordance — was introduced by T010–T012) and FR-013
  (`shouldAutoRouteToOnboarding`'s anonymous-only semantics and the no-flash-of-the-sparring-game
  constraint are unchanged — read `connect-four/src/lib/onboardingRouting.js`/`App.jsx`'s relevant effect
  and confirm no diff) by confirming `git diff` for this story touches only `docs/open_issues.md` and
  `staging_checks.md` (Acceptance Scenario 5). This is the story's Independent Test checkpoint — re-read
  spec.md's US2 Acceptance Scenarios 1–5 against T010–T012's actual outcomes before considering the story
  done.

**Checkpoint**: US2 fully functional and independently testable. OI-21 closed regardless of T012's
outcome; `staging_checks.md:495` reflects exactly one of the three legal states with a dated note.

---

## Phase 5: User Story 3 - Verify-and-close on the review surface (Priority: P2)

**Goal**: The stale "blunders only" deep-reveal restriction is removed from the live design doc and D2 is
recorded in both durable locations with no gate code shipped; the in-app "optimal moves then resign"
repro is reproduced (not assumed) before any close-as-not-a-bug claim on OI-37, with the resign-repro
task strictly ordered before the closeout task (FR-015–FR-022, Settled Decision #2).

**Independent Test**: For the deep-reveal half, confirm
`docs/superpowers/specs/2026-07-13-anon-free-deep-reveal-design.md:41` no longer states "blunders only"
and confirm `docs/open_issues.md` records the decision. For the accuracy half, play a sparring game
making only optimal moves, then resign, and observe what the Review screen shows.

- [x] T014 [US3] Edit `docs/superpowers/specs/2026-07-13-anon-free-deep-reveal-design.md:41`: remove the
  live "blunders only" restriction line (`4. **Which mistakes:** **blunders only.** Only genuine blunders
  open the reveal…`) and replace it with the documented reversal trigger (evidence anonymous users
  routinely spend the reveal on suboptimal, non-blunder moves) and the response to that trigger (steer
  via copy/UI nudges, not restrict) — FR-015. Do **not** re-edit
  `docs/superpowers/plans/2026-07-13-anon-free-deep-reveal.md:18` — confirm by reading it first that it
  already carries the equivalent line struck through and marked `RETIRED 2026-07-16`; cite it as evidence
  D2 shipped, not a target. If line 41 is already gone by the time this runs, this is **not** a trivial
  pass — confirm the reversal-trigger note is present at that path and add it if missing (Edge Cases).
- [x] T015 [US3] Record D2 (retire "blunders only", ship no gate) in `docs/open_issues.md` — a new or
  existing entry for the deep-reveal spend-policy decision, with the rationale from Settled Decision #5
  (server-side gate maps ambiguously to stored rows; client-only gate is theatre against a public no-auth
  permalink `/api/blunders/:id`; blocking a deliberate click costs conversion; spec-042's "label + color
  only, never gates an action" invariant) — FR-017. Confirm `docs/epics/open-issues-epics.md` Epic 7's
  existing Settled Decision #5 still reads correctly (verify, do not duplicate a drifting second copy).
  Confirm zero lines of gate/restriction code exist anywhere in the deep-reveal spend path
  (`grep -rn "blunder" connect-four/server/index.js connect-four/src` around the deep-reveal
  routes/components and confirm no move-type check gates the spend) — FR-016, SC-008.
- [x] T016 [US3] **Before any close-as-not-a-bug determination** (FR-018 — this task strictly precedes
  T018): reproduce the findings file's in-app repro. Start a sparring game
  (`eval "$(./worktree-ports.sh)"` first), play only solver-optimal moves for every user move (use the
  Hint toggle in `connect-four/src/screens/GameScreen.jsx` — `handleHintToggle` at line 124, the button
  at lines 221–233 labelled `t('sparring.hintsOn')`/`t('sparring.hintActive')`, feeding `hintOverlays`
  (`src/lib/useGameBoard.js:36`) into the Board's `overlays` prop at line 213 — to confirm optimality; do
  not assume from feel, per `feedback_verify_at_the_source_layer`), then resign (`handleResign` at
  `GameScreen.jsx:125`/`238`). Land on `connect-four/src/screens/ReviewScreen.jsx` and read what actually
  renders for the Accuracy card and summary line.
  - **If it still shows "Clean game. Nothing to revisit." / 100% with no `cleanButLost` framing
    (FR-019, live bug)**: work out why the `isLoss` guard (`const isLoss = result === 'loss' ||
    outcome === 'lost';` at `ReviewScreen.jsx:280`) isn't firing for the resign trigger — reproduce
    before theorizing — then fix it and add a regression test (e.g. extend
    `connect-four/tests/unit/reviewChipQuality.test.js` or add a case exercising the resign trigger
    specifically) before moving to T017.
  - **If `review.cleanButLost` already renders correctly for this trigger (expected/default per plan.md)**:
    no code change; proceed to T017 with this observation as evidence for T018.
- [x] T017 [US3] Confirm FR-021/FR-022 regardless of T016's branch: the accuracy calculation itself is
  byte-for-byte unchanged (no outcome-folding, no threshold, no suppression rule, no new Stats metric —
  `git diff` for this story should show no change to the accuracy computation in `ReviewScreen.jsx` or
  `papergamesImporter.js` beyond whatever T016's bug-branch, if it fired, touched for copy/framing only);
  and that the already-shipped `review.cleanButLost` copy (`connect-four/src/screens/ReviewScreen.jsx`
  near line 293, `en.json`/`es.json` near line 1005) still reads correctly in both languages (Acceptance
  Scenario 7, SC-010).
- [x] T018 [US3] Close `docs/open_issues.md`'s OI-37 entry: cite evidence from **both** triggers — the
  342-game Papergames `finish_reason` breakdown (already measured in spec.md's Non-Obvious Facts /
  `docs/epics/open-issues-epics.md` Epic 7, cite verbatim, do not re-derive) and T016's in-app
  verification result (whichever branch it landed on) — and mark
  `**Status**: ✅ RESOLVED <date>` (FR-020, FR-023, Acceptance Scenarios 3–6, SC-009, SC-011). This is
  the story's closeout write — confirm against spec.md's US3 Independent Test and Acceptance Scenarios
  1–7 before considering the story done. T016 must have run first — do not write this task's OI-37 close
  before the resign repro (T016) has produced its observation.

**Checkpoint**: US3 fully functional and independently testable. Deep-reveal spend-policy D2 recorded in
both durable locations, no gate code shipped. OI-37 closed with evidence from both triggers, resign
repro strictly reproduced before closeout.

---

## Phase 6: Epic-level closeout

**Purpose**: Cross-story confirmation that the epic's acceptance criteria (`docs/epics/open-issues-epics.md`
Epic 7) and spec.md's Success Criteria are met as a whole, once US1/US2/US3 are all done.

- [x] T019 Confirm all three of OI-35, OI-21, OI-37 show a dated resolution (or dated "deliberately not
  fixed, decision recorded") entry in `docs/open_issues.md` (SC-011); confirm `git log --diff-filter=A --
  agentic_QA_2026-07-15-1321.md` now returns a commit (SC-001); confirm
  `grep -n "^DISPOSITION:" agentic_QA_2026-07-15-1321.md | wc -l` equals 23 — the denominator T007 froze
  and stated in the OI-35 record (2 `[passes]` entries excluded by definition) — and that the OI-35 table
  also carries a disposition for each of the four swept `❌` checklist rows (SC-002); run
  `cd connect-four && npm run test:fast` one final time and confirm it is green, including
  any test added by T003/T004/T005/T016's bug branches. Record which of T003–T006/T012/T016's branches
  actually fired this session, since that determines which of this epic's "at most three" conditional
  code edits actually landed (plan.md Summary).

**Checkpoint**: Epic 7 acceptance criteria fully satisfied; all three OI-Ns closed or left open with a
dated, accurate note of what remains.
