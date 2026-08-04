// FR-019a (spec 057, owner directive 2026-08-03): "there must be exactly ONE piece of code
// in the repository that decides whether a move is 'blunder' or 'suboptimal'." Two rules that
// happen to agree are still two criteria and will drift again — so this test does not check
// that two paths currently agree (a reconciliation test); it structurally scans production
// source for every place a `'blunder'`/`'suboptimal'` string literal is EMITTED (assigned,
// returned, or defaulted) and fails on any emitter not on the explicit allowlist below. A new
// emitter added anywhere else fails this test by default.
//
// Why a source scan and not a call-graph/type check: FR-019a item 8 retracts an earlier,
// narrower bar ("no module other than moveQualityScorer.js maps a (bestScore, playedScore)
// pair to a quality") — three of the eight real producers (insertGameBlunder's old coercion,
// index.js's old `?? 'blunder'` fallback, and the ChallengeScreen/useGameBoard sites) take no
// solver scores at all, so a scores-keyed test would have passed while several criteria
// remained in the tree.
//
// COVERAGE, HONESTLY STATED (corrected 2026-08-04 — see docs/architecture header note for a
// prior draft that overclaimed "anywhere else"): the scan matches three assignment/default
// shapes (P1-P3 below) PLUS return-statement emission (P4), across `.js`/`.jsx`/`.mjs` files
// under `server/` and `src/`, EXCLUDING `SKIP_DIRS` (`migrations`, `scripts`, `tests`,
// `node_modules`). `scripts/` stays excluded deliberately, not by oversight: it is one-off
// tooling, not the served/stored game-move label path, and it uses the SAME
// `'blunder'`/`'suboptimal'` vocabulary for unrelated domains (e.g.
// `server/scripts/select_boards.mjs`'s `wantLow ? 'low' : 'blunder'` names a coverage-sampling
// BUCKET, not a graded move quality — widening the scan into `scripts/` would require
// allowlisting sites like that one for a reason unrelated to FR-019a). A comment-only mention
// of the literal (no assignment/return) is still excluded, since the scan targets emitted
// VALUES, not prose.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Directories to skip entirely: tests, DDL, and one-off scripts are not the served/stored
// game-move label path.
const SKIP_DIRS = new Set(['migrations', 'scripts', 'tests', 'node_modules']);

function walk(dir, out) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(path.join(dir, entry.name), out);
    } else if (/\.(js|jsx|mjs)$/.test(entry.name) && !entry.name.includes('.test.')) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

function scanFiles() {
  const files = [
    ...walk(path.join(ROOT, 'server'), []),
    ...walk(path.join(ROOT, 'src'), []),
  ];

  // Value-producing shapes for the literal, deliberately excluding `===`/`!==` comparisons
  // (a negative lookbehind rejects an operator preceded by `=` or `!`, which rules out the
  // 2nd/3rd char of `==`/`===`/`!=`/`!==`):
  //   P1  `quality: 'blunder'` / `quality = 'blunder'` / a ternary's `: 'blunder'` alternate
  //   P2  `?? 'blunder'` — nullish-default emission
  //   P3  `? 'blunder' :` — a ternary's consequent branch
  //   P4  `return 'blunder'` — direct return-statement emission
  const P1 = /(?<![=!])[:=](?!=)\s*['"](blunder|suboptimal)['"]/;
  const P2 = /\?\?\s*['"](blunder|suboptimal)['"]/;
  const P3 = /\?\s*['"](blunder|suboptimal)['"]\s*:/;
  const P4 = /\breturn\s+['"](blunder|suboptimal)['"]/;

  const matches = [];
  for (const file of files) {
    const rel = path.relative(ROOT, file);
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      const trimmed = line.trim();
      // Skip comments — the scan targets emitted VALUES, not prose describing them.
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
      if (P1.test(line) || P2.test(line) || P3.test(line) || P4.test(line)) {
        matches.push({ file: rel, line: i + 1, content: trimmed });
      }
    });
  }
  return matches;
}

// Explicit allowlist. Every entry carries an inline reason so the exemption is
// self-documenting from the test itself, not just from docs elsewhere.
//
// Keyed by (file, exact trimmed line content) rather than (file, line number): per CLAUDE.md
// "Line numbers drift; symbol names don't" — a line-number key means inserting one line above
// any of these fails the test with a spurious "stale allowlist" error despite no real emitter
// having moved. Content is scoped per-file, so two allowlisted lines in the same file sharing
// identical content (e.g. moveQualityScorer.js's two `quality = 'blunder';` assignments in
// its two branches) collapse into one exemption — that's fine, both are the sole grader.
const ALLOWLIST = [
  // 1. The sole game-move grader (FR-019a item 1). Everything else in the repo that used to
  //    grade — classifyStoredMistake's `>4` threshold, insertGameBlunder's write-seam
  //    coercion, index.js's `?? 'blunder'` serve-seam fallback — was deleted in this change.
  { file: 'server/moveQualityScorer.js', content: "quality = 'blunder';", reason: 'the sole game-move grader (FR-019a item 1)' },
  { file: 'server/moveQualityScorer.js', content: "quality = 'suboptimal';", reason: 'the sole game-move grader (FR-019a item 1)' },

  // 2. Puzzle-answer domain (owner scope ruling 2026-08-03, "game moves only — but NAME the
  //    boundary"): grades a forbidden_columns puzzle ANSWER by set-selection accuracy, no
  //    solver scores — a different question, deliberately not unified. Documented in
  //    docs/architecture/db-schema.md (T056).
  { file: 'src/screens/ChallengeScreen.jsx', content: "const quality = allCorrect ? 'optimal' : noFalsePositives ? 'suboptimal' : 'blunder';", reason: 'puzzle-answer grading (different domain, no solver scores) — see db-schema.md T056 note' },

  // 3. Spec-049/Epic-9 accepted-gate display override + session-results fallback. Overrides
  //    the SERVER's label for display only, never writes a `blunders` row. Recorded as
  //    deliberately-not-fixed in docs/open_issues.md OI-134.
  { file: 'src/screens/ChallengeScreen.jsx', content: "? { ...data, quality: 'blunder', badge: 'bad', summaryLineKey: pickSummaryKeyOrNull('blunder') ?? data.summaryLineKey }", reason: 'accepted-gate display override, client-side only — see open_issues.md OI-134' },
  { file: 'src/screens/ChallengeScreen.jsx', content: "const coachQuality = acceptedPromoted ? 'optimal' : acceptedDemoted ? 'blunder' : (data.quality ?? 'blunder');", reason: 'accepted-gate display override, client-side only — see open_issues.md OI-134' },
  { file: 'src/screens/ChallengeScreen.jsx', content: "quality: evaluation?.quality ?? 'blunder',", reason: 'session-results fallback feeding PostSetSummaryScreen, client-side only — see open_issues.md OI-134' },

  // 4. Builds an i18n phrase-pool KEY (a string used to look up a translation), never a
  //    stored or served `quality` value.
  { file: 'src/lib/useGameBoard.js', content: "coachKey = trackPhrase(pickRandomKey(t, `coach.spoken.generic.${data.quality ?? 'blunder'}`, used));", reason: 'builds an i18n phrase-pool KEY, never a stored or served quality value' },
];

test('exactly one criterion grades the game-move quality label — every other emitter is allowlisted with a reason (FR-019a)', () => {
  const found = scanFiles();
  const allowedKey = (m) => `${m.file}::${m.content}`;
  const allowedSet = new Set(ALLOWLIST.map(allowedKey));

  const unlisted = found.filter((m) => !allowedSet.has(allowedKey(m)));
  assert.deepEqual(
    unlisted,
    [],
    `New 'blunder'/'suboptimal' emitter(s) found outside the allowlist — FR-019a requires ` +
      `exactly one grader (server/moveQualityScorer.js). Either this is a real regression ` +
      `(delete it / route it through scoreMove) or it is a legitimate new exemption that must ` +
      `be added to ALLOWLIST with an inline reason:\n` +
      JSON.stringify(unlisted, null, 2)
  );

  // The inverse check: every allowlist entry must still match something real, or it is stale
  // (e.g. the line's content changed / the code was deleted) and should be removed or corrected.
  const foundSet = new Set(found.map(allowedKey));
  const stale = ALLOWLIST.filter((e) => !foundSet.has(`${e.file}::${e.content}`));
  assert.deepEqual(
    stale,
    [],
    `Stale allowlist entries (no longer match any emitter — update the content or remove):\n` +
      JSON.stringify(stale, null, 2)
  );
});
