# Lesson Content Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring all 13 lessons in `connect-four/lessons/` up to the quality bar of lessons 07/08/13 — real solver-verified boards on every slide, factually correct text (per `docs/knowledge-base/`), coherent green/gray + 1-based coordinate language, working socratics, and honest challenges — per the findings in `docs/lesson-content-critique-2026-07-22.md` (referenced below as **CRIT**, finding IDs X1–X10 and L01–L13).

**Architecture:** Two new dev scripts do the heavy lifting: `find_lesson_boards.mjs` (disposable curation tool: mistake-weighted self-play → structural spec filter → solver gate → candidate list with render commands) and `verify_lesson_content.mjs` (loads every lesson JSON and asserts the invariants whose violations produced CRIT X1–X8; solver-gated checks included). Lesson JSONs are then fixed lesson-by-lesson in priority order (placeholder rebuilds first, then text/coherence passes), with boards sourced KB-first → finder-second → hand-authored-last. English is frozen before the Spanish pass (`translate-lessons.mjs`) and audio regeneration. File renumbering (lesson order) happens last because it renames files other tasks edit.

**Tech Stack:** Node.js ESM (`connect-four/server` is `"type": "module"`), existing `c4solver-wrapper.js` + `gameSampling.js` + `classifier.js` machinery, `visualize_board.sh`, `node:test` for the static verifier, admin lesson editor (`/admin/lessons`) for overlay placement and preview.

---

## Decision record: how boards get authored

Context: the `<board instructions>` blocks (CRIT X1) were LLM-generated authoring instructions for boards that were never built. The user proposed either (a) hand-authoring boards or (b) disposable self-play search scripts. **This plan chooses a script-first hybrid, in this order:**

1. **KB worked examples first (no search needed).** Several needed boards already exist, solver-verified, in `docs/knowledge-base/`: claimeven `3233253335` and extended-claimeven `3233333556` (`allis-claimeven.md` worked_examples, `solver_verified: true`), z-threat `0004111444466662552525506` (`community-z-threat.md`, verified 2026-05-17), figure-7 `43222430403` + far-arm false positive `30321143442` + borderline `22233535444` (`community-figure-7.md`), mirror-J `43344032` (`allen-j-configuration.md`, `solver_verified: true`; note the canonical `3334434` is `solver_verified: PENDING` and must be verified before use).
2. **Disposable finder script second** (Task 1) for every board with structural requirements no KB example meets (specific gap counts, distractor columns, clean socratic positions, replacement challenges). Self-play via `playGame` already exists and is the repo-sanctioned source of movestrings (`CLAUDE.md` §"When you need a concrete movestring": *"You can always create a script that uses the playGame function from gameSampling.js"*; the same section forbids hand-constructed movestrings beyond smoke tests).
3. **Human authoring last, and only as selector/finisher.** The human picks among N solver-verified finder candidates (each printed with its `visualize_board.sh` render) and places overlays in the admin lesson editor (`/admin/lessons`, hot-reloads on save — `docs/architecture/lesson-editor.md`). The editor re-derives `boardSpec` from the movestring on save (`src/lib/lessonPayload.js:23`: `boardSpec: convertBoard(slide.movestring),  // still derived — do not preserve a stale one`), so hand error is confined to overlays — which Task 2's verifier checks.

Rationale: every defective board in CRIT (lost socratic L03, win-throwing overlay L02 s4, losing challenge L11 ch1) is an **unverified** board. Hand authoring doesn't fix that failure mode — it reproduces it with a different author. The finder makes solver verification a byproduct of board creation, and preserves human pedagogical taste at the step where it's cheap (choosing) instead of the step where it's error-prone (constructing).

---

## Global Constraints

- **Never hand-edit `boardSpec`.** It is derived from `movestring` (`src/lib/movestring.js#boardToSpec`; the admin editor enforces this). Every board change = new movestring, `boardSpec` regenerated. For slides that today have `boardSpec` but no `movestring` (L06, L09–L12), the fix always supplies a `movestring`.
- **Every new/changed board is solver-verified before commit:** run `./visualize_board.sh <ms>` from repo root and paste the `scr` row + `Major threats` line into the PR/plan-execution notes. This is the CRIT verification protocol; no board lands without it.
- **Solver on Linux dev containers:** the committed `connect-four/server/c4solver` is a macOS arm64 binary. Build locally (`cd connect-four/solver-src && make c4solver` — the Makefile `cp`s it into `server/`), and **`git checkout -- connect-four/server/c4solver connect-four/solver-src/.depend connect-four/solver-src/c4solver` before committing** so the binary is never committed. (Harvested from the CRIT session, where exactly this was done.)
- **User-facing coordinate language is 1-based plain words** ("the bottom row", "the second row", "the fourth column", "the centre column"). The tokens "0-indexed", "row 0", "col 3" must not appear in any `infoProse`, `coachMessages[].text`, `legendItems[].label`, or `goalPrompt` (CRIT X5). Internal fields (`overlays`, `correctCol`, `_boardInstructions`) stay 0-indexed — they are code, not copy.
- **Parity vocabulary in copy follows Allen (1-based):** Green (first player) owns **odd rows 1/3/5**; Gray owns **even rows 2/4/6**. This makes L04's displayed title ("Odd Rows Belong to Green", `src/i18n/en.json:922-924`) true and matches every KB verbatim quote.
- **Voice contract:** slides are **neutral commentary** — always "Green …" / "Gray …", never "you/your" for a side (CRIT X4; the socratic learner's color follows movestring parity — `src/screens/SocraticScreen.jsx:90`: `const color = lesson.socratic.movestring.length % 2 === 0 ? 'red' : 'yellow';` — so second-person slide copy can't be kept consistent). Socratic/challenge copy MAY use "you" because there the learner demonstrably plays one side; the socratic movestring's **parity must put the learner on the side the copy addresses**.
- **Overlay contract (CRIT X8):** `tg` = a cell that is Green's (threat or destination); `td` = a cell that is Gray's; `claim` = neutral "look at these cells" (gaps, counts); `win` = ONLY the discs of an existing line/pattern (ring). Never mark a Gray-owned cell `tg` or vice versa (`tg` renders as a green dot — `src/components/Board.jsx:365-366`). Legends may only declare overlay types actually present on that slide.
- **`socratic.goalPrompt` is never rendered** (`SocraticScreen.jsx` renders only `socratic.messages[phase]`; goalPrompt appears only in the admin editor). The learner-facing question therefore always goes in `messages.ask[0].text`, per the lesson 07/08/13 pattern. Keep `goalPrompt` populated as an editor-facing summary, but it must agree with `ask`.
- **`_boardInstructions` are authoring notes** (never rendered, never translated — `scripts/translate-lessons.mjs` header). When a board changes, rewrite the instructions to describe the *actual* board (or delete them); stale instructions caused the original color inversions (CRIT X3 root cause).
- **English freezes before Spanish.** No `_es` drafting for a lesson until its English content task is merged (CRIT Part 5 process note: errors translated must be fixed twice).
- **Don't touch:** lesson `id` fields (stored in `lesson_progress`), the `title` i18n keys (owned by `en/es.json` — `docs/architecture/lesson-editor.md` "Do NOT localize title"), the free/paid `free` flags (product decision, explicitly out of scope — CRIT Part 4.4 is flagged to the owner separately).
- If a dev server is needed (admin editor preview): `eval "$(./worktree-ports.sh)"` first, per the standing rule in `CLAUDE.md`.
- Tests: `npm run test:fast` from `connect-four/` (never bare `npm test` — `CLAUDE.md` §"Running tests").
- **Board-dependent copy is authored at execution time, never in this plan.** Slides whose boards come out of the finder cannot have final coach text here (the text must describe the actual cells of the board the human selects). For those steps this plan gives: the factual claims the text must make (with KB citations), the overlay contract, and acceptance criteria checked by `verify_lesson_content.mjs`. Copy that does NOT depend on an unfound board (pure corrections to existing slides) is given verbatim as exact old→new edits. This is the plan's one sanctioned deviation from "complete content in every step" — flagged here so it is a visible contract, not a hidden placeholder.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `connect-four/server/scripts/find_lesson_boards.mjs` | create | Disposable board-curation tool: self-play → spec filter → solver gate → candidates |
| `connect-four/server/scripts/verify_lesson_content.mjs` | create | Solver-gated lesson invariant checker (run manually per content change) |
| `connect-four/tests/unit/lessonContent.test.js` | create | Static (no-solver) lesson invariants, runs in `test:fast` |
| `connect-four/lessons/lesson-01…13-*.json` | modify | The content fixes themselves |
| `connect-four/src/lib/kbTermLesson.js` | modify | Wire `lessonId` for immediate/double/forced-block terms |
| `docs/lesson-content-critique-2026-07-22.md` | modify (final task) | Mark remediated findings |

Existing machinery used, verified this session (do not modify): `server/gameSampling.js:86` `export async function* playGame(solver, rng = Math.random, { maxMistakeProb = 0.5 } = {})` yielding `{ ms, scores, player, movePlayed, plyIndex }`; `server/classifier.js:497` `export class Board` (with `.colHeights`, `.reachableThreats(player)` → `Map<col, row[]>` per line 911 comment), `:1629` `export async function classifyPattern(ms, perspective, solver)` → `Map<tag, {cells}>`; `server/c4solver-wrapper.js:10` `createSolverProcess()` → `{ query(ms), destroy() }`; `server/lessonAudio.js:133` `generateLessonAudio(lesson, { lang })`; `connect-four/scripts/translate-lessons.mjs` (6 field paths, per-lesson `--lesson <id>`, `--dry-run`).

---

## Task 1: `find_lesson_boards.mjs` — disposable board finder

**Files:** Create `connect-four/server/scripts/find_lesson_boards.mjs`

**Interfaces:** CLI, run from `connect-four/`: `node server/scripts/find_lesson_boards.mjs <specName> [--count 5] [--seed 42] [--games 400]`. Prints one block per accepted candidate: movestring, ply, matched detail, solver `scores`, and a ready-to-run `./visualize_board.sh <ms>` line. Exits nonzero if fewer than `--count` found (so a too-tight spec fails loudly).

- [ ] **Step 1: Write the script.** Framework + specs. The self-play/score-filter idiom is harvested from `server/scripts/t014_score_tie_check.mjs:9-33` (same `mulberry32`, same `playGame` loop, same `> -1000` legal-column guard); the detector harness from `classifier.js:1629`.

```js
// find_lesson_boards.mjs — DISPOSABLE curation tool (not production code, not in test suite).
// Finds lesson boards by mistake-weighted self-play + structural spec + solver gate.
// See docs/superpowers/plans/2026-07-23-lesson-content-remediation.md (Task 1) for specs' intents.
//
// Usage (from connect-four/):  node server/scripts/find_lesson_boards.mjs <spec> [--count 5] [--seed 42] [--games 400]
import { createSolverProcess } from '../c4solver-wrapper.js';
import { playGame } from '../gameSampling.js';
import { Board, classifyPattern } from '../classifier.js';

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const legalCols = (scores) => [...Array(7).keys()].filter(c => scores[c] > -1000);
const maxScore  = (scores) => Math.max(...legalCols(scores).map(c => scores[c]));

// A "spec" answers: does this position teach the thing? Return null to reject, or
// a detail object (merged into the candidate printout) to accept.
// Every spec receives (pos = {ms, scores, player}, board = new Board(pos.ms), solver).
const SPECS = {

  // L06 s1/s2: latent Gray z-threat, gap EXACTLY 3, not gravity-top, position not
  // already decided against the side to move by more than a normal margin.
  z_threat_gap3: async (pos, board) => {
    if (pos.ms.length < 8 || pos.ms.length > 20) return null;
    for (const [col, rows] of board.reachableThreats(2)) {
      for (const r of rows) {
        const gap = r - board.colHeights[col] + 1;           // inclusive count, KB formula
        if (gap === 3) return { col, row: r, gap };
      }
    }
    return null;
  },

  // L06 s3: same shape but gap EXACTLY 2 (the non-z counterexample).
  z_threat_gap2: async (pos, board) => {
    if (pos.ms.length < 8 || pos.ms.length > 20) return null;
    for (const [col, rows] of board.reachableThreats(2)) {
      for (const r of rows) {
        const gap = r - board.colHeights[col] + 1;
        if (gap === 2) return { col, row: r, gap };
      }
    }
    return null;
  },

  // L06 socratic: Gray z-threat (odd gap, latent) in one column AND a Gray threat at the
  // SAME ROW in another column with an even gap — the "same row, opposite ownership" contrast.
  z_threat_socratic: async (pos, board) => {
    if (pos.ms.length % 2 !== 1) return null;                // Gray to move -> learner plays Gray
    const gaps = [];
    for (const [col, rows] of board.reachableThreats(2)) {
      for (const r of rows) {
        const gap = r - board.colHeights[col] + 1;
        if (gap >= 2) gaps.push({ col, row: r, gap });
      }
    }
    const z  = gaps.find(t => t.gap % 2 === 1);
    const nz = gaps.find(t => t.gap % 2 === 0 && z && t.row === z.row && t.col !== z.col);
    return z && nz ? { zthreat: z, distractor: nz } : null;
  },

  // L09 slides/socratic: Allen-T2 adjacent undercut — Gray threat at row R, Green threat
  // at R+1 directly above, SAME column, both latent. Learner side = Gray.
  undercut_t2_adjacent: async (pos, board) => {
    if (pos.ms.length < 10 || pos.ms.length > 22) return null;
    const gray  = board.reachableThreats(2);
    const green = board.reachableThreats(1);
    for (const [col, rows] of gray) {
      for (const r of rows) {
        if ((green.get(col) ?? []).includes(r + 1) && r > board.colHeights[col]) {
          return { col, lower: r, upper: r + 1 };
        }
      }
    }
    return null;
  },

  // L09 s3: same-parity pair (T4 — neither kills the other): opposite owners, same column,
  // rows two apart.
  same_parity_pair: async (pos, board) => {
    if (pos.ms.length < 10 || pos.ms.length > 22) return null;
    const gray  = board.reachableThreats(2);
    const green = board.reachableThreats(1);
    for (const [col, rows] of gray) {
      for (const r of rows) {
        if ((green.get(col) ?? []).includes(r + 2)) return { col, lower: r, upper: r + 2 };
      }
    }
    return null;
  },

  // L03 socratic replacement: side to move can create a double threat, the fork move WINS
  // (max solver score), and the opponent has NO gravity-top threat anywhere (the exact
  // failure of the current board, CRIT X2.2). Learner side = Green (even ply).
  fork_socratic_clean: async (pos, board, solver) => {
    if (pos.ms.length % 2 !== 0) return null;
    if (pos.ms.length < 8 || pos.ms.length > 16) return null;
    const opp = board.reachableThreats(3 - pos.player);
    for (const [col, rows] of opp) {
      if (rows.includes(board.colHeights[col])) return null; // opponent gravity-top threat -> reject
    }
    const best = maxScore(pos.scores);
    if (best <= 0) return null;                              // fork must win, not save
    for (const c of legalCols(pos.scores)) {
      if (pos.scores[c] !== best) continue;
      const tags = await classifyPattern(pos.ms + String(c), pos.player, solver);
      // after our move it is opponent's turn; a double threat FOR US shows as the
      // pattern existing from our perspective on the resulting board
      if (tags.has('double_threat')) return { forkCol: c, score: pos.scores[c] };
    }
    return null;
  },

  // Generic tagged-position finder for challenge re-curation. Usage:
  //   node ... tag:figure_7 / tag:claimeven / tag:overcut / tag:undercut ...
  // Accepts positions where the tag fires for the side to move AND the side to move
  // is not lost (best score >= 0). Extra per-lesson vetting happens at selection time.
} ;

async function main() {
  const [specArg, ...rest] = process.argv.slice(2);
  const opt = (name, dflt) => {
    const i = rest.indexOf(`--${name}`);
    return i === -1 ? dflt : Number(rest[i + 1]);
  };
  const count = opt('count', 5), seed = opt('seed', 42), games = opt('games', 400);

  const solver = createSolverProcess();
  const rng = mulberry32(seed);
  let spec = SPECS[specArg];
  if (!spec && specArg?.startsWith('tag:')) {
    const tag = specArg.slice(4);
    spec = async (pos, _board, solver_) => {
      if (pos.ms.length < 8 || pos.ms.length > 24) return null;
      if (maxScore(pos.scores) < 0) return null;             // side to move must not be lost
      const tags = await classifyPattern(pos.ms, pos.player, solver_);
      return tags.has(tag) ? { tag, cells: tags.get(tag).cells } : null;
    };
  }
  if (!spec) {
    console.error(`Unknown spec "${specArg}". Known: ${Object.keys(SPECS).join(', ')}, or tag:<classifier-tag>`);
    process.exit(2);
  }

  const seen = new Set();
  let found = 0;
  for (let g = 0; g < games && found < count; g++) {
    for await (const pos of playGame(solver, rng, { maxMistakeProb: 0.4 })) {
      if (seen.has(pos.ms)) continue;
      const detail = await spec(pos, new Board(pos.ms), solver);
      if (!detail) continue;
      seen.add(pos.ms);
      found++;
      console.log(`\n=== candidate ${found}  ms=${pos.ms}  ply=${pos.ms.length}  toMove=${pos.player === 1 ? 'Green' : 'Gray'}`);
      console.log(`    detail=${JSON.stringify(detail)}`);
      console.log(`    scores=${JSON.stringify(pos.scores)}`);
      console.log(`    render: ./visualize_board.sh ${pos.ms}`);
      if (found >= count) break;
    }
  }
  solver.destroy();
  if (found < count) { console.error(`Only found ${found}/${count}. Loosen spec or raise --games.`); process.exit(1); }
}
main();
```

- [ ] **Step 2: Smoke-test each spec** (from `connect-four/`, solver built per Global Constraints): `node server/scripts/find_lesson_boards.mjs z_threat_gap3 --count 2`, then `tag:figure_7 --count 2`. Expected: candidates print with scores; if `reachableThreats` turns out to be gravity-top-only (its exact latency semantics are the one unverified assumption in this task — the CRIT session confirmed it returns above-gravity rows for undercut/z-threat detection at `classifier.js:882` `const count = threatRow - board.colHeights[col] + 1`, but confirm empirically), adjust specs to use `getMajorThreatCells(board)` (`classifier.js:145`) instead.
- [ ] **Step 3: Commit** with a header comment marking it disposable curation tooling.

---

## Task 2: lesson invariant checkers (static test + solver script)

**Files:**
- Create: `connect-four/tests/unit/lessonContent.test.js`
- Create: `connect-four/server/scripts/verify_lesson_content.mjs`

**Interfaces:**
- Consumes: `parseMovestring`/`boardToSpec` from `src/lib/movestring.js` (import from `tests/unit/` is an established pattern — `tests/unit/adminLessonPayload.test.js:3` imports `src/lib/lessonPayload.js`); `Board` + `createSolverProcess` (see Task 1's imports) for the solver script.
- Produces: (a) a `REMEDIATED` set inside the test file — **every content task (3–12) finishes by adding its lesson `id` to this set**, which is what turns the strict invariants on for that lesson; (b) the CLI contract `node server/scripts/verify_lesson_content.mjs [lessonId…]` (no args = all lessons) printing a per-item PASS/FAIL table and exiting nonzero on any FAIL — later tasks cite this as their gate.
- Conventions: `node:test` + `node:assert/strict` only (`docs/architecture/testing-conventions.md` "MUST: Use Node.js built-in node:test"). Runs under `test:fast` (`tests/unit/` is included).

Design note (why gating, not pure TDD-red): the strict invariants FAIL for the 6 unremediated lessons today by design — but this file lands in `test:fast`, which must stay green between tasks. So global invariants that already hold (challenge parity, on-board overlays) run unconditionally, and the strict per-lesson invariants run only for lessons in `REMEDIATED`. The red-for-the-right-reason check still happens (Step 3) by running the strict checks in report mode against everything.

- [ ] **Step 1: write the static test**

```js
// tests/unit/lessonContent.test.js — invariants from docs/lesson-content-critique-2026-07-22.md
// (CRIT X1 placeholders, X5 indexing language, X8 legend/overlay drift, boardSpec derivation).
// Strict checks apply only to lessons in REMEDIATED; each remediation task adds its lesson id.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseMovestring, boardToSpec } from '../../src/lib/movestring.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LESSONS_DIR = path.join(__dirname, '../../lessons');
const lessons = fs.readdirSync(LESSONS_DIR)
  .filter(f => /^lesson-\d+-.*\.json$/.test(f))
  .map(f => ({ file: f, lesson: JSON.parse(fs.readFileSync(path.join(LESSONS_DIR, f), 'utf8')) }));

// Lessons whose content has been through the remediation plan. Tasks 3-12 each add one id.
// Initial membership = lessons that already pass the strict checks (verify empirically in
// Step 3; expected: immediate-threat, block-before-build, the-fork, opening-centre,
// opening-imitate — opening-sharp is excluded until Task 11 removes its "(0-indexed)" copy).
const REMEDIATED = new Set([
  'immediate-threat',
  'block-before-build',
  'the-fork',
  'opening-centre',
  'opening-imitate',
]);

// Task 12 empties this allowlist when it de-templates the socratic ask messages.
const LEGACY_ASK_ALLOWLIST = new Set([
  'immediate-threat', 'block-before-build', 'the-fork', 'claimeven', 'z-threats',
  'undercut', 'overcut', 'figure-7', 'j-shape',
]);
const LEGACY_ASK = "I'm going to make a mistake here. See if you can punish it.";

function* userVisibleStrings(lesson) {
  for (const [i, s] of (lesson.slides ?? []).entries()) {
    for (const k of ['infoProse', 'infoProse_es']) if (typeof s[k] === 'string') yield [`slides[${i}].${k}`, s[k]];
    for (const [j, m] of (s.coachMessages ?? []).entries())
      for (const k of ['text', 'text_es']) if (typeof m[k] === 'string') yield [`slides[${i}].coachMessages[${j}].${k}`, m[k]];
    for (const [j, li] of (s.legendItems ?? []).entries())
      for (const k of ['label', 'label_es']) if (typeof li[k] === 'string') yield [`slides[${i}].legendItems[${j}].${k}`, li[k]];
  }
  if (lesson.socratic) {
    for (const k of ['goalPrompt', 'goalPrompt_es'])
      if (typeof lesson.socratic[k] === 'string') yield [`socratic.${k}`, lesson.socratic[k]];
    for (const phase of Object.keys(lesson.socratic.messages ?? {}))
      for (const [j, m] of (lesson.socratic.messages[phase] ?? []).entries())
        for (const k of ['text', 'text_es']) if (typeof m[k] === 'string') yield [`socratic.messages.${phase}[${j}].${k}`, m[k]];
  }
  for (const [i, ch] of (lesson.confirmationChallenges ?? []).entries())
    for (const k of ['goalPrompt', 'goalPrompt_es']) if (typeof ch[k] === 'string') yield [`confirmationChallenges[${i}].${k}`, ch[k]];
}

// ---- Unconditional invariants (hold for every lesson today; must never regress) ----

test('lessonContent: challenge side-to-move matches userPlayer', () => {
  for (const { file, lesson } of lessons)
    for (const [i, ch] of (lesson.confirmationChallenges ?? []).entries()) {
      const expected = ch.moveString.length % 2 === 0 ? 1 : 2;
      assert.equal(ch.userPlayer, expected,
        `${file} confirmationChallenges[${i}]: userPlayer=${ch.userPlayer} but player ${expected} is to move`);
    }
});

test('lessonContent: every overlay cell is on the board', () => {
  for (const { file, lesson } of lessons) {
    const nodes = (lesson.slides ?? []).map((s, i) => [`slides[${i}]`, s]);
    if (lesson.socratic) nodes.push(['socratic', lesson.socratic]);
    for (const [where, node] of nodes)
      for (const o of node.overlays ?? [])
        assert.ok(o.c >= 0 && o.c <= 6 && o.r >= 0 && o.r <= 5, `${file} ${where}: overlay off-board (${o.c},${o.r})`);
  }
});

// ---- Strict invariants (REMEDIATED lessons only) ----

test('lessonContent[strict]: no placeholders or 0-indexed language in user-visible text', () => {
  for (const { file, lesson } of lessons) {
    if (!REMEDIATED.has(lesson.id)) continue;
    for (const [where, text] of userVisibleStrings(lesson)) {
      assert.ok(!text.includes('<board instructions'), `${file} ${where}: contains "<board instructions"`);
      assert.ok(!/0-index/i.test(text), `${file} ${where}: contains 0-indexed language`);
    }
  }
});

test('lessonContent[strict]: boardSpec is derived from movestring everywhere', () => {
  for (const { file, lesson } of lessons) {
    if (!REMEDIATED.has(lesson.id)) continue;
    const nodes = (lesson.slides ?? []).map((s, i) => [`slides[${i}]`, s]);
    if (lesson.socratic) nodes.push(['socratic', lesson.socratic]);
    for (const [where, node] of nodes) {
      assert.equal(typeof node.movestring, 'string', `${file} ${where}: missing movestring`);
      assert.deepEqual(node.boardSpec, boardToSpec(parseMovestring(node.movestring)),
        `${file} ${where}: boardSpec not derived from movestring`);
    }
  }
});

test('lessonContent[strict]: legends match overlays; tg/td/claim sit on empty cells', () => {
  for (const { file, lesson } of lessons) {
    if (!REMEDIATED.has(lesson.id)) continue;
    for (const [i, s] of (lesson.slides ?? []).entries()) {
      const overlayTypes = new Set((s.overlays ?? []).map(o => o.type));
      for (const li of s.legendItems ?? [])
        assert.ok(overlayTypes.has(li.type), `${file} slides[${i}]: legend '${li.type}' has no matching overlay`);
      const board = parseMovestring(s.movestring ?? '');
      for (const o of s.overlays ?? [])
        if (o.type !== 'win')  // 'win' rings discs, so occupied cells are legal for it
          assert.equal(board[o.r][o.c], 'empty', `${file} slides[${i}]: '${o.type}' overlay on occupied (${o.c},${o.r})`);
    }
  }
});

test('lessonContent[strict]: socratic ask is lesson-specific (legacy template retired)', () => {
  for (const { file, lesson } of lessons) {
    if (!lesson.socratic || LEGACY_ASK_ALLOWLIST.has(lesson.id)) continue;
    assert.notEqual(lesson.socratic.messages?.ask?.[0]?.text, LEGACY_ASK, `${file}: still uses the legacy ask template`);
  }
});
```

- [ ] **Step 2: run it and pin the initial `REMEDIATED` membership**

Run: `cd connect-four && node --test tests/unit/lessonContent.test.js`
Expected: all tests PASS. If a lesson listed in the initial `REMEDIATED` set fails a strict check, that is a **discovered defect** — record it and remove the id only with a note referencing the failure (do not silently shrink the set). If an unlisted lesson passes everything, add it.

- [ ] **Step 3: red-for-the-right-reason report.** Temporarily run the strict checks against ALL lessons (`for` loop without the `REMEDIATED` guard, via a scratch copy or `REMEDIATED = new Set(lessons.map(l => l.lesson.id))` locally — do not commit) and confirm the failure list reproduces CRIT: `<board instructions` in 05/06/09/10/11/12, missing movestrings in the same six, legend/overlay mismatch in 06, `0-index` copy in 04/05/13. Paste the failure list into the task notes.

- [ ] **Step 4: write the solver script** `verify_lesson_content.mjs`:

```js
// verify_lesson_content.mjs — solver-gated lesson invariants (manual gate, not in test suite).
// Usage (from connect-four/):  node server/scripts/verify_lesson_content.mjs [lessonId ...]
// Checks (docs/superpowers/plans/2026-07-23-lesson-content-remediation.md Task 2):
//   socratic:   correctCol is solver-max AND position not lost (opt-out: "_lostPositionIntended")
//   challenges: side to move is not lost (same opt-out)
//   tg/td overlays: cell is a real completing cell for that color (opt-out: "_overlayIntent": "annotation")
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSolverProcess } from '../c4solver-wrapper.js';
import { Board } from '../classifier.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LESSONS_DIR = path.join(__dirname, '../../lessons');
const filterIds = new Set(process.argv.slice(2));

const legal = (scores) => [...Array(7).keys()].filter(c => scores[c] > -1000);
const maxLegal = (scores) => Math.max(...legal(scores).map(c => scores[c]));

function overlayRows(node, where, board) {
  const rows = [];
  if (node._overlayIntent === 'annotation') return rows;
  for (const o of node.overlays ?? []) {
    if (o.type !== 'tg' && o.type !== 'td') continue;
    const player = o.type === 'tg' ? 1 : 2;
    const ok = (board.reachableThreats(player).get(o.c) ?? []).includes(o.r);
    rows.push({ where: `${where} overlay ${o.type}(${o.c},${o.r})`, ok, why: ok ? '' : `no P${player} threat at that cell` });
  }
  return rows;
}

async function checkLesson(lesson, solver) {
  const rows = [];
  for (const [i, s] of (lesson.slides ?? []).entries()) {
    if (typeof s.movestring !== 'string') { rows.push({ where: `slides[${i}]`, ok: false, why: 'no movestring' }); continue; }
    rows.push(...overlayRows(s, `slides[${i}]`, new Board(s.movestring)));
  }
  const soc = lesson.socratic;
  if (soc && typeof soc.movestring === 'string') {
    const scores = await solver.query(soc.movestring);
    const max = maxLegal(scores);
    const okBest = scores[soc.correctCol] === max;
    const okAlive = max >= 0 || soc._lostPositionIntended === true;
    rows.push({ where: 'socratic.correctCol', ok: okBest, why: okBest ? '' : `scores[${soc.correctCol}]=${scores[soc.correctCol]} max=${max}` });
    rows.push({ where: 'socratic.position', ok: okAlive, why: okAlive ? '' : `lost for learner (max=${max})` });
    rows.push(...overlayRows(soc, 'socratic', new Board(soc.movestring)));
  }
  for (const [i, ch] of (lesson.confirmationChallenges ?? []).entries()) {
    const scores = await solver.query(ch.moveString);
    const max = maxLegal(scores);
    const ok = max >= 0 || ch._lostPositionIntended === true;
    rows.push({ where: `challenge[${i}]`, ok, why: ok ? '' : `lost for user (max=${max})` });
  }
  return rows;
}

const files = fs.readdirSync(LESSONS_DIR).filter(f => /^lesson-\d+-.*\.json$/.test(f)).sort();
const solver = createSolverProcess();
let failed = 0;
for (const f of files) {
  const lesson = JSON.parse(fs.readFileSync(path.join(LESSONS_DIR, f), 'utf8'));
  if (filterIds.size && !filterIds.has(lesson.id)) continue;
  const rows = await checkLesson(lesson, solver);
  console.log(`\n== ${lesson.id} (${f})`);
  console.table(rows.map(r => ({ where: r.where, result: r.ok ? 'PASS' : 'FAIL', why: r.why })));
  failed += rows.filter(r => !r.ok).length;
}
solver.destroy();
console.log(failed ? `\n${failed} FAIL row(s)` : '\nall PASS');
process.exit(failed ? 1 : 0);
```

  Note: overlay checks are solver-free (pure `Board` geometry) but live here rather than in `test:fast` because `reachableThreats` semantics are being confirmed empirically in Task 1 Step 2 — if Task 1 switches specs to `getMajorThreatCells`, make the same switch in `overlayRows`.
- [ ] **Step 5: run the solver script against current content**

Run: `cd connect-four && node server/scripts/verify_lesson_content.mjs the-fork claimeven`
Expected: FAIL rows for the-fork socratic (`max=-14 < 0` — CRIT X2.2) and claimeven socratic (empty board / correctCol unverifiable). This is the executable reproduction of the critique.
- [ ] **Step 6: Commit** (`git add connect-four/tests/unit/lessonContent.test.js connect-four/server/scripts/verify_lesson_content.mjs && git commit -m "test: lesson content invariants + solver-gated verifier"`). `npm run test:fast` must be green.

---

## Per-task exit checklist (Tasks 3–12)

Every content task below implicitly ends with these steps (written once here — DRY):

- [ ] Add the lesson's `id` to `REMEDIATED` in `tests/unit/lessonContent.test.js` (Task 2's contract).
- [ ] Run: `cd connect-four && node --test tests/unit/lessonContent.test.js` — Expected: PASS.
- [ ] Run: `node server/scripts/verify_lesson_content.mjs <lesson-id>` — Expected: all rows PASS; paste the table into the task notes.
- [ ] Run every new/changed movestring through `./visualize_board.sh <ms>` (repo root); record the `scr` row + `Major threats` line.
- [ ] If an edited English field has an `_es` sibling, DELETE the now-stale `_es` sibling in the same commit (per-field fallback serves English until Task 14 re-drafts it — `lessonLoader.js#localizeLesson`; stale wrong Spanish is worse than fallback English).
- [ ] `npm run test:fast` green; commit with a `content(lesson-NN):` message.

**Interfaces (shared by Tasks 3–12):** Consumes Task 1's finder CLI (`node server/scripts/find_lesson_boards.mjs <spec|tag:…> --count N`) and Task 2's checkers/`REMEDIATED` contract. Produces: the remediated lesson JSON — no downstream code consumes lesson internals, so there are no cross-task type contracts beyond the lesson schema enforced by `server/lessonLoader.js#validateLesson`.

---

## Task 3: L05 Claimeven — rebuild boards (placeholder lesson, free tier)

**Files:** Modify `connect-four/lessons/lesson-05-claimeven.json`

The prose is close to `allis-claimeven` already (CRIT L05); this task gives it boards. KB boards first:

- [ ] **Step 1 — s1 (ownership diagram):** keep the empty board but make it a real diagram: `movestring: ""`, overlays marking column 3 (0-ind) rows 0/2/4 `tg` and rows 1/3/5 `td`, with `"_overlayIntent": "annotation"`, legend `tg` = "Green's natural rows (1st, 3rd, 5th)" / `td` = "Gray's natural rows (2nd, 4th, 6th)". Rewrite s1 text to 1-based (Global Constraints) and fix the recap to agree with the rewritten L04 (Task 10): Green owns odd rows 1/3/5.
- [ ] **Step 2 — s2/s3 (the pairing response / board-wide collapse):** use the KB worked example `3233253335` (Allis-verified: *"All six non-full columns have even empty counts … Yellow wins purely by responding directly above every Red move"*, `allis-claimeven.md` worked_examples[0]). Render it (`./visualize_board.sh 3233253335`), choose overlay cells for s2 (one Green move + the Gray reply above + one Green window through the claimed square, ringed `win`) and s3 (all Gray claimed squares `td`). For s2, if a single-pair earlier ply reads better, take a prefix of the same movestring and re-verify.
- [ ] **Step 3 — s4 (when NOT to respond above):** finder: `node server/scripts/find_lesson_boards.mjs tag:claimeven --count 5`, pick a candidate where Green's last move landed on an even row (1-based) so the respond-above reflex would gift Green an odd-row square; verify with render. (If no candidate reads cleanly, fall back to prose-only s4 on the s2 board — acceptable because the rule is stated on the rendered board.)
- [ ] **Step 4 — socratic:** finder `tag:claimeven` with an ODD-length movestring (learner = Gray, matching the copy — Global Constraints voice rule). `messages.ask[0].text` = the current (never-rendered) goalPrompt reworded 1-based: "Green just landed on an odd row. Which column claims the square directly above?" Hint becomes claimeven-specific (the one lesson where the legacy hint was right — keep its content, 1-based wording). Set `correctCol` from the chosen board; `verify_lesson_content.mjs` must pass it.
- [ ] **Step 5 — challenges (CRIT X2.4):** re-curate both. Either find claimeven positions where the claimeven column IS solver-max (finder `tag:claimeven`, then pick candidates where the pattern column ties max score), or keep strong boards and fix the prompt to tell the truth ("Gray is better here — find the claimeven reply that keeps every Green line dead"). New `puzzleId` UUIDs for changed boards (ids are used for attempt tracking only; grading is by `/api/evaluate-move` + accepted-gate, `ChallengeScreen.jsx:282-289`).
- [ ] **Step 6:** Delete all four `<board instructions>` blocks; rewrite `_boardInstructions` to describe the final boards. Run Task 2 checkers on lesson 05. Commit.

---

## Task 4: L06 Z-Threats — rebuild boards AND fix the mechanism

**Files:** Modify `connect-four/lessons/lesson-06-z-threats.json`

- [ ] **Step 1 — mechanism rewrite (CRIT L06, [P1]):** replace the "you must enter the column first / you go 1st, opponent 2nd, you 3rd" story with the KB's zugzwang formulation (`community-z-threat.md` statement: *"the opponent must eventually play into that column, but the odd empty-cell count ensures the owner lands on row r"*). Teach: (1) count empties from the current column top up to and including the threat cell; (2) odd count = the threat is yours **when you can make the opponent move first into that column** — you keep making useful moves elsewhere; the parity of the count decides who finally lands on the threat; (3) even count = the same waiting game hands the cell to the opponent. Keep s1's count rule and s4's count-from-the-top gotcha — both are correct today.
- [ ] **Step 2 — boards:** s1/s2: finder `z_threat_gap3` (latent, gap 3 — matches the "count these three cells" narration); overlay the three gap cells `claim` + threat cell `td` (Gray's threat; lesson perspective is Gray) with `_overlayIntent` for the gap cells. s3: finder `z_threat_gap2` — ideally same-column-count contrast; verify. s4: the CURRENT board (`["ggd","ggd","ggd","dd","","",""]`) actually fits s4's stack-shift narrative (CRIT L06: gap 1 from a 2-high stack, threat on an even 1-based row) — but it has no movestring and its threat is gravity-top. Replace via `z_threat_gap3`-style search restricted to `board.colHeights[col] >= 2` candidates (one-line spec tweak), so the "count from the stack top" lesson isn't degenerate.
- [ ] **Step 3 — socratic:** finder `z_threat_socratic` (built for exactly this: z-threat + same-row even-gap distractor, Gray to move). Ask message: "Both columns hold a Gray threat on the same row. Only one is truly yours. Which column?" `correctCol` = the z-threat column. Update `goalPrompt` to match.
- [ ] **Step 4 — challenges:** keep both (structurally verified in CRIT); re-check with `verify_lesson_content.mjs`; ch2's canonical column trails solver-max (+13 vs +15) — replace via `tag:z_threat` if a max-scoring candidate appears, else leave (accepted-gate covers ties/trails, `ChallengeScreen.jsx:282-289`) and note it.
- [ ] **Step 5:** legends match overlays (the current `td` "Gap cell" legend without `td` overlays is the CRIT X8 exemplar). Delete `<board instructions>`. Run checkers. Commit.

---

## Task 5: L09 Undercut — rebuild (paid tier)

**Files:** Modify `connect-four/lessons/lesson-09-undercut.json`

- [ ] **Step 1 — text corrections (CRIT L09):** s1's "Gray wins the moment the column is touched / Green's threat will never be reached" → the T2 truth (`allen-t2.md`): the lower threat **neutralizes** the upper — if Green ever fills the lower cell, Green has spent a move only to face losing the cell above next (walk the two-move sequence on the board); the upper threat can never win the endgame. Keep s3 (same parity → both live, per `allen-t4.md` case B) and s4 (lone disc ≠ undercut) — correct today.
- [ ] **Step 2 — boards:** s1/s2: finder `undercut_t2_adjacent` (Gray lower / Green upper, latent). s3: finder `same_parity_pair`. s4: take an `undercut_t2_adjacent` candidate's column and use an EARLIER ply of the same game where Gray's line isn't complete yet (prefix of the movestring; re-verify) — that is literally "the full three-in-a-row isn't built yet".
- [ ] **Step 3 — victim's-seat slide (CRIT L09 [P2]):** add one slide (or fold into s1) showing the deep-reveal direction: "your upper threat was undercut" — reuse the s1 board mirrored in prose (Green's perspective on the same cells). This is what connects the lesson to `undercut` deep reveals (`classifier.js:1903-1905`: undercut names the blunderer's exposure).
- [ ] **Step 4 — socratic:** `undercut_t2_adjacent` candidate where Gray to move (odd ply) and playing the shared column is solver-max (filter candidates by `scores[col] === max`); ask message from the goalPrompt, 1-based. **Challenges:** ch1 keep (verified +3/+4 available); ch2 is dead-lost (CRIT X2.5) — replace via `tag:undercut` with `max >= 0` (the generic tag spec already enforces that).
- [ ] **Step 5:** placeholders deleted, `_boardInstructions` rewritten, checkers pass, commit.

---

## Task 6: L10 Overcut — rebuild (paid tier)

**Files:** Modify `connect-four/lessons/lesson-10-overcut.json`

- [ ] **Step 1 — conditions rewrite (CRIT L10):** drop "odd number of empty cells + your turn to enter first" everywhere. The playable truth for the taught sub-case: the opponent's threat cell is the **next playable cell** in the column (gravity-top), your own threat sits **directly above** it, so one move blocks and threatens at once (the detector's `active_forcing` reason, `classifier.js:978-980`). Add one closing slide/paragraph naming the other two detector-recognized cases in prose (same-parity T4, chain T2 — `classifier.js:968-971`) so deep-reveal `overcut` text never outruns the lesson. Keep s4 (shared `[*]` cell gotcha) — correct today.
- [ ] **Step 2 — boards:** finder `undercut_t2_adjacent` but with owners swapped — add a 4-line spec `overcut_active` = Green threat at `colHeights[col]` (gravity-top) owned by opponent-of-learner… concretely: Gray = learner ⇒ opponent Green threat at `r === board.colHeights[col]`, Gray threat at `r+1`, and `scores[col] === max >= 0` for Gray to move. (Copy `undercut_t2_adjacent`, swap the two `reachableThreats` calls, add the gravity-top + score conditions.) Use one candidate for s1 (before) and the same movestring + the played column appended for s2 (after) — s2's board is then *derived*, not invented, and re-verified.
- [ ] **Step 3 — socratic + challenges:** socratic from the same spec (odd ply). Challenges: both verified sound in CRIT (all-positive score rows); keep, run checkers.
- [ ] **Step 4:** placeholders/instructions/legends/checkers, commit.

---

## Task 7: L11 Figure-7 — rebuild (paid tier)

**Files:** Modify `connect-four/lessons/lesson-11-figure-7-trap.json`

- [ ] **Step 1 — text:** "Four discs" → **five** discs (three on the diagonal arm + three on the horizontal arm sharing the hinge — `community-figure-7.md` statement; CRIT L11 [P1]). s2/s3/s4 text is KB-faithful — keep with 1-based sweep.
- [ ] **Step 2 — boards (KB-first):** s1/s2: KB canonical `43222430403` (verified: Red figure-7, threats col6 rows 3+4 both above gravity, all Yellow scores −12…−14). NOTE the KB pattern owner is **Green** (Red=P1) while the lesson voice is Gray-perspective — under the neutral-voice contract this is fine ("Green has built…the trap"), or mirror-search via `tag:figure_7` for a Gray-owned candidate if the human prefers perspective match. s3 (both-gravity-top = plain fork contrast): KB borderline example `22233535444` (F3 gravity-top case). s4 (Mirror-7): the KB canonical example's own notes say it ALSO contains a mirror figure-7 on the left side (col2 rows 3/4) — reuse the same board with left-side overlays, re-verify.
- [ ] **Step 3 — socratic:** current `_boardInstructions` describe a correct five-disc setup but no board exists; finder `tag:figure_7` with odd ply (Gray learner), pick a candidate whose two threat cells are latent; `correctCol` = shared threat column; ask message from goalPrompt.
- [ ] **Step 4 — challenge 1 replacement (CRIT X2.3):** replace `441314453361115` (`correctCol` scores −4, col 5 wins +12). Finder `tag:figure_7`, require the figure-7 column to BE solver-max: pick candidates where `scores[correctCol] === maxScore`. Keep ch2 (verified good: block + build, +10 unique).
- [ ] **Step 5:** placeholders/instructions/checkers, commit.

---

## Task 8: L12 J-Shape — rebuild (paid tier)

**Files:** Modify `connect-four/lessons/lesson-12-j-shape.json`

- [ ] **Step 1 — text (CRIT L12, all [P1]):** (a) parity rule: anchor on an **odd row counting 1-based from the bottom** (rows 1/3/5) — which is what its own challenges' anchors satisfy; state it in plain words ("the bottom disc of the J sits on an odd row — 1st, 3rd, 5th"), replacing the inverted 0-indexed claim. (b) geometry: describe Allen's actual shape from `allen-j-configuration.md` (D1-D3-E2-E3: two discs in one column with a one-cell gap, two discs beside the upper one), not "a vertical pair". (c) mechanism: the J is a **triple** threat (F3/G3/G4) equivalent to one major odd-row threat — "as the far column fills, Green must eventually get one of the two stacked cells, and then the horizontal completion is unstoppable" (Allen verbatim: *"sooner or later Red must get either G3 or G4 … F3 becomes a major threat"*); drop the same-column-fork story (that's lesson 11's pattern). (d) add Allen's failure conditions (overcutting / edge proximity / parity cancellation, `known_limitations`) as the s4 false-positive slide.
- [ ] **Step 2 — boards:** KB mirror example `43344032` (`solver_verified: true`) for one slide; canonical `3334434` ONLY after verifying (`./visualize_board.sh 3334434` — KB marks it `solver_verified: PENDING`); remaining slides + socratic via finder `tag:j_shape` (detector `classifier.js:1074` encodes the real predicate, so candidates inherit correct parity/geometry — pick ply-parity to match the addressed side).
- [ ] **Step 3 — challenges:** both verified sound (+10/+5); unify prompts ("Spot the J pattern and play the move that builds it") and fix "disk"→"disc". Checkers, commit.

---

## Task 9: L02 + L03 targeted fixes (free tier, real boards already)

**Files:** Modify `lesson-02-block-before-build.json`, `lesson-03-the-fork.json`

- [ ] **L02 s1 (exact edits):** coach text color swap (CRIT X3; board verified: Gray's row-2 three, Green to move, blocking col 6 scores +12, all else −16):
  - old: `"Green has three discs in a row with one empty square to complete the four. What is Gray's only safe move?"`
  - new: `"Gray has three discs in a row with one empty square to complete the four. What is Green's only safe move?"`
  - legend `win` label old: `"Winning move"` → new: `"Gray's three in a row"` (the rings sit on discs); legend `td` label old: `"The only safe move (block here)"` stays (correct).
- [ ] **L02 s3:** `tg` "User threat" marks a **minor** Green threat — legend old: `"User threat"` → new: `"Green is building here (not yet a threat)"`; neutral voice sweep of the slide.
- [ ] **L02 s4:** keep the board (the buried-threat teaching is good) but fix the refuted overlay (CRIT X2.1): move the `tg` cue to Green's actual immediate win (0-ind col 1, `(1,4)`, +10 verified) with legend "Green can even win right now — the buried threat changes nothing", OR re-find a board where "build" is genuinely best via finder. Default: first option (zero search, turns the bug into a teaching beat).
- [ ] **L02 challenge 1:** dead-loss block (−2 best) — replace via `tag:forced_block` (generic spec enforces `max >= 0`).
- [ ] **L03 s2/s3 (exact edits):** coach color swaps (verified: threats are Green's; Gray answers):
  - s2 old: `"One move, two threats. Green must answer — but there is only one answer, and it only covers one."` → new: `"One move, two threats. Gray must answer — but one reply can only cover one of them."`
  - s3 old: `"Forks don't have to point left and right. Two threats can stack vertically in the same column — blocking the bottom one hands Gray the top."` → new: `"Forks don't have to point left and right. Two threats can stack in the same column — and blocking the bottom one hands Green the top."`
  s3 further: re-scope as an explicit forward-reference: "both cells sit high in an empty column — neither is playable yet, so this is NOT a fork you can cash today; it's a trap that wins later (Z-Threats and the Figure-7 build on exactly this)". Add overlays/legend acknowledging the second identical pair on col 5 (verified present) or crop it away by choosing an earlier ply of the same movestring (re-verify).
- [ ] **L03 socratic:** replace the lost board (CRIT X2.2) with a `fork_socratic_clean` candidate (spec rejects opponent gravity-top threats and requires the fork move to be winning-max). Rewrite ask/hint per contract.
- [ ] Run checkers on both lessons; commit.

---

## Task 10: L04 parity lesson — rewrite text on existing boards

**Files:** Modify `lesson-04-odd-rows-belong-to-red.json`

The four boards are usable (s4's is genuinely good — verified double-open Green three with one parity-good and one parity-bad end); the words are the problem (CRIT X5, X6).

- [ ] **Step 1 — s1 (final text, board-independent):** replace `infoProse` (which currently self-contradicts: "…Gray lands at row 1, Green at row 2… Green owns rows 1, 3, 5 (odd numbers)") with:
  > "Green always moves first. Count rows from the bottom, starting at 1. When a column fills straight up with the two players simply alternating, Green lands on rows 1, 3 and 5 and Gray lands on rows 2, 4 and 6. That is the pattern behind this lesson's title: odd rows belong to Green, even rows belong to Gray — each side's natural rows."
  Coach text adjusted to match (1-based, no "0-indexed").
- [ ] **Step 2 — s2/s3 (final rule text, board-independent):** replace the false per-column alternation rule (CRIT X6, KB `derived-parity-formula` known_limitations[0]) with:
  > "In a real game players skip between columns, so a column almost never fills in strict alternation — the disc count in a column does NOT tell you whose the next cell is. What row parity really tells you is who collects a cell when the column is forced to fill at the end of the game. In the middle of the game, ask a different question: how many empty cells sit between the top of the column and the cell you care about? That count — not the row number — decides who gets there, and the Z-Threats lesson turns it into a weapon."
  s3's single-disc board stays as the "same row, different owner" illustration; overlays get `"_overlayIntent": "annotation"` and legends renamed from "Opponent threat"/"User threat" to "falls to Gray"/"falls to Green" (they are not threats — verified). s3's board (single disc) stays as the "same row, different owner" illustration; overlays get `_overlayIntent: "annotation"` and legends renamed from "threat" to "falls to Green / falls to Gray" (they are not threats — verified).
- [ ] **Step 3 — s4:** relabel truthfully (CRIT X6): both ends of the double-open three are **Green's** threats; the difference is parity — left end on an odd row (Green's), right end even (worthless per Allen T6). Overlays: both ends must be green-family markers with legend "Green's good-parity threat" / "Green's bad-parity threat" — `tg` + `claim` respectively under the overlay contract (verify legend/overlay agreement via Task 2 checker).
- [ ] **Step 4 — practice (CRIT L04 [P2]):** add a socratic: finder `tag:odd_even_threat` (detector exists, `classifier.js:1137`) — "Green has two threats; only one can ever land. Click the column with the threat Green will actually collect." Even-ply candidate (learner Green, matching `userPerspective: red`). Optionally 2 challenges from the same tag (practice category `odd_even_threat` already exists in the product).
- [ ] Checkers, commit.

---

## Task 11: L01 / L07 / L08 / L13 polish pass

**Files:** Modify the four lesson JSONs

- [ ] **L01 (exact edits):**
  - s2 legend `tg` old: `"User threat"` → new: `"Green's threat"`; s2 legend `win` old: `"Winning move"` → new: `"Green's three connected discs"`.
  - s1 legend `tg` old: `"Threat square (the winning move)"` → new: `"Green's threat square — Gray must claim it"` (verified: Gray to move; blocking scores +2, all else −18).
  - s4 coach old: `"You spotted your own chance to build — but your opponent already has three in a row. What happens if you extend your own line first?"` → new: `"Green sees a tempting square to build on — but Gray already has three in a row. What happens if Green builds first?"` (neutral voice; threat verified Gray's).
  - Each edited field's `label_es`/`text_es` sibling is deleted per the exit checklist (L01 is the one fully translated lesson).
  - Socratic ask/hint rewritten in Task 12; keep the board (verified unique-best col 0, +15).
- [ ] **L07 (exact edit):** s2 coach old: `"Here both players raced up the centre column, then Green shifted one column over. This is the '5-4' central-column opening — a known Green win."` → new: `"Here both players raced up the centre column, then Gray opened the next column over and Green answered on top. This is the '5-4' central-column opening — a known Green win."` (verified: move 6, the first disc in that column, is Gray's; L08 s2 already narrates it correctly). s2 "third-row (odd-row)" kept — consistent with the plan-wide 1-based convention. s4: replace the near-duplicate of s1 with the counting payoff (how many 4-windows pass through a centre cell vs an edge cell — enumerate the windows in a scratch script before committing the numbers; do not state them from memory).
- [ ] **L08:** no factual defects (CRIT); only the Task-12 static-checker items if any fire.
- [ ] **L13 (exact edits):** s2 infoProse fragment old: `"only col 1 (0-indexed) keeps the win"` → new: `"only the second column from the left keeps the win"` (board verified +7 unique at that column). s2 coach fragment old: `"the centre column at rows 2 and 3 (0-indexed)"` → new: `"the third and fourth cells of the centre column"`. Optionally add 2 book-line challenges from KB continuation lines (`docs/knowledge-base/README.md` §2026-07-04: `333334140222212`, `33333111115` — verify each with `optimal_line.mjs`/visualize before embedding).
- [ ] Checkers, commit.

---

## Task 12: socratic ask/hint de-templating (all lessons)

**Files:** All lesson JSONs with socratics (01, 02, 03, 05, 06, 09, 10, 11, 12; 07/08/13 already conform)

- [ ] For each: `messages.ask[0].text` = the lesson-specific question (source: the never-rendered `goalPrompt`, reworded 1-based; CRIT X7); `messages.hint[0].text` = a lesson-specific nudge (e.g. L01 "One column already holds three of your discs…"; L02 "Where does Gray win next turn if you do nothing?"); keep `wrong1/wrong2/correct` shared copy (harmless). Update `goalPrompt` to mirror `ask`. Empty the Task-2 static-checker allowlist so the legacy-ask assertion goes live.
- [ ] `npm run test:fast` green; commit.

---

## Task 13: deep-reveal linking + lesson ordering

**Files:** Modify `connect-four/src/lib/kbTermLesson.js`; rename lesson files

- [ ] **Step 1 (CRIT Part 3 linking gap):** in `KB_TERM_LESSON`, set `lessonId: 'immediate-threat'` on `community-immediate-threat`, `'the-fork'` on `community-double-threat`, `'block-before-build'` on `community-forced-block` (ids from the lesson JSONs' `id` fields, verified). Check the popup CTA renders (the map is consumed by `AnnotatedExplanation`'s term popups).
- [ ] **Step 2 (CRIT X9):** restore the authored order via `git mv` renames (order = filename prefix, `lessonLoader.js:170-171`; JSON `order` fields are overwritten at load, `:173`): undercut→`lesson-07-…`, overcut→`lesson-08-…`, figure-7→`lesson-09-…`, j-shape→`lesson-10-…`, opening-centre→`lesson-11-…`, opening-imitate→`lesson-12-…`, opening-sharp stays `lesson-13-…`. Update each JSON's `order` field to match its new prefix (cosmetic but stops the drift). Lesson `id`s (and therefore `lesson_progress` rows and i18n keys) are untouched by renames — verified: loader keys by `id`, order by filename.
- [ ] **Step 3:** `npm run test:fast`; hand-check the saga screen ordering in the app if a dev server is up. Commit. (This task runs AFTER all content tasks so file renames don't invalidate in-flight edits.)

---

## Task 14: Spanish pass + audio (after English freeze)

**Files:** All lesson JSONs; `connect-four/public/audio/lessons/*`

- [ ] **Step 1:** For each remediated lesson, draft `_es`: `node --env-file=server/.env scripts/translate-lessons.mjs --lesson <id>` (from `connect-four/`; drafts only missing `_es`, resumable; `--force` where English changed under an existing `_es` — i.e. L01's edited lines and all shared socratic messages). Human-reviews drafts per D1 (`translate-lessons.mjs` header: *"drafted OFFLINE … HUMAN-REVIEWED before shipping"*). Terminology must match KB `short_summary_es` glosses where they exist (`allis-claimeven`, `community-figure-7`) and use 1-based Spanish ("la fila de abajo", "la segunda columna").
- [ ] **Step 2:** Regenerate audio for changed messages: the admin flow calls `generateLessonAudio(lesson, { lang })` (`server/index.js:936`); run for `en` where L01 texts changed and for `es` lesson-by-lesson as translations land; then `pruneOrphanedLessonAudio` for stale hashes (`lessonAudio.js:214`).
- [ ] **Step 3:** `test:fast` + spot-check `GET /api/lessons/<id>` with `Accept-Language: es` headers (per `lessonLoader.js#localizeLesson`). Commit.

---

## Task 15: closeout

- [ ] Run `verify_lesson_content.mjs` across ALL lessons; paste the pass table into the PR description.
- [ ] Re-run every board in every lesson through `./visualize_board.sh`; confirm no regressions vs each task's recorded scores.
- [ ] `git checkout -- connect-four/server/c4solver connect-four/solver-src/` (Linux solver build must not be committed).
- [ ] Append a "Remediation status" section to `docs/lesson-content-critique-2026-07-22.md` mapping each X-finding to fixed/deferred; deferred items (free/paid split, new vocabulary + zugzwang lessons — CRIT Part 4.5) become entries in `docs/open_issues.md`.
- [ ] Decide `find_lesson_boards.mjs`'s fate with the owner: keep as curation tooling (recommended — future lessons need boards too) or delete per its "disposable" header. Either way it never enters the test suite.

## Explicitly out of scope (owner decisions, flagged not planned)

- Moving the free/paid boundary (CRIT Part 4.4).
- The two new lessons (threat vocabulary; zugzwang/tempo — CRIT Part 3 gaps): each is a full content-design task; plan them after this remediation stabilizes the base.
- Re-curating challenge sets beyond the specific broken ones named above.
