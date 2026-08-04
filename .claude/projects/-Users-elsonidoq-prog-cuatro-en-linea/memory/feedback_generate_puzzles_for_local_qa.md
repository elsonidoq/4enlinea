---
name: feedback_generate_puzzles_for_local_qa
description: "Local `puzzles` is empty for most categories — YOU can generate/promote puzzles yourself; never report a QA scenario as unreachable"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 5a9b4604-3aa6-404b-b156-9daf756db036
  modified: 2026-08-03T19:23:01.106Z
---

**Trigger: you are about to treat an empty or below-floor puzzle pool as a constraint on something else** — "category X has 0 active puzzles locally, so this scenario is unreachable" in a QA report, or a spec/epic/plan that turns "this category can't reach the floor" into a *design decision* (hide it, exempt it, feature-flag it, defer it post-launch). Don't. Generate and promote puzzles first, then test — or spec — for real.

This bites hardest in **spec work**, where it doesn't look like the QA mistake. Owner, 2026-08-03, after a spec pipeline had arithmetic-ed its way to "promotion alone can't reach N=20 for six categories, so hide them at launch and defer generation to a post-launch OI": *"You shouldn't be distracted by categories without puzzles. You can always create puzzles and approve them using the admin."* An empty pool is **routine available work**, never a blocker and never a fork in the design. The tell that you're making this mistake: you are about to ask the owner to choose between filling a pool and *not* filling it.

The local `puzzles` table is **not** a representative pool. Measured 2026-07-30 (spec 051): only `double_threat` (100), `forced_block` (100), `immediate_threat` (66) and `undercut` (25) had active rows. `overcut`, `z_threat`, `claimeven`, `figure_7`, `j_shape`, `odd_even_threat`, `forbidden_columns` and `forced_win` were all at **0** — while the `candidates` table simultaneously held valid, `correct_cols`-populated pending rows for **every one of them** (`forbidden_columns` 30, `figure_7` 21, `j_shape` 14, `odd_even_threat` 13, `overcut` 9, `claimeven` 7, `z_threat` 3, `forced_win` 2).

**Why:** the gap is **promotion/curation, not generation.** Candidates get generated locally and then never approved into `puzzles`, because approving is a manual admin step nobody performs in a dev environment. So "0 active puzzles" reads like a broken pipeline and is really an empty curation queue outbox. Distinct from [[project_generate_candidates_fetch_failed_flake]], which is about generation *appearing* to fail; here generation already succeeded and the output is just sitting unapproved.

**You can do this yourself — both halves.** Generating puzzles and promoting them are ordinary agent tasks, not human-only steps: `/api/admin/generate`, `/api/admin/candidates/:id/approve` and `/approve-batch` are all `requireLocalhost`-gated (verified at source 2026-07-30), which you satisfy on localhost. Never report a category as untestable because it has no puzzles.

**How to apply:** when a category has too few puzzles to exercise a scenario —
1. **Promote first if you can** — check `candidates` for `status='pending'` rows of that category; promoting is far cheaper than generating (no solver calls). `POST /api/admin/candidates/:id/approve` / `/approve-batch`, or the CurationWorkspace admin UI.
2. **Otherwise generate, then promote.** The server must already be running, and **`--port` defaults to `3001`, which is WRONG in a worktree** — pass the real one:
   ```
   eval "$(./worktree-ports.sh)"          # from repo root, always
   cd connect-four
   node server/scripts/generate_all_candidates.mjs --category <cat> --count 10 --port $API_PORT
   ```
   Use a small `--count` — it calls the real c4solver once per candidate. The default `--count 100` across 12 categories is 1000+ solver calls. `--dry-run` shows the plan; `--help` exits without generating. Run it with idle servers and no live Chrome QA session touching the solver, or you'll hit the flake in [[project_generate_candidates_fetch_failed_flake]].
3. `audit_answer_ambiguity.mjs --repair` **cannot** bootstrap a category from zero — `repairPuzzles` throws `'no existing <category> row to inherit goal_prompt from'` because it needs an existing row as a `goal_prompt` template. Repair only replaces; it never seeds.

The same rule governs pool thresholds: if a category falls below its minimum viable serving-pool size, **generate more — never lower the bar, never hide the category, never defer the fill**. Owner, 2026-07-30: *"why don't just generate more puzzles if the threshold is not met?"* This is also written down as an absolute in `specs/051-pattern-acceptance/pool-thresholds.md` §"What the threshold gates" — read it before proposing any serving-policy alternative, because it already forecloses them. Cross-ref [[project_new_category_wiring_checklist]], [[project_puzzle_row_write_sites]], [[project_app_qa_setup_gotchas]].
