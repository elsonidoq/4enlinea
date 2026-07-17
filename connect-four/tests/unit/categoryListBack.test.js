import test from 'node:test';
import assert from 'node:assert';
import { resolveCategoryListBack } from '../../src/screens/categoryListBack.js';

test('cold-loaded /mistakes (no nav context) goes straight home', () => {
  assert.strictEqual(resolveCategoryListBack({ navContext: undefined }), 'home');
});

test('in-app arrival from stats pops history instead of pushing', () => {
  assert.strictEqual(resolveCategoryListBack({ navContext: 'stats' }), 'back');
});

test('any in-app context pops — never pushes a forward entry', () => {
  assert.strictEqual(resolveCategoryListBack({ navContext: 'home' }), 'back');
});

// Task 1b: MistakesListScreen (screen key `mistakeDetail`) has the identical
// push-instead-of-pop bug one level deeper. Same decision function applies —
// reused here rather than duplicated.
test('cold-loaded mistakeDetail (no nav context) goes straight home', () => {
  assert.strictEqual(resolveCategoryListBack({ navContext: undefined }), 'home');
});

test('mistakeDetail reached in-app from the category list pops history', () => {
  assert.strictEqual(resolveCategoryListBack({ navContext: 'mistakes' }), 'back');
});
