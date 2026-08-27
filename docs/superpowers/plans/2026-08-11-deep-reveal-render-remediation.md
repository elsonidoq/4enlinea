# Deep-Reveal Render Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the render-layer defects that make the grounded deep-reveal prompt unusable on opening
boards, make every causal template name the better column in prose, and re-measure on a frozen
25-board subset with enough runs to read the result.

**Architecture:** Three phases. **A** builds the measurement instrument (frozen subset, a sentence-budget
flag) and captures a baseline on the CURRENT code — without it, no later change is attributable.
**B** applies five independent render fixes, each with its own test cycle. **C** re-measures the same
subset and gates on a full-corpus sweep.

**Tech Stack:** Node 23 ESM (`"type": "module"`), `node --test`, ESLint flat config, OpenAI via
`server/llmChat.js`, c4solver via `server/c4solver-wrapper.js`.

## STATUS — 2026-08-23 (authoritative; read this before anything below)

**The plan is IMPLEMENTED. 19 of its 20 numbered items are done; only Task 10 Step 4 remains.**
Everything below this block is the ORIGINAL 2026-08-11 text and states *predictions*, not outcomes.
Where a prediction was wrong, this block governs.

Branch `worktree-deep-reveal-grounding`, 18 commits over `e5c0c75`, `npm run test:fast` **1979 / 0**.

### Task status

| # | Task | Status | Commit(s) | Measured outcome |
|---|---|---|---|---|
| 1 | Freeze the 25-board subset | done | `f378fb1` | subset intact, re-verified 08-23 |
| 2 | `--sentence-budget` | done | `059e9dc` | enabled arm 3 |
| 2b | Deterministic grader | done | `d0536db` | used for all 3 runs |
| 3 | Baseline, 3 arms | done | — | **budget hypothesis falsified** |
| 4 | L5/L6/L9 name the column | done | `2647bf0` | treated group A6 43→74% (but see *Corrections*) |
| 5 | Opening frame: engine vocab | done | `6180fec` | 30/30 frames clean |
| 6 | Opening merges causal frame | done | `e6eaed2` | `link.text` in prompt 0/30 → 30/30 |
| 7 | Alias owner from half kind | done | `e5c0c75` | 37/126 halves flip owner (D47) |
| 8 | Offer the fork pivot | done | `0d6f818`,`d6afe43` | A7c run-failures **9 → 4**; `eval-20` 5/5 |
| 9 | Record unoffered tags | done | `c9d8e06` | 3 previously-invisible defects now surface |
| 9b | Never display an unoffered slug | done | `81de283`..`77e8024` | **G7b 87 → 98%**; 49/63 → **0/63** records |
| 9c | L4 hold-the-line guardrail | done | `e2b230e` | `eval-39` 5/5 fail → 4/5 pass |
| 9d | Book-line only when there is one | done | `144bf37`,`d722221` | `eval-11` fabrication **eliminated** |
| 10.1 | Re-run arms | done ×2 | — | 125 + 75 rows, 0 errors |
| 10.2 | Grade both arms | done ×2 | — | 25/25 cases graded, twice |
| 10.3 | Compare per stratum | done | — | A6 68 → 76 → **84%** |
| **10.4** | **Full-corpus 63-board sweep** | **NOT RUN** | — | deferred by the owner; now unblocked |
| 10.5 | Write-up + D-log | done | `4319b2e`,`4b9e78d` | **D48** recorded |
| — | Post-measure fixes | done | `2ef3ccb` | `pin-L5` render_bug → prompt_confusion |
| — | File OI-190…196 | done | `76e652d`,`799b576`,`a658dd2` | 7 defects filed |

### Final measured result (25-board subset, `gpt-5.4-mini`, n=5)

pre-fix → interim → **final**: A3 90→92→**98** · A4 86→87→81 · A5 90→93→**94** · A6 68→76→**84** ·
A7 76→83→81 · G2 86→91→91 · G4 96→91→89 · G5 92→91→**96** · G7 78→71→66 · G7b(mech) 87→98→**98**.
`render_bug` triages 7→6→**5**; `vector_error` **0 in all three runs**.
Full analysis: `connect-four/server/scripts/reason_corpus/runs/fv_suff_answers_boards_subset_2026-08-23T15-16-19Z_grade_report.md`

### Corrections — claims made during execution that turned out WRONG

1. **"G7 declined because Tasks 6 and 8 grew the required set."** FALSE. Re-rendered all 25 boards at
   `e5c0c75` and at HEAD and diffed the offer/required sets: **only 5 boards changed at all** (the
   fork-pivot boards). G7 on those 5 went **52 → 64%**; on the 20 untouched boards it went **84 → 66%**.
   The decline is on prompts this branch did not structurally change. **No rollback is warranted.**
2. **G7 is NOT comparable across these runs.** The 08-11 grading ran the skill directly; both 08-2x runs
   used a `GRADER_INSTRUCTIONS.md` written for this session that foregrounds the judgment half.
   `eval-32` is the proof: its failing L4 text is pre-existing and unchanged, and passed two earlier
   gradings. Only the mechanical half (same script both times) is comparable: G7a 100→100, G7b 87→98.
3. **"The control group moved the wrong way."** That was a mid/late-only slice. On the full control
   slice it is flat (78 → 78 → 82%). State the slice with the number.
4. **Per-board A6 at n=5 is too noisy to attribute.** Two runs differing only by two wording changes
   moved `pin-L9` 0/5→4/5 and `eval-35` 1/5→4/5. Trust deterministic failures; treat intermittent
   per-board deltas as noise until replicated.
5. **Task 4's premise is not supported the way the plan expected** — see *Deferred* below: the
   *treated* group improved, but the *control* (parenthetical) group now fails A6 materially worse
   than prose, which is the opposite of the plan's rationale for leaving it alone.

### What is actually left

1. **Freeze the grader** (methodology; commit the instruction text with each run) — without it no future
   G7 number is attributable, which is exactly how correction #2 happened.
2. **File the A4 open issue** — the *Deferred* section below instructs "file as an open issue after
   Task 10". **This was not done.**
3. ~~**G7 judgment-half render fixes**: OI-196 (one line), OI-191, OI-192, OI-195.~~ **DONE
   2026-08-25**, commit `b9be303`, recorded as **D49**, `test:fast` **1990 / 0**. Code-level outcomes:
   the `(role, truthBoard)` collision behind OI-191 went **48/63 → 0/63** records; `eval-47`'s two
   required handles now restate distinctly; `eval-33`'s required `opp-key-line` now reads present-tense;
   `pin-L2` names the cell the opponent actually took. **No G7 number yet — the subset re-measure
   (item 5 below, now item 3½) is what decides whether the axis moves.** Two pieces of OI-195 remain
   open by design: L2's "occupy" verb and its raw `cNrM` notation (OI-194) are *wording* and belong to
   the prose pass, so bundling them here would have destroyed the attribution.
4. ~~**Rewrite L1/L2/L4/L8 to prose** — the deferral's own trigger has fired (see below). Spends the
   control group, so it must land in a pass where nothing else touches A6.~~ **DONE 2026-08-25.**
   All nine links now state the better column as prose; 0 of 63 records carry a parenthetical column.
   Verified single-variable: the composed text of the 19 affected records was diffed against the
   pre-change module and, after normalising ONLY the column-mention surface form, there are **zero**
   residual differences — every cell, tag, window, horizon and clause order is byte-identical. The
   control group is now SPENT: no untreated parenthetical templates remain, so a future A6 comparison
   has no internal control and must be made against the recorded runs. `test:fast` 1999 / 0.
5. **Task 10 Step 4**, the 63-board sweep — after 3 and 4, so it measures fixed code.
   **Gate run 2026-08-26**: the subset re-measure of items 3+4 is DONE — `fv_suff_answers_boards_subset_2026-08-26T15-47-56Z`, 125/125, v1, 25 per-case agents. Result: the
   caption fix holds (board-label leak 0/125, verified deterministically), the prose conversion moved
   A6 not at all (84→80→82→**78**, flat inside the noise band). A first reading of "A6 is capped by
   OI-194" was **WRONG and retracted** — it regexed the raw LLM string, but `mentionsBetterColumn`
   runs `stripInternalTokens` first, so a `cNrM` naming the better column already passes. Through
   production's own function the 27 fails are: 12 name some OTHER column, 15 name no column, **0**
   raw-`cNrM`. All 27 fire production's retry trigger, so 78% is a strict floor (OI-183). Separately,
   raw `cNrM` reaching player-visible prose is **0/125** once the guard runs — the eval grades the
   PRE-guard string, which is an instrument defect, not a deep-reveal one. Corrected again after a
   subagent re-measure: prose-level `cNrM` incidence was NOT flat (109 → 89 → **62**; the prose
   conversion halved it), and graders were consistent WITHIN each run — what moved is the cross-run
   charge rate, 14% → 28% → **79%**. Full corrected table in `reason_corpus/runs/README.md`.
   A4/A5/A7 are NOT comparable this run: the rubric file was v1 but the dispatch wrapper named
   OI-194 explicitly and plausibly primed graders (all 50 A5 fails have a raw `cNrM`; 70 passing
   runs have one too). New defect filed: **OI-206**. Sweep still NOT run — awaiting owner go-ahead.
6. ~~**Enforcement / retry design** — trigger fired, but undesigned.~~ **RESOLVED 2026-08-26 — it was
   already built.** `computeMechanism` (which `index.js` serves from) has carried the whole design
   since spec 058: a required-set post-check (`missingRequiredGroups`), an A6 post-check
   (`mentionsBetterColumn`), both folded into ONE amended retry prompt on a single shared budget, and
   an admin failure row when a required square is still missing after it. The deferral's "trigger
   fired" reading came from graded runs — and **the harness does not exercise that retry** (OI-183):
   measured, **48 of 125 runs (38%) would have been retried in production**. The eval numbers are a
   floor. Owner decision 2026-08-26: leave the harness as-is and carry the caveat in
   `reason_corpus/runs/README.md`. **Nothing to build here.**

Filed backlog: **OI-190…OI-196** in `docs/open_issues.md`. Decision record: **D48** in
`docs/architecture/reason-DECISIONS.md`.

---

## Global Constraints

- All coordinates are **0-indexed** internally (row 0 = bottom, col 0 = leftmost). Display columns are
  `col + 1`. Never introduce a 1-indexed internal value.
- `npm run test:fast` is run from `connect-four/`, runs `eslint .` FIRST, and a lint **error** means
  zero tests execute. 47 warnings is the healthy baseline; the green baseline is **0 failures**.
- Every test file this plan touches is **already registered** in `package.json`'s `test:fast` list. If
  you add a NEW test file you MUST append it to that list or it will never run.
- Player-facing coach prose may use plain English + Connect Four jargon only. Banned in `link.text` and
  frame text: `solver`, `plies`, `pliesToEnd`, `register`, `horizon`, `completing cell`, `window` (as
  jargon), and any raw tag slug (`double_threat`, `figure_7`, `immediate_threat`).
- Do NOT modify `computeReason` or anything under `reason_engine/reasonEngine.mjs`. This plan is
  render-layer only. The reason engine's evidence was correct in **every** failing case (0 of 58 were
  triaged `vector_error` or `missing_info`).
- Read before touching the render layer: `docs/architecture/reason-INVARIANTS.md`,
  `docs/architecture/reason-DECISIONS.md` (especially **D20**, **D28**, **D30**, **D43**, **D45**),
  `docs/architecture/reason-case-taxonomy.md`.
- Run `eval "$(./worktree-ports.sh)"` from the repo root before starting/killing any server. Never kill
  by bare port number.
- **ALWAYS pass `--model` explicitly to `compute.mjs`. Never rely on its default.** The default is
  `$EXPLAIN_MODEL`, which is `gpt-5.4` — the eval-only FULL model, *not* what production ships. The two
  ids are:

  | role | env var | value | use for |
  |---|---|---|---|
  | production deep reveal | `OPENAI_MODEL` | `gpt-5.4-mini` | baseline + budget arms |
  | eval-only full model | `EXPLAIN_MODEL` | `gpt-5.4` | capability (floor-test) arm |

  Verified: `index.js:1353` reads `model: process.env.OPENAI_MODEL` with the comment *"mini model
  (gpt-5.4-mini); EXPLAIN_MODEL is the eval-only full model"*, and `server/.env` holds
  `OPENAI_MODEL=gpt-5.4-mini` / `EXPLAIN_MODEL=gpt-5.4`.

  This is not a style preference. The 2026-08-06 baseline was produced with an explicit
  `--model gpt-5.4-mini` override (every answers row reads `"model": "gpt-5.4-mini"`), so a re-run that
  omitted `--model` would silently use `gpt-5.4` and be **incomparable to the run it is meant to
  measure against** — a changed `.env` between baseline and re-measure would do the same damage
  invisibly. Every command in this plan states the model, and every recorded result must state the
  model it was produced with.

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `connect-four/server/scripts/reason_corpus/build_boards_subset.mjs` | Carries the FROZEN 25-id list + strata rationale; filters `boards.jsonl` → `boards_subset.jsonl` | **Create** |
| `connect-four/server/scripts/reason_corpus/boards_subset.jsonl` | The 25-board evaluation subset, same shape as `boards.jsonl` | **Create** (generated) |
| `connect-four/server/tests/boardsSubset.test.mjs` | Guards the subset: 25 rows, all 9 links, all 5 passing controls, ids ⊆ boards.jsonl | **Create** (+ register in test:fast) |
| `connect-four/server/scripts/grade_mechanical.mjs` | Deterministic grader for the decidable axes (A1, A2, A6, G7); emits `<stem>_mechanical.json` the grading sub-agents consume | **Create** |
| `connect-four/server/tests/gradeMechanical.test.mjs` | Guards the deterministic grader | **Create** (+ register in test:fast) |
| `connect-four/server/scripts/compute.mjs` | Answerer CLI; gains `--sentence-budget` for the budget arm | Modify (`:213` prompt, arg parsing near `:121`) |
| `connect-four/server/scripts/reason_engine/causalLinks.mjs` | L1–L9 composed frame text | Modify (**L5, L6, L9 only** — the three naming no column; L1/L2/L4/L8 stay as controls) |
| `connect-four/server/scripts/reason_engine/openingFrame.mjs` | O1–O3 opening frames + guardrail | Modify (`horizonTail`, `composeOpeningFrame` guardrail gating, `GUARDRAIL`) |
| `connect-four/server/scripts/renderReasonModel.mjs` | Assembles the model + prompt | Modify (opening branch of `buildReasonRenderModel`; `buildRenderDecision` offer-set mirror, OI-186) |
| `connect-four/server/scripts/reason_engine/zoneAnnotations.mjs` | Offered zone/term set + post-LLM repair | Modify (owner derivation, fork-pivot alias, `dropUnoffered` repairs, stale suppression-rationale comment) |
| `connect-four/server/tests/causalLinksComposers.test.mjs` | Per-link composed-text assertions | Modify (3 assertions lock the old form) + add parametric column test |
| `connect-four/server/tests/openingFrame.test.mjs` | O1–O3 assertions | Modify (add engine-meta + guardrail-gating tests; Task 6 re-points the verbatim-guardrail assertion at `:69`) |
| `connect-four/server/tests/renderReasonModel.test.mjs` | Render model assertions | Modify (add opening-merge tests; Task 6 re-points the verbatim-guardrail assertion at `:221`) |
| `connect-four/server/tests/zoneAnnotations.test.mjs` | Offer-set assertions | Modify (owner, pivot, repairs) |
| `connect-four/server/scripts/renderReasonModel.mjs` (`assembleGroundedPrompt`) | Stop displaying term slugs that are not offered (Task 9b) | Modify |
| `connect-four/server/scripts/reason_engine/causalLinks.mjs` (L4 guardrail) | Hold-the-line framing for `lose_to_faster_lose` on the L4 route (Task 9c) | Modify |
| `connect-four/server/scripts/reason_engine/openingFrame.mjs` (book-line gating) | Do not teach book-line vocabulary when `lead` is null (Task 9d) | Modify |
| `connect-four/server/tests/renderDecisionEmit.test.mjs` | Exercises `buildRenderDecision` | Modify if Task 6's mirror changes its expected alias set |
| `connect-four/server/tests/renderCoverageUniverse.test.mjs` | Exercises `buildRenderDecision` across the corpus | Modify if Task 6's mirror changes coverage expectations |
| `docs/open_issues.md` | Open-issue backlog — OI-186 already filed | **Do NOT `git add` this file in any task.** It carries the repo owner's uncommitted work (OI-183/184/185 and others); staging it in a task commit sweeps their WIP in. Measured 2026-08-11: Task 6's first commit did exactly that and had to be rewritten. |

---

# PHASE A — Measurement instrument and baseline

## Task 1: Freeze the 25-board evaluation subset

The subset is **frozen against the 2026-08-06 grading run**. It must be a static list, not a
re-derivation from grades: re-selecting after the fixes would select on post-fix outcomes and destroy
the meaning of the passing-case controls.

**Files:**
- Create: `connect-four/server/scripts/reason_corpus/build_boards_subset.mjs`
- Create: `connect-four/server/scripts/reason_corpus/boards_subset.jsonl` (generated)
- Create: `connect-four/server/tests/boardsSubset.test.mjs`
- Modify: `connect-four/package.json` (append the new test file to `test:fast`)

**Interfaces:**
- Produces: `boards_subset.jsonl`, byte-identical row shape to `boards.jsonl`
  (`{id, movestring, playedCol, strategy, selection:{predicates, source}}`), consumable by
  `compute.mjs --input` with no code change.

- [x] **Step 1: Write the failing test**

Create `connect-four/server/tests/boardsSubset.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { SUBSET_IDS } from '../scripts/reason_corpus/build_boards_subset.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORPUS = join(__dirname, '../scripts/reason_corpus/boards.jsonl');
const SUBSET = join(__dirname, '../scripts/reason_corpus/boards_subset.jsonl');
const jsonl = (p) => readFileSync(p, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));

// The 5 cases that PASSED the 2026-08-06 grading. They are the regression detector: a fix that
// breaks a currently-passing board is invisible without them.
const PASSING_CONTROLS = ['eval-2', 'eval-33', 'eval-37',
  'pin-branch-invariance-true-1', 'pin-branch-invariance-true-2'];

test('subset file exists and has exactly the frozen ids, in boards.jsonl order', () => {
  assert.ok(existsSync(SUBSET), 'boards_subset.jsonl not generated — run build_boards_subset.mjs');
  const sub = jsonl(SUBSET);
  assert.equal(sub.length, 25);
  assert.deepEqual(new Set(sub.map((r) => r.id)), new Set(SUBSET_IDS));
});

test('every subset id exists in boards.jsonl and the row is copied verbatim', () => {
  const full = new Map(jsonl(CORPUS).map((r) => [r.id, r]));
  for (const r of jsonl(SUBSET)) {
    assert.ok(full.has(r.id), `subset id ${r.id} is not in boards.jsonl`);
    assert.deepEqual(r, full.get(r.id), `row for ${r.id} diverges from boards.jsonl`);
  }
});

test('all 5 passing controls are retained', () => {
  const ids = new Set(jsonl(SUBSET).map((r) => r.id));
  for (const id of PASSING_CONTROLS) assert.ok(ids.has(id), `lost regression control ${id}`);
});

test('all 9 causal links L1-L9 are represented', async () => {
  const { toNarratorVector, pruneVector } = await import('../scripts/reasonNarratorVector.mjs');
  const { classifyCausalLink } = await import('../scripts/reason_engine/causalLinks.mjs');
  const { patternOnAfterBestBoard } = await import('../scripts/reasonBoardSelect.mjs');
  const ev = new Map(jsonl(join(__dirname, '../scripts/reason_corpus/evidence.jsonl'))
    .map((r) => [r.id, r.evidence]));
  const seen = new Set();
  for (const r of jsonl(SUBSET)) {
    const fv = pruneVector(toNarratorVector(ev.get(r.id)));
    const ctx = fv.direction === 'enabled_opponent'
      ? { patternOnAfterBestBoard: patternOnAfterBestBoard(fv) } : {};
    seen.add(classifyCausalLink(fv, ctx).id);
  }
  assert.deepEqual([...seen].sort(), ['L1','L2','L3','L4','L5','L6','L7','L8','L9']);
});
```

- [x] **Step 2: Run it and confirm it fails for the right reason**

```bash
cd connect-four
node --test --experimental-test-module-mocks server/tests/boardsSubset.test.mjs
```

Expected: FAIL — `Cannot find module '.../build_boards_subset.mjs'`. It must fail on the missing
module, NOT on an assertion.

- [x] **Step 3: Write the builder**

Create `connect-four/server/scripts/reason_corpus/build_boards_subset.mjs`:

```js
// Builds boards_subset.jsonl — the FROZEN 25-board evaluation subset.
//
// Frozen against the 2026-08-06 grading run (fv_suff_answers_boards_2026-08-06T16-04-29Z_grades.jsonl).
// Chosen by set-cover over the strata the render remediation changes, NOT by sampling, so each fix has
// its own measurable stratum. DO NOT regenerate this list from a later grading run: re-selecting on
// post-fix outcomes would destroy the meaning of the passing-case controls.
//
// Strata covered (count in subset / count in the full 63):
//   passing controls (regression guard)          5 / 5   <- ALL of them, deliberately
//   A7 deterministic x opening  (opening merge)  9 / 20
//   A7 deterministic x mid/late (control)        4 / 9
//   A6 deterministic x column ABSENT (L5/L6/L9)  4 / 8
//   A6 deterministic x column parenthetical      4 / 4
//   A6 flaky x column prose (salience control)   4 / 7
//   fork cases (A7c pivot)                       5 / 19
//   render_bug triage                            4 / 17
//   G5/G7 board-truth + annotation               6 / 21
//   A4 flaky (fabrication variance)              5 / 15
//   plus >= 2 cases for every causal link L1-L9
//
// Usage (from connect-four/):  node server/scripts/reason_corpus/build_boards_subset.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const SUBSET_IDS = [
  // passing controls
  'eval-2', 'eval-33', 'eval-37', 'pin-branch-invariance-true-1', 'pin-branch-invariance-true-2',
  // L1 (parenthetical column, A6 deterministic)
  'eval-34', 'eval-41', 'eval-47', 'eval-50',
  // L2
  'pin-L2-enabled-opponent',
  // L4
  'eval-32', 'eval-39',
  // L5 (column absent)
  'eval-9', 'eval-16', 'pin-L5-deep-fork',
  // L6 (column absent, opening, forks)
  'eval-11', 'eval-20',
  // L7 (prose column, opening)
  'eval-5', 'eval-6', 'eval-13', 'eval-21',
  // L8
  'eval-36', 'eval-38',
  // L9 (column absent)
  'eval-35', 'pin-L9-hedged-parity',
];

const __dirname = dirname(fileURLToPath(import.meta.url));
const IN = join(__dirname, 'boards.jsonl');
const OUT = join(__dirname, 'boards_subset.jsonl');

export function buildSubset(rows, ids = SUBSET_IDS) {
  const want = new Set(ids);
  const kept = rows.filter((r) => want.has(r.id));
  const missing = ids.filter((id) => !rows.some((r) => r.id === id));
  if (missing.length) throw new Error(`ids not present in boards.jsonl: ${missing.join(', ')}`);
  return kept;                       // boards.jsonl order, rows copied verbatim
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const rows = readFileSync(IN, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const kept = buildSubset(rows);
  writeFileSync(OUT, kept.map((r) => JSON.stringify(r)).join('\n') + '\n');
  console.log(`wrote ${OUT} — ${kept.length} boards`);
}
```

- [x] **Step 4: Generate the file and run the test**

```bash
cd connect-four
node server/scripts/reason_corpus/build_boards_subset.mjs
node --test --experimental-test-module-mocks server/tests/boardsSubset.test.mjs
```

Expected: `wrote .../boards_subset.jsonl — 25 boards`, then all 4 tests PASS. If the L1–L9 test fails,
the frozen list is wrong — do NOT relax the assertion, fix the list.

- [x] **Step 5: Register the new test file**

In `connect-four/package.json`, append ` server/tests/boardsSubset.test.mjs` to the end of the
`test:fast` script's file list (a new test file that is not listed never runs).

- [x] **Step 6: Full gate + commit**

```bash
cd connect-four && npm run test:fast 2>&1 | tail -8
git add connect-four/server/scripts/reason_corpus/build_boards_subset.mjs \
        connect-four/server/scripts/reason_corpus/boards_subset.jsonl \
        connect-four/server/tests/boardsSubset.test.mjs connect-four/package.json
git commit -m "test(058): freeze the 25-board fv-suff evaluation subset"
```

Expected: `pass 1927  fail 0` (1923 + 4 new).

---

## Task 2: Add `--sentence-budget` to the answerer

The budget arm needs the answer-length instruction to be a variable. Today it is hardcoded in the
answer schema at `compute.mjs:213`:

```
  "mechanism":        "<1-3 sentences spoken directly to the player as their coach: the load-bearing reason the played move is worse. 2nd person, plain Connect Four language, NO internal/field/engine terms>",
```

**Files:**
- Modify: `connect-four/server/scripts/compute.mjs` (help text ~`:66-85`, arg parsing ~`:121`, schema `:213`)
- Modify: `connect-four/server/tests/computeConditionD.test.mjs`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: CLI flag `--sentence-budget <text>` (default `1-3`), interpolated into the mechanism schema line.

- [x] **Step 1: Write the failing test**

Append to `connect-four/server/tests/computeConditionD.test.mjs`:

```js
test('sentence budget is interpolated into the mechanism schema line', async () => {
  const { answerSchemaBlock } = await import('../scripts/compute.mjs');
  assert.match(answerSchemaBlock('1-3'), /<1-3 sentences spoken directly to the player/);
  assert.match(answerSchemaBlock('4-6'), /<4-6 sentences spoken directly to the player/);
  // the rest of the contract must not drift with the budget
  assert.match(answerSchemaBlock('4-6'), /NO internal\/field\/engine terms/);
});
```

- [x] **Step 2: Run it and confirm it fails**

```bash
cd connect-four
node --test --experimental-test-module-mocks server/tests/computeConditionD.test.mjs
```

Expected: FAIL — `answerSchemaBlock is not a function`.

- [x] **Step 3: Extract the schema block and parameterise it**

In `compute.mjs`, replace the hardcoded mechanism line by exporting a builder. The literal `1-3` at
`:213` becomes `${budget}`:

```js
// Exported for the budget-ablation arm: the answer schema with a parameterised sentence budget.
// `budget` is prose ('1-3', '4-6'), not a number — it is read by the model, not parsed.
export function answerSchemaBlock(budget = '1-3') {
  return `  "mechanism":        "<${budget} sentences spoken directly to the player as their coach: the load-bearing reason the played move is worse. 2nd person, plain Connect Four language, NO internal/field/engine terms>",`;
}
```

Then use `answerSchemaBlock(sentenceBudget)` at the site that currently holds the literal line, add to
the arg block near `:121`:

```js
  sentenceBudget = argVal('--sentence-budget', '1-3');
```

declare `sentenceBudget` alongside the other `let` CLI vars (~`:94`), and document it in the help text
next to `--model`:

```
  --sentence-budget <t> Answer-length instruction for the mechanism field, as prose (e.g. "1-3",
                        "4-6"). Default: 1-3. Used by the budget-ablation arm.
```

- [x] **Step 4: Run the test and the gate**

```bash
cd connect-four
node --test --experimental-test-module-mocks server/tests/computeConditionD.test.mjs
node server/scripts/compute.mjs --help | grep -A1 sentence-budget
npm run test:fast 2>&1 | tail -8
```

Expected: test PASSES; `--help` shows the flag and exits 0; `fail 0`.

- [x] **Step 5: Commit**

```bash
git add connect-four/server/scripts/compute.mjs connect-four/server/tests/computeConditionD.test.mjs
git commit -m "feat(058): parameterise the answerer sentence budget for the ablation arm"
```

---

## Task 2b: Deterministic mechanical grader (A1, A2, A6, G7)

Four of the fourteen checks are **decidable by code** and should never have been LLM judgments. Moving
them out is primarily a **correctness** win — an LLM deciding "does this prose contain 'column 4'" is
strictly worse than a regex, and A6 is this plan's primary outcome measure — with a secondary token
saving (roughly 25 → 18-20 turns per grading agent; the expensive board/solver work for A3/A4/G4/G5
stays with the agent, so do NOT expect more than ~30%).

**Do not batch cases into shared agents to save more.** Measured on the 2026-08-06 grading run, agent
input cost is superlinear in turns (58k/turn at 10-15 turns → 97k/turn at 30+), because the whole
conversation is re-sent each turn. Four separate ~25-turn agents cost ~7.3M; one ~100-turn agent
extrapolates higher, and it concentrates the cross-case contamination risk that per-case isolation
exists to prevent.

**Files:**
- Create: `connect-four/server/scripts/grade_mechanical.mjs`
- Create: `connect-four/server/tests/gradeMechanical.test.mjs`
- Modify: `connect-four/package.json` (append the new test file to `test:fast`)

**Interfaces:**
- Consumes: `mentionsBetterColumn(attempt, bestCol, locale)` from `server/mechanismExplainer.mjs:115`
  — production's own check, locale-aware, tests through the guard's `stripInternalTokens` so a raw
  `cNrM` the guard rewrites to "column N" counts, while a bare `[zone:c2r1]` does not.
- Produces: `<answers-stem>_mechanical.json` — `{ "<id>|<condition>|<run_index>": {A1,A2,A6,G7a_offered,G7b_offered,notes} }`,
  consumed by the `grade-fv-sufficiency` sub-agent prompt.

**Two traps this task must handle — both verified:**

1. **`mentionsBetterColumn` abstains permissively.** `:116-118` returns `true` when `bestCol == null`
   or the mechanism is empty, because it is a *retry trigger* and a false miss would burn the single
   shared retry. For GRADING the opposite is correct: an empty mechanism is an A6 **fail**. Wrap it.
2. **G7 must read `raw`, not `answer.mechanism`.** The stored `answer.mechanism` is already
   post-`processAnnotations` — handles are expanded to specs and unoffered tags are stripped (verified
   in the served corpus: `[zone:col4]` appears where the offered handle was `better-col`). Checking it
   would find no violations by construction. The row's sibling `raw` field carries the model's original
   text. Do NOT rely on `annotationRepairs` either: Task 9 is what makes it record `unoffered_*`, and
   this script must give identical answers on the PRE-fix baseline, which predates that.

- [x] **Step 1: Write the failing test**

Create `connect-four/server/tests/gradeMechanical.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gradeMechanicalRow } from '../scripts/grade_mechanical.mjs';

const FV = { bestCol: 3, playedCol: 1, case: 'win_to_draw' };          // display column 4
const ZONES = { aliases: [{ handle: 'better-col', spec: 'col4' }], terms: [] };
const row = (over = {}) => ({
  id: 'x', condition: 'D', run_index: 0, feature_vector: FV,
  render_decision: { zones: ZONES },
  answer: { better_move: 4, best_outcome: 'win', played_outcome: 'draw', mechanism: 'Column 4 was better.' },
  raw: 'Column 4 was better.', ...over,
});

test('A1 compares 1-indexed better_move against 0-indexed bestCol', () => {
  assert.equal(gradeMechanicalRow(row()).A1, 'pass');
  assert.equal(gradeMechanicalRow(row({ answer: { ...row().answer, better_move: 3 } })).A1, 'fail');
});

test('A2 derives both outcomes from feature_vector.case', () => {
  assert.equal(gradeMechanicalRow(row()).A2, 'pass');
  const wrong = row({ answer: { ...row().answer, played_outcome: 'loss' } });
  assert.equal(gradeMechanicalRow(wrong).A2, 'fail');
});

test('A6 accepts a raw coordinate the guard rewrites to "column N"', () => {
  const r = row({ answer: { ...row().answer, mechanism: 'You had to take c4r1.' } });
  assert.equal(gradeMechanicalRow(r).A6, 'pass');
});

test('A6 rejects a column that survives ONLY inside a zone handle', () => {
  const r = row({ answer: { ...row().answer, mechanism: 'Take [zone:col4]the centre[/zone:col4].' } });
  assert.equal(gradeMechanicalRow(r).A6, 'fail');
});

test('A6 fails on an empty mechanism (mentionsBetterColumn abstains true; grading must not)', () => {
  const r = row({ answer: { ...row().answer, mechanism: '' } });
  assert.equal(gradeMechanicalRow(r).A6, 'fail');
});

test('G7b reads raw, so an unoffered slug stripped from answer.mechanism is still caught', () => {
  const r = row({ raw: 'Play [term:central]the middle[/term:central] in [zone:better-col]column 4[/zone:better-col].' });
  const g = gradeMechanicalRow(r);
  assert.equal(g.G7b_offered, 'fail');
  assert.equal(g.G7a_offered, 'pass');        // the zone handle WAS offered
  assert.match(g.notes, /central/);
});

test('G7a/G7b pass when every emitted handle and slug was offered', () => {
  const r = row({ raw: 'Play [zone:better-col]column 4[/zone:better-col].' });
  const g = gradeMechanicalRow(r);
  assert.equal(g.G7a_offered, 'pass');
  assert.equal(g.G7b_offered, 'pass');
});
```

- [x] **Step 2: Run it and confirm it fails**

```bash
cd connect-four
node --test --experimental-test-module-mocks server/tests/gradeMechanical.test.mjs
```

Expected: FAIL — `Cannot find module '.../grade_mechanical.mjs'`.

- [x] **Step 3: Write the script**

Create `connect-four/server/scripts/grade_mechanical.mjs`:

```js
// Deterministic grader for the DECIDABLE fv-sufficiency axes: A1, A2, A6, G7.
// These need no model judgment, and an LLM deciding them is strictly worse than code — A6 in
// particular is the primary outcome measure of the render remediation. The grade-fv-sufficiency
// sub-agents consume this file's output and grade only the judgment axes (A3, A4, A5, A7, G1-G6).
//
// Usage (from connect-four/):
//   node server/scripts/grade_mechanical.mjs <answers.jsonl> [--locale en]
// Writes <answers-stem>_mechanical.json next to the answers file and prints a per-axis summary.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';
import { mentionsBetterColumn } from '../mechanismExplainer.mjs';

// feature_vector.case fixes BOTH outcomes — it is the sign pair of (bestScore, playedScore).
const CASE_OUTCOMES = {
  win_to_draw:        { best: 'win',  played: 'draw' },
  win_to_lose:        { best: 'win',  played: 'loss' },
  draw_to_lose:       { best: 'draw', played: 'loss' },
  lose_to_faster_lose:{ best: 'loss', played: 'loss' },
};

const emitted = (text, kind) =>
  [...(text ?? '').matchAll(new RegExp(`\\[${kind}:([^\\]!/]+)\\]`, 'g'))].map((m) => m[1]);

export function gradeMechanicalRow(row, locale = 'en') {
  const fv = row.feature_vector ?? {};
  const a = row.answer ?? {};
  const notes = [];

  // A1 — better_move is 1-indexed display; bestCol is 0-indexed.
  const A1 = a.better_move != null && fv.bestCol != null && (a.better_move - 1) === fv.bestCol
    ? 'pass' : 'fail';
  if (A1 === 'fail') notes.push(`A1: better_move ${a.better_move} vs bestCol ${fv.bestCol} (display ${fv.bestCol + 1})`);

  // A2 — both outcome labels are fixed by `case`.
  const exp = CASE_OUTCOMES[fv.case];
  const A2 = exp && a.best_outcome === exp.best && a.played_outcome === exp.played ? 'pass' : 'fail';
  if (A2 === 'fail') notes.push(`A2: case ${fv.case} implies ${exp?.best}/${exp?.played}, got ${a.best_outcome}/${a.played_outcome}`);

  // A6 — production's own predictor of what the player is served. mentionsBetterColumn abstains
  // `true` on an empty mechanism (it is a retry trigger, :116-118); for grading that is a fail.
  const A6 = (a.mechanism ?? '').trim()
    ? (mentionsBetterColumn({ mechanism: a.mechanism }, fv.bestCol, locale) ? 'pass' : 'fail')
    : 'fail';
  if (A6 === 'fail') notes.push(`A6: prose never names column ${fv.bestCol + 1}`);

  // G7a/G7b — read `raw`, the model's ORIGINAL text. answer.mechanism is post-processAnnotations
  // (handles already expanded to specs, unoffered tags already stripped), so it cannot show a
  // violation. Not derived from annotationRepairs either: Task 9 is what makes that record
  // unoffered_*, and this must behave identically on the pre-fix baseline.
  const zones = row.render_decision?.zones ?? { aliases: [], terms: [] };
  const handles = new Set((zones.aliases ?? []).map((x) => x.handle));
  const slugs = new Set((zones.terms ?? []).map((x) => x.slug));
  // ONLY the membership half is decidable. Whether a handle wraps a semantically appropriate phrase,
  // and whether anything is over-wrapped, stays with the agent — measured on the 2026-08-06 corpus the
  // script and the agents agreed on 122/126 runs and all 4 disagreements were that judgment half.
  const badZones = emitted(row.raw, 'zone').filter((h) => !handles.has(h));
  const badTerms = emitted(row.raw, 'term').filter((s) => !slugs.has(s));
  const G7a_offered = badZones.length === 0 ? 'pass' : 'fail';
  const G7b_offered = badTerms.length === 0 ? 'pass' : 'fail';
  if (badZones.length) notes.push(`G7a: unoffered zone handle(s) ${[...new Set(badZones)].join(', ')}`);
  if (badTerms.length) notes.push(`G7b: unoffered term slug(s) ${[...new Set(badTerms)].join(', ')}`);

  return { A1, A2, A6, G7a_offered, G7b_offered, notes: notes.join('; ') };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const src = process.argv[2];
  if (!src) { console.error('Usage: node server/scripts/grade_mechanical.mjs <answers.jsonl> [--locale en]'); process.exit(1); }
  const li = process.argv.indexOf('--locale');
  const locale = li >= 0 ? process.argv[li + 1] : 'en';
  const rows = readFileSync(src, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const out = {};
  const AXES = ['A1', 'A2', 'A6', 'G7a_offered', 'G7b_offered'];
  const tally = Object.fromEntries(AXES.map((a) => [a, [0, 0]]));
  for (const r of rows) {
    if (!r.answer) continue;                       // parse failure — the agent owns that case
    const g = gradeMechanicalRow(r, locale);
    out[`${r.id}|${r.condition}|${r.run_index}`] = g;
    for (const ax of AXES) { tally[ax][1]++; if (g[ax] === 'pass') tally[ax][0]++; }
  }
  const dest = join(dirname(src), basename(src).replace(/\.jsonl$/, '_mechanical.json'));
  writeFileSync(dest, JSON.stringify(out, null, 1));
  console.log(`wrote ${dest} — ${Object.keys(out).length} runs`);
  for (const ax of AXES) {
    const [p, n] = tally[ax];
    console.log(`  ${ax}: ${p}/${n} pass (${n ? Math.round((100 * p) / n) : 0}%)`);
  }
}
```

- [x] **Step 4: Run the test, then validate against the graded corpus**

```bash
cd connect-four
node --test --experimental-test-module-mocks server/tests/gradeMechanical.test.mjs
```

Expected: all 7 PASS.

Now the real check — the script must reproduce the human-graded A6 verdicts on the 2026-08-06 run:

```bash
cd connect-four
node server/scripts/grade_mechanical.mjs \
  server/scripts/reason_corpus/runs/fv_suff_answers_boards_2026-08-06T16-04-29Z.jsonl
node -e "
const fs=require('fs'), R='server/scripts/reason_corpus/runs/fv_suff_answers_boards_2026-08-06T16-04-29Z';
const mech=JSON.parse(fs.readFileSync(R+'_mechanical.json','utf8'));
const g=fs.readFileSync(R+'_grades.jsonl','utf8').trim().split('\n').map(JSON.parse);
let agree=0,dis=[];
for(const c of g) for(const r of c.per_run||[]){
  const m=mech[c.id+'|'+c.condition+'|'+r.run_index]; if(!m) continue;
  if(m.A6===r.A6) agree++; else dis.push(c.id+' run'+r.run_index+' script='+m.A6+' agent='+r.A6);
}
console.log('A6 agreement with the human grading:',agree,'/',agree+dis.length);
dis.slice(0,10).forEach(d=>console.log('  DISAGREE',d));
"
```

Expected: A1 126/126 and A2 126/126 (the agents scored both perfect, so any deviation is a script
bug). A6 should agree on the large majority. **Investigate every disagreement individually — do not
assume the script is right.** A genuine disagreement is informative in both directions: the agent may
have mis-scored, or the script may be missing a locale / `stripInternalTokens` subtlety. Record the
verdict for each in the commit message.

- [x] **Step 5: Register the test and commit**

Append ` server/tests/gradeMechanical.test.mjs` to `test:fast` in `connect-four/package.json`, then:

```bash
cd connect-four && npm run test:fast 2>&1 | tail -8
git add connect-four/server/scripts/grade_mechanical.mjs \
        connect-four/server/tests/gradeMechanical.test.mjs connect-four/package.json
git commit -m "feat(058): deterministic grader for the decidable axes (A1/A2/A6/G7)"
```

---

## Task 3: Capture the baseline — three arms on the CURRENT code

**This task runs before any fix. It is not optional and it cannot be done later:** the whole plan is
judged against these numbers, and the n=2 run we have is too noisy to serve (50–90% of failing axes
flip between runs, so a 2-run pass rate estimates a single sample).

**Files:** none modified. Outputs land in `connect-four/server/scripts/reason_corpus/runs/`.

- [x] **Step 1: Baseline arm — PRODUCTION model (`gpt-5.4-mini`), current budget, n=5**

`--model gpt-5.4-mini` is mandatory here: it is what production ships and what the 2026-08-06 run used.
Omitting it would fall back to `$EXPLAIN_MODEL` = `gpt-5.4` and produce a baseline that is not
comparable to anything.

```bash
cd connect-four
node server/scripts/compute.mjs \
  --input server/scripts/reason_corpus/boards_subset.jsonl \
  --out reason_evidence_subset.jsonl \
  --llm --condition D --n 5 --model gpt-5.4-mini
```

125 answers (25 boards × 5 runs). Note the answers filename it prints. Then confirm the model actually
used, rather than assuming the flag took effect:

```bash
node -e "const fs=require('fs');const rows=fs.readFileSync(process.argv[1],'utf8').trim().split('\n').map(JSON.parse);console.log([...new Set(rows.map(r=>r.model))],rows.length+' rows')" <answers jsonl>
```

Expected: `[ 'gpt-5.4-mini' ] 125 rows`.

- [x] **Step 2: Capability arm — FULL model (`gpt-5.4`), the floor test the rubric assumes**

The 2026-08-06 run used `gpt-5.4-mini`, the PRODUCTION model, while the grading rubric assumed a
stronger one. That made every `prompt_confusion` verdict ambiguous between prompt design and model
capability. This arm separates them. `gpt-5.4` happens to equal the current `$EXPLAIN_MODEL` default —
state it anyway, so the arm survives an `.env` change.

```bash
cd connect-four
node server/scripts/compute.mjs \
  --input server/scripts/reason_corpus/boards_subset.jsonl \
  --out reason_evidence_subset.jsonl \
  --llm --condition D --n 3 --model gpt-5.4
```

Confirm with the same one-liner; expected `[ 'gpt-5.4' ] 75 rows`.

- [x] **Step 3: Budget arm — 13 deterministic-A7 boards, larger budget**

These are the boards where A7 fails on EVERY run; if extra room does not move them, it moves nothing.

```bash
cd connect-four
node server/scripts/compute.mjs \
  --input server/scripts/reason_corpus/boards_subset.jsonl \
  --ids eval-5,eval-6,eval-9,eval-11,eval-13,eval-16,eval-20,eval-21,eval-47,eval-50,pin-L2-enabled-opponent,pin-L5-deep-fork,pin-L9-hedged-parity \
  --out reason_evidence_subset.jsonl \
  --llm --condition D --n 5 --model gpt-5.4-mini --sentence-budget "4-6"
```

`--model gpt-5.4-mini` must match the baseline arm exactly — the budget is the ONLY variable this arm
changes. Confirm with the same one-liner; expected `[ 'gpt-5.4-mini' ] 65 rows`.

- [x] **Step 4: Run the mechanical grader FIRST, then the agents**

The deterministic pass must precede the skill on every arm — the sub-agents consume its output and
skip A1/A2/A6/G7:

```bash
cd connect-four
node server/scripts/grade_mechanical.mjs <path to arm's answers jsonl>
```

Then invoke `grade-fv-sufficiency` once per answers file:

```
/grade-fv-sufficiency <path to arm's answers jsonl> --vectors ./connect-four/server/scripts/reason_corpus/evidence.jsonl
```

63 grading agents across the three arms. Two cost rules the skill enforces, restated here so a
deviation is visible: **one case per agent — never batch** (agent input cost is superlinear in turns:
58k/turn at 10-15 turns, 97k/turn at 30+), and the agents grade **all 5 runs for A7** (its
deterministic→flaky transition is this plan's success signal and needs the full resolution) but only
**2 runs for A3/A4/G2/G4/G5**, the deferred axes where a regression signal suffices.

- [x] **Step 5: Record the baseline**

Create `docs/superpowers/plans/2026-08-11-baseline-numbers.md` with, **per arm**, the per-run rate for
A3/A4/A5/A6/A7 and G2/G5/G7, plus per-stratum A6 and A7 rates. Record **per-run rates, not case pass
rates** — the all-runs-pass rule is not comparable across arms with different n. State explicitly that
the subset's pass rate is NOT the corpus pass rate.

State the ceiling explicitly, so a partial result is not misread as a partial fix: of the 58 boards
that failed the 2026-08-06 grading run, only 22 fail **exclusively** on A6/A7/G7 — the axes this plan's
five fixes target. Even if every targeted axis goes fully green, the subset's case-pass rate has a low
ceiling this round; the per-stratum per-run rates recorded above are the signal to read, not the
aggregate case-pass count.

- [x] **Step 6: Commit**

```bash
git add docs/superpowers/plans/2026-08-11-baseline-numbers.md \
        connect-four/server/scripts/reason_corpus/runs/
git commit -m "test(058): baseline — 3 arms on the frozen subset, pre-remediation"
```

---

# PHASE B — The render fixes

## Task 4: L5, L6 and L9 name the better column (they currently name none)

**SCOPE: L5, L6 and L9 only — the three templates that name no column at all. Do NOT rewrite L1, L2,
L4 or L8.**

An earlier revision of this task rewrote all seven non-prose templates on the strength of a
"prose 0/20 vs parenthetical 10/18" gap. That gap was an artifact of grading the raw eval artifact
instead of the text the player is served. Re-measured through production's own `mentionsBetterColumn`
(the A6 standard Task 2b now enforces), on mid/late boards:

| `link.text` form | runs | A6 failure (as served) |
|---|---|---|
| prose "Column N" (L3, L7) | 22 | 0% |
| parenthetical "(col N)" (L1, L2, L4, L8) | 32 | **9%** |
| **absent (L5, L6, L9)** | 12 | **58%** |

The parenthetical form is very nearly as good as prose once the guard's `cNrM` → "column N" rewrite is
accounted for. The real cliff is between naming the column **at all** and not naming it. Rewriting
L1/L2/L4/L8 would touch four working templates and re-point three passing assertions to move ~3 runs
in 32 — poor value, and it would destroy their usefulness as an untouched control group for the
re-measure. Deferred; see the Deferred section.

L3 and L7 (prose) and L1/L2/L4/L8 (parenthetical) are all controls here — **do not touch any of them.**

**Confirmed by the 2026-08-11 arm-1 baseline (125 graded runs):** every column-absent board fails A6
**deterministically, on all 5 runs** — `pin-L5-deep-fork` 5/5, `eval-38` 5/5, `eval-35` 5/5. The
mechanical grader puts the ABSENT group at 0/5 on mid/late and 15/30 on opening. This is no longer an
inference from template shape; it is measured, and it is the largest single axis failure in the run
(A6 85/125 = 68%).

**`requiredSet` is NOT a substitute for this fix — verified, do not swap them.** The baseline shows
`requiredSet` obliges the better column in **0 of 125 runs**, which looks like the obvious fix given
that the required-set retry is the one lever with measured effect (12/12 vs 0/12 for prompt wording).
It is not, because **the required set forces the TAG, not the WORDS**, and A6 grades the served prose:

```
PASS  "Play [zone:col4]column 4[/zone:col4] instead."          <- inner text names it
FAIL  "Play [zone:col4]the central column[/zone:col4] instead." <- same required tag, A6 still fails
FAIL  "Play [zone:col4][/zone:col4] instead."
PASS  "Play [zone:col4]c4r1[/zone:col4] instead."               <- guard rewrites the cell
```

(run against production's own `mentionsBetterColumn`). Obliging `better-col` would highlight the column
on the board — worth doing for A7b locatability, filed separately — but it cannot make A6 pass. Only
the template putting the words in front of the model does that.

**Files:**
- Modify: `connect-four/server/scripts/reason_engine/causalLinks.mjs` (**L5, L6, L9 only**)
- Modify: `connect-four/server/tests/causalLinksComposers.test.mjs` (ADD the parametric test; the three
  existing `/better move \(col N\)/` assertions at ~:32/:45/:62 stay UNTOUCHED — those templates keep
  the parenthetical form)

**Interfaces:**
- Consumes: `col1(c)` = `c + 1` (`causalLinks.mjs:22`), `plainTag`, `denialCell`, `horizonPhrase`,
  `forkOrParity`, `pliesTail`, `cells` — all already defined in the file.
- Produces: `classifyCausalLink(fv, ctx).text` names the better column for every L1–L9 — as prose in
  L3/L5/L6/L7/L9 and as the pre-existing `(col N)` parenthetical in L1/L2/L4/L8.

- [x] **Step 1: Write the failing test**

Append to `connect-four/server/tests/causalLinksComposers.test.mjs` (it already exports `classifyById`
and loads `evidence.jsonl` — reuse them, do not re-import):

```js
// The A6 invariant: the composed frame is the ONLY place the player learns which column to play.
// A parenthetical "(col N)" was measured to be dropped from the coach's prose about half the time,
// and L5/L6/L9 omitted the column entirely. Every link must state it as prose.
const ONE_PER_LINK = {
  L1: 'pin-L1-completes-your-tactic', L2: 'pin-L2-enabled-opponent', L3: 'pin-L3-no-causation',
  L4: 'pin-L4-missed-defense', L5: 'pin-L5-deep-fork', L6: 'pin-L6-lost-win-and-gave-one',
  L7: 'pin-L7-practical-swindle', L8: 'pin-L8-draw-abandoned', L9: 'pin-L9-hedged-parity',
};

for (const [linkId, boardId] of Object.entries(ONE_PER_LINK)) {
  test(`${linkId}: composed text names the better column as prose, not a parenthetical`, () => {
    const { fv, link } = classifyById(boardId);
    assert.equal(link.id, linkId);
    const display = fv.bestCol + 1;
    // Either surface form is acceptable: measured as SERVED (through the guard's cNrM -> "column N"
    // rewrite), "(col N)" fails A6 on only 9% of mid/late runs vs 0% for prose — while templates
    // naming no column at all fail 58%. The invariant is that the column is named, not how.
    assert.match(link.text, new RegExp(`(?:[Cc]olumn ${display}\\b|\\(col ${display}\\))`),
      `${linkId} must name the better column (${display}); got: ${link.text}`);
  });
}
```

- [x] **Step 2: Run it and confirm which links fail**

```bash
cd connect-four
node --test --experimental-test-module-mocks server/tests/causalLinksComposers.test.mjs
```

Expected: L3 and L7 PASS (already prose). L1, L2, L4, L8 fail the `doesNotMatch` on `(col N)`.
L5, L6, L9 fail the `match` — they name no column at all. Confirm that shape before implementing.

- [x] **Step 3: Add the column to the three templates that omit it**

In `causalLinks.mjs`, replace ONLY these three `template:` bodies. Harvested current output is shown so
you can see exactly what changes. **Do not touch L1, L2, L3, L4, L7 or L8.**

**L5** — was `You had a forced win — it resolves deep on a forced line via a fork completing at c4r3. The played move let the opponent deny it at c6r5.` (no column at all)

```js
    template: (fv) => `You had a forced win — it resolves ${horizonPhrase(fv.lostResource?.register)}${pliesTail(fv)} via a ${forkOrParity(fv.lostResource)} completing at ${fv.lostResource?.completingCell}. Column ${col1(fv.bestCol)} was the move that kept it; the played move let the opponent deny it at ${denialCell(fv.opponentPunishment)}.` },
```

**L6** — was `You had a forced win via c5r5 (deep, via a parity battle); the played move gives it up AND lets the opponent force their own win via c6r2.` (no column at all)

```js
    template: (fv) => `You had a forced win via ${fv.lostResource?.completingCell} (${horizonPhrase(fv.lostResource?.register)}${pliesTail(fv)}), and column ${col1(fv.bestCol)} was the move that kept it. The played move gives it up AND lets the opponent force their own win via ${fv.opponentPunishment?.completingCell}.` },
```

**L9** — was `You had a parity/zugzwang win (resolves deep, via a parity battle); the played move loses the parity battle — the exact culprit square isn't cleanly isolable. The winning group runs through c2r5·c3r5·c4r5·c5r5.` (no column at all)

```js
    template: (fv) => `You had a parity/zugzwang win (resolves ${horizonPhrase(fv.lostResource?.register)}${pliesTail(fv)}), and column ${col1(fv.bestCol)} was the move that kept it. The played move loses the parity battle — the exact culprit square isn't cleanly isolable. The winning group runs through ${cells(fv.lostResource?.window)}.` },
```

- [x] **Step 4: Confirm the three existing `(col N)` assertions still pass, UNCHANGED**

`causalLinksComposers.test.mjs` asserts `/better move \(col 3\)/` (L1, ~:32), `/better move \(col 3\)/`
(L2, ~:45) and `/better move \(col 5\)/` (L4, ~:62). Those templates are deliberately **not** rewritten,
so all three must still pass with no edit. If any of them goes red, you changed a template you were told
to leave alone — revert it rather than updating the assertion.

- [x] **Step 5: Run the gate**

```bash
cd connect-four && npm run test:fast 2>&1 | tail -8
```

Expected: `fail 0`. If `renderCoverageCorpus.test.mjs` or `reasonRenderFixes.test.mjs` fail on a text
regex, read the assertion: if it asserts the column is named, update the wording; if it asserts
something else that the rewrite broke, the rewrite is wrong — fix the template, not the test.

- [x] **Step 6: Commit**

```bash
git add connect-four/server/scripts/reason_engine/causalLinks.mjs \
        connect-four/server/tests/causalLinksComposers.test.mjs
git commit -m "fix(058): L5/L6/L9 name the better column; L1/L2/L4/L8 left as controls (A6)"
```

---

## Task 5: Opening frame — remove engine vocabulary, fix the centrality guardrail gate

Two independent defects in `openingFrame.mjs`.

**(a) Engine vocabulary in player-facing text.** `horizonTail` (`:54-61`) emits
`The solver confirms this resolves deep (~28 plies, a deep forced line) …`. Both `solver` and `plies`
are A5a-banned. Measured on eval-19: the model echoed "plies" into coach prose.

**(b) The centrality prohibition can go missing.** `:75` attaches `GUARDRAIL_NO_CENTRALITY` when
`centralityQualitative(fv) === null`, but the O2 branch (`:89`) gates the clause on
`o.centralityGrounded`. When `centralityQualitative` is non-null AND `centralityGrounded` is false, the
clause is suppressed *and* the prohibition is omitted — so nothing stops the model inventing "more
central". Measured on eval-21: both runs claimed column 6 is more central than column 2 (they are
equidistant from centre column 4) with `centralityGrounded: false`.

**Files:**
- Modify: `connect-four/server/scripts/reason_engine/openingFrame.mjs`
- Modify: `connect-four/server/tests/openingFrame.test.mjs`

**Interfaces:**
- Produces: `composeOpeningFrame(fv)` → `{id, kind, confidence, covers, guardrail, text}` — same shape,
  new text and guardrail rules.

- [x] **Step 1: Write the failing tests**

Append to `connect-four/server/tests/openingFrame.test.mjs` (the file already defines `namedFv`,
`defenseFv`, `centralityFv` at the top — reuse them):

```js
test('frame text carries no engine vocabulary (A5a)', () => {
  for (const fv of [namedFv, defenseFv, centralityFv]) {
    const { text } = composeOpeningFrame(fv);
    assert.doesNotMatch(text, /\bsolver\b/i, `"solver" leaked into coach prose: ${text}`);
    assert.doesNotMatch(text, /\bplies\b/i, `"plies" leaked into coach prose: ${text}`);
    assert.match(text, /lesson is the opening/);   // the frame's point survives the rewrite
  }
});

test('centrality prohibition is attached whenever no centrality clause was emitted', () => {
  // O2 with centralityGrounded:false suppresses the clause; the guardrail MUST then forbid the claim.
  const ungrounded = { ...defenseFv,
    openingContext: { defense: { ...defenseFv.openingContext.defense, centralityGrounded: false } } };
  const f = composeOpeningFrame(ungrounded);
  assert.doesNotMatch(f.text, /easier to build a connected four/);   // clause suppressed
  assert.match(f.guardrail, /more central/,                          // ...so prohibition present
    'clause was suppressed but GUARDRAIL_NO_CENTRALITY was not attached');
});

test('a frame that DOES state centrality does not also forbid it', () => {
  const f = composeOpeningFrame(defenseFv);       // centralityGrounded: true
  if (/easier to build a connected four/.test(f.text)) {
    assert.doesNotMatch(f.guardrail, /do not say one column is "more central"/);
  }
});
```

- [x] **Step 2: Run and confirm failure**

```bash
cd connect-four
node --test --experimental-test-module-mocks server/tests/openingFrame.test.mjs
```

Expected: the engine-vocabulary test fails on `solver`/`plies`; the prohibition test fails because the
guardrail lacks the clause.

- [x] **Step 3: Implement**

Replace `horizonTail` (`:54-61`). The ply COUNT is dropped rather than converted — `pliesToEnd` counts
half-moves, so "~28 plies" is not "28 moves" and a unit bug in coach prose is worse than no number:

```js
function horizonTail(fv) {
  const half = fv.case && fv.case.startsWith('win_') ? fv.lostResource : fv.opponentPunishment;
  const battle = half?.register === 'parity' ? 'a parity battle'
    : half?.register === 'forced_sequence' ? 'a deep forced line' : 'a deep line';
  return ` This one only settles a long way out, through ${battle} — too far to pin to a single square; the lesson is the opening.`;
}
```

Restructure `composeOpeningFrame` (`:72-96`) so the guardrail is decided by whether a clause was
actually emitted, not by a predicate that can disagree with the branch:

```js
export function composeOpeningFrame(fv) {
  const oc = fv.openingContext;
  if (!oc) return null;
  // The prohibition is gated on the EMITTED clause, never on a predicate the branch may override:
  // O2 suppresses the clause on centralityGrounded:false while centralityQualitative can still be
  // non-null, which previously dropped both the clause and its prohibition (eval-21).
  const mk = (id, kind, lead, clause) => ({
    id, kind, confidence: 'high', covers: [],
    guardrail: GUARDRAIL + (clause === '' ? GUARDRAIL_NO_CENTRALITY : ''),
    text: lead + clause + horizonTail(fv),
  });

  if (oc.namedOpening) {
    const o = oc.namedOpening;
    return mk('O1', 'namedOpening',
      `In the opening you were following ${nameTag(o)}. The book move is column ${col1(o.bookNextCol)}; `
      + `you played column ${col1(fv.playedCol)}, leaving the line.`,
      centralityClause(fv, true));
  }
  if (oc.defense) {
    const o = oc.defense;
    return mk('O2', 'defense',
      `In the opening you were following ${nameTag(o)}. The more resilient move is column ${col1(o.bestDefenseCol)}; `
      + `column ${col1(fv.playedCol)} gives ground faster.`,
      o.centralityGrounded ? centralityClause(fv, false) : '');
  }
  const o = oc.centrality;
  return mk('O3', 'centrality', `${o.text}`, centralityClause(fv, fv.player === 1));
}
```

- [x] **Step 4: Run the gate**

```bash
cd connect-four && npm run test:fast 2>&1 | tail -8
```

Expected: `fail 0`. The pre-existing O1/O2/O3 tests must still pass — they assert
`/lesson is the opening/`, the book/hold column, and `doesNotMatch(/c6r2|c1r3/)`, all preserved.

- [x] **Step 5: Commit**

```bash
git add connect-four/server/scripts/reason_engine/openingFrame.mjs \
        connect-four/server/tests/openingFrame.test.mjs
git commit -m "fix(058): opening frame drops engine vocabulary; centrality prohibition follows the emitted clause"
```

---

## Task 6: Opening path merges the causal frame instead of replacing it

**This is the largest change and it deliberately reverses an earlier decision.** The opening branch of
`buildReasonRenderModel` (`renderReasonModel.mjs:184-201`) currently:

1. returns `frames: [openingFrame]` only — and since `assembleGroundedPrompt` prints
   `model.frames.map(f => f.text)` (`:371`), **`link.text` is never in the prompt on an opening
   record**. Verified on eval-12: `prompt.includes(link.text)` → `false`, and the completing cell
   `c2r5` appears nowhere in the prompt.
2. calls `buildAnnotationOffer(pruned, allBoards, { openingHorizon: true })`, which disables the entire
   half-geometry alias family (`zoneAnnotations.mjs:153`).
3. applies `pruneOpeningResidue`, flattening both halves to `{register, pliesToEnd}` (`:88-96`).
4. shows only the decision board.

Net effect measured: opening records get 3.7 aliases vs 8.9, requiredSet 1.02 vs 2.29, and **1 of 30
opening cases passed**. A7 fails on 75% of opening runs and 80% of those failures are deterministic —
the model cannot point at geometry it was never offered.

**The bet being taken:** the suppression exists to stop a deep empty cell reading as a present threat
(the eval-3 trap). We are relying on the `future:` decorator to carry that job instead — it already
exists, prefixes the spec, and swaps in role text reading "matters later, once the forced sequence
reaches it — not a threat right now" (`zoneAnnotations.mjs:148-161`). **If the re-measure shows deep
cells narrated as present threats, this is the task to revert.**

**Files:**
- Modify: `connect-four/server/scripts/renderReasonModel.mjs` (`buildReasonRenderModel` opening branch,
  AND the `buildRenderDecision` mirror at `:271` — see Step 3b)
- Modify: `connect-four/server/scripts/reason_engine/openingFrame.mjs` (`GUARDRAIL` wording)
- Modify: `connect-four/server/tests/renderReasonModel.test.mjs`
- Modify: `connect-four/server/tests/openingFrame.test.mjs` (the guardrail-wording assertion at `:69`
  asserts the OLD text this task deletes — see Step 3d)
- Modify: `connect-four/server/tests/renderDecisionEmit.test.mjs` (exercises `buildRenderDecision`)
- Modify: `connect-four/server/tests/renderCoverageUniverse.test.mjs` (exercises `buildRenderDecision`)
- Modify: `connect-four/server/scripts/reason_engine/zoneAnnotations.mjs` (stale rationale comment at
  `:151` — see Step 3c)

**Interfaces:**
- Consumes: `selectBoards(pruned)`, `boardSelectionDecisions(pruned)`, `deriveRequiredSet(pruned, zones)`,
  `renderedFields(pruned, covers)`, `buildAnnotationOffer(pruned, boards, opts)` — all already imported.
- Produces: on an opening record, `model.frames` has length 2 (`[openingFrame, link]`) and
  `assembleGroundedPrompt(model)` contains `link.text`.

- [x] **Step 1: Write the failing test**

Append to `connect-four/server/tests/renderReasonModel.test.mjs`:

```js
test('opening record: the causal frame reaches the prompt alongside the opening frame', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const { toNarratorVector, pruneVector } = await import('../scripts/reasonNarratorVector.mjs');
  const here = dirname(fileURLToPath(import.meta.url));
  const rows = readFileSync(join(here, '../scripts/reason_corpus/evidence.jsonl'), 'utf8')
    .trim().split('\n').map((l) => JSON.parse(l));

  // eval-12 is an opening record whose L6 link names both completing cells.
  const fv = pruneVector(toNarratorVector(rows.find((r) => r.id === 'eval-12').evidence));
  const model = buildReasonRenderModel(fv);
  const prompt = assembleGroundedPrompt(model);

  assert.equal(model.frames.length, 2, 'opening record must carry BOTH frames');
  assert.ok(prompt.includes(model.link.text),
    'link.text is absent from the prompt — the model cannot use what it was never shown');
  assert.ok(prompt.includes(fv.lostResource.completingCell),
    `completing cell ${fv.lostResource.completingCell} is absent from the prompt`);
});

test('opening record: half-geometry aliases are offered, under future: framing', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const { toNarratorVector, pruneVector } = await import('../scripts/reasonNarratorVector.mjs');
  const here = dirname(fileURLToPath(import.meta.url));
  const rows = readFileSync(join(here, '../scripts/reason_corpus/evidence.jsonl'), 'utf8')
    .trim().split('\n').map((l) => JSON.parse(l));
  const fv = pruneVector(toNarratorVector(rows.find((r) => r.id === 'eval-12').evidence));
  const model = buildReasonRenderModel(fv);

  const handles = model.zones.aliases.map((a) => a.handle);
  assert.ok(handles.some((h) => /key-square|key-line/.test(h)),
    `no half-geometry alias offered; got ${handles.join(', ')}`);
  // A deep half must NOT be offered as a present threat (the eval-3 trap the suppression guarded).
  for (const a of model.zones.aliases) {
    if (/key-square|key-line/.test(a.handle)) {
      assert.match(a.spec, /^future:/, `${a.handle} must carry the future: decorator`);
      assert.match(a.role, /matters later|not a threat right now/);
    }
  }
});
```

- [x] **Step 2: Run and confirm failure**

```bash
cd connect-four
node --test --experimental-test-module-mocks server/tests/renderReasonModel.test.mjs
```

Expected: FAIL — `frames.length` is 1, and `prompt.includes(link.text)` is false.

- [x] **Step 3: Implement the merge**

Replace the opening branch return in `buildReasonRenderModel` (`:184-201`):

```js
  const openingFrame = composeOpeningFrame(pruned);
  if (openingFrame) {
    // The opening IS the teachable frame, but it is no longer a REPLACEMENT for the causal one:
    // printing only the opening frame kept link.text — and every cell it names — out of the prompt
    // entirely (verified: eval-12's c2r5 appeared nowhere), so the model could not name the reason
    // even when the engine had it. Both frames print; the deep geometry is offered under the
    // `future:` decorator so it reads as "matters later", never as a present threat.
    const allBoards = boardSelectionDecisions(pruned);
    const zones = buildAnnotationOffer(pruned, allBoards);
    return {
      perspective: { you: pruned.player, opponent: pruned.opponent },
      decision: buildDecision(pruned),
      link,
      frames: [
        { id: openingFrame.id, confidence: openingFrame.confidence, text: openingFrame.text,
          covers: openingFrame.covers, guardrail: openingFrame.guardrail },
        { id: link.id, confidence: link.confidence, text: link.text,
          covers: link.covers, guardrail: link.guardrail },
      ],
      boards: selectBoards(pruned),
      zones,
      requiredSet: deriveRequiredSet(pruned, zones),
      rendered: renderedFields(pruned, link.covers),
      openingReadingKey: OPENING_READING_KEY,
      coverage: { ok: true, unowned: [] },
    };
  }
```

`pruneOpeningResidue` becomes unused — **delete the function** (`:88-96`) rather than leaving dead code.

Then fix the contradiction it used to enforce. In `openingFrame.mjs`, `GUARDRAIL` (`:65-66`) currently
says "Do NOT ground a specific deep completing cell", which `combinedGuardrail`
(`renderReasonModel.mjs:361-364`) concatenates with L5's "state its horizon honestly" and L6's "name
both lines with their horizons" — instructions that cannot both be obeyed (measured: eval-25). Replace:

```js
const GUARDRAIL = 'Explain the blunder through the opening — book line, centrality, parity. '
  + 'The deep resource resolves a long way out: when you name its square or line, say plainly that it '
  + 'matters LATER, once the forced sequence reaches it — never describe it as a threat that exists now.';
```

- [x] **Step 3b: Mirror the offer set into `buildRenderDecision` (D1)**

`buildRenderDecision` (`renderReasonModel.mjs:263-271`) computes its OWN offer set 80 lines below the
opening branch just edited, and is the object `postprocessAnswer` validates the answer against
(`compute.mjs:296-303`, `const { ... } = processAnnotations(answer.mechanism ?? '', render_decision.zones)`).
Left untouched, the prompt now offers `you-key-square`/`you-key-line`/`you-fork-lines`/
`<owner>-fork-pivot` on an opening record while `render_decision.zones` still holds the suppressed
3-alias set — the model uses the newly-offered aliases, `dropUnoffered` deletes every one as unoffered,
and Task 9's `unoffered_zone:*` repairs turn that into a G7 auto-fail. This is the same drift class the
grader already flagged on eval-21 (G3 counterexample: "buildRenderDecision at `:311` still reports
boardSelectionDecisions" while "the assembled prompt renders ONLY the decision board") — filed as a
full unification issue rather than fixed here (see OI-186 below); this step is the one-line mirror that
keeps the two in sync for THIS change.

In `renderReasonModel.mjs`, change the `buildRenderDecision` call at `:270-271`:

```js
  const openingFrame = composeOpeningFrame(pruned);
  // Mirrors buildReasonRenderModel's opening branch (Task 6, spec 058): the prompt no longer
  // suppresses half-geometry aliases on an opening record, so render_decision.zones must not either —
  // postprocessAnswer validates the model's answer against THIS object, not the prompt's. Filed as
  // OI-186 for full unification (buildRenderDecision should consume buildReasonRenderModel instead of
  // recomputing); this line is the interim single-source fix.
  const zones = buildAnnotationOffer(pruned, boardSelectionDecisions(pruned));
```

removing the `{ openingHorizon: !!openingFrame }` third argument entirely (the same argument Task 6's
opening branch above no longer passes).

- [x] **Step 3c: Fix the stale suppression-rationale comment**

`zoneAnnotations.mjs:151` carries a comment justifying `openingHorizon` suppression by quoting the OLD
guardrail wording ("Do NOT ground a specific deep completing cell") — the exact wording Step 3 just
deleted. Update that comment to state the CURRENT rationale: half-geometry aliases are no longer
suppressed on an opening record; they are offered under the `future:` decorator instead, and the
guardrail (now "matters LATER … never describe it as a threat that exists now") is what keeps the model
from reading them as a present threat.

- [x] **Step 3d: Re-point the two tests that assert the OLD guardrail wording verbatim**

Two live assertions depend on the exact string `'Do NOT ground a specific deep completing cell'`, which
Step 3's `GUARDRAIL` replacement deletes. Both must be updated in the SAME commit as the `GUARDRAIL`
change or `test:fast` goes red with no instruction to fix it:

`server/tests/openingFrame.test.mjs:68-70`:

```js
test('guardrail forbids deep-cell grounding', () => {
  // Re-pointed for Task 6 (spec 058): GUARDRAIL no longer says "do not ground"; it requires the LATER
  // framing instead, so the deep cell CAN be named as long as it is framed as future, not present.
  assert.match(composeOpeningFrame(namedFv).guardrail, /matters LATER/i);
});
```

`server/tests/renderReasonModel.test.mjs:221`:

```js
  // Re-pointed for Task 6 (spec 058): openingFrame.mjs's own GUARDRAIL text now reads "matters LATER"
  // instead of "do not ground a specific deep completing cell" — see Task 6, openingFrame.mjs GUARDRAIL.
  assert.match(prompt, /matters LATER/i);
```

- [x] **Step 4: Run the gate**

```bash
cd connect-four && npm run test:fast 2>&1 | tail -8
```

Expected: `fail 0`. `renderCoverageCorpus.test.mjs` walks all 63 records and is the likely place a
regression surfaces; if a coverage assertion fails, read whether it asserts the OLD suppression as an
invariant — if so it encodes the behaviour we are deliberately reversing and should be updated with a
comment naming this task.

- [x] **Step 5: Verify at the source layer — the actual prompt, not the diff**

```bash
cd connect-four && node -e "
const R='/Users/elsonidoq/prog/cuatro_en_linea/.claude/worktrees/deep-reveal-grounding/connect-four/';
(async()=>{
const {readFileSync}=await import('fs');
const {toNarratorVector,pruneVector}=await import(R+'server/scripts/reasonNarratorVector.mjs');
const {buildReasonRenderModel,assembleGroundedPrompt}=await import(R+'server/scripts/renderReasonModel.mjs');
const rows=readFileSync(R+'server/scripts/reason_corpus/evidence.jsonl','utf8').trim().split('\n').map(JSON.parse);
for(const id of ['eval-12','eval-9','eval-25']){
  const fv=pruneVector(toNarratorVector(rows.find(r=>r.id===id).evidence));
  const m=buildReasonRenderModel(fv); const p=assembleGroundedPrompt(m);
  console.log(id,'frames',m.frames.map(f=>f.id).join('+'),'| link.text in prompt:',p.includes(m.link.text),
    '| aliases',m.zones.aliases.length,'| required',m.requiredSet.length,'| chars',p.length);
}})();"
```

Expected: `frames O3+L6`, `link.text in prompt: true`, alias count materially above the pre-fix 3.7
mean. If `link.text in prompt` is still false, the merge did not land — do not proceed.

Also verify the **boards** agreement — measured on the 2026-08-11 baseline, `render_decision.boards`
reports `["decision","projectedDeep"]` shown on eval-13/20/35 while `model.boards` is `["decision"]`
only, so no `## Board: projectedDeep` section is ever printed. Two graders independently attributed
fork mishandling to it (eval-20: 4/5 runs). This task's `boards: selectBoards(pruned)` change is what
fixes it, so assert it rather than assume it: for eval-13/20/35, every board the record marks
`shown:true` must appear as a `## Board: <id>` section in the assembled prompt.

Also verify the Step 3b mirror: `buildRenderDecision` and `buildReasonRenderModel` must offer the same
aliases, or `postprocessAnswer` strips every newly-offered one as unoffered (D1):

```bash
cd connect-four && node -e "
const R='/Users/elsonidoq/prog/cuatro_en_linea/.claude/worktrees/deep-reveal-grounding/connect-four/';
(async()=>{
const {readFileSync}=await import('fs');
const {toNarratorVector,pruneVector}=await import(R+'server/scripts/reasonNarratorVector.mjs');
const {buildReasonRenderModel,buildRenderDecision}=await import(R+'server/scripts/renderReasonModel.mjs');
const rows=readFileSync(R+'server/scripts/reason_corpus/evidence.jsonl','utf8').trim().split('\n').map(JSON.parse);
for(const id of ['eval-12','eval-18']){
  const nv=toNarratorVector(rows.find(r=>r.id===id).evidence);
  const fv=pruneVector(nv);
  const modelAliases=buildReasonRenderModel(fv).zones.aliases.map(a=>a.handle).sort();
  const rdAliases=buildRenderDecision(nv).zones.aliases.map(a=>a.handle).sort();
  console.log(id,'model',modelAliases.join(','));
  console.log(id,'rd   ',rdAliases.join(','));
  console.log(id,'match:',JSON.stringify(modelAliases)===JSON.stringify(rdAliases));
}})();"
```

Expected: `match: true` for both ids. If `false`, `buildRenderDecision` is still suppressing an alias
family the prompt now offers — the Step 3b mirror did not land; do not proceed to commit.

- [x] **Step 6: Commit**

```bash
git add connect-four/server/scripts/renderReasonModel.mjs \
        connect-four/server/scripts/reason_engine/openingFrame.mjs \
        connect-four/server/scripts/reason_engine/zoneAnnotations.mjs \
        connect-four/server/tests/renderReasonModel.test.mjs \
        connect-four/server/tests/openingFrame.test.mjs
git commit -m "fix(058): opening records print the causal frame and offer deep geometry as future:"
```

---

## Task 7: Alias owner follows the geometry, not the half's position

`buildAnnotationOffer` hard-maps `lostResource → 'you'` and `opponentPunishment → 'opp'` at `:128` and
`:155`. That is wrong whenever the lost resource is a **denial** the player would have made: the
geometry belongs to the opponent, but it is offered as `you-key-line` with role text "the whole
four-in-a-row line **you** are playing for". The model then faithfully calls the opponent's line its
own. Measured on pin-L2 (board `334`: two player-1 discs on `c2r1-c5r1`, none of player 2's, offered as
the player-2 mover's own line), pin-branch-invariance-false, eval-42, eval-49.

**This is OI-184**, filed from the 2026-08-06 evaluation as *"the most severe defect found"* — a
factual-correctness failure, not a phrasing one. Its worked instance is board `315444233213`, where the
served text read *"You should have kept the double threat alive on the two finish squares your opponent
can still use later"*: the two squares `future:windows:c3r5,c7r1` share no 4-window containing a single
Green disc (`c5r3 = O(6)`, `c4r4 = O(12)` — two Gray, zero Green), so they are the **opponent's**
finishing squares handed to the learner as their own. OI-184 explicitly notes this is *"distinct from
OI-182's missing-pivot defect, and it may well survive the OI-182 fix — naming the pivot square does not
by itself fix whose threat it is."* Task 8 therefore does **not** subsume this task; both are needed.

**Files:**
- Modify: `connect-four/server/scripts/reason_engine/zoneAnnotations.mjs`
- Modify: `connect-four/server/tests/zoneAnnotations.test.mjs`

**Interfaces:**
- Produces: `halfOwner(half, side)` → `'you' | 'opp'`, used by both alias loops.

- [x] **Step 1: Write the failing test**

Append to `connect-four/server/tests/zoneAnnotations.test.mjs`:

```js
test('a denial half is offered as the OPPONENT geometry, not the player\'s own', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const { toNarratorVector, pruneVector } = await import('../scripts/reasonNarratorVector.mjs');
  const { boardSelectionDecisions } = await import('../scripts/reasonBoardSelect.mjs');
  const here = dirname(fileURLToPath(import.meta.url));
  const rows = readFileSync(join(here, '../scripts/reason_corpus/evidence.jsonl'), 'utf8')
    .trim().split('\n').map((l) => JSON.parse(l));

  const fv = pruneVector(toNarratorVector(rows.find((r) => r.id === 'pin-L2-enabled-opponent').evidence));
  assert.equal(fv.lostResource.kind, 'denial', 'fixture assumption: this half is a denial');
  const zones = buildAnnotationOffer(fv, boardSelectionDecisions(fv));
  for (const a of zones.aliases) {
    if (a.handle.startsWith('you-key')) {
      assert.fail(`denial geometry offered as the player's own: ${a.handle} = ${a.spec} (${a.role})`);
    }
  }
});
```

- [x] **Step 2: Run and confirm failure**

```bash
cd connect-four
node --test --experimental-test-module-mocks server/tests/zoneAnnotations.test.mjs
```

Expected: FAIL with `denial geometry offered as the player's own: you-key-line = …`.

- [x] **Step 3: Implement**

Add above `buildAnnotationOffer` in `zoneAnnotations.mjs`:

```js
// Which player does this half's GEOMETRY belong to? The half's position is not the answer: a
// `lostResource` whose kind is 'denial' or 'neutralization' describes the OPPONENT's line that the
// better move would have taken away, so offering it as "the line you are playing for" is board-false
// (measured: pin-L2, board 334 — the c2r1-c5r1 window holds two player-1 discs and none of player 2's,
// yet it was offered to the player-2 mover as their own). Only a half the mover would COMPLETE is
// theirs.
const OPPONENT_OWNED = new Set(['denial', 'neutralization']);
export function halfOwner(half, side) {
  const flipped = OPPONENT_OWNED.has(half?.kind);
  if (side === 'you') return flipped ? 'opp' : 'you';
  return flipped ? 'you' : 'opp';
}
```

Then in both loops replace the literal owner with the derived one — at `:128`:

```js
  for (const [half, side] of [[pruned.lostResource, 'you'], [pruned.opponentPunishment, 'opp']]) {
    if (!half || half.tacticTag !== 'double_threat' || !half.forkCells?.length) continue;
    const owner = halfOwner(half, side);
```

and at `:156` (the half-geometry loop), likewise deriving `const owner = halfOwner(half, side);` from
the loop's `side` before the `offers` array is built. Every `roleText(owner, …)` and
`` `${owner}-key-square` `` template then uses the derived value.

- [x] **Step 4: Run the gate**

```bash
cd connect-four && npm run test:fast 2>&1 | tail -8
```

Expected: `fail 0`. If a pre-existing zoneAnnotations assertion expects `you-key-line` on a denial
half, it encoded the bug — update it and note this task in a comment.

- [x] **Step 5: Commit**

```bash
git add connect-four/server/scripts/reason_engine/zoneAnnotations.mjs \
        connect-four/server/tests/zoneAnnotations.test.mjs
git commit -m "fix(058): alias owner derives from the half's kind, not its position (OI-184)"
```

---

## Task 8: Offer the fork PIVOT, not only the finishing squares

When the mechanism is a double threat, the explanation names the two finishing squares and never the
square that **creates** the fork — the only move a player could actually learn to see coming. The offer
set has no handle for it: `buildAnnotationOffer` offers `forkCells` (the endpoints) and `forkWindows`
(the lines), never the entry. Measured: 31 A7c failures; eval-18 (`c5r4` present in
`lostResource.anchorCells` and `line[]` ply 39, never offered), eval-22, eval-26, eval-30, eval-43.
This is OI-182.

**Files:**
- Modify: `connect-four/server/scripts/reason_engine/zoneAnnotations.mjs`
- Modify: `connect-four/server/scripts/renderReasonModel.mjs` (`deriveRequiredSet`)
- Modify: `connect-four/server/tests/zoneAnnotations.test.mjs`

**Two traps, both measured — do not shortcut either.**

**(a) `entryCell` is NOT the pivot.** The glossary defines it as "the square where this half's action
begins (**first move of `line`**…)" (`feature-vector-glossary.md:168`), and the engine sets
`entryCell: (walk.line && walk.line[0]) ? walk.line[0].cell : …` (`reasonEngine.mjs:646`) — the FIRST
ply. On eval-18 that is `c6r3`, while the fork-creating move is `c5r4` at ply 39 — opposite ends of a
28-ply line. Offering `entryCell` as "the square that creates the fork" would have the render layer
manufacture a false claim, which is the exact defect class this plan exists to remove.

**The correct derivation is the LAST ply of `line[]`.** On eval-18 `line[line.length-1]` is
`{ply:39, mover:1, col:4, cell:"c5r4"}` — the grader-identified pivot. The two `forkCells`
(`c5r5`, `c7r6`) do not appear in `line` at all (`findIndex` → −1): they are the gravity-next squares
directly above line cells, which is exactly why the last ply is what makes both live at once.
**Validated across the whole case space (I12): all 20 fork halves in the 63-record corpus have a
non-empty `line`, and for 20/20 the last ply is well-formed — never equal to a `forkCell`, never equal
to `entryCell`. Zero problem cases.**

**(b) `figure_7` is a fork too, and is currently excluded everywhere.** `TAG_PHRASE.figure_7` is
`'7-shaped double threat'` (`causalLinks.mjs:40`), but all three fork branches in
`zoneAnnotations.mjs` gate on `tacticTag !== 'double_threat'` (`:129`, `:167`, `:175`), so a `figure_7`
half gets **no fork alias of any kind**. 6 of the 20 fork halves in the corpus are `figure_7`
(including eval-12). Fix this with the same constant rather than leaving half the forks dark.

**Interfaces:**
- Consumes: `halfOwner(half, side)` from Task 7.
- Produces: `FORK_TAGS` (a `Set`), `forkPivotCell(half)` → `string | null`, and alias handle
  `<owner>-fork-pivot`.

- [x] **Step 1: Write the failing test**

Append to `connect-four/server/tests/zoneAnnotations.test.mjs`:

```js
test('a double_threat half offers the fork PIVOT, distinct from the finishing squares', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const { toNarratorVector, pruneVector } = await import('../scripts/reasonNarratorVector.mjs');
  const { boardSelectionDecisions } = await import('../scripts/reasonBoardSelect.mjs');
  const here = dirname(fileURLToPath(import.meta.url));
  const rows = readFileSync(join(here, '../scripts/reason_corpus/evidence.jsonl'), 'utf8')
    .trim().split('\n').map((l) => JSON.parse(l));

  const fv = pruneVector(toNarratorVector(rows.find((r) => r.id === 'eval-18').evidence));
  const half = fv.lostResource;
  // Harvested, not assumed — printed from the corpus on 2026-08-11:
  //   tacticTag 'double_threat', forkCells ["c5r5","c7r6"], entryCell 'c6r3',
  //   line.length 28, line[27] = {ply:39, mover:1, col:4, cell:'c5r4'}
  assert.equal(half.tacticTag, 'double_threat');
  assert.deepEqual(half.forkCells, ['c5r5', 'c7r6']);

  const zones = buildAnnotationOffer(fv, boardSelectionDecisions(fv));
  const pivot = zones.aliases.find((a) => a.handle.endsWith('-fork-pivot'));
  assert.ok(pivot, `no fork-pivot alias offered; got ${zones.aliases.map((a) => a.handle).join(', ')}`);
  assert.match(pivot.spec, /c5r4$/, 'the pivot is the LAST ply of line[], not entryCell');
  assert.doesNotMatch(pivot.spec, /c6r3/, 'c6r3 is entryCell (line[0]) — the wrong end of the line');
  assert.match(pivot.role, /creates|makes both/i);
  assert.ok(!half.forkCells.includes(pivot.spec.replace('future:', '')),
    'the pivot must be distinct from the finishing squares');
});

test('a figure_7 half also gets fork aliases (it is a 7-shaped double threat)', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const { toNarratorVector, pruneVector } = await import('../scripts/reasonNarratorVector.mjs');
  const { boardSelectionDecisions } = await import('../scripts/reasonBoardSelect.mjs');
  const here = dirname(fileURLToPath(import.meta.url));
  const rows = readFileSync(join(here, '../scripts/reason_corpus/evidence.jsonl'), 'utf8')
    .trim().split('\n').map((l) => JSON.parse(l));

  // eval-12's lostResource is tacticTag 'figure_7', forkCells ["c2r5"] (harvested 2026-08-11).
  const fv = pruneVector(toNarratorVector(rows.find((r) => r.id === 'eval-12').evidence));
  assert.equal(fv.lostResource.tacticTag, 'figure_7');
  const zones = buildAnnotationOffer(fv, boardSelectionDecisions(fv));
  assert.ok(zones.aliases.some((a) => /fork/.test(a.handle)),
    `figure_7 fork got no fork alias; handles: ${zones.aliases.map((a) => a.handle).join(', ')}`);
});
```

- [x] **Step 2: Run and confirm failure**

```bash
cd connect-four
node --test --experimental-test-module-mocks server/tests/zoneAnnotations.test.mjs
```

Expected: FAIL — `no fork-pivot alias offered`.

- [x] **Step 3: Implement**

Add a role branch in `roleText` (`:49-61`), before the `major` fallback:

```js
  if (kind === 'fork-pivot') return `the square ${who} plays to CREATE the fork — the move that makes both winning squares live at once; it matters later, once the forced sequence reaches it`;
```

Add the shared fork predicate and the pivot derivation near the top of `zoneAnnotations.mjs`, then
replace the three `tacticTag === 'double_threat'` gates (`:129`, `:167`, `:175`) with `FORK_TAGS.has(...)`:

```js
// Both tags are forks — figure_7's canonical phrase is literally '7-shaped double threat'
// (causalLinks.mjs TAG_PHRASE). All three fork branches below previously gated on 'double_threat'
// alone, so a figure_7 half got no fork alias at all (6 of the 20 fork halves in the corpus).
const FORK_TAGS = new Set(['double_threat', 'figure_7']);

// The square that CREATES the fork = the LAST ply of the half's own line. NOT `entryCell`, which the
// glossary defines as the FIRST move of `line` (feature-vector-glossary.md:168, reasonEngine.mjs:646)
// — the opposite end. On eval-18 entryCell is c6r3 (ply 1 of 28) while the fork is created at c5r4
// (ply 39); the two forkCells c5r5/c7r6 never appear in `line` at all, because they are the
// gravity-next squares above it, which is precisely why the last ply makes both live at once.
// Validated over the full case space: 20/20 fork halves in the corpus have a non-empty `line` whose
// last ply is neither a forkCell nor entryCell.
export function forkPivotCell(half) {
  if (!half || !FORK_TAGS.has(half.tacticTag)) return null;
  const line = half.line;
  if (!Array.isArray(line) || !line.length) return null;      // abstain, never guess (I2)
  const cell = line[line.length - 1]?.cell ?? null;
  if (!cell || (half.forkCells ?? []).includes(cell)) return null;
  return cell;
}
```

In the half-geometry loop (`:162-177`), add the pivot to `offers` alongside the fork cells:

```js
    // The fork PIVOT (OI-182). forkCells are the squares the fork FINISHES on; the pivot is the move
    // that creates it — the only part a player can learn to see coming. Offered separately so an
    // explanation can name the cause, not just the effects.
    const pivot = forkPivotCell(half);
    if (pivot) offers.push([`${owner}-fork-pivot`, pivot, 'fork-pivot']);
```

Then make it enforceable. In `renderReasonModel.mjs`, `deriveRequiredSet` currently fills cell slots
via `halfForkCellsSpec(h) ?? denialCell(h)` (`:166`). Import `forkPivotCell` alongside the existing
`buildAnnotationOffer` import and add a pivot loop AFTER the cell loop and BEFORE the line/window slot,
so a fork case spends its three capped slots on {fork cells, pivot, line} in that priority:

```js
  // The fork pivot earns a slot when the half is a fork: naming both endpoints without the move that
  // creates them is the A7c failure (OI-182) — the endpoints are the effect, the pivot is the cause.
  for (const half of HALVES) {
    if (groups.length >= 3) break;
    push(half, forkPivotCell(pruned?.[half]));
  }
```

`push` already abstains on a null spec and drops a spec with no matching offered alias
(`required ⊆ offered`, FR-004), so no extra guard is needed here.

Place this loop AFTER the existing cell loop and BEFORE the line/window slot, so a fork case spends its
slots on {fork cells, pivot, line} in that priority.

- [x] **Step 4: Run the gate**

```bash
cd connect-four && npm run test:fast 2>&1 | tail -8
```

Expected: `fail 0`. `renderCoverageCorpus.test.mjs` may assert requiredSet sizes — a fork record
gaining a group is the intended change; update the expectation with a comment naming OI-182.

- [x] **Step 5: Commit**

```bash
git add connect-four/server/scripts/reason_engine/zoneAnnotations.mjs \
        connect-four/server/scripts/renderReasonModel.mjs \
        connect-four/server/tests/zoneAnnotations.test.mjs
git commit -m "fix(058): offer and require the fork pivot, not just its finishing squares (OI-182)"
```

---

## Task 9: An unoffered tag is recorded as a repair, not silently dropped

`dropUnoffered` (`zoneAnnotations.mjs:254-257`) strips a `[zone:x]`/`[term:x]` whose id was never
offered and keeps the inner text — but records nothing. `stripUnclosedTags` right below it DOES record
`unclosed_tag:<kind>:<id>`. So a model that invents a slug produces an empty `annotationRepairs`, the
G7 grader's auto-fail never fires, and the defect is invisible downstream. Measured: eval-1 run 0
emitted `[term:central]` with zero terms offered and `annotationRepairs === []`; also eval-13, eval-23.

**Files:**
- Modify: `connect-four/server/scripts/reason_engine/zoneAnnotations.mjs`
- Modify: `connect-four/server/tests/zoneAnnotations.test.mjs`

**Interfaces:**
- Produces: `processAnnotations(...).repairs` now also contains `unoffered_zone:<handle>` /
  `unoffered_term:<slug>` entries. `mechanism`, `keyCells`, `zonesEmitted`, `usedSpecs` are unchanged.

- [x] **Step 1: Write the failing test**

Append to `connect-four/server/tests/zoneAnnotations.test.mjs`:

```js
test('an unoffered term is stripped AND recorded as a repair', () => {
  const zones = { aliases: [{ handle: 'better-col', spec: 'col4' }], terms: [] };
  const out = processAnnotations('Play [term:central]the middle[/term:central] instead.', zones);
  assert.equal(out.mechanism, 'Play the middle instead.');       // inner text kept, tag gone
  assert.ok(out.repairs.includes('unoffered_term:central'),
    `unoffered slug not recorded; repairs=${JSON.stringify(out.repairs)}`);
});

test('an unoffered zone handle is stripped AND recorded', () => {
  const zones = { aliases: [{ handle: 'better-col', spec: 'col4' }], terms: [] };
  const out = processAnnotations('Take [zone:made-up]that square[/zone:made-up].', zones);
  assert.ok(out.repairs.includes('unoffered_zone:made-up'));
});

test('an OFFERED tag produces no repair', () => {
  const zones = { aliases: [{ handle: 'better-col', spec: 'col4' }], terms: [] };
  const out = processAnnotations('Play [zone:better-col]column 4[/zone:better-col].', zones);
  assert.deepEqual(out.repairs, []);
  assert.ok(out.mechanism.includes('[zone:col4]'));              // handle expanded to its real spec
});
```

- [x] **Step 2: Run and confirm failure**

```bash
cd connect-four
node --test --experimental-test-module-mocks server/tests/zoneAnnotations.test.mjs
```

Expected: the first two FAIL on the missing repair entry; the third PASSES already.

- [x] **Step 3: Implement**

Change `dropUnoffered` to collect, and thread its output through `processAnnotations`:

```js
// Strip a [kind:X]…[/kind:X] wrapper whose X is not in `allowed`, keeping the inner text, and RECORD
// each removal. Without the record an invented slug is invisible: annotationRepairs stayed [] while
// the model emitted [term:central] against an empty term vocabulary (measured, eval-1 run 0), so G7's
// auto-fail never fired and nothing downstream could see the defect.
function dropUnoffered(text, kind, allowed) {
  const RE = new RegExp(`\\[${kind}:([^\\]!]+)\\](.*?)\\[/${kind}:\\1\\]`, 'gs');
  const repairs = [];
  const out = text.replace(RE, (whole, id, inner) => {
    if (allowed.has(id)) return whole;
    repairs.push(`unoffered_${kind}:${id}`);
    return inner;
  });
  return { text: out, repairs };
}
```

In `processAnnotations` (`:301-332`), replace the two calls and seed `repairs` from them:

```js
  let text = normalizeAnnotationTags(mechanism ?? '');
  const repairs = [];
  for (const [kind, allowed] of [['zone', handles], ['term', slugs]]) {
    const dropped = dropUnoffered(text, kind, allowed);
    text = dropped.text;
    repairs.push(...dropped.repairs);
  }
```

and delete the now-duplicated `const repairs = [];` further down, keeping the `stripUnclosedTags` loop
that pushes into the same array.

- [x] **Step 4: Run the gate**

```bash
cd connect-four && npm run test:fast 2>&1 | tail -8
```

Expected: `fail 0`.

- [x] **Step 5: Commit**

```bash
git add connect-four/server/scripts/reason_engine/zoneAnnotations.mjs \
        connect-four/server/tests/zoneAnnotations.test.mjs
git commit -m "fix(058): record unoffered zone/term tags as repairs so G7 can see them"
```

---

---

## Task 9b: Stop displaying term slugs the prompt does not offer

**The strongest new finding from the arm-1 baseline, and it is model-independent.** The prompt shows
raw tag slugs (`double_threat`, `figure_7`, `immediate_threat`, `claimeven`) in the rendered Tactics
lines, in half fields, and in the worked example — while `render_decision.zones.terms` may be empty.
The model then uses the vocabulary it was shown, and the pipeline strips it as unoffered.

Measured over 125 runs, splitting on whether the assembled prompt displays a slug it does not offer:

| prompt displays an unoffered slug | G7b pass |
|---|---|
| yes | 74/90 (82%) |
| **no** | **35/35 (100%)** |

**Every G7b failure falls in the "taught but not offered" condition; there are zero failures without
it.** On `pin-L2-enabled-opponent` the `double_threat` slug reaches the model three times against an
empty `zones.terms`, and it emits `[term:double_threat]` on **5/5 runs**. This is not model
misbehaviour to instruct away — the prompt creates the failure.

**Files:** Modify `connect-four/server/scripts/renderReasonModel.mjs` (`assembleGroundedPrompt`);
modify `connect-four/server/tests/renderReasonModel.test.mjs`.

- [x] **Step 1: Write the failing test** — assert the invariant directly over the corpus: for every
      record, no slug in `TERM_KB` may appear anywhere in `assembleGroundedPrompt(...)` unless it is in
      that record's `zones.terms`. Use `pin-L2-enabled-opponent` as the named regression case.
- [x] **Step 2: Run it; confirm it fails** naming `double_threat` on `pin-L2-enabled-opponent`.
- [x] **Step 3: Implement.** Render tactic names through `TAG_PHRASE` (the canonical plain-language
      phrase, already the single source of truth in `causalLinks.mjs`) instead of the raw slug wherever
      the slug is not offered — the Tactics list, the half fields, and the worked example. Do NOT
      instead widen `zones.terms`: a term with no KB entry renders an empty popup, which is why
      `conditional_swindle` is deliberately absent from `TERM_KB`.
- [x] **Step 4: `npm run test:fast`** — expect `fail 0`.
- [x] **Step 5: Commit** `fix(058): never display a term slug the prompt does not offer`.

---

## Task 9c: L4 carries the hold-the-line guardrail for `lose_to_faster_lose`

`causalLinks.mjs` gates its hold-the-line framing ("both moves lose, but the better one makes the
opponent work hardest; do NOT tell the player they are lost") on **L3**, whose `when` is case-gated to
`lose_to_faster_lose`. **L4's `when` has no case gate** — `route === 'realized_denied' && direction ===
'defensive_miss'` — so a `lose_to_faster_lose` board routed to L4 gets a bare missed-defense framing
with no reframe. Measured on `eval-39`: 5/5 runs, deterministic. Board `2152254` confirms the case
(col4 `scr=-3`, every other column `-17`).

**Files:** Modify `causalLinks.mjs` (L4 `guardrail`/`template`); modify
`connect-four/server/tests/causalLinksComposers.test.mjs`.

- [x] **Step 1: Write the failing test** — `classifyById('eval-39')` returns `link.id === 'L4'` and its
      `guardrail` must match `/toughest|work hardest/i` and must NOT permit "you are lost" framing.
- [x] **Step 2: Run it; confirm it fails** (L4's guardrail carries no such text today).
- [x] **Step 3: Implement** — append the same case-gated hold-the-line clause L3 uses when
      `fv.case === 'lose_to_faster_lose'`, leaving L4's wording unchanged for every other case.
- [x] **Step 4: `npm run test:fast`** — expect `fail 0`.
- [x] **Step 5: Commit** `fix(058): L4 gets L3's hold-the-line guardrail on lose_to_faster_lose`.

---

## Task 9d: Do not teach book-line vocabulary when the opening lead is null

`OPENING_READING_KEY` teaches "book line" vocabulary unconditionally, but
`render_decision.openingContext.lead` is null on records with no matched opening. Measured on
`eval-11`: 3/5 runs fabricate specific book-line adherence the record cannot support (A4/A7b).

**Files:** Modify `connect-four/server/scripts/renderReasonModel.mjs` (`OPENING_READING_KEY` /
its assembly); modify `connect-four/server/tests/renderReasonModel.test.mjs`.

- [x] **Step 1: Write the failing test** — for a record whose `openingContext` has no
      `namedOpening`/`defense` (O3 centrality branch, e.g. `eval-11`), the assembled prompt must NOT
      contain "book line" / "book move".
- [x] **Step 2: Run it; confirm it fails.**
- [x] **Step 3: Implement** — emit the book-line sentences of the opening reading key only when the
      frame is O1 (`namedOpening`) or O2 (`defense`); the O3 centrality frame gets the centrality and
      parity vocabulary only.
- [x] **Step 4: `npm run test:fast`** — expect `fail 0`.
- [x] **Step 5: Commit** `fix(058): opening reading key only teaches book lines when there is one`.


# PHASE C — Re-measure and gate

## Task 10: Re-measure the subset, then gate on a full-corpus sweep

- [x] **Step 1: Re-run the baseline and capability arms on the fixed code**

Byte-identical commands to Task 3 Steps 1–2 — same subset, same `--n`, same explicit `--model`:

```bash
cd connect-four
# baseline, production model
node server/scripts/compute.mjs \
  --input server/scripts/reason_corpus/boards_subset.jsonl \
  --out reason_evidence_subset.jsonl \
  --llm --condition D --n 5 --model gpt-5.4-mini
# capability, full model
node server/scripts/compute.mjs \
  --input server/scripts/reason_corpus/boards_subset.jsonl \
  --out reason_evidence_subset.jsonl \
  --llm --condition D --n 3 --model gpt-5.4
```

Do NOT change the subset — re-selecting after the fixes would select on post-fix outcomes. Do NOT drop
`--model`: an `.env` edit between Task 3 and here would otherwise swap the model underneath you and the
before/after comparison would be measuring two variables at once. Re-run the model-confirmation
one-liner on both files before grading.

- [x] **Step 2: Grade both arms**

```
/grade-fv-sufficiency <answers jsonl> --vectors ./connect-four/server/scripts/reason_corpus/evidence.jsonl
```

- [x] **Step 3: Compare per-run rates against the baseline**

Compare **per-run axis rates per stratum**, never case pass rates. Expected movements, each falsifiable:

| prediction | if it fails |
|---|---|
| A6 per-run failure on the **L5/L6/L9 boards** within the 13 mid/late subset boards (listed below — NOT the budget-arm list) drops from ~58% to near zero | the column was added to the template but the model still drops it — the naming hypothesis is wrong, and enforcement, not phrasing, is the lever |
| A6 on the **L1/L2/L4/L8 (parenthetical) boards stays flat at ~9%** | if it moves, something other than Task 4 affected A6 and the attribution is broken — these templates were deliberately left untouched as a control |
| A7 on opening boards moves from **deterministic**-fail toward **flaky**-fail | the merge did not give the model usable geometry — check the prompt directly, not the diff |
| A7c failures fall on fork boards | the pivot is offered but not obliged — check `requiredSet` membership |
| A3 is FLAT | expected, not a failure — A3 (18 blocking cases, the 3rd-worst axis, 27 per-run failures) is untouched by this plan; a flat result confirms nothing else moved, it does not indicate a regression |
| G2 is FLAT | expected, not a failure — G2 (12 blocking cases) is untouched by this plan for the same reason |
| the 5 passing controls still pass | a fix regressed a working board — bisect by task |

**A7 moving from deterministic to flaky is SUCCESS, not failure.** It means the model can now comply
and enforcement becomes the correct next lever. Do not read it as "still failing".

**The 13 mid/late boards the A6 row means** (`feature_vector.openingContext` absent — harvested
2026-08-11, do not re-derive from memory):

```
eval-32, eval-33, eval-34, eval-36, eval-37, eval-39, eval-41, eval-47, eval-50,
pin-L2-enabled-opponent, pin-L5-deep-fork,
pin-branch-invariance-true-1, pin-branch-invariance-true-2
```

**This is NOT the Task 3 Step 3 budget-arm list.** Both sets happen to contain 13 boards, which makes
the confusion easy and costly: the budget-arm list is the A7-**deterministic** set, and 9 of its 13
entries (eval-5, eval-6, eval-9, eval-11, eval-13, eval-16, eval-20, eval-21, pin-L9-hedged-parity) are
**opening** records — precisely the stratum this row exists to exclude. Reading A6 on the budget list
would measure the confounded boards and produce exactly the wrong conclusion. The subset's other 12
boards are opening records.

**The A6 row is scoped to mid/late boards on purpose, and that scoping is a constraint, not a
formatting choice.** Opening records also carry A6, but Task 4's prose-column rewrite and Task 6's
opening-merge land in the SAME pass, so an opening-board A6 movement cannot be attributed to either fix
individually — this round's opening-A6 numbers must be recorded for completeness but **must not be read
as evidence for or against the salience hypothesis**. This confound is accepted deliberately this round
(D2, OPTION 1: read A6 on mid/late only) rather than deferred.

**A3 and G2 are deliberately not targeted by this plan** (see Deferred section) — they are included in
this table only so a flat result reads as the expected, recorded outcome rather than as unexplained
noise.

**The 5 passing controls are a narrow regression guard — widen what you actually check.** Their links
are `L7, L2, L3, L3, L3`: they cover **none** of the 3 templates Task 4 now rewrites (L5, L6, L9) and no
opening record at all, so Task 6 — the largest and most self-described-revertible change in this plan —
has zero regression detector inside the frozen subset if only the 5 case-passes are checked. The
regression signal to actually read is the **per-run A3/A4/A5 rates on the 12 non-A7-deterministic
subset boards** (the 25-board subset minus the 13 boards in Task 3 Step 3's budget-arm list) — a
regression on an opening or L1/L4/L5/L6/L8/L9 board shows up there as a per-run rate drop even though
no case-pass control exists to catch it.

- [ ] **Step 4: Full-corpus sweep gate**

Only after the subset shows the predicted movement:

```bash
cd connect-four
node server/scripts/compute.mjs \
  --input server/scripts/reason_corpus/boards.jsonl \
  --out reason_evidence_boards.jsonl \
  --llm --condition D --n 3 --model gpt-5.4-mini
```

Production model, because this sweep asks "would this regress what we ship?".

Then grade it. This is the regression check the subset cannot provide — 38 of the 63 boards are outside
the subset and could regress unnoticed.

- [x] **Step 5: Write up and commit**

Update `docs/superpowers/plans/2026-08-11-baseline-numbers.md` with before/after per stratum, and record
in `docs/architecture/reason-DECISIONS.md` a new decision entry covering: the opening-merge reversal
(what it reverses, the `future:`-decorator bet, and the revert trigger), the prose-column rule for all
L1–L9 templates, and the owner-derivation rule. Append any deferred finding to `docs/open_issues.md`.

```bash
git add docs/ connect-four/server/scripts/reason_corpus/runs/
git commit -m "docs(058): render remediation results + D-log entries"
```

---

## Deferred, deliberately not in this plan

> **TRIGGER STATUS as of 2026-08-23 — three of these have FIRED.** Each bullet below carries a
> "revisit only if…" condition. Task 10 was the test. Results, measured on the final 25-board run:
>
> | deferral | its condition | measured | verdict |
> |---|---|---|---|
> | parenthetical → prose (L1/L2/L4/L8) | "fails materially above prose" | **16% fail vs 0%** mid/late (was 9% vs 0%) | ✅ **ACTED 2026-08-25** — converted |
> | retry / enforcement | "the flaky pile dominating" | **15 of 20 failing cases intermittent** | 🔴 **FIRED** |
> | A4 fabrication variance | "file as an open issue after Task 10" | A4 86→87→**81%** | 🔴 **NOT DONE — still owed** |
> | G5 board-truth overlay | independent; would confound | re-found as OI-188 / OI-195; `reasonBoardSelect.mjs` root cause not filed | 🟡 partial |
> | A3 | flat = expected | 90 → **98%** | 🟢 no action |
> | G2 | flat = expected | 86 → **91%** | 🟢 no action |
>
> The parenthetical bullet below argues `(col N)` costs "~3 runs in 32" and that keeping it preserves a
> control group. The control group worked — and returned the **opposite** answer: it now costs 7 of 45
> mid/late runs against 0 of 15 for prose. Read that bullet as superseded.


- **A4 fabrication variance (75% flaky).** The same board sometimes ships a false statement. That is a
  reliability floor rather than a pass-rate issue, and the right place to catch it is the annotation
  gate, not the prompt. File as an open issue after Task 10.
- **The G5 board-truth overlay defect** (pin-L1, pin-L2: the decision board's Tactics list asserts a
  `double_threat` that is only true on the after-best board). Real, but it lives in
  `reasonBoardSelect.mjs`'s `patternOpts` overlay, is independent of everything above, and would
  confound the measurement if landed in the same pass.
- **The parenthetical → prose rewrite of L1, L2, L4, L8.** Measured as SERVED, `(col N)` fails A6 on
  only 9% of mid/late runs against 0% for prose — ~3 runs in 32. Rewriting four working templates and
  re-pointing three passing assertions for that is poor value, and keeping them untouched preserves a
  control group: if A6 moves on L5/L6/L9 while L1/L2/L4/L8 stay flat, the fix is attributable. Revisit
  only if Task 10 shows the parenthetical group failing materially above prose.
- **Retry / enforcement changes.** The eval is deliberately single-attempt, so one attempt must
  suffice. Revisit only if Task 10 shows the flaky pile dominating.
- **A3 (18 blocking cases).** The 3rd-worst axis by blocking-case count (27 per-run failures), and
  entirely untouched by the five fixes in this plan. Named explicitly here — rather than omitted — so
  a flat A3 result at Task 10 reads as the expected, recorded outcome of a deliberate deferral, not as
  unexplained noise or a missed fix.
- **G2 (12 blocking cases).** Same treatment: untouched by this plan, named explicitly so a flat result
  at Task 10 is read correctly.
