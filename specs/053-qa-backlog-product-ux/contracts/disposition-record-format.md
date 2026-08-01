# Contract: Finding Disposition Record

This feature has no HTTP/API surface. Its one "contract" is the shape of the disposition record each
QA finding and each `OI-N` entry must carry, so `docs/open_issues.md`'s OI-35 body and
`agentic_QA_2026-07-15-1321.md`'s inline annotations agree and are independently machine-greppable.

**The two record shapes below are deliberately different and MUST NOT be conflated.** The greppable
`DISPOSITION:` tag is a one-off convention scoped to `agentic_QA_2026-07-15-1321.md` only — that file is
a one-off triage artifact, and the machine-checkable per-finding count is genuinely useful for proving
SC-002's "zero findings unaddressed" via `grep -n "^DISPOSITION:"`. It has **no precedent elsewhere in
this repo** and is not proposed as a repo-wide convention. The durable `docs/open_issues.md` record uses
the file's **existing house prose style** (`**Status**:` / `**UPDATE <date>**` blocks) — do not mint a
`DISPOSITION:`-tag entry there; that would invent a parallel convention in a file every future session
reads.

## Per-finding disposition (inline in `agentic_QA_2026-07-15-1321.md`)

Append a disposition line directly under each finding, using this literal tag vocabulary so a future
`grep -n "^DISPOSITION:"` reliably enumerates all of them:

```
DISPOSITION: fixed — <file:line or test name>, verified <YYYY-MM-DD>
DISPOSITION: stale — <one-line reason>, verified <YYYY-MM-DD>
DISPOSITION: fix-here — see OI-35, fixed <YYYY-MM-DD>
DISPOSITION: owned-by-Epic-<N> — <shipped, confirmed covered | new OI-N filed: OI-<M>>
DISPOSITION: new-OI-N — filed as OI-<M>
```

Rules:
- Exactly one `DISPOSITION:` line per finding (FR-002, SC-002).
- `fixed` and `stale` MUST cite a verification date — a disposition without a date is not distinguishable
  from a stale claim (the exact failure mode FR-001 is correcting in OI-35's own body today).
- `owned-by-Epic-N` MUST say whether that epic is shipped (cite the commit, as FR-009 does for Epic 6:
  `4d78aa2`) or still open (in which case it's a pointer, not a "covered" claim).

## Per-`OI-N` durable record (in `docs/open_issues.md`)

Follow the file's existing entry shape (see OI-38's `UPDATE 2026-07-30` block as the closest worked
example of correcting a stale claim without re-litigating the underlying decision):

```markdown
## OI-N — <title>

**Status**: ✅ RESOLVED <YYYY-MM-DD>   <!-- or: open, with a dated UPDATE block below -->
**Area**: <files/screens>

<body: what shipped, where, and the evidence — file/line or commit>
```

For OI-35 specifically, the body MUST include the full disposition table (one row per finding, or a
grouped summary with an explicit total count matching the stated denominator: **23** tagged findings
(the 25 `####` blocks minus the 2 `[passes]` entries, excluded by definition — they record a success,
not a finding) **plus** the **4** `❌ fail` checklist rows swept from outside any `####` header — not a
link back to the file (FR-003). US1's re-triage task (T007) is required to freeze and state this exact
denominator before assigning any disposition.

## `staging_checks.md:495` sign-off contract (FR-014/FR-014a/FR-014b)

The existing checkbox item's `- [ ]` MUST NOT be checked (`- [x]`) unless a dated note directly beneath
it states: browser (real, non-automation, e.g. "Chrome 12x, incognito, macOS"), date, and "audible: yes"
for **both** English and Spanish — never a checked box backed only by the design-decision text.

There are exactly three legal outcomes for this checkbox, not two:

1. **Audible in both languages**: `- [x]`, with the dated note described above.
2. **Silently blocked in either language**: checkbox stays `- [ ]`; the note records what was observed
   instead, with a pointer to the newly-filed `OI-N` (FR-014b) — this is a bug to file, not a pass.
3. **Not yet performed this session**: checkbox stays `- [ ]`; the note records that the check is
   pending, naming a **specific owner and a concrete ISO target date** — not a generic "pending" (e.g.
   "pending real-browser check — handed off to `<real name>`, target `<YYYY-MM-DD>`, see OI-21"). This
   same owner + target date MUST also be filed in `docs/deployment_steps.md` **and** the OI-21 body in
   `docs/open_issues.md`, so the pending check is discoverable wherever pre-staging gates are actually
   read — not only in the dated note beside this checkbox. This is the expected outcome when an
   implementing agent reaches this step with no human available to run it — it is not a failure and does
   not block closing OI-21 itself (OI-21's design-question closeout is satisfied by the documented
   alternative alone; FR-014a governs only this checkbox). An automated/scripted check MUST NOT be
   substituted to manufacture outcome 1 or avoid recording outcome 3 — see FR-014a's prohibitions.
