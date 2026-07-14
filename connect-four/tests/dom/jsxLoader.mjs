// ESM loader hook that transforms .jsx files with esbuild before node:test imports them.
// node's built-in module loader has no JSX support (verified empirically: SyntaxError on
// `<div>`); esbuild is the lightest transform available since Vite 8 moved to rolldown and
// no longer bundles esbuild as a dependency here.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { transform } from 'esbuild';

export async function load(url, context, nextLoad) {
  if (url.endsWith('.jsx')) {
    const filePath = fileURLToPath(url);
    const source = await readFile(filePath, 'utf8');
    const { code } = await transform(source, {
      loader: 'jsx',
      jsx: 'automatic',
      format: 'esm',
      sourcefile: filePath,
    });
    return { format: 'module', source: code, shortCircuit: true };
  }
  return nextLoad(url, context);
}
