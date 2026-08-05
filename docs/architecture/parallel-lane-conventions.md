# Parallel-lane conventions — forking epics into worktrees and merging them back

Several epics are routinely worked in parallel, each in its own linked worktree ("lane"),
all branched from the same base commit, then merged back one at a time. This doc covers
**how to set a lane up so the merge is cheap**, and the registry inventory that makes it
expensive when ignored.

For port isolation inside a worktree, see [worktree-conventions.md](./worktree-conventions.md) —
a different subject, same directory.

For the merge itself, use the `merging-parallel-lanes` skill
(`.claude/skills/merging-parallel-lanes/SKILL.md`), which is the executable checklist.

---

## The one thing that actually collides: shared append-only registries

Measured on the 2026-08-02 merge of two lanes (Epics 1–4 and Epics 5–7), each of which
touched ~80 files including the same two large source files:

- **7 files conflicted. 6 of them were shared registries, not code.**
- Real code conflicted in 2 places, one of which was a single adjacent import line.
- `server/index.js` and `ChallengeScreen.jsx` — heavily edited by *both* lanes — auto-merged
  correctly with no interference.

The lesson is not "coordinate the code better." Code merges fine. **Every hand-maintained
shared list is the merge cost**, and it is nearly all of the merge cost.

### Registry inventory — the files that collide on every parallel merge

| File | What collides | Failure mode if resolved wrong |
|---|---|---|
| `connect-four/package.json` — `test` / `test:fast` / `test:dom` | both lanes append test paths to hand-maintained, glob-free, space-separated lists | **Silent.** Taking either side wholesale unregisters the other lane's tests. No error — an unlisted file simply never runs. See OI-102, OI-118. |
| `docs/open_issues.md` | both lanes allocate `OI-N` from the same global counter | **Silent where the insertions aren't adjacent** — git takes both sides and you get two OI-81s. See "OI number allocation" below. |
| `specs/index.md` | both lanes append a spec row | Loud (adjacent rows conflict). Union both. |
| `staging_checks.md` | both lanes append an epic section | Loud. Union both; keep each epic's section intact. |
| `.specify/feature.json` | spec-run metadata, single field | Loud, but carries no product meaning — take the newer lane. |

Treat this table as the checklist of what to look at *first* in any lane merge, and add to
it whenever a new hand-maintained shared list appears.

---

## Setting up a lane so the merge is cheap

### 1. Pre-allocate an `OI-N` range per lane, at kickoff

`docs/open_issues.md` numbers come from a single global counter, so two lanes filing issues
concurrently **will** collide. On 2026-08-02 both lanes independently allocated `OI-81`
through `OI-93` for thirteen entirely different issues.

Renumbering after the fact is the expensive path: the numbers are referenced from spec
files, architecture docs, and other OI entries, and any entry that references a renumbered
one has to be repointed by hand.

**Rule:** when a lane is created, allocate it a disjoint block of ~20 OI numbers and record
the block in the lane's epic entry. Lane A takes 120–139, lane B takes 140–159, and so on.
A lane never allocates outside its block.

If a collision has already happened, the cheaper side to renumber is the lane whose numbers
are referenced by *fewer* other entries — check before choosing, because renumbering a lane
whose entries are cross-referenced by its own later entries cascades.

**The heading level is part of the contract.** Entries must use `## OI-N — <title>`. On 2026-08-05 a
lane wrote its three entries as `### OI-N`, which merged cleanly and read fine — but the duplicate
detector everyone relies on is

```bash
grep -ao '^## OI-[0-9]*' docs/open_issues.md | sort -V | uniq -d   # must be empty
```

and an `### OI-N` entry is **invisible to it**. The check reported "clean" while three entries sat
outside the numbering audit entirely; had they collided with another lane's block, nothing would have
caught it. Normalize the heading level during the merge, and re-run the check afterwards rather than
before. The same applies to any scripted scan of the file that anchors on `^## `.

### 2. Land shared test/build infrastructure on the base branch *before* forking

Both 2026-08-02 lanes independently discovered the same two gaps in
`connect-four/tests/dom/jsxLoader.mjs` (`import.meta.env` is undefined under plain Node;
Node ESM rejects attribute-less JSON imports) and fixed them **differently** — one with an
inline `{}` define plus a second loader branch, one with a `globalThis` indirection and a
widened condition. That is duplicated effort *and* a guaranteed conflict in a file neither
lane considered its own.

**Rule:** if a lane needs a change to shared harness, loader, or build config to do its
work, land that change on the base branch and have every lane rebase onto it, rather than
fixing it inside one lane.

The same applies to shared *findings*: both lanes wrote a full `open_issues.md` entry for
the same five permanently-red reason-engine tests (the two `OI-82`s). A known-red baseline
gets rediscovered by every lane that runs the suite — record it once, prominently, or fix it.

### 3. Know the test baseline before the lane starts

`npm run test:fast` is **not green on `main`** — see OI-82. A lane that does not know the
expected failure count reads inherited failures as damage it caused, and a genuine new
failure hides in the noise. Record the expected count and the exact failing files in the
lane's kickoff notes.

---

## Merging lanes back

The full procedure is the `merging-parallel-lanes` skill. The two rules worth stating here
because they are conventions rather than steps:

**Union, never `--ours`/`--theirs`, on any registry.** For every file in the inventory table
above, the correct resolution is the union of both sides. `git checkout --ours` on a
hand-maintained list is how coverage disappears silently.

**The dangerous files are the ones git did *not* flag.** A conflict is loud and gets
attention. Two individually correct halves auto-merged into something neither lane tested is
silent. For every file both lanes touched, verify mechanically that the merge is exactly the
union of the two changesets — the merge diffed against lane A must equal base-vs-lane-B, and
symmetrically. If both directions come back empty, that file is the clean union of both lanes
and needs no reading; anything else needs a human look.

This check is cheap, general, and catches the class of damage that code review of a large
merge reliably misses. **The runnable form lives in step 6 of the `merging-parallel-lanes`
skill** — deliberately in one place only, because the obvious way to write it has two subtle
bugs (a naive `grep -v '^[+-][+-]'` silently drops every markdown list line, and omitting the
merge commit compares against your dirty working tree). Use it from there rather than
re-deriving it here.
