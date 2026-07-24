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
  'claimeven',
  'z-threats',
  'undercut',
  'overcut',
  'figure-7',
  'j-shape',
  'odd-rows-belong-to-red',
  'opening-sharp',
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
