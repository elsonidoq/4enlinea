import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseQueuePaginationParams } from '../../server/coachQueuePagination.js';
import { shouldContinuePaging } from '../../src/lib/coachQueuePagination.js';

// ---------------------------------------------------------------------------
// parseQueuePaginationParams(query)
// ---------------------------------------------------------------------------

test('parseQueuePaginationParams: defaults limit=50, offset=0 when absent', () => {
  const result = parseQueuePaginationParams({});
  assert.deepEqual(result, { limit: 50, offset: 0 });
});

test('parseQueuePaginationParams: accepts valid limit and offset', () => {
  const result = parseQueuePaginationParams({ limit: '100', offset: '50' });
  assert.deepEqual(result, { limit: 100, offset: 50 });
});

test('parseQueuePaginationParams: accepts limit at the max boundary (200)', () => {
  const result = parseQueuePaginationParams({ limit: '200' });
  assert.deepEqual(result, { limit: 200, offset: 0 });
});

test('parseQueuePaginationParams: accepts limit at the min boundary (1)', () => {
  const result = parseQueuePaginationParams({ limit: '1' });
  assert.deepEqual(result, { limit: 1, offset: 0 });
});

test('parseQueuePaginationParams: rejects non-numeric limit', () => {
  const result = parseQueuePaginationParams({ limit: 'abc' });
  assert.deepEqual(result, { error: 'invalid limit' });
});

test('parseQueuePaginationParams: rejects limit < 1', () => {
  const result = parseQueuePaginationParams({ limit: '0' });
  assert.deepEqual(result, { error: 'invalid limit' });
});

test('parseQueuePaginationParams: rejects negative limit', () => {
  const result = parseQueuePaginationParams({ limit: '-5' });
  assert.deepEqual(result, { error: 'invalid limit' });
});

test('parseQueuePaginationParams: rejects limit > 200', () => {
  const result = parseQueuePaginationParams({ limit: '201' });
  assert.deepEqual(result, { error: 'invalid limit' });
});

test('parseQueuePaginationParams: rejects non-integer limit', () => {
  const result = parseQueuePaginationParams({ limit: '1.5' });
  assert.deepEqual(result, { error: 'invalid limit' });
});

test('parseQueuePaginationParams: rejects non-numeric offset', () => {
  const result = parseQueuePaginationParams({ offset: 'xyz' });
  assert.deepEqual(result, { error: 'invalid offset' });
});

test('parseQueuePaginationParams: rejects negative offset', () => {
  const result = parseQueuePaginationParams({ offset: '-1' });
  assert.deepEqual(result, { error: 'invalid offset' });
});

test('parseQueuePaginationParams: accepts offset=0 explicitly', () => {
  const result = parseQueuePaginationParams({ offset: '0' });
  assert.deepEqual(result, { limit: 50, offset: 0 });
});

// ---------------------------------------------------------------------------
// shouldContinuePaging({ pageLength, limit, accumulated, total })
// ---------------------------------------------------------------------------

test('shouldContinuePaging: continues when the page was full and more rows remain', () => {
  const result = shouldContinuePaging({ pageLength: 50, limit: 50, accumulated: 50, total: 137 });
  assert.equal(result, true);
});

test('shouldContinuePaging: stops when the page came back short (last page)', () => {
  const result = shouldContinuePaging({ pageLength: 37, limit: 50, accumulated: 137, total: 137 });
  assert.equal(result, false);
});

test('shouldContinuePaging: stops when accumulated has already reached total, even if page was full', () => {
  // Dual guard: a full-size final page (accumulated === total) must still stop,
  // not just rely on a short page.
  const result = shouldContinuePaging({ pageLength: 50, limit: 50, accumulated: 100, total: 100 });
  assert.equal(result, false);
});

test('shouldContinuePaging: does not spin forever when total is unreachable (row deleted mid-session)', () => {
  // pageLength < limit (short/empty page) must stop the loop even though
  // accumulated will never equal a stale/higher total.
  const result = shouldContinuePaging({ pageLength: 0, limit: 50, accumulated: 90, total: 137 });
  assert.equal(result, false);
});

test('shouldContinuePaging: continues on the very first page when more rows than the page size exist', () => {
  const result = shouldContinuePaging({ pageLength: 50, limit: 50, accumulated: 50, total: 51 });
  assert.equal(result, true);
});
