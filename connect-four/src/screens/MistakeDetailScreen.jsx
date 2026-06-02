import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { TopBar } from '../components/TopBar.jsx';
import { Board } from '../components/Board.jsx';
import { CoachDialog } from '../components/CoachDialog.jsx';
import { DeepRevealButton } from '../components/DeepRevealButton.jsx';
import { Icon } from '../components/Icon.jsx';
import { Toolbar } from '../components/Toolbar.jsx';
import { useStore } from '../store/ProfileStore.jsx';
import { buildBoard } from '../lib/board.js';
import { track } from '../lib/track.js';

const API = import.meta.env.VITE_API_BASE_URL || '';

export function MistakeDetailScreen({ go, goBack, blunders: initialBlunders, index: initialIndex, status: _status }) {
  const { t } = useTranslation();
  const { session } = useStore();

  const [index, setIndex] = useState(initialIndex ?? 0);
  const [resolving, setResolving] = useState(false);
  const [highlightCol, setHighlightCol] = useState(null);

  const blunders = initialBlunders || [];
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

  if (!blunder) {
    return (
      <div style={{ background: 'var(--bg-home)', minHeight: '100dvh', color: 'var(--ink)', display: 'flex', flexDirection: 'column' }}>
        <TopBar title={t('mistakes.detail.topbarTitle')} onBack={goBack} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'var(--ink-soft)' }}>
          No data
        </div>
      </div>
    );
  }

  function handlePrev() {
    setHighlightCol(null);
    setIndex((index - 1 + blunders.length) % blunders.length);
  }

  function handleNext() {
    setHighlightCol(null);
    setIndex((index + 1) % blunders.length);
  }

  async function handleMarkReviewed() {
    if (!session) return;
    setResolving(true);
    try {
      const res = await fetch(`${API}/api/coach/queue/${blunder.id}/resolve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
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

  const moveNumber = (blunder.board_state || '').length + 1;

  return (
    <div style={{ background: 'var(--bg-home)', minHeight: '100dvh', color: 'var(--ink)', display: 'flex', flexDirection: 'column' }}>
      <TopBar
        title={t('mistakes.detail.topbarTitle')}
        onBack={goBack}
        meta={t('mistakes.detail.moveLabel', { n: moveNumber })}
      />

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, padding: '0 18px 12px' }}>
        {/* Coach dialog */}
        <CoachDialog
          messages={[
            { text: t('mistakes.detail.coach.line1', { n: blunder.move_played + 1 }), mood: 'think' },
            { text: t('mistakes.detail.coach.line2'), mood: 'think' },
          ]}
        />

        {/* Board */}
        <div style={{ background: '#fff', borderRadius: 'var(--radius)', padding: 12, boxShadow: 'var(--shadow-sm)' }}>
          <Board board={boardObj.board} compact canPlay={false} overlays={overlays} />
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

        {/* Deep reveal */}
        <div style={{ background: '#fff', borderRadius: 'var(--radius)', padding: 12, boxShadow: 'var(--shadow-sm)' }}>
          <DeepRevealButton
            moves={blunder.board_state || ''}
            candidateCol={blunder.move_played}
            highlightCol={blunder.correct_move}
            onReveal={() => setHighlightCol(blunder.correct_move)}
            onHighlightMove={setHighlightCol}
            trackingContext="past_mistakes"
            buttonLabel={t('mistakes.detail.whatShouldIHave')}
            feature="past_mistakes"
          />
        </div>

        {/* Mark as reviewed */}
        {effectiveReviewed ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '13px 20px',
            borderRadius: 'var(--radius-sm)',
            border: '1.5px solid var(--border)',
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
              background: resolving ? 'var(--border)' : 'var(--green)',
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
      </div>

      {/* Toolbar: Prev / Next */}
      <Toolbar>
        <button
          onClick={handlePrev}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            padding: '11px 0',
            borderRadius: 'var(--radius-sm)',
            border: '1.5px solid var(--border)',
            background: 'transparent',
            color: 'var(--ink)',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          <Icon name="chevL" size={20} />
          Prev
        </button>
        <button
          onClick={handleNext}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            padding: '11px 0',
            borderRadius: 'var(--radius-sm)',
            border: '1.5px solid var(--border)',
            background: 'transparent',
            color: 'var(--ink)',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Next
          <Icon name="chevR" size={20} />
        </button>
      </Toolbar>
    </div>
  );
}
