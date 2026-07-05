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
