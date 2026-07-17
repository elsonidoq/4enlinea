# Quickstart: Verifying the Onboarding Experience

## Manual verification — first-run (anonymous)

1. Clear IndexedDB for the app origin (DevTools → Application → IndexedDB → delete `decodec4`),
   clear cookies for the origin.
2. Load the app root URL. Expected: no visible flash of Home, no splash/tutorial/carousel; lands
   directly on the `game` screen at Easy difficulty, board immediately playable (the boot-gate
   render, research.md R3, should make any transitional frame imperceptible).
3. Make one move. Expected: the coach reacts to that specific move (via `/api/evaluate-move`);
   no reward overlay is expected (aha detection/reward acknowledgment was dropped — see
   research.md R5).
4. Confirm (DevTools → Application → IndexedDB → `decodec4` → `profile`) that
   `onboarding_status` is now `seen`.
5. Continue to the game's natural end (win/loss/draw/resign). Expected: the
   `onboardingImportOffer` screen appears once (instead of the normal review screen), then Home.
6. Reload the app root URL again. Expected: lands on Home directly — onboarding does not repeat.

## Manual verification — early exit before game end (User Story 3 Scenario 5 / FR-007 fallback)

1. Repeat steps 1-2 above.
2. Make one move (status flips to `seen`), then close the tab/navigate away before the game
   reaches its natural end (do not resign, do not let it finish).
3. Reopen the app and land on Home (either directly, since `onboarding_status !== not_encountered`
   suppresses the sparring redirect, or via any other normal navigation to Home).
4. Expected: the `onboardingImportOffer` screen is shown once, automatically, on this Home
   visit — the offer is not silently lost. Dismiss or accept it.
5. Navigate to Home again. Expected: the offer does NOT appear a second time (the one-time
   `localStorage` marker, per data-model.md, is now set).

## Manual verification — game ends with zero moves played

1. Repeat steps 1-2 above.
2. Immediately resign/abandon before making any move.
3. Expected: exits to Home (not forced to replay); `onboarding_status` remains `not_encountered`
   (no move was ever played, so FR-005 never fired — see spec.md Edge Cases).
4. Reload the app root URL. Expected: lands in onboarding again (status is still
   `not_encountered`) — this is expected, not a bug, since nothing was ever recorded as engaged.

## Manual verification — skip

1. Repeat steps 1-2 above.
2. Tap the skip control during the sparring game (before playing a move, or any time before the
   import offer).
3. Expected: lands on Home immediately, `onboarding_status` is `skipped`.
4. Navigate to Settings. Expected: a "Replay intro" control is present and re-launches onboarding
   on demand, in ≤2 taps from Home (SC-004).

## Manual verification — OAuth-hash race (FR-014 / User Story 1 Scenario 3)

1. Clear IndexedDB + cookies as above (first-time-looking device).
2. Manually navigate to a URL containing a magic-link hash fragment
   (`/#access_token=<valid-test-token>&refresh_token=...`) as if arriving from an email link.
3. Expected: sign-in completes (`session` becomes non-null), the user is routed to whatever
   `consumeReturnTo()`/normal post-login destination applies — **not** into onboarding, even
   though the local IndexedDB profile (pre-sign-in) had `onboarding_status: not_encountered`.
4. Confirm via DevTools Network tab that `/api/auth/callback` fired before any onboarding
   redirect logic ran (no flash of the sparring game before landing on the real destination).

## Manual verification — account carryover (User Story 1 Scenario 4 / FR-012)

1. Complete onboarding anonymously (reach `seen`, per the first section above).
2. Sign up for an account from within the app (any existing sign-up entry point, e.g. accepting
   the import offer).
3. Query the `users` table (or `GET /api/user/profile` once authenticated) for the new account —
   expect `onboarding_status: 'seen'`.
4. Sign in with the same account on a different browser/device profile (clean IndexedDB). Expect:
   the device does not show onboarding automatically post-sign-in (though its own *local* clean
   profile would show `not_encountered` before sign-in resolves — this is exactly the race R3
   guards against: `sessionChecked && !session` never becomes true for a device that ends up
   signed in).

## Responsive check (FR-017)

Load the onboarding flow at 390×844 (mobile) and a standard desktop viewport (e.g. 1440×900).
Confirm: board, coach reaction, skip control, and the import-offer screen all remain fully usable
and legible at both sizes.

## Automated tests to add (see tasks.md for the full breakdown)

- `IndexedDBStore.updateProfile` unit test (merge semantics, does not clobber other profile
  fields).
- `PUT /api/user/profile` extended-shape test (papergames_id-only unaffected; onboarding_status-
  only accepted; invalid enum value rejected 400; both fields together accepted).
- `POST /api/user/migrate` onboarding_status conditional-write test (does not clobber a non-
  `not_encountered` existing value; accepts a valid value onto a fresh `not_encountered` row;
  silently ignores an absent/invalid value without failing the whole migration).
- Migration `057_users_onboarding_status.sql` — schema test confirming column, default, and CHECK
  constraint (three values: `not_encountered`, `seen`, `skipped`).
- Extend `userHelpers.test.mjs:317-340`'s existing pinning tests (do not add a new describe
  block) to assert `onboarding_status` is present in `USER_PROFILE_SELECT_COLUMNS` and defaults
  to `'not_encountered'` in `defaultUserProfile()`, alongside the existing `stripe_customer_id`
  assertions (research.md R10).
- `Navigator`'s new first-run effect — component/integration test simulating
  `sessionChecked=true, session=null, profile.onboarding_status='not_encountered'` → expects
  `go('game', {difficulty:'easy', side:'first', onboarding:true})` to fire exactly once; and
  `sessionChecked=true, session={...}` → expects it to NOT fire. Plus a render test confirming
  `Navigator` renders only the boot-gate frame (no `home`/any `ScreenComponent`) while
  `sessionChecked` is `false`.
- `GameScreen.jsx`'s onboarding `seen`-write test: the first human move played in an
  `onboarding=true` session triggers exactly one
  `updateProfile({onboarding_status:'seen'})` call, not on subsequent moves; no such call in a
  non-onboarding session.
- `GameScreen.jsx`'s end-of-game branch test: an onboarding session's game-end (via each of
  win/loss/draw/resign) calls `goReplace('onboardingImportOffer', ...)`, never
  `goReplace('review', ...)`; a non-onboarding session's game-end is unaffected (still
  `goReplace('review', ...)`).
- Home-fallback test: `onboarding_status === 'seen'` and the `localStorage` marker unset →
  Home routes to `onboardingImportOffer` and sets the marker; a second Home mount with the
  marker now set does not re-trigger it.
