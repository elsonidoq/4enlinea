import { strict as assert } from 'node:assert';
import { test } from 'node:test';

test('logError writes to console.error with tag and message', async () => {
  const calls = [];
  const orig = console.error;
  console.error = (...args) => calls.push(args);
  try {
    const { logError } = await import('./logger.js');
    logError('[test]', new Error('boom'));
    assert.ok(calls.length >= 1, 'console.error should have been called');
    const flat = calls.flat().join(' ');
    assert.ok(flat.includes('[test]'), 'should include tag');
    assert.ok(flat.includes('boom'), 'should include error message');
  } finally {
    console.error = orig;
  }
});

test('logError does not throw when err is a plain string', async () => {
  const orig = console.error;
  console.error = () => {};
  try {
    const { logError } = await import('./logger.js');
    assert.doesNotThrow(() => logError('[test]', 'string error'));
  } finally {
    console.error = orig;
  }
});

test('logError includes extra context when provided', async () => {
  const calls = [];
  const orig = console.error;
  console.error = (...args) => calls.push(args);
  try {
    const { logError } = await import('./logger.js');
    logError('[test]', new Error('ctx-test'), { userId: 'u123' });
    const flat = calls.flat().map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
    assert.ok(flat.includes('u123'), 'should include extra context');
  } finally {
    console.error = orig;
  }
});
