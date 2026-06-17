import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Board } from '../components/Board.jsx';
import { CoachDialog } from '../components/CoachDialog.jsx';
import { TopBar } from '../components/TopBar.jsx';
import { Toolbar } from '../components/Toolbar.jsx';
import { useGameBoard } from '../lib/useGameBoard.js';
import { buildBoard, getMajorThreatCells } from '../lib/board.js';
import { track } from '../lib/track.js';
import { DeepRevealPane } from '../components/DeepRevealPane.jsx';

const API = import.meta.env.VITE_API_BASE_URL || '';

const DIFFICULTIES = [
  { key: 'easy',    subtitleKey: 'sparring.easySub' },
  { key: 'medium',  subtitleKey: 'sparring.mediumSub', isDefault: true },
  { key: 'hard',    subtitleKey: 'sparring.hardSub' },
  { key: 'perfect', subtitleKey: 'sparring.perfectSub' },
];

function getRewindedMoves(mIdx, side, fullMovestring) {
  const totalPliesBefore = side === 'first'
    ? (mIdx - 1) * 2
    : (mIdx - 1) * 2 + 1;
  return fullMovestring.slice(0, totalPliesBefore);
}

/**
 * Inner component that owns useGameBoard so React fully remounts it
 * (and reinitializes the hook) when the key changes (mistake navigation).
 */
function ExplorerBoard({ rewindedMoves, trOverlay, side, difficulty, gameId, moveIndex, patternTag, zhCells, hideCoach, onCoachMessages }) {
  const { t } = useTranslation();
  const gameBoard = useGameBoard({
    initialMoves: rewindedMoves,
    side,
    difficulty,
    onGameEnd: () => {},
    introKey: 'coach.sparring.explorer.intro',
  });

  useEffect(() => {
    track('mistake_reviewed', { gameId, moveIndex, category: patternTag ?? null });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Expose coach messages to parent when coach is rendered externally.
  useEffect(() => {
    if (hideCoach && onCoachMessages) {
      onCoachMessages(gameBoard.coachMessages);
    }
  }, [hideCoach, onCoachMessages, gameBoard.coachMessages]);

  const showTrOverlay = trOverlay && gameBoard.moveHistory.length === rewindedMoves.length;
  const overlays = [
    ...(showTrOverlay ? [trOverlay] : []),
    ...gameBoard.hintOverlays,
  ];

  const boardEl = (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 12px' }}>
      <div style={{ width: '100%', maxWidth: hideCoach ? undefined : 380 }}>
        {gameBoard.gameOver && (
          <p style={{ textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--ink-soft)', margin: '0 0 12px' }}>
            {t('sparring.terminalPosition')}
          </p>
        )}
        {/*
          lastDrop audit (034): lastDrop={gameBoard.lastDrop} from useGameBoard hook.
          Explorer is an interactive replay tool — user clicks columns to replay moves.
          Drop animation on each replay step is intentional. OK.
        */}
        <Board
          board={gameBoard.board}
          onColumnClick={gameBoard.handleColumnClick}
          canPlay={gameBoard.userTurn && !gameBoard.gameOver && !gameBoard.aiThinking}
          fullCols={gameBoard.fullCols}
          lastDrop={gameBoard.lastDrop}
          overlays={overlays}
          zhCells={zhCells}
        />
      </div>
    </div>
  );

  if (hideCoach) return boardEl;

  return (
    <>
      <CoachDialog fixed messages={gameBoard.coachMessages} />
      {boardEl}
    </>
  );
}

/**
 * ExplorerScreen — interactive mistake explorer for post-game review.
 *
 * Props:
 *   go, goBack           — navigation
 *   gameId               — sparring game UUID
 *   moveIndex            — 1-based user-move ordinal of the initially selected mistake
 *   moves                — AnalyzedMove[] from /api/games/analyze
 *   difficulty           — game difficulty string
 *   side                 — 'first' | 'second'
 *   fullMovestring       — complete game movestring
 */
function PlayerColorChip({ side }) {
  const isGreen = side === 'first';
  const discColor = isGreen ? 'var(--disc-green)' : 'var(--disc-gray)';
  const label = isGreen ? 'You played Green' : 'You played Gray';
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      borderRadius: 20,
      padding: '4px 12px',
      background: 'var(--card)',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <span style={{
        width: 12,
        height: 12,
        borderRadius: '50%',
        background: discColor,
        flexShrink: 0,
      }} />
      <span style={{
        fontFamily: "'Baloo 2', cursive, var(--font-body)",
        fontWeight: 600,
        fontSize: 13,
        color: 'var(--ink)',
        whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
    </div>
  );
}

export function ExplorerScreen({
  go,
  goBack,
  gameId,
  moveIndex,
  moves,
  difficulty,
  side,
  fullMovestring,
}) {
  const { t } = useTranslation();

  const mistakeIndices = (moves || [])
    .filter(m => m.quality !== 'optimal')
    .map(m => m.moveIndex);

  const [selectedMistakeIdx, setSelectedMistakeIdx] = useState(
    Math.max(0, mistakeIndices.indexOf(moveIndex))
  );

  const currentMoveIndex = mistakeIndices[selectedMistakeIdx] ?? moveIndex;
  const currentRewindedMoves = getRewindedMoves(currentMoveIndex, side, fullMovestring || '');
  const currentSelectedMove = (moves || []).find(m => m.moveIndex === currentMoveIndex);

  const { heights: rewindedHeights } = buildBoard(currentRewindedMoves);
  const currentTrOverlay = currentSelectedMove
    ? { c: currentSelectedMove.col, r: rewindedHeights[currentSelectedMove.col], type: 'tr' }
    : null;

  // Stable reference — avoids AnnotatedExplanation re-render loop.
  const userMajorThreats = useMemo(() => {
    if (!currentRewindedMoves) return [];
    const { board: b } = buildBoard(currentRewindedMoves);
    const threats = getMajorThreatCells(b);
    const userColor = side === 'first' ? 'red' : 'yellow';
    const isMajor = userColor === 'red' ? 'rm' : 'ym';
    return Object.entries(threats)
      .filter(([, v]) => v[isMajor])
      .map(([key]) => {
        const [r, c] = key.split(',').map(Number);
        return { c, r };
      });
  }, [currentRewindedMoves, side]);

  // ── "Start from here" state ───────────────────────────────────────
  const [fromPositionError, setFromPositionError] = useState(null);
  const [diffPickerOpen, setDiffPickerOpen] = useState(false);
  const [pickedDifficulty, setPickedDifficulty] = useState('medium');

  async function doStartFromHere(diff) {
    setFromPositionError(null);
    const N = currentRewindedMoves.length;
    try {
      const res = await fetch(`${API}/api/games/from-position`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, N, difficulty: diff }),
      });
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      go('game', { initialMoves: data.moves, side: data.side, difficulty: data.difficulty });
    } catch {
      setFromPositionError(t('sparring.reviewError'));
    }
  }

  function handleStartFromHere() {
    if (!difficulty) {
      setDiffPickerOpen(true);
    } else {
      doStartFromHere(difficulty);
    }
  }

  // ── Deep Reveal state ─────────────────────────────────────────────
  const [deepRevealOpen, setDeepRevealOpen] = useState(false);
  const [zhCells, setZhCells] = useState([]);
  const [coachMessages, setCoachMessages] = useState([]);

  // Stable callback so ExplorerBoard doesn't re-render loop.
  const handleCoachMessages = useCallback((msgs) => {
    setCoachMessages(msgs);
  }, []);

  function handleDeepReveal() {
    setDeepRevealOpen(true);
  }

  function handlePrevMistake() {
    if (selectedMistakeIdx === 0) return;
    setSelectedMistakeIdx(i => i - 1);
    setDeepRevealOpen(false);
    setFromPositionError(null);
  }

  function handleNextMistake() {
    if (selectedMistakeIdx === mistakeIndices.length - 1) return;
    setSelectedMistakeIdx(i => i + 1);
    setDeepRevealOpen(false);
    setFromPositionError(null);
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar title={t('sparring.explorerTitle')} onBack={goBack} />

      {/* Player color chip */}
      {side && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '4px 16px 0',
        }}>
          <PlayerColorChip side={side} />
        </div>
      )}

      {/* ExplorerBoard is keyed on selectedMistakeIdx — React remounts it (and its
          useGameBoard hook) whenever the user navigates to a different mistake. */}
      {deepRevealOpen ? (
        <>
          <CoachDialog messages={coachMessages} size={58} />
          <DeepRevealPane
            isOpen={deepRevealOpen}
            onClose={() => setDeepRevealOpen(false)}
            closeLabel={t('common.collapse', 'Collapse')}
            moveString={currentRewindedMoves}
            col={currentSelectedMove?.col}
            feature="position_explorer"
            onReveal={d => track('deep_reveal_viewed', { context: 'position_explorer', cached: d.cached ?? false })}
            onZhCellsChange={setZhCells}
            userMajorThreats={userMajorThreats}
            headerContent={currentSelectedMove?.patternTag && (
              <div style={{ marginBottom: 12 }}>
                <span style={{
                  background: 'var(--tag-bg, #f3f0ea)', borderRadius: 8, padding: '4px 10px',
                  fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 12, color: 'var(--ink)',
                }}>
                  {currentSelectedMove.patternTag.replace(/_/g, ' ')}
                </span>
              </div>
            )}
            timeoutContent={
              <p style={{ margin: '0 0 6px', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>
                {currentSelectedMove?.patternTag
                  ? t(`mistakes.pattern.${currentSelectedMove.patternTag}`, currentSelectedMove.patternTag)
                  : t('coach.generic.suboptimal.0')}
              </p>
            }
            boardContent={
              <ExplorerBoard
                key={selectedMistakeIdx}
                rewindedMoves={currentRewindedMoves}
                trOverlay={currentTrOverlay}
                side={side}
                difficulty={difficulty}
                gameId={gameId}
                moveIndex={currentMoveIndex}
                patternTag={currentSelectedMove?.patternTag}
                zhCells={zhCells}
                hideCoach
                onCoachMessages={handleCoachMessages}
              />
            }
          />
        </>
      ) : (
        <ExplorerBoard
          key={selectedMistakeIdx}
          rewindedMoves={currentRewindedMoves}
          trOverlay={currentTrOverlay}
          side={side}
          difficulty={difficulty}
          gameId={gameId}
          moveIndex={currentMoveIndex}
          patternTag={currentSelectedMove?.patternTag}
          zhCells={zhCells}
        />
      )}

      {/* Inline error for "start from here" */}
      {fromPositionError && (
        <p style={{
          color: 'var(--eval-bad)',
          textAlign: 'center',
          fontFamily: 'var(--font-body)',
          fontSize: 13,
          margin: '0 18px 8px',
        }}>
          {fromPositionError}
        </p>
      )}

      {/* Toolbar */}
      <Toolbar>
        <button
          type="button"
          disabled={selectedMistakeIdx === 0}
          onClick={handlePrevMistake}
          style={{
            flex: 1,
            padding: '12px 0',
            borderRadius: 14,
            border: 'none',
            background: 'rgba(0,0,0,0.06)',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 14,
            color: 'var(--ink)',
            cursor: selectedMistakeIdx === 0 ? 'default' : 'pointer',
            opacity: selectedMistakeIdx === 0 ? 0.4 : 1,
          }}
        >
          {t('sparring.prevMistake')}
        </button>

        <button
          type="button"
          disabled={selectedMistakeIdx === mistakeIndices.length - 1}
          onClick={handleNextMistake}
          style={{
            flex: 1,
            padding: '12px 0',
            borderRadius: 14,
            border: 'none',
            background: 'rgba(0,0,0,0.06)',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 14,
            color: 'var(--ink)',
            cursor: selectedMistakeIdx === mistakeIndices.length - 1 ? 'default' : 'pointer',
            opacity: selectedMistakeIdx === mistakeIndices.length - 1 ? 0.4 : 1,
          }}
        >
          {t('sparring.nextMistake')}
        </button>

        <button
          type="button"
          onClick={handleStartFromHere}
          style={{
            flex: 1,
            padding: '12px 0',
            borderRadius: 14,
            border: 'none',
            background: 'rgba(0,0,0,0.06)',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 13,
            color: 'var(--ink)',
            cursor: 'pointer',
          }}
        >
          {t('sparring.startFromHere')}
        </button>

        <button
          type="button"
          onClick={handleDeepReveal}
          style={{
            flex: 1,
            padding: '12px 0',
            borderRadius: 14,
            border: 'none',
            background: 'var(--disc-green, #2e9e57)',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 13,
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          {t('sparring.deepReveal')}
        </button>
      </Toolbar>

      {/* Difficulty picker bottom sheet — shown when papergames review has no difficulty */}
      {diffPickerOpen && (
        <>
          <div
            onClick={() => setDiffPickerOpen(false)}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.45)',
              zIndex: 100,
            }}
          />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            background: '#fff',
            colorScheme: 'light',
            borderRadius: '20px 20px 0 0',
            padding: '20px 18px 32px',
            zIndex: 101,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 15,
              color: 'var(--ink-soft)',
              marginBottom: 2,
            }}>
              {t('sparring.chooseDifficulty')}
            </div>

            {DIFFICULTIES.map(d => {
              const selected = pickedDifficulty === d.key;
              return (
                <button
                  key={d.key}
                  onClick={() => setPickedDifficulty(d.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '16px 18px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--card)',
                    border: '2px solid',
                    borderColor: selected ? 'var(--disc-green)' : 'var(--line)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    fontFamily: 'inherit',
                    transition: 'border-color .12s, box-shadow .12s',
                    boxShadow: selected ? 'var(--shadow-sm)' : 'none',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{
                        fontFamily: 'var(--font-display)',
                        fontWeight: 700,
                        fontSize: 17,
                        color: 'var(--ink)',
                      }}>
                        {t(`sparring.${d.key}`)}
                      </span>
                      {d.isDefault && (
                        <span style={{
                          fontSize: 11,
                          fontWeight: 800,
                          fontFamily: 'var(--font-display)',
                          padding: '2px 8px',
                          borderRadius: 6,
                          background: 'var(--eval-good-bg)',
                          color: 'var(--disc-green)',
                          letterSpacing: 0.3,
                        }}>
                          DEFAULT
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 13,
                      color: 'var(--ink-soft)',
                      marginTop: 3,
                      lineHeight: 1.3,
                    }}>
                      {t(d.subtitleKey)}
                    </div>
                  </div>
                  <div style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    border: '2.5px solid',
                    borderColor: selected ? 'var(--disc-green)' : 'var(--ink-faint)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'border-color .12s',
                  }}>
                    {selected && (
                      <div style={{
                        width: 13,
                        height: 13,
                        borderRadius: '50%',
                        background: 'var(--disc-green)',
                      }} />
                    )}
                  </div>
                </button>
              );
            })}

            <button
              className="btn btn-primary"
              onClick={() => { setDiffPickerOpen(false); doStartFromHere(pickedDifficulty); }}
              style={{ marginTop: 6 }}
            >
              {t('sparring.startGame')}
            </button>
          </div>
        </>
      )}

    </div>
  );
}
