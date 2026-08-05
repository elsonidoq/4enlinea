import { useState, useRef, useEffect, useMemo, memo } from 'react';
import { Icon } from './Icon.jsx';
import { getColumnA11yProps } from './boardA11y.js';
import { getColumnLabels, getRowLabels } from './boardCoordinateLabels.js';
import { boardPropsAreEqual } from '../lib/board.js';
import { windowCountTint } from '../lib/lessonWindows.js';

const ROWS = 6;
const COLS = 7;
const EMPTY_BOARD = Array.from({ length: ROWS }, () => Array(COLS).fill('empty'));

// Inlined from Piece.jsx — deprecated shim for CurationWorkspace.jsx only.
// Returns inline style props for the legacy curation highlight overlay.
function shimStyle(color, role) {
  let bg = 'transparent', border = 'none', shadow = 'none';

  if (color === 'red') {
    bg = 'var(--red)'; border = '1px solid var(--red)'; shadow = '0 2px 8px var(--red-g)';
  } else if (color === 'yellow') {
    bg = 'var(--yellow)'; border = '1px solid var(--yellow)'; shadow = '0 2px 8px var(--yellow-g)';
  } else {
    bg = 'var(--bg)'; border = '1px solid var(--border-dim)';
  }

  if (role === 'winning') { shadow = '0 0 14px var(--green-g), 0 0 0 2px var(--green)'; }
  if (role === 'hint' && color === 'empty') { bg = 'rgba(34,197,94,.18)'; border = '1.5px solid var(--green)'; shadow = '0 0 8px rgba(34,197,94,.35)'; }
  if (role === 'selected' && color === 'empty') { bg = 'rgba(245,184,32,.18)'; border = '1.5px solid var(--yellow)'; shadow = '0 0 8px rgba(245,184,32,.35)'; }
  if (role === 'threat' && color === 'empty') { bg = 'rgba(139,92,246,.18)'; border = '1.5px solid #8b5cf6'; shadow = '0 0 8px rgba(139,92,246,.35)'; }
  if (role === 'support' && color === 'empty') { bg = 'rgba(139,92,246,.08)'; border = '1.5px dashed #8b5cf6'; }
  if (role === 'loser' && color === 'empty') { bg = 'rgba(239,68,68,.18)'; border = '1.5px solid var(--red)'; shadow = '0 0 8px rgba(239,68,68,.35)'; }
  if (role === 'winner' && color === 'empty') { bg = 'rgba(245,184,32,.18)'; border = '1.5px solid var(--yellow)'; shadow = '0 0 8px var(--yellow-g)'; }
  if ((role === 'killing_threat' || role === 'neutralised_threat') && color === 'empty') { bg = 'rgba(249,115,22,.18)'; border = '2px solid #f97316'; shadow = '0 0 8px rgba(249,115,22,.35)'; }
  if ((role === 'dead_threat' || role === 'major_threat') && color === 'empty') { bg = 'rgba(139,92,246,.18)'; border = '2px solid #8b5cf6'; shadow = '0 0 8px rgba(139,92,246,.35)'; }
  if (role === 'pattern_piece' && color === 'empty') { bg = 'rgba(20,184,166,.18)'; border = '2px solid #14b8a6'; shadow = '0 0 8px rgba(20,184,166,.35)'; }
  if (role === 'pattern_piece' && (color === 'red' || color === 'yellow')) { border = '2px solid #14b8a6'; shadow = '0 0 10px rgba(20,184,166,.6)'; }
  if (role === 'figure7_threat' && color === 'empty') { bg = 'rgba(251,191,36,.18)'; border = '2px solid #fbbf24'; shadow = '0 0 8px rgba(251,191,36,.5)'; }
  if (role === 'z_range' && color === 'empty') { bg = 'rgba(245,184,32,.12)'; border = '1.5px dashed var(--yellow)'; }
  if (role === 'ghost_mirror' && color === 'empty') { bg = 'rgba(245,184,32,.35)'; border = '1.5px dashed var(--yellow)'; shadow = '0 0 6px rgba(245,184,32,.3)'; }
  if (role === 'wrong_move' && (color === 'red' || color === 'yellow')) { shadow = '0 0 14px rgba(239,68,68,.7), 0 0 0 2px var(--red)'; }
  if (role === 'correct_reveal' && (color === 'red' || color === 'yellow')) { shadow = '0 0 14px rgba(251,191,36,.7), 0 0 0 2px #fbbf24'; }

  return { background: bg, border, boxShadow: shadow };
}

/**
 * Group a flat list of {c, r} cells into collinear runs and isolated dots.
 * Used for zone types that don't carry window structure (col, row, cNrM, cells:).
 * Runs are tried in order: horizontal → vertical → diagonal↗ → diagonal↘.
 * Each cell is assigned to the first run of ≥2 it starts; leftover cells become dots.
 */
function groupCellsByCapsules(cells) {
  const cellSet = new Set(cells.map(({ c, r }) => `${c},${r}`));
  const dirs = [
    { dc: 1, dr: 0 },
    { dc: 0, dr: 1 },
    { dc: 1, dr: 1 },
    { dc: 1, dr: -1 },
  ];
  const used = new Set();
  const runs = [];

  for (const dir of dirs) {
    for (const cell of cells) {
      const key = `${cell.c},${cell.r}`;
      if (used.has(key)) continue;
      if (cellSet.has(`${cell.c - dir.dc},${cell.r - dir.dr}`)) continue;
      const run = [cell];
      let nc = cell.c + dir.dc, nr = cell.r + dir.dr;
      while (cellSet.has(`${nc},${nr}`)) {
        run.push({ c: nc, r: nr });
        nc += dir.dc;
        nr += dir.dr;
      }
      if (run.length >= 2) {
        run.forEach(({ c, r }) => used.add(`${c},${r}`));
        runs.push({ start: run[0], end: run[run.length - 1] });
      }
    }
  }

  const dots = cells.filter(({ c, r }) => !used.has(`${c},${r}`));
  return { runs, dots };
}

function BoardImpl({
  board = EMPTY_BOARD,
  onColumnClick,
  onCellClick,
  canPlay = false,
  overlays = [],
  badge,
  lastDrop,
  compact = false,
  fullCols = [],
  selectedCols = [],
  onColToggle,
  // Deprecated shim — CurationWorkspace.jsx only. [row, col, role, step?] tuples.
  highlightedCells = [],
  // Numbered move labels keyed "row,col" -> label. Rendered ON TOP of the green/gray disc without
  // recoloring it (unlike the red/yellow shim above). Used by the fv-suff lookahead numbering.
  stepLabels = {},
  // Coach-mention zone highlights — Array<{color: string, cells: Array<{c,r}>}> (0-indexed).
  zhCells = [],
  // Per-cell live-window counts for lesson overlays — (number|null)[6][7], [row][col],
  // row 0 = bottom, null where a disc sits. Rendered only on EMPTY cells.
  windowCounts = null,
  // Deep-reveal-only opt-in (spec 058 US4, FR-014). Renders 1-indexed column numbers above the
  // grid and 1-indexed row numbers to the left, additive to the existing layout — never changes
  // cell size or grid dimensions. Every other caller omits this prop and is visually unchanged.
  showCoordinates = false,
}) {
  const [hoverCol, setHoverCol] = useState(null);

  const ovMap = {};
  overlays.forEach(o => { ovMap[`${o.c},${o.r}`] = o.type; });

  const multiSelectMode = !!onColToggle;
  const pad = compact ? 9 : 11;
  const gap = compact ? 6 : 7;
  const hasBadge = !!badge || selectedCols.length > 0;

  // Track board width for SVG capsule coordinate computation.
  const boardRef = useRef(null);
  const [boardWidth, setBoardWidth] = useState(0);
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBoardWidth(el.getBoundingClientRect().width));
    ro.observe(el);
    setBoardWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  // Build SVG capsule overlay for coach-mention zone highlights.
  // Each zone renders independently so overlapping zones don't steal cells from each other.
  const zhSvg = useMemo(() => {
    if (!zhCells.length || !boardWidth) return null;
    const cellW = (boardWidth - 2 * pad - 6 * gap) / 7;
    const topPad = hasBadge ? pad + 20 : pad;

    function center(col, row) {
      return {
        x: pad + col * (cellW + gap) + cellW / 2,
        y: topPad + (5 - row) * (cellW + gap) + cellW / 2,
      };
    }

    const elements = [];
    let ki = 0;
    for (const { color, cells, windows } of zhCells) {
      let runs, dots;
      if (windows && windows.length > 0) {
        // windows: spec — each window is already a structurally correct threat window;
        // draw one capsule per window (first cell → last cell), no dots.
        runs = windows.map(w => ({ start: w[0], end: w[w.length - 1] }));
        dots = [];
      } else {
        ({ runs, dots } = groupCellsByCapsules(cells));
      }
      for (const { start, end } of runs) {
        const S = center(start.c, start.r);
        const E = center(end.c, end.r);
        elements.push(
          <line key={ki++} x1={S.x} y1={S.y} x2={E.x} y2={E.y}
            stroke={color} strokeWidth={cellW * 0.85} strokeLinecap="round" opacity="0.4" />
        );
      }
      for (const { c, r } of dots) {
        const { x, y } = center(c, r);
        elements.push(
          <circle key={ki++} cx={x} cy={y} r={cellW * 0.43} fill={color} opacity="0.4" />
        );
      }
    }

    return (
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 }}>
        {elements}
      </svg>
    );
  }, [zhCells, boardWidth, pad, gap, hasBadge]);

  // Deep-reveal-only coordinate labels (spec 058 US4, FR-014). Rendered as extra siblings
  // around the existing board markup — the board `<div>` below is byte-identical to the
  // showCoordinates=false case, so cell size/grid dimensions never change.
  const rowLabelWidth = compact ? 16 : 20;

  const boardEl = (
    <div
      ref={boardRef}
      style={{
        background: 'var(--board)',
        borderRadius: 22,
        padding: pad,
        paddingTop: hasBadge ? pad + 20 : pad,
        display: 'flex',
        gap,
        width: '100%',
        boxShadow: 'inset 0 -4px 0 var(--board-edge), var(--shadow-sm)',
        position: 'relative',
      }}
      onMouseLeave={() => setHoverCol(null)}
    >
      {zhSvg}
      {Array.from({ length: COLS }, (_, col) => {
        const colFull = fullCols.includes(col) || board[ROWS - 1]?.[col] !== 'empty';
        const tappable = canPlay && !colFull;
        const isHovered = hoverCol === col && tappable;
        const isSelected = selectedCols.includes(col);

        const handleClick = () => {
          if (!tappable) return;
          if (multiSelectMode) {
            onColToggle(col);
          } else {
            onColumnClick?.(col);
          }
        };

        // Spec 043 US1 (FR-001..FR-006): a11y attributes for the per-column wrapper, derived
        // purely from canPlay/colFull — see contracts/board-a11y-contract.md.
        const a11y = getColumnA11yProps({ col, canPlay, colFull });

        const handleKeyDown = (e) => {
          if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
          // Prevent the page from scrolling on Space; call the exact same handleClick reference
          // used by onClick so the multiSelectMode/onColToggle branch is never reimplemented
          // (contract Invariant I2, FR-004).
          e.preventDefault();
          handleClick();
        };

        const badgeColor =
          badge?.col === col
            ? (badge.type === 'good' ? 'var(--eval-good)' : badge.type === 'mid' ? 'var(--eval-mid)' : 'var(--eval-bad)')
            : null;

        return (
          <div
            key={col}
            className="board-col"
            role={a11y.role}
            aria-label={a11y.ariaLabel}
            tabIndex={a11y.tabIndex}
            aria-disabled={a11y.ariaDisabled}
            style={{
              flex: '1 1 0',
              display: 'flex',
              flexDirection: 'column',
              gap,
              position: 'relative',
              borderRadius: 12,
              cursor: tappable ? 'pointer' : 'default',
              background: isSelected
                ? 'rgba(232,84,62,0.10)'
                : (isHovered ? 'rgba(47,170,90,0.12)' : 'transparent'),
              boxShadow: isHovered ? '0 0 0 4px rgba(47,170,90,0.12)' : 'none',
              transition: 'background .12s',
              WebkitTapHighlightColor: 'transparent',
              userSelect: 'none',
            }}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            onMouseEnter={() => setHoverCol(col)}
          >
            {/* Hover arrow (chevD) above interactive column */}
            {isHovered && !multiSelectMode && (
              <span style={{
                position: 'absolute', top: -19, left: '50%', transform: 'translateX(-50%)',
                color: 'var(--disc-green)', pointerEvents: 'none', opacity: 1, transition: 'opacity .12s',
              }}>
                <Icon name="chevD" size={18} color="var(--disc-green)" />
              </span>
            )}

            {/* Eval badge from badge prop */}
            {badge?.col === col && (
              <span style={{
                position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)',
                width: 32, height: 32, borderRadius: '50%',
                display: 'grid', placeItems: 'center',
                fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17, color: '#fff',
                zIndex: 8, boxShadow: '0 3px 8px rgba(0,0,0,0.25)', border: '3px solid #fff',
                animation: 'bubbleIn .3s',
                background: badgeColor,
              }}>
                {badge.label}
              </span>
            )}

            {/* Selected column flag badge */}
            {isSelected && (
              <span style={{
                position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)',
                width: 28, height: 28, borderRadius: '50%',
                display: 'grid', placeItems: 'center',
                color: '#fff',
                zIndex: 8, background: 'var(--eval-mid)', border: '2px solid #fff',
              }}>
                <Icon name="flag" size={14} color="#fff" strokeWidth={2.5} />
              </span>
            )}

            {/* Cells: row 5 (top) → row 0 (bottom) */}
            {[5, 4, 3, 2, 1, 0].map(r => {
              const value = board[r]?.[col] ?? 'empty';
              const ovType = ovMap[`${col},${r}`];
              const stepLabel = stepLabels[`${r},${col}`];
              const windowCount = windowCounts?.[r]?.[col] ?? null;
              // Deprecated shim lookup
              const shimEntry = highlightedCells.find(([hr, hc]) => hr === r && hc === col);
              const shimRole = shimEntry?.[2] ?? null;
              const shimStep = shimEntry?.[3] ?? null;

              const stepColor = (value === 'red' || value === 'yellow')
                ? 'rgba(255,255,255,0.9)'
                : (shimRole === 'winner' ? 'var(--yellow)' : 'var(--red)');

              return (
                <div
                  key={r}
                  onClick={onCellClick ? (e) => { e.stopPropagation(); onCellClick(col, r); } : undefined}
                  style={{
                    aspectRatio: 1,
                    borderRadius: '50%',
                    background: 'var(--hole)',
                    boxShadow: 'inset 0 3px 5px rgba(150,120,60,0.28), inset 0 -1px 0 rgba(255,255,255,0.6)',
                    position: 'relative',
                    display: 'grid',
                    placeItems: 'center',
                    cursor: onCellClick ? 'crosshair' : undefined,
                  }}
                >
                  {/* New-API disc (green/gray) — skipped when shim overrides this cell.
                      The 'red'/'yellow' cell values are kept for historical reasons:
                      they are player-1/player-2 identity tokens, not display colors.
                      'red' → GREEN disc (--disc-green), 'yellow' → GRAY disc (--disc-gray). */}
                  {value !== 'empty' && !shimRole && (
                    <div style={{
                      width: '84%', height: '84%', borderRadius: '50%', position: 'relative',
                      ...(value === 'red'
                        ? { background: 'radial-gradient(circle at 35% 28%, var(--disc-green-hi), var(--disc-green) 70%)', boxShadow: 'inset 0 -3px 4px rgba(0,0,0,0.18), 0 1px 2px rgba(0,0,0,.15)' }
                        : { background: 'radial-gradient(circle at 35% 28%, var(--disc-gray-hi), var(--disc-gray) 70%)', boxShadow: 'inset 0 -3px 4px rgba(0,0,0,0.28), 0 1px 2px rgba(0,0,0,.18)' }
                      ),
                      animation: lastDrop && col === lastDrop.c && r === lastDrop.r
                        ? 'drop 0.5s ease-out'
                        : 'none',
                    }}>
                      {/* Specular highlight */}
                      <span style={{ position: 'absolute', inset: '22% 22% auto 22%', height: '26%', borderRadius: '50%', background: 'rgba(255,255,255,0.22)' }} />
                    </div>
                  )}

                  {/* Numbered lookahead label — keeps the green/gray disc, adds a teal ring + number */}
                  {stepLabel != null && value !== 'empty' && (
                    <div style={{
                      position: 'absolute', inset: 0, borderRadius: '50%',
                      boxShadow: '0 0 0 2px #14b8a6, 0 0 8px rgba(20,184,166,.6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      pointerEvents: 'none', userSelect: 'none',
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,.6)' }}>{stepLabel}</span>
                    </div>
                  )}

                  {/* win overlay: pulsing ring outside the disc */}
                  {ovType === 'win' && (
                    <span style={{
                      position: 'absolute', inset: -2, borderRadius: '50%',
                      boxShadow: '0 0 0 3px var(--eval-good)',
                      animation: 'pulse 1.4s infinite',
                    }} />
                  )}

                  {/* tg / td / tr / claim overlays */}
                  {ovType && ovType !== 'win' && (
                    <span style={{
                      position: 'absolute', inset: '6%', borderRadius: '50%', pointerEvents: 'none',
                      ...(ovType === 'tg'    ? { background: 'var(--threat-green)', boxShadow: '0 0 0 2px rgba(47,170,90,.5) inset' } :
                          ovType === 'td'    ? { background: 'var(--threat-gray)',  boxShadow: '0 0 0 2px rgba(60,66,80,.5) inset' } :
                          ovType === 'tr'    ? { background: 'var(--threat-red)',   boxShadow: '0 0 0 2px rgba(232,84,62,.6) inset' } :
                          ovType === 'claim' ? { background: 'var(--claim)',        boxShadow: '0 0 0 2px rgba(245,166,35,.7) inset' } :
                          {}),
                    }} />
                  )}

                  {/* Live-window count — how many four-in-a-rows the learner can still
                      finish through this square. Empty cells only. The tint is suppressed
                      where a per-cell overlay already colours the cell (slide 4 rings the
                      two cells its coach text compares), so the two never muddy. */}
                  {windowCount != null && value === 'empty' && (
                    <span style={{
                      position: 'absolute', inset: '8%', borderRadius: '50%',
                      background: ovType ? 'transparent' : windowCountTint(windowCount),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      pointerEvents: 'none', userSelect: 'none',
                    }}>
                      <span style={{
                        fontSize: compact ? 10 : 12,
                        fontWeight: 800,
                        color: 'var(--ink)',
                      }}>{windowCount}</span>
                    </span>
                  )}

                  {/* Deprecated shim: curation-role highlight (CurationWorkspace.jsx only) */}
                  {shimRole !== null && (
                    <div style={{
                      position: 'absolute', inset: 0, borderRadius: '50%',
                      transition: 'background .1s, box-shadow .1s',
                      ...shimStyle(value, shimRole),
                    }}>
                      {shimStep !== null && (
                        <span style={{
                          position: 'absolute', inset: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 13, fontWeight: 800, color: stepColor,
                          pointerEvents: 'none', userSelect: 'none',
                        }}>
                          {shimStep}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );

  if (!showCoordinates) return boardEl;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }} data-testid="board-coordinates-wrap">
      {/* Column numbers (1-indexed, per CLAUDE.md frontend display convention). Uses the exact
          same pad/gap/flex('1 1 0') recipe as the column divs below so headers line up with
          their columns without needing pixel measurement. */}
      <div
        style={{
          display: 'flex',
          gap,
          paddingLeft: rowLabelWidth + 4 + pad,
          paddingRight: pad,
        }}
      >
        {getColumnLabels().map(n => (
          <div key={n} style={{ flex: '1 1 0', textAlign: 'center', fontSize: compact ? 10 : 12, fontWeight: 700, color: 'var(--ink-soft, #6b7280)' }}>
            {n}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {/* Row numbers (1-indexed), top→bottom matching the board's internal row 5→0 render order. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap, width: rowLabelWidth, paddingTop: pad + (hasBadge ? 20 : 0), paddingBottom: pad }}>
          {getRowLabels().map(n => (
            <div key={n} style={{ flex: '1 1 0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: compact ? 10 : 12, fontWeight: 700, color: 'var(--ink-soft, #6b7280)' }}>
              {n}
            </div>
          ))}
        </div>
        {boardEl}
      </div>
    </div>
  );
}

// Memoized with a value-based comparator (boardPropsAreEqual, above) so a
// parent re-render triggered by unrelated state (e.g. coach-narration state)
// does not force Board to rebuild every already-placed-disc cell when the
// board/overlays/etc. are value-unchanged. See spec 046 US5 (FR-022).
export const Board = memo(BoardImpl, boardPropsAreEqual);
