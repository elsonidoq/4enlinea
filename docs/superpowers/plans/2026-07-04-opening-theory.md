# Opening Theory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Teach Connect Four opening theory in Lessons, and make the reason engine explain an opening blunder as a *deviation from a known opening* (the book move was the correct move) — grounded, never fabricated.

**Architecture:** Two independent workstreams. **Part A** authors 3–4 lesson JSON files on the already‑built lesson infra (no code). **Part B** adds an opening‑evidence field to the feature‑vector reason engine (`computeReason`) via a new KB‑driven opening matcher, un‑skips openings in the eval harness, teaches the glossary + grader, and grounds it in the production prompt — reusing `centerDominance.js` for the off‑book fallback.

**Tech Stack:** Node ESM (server + `.mjs` reason engine), React (lesson screens, reused), c4solver (via `c4solver-wrapper.js`), `node --test` / the repo's `tests/` runner.

## Global Constraints

- **Coordinates are 0‑indexed** (row 0 = bottom, col 0 = left); the reason engine emits `cNrM` **1‑indexed**. Only translation boundaries: frontend display, c4solver wrapper.
- **KB is the single source of truth for strategy.** No strategic claim is authored outside `docs/knowledge-base/`. Opening lines/movestrings come from the seven `allen-*opening*.md` entries.
- **Reason invariants (`docs/architecture/reason-INVARIANTS.md`) are non‑negotiable:** I0 correctness over optimization (never prune search/solver calls to save cost); I2 every clause solver‑ or canon‑grounded (never fabricate); I8 reuse existing detectors as evidence; I9 one unifying mechanism over special cases; I12 validate a classify/stop rule against its **full case‑space** with a counterexample per case, through the **production** detector.
- **Never reveal the answer column** before a Socratic attempt.
- **Run tests with `npm run test:fast`** inside `connect-four/` (omits the solver‑hammering `candidate-generator.test.js`). Never run `test:fast` concurrently with a solver harvest/dev server (IPC deadlock).
- **Movestrings are verified with tools, never by hand:** `./visualize_board.sh <movestring>` and `connect-four/server/scripts/reason_engine/TOOLS/optimal_line.mjs <movestring>`.
- **Commit after each task.** Branch off `stagging` (current branch); do not commit to a default branch directly.
- Reason‑engine solver scripts: `createSolverProcess` from `c4solver-wrapper.js`; always `solver.destroy()` in a `finally` or the process hangs.

---

# PART A — Opening Lessons (content only, no code)

All lessons use the existing model: `connect-four/lessons/lesson-NN-*.json`, validated by `connect-four/server/lessonLoader.js` (`validateLesson`), served by `GET /api/lessons(/:id)`, rendered by `ConceptScreen`/`SocraticScreen` (client‑side `col === socratic.correctCol`). `boardSpec` is a 7‑element display encoding (`g`/`d` bottom‑to‑top per column). i18n namespace `lesson.<id>.slide.<n>.*`.

**Reuse for boardSpec authoring:** `boardToSpec(parseMovestring(movestring))` from `connect-four/src/lib/movestring.js` converts a KB movestring to the exact 7‑element `boardSpec`. Never hand‑build a `boardSpec`.

### Task A1: boardSpec generator for the opening boards

**Files:**
- Create: `connect-four/scripts/gen-opening-boardspecs.mjs` (one‑off authoring helper)

**Interfaces:**
- Produces: printed `{ movestring, boardSpec, nextPlayer }` for every board the lessons use, so Tasks A2–A4 paste verified `boardSpec` arrays.

- [ ] **Step 1: Write the generator**

```javascript
// connect-four/scripts/gen-opening-boardspecs.mjs
import { parseMovestring, boardToSpec, nextPlayer } from '../src/lib/movestring.js';
const BOARDS = {
  empty_centre: '',                 // Own the Centre — Socratic target col 3
  five_four: '333334444',           // 5-4 opening (won position, concept slide)
  candlesticks: '3333311115555',    // Candlesticks stem (concept slide)
  imitation_early: '333',           // "I play where you play" concept
  gambit: '3265533353553111',       // Third-Row Gambit — Socratic target col 4
  d3d4_231: '3332223362',           // D3-D4 Diagram 231 — Socratic target col 1
  three_four: '3332222',            // 3-4 opening (reading slide)
};
for (const [name, ms] of Object.entries(BOARDS)) {
  const spec = boardToSpec(parseMovestring(ms));
  console.log(name, JSON.stringify(spec), 'next=' + nextPlayer(ms));
}
```

- [ ] **Step 2: Run it and capture output**

Run: `cd connect-four && node scripts/gen-opening-boardspecs.mjs`
Expected: seven lines, each a 7‑element `boardSpec` array. Keep the output — Tasks A2–A4 use these exact arrays.

- [ ] **Step 3: Cross‑check two boards against the visualizer**

Run: `./visualize_board.sh 3332223362` and `./visualize_board.sh 3265533353553111`
Expected: the disc layout matches the generated `boardSpec` (col heights + colors). Confirms the converter and the movestrings agree.

- [ ] **Step 4: Commit**

```bash
git add connect-four/scripts/gen-opening-boardspecs.mjs
git commit -m "chore(lessons): boardSpec generator for opening boards"
```

### Task A2: Lesson "Own the Centre"

**Files:**
- Create: `connect-four/lessons/lesson-12-opening-centre.json` (pick the next free NN after the current max)
- Modify: `connect-four/src/i18n/en.json` (add `lesson.opening-centre.*` keys) — confirm the exact i18n path other lessons use before writing
- Test: `connect-four/tests/lessons/opening-lessons.test.js` (create)

**Interfaces:**
- Consumes: `boardSpec` for `empty` (Socratic) and `five_four`/`imitation_early` (concept slides) from Task A1.
- Produces: a lesson whose `socratic.correctCol === 3`.

Content is grounded in KB `allen-opening-principles.short_summary` and `allen-opening-tables.short_summary` (centre = the only first‑player winning move; central squares sit on more lines; odd‑row‑threat quest — light). `userPerspective: "red"` (learner is the first player). `socratic`: empty board (`boardSpec` all `""`), `correctCol: 3`. `confirmationCategory: null`, `confirmationCount: 0`.

- [ ] **Step 1: Write the failing lesson‑validation test**

```javascript
// connect-four/tests/lessons/opening-lessons.test.js
import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateLesson } from '../../server/lessonLoader.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../lessons');
const load = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));

test('opening-centre lesson is valid and Socratic targets centre', () => {
  const l = load('lesson-12-opening-centre.json');
  assert.equal(validateLesson(l), null);        // null = valid
  assert.equal(l.socratic.correctCol, 3);
  assert.equal(l.confirmationCategory, null);
});
```

- [ ] **Step 2: Run it — expect FAIL (file missing)**

Run: `cd connect-four && node --test tests/lessons/opening-lessons.test.js`
Expected: FAIL (`ENOENT` / cannot read `lesson-12-opening-centre.json`).

- [ ] **Step 3: Author the lesson JSON**

Write `lesson-12-opening-centre.json` grounded in the two KB entries: 3–4 concept slides (centre value; the Table headline "centre wins, edges don't"; the odd‑row‑threat idea kept light), then the empty‑board Socratic (`correctCol: 3`, `goalPrompt` = "You move first — where is the strongest opening move?"). Use `boardToSpec` arrays from Task A1 for the concept boards; the Socratic `boardSpec` is `["","","","","","",""]`. Every user‑facing string is a `t('lesson.opening-centre.slide.N...')` key added to `en.json`. Set `free: true`.

- [ ] **Step 4: Run the test — expect PASS**

Run: `cd connect-four && node --test tests/lessons/opening-lessons.test.js`
Expected: PASS.

- [ ] **Step 5: Verify it loads via the server loader (no console errors)**

Run: `cd connect-four && node -e "import('./server/lessonLoader.js').then(m=>{m.loadLessons('./lessons');console.log(m.getLessons().map(l=>l.id))})"`
Expected: the list includes `opening-centre` with no `[lessonLoader] invalid` error.

- [ ] **Step 6: Commit**

```bash
git add connect-four/lessons/lesson-12-opening-centre.json connect-four/src/i18n/en.json connect-four/tests/lessons/opening-lessons.test.js
git commit -m "feat(lessons): Own the Centre opening lesson"
```

### Task A3: Lesson "I Play Where You Play"

**Files:**
- Create: `connect-four/lessons/lesson-13-opening-imitate.json`
- Modify: `connect-four/src/i18n/en.json` (`lesson.opening-imitate.*`); `connect-four/tests/lessons/opening-lessons.test.js` (add a case)

**Interfaces:**
- Consumes: `candlesticks`, `five_four`, `imitation_early` boardSpecs (Task A1).
- Produces: a valid lesson; its Socratic targets the "play on top of the opponent's last disc" column.

Grounded in `allen-candlesticks-opening.short_summary` + `allen-opening-principles` (imitative play). Concept slides show the Candlesticks / 5‑4 won stacks. **Socratic:** an early imitation position — pick a board where the sound move is directly above the opponent's last disc and is solver‑confirmed best; verify the `correctCol` with `optimal_line.mjs`/`visualize_board.sh` before authoring (do not assume). `userPerspective: "red"`, `free: true`.

- [ ] **Step 1: Add the failing test case**

```javascript
test('opening-imitate lesson is valid', () => {
  const l = load('lesson-13-opening-imitate.json');
  assert.equal(validateLesson(l), null);
  assert.ok(Number.isInteger(l.socratic.correctCol));
});
```

- [ ] **Step 2: Run — expect FAIL** (`cd connect-four && node --test tests/lessons/opening-lessons.test.js`).
- [ ] **Step 3: Verify the Socratic board + correctCol with the solver**

Run `./visualize_board.sh <chosen-movestring>`; confirm the imitation column is the unique/best move (`scr` positive there). Record the 0‑indexed `correctCol`.

- [ ] **Step 4: Author the lesson JSON** (concept slides + verified Socratic), i18n keys in `en.json`.
- [ ] **Step 5: Run the test — expect PASS.**
- [ ] **Step 6: Commit**

```bash
git add connect-four/lessons/lesson-13-opening-imitate.json connect-four/src/i18n/en.json connect-four/tests/lessons/opening-lessons.test.js
git commit -m "feat(lessons): I Play Where You Play opening lesson"
```

### Task A4: Lesson "Sharp Openings" (Pro‑gated)

**Files:**
- Create: `connect-four/lessons/lesson-14-opening-sharp.json`
- Modify: `connect-four/src/i18n/en.json` (`lesson.opening-sharp.*`); `connect-four/tests/lessons/opening-lessons.test.js`

**Interfaces:**
- Consumes: `gambit` (`3265533353553111`), `d3d4_231` (`3332223362`), `five_four`, `three_four` boardSpecs (Task A1).
- Produces: a valid lesson; `socratic.correctCol` is the KB‑verified unique winning move.

Grounded in `allen-third-row-gambit`, `allen-d3-d4-opening`, `allen-5-4-opening`. Concept slides: the 5‑4 / D3‑D4 easy central wins + the 3‑4 delayed‑D4 trap (reading only — its payoff board has the losing side to move). **Socratic:** the "only one move to win" board — gambit `3265533353553111` → `correctCol: 4` (or D3‑D4 `3332223362` → `correctCol: 1`; pick one, keep the other as a concept slide). `free: false` (Pro, mirroring lessons 8–11).

- [ ] **Step 1: Add the failing test case**

```javascript
test('opening-sharp lesson is valid, Pro, Socratic targets the only winning move', () => {
  const l = load('lesson-14-opening-sharp.json');
  assert.equal(validateLesson(l), null);
  assert.equal(l.free, false);
  assert.equal(l.socratic.correctCol, 4);   // gambit 3265533353553111 -> col 4
});
```

- [ ] **Step 2: Run — expect FAIL.**
- [ ] **Step 3: Re‑verify the Socratic board** `./visualize_board.sh 3265533353553111` (scr `+2` only at 0‑indexed col 4). 
- [ ] **Step 4: Author the lesson JSON + i18n** (`free: false`).
- [ ] **Step 5: Run the test — expect PASS.**
- [ ] **Step 6: Commit**

```bash
git add connect-four/lessons/lesson-14-opening-sharp.json connect-four/src/i18n/en.json connect-four/tests/lessons/opening-lessons.test.js
git commit -m "feat(lessons): Sharp Openings lesson (Pro)"
```

### Task A5: Curriculum doc + saga ordering

**Files:**
- Modify: `docs/mvp/lesson-curriculum.md` (add the 3 opening lessons)

- [ ] **Step 1:** Add an "Opening Theory" section to `lesson-curriculum.md` describing the 3 lessons, their KB sources, and their Socratic targets. Note saga order is the numeric filename prefix (12/13/14).
- [ ] **Step 2:** Verify `GET /api/lessons` order: `cd connect-four && node -e "import('./server/lessonLoader.js').then(m=>{m.loadLessons('./lessons');console.log(m.getLessons().map(l=>[l.order,l.id]))})"` — the three appear last, in order.
- [ ] **Step 3: Commit** `git add docs/mvp/lesson-curriculum.md && git commit -m "docs(lessons): add opening theory lessons to curriculum"`

---

# PART B — Reason engine: opening‑deviation reason

> **Read before starting (mandatory, per CLAUDE.md):** `reason-INVARIANTS.md`, `reason-DECISIONS.md`, `reason-case-taxonomy.md`, `blunder-reason-evidence.md`. Then read `connect-four/server/scripts/reason_engine/reasonEngine.mjs` (`computeReason`), `connect-four/server/centerDominance.js`, `connect-four/server/scripts/reason_engine/lib/reasonNarratorVector.mjs` (`toNarratorVector`/`pruneVector`), and `docs/architecture/feature-vector-glossary.md`.

**The mechanism (Decision D4):** an opening's worked‑example movestring is a sequence of good moves. When the moves so far are a mirror‑normalized **prefix** of a KB opening line and the blundering player is the opening's **beneficiary**, the opening's next move is the known winning continuation — verified best by the solver. The reason emits this provenance; the two‑halves engine still supplies *why the played move loses*. Four case‑space guards keep it sound (see Task B2).

### Task B1: KB opening line index + prefix matcher

**Files:**
- Create: `connect-four/server/scripts/reason_engine/openingMatch.mjs`
- Test: `connect-four/server/scripts/reason_engine/openingMatch.test.mjs`

**Interfaces:**
- Produces:
  - `loadOpeningLines()` → `[{ id, family, moves: number[], beneficiary: 1 }]` built by parsing the worked‑example `movestring`s out of the seven `docs/knowledge-base/allen-*opening*.md` entries (KB = source of truth). `family` = `"central-column opening"` for 5‑4/5‑1/3‑4/D3‑D4/candlesticks; `"first-row opening"` for the gambit. All Allen openings here are first‑player wins → `beneficiary: 1`.
  - `matchOpeningPrefix(movestring)` → `{ ids: string[], family: string|null, bookNextCol: number|null, matchedPrefixLen: number } | null`. Mirror‑normalize (reflect columns about 3) before matching; a movestring matches a line if it equals the line's first `k` plies **or** its reflection. `ids` lists every line the prefix is consistent with; `bookNextCol` is set **only** when all consistent lines agree on the next column (else `null`); `family` is set when all consistent lines share one family.

- [ ] **Step 1: Write failing tests**

```javascript
// openingMatch.test.mjs
import { test } from 'node:test';
import assert from 'node:assert';
import { loadOpeningLines, matchOpeningPrefix } from './openingMatch.mjs';

test('loads KB opening lines including D3-D4 and candlesticks', () => {
  const lines = loadOpeningLines();
  const ids = lines.map(l => l.id);
  assert.ok(ids.includes('allen-5-4-opening'));
  assert.ok(ids.includes('allen-d3-d4-opening'));
  assert.ok(ids.includes('allen-third-row-gambit'));
  assert.ok(lines.every(l => l.beneficiary === 1));
});

test('shared central prefix names the family, not a specific opening', () => {
  const m = matchOpeningPrefix('3333');   // 5-4 / 5-1 / candlesticks all start here
  assert.equal(m.family, 'central-column opening');
  assert.ok(m.ids.length > 1);
  // next col agreed only if all consistent lines agree; here they diverge later but next is still '3'
});

test('unique deep prefix identifies one opening and its book move', () => {
  // 3332223 is the D3-D4 stem (D4 as disk 7); next book move continues the line
  const m = matchOpeningPrefix('3332223');
  assert.ok(m.ids.includes('allen-d3-d4-opening'));
});

test('mirror-reflected central prefix matches', () => {
  const m = matchOpeningPrefix('3333');
  const mirror = matchOpeningPrefix('3333');   // 3 is its own mirror; use a real off-centre line in impl
  assert.ok(m);
});

test('non-opening history does not match', () => {
  assert.equal(matchOpeningPrefix('0123456'), null);
});
```

- [ ] **Step 2: Run — expect FAIL** (`cd connect-four && node --test server/scripts/reason_engine/openingMatch.test.mjs`).
- [ ] **Step 3: Implement `openingMatch.mjs`.** Parse `worked_examples[].movestring` (and note the beneficiary/family) from the KB files at load; cache. Implement mirror normalization (`col → 6 - col`) and prefix matching per the interface. Keep it pure (no solver) — the "book move is best" check happens in Task B2 with the solver.
- [ ] **Step 4: Run — expect PASS.** Fix mirror/family logic until green.
- [ ] **Step 5: Commit** `git commit -m "feat(reason): KB opening-line prefix matcher"`.

### Task B2: `openingContext` evidence in `computeReason` (with the four guards)

**Files:**
- Modify: `connect-four/server/scripts/reason_engine/reasonEngine.mjs` (`computeReason` — add the field before returning the vector)
- Modify: `connect-four/server/centerDominance.js` (export nothing new; reuse `detectCenterDominance`)
- Test: `connect-four/server/scripts/reason_engine/openingContext.test.mjs`

**Interfaces:**
- Consumes: `matchOpeningPrefix` (B1), `detectCenterDominance` (`centerDominance.js`), the solver (`createSolverProcess`).
- Produces: on the `computeReason` output, an optional `openingContext`:
  - `{ namedOpening: { id: string|null, family: string|null, matchedPrefixLen, bookNextCol } }` when the four guards hold, **or**
  - `{ centrality: { bestCol, playedCol, betterHasMoreLines: true, text } }` when off‑book, opening, no tactical structure, **or**
  - absent otherwise.

**The four guards (all required for `namedOpening`):** (1) `matchOpeningPrefix(movestring)` non‑null; (2) the blundering player is the beneficiary (player 1 for these lines); (3) `bookNextCol` is solver‑verified as a best move at this node (score equals the max, and `> 0`) — reuse the engine's already‑computed `bestCol`/`scores`; if `bookNextCol !== bestCol` do **not** claim it best (fall through); (4) set `id` to a specific opening only when `matchOpeningPrefix` returns a single consistent id — else keep `id: null` with `family`.

- [ ] **Step 1: Write failing tests** (concrete, solver‑verified boards)

```javascript
// openingContext.test.mjs — uses computeReason end-to-end (solver-backed)
import { test } from 'node:test';
import assert from 'node:assert';
import { computeReason } from './reasonEngine.mjs';

// VERIFIED (2026-07-04, ./visualize_board.sh 3333): player 1 to move; col 3 = +1 (unique win),
// col 0 = -2 (loss) -> playing col 0 is a win_to_lose blunder, bestCol = 3. '3333' is a shared
// prefix of 5-4 / 5-1 / candlesticks (all central-column, all continue col 3), so
// family = 'central-column opening', id = null, bookNextCol = 3 = bestCol.
test('named-opening deviation fires for beneficiary on a book prefix', async () => {
  const v = await computeReason('3333', /*playedCol*/ 0);
  assert.ok(v.openingContext?.namedOpening, 'expected namedOpening');
  assert.equal(v.openingContext.namedOpening.family, 'central-column opening');
  assert.equal(v.openingContext.namedOpening.bookNextCol, v.bestCol);
});

// Off-book opening blunder -> centrality fallback, never both.
test('off-book opening blunder uses centrality, not namedOpening', async () => {
  const v = await computeReason(/*an off-book early board*/ '30', 6);
  if (v.openingContext) {
    assert.ok(!(v.openingContext.namedOpening && v.openingContext.centrality));
  }
});
```

_(The exact boards/playedCols must be chosen so the position is genuinely a blunder for player 1; verify each with `./visualize_board.sh <movestring>` and `optimal_line.mjs` before finalizing the test — do not ship a test whose board isn't a real blunder.)_

- [ ] **Step 2: Run — expect FAIL** (`node --test server/scripts/reason_engine/openingContext.test.mjs` from `connect-four/`).
- [ ] **Step 3: Implement** the `openingContext` computation in `computeReason`, wiring the four guards; reuse `detectCenterDominance` for the fallback. Do not weaken any existing search (I0).
- [ ] **Step 4: Run — expect PASS.**
- [ ] **Step 5: I12 case‑space validation** — add one deliberate counterexample test per branch: shared‑prefix (family, `id:null`); unique‑prefix (specific `id`); **losing side** (player‑2 history on a first‑player‑win line → no `namedOpening`); **book‑move‑not‑best** (a book prefix where the next book move isn't the unique best → no false "best" claim); mirror‑reflected line; off‑book centrality. Each through `computeReason`. Run — expect PASS.
- [ ] **Step 6: Commit** `git commit -m "feat(reason): opening-deviation evidence with case-space guards"`.

### Task B3: Keep the narrator vector honest (pruning)

**Files:**
- Modify: `connect-four/server/scripts/reason_engine/lib/reasonNarratorVector.mjs` (`toNarratorVector`/`pruneVector`)
- Test: extend `openingContext.test.mjs`

- [ ] **Step 1: Failing test** — `toNarratorVector` keeps a present `openingContext` (scalars/text) and drops it when absent; it never leaks the raw `scores` array (D21).

```javascript
test('narrator vector keeps openingContext but not raw scores', async () => {
  const { toNarratorVector } = await import('./lib/reasonNarratorVector.mjs');
  const v = await computeReason('3333', 0);
  const nv = toNarratorVector(v);
  assert.ok(nv.openingContext);
  assert.equal(nv.scores, undefined);
});
```

- [ ] **Step 2: Run — expect FAIL.** **Step 3: Implement** the pass‑through in `pruneVector`. **Step 4: Run — expect PASS.** **Step 5: Commit** `git commit -m "feat(reason): narrator vector carries openingContext"`.

### Task B4: Un‑skip openings in the eval harness + register predicates

**Files:**
- Modify: `connect-four/server/scripts/select_boards.mjs` (fixture `CFG.discMin`; coverage `REASON_UNIVERSE`; `--help`/header)
- Modify: `connect-four/server/scripts/renderUniverse.mjs` (only if a render frame is added in B5)

**Interfaces:**
- Consumes: the engine's new opening predicate emissions (Task B2 must emit predicate names — e.g. `reason_opening_named_line`, `reason_opening_centrality` — into whatever the coverage sampler reads from a reason vector; see `select_boards.mjs:331` where predicates are derived from a reason vector).

- [ ] **Step 1:** Add an **opening harvest band** so boards with discs `1..openingMaxDiscs (15)` are sampled (the fixture currently sets `discMin: 12 // skip opening theory`). Additive — keep the existing mid‑game band. Prefer a separate opening pass over lowering `discMin` globally, so mid‑game targets are unaffected.
- [ ] **Step 2:** Add `reason_opening_named_line` and `reason_opening_centrality` to `REASON_UNIVERSE`; mark them `PROVISIONAL` (named‑opening matches are rare — a REQUIRED unreachable predicate causes a full‑budget solver burn, the coverage‑sampler rare‑fill trap). Ensure the engine emits exactly these names (the "unlisted predicate = bug" self‑check at the end of the coverage strategy must pass).
- [ ] **Step 3:** Update the `--help`/header to document the opening band.
- [ ] **Step 4: Run a bounded coverage harvest** `cd connect-four && node server/scripts/select_boards.mjs --strategy coverage --target 2 --max-games 300` — expect it to terminate, emit opening boards, and NOT flag an unlisted predicate. (Bounded `--max-games` so it can't stall.)
- [ ] **Step 5: Commit** `git commit -m "feat(reason-eval): harvest opening boards + register opening predicates"`.

### Task B5: Ground the opening reason in the production prompt

**Files:**
- Modify: `connect-four/server/explainContext.js` (feed `openingContext` into `prompt_data`; extend the existing gated section at ~L944–961)
- Modify: `connect-four/server/llmCoachHelpers.js` (the `centerDominanceSection` instruction, ~L692/L835)
- Modify (only if needed): `connect-four/server/scripts/reason_engine/causalLinks.mjs` (a frame for the opening‑deviation case + `render_decision` emission)

- [ ] **Step 1:** In `explainContext.js`, when `openingContext.namedOpening` is present, build the section text: *"You were following the &lt;opening/family&gt;, a known winning plan. The book move is column &lt;bookNextCol+1&gt;, which keeps the win. You played column &lt;playedCol+1&gt;, which &lt;loses/draws per the two halves&gt;."* Reuse the shared `centerDominance` computation for the off‑book centrality path (single source — surface A and B). Put `openingContext` into `prompt_data`.
- [ ] **Step 2:** In `llmCoachHelpers.js`, extend the section instruction: state the opening name **only** when `namedOpening.id` is non‑null (family‑only → "a central‑column opening"); reaffirm anti‑fabrication (do not invent a tactic; the *why it loses* comes from the two halves); respect `project_kb_major_minor_threat_not_always_include` (no KB term without its pattern firing) and `feedback_llm_perspective_bug` (name the player).
- [ ] **Step 3:** If condition‑D render grounding needs a frame, add a minimal `causalLinks.mjs` entry carrying the book‑move provenance + `covers`/`guardrail`, and ensure a `render_decision` is emitted for opening cases; otherwise reuse the existing "why the better move is stronger" frame (prefer reuse, I9).
- [ ] **Step 4: Manual grounding check** — pick one opening blunder board, run the production explain path (or `compute.mjs --llm --condition D` on a small set) and confirm the explanation states the deviation, names the opening only when unique, and fabricates nothing (verify each cell/claim with `visualize_board.sh`).
- [ ] **Step 5: Commit** `git commit -m "feat(reason): ground opening-deviation reason in the deep-reveal prompt"`.

### Task B6: Glossary + grader awareness + decisions log

**Files:**
- Modify: `docs/architecture/feature-vector-glossary.md` (new "opening context" section)
- Modify: `.claude/skills/grade-fv-sufficiency/SKILL.md` (opening‑case grading guidance + field list)
- Modify: `docs/architecture/reason-DECISIONS.md` (new D‑entry) and `docs/architecture/blunder-reason-evidence.md` (opening evidence subsection + validated boards)

- [ ] **Step 1:** Glossary: define `openingContext.namedOpening` (a KB‑line lookup + book‑move provenance — **not** a causal "leaving cost you" claim; verify by matching the movestring and checking `bookNextCol` is best) and `openingContext.centrality` (geometric — verify by counting winning lines through `bestCol` vs `playedCol`). State the absence contract (mutually exclusive; pruned when absent).
- [ ] **Step 2:** `grade-fv-sufficiency` SKILL.md: add opening fields to the enumerated vector fields; instruct the grader that a centrality claim is verified by counting lines (not by tracing a `finalMovestring`), and a `namedOpening` label is verified by the movestring match and must **not** be graded as a fabricated mechanism. Add the failure‑attribution wording for opening fields.
- [ ] **Step 3:** `reason-DECISIONS.md`: append a D‑entry — the two‑mode opening reason, the four guards, and the boundary (non‑matching attribution + transposition out of v1). `blunder-reason-evidence.md`: an "opening evidence" subsection listing the validated boards (`3333`, `3332223`, `3332223362`, `3265533353553111`, off‑book centrality board).
- [ ] **Step 4: Grader dry‑run** — run `grade-fv-sufficiency` over a tiny opening answers set (from Task B5's `compute.mjs --llm`) and confirm opening cases grade without a false `vector_error` for a correct centrality/name claim.
- [ ] **Step 5: Commit** `git commit -m "docs(reason): glossary + grader + decisions for opening reason"`.

---

## Self-review notes (coverage map)

- Spec A1 (lessons) → Tasks A1–A5. Spec A2 (drills) → **cut** (D6). 
- Spec B1 (opening evidence: named‑deviation + centrality) → Tasks B1, B2, B3. 
- Spec B2 (eval coverage) → Task B4. 
- Spec B3 (glossary + grader) → Task B6. 
- Spec B4 (prompt grounding) → Task B5. 
- Global constraints (invariants, KB source, verify‑movestrings) → Global Constraints + per‑task steps.

**Deferred to implementation judgement (flagged in the spec §7):** exact `openingContext` field nesting; whether a new `causalLinks.mjs` frame is needed vs. reuse (Task B5 Step 3); the precise opening‑band disc bounds (Task B4 Step 1). Each task's tests pin the observable contract; the internal shape is the implementer's within that contract.
