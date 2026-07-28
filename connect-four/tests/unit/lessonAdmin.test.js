import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { lessonFilePath, findLessonFile, saveLessonFile, deleteLessonFile } from '../../server/lessonAdmin.js';
import { computeWindowCounts } from '../../server/windowCounts.js';
import { validateLesson } from '../../server/lessonLoader.js';

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ladmin-'));
}

const SAMPLE = {
  id: 'test-lesson',
  title: 'Test',
  order: 3,
  free: true,
  userPerspective: 'red',
  slides: [],
  socratic: null,
  confirmationCategory: null,
  confirmationCount: 0,
};

test('lessonFilePath: returns correct filename for order=3, id=test-lesson', () => {
  const p = lessonFilePath('/lessons', SAMPLE);
  assert.ok(p.endsWith('lesson-03-test-lesson.json'), `got: ${p}`);
});

test('findLessonFile: returns filename when lesson exists', () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, 'lesson-03-test-lesson.json'), '{}');
  const found = findLessonFile(dir, 'test-lesson');
  assert.equal(found, 'lesson-03-test-lesson.json');
});

test('findLessonFile: returns null when lesson does not exist', () => {
  const dir = tmpDir();
  const found = findLessonFile(dir, 'nonexistent');
  assert.equal(found, null);
});

test('saveLessonFile: writes JSON to disk at the correct path', () => {
  const dir = tmpDir();
  saveLessonFile(dir, SAMPLE);
  const file = path.join(dir, 'lesson-03-test-lesson.json');
  assert.ok(fs.existsSync(file), 'file should exist');
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(parsed.id, SAMPLE.id);
});

test('saveLessonFile: deletes old file when id changes', () => {
  const dir = tmpDir();
  // Write old file with different id
  const oldPath = path.join(dir, 'lesson-03-old-id.json');
  fs.writeFileSync(oldPath, '{}');

  saveLessonFile(dir, SAMPLE, 'old-id');
  assert.ok(!fs.existsSync(oldPath), 'old file should be deleted');
  assert.ok(fs.existsSync(path.join(dir, 'lesson-03-test-lesson.json')), 'new file should exist');
});

test('deleteLessonFile: removes the file for the given id', () => {
  const dir = tmpDir();
  const file = path.join(dir, 'lesson-03-test-lesson.json');
  fs.writeFileSync(file, '{}');
  deleteLessonFile(dir, 'test-lesson');
  assert.ok(!fs.existsSync(file), 'file should be deleted');
});

test('deleteLessonFile: does not throw when lesson file does not exist', () => {
  const dir = tmpDir();
  assert.doesNotThrow(() => deleteLessonFile(dir, 'nonexistent'));
});

function lessonWithSlides(slides) {
  return {
    id: 'wc-fixture', title: 'WC', free: true, userPerspective: 'red', order: 99,
    slides, socratic: null, confirmationCategory: null, confirmationCount: 0,
  };
}

test('saveLessonFile: stamps windowCounts on slides that opt in', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-'));
  const lesson = lessonWithSlides([
    { movestring: '333', showWindowCounts: true, boardSpec: ['', '', '', 'gdg', '', '', ''] },
  ]);
  saveLessonFile(dir, lesson);
  const written = JSON.parse(fs.readFileSync(path.join(dir, 'lesson-99-wc-fixture.json'), 'utf8'));
  assert.deepEqual(written.slides[0].windowCounts, computeWindowCounts('333', 'red'));
  // Spot-check the actual value so this cannot pass by comparing two identical bugs.
  assert.equal(written.slides[0].windowCounts[3][3], 11);
});

test('saveLessonFile: strips windowCounts from slides that do not opt in', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-'));
  const lesson = lessonWithSlides([
    { movestring: '333', windowCounts: [[1, 1, 1, 1, 1, 1, 1]], boardSpec: ['', '', '', 'gdg', '', '', ''] },
  ]);
  saveLessonFile(dir, lesson);
  const written = JSON.parse(fs.readFileSync(path.join(dir, 'lesson-99-wc-fixture.json'), 'utf8'));
  assert.equal(written.slides[0].windowCounts, undefined);
});

test('saveLessonFile: recomputes a stale windowCounts rather than trusting it', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-'));
  const lesson = lessonWithSlides([
    { movestring: '333', showWindowCounts: true, windowCounts: [[0, 0, 0, 0, 0, 0, 0]], boardSpec: ['', '', '', 'gdg', '', '', ''] },
  ]);
  saveLessonFile(dir, lesson);
  const written = JSON.parse(fs.readFileSync(path.join(dir, 'lesson-99-wc-fixture.json'), 'utf8'));
  assert.equal(written.slides[0].windowCounts[3][3], 11);
});

test('saveLessonFile: uses the learner perspective, not the side to move', () => {
  // '333' is 3 plies, so GRAY is to move — but a userPerspective 'red' lesson must
  // still count for GREEN. Under gray's perspective (3,3) would be 10, not 11.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-'));
  saveLessonFile(dir, lessonWithSlides([
    { movestring: '333', showWindowCounts: true, boardSpec: ['', '', '', 'gdg', '', '', ''] },
  ]));
  const written = JSON.parse(fs.readFileSync(path.join(dir, 'lesson-99-wc-fixture.json'), 'utf8'));
  assert.equal(written.slides[0].windowCounts[3][3], 11);
});

test('validateLesson: rejects a non-boolean showWindowCounts and a malformed windowCounts', () => {
  const bad1 = lessonWithSlides([{ movestring: '', showWindowCounts: 'yes' }]);
  assert.match(validateLesson(bad1) ?? '', /showWindowCounts/);
  const bad2 = lessonWithSlides([{ movestring: '', showWindowCounts: true, windowCounts: [[1, 2, 3]] }]);
  assert.match(validateLesson(bad2) ?? '', /windowCounts/);
  const good = lessonWithSlides([
    { movestring: '', showWindowCounts: true, windowCounts: computeWindowCounts('', 'red') },
  ]);
  assert.equal(validateLesson(good), null);
});
