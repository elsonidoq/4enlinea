import { test } from 'node:test';
import assert from 'node:assert/strict';

let requireAdmin;

function makeReq(email) {
  return { user: email ? { email } : null };
}
function makeRes() {
  const res = { statusCode: 200, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
}

test('requireAdmin: calls next() in development env regardless of user', async () => {
  process.env.NODE_ENV = 'development';
  ({ requireAdmin } = await import('../../server/adminAuth.js'));

  const next = () => { next.called = true; };
  const res = makeRes();
  requireAdmin(makeReq(null), res, next);
  assert.ok(next.called, 'next() should be called in development');
});

test('requireAdmin: returns 403 in production when no user', async () => {
  ({ requireAdmin } = await import('../../server/adminAuth.js'));
  process.env.NODE_ENV = 'production';

  const next = () => { next.called = true; };
  const res = makeRes();
  requireAdmin(makeReq(null), res, next);
  assert.equal(res.statusCode, 403);
  assert.ok(!next.called, 'next() should NOT be called');

  process.env.NODE_ENV = 'development';
});

test('requireAdmin: returns 403 in production for non-admin email', async () => {
  ({ requireAdmin } = await import('../../server/adminAuth.js'));
  process.env.NODE_ENV = 'production';
  process.env.ADMIN_EMAILS = 'admin@example.com';

  const next = () => { next.called = true; };
  const res = makeRes();
  requireAdmin(makeReq('other@example.com'), res, next);
  assert.equal(res.statusCode, 403);
  assert.ok(!next.called);

  process.env.NODE_ENV = 'development';
  delete process.env.ADMIN_EMAILS;
});
