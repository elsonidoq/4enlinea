---
name: Frontend architecture and component map
description: React app structure, routing, store layer, component hierarchy, key patterns
type: project
---

# Frontend architecture (`connect-four/src/`)

## Entry points

- `index.html` — updated with manifest link, SW registration, title "DecodeC4 — Connect Four Trainer"
- `main.jsx` — mounts `<App />` in StrictMode
- `App.jsx` — root: `<ProfileStoreProvider>` → `<BrowserRouter>` → `<ErrorBoundary>` → `<NavBar>` + lazy `<Routes>`

## Routes

| Path | Component | Notes |
|------|-----------|-------|
| / | HomePage | Sparring mode |
| /puzzles | PuzzlesPage | Puzzle trainer |
| /coach | CoachPage | AI Coach (paid only) |

All page components are lazy-loaded via `React.lazy()`.

## Store layer (`src/store/`)

`ProfileStore.js` — React context provider. Exports `useStore()` → `{ store, session, supabase }`.
- `store` = `IndexedDBStore` (anonymous) or `SupabaseStore` (authenticated)
- Switches on `supabase.auth.onAuthStateChange`; calls `migrateToSupabase()` on first sign-in
- **Note**: `ProfileStore.js` is a `.js` file with NO JSX — uses `StoreContext.Provider({ value, children })` directly to avoid Vite parse error

`IndexedDBStore.js` — local state: profile (UUID), session stats, puzzle attempts, migration
`SupabaseStore.js` — Supabase-backed: same interface; `saveSessionStats` only for paid users

## Key components

- `Board.jsx` + `Column.jsx` + `Piece.jsx` — 6×7 grid; `canPlay`, `highlightedCells`, `onColumnClick` props
- `DeepRevealButton.jsx` — fetches `/api/explain-move` with `requestDeepReveal:true`; gates on auth (403 → AuthModal) and quota (429 → PaywallModal)
- `PaywallModal.jsx` — calls `POST /api/stripe/create-checkout`; redirects to Stripe Checkout URL
- `AuthModal.jsx` + `AuthGate` — magic-link sign-in via `supabase.auth.signInWithOtp()`
- `ErrorBoundary.jsx` — class component; reports to Sentry; wraps entire app in App.jsx

## i18n

`src/i18n/en.json` — all UI strings. Imported in `App.jsx` via `./i18n/index.js`. Uses `useTranslation()` hook. Key namespaces: nav, puzzle, sparring, auth, paywall, coach, error.

## Supabase client

Created in `ProfileStore.js` from `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`. Exported via `getSupabaseClient()` for use outside React context.

## PWA

`public/manifest.json` + `public/sw.js` (shell-only cache, no API caching).

## Build

`npm run build` in `connect-four/` — Vite 8, React 19, react-router-dom v7, react-i18next. Produces `dist/`.
