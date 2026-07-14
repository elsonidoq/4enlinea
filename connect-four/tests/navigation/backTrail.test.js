// Spec 042 US3 / T023 (FR-012, SC-003): a mistake reached via a game's "view mistake"
// link must produce the linear Back trail mistake -> game -> past games list -> home,
// with no repeated screen; a cold-opened permalink's Back must go straight to Home in
// one press (spec-037 behavior, must not regress).
//
// This repo has no React component-render harness (see CLAUDE.md / testing-conventions),
// so this test models the browser-history stack the way src/App.jsx's Navigator builds
// it (go() = pushState, goBack() = window.history.back()/pop) and re-derives the exact
// decision `MistakeDetailScreen.handleBack` (src/screens/MistakeDetailScreen.jsx:~146)
// makes, using real `buildUrl()` from src/lib/urlMapping.js so the asserted pathnames are
// the actual URLs the app would show. Fixture ids are inline hardcoded (SC-002 shape, see
// research.md §3) — no live Supabase/HTTP call.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildUrl } from '../../src/lib/urlMapping.js';

// --- Minimal model of src/App.jsx's Navigator history stack -----------------------------
// go(screenKey, params)      -> pushState  (NavStack.push)
// goBack()                   -> window.history.back() (NavStack.pop)
// A cold boot replaces the single current entry (NavStack.replace), matching
// window.history.replaceState in App.jsx's mount effect.
class NavStack {
  constructor(initial) {
    this.entries = [initial];
  }
  push(screenKey, params = {}) {
    this.entries.push({ screenKey, params });
  }
  pop() {
    if (this.entries.length > 1) this.entries.pop();
    // else: nothing to pop to (would exit the SPA) — not exercised here.
  }
  current() {
    return this.entries[this.entries.length - 1];
  }
  pathname() {
    const { screenKey, params } = this.current();
    return buildUrl(screenKey, params);
  }
}

// --- Mirrors MistakeDetailScreen.handleBack (src/screens/MistakeDetailScreen.jsx:~146) --
// after T025's fix: cold-boot (no mistakeContext/mistakeSource) pushes 'home' directly;
// any in-app context (mistakeContext === 'game' from ReviewScreen.navigateToMistake, or
// 'list' from MistakesListScreen) pops via native back, since the screen we want to land
// on was already pushed onto history immediately before the blunderDetail push.
function applyHandleBack(stack, { mistakeContext, mistakeSource }) {
  if (!mistakeContext && !mistakeSource) {
    stack.push('home', {});
    return;
  }
  stack.pop();
}

// --- SC-002-shaped fixture (research.md §3): papergames game, 4 mistakes ----------------
const FIXTURE_GAME_ID = '40fe793a-aa39-429d-8ef4-4e43192cc4db';
const FIXTURE_MISTAKE = {
  id: '52a28158-8603-4ccf-89f4-b9a73b2910f3',
  moveIndex: 18,
  quality: 'blunder',
};

test('Back trail (game-reached mistake): mistake -> game -> past games list -> home, no repeats', () => {
  // Build the in-app forward-navigation trail exactly as the app does it:
  // home -> pastGames (push) -> review (push, "open game") -> blunderDetail
  // (push, mistakeContext: 'game', via ReviewScreen.navigateToMistake).
  const stack = new NavStack({ screenKey: 'home', params: {} });
  stack.push('pastGames', {});
  stack.push('review', { id: FIXTURE_GAME_ID });
  stack.push('blunderDetail', { id: FIXTURE_MISTAKE.id });

  const mistakeContext = 'game';
  const mistakeSource = { date: 'Jul 8', gameId: FIXTURE_GAME_ID, totalMoves: 41 };

  const visited = [stack.pathname()]; // mistake detail

  // Press 1: mistake -> game
  applyHandleBack(stack, { mistakeContext, mistakeSource });
  visited.push(stack.pathname());

  // Press 2: game -> past games list (ReviewScreen's own Back is native goBack)
  stack.pop();
  visited.push(stack.pathname());

  // Press 3: past games list -> home (PastGamesListScreen's Back is native goBack)
  stack.pop();
  visited.push(stack.pathname());

  assert.deepEqual(visited, [
    '/blunder/52a28158-8603-4ccf-89f4-b9a73b2910f3',
    `/game/${FIXTURE_GAME_ID}`,
    '/pastGames',
    '/',
  ]);

  // No repeated screen anywhere in the trail.
  assert.equal(new Set(visited).size, visited.length, 'trail must not revisit a screen');
});

test('Back trail (cold-opened permalink): Back goes straight to Home in one press', () => {
  // Cold boot: window.history.replaceState puts a single entry on the stack, and
  // mistakeContext/mistakeSource are never URL-encoded, so they are undefined here
  // (spec-037 shipped behavior — must not regress).
  const stack = new NavStack({ screenKey: 'blunderDetail', params: { id: FIXTURE_MISTAKE.id } });

  const visited = [stack.pathname()];

  applyHandleBack(stack, { mistakeContext: undefined, mistakeSource: undefined });
  visited.push(stack.pathname());

  assert.deepEqual(visited, [
    '/blunder/52a28158-8603-4ccf-89f4-b9a73b2910f3',
    '/',
  ]);
});
