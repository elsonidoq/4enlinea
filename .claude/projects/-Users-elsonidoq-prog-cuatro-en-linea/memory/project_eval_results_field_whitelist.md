---
name: project_eval_results_field_whitelist
description: /api/admin/eval-results/:filename whitelists row fields — new run_eval JSONL fields are silently dropped unless added there too
metadata: 
  node_type: memory
  type: project
  originSessionId: ce1d4cfc-a772-4e5f-9ad3-e197c64bc9c0
---

The admin eval browser endpoint `GET /api/admin/eval-results/:filename` (server/index.js) does NOT pass JSONL rows through verbatim. It maps each parsed line to a **fixed whitelist** of fields (id, board_state, final_response, prompt, attempt1_failures, attempt2_failures, plus whatever has been explicitly added).

**Trap:** adding a new field to `run_eval.mjs`'s output record (e.g. `prompt_data`, `feature_vector`) makes it appear in the JSONL on disk but it will **silently not reach the frontend** — `AdminDeepRevealEvalPage.jsx` renders `null` / nothing — until you ALSO add `field: obj.field ?? null` to the row mapper in that endpoint. (The whitelist keeps the legacy `filtered_prompt_data` key alongside the new `feature_vector` so old result files still render.)

**Why:** the symptom is "the data is in the file but the admin page doesn't show it," which looks like a frontend bug; the actual cause is the server-side whitelist. Check the endpoint mapper first.

Three-site rule when adding an eval field end-to-end: (1) write it in `server/scripts/run_eval.mjs`, (2) forward it in the `/api/admin/eval-results/:filename` mapper in `server/index.js`, (3) render it in `AdminDeepRevealEvalPage.jsx`. See [[reference_deep_reveal_eval_harness]].
