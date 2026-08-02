# Quickstart: manual verification, Epic 4 (spec 054)

Run from `connect-four/` unless noted. Always `eval "$(./worktree-ports.sh)"` from repo root before
starting any server (project-wide convention, `docs/architecture/worktree-conventions.md`).

## US1 — Device identifier

1. `curl -c cookies.txt -b cookies.txt -X POST http://localhost:$API_PORT/api/puzzles/<real-puzzle-id>/check -H 'Content-Type: application/json' -d '{"candidateCol":0,"moveHistory":[],"attemptNumber":1}'` (no `deviceUuid` in body). Confirm the response includes a `deviceUuid` field that is a well-formed UUID, and `cookies.txt` now has a `dc4_device_uuid` cookie.
2. Repeat the same `curl` with `-b cookies.txt -c cookies.txt` (cookie jar reused) and no body `deviceUuid`. Confirm the response's `deviceUuid` is identical to step 1's.
3. Query `puzzle_attempts` for the two rows just written; confirm both share the same `device_uuid`, and it is not the literal `'anonymous'`.
4. Repeat steps 1-3 against the games-insert path (`POST /api/games`) with `device_uuid` omitted from the body; confirm the `games` row's `device_uuid` matches the cookie value, not `'anonymous'` and not the caller's own (absent) `req.user?.id`.
5. Sign in as a real test account, call `POST /api/paddle/create-checkout`, confirm the response's (would-be) customer email is no longer silently absent — check via `paymentProcessor.createCheckout`'s received `email` argument (log it locally) since the response itself is `{ priceId, customerEmail, successUrl }` only when Paddle is configured.
6. Call `POST /api/scores` with a `moves` string representing a full (42-move) board and `difficulty` set; confirm the response is an explicit error/terminal signal, not `{ col: undefined }`.

## US2 — Pagination

1. Seed (via a throwaway script or the admin UI) two `games` rows for the same signed-in test user with identical `created_at` (or rely on two games saved in the same second). Page `GET /api/games?limit=1&offset=0` then `?limit=1&offset=1`; confirm the two known rows appear exactly once combined, not duplicated or skipped.
2. Seed a `candidates` generation batch (small `count`) so several rows share `created_at`. Page `GET /api/admin/candidates?category=<n>&status=pending&limit=1&offset=0..N` across every offset; confirm the full batch is covered exactly once.
3. Simulate the candidate-insert retry: call `POST /api/admin/generate` once successfully, then manually re-invoke the same insert code path (or a small script) with the identical `rows`/`generation_run_id`; confirm no duplicate `candidates` rows result (row count unchanged).

## US3 — Outcome integrity

1. Confirm migration `063_puzzle_attempts_outcome_narrow.sql` is applied (`schema_migrations` ledger row exists) BEFORE doing the rest of this section (FR-023a).
2. Submit a wrong `POST /api/puzzles/:id/check` answer; confirm the inserted `puzzle_attempts` row has `outcome = 'incorrect'`, not silently dropped (check server logs for the absence of the `[puzzle attempt]` catch-error line).
3. In the Challenge UI, submit a wrong answer on: a single-answer puzzle, a multi-column (`forbidden_columns`) puzzle, and a sequence puzzle. Confirm each writes `outcome: 'incorrect'` (via `store.recordPuzzleAttempt` — check IndexedDB/Supabase depending on sign-in state).
4. Re-open the same anonymous game's review twice (`POST /api/games/analyze` with the same `gameId`, no auth). Confirm the second call's server logs show no solver invocation (or time the two calls — second should be near-instant, reconstructed from stored blunders).

## US4 — Environment/ops (staging_checks.md is the system of record; this quickstart is the local-repro half)

1. From a linked worktree, temporarily rename `worktree-ports.sh` (or `chmod -x` it) and run `npm run dev`; confirm the process refuses to start with a clear error, rather than silently binding `3001`/`5173`.
2. Restore the script; from the **main checkout** (not a worktree), repeat step 1's failure injection (e.g. temporarily break the script's shebang); confirm the existing silent-fallback-to-`3001`/`5173` behavior is unchanged.
3. Run `node server/index.js` directly (no `eval "$(...)"` sourcing first) and confirm no `worktree-ports.sh` ownership-probe stderr lines print to the console (FR-024).
4. Apply migration `057_users_onboarding_status.sql` locally, restart the server, then run this repo's `specs/048-onboarding-experience/quickstart.md` §"Manual verification — account carryover" section end-to-end; record the result in `staging_checks.md` under a new `## Epic 4` section.
5. Check what `DATABASE_URL` the Railway staging deploy actually injects at migration time (Railway dashboard/CLI env vars for the staging service, NOT the local `connect-four/server/.env.staging` file, which is confirmed to use the 6543 transaction pooler and is at minimum wrong for any *local* `node --env-file=server/.env.staging migrate.js` run); record the finding.
6. If a real test account's credentials are available, run `node --env-file=server/.env scripts/probe-refresh-rotation.mjs <email> <password>`; record "rotation detected" (build the de-dup Map) or "no rotation" (close OI-5) in `staging_checks.md`. If unavailable, record "not run, owner-gated" per FR-032.

## Test gate (FR-034, amended)

After every user story above, run BOTH `npm run test:fast` AND `npm run test:dom` from
`connect-four/` — they are separate, non-chained npm scripts, and `test:fast` alone does not exercise
the `tests/dom/*.dom.test.jsx` suite that covers US3's four `ChallengeScreen.jsx` outcome-site tests
(FR-023). `test:fast`'s baseline is 5 pre-existing RED tests (`project_repo_worktree_setup` memory,
§2d) — judge results against that baseline, not against 0. Establish `test:dom`'s equivalent
pre-existing-failure baseline (run it once, unmodified, before this epic's first change lands) so a
pre-existing `test:dom` failure is not later mistaken for damage this epic caused.
