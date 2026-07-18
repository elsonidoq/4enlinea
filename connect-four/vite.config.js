import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

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
      const output = execSync(scriptPath, { encoding: 'utf8' })
      for (const line of output.split('\n')) {
        const match = line.match(/^export (\w+)=(.+)$/)
        if (!match) continue
        if (match[1] === 'API_PORT' && !apiPort) apiPort = match[2]
        if (match[1] === 'VITE_PORT' && !vitePort) vitePort = match[2]
      }
    } catch {
      // fall through to defaults below
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
      // Legal/pricing pages are server-served static HTML (server/index.js's
      // "Legal pages" routes — LegalFooter.jsx uses plain <a href>, not SPA
      // routes) — found in QA: without these, a full navigation to /pricing
      // etc. under `npm run dev` hits Vite's own SPA fallback (index.html)
      // instead of the API server, and the client router then redirects to
      // Home since these paths aren't registered SPA routes.
      '/pricing': `http://localhost:${apiPort}`,
      '/terms': `http://localhost:${apiPort}`,
      '/privacy': `http://localhost:${apiPort}`,
      '/refunds': `http://localhost:${apiPort}`,
      '/legal.css': `http://localhost:${apiPort}`,
    },
  },
})
