---
name: project_kb_status
description: "Knowledge base current state — 30 entries done, 9 fact-check errors fixed, gap analysis complete (58 gaps); worked_examples still PENDING"
metadata: 
  node_type: memory
  type: project
  originSessionId: 04c4bf45-005f-4617-8eae-aeefaab3b257
---

## Current state (as of 2026-05-19)

30 entries in `docs/knowledge-base/`:
- 22 canonical entries: Allen T1–T7, Allen V1–V5, Allis 9 rules, allen-j-configuration
- 8 project-local entries: `community-z-threat`, `community-ghost-threat`, `community-parity-trap`, `community-claimodd`, `community-figure-7`, `community-sextuple-threat`, `derived-parity-formula`, `derived-dead-space-parity`

Schema defined in `docs/knowledge-base/README.md`. Template entry: `allen-t4.md` (only fully solver-verified entry at migration time).

## Fact-check audit (2026-05-18)

9 errors fixed:
- Location errors: allen-v5 (p.101→p.102), allen-j-configuration (Ch.5→Ch.7)
- INCOMPLETE predicates: allen-j-configuration (added overcutting + parity-cancellation guards), allen-t2 (sub-case 3 adjacency), allen-t3 (minor-threat variant), allis-aftereven/before/specialbefore (opponent disc rejection), community-claimodd (4 preconditions), community-ghost-threat (wrong expected_behavior)

8 of 9 Allis rules have verified movestrings. Still PENDING: `allis-baseclaim` worked example.

One acknowledged issue: `allen-j-configuration` predicate is over-specified (extra guards from Ch.5 not in the p.117 quote) — documented in `known_limitations`, not a correctness bug.

## Gap analysis (2026-05-19)

**Final report**: `knowledge-base-gaps.md` at project root. **58 gaps** (17 high / 25 medium / 16 low).

Key high-priority gaps:
- Foundational vocabulary: "check" definition, major/minor/strategic threat taxonomy, row parity, adjacent threat pair
- Allen Ch.4 pp.103–104: six minor-threat rules as standalone entries
- Triple Threat variants, Winning Quadruple Threat, J-Shape variants, Undercutting chapter
- Allis combination meta-rules (§5.3–5.4), 9×9 compatibility matrix
- Allis 1993 TSS: formal definitions (gain/cost/rest/dependency)

**How to apply:** When asked to extend the KB or "what's missing from KB", read `knowledge-base-gaps.md`. The part1 file (`knowledge-base-gaps-part1.md`) is subsumed by the final merged file.

## Still PENDING (worked examples)

- `community-sextuple-threat`: movestring construction pending
- `community-parity-trap`: movestring construction pending
- `allis-baseclaim`: verification incomplete
- Most entries: `solver_verified: PENDING` on worked_examples
