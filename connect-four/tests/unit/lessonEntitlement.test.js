// Unit tests for server/lessonEntitlement.js#buildLessonResponse (spec 053, T005).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { buildLessonResponse } from '../../server/lessonEntitlement.js';

const FREE_LESSON = {
  id: 'immediate-threat',
  title: 'Immediate Threat',
  order: 1,
  free: true,
  slides: [{ text: 'slide content' }],
};

const PAID_LESSON = {
  id: 'undercut',
  title: 'Undercut',
  order: 11,
  free: false,
  slides: [{ text: 'paid slide content' }],
};

describe('buildLessonResponse (spec 053)', () => {
  it('free lesson + any entitlement -> full lesson, no locked key at all', () => {
    for (const entitlement of [
      { entitled: true, authenticated: true },
      { entitled: false, authenticated: true },
      { entitled: false, authenticated: false },
    ]) {
      const result = buildLessonResponse(FREE_LESSON, entitlement);
      assert.deepEqual(result, FREE_LESSON);
      assert.equal('locked' in result, false, 'unlocked response must not carry a locked key at all, not even locked:false');
    }
  });

  it('paid lesson + entitled:true -> full lesson', () => {
    const result = buildLessonResponse(PAID_LESSON, { entitled: true, authenticated: true });
    assert.deepEqual(result, PAID_LESSON);
    assert.equal('locked' in result, false);
  });

  it('paid lesson + entitled:false, authenticated:true -> redacted stub, no slides, no authenticated', () => {
    const result = buildLessonResponse(PAID_LESSON, { entitled: false, authenticated: true });
    assert.deepEqual(result, {
      id: PAID_LESSON.id,
      title: PAID_LESSON.title,
      order: PAID_LESSON.order,
      free: PAID_LESSON.free,
      locked: true,
    });
    assert.equal('slides' in result, false, 'must assert absence via "in", not === undefined');
    assert.equal('authenticated' in result, false, 'this endpoint never carries an authenticated field');
  });

  it('paid lesson + entitled:false, authenticated:false -> identical stub shape', () => {
    const authedResult = buildLessonResponse(PAID_LESSON, { entitled: false, authenticated: true });
    const anonResult = buildLessonResponse(PAID_LESSON, { entitled: false, authenticated: false });
    assert.deepEqual(anonResult, authedResult, 'the two unentitled cases must produce the same body — authenticated is not part of this response');
    assert.equal('slides' in anonResult, false);
    assert.equal('authenticated' in anonResult, false);
  });
});
