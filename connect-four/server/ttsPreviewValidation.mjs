/**
 * Request validation for POST /api/admin/audio/preview (the TTS sandbox).
 *
 * Extracted from server/index.js so it can be unit-tested without booting the
 * server or holding an OPENAI_API_KEY. The endpoint is a *sandbox*: it writes
 * nothing (no mp3, no registry entry, no manifest, no config) — it validates,
 * synthesizes, and returns the bytes.
 *
 * Bounds mirror POST /api/admin/audio/prompt (speed 0.25–4.0) and
 * server/ttsConfig.mjs (VALID_TTS_VOICES / VALID_TTS_MODELS).
 */

import { VALID_TTS_VOICES, VALID_TTS_MODELS, DEFAULT_TTS_MODEL } from './ttsConfig.mjs';

export const MIN_TTS_SPEED = 0.25;
export const MAX_TTS_SPEED = 4.0;

/** OpenAI TTS input limit. */
export const MAX_TTS_TEXT_LENGTH = 4096;

/**
 * Validate a preview request body.
 *
 * @param {unknown} body - the parsed JSON request body
 * @returns {{ ok: true, value: { text: string, prompt: string, speed: number, voice: string, model: string } }
 *         | { ok: false, error: string }}
 */
export function validatePreviewRequest(body) {
  const b = body && typeof body === 'object' ? body : {};

  const { text, prompt, speed, voice, model } = b;

  if (typeof text !== 'string' || text.trim() === '') {
    return { ok: false, error: 'text is required and must be a non-empty string' };
  }
  if (text.length > MAX_TTS_TEXT_LENGTH) {
    return { ok: false, error: `text must be at most ${MAX_TTS_TEXT_LENGTH} characters` };
  }

  if (prompt !== undefined && typeof prompt !== 'string') {
    return { ok: false, error: 'prompt must be a string' };
  }

  const parsedSpeed = speed === undefined ? 1.0 : parseFloat(speed);
  if (!Number.isFinite(parsedSpeed) || parsedSpeed < MIN_TTS_SPEED || parsedSpeed > MAX_TTS_SPEED) {
    return { ok: false, error: `speed must be a number between ${MIN_TTS_SPEED} and ${MAX_TTS_SPEED}` };
  }

  if (!VALID_TTS_VOICES.includes(voice)) {
    return { ok: false, error: `voice must be one of: ${VALID_TTS_VOICES.join(', ')}` };
  }

  const resolvedModel = model === undefined ? DEFAULT_TTS_MODEL : model;
  if (!VALID_TTS_MODELS.includes(resolvedModel)) {
    return { ok: false, error: `model must be one of: ${VALID_TTS_MODELS.join(', ')}` };
  }

  return {
    ok: true,
    value: {
      text,
      prompt: typeof prompt === 'string' ? prompt : '',
      speed: parsedSpeed,
      voice,
      model: resolvedModel,
    },
  };
}
