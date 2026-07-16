// ── User data endpoints (/api/user/*) ──
// Extracted as a separate module so both index.js and userEndpoints.test.mjs
// can import the same route registration logic.
//
// All routes require auth (req.user set by loadUser middleware).
// All DB-accessing routes also require supabase to be initialized.

import { CHALLENGE_SETS } from './challengeSets.js';
import { resolveQueueOwner } from './anonBlunderAccess.js';
import { importForUser, saveLiveGame, extractAndSaveBlunders } from './papergamesImporter.js';
import { randomUUID } from 'node:crypto';
import { logError } from './logger.js';
import {
  writeSessionStats,
  writeLessonProgress,
  writePuzzleAttempts,
  writeSparringRecord,
  writeStreak,
  isValidOnboardingStatus,
} from './userHelpers.js';
import { FREE_DEEP_REVEAL_WEEKLY_LIMIT } from './quotaLimits.js';

// ── Import job tracking (in-memory, not persisted; restarts clear all) ──────
const jobMap = new Map();
const IMPORT_GAME_LIMIT = 50;

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
      deep_reveal_limit: FREE_DEEP_REVEAL_WEEKLY_LIMIT,
      papergames_id: req.user.papergames_id ?? null,
      last_import_at: req.user.last_import_at ?? null,
      onboarding_status: req.user.onboarding_status,
    });
  });

  // T010b/Epic 8 T009: Update profile — papergames_id and/or onboarding_status,
  // at least one field required. Enum validated via the single shared
  // isValidOnboardingStatus (userHelpers.js) — do not duplicate the check here.
  app.put('/api/user/profile', async (req, res) => {
    if (!requireUser(req, res)) return;
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });

    const { papergames_id, onboarding_status } = req.body;
    const update = {};

    if (papergames_id !== undefined) {
      if (typeof papergames_id !== 'string' || !papergames_id || papergames_id.length > 64) {
        return res.status(400).json({ error: 'papergames_id must be a non-empty string (max 64 chars)' });
      }
      update.papergames_id = papergames_id;
    }

    if (onboarding_status !== undefined) {
      if (!isValidOnboardingStatus(onboarding_status)) {
        return res.status(400).json({ error: 'invalid onboarding_status' });
      }
      update.onboarding_status = onboarding_status;
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: 'no valid fields provided' });
    }

    const { error } = await supabase
      .from('users')
      .update(update)
      .eq('id', req.user.id);

    if (error) {
      return res.status(500).json({ error: 'Failed to update profile' });
    }

    res.status(204).send();
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
  // Authenticated → user_id-scoped (unchanged). Anonymous → device_uuid-scoped via
  // ?device_uuid, mirroring the anon-blunder-queue precedent (resolveQueueOwner,
  // migration 058). Missing/invalid device_uuid for an anon caller → 401.
  app.get('/api/user/challenge-progress', async (req, res) => {
    const owner = resolveQueueOwner(req.user, req.query.device_uuid || null);
    if (!owner.ok) return res.status(401).json({ error: 'Unauthorized' });
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

      // Query 2: attempts with puzzle category via inner join, scoped per owner
      const attemptsQuery = supabase
        .from('puzzle_attempts')
        .select('puzzle_id, first_attempt_correct, puzzles!inner(category)');
      const { data: attempts, error: err2 } = owner.scope === 'user'
        ? await attemptsQuery.eq('user_id', owner.userId)
        : await attemptsQuery.eq('device_uuid', owner.deviceUuid).is('user_id', null);

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
      logError('[user/challenge-progress]', err);
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

      // Feature 3 — re-associate anonymous sparring games. The anon game rows were
      // written to `games` with user_id=null, keyed by the CLIENT's device_uuid. Claim
      // them for this account. Key on body.device_uuid (the client's), NOT the derived
      // `deviceUuid` above (which for a new user is freshly generated and won't match).
      // Absent/empty device_uuid is a silent no-op. Trust model matches the rest of migrate.
      if (typeof body.device_uuid === 'string' && body.device_uuid.length > 0) {
        operations.push(
          supabase
            .from('games')
            .update({ user_id: req.user.id })
            .eq('device_uuid', body.device_uuid)
            .is('user_id', null)
            .then(({ error }) => (error ? { error: error.message } : undefined)),
        );
      }

      // Anon free deep reveal — re-associate anonymous blunder rows, same
      // device_uuid trick as the games block above. Anon blunders were written
      // with user_id=null, device_uuid=<client's>. Key on body.device_uuid (the
      // client's), NOT the derived deviceUuid. Absent/empty is a silent no-op.
      if (typeof body.device_uuid === 'string' && body.device_uuid.length > 0) {
        operations.push(
          supabase
            .from('blunders')
            .update({ user_id: req.user.id })
            .eq('device_uuid', body.device_uuid)
            .is('user_id', null)
            .then(({ error }) => (error ? { error: error.message } : undefined)),
        );
      }

      // onboarding_status (T021, FR-012): conditional write — only backfills an
      // account still at 'not_encountered', never clobbers a real prior seen/skipped
      // status recorded by a different device's earlier migration. Absent or invalid
      // values are a silent no-op and must NOT fail the rest of the migration.
      if (body.onboarding_status !== undefined && isValidOnboardingStatus(body.onboarding_status)) {
        operations.push(
          supabase
            .from('users')
            .update({ onboarding_status: body.onboarding_status })
            .eq('id', req.user.id)
            .eq('onboarding_status', 'not_encountered')
            .then(({ error }) => (error ? { error: error.message } : undefined)),
        );
      }

      const results = await Promise.all(operations);
      const failed = results.find(r => r?.error);
      if (failed) return res.status(500).json({ error: failed.error });
      res.status(204).send();
    } catch (err) {
      logError('[user/migrate]', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Papergames import endpoints (spec 038) ────────────────────────────────

  // POST /api/user/papergames/import — start an async import job
  app.post('/api/user/papergames/import', async (req, res) => {
    if (!requireUser(req, res)) return;
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });

    // C2a: papergames_id is required (FIRST check)
    const papergamesId = req.user.papergames_id;
    if (!papergamesId || typeof papergamesId !== 'string' || papergamesId.length === 0) {
      return res.status(400).json({ error: 'no papergames_id configured' });
    }

    // C2b: Cap check — count existing imported games for this user
    const { count, error: countErr } = await supabase
      .from('papergames_games')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id);

    if (countErr) return res.status(500).json({ error: countErr.message });

    const gameLimit = req.user.tier === 'paid'
      ? IMPORT_GAME_LIMIT
      : Math.max(0, 15 - (count ?? 0));

    console.log('[import] C2b — userId:', req.user.id,
      'tier:', req.user.tier,
      'existingGames:', count ?? 0,
      'gameLimit:', gameLimit);

    // Short-circuit when cap is reached
    if (gameLimit === 0) {
      const jobId = randomUUID();
      jobMap.set(jobId, {
        jobId,
        userId: req.user.id,
        status: 'done',
        imported: 0,
        skipped: 0,
        blunderErrors: 0,
        capReached: true,
        error: null,
      });
      return res.status(202).json({ jobId });
    }

    // C2c: One-in-flight guard — reuse existing pending/running job
    for (const entry of jobMap.values()) {
      if (entry.userId === req.user.id && (entry.status === 'pending' || entry.status === 'running')) {
        return res.status(202).json({ jobId: entry.jobId });
      }
    }

    // C2d: Spawn new job
    const jobId = randomUUID();
    const jobEntry = {
      jobId,
      userId: req.user.id,
      status: 'pending',
      imported: 0,
      skipped: 0,
      blunderErrors: 0,
      capReached: false,
      error: null,
    };
    jobMap.set(jobId, jobEntry);

    res.status(202).json({ jobId });

    // Async: run the import in the background
    Promise.resolve().then(async () => {
      jobEntry.status = 'running';

      try {
        console.log('[import] Starting importForUser — papergamesId:', papergamesId,
          'gameLimit:', gameLimit,
          'lastImportAt:', req.user.last_import_at);

        const { imported, skipped, blunderErrors } = await importForUser(
          supabase,
          req.user.id,
          papergamesId,
          gameLimit,
          req.user.last_import_at,
        );

        console.log('[import] importForUser returned — imported:', imported, 'skipped:', skipped,
          'blunderErrors:', blunderErrors);

        jobEntry.status = 'done';
        jobEntry.imported = imported;
        jobEntry.skipped = skipped;
        jobEntry.blunderErrors = blunderErrors;

        // Write last_import_at after successful import (endpoint's responsibility)
        try {
          await supabase
            .from('users')
            .update({ last_import_at: new Date().toISOString() })
            .eq('id', req.user.id);
        } catch {
          // Non-fatal — import succeeded, just the timestamp write failed
        }
      } catch (err) {
        logError('[papergames-import-job]', err);
        jobEntry.status = 'error';
        jobEntry.error = err.message;
        // Do NOT update last_import_at on error
      }
    });
  });

  // GET /api/user/papergames/import/status — poll job status
  app.get('/api/user/papergames/import/status', (req, res) => {
    if (!requireUser(req, res)) return;

    const { jobId } = req.query;
    if (!jobId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jobId)) {
      return res.status(400).json({ error: 'invalid jobId' });
    }

    const job = jobMap.get(jobId);
    if (!job) return res.status(404).json({ error: 'job not found' });

    // Ownership check — treat foreign jobId as not-found (privacy-preserving)
    if (job.userId !== req.user.id) return res.status(404).json({ error: 'job not found' });

    res.json({
      status: job.status,
      imported: job.imported,
      skipped: job.skipped,
      blunderErrors: job.blunderErrors ?? 0,
      capReached: job.capReached ?? false,
      ...(job.error ? { error: job.error } : {}),
    });
  });

  // POST /api/user/papergames/save-live-game — save a single live game that
  // just finished, then run blunder extraction fire-and-forget.
  app.post('/api/user/papergames/save-live-game', async (req, res) => {
    if (!requireUser(req, res)) return;
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });

    const { roomUid, papergamesAccountId } = req.body || {};
    if (!roomUid || typeof roomUid !== 'string') {
      return res.status(400).json({ error: 'roomUid is required' });
    }
    if (!papergamesAccountId || typeof papergamesAccountId !== 'string') {
      return res.status(400).json({ error: 'papergamesAccountId is required' });
    }

    try {
      const { id } = await saveLiveGame(supabase, req.user.id, papergamesAccountId, roomUid);

      // Fire-and-forget blunder extraction — does not block the response.
      extractAndSaveBlunders(supabase, id, req.user.id, roomUid, papergamesAccountId)
        .catch(err => console.error('[extract-blunders]', err.message));

      return res.status(201).json({ id });
    } catch (err) {
      console.error('[save-live-game]', err.message);
      return res.status(500).json({ error: err.message });
    }
  });
}
