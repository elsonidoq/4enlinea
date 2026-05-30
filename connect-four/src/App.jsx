import React, { useState, useCallback, useEffect, Suspense, lazy } from 'react';
import { ProfileStoreProvider } from './store/ProfileStore.jsx';
import { DebugProvider } from './context/DebugContext.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { SCREENS } from './lib/screenRegistry.jsx';
import { SURFACE_BG } from './lib/surfaceGroups.js';
import { setActiveScreen, track } from './lib/track.js';
import './i18n/index.js';

const AdminCuratePage = lazy(() => import('./pages/AdminCuratePage.jsx'));

function Navigator() {
  const [screen, setScreen] = useState('home');
  const [params, setParams] = useState({});
  const [prevScreen, setPrevScreen] = useState(null);

  useEffect(() => {
    setActiveScreen('home');
    track('session_start', { screen: 'home' });
  }, []);

  const go = useCallback((key, newParams = {}) => {
    if (!SCREENS[key]) {
      console.warn(`[navigator] unknown screen key: ${key}`);
      return;
    }
    setActiveScreen(key);
    track('screen_viewed', { screen: key });
    setPrevScreen(screen);
    setParams(newParams);
    setScreen(key);
  }, [screen]);

  const goBack = useCallback(() => {
    if (prevScreen) {
      setActiveScreen(prevScreen);
      track('screen_viewed', { screen: prevScreen });
      setScreen(prevScreen);
      setParams({});
      setPrevScreen(null);
    }
  }, [prevScreen]);

  const bgToken = SURFACE_BG[screen] ?? '--bg-home';
  const ScreenComponent = SCREENS[screen];

  return (
    <div style={{ minHeight: '100vh', background: `var(${bgToken})`, transition: 'background 0.2s' }}>
      {ScreenComponent && <ScreenComponent go={go} goBack={goBack} {...params} />}
    </div>
  );
}

function App() {
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
