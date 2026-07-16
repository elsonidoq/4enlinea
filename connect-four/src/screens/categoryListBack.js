// Spec 042 T025 / QA 2026-07-15 finding #1. Mirrors MistakeDetailScreen.handleBack:
// a screen reached in-app was PUSHED onto history by its parent, so Back must POP.
// A cold-opened permalink has no session-only nav param (urlMapping gives /mistakes
// paramNames: [], so params are never URL-encoded) and must reach Home in one press.
// The old `onBack={() => go('stats')}` PUSHED a forward entry, so Back from /stats
// popped back to /mistakes and the pair toggled forever.
export function resolveCategoryListBack({ navContext }) {
  return navContext ? 'back' : 'home';
}
