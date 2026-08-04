import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { handleSelfDeriveFailure } from './server/worktreePorts.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

function resolvePorts() {
  let apiPort = process.env.API_PORT
  let vitePort = process.env.VITE_PORT
  if (!apiPort || !vitePort) {
    // worktree-ports.sh is a local dev convenience (git worktree + lsof) and
    // is not present in the Railway build image — fall back to defaults
    // rather than failing the production build.
    try {
      const scriptPath = resolve(__dirname, '..', 'worktree-ports.sh')
      // stdio: only capture stdout (the `export KEY=value` lines); suppress
      // worktree-ports.sh's ownership-probe stderr on a raw, un-sourced run
      // (FR-024 / OI-51).
      const output = execSync(scriptPath, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      for (const line of output.split('\n')) {
        const match = line.match(/^export (\w+)=(.+)$/)
        if (!match) continue
        if (match[1] === 'API_PORT' && !apiPort) apiPort = match[2]
        if (match[1] === 'VITE_PORT' && !vitePort) vitePort = match[2]
      }
    } catch (err) {
      // FR-025/FR-026: inside a linked worktree, a self-derive failure is
      // fatal (refuse to build/start) rather than silently falling back to
      // the main checkout's 3001/5173 — see server/worktreePorts.js. Outside
      // a linked worktree (main checkout, or no .git at all — e.g. the
      // Railway build container), this falls through to the defaults below,
      // unchanged.
      handleSelfDeriveFailure(err)
    }
  }
  return { apiPort: Number(apiPort) || 3001, vitePort: Number(vitePort) || 5173 }
}

const { apiPort, vitePort } = resolvePorts()

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  server: {
    host: true,
    port: vitePort,
    strictPort: true,
    proxy: {
      '/api': `http://localhost:${apiPort}`,
      // Legal pages are server-served static HTML (server/index.js's "Legal
      // pages" routes — LegalFooter.jsx uses plain <a href>, not SPA routes)
      // — found in QA: without these, a full navigation to /terms etc. under
      // `npm run dev` hits Vite's own SPA fallback (index.html) instead of
      // the API server, and the client router then redirects to Home since
      // these paths aren't registered SPA routes.
      //
      // `/pricing` itself is EXCLUDED from this list (spec 057 QA finding,
      // 2026-08-04): since spec 053 it is an in-app SPA route (PricingScreen,
      // urlMapping.js), served by server/index.js's catch-all — which sends
      // the *built* dist/index.html referencing production hashed asset
      // filenames that don't exist under `npm run dev`. Proxying `/pricing`
      // here made a full navigation (or a hard refresh, or the real
      // `/pricing?_ptxn=...` email-link flow FR-013 exists for) white-screen
      // locally with six 404s. `/pricing-legal` is the one still-static page
      // and is proxied explicitly below — Vite's string-prefix proxy
      // matching means a bare `/pricing` entry silently also swallowed
      // `/pricing-legal`, so this is a rename, not just a deletion.
      '/pricing-legal': `http://localhost:${apiPort}`,
      '/terms': `http://localhost:${apiPort}`,
      '/privacy': `http://localhost:${apiPort}`,
      '/refunds': `http://localhost:${apiPort}`,
      '/legal.css': `http://localhost:${apiPort}`,
    },
  },
})
