// ── User data endpoints (/api/user/*) ──
// Extracted as a separate module so both index.js and userEndpoints.test.mjs
// can import the same route registration logic.
//
// All routes require auth (req.user set by loadUser middleware).
// All DB-accessing routes also require supabase to be initialized.

import { CHALLENGE_SETS } from './challengeSets.js';
import {
  writeSessionStats,
  writeLessonProgress,
  writePuzzleAttempts,
  writeSparringRecord,
  writeStreak,
} from './userHelpers.js';

/** Returns false (already sent 401) if !req.user, true otherwise. */
function requireUser(req, res) {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

/**
 * Register all /api/user/* routes on the given Express app.
 * @param {import('express').Express} app
 * @param {object|null} supabase — Supabase client (service-role key), or null
 */
export function registerUserRoutes(app, supabase) {
  // ── GET endpoints ──────────────────────────────────────────────────────────

  // T009: Must be registered BEFORE /api/user/session-stats (Express first-match)
  app.get('/api/user/session-stats/all', async (req, res) => {
    if (!requireUser(req, res)) return;
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });

    const { data, error } = await supabase
      .from('session_stats')
      .select('*')
      .eq('user_id', req.user.id);

    if (error) return res.status(500).json({ error: error.message });

    const rows = data || [];

    // Compute byPattern weighted-mean accuracy across all rows.
    // Weight = total scored moves in a session (or 1 if none).
    const byCategory = {};
    for (const row of rows) {
      const stats = row.stats || {};
      const weight =
        (stats.optimalCount ?? 0) +
          (stats.blunderCount ?? 0) +
          (stats.suboptimalCount ?? 0) || 1;

      if (stats.byPattern) {
        for (const [cat, catStats] of Object.entries(stats.byPattern)) {
          if (!byCategory[cat]) {
            byCategory[cat] = { weightedCorrect: 0, weightedAttempted: 0 };
          }
          byCategory[cat].weightedCorrect +=
            (catStats.correct || 0) * weight;
          byCategory[cat].weightedAttempted +=
            (catStats.attempted || 0) * weight;
        }
      }
    }

    const byPattern = {};
    for (const [cat, agg] of Object.entries(byCategory)) {
      byPattern[cat] = {
        accuracy:
          agg.weightedAttempted > 0
            ? Math.round((agg.weightedCorrect / agg.weightedAttempted) * 100)
            : 0,
        attempted: agg.weightedAttempted,
      };
    }

    res.json({ rows, byPattern });
  });

  // T010: Profile — explicit projection, never return req.user verbatim
  app.get('/api/user/profile', (req, res) => {
    if (!requireUser(req, res)) return;
    res.json({
      device_uuid: req.user.device_uuid ?? null,
      tier: req.user.tier,
      deep_reveal_count: req.user.deep_reveal_count,
      deep_reveal_reset_at: req.user.deep_reveal_reset_at,
    });
  });

  // T011: Single-date session stats (registered AFTER /all — Express ordering)
  app.get('/api/user/session-stats', async (req, res) => {
    if (!requireUser(req, res)) return;
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });

    const { date } = req.query;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res
        .status(400)
        .json({ error: 'date query parameter is required (YYYY-MM-DD)' });
    }

    const { data, error } = await supabase
      .from('session_stats')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('date', date)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || null);
  });

  // T012: Lesson progress
  app.get('/api/user/lesson-progress', async (req, res) => {
    if (!requireUser(req, res)) return;
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });

    const { data, error } = await supabase
      .from('lesson_progress')
      .select('lesson_id, completed_at')
      .eq('user_id', req.user.id);

    if (error) return res.status(500).json({ error: error.message });

    res.json(
      (data || []).map((row) => ({
        lessonId: row.lesson_id,
        status: row.completed_at != null ? 'complete' : 'incomplete',
      })),
    );
  });

  // T013: Sparring record
  app.get('/api/user/sparring-record', async (req, res) => {
    if (!requireUser(req, res)) return;
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });

    const { data, error } = await supabase
      .from('users')
      .select('sparring_record')
      .eq('id', req.user.id)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data?.sparring_record ?? { W: 0, L: 0, D: 0 });
  });

  // T014: Challenge session (latest session_stats row)
  app.get('/api/user/challenge-session', async (req, res) => {
    if (!requireUser(req, res)) return;
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });

    const { data, error } = await supabase
      .from('session_stats')
      .select('stats')
      .eq('user_id', req.user.id)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data?.stats ?? null);
  });

  // T015: Challenge progress — per-category accuracy, cleared status
  app.get('/api/user/challenge-progress', async (req, res) => {
    if (!requireUser(req, res)) return;
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });

    try {
      const slugs = CHALLENGE_SETS.map((s) => s.slug);

      // Query 1: active puzzles per category
      const { data: activePuzzles, error: err1 } = await supabase
        .from('puzzles')
        .select('id, category')
        .eq('is_active', true);

      if (err1) return res.status(500).json({ error: err1.message });

      // Build { [category]: total } and active puzzle ID set
      const totalByCategory = Object.fromEntries(slugs.map((s) => [s, 0]));
      const activePuzzleIds = new Set();
      for (const p of activePuzzles || []) {
        totalByCategory[p.category] = (totalByCategory[p.category] || 0) + 1;
        activePuzzleIds.add(p.id);
      }

      // Query 2: user attempts with puzzle category via inner join
      const { data: attempts, error: err2 } = await supabase
        .from('puzzle_attempts')
        .select('puzzle_id, first_attempt_correct, puzzles!inner(category)')
        .eq('user_id', req.user.id);

      if (err2) return res.status(500).json({ error: err2.message });

      // Group attempts by category, only for active puzzles
      const attemptedByCategory = {};
      const correctByCategory = {};
      for (const a of attempts || []) {
        if (!activePuzzleIds.has(a.puzzle_id)) continue;
        const cat = a.puzzles?.category;
        if (!cat) continue;
        if (!attemptedByCategory[cat]) attemptedByCategory[cat] = new Set();
        if (!correctByCategory[cat]) correctByCategory[cat] = new Set();
        attemptedByCategory[cat].add(a.puzzle_id);
        if (a.first_attempt_correct) {
          correctByCategory[cat].add(a.puzzle_id);
        }
      }

      // Merge
      const progress = {};
      for (const slug of slugs) {
        const total = totalByCategory[slug] || 0;
        const attempted = attemptedByCategory[slug]?.size || 0;
        const correct = correctByCategory[slug]?.size || 0;
        const accuracy = attempted > 0 ? correct / attempted : 0;
        const cleared = correct >= total && total > 0;
        progress[slug] = { attempted, correct, total, accuracy, cleared };
      }

      res.json({ progress });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // T016: Streak
  app.get('/api/user/streak', async (req, res) => {
    if (!requireUser(req, res)) return;
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });

    const { data, error } = await supabase
      .from('users')
      .select('streak_count, last_active_date')
      .eq('id', req.user.id)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    res.json({
      streak_count: data?.streak_count ?? 0,
      last_active_date: data?.last_active_date ?? null,
    });
  });

  // ── POST endpoints ─────────────────────────────────────────────────────────

  // T016: Session stats — stores req.body.stats (inner), NOT req.body
  app.post('/api/user/session-stats', async (req, res) => {
    if (!requireUser(req, res)) return;
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });

    if (!req.body.date) {
      return res.status(400).json({ error: 'date is required' });
    }

    const result = await writeSessionStats(
      supabase,
      req.user.id,
      req.body.date,
      req.body.stats,
    );
    if (result?.error) return res.status(500).json({ error: result.error });
    res.status(204).send();
  });

  // T017: Puzzle attempts — device_uuid from req.user, NEVER from req.body
  app.post('/api/user/puzzle-attempts', async (req, res) => {
    if (!requireUser(req, res)) return;
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });

    const { puzzle_id, moves_tried, outcome, first_attempt_correct } = req.body;
    if (
      !puzzle_id ||
      moves_tried === undefined ||
      !outcome ||
      first_attempt_correct === undefined
    ) {
      return res.status(400).json({
        error:
          'puzzle_id, moves_tried, outcome, and first_attempt_correct are required',
      });
    }

    const result = await writePuzzleAttempts(
      supabase,
      req.user.id,
      req.user.device_uuid,
      [req.body],
    );
    if (result?.error) return res.status(500).json({ error: result.error });
    res.status(204).send();
  });

  // T018: Lesson progress — only accepts status='complete'
  app.post('/api/user/lesson-progress', async (req, res) => {
    if (!requireUser(req, res)) return;
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });

    if (!req.body.lessonId) {
      return res.status(400).json({ error: 'lessonId is required' });
    }
    if (req.body.status !== 'complete') {
      return res.status(400).json({ error: "status must be 'complete'" });
    }

    const result = await writeLessonProgress(supabase, req.user.id, [
      { lessonId: req.body.lessonId, status: 'complete' },
    ]);
    if (result?.error) return res.status(500).json({ error: result.error });
    res.status(204).send();
  });

  // T019: Sparring record — read-then-write, increment correct counter
  app.post('/api/user/sparring-record', async (req, res) => {
    if (!requireUser(req, res)) return;
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });

    const { result } = req.body;
    if (!['win', 'loss', 'draw'].includes(result)) {
      return res
        .status(400)
        .json({ error: 'result must be win, loss, or draw' });
    }

    // Read current record
    const { data, error } = await supabase
      .from('users')
      .select('sparring_record')
      .eq('id', req.user.id)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });

    const current = data?.sparring_record ?? { W: 0, L: 0, D: 0 };
    const key = result === 'win' ? 'W' : result === 'loss' ? 'L' : 'D';
    const updated = { ...current, [key]: (current[key] || 0) + 1 };

    const writeResult = await writeSparringRecord(supabase, req.user.id, updated);
    if (writeResult?.error)
      return res.status(500).json({ error: writeResult.error });
    res.status(204).send();
  });

  // T020: Challenge session — stores entire req.body
  app.post('/api/user/challenge-session', async (req, res) => {
    if (!requireUser(req, res)) return;
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });

    if (!req.body.date) {
      return res.status(400).json({ error: 'date is required' });
    }

    const result = await writeSessionStats(
      supabase,
      req.user.id,
      req.body.date,
      req.body,
    );
    if (result?.error) return res.status(500).json({ error: result.error });
    res.status(204).send();
  });

  // T021: Streak record-day — compute today/yesterday with en-CA locale
  app.post('/api/user/streak/record-day', async (req, res) => {
    if (!requireUser(req, res)) return;
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });

    const { data, error } = await supabase
      .from('users')
      .select('streak_count, last_active_date')
      .eq('id', req.user.id)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });

    const today = new Date().toLocaleDateString('en-CA');
    const currentStreak = data?.streak_count ?? 0;
    const lastActive = data?.last_active_date;

    // Same day — idempotent no-op
    if (lastActive === today) {
      return res.status(204).send();
    }

    // Compute yesterday in en-CA locale
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString('en-CA');

    const streak_count =
      lastActive === yesterdayStr ? currentStreak + 1 : 1;

    const writeResult = await writeStreak(supabase, req.user.id, {
      streak_count,
      last_active_date: today,
    });

    if (writeResult?.error)
      return res.status(500).json({ error: writeResult.error });
    res.status(204).send();
  });

  // ── T032: Migrate endpoint ─────────────────────────────────────────────────

  app.post('/api/user/migrate', async (req, res) => {
    if (!requireUser(req, res)) return;
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });

    const body = req.body;
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: 'Request body is required' });
    }

    try {
      // Ensure device_uuid is set — new users have null until first migration.
      let deviceUuid = req.user.device_uuid;
      if (!deviceUuid) {
        const { randomUUID } = await import('node:crypto');
        deviceUuid = randomUUID();
        await supabase.from('users').update({ device_uuid: deviceUuid }).eq('id', req.user.id);
      }

      const operations = [];

      // puzzle_attempts
      if (body.puzzle_attempts && body.puzzle_attempts.length > 0) {
        operations.push(
          writePuzzleAttempts(
            supabase,
            req.user.id,
            deviceUuid,
            body.puzzle_attempts,
          ),
        );
      }

      // session_stats (loop per row)
      if (body.session_stats && body.session_stats.length > 0) {
        for (const el of body.session_stats) {
          operations.push(
            writeSessionStats(supabase, req.user.id, el.date, el),
          );
        }
      }

      // lesson_progress
      if (body.lesson_progress && body.lesson_progress.length > 0) {
        operations.push(
          writeLessonProgress(supabase, req.user.id, body.lesson_progress),
        );
      }

      // sparring_record
      if (body.sparring_record) {
        operations.push(
          writeSparringRecord(supabase, req.user.id, body.sparring_record),
        );
      }

      // streak
      if (body.streak) {
        operations.push(
          writeStreak(supabase, req.user.id, body.streak),
        );
      }

      const results = await Promise.all(operations);
      const failed = results.find(r => r?.error);
      if (failed) return res.status(500).json({ error: failed.error });
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}
