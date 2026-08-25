import React, { useState, useCallback, useEffect, useRef, Suspense, lazy } from 'react';
import { ProfileStoreProvider, useStore } from './store/ProfileStore.jsx';
import { CheckoutReturnBanner } from './store/CheckoutReturnBanner.jsx';
import { DebugProvider } from './context/DebugContext.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { SCREENS } from './lib/screenRegistry.jsx';
import { SURFACE_BG } from './lib/surfaceGroups.js';
import { setActiveScreen, track } from './lib/track.js';
import { buildUrl, parseUrl, SESSION_ONLY_SCREENS } from './lib/urlMapping.js';
import { readDevBoardParam } from './lib/devBoardParam.js';
import { consumeReturnTo } from './lib/postLoginReturn.js';
import { shouldAutoRouteToOnboarding, shouldRouteHomeAfterSignIn } from './lib/onboardingRouting.js';
import { isLocalhostOrigin } from './lib/isLocalhostOrigin.js';
import { hasFreshPendingSetResults } from './lib/pendingSetResults.js';
import AdminBlockedPage from './pages/AdminBlockedPage.jsx';
import './i18n/index.js';

const AdminCuratePage = lazy(() => import('./pages/AdminCuratePage.jsx'));

function Navigator() {
  const [screen, setScreen] = useState('home');
  const [params, setParams] = useState({});
  // Current screen, readable from effects that must NOT re-run on navigation.
  // Synced in its own effect (not during render — that trips react-hooks' ref rule);
  // effects run in declaration order, so this lands before the [session] effect below
  // reads it in the same commit.
  const screenRef = useRef(screen);
  useEffect(() => { screenRef.current = screen; }, [screen]);
  const { store, session, sessionChecked } = useStore();

  // Mount effect: parse the current URL and initialise screen state.
  // Replaces the old effect that just called setActiveScreen('home').
  useEffect(() => {
    const { screenKey, params: initParams } = parseUrl(window.location.pathname);
    let isSessionOnly = SESSION_ONLY_SCREENS.has(screenKey);
    let resolved = isSessionOnly ? 'home' : screenKey;
    let resolvedParams = isSessionOnly ? {} : initParams;

    // Spec 053 US5 (T059/T060, FR-029/FR-030, OI-25): SESSION_ONLY_SCREENS unconditionally
    // forces 'summary' to 'home' on every cold boot (see urlMapping.js's SESSION_ONLY_SCREENS
    // doc) — but that would defeat "returning from a purchase after a full app restart still
    // shows the same set results", since PostSetSummaryScreen would never even mount to read
    // its own restored sessionStorage entry (src/lib/pendingSetResults.js). Narrow carve-out,
    // 'summary' only: peek (non-destructively — no clearing here) at whether a fresh
    // pendingSetResults entry exists; if so, let the boot land on 'summary' after all so its
    // mount effect can consume + clear it itself. 'game' (this Set's other member) is untouched.
    if (screenKey === 'summary' && hasFreshPendingSetResults()) {
      isSessionOnly = false;
      resolved = 'summary';
      resolvedParams = {};
    }

    // DEV-only: allow cold-booting a seeded Sparring game from /game?devBoard=... (game is
    // session-only, so it would otherwise redirect to home). Entire block stripped from prod.
    if (import.meta.env.DEV && screenKey === 'game') {
      const devParam = readDevBoardParam(window.location.search);
      if (devParam) {
        isSessionOnly = false;
        resolved = 'game';
        resolvedParams = {
          difficulty: devParam.difficulty ?? 'medium',
          side: devParam.side ?? 'first',
          initialMoves: devParam.movestring,
        };
      }
    }

    const resolvedUrl = isSessionOnly ? '/' : buildUrl(resolved, resolvedParams);

    setActiveScreen(resolved);
    setScreen(resolved);
    setParams(resolvedParams);
    // Preserve the hash (magic-link OAuth callback tokens, App.jsx's long-standing
    // trap) AND the query string. Note: spec 050's Paddle.js overlay checkout no
    // longer uses a ?checkout=success|cancelled return-URL param at all —
    // CheckoutReturnBanner.jsx is a pure renderer of checkoutReturnFlow.js's
    // in-memory store, not a query-string reader — but the query string is still
    // preserved here for any other feature that may rely on it surviving this
    // replaceState.
    window.history.replaceState({ screenKey: resolved, params: resolvedParams }, '', resolvedUrl + window.location.search + window.location.hash);
    track('session_start', { screen: resolved });
  }, []);

  // Popstate handler: fires on browser back/forward navigation.
  useEffect(() => {
    function handlePopState(event) {
      let screenKey, params;
      if (event.state?.screenKey) {
        ({ screenKey, params } = event.state);
      } else {
        ({ screenKey, params } = parseUrl(window.location.pathname));
      }
      const isSessionOnly = SESSION_ONLY_SCREENS.has(screenKey);
      const resolved = isSessionOnly ? 'home' : screenKey;
      const resolvedParams = isSessionOnly ? {} : params;

      if (isSessionOnly) {
        window.history.replaceState({ screenKey: 'home', params: {} }, '', '/');
      }

      setActiveScreen(resolved);
      track('screen_viewed', { screen: resolved });
      setScreen(resolved);
      setParams(resolvedParams);
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const go = useCallback((key, newParams = {}) => {
    if (!SCREENS[key]) {
      console.warn(`[navigator] unknown screen key: ${key}`);
      return;
    }
    setActiveScreen(key);
    track('screen_viewed', { screen: key });
    setParams(newParams);
    setScreen(key);
    window.history.pushState({ screenKey: key, params: newParams }, '', buildUrl(key, newParams));
  }, []);

  const goReplace = useCallback((key, newParams = {}) => {
    if (!SCREENS[key]) {
      console.warn(`[navigator] unknown screen key: ${key}`);
      return;
    }
    setActiveScreen(key);
    track('screen_viewed', { screen: key });
    setParams(newParams);
    setScreen(key);
    window.history.replaceState({ screenKey: key, params: newParams }, '', buildUrl(key, newParams));
  }, []);

  const goBack = useCallback(() => {
    window.history.back();
  }, []);

  // FR-013's single named consumption point: whenever `session` transitions to truthy (fresh
  // OAuth completion, or an ordinary cookie-restored mount), consume any stashed post-login
  // return destination. No-op unless a gated CTA actually stashed one — see research.md R3.
  useEffect(() => {
    if (!session) return;
    const dest = consumeReturnTo();
    if (dest) {
      go(dest.screenKey, dest.params);
      return;
    }
    // Nothing stashed: a sign-in completed from an anonymous-only screen's own AuthModal
    // (the auto-route above lands a signed-out user on 'onboardingMission', including right
    // after signOut(), whose fresh IndexedDBStore has no onboarding_status). Without this the
    // screen is byte-identical before and after a *successful* sign-in, so it reads as "log in
    // does not work". screenRef, not `screen`, keeps this effect keyed to the session
    // transition alone — adding `screen` would also fire on Replay intro's deliberate
    // signed-in navigation into onboarding.
    if (shouldRouteHomeAfterSignIn({ screenKey: screenRef.current, hasStashedDestination: false })) {
      go('home');
    }
  }, [session]);

  // Epic 8 — Onboarding Experience, US1 (T018, FR-001/FR-002/FR-014, research.md R3).
  // Anonymous first-run auto-route: only fires once checkSession() has fully resolved
  // (sessionChecked) AND resolved to "no session" — never races OAuth-hash/session
  // restoration, and never auto-routes a signed-in user (settled decision B3/D1).
  useEffect(() => {
    if (!sessionChecked || session) return;
    let cancelled = false;
    (async () => {
      const profile = await store.getProfile();
      if (cancelled) return;
      if (shouldAutoRouteToOnboarding({ sessionChecked, session, onboardingStatus: profile.onboarding_status })) {
        // Route to the mission screen (not the game directly). The mission screen fires
        // track('onboarding_started') on mount and launches the onboarding game via its CTA.
        go('onboardingMission');
      }
    })();
    return () => { cancelled = true; };
    // store/go are intentionally omitted: store only changes alongside session
    // (switchToSupabase sets both), and the effect early-returns whenever session
    // is truthy — so a stale store closure is never used. Matches HomeScreen's
    // fallback-effect pattern.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionChecked, session]);

  const bgToken = SURFACE_BG[screen] ?? '--bg-home';
  const ScreenComponent = SCREENS[screen];

  // Epic 8 — Onboarding Experience, US1 (T017, research.md R3 "cold-boot Home flash"
  // correction). Render a neutral, near-instant "booting" frame until checkSession()
  // has resolved — otherwise Navigator's initial `useState('home')` value would flash
  // the real Home screen before the first-run redirect decision (or consumeReturnTo())
  // can run, violating FR-002/SC-001's "zero intermediate screens".
  if (!sessionChecked) {
    return <div style={{ minHeight: '100vh', background: `var(${SURFACE_BG.home ?? '--bg-home'})` }} />;
  }

  return (
    <div style={{ minHeight: '100vh', background: `var(${bgToken})`, transition: 'background 0.2s' }}>
      <CheckoutReturnBanner />
      {ScreenComponent && <ScreenComponent go={go} goBack={goBack} goReplace={goReplace} {...params} />}
    </div>
  );
}

function App() {
  if (window.location.pathname.startsWith('/admin')) {
    // FR-028: the entire /admin surface (all sub-pages) is localhost-only.
    // Checked BEFORE any lazy() admin-page import so a non-localhost origin
    // never even fetches an admin bundle chunk (defense-in-depth).
    if (!isLocalhostOrigin()) {
      return <AdminBlockedPage />;
    }
    if (window.location.pathname.startsWith('/admin/audio')) {
      const AdminAudioPage = lazy(() => import('./pages/AdminAudioPage.jsx'));
      return <Suspense fallback={null}><AdminAudioPage /></Suspense>;
    }
    if (window.location.pathname.startsWith('/admin/lessons')) {
      const AdminLessonsPage = lazy(() => import('./pages/AdminLessonsPage.jsx'));
      return <Suspense fallback={null}><AdminLessonsPage /></Suspense>;
    }
    if (window.location.pathname.startsWith('/admin/deep-reveal-eval')) {
      const AdminDeepRevealEvalPage = lazy(() => import('./pages/AdminDeepRevealEvalPage.jsx'));
      return <Suspense fallback={null}><AdminDeepRevealEvalPage /></Suspense>;
    }
    if (window.location.pathname.startsWith('/admin/fv-suff')) {
      const AdminFvSuffPage = lazy(() => import('./pages/AdminFvSuffPage.jsx'));
      return <Suspense fallback={null}><AdminFvSuffPage /></Suspense>;
    }
    return <Suspense fallback={null}><AdminCuratePage /></Suspense>;
  }

  return (
    <DebugProvider>
      <ProfileStoreProvider>
        <ErrorBoundary>
          <Navigator />
        </ErrorBoundary>
      </ProfileStoreProvider>
    </DebugProvider>
  );
}

export default App;
