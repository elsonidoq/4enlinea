import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Service-worker registration. Moved here from an inline <script> in index.html so
// the production CSP can keep `script-src 'self'` strict (no 'unsafe-inline'/nonce).
// This module is bundled into the self-hosted /assets bundle, which 'self' permits.
// (spec 047 FR-004 code-review.)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
  })
}
