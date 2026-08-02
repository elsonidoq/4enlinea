// Shared fatal-vs-fallback decision for worktree-ports.sh self-derive failures.
// spec 054 Epic 4 US4 / FR-025, FR-026, FR-027 / OI-52.
//
// Both `resolvePorts()` (connect-four/vite.config.js) and `resolveWorktreePortEnv()`
// (connect-four/server/index.js) shell out to `worktree-ports.sh` to self-derive
// API_PORT/VITE_PORT when the env vars aren't already set. Historically, ANY
// self-derive failure (missing script, non-executable, thrown error) fell through
// silently to the legacy 3001/5173 defaults — which is exactly the port collision
// the worktree-ports scheme exists to prevent when it happens inside a linked
// worktree (OI-52). This module re-implements worktree-ports.sh:15-17's own
// GIT_DIR/GIT_COMMON detection in Node so both consumers can tell "linked worktree
// whose self-derive is broken" (fatal, FR-025) apart from "main checkout" or
// "not a git checkout at all, e.g. the Railway build container" (both non-fatal,
// FR-026) — see docs/architecture/worktree-conventions.md's "Production/Railway"
// section and its 2026-07-18 CORRECTION for why the Railway case must never be
// made fatal.
//
// server/index.js has no exports and calls app.listen() unconditionally at module
// scope, so it cannot be imported by a test in isolation (see research.md D7's
// 2026-08-02 amendment) — this module exists specifically so the decision logic
// is unit-testable without shelling out to real git or booting the Express app.

import { execSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';

/**
 * Normalize a `git rev-parse --git-dir`/`--git-common-dir` output the same way
 * worktree-ports.sh:16-17 does via `cd "$path" && pwd -P`: resolve it relative to
 * `cwd` (git may print a relative path such as `.git`) and resolve symlinks to
 * their physical path. Skipping this step produces false `!==` results whenever
 * one of the two calls happens to return a relative path and the other an
 * absolute one for the same physical directory.
 * @param {string} rawPath
 * @param {string} cwd
 * @returns {string}
 */
function normalizeGitPath(rawPath, cwd) {
  return realpathSync(resolvePath(cwd, rawPath.trim()));
}

/**
 * Detect whether the current process is running inside a linked git worktree,
 * re-implementing worktree-ports.sh:15-17's exact GIT_DIR/GIT_COMMON check:
 *   GIT_DIR=$(cd "$(git rev-parse --git-dir)" && pwd -P)
 *   GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" && pwd -P)
 *   [ "$GIT_DIR" = "$GIT_COMMON" ]  # main checkout when equal
 *
 * Throws if `git rev-parse` itself fails (e.g. no `.git` at all — the Railway
 * build container, per docs/architecture/worktree-conventions.md's "Production/
 * Railway" section). Callers MUST wrap this in its own try/catch, separate from
 * any port-derivation try/catch, and treat a thrown error as "not a linked
 * worktree" (non-fatal path) — see handleSelfDeriveFailure below, which does
 * exactly that.
 *
 * @param {{ execImpl?: (cmd: string, opts: object) => string, cwd?: string }} [deps]
 *   Injectable for testing without shelling out to real git.
 * @returns {boolean} true if this is a linked worktree (GIT_DIR !== GIT_COMMON)
 */
export function detectLinkedWorktree(deps = {}) {
  const exec = deps.execImpl || execSync;
  const cwd = deps.cwd || process.cwd();
  // NOTE: `cwd` is passed to the real execSync (so the git commands actually
  // run against the target directory, not whatever directory this process
  // happens to be in) AND to normalizeGitPath (to resolve any relative output
  // git prints). An injected `execImpl` in tests receives `cwd` as its second
  // positional arg but is otherwise free to ignore it.
  const execOpts = { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], cwd };
  const rawGitDir = exec('git rev-parse --git-dir', execOpts);
  const rawGitCommon = exec('git rev-parse --git-common-dir', execOpts);
  const gitDir = normalizeGitPath(rawGitDir, cwd);
  const gitCommon = normalizeGitPath(rawGitCommon, cwd);
  return gitDir !== gitCommon;
}

/**
 * The fatal-vs-fallback decision (FR-025/FR-026). Call this from a self-derive
 * failure's catch block: `handleSelfDeriveFailure(err)` throws (refuses to start)
 * when the process is definitively inside a linked worktree, and returns
 * (silently — caller proceeds to its existing legacy-default fallback) in every
 * other case:
 *   (a) `detect()` itself throws (not a git checkout at all, e.g. Railway build
 *       container) -> non-fatal, unchanged (FR-026)
 *   (b) `detect()` returns true (linked worktree) -> FATAL (FR-025)
 *   (c) `detect()` returns false (main checkout) -> non-fatal, unchanged (FR-026)
 *
 * @param {Error} selfDeriveError the error thrown by the worktree-ports.sh execSync call
 * @param {{ detect?: () => boolean }} [opts] injectable detector for testing
 */
export function handleSelfDeriveFailure(selfDeriveError, opts = {}) {
  const detect = opts.detect || detectLinkedWorktree;
  let isLinkedWorktree = false;
  try {
    isLinkedWorktree = detect();
  } catch {
    // Case (a): git rev-parse itself failed — not a git checkout at all (or git
    // is unavailable). Never fatal: this is the Railway build-container path.
    isLinkedWorktree = false;
  }
  if (isLinkedWorktree) {
    const detail = selfDeriveError && selfDeriveError.message ? selfDeriveError.message : String(selfDeriveError);
    throw new Error(
      'Refusing to start: this is a linked git worktree and worktree-ports.sh could not self-derive ' +
      `API_PORT/VITE_PORT (${detail}). Falling back to the main checkout's 3001/5173 would silently ` +
      'recreate the port collision this scheme exists to prevent. Run `eval "$(./worktree-ports.sh)"` ' +
      'from the repo root, or fix/restore worktree-ports.sh. See docs/architecture/worktree-conventions.md.'
    );
  }
  // Non-fatal: caller falls through to its existing legacy-default behavior.
}
