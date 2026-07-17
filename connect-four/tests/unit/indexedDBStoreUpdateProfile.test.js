// Unit test for IndexedDBStore.updateProfile (Epic 8 — Onboarding Experience, T008).
//
// Node has no browser indexedDB global and this project has no fake-indexeddb
// dependency, so this test installs a minimal in-memory stub of the exact
// IndexedDB surface IndexedDBStore.js touches (open/transaction/objectStore/
// getAll/put, with oncomplete firing only after all requests created during
// the transaction have resolved). This mirrors the project's existing
// plain-stub-object testing convention (see tests/blunder/insertGameBlunder.test.js)
// rather than mocking a library.

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

function installFakeIndexedDB() {
  const profileRows = new Map(); // device_uuid -> record

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

  return profileRows;
}

describe('IndexedDBStore.updateProfile', () => {
  let IndexedDBStore;
  let profileRows;

  before(async () => {
    profileRows = installFakeIndexedDB();
    ({ IndexedDBStore } = await import('../../src/store/IndexedDBStore.js'));
  });

  it('merges patch into the existing row without clobbering other fields', async () => {
    const store = new IndexedDBStore();
    const profile = await store.getProfile(); // seeds a row with device_uuid + tier
    assert.equal(profile.tier, 'free');
    assert.ok(profile.device_uuid);

    await store.updateProfile({ onboarding_status: 'seen' });

    const updated = Array.from(profileRows.values())[0];
    assert.equal(updated.onboarding_status, 'seen');
    // Other fields must survive the merge.
    assert.equal(updated.device_uuid, profile.device_uuid);
    assert.equal(updated.tier, 'free');
  });

  it('a second updateProfile call merges on top of the first, not clobbering it', async () => {
    const store = new IndexedDBStore();
    await store.getProfile();
    await store.updateProfile({ onboarding_status: 'seen' });
    await store.updateProfile({ tier: 'paid' });

    const updated = Array.from(profileRows.values())[0];
    assert.equal(updated.onboarding_status, 'seen');
    assert.equal(updated.tier, 'paid');
  });
});
