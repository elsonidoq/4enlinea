---
name: feedback_scripts_meaningful_help
description: New/relevant project scripts must ship a meaningful --help/-h toggle
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 56be8f8a-5387-4d40-824e-9c14127a684a
---

Every relevant project CLI script (the human-invoked entry points under `connect-four/scripts/`
and `connect-four/server/scripts/`, plus their shell wrappers) must provide a **meaningful**
`--help` / `-h` toggle: not just a usage line, but the purpose, each option with its default, and
any required env/setup. Print it and `process.exit(0)`.

**Why:** these scripts encode non-obvious pipelines (reason-eval, board selection, blunder
reprocessing) whose flags aren't discoverable; a real `--help` is the contract.

**How to apply:**
- Define a `HELP` string near the arg parser; check `process.argv.includes('--help') || '-h'`
  and exit 0 BEFORE any required-arg validation (so `--help` never errors on missing `--input`).
- If the file is also imported (e.g. `compute.mjs` exports `buildEvidenceRow` for tests), put the
  help-exit INSIDE the `process.argv[1] === fileURLToPath(import.meta.url)` entry guard so import
  never triggers `process.exit`. Pure CLI-only files (e.g. `select_boards.mjs`) can check at module scope.
- Reference implementations: `connect-four/server/scripts/compute.mjs` and `.../select_boards.mjs`.

Rollout status (2026-07-02): only `compute.mjs` and `select_boards.mjs` done so far; the other
~20 CLI entry points listed in the script inventory still need it. See [[reference_inline_node_scripts]].
