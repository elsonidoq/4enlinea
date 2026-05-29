import { useState } from 'react';
import { Icon } from './Icon.jsx';

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

export function Board({
  board = EMPTY_BOARD,
  onColumnClick,
  canPlay = false,
  overlays = [],
  badge,
  lastDrop,
  compact = false,
  fullCols = [],
  selectedCols = [],
  onColToggle,
  interactionMode = 'single_move',
  // Deprecated shim — CurationWorkspace.jsx only. [row, col, role, step?] tuples.
  highlightedCells = [],
}) {
  const [hoverCol, setHoverCol] = useState(null);

  const ovMap = {};
  overlays.forEach(o => { ovMap[`${o.c},${o.r}`] = o.type; });

  const multiSelectMode = !!onColToggle;
  const pad = compact ? 9 : 11;
  const gap = compact ? 6 : 7;
  const hasBadge = !!badge || selectedCols.length > 0;

  return (
    <div
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

        const badgeColor =
          badge?.col === col
            ? (badge.type === 'good' ? 'var(--eval-good)' : badge.type === 'mid' ? 'var(--eval-mid)' : 'var(--eval-bad)')
            : null;

        return (
          <div
            key={col}
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

            {/* Selected column ✕ badge */}
            {isSelected && (
              <span style={{
                position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)',
                width: 28, height: 28, borderRadius: '50%',
                display: 'grid', placeItems: 'center',
                fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, color: '#fff',
                zIndex: 8, background: 'var(--eval-bad)', border: '2px solid #fff',
              }}>
                ✕
              </span>
            )}

            {/* Cells: row 5 (top) → row 0 (bottom) */}
            {[5, 4, 3, 2, 1, 0].map(r => {
              const value = board[r]?.[col] ?? 'empty';
              const ovType = ovMap[`${col},${r}`];
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
                  style={{
                    aspectRatio: 1,
                    borderRadius: '50%',
                    background: 'var(--hole)',
                    boxShadow: 'inset 0 3px 5px rgba(150,120,60,0.28), inset 0 -1px 0 rgba(255,255,255,0.6)',
                    position: 'relative',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  {/* New-API disc (green/gray) — skipped when shim overrides this cell */}
                  {value !== 'empty' && !shimRole && (
                    <div style={{
                      width: '84%', height: '84%', borderRadius: '50%', position: 'relative',
                      ...(value === 'red'
                        ? { background: 'radial-gradient(circle at 35% 28%, var(--disc-green-hi), var(--disc-green) 70%)', boxShadow: 'inset 0 -3px 4px rgba(0,0,0,0.18), 0 1px 2px rgba(0,0,0,.15)' }
                        : { background: 'radial-gradient(circle at 35% 28%, var(--disc-gray-hi), var(--disc-gray) 70%)', boxShadow: 'inset 0 -3px 4px rgba(0,0,0,0.28), 0 1px 2px rgba(0,0,0,.18)' }
                      ),
                      animation: 'drop 0.5s ease-out',
                    }}>
                      {/* Specular highlight */}
                      <span style={{ position: 'absolute', inset: '22% 22% auto 22%', height: '26%', borderRadius: '50%', background: 'rgba(255,255,255,0.22)' }} />
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
}
