import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveGameBlunderOwner, resolveQueueOwner, resolveExplainQuota } from './anonBlunderAccess.js';

const UUID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

describe('resolveGameBlunderOwner', () => {
  it('authenticated caller → user scope, device_uuid null (preserves prior behavior even on an anon game)', () => {
    assert.deepEqual(resolveGameBlunderOwner({ id: 'u1' }, { device_uuid: UUID }), { user_id: 'u1', device_uuid: null });
  });
  it('anonymous caller + device-scoped game → device scope', () => {
    assert.deepEqual(resolveGameBlunderOwner(null, { device_uuid: UUID }), { user_id: null, device_uuid: UUID });
  });
  it('anonymous caller + game without device_uuid → null (no storage)', () => {
    assert.equal(resolveGameBlunderOwner(null, { device_uuid: null }), null);
    assert.equal(resolveGameBlunderOwner(undefined, {}), null);
  });
});

describe('resolveQueueOwner', () => {
  it('authenticated → user scope', () => {
    assert.deepEqual(resolveQueueOwner({ id: 'u1' }, null), { ok: true, scope: 'user', userId: 'u1' });
  });
  it('anonymous + valid device uuid → device scope', () => {
    assert.deepEqual(resolveQueueOwner(null, UUID), { ok: true, scope: 'device', deviceUuid: UUID });
  });
  it('anonymous + missing/invalid device uuid → not ok', () => {
    assert.deepEqual(resolveQueueOwner(null, null), { ok: false });
    assert.deepEqual(resolveQueueOwner(null, 'not-a-uuid'), { ok: false });
  });
});

describe('resolveExplainQuota', () => {
  it('free-tier authenticated → true', () => { assert.equal(resolveExplainQuota({ id: 'u1', tier: 'free' }), true); });
  it('paid authenticated → false', () => { assert.equal(resolveExplainQuota({ id: 'u1', tier: 'paid' }), false); });
  it('anonymous → false (no users row; bounded by rate limiter)', () => { assert.equal(resolveExplainQuota(null), false); assert.equal(resolveExplainQuota(undefined), false); });
});
