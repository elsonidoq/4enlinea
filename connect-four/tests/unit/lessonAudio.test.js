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
  collectMessages,
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

  it('regenerates even when audio already matches the current text hash', async () => {
    // The voice/prompt/speed/model are not in the hash, so a hash match says
    // nothing about whether the clip still sounds right. "Generate audios" must
    // re-voice on demand — see the note on generateLessonAudio.
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

    assert.equal(synthesize.calls.length, 1, 'synthesize must be called despite the hash matching');
    assert.deepEqual(result.generated, ['slides[0].coachMessages[0]']);
    // Same text -> same hash -> same path: overwritten in place, no orphan.
    assert.equal(result.lesson.slides[0].coachMessages[0].audio, `/audio/lessons/${hash}.mp3`);
  });

  it('regenerates a message whose mp3 is missing from disk (self-heals silent audio)', async () => {
    // The old skip never checked the filesystem, so a lesson whose mp3 vanished
    // stayed silent forever and no button could fix it.
    const hash = hashMessageText('Hello there');
    const lesson = makeLesson({
      slides: [
        {
          movestring: '',
          coachMessages: [{ text: 'Hello there', audio: `/audio/lessons/${hash}.mp3` }],
        },
      ],
    });
    assert.equal(fs.existsSync(path.join(tmpDir, `${hash}.mp3`)), false, 'precondition: mp3 absent');

    const synthesize = makeStubSynthesize();
    await generateLessonAudio(lesson, { synthesize, dir: tmpDir });

    assert.equal(fs.existsSync(path.join(tmpDir, `${hash}.mp3`)), true, 'the missing mp3 must be recreated');
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

  it('generates audio for socratic.messages', async () => {
    // Inverts the old 'never touches lesson.socratic' lock: Socratic copy is now
    // lesson content and must be voiced by the same pipeline as concept slides.
    const lesson = makeLesson({
      socratic: {
        movestring: '123',
        correctCol: 3,
        messages: {
          ask: [{ text: 'Punish it', mood: 'think' }],
          correct: [{ text: 'You saw it', mood: 'happy' }],
        },
      },
    });
    const synthesize = makeStubSynthesize();
    const result = await generateLessonAudio(lesson, { synthesize, dir: tmpDir });

    const askHash = hashMessageText('Punish it');
    assert.equal(result.lesson.socratic.messages.ask[0].audio, `/audio/lessons/${askHash}.mp3`);
    assert.ok(fs.existsSync(path.join(tmpDir, `${askHash}.mp3`)));
    // Slides first, then socratic in fixed phase order (ask before correct) — not Object.keys.
    assert.deepEqual(result.generated, [
      'slides[0].coachMessages[0]',
      'socratic.messages.ask[0]',
      'socratic.messages.correct[0]',
    ]);
    assert.deepEqual(result.failed, []);
  });

  it('socratic: null generates nothing and throws nothing (lesson 4 shape)', async () => {
    const lesson = makeLesson({ socratic: null });
    const synthesize = makeStubSynthesize();
    const result = await generateLessonAudio(lesson, { synthesize, dir: tmpDir });

    assert.deepEqual(result.generated, ['slides[0].coachMessages[0]']);
    assert.deepEqual(result.failed, []);
    assert.equal(result.lesson.socratic, null);
  });

  it('tolerates socratic without messages, and a non-array phase value', async () => {
    const lesson = makeLesson({
      socratic: { movestring: '123', correctCol: 3 },
    });
    const synthesize = makeStubSynthesize();
    await generateLessonAudio(lesson, { synthesize, dir: tmpDir });

    const lesson2 = makeLesson({
      socratic: { movestring: '123', correctCol: 3, messages: { ask: 'not an array' } },
    });
    const result2 = await generateLessonAudio(lesson2, { synthesize, dir: tmpDir });
    assert.deepEqual(result2.generated, ['slides[0].coachMessages[0]']);
  });

  it('lang=es reads text_es and writes audio_es for socratic messages', async () => {
    const lesson = makeLesson({
      slides: [{ movestring: '', coachMessages: [] }],
      socratic: {
        movestring: '123',
        correctCol: 3,
        messages: {
          ask: [{ text: 'Punish it', text_es: 'Castigalo', mood: 'think' }],
        },
      },
    });
    const synthesize = makeStubSynthesize();
    const result = await generateLessonAudio(lesson, { lang: 'es', synthesize, dir: tmpDir });

    const hash = hashMessageText('Castigalo');
    const message = result.lesson.socratic.messages.ask[0];
    assert.equal(message.audio_es, `/audio/lessons/${hash}.mp3`);
    assert.equal(message.audio, undefined, 'an es pass must not write the en audio field');
    assert.deepEqual(result.generated, ['socratic.messages.ask[0]']);
    assert.equal(synthesize.calls[0].text, 'Castigalo');
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

  it('lang=es regenerates even when audio_es already matches the current text_es hash', async () => {
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

    assert.equal(synthesize.calls.length, 1, 're-voicing a Spanish clip must not be skipped');
    assert.deepEqual(result.generated, ['slides[0].coachMessages[0]']);
    // Only the es side is touched — the English clip is not regenerated.
    assert.equal(synthesize.calls[0].text, 'Hola');
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

  it('does not delete a clip referenced only by socratic.messages', () => {
    // The trap this plan exists to prevent: generateLessonAudio and
    // collectReferencedAudio walking the lesson tree independently. A socratic
    // clip that generate writes but collect never sees is an orphan on the next
    // prune run and gets deleted. Same failure class as the audio_es scar above.
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'soc1.mp3'), 'a');
    fs.writeFileSync(path.join(tmpDir, 'orphan.mp3'), 'b');

    const lessons = [
      makeLesson({
        slides: [{ movestring: '', coachMessages: [] }],
        socratic: {
          movestring: '123',
          correctCol: 3,
          messages: {
            ask: [{ text: 'I am going to make a mistake here.', mood: 'think', audio: '/audio/lessons/soc1.mp3' }],
          },
        },
      }),
    ];

    const deleted = pruneOrphanedLessonAudio(lessons, tmpDir);

    assert.deepEqual(deleted, ['orphan.mp3']);
    assert.ok(fs.existsSync(path.join(tmpDir, 'soc1.mp3')), 'the socratic clip must survive the prune');
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

  it('collects a socratic-only clip (both en and es) as referenced', () => {
    const lessons = [{
      slides: [],
      socratic: {
        messages: {
          ask: [{ text: 'hi', audio: '/audio/lessons/soc-en.mp3', text_es: 'hola', audio_es: '/audio/lessons/soc-es.mp3' }],
        },
      },
    }];
    const refs = collectReferencedAudio(lessons);
    assert.ok(refs.has('soc-en.mp3'), 'socratic English clip must be referenced');
    assert.ok(refs.has('soc-es.mp3'), 'socratic Spanish clip must be referenced');
  });
});

describe('collectMessages', () => {
  it('yields slides before socratic, with byte-identical slide locators', () => {
    const lesson = makeLesson({
      slides: [{ movestring: '', coachMessages: [{ text: 'a' }, { text: 'b' }] }],
      socratic: { messages: { hint: [{ text: 'h' }], ask: [{ text: 'q' }] } },
    });
    // Fixed phase order (ask before hint) regardless of the JSON's key order.
    assert.deepEqual(collectMessages(lesson).map((e) => e.locator), [
      'slides[0].coachMessages[0]',
      'slides[0].coachMessages[1]',
      'socratic.messages.ask[0]',
      'socratic.messages.hint[0]',
    ]);
  });

  it('tolerates socratic: null, absent messages, and a non-array phase', () => {
    assert.deepEqual(collectMessages(makeLesson({ socratic: null })).map((e) => e.locator), ['slides[0].coachMessages[0]']);
    assert.deepEqual(collectMessages(makeLesson({ socratic: {} })).map((e) => e.locator), ['slides[0].coachMessages[0]']);
    assert.deepEqual(
      collectMessages(makeLesson({ socratic: { messages: { ask: null } } })).map((e) => e.locator),
      ['slides[0].coachMessages[0]'],
    );
  });
});
