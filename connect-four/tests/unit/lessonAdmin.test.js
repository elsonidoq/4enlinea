import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { lessonFilePath, findLessonFile, saveLessonFile, deleteLessonFile } from '../../server/lessonAdmin.js';

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
