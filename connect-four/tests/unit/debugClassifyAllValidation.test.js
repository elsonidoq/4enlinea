// Regression test for spec 047 T016/T019/FR-011/FR-012 — the localhost-only debug
// classification endpoint (`POST /api/debug/classify-all`) must validate `req.body.moves`
// against the same canonical MOVES_RE used everywhere else in index.js, and reject a
// malformed value with 400 BEFORE it ever reaches the solver.
//
// server/index.js has heavy import-time side effects (spawns the c4solver process,
// initializes Supabase clients, calls app.listen(...)), so it is not imported directly here
// — see tests/unit/securityHeaders.test.js for the established pattern of replicating the
// logic under test on a throwaway Express app. The validation rule (MOVES_RE) and the
// requireLocalhost-then-validate ordering are replicated verbatim from index.js:
//   const MOVES_RE = /^[0-6]{0,42}$/;
//   app.post('/api/debug/classify-all', requireLocalhost, async (req, res) => {
//     const { moves: ms = '' } = req.body;
//     if (!MOVES_RE.test(ms)) return res.status(400).json({ error: '...' });
//     ... await solver.query(ms) ...
//   });
//
// FR-009/US3-AC1: `requireLocalhost` MUST check the raw TCP peer (`req.socket.remoteAddress`)
// ONLY — never `req.ip`. With `trust proxy: 1` set globally (index.js, needed for
// express-rate-limit to see real client IPs behind Railway's proxy), Express's `req.ip` resolves
// from the client-controlled `X-Forwarded-For` header for one hop, so a direct (non-proxied)
// caller could spoof `X-Forwarded-For: 127.0.0.1` and pass a `req.ip`-based check. Verified live
// against a running server 2026-07-12 (QA pass): a request from a real non-loopback interface
// with a forged header reached admin/debug endpoints when the gate checked `req.ip`; switching to
// `req.socket.remoteAddress` closes it, since that property reflects the actual TCP connection and
// is not influenced by any header.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';

const MOVES_RE = /^[0-6]{0,42}$/;

function requireLocalhost(req, res, next) {
  const ip = req.socket?.remoteAddress || '';
  if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') return next();
  return res.status(403).json({ error: 'Admin endpoints are localhost-only' });
}

function createApp(solverSpy) {
  const app = express();
  app.use(express.json());

  app.post('/api/debug/classify-all', requireLocalhost, async (req, res) => {
    const { moves: ms = '' } = req.body;
    if (!MOVES_RE.test(ms)) {
      return res.status(400).json({ error: 'moves must be 0–42 characters of digits 0–6' });
    }
    try {
      const scores = await solverSpy.query(ms);
      res.json({ scores });
    } catch {
      res.status(500).json({ error: 'internal error' });
    }
  });

  return app;
}

function post(app, path, body) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const { port } = server.address();
      const payload = JSON.stringify(body);
      const req = http.request(
        {
          method: 'POST',
          hostname: 'localhost',
          port,
          path,
          headers: { 'Content-Type': 'application/json' },
        },
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
      req.write(payload);
      req.end();
    });
  });
}

describe('POST /api/debug/classify-all — moves validation (FR-011/FR-012)', () => {
  it('rejects a malformed moves value with 400 and never invokes the solver', async () => {
    let solverCalled = false;
    const solverSpy = { query: async () => { solverCalled = true; return [0, 0, 0, 0, 0, 0, 0]; } };

    const app = createApp(solverSpy);
    const res = await post(app, '/api/debug/classify-all', { moves: 'not-a-movestring' });

    assert.equal(res.status, 400);
    const parsed = JSON.parse(res.body);
    assert.ok(parsed.error);
    assert.equal(solverCalled, false, 'solver.query must not be invoked on invalid input');
  });

  it('accepts a valid moves value and does invoke the solver', async () => {
    let solverCalled = false;
    const solverSpy = { query: async () => { solverCalled = true; return [0, 0, 0, 0, 0, 0, 0]; } };

    const app = createApp(solverSpy);
    const res = await post(app, '/api/debug/classify-all', { moves: '3344' });

    assert.equal(res.status, 200);
    assert.equal(solverCalled, true);
  });

  it('rejects moves containing digit 7-9 (out of column range)', async () => {
    const solverSpy = { query: async () => { throw new Error('should not be called'); } };
    const app = createApp(solverSpy);
    const res = await post(app, '/api/debug/classify-all', { moves: '789' });
    assert.equal(res.status, 400);
  });
});

// FR-009 / US3-AC1: a forged "X-Forwarded-For: 127.0.0.1" header from a non-loopback caller
// MUST NOT spoof the localhost gate. Tests `requireLocalhost` directly against mock req/res
// objects (adminAuth.test.js's pattern) since the vulnerability is specifically about which
// property the gate reads (`req.ip` vs `req.socket.remoteAddress`), not the HTTP transport.
describe('requireLocalhost — XFF spoofing guard (FR-009)', () => {
  function makeRes() {
    const res = { statusCode: 200, body: null };
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (body) => { res.body = body; return res; };
    return res;
  }

  it('rejects a non-loopback socket peer even with a forged X-Forwarded-For: 127.0.0.1 header', () => {
    const req = {
      socket: { remoteAddress: '203.0.113.5' }, // real, non-loopback peer (attacker)
      headers: { 'x-forwarded-for': '127.0.0.1' },
      ip: '127.0.0.1', // simulates Express's trust-proxy-derived req.ip trusting the forged header
    };
    const res = makeRes();
    let nextCalled = false;
    requireLocalhost(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, false, 'next() must NOT be called for a spoofed non-loopback peer');
    assert.equal(res.statusCode, 403);
  });

  it('allows a genuine loopback socket peer regardless of X-Forwarded-For', () => {
    const req = {
      socket: { remoteAddress: '127.0.0.1' },
      headers: { 'x-forwarded-for': '8.8.8.8' }, // irrelevant — real peer is loopback
      ip: '8.8.8.8',
    };
    const res = makeRes();
    let nextCalled = false;
    requireLocalhost(req, res, () => { nextCalled = true; });

    assert.ok(nextCalled, 'next() must be called for a genuine loopback peer');
  });

  it('allows a genuine ::1 (IPv6 loopback) socket peer', () => {
    const req = { socket: { remoteAddress: '::1' }, headers: {} };
    const res = makeRes();
    let nextCalled = false;
    requireLocalhost(req, res, () => { nextCalled = true; });

    assert.ok(nextCalled);
  });
});
