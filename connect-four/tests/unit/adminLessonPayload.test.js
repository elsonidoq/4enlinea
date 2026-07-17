import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lessonToJsonPayload } from '../../src/lib/lessonPayload.js';

// Fixture modeled on a real lesson file (connect-four/lessons/lesson-01-immediate-threat.json),
// with _es sibling fields added per design decision D1 (server/lessonLoader.js#localizeLesson).
function makeLesson() {
  return {
    id: 'immediate-threat',
    title: 'Immediate Threats',
    free: true,
    userPerspective: 'yellow',
    order: 1,
    slides: [
      {
        movestring: '33201',
        coachMessages: [
          { text: 'Look at the board.', text_es: 'Mirá el tablero.', mood: 'think', audio: '/audio/lessons/a.mp3', audio_es: '/audio/lessons/a-es.mp3' },
        ],
        boardSpec: ['d', 'g', 'g', 'gd', '', '', ''],
        overlays: [{ c: 4, r: 0, type: 'tg' }],
        legendItems: [
          { type: 'tg', label: 'Threat square', label_es: 'Casilla de amenaza' },
        ],
        infoProse: 'An immediate threat is any four-cell window...',
        infoProse_es: 'Una amenaza inmediata es cualquier ventana de cuatro casillas...',
      },
    ],
    socratic: {
      _boardInstructions: 'Yellow has three discs stacked vertically...',
      movestring: '320101311201',
      boardSpec: ['ggg', 'dddgd', 'dd', 'gg', '', '', ''],
      overlays: [],
      correctCol: 0,
      goalPrompt: 'Find the winning move.',
      goalPrompt_es: 'Encontrá la jugada ganadora.',
    },
    confirmationCategory: 'immediate_threat',
    confirmationCount: 0,
    confirmationChallenges: [],
  };
}

test('lessonToJsonPayload: preserves _es fields on slides (infoProse_es, coachMessages[].text_es/audio_es, legendItems[].label_es)', () => {
  const payload = lessonToJsonPayload(makeLesson());
  const slide = payload.slides[0];
  assert.equal(slide.infoProse_es, 'Una amenaza inmediata es cualquier ventana de cuatro casillas...');
  assert.equal(slide.coachMessages[0].text_es, 'Mirá el tablero.');
  assert.equal(slide.coachMessages[0].audio_es, '/audio/lessons/a-es.mp3');
  assert.equal(slide.legendItems[0].label_es, 'Casilla de amenaza');
});

test('lessonToJsonPayload: preserves socratic.goalPrompt_es', () => {
  const payload = lessonToJsonPayload(makeLesson());
  assert.equal(payload.socratic.goalPrompt_es, 'Encontrá la jugada ganadora.');
});

test('lessonToJsonPayload: preserves pre-existing (non _es) socratic.goalPrompt too', () => {
  const payload = lessonToJsonPayload(makeLesson());
  assert.equal(payload.socratic.goalPrompt, 'Find the winning move.');
});

test('lessonToJsonPayload: still recomputes boardSpec from movestring (does not preserve stale boardSpec)', () => {
  const lesson = makeLesson();
  // Poison the stored boardSpec so we can prove it gets overwritten, not preserved.
  lesson.slides[0].boardSpec = ['STALE'];
  lesson.socratic.boardSpec = ['STALE'];
  const payload = lessonToJsonPayload(lesson);
  assert.notDeepEqual(payload.slides[0].boardSpec, ['STALE']);
  assert.deepEqual(payload.slides[0].boardSpec, ['d', 'g', 'g', 'gd', '', '', '']);
  assert.notDeepEqual(payload.socratic.boardSpec, ['STALE']);
  assert.deepEqual(payload.socratic.boardSpec, ['ggg', 'dddgd', 'dd', 'gg', '', '', '']);
});

test('lessonToJsonPayload: English-only fields (no _es) still round-trip unchanged', () => {
  const payload = lessonToJsonPayload(makeLesson());
  assert.equal(payload.slides[0].infoProse, 'An immediate threat is any four-cell window...');
  assert.equal(payload.slides[0].coachMessages[0].text, 'Look at the board.');
  assert.equal(payload.socratic.correctCol, 0);
});
