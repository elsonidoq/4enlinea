# Onboarding Mission Screen — Design Spec

**Date:** 2026-07-13
**Status:** Design approved; ready for implementation plan
**Visual source of truth:** `docs/mvp/mockup/project/screens_onboarding.jsx` → `MissionScreen` (lines 145–232) + `PillarRow`/`MISSION_PILLARS` (lines 151–188)

## Problem

A brand-new anonymous user is dropped straight into a practice sparring game with no intro (`App.jsx:110-127` auto-routes first-run anonymous users to `game`). This is deliberate friction-minimization from Epic 8 (spec `specs/048-onboarding-experience`, "show the coach reacting to the user's own play, as fast as possible"). But it never communicates *why* the user is here — what the app is for — before they play.

## Goal

Insert one screen before the first sparring game that lands the app's mission: **you learn Connect Four tactics, practice them, and understand your mistakes — against both the coach and your real opponents (Papergames).** The coach delivers this message, then a single CTA hands off to the coach-narrated practice game where the user experiences it firsthand.

New flow (anonymous first-run):

```
land → onboardingMission → (CTA "Start sparring") → onboarding sparring game → import offer → …
```

Everything from the sparring game onward is unchanged.

## Decisions (settled)

1. **Format:** one static screen, three pillars, single hand-off. No carousel, no per-pillar expand.
2. **Action:** a single primary CTA ("Start sparring"). **No skip / escape hatch** on this screen — everyone sees the mission once, then plays.
3. **Voice:** the coach is the messenger — coach avatar + speech bubble greet the user (visual continuity with the coached game that follows).
4. **Message:** three pillars that mirror the app's three modes (learn → practice → review real games).

## Placement & routing

Add a new **session-only** screen keyed `onboardingMission`.

- **Change the auto-route target.** Today `App.jsx:117` calls `go('game', ONBOARDING_GAME_PARAMS)` when `shouldAutoRouteToOnboarding(...)` (`onboardingRouting.js:27`) is true. Change this to route to `onboardingMission` instead. The `shouldAutoRouteToOnboarding` gate itself is unchanged (anonymous only; `onboarding_status` `not_encountered`/null).
- **The CTA launches the game.** The mission screen's "Start sparring" button calls `go('game', ONBOARDING_GAME_PARAMS)` — the same `{ difficulty: 'easy', side: 'first', onboarding: true }` params used today. `ONBOARDING_GAME_PARAMS` stays the single source of those params.
- **`onboarding_status` flow untouched.** It still first flips to `'seen'` on the user's first *move* (`onboardingFirstMove.js` via `GameScreen.jsx`). Consequence: if the user reloads while on the mission screen (before playing), the gate re-shows the mission — correct, since they have not engaged yet.
- **Signed-in users are never routed here** (same as today; reach onboarding only via Settings "Replay intro", which routes to the game, not this screen).
- **Registration:**
  - `screenRegistry.jsx` — add `onboardingMission: OnboardingMissionScreen`.
  - Do **not** add to `urlMapping.js` `SESSION_ONLY_SCREENS` list beyond what the existing `game`/`summary`/`onboardingImportOffer` pattern requires: it is reached only via `go()`, is not URL-addressable, and falls back to Home on direct navigation/reload-to-URL. Follow the exact comment pattern at `screenRegistry.jsx:40-43`.
  - `surfaceGroups.js` — give `onboardingMission` a `SURFACE_BG` (the light home surface, matching the mockup's home-style background).

## Screen structure (recreate the mockup)

Recreate `MissionScreen` from the mockup **visually pixel-faithful**, using production conventions (composed `TopBar`/`CoachDialog`/`Toolbar`/`AuthModal`/`Icon` + inline styles referencing tokens), **not** the prototype's raw `screen s-home`/`scroll` CSS classes. Top to bottom:

1. **Top bar** — app logo (`Decode` + green `C4`) on the left; a right-aligned circular user/sign-in icon button (`Icon name="user"`) that opens `AuthModal`. This lets a returning user sign in instead of playing. (Mockup lines 194–203.)
2. **Coach greeting** — `CoachDialog` (size ≈ 58) with a single message:
   - `lead`: "Hi, I'm your coach."
   - `text`: "Here's how we'll make you dangerous at Connect Four."
   - `mood`: "happy"
3. **Three pillars** — a vertical stack of `PillarRow`s (icon badge + title + one supporting line each). Copy and styling verbatim from `MISSION_PILLARS` (mockup lines 151–170):

   | Icon | Badge tint / ink | Title | Supporting line |
   |---|---|---|---|
   | `grad` | `#e3eefc` / `#3b6fc4` | Learn the tactics | The winning patterns behind every game — and why they work. |
   | `swords` | `#e9e1fb` / `#7a5bd0` | Practice against a bot that teaches | Play me at your level and get the reasoning behind every move. |
   | `flag` | `var(--eval-mid-bg)` / `#b9760a` | Understand your mistakes | Turn blunders into lessons — even your real games from Papergames. |

   `PillarRow` styling (mockup lines 172–188): flex row, gap 14; card = `background: var(--card)`, `border-radius: var(--radius-sm)`, `padding: 14px 15px`, `box-shadow: var(--shadow-sm)`, `border: 1px solid #f0ebe1`. Icon badge: 46×46, radius 14, `background: tint`, `color: ink`, `Icon size={24}`. Title: `font-display`, weight 700, ~16.5px, `color: var(--ink)`. Line: 13px, weight 600, `color: var(--ink-soft)`.
4. **Single primary CTA** — inside a `Toolbar`: `btn btn-primary` reading "Start sparring" with a trailing white `play` icon → `go('game', ONBOARDING_GAME_PARAMS)`. (Mockup lines 221–226; the mockup's `go("obGame")` maps to the production `go('game', ONBOARDING_GAME_PARAMS)`.)

## Copy & i18n

All strings (coach lead/text, three pillar titles + lines, "Start sparring") live under a new `onboardingMission.*` key group in `en.json`, following the existing i18n pattern (see `OnboardingImportOfferScreen.jsx`'s use of `useTranslation`). English-only ships now; the Spanish switcher (Epic 9 / OI-15) will pick up the keys later.

## Analytics

- Move `track('onboarding_started', {})` from the auto-route point (`App.jsx:118`) to **mission-screen mount** — the mission screen is now the true start of onboarding.
- Add `track('onboarding_sparring_started', {})` when the CTA is pressed (before/at `go('game', …)`). This measures drop-off introduced by the extra screen — the number that tells us whether the mission beat earns its place.
- No change to `onboarding_finished` (still owned by `OnboardingImportOfferScreen`).

## States & scope

- **States:** one static state. No loading/empty/error (no data fetched). CTA always enabled. `AuthModal` is the only conditional overlay (opened from the top-bar user icon; closing it returns to the mission screen).
- **Out of scope:** no skip/escape hatch on this screen; no carousel; no per-pillar expansion; no changes to the sparring game, review, or import-offer screens; no changes for signed-in users; no backend/DB/schema work. Pure additive frontend: one new screen component + one routing-target change + one analytics move + one new analytics event + new i18n keys + registry/surface wiring.

## Component reuse map (mockup → production)

| Mockup | Production |
|---|---|
| `MissionScreen` | new `src/screens/OnboardingMissionScreen.jsx` |
| `CoachDialog` | `src/components/CoachDialog.jsx` (`{messages, size}`) |
| `Toolbar` | `src/components/Toolbar.jsx` |
| `AuthModal` | `src/components/AuthModal.jsx` |
| `Icon` (`grad`/`swords`/`flag`/`play`/`user`) | `src/components/Icon.jsx` (all names exist) |
| top bar (logo + user icon) | compose with `TopBar` or an inline header matching HomeScreen; use `Icon name="user"` + `AuthModal` |
| `go("obGame")` | `go('game', ONBOARDING_GAME_PARAMS)` from `src/lib/onboardingRouting.js` |
| tokens `--card`/`--radius-sm`/`--shadow-sm`/`--font-display`/`--ink-soft`/`--eval-mid-bg` | all present in `tokens.css` |

## Files touched (anticipated)

- **New:** `src/screens/OnboardingMissionScreen.jsx`
- **Edit:** `src/App.jsx` (auto-route target + move `onboarding_started`), `src/lib/screenRegistry.jsx` (register), `src/lib/surfaceGroups.js` (`SURFACE_BG`), `src/i18n/en.json` (`onboardingMission.*` keys)
- **Verify:** `src/lib/urlMapping.js` fallback behavior for the new session-only key
