export class SupabaseStore {
  constructor(userId) {
    this._userId = userId;
  }

  // ── Private fetch helpers ──────────────────────────────────────────────────

  async _fetchGet(path, defaultVal) {
    const apiBase = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || '';
    const res = await fetch(`${apiBase}${path}`, { credentials: 'include' });
    if (!res.ok) return defaultVal;
    return res.json();
  }

  async _fetchPost(path, body) {
    const apiBase = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || '';
    const res = await fetch(`${apiBase}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'include',
    });
    // Silent no-op on non-ok — callers expect void return
  }

  // ── Profile ────────────────────────────────────────────────────────────────

  async getProfile() {
    return this._fetchGet('/api/user/profile', {
      device_uuid: null,
      tier: 'free',
      deep_reveal_count: 0,
      deep_reveal_reset_at: new Date().toISOString(),
    });
  }

  // ── Session stats ──────────────────────────────────────────────────────────

  async getSessionStats(date) {
    return this._fetchGet(`/api/user/session-stats?date=${encodeURIComponent(date)}`, null);
  }

  async saveSessionStats(stats) {
    return this._fetchPost('/api/user/session-stats', stats);
  }

  async getAllSessionStats() {
    return this._fetchGet('/api/user/session-stats/all', { rows: [], byPattern: {} });
  }

  // ── Puzzle attempts ────────────────────────────────────────────────────────

  async recordPuzzleAttempt(attempt) {
    const body = {
      puzzle_id: attempt.puzzle_id,
      moves_tried: attempt.moves_tried,
      outcome: attempt.outcome,
      first_attempt_correct: attempt.first_attempt_correct,
      time_ms: attempt.time_ms,
    };
    return this._fetchPost('/api/user/puzzle-attempts', body);
  }

  // ── Lesson progress ────────────────────────────────────────────────────────

  async getLessonProgress() {
    return this._fetchGet('/api/user/lesson-progress', []);
  }

  async saveLessonProgress(lessonId, status) {
    return this._fetchPost('/api/user/lesson-progress', { lessonId, status });
  }

  // ── Sparring record ────────────────────────────────────────────────────────

  async getSparringRecord() {
    return this._fetchGet('/api/user/sparring-record', { W: 0, L: 0, D: 0 });
  }

  async saveSparringRecord(result) {
    return this._fetchPost('/api/user/sparring-record', { result });
  }

  // ── Challenge sessions ─────────────────────────────────────────────────────

  async getLastChallengeSession() {
    return this._fetchGet('/api/user/challenge-session', null);
  }

  async saveChallengeSession(session) {
    return this._fetchPost('/api/user/challenge-session', session);
  }

  // ── Streak ─────────────────────────────────────────────────────────────────

  async getStreak() {
    return this._fetchGet('/api/user/streak', { streak_count: 0, last_active_date: null });
  }

  async recordActivityDay() {
    return this._fetchPost('/api/user/streak/record-day', {});
  }

  // ── Aggregate stats ────────────────────────────────────────────────────────

  async getStats() {
    const apiBase = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || '';
    const res = await fetch(`${apiBase}/api/stats`, { credentials: 'include' });
    if (!res.ok) return null;
    return res.json();
  }

  // ── Migration (not applicable for SupabaseStore — must throw) ──────────────

  async migrateToSupabase() {
    throw new Error('migrateToSupabase called on SupabaseStore — use IndexedDBStore');
  }
}
