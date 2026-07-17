import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Absolute path to the strategy knowledge base as seen at RUNTIME.
 *
 * The KB is authored at the repo root in `docs/knowledge-base/`, but that
 * directory lives outside `connect-four/` and Railway's Railpack build ships
 * only the `connect-four/` subtree — so `../../docs/knowledge-base` resolves to
 * a nonexistent `/docs/...` on the server. Instead every runtime reader uses
 * this vendored copy under `server/kb/`, which IS inside the shipped tree.
 *
 * The copy is committed and kept in sync with docs/ by `npm run sync-kb`
 * (guarded by tests/unit/kbSync.test.js). Do not edit files in server/kb/ by
 * hand — edit docs/knowledge-base/ and re-run the sync.
 */
export const KB_DIR = join(__dirname, 'kb');
