import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { ProfileStoreProvider } from './store/ProfileStore.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import './i18n/index.js';

const DashboardPage   = lazy(() => import('./pages/DashboardPage.jsx'));
const SparringPage    = lazy(() => import('./pages/HomePage.jsx'));
const PuzzlesPage     = lazy(() => import('./pages/PuzzlesPage.jsx'));
const CoachPage       = lazy(() => import('./pages/CoachPage.jsx'));
const AdminCuratePage = lazy(() => import('./pages/AdminCuratePage.jsx'));

function BottomNav() {
  const itemStyle = ({ isActive }) => ({
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 3,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '.3px',
    textTransform: 'uppercase',
    padding: '6px 0 4px',
    color: isActive ? 'var(--red)' : 'var(--text-muted)',
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'color .15s',
  });

  return (
    <nav style={bottomNav}>
      <NavLink to="/" end style={itemStyle}>
        <span style={{ fontSize: 20, lineHeight: 1 }}>🏠</span>
        <span>Home</span>
      </NavLink>
      <NavLink to="/puzzles" style={itemStyle}>
        <span style={{ fontSize: 20, lineHeight: 1 }}>🎯</span>
        <span>Puzzles</span>
      </NavLink>
      <NavLink to="/sparring" style={itemStyle}>
        <span style={{ fontSize: 20, lineHeight: 1 }}>⚔️</span>
        <span>Sparring</span>
      </NavLink>
      <NavLink to="/coach" style={itemStyle}>
        <span style={{ fontSize: 20, lineHeight: 1 }}>📋</span>
        <span>Coach</span>
      </NavLink>
    </nav>
  );
}

function AppHeader() {
  return (
    <div style={appHeader}>
      <div style={appName}>
        Decode<span style={{ color: 'var(--red)' }}>C4</span>
      </div>
      <div style={appTagline}>Train like you mean it</div>
    </div>
  );
}

function App() {
  return (
    <ProfileStoreProvider>
      <BrowserRouter>
        <ErrorBoundary>
          <AppHeader />
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <Suspense fallback={<div style={{ color: 'var(--text-muted)', padding: 24, textAlign: 'center' }}>Loading…</div>}>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/sparring" element={<SparringPage />} />
                <Route path="/puzzles" element={<PuzzlesPage />} />
                <Route path="/coach" element={<CoachPage />} />
                <Route path="/admin/curate" element={<AdminCuratePage />} />
              </Routes>
            </Suspense>
          </div>
          <BottomNav />
        </ErrorBoundary>
      </BrowserRouter>
    </ProfileStoreProvider>
  );
}

export default App;

const bottomNav = {
  background: 'var(--bg)',
  borderTop: '1px solid var(--border)',
  display: 'flex',
  padding: '0 0 8px',
  flexShrink: 0,
};

const appHeader = {
  padding: '16px 20px 10px',
  flexShrink: 0,
  borderBottom: '1px solid var(--border-dim)',
};

const appName = {
  fontSize: 26,
  fontWeight: 900,
  letterSpacing: '-1px',
  color: 'var(--text)',
  lineHeight: 1,
};

const appTagline = {
  fontSize: 10,
  color: 'var(--text-muted)',
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
  marginTop: 3,
  fontWeight: 500,
};
