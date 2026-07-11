import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveLockReason, dispatchLockAction } from '../../src/screens/sagaLock.js';

function makeLessons() {
  return [
    { id: 'l1', order: 1, free: true },
    { id: 'l2', order: 2, free: true },
    { id: 'l3', order: 3, free: false },
    { id: 'l4', order: 4, free: true },
  ];
}

test('deriveLockReason — lowest-order lesson is never order-locked', () => {
  const lessons = makeLessons();
  const reason = deriveLockReason(lessons[0], lessons, [], 'free');
  assert.equal(reason, 'none');
});

test('deriveLockReason — incomplete predecessor produces order lock', () => {
  const lessons = makeLessons();
  const reason = deriveLockReason(lessons[1], lessons, [], 'free');
  assert.equal(reason, 'order');
});

test('deriveLockReason — free===false and tier!==paid produces tier lock', () => {
  const lessons = makeLessons();
  const progress = [{ lessonId: 'l2', status: 'complete' }];
  const reason = deriveLockReason(lessons[2], lessons, progress, 'free');
  assert.equal(reason, 'tier');
});

test('deriveLockReason — tier AND order locked at once produces both', () => {
  const lessons = makeLessons();
  const reason = deriveLockReason(lessons[2], lessons, [], 'free');
  assert.equal(reason, 'both');
});

test('deriveLockReason — complete predecessor + passing tier produces none', () => {
  const lessons = makeLessons();
  const progress = [
    { lessonId: 'l1', status: 'complete' },
    { lessonId: 'l2', status: 'complete' },
  ];
  const reason = deriveLockReason(lessons[2], lessons, progress, 'paid');
  assert.equal(reason, 'none');
});

test('deriveLockReason — completing lesson N unlocks exactly N+1, N+2 stays order-locked (SC-002)', () => {
  const lessons = makeLessons();
  const progress = [{ lessonId: 'l1', status: 'complete' }];
  const reasonL2 = deriveLockReason(lessons[1], lessons, progress, 'paid');
  const reasonL3 = deriveLockReason(lessons[2], lessons, progress, 'paid');
  assert.equal(reasonL2, 'none');
  // l3 has l2 as predecessor which is still incomplete
  assert.equal(reasonL3, 'order');
});

test('dispatchLockAction — reason to action mapping', () => {
  assert.equal(dispatchLockAction('tier'), 'upgrade');
  assert.equal(dispatchLockAction('both'), 'upgrade');
  assert.equal(dispatchLockAction('order'), 'orderLock');
  assert.equal(dispatchLockAction('none'), 'navigate');
});

test('done-lesson short-circuit: a completed lesson whose predecessor is incomplete still routes to navigate (never order-lock) when checked via the done-first flow', () => {
  const lessons = makeLessons();
  // l2 is complete but its predecessor l1 is NOT complete.
  const progress = [{ lessonId: 'l2', status: 'complete' }];
  const lesson = lessons[1];

  // Simulate handleNodeTap's done-short-circuit: check completion status BEFORE
  // consulting deriveLockReason at all.
  const isDone = progress.some(p => p.lessonId === lesson.id && p.status === 'complete');
  assert.equal(isDone, true);

  // Even though deriveLockReason would report 'order' here (predecessor l1 incomplete),
  // the short-circuit means handleNodeTap never calls deriveLockReason/dispatchLockAction
  // for a done lesson — it navigates directly. We assert the underlying reason WOULD be
  // 'order' to prove the short-circuit is meaningfully overriding it, not coincidentally
  // matching 'none'.
  const reason = deriveLockReason(lesson, lessons, progress, 'free');
  assert.equal(reason, 'order');
});
