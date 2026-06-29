⛔ **SUPERSEDED / ABANDONED 2026-06-28**

The reason-field / unified-blunder design that this audit was built to verify branched off
and is no longer the plan. Work is restarting from `docs/architecture/my_pseudocode.md`.

**Do NOT use the following as guidance — treat as historical only:**

- All `*.md` in this folder that carry the SUPERSEDED banner (REPORT, REPORT_verify, CATALOG,
  AUDITOR_BRIEF*, HANDOFF*, PROMPT_verify_unified_reason, `verify_cases/`, `cases/UNIFY_*`,
  `cases/DESIGN_parity_*`).
- The golden fixtures encoding the drifted expected reasons (cannot carry an inline banner):
  - `GOLDEN.jsonl`
  - everything under `golden/` (`eval-*.json`)

**Still valid / reusable (NOT quarantined):**

- `TOOLS/` — solver/board diagnostic primitives (mechanism, reuse freely)
- `cases/eval-*.md` — raw reproducible board evidence (real movestrings + solver commands)
