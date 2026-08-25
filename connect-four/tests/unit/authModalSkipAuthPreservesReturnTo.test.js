// Task 21 (finding 18): "accepting the import offer while signed-out opens AuthModal ... after
// sign-in the app returns to the Import Offer screen, so the user must click 'Import my games' a
// second time."
//
// Root-cause investigation found the stash/consume round trip in postLoginReturn.js was already
// correct (see tests/unit/postLoginReturn.test.js — pre-existing, all green) and
// OnboardingImportOfferScreen.jsx's accept handler already calls stashReturnTo('settings')
// before opening AuthModal. The actual bug: AuthModal.jsx's Dev "skip auth" button — which
// COMPLETES sign-in (it's the local stand-in for Google OAuth, not a dismiss action) — also
// called clearReturnTo(), wiping the just-stashed destination before App.jsx's
// session-transitions-to-truthy effect could consume it. That effect (App.jsx:114-117) is the
// single named consumption point (FR-013); this test guards the one call site that must NOT
// pre-empt it.
//
// This is a structural/source check rather than a DOM render test: AuthModal.jsx uses
// useStore() from ProfileStore.jsx's real context provider (network calls on mount), which is
// heavy to stand up for a one-line regression; grepping the button's own handler body is exact
// and immune to unrelated churn elsewhere in the file, mirroring the "rg consumeReturnTo src/
// returning exactly one call site" invariant already documented in postLoginReturn.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const authModalSrc = readFileSync(
  fileURLToPath(new URL('../../src/components/AuthModal.jsx', import.meta.url)),
  'utf8',
);

test('AuthModal: Dev skip-auth handler completes sign-in and does not clear a stashed return destination', () => {
  const skipAuthMatch = authModalSrc.match(/import\.meta\.env\.DEV[\s\S]*?onClick=\{async \(\) => \{([\s\S]*?)\n\s*\}\}/);
  assert.ok(skipAuthMatch, 'expected to find the Dev skip-auth button onClick handler body');
  const handlerBody = skipAuthMatch[1];

  assert.ok(!/clearReturnTo/.test(handlerBody),
    'Dev skip-auth completes sign-in; clearing the stash here strands the user back on the ' +
    'screen that opened AuthModal instead of letting App.jsx\'s session effect route them on.');
  assert.ok(/refetchSession/.test(handlerBody),
    'Dev skip-auth must still refresh the session so App.jsx\'s [session] effect fires and ' +
    'consumeReturnTo() runs.');
});

test('AuthModal: dismiss still clears the stash (dismiss-without-signing-in must not leak a stale destination)', () => {
  const dismissMatch = authModalSrc.match(/function handleDismiss\(\) \{([\s\S]*?)\n\s*\}/);
  assert.ok(dismissMatch, 'expected to find handleDismiss');
  assert.ok(/clearReturnTo/.test(dismissMatch[1]),
    'dismissing the sign-in prompt without completing sign-in must still clear any stash, per ' +
    'postLoginReturn.js\'s clearReturnTo() contract.');
});

// 2026-08-23: the Dev skip-auth button "did nothing" when local Supabase was down —
// POST /api/auth/anonymous answered 400 {"error":"fetch failed"}, which `fetch` RESOLVES
// (it only rejects on network-level failure), so the old `try { await fetch(...) } catch {}`
// swallowed it: the modal closed, refetchSession() found no cookie, and the user was left
// signed out with no message anywhere. Guard the response check so a failed sign-in is
// visible instead of indistinguishable from a successful one.
test('AuthModal: Dev skip-auth checks the response and surfaces failure instead of closing silently', () => {
  const skipAuthMatch = authModalSrc.match(/import\.meta\.env\.DEV[\s\S]*?onClick=\{async \(\) => \{([\s\S]*?)\n\s*\}\}/);
  assert.ok(skipAuthMatch, 'expected to find the Dev skip-auth button onClick handler body');
  const handlerBody = skipAuthMatch[1];

  assert.ok(/res\.ok/.test(handlerBody),
    'the handler must inspect res.ok — a 4xx/5xx from /api/auth/anonymous resolves the ' +
    'promise, so a bare try/catch treats a failed sign-in as a successful one.');
  assert.ok(/setDevError/.test(handlerBody),
    'a failed dev sign-in must be surfaced in the UI, not only in the console.');
  assert.ok(/return;/.test(handlerBody),
    'on failure the handler must bail out before onClose() so the modal stays open.');
});
