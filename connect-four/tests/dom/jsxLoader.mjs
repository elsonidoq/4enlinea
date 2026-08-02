// ESM loader hook that transforms .jsx files with esbuild before node:test imports them.
// node's built-in module loader has no JSX support (verified empirically: SyntaxError on
// `<div>`); esbuild is the lightest transform available since Vite 8 moved to rolldown and
// no longer bundles esbuild as a dependency here.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { transform } from 'esbuild';

// Vite replaces `import.meta.env.*` with statically-known values at build time; plain
// Node has no such thing, so `import.meta.env` is simply `undefined` and
// `import.meta.env.VITE_API_BASE_URL` throws before the `|| ''` fallback ever runs.
// Every screen/lib module already tolerates an empty API base (`const API =
// import.meta.env.VITE_API_BASE_URL || '';`), so defining the object as empty here is
// exactly Vite's own no-env-file behavior, not a new assumption.
const IMPORT_META_ENV_DEFINE = { 'import.meta.env': '{}' };

export async function load(url, context, nextLoad) {
  if (url.endsWith('.jsx')) {
    const filePath = fileURLToPath(url);
    const source = await readFile(filePath, 'utf8');
    const { code } = await transform(source, {
      loader: 'jsx',
      jsx: 'automatic',
      format: 'esm',
      sourcefile: filePath,
      define: IMPORT_META_ENV_DEFINE,
    });
    return { format: 'module', source: code, shortCircuit: true };
  }
  // Plain (non-JSX) app source under src/ can also reference `import.meta.env` — e.g.
  // src/lib/useLessonLockGuard.js. Route it through the same esbuild define so it
  // doesn't throw under plain Node. Scoped to this repo's src/ tree (not node_modules,
  // not the test files themselves) to keep the shim minimal.
  if (url.endsWith('.js') && url.includes('/connect-four/src/')) {
    const filePath = fileURLToPath(url);
    const source = await readFile(filePath, 'utf8');
    const { code } = await transform(source, {
      loader: 'js',
      format: 'esm',
      sourcefile: filePath,
      define: IMPORT_META_ENV_DEFINE,
    });
    return { format: 'module', source: code, shortCircuit: true };
  }
  // Some source modules (e.g. src/i18n/index.js) import JSON with no `with { type:
  // 'json' }` import attribute — Vite (the app's real bundler) handles that natively,
  // but Node's own ESM loader hard-errors (ERR_IMPORT_ATTRIBUTE_MISSING) without the
  // attribute. Rather than touch app source for a test-environment-only gap, handle
  // .json ourselves unconditionally here (bypassing nextLoad's attribute check) — this
  // does not change behavior for imports that DO carry the attribute (e.g. this
  // directory's own `... with { type: 'json' }` test fixtures), it just also makes the
  // attribute-less form work, matching Vite's behavior.
  if (url.endsWith('.json')) {
    const filePath = fileURLToPath(url);
    const source = await readFile(filePath, 'utf8');
    return { format: 'json', source, shortCircuit: true };
  }
  return nextLoad(url, context);
}
