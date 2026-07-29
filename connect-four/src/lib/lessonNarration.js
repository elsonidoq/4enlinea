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

/**
 * Full narration queue for a concept slide: the coach bubbles first, then the
 * info-prose clip. The order is the product requirement — the coach speaks the
 * bubble and then reads the prose.
 *
 * SocraticScreen keeps calling getNarrationQueue directly (it has no infoProse),
 * so that function's contract is unchanged.
 *
 * @param {{coachMessages?: Array<{audio?: string|null}>, infoProseAudio?: string|null}} slide
 * @param {boolean} speechEnabled
 * @returns {string[]} ordered audio paths to play
 */
export function getSlideNarrationQueue(slide, speechEnabled) {
  if (!speechEnabled) return [];

  const queue = getNarrationQueue(slide?.coachMessages, speechEnabled);

  const prose = slide?.infoProseAudio;
  if (typeof prose === 'string' && prose.trim().length > 0) queue.push(prose);

  return queue;
}
