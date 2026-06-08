import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadLessons, getLessons, getLesson, reloadLessons, getLessonsAll, validateLesson } from '../../server/lessonLoader.js';

/** Minimal valid lesson fixture */
function makeValidLesson(overrides = {}) {
  return {
    id: 'test-lesson-1',
    title: 'Test Lesson',
    free: true,
    userPerspective: 'red',
    slides: [{ type: 'text', text: 'Hello' }],
    socratic: null,
    confirmationCategory: null,
    confirmationCount: 0,
    ...overrides,
  };
}

function writeTempLesson(dir, filename, obj) {
  fs.writeFileSync(path.join(dir, filename), JSON.stringify(obj), 'utf8');
}

test('lessonLoader: valid JSON file is loaded and returned by getLessons() and getLesson(id)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lessons-'));
  const lesson = makeValidLesson();
  writeTempLesson(dir, 'lesson-01-test.json', lesson);

  loadLessons(dir);

  const list = getLessons();
  assert.equal(list.length, 1, 'getLessons should return 1 lesson');
  assert.equal(list[0].id, lesson.id);
  assert.equal(list[0].title, lesson.title);
  assert.equal(list[0].order, 1);
  assert.equal(list[0].free, true);

  const full = getLesson(lesson.id);
  assert.ok(full !== null, 'getLesson should return the lesson object');
  assert.equal(full.id, lesson.id);
  assert.equal(full.userPerspective, lesson.userPerspective);
  assert.deepEqual(full.slides, lesson.slides);
});

test('lessonLoader: file missing the id field is excluded; console.error is called', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lessons-'));
  const badLesson = makeValidLesson();
  delete badLesson.id;
  writeTempLesson(dir, 'lesson-02-bad.json', badLesson);

  const errors = [];
  const originalError = console.error;
  console.error = (...args) => errors.push(args.join(' '));

  try {
    loadLessons(dir);
    const list = getLessons();
    assert.equal(list.length, 0, 'invalid lesson should be excluded');
    assert.ok(errors.length > 0, 'console.error should have been called');
    assert.ok(
      errors.some(e => /lesson-02-bad\.json/.test(e)),
      'error message should reference the filename'
    );
  } finally {
    console.error = originalError;
  }
});

test('lessonLoader: non-existent directory returns empty array without crashing', () => {
  const nonExistentDir = path.join(os.tmpdir(), 'lessons-does-not-exist-' + Date.now());

  const errors = [];
  const originalError = console.error;
  console.error = (...args) => errors.push(args.join(' '));

  try {
    loadLessons(nonExistentDir);
    const list = getLessons();
    assert.equal(list.length, 0, 'getLessons should return [] for missing directory');
    assert.ok(errors.length > 0, 'console.error should have been called for missing dir');
  } finally {
    console.error = originalError;
  }
});

test('lessonLoader: slide with boardSpec having 6 elements is excluded', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lessons-'));
  const badLesson = makeValidLesson({
    slides: [
      { type: 'board', boardSpec: ['', '', '', '', '', ''] }, // 6 elements, invalid
    ],
  });
  writeTempLesson(dir, 'lesson-03-badspec.json', badLesson);

  const errors = [];
  const originalError = console.error;
  console.error = (...args) => errors.push(args.join(' '));

  try {
    loadLessons(dir);
    const list = getLessons();
    assert.equal(list.length, 0, 'lesson with 6-element boardSpec should be excluded');
    assert.ok(errors.length > 0, 'console.error should have been called');
  } finally {
    console.error = originalError;
  }
});

test('lessonLoader: reloadLessons re-reads the same directory', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lessons-reload-'));
  writeTempLesson(dir, 'lesson-01-test.json', makeValidLesson());
  loadLessons(dir);
  assert.equal(getLessons().length, 1);

  // Add a second lesson and reload
  writeTempLesson(dir, 'lesson-02-second.json', makeValidLesson({ id: 'second', title: 'Second' }));
  reloadLessons();
  assert.equal(getLessons().length, 2);
});

test('lessonLoader: getLessonsAll returns full lesson objects (not summaries)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lessons-all-'));
  const lesson = makeValidLesson({ confirmationCategory: 'immediate_threat', confirmationCount: 3 });
  writeTempLesson(dir, 'lesson-01-test.json', lesson);
  loadLessons(dir);

  const all = getLessonsAll();
  assert.equal(all.length, 1);
  assert.equal(all[0].confirmationCategory, 'immediate_threat');
  assert.equal(all[0].confirmationCount, 3);
  assert.ok('slides' in all[0], 'full object should include slides');
});

test('lessonLoader: validateLesson returns null for a valid lesson', () => {
  const err = validateLesson(makeValidLesson());
  assert.equal(err, null);
});

test('lessonLoader: validateLesson returns error string for missing id', () => {
  const bad = makeValidLesson();
  delete bad.id;
  const err = validateLesson(bad);
  assert.ok(typeof err === 'string' && err.length > 0, 'should return error string');
});
