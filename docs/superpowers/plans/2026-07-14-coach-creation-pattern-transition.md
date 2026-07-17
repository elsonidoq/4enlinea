# Coach Creation-Pattern Transition-Gating Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the in-game coach from falsely repeating "you created the double threat" (and "you have a forced win") when the pattern was already on the board before the move — praise a creation pattern only on an absent→present transition.

**Architecture:** Extend `classify()` in `server/classifier.js` so its two purely-geometric creation tags (`double_threat`, `forced_win`) fire only when the pattern is present on the post-move board **and absent** on the pre-move board, both from the mover's perspective. `classify()` already builds both boards (`board` pre-move, `nextBoard` post-move) and already passes the mover's perspective (`board.currentPlayer`). The change is stateless and server-side only; when a creation tag is suppressed, `classify()` falls through its existing priority chain to `best_move`/`drawing_move`/`suboptimal_move`, whose absence of a `coach.*` phrase pool makes the frontend speak its existing generic quality line (`coach.generic.optimal` or `coach.generic.suboptimal`, driven by `scoreMove`'s `quality`) instead of the false "you created it" claim — no API or frontend change. Note: because holding a standing double threat/forced win usually means the solver-max move is to cash it (not to leave it standing), the suppressed case will typically land on `coach.generic.suboptimal` (a mild "there was a sharper move" nudge) rather than praise — see Task 3 Step 2.

**Tech Stack:** Node.js ESM, `node:test` + `node:assert/strict`. Detectors are pure board geometry (no c4solver at runtime for these code paths).

**Design doc:** `docs/superpowers/specs/2026-07-14-coach-creation-pattern-transition-design.md`

## Global Constraints

- **Scope: `classify()` only.** Do NOT touch `classifyAiMove()`/`classifyPattern()` (AI-move & blunder/puzzle paths) — deferred by decision. `figure_7` and other multi-tag tactics are never emitted on live user moves; see OI-30 in `docs/open_issues.md`.
- **Do not change post-move detection behavior.** The transition gate only *adds* a pre-move check. The post-move double-threat predicate must remain the exact loose-Case-B logic `classify()` uses today (it intentionally differs from the stricter exported `detectDoubleThreat()`; swapping to that one WOULD change existing classifications — verified: `3333344044114` col0 flips from `double_threat` to not).
- **Preserve the `classify()` structural invariants** guarded by `classifier.test.js` describe `SC-002`: `classify()`'s own body must contain exactly **one** `new Board(` call and **zero** `parseBoardState(` calls. The new pre-move checks operate on the already-constructed `board`/`nextBoard` — do NOT add `new Board(...)` inside `classify()`.
- **Movestrings are solver-verified, never hand-rolled** (project rule). All fixtures below were sourced by structural search over legal continuations and their scores confirmed via `createSolverProcess().query()`.
- **Run tests with** `npm run test:fast` (inside `connect-four/`). Never run `npm test` here (candidate-generator hangs).
- **Coordinates are 0-indexed** throughout server code.

---

## File Structure

- `server/classifier.js` — add a private `hasDoubleThreat(board, player)` helper (verbatim extraction of the current inline loose double-threat logic) directly above `export function classify(...)`; gate the `double_threat` and `forced_win` returns inside `classify()`.
- `tests/classifier/classifier.test.js` — add two `describe` blocks with the transition fixtures. This is the regression guard; all pre-existing tests in this file must stay green.

No other files change.

---

## Task 1: Transition-gate the `double_threat` tag

**Files:**
- Modify: `connect-four/server/classifier.js` — add `hasDoubleThreat` helper above `classify()` (~line 616); replace the inline `double_threat` block inside `classify()` (currently `classifier.js:643–666`).
- Test: `connect-four/tests/classifier/classifier.test.js`

**Interfaces:**
- Produces (module-private): `hasDoubleThreat(board: Board, player: 1|2): boolean` — true iff `player` has a double threat on `board` evaluated as-is (loose Case B). Not exported; exercised through `classify()`.
- Consumes: existing `Board`, `Board#reachableThreats(player) → Map<number, number[]>`, `Board#colHeights`, `Board#withMove(col)`, `Board#currentPlayer`.

- [ ] **Step 1: Write the failing test**

Add this block to `connect-four/tests/classifier/classifier.test.js` (after the existing `describe('classify() double_threat', …)` block):

```javascript
describe('classify() double_threat transition gating', () => {
  // Persisting double threat (the reported bug): P1 already holds a standing double threat
  // (0-indexed cols 2 & 6 are gravity-top wins) and plays a DIFFERENT optimal developing move
  // (col3, solver score 13 = max). Pre-fix classify tagged this double_threat every such move,
  // so the coach falsely repeated "you created the double threat". Post-fix it must not.
  test('3344000000111151 col3 → NOT double_threat (double threat already present, not created)', () => {
    const result = classify('3344000000111151', 3, [-1000, 12, 13, 12, 12, 12, 13]);
    assert.notEqual(result.tag, 'double_threat');
    assert.equal(result.tag, 'best_move');
  });

  // Regression: a move that genuinely CREATES the double threat (absent before, present after)
  // still fires. '3344' col2 is the classic figure-7 completing move; pre-move P1 has no double
  // threat, post-move it does.
  test('3344 col2 → double_threat (newly created — regression)', () => {
    const result = classify('3344', 2, [-4, -3, 18, 2, 2, 18, -3]);
    assert.equal(result.tag, 'double_threat');
  });
});
```

- [ ] **Step 2: Run the test to verify the persisting case fails**

Run: `cd connect-four && node --test tests/classifier/classifier.test.js 2>&1 | grep -A3 "transition gating"`
Expected: the `3344000000111151 col3 → NOT double_threat` test FAILS — pre-fix `classify()` returns `tag: 'double_threat'`, so `assert.notEqual(..., 'double_threat')` throws. (The regression test `3344 col2` passes already — it guards against over-suppression.)

- [ ] **Step 3: Add the `hasDoubleThreat` helper**

In `connect-four/server/classifier.js`, insert this function immediately **above** `export function classify(moves, candidateCol, scores) {` (~line 616, after the `Board` class / its closing brace):

```javascript
/**
 * True if `player` has a double threat on `board`, evaluated as-is (no candidate move).
 *
 * Extracted verbatim from the inline logic classify() has always used for its post-move
 * double_threat check, so the SAME predicate can also run on the PRE-move board for transition
 * gating (praise only an absent→present creation).
 *
 * NOTE: this intentionally differs from the exported detectDoubleThreat() in Case B. This loose
 * variant matches ANY two consecutive-row reachable threats in a column; detectDoubleThreat()
 * additionally requires the lower threat to sit at the gravity-top. They are NOT interchangeable:
 * swapping classify() to detectDoubleThreat() would change existing post-move classifications
 * (e.g. '3333344044114' col0 stops being double_threat). Reconciling the two loose/strict Case B
 * definitions is out of scope here — see
 * docs/superpowers/specs/2026-07-14-coach-creation-pattern-transition-design.md.
 *
 * @param {Board} board
 * @param {number} player  1 or 2
 * @returns {boolean}
 */
function hasDoubleThreat(board, player) {
  const threatCells = [];
  for (const [col, rows] of board.reachableThreats(player)) {
    for (const row of rows) threatCells.push({ col, row });
  }

  // Case A: two or more distinct columns each have a threat at their gravity-top
  const gravityTopCols = new Set(
    threatCells.filter(t => t.row === board.colHeights[t.col]).map(t => t.col)
  );
  if (gravityTopCols.size >= 2) return true;

  // Case B: two consecutive-row threats in the same column (opponent needs 2 turns to block)
  const byCol = {};
  for (const t of threatCells) {
    if (!byCol[t.col]) byCol[t.col] = [];
    byCol[t.col].push(t.row);
  }
  for (const rows of Object.values(byCol)) {
    const sorted = rows.sort((a, b) => a - b);
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i + 1] === sorted[i] + 1) return true;
    }
  }

  return false;
}
```

- [ ] **Step 4: Gate the `double_threat` return inside `classify()`**

In `connect-four/server/classifier.js`, replace the entire inline `double_threat` block (currently `classifier.js:643–666`, from the `// ── Category 3: Double Threat` comment through the end of the Case B loop) with:

```javascript
    // ── Category 3: Double Threat ───────────────────────────────────────────
    // Only praise a double threat this move CREATED: present on the post-move board AND
    // absent on the pre-move board, both from the mover's perspective. A double threat that
    // was already present and merely persists is not "created" here — fall through so the
    // coach does not repeat "you created the double threat" on every subsequent move.
    const player = board.currentPlayer;
    if (hasDoubleThreat(nextBoard, player) && !hasDoubleThreat(board, player)) {
      return { tag: 'double_threat' };
    }
```

Leave the `// ── Category 4: Forced Win` block that follows unchanged in this task, except that its `board.currentPlayer` may now reuse the `player` const — do NOT edit it yet (Task 2 does). The `threatCells`/`gravityTopCols`/`byCol` locals are removed (they now live in `hasDoubleThreat`).

- [ ] **Step 5: Run the transition tests — verify they pass**

Run: `cd connect-four && node --test tests/classifier/classifier.test.js 2>&1 | grep -A3 "transition gating"`
Expected: both `double_threat transition gating` tests PASS.

- [ ] **Step 6: Run the full classifier suite — verify no regression**

Run: `cd connect-four && node --test tests/classifier/classifier.test.js 2>&1 | tail -5`
Expected: all tests pass (`pass N`, `fail 0`), including the 8 pre-existing `classify() double_threat` fixtures and the `SC-002` single-`new Board(` / zero-`parseBoardState(` invariants.

- [ ] **Step 7: Commit**

```bash
cd connect-four && git add server/classifier.js tests/classifier/classifier.test.js && git commit -m "fix(coach): only tag double_threat when the move creates it

Gate classify()'s double_threat on an absent->present transition so the
coach stops repeating 'you created the double threat' when the pattern
was already on the board. Extract the (loose) post-move predicate into
hasDoubleThreat() and run it on the pre-move board too.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Transition-gate the `forced_win` tag

**Files:**
- Modify: `connect-four/server/classifier.js` — the `// ── Category 4: Forced Win` block inside `classify()` (currently `classifier.js:668–671`).
- Test: `connect-four/tests/classifier/classifier.test.js`

**Interfaces:**
- Consumes: existing exported `detectForcedWin(board, perspective = board.currentPlayer) → { matched: boolean, … }` (pure geometry, no solver); the `player` const introduced in Task 1.

- [ ] **Step 1: Write the failing test**

Add this block to `connect-four/tests/classifier/classifier.test.js` (after the `describe('detectForcedWin()', …)` block):

```javascript
describe('classify() forced_win transition gating', () => {
  // Persisting forced win: P2 already has a forcing chain (detectForcedWin(pre) = true) and plays
  // a maintaining move (col1) instead of cashing it. Pre-fix classify tagged this forced_win;
  // post-fix it must not. NOTE: on this board the maintaining move is solver-suboptimal (score
  // -4), so it correctly falls through to suboptimal_move — maintaining a forcing chain rather
  // than advancing it is usually the sub-optimal line, which is why a *positive-score* persisting
  // forced_win is rare in real play.
  test('662345230545562635000001111212246 col1 → NOT forced_win (forced win already present)', () => {
    const result = classify('662345230545562635000001111212246', 1, [-1000, -4, -1000, 5, -4, -4, -4]);
    assert.notEqual(result.tag, 'forced_win');
    assert.equal(result.tag, 'suboptimal_move');
  });

  // Regression: a move that ESTABLISHES the forcing chain (absent before, present after) still
  // fires. On '662345230545562635000001', P1's col6 (score 6 = max) opens the forcing chain.
  test('662345230545562635000001 col6 → forced_win (newly established — regression)', () => {
    const result = classify('662345230545562635000001', 6, [-1000, -9, 9, -9, -9, -9, 6]);
    assert.equal(result.tag, 'forced_win');
  });
});
```

- [ ] **Step 2: Run the test to verify the persisting case fails**

Run: `cd connect-four && node --test tests/classifier/classifier.test.js 2>&1 | grep -A3 "forced_win transition gating"`
Expected: `662345230545562635000001111212246 col1 → NOT forced_win` FAILS — pre-fix `classify()` returns `tag: 'forced_win'` for this persisting position. (The `col6` regression test passes already.)

- [ ] **Step 3: Gate the `forced_win` return inside `classify()`**

In `connect-four/server/classifier.js`, replace the `// ── Category 4: Forced Win` block (currently):

```javascript
    // ── Category 4: Forced Win ──────────────────────────────────────────────
    if (detectForcedWin(nextBoard, board.currentPlayer).matched) {
      return { tag: 'forced_win' };
    }
```

with:

```javascript
    // ── Category 4: Forced Win ──────────────────────────────────────────────
    // Same transition rule as double_threat: only when this move ESTABLISHED the forced win
    // (present after, absent before). A forced win, once made, persists under optimal play, so
    // without this gate every subsequent move would re-fire "you have a forced win".
    if (detectForcedWin(nextBoard, player).matched && !detectForcedWin(board, player).matched) {
      return { tag: 'forced_win' };
    }
```

(`player` is the const introduced in Task 1's `double_threat` block; it is in scope here.)

- [ ] **Step 4: Run the transition tests — verify they pass**

Run: `cd connect-four && node --test tests/classifier/classifier.test.js 2>&1 | grep -A3 "forced_win transition gating"`
Expected: both `forced_win transition gating` tests PASS.

- [ ] **Step 5: Run the full classifier suite — verify no regression**

Run: `cd connect-four && node --test tests/classifier/classifier.test.js 2>&1 | tail -5`
Expected: all tests pass (`fail 0`), including the pre-existing `detectForcedWin()` and `classify() … not forced_win` fixtures.

- [ ] **Step 6: Commit**

```bash
cd connect-four && git add server/classifier.js tests/classifier/classifier.test.js && git commit -m "fix(coach): only tag forced_win when the move establishes it

Gate classify()'s forced_win on an absent->present transition, mirroring
the double_threat fix, so the coach does not repeat 'you have a forced
win' on every move once the forcing chain exists.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: End-to-end verification, docs, and memory

**Files:**
- Modify: `docs/superpowers/specs/2026-07-14-coach-creation-pattern-transition-design.md` (status line)
- Create: `/Users/elsonidoq/.claude/projects/-Users-elsonidoq-prog-cuatro-en-linea/memory/project_coach_creation_transition_gate.md` (+ one-line pointer in `MEMORY.md`)

**Interfaces:** none (verification + documentation only).

- [ ] **Step 1: Confirm the fix end-to-end through the real classifier**

Run:

```bash
cd connect-four && node --input-type=module -e '
import { classify } from "./server/classifier.js";
const cases = [
  ["persisting DT",   "3344000000111151", 3, [-1000,12,13,12,12,12,13], "best_move"],
  ["created DT",      "3344",             2, [-4,-3,18,2,2,18,-3],       "double_threat"],
  ["persisting FW",   "662345230545562635000001111212246", 1, [-1000,-4,-1000,5,-4,-4,-4], "suboptimal_move"],
  ["established FW",  "662345230545562635000001",          6, [-1000,-9,9,-9,-9,-9,6],     "forced_win"],
];
let ok = true;
for (const [name, m, c, s, want] of cases) {
  const got = classify(m, c, s).tag;
  const pass = got === want;
  ok = ok && pass;
  console.log(`${pass ? "OK " : "XX "} ${name}: classify(${m}, ${c}) = ${got} (want ${want})`);
}
process.exit(ok ? 0 : 1);
'
```

Expected: four `OK` lines, exit 0.

- [ ] **Step 2: Trace the suppressed path to the coach (no phrase pool → generic fallback, usually a nudge not praise)**

Confirm that when `classify()` returns `best_move`/`suboptimal_move`, no `coach.best_move.*`/`coach.suboptimal_move.*` pool exists, so `evaluateMoveHandler` returns `coachPhraseKey: null` and the frontend uses its generic quality line — and confirm which generic line the plan's own persisting-DT fixture actually reaches (it is driven by `scoreMove`'s `quality`, not by `classify`'s tag, and the fixture's move is sub-max, so expect `coach.generic.suboptimal`, not `coach.generic.optimal`):

```bash
cd connect-four && node --input-type=module -e '
import { readFileSync } from "node:fs";
const en = JSON.parse(readFileSync("./src/i18n/en.json", "utf8"));
console.log("coach.best_move present?       ", !!en.coach?.best_move);
console.log("coach.drawing_move present?    ", !!en.coach?.drawing_move);
console.log("coach.suboptimal_move present? ", !!en.coach?.suboptimal_move);
console.log("coach.generic.optimal present?    ", !!en.coach?.generic?.optimal);
console.log("coach.generic.suboptimal present?", !!en.coach?.generic?.suboptimal);
'
```

Expected: `coach.best_move`, `coach.drawing_move`, and `coach.suboptimal_move` are all `false` (no pool for any of them), while `coach.generic.optimal` and `coach.generic.suboptimal` are both `true`. This is the existing frontend fallback at `src/lib/useGameBoard.js:284-288` — no client change needed. For the plan's persisting-DT fixture (`3344000000111151` col3, score 12, below the max of 13), `scoreMove` returns `quality: 'suboptimal'`, so the coach speaks `coach.generic.suboptimal` ("Not bad, but there was a sharper move") — a mild, truthful nudge, not the "Nice move" praise line. This is accepted: the move genuinely is sub-max (holding a standing threat rather than cashing it), so the nudge is accurate; only the false "you created it" claim needed removing, not the underlying quality judgment. (If `coach.best_move`/`coach.suboptimal_move` unexpectedly exist, STOP: the suppressed move would speak a stale pooled line instead of the generic fallback.)

- [ ] **Step 3: Verify the `/api/explain-move` consumer manually**

`classify()` is also called, without an overriding `category`, inside `POST /api/explain-move`
(`server/index.js:1043`, `classify()` call at `~index.js:1091`). This handler does NOT take a
`scores` field in its request body — it computes scores itself via `solver.query(moves)` — and its
request/response shapes are `{ moves, candidateCol, humanFirst?, requestDeepReveal? }` →
`{ oneLiner, patternTag, deepReveal }` (see `guardExplainMovePayload`). Its `patternTag` feeds
`composeExplanation()` directly. After this fix, a persisting double-threat/forced-win move will no
longer produce a pattern-specific `double_threat`/`forced_win` explanation there — it will fall
through to whatever `composeExplanation()` produces for `best_move`/`suboptimal_move`.

CAUTION — response caching: this endpoint caches by `sha256(moves:candidateCol)` per locale in the
`explanation_cache` table (`positionHash`, independent of `scores`/patternTag). If this exact
`(moves, candidateCol)` pair was ever explained before this fix shipped, the cached `patternTag` and
`oneLiner` will still be the stale pre-fix values and the endpoint will keep serving them — the fix
will look like it didn't work even though `classify()` itself is correct. Use a `(moves, candidateCol)`
pair that has never been queried before (the persisting-DT fixture is a reasonable choice if unused),
or delete/ignore the matching `explanation_cache` row before testing, or query the local dev DB
directly to confirm no matching row exists first.

Confirm this is acceptable by hitting the endpoint with the plan's persisting-DT fixture (no `scores`
field — the server computes them from the solver itself):

```bash
cd connect-four && npm run dev:server &   # or however the local server is already started
sleep 2
curl -s -X POST http://localhost:3001/api/explain-move \
  -H 'Content-Type: application/json' \
  -d '{"moves":"3344000000111151","candidateCol":3}' | node -e '
    let data = "";
    process.stdin.on("data", c => data += c);
    process.stdin.on("end", () => { const j = JSON.parse(data); console.log("patternTag:", j.patternTag); console.log("oneLiner:", j.oneLiner); });
  '
```

Expected (post-fix, uncached): `patternTag` is `best_move` or `suboptimal_move` (not `double_threat`),
and `oneLiner` does NOT claim the move "created" or "made" a double threat — it reads as a generic
good-move/quality explanation instead. Read the actual response text and confirm it is not misleading
before proceeding; if it is misleading, this task is not done. (`server/candidate-generator.js:607` is
a third `classify(` consumer that pushes `cls.tag` into puzzle-generation metadata; its test,
`candidate-generator.test.js`, is excluded from `npm run test:fast` per CLAUDE.md, so it is NOT
covered by Step 4's test run below — this is an accepted, CI-uncovered risk in the same low-severity
direction as the fix, not something to fix here.)

- [ ] **Step 4: Run the fast test suite**

Run: `cd connect-four && npm run test:fast 2>&1 | tail -15`
Expected: suite passes (`fail 0`). If anything unrelated is red, confirm it is red on `main` too before proceeding.

- [ ] **Step 5: Update the design-doc status**

In `docs/superpowers/specs/2026-07-14-coach-creation-pattern-transition-design.md`, change the header line `**Status**: design approved (pending written-spec review)` to `**Status**: IMPLEMENTED 2026-07-14 (plan: docs/superpowers/plans/2026-07-14-coach-creation-pattern-transition.md)`.

- [ ] **Step 6: Write the memory gotcha**

Create `/Users/elsonidoq/.claude/projects/-Users-elsonidoq-prog-cuatro-en-linea/memory/project_coach_creation_transition_gate.md`:

```markdown
---
name: project_coach_creation_transition_gate
description: classify() double_threat/forced_win fire only on absent->present transition; two loose/strict double-threat predicates coexist
metadata:
  type: project
---

`classify()` (server/classifier.js, live user-move coach path) tags `double_threat` and
`forced_win` **only when the move creates them** (present on post-move board AND absent on
pre-move board, from the mover's perspective) — not on mere presence. This stops the coach
repeating "you created the double threat" while a pattern persists across moves.

**Trap:** there are now TWO double-threat predicates that differ in Case B. Private
`hasDoubleThreat(board, player)` (used by `classify()`) uses LOOSE Case B (any two
consecutive-row reachable threats). Exported `detectDoubleThreat()` (used by
`classifyPattern`/`tagBlunder`) uses STRICT Case B (lower threat must be gravity-top). They are
NOT interchangeable — swapping `classify()` to `detectDoubleThreat()` breaks `3333344044114`
col0 (stops being double_threat). Don't "dedupe" them without re-validating.

**Out of scope / see also:** AI-move path (`classifyAiMove`/`classifyPattern`) is NOT
transition-gated; `figure_7` & other multi-tag tactics never fire on live user moves — [[OI-30]].
Design: docs/superpowers/specs/2026-07-14-coach-creation-pattern-transition-design.md.
```

Then add one line under the "## Frontend & board display" (or "Simulation…"/appropriate) section of `MEMORY.md`:

```markdown
- [Coach creation transition gate](project_coach_creation_transition_gate.md) — classify() double_threat/forced_win fire only on absent→present transition; loose vs strict double-threat predicates coexist (don't dedupe)
```

- [ ] **Step 7: Commit**

```bash
cd connect-four/.. && git add docs/superpowers/specs/2026-07-14-coach-creation-pattern-transition-design.md && git commit -m "docs: mark coach creation-pattern transition design as implemented

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

(Memory files under `~/.claude/projects/.../memory/` are outside the repo and are not committed.)

---

## Self-Review

**Spec coverage** (against `2026-07-14-coach-creation-pattern-transition-design.md`):
- Transition principle for `double_threat` → Task 1. ✓
- Transition principle for `forced_win` → Task 2. ✓
- Suppressed → generic quality fallback via existing frontend logic → Task 3 Step 2 verifies the `coach.best_move`/`coach.suboptimal_move`-absent / `coach.generic`-present chain; no code change needed (design says frontend already handles it). Correction: the suppressed case does NOT reliably land on `coach.generic.optimal` ("praise") — the plan's own persisting-DT fixture is solver-suboptimal (score 12 vs max 13), so `scoreMove` grades it `suboptimal` and the coach speaks `coach.generic.suboptimal` (a mild "sharper move existed" nudge). This is structural: holding a standing double threat/forced win, the max move is normally to cash it, so any move that *leaves it standing* is by construction usually sub-max. The fix is still correct — the false "you created it" claim is gone — but the earlier "falls through to generic praise" framing overstated it; corrected here and in the design doc. ✓
- `immediate_threat` / `forced_block` / `forbidden_columns` left unchanged → not touched by any task (only the Category 3 & 4 blocks are edited). ✓
- AI moves + `figure_7`/siblings out of scope → Global Constraints + OI-30 cross-ref. ✓
- Testing against the case-space (created vs persisting, per pattern) → Task 1 & Task 2 each carry a created/established regression fixture and a persisting fixture; Task 3 Step 1 re-checks all four through the real `classify()`. ✓
- Cost/consumer-audit risks → the SC-002 invariant is explicitly preserved (Global Constraints + Task 1 Step 6). Correction: this is NOT limited to puzzle paths. `classify()` has two additional callers not shielded by an explicit `category` override: `server/index.js:1091` (`POST /api/explain-move`, live user-facing — verified manually in Task 3 Step 3) and `server/candidate-generator.js:607` (puzzle-generation metadata, whose test is excluded from `npm run test:fast` per CLAUDE.md and therefore not covered by this plan's automated gate — accepted as a low-severity, same-direction, CI-uncovered risk per project decision). Puzzle-scoring handlers ARE unaffected, since they pass an explicit `category` that overrides `patternTag` (`evaluateMoveHandler.js:90`). ✓

**Placeholder scan:** every code and test block is complete literal content; every fixture has a concrete movestring + solver-verified scores + expected tag. No TBD/TODO. ✓

**Type consistency:** `hasDoubleThreat(board, player)` is defined in Task 1 and consumed in Tasks 1–2 with the same `(Board, 1|2) → boolean` signature; `player = board.currentPlayer` introduced in Task 1 is reused in Task 2 (same lexical block); `detectForcedWin(board, perspective) → { matched }` matches its existing export. `.tag` string values (`double_threat`, `forced_win`, `best_move`, `suboptimal_move`) match `classify()`'s return shape. ✓
