// Staged render object between the narrator vector and the prompt text (spec §3c).
// Phase 1: faithful passthrough — classify link, assert completeness, draw an untagged board.
// P2 adds tags/grounding; P3 adds rich causal-frame text.

import { pruneVector } from './reasonNarratorVector.mjs';
import { classifyCausalLink, denialCell, TAG_PHRASE } from './reason_engine/causalLinks.mjs';
import { dispositionOf, assertCoverage, leafPaths } from './fieldDisposition.mjs';
import { selectBoards, renderThreatList, patternOnAfterBestBoard, boardSelectionDecisions } from './reasonBoardSelect.mjs';
import { groundCell, horizonForRegister } from './reasonCellGrounding.mjs';
import { parseBoardState } from '../classifier.js';
import { composeOpeningFrame, centralityQualitative } from './reason_engine/openingFrame.mjs';
import { buildAnnotationOffer, forkPivotCell } from './reason_engine/zoneAnnotations.mjs';

// The pruned vector minus fields the board carries (transformed) or statically excluded.
// Path-precise: recurse into plain-object containers; classify arrays/primitives by their own path;
// drop 'transformed'/'exclude', keep 'render' and (in P1, unapplied) 'causal-code'. Prune empties.
// For object arrays (e.g., window = [{cell, status, ...}]), recurse into each element and prune
// transformed/excluded subfields element-wise, mirroring leafPaths' element-leaf enumeration.
function renderedFields(prunedFv, firedCovers = []) {
  const covered = new Set(firedCovers);
  const keep = (path) => {
    const d = dispositionOf(path);
    if (d === 'transformed' || d === 'exclude') return false;
    if (d === 'causal-code' && covered.has(path)) return false;   // hidden — the frame restates it
    return true;                                                   // render + uncovered causal-code
  };
  function pruneArray(arr, prefix) {
    return arr.map((el) => (el !== null && typeof el === 'object' && !Array.isArray(el))
      ? prune(el, prefix + '[]')
      : el);
  }
  function prune(node, prefix) {
    if (node === null || typeof node !== 'object' || Array.isArray(node)) return node;
    const copy = {};
    for (const [key, val] of Object.entries(node)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (Array.isArray(val)) {
        if (val.length && val[0] !== null && typeof val[0] === 'object') {
          copy[key] = pruneArray(val, path);
        } else if (keep(path)) {
          copy[key] = val;
        }
      } else if (val !== null && typeof val === 'object') {
        const child = prune(val, path);
        if (Object.keys(child).length) copy[key] = child;
      } else if (keep(path)) {
        copy[key] = val;
      }
    }
    return copy;
  }
  return prune(prunedFv, '');
}

// Fix A: the canonical, board-anchored, schema-shaped Decision block that leads the grounded prompt.
// bestCol/playedCol are 0-indexed internally; here they become 1-indexed DISPLAY columns + landing
// cells (from movestring + col), and best/played outcomes come from `case` — never from a solver score
// (D21). This is the single authoritative statement of which move is best vs played and where each
// lands; the raw 0-indexed leaves are withheld from the JSON residue (fieldDisposition: transformed).
const CASE_OUTCOMES = {
  win_to_draw: ['win', 'draw'],
  win_to_lose: ['win', 'loss'],
  draw_to_lose: ['draw', 'loss'],
  lose_to_faster_lose: ['loss', 'loss'],   // both lose; played loses faster
};

// 1-indexed landing cell for dropping into `col` on `movestring`; null on a null/full column.
function landingCell(movestring, col) {
  if (col == null) return null;
  const { colHeights } = parseBoardState(movestring ?? '');
  const row = colHeights[col];
  if (row == null || row >= 6) return null;
  return `c${col + 1}r${row + 1}`;
}

function buildDecision(pruned) {
  const [bestOutcome, playedOutcome] = CASE_OUTCOMES[pruned.case] ?? [null, null];
  return {
    you: pruned.player,
    bestCol: pruned.bestCol, playedCol: pruned.playedCol,
    bestCell: landingCell(pruned.movestring, pruned.bestCol),
    playedCell: landingCell(pruned.movestring, pruned.playedCol),
    bestOutcome, playedOutcome,
  };
}

// A half's POINT geometry (D45). Normally the load-bearing cell, `denialCell(h)`. But a
// double_threat half's load-bearing geometry is TWO squares, not one — requiring only its
// completingCell leaves the other fork square dark and a `[term:double_threat]` (which highlights
// nothing at all) pointing into the void. `buildAnnotationOffer`'s deep-fork family already offers
// exactly this spec as `<owner>-future-fork`; on match failure the caller falls back to the cell.
function halfForkCellsSpec(h) {
  if (!h || h.tacticTag !== 'double_threat' || (h.forkCells?.length ?? 0) < 2) return null;
  return 'windows:' + h.forkCells.join(',');
}

// A half's LINE geometry (D45). A double_threat half's story is TWO lines, and the combined
// `windows:A|B` fork-lines alias is the only offered handle that shows both — its single `window`
// is just one of them. Everything else uses the half's own `window`.
function halfLineSpec(h) {
  if (!h) return null;
  if (h.tacticTag === 'double_threat' && (h.forkWindows?.length ?? 0) >= 2) {
    return 'windows:' + h.forkWindows.map((w) => w.join(',')).join('|');
  }
  if (Array.isArray(h.window) && h.window.length) return 'windows:' + h.window.join(',');
  return null;
}

// The required set (spec 058, US2 — Derivation Rule, spec.md, as amended by D45). For each of
// pruned.lostResource / pruned.opponentPunishment, the load-bearing cell (if any) is
// denialCell(half) — the same `h?.cell ?? h?.completingCell ?? null` precedence causalLinks.mjs's
// own denialCell() uses. A half with neither a cell nor a line yields NO required group — it is not
// forced into one (FR-006). Each derived cell/window is then matched to an offered handle by EXACT
// spec-string equality against zones.aliases[].spec (D2, normalized for the `future:` decorator per
// D43) — never a freshly-derived spec format. On match failure the group is dropped (FR-004) rather
// than left unenforceable. Capped at 1-3 groups, in FR-005's own composition: one per half that
// resolves to a cell, PLUS at most one line/window.
//
// D45 changes ONE thing: the line is no longer only a fallback for a half with no cell. Before, the
// derived spec was `denialCell(h) ?? window`, and because virtually every half carries a
// completingCell the `windows:` branch was effectively dead — the line was offered but never
// required. Measured: ZERO `windows:` specs emitted across 12 real board-runs (3 runs x 4 boards)
// while the correct line handle sat unused in the offer set, under prompt steering alone. Now the
// cells are derived first (both halves), then ONE line slot is filled, preferring lostResource —
// the resource the player gave up, which is what every "what is the key/long four-in-a-row line?"
// piece of feedback was asking about — and falling through to opponentPunishment when lostResource
// offers no matching line. See reason-DECISIONS.md D45 for the reversal recipe.
export function deriveRequiredSet(pruned, zones) {
  // Index by the UNPREFIXED spec (D43). `future:` is a render-framing decorator, not part of the
  // geometry: zoneParser's isValidSpec/expandSpec, annotationGate's checkP5Strong, reasonRenderGuard's
  // toAllowedSet and the client's annotatedText all strip it before matching, and so does this index.
  // The Derivation Rule's substance is untouched — the derived spec is still denialCell(h) or
  // h.window, and the matched alias is still an OFFERED alias (required ⊆ offered, FR-004). Without
  // this, every deep half's cell derived to a plain cNrM that only existed as future:cNrM, so three
  // of the four spec-058 feedback boards had an empty required set (OI-171).
  const unprefix = (s) => (s.startsWith('future:') ? s.slice('future:'.length) : s);
  const aliasBySpec = new Map((zones?.aliases ?? []).map((a) => [unprefix(a.spec), a]));
  const groups = [];
  // Both halves routinely resolve to the SAME offered alias (measured: 9 of the 16 non-empty
  // requiredSets over the 29-record coverage corpus, e.g. eval-4 -> c5r4 from both halves). The
  // required set is "the subset of the offered handle set" (spec.md, Key Entities) — a subset has
  // no duplicates. Emitting the group twice would print the identical `- [zone:h] = role` line
  // twice in assembleGroundedPrompt's required block and burn one of FR-005's slots on nothing.
  const push = (half, spec) => {
    if (!spec) return false;                          // abstain, do not invent (FR-006)
    const alias = aliasBySpec.get(spec);
    if (!alias) return false;                         // match failure — drop, required ⊆ offered (FR-004)
    if (groups.some((g) => g.spec === alias.spec)) return false;
    groups.push({ half, spec: alias.spec, handle: alias.handle, role: alias.role });
    return true;
  };
  const HALVES = ['lostResource', 'opponentPunishment'];
  for (const half of HALVES) {
    const h = pruned?.[half];
    if (!push(half, halfForkCellsSpec(h))) push(half, denialCell(h));
  }
  // The fork pivot earns a slot when the half is a fork: naming both endpoints without the move that
  // creates them is the A7c failure (OI-182) — the endpoints are the effect, the pivot is the cause.
  for (const half of HALVES) {
    if (groups.length >= 3) break;
    push(half, forkPivotCell(pruned?.[half]));
  }
  // The single line/window slot (FR-005: "plus at most one line/window"), lostResource first.
  for (const half of HALVES) {
    if (groups.length >= 3) break;
    if (push(half, halfLineSpec(pruned?.[half]))) break;
  }
  return groups.slice(0, 3);
}

export function buildReasonRenderModel(nv) {
  const pruned = pruneVector(nv);
  const ctx = pruned.direction === 'enabled_opponent'
    ? { patternOnAfterBestBoard: patternOnAfterBestBoard(pruned) } : {};
  const link = classifyCausalLink(pruned, ctx);
  assertCoverage(pruned, link.covers);

  const openingFrame = composeOpeningFrame(pruned);
  if (openingFrame) {
    // The opening IS the teachable frame, but it is no longer a REPLACEMENT for the causal one:
    // printing only the opening frame kept link.text — and every cell it names — out of the prompt
    // entirely (verified: eval-12's c2r5 appeared nowhere), so the model could not name the reason
    // even when the engine had it. Both frames print; the deep geometry is offered under the
    // `future:` decorator so it reads as "matters later", never as a present threat.
    const allBoards = boardSelectionDecisions(pruned);
    const zones = buildAnnotationOffer(pruned, allBoards);
    return {
      perspective: { you: pruned.player, opponent: pruned.opponent },
      decision: buildDecision(pruned),
      link,
      frames: [
        { id: openingFrame.id, confidence: openingFrame.confidence, text: openingFrame.text,
          covers: openingFrame.covers, guardrail: openingFrame.guardrail },
        { id: link.id, confidence: link.confidence, text: link.text,
          covers: link.covers, guardrail: link.guardrail },
      ],
      boards: selectBoards(pruned),
      zones,
      requiredSet: deriveRequiredSet(pruned, zones),
      rendered: renderedFields(pruned, link.covers),
      openingReadingKey: OPENING_READING_KEY,
      coverage: { ok: true, unowned: [] },
    };
  }

  const allBoards = boardSelectionDecisions(pruned);
  const zones = buildAnnotationOffer(pruned, allBoards);
  return {
    perspective: { you: pruned.player, opponent: pruned.opponent },
    decision: buildDecision(pruned),
    link,
    frames: [{ id: link.id, confidence: link.confidence, text: link.text, covers: link.covers, guardrail: link.guardrail }],
    boards: selectBoards(pruned),
    zones,
    requiredSet: deriveRequiredSet(pruned, zones),
    rendered: renderedFields(pruned, link.covers),
    coverage: { ok: true, unowned: [] },
  };
}

// The engine's own decisive line for cell grounding (G4): the winning half's finalMovestring when
// the lostResource is a winning line; otherwise the opponent's realized line. Never an alternate PV.
function decisiveFinalMovestring(fv) {
  const lr = fv.lostResource, op = fv.opponentPunishment;
  if (lr?.kind === 'winning_line' && lr.finalMovestring) return lr.finalMovestring;
  if (op?.finalMovestring) return op.finalMovestring;
  return lr?.finalMovestring ?? null;
}

// Partition every PRESENT leaf path into rendered | covered | excluded (spec §3f), from the grader's
// "what did the model see" viewpoint: exclude → excluded; covered causal-code → covered; everything else
// → rendered. NOTE: unlike renderedFields' keep() (which DROPS `transformed` from the JSON residue),
// `transformed` fields are shown to the model via the board, so here they count as rendered (not excluded)
// — the distinction that matters for the G2 over-removal audit is shown-anywhere vs. hidden.
function fieldPartition(pruned, covers) {
  const covered = new Set(covers);
  const out = { rendered: [], covered: [], excluded: [] };
  for (const path of leafPaths(pruned)) {
    const d = dispositionOf(path);
    if (d === 'exclude') out.excluded.push(path);
    else if (d === 'causal-code' && covered.has(path)) out.covered.push(path);
    else out.rendered.push(path);
  }
  return out;
}

// Ground the load-bearing resource cell (status/horizon/reachableInPlies) against the decisive line.
function groundResource(pruned) {
  const half = pruned.lostResource?.kind === 'winning_line' ? pruned.lostResource
    : (pruned.opponentPunishment?.completingCell ? pruned.opponentPunishment : pruned.lostResource);
  const cell = half?.completingCell;
  if (!cell) return null;
  const { board, colHeights } = parseBoardState(pruned.movestring ?? '');
  const grounded = groundCell(cell, {
    board, colHeights, finalMovestring: decisiveFinalMovestring(pruned),
    register: half.register, role: 'where the load-bearing resource completes',
    perspectivePlayer: pruned.player,
  });
  return { completingCell: grounded,
           registerToHorizon: { register: half.register ?? null, horizon: horizonForRegister(half.register) } };
}

// The complete render-layer decision set the grader consumes as ground truth (spec §3f). Derived
// PURELY from the render helpers — no engine call. Reuses the same classify+assert path as
// buildReasonRenderModel so routing is identical.
export function buildRenderDecision(nv) {
  const pruned = pruneVector(nv);
  const ctx = pruned.direction === 'enabled_opponent'
    ? { patternOnAfterBestBoard: patternOnAfterBestBoard(pruned) } : {};
  const link = classifyCausalLink(pruned, ctx);
  assertCoverage(pruned, link.covers);
  const openingFrame = composeOpeningFrame(pruned);
  // Mirrors buildReasonRenderModel's opening branch (Task 6, spec 058): the prompt no longer
  // suppresses half-geometry aliases on an opening record, so render_decision.zones must not either —
  // postprocessAnswer validates the model's answer against THIS object, not the prompt's. Filed as
  // OI-186 for full unification (buildRenderDecision should consume buildReasonRenderModel instead of
  // recomputing); this line is the interim single-source fix.
  const zones = buildAnnotationOffer(pruned, boardSelectionDecisions(pruned));

  let openingContext = null;
  if (openingFrame) {
    const oc = pruned.openingContext;
    const variant = oc.namedOpening ?? oc.defense ?? oc.centrality;
    const bCell = landingCell(pruned.movestring, pruned.bestCol);
    const pCell = landingCell(pruned.movestring, pruned.playedCol);
    const bRow0 = bCell ? Number(bCell.match(/r(\d+)/)[1]) - 1 : null;
    const half = horizonHalf(pruned);
    openingContext = {
      kind: openingFrame.kind,
      frameId: openingFrame.id,
      lead: {
        id: variant.id ?? null,
        family: variant.family ?? null,
        matchedPrefixLen: variant.matchedPrefixLen ?? null,
        bookCol: oc.namedOpening ? oc.namedOpening.bookNextCol + 1 : null,
        holdCol: oc.defense ? oc.defense.bestDefenseCol + 1 : null,
      },
      centralityComparison: {
        player: pruned.player, betterCell: bCell, playedCell: pCell,
        qualitative: centralityQualitative(pruned),
      },
      parityFavor: bRow0 == null ? null : {
        betterCellRowParity: bRow0 % 2 === 0 ? 'odd' : 'even',   // display parity of the better cell's row
        favorsMover: pruned.player === 1 ? bRow0 % 2 === 0 : bRow0 % 2 === 1,
      },
      deepResourceGrounded: false,
      horizon: { register: half?.register ?? null, pliesToEnd: half?.pliesToEnd ?? null },
    };
  }

  return {
    case: pruned.case ?? null,
    route: pruned.route === 'realized_denied' ? 'realized_denied' : 'sign',
    direction: pruned.direction ?? null,
    patternOnAfterBestBoard: pruned.direction === 'enabled_opponent' ? ctx.patternOnAfterBestBoard : null,
    link: { id: link.id, confidence: link.confidence, covers: link.covers,
            guardrail: link.guardrail, text: link.text },
    boards: boardSelectionDecisions(pruned).map(({ id, shown, reason }) => ({ id, shown, reason })),
    resource: groundResource(pruned),
    fieldPartition: fieldPartition(pruned, link.covers),
    finalMovestring: decisiveFinalMovestring(pruned),
    openingContext,
    zones: { aliases: zones.aliases, terms: zones.terms },
    requiredSet: deriveRequiredSet(pruned, zones),
  };
}

const READING_KEY = `# Reading key (the few coded fields shown below)
- register: how far off the result is — "immediate" (now), "forced_sequence" (a deep forced line), "parity" (a deep zugzwang/parity battle).
- pliesToEnd: plies until the line finishes, when known.
- controllingGroup / parityAttribution: the group of four squares whose parity decides a deep win.
- ownDiscs: how many of your discs already sit on the winning group.
- replyHistogram.afterBest / afterPlayed: how many ways your opponent still has to hold the result after each move — fewer means the tougher, more resilient defense.
- "deep on a forced line" / "deep, via a parity battle": the winning square is many plies away and EMPTY now — not a current threat.
- Cells are cNrM: column then row, 1-indexed (c1r1 = bottom-left).
- Every column number shown anywhere in this prompt is a 1-indexed display column (column 1 = leftmost). The move columns and their landing cells are given in the Decision block above — use them verbatim; do not re-derive move→cell→role.
- These coded names are for YOUR reading only. Never repeat a field name, "histogram", "window", "completing cell", "solver", or "score" in your answer's \`mechanism\` — say it in plain Connect Four instead (threat, fork, double threat, four-in-a-row line, block, central).`;

const OPENING_READING_KEY = `# Opening reading key
- family / id: the named opening line this position is on (id absent = shared prefix, family only).
- matchedPrefixLen: how many opening plies matched the book line.
- The blunder is explained through the opening (book line, centrality, parity), NOT a deep tactical cell.
- The winning resolution is deep (many plies away) and is stated only as a horizon — there is no near-term threat cell to read.`;

// The outcome-defining half for the horizon summary.
function horizonHalf(pruned) {
  return pruned.case && pruned.case.startsWith('win_') ? pruned.lostResource : pruned.opponentPunishment;
}

// The canonical Decision block (Fix A) — leads the prompt so the model never re-derives columns/roles.
function renderDecision(d) {
  const outcome = (o) => (o ? `. Outcome: ${o}` : '');
  const move = (label, col, cell, o) =>
    `- ${label} move: column ${col == null ? '?' : col + 1}${cell ? ` (lands at ${cell})` : ''}${outcome(o)}.`;
  return [
    '# Decision (canonical — use these columns/cells verbatim; do not re-derive)',
    `- you = player ${d.you}`,
    move('Better', d.bestCol, d.bestCell, d.bestOutcome),
    move('Played', d.playedCol, d.playedCell, d.playedOutcome),
  ].join('\n');
}

// The frame (opening or L-link) may carry its own guardrail distinct from the L1-L9 classification
// guardrail (always computed, even for opening records, to feed horizon scaffolding — see
// reason-render-grounded-prompt.md §9). For non-opening records frames[0].guardrail IS
// model.link.guardrail (same value) — combining would duplicate it, so only append when distinct.
function combinedGuardrail(model) {
  const frameGuardrail = model.frames[0]?.guardrail;
  if (frameGuardrail && frameGuardrail !== model.link.guardrail) {
    return `${model.link.guardrail} ${frameGuardrail}`;
  }
  return model.link.guardrail;
}

// Task 9b (spec 058 feedback remediation). Measured over 125 graded runs (task-9b-brief.md):
// splitting on whether the assembled prompt DISPLAYS a TERM_KB slug it does not OFFER, G7b passes
// 74/90 (82%) when it does vs 35/35 (100%) when it doesn't — every G7b failure fell in the "taught
// but not offered" condition. The prompt used to print raw slugs (Tactics lines, the half-JSON
// residue, and two static worked examples) unconditionally, so the model learned vocabulary
// `zones.terms` never authorized it to use, and the pipeline stripped it back out at grading time.
//
// The fix is display-side only (never widen zones.terms — a term with no KB entry renders an empty
// glossary popup, per zoneAnnotations.mjs's TERM_KB comment on `conditional_swindle`): route every
// tactic-name display through TAG_PHRASE's canonical phrase whenever the slug is not offered this
// record, and keep the raw slug only where it IS offered (that's the whole point of offering it).
//
// TERM_KB (zoneAnnotations.mjs) is the closed set of slugs that can ever be offered; it is not
// exported (and this task must not edit that file, per the task brief — another lane may be
// committing to it concurrently), so its 4 keys are mirrored here. Keep in sync if TERM_KB's key set
// changes.
const OFFERABLE_SLUGS = ['immediate_threat', 'double_threat', 'figure_7', 'claimeven'];

// claimeven collides: TAG_PHRASE.claimeven is the literal string 'claimeven' (the phrase IS the
// slug), so routing it through TAG_PHRASE cannot change what is displayed. Measured over the full
// 63-record evidence corpus (2026-08-21): zero records display `claimeven` while it is unoffered —
// see task-9b-report.md for the script and output. The invariant below therefore stays STRICT
// (claimeven is not exempted); this comment records that the collision is live but currently
// unreached, not silently designed around.
// Replace a bare, unoffered TERM_KB slug wherever it appears as a whole word in free text (the
// Tactics lines) — never touches an OFFERED slug, and never touches slugs outside TERM_KB (e.g.
// `conditional_swindle`, which never appears as a bare board tag kind).
function redactUnofferedSlugsInText(text, offered) {
  let out = text;
  for (const slug of OFFERABLE_SLUGS) {
    if (offered.has(slug)) continue;
    out = out.replace(new RegExp(`\\b${slug}\\b`, 'g'), TAG_PHRASE[slug] ?? slug);
  }
  return out;
}

// Same substitution over the JSON residue tree (the half fields: `tag`/`tacticTag` leaves), applied
// to a fresh object so the caller's `model.rendered` is never mutated.
function redactUnofferedSlugsInTree(node, offered) {
  if (Array.isArray(node)) return node.map((el) => redactUnofferedSlugsInTree(el, offered));
  if (node !== null && typeof node === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(node)) out[k] = redactUnofferedSlugsInTree(v, offered);
    return out;
  }
  if (typeof node === 'string' && OFFERABLE_SLUGS.includes(node) && !offered.has(node)) {
    return TAG_PHRASE[node] ?? node;
  }
  return node;
}

export function assembleGroundedPrompt(model) {
  const offeredSlugs = new Set((model.zones.terms ?? []).map((t) => t.slug));
  // The two Bad/Good worked examples below (Highlightable regions + KB terms blocks) used to hardcode
  // `immediate_threat` / `double_threat` unconditionally — the largest single source of the task-9b
  // leak (49/63 corpus records), since every prompt showed these regardless of what was offered.
  // Use a slug this record ACTUALLY offers (still concrete, still legitimate) when one exists;
  // otherwise fall back to a placeholder that is not a real TERM_KB slug at all, so the syntax demo
  // survives even when no term is offered without ever tripping the "no unoffered slug" invariant.
  const exampleSlug = model.zones.terms[0]?.slug ?? 'the_idea';
  const boards = model.boards.map((b) =>
    `## Board: ${b.id} (${b.reason})\n${b.ascii}\nTactics:\n${redactUnofferedSlugsInText(renderThreatList(b.tags), offeredSlugs)}`).join('\n\n');
  const frames = model.frames.map((f) => f.text).filter(Boolean).join('\n\n');
  const regions = model.zones.aliases.length
    ? model.zones.aliases.map((a) => `- [zone:${a.handle}] = ${a.role} (on the ${a.truthBoard} board)`).join('\n')
    : '(no highlightable squares — describe the idea in words)';
  // Ask 2c (spec 058 feedback, attempt 3). The generic adjacency rule below was added in attempt 2
  // and measurably did not fire: the model named `[term:double_threat]` and pointed at nothing, so
  // the reader was told about a fork with no way to see it. Bind the obligation to the TERM'S OWN
  // LINE, naming the exact handle that points at that idea's geometry (the aliases carrying
  // `kbId === slug`, which is how buildAnnotationOffer already links the two). A conditional
  // pairing, not a required-set group — it costs none of FR-005's three capped slots.
  const pointersFor = (slug) => model.zones.aliases.filter((a) => a.kbId === slug).map((a) => a.handle);
  const termLines = model.zones.terms.length
    ? model.zones.terms.map((t) => {
      const pointers = pointersFor(t.slug);
      const bind = pointers.length
        ? ` — if you use this term you MUST also point at it, with ${pointers.map((h) => `[zone:${h}]`).join(' or ')} `
          + 'wrapping ADJACENT words (never the same words: the two tags cannot nest).'
        : '';
      return `- [term:${t.slug}] = ${t.canonicalPhrase}: ${t.description}${bind}`;
    }).join('\n')
    : '(no named terms apply here)';
  // Required-set block (spec 058, US2, FR-007): every group deriveRequiredSet produced is a square
  // or line the explanation cannot be honest without — the model MUST wrap it in a [zone:...] tag
  // using the listed handle, verbatim, exactly as the Highlightable regions block above already
  // instructs. An empty required set (FR-006) says so explicitly rather than being silently omitted.
  const requiredLines = (model.requiredSet ?? []).length
    ? model.requiredSet.map((g) => `- [zone:${g.handle}] = ${g.role}`).join('\n')
    : '(none for this explanation — do not invent one)';
  return [
    renderDecision(model.decision),
    '',
    `# Boards (you = player ${model.perspective.you})`,
    '',
    boards,
    '',
    `# Why this move was a blunder (causal link ${model.link.id}, confidence ${model.link.confidence})`,
    frames,
    '',
    `Guardrail: ${combinedGuardrail(model)}`,
    '',
    READING_KEY,
    ...(model.openingReadingKey ? ['', model.openingReadingKey] : []),
    '',
    '# Highlightable regions',
    'To highlight a phrase, wrap it in BOTH an opening and a closing tag: '
      + '[zone:<handle>]phrase[/zone:<handle>], using a handle from this list verbatim. Every '
      + 'opening tag MUST have a matching closing tag — never write a handle on its own as if it '
      + `were a word. Bad: "the [term:${exampleSlug}] on c2 is worth keeping" (no closing tag; `
      + `used as a noun). Good: "[term:${exampleSlug}]the threat you need to keep `
      + `alive[/term:${exampleSlug}] on c2". Never write a raw square. Do not overlap a `
      + 'highlight and a term on the same words. A handle whose role below says it "matters later" '
      + 'or "once the forced sequence reaches it" names a square that is not yet playable — '
      + 'describe it in future or conditional language ("this matters once...", "later, if..."), '
      + 'never as a present threat or as something happening right now.',
    // Fix 2 (spec 058 feedback remediation, attempt 2). The line handles were offered and ignored:
    // the model named a LINE in words and grounded it on the one endpoint square, so the board lit
    // up a single cell where the reader was told to look at a row of four. Match the shape of the
    // words to the shape of the handle — stated as a rule AND as a worked pair, because in this
    // repo abstract prompt rules get ignored while worked examples land.
    'MATCH THE SHAPE OF YOUR WORDS TO THE SHAPE OF THE HANDLE. If your words name a line, strip, '
      + 'or row of four squares, you MUST use a whole-line handle — one whose role below says it is '
      + 'a LINE of four squares. A single-square handle is only for words that name one square. '
      + 'Bad: "[zone:you-key-square]the square that keeps your four-in-a-row line alive'
      + '[/zone:you-key-square]" — the words name a line but the board lights up one square. '
      + 'Good: "you gave up [zone:you-key-line]the four-in-a-row line running from column 2 to '
      + 'column 5[/zone:you-key-line], and [zone:you-key-square]the square that finishes it'
      + '[/zone:you-key-square] with it" — line words on the line handle, square words on the '
      + 'square handle.',
    regions,
    '',
    '# You MUST build the explanation around these',
    'Every handle listed below MUST appear as a [zone:<handle>] ... [/zone:<handle>] tag somewhere '
      + 'in your `mechanism` — the explanation is not honest without it. Use the exact handle from '
      + 'this list, wrapping the phrase that names or refers to it, the same way the Highlightable '
      + 'regions instructions above describe. Do not omit any of these, and do not invent a required '
      + 'square that is not listed here.',
    requiredLines,
    '',
    '# KB terms you may name',
    'When you use one of these ideas, wrap the words in BOTH an opening and a closing tag: '
      + '[term:<slug>]phrase[/term:<slug>], using a slug from this list verbatim. Every opening '
      + 'tag MUST have a matching closing tag — never write a slug on its own as if it were a '
      + 'word. Only these slugs, only when you actually use the idea.',
    // Fix 3 (spec 058 feedback remediation, attempt 2, ask 2c). A [term:...] opens a glossary popup
    // and highlights NOTHING, so naming the idea left the player with no way to see where it was.
    // A term and a zone can never wrap the same phrase — the client's parser is single-pass and
    // non-nesting, so a nested tag survives as literal visible text on screen. Adjacency is the
    // only shape that both names the idea and points at it, so ask for it positively rather than
    // only forbidding the overlap.
    'A [term:...] tag opens a glossary popup — it never highlights anything on the board, so a '
      + 'named idea on its own leaves the player with nothing to look at. A term and a highlight '
      + 'can never wrap the SAME words. To both name an idea AND point at it, put them next to '
      + 'each other: the term on the words that name the idea, and a separate [zone:...] on the '
      + 'neighbouring words that say where it is. '
      + `Bad: "you handed him [term:${exampleSlug}]a double threat[/term:${exampleSlug}]" — named, `
      + 'but the player is never shown where it lives. '
      + `Good: "you handed him [term:${exampleSlug}]a double threat[/term:${exampleSlug}] on `
      + '[zone:opp-fork-lines]the two squares he can finish on[/zone:opp-fork-lines]" — the term '
      + 'names it, the adjacent highlight points at it.',
    termLines,
    '',
    '# Internal evidence fields (for your reading only — do NOT name these in `mechanism`; cite paths in `fields_relied_on`)',
    '```json',
    JSON.stringify(redactUnofferedSlugsInTree(model.rendered, offeredSlugs), null, 2),
    '```',
  ].join('\n');
}
