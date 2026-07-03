You are compacting the project's auto-memory index. The `MEMORY.md` index has grown past the size that
loads into context; your job is to shrink it to **115–130 lines** by migrating architecture-grade
knowledge OUT to `docs/architecture/` and pruning stale or redundant memories — proposing the full plan
and getting confirmation BEFORE you change anything.

Optional argument ($ARGUMENTS): a target line count or band (e.g. `120` or `115-130`). If empty, use
**115–130**.

## Locations

- **Memory dir:** `/Users/elsonidoq/.claude/projects/-Users-elsonidoq-prog-cuatro-en-linea/memory/`
  (this is a symlink into the repo at `.claude/projects/-Users-elsonidoq-prog-cuatro-en-linea/memory/`,
  so it IS git-tracked). `MEMORY.md` is the index (one line per memory, loaded every session); each
  `*.md` beside it is one memory.
- **Architecture docs:** @docs/architecture/ — the authoritative, current-state description of how the
  system works (contracts, schemas, invariants, conventions, module shapes).

## The two-destination rule (the whole basis for every decision)

- **Memory = trigger-first GOTCHAS only:** non-obvious traps, counterintuitive decisions, open bugs,
  cross-system surprises an agent would NOT predict from reading the code + the architecture docs.
- **Architecture docs = authoritative current state:** prescriptive, durable, derivable-from-intent.

Discriminating test for each memory: *"If someone read all the architecture docs and then the code,
would this fact SURPRISE them?"* → **YES** = genuine gotcha, keep in memory (tightened). → **NO** =
architecture/convention/contract; its substance belongs in a `docs/architecture/` file — migrate it
there, then delete or fold the memory.

## Why this is needed

`MEMORY.md` loads with an ~200-line cap; lines past it are silently dropped, so tail memories are
invisible. The reduction comes from three moves, in priority order: **(1) MIGRATE** arch-grade content
to the right doc and delete/merge the now-redundant memory; **(2) MERGE** overlapping same-topic
memories into one; **(3) DROP** stale, resolved, or git-derivable entries.

---

## Phase 0 — Backup (do this first, always)

Copy the entire memory dir to the session scratchpad before touching anything. **The memory dir is a
SYMLINK** (`~/.claude/projects/.../memory` → the repo's `.claude/projects/.../memory`), and a naive
`cp -R <symlink> <dest>` copies the *link itself* (macOS/BSD `cp` defaults to `-P` and does not follow
the symlink named on the command line). The "backup" then just points back at the live dir, so after
you start deleting files the backup reads byte-identical to the mutated worktree — a useless snapshot.

To get a real, independent copy you MUST dereference the symlink AND copy the *contents* into a plain
directory. Run exactly this (adjust the two paths):

```bash
SRC="$(cd '<memory-dir>' && pwd -P)"                 # resolves through the symlink to the real dir
DEST="<scratchpad>/memory-backup-$(date +%Y%m%dT%H%M%S)"
mkdir -p "$DEST"
cp -RL "$SRC/." "$DEST/"                              # -L follows symlinks; /. copies contents, not the dir-as-link
```

Then **verify the backup is real, not a mirror of the live dir** before proceeding:

```bash
[ ! -L "$DEST" ] && [ -z "$(find "$DEST" -type l)" ] || echo 'FAIL: backup still contains symlinks'
echo "backup files: $(ls "$DEST"/*.md | wc -l) | live files: $(ls "$SRC"/*.md | wc -l)"   # counts must match
```

The two counts must match and the symlink check must pass. As a final proof of independence you may
`touch "$DEST/_snapshot_marker"` — it must NOT appear in the live dir. Report the backup path and the
verified file count. (The dir is git-tracked too — `git show HEAD:<repo-relative-path>` is the
authoritative pre-compaction source if the scratchpad backup is ever in doubt — but a correct backup
makes a bad pass trivially reversible without touching git.)

## Phase 1 — Read everything and classify

1. Read `MEMORY.md` IN FULL — it is longer than the load cap, so read it in two passes (offset past
   line 200) so you see every entry. Note its trigger-first section headers ("Before writing a DB
   migration", "When debugging auth", …).
2. Skim every `memory/*.md` file it references.
3. Know your migration targets — the most specific owner per fact:
   `api-conventions.md · server-conventions.md · frontend-conventions.md · data-model.md · db-schema.md
   · testing-conventions.md · index-conventions.md · llm-coach-endpoints.md · lesson-editor.md ·
   gap-report.md · feature-vector-sufficiency-experiment.md · feature-vector-glossary.md · the
   reason-engine cluster (reason-INVARIANTS / reason-DECISIONS / reason-case-taxonomy /
   blunder-reason-evidence / reason-render-grounded-prompt)`.
4. Classify EVERY memory into exactly one bucket:
   - **KEEP** — genuine gotcha. Tighten the file body + its one-line index hook.
   - **MIGRATE** — durable fact belongs in an arch doc. **Verify the fact against the actual code FIRST**
     (memories can be stale; if a memory names a file/function/flag, confirm it still exists). If it's
     confirmed, note which doc + section will carry it. If it's stale/wrong → reclassify as DROP and
     flag the divergence.
   - **MERGE** — several memories cover one topic → combine into one file; the others' inbound
     `[[links]]` get repointed.
   - **DROP** — stale/superseded/resolved, or pure "we shipped X"/spec-done/change-log-with-line-refs
     content that git already owns.

## Phase 2 — Propose and get confirmation (HARD GATE — no edits before this)

Present the proposal organized around the OUTCOME, not a raw per-memory dump:

1. **New documentation additions.** Group by target arch doc. For each planned addition, show:
   - the doc + section it lands in;
   - the **new/changed content** (the actual text, or a faithful summary of it);
   - **which memories are incorporated into it** — list each source memory slug with a one-line note on
     what that memory contributes to the addition. (This is the migrate/merge picture, seen from the
     doc's side: every MIGRATE and doc-bound MERGE appears under the addition it feeds.)

2. **Memories to delete.** One list. For each: **slug — why** (migrated-into `<doc §section>` / merged
   into `<slug>` / stale-or-wrong vs code / superseded / git-owned). Call out **stale/wrong** facts
   explicitly so the owner learns where the code diverged.

3. **Memories kept** (count) and **new pointer memories** (at most **0–2**, added ONLY when migrated
   content genuinely needs a trigger — "before doing X, read `docs/architecture/Y`"; never for plain
   reference migrations, or you re-inflate the index).

4. The **projected final `MEMORY.md` line count** (must land in the target band).

Then **STOP and ask for confirmation and feedback** (use the question tool; let the user approve, adjust
per doc-addition or per deletion, or veto specific items). Do not proceed until they confirm. If
`MEMORY.md` is already within the target band, say so and ask whether to still run a lighter tidy pass
rather than forcing cuts.

## Phase 3 — Plan

After confirmation, write a short ordered execution plan (track it with your todo tool): migrations
first (add to arch docs, verifying each doesn't duplicate an existing section — edit in place), then
memory deletions/merges, then `[[link]]` repointing, then the `MEMORY.md` rewrite, then the line-count
check.

## Phase 4 — Execute

- **Migrate:** add each confirmed fact to its arch doc so the doc is self-contained and accurate; never
  duplicate — a fact lives in exactly ONE doc.
- **Delete/merge memories:** when removing or merging a file, grep the memory dir for `[[<slug>]]`
  inbound links and fix or drop them so nothing dangles. Preserve each surviving file's frontmatter
  shape (`name`, `description`, `metadata.type`).
- **Rewrite `MEMORY.md`:** keep it trigger-first; one line per surviving memory under the most specific
  "When/Before…" section; entry format `- [Title](file.md) — hook`; **≤150 chars per line**; delete any
  section header left with zero entries.
- **Re-count.** If still over the band, do another MIGRATE/MERGE/DROP pass — prefer moving substance to
  docs over truncating hooks. Never hit the number by gutting a hook until it no longer says WHEN it
  applies — a trigger that lost its trigger is worthless.

## Phase 5 — Report

List: (1) MIGRATED — slug → arch doc + section that gained the fact; (2) MERGED — which slugs collapsed
into which; (3) DROPPED — slug + why (stale / git-owned / superseded); (4) KEPT — count; (5) new pointer
memories added, if any; (6) final `MEMORY.md` line count; (7) STALE facts found vs the code (dropped,
not migrated) so the owner knows where the code diverged; (8) the backup path from Phase 0.

## Hard rules

- **Never lose a real gotcha.** Migrate-before-delete; when unsure whether a fact is a trap or a
  convention, keep the trap in memory AND ensure the convention is in the doc.
- Do NOT put change-logs, file+line refs, "we shipped X", or spec/plan/tasks-done metadata into either
  destination — git owns those.
- Do NOT duplicate across arch docs; the memory (if any) points to the trap, not the whole explanation.
- Docs + memory only — do not touch application code, tests, or `.superpowers/`.
