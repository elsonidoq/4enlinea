// Fix 1 (2026-08-04). Coach speech must follow MESSAGES, not `coachMessages.length`.
//
// The old GameScreen effect was `useEffect(() => { if (lastCoachKeyRef.current)
// speakCoachMessage(lastCoachKeyRef.current); }, [coachMessages.length])`, with `useGameBoard`
// holding only the most recent key in one ref. Three verified consequences:
//   - a replace-mode update (array 1 -> 1) never fired the effect: that bubble was silent;
//   - two updates batched by React fired it once, so only the last key was ever spoken;
//   - restoring the pre-hint snapshot shrank the array and re-fired it on a stale key.
//
// Every coach message now carries its own `key` and a monotonic `seq`, and the screen keeps a
// cursor. This module is that cursor, extracted as a pure function because `node --test` cannot
// parse JSX and this is the part worth testing (see docs/architecture/testing-conventions.md,
// "Pure Function Extraction Pattern").

/**
 * Pick the coach keys that have not been spoken yet.
 *
 * @param {Array<{key?: string|null, seq?: number}>} messages - the current coach message list
 * @param {number} lastSpokenSeq - the highest `seq` already handed to speakCoachMessage
 * @returns {{keys: string[], nextSeq: number}} keys in message order, and the cursor to store.
 *   `nextSeq` is monotonic: it never goes below `lastSpokenSeq`, so restoring an older snapshot
 *   (the hint toggle-OFF path) cannot rewind the cursor and replay old clips.
 */
export function selectUnspokenKeys(messages, lastSpokenSeq) {
  const list = Array.isArray(messages) ? messages : [];
  const keys = [];
  let nextSeq = lastSpokenSeq;

  for (const m of list) {
    const seq = typeof m?.seq === 'number' ? m.seq : 0;
    if (seq <= lastSpokenSeq) continue;
    if (seq > nextSeq) nextSeq = seq;
    if (m?.key) keys.push(m.key);
  }

  return { keys, nextSeq };
}
