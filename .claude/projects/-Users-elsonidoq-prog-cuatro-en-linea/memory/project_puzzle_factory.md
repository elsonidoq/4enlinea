---
name: Puzzle Factory implementation status
description: T001–T024 all done including manual golden path (T023); one bug fixed during golden path
type: project
---

All tasks T001–T024 are complete including the manual golden path verification (T023).

**Why:** Full puzzle factory internal tool implemented across backend (candidate-generator.js, 8 admin API routes) and frontend (CandidateDashboard, CurationWorkspace, PredicateChecklist, RejectModal, MultiMoveSequencer).

**Bug fixed during T023:** `candidates.seed` column was `INTEGER` but mulberry32 PRNG generates values up to 2^32 (exceeds max integer 2,147,483,647). Fixed by `ALTER TABLE candidates ALTER COLUMN seed TYPE bigint` and updated migration `007_puzzle_factory.sql` to use `bigint`.

**Golden path results (all ✅):**
1. Generate cat 1 batch with seed 42 → seed displayed in UI
2. Winning column pre-highlighted on initial render (no server call)
3. Click non-winning column → predicate checklist FAIL within 2s
4. Approve with pre-populated goal prompt, difficulty 3 → puzzle row in DB
5. Reject with False Positive + note → false_positive_records row in DB
6. Exhaust batch → "No more candidates" + "Generate more" shown
7. Generate without seed → random seed
8. Same seed → identical move_strings (reproducibility confirmed)
9. Reject All → pending drops to 0
10. Cat 4 multi-move sequence → cooperative_ai_moves={0} in DB

**How to apply:** Feature is production-ready for internal use; no further implementation needed for puzzle factory.
