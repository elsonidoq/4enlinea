/**
 * The explanatory prose panel under a lesson concept slide's board.
 *
 * Two behaviours live here, both of which used to be inline in ConceptScreen:
 *
 * 1. **It scrolls itself, not the page.** The panel is the only flexible child of
 *    ConceptScreen's content column; the board and legend above it are pinned
 *    (`flexShrink: 0`). Long prose therefore scrolls inside this box instead of
 *    pushing the board — the thing the prose is describing — off screen.
 * 2. **Authored blank lines are real paragraph breaks** (OI-77). A plain
 *    `{infoProse}` in a `<div>` collapses `\n\n` into a single space, so the 33
 *    slides across 13 lessons that are written as 2–4 paragraphs all rendered as
 *    one wall of text.
 */

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
  if (paragraphs.length === 0) return null;

  return (
    <div
      data-testid="info-prose"
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
      }}
    >
      {paragraphs.map((p, i) => (
        <p key={i} style={{ margin: 0, marginTop: i === 0 ? 0 : 10 }}>
          {p}
        </p>
      ))}
    </div>
  );
}
