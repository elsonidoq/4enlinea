# Deep-Reveal Grounding — Feedback Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the seven still-broken human-feedback asks (1b, 1c, 2a, 2b, 2c, 4a, 4b) on the four
spec-058 staging boards by widening what `buildAnnotationOffer` offers the coach, un-deadening one
misspelled field read, and fixing a real signature bug in `checkP5Strong`.

**Architecture:** Five surgical changes, all in the condition-D grounded render path. (1) A
signature bug in `checkP5Strong` makes a multi-line `windows:A|B` spec reject *its own* offered
alias — fixed first because it blocks everything multi-line. (2) `half.tag` is a field that does
not exist (the field is `tacticTag`); two production sites read it and both are dead. (3) Structural
`major`/`immediate` tags gain a parallel `lineWindow` field so the *line* they complete becomes
highlightable, sourced from the existing `findMajorThreatWindows` — `getMajorThreatCells` is NOT
touched. (4) A fourth offer family exposes each causal half's own `completingCell`, `window`,
`forkWindows` and individual `forkCells`, `future:`-prefixed whenever the half's register is deep.
(5) One lookup normalization in `deriveRequiredSet` lets a `future:`-prefixed alias satisfy a
derived plain cell — which turns the required set non-empty on three of the four boards *without
touching the Derivation Rule itself*.

**Tech Stack:** Node.js ESM (`"type": "module"` — `connect-four/package.json:4`), `node:test` +
`node:assert/strict`, ESLint flat config. No new dependencies.

## Global Constraints

- **Work only in** `/Users/elsonidoq/prog/cuatro_en_linea/.claude/worktrees/deep-reveal-grounding`.
  A sibling MAIN checkout exists at `/Users/elsonidoq/prog/cuatro_en_linea/connect-four` and the
  files **differ**. Always use absolute paths into the worktree.
- **Ports:** `eval "$(./worktree-ports.sh)"` from the repo root → `$API_PORT`=4499, `$VITE_PORT`=6499.
  Servers are already running; reuse them. Never `pkill node`.
- **Never run bare `npm test`** (the solver test hangs 10+ minutes). The gate is
  `npm run test:fast` from `connect-four/`, which runs `eslint .` first — an ESLint **error** means
  zero tests run.
- **Baselines that must not regress:** `test:fast` **1871 tests / 1871 pass / 0 fail**;
  `test:dom` **72 tests / 72 pass / 0 fail** (both measured on a clean tree, 2026-08-05). A test
  *count* going DOWN is as bad as a failure. New tests may raise the count.
- **Coordinates:** movestring digits and all internal coords are **0-indexed** (row 0 = bottom,
  col 0 = leftmost). The `cNrM` display notation is **1-indexed**. `c1r1` = bottom-left.
- **Solver:** `computeReason(movestring, playedCol, { solver })` takes an **options object** third
  arg. `createSolverProcess()` returns a handle with `.destroy()` (NOT `.kill()`) — wrap in
  `try/finally` or the process hangs.
- **Inline Node scripts** need ABSOLUTE imports and must run with cwd inside `connect-four/`.
  `.env` is at `connect-four/server/.env`.
- **Do not commit** unless the task's own commit step says so; the repo owner commits WIP himself
  and a background process auto-commits STAGED work. Stage explicit paths, never `git add -A`.

## Mandatory reads before starting

In this order: `docs/architecture/reason-INVARIANTS.md`, `reason-DECISIONS.md`,
`reason-case-taxonomy.md`, `blunder-reason-evidence.md`, then
`docs/architecture/reason-render-grounded-prompt.md` §11, then
`specs/058-deep-reveal-grounding/spec.md` (FR-001…FR-016; SC-006 must not be violated).

## The four feedback boards (movestring, playedCol — 0-indexed)

| # | movestring | playedCol |
|---|---|---|
| 1 | `3154` | 4 |
| 2 | `315444233213` | 1 |
| 3 | `315444233213134122` | 5 |
| 4 | `3154442332131341225551` | 5 |

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `connect-four/server/annotationGate.js` | `checkP5Strong` window-signature fix | 1 |
| `connect-four/tests/annotationGate.test.js` | RC-F regression test | 1 |
| `connect-four/server/scripts/reason_engine/zoneAnnotations.mjs` | term site fix; line aliases; fourth offer family; `openingHorizon` opt | 2, 3, 4 |
| `connect-four/server/tests/zoneAnnotations.test.mjs` | dead-name fixture fix; new offer-family tests | 2, 3, 4 |
| `connect-four/server/scripts/reasonBoardTags.mjs` | `lineWindow` on major/immediate tags | 3 |
| `connect-four/server/scripts/renderReasonModel.mjs` | `future:` unprefix in `deriveRequiredSet`; thread `openingHorizon` | 4, 5 |
| `connect-four/server/tests/renderReasonModel.test.mjs` | superseded invariant; NV fixture expectations | 4, 5 |
| `connect-four/server/tests/mechanismExplainer.test.mjs` | fixture updates (requiredSet grew) | 4 |
| `docs/architecture/reason-DECISIONS.md` | D43 (supersedes the `future:`-never-required invariant) | 5 |
| `docs/architecture/reason-render-grounded-prompt.md` | §11a/§11b + new §11c | 6 |
| `specs/058-deep-reveal-grounding/data-model.md` | §1 offered-handle shape | 6 |
| `docs/open_issues.md` | OI-171 resolved, OI-172 resolved, OI-175 new | 6 |
| `docs/deployment_steps.md` | append-only note | 6 |

**Not touched, deliberately:** `connect-four/server/classifier.js` (`getMajorThreatCells` keeps its
return shape — see Task 3), `connect-four/server/reasonRenderGuard.mjs` (`toAllowedSet` keeps
Decision A — see Task 4 Step 6), `connect-four/src/lib/annotatedText.js` (already handles both
`future:` and multi-window `|` — verified, see Task 4).

---

## Evidence this plan rests on (all re-verified at source, 2026-08-05)

**RC-F — `checkP5Strong` splits a windows signature on `,` only.**
`connect-four/server/annotationGate.js:418`, verbatim:
```js
      const sig = windowsMatch[1].split(',').map(p => p.trim()).sort().join(',');
```
while `expandSpec` (`connect-four/server/zoneParser.js:123`) splits on `|` first:
```js
    for (const windowStr of windowsMatch[1].split('|')) {
```
and dedupes (`zoneParser.js:130-131`). Measured round-trip through the real production pair
(`toAllowedSet` → `checkP5Strong`):
```
"future:windows:c5r3,c4r4,c3r5,c2r6|c2r5,c3r5,c4r5,c5r5" -> allowedSet [{"cells":["c5r3","c4r4","c3r5","c2r6","c2r5","c4r5","c5r5"],"windowOnly":true}]
   checkP5Strong: ["P5strong:cell_not_allowed:future:windows:c5r3,c4r4,c3r5,c2r6|c2r5,c3r5,c4r5,c5r5"]
"future:windows:c2r6,c5r5" -> allowedSet [{"cells":["c2r6","c5r5"],"windowOnly":true}]
   checkP5Strong: []
```
A multi-line spec is offered-then-rejected by its own allowed set. A single window round-trips.

**RC-C — `half.tag` does not exist.** `Object.keys(half)` measured on board 4's
`opponentPunishment` (real `computeReason` output):
```
kind,register,completingCell,window,pliesToEnd,line,finalMovestring,entryCell,terminal,forkCase,forkCells,forkWindows,tacticTag,tacticCells,tacticFromDiff,tie
```
Two production reads of the non-existent field:
- `connect-four/server/scripts/reasonBoardSelect.mjs:32` (`namedPatternOpts`), verbatim:
  ```js
    if (half && FORK_TAGS.has(half.tag) && half.completingCell) {
  ```
- `connect-four/server/scripts/reason_engine/zoneAnnotations.mjs:123`, verbatim:
  ```js
    if (half?.tag && TERM_KB[half.tag]) fired.add(half.tag);   // figure_7 fires here even though its
  ```
Measured `terms` per board on a clean tree: case 1 `[]`, case 2 `[]`, case 3 `[]`, case 4
`["double_threat"]` (that one comes from the structural `kind:'double'` board tag, not from a half).

**The required-set / `future:` interaction (the spine of this plan).**
`deriveRequiredSet` (`connect-four/server/scripts/renderReasonModel.mjs:109-131`), verbatim
lines 110 and 116-119:
```js
  const aliasBySpec = new Map((zones?.aliases ?? []).map((a) => [a.spec, a]));
```
```js
    const spec = cell ?? (Array.isArray(h.window) && h.window.length ? 'windows:' + h.window.join(',') : null);
    if (!spec) continue; // neither a cell nor a window — abstain, do not invent (FR-006)
    const alias = aliasBySpec.get(spec);
    if (!alias) continue; // match failure — drop, required ⊆ offered (FR-004)
```
with `denialCell` (`connect-four/server/scripts/reason_engine/causalLinks.mjs:25`), verbatim:
```js
export const denialCell = (h) => h?.cell ?? h?.completingCell ?? null;
```
Every half in all four boards has a `completingCell`, so `spec` always resolves to that cell and
the `window` branch is dead. Measured `requiredSet` on a clean tree: case 1 `[]`, case 2 `[]`,
case 3 `[{spec:'c1r3', handle:'you-major'}]`, case 4 `[]`.

**Measured counterfactual (the experiment this plan is built on).** With the Task-4 offer family
added but `deriveRequiredSet` UNCHANGED, all four required sets were **still** `[]` — because the
new deep aliases carry a `future:` prefix and `aliasBySpec` keys on the raw string. Adding the
one-line unprefix (Task 5) produced:
```
case 1: [future:c7r3 (you-key-square), future:c6r4 (opp-key-square)]
case 2: [future:c5r5 (you-key-square), future:c3r5 (opp-key-square)]
case 3: [c1r3 (you-major)]                      <-- unchanged, no regression
case 4: [future:c7r3 (you-key-square), future:c2r6 (opp-key-square)]
```

**Decision A does NOT need to change.** OI-172's two measured rejections on board 4 are exactly
`c2r6` and `c5r5`, both rejected because they were offered *only* inside
`future:windows:c2r6,c5r5` (a `windowOnly` entry). Measured with per-fork-cell singles added to the
offer set and `toAllowedSet`/`checkP5Strong` otherwise **unchanged**:
```
c2r6           []
c5r5           []
future:c2r6    []
future:c5r5    []
c7r1           ["P5strong:cell_not_allowed:c7r1"]   <-- ungrounded control still rejected
c4r6           ["P5strong:cell_not_allowed:c4r6"]   <-- window member never offered standalone: still rejected
```
So OI-172 closes as a side effect, with Decision A's semantics fully intact.

**RC-G (render constraint, no code change).** `parseAnnotatedText`'s `combinedRegex`
(`connect-four/src/lib/annotatedText.js`) is single-pass and non-nesting, so a `[term:]` and a
`[zone:]` can never wrap the same phrase. The prompt already forbids this —
`renderReasonModel.mjs:361-362`, verbatim: `'Do not overlap a '` + `'highlight and a term on the same
words.'` No change needed; ask 2c is closed by adjacency (a `[term:double_threat]` phrase next to a
separate `[zone:opp-key-square]` phrase).

---

## Task 1: Fix `checkP5Strong`'s multi-window signature (RC-F)

**Files:**
- Modify: `connect-four/server/annotationGate.js` (symbol `checkP5Strong`, the `windows:` branch, ~line 416)
- Test: `connect-four/tests/annotationGate.test.js`

**Interfaces:**
- Consumes: `toAllowedSet(aliases)` from `connect-four/server/reasonRenderGuard.mjs` — returns
  `Array<{cells: string[], windowOnly?: true} | {col: number}>`.
- Produces: `checkP5Strong(zones, allowedSet) -> string[]` (unchanged signature) that now accepts a
  multi-window `windows:A|B` spec whose flattened, deduped cell set equals an offered `windowOnly`
  entry's cells.

- [ ] **Step 1: Write the failing test**

Append to `connect-four/tests/annotationGate.test.js` (it already imports `checkP5Strong`; verify
the import line and add `toAllowedSet` from `../server/reasonRenderGuard.mjs` if not present):

```js
test('checkP5Strong: a multi-window windows:A|B spec matches its OWN offered alias (RC-F)', () => {
  // Harvested from board 3154442332131341225551 played col 5 (opponentPunishment.forkWindows).
  const spec = 'future:windows:c5r3,c4r4,c3r5,c2r6|c2r5,c3r5,c4r5,c5r5';
  const allowedSet = toAllowedSet([{ spec }]);
  // toAllowedSet flattens+dedupes via expandSpec (7 cells, c3r5 appears in both windows).
  assert.deepEqual(allowedSet, [{
    cells: ['c5r3', 'c4r4', 'c3r5', 'c2r6', 'c2r5', 'c4r5', 'c5r5'], windowOnly: true,
  }]);
  assert.deepEqual(checkP5Strong([{ spec, innerText: 'the two lines' }], allowedSet), []);
});

test('checkP5Strong: a single-window windows: spec still matches exactly (no regression)', () => {
  const spec = 'future:windows:c2r6,c5r5';
  const allowedSet = toAllowedSet([{ spec }]);
  assert.deepEqual(checkP5Strong([{ spec, innerText: 'x' }], allowedSet), []);
});

test('checkP5Strong: a windows: spec NOT offered is still rejected', () => {
  const allowedSet = toAllowedSet([{ spec: 'future:windows:c2r6,c5r5' }]);
  assert.deepEqual(
    checkP5Strong([{ spec: 'windows:c7r1,c7r2,c7r3,c7r4', innerText: 'x' }], allowedSet),
    ['P5strong:cell_not_allowed:windows:c7r1,c7r2,c7r3,c7r4']);
});
```

- [ ] **Step 2: Run it and confirm the first test FAILS for the right reason**

From `connect-four/`:
```bash
node --test --experimental-test-module-mocks tests/annotationGate.test.js 2>&1 | grep -E "not ok|^ℹ (pass|fail)"
```
Expected: the multi-window test FAILS with actual
`["P5strong:cell_not_allowed:future:windows:c5r3,c4r4,c3r5,c2r6|c2r5,c3r5,c4r5,c5r5"]` vs expected
`[]`. The other two PASS. If the multi-window test passes, STOP — the bug is already fixed and this
plan's premise is stale.

- [ ] **Step 3: Apply the fix**

In `connect-four/server/annotationGate.js`, symbol `checkP5Strong`, the `windows:` branch. Replace
this exact line:
```js
      const sig = windowsMatch[1].split(',').map(p => p.trim()).sort().join(',');
```
with:
```js
      // Split on BOTH separators and dedupe, mirroring expandSpec (zoneParser.js) — which splits on
      // '|' then ',' and dedupes — so the signature computed here equals the one toAllowedSet built
      // from expandSpec's output. Splitting on ',' alone made a multi-line `windows:A|B` spec reject
      // its OWN offered alias (the last cell of A fused with the first cell of B).
      const sig = [...new Set(windowsMatch[1].split(/[|,]/).map(p => p.trim()).filter(Boolean))].sort().join(',');
```

- [ ] **Step 4: Re-run and confirm all three pass**

```bash
node --test --experimental-test-module-mocks tests/annotationGate.test.js 2>&1 | grep -E "^ℹ (tests|pass|fail)"
```
Expected: `fail 0`.

- [ ] **Step 5: Full gate**

```bash
npm run test:fast 2>&1 | grep -E "^ℹ (tests|pass|fail)"
```
Expected: `fail 0`, `tests` ≥ 1874 (1871 + the 3 new).

- [ ] **Step 6: Commit**

```bash
git add connect-four/server/annotationGate.js connect-four/tests/annotationGate.test.js
git commit -m "fix(058): checkP5Strong rejected multi-window windows:A|B specs it had itself offered

The signature was built by splitting on ',' only, while expandSpec (and therefore
toAllowedSet) splits on '|' first and dedupes. A two-window fork spec was offered
and then rejected by its own allowed set. Split on both separators and dedupe.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Un-dead the half-tag term read (RC-C), and fix the fixture that hid it

**Files:**
- Modify: `connect-four/server/scripts/reason_engine/zoneAnnotations.mjs` (symbol `buildAnnotationOffer`, the "Fired term vocabulary" block, ~line 123)
- Modify: `connect-four/server/tests/zoneAnnotations.test.mjs` (test at line 113)

**Interfaces:**
- Consumes: nothing new.
- Produces: `buildAnnotationOffer(...).terms` now fires a slug from a half whose `tacticTag` is one
  of `TERM_KB`'s four KB-backed slugs (`immediate_threat`, `double_threat`, `figure_7`, `claimeven`).

**Deliberate scope decision — DO NOT also fix `namedPatternOpts`.** The second `half.tag` read is
`connect-four/server/scripts/reasonBoardSelect.mjs:32` (`namedPatternOpts`). Fixing it would make
`tagBoard`'s named-pattern overlay live for the first time, injecting a `figure_7`/`double_threat`
tag onto the **decision** board — which `renderThreatList` then prints as a present tactic on a
board where the resource completes many plies away. That is precisely the "eval-3 present-threat
trap" the `STRUCTURAL` exclusion exists to prevent; `zoneAnnotations.mjs:14-19` says so verbatim:
```
// OVERLAY kinds (figure_7 / double_threat, injected onto the DECISION board by reasonBoardSelect.mjs's
// patternOpts) are deliberately EXCLUDED: they often name a resource that completes deep, and
// highlighting a deep, currently-empty square is exactly the eval-3 present-threat trap decision #5
// forbids.
```
None of the seven feedback asks needs it. Leave it dead and file OI-175 (Task 6).

- [ ] **Step 1: Write the failing test**

In `connect-four/server/tests/zoneAnnotations.test.mjs`, the test at line 113
(`'terms: KB-backed slugs only, canonicalPhrase from TAG_PHRASE, conditional_swindle never a term'`)
currently builds its fixture with the **dead** field name — that is why it was green while
production read nothing. Change the fixture line from:
```js
    { bestCol: 2, playedCol: 3, lostResource: { kind: 'conditional_swindle' }, opponentPunishment: { tag: 'figure_7' } },
```
to:
```js
    { bestCol: 2, playedCol: 3, lostResource: { kind: 'conditional_swindle' }, opponentPunishment: { tacticTag: 'figure_7' } },
```
and change the assertion message on the next-but-one line from
`'figure_7 fired via opponentPunishment.tag'` to
`'figure_7 fired via opponentPunishment.tacticTag (the real field name; `tag` never existed)'`.

Then ADD this new test immediately after it:

```js
test('terms fire from a half tacticTag — measured on the spec-058 feedback board 2 (RC-C)', () => {
  // Harvested: computeReason('315444233213', 1) -> opponentPunishment.tacticTag === 'double_threat'.
  // Before this fix the terms list was [] for this board, so [term:double_threat] was never offered
  // and the coach's "double threat" phrase carried zero markup (feedback ask 2c).
  const { terms } = buildAnnotationOffer(
    { bestCol: 3, playedCol: 1,
      lostResource: { register: 'parity', completingCell: 'c5r5' },
      opponentPunishment: { register: 'forced_sequence', completingCell: 'c3r5',
                            tacticTag: 'double_threat' } },
    []);   // no board decisions: proves the slug comes from the HALF, not a structural board tag
  assert.deepEqual(terms.map((t) => t.slug), ['double_threat']);
});
```

- [ ] **Step 2: Run and confirm both FAIL for the right reason**

```bash
node --test --experimental-test-module-mocks server/tests/zoneAnnotations.test.mjs 2>&1 | grep -E "not ok|^ℹ (pass|fail)"
```
Expected: the edited test fails with `figure_7 fired via opponentPunishment.tacticTag ... actual: undefined`;
the new test fails with `actual: []` vs `expected: ['double_threat']`.

- [ ] **Step 3: Apply the fix**

In `connect-four/server/scripts/reason_engine/zoneAnnotations.mjs`, in `buildAnnotationOffer`'s
"Fired term vocabulary" block, replace this exact line:
```js
    if (half?.tag && TERM_KB[half.tag]) fired.add(half.tag);   // figure_7 fires here even though its
```
with:
```js
    // `tacticTag`, not `tag` — halves have never had a `tag` field (measured Object.keys(half):
    // kind,register,completingCell,window,pliesToEnd,line,finalMovestring,entryCell,terminal,
    // forkCase,forkCells,forkWindows,tacticTag,tacticCells,tacticFromDiff,tie). This read was dead
    // from the day it was written; a fixture using the same wrong name kept the test green.
    if (half?.tacticTag && TERM_KB[half.tacticTag]) fired.add(half.tacticTag);   // figure_7 fires here even though its
```

- [ ] **Step 4: Run and confirm both pass**

```bash
node --test --experimental-test-module-mocks server/tests/zoneAnnotations.test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"
```
Expected: `fail 0`.

- [ ] **Step 5: Verify against the real feedback boards**

Create `/tmp/probe_terms.mjs`:
```js
const R = '/Users/elsonidoq/prog/cuatro_en_linea/.claude/worktrees/deep-reveal-grounding/connect-four/server/';
import { readFileSync } from 'fs';
readFileSync(R + '.env', 'utf8').split('\n').forEach((l) => {
  const [k, ...v] = l.split('='); if (k?.trim() && !k.trim().startsWith('#')) process.env[k.trim()] = v.join('=').trim();
});
const { createSolverProcess } = await import(R + 'c4solver-wrapper.js');
const { computeReason } = await import(R + 'scripts/reason_engine/reasonEngine.mjs');
const { toNarratorVector } = await import(R + 'scripts/reasonNarratorVector.mjs');
const { buildReasonRenderModel } = await import(R + 'scripts/renderReasonModel.mjs');
const CASES = [['3154', 4], ['315444233213', 1], ['315444233213134122', 5], ['3154442332131341225551', 5]];
const solver = await createSolverProcess();
try {
  for (const [ms, col] of CASES) {
    const m = buildReasonRenderModel(toNarratorVector(await computeReason(ms, col, { solver })));
    console.log(ms, 'TERMS', JSON.stringify(m.zones.terms.map((t) => t.slug)),
                '| REQUIRED', JSON.stringify(m.requiredSet.map((g) => g.handle + '=' + g.spec)));
    for (const a of m.zones.aliases) console.log('   ', a.handle, '=>', a.spec);
  }
} finally { solver.destroy(); }
```
Run from `connect-four/`: `node /tmp/probe_terms.mjs`
Expected (this is the whole point of the task) — board 2's TERMS goes from `[]` to
`["double_threat"]`; board 4 stays `["double_threat"]`; boards 1 and 3 stay `[]` (their halves'
`tacticTag`s are `minor_threat` / `major_threat_parity`, neither KB-backed).

- [ ] **Step 6: Full gate + commit**

```bash
npm run test:fast 2>&1 | grep -E "^ℹ (tests|pass|fail)"
```
Expected `fail 0`, tests ≥ 1875.
```bash
git add connect-four/server/scripts/reason_engine/zoneAnnotations.mjs connect-four/server/tests/zoneAnnotations.test.mjs
git commit -m "fix(058): term vocabulary read a half field that never existed (half.tag -> half.tacticTag)

Halves carry tacticTag; 'tag' was never a field. The read was dead, so no half
ever contributed a KB term — feedback ask 2c ('double threat' with zero markup).
The test fixture used the same wrong name, which is why it stayed green.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Make a `major`/`immediate` tag carry its four-in-a-row line (RC-A, ask 2b)

**Files:**
- Modify: `connect-four/server/scripts/reasonBoardTags.mjs` (symbol `tagBoard`)
- Modify: `connect-four/server/scripts/reason_engine/zoneAnnotations.mjs` (symbols `roleText`, `buildAnnotationOffer`)
- Modify: `connect-four/server/tests/zoneAnnotations.test.mjs` (test at line 105)

**Interfaces:**
- Consumes: `findMajorThreatWindows(board, perspective)` from
  `connect-four/server/llmCoachHelpers.js:419`. Verified signature and return shape (read from
  source, not a doc comment): takes a **`Board` instance** (it reads `board.board[r][c]`) and a
  perspective player number; returns `Array<{ cells: string[], owner: 'player' | 'opponent' }>`
  where `cells` are already 1-indexed `cNrM` strings, in H → V → diag-up → diag-down order.
  Also consumes `Board` from `connect-four/server/classifier.js`.
- Produces: `tagBoard(...)` tags of kind `major`/`immediate` gain an OPTIONAL `lineWindow: string[]`
  field. `buildAnnotationOffer` gains `<owner>-<kind>-line` aliases with spec `windows:<4 cells>`.

**Why NOT `getMajorThreatCells` — the call-site sweep.** `getMajorThreatCells` is defined at
`connect-four/server/classifier.js:145` and has **8 live JS call sites**:
`classifier.js:275`, `:460`, `:663`, `:1515`, `:1540`, `:1564`,
`server/scripts/visualize_board.mjs:54`, `server/scripts/reasonBoardTags.mjs:9`. (A separate,
independent copy lives at `connect-four/src/lib/board.js:70`, used by
`src/screens/ChallengeScreen.jsx:93` — a different module, unaffected either way.) Changing its
`"r,c" -> {rm,rn,ym,yn}` return shape would touch all eight. It is unnecessary: a canonical
group-level scanner already exists and `docs/architecture/server-conventions.md:765` says so
verbatim:
> `findMajorThreatWindows(board, perspective)` — scans all 4-windows and returns windows with exactly 3 discs of one color + 1 empty. Returns `{ cells: string[], owner: 'player'|'opponent' }[]`. Replaces `getMajorThreatCells` for all group-level operations.

**Why a NEW field name (`lineWindow`) and not `window`.** `tagSpec`
(`zoneAnnotations.mjs:49-52`, verbatim):
```js
function tagSpec(tag) {
  if (Array.isArray(tag.window) && tag.window.length) return 'windows:' + tag.window.join(',');
  return tag.cell; // already cNrM, a valid single-cell spec
}
```
If `major`/`immediate` tags gained a `window`, `tagSpec` would silently convert every major-threat
alias from a single cell to a `windows:` spec. Measured consequences of doing that: (a) board 3's
required set regresses from `[c1r3]` to `[]` (the derived `c1r3` no longer matches any alias spec),
and (b) `toAllowedSet` marks the entry `windowOnly: true`, so a correct single-cell `[zone:c1r3]`
highlight starts being rejected. `lineWindow` is invisible to `tagSpec` and to `renderThreatList`
(`reasonBoardSelect.mjs:18`, which reads `t.window`), so this task is purely additive.

- [ ] **Step 1: Write the failing test**

Add to `connect-four/server/tests/zoneAnnotations.test.mjs`:

```js
test('a major/immediate tag also offers its four-in-a-row LINE as a separate alias (ask 2b)', () => {
  // Harvested from board 315444233213 played col 1: the decision board carries a `you` major at
  // c3r4 whose completing line is the diagonal c6r1-c5r2-c4r3-c3r4. Before this change the ONLY
  // alias for it was the bare cell, so the coach's phrase "four-in-a-row line" was grounded to a
  // single square (feedback ask 2b).
  const boards = [{ id: 'decision', tags: [
    { cell: 'c3r4', kind: 'major', owner: 'you', lineWindow: ['c6r1', 'c5r2', 'c4r3', 'c3r4'] },
  ] }];
  const { aliases } = buildAnnotationOffer({ bestCol: 3, playedCol: 1 }, boards);
  const bySpec = Object.fromEntries(aliases.map((a) => [a.spec, a]));
  assert.ok(bySpec['c3r4'], 'the single-cell alias is still offered, unchanged');
  assert.equal(bySpec['c3r4'].handle, 'you-major');
  const line = bySpec['windows:c6r1,c5r2,c4r3,c3r4'];
  assert.ok(line, 'the LINE is offered as an additional alias');
  assert.equal(line.handle, 'you-major-line');
  assert.match(line.role, /four-in-a-row line/);
  assert.doesNotMatch(line.role, /matters later/); // present, board-true: NOT future-framed
});
```

And add to `connect-four/server/tests/reasonBoardTags.test.mjs` if it exists, otherwise put it in
`connect-four/server/tests/zoneAnnotations.test.mjs` with an added
`import { tagBoard } from '../scripts/reasonBoardTags.mjs';`:

```js
test('tagBoard: every major/immediate tag carries the 4-cell line it completes', () => {
  // 315444233213 (spec-058 feedback board 2), perspective player 1.
  const tags = tagBoard('315444233213', 1);
  const majors = tags.filter((t) => t.kind === 'major' || t.kind === 'immediate');
  assert.ok(majors.length > 0, 'fixture must actually contain a major/immediate tag');
  for (const t of majors) {
    assert.ok(Array.isArray(t.lineWindow) && t.lineWindow.length === 4,
      `${t.owner} ${t.kind} at ${t.cell} has no 4-cell lineWindow`);
    assert.ok(t.lineWindow.includes(t.cell), 'the completing cell must be a member of its own line');
  }
  // `window` must stay absent on major/immediate so tagSpec/renderThreatList are untouched.
  for (const t of majors) assert.equal(t.window, undefined);
});
```

- [ ] **Step 2: Run and confirm both FAIL**

```bash
node --test --experimental-test-module-mocks server/tests/zoneAnnotations.test.mjs 2>&1 | grep -E "not ok|^ℹ (pass|fail)"
```
Expected: the alias test fails on `assert.ok(line, 'the LINE is offered...')`; the `tagBoard` test
fails on the missing `lineWindow`.

- [ ] **Step 3: Add `lineWindow` in `reasonBoardTags.mjs`**

Replace the import line:
```js
import { parseBoardState, getMajorThreatCells } from '../classifier.js';
```
with:
```js
import { parseBoardState, getMajorThreatCells, Board } from '../classifier.js';
import { findMajorThreatWindows } from '../llmCoachHelpers.js';
```

Replace:
```js
  const majors = getMajorThreatCells(board); // "r,c" -> {rm,rn,ym,yn}
```
with:
```js
  const majors = getMajorThreatCells(board); // "r,c" -> {rm,rn,ym,yn}
  // The 4-cell LINE each major completes. getMajorThreatCells computes the window in its inner loop
  // and discards it, so a `major` tag could only ever name a square while roleText promised "a
  // square completing ... four-in-a-row line" (feedback ask 2b). findMajorThreatWindows is the
  // canonical group-level scanner (docs/architecture/server-conventions.md) — reused here rather
  // than changing getMajorThreatCells' return shape, which has 8 live call sites.
  const lineWins = findMajorThreatWindows(new Board(movestring), perspectivePlayer);
```

Replace:
```js
      tags.push({ cell, kind: r === colHeights[c] ? 'immediate' : 'major', owner });
```
with:
```js
      // Deliberately NOT named `window`: tagSpec() converts any window-bearing tag into a
      // `windows:` spec, which would replace every major's single-cell alias, regress the required
      // set, and flip the entry to Decision A's windowOnly bucket. `lineWindow` is additive.
      const w = lineWins.find((x) => (x.owner === 'player' ? 'you' : 'opp') === owner && x.cells.includes(cell));
      tags.push({ cell, kind: r === colHeights[c] ? 'immediate' : 'major', owner,
                  ...(w ? { lineWindow: w.cells } : {}) });
```

- [ ] **Step 4: Add the line alias + role text in `zoneAnnotations.mjs`**

In `roleText`, insert before the `if (kind === 'future')` line:
```js
  if (kind === 'line') return `the four-in-a-row line ${who} is playing for`;
  if (kind === 'future-line') return `the four-in-a-row line that decides this later, once the forced sequence reaches it — not a threat right now`;
```

In `buildAnnotationOffer`'s structural loop, replace the loop body's final line:
```js
      zoneAliasMap[handle] = spec;
```
with:
```js
      zoneAliasMap[handle] = spec;
      // Additive line alias (ask 2b): the same board-true major also offers the 4-cell line it
      // completes, so the phrase "four-in-a-row line" can be grounded to a LINE, not one square.
      // The cell alias above is untouched — both are offered.
      if (Array.isArray(tag.lineWindow) && tag.lineWindow.length) {
        const lineSpec = 'windows:' + tag.lineWindow.join(',');
        if (!seen.has(lineSpec)) {
          seen.add(lineSpec);
          const lh = mkHandle(`${tag.owner}-${tag.kind}-line`);
          aliases.push({ handle: lh, spec: lineSpec, role: roleText(tag.owner, 'line'),
                         truthBoard: board.id, kbId: null });
          zoneAliasMap[lh] = lineSpec;
        }
      }
```

- [ ] **Step 5: Fix the count-brittle test at `zoneAnnotations.test.mjs:105`**

That test (`'future: alias does not shadow or duplicate the near-term structural aliases'`) asserts
`aliases.filter((a) => a.spec.startsWith('future:')).length === 1`. Task 4 raises that number. Do
NOT weaken it to `>= 1` — replace the count with the invariant it was actually protecting: the
near-term structural alias is still offered AND is not itself `future:`-prefixed. Replace:
```js
  // and the future alias for the deep fork cells is additional, not a replacement
  assert.equal(aliases.filter((a) => a.spec.startsWith('future:')).length, 1);
```
with:
```js
  // and the future alias for the deep fork cells is additional, not a replacement: the near-term
  // fork's own spec is never future-prefixed, and the deep fork handle is still present.
  assert.ok(!aliases.some((a) => a.spec === 'future:windows:c1r3,c7r6'));
  assert.ok(aliases.some((a) => a.handle.endsWith('-future-fork')));
```

- [ ] **Step 6: Run**

```bash
node --test --experimental-test-module-mocks server/tests/zoneAnnotations.test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"
npm run test:fast 2>&1 | grep -E "^ℹ (tests|pass|fail)"
```
Expected: `fail 0` both times.

- [ ] **Step 7: Verify against the real boards**

`node /tmp/probe_terms.mjs` (from Task 2 Step 5). Expected NEW aliases, verbatim from a measured run:
```
315444233213           you-major-line => windows:c6r1,c5r2,c4r3,c3r4
315444233213134122     you-major-line => windows:c1r3,c2r3,c3r3,c4r3
315444233213134122     opp-major-line => windows:c1r4,c2r4,c3r4,c4r4
3154442332131341225551 you-major-line => windows:c1r3,c2r3,c3r3,c4r3
3154442332131341225551 opp-major-line => windows:c1r4,c2r4,c3r4,c4r4
3154442332131341225551 you-major-line-2 => windows:c4r3,c5r4,c6r5,c7r6
```
and every pre-existing alias unchanged. Board 1 (`3154`) gains none — it has no structural major.

- [ ] **Step 8: Commit**

```bash
git add connect-four/server/scripts/reasonBoardTags.mjs connect-four/server/scripts/reason_engine/zoneAnnotations.mjs connect-four/server/tests/zoneAnnotations.test.mjs
git commit -m "feat(058): offer the four-in-a-row LINE of a major/immediate tag, not just its square

getMajorThreatCells computes each window and discards it, so a major tag could
only name a cell while its role text promised a 'four-in-a-row line' (ask 2b).
Reuse findMajorThreatWindows to attach lineWindow (a NEW field, invisible to
tagSpec) and offer an additive <owner>-<kind>-line alias. getMajorThreatCells'
return shape is untouched: 8 live call sites.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: The fourth offer family — each half's own geometry (RC-B; asks 1b, 1c, 2a, 4a, 4b)

**Files:**
- Modify: `connect-four/server/scripts/reason_engine/zoneAnnotations.mjs` (symbol `buildAnnotationOffer` — new `opts` parameter + new offer loop)
- Modify: `connect-four/server/scripts/renderReasonModel.mjs` (symbols `buildReasonRenderModel`, `buildRenderDecision` — thread `openingHorizon`)
- Modify: `connect-four/server/tests/zoneAnnotations.test.mjs`
- Modify: `connect-four/server/tests/renderReasonModel.test.mjs`
- Modify: `connect-four/server/tests/mechanismExplainer.test.mjs`

**Interfaces:**
- Consumes: `horizonForRegister(register)` from `connect-four/server/scripts/reasonCellGrounding.mjs:9`.
  Verified source, verbatim:
  ```js
  export function horizonForRegister(register) {
    if (register === 'immediate') return 'immediate';
    if (register === 'forced_sequence') return 'deep-forced-line';
    if (register === 'parity') return 'deep-parity';
    return 'immediate'; // conservative default; only these three registers exist in the corpus
  }
  ```
- Produces: `buildAnnotationOffer(pruned, boardDecisions, opts = {})` — new optional third
  parameter `{ openingHorizon?: boolean }`. New alias handles:
  `<you|opp>-key-square`, `<you|opp>-key-line`, `<you|opp>-fork-lines`, `<you|opp>-fork-square`.

**The present-vs-future rule, and the field values it is based on.** A half's geometry is offered
with the `future:` prefix and future role text **iff `horizonForRegister(half.register) !==
'immediate'`**. This reuses the codebase's existing register→horizon mapping rather than inventing
a threshold, and it agrees with what the prompt already tells the model —
`renderReasonModel.mjs` READING_KEY, verbatim:
> `- "deep on a forced line" / "deep, via a parity battle": the winning square is many plies away and EMPTY now — not a current threat.`

Measured `register` / `pliesToEnd` on the four boards (real `computeReason` output):

| board | lostResource | opponentPunishment |
|---|---|---|
| `3154` | `parity`, 34 | `parity`, 35 |
| `315444233213` | `parity`, 28 | `forced_sequence`, 5 |
| `315444233213134122` | `parity`, 20 | `parity`, (denial half) |
| `3154442332131341225551` | `parity`, 16 | `forced_sequence`, 1 |

All eight halves are non-`immediate`, so all eight get `future:`. `pliesToEnd` is deliberately NOT
used as a second gate: board 4's `opponentPunishment` has `pliesToEnd: 1` and would flip to present
framing under a plies threshold, but its register is `forced_sequence` — the conservative direction
(never over-claim immediacy) is the one this codebase's `STRUCTURAL` exclusion already chose.
`roleText`'s non-future branch uses kind `'major'` ("a square completing X's four-in-a-row line"),
which is true whether or not the square is playable this turn; `'immediate'` would over-claim.

**Opening records MUST be suppressed — measured, not assumed.** Running this family unguarded broke
`renderReasonModel.test.mjs:159` (`'opening prompt has the opening reading key and no deep board'`)
because the opening prompt started listing two deep `future:` handles and requiring them, directly
contradicting that record's own guardrail (from the failing test's actual output):
> `Do NOT ground a specific deep completing cell; the deep resolution is a horizon, not a teachable square.`
and defeating `pruneOpeningResidue` (`renderReasonModel.mjs:88`), which exists to strip exactly
those cells. Hence the `openingHorizon` opt.

- [ ] **Step 1: Write the failing tests**

Add to `connect-four/server/tests/zoneAnnotations.test.mjs`:

```js
test('each half offers its own completing cell, line, fork lines and fork squares (RC-B)', () => {
  // Harvested verbatim from computeReason('3154442332131341225551', 5) -> toNarratorVector.
  const pruned = {
    bestCol: 2, playedCol: 5,
    lostResource: { kind: 'winning_line', register: 'parity', completingCell: 'c7r3',
                    window: ['c7r3', 'c6r4', 'c5r5', 'c4r6'], pliesToEnd: 16 },
    opponentPunishment: { kind: 'winning_line', register: 'forced_sequence', completingCell: 'c2r6',
                          window: ['c5r3', 'c4r4', 'c3r5', 'c2r6'], pliesToEnd: 1,
                          tacticTag: 'double_threat', forkCells: ['c2r6', 'c5r5'],
                          forkWindows: [['c5r3', 'c4r4', 'c3r5', 'c2r6'],
                                        ['c2r5', 'c3r5', 'c4r5', 'c5r5']] },
  };
  const { aliases } = buildAnnotationOffer(pruned, []);
  const byHandle = Object.fromEntries(aliases.map((a) => [a.handle, a.spec]));
  assert.equal(byHandle['you-key-square'], 'future:c7r3');
  assert.equal(byHandle['you-key-line'], 'future:windows:c7r3,c6r4,c5r5,c4r6');
  assert.equal(byHandle['opp-key-square'], 'future:c2r6');
  assert.equal(byHandle['opp-key-line'], 'future:windows:c5r3,c4r4,c3r5,c2r6');
  assert.equal(byHandle['opp-fork-lines'], 'future:windows:c5r3,c4r4,c3r5,c2r6|c2r5,c3r5,c4r5,c5r5');
  // c2r6 is already offered as opp-key-square, so only the OTHER fork cell gets its own alias.
  assert.equal(byHandle['opp-fork-square'], 'future:c5r5');
  // FR-002: every deep handle is future-framed, none reads as a present threat.
  for (const a of aliases.filter((x) => x.spec.startsWith('future:'))) {
    assert.match(a.role, /later|once|not.*right now/i);
    assert.equal(a.truthBoard, 'projectedDeep');
  }
});

test('a half with an `immediate` register is offered WITHOUT the future: prefix', () => {
  const { aliases } = buildAnnotationOffer(
    { bestCol: 1, playedCol: 5,
      lostResource: { register: 'immediate', completingCell: 'c1r1' },
      opponentPunishment: { register: 'immediate', completingCell: 'c2r1' } },
    []);
  const byHandle = Object.fromEntries(aliases.map((a) => [a.handle, a.spec]));
  assert.equal(byHandle['you-key-square'], 'c1r1');
  assert.equal(byHandle['opp-key-square'], 'c2r1');
});

test('openingHorizon suppresses the half-geometry family entirely (opening guardrail)', () => {
  const pruned = { bestCol: 3, playedCol: 1,
    lostResource: { register: 'parity', completingCell: 'c5r5', window: ['c2r5','c3r5','c4r5','c5r5'] },
    opponentPunishment: { register: 'parity', completingCell: 'c3r3' } };
  const withHalves = buildAnnotationOffer(pruned, []).aliases.map((a) => a.handle);
  const suppressed = buildAnnotationOffer(pruned, [], { openingHorizon: true }).aliases.map((a) => a.handle);
  assert.ok(withHalves.includes('you-key-square'));
  assert.deepEqual(suppressed, ['better-col', 'played-col']);
});
```

Add to `connect-four/server/tests/renderReasonModel.test.mjs`:

```js
test('opening records never offer or require a deep half cell (guardrail + pruneOpeningResidue)', () => {
  for (const kind of ['namedOpening', 'defense', 'centrality']) {
    const model = buildReasonRenderModel(OPENING[kind]);
    assert.deepEqual(model.zones.aliases.filter((a) => a.spec.startsWith('future:')), [],
      `${kind}: opening records must offer no future: handle`);
    assert.deepEqual(model.requiredSet, [], `${kind}: opening records require nothing`);
  }
});
```

- [ ] **Step 2: Run and confirm they FAIL**

```bash
node --test --experimental-test-module-mocks server/tests/zoneAnnotations.test.mjs server/tests/renderReasonModel.test.mjs 2>&1 | grep -E "not ok|^ℹ (pass|fail)"
```
Expected: the three new zoneAnnotations tests fail (`undefined` vs the expected specs; the third
fails because `buildAnnotationOffer` currently ignores a third argument, so both calls return the
same handles). The new renderReasonModel test PASSES already (openings offer nothing today) —
that is fine, it is the guard that will catch the regression in Step 4.

- [ ] **Step 3: Add the offer family**

In `connect-four/server/scripts/reason_engine/zoneAnnotations.mjs`:

(a) Add the import, after the `TAG_PHRASE` import:
```js
import { horizonForRegister } from '../reasonCellGrounding.mjs';
```

(b) Change the signature:
```js
export function buildAnnotationOffer(pruned, boardDecisions, opts = {}) {
```

(c) Insert this block immediately BEFORE the `// Fired term vocabulary:` comment:
```js
  // Half-resource geometry (RC-B): the two causal halves carry the cells and lines the explanation
  // is actually ABOUT — completingCell, window, forkWindows, forkCells — and none of them was ever
  // offered. The STRUCTURAL loop above only sees near-term board tags, and the deep-fork loop only
  // sees forkCells as one combined spec. Without these, prose like "the central threat", "the key
  // four-in-a-row line", "the column-2-to-column-5 strip" had no legal handle at all.
  //
  // Present vs future: a half whose register is not 'immediate' resolves many plies away and its
  // cells are EMPTY now, so it gets the `future:` prefix + future role text (FR-002, Settled
  // decision 8(b), the eval-3 present-threat trap). The rule reuses horizonForRegister rather than
  // a new plies threshold. Opening records suppress this family entirely: their guardrail says
  // "Do NOT ground a specific deep completing cell", and pruneOpeningResidue strips these very
  // fields from the prompt residue.
  const halfPairs = opts.openingHorizon
    ? []
    : [[pruned.lostResource, 'you'], [pruned.opponentPunishment, 'opp']];
  for (const [half, owner] of halfPairs) {
    if (!half) continue;
    const isFuture = horizonForRegister(half.register) !== 'immediate';
    const pre = isFuture ? 'future:' : '';
    const cellKind = isFuture ? 'future' : 'major';   // 'major' never over-claims immediacy
    const lineKind = isFuture ? 'future-line' : 'line';
    const offers = [];
    if (half.completingCell) offers.push([`${owner}-key-square`, half.completingCell, cellKind]);
    if (Array.isArray(half.window) && half.window.length) {
      offers.push([`${owner}-key-line`, 'windows:' + half.window.join(','), lineKind]);
    }
    if (half.tacticTag === 'double_threat' && (half.forkWindows?.length ?? 0) >= 2) {
      offers.push([`${owner}-fork-lines`,
                   'windows:' + half.forkWindows.map((w) => w.join(',')).join('|'), lineKind]);
    }
    // Each fork cell ALSO standalone: Decision A makes a `windows:` alias satisfiable only as the
    // whole window, so a correct single-cell fork highlight was being stripped (OI-172, measured:
    // c2r6 and c5r5 on 3154442332131341225551). Offering the cells individually closes that
    // without weakening Decision A — a window member that is never offered standalone still fails.
    for (const fc of (half.tacticTag === 'double_threat' ? half.forkCells ?? [] : [])) {
      offers.push([`${owner}-fork-square`, fc, cellKind]);
    }
    for (const [base, rawSpec, kind] of offers) {
      // Dedup on the UNPREFIXED geometry so a cell already offered as a present structural alias
      // is never re-offered under a future: framing (and vice versa) — first offer wins.
      if (seen.has(rawSpec) || seen.has('future:' + rawSpec)) continue;
      const spec = pre + rawSpec;
      seen.add(rawSpec);
      seen.add(spec);
      const handle = mkHandle(base);
      aliases.push({ handle, spec, role: roleText(owner, kind),
                     truthBoard: isFuture ? 'projectedDeep' : 'decision', kbId: null });
      zoneAliasMap[handle] = spec;
    }
  }

```

- [ ] **Step 4: Thread `openingHorizon` in `renderReasonModel.mjs`**

In `buildReasonRenderModel`'s opening branch, replace:
```js
    const zones = buildAnnotationOffer(pruned, allBoards);
```
with:
```js
    const zones = buildAnnotationOffer(pruned, allBoards, { openingHorizon: true });
```

In `buildRenderDecision`, the `buildAnnotationOffer` call currently runs BEFORE
`composeOpeningFrame`. Reorder. Replace:
```js
  const zones = buildAnnotationOffer(pruned, boardSelectionDecisions(pruned));

  const openingFrame = composeOpeningFrame(pruned);
  let openingContext = null;
```
with:
```js
  const openingFrame = composeOpeningFrame(pruned);
  const zones = buildAnnotationOffer(pruned, boardSelectionDecisions(pruned),
                                     { openingHorizon: !!openingFrame });

  let openingContext = null;
```
(`buildReasonRenderModel` and `buildRenderDecision` must stay byte-identical in routing — research.md D1.)

- [ ] **Step 5: Run and fix the four consequence fixtures in `mechanismExplainer.test.mjs`**

```bash
node --test --experimental-test-module-mocks server/tests/mechanismExplainer.test.mjs 2>&1 | grep -E "not ok"
```
Expected: 4 failures at lines 34, 135, 166, 177 — the fixture board's required set grew from one
group to two, so `okAnswer` no longer satisfies it and a retry fires.

Harvested live for `MOVESTRING = '3325'`, `PLAYED_COL = 5` (full offer + required set, real solver):
```
ALIASES:
   better-col => col2
   played-col => col6
   you-immediate => c1r1
   you-immediate-line => windows:c1r1,c2r1,c3r1,c4r1
   you-double => windows:c1r1,c5r1
   you-immediate-2 => c5r1
   you-immediate-line-2 => windows:c2r1,c3r1,c4r1,c5r1
   opp-key-square => c2r1
REQUIRED:
 { half: 'lostResource',        spec: 'c1r1', handle: 'you-immediate',  role: 'the square where you can make four next move' }
 { half: 'opponentPunishment',  spec: 'c2r1', handle: 'opp-key-square', role: "a square completing your opponent's four-in-a-row line" }
```
Apply these edits:

1. The block comment above `okAnswer` (starting `// This fixture's real requiredSet...`) — replace
   its first sentence with:
   ```js
   // This fixture's real requiredSet (harvested live for MOVESTRING/PLAYED_COL via
   // buildRenderDecision) is TWO groups: { spec: 'c1r1', handle: 'you-immediate' } and
   // { spec: 'c2r1', handle: 'opp-key-square' }. `okAnswer` wraps both so it satisfies the
   // required set on the first attempt.
   ```
2. `okAnswer`'s `mechanism`:
   ```js
   mechanism: 'You gave up the win at [zone:you-immediate]this square[/zone:you-immediate], and left [zone:opp-key-square]the square your opponent needs[/zone:opp-key-square] open.',
   ```
3. `OK_MECHANISM`:
   ```js
   const OK_MECHANISM = 'You gave up the win at [zone:c1r1]this square[/zone:c1r1], and left [zone:c2r1]the square your opponent needs[/zone:c2r1] open.'; // okAnswer, post processAnnotations (handle -> expanded spec)
   ```
4. In the test at line 135 (`'a required-set miss triggers exactly one retry...'`):
   - `assert.equal(res.missingHandles.length, 1);` → `assert.equal(res.missingHandles.length, 2);`
   - keep `res.missingHandles[0].handle === 'you-immediate'` and `.spec === 'c1r1'`; add:
     ```js
     assert.equal(res.missingHandles[1].handle, 'opp-key-square');
     assert.equal(res.missingHandles[1].spec, 'c2r1');
     ```
   - `assert.ok(res.usedSpecs.includes('c1r1'));` → add `assert.ok(res.usedSpecs.includes('c2r1'));`
5. In the test at line 166 (`'...STILL missed on the retry...'`):
   `assert.equal(res.missingHandles.length, 1);` → `assert.equal(res.missingHandles.length, 2);`
6. In the test at line 177 (`'an empty required set is a clean no-op...'`):
   `assert.deepEqual(res.attempt1.usedSpecs, ['c1r1']);` → `assert.deepEqual(res.attempt1.usedSpecs.sort(), ['c1r1', 'c2r1']);`

Then in `connect-four/server/tests/renderReasonModel.test.mjs`, the test at line 286
(`'buildReasonRenderModel and buildRenderDecision both expose requiredSet...'`) — its NV fixture now
resolves. Harvested live from the file's own `NV` constant:
```
NV aliases:      better-col => col4, played-col => col5, you-major => c3r2,
                 you-major-line => windows:c2r2,c3r2,c4r2,c5r2,
                 you-key-square => future:c6r5, opp-key-square => future:c3r3
NV requiredSet:  [] (this task only; Task 5 makes it non-empty)
```
Under **this task alone** the NV requiredSet stays `[]` (the `future:` prefix still blocks the
match), so this test should still pass. If it fails, read the actual value before editing —
Task 5's step will handle it.

- [ ] **Step 6: Do NOT change Decision A**

`toAllowedSet` (`connect-four/server/reasonRenderGuard.mjs`) and `checkP5Strong`'s `windowOnly`
handling stay exactly as they are. Verified with the real production pair, with the per-fork-cell
aliases from Step 3 in the offer set:
```
c2r6           []      <-- OI-172's two rejections, now admitted
c5r5           []
c7r1           ["P5strong:cell_not_allowed:c7r1"]   <-- ungrounded control: still rejected
c4r6           ["P5strong:cell_not_allowed:c4r6"]   <-- window member never offered standalone: still rejected
```
Add this as a regression test in `connect-four/tests/annotationGate.test.js`:
```js
test('OI-172 closes via per-fork-cell offers, with Decision A untouched', () => {
  const aliases = [
    { spec: 'col3' }, { spec: 'col6' }, { spec: 'c1r3' }, { spec: 'c1r4' },
    { spec: 'windows:c1r3,c7r6' }, { spec: 'c7r6' },
    { spec: 'future:windows:c2r6,c5r5' },
    { spec: 'future:c2r6' }, { spec: 'future:c5r5' },
  ];
  const allowedSet = toAllowedSet(aliases);
  const check = (s) => checkP5Strong([{ spec: s, innerText: 'x' }], allowedSet);
  assert.deepEqual(check('c2r6'), []);   // was OI-172's rejection #1
  assert.deepEqual(check('c5r5'), []);   // was OI-172's rejection #2
  assert.deepEqual(check('c7r1'), ['P5strong:cell_not_allowed:c7r1']);   // ungrounded
  assert.deepEqual(check('c4r6'), ['P5strong:cell_not_allowed:c4r6']);   // Decision A still holds
});
```

- [ ] **Step 7: Full gate**

```bash
npm run test:fast 2>&1 | grep -E "^ℹ (tests|pass|fail)"
npm run test:dom 2>&1 | grep -E "^ℹ (tests|pass|fail)"
```
Expected: `fail 0` for both; `test:dom` stays at exactly 72/72.
Remaining known failures at this point: `renderReasonModel.test.mjs:276` and `:310` — those belong
to Task 5. If they fail HERE, that means the `future:` prefix leaked; re-check Step 3's dedup.

- [ ] **Step 8: Verify against the real boards**

`node /tmp/probe_terms.mjs`. Expected new handles, harvested from a measured run:
```
3154                   you-key-square => future:c7r3
                       you-key-line   => future:windows:c4r3,c5r3,c6r3,c7r3
                       opp-key-square => future:c6r4
                       opp-key-line   => future:windows:c3r4,c4r4,c5r4,c6r4
315444233213           you-key-square => future:c5r5
                       you-key-line   => future:windows:c2r5,c3r5,c4r5,c5r5   <-- ask 2a's "column 2-column 5 strip"
                       opp-key-square => future:c3r5
                       opp-key-line   => future:windows:c6r2,c5r3,c4r4,c3r5
                       opp-fork-lines => future:windows:c6r2,c5r3,c4r4,c3r5|c7r1,c6r2,c5r3,c4r4
                       opp-fork-square=> future:c7r1
315444233213134122     you-key-line   => future:windows:c1r3,c2r3,c3r3,c4r3
3154442332131341225551 you-key-square => future:c7r3
                       you-key-line   => future:windows:c7r3,c6r4,c5r5,c4r6
                       opp-key-square => future:c2r6
                       opp-key-line   => future:windows:c5r3,c4r4,c3r5,c2r6
                       opp-fork-lines => future:windows:c5r3,c4r4,c3r5,c2r6|c2r5,c3r5,c4r5,c5r5
                       opp-fork-square=> future:c5r5
```

- [ ] **Step 9: Commit**

```bash
git add connect-four/server/scripts/reason_engine/zoneAnnotations.mjs connect-four/server/scripts/renderReasonModel.mjs connect-four/server/tests/zoneAnnotations.test.mjs connect-four/server/tests/renderReasonModel.test.mjs connect-four/server/tests/mechanismExplainer.test.mjs connect-four/tests/annotationGate.test.js
git commit -m "feat(058): offer each causal half's own geometry as highlightable handles

A half's completingCell / window / forkWindows / forkCells were never offered, so
'the central threat', 'the key four-in-a-row line' and 'the column-2-to-column-5
strip' had no legal handle (asks 1b, 1c, 2a, 4a). Deep geometry is future:-framed
via horizonForRegister; opening records suppress the family entirely to honour
their own 'do not ground a deep completing cell' guardrail. Per-fork-cell singles
close OI-172 without weakening Decision A.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Let a `future:` alias satisfy a derived plain cell (the required set becomes non-empty)

**Files:**
- Modify: `connect-four/server/scripts/renderReasonModel.mjs` (symbol `deriveRequiredSet`)
- Modify: `connect-four/server/tests/renderReasonModel.test.mjs` (tests at lines 276, 286, 310)
- Modify: `docs/architecture/reason-DECISIONS.md` (new D43)

**Interfaces:**
- Consumes: nothing new.
- Produces: `deriveRequiredSet(pruned, zones)` — same signature and same derived spec set; only the
  alias INDEX is normalized. A group's emitted `spec` is still the alias's own (prefixed) spec, so
  `missingRequiredGroups` (`connect-four/server/mechanismExplainer.mjs:80-83`, which compares
  `g.spec` against `attempt.usedSpecs`) keeps matching — `usedSpecs` is built from the same
  `aliasMap[handle]` values (`zoneAnnotations.mjs`, `processAnnotations`).

**This is a decision change and needs a superseding DECISIONS entry.** An existing test asserts the
exact opposite — `connect-four/server/tests/renderReasonModel.test.mjs:276-284`, verbatim:
```js
test('deriveRequiredSet never matches a future:-prefixed alias against a plain derived cell spec', () => {
  // A future: spec is string-distinct from its unprefixed form (US1) — spec equality (D2) means a
  // deep fork's future:cNrM alias can never satisfy a derived plain cNrM requirement by accident.
```
The word doing the work is **"by accident."** What this task makes happen is deliberate, and the
Derivation Rule's own text (spec.md, quoted verbatim from the epic) enumerates alias spec formats as
"a `cNrM`, `colN`, or `windows:…` string" — a list written before the `future:` prefix existed.
Every other production consumer already strips the prefix before matching:
- `connect-four/server/zoneParser.js:18` — `if (spec.startsWith('future:')) spec = spec.slice('future:'.length);` (`isValidSpec`)
- `connect-four/server/zoneParser.js:70` — same, in `expandSpec`
- `connect-four/server/annotationGate.js:372` — `const spec = rawSpec.startsWith('future:') ? rawSpec.slice('future:'.length) : rawSpec;`
- `connect-four/server/reasonRenderGuard.mjs:209` — same, in `toAllowedSet`
- `connect-four/src/lib/annotatedText.js:53` and `:167` and `:266` — same

The Derivation Rule's *substance* (which cell/window each half contributes; required ⊆ offered; the
1–3 cap) is untouched. Only the alias lookup is normalized the same way five other functions
already normalize it. **This resolves OI-171 without widening the Rule to read `forkCells`.**

- [ ] **Step 1: Rewrite the superseded invariant test (do not delete it)**

Replace `connect-four/server/tests/renderReasonModel.test.mjs:276-284` in full with:

```js
test('deriveRequiredSet matches a future:-prefixed alias against a plain derived cell, and keeps the future framing (D43)', () => {
  // Supersedes the spec-058 invariant "a future: alias can never satisfy a derived plain cell".
  // The Derivation Rule matches GEOMETRY; `future:` is a render-framing decorator that
  // zoneParser.isValidSpec/expandSpec, annotationGate.checkP5Strong, reasonRenderGuard.toAllowedSet
  // and the client's annotatedText all already strip before matching. Normalizing the alias INDEX
  // the same way leaves required ⊆ offered intact — the matched alias IS an offered alias.
  const pruned = { lostResource: { completingCell: 'c7r3' }, opponentPunishment: {} };
  const zones = { aliases: [
    { handle: 'you-key-square', spec: 'future:c7r3', role: 'this square matters later', truthBoard: 'projectedDeep', kbId: null },
  ] };
  const groups = deriveRequiredSet(pruned, zones);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].handle, 'you-key-square');
  // The group carries the alias's OWN (prefixed) spec — that is what mechanismExplainer's
  // missingRequiredGroups compares against processAnnotations' usedSpecs.
  assert.equal(groups[0].spec, 'future:c7r3');
  assert.match(groups[0].role, /matters later/);
});

test('deriveRequiredSet still drops a derived cell with no offered alias at all (FR-004)', () => {
  const pruned = { lostResource: { completingCell: 'c7r3' }, opponentPunishment: {} };
  const zones = { aliases: [{ handle: 'better-col', spec: 'col4', role: 'x', truthBoard: 'decision', kbId: null }] };
  assert.deepEqual(deriveRequiredSet(pruned, zones), []);
});
```

- [ ] **Step 2: Run and confirm the first FAILS**

```bash
node --test --experimental-test-module-mocks server/tests/renderReasonModel.test.mjs 2>&1 | grep -E "not ok"
```
Expected: the new D43 test fails with `groups.length` `0 !== 1`. The FR-004 test passes.

- [ ] **Step 3: Apply the one-line normalization**

In `connect-four/server/scripts/renderReasonModel.mjs`, symbol `deriveRequiredSet`, replace:
```js
  const aliasBySpec = new Map((zones?.aliases ?? []).map((a) => [a.spec, a]));
```
with:
```js
  // Index by the UNPREFIXED spec (D43). `future:` is a render-framing decorator, not part of the
  // geometry: zoneParser's isValidSpec/expandSpec, annotationGate's checkP5Strong, reasonRenderGuard's
  // toAllowedSet and the client's annotatedText all strip it before matching, and so does this index.
  // The Derivation Rule's substance is untouched — the derived spec is still denialCell(h) or
  // h.window, and the matched alias is still an OFFERED alias (required ⊆ offered, FR-004). Without
  // this, every deep half's cell derived to a plain cNrM that only existed as future:cNrM, so three
  // of the four spec-058 feedback boards had an empty required set (OI-171).
  const unprefix = (s) => (s.startsWith('future:') ? s.slice('future:'.length) : s);
  const aliasBySpec = new Map((zones?.aliases ?? []).map((a) => [unprefix(a.spec), a]));
```

- [ ] **Step 4: Update the two consequence tests**

The `NV` fixture's required set is now non-empty. Harvested live:
```
NV requiredSet:
 [ { half: 'lostResource',       spec: 'future:c6r5', handle: 'you-key-square' },
   { half: 'opponentPunishment', spec: 'future:c3r3', handle: 'opp-key-square' } ]
```

In the test at line 286 (`'buildReasonRenderModel and buildRenderDecision both expose requiredSet...'`),
replace the two `assert.deepEqual(..., [])` lines and the comment above them with:
```js
  // NV's two halves are both register 'forced_sequence', so each contributes a future:-framed
  // group (D43). Both builders must agree exactly — research.md D1, identical routing.
  assert.deepEqual(model.requiredSet.map((g) => g.handle), ['you-key-square', 'opp-key-square']);
  assert.deepEqual(model.requiredSet.map((g) => g.spec), ['future:c6r5', 'future:c3r3']);
  assert.deepEqual(rd.requiredSet, model.requiredSet);
```

The test at line 310 (`'the required-set prompt block states explicitly when there is nothing
required, without inventing one'`) uses `NV`, whose set is no longer empty. It must keep testing the
FR-006 empty-set message, so give it a fixture that genuinely abstains — a half with neither a cell
nor a window. Replace its body with:
```js
test('the required-set prompt block states explicitly when there is nothing required, without inventing one', () => {
  // A record whose halves carry neither a cell nor a window abstains (FR-006) — the prompt must SAY
  // so rather than silently omitting the block.
  const model = buildReasonRenderModel({ ...NV,
    lostResource: { kind: 'winning_line', register: 'forced_sequence' },
    opponentPunishment: { kind: 'winning_line', register: 'forced_sequence',
                          tie: { kind: 'tied', sharedCells: ['c4r5'] } } });
  assert.deepEqual(model.requiredSet, []);
  const prompt = assembleGroundedPrompt(model);
  assert.match(prompt, /# You MUST build the explanation around these/);
  assert.match(prompt, /none for this explanation/i);
});
```
If `buildReasonRenderModel` throws on that fixture (`assertCoverage` may demand fields the halves no
longer carry), read the actual error and instead keep `NV` but set
`model.requiredSet = []` before calling `assembleGroundedPrompt` — the test's subject is
`assembleGroundedPrompt`'s empty-set branch, not the derivation.

- [ ] **Step 5: Add the DECISIONS entry**

Append to `docs/architecture/reason-DECISIONS.md` (the current last entry is **D42**, at line 1114 —
locate it by its heading text, not the line number):

````markdown
### D43 — A `future:`-prefixed alias DOES satisfy a derived plain cell in `deriveRequiredSet`; this supersedes spec 058's "never by accident" invariant and resolves OI-171

**Supersedes:** the invariant recorded as
`server/tests/renderReasonModel.test.mjs`'s test
`'deriveRequiredSet never matches a future:-prefixed alias against a plain derived cell spec'`
(spec 058, US1/US2), and the "known structural gap" paragraph in
`docs/architecture/reason-render-grounded-prompt.md` §11a.

**Decision.** `deriveRequiredSet` indexes `zones.aliases` by the alias spec with any leading
`future:` stripped. The derived spec (`denialCell(h)` or `'windows:' + h.window.join(',')`) is
unchanged, the 1–3 cap is unchanged, and required ⊆ offered is unchanged — the alias that matches is
an offered alias.

**Why.** `future:` is a render-framing decorator, not geometry. Five production functions already
strip it before matching: `zoneParser.js` `isValidSpec` (:18) and `expandSpec` (:70),
`annotationGate.js` `checkP5Strong` (:372), `reasonRenderGuard.js` `toAllowedSet` (:209), and the
client's `src/lib/annotatedText.js` (:53, :167, :266). `deriveRequiredSet` was the sole holdout, and
the consequence was that every causal half whose register is deep derived a plain `cNrM` that only
existed in the offer set as `future:cNrM` — so the group was dropped.

**Measured, on the four spec-058 staging feedback boards** (`buildReasonRenderModel` over real
`computeReason` output). Before, with the widened offer set but the un-normalized index:

```
3154                   requiredSet []
315444233213           requiredSet []
315444233213134122     requiredSet [c1r3 (you-major)]
3154442332131341225551 requiredSet []
```

After:

```
3154                   [future:c7r3 (you-key-square), future:c6r4 (opp-key-square)]
315444233213           [future:c5r5 (you-key-square), future:c3r5 (opp-key-square)]
315444233213134122     [c1r3 (you-major)]                                   <-- unchanged
3154442332131341225551 [future:c7r3 (you-key-square), future:c2r6 (opp-key-square)]
```

Board 3 is the natural experiment that isolated the mechanism: its `lostResource.completingCell`
(`c1r3`) happens to also be a structural major-threat cell, so it was already offered UNPREFIXED —
and it was the only one of the four boards with a non-empty required set and the only one whose
feedback asks were largely satisfied.

**Why NOT the alternative the epic contemplated.** OI-171's "if picked up" note proposed widening
the Derivation Rule to read `forkCells` as a fourth derivation source. That edits the Rule, which
spec.md copies verbatim from the epic with an explicit instruction not to re-derive it, and would
have needed an owner override. Normalizing the alias index does not touch the Rule at all.

**FR-002 is preserved.** The group's emitted `spec` is the alias's OWN prefixed spec and its `role`
is the alias's own future-tense role text, so the `# You MUST build the explanation around these`
prompt block still frames the square as "matters later, once the forced sequence reaches it — not a
threat right now", and the client still colours it with `FUTURE_ZONE_COLOR`.
````

- [ ] **Step 6: Full gate**

```bash
npm run test:fast 2>&1 | grep -E "^ℹ (tests|pass|fail)"
npm run test:dom 2>&1 | grep -E "^ℹ (tests|pass|fail)"
```
Expected: `fail 0` for both; `test:dom` exactly 72/72.

- [ ] **Step 7: Verify the whole pipeline on the four boards**

`node /tmp/probe_terms.mjs`. Expected REQUIRED column, verbatim:
```
3154                   REQUIRED ["you-key-square=future:c7r3","opp-key-square=future:c6r4"]
315444233213           REQUIRED ["you-key-square=future:c5r5","opp-key-square=future:c3r5"]
315444233213134122     REQUIRED ["you-major=c1r3"]
3154442332131341225551 REQUIRED ["you-key-square=future:c7r3","opp-key-square=future:c2r6"]
```

- [ ] **Step 8: Commit**

```bash
git add connect-four/server/scripts/renderReasonModel.mjs connect-four/server/tests/renderReasonModel.test.mjs docs/architecture/reason-DECISIONS.md
git commit -m "feat(058): a future: alias satisfies a derived plain cell in deriveRequiredSet (D43)

future: is a render-framing decorator, not geometry — five other production
functions already strip it before matching and deriveRequiredSet was the holdout.
Every deep half derived a plain cNrM that existed only as future:cNrM, so the
group was dropped and three of the four feedback boards required nothing (OI-171).
The Derivation Rule itself is untouched.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Documentation, open issues, deploy note

**Files:**
- Modify: `docs/architecture/reason-render-grounded-prompt.md` (§11a, §11b; new §11c)
- Modify: `specs/058-deep-reveal-grounding/data-model.md` (§1)
- Modify: `docs/open_issues.md` (OI-171, OI-172 → resolved; OI-175 new)
- Modify: `docs/deployment_steps.md` (append-only)

- [ ] **Step 1: `reason-render-grounded-prompt.md` §11a — correct the now-false paragraph**

Replace the "**Known structural gap (not a defect to fix here):**" paragraph (§11a, ends
`"...must not be re-derived to 'fix' this."`) with:

```markdown
**Resolved 2026-08-05 (D43).** The gap was not that the Rule refuses to read `forkCells` — it was
that `aliasBySpec` keyed on the RAW alias spec, so a deep half's derived plain `cNrM` never matched
the `future:cNrM` alias that carried it. `deriveRequiredSet` now indexes by the unprefixed spec, the
same normalization `zoneParser`, `checkP5Strong`, `toAllowedSet` and the client's `annotatedText`
all already apply. The Rule's substance is untouched. See `reason-DECISIONS.md` D43 and OI-171
(resolved).
```
Also update the code block in §11a so it matches the shipped `deriveRequiredSet` (add the
`unprefix` line).

- [ ] **Step 2: `reason-render-grounded-prompt.md` — add §11c**

Append a new section after §11b:

```markdown
### 11c. The four offer families (spec 058 remediation, 2026-08-05)

`buildAnnotationOffer(pruned, boardDecisions, opts = {})` emits aliases from four sources, in this
order (the `seen` set dedupes on the UNPREFIXED spec, so the first family to claim a piece of
geometry keeps it — a present structural alias is never re-offered under a `future:` framing):

1. **Move columns** — `better-col` / `played-col`, `colN`. Always offered; a column is never the
   present-threat trap.
2. **Structural board tags** — `immediate` / `major` / `double` from `NEAR_TERM` boards
   (`decision` / `afterBest` / `afterPlayed`), via `tagSpec(tag)`. Since 2026-08-05 a `major` /
   `immediate` tag also carries `lineWindow` (the 4-cell line it completes, from
   `findMajorThreatWindows`) and therefore ALSO offers a `<owner>-<kind>-line` alias with a
   `windows:` spec. `lineWindow` is deliberately NOT called `window`: `tagSpec` branches on
   `tag.window`, and reusing that name would silently convert every major's single-cell alias into a
   `windows:` spec — which drops it out of `checkP5Strong`'s `concreteCells` (Decision A) and breaks
   the required-set match.
3. **Deep fork cells** — a half with `tacticTag === 'double_threat'` and `forkCells`, offered as one
   combined `future:`-prefixed spec (§11b), PLUS each fork cell individually as its own
   `future:cNrM` alias. The individual offers are what closed OI-172: Decision A makes a `windows:`
   alias satisfiable only as the whole window, so a correct single-cell fork highlight was being
   stripped. Offering the cells standalone admits them without weakening Decision A — a window
   member that is never offered standalone still fails.
4. **Half-resource geometry** — each of `lostResource` / `opponentPunishment` offers its own
   `completingCell` (`<owner>-key-square`), its `window` (`<owner>-key-line`), and, for a
   `double_threat` half with ≥2 `forkWindows`, all of them as one multi-line
   `windows:A|B` spec (`<owner>-fork-lines`). **Present vs future** is decided by
   `horizonForRegister(half.register) !== 'immediate'` — the same register→horizon mapping the
   prompt's READING_KEY already explains to the model — never by a `pliesToEnd` threshold.

**Opening records suppress family 4 entirely** (`opts.openingHorizon`). Their own guardrail says
"Do NOT ground a specific deep completing cell; the deep resolution is a horizon, not a teachable
square", and `pruneOpeningResidue` strips exactly these fields from the prompt residue. Both
`buildReasonRenderModel`'s opening branch and `buildRenderDecision` pass the flag, so their routing
stays identical (research.md D1).

**Multi-line `windows:A|B` specs** are produced only by family 4. `expandSpec` (server and client)
splits on `|` then `,` and dedupes; `checkP5Strong`'s signature does the same since 2026-08-05.
Before that fix it split on `,` alone, so a two-window spec was offered and then rejected by its own
allowed set.
```

- [ ] **Step 3: `specs/058-deep-reveal-grounding/data-model.md` §1**

Read §1 ("Offered handle set (`aliases[]`) — existing shape, one new field value") and add the new
handle names to whatever enumeration it carries: `<you|opp>-key-square`, `<you|opp>-key-line`,
`<you|opp>-fork-lines`, `<you|opp>-fork-square`, `<you|opp>-<major|immediate>-line`. Note that a
`spec` may now contain `|` (multi-window), and that the `future:` prefix may appear on a plain
`cNrM` as well as on `windows:`. Do not restructure the section.

- [ ] **Step 4: `docs/open_issues.md` — resolve OI-171 and OI-172, file OI-175**

For **OI-171** (heading at ~line 6334): change `**Status**:` to
`**Status**: RESOLVED 2026-08-05 (reason-DECISIONS.md D43)` and append:
```markdown
**Resolution**: not by widening the Derivation Rule (which spec.md bars). The real cause was that
`deriveRequiredSet`'s `aliasBySpec` keyed on the RAW alias spec, so a deep half's derived plain
`cNrM` never matched the `future:cNrM` alias carrying it. Indexing by the unprefixed spec — the same
normalization `zoneParser`, `checkP5Strong`, `toAllowedSet` and the client's `annotatedText` already
apply — makes the existing derivation match. Measured after: `3154` and `315444233213` and
`3154442332131341225551` all go from an empty required set to two `future:`-framed groups;
`315444233213134122` is unchanged at `[c1r3]`. See D43.
```

For **OI-172** (heading at ~line 6377): change `**Status**:` to
`**Status**: RESOLVED 2026-08-05 — closed WITHOUT changing Decision A` and append:
```markdown
**Resolution**: Decision A is untouched. The two rejections (`c2r6`, `c5r5` on
`3154442332131341225551`) happened because those cells were offered ONLY inside
`future:windows:c2r6,c5r5`, a `windowOnly` entry. `buildAnnotationOffer` now also offers each
`forkCell` as its own single-cell `future:cNrM` alias, which puts them in `concreteCells`. Measured
with `toAllowedSet`/`checkP5Strong` unchanged: `c2r6` → `[]`, `c5r5` → `[]`, ungrounded `c7r1` →
`['P5strong:cell_not_allowed:c7r1']`, and `c4r6` (a member of an offered window that is never
offered standalone) → still rejected. Decision A's semantics hold exactly.
```

Add a **new OI-175** at the end of the file (highest existing id is OI-174):
```markdown
## OI-175 — `namedPatternOpts` reads `half.tag`, a field that does not exist, so the named-pattern board overlay has never run

**Status**: deferred (deliberate — fixing it would inject a deep, currently-empty square onto the DECISION board's tactic list)
**Area**: `connect-four/server/scripts/reasonBoardSelect.mjs` (`namedPatternOpts`)
**Discovered**: spec-058 feedback remediation, 2026-08-05

`namedPatternOpts` gates on `FORK_TAGS.has(half.tag)`. Halves have never had a `tag` field —
measured `Object.keys(half)` on real `computeReason` output:
`kind,register,completingCell,window,pliesToEnd,line,finalMovestring,entryCell,terminal,forkCase,forkCells,forkWindows,tacticTag,tacticCells,tacticFromDiff,tie`.
The function therefore always returns `null`, `patternOpts` is always falsy, and `tagBoard`'s
`opts.patternTag` overlay branch (and with it `patternWindow`) has never executed in production.
The twin bug in `zoneAnnotations.mjs`'s term loop was fixed on 2026-08-05; this one was left alone
deliberately.

**Why deferred**: reviving it would push a `figure_7`/`double_threat` tag onto the **decision**
board, where `renderThreatList` prints it as a present tactic even though the resource often
completes many plies later — the eval-3 present-threat trap that `zoneAnnotations.mjs`'s
`STRUCTURAL` exclusion comment explicitly names (spec decision #5). None of the seven feedback asks
needs it: the same geometry now reaches the coach through the half-resource offer family, correctly
`future:`-framed.

**If picked up**: change `half.tag` → `half.tacticTag` at `reasonBoardSelect.mjs` (locate by symbol
`namedPatternOpts`), then decide what `renderThreatList` should print for a tag whose truth board is
`projectedDeep`, and re-run the corpus gate (`server/tests/renderCoverageUniverse.test.mjs`,
`renderCoverageCorpus.test.mjs`) — every board's tactic list changes. Cross-refs: D43, OI-171.
```

- [ ] **Step 5: `docs/deployment_steps.md` — append-only**

Do NOT edit or mark DONE the existing `## Spec 058 — Deep-Reveal Grounding` entry (Status PENDING).
Append a new entry BEFORE the `## Template for new entries` section:

```markdown
## Spec 058 remediation — feedback asks 1b/1c/2a/2b/2c/4a/4b

**Status**: PENDING
**When**: rides along with the (still PENDING) Spec 058 deploy — no additional prerequisite
**Blocks**: nothing on its own
**Applies to**: staging / production

### What's wrong (or: what this sets up)

Generation-side only: `buildAnnotationOffer` offers more handles, `deriveRequiredSet` matches
`future:` aliases, `checkP5Strong` accepts multi-window signatures. No schema change.

The one thing to be aware of is that `explanation_cache` bypasses every producer guard — a cache hit
serves stored text with `allowedSet: null`, so a generation change has NO effect on an already-cached
row. The `TRUNCATE TABLE explanation_cache;` step already queued in the `## Spec 058 —
Deep-Reveal Grounding` entry above covers this remediation too, provided that TRUNCATE runs at or
after this code deploys. If spec 058 has already been deployed and truncated by the time this ships,
run the TRUNCATE again.

### Run it

Nothing beyond the code deploy, plus (only if 058's TRUNCATE already ran before this code shipped):
```sql
TRUNCATE TABLE explanation_cache;
```

### Verify

`SELECT count(*) FROM explanation_cache;` → 0 immediately after any TRUNCATE. Then request a deep
reveal for `3154442332131341225551` played column 5 and confirm the served text contains a
`[zone:...]` span for `c2r6` and `c5r5` (previously stripped, OI-172).

### Roll back

Revert the code commits and redeploy. No data or schema to undo; the cache simply refills.
```

- [ ] **Step 6: Gate + commit**

```bash
npm run test:fast 2>&1 | grep -E "^ℹ (tests|pass|fail)"
```
Expected `fail 0` (docs-only changes, but `eslint .` runs first and `test:fast` includes doc-parity
tests).
```bash
git add docs/architecture/reason-render-grounded-prompt.md docs/architecture/reason-DECISIONS.md docs/open_issues.md docs/deployment_steps.md specs/058-deep-reveal-grounding/data-model.md
git commit -m "docs(058): four offer families, D43, OI-171/OI-172 resolved, OI-175 filed

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: End-to-end confirmation against the four feedback boards

**Files:** none modified. This is the acceptance gate.

- [ ] **Step 1: Confirm both baselines**

From `connect-four/`:
```bash
npm run test:fast 2>&1 | grep -E "^ℹ (tests|pass|fail)"
npm run test:dom 2>&1 | grep -E "^ℹ (tests|pass|fail)"
```
Expected: `test:fast` `fail 0` and `tests` ≥ 1871 (the plan adds ~9 tests, so expect ~1880).
`test:dom` exactly `tests 72 / pass 72 / fail 0`.

- [ ] **Step 2: Confirm every offered alias round-trips through the guard**

Create `/tmp/probe_guard_final.mjs`:
```js
const R = '/Users/elsonidoq/prog/cuatro_en_linea/.claude/worktrees/deep-reveal-grounding/connect-four/server/';
import { readFileSync } from 'fs';
readFileSync(R + '.env', 'utf8').split('\n').forEach((l) => {
  const [k, ...v] = l.split('='); if (k?.trim() && !k.trim().startsWith('#')) process.env[k.trim()] = v.join('=').trim();
});
const { createSolverProcess } = await import(R + 'c4solver-wrapper.js');
const { computeReason } = await import(R + 'scripts/reason_engine/reasonEngine.mjs');
const { toNarratorVector } = await import(R + 'scripts/reasonNarratorVector.mjs');
const { buildReasonRenderModel } = await import(R + 'scripts/renderReasonModel.mjs');
const { checkP5Strong } = await import(R + 'annotationGate.js');
const { toAllowedSet } = await import(R + 'reasonRenderGuard.mjs');
const CASES = [['3154', 4], ['315444233213', 1], ['315444233213134122', 5], ['3154442332131341225551', 5]];
const solver = await createSolverProcess();
try {
  for (const [ms, col] of CASES) {
    const m = buildReasonRenderModel(toNarratorVector(await computeReason(ms, col, { solver })));
    const allowed = toAllowedSet(m.zones.aliases);
    console.log('===', ms);
    for (const a of m.zones.aliases) {
      const f = checkP5Strong([{ spec: a.spec, innerText: 'x' }], allowed);
      console.log(`  ${f.length ? 'REJECT' : 'ok    '}  ${a.handle} => ${a.spec}`);
    }
    console.log('  control c7r1:', JSON.stringify(checkP5Strong([{ spec: 'c7r1', innerText: 'x' }], allowed)));
    console.log('  REQUIRED:', JSON.stringify(m.requiredSet.map((g) => g.handle + '=' + g.spec)));
    console.log('  TERMS:', JSON.stringify(m.zones.terms.map((t) => t.slug)));
  }
} finally { solver.destroy(); }
```
Run from `connect-four/`: `node /tmp/probe_guard_final.mjs`

**Acceptance conditions:**
- **Zero `REJECT` lines.** Every alias the offer set advertises must survive its own allowed set.
- Every `control c7r1:` line is `["P5strong:cell_not_allowed:c7r1"]` — an ungrounded cell is still
  rejected on every board. If any board returns `[]` here, STOP: the offer set has become too
  permissive.
- `REQUIRED` is non-empty on all four boards:
  ```
  3154                   ["you-key-square=future:c7r3","opp-key-square=future:c6r4"]
  315444233213           ["you-key-square=future:c5r5","opp-key-square=future:c3r5"]
  315444233213134122     ["you-major=c1r3"]
  3154442332131341225551 ["you-key-square=future:c7r3","opp-key-square=future:c2r6"]
  ```
- `TERMS` is `["double_threat"]` on boards 2 and 4, `[]` on 1 and 3.

- [ ] **Step 3: Map each feedback ask to its now-available handle**

Confirm from Step 2's output that each ask has a legal, guard-passing handle:

| ask | what was missing | handle that closes it |
|---|---|---|
| 1b | "central threat" named but never highlighted | `you-key-square` = `future:c7r3` (board 1) |
| 1c | "key four-in-a-row line later" never identified | `you-key-line` = `future:windows:c4r3,c5r3,c6r3,c7r3` (board 1) |
| 2a | "column 2–column 5 strip" not highlightable | `you-key-line` = `future:windows:c2r5,c3r5,c4r5,c5r5` (board 2) |
| 2b | "four-in-a-row line" grounded to the single cell `c3r4` | `you-major-line` = `windows:c6r1,c5r2,c4r3,c3r4` (board 2) |
| 2c | "double threat" had zero markup | `terms` = `["double_threat"]` (board 2) |
| 4a | several referents were plain prose | `you-key-square`/`you-key-line`/`opp-key-square`/`opp-key-line` (board 4), all now in the required set or offer set |
| 4b | fork cells `c2r6`/`c5r5` offered only as a window, then rejected | `opp-key-square` = `future:c2r6` and `opp-fork-square` = `future:c5r5`, both admitted per-cell |

- [ ] **Step 4: Live smoke test (optional but recommended)**

With the servers already running on `$API_PORT`=4499, request a deep reveal for board 4 and confirm
the served text carries `[zone:...]` spans for `c2r6` and `c5r5` rather than the degraded
"column 2"/"column 5" wording OI-172 recorded. Remember that `explanation_cache` short-circuits the
producer path — clear the local row for that movestring first, or the old text is served unchanged.

- [ ] **Step 5: Final check that nothing is staged that should not be**

```bash
git status --short
```
Expected: clean (all six commits landed) or only files this plan names.
