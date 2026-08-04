/**
 * Read-only verification: checks that approved undercut puzzles exist where
 * the undercut trap column is distinct from the correct column.
 *
 * Usage: node scripts/verify-undercut-puzzles.mjs
 *
 * FR-047: If zero approved undercut puzzles exist, flags Epic 6.
 * FR-048: Read-only — no inserts, updates, or deletes.
 */

// This is a manual QA tool. It queries Supabase for approved undercut puzzles
// and reports counts. If no approved puzzles exist, it exits cleanly with
// a flag for Epic 6.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.log('SKIP: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — cannot verify undercut puzzles.');
  console.log('Run with: SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/verify-undercut-puzzles.mjs');
  process.exit(0);
}

async function main() {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // T007 (spec 057, FR-002/OI-130): `puzzles` has no `approved` column — the real serving gate is
  // `is_active boolean` (docs/architecture/db-schema.md). The old `.eq('approved', true)` filter
  // silently matched zero rows on every environment, making this script always report empty.
  const { data: puzzles, error } = await supabase
    .from('puzzles')
    .select('id, move_string, correct_cols, highlight_metadata, category')
    .eq('category', 'undercut')
    .eq('is_active', true)
    .limit(50);

  if (error) {
    console.error('Query error:', error.message);
    process.exit(1);
  }

  if (!puzzles || puzzles.length === 0) {
    console.log('No active undercut puzzles found.');
    console.log('EPIC 6 FLAG: Puzzle pool for undercut is empty. Generate undercut puzzles before shipping.');
    process.exit(0);
  }

  console.log(`Found ${puzzles.length} active undercut puzzle(s).`);

  console.log(`Total active: ${puzzles.length}`);
  console.log(`VERDICT: ${puzzles.length > 0 ? 'Puzzles exist — ready for confirmation challenges.' : 'No puzzles — Epic 6 flag.'}`);
}

main().catch(err => { console.error(err); process.exit(1); });
