# app-qa — coordinator mode (full-sweep dispatch)

Use this for a **no-arg full sweep** (and for a `--focus` full-sweep-plus-deep-focus run). The
coordinator owns the plan; each area is driven by a **fresh, foreground, sequential** subagent whose
token-heavy tool output (a11y snapshots, screenshots, network dumps) stays in *its* context and never
reaches yours.

**Findings file.** Derive the per-run stamp **once** at setup (`date +%Y-%m-%d-%H%M`) →
`$RUN_FILE = agentic_QA_<stamp>.md` at repo root, and pass `$RUN_FILE` (the exact filename) into
**every** subagent prompt so the whole run consolidates into one file. Subagents **append their own
findings directly** to `$RUN_FILE` before returning (see procedure step 4) — this is safe because
subagents are **sequential** (one writer at a time) and guarantees nothing is lost if a subagent or
the run dies mid-way.

## Why this shape

- **Sequential, not parallel.** There is **one Chrome instance and one DB/session**. Parallel
  subagents driving the same browser — or one flipping tier while another reads it — collide.
- **Context isolation is the win, not parallelism.** A subagent returns only compact structured
  findings; its snapshots are discarded with its context.
- **Foreground only.** Background subagents cannot write files in this repo. Run each blocking. Each
  subagent **appends its own findings directly to `$RUN_FILE`** as it confirms them, then returns
  only a compact summary + metrics. Sequential dispatch means one writer at a time (no interleaving),
  and append-on-discovery means a subagent that dies mid-area has already persisted what it found.

## Model per role

| Role | Model | Why |
|---|---|---|
| Coordinator (plan, dispatch, track state, optional synthesis) | **Sonnet** | Light orchestration; small context (no snapshots). Subagents write findings themselves. |
| Area driver (home, past-games, blunders, lessons, challenges, import, nav) | **Sonnet** | Token-heavy but bug recognition is within Sonnet's reach. |
| Tier-journey driver | **Sonnet** | Mechanical DB flips + re-checks. |
| **Deep-reveal grader** | **Opus** | Hardest judgment; board-claim soundness + highlight integrity + tone. Do not downgrade. Bounded to **3** pre-selected blunders. |
| Optional final synthesis pass (dedup, severity consistency, cluster by suspected code location into user stories) | **Opus** | Genuine judgment, but runs on a small findings-only context, so cheap. |

Concentrate Opus spend on the grader (and optional synthesis). Never put Opus on area-drivers —
that's where the tokens are and Sonnet is good enough.

## Coordinator procedure

1. Do the shared setup **once** yourself (SKILL.md setup checklist): read the mindset seeds, **ask
   the user preserve-vs-reset**, launch the API server to `$LOG_PATH` + Vite in the background,
   open Chrome, log in via `🛠 Dev: skip auth`, stamp `$RUN_FILE = agentic_QA_$(date +%Y-%m-%d-%H%M).md`
   and create it with the header + Summary block. You own the server — relaunch it (kill port 3001 +
   truncate `$LOG_PATH`) if a subagent reports it crashed or you change server code.
   **If `--focus "<text>"` was given:** parse it into (a) emphasis on the existing areas below and
   (b) any **derived focus-areas** not in the fixed list (e.g. dev-board-injector, spanish-audio-i18n,
   onboarding-mission-screen) → add those as extra subagent passes. Focused + derived areas run with
   **acceptance-criteria treatment** (✅/❌/⚠️ checklist to a verdict); keep the full focus text to
   thread into each prompt (step 2).
2. Pass **`$LOG_PATH`**, **`$RUN_FILE`**, and DB/tier state to every subagent so they can delta-read
   server stack
   traces (offset before action → `tail -n +$START` after) and know the starting tier.
   Also build a tiny **screen map** once (10–15 lines: route/URL per screen + the click-label to
   reach it — labels survive across sessions, uids don't) and paste it into every subagent prompt.
   This removes one Home snapshot + nav re-derivation per area. Keep it **text-only, no uids** (a
   uid cache would be stale — forbidden).
3. Dispatch area subagents **one at a time**, in this order. The **Deep-reveal grader runs BEFORE
   the tier journey** so it grades while the user still has deep-reveal access (the tier pass flips
   to paid and back to free, and free tier has a deep-reveal quota):
   Home → Past Games → **Blunders** → **Deep-reveal grader (Opus)** → Lessons → Challenges →
   Import → Navigation → **Tier journey (last — mutates tier)**.
   Have the **Blunders** subagent return **3 candidate blunder IDs/movestrings** (varied: opening /
   mid-game fork / losing) and pass them to the grader so it jumps straight there instead of
   re-navigating.
4. Each subagent **has already appended its findings directly to `$RUN_FILE`** (append-on-discovery)
   and returns only a compact summary + metrics. Do NOT re-write its findings and do not re-drive the
   browser to "confirm" — trust the evidence on disk. **Track tier state:** after the tier-journey
   subagent returns, record the tier it left the DB in (it should end paid, or explicitly say what it
   left).
5. (Optional) Run the **Opus final-synthesis pass** over the assembled findings in `$RUN_FILE`: dedup
   the same defect seen on multiple screens, normalize severities, **regroup the chronologically-
   appended findings by area/suspected code location**, and (focus runs) write the
   `Focus: N/M checklist items pass` summary. Update the Summary block. (Re-reads `$RUN_FILE` once —
   fine, it's findings-only text.)

## Per-area subagent prompt (template)

Dispatch a general-purpose (fresh) subagent, `model: sonnet` (or `opus` for the grader), foreground:

Keep it self-contained so the subagent does NOT re-read the whole skill (that would re-derive the
skill's text once per area). Carry the rules inline; have it read ONLY
`.claude/skills/app-qa/references/bug-template.md`.

```
You are a QA driver for the Connect Four app. QA ONLY this area: <AREA>.
Read ONLY .claude/skills/app-qa/references/bug-template.md for the finding format — do NOT read
the whole app-qa skill.

Focus for this run: <FOCUS TEXT verbatim, or "none — general sweep">.
This area is: <in focus: why — drive it against acceptance criteria and mark each ✅/❌/⚠️
              | not in focus — regression pass only>.

Findings file: <RUN_FILE> (repo root). APPEND each finding to this file the MOMENT you confirm it —
do not buffer to the end. Write findings yourself (do not hand them back for someone else to write);
if you're in focus, append your ✅/❌/⚠️ checklist verdicts too. Tag each finding as `focus` or
`adjacent`. Use the bug-template.md format.

Environment is already running:
- Chrome is open at http://localhost:5173, logged in via "🛠 Dev: skip auth"
  (anonymous, tier=<TIER>). Use the chrome-devtools MCP tools.
- API server logs to the file <LOG_PATH>. When a request misbehaves, delta-read it:
  START=$(wc -l < <LOG_PATH>) BEFORE the action, then
  `tail -n +$((START+1)) <LOG_PATH> | grep -iE 'error|throw|at .*\(|unhandled'` after.
  Do NOT re-tail the whole log each time. If the server looks dead, report it — do NOT
  relaunch it yourself (the coordinator owns the server lifecycle).
- DB state: <preserved | reset+reimported papergames 69e773d36bf9938bffc1509a>.
- Screen map (routes + click-labels to reach each screen; use these instead of re-deriving nav):
  <PASTE SCREEN MAP>
- Viewport: <desktop | mobile 390x844> — if mobile, set it with resize_page/emulate BEFORE walking.

Do:
1. Walk <AREA> as a real user, going back and forth between screens; exercise every CTA.
2. Snapshot ONCE per screen. For reasoning, reference the snapshot already in your context — do
   NOT re-snapshot. Re-snapshot only for fresh uids to interact after the DOM changes. To verify a
   single fact (a count updated, a button enabled), use evaluate_script/querySelector, not a full
   re-snapshot. Do not build a snapshot cache.
3. Check console/network ONLY when something looks wrong, with params:
   list_network_requests({resourceTypes:['xhr','fetch'], pageSize:20}); read console after a failure
   and extract the matched line — do not dump everything.
4. Screenshot ONLY a confirmed visual bug (one per bug); SAVE to disk with
   take_screenshot(filePath=<scratchpad>/<slug>.png) and reference by path — never return the image
   inline. Do not screenshot to confirm loads/clicks.
5. Verify any board/deep-reveal claim with ./visualize_board.sh before judging it.

Return ONLY (your findings are already in <RUN_FILE> — do NOT repeat them in full here):
(a) a compact summary: count + one-line title/severity per finding you appended (and, if in focus,
    the ✅/❌/⚠️ tally). No inline snapshots or images. If you found nothing, say so and note what you
    could not reach.
(b) a one-line metrics record for the Run Metrics table:
    | <AREA> | <#actions> | <#snapshots> | <#screenshots> | <#console/net reads> | <~output lines> | <biggest single tool output ~lines> | <#findings> |
    plus the single most expensive operation you did and how it could be cheaper next time, and
    confirm "no snapshot/image returned inline".
```

**Tier-journey subagent** (dispatch LAST, Sonnet): exercise free-tier paywalls, then flip tier via
the DB snippet in `references/environment.md` (the anon user has no email — `set-tier.js` won't find
it), reload, re-verify, flip back — and end by leaving the DB in a stated tier. Report that tier.

**Deep-reveal grader** (Opus, dispatched right after Blunders): give it the **3 candidate blunder
IDs/movestrings** from the Blunders subagent — do NOT tell it to browse all blunders. Instruct it to
grade **only those 3** against the custom rubric in SKILL.md's "deep-reveal quality" pass:
board-claim soundness via `./visualize_board.sh` + `connect-four/server/scripts/reason_engine/TOOLS/`
(esp. `compute_feature_vector.mjs <movestring> <playedCol>`), highlight integrity (no mentioned
cell/row/column left un-highlighted), perspective, tone/coach-voice, community-term leakage.
**Do NOT invoke `grade-fv-sufficiency` or run any vector-requiring check** — it may skim that skill
for tone criteria only. This is the one place the grader may read SKILL.md's deep-reveal section.
