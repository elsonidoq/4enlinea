---
name: project_generate_candidates_fetch_failed_flake
description: "generate_all_candidates.mjs \"fetch failed\" for many categories = environment flake, NOT a broken pipeline"
metadata: 
  node_type: memory
  type: project
  originSessionId: 30a4c144-1075-4ead-8393-e64d75db9197
---

`node server/scripts/generate_all_candidates.mjs` aborting a category with node **`"fetch failed"`** (and inserting 0) is almost always an **environmental flake, not a generation bug**. In the 2026-07-15 QA run it "failed" for 8/12 categories and got filed as a [major] pipeline break — a **false positive**: a later standalone run inserted all 12 categories (115 total) in seconds each (z_threat 4.7s, claimeven 7.3s, undercut 2.9s…).

**Why:** the generator's supabase-js inserts (and solver calls) go over `fetch()`; the connection drops when the environment is under stress. Two triggers seen together:
1. **Local Supabase/Docker just resumed** (containers not yet healthy) → refused/dropped inserts → "fetch failed".
2. **Concurrent solver contention** — running generation *while* the dev API (:3001), Vite (:5173), and a live Chrome QA session are all touching the c4solver. Same root-cause family as the test-suite IPC issue in [[project_integration_test_slowness]] (concurrent solver harvest deadlocks/drops).

**How to apply:** before concluding "generation is broken," re-run it **standalone with a healthy DB and idle servers** (no live QA session driving the solver). Only the standalone result is trustworthy. `forced_win` legitimately under-fills (rare — commonly ~1–5/10, hits the batch limit); that is expected, not a flake. Optional real hardening: add connection retry/backoff on the insert path so a transient drop retries instead of aborting the category. Cross-ref [[project_new_category_wiring_checklist]], [[project_gamesampling_rng_determinism_trap]].
