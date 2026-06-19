import { useState, useCallback } from 'react';
import { getZoneColor } from '../lib/annotatedText.js';

/**
 * Renders clean text with interactive zone spans and KB term spans.
 *
 * Zone spans (spatial references):
 *   Hover (non-touch): shows board highlight while mouse is over the span.
 *   Click: pins the highlight so it persists after the mouse leaves.
 *
 * Term spans (KB concept references):
 *   Visual: dashed amber underline (distinct from zone dotted blue).
 *   Click: opens KbTermPopup via onTapTerm(kbId, domRect).
 *
 * Props:
 *   cleanText    — tag-stripped text to render
 *   zones        — parsed zone objects with {index, spec, startChar, endChar, text}
 *   terms        — parsed term objects with {index, kbId, startChar, endChar, text}
 *   activeZones  — Set<number> of click-pinned zone indices
 *   onToggleZone — (index: number) => void  called on zone tap/click
 *   onHoverZone  — (index: number | null) => void  called on zone mouse enter/leave
 *   onClearAll   — () => void  optional; renders "Clear highlights" button
 *   onTapTerm    — (kbId: string, rect: DOMRect) => void  called on term tap
 */
export function AnnotatedText({
  cleanText,
  zones,
  terms,
  activeZones,
  onToggleZone,
  onHoverZone,
  onClearAll,
  onTapTerm,
}) {
  const [hoveredSpec, setHoveredSpec] = useState(null);

  const isTouchDevice =
    typeof window !== 'undefined' && window.matchMedia?.('(hover: none)').matches;

  const handleTermClick = useCallback((kbId, e) => {
    e.stopPropagation();
    const rect = e.target.getBoundingClientRect?.() ?? e.currentTarget.getBoundingClientRect();
    onTapTerm?.(kbId, rect);
  }, [onTapTerm]);

  // Merge zones and terms into a single sorted annotation list.
  const allAnnotations = [
    ...(zones || []).map(z => ({ ...z, annType: 'zone' })),
    ...(terms || []).map(t => ({ ...t, annType: 'term' })),
  ].sort((a, b) => a.startChar - b.startChar);

  // No annotations → plain text.
  if (allAnnotations.length === 0) {
    return <span>{cleanText}</span>;
  }

  // Build segments: interleave plain text runs and annotation spans.
  const segments = [];
  let lastEnd = 0;

  for (const ann of allAnnotations) {
    if (ann.startChar > lastEnd) {
      segments.push({
        type: 'text',
        content: cleanText.slice(lastEnd, ann.startChar),
        key: `t${lastEnd}`,
      });
    }
    segments.push({
      type: ann.annType,
      annotation: ann,
      key: `${ann.annType === 'zone' ? 'z' : 'k'}${ann.index}`,
    });
    lastEnd = ann.endChar;
  }

  if (lastEnd < cleanText.length) {
    segments.push({
      type: 'text',
      content: cleanText.slice(lastEnd),
      key: `t${lastEnd}`,
    });
  }

  return (
    <span>
      {segments.map(seg => {
        if (seg.type === 'text') {
          return <span key={seg.key}>{seg.content}</span>;
        }

        if (seg.type === 'term') {
          const term = seg.annotation;
          // KB term styling: dashed amber underline, distinct from zone spans.
          const termStyle = {
            borderBottom: '1.5px dashed #d97706',
            cursor: 'pointer',
            transition: 'background .15s, color .15s',
            WebkitTapHighlightColor: 'transparent',
            userSelect: 'none',
            color: '#b45309',
          };

          return (
            <span
              key={seg.key}
              data-term={term.kbId}
              style={termStyle}
              onClick={e => handleTermClick(term.kbId, e)}
            >
              {term.text}
            </span>
          );
        }

        // seg.type === 'zone'
        const zone = seg.annotation;
        const isPinned = activeZones.has(zone.index);
        const isHovered = zone.spec === hoveredSpec;
        const isHighlighted = isPinned || isHovered;
        const zoneColor = getZoneColor(zone.spec);

        const style = {
          borderBottom: '1.5px dotted var(--ink-soft)',
          cursor: 'pointer',
          transition: 'background .15s, color .15s',
          WebkitTapHighlightColor: 'transparent',
          userSelect: 'none',
        };

        if (isHighlighted) {
          style.background = isPinned ? `${zoneColor}59` : `${zoneColor}40`;
          style.color = zoneColor;
          style.fontWeight = 'bold';
          style.borderLeft = `2px solid ${zoneColor}`;
          style.paddingLeft = '3px';
          style.borderBottom = 'none';
          style.borderRadius = '2px';
        }

        return (
          <span
            key={seg.key}
            data-zone={zone.index}
            style={style}
            onClick={e => {
              e.stopPropagation();
              onToggleZone(zone.index);
            }}
            onMouseEnter={() => {
              if (isTouchDevice) return;
              setHoveredSpec(zone.spec);
              onHoverZone?.(zone.spec);
            }}
            onMouseLeave={() => {
              if (isTouchDevice) return;
              setHoveredSpec(null);
              onHoverZone?.(null);
            }}
          >
            {zone.text}
          </span>
        );
      })}

      {/* Clear highlights link */}
      {activeZones.size > 0 && onClearAll && (
        <>
          {' '}
          <button
            onClick={e => {
              e.stopPropagation();
              onClearAll();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--zone-highlight)',
              cursor: 'pointer',
              fontSize: 'inherit',
              fontFamily: 'inherit',
              textDecoration: 'underline',
              padding: 0,
              whiteSpace: 'nowrap',
            }}
          >
            Clear highlights
          </button>
        </>
      )}
    </span>
  );
}
