// Two-stage timing for the deep-reveal fetch (OI-12). A cold, uncached
// reasoning-model call can exceed the old fixed 6s cap; instead of failing at
// 6s we show a "still thinking" hint and only abort/fail at the hard cap.
export const DEEP_REVEAL_SOFT_MS = 6000;
export const DEEP_REVEAL_HARD_MS = 30000;

export function deepRevealPhase(elapsedMs, resolved) {
  if (resolved) return 'done';
  if (elapsedMs >= DEEP_REVEAL_HARD_MS) return 'timedOut';
  if (elapsedMs >= DEEP_REVEAL_SOFT_MS) return 'slow';
  return 'loading';
}
