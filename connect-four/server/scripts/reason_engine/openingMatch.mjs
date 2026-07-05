/**
 * KB-driven opening-line prefix matcher (Task B1, opening-theory PART B).
 *
 * Parses the worked-example movestrings out of the named Allen central-column /
 * first-row opening KB entries (docs/knowledge-base/allen-*.md) and offers a
 * pure (no solver) prefix matcher: given a movestring, which book opening(s)
 * is it consistent with, and — if unambiguous — what is the book's next move?
 *
 * PURE MODULE: no c4solver calls here. Downstream (Task B2) solver-verifies
 * that the book move is actually best before attaching it to the reason vector.
 *
 * Coordinates: 0-indexed columns 0..6. Mirror reflection is `col -> 6 - col`
 * (per CLAUDE.md / reason-INVARIANTS I10).
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// connect-four/server/scripts/reason_engine -> repo root -> docs/knowledge-base
const KB_DIR = join(__dirname, '../../../../docs/knowledge-base');

const CENTRAL_COLUMN_FAMILY = 'central-column opening';
const FIRST_ROW_FAMILY = 'first-row opening';

// The five KB entries that define concrete, book-move opening LINES (as
// opposed to allen-opening-principles / allen-opening-tables, which are
// general heuristics/lookup tables that illustrate these lines but do not
// themselves define named continuations to match against).
const OPENING_ENTRIES = [
  { file: 'allen-5-4-opening.md', id: 'allen-5-4-opening', family: CENTRAL_COLUMN_FAMILY },
  { file: 'allen-3-4-opening.md', id: 'allen-3-4-opening', family: CENTRAL_COLUMN_FAMILY },
  { file: 'allen-d3-d4-opening.md', id: 'allen-d3-d4-opening', family: CENTRAL_COLUMN_FAMILY },
  { file: 'allen-candlesticks-opening.md', id: 'allen-candlesticks-opening', family: CENTRAL_COLUMN_FAMILY },
  { file: 'allen-third-row-gambit.md', id: 'allen-third-row-gambit', family: FIRST_ROW_FAMILY },
];

let _cache = null;

/**
 * Extracts the lines belonging to a top-level YAML frontmatter key (e.g.
 * `worked_examples:`) — from the key's own line up to (but not including)
 * the next top-level key (a line starting in column 0 with a bare
 * `word:` — no leading whitespace). Returns [] if the key is absent.
 *
 * This mirrors the hand-rolled frontmatter field extraction already used
 * for `statement`/`short_summary` in llmCoachHelpers.js — no YAML parser
 * dependency, just enough structure-awareness for this KB's consistent
 * indentation.
 */
function extractTopLevelSection(frontmatter, key) {
  const lines = frontmatter.split('\n');
  const startIdx = lines.findIndex((l) => new RegExp(`^${key}:`).test(l));
  if (startIdx === -1) return [];
  const section = [];
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^[A-Za-z_]/.test(line)) break; // next top-level key
    section.push(line);
  }
  return section;
}

/** Pulls every `movestring: "..."` value out of a worked_examples block. */
function extractMovestrings(sectionLines) {
  const out = [];
  for (const line of sectionLines) {
    const m = line.match(/^\s*-?\s*movestring:\s*"([0-6]*)"/);
    if (m) out.push(m[1]);
  }
  return out;
}

/** Parses a digit movestring ("3332223") into an array of 0-indexed column ints. */
function parseMoves(movestring) {
  if (!movestring) return [];
  return Array.from(movestring, (ch) => Number(ch));
}

function mirrorMoves(moves) {
  return moves.map((c) => 6 - c);
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Loads and caches the KB opening-line index.
 *
 * Returns `[{ id, family, moves: number[], beneficiary: 1 }]` — one entry per
 * worked_examples movestring across the five named Allen opening KB entries.
 * The same `id` may appear multiple times (an opening entry documents several
 * worked-example depths/continuations of the same line); callers dedupe ids
 * as needed. All entries are first-player (beneficiary 1) wins — every
 * worked example across the five KB files is a first-player win.
 */
export function loadOpeningLines() {
  if (_cache) return _cache;

  const lines = [];
  for (const entry of OPENING_ENTRIES) {
    const path = join(KB_DIR, entry.file);
    const text = readFileSync(path, 'utf8');
    const fmMatch = text.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) {
      throw new Error(`openingMatch: no YAML frontmatter found in ${entry.file}`);
    }
    const frontmatter = fmMatch[1];
    const workedExamplesSection = extractTopLevelSection(frontmatter, 'worked_examples');
    const movestrings = extractMovestrings(workedExamplesSection);
    if (movestrings.length === 0) {
      throw new Error(`openingMatch: no worked_examples movestrings parsed from ${entry.file}`);
    }
    for (const ms of movestrings) {
      lines.push({
        id: entry.id,
        family: entry.family,
        moves: parseMoves(ms),
        beneficiary: 1,
      });
    }
  }

  _cache = lines;
  return _cache;
}

/**
 * Matches a movestring against the KB opening-line index.
 *
 * Mirror-normalizes (reflects columns about 3, i.e. `col -> 6 - col`) before
 * matching: a movestring matches a line if it equals the line's first
 * `movestring.length` plies, OR its column-reflection does.
 *
 * Returns `null` if the movestring is not a prefix (direct or mirrored) of
 * any known opening line. Otherwise returns:
 *   - `ids`: every line id the movestring is consistent with (deduped).
 *   - `family`: the shared family name if every consistent line belongs to
 *     the same family, else `null`.
 *   - `bookNextCol`: the next 0-indexed column the consistent lines agree on
 *     (mirrored back into the input's own orientation where the match was
 *     via reflection). A matched line the input EXACTLY consumes carries no
 *     next-ply opinion and abstains; `bookNextCol` is `null` only when no
 *     matched line has a further recorded ply, or the lines that do disagree
 *     on the column. NOTE: this module is pure — it reports what the KB says,
 *     not that the move is solver-best; Task B2 does that verification.
 *   - `matchedPrefixLen`: the number of plies matched (= movestring length).
 */
export function matchOpeningPrefix(movestring) {
  const input = parseMoves(movestring);
  const mirrored = mirrorMoves(input);
  const L = input.length;

  const lines = loadOpeningLines();
  const matches = [];
  for (const line of lines) {
    if (line.moves.length < L) continue;
    const prefix = line.moves.slice(0, L);
    if (arraysEqual(prefix, input)) {
      matches.push({ line, orientation: 'direct' });
    } else if (arraysEqual(prefix, mirrored)) {
      matches.push({ line, orientation: 'mirror' });
    }
  }

  if (matches.length === 0) return null;

  const ids = [...new Set(matches.map((m) => m.line.id))];

  const families = new Set(matches.map((m) => m.line.family));
  const family = families.size === 1 ? [...families][0] : null;

  // A matched line that the input exactly consumes (moves.length === L) carries
  // no opinion about the NEXT ply, so it ABSTAINS from the consensus rather than
  // forcing null. This is the normal KB shape: a short stem worked-example plus a
  // deeper continuation of the SAME opening — the stem is consumed, the deeper
  // line supplies the book's next move. bookNextCol is:
  //   (a) null if NO matched line has a next ply (no known book continuation);
  //   (b) null if the lines that DO have a next ply disagree on the column;
  //   (c) that column if they all agree.
  let bookNextCol = null;
  const nextCols = new Set();
  for (const m of matches) {
    if (m.line.moves.length === L) continue; // consumed line abstains
    const rawNext = m.line.moves[L];
    const reported = m.orientation === 'mirror' ? 6 - rawNext : rawNext;
    nextCols.add(reported);
  }
  if (nextCols.size === 1) {
    bookNextCol = [...nextCols][0];
  }

  return { ids, family, bookNextCol, matchedPrefixLen: L };
}
