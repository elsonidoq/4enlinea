# Handoff from tasks_create (39 tasks, T001–T039, no duplicate IDs)

**Key decisions**
- 8 phases: Setup → Foundational(none) → US1 → US2 → US3 → US4 → Documentation → Deploy prerequisites,
  matching spec.md's P1/P1/P2/P3 order and plan.md's dependency chain (US1 blocks US2/US3; US4 parallel).
- The three `checkP5Strong` gaps are **T025 (tests) + T027 (impl)**, each labelled "Combined task — do
  not split" with the owner's rationale quoted, spanning both `annotationGate.js` (gaps 1–2) and
  `reasonRenderGuard.mjs` (gap 3, `SPAN_CARRYING_CODES`) in one task each.
- **T028 (`promoteRawCoordinates`)** states it is a new export, quotes the exact `checkP6`
  self-rejection mechanism, and forbids wrapping the raw token — deliberately over-cited, since this is
  the fact most likely to be silently "simplified away."
- `usedSpecs` plumbing is three tasks (**T019/T020/T021**) across `zoneAnnotations.mjs` →
  `compute.mjs` → `mechanismExplainer.mjs`, each quoting the exact current body from data-model.md so
  nobody re-derives the handle-vs-spec hedge research.md D3 already resolved.
- **T038** (deploy) is documentation-only per CLAUDE.md's pre-launch rule. **T039** evaluates whether a
  script is needed at all and only conditionally specs one, following `reset-staging-db.js`'s verified
  conventions (`--help` exits 0 first, `--dry-run` default, required `--env` with no default,
  project-ref guard, typed confirmation twice for prod, distinct drift exit code). A script was not
  forced into existence — the runbook's two steps (`migrate.js` + one TRUNCATE) may not need one.
- **T037** carries the deliberately-out-of-scope `P5strong:tg` strip defect into `docs/open_issues.md`
  rather than letting it evaporate.

**Trade-offs / deferred**
- Exact OI numbers not assigned (T031's OI-143 close, T037's possible new OI) — that needs current
  `docs/open_issues.md` state at execution time. Flagged "OI-170+ if a new issue is needed."
- Future-square hex colour not pre-decided (**T008**) — spec/research left it `UNVERIFIED SKETCH`. The
  implementer gets exact collision-check instructions (4 existing `ZONE_COLORS` + `Board.jsx`
  `shimStyle`) instead of an authored colour.
- **T028's "already-inside-a-zone" nested-promotion guard is an open design choice** per data-model.md
  §5 (two named options, no pick). Whoever implements T028 must resolve it, and **T026 test case 3 must
  cover whatever they pick.**

**Fragile areas to scrutinize**
- **T002** (migration renumber re-verification) sits in Setup, but its effect only matters right before
  T022/T038. If tasks run out of strict order, re-verify immediately before T022 — not just once at
  the start.
- **T029** exports `rcToCellStr` from `zoneAnnotations.mjs`, a previously-unexported local helper —
  check for a naming collision at that call site when implemented.
- **The "US3 needs both US1 and US2" dependency is an inference**, not an explicit epic statement.
  Strictly, `toAllowedSet` needs only `aliases`, not `requiredSet`, so US3's core `checkP5Strong`
  threading could start before US2 finishes. Conservative ordering was kept because `computeMechanism`'s
  return shape changes in both US2 and US3 in the same function.
