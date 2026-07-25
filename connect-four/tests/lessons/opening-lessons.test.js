import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateLesson } from '../../server/lessonLoader.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../lessons');
const load = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));

test('opening-centre lesson is valid and Socratic targets centre', () => {
  const l = load('lesson-11-opening-centre.json');
  assert.equal(validateLesson(l), null);        // null = valid
  assert.equal(l.socratic.correctCol, 3);
  assert.equal(l.confirmationCategory, null);
});

test('opening-imitate lesson is valid', () => {
  const l = load('lesson-12-opening-imitate.json');
  assert.equal(validateLesson(l), null);
  assert.ok(Number.isInteger(l.socratic.correctCol));
});

test('opening-sharp lesson is valid, Pro, Socratic targets the only winning move', () => {
  const l = load('lesson-13-opening-sharp.json');
  assert.equal(validateLesson(l), null);
  assert.equal(l.free, false);
  assert.equal(l.socratic.correctCol, 4);   // gambit 3265533353553111 -> col 4
});
