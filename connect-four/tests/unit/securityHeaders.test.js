// Regression test for spec 047 T009/T011 — security response headers.
//
// server/index.js has heavy import-time side effects (spawns the c4solver
// process, initializes Supabase clients, calls app.listen(...)), so it is not
// imported directly here (no test in this repo imports index.js directly —
// see tests/integration/challenge-progress.test.js for the established
// pattern of building a minimal Express app with the module(s) under test
// mounted). This test mounts `helmet` with the exact directive set specified
// in index.js (spec 047 research.md §2) on a throwaway app and asserts the
// resulting response carries the required security headers.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import helmet from 'helmet';

function createApp() {
  const app = express();
  const supabaseHost = '127.0.0.1:54321';
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        mediaSrc: ["'self'", `https://${supabaseHost}`],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        objectSrc: ["'none'"],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true },
  }));
  app.get('/ping', (req, res) => res.json({ ok: true }));
  return app;
}

function get(app, path) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const { port } = server.address();
      const req = http.request(
        { method: 'GET', hostname: 'localhost', port, path },
        (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            server.close();
            resolve({ status: res.statusCode, headers: res.headers, body: data });
          });
        }
      );
      req.on('error', (err) => { server.close(); reject(err); });
      req.end();
    });
  });
}

describe('security headers (helmet)', () => {
  it('response carries CSP, HSTS, nosniff, and referrer-policy', async () => {
    const app = createApp();
    const res = await get(app, '/ping');

    assert.equal(res.status, 200);

    const csp = res.headers['content-security-policy'];
    assert.ok(csp, 'content-security-policy header missing');
    assert.match(csp, /default-src 'self'/);
    assert.match(csp, /frame-ancestors 'none'/);
    assert.match(csp, /object-src 'none'/);
    assert.match(csp, /media-src 'self' https:\/\/127\.0\.0\.1:54321/);

    const hsts = res.headers['strict-transport-security'];
    assert.ok(hsts, 'strict-transport-security header missing');
    assert.match(hsts, /max-age=31536000/);
    assert.match(hsts, /includeSubDomains/);

    assert.equal(res.headers['x-content-type-options'], 'nosniff');

    const referrerPolicy = res.headers['referrer-policy'];
    assert.ok(referrerPolicy, 'referrer-policy header missing');
  });
});
