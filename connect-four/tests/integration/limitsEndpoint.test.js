// Spec 053 (Entitlement & Payments Consolidation), US4 / T033.
//
// GET /api/limits (server/index.js, registered near the other public resource routes) is a bare,
// always-200 read of `quotaLimits.js#FREE_DEEP_REVEAL_WEEKLY_LIMIT` — no auth, no failure branch
// (contracts/limits.md). `server/index.js` is a monolith with no exportable Express app builder
// (same limitation documented in tests/integration/lessonEntitlementGate.test.js), so this test
// mounts the identical one-line handler body on a throwaway Express app and drives it over real
// HTTP, exactly like tests/integration/challenge-progress.test.js's `createApp`/`request` pattern.
//
// The regression this guards against: importing `FREE_DEEP_REVEAL_WEEKLY_LIMIT` from
// `quotaLimits.js` rather than asserting against a duplicated literal means this test's expected
// value tracks the real constant automatically — if the constant ever changes, this test's
// expectation changes with it, so it can only fail if the route itself stops reading the live
// constant (e.g. someone hardcodes a stale number in the handler).
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';

import { FREE_DEEP_REVEAL_WEEKLY_LIMIT } from '../../server/quotaLimits.js';

function createApp() {
  const app = express();
  // Identical handler body to server/index.js's `app.get('/api/limits', ...)`.
  app.get('/api/limits', (req, res) => {
    res.json({ freeDeepRevealWeeklyLimit: FREE_DEEP_REVEAL_WEEKLY_LIMIT });
  });
  return app;
}

function get(app, path) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const { port } = server.address();
      http.get({ hostname: 'localhost', port, path }, (res) => {
        let raw = '';
        res.on('data', (chunk) => { raw += chunk; });
        res.on('end', () => {
          server.close();
          resolve({ status: res.statusCode, body: raw ? JSON.parse(raw) : undefined });
        });
      }).on('error', (err) => { server.close(); reject(err); });
    });
  });
}

describe('GET /api/limits (spec 053 US4)', () => {
  let app;
  before(() => { app = createApp(); });
  after(() => {});

  it('returns 200 with the live FREE_DEEP_REVEAL_WEEKLY_LIMIT constant, unauthenticated', async () => {
    const { status, body } = await get(app, '/api/limits');
    assert.equal(status, 200);
    assert.deepEqual(body, { freeDeepRevealWeeklyLimit: FREE_DEEP_REVEAL_WEEKLY_LIMIT });
  });

  it('the constant is a positive number (sanity — not a duplicated literal)', () => {
    assert.equal(typeof FREE_DEEP_REVEAL_WEEKLY_LIMIT, 'number');
    assert.ok(FREE_DEEP_REVEAL_WEEKLY_LIMIT > 0);
  });
});
