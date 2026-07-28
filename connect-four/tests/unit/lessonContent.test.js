// tests/unit/lessonContent.test.js — invariants from docs/lesson-content-critique-2026-07-22.md
// (CRIT X1 placeholders, X5 indexing language, X8 legend/overlay drift, boardSpec derivation).
// Strict checks apply only to lessons in REMEDIATED; each remediation task adds its lesson id.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseMovestring, boardToSpec } from '../../src/lib/movestring.js';
import { isStraightLineWindow, WINDOW_HIGHLIGHT_COLOR } from '../../src/lib/lessonWindows.js';
import { computeWindowCounts } from '../../server/windowCounts.js';

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
  'claimeven',
  'z-threats',
  'undercut',
  'overcut',
  'figure-7',
  'j-shape',
  'odd-rows-belong-to-red',
  'opening-sharp',
  'threat-vocabulary',
  'zugzwang-tempo',
]);

// Task 12 emptied this allowlist: every socratic ask is now lesson-specific, and the
// legacy-template assertion below applies to all lessons. Never re-add an id here.
const LEGACY_ASK_ALLOWLIST = new Set([]);
const LEGACY_ASK = "I'm going to make a mistake here. See if you can punish it.";

function* userVisibleStrings(lesson) {
  for (const [i, s] of (lesson.slides ?? []).entries()) {
    for (const k of ['infoProse', 'infoProse_es']) if (typeof s[k] === 'string') yield [`slides[${i}].${k}`, s[k]];
    for (const [j, m] of (s.coachMessages ?? []).entries())
      for (const k of ['text', 'text_es']) if (typeof m[k] === 'string') yield [`slides[${i}].coachMessages[${j}].${k}`, m[k]];
    for (const [j, li] of (s.legendItems ?? []).entries())
      for (const k of ['label', 'label_es']) if (typeof li[k] === 'string') yield [`slides[${i}].legendItems[${j}].${k}`, li[k]];
    for (const [j, w] of (s.windowHighlights ?? []).entries())
      for (const k of ['label', 'label_es']) if (typeof w[k] === 'string') yield [`slides[${i}].windowHighlights[${j}].${k}`, w[k]];
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

// windowHighlights is authored by hand, one capsule per four-in-a-line window, and the
// renderer draws blindly from cells[0] to cells[last]. An unordered, bent, or gapped
// array therefore draws a plausible-looking capsule over the WRONG cells and nothing
// else catches it — not the solver script (which knows only about tg/td overlays) and
// not the eye, unless someone opens that exact slide. This is that gate. It is
// unconditional (not gated on REMEDIATED): the field is new, so every use of it is new.
test('lessonContent: windowHighlights are contiguous straight lines, ordered along the line', () => {
  for (const { file, lesson } of lessons) {
    for (const [i, s] of (lesson.slides ?? []).entries()) {
      for (const [j, w] of (s.windowHighlights ?? []).entries()) {
        const where = `${file} slides[${i}].windowHighlights[${j}]`;
        assert.ok(isStraightLineWindow(w.cells),
          `${where}: cells are not 2–4 on-board cells in a contiguous, ordered straight line: ${JSON.stringify(w.cells)}`);
        assert.ok(w.type === undefined || Object.hasOwn(WINDOW_HIGHLIGHT_COLOR, w.type),
          `${where}: unknown type '${w.type}' (known: ${Object.keys(WINDOW_HIGHLIGHT_COLOR).join(', ')})`);
        // A missing label_es ships English silently — the lessonLoader falls back per field.
        if (typeof w.label === 'string' && w.label.length > 0) {
          assert.equal(typeof w.label_es, 'string', `${where}: label without label_es ships English in Spanish`);
          assert.ok(w.label_es.length > 0, `${where}: label_es is empty`);
        }
      }
    }
  }
});

test('lessonContent: every windowHighlight cell is inside the slide it annotates', () => {
  // Guards the copy/paste failure mode: a window lifted from another slide's board.
  // Board geometry, not occupancy — a window legitimately spans discs AND empty cells.
  for (const { file, lesson } of lessons) {
    for (const [i, s] of (lesson.slides ?? []).entries()) {
      if (!(s.windowHighlights ?? []).length) continue;
      assert.equal(typeof s.movestring, 'string', `${file} slides[${i}]: windowHighlights on a slide with no movestring`);
      const board = parseMovestring(s.movestring);
      for (const [j, w] of s.windowHighlights.entries())
        for (const cell of w.cells)
          assert.ok(board[cell.r]?.[cell.c] !== undefined,
            `${file} slides[${i}].windowHighlights[${j}]: cell (${cell.c},${cell.r}) is off this board`);
    }
  }
});

test('lessonContent[strict]: socratic ask is lesson-specific (legacy template retired)', () => {
  for (const { file, lesson } of lessons) {
    if (!lesson.socratic || LEGACY_ASK_ALLOWLIST.has(lesson.id)) continue;
    assert.notEqual(lesson.socratic.messages?.ask?.[0]?.text, LEGACY_ASK, `${file}: still uses the legacy ask template`);
  }
});

// windowCounts is a DERIVED CACHE written by saveLessonFile, not authored copy. If someone
// edits a movestring by hand (or the recompute is ever bypassed), the board would render a
// stale, confidently-wrong number that nothing else catches — the value looks plausible and
// only a person opening that exact slide and recounting 69 windows would notice. This is
// that gate. Unconditional, not gated on REMEDIATED: the field is new, so every use is new.
test('lessonContent: windowCounts equals a fresh recompute from the slide movestring', () => {
  for (const { file, lesson } of lessons) {
    for (const [i, s] of (lesson.slides ?? []).entries()) {
      const where = `${file} slides[${i}]`;
      if (s.showWindowCounts !== true) {
        assert.equal(s.windowCounts, undefined,
          `${where}: windowCounts present without showWindowCounts — strip it`);
        continue;
      }
      assert.equal(typeof s.movestring, 'string', `${where}: showWindowCounts on a slide with no movestring`);
      assert.deepEqual(s.windowCounts, computeWindowCounts(s.movestring, lesson.userPerspective),
        `${where}: windowCounts is stale — re-run scripts/backfill-window-counts.mjs`);
    }
  }
});

test('lessonContent: showWindowCounts is a concept-slide field only', () => {
  for (const { file, lesson } of lessons) {
    assert.equal(lesson.socratic?.showWindowCounts, undefined,
      `${file}: showWindowCounts on socratic — the field is concept-slide only`);
    assert.equal(lesson.socratic?.windowCounts, undefined,
      `${file}: windowCounts on socratic — the field is concept-slide only`);
  }
});

test('lessonContent: the two opening lessons opt every concept slide into windowCounts', () => {
  // Locks in the shipped scope so a later edit cannot silently drop the overlay.
  for (const id of ['opening-centre', 'opening-sharp']) {
    const entry = lessons.find(l => l.lesson.id === id);
    assert.ok(entry, `no lesson with id "${id}"`);
    // opening-centre opts in 3 of its 4 slides; opening-sharp all 3 of its 3.
    const opted = entry.lesson.slides.filter(s => s.showWindowCounts === true).length;
    assert.equal(opted, 3, `${id}: expected 3 slides with showWindowCounts`);
  }
});
