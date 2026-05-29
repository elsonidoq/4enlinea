---
name: Explain endpoint — best-moves-only filtering (current architecture)
description: explainSearch uses the opening book directly (O(1)) to filter to optimal moves; no second Solver instance; server runs with the book loaded.
type: project
originSessionId: 7010beef-535b-49b7-9ff1-32b14a751cc9
---
**Last updated 2026-04-30**

## Current architecture (after performance fix)

`explainSearch` filters candidates using `book.get(P2)` directly — an O(1) hash lookup on the main solver's already-loaded book. No second `Solver` instance is created.

- If position is **in the book** (≤14 moves): use the exact book score to rank candidates. Only the best-scoring moves are recursed into.
- If position is **beyond book depth** (>14 moves): all candidates get score=0 → recurse into ALL non-losing moves (old behaviour, acceptable at deep levels).

## Why the scorer was removed

The previous version created a `Solver scorer` inside `explain()` and called `scorer.solve(P2, weak=true)` at every node. Root cause of slowness:

1. Each `Solver` allocates an 80MB transposition table → two instances = 160MB TT + 64MB books = OOM on low-memory runs
2. Positions beyond book depth (>14 moves) required full alpha-beta in the scorer → 130 µs/call × 3.5M calls = 456 seconds for "4" (1-move position)
3. The 500k node limit on `this->nodeCount` did NOT bound the scorer's internal nodeCount

## Opening book — now consistent

- **Scores endpoint** (`/api/scores`): persistent process `['-a']`, loads `7x6.book` → fast exact scores
- **Explain endpoint** (`/api/explain`): fresh process per request `['-x']` (no `-nb`), loads `7x6.book` → book used for O(1) move filtering

The `-nb` flag still exists in `main.cpp` but is no longer used by the server.

## Timing results (2026-04-30, server binary)

| Position | Moves | Time |
|----------|-------|------|
| "4"      | 1     | 490ms |
| "445"    | 3     | 102ms |
| "44556"  | 5     | 23ms  |

Previously: "4" = 24 minutes, "445" = 10 seconds.

## Key files

- `solver-src/Solver.cpp`: `explainSearch()` and `explain()` — book.get() filtering loop
- `solver-src/Solver.hpp`: `explainSearch` signature (no scorer param), `loadBook()` saves path
- `connect-four/server/index.js`: explain spawn args changed from `['-x', '-nb']` to `['-x']`

**How to apply:** If explain heatmaps seem wrong, check the `book.get(P2)` filtering loop in `explainSearch`. If explain is slow on early positions, the book file may not be loading — look for "Unable to load opening book" in server stderr.
