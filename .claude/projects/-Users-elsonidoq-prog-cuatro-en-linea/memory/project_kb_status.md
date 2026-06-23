---
name: project_kb_status
description: "Knowledge base naming conventions, known limitations, and PENDING items"
metadata: 
  node_type: memory
  type: project
  originSessionId: 04c4bf45-005f-4617-8eae-aeefaab3b257
---

## KB naming convention

- `allen-` prefix — canonical Allen concepts
- `allis-` prefix — canonical Allis concepts
- `community-` prefix — project-local heuristics
- `derived-` prefix — logical derivations

Schema defined in `docs/knowledge-base/README.md`. Template entry (only fully solver-verified entry): `allen-t4.md`.

## Known limitation

`allen-j-configuration` predicate is over-specified — extra guards from Ch.5 are not in the p.117 quote. Documented in `known_limitations`; not a correctness bug.

## Gap analysis

58 gaps (17 high / 25 medium / 16 low) catalogued in `knowledge-base-gaps.md` at project root. (`knowledge-base-gaps-part1.md` is subsumed by that merged file.) Read it when asked to extend the KB or "what's missing."

## Still PENDING (worked examples)

- `community-sextuple-threat`: movestring construction pending
- `community-parity-trap`: movestring construction pending
- `allis-baseclaim`: verification incomplete
- Most entries: `solver_verified: PENDING` on worked_examples
