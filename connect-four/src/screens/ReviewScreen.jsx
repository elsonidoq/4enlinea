import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Board } from '../components/Board.jsx';
import { CoachDialog } from '../components/CoachDialog.jsx';
import { TopBar } from '../components/TopBar.jsx';
import { useStore } from '../store/ProfileStore.jsx';
import { track } from '../lib/track.js';
import { buildBoard } from '../lib/board.js';
import { PAID_CATEGORIES } from '../lib/categories.js';
import { useCoachSpeech } from '../lib/useCoachSpeech.js';
import { shouldContinuePaging } from '../lib/coachQueuePagination.js';

const API = import.meta.env.VITE_API_BASE_URL || '';

// Page size used while paging the coach queue to completion (FR-003a).
const QUEUE_PAGE_LIMIT = 200;

// Pages GET /api/coach/queue?<queueParam> to completion, per FR-003a — no consumer may rely on
// a single default-sized page. Returns the accumulated blunders array (unsorted).
async function fetchAllQueueBlunders(queueParam) {
  let offset = 0;
  let accumulated = [];
  let total = Infinity;
  let keepGoing = true;

  while (keepGoing) {
    const r = await fetch(`${API}/api/coach/queue?${queueParam}&limit=${QUEUE_PAGE_LIMIT}&offset=${offset}`, {
      credentials: 'include',
    });
    const data = r.ok ? await r.json() : { blunders: [], total: 0 };
    const page = data.blunders || [];
    accumulated = accumulated.concat(page);
    total = data.total ?? accumulated.length;

    keepGoing = shouldContinuePaging({
      pageLength: page.length,
      limit: QUEUE_PAGE_LIMIT,
      accumulated: accumulated.length,
      total,
    });
    offset += QUEUE_PAGE_LIMIT;
  }

  return accumulated;
}

function getQualityColor(quality) {
  if (quality === 'optimal') return 'var(--eval-good)';
  if (quality === 'suboptimal') return 'var(--eval-mid)';
  return 'var(--eval-bad)';
}


export function ReviewScreen({ go, goBack, id }) {
  const { t } = useTranslation();
  const { session } = useStore();

  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMistakeIdx, setSelectedMistakeIdx] = useState(0);
  const [copied, setCopied] = useState(false);
  const [gameBlunderList, setGameBlunderList] = useState([]);
  const [gameDate, setGameDate] = useState('');

  const { speakCoachMessage } = useCoachSpeech();

  useEffect(() => {
    if (analysis?.summaryPhraseKey) {
      speakCoachMessage(analysis.summaryPhraseKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis?.summaryPhraseKey]);

  function handleShare() {
    const url = window.location.href;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => console.warn('[share] clipboard write failed'));
    } else {
      console.warn('[share] clipboard API unavailable');
    }
  }
  useEffect(() => {
    if (!id) {
      setError(t('sparring.reviewNoGame'));
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`${API}/api/games/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ gameId: id }),
    })
      .then(async (res) => {
        if (res.status === 404) {
          setError(t('sparring.reviewNotFound'));
          setLoading(false);
          return;
        }
        if (!res.ok) {
          setError(t('sparring.reviewError'));
          setLoading(false);
          return;
        }
        const data = await res.json();
        setAnalysis(data);
        setSelectedMistakeIdx(0);
        setLoading(false);

        // Derive formatted game date
        const rawDate = data.gameDate; // ISO 8601
        const formattedDate = rawDate
          ? new Date(rawDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : '';
        setGameDate(formattedDate);

        // Analytics
        const accuracy = data.scored > 0
          ? Math.round(data.optimalCount / data.scored * 100)
          : null;
        track('game_reviewed', { gameId: id, accuracy, blunderCount: data.blunderCount });

        // Fire-and-forget: fetch game blunder list for ✕-node navigation, paged to completion
        if (session) {
          const queueParam = data.source === 'papergames'
            ? `papergames_game_id=${id}`
            : `game_id=${id}`;
          fetchAllQueueBlunders(queueParam)
            .then(blunders => {
              const sorted = blunders.slice().sort((a, b) => a.moveIndex - b.moveIndex);
              setGameBlunderList(sorted);
            })
            .catch(() => setGameBlunderList([]));
        }
      })
      .catch(() => {
        setError(t('sparring.reviewError'));
        setLoading(false);
      });
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Compute mistake indices
  const mistakeIndices = analysis
    ? analysis.moves.filter(m => m.quality !== 'optimal').map(m => m.moveIndex)
    : [];

  function navigateToMistake(moveIndex) {
    const globalPlyIndex = analysis.side === 'first'
      ? 2 * (moveIndex - 1)
      : 2 * (moveIndex - 1) + 1;
    const matchedIdx = gameBlunderList.findIndex(b => b.moveIndex === globalPlyIndex);
    if (matchedIdx !== -1) {
      go('blunderDetail', {
        id: gameBlunderList[matchedIdx].id,
        blunderNavList: gameBlunderList,
        index: matchedIdx,
        mistakeContext: 'game',
        mistakeSource: { date: gameDate, gameId: id, totalMoves: analysis.fullMovestring.length },
        difficulty: analysis.difficulty ?? null,
      });
    }
    // No match yet (queue still loading or anonymous user) — no-op
  }

  function handlePrev() {
    if (selectedMistakeIdx === 0 || mistakeIndices.length === 0) return;
    const newIdx = selectedMistakeIdx - 1;
    setSelectedMistakeIdx(newIdx);
    navigateToMistake(mistakeIndices[newIdx]);
  }

  function handleNext() {
    if (selectedMistakeIdx === mistakeIndices.length - 1 || mistakeIndices.length === 0) return;
    const newIdx = selectedMistakeIdx + 1;
    setSelectedMistakeIdx(newIdx);
    navigateToMistake(mistakeIndices[newIdx]);
  }

  // Build frozen board when analysis is ready
  // T003: lastDrop computation removed — ReviewScreen passes lastDrop={null}
  // to prevent drop animations on every step-back through a reviewed game.
  let frozenBoard = null;
  if (analysis?.fullMovestring) {
    const { board } = buildBoard(analysis.fullMovestring);
    frozenBoard = board;
  }

  // Coach messages
  let coachMessages = [];
  if (loading) {
    coachMessages = [{ text: t('sparring.reviewLoading'), mood: 'thinking' }];
  } else if (error) {
    coachMessages = [{ text: error, mood: 'sad' }];
  } else if (analysis) {
    const disc = analysis.side === 'first' ? 'green' : 'gray';
    const discLabel = analysis.side === 'first' ? 'You played Green' : 'You played Gray';
    coachMessages = [{ text: t(analysis.summaryPhraseKey), mood: 'happy', disc, discLabel }];
  }

  // Accuracy display
  const accuracyDisplay = analysis && analysis.scored > 0
    ? `${Math.round(analysis.optimalCount / analysis.scored * 100)}%`
    : '--';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar title="Review" onBack={goBack} />

      <CoachDialog fixed messages={coachMessages} />

      {/* Board area */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 12px',
        }}
      >
        <div style={{ width: '100%', maxWidth: 380 }}>
          {frozenBoard ? (
            // lastDrop audit (034): lastDrop is computed from analysis.fullMovestring
            // (last move of the displayed position). BUG: stepping backward through a game
            // would animate every disc at every step. Fixed: pass lastDrop={null} — T003.
            <Board
              board={frozenBoard}
              canPlay={false}
              compact={true}
              lastDrop={null}
            />
          ) : (
            <div style={{
              height: 200,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--ink-faint)',
              fontSize: 14,
            }}>
              {loading ? '…' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Bottom area */}
      {analysis && (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Accuracy Card */}
          <div style={{
            background: '#fff',
            color: 'var(--ink)',
            borderRadius: 18,
            padding: '15px 18px',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16 }}>
                {t('sparring.accuracy')}
              </span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, color: 'var(--disc-green)' }}>
                {accuracyDisplay}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--eval-good)', flexShrink: 0 }} />
                <span>{t('sparring.optimal')} {analysis.optimalCount}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--eval-mid)', flexShrink: 0 }} />
                <span>{t('sparring.suboptimal')} {analysis.suboptimalCount}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--eval-bad)', flexShrink: 0 }} />
                <span>{t('sparring.blunder')} {analysis.blunderCount}</span>
              </div>
            </div>
          </div>

          {/* Share button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={handleShare}
              style={{
                padding: '10px 20px',
                borderRadius: 14,
                border: 'none',
                background: 'rgba(0,0,0,0.06)',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 15,
                color: 'var(--ink)',
                cursor: 'pointer',
              }}
            >
              {t('review.share.button')}
            </button>
            {copied && (
              <span style={{ fontSize: 13, color: 'var(--eval-good)', fontWeight: 600 }}>
                {t('review.share.copied')}
              </span>
            )}
          </div>

          {/* Move Timeline */}
          {analysis.moves && analysis.moves.length > 0 && (
            <div style={{
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}>
              <div style={{
                display: 'flex',
                gap: 8,
                padding: '8px 2px',
                minWidth: 'min-content',
              }}>
                {analysis.moves.map((move) => {
                  const isOptimal = move.quality === 'optimal';
                  const color = getQualityColor(move.quality);
                  return (
                    <button
                      key={move.moveIndex}
                      type="button"
                      onClick={isOptimal ? undefined : () => navigateToMistake(move.moveIndex)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        border: 'none',
                        background: color,
                        color: '#fff',
                        fontFamily: 'var(--font-display)',
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: isOptimal ? 'default' : 'pointer',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: isOptimal ? 0.7 : 1,
                        WebkitTapHighlightColor: 'transparent',
                        userSelect: 'none',
                      }}
                    >
                      {move.moveIndex}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Prev/Next mistake navigation */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={handlePrev}
              disabled={selectedMistakeIdx === 0 || mistakeIndices.length === 0}
              style={{
                flex: 1,
                padding: '12px 0',
                borderRadius: 14,
                border: 'none',
                background: 'rgba(0,0,0,0.06)',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 15,
                color: 'var(--ink)',
                cursor: (selectedMistakeIdx === 0 || mistakeIndices.length === 0) ? 'default' : 'pointer',
                opacity: (selectedMistakeIdx === 0 || mistakeIndices.length === 0) ? 0.4 : 1,
              }}
            >
              {t('sparring.prevMistake')}
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={selectedMistakeIdx === mistakeIndices.length - 1 || mistakeIndices.length === 0}
              style={{
                flex: 1,
                padding: '12px 0',
                borderRadius: 14,
                border: 'none',
                background: 'var(--eval-bad)',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 15,
                color: '#fff',
                cursor: (selectedMistakeIdx === mistakeIndices.length - 1 || mistakeIndices.length === 0) ? 'default' : 'pointer',
                opacity: (selectedMistakeIdx === mistakeIndices.length - 1 || mistakeIndices.length === 0) ? 0.4 : 1,
              }}
            >
              {t('sparring.nextMistake')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
