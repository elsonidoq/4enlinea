---
name: project_kb_status
description: "Knowledge base naming conventions, known limitations, and PENDING items"
metadata: 
  node_type: memory
  type: project
  originSessionId: 04c4bf45-005f-4617-8eae-aeefaab3b257
  modified: 2026-07-28T12:41:05.763Z
---

## KB naming convention

- `allen-` prefix — canonical Allen concepts
- `allis-` prefix — canonical Allis concepts
- `community-` prefix — project-local heuristics
- `derived-` prefix — logical derivations

**Every entry carries one of those prefixes — there is no bare-concept-name file.** Do not cite (or
tell a subagent to read) `docs/knowledge-base/<concept>.md`; that path never exists and the agent
either wastes turns or silently proceeds without the predicate. Verified 2026-07-28: no `undercut.md`,
`overcut.md`, `figure-7.md`, `j-shape.md`, `claimeven.md`, or `z-threat.md`. The real slugs for the
lesson/puzzle vocabulary are `allen-t2` (undercut — "the lower threat undercuts the upper"),
`community-overcut`, `community-figure-7`, `allen-j-configuration`, `allis-claimeven`,
`community-z-threat`. **Always `ls docs/knowledge-base/` or read its README before naming a path** —
the mapping from the product's term to the KB slug is not guessable.

Schema defined in `docs/knowledge-base/README.md`. Template entry: `allen-t4.md`. Fully solver-verified entries: `allen-t4` plus the 6 **opening-theory** entries (added 2026-07-03).

## Opening-theory cluster (added 2026-07-03)

Entries: `allen-opening-principles`, `allen-opening-tables`, `allen-5-4-opening`, `allen-3-4-opening`, `allen-candlesticks-opening`, `allen-third-row-gambit`. From Allen Ch. 9/12/13. **All worked examples solver-verified** (no PENDING). `allen-opening-tables` deliberately does NOT transcribe the full Ch. 9 grid — OCR of the printed table is unreliable; it records verified anchor results + the Opening-Lottery sets only.

### Verifying opening / worked-example movestrings — non-obvious tooling + traps

- To confirm the **game-theoretic value** of any position (who wins under best play), run `node connect-four/server/scripts/reason_engine/TOOLS/optimal_line.mjs <movestring>` — it plays BOTH sides solver-optimally to terminal and prints winner + completing cell + winning window. Stronger than the single-position `scr` row from `./visualize_board.sh`. (This reason-engine TOOL is reusable for KB authoring, not just reason work.)
- **Allen notation → movestring conversion is error-prone.** Allen uses columns A–G (translate A=0…G=6) and 1-based rows; uppercase = first player (Red/Green), lowercase = second player (Black/Gray) — the mover info is LOST once you write a 0-indexed digit movestring (recover it from ply parity). Source is OCR'd, so hand-transcription slips (e.g. `…5531…` mis-typed as `…5311…`, caught this session). ALWAYS verify each converted movestring with `optimal_line.mjs`/`visualize_board.sh`; never trust the OCR'd move list.

## Known limitation

`allen-j-configuration` predicate is over-specified — extra guards from Ch.5 are not in the p.117 quote. Documented in `known_limitations`; not a correctness bug.

## Gap analysis

58 gaps (17 high / 25 medium / 16 low) catalogued in `knowledge-base-gaps.md` at project root. (`knowledge-base-gaps-part1.md` is subsumed by that merged file.) Read it when asked to extend the KB or "what's missing."

## Still PENDING (worked examples)

- `community-sextuple-threat`: movestring construction pending
- `community-parity-trap`: movestring construction pending
- `allis-baseclaim`: verification incomplete
- Most entries: `solver_verified: PENDING` on worked_examples
