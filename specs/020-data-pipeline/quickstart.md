# Quickstart: Data Pipeline & Puzzle Counts (Epic 6)

## Pre-requisites

- Node 20+ with ESM support
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` env vars set (see `connect-four/server/.env`)
- `connect-four/` as working directory for all npm commands
- c4solver binary present at `connect-four/server/c4solver` (run `make` in `solver-src/` if missing)

## Implementation Order

```
Phase A (code changes — can be done in any order within the phase):
  1. Register odd_even_threat in server/categories.js + src/lib/categories.js (atomic)
  2. Add challengeSets.js entry
  3. Add PATTERN_KB inline entry to llmCoachHelpers.js
  4. Add i18n key pools to en.json
  5. Implement detectOddEvenThreat in classifier.js
  6. Add evalOddEvenThreat to predicates.js
  7. Write connect-four/scripts/validate-puzzle-counts.mjs
  8. Add tests (positive + negative fixture for odd_even_threat predicate)
  9. Update docs/architecture/data-model.md + server-conventions.md

Phase B (pipeline runs — requires Phase A complete for odd_even_threat):
  10. Run puzzle factory for each under-populated category
      Skip claimodd and undercut (log warning, deferred)
  11. Human curation: approve candidates
  12. CHECKPOINT: verify figure_7 ≥ 1 approved AND j_shape ≥ 1 approved

Phase C (lesson JSON — requires Phase B checkpoint):
  13. DB query → derive boardSpec for lesson-10-figure-7-trap.json
  14. DB query → derive boardSpec for lesson-11-j-shape.json
  15. Visual verify via /api/lessons endpoint + ConceptScreen

Phase D (validation):
  16. SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/validate-puzzle-counts.mjs
  17. npm run test:fast
```

## Key Commands

```bash
# Run tests (fast — skips candidate-generator)
cd connect-four && npm run test:fast

# Run validation script
cd connect-four && SUPABASE_URL=$SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY node scripts/validate-puzzle-counts.mjs

# Visualize a board position (before updating lesson boardSpec)
./visualize_board.sh <movestring>
```

## Key Files

| File | Purpose |
|---|---|
| `connect-four/server/categories.js` | Category slug registry (server) |
| `connect-four/src/lib/categories.js` | Category slug registry (frontend mirror) |
| `connect-four/server/challengeSets.js` | Challenge set display metadata |
| `connect-four/server/classifier.js` | `detectOddEvenThreat` (new) |
| `connect-four/server/predicates.js` | `evalOddEvenThreat` (new case) |
| `connect-four/server/llmCoachHelpers.js` | `PATTERN_KB` update |
| `connect-four/src/i18n/en.json` | i18n key pools |
| `connect-four/scripts/validate-puzzle-counts.mjs` | Validation script (new) |
| `connect-four/lessons/lesson-10-figure-7-trap.json` | boardSpec update (post-curation) |
| `connect-four/lessons/lesson-11-j-shape.json` | boardSpec update (post-curation) |

## Gotchas

- **Atomic category registration**: always update `server/categories.js` and `src/lib/categories.js` in the same commit — they must stay in sync.
- **`SUPABASE_SERVICE_ROLE_KEY`**: the validation script uses this env var name (not `SUPABASE_SERVICE_KEY`).
- **boardSpec encoding**: `'g'` = user's disc (Yellow, since `userPerspective: "yellow"`), `'d'` = opponent's disc (Red). Confirm via ConceptScreen render before accepting.
- **`claimodd`/`undercut` pipeline**: SKIP with a logged warning — do not attempt until Epic 5 ships `detectClaimodd` (it already exists but needs Epic 5 sign-off) and `detectUndercut` is verified.
- **FR-008 edge case**: The `odd_even_threat` predicate requires one odd-row AND one even-row threat (FR-006 conditions). FR-008 (both odd-row → pick higher score) is unreachable under these conditions. Document with a comment in the code; do not implement special logic for it.
