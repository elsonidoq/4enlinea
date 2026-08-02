## Blocking issues

**1. The spec explicitly forbids a deliverable the epic makes mandatory (whole-backlog closeout audit).**

Background: `docs/open_issues.md` is the project's backlog, where each item is an `OI-N`. The epics doc (`docs/epics/open-issues-epics.md`) opens with an "Issue closeout convention (MANDATORY for every epic)" and states at line 39, verbatim: *"Epic 8's doc-bookkeeping story is the **audit** of this convention across the whole backlog, not the only place it happens."* Epic 8's own US8.3 says: apply the six named findings (OI-1, OI-15, OI-12, OI-24, OI-77, lesson-text half of OI-18/36/64) *"then **audit the closeout convention across the whole backlog** — walk every `OI-N` this backlog covers and flag any whose code shipped in Epics 1–7 but whose entry still reads as open."*

The spec collapses these two into one and then bans the second. `spec.md` "Out of Scope" says: *"Any general sweep of `docs/open_issues.md` beyond the exact six-issue closeout list named above."* FR-016 and SC-005 likewise cover only the six. The epic's guardrail was narrower than that — it says don't *re-close* other epics' issues, not don't *look at* them. As written, a planning agent will generate zero tasks for the walk-and-flag deliverable.

*Fix:* remove that Out of Scope bullet; replace it with "no issue owned by another epic is re-closed here". Add an FR + SC for the walk-and-flag pass: every `OI-N` referenced by the epics doc is inspected, and any whose code appears to have shipped in Epics 1–7 while its entry still reads open is listed (a flagged report, not an edit to that entry).

**2. The epic's "lint is wired into the test scripts" acceptance criterion is softened into an optional and has no success criterion.**

The epic's Acceptance criteria say: *"`npm run lint` exits 0 on a clean tree (including `.mjs`/`.cjs` files) **and is wired into the test scripts**."* Spec FR-006 reads: *"`lint` MUST be wired into the project's test/CI-facing scripts (`test`, `test:fast`, **and/or documented as** a required pre-commit/CI step)"*. The "and/or documented" branch lets an implementer satisfy FR-006 by writing a sentence in a doc — no gate exists. Worse, none of SC-001…SC-005 mentions wiring at all, so the epic's headline acceptance criterion is entirely unmeasured by this spec.

I re-ran the measurement the spec depends on: `npx eslint .` in `connect-four/` → `296 problems (282 errors, 14 warnings)`, matching the spec. I also confirmed 141 `.mjs` files and **zero** `.cjs` files in the tree (FR-002's `.cjs` clause is future-proofing, harmless).

*Fix:* make FR-006 unconditional — name the concrete wiring point(s) — and add an SC such as "`npm run test:fast` (and/or the pre-commit hook) fails when a lint violation is present, verified by inserting one." Note there is already a live hook at `.githooks/pre-commit` (installed by `package.json`'s `prepare` script) that the spec never mentions; it is the obvious wiring point.

**3. Nothing in the spec requires restoring the `Board.jsx` guard after the deliberate mutation.**

FR-007 requires deleting `&& value === 'empty'` from `connect-four/src/components/Board.jsx` (verified present at line 382) so that `npm run test:dom` fails with an assertion instead of hanging. That line is production code: it suppresses the window-count tint on occupied cells. The parallel lint requirement, FR-004, is careful to say *"then reverting the temporary violation"* — FR-007, SC-002, and US2's Independent Test all omit any revert. A literal implementer can leave a real visual regression in `Board.jsx` and still pass every stated criterion.

*Fix:* add "…the mutation is temporary and MUST be reverted; `git diff` on `Board.jsx` is empty at story completion" to FR-007, and mirror it in SC-002.

## Decisions required

**1. Where exactly does lint become a gate?**

`connect-four/package.json`'s `test`, `test:fast`, and `test:dom` are single hand-maintained strings of the form `node --test <150+ explicit file paths>` — there is no auto-discovery, so "adding lint" means prefixing `eslint . && `.

- **(a)** Prefix `eslint . && ` to `test` and `test:fast`. Strongest gate, but a lint error then blocks all tests from running at all — and this repo's `test:fast` baseline is already 5 pre-existing failures (OI-82), so the two failure modes will be easy to confuse.
- **(b)** Add lint to the existing `.githooks/pre-commit`. Catches it at the real moment, does not disturb the test scripts.
- **(c)** Both.

*Recommended default:* **(c)** — prefix `test:fast` only (leaving the slow `test` and the `test:dom` DOM run untouched), plus the pre-commit hook. This satisfies the epic's literal "wired into the test scripts" while keeping the lint failure distinguishable from the 5-RED test baseline.

**2. What environment does `tests/` get in the split ESLint config?**

Settled decision #1 (and spec FR-001) says: browser globals for `src/`, node globals for `server/`, `scripts/`, and `tests/`. But 8 files under `connect-four/tests/` use browser globals (`document`, `window`, `localStorage`) — the jsdom DOM suite. A pure-node ruleset over `tests/` manufactures new `no-undef` errors that FR-003 ("lint exits 0") then forces someone to suppress.

- **(a)** Follow FR-001 literally, then rule-off the resulting errors.
- **(b)** Three environments: browser for `src/`, node for `server/`+`scripts/`, node **plus** browser globals for `tests/`.

*Recommended default:* **(b)**, recorded in the spec as a clarification of Settled decision #1 rather than a contradiction of it — the decision's intent ("that alone should clear most of the errors") is served better by (b), and (a) trades real errors for suppressions, which is what OI-70 is about in the first place.

## Handoff context

**Systemic issues.** The spec's factual quality is genuinely high — I re-ran `npx eslint .` (296/282/14, exact match), counted `.mjs` files (141, match), confirmed `Board.jsx:382` verbatim, `BoardEditor.jsx:4`'s unused `boardToSpec`, `deepRevealTimeout.js`'s three exports and its test file's exactly-two `test(` blocks at lines 9 and 14, `DeepRevealPane.jsx:12`'s constants-only import, all four section headings of `split-reveal-zoom-contract.md`, `package.json`'s line numbers 13/14/16/17, the 19-file `test:dom` list, and OI-58's trailing Paddle "Resolved (2026-07-18)" paragraph. The systemic failure is not accuracy of facts but **fidelity to the epic's obligations**: in all three blocking issues the spec quietly narrowed or optionalized something the epic made mandatory (whole-backlog audit → banned; wiring → "and/or documented"; revert → absent). Reviewers of the next spec in this series should diff FR/SC coverage against the epic's Acceptance criteria line by line rather than checking facts.

**Reviewer frame.** I weighted the epic section (lines 1669–1804) and the epics doc's global "Issue closeout convention" (lines 17–41) above the spec author's handoff, because the handoff's stated intent ("preserved the exact six-issue list as a bounded backstop, not a general sweep") is exactly where the epic disagrees — the handoff records the narrowing as deliberate, but it was not the epic's to narrow. I re-ran the eslint measurement rather than trusting it, and opened every negative claim I could cheaply check.

**Non-obvious for a fix agent.** Line numbers have drifted: `eslint.config.js`'s `files` glob is line **10**, not 9, and the file is **29** lines, not 27; OI-58's trailing paragraph is around line **1745**, not 1747. Locate by symbol/text, not line. Also: the epics doc's "Already resolved" table (line 89) actually has **eight** rows — the two the epic omits (OI-19 → Epic 6, and OI-9/43/64 → Epic 5) are owned elsewhere, so the six-issue list is correct as-is; do not expand it. And `.cjs` genuinely does not exist in the tree today.

**What I did not flag.** The line-number drifts above (cosmetic, not load-bearing). FR-002's `.cjs` clause despite zero `.cjs` files (harmless). The checklist's self-assessment marking every box `[x]` including "written for non-technical stakeholders" when the spec is dense with file paths (the accompanying note defends this reasonably for a dev-infra epic). I did **not** run `npm run test:dom` or attempt the `Board.jsx` mutation — reproducing a known 32-second hang would not have changed any finding. I also did not attempt `npm run build` + CSP header verification; the spec correctly defers it to implementation (FR-013/SC-004).
