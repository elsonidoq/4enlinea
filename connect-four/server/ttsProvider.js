/**
 * TTS Provider — thin wrapper around OpenAI Text-to-Speech API.
 *
 * This file is the ONLY place that references OpenAI directly for TTS.
 * To swap TTS providers (e.g. ElevenLabs, Google Cloud TTS), replace
 * the implementation of `synthesize()` without changing any other file.
 *
 * Reads OPENAI_API_KEY from process.env (loaded by the caller via
 * Node --env-file or dotenv).
 */

/**
 * Build the fetch request for OpenAI TTS. Shared by synthesize() and synthesizeStream().
 * @param {string} text
 * @param {{ voice?: string, model?: string, speed?: number, instructions?: string }} opts
 * @returns {Request} the fetch Request object ready to execute
 */
function buildTtsRequest(text, { voice = 'alloy', model = 'tts-1', speed = 1.0, instructions } = {}) {
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
 * Synthesize speech from text using OpenAI TTS.
 *
 * @param {string} text - The text to speak (max 4096 chars).
 * @param {{ voice?: string, model?: string, speed?: number, instructions?: string }} opts
 * @param {string} [opts.voice='alloy'] - OpenAI voice id (alloy, echo, fable, onyx, nova, shimmer).
 * @param {string} [opts.model='tts-1'] - Model name (tts-1 = standard, tts-1-hd = high-definition).
 * @param {number} [opts.speed=1.0] - Playback speed (0.25 to 4.0).
 * @returns {Promise<Buffer>} MP3 audio data.
 */
export async function synthesize(text, opts = {}) {
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
 * Synthesize speech from text using OpenAI streaming TTS.
 * Returns the raw fetch Response so the caller can pipe response.body
 * to an HTTP response while also collecting chunks for caching.
 *
 * @param {string} text - The text to speak (max 4096 chars).
 * @param {{ voice?: string, model?: string, speed?: number, instructions?: string }} opts
 * @returns {Promise<Response>} The raw fetch Response with a readable .body stream.
 */
export async function synthesizeStream(text, opts = {}) {
  const response = await fetch(buildTtsRequest(text, opts));

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(
      `OpenAI TTS API error (${response.status}): ${errorBody.slice(0, 500)}`,
    );
  }

  return response;
}
