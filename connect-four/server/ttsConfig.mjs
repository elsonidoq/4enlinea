/**
 * Shared TTS voice/prompt configuration — single source of truth for
 * server/tts-prompt.<lang>.json, used by both the admin coach-audio endpoints
 * (server/index.js) and the lesson audio pipeline (server/lessonAudio.js).
 *
 * The config is per-language: the voice instructions are written *in* the
 * target language and describe a language-specific persona, so English and
 * Spanish cannot share one file.
 *
 * Extracted from server/index.js so lessonAudio.js can read the same
 * voice/speed/model config without importing index.js (which would be
 * circular — index.js imports lessonAudio.js).
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const ttsPromptPath = (lang) => join(__dirname, `tts-prompt.${lang}.json`);

export const VALID_TTS_VOICES = ['alloy', 'ash', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer'];
// gpt-4o-mini-tts is the default: it's the only model that honors the `instructions`
// field (tts-1/tts-1-hd ignore it and always speak with a baked-in American-English
// accent, regardless of the input text's language).
export const VALID_TTS_MODELS = ['gpt-4o-mini-tts', 'tts-1', 'tts-1-hd'];
export const DEFAULT_TTS_MODEL = 'gpt-4o-mini-tts';

export function readTtsConfig(lang = 'en') {
  try {
    const data = JSON.parse(readFileSync(ttsPromptPath(lang), 'utf8'));
    return {
      prompt: data.prompt || '',
      speed: typeof data.speed === 'number' ? data.speed : 1.0,
      voice: VALID_TTS_VOICES.includes(data.voice) ? data.voice : 'alloy',
      model: VALID_TTS_MODELS.includes(data.model) ? data.model : DEFAULT_TTS_MODEL,
    };
  } catch {
    return { prompt: '', speed: 1.0, voice: 'alloy', model: DEFAULT_TTS_MODEL };
  }
}

export function writeTtsConfig(prompt, speed, voice, model, lang = 'en') {
  writeFileSync(ttsPromptPath(lang), JSON.stringify({ prompt, speed, voice, model }, null, 2) + '\n', 'utf8');
}
