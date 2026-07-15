/**
 * Per-language TTS instructions helper.
 *
 * `gpt-4o-mini-tts` honors the `instructions` field (unlike `tts-1`/`tts-1-hd`,
 * which ignore it and always speak with a baked-in American-English accent).
 * For Spanish text, the coaching-voice prompt alone is not enough — the model
 * still defaults to an English-accented reading unless explicitly told to use
 * a Spanish accent. This helper appends that directive for Spanish requests.
 */

/**
 * Directive appended to the coaching-voice prompt for Spanish TTS requests.
 * Tells the model to use a native Rioplatense/Latin-American Spanish accent
 * instead of defaulting to an English-accented reading of the Spanish text.
 */
export const SPANISH_ACCENT_DIRECTIVE =
  'Speak in natural, native Latin American Spanish with a Rioplatense (Argentine) flavor. ' +
  'Do NOT use an English or American accent; pronounce every word as a native Spanish speaker would.';

/**
 * Build the `instructions` string to send to the TTS model for a given language.
 *
 * @param {string} basePrompt - The shared coaching-voice prompt (may be empty/whitespace).
 * @param {string} lang - Language code ('en', 'es', or anything else — treated as 'en').
 * @returns {string} The instructions to pass to the TTS API.
 */
export function buildTtsInstructions(basePrompt, lang) {
  const base = typeof basePrompt === 'string' ? basePrompt.trim() : '';

  if (lang !== 'es') {
    return base;
  }

  return base ? `${base}\n\n${SPANISH_ACCENT_DIRECTIVE}` : SPANISH_ACCENT_DIRECTIVE;
}
