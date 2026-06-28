---
name: project_run_eval_resume_mode_trap
description: run_eval.mjs silently SKIPS ids already in the output jsonl (resume mode) and defaults to a missing input — regen is a no-op unless you rm -f first and pass the right input/output
metadata: 
  node_type: memory
  type: project
  originSessionId: 0770cec4-bac9-4baa-a15f-777ab13b8c84
---

`connect-four/server/scripts/run_eval.mjs` has two traps that make "regenerate the frozen
vectors" silently no-op while still exiting 0:

1. **RESUME MODE**: if the output `.jsonl` already exists, run_eval reads the ids already present
   and SKIPS them ("... no-llm (skipped)"). With all 18 ids present, every record is skipped and
   the file is left untouched (stale). You MUST `rm -f` the output file first.
2. **Default input is `eval_set_small.json`** (does not exist) — running `run_eval.mjs --no-llm`
   with no positional arg throws ENOENT. You must pass the input set explicitly.

**Correct invocation for the FV-sufficiency frozen vectors** (from `RUNBOOK_fv_sufficiency.md`,
run from inside `connect-four/`):

```
rm -f server/scripts/eval_set_fv_suff_frozen_vectors.jsonl
node server/scripts/run_eval.mjs \
  server/scripts/eval_set_fv_suff_frozen.json \
  server/scripts/eval_set_fv_suff_frozen_vectors.jsonl \
  --no-llm
```

Input = `eval_set_fv_suff_frozen.json` (18-case selection); output = `..._vectors.jsonl`.
`buildExplainContext` calls `toFeatureVector(promptData, { prune: false })` (explainContext.js:1048)
— so the frozen vectors are UNPRUNED; honest-negative pruning does not apply to this file.

**How to apply:** any time a `toFeatureVector`/`explainContext`/`sparseLookahead` change must be
reflected in the frozen vectors, `rm -f` the output first and verify with `grep -o '"<field>"'`
+ a file-mtime-newer-than-source check. Spec 040 (FV-grounding) hit this: Story A's T014 and the
first Story B regen both silently skipped, leaving the file at the pre-change state with
`perCategory` still present and no `edgeType`/`reachability`. Related: [[reference_deep_reveal_eval_harness]].
