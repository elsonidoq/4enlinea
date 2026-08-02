# Data Model: Dev Infrastructure & Test-Quality Baseline

**N/A — this feature makes no data-model or schema changes.**

Confirmed at spec level (`spec.md:130`, verbatim: "This epic makes no data-model or schema
changes; it touches lint configuration, test files/scripts, contract/doc annotations, and the
`docs/open_issues.md` backlog file. There are no new or changed data entities.") and re-confirmed
during planning: no migration, no new table/column, no new API request/response shape, no new
frontend state shape. The only "entities" this epic manipulates are:

- **`eslint.config.js`'s `files` blocks** — configuration, not data.
- **`docs/open_issues.md` entries** (OI-58, OI-6, OI-72, plus the six audited issues) — existing
  markdown backlog rows, updated in place per the project's established "Issue closeout
  convention"; no new schema for an entry (the convention already defines `Status`/`Area`/
  `Discovered`/body/`If picked up` — this epic does not add new fields).
- **A new dated section appended to `docs/open_issues.md`** (FR-017's whole-backlog audit) —
  follows the exact shape of the existing precedent blockquote at `docs/open_issues.md:9-16`
  (see `research.md` R12); still markdown prose, not a new data entity.

No `contracts/` directory is produced for the same reason (see plan.md's Project Structure
section) — there is no new external interface for this feature to define a contract for.
