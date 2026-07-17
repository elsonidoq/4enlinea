# Reason-eval board-selection consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Reason-engine area:** This plan touches `connect-four/server/scripts/` reason-eval tooling. Before starting, read `reason-AGENT-PREAMBLE.md` and the four canonical docs (`reason-INVARIANTS.md`, `reason-DECISIONS.md`, `reason-case-taxonomy.md`, `blunder-reason-evidence.md`). Do NOT touch `reasonEngine.mjs` computeReason logic — this plan only changes board *selection* and eval *plumbing*.

**Goal:** Make `select_boards.mjs --strategy coverage` the single reason-eval board generator with an upfront-named predicate universe, delete the redundant old-explain generator `generate_eval_set.mjs`, and harden `compute.mjs` with per-board error isolation + crash-safe writes ported from `run_eval.mjs`.

**Architecture:** The old LLM-explanation eval (`buildExplainContext` + `run_eval.mjs` + `generate_eval_set.mjs`'s 35 predicates + frozen `eval_set_*.json`) is retired — it is not being evaluated going forward. Only the reason feature vector (now, via `compute.mjs --llm` + `grade-fv-sufficiency`) and a future glossary-derived prompt are evaluated; both consume the same reason feature vector, so one board set over one reason predicate universe serves both. Board selection moves from dynamic predicate discovery to an enumerated universe partitioned into `required` (blocks termination) and `provisional` (known-rare, reported-but-non-blocking).

**Tech Stack:** Node.js ESM (`.mjs`), `node --test`, `npm run test:fast`, the c4solver IPC wrapper, `gameSampling.js` self-play harvest.

## Global Constraints

- Coordinates are **0-indexed internally**; the engine emits `cNrM` 1-indexed. Never introduce 1-indexed coordinates in server code. (CLAUDE.md)
- Movestrings come only from `gameSampling` self-play, the DB, or the KB — **never hand-constructed**. (CLAUDE.md)
- Run `npm run test:fast` inside `connect-four/` (NOT `npm test` — candidate-generator hangs). (CLAUDE.md)
- Correctness/coverage over solver-call cost; extra solver passes are acceptable (INVARIANT I0, D1).
- Validate any classification/stop rule against its full case-space with a counterexample per case, through the production detector (INVARIANT I12).
- DB scripts: read memory `reference_supabase_connection.md` first. (No DB work in this plan, but noted.)
- Docs + memory updates land in the **same change** as the code they describe (project rule).

---

## File Structure

- **Modify** `connect-four/server/scripts/select_boards.mjs` — coverage strategy rewritten to a named universe; fixture strategy untouched.
- **Modify** `connect-four/server/scripts/compute.mjs` — evidence pass gains per-board `try/catch` + crash-safe append; answerer skips error rows.
- **Delete** `connect-four/server/scripts/generate_eval_set.mjs` — redundant old-explain board generator.
- **Modify** `connect-four/server/scripts/run_eval.mjs` — deprecation header only (chain swept later).
- **Modify** docs: `reason-DECISIONS.md`, `blunder-reason-evidence.md`, `reason-tag-fastpath-pseudocode.md`, `RUNBOOK_fv_sufficiency.md`.
- **Modify** memories under `~/.claude/projects/-Users-elsonidoq-prog-cuatro-en-linea/memory/`.
- **Create** `connect-four/server/tests/computeEvidenceIsolation.test.mjs` — regression for the compute.mjs hardening (requires a tiny testable extraction, Task 2).

---

## Phase B (do first — small, self-contained): compute.mjs robustness ports

### Task 1: Extract `buildEvidenceRow` as an importable, solver-free-testable unit

**Files:**
- Modify: `connect-four/server/scripts/compute.mjs:75-104`

**Interfaces:**
- Produces: `export async function buildEvidenceRow(f, i, solver)` → `{ id, evidence|null, error|null, groundTruth|null }`. Consumed by `runEvidence` and by Task 2's test (with a stub solver / a computeReason that throws).

- [ ] **Step 1: Add `appendFileSync` to imports (already present) and export a per-row builder.** Replace the body of `runEvidence` (`compute.mjs:75-104`) with:

```js
// Build one evidence row; isolates a throwing/terminal board (ported from run_eval.mjs:120-126).
export async function buildEvidenceRow(f, i, solver) {
  const id = f.id ?? `eval-${i + 1}`;
  const groundTruth = f.expectedCase != null
    ? { case: f.expectedCase, gate: f.expectedGate ?? null, exhaustive: f.expectedExhaustive ?? null, bucket: f.bucket ?? null, matches: null }
    : null;
  try {
    const evidence = await computeReason(f.movestring, f.playedCol, { solver });
    if (groundTruth) groundTruth.matches = evidence.case === f.expectedCase;
    return { id, evidence, error: null, groundTruth };
  } catch (err) {
    return { id, evidence: null, error: err.message, groundTruth };
  }
}

async function runEvidence() {
  const fixture = readFileSync(INPUT, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const solver = createSolverProcess();
  const rows = [];
  writeFileSync(evidenceOut, ''); // fresh run; crash-safe appends below
  try {
    for (let i = 0; i < fixture.length; i++) {
      const row = await buildEvidenceRow(fixture[i], i, solver);
      rows.push(row);
      appendFileSync(evidenceOut, JSON.stringify(row) + '\n'); // crash-safe incremental write
      if (row.error) process.stdout.write(`  ${row.id}: ERROR ${row.error}\n`);
    }
  } finally {
    solver.destroy();
  }
  const mism = rows.filter((r) => r.groundTruth?.matches === false).length;
  const errored = rows.filter((r) => r.error).length;
  const labeled = rows.filter((r) => r.groundTruth !== null).length;
  console.log(`wrote ${rows.length} evidence rows to ${evidenceOut}`);
  console.log(`case mismatches vs fixture ground truth: ${mism}${labeled < rows.length ? ` (${rows.length - labeled} rows unlabeled)` : ''}${errored ? `; ${errored} errored` : ''}`);
  return rows;
}
```

- [ ] **Step 2: Skip error rows in the answerer.** In `runLlm` change the guard at `compute.mjs:234` from `if (row.evidence?.notABlunder) continue;` to:

```js
    if (!row.evidence || row.evidence.notABlunder) continue; // error row or non-blunder: nothing to narrate
```

- [ ] **Step 3: Run the fast suite to confirm no import breakage.**

Run: `cd connect-four && npm run test:fast`
Expected: PASS (same count as before; new export is inert until Task 2 imports it).

- [ ] **Step 4: Commit.**

```bash
git add connect-four/server/scripts/compute.mjs
git commit -m "feat(reason-eval): isolate per-board errors + crash-safe evidence writes in compute.mjs"
```

### Task 2: Regression test for per-board isolation

**Files:**
- Create: `connect-four/server/tests/computeEvidenceIsolation.test.mjs`

**Interfaces:**
- Consumes: `buildEvidenceRow` from `compute.mjs` (Task 1).

- [ ] **Step 1: Write the failing test** (a fake solver + a movestring that makes `computeReason` throw is unnecessary — inject the throw via a solver stub whose `query` rejects; `computeReason` will surface it).

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildEvidenceRow } from '../scripts/compute.mjs';

// NOTE on movestrings: these tests inject a solver stub whose `query` throws, so `computeReason`
// fails before any board is reasoned about. The `movestring` field is therefore an OPAQUE input to
// a throwing dependency, never a board whose properties are asserted — the global "no hand-rolled
// movestrings" rule (about reasoned boards) does not apply. Any string that reaches the stub works.

test('buildEvidenceRow isolates a throwing engine into an error row (never throws)', async () => {
  const throwingSolver = { query: async () => { throw new Error('Invalid position'); } };
  const row = await buildEvidenceRow({ movestring: 'x', playedCol: 0, id: 'x1' }, 0, throwingSolver);
  assert.equal(row.id, 'x1');
  assert.equal(row.evidence, null);
  assert.match(row.error, /Invalid position/);
});

test('buildEvidenceRow attaches groundTruth scaffold (matches:null) on the error path when expectedCase present', async () => {
  // Pins that groundTruth is built even when the engine throws (matches stays null, not mislabeled).
  // The success path (matches set from evidence.case) is covered end-to-end by Task 12's dry run.
  const throwingSolver = { query: async () => { throw new Error('boom'); } };
  const row = await buildEvidenceRow({ movestring: 'y', playedCol: 3, expectedCase: 'win_to_draw' }, 4, throwingSolver);
  assert.deepEqual(row.groundTruth, { case: 'win_to_draw', gate: null, exhaustive: null, bucket: null, matches: null });
  assert.equal(row.error, 'boom');
});
```

- [ ] **Step 2: Confirm the test is discovered and passes.**

Run: `cd connect-four && node --test server/tests/computeEvidenceIsolation.test.mjs`
Expected: PASS (2 tests). Note: importing `compute.mjs` runs its top-level arg parse — guard against `process.exit(1)` by passing a dummy `--input`.

- [ ] **Step 2a: If import triggers the `--input` required exit,** wrap the top-level CLI in a `import.meta.main`-style guard: move the `(async () => {…})()` main and the `if (!inputArg) process.exit(1)` behind `if (process.argv[1] === fileURLToPath(import.meta.url))`. Re-run Step 2.

- [ ] **Step 3: Run the fast suite.**

Run: `cd connect-four && npm run test:fast`
Expected: PASS, test count +2.

- [ ] **Step 4: Commit.**

```bash
git add connect-four/server/tests/computeEvidenceIsolation.test.mjs connect-four/server/scripts/compute.mjs
git commit -m "test(reason-eval): compute.mjs per-board error isolation"
```

---

## Phase A: select_boards.mjs coverage → named universe

### Task 3: Add the named predicate universe + required/provisional partition (SEED values)

**Files:**
- Modify: `connect-four/server/scripts/select_boards.mjs` (coverage branch, near `:238`)

**Interfaces:**
- Produces: `REASON_UNIVERSE` (array of predicate strings), `PROVISIONAL` (Set). Consumed by Tasks 5–7.

- [ ] **Step 1: Define the universe and the provisional seed** at the top of the `else if (strategy === 'coverage')` block, before `reasonPredicates`:

```js
  // The FULL closed predicate universe, named upfront (design: docs/architecture reason review 2026-07-01).
  // Every value of every axis the reason engine can emit. `discovered ⊆ REASON_UNIVERSE` is asserted at
  // the end (Task 6): an engine-emitted predicate not listed here is a bug in this list, not the engine.
  const REASON_UNIVERSE = [
    'route_sign', 'route_realized_denied',
    'case_win_to_draw', 'case_win_to_lose', 'case_draw_to_lose', 'case_lose_to_faster_lose',
    'player_1', 'player_2',
    'phase_opening', 'phase_mid-game', 'phase_closing',
    'sev_small', 'sev_moderate', 'sev_large',
    'rd_immediate_threat_missed_own', 'rd_immediate_threat_enabled_opponent',
    'rd_forced_block_defensive_miss',
    'rd_double_threat_missed_own', 'rd_double_threat_enabled_opponent',
    'rd_figure_7_missed_own', 'rd_figure_7_enabled_opponent',
    'lost_fork_A', 'lost_fork_B', 'lost_parity_win',
    'lost_denial_occupation', 'lost_denial_no_occupation', 'lost_conditional_swindle',
    'lost_realized_immediate_threat', 'lost_realized_forced_block',
    'lost_realized_double_threat', 'lost_realized_figure_7',
    'opp_winning_line', 'opp_denial', 'opp_neutralization', 'opp_realized_pattern',
    'tie_tied', 'tie_independent', 'tie_temporal',
    'reg_lost_immediate', 'reg_lost_forced_sequence', 'reg_lost_parity',
    'reg_opp_immediate', 'reg_opp_forced_sequence', 'reg_opp_parity',
    'tactic_lost_present', 'tactic_lost_null', 'tactic_opp_present', 'tactic_opp_null',
    'parity_nameable', 'parity_unnameable', 'parity_forcedFirst',
    'opp_parity_nameable', 'opp_parity_unnameable',
    'gate_exhaustive', 'gate_bounded',
  ];
  // SEED partition — finalized empirically by Task 8 (calibration). Provisional = known-rare /
  // possibly-unreachable in ordinary self-play; reported but NON-blocking (never gates satisfied()).
  const PROVISIONAL = new Set([
    'rd_double_threat_enabled_opponent', 'rd_figure_7_enabled_opponent', // 0/60k harvested (D20 honest-limits)
    'tie_temporal',                        // lose_to_faster_lose only
    'lost_denial_no_occupation',           // D18: depth artifact, near-unreachable
    'lost_realized_figure_7', 'lost_fork_B', // figure_7/Case-B forks are rare
    'parity_unnameable', 'opp_parity_unnameable', // multi-window board-fill only
  ]);
  const REQUIRED = REASON_UNIVERSE.filter((p) => !PROVISIONAL.has(p));
```

- [ ] **Step 2: Commit (WIP — no behavior change yet).**

```bash
git add connect-four/server/scripts/select_boards.mjs
git commit -m "feat(reason-eval): name the reason predicate universe (seed required/provisional)"
```

### Task 4: Add router axes + fix the realized_pattern lostResource hole in `reasonPredicates`

**Files:**
- Modify: `connect-four/server/scripts/select_boards.mjs:241-279`

- [ ] **Step 1: Add `route`/`rd` axes** after the severity line (`:254`):

```js
    preds.add(`route_${r.route || 'sign'}`);
    if (r.route === 'realized_denied' && r.tag && r.direction) preds.add(`rd_${r.tag}_${r.direction}`);
```

- [ ] **Step 2: Close the realized_pattern hole** — add a branch in the `lr` block (`:258-261`) after the `conditional_swindle` line:

```js
      else if (lr.kind === 'realized_pattern') preds.add(`lost_realized_${lr.tag}`);
```

(The tag is on `lr.tag`, not `lr.tacticTag`; opponent-side realized patterns are already covered by `opp_${op.kind}` → `opp_realized_pattern` at `:271`.)

- [ ] **Step 3: Commit.**

```bash
git add connect-four/server/scripts/select_boards.mjs
git commit -m "feat(reason-eval): stratify coverage on route + (tag,direction); fix realized_pattern lost hole"
```

### Task 5: `satisfied()` over REQUIRED; MAX_GAMES as bug-bound

**Files:**
- Modify: `connect-four/server/scripts/select_boards.mjs:283`, `:339-341`

- [ ] **Step 1: Redefine `satisfied()`** (`:283`) to check every REQUIRED predicate has reached target (not "every seen predicate"):

```js
  const satisfied = () => REQUIRED.every((p) => (counts.get(p) || 0) >= TARGET_PER_PREDICATE);
```

- [ ] **Step 2: Keep the early break** (`:340`) unchanged (`if (satisfied()) break;`). No other change here.

- [ ] **Step 3: Commit.**

```bash
git add connect-four/server/scripts/select_boards.mjs
git commit -m "feat(reason-eval): satisfied() gates on REQUIRED predicates only"
```

### Task 6: `discovered ⊆ named` guard + fulfilled/under-target/never-seen logging

**Files:**
- Modify: `connect-four/server/scripts/select_boards.mjs:293-306` (heartbeat), `:329` (count loop), `:346-348` (final)

- [ ] **Step 1: Add the guard** where predicates are counted (`:329`, inside `for (const p of preds) counts.set(...)`), so an unnamed predicate fails loudly:

```js
      for (const p of preds) {
        if (!REASON_UNIVERSE.includes(p)) throw new Error(`unnamed predicate "${p}" — add it to REASON_UNIVERSE (I12 selector guard)`);
        counts.set(p, (counts.get(p) || 0) + 1);
      }
```

- [ ] **Step 2: Add a shared reporter** near `logProgress` (before `:293`):

```js
  const predicateReport = () => {
    const seen = new Set(counts.keys());
    const fulfilled = REQUIRED.filter((p) => (counts.get(p) || 0) >= TARGET_PER_PREDICATE);
    const underTarget = REASON_UNIVERSE.filter((p) => seen.has(p) && (counts.get(p) || 0) < TARGET_PER_PREDICATE)
      .sort((a, b) => (counts.get(a) || 0) - (counts.get(b) || 0)).map((p) => `${p}(${counts.get(p) || 0})`);
    const neverSeen = REASON_UNIVERSE.filter((p) => !seen.has(p)).map((p) => PROVISIONAL.has(p) ? `${p}*` : p);
    return { fulfilled, underTarget, neverSeen };
  };
```

- [ ] **Step 3: Rewrite the heartbeat body** (`:297-305`) to use the reporter:

```js
    const { fulfilled, underTarget, neverSeen } = predicateReport();
    const elapsed = ((now - startedAt) / 1000).toFixed(0);
    process.stderr.write(
      `[${elapsed}s] checked ${checked} · generated ${boards} · games ${games} · `
      + `fulfilled ${fulfilled.length}/${REQUIRED.length} · under-target(${underTarget.length}): ${underTarget.join(' ') || 'none'} · `
      + `never-seen(${neverSeen.length}): ${neverSeen.join(' ') || 'none'}\n`,
    );
```

- [ ] **Step 4: Rewrite the final summary** (`:346-348`) to name the exit reason and both lists (`*` marks provisional):

```js
  const { fulfilled, underTarget, neverSeen } = predicateReport();
  const stopped = satisfied() ? 'all REQUIRED predicates satisfied' : `hit MAX_GAMES=${MAX_GAMES} — a REQUIRED predicate could not be filled (investigate)`;
  process.stderr.write(`\nDone: ${games} games, ${collected.length} boards → ${outPath} (${stopped})\n`);
  process.stderr.write(`Fulfilled (${fulfilled.length}/${REQUIRED.length})\n`);
  process.stderr.write(`Under target ${TARGET_PER_PREDICATE} (${underTarget.length}): ${underTarget.join(' ') || 'none'}\n`);
  process.stderr.write(`Never seen — * = provisional (${neverSeen.length}): ${neverSeen.join(' ') || 'none'}\n`);
```

- [ ] **Step 5: Update the coverage-branch header comment** (`:233-237`): remove "Ported from build_reason_eval_set.mjs"; describe the named universe.

- [ ] **Step 6: Commit.**

```bash
git add connect-four/server/scripts/select_boards.mjs
git commit -m "feat(reason-eval): discovered⊆named guard + fulfilled/under-target/never-seen coverage log"
```

### Task 7: Fix the stale fixture-strategy header (doc/code consistency)

**Files:**
- Modify: `connect-four/server/scripts/select_boards.mjs:2-13`, `:48-54`

- [ ] **Step 1:** Replace the "byte-identical to committed" / "Ports build_fixture.mjs verbatim" wording with an accurate note: the committed fixture additionally carries `route`/`expectedTag`/`expectedDirection`/`d19-witness` rows added by the D19/D20 test commits (`0a85b0c`, `7c06e24`, `bb36202`); the fixture strategy regenerates the *sampled* rows but does not re-emit those labels. (Actually re-labeling is out of scope for this plan — this step only corrects the comment to stop over-claiming byte-identity.)

- [ ] **Step 2: Commit.**

```bash
git add connect-four/server/scripts/select_boards.mjs
git commit -m "docs(reason-eval): correct stale fixture-strategy header in select_boards"
```

### Task 8: Calibration run — finalize required/provisional from data

**Files:**
- Read-only run of `connect-four/server/scripts/select_boards.mjs`; then edit `PROVISIONAL` (Task 3, Step 1) per results.

- [ ] **Step 1: Run coverage to MAX_GAMES with a high target** so the log reports every predicate's yield:

Run (from `connect-four/`): `node server/scripts/select_boards.mjs --strategy coverage --target 3 --max-games 4000 --out /tmp/cov_calib.jsonl 2>&1 | tee /private/tmp/claude-501/-Users-elsonidoq-prog-cuatro-en-linea/*/scratchpad/cov_calib.log`
Expected: terminates on "all REQUIRED predicates satisfied" OR "hit MAX_GAMES" with a `never-seen` list.

- [ ] **Step 2: Read the final `never-seen` and `under-target` lists.** For each predicate that never reached target under a full `MAX_GAMES` budget, decide: genuinely unreachable-in-self-play → move to `PROVISIONAL`; merely slow but present → keep `REQUIRED` (its rarity is the diagnostic). Update the `PROVISIONAL` set in Task 3 Step 1 accordingly. Record the observed yields in the commit body.

- [ ] **Step 3: Re-run to confirm the run now terminates on "all REQUIRED satisfied"** within `MAX_GAMES` (no REQUIRED predicate wedges it):

Run: `node server/scripts/select_boards.mjs --strategy coverage --target 2 --out /tmp/cov_final.jsonl`
Expected: `Done: … (all REQUIRED predicates satisfied)`.

- [ ] **Step 4: Commit the calibrated partition.**

```bash
git add connect-four/server/scripts/select_boards.mjs
git commit -m "chore(reason-eval): calibrate required/provisional predicate partition from harvest yields"
```

### Task 9: Source the enabled_opponent forks (targeted, all-suboptimal-columns)

> This is the one genuinely new *harvest*, not just a rewrite. It feeds the **fixture** stratum (I12 counterexamples), not the coverage set. If Task 8 shows the two `rd_*_enabled_opponent` pairs are truly absent, this task attempts to source them; if it also finds zero, they stay PROVISIONAL and this task closes as "documented gap" per D20 honest-limits.

**Files:**
- Create (scratch, NOT committed): `scratchpad/harvest_rd_enabled.mjs`
- Modify (only if hits found): `connect-four/server/scripts/reason_engine/reason_fixture.jsonl`

**Interfaces:**
- Consumes: `playGame`/`harvestBlunders` (`gameSampling.js`), `tagBlunder` (`classifier.js`), `computeReason` (`reasonEngine.mjs`), `legalCols` (`boardUtils.mjs`).

- [ ] **Step 1: Write the scratch harvester** — for each self-play position, run `tagBlunder(ms, c, bestCol, solver)` over **every** suboptimal legal `c` (not just the played move), keep only rows where `computeReason` confirms `route==='realized_denied' && tag∈{double_threat,figure_7} && direction==='enabled_opponent'`:

```js
// scratchpad/harvest_rd_enabled.mjs — targeted search for the two unsourced rd/enabled_opponent forks.
// Sourced from gameSampling self-play; probes ALL suboptimal cols per position. NEVER hand-rolled boards.
import { createSolverProcess } from '../connect-four/server/c4solver-wrapper.js';
import { playGame } from '../connect-four/server/gameSampling.js';
import { tagBlunder } from '../connect-four/server/classifier.js';
import { computeReason } from '../connect-four/server/scripts/reason_engine/reasonEngine.mjs';
import { legalCols } from '../connect-four/server/scripts/reason_engine/lib/boardUtils.mjs';

const WANT = new Set(['double_threat:enabled_opponent', 'figure_7:enabled_opponent']);
function mulberry32(a){return function(){a|=0;a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};}

const solver = await createSolverProcess();
const rng = mulberry32(0xBEEF);
const hits = [];
try {
  for (let g = 0; g < 4000 && hits.length < 4; g++) {
    for await (const pos of playGame(solver, rng)) {
      const { ms, scores } = pos;
      const legal = legalCols(scores);
      if (legal.length < 2) continue;
      let bestCol = legal[0]; for (const c of legal) if (scores[c] > scores[bestCol]) bestCol = c;
      for (const c of legal) {
        if (c === bestCol || scores[c] >= scores[bestCol]) continue; // suboptimal only
        let tagged; try { tagged = await tagBlunder(ms, c, bestCol, solver); } catch { continue; }
        if (tagged.direction !== 'enabled_opponent') continue;
        let r; try { r = await computeReason(ms, c, { solver }); } catch { continue; }
        const key = `${r.tag}:${r.direction}`;
        if (r.route === 'realized_denied' && WANT.has(key)) {
          hits.push({ movestring: ms, playedCol: c, bestCol, scores, discs: ms.length, expectedCase: r.case, route: 'realized_denied', expectedTag: r.tag, expectedDirection: r.direction, bucket: `rd-${r.tag}-${r.direction}` });
          process.stderr.write(`HIT ${key}: ${ms} played ${c}\n`);
        }
      }
    }
  }
} finally { solver.destroy(); }
process.stdout.write(JSON.stringify(hits, null, 2) + '\n');
```

- [ ] **Step 2: Run it** (from repo root): `node scratchpad/harvest_rd_enabled.mjs`
Expected: either ≥1 hit per pair (proceed to Step 3) or zero (proceed to Step 4).

- [ ] **Step 3 (if hits): Append the confirmed rows** to `reason_fixture.jsonl` (one JSON object per line, key order matching existing rows), then verify through the production engine:

Run: `cd connect-four && node --test server/tests/reasonEngine.test.mjs`
Expected: PASS, including the new `route:"realized_denied"` rows (assertions at `reasonEngine.test.mjs:67-75`).
Then move the affected `rd_*_enabled_opponent` predicate(s) from `PROVISIONAL` to `REQUIRED` (Task 3) and re-run Task 8 Step 3.

- [ ] **Step 4 (if zero): Leave them PROVISIONAL.** Do NOT hand-roll a board (CLAUDE.md / I10). Record the negative result (games played, positions probed) for the D20 honest-limits update (Task 11). This is a documented gap, not a failure.

- [ ] **Step 5: Commit** (only fixture rows if Step 3 fired; otherwise no code commit — the negative result is captured in docs at Task 11).

```bash
git add connect-four/server/scripts/reason_engine/reason_fixture.jsonl
git commit -m "test(reason): source rd/enabled_opponent fork counterexample(s) via all-suboptimal-cols harvest"
```

---

## Phase C: delete generate_eval_set.mjs + fallout

### Task 10: Delete the redundant generator and sweep references

**Files:**
- Delete: `connect-four/server/scripts/generate_eval_set.mjs`
- Modify: `connect-four/server/scripts/run_eval.mjs:1-16` (deprecation header)

- [ ] **Step 1: Grep for references** across code + docs + scripts:

Run: `cd /Users/elsonidoq/prog/cuatro_en_linea && grep -rn "generate_eval_set" --include=*.mjs --include=*.js --include=*.md . | grep -v node_modules`
Expected: a list to reconcile (RUNBOOK, any script). No **production server** import should appear (it's a dev script).

- [ ] **Step 2: Delete the file.**

```bash
git rm connect-four/server/scripts/generate_eval_set.mjs
```

- [ ] **Step 3: Add a deprecation header to `run_eval.mjs`** (do NOT delete it — the chain is swept when the glossary-prompt evaluator lands):

```js
// DEPRECATED (2026-07-01): the old LLM-explanation eval is retired — it is no longer evaluated.
// The reason feature-vector eval is `compute.mjs`; a glossary-derived prompt evaluator will replace
// this runner. `run_eval.mjs` + `eval_set_*.json` + `buildExplainContext` are swept when that lands.
// Do not build new work on this file.
```

- [ ] **Step 4: Confirm nothing in `test:fast` imported the deleted file.**

Run: `cd connect-four && npm run test:fast`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add -A connect-four/server/scripts/generate_eval_set.mjs connect-four/server/scripts/run_eval.mjs
git commit -m "chore(reason-eval): delete redundant generate_eval_set.mjs; deprecate run_eval.mjs"
```

---

## Phase D: documentation

### Task 11: DECISION D22 + reason docs

**Files:**
- Modify: `docs/architecture/reason-DECISIONS.md` (append D22)
- Modify: `docs/architecture/blunder-reason-evidence.md` (§9, §11)
- Modify: `docs/architecture/reason-tag-fastpath-pseudocode.md` (§Honest-limits, §Follow-up)

- [ ] **Step 1: Append D22 to `reason-DECISIONS.md`** using the Decision/Rationale/Status/Source format, covering: named-universe coverage (required/provisional; `satisfied()` over required; `MAX_GAMES` bug-bound; `discovered ⊆ named` guard); `generate_eval_set.mjs` retired as redundant; one reason universe serves the FV-sufficiency eval now and the future glossary-derived prompt eval; `compute.mjs` per-board isolation + crash-safe writes; the two `rd_*_enabled_opponent` pairs PROVISIONAL (update to sourced if Task 9 Step 3 fired). Use the D22 draft from the 2026-07-01 board-selection review as the base text.

- [ ] **Step 2: Update `blunder-reason-evidence.md`** §9 (harvesting note) to describe the named-universe selector and the all-suboptimal-columns sourcing; §11 to replace `build_fixture.mjs`/`build_evidence.mjs` with `select_boards.mjs` + `compute.mjs`.

- [ ] **Step 3: Update `reason-tag-fastpath-pseudocode.md`** §Honest-limits with the Task-9 harvest result (sourced or still-zero), and §Follow-up to drop `generate_eval_set.mjs` from the pipeline description.

- [ ] **Step 4: Commit.**

```bash
git add docs/architecture/reason-DECISIONS.md docs/architecture/blunder-reason-evidence.md docs/architecture/reason-tag-fastpath-pseudocode.md
git commit -m "docs(reason): D22 named-universe coverage; retire generate_eval_set; refresh evidence+fastpath docs"
```

### Task 12: RUNBOOK + end-to-end dry run

**Files:**
- Modify: `connect-four/server/scripts/RUNBOOK_fv_sufficiency.md`

- [ ] **Step 1: Update the RUNBOOK** so board generation is `select_boards.mjs --strategy coverage` → `compute.mjs`; remove `generate_eval_set.mjs` steps; document the fulfilled/never-seen log and the `MAX_GAMES`-means-bug convention.

- [ ] **Step 2: End-to-end dry run** to prove the pipeline works and `compute.mjs` isolation holds on real boards:

Run (from `connect-four/`):
```bash
node server/scripts/select_boards.mjs --strategy coverage --target 2 --out /tmp/cov.jsonl
node server/scripts/compute.mjs --input /tmp/cov.jsonl --out reason_evidence_cov_dryrun.jsonl
```
Expected: coverage terminates on "all REQUIRED satisfied"; compute writes evidence incrementally with 0 crashes; any bad board appears as an `error` row, not a stack trace.

- [ ] **Step 3: Commit.**

```bash
git add connect-four/server/scripts/RUNBOOK_fv_sufficiency.md
git commit -m "docs(reason-eval): RUNBOOK reflects select_boards+compute pipeline; drop generate_eval_set"
```

---

## Phase E: memories (land with the code)

### Task 13: Fix contradicted + stale memories

**Files:** memory dir `~/.claude/projects/-Users-elsonidoq-prog-cuatro-en-linea/memory/`

- [ ] **Step 1: Rewrite `project_reason_eval_set_selector.md`** — it currently says coverage is "SEEN predicates only … by design" and "stops on satisfied()"; this is **contradicted**. Replace with the named-universe design (REQUIRED/PROVISIONAL; never-seen reported; `MAX_GAMES`=bug; `discovered⊆named` guard).
- [ ] **Step 2: Update `reference_deep_reveal_eval_harness.md`** — `compute.mjs` is the eval entry point (with per-board isolation + crash-safe writes); `run_eval.mjs` deprecated pending the glossary evaluator; old-explanation eval retired.
- [ ] **Step 3: Update `project_run_eval_resume_mode_trap.md`** — note `compute.mjs` now has crash-safe incremental *evidence* writes and deliberately omits resume.
- [ ] **Step 4: Update `project_reason_engine_reorg.md`** — `generate_eval_set.mjs` deleted; coverage generator upgraded to a named universe.
- [ ] **Step 5: Update `reference_eval_set_large_3_sparse_subset.md`** — mark the frozen explain eval sets historical (old-explanation eval retired).
- [ ] **Step 6: Sweep** for any other `generate_eval_set` / `build_reason_eval_set` / `run_eval` memory references: `grep -rl "generate_eval_set\|build_reason_eval_set\|run_eval" ~/.claude/projects/-Users-elsonidoq-prog-cuatro-en-linea/memory/` and reconcile. Update `MEMORY.md` index lines for any renamed hooks.
- [ ] **Step 7:** No git commit (memories are outside the repo). Verify each edited file keeps valid frontmatter.

---

## Sequencing notes

- **Phase B first** (Tasks 1–2): small, self-contained, immediately valuable.
- **Task 8 (calibration) gates Task 3's final partition** and Task 5's termination guarantee — run it before locking.
- **Task 9** depends on Task 8's finding (are the pairs actually absent?).
- **Task 10 (delete) after** Task 6 Step 5 / Task 12 grep (no lingering references).
- **Phases D + E land in the same PR as the code they describe** (project rule).

---

## Self-Review

**Spec coverage** (against the TODO the plan derives from):
- select_boards named universe (A1–A8) → Tasks 3–8 ✅
- enabled_opponent sourcing (A10) → Task 9 ✅
- fixture strategy untouched + header fix (A11–A12) → Task 7 ✅ (re-labeling explicitly out of scope, noted)
- compute.mjs ports B1/B2, skip-error-row, no-resume (B1–B4) → Tasks 1–2 ✅
- delete generate_eval_set + deprecate run_eval (C1–C3) → Task 10 ✅
- docs D1–D4 → Tasks 11–12 ✅ ; D5 (CLAUDE.md) folded into Task 10 Step 1 grep (edit only if hit)
- memories E1–E6 → Task 13 ✅
- tests/verification F1–F4 → Task 2 (F1), Task 8/12 (F4), test:fast gates throughout (F3); F2 (universe self-consistency) is covered by the runtime `discovered⊆named` guard (Task 6) rather than a separate unit test — noted as a deliberate substitution.

**Placeholder scan:** no "TBD"/"add error handling"/"similar to Task N" — code shown inline for every code step. Task 11 Step 1 references an external "D22 draft" rather than inlining ~40 lines; that draft exists verbatim in the conversation/review and is reproduced when executed — acceptable, but if the executor lacks it, regenerate from the D20 entry + this plan's Architecture section.

**Type consistency:** `buildEvidenceRow(f, i, solver)` signature consistent between Task 1 (definition) and Task 2 (test import). `REASON_UNIVERSE`/`PROVISIONAL`/`REQUIRED` names consistent across Tasks 3, 5, 6. Predicate strings in `REASON_UNIVERSE` (Task 3) match those emitted by `reasonPredicates` after Task 4's edits (`route_*`, `rd_*`, `lost_realized_*`).
