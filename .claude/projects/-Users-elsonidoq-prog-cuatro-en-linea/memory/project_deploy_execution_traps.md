---
name: project_deploy_execution_traps
description: "Traps when EXECUTING a deploy (not writing one): the auto-migration runner defeats every 'after the code deploy' ordering, ADD COLUMN never populates, confirm-prompts exit 0 without writing, and deployment_steps.md commands were never run by their authors"
metadata: 
  node_type: memory
  type: project
  modified: 2026-08-04T15:56:08.040Z
  originSessionId: 89067d69-d03f-40cf-89e0-ff63b4fcf3ed
---

Read before **running** a deploy against staging or production. Procedure lives in
`docs/deploy-runbook.md` (§1a two-deploy pattern, §1b ADD COLUMN, §1c non-interactive scripts, §2
smoke-test table) and the per-change queue in `docs/deployment_steps.md`. These are the traps that
made the 2026-08-04 staging deploy go sideways — all measured, none theoretical.

**1. `docs/deployment_steps.md` entries were written by sessions that never ran them.** Treat every
command as a draft. Of 9 PENDING entries, real defects found: two `psql "$STAGING_DATABASE_URL"`
commands whose variable **is defined nowhere** (expands to `psql ""` → silently hits the *local*
database instead of erroring); a pre-flight query that errors in the pre-deploy state it is meant to
run in; a verify block checking `template_version` inside `deep_reveal_json` when it is a **top-level
column** (returns null, reads as failure on a correct row); a success condition missing one of the
three migrations its own table lists as unapplied; and two entries prescribing **conflicting
remedies for the same rows** (repair-in-place vs retire-and-refill). **Phase-1 review the queue
before executing it.**

**2. "Migration must run AFTER the code deploy" is unsatisfiable in one deploy.** `railpack.json`'s
start command is `node server/migrate.js && node server/index.js`, so migrations apply at **container
start**, before the new server boots and while the old instance still serves. Hand-running
`migrate.js` doesn't fix it (if the file is on the branch the deploy already applied it; if not you
desync branch from schema). **Split into two deploys** — see runbook §1a. Confirm the premise at
source first: `git show <deployed-sha>:connect-four/server/index.js | /usr/bin/grep -c "<column>"`.
PostgREST **errors** on a selected-but-missing column, so one `.select()` string is enough to
hard-fail those endpoints. Conversely a *narrowing* migration (`063`) IS satisfiable in one deploy —
`migrate.js` finishes before `index.js` starts.

**3. `ADD COLUMN` never populates — and the backfill may not be queued.** `061_correct_cols.sql` added
`puzzles.correct_cols`; nothing backfilled it; the deployed code reads that field **exclusively**. All
122 active staging puzzles served `"correct_cols":null` the moment Deploy A landed — a live break, not
a pre-flight nicety. The fix (`server/scripts/backfill-correct-cols.mjs`) existed but had never been
added to the queue. **Per migration ask: what populates this, and is that step queued?**

**4. The operational scripts abort on closed stdin and still exit 0.** `backfill-correct-cols.mjs`,
`fill-candidate-pools.mjs`, `repair-overcut-highlight-metadata.js` all prompt for a typed `Yes`
(twice for production). Backgrounded/CI → EOF → `Aborted` → **exit 0**, nothing written. Cost a false
"done" on staging; only re-measuring the DB caught it. Use `printf 'Yes\n' | node …` and **judge by
re-measurement, never by exit code** ([[OI-146]]). Same class as `cmd | tail` returning tail's exit
code — which also masked an `npm error` this session.

**5. The `064` pre-flight's "must be 0" gate is unsatisfiable as written** ([[OI-147]]). It counts
**all** `puzzles` (not just `is_active`) and **all** `candidates` (not just `status='pending'`), while
its prescribed remedy only processes active/pending rows. Post-backfill staging: raw puzzles 48,
active 0; candidates 102, pending 0. The gates that matter are `puzzles WHERE is_active AND
correct_cols IS NULL = 0` and `candidates WHERE status='pending' AND …= 0`. Inactive rows are content
the backfill deliberately retired.

**6. `forced_win` needs ~16 invocations of `fill-candidate-pools.mjs`, not one.** It hits the
400-solver-attempt cap almost every run and yields **0–4** boards per invocation (staging:
3→4→5→6→6→10→14→15→15→20). Every other category reached the N=20 floor in one or two runs. The script
warns honestly rather than failing, so a single `--apply` leaves the category short and looks fine.
[[OI-83]]. Use `--category forced_win` in a loop.

**7. Verifying in the browser: onboarding intercepts deep links.** With no onboarding state the
first-run auto-route redirects `/pricing`, `/pricing?_ptxn=…` and `/challenge` to `/` — you measure
the redirect, not the page. Complete/dismiss onboarding first. (That redirect is itself a real defect
for the Paddle payment-method-update email flow: [[OI-144]].) Also: `POST /api/puzzles/:id/check`
takes **`candidateCol`**, not `column`; `resize_page` is dead, use `emulate`.

Related: [[project_migration_ledger_and_pooler]] (filename ledger; 6543 is drift not a blocker),
[[feedback_implemented_vs_deployable]] (the queue is a WORK QUEUE; reset only after all-DONE-in-prod),
[[project_live_envs_have_no_real_users]] (pre-launch disposability — expires at launch),
[[project_spec031_staging_production_deploy]] (build-time vs runtime vars, strict `npm ci`),
[[feedback_verify_at_the_source_layer]].
