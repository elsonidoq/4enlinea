// Guards NO_QUALITY_FILTER_ON_BLUNDER_COUNTS (server/blunderCountInvariant.js, OI-125/FR-021)
// at the two mistake-COUNTING sites in server/index.js that blunderCountsForGames.test.js's
// stub-based test cannot reach (those endpoints are not extracted into pure, importable
// functions): GET /api/coach/category-counts and the countQuery inside GET /api/coach/queue.
//
// This is a source scan, not an HTTP-level test — it isolates each handler's source region by
// its route-registration anchor (the next `app.get(`/`app.post(` line, or EOF) and asserts no
// `.eq('quality', ...)` filter appears in that region. Both blunder- and suboptimal-severity
// rows must count as mistakes; `quality` is a severity label to display, never a count filter.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { NO_QUALITY_FILTER_ON_BLUNDER_COUNTS } from '../../server/blunderCountInvariant.js';

const indexPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../server/index.js');
const source = readFileSync(indexPath, 'utf8');

/**
 * Removes block and line comments from a source region.
 *
 * Load-bearing, not cosmetic: `server/index.js` documents this very invariant in prose that
 * quotes the forbidden call — `// no \`.eq('quality', ...)\` filter here` — so a naive scan
 * matches the comment that exists to describe the rule and reports a violation where the code
 * is in fact compliant. Strip comments first so the scan sees only executable code.
 *
 * The `[^:]` guard on the line-comment rule keeps `http://`-style URLs from being treated as
 * the start of a comment.
 */
function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/**
 * Extracts the source text between a route-registration anchor and the next
 * `app.<method>(` registration (or EOF), with comments stripped.
 */
function extractRouteHandler(anchor) {
  const start = source.indexOf(anchor);
  assert.ok(start !== -1, `anchor not found in server/index.js: ${anchor}`);
  const nextRoute = source.indexOf('\napp.', start + anchor.length);
  const region = nextRoute === -1 ? source.slice(start) : source.slice(start, nextRoute);
  return stripComments(region);
}

const QUALITY_FILTER_RE = /\.eq\(\s*['"]quality['"]/;

// Positive control for the two source scans below. Without this, `stripComments` could silently
// over-strip (or QUALITY_FILTER_RE could stop matching) and both guards would pass vacuously —
// reporting "no quality filter" because they can no longer see any code at all, which is exactly
// the failure mode a source-scanning test is prone to.
test('the scan itself still detects a REAL quality filter (positive control)', () => {
  const offending = `app.get('/api/fake', async (req, res) => {
    // a comment mentioning .eq('quality', ...) must NOT trip the scan
    const q = supabase.from('blunders').select('*').eq('quality', 'blunder');
  });`;
  assert.match(stripComments(offending), QUALITY_FILTER_RE,
    'the scan must flag a genuine .eq(\'quality\', ...) call in executable code');
  const commentOnly = "    // no `.eq('quality', ...)` filter here — both severities are counted\n";
  assert.doesNotMatch(stripComments(commentOnly), QUALITY_FILTER_RE,
    'a comment describing the invariant must NOT be read as a violation');
});

test('NO_QUALITY_FILTER_ON_BLUNDER_COUNTS constant is a non-empty documented string', () => {
  assert.equal(typeof NO_QUALITY_FILTER_ON_BLUNDER_COUNTS, 'string');
  assert.ok(NO_QUALITY_FILTER_ON_BLUNDER_COUNTS.length > 0);
});

test('GET /api/coach/category-counts never filters its count() query on quality (OI-125/FR-021)', () => {
  const handler = extractRouteHandler("app.get('/api/coach/category-counts'");
  assert.doesNotMatch(handler, QUALITY_FILTER_RE,
    'the category-counts count() query must never filter on quality — both severities must be counted');
});

test('GET /api/coach/queue countQuery never filters on quality (OI-125/FR-021)', () => {
  const handler = extractRouteHandler("app.get('/api/coach/queue'");
  // The queue endpoint's applyFilters/pageQuery/countQuery is entirely within this handler
  // region (up to the next app. registration, POST /api/coach/queue/:blunderId/resolve).
  assert.doesNotMatch(handler, QUALITY_FILTER_RE,
    'the /api/coach/queue applyFilters chain (shared by pageQuery and countQuery) must never filter on quality');
});
