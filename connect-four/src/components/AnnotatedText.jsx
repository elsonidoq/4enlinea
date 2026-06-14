import { useState } from 'react';
import { getZoneColor } from '../lib/annotatedText.js';

/**
 * Renders clean text with interactive zone spans.
 *
 * Hover (non-touch): shows board highlight while mouse is over the span.
 * Click: pins the highlight so it persists after the mouse leaves.
 *        Clicking a pinned zone unpins it.
 *
 * Props:
 *   cleanText    — zone-tag-stripped text to render
 *   zones        — parsed zone objects with {index, spec, startChar, endChar, text}
 *   activeZones  — Set<number> of click-pinned zone indices
 *   onToggleZone — (index: number) => void  called on tap/click
 *   onHoverZone  — (index: number | null) => void  called on mouse enter/leave
 *   onClearAll   — () => void  optional; renders "Clear highlights" button when activeZones is non-empty
 */
export function AnnotatedText({ cleanText, zones, activeZones, onToggleZone, onHoverZone, onClearAll }) {
  const [hoveredSpec, setHoveredSpec] = useState(null);

  // No zones → plain text.
  if (!zones || zones.length === 0) {
    return <span>{cleanText}</span>;
  }

  // Build segments: interleave plain text runs and zone spans.
  const segments = [];
  let lastEnd = 0;

  for (const zone of zones) {
    if (zone.startChar > lastEnd) {
      segments.push({
        type: 'text',
        content: cleanText.slice(lastEnd, zone.startChar),
        key: `t${lastEnd}`,
      });
    }
    segments.push({ type: 'zone', zone, key: `z${zone.index}` });
    lastEnd = zone.endChar;
  }

  if (lastEnd < cleanText.length) {
    segments.push({
      type: 'text',
      content: cleanText.slice(lastEnd),
      key: `t${lastEnd}`,
    });
  }

  const isTouchDevice =
    typeof window !== 'undefined' && window.matchMedia?.('(hover: none)').matches;

  return (
    <span>
      {segments.map(seg => {
        if (seg.type === 'text') {
          return <span key={seg.key}>{seg.content}</span>;
        }

        const { zone } = seg;
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
