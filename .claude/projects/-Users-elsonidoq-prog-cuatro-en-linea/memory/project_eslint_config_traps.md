---
name: project-eslint-config-traps
description: "Lint is now a REAL gate: `test:fast` runs `eslint . &&` first (a lint error means zero tests run) and pre-commit rejects the commit; 47 warnings are the healthy state, not red; `const _unused` is still a false-negative probe; flat-config blocks MERGE"
metadata: 
  node_type: memory
  type: project
  originSessionId: 0ddf2002-b3e2-486a-9322-724aa006d390
  modified: 2026-08-03T12:28:10.014Z
---

**Before touching `connect-four/eslint.config.js`, debugging a `test:fast` run that printed no test output, or writing a "prove the lint fails" probe.**

**UPDATED 2026-08-03 — Epic 8 / spec 055 implemented this; the config is no longer the hollow single-block one this memory used to describe.** OI-70 is resolved: the config is split by environment, `.mjs`/`.cjs` are covered, `npm run lint` exits 0. The block structure lives in `docs/architecture/testing-conventions.md` §"ESLint environment-split" — read the doc for *what the blocks are*; this memory carries only the traps.

**1. `test:fast` runs lint FIRST — a lint error means no test ever runs.**
The script is `eslint . && node --test …`. One lint error anywhere gives you ESLint output and **no test summary at all** — no `ℹ pass`, no `ℹ fail`. That reads as a broken or hung suite if you don't know the gate is there. Same on commit: `.githooks/pre-commit` (repo root, installed by `package.json`'s `prepare`) runs `npx eslint . --quiet` **before** the KB-sync step, so a lint error rejects the commit with `pre-commit: lint failed`. ~6.7s wall per commit.

**2. `npm run lint` exits 0 while printing ~47 warnings — that is the healthy state.**
They are the deliberately demoted `react-hooks/*` / `react-refresh/*` findings, tracked as **OI-119**. Warnings fail neither gate. Don't "fix" them inside unrelated work, and don't report a warning count as a red suite. The hook uses `--quiet` precisely so a clean commit prints nothing instead of 47 lines people learn to ignore.

**3. `const _unused = 1;` is a FALSE-NEGATIVE lint probe.** (Unchanged — still bites.)
`'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }]` — a leading `_` or a capital matches the ignore pattern, so the probe stays green and you wrongly conclude the gate is broken. Use a lowercase, non-underscore name (`const unusedProbe = 1;`) and confirm the violation is **reported by name**, not merely that the exit code is non-zero.

**4. Flat-config blocks MERGE — a glob catch-all is not a fallback.** (Still true; constrains every edit.)
There is no way to express "files not matched by another block": every block whose `files` glob matches contributes its `languageOptions.globals`, so a catch-all `**/*.{js,jsx,mjs,cjs}` carrying node globals leaks `process` into `src/`. "Everything else" coverage is therefore an **explicit enumeration** — `vite.config.js`, `eslint.config.js` (node) and `public/sw.js` (browser + serviceworker). Add a new top-level file outside `src/`/`server/`/`scripts/`/`tests/` and it gets **zero rules** until you name it. Verify with `npx eslint --print-config <file>` returning a non-zero rule count — run it from `connect-four/`, with the path *not* prefixed by `connect-four/`.

**5. Removing a parameter to satisfy `no-unused-vars` is only safe if it is TRAILING.**
The rule reports the binding, not the call sites, so deleting a non-trailing positional param silently shifts every caller's arguments. Spec 055 hit exactly one (`buildExplainContext`'s `rounds`, 12 positional call sites) and kept it behind a scoped `eslint-disable-next-line` with a stated reason rather than refactor 12 callers. Note `eslint-disable-next-line` applies to the *immediately* following line — if you write an explanatory comment block, the directive must be its **last** line, or it disables a comment and the error persists.

**How to apply:** if `test:fast` produced no test summary, run `npm run lint` before concluding anything about the tests. Prove any lint gate by mutation, with a probe the rule set actually reports — [[feedback_verify_at_the_source_layer]]'s "a green test is not evidence" applies to a green lint identically. Baseline mechanics: [[project_repo_worktree_setup]] (`test:fast` is 5 RED, not 0).
