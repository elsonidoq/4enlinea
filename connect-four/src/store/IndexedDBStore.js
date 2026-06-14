const DB_NAME = 'decodec4';
const DB_VERSION = 2;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (e.oldVersion < 1) {
        db.createObjectStore('profile', { keyPath: 'device_uuid' });
        const store = db.createObjectStore('puzzle_attempts', { autoIncrement: true });
        store.createIndex('puzzle_id', 'puzzle_id');
        store.createIndex('created_at', 'created_at');
        db.createObjectStore('session_stats', { keyPath: 'date' });
      }
      if (e.oldVersion < 2) {
        db.createObjectStore('lesson_progress', { keyPath: 'lessonId' });
        db.createObjectStore('sparring_record', { keyPath: 'id' });
        db.createObjectStore('streak', { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function generateUUID() {
  return crypto.randomUUID?.() ??
    ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
}

export class IndexedDBStore {
  constructor() {
    this._dbPromise = openDB();
  }

  async _db() {
    return this._dbPromise;
  }

  async getProfile() {
    const db = await this._db();
    return new Promise((resolve) => {
      const tx = db.transaction('profile', 'readwrite');
      const req = tx.objectStore('profile').getAll();
      req.onsuccess = async () => {
        if (req.result.length > 0) return resolve(req.result[0]);
        // Initialize new anonymous profile
        const profile = {
          device_uuid: generateUUID(),
          tier: 'free',
        };
        tx.objectStore('profile').put(profile);
        resolve(profile);
      };
    });
  }

  async saveSessionStats(stats) {
    const db = await this._db();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('session_stats', 'readwrite');
      tx.objectStore('session_stats').put(stats);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  async getSessionStats(date) {
    const db = await this._db();
    return new Promise((resolve) => {
      const req = db.transaction('session_stats', 'readonly')
        .objectStore('session_stats').get(date);
      req.onsuccess = () => resolve(req.result ?? null);
    });
  }

  async recordPuzzleAttempt(attempt) {
    const db = await this._db();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('puzzle_attempts', 'readwrite');
      tx.objectStore('puzzle_attempts').add({ ...attempt, created_at: new Date().toISOString() });
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  async getAllPuzzleAttempts() {
    const db = await this._db();
    return new Promise((resolve) => {
      const req = db.transaction('puzzle_attempts', 'readonly')
        .objectStore('puzzle_attempts').getAll();
      req.onsuccess = () => resolve(req.result);
    });
  }

  // T009 — lesson_progress
  async saveLessonProgress(lessonId, status) {
    const db = await this._db();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('lesson_progress', 'readwrite');
      tx.objectStore('lesson_progress').put({ lessonId, status });
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  async getLessonProgress() {
    const db = await this._db();
    return new Promise((resolve) => {
      const req = db.transaction('lesson_progress', 'readonly')
        .objectStore('lesson_progress').getAll();
      req.onsuccess = () => resolve(req.result ?? []);
    });
  }

  // T010 — sparring_record
  async getSparringRecord() {
    const db = await this._db();
    return new Promise((resolve) => {
      const req = db.transaction('sparring_record', 'readonly')
        .objectStore('sparring_record').get('singleton');
      req.onsuccess = () => resolve(req.result ? { W: req.result.W, L: req.result.L, D: req.result.D } : { W: 0, L: 0, D: 0 });
    });
  }

  async saveSparringRecord(result) {
    const record = await this.getSparringRecord();
    if (result === 'win') record.W += 1;
    else if (result === 'loss') record.L += 1;
    else if (result === 'draw') record.D += 1;
    const db = await this._db();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sparring_record', 'readwrite');
      tx.objectStore('sparring_record').put({ id: 'singleton', ...record });
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  // T011 — challenge sessions (uses existing session_stats store)
  async saveChallengeSession(session) {
    const db = await this._db();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('session_stats', 'readwrite');
      tx.objectStore('session_stats').put(session);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  async getLastChallengeSession() {
    const db = await this._db();
    return new Promise((resolve) => {
      const req = db.transaction('session_stats', 'readonly')
        .objectStore('session_stats').openCursor(null, 'prev');
      req.onsuccess = () => {
        const cursor = req.result;
        resolve(cursor ? cursor.value : null);
      };
    });
  }

  // T012 — streak
  async getStreak() {
    const db = await this._db();
    return new Promise((resolve) => {
      const req = db.transaction('streak', 'readonly')
        .objectStore('streak').get('singleton');
      req.onsuccess = () => resolve(req.result
        ? { streak_count: req.result.streak_count, last_active_date: req.result.last_active_date }
        : { streak_count: 0, last_active_date: null });
    });
  }

  async recordActivityDay() {
    const current = await this.getStreak();
    const today = new Date().toLocaleDateString('en-CA');
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yesterday = d.toLocaleDateString('en-CA');

    if (current.last_active_date === today) {
      // no-op
      return;
    }

    let streak_count;
    if (current.last_active_date === yesterday) {
      streak_count = current.streak_count + 1;
    } else {
      streak_count = 1;
    }
    const last_active_date = today;

    const db = await this._db();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('streak', 'readwrite');
      tx.objectStore('streak').put({ id: 'singleton', streak_count, last_active_date });
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  // T033 — migrateToSupabase via POST /api/user/migrate (all-or-nothing)
  async migrateToSupabase(_supabaseStore, supabaseClient) {
    // Step 1: Read ALL data from IndexedDB in parallel
    const db = await this._db();
    const [attempts, lessonRows, sparringRecord, sessionRows, streak] = await Promise.all([
      this.getAllPuzzleAttempts(),
      this.getLessonProgress(),
      this.getSparringRecord(),
      new Promise((resolve) => {
        const req = db.transaction('session_stats', 'readonly')
          .objectStore('session_stats').getAll();
        req.onsuccess = () => resolve(req.result);
      }),
      this.getStreak(),
    ]);

    // Step 2: Get auth token from supabaseClient (not supabaseStore)
    const { data: { session } } = await supabaseClient.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error('Migration failed: not authenticated');

    // Step 3: POST all data to /api/user/migrate — single atomic request
    const apiBase = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || '';
    const res = await fetch(`${apiBase}/api/user/migrate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        puzzle_attempts: attempts,
        session_stats: sessionRows,
        lesson_progress: lessonRows,
        sparring_record: sparringRecord,
        streak,
      }),
    });

    // Step 4: Throw on non-204 — do NOT clear IndexedDB
    if (!res.ok) {
      let errMsg = `Migration failed: HTTP ${res.status}`;
      try {
        const body = await res.json();
        if (body.error) errMsg += ` — ${body.error}`;
      } catch {
        // response body not JSON — keep status-only message
      }
      throw new Error(errMsg);
    }

    // Step 5: Only after success (204), clear all 5 IndexedDB stores
    await new Promise((resolve, reject) => {
      const tx = db.transaction(
        ['puzzle_attempts', 'session_stats', 'lesson_progress', 'sparring_record', 'streak'],
        'readwrite'
      );
      tx.objectStore('puzzle_attempts').clear();
      tx.objectStore('session_stats').clear();
      tx.objectStore('lesson_progress').clear();
      tx.objectStore('sparring_record').clear();
      tx.objectStore('streak').clear();
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }
}
