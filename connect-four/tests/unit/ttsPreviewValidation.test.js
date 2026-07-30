import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePreviewRequest, MAX_TTS_TEXT_LENGTH } from '../../server/ttsPreviewValidation.mjs';

const base = { text: 'hola', prompt: 'warm coach', speed: 1.0, voice: 'alloy', model: 'gpt-4o-mini-tts' };

test('happy path: returns ok with the normalized value', () => {
  const r = validatePreviewRequest(base);
  assert.equal(r.ok, true);
  assert.deepEqual(r.value, { text: 'hola', prompt: 'warm coach', speed: 1.0, voice: 'alloy', model: 'gpt-4o-mini-tts' });
});

test('missing text is rejected', () => {
  const r = validatePreviewRequest({ ...base, text: undefined });
  assert.equal(r.ok, false);
  assert.match(r.error, /text is required/);
});

test('empty text is rejected', () => {
  assert.equal(validatePreviewRequest({ ...base, text: '' }).ok, false);
});

test('whitespace-only text is rejected', () => {
  assert.equal(validatePreviewRequest({ ...base, text: '   \n\t ' }).ok, false);
});

test('non-string text is rejected', () => {
  assert.equal(validatePreviewRequest({ ...base, text: 42 }).ok, false);
});

test('text over the OpenAI 4096-char limit is rejected', () => {
  assert.equal(validatePreviewRequest({ ...base, text: 'a'.repeat(MAX_TTS_TEXT_LENGTH + 1) }).ok, false);
  assert.equal(validatePreviewRequest({ ...base, text: 'a'.repeat(MAX_TTS_TEXT_LENGTH) }).ok, true);
});

test('bad voice is rejected', () => {
  const r = validatePreviewRequest({ ...base, voice: 'darth-vader' });
  assert.equal(r.ok, false);
  assert.match(r.error, /voice must be one of/);
});

test('missing voice is rejected (no default)', () => {
  assert.equal(validatePreviewRequest({ ...base, voice: undefined }).ok, false);
});

test('bad model is rejected', () => {
  const r = validatePreviewRequest({ ...base, model: 'tts-9000' });
  assert.equal(r.ok, false);
  assert.match(r.error, /model must be one of/);
});

test('missing model defaults to gpt-4o-mini-tts', () => {
  const r = validatePreviewRequest({ ...base, model: undefined });
  assert.equal(r.ok, true);
  assert.equal(r.value.model, 'gpt-4o-mini-tts');
});

// FR-028 (spec 051 US5): legacy tts-1/tts-1-hd were removed from
// VALID_TTS_MODELS entirely — they ignore voice-style `instructions` and
// always speak with a baked-in American-English accent — so this preview
// sandbox validator now rejects them too, same as the config editor.
// server/ttsProvider.js's low-level Raw synthesis primitive independently
// refuses them again at synthesis time (defense in depth), but this
// validator is the first gate.
test('legacy models are rejected (FR-028)', () => {
  const r = validatePreviewRequest({ ...base, model: 'tts-1-hd' });
  assert.equal(r.ok, false);
  assert.match(r.error, /model must be one of/);

  const r2 = validatePreviewRequest({ ...base, model: 'tts-1' });
  assert.equal(r2.ok, false);
});

test('speed below 0.25 is rejected', () => {
  const r = validatePreviewRequest({ ...base, speed: 0.1 });
  assert.equal(r.ok, false);
  assert.match(r.error, /speed must be a number between 0.25 and 4/);
});

test('speed above 4.0 is rejected', () => {
  assert.equal(validatePreviewRequest({ ...base, speed: 4.1 }).ok, false);
});

test('non-numeric speed is rejected', () => {
  assert.equal(validatePreviewRequest({ ...base, speed: 'fast' }).ok, false);
});

test('speed boundaries are inclusive', () => {
  assert.equal(validatePreviewRequest({ ...base, speed: 0.25 }).ok, true);
  assert.equal(validatePreviewRequest({ ...base, speed: 4.0 }).ok, true);
});

test('numeric-string speed is parsed', () => {
  const r = validatePreviewRequest({ ...base, speed: '1.25' });
  assert.equal(r.ok, true);
  assert.equal(r.value.speed, 1.25);
});

test('missing speed defaults to 1.0', () => {
  const r = validatePreviewRequest({ ...base, speed: undefined });
  assert.equal(r.ok, true);
  assert.equal(r.value.speed, 1.0);
});

test('non-string prompt is rejected', () => {
  const r = validatePreviewRequest({ ...base, prompt: { a: 1 } });
  assert.equal(r.ok, false);
  assert.match(r.error, /prompt must be a string/);
});

test('missing prompt defaults to empty string', () => {
  const r = validatePreviewRequest({ ...base, prompt: undefined });
  assert.equal(r.ok, true);
  assert.equal(r.value.prompt, '');
});

test('non-object body is rejected without throwing', () => {
  assert.equal(validatePreviewRequest(undefined).ok, false);
  assert.equal(validatePreviewRequest(null).ok, false);
  assert.equal(validatePreviewRequest('nope').ok, false);
});
