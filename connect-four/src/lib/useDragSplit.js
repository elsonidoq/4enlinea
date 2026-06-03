import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Vertical drag-split hook.
 *
 * Uses native DOM event listeners for ALL drag phases — never React
 * synthetic events. React's event delegation can silently fail to deliver
 * pointer events in conditionally-rendered component trees.
 *
 * Percentage flex-basis doesn't resolve when the flex container's height is
 * determined by the flex algorithm (Chrome treats it as non-definite). We
 * track the container's pixel height and return topPx so callers can use
 * flex: 0 0 ${topPx}px, which always resolves correctly.
 *
 * @param {Object} opts
 * @param {number} [opts.minTopPct=30]
 * @param {number} [opts.maxTopPct=80]
 * @param {number} [opts.initialSplitPct=60]
 */
export function useDragSplit({
  minTopPct = 30,
  maxTopPct = 80,
  initialSplitPct = 60,
} = {}) {
  const [splitPct, setSplitPct] = useState(initialSplitPct);
  const [containerH, setContainerH] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);
  const dividerRef = useRef(null);
  const dragRef = useRef(null);

  const splitPctRef = useRef(splitPct);
  splitPctRef.current = splitPct;

  const optsRef = useRef({ minTopPct, maxTopPct });
  optsRef.current = { minTopPct, maxTopPct };

  // Track container pixel height and reset split on resize.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const h = entries[0].contentRect.height;
      setContainerH(h);
      if (!dragRef.current) setSplitPct(initialSplitPct);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [initialSplitPct]);

  // ---- move handler (native, on window) ----
  const handleMove = useCallback((e) => {
    const d = dragRef.current;
    if (!d) return;

    const pid = e.pointerId ?? 'mouse';
    if (d.pointerId !== pid) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.height === 0) return;

    const dy = e.clientY - d.startY;
    const dp = (dy / rect.height) * 100;
    const { minTopPct: mn, maxTopPct: mx } = optsRef.current;
    setSplitPct(Math.min(mx, Math.max(mn, d.startPct + dp)));
  }, []);

  // ---- end-drag helper ----
  const endDrag = useCallback(() => {
    dragRef.current = null;
    setIsDragging(false);
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    window.removeEventListener('pointermove', handleMove);
    window.removeEventListener('pointerup', endDrag);
    window.removeEventListener('pointerleave', endDrag);
    window.removeEventListener('pointercancel', endDrag);
    window.removeEventListener('mousemove', handleMove);
    window.removeEventListener('mouseup', endDrag);
  }, [handleMove]);

  // ---- start-drag helper ----
  const startDrag = useCallback((clientY, pointerId) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.height === 0) return;

    dragRef.current = {
      pointerId,
      startY: clientY,
      startPct: splitPctRef.current,
    };
    setIsDragging(true);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'row-resize';

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointerleave', endDrag);
    window.addEventListener('pointercancel', endDrag);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', endDrag);
  }, [handleMove, endDrag]);

  // ---- native listeners on divider (avoid React event delegation) ----
  useEffect(() => {
    const el = dividerRef.current;
    if (!el) return;

    function onPointerDown(e) {
      startDrag(e.clientY, e.pointerId);
    }

    function onMouseDown(e) {
      if (dragRef.current) return;
      startDrag(e.clientY, 'mouse');
    }

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('mousedown', onMouseDown);
    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('mousedown', onMouseDown);
    };
  }, [startDrag]);

  // Cleanup all window listeners on unmount.
  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointerleave', endDrag);
      window.removeEventListener('pointercancel', endDrag);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', endDrag);
    };
  }, [handleMove, endDrag]);

  // topPx: pixel height for the top pane. Falls back to a percentage string
  // before the first ResizeObserver measurement.
  const topPx = containerH > 0 ? (containerH * splitPct / 100) : null;

  const dividerProps = {
    role: 'separator',
    'aria-label': 'Resize board and explanation',
    'aria-valuenow': Math.round(splitPct),
    'aria-valuemin': minTopPct,
    'aria-valuemax': maxTopPct,
    style: {
      flexShrink: 0,
      height: 24,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'row-resize',
      touchAction: 'none',
      userSelect: 'none',
    },
  };

  return { splitPct, topPx, containerRef, dividerRef, dividerProps, isDragging };
}
