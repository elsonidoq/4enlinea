// Shared DEV-only parser for the ?devBoard=... deep-link params. One param contract used by both
// the Challenge deep-link (ChallengeScreen) and the sparring cold-boot (App.jsx), so the format
// never diverges.
//
// parseDevBoardSearch is pure (always parses) and unit-testable in node. readDevBoardParam is the
// DEV-gated wrapper: `import.meta.env?.DEV` is truthy only in a Vite dev build and is undefined in
// node (optional chaining → null), so this whole feature is inert in production and under test.

export function parseDevBoardSearch(search) {
  const params = new URLSearchParams(search || '');
  const movestring = params.get('devBoard');
  if (!movestring) return null;

  let highlightMetadata;
  const rawMeta = params.get('devMeta');
  if (rawMeta) {
    try {
      highlightMetadata = JSON.parse(rawMeta);
    } catch {
      // Fail-closed: a malformed devMeta is treated as absent (verdict reads "wrong"), never a throw.
      console.warn('[devBoardParam] malformed devMeta JSON — ignoring');
      highlightMetadata = undefined;
    }
  }

  const rawCol = params.get('devCorrectCol');
  const parsedCol = rawCol != null && rawCol !== '' ? Number.parseInt(rawCol, 10) : NaN;

  return {
    movestring,
    correctCol: Number.isInteger(parsedCol) ? parsedCol : undefined,
    highlightMetadata,
    side: params.get('devSide') ?? undefined,
    difficulty: params.get('devDifficulty') ?? undefined,
  };
}

export function readDevBoardParam(
  search = (typeof window !== 'undefined' ? window.location.search : ''),
) {
  if (!import.meta.env?.DEV) return null;
  return parseDevBoardSearch(search);
}
