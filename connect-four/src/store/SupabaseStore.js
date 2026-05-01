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

  async saveSessionStats(stats) {
    // Paid users persist stats; free users skip
    const profile = await this.getProfile();
    if (profile.tier !== 'paid') return;

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
      .single();
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
}
