// ── User data endpoints (/api/user/*) ──
// Extracted as a separate module so both index.js and userEndpoints.test.mjs
// can import the same route registration logic.
//
// All routes require auth (req.user set by loadUser middleware).
// All DB-accessing routes also require supabase to be initialized.

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

  // T015: Streak
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
      const operations = [];

      // puzzle_attempts
      if (body.puzzle_attempts && body.puzzle_attempts.length > 0) {
        operations.push(
          writePuzzleAttempts(
            supabase,
            req.user.id,
            req.user.device_uuid,
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

      await Promise.all(operations);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}
