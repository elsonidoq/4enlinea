# Quickstart: Live-Verification Walkthrough

This feature's real work is verification, not construction. This file is the runbook for the six
live-check steps the spec requires before any disposition/closure can be recorded. Run `eval "$(./worktree-ports.sh)"`
from the repo root before starting any server (standing rule, `CLAUDE.md`) — it is safe unconditionally
and yields `$API_PORT`/`$VITE_PORT` for this worktree.

## 1. `/mistakes ↔ /stats` cold-load nav loop (FR-004)

This is **already fixed at source** — commit `f4de927` ("fix: stop /mistakes<->/stats back toggle on
cold load", 2026-07-16) shipped `resolveCategoryListBack({ navContext })` in
`connect-four/src/screens/categoryListBack.js`, consumed at `CategoryListScreen.jsx:64`
(`connect-four/src/lib/screenRegistry.jsx:35` maps `mistakes: CategoryListScreen`), with a regression
test at `connect-four/tests/unit/categoryListBack.test.js`. The fix was never in `App.jsx`'s global
`goBack`. Treat this step as a live-check confirming the fix still holds, not a fix-here task — the
**default expected outcome is `fixed`, citing `f4de927`**.

1. Run the existing regression test: `cd connect-four && npm run test:fast -- categoryListBack` (or the
   project's equivalent single-file `test:fast` invocation) and confirm it passes.
2. Start the app fresh (`eval "$(./worktree-ports.sh)"`, then the usual dev-server start for this repo).
3. Navigate directly to `$VITE_PORT/mistakes` by typing the URL (cold load — empty `window.history`
   stack), not by clicking through from another screen.
4. Press the in-app Back control repeatedly.
5. **Expected (default)**: reaches Home within a bounded number of presses — record disposition `fixed`,
   evidence `f4de927` + the passing regression test, with today's date.
6. **If it somehow still reproduces** (toggles between `/mistakes` and `/stats` indefinitely) despite the
   above: do not touch `App.jsx` — its `goBack`/`window.history.back()` is a browser-global with no
   knowledge of in-app stack depth, and a guard there would regress in-session Back behavior that
   currently works (home → /pastGames → /game/:id → /blunder/:id, then Back ×3 unwinds cleanly). Instead,
   re-open `categoryListBack.js`/`CategoryListScreen.jsx:64` and work out why `resolveCategoryListBack`
   isn't producing `'home'` on this cold load before touching anything — Constitution Principle VI,
   reproduce before theorizing — then add/extend the regression test in `categoryListBack.test.js`.

**Required triage step before any `fix-here` disposition, here and for the rest of US1**: for any finding
in `agentic_QA_2026-07-15-1321.md` claimed still-live, first run
`git log --oneline --grep "<finding keyword>"` **and** `git log --oneline -- <the file the finding
originally cited>` to check whether a fix already landed — possibly at a different file than the one
the finding names, as happened here. Only assign `fix-here` after that search comes up empty against the
current tree.

## 2. `/api/scores` malformed-movestring guard (FR-005)

This is **already fixed at source** — `connect-four/server/index.js:1037` is `app.post('/api/scores',
...)`, line 1038 reads `const { moves, depth, difficulty } = req.body;`, and `validateMoves(moves)`
returns a 400 (`if (movesErr) return res.status(400).json({ error: movesErr })`) for a malformed
movestring. There is **no GET handler** on this path — a `GET .../api/scores?moves=...` request falls
through to the 404 handler and proves nothing about the guard either way. The route is rate-limited to
60 requests/minute (`app.use('/api/scores', makeLimit(60))` at `server/index.js:238`) — do not loop this
check.

1. Read `connect-four/server/index.js` around `validateMoves(moves)` (near line 1037) to confirm the
   current guard shape.
2. Start the app fresh (`eval "$(./worktree-ports.sh)"`).
3. Send a real malformed-movestring POST request:
   ```
   curl -s -o /dev/null -w '%{http_code}\n' -X POST -H 'Content-Type: application/json' \
     -d '{"moves":"notamovestring"}' "http://localhost:$API_PORT/api/scores"
   ```
4. **Expected (default)**: `400` — record disposition `fixed`, citing `connect-four/server/index.js`
   (current line, re-verify — the finding's original `:942` citation is stale) with today's date.
5. **If it still 500s**: this is a fix-here-authorized item — add/fix the `validateMoves` guard on this
   route and add an integration test under `connect-four/tests/integration/` per
   `docs/architecture/testing-conventions.md`'s "HTTP endpoint behavior" row before closing it out.

## 3. Remaining English-in-Spanish leaks beyond the four named ones (FR-006)

Epic 6 US6.5 (the `src/screens`/`src/components` i18n literal sweep) has **shipped** (commit `4d78aa2`,
"Spec 052 (Epic 6)"). `docs/epics/open-issues-epics.md`'s Epic 7 `NOT included` exclusion for this surface
is lifted accordingly (2026-08-01 amendment) — a leak the sweep missed is fixed here, not merely pointed
at. Scope stays narrow: fix only the specific leaks this triage step actually finds, not a fresh
repo-wide re-sweep.

1. Switch app language to Spanish (Settings → language, or `localStorage` key `app_language`).
2. Walk the screens named in the original findings file batch-by-batch (Past Games, Review/blunder
   detail, KB term popup — already confirmed fixed; then whatever else the findings file names).
3. For each confirmed leak found: wire the literal through `t()`, add the key to **both**
   `src/i18n/en.json` and `es.json` (parity enforced by `tests/unit/i18nKeyParity.test.js`), and follow
   the project's Rioplatense voseo convention for the Spanish copy.
4. For anything already covered by the four confirmed-fixed items, record the disposition per the
   contract — do not re-fix.

## 4. Anon challenge-progress 401 (FR-007)

1. In a clean/incognito (or IndexedDB-cleared) anonymous session, start a Challenge session.
2. Confirm progress persists across puzzles without a 401 from whatever endpoint tracks it.
3. Record "still holding" or "regressed" with the date — no code change is implied either way unless it
   regressed, and a regression here is out of FR-004/005/006's fix-here scope (file a new `OI-N`, per
   Assumptions, rather than fixing it under this feature).

## 5. In-app "optimal moves then resign" repro on ReviewScreen (FR-018)

1. Start a sparring game (`GameScreen`, easy/medium/hard AI — any difficulty; the point is a real user
   move sequence, not a fixture).
2. Play only solver-optimal moves for every user move (use the Hint toggle in
   `connect-four/src/screens/GameScreen.jsx` — `handleHintToggle` at line 124, the button at lines
   221–233 labelled `t('sparring.hintsOn')`/`t('sparring.hintActive')`, feeding `hintOverlays`
   (`src/lib/useGameBoard.js:36`) into the Board's `overlays` prop at line 213 — to confirm optimality,
   matching `feedback_verify_at_the_source_layer`'s "the real value" standard — do not assume optimality
   from feel).
3. Resign instead of finishing the game (`handleResign` at `GameScreen.jsx:125`/`238`).
4. Land on ReviewScreen and read what actually renders for the Accuracy card and the summary line.
5. **If it still shows "Clean game. Nothing to revisit." / 100% with no `cleanButLost` framing**: this is
   the FR-019 live bug — fix it (the existing `isLoss` guard, `const isLoss = result === 'loss' ||
   outcome === 'lost';` at `ReviewScreen.jsx:280`, is the landing spot; the `review.cleanButLost` copy
   itself renders at `ReviewScreen.jsx:293` — work out why the guard isn't firing for the resign trigger
   specifically before touching it — Constitution Principle VI, reproduce before theorizing).
6. **If `review.cleanButLost` already renders correctly for this trigger**: OI-37 closes per FR-020, citing
   this observation alongside the already-measured 342-game Papergames `finish_reason` table (verbatim,
   not re-derived).
7. Either way, confirm `review.cleanButLost`'s copy itself still reads correctly (FR-022) — this is a
   distinct check from "does the branch fire."

## 6. Real-browser onboarding-greeting audibility, EN + ES (FR-014a) — MANUAL, human-in-the-loop

This step **cannot** be satisfied by any automated or scripted check, and MUST NOT be attempted with
`/app-qa` automation tooling, `chrome-devtools` MCP, or any other headless/automation browser — all of
those disable autoplay-blocking and will produce a false pass (this is exactly the failure mode
`staging_checks.md:495`'s own text warns about, and why local QA's earlier `206`-fetched-but-unverified
result there did not count as a pass).

1. A human opens a real desktop browser (Chrome, Firefox, Safari — whatever is actually installed) in a
   clean **incognito/private** window — no prior site visit, no cached autoplay permission.
2. Navigate to the app's first-run URL so the anonymous auto-route fires and lands on
   `OnboardingMissionScreen` (do not deep-link past it).
3. Make a first interaction (tap/click/keypress) and listen: does the coach greeting audibly play?
4. Switch language to Spanish (fresh incognito session again, to keep the "no prior gesture" precondition
   clean) and repeat.
5. **If audible in both languages**: check `staging_checks.md:495`'s box, with a dated note naming the
   real browser used (per the contract in `contracts/disposition-record-format.md`), and OI-21 closes
   citing this observation (FR-010, FR-014).
6. **If silently blocked in either language**: leave the checkbox unchecked, add the dated note of what
   was observed, and file a new `OI-N` in `docs/open_issues.md` describing the silent-block finding
   (FR-014b) — this is explicitly not a pass, and not something to retry with a different automated tool.
7. **If this manual step has not yet been performed this session** (e.g. an implementing agent reaches
   this point with no human available to do the real-browser check): this is a legitimate third outcome,
   not a blocker to closing the rest of the epic. Leave `staging_checks.md:495`'s checkbox `- [ ]` and add
   a dated note stating the check is pending, naming a **specific owner and a concrete ISO target date** —
   not a generic "pending" (e.g. "pending real-browser check — handed off to `<real name>`, target
   `<YYYY-MM-DD>`, see OI-21"). File this same handoff — owner + target date — in
   `docs/deployment_steps.md` **and** the OI-21 body in `docs/open_issues.md`, in addition to the dated
   note beside the `staging_checks.md:495` checkbox, so the pending check is discoverable wherever
   pre-staging gates are actually read, not only at staging sign-off time. **OI-21 still closes** on the
   design question alone — FR-014a governs only this checkbox, not OI-21's closeout. Epic 7's acceptance
   criteria require the accepted alternative to be *documented* (in `docs/open_issues.md` and
   `staging_checks.md`), which this feature's other, fully-automatable steps already satisfy independent
   of this manual step's outcome: the on-screen text-bubble check (FR-011, US2 Acceptance Scenario 1) and
   the OI-21 rationale write-up (FR-010). An automated or scripted stand-in for the audibility check
   itself is **not** an acceptable substitute for "not yet performed" — do not run `/app-qa` or any
   headless/automation browser
   to manufacture a provisional pass; that contradicts FR-014a's prohibition and the
   `project_app_qa_setup_gotchas` memory finding (automation Chrome fakes autoplay permission, so silent
   audio ships as a false pass).
