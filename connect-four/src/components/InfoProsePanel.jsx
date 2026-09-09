/**
 * The explanatory prose panel under a lesson concept slide's board.
 *
 * Three behaviours live here, the first two of which used to be inline in ConceptScreen:
 *
 * 1. **It scrolls itself, not the page.** The panel is the only flexible child of
 *    ConceptScreen's content column; the board and legend above it are pinned
 *    (`flexShrink: 0`). Long prose therefore scrolls inside this box instead of
 *    pushing the board — the thing the prose is describing — off screen.
 * 2. **Authored blank lines are real paragraph breaks** (OI-77). A plain
 *    `{infoProse}` in a `<div>` collapses `\n\n` into a single space, so the 33
 *    slides across 13 lessons that are written as 2–4 paragraphs all rendered as
 *    one wall of text.
 * 3. **Overflow is advertised** (OI-166). Because (1) already scrolls, the hidden text
 *    was always *reachable* — but nothing on screen said so, and the last visible line
 *    is bisected mid-glyph, which reads as the end of the prose rather than the middle.
 *    A sticky fade + chevron marks "there is more below" whenever the panel is scrolled
 *    anywhere short of its end.
 */
import { useEffect, useRef, useState } from 'react';

/** A scroll position within this many px of the end counts as "at the end". */
const AT_END_SLACK = 4;

/**
 * Split authored prose into paragraphs on blank lines.
 * Single-paragraph prose yields exactly one entry, so nothing about the existing
 * lessons' rendering changes.
 *
 * @param {string|null|undefined} infoProse
 * @returns {string[]} non-empty, trimmed paragraphs
 */
export function splitInfoProse(infoProse) {
  if (typeof infoProse !== 'string') return [];
  return infoProse.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}

export function InfoProsePanel({ infoProse }) {
  const paragraphs = splitInfoProse(infoProse);
  const panelRef = useRef(null);
  const [moreBelow, setMoreBelow] = useState(false);

  // Re-measured on mount, on scroll, on resize and on any prose change. The panel's
  // height is residual (whatever the board and legend leave), so a viewport change can
  // flip this either way without the prose changing at all.
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return undefined;
    const update = () => {
      setMoreBelow(el.scrollHeight - el.clientHeight - el.scrollTop > AT_END_SLACK);
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    // jsdom has no ResizeObserver; the scroll/resize listeners still cover the app path.
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(update) : null;
    ro?.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      ro?.disconnect();
    };
  }, [infoProse]);

  if (paragraphs.length === 0) return null;

  return (
    <div
      data-testid="info-prose"
      ref={panelRef}
      data-more-below={moreBelow ? 'true' : 'false'}
      style={{
        // flex-grow 0, flex-shrink 1: the panel is exactly as tall as its prose when
        // there is room (no dead white space under short prose on a tall viewport),
        // and is the only child that gives way when there is not — the board and
        // legend above it are flexShrink: 0, so all the shrinking lands here and the
        // prose scrolls internally rather than pushing the board off screen.
        flex: '0 1 auto',
        minHeight: 96,
        overflowY: 'auto',
        marginTop: 12,
        padding: '12px 14px',
        background: '#fff',
        borderRadius: 12,
        boxShadow: 'var(--shadow-sm)',
        fontSize: 14,
        lineHeight: 1.5,
        color: 'var(--ink)',
        position: 'relative',
      }}
    >
      {paragraphs.map((p, i) => (
        <p key={i} style={{ margin: 0, marginTop: i === 0 ? 0 : 10 }}>
          {p}
        </p>
      ))}
      {moreBelow && (
        // Sticky, not fixed/absolute: it rides the bottom edge of the scroll box, so it
        // stays put while the text moves under it and needs no measurement of its own.
        // Negative marginTop pulls it back over the last line rather than adding height
        // (which would itself create overflow). aria-hidden + pointerEvents none: it is
        // pure decoration over text that is already reachable by scrolling, so it adds
        // no new user-facing string to translate and never eats a touch.
        <div
          data-testid="info-prose-more"
          aria-hidden="true"
          style={{
            position: 'sticky',
            bottom: -12,
            marginTop: -34,
            height: 34,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            background: 'linear-gradient(rgba(255,255,255,0), #fff 78%)',
            fontSize: 13,
            lineHeight: 1,
            color: 'var(--ink-soft)',
          }}
        >
          <span style={{ padding: '2px 8px', borderRadius: 8, background: '#f1efe9' }}>▾</span>
        </div>
      )}
    </div>
  );
}
