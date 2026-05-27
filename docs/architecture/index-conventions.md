# Index Conventions

This document describes which fields use 0-based vs 1-based indexing across move strings,
the database, the server API, and the frontend.

## Coordinate System

The board is 7 columns × 6 rows. Internal code uses:
- **column**: 0–6, left to right
- **row**: 0–5, bottom to top (row 0 = bottom, row 5 = top)

## Move Strings

Move strings (e.g. `"3342"`) encode columns as **0-indexed** (0–6) throughout the entire
codebase — in the DB, on the wire, and in all server/frontend logic.

The c4solver binary requires 1-indexed digits (`1–7`). The single conversion point is
inside `c4solver-wrapper.js` `query()`, which adds 1 to each character just before writing
to the solver's stdin. No other file should perform this conversion.

```js
// c4solver-wrapper.js only — nowhere else
const solverInput = moveString.split('').map(ch => (parseInt(ch, 10) + 1).toString()).join('');
process.stdin.write(solverInput + '\n');
```

## Database Columns

| Column | Table(s) | Convention |
|---|---|---|
| `move_string` | `puzzles`, `candidates` | **0-indexed** columns (digits `0–6`) |
| `correct_col` | `puzzles`, `candidates` | **0-indexed** |
| `highlight_metadata` (jsonb) | `puzzles`, `candidates` | all sub-fields 0-indexed (see below) |
| `solver_scores` (jsonb) | `candidates` | array index 0–6, 0-indexed column |

## `highlight_metadata` JSON Structure

The jsonb field can have two shapes. All coordinate fields inside are **0-indexed**.

### Capsule (used by `z_threat`)

```json
{
  "type": "capsule",
  "column": 3,
  "fromRow": 1,
  "toRow": 3,
  "badgeCount": 3
}
```

`column`, `fromRow`, `toRow` are all 0-indexed.

### Cells (used by `undercut`, `overcut`, `figure_7`, `j_shape`)

```json
{
  "type": "cells",
  "cells": [
    { "column": 2, "row": 0, "role": "killing_threat" },
    { "column": 2, "row": 3, "role": "dead_threat" }
  ]
}
```

`column` and `row` in every cell are 0-indexed.

## Server API (Request and Response)

| Field | Direction | Convention |
|---|---|---|
| `candidateCol` (request body) | client → server | **0-indexed** |
| `correct_col` (query param) | client → server | **0-indexed** |
| `correctCol` (response JSON) | server → client | **0-indexed** |
| `highlightMetadata` (response JSON) | server → client | all sub-fields 0-indexed |

The API response is the DB value passed through with snake_case → camelCase renaming;
no index transformation occurs.

## Frontend Display

The frontend converts 0-indexed values to 1-indexed **only at the display layer**:

```jsx
Col {postReveal.col + 1}        // postReveal.col is 0-indexed
Z-threat: col {highlight_metadata.column + 1}
```

All internal state (`col`, highlight array indices) stays 0-indexed until
the string is rendered to the user.

## `highlightedCells` Array (Frontend Internal)

The `highlightedCells` array used inside `CurationWorkspace` and passed to `Board` has
the shape `[row, column, role]` — both indices are **0-indexed**.

## Pitfall: Mixing Conventions

The most common source of off-by-one bugs is writing a value derived from
`highlight_metadata.column` (0-indexed) into a context that expects 1-indexed (e.g.
building a move string manually), or vice versa.

**Rule**: Add 1 only when converting to a user-facing display string. Never add 1 when
building a move string, storing to the DB, or sending via the API. The only legitimate
`+ 1` near a move string is inside `c4solver-wrapper.js`.
