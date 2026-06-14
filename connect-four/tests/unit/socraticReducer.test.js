import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { socraticReducer } from '../../src/lib/socraticReducer.js';

describe('socraticReducer', () => {
  test('ask + CORRECT → correct', () => {
    assert.equal(socraticReducer('ask', { type: 'CORRECT' }), 'correct');
  });

  test('ask + WRONG → wrong1', () => {
    assert.equal(socraticReducer('ask', { type: 'WRONG' }), 'wrong1');
  });

  test('wrong1 + CORRECT → correct', () => {
    assert.equal(socraticReducer('wrong1', { type: 'CORRECT' }), 'correct');
  });

  test('wrong1 + WRONG → wrong2', () => {
    assert.equal(socraticReducer('wrong1', { type: 'WRONG' }), 'wrong2');
  });

  test('wrong2 + CORRECT → wrong2 (terminal, no transition)', () => {
    assert.equal(socraticReducer('wrong2', { type: 'CORRECT' }), 'wrong2');
  });

  test('correct + WRONG → correct (terminal, no transition)', () => {
    assert.equal(socraticReducer('correct', { type: 'WRONG' }), 'correct');
  });

  test('unknown action type returns current phase unchanged', () => {
    assert.equal(socraticReducer('ask', { type: 'UNKNOWN' }), 'ask');
    assert.equal(socraticReducer('wrong1', { type: 'UNKNOWN' }), 'wrong1');
    assert.equal(socraticReducer('wrong2', { type: 'UNKNOWN' }), 'wrong2');
    assert.equal(socraticReducer('correct', { type: 'UNKNOWN' }), 'correct');
  });
});
