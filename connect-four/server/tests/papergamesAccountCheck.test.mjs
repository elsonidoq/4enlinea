// 2026-08-23 production incident: every import for one user failed with
//   [papergames-import-job] Papergames API unreachable: fetchRooms HTTP 404
// Papergames was fine. The account id stored on the profile (69e77229f8f489b51eabd6eb) simply
// did not exist upstream — GET /api/profile/<id> answered 404 "User with this email does not
// exist", while the user's real id (69e773d36bf9938bffc1509a) answered 200 with count: 1325 on
// the identical URL. Two defects turned a one-field typo into an outage hunt:
//   1. importForUser's probe collapsed every failure into "Papergames API unreachable", and
//      retried a deterministic 404 three times.
//   2. PUT /api/user/profile accepted any non-empty string <= 64 chars, so the bad id was only
//      discovered minutes later inside a background job.
// These tests pin the classification and the existence check. Real upstream shapes were
// captured by curl against papergames.io on 2026-08-23 (see the incident write-up).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  classifyPapergamesFetchError,
  verifyPapergamesAccount,
} from '../papergamesImporter.js';

describe('classifyPapergamesFetchError — a 404 is a wrong account id, not an outage', () => {
  it('classifies an upstream 404 as a non-retryable missing account, naming the id', () => {
    const err = new Error('fetchRooms HTTP 404');
    err.status = 404;
    const result = classifyPapergamesFetchError(err, '69e77229f8f489b51eabd6eb');
    assert.equal(result.kind, 'account_not_found');
    assert.equal(result.retryable, false);
    assert.match(result.message, /69e77229f8f489b51eabd6eb/);
    assert.doesNotMatch(result.message, /unreachable/i);
  });

  it('classifies a 5xx as a retryable unreachable-API failure', () => {
    const err = new Error('fetchRooms HTTP 503');
    err.status = 503;
    const result = classifyPapergamesFetchError(err, 'acct');
    assert.equal(result.kind, 'unreachable');
    assert.equal(result.retryable, true);
    assert.match(result.message, /unreachable/i);
  });

  it('classifies a network/timeout error (no status) as retryable unreachable', () => {
    const result = classifyPapergamesFetchError(new Error('The operation was aborted'), 'acct');
    assert.equal(result.kind, 'unreachable');
    assert.equal(result.retryable, true);
  });
});

describe('verifyPapergamesAccount — save-time existence check', () => {
  it('returns "ok" for an account that resolves (200)', async () => {
    const fetchImpl = async () => ({ ok: true, status: 200 });
    assert.equal(await verifyPapergamesAccount('69e773d36bf9938bffc1509a', { fetchImpl }), 'ok');
  });

  it('returns "not_found" for the incident id (404)', async () => {
    const fetchImpl = async () => ({ ok: false, status: 404 });
    assert.equal(await verifyPapergamesAccount('69e77229f8f489b51eabd6eb', { fetchImpl }), 'not_found');
  });

  it('returns "unknown" — never "not_found" — when Papergames itself is failing (5xx)', async () => {
    const fetchImpl = async () => ({ ok: false, status: 502 });
    assert.equal(await verifyPapergamesAccount('acct', { fetchImpl }), 'unknown');
  });

  it('returns "unknown" when the request throws (offline/timeout), so an outage never blocks a save', async () => {
    const fetchImpl = async () => { throw new Error('fetch failed'); };
    assert.equal(await verifyPapergamesAccount('acct', { fetchImpl }), 'unknown');
  });

  it('probes the profile endpoint for the given id (not the rooms listing)', async () => {
    let seen = null;
    const fetchImpl = async (url) => { seen = String(url); return { ok: true, status: 200 }; };
    await verifyPapergamesAccount('abc123', { fetchImpl });
    assert.match(seen, /^https:\/\/papergames\.io\/api\/profile\/abc123(\?|$)/);
  });
});
