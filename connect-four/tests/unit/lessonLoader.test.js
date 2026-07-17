import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadLessons, getLessons, getLesson, reloadLessons, getLessonsAll, validateLesson, localizeLesson } from '../../server/lessonLoader.js';

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

// ── confirmationChallenges validation ────────────────────────────────────────────

test('validateLesson: accepts valid confirmationChallenges array', () => {
  const lesson = makeValidLesson({
    confirmationChallenges: [
      { moveString: '33201', correctCol: 3, userPlayer: 1 },
      { moveString: '44452556366', correctCol: 0, userPlayer: 2, puzzleId: 'abc-123', interactionMode: 'single_move' },
    ],
  });
  const err = validateLesson(lesson);
  assert.equal(err, null);
});

test('validateLesson: accepts confirmationChallenges: null (backward compat)', () => {
  const lesson = makeValidLesson({ confirmationChallenges: null });
  const err = validateLesson(lesson);
  assert.equal(err, null);
});

test('validateLesson: accepts missing confirmationChallenges (backward compat)', () => {
  const lesson = makeValidLesson(); // confirmationChallenges is not set
  const err = validateLesson(lesson);
  assert.equal(err, null);
});

test('validateLesson: rejects confirmationChallenges that is not an array', () => {
  const lesson = makeValidLesson({ confirmationChallenges: 'not-an-array' });
  const err = validateLesson(lesson);
  assert.ok(typeof err === 'string' && err.includes('confirmationChallenges'));
});

test('validateLesson: rejects entry with missing moveString', () => {
  const lesson = makeValidLesson({
    confirmationChallenges: [{ correctCol: 3, userPlayer: 1 }],
  });
  const err = validateLesson(lesson);
  assert.ok(typeof err === 'string' && err.includes('moveString'));
});

test('validateLesson: rejects entry with invalid moveString (non-digit chars)', () => {
  const lesson = makeValidLesson({
    confirmationChallenges: [{ moveString: '33abc', correctCol: 3, userPlayer: 1 }],
  });
  const err = validateLesson(lesson);
  assert.ok(typeof err === 'string' && err.includes('moveString'));
});

test('validateLesson: rejects entry with correctCol out of range', () => {
  const lesson = makeValidLesson({
    confirmationChallenges: [{ moveString: '33', correctCol: 7, userPlayer: 1 }],
  });
  const err = validateLesson(lesson);
  assert.ok(typeof err === 'string' && err.includes('correctCol'));
});

test('validateLesson: rejects entry with userPlayer not 1 or 2', () => {
  const lesson = makeValidLesson({
    confirmationChallenges: [{ moveString: '33', correctCol: 3, userPlayer: 0 }],
  });
  const err = validateLesson(lesson);
  assert.ok(typeof err === 'string' && err.includes('userPlayer'));
});

test('validateLesson: rejects entry with invalid interactionMode', () => {
  const lesson = makeValidLesson({
    confirmationChallenges: [{ moveString: '33', correctCol: 3, userPlayer: 1, interactionMode: 'invalid' }],
  });
  const err = validateLesson(lesson);
  assert.ok(typeof err === 'string' && err.includes('interactionMode'));
});

// ── getLesson backward-compat transformations ─────────────────────────────────────

test('getLesson: derives explicit null when legacy fields exist but no confirmationChallenges', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lessons-compat-'));
  const lesson = makeValidLesson({
    confirmationCategory: 'immediate_threat',
    confirmationCount: 3,
    // confirmationChallenges intentionally not set
  });
  writeTempLesson(dir, 'lesson-01-test.json', lesson);
  loadLessons(dir);

  const result = getLesson(lesson.id);
  assert.equal(result.confirmationChallenges, null, 'should set confirmationChallenges to explicit null');
  assert.equal(result.confirmationCount, 3, 'should preserve original confirmationCount');
});

test('getLesson: derives confirmationCount from curated challenges when present', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lessons-derived-'));
  const lesson = makeValidLesson({
    confirmationCategory: 'immediate_threat',
    confirmationCount: 99, // stale value, should be overridden
    confirmationChallenges: [
      { moveString: '33201', correctCol: 3, userPlayer: 1 },
      { moveString: '44452', correctCol: 0, userPlayer: 2 },
    ],
  });
  writeTempLesson(dir, 'lesson-01-test.json', lesson);
  loadLessons(dir);

  const result = getLesson(lesson.id);
  assert.equal(result.confirmationCount, 2, 'should derive count from confirmationChallenges.length');
  assert.equal(result.confirmationChallenges.length, 2);
});

// ── locale-merge seam (D1) ─────────────────────────────────────────────────────

const LOCALE_FIXTURE = {
  id: 'demo',
  title: 'Immediate Threats',
  slides: [{
    infoProse: 'An immediate threat is any four-cell window.',
    infoProse_es: 'Una amenaza inmediata es cualquier ventana de cuatro celdas.',
    coachMessages: [
      { text: 'Look at the board.', text_es: 'Mirá el tablero.', audio: '/audio/lessons/aaa.mp3', audio_es: '/audio/lessons/bbb.mp3' },
      { text: 'No translation yet.', audio: '/audio/lessons/ccc.mp3' },
    ],
    legendItems: [{ label: 'Threat square', label_es: 'Casilla de amenaza' }],
  }],
  socratic: { goalPrompt: 'Find the winning move.', goalPrompt_es: 'Encontrá la jugada ganadora.' },
};

test('locale en returns English untouched and strips _es keys', () => {
  const out = localizeLesson(LOCALE_FIXTURE, 'en');
  assert.strictEqual(out.slides[0].infoProse, 'An immediate threat is any four-cell window.');
  assert.strictEqual(out.slides[0].coachMessages[0].text, 'Look at the board.');
  assert.strictEqual(out.slides[0].coachMessages[0].audio, '/audio/lessons/aaa.mp3');
  assert.ok(!('infoProse_es' in out.slides[0]), '_es keys must not leak to the client');
  assert.ok(!('text_es' in out.slides[0].coachMessages[0]));
});

test('locale es merges Spanish text AND its matching audio', () => {
  const out = localizeLesson(LOCALE_FIXTURE, 'es');
  assert.strictEqual(out.slides[0].infoProse, 'Una amenaza inmediata es cualquier ventana de cuatro celdas.');
  assert.strictEqual(out.slides[0].coachMessages[0].text, 'Mirá el tablero.');
  assert.strictEqual(out.slides[0].coachMessages[0].audio, '/audio/lessons/bbb.mp3');
  assert.strictEqual(out.slides[0].legendItems[0].label, 'Casilla de amenaza');
  assert.strictEqual(out.socratic.goalPrompt, 'Encontrá la jugada ganadora.');
  assert.ok(!('text_es' in out.slides[0].coachMessages[0]));
});

test('es falls back PER FIELD so a partial translation never blanks a slide', () => {
  const out = localizeLesson(LOCALE_FIXTURE, 'es');
  assert.strictEqual(out.slides[0].coachMessages[1].text, 'No translation yet.');
  assert.strictEqual(out.slides[0].coachMessages[1].audio, '/audio/lessons/ccc.mp3');
});

test('title is never touched — the lesson.<id>.title i18n key owns it', () => {
  assert.strictEqual(localizeLesson(LOCALE_FIXTURE, 'es').title, 'Immediate Threats');
});

test('an unknown locale degrades to English rather than throwing', () => {
  assert.strictEqual(localizeLesson(LOCALE_FIXTURE, 'fr').slides[0].infoProse, 'An immediate threat is any four-cell window.');
});

test('getLesson(id): single-arg call defaults to en and strips any _es keys', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lessons-locale-'));
  const lesson = makeValidLesson({
    slides: [{ type: 'text', text: 'Hello', text_es: 'Hola' }],
  });
  writeTempLesson(dir, 'lesson-01-test.json', lesson);
  loadLessons(dir);

  const result = getLesson(lesson.id);
  assert.equal(result.slides[0].text, 'Hello');
  assert.ok(!('text_es' in result.slides[0]));
});

test('es-only field (no English base) does not inject an undefined key for locale=en', () => {
  const fixture = {
    id: 'demo-es-only',
    title: 'Es Only',
    slides: [{ infoProse_es: 'Solo en español.' }],
    socratic: null,
  };
  const out = localizeLesson(fixture, 'en');
  assert.ok(!('infoProse' in out.slides[0]), 'infoProse must not appear as undefined when only infoProse_es exists');
  assert.ok(!('infoProse_es' in out.slides[0]));
});

test('es-only nested coachMessages[].text_es (no text) does not inject an undefined key for locale=en', () => {
  const fixture = {
    id: 'demo-es-only-coach',
    title: 'Es Only Coach',
    slides: [{
      coachMessages: [{ text_es: 'Solo en español.' }],
    }],
    socratic: null,
  };
  const out = localizeLesson(fixture, 'en');
  assert.ok(!('text' in out.slides[0].coachMessages[0]), 'text must not appear as undefined when only text_es exists');
  assert.ok(!('text_es' in out.slides[0].coachMessages[0]));
});

test('es-only socratic.goalPrompt_es (no goalPrompt) does not inject an undefined key for locale=en', () => {
  const fixture = {
    id: 'demo-es-only-socratic',
    title: 'Es Only Socratic',
    slides: [{ infoProse: 'Hi' }],
    socratic: { goalPrompt_es: 'Encontrá la jugada.' },
  };
  const out = localizeLesson(fixture, 'en');
  assert.ok(!('goalPrompt' in out.socratic), 'goalPrompt must not appear as undefined when only goalPrompt_es exists');
  assert.ok(!('goalPrompt_es' in out.socratic));
});

test('getLesson(id, "es"): merges locale after backward-compat transforms are applied', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lessons-locale-compat-'));
  const lesson = makeValidLesson({
    confirmationCategory: 'immediate_threat',
    confirmationCount: 99,
    confirmationChallenges: [
      { moveString: '33201', correctCol: 3, userPlayer: 1 },
      { moveString: '44452', correctCol: 0, userPlayer: 2 },
    ],
    slides: [{ type: 'text', text: 'Hello', text_es: 'Hola' }],
  });
  writeTempLesson(dir, 'lesson-01-test.json', lesson);
  loadLessons(dir);

  const result = getLesson(lesson.id, 'es');
  assert.equal(result.confirmationCount, 2, 'derived confirmationCount transform must still apply');
  assert.equal(result.slides[0].text, 'Hello', 'slide.text has no _es-suffixed sibling here, not affected by transform ordering');
});

// ── socratic.messages (Socratic copy as lesson content) ──────────────────────

/** Lesson with a Socratic board whose copy lives in socratic.messages. */
function makeSocraticLesson(messages) {
  return makeValidLesson({
    socratic: { movestring: '123', boardSpec: ['', '', '', '', '', '', ''], correctCol: 3, messages },
  });
}

test('locale=es merges socratic message text and its matching audio', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lessons-'));
  writeTempLesson(dir, 'lesson-01-test.json', makeSocraticLesson({
    ask: [{
      text: 'Punish it', text_es: 'Castigalo',
      audio: '/audio/lessons/en.mp3', audio_es: '/audio/lessons/es.mp3',
      mood: 'think',
    }],
  }));
  loadLessons(dir);

  const es = getLesson('test-lesson-1', 'es');
  assert.equal(es.socratic.messages.ask[0].text, 'Castigalo');
  assert.equal(es.socratic.messages.ask[0].audio, '/audio/lessons/es.mp3', 'audio_es must collapse onto audio for getNarrationQueue');
  assert.equal(es.socratic.messages.ask[0].mood, 'think', 'non-localizable fields survive');
  assert.equal(es.socratic.messages.ask[0].text_es, undefined, 'all _es keys are stripped from the response');
  assert.equal(es.socratic.messages.ask[0].audio_es, undefined);

  const en = getLesson('test-lesson-1', 'en');
  assert.equal(en.socratic.messages.ask[0].text, 'Punish it');
  assert.equal(en.socratic.messages.ask[0].audio, '/audio/lessons/en.mp3');
});

test('socratic message falls back per field: text_es present, audio_es absent', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lessons-'));
  writeTempLesson(dir, 'lesson-01-test.json', makeSocraticLesson({
    ask: [{ text: 'Punish it', text_es: 'Castigalo', audio: '/audio/lessons/en.mp3' }],
  }));
  loadLessons(dir);

  const es = getLesson('test-lesson-1', 'es');
  assert.equal(es.socratic.messages.ask[0].text, 'Castigalo');
  assert.equal(es.socratic.messages.ask[0].audio, '/audio/lessons/en.mp3', 'a missing audio_es falls back to English rather than blanking narration');
});

test('es-only socratic message text_es (no text) does not inject an undefined key for locale=en', () => {
  // Mirrors the three es-only tests above: localizeLesson is exercised DIRECTLY on a bare
  // fixture, not through loadLessons. validateLesson requires a string `text` on any
  // socratic message it accepts from disk, so this shape cannot reach the loader — but
  // localizeLesson's undefined-key guard is a separate unit concern and must still hold.
  const fixture = {
    id: 'demo-es-only-socratic-msg',
    title: 'Es Only Socratic Message',
    slides: [{ infoProse: 'Hi' }],
    socratic: { messages: { ask: [{ text_es: 'Castigalo', mood: 'think' }] } },
  };
  const out = localizeLesson(fixture, 'en');
  assert.ok(!('text' in out.socratic.messages.ask[0]), 'text must not appear as undefined when only text_es exists');
  assert.ok(!('text_es' in out.socratic.messages.ask[0]));
  assert.equal(out.socratic.messages.ask[0].mood, 'think');
});

test('socratic: null survives localization untouched', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lessons-'));
  writeTempLesson(dir, 'lesson-01-test.json', makeValidLesson({ socratic: null }));
  loadLessons(dir);
  assert.equal(getLesson('test-lesson-1', 'es').socratic, null);
});

test('getLesson(id, "es") does not mutate the raw cache read by getLessonsAll()', () => {
  // localizeLesson must NEVER write into its input. stripEsKeys is a SHALLOW copy, so
  // socratic.messages on the stripped object is the SAME reference as the raw _lessons
  // entry's. An implementation that assigns s.messages[phase] = ... instead of rebuilding
  // a fresh container permanently deletes text_es from the raw cache — starving
  // generateLessonAudio(lang='es'), which reads getLessonsAll() on purpose, and persisting
  // the loss to disk on save. This is the only check that catches that.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lessons-'));
  writeTempLesson(dir, 'lesson-01-test.json', makeSocraticLesson({
    ask: [{ text: 'Punish it', text_es: 'Castigalo', mood: 'think' }],
  }));
  loadLessons(dir);

  const before = getLessonsAll().find(l => l.id === 'test-lesson-1');
  assert.equal(before.socratic.messages.ask[0].text_es, 'Castigalo', 'precondition');

  getLesson('test-lesson-1', 'es');

  const after = getLessonsAll().find(l => l.id === 'test-lesson-1');
  assert.equal(after.socratic.messages.ask[0].text_es, 'Castigalo', 'text_es must survive an es-locale read of the raw cache');
  assert.equal(after.socratic.messages.ask[0].text, 'Punish it', 'the English base must not be overwritten with Spanish');
});

test('validateLesson: socratic.messages shape', () => {
  assert.equal(validateLesson(makeSocraticLesson({ ask: [{ text: 'x', mood: 'think' }] })), null);
  // Permissive about ABSENT phases — an unmigrated/partial lesson must not vanish.
  assert.equal(validateLesson(makeSocraticLesson({})), null);
  assert.equal(validateLesson(makeValidLesson({ socratic: { movestring: '1', correctCol: 0 } })), null, 'messages may be absent entirely');
  assert.equal(validateLesson(makeValidLesson({ socratic: null })), null);

  assert.match(validateLesson(makeSocraticLesson([])), /socratic\.messages \(must be an object\)/);
  assert.match(validateLesson(makeSocraticLesson({ ask: 'nope' })), /socratic\.messages\.ask must be an array/);
  assert.match(validateLesson(makeSocraticLesson({ ask: ['nope'] })), /socratic\.messages\.ask\[0\] must be an object/);
  assert.match(validateLesson(makeSocraticLesson({ ask: [{ mood: 'think' }] })), /socratic\.messages\.ask\[0\]\.text must be a string/);
});
