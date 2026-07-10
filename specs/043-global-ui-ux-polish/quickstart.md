# Quickstart: Manual Verification (Constitution III — golden path + edge case per UI feature)

Run against the local dev app (`npm run dev` in `connect-four/`), using the `chrome-devtools-mcp`
skill / `a11y-debugging` skill for the accessibility checks. `npm run test:fast` covers the pure
logic; this covers what pure-function tests structurally cannot (real DOM, real focus, real
keyboard, real viewport).

## US1 — Board accessibility

1. Open a playable board (e.g. Sparring `game` screen). Open the Chrome DevTools Accessibility
   tree (or use `chrome-devtools-mcp` `take_snapshot`). Confirm exactly 7 elements with
   `role="button"` and labels "column 1".."column 7", left-to-right.
2. Tab through the board. Confirm focus order is column 1 → 7 and each shows a visible focus ring.
3. With column 4 focused, press Space. Confirm a disc drops in column 4 exactly as a click would.
4. Fill a column completely; Tab to it. Confirm it reports as disabled (not announced as
   playable) and Enter/Space does not drop a disc.
5. **Edge case**: open a read-only board (e.g. `review` screen, or `mistakeDetail`'s board).
   Confirm the accessibility tree shows zero `role="button"` column elements.
6. Confirm player disc colors (green = P1, gray = P2) are unaffected — visually spot-check a board
   with discs of both colors.

## US2 — Button affordances

1. Load Stats signed in. Confirm "review past mistakes" has a visible background/border.
   Hover/focus/press it — confirm 3 distinct visual states. Click it — confirm it still navigates
   to `mistakes`.
2. Sign out, reload Stats. Confirm the "Sign up to track your progress over time" element now
   reads as a button (background/border, hover/active/focus states).

## US3 — Logged-out CTA routing

1. Signed out, on Home: tap the "Past games" card. Confirm `AuthModal` opens (not a navigation to
   the dead-end screen).
2. Complete Google sign-in (or, in dev, use the "Dev: skip auth" button in `AuthModal`). Confirm
   the app lands on the Past Games list (not Home) after the redirect completes.
3. **sessionStorage survival check (empirical, per Constitution VI)**: before completing step 2,
   inspect Application → Session Storage in DevTools immediately after tapping "Past games" —
   confirm the `postLoginReturnTo` key is present with `{"screenKey":"pastGames",...}`. After the
   OAuth redirect round-trip completes and the app reloads on `5173`, re-check Session Storage —
   confirm the key is gone (consumed) and the app is on `pastGames`.
4. Signed out, on Home: tap "Past games", then dismiss the `AuthModal` without signing in. Confirm
   the user remains on Home with no partial navigation.
5. Signed out, on Stats: tap the "Sign up to track your progress" element. Confirm `AuthModal`
   opens.

## US4 — Logo + mobile spacing

1. On every screen (Home, Stats, Past Games, a lesson screen, a sparring game), confirm the
   DecodeC4 logo renders in the same TopBar position and tapping it navigates to Home.
2. On Home specifically, confirm the DecodeC4 mark appears exactly once (no duplicate title +
   logo).
3. Tap the logo while already on Home — confirm no error and no broken/duplicate history entry
   (back button still works sanely afterward).
4. Using `chrome-devtools-mcp` `resize_page`/`emulate` at 390×844, open Past Games. Visually
   compare chip-row-to-content spacing against the pre-fix screenshot (capture one before starting
   implementation) — confirm it no longer reads as cramped/overlapping.

## Regression check

Run `npm run test:fast` inside `connect-four/` — all existing suites (including
`tests/urlMapping.test.js`, `tests/unit/splitRevealZoom.test.js`, and any newly added unit tests
for this feature) must pass green.
