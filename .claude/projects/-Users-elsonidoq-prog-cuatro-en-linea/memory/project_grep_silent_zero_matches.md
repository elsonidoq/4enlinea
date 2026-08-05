---
name: project_grep_silent_zero_matches
description: "Bare `grep` silently returns ZERO matches (exit 1, no error) on repo files containing multibyte chars — a negative grep result is not evidence of absence; use `grep -a`"
metadata: 
  node_type: memory
  type: project
  originSessionId: 8ed43e4a-f425-4b94-a1c8-c8ecaef77223
  modified: 2026-08-05T20:30:10.711Z
---

In Claude Code Bash sessions on this repo the shell locale is not UTF-8, so **`grep` treats any file
containing multibyte characters as binary and reports zero matches with exit 1 — no warning, no
"Binary file matches" line.** `file <path>` calls the same file `data`. `head`/`sed`/`Read` show the
text perfectly, so nothing looks wrong.

Confirmed 2026-07-29 on `connect-four/scripts/generate-tts.js` (575 lines, contains `──` box-drawing
section separators): `grep -n "synthesize" scripts/generate-tts.js` → no output; `grep -c . ` → `0`;
`grep -an "synthesize"` → 8 matches including the load-bearing `:366  const audio = await synthesize(value);`.

**Why:** a bare-grep miss reads exactly like "this symbol doesn't exist," which is the single most
scope-manufacturing claim a plan or critique can make (CLAUDE.md: "Open every negative claim"). It cost
a wrong public conclusion in this session — I told the user a verified subagent finding "doesn't hold
up" when my own grep was the thing that was broken.

**How to apply:** use `grep -a` (or `LC_ALL=en_US.UTF-8 grep`, or ripgrep) for every search in this repo,
and *always* when the result is negative and something depends on it. Before writing "X has no
occurrences of Y" into a spec, epic, or critique, re-run it with `-a`. Positive matches are trustworthy;
zero-match results are not, until re-checked. Applies to subagents too — put the warning in their prompt,
since they inherit the same shell.

**Two more shell traps in the same family (added 2026-08-03), both producing silently empty output:**

- **`grep` is aliased to `ugrep` in these sessions.** It rejects some GNU-grep invocations — notably
  `--include=*.js` (zsh globs it first, so you get `no matches found` from the *shell* before grep runs)
  and a list of files passed as a single quoted string. The symptom is an empty result or a cd-style
  error, never a usage message. Use `/usr/bin/grep` explicitly for anything with `--include`, multiple
  file arguments, or a `for` loop over a file list.
- **`node --test` summary lines begin with a multibyte `ℹ`, not `#`.** The natural
  `grep -E "^# (tests|pass|fail)"` therefore returns **nothing at all** — no counts — which reads as
  "the suite printed nothing" or "it hung". Match `^ℹ (tests|pass|fail)` with `-a`, or just
  `fail [0-9]+`. This is how a healthy 1688-test run can look like a broken one.

**A third, dumber one that cost more than either (2026-08-03): `| head` turns a complete listing into a
false negative.** `git ls-files | /usr/bin/grep -i "staging_checks\|deploy" | head` showed 10 lines
ending in `specs/031-.../spec.md`; I read that as exhaustive and concluded `staging_checks.md` was
untracked. It is the **11th** line — the pattern sorts last. That single truncated pipe produced a wrong
memory, a wrong line in an epic file, and a wrong claim to the user, all asserting a negative. **Never
end a command whose output backs a negative claim with `head`** — use `| wc -l` first, or `-c`, or let it
print. If you must cap it, say "showing first N" in your own reasoning and re-run uncapped before writing
the conclusion anywhere. Same rule as CLAUDE.md's "all N instances, not a sample of 3", applied to your
own shell pipeline rather than to the code.

**Two more, found 2026-08-04 while verifying a three-lane merge. Both produce a confident WRONG answer,
not an empty one — which is worse:**

- **`diff` also treats multibyte files as binary.** `diff /tmp/a.md docs/open_issues.md` printed
  `Binary files … differ` — one line, no hunks. A wrapper counting `^>` / `^<` therefore reported
  **"+0 / +0"**, i.e. "effectively identical", when the true answer (`diff -a`) was **448 differing
  lines**. On that false reading I nearly merged a stale doc over a newer one. Use `diff -a` for
  anything under `docs/` or `src/i18n/`, and never trust a zero from a line-counting wrapper until you
  have seen actual hunks.
- **zsh eats the `:c` in `git show "$VAR:connect-four/…"`.** `"$M:connect-four/x.js"` becomes
  `ea66538onnect-four/x.js` and git errors `ambiguous argument`. Harmless *if you see the error* — but
  inside a probe loop with `2>/dev/null` it is a silent **false negative**: I printed `*** MISSING ***`
  for all seven symbols of a merge I had already verified was complete, and briefly told the user
  content was lost. **Always brace `"${VAR}:path"`**, and never `2>/dev/null` a command whose empty
  output you are about to read as evidence of absence. The `merging-parallel-lanes` skill documents the
  brace rule; I had read it minutes earlier and still hit it, because the failure surfaced as a
  *finding* rather than as a syntax error.

Related: [[feedback_verify_at_the_source_layer]] — this is that rule's failure mode at the *tool* layer:
the grep output is a representation of the file, and it lied. Same family:
[[project_dom_test_hang_diagnosis]] (`ps` lying about which process is burning the CPU).
