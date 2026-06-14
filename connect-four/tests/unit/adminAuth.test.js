import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requireAdmin } from '../../server/adminAuth.js';

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
  const prevNodeEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'development';

    const next = () => { next.called = true; };
    const res = makeRes();
    requireAdmin(makeReq(null), res, next);
    assert.ok(next.called, 'next() should be called in development');
  } finally {
    process.env.NODE_ENV = prevNodeEnv;
  }
});

test('requireAdmin: returns 403 in production when no user', async () => {
  const prevNodeEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';

    const next = () => { next.called = true; };
    const res = makeRes();
    requireAdmin(makeReq(null), res, next);
    assert.equal(res.statusCode, 403);
    assert.ok(!next.called, 'next() should NOT be called');
  } finally {
    process.env.NODE_ENV = prevNodeEnv;
  }
});

test('requireAdmin: returns 403 in production for non-admin email', async () => {
  const prevNodeEnv = process.env.NODE_ENV;
  const prevAdminEmails = process.env.ADMIN_EMAILS;
  try {
    process.env.NODE_ENV = 'production';
    process.env.ADMIN_EMAILS = 'admin@example.com';

    const next = () => { next.called = true; };
    const res = makeRes();
    requireAdmin(makeReq('other@example.com'), res, next);
    assert.equal(res.statusCode, 403);
    assert.ok(!next.called);
  } finally {
    process.env.NODE_ENV = prevNodeEnv;
    if (prevAdminEmails === undefined) {
      delete process.env.ADMIN_EMAILS;
    } else {
      process.env.ADMIN_EMAILS = prevAdminEmails;
    }
  }
});

test('requireAdmin: calls next() in production for admin email', async () => {
  const prevNodeEnv = process.env.NODE_ENV;
  const prevAdminEmails = process.env.ADMIN_EMAILS;
  try {
    process.env.NODE_ENV = 'production';
    process.env.ADMIN_EMAILS = 'admin@example.com';

    const next = () => { next.called = true; };
    const res = makeRes();
    requireAdmin(makeReq('admin@example.com'), res, next);
    assert.ok(next.called, 'next() should be called for admin email');
  } finally {
    process.env.NODE_ENV = prevNodeEnv;
    if (prevAdminEmails === undefined) {
      delete process.env.ADMIN_EMAILS;
    } else {
      process.env.ADMIN_EMAILS = prevAdminEmails;
    }
  }
});
