/**
 * Pure helper for lesson concept-slide narration (spec 046 US3).
 *
 * Derives the ordered list of audio paths to play for a concept slide's
 * `coachMessages[]`, given the current global speech-enabled toggle.
 */

/**
 * @param {Array<{audio?: string|null}>} coachMessages
 * @param {boolean} speechEnabled
 * @returns {string[]} ordered list of non-empty `audio` paths to play, in message order
 */
export function getNarrationQueue(coachMessages, speechEnabled) {
  if (!speechEnabled) return [];
  if (!Array.isArray(coachMessages)) return [];

  return coachMessages
    .map((m) => m?.audio)
    .filter((audio) => typeof audio === 'string' && audio.trim().length > 0);
}
