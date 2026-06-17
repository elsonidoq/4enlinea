---
name: reference_highlight_metadata_null_categories
description: Which puzzle categories have highlight_metadata = null vs non-null on the puzzles table, verified against classifier.js source
metadata:
  type: reference
---

Verified against `server/classifier.js` and `server/candidate-generator.js` on 2026-06-16.

## Categories with stored `highlight_metadata` (non-null on puzzles table)

| Category | Metadata type | Verified at |
|---|---|---|
| `z_threat` | capsule | classifier.js:541, candidate-generator.js:439 |
| `undercut` | cells | classifier.js:581, candidate-generator.js:470 |
| `overcut` | cells | classifier.js:630, candidate-generator.js:483 |
| `figure_7` | cells | classifier.js:788, candidate-generator.js:495 |
| `j_shape` | cells | classifier.js:848, candidate-generator.js:507 |

## Categories with `highlight_metadata` = null on puzzles table

| Category | Why null | Verified at |
|---|---|---|
| `immediate_threat` | No metadata path in evaluatePredicate | classifier.js fallthrough |
| `forced_block` | No metadata path in evaluatePredicate | classifier.js fallthrough |
| `double_threat` | No metadata path in evaluatePredicate | classifier.js fallthrough |
| `forced_win` | Classifier returns `{matched, cells:[]}` with no highlightMetadata; `highlight_cells` exists on candidates table only, lost at approval | classifier.js:1265, candidate-generator.js:198, index.js:2497 |
| `claimeven` | Explicit null | candidate-generator.js:451 |
| `claimodd` | Detector returns no highlightMetadata field; also no candidate generation path exists | classifier.js (detectClaimodd) |
| `forbidden_columns` | Uses `highlight_cells` (different column), not `highlight_metadata` | candidate-generator.js |
| `odd_even_threat` | Explicit null | candidate-generator.js:519 |

## Key implications

- **forced_win is the trickiest case**: `computeForcedWinHighlight` produces a 5-cell structure (`hint/loser/hint/loser/winner`) that looks like highlight_metadata but is stored on `candidates.highlight_cells`. The approval endpoint (`index.js` ~line 2497) writes `highlight_metadata: candidate.highlight_metadata ?? null` but never reads `highlight_cells`. The 5-cell data is silently discarded. Epic 6 adds `highlight_cells` to puzzles and fixes the approval copy.
- **claimodd has a working detector but zero generation pipeline**: `detectClaimodd` exists in classifier.js, but `candidate-generator.js`'s `checkPredicate()` has no `claimodd` case. Any claimodd slug reaching `checkPredicate` falls through to `evaluatePredicate` (wrong logic).
- **claimeven was assumed null based on claimodd code proximity** — confirmed null explicitly (candidate-generator.js:451).

## Related

- [[project_epic6_architecture]] — Epic 6 uses this taxonomy for shape descriptor extraction
- [[project_classifier_current_state]] — classifier bug status
- [[project_new_puzzle_categories]] — highlight_metadata schema design
