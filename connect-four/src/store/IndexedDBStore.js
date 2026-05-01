const DB_NAME = 'decodec4';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('profile')) {
        db.createObjectStore('profile', { keyPath: 'device_uuid' });
      }
      if (!db.objectStoreNames.contains('puzzle_attempts')) {
        const store = db.createObjectStore('puzzle_attempts', { autoIncrement: true });
        store.createIndex('puzzle_id', 'puzzle_id');
        store.createIndex('created_at', 'created_at');
      }
      if (!db.objectStoreNames.contains('session_stats')) {
        db.createObjectStore('session_stats', { keyPath: 'date' });
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
          tier: 'anonymous',
          deep_reveal_count: 0,
          deep_reveal_reset_at: new Date().toISOString(),
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

  async migrateToSupabase(supabaseStore, supabaseClient) {
    const profile = await this.getProfile();
    const attempts = await this.getAllPuzzleAttempts();

    // Bulk insert attempts into Supabase
    if (attempts.length > 0) {
      const { error } = await supabaseClient
        .from('puzzle_attempts')
        .insert(attempts.map(a => ({
          puzzle_id: a.puzzle_id,
          device_uuid: profile.device_uuid,
          moves_tried: a.moves_tried || [],
          outcome: a.outcome,
          first_attempt_correct: a.first_attempt_correct,
          time_ms: a.time_ms,
          created_at: a.created_at,
        })));
      if (error) throw new Error(`Migration failed: ${error.message}`);
    }

    // Clear IndexedDB after successful migration
    const db = await this._db();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(['puzzle_attempts', 'session_stats'], 'readwrite');
      tx.objectStore('puzzle_attempts').clear();
      tx.objectStore('session_stats').clear();
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }
}
