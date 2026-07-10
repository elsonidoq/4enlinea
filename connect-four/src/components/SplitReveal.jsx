import { useMemo } from 'react';
import { useDragSplit, computeFrozenBoardWidth } from '../lib/useDragSplit.js';

/**
 * Wraps board content and reveal content in a vertical split-pane layout.
 *
 * The top pane (board) takes `splitPct`% of available height. A draggable
 * divider separates it from the bottom pane (explanation), which fills the
 * remainder and scrolls internally.
 *
 * Board resizes by constraining its max-width, which causes the Board's
 * internal flex + aspect-ratio layout to produce smaller square cells.
 * Formula (from Board.jsx, pad=11, gap=7):
 *   boardH = 6*(boardW - 64)/7 + 57 + badgePad
 *   boardW = 7*(targetH - 57)/6 + 64
 *
 * We set width: 100% on the wrapper so percentage-width children resolve
 * correctly, then clamp with maxWidth computed from the top pane height.
 *
 * Props:
 *   boardContent   — ReactNode rendered in the top pane
 *   revealContent  — ReactNode rendered in the bottom pane (scrollable)
 *   isOpen         — boolean; when false, only boardContent renders at full height
 *   onClose        — () => void  called when the collapse button is clicked
 *   closeLabel     — string for the collapse button text
 *   minTopPct      — minimum top pane percentage (default 30)
 *   maxTopPct      — maximum top pane percentage (default 75)
 *   initialSplitPct — starting split (default 60)
 */
export function SplitReveal({
  boardContent,
  revealContent,
  isOpen,
  onClose,
  closeLabel = 'Collapse',
  minTopPct = 30,
  maxTopPct = 75,
  initialSplitPct = 40,
}) {
  const {
    splitPct, topPx, containerH, initialSplitPct: hookInitialSplitPct,
    containerRef, dividerRef, dividerProps, isDragging,
  } = useDragSplit({
    minTopPct,
    maxTopPct,
    initialSplitPct,
  });

  // Spec 042 US6 (FR-022, SC-009, contracts/split-reveal-zoom-contract.md §2):
  // boardW is FROZEN — computed only from the pane height implied by
  // initialSplitPct/containerH, and re-derived only when containerH itself
  // changes for a real reason (a genuine container resize/orientation change
  // — useDragSplit's ResizeObserver is the only thing that ever updates
  // containerH; dragging only ever changes splitPct/topPx, never containerH).
  // Deliberately NOT in the dependency list: splitPct/topPx/isDragging — this
  // is what decouples the board's rendered maxWidth from live drag position.
  // "store it in a ref (or equivalent stable value)" per the contract — a
  // memo keyed only on the genuinely-changing inputs is the equivalent
  // stable value here (a ref alone wouldn't trigger the re-render needed to
  // reflect a real resize). The pane itself (`flex: 0 0 ${topPx}px` below)
  // keeps resizing live with the drag as before — only the board's rendered
  // maxWidth decouples from it.
  // isDragging deliberately NOT passed here (and not a dep) — the frozen
  // computation must never key off live drag state; computeFrozenBoardWidth
  // accepts an isDragging param for signature parity with the contract but
  // ignores it (see useDragSplit.js docstring).
  const boardW = useMemo(
    () => computeFrozenBoardWidth(containerH, hookInitialSplitPct),
    [containerH, hookInitialSplitPct]
  );
  const constrain = boardW >= 200;

  if (!isOpen) {
    return boardContent;
  }

  const handleBg = isDragging
    ? 'var(--disc-green, #4caf50)'
    : 'var(--ink-faint, #e2ddd2)';

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minHeight: 0,
      }}
    >
      {/* Top pane: board with width constraint so it fits vertically */}
      <div style={{
        flex: topPx != null ? `0 0 ${topPx}px` : `0 0 ${splitPct}%`,
        minHeight: 0,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 8px',
        transition: isDragging ? 'none' : 'flex-basis 0.25s cubic-bezier(.2,.9,.3,1.2)',
      }}>
        <div style={{
          width: '100%',
          maxWidth: constrain ? boardW : undefined,
          margin: '0 auto',
          transition: isDragging ? 'none' : 'max-width 0.25s cubic-bezier(.2,.9,.3,1.2)',
        }}>
          {boardContent}
        </div>
      </div>

      {/* Draggable divider */}
      <div
        ref={dividerRef}
        {...dividerProps}
        style={{
          ...dividerProps.style,
          background: isDragging ? 'rgba(76,175,80,0.08)' : 'transparent',
          transition: 'background 0.15s',
        }}
      >
        <div style={{
          width: 40, height: 4, borderRadius: 2,
          background: handleBg,
          transition: 'background 0.15s',
        }} />
      </div>

      {/* Bottom pane: explanation */}
      <div style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        padding: '0 18px 16px',
        animation: 'slideUp 0.3s cubic-bezier(.2,.9,.3,1.2)',
      }}>
        <button
          onClick={onClose}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            fontWeight: 700,
            fontSize: 13,
            color: 'var(--ink-soft)',
            marginBottom: 14,
            padding: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
          {closeLabel}
        </button>

        {revealContent}
      </div>
    </div>
  );
}
