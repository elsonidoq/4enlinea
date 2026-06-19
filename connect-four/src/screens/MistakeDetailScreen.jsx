import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { TopBar } from '../components/TopBar.jsx';
import { Board } from '../components/Board.jsx';
import { CoachDialog } from '../components/CoachDialog.jsx';
import { DeepRevealPane } from '../components/DeepRevealPane.jsx';
import { Icon } from '../components/Icon.jsx';
import { Toolbar } from '../components/Toolbar.jsx';
import { useStore } from '../store/ProfileStore.jsx';
import { buildBoard } from '../lib/board.js';
import { track } from '../lib/track.js';

const API = import.meta.env.VITE_API_BASE_URL || '';

export function MistakeDetailScreen({ go, goBack, blunderNavList: navListProp, index: initialIndex, mistakeContext, mistakeSource, id }) {
  const { t } = useTranslation();
  const { session } = useStore();

  const [index, setIndex] = useState(initialIndex ?? 0);
  const [resolving, setResolving] = useState(false);
  const [highlightCol, setHighlightCol] = useState(null);
  const [zhCells, setZhCells] = useState([]);
  const [deepRevealOpen, setDeepRevealOpen] = useState(false);
  const [coldNavList, setColdNavList] = useState(null);
  const [coldBootState, setColdBootState] = useState('idle'); // 'idle' | 'loading' | 'ready' | 'not_found' | 'error'

  // Cold-boot fetch: when id is present and navListProp is empty, fetch the blunder
  useEffect(() => {
    if (!id || (navListProp && navListProp.length > 0)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setColdBootState('loading');
    fetch(`${API}/api/blunders/${encodeURIComponent(id)}`)
      .then(async res => {
        if (res.status === 404) { setColdBootState('not_found'); return; }
        if (!res.ok) { setColdBootState('error'); return; }
        const data = await res.json();
        setColdNavList([data]);
        setColdBootState('ready');
      })
      .catch(() => setColdBootState('error'));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Derive the effective navList: prefer in-app navListProp, fall back to cold-boot fetch
  const navList = useMemo(() => {
    if (navListProp && navListProp.length > 0) return navListProp;
    return coldNavList ?? [];
  }, [navListProp, coldNavList]);

  const blunders = navList ?? [];

  const blunder = blunders[index];
  const isReviewed = blunder?.resolved_at != null;

  // Derive isReviewed from resolved_at
  const [reviewedMap, setReviewedMap] = useState(() => {
    const map = {};
    blunders.forEach((b, i) => { map[i] = b.resolved_at != null; });
    return map;
  });

  const effectiveReviewed = reviewedMap[index] ?? isReviewed;

  useEffect(() => {
    track('mistake_reviewed', { blunderId: blunder?.id });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const boardObj = useMemo(() => {
    if (!blunder) return { board: [], heights: [] };
    return buildBoard(blunder.board_state || '');
  }, [blunder]);

  const userMajorThreats = useMemo(() =>
    (blunder?.threat_cells || []).map(tc => ({ c: tc.col, r: tc.row })),
    [blunder]
  );

  const overlays = useMemo(() => {
    if (!blunder) return [];
    const landingRow = boardObj.heights[blunder.move_played];
    const result = [{ c: blunder.move_played, r: landingRow ?? 0, type: 'tr' }];
    (blunder.threat_cells || []).forEach(tc => {
      result.push({ c: tc.col, r: tc.row, type: 'td' });
    });
    // Highlight: show the recommended column (green, same alpha as blunder's red)
    if (highlightCol != null && boardObj.heights[highlightCol] < 6) {
      result.push({ c: highlightCol, r: boardObj.heights[highlightCol], type: 'tg' });
    }
    return result;
  }, [blunder, boardObj, highlightCol]);

  // Back navigation: contextual based on mistakeContext
  function handleBack() {
    if (!mistakeContext && !mistakeSource) { go('home'); return; }
    if (mistakeContext === 'game' && mistakeSource?.gameId) {
      go('review', { id: mistakeSource.gameId });
    } else {
      goBack();
    }
  }

  // Display move number — only meaningful when blunder exists
  const displayMoveNumber = blunder ? (blunder.moveIndex ?? 0) + 1 : 0;

  // TopBar meta content — only when blunder exists
  let metaContent = null;
  if (blunder) {
    if (mistakeSource) {
      metaContent = (
        <button
          onClick={() => go('review', { id: mistakeSource.gameId })}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--ink-soft)',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
            fontFamily: 'inherit',
            textDecoration: 'underline',
            textUnderlineOffset: 2,
          }}
        >
          {`Move ${displayMoveNumber} / ${mistakeSource.totalMoves} · ${mistakeSource.date} ›`}
        </button>
      );
    } else {
      metaContent = (
        <span style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 600 }}>
          {`Move ${displayMoveNumber} / ${blunders.length}`}
        </span>
      );
    }
  }

  function handlePrev() {
    setHighlightCol(null);
    setDeepRevealOpen(false);
    setZhCells([]);
    if (index > 0) {
      setIndex(index - 1);
    }
  }

  function handleNext() {
    setHighlightCol(null);
    setDeepRevealOpen(false);
    setZhCells([]);
    if (index < blunders.length - 1) {
      setIndex(index + 1);
    }
  }

  async function handleMarkReviewed() {
    if (!session) return;
    setResolving(true);
    try {
      const res = await fetch(`${API}/api/coach/queue/${blunder.id}/resolve`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.status === 204) {
        setReviewedMap(prev => ({ ...prev, [index]: true }));
        if (blunders[index]) {
          blunders[index].resolved_at = new Date().toISOString();
        }
      }
    } catch {
      // revert: isReviewed stays false, resolving cleared
    } finally {
      setResolving(false);
    }
  }

  const isGreenPlayer = blunder ? (blunder.board_state || '').length % 2 === 0 : null;
  const coachMessages = [
    {
      text: t('mistakes.detail.coach.line1', { n: (blunder?.move_played ?? 0) + 1 }),
      mood: 'think',
      ...(isGreenPlayer != null ? {
        disc: isGreenPlayer ? 'green' : 'gray',
        discLabel: isGreenPlayer ? 'You played Green' : 'You played Gray',
      } : {}),
    },
    { text: t('mistakes.detail.coach.line2'), mood: 'think' },
  ];

  return (
    <div style={{ background: 'var(--bg-home)', minHeight: '100dvh', color: 'var(--ink)', display: 'flex', flexDirection: 'column' }}>
      <TopBar
        title={t('mistakes.detail.topbarTitle')}
        onBack={handleBack}
        meta={blunder ? metaContent : undefined}
      />

      {/* Cold-boot loading state */}
      {coldBootState === 'loading' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 16 }}>
          <div style={{
            width: 32, height: 32,
            border: '3px solid var(--line)',
            borderTopColor: 'var(--ink-soft)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <span style={{ color: 'var(--ink-soft)', fontSize: 15 }}>{t('common.loading', 'Loading…')}</span>
        </div>
      )}

      {/* Cold-boot not-found state */}
      {coldBootState === 'not_found' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 16 }}>
          <span style={{ color: 'var(--ink)', fontSize: 18, fontWeight: 700 }}>{t('mistakes.detail.notFound', 'Blunder not found')}</span>
          <button onClick={handleBack} style={{
            padding: '10px 24px',
            borderRadius: 'var(--radius-sm)',
            border: '1.5px solid var(--line)',
            background: 'transparent',
            color: 'var(--ink)',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}>{t('common.back', 'Back')}</button>
        </div>
      )}

      {/* Cold-boot error state */}
      {coldBootState === 'error' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 16 }}>
          <span style={{ color: 'var(--ink)', fontSize: 18, fontWeight: 700 }}>{t('common.error', 'Something went wrong')}</span>
          <button onClick={handleBack} style={{
            padding: '10px 24px',
            borderRadius: 'var(--radius-sm)',
            border: '1.5px solid var(--line)',
            background: 'transparent',
            color: 'var(--ink)',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}>{t('common.back', 'Back')}</button>
        </div>
      )}

      {/* In-app empty navList state */}
      {(coldBootState === 'ready' || coldBootState === 'idle') && !blunder && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'var(--ink-soft)' }}>
          {t('mistakes.detail.noBlunderFound', 'no blunder found')}
        </div>
      )}

      {(coldBootState === 'ready' || coldBootState === 'idle') && blunder && (
        <>
      {deepRevealOpen ? (
        <>
          <CoachDialog messages={coachMessages} />
          <DeepRevealPane
            isOpen={deepRevealOpen}
            onClose={() => setDeepRevealOpen(false)}
            moveString={blunder.board_state || ''}
            col={blunder.move_played}
            feature="past_mistakes"
            navigate={go}
            onReveal={d => {
              setHighlightCol(blunder.correct_move);
              track('deep_reveal_viewed', { context: 'past_mistakes', cached: d.cached ?? false });
            }}
            onZhCellsChange={setZhCells}
            userMajorThreats={userMajorThreats}
            boardContent={
              <div style={{ width: '100%' }}>
                <Board board={boardObj.board} compact canPlay={false} overlays={overlays} zhCells={zhCells} />
              </div>
            }
          />
        </>
      ) : (
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, padding: '0 18px 12px' }}>
        {/* Coach dialog */}
        <CoachDialog messages={coachMessages} />

        {/* Board */}
        <div style={{ background: '#fff', borderRadius: 'var(--radius)', padding: 12, boxShadow: 'var(--shadow-sm)' }}>
          <Board board={boardObj.board} compact canPlay={false} overlays={overlays} zhCells={zhCells} />
        </div>

        {/* Pattern tag */}
        {blunder.pattern_category && blunder.pattern_category !== 'unknown' && (
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            color: 'var(--teal)',
            padding: '0 4px',
          }}>
            {t('mistakes.pattern.' + blunder.pattern_category)}
          </div>
        )}

        {/* Legend + movestring */}
        <div style={{ padding: '0 4px' }}>
          <div style={{ display: 'flex', gap: 18, fontSize: 12, color: 'var(--ink-soft)', fontWeight: 600 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--threat-red)', boxShadow: '0 0 0 2px rgba(232,84,62,.5) inset' }} />
              {t('mistakes.detail.legend.yourMove')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--threat-gray)', boxShadow: '0 0 0 2px rgba(60,66,80,.5) inset' }} />
              {t('mistakes.detail.legend.opponentThreat')}
            </div>
          </div>
          <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, color: 'var(--ink-soft)', opacity: 0.5, fontFamily: 'monospace' }}>
              {blunder.board_state || ''}
            </span>
            <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--ink-soft)', whiteSpace: 'nowrap' }}>
              sev:{blunder.severity ?? '--'}
              {' '}
              tree:{blunder.blunder_severity != null ? blunder.blunder_severity.toFixed(2) : '--'}
            </span>
          </div>
        </div>

        {/* Deep reveal trigger */}
        {session ? (
          <button
            onClick={() => setDeepRevealOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              padding: '13px 20px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: 'var(--disc-green, #2e9e57)',
              color: '#fff',
              fontFamily: 'inherit',
            }}
          >
            {t('mistakes.detail.whatShouldIHave')}
          </button>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            padding: '13px 20px',
            borderRadius: 'var(--radius-sm)',
            fontSize: 14,
            fontWeight: 700,
            border: '1.5px solid var(--line)',
            color: 'var(--ink-soft)',
            fontFamily: 'inherit',
          }}>
            {t('mistakes.detail.signInToUnlock', 'Sign in to unlock')}
          </div>
        )}

        {/* Mark as reviewed */}
        {session && blunder.is_owner !== false && (
          <>
            {effectiveReviewed ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '13px 20px',
                borderRadius: 'var(--radius-sm)',
                border: '1.5px solid var(--line)',
                background: 'transparent',
                color: 'var(--ink-soft)',
                fontWeight: 700,
                fontSize: 14,
                fontFamily: 'inherit',
                opacity: 0.6,
              }}>
                <Icon name="check" size={16} color="var(--ink-soft)" />
                {t('mistakes.detail.markedReviewed')}
              </div>
            ) : (
              <button
                onClick={handleMarkReviewed}
                disabled={resolving}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  padding: '13px 20px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: resolving ? 'var(--line)' : 'var(--green)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: resolving ? 'default' : 'pointer',
                  fontFamily: 'inherit',
                  transition: 'background .12s',
                }}
              >
                {resolving ? '...' : t('mistakes.detail.markReviewed')}
              </button>
            )}
          </>
        )}
      </div>
          )}

          {/* Toolbar: Prev / Next */}
          <Toolbar>
        <button
          onClick={handlePrev}
          disabled={index === 0}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            padding: '11px 0',
            borderRadius: 'var(--radius-sm)',
            border: '1.5px solid var(--line)',
            background: 'transparent',
            color: 'var(--ink)',
            fontWeight: 700,
            fontSize: 14,
            cursor: index === 0 ? 'default' : 'pointer',
            fontFamily: 'inherit',
            opacity: index === 0 ? 0.4 : 1,
          }}
        >
          <Icon name="chevL" size={20} />
          Prev
        </button>
        <span style={{
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--ink-soft)',
          padding: '0 12px',
          whiteSpace: 'nowrap',
        }}>
          {`${index + 1} of ${blunders.length}`}
        </span>
        <button
          onClick={handleNext}
          disabled={index === blunders.length - 1}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            padding: '11px 0',
            borderRadius: 'var(--radius-sm)',
            border: '1.5px solid var(--line)',
            background: 'transparent',
            color: 'var(--ink)',
            fontWeight: 700,
            fontSize: 14,
            cursor: index === blunders.length - 1 ? 'default' : 'pointer',
            fontFamily: 'inherit',
            opacity: index === blunders.length - 1 ? 0.4 : 1,
          }}
        >
          Next
          <Icon name="chevR" size={20} />
        </button>
      </Toolbar>
        </>
      )}
    </div>
  );
}
