import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderReport } from '../scripts/win_distribution/visualize.mjs';

// Minimal synthetic summary: two combos, one with a player that never wins (null heatmap).
function grid(val) {
  return Array.from({ length: 6 }, () => Array(7).fill(val));
}
const summary = {
  a__b: {
    games: 100, p1Wins: 60, p2Wins: 30, draws: 10, meanPlies: 20.5,
    heatmaps: {
      1: (() => { const g = grid(0); g[0][3] = 0.5; g[2][3] = 0.25; return g; })(),
      2: grid(0.1),
    },
    parity: { 1: { oddRowMass: 0.7, evenRowMass: 0.3 }, 2: { oddRowMass: 0.4, evenRowMass: 0.6 } },
  },
  c__d: {
    games: 40, p1Wins: 40, p2Wins: 0, draws: 0, meanPlies: 17.1,
    heatmaps: { 1: grid(0.2), 2: null },
    parity: { 1: { oddRowMass: 0.55, evenRowMass: 0.45 }, 2: null },
  },
};

test('renderReport emits a self-contained HTML document', () => {
  const html = renderReport(summary);
  assert.match(html, /<!doctype html>/i);
  assert.match(html, /<style>/i);
  // no external resource references (self-contained)
  assert.doesNotMatch(html, /https?:\/\//i);
});

const h2 = (p1, p2) => new RegExp(`<h2>${p1} <span class="vs">vs</span> ${p2}</h2>`);

test('renderReport includes every combo and its stats by default', () => {
  const html = renderReport(summary);
  assert.match(html, h2('a', 'b'));
  assert.match(html, h2('c', 'd'));
  assert.ok(html.includes('20.5'), 'shows mean plies');
});

test('renderReport shows a placeholder for a player that never wins (null heatmap)', () => {
  const html = renderReport(summary);
  assert.match(html, /no wins/i);
});

test('renderReport embeds cell probabilities and parity mass', () => {
  const html = renderReport(summary);
  assert.ok(html.includes('.50') || html.includes('0.50'), 'peak cell value rendered');
  assert.match(html, /70(\.0)?%/, 'P1 odd-row parity mass rendered'); // 0.7 → 70%
});

test('renderReport --combo filter renders only that combo', () => {
  const html = renderReport(summary, { combo: 'a__b' });
  assert.match(html, h2('a', 'b'));
  assert.doesNotMatch(html, h2('c', 'd'));
});

test('renderReport throws a clear error for an unknown combo', () => {
  assert.throws(() => renderReport(summary, { combo: 'x__y' }), /x__y/);
});

test('renderReport uses a shared color scale across all rendered heatmaps', () => {
  // The global max (0.5, from a__b P1) must drive normalization; the returned html
  // should note the shared max so cells are comparable across combos.
  const html = renderReport(summary);
  assert.ok(html.includes('0.50'), 'shared-scale max shown');
});
