import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { AnnotatedText } from './AnnotatedText.jsx';
import { parseAnnotatedText, zoneToOverlays, regexFallbackParse, getZoneColor } from '../lib/annotatedText.js';

/**
 * Full wrapper: parses zone-annotated text, manages activeZones state,
 * and emits zhZones for Board sync via onHighlightsChange.
 *
 * Use this when a Board is in the render tree and zone highlights
 * should sync between the text and the board.
 *
 * Props:
 *   text                  — raw LLM explanation (may contain [zone:] tags)
 *   userMajorThreats      — Array<{c, r}>  for "tg" zone resolution
 *   opponentMajorThreats  — Array<{c, r}>  reserved for future "tg-opp"
 *   onHighlightsChange    — (zhZones: Array<{color, cells}>) => void  parent wires to Board.zhCells
 *   className             — optional CSS class
 *   children              — rendered after the explanation (best-line chips, flag button, etc.)
 */
export function AnnotatedExplanation({
  text,
  userMajorThreats = [],
  opponentMajorThreats = [],
  onHighlightsChange,
  className,
  children,
}) {
  const containerRef = useRef(null);

  const { cleanText, zones } = useMemo(() => {
    const primary = parseAnnotatedText(text);
    // Fall back to regex-based detection for old cache entries without [zone:] tags.
    if (primary.zones.length === 0 && text) {
      return regexFallbackParse(text);
    }
    return primary;
  }, [text]);

  // zones is computed above (useMemo runs before useState in hook order),
  // so the lazy initializer can safely read it.
  const [activeZones, setActiveZones] = useState(
    () => new Set(zones.filter(z => z.defaultActive).map(z => z.index))
  );
  const [hoveredSpec, setHoveredSpec] = useState(null);

  // Compute per-zone cell lists from pinned zones + hovered spec.
  // Emits Array<{color, cells}> so Board can render each zone independently
  // without zones stealing shared cells from each other.
  const zhZones = useMemo(() => {
    const specsToRender = new Set(zones.filter(z => activeZones.has(z.index)).map(z => z.spec));
    if (hoveredSpec !== null) specsToRender.add(hoveredSpec);
    const result = [];
    for (const spec of specsToRender) {
      const color = getZoneColor(spec);
      const cells = zoneToOverlays(spec, userMajorThreats, opponentMajorThreats);
      if (cells.length > 0) result.push({ color, cells });
    }
    return result;
  }, [activeZones, hoveredSpec, zones, userMajorThreats, opponentMajorThreats]);

  // Notify parent only when zhZones contents actually change (not just reference).
  const prevZhZonesRef = useRef(null);

  useEffect(() => {
    if (!onHighlightsChange) return;
    const prev = prevZhZonesRef.current;
    prevZhZonesRef.current = zhZones;

    if (prev && prev.length === zhZones.length) {
      const same = zhZones.every((z, i) =>
        z.color === prev[i].color && z.cells.length === prev[i].cells.length
      );
      if (same) return;
    }
    onHighlightsChange(zhZones);
  }, [zhZones, onHighlightsChange]);

  const toggleZone = useCallback((index) => {
    setActiveZones(prev => {
      const zone = zones[index];
      if (!zone) return prev;

      // Find all zones with the same spec (e.g., two "column 4" mentions).
      const siblingIndices = zones
        .filter(z => z.spec === zone.spec)
        .map(z => z.index);

      // If any sibling is active, deactivate all; otherwise activate all.
      const isActive = siblingIndices.some(i => prev.has(i));

      const next = new Set(prev);
      if (isActive) {
        for (const i of siblingIndices) next.delete(i);
      } else {
        for (const i of siblingIndices) next.add(i);
      }
      return next;
    });
  }, [zones]);

  const clearAll = useCallback(() => {
    setActiveZones(new Set());
  }, []);

  // Tap outside the explanation container → clear all highlights.
  useEffect(() => {
    if (activeZones.size === 0) return;
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setActiveZones(new Set());
      }
    }
    document.addEventListener('click', handleClick, { capture: true });
    return () => document.removeEventListener('click', handleClick, { capture: true });
  }, [activeZones.size]);

  return (
    <div className={className} ref={containerRef}>
      <AnnotatedText
        cleanText={cleanText}
        zones={zones}
        activeZones={activeZones}
        onToggleZone={toggleZone}
        onHoverZone={setHoveredSpec}
        onClearAll={clearAll}
      />
      {children}
    </div>
  );
}
