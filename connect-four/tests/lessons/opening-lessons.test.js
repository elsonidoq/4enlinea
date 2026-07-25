import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateLesson } from '../../server/lessonLoader.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../lessons');

// Resolve by lesson `id`, never by filename: the numeric filename prefix encodes
// curriculum ORDER and is deliberately renumbered when the syllabus is resequenced
// (twice so far), whereas `id` is stable — it keys lesson_progress rows and the
// i18n title keys. Loading by filename silently broke this file on the last two
// reorders; loading by id cannot.
const byId = (() => {
  const map = new Map();
  for (const f of fs.readdirSync(dir).filter(f => /^lesson-\d+-.*\.json$/.test(f))) {
    const lesson = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    map.set(lesson.id, lesson);
  }
  return map;
})();
const load = (id) => {
  const lesson = byId.get(id);
  assert.ok(lesson, `no lesson with id "${id}" in ${dir}`);
  return lesson;
};

test('opening-centre lesson is valid and Socratic targets centre', () => {
  const l = load('opening-centre');
  assert.equal(validateLesson(l), null);        // null = valid
  assert.equal(l.socratic.correctCol, 3);
  assert.equal(l.confirmationCategory, null);
});

test('opening-imitate lesson is valid', () => {
  const l = load('opening-imitate');
  assert.equal(validateLesson(l), null);
  assert.ok(Number.isInteger(l.socratic.correctCol));
});

test('opening-sharp lesson is valid, Pro, Socratic targets the only winning move', () => {
  const l = load('opening-sharp');
  assert.equal(validateLesson(l), null);
  assert.equal(l.free, false);
  assert.equal(l.socratic.correctCol, 4);   // gambit 3265533353553111 -> col 4
});
