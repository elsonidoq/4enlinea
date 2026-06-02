import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Board } from '../components/Board.jsx';
import { CoachDialog } from '../components/CoachDialog.jsx';
import { TopBar } from '../components/TopBar.jsx';
import { Toolbar } from '../components/Toolbar.jsx';
import { AuthModal } from '../components/AuthModal.jsx';
import { Icon } from '../components/Icon.jsx';
import { useStore } from '../store/ProfileStore.jsx';
import { useGameBoard } from '../lib/useGameBoard.js';
import { buildBoard } from '../lib/board.js';
import { track } from '../lib/track.js';
import ReactMarkdown from 'react-markdown';

const API = import.meta.env.VITE_API_BASE_URL || '';

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
function ExplorerBoard({ rewindedMoves, trOverlay, side, difficulty, gameId, moveIndex, patternTag }) {
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

  const showTrOverlay = trOverlay && gameBoard.moveHistory.length === rewindedMoves.length;
  const overlays = [
    ...(showTrOverlay ? [trOverlay] : []),
    ...gameBoard.hintOverlays,
  ];

  return (
    <>
      <CoachDialog fixed messages={gameBoard.coachMessages} />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 12px' }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          {gameBoard.gameOver && (
            <p style={{ textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--ink-soft)', margin: '0 0 12px' }}>
              {t('sparring.terminalPosition')}
            </p>
          )}
          <Board
            board={gameBoard.board}
            onColumnClick={gameBoard.handleColumnClick}
            canPlay={gameBoard.userTurn && !gameBoard.gameOver && !gameBoard.aiThinking}
            fullCols={gameBoard.fullCols}
            lastDrop={gameBoard.lastDrop}
            overlays={overlays}
          />
        </div>
      </div>
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
  const { session } = useStore();

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

  // ── "Start from here" state ───────────────────────────────────────
  const [fromPositionError, setFromPositionError] = useState(null);

  async function handleStartFromHere() {
    setFromPositionError(null);
    const N = currentRewindedMoves.length;
    try {
      const res = await fetch(`${API}/api/games/from-position`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, N, difficulty }),
      });
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      go('game', { initialMoves: data.moves, side: data.side, difficulty: data.difficulty });
    } catch {
      setFromPositionError(t('sparring.reviewError'));
    }
  }

  // ── Deep Reveal state ─────────────────────────────────────────────
  const [deepRevealOpen, setDeepRevealOpen] = useState(false);
  const [deepRevealLoading, setDeepRevealLoading] = useState(false);
  const [deepRevealExplanation, setDeepRevealExplanation] = useState(null);
  const [deepRevealBestLine, setDeepRevealBestLine] = useState([]);
  const [deepRevealCached, setDeepRevealCached] = useState(false);
  const [deepRevealError, setDeepRevealError] = useState(null);
  const [flagged, setFlagged] = useState(false);
  const [flagOpen, setFlagOpen] = useState(false);
  const [flagNote, setFlagNote] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);

  async function handleDeepReveal() {
    setDeepRevealOpen(true);
    setDeepRevealLoading(true);
    setDeepRevealExplanation(null);
    setDeepRevealError(null);
    setFlagged(false);
    setFlagOpen(false);
    setFlagNote('');

    if (!session?.access_token) {
      setDeepRevealOpen(false);
      setShowAuthModal(true);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const res = await fetch(`${API}/api/explain-move-llm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          movestring: currentRewindedMoves,
          col: currentSelectedMove?.col,
        }),
      });
      clearTimeout(timeoutId);

      if (res.status === 401) {
        setDeepRevealOpen(false);
        setShowAuthModal(true);
        return;
      }

      const data = await res.json();
      setDeepRevealExplanation(data.explanation || data.one_liner || '');
      setDeepRevealBestLine(data.bestLine || []);
      setDeepRevealCached(data.cached || false);
      setDeepRevealLoading(false);

      track('deep_reveal_viewed', { context: 'position_explorer', cached: data.cached || false });
    } catch {
      clearTimeout(timeoutId);
      setDeepRevealLoading(false);
      const fallback = currentSelectedMove?.patternTag
        ? t(`coach.categories.${currentSelectedMove.patternTag}`, currentSelectedMove.patternTag)
        : t('coach.sparring.user_move.generic.0', 'Try a different approach.');
      setDeepRevealError(fallback);
    }
  }

  async function handleFlag(note = '') {
    if (flagged) return;
    setFlagged(true);
    setFlagOpen(false);
    try {
      await fetch(`${API}/api/llm-feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movestring: currentRewindedMoves,
          llm_prompt: '',
          llm_response: deepRevealExplanation || '',
          human_note: note,
          feature: 'position_explorer',
        }),
      });
    } catch {
      // silent
    }
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

      {/* ExplorerBoard is keyed on selectedMistakeIdx — React remounts it (and its
          useGameBoard hook) whenever the user navigates to a different mistake. */}
      <ExplorerBoard
        key={selectedMistakeIdx}
        rewindedMoves={currentRewindedMoves}
        trOverlay={currentTrOverlay}
        side={side}
        difficulty={difficulty}
        gameId={gameId}
        moveIndex={currentMoveIndex}
        patternTag={currentSelectedMove?.patternTag}
      />

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

      {/* Deep Reveal bottom-sheet panel */}
      {deepRevealOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setDeepRevealOpen(false)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200,
            }}
          />

          {/* Sheet */}
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
            background: '#fff', borderRadius: '20px 20px 0 0',
            padding: '14px 20px 32px',
            maxHeight: '80vh', overflowY: 'auto',
            boxShadow: '0 -4px 24px rgba(0,0,0,0.18)',
          }}>
            {/* Grab handle */}
            <div style={{ width: 40, height: 4, borderRadius: 2, background: '#e2ddd2', margin: '0 auto 12px' }} />

            {/* Collapse button */}
            <button
              onClick={() => setDeepRevealOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: 'transparent', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 13,
                color: 'var(--ink-soft)', marginBottom: 14,
              }}
            >
              <Icon name="chevD" size={16} /> {t('common.collapse', 'Collapse')}
            </button>

            {/* Loading spinner */}
            {deepRevealLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0', gap: 12 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  border: '3px solid #e2ddd2', borderTopColor: 'var(--disc-green)',
                  animation: 'spin 0.7s linear infinite',
                }} />
                <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--ink-soft)' }}>
                  {t('deepReveal.loading', 'Reading the position…')}
                </p>
              </div>
            )}

            {/* Timeout / error fallback */}
            {!deepRevealLoading && deepRevealError && (
              <div style={{ padding: '8px 0' }}>
                <p style={{ margin: '0 0 6px', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>
                  {deepRevealError}
                </p>
                <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--ink-soft)' }}>
                  {t('sparring.explanationUnavailable')}
                </p>
              </div>
            )}

            {/* Explanation */}
            {!deepRevealLoading && !deepRevealError && deepRevealExplanation && (
              <div>
                {/* Pattern tag if available */}
                {currentSelectedMove?.patternTag && (
                  <div style={{ marginBottom: 12 }}>
                    <span style={{
                      background: 'var(--tag-bg, #f3f0ea)', borderRadius: 8, padding: '4px 10px',
                      fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 12, color: 'var(--ink)',
                    }}>
                      {currentSelectedMove.patternTag.replace(/_/g, ' ')}
                    </span>
                  </div>
                )}

                {/* LLM explanation */}
                <div style={{
                  margin: '0 0 14px',
                  fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.6,
                  color: 'var(--ink)',
                }}>
                  <ReactMarkdown>{deepRevealExplanation}</ReactMarkdown>
                </div>

                {/* Best line chips */}
                {deepRevealBestLine.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{
                      fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 11,
                      letterSpacing: '1.2px', color: 'var(--ink-soft)', marginBottom: 7,
                    }}>
                      BEST LINE
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                      {deepRevealBestLine.map((col, i) => (
                        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{
                            background: 'var(--tag-bg, #f3f0ea)', borderRadius: 8,
                            padding: '4px 10px',
                            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13,
                            color: 'var(--ink)',
                          }}>
                            {col}
                          </span>
                          {i < deepRevealBestLine.length - 1 && (
                            <Icon name="chevR" size={14} color="var(--ink-soft)" />
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Flag button */}
                <div style={{ marginTop: 6 }}>
                  {flagged ? (
                    <div style={{ textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink-soft)',
                      }}>
                        <Icon name="check" size={15} color="var(--eval-good,#16a34a)" />
                        {t('sparring.explanationFlagged')}
                      </span>
                    </div>
                  ) : flagOpen ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <textarea
                        autoFocus
                        value={flagNote}
                        onChange={e => setFlagNote(e.target.value)}
                        placeholder={t('deepReveal.flagNotePlaceholder', "What's wrong with this explanation? (optional)")}
                        rows={3}
                        style={{
                          width: '100%', boxSizing: 'border-box', resize: 'none',
                          fontFamily: 'var(--font-body)', fontSize: 13,
                          border: '1px solid var(--border-dim)', borderRadius: 8,
                          padding: '6px 8px', colorScheme: 'light',
                        }}
                      />
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => { setFlagOpen(false); setFlagNote(''); }}
                          style={{
                            background: 'transparent', border: 'none', cursor: 'pointer',
                            fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink-soft)',
                          }}
                        >
                          {t('deepReveal.flagCancel', 'Cancel')}
                        </button>
                        <button
                          onClick={() => handleFlag(flagNote.trim())}
                          style={{
                            background: 'var(--eval-bad)', border: 'none', cursor: 'pointer',
                            fontFamily: 'var(--font-body)', fontSize: 13, color: '#fff',
                            borderRadius: 6, padding: '4px 12px',
                          }}
                        >
                          {t('deepReveal.flagSend', 'Send')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => setFlagOpen(true)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          background: 'transparent', border: 'none', cursor: 'pointer',
                          fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink-soft)',
                        }}
                      >
                        <Icon name="flag" size={15} />
                        {t('sparring.flagExplanation')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Auth modal */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          reason="deep_reveal"
        />
      )}
    </div>
  );
}
