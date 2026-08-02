---
name: merging-parallel-lanes
description: Use when merging two or more parallel epic/worktree branches ("lanes") that were forked from a common base back into a shared target branch — especially when both lanes edited the same registries (package.json test lists, docs/open_issues.md, specs/index.md, staging_checks.md) or the same source files. Covers merge-tree pre-flight, union resolution, duplicate OI-N renumbering, and the mechanical check for silently auto-merged files. NOT for an ordinary single feature-branch merge, a rebase, or finishing one branch — this is specifically for reconciling two or more concurrently-developed lanes.
user-invocable: true
argument-hint: "[--target <branch>] [--lanes <branchA> <branchB> ...]  (no arg = infer from the request)"
---

# Merging parallel lanes

## Overview

Several epics get worked in parallel, each in its own worktree, all branched from the same
base, then merged back one at a time. This skill is the checklist for doing that without
silently losing work.

Read `docs/architecture/parallel-lane-conventions.md` first — it carries the *why* and the
registry inventory. This file is the executable procedure.

**The core insight: the conflicts are not the risk.** Conflicts are loud and get attention.
The two ways work actually disappears are (a) resolving a hand-maintained list by taking one
side, and (b) two individually correct halves auto-merging into something neither lane
tested. Steps 4 and 6 exist for exactly those.

## 0. Bind your refs once, up front

Everything below refers to these. `<base>` is the **common fork commit**, not the target's
moving tip — after the first lane fast-forwards, the two diverge and using the wrong one
makes step 6 meaningless.

```bash
TARGET=feature/finish-lessons          # the branch you are merging into
LANE_A=worktree-epic-1-...             # merge order matters; list them in order
LANE_B=worktree-epic-5-...
BASE=$(git merge-base "$LANE_A" "$LANE_B")
echo "base=$BASE"
```

Requires git ≥ 2.38 for `merge-tree --write-tree` (step 2).

## 1. Clean the target checkout first

The target branch is usually checked out in the main worktree (git refuses to check it out
twice), so you work there — with whatever WIP is lying around.

**Untracked files that the incoming merge also creates will abort the merge.** Find them
first, and diff each against the incoming version: a local copy that *differs* from the
committed one is real content you would destroy.

```bash
git diff --name-only "$BASE" "$LANE_A" >  /tmp/incoming.txt
git diff --name-only "$BASE" "$LANE_B" >> /tmp/incoming.txt
sort -u -o /tmp/incoming.txt /tmp/incoming.txt

git status --porcelain -uall | grep '^??' | sed 's/^?? //' \
  | while read -r f; do grep -qxF "$f" /tmp/incoming.txt && echo "COLLIDES: $f"; done
```

`-uall` matters: without it an untracked *directory* is reported as `dir/` and a collision
inside it never matches. For each collision, `git show <lane>:<path> | diff - <path>` before
you touch it, back it up outside the repo, then remove it. Report which ones differed.

- **Never `git add -A`** — a background process auto-commits staged work in this repo. Stage
  explicit paths only.
- Leave unrelated WIP unstaged; verify at the end that nothing outside the merge got staged.

## 2. Pre-flight with `git merge-tree` — know the conflict list before touching anything

```bash
git merge-tree --write-tree "$TARGET" "$LANE_B" | grep '^CONFLICT'
```

This does **not** touch your working tree, index, or HEAD (it does write objects into the
object database; they are unreferenced and GC-able). It **exits 1 when conflicts exist** — so
don't chain it with `&&`. Line 1 of the raw output is the merged tree OID, followed by a
stage table, then the `Auto-merging` / `CONFLICT` log that the grep above extracts.

Run it per lane before starting, and turn the list into a plan — which side, or union, for
each file — *before* the first `git merge`. Resolving a large registry for the first time
while mid-merge is how mistakes happen.

Now compute step 6's work list: the files **both** lanes touched.

```bash
comm -12 <(git diff --name-only "$BASE" "$LANE_A" | sort -u) \
         <(git diff --name-only "$BASE" "$LANE_B" | sort -u) > /tmp/both-touched.txt
wc -l /tmp/both-touched.txt
```

## 3. Work on a trial branch, then fast-forward

```bash
git switch -c merge-trial "$TARGET"
git merge --ff-only "$LANE_A"        # ff if its merge-base is the target tip; cannot conflict
git merge --no-commit "$LANE_B"      # conflicts land here
# ... resolve (steps 4-5), `git add <each resolved path>` ...
git commit                           # opens an editor; -F - to pipe a message instead
# ... verify (step 6) and run the suites (step 7); `git commit --amend` if you fix something ...
git switch "$TARGET"
git merge --ff-only merge-trial
git branch -d merge-trial
```

Fast-forwarding the validated commit is better than re-resolving by hand on the real branch:
identical tree, identical two-parent history, no risk of the second resolution diverging from
the one you actually tested.

If the final `--ff-only` fails, the target moved while you worked. Re-run from step 2 against
the new tip — do **not** force it.

## 4. Resolve registries by UNION — never take one side *as the resolution*

For every **list-shaped** registry in the inventory
(`docs/architecture/parallel-lane-conventions.md`), the answer is the union of both sides.
The one exception is `.specify/feature.json` — a single field with no product meaning; take
the newer lane.

`git checkout --ours <path>` is fine as a clean **starting point** you then append to. It is
never the finished answer. (On the trial branch `--ours` is the target side — i.e. lane A,
already merged — not "whichever lane you prefer".) Remember `git add <path>` after resolving.

### `connect-four/package.json` — highest risk, fails silently

`test`, `test:fast`, `test:dom` are hand-maintained, single-line, space-separated,
**glob-free** file lists. Taking either side wholesale unregisters the other lane's tests with
no error — an unlisted file simply never runs.

Extract the three versions and compute the union *before* editing, so you know what you owe:

Note the `${VAR}:path` braces below — **`git show "$BASE:connect-four/…"` silently loses the
`:c` under zsh** and fails with a confusing `ambiguous argument 'c18cf63onnect-four/…'`. Always
brace the variable in a `<rev>:<path>` argument.

```bash
git show "${BASE}:connect-four/package.json"    > /tmp/pkg-base.json
git show "${LANE_A}:connect-four/package.json"  > /tmp/pkg-a.json
git show "${LANE_B}:connect-four/package.json"  > /tmp/pkg-b.json

node -e '
const g=p=>require(p).scripts, base=g("/tmp/pkg-base.json"), a=g("/tmp/pkg-a.json"), b=g("/tmp/pkg-b.json");
const tk=s=>(s||"").split(/\s+/).filter(x=>/\.(m?jsx?)$/.test(x));   // paths only, not flags
for (const k of ["test","test:fast","test:dom"]) {
  const B=tk(base[k]), A=tk(a[k]), Bl=tk(b[k]), bs=new Set(B);
  console.log(k, "| A adds:", A.filter(x=>!bs.has(x)).length, "B adds:", Bl.filter(x=>!bs.has(x)).length,
    "| A removed:", B.filter(x=>!A.includes(x)).length, "B removed:", B.filter(x=>!Bl.includes(x)).length,
    "| expected union size:", new Set([...A,...Bl]).size);
}'
```

Both this and the verifier below filter to **path-shaped tokens only**, so their numbers are
directly comparable — `expected union size` here must equal the count printed there. Counting
raw whitespace tokens instead would inflate these by the `node` / `--test` / `--import` flags
and quietly break that comparison.

`expected union size` is the number to hit (a path both lanes added counts once — which is
why you cannot just add the two "adds" numbers). A non-zero "removed" means a lane
deliberately *deregistered* something; carry that intent through rather than resurrecting it.

Then `git checkout --ours` for a clean base and append the other lane's additions with
**precise `Edit` calls**. Do **not** rewrite `package.json` with a scripted regex — that has
corrupted the file before.

Verify all three properties afterwards — count, duplicates, and existence:

```bash
cd connect-four && node -e '
const s=require("./package.json").scripts, fs=require("fs");
for (const k of ["test","test:fast","test:dom"]) {
  const t=s[k].split(/\s+/).filter(x=>/\.(m?jsx?)$/.test(x));      // paths, not flags
  const dupes=t.filter((x,i)=>t.indexOf(x)!==i);
  const missing=t.filter(f=>!fs.existsSync(f));
  console.log(k, t.length, "| dupes:", dupes.join(" ")||"none", "| MISSING:", missing.join(" ")||"none");
}'
```

Match paths by **extension, not by `.test.`** — `tests/test_explain_parity.js` is a real
registered test that a `\.test\.` regex silently ignores, so such a regex would report "clean"
after the merge dropped it. (`test:dom`'s count includes `./tests/dom/setup.js`, the
`--import` argument — expected.)

**MISSING must be empty.** `node --test` given a *list* silently skips a non-existent path:
exit 0, no warning, `fail 0`. Measured and documented at
`docs/architecture/testing-conventions.md:176-187`.

### `docs/open_issues.md` — duplicate `OI-N` that git will not catch

Where two lanes' insertions are adjacent, git conflicts. Where they are not, **git takes both
sides and you end up with two OI-81s.** Always check:

```bash
grep -ao '^## OI-[0-9]*' docs/open_issues.md | sort -V | uniq -d   # must be empty
```

Resolution rule:
1. Keep the numbers of whichever lane is referenced by **more** other entries — renumbering a
   lane whose own later entries cite its earlier ones cascades.
2. Renumber the other lane's entries to the next free block, preserving their relative order.
3. Repoint every external reference. Both lanes use the same numbers, so a bare grep cannot
   tell you whose is whose — classify each matching line by which tree it exists in:
   ```bash
   git show "${LANE_B}:<file>"   # line present here but not in $LANE_A / $BASE ⇒ lane B's
   ```
   Ignore hits under `.claude/worktrees/` — those are the lanes' own separate checkouts.
   Watch for grep character classes in spec tasks (`^## OI-8[345]`), not just literals.
4. **Check for the same issue filed twice.** Independent lanes hitting the same repo-wide
   problem write near-identical entries. Fold the duplicate into one entry, keeping the richer
   root cause from each, rather than renumbering it into a second copy.

### `specs/index.md`, `staging_checks.md`

Union; keep each epic's section intact. Watch markdown seams — a `---` directly above a
heading renders as a setext underline, not a horizontal rule. Keep the blank line.

## 5. Resolve real code by reading both sides

Where both lanes solved the *same* problem differently, pick one mechanism whole — do not
interleave. Prefer the one the rest of the merged tree already supports (e.g. if a merged
`setup.js` declares a global, take the lane whose loader uses that global), and delete the
other lane's now-redundant code rather than leaving dead paths whose comments contradict the
live mechanism.

## 6. Verify the files git did NOT flag — the step that earns this skill

Commit the merge on the trial branch first (step 3) so there is a stable commit to diff
against; `--amend` if this finds something. For every file both lanes touched, the merge
should be exactly the union of the two changesets:

```bash
MERGE=$(git rev-parse merge-trial)
hunks(){ git diff "$1" "$2" -- "$3" | sed -n '/^@@/,$p' | grep -E '^[+-]'; }

while read -r F; do
  a=$(diff <(hunks "$LANE_A" "$MERGE" "$F") <(hunks "$BASE" "$LANE_B" "$F") >/dev/null 2>&1 && echo CLEAN || echo DIFFERS)
  b=$(diff <(hunks "$LANE_B" "$MERGE" "$F") <(hunks "$BASE" "$LANE_A" "$F") >/dev/null 2>&1 && echo CLEAN || echo DIFFERS)
  echo "$a / $b   $F"
done < /tmp/both-touched.txt
```

`CLEAN / CLEAN` ⇒ that file is the clean union of both lanes and needs no reading. Expect
`DIFFERS` only on files you deliberately hand-resolved. A residual one-line delta is usually a
blank line — look at it anyway, since blank lines matter in markdown.

Two things this formulation gets right that the obvious version does not:

- **`sed -n '/^@@/,$p'` before grepping**, not `grep -v '^[+-][+-]'`. The latter drops every
  markdown list line (`- **foo**` renders in a diff as `-- **foo**`) — 39 real content lines on
  one `open_issues.md` diff, dropped symmetrically so the check still says CLEAN. Filtering
  `^--- ` instead would eat a removed SQL comment. Printing from the first hunk header excludes
  the file headers and nothing else.
- **Name the merge commit** (`"$MERGE"`), not `git diff "$LANE_A" -- "$F"`, which compares the
  lane to your **working tree** — including the unrelated WIP step 1 told you to leave alone.

Do **not** substitute a "were all the added lines present somewhere in the file?" check —
repeated boilerplate (`.insert({`, `if (req.user) {`) makes that produce false positives and
false negatives alike.

## 7. Run the suites — against the real baseline, not zero

From `connect-four/`:

```bash
npm run test:fast    # NOT green on main — see OI-82 for the expected failing files
npm run test:dom     # disjoint from test:fast; both are required
```

- **Never run bare `npm test`** — it includes a solver test that hangs 10+ minutes.
- Judge `test:fast` against the known-red baseline and confirm the failing files are *exactly*
  the expected ones by name. Do not fix them; they are pre-existing.
- A test count **below** expectation means `package.json` lost entries. A count above it is
  normal — expected totals go stale the moment either lane adds a test, so the durable check
  is step 4's file-list union, not the assertion count. Do not hardcode counts here.
- If both lanes added tests for the same source file, confirm both appear in the run output.
  That is the cross-lane check that the merged file actually works.
- If you follow up with a browser smoke check, run `eval "$(./worktree-ports.sh)"` from the
  repo root first and never kill a server by bare port — see `worktree-conventions.md`.

## 8. Report

State explicitly:
- Which side you took for each conflict, and why
- Post-merge registry counts (the three script counts)
- The full renumbering map (old → new) and every reference repointed
- What you found in the files that auto-merged silently
- Final test numbers against the baseline
- Any untracked local files you moved aside, and where the backups are

Do not push, deploy, or write to staging/production. Merging is not deploying.
