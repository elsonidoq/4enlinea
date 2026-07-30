/**
 * TTS Provider — thin wrapper around OpenAI Text-to-Speech API.
 *
 * This file is the ONLY place that references OpenAI directly for TTS.
 * To swap TTS providers (e.g. ElevenLabs, Google Cloud TTS), replace
 * the implementation of `synthesizeRaw()`/`synthesizeStreamRaw()` without
 * changing any other file.
 *
 * Reads OPENAI_API_KEY from process.env (loaded by the caller via
 * Node --env-file or dotenv).
 *
 * ## Exactly one path that can *ship* a clip
 *
 * `synthesize(text, lang)` / `synthesizeStream(text, lang)` are the ONLY
 * functions the 5 production callers (server/index.js's generate,
 * generate-all, deep-reveal routes; server/lessonAudio.js; scripts/generate-tts.js)
 * may import. They resolve voice/model/speed/instructions internally from
 * `lang` via `resolveSynthesisConfig` — a caller cannot supply or omit them,
 * because there is no options parameter to supply them through.
 *
 * `synthesizeRaw(text, opts)` / `synthesizeStreamRaw(text, opts)` are a real
 * second path that CAN synthesize (used only by the admin preview sandbox,
 * POST /api/admin/audio/preview, to audition experimental params) but never
 * SHIPS a clip — no file, registry entry, or manifest row is ever written
 * from that endpoint. "Exactly one path that can ship a clip" — not
 * "exactly one path" — is the precise guarantee; see
 * specs/051-audio-verification-tts/contracts/tts-provider-contract.md.
 *
 * Both Raw and non-Raw paths refuse a legacy model (tts-1/tts-1-hd) that
 * cannot honor voice-style `instructions` — see ALLOWED_TTS_MODELS below.
 */

import { readTtsConfig } from './ttsConfig.mjs';
import { buildTtsInstructions } from './ttsInstructions.mjs';
import { SUPPORTED_LOCALES } from './locale.mjs';

/**
 * Models known to honor the `instructions` field. tts-1/tts-1-hd ignore it
 * and always speak with a baked-in American-English accent regardless of the
 * input text's language — this is the OI-32 failure mode. Intentionally a
 * private, non-exported constant — a second, independent layer of defense
 * from ttsConfig.mjs's VALID_TTS_MODELS (see research.md R2): even if a
 * legacy model somehow made it into tts-prompt.<lang>.json, synthesis itself
 * still refuses to use it.
 */
const ALLOWED_TTS_MODELS = ['gpt-4o-mini-tts'];

/**
 * Build the fetch request for OpenAI TTS. Shared by synthesizeRaw() and synthesizeStreamRaw().
 * @param {string} text
 * @param {{ voice?: string, model?: string, speed?: number, instructions?: string }} opts
 * @returns {Request} the fetch Request object ready to execute
 */
function buildTtsRequest(text, { voice = 'alloy', model = 'gpt-4o-mini-tts', speed = 1.0, instructions } = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  const body = { model, input: text, voice, speed, response_format: 'mp3' };
  if (instructions) body.instructions = instructions;

  return new Request('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

/**
 * Resolve the full synthesis config for a language: voice, model, speed, and
 * a non-empty, language-specific instructions string. Pure function — exported
 * solely as a test seam for the FR-029 regression test (see contract doc),
 * which needs to assert the legacy-model refusal without monkey-patching a
 * static ESM import.
 *
 * @param {string} lang - must be exactly 'en' or 'es' (SUPPORTED_LOCALES).
 * @param {{ readConfig?: (lang: string) => { prompt: string, speed: number, voice: string, model: string } }} [testSeam]
 *   `readConfig` is a TEST-ONLY DI seam (defaults to the real readTtsConfig from
 *   ttsConfig.mjs) — it lets the FR-029 regression test drive a fake legacy-model
 *   config through this function directly, without monkey-patching the statically
 *   imported readTtsConfig (which is not possible for a static ESM binding). No
 *   production caller passes this argument.
 * @returns {{ voice: string, model: string, speed: number, instructions: string }}
 * @throws {Error} on invalid/missing lang, empty/falsy instructions, or a
 *   model not in ALLOWED_TTS_MODELS.
 */
export function resolveSynthesisConfig(lang, { readConfig = readTtsConfig } = {}) {
  if (!SUPPORTED_LOCALES.includes(lang)) {
    throw new Error(`synthesize: invalid lang '${lang}' — must be one of: ${SUPPORTED_LOCALES.join(', ')}`);
  }

  const { prompt: basePrompt, speed, voice, model } = readConfig(lang);
  const instructions = buildTtsInstructions(basePrompt, lang);

  if (!instructions) {
    throw new Error(`synthesize: empty instructions resolved for lang=${lang} — refusing to ship an unstyled clip`);
  }

  if (!ALLOWED_TTS_MODELS.includes(model)) {
    throw new Error(`synthesize: model ${model} does not honor voice-style instructions — refused`);
  }

  console.log(`[ttsProvider] resolved lang=${lang} voice=${voice} speed=${speed} model=${model} instructionsChars=${instructions.length}`);

  return { voice, model, speed, instructions };
}

/**
 * Low-level primitive: synthesize speech from text using OpenAI TTS with
 * caller-supplied opts. Used ONLY by the admin preview sandbox
 * (POST /api/admin/audio/preview) — a deliberate, documented exception (see
 * module doc comment above). Accepts arbitrary voice/speed/instructions
 * (including empty instructions — auditioning "no style at all" is a
 * legitimate preview use case) but still refuses a legacy model.
 *
 * @param {string} text - The text to speak (max 4096 chars).
 * @param {{ voice?: string, model?: string, speed?: number, instructions?: string }} opts
 * @returns {Promise<Buffer>} MP3 audio data.
 */
export async function synthesizeRaw(text, opts = {}) {
  const { model = 'gpt-4o-mini-tts' } = opts;
  if (!ALLOWED_TTS_MODELS.includes(model)) {
    throw new Error(`synthesize: model ${model} does not honor voice-style instructions — refused`);
  }

  const response = await fetch(buildTtsRequest(text, opts));

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(
      `OpenAI TTS API error (${response.status}): ${errorBody.slice(0, 500)}`,
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Low-level streaming primitive, sibling to synthesizeRaw(). Same allow-list
 * refusal; used ONLY by the preview sandbox's streaming needs, if any exist.
 * Returns the raw fetch Response so the caller can pipe response.body.
 *
 * @param {string} text - The text to speak (max 4096 chars).
 * @param {{ voice?: string, model?: string, speed?: number, instructions?: string }} opts
 * @returns {Promise<Response>} The raw fetch Response with a readable .body stream.
 */
export async function synthesizeStreamRaw(text, opts = {}) {
  const { model = 'gpt-4o-mini-tts' } = opts;
  if (!ALLOWED_TTS_MODELS.includes(model)) {
    throw new Error(`synthesize: model ${model} does not honor voice-style instructions — refused`);
  }

  const response = await fetch(buildTtsRequest(text, opts));

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(
      `OpenAI TTS API error (${response.status}): ${errorBody.slice(0, 500)}`,
    );
  }

  return response;
}

/**
 * PRODUCTION entry point. The ONLY function the 5 non-preview callers may
 * import. Resolves voice/model/speed/instructions internally from `lang` —
 * there is no options parameter, so a caller cannot supply or omit them.
 *
 * @param {string} text - The text to speak (max 4096 chars).
 * @param {'en'|'es'} lang - REQUIRED. Invalid/missing lang rejects before any
 *   network call is made (this function is `async`, so `resolveSynthesisConfig`'s
 *   synchronous throw surfaces as a rejected promise — await it) — silent
 *   defaulting to 'en' is exactly the class of bug this closes (a caller that
 *   forgot to pass lang must fail loudly).
 * @returns {Promise<Buffer>} MP3 audio data.
 */
export async function synthesize(text, lang) {
  const { voice, model, speed, instructions } = resolveSynthesisConfig(lang);
  return synthesizeRaw(text, { voice, model, speed, instructions });
}

/**
 * Streaming sibling of synthesize(), used by GET /api/user/tts/deep-reveal.
 *
 * @param {string} text - The text to speak (max 4096 chars).
 * @param {'en'|'es'} lang - REQUIRED, same contract as synthesize().
 * @returns {Promise<Response>} The raw fetch Response with a readable .body stream.
 */
export async function synthesizeStream(text, lang) {
  const { voice, model, speed, instructions } = resolveSynthesisConfig(lang);
  return synthesizeStreamRaw(text, { voice, model, speed, instructions });
}
