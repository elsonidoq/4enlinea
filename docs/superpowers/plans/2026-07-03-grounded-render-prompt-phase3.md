# Grounded-Render Prompt — Phase 3 (Causal Frames) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the P1/P2 causal-link catalog into composed plain-language coach sentences (one per link L1–L9), wire real confidence-gated `covers` removal into the completeness assertion, and compute the L2-vs-L3 branch-invariance signal at render time — landing the eval-3 (deep-horizon) and eval-23 (no-false-causation) fixes.

**Architecture:** Render-layer only — `computeReason` and stored evidence are untouched. Four modules change: `causalLinks.mjs` (add `template()` per link + return composed `text`; clean two covers lists), `fieldDisposition.mjs` (covers audit is a static causal-code check, not a per-record presence check), `renderReasonModel.mjs` (drop covered codes from the rendered JSON; compute branch-invariance `ctx`; render composed text + a short reading key), and the P2 `reasonBoardSelect.mjs` (add `patternOnAfterBestBoard`). Composers read only fields present after pruning and derive horizon from `register` (never a bare `pliesToEnd`).

**Tech Stack:** Node.js ESM (`.mjs`), `node:test` + `node:assert/strict`. Tests run via `npm run test:fast` inside `connect-four/`.

**Design doc:** `docs/superpowers/specs/2026-07-03-grounded-render-prompt-phase3-design.md`
**Authoritative spec:** `docs/architecture/reason-render-grounded-prompt.md` (§3, §3b, §3d, §3e, §6, §8)

## Global Constraints

- **Phase-3 base commit:** `208d371` (P2 `c56c441` + a memory-compaction commit). Work in place on `stagging`.
- **Render-layer only.** Do NOT change what `computeReason` stores; frames are composed from evidence the engine already has (INVARIANTS I0; "engine soundness first, render later").
- **Coordinates:** 0-indexed internally (row 0 = bottom, col 0 = left); `cNrM` strings are 1-indexed. `bestCol`/`playedCol` are 0-indexed — display columns are `col + 1`.
- **No solver scores anywhere** in the render/prompt (already deep-scrubbed upstream by `toNarratorVector`; D21). Do not reintroduce.
- **Completeness invariant holds:** every present narrator-vector field must render, be covered by a live frame, or be excluded-with-reason, else `assertCoverage` throws. `renderCoverageCorpus.test.mjs` must stay green with ZERO uncovered fields across 29 records. The field-disposition registry is closed-by-design — do NOT weaken it to pass the gate.
- **Condition D stays gradeable:** the assembled D prompt still ends with the `TASK` output-contract (the append lives in `compute.mjs`; keep it). `computeConditionD.test.mjs` stays green.
- **Tests:** `npm run test:fast` inside `connect-four/` (baseline before Phase 3: **763 passing**). Do NOT run the full `npm test` (candidate-generator hangs on solver IPC).
- **Commits:** after each task on `stagging`. Use explicit `git add <files>` per task — NEVER `git add -A` (a separate feature runs in `.claude/worktrees/win-dist-grid` — do not touch it). Every commit ends with:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
- **Do NOT push or open a PR** — the user integrates manually.

---

## Task 1: Covers-gating — static causal-code audit + drop covered codes from rendered JSON

**Why:** Today `assertCoverage` ignores its 2nd arg and `renderedFields` keeps all causal-code fields, so a fired frame's `covers` removes nothing. This task makes covers actually hide the codes the sentence restates, and makes a bad `covers` entry throw loudly. The audit is a **static causal-code check** (every covers entry must be a `causal-code` field), not a per-record "must be present" check — the latter is infeasible because the catalog's `covers` are family-wide supersets (verified: every link has legitimately-absent covers entries).

**Files:**
- Modify: `connect-four/server/scripts/reason_engine/causalLinks.mjs` (clean L3 + L7 covers)
- Modify: `connect-four/server/scripts/fieldDisposition.mjs` (`assertCoverage` causal-code audit)
- Modify: `connect-four/server/scripts/renderReasonModel.mjs` (`renderedFields` drops covered codes; pass `link.covers`)
- Test: `connect-four/server/tests/fieldDisposition.test.mjs` (create) and reuse `causalLinks.test.mjs`, `renderReasonModel.test.mjs`

**Interfaces:**
- Produces: `assertCoverage(prunedFv, firedCovers = [])` — now throws `Error` if any `firedCovers` entry is not a `causal-code` field (in addition to the existing `UncoveredVectorFieldError` on unregistered leaves). `renderedFields(prunedFv, firedCovers = [])` — drops `transformed`/`exclude` AND `causal-code` paths listed in `firedCovers`; keeps `render` + uncovered `causal-code`.

- [ ] **Step 1: Write the failing test** — create `connect-four/server/tests/fieldDisposition.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertCoverage, dispositionOf } from '../scripts/fieldDisposition.mjs';
import { CAUSAL_LINKS } from '../scripts/reason_engine/causalLinks.mjs';

test('every catalog covers entry resolves to a causal-code field', () => {
  for (const link of CAUSAL_LINKS) {
    for (const c of link.covers) {
      assert.equal(dispositionOf(c), 'causal-code',
        `${link.id} covers "${c}" has disposition ${dispositionOf(c)} (must be causal-code)`);
    }
  }
});

test('assertCoverage throws when a fired frame covers a non-code field', () => {
  const fv = { route: 'sign', lostResource: { completingCell: 'c4r3' } };
  // completingCell is a render field, not a code — a frame must never cover it.
  assert.throws(() => assertCoverage(fv, ['lostResource.completingCell']), /not a causal-code/);
});

test('assertCoverage passes when covers name only present-or-absent codes', () => {
  const fv = { route: 'sign', lostResource: { kind: 'winning_line' } };
  // 'opponentPunishment.terminal' is a code that is absent here — allowed (superset covers).
  assert.doesNotThrow(() => assertCoverage(fv, ['route', 'lostResource.kind', 'opponentPunishment.terminal']));
});
```

- [ ] **Step 2: Run it — verify it fails**

Run: `cd connect-four && node --test server/tests/fieldDisposition.test.mjs`
Expected: FAIL — L3/L7 covers still contain non-code entries; `assertCoverage` doesn't throw on non-code covers yet.

- [ ] **Step 3: Clean L3 + L7 covers** in `causalLinks.mjs`. Change L3's `covers` from
`[...CODES_REALIZED, 'lostResource.exhaustive', 'gate.witness.node', 'gate.witness.devVal']` to just `CODES_REALIZED`:

```js
  { id: 'L3', family: 'realized_denied', confidence: 'high',
    when: (fv, ctx) => fv.route === 'realized_denied' && fv.direction === 'enabled_opponent' && branchInvariant(fv, ctx),
    covers: CODES_REALIZED,
    guardrail: 'MUST NOT say the played move caused or enabled the pattern; both moves lose, played loses faster.' },
```

And change L7's `covers` from `[...CODES_SIGN, 'opponentPunishment.tie.playedPlies', 'opponentPunishment.tie.swindlePlies']` to just `CODES_SIGN` (the plies counts are `render` fields — kept grounded, restated qualitatively in prose):

```js
  { id: 'L7', family: 'sign', confidence: 'high',
    when: (fv) => fv.route !== 'realized_denied' && fv.lostResource?.kind === 'conditional_swindle',
    covers: CODES_SIGN,
    guardrail: 'Neither move wins; the better move only kept a practical swindle. Do not claim a win.' },
```

- [ ] **Step 4: Add the causal-code audit** to `fieldDisposition.mjs`. Replace the body of `assertCoverage`:

```js
export function assertCoverage(prunedFv, firedCovers = []) {
  for (const path of leafPaths(prunedFv)) {
    if (dispositionOf(path) === null) throw new UncoveredVectorFieldError(path);
  }
  // A frame may only cover semantic CODES (never cells/counts/plumbing). A non-code covers entry
  // is a catalog bug — throw loudly. (Absent codes are allowed: covers lists are family supersets.)
  for (const c of firedCovers) {
    if (dispositionOf(c) !== 'causal-code') {
      throw new Error(`covers entry "${c}" is not a causal-code field (disposition=${dispositionOf(c)}); frames may only cover semantic codes`);
    }
  }
}
```

- [ ] **Step 5: Drop covered codes in `renderedFields`** in `renderReasonModel.mjs`. Replace the `renderedFields` function so it takes `firedCovers` and drops covered causal-code paths:

```js
function renderedFields(prunedFv, firedCovers = []) {
  const covered = new Set(firedCovers);
  const keep = (path) => {
    const d = dispositionOf(path);
    if (d === 'transformed' || d === 'exclude') return false;
    if (d === 'causal-code' && covered.has(path)) return false;   // hidden — the frame restates it
    return true;                                                   // render + uncovered causal-code
  };
  function pruneArray(arr, prefix) {
    return arr.map((el) => (el !== null && typeof el === 'object' && !Array.isArray(el))
      ? prune(el, prefix + '[]')
      : el);
  }
  function prune(node, prefix) {
    if (node === null || typeof node !== 'object' || Array.isArray(node)) return node;
    const copy = {};
    for (const [key, val] of Object.entries(node)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (Array.isArray(val)) {
        if (val.length && val[0] !== null && typeof val[0] === 'object') {
          copy[key] = pruneArray(val, path);
        } else if (keep(path)) {
          copy[key] = val;
        }
      } else if (val !== null && typeof val === 'object') {
        const child = prune(val, path);
        if (Object.keys(child).length) copy[key] = child;
      } else if (keep(path)) {
        copy[key] = val;
      }
    }
    return copy;
  }
  return prune(prunedFv, '');
}
```

Then pass `link.covers` where `buildReasonRenderModel` calls it — change `rendered: renderedFields(pruned),` to `rendered: renderedFields(pruned, link.covers),`.

- [ ] **Step 6: Run the focused tests — verify they pass**

Run: `cd connect-four && node --test server/tests/fieldDisposition.test.mjs server/tests/causalLinks.test.mjs server/tests/renderReasonModel.test.mjs`
Expected: PASS (existing renderReasonModel tests still green — they assert on render cells, not covered codes).

- [ ] **Step 7: Run the corpus completeness gate**

Run: `cd connect-four && node --test server/tests/renderCoverageCorpus.test.mjs`
Expected: PASS — 29/29 records still render with zero uncovered fields.

- [ ] **Step 8: Commit**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add connect-four/server/scripts/reason_engine/causalLinks.mjs connect-four/server/scripts/fieldDisposition.mjs connect-four/server/scripts/renderReasonModel.mjs connect-four/server/tests/fieldDisposition.test.mjs
git commit -m "feat(reason-render): confidence-gated covers removal + static causal-code audit (P3)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Branch-invariance signal (L2 vs L3), computed at render time

**Why:** The eval-23 fix. The L3 rule already reads `ctx.patternOnAfterBestBoard`, but `buildReasonRenderModel` passes `{}`, so only the `lose_to_faster_lose` proxy routes to L3. This task computes the real signal from the after-best board's curated tags (reusing the P2 tagger) so a `win_to_lose`/`draw_to_lose` enabled_opponent case whose pattern is present on the after-best board also routes to L3.

**Files:**
- Modify: `connect-four/server/scripts/reasonBoardSelect.mjs` (add `patternOnAfterBestBoard`)
- Modify: `connect-four/server/scripts/renderReasonModel.mjs` (compute + pass `ctx`)
- Test: `connect-four/server/tests/branchInvariance.test.mjs` (create)

**Interfaces:**
- Consumes: `tagBoard(movestring, perspectivePlayer, opts?)` from `reasonBoardTags.mjs` (returns `[{cell, kind, owner, window?}]`).
- Produces: `patternOnAfterBestBoard(fv) -> boolean` (exported from `reasonBoardSelect.mjs`).

- [ ] **Step 1: Write the failing test** — create `connect-four/server/tests/branchInvariance.test.mjs`. It validates the COMPUTATION against real corpus boards (through `tagBoard`) and the ROUTING across both disjunction branches (synthetic ctx):

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { toNarratorVector, pruneVector } from '../scripts/reasonNarratorVector.mjs';
import { patternOnAfterBestBoard } from '../scripts/reasonBoardSelect.mjs';
import { classifyCausalLink } from '../scripts/reason_engine/causalLinks.mjs';
import { buildReasonRenderModel } from '../scripts/renderReasonModel.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORPUS = join(__dirname, '../scripts/reason_evidence_boards_coverage_2026-07-02T11-37-56Z.jsonl');
const rows = readFileSync(CORPUS, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const pv = (id) => pruneVector(toNarratorVector(rows.find((r) => r.id === id).evidence));

test('computation: pattern NOT on after-best for genuinely-causal L2 records', () => {
  for (const id of ['eval-17', 'eval-21']) assert.equal(patternOnAfterBestBoard(pv(id)), false, id);
});

test('computation: pattern IS on after-best for L3 records', () => {
  for (const id of ['eval-18', 'eval-19', 'eval-20', 'eval-23']) assert.equal(patternOnAfterBestBoard(pv(id)), true, id);
});

test('routing: win_to_lose enabled_opponent flips L2->L3 when branch-invariant (synthetic ctx)', () => {
  const fv = { case: 'win_to_lose', route: 'realized_denied', direction: 'enabled_opponent',
               lostResource: { kind: 'denial' }, opponentPunishment: { kind: 'realized_pattern' } };
  assert.equal(classifyCausalLink(fv, { patternOnAfterBestBoard: true }).id, 'L3');
  assert.equal(classifyCausalLink(fv, { patternOnAfterBestBoard: false }).id, 'L2');
});

test('integration: eval-23 routes to L3 through buildReasonRenderModel', () => {
  const m = buildReasonRenderModel(toNarratorVector(rows.find((r) => r.id === 'eval-23').evidence));
  assert.equal(m.link.id, 'L3');
});

test('integration: eval-21 routes to L2 (pattern absent on after-best)', () => {
  const m = buildReasonRenderModel(toNarratorVector(rows.find((r) => r.id === 'eval-21').evidence));
  assert.equal(m.link.id, 'L2');
});
```

- [ ] **Step 2: Run it — verify it fails**

Run: `cd connect-four && node --test server/tests/branchInvariance.test.mjs`
Expected: FAIL — `patternOnAfterBestBoard` is not exported; eval-23 integration may already pass via the proxy but the computation import fails.

- [ ] **Step 3: Add `patternOnAfterBestBoard`** to `reasonBoardSelect.mjs` (place it near `namedPatternOpts`):

```js
// L2-vs-L3 branch-invariance (spec §3b): the opponent pattern is present on the after-best board iff
// that board carries an opponent-owned tag at the pattern's completing cell. Reuses the P2 tagger so
// the check equals what the model sees. Computed only for enabled_opponent records (by the caller).
export function patternOnAfterBestBoard(fv) {
  const cc = fv.opponentPunishment?.completingCell;
  if (cc == null || fv.bestCol == null) return false;
  const ms = (fv.movestring ?? '') + String(fv.bestCol);
  return tagBoard(ms, fv.player).some(
    (t) => t.owner === 'opp' && (t.cell === cc || (t.window || []).includes(cc)));
}
```

- [ ] **Step 4: Wire the ctx** in `renderReasonModel.mjs`. Import it and compute ctx before classifying. Change the import line:

```js
import { selectBoards, renderThreatList, patternOnAfterBestBoard } from './reasonBoardSelect.mjs';
```

and in `buildReasonRenderModel`, replace `const link = classifyCausalLink(pruned, {});` with:

```js
  const ctx = pruned.direction === 'enabled_opponent'
    ? { patternOnAfterBestBoard: patternOnAfterBestBoard(pruned) } : {};
  const link = classifyCausalLink(pruned, ctx);
```

- [ ] **Step 5: Run it — verify it passes**

Run: `cd connect-four && node --test server/tests/branchInvariance.test.mjs`
Expected: PASS (all five tests).

- [ ] **Step 6: Commit**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add connect-four/server/scripts/reasonBoardSelect.mjs connect-four/server/scripts/renderReasonModel.mjs connect-four/server/tests/branchInvariance.test.mjs
git commit -m "feat(reason-render): render-time L2-vs-L3 branch-invariance signal (eval-23 fix, P3)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Composer infrastructure + L5 template (eval-3 deep-horizon fix)

**Why:** Establish the `template(fv, ctx)` mechanism and land the eval-3 fix first. `classifyCausalLink` returns a composed `text`; L5 (denied winning line) frames a deep resource **as deep** via `register`, never "immediate".

**Files:**
- Modify: `connect-four/server/scripts/reason_engine/causalLinks.mjs` (helpers, L5 `template`, `classifyCausalLink` returns `text`)
- Test: `connect-four/server/tests/causalLinksComposers.test.mjs` (create)

**Interfaces:**
- Produces: each catalog entry gains `template: (fv, ctx) => string`; `classifyCausalLink(fv, ctx)` returns `{ id, confidence, covers, guardrail, text }` where `text = matched.template(fv, ctx)` (empty string if a link has no template yet).

- [ ] **Step 1: Write the failing test** — create `connect-four/server/tests/causalLinksComposers.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { toNarratorVector, pruneVector } from '../scripts/reasonNarratorVector.mjs';
import { classifyCausalLink } from '../scripts/reason_engine/causalLinks.mjs';
import { patternOnAfterBestBoard } from '../scripts/reasonBoardSelect.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORPUS = join(__dirname, '../scripts/reason_evidence_boards_coverage_2026-07-02T11-37-56Z.jsonl');
const rows = readFileSync(CORPUS, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
export function classifyById(id) {
  const fv = pruneVector(toNarratorVector(rows.find((r) => r.id === id).evidence));
  const ctx = fv.direction === 'enabled_opponent' ? { patternOnAfterBestBoard: patternOnAfterBestBoard(fv) } : {};
  return { fv, link: classifyCausalLink(fv, ctx) };
}

test('L5 (eval-3): deep fork framed as deep, not immediate', () => {
  const { link } = classifyById('eval-3');
  assert.equal(link.id, 'L5');
  assert.match(link.text, /forced win/i);
  assert.match(link.text, /deep on a forced line/);      // horizon-honest (eval-3 fix)
  assert.match(link.text, /c4r3/);                        // fork completing cell named
  assert.match(link.text, /c6r5/);                        // opponent denial cell named
  assert.doesNotMatch(link.text, /immediate|right now|current threat/i);
});
```

- [ ] **Step 2: Run it — verify it fails**

Run: `cd connect-four && node --test server/tests/causalLinksComposers.test.mjs`
Expected: FAIL — `link.text` is `undefined` (no `template`/`text` yet).

- [ ] **Step 3: Add helpers + L5 template + text return** to `causalLinks.mjs`. Insert these helpers above `export const CAUSAL_LINKS`:

```js
// ── Composer helpers (P3) ──
const col1 = (c) => (c == null ? '?' : c + 1);
const denialCell = (h) => h?.cell ?? h?.completingCell ?? null;
const horizonPhrase = (reg) =>
  reg === 'forced_sequence' ? 'deep on a forced line'
  : reg === 'parity' ? 'deep, via a parity battle'
  : 'near-term';
const forkOrParity = (h) => (h?.terminal === 'fork' ? 'fork' : h?.register === 'parity' ? 'parity line' : 'forced line');
const pliesTail = (fv) => (fv?.pliesToEnd != null ? ` (~${fv.pliesToEnd} plies)` : '');
const cells = (w) => (Array.isArray(w) ? w.join('·') : '');
```

Add a `template` to the L5 entry:

```js
  { id: 'L5', family: 'sign', confidence: 'high',
    when: (fv) => fv.route !== 'realized_denied' && fv.lostResource?.kind === 'winning_line'
                  && fv.opponentPunishment?.kind === 'denial',
    covers: CODES_SIGN,
    guardrail: 'You had a forced win; state its horizon honestly (may be deep). The played move let the opponent deny it.',
    template: (fv) => `You had a forced win — it resolves ${horizonPhrase(fv.lostResource?.register)}${pliesTail(fv)} via a ${forkOrParity(fv.lostResource)} completing at ${fv.lostResource?.completingCell}. The played move let the opponent deny it at ${denialCell(fv.opponentPunishment)}.` },
```

Update `classifyCausalLink` to return `text`:

```js
export function classifyCausalLink(fv, ctx = {}) {
  for (const link of CAUSAL_LINKS) {
    if (link.when(fv, ctx)) {
      return { id: link.id, confidence: link.confidence, covers: link.covers,
               guardrail: link.guardrail, text: link.template ? link.template(fv, ctx) : '' };
    }
  }
  throw new Error(`classifyCausalLink: no rule matched (case=${fv.case} route=${fv.route} direction=${fv.direction})`);
}
```

- [ ] **Step 4: Run it — verify it passes**

Run: `cd connect-four && node --test server/tests/causalLinksComposers.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add connect-four/server/scripts/reason_engine/causalLinks.mjs connect-four/server/tests/causalLinksComposers.test.mjs
git commit -m "feat(reason-render): composer infra + L5 deep-horizon template (eval-3 fix, P3)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: L1 composer (missed_own)

**Files:**
- Modify: `connect-four/server/scripts/reason_engine/causalLinks.mjs` (L1 `template`)
- Test: `connect-four/server/tests/causalLinksComposers.test.mjs` (append)

- [ ] **Step 1: Append the failing test** to `causalLinksComposers.test.mjs`:

```js
test('L1 (eval-22): completes YOUR tactic; opponent denial named', () => {
  const { link } = classifyById('eval-22');
  assert.equal(link.id, 'L1');
  assert.match(link.text, /better move \(col 3\)/);       // bestCol 2 -> display 3
  assert.match(link.text, /double_threat/);
  assert.match(link.text, /c2r1/);                        // your completing cell
  assert.match(link.text, /c3r1/);                        // opponent denial cell
});
```

- [ ] **Step 2: Run it — verify it fails**

Run: `cd connect-four && node --test server/tests/causalLinksComposers.test.mjs`
Expected: FAIL — L1 `text` is empty.

- [ ] **Step 3: Add the L1 `template`** to its catalog entry:

```js
    template: (fv) => `The better move (col ${col1(fv.bestCol)}) completes your ${fv.lostResource?.tag ?? 'threat'} at ${fv.lostResource?.completingCell}; the played move let the opponent take ${denialCell(fv.opponentPunishment)}, denying it.`,
```

- [ ] **Step 4: Run it — verify it passes**

Run: `cd connect-four && node --test server/tests/causalLinksComposers.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add connect-four/server/scripts/reason_engine/causalLinks.mjs connect-four/server/tests/causalLinksComposers.test.mjs
git commit -m "feat(reason-render): L1 missed_own composer (P3)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: L2 composer (enabled_opponent, genuinely caused)

**Files:**
- Modify: `connect-four/server/scripts/reason_engine/causalLinks.mjs` (L2 `template`)
- Test: `connect-four/server/tests/causalLinksComposers.test.mjs` (append)

- [ ] **Step 1: Append the failing test**:

```js
test('L2 (eval-21): played move handed the opponent the pattern', () => {
  const { link } = classifyById('eval-21');
  assert.equal(link.id, 'L2');
  assert.match(link.text, /let the opponent occupy c2r1/);
  assert.match(link.text, /double_threat/);
  assert.match(link.text, /better move \(col 3\)/);       // bestCol 2 -> display 3
});
```

- [ ] **Step 2: Run it — verify it fails**

Run: `cd connect-four && node --test server/tests/causalLinksComposers.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Add the L2 `template`**:

```js
    template: (fv) => `Your move let the opponent occupy ${fv.opponentPunishment?.completingCell}, completing their ${fv.opponentPunishment?.tag ?? 'threat'} on ${cells(fv.opponentPunishment?.window)}; the better move (col ${col1(fv.bestCol)}) denied it${denialCell(fv.lostResource) ? ` at ${denialCell(fv.lostResource)}` : ''}.`,
```

- [ ] **Step 4: Run it — verify it passes**

Run: `cd connect-four && node --test server/tests/causalLinksComposers.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add connect-four/server/scripts/reason_engine/causalLinks.mjs connect-four/server/tests/causalLinksComposers.test.mjs
git commit -m "feat(reason-render): L2 enabled-causal composer (P3)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: L3 composer (enabled_opponent, NOT caused — eval-23 wording)

**Files:**
- Modify: `connect-four/server/scripts/reason_engine/causalLinks.mjs` (L3 `template`)
- Test: `connect-four/server/tests/causalLinksComposers.test.mjs` (append)

- [ ] **Step 1: Append the failing test**:

```js
test('L3 (eval-23): no-causation wording; names the branch-invariant pattern', () => {
  const { link } = classifyById('eval-23');
  assert.equal(link.id, 'L3');
  assert.match(link.text, /already losing/i);
  assert.match(link.text, /figure_7/);
  assert.match(link.text, /c4r3/);
  assert.match(link.text, /does not create it/i);
  assert.match(link.text, /loses faster/i);
  assert.match(link.text, /do not say your move caused/i);
});
```

- [ ] **Step 2: Run it — verify it fails**

Run: `cd connect-four && node --test server/tests/causalLinksComposers.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Add the L3 `template`**:

```js
    template: (fv) => `You were already losing. The opponent's ${fv.opponentPunishment?.tag ?? 'threat'} at ${fv.opponentPunishment?.completingCell} exists no matter what you play here — your move does not create it, it only loses faster. Do not say your move caused or enabled it.`,
```

- [ ] **Step 4: Run it — verify it passes**

Run: `cd connect-four && node --test server/tests/causalLinksComposers.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add connect-four/server/scripts/reason_engine/causalLinks.mjs connect-four/server/tests/causalLinksComposers.test.mjs
git commit -m "feat(reason-render): L3 no-causation composer (eval-23 fix, P3)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: L4 composer (defensive_miss)

**Files:**
- Modify: `connect-four/server/scripts/reason_engine/causalLinks.mjs` (L4 `template`)
- Test: `connect-four/server/tests/causalLinksComposers.test.mjs` (append)

- [ ] **Step 1: Append the failing test**:

```js
test('L4 (eval-4): missed defense; occupies the block, names the opponent window', () => {
  const { link } = classifyById('eval-4');
  assert.equal(link.id, 'L4');
  assert.match(link.text, /better move \(col 5\)/);       // bestCol 4 -> display 5
  assert.match(link.text, /occupies c5r4/);
  assert.match(link.text, /skipped that defense/i);
});
```

- [ ] **Step 2: Run it — verify it fails**

Run: `cd connect-four && node --test server/tests/causalLinksComposers.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Add the L4 `template`**:

```js
    template: (fv) => `The better move (col ${col1(fv.bestCol)}) occupies ${fv.lostResource?.completingCell}, blocking the opponent's threat on ${cells(fv.opponentPunishment?.window)}; the played move skipped that defense.`,
```

- [ ] **Step 4: Run it — verify it passes**

Run: `cd connect-four && node --test server/tests/causalLinksComposers.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add connect-four/server/scripts/reason_engine/causalLinks.mjs connect-four/server/tests/causalLinksComposers.test.mjs
git commit -m "feat(reason-render): L4 defensive_miss composer (P3)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: L6 composer (two winning lines)

**Files:**
- Modify: `connect-four/server/scripts/reason_engine/causalLinks.mjs` (L6 `template`)
- Test: `connect-four/server/tests/causalLinksComposers.test.mjs` (append)

- [ ] **Step 1: Append the failing test**:

```js
test('L6 (eval-6): gave up a win AND handed the opponent one', () => {
  const { link } = classifyById('eval-6');
  assert.equal(link.id, 'L6');
  assert.match(link.text, /forced win via c2r5/);
  assert.match(link.text, /opponent force their own win via c2r6/);
});
```

- [ ] **Step 2: Run it — verify it fails**

Run: `cd connect-four && node --test server/tests/causalLinksComposers.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Add the L6 `template`**:

```js
    template: (fv) => `You had a forced win via ${fv.lostResource?.completingCell} (${horizonPhrase(fv.lostResource?.register)}${pliesTail(fv)}); the played move gives it up AND lets the opponent force their own win via ${fv.opponentPunishment?.completingCell}.`,
```

- [ ] **Step 4: Run it — verify it passes**

Run: `cd connect-four && node --test server/tests/causalLinksComposers.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add connect-four/server/scripts/reason_engine/causalLinks.mjs connect-four/server/tests/causalLinksComposers.test.mjs
git commit -m "feat(reason-render): L6 two-winning-lines composer (P3)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: L7 composer (swindle, both lose)

**Why:** L7 restates the swindle timing qualitatively from `gate.witness.oppPlies`/`devCols` (which render through — not covered) and must state **neither move wins**.

**Files:**
- Modify: `connect-four/server/scripts/reason_engine/causalLinks.mjs` (L7 `template`)
- Test: `connect-four/server/tests/causalLinksComposers.test.mjs` (append)

- [ ] **Step 1: Append the failing test**:

```js
test('L7 (eval-8): practical swindle, neither move wins', () => {
  const { link } = classifyById('eval-8');
  assert.equal(link.id, 'L7');
  assert.match(link.text, /already losing/i);
  assert.match(link.text, /practical swindle/i);
  assert.match(link.text, /neither move wins/i);
  assert.doesNotMatch(link.text, /you (would )?win\b/i);   // must not claim a win
});
```

- [ ] **Step 2: Run it — verify it fails**

Run: `cd connect-four && node --test server/tests/causalLinksComposers.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Add the L7 `template`**:

```js
    template: (fv) => {
      const w = fv.gate?.witness;
      const op = w?.oppPlies;
      const dc = (w?.devCols ?? []).map((c) => col1(c));
      const swindle = op != null
        ? ` — a slip within ~${op} plies${dc.length ? ` (around column ${dc.join(', ')})` : ''} could let you back`
        : '';
      return `You were already losing. The better move kept a practical swindle${swindle}; the played move loses faster. Neither move wins.`;
    },
```

- [ ] **Step 4: Run it — verify it passes**

Run: `cd connect-four && node --test server/tests/causalLinksComposers.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add connect-four/server/scripts/reason_engine/causalLinks.mjs connect-four/server/tests/causalLinksComposers.test.mjs
git commit -m "feat(reason-render): L7 swindle composer (P3)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 10: L8 composer (draw abandoned)

**Files:**
- Modify: `connect-four/server/scripts/reason_engine/causalLinks.mjs` (L8 `template`)
- Test: `connect-four/server/tests/causalLinksComposers.test.mjs` (append)

- [ ] **Step 1: Append the failing test**:

```js
test('L8 (eval-2): a draw abandoned; opponent now has a forced win', () => {
  const { link } = classifyById('eval-2');
  assert.equal(link.id, 'L8');
  assert.match(link.text, /position was a draw/i);
  assert.match(link.text, /occupying c4r4/);
  assert.match(link.text, /forced win/i);
});
```

- [ ] **Step 2: Run it — verify it fails**

Run: `cd connect-four && node --test server/tests/causalLinksComposers.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Add the L8 `template`**:

```js
    template: (fv) => `The position was a draw; the better move (col ${col1(fv.bestCol)}) holds it by occupying ${fv.lostResource?.completingCell}. The played move abandons it — the opponent now has a forced win (${horizonPhrase(fv.opponentPunishment?.register)}${pliesTail(fv)}, completing at ${fv.opponentPunishment?.completingCell}).`,
```

- [ ] **Step 4: Run it — verify it passes**

Run: `cd connect-four && node --test server/tests/causalLinksComposers.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add connect-four/server/scripts/reason_engine/causalLinks.mjs connect-four/server/tests/causalLinksComposers.test.mjs
git commit -m "feat(reason-render): L8 draw-abandoned composer (P3)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 11: L9 composer (diffuse parity, low-confidence hedge)

**Files:**
- Modify: `connect-four/server/scripts/reason_engine/causalLinks.mjs` (L9 `template`)
- Test: `connect-four/server/tests/causalLinksComposers.test.mjs` (append)

- [ ] **Step 1: Append the failing test**:

```js
test('L9 (eval-13): hedged parity, culprit not isolable', () => {
  const { link } = classifyById('eval-13');
  assert.equal(link.id, 'L9');
  assert.match(link.text, /parity/i);
  assert.match(link.text, /isn't cleanly isolable/i);
  assert.doesNotMatch(link.text, /the culprit is c\d+r\d+/i);  // must NOT fabricate a crisp cause
});
```

- [ ] **Step 2: Run it — verify it fails**

Run: `cd connect-four && node --test server/tests/causalLinksComposers.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Add the L9 `template`**:

```js
    template: (fv) => `You had a parity/zugzwang win (resolves ${horizonPhrase(fv.lostResource?.register)}${pliesTail(fv)}); the played move loses the parity battle — the exact culprit square isn't cleanly isolable. The winning group runs through ${cells(fv.lostResource?.window)}.`,
```

- [ ] **Step 4: Run it — verify it passes**

Run: `cd connect-four && node --test server/tests/causalLinksComposers.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add connect-four/server/scripts/reason_engine/causalLinks.mjs connect-four/server/tests/causalLinksComposers.test.mjs
git commit -m "feat(reason-render): L9 diffuse-parity hedge composer (P3)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 12: Assemble composed frames + reading key into the prompt

**Why:** Replace the trivial guardrail passthrough with the composed `text`, prepend a short reading key for the residual JSON fields, and keep condition D gradeable.

**Files:**
- Modify: `connect-four/server/scripts/renderReasonModel.mjs` (`buildReasonRenderModel` exposes `frames`; `assembleGroundedPrompt` renders text + reading key)
- Test: `connect-four/server/tests/renderReasonModel.test.mjs` (append) and `computeConditionD.test.mjs` (update the heading assertion)

**Interfaces:**
- Produces: `model.frames = [{ id, confidence, text, covers, guardrail }]`. `assembleGroundedPrompt(model)` includes the composed text, a `Guardrail:` line, and a `# Reading key` section, and keeps `# Vector facts` + boards.

- [ ] **Step 1: Write the failing tests** — append to `renderReasonModel.test.mjs`:

```js
test('assembled prompt renders composed frame text + guardrail + reading key', () => {
  const m = buildReasonRenderModel(NV);
  assert.ok(m.frames && m.frames[0].text.length > 0);
  const prompt = assembleGroundedPrompt(m);
  assert.match(prompt, /causal link L6/);          // machine marker preserved (computeConditionD test)
  assert.match(prompt, /forced win via c2r5/);     // composed L6 text present
  assert.match(prompt, /Guardrail:/);
  assert.match(prompt, /# Reading key/);
  assert.match(prompt, /register:/);               // key explains a residual coded field
  assert.doesNotMatch(prompt, /"scores"/);
  assert.doesNotMatch(prompt, /"movestring"/);
});
```

- [ ] **Step 2: Run it — verify it fails**

Run: `cd connect-four && node --test server/tests/renderReasonModel.test.mjs`
Expected: FAIL — `m.frames` undefined; no reading key / composed text in the prompt.

- [ ] **Step 3: Expose `frames`** in `buildReasonRenderModel` — add to its return object (alongside `link`):

```js
    frames: [{ id: link.id, confidence: link.confidence, text: link.text, covers: link.covers, guardrail: link.guardrail }],
```

- [ ] **Step 4: Add the reading key + rewrite the prompt** in `renderReasonModel.mjs`. Add the constant above `assembleGroundedPrompt`:

```js
const READING_KEY = `# Reading key (the few coded fields shown below)
- register: how far off the result is — "immediate" (now), "forced_sequence" (a deep forced line), "parity" (a deep zugzwang/parity battle).
- pliesToEnd: plies until the line finishes, when known.
- controllingGroup / parityAttribution: the group of four squares whose parity decides a deep win.
- ownDiscs: how many of your discs already sit on the winning group.
- replyHistogram.afterBest / afterPlayed: how many opponent replies still lose after each move.
- "deep on a forced line" / "deep, via a parity battle": the completing square is many plies away and EMPTY now — not a current threat.
- Cells are cNrM: column then row, 1-indexed (c1r1 = bottom-left).`;
```

Then replace the `assembleGroundedPrompt` body:

```js
export function assembleGroundedPrompt(model) {
  const boards = model.boards.map((b) =>
    `## Board: ${b.id} (${b.reason})\n${b.ascii}\nTactics:\n${renderThreatList(b.tags)}`).join('\n\n');
  const frames = model.frames.map((f) => f.text).filter(Boolean).join('\n\n');
  return [
    `# Boards (you = player ${model.perspective.you})`,
    '',
    boards,
    '',
    `# Why this move was a blunder (causal link ${model.link.id}, confidence ${model.link.confidence})`,
    frames,
    '',
    `Guardrail: ${model.link.guardrail}`,
    '',
    READING_KEY,
    '',
    '# Vector facts',
    '```json',
    JSON.stringify(model.rendered, null, 2),
    '```',
  ].join('\n');
}
```

- [ ] **Step 5: Update the condition-D heading assertion** in `computeConditionD.test.mjs`. The `/causal link L6/` marker is preserved by the new heading, so no change is strictly required — but add a composed-text assertion so the test guards the new behavior. Change the first test body to also assert the frame text and reading key:

```js
test('condition D produces the grounded prompt (board + causal link), not the glossary+JSON dump', () => {
  const prompt = buildPromptForCondition('GLOSSARY-TEXT', NV, 'D');
  assert.match(prompt, /# Board/);
  assert.match(prompt, /causal link L6/);
  assert.match(prompt, /forced win via c2r5/);   // composed frame text (P3)
  assert.match(prompt, /# Reading key/);          // reading key present (P3)
  assert.doesNotMatch(prompt, /GLOSSARY-TEXT/);
  assert.match(prompt, /better_move/);
  assert.match(prompt, /"mechanism"/);
  assert.match(prompt, /key_cells/);
});
```

- [ ] **Step 6: Run the assembly tests — verify they pass**

Run: `cd connect-four && node --test server/tests/renderReasonModel.test.mjs server/tests/computeConditionD.test.mjs`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add connect-four/server/scripts/renderReasonModel.mjs connect-four/server/tests/renderReasonModel.test.mjs connect-four/server/tests/computeConditionD.test.mjs
git commit -m "feat(reason-render): assemble composed frames + reading key into condition D (P3)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 13: eval-3 / eval-23 validation through the production condition-D path + full suite

**Why:** Prove the two headline fixes end-to-end through `buildPromptForCondition(..., 'D')` (I12 — through the production path), and confirm the corpus gate + full suite are green.

**Files:**
- Test: `connect-four/server/tests/reasonRenderFixes.test.mjs` (create)

- [ ] **Step 1: Write the failing test** — create `connect-four/server/tests/reasonRenderFixes.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { toNarratorVector } from '../scripts/reasonNarratorVector.mjs';
import { buildPromptForCondition } from '../scripts/compute.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORPUS = join(__dirname, '../scripts/reason_evidence_boards_coverage_2026-07-02T11-37-56Z.jsonl');
const rows = readFileSync(CORPUS, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const dPrompt = (id) => buildPromptForCondition('GLOSSARY', toNarratorVector(rows.find((r) => r.id === id).evidence), 'D');

test('eval-3: the deep fork is framed as deep, never as a near-term threat', () => {
  const p = dPrompt('eval-3');
  assert.match(p, /causal link L5/);
  assert.match(p, /deep on a forced line/);
  assert.match(p, /c4r3/);
  assert.doesNotMatch(p, /immediate threat|current threat|right now/i);
});

test('eval-23: routes to L3 and forbids the causation claim', () => {
  const p = dPrompt('eval-23');
  assert.match(p, /causal link L3/);
  assert.match(p, /does not create it/i);
  assert.match(p, /do not say your move caused/i);
});
```

- [ ] **Step 2: Run it — verify it passes** (the fixes already landed in Tasks 2/3/6/12, so this is a codified regression guard; if it fails, the fix regressed):

Run: `cd connect-four && node --test server/tests/reasonRenderFixes.test.mjs`
Expected: PASS.

- [ ] **Step 3: Run the corpus completeness gate**

Run: `cd connect-four && node --test server/tests/renderCoverageCorpus.test.mjs`
Expected: PASS — 29/29 zero uncovered.

- [ ] **Step 4: Run the full fast suite**

Run: `cd connect-four && npm run test:fast`
Expected: PASS — all tests green (baseline 763 + the new P3 tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add connect-four/server/tests/reasonRenderFixes.test.mjs
git commit -m "test(reason-render): eval-3/eval-23 fixes verified through condition-D path (P3)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 14: Coordination docs — record Phase-4 grader + sampler tasks; DECISIONS note

**Why:** Phase 3 does NOT edit the grader skill or the sampler; it **records** every render decision that affects them so the Phase-4 review task picks them up, and logs the covers-audit reconciliation as a decision.

**Files:**
- Modify: `docs/architecture/reason-render-grounded-prompt.md` (§3b L3/L7 covers note; §3f Phase-4 grader-review task; §3e sampler note; §8 open-questions resolved)
- Modify: `docs/architecture/reason-DECISIONS.md` (append a decision entry)

- [ ] **Step 1: Update the render spec.** In `reason-render-grounded-prompt.md`:
  - §3b: add a note under the L3 and L7 rows that their `covers` were cleaned to name only `causal-code` fields (L3 dropped `lostResource.exhaustive`/`gate.witness.node`/`gate.witness.devVal` — already statically excluded; L7 dropped `tie.playedPlies`/`tie.swindlePlies` — `render` counts kept grounded, restated qualitatively).
  - Replace the §6 "a frame whose covers[] names a field that isn't present is itself a bug (throws)" wording with: the covers audit is a **static causal-code check** (every covers entry must resolve to a `causal-code` disposition; a `render`/`exclude`/typo entry throws). A per-record "must be present" throw is infeasible because `covers` are family-wide supersets (verified across the 29-record corpus).
  - §3f: add a bullet — **Phase-4 task: review all code from specs Phase 1–3 and update `grade-fv-sufficiency`** to (a) fix "trace the solver PV" → "trace the engine's own `finalMovestring`" (the eval-1/16/3 mis-grade bug), (b) grade condition D against the grounded artifact (boards + composed sentences + guardrails + reading key), reading `causalLinks.mjs` as the source of truth, (c) treat a covered code's absence as intended (not `missing_info`) and a needed-but-covered field as over-removal, (d) apply the L3 no-causation and deep-horizon mechanical checks.
  - §3e: add a bullet — Phase-4 sampler work adds a `link_<id>` predicate per link, a branch-invariance-split predicate (`enabled_causal` vs `enabled_branch_invariant`), and a **targeted harvest** for the flip-case (`win_to_lose`/`draw_to_lose` + `enabled_opponent` + pattern-present-on-after-best — absent from the frozen corpus) and the rare links (L3-figure_7, L9, `lost_fork_B`). Keep the `discovered ⊆ REASON_UNIVERSE` guard.
  - §8: mark Q2 (glossary residue → short reading key) and Q3 (branch-invariance predicate → tag-reuse) resolved with pointers to the P3 design doc.
  - Update the top status line: P3 IMPLEMENTED.

- [ ] **Step 2: Append a DECISIONS entry** to `reason-DECISIONS.md` (next Dxx number after D27):

```markdown
### D28 — P3 causal frames: composers derive horizon from `register`; the covers audit is a static causal-code check (not per-record presence); L2-vs-L3 branch-invariance is computed at render time

- **Decision:** Phase 3 adds a `template(fv, ctx)` composer per causal link (L1–L9) producing the coach
  sentence; `classifyCausalLink` returns the composed `text`. Composed frames hide (cover) only the
  semantic CODES they restate; cells and counts stay grounded. Three sub-decisions:
  1. **Horizon from `register`, not `pliesToEnd`.** `pliesToEnd` is absent on all 29 corpus records, so
     deep-vs-near framing derives from `register` (`forced_sequence` → "deep on a forced line", `parity`
     → "deep, via a parity battle"); the plies count is appended only when present. This is the eval-3
     fix (the deep fork is framed as deep, never "immediate").
  2. **The covers over-removal audit is a STATIC causal-code check.** Every `covers` entry across the
     catalog must resolve to a `causal-code` disposition; a `render`/`exclude`/typo entry throws. The
     spec's earlier "a covers entry naming an absent field throws" is infeasible — `covers` are
     family-wide supersets (`CODES_SIGN`/`CODES_REALIZED`) and every link legitimately names absent
     codes (verified across the corpus). L3's covers dropped `lostResource.exhaustive`/`gate.witness.node`/
     `gate.witness.devVal` (statically excluded); L7's dropped `tie.playedPlies`/`tie.swindlePlies`
     (`render` counts, kept grounded).
  3. **L2-vs-L3 branch-invariance is computed at render time** (`patternOnAfterBestBoard`, reusing the P2
     `tagBoard` on the after-best board), never read off `direction`. This is the eval-23 fix.
- **I12 note:** no corpus board is a `win_to_lose`/`draw_to_lose` + `enabled_opponent` +
  pattern-present-on-after-best (the case where the computation flips a would-be-L2 into L3); the
  computation is validated against real boards through `tagBoard` and the routing at the classifier
  layer with synthetic ctx. The missing flip-board is a documented PROVISIONAL gap for a Phase-4
  targeted harvest.
- **Status:** IMPLEMENTED on `stagging` (Phase 3). Render-layer only; `computeReason` untouched.
  `npm run test:fast` green; corpus completeness gate 29/29 zero-uncovered.
- **Source:** Phase-3 design `docs/superpowers/specs/2026-07-03-grounded-render-prompt-phase3-design.md`;
  spec `reason-render-grounded-prompt.md` §3b/§3d/§6; I12.
```

- [ ] **Step 3: Verify no code/tests were touched** (docs-only task)

Run: `cd /Users/elsonidoq/prog/cuatro_en_linea && git status --short`
Expected: only the two docs files modified.

- [ ] **Step 4: Commit**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add docs/architecture/reason-render-grounded-prompt.md docs/architecture/reason-DECISIONS.md
git commit -m "docs(reason-render): record P3 decisions + Phase-4 grader/sampler coordination (D28)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 15: Whole-branch review

**Why:** A final spec + quality review over the full P3 diff (base `208d371` → HEAD), run with the most-capable model per subagent-driven-development.

- [ ] **Step 1: Confirm the full suite is green**

Run: `cd connect-four && npm run test:fast`
Expected: PASS.

- [ ] **Step 2: Review the whole P3 diff** against the design doc + spec §3b/§3d/§6, checking:
  - No solver score or raw movestring leaks into the assembled condition-D prompt (grep the assembled prompt for `"scores"`, `"movestring"`, and score-family keys).
  - Every present narrator-vector field on all 29 records renders / is covered / is excluded-with-reason (corpus gate green).
  - Each L1–L9 composer names only fields present on its record (no `undefined` in any composed `text` across the corpus — spot-check by rendering all 29 and asserting no literal `undefined`).
  - The covers audit throws on a deliberately-broken catalog entry (a `render` field added to some `covers`).
  - eval-3 framed deep; eval-23 routes L3 with the no-causation guardrail; the other 27 links unchanged from the pre-P3 classification.

- [ ] **Step 3: Add a spot-check for no `undefined` in composed text** — append to `reasonRenderFixes.test.mjs`:

```js
test('no composed frame text contains a literal "undefined" across the corpus', () => {
  const bad = [];
  for (const row of rows) {
    if (!row.evidence || row.error) continue;
    const p = buildPromptForCondition('GLOSSARY', toNarratorVector(row.evidence), 'D');
    if (/\bundefined\b/.test(p.split('# Vector facts')[0])) bad.push(row.id);  // check the prose half only
  }
  assert.deepEqual(bad, [], `records with "undefined" in composed prose: ${bad.join(', ')}`);
});
```

- [ ] **Step 4: Run it — verify it passes**

Run: `cd connect-four && node --test server/tests/reasonRenderFixes.test.mjs`
Expected: PASS. (If any record shows `undefined`, fix that link's template to guard the missing field, then re-run.)

- [ ] **Step 5: Commit + update the SDD ledger**

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
git add connect-four/server/tests/reasonRenderFixes.test.mjs
git commit -m "test(reason-render): corpus-wide no-undefined guard on composed frames (P3)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

- [ ] **Step 6: Final report** — summarize the P3 outcome (commits, suite count, eval-3/eval-23 status, corpus gate), and confirm NOT pushed / no PR (user integrates manually).

---

## Self-Review (plan author)

**Spec coverage:** §4a composers → Tasks 3–11 (all nine + infra). §4b covers-gating → Task 1. §4c render model → Tasks 1, 2, 12. §4d branch-invariance → Task 2. §4e reading key + condition D → Task 12. §7 validation → Task 13. §8 grader + sampler coordination → Task 14. Whole-branch review → Task 15. All design sections covered.

**Placeholder scan:** every code step shows full code; every run step shows the command + expected result. No TBD/TODO.

**Type consistency:** `classifyCausalLink` returns `{ id, confidence, covers, guardrail, text }` (Task 3) consumed by `assembleGroundedPrompt`/`frames` (Task 12). `assertCoverage(prunedFv, firedCovers)` + `renderedFields(prunedFv, firedCovers)` (Task 1) consumed by `buildReasonRenderModel` (Tasks 1–2, 12). `patternOnAfterBestBoard(fv)` (Task 2) consumed by `renderReasonModel` + the composer test helper (Tasks 2–3). Helper names (`col1`, `denialCell`, `horizonPhrase`, `forkOrParity`, `pliesTail`, `cells`) defined in Task 3, reused in Tasks 4–11. Consistent.
