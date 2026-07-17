// Bug: the admin lesson editor's en/es language toggle (`lang` state) and the
// "generate audios" button were disconnected — the button's fetch sent no body at
// all, so the server defaulted to lang='en' regardless of what the editor was
// showing. Toggling to Español and clicking "generate audios" silently generated
// ENGLISH clips.
//
// This test pins the actual request shape the button produces via the extracted
// `buildGenerateAudioRequest(lessonId, lang)` seam that `handleGenerateAudio` calls
// directly (see AdminLessonEditorScreen.jsx). This is NOT a full-component render —
// rendering the whole editor requires mocking LessonMetaForm/SlideEditor/
// SocraticEditor/PuzzlePickerModal's own network calls, which is out of scope for
// pinning the request body. The seam is the smallest honest place where "what lang
// does the button actually send" can be asserted without re-testing React wiring.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildGenerateAudioRequest } from '../../src/screens/AdminLessonEditorScreen.jsx';

test('generate-audio request includes lang: "es" when editor toggle is es', () => {
  const { url, init } = buildGenerateAudioRequest('lesson-123', 'es');
  assert.equal(url, '/api/admin/lessons/lesson-123/generate-audio');
  assert.equal(init.method, 'POST');
  assert.equal(init.headers['Content-Type'], 'application/json');
  const body = JSON.parse(init.body);
  assert.equal(body.lang, 'es');
});

test('generate-audio request includes lang: "en" when editor toggle is en', () => {
  const { url, init } = buildGenerateAudioRequest('lesson-123', 'en');
  assert.equal(url, '/api/admin/lessons/lesson-123/generate-audio');
  const body = JSON.parse(init.body);
  assert.equal(body.lang, 'en');
});
