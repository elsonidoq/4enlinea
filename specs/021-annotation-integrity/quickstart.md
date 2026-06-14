# Quickstart: Annotation Integrity Gate

## Running the Regression Harness

```bash
cd connect-four
npm run test:fast
```

The test file `server/annotationGate.test.js` is included in the `test:fast` pattern (which uses `jest --testPathIgnorePatterns candidate-generator.test.js`). To run only the annotation gate tests:

```bash
npx jest server/annotationGate.test.js
```

No server, database, or solver is needed. All fixture data is embedded statically in the test file.

## Manual Testing Against the Real Endpoint

1. Start the server: `npm run dev` (from `connect-four/`)
2. Send a request to `POST /api/explain-move-llm` with a known-failing position

```bash
curl -X POST http://localhost:3001/api/explain-move-llm \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"movestring":"341441","col":2}'
```

3. Verify the response is valid (no zone annotations that violate P1–P6).
4. Check `deep_reveal_failures` table for rejected outputs:

```bash
# Via psql or Supabase dashboard
SELECT * FROM deep_reveal_failures ORDER BY created_at DESC LIMIT 5;
```

## What to Verify After Implementation

1. `npm run test:fast` passes (all fixture assertions green)
2. All known-failing `llm_feedback` fixtures are rejected:
   - `58f99d33` (P2) → rejected
   - `e094ee00`, `b6071ab4`, `5a10047c`, `972f74e1`, `092f4340`, `0f0d66b3` (P3) → rejected
   - `e86eeac9`, `8d83947e` (P5 board-only) → rejected
   - `403a21c9` (P5 strong form) → marked deferred
   - `59a11a79`, `f4241ea6` (P1, Epic B grounding) → passed (not rejected)
3. P6 synthetic fixtures pass/fail as specified
4. Quota is NOT decremented when the gate rejects output (both initial and retry fail)
5. Quota is decremented exactly once when the gate passes (regardless of retry)
6. `deep_reveal_failures` row is written with all fields populated when both attempts fail
7. Tier-1 fallback is served with `"Detailed explanation unavailable."` when no cache row exists
