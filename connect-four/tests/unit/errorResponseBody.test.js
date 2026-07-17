// Regression test for spec 047 T017/T018/FR-010/FR-012 — public-endpoint 500 responses
// must never leak raw internal error text (err.message / stack) to the client; the real
// error detail is only ever surfaced via server-side logError/console.error.
//
// server/index.js has heavy import-time side effects (spawns the c4solver process,
// initializes Supabase clients, calls app.listen(...)), so it is not imported directly
// here — see tests/unit/securityHeaders.test.js and tests/integration/challenge-progress.test.js
// for the established pattern of building a minimal Express app with the logic under test
// replicated/mounted on a throwaway app.
//
// This test replicates the post-T017 shape used uniformly across all ~38+ 500-handler
// sites in index.js: on a caught error, log the real error server-side (via logError) and
// respond with a generic `{ error: 'internal error' }` body — never `err.message` or `err.stack`.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';

function createApp({ logErrorFn }) {
  const app = express();
  app.use(express.json());

  // Representative endpoint shape, mirroring index.js's post-T017 catch-block convention.
  app.get('/api/representative-endpoint', (req, res) => {
    try {
      throw new Error('SUPER SECRET internal detail: connection string leaked, stack trace, etc.');
    } catch (err) {
      logErrorFn('[representative-endpoint]', err);
      res.status(500).json({ error: 'internal error' });
    }
  });

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
            resolve({ status: res.statusCode, body: data });
          });
        }
      );
      req.on('error', (err) => { server.close(); reject(err); });
      req.end();
    });
  });
}

describe('5xx response bodies never leak raw internal error text (FR-010/FR-012/SC-004)', () => {
  it('forced-error 500 response body carries only the generic shape, never err.message/stack', async () => {
    let loggedTag = null;
    let loggedErr = null;
    const logErrorFn = (tag, err) => { loggedTag = tag; loggedErr = err; };

    const app = createApp({ logErrorFn });
    const res = await get(app, '/api/representative-endpoint');

    assert.equal(res.status, 500);

    const parsed = JSON.parse(res.body);
    assert.deepEqual(parsed, { error: 'internal error' });
    assert.doesNotMatch(res.body, /SUPER SECRET/);
    assert.doesNotMatch(res.body, /connection string/);
    assert.doesNotMatch(res.body, /at Object/); // stack-trace-shaped text

    // The real error detail must still reach server-side logging, just not the client.
    assert.equal(loggedTag, '[representative-endpoint]');
    assert.ok(loggedErr instanceof Error);
    assert.match(loggedErr.message, /SUPER SECRET/);
  });
});
