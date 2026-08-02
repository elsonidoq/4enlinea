// Spec 053 (Entitlement & Payments Consolidation), US1 / T007.
//
// Exercises GET /api/lessons/:id's entitlement gate through the exact same
// composition the real handler uses — getLesson(id, locale) -> 404 check ->
// entitlementForRequest(req) -> buildLessonResponse(lesson, entitlement) —
// using the REAL lesson content loaded from connect-four/lessons/ (no
// reimplementation of the handler's logic, per testing-conventions.md's
// "Test the real seam, never a copy of it" and the
// blunderPermalinkContext.test.js precedent this follows). `server/index.js`
// is a monolith with no exportable Express app builder, so this test drives
// the same functions the handler calls, in the same order, rather than
// booting a full HTTP server.
//
// T001's verified lesson ids (re-derived from the `free` field of every
// connect-four/lessons/*.json file, not assumed from the epic's "1-10 free,
// 11-15 paid" text):
//   free lesson id: 'immediate-threat' (lesson-01-immediate-threat.json, free: true)
//   paid lesson id: 'undercut'         (lesson-11-undercut.json,        free: false)

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadLessons, getLesson, getLessons } from '../../server/lessonLoader.js';
import { entitlementForRequest } from '../../server/entitlement.js';
import { buildLessonResponse } from '../../server/lessonEntitlement.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LESSONS_DIR = path.join(__dirname, '../../lessons');

const FREE_LESSON_ID = 'immediate-threat';
const PAID_LESSON_ID = 'undercut';

/** Mirrors the exact composition inside the GET /api/lessons/:id handler. */
function handleGetLessonById(req, id) {
  const locale = req.locale ?? 'en';
  const lesson = getLesson(id, locale);
  if (!lesson) return { status: 404, body: { error: 'not_found' } };
  const entitlement = entitlementForRequest(req);
  return { status: 200, body: buildLessonResponse(lesson, entitlement) };
}

describe('GET /api/lessons/:id — entitlement gate (spec 053 US1)', () => {
  before(() => {
    loadLessons(LESSONS_DIR);
  });

  it('signed-out caller requesting a paid lesson gets no slides key and locked:true', () => {
    const { status, body } = handleGetLessonById({ user: null }, PAID_LESSON_ID);
    assert.equal(status, 200);
    assert.equal(body.id, PAID_LESSON_ID);
    assert.equal(body.free, false);
    assert.equal(body.locked, true);
    assert.equal('slides' in body, false);
  });

  it('paid entitlement requesting a paid lesson gets the full lesson', () => {
    const { status, body } = handleGetLessonById({ user: { tier: 'paid' } }, PAID_LESSON_ID);
    assert.equal(status, 200);
    assert.equal('locked' in body, false);
    assert.ok(Array.isArray(body.slides) && body.slides.length > 0, 'full lesson must carry its slides');
  });

  it('free entitlement (signed-in, tier free) requesting a paid lesson also gets the locked stub', () => {
    const { status, body } = handleGetLessonById({ user: { tier: 'free' } }, PAID_LESSON_ID);
    assert.equal(status, 200);
    assert.equal(body.locked, true);
    assert.equal('slides' in body, false);
  });

  it('every caller (signed-out, free, paid) requesting a free lesson gets the full lesson', () => {
    for (const user of [null, { tier: 'free' }, { tier: 'paid' }]) {
      const { status, body } = handleGetLessonById({ user }, FREE_LESSON_ID);
      assert.equal(status, 200);
      assert.equal('locked' in body, false);
      assert.ok(Array.isArray(body.slides) && body.slides.length > 0, 'free lesson must always carry its slides');
    }
  });

  it('a nonexistent lesson id still 404s, unaffected by the entitlement gate', () => {
    const { status, body } = handleGetLessonById({ user: null }, 'does-not-exist');
    assert.equal(status, 404);
    assert.deepEqual(body, { error: 'not_found' });
  });

  it('GET /api/lessons (list endpoint) is unaffected by this feature — unchanged projection, no slides/locked', () => {
    const list = getLessons();
    assert.ok(list.length > 0);
    for (const entry of list) {
      assert.deepEqual(Object.keys(entry).sort(), ['free', 'id', 'order', 'title']);
      assert.equal('slides' in entry, false);
      assert.equal('locked' in entry, false);
    }
    const paidEntry = list.find(l => l.id === PAID_LESSON_ID);
    assert.ok(paidEntry, 'the paid lesson must still be listed');
    assert.equal(paidEntry.free, false);
  });
});
