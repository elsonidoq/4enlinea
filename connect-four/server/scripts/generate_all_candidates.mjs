#!/usr/bin/env node
/**
 * generate_all_candidates.mjs
 *
 * Calls POST /api/admin/generate for each puzzle category with count=100.
 * Mimics clicking the "Generate" button in the admin curate page for every category.
 *
 * Usage:
 *   cd connect-four/server
 *   node scripts/generate_all_candidates.mjs [--dry-run] [--category z_threat]
 *
 * Options:
 *   --dry-run       Log what would happen without calling the API.
 *   --category cat  Generate for a single category instead of all.
 *   --count N       Number of candidates per category (default 100).
 *   --port N        Server port (default 3001).
 */

const CATEGORIES = [
  'immediate_threat', 'forced_block', 'double_threat',
  'forced_win', 'forbidden_columns',
  'odd_even_threat',
  'z_threat', 'claimeven', 'undercut', 'overcut', 'figure_7', 'j_shape',
];

const args = process.argv.slice(2);

// Task 27 (finding 25): --help was previously ignored, silently running a full 100/category
// generation instead — an expensive (real solver calls per candidate), destructive (DB writes)
// surprise for anyone just probing the script. Per memory feedback_scripts_meaningful_help,
// this MUST be checked before any required-arg validation, env load, or file read — it exits 0
// doing NO work, no matter what else is on the command line.
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
generate_all_candidates.mjs — generate puzzle candidates for every category (or one category)
by calling POST /api/admin/generate against a running local server.

⚠️  COST WARNING: this calls the real c4solver once per candidate and WRITES rows to the
    'candidates' table in the database the server is pointed at. Default count=100/category
    across 12 categories can mean 1000+ solver calls and DB inserts. Use --count for a cheap
    smoke test, and --dry-run to see what would run without calling anything.

Usage:
  node scripts/generate_all_candidates.mjs [options]

Options:
  --help, -h       Show this help and exit. Does NOT generate anything.
  --dry-run        Log what would happen without calling the API (no DB writes).
  --category CAT   Generate for a single category instead of all ${CATEGORIES.length}
                    (${CATEGORIES.join(', ')}).
  --count N        Target candidates per category (default: 100).
  --port N         Server port to call (default: 3001). Server must already be running
                    (cd connect-four/server && npm run server, or npm run dev).

Examples:
  node scripts/generate_all_candidates.mjs --help
  node scripts/generate_all_candidates.mjs --dry-run
  node scripts/generate_all_candidates.mjs --category undercut --count 10
`);
  process.exit(0);
}

const dryRun = args.includes('--dry-run');
const catFlag = args.indexOf('--category');
const countFlag = args.indexOf('--count');
const portFlag = args.indexOf('--port');

const targetCategory = catFlag >= 0 ? args[catFlag + 1] : null;
const count = countFlag >= 0 ? parseInt(args[countFlag + 1], 10) : 100;
const PORT = portFlag >= 0 ? parseInt(args[portFlag + 1], 10) : 3001;

const BASE = `http://localhost:${PORT}`;

const MAX_BATCHES = 2; // safety limit per category

const categories = targetCategory ? [targetCategory] : CATEGORIES;

console.log(`Generating at least ${count} candidates per category for ${categories.length} categories.`);
console.log(`(Will retry up to ${MAX_BATCHES} batches per category until target is met.)`);
if (dryRun) console.log('[DRY RUN] No API calls will be made.\n');

const results = [];

for (const category of categories) {
  const label = `${category} (${results.length + 1}/${categories.length})`;
  const t0 = Date.now();
  let totalInserted = 0;
  let batches = 0;
  const runIds = [];

  console.log(`\n[${label}] Target: ${count} candidates...`);

  if (dryRun) {
    console.log(`  Would POST ${BASE}/api/admin/generate { category: "${category}", count: ${count} } (loop until ≥${count})`);
    results.push({ category, dry: true });
    continue;
  }

  while (totalInserted < count && batches < MAX_BATCHES) {
    batches++;
    const remaining = count - totalInserted;
    const batchSize = Math.min(remaining, count); // request up to `count` per batch

    try {
      const resp = await fetch(`${BASE}/api/admin/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, count: batchSize }),
      });

      const body = await resp.json();

      if (!resp.ok) {
        console.error(`  Batch ${batches}: FAILED (${resp.status}): ${body.error}`);
        results.push({ category, ok: false, status: resp.status, error: body.error, batches });
        break; // stop retrying this category on server error
      }

      totalInserted += body.inserted;
      runIds.push(body.generation_run_id);
      const pct = Math.min(100, Math.round((totalInserted / count) * 100));
      console.log(`  Batch ${batches}: +${body.inserted} inserted (total ${totalInserted}/${count}, ${pct}%) — seed=${body.seed} ${body.duration_ms}ms`);
    } catch (err) {
      console.error(`  Batch ${batches}: ERROR — ${err.message}`);
      results.push({ category, ok: false, error: err.message, batches });
      break; // stop retrying on network error
    }
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  if (!dryRun) {
    if (totalInserted >= count) {
      console.log(`  ✅ DONE — ${totalInserted} inserted in ${batches} batch(es) (${elapsed}s)`);
    } else if (batches >= MAX_BATCHES) {
      console.log(`  ⚠️  HIT BATCH LIMIT — ${totalInserted}/${count} after ${MAX_BATCHES} batches (${elapsed}s)`);
    }

    results.push({
      category,
      ok: totalInserted > 0,
      inserted: totalInserted,
      batches,
      runIds,
      hitLimit: batches >= MAX_BATCHES && totalInserted < count,
    });
  }
}

// ── Summary ──────────────────────────────────────────────────────────────────────

console.log('\n══════════════════════════════════════════');
console.log('Summary');
console.log('══════════════════════════════════════════');

let totalInserted = 0;
let failures = 0;
let atLimit = 0;
for (const r of results) {
  if (r.ok) {
    totalInserted += r.inserted ?? 0;
    const limitNote = r.hitLimit ? ` ⚠️ HIT BATCH LIMIT (${r.batches} batches)` : '';
    console.log(`  ✅ ${r.category}: ${r.inserted} inserted in ${r.batches} batch(es)${limitNote}`);
    if (r.hitLimit) atLimit++;
  } else if (r.dry) {
    console.log(`  🔹 ${r.category}: dry-run`);
  } else {
    failures++;
    console.log(`  ❌ ${r.category}: ${r.error} (after ${r.batches ?? 0} batch(es))`);
  }
}

console.log(`\nTotal inserted: ${totalInserted}`);
if (failures > 0) console.log(`Failures: ${failures}`);
if (atLimit > 0) console.log(`Hit batch limit: ${atLimit} category(s)`);
console.log('Done.');
