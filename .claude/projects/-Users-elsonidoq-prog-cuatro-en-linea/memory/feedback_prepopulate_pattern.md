---
name: Pre-populate reviewed data — always fetch all related fields upfront
description: When adding UI to re-review already-reviewed records, fetch ALL stored fields (including those in joined tables) in the same API call that loads the list.
type: feedback
originSessionId: 4a6524cc-661a-45a7-a002-275e291b6596
---
When building a "re-review" flow for records that have already been reviewed, identify every field the UI needs to pre-populate and make sure the list endpoint returns all of them in one shot — including fields stored in related tables via joins.

**Why:** During the curation re-review feature (2026-05-07), `rejection_reason` (on `candidates`) and `annotator_note` (on `false_positive_records`, joined by `candidate_id`) needed to pre-populate the RejectModal. Only `rejection_reason` was added to the select initially. `annotator_note` was missed because it lives in a separate table. This caused multiple back-and-forth rounds: first discovering the field was missing, then discovering the join was missing, plus a browser caching bug (304 Not Modified from a stale ETag) that added more rounds. Total cost was high for what should have been a one-pass change.

**How to apply:** Before implementing a pre-population feature, explicitly list every field the UI form needs, trace each one to its source table, and add all necessary selects/joins to the API endpoint in a single edit. Also add `Cache-Control: no-store` to any admin list endpoint that returns mutable data, to avoid stale 304 responses masking data changes.
