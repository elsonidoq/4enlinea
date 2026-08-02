# Implementation Plan: QA Backlog & Product/UX Decisions

**Branch**: `worktree-epic-5-audio-verification-tts` | **Date**: 2026-08-01 | **Spec**: `specs/053-qa-backlog-product-ux/spec.md`
**Input**: Feature specification from `/specs/053-qa-backlog-product-ux/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Three independent, mostly-decided threads share one plan because they are the epic's full scope, not
because they share implementation surface:

1. **US1 — Evidence sweep, not a fix sweep.** Commit `agentic_QA_2026-07-15-1321.md` (currently
   untracked: `git status --short` still reports `?? agentic_QA_2026-07-15-1321.md`). Re-triage every
   finding in it against the current tree and assign exactly one of five dispositions. All three of the
   originally-named fix-here items are already fixed at source: `/api/scores` 400 at
   `connect-four/server/index.js:1037-1040`; the four i18n leaks, verified zero-matches, incl.
   `KbTermPopup.jsx:66` now `t(\`kb.term.${kbId}\`, ...)`; and the `/mistakes ↔ /stats` cold-load nav
   loop, fixed 2026-07-16 by commit `f4de927` (`resolveCategoryListBack({ navContext })` in
   `connect-four/src/screens/categoryListBack.js`, consumed at `CategoryListScreen.jsx:64`, regression
   test at `connect-four/tests/unit/categoryListBack.test.js`) — for all three, record evidence, write
   no new code, unless a fresh live-check somehow finds one still reproducing. The triage also live-checks
   the findings file for any *other*, not-previously-named English-in-Spanish leak: Epic 6 US6.5 has
   shipped (commit `4d78aa2`), so a leak it missed is fixed here under FR-006 rather than merely pointed
   at (`docs/epics/open-issues-epics.md`'s Epic 7 `NOT included` amended accordingly). `docs/open_issues.md`'s
   OI-35 entry is rewritten to stop claiming the file is "committed" and to carry the full durable
   disposition table.
2. **US2 — Record-and-close on OI-21.** No code change to onboarding routing/UI. Confirm the mission
   screen's on-screen text (`onboarding.mission.*`) conveys the full greeting in EN+ES without audio,
   write the accepted-alternative rationale into `docs/open_issues.md` OI-21, and — the plan's one
   manual, non-automatable step — obtain a real-browser (non-automation) confirmation that the greeting
   audibly plays on first interaction before signing off `staging_checks.md:495`. This human step has
   three legal outcomes, not two: audible in both languages (checkbox checked, dated note), silently
   blocked in either language (checkbox stays unchecked, new `OI-N` filed — not a pass), or **not yet
   performed this session** (checkbox stays `- [ ]`, dated handoff note naming who it is pending on).
   OI-21 itself still closes regardless of which of the three outcomes the manual step lands on — FR-014a
   governs only the `staging_checks.md:495` checkbox, not the OI-21 design-question closeout, which is
   satisfied by documenting the accepted alternative alone (an implementing agent can always do this).
3. **US3 — Record-and-close on ReviewScreen.** Delete the stale "blunders only" line at
   `docs/superpowers/specs/2026-07-13-anon-free-deep-reveal-design.md:41`, replace it with the reversal
   trigger + steer-not-restrict response, and record D2 in both `docs/open_issues.md` and
   `docs/epics/open-issues-epics.md` (no gate code anywhere). Reproduce the in-app "optimal moves then
   resign" repro on ReviewScreen; if `review.cleanButLost` (`connect-four/src/screens/ReviewScreen.jsx:293`,
   already shipped, confirmed present in both `en.json`/`es.json` at line 1005) still renders correctly,
   close OI-37 with evidence from both the Papergames dataset and the in-app check; if it does not, that
   is a live bug this story fixes.

No new schema, no new API contract, no new Stats metric — this is a documentation-and-verification
epic with at most two small code changes expected (an i18n leak the triage finds and Epic 6 missed;
ReviewScreen-if-still-broken), each gated on a live-check finding the thing still reproduces. (The
nav-loop item, previously counted as a third likely code change, turned out to already be fixed at
source by `f4de927` — see US1 above — so the live count is lower than the plan originally assumed;
the cap below stays at three to leave headroom for a fresh live-check surprise, not because a third
change is expected.)

## Technical Context

**Language/Version**: JavaScript (Node.js, ES modules) — no new language/runtime introduced.
**Primary Dependencies**: React 18 (frontend, `connect-four/src/`), Express (server, `connect-four/server/`), `node:test` for all automated tests. No new dependency added.
**Storage**: N/A for code changes (no schema/migration). Markdown/JSON documentation files are the actual "storage" this feature writes to (`docs/open_issues.md`, `docs/epics/open-issues-epics.md`, `agentic_QA_2026-07-15-1321.md`, `staging_checks.md`, `docs/superpowers/specs/2026-07-13-anon-free-deep-reveal-design.md`).
**Testing**: `node:test` via `npm run test:fast` (inside `connect-four/`) for any code change (ReviewScreen fix if needed, i18n leak fix if the triage finds one). The nav loop is expected to be evidence-only (already covered by `connect-four/tests/unit/categoryListBack.test.js`, shipped with `f4de927`) — re-run that existing test as part of the live-check rather than writing a new one, unless the live-check surprises us. Manual/real-browser verification for FR-014a (explicitly not automatable — see Constraints).
**Target Platform**: Web app (React SPA + Express API), existing deployment (Railway staging/production, unaffected by this feature).
**Project Type**: Web application — existing `connect-four/src/` (frontend) + `connect-four/server/` (backend) split; this feature works inside that existing structure, adding no new top-level directory.
**Performance Goals**: N/A — no perf-sensitive code path touched by this feature's likely code changes (nav-loop back button, i18n string swap, ReviewScreen accuracy display).
**Constraints**:
- No accuracy-calculation change of any kind (no outcome-folding, no threshold, no suppression rule, no new Stats metric) — Settled Decisions #2/#4, FR-021.
- No gate code (server or client) restricting deep-reveal spend by move type — Settled Decision #5, FR-016.
- No onboarding entry-point redesign (splash, welcome card, routing change, speaker affordance) — Settled Decision #3, FR-012.
- `shouldAutoRouteToOnboarding`'s anonymous-only semantics and the no-flash-of-the-sparring-game constraint stay untouched — FR-013.
- FR-014a's real-browser audibility check MUST NOT be performed with `/app-qa` automation tooling or any headless/automation browser (fakes autoplay permission) — this is the spec's one manual, human-in-the-loop step; it cannot be discharged by a test or a script.
- The three fix-here items (FR-004/FR-005/FR-006) are the *only* findings this feature may fix in code; anything else confirmed still open is filed as a new `OI-N`, never fixed here even if small (Assumptions).
- Tests: `npm run test:fast` from inside `connect-four/` only — never bare `npm test` (hangs on `candidate-generator.test.js`'s solver IPC).
- `docs/superpowers/plans/2026-07-13-anon-free-deep-reveal.md:18` (already `RETIRED 2026-07-16`) is cited as evidence only and MUST NOT be re-edited — only `docs/superpowers/specs/2026-07-13-anon-free-deep-reveal-design.md:41` is edited.
**Scale/Scope**: 3 user stories, 8+4+5 = 17 epic-level tasks per `open-issues-epics.md` US7.1–US7.3 sizing (this plan's task count in `tasks.md` may be finer-grained but must not expand scope beyond FR-001–FR-023).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Principle I (Explanation Engine as SSOT)**: Not implicated — this feature touches no move-evaluation, pattern-label, or LLM-annotation code path. The deep-reveal spend-policy story (US3) explicitly ships no gate code, so the Explanation Engine's grounding/routing is untouched. **PASS.**
- **Principle II (Code Quality & Simplicity)**: The nav loop is already fixed at source (`f4de927`) and is evidence-only under this plan; the ReviewScreen fix (if still live) must be the minimal change — no speculative abstraction. **PASS by construction; re-verify at task-writing time against whatever the live-check finds.**
- **Principle III (Testing Standards)**: Any code change ships with a regression test; UI features (nav loop — re-run its existing regression test as a live-check; ReviewScreen accuracy display) are manually verified on the golden path per this principle **and** per FR-018 (live in-app repro) and FR-014a (real-browser). **PASS.**
- **Principle IV (UX Consistency & Progressive Disclosure)**: Deep-reveal spend policy stays "label + color only, never gates an action" (spec-042 invariant, restated by Settled Decision #5) — no new gating UI is introduced. **PASS.**
- **Principle V (Performance)**: Not implicated. **PASS.**
- **Principle VI (Implementation & Debugging Methodology — reproduce before theorizing)**: This is the epic's organizing method: FR-004/005/006/007 require live-verification before disposition; FR-018 requires reproducing the in-app repro before any close-as-not-a-bug claim; FR-014a requires a real-browser observation before sign-off. **PASS — this feature is largely an instance of Principle VI applied to a backlog.**
- **Principle VIII (Documentation as First-Class Deliverable)**:
  - [x] Existing architecture docs read before this plan was drafted: `docs/epics/open-issues-epics.md` Epic 7 (Settled decisions, Non-obvious facts, Authoritative sources), `docs/architecture/frontend-conventions.md` (screen registry, `SESSION_ONLY_SCREENS`, `urlMapping.js`), `docs/architecture/testing-conventions.md` (`test:fast` vs `test`, DOM tests), `docs/best_practices_spec_driven_development.md`, `docs/open_issues.md` (OI-35, OI-21, OI-37 full bodies), the constitution.
  - [x] No undocumented convention was discovered during this review that needed documenting before planning could continue — this feature's job *is* documentation (OI-35/21/37 entries, the epic file, the design doc), not a new architectural pattern.
  - [x] `tasks.md` will include an explicit documentation task per story: OI-35 rewrite (US1), OI-21 rationale + `staging_checks.md` sign-off (US2), OI-37 closeout + `docs/epics/open-issues-epics.md` D2 record (US3) — see FR-017/FR-023.

No violations. Complexity Tracking is not filled (no violations to justify).

## Project Structure

### Documentation (this feature)

```text
specs/053-qa-backlog-product-ux/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command) — "entities" are doc/tracking artifacts, not DB tables
├── quickstart.md         # Phase 1 output (/speckit-plan command) — the live-check/verification walkthrough
├── contracts/            # Phase 1 output (/speckit-plan command) — the OI-N disposition record shape (doc contract, not an API)
└── tasks.md              # Phase 2 output (/speckit-tasks command — NOT created by /speckit-plan)
```

### Source Code (repository root)

This feature works entirely inside the existing structure — no new directory, no new service.

```text
connect-four/
├── src/
│   └── screens/
│       ├── categoryListBack.js           # FR-004 (already fixed by f4de927, evidence only — no edit expected)
│       ├── CategoryListScreen.jsx        # FR-004 (consumes categoryListBack.js at line 64, evidence only)
│       └── ReviewScreen.jsx              # FR-018-022: cleanButLost / accuracy display, if the in-app repro still shows it
├── server/
│   └── index.js                          # FR-005 (already fixed, evidence only — no edit expected)
├── src/components/KbTermPopup.jsx        # FR-006 (already fixed, evidence only — no edit expected)
├── src/i18n/{en,es}.json                 # FR-006, only if the triage finds a new, not-already-owned leak
└── tests/                                # any regression test the live-checks require, registered per testing-conventions.md

docs/
├── open_issues.md                        # FR-001/002/003/010/017/020/023: OI-35, OI-21, OI-37 rewritten; any new OI-N filed here
├── epics/open-issues-epics.md            # FR-017: D2 (deep-reveal spend policy) recorded in Epic 7's own text
└── superpowers/specs/2026-07-13-anon-free-deep-reveal-design.md   # FR-015: "blunders only" line replaced

staging_checks.md                         # FR-014/014a/014b: line 495 — checked+dated-note (audible), or
                                           # left unchecked with a dated note for either "silently blocked"
                                           # (+ new OI-N) or "not yet performed this session" (+ handoff note)
agentic_QA_2026-07-15-1321.md             # FR-001/002/003: committed; updated in place with per-finding disposition
```

**Structure Decision**: Existing single-repo web-app layout (`connect-four/src` + `connect-four/server`) is
reused unchanged. This feature is a documentation-and-verification pass with at most three narrowly-scoped
code edits — `ReviewScreen.jsx`'s accuracy/clean-game copy path (FR-018–FR-019, if the in-app repro still
shows the bug), and — only if the triage finds a leak the findings file did not already name and that Epic
6 US6.5's shipped sweep (commit `4d78aa2`) missed — a `t()` wiring fix in whichever component the leak is
in, with the new key added to **both** `src/i18n/en.json` and `src/i18n/es.json` (FR-006). The `/mistakes ↔
/stats` nav-loop item is **not** a planned code edit: it is already fixed at source by commit `f4de927`
(`connect-four/src/screens/categoryListBack.js`, consumed at `CategoryListScreen.jsx:64`), so `App.jsx` is
explicitly **not** in the allowed-edit list — the fix never lived in its global `goBack`, and a
history-stack-depth guard or `go('home')` fallback there would be unsound (`window.history.back()` has no
knowledge of in-app stack depth, and `history.length` counts the whole tab session) and would regress
in-session Back behavior the findings file confirms works today. Each of the two remaining conditional
edits is gated on its own live-check finding the underlying thing still reproduces. No new page, route,
store method, or server endpoint is introduced.

## Complexity Tracking

> Fill ONLY if Constitution Check has violations that must be justified

No violations — table intentionally omitted.

## Post-Phase-1 Constitution Re-Check

Re-verified after `research.md`/`data-model.md`/`contracts/`/`quickstart.md` were written:

- **Principle I / IV / V**: unaffected — Phase 1 design confirmed no new move-evaluation, gating, or
  perf-sensitive surface is introduced (`data-model.md`'s "Game accuracy badge" and "Deep-reveal spend
  policy record" entities are explicitly read-only/decision-record-only, no schema).
- **Principle II**: the disposition-record contract (`contracts/disposition-record-format.md`) is a
  plain-text tag convention, not a new abstraction layer. It does **not** match existing
  `docs/open_issues.md` entry conventions — that file keeps its house prose style (`**Status**:` /
  `**UPDATE <date>**` blocks), unchanged. The greppable `DISPOSITION:` tag is a one-off convention
  scoped to `agentic_QA_2026-07-15-1321.md` only, chosen because that file is a one-off triage artifact
  where a machine-checkable per-finding count is genuinely useful (`grep -n "^DISPOSITION:"` proves
  SC-002's "zero findings unaddressed"); it is not proposed as, and must not be read as, a repo-wide
  convention.
- **Principle III / VI**: `quickstart.md` operationalizes "reproduce before theorizing" for all six
  live-check items (FR-004/005/006/007/018/014a) with concrete steps, not inference from code reading
  alone.
- **Principle VIII**: Phase 1 outputs themselves satisfy the "documentation is first-class" requirement
  for this feature — there is no separate architecture-doc update needed beyond `docs/open_issues.md`,
  `docs/epics/open-issues-epics.md`, and the design doc edit already named in FR-015/FR-017, since this
  feature introduces no new architectural pattern (confirmed by the Summary: at most three narrowly
  scoped, live-check-gated code edits).

No new violations surfaced by Phase 1 design. Gate remains PASS.
