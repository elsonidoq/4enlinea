import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { AnnotatedText } from './AnnotatedText.jsx';
import { KbTermPopup } from './KbTermPopup.jsx';
import { parseAnnotatedText, zoneToOverlays, zoneToWindowGroups, regexFallbackParse, getZoneColor } from '../lib/annotatedText.js';
import { KB_TERM_LESSON } from '../lib/kbTermLesson.js';
import { useStore } from '../store/ProfileStore.jsx';

/**
 * Full wrapper: parses zone- and term-annotated text, manages activeZones state,
 * emits zhZones for Board sync via onHighlightsChange, and handles
 * KB term taps with a KbTermPopup.
 *
 * Use this when a Board is in the render tree and zone highlights
 * should sync between the text and the board.
 *
 * Props:
 *   text                  — raw LLM explanation (may contain [zone:] and [term:] tags)
 *   termsMap              — { [kbId]: shortSummary } from the API response
 *   userMajorThreats      — Array<{c, r}>  for "tg" zone resolution
 *   opponentMajorThreats  — Array<{c, r}>  reserved for future "tg-opp"
 *   onHighlightsChange    — (zhZones: Array<{color, cells}>) => void  parent wires to Board.zhCells
 *   className             — optional CSS class
 *   children              — rendered after the explanation (best-line chips, flag button, etc.)
 *   navigate              — (screenKey, params) => void  for CTA navigation from popup
 */
export function AnnotatedExplanation({
  text,
  termsMap,
  userMajorThreats = [],
  opponentMajorThreats = [],
  onHighlightsChange,
  className,
  children,
  navigate,
}) {
  const store = useStore();
  const containerRef = useRef(null);

  const { cleanText, zones, terms: parsedTerms } = useMemo(() => {
    const primary = parseAnnotatedText(text);
    // Fall back to regex-based detection for old cache entries without [zone:] tags.
    if (primary.zones.length === 0 && primary.terms.length === 0 && text) {
      return regexFallbackParse(text);
    }
    return primary;
  }, [text]);

  // ── KB term popup state ────────────────────────────────────────────────────
  const [termPopup, setTermPopup] = useState(null); // { kbId, summary, rect } | null
  const [lessonProgress, setLessonProgress] = useState({}); // { lessonId: status }

  // Load lesson progress on mount so we can check completion on term tap.
  useEffect(() => {
    store?.getLessonProgress?.()
      .then(rows => {
        const map = {};
        if (Array.isArray(rows)) {
          for (const r of rows) {
            if (r.lessonId) map[r.lessonId] = r.status;
          }
        }
        setLessonProgress(map);
      })
      .catch(() => {});
  }, [store]);

  const handleTapTerm = useCallback((kbId, rect) => {
    const summary = termsMap?.[kbId];
    if (!summary) return;
    setTermPopup({ kbId, summary, rect });
  }, [termsMap]);

  const handleClosePopup = useCallback(() => {
    setTermPopup(null);
  }, []);

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
      const windows = zoneToWindowGroups(spec);
      if (cells.length > 0 || (windows && windows.length > 0)) result.push({ color, cells, windows });
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
        terms={parsedTerms}
        activeZones={activeZones}
        onToggleZone={toggleZone}
        onHoverZone={setHoveredSpec}
        onClearAll={clearAll}
        onTapTerm={handleTapTerm}
      />
      {children}

      {termPopup && (() => {
        const entry = KB_TERM_LESSON[termPopup.kbId];
        const lessonId = entry?.lessonId;
        const practiceCategory = entry?.practiceCategory;
        const lessonCompleted = lessonId
          ? lessonProgress[lessonId] === 'completed'
          : false;

        return (
          <KbTermPopup
            kbId={termPopup.kbId}
            summary={termPopup.summary}
            lessonId={lessonId}
            practiceCategory={practiceCategory}
            lessonCompleted={lessonCompleted}
            rect={termPopup.rect}
            onClose={handleClosePopup}
            navigate={navigate || (() => {})}
          />
        );
      })()}
    </div>
  );
}
