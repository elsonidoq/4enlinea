# Quickstart: Puzzle Curation & Classifier Fixes

## Prerequisites

- Node.js 20+ with the `c4solver` binary and `7x6.book` present at `connect-four/server/`
- Supabase credentials in `.env` (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
- Server running: `cd connect-four/server && node index.js`
- Frontend running: `cd connect-four && npm run dev`

## Apply the DB migration

```bash
# From repo root — run against your Supabase project
psql "$DATABASE_URL" -f connect-four/server/migrations/009_curation_fixes.sql
```

Or apply via Supabase SQL editor.

## Run the test suite

```bash
cd connect-four
node --test tests/classifier/classifier.test.js
node --test tests/integration/candidate-generator.test.js
node --test                           # full suite
```

The classifier regression tests cover all 8 known false-positive records (C1/C2/C3). All should pass after the fixes.

## Verify the classifier fixes manually

```bash
# C1 fix: odd moveCount, score == immediateWinScore but not a real immediate win
# Expected: NOT tagged immediate_threat
node -e "
import('./server/classifier.js').then(({ classify }) => {
  const r = classify('427554542541224', 2, [11,11,13,11,11,-13,11]);
  console.log(r); // should NOT be category 1
});
"

# C2 fix: score > winScore, genuine immediate win
# Expected: tagged immediate_threat
node -e "
import('./server/classifier.js').then(({ classify }) => {
  const r = classify('2333234334222', 4, [5,10,-1000,11,15,11,10]);
  console.log(r); // should be category 1
});
"
```

## Verify the curation UI

1. Open the admin curation view in the browser.
2. Navigate to any category with pending candidates.
3. Confirm the category header shows the name (e.g. "Immediate Threat") not the number.
4. Confirm the highlighted cell appears for Cat 1 candidates (including the C2 false-positive positions).
5. Click "Skip" — the next candidate should load; the skipped one remains pending.
6. Open "Reject" modal; press Escape — modal should close.
7. On the dashboard, the bulk-action button should read "Delete all pending".
8. For any candidate, expand the debug panel — it shows per-ply trace or "no trace available" for legacy records.
