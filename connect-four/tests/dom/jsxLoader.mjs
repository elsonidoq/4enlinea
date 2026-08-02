// ESM loader hook that transforms .jsx files with esbuild before node:test imports them.
// node's built-in module loader has no JSX support (verified empirically: SyntaxError on
// `<div>`); esbuild is the lightest transform available since Vite 8 moved to rolldown and
// no longer bundles esbuild as a dependency here.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { transform } from 'esbuild';

export async function load(url, context, nextLoad) {
  // `import.meta.env.*` is a Vite-only global (VITE_API_BASE_URL etc.) — under
  // plain Node it evaluates to `undefined`, so any `src/` module reading
  // `import.meta.env.SOMETHING` throws "Cannot read properties of undefined".
  // Every DOM test so far has only rendered components with no such reference;
  // SocraticScreen's dependency chain (useLessonLockGuard.js, a plain .js file)
  // is the first to need it. Defining `import.meta.env` as `{}` here reproduces
  // Vite's own behavior for an unset var (reads as `undefined`, so the app's
  // existing `|| ''` fallbacks apply) without hardcoding each var name.
  if (url.endsWith('.jsx') || (url.endsWith('.js') && url.includes('/src/'))) {
    const filePath = fileURLToPath(url);
    const source = await readFile(filePath, 'utf8');
    const { code } = await transform(source, {
      loader: 'jsx',
      jsx: 'automatic',
      format: 'esm',
      sourcefile: filePath,
      define: { 'import.meta.env': 'globalThis.__DOM_TEST_IMPORT_META_ENV__' },
    });
    return { format: 'module', source: code, shortCircuit: true };
  }
  // Vite (the app's real bundler) tolerates a bare `import x from './y.json'` with
  // no `with { type: 'json' }` attribute; plain Node ESM does not (ERR_IMPORT_
  // ATTRIBUTE_MISSING). src/i18n/index.js does exactly that for en.json/es.json.
  // A DOM test rendering any component that transitively imports src/i18n/index.js
  // (e.g. via src/lib/useCoachSpeech.js or src/lib/apiLang.js) hits this. Handle
  // .json here the same way Vite does, so app source doesn't need import-attribute
  // syntax it only needs for this test runner. This only ever ADDS successful
  // resolution for a path that previously always threw — no currently-passing
  // import (all of which already carry an explicit `with { type: 'json' }`) is
  // affected.
  if (url.endsWith('.json')) {
    const filePath = fileURLToPath(url);
    const source = await readFile(filePath, 'utf8');
    return { format: 'json', source, shortCircuit: true };
  }
  return nextLoad(url, context);
}
