export class SupabaseStore {
  constructor(supabaseClient, userId) {
    this._supabase = supabaseClient;
    this._userId = userId;
  }

  async getProfile() {
    const { data } = await this._supabase
      .from('users')
      .select('device_uuid, tier, deep_reveal_count, deep_reveal_reset_at')
      .eq('id', this._userId)
      .single();
    return data ?? { device_uuid: null, tier: 'free', deep_reveal_count: 0, deep_reveal_reset_at: new Date().toISOString() };
  }

  // T019 — removed paid-tier guard; all authenticated users save session stats
  async saveSessionStats(stats) {
    await this._supabase
      .from('session_stats')
      .upsert({ user_id: this._userId, ...stats }, { onConflict: 'user_id,date' });
  }

  async getSessionStats(date) {
    const { data } = await this._supabase
      .from('session_stats')
      .select('*')
      .eq('user_id', this._userId)
      .eq('date', date)
      .maybeSingle();
    return data ?? null;
  }

  async recordPuzzleAttempt(attempt) {
    await this._supabase.from('puzzle_attempts').insert({
      ...attempt,
      user_id: this._userId,
      created_at: new Date().toISOString(),
    });
  }

  // migrateToSupabase is not applicable for SupabaseStore
  async migrateToSupabase() {
    throw new Error('migrateToSupabase called on SupabaseStore — use IndexedDBStore');
  }

  // T013 — lesson_progress
  async saveLessonProgress(lessonId, status) {
    await this._supabase
      .from('lesson_progress')
      .upsert(
        { user_id: this._userId, lesson_id: lessonId, completed_at: new Date().toISOString() },
        { onConflict: 'user_id,lesson_id' }
      );
  }

  async getLessonProgress() {
    const { data } = await this._supabase
      .from('lesson_progress')
      .select('lesson_id, completed_at')
      .eq('user_id', this._userId);
    return (data ?? []).map(row => ({
      lessonId: row.lesson_id,
      status: row.completed_at != null ? 'complete' : 'incomplete',
    }));
  }

  // T014 — sparring_record
  async getSparringRecord() {
    const { data } = await this._supabase
      .from('users')
      .select('sparring_record')
      .eq('id', this._userId)
      .single();
    return data?.sparring_record ?? { W: 0, L: 0, D: 0 };
  }

  async saveSparringRecord(result) {
    const current = await this.getSparringRecord();
    const record = { W: 0, L: 0, D: 0, ...current };
    if (result === 'win') record.W += 1;
    else if (result === 'loss') record.L += 1;
    else if (result === 'draw') record.D += 1;
    await this._supabase
      .from('users')
      .update({ sparring_record: record })
      .eq('id', this._userId);
  }

  // T015 — challenge sessions
  async saveChallengeSession(session) {
    await this._supabase
      .from('session_stats')
      .upsert(
        { user_id: this._userId, date: session.date, stats: session },
        { onConflict: 'user_id,date' }
      );
  }

  async getLastChallengeSession() {
    const { data } = await this._supabase
      .from('session_stats')
      .select('stats')
      .eq('user_id', this._userId)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data?.stats ?? null;
  }

  // T016 — streak
  async getStreak() {
    const { data } = await this._supabase
      .from('users')
      .select('streak_count, last_active_date')
      .eq('id', this._userId)
      .single();
    return {
      streak_count: data?.streak_count ?? 0,
      last_active_date: data?.last_active_date ?? null,
    };
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

    await this._supabase
      .from('users')
      .update({ streak_count, last_active_date })
      .eq('id', this._userId);
  }

  // Aggregate accuracy stats from puzzle_attempts via server endpoint
  async getStats() {
    const { data: { session } } = await this._supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return null;
    const apiBase = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || '';
    const res = await fetch(`${apiBase}/api/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return res.json();
  }

  // T018 — getAllSessionStats with count-weighted accuracy aggregation
  async getAllSessionStats() {
    const { data } = await this._supabase
      .from('session_stats')
      .select('*')
      .eq('user_id', this._userId);

    const rows = data ?? [];
    const byPattern = {};

    for (const row of rows) {
      const stats = row.stats ?? {};
      const category = stats.category;
      if (!category) continue;

      const accuracy = stats.accuracy ?? 0;
      const weight = (stats.optimalCount ?? 0) + (stats.blunderCount ?? 0) + (stats.suboptimalCount ?? 0) || 1;

      if (!byPattern[category]) {
        byPattern[category] = { _weightedSum: 0, _totalWeight: 0, attempted: 0 };
      }
      byPattern[category]._weightedSum += accuracy * weight;
      byPattern[category]._totalWeight += weight;
      byPattern[category].attempted += 1;
    }

    // Finalize: compute weighted mean and drop internal accumulators
    for (const cat of Object.keys(byPattern)) {
      const entry = byPattern[cat];
      byPattern[cat] = {
        accuracy: entry._totalWeight > 0 ? entry._weightedSum / entry._totalWeight : 0,
        attempted: entry.attempted,
      };
    }

    return { rows, byPattern };
  }
}
