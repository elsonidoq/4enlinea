// Unit tests for server/lessonAudio.js — spec 046 User Story 4 (T023)
//
// Run with: node --test connect-four/tests/unit/lessonAudio.test.js
//
// Uses a stub `synthesize` (no real OpenAI call) and a per-test temp directory
// (via the `dir` test-only seam on generateLessonAudio/pruneOrphanedLessonAudio)
// so runs never touch the real public/audio/lessons/.

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Buffer } from 'node:buffer';
import {
  hashMessageText,
  generateLessonAudio,
  pruneOrphanedLessonAudio,
  collectReferencedAudio,
} from '../../server/lessonAudio.js';

function makeStubSynthesize({ failFor = [] } = {}) {
  const calls = [];
  const fn = async (text, opts) => {
    calls.push({ text, opts });
    if (failFor.includes(text)) throw new Error(`synthesis failed for: ${text}`);
    return Buffer.from(`fake-mp3:${text}`);
  };
  fn.calls = calls;
  return fn;
}

function makeLesson(overrides = {}) {
  return {
    id: 'test-lesson',
    title: 'Test lesson',
    slides: [
      {
        movestring: '',
        coachMessages: [{ text: 'Hello there', mood: 'happy' }],
      },
    ],
    socratic: null,
    ...overrides,
  };
}

let tmpDir;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lessonAudio-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('hashMessageText', () => {
  it('is stable for the same text', () => {
    assert.equal(hashMessageText('hello world'), hashMessageText('hello world'));
  });

  it('is distinct for different text', () => {
    assert.notEqual(hashMessageText('hello world'), hashMessageText('hello there'));
  });

  it('returns a 16-char hex string', () => {
    const h = hashMessageText('anything');
    assert.equal(h.length, 16);
    assert.ok(/^[0-9a-f]{16}$/.test(h));
  });
});

describe('generateLessonAudio', () => {
  it('synthesizes a new message and sets audio path', async () => {
    const lesson = makeLesson();
    const synthesize = makeStubSynthesize();
    const result = await generateLessonAudio(lesson, { synthesize, dir: tmpDir });

    const hash = hashMessageText('Hello there');
    assert.equal(result.lesson.slides[0].coachMessages[0].audio, `/audio/lessons/${hash}.mp3`);
    assert.deepEqual(result.generated, ['slides[0].coachMessages[0]']);
    assert.deepEqual(result.failed, []);
    assert.ok(fs.existsSync(path.join(tmpDir, `${hash}.mp3`)));
    assert.equal(synthesize.calls.length, 1);
  });

  it('skips a message whose audio already matches the current text hash (no stub call)', async () => {
    const hash = hashMessageText('Hello there');
    const lesson = makeLesson({
      slides: [
        {
          movestring: '',
          coachMessages: [{ text: 'Hello there', mood: 'happy', audio: `/audio/lessons/${hash}.mp3` }],
        },
      ],
    });
    const synthesize = makeStubSynthesize();
    const result = await generateLessonAudio(lesson, { synthesize, dir: tmpDir });

    assert.equal(synthesize.calls.length, 0, 'synthesize should not have been called');
    assert.deepEqual(result.generated, []);
    assert.equal(result.lesson.slides[0].coachMessages[0].audio, `/audio/lessons/${hash}.mp3`);
  });

  it('regenerates a message whose audio points at a stale hash (text changed)', async () => {
    const lesson = makeLesson({
      slides: [
        {
          movestring: '',
          coachMessages: [{ text: 'New text', mood: 'happy', audio: '/audio/lessons/deadbeefdeadbeef.mp3' }],
        },
      ],
    });
    const synthesize = makeStubSynthesize();
    const result = await generateLessonAudio(lesson, { synthesize, dir: tmpDir });

    const newHash = hashMessageText('New text');
    assert.equal(synthesize.calls.length, 1);
    assert.equal(result.lesson.slides[0].coachMessages[0].audio, `/audio/lessons/${newHash}.mp3`);
    assert.deepEqual(result.generated, ['slides[0].coachMessages[0]']);
  });

  it('isolates a per-message synthesis failure: other messages complete, failing one is left unset', async () => {
    const lesson = makeLesson({
      slides: [
        {
          movestring: '',
          coachMessages: [
            { text: 'Will fail', mood: 'happy' },
            { text: 'Will succeed', mood: 'happy' },
          ],
        },
      ],
    });
    const synthesize = makeStubSynthesize({ failFor: ['Will fail'] });
    const result = await generateLessonAudio(lesson, { synthesize, dir: tmpDir });

    assert.equal(result.lesson.slides[0].coachMessages[0].audio, undefined);
    assert.ok(result.lesson.slides[0].coachMessages[1].audio);
    assert.equal(result.failed.length, 1);
    assert.equal(result.failed[0].locator, 'slides[0].coachMessages[0]');
    assert.match(result.failed[0].error, /Will fail/);
    assert.deepEqual(result.generated, ['slides[0].coachMessages[1]']);
  });

  it('skips empty/whitespace-only text (no stub call)', async () => {
    const lesson = makeLesson({
      slides: [
        {
          movestring: '',
          coachMessages: [
            { text: '', mood: 'happy' },
            { text: '   ', mood: 'happy' },
          ],
        },
      ],
    });
    const synthesize = makeStubSynthesize();
    const result = await generateLessonAudio(lesson, { synthesize, dir: tmpDir });

    assert.equal(synthesize.calls.length, 0);
    assert.deepEqual(result.generated, []);
    assert.deepEqual(result.failed, []);
  });

  it('never touches lesson.socratic', async () => {
    const lesson = makeLesson({
      socratic: { movestring: '123', correctCol: 3 },
    });
    const synthesize = makeStubSynthesize();
    const result = await generateLessonAudio(lesson, { synthesize, dir: tmpDir });

    assert.deepEqual(result.lesson.socratic, { movestring: '123', correctCol: 3 });
  });

  it('lang=es reads text_es and writes audio_es, leaving audio/text untouched', async () => {
    const lesson = makeLesson({
      slides: [
        {
          movestring: '',
          coachMessages: [{ text: 'Hello there', text_es: 'Hola', mood: 'happy' }],
        },
      ],
    });
    const synthesize = makeStubSynthesize();
    const result = await generateLessonAudio(lesson, { lang: 'es', synthesize, dir: tmpDir });

    const hash = hashMessageText('Hola');
    const message = result.lesson.slides[0].coachMessages[0];
    assert.equal(message.audio_es, `/audio/lessons/${hash}.mp3`);
    assert.equal(message.audio, undefined, 'lang=en audio field must not be written for an es pass');
    assert.equal(synthesize.calls.length, 1);
    assert.equal(synthesize.calls[0].text, 'Hola');
    assert.ok(fs.existsSync(path.join(tmpDir, `${hash}.mp3`)));
  });

  it('lang=es skips a message with no text_es (untranslated message generates nothing)', async () => {
    const lesson = makeLesson({
      slides: [
        {
          movestring: '',
          coachMessages: [{ text: 'Hello there', mood: 'happy' }],
        },
      ],
    });
    const synthesize = makeStubSynthesize();
    const result = await generateLessonAudio(lesson, { lang: 'es', synthesize, dir: tmpDir });

    assert.equal(synthesize.calls.length, 0);
    assert.deepEqual(result.generated, []);
    assert.equal(result.lesson.slides[0].coachMessages[0].audio_es, undefined);
  });

  it('lang=es skips regeneration when audio_es already matches the current text_es hash', async () => {
    const hash = hashMessageText('Hola');
    const lesson = makeLesson({
      slides: [
        {
          movestring: '',
          coachMessages: [{ text: 'Hello there', text_es: 'Hola', audio_es: `/audio/lessons/${hash}.mp3` }],
        },
      ],
    });
    const synthesize = makeStubSynthesize();
    const result = await generateLessonAudio(lesson, { lang: 'es', synthesize, dir: tmpDir });

    assert.equal(synthesize.calls.length, 0);
    assert.deepEqual(result.generated, []);
  });

  it('passes TTS instructions/voice/speed/model opts to synthesize (not called bare)', async () => {
    const lesson = makeLesson();
    const synthesize = makeStubSynthesize();
    await generateLessonAudio(lesson, { synthesize, dir: tmpDir });

    assert.equal(synthesize.calls.length, 1);
    const opts = synthesize.calls[0].opts;
    assert.ok(opts && typeof opts === 'object', 'synthesize must receive an opts object, not be called bare');
    assert.ok('voice' in opts && 'speed' in opts && 'model' in opts, 'opts must carry voice/speed/model from readTtsConfig()');
  });
});

describe('pruneOrphanedLessonAudio', () => {
  it('returns exactly the unreferenced files and deletes them', () => {
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'referenced1.mp3'), 'a');
    fs.writeFileSync(path.join(tmpDir, 'orphan1.mp3'), 'b');
    fs.writeFileSync(path.join(tmpDir, 'orphan2.mp3'), 'c');

    const lessons = [
      makeLesson({
        slides: [
          { movestring: '', coachMessages: [{ text: 'x', audio: '/audio/lessons/referenced1.mp3' }] },
        ],
      }),
    ];

    const deleted = pruneOrphanedLessonAudio(lessons, tmpDir);

    assert.deepEqual(deleted.sort(), ['orphan1.mp3', 'orphan2.mp3']);
    assert.ok(fs.existsSync(path.join(tmpDir, 'referenced1.mp3')));
    assert.ok(!fs.existsSync(path.join(tmpDir, 'orphan1.mp3')));
    assert.ok(!fs.existsSync(path.join(tmpDir, 'orphan2.mp3')));
  });

  it('returns an empty array when nothing is orphaned', () => {
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'referenced1.mp3'), 'a');
    const lessons = [
      makeLesson({
        slides: [
          { movestring: '', coachMessages: [{ text: 'x', audio: '/audio/lessons/referenced1.mp3' }] },
        ],
      }),
    ];
    assert.deepEqual(pruneOrphanedLessonAudio(lessons, tmpDir), []);
  });

  it('returns an empty array when the directory does not exist', () => {
    const missingDir = path.join(tmpDir, 'does-not-exist');
    assert.deepEqual(pruneOrphanedLessonAudio([], missingDir), []);
  });

  it('treats a referenced audio_es clip as referenced, not orphaned', () => {
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'en1.mp3'), 'a');
    fs.writeFileSync(path.join(tmpDir, 'es1.mp3'), 'b');
    fs.writeFileSync(path.join(tmpDir, 'orphan.mp3'), 'c');

    const lessons = [
      makeLesson({
        slides: [
          {
            movestring: '',
            coachMessages: [{
              text: 'x', audio: '/audio/lessons/en1.mp3',
              text_es: 'y', audio_es: '/audio/lessons/es1.mp3',
            }],
          },
        ],
      }),
    ];

    const deleted = pruneOrphanedLessonAudio(lessons, tmpDir);

    assert.deepEqual(deleted, ['orphan.mp3']);
    assert.ok(fs.existsSync(path.join(tmpDir, 'en1.mp3')));
    assert.ok(fs.existsSync(path.join(tmpDir, 'es1.mp3')));
  });
});

describe('collectReferencedAudio', () => {
  it('collects BOTH en and es audio as referenced', () => {
    const lessons = [{
      slides: [{ coachMessages: [
        { text: 'hi', audio: '/audio/lessons/aaa.mp3', text_es: 'hola', audio_es: '/audio/lessons/bbb.mp3' },
      ] }],
    }];
    const refs = collectReferencedAudio(lessons);
    assert.ok(refs.has('aaa.mp3'), 'English clip must be referenced');
    assert.ok(refs.has('bbb.mp3'), 'Spanish clip must be referenced — else prune deletes every es clip');
  });

  it('tolerates a message with no es audio', () => {
    const lessons = [{ slides: [{ coachMessages: [{ text: 'hi', audio: '/audio/lessons/aaa.mp3' }] }] }];
    const refs = collectReferencedAudio(lessons);
    assert.deepStrictEqual([...refs], ['aaa.mp3']);
  });
});
