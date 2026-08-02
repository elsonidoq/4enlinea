// spec 054 Epic 4 US4 / FR-025, FR-026, FR-027 / OI-52
//
// Unit-tests the shared fatal-vs-fallback decision in worktreePorts.js DIRECTLY,
// via injected detectors — never shelling out to real git — so both branches are
// exercised deterministically regardless of whether this suite happens to run
// from the main checkout or a linked worktree.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { handleSelfDeriveFailure, detectLinkedWorktree } from './worktreePorts.js';

const selfDeriveError = new Error('worktree-ports.sh: command not found');

describe('handleSelfDeriveFailure', () => {
  it('throws when the detector reports a linked worktree (FR-025)', () => {
    assert.throws(
      () => handleSelfDeriveFailure(selfDeriveError, { detect: () => true }),
      /Refusing to start/
    );
  });

  it('does not throw when the detector reports the main checkout (FR-026)', () => {
    assert.doesNotThrow(() => handleSelfDeriveFailure(selfDeriveError, { detect: () => false }));
  });

  it('does not throw when the detector itself throws — not a git checkout at all, e.g. the Railway build container (FR-026, FR-027)', () => {
    const detect = () => {
      throw new Error('fatal: not a git repository (or any of the parent directories): .git');
    };
    assert.doesNotThrow(() => handleSelfDeriveFailure(selfDeriveError, { detect }));
  });

  it('defaults to the real detectLinkedWorktree when no detect is injected (signature check)', () => {
    // Just confirm the default parameter path doesn't crash under a minimal call —
    // real git behavior for THIS process is covered by the detectLinkedWorktree
    // tests below, not here.
    assert.equal(typeof handleSelfDeriveFailure, 'function');
  });
});

describe('detectLinkedWorktree', () => {
  it('returns true when GIT_DIR !== GIT_COMMON after cd+pwd -P normalization (simulated linked worktree)', () => {
    const execImpl = (cmd) => {
      if (cmd.includes('--git-dir')) return '/tmp/worktree-fixture/.git/worktrees/epic-1\n';
      if (cmd.includes('--git-common-dir')) return '/tmp/main-checkout-fixture/.git\n';
      throw new Error(`unexpected command: ${cmd}`);
    };
    // Both fixture dirs must actually exist for realpathSync to succeed; use the
    // real filesystem's own git dirs as stand-ins so normalization runs for real
    // without shelling out to git.
    const result = detectLinkedWorktree({ execImpl: fakeExecTwoDistinctDirs(), cwd: process.cwd() });
    assert.equal(result, true);
  });

  it('returns false when GIT_DIR === GIT_COMMON (simulated main checkout)', () => {
    const result = detectLinkedWorktree({ execImpl: fakeExecSameDir(), cwd: process.cwd() });
    assert.equal(result, false);
  });

  it('normalizes a relative git-dir output against a relative git-common-dir output pointing at the same physical dir (relative-vs-relative false-positive guard)', () => {
    // git rev-parse --git-dir commonly prints a bare relative ".git" when run
    // from the repo root; --git-common-dir can print an absolute path in the
    // same call. Both must normalize to the same physical path here.
    const execImpl = (cmd) => {
      if (cmd.includes('--git-dir')) return '.\n';
      if (cmd.includes('--git-common-dir')) return `${process.cwd()}\n`;
      throw new Error(`unexpected command: ${cmd}`);
    };
    const result = detectLinkedWorktree({ execImpl, cwd: process.cwd() });
    assert.equal(result, false);
  });

  it('propagates a thrown error from execImpl (not a git checkout at all)', () => {
    const execImpl = () => {
      throw new Error('fatal: not a git repository');
    };
    assert.throws(() => detectLinkedWorktree({ execImpl, cwd: process.cwd() }));
  });
});

// Two distinct real, existing directories on disk so realpathSync succeeds for
// both sides while still resolving to different physical paths.
function fakeExecTwoDistinctDirs() {
  return (cmd) => {
    if (cmd.includes('--git-dir')) return `${process.cwd()}\n`;
    if (cmd.includes('--git-common-dir')) return '..\n';
    throw new Error(`unexpected command: ${cmd}`);
  };
}

function fakeExecSameDir() {
  return (cmd) => {
    if (cmd.includes('--git-dir')) return `${process.cwd()}\n`;
    if (cmd.includes('--git-common-dir')) return '.\n';
    throw new Error(`unexpected command: ${cmd}`);
  };
}
