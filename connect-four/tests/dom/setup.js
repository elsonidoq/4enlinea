// Registers a jsdom global environment so node:test can render React components,
// and an esbuild-backed loader hook so node:test can import .jsx test/component
// files directly (node has no native JSX support).
// Imported via `node --import ./tests/dom/setup.js --test` (see the test:dom script).
import { register } from 'node:module';

// Shim for `import.meta.env` (Vite-only global) — see jsxLoader.mjs's `define`
// for src/ .js/.jsx modules. An empty object reproduces Vite's own read-an-
// unset-var behavior (`undefined`), so existing `|| ''`/`|| 'fallback'` guards
// in app source apply unchanged.
globalThis.__DOM_TEST_IMPORT_META_ENV__ = {};

register('./jsxLoader.mjs', import.meta.url);

await import('global-jsdom/register');
