---
name: project-test-fast-edit-hazard
description: package.json's test:fast is ONE 7146-char line of 184 files — an agent editing it by exact-match string replace stalls or dies
metadata:
  type: project
---

`connect-four/package.json`'s `test:fast` script is a **single line of ~7,150 characters** naming 184
test files. Registering a new test file means appending to that line — and an exact-match edit has to
reproduce the whole thing twice (old + new), ~14 KB in one tool call.

**Measured 2026-08-11:** two consecutive implementer sub-agents died at exactly this step — one with
"API Error: Connection closed mid-response", one stalled 600 s with no progress. Neither wrote a
single file. A third succeeded in 14 tool calls only after the orchestrator did the append itself and
told the agent **not to read or edit `package.json` at all**.

**How to apply:** when dispatching an agent whose task adds a test file, do the `test:fast` append
yourself first (a targeted string insert, then confirm `git diff --stat` shows `1 insertion(+), 1
deletion(-)`), and instruct the agent to skip that step and simply `git add connect-four/package.json`
with its own files. Do not let an agent open that file.

The registration itself is still mandatory — a new test file absent from `test:fast` never runs, and
its absence looks exactly like a passing suite. See [[project_eslint_config_traps]] for the other
`test:fast` trap (lint runs first; a lint *error* means zero tests execute).
