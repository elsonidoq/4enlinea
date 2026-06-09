import React, { useState, useCallback, useEffect, Suspense, lazy } from 'react';
import { ProfileStoreProvider } from './store/ProfileStore.jsx';
import { DebugProvider } from './context/DebugContext.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { SCREENS } from './lib/screenRegistry.jsx';
import { SURFACE_BG } from './lib/surfaceGroups.js';
import { setActiveScreen, track } from './lib/track.js';
import { buildUrl, parseUrl, SESSION_ONLY_SCREENS } from './lib/urlMapping.js';
import './i18n/index.js';

const AdminCuratePage = lazy(() => import('./pages/AdminCuratePage.jsx'));

function Navigator() {
  const [screen, setScreen] = useState('home');
  const [params, setParams] = useState({});

  // Mount effect: parse the current URL and initialise screen state.
  // Replaces the old effect that just called setActiveScreen('home').
  useEffect(() => {
    const { screenKey, params: initParams } = parseUrl(window.location.pathname);
    const isSessionOnly = SESSION_ONLY_SCREENS.has(screenKey);
    const resolved = isSessionOnly ? 'home' : screenKey;
    const resolvedParams = isSessionOnly ? {} : initParams;
    const resolvedUrl = isSessionOnly ? '/' : buildUrl(resolved, resolvedParams);

    setActiveScreen(resolved);
    setScreen(resolved);
    setParams(resolvedParams);
    window.history.replaceState({ screenKey: resolved, params: resolvedParams }, '', resolvedUrl);
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

  const bgToken = SURFACE_BG[screen] ?? '--bg-home';
  const ScreenComponent = SCREENS[screen];

  return (
    <div style={{ minHeight: '100vh', background: `var(${bgToken})`, transition: 'background 0.2s' }}>
      {ScreenComponent && <ScreenComponent go={go} goBack={goBack} goReplace={goReplace} {...params} />}
    </div>
  );
}

function App() {
  if (window.location.pathname.startsWith('/admin/lessons')) {
    const AdminLessonsPage = lazy(() => import('./pages/AdminLessonsPage.jsx'));
    return <Suspense fallback={null}><AdminLessonsPage /></Suspense>;
  }
  if (window.location.pathname.startsWith('/admin')) {
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
