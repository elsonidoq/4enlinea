import { parseMovestring, boardToSpec } from './movestring.js';

/**
 * Convert admin-editor lesson state into the lesson JSON payload sent to the
 * server (POST /api/admin/lessons or PUT /api/admin/lessons/:id).
 *
 * boardSpec is always re-derived from movestring (that derivation is the
 * whole point of this function's board fields). Every other authored field —
 * including `_es` sibling fields like `infoProse_es` / `goalPrompt_es` that
 * the editor UI doesn't yet expose — must survive the round trip unchanged.
 */
export function lessonToJsonPayload(lesson) {
  const { _idManuallyEdited, ...rest } = lesson;
  const convertBoard = (ms) => boardToSpec(parseMovestring(ms ?? ''));
  const challenges = rest.confirmationChallenges ?? [];
  return {
    ...rest,
    confirmationCount: challenges.length > 0 ? challenges.length : rest.confirmationCount,
    confirmationChallenges: challenges.length > 0 ? challenges : undefined,
    slides: rest.slides.map(slide => ({
      ...slide,                                   // preserve _es and any other authored field
      movestring: slide.movestring ?? '',
      boardSpec: convertBoard(slide.movestring),  // still derived — do not preserve a stale one
    })),
    socratic: rest.socratic ? {
      ...rest.socratic,                           // preserve goalPrompt_es et al
      movestring: rest.socratic.movestring ?? '',
      boardSpec: convertBoard(rest.socratic.movestring),
      overlays: rest.socratic.overlays ?? [],
      _boardInstructions: rest.socratic._boardInstructions ?? '',
    } : null,
  };
}
