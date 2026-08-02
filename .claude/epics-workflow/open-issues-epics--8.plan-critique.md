## Blocking issues

**1. US1's central requirement ("`npm run lint` exits 0") is unbounded, and contradicts the plan's own scope claim.**
FR-003 requires the whole-tree lint to exit clean before FR-006 can wire it into `test:fast` and the commit hook — so every other US1 deliverable is gated on it. I re-ran the baseline in the worktree and reproduced the epic's number exactly (`282 errors, 14 warnings`), then broke it down by rule and directory:

| after the environment split fixes the `process`/`Buffer` errors | remaining |
|---|---|
| `no-undef` (server 121, tests 27, scripts 14, vite.config 2) | **fixed by FR-001** |
| `no-unused-vars` | 76 (34 in `src/` production components, 27 tests, 15 server) |
| `react-hooks/*` + `react-refresh/*` | **32, all inside `src/` production React components** |
| `no-empty`, `no-regex-spaces`, unused-disable directives | 10 |

So ~118 errors survive the split, plus an unmeasured count from the 141 newly-linted `.mjs` files. Thirty-two of those are React Hooks violations (`set-state-in-effect` ×21, `refs` ×5, `static-components` ×4, …) in shipped UI code — fixing them is behavior-affecting refactoring, not config work. But `plan.md:35-36` states *"This is entirely configuration, test-file, and documentation-bookkeeping work plus one small dead-code deletion"* and `plan.md:50-52` says there are *"no runtime/production code path changes except the one `BoardEditor.jsx` unused-import removal."* Both cannot be true. The plan also states no triage policy, while the author's handoff forbids letting this "grow into a broader tree-wide `--fix` sweep."
**Fix:** before tasks are generated, the plan must state the triage policy explicitly — my recommendation: fix `no-unused-vars` and the trivial rules; demote the `react-hooks/*` and `react-refresh/*` families to `warn` with a one-line stated reason and a new `OI-N` to burn them down separately (the epic's own wording permits "explicitly rule-disabled with a stated reason"). Without this, FR-003 is either unachievable in one story or achieved by a silent blanket rule-off.

**2. The proposed three-block ESLint split silently un-lints files that are linted today — recreating OI-70's exact defect.**
`research.md` R1 fixes the split at three `files` blocks: `src/**`, `server/**` + `scripts/**`, `tests/**`. In ESLint 9 flat config, a file matched by *no* block gets **zero rules** — which is precisely the bug OI-70 exists to fix. I enumerated what falls outside those three globs: `connect-four/vite.config.js`, `connect-four/eslint.config.js`, and `connect-four/public/sw.js`. `vite.config.js` currently reports **2 real `no-undef` errors**; under the proposed split those two errors disappear not because they were fixed but because the file stopped being linted. `public/sw.js` (a service worker, needing browser + serviceworker globals) loses coverage the same way.
**Fix:** add a fourth, catch-all block (or make block 1 a tree-wide base with the environment blocks layered on top), and add a task that asserts coverage — e.g. compare `npx eslint --print-config` rule counts for `vite.config.js` and `public/sw.js` before and after, and require non-zero. This check belongs in `quickstart.md` next to the existing `--print-config` assertions, which today only probe `server/`, `tests/dom/`, and `src/`.

**3. The verification walkthrough tells the implementer to run `git add -A` while diagnostic mutations are in the working tree.**
`quickstart.md:24` reads `git add -A && git commit -m "tmp"` — used to prove the new pre-commit lint gate rejects a commit (SC-001a). At that moment the tree deliberately contains a lint violation, and potentially US2's `Board.jsx` mutant, which FR-007/SC-002 require to leave **zero** trace (`git diff` on `Board.jsx` must be empty at story completion). This project has a standing rule against `git add -A` and a background process that auto-commits *staged* work unpredictably — so staging everything is exactly how a diagnostic mutation ends up in history.
**Fix:** rewrite that step to stage a single throwaway path explicitly (`git add <the-one-file>`), assert the hook rejects it, then `git restore --staged <that-file>`; and add an explicit ordering note that the SC-001a commit-rejection proof must not overlap with US2's `Board.jsx` mutation window.

---

## Decisions required

**1. Which files under `tests/` get browser globals?**
The epic's Settled decision #1 says the node ruleset covers `server/`, `scripts/`, **and `tests/`**. Spec FR-001 overrides this, giving `tests/` a *merged* node+browser ruleset, and calls the change "clarifying, not contradicting." The override is substantively correct — I confirmed that exactly 5 files use bare `document`/`window` identifiers (`AdminAudioPageWarning`, `BoardWindowCounts`, `PostSetSummaryScreenPendingResults`, `SlideEditorWindowCounts`, `SlideEditorWindows`) and that the four non-DOM matches are comments only, exactly as `research.md` R3 reports. But all 5 live under `tests/dom/`.
- *Option A (as specced):* browser globals across all of `tests/**`.
- *Option B (recommended):* node globals for `tests/**`, browser globals layered on `tests/dom/**` only. Same zero-error outcome, but a non-DOM unit test that accidentally reaches for `document` still gets caught — which is the gate this epic is trying to build.
Either way, the deviation from Settled decision #1 should be recorded explicitly rather than described as a clarification.

**2. Does Epic 8 correct the standing "OI-12 is already done" claim, or only its own report?**
`docs/open_issues.md:9-16` carries a dated 2026-07-29 blockquote asserting that **OI-1, OI-15, OI-12, OI-24, OI-77** and the text half of OI-18/36/64 "are done despite still reading as open." I verified the plan's flagged correction: OI-12 is about `DeepRevealPane.jsx`'s fixed ~6-second client-side fetch timeout, and **no FR in this spec touches it** — the plan's call is correct, and the standing blockquote's claim about OI-12 is wrong. (I also confirmed the plan's other flagged correction: the SUPERSEDED note at `specs/045-account-session-checkout/contracts/api-auth-session.md:8-13` really does already exist, dated 2026-07-12, so FR-014 is a citation task, not an authoring task.) FR-017's new audit section is specced to be appended *immediately beneath* that blockquote — so the file would carry two adjacent, contradicting statements about OI-12.
- *Option A:* leave the 2026-07-29 blockquote untouched; the new section merely notes the contradiction. Literal-compliant with "never edit another epic's entry," but leaves the backlog self-contradicting.
- *Option B (recommended):* the blockquote is a whole-file header, not any epic's `OI-N` entry, so amending it is in scope. Add a dated strike-through on the OI-12 name there and cross-reference the new audit section.

---

## Handoff context

**Systemic issues.** (a) The plan is meticulous about *citations* and careless about *arithmetic* — every `file:line` quote I spot-checked was verbatim-accurate (`Board.jsx:382`, `BoardEditor.jsx:4`, the pre-commit hook lines 14-21, `testing-conventions.md:174/187/483`, `server-conventions.md:841`, the split-reveal contract's "Current mechanism" at lines 6-17, the OI-58 trailing Paddle paragraph, `open_issues.md:9-16`), and the 282/14 baseline reproduced exactly. What is missing is the *consequence* of those numbers: nobody subtracted the env-split-fixable errors from 282 to see what US1 actually has to fix. (b) Flat-config exhaustiveness is never reasoned about — the plan treats "split into three blocks" as partitioning the tree when it does not.

**Reviewer frame.** I treated the plan as a set of claims and re-derived the load-bearing ones at source rather than checking internal consistency: re-ran `npx eslint . -f json` and aggregated by rule × directory; enumerated files outside the proposed globs; re-ran R3's three grep variants; read OI-12's full entry; read the contract file's SUPERSEDED block; read the actual hook. I prioritized "would a developer following this top-to-bottom get stuck or do damage" over document polish.

**Non-obvious things a fix agent should know.** `worktree-ports.sh` exports `PORT=$API_PORT` (line 32) and `server/index.js:4269` reads `process.env.PORT || 3001`, so quickstart's FR-013 sequence does work as written after the `eval` — do not "fix" it. Full-tree `npx eslint .` measures ~7.5s wall in this worktree; that is the per-commit cost FR-006(b) adds, worth a comment in the hook. `research.md` R3 reports 25 matches in `SlideEditorWindows.dom.test.jsx`; I measured 20 — a regex difference, not a defect, and R3 already instructs a fresh recount. `research.md` R5's shell snippet is explicitly labelled illustrative; do not ship it verbatim (it opens with a `node -e "process.exit(0)"` placeholder line).

**What I did not flag.** The `.mjs`/`.cjs` widening leaving `.cjs` matching zero files (harmless future-proofing, per FR-002's literal wording). The `test:dom` script's hand-maintained file list and the "verify by name in run output" convention — both correctly captured and cited. The FR-016/FR-017 one-task-vs-two question the author flagged as fragile: both are additive appends to different regions of `docs/open_issues.md`, so a split is safe. Minor imprecision in `plan.md`'s Summary describing US2's SplitReveal contract annotation as targeting the "Required behavior" section when R7 correctly identifies "Current mechanism" as the stale one — the research is right and tasks will follow the research, so it is a wording slip, not a defect.
