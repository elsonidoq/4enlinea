# Research: Dev Infrastructure & Test-Quality Baseline (Epic 8 / spec 055)

All findings below were re-verified directly against this worktree on 2026-08-02, not recalled
from the epic doc or spec. Every citation is `file:line` with the verbatim text pasted next to it.

## R1 — `eslint.config.js` current state (single bucket, no `.mjs`/`.cjs`)

`connect-four/eslint.config.js` is 29 lines, one `files` block:

```js
// line 10
files: ['**/*.{js,jsx}'],
```

with `languageOptions.globals: globals.browser` (line 18) applied to that one block — no node
ruleset exists today. `js.configs.recommended` + `reactHooks`/`reactRefresh` (lines 12-14) are
shared across the whole tree regardless of whether the file is browser or node code.

**Decision (updated per plan-critique blocking issue 2 and decision 1)**: split into a base
catch-all block plus four environment-scoped blocks per FR-001/FR-018 — `src/**` (browser
globals), `server/**` + `scripts/**` (node globals), `tests/**` in general (node globals),
`tests/dom/**` layered on top with a merged node+browser ruleset (only `tests/dom/**` — NOT all of
`tests/`; this is a deliberate DEVIATION from the epic's Settled decision #1, see `plan.md`
"Deviations from epic decisions"), and a base/catch-all block (node globals, with browser +
serviceworker globals layered on top for `public/sw.js` specifically) covering every file not
matched by the four scoped blocks — `connect-four/vite.config.js`, `connect-four/eslint.config.js`,
`connect-four/public/sw.js`. No file may ever be matched by zero blocks — that is OI-70's exact
defect, and the plan-critique confirmed `vite.config.js`'s 2 real `no-undef` errors would otherwise
silently vanish (the file stops being linted, not fixed) and `public/sw.js` would lose coverage the
same way. Verify via `npx eslint --print-config <file>` returning a non-zero rule count for
`vite.config.js` and `public/sw.js`, both before and after the split (see `quickstart.md`). Keep
`js.configs.recommended` shared; keep `reactHooks`/`reactRefresh` scoped to `src/**` only (they
are React-specific rules — applying `react-hooks/rules-of-hooks` to `server/`/`scripts/`/`tests/`
files that never use hooks is a no-op today, but scoping them narrows blast radius for the next
contributor and avoids the flat-config `extends` semantics silently interacting with the other
blocks' own `rules` overrides) and demoted to `warn` there per R1a below (not disabled).

## R1a — lint-error triage policy (FR-019, resolves plan-critique blocking issue 1)

The plan-critique's own re-run of `npx eslint . -f json`, aggregated by rule × directory, breaks
the 282-error/14-warning baseline down as: `no-undef` 164 (server 121, tests 27, scripts 14,
`vite.config.js` 2) — fixed entirely by FR-001/FR-018's environment split; `no-unused-vars` 76 (34
in `src/` production components, 27 in tests, 15 in server); `react-hooks/*` + `react-refresh/*` 32,
all inside `src/` production React components (`set-state-in-effect` ×21, `refs` ×5,
`static-components` ×4, …); `no-empty`/`no-regex-spaces`/unused-disable-directives 10. **Policy**:
fix `no-unused-vars` (76) and the trivial 10 directly (non-behavior-changing deletions, even where
they touch `src/` production files); demote `react-hooks/*`/`react-refresh/*` to `warn` in the
`src/` block with a one-line stated reason (fixing them is behavior-affecting UI refactoring, out
of this epic's scope) and open a new follow-up `OI-N` to burn them down separately. This resolves
the contradiction the plan-critique flagged between `plan.md`'s old "entirely configuration... work"
framing and the reality that 34 `no-unused-vars` fixes touch `src/` production files — see
`plan.md`'s updated Summary/Technical Context.

## R2 — the `.mjs`/`.cjs` glob-widening gap is real, and the widened error count is UNMEASURED here

Confirmed independently, matching the spec's own re-verification:
```
$ find . -name "*.mjs" -not -path "./node_modules/*" | wc -l
141
$ find . -name "*.cjs" -not -path "./node_modules/*" | wc -l
0
```
So FR-002 only ever needs to add `.mjs` to the glob in practice — `.cjs` costs nothing (zero
files match) but should still be added per FR-002's literal wording, for future-proofing.

**This plan does NOT assert a widened-glob error count.** The spec (`spec.md:16`, `146`)
explicitly forbids assuming ~282; the number must be measured live during Phase 2/3 (US8.1's
first task) by editing the `files` glob and re-running `npx eslint .`. Any count stated at
planning time would be stale by the time tasks execute (concurrently-edited repo).

## R3 — `tests/` needs a MERGED node+browser ruleset, but "8 files" is not independently reproducible by a naive grep

Recount performed three ways:

1. **Bare word-boundary grep for `document|window|localStorage`** across `tests/`:
   30 files match. Almost all are false positives — this codebase overloads "window" as a
   *domain term* (a four-in-a-row sliding window), e.g. `tests/unit/minorThreatWindows.test.js:10`
   (`// ... and must be excluded as a shadow window.`) and `tests/unit/lessonWindows.test.js:3`
   (`// Concept slides may draw one translucent capsule per four-in-a-line window.`) — neither
   references the DOM global. This is the same class of trap as memory
   `project_grep_silent_zero_matches` (bare grep lying), inverted: here bare grep over-matches
   instead of under-matching, because `\bwindow\b` is satisfied by domain prose, not just the
   global identifier.
2. **Dot-access grep** (`document\.|window\.|localStorage\.|globalThis\.(document|window)`):
   narrows to 8 files, but includes false positives too —
   `tests/navigation/backTrail.test.js:8,20,22,102` only mentions `window.history` **in comments**
   describing what `NavStack`/`App.jsx` do elsewhere; the test file itself never touches a real
   `window` object. `tests/unit/adminLessonPayload.test.js:25,79` and
   `tests/unit/lessonLoader.test.js:261,276,317` match `window.` only inside the literal string
   `'An immediate threat is any four-cell window...'` (lesson copy fixture text, not code).
3. **Actual bare-token usage inside `tests/dom/*.dom.test.jsx`** (the 19 files already registered
   in `test:dom`, which run under jsdom via `tests/dom/setup.js`): grepping each file for
   `\b(document|window)\b` (case-sensitive, so it does not match `SlideEditorWindows`/
   `SlideEditorWindowCounts` identifiers) finds real matches in exactly 5 of the 19:
   `AdminAudioPageWarning.dom.test.jsx` (5), `BoardWindowCounts.dom.test.jsx` (1),
   `PostSetSummaryScreenPendingResults.dom.test.jsx` (1), `SlideEditorWindowCounts.dom.test.jsx`
   (6), `SlideEditorWindows.dom.test.jsx` (25).
4. Two plain (non-`.dom.`) `tests/unit/*.test.js` files use a real global, but always through
   `globalThis.localStorage` (never bare `localStorage`): `tests/unit/onboardingOfferMarker.test.js:54`
   (`assert.equal(globalThis.localStorage.getItem(OFFER_SHOWN_MARKER_KEY), '1');`) and
   `tests/unit/useLanguage.test.js:24` (`globalThis.localStorage.setItem(LANG_STORAGE_KEY, 'fr');`).
   Accessing a global via `globalThis.X` does not trip `no-undef` even under a pure-node ruleset
   (only the bare identifier `X` does), so these two files do not, by themselves, require the
   `tests/` block to carry browser globals.

**Conclusion for planning purposes**: the epic doc's/spec's "8 files under `tests/` ... reference
`document`/`window`/`localStorage`" is in the right ballpark (dot-access grep gives 8) but is not
reproduced by a naive bare-word grep (30) and includes at least 3 comment/string false positives
inside that 8 (`backTrail.test.js`, `adminLessonPayload.test.js`, `lessonLoader.test.js`). The
actually-clean, code-level (not comment/string) evidence for "the `tests/` block needs browser
globals" is the 5 `.dom.test.jsx` files enumerated in point 3, which is a strict subset of
`test:dom`'s 19-file list (`connect-four/package.json`'s `test:dom` script string) — all under
`tests/dom/`. It only changes which files the implementer should expect `no-undef` violations to
disappear from once the merged ruleset lands. The implementer must re-run this recount at Phase 2/3
kickoff (the file set can drift) rather than trust this list verbatim.

**Update (plan-critique decision 1, applied)**: because the 5 genuine bare-global files are all
under `tests/dom/`, FR-001 is revised to scope the merged node+browser ruleset to `tests/dom/**`
only, with plain `tests/**` getting node globals like `server/`/`scripts/`. **This is recorded as a
deliberate DEVIATION from the epic's Settled decision #1** (which assigned all of `tests/` to the
node ruleset), not a clarification — see `plan.md`'s "Deviations from epic decisions." Scoping this
tightly means a non-DOM unit test that accidentally reaches for a bare `document`/`window` still
trips `no-undef`, which is the exact gate this epic exists to build. Separately, the plan-critique
reviewer independently re-ran this recount and got 20 matches in `SlideEditorWindows.dom.test.jsx`
against this section's 25 — a regex difference (comment-line handling), not a defect; both counts
agree the file has genuine bare-global usage and belongs under `tests/dom/`. The instruction to
re-run this recount fresh at Phase 2/3 kickoff stands regardless of which of the two counts is
exact.

## R4 — `boardToSpec` unused-import citation (FR-005)

`connect-four/src/components/admin/BoardEditor.jsx:4`:
```js
  parseMovestring, boardToSpec, appendMove, undoMove, isColFull,
```
Confirmed no other reference to `boardToSpec` exists later in the file (grep for the bare
identifier after line 4 returns nothing) — this is a real unused import, removable as FR-005
states, independent of any lint-rule/glob change.

## R5 — `package.json` script strings (verbatim, current)

`connect-four/package.json:13`: `"lint": "eslint ."` — not referenced by any other script today.
`connect-four/package.json:14`: `test:dom` — 19 space-separated file paths, ending in
`tests/dom/ChallengeScreenGoalPrompt.dom.test.jsx`; no SplitReveal DOM test present (confirmed by
absence of the substring `SplitReveal` in the string).
`connect-four/package.json:16-17`: `test`/`test:fast` — both already contain
`tests/unit/deepRevealTimeout.test.js` and `tests/unit/splitRevealZoom.test.js` by literal
substring match.

**Decision (FR-006 / open question 2, pre-commit ordering)**: `.githooks/pre-commit` (repo root,
confirmed via `git ls-files | grep .githooks` in the handoff and re-read directly here) is:
```sh
# .githooks/pre-commit, lines 14-21
repo_root=$(git rev-parse --show-toplevel)

node "$repo_root/connect-four/scripts/sync-kb.mjs" || {
  echo "pre-commit: sync-kb failed" >&2
  exit 1
}

git add -- "$repo_root/connect-four/server/kb"
```
`sync-kb.mjs` **mutates the working tree** (re-mirrors `docs/knowledge-base/` into
`connect-four/server/kb/`) and then `git add`s the result — so if lint were appended *after*
`sync-kb`, a rejected commit (lint red) would still leave a freshly-rewritten, freshly-staged KB
mirror sitting in the working tree/index, even though the commit itself never happened. That is a
surprising side effect for a contributor to discover after a "commit failed" message. Running
`eslint .` **first**, before `sync-kb.mjs`, avoids ever touching/staging the KB mirror on a commit
that is going to be rejected anyway, and is strictly cheaper to reason about (fail fast, no
partial mutation). **Decision: lint runs first; `sync-kb.mjs` runs second, unchanged.** This is
Phase 2/3's task, not something to hand-wave — the hook script gets a new leading block:
```sh
node -e "process.exit(0)" # placeholder shape only — real task authors:
cd "$repo_root/connect-four" && npm run lint --silent || { echo "pre-commit: lint failed" >&2; exit 1; }
```
(exact invocation — `cd` into `connect-four/` since `lint` is a script there, not at repo root —
to be finalized by the implementing task, not frozen here as literal shipped code; the
`node -e "process.exit(0)"` line above is an explicit placeholder, not something to ship verbatim).

**Additional note (plan-critique handoff)**: a full-tree `npx eslint .` measures ~7.5s wall time in
this worktree — that is the per-commit cost FR-006(b) adds. The implementing task should add this
as a one-line comment in the hook's new lint block (e.g. `# ~7.5s wall on full-tree lint as of
2026-08-02 — re-measure if this grows materially`).

## R6 — `Board.jsx` windowCounts guard (FR-007) — exact line, exact text

`connect-four/src/components/Board.jsx:382`:
```jsx
                  {windowCount != null && value === 'empty' && (
```
Matches the spec's citation exactly. `tests/dom/BoardWindowCounts.dom.test.jsx` (read in full)
has 5 `test(...)` blocks; the 4th (`'Board never renders a digit on an occupied cell...'`) is the
one that isolates the `value === 'empty'` half of the guard via a deliberately
contract-violating fixture (`counts[0][3] = 99` on an occupied cell) — this is almost certainly
the assertion that hangs today per OI-71, since it is the only one of the 5 that specifically
depends on this exact guard clause's short-circuit behavior for its pass/fail signal. This is a
hypothesis for the implementing task to confirm by running `npm run test:dom` with the mutation
applied and observing which of the 5 tests is mid-flight when the hang occurs (Node's `--test`
runner reports which test is running when it does not exit) — not asserted as fact here.

## R7 — `splitRevealZoom.test.js` / SplitReveal contract (FR-008/FR-009)

`connect-four/tests/unit/splitRevealZoom.test.js` (read in full, 55 lines) exercises only
`computeFrozenBoardWidth` from `connect-four/src/lib/useDragSplit.js` — a pure function of
`(containerH, initialSplitPct, isDragging)` that never reads live `splitPct`/`topPx`. It is
"frozen by signature": the live-fit render bug this test was meant to guard
(`specs/042.../contracts/split-reveal-zoom-contract.md:12-13`, `boardW` derived from live `topPx`)
was fixed by decoupling `SplitReveal.jsx`'s rendered `maxWidth` from the frozen ref value this
function returns — so the test passes whether or not `SplitReveal.jsx` actually wires the frozen
value into its render. Zero coverage of the render seam.

The contract's "Required behavior" section (`split-reveal-zoom-contract.md:19-40`) describes the
**target** frozen-by-signature mechanism — it is not itself stale in the sense of describing wrong
behavior; the file's *"Current mechanism"* section (lines 6-17) is what's now historical (it
describes the pre-fix bug as the "current" state). FR-009 needs a superseded annotation on section
1 ("Current mechanism") pointing forward to the shipped state (`computeFrozenBoardWidth`
+ ref-based freeze, already live in `useDragSplit.js`), not a rewrite — this file is a frozen
planning artifact per project convention (see OI-6 precedent, R9 below).

**New test target (FR-008)**: a DOM-level regression test mounting `SplitReveal` in a short
container, asserting rendered board width `<=` pane width and that `constrain`/`maxWidth` styling
stays applied — added **by name** to `test:dom`'s script string (space-separated, no
auto-discovery, confirmed at `connect-four/package.json:14`).

## R8 — `deepRevealTimeout.js`/`.test.js` (FR-010)

`connect-four/src/lib/deepRevealTimeout.js` (11 lines) exports `DEEP_REVEAL_SOFT_MS`,
`DEEP_REVEAL_HARD_MS`, and:
```js
export function deepRevealPhase(elapsedMs, resolved) {
  if (resolved) return 'done';
  if (elapsedMs >= DEEP_REVEAL_HARD_MS) return 'timedOut';
  if (elapsedMs >= DEEP_REVEAL_SOFT_MS) return 'slow';
  return 'loading';
}
```
`connect-four/tests/unit/deepRevealTimeout.test.js` has exactly two `test(...)` blocks: the first
(`'hard cap is well beyond the soft hint...'`) only asserts on the two constants — **keep**. The
second (`'phase transitions: loading -> slow -> timedOut...'`) only calls `deepRevealPhase` —
**delete**, along with the export itself.
`connect-four/src/components/DeepRevealPane.jsx:12` imports only the two constants (verbatim:
`import { DEEP_REVEAL_SOFT_MS, DEEP_REVEAL_HARD_MS } from '../lib/deepRevealTimeout.js';`) and
drives its own inline `setTimeout`-based phase logic (per the handoff, at lines 184-190) — never
calling `deepRevealPhase`, confirming the function truly is dead code. `test`/`test:fast` both
already list `tests/unit/deepRevealTimeout.test.js` by name (R5) — FR-010 does not touch the
script strings since only one test case (not the whole file) is removed.

## R9 — OI-6 / `api-auth-session.md` — the FR-014 annotation may ALREADY EXIST

`specs/045-account-session-checkout/contracts/api-auth-session.md:8-13` (read in full) already
carries:
```md
> **SUPERSEDED (OI-6, 2026-07-12):** The server-side de-dup / coalescing behavior
> described below was never built. `research.md` R1 empirically found GoTrue does
> not enforce refresh-token rotation-with-reuse-detection, so `attemptRefresh` has
> no single-flight Map. Authoritative current behavior:
> `docs/architecture/server-conventions.md` ("No de-dup Map — documented absence")
> and `connect-four/server/authRefresh.js`. See OI-5 for the re-verification path.
```
This is precisely the "one-line SUPERSEDED note pointing to `api-conventions.md`/
`server-conventions.md`" FR-014 asks for — it already exists, dated 2026-07-12 (the same day OI-6
was discovered). **This is a live "already satisfied" claim** (CLAUDE.md's highest-risk-claim
warning) verified by reading the file directly, not inferred from the doc's title or OI-6's own
entry text (`docs/open_issues.md:125-134`, which still just says "if picked up: add a one-line
note" without acknowledging the note already exists). **Decision**: FR-014's task is therefore
"cite the pre-existing note as evidence and mark OI-6 ✅ RESOLVED in `docs/open_issues.md`" — NOT
"author a new note." A task that re-adds a second, redundant SUPERSEDED block must not be
generated.

## R10 — OI-58 CSP: helmet diff + `ae3c006` (FR-011/012/013)

Handoff and spec both re-confirm (independently reproducible, not re-run here to avoid redundant
branch checkout inside this already-checked-out worktree): `git log --oneline -1 ae3c006` →
`ae3c006 fix(csp): allow Google Fonts stylesheet and font files`; `git merge-base --is-ancestor
ae3c006 main` exits 0. `docs/open_issues.md:1747` carries the ambiguous trailing "Resolved
(2026-07-18)" paragraph (verbatim, confirmed at that line: `**Resolved (2026-07-18)**:
\`server/index.js\` now has a static top-level \`import { Paddle, Environment } from
'@paddle/paddle-node-sdk'\`...`) which is entirely about the Paddle static-import change, never
mentioning `helmet`/CSP. FR-012's disambiguation task: prefix that paragraph with an explicit
"(Unrelated to OI-58's CSP gap — see the separate CSP resolution below)" gloss, and add a new,
separate resolution block for the actual CSP fix (FR-011), citing the diff + `ae3c006`.
`docs/architecture/server-conventions.md:841-881` ("CSP Directive Rationale") is the live
authoritative description the FR-013 build-verification step must match against.

## R11 — six-issue closeout audit (FR-016) — current status of each, verified at source

| Issue | Current entry status (verbatim `Status:` line, file:line) | What FR-016 must do |
|---|---|---|
| OI-1 | `docs/open_issues.md:22`: "📋 SPEC-READY 2026-07-13 ... Was: deferred out of spec 044" | Still genuinely open (spec-ready, not shipped) — leave open with a dated UPDATE citing spec 049's non-adoption, do not force-close. |
| OI-15 | `docs/open_issues.md:371`: "📋 SPEC-READY 2026-07-13 ... On-disk reality: `es.json` has 3 of 25 top-level sections complete ... 22 missing" | Still open (switcher shipped, content mostly missing) — leave open, dated UPDATE naming exactly the switcher-shipped/content-still-missing split (already mostly captured in the existing entry; verify it's not stale re: the 22-missing count). |
| OI-12 | `docs/open_issues.md:288`: "deferred (pre-existing...)" | This is the epic's OWN "Issues covered" OI-12, covered by FR-007 (the OI-71 fix touches `Board.jsx`, not `DeepRevealPane.jsx`) — **OI-12 the client-timeout bug itself is untouched by this epic's US2 work** (US2 fixes OI-71/OI-16/OI-29, not OI-12's 6s timeout). Do not close OI-12 as part of US2; it is a distinct, still-open bug about the deep-reveal fetch timeout, unrelated to `deepRevealPhase`'s deadness (OI-16, which OI-12's own entry cross-references at line 398 but is a SEPARATE OI). Leave OI-12 open with a dated note confirming this epic did not touch it, if audited at all — **this is a scope trap**: the epic doc lists OI-12 in the six-issue closeout audit, but nothing in US1/US2/US3's FRs fixes the underlying 6s-timeout bug. |
| OI-24 | `docs/open_issues.md:638`: "deferred (surfaced during Stripe staging bring-up...)" | No evidence in this worktree that a persistent upgrade CTA has shipped (no grep hits for a nav "Upgrade" entry outside the 4 existing reactive `UpgradeModal` call sites) — leave open with a dated confirmation note, do not force-close. |
| OI-77 | `docs/open_issues.md:2329`: "RESOLVED 2026-07-29. `ConceptScreen` now delegates to ... `InfoProsePanel.jsx`" | **Already ✅ RESOLVED at source** — no action needed beyond confirming (during the audit pass) that the status line is not stale; this is the one of the six that is a genuine no-op check. |
| OI-18/36/64 lesson-text half | OI-18 `docs/open_issues.md:421`: "mechanism RESOLVED, content still open (updated 2026-07-16) ... Only lesson 1 ... translated: measured 2026-07-16, 46 of 50 ... still have no text_es." OI-36 `docs/open_issues.md:1099` carries a 2026-08-01 UPDATE: "all 15 lesson files now carry text_es" (commit `cfb2fa8`) but is explicitly "Left open deliberately, because presence ≠ review" (voseo/verde-gris human review not yet done). OI-64 `docs/open_issues.md:1948`: "✅ RESOLVED 2026-07-29 ... All three items are done." | OI-64 is already resolved (no action). OI-18's "46 of 50" / "only lesson 1" framing is now STALE relative to OI-36's own 2026-08-01 update (commit `cfb2fa8` shipped `_es` fields tree-wide) — FR-016 must re-measure `text_es` coverage fresh (grep each lesson JSON) rather than trust either entry's now-conflicting numbers, then update OI-18's status line to match reality and cross-reference OI-36's still-open review gate rather than duplicate it. |

**Key finding for the plan**: this is not a mechanical "flip 6 statuses to RESOLVED" task — at
least one (OI-12) looks miscategorized in the epic's own six-issue list relative to what US1-US3's
FRs actually touch, and OI-18/OI-36 currently contradict each other on the same fact (lesson
translation coverage) as of two different dates. The implementing task must re-measure, not copy
either existing number forward, and must flag the OI-12 scope question explicitly rather than
silently closing or silently skipping it.

## R12 — FR-017 whole-backlog audit: report location (open question 1)

`docs/open_issues.md:9-16` already contains exactly this shape of artifact — a **dated blockquote
section at the top of the file**, added by a prior pass, that lists OI-Ns whose "status here is
stale" without editing those entries' own bodies:
```md
> **Before working any `OI-N`, read [`docs/epics/open-issues-epics.md`](epics/open-issues-epics.md)** (2026-07-29).
> It groups every still-open entry into 8 lane-ordered, spec-ready epics for `/epics-manager`, and its
> *"Already resolved"* section lists the entries below whose **status here is stale** — verified against the
> working tree on 2026-07-29: **OI-1, OI-15, OI-12, OI-24, OI-77**, the *text* half of **OI-18/OI-36/OI-64**,
> and most of **OI-19** are done despite still reading as open. Each is being closed out by the epic that
> covers it, per that file's *Issue closeout convention* (updating this file is a per-epic acceptance
> criterion, not a final cleanup pass).
```
This is a direct precedent, in this exact file, for "flag without editing the individual entries."

**Decision**: FR-017's report is a **new, separate, dated blockquote/section appended near the top
of `docs/open_issues.md`** (immediately after the existing 2026-07-29 blockquote above), titled
something like `> **Epic 8 whole-backlog audit (2026-08-02).**`, listing every `OI-N` referenced by
`docs/epics/open-issues-epics.md` whose code appears shipped in Epics 1-7 while its own entry still
reads open — **without touching any individual `OI-N` entry's body**. This satisfies "must not
edit other epics' entries directly" literally (the flagged section is additive prose at the top of
the file, structurally identical to the existing precedent) while keeping the report inside the
one file contributors already know to check (`docs/open_issues.md` is "the browsable list", per
its own header at line 1-7) rather than forking a second, easy-to-forget doc.

**Alternatives considered**:
- *A new standalone doc* (e.g. `docs/epics/oi-audit-2026-08-02.md`): rejected — splits the
  backlog's source of truth across two files with no cross-link enforced, and there is no
  existing convention for a second audit doc (the existing precedent, R12 above, lives inline).
- *A task artifact under `specs/055-.../`*: rejected — SC-006 requires the report to be
  discoverable by someone browsing the backlog later, not just by someone reading this spec's own
  folder after the fact; `docs/open_issues.md` is the canonical browsing surface per its own
  stated purpose.

**Decision 2 addendum (plan-critique decision 2, applied)**: in addition to appending the new
dated section, FR-017's implementing task MUST also amend the *existing* 2026-07-29 blockquote at
`docs/open_issues.md:9-16` — specifically its mention of OI-12 in the "OI-1, OI-15, OI-12, OI-24,
OI-77" list — with a dated strikethrough or inline correction noting OI-12 is NOT actually done
(R11 above: no FR in this epic touches `DeepRevealPane.jsx`'s 6-second timeout, the actual OI-12
bug) and a cross-reference to the new FR-017 audit section below it. This is in-scope: the
blockquote is a whole-file header, not any individual epic's `OI-N` entry body, so amending it does
not violate the "never edit another epic's entry" rule. This avoids the file carrying two adjacent,
contradicting statements about OI-12 (the 2026-07-29 blockquote says "done"; R11 and FR-016's own
audit say it is not).

## R13 — worktree ports / CSP build verification mechanics

`docs/architecture/worktree-conventions.md:9-13` (verbatim): `eval "$(./worktree-ports.sh)"` run
from repo root, unconditionally, before starting/killing any server — this worktree's own
`$API_PORT`/`$VITE_PORT` are deterministically derived from this worktree's path, distinct from
the legacy `3001`/`5173`. FR-013's build-verify step (`npm run build` then a server restart) MUST
source this script first and kill only by the resulting `$API_PORT`, never a bare port number or
`pkill node` (`docs/architecture/worktree-conventions.md`, `CLAUDE.md` §Working in a git worktree).
CSP headers only appear when the Express server serves the built `dist/` (confirmed by
`docs/architecture/server-conventions.md`'s framing of "any deployed build, not `npm run dev`" at
`docs/open_issues.md:1742`) — `npm run dev` must not be used for this check.

## R14 — Constitution / testing-conventions alignment

`docs/architecture/testing-conventions.md:483` references a section "Grep-as-lint tests must not
use bare `grep`" — directly relevant to R3 above (this plan's own bare-grep-over-matches finding
is the mirror-image trap the doc already warns about for a different context: production grep
tests, not eslint globs — cited here as corroborating evidence that "window" is a known
overloaded term in this codebase's test suite, not a a novel discovery of this research pass).
`docs/architecture/testing-conventions.md:174/187` confirm no test file is auto-discovered and the
only reliable registration check is "confirm the test's own uniquely-named cases appear in the run
output" — this governs how FR-008's new SplitReveal test and FR-010's deletion must be verified
(not by absence-of-error).
