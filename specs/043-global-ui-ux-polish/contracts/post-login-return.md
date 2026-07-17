# Contract: `postLoginReturn` module (new, FR-013's "single named consumption point")

New module, e.g. `connect-four/src/lib/postLoginReturn.js` (exact path decided at implementation
time; MUST live under `src/lib/` per existing convention for cross-cutting client logic such as
`urlMapping.js`, `track.js`).

## Exports

```js
/** Stash the screen the user was trying to reach before a sign-in gate interrupted them. */
export function stashReturnTo(screenKey, params = {}) { ... }

/**
 * Read and clear the stashed destination, if any. Returns null if none was stashed, or if the
 * stashed screenKey is no longer a valid entry in SCREENS.
 */
export function consumeReturnTo() { ... } // returns { screenKey, params } | null

/**
 * Clear any stashed destination without consuming it. MUST be called whenever the sign-in
 * prompt (AuthModal) is closed without completing sign-in — dismiss via the backdrop, the
 * "dismiss" button, or (dev-only) the skip-auth button — so a stashed intent never survives
 * past the flow that created it and silently redirects a later, unrelated sign-in.
 */
export function clearReturnTo() { ... } // no return value; safe no-op if nothing was stashed
```

## Contract

- `stashReturnTo` MUST be called synchronously, before the auth redirect/modal opens (i.e. before
  `setAuthOpen(true)` at the two in-scope call sites).
- `consumeReturnTo` MUST be called from exactly one place in the app: the `Navigator` component's
  `session`-keyed effect in `connect-four/src/App.jsx` (see `research.md` R3). No screen may call
  `consumeReturnTo` itself — this is the FR-013 requirement made literal and greppable
  (`rg consumeReturnTo src/` MUST return exactly one call site outside the module's own test file).
  The effect body itself calls `consumeReturnTo()` directly (not an inlined
  `sessionStorage.getItem`/`JSON.parse`/`SCREENS` guard) — the parse/validity logic lives inside
  the module, per `research.md` R3.
- `consumeReturnTo` MUST delete the `sessionStorage` entry as part of reading it (read-once
  semantics), even if the parsed `screenKey` turns out to be invalid (prevents an unrecoverable
  stuck/invalid entry from being retried on every future session-truthy render).
- Malformed JSON in the stashed value MUST NOT throw past `consumeReturnTo` — caught internally,
  treated as "nothing to consume."
- `clearReturnTo` MUST be called from `AuthModal`'s own close handling (`connect-four/src/components/AuthModal.jsx`),
  wrapping whatever `onClose` prop the call site passed in, so that **every** dismissal path —
  backdrop click, the "dismiss" button, and the dev-only skip-auth button — clears any stashed
  destination before invoking the caller's `onClose`. This is deliberately broader than "only the
  gated CTA's own dismiss handler": AuthModal is opened from multiple call sites (`HomeScreen.jsx`,
  `DeepRevealPane.jsx`, `AuthGate`), and centralizing the clear inside `AuthModal` itself is the
  only way to guarantee no dismissal path can leave a stale stash behind. Rationale and the bug
  this closes are documented in `research.md` R3 ("Stale return-destination after dismissal").
  `clearReturnTo` MUST be idempotent (safe to call when nothing is stashed).

## Consumers

| Call site | Direction | Screen key stashed |
|---|---|---|
| `HomeScreen.jsx` past-games `FeatureCard.onClick` | write (`stashReturnTo`) | `'pastGames'` |
| `StatsScreen.jsx` `signup_prompt` `onClick` | write (`stashReturnTo`) | `'stats'` — see `data-model.md` (resolved: the OAuth redirect always lands on Home, so a no-stash CTA would strand the user on Home instead of Stats; stash is required, not optional) |
| `App.jsx` `Navigator`, `useEffect([session])` | read (`consumeReturnTo`) | — |
| `AuthModal.jsx`, all three close paths (backdrop, dismiss button, dev skip-auth button) | clear (`clearReturnTo`) | — closes blocking issue 1 (stale stash surviving a dismissed prompt) |
