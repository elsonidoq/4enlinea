import { useEffect, useMemo, useState } from 'react';
import { Board } from '../components/Board.jsx';
import { AnnotatedExplanation } from '../components/AnnotatedExplanation.jsx';
import { buildBoard } from '../lib/board.js';
import { GROUNDING_DIFF_CASES } from './groundingDiffCases.js';

/**
 * /admin/grounding-diff — side-by-side before/after for spec 058 (Deep-Reveal Grounding).
 *
 * Localhost-only: App.jsx gates the whole /admin surface via isLocalhostOrigin() BEFORE this
 * bundle is even fetched. Nothing here talks to a network or a DB — every case is hardcoded in
 * groundingDiffCases.js (see that file's header for provenance).
 *
 * Why this lives in the app rather than a standalone HTML file: the highlights must be the REAL
 * ones. This page renders the same Board.jsx + AnnotatedExplanation.jsx the deep-reveal screen
 * uses, so zone specs resolve through the real annotatedText.js pipeline (including the new
 * `future:` prefix and FUTURE_ZONE_COLOR). A standalone page would have to reimplement
 * spec->cell resolution and colour assignment, i.e. reimplement the exact logic under review.
 */

const CARD = {
  background: '#fff',
  borderRadius: 12,
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  padding: 16,
};

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

/**
 * Count the GROUNDED zone tags the model actually emitted, and how many of them point at a
 * square rather than a whole column.
 *
 * The distinction matters and is easy to miss when eyeballing the rendered page: when a text
 * carries zero tags, AnnotatedExplanation falls back to `regexFallbackParse`, which scrapes
 * "column N" out of prose and synthesises `colN` zones client-side. Those render as underlines
 * and light up a column, so a zero-tag explanation does NOT look empty on screen — but nothing
 * about them is grounded in the reasoning engine, and they can never resolve to a cell. Counting
 * rendered underlines would therefore flatter the BEFORE column; counting emitted tags does not.
 */
function countGroundedZones(text) {
  const specs = [...text.matchAll(/\[zone:([^\]]+)\]/g)]
    .map(m => m[1])
    .filter((s, i, a) => a.indexOf(s) === i); // opening + closing tag share a spec
  return {
    total: specs.length,
    // A cell-level reference: cNrM, windows:…, or either wrapped in the new future: prefix.
    cellLevel: specs.filter(s => /(^|:)c\d+r\d+/.test(s) || s.includes('windows:')).length,
  };
}

function SpecChip({ spec, tone }) {
  const palette = {
    offered: { bg: '#f1f5f9', fg: '#475569', bd: '#cbd5e1' },
    required: { bg: '#ecfdf5', fg: '#047857', bd: '#6ee7b7' },
    emitted: { bg: '#eff6ff', fg: '#1d4ed8', bd: '#93c5fd' },
    rejected: { bg: '#fef2f2', fg: '#b91c1c', bd: '#fca5a5' },
  }[tone];
  return (
    <span style={{
      display: 'inline-block', fontFamily: MONO, fontSize: 11, padding: '2px 6px',
      margin: '2px 3px 2px 0', borderRadius: 4,
      background: palette.bg, color: palette.fg, border: `1px solid ${palette.bd}`,
      // A future: spec is the whole point of US1 — make it visible in the chip row too.
      fontWeight: spec.startsWith('future:') ? 700 : 400,
    }}>{spec}</span>
  );
}

/**
 * One side (before or after) of a comparison: its own Board + AnnotatedExplanation, with its own
 * zhCells state so clicking a highlight on one side does NOT move the other side's board — the
 * two must be independently inspectable.
 */
function RevealSide({ label, sublabel, accent, text, boardObj, overlays }) {
  const [zhCells, setZhCells] = useState([]);
  const { total, cellLevel } = countGroundedZones(text);

  return (
    <div style={{ ...CARD, flex: '1 1 380px', minWidth: 340, borderTop: `4px solid ${accent}` }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
        <strong style={{ color: accent, fontSize: 14, letterSpacing: 0.4 }}>{label}</strong>
        <span style={{
          fontFamily: MONO, fontSize: 11, padding: '1px 6px', borderRadius: 10,
          background: total ? '#ecfdf5' : '#fef2f2',
          color: total ? '#047857' : '#b91c1c',
        }}>
          {total} grounded tag{total === 1 ? '' : 's'}
        </span>
        <span style={{
          fontFamily: MONO, fontSize: 11, padding: '1px 6px', borderRadius: 10,
          background: cellLevel ? '#ecfdf5' : '#fef2f2',
          color: cellLevel ? '#047857' : '#b91c1c',
        }}>
          {cellLevel} cell-level
        </span>
      </div>
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10 }}>{sublabel}</div>

      {/* Board.jsx sizes to its container; cap it so a full case (both sides + text) fits on one
          screen. Sizing/layout of Board itself is Plan B's — this is a wrapper, not a Board change. */}
      <div style={{ marginBottom: 12, maxWidth: 330 }}>
        <Board
          board={boardObj.board}
          compact
          canPlay={false}
          overlays={overlays}
          zhCells={zhCells}
          showCoordinates
        />
      </div>

      {total === 0 && (
        <div style={{
          fontSize: 12, color: '#b91c1c', background: '#fef2f2', border: '1px solid #fca5a5',
          borderRadius: 6, padding: '6px 8px', marginBottom: 8, lineHeight: 1.5,
        }}>
          <strong>The model emitted zero <code style={{ fontFamily: MONO }}>[zone:]</code> tags.</strong>{' '}
          The underlines you see below are <em>not</em> grounded — they come from{' '}
          <code style={{ fontFamily: MONO }}>regexFallbackParse</code>, a client-side rescue that
          only runs when the text has no tags at all and can only scrape{' '}
          <code style={{ fontFamily: MONO }}>&ldquo;column N&rdquo;</code> out of prose. It can
          never point at a <em>square</em> — which is precisely what the feedback above is asking
          for.
        </div>
      )}

      <div style={{ fontSize: 14, lineHeight: 1.55 }}>
        <AnnotatedExplanation
          text={text}
          termsMap={{}}
          userMajorThreats={[]}
          onHighlightsChange={setZhCells}
          navigate={() => {}}
        />
      </div>
    </div>
  );
}

function CaseCard({ c, i }) {
  const boardObj = useMemo(() => buildBoard(c.movestring), [c.movestring]);

  // Mark the square the player actually dropped into — the blunder itself. `tr` is the same
  // overlay type MistakeDetailScreen/AdminDeepRevealEvalPage use for "your move".
  const overlays = useMemo(
    () => [{ c: c.playedCol, r: boardObj.heights[c.playedCol] ?? 0, type: 'tr' }],
    [c.playedCol, boardObj],
  );

  return (
    <section style={{ marginBottom: 34 }}>
      <div style={{ ...CARD, marginBottom: 12 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 12 }}>
          <span style={{ fontSize: 18, fontWeight: 700 }}>Case {i + 1}</span>
          <code style={{ fontFamily: MONO, fontSize: 13, background: '#f1f5f9', padding: '2px 8px', borderRadius: 4 }}>
            {c.movestring}
          </code>
          <span style={{ fontSize: 13, color: '#334155' }}>
            played <strong style={{ color: '#b91c1c' }}>column {c.playedCol + 1}</strong>
            {'  ·  '}better was <strong style={{ color: '#047857' }}>column {c.betterCol + 1}</strong>
          </span>
          <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: MONO }}>
            (columns shown 1-indexed for display; movestring digits are 0-indexed)
          </span>
        </div>

        <div style={{
          marginTop: 12, background: '#fffbeb', border: '1px solid #fcd34d',
          borderRadius: 8, padding: '10px 12px',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', letterSpacing: 0.5, marginBottom: 4 }}>
            STAGING FEEDBACK — verbatim, {new Date(c.feedbackAt).toISOString().slice(0, 10)}
          </div>
          <div style={{ fontSize: 13, color: '#78350f', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
            {c.feedbackNote}
          </div>
        </div>

        <div style={{ marginTop: 12, fontSize: 12 }}>
          <div style={{ marginBottom: 4 }}>
            <span style={{ color: '#64748b', marginRight: 6 }}>offered to the coach:</span>
            {c.offeredSpecs.map(s => <SpecChip key={s} spec={s} tone="offered" />)}
          </div>
          <div style={{ marginBottom: 4 }}>
            <span style={{ color: '#64748b', marginRight: 6 }}>required (must be highlighted):</span>
            {c.requiredSpecs.length
              ? c.requiredSpecs.map(s => <SpecChip key={s} spec={s} tone="required" />)
              : <span style={{ fontFamily: MONO, fontSize: 11, color: '#94a3b8' }}>
                  none — the rule abstains rather than inventing one (FR-006)
                </span>}
          </div>
          <div style={{ marginBottom: 4 }}>
            <span style={{ color: '#64748b', marginRight: 6 }}>actually emitted (after):</span>
            {c.emittedSpecs.map(s => <SpecChip key={s} spec={s} tone="emitted" />)}
          </div>
          {c.decisionARejectedSpecs.length > 0 && (
            <div style={{ marginTop: 8, color: '#b91c1c' }}>
              <span style={{ marginRight: 6 }}>rejected by whole-window-only admission (OI-172):</span>
              {c.decisionARejectedSpecs.map(s => <SpecChip key={s} spec={s} tone="rejected" />)}
              <div style={{ fontSize: 11, color: '#7f1d1d', marginTop: 4, lineHeight: 1.5 }}>
                The coach named these two cells; they were promoted to real highlights and then
                stripped, because the engine offered them only as the single unit{' '}
                <code style={{ fontFamily: MONO }}>future:windows:c2r6,c5r5</code> and never
                standalone. They degrade to &ldquo;column 2&rdquo;/&ldquo;column 5&rdquo; in the
                text on the right — this is the known, owner-accepted cost of Decision A.
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <RevealSide
          label="BEFORE — shipped on staging"
          sublabel="llm_feedback.llm_response (pre-058 code, post-guard)"
          accent="#b91c1c"
          text={c.before}
          boardObj={boardObj}
          overlays={overlays}
        />
        <RevealSide
          label="AFTER — current code"
          sublabel="T040 real-pipeline re-run (post-058, post-guard)"
          accent="#047857"
          text={c.after}
          boardObj={boardObj}
          overlays={overlays}
        />
      </div>
    </section>
  );
}

export default function AdminGroundingDiffPage() {
  // #root is globally capped at max-width:480px (src/index.css — the mobile shell); widen it while
  // this side-by-side desktop tool is mounted, then restore on unmount. Same pattern as
  // AdminFvSuffPage.
  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return;
    const prev = { maxWidth: root.style.maxWidth, width: root.style.width };
    root.style.maxWidth = 'none';
    root.style.width = '100%';
    return () => {
      root.style.maxWidth = prev.maxWidth;
      root.style.width = prev.width;
    };
  }, []);

  const totals = useMemo(() => GROUNDING_DIFF_CASES.reduce((a, c) => {
    const b = countGroundedZones(c.before);
    const f = countGroundedZones(c.after);
    return {
      before: a.before + b.total,
      after: a.after + f.total,
      cellBefore: a.cellBefore + b.cellLevel,
      cellAfter: a.cellAfter + f.cellLevel,
      emptyBefore: a.emptyBefore + (b.total === 0 ? 1 : 0),
      emptyAfter: a.emptyAfter + (f.total === 0 ? 1 : 0),
    };
  }, { before: 0, after: 0, cellBefore: 0, cellAfter: 0, emptyBefore: 0, emptyAfter: 0 }), []);

  return (
    <div style={{ minHeight: '100dvh', background: '#f8fafc', padding: '24px 20px 60px' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <h1 style={{ fontSize: 24, marginBottom: 4 }}>Deep-Reveal Grounding — before / after</h1>
        <p style={{ color: '#475569', fontSize: 14, lineHeight: 1.6, marginTop: 0 }}>
          The four real staging positions that received human feedback, each rendered twice: the
          text that actually shipped on staging under the pre-058 code, and the text the current
          code produces for the same position. Both sides use the real{' '}
          <code style={{ fontFamily: MONO }}>Board</code> and{' '}
          <code style={{ fontFamily: MONO }}>AnnotatedExplanation</code> components, so{' '}
          <strong>the highlights are live on both sides</strong> — click an underlined phrase to
          light up its squares on that side&rsquo;s board. Each side keeps its own board state.
        </p>
        <p style={{ color: '#475569', fontSize: 13, lineHeight: 1.6, marginTop: 0 }}>
          <strong>Read the counts, not the underlines.</strong> When an explanation carries no{' '}
          <code style={{ fontFamily: MONO }}>[zone:]</code> tags at all, the client falls back to{' '}
          <code style={{ fontFamily: MONO }}>regexFallbackParse</code>, which scrapes
          &ldquo;column N&rdquo; out of prose and synthesises column highlights. Those look like
          real highlights on screen but are ungrounded, and can never resolve to a square — so a
          BEFORE panel showing underlines is not evidence that anything was grounded. The
          cell-level count is the honest measure of what this epic changed.
        </p>

        <div style={{ ...CARD, marginBottom: 26, display: 'flex', gap: 28, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 11, color: '#64748b', letterSpacing: 0.5 }}>GROUNDED ZONE TAGS</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              <span style={{ color: '#b91c1c' }}>{totals.before}</span>
              <span style={{ color: '#94a3b8' }}> → </span>
              <span style={{ color: '#047857' }}>{totals.after}</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#64748b', letterSpacing: 0.5 }}>
              OF THOSE, CELL-LEVEL
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              <span style={{ color: '#b91c1c' }}>{totals.cellBefore}</span>
              <span style={{ color: '#94a3b8' }}> → </span>
              <span style={{ color: '#047857' }}>{totals.cellAfter}</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#64748b', letterSpacing: 0.5 }}>
              EXPLANATIONS WITH ZERO TAGS
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              <span style={{ color: '#b91c1c' }}>{totals.emptyBefore} of 4</span>
              <span style={{ color: '#94a3b8' }}> → </span>
              <span style={{ color: '#047857' }}>{totals.emptyAfter} of 4</span>
            </div>
          </div>
          <div style={{ flex: '1 1 320px', fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
            The boards on this page are the <em>decision</em> position (before the blunder). The
            pale ring marks the square the player dropped into. Column/row numbering is US4&rsquo;s{' '}
            <code style={{ fontFamily: MONO }}>showCoordinates</code> prop, on by default here so
            the coordinates the coach names are findable.
          </div>
        </div>

        {GROUNDING_DIFF_CASES.map((c, i) => <CaseCard key={c.movestring} c={c} i={i} />)}

        <footer style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.6, marginTop: 30 }}>
          Data is hardcoded in <code style={{ fontFamily: MONO }}>src/pages/groundingDiffCases.js</code>;
          see that file&rsquo;s header for the provenance of every field. This page performs no network
          or database access, and is reachable only from localhost.
        </footer>
      </div>
    </div>
  );
}
