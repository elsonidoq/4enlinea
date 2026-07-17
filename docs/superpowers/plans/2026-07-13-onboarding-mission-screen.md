# Onboarding Mission Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Insert a single coach-voiced "mission" screen before the first-run onboarding sparring game, communicating the app's value (learn tactics → practice → understand mistakes vs coach & real games) before the user plays.

**Architecture:** A new presentational, session-only screen `onboardingMission`. The existing anonymous first-run auto-route effect (`App.jsx`) is retargeted from `game` to `onboardingMission`; the screen's single CTA then launches the same onboarding game via `ONBOARDING_GAME_PARAMS`. The `shouldAutoRouteToOnboarding` gate and `onboarding_status` lifecycle are unchanged. Analytics for onboarding-start move onto the new screen's mount.

**Tech Stack:** React (function components, hooks), react-i18next, custom string-keyed Navigator (no React Router), hand-rolled CSS-token design system, `node --test` for pure-logic/i18n unit tests.

**Spec:** `docs/superpowers/specs/2026-07-13-onboarding-mission-screen-design.md`
**Visual source of truth:** `docs/mvp/mockup/project/screens_onboarding.jsx` → `MissionScreen` / `PillarRow` / `MISSION_PILLARS`.

## Global Constraints

- **Coordinates / players:** not relevant to this screen (no board rendering).
- **i18n lockstep:** every new key added to `src/i18n/en.json` MUST have a matching key path in `src/i18n/es.json` (key presence only; text may be Spanish or English) — enforced by `tests/unit/i18nKeyParity.test.js`, which runs in both `test` and `test:fast`.
- **Design tokens:** use the light-surface token family only (`--card`, `--radius-sm`, `--shadow-sm`, `--font-display`, `--ink`, `--ink-soft`, `--eval-mid-bg`, `--disc-green`) from `src/styles/tokens.css`. Do NOT use the dark-surface `--surface`/`--text` family.
- **Route params source of truth:** the onboarding game params are `ONBOARDING_GAME_PARAMS = { difficulty: 'easy', side: 'first', onboarding: true }`, imported from `src/lib/onboardingRouting.js`. Never hardcode these inline.
- **Tests:** run with `npm run test:fast` from inside `connect-four/`.
- **Working directory:** all paths below are relative to `connect-four/` unless noted. Run all `npm`/`git` commands from `connect-four/` except the final git commit which may run from repo root (either works; paths shown are repo-relative for `git add`).
- **No urlMapping change:** `onboardingMission` is deliberately NOT added to `src/lib/urlMapping.js` (`URL_MAP` / `SESSION_ONLY_SCREENS`). It is reached only via `go()`; `buildUrl('onboardingMission')` returns `/` and `parseUrl` never yields it — exactly matching the existing `onboardingImportOffer` session-only pattern. On reload, the auto-route effect re-shows it (status still `not_encountered`).

---

### Task 1: i18n keys for the mission screen (en + es)

Add a nested `mission` block under the existing `onboarding` key in both locale files. Driven by the i18n key-parity test: add to `en.json` first (test goes red), then add matching keys to `es.json` (test goes green).

**Files:**
- Modify: `connect-four/src/i18n/en.json` (inside the `"onboarding": { ... }` object, currently at line 833)
- Modify: `connect-four/src/i18n/es.json` (inside its `"onboarding": { ... }` object, currently at line 833)
- Test (existing, do not edit): `connect-four/tests/unit/i18nKeyParity.test.js`

**Interfaces:**
- Produces (consumed by Task 2's component via `t(...)`):
  - `onboarding.mission.coachLead` (string)
  - `onboarding.mission.coachText` (string)
  - `onboarding.mission.cta` (string)
  - `onboarding.mission.pillars.learn.title` / `.line`
  - `onboarding.mission.pillars.practice.title` / `.line`
  - `onboarding.mission.pillars.mistakes.title` / `.line`

- [ ] **Step 1: Add the `mission` block to `en.json`**

In `connect-four/src/i18n/en.json`, change the existing `onboarding` block (lines 833–844) so that it gains a `mission` sub-object. The `importOffer` block is unchanged; add `mission` after it:

```json
  "onboarding": {
    "skip": "Skip",
    "replayIntro": "Replay intro",
    "importOffer": {
      "title": "Bring your real games in",
      "subtitle": "Import your Papergames history to get move-by-move analysis and mistake tracking on the games you actually play.",
      "accept": "Import my games",
      "decline": "Not now",
      "coach": "Nice game! Want deeper analysis on the games you play online too?",
      "signInReason": "Sign in to import your Papergames history."
    },
    "mission": {
      "coachLead": "Hi, I'm your coach.",
      "coachText": "Here's how we'll make you dangerous at Connect Four.",
      "cta": "Start sparring",
      "pillars": {
        "learn": {
          "title": "Learn the tactics",
          "line": "The winning patterns behind every game — and why they work."
        },
        "practice": {
          "title": "Practice against a bot that teaches",
          "line": "Play me at your level and get the reasoning behind every move."
        },
        "mistakes": {
          "title": "Understand your mistakes",
          "line": "Turn blunders into lessons — even your real games from Papergames."
        }
      }
    }
  },
```

- [ ] **Step 2: Run the parity test to verify it FAILS**

Run: `npm run test:fast -- --test-name-pattern="key parity"` (from `connect-four/`)
Expected: FAIL — `missingFromEs` lists the seven new `onboarding.mission.*` key paths.

(If the runner does not support `--test-name-pattern` filtering, run the file directly: `node --test tests/unit/i18nKeyParity.test.js` — same expected failure.)

- [ ] **Step 3: Add the matching `mission` block to `es.json`**

In `connect-four/src/i18n/es.json`, add the same `mission` sub-object after its `importOffer` block (Spanish text):

```json
    "mission": {
      "coachLead": "Hola, soy tu entrenador.",
      "coachText": "Así es como te volveremos peligroso en el Conecta 4.",
      "cta": "Empezar a entrenar",
      "pillars": {
        "learn": {
          "title": "Aprende las tácticas",
          "line": "Los patrones ganadores detrás de cada partida, y por qué funcionan."
        },
        "practice": {
          "title": "Practica contra un bot que enseña",
          "line": "Juega contra mí a tu nivel y recibe el razonamiento de cada jugada."
        },
        "mistakes": {
          "title": "Entiende tus errores",
          "line": "Convierte los errores en lecciones, incluso en tus partidas reales de Papergames."
        }
      }
    }
```

Place it inside the `onboarding` object, after the `importOffer` block's closing `},` — mirroring the en.json structure exactly. Ensure the `onboarding` object stays valid JSON (comma after `importOffer`'s `}`, no trailing comma after `mission`'s `}`).

- [ ] **Step 4: Run the parity test to verify it PASSES**

Run: `npm run test:fast -- --test-name-pattern="key parity"` (from `connect-four/`)
Expected: PASS — `missingFromEs (0)` and `missingFromEn (0)`.

- [ ] **Step 5: Run the full fast suite to confirm no JSON-parse or unrelated breakage**

Run: `npm run test:fast` (from `connect-four/`)
Expected: PASS (no new failures introduced).

- [ ] **Step 6: Commit**

```bash
git add connect-four/src/i18n/en.json connect-four/src/i18n/es.json
git commit -m "feat(onboarding): add mission-screen i18n keys (en+es)"
```

---

### Task 2: Mission screen component, registration, surface, auto-route retarget & analytics

Build `OnboardingMissionScreen`, register it, give it a background surface, and retarget the anonymous first-run auto-route from `game` to `onboardingMission`. The screen owns onboarding analytics (`onboarding_started` on mount, `onboarding_sparring_started` on CTA); the old `track('onboarding_started')` call is removed from `App.jsx`. This is one task because the screen is dead/unreachable without the route swap — a reviewer cannot meaningfully accept one without the other. It has no `node --test`-able seam (the runner cannot parse JSX), so it is verified end-to-end in a real browser.

**Files:**
- Create: `connect-four/src/screens/OnboardingMissionScreen.jsx`
- Modify: `connect-four/src/lib/screenRegistry.jsx` (add import + `SCREENS` entry)
- Modify: `connect-four/src/lib/surfaceGroups.js` (add `SURFACE_BG` entry)
- Modify: `connect-four/src/App.jsx:116-118` (retarget auto-route; remove old `track`/param usage)

**Interfaces:**
- Consumes: `ONBOARDING_GAME_PARAMS` and `shouldAutoRouteToOnboarding` from `src/lib/onboardingRouting.js` (unchanged); `track` from `src/lib/track.js`; components `TopBar`, `CoachDialog`, `Toolbar`, `AuthModal`, `Icon`; i18n keys from Task 1.
- Produces: screen component `OnboardingMissionScreen({ go })` registered under the `SCREENS` key `'onboardingMission'`. Fires analytics events `onboarding_started` (mount, once) and `onboarding_sparring_started` (CTA).

- [ ] **Step 1: Create the screen component**

Create `connect-four/src/screens/OnboardingMissionScreen.jsx` with exactly this content:

```jsx
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TopBar } from '../components/TopBar.jsx';
import { CoachDialog } from '../components/CoachDialog.jsx';
import { Toolbar } from '../components/Toolbar.jsx';
import { AuthModal } from '../components/AuthModal.jsx';
import { Icon } from '../components/Icon.jsx';
import { track } from '../lib/track.js';
import { ONBOARDING_GAME_PARAMS } from '../lib/onboardingRouting.js';

// Onboarding mission screen — shown once, before the first-run sparring game (anonymous
// first-run only). The coach is the messenger; three pillars mirror the app's three modes
// (learn -> practice -> review real games); a single CTA hands off to the coached game.
// Visual source of truth: docs/mvp/mockup/project/screens_onboarding.jsx (MissionScreen).
// Session-only screen: reached only via the App.jsx auto-route (go('onboardingMission')) or
// Navigator; NOT registered in urlMapping.js — matches the onboardingImportOffer pattern.

const MISSION_PILLARS = [
  { icon: 'grad',   tint: '#e3eefc',            ink: '#3b6fc4', titleKey: 'onboarding.mission.pillars.learn.title',    lineKey: 'onboarding.mission.pillars.learn.line' },
  { icon: 'swords', tint: '#e9e1fb',            ink: '#7a5bd0', titleKey: 'onboarding.mission.pillars.practice.title', lineKey: 'onboarding.mission.pillars.practice.line' },
  { icon: 'flag',   tint: 'var(--eval-mid-bg)', ink: '#b9760a', titleKey: 'onboarding.mission.pillars.mistakes.title', lineKey: 'onboarding.mission.pillars.mistakes.line' },
];

function PillarRow({ icon, tint, ink, title, line }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 14,
      background: 'var(--card)', borderRadius: 'var(--radius-sm)',
      padding: '14px 15px', boxShadow: 'var(--shadow-sm)', border: '1px solid #f0ebe1',
    }}>
      <span style={{ width: 46, height: 46, borderRadius: 14, flex: '0 0 auto', display: 'grid', placeItems: 'center', background: tint, color: ink }}>
        <Icon name={icon} size={24} color={ink} />
      </span>
      <span style={{ flex: 1, minWidth: 0, paddingTop: 1 }}>
        <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16.5, color: 'var(--ink)', lineHeight: 1.2 }}>{title}</span>
        <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', lineHeight: 1.38, marginTop: 3 }}>{line}</span>
      </span>
    </div>
  );
}

export function OnboardingMissionScreen({ go }) {
  const { t } = useTranslation();
  const [authOpen, setAuthOpen] = useState(false);

  // Fire the onboarding-start event once on mount. Guarded by a ref (not just empty deps) so
  // React 18 StrictMode's dev-only double-invoke of mount effects cannot double-fire it — same
  // pattern as OnboardingImportOfferScreen's marker/analytics write.
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    track('onboarding_started', {});
  }, []);

  function handleStart() {
    track('onboarding_sparring_started', {});
    go('game', ONBOARDING_GAME_PARAMS);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar
        onLogoClick={() => go('home')}
        rightIcon="user"
        onRight={() => setAuthOpen(true)}
      />

      <div style={{ padding: '4px 22px 16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ margin: '0 -6px 4px' }}>
          <CoachDialog
            size={58}
            messages={[{
              lead: t('onboarding.mission.coachLead'),
              text: t('onboarding.mission.coachText'),
              mood: 'happy',
            }]}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginTop: 14 }}>
          {MISSION_PILLARS.map((p) => (
            <PillarRow
              key={p.icon}
              icon={p.icon}
              tint={p.tint}
              ink={p.ink}
              title={t(p.titleKey)}
              line={t(p.lineKey)}
            />
          ))}
        </div>
      </div>

      <Toolbar>
        <button className="btn btn-primary" onClick={handleStart}>
          {t('onboarding.mission.cta')} <Icon name="play" size={16} color="#fff" />
        </button>
      </Toolbar>

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </div>
  );
}
```

- [ ] **Step 2: Register the screen in `screenRegistry.jsx`**

In `connect-four/src/lib/screenRegistry.jsx`, add the import alongside the other screen imports (after the `OnboardingImportOfferScreen` import on line 19):

```jsx
import { OnboardingMissionScreen } from '../screens/OnboardingMissionScreen.jsx';
```

Then add the entry to the `SCREENS` map (after the `onboardingImportOffer` entry, line 43):

```jsx
  // Onboarding mission screen — session-only: reached only via App.jsx's anonymous first-run
  // auto-route (go('onboardingMission')). NOT in urlMapping.js/SESSION_ONLY_SCREENS, matching
  // the onboardingImportOffer / game / summary session-only pattern.
  onboardingMission: OnboardingMissionScreen,
```

- [ ] **Step 3: Add the background surface in `surfaceGroups.js`**

In `connect-four/src/lib/surfaceGroups.js`, add an entry to `SURFACE_BG` (the mission screen uses the light home surface, matching the mockup). Add it near the `home` group:

```js
  onboardingMission: '--bg-home',
```

- [ ] **Step 4: Retarget the auto-route in `App.jsx`**

In `connect-four/src/App.jsx`, change the auto-route effect body. Current (lines 116–119):

```jsx
      if (shouldAutoRouteToOnboarding({ sessionChecked, session, onboardingStatus: profile.onboarding_status })) {
        go('game', ONBOARDING_GAME_PARAMS);
        track('onboarding_started', {});
      }
```

Replace with:

```jsx
      if (shouldAutoRouteToOnboarding({ sessionChecked, session, onboardingStatus: profile.onboarding_status })) {
        // Route to the mission screen (not the game directly). The mission screen fires
        // track('onboarding_started') on mount and launches the onboarding game via its CTA.
        go('onboardingMission');
      }
```

Then fix the now-unused import on line 11. `ONBOARDING_GAME_PARAMS` is no longer referenced in `App.jsx` (it moved to the mission screen); remove it from the import, leaving:

```jsx
import { shouldAutoRouteToOnboarding } from './lib/onboardingRouting.js';
```

Leave the `track` import (line 8, `import { setActiveScreen, track } from './lib/track.js';`) as-is — `track` is still used elsewhere in `App.jsx` via `setActiveScreen`/other calls; do not remove it. (If a lint run reports `track` as unused after this change, and only then, remove it from that import — but verify first.)

- [ ] **Step 5: Verify the app builds (lint / dev server starts clean)**

Run: `npm run lint` (from `connect-four/`, if a lint script exists) OR start the dev server and confirm no build error: `npm run dev` and watch for a clean Vite start.
Expected: no unresolved-import, unused-variable, or JSX errors referencing the new files.

- [ ] **Step 6: Verify end-to-end in a real browser (fresh anonymous first-run)**

This screen has no unit-test seam (JSX). Verify the actual flow:

1. Start the dev app (`npm run dev` from `connect-four/`).
2. Open the app in a browser with a **clean profile** — a fresh incognito window, or clear site data / localStorage + IndexedDB so `onboarding_status` reads as `not_encountered` and there is no session. (See memory `project_indexeddb_signin_hang.md` if IndexedDB clearing hangs.)
3. Confirm the FIRST screen shown is the mission screen: DecodeC4 logo + user icon top bar, coach bubble ("Hi, I'm your coach. Here's how we'll make you dangerous at Connect Four."), three pillar cards (Learn the tactics / Practice against a bot that teaches / Understand your mistakes), and a single green "Start sparring" button.
4. Confirm the user icon opens the auth modal and closing it returns to the mission screen.
5. Click "Start sparring" → confirm it lands in the onboarding sparring game (easy, player is green/first) exactly as before.
6. Play one move → confirm the coach reacts (the existing onboarding aha), and that reloading now does NOT return to the mission screen (status is now `seen`).
7. In the browser console/network (analytics), confirm `onboarding_started` fired on the mission screen and `onboarding_sparring_started` fired on CTA press (grep the analytics transport, or add a temporary `console.log` in `track` if needed, then remove it).

Expected: all steps pass; the mission screen appears exactly once before the game, and the game/aha/import-offer flow downstream is unchanged.

- [ ] **Step 7: Run the fast test suite (regression guard)**

Run: `npm run test:fast` (from `connect-four/`)
Expected: PASS. In particular, `tests/unit/onboardingRouting.test.js` still passes unchanged (the gate logic did not change), and `tests/urlMapping.test.js` still passes (no urlMapping change).

- [ ] **Step 8: Commit**

```bash
git add connect-four/src/screens/OnboardingMissionScreen.jsx \
        connect-four/src/lib/screenRegistry.jsx \
        connect-four/src/lib/surfaceGroups.js \
        connect-four/src/App.jsx
git commit -m "feat(onboarding): add pre-sparring mission screen and retarget first-run route"
```

---

## Self-Review

**1. Spec coverage** (checked against `2026-07-13-onboarding-mission-screen-design.md`):
- Placement & routing (auto-route retarget, gate unchanged, session-only, no urlMapping change) → Task 2 Steps 2–4 + Global Constraints.
- CTA launches game via `ONBOARDING_GAME_PARAMS` → Task 2 Step 1 (`handleStart`).
- `onboarding_status` untouched → no task changes `onboardingFirstMove.js`/gate; noted in Global Constraints.
- Coach greeting + three pillars (verbatim copy/tints/icons) → Task 1 (copy) + Task 2 Step 1 (`MISSION_PILLARS`, `PillarRow`, `CoachDialog`).
- Top-bar user icon → AuthModal → Task 2 Step 1.
- Single CTA, no skip → Task 2 Step 1 (only one button; no skip control).
- i18n `onboarding.mission.*` keys, en+es lockstep → Task 1.
- Analytics: move `onboarding_started` to mount + add `onboarding_sparring_started` → Task 2 Steps 1 & 4.
- Component reuse map / files-touched → matches Task 2 Files.
- Out-of-scope items (no game/review/import changes, no signed-in changes, no backend) → no task touches them.

**2. Placeholder scan:** No TBD/TODO/"handle edge cases"/"write tests for the above". All code blocks are complete and literal.

**3. Type/name consistency:** `OnboardingMissionScreen` (component), `'onboardingMission'` (SCREENS key + surface key + route target), `ONBOARDING_GAME_PARAMS`, `onboarding_started` / `onboarding_sparring_started` (events), and the seven `onboarding.mission.*` i18n key paths are used identically across Task 1 (produces keys) and Task 2 (consumes keys). The i18n keys referenced in `MISSION_PILLARS`/`CoachDialog`/`cta` exactly match those added in Task 1.
