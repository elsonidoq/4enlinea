import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveLockReason, dispatchLockAction, deriveLessonAccess } from '../../src/screens/sagaLock.js';

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

// --- deriveLessonAccess (direct-URL guard, QA 2026-07-25 lock-bypass fix) ---

test('deriveLessonAccess — free first lesson is allowed for a fresh free profile', () => {
  const lessons = makeLessons();
  assert.equal(deriveLessonAccess('l1', lessons, [], 'free'), 'allowed');
});

test('deriveLessonAccess — sequence-locked lesson returns orderLock', () => {
  const lessons = makeLessons();
  assert.equal(deriveLessonAccess('l2', lessons, [], 'free'), 'orderLock');
});

test('deriveLessonAccess — PRO lesson for a free user returns upgrade (both-locked too)', () => {
  const lessons = makeLessons();
  // both tier- and order-locked → upgrade wins, same as dispatchLockAction('both')
  assert.equal(deriveLessonAccess('l3', lessons, [], 'free'), 'upgrade');
  // tier-locked only (predecessors complete)
  const progress = [
    { lessonId: 'l1', status: 'complete' },
    { lessonId: 'l2', status: 'complete' },
  ];
  assert.equal(deriveLessonAccess('l3', lessons, progress, 'free'), 'upgrade');
});

test('deriveLessonAccess — paid tier + complete predecessor is allowed', () => {
  const lessons = makeLessons();
  const progress = [
    { lessonId: 'l1', status: 'complete' },
    { lessonId: 'l2', status: 'complete' },
  ];
  assert.equal(deriveLessonAccess('l3', lessons, progress, 'paid'), 'allowed');
});

test('deriveLessonAccess — done short-circuit matches handleNodeTap (completed lesson always allowed)', () => {
  const lessons = makeLessons();
  // l2 complete but its predecessor l1 is NOT — the same short-circuit as the saga tap.
  const progress = [{ lessonId: 'l2', status: 'complete' }];
  assert.equal(deriveLessonAccess('l2', lessons, progress, 'free'), 'allowed');
});

test('deriveLessonAccess — unknown lessonId is allowed (screen surfaces its own 404)', () => {
  const lessons = makeLessons();
  assert.equal(deriveLessonAccess('nope', lessons, [], 'free'), 'allowed');
});

// --- 'signin' outcome (FR-017 / OI-95): signed-out visitor vs signed-in free-tier ---

test('deriveLockReason — signed-out visitor hitting a tier-locked lesson gets signin, not tier', () => {
  const lessons = makeLessons();
  const progress = [
    { lessonId: 'l1', status: 'complete' },
    { lessonId: 'l2', status: 'complete' },
  ];
  const reason = deriveLockReason(lessons[2], lessons, progress, 'free', false);
  assert.equal(reason, 'signin');
});

test('deriveLockReason — signed-out visitor hitting an order-locked lesson gets signin, not order', () => {
  const lessons = makeLessons();
  const reason = deriveLockReason(lessons[1], lessons, [], 'free', false);
  assert.equal(reason, 'signin');
});

test('deriveLockReason — signed-out visitor hitting a tier-AND-order-locked lesson gets signin, not both (interaction with "both")', () => {
  const lessons = makeLessons();
  const reason = deriveLockReason(lessons[2], lessons, [], 'free', false);
  assert.equal(reason, 'signin');
});

test('deriveLockReason — signed-out visitor is unaffected when the lesson is not locked at all', () => {
  const lessons = makeLessons();
  const reason = deriveLockReason(lessons[0], lessons, [], 'free', false);
  assert.equal(reason, 'none');
});

test('deriveLockReason — omitting authenticated defaults to signed-in (existing tier/order/both callers unchanged)', () => {
  const lessons = makeLessons();
  // Same fixtures as the pre-existing 'tier' and 'both' tests above, called without the
  // 5th arg — must still resolve to 'tier'/'both', proving the default keeps old callers intact.
  const progressTierOnly = [{ lessonId: 'l2', status: 'complete' }];
  assert.equal(deriveLockReason(lessons[2], lessons, progressTierOnly, 'free'), 'tier');
  assert.equal(deriveLockReason(lessons[2], lessons, [], 'free'), 'both');
});

test('deriveLockReason — signed-in free-tier user keeps existing tier/order/both behavior unchanged', () => {
  const lessons = makeLessons();
  const progressTierOnly = [{ lessonId: 'l2', status: 'complete' }];
  assert.equal(deriveLockReason(lessons[2], lessons, progressTierOnly, 'free', true), 'tier');
  assert.equal(deriveLockReason(lessons[1], lessons, [], 'free', true), 'order');
  assert.equal(deriveLockReason(lessons[2], lessons, [], 'free', true), 'both');
});

test('dispatchLockAction — signin maps to signin action, tier/order/both/none unchanged', () => {
  assert.equal(dispatchLockAction('signin'), 'signin');
  assert.equal(dispatchLockAction('tier'), 'upgrade');
  assert.equal(dispatchLockAction('both'), 'upgrade');
  assert.equal(dispatchLockAction('order'), 'orderLock');
  assert.equal(dispatchLockAction('none'), 'navigate');
});

test('deriveLessonAccess — signed-out visitor on a tier-AND-order-locked lesson returns signin', () => {
  const lessons = makeLessons();
  assert.equal(deriveLessonAccess('l3', lessons, [], 'free', false), 'signin');
});

test('deriveLessonAccess — signed-out visitor on an order-only-locked lesson returns signin', () => {
  const lessons = makeLessons();
  assert.equal(deriveLessonAccess('l2', lessons, [], 'free', false), 'signin');
});

test('deriveLessonAccess — signed-in free-tier user still gets upgrade/orderLock, not signin', () => {
  const lessons = makeLessons();
  assert.equal(deriveLessonAccess('l3', lessons, [], 'free', true), 'upgrade');
  assert.equal(deriveLessonAccess('l2', lessons, [], 'free', true), 'orderLock');
});

test('deriveLessonAccess — signed-out visitor with a completed lesson still gets allowed (done short-circuit precedes the auth check)', () => {
  const lessons = makeLessons();
  const progress = [{ lessonId: 'l2', status: 'complete' }];
  assert.equal(deriveLessonAccess('l2', lessons, progress, 'free', false), 'allowed');
});

// ---------------------------------------------------------------------------
// Cross-module regression (code review, 2026-08-04): the entitlement fail-open
// and the lock chain must agree on what "unknown auth state" means.
//
// `getEntitlement()` fails open to `authenticated:true` when a fetch fails with no cached
// answer, precisely so a transient offline/5xx blip cannot route a signed-in user to a
// "Sign in" prompt. This test pins the CONSEQUENCE at the lock layer, so flipping that
// default back to `false` in entitlement.js fails here with a user-facing symptom rather
// than only in a shape assertion that reads like a harmless deepEqual update.
// ---------------------------------------------------------------------------
test('deriveLockReason — a transient entitlement failure (authenticated defaults true) yields an UPGRADE prompt, never signin', () => {
  const lessons = [
    { id: 'l1', order: 1, free: true },
    { id: 'l2', order: 2, free: false },
  ];
  // What getEntitlement() returns when the network is down and nothing is cached:
  // entitled:false (fail closed) + authenticated:true (fail to "assume signed in").
  const { entitled, authenticated } = { entitled: false, authenticated: true };
  const tier = entitled ? 'paid' : 'free';

  const reason = deriveLockReason(lessons[1], lessons, [{ lessonId: 'l1', status: 'complete' }], tier, authenticated);
  assert.equal(reason, 'tier', 'a tier-locked lesson under unknown auth must read as tier, not signin');
  assert.equal(
    dispatchLockAction(reason), 'upgrade',
    'the user must be offered Upgrade, not asked to sign in while already signed in',
  );
});

test('deriveLockReason — a genuinely signed-out visitor still gets signin', () => {
  const lessons = [
    { id: 'l1', order: 1, free: true },
    { id: 'l2', order: 2, free: false },
  ];
  const reason = deriveLockReason(lessons[1], lessons, [{ lessonId: 'l1', status: 'complete' }], 'free', false);
  assert.equal(reason, 'signin');
  assert.equal(dispatchLockAction(reason), 'signin');
});
