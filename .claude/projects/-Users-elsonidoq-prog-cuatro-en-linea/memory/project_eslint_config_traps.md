---
name: project-eslint-config-traps
description: "ESLint 9 flat-config traps in this repo — a file matched by no `files` block gets ZERO rules (141 .mjs files are silently unlinted); blocks MERGE so a glob catch-all leaks globals everywhere; `varsIgnorePattern: '^[A-Z_]'` makes `const _unused` a false-negative lint probe; the pre-commit hook lives at the REPO ROOT"
metadata: 
  node_type: memory
  type: project
  originSessionId: 0ddf2002-b3e2-486a-9322-724aa006d390
  modified: 2026-08-02T17:16:48.438Z
---

**Before touching `connect-four/eslint.config.js`, wiring lint into a gate, or writing a "prove the lint fails" probe.**

Measured 2026-08-02 during Epic 8 / spec 055 planning (nothing below is implemented yet — these are properties of the config as it stands).

**1. A file matched by no `files` block gets ZERO rules — silently.**
The config is a single block with `files: ['**/*.{js,jsx}']`. ESLint 9 still *walks* `.mjs` files (141 of the 501 it visits), reports nothing, and exits fine. `npx eslint --print-config server/tests/reasonEngine.test.mjs` returns **0 rules**; `server/index.js` returns 78. So every `server/tests/*.test.mjs`, `server/scripts/*.mjs` and `server/*.test.mjs` is unlinted — ~28% of the tree. "Lint exits 0" is achievable while the gate ignores a quarter of the codebase. **Always `--print-config` a file from each extension/directory before believing it is covered.**

**2. Blocks MERGE — a glob catch-all is not a fallback.**
Flat config has no way to say "files not matched by another block." Every block whose `files` glob matches contributes its `languageOptions.globals`, so a catch-all `files: ['**/*.{js,jsx,mjs,cjs}']` carrying node globals leaks `process` into `src/` too. The only safe "everything else" block is an **explicit file enumeration**. In this repo the strays outside `src/`/`server/`/`scripts/`/`tests/` are exactly `vite.config.js`, `eslint.config.js` (both node) and `public/sw.js` (browser + serviceworker).

**3. `const _unused = 1;` is a FALSE-NEGATIVE lint probe.**
The config sets `'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }]`. A leading `_` or capital matches the ignore pattern, so the probe stays green and you conclude the gate doesn't work. Use a lowercase, non-underscore name (`const unusedProbe = 1;`) and confirm the violation is **reported by name** in the output, not merely that the exit code is non-zero.

**4. The pre-commit hook is at the REPO ROOT, not `connect-four/`.**
`.githooks/pre-commit`, installed by `package.json`'s `prepare` script. It currently does KB-sync only, and `sync-kb.mjs` mutates the working tree and `git add`s the result **even when a later step fails** — so anything appended after it can leave a freshly-staged KB mirror behind on a rejected commit. Put a new gate *before* it. Full-tree `npx eslint .` measures ~7.5s wall — that is the per-commit cost.

**Why:** OI-70 exists because `npm run lint` gates nothing (282 errors / 14 warnings across 71 files as of 2026-08-02 — the backlog's older "254" is stale). Traps 1–3 are all ways to *look* like you fixed that while the gate stays hollow.

**How to apply:** verify coverage with `--print-config` (non-zero rule count) per directory *and* per extension, enumerate the strays explicitly instead of globbing, and prove any lint gate by mutation with a probe the rule set actually reports. See [[feedback_verify_at_the_source_layer]] — "a green test is not evidence" applies to a green lint identically. Test-script wiring mechanics: [[project_repo_worktree_setup]] (`test:fast` baseline is 5 RED, not 0).
