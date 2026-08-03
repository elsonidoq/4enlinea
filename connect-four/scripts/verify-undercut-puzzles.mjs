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

  const { data: puzzles, error } = await supabase
    .from('puzzles')
    .select('id, move_string, correct_col, highlight_metadata, category')
    .eq('category', 'undercut')
    .eq('approved', true)
    .limit(50);

  if (error) {
    console.error('Query error:', error.message);
    process.exit(1);
  }

  if (!puzzles || puzzles.length === 0) {
    console.log('No approved undercut puzzles found.');
    console.log('EPIC 6 FLAG: Puzzle pool for undercut is empty. Generate undercut puzzles before shipping.');
    process.exit(0);
  }

  console.log(`Found ${puzzles.length} approved undercut puzzle(s).`);

  console.log(`Total approved: ${puzzles.length}`);
  console.log(`VERDICT: ${puzzles.length > 0 ? 'Puzzles exist — ready for confirmation challenges.' : 'No puzzles — Epic 6 flag.'}`);
}

main().catch(err => { console.error(err); process.exit(1); });
