import { useState, useEffect, useRef } from 'react';
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
import { resolveChipQuality } from '../lib/reviewChipQuality.js';

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


export function ReviewScreen({ go, goBack, id, onboarding, result, outcome }) {
  const { t } = useTranslation();
  const { session, store } = useStore();

  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMistakeIdx, setSelectedMistakeIdx] = useState(0);
  // Spec 042 US3 / T027 (FR-013, FR-014, contracts/review-stepper-contract.md): the board
  // position shown for an *optimal* step, stepped in place (no navigation target exists
  // for an optimal move). null/unset = full-game final position (today's default render,
  // T030). Transient UI state only — never persisted across remount/reload.
  const [previewMoveIndex, setPreviewMoveIndex] = useState(null);
  const [copied, setCopied] = useState(false);
  const [gameBlunderList, setGameBlunderList] = useState([]);
  const [gameDate, setGameDate] = useState('');
  // Found via QA (2026-07-09): React StrictMode's dev-only double effect invocation fired
  // this screen's POST /api/games/analyze twice for the same id, and the server's per-mistake
  // INSERT (insertGameBlunder) has no uniqueness guard for AI-sparring (game_id-based) rows
  // (only papergames_game_id rows are protected, migration 053) — so each double-mount
  // created literal duplicate `blunders` rows, inflating Past Games' mistake count and
  // corrupting GET /api/blunders/:id's siblingMistakes "X of Y" position. This ref blocks the
  // second same-id invocation from re-firing the request at all (refs persist across
  // StrictMode's simulated remount of the same component instance). A DB-level unique index
  // (server/migrations/054_blunders_ai_game_unique.sql) is the durable fix; this is
  // defense-in-depth against any other double-fire source (double-tab, retry, etc).
  const analyzeStartedForId = useRef(null);

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
    if (analyzeStartedForId.current === id) return;
    analyzeStartedForId.current = id;

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
        setPreviewMoveIndex(null); // T030: reset transient preview state on new game load
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

        // Fire-and-forget: fetch game blunder list for ✕-node navigation, paged to completion.
        // Signed-in → user-scoped. Anonymous onboarding → device-scoped: append the client's
        // device_uuid so the anon free deep reveal can open the blunder detail (approach a).
        (async () => {
          const queueBase = data.source === 'papergames'
            ? `papergames_game_id=${id}`
            : `game_id=${id}`;
          let queueParam = queueBase;
          if (!session) {
            const profile = await store.getProfile().catch(() => null);
            const deviceUuid = profile?.device_uuid;
            if (!deviceUuid) return; // cannot fetch anon queue without a device id
            queueParam = `${queueBase}&device_uuid=${encodeURIComponent(deviceUuid)}`;
          }
          try {
            const blunders = await fetchAllQueueBlunders(queueParam);
            const sorted = blunders.slice().sort((a, b) => a.moveIndex - b.moveIndex);
            setGameBlunderList(sorted);
          } catch {
            setGameBlunderList([]);
          }
        })();
      })
      .catch(() => {
        setError(t('sparring.reviewError'));
        setLoading(false);
      });
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Spec 042 US3 / T026 (contract "Required behavior" 1): step universe is ALL of
  // analysis.moves, not just non-optimal ones — Prev/Next/chips must work even on a
  // zero-mistake game (Edge Case). `navigateToMistake`'s own resolution logic below is
  // UNCHANGED (contract "Explicitly out of scope") — only its callers changed.
  const stepIndices = analysis ? analysis.moves.map(m => m.moveIndex) : [];

  // T007 (spec 042 US1): always routes to the unified 'blunderDetail' screen regardless of
  // quality ('blunder' or 'suboptimal') — no residual legacy split-view fallback branch here.
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

  // Same per-player-move-number -> ply-count formula `navigateToMistake` uses to find the
  // matching globalPlyIndex, but returning a *count* (globalPlyIndex + 1) suitable for
  // `fullMovestring.slice(0, n)` — i.e. "the board after this move is played".
  function moveIndexToPlyCount(moveIndex) {
    const globalPlyIndex = analysis.side === 'first'
      ? 2 * (moveIndex - 1)
      : 2 * (moveIndex - 1) + 1;
    return globalPlyIndex + 1;
  }

  // Spec 042 US3 / T027, T028 (FR-013, FR-014, contract "Required behavior" 2): the single
  // per-step dispatch used by Prev, Next, and every chip click. Non-optimal steps navigate
  // to the permalink exactly as before; optimal steps update the in-place board preview
  // instead of being a no-op.
  function selectStep(moveIndex) {
    const move = analysis.moves.find(m => m.moveIndex === moveIndex);
    if (!move) return;
    // T17 remediation: gate on the SAME quality source the chip is colored
    // with (resolveChipQuality — stored quality when a row exists, else the
    // live badge), not the raw live badge alone. Display and dispatch must
    // agree: badge quality != stored quality is a known divergence (memory
    // project_mistake_storage_rule), and previously a chip could render as a
    // colored mistake (stored quality) yet clicking it only previewed the
    // board (live badge said 'optimal') instead of opening the detail.
    const displayQuality = resolveChipQuality(move, analysis.side, gameBlunderList);
    // Navigate only when a stored mistake row exists for this ply. Non-optimal
    // moves the storage rule excludes (slower wins, dead-position faster
    // losses — see server/mistakeStorageRule.js) have no row, so they fall
    // back to the in-place board preview like optimal steps (FR-013: every
    // step control must change the board).
    if (displayQuality !== 'optimal') {
      const globalPlyIndex = analysis.side === 'first'
        ? 2 * (moveIndex - 1)
        : 2 * (moveIndex - 1) + 1;
      if (gameBlunderList.some(b => b.moveIndex === globalPlyIndex)) {
        navigateToMistake(moveIndex);
        return;
      }
    }
    setPreviewMoveIndex(moveIndex);
  }

  function handlePrev() {
    if (selectedMistakeIdx === 0 || stepIndices.length === 0) return;
    const newIdx = selectedMistakeIdx - 1;
    setSelectedMistakeIdx(newIdx);
    selectStep(stepIndices[newIdx]);
  }

  function handleNext() {
    if (selectedMistakeIdx === stepIndices.length - 1 || stepIndices.length === 0) return;
    const newIdx = selectedMistakeIdx + 1;
    setSelectedMistakeIdx(newIdx);
    selectStep(stepIndices[newIdx]);
  }

  // Build frozen board when analysis is ready.
  // T003: lastDrop computation removed — ReviewScreen passes lastDrop={null}
  // to prevent drop animations on every step-back through a reviewed game.
  // T027/T030: when previewMoveIndex is set (an optimal step was selected), render the
  // board as of that move instead of the full game's final position. Unset (default,
  // never-stepped) behaves exactly as before — full-game final position.
  let frozenBoard = null;
  if (analysis?.fullMovestring) {
    const plyCount = previewMoveIndex != null
      ? moveIndexToPlyCount(previewMoveIndex)
      : analysis.fullMovestring.length;
    const { board } = buildBoard(analysis.fullMovestring.slice(0, plyCount));
    frozenBoard = board;
  }

  // T18 (finding 15): known only when GameScreen (result='loss') or PastGamesListScreen
  // (outcome='lost') passed it as a nav param — a cold-boot deep link (/game/:id) carries
  // neither, so the "clean but lost" copy only fires within the same session. Acceptable
  // per brief: no server change needed to source the game's outcome.
  const isLoss = result === 'loss' || outcome === 'lost';

  // Coach messages
  let coachMessages = [];
  if (loading) {
    coachMessages = [{ text: t('sparring.reviewLoading'), mood: 'thinking' }];
  } else if (error) {
    coachMessages = [{ text: error, mood: 'sad' }];
  } else if (analysis) {
    const disc = analysis.side === 'first' ? 'green' : 'gray';
    const discLabel = analysis.side === 'first' ? t('review.playedGreen') : t('review.playedGray');
    const isCleanPhrase = analysis.summaryPhraseKey.startsWith('coach.spoken.sparring.review.clean');
    const summaryText = (isCleanPhrase && isLoss)
      ? t('review.cleanButLost')
      : t(analysis.summaryPhraseKey);
    coachMessages = [{ text: summaryText, mood: 'happy', disc, discLabel }];
  }

  // Accuracy display
  const accuracyDisplay = analysis && analysis.scored > 0
    ? `${Math.round(analysis.optimalCount / analysis.scored * 100)}%`
    : '--';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar title={t('review.title')} onBack={goBack} onLogoClick={() => go('home')} />

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
                  // Task 17 (finding 14): color from the STORED row's quality when one
                  // exists for this ply (the durable truth MistakeDetailScreen's title
                  // reads) — a chip must never disagree with the detail it opens. Falls
                  // back to the live scoreMove badge quality (move.quality) only for
                  // plies the storage rule left unstored.
                  const displayQuality = resolveChipQuality(move, analysis.side, gameBlunderList);
                  const isOptimal = displayQuality === 'optimal';
                  const color = getQualityColor(displayQuality);
                  return (
                    <button
                      key={move.moveIndex}
                      type="button"
                      // Spec 042 US3 / T028 (FR-014): every chip dispatches through the same
                      // per-step logic as Prev/Next — optimal chips update the in-place
                      // board preview instead of a no-op; non-optimal chips still navigate.
                      onClick={() => {
                        const idx = stepIndices.indexOf(move.moveIndex);
                        if (idx !== -1) setSelectedMistakeIdx(idx);
                        selectStep(move.moveIndex);
                      }}
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
                        cursor: 'pointer',
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
              disabled={selectedMistakeIdx === 0 || stepIndices.length === 0}
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
                cursor: (selectedMistakeIdx === 0 || stepIndices.length === 0) ? 'default' : 'pointer',
                opacity: (selectedMistakeIdx === 0 || stepIndices.length === 0) ? 0.4 : 1,
              }}
            >
              {t('sparring.prevMistake')}
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={selectedMistakeIdx === stepIndices.length - 1 || stepIndices.length === 0}
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
                cursor: (selectedMistakeIdx === stepIndices.length - 1 || stepIndices.length === 0) ? 'default' : 'pointer',
                opacity: (selectedMistakeIdx === stepIndices.length - 1 || stepIndices.length === 0) ? 0.4 : 1,
              }}
            >
              {t('sparring.nextMistake')}
            </button>
          </div>
        </div>
      )}

      {onboarding && (
        <div style={{ padding: '16px', marginTop: 'auto' }}>
          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={() => go('onboardingImportOffer')}
          >
            {t('review.onboardingContinue')}
          </button>
        </div>
      )}
    </div>
  );
}
