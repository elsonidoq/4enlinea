// Staged render object between the narrator vector and the prompt text (spec §3c).
// Phase 1: faithful passthrough — classify link, assert completeness, draw an untagged board.
// P2 adds tags/grounding; P3 adds rich causal-frame text.

import { pruneVector } from './reasonNarratorVector.mjs';
import { classifyCausalLink, denialCell } from './reason_engine/causalLinks.mjs';
import { dispositionOf, assertCoverage, leafPaths } from './fieldDisposition.mjs';
import { selectBoards, renderThreatList, patternOnAfterBestBoard, boardSelectionDecisions } from './reasonBoardSelect.mjs';
import { groundCell, horizonForRegister } from './reasonCellGrounding.mjs';
import { parseBoardState } from '../classifier.js';
import { composeOpeningFrame, centralityQualitative } from './reason_engine/openingFrame.mjs';
import { buildAnnotationOffer } from './reason_engine/zoneAnnotations.mjs';

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

// Opening residue: the deep halves demote to a horizon; strip their cells so no deep cNrM leaks into the prompt.
function pruneOpeningResidue(rendered) {
  const horizonOnly = (h) => (h && typeof h === 'object')
    ? Object.fromEntries(['register', 'pliesToEnd'].filter((k) => k in h).map((k) => [k, h[k]]))
    : h;
  const out = { ...rendered };
  if (out.lostResource) out.lostResource = horizonOnly(out.lostResource);
  if (out.opponentPunishment) out.opponentPunishment = horizonOnly(out.opponentPunishment);
  return out;
}

// The required set (spec 058, US2 — Derivation Rule, spec.md, copied verbatim from the epic). For
// each of pruned.lostResource / pruned.opponentPunishment, the load-bearing cell (if any) is
// denialCell(half) — the same `h?.cell ?? h?.completingCell ?? null` precedence causalLinks.mjs's
// own denialCell() uses — or, when the half has no resolvable cell, the full half.window array
// (the half's story is a line, not a single square; the T-parity worked example, covers:
// ['route', 'lostResource.terminal', 'opponentPunishment.terminal']). A half with neither field
// yields NO required cell — it is not forced into one (FR-006). Each derived cell/window is then
// matched to an offered handle by EXACT spec-string equality against zones.aliases[].spec (D2) —
// never a freshly-derived spec format. On match failure the group is dropped (FR-004) rather than
// left unenforceable. Capped at 1-3 groups (one per half that resolves to a cell, plus at most one
// line/window) — with exactly two halves, at most one group per half is possible in practice.
export function deriveRequiredSet(pruned, zones) {
  const aliasBySpec = new Map((zones?.aliases ?? []).map((a) => [a.spec, a]));
  const groups = [];
  for (const half of ['lostResource', 'opponentPunishment']) {
    const h = pruned?.[half];
    if (!h) continue;
    const cell = denialCell(h);
    const spec = cell ?? (Array.isArray(h.window) && h.window.length ? 'windows:' + h.window.join(',') : null);
    if (!spec) continue; // neither a cell nor a window — abstain, do not invent (FR-006)
    const alias = aliasBySpec.get(spec);
    if (!alias) continue; // match failure — drop, required ⊆ offered (FR-004)
    // Both halves routinely resolve to the SAME offered alias (measured: 9 of the 16 non-empty
    // requiredSets over the 29-record coverage corpus, e.g. eval-4 -> c5r4 from both halves).
    // The required set is "the subset of the offered handle set" (spec.md, Key Entities) — a
    // subset has no duplicates. Emitting the group twice would print the identical
    // `- [zone:h] = role` line twice in assembleGroundedPrompt's required block and burn one of
    // FR-005's three capped slots on nothing.
    if (groups.some((g) => g.spec === alias.spec)) continue;
    groups.push({ half, spec: alias.spec, handle: alias.handle, role: alias.role });
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
    const allBoards = boardSelectionDecisions(pruned);
    const zones = buildAnnotationOffer(pruned, allBoards);
    const decisionBoard = allBoards.find((b) => b.id === 'decision');
    return {
      perspective: { you: pruned.player, opponent: pruned.opponent },
      decision: buildDecision(pruned),
      link,
      frames: [{ id: openingFrame.id, confidence: openingFrame.confidence, text: openingFrame.text,
                 covers: openingFrame.covers, guardrail: openingFrame.guardrail }],
      boards: [decisionBoard],
      zones,
      requiredSet: deriveRequiredSet(pruned, zones),
      rendered: pruneOpeningResidue(renderedFields(pruned, link.covers)),
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
  const zones = buildAnnotationOffer(pruned, boardSelectionDecisions(pruned));

  const openingFrame = composeOpeningFrame(pruned);
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

export function assembleGroundedPrompt(model) {
  const boards = model.boards.map((b) =>
    `## Board: ${b.id} (${b.reason})\n${b.ascii}\nTactics:\n${renderThreatList(b.tags)}`).join('\n\n');
  const frames = model.frames.map((f) => f.text).filter(Boolean).join('\n\n');
  const regions = model.zones.aliases.length
    ? model.zones.aliases.map((a) => `- [zone:${a.handle}] = ${a.role} (on the ${a.truthBoard} board)`).join('\n')
    : '(no highlightable squares — describe the idea in words)';
  const termLines = model.zones.terms.length
    ? model.zones.terms.map((t) => `- [term:${t.slug}] = ${t.canonicalPhrase}: ${t.description}`).join('\n')
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
      + 'were a word. Bad: "the [term:immediate_threat] on c2 is worth keeping" (no closing tag; '
      + 'used as a noun). Good: "[term:immediate_threat]the threat you need to keep '
      + 'alive[/term:immediate_threat] on c2". Never write a raw square. Do not overlap a '
      + 'highlight and a term on the same words. A handle whose role below says it "matters later" '
      + 'or "once the forced sequence reaches it" names a square that is not yet playable — '
      + 'describe it in future or conditional language ("this matters once...", "later, if..."), '
      + 'never as a present threat or as something happening right now.',
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
    termLines,
    '',
    '# Internal evidence fields (for your reading only — do NOT name these in `mechanism`; cite paths in `fields_relied_on`)',
    '```json',
    JSON.stringify(model.rendered, null, 2),
    '```',
  ].join('\n');
}
