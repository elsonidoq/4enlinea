---
name: project_boot_path_env_read_crash
description: Reason-engine CLI modules read .env at import time; imported into server boot → crash-loops prod (no .env file)
metadata: 
  node_type: memory
  type: project
  originSessionId: bd3ce184-7933-4973-9025-21d38c3034f9
---

A bare top-level `readFileSync('.../.env')` in any module reachable from `server/index.js`
crash-loops the **production** server: prod has no `.env` file (env vars come from the
Railway platform), so the read throws `ENOENT` at import time before the server can listen.

The trap is that the offenders LOOK like standalone CLI scripts but are on the boot path:
`index.js` → `mechanismExplainer.mjs` → `scripts/compute.mjs` → `reason_engine/reasonEngine.mjs`.
Both `compute.mjs` and `reasonEngine.mjs` historically loaded `.env` as an import side-effect.
This surfaced 2026-07-07 (the `integration` commit wired the reason engine into `/api/explain-move-llm`
via `computeMechanism`). It presents as a Railway crash-restart loop: `0 pending migrations` then
`ENOENT ... /app/server/.env` on repeat.

**Why:** env-loading was written for `node -e`/CLI use, where `../.env` resolves to a real file;
becoming a server import dependency was never re-validated.

**How to apply:** route any `.env` load through `boardUtils.loadEnv`, which no-ops on a missing
file (ENOENT) and re-throws other errors. Never add a bare `readFileSync` of `.env` to a
boot-reachable module. To audit the whole boot graph, statically walk imports from `index.js`
and flag top-level `.env` reads — don't fix one and assume you're done (this was whack-a-mole:
fixing `reasonEngine` just moved the crash to `compute.mjs`). See [[reference_llm_model_env_vars]],
[[reference_inline_node_scripts]]. Arch note: `server-conventions.md` §"LLM Explanation Scripts".
