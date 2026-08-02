# Quickstart: verifying Epic 8 / spec 055 (Dev Infrastructure & Test-Quality Baseline)

Run from `connect-four/` unless stated otherwise. All three sections are independent — you can
verify any one without the others (spec.md:10).

## US1 — lint gate

**Ordering note (plan-critique blocking issue 3)**: run this section's SC-001a commit-rejection
proof (below) either fully before US2's `Board.jsx` mutation window opens, or fully after it closes
(`git diff src/components/Board.jsx` empty) — the two diagnostic-mutation windows must never
overlap in the working tree at the same time.

```bash
cd connect-four
npm run lint                       # MUST exit 0 (post-implementation)
```

Prove the widened glob is a real gate (FR-004/SC-001), not just a walked glob:
```bash
# Insert one real violation into any .mjs file — one the config's
# 'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }] rule actually reports:
#   const unusedProbe = 1;
# NOT `const _unused = 1;` — that name matches varsIgnorePattern and would false-negative
# (the rule is correct, that fixture was wrong).
npm run lint                       # MUST exit non-zero and name `unusedProbe`, not merely exit non-zero
# Then revert the inserted line.
```

Prove the double-wiring (FR-006/SC-001a) with a violation staged in ONE explicit throwaway file —
**never `git add -A`** (standing project rule against staging everything; a background process
auto-commits STAGED work unpredictably, memory `project_external_auto_backup_commits`), and never
while US2's `Board.jsx` mutation is also in the tree:
```bash
# Re-insert the same one-line violation from above (const unusedProbe = 1;) into one specific
# throwaway .mjs file (e.g. scripts/lintProbe.mjs), leaving everything else clean.
npm run test:fast 2>&1 | tail -20                    # MUST fail on the lint step, naming `unusedProbe`
git add connect-four/scripts/lintProbe.mjs           # stage ONLY the one throwaway file — never -A
git commit -m "tmp"                                  # MUST be rejected by .githooks/pre-commit's lint step
git restore --staged connect-four/scripts/lintProbe.mjs   # unstage; nothing was ever committed
# Revert the violation itself before doing anything else.
```

Confirm environment split correctness (FR-001, acceptance scenario 1 — `tests/dom/**` gets the
merged node+browser ruleset; plain `tests/` does not, per the DEVIATION from Settled decision #1):
```bash
npx eslint --print-config server/index.js | grep -c '"process"'      # node global present
npx eslint --print-config tests/dom/BoardWindowCounts.dom.test.jsx | grep -c '"document"'  # browser global present in tests/dom/
npx eslint --print-config tests/unit/deepRevealTimeout.test.js | grep -c '"document"'  # 0 — plain tests/unit/ has no browser globals
npx eslint --print-config src/components/Board.jsx | grep -c '"process"'  # 0 — src/ has no node globals
```

Confirm the base/catch-all block leaves no file unmatched (FR-018, plan-critique blocking issue 2):
```bash
npx eslint --print-config vite.config.js | grep -c '"rules"'          # non-zero — still linted, not silently dropped
npx eslint --print-config vite.config.js 2>&1 | grep -c '"no-undef"'  # rule present — the file's 2 real errors must still surface in `npm run lint`, not vanish
npx eslint --print-config public/sw.js | grep -c '"rules"'            # non-zero — service worker still linted
```

## US2 — DOM/unit suite reliability

Reproduce OI-71's hang, confirm the fix, then confirm it's gone (FR-007/SC-002):
```bash
# Temporarily delete `&& value === 'empty'` from Board.jsx:382's windowCounts guard.
timeout 60 npm run test:dom        # BEFORE fix: hangs (0% CPU) until the 60s timeout kills it
#                                     AFTER fix: fails fast with a clear assertion, well under 60s
git diff src/components/Board.jsx  # MUST be empty once the mutation is reverted
```

Confirm the new SplitReveal regression (FR-008/SC-003) is registered and non-vacuous:
```bash
npm run test:dom 2>&1 | grep -c "<the new test's distinctive name>"   # non-zero — it ran
grep -c "SplitRevealZoom" package.json                                # present in test:dom string
# Then temporarily reintroduce the original live-fit sizing bug and confirm the new test fails
# (proving it is not vacuous), then revert.
```

Confirm the dead-code deletion (FR-010) left the live constants test intact:
```bash
node --test tests/unit/deepRevealTimeout.test.js 2>&1 | grep -c "hard cap is well beyond"
# 1 — the surviving test still runs; the deleted 'phase transitions...' test no longer appears.
```

## US3 — CSP close-out + backlog bookkeeping

Evidence for OI-58 (FR-011, no code/worktree/merge involved):
```bash
git diff origin/main origin/stagging -- connect-four/server/index.js | grep -A5 "helmet("
git log --oneline -1 ae3c006
git merge-base --is-ancestor ae3c006 main && echo "ae3c006 is on main"
```

Real build + header check (FR-013/SC-004) — **always source worktree ports first**:
```bash
cd /Users/elsonidoq/prog/cuatro_en_linea/.claude/worktrees/epic-8-dev-infra-test-quality
eval "$(./worktree-ports.sh)"
cd connect-four && npm run build
node --env-file=server/.env server/index.js &   # or however this worktree normally starts it
curl -sD - "http://localhost:$API_PORT/" -o /dev/null | grep -i content-security-policy
# kill the server by $API_PORT specifically — never a bare port number or `pkill node`
```

Backlog bookkeeping checks (FR-016/FR-017/SC-005/SC-006):
```bash
grep -n "^## OI-58\|^## OI-6 \|^## OI-72" docs/open_issues.md   # each shows an updated Status line
grep -n "whole-backlog audit" docs/open_issues.md                # the new FR-017 section exists
```
