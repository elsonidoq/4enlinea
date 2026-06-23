---
name: reference_highlight_metadata_null_categories
description: "Which puzzle categories have highlight_metadata = null vs non-null on the puzzles table, verified against classifier.js source"
metadata: 
  node_type: memory
  type: reference
  originSessionId: e2c1cdc1-0979-476c-b4f4-7486ff14dfb3
---

## Categories with stored `highlight_metadata` (non-null on puzzles table)

| Category | Metadata type |
|---|---|
| `z_threat` | capsule |
| `undercut` | cells |
| `overcut` | cells |
| `figure_7` | cells |
| `j_shape` | cells |

## Categories with `highlight_metadata` = null on puzzles table

| Category | Why null |
|---|---|
| `immediate_threat` | No metadata path in evaluatePredicate (fallthrough) |
| `forced_block` | No metadata path in evaluatePredicate (fallthrough) |
| `double_threat` | No metadata path in evaluatePredicate (fallthrough) |
| `forced_win` | Classifier returns `{matched, cells:[]}` with no highlightMetadata; `highlight_cells` exists on candidates table only and is silently discarded at approval (approval endpoint writes `highlight_metadata: candidate.highlight_metadata ?? null` but never reads `highlight_cells`) |
| `claimeven` | Explicit null in candidate-generator |
| `forbidden_columns` | Uses `highlight_cells` column (different from `highlight_metadata`), not copied to puzzles table |
| `odd_even_threat` | Explicit null in candidate-generator |

## Key traps

- **forced_win is the trickiest**: `computeForcedWinHighlight` produces a 5-cell structure (`hint/loser/hint/loser/winner`) stored on `candidates.highlight_cells`. The approval endpoint copies `highlight_metadata` only — the 5-cell data is silently discarded. If you need forced_win highlights on puzzles, `highlight_cells` must be explicitly copied at approval time.
- **claimodd was removed entirely** — see [[project_claimodd_removal]].

## Related

- [[project_classifier_current_state]] — classifier bug status
- [[project_new_puzzle_categories]] — highlight_metadata schema design
