// Seam test for GET /api/user/entitlement (spec 053, T018).
//
// This route (server/userRoutes.js) is a one-line wrapper —
// `res.json(entitlementForRequest(req))` — so the test exercises the real
// route through a real Express app + HTTP request (same harness pattern as
// server/userEndpoints.test.mjs), asserting the wrapper returns
// entitlementForRequest(req)'s result verbatim, not a reimplementation of
// entitlement logic. Per testing-conventions.md's "test the real seam".

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';

import { registerUserRoutes } from '../../server/userRoutes.js';

function createApp(userMiddleware) {
  const app = express();
  app.use(express.json());
  if (userMiddleware) {
    app.use((req, _res, next) => {
      userMiddleware(req);
      next();
    });
  }
  registerUserRoutes(app, /* supabase */ null);
  return app;
}

function request(app, method, path) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const { port } = server.address();
      const req = http.request({ method, hostname: 'localhost', port, path }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          server.close();
          let parsed = null;
          try { parsed = JSON.parse(data); } catch { /* no-op */ }
          resolve({ status: res.statusCode, body: parsed });
        });
      });
      req.on('error', reject);
      req.end();
    });
  });
}

describe('GET /api/user/entitlement (spec 053 T017/T018)', () => {
  it('paid signed-in caller -> 200 { entitled: true, authenticated: true }', async () => {
    const app = createApp((req) => { req.user = { id: 'u1', tier: 'paid' }; });
    const { status, body } = await request(app, 'GET', '/api/user/entitlement');
    assert.equal(status, 200);
    assert.deepEqual(body, { entitled: true, authenticated: true });
  });

  it('free signed-in caller -> 200 { entitled: false, authenticated: true }', async () => {
    const app = createApp((req) => { req.user = { id: 'u2', tier: 'free' }; });
    const { status, body } = await request(app, 'GET', '/api/user/entitlement');
    assert.equal(status, 200);
    assert.deepEqual(body, { entitled: false, authenticated: true });
  });

  it('anonymous caller (req.user === null) -> 200 { entitled: false, authenticated: false }, NOT 401', async () => {
    const app = createApp((req) => { req.user = null; });
    const { status, body } = await request(app, 'GET', '/api/user/entitlement');
    assert.equal(status, 200);
    assert.deepEqual(body, { entitled: false, authenticated: false });
  });

  it('no auth middleware at all (req.user undefined) -> still 200, same anonymous shape', async () => {
    const app = createApp(null);
    const { status, body } = await request(app, 'GET', '/api/user/entitlement');
    assert.equal(status, 200);
    assert.deepEqual(body, { entitled: false, authenticated: false });
  });
});
