# Deep-Reveal A7 Remediation (Wave 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise the deep-reveal A7 axis ("useful to the player who blundered") by fixing the render-layer defects that production's retry cannot touch, then verify with a targeted 14-case smoke grading instead of a full 63-board re-grade.

**Architecture:** All fixes are render-layer (`zoneAnnotations.mjs`, `causalLinks.mjs`, `openingFrame.mjs`, `renderReasonModel.mjs`) — the engine (`computeReason`) is untouched. Each fix carries a corpus-wide mechanical test (model-free) as its primary verification; one LLM smoke run at the end measures the counterexample cases. Grading-model choice (Sonnet vs Opus) is settled by a calibration task before any new grading.

**Tech Stack:** Node ESM, `node:test` via `npm run test:fast` (inside `connect-four/`), c4solver via `c4solver-wrapper.js`, eval harness `server/scripts/compute.mjs`.

**Spec:** The analysis this plan implements is the A7 recommendation list produced 2026-09-01 in-session (summarised per task below). Owner decisions locked 2026-09-01: (a) L6 fix = **swap, keep cap 3**; (b) grader = **calibrate Sonnet first**; (c) wave scope = **items 1–8 minus the pin-L6 viability gate** (that gets a sizing detector only); harness-retry re-run stays **PENDING owner approval**.

## Global Constraints

- **Mandatory reads before touching any file in `reason_engine/` or `renderReasonModel.mjs`** (every task, fresh context): `docs/architecture/reason-AGENT-PREAMBLE.md`, `reason-INVARIANTS.md`, `reason-DECISIONS.md` (at minimum D43–D59), `reason-case-taxonomy.md`, `blunder-reason-evidence.md`. Do not relitigate D-log entries.
- **I13 (display ⊆ offer):** never print a handle/slug the record does not offer; **never widen `zones.terms`** — every fix here is on the offer/display side or narrows.
- **I2 (never fabricate):** any new prose clause must be derivable from feature-vector fields; when a condition can't be established, fall back to the existing (weaker but true) wording.
- **I12:** validate any new classification/derivation rule through the **production detector** across its full case space (Task 7 embeds this as a gating step).
- **Test baseline:** `cd connect-four && npm run test:fast` → **2056 pass / 0 fail / 282 suites, 0 eslint errors** (verified 2026-09-01). Every task ends green.
- **Do NOT create new test FILES.** `test:fast` registers test files in one 7146-char line in `package.json`; agents have died editing it. Add tests to the existing registered files named per task (`zoneAnnotations.test.mjs`, `renderReasonModel.test.mjs`, `causalLinksComposers.test.mjs`, `openingFrame.test.mjs`).
- **Do NOT commit and do NOT `git add` anything.** The owner commits WIP himself, and an external auto-backup process commits staged work unpredictably. End each task with a green working tree, unstaged.
- **Never bare `git stash`** (shared stash stack across worktrees).
- Worktree: `/Users/elsonidoq/prog/cuatro_en_linea/.claude/worktrees/deep-reveal-grounding`, branch `worktree-deep-reveal-grounding`. Run everything from here.
- Coordinates: 0-indexed internally, `cNrM` emitted 1-indexed. Observe any board with `./visualize_board.sh <movestring>` before reasoning about it.
- Corpus ground truth for tests: `connect-four/server/scripts/reason_corpus/evidence.jsonl` (63 records, look up **by id, never line number**). The corpus-test loading idiom (copy it exactly) is in `server/tests/renderReasonModel.test.mjs:578-588`:

```js
const { readFileSync } = await import('node:fs');
const { fileURLToPath } = await import('node:url');
const { dirname, join } = await import('node:path');
const { toNarratorVector, pruneVector } = await import('../scripts/reasonNarratorVector.mjs');
const here = dirname(fileURLToPath(import.meta.url));
const rows = readFileSync(join(here, '../scripts/reason_corpus/evidence.jsonl'), 'utf8')
  .trim().split('\n').map((l) => JSON.parse(l));
const fv = pruneVector(toNarratorVector(rows.find((r) => r.id === 'eval-12').evidence));
```

- Half field shapes differ and this has burned tests before (`zoneAnnotations.mjs:475-478`): **causal halves carry `tacticTag`** (plus `line`, `forkCells`, `forkWindows`); **`realized_pattern` halves carry `tag`** (plus `cells`, `windows`, `finalMovestring`) and have **no** `tacticTag`/`line`. Never read the wrong one.
- Any run-output jsonl produced by Tasks 10–11 is git-ignored (`.gitignore` line 6: `*jsonl`); leave committing (`git add -f`) to the owner.

---

### Task 1: Ownership word in the `future` role text (A7b, 22–28/63 boards, 37.3% of real blunders)

**Files:**
- Modify: `connect-four/server/scripts/reason_engine/zoneAnnotations.mjs:106` (function `roleText`)
- Test: `connect-four/server/tests/renderReasonModel.test.mjs` (append)

**Why (evidence):** `you-key-square` and `opp-key-square` currently render the byte-identical role `"this single square matters later, once the forced sequence reaches it — not a threat right now"` — the only cell-role branch with no ownership word (the `line`/`future-line` branches at :101/:105 already carry `${who}`). Grader-confirmed model echo on `eval-2` run 1 (identical phrase pasted for both handles → A7b, not retry-catchable). 28/63 records carry ≥2 ownerless-future roles; frequency-probe D3 measured 37.3% per real blunder.

**Interfaces:** none — `roleText` is module-private; behavior reaches callers through `buildAnnotationOffer`'s alias `role` strings.

- [ ] **Step 1: Write the failing corpus-wide test** (append to `renderReasonModel.test.mjs`, using the loading idiom from Global Constraints):

```js
test('D3 fix: aliases owned by different players never share a role string (corpus-wide)', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const { toNarratorVector, pruneVector } = await import('../scripts/reasonNarratorVector.mjs');
  const here = dirname(fileURLToPath(import.meta.url));
  const rows = readFileSync(join(here, '../scripts/reason_corpus/evidence.jsonl'), 'utf8')
    .trim().split('\n').map((l) => JSON.parse(l));
  for (const row of rows) {
    const fv = pruneVector(toNarratorVector(row.evidence));
    const model = buildReasonRenderModel(fv);
    const roleOwner = new Map(); // role string -> 'you' | 'opp'
    for (const a of model.zones.aliases) {
      // Exemption (Task 5): the afterPlayed board-tag pivot role is deliberately owner-neutral —
      // the mover of an afterPlayed board is always the player, so no possessive applies.
      if (a.role === "the square your last move just filled — that move is what set up the fork") continue;
      const owner = a.handle.startsWith('you-') ? 'you' : a.handle.startsWith('opp-') ? 'opp' : null;
      if (!owner) continue;
      const prev = roleOwner.get(a.role);
      assert.ok(prev === undefined || prev === owner,
        `${row.id}: role string shared across owners: "${a.role}" (${a.handle})`);
      roleOwner.set(a.role, owner);
    }
  }
});
```

- [ ] **Step 2: Run it, verify it fails.** `cd connect-four && node --test server/tests/renderReasonModel.test.mjs 2>&1 | tail -20` — expect FAIL naming one of the 28 affected records (e.g. `eval-2` or `eval-4`).

- [ ] **Step 3: Fix `roleText`.** Replace line 106 exactly:

```js
// OLD (verbatim):
  if (kind === 'future') return `this single square matters later, once the forced sequence reaches it — not a threat right now`;
// NEW:
  if (kind === 'future') return `a single square on ${possessive(owner)} four-in-a-row line — it matters later, once the forced sequence reaches it, not a threat right now`;
```

`possessive(owner)` already exists in the same file (:84-86) and is what the `major` fallback branch (:124) uses. This makes the role board-true (a `future` key square is always the owner's `denialCell`, the completing square of the owner's own line — same claim the `major` branch already makes).

- [ ] **Step 4: Run the new test → PASS, then full `npm run test:fast`.** Two things may legitimately move: (a) any test pinning the old verbatim string — `grep -rn "this single square matters later" server/tests/` and re-pin deliberately to the new string; (b) `disambiguateSiblingRoles` collides on `(role, truthBoard)` — cross-owner pairs that previously collided now differ, so locator prefixes (`the one in column N: …`) may disappear from some fixtures. Both are the intended effect; update pinned expectations, never weaken the D49 zero-collision property.

- [ ] **Step 5: Verify 2056+1 pass / 0 fail. Leave unstaged.**

---

### Task 2: Line-aware sibling locators (A7b, 15/63 boards, 11.4% of real blunders)

**Files:**
- Modify: `connect-four/server/scripts/reason_engine/zoneAnnotations.mjs` — `locatorsForGroup` (:556) and its call in `disambiguateSiblingRoles` (:583, the `sorted.map((item) => specSortKey(item.a.spec))` line)
- Test: `connect-four/server/tests/renderReasonModel.test.mjs` (append)

**Why (evidence):** `specSortKey` reduces a `windows:` spec to one representative cell, so rung 1 labels a horizontal row-4 line spanning columns 3–6 "the one in column 3"; the model echoes "your line in column 3" (board-false). Probe D2 real example: `ms=22315420154425504` → `opp-major-line-2@windows:c3r4,c4r4,c5r4,c6r4`. 15/63 boards, 11.4% per real blunder. D49-addendum's own rule: assert the *truth* of the locator — "ugly-but-true beats clean-but-false".

**`lineLocator` must refuse non-line `windows:` specs (F10).** Real non-line `windows:` families exist in the corpus and must NOT be mislabeled as a line: combined fork-lines specs join two 4-cell windows with `|` (`eval-17/18/19/20`: `future:windows:c3r5,c4r5,c5r5,c6r5|c4r3,c5r4,c6r5,c7r6`), and disjoint fork-cell specs are not contiguous (`eval-47`: `you-double@windows:c3r6,c6r5,c7r2`; Task 7 adds more disjoint-cell specs). A naive regex-scrape over all `c\d+r\d+` matches would call these a "diagonal line" — false. `lineLocator` must return `null` unless the spec contains **no `|`** AND has **exactly 4 cells forming a contiguous line** (constant column step and constant row step across the sorted cells) — non-line specs fall through to the existing rungs unchanged.

**Interfaces:** `locatorsForGroup(sortedKeys)` changes to accept `{row, col, spec}` items (the extra `spec` field). Only `disambiguateSiblingRoles` calls it.

- [ ] **Step 1: Write the failing corpus-wide test:**

```js
test('D2 fix: a multi-column windows: alias never gets a single-column locator (corpus-wide)', async () => {
  // loading idiom as in Task 1 …
  for (const row of rows) {
    const fv = pruneVector(toNarratorVector(row.evidence));
    const model = buildReasonRenderModel(fv);
    for (const a of model.zones.aliases) {
      const raw = a.spec.replace(/^future:/, '');
      if (!raw.startsWith('windows:')) continue;
      const cols = new Set([...raw.matchAll(/c(\d+)r\d+/g)].map((m) => m[1]));
      if (cols.size < 2) continue; // vertical line — column locator is true
      assert.ok(!/^the (lower |upper |[a-z-]+ )?one in column \d+:/.test(a.role),
        `${row.id} ${a.handle}: multi-column line labelled by a single column: "${a.role}"`);
    }
  }
});
```

- [ ] **Step 2: Run → expect FAIL** on one of the 15 affected records.

- [ ] **Step 3: Implement.** In `disambiguateSiblingRoles`, pass the spec through:

```js
const locators = locatorsForGroup(sorted.map((item) => ({ ...specSortKey(item.a.spec), spec: item.a.spec })));
```

In `locatorsForGroup`, add a line-locator helper and use it for multi-column window specs; single cells and vertical lines keep the existing rungs verbatim:

```js
function lineLocator(spec) {
  const raw = spec.replace(/^future:/, '');
  if (!raw.startsWith('windows:')) return null;
  if (raw.includes('|')) return null;                      // F10: a combined fork-lines spec is NOT one line
  const cells = [...raw.matchAll(/c(\d+)r(\d+)/g)].map((m) => ({ col: +m[1], row: +m[2] }));
  if (cells.length !== 4) return null;                     // F10: only a genuine 4-cell window can be "a line"
  const sorted = [...cells].sort((a, b) => (a.col - b.col) || (a.row - b.row));
  const colStep = sorted[1].col - sorted[0].col;
  const rowStep = sorted[1].row - sorted[0].row;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].col - sorted[i - 1].col !== colStep || sorted[i].row - sorted[i - 1].row !== rowStep) {
      return null;                                          // F10: not contiguous — disjoint fork-cell spec
    }
  }
  const cols = [...new Set(cells.map((c) => c.col))].sort((a, b) => a - b);
  const rows = [...new Set(cells.map((c) => c.row))].sort((a, b) => a - b);
  if (cols.length < 2) return null;                       // vertical — column wording is true, use rungs
  if (rows.length === 1) return `the line across columns ${cols[0]}–${cols[cols.length - 1]} on row ${rows[0]}`;
  const first = cells.reduce((a, b) => (a.col <= b.col ? a : b));
  const last = cells.reduce((a, b) => (a.col >= b.col ? a : b));
  const dir = last.row > first.row ? 'rising' : 'falling';
  return `the diagonal line ${dir} from column ${cols[0]} to column ${cols[cols.length - 1]}`;
}
```

In the rung ladder: build labels as `k.spec && lineLocator(k.spec)` where it returns non-null, else the existing `the one in column ${k.col}` — run the same uniqueness check; if the mixed labels are not unique, fall through to the existing height rung (cells only) and finally the ordinal rung for the remainder. Every label stays true by construction (the D49-addendum rule).

- [ ] **Step 4: New test PASS; full `test:fast` green.** The Q8 corpus test asserting zero raw coordinates in roles must stay green — `lineLocator` prints column/row **numbers in prose**, exactly like rung 2's existing "the lower one in column N" (no `cNrM` tokens). If any test pins an old locator string, re-pin. **Extend the test with a positive truth assertion (F10):** for every locator `lineLocator` actually produces for a `windows:` spec in the corpus, re-derive the geometry from the raw spec and assert the words match — a row locator's cells all share that row; a diagonal locator's cells are contiguous with a constant row step; a column-wording fallback's cells all share that column. Also add negative cases: `eval-17/18/19/20`'s `|`-joined specs and `eval-47`'s disjoint `windows:c3r6,c6r5,c7r2` must all get `lineLocator(...) === null`.

- [ ] **Step 5: Leave unstaged.**

---

### Task 3: Register-gate the opening frame's deep-horizon tail (1/30 opening records is truly `immediate`; false "long way out" only there)

**Files:**
- Modify: `connect-four/server/scripts/reason_engine/openingFrame.mjs` — `horizonTail` (:68-76) and the `mk` guardrail composition (:140)
- Test: `connect-four/server/tests/openingFrame.test.mjs` (append)

**Why (evidence):** `horizonTail` unconditionally returns `" This one only settles a long way out, through ${battle} — …"` and `mk` unconditionally appends `GUARDRAIL_DEEP_RESOURCE` ("resolves a long way out"). **Scope correction (F8):** re-measured 2026-09-01 against `evidence.jsonl` — of **30 opening-context records**, **16 are `near`-register** and only **1** (`eval-44`, ms `443`, played 1 — the opponent's fork lands on the very next ply) is `register === 'immediate'`. The earlier "24 of the 42" claim was wrong; the correct denominator is 30 opening-context records, 16 near-register, 1 immediate. **15 records are `register === 'forced_sequence'` and still offer 3–9 `future:` aliases each** — for those, "settles a long way out" is still board-true (they are genuinely a multi-ply forced line, not an immediate punishment), so `forced_sequence` must NOT be gated the same way as `immediate`: gating it too would strip `GUARDRAIL_DEEP_RESOURCE` from records where D46's eval-3 present-threat trap is exactly the risk it guards against, and "land within the next few moves" would be board-false for those 15. **Gate on `register === 'immediate'` only.**

**Interfaces:** none — both symbols are module-private to `composeOpeningFrame`.

- [ ] **Step 1: Failing test** (append to `openingFrame.test.mjs`, loading `eval-44` from the corpus with the Task-1 idiom, calling the module's exported composer the way `renderReasonModel.mjs` does — `composeOpeningFrame(pruned)`):

```js
test('horizonTail: an immediate-register punishment is not framed as settling a long way out (eval-44)', async () => {
  // load eval-44, build fv = pruneVector(toNarratorVector(row.evidence))
  const frame = composeOpeningFrame(fv);
  assert.ok(frame, 'eval-44 is an opening record and must produce a frame');
  assert.ok(!frame.text.includes('a long way out'), frame.text);
  assert.ok(!frame.guardrail.includes('a long way out'), frame.guardrail);
});
```

Plus the corpus-wide form: for every opening record whose `(fv.case.startsWith('win_') ? fv.lostResource : fv.opponentPunishment)?.register === 'immediate'`, frame text and guardrail contain no `'a long way out'`.

- [ ] **Step 2: Run → FAIL on eval-44.**

- [ ] **Step 3: Implement.** In `horizonTail`, branch on register before the existing text (existing parity/default lines stay byte-identical):

```js
function horizonTail(fv) {
  const half = fv.case && fv.case.startsWith('win_') ? fv.lostResource : fv.opponentPunishment;
  const reg = half?.register;
  if (reg === 'immediate') return ' The punishment lands almost at once — within the next move or two.';
  const battle = reg === 'parity' ? 'a parity battle' : 'a deep line';
  const pinnable = denialCell(half) != null;
  return pinnable
    ? ` This one only settles a long way out, through ${battle} — the lesson is the opening.`
    : ` This one only settles a long way out, through ${battle} — too far to pin to a single square; the lesson is the opening.`;
}
```

(Deliberately **no new render vocabulary** like "highlighted squares" — the D50-addendum lesson: any word the frame shows, the model echoes. F8: `forced_sequence` deliberately gets NO branch here — 15 opening records are `forced_sequence` and "settles a long way out" is board-true for them; only `immediate` (1 record, `eval-44`) is false.) Gate the guardrail identically — extract:

```js
const GUARDRAIL_NEAR_RESOURCE = 'The decisive squares land within the next few moves: state that timing plainly — '
  + 'never stretch it into a distant, abstract resource.';
function deepResourceGuardrail(fv) {
  const half = fv.case && fv.case.startsWith('win_') ? fv.lostResource : fv.opponentPunishment;
  return half?.register === 'immediate' ? GUARDRAIL_NEAR_RESOURCE : GUARDRAIL_DEEP_RESOURCE;
}
```

and in `mk` (:140) replace `+ GUARDRAIL_DEEP_RESOURCE +` with `+ deepResourceGuardrail(fv) +`.

- [ ] **Step 4: Tests PASS; full `test:fast`.** Note (F8, verified): `grep -rn "long way out" server/tests/` is expected to find **no existing pins** — do not assume the grep step from the memory precedent ("causalLinks text = 4 verbatim tests") applies here; state that explicitly in the task report rather than implying pins exist and were re-pinned. The D46 revert-trigger is untouched: `near`/`parity`/`forced_sequence` records keep the exact old wording, since only `register === 'immediate'` is gated (F8 — 1 record, `eval-44`).

- [ ] **Step 5: Leave unstaged.**

---

### Task 4: Board-attribute the `immediate_threat` term gloss (board-false phrase survived all three eval datasets)

**Files:**
- Modify: `connect-four/server/scripts/reason_engine/zoneAnnotations.mjs` — the fired-term collector (:460-487: `noteFired`, the two firing loops, the `terms` mapping) and `describeTerm` (:~56)
- Test: `connect-four/server/tests/renderReasonModel.test.mjs` (append)

**Why (evidence):** The term's `canonicalPhrase` is `TAG_PHRASE.immediate_threat = 'threat to make four next move'` (`causalLinks.mjs:123`). The **frame** layer is already grain-gated (`plainTagForCellGrain`, `causalLinks.mjs:139`), but the **term offer** is not: the slug fires from a board tag of kind `immediate` on ANY near-term board (`KIND_TO_SLUG`, `zoneAnnotations.mjs:24`; firing loop :468-473) and the phrase then floats record-wide. Grader-verified board-false echoes: `eval-29` (A7b, non-retry), `eval-37` run 1, `pin-branch-invariance-true-2` — in each, the threat is `immediate` only on `afterPlayed`, while the model applied "next move" to the decision board. The term is offered on **25/63 records**. Per I13, the fix must NOT touch `zones.terms` membership (no widening/narrowing of the offer) — it qualifies the **description**, mirroring the existing T033 owner-attribution pattern (:455-459).

**Interfaces:** `describeTerm(slug, owners, boards)` gains a third argument (existing two-arg calls keep working — `boards` optional).

- [ ] **Step 1: Failing corpus-wide test:**

**Resolved (was flagged "verify before writing" — now confirmed at source):** `buildReasonRenderModel(fv).boards` exists and equals `selectBoards(pruned)`, whose elements are `{ id, shown, movestring, tags, terminal, ascii, reason }` — **but it is shown-only**, while production's `noteFired` iterates **ALL** of `boardSelectionDecisions(pruned)`, not just the shown subset. The test must call `boardSelectionDecisions(pruned)` directly (import it, or reach it the way other tests in the suite do) instead of filtering `model.boards`, so it exercises the same board set production's firing loop sees.

```js
test('immediate_threat term gloss names its board when the tag never fired on the decision board', async () => {
  // corpus loading idiom …
  for (const row of rows) {
    const fv = pruneVector(toNarratorVector(row.evidence));
    const model = buildReasonRenderModel(fv);
    const t = model.zones.terms.find((x) => x.slug === 'immediate_threat');
    if (!t) continue;
    // recompute where the tag fired from ALL board-selection decisions (production's noteFired
    // scope), not just the shown subset on model.boards:
    const decisions = boardSelectionDecisions(fv); // import from the module that defines it
    const firedBoards = decisions
      .filter((b) => ['decision', 'afterBest', 'afterPlayed'].includes(b.id))
      .filter((b) => (b.tags ?? []).some((tag) => tag.kind === 'immediate'))
      .map((b) => b.id);
    if (firedBoards.length && !firedBoards.includes('decision')) {
      assert.match(t.description, /after the (move|better move)/,
        `${row.id}: immediate_threat fired only on ${firedBoards.join(',')} but the gloss carries no board qualifier: "${t.description}"`);
    }
  }
});
```

- [ ] **Step 2: Run → FAIL** (eval-37 or eval-29 class).

- [ ] **Step 3: Implement.** Beside `firedOwners` (:461) add `const firedBoards = new Map(); // slug -> Set<boardId>`; in the board-tag loop (:468-473) record `board.id` for each `noteFired` hit (extend `noteFired(slug, owner, boardId)`); the half-tag loop (:474-483) passes no board. In the `terms` mapping (:484-487) pass `firedBoards.get(slug)` into `describeTerm`. In `describeTerm`, for `slug === 'immediate_threat'` when `boards` is non-empty and lacks `'decision'`:

```js
const where = boards.has('afterPlayed') && !boards.has('afterBest')
  ? 'true after the move you played, not on the current board'
  : boards.has('afterBest') && !boards.has('afterPlayed')
    ? 'true after the better move, not on the current board'
    : 'true on the follow-up boards, not on the current board';
return `${TERM_KB[slug].description} (${where})`;
```

- [ ] **Step 4: Test PASS; `test:fast` green** (grep for pinned `describeTerm` outputs and re-pin if any).

- [ ] **Step 5: Leave unstaged.**

---

### Task 5: Truthful role for the `afterPlayed` board-tag fork pivot (eval-47's unsatisfiable required handle)

**Files:**
- Modify: `connect-four/server/scripts/reason_engine/zoneAnnotations.mjs` — the T025 board-tag pivot offer (:298-320) and `roleText` (new `fork-pivot-played` kind, near :121)
- Test: `connect-four/server/tests/renderReasonModel.test.mjs` (append)

**Why (evidence):** `boardTagPivotCell` (:260-268) computes the pivot as the landing cell of the board's creating move. For the **afterPlayed** board that cell is the played move's own square — occupied on the very board the alias names — yet the role is `fork-pivot-now`: "the square ${plays} to CREATE the fork" (:121), instructing the player to play a filled square. On `eval-47` this became a **required** handle no answer could satisfy (`you-fork-pivot-2` spec `c3r6`, truthBoard `afterPlayed`; verified against `./visualize_board.sh 33211531304533201252211005442`). Note the trap from memory: occupied `future:` cells on **projected** boards are normal — this fix touches ONLY the near-term board-tag pivot path, nothing projected.

**Interfaces:** none outside the module.

- [ ] **Step 1: Failing test** (corpus fixture `eval-47`):

```js
test('eval-47: an afterPlayed board-tag pivot is described as the move already made, not a move to play', async () => {
  // load eval-47, build model
  const pivots = model.zones.aliases.filter((a) => a.handle.includes('fork-pivot') && a.truthBoard === 'afterPlayed');
  assert.ok(pivots.length, 'eval-47 must offer an afterPlayed board-tag pivot');
  for (const p of pivots) {
    assert.ok(!/to CREATE the fork/.test(p.role) || /just|already/.test(p.role),
      `${p.handle}: role still instructs playing an occupied square: "${p.role}"`);
  }
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement.** In `roleText` add (mover is always the player for an afterPlayed board, so the wording is owner-neutral and true for both fork owners):

```js
  if (kind === 'fork-pivot-played') return `the square your last move just filled — that move is what set up the fork`;
```

**Reconciling with Task 1's cross-owner uniqueness invariant:** the new `fork-pivot-played` role string carries no ownership word (`"the square your last move just filled — that move is what set up the fork"`), because the mover of an `afterPlayed` board is *always* the player — "your opponent's last move" would be false there, so embedding a possessive (the way Task 1 does for `future`) is not an option for this role. Task 1's new corpus test (`aliases owned by different players never share a role string`) would otherwise flag this string if both a `you-` and an `opp-` handle ever used it on the same board — but the same-board guard already prevents a you/opp pivot pair from colliding here, so this stays a theoretical, not a corpus-observed, conflict. Still, to be safe: **add an explicit exemption to Task 1's corpus test** for this exact role string (with a comment explaining the mover is always the player), rather than leaving it to rely on the same-board guard implicitly.

In the T025 offer (:315) select the kind by board:

```js
aliases.push({ handle: ph, spec: pivot,
               role: roleText(tag.owner, board.id === 'afterPlayed' ? 'fork-pivot-played' : 'fork-pivot-now'),
               truthBoard: board.id, kbId: null });
```

- [ ] **Step 4: Test PASS; `test:fast` green** (the T025/OI-193 dedupe-exception tests must stay green — this changes only the role string, never the handle/spec/dedupe logic).

- [ ] **Step 5: Leave unstaged.**

---

### Task 6: L3 states the cause, and its inevitability claim is gated; L5 gains a causal connective (A7a — the largest deterministic non-retry cluster)

**Files:**
- Modify: `connect-four/server/scripts/reason_engine/causalLinks.mjs` — L3 template (:221), L5 template (:306-310), plus one new module-private helper
- Test: `connect-four/server/tests/causalLinksComposers.test.mjs` (append; existing pins at :69 and `reasonRealizedDenied.test.mjs:122` use regexes that tolerate the change — verify, don't assume)

**Why (evidence):** L3's verbatim tail is `"…Column ${col1(fv.bestCol)} makes your opponent work hardest for it; the move you played only speeds up the finish."` — outcome, no mechanism. `eval-37` and `eval-42` fail A7a **3/3 deterministically** (two independent graders agreed on eval-37); no retry trigger touches them. Grader-verified: the cause exists in the record's own data (eval-37: played col 0 lands at c1r3, directly beneath `opponentPunishment.completingCell` c1r4 — a gravity-verified mate-in-1 handed over; eval-42: `patternOnAfterBestBoard === false`, so L3's "is coming no matter what you play here" is itself board-false there). `eval-28` (L5) fails A7a 3/3 the same way. Harvested values: eval-37 `pOABB=true, played=0, completingCell=c1r4, register=immediate`; eval-42 `pOABB=false, played=3, completingCell=c3r2, register=immediate`.

**GUARDRAIL — read before writing any new clause:** L3's `when` fires only on `lose_to_faster_lose`, and L3's guardrail string (`causalLinks.mjs`, verbatim) reads: `'MUST NOT say the played move caused or enabled the pattern, and MUST NOT tell the player they are lost; both moves lose…'`. **No new L3 clause may assert that the played move caused, enabled, or opened the door to the pattern — in either branch of `ctx.patternOnAfterBestBoard`.** `eval-42` is the only L3 corpus record with `pOABB === false`; `pin-L3-no-causation` has `pOABB === true`, so the `/didn't create it/i` pin at `causalLinksComposers.test.mjs:66` is untouched by this task and must still pass. Re-read every new L3 clause against this guardrail string before landing — it is a hard MUST NOT, not a style preference.

**Interfaces:** templates already receive `(fv, ctx)` — `classifyCausalLink` (:334) calls `link.template(fv, ctx)`, and `buildReasonRenderModel` supplies `ctx.patternOnAfterBestBoard` whenever `direction === 'enabled_opponent'` (`renderReasonModel.mjs:194-196`), which L3's `when` guarantees. `parseBoardState` is already imported (:5).

- [ ] **Step 1: Failing tests** (build both fixtures from the corpus by id; L3 is reachable through `classifyCausalLink(fv, { patternOnAfterBestBoard })` exactly as `buildReasonRenderModel` calls it):

```js
test('L3 names the concession, not just the outcome (eval-37: played move fills the square beneath the finish)', async () => {
  // fv = eval-37 pruned vector; ctx = { patternOnAfterBestBoard: true }
  const link = classifyCausalLink(fv, ctx);
  assert.equal(link.id, 'L3');
  assert.match(link.text, /right beneath|step your opponent finishes on/);
  assert.ok(!/only speeds up the finish\.$/.test(link.text));
});

test('L3 does not claim inevitability, and does not assert causation, when the pattern is absent from the after-best board (eval-42)', async () => {
  // fv = eval-42; ctx = { patternOnAfterBestBoard: false }
  const link = classifyCausalLink(fv, ctx);
  assert.ok(!link.text.includes('no matter what you play here'), link.text);
  assert.ok(!/your move (opened|enabled|caused)/i.test(link.text), link.text);
  assert.match(link.text, /the punishment waiting in this position/);
});
```

- [ ] **Step 2: Run → FAIL both.**

- [ ] **Step 3: Implement.** Add the helper (uses only fields already on the vector; abstains to the current wording when nothing stronger is provable — I2):

```js
// A7a (eval-37/eval-42): "only speeds up the finish" is an outcome. When the vector proves a
// concrete concession, say it; otherwise keep the (weaker but true) existing sentence.
function playedConcession(fv) {
  const m = /^c(\d+)r(\d+)$/.exec(fv.opponentPunishment?.completingCell ?? '');
  if (m && fv.playedCol != null) {
    try {
      const { colHeights } = parseBoardState(fv.movestring ?? '');
      const landRow = colHeights[fv.playedCol];
      if (landRow != null && landRow < 6
          && Number(m[1]) - 1 === fv.playedCol && Number(m[2]) - 1 === landRow + 1) {
        return 'filled the square right beneath that finishing square — it now sits ready one move sooner.';
      }
    } catch { /* fall through to the honest default */ }
  }
  if (fv.opponentPunishment?.register === 'immediate') {
    return 'lets it land right away instead of making your opponent earn it.';
  }
  return 'only speeds up the finish.';
}
```

Rewrite L3's template (keep every helper call it already makes — `plainTagForCellGrain`, `cellColumn`, `col1` — byte-identical):

```js
template: (fv, ctx) => {
  const pattern = `Your opponent's ${plainTagForCellGrain(fv.opponentPunishment?.tag, fv.movestring, fv.player, fv.opponentPunishment?.completingCell, 'opp')} in ${cellColumn(fv.opponentPunishment?.completingCell)}`;
  const opener = ctx?.patternOnAfterBestBoard === true
    ? `${pattern} is coming no matter what you play here — your move didn't create it.`
    : `${pattern} is the punishment waiting in this position.`;
  return `${opener} Column ${col1(fv.bestCol)} makes your opponent work hardest for it; the move you played ${playedConcession(fv)}`;
},
```

For **L5**, append one causal sentence to the existing template's return (everything before it byte-identical):

```js
return `You had a forced win — … the played move let the opponent deny it at ${cellPhrase(denial, others)}.`
  + ` That denial is the cause: your winning line ran through that square, and the move you played gave your opponent the tempo to take it away.`;
```

- [ ] **Step 4: New tests PASS. Run `test:fast`** — the pins at `causalLinksComposers.test.mjs:69` (`/work hardest|speeds up the finish/i`) and `reasonRealizedDenied.test.mjs:122` still match ("work hardest" survives). Re-pin any exact-match assertions deliberately. Also re-run the four-verbatim-text tests noted in memory (`project_reason_opening_traps`).

- [ ] **Step 4b (mandatory re-read):** before landing, re-read every new/changed L3 clause (the `opener` ternary and `playedConcession`'s branches) against L3's guardrail string verbatim: `'MUST NOT say the played move caused or enabled the pattern, and MUST NOT tell the player they are lost; both moves lose…'`. Confirm neither branch of `opener`, nor `playedConcession`'s first branch, contains "caused", "enabled", "opened the door", or any other causation-asserting phrase. This is a hard MUST NOT — treat any hit as a blocking defect, not a style nit.

- [ ] **Step 4c: L5 abstention.** Verified 2026-09-01: on all 9 L5 corpus records the denial cell is a member of `lostResource.window`, so the new L5 sentence (Step 3) is board-true 9/9 today. Still, add an abstention: skip appending the new causal sentence when `lostResource.window` is absent (I2 — never fabricate a claim the vector can't support), keeping L5's existing (weaker but true) sentence in that case.

- [ ] **Step 5: Sanity: replay eval-37/eval-42/eval-28 link text** with a one-off node snippet printing `classifyCausalLink` output for each, and eyeball that every clause is board-true against `./visualize_board.sh` of the relevant movestrings (eval-37 `3321133345501122252551125036666` + played 0; eval-42 `3113302513454460055` + played 3). Leave unstaged.

---

### Task 7: Realized-pattern fork halves get their prongs and (validated) pivot offered — and required (A7c core, 10 records)

**Files:**
- Create (scratch only, not committed): validation script in the session scratchpad
- Modify: `connect-four/server/scripts/reason_engine/zoneAnnotations.mjs` (`buildAnnotationOffer` — a new realized-fork family beside the deep-fork loop at :331-334; `FORK_TAGS` at :130 is reused)
- Test: `connect-four/server/tests/renderReasonModel.test.mjs` (append)

**Why (evidence):** `forkPivotCell` (:139-146) requires `half.tacticTag` + `half.line`; a `realized_pattern` half carries `tag`/`cells`/`windows` instead, so **13/63 records have a fork-tagged half with zero `*-fork-pivot` aliases** (measured 2026-09-01), and the fork's second winning square can go entirely unoffered. Grader-verified: `eval-44` A7c **3/3, missing_info, not retry-catchable** (pivot c6r1 = last ply of `opponentPunishment.finalMovestring` `44315`); `pin-L2` A7b 2/3 render_bug (winning squares c2r1 AND c6r1 on the engine's own `finalMovestring` `33432`, c6r1 has no handle). Scope: the **10 realized-pattern records** (`eval-42, eval-43, eval-44, eval-46, eval-49, eval-50, pin-L2-enabled-opponent, pin-L3-no-causation, pin-branch-invariance-true-1, pin-branch-invariance-false`); the 3 `winning_line`-half records that also lack pivots (`eval-11, eval-12, pin-L6-lost-win-and-gave-one`) are **out of scope** — file them in the task report, do not improvise.

**Scope correction (F4, verified against `evidence.jsonl`):** of the 10 records, only **4 have a genuine 2-prong realized fork** — `eval-43, eval-44, pin-L2-enabled-opponent, pin-branch-invariance-false` (`cells.length === 2`). The other 6 — `eval-42, eval-46, eval-49, eval-50, pin-L3-no-causation, pin-branch-invariance-true-1` — have `cells.length === 1`: a single-cell realized pattern, not a prong pair to offer. **The prong-pair offer applies to the 4 two-prong records only.** The pivot logic (Step 3) still applies to all 10 — do not let a `cells.length < 2` guard skip the pivot for the other 6 (that guard belongs on the prong-offer block only, not the whole loop).

**Interfaces:** new aliases use existing handle families: `mkHandle('you-double')`/`('opp-double')` for the prongs pair, `mkHandle('you-fork-pivot')`/`('opp-fork-pivot')` for the pivot; roles via existing `roleText` kinds `double` and `fork-pivot-now`. `half.owner` is **numeric** (`1`|`2`), never the strings `'you'`/`'opp'` — use the existing `halfOwner(half, side)` helper (already used elsewhere for this exact reason, D47) to get the `'you'|'opp'` owner; there is no string-valued `half.owner` to branch on.

- [ ] **Step 1 (I12 GATE — run before writing any production code): validate the pivot rule through the production detector.** Scratch script over the 10 record ids: load each from `evidence.jsonl`, take the half with `kind === 'realized_pattern'` (it may sit under `lostResource` OR `opponentPunishment` — check both), candidate pivot = landing cell of the **last ply of `half.finalMovestring`**. Validate with `detectDoubleThreat` from `connect-four/server/classifier.js` (the production detector — never a hand-rolled proxy): the tag's owner has a double threat on `finalMovestring` and does NOT on `finalMovestring` minus its last character. For a `figure_7` tag, run `detectDoubleThreat` too (figure-7 is a fork; `FORK_TAGS` treats them identically at :130) — if it does not fire, record that id as FAILED. **Print a 10-row table (id, tag, pivot cell, pass/fail) into the task report.** Note this gate runs over **all 10** records (pivot logic is not scope-restricted to the 4 two-prong ones — see the Scope correction above).
  - If **all 10 pass** → implement pivot for all 10 (Step 3 full), prong-pair offer for the 4 two-prong records only.
  - If **any fail** → implement pivot only for the passing subset **if the failures are explainable at source** (e.g. the fork predates the final ply); otherwise omit the pivot for that id and record the finding. The prong-pair offer for the 4 two-prong records is unaffected by this gate's outcome.

- [ ] **Step 2: Failing corpus test** (data-driven — write it to expect the Step-1 outcome; full version shown):

```js
test('realized fork halves offer a prong pair (2-prong records) and a pivot (D48 known-limit closure)', async () => {
  const REALIZED_FORK_IDS = ['eval-42','eval-43','eval-44','eval-46','eval-49','eval-50',
    'pin-L2-enabled-opponent','pin-L3-no-causation','pin-branch-invariance-true-1','pin-branch-invariance-false'];
  // corpus loading idiom …
  for (const id of REALIZED_FORK_IDS) {
    const row = rows.find((r) => r.id === id);
    const fv = pruneVector(toNarratorVector(row.evidence));
    const model = buildReasonRenderModel(fv);
    const half = [fv.lostResource, fv.opponentPunishment].find((h) => h?.kind === 'realized_pattern');
    if (half.cells.length >= 2) {
      const prongSpec = 'windows:' + half.cells.join(',');
      assert.ok(model.zones.aliases.some((a) => a.spec.replace(/^future:/, '') === prongSpec),
        `${id}: fork prongs ${prongSpec} not offered`);
    }
    // pivot: assert per the Step-1 validation outcome for this id (pass → pivot present;
    // explainable fail → pivot absent and noted; do not assert blindly for every id).
    assert.ok(model.zones.aliases.some((a) => a.handle.includes('fork-pivot')),
      `${id}: no fork pivot offered`);   // drop/adjust this assert for ids the Step-1 gate failed
  }
});
```

- [ ] **Step 3: Implement** in `buildAnnotationOffer`, **after** the existing `halfPairs`/half-resource loops (not spliced in the middle of them — F5: this loop must not add to `seen` before those loops run, or it will evict existing aliases that the older loops would otherwise offer/dedupe against). Reuse the existing pivot-collision abstention guard **verbatim** — `zoneAnnotations.mjs` already has one for exactly this case (comment: "Fix round 4 (finding 3)… Abstain (I2)"): `const otherCells = new Set([otherHalf?.completingCell, otherHalf?.cell, …])` then `if (pivot && !otherCells.has(pivot))`. Do not re-derive that guard by hand.

```js
// Realized-pattern forks (D48 known limit): the deep-fork loop above requires `tacticTag`; a
// realized_pattern half carries `tag`/`cells`/`finalMovestring` instead (see the field-shape note
// at :475-478), so its fork got no prong pair and no pivot. Same offer families, realized shape.
// Runs AFTER the existing halfPairs/half-resource loops (F5): must not evict their aliases via `seen`.
for (const [half, otherHalf, side] of [[pruned.lostResource, pruned.opponentPunishment, 'you'], [pruned.opponentPunishment, pruned.lostResource, 'opp']]) {
  if (!half || half.kind !== 'realized_pattern' || !FORK_TAGS.has(half.tag)) continue;
  const owner = halfOwner(half, side); // half.owner is NUMERIC (1|2), never 'you'/'opp' — use the existing helper (D47)
  // truthBoard (F7): lostResource realized halves are shown on decision/afterBest (no afterPlayed
  // board in the prompt); opponentPunishment realized halves are shown on afterPlayed.
  const truthBoard = half === pruned.lostResource ? 'afterBest' : 'afterPlayed';

  // Prong pair — 2-prong records only (F4: cells.length === 1 on 6/10 records; nothing to pair there).
  if (Array.isArray(half.cells) && half.cells.length >= 2) {
    const prongSpec = 'windows:' + half.cells.join(',');
    if (!seen.has(prongSpec)) {
      seen.add(prongSpec);
      const h = mkHandle(`${owner}-double`);
      aliases.push({ handle: h, spec: prongSpec, role: roleText(owner, 'double'), truthBoard, kbId: 'double_threat' });
      zoneAliasMap[h] = prongSpec;
    }
  }

  // Pivot — for ALL realized-fork halves regardless of cells.length (F4), only if the Step-1 I12
  // gate passed for this record's shape:
  const last = half.finalMovestring?.at(-1);
  if (last != null) {
    const col = Number(last);
    let pivot = null;
    try {
      const { colHeights } = parseBoardState(half.finalMovestring.slice(0, -1));
      const row = colHeights[col];
      if (row != null && row < 6) pivot = `c${col + 1}r${row + 1}`;
    } catch { /* abstain (I2) */ }
    // F5: reuse the existing otherCells abstention guard verbatim — never offer a pivot that
    // collides with the OTHER half's completingCell/cell (already offered+required there).
    const otherCells = new Set([otherHalf?.completingCell, otherHalf?.cell].filter(Boolean));
    if (pivot && !otherCells.has(pivot) && !(half.cells ?? []).includes(pivot) && !seen.has(pivot)) {
      seen.add(pivot);
      const ph = mkHandle(`${owner}-fork-pivot`);
      aliases.push({ handle: ph, spec: pivot, role: roleText(owner, 'fork-pivot-now'), truthBoard, kbId: null });
      zoneAliasMap[ph] = pivot;
    }
  }
}
```

**truthBoard caveat (verify, don't assume):** the `truthBoard` derivation above (F7: `'afterBest'` for `lostResource`, `'afterPlayed'` for `opponentPunishment`) fixes the case where the realized half sits under `lostResource` (`eval-49`/`eval-50`) and the record's shown boards are `decision, afterBest` with no `afterPlayed` — citing `afterPlayed` there would reference a board the prompt never renders. Still verify board-truth per record: In eval-44 the fork forms on the opponent's reply (finalMovestring `44315` = decision `443` + played `1` + opp `5`), i.e. one ply AFTER `afterPlayed`. Before finalizing, check each of the 10 records' prong cells with the production board model (`parseBoardState` + the same `statusOf` approach D50 uses) on the derived `truthBoard`; where the prongs are not yet threats there, use the half's own register to decide: `register === 'immediate'` → keep the derived `truthBoard` with the existing `double` role (the threat is one forced ply away and the role says "get winning squares", not "has them now") — but if that reads over-claiming on inspection, fall back to `future:`-prefixing the spec with `roleText(owner,'future-fork')`, which is the established pattern for not-yet-true forks. Record which branch each record took in the task report. Add a corpus-wide assertion: every alias's `truthBoard` is among that record's `model.boards[].id`.

- [ ] **Step 3b (F5 — no eviction, corpus-wide negative test):** before landing, snapshot the alias handle list this loop's predecessor code offers for the 10 record ids (i.e. run the corpus once on pre-Step-3 code and record every alias `handle` per id). After Step 3 lands, assert for each of the 10 ids that every handle in that pinned snapshot is still present in `model.zones.aliases` (the new loop only WIDENS the offer, never evicts).

- [ ] **Step 4: Test PASS; `test:fast` green.** Watch two seams: (a) `deriveRequiredSet` may now match these (that's Task 8's concern — run Task 8's tests after both land; note Task 7's new prong/pivot aliases are OFFERED but never REQUIRED by Task 8's `deriveRequiredSet`, since `halfForkCellsSpec` reads `tacticTag`, which realized halves lack — requiring them is out of scope this wave, see the Out-of-scope section); (b) the D48 display⊆offer corpus test must stay green (new aliases only widen the OFFER, allowed).

- [ ] **Step 5: Leave unstaged.**

---

### Task 8: `deriveRequiredSet` composition — L6 requires both lines (swap, cap stays 3); L7 requires the player's own counterplay

**Files:**
- Modify: `connect-four/server/scripts/renderReasonModel.mjs` — `deriveRequiredSet` (:135-190)
- Test: `connect-four/server/tests/renderReasonModel.test.mjs` (append + reconcile existing `D45:` tests)

**Why (evidence):** (a) L6's guardrail (`causalLinks.mjs:316`) says verbatim `'You gave up a win AND handed the opponent their own; name both lines with their horizons.'`, but D45's single line slot (:174-178) can require only one — `eval-4` fails A7b 3/3 with `opp-key-line` offered-but-unrequired; per real blunder this is **46.1%** (probe D4 — regex now confirmed at source: only L6's guardrail matches `/both lines|name both/`). Owner decision 2026-09-01: **swap, keep cap 3** — on L6 records required = both line groups + one key square. (b) L7 records can spend all 3 slots on the opponent's fork while the player's own counterplay resource sits offered-only: `eval-30` (A7b 2/3, render_bug, non-retry) required `opp-future-fork/opp-fork-pivot/opp-key-line` while `you-double`/`you-fork-pivot` were offered.

**Interfaces:** `deriveRequiredSet(pruned, zones, linkId)` gains a **third parameter with a default of `undefined`**, so existing two-arg call sites keep working unchanged. Do NOT re-derive L6/L9 membership from `kind` fields alone — L9's `when` does not constrain `opponentPunishment.kind`, and L9 precedes L6 in the link table, so a `bothWinning` test computed purely from `lostResource?.kind === 'winning_line' && opponentPunishment?.kind === 'winning_line'` **over-matches L9 records** (`eval-31`, `eval-35`, `pin-L9-hedged-parity` are all L9 and satisfy that shape) — L9's guardrail says "hedge — do not fabricate a crisp cause", and rewriting its required set would violate that guardrail. Branch on the **actual routed link id**, not on kind fields: `buildReasonRenderModel` already computes `link` before calling `deriveRequiredSet` (`renderReasonModel.mjs`) — thread it through: change every call site to `deriveRequiredSet(pruned, zones, link.id)`, and inside the function branch on `linkId === 'L6'` / `linkId === 'L7'`. **Grep and update ALL call sites of `deriveRequiredSet`** in `renderReasonModel.mjs` (there are three, approximately at :220, :236, :345 — line numbers drift, locate by symbol name) — note that `buildRenderDecision` also computes/needs the link and must pass its `linkId` too.

- [ ] **Step 1: Failing tests** (real harvested specs — do not invent):

```js
test('D-2026-09-01: an L6 record requires BOTH lines plus one key square (eval-4)', async () => {
  // load eval-4, build model
  const specs = model.requiredSet.map((g) => g.spec);
  assert.ok(specs.includes('future:windows:c2r5,c3r5,c4r5,c5r5'), 'you-key-line missing: ' + specs);
  assert.ok(specs.includes('future:windows:c3r2,c4r2,c5r2,c6r2'), 'opp-key-line missing: ' + specs);
  assert.equal(model.requiredSet.length, 3);
});

test('D-2026-09-01: an L7 record with an offered you-fork requires it (eval-30)', async () => {
  const handles = model.requiredSet.map((g) => g.handle);
  assert.ok(handles.some((h) => h.startsWith('you-double') || h.startsWith('you-fork-pivot')),
    'no player-owned counterplay handle required: ' + handles);
});
```

Plus the corpus-wide guardrail-consistency test (the model-free probe-D4 equivalent), **skipping fork-carrying L6 records** (F3 — see Step 3):

```js
test('no L6 record leaves an offered line handle unrequired (corpus-wide, non-fork L6 only)', async () => {
  for (const row of rows) {
    const fv = pruneVector(toNarratorVector(row.evidence));
    const model = buildReasonRenderModel(fv);
    if (model.link.id !== 'L6') continue;
    if (halfForkCellsSpec(fv.lostResource) || halfForkCellsSpec(fv.opponentPunishment)) continue; // fork-carrying — different rule, see Task 8 Why
    const lineSpecs = model.zones.aliases.filter((a) => a.spec.includes('windows:')).map((a) => a.spec);
    const requiredLines = model.requiredSet.filter((g) => g.spec.includes('windows:'));
    assert.ok(requiredLines.length >= Math.min(2, lineSpecs.length),
      `${row.id}: L6 with ${lineSpecs.length} offered lines but only ${requiredLines.length} required`);
  }
});

test('D-2026-09-01: fork-carrying L6 records keep their existing (unswapped) required set (corpus-wide)', async () => {
  const FORK_L6_IDS = ['eval-7','eval-8','eval-11','eval-12','eval-18','eval-20','eval-25','eval-26'];
  for (const id of FORK_L6_IDS) {
    const row = rows.find((r) => r.id === id);
    const fv = pruneVector(toNarratorVector(row.evidence));
    const before = /* requiredSet built on pre-change code, pinned from a snapshot taken before Step 3 lands */ undefined;
    const model = buildReasonRenderModel(fv);
    // assert model.requiredSet is byte-identical to the pinned pre-change snapshot for this id
  }
});

test('D-2026-09-01: L9 required sets are untouched by the L6 swap (eval-31, eval-35, pin-L9-hedged-parity)', async () => {
  for (const id of ['eval-31', 'eval-35', 'pin-L9-hedged-parity']) {
    const row = rows.find((r) => r.id === id);
    const fv = pruneVector(toNarratorVector(row.evidence));
    const model = buildReasonRenderModel(fv);
    assert.equal(model.link.id, 'L9', `${id}: expected L9 routing`);
    // assert model.requiredSet is byte-identical to a pinned pre-change snapshot for this id —
    // L9's guardrail ("hedge — do not fabricate a crisp cause") forbids the both-lines rewrite.
  }
});
```

- [ ] **Step 2: Run → FAIL (eval-4 and eval-30).**

- [ ] **Step 3: Implement.** Do not re-implement link predicates from `kind` fields — that over-matches L9 (F2). Thread the routed `linkId` through instead: change `deriveRequiredSet`'s signature to `(pruned, zones, linkId)` and every call site (grep — there are three in `renderReasonModel.mjs`, plus `buildRenderDecision`) to pass `link.id`. In `deriveRequiredSet`, after the `aliasBySpec`/`push` setup, branch:

```js
function halfForkCellsSpec(half) {
  // true when this half carries fork data (D45/D48 shapes: tacticTag+line, or realized_pattern
  // fork tag with cells.length >= 2) — used to exclude fork-carrying halves from the L6 swap.
  if (!half) return false;
  if (half.tacticTag && FORK_TAGS.has(half.tacticTag)) return true;
  if (half.kind === 'realized_pattern' && FORK_TAGS.has(half.tag) && Array.isArray(half.cells) && half.cells.length >= 2) return true;
  return false;
}

const bothWinning = linkId === 'L6'
  && !halfForkCellsSpec(pruned?.lostResource) && !halfForkCellsSpec(pruned?.opponentPunishment);
if (bothWinning) {
  // Owner decision 2026-09-01 (swap, cap 3): L6's guardrail demands BOTH lines; give the two
  // line groups the first two slots and ONE key square the third. D45's substance (the line is
  // required, lostResource first) is preserved; only the L6 composition changes.
  //
  // OWNER FLAG: this swap is implemented for NON-FORK L6 records only (eval-4's class). Measured
  // 2026-09-01: 8 L6 records require the fork-cells group and 6 require a fork pivot
  // (eval-7/8/18/20/25 → you-future-fork, opp-key-square, you-fork-pivot; eval-26 →
  // you-future-fork, opp-future-fork, opp-fork-pivot; eval-11/12 → you-future-fork,
  // opp-key-square, you-key-line). Fork-carrying L6 records (eval-7/8/11/12/18/20/25/26) keep
  // their existing D45/D48 derivation — requiring both lines there would delete the fork pivot,
  // contradicting D48 rule 3. Re-raise with the owner if both-lines should also apply to fork
  // records; do not extend this branch to fork halves without that decision.
  for (const half of HALVES) push(half, halfLineSpec(pruned?.[half]));
  for (const half of HALVES) {
    if (groups.length >= 3) break;
    if (push(half, denialCell(pruned?.[half]))) break;
  }
} else {
  /* existing derivation body, byte-identical: point groups → pivots → single line slot —
     this now also covers fork-carrying L6 records unchanged */
}
// L7 (causalLinks.mjs:263-264): the actionable half of a swindle record is the player's own
// resource; if nothing 'you-'-owned made it in, swap the opponent line group out for it.
const isSwindle = linkId === 'L7';
if (isSwindle && !groups.some((g) => g.handle.startsWith('you-'))) {
  const own = (zones?.aliases ?? []).find((a) => a.handle.startsWith('you-double'))
    ?? (zones?.aliases ?? []).find((a) => a.handle.startsWith('you-fork-pivot'));
  if (own && !groups.some((g) => g.spec === own.spec)) {
    const victim = groups.findIndex((g) => g.handle.startsWith('opp-') && /-line(-\d+)?$/.test(g.handle));
    const entry = { half: 'lostResource', spec: own.spec, handle: own.handle, role: own.role, truthBoard: own.truthBoard };
    if (groups.length < 3) groups.push(entry);
    else if (victim >= 0) groups[victim] = entry;
    else groups[groups.length - 1] = entry;
  }
}
```

The trailing `better-col` free-slot push (:186-188) and `return groups.slice(0, 3)` stay byte-identical (D54 untouched — never displaced).

- [ ] **Step 4: `test:fast` — reconcile, don't weaken.** The **eight** `D45:`-prefixed tests in `renderReasonModel.test.mjs` (at approximately :355, :366, :376, :385, :399, :408, :423, :433 — locate by symbol/prefix, not line number) pin the old composition. Verified 2026-09-01: **none of their fixtures set `kind`** on `lostResource`/`opponentPunishment`, so none of them hit the new `linkId === 'L6'`/`'L7'` branches — the reconciliation step here is expected to be a **no-op** for those eight; do not force changes into them. Every non-L6/L7 fixture, and every fork-carrying L6 fixture (F3), must be byte-identical before/after — assert this while developing with a quick corpus diff script: build all 63 requiredSets on the old and new code and confirm only the non-fork L6 and L7 records changed — paste the changed-id list into the task report.

- [ ] **Step 5: Leave unstaged.**

---

### Task 9: Frequency probe honesty — by-design OMITs out of the denominator, typed refusal, dead-fork sizing detector

**Files:**
- Modify: `connect-four/server/scripts/reason_corpus/frequency_probe.mjs` (main loop :134-153, DETECTORS :120-125)
- Modify: `connect-four/server/scripts/renderReasonModel.mjs` (a shared guard helper called at the top of **both** `buildReasonRenderModel` AND `buildRenderDecision`)
- Test: `connect-four/server/tests/renderReasonModel.test.mjs` (append)

**Why (evidence):** Re-run 2026-09-01 with error capture (seed 12345, 40 games): the 36 "untriaged buildRenderDecision throws" are **35× `win_to_slower_win`** and **1× `lose_to_faster_lose` with `gate.verdict === 'NotABlunder'`** (reproduced on `223154201544255` played 0) — all by-design OMITs (I4/D3/D4), zero real defects. But they surface as `classifyCausalLink: no rule matched`, indistinguishable from a genuine routing gap, and they inflate the probe's blunder denominator.

**Coverage + production-semantics correction (F9):** the probe calls `buildRenderDecision`, and `buildRenderDecision` calls `classifyCausalLink` **itself** — a guard placed only inside `buildReasonRenderModel` never runs on that path and misses the exact failure the probe hits. Put the guard in a small shared helper and call it at the top of **both** functions. Separately: **production never reaches either function for these cases.** `computeMechanism` returns `{ notABlunder: true }` **early**, before `buildReasonRenderModel`/`buildRenderDecision` are invoked, whenever `evidence.notABlunder` is set — and `reasonEngine.mjs` sets that flag for `win_to_slower_win` and the gate verdict. So this guard is a probe/test-harness correctness fix (it makes the frequency probe and any test that calls these two functions directly see a typed error instead of a bogus "no rule matched"), not a production-path fix — in production, `computeMechanism`'s early return already prevents these OMITs from ever reaching `classifyCausalLink`. Also: `server/index.js`'s catch around the deep-reveal call returns an **HTTP 500** on an uncaught throw, not a graceful no-reveal — do not describe it as graceful.

- [ ] **Step 1: Failing test for the typed refusal:**

```js
test('a by-design OMIT raises NotABlunder, not "no rule matched" (via buildRenderDecision)', async () => {
  // Build the vector for movestring 223154201544255, played 0 — reuse the corpus idiom if a
  // matching record exists, else compute it live with computeReason + a solver (destroy() in
  // finally). Then, calling buildRenderDecision — the function the frequency probe actually
  // calls, and which calls classifyCausalLink itself:
  assert.throws(() => buildRenderDecision(fv), /NotABlunder/);
});

test('a by-design OMIT raises NotABlunder from buildReasonRenderModel too', async () => {
  assert.throws(() => buildReasonRenderModel(fv), /NotABlunder/);
});
```

(If the live-solver test is too slow for `test:fast`, construct the minimal vector shape instead: `{ case: 'lose_to_faster_lose', gate: { verdict: 'NotABlunder' } }` and `{ case: 'win_to_slower_win' }` — the guard below keys only on those two fields, so this fixture exercises the real branch, not an imagined one.)

- [ ] **Step 2: Implement the guard as a shared helper, called at the top of BOTH `buildReasonRenderModel` AND `buildRenderDecision`** (F9 — a guard in only one of them misses the other's independent call into `classifyCausalLink`):

```js
function guardNotABlunder(nvOrPruned) {
  if (nvOrPruned.case === 'win_to_slower_win'
      || (nvOrPruned.case === 'lose_to_faster_lose' && nvOrPruned.gate?.verdict === 'NotABlunder')) {
    throw new Error(`NotABlunder: by-design OMIT (${nvOrPruned.case}) — no deep reveal for this move`);
  }
}
```

Call `guardNotABlunder(nvOrPruned)` at the top of `buildReasonRenderModel`, and again at the top of `buildRenderDecision` (before it reaches its own `classifyCausalLink` call). Then verify, don't assume: `computeMechanism` already returns `{ notABlunder: true }` early (approx `mechanismExplainer.mjs:184`) whenever `evidence.notABlunder` is set — set by `reasonEngine.mjs` for `win_to_slower_win` and the gate verdict — which means **this guard is unreachable on the production request path**; it only matters for direct callers (the frequency probe, and any test that calls `buildReasonRenderModel`/`buildRenderDecision` without going through `computeMechanism` first). Confirm this at source and say so in the task report. Also confirm at source that `server/index.js`'s catch around the deep-reveal call returns an **HTTP 500** on an uncaught throw from this path — it is not a graceful no-reveal; do not claim otherwise in the report.

- [ ] **Step 3: Probe denominator.** In `frequency_probe.mjs`'s loop, after `nv = toNarratorVector(evidence)`, add:

```js
if (nv.case === 'win_to_slower_win'
    || (nv.case === 'lose_to_faster_lose' && nv.gate?.verdict === 'NotABlunder')) { omittedByDesign++; continue; }
```

and print `omittedByDesign` beside the existing error counts. Also make both `catch {}` blocks record the error message (grouped counts), so the next unexplained throw is self-triaging.

- [ ] **Step 4: Add the D5 sizing detector** (pin-L6's class — measurement only, no fix this wave):

```js
// D5: a fork offered for a player on a near-term board where the OTHER side moves next and can
// immediately occupy a prong (gravity-top) — the fork is refutable on the spot (pin-L6's class).
```

Implement mechanically from `rd.zones.aliases` (`-double` handles on `decision`/`afterBest`/`afterPlayed`) + `boardMs`/`occupied` helpers already in the file + side-to-move from movestring length parity. Register as `['D5 dead fork offered as live', d5]`.

- [ ] **Step 5: `test:fast` green; re-run the probe** (`cd connect-four && node server/scripts/reason_corpus/frequency_probe.mjs --games 40 --seed 12345`) and paste the new table (with `omittedByDesign` and D5's rate) into the task report. Leave unstaged.

---

### Task 10: Grader calibration — is Sonnet inside the Opus-vs-Opus disagreement band?

**Files:** no production files. Outputs: `connect-four/server/scripts/reason_corpus/runs/parts_var_sonnet/<id>__D.json` (one per case) + a comparison table in the task report. (These are git-ignored; the owner decides what to keep.)

**Why:** Owner decision: calibrate before switching grader models. Existing instrument: `runs/parts_var_new/` (5 cases of the current run: `eval-32, eval-34, eval-37, eval-41, eval-9`) and `runs/parts_var_base/` (5 cases of the 08-06 baseline) are blind second Opus passes; the measured Opus-vs-Opus band is ±20% on A4/A7/G1, 0% on A1/A2/A3/A5/A6/G2/G3/G6, triage agreement 8/10.

**Executor note:** this task is orchestrated by the main session (it *is* the dispatching of grader agents), not by a single implementation subagent.

- [ ] **Step 1:** For each of the 10 var-case ids, dispatch one grading agent with **`model: "sonnet"`**, the per-case dispatch template from `.claude/skills/grade-fv-sufficiency/SKILL.md` pointing at `runs/GRADER_INSTRUCTIONS_v2.md` (the SOLE rubric), the correct answers stem for that id's dataset (`fv_suff_answers_boards_2026-08-28T18-35-46Z` for parts_var_new ids; `fv_suff_answers_boards_2026-08-06T16-04-29Z_served` for parts_var_base ids), and output path `runs/parts_var_sonnet/<id>__D.json`. **Do not touch any existing grade file.**
- [ ] **Step 2:** Build the comparison: per axis (A4, A7, G1 primarily; all axes reported), per case: Sonnet vs Opus-pass-1 and Sonnet vs Opus-pass-2 run-level agreement; triage-label agreement out of 10.
- [ ] **Step 3: Decision rule (pre-registered):** adopt Sonnet for the Task-11 smoke grading iff (a) Sonnet-vs-Opus disagreement on A4/A7/G1 ≤ the Opus-vs-Opus band (±20% run-level) AND (b) triage agreement ≥ 8/10. Otherwise stay on Opus for grading and record the numbers. Either way, the final full baseline (Task 12, PENDING) uses whichever grader this task adopts, **and that choice is recorded in `runs/README.md`** — a grader-model change is a rubric-comparability event, same rule as rubric versions.

---

### Task 11: Smoke-set regeneration + grading (14 cases × 3 runs — the counterexample measurement)

**Prerequisite:** Tasks 1–8 landed, `test:fast` green. **LLM cost:** 42 generation calls (gpt-5.4-mini) + 14 grader agents (~78% cheaper than a full re-grade). Approved scope per owner (2026-09-01): targeted grading instead of full.

**The 14 ids and what each one tests:**

| id | targets | expectation |
|---|---|---|
| eval-37, eval-42 | Task 6 (L3) | A7a 3/3 → clear |
| eval-28 | Task 6 (L5) | A7a 3/3 → improve |
| eval-44 | Tasks 7+3 | A7c 3/3 → clear; no "long way out" |
| eval-4 | Task 8 (L6) | A7b 3/3 → clear |
| eval-30 | Task 8 (L7) | A7b 2/3 → clear |
| eval-2 | Task 1 | A7b role-duplication → clear |
| eval-29 | Task 4 | A7b term echo → clear |
| eval-47 | Task 5 | unsatisfiable required handle → satisfiable |
| pin-L2-enabled-opponent | Task 7 | second prong now offered |
| pin-L6-lost-win-and-gave-one | none (D5 sizing only) | expect NO change — control for the deferred fix |
| eval-6, eval-17, pin-L7-practical-swindle | none (retry-class model drops) | controls — expect unchanged (they need Task 12's retry, not these fixes) |

- [ ] **Step 1: Regenerate answers.** **`--out` does NOT name the answers file (F11)** — `compute.mjs`'s `runLlm` writes `fv_suff_answers_${inputStem}_${ts}.jsonl` where `inputStem` is derived from `--input`'s basename, not from `--out`. With `--input boards.jsonl` (the full 63-board file) the smoke run's answers file would be name-indistinguishable from the 63-board baselines (`fv_suff_answers_boards_2026-...jsonl`), so it must NOT be run against the full input with `--ids`. Instead:

  1. First create a 14-row subset file by extracting the 14 target ids from `boards.jsonl`:

  ```bash
  cd connect-four && node -e "
  const fs = require('fs');
  const ids = new Set(['eval-2','eval-4','eval-6','eval-17','eval-28','eval-29','eval-30','eval-37','eval-42','eval-44','eval-47','pin-L2-enabled-opponent','pin-L6-lost-win-and-gave-one','pin-L7-practical-swindle']);
  const lines = fs.readFileSync('server/scripts/reason_corpus/boards.jsonl','utf8').trim().split('\n')
    .filter((l) => ids.has(JSON.parse(l).id));
  fs.writeFileSync('server/scripts/reason_corpus/boards_smoke_a7wave1.jsonl', lines.join('\n') + '\n');
  console.log(lines.length, 'rows written');
  "
  ```

  (Verify the row count prints `14`; if `boards.jsonl` records key the id under a different field, adjust the `JSON.parse(l).id` accessor at source before running — check the file's shape first.)

  2. Then run `compute.mjs` against the **subset file as `--input`**, dropping `--ids` entirely (the subset file already contains only the 14 target rows):

  ```bash
  cd connect-four && node server/scripts/compute.mjs \
    --input server/scripts/reason_corpus/boards_smoke_a7wave1.jsonl \
    --condition D --llm --n 3 --model gpt-5.4-mini \
    --out server/scripts/reason_corpus/runs/reason_evidence_smoke-a7wave1.jsonl
  ```

  With this `--input`, the answers file lands as `fv_suff_answers_boards_smoke_a7wave1_<ts>.jsonl` — name-distinguishable from every 63-board baseline. Capture the printed answers-file path (that stem, not the `--out` evidence file) — it is what gets graded.

- [ ] **Step 2: Mechanical pass:** `cd connect-four && node server/scripts/grade_mechanical.mjs server/scripts/reason_corpus/runs/<answers>.jsonl` (writes `<answers-stem>_mechanical.json` beside it; optional `--locale en`).
- [ ] **Step 3: Grade** the 14 cases with per-case agents (grader model per Task 10's outcome), rubric `GRADER_INSTRUCTIONS_v2.md`, one grade file per case under `runs/`, then merge to `<stem>_grades.jsonl` the same way previous runs did.
- [ ] **Step 4: Comparison report** (a table in the task report, and only there — no new dashboard yet): per case, old vs new per-run A7 (+failed subtests) and the axis the fix targeted. Success criteria: the 9 targeted cases improve on their named axis; the 4 controls are statistically unchanged (±1 run — remember A7's ±20% grader band; a 1-run wiggle on a control is noise, not regression). If a **targeted case does not move**, verify at source before concluding: rebuild its prompt with `assembleGroundedPrompt(buildReasonRenderModel(fv))` and check the fix's text actually reached it.

---

### Task 12: PENDING — owner approval required (do NOT execute without it)

Two items specced by the analysis but explicitly gated:

1. **Harness retry alignment (OI-183):** make `compute.mjs` optionally exercise production's single retry (reuse the D51 seam in `mechanismExplainer.mjs:222-235` — `guardExplainMoveLlmPayload` diagnostics → `survivedSpecs` → `missingRequiredGroups`, plus the `mentionsBetterColumn` trigger), behind a `--retry` flag so historical single-attempt comparability is preserved. Measured 2026-09-01: **48 of 75 A7-failing runs (64%) would have fired production's retry** — the current 60% A7 is a floor artifact.
2. **Full 63-board regeneration + re-grade** (with `--retry`, `--model gpt-5.4-mini`, rubric v2, grader per Task 10) as the new release-dashboard baseline, replacing the 2026-08-28 dataset.

Cost: 189+ model calls + 63 grader agents. Record the run + grader model in `runs/README.md`.

---

## Out of scope for this wave (recorded so it isn't silently dropped)

- **pin-L6 dead-fork viability gate** — Task 9's D5 detector sizes it first (owner decision).
- **eval-11 / eval-12 / pin-L6 `winning_line`-half missing pivots** — Task 7 files them; different derivation rule needed.
- **ES verde/gris contradiction** (`compute.mjs` buildTask "never by color" vs `SPANISH_OUTPUT_DIRECTIVE` verde/gris; 109/189 ES runs) — product decision, not asked of this wave. Recommendation on file: ban player-naming, allow disc-colour nouns, align the EN task line + rubric A5a.
- **eval-15's one-prong `forkWindows`** (missing_info, a feature-vector gap, not render) — engine-side, needs its own I12 pass.
- **Dashboard regeneration** — only after Task 12's new baseline exists.
- **Task 7's new prong/pivot aliases are OFFERED but never REQUIRED by Task 8.** `deriveRequiredSet`'s `halfForkCellsSpec` reads `tacticTag`, which `realized_pattern` halves lack by construction — so Task 7's new realized-fork aliases never enter the fork branch of `deriveRequiredSet`. Requiring them is deliberately out of scope this wave; a future wave would need to extend `halfForkCellsSpec` (or an equivalent check) to also recognize realized-fork shapes.

## Self-review notes

- Every task's evidence was verified at source 2026-09-01 (grade/answer jsonls, probe re-run, file reads); line numbers are approximate by design — **locate by symbol name**.
- Fixtures use only harvested values (corpus ids, real specs like `future:windows:c2r5,c3r5,c4r5,c5r5`, real movestrings). The two authored items are new prose strings (Tasks 3/6) — new copy, not claims about existing code. Task 4's board-access path is resolved (not a hedge): the test must call `boardSelectionDecisions(pruned)` directly, not filter `model.boards`, since `model.boards` is shown-only while production's `noteFired` iterates the full decision set.
- Tasks 1→8 are order-independent except: **7→8** (Task 8's corpus test should run after Task 7's new aliases exist; if executed out of order, re-run Task 8's tests after Task 7 lands) and now also **7→2** (Task 7 adds new disjoint-cell `windows:` fork-prong specs to the corpus's alias set; Task 2's `lineLocator` positive-truth/negative-case test should be re-run after Task 7 lands so its corpus-wide sweep sees those new specs and confirms they correctly get `null`, not a fabricated line label).
