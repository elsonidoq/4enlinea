# Agent prompt — close the four staging deep-reveal feedback items

> Paste everything below the line into a fresh agent session. It is self-contained: it assumes no
> memory of the session that produced spec 058.

---

## Mission

Four real deep-reveal explanations shipped to staging and received written human feedback. Spec 058
("Deep-Reveal Grounding") was built to fix them. Your job is to find out whether it actually did,
and to keep fixing until it has.

You will work **autonomously, without asking the user anything**. You will run **at most 3
attempt-loops**. You commit after each attempt. Then you write a report.

You are the **coordinator**. You do not do the reading, verifying, debugging, or implementing
yourself — you spawn sub-agents for that and keep your own context small. See §9 for the exact
contract.

---

## 1. Environment

**Worktree (work here, do not leave it):**
`/Users/elsonidoq/prog/cuatro_en_linea/.claude/worktrees/deep-reveal-grounding`
Branch: `worktree-deep-reveal-grounding`. Stay on it. Do not create, switch, rebase, or merge
branches.

**Ports — this is a git worktree, so the default 3001/5173 are WRONG.** Before starting,
restarting, or killing any server, from the repo root run:

```
eval "$(./worktree-ports.sh)"
```

That exports `$API_PORT` and `$VITE_PORT` (currently 4499 / 6499). **Never kill a server by a bare
port number or `pkill node`** — only by the exact `$API_PORT`/`$VITE_PORT` the script reports. A dev
server is probably already running on those ports; **reuse it**. Only start one (`npm run dev` from
`connect-four/`) if it is genuinely dead.

**Tests** — from `connect-four/`:
- `npm run test:fast` — the gate. Runs `eslint .` first; **an ESLint *error* means zero tests run**.
- `npm run test:dom` — disjoint from `test:fast`; also required when you touch a component.
- **NEVER run bare `npm test`** — it includes a solver test that hangs 10+ minutes.

**Baseline you must not regress: `test:fast` = 1871 pass / 0 fail. `test:dom` = 72 pass / 0 fail.**
A count that goes *down* is as bad as a failure — it means a test was deleted rather than fixed.

**Read before touching code** (these are authoritative and current; memory summaries are not):
- `CLAUDE.md` at the repo root — especially "Verifying any claim about this codebase", "Working
  with movestrings", the player-colour table, and the 0-indexed-internal / 1-indexed-display rule.
- `docs/architecture/reason-INVARIANTS.md`, `reason-DECISIONS.md`, `reason-case-taxonomy.md`,
  `blunder-reason-evidence.md` — **all four, in that order**, before touching anything under
  `connect-four/server/scripts/reason_engine/` or the render path.
- `docs/architecture/reason-render-grounded-prompt.md` §11 — the required-set Derivation Rule and
  the `future:` spec-prefix mechanism, both added by spec 058.
- `specs/058-deep-reveal-grounding/spec.md` — the user stories and FR-001…FR-016 you must not
  violate while fixing.
- `docs/open_issues.md` — **OI-171 and OI-172 in particular** (see §6).

---

## 2. The artifact under test

**Page: `http://localhost:6499/admin/grounding-diff`** (localhost-only; `App.jsx` gates the whole
`/admin` surface via `isLocalhostOrigin()` before the bundle is even fetched).

- Page component: `connect-four/src/pages/AdminGroundingDiffPage.jsx`
- Hardcoded data: `connect-four/src/pages/groundingDiffCases.js` — read its header comment for the
  provenance of every field.

It renders four cases. Each case shows the *decision* board (the position before the blunder, with
a pale ring on the square the player dropped into), the verbatim staging feedback, the offered /
required / emitted zone specs, and two panels: **BEFORE** (what shipped on staging, pre-058) and
**AFTER** (what the current code produces). Both panels use the real `Board.jsx` and
`AnnotatedExplanation.jsx`, so **the highlights are live** — clicking an underlined phrase lights up
its squares on that panel's board. Each panel holds its own board state.

### Immutability rule — non-negotiable

**The `before` field of every case is frozen.** It is the historical record of what shipped on
staging. Never edit, regenerate, "improve", or reformat it. Same for `feedbackNote`, `feedbackAt`,
`movestring`, `playedCol`, `betterCol` — all frozen.

When you regenerate a deep reveal, **append** it; do not overwrite history. Add an `attempts` array
to each case:

```js
attempts: [
  { n: 1, at: '<ISO date>', text: '<served explanation>', offeredSpecs: [...],
    requiredSpecs: [...], emittedSpecs: [...], note: '<what changed this attempt>' },
]
```

and have the page render **BEFORE vs the latest attempt**, with a way to view earlier attempts (a
selector, or simply stacked panels). The original `after` field is attempt 0 — treat it as frozen
too, or migrate it into `attempts[0]` in one clearly-labelled commit. Either is fine; silently
losing it is not.

### Regenerating a deep reveal

`specs/058-deep-reveal-grounding/t040-e2e-script.mjs` already does exactly this and is rerunnable —
read it first rather than writing a new one. It drives the real pipeline (`computeMechanism` →
`toAllowedSet` → `guardExplainMoveLlmPayload`), the same sequence `server/index.js`'s
fresh-generation branch runs, with a real LLM call. `OPENAI_API_KEY` is real and present in
`connect-four/server/.env` — never defer work as "needs a key".

Two cautions: the LLM is **nondeterministic**, so a single regeneration is a sample, not a
measurement — if a case's result looks borderline, run it more than once before concluding. And the
API has a **120 req/min per-IP rate limit** shared with your browser session; a 429 comes back as
**plain text**, so a bulk loop fails with an opaque JSON decode error rather than a clear message.

---

## 3. The four cases and their feedback — this IS the acceptance criteria

Movestring digits are **0-indexed column indices**. Columns below are quoted as the feedback and UI
show them (1-indexed for display).

### Case 1 — `3154` (played column 5, better was column 6)

> Te coach says "c5" instead of "column 5" when speaking.
> Also it is not clear what the central threat is the coach is mentioning. Is that present in the
> feature vector? If so it should be highlighted. What is the key four in a row line later? Which is
> it?

Three distinct asks: (a) the **spoken/TTS** text must not read a raw `c5` aloud; (b) the "central
threat" must be **highlighted**, not just named — and the sub-question "is that present in the
feature vector?" is a real question you should answer; (c) the "key four-in-a-row line later" must
be identified — a *line*, and "later" means it is a **future** square/line, which is exactly what
spec 058's `future:` handle class exists for.

### Case 2 — `315444233213` (played column 2, better was column 4)

> Column 2-column 5 strip should be highlighted. What is the long four in a row line? Which is the
> double threat the coach is speaking about?

Three asks: (a) the **column 2–column 5 strip** must be highlightable as a strip/line; (b) the "long
four-in-a-row line" must be identified; (c) the **double threat** must be pointed at, not just
named.

### Case 3 — `315444233213134122` (played column 6, better was column 3)

> The text says "column 1" but the coach speaks c1r3 which is much more precise. The board should
> hace numbered columns and rows.
> When you say "key square" which is it?
> What do you mean by forced win here?

Four asks: (a) the text must not degrade `c1r3` to the vaguer "column 1"; (b) the board must show
**numbered columns and rows**; (c) "key square" must resolve to a specific square; (d) "forced win"
must be **explained**, not merely asserted — this one is about *wording*, not highlighting.

### Case 4 — `3154442332131341225551` (played column 6, better was column 3)

> There are a lot of missing highlights. Also the double threat should be highlighted in the board

Two asks: (a) highlights broadly missing; (b) the **double threat** specifically must be highlighted
on the board. This is the epic's headline board — its `forkCells` are `c2r6` and `c5r5`.

### Things that are already believed fixed — verify, do not assume

- Case 1(a) TTS: a separate lane ("Plan A") routed `GET /api/user/tts/deep-reveal` through the same
  sanitizer as the HTTP seam and widened `RANGE_RE` for en-dashes. **That lane is already merged
  into this branch.** Verify the spoken text, do not assume.
- Case 3(b) board numbering: spec 058 US4 added `Board.jsx`'s `showCoordinates` prop, used on the
  deep-reveal screen. Verify it in the browser.

---

## 4. What "fixed" means — the verification bar

For each feedback ask, a sub-agent must produce **one of**: `FIXED`, `NOT FIXED`, or
`NOT APPLICABLE` (with a reason). `FIXED` requires **all** of:

1. The relevant phrase in the AFTER text is a real `[zone:…]` tag — verified by reading the stored
   text, not by looking at the rendered underline (see the trap in §7.1).
2. **Clicking it in the browser lights up the correct squares.** Not "some squares" — the squares
   the feedback is asking about. If the feedback says "the double threat should be highlighted",
   clicking must light the *double-threat* cells, and you must state which cells those are and how
   you know (from the reason engine's own output, e.g. `forkCells`, not from your own reading of the
   board).
3. For a *wording* ask (Case 3(d) "what do you mean by forced win"), the served text must actually
   explain the thing. Judge it as a learner who does not already know the position.

**Verify against the board.** Before claiming any square is or isn't the right one, run
`./visualize_board.sh <movestring>` from the repo root. Never reason about a movestring blindly.

---

## 5. The loop

Repeat **at most 3 times**. Stop early the moment every ask in §3 is `FIXED`.

**Step 1 — Assess.** Spawn a verification sub-agent (§9.A). For each of the four cases it: reads the
BEFORE text, reads the feedback, reads the AFTER (latest attempt) text, and for every ask decides
`FIXED` / `NOT FIXED` / `NOT APPLICABLE` against the §4 bar — including **clicking every highlight in
a real browser**.

**Step 2 — Root-cause.** For everything still `NOT FIXED`, spawn an RCA sub-agent (§9.B). It must
invoke the `scientific-method-debugging` skill and work by hypothesis → prediction → experiment. It
must state each hypothesis explicitly, say what would falsify it, and report which survived and
which died — you need those for the final report. **It does not fix anything.**

**Step 3 — Plan.** Spawn a planning sub-agent (§9.C) that invokes the `superpowers:writing-plans`
skill. Every claim in the plan needs a `file:line` citation and a verbatim quote; fixtures must be
harvested from real runs, never invented.

**Step 4 — Implement.** Spawn an implementation sub-agent (§9.D) to execute the plan. It must keep
`test:fast` at 0 failures and ≥1871 tests, and `test:dom` at 0 failures and ≥72.

**Step 5 — Regenerate and update the page.** Spawn (or reuse) an agent to re-run the four positions
through the real pipeline and **append** the results as a new `attempts[]` entry per §2. Originals
untouched. Verify the page still renders and has no console errors.

**Step 6 — Commit** (§10). Then loop back to Step 1.

After the third attempt — or earlier if everything is `FIXED` — write the report (§11).

---

## 6. Two known blockers, and how to treat them

Spec 058 shipped with two open issues that are very likely the direct cause of several remaining
feedback items. Read both entries in `docs/open_issues.md` in full before your first RCA.

**OI-171 — a `future:` handle is offered but can never be *required*.** Measured across the
29-record coverage corpus: **7 `future:` specs offered, 0 ever required**. It is structural:
`deriveRequiredSet` derives a group's spec from `denialCell(h)` (`h.cell ?? h.completingCell`) or
`h.window`, while a future-fork alias's spec is built from `h.forkCells`, a field the Derivation Rule
never reads. So the coach is offered a handle for the deep fork square and is never obliged to use
it. This is a plausible root cause for Case 1(c) and Case 4.

**OI-172 — whole-window-only admission ("Decision A") rejects real, correct highlights.** An offered
`windows:`/multi-cell alias is satisfiable only as the exact whole window; a highlight naming one
member cell is rejected *and stripped*. Measured on Case 4: the coach named `c2r6` and `c5r5`, both
were promoted to real highlights, both were then stripped because they were only ever offered as the
single unit `future:windows:c2r6,c5r5`. They degraded to "column 2"/"column 5" — which is precisely
what Case 4's feedback complains about.

**How to treat them.** Both were deliberate: the Derivation Rule is copied verbatim from the epic
with an explicit "not to be re-derived, re-worded, or summarized" instruction, and Decision A was the
owner's explicit call *against* the reviewer's recommendation, with a measurement named as the
condition for revisiting. That measurement now exists, and the owner has directed that this feedback
be closed autonomously.

Therefore: **if your RCA lands on either, you are authorised to change it** — but you must
(1) say so explicitly and prominently, not bury it in a diff; (2) record it as a **new** decision
entry in `docs/architecture/reason-DECISIONS.md` that names and supersedes the prior one, with the
evidence that justified the change; (3) update the corresponding `OI-N` entry to resolved,
referencing the new decision; and (4) **headline it in the final report** so the owner can reverse it
in one step if they disagree. Do not quietly widen a rule that a document tells you not to re-derive.

If you change Decision A to per-cell admission, re-measure: it was chosen to prevent *ungrounded*
highlights, so show that loosening it does not admit a cell the engine never vouched for. Spec 058's
SC-006 and FR-012 still bind.

**Any new open-issue id you file must use OI-173+** (the highest existing is OI-172).

---

## 7. Traps that will bite you

**7.1 — The single most important one. A rendered underline is NOT evidence of a grounded
highlight.** When an explanation carries **zero** `[zone:…]` tags, `AnnotatedExplanation` falls back
to `regexFallbackParse` (`connect-four/src/lib/annotatedText.js`), which scrapes `"column N"` out of
prose and synthesises `colN` zones **client-side**. Those render as underlines and light up a whole
column, so a completely ungrounded explanation **does not look empty on screen**. It can never
resolve to a *square*. Judge grounding by counting emitted `[zone:…]` tags in the stored text — the
page's own `countGroundedZones` helper does this and also splits out cell-level references. Never
judge it from the rendered page alone.

**7.2 — Paths in the spec docs are unreliable.** Verified wrong examples: `tasks.md` T007 names
`server/scripts/reason_engine/zoneParser.js`, which does not exist (real: `server/zoneParser.js`);
the narrator vector is `server/scripts/reasonNarratorVector.mjs`, **not** under `reason_engine/`.
**Locate every symbol by name. Treat every line number as approximate.**

**7.3 — `computeReason(movestring, playedCol, { solver })`** takes an **options object** as its third
argument. Passing the solver directly gives `TypeError: Cannot read properties of undefined (reading
'query')`. `createSolverProcess()`'s handle exposes `.destroy()`, not `.kill()`. Wrap solver use in
try/finally or it hangs.

**7.4 — Inline Node scripts** must use **absolute** import paths and must live inside
`connect-four/` (or be run with that as cwd) so `@supabase/supabase-js` and friends resolve. `.env`
is at `connect-four/server/.env`, not the repo root. Parse `.env` manually — `dotenv` is not
reliably available in `node -e`.

**7.5 — `explanation_cache` bypasses the producer guards.** A cache hit skips `computeMechanism`
*and* the `allowedSet` threading entirely (it passes `allowedSet: null`), so a cached row is never
re-checked. If you are testing a generation change through the HTTP path and see stale behaviour,
suspect the cache before suspecting your fix.

**7.6 — A `projectedDeep` board entry can have empty `tags: []`** even when a genuine deep fork
exists, because `reasonBoardSelect.mjs`'s `DEEP` set picks the *first* deep half in
`[lostResource, opponentPunishment]` order, which may not be the half carrying the fork. Never reach
for "the deep fork" through `boardDecisions` — go through `pruned.<half>.tacticTag` / `.forkCells`.

**7.7 — `#root` is capped at `max-width: 480px`** (`src/index.css`, the mobile shell). The admin page
widens it in a mount effect and restores on unmount. If you add another admin view, copy that
pattern.

**7.8 — For `3154442332131341225551`, `playedCol = 5`** (0-indexed) reproduces the epic's evidence
row: `lostResource.completingCell = 'c7r3'`, `opponentPunishment.forkCells = ['c2r6','c5r5']`,
`tacticTag = 'double_threat'`. Other values give different, non-fork cases.

**7.9 — Clicking a zone in the browser.** Zone spans render with a dotted `border-bottom`. This works:

```js
[...document.querySelectorAll('span')]
  .filter(e => getComputedStyle(e).borderBottomStyle === 'dotted')
  .find(e => /your phrase/.test(e.textContent))
  .click();
```

Then read the board state, or screenshot, to see which cells lit. Scope your query to the correct
panel — BEFORE and AFTER are independent and both are on the page.

**7.10 — A green test you wrote from your own belief is not evidence.** It must exercise the
production path with a real value and fail RED for the right reason before it passes. Never keep a
test green over a fix — a wrong test is part of the bug.

---

## 8. Ground rules

- **Do not ask the user anything.** Decide, act, and record the decision.
- **Do not push, deploy, or write to staging or production.** Reading staging is fine (`llm_feedback`
  and `explanation_cache` are readable via `connect-four/server/.env.staging`); mutating is not.
- **Do not run migrations against any live environment.**
- Spec 058 has two outstanding deploy prerequisites already recorded in `docs/deployment_steps.md`
  (migration `065`, and an `explanation_cache` TRUNCATE). If your work adds another, **append** an
  entry there — never edit or delete an existing one, and never mark one DONE.
- The two parallel lanes ("Plan A" eight small fixes, "Plan B" mobile viewport fit) are **already
  merged** into this branch, so the old cross-lane file-ownership constraints are relaxed. Changes to
  `reasonRenderGuard.mjs`'s `stripInternalTokens`/`RANGE_RE` are now permitted but should still be
  deliberate and tested — they are the last line of defence against a raw coordinate reaching a user.
- Keep `docs/architecture/` as the home for conventions and contracts. Memory files are trigger-first
  gotchas, not architecture summaries.

---

## 9. Coordinator pattern and sub-agent contracts

**You are the coordinator.** Your context must stay small enough to run three full loops. Therefore:

- **Do not read source files, run the browser, or debug yourself.** Spawn a sub-agent.
- Spawn sub-agents with `model: "sonnet"` unless a step is genuinely hard, in which case use the
  default.
- Each sub-agent prompt must be **fully self-contained** — the sub-agent has none of your context.
  Paste forward the relevant parts of §1–§8 verbatim rather than referring to them.
- **Never let a sub-agent's report stand as fact when it is load-bearing.** A sub-agent report is a
  scoped claim. If a conclusion decides whether you loop again, spot-check it at source yourself with
  one cheap command before accepting it.
- Between loops, carry forward **only** the structured handoff below — not raw transcripts.

### The running ledger you maintain across loops

Keep exactly this, updating it each loop. It is both your working state and the raw material for the
report:

```
ATTEMPT n
  case 1 | ask (a) TTS raw c5        | FIXED / NOT FIXED | evidence: <one line>
  case 1 | ask (b) central threat    | ...
  ...
  hypotheses:
    H1: <statement> | PREDICTED: <observable> | RESULT: CONFIRMED / REFUTED | how: <one line>
  changes made: <files + one-line what>
  commit: <sha> <subject>
```

### 9.A Verification sub-agent

Give it: the page URL, the four cases and their verbatim feedback (§3), the §4 bar, trap 7.1, trap
7.9, the movestring convention, and the browser/ports setup.
It must return:
- A row per **ask** (not per case): case, ask, verdict, and the concrete evidence — which specs were
  emitted, which cells lit when clicked, what the text actually said.
- For each `NOT FIXED`: the precise symptom, in terms of observed values.
- Any ask it could not evaluate, and why.

### 9.B RCA sub-agent

Give it: the `NOT FIXED` rows with their evidence, §6 (both blockers), the relevant traps, and the
instruction to invoke `scientific-method-debugging`.
It must return:
- Each hypothesis, verbatim, with the prediction that would falsify it.
- The experiment run and the actual observation.
- Verdict per hypothesis: CONFIRMED / REFUTED / INCONCLUSIVE.
- The root cause it believes, with `file:line` evidence.
- **Explicitly**: whether the cause is OI-171, OI-172, both, or something else.
- It fixes nothing.

### 9.C Planning sub-agent

Give it: the confirmed root cause with its evidence, the FR constraints from `spec.md` that must not
be violated, the §6 authorisation-and-documentation rule, and the instruction to invoke
`superpowers:writing-plans`.
It must return: the plan's path, a summary of the change, and any claim it could not verify at source
(marked `UNVERIFIED`).

### 9.D Implementation sub-agent

Give it: the plan path, the test baselines, and the commit prohibition (it does **not** commit — you
do).
It must return: files changed with a one-line description each; final `test:fast` and `test:dom`
numbers; anything deferred; and **out-of-scope discoveries** — real defects it found but was not asked
to fix, each with the evidence actually observed. An unreported finding is a finding lost.

---

## 10. Commit protocol

Commit **after each attempt**, once tests are green.

- **Never `git add -A`.** A background process in this repo auto-commits staged work
  unpredictably. Stage explicit paths only, and run `git status --short` before committing.
- Stay on `worktree-deep-reveal-grounding`. Do not push.
- Note that a large amount of spec 058 work was **uncommitted** when this task began. Your first
  commit will therefore likely include it. That is expected — commit it as one coherent change with
  an honest message, and say so in the report.
- Message format:

```
fix(058): <what this attempt changed>

<why — the confirmed root cause, in a sentence or two>

Attempt <n> of the deep-reveal feedback-closure loop.
Fixed: <asks now passing>
Still open: <asks still failing>
test:fast <pass>/<total>, test:dom <pass>/<total>

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
```

---

## 11. Final report

Produce this whether you closed everything or not.

**A. Outcome per ask** — a table over all four cases and every ask in §3: the ask, its final verdict,
and for anything still open, why.

**B. Hypotheses** — every hypothesis from every RCA round, and whether it was **confirmed or
refuted**. Refuted ones are as valuable as confirmed ones and must not be dropped; they are how the
next person avoids repeating the work. For each: what was predicted, what was observed.

**C. What was fixed** — the change per root cause, with files.

**D. What was not fixed, and why** — be specific about whether it was out of reach, out of scope, or
ran out of attempts.

**E. Decisions changed** — if you altered Decision A, the Derivation Rule, or anything else a
document told you not to re-derive: state it plainly at the top of this section, with the evidence
that justified it and the exact commit, so it can be reversed in one step.

**F. Deploy prerequisites** — anything new that must happen around a deploy. "None" is a valid
answer, but only if you actually checked.

**G. Open issues filed** — any `OI-173+` you added, and any existing `OI-N` you resolved.

Be honest about partial success. A report that says "3 of 11 asks remain open, here is exactly why"
is far more useful than one that stretches the definition of fixed to reach a clean sweep.
