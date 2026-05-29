---
name: project-kb-audit
description: Status of the KB fact-check audit — which errors were found, fixed, and re-verified
metadata: 
  node_type: memory
  type: project
  originSessionId: 7254fb2b-023e-4bf7-a3df-19d70a686b67
---

Original audit found failures in 17/30 entries. Full report in `fact_checking_result.md`.

## Round 1 fixes (2026-05-18)

9 errors fixed (all from the audit's explicit fix list, excluding worked_examples which were out of scope):

| File | Error type | Fix applied |
|---|---|---|
| allen-v5 | LOCATION_WRONG | p.101 → p.102 (PDF-verified) |
| allen-j-configuration | LOCATION_WRONG | Ch.5 → Ch.7 (Minor Threats), p.117 (PDF-verified) |
| allen-j-configuration | NOT_FOUND | Removed unverifiable Allen 1990 glossary paragraph from verbatim_quote |
| allen-j-configuration | INCOMPLETE | Added overcutting + parity-cancellation guards to j_configuration() predicate |
| allen-t2 | INCOMPLETE | Sub-case 3 (Red odd below Black even) now requires adjacent rows (upper.row == lower.row + 1) |
| allen-t3 | INCOMPLETE | Added t3_pairs_minor() for minor-threat variant (Allen explicit note) |
| allis-aftereven | INCOMPLETE | can_aftereven() now rejects groups containing opponent discs |
| allis-before | INCOMPLETE | can_before() now rejects groups containing opponent discs (Allis §6.8) |
| allis-specialbefore | INCOMPLETE | can_specialbefore() now rejects (a) opponent discs and (b) empty squares in row 6 |
| community-claimodd | INCOMPLETE | Guard block added validating all 4 preconditions before applying strategy |
| community-ghost-threat | WRONG expected_behavior | Corrected: Red wins from movestring `1115222555577773663636617`; removed false ghost-threat claim |

## Round 2 re-check (2026-05-18)

All 9 entries re-verified by parallel agents (Allen ×4, Allis ×3, Community ×2).

**8/9 entries fully clear.**

One remaining issue in `allen-j-configuration`:
- **Predicate — OVERSPECIFIED (acknowledged, not a logic error):** formal predicate includes overcutting + parity-cancellation guards from Allen Ch.5 that are absent from the `statement` field and the p.117 verbatim quote. These extras are explicitly documented in `known_limitations` and are valid Allen-derived conditions. Not a correctness bug.
- **Examples — FIXED (2026-05-18):** first worked example used Allen letter-notation `"D1 d2 D3 el E2 d4 E3"` which `visualize_board.sh` rejects. Converted to numeric `"4445545"`. The `expected_behavior` was already correct in substance.

**Why:** All 9 errors were pure predicate/metadata fixes; worked_examples were explicitly out of scope.

**Remaining open issues from original audit:** See `fact_checking_result.md` for full report.

## Allis worked_examples fill (2026-05-18)

8 of 9 Allis rules now have verified movestrings in their KB files (see [[allis-rule-examples]]):
claimeven (×2), baseinverse, vertical, aftereven, lowinverse, highinverse, before.

Still PENDING: **baseclaim** (movestring `1` failed verification — no Red threats) and **specialbefore** (agent completed but movestring not captured).
