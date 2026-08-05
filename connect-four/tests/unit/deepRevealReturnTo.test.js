// Fix 3 (2026-08-04). MistakeDetailScreen's "Sign in to unlock" button and DeepRevealPane's 401
// branch opened AuthModal without stashing a post-login destination, so Google OAuth's full-page
// redirect to the site root stranded the user on Home.
//
// This is a source-parse test (testing-conventions.md §"Source-parse assertions — when there is
// no seam at all"): the logic lives in .jsx, which `node --test` cannot parse, and extracting a
// one-line stash call into a module would be indirection for its own sake. The property worth
// pinning is that each screen stashes the key it is REGISTERED under — screenRegistry.jsx maps
// `blunderDetail` to MistakeDetailScreen while `mistakeDetail` maps to MistakesListScreen, so the
// obvious-looking key is the wrong one, and consumeReturnTo would happily accept it.
//
// Anchored on the distinguishing expressions, not on prose: a comment mentioning 'blunderDetail'
// must not be able to keep this green.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

// Strip line and block comments so a comment can never satisfy an assertion below.
function code(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

test('screenRegistry maps blunderDetail — not mistakeDetail — to MistakeDetailScreen', () => {
  const src = code(read('src/lib/screenRegistry.jsx'));
  assert.match(src, /blunderDetail:\s*MistakeDetailScreen/);
  assert.match(src, /mistakeDetail:\s*\(p\)\s*=>\s*<MistakesListScreen/);
});

test('MistakeDetailScreen stashes the screen key it is registered under', () => {
  const src = code(read('src/screens/MistakeDetailScreen.jsx'));
  assert.match(src, /stashReturnTo\(\s*'blunderDetail'\s*,\s*\{\s*id:\s*blunder\.id\s*\}/);
  assert.match(src, /returnTo=\{\{\s*screenKey:\s*'blunderDetail'/);
  // The wrong key must never appear as a stash target here.
  assert.equal(/stashReturnTo\(\s*'mistakeDetail'/.test(src), false);
});

test('every AuthModal-opening site in MistakeDetailScreen stashes first', () => {
  const src = code(read('src/screens/MistakeDetailScreen.jsx'));
  const opens = src.match(/setAuthOpen\(true\)/g) ?? [];
  const stashes = src.match(/stashReturnTo\(/g) ?? [];
  assert.equal(opens.length > 0, true, 'expected at least one setAuthOpen(true) site');
  assert.equal(stashes.length >= opens.length, true,
    `${opens.length} setAuthOpen(true) site(s) but only ${stashes.length} stashReturnTo call(s)`);
});

test('DeepRevealPane stashes the host-supplied destination on its 401 branch', () => {
  const src = code(read('src/components/DeepRevealPane.jsx'));
  assert.match(src, /import\s*\{\s*stashReturnTo\s*\}\s*from\s*'\.\.\/lib\/postLoginReturn\.js'/);
  // The stash must sit in the 401 branch, before the modal opens.
  assert.match(
    src,
    /res\.status === 401[\s\S]{0,200}?stashReturnTo\(returnTo\.screenKey[\s\S]{0,80}?setAuthOpen\(true\)/,
  );
});

test('the single named consumption point is still single', () => {
  // postLoginReturn.js's header makes this an explicit invariant (FR-013).
  const app = code(read('src/App.jsx'));
  assert.equal((app.match(/consumeReturnTo\(\)/g) ?? []).length, 1);
});

test('ChallengeScreen passes a returnTo to DeepRevealPane, gated on not-lesson-mode', () => {
  const src = code(read('src/screens/ChallengeScreen.jsx'));
  assert.match(
    src,
    /returnTo=\{!lessonMode\s*&&\s*category\s*\?\s*\{\s*screenKey:\s*'challenge'/,
  );
});

test('every stashed screen key is a real URL_MAP key', () => {
  const map = code(read('src/lib/urlMapping.js'));
  for (const key of ['blunderDetail', 'challenge']) {
    assert.match(map, new RegExp(`screenKey:\\s*'${key}'`));
  }
});
