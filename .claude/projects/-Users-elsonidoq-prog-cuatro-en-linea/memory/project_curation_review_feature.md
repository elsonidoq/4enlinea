---
name: Curation re-review and delete feature
description: Dashboard buttons to review approved/rejected candidates; Delete button in workspace; server guards relaxed for re-review.
type: project
originSessionId: 4a6524cc-661a-45a7-a002-275e291b6596
---
Implemented 2026-05-07. Allows curators to re-review already-reviewed candidates and permanently delete any candidate.

**Changes made:**
- `GET /api/admin/candidates`: added `rejection_reason` to select; left-joins `false_positive_records` for `annotator_note` when `status=rejected`; merges `goal_prompt`/`difficulty` from `puzzles` when `status=approved`; added `Cache-Control: no-store`
- `POST /api/admin/candidates/:id/approve`: guard changed from `status !== 'pending'` → `status === 'approved'` (allows re-approving rejected candidates)
- `POST /api/admin/candidates/:id/reject`: guard changed to `status === 'rejected'`; re-rejecting an approved candidate deactivates its puzzle (`is_active=false`) by `move_string`
- `DELETE /api/admin/candidates/:id`: permanently deletes candidate; deactivates puzzle if approved
- `CandidateDashboard`: added "Approved (N)" and "Rejected (N)" buttons per row
- `AdminCuratePage`: state changed to `{ category, status }`
- `CurationWorkspace`: accepts `status` prop; fetches correct filtered list; shows mode badge in top bar; Delete button in action row; `rejection_reason` and `goal_prompt` visible inline; pre-populates approve panel and reject modal from stored data
- `RejectModal`: accepts `initialReason` and `initialNote` props

**How to apply:** This is the canonical pattern for the curation admin tool. Any future re-review flows should follow this same structure.
