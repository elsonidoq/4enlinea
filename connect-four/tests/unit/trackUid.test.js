// Unit test for track()'s uid population (Epic 8 — Onboarding Experience,
// FR-015 / T012). Verifies track() reads the local anonymous profile's
// device_uuid and includes it as `uid` in the POST body to /api/track.
//
// Uses the same minimal in-memory fake IndexedDB approach as
// tests/unit/indexedDBStoreUpdateProfile.test.js (no fake-indexeddb dep in
// this project) and a stubbed globalThis.fetch to capture the request body.

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

function installFakeIndexedDB() {
  const profileRows = new Map();
  // Seed an existing anonymous profile row. track() reads via peekProfile()
  // (read-only, non-creating) so — unlike getProfile() — it will NOT create a
  // row if none exists; the uid it reports comes from a pre-existing profile.
  profileRows.set('test-device-uuid', { device_uuid: 'test-device-uuid', tier: 'free' });

  class FakeRequest {
    constructor() {
      this.onsuccess = null;
      this.onerror = null;
      this.result = undefined;
    }
  }

  class FakeObjectStore {
    constructor(tx) {
      this._tx = tx;
    }
    getAll() {
      this._tx._requestStarted();
      const req = new FakeRequest();
      queueMicrotask(() => {
        req.result = Array.from(profileRows.values());
        if (req.onsuccess) req.onsuccess();
        this._tx._requestFinished();
      });
      return req;
    }
    put(record) {
      this._tx._requestStarted();
      profileRows.set(record.device_uuid, record);
      const req = new FakeRequest();
      queueMicrotask(() => {
        if (req.onsuccess) req.onsuccess();
        this._tx._requestFinished();
      });
      return req;
    }
  }

  class FakeTransaction {
    constructor() {
      this.oncomplete = null;
      this.onerror = null;
      this._pending = 0;
      this._done = false;
    }
    objectStore() {
      return new FakeObjectStore(this);
    }
    _requestStarted() {
      this._pending++;
    }
    _requestFinished() {
      this._pending--;
      this._maybeComplete();
    }
    _maybeComplete() {
      if (this._pending === 0 && !this._done) {
        queueMicrotask(() => {
          if (this._pending === 0 && !this._done) {
            this._done = true;
            if (this.oncomplete) this.oncomplete();
          }
        });
      }
    }
  }

  class FakeDB {
    transaction() {
      return new FakeTransaction();
    }
  }

  globalThis.indexedDB = {
    open() {
      const req = new FakeRequest();
      queueMicrotask(() => {
        req.result = new FakeDB();
        if (req.onsuccess) req.onsuccess();
      });
      return req;
    },
  };
}

describe('track() uid population', () => {
  let track;
  let fetchCalls;
  let originalFetch;

  before(async () => {
    installFakeIndexedDB();
    fetchCalls = [];
    originalFetch = globalThis.fetch;
    globalThis.fetch = async (url, opts) => {
      fetchCalls.push({ url, opts });
      return { ok: true };
    };
    ({ track } = await import('../../src/lib/track.js'));
  });

  it('populates uid from the local profile device_uuid in the POST body', async () => {
    track('onboarding_started', { foo: 1 });

    // track() is fire-and-forget; wait for its internal promise chain
    // (getProfile → fetch) to settle across a few microtask ticks.
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.equal(fetchCalls.length, 1);
    const body = JSON.parse(fetchCalls[0].opts.body);
    assert.equal(body.event, 'onboarding_started');
    assert.deepEqual(body.data, { foo: 1 });
    assert.ok(body.uid, 'uid must be populated');
    assert.equal(body.uid, 'test-device-uuid');
  });

  it('reuses the same uid across multiple track() calls', async () => {
    fetchCalls.length = 0;
    track('event_a');
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    track('event_b');
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.equal(fetchCalls.length, 2);
    const uidA = JSON.parse(fetchCalls[0].opts.body).uid;
    const uidB = JSON.parse(fetchCalls[1].opts.body).uid;
    assert.equal(uidA, uidB);
  });

  after(() => {
    globalThis.fetch = originalFetch;
  });
});
