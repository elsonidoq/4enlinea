import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { resolveDeviceUuid } from './deviceIdentity.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function makeRes() {
  return { cookie: mock.fn() };
}

describe('resolveDeviceUuid', () => {
  it('bodyValue supplied → returned unchanged, no cookie minted', () => {
    const res = makeRes();
    const req = { cookies: { dc4_device_uuid: 'existing-cookie-uuid' } };
    const result = resolveDeviceUuid(req, res, 'body-supplied-uuid');
    assert.equal(result, 'body-supplied-uuid');
    assert.equal(res.cookie.mock.calls.length, 0);
  });

  it('no bodyValue but req.cookies.dc4_device_uuid present → that value returned, no new mint', () => {
    const res = makeRes();
    const req = { cookies: { dc4_device_uuid: 'existing-cookie-uuid' } };
    const result = resolveDeviceUuid(req, res, undefined);
    assert.equal(result, 'existing-cookie-uuid');
    assert.equal(res.cookie.mock.calls.length, 0);
  });

  it('neither present → crypto.randomUUID() minted, cookie set once, minted value returned', () => {
    const res = makeRes();
    const req = { cookies: {} };
    const result = resolveDeviceUuid(req, res, undefined);
    assert.match(result, UUID_RE);
    assert.equal(res.cookie.mock.calls.length, 1);
    const [name, value, opts] = res.cookie.mock.calls[0].arguments;
    assert.equal(name, 'dc4_device_uuid');
    assert.equal(value, result);
    assert.equal(opts.httpOnly, true);
    assert.equal(opts.sameSite, 'lax');
    assert.equal(opts.path, '/');
    assert.equal(opts.maxAge, 60 * 24 * 3600_000);
  });

  it('neither present, no req.cookies object at all → still mints without throwing', () => {
    const res = makeRes();
    const req = {};
    const result = resolveDeviceUuid(req, res, undefined);
    assert.match(result, UUID_RE);
    assert.equal(res.cookie.mock.calls.length, 1);
  });
});
