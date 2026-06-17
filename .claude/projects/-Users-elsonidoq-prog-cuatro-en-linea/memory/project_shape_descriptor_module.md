---
name: project_shape_descriptor_module
description: shapeDescriptor.js module — canonical shape extraction for all 14 puzzle categories
metadata: 
  node_type: memory
  type: project
  originSessionId: 8e7f98dd-1a31-40fd-9f3a-a9839cc9bdbe
---

`server/shapeDescriptor.js` is the single module for puzzle shape extraction, created for Epic 6 (spec 035).

## Exports

- `bucketColZone(col)` — 0-1 → `'left'`, 2-4 → `'center'`, 5-6 → `'right'`
- `bucketRowZone(row)` — 0-1 → `'low'`, 2-3 → `'mid'`, 4-5 → `'high'`
- `serialize(descriptor)` — canonical deterministic serializer: sort keys alphabetically, `key=value`, join with `|`, nested objects in `(...)`
- `descriptorForPuzzle(puzzle)` — dispatches on `puzzle.category`, returns `{ orientation, subtype, col_zone, row_zone }`
- `shapeKeyForPuzzle(puzzle)` — convenience: `serialize(descriptorForPuzzle(puzzle))`

## Imports

- `Board`, `checkWin` from `./classifier.js`
- `computeForcedWinHighlight` from `./candidate-generator.js`

## Category dispatch

- **Board-replay** (construct `new Board(puzzle.move_string)`): immediate_threat, forced_block, double_threat, forbidden_columns, claimeven, claimodd, odd_even_threat
- **Storage-metadata** (read `puzzle.highlight_metadata`): z_threat, undercut, overcut, figure_7, j_shape
- **Mixed** (read `puzzle.highlight_cells` with board-replay fallback): forced_win

## Serializer contract

All four fields (orientation, subtype, col_zone, row_zone) always appear in output, even when null. Keys sorted alphabetically → output always starts with `col_zone=`. Nested objects (double_threat arms) wrapped in `(...)`.

**Why:** The serializer must be deterministic regardless of JS engine key-insertion order. This is load-bearing — shape_keys are used to group puzzles during reindex, and different serializations would split identical shapes into different groups.

## Related

- [[project_epic6_architecture]] — full Epic 6 implementation status
- [[reference_highlight_metadata_null_categories]] — which categories have null highlight_metadata
