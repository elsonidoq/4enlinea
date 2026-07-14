// Registers a jsdom global environment so node:test can render React components,
// and an esbuild-backed loader hook so node:test can import .jsx test/component
// files directly (node has no native JSX support).
// Imported via `node --import ./tests/dom/setup.js --test` (see the test:dom script).
import { register } from 'node:module';

register('./jsxLoader.mjs', import.meta.url);

await import('global-jsdom/register');
