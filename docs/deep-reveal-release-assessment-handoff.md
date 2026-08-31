# Handoff — Deep-Reveal Release Assessment

**Written**: 2026-08-28, at the close of the spec 059 / Epic 12 implementation session.
**Goal of the receiving session**: produce a dashboard that lets the owner decide, on evidence,
whether the deep-reveal coach is good enough to release and brand, or whether more work is worth
doing. **You are not here to re-litigate Epic 12.** It is implemented and closed.

---

## 0. Hard rules — read before anything

- **Never edit `connect-four/package.json`.** Its `test:fast` value is one ~7,365-character line; an
  exact-match edit has killed prior agents. If a new test file needs registering, do it with a
  targeted JSON single-value replacement (a script that parses, edits `scripts['test:fast']`, and
  writes back), never a string `Edit`.
- **Never `git add -A` / `.` / `-a`. Never `git stash`** — the stash stack is shared with other
  worktrees and other concurrent sessions. For an A/B comparison use `git show <ref>:<path>` or a
  scratchpad copy.
- **Never run the pre-epic code.** Every "before" number comes from *already-recorded answer files on
  disk*. Re-grading a recorded file is not running old code.
- **Never write to staging or production.** Measuring is read-only and fine.
- **STOP between every step below**, present results, and ask the owner whether to continue. The
  grading fan-out is the dominant cost and must never run unattended across step boundaries.

## Working directory

`/Users/elsonidoq/prog/cuatro_en_linea/.claude/worktrees/deep-reveal-grounding` — a git worktree. Run
everything from here; never `cd` to the original repo root.

State at handoff: `HEAD` = `a39d69c` ("backup"), all Epic 12 work committed.
`cd connect-four && npm run test:fast` → **2056 pass / 0 fail / 282 suites, 0 eslint errors**. If that
does not reproduce, stop and report before doing anything else.

---

## 1. What Epic 12 was, and what is already known

Epic 12 (`specs/059-deep-reveal-remediation`, `docs/epics/deep-reveal-remediation-epic.md`) fixed
render-layer defects in the deep-reveal explanation pipeline and made the offline eval grade the
string production actually serves. All 47 implementable tasks are done; only T045 (an optional LLM
re-measure) is open, and this handoff supersedes it.

**Already measured, deterministic, corpus-wide over all 63 records — no model in the loop, so these
cannot be confounded and do not need re-measuring:**

| Metric | Before | After |
|---|---|---|
| Raw `cNrM` in `link.text` | 51/63 | 0/63 |
| Raw `cNrM` in `zones.aliases[].role` | 32/63 | 0/63 |
| `"you's"` / `"you gets"` | 19/63, 9/63 | 0/63 |
| Empty `[{},{},{},{}]` literals | 36/63 | 0/63 |
| Frames naming two different cells identically | 6/63 | 0/63 |
| Sibling locators asserting a false height claim | 22/58 groups | 0/58 |
| `better-col` requestable via required set | 0 | 21/63 |

**Already measured, mechanical (code-computed by `grade_mechanical.mjs`, per-run, N-independent):**

| Axis | Baseline 08-26 (125 runs) | New n=3 (75 runs) | |
|---|---|---|---|
| A6 — prose names the better column | 78% | 91% | **p = 0.025** |
| G7b — term slugs within offered set | 98% | 100% | |
| A1 / A2 / G7a | 100% | 100% | |
| Malformed tag (G7c auto-fail) | 2% | 0% | |
| Guard had to strip a span | 4% | **7%** | worse, not significant |
| Raw `cNrM` in served prose | 0% | 0% | unchanged — guard always handled this |

**A small judgment sample (8 boards, n=2, both sides `gpt-5.4-mini`, v2 rubric):** 2/8 → 4/8 cases
passing, with three FAIL→PASS traceable to specific fixes (`eval-13` term ownership + unoffered slug;
`pin-L2` sibling disambiguation; `eval-11` frame ambiguity) and no case regressing. One apparent
regression (`eval-41`) was verified spurious — the grader graded the pre-guard string.

**What is NOT known, and is why this handoff exists**: whether explanations are *fabricated* (A4) or
*useless* (A7) at scale, under a clean rubric, on the full corpus. That is the release question.

---

## 2. The datasets

| Dataset | File | Boards | n | Model | Judgment grades? |
|---|---|---|---|---|---|
| Baseline "before" | `fv_suff_answers_boards_subset_2026-08-26T15-47-56Z.jsonl` | 25 | 5 | gpt-5.4-mini | exist, but **pre-v2 and contaminated** — unusable |
| Older full corpus | `fv_suff_answers_boards_2026-08-06T16-04-29Z.jsonl` | 63 | 2 | gpt-5.4-mini | exist, pre-v2; also predates Epic 11 |
| Already generated | `fv_suff_answers_boards_subset_2026-08-28T17-38-50Z.jsonl` | 25 | 3 | gpt-5.4-mini | none |
| **To generate (Step 1)** | new, EN | **63** | **3** | gpt-5.4-mini | to be produced |
| **To generate (Step 4)** | new, ES | **63** | **3** | gpt-5.4-mini | to be produced |

All under `connect-four/server/scripts/reason_corpus/runs/`.

`boards_subset.jsonl` (25) is a **strict subset** of `boards.jsonl` (63) — verified. So the new
63-board run covers the 25 baseline boards, and the Epic-12 delta is computed on that overlap.

**Why the 08-26 baseline and not 08-06**: 08-26 is the epic's own frozen baseline
(`deep-reveal-remediation-epic.md:80`) and is the code state immediately before this work, so a delta
against it is attributable to Epic 12. 08-06 predates Epic 11 as well, so its delta conflates two
epics. Offer 08-06 in the dashboard as a *second, clearly-labelled* baseline; do not make it the
default and do not re-grade it unless the owner asks.

---

## 3. Traps that will silently corrupt this measurement

Every one of these was hit or verified in the implementation session. Treat them as facts, not
cautions.

1. **The corpus is not a sample of real matches.** `boards.jsonl` is built for case-taxonomy
   coverage, with rare cases deliberately over-sampled. Error rates on it are **per case type**, not
   per player encounter. Any "how often will a player hit this" number must come from Step 6's
   simulated-game sampling, never from the corpus. Getting this wrong overstates rare errors.
2. **The harness is single-attempt (OI-183).** Production retries; 38% of recorded runs would have
   retried. Failures like "model dropped a required handle" or "didn't name the column" are exactly
   the retry triggers, so **measured failure rates are a floor on quality, not a player-facing defect
   rate.** The dashboard must say this next to every failure number.
3. **Case-pass rates are not comparable across different `n`.** A case passes only if every axis holds
   on *all* runs, so an n=3 case is easier to pass than an n=5 one. **Compare per-run axis rates**
   (N-independent); show case-pass only within a dataset, never across datasets with different n.
4. **The grader is an instrument with error.** In the implementation session two graders reading the
   same rubric split on which string A5 grades, and one mis-attributed a defect to the wrong file.
   Step 5 quantifies this. Until it does, do not read small deltas as signal.
5. **Name the layer before counting.** `raw` ≠ `answer.mechanism` (post-`processAnnotations`) ≠
   `servedExplanation` (post-guard). A tag-stripping regex must handle **both** `[zone:spec]` and the
   closing `[/zone:spec]` form — a regex that only strips `[/zone]` leaves every spec's coordinates in
   the text and will make served prose look full of raw coordinates when it is clean. This exact
   mistake was made and caught in the implementation session.
6. **`row.answer.mechanism` in a recorded file is already post-processed.** Feeding it back through
   `postprocessAnswer` corrupts the zone tags. Use `row.raw` when replaying end-to-end through
   `computeMechanism`; use `answer.mechanism` when calling `computeServedExplanation` directly.
7. **Condition D IS production** — verified: `mechanismExplainer.mjs:187` calls
   `buildPromptForCondition(null, nv, 'D', locale)`, the same builder `compute.mjs:262` uses. No need
   to re-verify; do not measure other conditions.
8. **Model must match across compared datasets.** A stronger model flatters every judgment axis. All
   datasets here are `gpt-5.4-mini`; pass `--model gpt-5.4-mini` explicitly — the harness default is
   `EXPLAIN_MODEL`, which is `gpt-5.4` and silently breaks the comparison. This happened once already.
9. **`GRADER_INSTRUCTIONS_v2.md` needs `<ANSWERS_STEM>` supplied at dispatch**, and its frozen v1 body
   is hardcoded to "5 runs / run_index 0..4". The dispatch message must carry the stem **and** the
   actual run count. A precedence header was added at the top of v2 in the implementation session so
   graders apply the addendum (which sets `servedExplanation` as the graded string) over the stale v1
   body; verify it is still there before dispatching.
10. **The grading parts directory is one-file-per-case and nothing else.** A grader dumped scratch
    files into it, which broke the concatenation count. Filter on `*__D.json` when assembling.

---

## 4. The steps

**After every step: stop, present what you found, and ask before continuing.** Do not chain two
grading steps in one go.

### Step 1 — Generate the current-state English run (no graders)

```bash
cd connect-four
node server/scripts/compute.mjs \
  --input server/scripts/reason_corpus/boards.jsonl \
  --llm --condition D --n 3 --model gpt-5.4-mini \
  --out server/scripts/reason_corpus/runs/release_assessment_evidence.jsonl
node server/scripts/grade_mechanical.mjs \
  server/scripts/reason_corpus/runs/<the new answers file> --locale en
```

189 model calls, no grading agents. Then compute the deterministic comparison against the 08-26
baseline (derive `servedExplanation` on the baseline rows retroactively via `computeServedExplanation`
exported from `compute.mjs`; the guard change is additive so applying the current guard to recorded
text is valid).

**Report**: mechanical axis rates both sides, served-text counts (raw coordinates, guard strips,
malformed tags), and the per-run deltas with a significance test. **Then stop.**

### Step 2 — Grade the new English run (63 agents)

One agent per `(id, condition)`. **Never batch cases into one agent** — agent input cost is
superlinear in turns.

- Run `grade_mechanical.mjs` first (Step 1 already did); graders copy A1/A2/A6/G7a/G7b through
  verbatim and never re-derive them.
- Dispatch in **waves of at most 20** (harness concurrency cap; exceeding it returns an error meaning
  *wait*, not *retry*). Launch a wave in one message with multiple tool calls; replace one agent per
  completion.
- Each agent writes exactly one JSON object to its own `<parts-dir>/<id>__D.json`. Never a shared file.
- Dispatch message — nothing beyond this, no open-issue lists, no hypotheses (that contamination is
  what invalidated the 08-26 grades):

> Read `connect-four/server/scripts/reason_corpus/runs/GRADER_INSTRUCTIONS_v2.md` in full and follow
> it exactly. `<ANSWERS_STEM>` = `<stem>`; this run has 3 runs per case (run_index 0..2), not 5. Your
> case: id = `<id>`, condition = `D`. Your grade output file: `<parts-dir>/<id>__D.json`.

Assemble parts into `<stem>_grades.jsonl` with a node script (not `cat`). **Report** pass rates per
axis, the failure-triage split, and the failing cases. **Then stop.**

### Step 3 — Re-grade the 08-26 baseline under v2 (25 agents)

Same procedure, `<ANSWERS_STEM>` = `fv_suff_answers_boards_subset_2026-08-26T15-47-56Z`, **5 runs per
case (run_index 0..4)**. This is re-scoring recorded text — no generation, no old code.

The baseline rows lack `servedExplanation`; derive it first with `computeServedExplanation` and write
an augmented copy, or the graders cannot apply v2's per-axis string rule.

**Report** the before/after comparison on per-run axis rates, restricted to the 25 overlapping boards.
**Then stop.**

### Step 4 — Spanish round (generation + 63 agents)

Generate with `--locale es` (the harness appends `SPANISH_OUTPUT_DIRECTIVE`, `compute.mjs:260`), same
63 boards, n=3, `gpt-5.4-mini`.

**Two things to solve before dispatching, not during:**
- **The rubric is written against English prose.** A5 (coach voice) and A7 (usefulness) bans and
  phrasings are English. Decide with the owner whether graders judge the Spanish directly, or judge it
  as a faithful rendering of the English intent — and write that instruction into the dispatch.
- **There is no Spanish baseline.** Spanish is current-state only; there is no before/after. The
  dashboard must state this rather than imply a comparison.

**Report**, then stop.

### Step 5 — Grader-variance sample (~10 agents)

Re-grade 5 cases per side with fresh agents and compare verdicts to the first pass. Report the
per-axis disagreement rate. This becomes the error bar on every delta in the dashboard — without it,
nobody can tell a 5-point move from noise. **Then stop.**

### Step 6 — Frequency proxy (no agents, programmatic only)

The owner's requirement: estimate how often each error class would occur in real play, decided
**programmatically, with no LLM calls**.

- Harvest blunders from simulated games: `harvestBlunders()` in `connect-four/server/gameSampling.js:157`
  (also `playGame`/`simulateGame` there). Solver-driven; wrap solver use in `try/finally` with
  `solver.destroy()` or it hangs.
- For each harvested blunder, run the production render path and apply **programmatic detectors** for
  the deterministic error classes — raw coordinates in the two printed producers, empty literals,
  false sibling locators, same-column collisions, grain mismatch, terminal narration. These are
  exactly the invariants the corpus tests already assert, so reuse those predicates rather than
  writing new ones.
- Report counts **with the sample size** (games played, blunders harvested), as an estimate.

**Honest limit to put on the dashboard**: this covers render-layer defect classes only. A4
(fabrication) and A7 (usefulness) have no programmatic detector — the frequency panel is silent on
them, and must say so.

### Step 7 — Build the dashboard

**Delivery**: a **self-contained HTML file at one stable path** in the repo, overwritten on
regeneration. Not an artifact. Not a timestamped file per run — `runs/` is already full of dated
detritus and the owner has asked for a single canonical file. (Alternative, if the owner prefers: serve
it behind the localhost-only `/admin` path, alongside `AdminFvSuffPage.jsx`.)

Requirements, all owner-stated:

- **Four sections**: (1) past grading results, (2) current grading results, (3) the comparison, with
  error types and the Step 6 frequency proxy, (4) error analysis of what this epic did *not* fix.
- **A baseline switcher**: newer 25-board (08-26) — the clean Epic-12 delta — or older 63-board
  (08-06) — full coverage but conflates Epic 11 + 12. Label both honestly in the UI.
- **Individual cases, not just aggregates.** The owner explicitly does not want a pass/fail bar; they
  want to read the actual explanations and judge. Every case must be inspectable: board, movestring,
  the served text, the axis verdicts, and the failure summary.
- **Explicit measured-vs-not-measured context** on every panel (tooltip or inline). At minimum:
  which rubric version produced each number; that failure rates are a *floor* because the harness is
  single-attempt (OI-183); that corpus rates are per-case-type, not per-encounter; the grader
  disagreement rate from Step 5; and that Spanish has no baseline.
- **Never show a case-pass comparison across datasets with different `n`.**

### Step 8 — Error analysis (section 4 of the dashboard)

For every case still failing on the new run, classify into four buckets — a plain before/after
frequency table will otherwise make the new code look like it invented problems:

- **fixed** — failed before, passes now
- **extinct by construction** — the old failure mode cannot occur in the new code
- **persisting** — fails both, same cause
- **new** — fails only now

For each persisting/new case, attribute at source: build the actual prompt with
`assembleGroundedPrompt(buildReasonRenderModel(fv))` and check whether the fact the model missed was
even present. **If it was not in the prompt, the triage is a render bug, never model confusion** — no
model can name what it was not shown. Do not trust a grader's triage bucket without this check; a
grader in the implementation session attributed a defect to the wrong file, and the grade report's own
`field_or_glossary` labels are known to be unreliable as file citations.

---

## 5. Known open defects that bear on the release decision

These are real, verified at source in the implementation session, and are *not* regressions from
Epic 12. Surface them in the dashboard's error-analysis section.

- **`eval-47`'s frame contradicts itself.** The assembled prompt says "Better move: column 5" and two
  lines later "the played move let the opponent take column 5". Literally defensible (the better move
  and the denial cell are the same square) but it reads as a contradiction, and both baseline runs
  inverted the attribution and broke the guardrail printed beneath it. Fix direction: L1 must not name
  the denial cell by a column the Decision block already labels "Better move" — use possessive framing
  ("the square you would have taken").
- **The guard strips an annotation but leaves the false sentence.** `eval-47` run 1: the guard caught
  `P2:col_mismatch:c5r4` and removed the zone wrapper, but the prose "the winning square in column 3"
  (it is column 5) still ships. Stripping the annotation does not unsay the claim.
- **OI-205 is partial.** 42 of 63 records are at the 3-slot required-set cap and cannot request the
  better column. This is the ceiling on A6.
- **Guard strips rose 4% → 7% per run** between the baseline and the new n=3 run — not significant at
  that n, and the new strips are the model writing a wrong coordinate rather than the render emitting
  one. Worth confirming at the larger n of Step 1.
- Untriaged findings from the implementation session's code review, most substantive first: the new
  diagnostic guard call in `mechanismExplainer.mjs` omits `locale`, so for an `es` request the retry
  decision is predicted against English-rewritten text (**relevant to Step 4**); the diagnostic call
  re-runs the guard's `console.warn`, double-logging and inflating the OI-140/OI-172 operational
  signal; `GUARD_FAILURE_CODE_TO_OI` maps `unclosed_tag`, which is a repair name and can never appear
  in `failures`, while the real code `P5strong:col_not_allowed` has no entry; and
  `reasonBoardTags.mjs`'s overlay gate asks "does this player have any such pattern" rather than "at
  this cell".

## 6. Cost shape

One agent per case, roughly 120k tokens each. Step 2 = 63, Step 3 = 25, Step 4 = 63, Step 5 = ~10.
**≈161 agents** if all steps run. The owner is cost-sensitive and has asked to be consulted between
every step — honor that literally. Generation calls (Steps 1 and 4) are cheap by comparison.
