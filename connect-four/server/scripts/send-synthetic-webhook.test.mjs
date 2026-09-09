// server/scripts/send-synthetic-webhook.test.mjs — spec 058 (e2e-qa-enablement) T017.
//
// Unit-tests buildSignatureHeader() and substituteFixture() in isolation —
// no HTTP, no real fixture file, no server process. Verifies the signature
// format matches exactly what `webhooks-validator.js` (the real Paddle SDK
// verifier used in server/paddleProcessor.js) expects:
//   `ts=<ts>;h1=<hex hmac-sha256(secret, `${ts}:${rawBody}`)>`

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { buildSignatureHeader, substituteFixture } from './send-synthetic-webhook.js';

test('buildSignatureHeader matches ts=<ts>;h1=<hex> with HMAC over `${ts}:${rawBody}`', () => {
  const secret = 'ntfset_test_secret_do_not_use';
  const ts = 1735689600; // fixed timestamp, arbitrary
  const rawBody = '{"event_id":"evt_123","data":{"id":"sub_123","customer_id":"ctm_123","status":"paused"}}';

  const header = buildSignatureHeader(secret, ts, rawBody);

  const expectedHmac = createHmac('sha256', secret).update(`${ts}:${rawBody}`).digest('hex');
  assert.equal(header, `ts=${ts};h1=${expectedHmac}`);
});

test('buildSignatureHeader is sensitive to the exact raw body string (no re-serialization drift)', () => {
  const secret = 'ntfset_test_secret_do_not_use';
  const ts = 1735689600;
  const bodyA = '{"a":1}';
  const bodyB = '{"a": 1}'; // different whitespace = different bytes = different signature

  assert.notEqual(buildSignatureHeader(secret, ts, bodyA), buildSignatureHeader(secret, ts, bodyB));
});

test('substituteFixture: snake_case fixture — substitutes customerId, id, event_id, occurred_at; never data.status', () => {
  const fixture = {
    event_id: 'evt_original',
    occurred_at: '2026-01-01T00:00:00Z',
    data: {
      id: 'sub_original',
      customer_id: 'ctm_original',
      status: 'active',
    },
  };

  const out = substituteFixture(fixture, { customerId: 'ctm_new', subscriptionId: 'sub_new' });

  assert.equal(out.data.customer_id, 'ctm_new');
  assert.equal(out.data.id, 'sub_new');
  assert.notEqual(out.event_id, 'evt_original'); // re-stamped fresh (NF12)
  assert.notEqual(out.occurred_at, '2026-01-01T00:00:00Z');
  assert.equal(out.data.status, 'active'); // FR-017: never touched
  // Original object is untouched (deep clone).
  assert.equal(fixture.data.customer_id, 'ctm_original');
});

test('substituteFixture: camelCase fixture — REJECTED, never silently substituted', () => {
  // Regression guard. This test previously asserted that a camelCase fixture
  // was substituted in place, which cemented a silent-false-success bug: the
  // Paddle SDK unmarshals the WIRE form and maps it itself
  // (`this.customerId = subscription.customer_id`), so a camelCase payload
  // arrives downstream with `customerId: undefined`. writeTier then issues
  // `.eq('paddle_customer_id', undefined)`, matches zero rows, Supabase
  // reports no error on a zero-row UPDATE, and the webhook route still answers
  // 200 {received:true, handled:true} — NF11's exact failure class, which this
  // whole script exists to make impossible. Reject loudly instead.
  const fixture = {
    eventId: 'evt_original',
    occurredAt: '2026-01-01T00:00:00Z',
    data: {
      id: 'sub_original',
      customerId: 'ctm_original',
      status: 'canceled',
    },
  };

  assert.throws(
    () => substituteFixture(fixture, { customerId: 'ctm_new' }),
    /camelCase/,
  );
});

test('substituteFixture: re-stamps a fresh event_id on every invocation (NF12)', () => {
  const fixture = {
    event_id: 'evt_original',
    occurred_at: '2026-01-01T00:00:00Z',
    data: { id: 'sub_1', customer_id: 'ctm_1', status: 'past_due' },
  };

  const out1 = substituteFixture(fixture, { customerId: 'ctm_1' });
  const out2 = substituteFixture(fixture, { customerId: 'ctm_1' });

  assert.notEqual(out1.event_id, out2.event_id);
});

test('substituteFixture: fails loudly when data is missing entirely', () => {
  assert.throws(() => substituteFixture({ event_id: 'e', occurred_at: 'x' }, { customerId: 'ctm_1' }), /no top-level `data`/);
});

test('substituteFixture: fails loudly when neither customerId nor customer_id is present', () => {
  const fixture = { event_id: 'e', occurred_at: 'x', data: { id: 'sub_1', status: 'paused' } };
  assert.throws(() => substituteFixture(fixture, { customerId: 'ctm_1' }), /neither `customerId` nor `customer_id`/);
});

test('substituteFixture: fails loudly when neither event_id nor eventId is present at the top level', () => {
  const fixture = { occurred_at: 'x', data: { id: 'sub_1', customer_id: 'ctm_1', status: 'paused' } };
  assert.throws(() => substituteFixture(fixture, { customerId: 'ctm_1' }), /neither `event_id` nor `eventId`/);
});

test('substituteFixture: fails loudly when neither occurred_at nor occurredAt is present at the top level', () => {
  const fixture = { event_id: 'e', data: { id: 'sub_1', customer_id: 'ctm_1', status: 'paused' } };
  assert.throws(() => substituteFixture(fixture, { customerId: 'ctm_1' }), /neither `occurred_at` nor `occurredAt`/);
});

test('substituteFixture: throws when --customer-id is missing', () => {
  const fixture = { event_id: 'e', occurred_at: 'x', data: { id: 'sub_1', customer_id: 'ctm_1', status: 'paused' } };
  assert.throws(() => substituteFixture(fixture, {}), /--customer-id is required/);
});
