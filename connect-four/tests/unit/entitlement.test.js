// Unit tests for server/entitlement.js (spec 053, T003).
//
// Covers computeEntitlement's decision table and confirms
// entitlementForRequest(req) matches computeEntitlement(req.user) exactly
// for every case — entitlementForRequest is a thin req.user-unwrapping
// shell around the same pure core, so any divergence would mean the two
// production entry points can disagree, which FR-007/FR-008 forbid.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { computeEntitlement, entitlementForRequest } from '../../server/entitlement.js';

describe('entitlement.js (spec 053)', () => {
  it('paid user -> {entitled:true, authenticated:true}', () => {
    const user = { tier: 'paid' };
    assert.deepEqual(computeEntitlement(user), { entitled: true, authenticated: true });
    assert.deepEqual(entitlementForRequest({ user }), computeEntitlement(user));
  });

  it('free signed-in user -> {entitled:false, authenticated:true}', () => {
    const user = { tier: 'free' };
    assert.deepEqual(computeEntitlement(user), { entitled: false, authenticated: true });
    assert.deepEqual(entitlementForRequest({ user }), computeEntitlement(user));
  });

  it('null user -> {entitled:false, authenticated:false}', () => {
    assert.deepEqual(computeEntitlement(null), { entitled: false, authenticated: false });
    assert.deepEqual(entitlementForRequest({ user: null }), computeEntitlement(null));
  });

  it('undefined user -> {entitled:false, authenticated:false}', () => {
    assert.deepEqual(computeEntitlement(undefined), { entitled: false, authenticated: false });
    assert.deepEqual(entitlementForRequest({ user: undefined }), computeEntitlement(undefined));
  });

  it('malformed user shape does not throw, returns the fail-closed shape', () => {
    const malformed = { tier: 42 };
    assert.doesNotThrow(() => computeEntitlement(malformed));
    assert.deepEqual(computeEntitlement(malformed), { entitled: false, authenticated: true });
    assert.deepEqual(entitlementForRequest({ user: malformed }), computeEntitlement(malformed));

    // A user value that throws on property access must still fail closed.
    const throwing = new Proxy({}, { get() { throw new Error('boom'); } });
    assert.doesNotThrow(() => computeEntitlement(throwing));
    assert.deepEqual(computeEntitlement(throwing), { entitled: false, authenticated: false });
  });

  it('entitlementForRequest handles a req with no user field at all', () => {
    assert.doesNotThrow(() => entitlementForRequest({}));
    assert.deepEqual(entitlementForRequest({}), { entitled: false, authenticated: false });
  });
});
